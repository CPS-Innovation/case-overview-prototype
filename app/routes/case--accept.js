const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const statuses = require('../data/case-statuses')

module.exports = (router) => {
  router.get('/cases/:caseId/accept', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    res.render('cases/accept/index', { _case })
  })

  router.post('/cases/:caseId/accept', async (req, res) => {
    const caseId = parseInt(req.params.caseId)

    const prosecutorCount = await prisma.caseProsecutor.count({ where: { caseId } })
    const newStatus = prosecutorCount > 0 ? statuses.CHARGING_DECISION_NEEDED : statuses.PROSECUTOR_NEEDED

    await prisma.case.update({
      where: { id: caseId },
      data: { status: newStatus },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Case accepted',
        caseId,
      },
    })

    req.flash('success', 'Case accepted')
    res.redirect(`/cases/${caseId}`)
  })
}
