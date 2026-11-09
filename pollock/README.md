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

## How it maps to Gutenberg

- **A** is `BlockMover` as it is now (`block-mover/index.tsx` and `style.scss` in `@wordpress/block-editor` 20.0.0): `.block-editor-block-mover__drag-handle` is `$block-toolbar-height * 0.5` wide with `overflow: hidden`, and has `tabIndex="-1"`.
- **C** would be a change to that button's size, its icon (or the icon's dots) and its tab order, plus a toolbar group of its own. Keyboard moving would reuse the movers.
- **B** would be a new block tool beside the block, like the block toolbar's popover but on the block's left edge, using `BlockDraggable`. It needs room to the left of the content, which narrow layouts and full-width blocks don't have; the real thing would need to tuck it inside the block there.
- The drop line, the drag chip, and the movers' behaviour are the editor's, simplified: blocks only move within one list, so there's no nesting.

## Running it

Plain HTML, CSS and JavaScript with no build step: `app.js` and `style.css` are shared, and each page sets `window.PROTOTYPE.handle` to `today`, `edge` or `toolbar`. Serve the repository root with any static server and open `pollock/`.

Icons are from `@wordpress/icons`. The bakery, its page and its copy are placeholders.
