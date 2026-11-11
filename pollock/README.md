# Pollock: drag handles

Prototypes for testing whether people find and use the block editor's drag handle.

Across design systems, people expect a drag handle to be a grid of six dots, two columns of three, on the edge of the thing it moves, with a grab cursor. A line icon reads as a menu (≡), and so does a single column of dots (⋮).

The block editor already uses the six-dot icon. `BlockMover` draws it with `dragHandle` from `@wordpress/icons`, but:

- it's a button 24px wide (half the toolbar's height) with the 24px icon clipped inside it,
- it sits between the block's icon and the stacked move arrows, so it reads as part of them,
- in the current icon set its dots are 2px squares,
- it's in the toolbar above the block, not on the block, and the toolbar only appears once a block is selected,
- Tab skips it (`tabIndex="-1"`), since it only works with a pointer.

So is the problem where the handle is, or how it looks? These prototypes keep everything else the same and change only the handle.

## The prototypes

| | Prototype | What changes |
| --- | --- | --- |
| A | [Today](today.html) | Control. The toolbar as the editor draws it: block icon, the narrow drag handle, stacked move arrows. |
| B | [On the block's edge](edge.html) | A six-dot grip with 3px dots, to the left of the block's first line, shown on hover and on the selected block. The toolbar keeps its move arrows but loses its drag handle. Tab reaches the grip and arrow keys move the block. |
| C | [Bigger, in the toolbar](toolbar.html) | The handle stays in the toolbar, but as a full 48px button with 3px dots, in its own group at the start, with a "Drag to move" tooltip. Tab reaches it and arrow keys move the block. |

What's the same in all three:

- **The page**: one page of a bakery's site, eight blocks (headings, paragraphs, a quote, an image, a button). Text can be edited, and dragging across text selects it, as in the editor.
- **Dragging**: a grab cursor on the handle, then the block fades, a chip with its icon and name follows the pointer, and a blue line shows where it will land. The page scrolls near the top and bottom edges. Escape cancels.
- **The toolbar**: move up and down arrows, align, bold, italic, link and the Options menu (Copy, Duplicate, Add before, Add after, Move to, Delete). Only the arrows, bold and italic work; the rest say they aren't part of the prototype, and the log notes them, so you can see if someone looks for Move to.
- **Undo and Redo** in the top bar, and ⌘Z / Ctrl+Z outside text. **Reset** puts the page back and clears the log.

## Facilitator notes

Add `?notes` or `#notes` to the address (`today.html?notes`) for a panel on the right that participants shouldn't see. It has:

- the four tasks, ticked off as the page reaches each one, with the time,
- counts of moves by dragging, by the arrows and by the keyboard, of drags on things that aren't handles, and of looks at Move to or List View, plus the time of the first drag from a handle,
- a log of everything, with times since the page opened (or since Reset), and **Copy log** to paste it into your notes,
- A | B | C links to switch prototype.

A "drag on something that isn't a handle" is any press and move of more than 16px on a block, the picture or the toolbar that didn't start on a handle. On text that selects text, so the log says so; on the picture or the block icon it's almost certainly a try at dragging.

## Running a test

Each prototype opens in a desktop browser with no sign-in. This is about pointer dragging, so use a mouse or trackpad. Reset between participants.

### Who

People who edit a WordPress site, or are about to, without much block editor experience: someone who runs a small business, club or portfolio site. Not developers. Five or six per prototype finds the big problems.

### Design

One prototype per participant (between subjects), since once someone has found a handle they'll look for it everywhere. A is the control. Change the order you run them in from day to day.

**Don't mention dragging, handles or moving by hand.** Nielsen Norman Group's advice is to watch whether people try to drag, not to ask them. The tasks only say where things should end up.

Start with: "This is a page on the website of a bakery, Rosa's Bakery, in the editor that changes it. Rosa has asked you to tidy it up. Please think aloud as you go. There are no wrong answers; we're testing the design, not you."

### Tasks

1. "Rosa wants the picture of the pumpkin loaf at the very top of the page, above 'Autumn at Rosa's'."
   *Watch for:* where they look first. Do they try to drag the picture itself? Do they find a handle, the arrows or neither? Time to first move.
2. "Move the quote from Ana to the end of the page."
   *Watch for:* whether what worked for task 1 carries over. Clicking the down arrow many times is a sign the handle wasn't found or wasn't trusted.
3. "Put the Order online button straight under 'Order for the weekend'."
   *Watch for:* a small move, where the arrows are quicker than dragging. Which do they pick, now that they know both?
4. "Move 'We're closed on Mondays' so it comes straight after the first paragraph."
   *Watch for:* a long move across the page, with scrolling in some window sizes. The arrows take several clicks; a drag takes one.

### Questions to close with

- Point at the handle (in A and C the toolbar's dotted button, in B the grip): "What do you think this does?" Ask before they've used it if they never did.
- "If you wanted to move something on this page tomorrow, how would you do it?"
- In B: "Did you notice the dots next to the block before you used them? When?"

### What would tell us something

- **B beats A on task 1** (more people drag from a handle, and sooner) and C doesn't: the handle's place is the problem.
- **B and C both beat A**: it's mostly how the handle looks, and the toolbar is a fine place for it once it's legible.
- **No difference**: people don't think of dragging blocks at all. The arrows, or Move to, are where to spend effort.
- Lots of drags on the picture or the text in every prototype: people expect to grab the block itself, which is a bigger change than a handle.

## Round 2

Round 1 (above) ran on 10 November 2026: 15 people in Lyssna, each trying all three prototypes in one of three orders. What we learned:

- **Order mattered more than the handle.** Everyone was slowest on their first prototype (about 2m 15s) and quickest on their third (about 50s), whichever it was. Averaged over positions, A, B and C were within 10 seconds of each other.
- **Most people never dragged.** The move arrows were enough for short moves on an eight-block page, so many people used them for everything.
- **A's handle was rarely found.** People who saw A first looked for a way to drag and gave up ("Is there a way to drag it?"). People who dragged in A had learned the handle in B or C first.
- **C's tooltip led to the most "oh, you can drag it" moments**, but its toolbar covered the text above the block ("I have to click away to see it").
- **B was liked by the people who found it** ("Having the handle here is much, much better"), but on first sight one person thought the dots were for selecting the block.
- **We couldn't see what people did.** Lyssna gives times and recordings; the `?notes` log only runs for the facilitator; and about a third of the recordings had no usable think-aloud.
- **Pictures should have been draggable.** In the editor today, a block that isn't text (such as an Image) can be dragged by the block itself, without a handle. Round 1 logged those drags as misses.

Round 2 is in [`round-2/`](round-2/) and changes the test, not just the handle:

| | Prototype | What changes |
| --- | --- | --- |
| A | [Today](round-2/today.html) | Control, as in round 1. |
| B | [Edge grip](round-2/edge.html) | As in round 1. |
| Bn | [Edge grip, no arrows](round-2/edge-no-arrows.html) | The toolbar has no move arrows, so dragging is the only way to move a block. Does anyone find the grip when they have to? |
| Bh | [Edge grip, labelled](round-2/edge-hint.html) | A "Drag to move" label beside the grip, shown straight away while the pointer is over the grip (not after the browser's tooltip delay). |
| Bm | [Edge grip, move icon](round-2/edge-move-icon.html) | B with a four-arrow move icon in place of the six dots. |
| C | [Bigger toolbar handle](round-2/toolbar.html) | As in round 1. |
| Cm | [Bigger toolbar handle, move icon](round-2/toolbar-move-icon.html) | C with the four-arrow move icon. |

What's new in all of them:

- **A longer page, with long moves.** 22 blocks: the autumn news, Our breads, Order for the weekend, Opening hours, Visit us and Gift cards. Every task moves a block 10 or more places, so a drag is quicker than clicking an arrow, and the first task is the longest (the picture of the pumpkin loaf from near the bottom to the top). Dragging scrolls the page near its top and bottom edges.
- **A Finished button and a completion code.** Lyssna shows the tasks, so the page only has a Finished button in the bottom left. Clicking it shows a code to copy into the next question in Lyssna, for example `Cct-1101-d3-p1-a5-k0-m2-o1-h2-f45-t40.95.x.130-s180`: the prototype; each task right (1) or not (0) when they clicked Finished; moves by dragging a handle (`d`), by dragging a picture or cover itself (`p`), by the arrows (`a`) and by the keyboard (`k`); drags on things that aren't handles (`m`); looks at Move to or List View (`o`); times the drag handle's tooltip appeared (`h`); seconds to the first drag from a handle (`f`, or `x` for none); seconds until each task was first right (`t`, `x` for never); and seconds until Finished (`s`). The page can't see when Lyssna moves someone to the next task, so `t` is when each task was first done, counted from when the page opened. "Keep editing" goes back to the page, and clicking Finished again gives a new code.
- **Pictures drag by themselves**, as in the editor: press on a picture and drag it. This is counted separately from handle drags (`p`), since the question is whether people find the handle.
- **The toolbar fades** to nearly transparent when the pointer is away from it and its block, so it doesn't hide the text above. It comes back as soon as the pointer gets near.
- **The drag handle and the move arrows stay together**, since they do the same job. In C (and Cm, Cc) the bigger handle sits straight before the arrows in the toolbar's first group, as today's handle does in A, rather than in a group of its own. With the edge grip (B, Bh, Bm, Bc) the arrows leave the toolbar and sit beside the grip on the block's edge, so they show on hover too; in Bn there are no arrows at all. On the columns page the grip and arrows together are about 50px wide, so where they have to sit inside a block they cover more of its text than the grip alone. Round 1's pages are unchanged.
- **No Reset for participants.** Reset only shows with `?notes`, so nobody loses their place.

### Columns and full width

The edge grip sits in the margin to the left of a block. Real pages don't always have that margin: a block in the second of two columns has the first column beside it, and a full-width block runs to the edge of the screen. So round 2 has a second page layout, `layout: 'columns'`, with:

- a full-width **Cover** ("Fresh every morning") after the first paragraph,
- **Opening hours** and **Visit us** side by side in a **Columns** block, 32px apart.

On that page the edge grip goes in the margin where there's at least 40px clear of whatever is to the block's left, and otherwise just inside the block's top-left corner, on a white chip with a shadow so it shows on any background. In practice:

- blocks on the page, and in the left column, get the grip in the margin, as before;
- the Cover gets it inside its top-left corner, which works;
- blocks in the right column get it inside too, where it covers the first letter or two of their text.

That last case is the cost of the edge grip, and the reason to test it on this page. The toolbar handle (A and C) doesn't have the problem, but its toolbar covers the block above, as it does everywhere.

| | Prototype |
| --- | --- |
| Ac | [Today, columns page](round-2/today-columns.html) |
| Bc | [Edge grip, columns page](round-2/edge-columns.html) |
| Cc | [Bigger toolbar handle, columns page](round-2/toolbar-columns.html) |

The tasks change on this page so that each layout gets used:

1. Put the picture of the pumpkin loaf at the very top (a long move on the page, as before).
2. Move "We're closed on Mondays" into the left column, after "Saturday, 8am to 2pm." (from the page into a column).
3. In "Visit us", move the parking paragraph from above the heading to the end of that column (within the right column, where the grip has to sit inside the block).
4. Move the "Fresh every morning" banner to the end of the page, after the Order online button (a full-width block).

Blocks can be dragged from the page into a column, out of one, and between columns. The move arrows move a block within its own list (the page or a column), as in the editor. The Cover can also be dragged by its background, like a picture. In the completion code, `p` counts those drags too.

### Running round 2

**Run five tests, all on the columns page:**

| Test | Prototype | URL |
| --- | --- | --- |
| Ac | Today (control) | `round-2/today-columns.html` |
| Bc | Edge grip, with the arrows beside it | `round-2/edge-columns.html` |
| Cc | Bigger toolbar handle, six dots | `round-2/toolbar-columns.html` |
| Ccm | Bigger toolbar handle, four-arrow move icon | `round-2/toolbar-move-icon-columns.html` |
| Cct | Bigger toolbar handle, "Drag to move" tooltip straight away | `round-2/toolbar-tip-columns.html` |

**Tooltips.** Round 2 uses the editor's tooltips, a small dark label under the control after a 700ms hover, as the block toolbar does, rather than the browser's own. Every toolbar button and the edge grip and arrows have one. The drag handle's says "Drag" in Ac, as in the editor today, and "Drag to move" in the others. Cct is Cc with one difference: the handle's tooltip appears as soon as the pointer is over it. Round 1's pages keep the browser tooltips they were tested with.

The other round 2 pages (A, B, Bn, Bh, Bm, C and Cm on the simpler page) stay in the repository for reference but aren't in the test. The columns page is the layout a handle really has to work in, the handle stays beside the arrows as a design rule, and fewer groups means more people in each.

- **One prototype per person.** A separate Lyssna test for each URL, each with its own participants, launched together with the same filters. 10 people each, 50 in all.
- **Screener:** "Have you used the WordPress block editor in the last year?" Screen out "Yes, often". Desktop or laptop only; fluent English.
- **Tasks in Lyssna:** put all four tasks in **one** live website task, as in round 1. Reloading or reopening the page starts it again, so separate tasks would each start from a fresh page. Add: "Please think aloud, in English, as you go. When you've done all four, click Finished in the bottom-left corner and copy the code." Then a required text question: "Paste your code here."
- **Questions after the task, in Lyssna** (show a screenshot of that prototype's handle):
  1. "What do you think this does?"
  2. "If you wanted to move something on this page tomorrow, how would you do it?"
  3. In Bc only: "Did you notice the dots beside the text before you used them?"

### What would decide it

Decide these before the results come in. With 10 people a group, a difference of one or two people is noise; three or more is worth taking seriously.

- **Is a bigger toolbar handle better than today's?** Cc (or Ccm) against Ac: more people drag from a handle at all (`d` > 0, by 3 or more of 10), they find it sooner (`f`), and task 1 is done faster (the first `t`).
- **Is the move icon better than the dots?** Ccm against Cc, on the same measures, plus how many people say the handle is for moving or dragging when asked "What do you think this does?".
- **Does an instant tooltip help people find the handle?** Cct against Cc: more people drag from a handle (`d` > 0, by 3 or more of 10), sooner (`f`). `h` shows whether they saw the tooltip at all: if most people in Cc never see it (`h0`), the editor's delay is hiding it.
- **Is the edge grip worth its problems?** It covers text in the right column, needs a new kind of block tool and changes the arrows' place, so it has to win clearly. Only consider it if Bc beats the best of Cc, Ccm and Cct by 3 or more of 10 people dragging from a handle, **and** isn't worse on task 3 (the move inside the right column, where the grip sits over the text), **and** doesn't have more drags across text (`m`). Otherwise, the toolbar handle is the answer.

## How it maps to Gutenberg

- **A** is `BlockMover` as it is now (`block-mover/index.tsx` and `style.scss` in `@wordpress/block-editor` 20.0.0): `.block-editor-block-mover__drag-handle` is `$block-toolbar-height * 0.5` wide with `overflow: hidden`, and has `tabIndex="-1"`.
- **C** would be a change to that button's size, its icon (or the icon's dots) and its tab order. In round 1 it had a toolbar group of its own; from round 2 it stays where today's handle is, straight before the arrows. Keyboard moving would reuse the movers.
- **B** would be a new block tool beside the block, like the block toolbar's popover but on the block's left edge, using `BlockDraggable`. It needs room to the left of the content, which narrow layouts and full-width blocks don't have; the real thing would need to tuck it inside the block there.
- The drop line, the drag chip, and the movers' behaviour are the editor's, simplified. Round 1 had one list of blocks; round 2's columns page nests blocks one level deep (columns), but not further.
- **Dragging a block itself** (round 2) follows `useBlockProps` and `onDragStart` in `block-list/use-block-props`: the block wrapper is `draggable` when it can be moved, and the drag is the block's when the block itself has focus rather than a text field in it, which is the case for an Image. Text blocks still select text when you drag across them. Dragging a multi-selection by any of its blocks isn't in the prototype.
- **Bn** would mean taking `BlockMover`'s up and down buttons out; **Bh** would be a first-use label, like the editor's other first-use tips.

## Running it

Plain HTML, CSS and JavaScript with no build step: `app.js` and `style.css` are shared, and each page sets `window.PROTOTYPE.handle` to `today`, `edge` or `toolbar`. Round 2's pages also set `round: 2`, a `code` for the completion code, and `arrows: false`, `hint: true`, `icon: 'arrows'` or `layout: 'columns'` where they need them. Blocks are kept as lists, one for the page and one per column, so they can move between them. `@wordpress/icons` has no four-arrow move icon, so the prototype draws one to match: 1.5px strokes on a 24px grid. Serve the repository root with any static server and open `pollock/`.

Icons are from `@wordpress/icons`. The bakery, its page and its copy are placeholders.
