# Cassatt: mobile section editing

A phone-first take on the [Albers](../albers/) (section editing modes) mockup. On a phone it fills the screen. On a larger screen it shows inside a phone-sized frame, with a short introduction beside it.

## How it works

There's no hover on a phone, so everything starts with a tap, and the tools live at the bottom of the screen within thumb reach.

- **Tap a section** to select it. It gets a blue outline and a name tab, and a toolbar docks at the bottom of the screen: **Layout**, **Content**, **Arrange**, **Add** and **More**.
- **Layout** opens a bottom sheet over the lower half of the screen, so the section stays visible above it. You swipe sideways through live previews of the section's mobile layouts, and a **Colours** row below switches palettes (Default, Sand, Sage, Sky, Clay and Night). **Reset** undoes changes made since the sheet opened, and **Done** closes it.
- **Content** turns text into tap-to-type fields. Tapping a photo opens a sheet where you can choose a photo from your device, pick a sample photo, or remove it. The bin in the toolbar removes whichever item you're editing.
- **Arrange** replaces Freeform with drag and drop. On a phone a swipe still scrolls, so you press and hold an item to pick it up; on a computer you just drag it. A copy of the item follows your finger or pointer, above everything else so nothing can cut it off, the others slide out of the way, and a dashed slot shows where it'll land. Dragging near the top or bottom of the screen scrolls, as far as the end of the items. Each move shows a message with **Undo**, and the toolbar's arrows and bin still move or remove the selected item.
- **Add** opens a sheet with things to add to the section (headings, paragraphs, buttons, images, cards, plans or questions, depending on the section) and a grid of section types to add below it.
- **More** moves the section up or down, duplicates it, or deletes it. Removing an item or deleting a section shows a message with **Undo**.

**Tools** under the top bar switches where the editing tools appear, so the approaches can be compared on a real phone:

- **Bottom** docks the toolbar along the bottom of the screen, within thumb reach, and keeps it in the same place whichever section is selected.
- **Top of section** puts the toolbar along the top of the selected section, labelled with the section's name. It sticks to the top of the screen as you scroll through a tall section.
- **Right of section** puts the tools in a narrow column down the right-hand side of the section, kept in the middle of the part of the section that's on screen.

On the section, the section makes room for the toolbar so it doesn't cover anything, and sheets still open from the bottom. The choice is remembered in the browser, and `?tools=section` or `?tools=right` opens the page with that choice.

**Phone | Desktop** in the top bar is for building a site on a phone that also looks good on a big screen. **Desktop** lays the same page out at desktop width, keeping every edit, layout and colour. Every mobile layout has a matching desktop arrangement, and the Layout sheet shows it under each option (for example, "Stacked cards" becomes three columns on desktop).

- **On a phone**, the desktop view is a zoomed-out preview. Tapping a section goes back to the phone view with that section selected.
- **On a computer**, the desktop view is a full-size editor using the same tools, in a bar at the bottom of the selected section. The section makes room for it, and it sticks to the bottom of the window while the end of a tall section is out of view:
  - Hovering a section outlines it and shows its name. Clicking selects it, and the bar names the section it's editing.
  - **L**, **C** and **A** switch to Layout, Content and Arrange. **Esc** steps back out.
  - Layout opens a tray in place of the bar with every layout side by side, named for desktop, with the phone version under each.
  - Add, More and photo choices open as panels just above the bar. The Layout tray opens at the bottom of the window.

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

It's plain HTML, CSS and JavaScript with no build step, and it uses the photos from `../albers/images/`. Serve the repository root with any static server and open `cassatt/`.

The studio name and copy are invented placeholders, and names, prices and contact details are bracketed placeholders. Photos chosen from your device stay in the browser and aren't uploaded anywhere.
