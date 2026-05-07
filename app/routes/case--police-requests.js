const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { addTimeLimitDates } = require('../helpers/timeLimit')
const { addCaseStatus } = require('../helpers/caseStatus')

const ITEM_CATEGORIES = [
  'Documents and forms',
  'Footage',
  'Statements',
  'Forensic evidence',
  'Medical evidence',
  'Records',
  'Exhibits',
  'Other',
]

const ITEM_CATEGORY_OPTIONS = [
  { value: '', text: 'Select a category' },
  ...ITEM_CATEGORIES.map((c) => ({ value: c, text: c })),
]

const ITEM_CATEGORY_RADIO_ITEMS = ITEM_CATEGORIES.map((c) => ({ value: c, text: c }))

const ORDINALS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
function ordinal(n) {
  return ORDINALS[n - 1] || String(n)
}

function getItemStatus(item) {
  if (item.cancelledDate) return 'Cancelled'
  if (item.receivedDate) return 'Received'
  return 'Pending'
}

function getPoliceRequestStatus(request) {
  const statuses = request.items.map(getItemStatus)
  if (statuses.every(s => s === 'Cancelled')) return 'Cancelled'
  if (statuses.every(s => s === 'Received' || s === 'Cancelled')) return 'Received'
  return 'Pending'
}

