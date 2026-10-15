# Mobile section editing

A phone-first take on the [section editing modes](../section-editing-modes/) mockup. On a phone it fills the screen. On a larger screen it shows inside a phone-sized frame, with a short introduction beside it.

## How it works

There's no hover on a phone, so everything starts with a tap, and the tools live at the bottom of the screen within thumb reach.

- **Tap a section** to select it. It gets a blue outline and a name tab, and a toolbar docks at the bottom of the screen: **Layout**, **Content**, **Arrange**, **Add** and **More**.
- **Layout** opens a bottom sheet over the lower half of the screen, so the section stays visible above it. You swipe sideways through live previews of the section's mobile layouts, and a **Colours** row below switches palettes (Default, Sand, Sage, Sky, Clay and Night). **Reset** undoes changes made since the sheet opened, and **Done** closes it.
- **Content** turns text into tap-to-type fields. Tapping a photo opens a sheet where you can choose a photo from your device, pick a sample photo, or remove it. The bin in the toolbar removes whichever item you're editing.
- **Arrange** replaces Freeform. Tap an item, then move it up or down within the stack, or remove it. Free positioning doesn't translate to a single-column phone layout, so the toolbar notes that it's available on larger screens.
- **Add** opens a sheet with things to add to the section (headings, paragraphs, buttons, images, cards, plans or questions, depending on the section) and a grid of section types to add below it.
- **More** moves the section up or down, duplicates it, or deletes it. Removing an item or deleting a section shows a message with **Undo**.

The header and footer are shared across the whole site. Their tab reads **Header · shown on every page**, every sheet says **You're editing the header on every page of your site**, and they can't be moved, duplicated or deleted.

**Reset** in the top bar reloads the original page.

## Sections and mobile layouts

| Section | Layouts |
| --- | --- |
| Header | Links beside logo, Links below logo, Centred |
| Hero | Image on top, Text on top, Text over image |
| Features | Stacked cards, Swipe through, Compact list |
| Gallery | Two across, One per row, Swipe through |
| Quote | Centred, Left aligned, Dark band |
| Pricing | Stacked, Swipe through, Compact |
| FAQ | Cards, Plain list, Numbered |
| Newsletter | Panel, Plain, Dark band |
| Call to action | Panel, Plain, Dark banner |
| Contact | Image on top, Image below, Card over image |
| Footer | Stacked, Two columns, Centred |

## Running it

It's plain HTML, CSS and JavaScript with no build step, and it uses the photos from `../section-editing-modes/images/`. Serve the repository root with any static server and open `mobile-section-editing/`.

The studio name and copy are invented placeholders, and names, prices and contact details are bracketed placeholders. Photos chosen from your device stay in the browser and aren't uploaded anywhere.
