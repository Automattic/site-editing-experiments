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

**Tools** under the top bar switches where the editing tools appear, so the two approaches can be compared on a real phone:

- **At the bottom** docks the toolbar along the bottom of the screen, within thumb reach, and keeps it in the same place whichever section is selected.
- **On the section** puts the toolbar on the selected section, labelled with the section's name. The section makes room for it at the top so it doesn't cover anything, and it sticks to the top of the screen as you scroll through a tall section. Sheets still open from the bottom.

The choice is remembered in the browser, and `?tools=section` opens the page with tools on the section.

**Phone | Desktop** in the top bar is for building a site on a phone that also looks good on a big screen. **Desktop** lays the same page out at desktop width (1280px) and zooms out to fit the phone, keeping every edit, layout and colour. Tapping a section in the desktop preview goes back to the phone view with that section selected. Every mobile layout has a matching desktop arrangement, and the Layout sheet shows it under each option (for example, "Stacked cards" becomes three columns on desktop).

The header and footer are shared across the whole site. Their tab reads **Header · shown on every page**, every sheet says **You're editing the header on every page of your site**, and they can't be moved, duplicated or deleted.

**Reset** in the top bar reloads the original page.

## Sections and layouts

Each mobile layout is followed by its desktop arrangement in brackets.

| Section | Layouts |
| --- | --- |
| Header | Links beside logo (logo left, links right), Links below logo (links under the logo), Centred (centred) |
| Hero | Image on top (image left, text right), Text on top (text left, image right), Text over image (full-width image) |
| Features | Stacked cards (three columns), Swipe through (a row of cards), Compact list (two-column list) |
| Gallery | Two across (three across), One per row (two large across), Swipe through (one long row) |
| Quote | Centred, Left aligned, Dark band |
| Pricing | Stacked (side by side), Swipe through (side by side), Compact (rows) |
| FAQ | Cards (two columns of cards), Plain list (one narrow column), Numbered (two numbered columns) |
| Newsletter | Panel (text and form side by side), Plain (centred), Dark band (dark, side by side) |
| Call to action | Panel (centred panel), Plain (centred), Dark banner (button on the right) |
| Contact | Image on top (text left, image right), Image below (image left, text right), Card over image (card over a wide image) |
| Footer | Stacked (columns in a row), Two columns (brand beside two columns), Centred (centred) |

## Running it

It's plain HTML, CSS and JavaScript with no build step, and it uses the photos from `../section-editing-modes/images/`. Serve the repository root with any static server and open `mobile-section-editing/`.

The studio name and copy are invented placeholders, and names, prices and contact details are bracketed placeholders. Photos chosen from your device stay in the browser and aren't uploaded anywhere.
