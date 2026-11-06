# Morris: font and size in the block toolbar

Morris is a Gutenberg pull request rather than a static prototype: it adds a block's font and size to its toolbar, behind an experiment, so it can be tried on real blocks and real themes. **[Gutenberg PR](https://github.com/WordPress/gutenberg/pull/86248)**

It's what's left of [Escher](../escher/) and [Hepworth](../hepworth/)'s writing toolbar once the Write / Design switch is gone. With only the font and size added, the whole toolbar fits in 575px, so there's no need for a second mode. Nothing that's on the toolbar today is hidden or moved.

## Try it

**[Try it in Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/Automattic/site-editing-experiments/trunk/morris/blueprint.json)**. It installs the PR's latest build with the **Typography toolbar** experiment already on, and opens a sample post with a heading, paragraphs, a button and a spacer.

Locally, check out the `scruffian/write-mode-toolbar-add` branch of Gutenberg, build it, and turn on **Typography toolbar** under Gutenberg → Experiments.

## What's in it

![A heading's toolbar reading H2, Manrope, 28](screenshots/heading-toolbar.png)

Every block that supports a font family or a font size gets a **Font** and a **Size** button. Each one names what the block is shown in right now, not a generic label: this heading follows the theme, so it says **Manrope** and **28**. That default comes from global styles, looking at the element (h2), then the block, then the site.

### Font

![The font menu: Default, Manrope and Fira Code, each in its own typeface](screenshots/font-menu.png)

The theme's font families, each shown in its own typeface, after **Default**, which clears the block's own choice. Picking one saves its slug to `fontFamily`. A font set some other way, outside the presets, is named by the first family in its stack.

### Size

![The size menu: a custom size box and slider, then 28 - default and the theme's sizes, each shown at its size](screenshots/size-menu.png)

The theme's sizes as numbers, each shown at its real size. The first item, **28 - default**, names the size the theme gives this block and clears the block's own choice. Above them, a number box and a slider set a size of your own, from 8 to 160.

![A paragraph with a size of its own shows 22*](screenshots/custom-size.png)

A size of your own is marked with an asterisk. Presets save to `fontSize` and sizes of your own to `style.typography.fontSize`, never both.

### Which blocks

![A button's toolbar with Manrope and 22](screenshots/button-toolbar.png)

Anything with typography supports: headings, paragraphs, lists, quotes, buttons and so on.

![A spacer's toolbar, with no font or size](screenshots/spacer-toolbar.png)

Blocks without text, like the spacer, get neither.

### Keyboard

Alt+F10 moves to the toolbar, the arrow keys move between its tools, Enter opens a menu and Escape closes it, as for any other toolbar control.

## Open questions

- **Presets or anything?** Escher only offered the theme's presets, so every change stayed inside the design system. This offers a size of your own too, as Hepworth and the sidebar do. Is a free size on the toolbar too easy a way out of the theme?
- **Changing it everywhere.** Hepworth asked whether a new colour should apply to every heading, button or section. Here a font or size is for this block only; changing it site-wide still means Styles.
- **Font weight, line height and letter spacing** stay in the sidebar.
- **Narrow screens.** 575px is fine on a desktop, but not on a phone.
