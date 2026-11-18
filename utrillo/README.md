# Utrillo: selecting the section around what you clicked

Prototypes for testing how people select a parent block: the Group, Columns, Column or Cover around the paragraph or picture they clicked.

People click the thing they can see, and the editor selects that block, the innermost one. To move the whole section, change its background or delete a column, they need the block around it. The editor has several ways to get there, but each one has to be found after the click: a button in the toolbar, the same in a menu, a breadcrumb under the canvas, Document Overview, or a click on the section's own padding.

The idea being tested: people select the container around what they clicked more often when it's offered on the canvas where they're pointing than when they have to find a button after selecting what's inside.

## The prototypes

| | Prototype | How the section around a block is selected |
| --- | --- | --- |
| 0 | [Control](control.html) | As the WordPress editor is today. A click selects the innermost block. To get to its parent: the toolbar's **Select parent block** button (the parent's icon, one level per click), **Select parent block (Group)** in the ⋮ menu, the **breadcrumb** under the canvas, **Document Overview**, or a click on a container's own area (its padding, the gap between columns, a column's empty space). This is the baseline the others are compared with. |
| A | [Hover tab](hover-tab.html) | Pointing at the page outlines every container under the pointer, from the section inwards, each with a small blue tab with its name ("Group", "Columns", "Column", "Cover"), side by side like a breadcrumb. Clicking a tab selects that container. The tabs follow the pointer, whatever is selected, and a section's tab stays at the top of the canvas while the top of the section is scrolled out of view. |
| B | [Section first](section-first.html) | Clicks go from the outside in, as in section-based editors. The first click on a section selects the whole section. The next click inside it selects the column under the pointer, if there is one, and the next reaches the block, with the caret where you clicked. A double click goes straight to the text (and, as in the editor, selects the word under the pointer). Escape steps back out a level at a time. The hover outline shows what the next click will select. |
| D | [Layers](layers.html) | Each section has a **Layers** button at its top-right corner, shown while the pointer is over the section and while something in it is selected. Like A's tabs, it stays in view at the top of the canvas when the top of the section is scrolled away. It opens a list of everything in that section, nested; clicking a row selects that block. |

A, B and D all keep every one of the control's ways to a parent, so each differs from the control in one thing.

A fourth idea, C, a labelled "Select Columns" button beside the toolbar in place of the parent's icon, was left out before building: it's the cheapest change but the least likely to be found, since it still needs the block inside selected first.

What's the same in all four:

- **The page**: an invented yoga studio, Fernhill Yoga, one page in the editor. A Cover with the studio's name; an About section (a Group with two Columns, a picture and some text); a Classes section (a Group with a heading and three Columns, each with a picture, a heading and a short description); an Opening hours section (a Group with a heading and a paragraph); and a contact line. Blocks have the editor's own names and icons (Group, Columns, Column, Cover, and headings by level, "Heading 2"; the icons are copied from the current @wordpress/icons), with no custom names, as when a pattern is inserted.
- **The editor**: a top bar with Document Overview, Undo and Redo; the canvas; the block inspector on the right, open, as in the editor; and the breadcrumb under the canvas. The block toolbar floats above the selected block as in the editor: Select parent block in its own box on the left, with a gap before the toolbar, then the block's icon, the move arrows and the ⋮ menu (Duplicate, Add before, Add after, Select parent block, Delete). The inspector has a Background colour for Groups, Columns (each column), Headings and Paragraphs (Paragraphs and Headings have one in the editor too, which is the trap in task 3), an Overlay colour for the Cover, and a Columns count for the Columns block (lowering it removes the last column, as in the editor).
- **Moving**: by the move arrows only. There's no drag handle in any of them, so dragging doesn't get in the way of what's being tested. [Pollock](../pollock/) tests dragging.
- **The Finished button**, in a bar along the bottom, which asks "Have you done all four tasks?" before it shows the code.
- **The browser tab's title**, "Fernhill Yoga · Editor", so it doesn't name the prototype. The address still does (`control.html`, `hover-tab.html`, `section-first.html`, `layers.html`).