function buildDate({ day, month, year }) {
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

function formatSessionDate({ day, month, year }) {
  if (!day || !month || !year) return ''
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function dateFields(date) {
  const d = new Date(date)
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() }
}

function buildDefendantItems(defendants) {
  return defendants.map(d => ({ value: String(d.id), text: `${d.firstName} ${d.lastName}` }))
}

function cleanDefendantIds(raw) {
  return [].concat(raw || []).filter(id => id !== '_unchecked')
}

function formatDefendantNames(ids, defendants) {
  const map = Object.fromEntries(defendants.map(d => [String(d.id), `${d.firstName} ${d.lastName}`]))
  return cleanDefendantIds(ids).map(id => map[id]).filter(Boolean).join(', ')
}

async function fetchCase(caseId) {
  const _case = await prisma.case.findUnique({
    where: { id: caseId },
    include: { defendants: { include: { charges: true } }, witnesses: true, dga: true },
  })
  addTimeLimitDates(_case)
  addCaseStatus(_case)
  return _case
}

module.exports = (router) => {
  // ─── Index ───────────────────────────────────────────────────────────────

  router.get('/cases/:caseId/police-requests', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)

    const policeRequests = await prisma.policeRequest.findMany({
      where: { caseId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { sentDate: 'desc' },
    })

    const policeRequestsWithStatus = policeRequests.map((request) => ({
      ...request,
      status: getPoliceRequestStatus(request),
      items: request.items.map((item) => ({ ...item, status: getItemStatus(item) })),
    }))

    res.render('cases/police-requests/index', { _case, policeRequests: policeRequestsWithStatus })
  })

  // ─── New: step 1 — description ────────────────────────────────────────────

  router.get('/cases/:caseId/police-requests/new', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)
    res.render('cases/police-requests/new', { _case })
  })

  router.post('/cases/:caseId/police-requests/new', (req, res) => {
    const caseId = req.params.caseId
    req.session.data.newPoliceRequest = {
      description: req.body.newPoliceRequest?.description || '',
      sentDate: new Date().toISOString(),
      items: req.session.data.newPoliceRequest?.items || [],
    }
    res.redirect(`/cases/${caseId}/police-requests/new/item`)
  })

  // ─── New: step 2 — add item ───────────────────────────────────────────────

  router.get('/cases/:caseId/police-requests/new/item', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)
    const items = req.session.data.newPoliceRequest?.items || []
    res.render('cases/police-requests/new/item', {
      _case,
      itemNumber: ordinal(items.length + 1),
      itemCategoryItems: ITEM_CATEGORY_RADIO_ITEMS,
      defendantItems: buildDefendantItems(_case.defendants),
    })
  })

  router.post('/cases/:caseId/police-requests/new/item', (req, res) => {
    const caseId = req.params.caseId
    if (!req.session.data.newPoliceRequest) req.session.data.newPoliceRequest = { items: [] }
    req.session.data.newPoliceRequest.items.push(req.body.newPoliceRequestItem)
    res.redirect(`/cases/${caseId}/police-requests/new/items`)
  })

  // ─── New: step 3 — add another / item list ────────────────────────────────

  router.get('/cases/:caseId/police-requests/new/items', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const _case = await fetchCase(caseId)
    const items = req.session.data.newPoliceRequest?.items || []

    if (items.length === 0) {
      return res.redirect(`/cases/${caseId}/police-requests/new/item`)
    }

    const formattedItems = items.map((item) => ({
      ...item,
      formattedDueDate: formatSessionDate(item.dueDate),
      defendantNames: formatDefendantNames(item.defendants, _case.defendants),
    }))

    res.render('cases/police-requests/new/items', { _case, items: formattedItems })
  })

  router.post('/cases/:caseId/police-requests/new/items', (req, res) => {
    const caseId = req.params.caseId
    if (req.body.addAnother === 'yes') {
      res.redirect(`/cases/${caseId}/police-requests/new/item`)
    } else {
      res.redirect(`/cases/${caseId}/police-requests/new/check`)
    }
  })

  // ─── New: edit item ───────────────────────────────────────────────────────

  router.get('/cases/:caseId/police-requests/new/items/:index/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const index = parseInt(req.params.index)
    const _case = await fetchCase(caseId)
    const item = req.session.data.newPoliceRequest.items[index]
    res.render('cases/police-requests/new/item-edit', {
      _case,
      item,
      index,
      itemNumber: ordinal(index + 1),
      itemCategoryItems: ITEM_CATEGORY_RADIO_ITEMS,
      defendantItems: buildDefendantItems(_case.defendants),
      selectedDefendantIds: cleanDefendantIds(item.defendants),
    })
  })

  router.post('/cases/:caseId/police-requests/new/items/:index/edit', (req, res) => {
    const caseId = req.params.caseId
    const index = parseInt(req.params.index)
    req.session.data.newPoliceRequest.items[index] = req.body.newPoliceRequestItem
    res.redirect(`/cases/${caseId}/police-requests/new/items`)
  })

  // ─── New: delete item ─────────────────────────────────────────────────────

  router.get('/cases/:caseId/police-requests/new/items/:index/delete', (req, res) => {
    const caseId = req.params.caseId
    const index = parseInt(req.params.index)
    req.session.data.newPoliceRequest.items.splice(index, 1)
    res.redirect(`/cases/${caseId}/police-requests/new/items`)
  })

  // ─── New: check answers ───────────────────────────────────────────────────

  router.get('/cases/:caseId/police-requests/new/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const sessionData = req.session.data.newPoliceRequest

    if (!sessionData) {
      return res.redirect(`/cases/${caseId}/police-requests/new`)
    }

    const _case = await fetchCase(caseId)

    const formattedSentDate = new Date(sessionData.sentDate)
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    const formattedItems = sessionData.items.map((item) => ({
      ...item,
      formattedDueDate: formatSessionDate(item.dueDate),
      defendantNames: formatDefendantNames(item.defendants, _case.defendants),
    }))

    res.render('cases/police-requests/new/check', {
      _case,
      policeRequest: { ...sessionData, formattedSentDate, items: formattedItems },
    })
  })

  router.post('/cases/:caseId/police-requests/new/check', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const { description, sentDate, items } = req.session.data.newPoliceRequest

    const policeRequest = await prisma.policeRequest.create({
      data: {
        caseId,
        description: description || null,
        sentDate: new Date(sentDate),
        items: {
          create: items.map((item) => ({
            description: item.description,
            category: item.category || null,
            dueDate: buildDate(item.dueDate),
            defendants: {
              connect: cleanDefendantIds(item.defendants).map(id => ({ id: parseInt(id) })),
            },
          })),
        },
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'PoliceRequest',
        recordId: policeRequest.id,
        action: 'CREATE',
        title: 'Police request created',
        caseId,
        meta: {
          description: description || null,
          items: items.map((item) => ({
            description: item.description,
            category: item.category || null,
            dueDate: formatSessionDate(item.dueDate),
          })),
        },
      },
    })

    delete req.session.data.newPoliceRequest

    req.flash('success', 'Request sent')
    res.redirect(`/cases/${caseId}/police-requests`)
  })

  // ─── Show ─────────────────────────────────────────────────────────────────

  router.get('/cases/:caseId/police-requests/:requestId', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)

    const _case = await fetchCase(caseId)

    const policeRequest = await prisma.policeRequest.findUnique({
      where: { id: requestId },
      include: { items: { include: { defendants: true }, orderBy: { createdAt: 'asc' } } },
    })

    policeRequest.status = getPoliceRequestStatus(policeRequest)
    policeRequest.items = policeRequest.items.map((item) => ({
      ...item,
      status: getItemStatus(item),
      defendantNames: item.defendants.map(d => `${d.firstName} ${d.lastName}`).join(', '),
    }))

    res.render('cases/police-requests/show', { _case, policeRequest })
  })

  // ─── Edit ─────────────────────────────────────────────────────────────────

  router.get('/cases/:caseId/police-requests/:requestId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)

    const _case = await fetchCase(caseId)

    const policeRequest = await prisma.policeRequest.findUnique({
      where: { id: requestId },
      include: { items: { include: { defendants: true }, orderBy: { createdAt: 'asc' } } },
    })

    const sentDateFields = dateFields(policeRequest.sentDate)
    const itemsWithDateFields = policeRequest.items.map((item) => ({
      ...item,
      dueDateFields: dateFields(item.dueDate),
      selectedDefendantIds: item.defendants.map(d => String(d.id)),
    }))

    res.render('cases/police-requests/edit', {
      _case,
      itemCategoryOptions: ITEM_CATEGORY_OPTIONS,
      defendantItems: buildDefendantItems(_case.defendants),
      policeRequest: { ...policeRequest, sentDateFields, items: itemsWithDateFields },
    })
  })

  router.post('/cases/:caseId/police-requests/:requestId/edit', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)
    const { description, sentDate, items } = req.body.policeRequest

    await prisma.policeRequest.update({
      where: { id: requestId },
      data: {
        description: description?.trim() || null,
        sentDate: buildDate(sentDate),
      },
    })

    const itemUpdates = [].concat(items || []).filter((item) => item.id)
    for (const item of itemUpdates) {
      await prisma.policeRequestItem.update({
        where: { id: parseInt(item.id) },
        data: {
          description: item.description.trim(),
          category: item.category || null,
          dueDate: buildDate(item.dueDate),
          defendants: {
            set: cleanDefendantIds(item.defendants).map(id => ({ id: parseInt(id) })),
          },
        },
      })
    }

    res.redirect(`/cases/${caseId}/police-requests/${requestId}`)
  })

  // ─── Mark received ────────────────────────────────────────────────────────

  router.get('/cases/:caseId/police-requests/:requestId/items/:itemId/mark-received', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)
    const itemId = parseInt(req.params.itemId)

    const _case = await fetchCase(caseId)
    const item = await prisma.policeRequestItem.findUnique({ where: { id: itemId } })

    res.render('cases/police-requests/items/mark-received', { _case, requestId, item })
  })

  router.post('/cases/:caseId/police-requests/:requestId/items/:itemId/mark-received', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)
    const itemId = parseInt(req.params.itemId)
    const { receivedDate } = req.body.markReceived

    await prisma.policeRequestItem.update({
      where: { id: itemId },
      data: { receivedDate: buildDate(receivedDate) },
    })

    res.redirect(`/cases/${caseId}/police-requests/${requestId}`)
  })

  // ─── Cancel item ──────────────────────────────────────────────────────────

  router.get('/cases/:caseId/police-requests/:requestId/items/:itemId/cancel', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)
    const itemId = parseInt(req.params.itemId)

    const _case = await fetchCase(caseId)
    const item = await prisma.policeRequestItem.findUnique({ where: { id: itemId } })

    res.render('cases/police-requests/items/cancel', { _case, requestId, item })
  })

  router.post('/cases/:caseId/police-requests/:requestId/items/:itemId/cancel', async (req, res) => {
    const caseId = parseInt(req.params.caseId)
    const requestId = parseInt(req.params.requestId)
    const itemId = parseInt(req.params.itemId)
    const { reason } = req.body.cancelItem

    await prisma.policeRequestItem.update({
      where: { id: itemId },
      data: { cancelledDate: new Date(), cancelledReason: reason },
    })

    res.redirect(`/cases/${caseId}/police-requests/${requestId}`)
  })
}
