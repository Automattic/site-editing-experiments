# Vermeer: from looking at your site to changing it

Prototypes for testing how people get from looking at their site to changing it.

The [Create not Learn](https://github.com/Automattic/create-not-learn-editor) prototype opens a page "on view": the site as visitors see it, with links that work. To change it, you press **Edit** in the toolbar above it. Someone who has just made their first site may not know to look there: they may click the heading they want to change, see nothing happen, and click again somewhere else.

The idea being tested: new users find their way into editing faster, and with fewer wrong turns, if the site itself responds to their first click or hover, than if they have to find an Edit button.

## The prototypes

| | Prototype | How you get from looking at the site to changing it |
| --- | --- | --- |
| 0 | [Control](control.html) | Only the **Edit** button in the toolbar, as Create not Learn has today. Clicking the site does what a visitor's click does: links go to their page, buttons work, boxes can be typed in, and a click anywhere else does nothing. This is the baseline the others are compared with. |
| A1 | [Click to edit](click-to-edit.html) | A click on anything that isn't a link, a button, a box or a box's label goes straight into editing, with what was clicked ready: in text, the caret goes where the person clicked; on a picture or a background, the section around it is outlined and nothing has a caret. Links, buttons and boxes work as usual. A click that ends a drag to select text does nothing. |
| A2 | [Ask on click](ask-on-click.html) | The same click opens a small box at that spot: "Do you want to edit?", with **No** and **Edit** (Edit is the main button, and has focus when the box opens). A double click asks once. Edit lands as A1 does. No, or Escape, closes it. A click somewhere else, scrolling the site or going to another page closes it too, and that other click does what it would have done (another click on a plain spot opens the box again there). It asks every time. |
| B | [Hover notice](hover-notice.html) | When the pointer rests on the site for half a second, a notice appears over the bottom of the site, centred, without moving it: "Trying to change something on this page?" with **Start editing** and a ×. It stays while the pointer (or keyboard focus) is in the site, and goes a second after both have left. Start editing goes into editing with nothing selected, as the Edit button does. The × closes it until the person has next been into editing and come out again, even if the page is reloaded. Keyboard focus moving into the site shows it too, with Start editing next in the Tab order and the notice announced. |
| C | [Choose on click](choose-on-click.html) | Every click on the site opens a box at that spot with two choices, side by side: first what the click would have done, then editing. On a link to another page: "Go to" and the page's name ("Go to Events", "Go to Home"), and on a link further down the same page ("Get directions"): "Follow this link"; on a button: "Use this button"; on a box: "Fill in this box"; anywhere else: "Keep looking". The second choice is "Edit this" on anything with words and "Edit this page" on a picture or a background. Choosing the first does it; Edit this lands as A1 does, with the caret in the link's or button's words. Pressing Enter or Space on a link or button asks too; moving into a box with Tab doesn't, and clicking in a box you're already typing in doesn't. Clicking a box's label asks "Fill in this box" too. Pressing Enter in a box sends its form without asking. A double click asks once. It asks every time. |
| D | [Hover choice](hover-choice.html) | When the pointer rests on the site for half a second, a pale layer covers it with "What would you like to do?" and two large buttons, **Edit** and **Browse**. Edit goes into editing with nothing selected. Browse closes it until the person has next been into editing and come out again, even if the page is reloaded. If the pointer leaves the site before a choice, it goes, and comes back on the next rest. Nothing behind the layer can be reached while it shows. Keyboard focus moving into the site shows it too, with focus on Edit; Tab moves between the two buttons and Escape is Browse. |

Every arm keeps the control's Edit button, in the same place, and only adds its own way in. So each differs from the control in one thing, and every arm has the same way in by keyboard.

What's the same in all six:

- **The site**: an invented independent bookshop with a café corner, Cobble Lane Books, with three pages, Home, Events and Contact. Every page has the same header (the shop's name, which goes to Home, a menu of the three pages, and a "Join the book club" button that opens a small sign-up panel) and the same footer (address, phone number, "Open every day exept Mondays" with its spelling mistake, a "How to find us" link, a newsletter sign-up and a copyright line). Home has a big heading, an introduction with a link to Events, a "See what's on" button that goes to Events, a picture, three book picks and a café section. Events lists three events, each with a "Book a place" button that changes to "Place booked ✓". Contact has the opening hours, a contact form, and a "Get directions" link to a map lower down. Forms answer on the page ("Thanks, you're on the list.") and nothing leaves the prototype.
- **Looking at the site ("browse")**: a panel on the left with the site's name and Create not Learn's tip, "Tip: follow links to look around your site, and press Edit to change the page you're on." Above the site: back and forward arrows for the pages visited, the page's name in the middle (click it to go to another page), a screen-size icon that does nothing, and the blue **Edit** button ("Change this page"). Nothing is laid over the site.
- **Changing it ("edit")**: Edit opens the page you're on to change. The left panel goes and the site gets wider. The toolbar has Undo and Redo, the page's name (still a way to other pages), **Exit** and **Save**, which is grey until there's something to save. Clicking any words (headings, paragraphs, the menu, buttons, links, form labels) puts the caret there. Links and buttons don't work while editing, boxes can't be typed in, and pictures can't be changed (a click outlines them). Enter finishes; Escape puts the words back as they were when you clicked in. Escape doesn't leave editing; only Exit does.
- **Save** saves every change, on every page, and says "Saved". The site, when you look at it, shows only saved changes.
- **Exit** goes back to looking at the same page. If there are unsaved changes it asks first: "Save your changes?", "Your site only shows saved changes, so unsaved ones won't appear there.", with Save, Discard and Keep editing.
- **The Finished button**, in a bar along the bottom, which asks "Have you done every task?" before it shows the code.
- **The browser tab's title**, "Cobble Lane Books · Your website", so it doesn't name the prototype. The address still does (`control.html`, `click-to-edit.html`, `ask-on-click.html`, `hover-notice.html`, `choose-on-click.html`, `hover-choice.html`).

Unlike earlier experiments here, **a reload doesn't start again**. Everything is kept in the browser (the saved site, unsaved changes, editing or not, the page and the back and forward history, the log, the counts and the time since first opening), separately for each prototype, so someone who reloads by accident carries on where they were. **Reset** in the notes panel starts again.

## Decisions

- **Every arm keeps the Edit button.** The question is whether adding a way in through the site helps, not whether it can replace the button. Keeping it means each arm is the control plus one thing, everyone has the same keyboard route, and the log shows which way each person actually went in.
- **Touch.** On a touch screen there's no hover, so the first touch on the site stands in for it: it shows what hovering would and does nothing else. After that, taps work as usual. This is the same for B and D. In D, a touch on the site shows the layer each time until Browse is chosen, just as hovering does. The prototypes are for desktop tests; the rule is there so a tablet doesn't break them.
- **Exit asks about unsaved changes.** Create not Learn's Exit throws unsaved changes away without asking. Here, two of the five tasks are about looking at the site, so people will leave editing in the middle of the test; losing their earlier changes there would swamp everything else the test measures. The dialog is the same in every arm.
- **Clicks go straight to the words.** Create not Learn's editing selects the section first and the words on a later click. That's tested in [Utrillo](../utrillo/). Here a click puts the caret in the words straight away, in every arm, so the only difference between arms is how people get into editing, not what happens once they're in.
- **The left panel only has the tip.** Create not Learn's panel also has a checklist; its items would be dead ends here.
- **B's notice sits at the bottom of the site, not the top**, so it never covers the menu (task 4) or the header. While it shows, the footer gets extra space at its bottom, so its last line (the one with the spelling mistake in task 3) can still be scrolled clear of the notice and clicked.
- **One tab per prototype.** Everything is kept in the browser per prototype, so two tabs of the same one would overwrite each other. The tab that saved last is the one that counts: when another tab of the same prototype saves (or is Reset), the first stops saving and says "This website is open in another tab", with "Carry on here", which reloads it from what the other tab saved. A second tab logs "Opened again in another tab". To keep people in one tab, the site's links can't be opened in a new one: a middle click on a link does nothing, Ctrl or Cmd with a click follows it in the same tab, and links have no right-click menu and can't be dragged.
- **Smaller things.** Every bit of text is one line: Enter finishes it, in paragraphs too. There's no Document Overview button. The screen-size icon is there because Create not Learn has it, and does nothing. B and D wait half a second (`HOVER_REST_MS`, the same for both), and react only to a pointer that has moved on the site and then rested: a pointer that happened to be over the site when the page loaded doesn't count until it moves, and scrolling starts the wait again. Neither shows while the page list or a dialog is open. A click on D's pale layer outside its buttons does nothing; it's counted in the notes.

## Facilitator notes

Add `?notes` or `#notes` to the address (`hover-notice.html?notes`) for a panel on the right that participants shouldn't see. It has:

- the five tasks, ticked with the time when the site reaches the result, and unticked if it's undone. Task 4 shows how many of the three menu links have been followed (2/3), and task 2 how Contact was reached. The tick boxes are yours to use as you like; they don't change the code.
- counts: seconds to the first time in editing and by which way; clicks on the site that did nothing, before then and in all; times into editing by each way; Exits; accidental entries; prompts shown, and how each ended; links followed and buttons used while looking at the site (and how many through C's box); page switches; Saves; edits; undos and redos; and Escapes,
- a log of everything, with times since the page was first opened, and **Copy log**,
- 0 | A1 | A2 | B | C | D links to switch prototype, and **Reset**, which starts again.

The log records every time someone goes into editing (which way, and what was made ready: "Home heading, caret where clicked", "the section … outlined", or nothing) and out again (whether anything was changed in that visit, whether it was saved, and what they chose in the Exit dialog); every click that did nothing; every link followed and button used, and which way pages were changed (the menu, the shop's name, a link in the text, the address bar, the arrows, a link in the footer); every prompt shown and how it ended; every edit, with the page and the old and new words; Escapes, undo, redo and Save; reloads; and Finished.

What the counts mean:

- **A click that does nothing** is a click while looking at the site on anything that isn't a link, a button, a box or a box's label, or inside one. In the control it does nothing; in A1, A2 and C it's what starts their own route. A click that ends a drag to select text isn't counted, nor is a touch that stands in for hover in B and D. A double or triple click counts once, in every arm.
- **Prompts** are A2's box, B's notice, C's box and D's layer. Each one shown ends one way: **accepted** (chose to edit), **dismissed** (No, ×, Browse, Escape, Keep looking), **followed** (C only: chose the link, button or box; counted with dismissed in the code) or **ignored** (went away with no choice: the pointer left, a click elsewhere, a scroll, a page change, going into editing another way, a reload). B's notice stays when the page changes or the site scrolls; D's layer goes when the page changes.
- **An accidental entry** is a time into editing that ended with Exit and no change made in it.

## The completion code

The **Finished** button gives a code to copy into the next question of an unmoderated testing tool, for example `VA1-10111-f12.4a-n3-p0.0.0.0-l5.2-x1-b2-s245`. "Keep editing" goes back to the site, and clicking Finished again gives a new code.

| Part | Meaning |
| --- | --- |
| `V0`, `VA1`, `VA2`, `VB`, `VC`, `VD` | The prototype: the control, A1 click to edit, A2 ask on click, B hover notice, C choose on click, D hover choice. |
| `10111` | The five tasks when Finished was clicked: 1 done, 0 not. 1: the saved Home heading is different. 2: the opening hours were at least half in view on Contact while looking at the site (not while editing). 3: the saved footer says "except" and not "exept". 4: each of the three menu links was followed while looking at the site. 5: the saved "See what's on" button says something else. |
| `f12.4a` | Seconds from first opening to the first time in editing, then how: `e` the Edit button (by pointer or keyboard), `a` the prototype's own way (A1's click, A2's Edit, B's Start editing, C's Edit this, D's Edit). `fx` if they never went in. |
| `n3` | Clicks that did nothing (in the control's terms: not on a link, button or box) before the first time in editing. In A1, A2 and C this includes the click that opened their route. |
| `p4.1.2.1` | Prompts shown, accepted, dismissed (with C's followed), ignored. Always `p0.0.0.0` in the control and A1, which have none; the part is kept so codes line up. |
| `l5.2` | Links followed and buttons used while looking at the site. |
| `x1` | Accidental entries: times into editing that ended with Exit and no change. |
| `b2` | Exits back to looking at the site. |
| `s245` | Seconds from first opening to clicking Finished. |

## Running a test

Each prototype opens in a desktop browser with no sign-in. **Use Reset in the notes panel between participants**: reloading keeps everything.

### Who

People who are about to make, or have just made, their first website: a small business, a club, a portfolio. Not developers, and not people who have used WordPress or another site builder's editor before.

### Design

One prototype per participant, since once someone has found the way into editing they know it. Change the order you run them in from day to day.

[Pollock](../pollock/) found that groups of five or six can't separate designs like these. With six arms, use small groups to find problems with the prototypes and the script, and plan for about 20 people per arm for a result, or test fewer arms against the control.

**Don't say "edit", "editing", "change mode", "browse" or "click on it" before they do.** The tasks say what the owner wants done, not how. Don't point at the toolbar.

Start with: "This is the website of a small bookshop, Cobble Lane Books, open in the tool you'd use to change it. Imagine it's your shop and your website. I'll ask you to do a few things with it. Please think aloud as you go. There are no wrong answers; we're testing the design, not you."

### Tasks

1. "You'd like a different main heading on the home page. Change it to something of your own, so that people visiting your website will see it."
   *Watch for:* the first thing they do. In the control, do they click the heading, and how many times, before they find Edit? In A1, the click on the heading goes straight in: is that a surprise, welcome or not? In A2, do they read the question or click No out of habit? In B and D, do they see the notice or the layer before they click, and what do they make of it? In C, the box appears on the first click: which choice? In all six, do they save, and do they notice they need to?
2. "A customer has rung to ask when you're open on Sundays. Find the opening hours on your website."
   *Watch for:* whether they leave editing first (Exit) or look for the hours while still in it; seeing them while editing doesn't tick the task. Which way they get to Contact. In B and D, does the notice or layer come back after they've been editing, and does it get in the way?
3. "There's a spelling mistake in the line about opening days at the very bottom of the page. Fix it so your visitors see it right."
   *Watch for:* how they get back into editing the second time, and whether it's faster than the first. In A1, A2 and C, a click on the footer line is the shortest way. Do they save?
4. "Check that the menu at the top of your website works. Try each item."
   *Watch for:* whether they're still in editing, where the menu does nothing, and what they make of that. In A1, clicks on the menu work, but a click beside them goes into editing: count accidental entries. In C, every click asks first: do they choose "Go to …" each time, or get annoyed? In B, the notice comes back each time they rest on the site until they close it: do they close it, or does it get in the way?
5. "Change the words on the 'See what's on' button to something else."
   *Watch for:* the hard case: the button is a link and its words can be changed. In the control, B and D, they need to be editing first, then click the words. In A1 and A2, clicking the button goes to the Events page, because it's a link: do they work out how to change it? In C, the box offers "Go to Events" or "Edit this": which do they choose?

### Questions to close with

- "How did you get from looking at your website to changing it? How did you know?"
- "Was anything confusing or surprising when you clicked on your website?"
- "When you were changing things, how did you know whether visitors would see your changes?"
- In A1: "When you clicked on the heading, what happened? Was that what you expected?" And: "Did you ever end up changing the page when you only meant to look?"
- In A2: "A small box asked whether you wanted to edit. Was that useful, or in the way?"
- In B: "Did you notice the message near the bottom of the page? What did it tell you?" If yes: "Did it get in the way at any point?"
- In C: "Every click gave you two choices. How did that feel after a while?"
- In D: "When the choice between Edit and Browse appeared, what did you think it was for?"
- In the control: "If you'd clicked on the heading and it had let you change it straight away, would that have been better or worse?"

### What to watch for

- **Time to first editing, and the way in.** The `f` part. This is the main measure: compare each arm with the control, and check that the arm's own way (`a`) is the one people used. If most people in an arm still went in by the Edit button, the arm's own way didn't help, whatever the time.
- **Clicks that did nothing before.** The `n` part. In the control this is the wasted effort the arms are meant to remove. In A1, A2 and C the click that starts the arm's own route is one of them, so `n1` is the least there when that's how someone went in; more means clicks whose question they turned down (No or ignored in A2, Keep looking in C). In A1 every such click goes in, so it's always `n1` there unless they went in by the Edit button first.
- **Accidental entries.** The `x` part. The cost of A1 especially: every click beside a link while browsing goes into editing.
- **Prompts dismissed and ignored.** The `p` part. A prompt that's mostly dismissed or ignored is noise.
- **Getting the browse tasks done.** Tasks 2 and 4, and the `b` part. An arm that gets people into editing faster but leaves them stuck there, or keeps pulling them back in, is worse.
- **The words.** Note what people call looking and changing ("view mode", "the live site", "editing", "the back end") and whether the arms' words ("Start editing", "Edit this", "Keep looking", "Browse") match them.

### What would favour each

Each arm's cost has two sides: what it does to people while they're only looking at their site, and what it would take to build and keep in the real editor.

- **A1 (click to edit)**: the shortest time to first editing (`f…a`), `n` near 0, and no more accidental entries (`x`) or failed browse tasks than the control. It counts against A1 if people land in editing by surprise while trying to look (task 2 and 4), or if task 5 goes worse because the button follows its link. It's the cheapest to explain but changes what a click on your own site means, which a real editor would have to make clear everywhere the site is shown.
- **A2 (ask on click)**: nearly A1's speed, with fewer accidental entries, and most prompts accepted the first time. It counts against A2 if people click No without reading, or find the question tiresome during the browse tasks (many dismissed). Cheap to build; the cost is an extra step every time.
- **B (hover notice)**: people see the notice before they click, press Start editing, and the × keeps it away while they browse. It counts against B if it's ignored (many ignored), if it covers what people are trying to look at or click, or if people don't notice it at all and still click around (`n` like the control). Cheap to build; on touch screens it relies on the first-touch rule.
- **C (choose on click)**: people choose Edit this on the first click and land where they wanted, task 5 included. It counts against C if the box on every link and button slows the browse tasks (`l` with many via the box) or annoys people, or if they choose "Keep looking" and then don't know where to go. The most intrusive while browsing, and the most work to build well, since every link, button and box on the site has to be wrapped.
- **D (hover choice)**: people choose Edit straight away and the Browse choice is rarely needed. It counts against D if people feel blocked from looking at their own site, or choose Browse and then can't find the way in. It covers the whole site, so it's the most likely to annoy people who only want to look.
- **The control**: people find the Edit button as quickly as the others get in, with few clicks that do nothing. Then the button is enough, and none of the others is worth building.

Some of these could be combined. If B or D helps people see that there's a way in and A2 or C helps them take it, a next round can put the two together.

## Running it

Plain HTML, CSS and JavaScript with no build step and nothing loaded from elsewhere: `app.js` and `style.css` are the shared site and editor, and each prototype page sets `data-variant` on `<body>` (`control`, `click-to-edit`, `ask-on-click`, `hover-notice`, `choose-on-click` or `hover-choice`). The control is `app.js` and `style.css` alone; each of the other five also loads its own script and stylesheet from `variants/`. The arms' names and code prefixes are in the `VARIANTS` table in `app.js`, so a code is right even if an arm's script fails. The arms use only the small API `app.js` exposes as `window.Vermeer`, documented at the top of `app.js`: what was clicked and whether it's a link, button or box; going into editing by a named way, with the caret at a point; doing what a click would have done; recording prompts and their outcomes; and a little state of their own that survives a reload. Everything is kept in `localStorage` under `vermeer:<variant>`. Serve the repository root with any static server and open `vermeer/`.

`node vermeer/e2e/smoke.mjs` runs every prototype in headless Chrome with Playwright (set `NODE_PATH` to where Playwright is installed if it's installed globally). It starts its own server, checks that each prototype loads without errors, does all five tasks in the control by the Edit button and checks the ticks, the counts and the code, checks that a reload puts everything back (looking at the site, and editing with an unsaved change), the Exit dialog's three choices, Reset, the API the arms use, and the layout at 1024×768. It then runs `vermeer/e2e/<arm>.mjs` for each arm that has one, which test that arm's own way in, its prompt outcomes, its code parts and its keyboard route.

The bookshop, its address and phone number, its events, books and people are placeholders.
