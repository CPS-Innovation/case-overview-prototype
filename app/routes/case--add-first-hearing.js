const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const hearingStatuses = require('../data/hearing-statuses')

module.exports = (router) => {
  router.get('/cases/:caseId/add-first-hearing', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })
    res.render('cases/add-first-hearing/index', { _case })
  })

  router.post('/cases/:caseId/add-first-hearing', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.addFirstHearing = {
      ...req.session.data.addFirstHearing,
      hearingDate: req.body.addFirstHearing?.hearingDate,
    }
    res.redirect(`/cases/${caseId}/add-first-hearing/venue`)
  })

  router.get('/cases/:caseId/add-first-hearing/venue', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })
    res.render('cases/add-first-hearing/venue', { _case })
  })

  router.post('/cases/:caseId/add-first-hearing/venue', async (req, res) => {
    const caseId = req.params.caseId
    req.session.data.addFirstHearing = {
      ...req.session.data.addFirstHearing,
      venue: req.body.addFirstHearing?.venue,
    }

    const _case = await prisma.case.findUnique({
      where: { id: parseInt(caseId) },
      include: { defendants: true },
    })

    if (_case.defendants.length > 1) {
      res.redirect(`/cases/${caseId}/add-first-hearing/defendants`)
    } else {
      res.redirect(`/cases/${caseId}/add-first-hearing/check`)
    }
  })

  router.get('/cases/:caseId/add-first-hearing/defendants', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })

    const selectedDefendantIds = req.session.data.addFirstHearing?.defendantIds ||
      _case.defendants.map(d => String(d.id))

    const defendantItems = _case.defendants.map(d => ({
      value: String(d.id),
      text: `${d.firstName} ${d.lastName}`,
    }))

    res.render('cases/add-first-hearing/defendants', { _case, defendantItems, selectedDefendantIds })
  })

  router.post('/cases/:caseId/add-first-hearing/defendants', (req, res) => {
    const caseId = req.params.caseId
    const defendantIds = [].concat(req.body.addFirstHearing?.defendants || [])
    req.session.data.addFirstHearing = {
      ...req.session.data.addFirstHearing,
      defendantIds,
    }
    res.redirect(`/cases/${caseId}/add-first-hearing/check`)
  })

  router.get('/cases/:caseId/add-first-hearing/check', async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: { defendants: true },
    })
    res.render('cases/add-first-hearing/check', { _case })
  })

  router.post('/cases/:caseId/add-first-hearing/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const { hearingDate, venue } = req.session.data.addFirstHearing
    const startDate = new Date(hearingDate.year, hearingDate.month - 1, hearingDate.day)

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: true },
    })

    const rawIds = req.session.data.addFirstHearing?.defendantIds ||
      _case.defendants.map(d => String(d.id))
    const defendantIds = rawIds.map(id => parseInt(id)).filter(id => !isNaN(id))

    await prisma.hearing.create({
      data: {
        caseId,
        startDate,
        status: hearingStatuses.PREPARATION_NEEDED,
        type: 'First hearing',
        venue,
        defendants: {
          connect: defendantIds.map(id => ({ id })),
        },
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'First hearing added',
        meta: { ...req.session.data.addFirstHearing },
        caseId,
      },
    })

    delete req.session.data.addFirstHearing

    req.flash('success', 'First hearing added')
    res.redirect(`/cases/${caseId}`)
  })
}
