const statuses = require('../data/case-statuses')

// A case's review is shared - whoever opens it continues the same review
// rather than getting their own private copy, so document status and
// annotations are visible regardless of who is signed in.
async function findOrCreateReview(prisma, caseId, userId) {
  let review = await prisma.caseReview.findFirst({
    where: { caseId, status: 'in_progress' }
  })
  if (!review) {
    review = await prisma.caseReview.findFirst({
      where: { caseId },
      orderBy: { updatedAt: 'desc' }
    })
  }
  if (!review) {
    review = await prisma.caseReview.create({
      data: { caseId, userId }
    })
  }
  return review
}

async function findOrCreateDocumentReview(prisma, caseReviewId, documentId) {
  let docReview = await prisma.caseReviewDocument.findFirst({
    where: { caseReviewId, documentId }
  })
  if (!docReview) {
    docReview = await prisma.caseReviewDocument.create({
      data: { caseReviewId, documentId }
    })
  }
  return docReview
}

// Charges belonging to defendants who are still awaiting a charging decision
// this review, in a stable order (defendant order, then charge order).
async function getEligibleCharges(prisma, caseId) {
  const _case = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      defendants: {
        include: { charges: { include: { elements: { orderBy: { order: 'asc' } } } } }
      }
    },
  })

  const eligibleDefendants = _case.defendants.filter(d => d.status === statuses.NOT_CHARGED && d.needsReview)
  const charges = eligibleDefendants.flatMap(d => d.charges.map(charge => ({ ...charge, defendant: d })))

  return { _case, eligibleDefendants, charges }
}

module.exports = {
  findOrCreateReview,
  findOrCreateDocumentReview,
  getEligibleCharges,
}
