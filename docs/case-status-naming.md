# Case status naming convention

## Principles

- Clarity over brevity — "Ready to make charging decision" is better than "Charging decision" (see explanation below)
- Status names should not read like action labels — "Make charging decision" as a status is too close to the action "Make charging decision"
- Make it clear if a user can do something versus waiting for something
- Where possible, the end of the status should relate to the primary action

| Status | Action |
|---|---|
| Ready for triage | Accept / Reject |
| Ready to assign prosecutor | Assign prosecutor |
| Ready to make charging decision | Make charging decision |
| Waiting for resubmission | — |
| Waiting for police to charge | — |
| Waiting for first hearing | — |

## Noun phrases are ambiguous

"Charging decision" doesn't tell you whether:

- The work to make a charging decision is yet to be started
- You are waiting on something in order to be able to make a charging decision
- The work to make a charging decision is in progress
- A charging decision has been made

When a user has to work out what a label means, cognitive load goes up. 

Shorter labels only reduce cognitive load when the meaning is immediately clear.

## "‘Ready to make charging decision’ is still ambiguous"

Yes because some steps may already have happened.

But this is not an argument for a noun-phrase. The problem still applies to "Charging decision": it doesn't tell you whether the decision is pending, in progress, or complete.

To fix this problem we need more granular statuses such as:

- Ready to make charging decision
- Making charging decision
- Charging decision made

## Recommendation

Use "Ready to..." for statuses where a user action is required and has not been started. 
Use "Waiting for..." where the case is blocked on an external dependency.
