const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Helper: Slugify text for URLs
function slugify(text) {
  if (!text) return 'not-specified'
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

module.exports = router => {

  // View the failure reasons list for a specific case
  router.get('/cases/dga/:month/:policeUnit/:caseId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const monthKey = req.params.month // e.g., "2025-10"
    const policeUnitSlug = req.params.policeUnit

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
    const policeUnitName = caseData.policeUnit || 'Not specified'

    res.render('cases/dga/failure-reasons/index', {
      case: caseData,
      monthKey,
      monthName,
      policeUnitName,
      policeUnitSlug
    })
  })

  // Step 1: Select outcome
  router.get('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/select', async (req, res) => {
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
    const policeUnitSlug = slugify(caseData.policeUnit || 'not-specified')

    res.render('cases/dga/failure-reasons/record-outcome/select', {
      case: caseData,
      failureReason: failureReason,
      selectedOutcome: req.session.data[`outcome_${failureReasonId}`],
      monthKey,
      policeUnitSlug
    })
  })

  router.post('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/select', (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    const outcome = req.body.outcome

    // Store in session
    _.set(req, `session.data.outcome_${failureReasonId}`, outcome)

    // If "Not disputed", skip to check answers
    if (outcome === 'Not disputed') {
      _.set(req, `session.data.details_${failureReasonId}`, null)
      _.set(req, `session.data.methods_${failureReasonId}`, null)
      return res.redirect(`/cases/dga/${caseId}/failure-reasons/${failureReasonId}/record-outcome/check-answers`)
    }

    // Otherwise go to details page
    res.redirect(`/cases/dga/${caseId}/failure-reasons/${failureReasonId}/record-outcome/add-details`)
  })

  // Step 2a: Add details (only if disputed)
  router.get('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/add-details', async (req, res) => {
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

    res.render('cases/dga/failure-reasons/record-outcome/add-details', {
      case: caseData,
      failureReason: failureReason,
      details: req.session.data[`details_${failureReasonId}`]
    })
  })

  router.post('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/add-details', (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    const details = req.body.details

    _.set(req, `session.data.details_${failureReasonId}`, details)

    res.redirect(`/cases/dga/${caseId}/failure-reasons/${failureReasonId}/record-outcome/select-methods`)
  })

  // Step 2b: Select methods (only if disputed)
  router.get('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/select-methods', async (req, res) => {
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

    res.render('cases/dga/failure-reasons/record-outcome/select-methods', {
      case: caseData,
      failureReason: failureReason,
      selectedMethods: req.session.data[`methods_${failureReasonId}`] || []
    })
  })

  router.post('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/select-methods', (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)
    let methods = req.body.methods

    // Ensure methods is always an array
    if (!methods) {
      methods = []
    } else if (!Array.isArray(methods)) {
      methods = [methods]
    }

    // Filter out the _unchecked value added by GOV.UK Frontend
    methods = methods.filter(method => method !== '_unchecked')

    _.set(req, `session.data.methods_${failureReasonId}`, methods)

    res.redirect(`/cases/dga/${caseId}/failure-reasons/${failureReasonId}/record-outcome/check-answers`)
  })

  // Step 3: Check answers
  router.get('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/check-answers', async (req, res) => {
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
    const outcome = req.session.data[`outcome_${failureReasonId}`]
    const details = req.session.data[`details_${failureReasonId}`]
    const methods = req.session.data[`methods_${failureReasonId}`] || []

    res.render('cases/dga/failure-reasons/record-outcome/check-answers', {
      case: caseData,
      failureReason: failureReason,
      outcome: outcome,
      details: details,
      methods: methods
    })
  })

  router.post('/cases/dga/:caseId/failure-reasons/:failureReasonId/record-outcome/check-answers', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const failureReasonId = parseInt(req.params.failureReasonId)

    const outcome = req.session.data[`outcome_${failureReasonId}`]
    const details = req.session.data[`details_${failureReasonId}`]
    const methods = req.session.data[`methods_${failureReasonId}`]

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
    _.set(req, `session.data.outcome_${failureReasonId}`, null)
    _.set(req, `session.data.details_${failureReasonId}`, null)
    _.set(req, `session.data.methods_${failureReasonId}`, null)

    // Calculate redirect URL back to failure reasons list
    const monthKey = caseData.dga?.nonCompliantDate
      ? `${caseData.dga.nonCompliantDate.getFullYear()}-${String(caseData.dga.nonCompliantDate.getMonth() + 1).padStart(2, '0')}`
      : null
    const policeUnitSlug = slugify(caseData.policeUnit || 'not-specified')

    // Set flash message
    req.flash('success', 'Outcome recorded')

    // Redirect back to failure reasons list
    res.redirect(`/cases/dga/${monthKey}/${policeUnitSlug}/${caseId}`)
  })

}
