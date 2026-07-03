const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function buildReturnUrl(caseId, from, documentId) {
  if (from === 'document' && documentId) {
    return `/cases/${caseId}/review/documents/${documentId}`
  }
  return `/cases/${caseId}/review/charging-decision`
}

module.exports = (router) => {
  router.get('/cases/:caseId/points-to-prove/:pointToProveId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const pointToProveId = parseInt(req.params.pointToProveId)
    const from = req.query.from || 'make-charging-decision'
    const documentId = req.query.documentId || ''

    const [_case, pointToProve] = await Promise.all([
      prisma.case.findUnique({ where: { id: caseId } }),
      prisma.pointToProve.findUnique({ where: { id: pointToProveId } })
    ])

    res.render('cases/points-to-prove/edit', { _case, pointToProve, caseId, from, documentId })
  })

  router.post('/cases/:caseId/points-to-prove/:pointToProveId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const pointToProveId = parseInt(req.params.pointToProveId)
    const { from, documentId, strength } = req.body

    await prisma.pointToProve.update({
      where: { id: pointToProveId },
      data: { strength }
    })

    res.redirect(buildReturnUrl(caseId, from, documentId))
  })
}
