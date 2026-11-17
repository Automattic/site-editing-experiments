# Seurat: where do the typography controls live?

Prototypes for testing whether people find the controls that change how text looks (its font, its size, the space between its lines) more easily on the toolbar than in the settings sidebar.

In the WordPress editor today, a block's typography is in the settings sidebar on the right: the Block tab, the Typography panel. Only Size shows there at first; Font, Appearance, Line height, Letter spacing, Decoration and Letter case are turned on from the panel's options menu. The toolbar above the block, where people are already looking, has none of them.

The idea being tested: people who are new to WordPress find the typography controls faster, and more of them find them at all, when the controls are on the toolbar above the text, which is where other site builders such as Squarespace put text formatting. A third prototype tries the opposite direction, from a proposal to simplify the block toolbar, where style controls go into one options menu.

## The prototypes

| | Prototype | Where the typography controls are |
| --- | --- | --- |
| 0 | [Control](sidebar.html) | After the WordPress editor as it is today. The toolbar has the block's icon, drag handle, movers, heading level, text alignment, bold, italic, link and options. Typography is in the sidebar's Block tab, in a Typography panel that shows Size (S, M, L, XL, with a custom size toggle). The panel's options menu turns on Font, Appearance, Line height, Letter spacing, Decoration and Letter case one at a time. |
| A | [On the toolbar](toolbar.html) | Arranged the way Squarespace arranges its text toolbar: a text style menu first (Heading 1 to 4, Paragraph), then **Font** and **Size**, each naming what the text is set in now ("Helvetica", "18"), then bold, italic, link and alignment. A **More text options** button (three dots) holds Appearance, Line height, Letter spacing, Decoration and Letter case. The sidebar has no Typography panel. |
| B | [In the options menu](menu.html) | After the block toolbar proposal in [Gutenberg issue #85204](https://github.com/WordPress/gutenberg/issues/85204): the toolbar is the block's name (transforms, heading level, style presets), full-size movers, one options menu and delete. Formatting (bold, italic, link) appears in a small toolbar when text is selected. The options menu is searchable and every item is labelled: Align, **Typography**, Format, Styles, Insert, Copy, Cut, Duplicate, Group, Create pattern and More. All seven typography controls are in the Typography flyout. The sidebar has no Typography panel. |

Two things to know about A and B:

- **A is Squarespace's arrangement, not a copy of Squarespace.** Squarespace's text toolbar changes the text style (Heading 1 to 4, Paragraph 1 to 3) and formatting; the font itself is set for the whole site in its site styles, not for one piece of text. A puts WordPress's own per-block controls where Squarespace puts its text tools, so that all three prototypes can do the same things.
- **B is a reading of the proposal.** The issue's design principle is that style choices which usually come from Global Styles, text alignment and typography among them, move to the options menu, but its list of menu items names text alignment and not typography. B puts a Typography item straight after Align. The issue doesn't say whether the sidebar would keep its panel; here it doesn't, so that each prototype has exactly one place to find.

What's the same in all three:

- **The page**: the home page of an invented bakery, Marlow Lane Bakery: a main heading, a picture, and three short sections of a heading and a paragraph. Click any text to select it and type in it.
- **The seven controls** and what they offer: four fonts (Georgia, Helvetica, Trebuchet, Courier) after Default; sizes S, M, L and XL (14, 18, 24, 36) or a size of your own from 8 to 160; Appearance (Regular, Italic, Bold, Bold Italic); Line height; Letter spacing; Decoration; Letter case. Only where they are differs.
- **The rest of the editor**: the top bar (Undo, Redo, Save, and the Settings button that opens and closes the sidebar), the sidebar's Page and Block tabs with the block's name and description, Color and Dimensions panels, and the toolbar above the selected block. Things that aren't part of the test (adding blocks, links, colours, Duplicate and so on) are there to be looked through, and say so when clicked.
- **The log and the Finished button**, in a bar along the bottom. Finished asks "Have you done every task?" before it shows the code.
- **The browser tab's title**, "Marlow Lane Bakery · Page editor", so it doesn't name the prototype. The address still does (`sidebar.html`, `toolbar.html`, `menu.html`); hide it or use a link shortener if that matters for your test.

Nothing is saved anywhere. Reload the page to start again.

## Facilitator notes

Add `?notes` or `#notes` to the address (`toolbar.html?notes`) for a panel on the right that participants shouldn't see. It has:

- the three tasks, ticked with the time when the page reaches the result. You can tick and untick any of them yourself.
- counts: seconds to the first typography change, typography changes, how many menus, flyouts, tabs and hidden controls were opened (the looking around), blocks changed to another kind, clicks on things that do nothing, and saves.
- a log of everything, with times since the page opened (or since Reset), and **Copy log** to paste it into your notes,
- 0 | A | B links to switch prototype, and **Reset**, which puts the page back and clears the log.

The log records each block selected; every menu, flyout, sidebar tab and hidden control opened, by name; every typography change with the block, the control, and the old and new value; alignment, moves and changes of block kind; typing; clicks on things that do nothing; Undo and Redo; Save; and Finished.

**Where they look first** is the thing to watch. The log shows the order: the toolbar's menus, the sidebar's tabs, the options menu. The count of things opened before the first typography change is the short version.

## The completion code

The **Finished** button shows a code to copy into the next question of an unmoderated testing tool, for example `ST-111-t35.80.142-f35-c4-m7-x0-e0-s160`. "Keep editing" goes back to the page, and clicking Finished again gives a new code.

| Part | Meaning |
| --- | --- |
| `SC`, `ST`, `SM` | The prototype: the control, A on the toolbar, B in the options menu. |
| `111` | The three tasks when Finished was clicked: 1 for reached, 0 for not. |
| `t35.80.142` | Seconds from opening the page to the first time each task's result was reached; 0 if it never was. |
| `f35` | Seconds to the first typography change of any kind; 0 if there was none. |
| `c4` | Typography changes. |
| `m7` | Menus, flyouts, sidebar tabs and hidden controls opened. The least it can be differs by prototype (task 1 needs none in the control, one in A and two in B), so compare it with that in mind. |
| `x0` | Blocks changed to another kind (a paragraph made a heading, or a heading's level changed). |
| `e0` | Times the person clicked Finished and then turned back. |
| `s160` | Seconds from opening the page to clicking Finished. |

## Running a test

Each prototype opens in a desktop browser with no sign-in. Reload between participants (or use Reset in the notes panel).

### Who

People who run, or are about to make, a small site, and who haven't used WordPress. Not developers or designers.

### Design

One prototype per participant: once someone has found the controls in one place, they know what to look for in the next.

**Don't say "font size", "typography", "toolbar", "sidebar" or "settings" before they do.** The tasks describe what the bakery wants, not the name of the control or where it is.

Start with: "This is the home page of a bakery's website, in the editor that changes it. The owner has asked you to make a few changes to how the text looks. Please think aloud as you go. There are no wrong answers; we're testing the design, not you."

### Tasks

1. "The first paragraph, the one that starts 'Marlow Lane Bakery has baked', is hard to read. Make its text bigger."
   *Watch for:* where they look first. In the control, whether they notice the sidebar at all, and whether S, M, L, XL reads as text size. In A, whether "18" reads as a size. In B, whether they open the options menu, and whether they read down to Typography or use the search. Some people will make the paragraph a heading instead; the task is ticked, and the code's `x` part shows it. (Task 2 is stricter: making the main heading a paragraph changes its lettering but isn't ticked.)
2. "The owner doesn't like the lettering of the main heading at the top. Change it to a different font, any one you like."
   *Watch for:* in the control, Font isn't showing: do they find the panel's options menu, and how long before they give up? In A, whether the font's name on the toolbar is recognised as the thing to click. In B, whether what they learned in task 1 carries over.
3. "The last paragraph, under 'Order ahead', looks cramped. Put more space between its lines."
   *Watch for:* this is the control furthest from view in all three: behind the panel's options menu in the control, under More text options in A, and lower down the Typography flyout in B. Some people will press Enter or add spaces instead; Enter does nothing in these prototypes.

Then ask: "Where did you expect to find those settings?" and "Was anything hard to find?"

### What would support the idea

More people completing tasks 1 and 2 in A than in the control, in less time, having opened fewer other things first. B tests the opposite direction: if B does no worse than the control, moving style controls into a menu costs little; if it does worse, the proposal makes typography harder to find than it already is.

## Limits

- This is a simulation, not the WordPress editor. The control copies the editor's words and the order of its controls, not its exact look.
- Menus and flyouts open on click, not on hover.
- Typing is undone with the browser's own Ctrl+Z, not the Undo button, and the Undo button puts back the text as it was before the last change of style.
- Enter doesn't start a new paragraph, blocks can't be added or deleted, and links and colours don't work.
- The toolbar sits above the selected block, as in the editor, so it can cover the end of the block above.
- Tested in headless Chrome with a mouse and keyboard only.

The bakery's name and copy are invented placeholders, and the phone number is a bracketed placeholder.