Nothing is saved anywhere. Reload the page to start again.

## Facilitator notes

Add `?notes` or `#notes` to the address (`hover-tab.html?notes`) for a panel on the right that participants shouldn't see. It has:

- the four tasks, ticked with the time when the page reaches the result, and unticked if it's undone. You can tick and untick them yourself.
- counts of container selections by route: the toolbar button, the ⋮ menu, the breadcrumb, Document Overview, a click on a container's own area, and the prototype's own (tab clicks in A, clicks that stop at a section or column in B, Layers rows in D); wrong targets; undos; clicks before the caret first landed in the Monday description; seconds to each task; and what's particular to each prototype: tabs shown (A), Escape steps out and double click first presses (B), Layers opened and rows picked (D).
- a log of everything, with times since the page opened (or since Reset), and **Copy log**,
- Control | A | B | D links to switch prototype, and **Reset**, which puts the page back and clears the log.

The log records every selection (which block, how, and what was selected before), every change (text before and after, moves, deletes, duplicates, colours, the column count), undo and redo, Document Overview opened and closed, the ⋮ menu opened, each prototype's own events, and Finished.

**Wrong targets** are the thing to watch. They are the moments someone acted on the block they could see when they meant the section around it:

- moving a block inside its section, such as the Classes heading or the columns, during task 2,
- giving a heading or paragraph a background, or another section, before task 3 is done,
- deleting the Saturday picture, heading or description on their own, or another column, during task 4, and leaving the Saturday column empty.

Only blocks the page started with count: deleting something the person added themselves, or adding a column and taking it away again, isn't a wrong target.

## The completion code

The **Finished** button gives a code to copy into the next question of an unmoderated testing tool, for example `UA-1101-r2.0.1.0.3.4-x1-u0-k3-s245`. "Keep editing" goes back to the page, and clicking Finished again gives a new code.

| Part | Meaning |
| --- | --- |
| `UC`, `UA`, `UB`, `UD` | The prototype: the control, A hover tab, B section first, D Layers. |
| `1101` | The four tasks when Finished was clicked: 1 done, 0 not. |
| `r2.0.1.0.3.4` | Container selections by route: the toolbar button, the ⋮ menu, the breadcrumb, Document Overview, a click on a container's own area, then the prototype's own (always 0 in the control). In B this counts every click that stops at a section or a column, including the clicks on the way into text, so every B participant has several; see below. |
| `x1` | Wrong targets. |
| `u0` | Undos. |
| `k3` | Clicks on the canvas before the caret first landed in the Monday description, for task 1 (`kx` if it never did). Only presses on the page count, not on A's tabs, D's Layers button or the grey around the page. In B the first click on a section only selects the section, so this is where B's cost shows. |
| `s245` | Seconds from opening the page to clicking Finished. |

## Running a test

Each prototype opens in a desktop browser with no sign-in. Reload between participants (or use Reset in the notes panel).

### Who

People who run, or are about to make, a small site: a business, a club, a portfolio. Not developers, and not people who have used WordPress before.

### Design

One prototype per participant, since what someone learns about selecting a section in one carries over to the next. Change the order you run them in from day to day.

[Pollock](../pollock/) found that groups of five or six can't separate designs like these: the control moved more between rounds than any design differed from it. Plan for about 20 people per prototype for a result, or use small groups only to find problems with the test.

**Don't say "block", "parent", "Group", "Column", "select" or "Layers" before they do.** The tasks describe what the studio wants, not how the editor does it.

Start with: "This is the home page of a yoga studio, Fernhill Yoga, in the editor that changes it. The owner has asked you to make a few changes. Please think aloud as you go. There are no wrong answers; we're testing the design, not you."

### Tasks

1. "There's a spelling mistake in the description of the Monday class: 'beginers' should be 'beginners'. Fix it."
   *Watch for:* in B, whether the first click selecting the whole section surprises or annoys them, how many clicks it takes to reach the text, and whether anyone finds the double click. In the others, this is one click.
