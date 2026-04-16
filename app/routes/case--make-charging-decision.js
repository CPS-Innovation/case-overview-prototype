const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const statuses = require('../data/case-statuses')

const decisionStatusMap = {
  'charge': statuses.WAITING_FOR_POLICE_TO_CHARGE,
  'no-further-action': statuses.NO_FURTHER_ACTION,
  'request-more-information': statuses.WAITING_FOR_INFORMATION_FOR_CHARGING_DECISION,
}

const decisionFlashMap = {
  'charge': 'Case charged',
  'request-more-information': 'More information requested',
  'no-further-action': 'Case marked as no further action',
}

module.exports = (router) => {
  router.get('/cases/:caseId/make-charging-decision', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/make-charging-decision/index', {
      _case,
      selectedDecision: req.session.data.chargingDecision?.decision,
    })
  })

  router.post('/cases/:caseId/make-charging-decision', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.chargingDecision = { decision: req.body.decision }
    res.redirect(`/cases/${caseId}/make-charging-decision/check`)
  })

  router.get('/cases/:caseId/make-charging-decision/check', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/make-charging-decision/check', { _case })
  })

  router.post('/cases/:caseId/make-charging-decision/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const decision = req.session.data.chargingDecision?.decision

    const status = decisionStatusMap[decision]
    if (status) {
      await prisma.case.update({
        where: { id: caseId },
        data: { status },
      })
    }

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Charging decision made',
        meta: { ...req.session.data.chargingDecision },
        caseId,
      },
    })

    delete req.session.data.chargingDecision

    req.flash('success', decisionFlashMap[decision] || 'Charging decision recorded')
    res.redirect(`/cases/${caseId}`)
  })
}
