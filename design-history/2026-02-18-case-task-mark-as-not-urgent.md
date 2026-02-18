---
title: Designing the mark as not urgent flow
date: 2026-02-18
---

Tasks that have been marked as urgent can be marked as not urgent when the situation changes. The mark as not urgent flow gives users a way to record a reason before removing the urgent flag.

Users reach the flow by clicking "Mark as not urgent" on the [task details page](2026-02-18-case-task-show.md). The button only appears when a task is already marked as urgent.

## How it works

The flow has 2 steps:

1. Reason
2. Check answers

### Reason

The user enters a free-text reason for marking the task as not urgent using a character count component with a 5,000 character limit. An inset shows the task name so users can confirm they are acting on the right task.

![The reason page showing "Reason for marking as not urgent" as the heading, an inset showing the task name "Check directions", a character count text area, and a Continue button.](case-task-mark-as-not-urgent/step-1-reason.png)

### Check answers

The user reviews their answers before confirming. The task name is shown without a Change link. The reason has a Change link to go back and edit it.

![The check answers page showing "Check details and mark as not urgent" as the heading, with task name and reason for marking as not urgent rows, and a "Mark as not urgent" button.](case-task-mark-as-not-urgent/step-2-check.png)

### Confirmation

After confirming, the user is taken back to the task details page. A success banner confirms "Task marked as not urgent". The Urgent tag is removed from the task heading and the "Mark as not urgent" button is replaced with "Mark as urgent".

![The task details page for "Check directions" with a green success banner saying "Task marked as not urgent" and no Urgent tag next to the heading.](case-task-mark-as-not-urgent/success.png)

### Activity log

The action is recorded in the case activity log as "Task marked as not urgent", showing the task name and the reason.

![The case activity log showing a "Task marked as not urgent" entry by Rachael Harvey, with task name "Check directions" and the reason for marking as not urgent.](case-task-mark-as-not-urgent/activity-log.png)

## Error messages

### Reason for marking as not urgent

| Scenario | Error message |
|---|---|
| No reason entered | Enter a reason for marking as not urgent |
| Reason is too long | Reason for marking as not urgent must be 5,000 characters or fewer |
