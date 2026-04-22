const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const hearingStatuses = require('../data/hearing-statuses')
const statuses = require('../data/case-statuses')

module.exports = (router) => {
  router.post('/cases/:caseId/hearings/:hearingId/mark-preparation-complete', async (req, res) => {
    const hearingId = parseInt(req.params.hearingId)
    const caseId = parseInt(req.params.caseId)

    await prisma.hearing.update({
      where: { id: hearingId },
      data: { status: hearingStatuses.PENDING },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Hearing preparation marked as complete',
        caseId,
      },
    })

    req.flash('success', 'Hearing preparation marked as complete')
    res.redirect(`/cases/${caseId}/hearings/${hearingId}`)
  })

  router.post('/cases/:caseId/hearings/:hearingId/mark-as-happened', async (req, res) => {
    const hearingId = parseInt(req.params.hearingId)
    const caseId = parseInt(req.params.caseId)

    await prisma.hearing.update({
      where: { id: hearingId },
      data: { status: hearingStatuses.OUTCOME_NEEDED },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Hearing marked as happened',
        caseId,
      },
    })

    req.flash('success', 'Hearing marked as happened')
    res.redirect(`/cases/${caseId}/hearings/${hearingId}`)
  })

  router.get('/cases/:caseId/hearings/:hearingId/record-outcome', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    const hearing = await prisma.hearing.findUnique({
      where: { id: parseInt(req.params.hearingId) },
      include: { defendants: true },
    })

    res.render('cases/hearings/record-outcome/index', {
      _case,
      hearing,
      selectedOutcome: req.session.data.recordHearingOutcome?.outcome,
    })
  })

  router.post('/cases/:caseId/hearings/:hearingId/record-outcome', (req, res) => {
    const { caseId, hearingId } = req.params
    req.session.data.recordHearingOutcome = { outcome: req.body.outcome }
    res.redirect(`/cases/${caseId}/hearings/${hearingId}/record-outcome/check`)
  })

  router.get('/cases/:caseId/hearings/:hearingId/record-outcome/check', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    const hearing = await prisma.hearing.findUnique({
      where: { id: parseInt(req.params.hearingId) },
    })

    res.render('cases/hearings/record-outcome/check', { _case, hearing })
  })

  router.post('/cases/:caseId/hearings/:hearingId/record-outcome/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const hearingId = parseInt(req.params.hearingId)
    const outcome = req.session.data.recordHearingOutcome?.outcome

    await prisma.hearing.update({
      where: { id: hearingId },
      data: { status: hearingStatuses.COMPLETE },
    })

    const defendantStatusMap = {
      'not-guilty': statuses.NOT_GUILTY,
      'sentenced': statuses.SENTENCED,
      'no-further-action': statuses.NO_FURTHER_ACTION,
    }

    const newDefendantStatus = defendantStatusMap[outcome]
    if (newDefendantStatus) {
      const hearing = await prisma.hearing.findUnique({
        where: { id: hearingId },
        include: { defendants: true },
      })

      const defendantIds = hearing.defendants.map(d => d.id)
      await prisma.defendant.updateMany({
        where: { id: { in: defendantIds } },
        data: { status: newDefendantStatus },
      })
    }

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Hearing outcome recorded',
        meta: { ...req.session.data.recordHearingOutcome },
        caseId,
      },
    })

    delete req.session.data.recordHearingOutcome

    req.flash('success', 'Hearing outcome recorded')
    res.redirect(`/cases/${caseId}/hearings/${hearingId}`)
  })
}
