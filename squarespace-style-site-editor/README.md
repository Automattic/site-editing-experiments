# Squarespace-style site editor

A WordPress plugin that makes the site editor look and work like the Squarespace editor. Unlike the other experiments in this repo it isn't a static mockup: it runs inside a real site editor, on real blocks, and everything it does is saved as ordinary block markup and global styles.

Requires WordPress 6.8 or later and a block theme. Developed and tested against WordPress 7.1 with Twenty Twenty-Five.

## What it does

The details follow Squarespace's editor (version 7.1, checked in October 2026): its section menu, Add a Section picker, Edit section panel, Fluid Engine and Site Styles.

### Editor chrome

- **Browse mode** shows the site in a white Website/Pages panel, with an **Edit** button on the preview.
- **Edit mode** starts canvas first, with the settings sidebar closed. **Save** and **Exit** sit at the left of the top bar (Save stays grey until there's something to save), the page title is in the middle, and a desktop/mobile switch is on the right. Save and Exit use core's own save and back buttons, so saving works exactly as before.

### Sections

Every top-level block on a page (or every block in Post Content, when the template is shown) is a section:

- **Hover a section** to outline it in blue, with a small tag on its top edge naming its type (INTRO, FEATURES…) and a menu at its top right: **Edit section**, **View layouts**, a row of duplicate, save, move up and move down, and a red **Remove**. Remove shows a snackbar with **Undo**. In a tall section the menu stays in view as you scroll.
- **Add section** buttons sit in the middle of the hovered section's top and bottom edges. An empty page shows one **Add section** button.
- **Header and footer** read **Header · shown on every page** and **Footer · shown on every page**, offer **Edit header**/**Edit footer**, and can't be moved, duplicated or removed.

#### Add a Section

The picker has **Add Blank** (an empty freeform section) and **Saved** (sections saved with the heart) at the top, then section types under headings: **Introduce** (Intro, About, Contact, Team, FAQs), **Sell** (Pricing, Call to action, Newsletter), **Showcase** (Features, Images, Gallery, Testimonials) and **More** (Freeform, and the theme's own patterns). Previews fill two columns at their natural height. Every section type has two or three layouts, 30 in all.

Inserted sections are named after their type, so their tag reads "Intro" rather than "Group".

#### Edit section

A panel beside the section's menu with three tabs:

- **Design:** row count (freeform sections), Fill screen, Full width, Section height (S, M, L) and an anchor link name.
- **Background:** add, replace or remove a background image.
- **Colors:** the section's colour theme, one row per theme, each drawn in its own colours.

#### View layouts

Lists the other layouts of the section's type, and swaps one in place, keeping the section's colour theme. Undo brings the old one back. It's hidden in the mobile preview.

#### Saving sections

The heart saves a section as an unsynced pattern, and it appears under **Saved** in the picker.

### Section colours and the site palette

The site has one five-colour palette (Lightest, Light, Accent, Dark, Darkest), and each section picks one of ten colour themes (Lightest 1 and 2, Light 1 and 2, Bright 1 and 2, Dark 1 and 2, Darkest 1 and 2) that assign those colours to its background, text, headings, links and buttons. Change the palette and every section follows.

The themes are block styles (`is-style-sse-dark-1` and so on) on Group, Cover, Columns and Freeform sections, so they're plain CSS on the front end. Coloured sections sit flush against each other.

### Site Styles

The brush in the top bar opens **Site Styles**: preview cards for **Themes**, **Fonts**, **Colours** and **Buttons**, and a **Spacing** row, each opening its own screen. Everything writes to the user's global styles, shows in the canvas straight away, saves with Save and can be undone.

- **Themes:** eight combinations of palette, button shape and heading weight, applied in one click.
- **Fonts:** a preview, **All font packs** (heading and paragraph pairings from the fonts available), a base size stepper, and heading font, paragraph font and heading weight.
- **Colours:** the palette, **Edit palette** for each of the five colours, eight recommended palettes, the section colour themes used on this page and the others, and the site background's theme. While Colours is open, each section in the canvas is tagged with its theme, as in Squarespace.
- **Buttons:** shape (square, rounded, pill) and size.
- **Spacing:** section padding, content width and wide width.

**Reset site styles** clears everything the panel set.

### Freeform sections (Fluid Engine)

The **Freeform section** block puts its contents on a snap grid:

- **Click a block** to select it (blue box, square handles), and drag it to move it. **Click again**, double-click or press Enter to edit what's inside. Drag a corner or edge handle to resize it. The 24-column grid (8 on mobile) shows while you move or resize, with the size in columns and rows. Blocks can overlap; **Bring forward** and **Send backward** in the toolbar change which is on top.
- **Add block** (top left of the section, beside a button that lists the section's blocks) opens a panel with a search field and **Essentials** tiles: Text, Heading, Image, Button, Quote, List, Video, Accordion and Line. Searching also finds any other block. New blocks go in the first free space.
- **The handle on the bottom edge** changes the section's height in rows; drag it, or focus it and use the up and down arrows.
- An image on its own fills its box and is cropped to it.
- **Mobile layout:** on mobile, blocks stack in reading order. In the Mobile preview, move anything to start a separate mobile layout, which is then edited independently. **Reset mobile layout** in the inspector goes back to stacking. Add block is hidden on mobile.
- **Keyboard:** with a block focused, arrow keys move it one cell and Shift with arrow keys resizes it. The inspector also has column, row, width and height fields.

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
npm run test:e2e   # the editor itself, in a headless browser (see below)
npm run lint:js
npm run lint:css
```

The unit tests check every section pattern against core's current `save()` output (so none open with "This block contains unexpected or invalid content") and cover the grid snapping and placement maths.

The end-to-end test drives the real site editor through the main flows: building a page from the section picker, the section menu, Edit section and View layouts, saving a section, freeform blocks (adding, dragging, editing, the rows handle and the first mobile drag), Site Styles, saving and reloading, editing the header, and the front end at desktop and phone widths. It needs a site with the plugin active, Twenty Twenty-Five and automatic login, which Playground gives you:

```sh
npx playwright install chromium   # once
npx @wp-playground/cli server --login --port=9400 \
  --mount=.:/wordpress/wp-content/plugins/squarespace-style-site-editor
npm run test:e2e
```

Set `SSE_BASE_URL` to test another site and `SSE_SHOTS` to a folder to keep screenshots. Each run adds a page and resets the theme's header.

| Path | What's there |
| --- | --- |
| `squarespace-style-site-editor.php` | Bootstrap: blocks, editor assets, body class |
| `inc/section-themes.php` | Palette, the ten section themes and their CSS |
| `inc/patterns.php`, `patterns/` | Section categories and patterns |
| `src/editor/` | Top bar, section menu and panels, Add a Section, Site Styles, editor look |
| `src/canvas/` | Styles for the section chrome inside the canvas iframe |
| `src/fluid-section/`, `src/fluid-item/` | The Freeform section blocks |
| `src/shared/` | Grid maths, the Add block panel and icons |

Set the `sse_load_editor_ui` filter to true to load the editor UI on other screens, such as the post editor.

## Known gaps

- The editor look is CSS over core class names, and Save, Exit and the device switch are placed into core's top bar markup, so they may need adjusting as the site editor changes.
- Squarespace's "Edit section" also offers section dividers, background video and per-section animation; this doesn't.
- Fonts in Site Styles preview in the editor's own font until the theme's font faces have loaded.
- Freeform items grow taller than their rows if their text doesn't fit, rather than clipping.

## Credits

The placeholder studio, copy and photos are shared with the [Section editing modes](../section-editing-modes/) prototype. The photos are from [Unsplash](https://unsplash.com), used under the [Unsplash License](https://unsplash.com/license), and resized for the plugin.