2. "Move the whole 'Classes this week' section, with all three classes, so it comes before 'About the studio'."
   *Watch for:* what they click first (the heading, a picture, the background), whether they move the heading or the columns inside the section instead, and how they get to the section: in the control, which of its ways they find, if any; in A, whether they see and click the Group tab; in B, whether one click is enough; in D, whether they open Layers and what they make of the list.
3. "Give the 'Opening hours' section a different background colour."
   *Watch for:* a background given to the heading or the paragraph instead, which looks almost right. Do they notice it isn't the whole section? Clear also counts as a different background, since it takes the sand colour away.
4. "The Saturday class has been cancelled. Remove it, its picture and its words, so only two classes are left."
   *Watch for:* deleting the picture, heading and description one by one and leaving an empty column, deleting the whole Columns or the whole section, and in the control, anyone lowering the Columns count.

### Questions to close with

- "When you wanted to change the whole section, not just the text in it, how did you do it? How did you know?"
- "Was anything hard to click on, or did you get something you didn't expect when you clicked?"
- In A: "Did you notice the small blue labels? What did they tell you?" If yes: "What do 'Group', 'Columns' and 'Column' mean to you?"
- In B: "When you clicked a section the first time, what happened? Was that what you expected?"
- In D: "Did you use the Layers button? What did you expect it to do before you clicked it?"
- In the control: "Did you use any of the buttons above the block, or the line along the bottom of the editor?"

### What to watch for

- **Tasks 2, 3 and 4 done.** This is the main measure. Count them per prototype and compare each with the control.
- **Wrong targets.** The `x` part of the code. Fewer in a prototype means people found the section rather than settling for what was under the pointer.
- **How the section was reached.** The `r` part of the code. In A and D, if the prototype's own route is barely used, any difference from the control isn't because of it. B can't be read this way: every click into a section counts as B's route, including clicks on the way to text, and the first press of each double click counts too (the notes panel's "Double click first presses" says how many to take off). For B, use the log: what was selected when the person moved, recoloured or deleted something.
- **B's cost.** The `k` part of the code and task 1's time. If B makes text edits noticeably slower or more confusing, that cost lands on the most common thing people do.
- **The words.** Group, Columns and Column are the editor's names, not the participant's. Note what people call the sections ("the box", "the green bit", "the panel") and whether A's tabs or D's list help or confuse because of them.

### What would favour each

- **A (hover tab)**: more people finish tasks 2 to 4 than in the control, with fewer wrong targets, and most selections of a section are by a tab. It counts against A if people don't notice the tabs, or find them noisy while writing.
- **B (section first)**: the most people finish tasks 2 to 4, with the fewest wrong targets, and task 1 isn't much slower. If B wins on the sections but people struggle in task 1, the next step is to keep B for sections and find a cheaper way into text.
- **D (Layers)**: people open Layers when they're stuck and pick the right row. It counts against D if few open it, or if they open it and can't tell which row is the section.
- **The control**: people do as well as in the others. Then the editor's own ways are enough once found, and the problem is elsewhere.

A and D aren't exclusive, and either could be added to B.

## Running it

Plain HTML, CSS and JavaScript with no build step and nothing loaded from elsewhere: `app.js` and `style.css` are the shared editor, and each prototype page sets `data-variant` on `<body>` (`control`, `hover-tab`, `section-first` or `layers`) and loads its own script and stylesheet from `variants/`. A's tabs are for the pointer only: the keyboard reaches parents through the toolbar, the breadcrumb and Document Overview, as in the editor. The arms only use the small API `app.js` exposes as `window.Utrillo`, documented in `app.js`. Serve the repository root with any static server and open `utrillo/`.

`node utrillo/e2e/smoke.mjs` runs every prototype in headless Chrome with Playwright: it starts its own server, does each task by the control's routes and by each prototype's own, and checks the ticks, the counts and the completion codes.

The yoga studio, its address and phone number, and its page are placeholders.
