# Escher: writing and design toolbars

In WordPress every block has one toolbar, and it's the same toolbar whatever you're trying to do. It ends up set up for writing, so designing a page means hunting through tools meant for words. Escher splits it in two:

- a **writing toolbar**, inspired by Microsoft Word, for when you're working on words
- a **design toolbar**, inspired by Microsoft PowerPoint, for when you're arranging things on the page

Both float above whatever you've selected, as they do in Squarespace, and each has a switch at its left, a pen for writing and a layout icon for designing, so you can always see which one you're in and swap between them. Hover either to see its name. The writing toolbar is blue and the design toolbar is orange, and the bar at the top says **Writing** or **Designing**.

## How it works

- **Click any text** and you're writing: the caret lands where you clicked and the writing toolbar appears.
- **Click a picture or a button**, or **drag the handle** that appears beside anything you hover, and you're designing that thing.
- **Click the space around things** to design the whole section.
- **Esc** steps out: from writing to designing the same thing, then to its section, then to nothing. **Enter** on a selected text starts writing again.

### Writing toolbar

From left to right, like Word's Home tab:

- **Style**, a list of every text style the theme offers (Title, Heading, Subheading, Label, Introduction, Normal, Small print, Big quote, Quote, Poem, Typewriter and Code), each shown in its own font and size and grouped by font.
- **Font**, the theme's four fonts, each written in itself with a short note on what it's for.
- **Size**, the sizes that font comes in, shown as Extra large, Large, Medium and Small at their real size with a number beside them, like Word's size box. Opening it puts the cursor in a box where you can type any size instead (8 to 160px); an asterisk in the size box marks a size of your own. **A▲** and **A▼** step to the next theme size up or down (Ctrl+Shift+> and Ctrl+Shift+<, as in Word).
- **Bold, italic, underline, strikethrough** and **link**.
- **Font colour**, the A with a colour bar under it, like Word's: Automatic (matches the section), nine theme colours, or any colour of your own.
- **Bullets** and **numbering**.
- **Align** left, centre and right.

Fonts are always presets, and so are sizes unless you type your own. Behind each preset is a block. Choosing **Large** in Bricolage Grotesque turns a paragraph into a level 2 heading; choosing **Newsreader** turns it into a quote; **Bullets** turns it into a list. The toolbar never mentions blocks: people choose a font and a size, and the block transformation happens underneath.

| Font | Size | Style | Block underneath |
| --- | --- | --- | --- |
| Bricolage Grotesque | Extra large · 60 | Title | Heading, level 1 |
| | Large · 40 | Heading | Heading, level 2 |
| | Medium · 26 | Subheading | Heading, level 3 |
| | Small · 15 | Label | Heading, level 4 |
| Instrument Sans | Large · 22 | Introduction | Paragraph, large font size |
| | Medium · 17 | Normal | Paragraph |
| | Small · 14 | Small print | Paragraph, small font size |
| Newsreader | Large · 36 | Big quote | Pullquote |
| | Medium · 22 | Quote | Quote |
| | Small · 18 | Poem | Verse |
| JetBrains Mono | Medium · 17 | Typewriter | Preformatted |
| | Small · 14 | Code | Code |

Changing font keeps the size if the new font has it, otherwise it picks the nearest; a size you typed yourself stays as it is. A typed size is saved as a custom font size on the block (`style.typography.fontSize`), and typing one of the theme's sizes picks that preset instead.

### Colour for one, or for all of them

Changing the colour of a heading, some text, a quote, a button or a section's background applies it straight away, then asks along the bottom of the screen: **Use Clay for every heading on your site?** with **Every heading** and **Just this heading**. Ignoring the question keeps it to just this one. Choosing all of them sets the colour site-wide (as Styles would) and clears any one-off colours of that kind, so they all follow it. Headings means Title, Heading, Subheading and Label; text means Introduction, Normal, Small print and lists. Backgrounds ask about every section on this page, and choosing all of them gives every section that background. Hovering a colour previews it on the page. Typing works like a word processor: **Enter** starts a new paragraph (after a heading it starts a Normal one), **Backspace** at the start of a paragraph joins it to the one before, and Ctrl+Alt+1 to 4 and Ctrl+Alt+0 jump to Title, Heading, Subheading, Label and Normal.

