# Riley: this page or every page?

Prototypes for testing whether people can tell what a change will affect: the page they're on, or every page of the site.

A site's header and footer are shared. Change the phone number in the footer on one page and it changes on all of them; change a heading in the page's own content and it changes only there. In the editor, both look the same: text on a page that you click and type into. People find out which is which afterwards, if they find out at all.

The idea being tested: people understand the scope of a change when shared parts are marked **before** they edit them, better than when it's explained at the moment of the change or not at all.

## The prototypes

| | Prototype | How the header and footer are treated |
| --- | --- | --- |
| A | [Marked before editing](marked.html) | While editing a page, the header and footer are dimmed and labelled "Shown on every page", and clicking their text does nothing. Clicking one offers "Edit header for the whole site" or "Leave it". Going through puts that part into an editing state with a banner, "Editing the header for the whole site. Changes show on every page", dims the page's own content instead, and has a Done button to go back. |
| B | [Ask on the first change](ask.html) | The header and footer look and behave like the rest of the page: no label, no step. The first time something in the header (or the footer) is changed, a dialog asks where the change should apply: "Every page" or "Just this page", with a line on what each means. "Just this page" gives that page its own copy of the header or footer, and other pages keep the old one. The answer is remembered for that part, and shown beside it with a Change link. Change moves the last change to the other answer. |
| C | [Always labelled](site.html) | No step and no question. The header and footer carry a small label that's always there, "Site header" and "Site footer", and the page's own content carries a matching one with its name ("About page"). While you're typing in one, its label adds "the same on every page" or "only on this page". The top bar lists "Whole site: Site header, Site footer" beside "Pages: Home, About, Contact"; choosing Site header or Site footer scrolls to it and highlights it. Text is edited in place, and changes to the header and footer apply everywhere. |

What's the same in all three:

