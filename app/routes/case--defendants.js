const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { addTimeLimitDates } = require('../helpers/timeLimit')
const statuses = require('../data/case-statuses')

const SIMULATE_TRANSITIONS = {
  [statuses.POLICE_RESUBMISSION_PENDING]: statuses.TRIAGE_NEEDED,
  [statuses.POLICE_CHARGING_INFORMATION_PENDING]: statuses.CHARGING_DECISION_NEEDED,
  [statuses.POLICE_AUTHORISED_CHARGE_PENDING]: statuses.CHARGED,
}

async function getCaseForDefendant(caseId) {
  return prisma.case.findUnique({
    where: { id: caseId },
    include: {
      unit: true,
      prosecutors: { include: { user: true } },
      paralegalOfficers: { include: { user: true } },
      defendants: { include: { charges: true, defenceLawyer: true } },
      location: true,
      tasks: true,
      dga: true
    }
  })
}

module.exports = router => {
  router.get('/cases/:caseId/defendants/:defendantId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)

    let _case = await getCaseForDefendant(caseId)
    _case = addTimeLimitDates(_case)

    const defendant = _case.defendants.find(d => d.id === defendantId)
    if (!defendant) return res.status(404).send('Defendant not found')

    res.render('cases/defendants/show', { _case, defendant })
  })

  async function getDefendant(caseId, defendantId) {
    const _case = await getCaseForDefendant(caseId)
    const defendant = _case.defendants.find(d => d.id === defendantId)
    return { _case: addTimeLimitDates(_case), defendant }
  }

  router.post('/cases/:caseId/defendants/:defendantId/simulate-advance', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    const defendant = await prisma.defendant.findUnique({ where: { id: defendantId } })
    const nextStatus = SIMULATE_TRANSITIONS[defendant.status]
    if (nextStatus) {
      await prisma.defendant.update({ where: { id: defendantId }, data: { status: nextStatus } })
    }
    req.flash('success', 'Status updated')
    res.redirect(`/cases/${caseId}/defendants/${defendantId}`)
  })

  router.get('/cases/:caseId/defendants/:defendantId/request-more-information', async (req, res) => {
    const { _case, defendant } = await getDefendant(parseInt(req.params.caseId), parseInt(req.params.defendantId))
    res.render('cases/defendants/request-more-information', { _case, defendant })
  })

  router.post('/cases/:caseId/defendants/:defendantId/request-more-information', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    await prisma.defendant.update({ where: { id: defendantId }, data: { status: statuses.POLICE_CHARGING_INFORMATION_PENDING } })
    req.flash('success', 'More information requested')
    res.redirect(`/cases/${caseId}/defendants/${defendantId}`)
  })

  router.get('/cases/:caseId/defendants/:defendantId/accept', async (req, res) => {
    const { _case, defendant } = await getDefendant(parseInt(req.params.caseId), parseInt(req.params.defendantId))
    res.render('cases/defendants/accept', { _case, defendant })
  })

  router.post('/cases/:caseId/defendants/:defendantId/accept', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    await prisma.defendant.update({ where: { id: defendantId }, data: { status: statuses.CHARGING_DECISION_NEEDED } })
    req.flash('success', 'Case accepted')
    res.redirect(`/cases/${caseId}/defendants/${defendantId}`)
  })

  router.get('/cases/:caseId/defendants/:defendantId/reject', async (req, res) => {
    const { _case, defendant } = await getDefendant(parseInt(req.params.caseId), parseInt(req.params.defendantId))
    res.render('cases/defendants/reject', { _case, defendant })
  })

  router.post('/cases/:caseId/defendants/:defendantId/reject', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    await prisma.defendant.update({ where: { id: defendantId }, data: { status: statuses.POLICE_RESUBMISSION_PENDING } })
    req.flash('success', 'Case rejected')
    res.redirect(`/cases/${caseId}/defendants/${defendantId}`)
  })

  router.get('/cases/:caseId/defendants/:defendantId/no-further-action', async (req, res) => {
    const { _case, defendant } = await getDefendant(parseInt(req.params.caseId), parseInt(req.params.defendantId))
    res.render('cases/defendants/no-further-action', { _case, defendant })
  })

  router.post('/cases/:caseId/defendants/:defendantId/no-further-action', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    await prisma.defendant.update({ where: { id: defendantId }, data: { status: statuses.NO_FURTHER_ACTION } })
    req.flash('success', 'Marked as no further action')
    res.redirect(`/cases/${caseId}/defendants/${defendantId}`)
  })

  const decisionStatusMap = {
    'charge': statuses.POLICE_AUTHORISED_CHARGE_PENDING,
    'no-further-action': statuses.NO_FURTHER_ACTION,
  }

  const decisionFlashMap = {
    'charge': 'Case charged',
    'no-further-action': 'Case marked as no further action',
  }

  router.get('/cases/:caseId/defendants/:defendantId/make-charging-decision', async (req, res) => {
    const { _case, defendant } = await getDefendant(parseInt(req.params.caseId), parseInt(req.params.defendantId))
    res.render('cases/defendants/make-charging-decision', { _case, defendant })
  })

  router.post('/cases/:caseId/defendants/:defendantId/make-charging-decision', (req, res) => {
    const { caseId, defendantId } = req.params
    req.session.data.chargingDecision = { decision: req.body.decision }
    res.redirect(`/cases/${caseId}/defendants/${defendantId}/make-charging-decision/check`)
  })

  router.get('/cases/:caseId/defendants/:defendantId/make-charging-decision/check', async (req, res) => {
    const { _case, defendant } = await getDefendant(parseInt(req.params.caseId), parseInt(req.params.defendantId))
    res.render('cases/defendants/make-charging-decision-check', { _case, defendant })
  })

  router.post('/cases/:caseId/defendants/:defendantId/make-charging-decision/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const defendantId = parseInt(req.params.defendantId)
    const decision = req.session.data.chargingDecision?.decision
    const status = decisionStatusMap[decision]
    if (status) {
      await prisma.defendant.update({ where: { id: defendantId }, data: { status } })
    }
    delete req.session.data.chargingDecision
    req.flash('success', decisionFlashMap[decision] || 'Charging decision recorded')
    res.redirect(`/cases/${caseId}/defendants/${defendantId}`)
  })

  router.get("/cases/:caseId/defendants", async (req, res) => {
    let _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        witnesses: true,
        prosecutors: {
          include: {
            user: true
          }
        },
        paralegalOfficers: {
          include: {
            user: true
          }
        },
        defendants: {
          include: {
            charges: true,
            defenceLawyer: true
          }
        },
        location: true,
        tasks: true,
        dga: true
      }
    })

    _case = addTimeLimitDates(_case)

    res.render("cases/defendants/index", { _case })
  })

}
