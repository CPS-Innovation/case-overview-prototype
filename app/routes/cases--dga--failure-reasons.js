const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {

  // Step 1: Select outcome
  router.get('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/outcome', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        dga: {
          include: {
            failureReasons: {
              where: { id: failureReasonId }
            }
          }
        }
      }
    })

    const failureReason = caseData.dga.failureReasons[0]

    // Calculate month and police unit for back link
    const monthKey = caseData.dga?.nonCompliantDate
      ? `${caseData.dga.nonCompliantDate.getFullYear()}-${String(caseData.dga.nonCompliantDate.getMonth() + 1).padStart(2, '0')}`
      : null
    const policeUnitId = caseData.policeUnitId

    res.render('cases/dga/failure-reasons/record-outcome/outcome', {
      case: caseData,
      failureReason: failureReason,
      selectedOutcome: req.session.data.recordOutcome?.outcome,
      monthKey,
      policeUnitId
    })
  })

  router.post('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/outcome', (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    const outcome = req.body.recordOutcome?.outcome

    // Store in session
    _.set(req, 'session.data.recordOutcome.outcome', outcome)

    // If "Not disputed", skip to check answers
    if (outcome === 'Not disputed') {
      _.set(req, 'session.data.recordOutcome.explanation', null)
      _.set(req, 'session.data.recordOutcome.methods', null)
      return res.redirect(`/cases/dga/${caseId}/failure-reasons/${failureReasonId}/record-outcome/check`)
    }

    // Otherwise go to details page
    res.redirect(`/cases/dga/${caseId}/failure-reasons/${failureReasonId}/record-outcome/decision-explanation`)
  })

  // Step 2a: Add details (only if disputed)
  router.get('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/decision-explanation', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        dga: {
          include: {
            failureReasons: {
              where: { id: failureReasonId }
            }
          }
        }
      }
    })

    const failureReason = caseData.dga.failureReasons[0]

    res.render('cases/dga/failure-reasons/record-outcome/decision-explanation', {
      case: caseData,
      failureReason: failureReason,
      details: req.session.data.recordOutcome?.explanation
    })
  })

  router.post('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/decision-explanation', (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    const details = req.body.recordOutcome?.explanation

    _.set(req, 'session.data.recordOutcome.explanation', details)

    res.redirect(`/cases/dga/${caseId}/failure-reasons/${failureReasonId}/record-outcome/decision-method`)
  })

  // Step 2b: Select methods (only if disputed)
  router.get('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/decision-method', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        dga: {
          include: {
            failureReasons: {
              where: { id: failureReasonId }
            }
          }
        }
      }
    })

    const failureReason = caseData.dga.failureReasons[0]

    res.render('cases/dga/failure-reasons/record-outcome/decision-method', {
      case: caseData,
      failureReason: failureReason,
      selectedMethods: req.session.data.recordOutcome?.methods || []
    })
  })

  router.post('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/decision-method', (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    let methods = req.body.recordOutcome?.methods

    // Ensure methods is always an array
    if (!methods) {
      methods = []
    } else if (!Array.isArray(methods)) {
      methods = [methods]
    }

    // Filter out the _unchecked value added by GOV.UK Frontend
    methods = methods.filter(method => method !== '_unchecked')

    _.set(req, 'session.data.recordOutcome.methods', methods)

    res.redirect(`/cases/dga/${caseId}/failure-reasons/${failureReasonId}/record-outcome/check`)
  })

  // Step 3: Check answers
  router.get('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        dga: {
          include: {
            failureReasons: {
              where: { id: failureReasonId }
            }
          }
        }
      }
    })

    const failureReason = caseData.dga.failureReasons[0]
    const outcome = req.session.data.recordOutcome?.outcome
    const details = req.session.data.recordOutcome?.explanation
    const methods = req.session.data.recordOutcome?.methods || []

    res.render('cases/dga/failure-reasons/record-outcome/check', {
      case: caseData,
      failureReason: failureReason,
      outcome: outcome,
      details: details,
      methods: methods
    })
  })

  router.post('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)

    const outcome = req.session.data.recordOutcome?.outcome
    const details = req.session.data.recordOutcome?.explanation
    const methods = req.session.data.recordOutcome?.methods

    // Get case data for redirect
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        policeUnit: true,
        dga: {
          include: {
            failureReasons: true
          }
        }
      }
    })

    // Update the failure reason with the outcome, details, and methods
    await prisma.dGAFailureReason.update({
      where: { id: failureReasonId },
      data: {
        outcome: outcome,
        details: details,
        methods: methods ? methods.join(', ') : null
      }
    })

    // Get the failure reason for activity log
    const failureReason = caseData.dga.failureReasons.find(fr => fr.id === failureReasonId)

    // Calculate month name for activity log
    const monthKey = caseData.dga?.nonCompliantDate
      ? `${caseData.dga.nonCompliantDate.getFullYear()}-${String(caseData.dga.nonCompliantDate.getMonth() + 1).padStart(2, '0')}`
      : null
    const [year, month] = monthKey.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    const monthName = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

    // Build meta object for activity log
    const meta = {
      failureReason: failureReason.reason,
      policeUnit: caseData.policeUnit?.name || 'Not specified',
      monthName,
      monthKey,
      policeUnitId: caseData.policeUnitId,
      ...req.session.data.recordOutcome
    }

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'DGAFailureReason',
        recordId: failureReasonId,
        action: 'UPDATE',
        title: 'Non-compliant DGA decision recorded',
        caseId: caseId,
        meta: meta
      }
    })

    delete req.session.data.recordOutcome

    const policeUnitId = caseData.policeUnitId

    req.flash('success', 'Decision recorded')

    res.redirect(`/cases/dga/${monthKey}/${policeUnitId}/${caseId}`)
  })

}