- **The site**: an invented bike repair shop, Pennywheel Bike Repair, with three pages, Home, About and Contact. Every page has the same header (the site's name, a line under it, and a menu of the three pages) and the same footer (address, phone number, opening hours and a copyright line). Each page has its own headings, paragraphs and a picture.
- **The editor**: a top bar with the pages, Preview site and Save, around the page. Click any text to change it; Enter or clicking away finishes, Escape puts it back. Menu items can be renamed the same way.
- **Preview site** shows the site as a visitor sees it, with a menu that works. Back to editing returns to the editor, on the page you ended on.
- **The tasks, the log and the Finished button**, in a bar along the bottom of the editor.
- **The browser tab's title**, "Pennywheel Bike Repair · Site editor", so it doesn't name the prototype. The address still does (`marked.html`, `ask.html`, `site.html`); hide it or use a link shortener if that matters for your test.

Nothing is saved anywhere. Reload the page to start again.

## Facilitator notes

Add `?notes` or `#notes` to the address (`marked.html?notes`) for a panel on the right that participants shouldn't see. It has:

- the five tasks. Tasks 1, 2, 3 and 5 are ticked, with the time, when the site reaches the result; task 4 is ticked if the line under the site name is changed at all, and says where it changed. You can tick and untick any of them yourself.
- counts of edits to the header, the footer and page content, and how many changes to the header or footer were followed by a look at another page, plus what's particular to each prototype: clicks on the marked header or footer and whether the person went through or backed out (A), dialogs shown and the answers (B), and uses of Site header and Site footer in the top bar (C),
- a log of everything, with times since the page opened (or since Reset), and **Copy log** to paste it into your notes,
- A | B | C links to switch prototype, and **Reset**, which puts the site back and clears the log.

The log records every switch of page; every edit, with the part it was in (header, footer, or which page's content), the old and new text, and whether it applied to every page or one; changes given up with Escape, and text that was emptied and put back; opening and leaving the preview and each page visited in it; Save; and Finished.

**"Looked at another page"** is the thing to watch. After each change to the header or footer, the log notes the first time the person looks at a different page from the one they made the change on, in the editor or the preview. Someone who checks another page is either unsure whether the change spread or confirming that it did; ask which. In B, moving a change with the Change link counts as a change too. When they click Finished, the log says how many changes to the header or footer were never checked.

## The completion code

The **Finished** button in the bar at the bottom shows a code to copy into the next question of an unmoderated testing tool, for example `RM-11101-h2-f1-b1-c2.3-g3.2.1-p1.3-v1-s245`. "Keep editing" goes back to the page, and clicking Finished again gives a new code.

| Part | Meaning |
| --- | --- |
| `RM`, `RA`, `RS` | The prototype: A marked, B ask, C always labelled. |
| `11101` | The five tasks when Finished was clicked. Tasks 1, 2, 3 and 5: 1 for reached, 0 for not. Task 1 needs a new phone number on every page, and task 3 needs "Find us" in every page's menu. Task 4 is the line under the site name: 0 not changed, 1 changed on every page, 2 changed on Home only, 3 anything else. |
| `h2-f1-b1` | Edits to the header, the footer and page content. |
| `c2.3` | Changes to the header or footer that were followed by a look at another page, then all changes to the header or footer. In B, moving a change with the Change link counts as one. |
| `g3.2.1` | A only: clicks on the marked header or footer, times the person went through, times they backed out. |
| `q2.1.1.0` | B only: dialogs shown, "Every page" answers, "Just this page" answers, later changes of answer. |
| `w2` | C only: uses of Site header and Site footer in the top bar. |
| `p1.3` | Times the preview was opened, then how many of the three pages were seen in it. |
| `v1` | Clicks on Save. |
| `s245` | Seconds from opening the page to clicking Finished. |

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
   *Watch for:* in A, how they read "Shown on every page" and whether the step feels like help or an obstacle. In B, how they read the dialog and which answer they pick. In C, whether they notice the Site footer label at all. In all three, whether they go and check another page, and whether their answer was right.
2. "On the About page, change the main heading to something friendlier."
   Then: **"Which pages changed?"**
   *Watch for:* whether anyone now thinks a heading is shared too. In A and C, does the difference between the two kinds of thing hold up? In B there's no dialog here; does anyone expect one?
3. "In the menu at the top, 'Contact' should say 'Find us'."
   Then: **"Which pages changed?"**
   *Watch for:* whether what they learned from the footer carries over to the header. In B this is a second dialog, for the header; do they read it or click through?
4. "On the Home page only, the shop wants a different line under its name at the top, something like 'Open late on Thursdays'. Can you do that?"
   Then: **"What happened? What do the other pages show?"**
   *Watch for:* what they expect before they try. In A and C the honest answer is that the header is the same everywhere: can they say so, and say why, from what the editor shows them, or do they change it and not notice it changed on every page? In B it can be done, but the header's answer is already "Every page" from task 3: do they find Change, and do they understand what it did?
5. "Have a look at the site as a visitor would, and tell me whether everything is as you expected."
   *Watch for:* whether they find Preview site, how many pages they visit, and any surprise, especially about the phone number, the menu and the line under the name.

### Questions to close with

- "Some things on this site are the same on every page and some belong to one page. Which are which? How can you tell?"
- "If you changed the opening hours tomorrow, how many places would you have to change them in?"
- In A: "What did 'Shown on every page' tell you? Was the extra click useful or in the way?"
- In B: "What did that question mean? What would have happened if you'd picked the other answer?"
- In C: "Did you notice the labels on the page? What's the difference between Site header and Home page?"

### What to watch for

- **Right answers to "which pages?" before checking.** This is the main measure. Count them per prototype for tasks 1, 2 and 3.
- **Checking another page after a change to the header or footer.** The log and the `c` part of the code count it. Checking and being surprised is a miss; checking and nodding is fine; not checking and answering correctly is the best result.
- **In B, "Just this page" on task 1.** The phone number then differs between pages, which is almost never what a shop wants. See whether they notice, and whether they can fix it.
- **In A, backing out.** People who click the footer, read the offer and leave it may be put off by the step. Ask what they thought it would do.
- **Task 4 changed on every page without the person realising.** The clearest sign that the scope wasn't understood.
- **Hesitation and wording.** Note the words people use for the header and footer ("the top bit", "the banner") and whether the labels match them.

### What would favour each

- **A (marked before editing)**: most people answer "all of them" for tasks 1 and 3 without checking, say in task 4 that the line can't differ on one page and why, and don't mind the extra click. If they answer correctly but grumble about the step, the marking works and the step is too heavy.
- **B (ask on the first change)**: people read the dialog, choose "Every page" for the phone number and the menu, and in task 4 find Change and get a Home-only line without help. It counts against B if people click through without reading, pick "Just this page" for the phone number, or can't predict the header's scope in task 3 because the first dialog was about the footer.
- **C (always labelled)**: people answer as well as in A with no step in the way, and use the words "site header" or "whole site" unprompted. It counts against C if nobody notices the labels and task 4 is changed everywhere without comment.
- **No difference, and wrong answers everywhere**: marking isn't enough on its own, and the next thing to try is showing the other pages changing as the edit is made.

## Running it

Plain HTML, CSS and JavaScript with no build step and nothing loaded from elsewhere: `app.js` and `style.css` are shared, and each page picks its prototype with `data-variant` on `<body>` (`marked`, `ask` or `site`). Serve the repository root with any static server and open `riley/`.

The bike repair shop, its address and phone numbers, and its pages are placeholders.
