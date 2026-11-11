# Nevelson: block settings beside the block

A WordPress plugin that tries out [Judd](../judd/)'s popovers in the real editor. In Judd, when you click something on the page, its settings open in a card beside it. Nevelson does the same with the block's toolbar and inspector. By the block, the toolbar keeps only the basics: the drag handle and movers, the block's icon and name, formatting text, and a pencil. The pencil opens a floating panel next to the block, headed with the block's icon and name, with everything else: the toolbar's other tools along its top, alignment as panels, and the block's settings below. It follows the block as you scroll. There's no sidebar: the page's own settings are a **Page** tab in the Document overview on the left, beside List View and Outline.

It's the editor's own block inspector, moved, not a copy: every panel, tab and control is the same, including those added by other plugins.

Requires WordPress 7.0 or later. Developed and tested on WordPress 7.1 with Twenty Twenty-Five, in the post editor and the site editor.

![A paragraph selected: the drag handle and movers just left of the block, then a toolbar with the paragraph's icon and name, bold, italic, link, more, a pencil and the options menu](docs/screenshots/00-basics.jpg)

![With the pencil pressed: the paragraph's toolbar still above it, and a white card to its right, level with the toolbar, headed with the paragraph's icon and name and showing its styles](docs/screenshots/01-beside.jpg)

## Try it

**[Try the live demo](https://automattic.github.io/site-editing-experiments/nevelson/)**, or **[open it full screen in WordPress Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/Automattic/site-editing-experiments/trunk/nevelson/blueprint.json)**: a fresh, throwaway WordPress in your browser with Nevelson active and a sample page open in the editor. Give it a minute to start. Nothing is saved: closing or reloading the tab starts over.

The link runs [`blueprint.json`](blueprint.json), which installs the plugin straight from this repo's `trunk`. On any site with Nevelson active, `/wp-admin/?nevelson-sample` makes the same sample page and opens it: a few blocks in the content width, then three full-width Twenty Twenty-Five patterns, as they are when inserted from the inserter.

## The floating panel

- **By the block, the toolbar has only the basics.** The **drag handle** (on the far left) and the **movers** sit just outside the block's left edge, apart from the toolbar; with no room there, as for a full-width block, they go back in the toolbar, at its far left. The toolbar has the **block's icon and name**, with a chevron: one button that opens the list of blocks to turn it into, below it (or above, near the bottom of the screen), with the block's styles at the top of the list, above the blocks (blocks that can't be turned into others get the name without the chevron), **formatting text** (bold, italic, link and the formatting menu, for blocks with text) and a **pencil**. Everything else that's usually in the toolbar (alignment, the block's own tools such as Replace, and the options menu) is in the panel. The parent block's button is gone: it doesn't help, and the panel shows the parent block anyway.
- **The pencil opens the panel.** Its heading is the block's icon and name, with the block's description as its title text (hover over it), so the settings below don't repeat them. The tools that aren't in the block's toolbar are part of its settings, like any others. What the block does is in the Settings tab: an **Actions** panel lists them, each with its icon and name (for an image, Apply duotone filter, Link, Add text over image, Add caption, Upload to Media Library and Replace). How it looks and sits on the page is with its styles: **Alignment** and **Text alignment** are panels with every option showing at once, rather than toolbar dropdowns, where core's toolbar would offer them. They scroll with the rest of the settings, and close like any panel. A block with no actions, such as a paragraph, has no Settings tab of its own, as in core. The tabs have their names beside their icons, and with three tabs the panel is wider, so they fit. Pop-outs from the panel, such as duotone, a link or a colour picker, open to its side, level with what opened them, not over it. The block's toolbar stays by the block while the panel's open, with the pencil pressed: the panel goes beside both, so it never covers the toolbar, and its top is level with the toolbar's. Close the panel with × or the pencil. It stays open as you go from block to block, and isn't remembered: every visit starts with it closed.
- **Beside the block:** on the right if there's room, on the left if not, and over the right edge of the page for full-width blocks. Its top is level with the top of the block's toolbar (or the block's, when the toolbar is below it), unless that would take it off the screen, so it moves up for a block low on the page and stays in view when the block scrolls away. It never covers the block's toolbar.
- **It follows the block** as the page scrolls, as you type, and as things above it change size. If it's over the text you're typing in, it fades until you stop.
- **Drag it** by its top bar to put it somewhere else. It stays there for every block, until **Follow block** puts it back beside the selected one.
- **Several blocks** selected share one panel.
- **Pop-ups** in the panel, such as colour pickers, open over it.

![A full-width cover selected: its toolbar at its top left, and its settings over the right edge of the picture](docs/screenshots/02-wide.jpg)

![An image in a pattern selected, its toolbar above it and its Settings tab open beside: an Actions panel listing Apply duotone filter, Link, Add text over image, Add caption, Upload to Media Library and Replace, then Advanced](docs/screenshots/02-image-tools.jpg)

## Patterns are just blocks

In WordPress 7, blocks from a pattern or a template part are in a *section*, editable only in their content until you press Edit pattern, and a click in one selects the section first. That makes sense with settings in a sidebar, but not with them beside the block you clicked.

So Nevelson switches sections off. Patterns and template parts are editable straight away, like any other blocks: click a heading in a pattern and it's selected, with all of its own settings in the panel, and there's no Edit or Exit pattern button. Select the pattern's outer block, such as the cover, and you get the cover's settings. Synced patterns are as core has them, since changing one changes it everywhere it's used.

![A heading in the hero pattern selected, its toolbar above it: the panel shows Heading 2, with the heading's own settings](docs/screenshots/03-in-a-pattern.jpg)

## The page's settings

There's no sidebar and no Settings button. The page's settings (or the template's, in the site editor) are a **Page** tab (**Template** in the site editor) in the Document overview, the panel on the left that opens from the button beside undo and redo, alongside **List View** and **Outline**. That keeps the two sides apart: the left is for the whole page, and what's beside a block is for the block you clicked.

There's no Block tab, because the block's settings are always in the panel, and Page stays open as you select blocks. List View or Outline goes back to them, and closing the overview closes Page too. Opening the page's settings some other way, as with the keyboard shortcut, opens the overview at Page.

The editor opens with the overview closed.

![The Document overview on the left with List View, Outline and Page tabs, Page chosen and showing the page's status, link, template and the rest, while the paragraph's settings are in its panel on the right](docs/screenshots/04-page.jpg)

## On a narrow screen

When the canvas is narrower than 720px, there's no room beside anything, so the panel is a sheet along the bottom, as in [Cassatt](../cassatt/), up to half the screen tall and scrolling inside. Selecting a block under the sheet scrolls it up above it. Below 782px wide, WordPress shows the page's settings full screen, as usual.

![On a phone-sized screen: the list selected near the top, and its settings in a sheet along the bottom](docs/screenshots/05-sheet.jpg)

## How it works

The pencil is a `BlockControls` fill added to every block with the `editor.BlockEdit` filter, and whether the panel is open is in a small data store of Nevelson's own. Core's toolbar groups have no names in the page, so Nevelson also adds a hidden marker to the formatting group, and puts the block's name (core's `BlockTitle`) and a chevron inside core's block switcher button, through a portal, passing clicks on them on to the button; by the block, CSS hides every group but the formatting group, the icon and movers' group, the pencil's and the options menu, and moves the movers out to the left. Core flips the switcher's list above the button when it's tall; Nevelson pins it below, scrolling inside (or above, when the block is too near the bottom of the screen for most of the list to fit below, so it and its previews aren't squeezed against the bottom), and moves the block's styles from the end of the list to the start (in the page, not just how it looks, so the arrow keys follow it). While the panel's open, the tools the toolbar doesn't show stay in core's toolbar, but Nevelson positions them, each frame, over the place the Actions panel keeps for them in the settings (added, with the alignment panels, through core's `InspectorControls`, as a block adds its settings), one under another, clipped to the settings' scrolling area and hidden when the panel's closed or another tab's open, and gives each icon-only button its name (its `aria-label`) beside the icon; the panel is rendered in the editor's content area, a stacking context of its own, so the toolbar's popover can go over it. Each frame, the panel is placed beside the block and its toolbar together (with the handle and movers out to the left), so the two never overlap; while you type, core hides the toolbar, and the panel keeps to where it was so it doesn't jump. On a narrow screen, where the editor docks the toolbar at the top, they're shown there instead while the panel's open. The alignment panels are Nevelson's own ([`alignment.js`](src/editor/alignment.js)): they set the same `align` attribute and `typography.textAlign` style as core's dropdowns, and show only when core's toolbar has those dropdowns, which Nevelson then hides from the band. The heading uses core's `useBlockDisplayInformation`, and the block card in the settings is hidden.

The plugin renders the editor's [`BlockInspector`](https://github.com/WordPress/gutenberg/tree/trunk/packages/block-editor/src/components/block-inspector) in a fixed card over the editor, through a portal from a registered plugin, so it's inside the editor's providers and every `InspectorControls` fill finds it. The sidebar's Block tab is hidden, and whenever the editor switches to it, Nevelson switches back to the page's tab, so there's only ever one inspector.

Each frame, it reads the selected blocks' boxes in the canvas iframe and places the card with [`place.js`](src/editor/place.js), a small function with unit tests. It writes the position straight to the card's style, so following the block doesn't re-render the inspector.

Core's Document overview has no place for another tab, so the Page tab is a button Nevelson adds to its tab list, dressed as core's tabs are, in [`page-tab.js`](src/editor/page-tab.js). What it shows is the editor's own sidebar for the page, placed each frame over the overview's tab panel, under its tabs; Page is open whenever that sidebar is. While it's open, the overview's own panels are hidden and the line under its tabs moves under Page. Below WordPress' mobile breakpoint, where the overview and the sidebar each fill the screen, the page's settings open as core opens them.

Sections are switched off with two of core's editor settings, `disableContentOnlyForUnsyncedPatterns` and `disableContentOnlyForTemplateParts`, set with the `block_editor_settings_all` filter (core's command *Enable editing all patterns* sets the same two). A template part's blocks would still be behind an overlay until the template part was selected, so Nevelson gives `core/template-part` the `__experimentalDisableBlockOverlay` support.

## Questions it raises

- Most blocks have so many settings that the panel is taller than the space beside them and rises above the block. Should the panel show only the most-used settings, with the rest a click away?
- With sections off, nothing shows where a pattern begins and ends, or which pattern a block came from. Does anyone miss that?
- With the page's settings in the overview, the left is for the page and beside the block is for the block. Do people find Page there, without a Settings button? Or would they look for it from the document bar in the middle of the header, where the page's name is?
- Keyboard: there's no shortcut yet to move between the block and its panel, and nothing announces the panel when it appears.

## Developing

```sh
npm install
npm run build        # or npm start to rebuild on change
npx vitest run       # where the panel goes
```

The end-to-end smoke test drives the real editor through all of the above in a headless browser, in the post editor, the site editor and on a narrow screen:

```sh
npx @wp-playground/cli server --login --port=9400 \
  --mount=.:/wordpress/wp-content/plugins/nevelson
npm run test:e2e     # NEVELSON_SHOTS=shots to keep screenshots
```

(Activate the plugin first, or start the server with a blueprint that does.)