Buttons get a cut-down writing toolbar (bold and italic only), since their font comes from the site's button style. Double-click a button, or choose the pen, to change its text.

### Design toolbar

For a single thing, like PowerPoint's Arrange tools:

- **Drag** it to move it anywhere on the page, including into another section: press on a picture or button, or on anything already selected for design, and drag, or use the dotted grip in the toolbar. A line shows where it'll land. Clicking selected text without dragging starts writing where you clicked.
- **In among the text:** in a section with a picture column, drop a picture between two pieces of text and it stays there, at half the column's width to start with. If that empties the picture column, the section becomes one column. Picking a layout puts everything back in its usual column.
- **Swap sides** in a picture-and-text section: drag the picture into the margin beside the text, where **Move the picture to the left** (or right) appears, and let go; the picture and text swap sides. **Swap sides** in the picture's toolbar does the same.
- **Resize** with the handles on its corners and sides. Width is a share of the column and snaps to a quarter, a third, half, two thirds, three quarters and full width (a label shows which), so things still line up and still fit on a phone. On a button the handles are on the button itself.
- **Move up** and **Move down** (Alt+↑ and Alt+↓) move it one place, and into the next section at the ends.
- **Align** for text, and **Shape** (Landscape, Wide, Square, Portrait, Circle, Arch) and **Replace** for pictures.
- For buttons: **Style** (Filled, Outline, Underlined link), **Colour** (with the same every-button question; the text colour flips between dark and light to stay readable), **Size** (Small, Medium, Large), **Corners** (Round, Soft, Square), **Full width** and **link**. Hovering an option previews it.
- **Duplicate**, **Delete** (or the Delete key) and **Section**, which selects the section it's in.

For a section, like PowerPoint's Layout and Design tabs:

- **Layout**, a gallery of layouts drawn as thumbnails: Text and picture, Picture and text, Text over picture, Stacked, Centred, Heading beside text, Pictures in a row and Freeform. Layouts that don't suit the section's content are greyed out.
- **Background**, seven colour schemes or a colour of your own (the text switches between dark and light to stay readable), and **Spacing**, Compact, Comfortable or Spacious.
- Hovering an option in any of these **previews it on the page**, as PowerPoint does; clicking keeps it.
- **Insert** adds a heading, text, a list, a quote, a picture or a button.
- **Move up**, **Move down**, **Duplicate** and **Delete**.

### Freeform

Choosing **Freeform** from a section's Layout menu frees everything in it to go anywhere, starting from exactly where it was, so nothing jumps.

- **Clicking** anything in a freeform section, text included, selects it for design, so it's ready to drag; click selected text again to write in it.
- A **12-column grid** shows over the section while you're designing it or anything in it, and goes away when you click off.
- **Drag** anything to put it exactly where you let go. Pink guides snap it to the grid's columns, the section's edges and middle, and the edges and middles of the other items.
- **Resize** from the side handles to any width, snapping to the same guides and columns.
- The **arrow keys** nudge the selected item 1px at a time (10px with Shift).
- Items can overlap. **Bring forward** and **Send backward** in the toolbar, or Alt+↑ and Alt+↓, change which is in front.
- Dragging an item out of the section moves it somewhere else on the page as usual, and dragging something into a freeform section puts it where you drop it. Anything inserted goes underneath what's there.
- Positions are a share of the section's width, so the arrangement keeps its shape as the window changes. On a phone a freeform section stacks its items in order.
- Picking any other layout puts everything back in order.

Moving, duplicating and deleting show a message with **Undo**. **Undo** and **Redo** in the top bar (Ctrl+Z and Ctrl+Shift+Z) cover everything, and **Reset** puts the page back as it started.

**Show blocks**, at the top right, labels everything with the block behind it and adds the block names to the Style and Size menus, for explaining the idea to developers. Leave it off for user testing.

## Running it

It's plain HTML, CSS and JavaScript with no build step, and it uses the photos from `../albers/images/`. Serve the repository root with any static server and open `escher/`.

The studio name and copy are invented placeholders, and names and addresses are bracketed placeholders.
