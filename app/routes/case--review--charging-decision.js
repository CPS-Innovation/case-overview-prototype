const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const statuses = require('../data/case-statuses')

module.exports = (router) => {
  router.get('/cases/:caseId/review/charging-decision', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        defendants: {
          include: { charges: { include: { pointsToProve: { orderBy: { order: 'asc' } } } } }
        }
      },
    })

    if (req.query.referrer) {
      req.session.data.chargingDecision = { ...req.session.data.chargingDecision, referrer: req.query.referrer }
    }

    // Single defendant for now; select the charge currently pending a decision
    const charge = _case.defendants[0]?.charges.find(c => c.status === 'Under review')
    const pointsToProveRows = (charge?.pointsToProve || []).map(point => ({
      key: { text: point.description },
      value: { text: point.strength || 'Unknown' }
    }))

    res.render('cases/review/charging-decision/index', {
      _case,
      charge,
      pointsToProveRows,
      selectedDecision: req.session.data.chargingDecision?.decision,
    })
  })

  router.post('/cases/:caseId/review/charging-decision', async (req, res) => {
    const caseId = req.params.caseId
    req.session.data.chargingDecision = {
      referrer: req.session.data.chargingDecision?.referrer,
      decision: req.body.decision,
    }

    const _case = await prisma.case.findUnique({
      where: { id: parseInt(caseId) },
      include: { defendants: true },
    })
    const eligibleDefendants = _case.defendants.filter(d => d.status === statuses.NOT_CHARGED && d.needsReview)

    if (eligibleDefendants.length > 1) {
      res.redirect(`/cases/${caseId}/review/charging-decision/defendants`)
    } else {
      res.redirect(`/cases/${caseId}/review/charging-decision/check`)
    }
  })

  router.get('/cases/:caseId/review/charging-decision/defendants', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    const eligibleDefendants = _case.defendants.filter(d => d.status === statuses.NOT_CHARGED && d.needsReview)
    const selectedDefendantIds = req.session.data.chargingDecision?.defendantIds || eligibleDefendants.map(d => String(d.id))
    const defendantItems = eligibleDefendants.map(d => ({ value: String(d.id), text: `${d.firstName} ${d.lastName}` }))
    res.render('cases/review/charging-decision/defendants', { _case, defendantItems, selectedDefendantIds })
  })

  router.post('/cases/:caseId/review/charging-decision/defendants', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.chargingDecision = {
      ...req.session.data.chargingDecision,
      defendantIds: [].concat(req.body.chargingDecision?.defendants || []).filter(id => id !== '_unchecked'),
    }
    res.redirect(`/cases/${caseId}/review/charging-decision/check`)
  })

  // Charging decision — check answers
  router.get('/cases/:caseId/review/charging-decision/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: true },
    })

    const { defendantIds } = req.session.data.chargingDecision || {}
    const selectedDefendants = defendantIds
      ? _case.defendants.filter(d => defendantIds.includes(String(d.id)))
      : null

    res.render('cases/review/charging-decision/check', { _case, selectedDefendants })
  })

  router.post('/cases/:caseId/review/charging-decision/check', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.chargingDecision = {
      ...req.session.data.chargingDecision,
      complete: req.body.complete === 'yes',
    }
    res.redirect(`/cases/${caseId}/review`)
  })
}
