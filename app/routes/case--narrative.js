const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')

module.exports = router => {
  router.get("/cases/:caseId/narrative", async (req, res) => {
    let _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        unit: true,
        prosecutors: {
          include: {
            user: true
          },
          orderBy: {
            isLead: 'desc'
          }
        },
        paralegalOfficers: {
          include: {
            user: true
          }
        },
        defendants: {
          include: {
            charges: {
              include: {
                elements: { orderBy: { order: 'asc' } }
              }
            },
            defenceLawyer: true
          }
        },
        hearings: {
          orderBy: { startDate: 'asc' }
        },
        location: true,
        tasks: true,
        dga: true
      },
    })

    addTimeLimitDates(_case)
    addCaseStatus(_case)

    const submittedReview = await prisma.caseReview.findFirst({
      where: { caseId: parseInt(req.params.caseId), status: 'submitted' },
      include: {
        documents: {
          include: {
            document: true,
            annotations: { orderBy: { createdAt: 'asc' } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.render("cases/narrative/index", { _case, submittedReview })
  })
}
