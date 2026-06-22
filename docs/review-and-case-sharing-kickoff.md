# Epic: Helping users review a case and share it with the relevant parties as early as possible

## Problems

1. Comms go out manually as a separate task to the review. This means the reviewing lawyer, or someone else, has to create reminder tasks to make sure the next step happens. This is long-winded and unnecessary administration.
2. Reviews are either not done or done badly, and information, evidence or elements are not captured. As a result, the advocate can't do their job properly. It also means advocates have to start early on the day of the hearing to get a grip on the case, effectively doing a review from scratch. That means they're doing two jobs at once, one of which should already have been done.
3. Defendants don't receive the case ahead of trial, which doesn't comply with the rules. It's not clear why, but it's unnecessary - we could build a service that gives the defendant access to their own case and updates them whenever CPS updates the case. Making the case easy to see for the defence also matters strategically: if the prosecution case is clear, the defence won't fight it, and the defendant will plead guilty more quickly - meaning fewer hearings, shorter hearings, and fewer adjournments.
4. Advocates do the review during court, quickly and badly, as a result of the problems above. In an ideal world we'd solve those problems, but we probably have to account for the early stages not being done perfectly and the case still making its way to advocates in court. So we should make it easy for advocates to review in court, by making structured annotations that can be recorded and maintained later.

## What gets shared

- Crown Advocate (internal) - every document with relevant evidence (the bundle, currently one big PDF) - via CMS
- Crown Advocate (external) - as above - via PROSAPP?
- Defence lawyer - as above - via Common Platform
- Court - as above - via [platform unknown]

## What IDPC is

1. A summary of the circumstances of the offence
2. The defendant's interview, if there is one
3. Any evidence we consider material to the plea, to the allocation of the case for trial, or to sentence
4. Previous convictions
5. Victim impact statements, if they exist

## Scope

1. Update the review flow so annotations take into account things like charges, elements, points to prove and disclosure more realistically
2. Build the match and mismatch review scenarios (see Scenarios below)
3. Update the review flow so it clearly explains what will happen as a result of submitting the review - for example, that it will notify the advocate the case has been reviewed, with a link to go and look at it
4. Design a first stab mock-up of what a defendant service might look like
5. Design a first stab mock-up of what an advocate view might look like
6. Design a first stab mock-up of what the case looks like after a review has been submitted (use Rebekah’s Claude mock-up as inspo)

## Scenarios

By charge match:

- Match: the authorised charges (MG04 structured data via DCF) sent by the police match what's already captured in CMS. The reviewing lawyer does a quick, lightweight, happy path review.
- Mismatch: the authorised charges don't match (MG03?), so the case needs a review by CPS. Open question: if the police try to send an MG04 via DCF that doesn't match the captured charges in CMS, can we stop them sending it like we do with auto-triage? If we can't, we'd need to flag it in CPS instead, for a case work assistant or reviewing lawyer to act on manually.

By review history:

- Receiving a charged case that hasn't been reviewed previously
- Receiving a charged case that has been reviewed previously

## Assumptions

1. Even if the police send back a matching MG04, the MG04, alongside any other new material, should still be reviewed
2. Finishing the review is what triggers the "Case X has been updated" email notification (see Research question 5 for whether the charging decision itself could also trigger automatic sharing)
3. A review isn't just the initial review - it's any time something comes in that requires somebody to review it. This can happen at any point; what differs is the content of that review, depending on the state of the system (we need to work out those states)

## Open questions

### Technical

1. When the police send authorised charges, the first hearing date comes with them. Is that part of the structured data we receive via DCF? We want to know whether, once authorised charges are received, a CMS user still has to touch the case to update the hearing date details.

### Research

1. When do defendants first need to be notified of the case details by CPS, and what should they have access to?
2. When do advocates first need to be notified of the case details by CPS, and what should they have access to?
3. When do defence lawyers first need to be notified of the case details by CPS, and what should they have access to?
4. When does the court first need to be notified of the case details by CPS, and what should they have access to?
5. Is there a scenario where the reviewing lawyer makes a decision to charge, but the case isn't ready to share yet? In an ideal world, selecting Decision: Charge is itself the signal that, once the police agree and send back authorised charges, the case is automatically shared with the right people.
6. Could the police ever disagree with the prosecutor's charging decision and send back authorised charges that differ from what the prosecutor suggested? Probably yes.
7. If a police-charged case comes in already charged, and the reviewing lawyer disagrees with the charges on review, what should happen?

## Design notes to consider

- If cases are assessed early and often, every one of those assessments would trigger a notification to the defendant. They'd need at least a clear sentence saying something like "these charges are still being reviewed and may change" - or we decide that's too much information, and only tell defendants once things have settled at specific points (in which case we need to define those points).
- "Prosecutor" is an ambiguous term. Could we use "Reviewing lawyer" and "Advocate" instead (or similar)?

