# Riley: this page or every page?

Prototypes for testing whether people can tell what a change will affect: the page they're on, or every page of the site.

A site's header and footer are shared. Change the phone number in the footer on one page and it changes on all of them; change a heading in the page's own content and it changes only there. In the editor, both look the same: text on a page that you click and type into. People find out which is which afterwards, if they find out at all.

The idea being tested: people understand the scope of a change when shared parts are marked **before** they edit them, better than when nothing marks them at all.

## The prototypes

| | Prototype | How the header and footer are treated |
| --- | --- | --- |
| 0 | [Control](plain.html) | The header and footer look and behave like the rest of the page: no label, no step. Text is edited in place, and changes to the header and footer apply everywhere without saying so. This is the baseline the other two are compared with. |
| A | [Shown on hover](marked.html) | The header and footer look like the rest of the page until the pointer is over one. Then it's outlined and labelled "Shown on every page", with an "Edit header" (or "Edit footer") button. One click anywhere on it unlocks it: a banner says "Editing the header for the whole site. Changes show on every page", and its text can be changed. It locks again as soon as the person clicks or types anywhere else, or presses Done. On a touch screen, where there's no hover, the first tap shows the label and the second unlocks. |
| C | [Always labelled](site.html) | No lock and no question. The header and footer carry a small label that's always there, "Site header" and "Site footer", and the page's own content carries a matching one with its name ("About page"). While you're typing in one, its label adds "the same on every page" or "only on this page". The top bar lists "Whole site: Site header, Site footer" beside "Pages: Home, About, Contact"; choosing Site header or Site footer scrolls to it and highlights it. Text is edited in place, and changes to the header and footer apply everywhere. |

Changes after a first review:

- **A** used to dim the header and footer all the time and open a popup with "Edit header for the whole site" and "Leave it" before anything could be changed. That was too heavy a step. The message and the button now appear on hover, and one click unlocks.
- **B, ask on the first change**, was dropped. It asked "Every page" or "Just this page" after the first change to the header or footer. The question came too late, once the change was already made, and it wasn't clear which part of the page it was about. Asking may suit style changes better than changes to words; that's a separate idea to test. The code is in this folder's history.
- **The control** was added, so the test can tell whether marking helps at all, not only which marking people prefer.

What's the same in all three:

