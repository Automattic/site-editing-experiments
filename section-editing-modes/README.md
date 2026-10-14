# Section editing modes

A clickable mockup exploring three ways to edit a section of a page. Hover any section to get an overlay with three choices in a bar at the top of the section:

- **Edit layout:** a floating panel at the top of the section offers preset arrangements, each previewed with a live miniature of the section's current content, and the section changes underneath as you pick. As you add content, the layouts adapt to fit it, and extra layouts appear when there's enough content for them (marked with a blue dot): Image row once the hero has two images, Four columns once Features has four cards, Two text columns once a Text section has three paragraphs, and Four across once a gallery has eight photos. Every item gets a bin button to remove it, and **Restore removed** appears in the panel once you've taken something out. Clicking anywhere other than the layouts panel or the bins closes Edit layout and returns to the normal overlay.
- **Edit content:** text becomes click-to-edit and each image gets a "Replace image" button. Nothing can be moved.
- **Freeform:** every item can be dragged anywhere and resized, and text and images are locked. Click an item to select it: images and cards get handles on every side and corner, and text gets left and right handles so it reflows. While you move or resize:
  - A 12-column grid and centre line show behind the content.
  - Pink snap lines appear when an item's edge or centre lines up with another item, the section centre or the content edges.
  - The **Grid** and **Snap** buttons in the small bar at the top of the section turn each of these off, and **Reset** puts the section's positions and sizes back.

## Adding and arranging sections

- **Add to a section:** hover it and click **Add** in its top-left corner, next to its name, for a menu of things that suit that section, such as a heading, paragraph, button, image or card.
- **Add a section:** hover a section and click one of the **Add section** buttons on its top or bottom edge. A space opens between the sections with a picker of eight section types, all in one row: Hero, Features, Call to action, Text, Image, Gallery, Quote and Contact; **Cancel** closes it again. New sections start with placeholder copy and photos, and work with every editing mode.
- **Move a section:** hover it and use the up and down arrows in the toolbar in its top-right corner.
- **Duplicate a section:** use the copy button in the same toolbar. The copy appears below the original with the same text, photos, layout, positions and sizes.
- **Delete a section:** use the bin at the end of the toolbar. A message at the bottom of the page lets you undo it.

The page ends with a site footer (brand, links, and placeholder visit and contact details); it isn't one of the editable sections.

Only one section is in a mode at a time. **Done** leaves the mode, and **Reset everything** in the top bar reloads the original page.

## Sections and layouts

| Section | Layouts |
| --- | --- |
| Hero | Split, Centered, Image left |
| Features | Three columns, Stacked list, Featured + two |
| Call to action | Centered, Split, Dark banner |
| Text | Single column, Centered, Two columns |
| Image | Contained, Full width, With caption |
| Gallery | Three across, Two across, Mosaic |
| Quote | Centered, Left aligned, Dark band |
| Contact | Split, Stacked, Card |

## Running it

It's plain HTML, CSS and JavaScript with no build step. Open `index.html` in a browser or serve the folder with any static server.

## Credits

The studio name and copy are invented placeholders. The photos are from [Unsplash](https://unsplash.com) and used under the [Unsplash License](https://unsplash.com/license):

| File | Unsplash photo ID |
| --- | --- |
| `images/wheel-studio.jpg` | photo-1676125105332-608345abe20e |
| `images/shelves.jpg` | photo-1484632152040-840235adc262 |
| `images/mugs-rack.jpg` | photo-1563696629964-8c3ce077cf3e |
| `images/throwing.jpg` | photo-1760018890645-28c8312cd7cb |
| `images/bowls.jpg` | photo-1577576223085-3eb295cd414f |
| `images/bowls-white.jpg` | photo-1610701596007-11502861dcfa |
