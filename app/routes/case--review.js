const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const statuses = require('../data/case-statuses')
const hearingStatuses = require('../data/hearing-statuses')
const { findOrCreateReview } = require('../helpers/caseReview')
const { createInformationRequestFromSession } = require('../helpers/informationRequest')

// CPS only ever states what the charges should be - it never charges a
// defendant directly. A "Charge" decision here moves the defendant to
// Charges pending; they only become Charged once the police or referring
// agency send back authorised charges.
const decisionStatusMap = {
  'Charge': statuses.CHARGES_PENDING,
  'Do not charge': statuses.NO_FURTHER_ACTION,
}

function parseHearingTime(time) {
  const match = String(time || '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return { hour: 10, minute: 0 }

  let hour = parseInt(match[1], 10)
  const minute = match[2] ? parseInt(match[2], 10) : 0
  const meridiem = match[3]?.toLowerCase()

  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0

  return { hour, minute }
}

module.exports = (router) => {
  // Task list
  router.get('/cases/:caseId/review', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: true }
    })

    const review = await findOrCreateReview(prisma, caseId, userId)

    const documents = await prisma.document.findMany({
      where: { caseId },
      orderBy: { id: 'asc' }
    })

    const documentReviews = await prisma.caseReviewDocument.findMany({
      where: { caseReviewId: review.id },
      include: { annotations: { orderBy: { createdAt: 'asc' } } }
    })

    const docReviewMap = {}
    documentReviews.forEach(dr => { docReviewMap[dr.documentId] = dr })

    const eligibleDefendants = _case.defendants.filter(d => d.status === statuses.NOT_CHARGED && d.needsReview)
    const needsChargingDecision = eligibleDefendants.length > 0
    const chargingDecisionNeedsDefendantSelection = eligibleDefendants.length > 1

    res.render('cases/review/index', { _case, documents, review, docReviewMap, needsChargingDecision, chargingDecisionNeedsDefendantSelection })
  })

  // Check page
  router.get('/cases/:caseId/review/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: true }
    })

    const review = await findOrCreateReview(prisma, caseId, userId)

    const documents = await prisma.document.findMany({
      where: { caseId },
      orderBy: { id: 'asc' }
    })

    const documentReviews = await prisma.caseReviewDocument.findMany({
      where: { caseReviewId: review.id },
      include: { annotations: { orderBy: { createdAt: 'asc' } } }
    })

    const docReviewMap = {}
    documentReviews.forEach(dr => { docReviewMap[dr.documentId] = dr })

    const needsChargingDecision = _case.defendants.some(d => d.status === statuses.NOT_CHARGED && d.needsReview)

    res.render('cases/review/check', { _case, documents, review, docReviewMap, needsChargingDecision })
  })

  // Submit review
  router.post('/cases/:caseId/review/submit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const userId = req.session.data.user.id
    const decision = req.session.data.chargingDecision?.decision
    const defendantIds = req.session.data.chargingDecision?.defendantIds

    const _case = await prisma.case.findUnique({
      where: { id: caseId },
      include: { defendants: true },
    })
    const reviewedDefendantIds = defendantIds?.length
      ? defendantIds.map(id => parseInt(id))
      : _case.defendants.map(d => d.id)

    const status = decisionStatusMap[decision]
    if (status) {
      await prisma.defendant.updateMany({
        where: { id: { in: reviewedDefendantIds } },
        data: { status },
      })
    }

    await prisma.defendant.updateMany({
      where: { id: { in: reviewedDefendantIds } },
      data: { needsReview: false },
    })

    const reviewFirstHearing = req.session.data.reviewFirstHearing
    const hasFirstHearing = (await prisma.hearing.count({
      where: { caseId, type: 'First hearing' },
    })) > 0

    if (!hasFirstHearing && reviewFirstHearing?.confirmed) {
      const { hearingDate, time, venue } = reviewFirstHearing
      const { hour, minute } = parseHearingTime(time)
      const startDate = new Date(hearingDate.year, hearingDate.month - 1, hearingDate.day, hour, minute, 0)

      const hearing = await prisma.hearing.create({
        data: {
          caseId,
          startDate,
          status: hearingStatuses.PREPARATION_NEEDED,
          type: 'First hearing',
          venue,
          defendants: {
            connect: reviewedDefendantIds.map(id => ({ id })),
          },
        },
      })

      const selectedDefendants = _case.defendants
        .filter(d => reviewedDefendantIds.includes(d.id))
        .map(d => ({ firstName: d.firstName, lastName: d.lastName }))

      await prisma.activityLog.create({
        data: {
          userId,
          model: 'Case',
          recordId: caseId,
          action: 'UPDATE',
          title: 'First hearing added',
          meta: {
            hearingEventType: 'added',
            hearingType: 'First hearing',
            hearingDate: hearing.startDate,
            venue,
            defendants: selectedDefendants,
          },
          caseId,
        },
      })
    }

    const reviewInformationRequest = req.session.data.reviewInformationRequest
    if (reviewInformationRequest?.complete) {
      await createInformationRequestFromSession(prisma, caseId, reviewInformationRequest, userId)
    }

    const review = await prisma.caseReview.findFirst({
      where: { caseId, status: 'in_progress' }
    })

    if (review) {
      await prisma.caseReview.update({
        where: { id: review.id },
        data: { status: 'submitted', decision }
      })
    }

    await prisma.activityLog.create({
      data: {
        userId,
        model: 'Case',
        recordId: caseId,
        action: 'UPDATE',
        title: 'Charging decision made',
        meta: {
          ...req.session.data.chargingDecision,
          caseReviewId: review?.id
        },
        caseId,
      },
    })

    const referrer = req.session.data.chargingDecision?.referrer
    delete req.session.data.chargingDecision
    delete req.session.data.reviewFirstHearing
    delete req.session.data.reviewInformationRequest

    req.flash('success', 'Review submitted')
    res.redirect(referrer || `/cases/${caseId}`)
  })
}
