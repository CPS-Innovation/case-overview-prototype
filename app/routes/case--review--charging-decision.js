const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { getEligibleCharges } = require('../helpers/caseReview')

module.exports = (router) => {
  // Entry point — send the reviewer to the first charge that still needs a decision
  router.get('/cases/:caseId/review/charging-decision', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    if (req.query.referrer) {
      req.session.data.chargingDecision = { ...req.session.data.chargingDecision, referrer: req.query.referrer }
    }

    const { charges } = await getEligibleCharges(prisma, caseId)
    if (!charges.length) {
      return res.redirect(`/cases/${caseId}/review`)
    }

    const decisions = req.session.data.chargingDecision?.decisions || {}
    const nextCharge = charges.find(charge => !decisions[charge.id]) || charges[0]
    res.redirect(`/cases/${caseId}/review/charging-decision/${nextCharge.id}`)
  })

  // Charging decision — check answers
  // Registered before the /:chargeId routes below so "check" isn't matched as a chargeId.
  router.get('/cases/:caseId/review/charging-decision/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const { _case, eligibleDefendants, charges } = await getEligibleCharges(prisma, caseId)

    const decisions = req.session.data.chargingDecision?.decisions || {}
    const chargeRows = charges.map(charge => ({
      ...charge,
      decision: decisions[charge.id],
    }))

    res.render('cases/review/charging-decision/check', {
      _case,
      charges: chargeRows,
      showDefendantName: eligibleDefendants.length > 1,
    })
  })

  router.post('/cases/:caseId/review/charging-decision/check', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.chargingDecision = {
      ...req.session.data.chargingDecision,
      complete: req.body.complete === 'yes',
    }
    res.redirect(`/cases/${caseId}/review`)
  })

  // Charge decision — one charge per page
  router.get('/cases/:caseId/review/charging-decision/:chargeId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const chargeId = parseInt(req.params.chargeId)
    const { _case, eligibleDefendants, charges } = await getEligibleCharges(prisma, caseId)

    const chargeIndex = charges.findIndex(charge => charge.id === chargeId)
    if (chargeIndex === -1) {
      return res.redirect(`/cases/${caseId}/review/charging-decision`)
    }

    const charge = charges[chargeIndex]
    const elementRows = (charge.elements || []).map(element => ({
      key: { text: element.description },
      value: { text: element.strength || 'Not assessed' }
    }))

    res.render('cases/review/charging-decision/index', {
      _case,
      charge,
      elementRows,
      chargeNumber: chargeIndex + 1,
      totalCharges: charges.length,
      showDefendantName: eligibleDefendants.length > 1,
      selectedDecision: req.session.data.chargingDecision?.decisions?.[chargeId],
      isFirstCharge: chargeIndex === 0,
      from: req.query.from,
    })
  })

  router.post('/cases/:caseId/review/charging-decision/:chargeId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const chargeId = parseInt(req.params.chargeId)

    req.session.data.chargingDecision = {
      ...req.session.data.chargingDecision,
      decisions: {
        ...req.session.data.chargingDecision?.decisions,
        [chargeId]: req.body.decision,
      },
    }

    if (req.body.from === 'check') {
      return res.redirect(`/cases/${caseId}/review/charging-decision/check`)
    }

    const { charges } = await getEligibleCharges(prisma, caseId)
    const chargeIndex = charges.findIndex(charge => charge.id === chargeId)
    const nextCharge = charges[chargeIndex + 1]

    if (nextCharge) {
      res.redirect(`/cases/${caseId}/review/charging-decision/${nextCharge.id}`)
    } else {
      res.redirect(`/cases/${caseId}/review/charging-decision/check`)
    }
  })
}
