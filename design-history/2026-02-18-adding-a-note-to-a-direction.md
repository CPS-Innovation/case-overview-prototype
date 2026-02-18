---
title: Adding a note to a direction
date: 2026-02-18
---

Users can add notes to directions to record relevant information. 

## How it works

Clicking "Add note" on the [direction details page](2026-02-18-adding-a-direction-details-page.md) takes the user to page allowing them to enter a note. 

An inset shows the direction description so users can confirm they are acting on the right direction.

![The note page showing "Note" as the heading, an inset showing the direction description, a Note textarea, and a Continue button.](adding-a-note-to-a-direction/step-1-note.png)

The user reviews their note before confirming. The direction is shown without a Change link. The note has a Change link to go back and edit it.

![The check answers page showing "Check details and add note" as the heading, with direction and note rows, and an "Add note" button.](adding-a-note-to-a-direction/step-2-check.png)

After confirming, the user is taken back to the direction details page. A success banner confirms "Note added". The new note appears at the top of the notes list.

![The direction details page with a green success banner saying "Note added" and the new note appearing at the top of the notes section.](adding-a-note-to-a-direction/success.png)

### Activity log

The action is recorded in the activity log as "Direction note added", showing the direction description and the note text.

![The case activity log showing a "Direction note added" entry by Rachael Harvey, with the direction description and note text.](adding-a-note-to-a-direction/activity-log.png)

## Error messages

### Note

| Scenario | Error message |
|---|---|
| No note entered | Enter a note |
