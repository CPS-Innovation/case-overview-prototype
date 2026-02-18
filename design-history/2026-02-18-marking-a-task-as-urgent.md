---
title: Marking a task as urgent
date: 2026-02-18
---

Tasks can be marked as urgent when they need immediate attention.

Users reach the flow by clicking "Mark as urgent" on the [task details page](2026-02-18-adding-a-task-details-page.md).

## How it works

Clicking “Mark as urgent” takes users to enter a free-text reason for marking the task as urgent using a character count component with a 5,000 character limit. 

An inset shows the task name so users can confirm they are acting on the right task.

![The reason page showing "Reason for marking as urgent" as the heading, an inset showing the task name "Check directions", a character count text area, and a Continue button.](marking-a-task-as-urgent/step-1-reason.png)

The user can check their answers before confirming. 

The reason has a ‘Change’ link to allow users to go back and edit it.

![The check answers page showing "Check details and mark as urgent" as the heading, with task name and reason for marking as urgent rows, and a "Mark as urgent" button.](marking-a-task-as-urgent/step-2-check.png)

After confirming, the user is taken back to the task details page. 

A success banner confirms "Task marked as urgent". The task heading now shows an "Urgent" tag, and the urgent reason appears in the task details.

![The task details page for "Check directions" with a green success banner saying "Task marked as urgent", an Urgent tag next to the heading, and the urgent reason shown in the details.](marking-a-task-as-urgent/success.png)

### Activity log

The action is recorded in the case activity log as "Task marked as urgent", showing the task name and the reason.

![The case activity log showing a "Task marked as urgent" entry by Rachael Harvey, with task name "Check directions" and the reason for marking as urgent.](marking-a-task-as-urgent/activity-log.png)

## Error messages

### Reason for marking as urgent

| Scenario | Error message |
|---|---|
| No reason entered | Enter a reason for marking as urgent |
| Reason is too long | Reason for marking as urgent must be 5,000 characters or fewer |
