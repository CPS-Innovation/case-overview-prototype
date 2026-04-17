const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const hearingTypes = require('../data/hearing-types')

const hearingTypeItems = hearingTypes.map(t => ({ value: t, text: t }))

module.exports = router => {
  router.get('/cases/:caseId/hearings/add', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) }
    })
    res.render('cases/hearings/add/index', { _case, hearingTypeItems })
  })

  router.post('/cases/:caseId/hearings/add', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.addHearing = {
      ...req.session.data.addHearing,
      type: req.body.addHearing?.type
    }
    res.redirect(`/cases/${caseId}/hearings/add/date`)
  })

  router.get('/cases/:caseId/hearings/add/date', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) }
    })
    res.render('cases/hearings/add/date', { _case })
  })

  router.post('/cases/:caseId/hearings/add/date', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.addHearing = {
      ...req.session.data.addHearing,
      hearingDate: req.body.addHearing?.hearingDate
    }
    res.redirect(`/cases/${caseId}/hearings/add/venue`)
  })

  router.get('/cases/:caseId/hearings/add/venue', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) }
    })
    res.render('cases/hearings/add/venue', { _case })
  })

  router.post('/cases/:caseId/hearings/add/venue', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.addHearing = {
      ...req.session.data.addHearing,
      venue: req.body.addHearing?.venue
    }
    res.redirect(`/cases/${caseId}/hearings/add/check`)
  })

  router.get('/cases/:caseId/hearings/add/check', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) }
    })
    res.render('cases/hearings/add/check', { _case })
  })

  router.post('/cases/:caseId/hearings/add/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const { type, hearingDate, venue } = req.session.data.addHearing
    const startDate = new Date(hearingDate.year, hearingDate.month - 1, hearingDate.day)

    await prisma.hearing.create({
      data: {
        caseId,
        startDate,
        status: 'Scheduled',
        type,
        venue
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Hearing added',
        meta: { ...req.session.data.addHearing },
        caseId
      }
    })

    delete req.session.data.addHearing

    req.flash('success', 'Hearing added')
    res.redirect(`/cases/${caseId}/hearings`)
  })
}
