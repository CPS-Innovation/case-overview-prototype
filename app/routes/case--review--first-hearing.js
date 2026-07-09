const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// First hearing details — start empty, CPS has to find out and enter the real details
function buildEmptyFirstHearing() {
  return {
    hearingDate: { day: '', month: '', year: '' },
    time: '',
    venue: '',
  }
}

function buildDateHintExample() {
  const exampleDate = new Date()
  exampleDate.setMonth(exampleDate.getMonth() + 6)
  return `${exampleDate.getDate()} ${exampleDate.getMonth() + 1} ${exampleDate.getFullYear()}`
}

module.exports = (router) => {
  router.get('/cases/:caseId/review/first-hearing', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await prisma.case.findUnique({ where: { id: caseId } })

    if (!req.session.data.reviewFirstHearing) {
      req.session.data.reviewFirstHearing = buildEmptyFirstHearing()
    }
    res.locals.data.reviewFirstHearing = req.session.data.reviewFirstHearing

    res.render('cases/review/first-hearing/index', { _case, dateHintExample: buildDateHintExample() })
  })

  router.post('/cases/:caseId/review/first-hearing', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.reviewFirstHearing = {
      ...req.session.data.reviewFirstHearing,
      hearingDate: req.body.reviewFirstHearing?.hearingDate,
    }
    res.redirect(`/cases/${caseId}/review/first-hearing/time`)
  })

  // First hearing details — time
  router.get('/cases/:caseId/review/first-hearing/time', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    res.render('cases/review/first-hearing/time', { _case })
  })

  router.post('/cases/:caseId/review/first-hearing/time', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.reviewFirstHearing = {
      ...req.session.data.reviewFirstHearing,
      time: req.body.reviewFirstHearing?.time,
    }
    res.redirect(`/cases/${caseId}/review/first-hearing/venue`)
  })

  // First hearing details — venue
  router.get('/cases/:caseId/review/first-hearing/venue', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    res.render('cases/review/first-hearing/venue', { _case })
  })

  router.post('/cases/:caseId/review/first-hearing/venue', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.reviewFirstHearing = {
      ...req.session.data.reviewFirstHearing,
      venue: req.body.reviewFirstHearing?.venue,
    }
    res.redirect(`/cases/${caseId}/review/first-hearing/check`)
  })

  // First hearing details — check answers
  router.get('/cases/:caseId/review/first-hearing/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await prisma.case.findUnique({ where: { id: caseId } })
    res.render('cases/review/first-hearing/check', { _case })
  })

  router.post('/cases/:caseId/review/first-hearing/check', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.reviewFirstHearing.confirmed = req.body.complete === 'yes'
    res.redirect(`/cases/${caseId}/review`)
  })
}
