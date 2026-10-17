# site-editing-experiments

Prototypes exploring site editing interactions. Each experiment lives in its own folder, named after an artist, in alphabetical order as they're added (Albers, Bourgeois, Cassatt, and so on). Most are plain HTML, CSS and JavaScript, served with GitHub Pages; WordPress plugins say so and explain how to run them.

## Experiments

- [Albers](albers/), section editing modes: add, move and delete sections, and hover a section to edit its layout from presets and add or remove items, edit its content in place, or move and resize items freely with grid and snap guides.
- [Bourgeois](bourgeois/), the Section Site Editor WordPress plugin: turns the real site editor into a section-by-section editor, with a section menu and Add a Section picker, Edit section and View layouts panels, ten section colour themes on a five-colour palette, Site Styles, and Freeform sections where you click and drag blocks on a snap grid, with a separate mobile layout.
- [Cassatt](cassatt/), mobile section editing: the same ideas reworked for phones. Tap a section to select it, then use the bottom toolbar and sheets to change its layout and colours, edit its content, drag items into a new order, and add, move, duplicate or delete sections. A Phone | Desktop switch shows the same page at desktop width, where it can be edited too.
- [Degas](degas/), Albers on real blocks, a WordPress plugin: hover a section in the editor for Edit layout (preset layouts with live previews, and colour palettes), Edit content (text and images in place, everything else locked) or Freeform (drag and resize on a grid with snap lines, saved on the blocks), plus Add, an Add section picker of twelve section types, and move, duplicate and delete. [Try it in Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/Automattic/site-editing-experiments/trunk/degas/blueprint.json).

## User test

- [Website editor study](study/): an unmoderated user test of Albers, Cassatt, Degas, Bourgeois and the plain site editor (Gutenberg). Each person does the same five tasks (change a heading, swap a photo and text, change a background, add a quote, remove a section) in three of the five editors, in a balanced rotation. The study detects when each task is done the same way in every editor, times it and asks how easy it was, then asks UMUX-Lite questions and which editor they'd prefer. Results can go to any endpoint and are read on a [results page](study/results.html). [Take it](https://automattic.github.io/site-editing-experiments/study/).
