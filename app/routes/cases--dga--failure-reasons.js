const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { getDgaReportStatus } = require('../helpers/dgaReportStatus')

module.exports = router => {

  // View the failure reasons list for a specific case
  router.get('/cases/dga/:month/:policeUnitId/:caseId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const monthKey = req.params.month // e.g., "2025-10"
    const policeUnitId = parseInt(req.params.policeUnitId)

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        dga: {
          include: {
            failureReasons: true
          }
        }
      }
    })

    if (!caseData || !caseData.dga) {
      return res.redirect('/cases/dga')
    }

    // Calculate month name from monthKey
    const [year, month] = monthKey.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    const monthName = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

    // Get police unit name from case
    const policeUnitName = caseData.policeUnit?.name || 'Not specified'

    // Calculate report status
    const reportStatus = getDgaReportStatus(caseData)

    // Calculate outcomes progress
    const outcomesTotal = caseData.dga.failureReasons.length
    const outcomesCompleted = caseData.dga.failureReasons.filter(fr => fr.outcome !== null).length

    res.render('cases/dga/failure-reasons/index', {
      case: caseData,
      monthKey,
      monthName,
      policeUnitName,
      policeUnitId,
      reportStatus,
      outcomesTotal,
      outcomesCompleted
    })
  })

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

    if (!caseData || !caseData.dga || !caseData.dga.failureReasons[0]) {
      return res.redirect('/cases/dga')
    }

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

    if (!caseData || !caseData.dga || !caseData.dga.failureReasons[0]) {
      return res.redirect('/cases/dga')
    }

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

    if (!caseData || !caseData.dga || !caseData.dga.failureReasons[0]) {
      return res.redirect('/cases/dga')
    }

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

    if (!caseData || !caseData.dga || !caseData.dga.failureReasons[0]) {
      return res.redirect('/cases/dga')
    }

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

    // Clear session data for this failure reason
    delete req.session.data.recordOutcome

    // Calculate redirect URL back to failure reasons list
    const monthKey = caseData.dga?.nonCompliantDate
      ? `${caseData.dga.nonCompliantDate.getFullYear()}-${String(caseData.dga.nonCompliantDate.getMonth() + 1).padStart(2, '0')}`
      : null
    const policeUnitId = caseData.policeUnitId

    // Set flash message
    req.flash('success', 'Outcome recorded')

    // Redirect back to failure reasons list
    res.redirect(`/cases/dga/${monthKey}/${policeUnitId}/${caseId}`)
  })

}
