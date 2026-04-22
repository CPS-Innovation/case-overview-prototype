const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { addTimeLimitDates } = require('../helpers/timeLimit')

module.exports = router => {
  router.get('/cases/:caseId/hearings', async (req, res) => {
    let _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        hearings: {
          orderBy: { startDate: 'asc' },
          include: { defendants: true }
        },
        unit: true,
        prosecutors: { include: { user: true } },
        paralegalOfficers: { include: { user: true } },
        defendants: { include: { charges: true, defenceLawyer: true } },
        location: true,
        tasks: true,
        dga: true
      }
    })

    _case = addTimeLimitDates(_case)

    res.render('cases/hearings/index', { _case })
  })
}
