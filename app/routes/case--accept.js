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

    await prisma.defendant.updateMany({
      where: { cases: { some: { id: caseId } } },
      data: { status: statuses.CHARGING_DECISION_NEEDED },
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
