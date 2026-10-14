# Squarespace-style site editor

A WordPress plugin that makes the site editor look and work like the Squarespace editor. Unlike the other experiments in this repo it isn't a static mockup: it runs inside a real site editor, on real blocks, and everything it does is saved as ordinary block markup and global styles.

Requires WordPress 6.8 or later and a block theme. Developed and tested against WordPress 7.1 with Twenty Twenty-Five.

## What it does

### A lighter editor

The site editor gets a light, canvas-first look: a white Website/Pages panel with dark text, a white header with a solid black **Save** button, the page title as a quiet pill in the middle, and no breadcrumb bar. The changes are CSS only and scoped to the site editor.

### Sections

Every top-level block on a page (or every block in Post Content, when the template is shown) is treated as a section, as in Squarespace:

- **Hover a section** to outline it, with its name in a tab at the top-left and a toolbar at the top-right: **Edit section**, **Section colours**, move up, move down, duplicate and delete. Deleting shows a snackbar with **Undo**.
- **Add section** buttons sit on the top and bottom edges of the hovered section. They open the section picker, with section types down the left (Hero, Features, Call to action, Text, Image, Gallery, Quote, Contact, FAQ, Team, Newsletter, Pricing, Freeform) and live previews on the right, plus **From your theme** for the theme's own patterns. An empty page shows one big **Add section** button instead.
- **Header and footer** template parts are labelled **Header · shown on every page** and **Footer · shown on every page**. They can be edited but not moved, duplicated or deleted, and you can't add sections above the header or below the footer.

Inserted sections are named after their type, so the tab reads "Hero" rather than "Group".

### Section colours and the site palette

Like Squarespace, the site has one five-colour palette (Lightest, Light, Accent, Dark, Darkest), and each section picks one of ten colour themes (Lightest 1 and 2, Light 1 and 2, Bright 1 and 2, Dark 1 and 2, Darkest 1 and 2) that assign those colours to its background, text, headings, links and buttons. Change the palette and every section follows.

The themes are block styles (`is-style-sse-dark-1` and so on) on Group, Cover, Columns and Freeform sections, so they also appear in the block's Styles panel, and they're plain CSS on the front end. Coloured sections sit flush against each other.

### Site Styles

A **Site Styles** panel (the brush in the header) drills into four areas, each writing to the user's global styles:

- **Fonts:** heading and paragraph fonts from the theme and Font Library, heading weight and paragraph size, with a preview.
- **Colours:** the five palette colours, eight ready-made palettes (Paper, Sand, Sage, Sky, Clay, Citrus, Mono, Night), and a colour theme for the site background.
- **Buttons:** shape (square, rounded, pill) and size.
- **Spacing:** section padding, content width and wide width.

**Reset site styles** clears everything the panel set. Changes save with the site editor's Save button and can be undone.

### Freeform sections (Fluid Engine)

The **Freeform section** block puts its contents on a snap grid, like Squarespace's Fluid Engine:

- 24 columns on desktop and 8 on mobile, with a visible grid while the section is selected.
- Drag a block by the handle on its top edge, and resize it from its corners and sides. It snaps to the grid as you go, with its size in columns and rows shown while you resize. Blocks can overlap; **Bring forward** and **Send backward** in the toolbar change which is on top.
- **Add block** (in the section and its toolbar) offers text, heading, image, button, quote, list, video and line, placed in the first free space.
- An image on its own fills its box and is cropped to it.
- **Mobile layout:** on mobile, blocks stack in reading order. Switch the editor preview to Mobile and move anything to start a separate mobile layout, which is then edited independently. **Reset mobile layout** in the inspector goes back to stacking.
- With the handle focused, arrow keys move a block one cell and Shift with arrow keys resizes it. The inspector also has column, row, width and height fields.

Placement is saved as CSS custom properties on each item (`--sse-c`, `--sse-r`, `--sse-w`, `--sse-h`, plus `--sse-m*` for mobile), so the front end needs only the block's stylesheet.

## Installing

The built files are committed, so the folder is a working plugin:

1. Copy or symlink `squarespace-style-site-editor/` into `wp-content/plugins/`.
2. Activate **Squarespace-style Site Editor (experiment)**.
3. Open **Appearance → Editor**.

To try it without a local site, [WordPress Playground](https://wordpress.github.io/wordpress-playground/) works:

```sh
npx @wp-playground/cli server --login \
  --mount=./squarespace-style-site-editor:/wordpress/wp-content/plugins/squarespace-style-site-editor
```

Then activate the plugin from the Plugins screen.

## Developing

```sh
npm install
npm run build      # or npm start to watch
npm test           # pattern validity and grid maths
npm run lint:js
npm run lint:css
```

The tests check every section pattern against core's current `save()` output (so none open with "This block contains unexpected or invalid content") and cover the grid snapping and placement maths.

| Path | What's there |
| --- | --- |
| `squarespace-style-site-editor.php` | Bootstrap: blocks, editor assets, body class |
| `inc/section-themes.php` | Palette, the ten section themes and their CSS |
| `inc/patterns.php`, `patterns/` | Section categories and patterns |
| `src/editor/` | Section chrome, section picker, Site Styles panel, editor look |
| `src/canvas/` | Styles for the section chrome inside the canvas iframe |
| `src/fluid-section/`, `src/fluid-item/` | The Freeform section blocks |
| `src/shared/` | Grid maths and the Add block menu |

Set the `sse_load_editor_ui` filter to true to load the editor UI on other screens, such as the post editor.

## Known gaps

- The editor look is CSS over core class names, so it may need adjusting as the site editor changes.
- Section toolbars don't stay in view while you scroll through a very tall section.
- Fonts in Site Styles preview in the editor's own font until the theme's font faces have loaded.
- Freeform items grow taller than their rows if their text doesn't fit, rather than clipping.

## Credits

The placeholder studio, copy and photos are shared with the [Section editing modes](../section-editing-modes/) prototype. The photos are from [Unsplash](https://unsplash.com), used under the [Unsplash License](https://unsplash.com/license), and resized for the plugin.