- **The site**: an invented bike repair shop, Pennywheel Bike Repair, with three pages, Home, About and Contact. Every page has the same header (the site's name, a line under it, and a menu of the three pages) and the same footer (address, phone number, opening hours and a copyright line). Each page has its own headings, paragraphs and a picture.
- **The editor**: a top bar with the pages, Preview site and Save, around the page. Click any text to change it; Enter or clicking away finishes, Escape puts it back. Menu items can be renamed the same way.
- **Preview site** shows the site as a visitor sees it, with a menu that works. Back to editing returns to the editor, on the page you ended on.
- **The tasks, the log and the Finished button**, in a bar along the bottom of the editor.
- **The browser tab's title**, "Pennywheel Bike Repair · Site editor", so it doesn't name the prototype. The address still does (`plain.html`, `marked.html`, `site.html`); hide it or use a link shortener if that matters for your test.

Nothing is saved anywhere. Reload the page to start again.

## Facilitator notes

Add `?notes` or `#notes` to the address (`marked.html?notes`) for a panel on the right that participants shouldn't see. It has:

- the five tasks. Tasks 1, 2, 3 and 5 are ticked, with the time, when the site reaches the result; task 4 is ticked if the line under the site name is changed at all. You can tick and untick any of them yourself.
- counts of edits to the header, the footer and page content, and how many changes to the header or footer were followed by a look at another page, plus what's particular to each prototype: how often "Shown on every page" appeared and how often the person unlocked (A), and uses of Site header and Site footer in the top bar (C). The control has nothing of its own to count.
- a log of everything, with times since the page opened (or since Reset), and **Copy log** to paste it into your notes,
- 0 | A | C links to switch prototype, and **Reset**, which puts the site back and clears the log.

The log records every switch of page; every edit, with the part it was in (header, footer, or which page's content) and the old and new text; changes given up with Escape, and text that was emptied and put back; opening and leaving the preview and each page visited in it; Save; and Finished. In A it also records each time the label appeared (the pointer rested on the header or footer for a moment, or it was tapped), each unlock, and what locked it again.

**"Looked at another page"** is the thing to watch. After each change to the header or footer, the log notes the first time the person looks at a different page from the one they made the change on, in the editor or the preview. Someone who checks another page is either unsure whether the change spread or confirming that it did; ask which. When they click Finished, the log says how many changes to the header or footer were never checked.

## The completion code

The **Finished** button in the bar at the bottom shows a code to copy into the next question of an unmoderated testing tool, for example `RM-11101-h2-f1-b1-c2.3-g4.2-p1.3-v1-s245`. "Keep editing" goes back to the page, and clicking Finished again gives a new code.

| Part | Meaning |
| --- | --- |
| `RP`, `RM`, `RS` | The prototype: the control, A shown on hover, C always labelled. |
| `11101` | The five tasks when Finished was clicked. Tasks 1, 2, 3 and 5: 1 for reached, 0 for not. Task 1 needs a new phone number, and task 3 needs "Find us" in the menu. Task 4 is the line under the site name: 0 not changed, 1 changed, which changes it on every page. |
| `h2-f1-b1` | Edits to the header, the footer and page content. |
| `c2.3` | Changes to the header or footer that were followed by a look at another page, then all changes to the header or footer. |
| `g4.2` | A only: times "Shown on every page" appeared (the pointer rested there, or a tap), then times the person unlocked. |
| `w2` | C only: uses of Site header and Site footer in the top bar. |
| `p1.3` | Times the preview was opened, then how many of the three pages were seen in it. |
| `v1` | Clicks on Save. |
| `s245` | Seconds from opening the page to clicking Finished. |

The control's code has no part of its own, so it is one part shorter.

## Running a test

Each prototype opens in a desktop browser with no sign-in. Reload between participants (or use Reset in the notes panel).

### Who

People who run, or are about to make, a small site: a business, a club, a portfolio. Not developers, and not people who already know how site builders share headers and footers. Five or six per prototype finds the big problems.

### Design

One prototype per participant, since the first one teaches that the header and footer are shared, and that carries over to the next. Change the order you run them in from day to day.

**Don't say "header", "footer", "shared" or "every page" before they do.** The tasks describe what the business wants, not where it is on the page. Ask the question after each task before they look at any other page, then let them check if they want to.

Start with: "This is the website of a bike repair shop, Pennywheel Bike Repair, in the editor that changes it. It has three pages. The owner has asked you to make a few changes. Please think aloud as you go. There are no wrong answers; we're testing the design, not you."

### Tasks

1. "The shop's phone number has changed to 01632 960 852. Update it."
   Then, before they look anywhere else: **"Which pages will show the new number?"**
   *Watch for:* in A, whether they read "Shown on every page" before they click or click straight through it, and whether the unlock feels like help or an obstacle. In C, whether they notice the Site footer label at all. In the control, what they assume with nothing to go on. In all three, whether they go and check another page, and whether their answer was right.
2. "On the About page, change the main heading to something friendlier."
   Then: **"Which pages changed?"**
   *Watch for:* whether anyone now thinks a heading is shared too. In A and C, does the difference between the two kinds of thing hold up? In A, the footer locks again when they start on the heading; does anyone notice or mind?
3. "In the menu at the top, 'Contact' should say 'Find us'."
   Then: **"Which pages changed?"**
   *Watch for:* whether what they learned from the footer carries over to the header.
4. "On the Home page only, the shop wants a different line under its name at the top, something like 'Open late on Thursdays'. Can you do that?"
   Then: **"What happened? What do the other pages show?"**
   *Watch for:* what they expect before they try. The honest answer in all three is that the header is the same everywhere: can they say so, and say why, from what the editor shows them, or do they change it and not notice it changed on every page?
5. "Have a look at the site as a visitor would, and tell me whether everything is as you expected."
   *Watch for:* whether they find Preview site, how many pages they visit, and any surprise, especially about the phone number, the menu and the line under the name.

### Questions to close with

- "Some things on this site are the same on every page and some belong to one page. Which are which? How can you tell?"
- "If you changed the opening hours tomorrow, how many places would you have to change them in?"
- In A: "What did 'Shown on every page' tell you? Was the click to edit useful or in the way?"
- In C: "Did you notice the labels on the page? What's the difference between Site header and Home page?"
- In the control: "Was there anything on the page that told you which changes would show on other pages?"

### What to watch for

- **Right answers to "which pages?" before checking.** This is the main measure. Count them per prototype for tasks 1, 2 and 3, and compare A and C with the control.
- **Checking another page after a change to the header or footer.** The log and the `c` part of the code count it. Checking and being surprised is a miss; checking and nodding is fine; not checking and answering correctly is the best result.
- **In A, clicking through without reading.** The label is only there while the pointer is. Someone who clicks the phone number straight away has unlocked the footer before reading anything; the banner is then the only thing telling them. Ask what they saw.
- **Task 4 changed on every page without the person realising.** The clearest sign that the scope wasn't understood.
- **Hesitation and wording.** Note the words people use for the header and footer ("the top bit", "the banner") and whether the labels match them.

### What would favour each

- **A (shown on hover)**: most people answer "all of them" for tasks 1 and 3 without checking, say in task 4 that the line can't differ on one page and why, and don't mind the click. If they answer correctly but grumble about the click, the marking works and the lock is still too heavy.
- **C (always labelled)**: people answer as well as in A with no lock in the way, and use the words "site header" or "whole site" unprompted. It counts against C if nobody notices the labels and task 4 is changed everywhere without comment.
- **The control**: people answer as well as in A and C. Then marking isn't what helps, and neither is worth building.
- **No difference, and wrong answers everywhere**: marking isn't enough on its own, and the next thing to try is showing the other pages changing as the edit is made.

A and C aren't exclusive. If each helps in a different way (A makes people stop, C gives them the words), the next round can put C's labels and A's lock together.

## Running it

Plain HTML, CSS and JavaScript with no build step and nothing loaded from elsewhere: `app.js` and `style.css` are shared, and each page picks its prototype with `data-variant` on `<body>` (`plain`, `marked` or `site`). Serve the repository root with any static server and open `riley/`.

The bike repair shop, its address and phone numbers, and its pages are placeholders.
