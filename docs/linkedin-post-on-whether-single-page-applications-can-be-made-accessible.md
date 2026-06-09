"Can you make single page applications accessible?"

I’ll answer the question in a minute because I need to point out that:

The question isn’t the most helpful one.

For example, take a carousel - can you make it accessible?

Yes - but is it any good?

Probably not.

The same goes for single page apps, except single page apps fundamentally change every single standard/conventional interaction a user has through the interface.

Take a common pattern: a filter panel on the left, results on the right. The user selects some filters and clicks Apply.

With server-side rendering, here's what you get (for free):

- The page refreshes
- The browser's own loading indicator kicks in — a signal every user already understands from every website they've ever used
- Focus goes to the top of the page
- The page title updates
- Screen readers announce all this
- Skip links appear at the top of the page (good for keyboard users)

None of this needs implementing. It's just how web pages and browsers work.

With a single page application, the results update without a page refresh. 

Now as a designer you need to completely change your approach (and some of those things degrade UX to one extent or another).

For example

1. You need to add a custom loading indicator
2. You need to decide where to put that indicator (in the button you clicked, where the new results will update, or both etc)
3. You need to update the UI somehow if the request fails to load or hangs or loses connection
4. You need to announce the state change to screen readers (browsers handle page refreshes in a standard way — any custom announcement will differ from that)
5. You need to decide where to move focus programmatically (more on this next)

If you update the results when clicking ‘Apply filters’ you could move focus to the h1 heading which shows the updated result count.

This seems reasonable but you need to show a focus outline so it’s clear where focus moved. That’s another thing to account for.

Keyboard users also lose out on skip links. In my filter UI I have skip links that not only move to the MAIN section, but to the filters, to the search and to the results. That’s all good for accessibility.

If you update the results when you click a checkbox, then you can’t move focus anywhere, because how do you know the user didn’t want to select multiple filters. Moving focus anywhere else is highly frustrating, confusing and takes control away.

So can you make it accessible - sort of, maybe, yes.

But does it mean it’s better, good, highly user-friendly to all users, including but not limited to users with disabilities and impairments.

No.

You have to remember that cognitive accessibility is probably the biggest accessibility consideration.

It might not show up if you use WCAG as a checklist. But (multiple) spinning indicators, interrupted announcements, multiple parts of the page updating at the same time with non-standard interactions are confusing and stressful. 

That's an accessibility failure even if an audit fails to flag it.

More importantly:

Was all this necessary in the first place?

No.

I’ve tested my filter pattern that uses page refreshes with a lot of users. It works great.

No user in research has given me a compelling reason to switch to Ajax across 8 years and multiple products.

Not to mention that this is just one example.

If you go down the single page app route, you have to consider all this for every single interaction.

99% of the time the result is going to be worse than if you just embraced the standard convention of the web (something you also get for free).

The better question is: why would you choose a technology that makes accessibility this hard?
