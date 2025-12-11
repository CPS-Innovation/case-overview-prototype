const _ = require('lodash')
const { DateTime } = require('luxon')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = router => {
  // Step 1: Decision form (Accept or Reject)
  router.get("/cases/:caseId/tasks/:taskId/check-new-pcd-case", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        defendants: true
      }
    })

    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.taskId) }
    })

    res.render("cases/tasks/check-new-pcd-case/index", { _case, task })
  })

  router.post("/cases/:caseId/tasks/:taskId/check-new-pcd-case", (req, res) => {
    const caseId = req.params.caseId
    const taskId = req.params.taskId
    const decision = req.body.decision

    // Store decision in session
    _.set(req, 'session.data.completeCheckNewPcdCase.decision', decision)

    // Conditional redirect based on decision
    if (decision === "Accept") {
      // Skip rejection pages, go straight to check answers
      res.redirect(`/cases/${caseId}/tasks/${taskId}/check-new-pcd-case/check`)
    } else {
      // Start rejection flow with reasons page
      res.redirect(`/cases/${caseId}/tasks/${taskId}/check-new-pcd-case/reasons`)
    }
  })

  // Step 2: Reasons for rejection (only shown if Reject)
  router.get("/cases/:caseId/tasks/:taskId/check-new-pcd-case/reasons", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        defendants: true
      }
    })

    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.taskId) }
    })

    res.render("cases/tasks/check-new-pcd-case/reasons", { _case, task })
  })

  router.post("/cases/:caseId/tasks/:taskId/check-new-pcd-case/reasons", (req, res) => {
    const caseId = req.params.caseId
    const taskId = req.params.taskId

    // GOV.UK checkboxes send "_unchecked" when no items selected
    let rejectionReasons = req.body.completeCheckNewPcdCase?.rejectionReasons || []
    if (Array.isArray(rejectionReasons)) {
      rejectionReasons = rejectionReasons.filter(r => r !== '_unchecked')
    }

    // Store reasons in session (details are automatically stored via form names)
    _.set(req, 'session.data.completeCheckNewPcdCase.rejectionReasons', rejectionReasons)

    // Always go to police response date for reject flow
    res.redirect(`/cases/${caseId}/tasks/${taskId}/check-new-pcd-case/police-response-date`)
  })

  // Step 3: Police response date (always shown for reject flow)
  router.get("/cases/:caseId/tasks/:taskId/check-new-pcd-case/police-response-date", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        defendants: true
      }
    })

    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.taskId) }
    })

    res.render("cases/tasks/check-new-pcd-case/police-response-date", { _case, task })
  })

  router.post("/cases/:caseId/tasks/:taskId/check-new-pcd-case/police-response-date", (req, res) => {
    const caseId = req.params.caseId
    const taskId = req.params.taskId

    // Date is automatically stored in session via form names
    // Navigate to reminder task creation
    res.redirect(`/cases/${caseId}/tasks/${taskId}/check-new-pcd-case/create-reminder-task`)
  })

  // Step 4: Create reminder task (only shown for reject flow)
  router.get("/cases/:caseId/tasks/:taskId/check-new-pcd-case/create-reminder-task", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        defendants: true
      }
    })

    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.taskId) }
    })

    res.render("cases/tasks/check-new-pcd-case/create-reminder-task", { _case, task })
  })

  router.post("/cases/:caseId/tasks/:taskId/check-new-pcd-case/create-reminder-task", (req, res) => {
    const caseId = req.params.caseId
    const taskId = req.params.taskId

    // createReminderTask and reminderDueDate are automatically stored in session
    // Navigate to check answers
    res.redirect(`/cases/${caseId}/tasks/${taskId}/check-new-pcd-case/check`)
  })

  // Step 5: Check answers
  router.get("/cases/:caseId/tasks/:taskId/check-new-pcd-case/check", async (req, res) => {
    const _case = await prisma.case.findUnique({
      where: { id: parseInt(req.params.caseId) },
      include: {
        defendants: true
      }
    })

    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.taskId) }
    })

    const data = _.get(req, 'session.data.completeCheckNewPcdCase')

    res.render("cases/tasks/check-new-pcd-case/check", { _case, task, data })
  })

  router.post("/cases/:caseId/tasks/:taskId/check-new-pcd-case/check", async (req, res) => {
    const taskId = parseInt(req.params.taskId)
    const caseId = parseInt(req.params.caseId)

    const data = _.get(req, 'session.data.completeCheckNewPcdCase')

    // Update task as completed
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { completedDate: new Date() },
      include: {
        assignedToUser: true,
        assignedToTeam: {
          include: {
            unit: true
          }
        }
      }
    })

    // Build activity log meta with conditional rejection data
    const activityLogMeta = {
      task: {
        id: task.id,
        name: task.name,
        reminderType: task.reminderType
      },
      decision: data.decision,
      assignedToUser: task.assignedToUser ? {
        id: task.assignedToUser.id,
        firstName: task.assignedToUser.firstName,
        lastName: task.assignedToUser.lastName
      } : null,
      assignedToTeam: task.assignedToTeam ? {
        id: task.assignedToTeam.id,
        name: task.assignedToTeam.name,
        unit: {
          name: task.assignedToTeam.unit.name
        }
      } : null
    }

    // Add rejection-specific data if decision was Reject
    if (data.decision === 'Reject') {
      activityLogMeta.rejectionReasons = data.rejectionReasons || []
      activityLogMeta.rejectionDetails = data.rejectionDetails || {}

      // Convert police response date to ISO string if exists
      if (data.policeResponseDate?.day && data.policeResponseDate?.month && data.policeResponseDate?.year) {
        activityLogMeta.policeResponseDate = DateTime.fromObject({
          day: data.policeResponseDate.day,
          month: data.policeResponseDate.month,
          year: data.policeResponseDate.year
        }).toISO()
      }

      activityLogMeta.createReminderTask = data.createReminderTask || 'no'

      // Convert reminder due date to ISO string if exists
      if (data.createReminderTask === 'yes' && data.reminderDueDate?.day && data.reminderDueDate?.month && data.reminderDueDate?.year) {
        activityLogMeta.reminderDueDate = DateTime.fromObject({
          day: data.reminderDueDate.day,
          month: data.reminderDueDate.month,
          year: data.reminderDueDate.year
        }).toISO()
      }
    }

    // Create activity log entry with decision
    await prisma.activityLog.create({
      data: {
        userId: req.session.data.user.id,
        model: 'Task',
        recordId: task.id,
        action: 'UPDATE',
        title: 'Task completed: Check New PCD case',
        caseId: caseId,
        meta: activityLogMeta
      }
    })

    // Clear session data
    _.set(req, 'session.data.completeCheckNewPcdCase', null)

    req.flash('success', 'Task completed')
    res.redirect(`/cases/${caseId}/tasks`)
  })
}
