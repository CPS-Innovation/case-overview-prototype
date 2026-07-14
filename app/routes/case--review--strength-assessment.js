const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { getEligibleCharges, findOrCreateReview } = require('../helpers/caseReview')

function elementAssessed (element) {
  return Boolean(element.strength) && element.strength !== 'Not assessed'
}

module.exports = (router) => {
  // Entry point — send the reviewer to the first offence with an unassessed element
  router.get('/cases/:caseId/review/strength-assessment', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    const { charges } = await getEligibleCharges(prisma, caseId)
    if (!charges.length) {
      return res.redirect(`/cases/${caseId}/review`)
    }

    const nextCharge = charges.find(charge => (charge.elements || []).some(element => !elementAssessed(element))) || charges[0]
    res.redirect(`/cases/${caseId}/review/strength-assessment/${nextCharge.id}`)
  })

  // Strength assessment — check answers
  // Registered before the /:chargeId routes below so "check" isn't matched as a chargeId.
  router.get('/cases/:caseId/review/strength-assessment/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id
    const { _case, eligibleDefendants, charges } = await getEligibleCharges(prisma, caseId)
    const review = await findOrCreateReview(prisma, caseId, userId)

    const chargeSections = charges.map(charge => ({
      ...charge,
      elementRows: (charge.elements || []).map(element => ({
        key: { text: element.description },
        value: {
          html: _.escape(element.strength || 'Not assessed') +
            (element.strengthReasoning
              ? `<br><span class="govuk-hint govuk-!-margin-bottom-0">${_.escape(element.strengthReasoning)}</span>`
              : '')
        },
        actions: {
          items: [{
            href: `/cases/${caseId}/review/strength-assessment/${charge.id}?from=check`,
            text: 'Change',
            visuallyHiddenText: element.description
          }]
        }
      }))
    }))

    res.render('cases/review/strength-assessment/check', {
      _case,
      review,
      chargeSections,
      showDefendantName: eligibleDefendants.length > 1,
    })
  })

  router.post('/cases/:caseId/review/strength-assessment/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id
    const review = await findOrCreateReview(prisma, caseId, userId)

    await prisma.caseReview.update({
      where: { id: review.id },
      data: { strengthAssessmentComplete: req.body.complete === 'yes' },
    })

    res.redirect(`/cases/${caseId}/review`)
  })

  // Strength assessment — one offence per page, all its elements assessed together
  router.get('/cases/:caseId/review/strength-assessment/:chargeId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const chargeId = parseInt(req.params.chargeId)
    const { _case, eligibleDefendants, charges } = await getEligibleCharges(prisma, caseId)

    const chargeIndex = charges.findIndex(charge => charge.id === chargeId)
    if (chargeIndex === -1) {
      return res.redirect(`/cases/${caseId}/review/strength-assessment`)
    }

    res.render('cases/review/strength-assessment/index', {
      _case,
      charge: charges[chargeIndex],
      showDefendantName: eligibleDefendants.length > 1,
      isFirstCharge: chargeIndex === 0,
      from: req.query.from,
    })
  })

  router.post('/cases/:caseId/review/strength-assessment/:chargeId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const chargeId = parseInt(req.params.chargeId)
    const { charges } = await getEligibleCharges(prisma, caseId)

    const chargeIndex = charges.findIndex(charge => charge.id === chargeId)
    if (chargeIndex === -1) {
      return res.redirect(`/cases/${caseId}/review/strength-assessment`)
    }

    for (const element of charges[chargeIndex].elements || []) {
      const strength = req.body.strength?.[element.id]
      if (!strength) continue
      const strengthReasoning = req.body.strengthReasoning?.[element.id]?.[strength] || null
      await prisma.element.update({
        where: { id: element.id },
        data: { strength, strengthReasoning }
      })
    }

    if (req.body.from === 'check') {
      return res.redirect(`/cases/${caseId}/review/strength-assessment/check`)
    }

    const nextCharge = charges[chargeIndex + 1]
    if (nextCharge) {
      res.redirect(`/cases/${caseId}/review/strength-assessment/${nextCharge.id}`)
    } else {
      res.redirect(`/cases/${caseId}/review/strength-assessment/check`)
    }
  })
}
