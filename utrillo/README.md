# Utrillo: selecting the section around what you clicked

Prototypes for testing how people select a parent block: the Group, Columns, Column or Cover around the paragraph or picture they clicked.

People click the thing they can see, and the editor selects that block, the innermost one. To space out a row of columns, line up the columns, colour a whole column or delete one, they need the block around it. The editor has several ways to get there, but each one has to be found after the click: a button in the toolbar, the same in a menu, a breadcrumb under the canvas, Document Overview, or a click on the section's own padding.

The idea being tested: people select the container around what they clicked more often when it's offered on the canvas where they're pointing than when they have to find a button after selecting what's inside.

## The prototypes

| | Prototype | How the section around a block is selected |
| --- | --- | --- |
| 0 | [Control](control.html) | As the WordPress editor is today. A click selects the innermost block. To get to its parent: the toolbar's **Select parent block** button (the parent's icon, one level per click), **Select parent block (Group)** in the ⋮ menu, the **breadcrumb** under the canvas, **Document Overview**, or a click on a container's own area. Clicks are as in WordPress 7.1.5, checked in Playground on a page laid out like this one: a Group's padding selects the Group, a Cover's empty area the Cover, the Buttons row's empty area the Buttons, and a Column's empty space the Column. The gap between two columns is core's too. A click there, before the line below shows, selects the Column to the gap's right: between columns 1 and 2, column 2. Rest there and, after about half a second, a blue insertion line runs down the gap with a "+" in its middle. Until the line shows, a click still selects the Column to the right. Once it shows, the "+" adds an empty Column, and a click anywhere else on the line does nothing. Nothing is outlined while the pointer is in the gap. So a click can't reach the Columns block. As far as the tasks go, the control is as close to core as it needs to be. This is the baseline the others are compared with. |
| A | [Hover tab](hover-tab.html) | Pointing at the page outlines every container under the pointer, from the section inwards, each with a small blue tab with its name ("Group", "Columns", "Column", "Cover"), side by side like a breadcrumb. Clicking a tab selects that container. The tabs follow the pointer, whatever is selected, and a section's tab stays at the top of the canvas while the top of the section is scrolled out of view. The block toolbar also shows the selected block's name beside its icon ("Group", "Column"), so it says the same as the tab; in the control and D it shows the icon only, as the editor does. Clicking that name opens a list of everything in the selected block's section, starting with the section itself; clicking a row selects that block. |
| D | [Layers](layers.html) | Each section has a **Layers** button at its top-right corner, shown while the pointer is over the section and while something in it is selected. Like A's tabs, it stays in view at the top of the canvas when the top of the section is scrolled away. It opens a list of everything in that section, nested; clicking a row selects that block. |
| E | [As Create not Learn](create-not-learn.html) | Selects parents the way the [Create not Learn](https://github.com/Automattic/create-not-learn-editor) prototype does, with both of its parts. **Clicks go from the outside in**, at Create not Learn's levels. The first click on the page selects the section (the Cover or Group). In a section with a row of cards (columns that are alike, like the three classes), the second click selects the row, the whole Columns, and the third goes straight to the block clicked, caret there. In a section without one (About's picture beside its text isn't a row), the second click goes straight to the block. Once inside, clicks reach blocks as usual, except that a click in another row selects that row first. A double click goes straight to the block, caret there. Escape steps back as Create not Learn's does: from a block, out of its text too, to the row it's in, or to the section; then to the section; then to nothing. The hover outline shows what the next click would select. **The parent selector** is Create not Learn's: the same box left of the toolbar, with its own select-parent icon, and from two levels deep a **···** button ("Select a block further up") before it. That opens a list above the toolbar of every block around the selected one, outermost first ("Group", "Columns", "Column"); pointing at a row outlines that block and clicking it selects it. |

A and D both keep every one of the control's ways to a parent, so each differs from the control in one thing.

E is different: it's two changes at once. It brings back section-first clicks, as B had (below), at Create not Learn's levels, together with Create not Learn's parent selector. So it differs from the control in more than one thing, and a result in E can't say which part caused it. It also loses one of the control's routes: a click on a section's padding selects the section by E's clicks, not by the padding route. The gap between columns is as in the control (the quick click, the line and its "+"), except that a quick click follows E's levels: the section, then the row, then the Column to the gap's right. The toolbar's button, the ⋮ menu, the breadcrumb and Document Overview are as in the control.

What still differs from Create not Learn itself:

- E selects the section, or the row, as a block, with the ordinary block toolbar and inspector. Create not Learn shows its own bar for the section instead, and no block is selected.
- E's toolbar is the editor's, apart from the parent selector.
- Create not Learn removes a card with a × on its corner while the row is open. In E it's ⋮ → Delete, as in every arm.
- E's "···" list opens above the toolbar, or below it when there's no room.

Two other ideas were dropped, which is why the letters skip. C, a labelled "Select Columns" button beside the toolbar in place of the parent's icon, was left out before building: it's the cheapest change but the least likely to be found, since it still needs the block inside selected first. B, section first (the first click selects the whole section and each further click goes one level in, as in section-based editors), was built and then dropped before testing; it's in this folder's history. E brings its clicks back, at Create not Learn's levels.

What's the same in all four:

- **The page**: an invented yoga studio, Fernhill Yoga, one page in the editor. A Cover with the studio's name; an About section (a Group with a Columns of two: a Column with a picture, and a Column with a heading and a short paragraph, shorter than the picture, so lining it up with the picture's middle shows); a Classes section (a Group with a heading and three Columns, each with a picture, a heading and a short description); an Opening hours section (a Group with a heading and a paragraph); and a contact line. Blocks have the editor's own names and icons (Group, Columns, Column, Cover, and headings by level, "Heading 2"; the icons are copied from the current @wordpress/icons), with no custom names, as when a pattern is inserted.
- **The editor**: a top bar with Document Overview, Undo and Redo; the canvas; the block inspector on the right, open, as in the editor; and the breadcrumb under the canvas. The block toolbar floats above the selected block as in the editor: Select parent block in its own box on the left, with a gap before the toolbar (E changes what's in that box, and the box grows to the left so the toolbar stays where it is), then the block's icon, the move arrows, the block's own controls in their own group, and the ⋮ menu (Duplicate, Add before, Add after, Select parent block, Delete). The block's own controls are core's, with core's icons and labels:
  - **Change vertical alignment** for a Columns (Align top, middle or bottom; it sets every column in it too, as core does) and for a Column (the same and Stretch to fill; it sets that column only and clears the Columns').
  - **Align text** for Headings and Paragraphs (left, center, right).

  The inspector is core's, cut down to what the tasks need:
  - The Columns and the Column have core's two tabs. They open on **Settings** (the cog): the Columns count for a Columns (lowering it removes the last column, as in the editor), and Width for a Column. **Styles** (the half moon) has Background and Dimensions. Other blocks have no tabs, as in core.
  - **Background**: a Color for Groups, the Columns block, each Column, Headings and Paragraphs. The Cover has an Overlay.
  - **Dimensions**, as core has them:
    - Columns: Padding (vertical and horizontal), Margin (vertical), and Block spacing in two, vertical and horizontal, told apart by core's side icons. Only the horizontal one, 2em by default, is the space between the columns. The vertical one is between rows of columns, so it shows nothing here.
    - Group: Padding, Margin and one Block spacing, the space between its blocks.
    - Column: Padding.
    - Each is a slider of core's default spacing presets, None to 2X-Large. Core's "Set custom value", "Unlink sides" and panel ⋮ buttons are there but only logged.
  - **Settings** for an Image: Alternative text.

  What still differs from core:
  - With nothing set, a slider's thumb sits at the block's default (for the classes' Block spacing, between Medium and Large). In core it sits at None, at the left end, so its first step to the right shrinks the space. This was chosen so the slider doesn't make task 2 harder for reasons that aren't about selecting a parent; it may be flipped later.
  - The sliders' look is close to core's but drawn here, and the steps are core's default preset names (2X-Small to 2X-Large), not a theme's.
  - Background is a row of swatches in the panel, not core's Background → Color popover.
  - Not here: the rest of core's toolbars (Drag, Align wide or full, Bold, Italic, Link, More), custom values, a Column's Block spacing, and Typography and Styles panels.
  - A Group's space between its blocks is now 1.5rem, the theme's Block spacing, where it used to vary (16px in Opening hours, 28px above the classes). That changes the page's look a little in every arm.

  Every change can be undone. The tasks aim at the Columns and the Column, the blocks in the middle, because in core the Columns can't be reached by clicking, and its Column only by a click on its empty space or a quick click in the gap to its left. Each task has a decoy that's easier to reach and looks nearly right: the Group's Block spacing, the paragraph's Align text, the heading's background.
- **Moving**: by the move arrows only. There's no drag handle in any of them, so dragging doesn't get in the way of what's being tested. [Pollock](../pollock/) tests dragging.
- **The Finished button**, in a bar along the bottom, which asks "Have you done all five tasks?" before it shows the code.
- **The browser tab's title**, "Fernhill Yoga · Editor", so it doesn't name the prototype. The address still does (`control.html`, `hover-tab.html`, `layers.html`, `create-not-learn.html`).

Nothing is saved anywhere. Reload the page to start again.

## Facilitator notes

Add `?notes` or `#notes` to the address (`hover-tab.html?notes`) for a panel on the right that participants shouldn't see. It has:

- the five tasks, ticked with the time when the page reaches the result, and unticked if it's undone. You can tick and untick them yourself.
- counts of container selections by route: the toolbar button, the ⋮ menu, the breadcrumb, Document Overview, a click on a container's own area, and the prototype's own (tab clicks and rows picked from the toolbar's block list in A, Layers rows in D, section, row and card clicks and "···" rows picked in E); wrong targets; undos; clicks before the caret first landed in the Monday description; seconds to each task; and what's particular to each prototype: tabs shown and the block list opened and rows picked (A), Layers opened and rows picked (D), Escape steps out, and the "···" list opened and rows picked (E).
- a log of everything, with times since the page opened (or since Reset), and **Copy log**,
- Control | A | D | E links to switch prototype, and **Reset**, which puts the page back and clears the log.

The log records every selection (which block, how, and what was selected before), every change (text before and after, moves, deletes, duplicates, colours, block spacing, vertical alignment, text alignment, the column count), undo and redo, Document Overview opened and closed, the ⋮ menu opened, each prototype's own events, and Finished.

**Wrong targets** are the thing to watch. They are the moments someone acted on the block they could see when they meant the section around it:

- task 2: changing the Classes Group's Dimensions (its Block spacing moves the heading away from the classes), the Classes Columns' padding, margin or vertical Block spacing, or a class Column's padding,
- task 3: Align text on the About heading or paragraph, or vertical alignment on the picture's Column only (it moves nothing, as the picture is the tallest),
- task 4: a background on the Wednesday heading or paragraph, or on the Classes Columns, the Classes Group or another Column,
- task 5: deleting the Saturday picture, heading or description on their own, or another column, and leaving the Saturday column empty.

Each counts only while its task isn't done, and at most once per block per task: a second swatch on the same block, another step of the same slider, or a second Align text on the same paragraph is logged but not counted again. Once the change that counted is undone, the block can count again. A slider drag across several steps is one undo step.

Only blocks the page started with count: deleting something the person added themselves, or adding a column and taking it away again, isn't a wrong target.

## The completion code

The **Finished** button gives a code to copy into the next question of an unmoderated testing tool, for example `UA-11011-r2.0.1.0.3.4-x1-u0-k3-s245`. "Keep editing" goes back to the page, and clicking Finished again gives a new code.

| Part | Meaning |
| --- | --- |
| `UC`, `UA`, `UD`, `UE` | The prototype: the control, A hover tab, D Layers, E as Create not Learn. |
| `11011` | The five tasks when Finished was clicked: 1 done, 0 not. |
| `r2.0.1.0.3.4` | Container selections by route: the toolbar button, the ⋮ menu, the breadcrumb, Document Overview, a click on a container's own area, then the prototype's own (always 0 in the control; in A, tab clicks and block list picks together; in E, section, row and card clicks and "···" picks together; the notes panel shows A's two and E's two apart). Selections made with Escape in E aren't counted. |
| `x1` | Wrong targets. |
| `u0` | Undos. |
| `k3` | Clicks on the canvas before the caret first landed in the Monday description, for task 1 (`kx` if it never did). Only presses on the page count, not on A's tabs, D's Layers button or the grey around the page. In E the section and row clicks on the way count, so 2 is the least there by single clicks. A double click counts as one press, so a double click straight on the word gives `k0`. |
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
   *Watch for:* a warm-up: one click on the word in every prototype but E. Note whether A's tabs or D's button get in the way of an ordinary text edit. In E it's the cost of its clicks: the first click selects the section and the second the row of classes, so the caret comes on the third, or on a double click. Watch for surprise or frustration when a click doesn't put the caret there, and whether anyone finds the double click.
2. "Put more space between the three classes."
   *Done when* the Classes Columns' horizontal Block spacing is at least 16px more than at the start (34px): X-Large or 2X-Large. One step, to Large, is only 2px more, which nobody would see, so it doesn't count.
   *Watch for:* how they get to the Columns, which no click reaches in the control: Select parent block twice, the breadcrumb, Document Overview, A's Columns tab, D's Columns row, E's second click. Then whether they find Block spacing on the Styles tab, and the horizontal slider rather than the vertical one. Watch for the Classes Group's Block spacing, which is one level up and moves the heading away from the classes instead.
3. "In the About section, line the text up with the middle of the picture."
   *Done when* the About Columns is aligned to the middle (Change vertical alignment → Align middle), or the text's Column is.
   *Watch for:* Align text on the heading or the paragraph, which is on the toolbar of what they clicked and sounds right. Watch for vertical alignment on the picture's Column, which moves nothing. In E, About isn't a row, so the second click goes to the text: note how they get back out to the Columns or the Column.
4. "Give the Wednesday class its own background colour, behind its picture and its words."
   *Done when* the Wednesday Column has a background.
   *Watch for:* a background on the heading or the paragraph instead, which looks almost right, or on the Classes Columns or Group, which colours all three. Note how they reach the Column: Select parent block once, the breadcrumb, A's Column tab, D's Column row, or E's "···" list. A quick click in the gap to its left also selects it, but few will aim for the gap: note it if it happens, and note anyone who rests there and gets the insertion line instead.
5. "The Saturday class has been cancelled. Remove it, its picture and its words, so only two classes are left."
   *Watch for:* deleting the picture, heading and description one by one and leaving an empty column, deleting the whole Columns or the whole section, and in the control, anyone lowering the Columns count. In E, how they reach the Saturday Column: the "···" list or Select parent block. Note anyone who adds a column with the gap's "+" by mistake. The second click selects the whole row (Columns), which is easy to delete by mistake.

### Questions to close with

- "When you wanted to change the whole section, not just the text in it, how did you do it? How did you know?"
- "Was anything hard to click on, or did you get something you didn't expect when you clicked?"
- In A: "Did you notice the small blue labels? What did they tell you?" If yes: "What do 'Group', 'Columns' and 'Column' mean to you?"
- In D: "Did you use the Layers button? What did you expect it to do before you clicked it?"
- In E: "When you clicked on the words, what did you expect to happen? What happened?" And: "Did you use the button with three dots above the block? What did you expect it to do?"
- In the control: "Did you use any of the buttons above the block, or the line along the bottom of the editor?"

### What to watch for

- **Tasks 2 to 5 done.** This is the main measure. Count them per prototype and compare each with the control.
- **Wrong targets.** The `x` part of the code. Fewer in a prototype means people found the section rather than settling for what was under the pointer.
- **How the section was reached.** The `r` part of the code. If the prototype's own route is barely used, any difference from the control isn't because of it.
- **The words.** Group, Columns and Column are the editor's names, not the participant's. Note what people call the sections ("the box", "the green bit", "the panel") and whether A's tabs or D's list help or confuse because of them.

### What would favour each

- **A (hover tab)**: more people finish tasks 2 to 5 than in the control, with fewer wrong targets, and most selections of the Columns and Column are by a tab. It counts against A if people don't notice the tabs, or find them noisy while writing.
- **D (Layers)**: people open Layers when they're stuck and pick the right row. It counts against D if few open it, or if they open it and can't tell the Columns row from the Column rows, or from the Group.
- **E (as Create not Learn)**: more people finish tasks 2 to 5 than in the control, with fewer wrong targets, and most selections of the Columns and Column are by a click or the "···" list, without many more clicks before the caret in task 1 (`k`). It counts against E if people are slowed or put off by clicks that don't reach the text, keep clicking in past the section, or delete the whole row in task 5. Task 2 should be easy in E, since its second click selects the row; task 3 isn't, since About isn't a row. Since E is two changes, a good result says Create not Learn's way works, not which part of it does; the "···" picks and the click counts in the notes panel are the only hint.
- **The control**: people do as well as in the others. Then the editor's own ways are enough once found, and the problem is elsewhere.

A and D aren't exclusive: the editor could have both.

## Running it

Plain HTML, CSS and JavaScript with no build step and nothing loaded from elsewhere: `app.js` and `style.css` are the shared editor, and each prototype page sets `data-variant` on `<body>` (`control`, `hover-tab`, `layers` or `create-not-learn`) and loads its own script and stylesheet from `variants/`. A's tabs are for the pointer only: the keyboard reaches parents through the toolbar, the breadcrumb and Document Overview, as in the editor. The arms only use the small API `app.js` exposes as `window.Utrillo`, documented in `app.js`. Serve the repository root with any static server and open `utrillo/`.

`node utrillo/e2e/smoke.mjs` runs every prototype in headless Chrome with Playwright: it starts its own server, does each task by the control's routes and by each prototype's own, makes each wrong target, and checks the ticks, the counts and the completion codes. It checks the gap between columns as core has it (a quick click selects the Column to its right; the insertion line does nothing but for its "+", which adds a Column), the inspector's tabs, that a drag is one undo step and one wrong target, and that A's tabs move out from under another block's toolbar.

The yoga studio, its address and phone number, and its page are placeholders.
