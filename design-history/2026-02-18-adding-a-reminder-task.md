---
title: Adding a reminder task
date: 2026-02-18
---

Users sometimes need to create their own reminders to follow up on something related to a case.

Users reach the flow by clicking "Add reminder" on the [case task list](2026-02-18-allowing-users-to-see-tasks-for-a-specific-case.md).

## How it works

The user enters a free-text description of the reminder using a character count component with a 5,000 character limit.

![The description page, showing a text area labelled "Description" with a character count, and a Continue button.](adding-a-reminder-task/step-1-description.png)

The user answers whether this reminder is about asset recovery. This determines the reminder type stored against the task.

![The asset recovery page, showing a yes/no radio question "Is this reminder about asset recovery?" with a Continue button.](adding-a-reminder-task/step-2-asset-recovery.png)

The user enters three dates: a reminder date for when they should first be reminded, a due date for when the task must be completed, and an escalation date for when the task should escalate if still incomplete.

![The reminder dates page, showing three date input fields: reminder date, due date, and escalation date, each with day, month, and year fields.](adding-a-reminder-task/step-3-dates.png)

The user selects who the reminder is assigned to. The list includes all users in the case's unit, with the signed-in user shown first as "(you)". Admin pool and other team options for the unit appear at the bottom of the list.

![The owner page, showing a long list of radio options including the signed-in user listed first as "Rachael Harvey (you)", followed by other users and then team pools.](adding-a-reminder-task/step-4-owner.png)

The user reviews all their answers before confirming. Each row has a change link to go back and edit that step.

![The check answers page showing description, asset recovery, reminder date, due date, escalation date, and owner, each with a change link. An "Add reminder" button appears at the bottom.](adding-a-reminder-task/step-5-check.png)

After submitting, the user is taken to the new task's detail page. A success banner confirms "Reminder added".

![The task details page for "Chase victim personal statement" with a green success banner saying "Reminder added" at the top.](adding-a-reminder-task/success.png)

### Activity log

The action is recorded in the activity log as "Task added", showing the task name, owner, and a link to view the task.

![The case activity log showing a "Task added" entry by Rachael Harvey, with the task name "Chase victim personal statement", the owner, and a View task link.](adding-a-reminder-task/activity-log.png)
