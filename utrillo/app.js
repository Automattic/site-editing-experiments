/*
 * Utrillo · Selecting the section around what you clicked
 *
 * One simplified site editor, four arms. People click what they can see (a
 * paragraph, a picture) and the editor selects that innermost block. Then they
 * have to find how to select the section around it, the Group, Columns, Column
 * or Cover, to move it, change its background or delete it.
 *
 * This file is everything the four arms share: the page, the editor around it
 * (toolbar, inspector, breadcrumb, Document Overview, undo), the tasks, the
 * log, the facilitator panel and the completion code. It also keeps every one
 * of the editor's own routes to a parent block, in every arm:
 *
 *   toolbar     the Select parent block button in the block toolbar
 *   menu        Select parent block in the toolbar's ⋮ menu
 *   breadcrumb  an item in the breadcrumb under the canvas
 *   listview    a row in Document Overview (List View)
 *   padding     a click that lands on a container's own area: its padding,
 *               the gap between columns, a column's empty space
 *
 * The control (control.html) is this file alone. Each other arm adds its own
 * thing in its own file under variants/, using only the API at the end of
 * this file (window.Utrillo.registerVariant):
 *
 *   hover-tab         A: containers under the pointer get a name tab to click
 *   layers            D: each section has a Layers button with its block tree
 *   create-not-learn  E: as the Create not Learn prototype: section-first
 *                     clicks, and its parent selector, with a "···" list of
 *                     every block further up (two changes, not one)
 *
 * Each HTML page picks its arm with <body data-variant="…">.
 *
 * Add ?notes (or #notes) to the address for the facilitator panel: the tasks,
 * the counts and a log of what the person did, with times since the page
 * opened. Everything is kept in memory, so reloading the page starts again.
 */
(function () {
  'use strict';

  const ARMS = {
    control: { code: 'UC', letter: 'Control', file: 'control.html', route: null, title: 'Control', name: 'Control: the editor as it is today, with nothing added' },
    'hover-tab': { code: 'UA', letter: 'A', file: 'hover-tab.html', route: ['tab', 'tree'], title: 'A · Hover tab', name: 'A · Hover tab: the containers under the pointer are outlined, each with a name tab that selects it' },
    layers: { code: 'UD', letter: 'D', file: 'layers.html', route: 'layers', title: 'D · Layers', name: 'D · Layers: each section has a Layers button that lists its blocks to pick from' },
    'create-not-learn': { code: 'UE', letter: 'E', file: 'create-not-learn.html', route: ['click', 'lineage'], title: 'E · As Create not Learn', name: 'E · As Create not Learn: the first click selects the section, the next goes in a level, and the parent selector has a “···” list of every block further up' }
  };
  const ARM = ARMS[document.body.dataset.variant] ? document.body.dataset.variant : 'control';
  const NOTES = new URLSearchParams(location.search).has('notes') || location.hash === '#notes';

  // The routes to a container that are counted, in the order the completion
  // code lists them. The last one is the arm's own (none for the control).
  const CORE_ROUTES = ['toolbar', 'menu', 'breadcrumb', 'listview', 'padding'];
  const ARM_ROUTES = ['tab', 'tree', 'layers', 'click', 'lineage'];
  const ROUTE_NAME = {
    toolbar: 'the toolbar’s Select parent block button',
    menu: 'Select parent block in the ⋮ menu',
    breadcrumb: 'the breadcrumb',
    listview: 'Document Overview',
    padding: 'a click on its own area (padding, gap or empty space)',
    tab: 'a hover tab',
    tree: 'the section’s block list, from the block name in the toolbar',
    layers: 'the Layers popover',
    click: 'a section-first click (the section, then a row of cards)',
    lineage: 'the “···” list of blocks further up'
  };

  // ---------- Icons: the editor's own, copied from @wordpress/icons 20 ----------

  const ICONS = {
    cover: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M20.25 18.75V5.25C20.25 4.42157 19.5784 3.75 18.75 3.75H5.25C4.42157 3.75 3.75 4.42157 3.75 5.25V18.75C3.75 19.5784 4.42157 20.25 5.25 20.25H18.75C19.5784 20.25 20.25 19.5784 20.25 18.75Z"></path><path d="M11.5 13.4V3.75H16.5V13.4L14 10.3L11.5 13.4Z" fill="currentColor" stroke="none"></path></svg>',
    group: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M4.75 11C4.75 10.3096 5.30964 9.75 6 9.75H13C13.6904 9.75 14.25 10.3096 14.25 11V18C14.25 18.6904 13.6904 19.25 13 19.25H6C5.30964 19.25 4.75 18.6904 4.75 18V11Z"></path><path d="M9.75 6C9.75 5.30964 10.3096 4.75 11 4.75H18C18.6904 4.75 19.25 5.30964 19.25 6V13C19.25 13.6904 18.6904 14.25 18 14.25H11C10.3096 14.25 9.75 13.6904 9.75 13V6Z"></path></svg>',
    columns: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M14.75 5.75H19C19.6904 5.75 20.25 6.30964 20.25 7V17C20.25 17.6904 19.6904 18.25 19 18.25H14.75M14.75 5.75V18.25M14.75 5.75H9.25M14.75 18.25H9.25M9.25 18.25H5C4.30964 18.25 3.75 17.6904 3.75 17V7C3.75 6.30964 4.30964 5.75 5 5.75H9.25M9.25 18.25V5.75"></path></svg>',
    column: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M14.75 5.75H19C19.6904 5.75 20.25 6.30964 20.25 7V17C20.25 17.6904 19.6904 18.25 19 18.25H14.75M14.75 5.75V18.25M14.75 5.75H9.25M14.75 18.25H9.25M9.25 18.25H5C4.30964 18.25 3.75 17.6904 3.75 17V7C3.75 6.30964 4.30964 5.75 5 5.75H9.25M9.25 18.25V5.75"></path><path d="M14.75 18.25V5.75H9.25V18.25H14.75Z" fill="currentColor"></path></svg>',
    heading: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M6.75 5.25H17.25V16.375L12 12L6.75 16.375V5.25Z" fill="currentColor"></path></svg>',
    paragraph: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M10.75 20V4.75L14.75 4.75M14.75 20V4.75M14.75 4.75H18.5"></path><path d="M5.75 9C5.75 11.3472 7.65279 13.25 10 13.25H10.75V4.75H10C7.65279 4.75 5.75 6.65279 5.75 9Z" fill="currentColor"></path></svg>',
    image: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M19.25 14.2513L16.0707 11.0707C16.0317 11.0317 15.9683 11.0317 15.9293 11.0707L12.0584 14.9416C12.0245 14.9755 11.9713 14.9806 11.9316 14.9537L8.65791 12.7392C8.62313 12.7156 8.57736 12.7163 8.54332 12.7409L4.75 15.4808M19.25 14.2513V6C19.25 5.30964 18.6904 4.75 18 4.75H6C5.30964 4.75 4.75 5.30964 4.75 6V15.4808M19.25 14.2513V18C19.25 18.6904 18.6904 19.25 18 19.25H6C5.30964 19.25 4.75 18.6904 4.75 18V15.4808"></path></svg>',
    buttons: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M9.5 7.25H14.5M9.5 16.75H14.5M7 19.75H17C17.6904 19.75 18.25 19.1904 18.25 18.5V15C18.25 14.3096 17.6904 13.75 17 13.75H7C6.30964 13.75 5.75 14.3096 5.75 15V18.5C5.75 19.1904 6.30964 19.75 7 19.75ZM7 10.25H17C17.6904 10.25 18.25 9.69036 18.25 9V5.5C18.25 4.80964 17.6904 4.25 17 4.25H7C6.30964 4.25 5.75 4.80964 5.75 5.5V9C5.75 9.69036 6.30964 10.25 7 10.25Z"></path></svg>',
    button: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M8 11.75H16M5 16.25H19C19.6904 16.25 20.25 15.6904 20.25 15V8.5C20.25 7.80964 19.6904 7.25 19 7.25H5C4.30964 7.25 3.75 7.80964 3.75 8.5V15C3.75 15.6904 4.30964 16.25 5 16.25Z"></path></svg>',
    listView: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M10 17.5H21M6.5 12H17.5M3 6.5H14" stroke-linejoin="round"></path></svg>',
    undo: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M8.25 15L4.75 11L8.25 7M4.75 11H15.25C18.25 11 18.5 13.8 18.5 17"></path></svg>',
    redo: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M15 15L18.5 11L15 7M18.5 11H8C5 11 4.75 13.8 4.75 17"></path></svg>',
    chevronUp: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M7 13L12 9L17 13"></path></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M7 11L12 15L17 11"></path></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M14 6.5L9 12L14 17.5"></path></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M10 6.5L15 12L10 17.5"></path></svg>',
    chevronRightSmall: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M10.5 8.5L13.5 12L10.5 15.5"></path></svg>',
    chevronDownSmall: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M8.5 10.5L12 13.5L15.5 10.5"></path></svg>',
    moreVertical: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M11.75 18.25L12.25 18.25L12.25 17.75L11.75 17.75L11.75 18.25Z" fill="currentColor" stroke="none"></path><path d="M11.75 12.25L12.25 12.25L12.25 11.75L11.75 11.75L11.75 12.25Z" fill="currentColor" stroke="none"></path><path d="M11.75 6.25L12.25 6.25L12.25 5.75L11.75 5.75L11.75 6.25Z" fill="currentColor" stroke="none"></path><path d="M11.75 18.25L12.25 18.25L12.25 17.75L11.75 17.75L11.75 18.25Z"></path><path d="M11.75 12.25L12.25 12.25L12.25 11.75L11.75 11.75L11.75 12.25Z"></path><path d="M11.75 6.25L12.25 6.25L12.25 5.75L11.75 5.75L11.75 6.25Z"></path></svg>',
    close: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M5 19L19 5M19 19L5 5"></path></svg>',
    plus: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 18V6M18 12H6"></path></svg>',
    minus: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M5 12H19"></path></svg>',
    check: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M7 12L10 15L17 8"></path></svg>'
  };

  // Headings show their level, as the editor's heading variations do:
  // "Heading 2" with the H2 icon, in the toolbar, inspector, breadcrumb and
  // Document Overview.
  const HEADING_ICONS = { 1: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M18.75 18.75C18.75 17.9056 18.75 11.963 18.75 9.5L15.75 10.3056"></path><path d="M3.75 12H11.75M3.75 12V6M3.75 12L3.75 18M11.75 12V6M11.75 12V18" stroke-linecap="square"></path></svg>', 2: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M3.75 12H11.75M3.75 12V6M3.75 12L3.75 18M11.75 12V6M11.75 12V18" stroke-linecap="square"></path><path d="M20.3915 17.9989H16C16 13.4611 20.5 14.6523 20.5 11.2489C20.5 9.54722 18.1957 8.04722 16 9.7489" stroke-linecap="square"></path></svg>', 3: '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M3.75 12H11.75M3.75 12V6M3.75 12L3.75 18M11.75 12V6M11.75 12V18" stroke-linecap="square"></path><path d="M15.5 17.2434C18 18.9138 20.5 17.5775 20.5 15.573C20.5 14.9823 20.2366 14.4158 19.7678 13.9981C19.2989 13.5805 18.663 13.3458 18 13.3458M18 13.3458C18.663 13.3458 19.2989 13.1112 19.7678 12.6935C20.2366 12.2758 20.5 11.7093 20.5 11.1186C20.5 9.44825 18.125 8.33466 16 9.44825M18 13.3458H17.75" stroke-linecap="square"></path></svg>' };

  // ---------- Block types: core's titles, icons and descriptions ----------

  const TYPES = {
    'core/cover': { title: 'Cover', icon: ICONS.cover, container: true, settings: 'overlay', description: 'Add an image or video with a text overlay.' },
    'core/group': { title: 'Group', icon: ICONS.group, container: true, settings: 'background', description: 'Gather blocks in a layout container.' },
    'core/columns': { title: 'Columns', icon: ICONS.columns, container: true, settings: 'columns', description: 'Display content in multiple columns, with blocks added to each column.' },
    'core/column': { title: 'Column', icon: ICONS.column, container: true, settings: 'background', horizontal: true, description: 'A single column within a columns block.' },
    'core/buttons': { title: 'Buttons', icon: ICONS.buttons, container: true, description: 'Prompt visitors to take action with a group of button-style links.' },
    'core/button': { title: 'Button', icon: ICONS.button, text: true, horizontal: true, description: 'Prompt visitors to take action with a button-style link.' },
    'core/heading': { title: 'Heading', icon: ICONS.heading, text: true, settings: 'background', description: 'Introduce new sections and organize content to help visitors (and search engines) understand the structure of your content.' },
    'core/paragraph': { title: 'Paragraph', icon: ICONS.paragraph, text: true, settings: 'background', description: 'Start with the basic building block of all narrative.' },
    'core/image': { title: 'Image', icon: ICONS.image, settings: 'alt', description: 'Insert an image to make a visual statement.' }
  };

  // The colour swatches in the inspector. Text turns light on the dark ones.
  const COLORS = [
    { slug: 'white', name: 'White', value: '#ffffff' },
    { slug: 'sage', name: 'Sage', value: '#e1eadc' },
    { slug: 'sand', name: 'Sand', value: '#f3e8d5' },
    { slug: 'sky', name: 'Sky', value: '#dce8f2' },
    { slug: 'clay', name: 'Clay', value: '#a95f45', dark: true },
    { slug: 'charcoal', name: 'Charcoal', value: '#2b302d', dark: true }
  ];
  const colorBySlug = (slug) => COLORS.find((c) => c.slug === slug);
  const colorName = (slug) => (slug ? colorBySlug(slug).name : 'none');

  // ---------- Pictures, drawn here so the page loads nothing else ----------

  const PICTURES = {
    hills: '<svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="ut-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4d6b9"/><stop offset="1" stop-color="#e3a589"/></linearGradient></defs><rect width="1200" height="600" fill="url(#ut-sky)"/><circle cx="880" cy="250" r="96" fill="#fbe8c8"/><path d="M0 410C200 330 380 350 560 392S900 318 1200 372V600H0Z" fill="#a3b8a0"/><path d="M0 470C240 410 460 462 700 442S1000 410 1200 462V600H0Z" fill="#738f79"/><path d="M0 536C300 500 600 556 900 524S1100 514 1200 534V600H0Z" fill="#4d6a58"/></svg>',
    studio: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Drawing of the studio: an arched window above mats on a wooden floor"><rect width="400" height="300" fill="#efe5d6"/><rect y="208" width="400" height="92" fill="#d6b893"/><path d="M140 176V98a60 60 0 0 1 120 0v78z" fill="#dce8f0" stroke="#fffaf2" stroke-width="8"/><path d="M200 40v136M140 120h120" stroke="#fffaf2" stroke-width="6"/><g transform="skewX(-28) translate(150 0)"><rect x="-30" y="226" width="96" height="22" rx="4" fill="#7f9a86"/><rect x="86" y="226" width="96" height="22" rx="4" fill="#c4886a"/><rect x="-46" y="262" width="96" height="22" rx="4" fill="#9db0c2"/><rect x="70" y="262" width="96" height="22" rx="4" fill="#7f9a86"/></g><rect x="322" y="170" width="34" height="40" rx="4" fill="#b7745a"/><ellipse cx="330" cy="150" rx="12" ry="26" fill="#6f8f78" transform="rotate(-20 330 150)"/><ellipse cx="348" cy="146" rx="12" ry="28" fill="#5d7c67" transform="rotate(18 348 146)"/></svg>',
    flow: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Drawing of gentle waves"><rect width="400" height="300" fill="#dfe8da"/><circle cx="318" cy="72" r="24" fill="#f2c8a6"/><g fill="none" stroke="#6f8f78" stroke-width="10" stroke-linecap="round"><path d="M36 136q41-40 82 0t82 0 82 0 82 0"/><path d="M36 184q41-40 82 0t82 0 82 0 82 0" opacity=".65"/><path d="M36 232q41-40 82 0t82 0 82 0 82 0" opacity=".35"/></g></svg>',
    stretch: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Drawing of a figure stretching in an arch"><rect width="400" height="300" fill="#dce7f0"/><rect y="236" width="400" height="64" fill="#c6d6e4"/><path d="M96 236Q200 54 304 236" fill="none" stroke="#56769a" stroke-width="20" stroke-linecap="round"/><circle cx="120" cy="196" r="17" fill="#56769a"/></svg>',
    breath: '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Drawing of circles spreading out, like a slow breath"><rect width="400" height="300" fill="#f3e7d3"/><g fill="none" stroke="#c4886a" stroke-width="8"><circle cx="200" cy="150" r="30"/><circle cx="200" cy="150" r="62" opacity=".6"/><circle cx="200" cy="150" r="94" opacity=".35"/><circle cx="200" cy="150" r="126" opacity=".18"/></g><circle cx="200" cy="150" r="12" fill="#c4886a"/></svg>'
  };

  // ---------- The starting page ----------

  // An invented yoga studio. Ids are readable so the tasks, the log and the
  // tests can name blocks; blocks added later get new ids.
  const b = (id, name, attrs, children) => ({ id, name, attrs: attrs || {}, children: children || [] });
  const START = () => [
    b('hero', 'core/cover', { overlay: 'charcoal', picture: 'hills' }, [
      b('hero-heading', 'core/heading', { level: 1, content: 'Breathe, stretch, rest' }),
      b('hero-text', 'core/paragraph', { content: 'Small classes for every body, in a quiet room above the bakery on Mill Lane.' }),
      b('hero-buttons', 'core/buttons', {}, [
        b('hero-button', 'core/button', { content: 'Book a class' })
      ])
    ]),
    b('about', 'core/group', { background: 'white', padding: 48 }, [
      b('about-columns', 'core/columns', {}, [
        b('about-col-picture', 'core/column', {}, [
          b('about-image', 'core/image', { picture: 'studio', alt: '' })
        ]),
        b('about-col-text', 'core/column', {}, [
          b('about-heading', 'core/heading', { level: 2, content: 'About the studio' }),
          b('about-text', 'core/paragraph', { content: 'Fernhill opened in 2019 with one room and twelve mats. Classes are kept small, so teachers know your name and can help you settle into each pose.' })
        ])
      ])
    ]),
    b('classes', 'core/group', { background: 'sage', padding: 48 }, [
      b('classes-heading', 'core/heading', { level: 2, content: 'Classes this week' }),
      b('classes-columns', 'core/columns', {}, [
        b('monday', 'core/column', {}, [
          b('monday-image', 'core/image', { picture: 'flow', alt: '' }),
          b('monday-heading', 'core/heading', { level: 3, content: 'Monday flow' }),
          // The typo is deliberate: it is task 1.
          b('monday-text', 'core/paragraph', { content: 'A gentle class for beginers, moving slowly from one pose to the next.' })
        ]),
        b('wednesday', 'core/column', {}, [
          b('wednesday-image', 'core/image', { picture: 'stretch', alt: '' }),
          b('wednesday-heading', 'core/heading', { level: 3, content: 'Wednesday stretch' }),
          b('wednesday-text', 'core/paragraph', { content: 'Long, slow stretches to loosen up after a day at a desk.' })
        ]),
        b('saturday', 'core/column', {}, [
          b('saturday-image', 'core/image', { picture: 'breath', alt: '' }),
          b('saturday-heading', 'core/heading', { level: 3, content: 'Saturday breath' }),
          b('saturday-text', 'core/paragraph', { content: 'Breathing and rest. Bring a blanket.' })
        ])
      ])
    ]),
    b('hours', 'core/group', { background: 'sand', padding: 48 }, [
      b('hours-heading', 'core/heading', { level: 2, content: 'Opening hours' }),
      b('hours-text', 'core/paragraph', { content: 'Monday to Friday, 7am to 9pm. Saturday, 9am to 1pm. Closed on Sundays.' })
    ]),
    b('contact', 'core/group', { background: 'white', padding: 32, small: true }, [
      b('contact-text', 'core/paragraph', { content: 'Fernhill Yoga · 4 Mill Lane, Ashby · 01632 960 418' })
    ])
  ];
  const START_HOURS_BACKGROUND = 'sand';
  // The blocks the page starts with. Only deleting or removing one of these
  // can be a wrong target: blocks the person added themselves don't count.
  const ORIGINAL = new Set();
  (function collect(list) { list.forEach((n) => { ORIGINAL.add(n.id); collect(n.children); }); })(START());

  // ---------- State ----------

  let tree;              // the page: a list of top-level blocks
  let selectedId;        // the selected block, or null
  let undoStack, redoStack;
  let textSession;       // the text being typed into: { id, before, pushed }
  let editingId;         // the block whose text has the caret, or null
  let expanded;          // Document Overview: the rows that are open
  let overviewOpen;
  let menuOpen;          // the ⋮ menu
  let toolbarHidden;     // while typing, as in the editor, until the pointer moves
  let pointerHoverId, explicitHighlightId;
  let newIds;
  let log, stats, startedAt, firstDone, ticked, doneNow, caretLanded, lastCanvasDown, emptiedFlagged;

  function reset() {
    if (held) { clearTimeout(held.timer); held = null; }
    tree = START();
    selectedId = null;
    undoStack = [];
    redoStack = [];
    textSession = null;
    editingId = null;
    expanded = new Set();
    overviewOpen = false;
    menuOpen = false;
    toolbarHidden = false;
    pointerHoverId = null;
    explicitHighlightId = null;
    newIds = 0;
    log = [];
    stats = {
      routes: { toolbar: 0, menu: 0, breadcrumb: 0, listview: 0, padding: 0, tab: 0, tree: 0, click: 0, layers: 0, lineage: 0 },
      wrong: 0,
      undos: 0,
      redos: 0,
      clicksBeforeCaret: 0,
      overviewOpened: 0,
      menuOpened: 0,
      arm: {},        // the arm's own counters, from api.count
      armLabels: {}
    };
    startedAt = Date.now();
    firstDone = [];
    ticked = [];
    doneNow = [];
    caretLanded = false;
    lastCanvasDown = -Infinity;
    emptiedFlagged = false;
  }

  // ---------- Helpers ----------

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const seconds = () => Math.round((Date.now() - startedAt) / 1000);
  function elapsed() {
    const s = seconds();
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  const short = (s, n) => { s = String(s || '').trim(); n = n || 32; return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

  // Where a block is: the block, the list it's in, its index there and its parent.
  function find(id, list, parent) {
    list = list || tree;
    for (let i = 0; i < list.length; i++) {
      const node = list[i];
      if (node.id === id) return { node, list, index: i, parent: parent || null };
      const found = find(id, node.children, node);
      if (found) return found;
    }
    return null;
  }
  const nodeOf = (id) => { const f = id ? find(id) : null; return f ? f.node : null; };
  const typeFor = (node) => {
    const t = TYPES[node.name];
    if (node.name === 'core/heading' && HEADING_ICONS[node.attrs.level]) {
      return Object.assign({}, t, { title: 'Heading ' + node.attrs.level, icon: HEADING_ICONS[node.attrs.level] });
    }
    return t;
  };
  const typeOf = (id) => { const n = nodeOf(id); return n ? typeFor(n) : null; };
  const isContainer = (id) => { const t = typeOf(id); return !!(t && t.container); };
  const isText = (id) => { const t = typeOf(id); return !!(t && t.text); };
  function ancestorsOf(id) {
    const out = [];
    let f = find(id);
    while (f && f.parent) { out.unshift(f.parent.id); f = find(f.parent.id); }
    return out;
  }
  const topLevelOf = (id) => { const a = ancestorsOf(id); return a.length ? a[0] : (find(id) ? id : null); };
  function walk(list, fn) { list.forEach((n) => { fn(n); walk(n.children, fn); }); }
  function firstText(node, name) {
    let found = null;
    walk([node], (n) => { if (!found && n.name === name && n.attrs.content) found = n.attrs.content; });
    return found;
  }

  // A short name for a block, for the log: its title and something to tell it
  // apart (its words, the heading inside it, or where it is).
  function describe(id) {
    const f = find(id);
    if (!f) return id;
    const t = typeFor(f.node);
    if (t.text) return t.title + ' “' + short(f.node.attrs.content) + '”';
    const hint = firstText(f.node, 'core/heading') || firstText(f.node, 'core/paragraph') || firstText(f.node, 'core/button');
    if (hint) return t.title + ' (“' + short(hint, 28) + '”)';
    return t.title + (f.parent ? ' in ' + describe(f.parent.id) : '');
  }
  const describeOr = (id, none) => (id ? describe(id) : none);

  // ---------- Events for the variants ----------

  const listeners = {};
  function emit(event, payload) {
    (listeners[event] || []).forEach((fn) => {
      try { fn(payload); } catch (err) { console.error(err); }
    });
  }

  // ---------- The log ----------

  function note(kind, text) {
    log.push({ at: elapsed(), kind, text });
    renderNotes();
  }

  function wrong(text) {
    stats.wrong++;
    note('wrong', 'Wrong target: ' + text);
  }

  let toastTimer = null;
  function toast(text) {
    let el = document.querySelector('.ut-toast');
    if (!el) { el = document.createElement('div'); el.className = 'ut-toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = text;
    el.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-shown'), 2500);
  }

  // ---------- Drawing the page ----------

  // Every block element carries data-block-id, data-block-name and
  // data-block-title, so variants and tests can find it. Text a person can
  // type into is a separate element inside it, .ut-rich, so the block can
  // have focus without the caret being in its text.
  function blockHTML(node) {
    const t = typeFor(node);
    const a = node.attrs;
    const kids = () => node.children.map(blockHTML).join('');
    const bg = a.background ? colorBySlug(a.background) : null;
    let cls = 'ut-block wp-block-' + node.name.split('/')[1];
    if (bg) cls += ' has-background has-' + bg.slug + '-background-color' + (bg.dark ? ' is-dark' : ' is-light');
    if (a.small) cls += ' is-small-text';
    const attrs = ' data-block-id="' + esc(node.id) + '" data-block-name="' + node.name + '" data-block-title="' + t.title + '" tabindex="-1" aria-label="Block: ' + t.title + '"';
    const style = bg ? ' style="--ut-bg:' + bg.value + (a.padding ? ';padding:' + a.padding + 'px' : '') + '"' : (a.padding ? ' style="padding:' + a.padding + 'px"' : '');
    const rich = (tag, extra) => '<' + tag + ' class="ut-rich' + (extra || '') + '" contenteditable="true" spellcheck="false" role="textbox" aria-multiline="false" aria-label="' + t.title + ' text" data-placeholder="Type / to choose a block">' + esc(a.content || '') + '</' + tag + '>';

    switch (node.name) {
      case 'core/cover': {
        const overlay = a.overlay ? colorBySlug(a.overlay) : null;
        const light = !overlay || !overlay.dark;
        return '<div class="' + cls + (light ? ' has-light-overlay' : '') + '"' + attrs + '>' +
          '<span class="wp-block-cover__image" aria-hidden="true">' + PICTURES[a.picture] + '</span>' +
          '<span class="wp-block-cover__overlay" aria-hidden="true"' + (overlay ? ' style="background:' + overlay.value + '"' : ' hidden') + '></span>' +
          '<div class="wp-block-cover__inner-container">' + kids() + '</div></div>';
      }
      case 'core/group':
      case 'core/columns':
      case 'core/buttons':
        return '<div class="' + cls + '"' + attrs + style + '>' + kids() + '</div>';
      case 'core/column':
        return '<div class="' + cls + (node.children.length ? '' : ' is-empty') + '"' + attrs + style + '>' + kids() + '</div>';
      case 'core/heading':
        return '<div class="' + cls + ' is-level-' + a.level + '"' + attrs + style + '>' + rich('h' + a.level, ' wp-block-heading__text') + '</div>';
      case 'core/paragraph':
        return '<div class="' + cls + '"' + attrs + style + '>' + rich('p') + '</div>';
      case 'core/button':
        return '<div class="' + cls + '"' + attrs + '>' + rich('span', ' wp-block-button__link') + '</div>';
      case 'core/image':
        return '<figure class="' + cls + '"' + attrs + '>' + PICTURES[a.picture] + '</figure>';
    }
    return '';
  }

  // ---------- Drawing the editor ----------

  const app = document.getElementById('app');
  app.className = 'ut-app' + (NOTES ? ' has-notes' : '');
  app.innerHTML =
    '<header class="ut-topbar">' +
      '<div class="ut-topbar__left">' +
        '<span class="ut-site-icon" aria-hidden="true">F</span>' +
        '<button class="ut-icon-btn" data-action="overview" aria-pressed="false" aria-label="Document Overview" data-tooltip="Document Overview">' + ICONS.listView + '</button>' +
        '<button class="ut-icon-btn" data-action="undo" aria-label="Undo" data-tooltip="Undo" aria-disabled="true">' + ICONS.undo + '</button>' +
        '<button class="ut-icon-btn" data-action="redo" aria-label="Redo" data-tooltip="Redo" aria-disabled="true">' + ICONS.redo + '</button>' +
      '</div>' +
      '<div class="ut-topbar__center"><p class="ut-doc-title"><strong>Home</strong><span> · Page</span></p></div>' +
      '<div class="ut-topbar__right"></div>' +
    '</header>' +
    '<div class="ut-body">' +
      '<aside class="ut-overview" aria-label="Document Overview" hidden></aside>' +
      '<div class="ut-main">' +
        '<div class="ut-canvas" aria-label="Editor canvas">' +
          '<div class="ut-canvas-inner">' +
            '<div class="ut-page" role="document" aria-label="Page: Home"></div>' +
            '<div class="ut-overlay"></div>' +
            '<div class="ut-toolbar" role="toolbar" aria-label="Block tools" hidden></div>' +
            '<div class="ut-menu" role="menu" hidden></div>' +
          '</div>' +
        '</div>' +
        '<nav class="ut-breadcrumb" aria-label="Block breadcrumb"></nav>' +
      '</div>' +
      '<aside class="ut-inspector" aria-label="Settings"></aside>' +
    '</div>' +
    '<div class="ut-bottombar"><button class="ut-btn ut-btn-primary" data-action="finish">Finished</button><p>Click Finished when you’ve done everything you were asked to.</p></div>';

  const canvas = app.querySelector('.ut-canvas');
  const inner = app.querySelector('.ut-canvas-inner');
  const page = app.querySelector('.ut-page');
  const overlay = app.querySelector('.ut-overlay');
  const toolbarEl = app.querySelector('.ut-toolbar');
  const menuEl = app.querySelector('.ut-menu');
  const overviewEl = app.querySelector('.ut-overview');
  const inspectorEl = app.querySelector('.ut-inspector');
  const breadcrumbEl = app.querySelector('.ut-breadcrumb');

  const elementFor = (id) => (id ? page.querySelector('[data-block-id="' + CSS.escape(id) + '"]') : null);
  const richFor = (id) => { const el = elementFor(id); return el ? el.querySelector('.ut-rich') : null; };
  function idFromElement(el) {
    if (!el || !el.closest || !page.contains(el)) return null;
    const block = el.closest('[data-block-id]');
    return block ? block.dataset.blockId : null;
  }

  // A block's box in the overlay's coordinates (the canvas content, so it
  // scrolls with the page).
  function rectFor(id) {
    const el = elementFor(id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const o = inner.getBoundingClientRect();
    return { top: r.top - o.top, left: r.left - o.left, width: r.width, height: r.height, bottom: r.bottom - o.top, right: r.right - o.left };
  }

  // Draw the page again, after any change to it. Selection, hover and the
  // toolbar are put back; focus goes to the selected block if it was in the page.
  function renderCanvas(reason) {
    const hadFocus = page.contains(document.activeElement);
    page.innerHTML = tree.map(blockHTML).join('');
    editingId = null;
    let lost = null;
    if (selectedId && !find(selectedId)) { lost = selectedId; selectedId = null; }
    paint();
    if (hadFocus && selectedId) focusBlock(selectedId);
    emit('render', { reason: reason || 'change' });
    // The selected block has gone (deleted, or undone away).
    if (lost) emit('select', { id: null, previousId: lost, route: 'removed' });
  }

  // Everything that follows the selection.
  function paint() {
    page.querySelectorAll('.is-selected').forEach((el) => el.classList.remove('is-selected', 'is-editing'));
    const el = elementFor(selectedId);
    if (el) {
      el.classList.add('is-selected');
      el.classList.toggle('is-editing', editingId === selectedId);
    }
    paintHover();
    renderToolbar();
    renderInspector();
    renderBreadcrumb();
    renderOverview();
    renderUndo();
  }

  function paintEditing() {
    const el = elementFor(selectedId);
    if (el) el.classList.toggle('is-editing', editingId === selectedId);
  }

  // ---------- Hover ----------

  // The editor's thin hover outline. A variant's highlight (a tab or a row
  // under the pointer) wins over the pointer's own while it lasts.
  let hoverResolver = null;
  function paintHover() {
    const id = explicitHighlightId !== null ? explicitHighlightId : pointerHoverId;
    page.querySelectorAll('.is-hovered').forEach((el) => { if (el.dataset.blockId !== id) el.classList.remove('is-hovered'); });
    const el = elementFor(id);
    if (el) el.classList.add('is-hovered');
  }
  function setPointerHover(id) {
    if (id === pointerHoverId) return;
    pointerHoverId = id;
    paintHover();
  }
  function highlight(id) {
    explicitHighlightId = id && find(id) ? id : null;
    paintHover();
  }

  const inChrome = (el) => !!(el && el.closest && (el.closest('.ut-overlay > *') || el.closest('.ut-toolbar') || el.closest('.ut-menu')));

  let lastPointer = null; // the last pointermove over the page, to resolve the hover again
  function resolveHover(e, target) {
    const targetId = idFromElement(target);
    let id = targetId;
    if (hoverResolver) {
      const r = hoverResolver({ event: e, targetId, selectedId });
      if (r !== undefined) id = r;
    }
    setPointerHover(id);
  }
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    if (inChrome(e.target)) return;
    lastPointer = e;
    resolveHover(e, e.target);
  });
  canvas.addEventListener('pointerleave', () => { lastPointer = null; setPointerHover(null); });
  // When the selection changes under a still pointer, what the hover should
  // show may change too (B shows the next stop), so work it out again at once.
  function refreshHover() {
    if (!lastPointer || !hoverResolver) return;
    const target = document.elementFromPoint(lastPointer.clientX, lastPointer.clientY);
    if (target && page.contains(target)) resolveHover(lastPointer, target);
  }

  // As in the editor, typing hides the block toolbar and the hover outline
  // until the pointer moves again.
  document.addEventListener('mousemove', () => {
    if (!toolbarHidden) return;
    toolbarHidden = false;
    placeToolbar();
  });

  // ---------- Selecting ----------

  let clickResolver = null;
  let escapeHandler = null;

  /*
   * Select a block (or nothing, with null). `route` says how: one of the
   * routes above for a container, or 'canvas' (a click on what it is), 'keyboard',
   * 'undo', 'after delete', 'insert', 'api'. Every selection is logged; a
   * selection of a container by a counted route is also counted.
   */
  function selectBlock(id, opts) {
    opts = opts || {};
    if (id && !find(id)) return;
    closeMenu();
    // `previous` names a block that was selected but has just been deleted.
    const prev = opts.previous ? opts.previous.id : selectedId;
    if (id === selectedId && !opts.previous) return;
    selectedId = id;
    if (id) ancestorsOf(id).forEach((a) => expanded.add(a));
    const route = opts.route || 'api';
    if (id) {
      const container = isContainer(id);
      const counted = container && (CORE_ROUTES.includes(route) || ARM_ROUTES.includes(route));
      // A held press (see the page's pointerdown) counts its route later, or not at all.
      if (counted && opts.hold && held) held.route = route;
      else if (counted) stats.routes[route]++;
      note(counted ? 'container' : 'select', 'Selected ' + describe(id) + ' by ' + (ROUTE_NAME[route] || route) + (counted ? ' [' + route + ']' : '') + '. Before: ' + (opts.previous ? opts.previous.name : describeOr(prev, 'nothing')));
    } else if (prev) {
      note('select', 'Cleared the selection (' + route + '). Before: ' + describe(prev));
    }
    paint();
    refreshHover();
    emit('select', { id, previousId: prev, route });
  }

  // Give a block keyboard focus without putting the caret in its text.
  function focusBlock(id) {
    const el = elementFor(id);
    if (el) el.focus({ preventScroll: true });
  }

  // Put the caret in a block's text at a point on screen, or at the end.
  function placeCaret(rich, x, y) {
    let range = null;
    if (x != null && document.caretRangeFromPoint) range = document.caretRangeFromPoint(x, y);
    else if (x != null && document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (p) { range = document.createRange(); range.setStart(p.offsetNode, p.offset); }
    }
    rich.focus({ preventScroll: true });
    if (!range || !rich.contains(range.startContainer)) {
      range = document.createRange();
      range.selectNodeContents(rich);
      range.collapse(false);
    }
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /*
   * A press on the page. As in the editor, it selects the innermost block
   * under the pointer, and on text the caret lands where the person clicked.
   * A press on a container's own area (padding, gap, empty space) selects
   * the container: the `padding` route. A variant can choose another target
   * with setClickResolver (E does: section first, as B did before it was
   * dropped); a container it selects that way is the `click` route.
   */
  let suppressMouse = false;
  /*
   * `k` in the completion code (clicks before the caret first lands in the
   * Monday paragraph) is counted here, so only presses on the page itself
   * (.ut-page) count. Presses on the grey around the page, the toolbar, the
   * ⋮ menu or anything a variant draws in the overlay (A's tabs, D's Layers
   * button and popover) don't. The press that puts the caret there is taken
   * off again in the focusin handler below.
   *
   * A click resolver can answer `provisional: true` (or a number of ms) for a
   * press that may be the first of a double click (E). The press selects as
   * usual, but its counts (its route and its k click) are held: they count
   * once the time is up or the next press on the page isn't its second, and
   * are dropped if the next press answers `double: true`. So a double click
   * counts as one press. With no resolver, nothing is held.
   */
  const HOLD_MS = 500;
  let held = null; // { route, k, timer }: the counts of a press that may be a double click's first
  function commitHeld() {
    if (!held) return;
    const h = held;
    held = null;
    clearTimeout(h.timer);
    if (h.route) stats.routes[h.route]++;
    if (h.k) stats.clicksBeforeCaret++;
    renderNotes();
  }
  function dropHeld() {
    if (!held) return;
    const h = held;
    held = null;
    clearTimeout(h.timer);
    if (h.route || h.k) note('select', 'That press was the first of a double click: not counted');
  }
  page.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    suppressMouse = false;
    lastCanvasDown = performance.now();
    const targetId = idFromElement(e.target);
    let r = null;
    if (targetId && clickResolver) {
      try { r = clickResolver({ event: e, targetId, selectedId }); } catch (err) { console.error(err); }
    }
    if (held) { if (r && r.double) dropHeld(); else commitHeld(); }
    const hold = !!(r && r.provisional && r.id && find(r.id));
    if (hold) held = { route: null, k: !caretLanded, timer: setTimeout(commitHeld, typeof r.provisional === 'number' ? r.provisional : HOLD_MS) };
    else if (!caretLanded) stats.clicksBeforeCaret++;
    if (!targetId) return;
    let id = targetId;
    let caret = isText(targetId);
    let byVariant = false;
    if (r && r.id && find(r.id)) { id = r.id; caret = !!r.caret && isText(r.id); byVariant = true; }
    const route = isContainer(id) ? (byVariant ? 'click' : 'padding') : 'canvas';
    const rich = caret ? richFor(id) : null;
    // Let the browser put the caret where the person clicked, if they clicked
    // the text itself. Otherwise do it here and stop the browser moving focus.
    const native = !!(rich && rich.contains(e.target));
    if (!native) suppressMouse = true;
    selectBlock(id, { route, hold });
    if (!native) {
      if (caret) placeCaret(rich, e.clientX, e.clientY);
      else focusBlock(id);
    }
  });
  page.addEventListener('mousedown', (e) => {
    if (suppressMouse) { e.preventDefault(); suppressMouse = false; }
  });

  // A press on the grey around the page clears the selection.
  canvas.addEventListener('pointerdown', (e) => {
    if (page.contains(e.target) || inChrome(e.target)) return;
    if (e.target.closest('.ut-overlay > *')) return;
    if (selectedId) {
      selectBlock(null, { route: 'canvas' });
      if (document.activeElement && app.contains(document.activeElement)) document.activeElement.blur();
    }
  });

  // ---------- Typing ----------

  // Store what was typed. One undo step per stretch of typing in one block.
  page.addEventListener('input', (e) => {
    const rich = e.target.closest('.ut-rich');
    if (!rich) return;
    const id = idFromElement(rich);
    const node = nodeOf(id);
    if (!node) return;
    if (!textSession || textSession.id !== id) { endTextSession(); textSession = { id, before: node.attrs.content, pushed: false }; }
    if (!textSession.pushed) { pushUndo(id); textSession.pushed = true; }
    node.attrs.content = rich.textContent.replace(/ /g, ' ');
    afterChange({ reason: 'text', id });
  });

  // The stretch of typing ends: log it, before → after.
  function endTextSession() {
    const s = textSession;
    textSession = null;
    if (!s || !s.pushed) return;
    const node = nodeOf(s.id);
    if (!node) return;
    const now = node.attrs.content;
    if (now === s.before) return;
    note('edit', 'Edited the text of ' + typeFor(node).title + ': “' + s.before + '” → “' + now + '”');
  }

  page.addEventListener('focusin', (e) => {
    const rich = e.target.closest && e.target.closest('.ut-rich');
    if (!rich) return;
    const id = idFromElement(rich);
    if (selectedId !== id) selectBlock(id, { route: 'keyboard' });
    editingId = id;
    paintEditing();
    if (id === 'monday-text' && !caretLanded) {
      caretLanded = true;
      // The click that put it there doesn't count as a click before it.
      if (held && held.k) held.k = false;
      else if (performance.now() - lastCanvasDown < 800) stats.clicksBeforeCaret = Math.max(0, stats.clicksBeforeCaret - 1);
      note('caret', 'The caret first landed in the Monday paragraph, after ' + stats.clicksBeforeCaret + ' other click' + (stats.clicksBeforeCaret === 1 ? '' : 's') + ' on the page');
    }
  });
  page.addEventListener('focusout', (e) => {
    const rich = e.target.closest && e.target.closest('.ut-rich');
    if (!rich) return;
    endTextSession();
    if (editingId === idFromElement(rich)) editingId = null;
    paintEditing();
  });

  // Pasted text goes in as plain text.
  page.addEventListener('paste', (e) => {
    if (!e.target.closest('.ut-rich')) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  });

  // ---------- Changing the page ----------

  // `target` is the block the change was about: undo and redo select it
  // again, as the editor does (a deleted section comes back selected).
  const snapshot = (target) => ({ tree: clone(tree), sel: selectedId, target: target || null });
  function pushUndo(target) {
    undoStack.push(snapshot(target));
    redoStack = [];
  }

  // Every change but typing goes through here: one undo step, then redraw.
  function change(fn, info) {
    endTextSession();
    pushUndo(info.id);
    fn();
    renderCanvas(info.reason);
    afterChange(info);
  }

  function afterChange(info) {
    checkEmptiedColumn();
    checkTasks();
    renderUndo();
    emit('change', info);
  }

  function newId(base) {
    newIds++;
    return base + '-new' + newIds;
  }
  function withNewIds(node) {
    const copy = clone(node);
    walk([copy], (n) => { n.id = newId(n.id.replace(/-new\d+$/, '')); });
    return copy;
  }

  const ord = (n) => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');

  function moveBlock(id, dir) {
    const f = find(id);
    if (!f) return;
    const to = f.index + dir;
    if (to < 0 || to >= f.list.length) return;
    const where = f.parent ? describe(f.parent.id) : 'the page';
    const words = typeFor(f.node).horizontal ? (dir < 0 ? 'left' : 'right') : (dir < 0 ? 'up' : 'down');
    const what = describe(id);
    if (f.parent && !doneNow[1]) {
      wrong('moved ' + typeFor(f.node).title + ' inside ' + typeFor(f.parent).title + ' (' + what + ' in ' + where + ', while task 2 isn’t done)');
    }
    change(() => {
      const [node] = f.list.splice(f.index, 1);
      f.list.splice(to, 0, node);
    }, { reason: 'move', id });
    note('change', 'Moved ' + what + ' ' + words + ' in ' + where + ': ' + ord(f.index + 1) + ' → ' + ord(to + 1) + ' of ' + f.list.length);
    focusBlock(id);
  }

  // After a delete the editor selects the block before, or the parent.
  function deleteBlock(id, how) {
    const f = find(id);
    if (!f) return;
    const what = describe(id);
    const next = f.index > 0 ? f.list[f.index - 1].id : (f.parent ? f.parent.id : (f.list[f.index + 1] ? f.list[f.index + 1].id : null));
    if (!doneNow[3] && id !== 'saturday' && ORIGINAL.has(id)) wrong('deleted ' + what + ' (not the Saturday column, while task 4 isn’t done)');
    // Let go of the deleted block here, so the selection that follows names
    // it as what was selected before.
    const wasSelected = selectedId === id;
    if (wasSelected) selectedId = null;
    change(() => { f.list.splice(f.index, 1); }, { reason: 'delete', id });
    note('change', 'Deleted ' + what + ' (' + how + ')' + (f.node.children.length ? ', with everything in it' : ''));
    const previous = wasSelected ? { id, name: what + ', now deleted' } : null;
    if (next) { selectBlock(next, { route: 'after delete', previous }); focusBlock(next); }
    else if (previous) { paint(); note('select', 'Nothing selected after the delete. Before: ' + previous.name); emit('select', { id: null, previousId: id, route: 'after delete' }); }
  }

  function duplicateBlock(id) {
    const f = find(id);
    if (!f) return;
    const copy = withNewIds(f.node);
    change(() => { f.list.splice(f.index + 1, 0, copy); }, { reason: 'duplicate', id: copy.id });
    note('change', 'Duplicated ' + describe(id));
    selectBlock(copy.id, { route: 'insert' });
    focusBlock(copy.id);
  }

  // Add before or after: an empty paragraph, or what the parent allows
  // (a Column in Columns, a Button in Buttons), as the editor does.
  function insertBeside(id, after) {
    const f = find(id);
    if (!f) return;
    const parentName = f.parent ? f.parent.name : null;
    const node = parentName === 'core/columns' ? b(newId('column'), 'core/column', {}, [])
      : parentName === 'core/buttons' ? b(newId('button'), 'core/button', { content: '' })
      : b(newId('paragraph'), 'core/paragraph', { content: '' });
    change(() => { f.list.splice(f.index + (after ? 1 : 0), 0, node); }, { reason: 'insert', id: node.id });
    note('change', 'Added ' + typeFor(node).title + ' ' + (after ? 'after ' : 'before ') + describe(id));
    selectBlock(node.id, { route: 'insert' });
    if (isText(node.id)) placeCaret(richFor(node.id)); else focusBlock(node.id);
  }

  function setColor(id, key, slug) {
    const node = nodeOf(id);
    if (!node || node.attrs[key] === slug || (!node.attrs[key] && !slug)) return;
    const what = describe(id);
    const label = key === 'overlay' ? 'Overlay' : 'Background';
    if (!doneNow[2] && id !== 'hours') wrong('set the ' + label.toLowerCase() + ' of ' + what + ' (not the Opening hours section, before task 3 is done)');
    const before = node.attrs[key];
    change(() => { node.attrs[key] = slug || null; }, { reason: 'color', id });
    note('change', label + ' of ' + what + ': ' + colorName(before) + ' → ' + colorName(slug));
  }

  // Columns count: lowering it removes the last column with its contents,
  // raising it adds an empty one, as the editor does.
  function setColumnCount(id, n) {
    const node = nodeOf(id);
    if (!node || n < 1 || n > 4 || n === node.children.length) return;
    const before = node.children.length;
    if (n < before) {
      const removed = node.children.slice(n);
      const names = removed.map((c) => describe(c.id)).join(', ');
      removed.forEach((c) => { if (!doneNow[3] && c.id !== 'saturday' && ORIGINAL.has(c.id)) wrong('removed ' + describe(c.id) + ' by lowering the Columns count (not the Saturday column)'); });
      change(() => { node.children.splice(n); }, { reason: 'columns', id });
      note('change', 'Columns count of ' + describe(id) + ': ' + before + ' → ' + n + ' (removed ' + names + ' with its contents)');
    } else {
      change(() => { while (node.children.length < n) node.children.push(b(newId('column'), 'core/column', {}, [])); }, { reason: 'columns', id });
      note('change', 'Columns count of ' + describe(id) + ': ' + before + ' → ' + n + ' (added an empty Column)');
    }
  }

  function setAlt(id, alt) {
    const node = nodeOf(id);
    if (!node || node.attrs.alt === alt) return;
    node.attrs.alt = alt;
    note('change', 'Alternative text of ' + describe(id) + ': “' + alt + '”');
  }

  // A third column left empty in place is its own wrong target, once.
  function checkEmptiedColumn() {
    const sat = nodeOf('saturday');
    if (sat && !sat.children.length && !emptiedFlagged) {
      emptiedFlagged = true;
      wrong('emptied the Saturday column but didn’t remove it');
    }
  }

  // ---------- Undo and redo ----------

  // Where the caret is in a block's text, as a number of characters.
  function caretOffset(rich) {
    const sel = window.getSelection();
    if (!sel.rangeCount || !rich.contains(sel.focusNode)) return rich.textContent.length;
    const range = document.createRange();
    range.selectNodeContents(rich);
    range.setEnd(sel.focusNode, sel.focusOffset);
    return range.toString().length;
  }
  function setCaretOffset(rich, n) {
    rich.focus({ preventScroll: true });
    const range = document.createRange();
    const node = rich.firstChild;
    if (node && node.nodeType === 3) range.setStart(node, Math.max(0, Math.min(n, node.length)));
    else { range.selectNodeContents(rich); range.collapse(false); }
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /*
   * Put the page back as an undo (or redo) entry has it. The block the
   * change was about is selected again. If the person was typing and that
   * block's text is still there, the caret goes back into it, moved by as
   * much as the text grew or shrank, so they can carry on typing.
   */
  function restore(from, to, entry) {
    const editing = editingId;
    const rich = editing ? richFor(editing) : null;
    const caret = rich ? { offset: caretOffset(rich), length: rich.textContent.length } : null;
    to.push(snapshot(entry.target));
    tree = entry.tree;
    const exists = (id) => !!(id && find(id));
    const keep = exists(entry.target) ? entry.target : exists(selectedId) ? selectedId : exists(entry.sel) ? entry.sel : null;
    renderCanvas(from === undoStack ? 'undo' : 'redo');
    if (keep !== selectedId) selectBlock(keep, { route: 'undo' });
    if (editing && keep === editing && isText(keep)) {
      const text = nodeOf(keep).attrs.content || '';
      setCaretOffset(richFor(keep), caret.offset + (text.length - caret.length));
    } else if (keep) focusBlock(keep);
  }
  function undo() {
    if (!undoStack.length) { endTextSession(); return; }
    endTextSession();
    restore(undoStack, redoStack, undoStack.pop());
    stats.undos++;
    note('undo', 'Undo');
    afterChange({ reason: 'undo' });
  }
  function redo() {
    endTextSession();
    if (!redoStack.length) return;
    const entry = redoStack.pop();
    const keepRedo = redoStack.slice();
    restore(redoStack, undoStack, entry);
    redoStack = keepRedo;
    stats.redos++;
    note('undo', 'Redo');
    afterChange({ reason: 'redo' });
  }
  function renderUndo() {
    app.querySelector('[data-action="undo"]').setAttribute('aria-disabled', String(!undoStack.length));
    app.querySelector('[data-action="redo"]').setAttribute('aria-disabled', String(!redoStack.length));
  }

  // ---------- The block toolbar ----------

  // Floats just above the selected block's top-left. When the block's top
  // is scrolled out of view it stays at the top of the canvas, as the editor's does.
  // A variant can ask for the block's name beside its icon in the toolbar
  // (arm A does, so the toolbar says the same as its hover tabs).
  let toolbarShowsName = false;
  // ... and can make that name a button (arm A: it opens the section's
  // block list). The variant gets { id, button } and draws what it opens.
  let toolbarNameClick = null;
  // A variant can change the parent selector's box (arm E): its own icon for
  // the select-parent button, and its own button(s) before it in the same
  // box. See setParentSelector in the API.
  let parentSelector = null;

  function parentSelectorHTML(parent, btn) {
    if (!parentSelector) return '<div class="ut-tb-parent">' + btn('select-parent', 'Select parent block: ' + parent.title, parent.icon, 'ut-tb-parent-btn') + '</div>';
    let before = '';
    if (parentSelector.before) {
      try { before = parentSelector.before(selectedId) || ''; } catch (err) { console.error(err); }
    }
    return '<div class="ut-tb-parent is-custom">' +
      (before ? '<span class="ut-tb-parent-extra">' + before + '</span>' : '') +
      btn('select-parent', 'Select parent block: ' + parent.title, parentSelector.icon || parent.icon, 'ut-tb-parent-btn') + '</div>';
  }

  function renderToolbar() {
    if (!selectedId) { toolbarEl.hidden = true; toolbarEl.innerHTML = ''; return; }
    const f = find(selectedId);
    const t = typeFor(f.node);
    const parent = f.parent ? typeFor(f.parent) : null;
    const first = f.index === 0;
    const last = f.index === f.list.length - 1;
    const h = t.horizontal;
    const btn = (action, label, icon, cls, disabled) => '<button class="ut-tb-btn' + (cls ? ' ' + cls : '') + '" data-action="' + action + '" aria-label="' + esc(label) + '" data-tooltip="' + esc(label) + '"' + (disabled ? ' aria-disabled="true"' : '') + '>' + icon + '</button>';
    toolbarEl.dataset.forBlock = selectedId;
    toolbarEl.innerHTML =
      // As in the editor, the parent selector is its own box, 8px to the left of
      // the toolbar, and the toolbar starts 56px in from the block's left edge.
      (parent ? parentSelectorHTML(parent, btn) : '') +
      '<div class="ut-tb-main">' +
      '<div class="ut-tb-group">' +
        (toolbarShowsName && toolbarNameClick
          ? '<button type="button" class="ut-tb-btn ut-tb-icon has-name ut-tb-name-btn" aria-haspopup="true" aria-expanded="false" aria-label="' + t.title + ': show the blocks in this section">' + t.icon + '<span class="ut-tb-name">' + t.title + '</span>' + ICONS.chevronDownSmall + '</button>'
          : toolbarShowsName
          ? '<span class="ut-tb-btn ut-tb-icon has-name" role="img" aria-label="' + t.title + '">' + t.icon + '<span class="ut-tb-name">' + t.title + '</span></span>'
          : '<span class="ut-tb-btn ut-tb-icon" role="img" aria-label="' + t.title + '" data-tooltip="' + t.title + '">' + t.icon + '</span>') +
        '<div class="ut-tb-movers' + (h ? ' is-horizontal' : '') + '">' +
          btn('move-up', h ? 'Move left' : 'Move up', h ? ICONS.chevronLeft : ICONS.chevronUp, 'ut-tb-mover', first) +
          btn('move-down', h ? 'Move right' : 'Move down', h ? ICONS.chevronRight : ICONS.chevronDown, 'ut-tb-mover', last) +
        '</div>' +
      '</div>' +
      '<div class="ut-tb-group">' + btn('options', 'Options', ICONS.moreVertical, 'ut-tb-options') + '</div>' +
      '</div>';
    toolbarEl.querySelector('[data-action="options"]').setAttribute('aria-haspopup', 'true');
    toolbarEl.querySelector('[data-action="options"]').setAttribute('aria-expanded', String(menuOpen));
    placeToolbar();
  }

  function placeToolbar() {
    if (!selectedId || toolbarHidden || !elementFor(selectedId)) { toolbarEl.hidden = true; placeMenu(); return; }
    toolbarEl.hidden = false;
    const r = rectFor(selectedId);
    const h = toolbarEl.offsetHeight;
    const w = toolbarEl.offsetWidth;
    const visibleTop = canvas.getBoundingClientRect().top - inner.getBoundingClientRect().top;
    let top = r.top - h - 8;
    if (top < visibleTop + 4) top = Math.min(visibleTop + 4, Math.max(r.top, r.bottom - h));
    // A parent selector box wider than the usual one (arm E's, with its
    // "···") grows to the left, so the toolbar itself stays where it is.
    const box = toolbarEl.querySelector('.ut-tb-parent');
    const grow = box ? Math.max(0, box.offsetWidth - 48) : 0;
    const left = Math.max(4, Math.min(r.left - grow, inner.clientWidth - w - 4));
    toolbarEl.style.top = Math.round(top) + 'px';
    toolbarEl.style.left = Math.round(left) + 'px';
    placeMenu();
  }

  // The toolbar's box in overlay coordinates, so a variant can keep clear of it.
  function toolbarRect() {
    if (toolbarEl.hidden) return null;
    const r = toolbarEl.getBoundingClientRect();
    const o = inner.getBoundingClientRect();
    return { top: r.top - o.top, left: r.left - o.left, width: r.width, height: r.height, bottom: r.bottom - o.top, right: r.right - o.left };
  }

  // ---------- The ⋮ menu ----------

  function openMenu() {
    if (!selectedId) return;
    const f = find(selectedId);
    const parent = f.parent ? typeFor(f.parent) : null;
    const item = (action, label) => '<button role="menuitem" class="ut-menu-item" data-action="' + action + '">' + esc(label) + '</button>';
    menuEl.innerHTML =
      '<div class="ut-menu-group">' + item('duplicate', 'Duplicate') + item('add-before', 'Add before') + item('add-after', 'Add after') +
      (parent ? item('menu-select-parent', 'Select parent block (' + parent.title + ')') : '') + '</div>' +
      '<div class="ut-menu-group">' + item('delete', 'Delete') + '</div>';
    menuOpen = true;
    menuEl.hidden = false;
    stats.menuOpened++;
    note('menu', 'Opened the ⋮ menu on ' + describe(selectedId));
    const opt = toolbarEl.querySelector('[data-action="options"]');
    if (opt) opt.setAttribute('aria-expanded', 'true');
    placeMenu();
    const firstItem = menuEl.querySelector('button');
    if (firstItem) firstItem.focus({ preventScroll: true });
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    menuEl.hidden = true;
    const opt = toolbarEl.querySelector('[data-action="options"]');
    if (opt) opt.setAttribute('aria-expanded', 'false');
  }
  function placeMenu() {
    if (!menuOpen) return;
    const opt = toolbarEl.querySelector('[data-action="options"]');
    if (!opt || toolbarEl.hidden) { closeMenu(); return; }
    const r = opt.getBoundingClientRect();
    const o = inner.getBoundingClientRect();
    menuEl.style.top = Math.round(r.bottom - o.top + 4) + 'px';
    // Left-aligned to the ⋮ button; right-aligned to it if that would run
    // past the canvas's visible right edge, as the editor's popovers flip.
    const w = menuEl.offsetWidth;
    const right = Math.min(inner.clientWidth, canvas.scrollLeft + canvas.clientWidth) - 4;
    let left = r.left - o.left;
    if (left + w > right) left = r.right - o.left - w;
    menuEl.style.left = Math.round(Math.max(4, Math.min(left, right - w))) + 'px';
  }
  document.addEventListener('pointerdown', (e) => {
    if (menuOpen && !menuEl.contains(e.target) && !e.target.closest('[data-action="options"]')) closeMenu();
  }, true);

  // ---------- The inspector (Settings sidebar) ----------

  function renderInspector() {
    if (!selectedId) {
      inspectorEl.innerHTML = '<div class="ut-sidebar-head"><h2>Page</h2></div><div class="ut-panel"><p class="ut-muted">Select a block to change it.</p></div>';
      return;
    }
    const node = nodeOf(selectedId);
    const t = typeFor(node);
    const swatches = (key) => {
      const current = node.attrs[key] || null;
      return '<div class="ut-swatches" role="group" aria-label="' + (key === 'overlay' ? 'Overlay' : 'Background') + '">' +
        COLORS.map((c) => '<button class="ut-swatch' + (c.dark ? ' is-dark' : '') + '" data-action="color" data-key="' + key + '" data-color="' + c.slug + '" style="--swatch:' + c.value + '" aria-label="' + c.name + '" aria-pressed="' + (current === c.slug) + '" data-tooltip="' + c.name + '">' + (current === c.slug ? ICONS.check : '') + '</button>').join('') +
        '</div><button class="ut-btn ut-btn-small ut-btn-tertiary" data-action="color" data-key="' + key + '" data-color=""' + (current ? '' : ' aria-disabled="true"') + '>Clear</button>';
    };
    let settings = '';
    if (t.settings === 'background') {
      settings = '<section class="ut-panel"><h3 class="ut-panel-title">Color</h3><div class="ut-control"><span class="ut-label">Background</span>' + swatches('background') + '</div></section>';
    } else if (t.settings === 'overlay') {
      settings = '<section class="ut-panel"><h3 class="ut-panel-title">Color</h3><div class="ut-control"><span class="ut-label">Overlay</span>' + swatches('overlay') + '</div></section>';
    } else if (t.settings === 'columns') {
      const n = node.children.length;
      settings = '<section class="ut-panel"><h3 class="ut-panel-title">Settings</h3><div class="ut-control"><span class="ut-label" id="ut-columns-label">Columns</span>' +
        '<div class="ut-number" role="group" aria-labelledby="ut-columns-label">' +
        '<button class="ut-icon-btn ut-icon-btn-small" data-action="columns-down" aria-label="Fewer columns" data-tooltip="Fewer columns"' + (n <= 1 ? ' aria-disabled="true"' : '') + '>' + ICONS.minus + '</button>' +
        '<output class="ut-number-value" data-columns-count aria-live="polite">' + n + '</output>' +
        '<button class="ut-icon-btn ut-icon-btn-small" data-action="columns-up" aria-label="More columns" data-tooltip="More columns"' + (n >= 4 ? ' aria-disabled="true"' : '') + '>' + ICONS.plus + '</button>' +
        '</div></div></section>';
    } else if (t.settings === 'alt') {
      settings = '<section class="ut-panel"><h3 class="ut-panel-title">Settings</h3><div class="ut-control"><label class="ut-label" for="ut-alt">Alternative text</label>' +
        '<textarea id="ut-alt" class="ut-textarea" rows="3" data-alt>' + esc(node.attrs.alt || '') + '</textarea>' +
        '<p class="ut-help">Describe the purpose of the image. Leave empty if decorative.</p></div></section>';
    }
    inspectorEl.innerHTML = '<div class="ut-sidebar-head"><h2>Block</h2></div>' +
      '<div class="ut-block-card">' + t.icon + '<div><h3>' + t.title + '</h3><p>' + t.description + '</p></div></div>' + settings;
  }

  inspectorEl.addEventListener('change', (e) => {
    if (e.target.matches('[data-alt]') && selectedId) setAlt(selectedId, e.target.value.trim());
  });

  // ---------- The breadcrumb ----------

  function renderBreadcrumb() {
    const ids = selectedId ? ancestorsOf(selectedId).concat(selectedId) : [];
    const sep = '<span class="ut-crumb-sep" aria-hidden="true">' + ICONS.chevronRightSmall + '</span>';
    breadcrumbEl.innerHTML = '<ul><li><button class="ut-crumb" data-action="crumb" data-id=""' + (ids.length ? '' : ' aria-current="true"') + '>Page</button></li>' +
      ids.map((id, i) => '<li>' + sep + '<button class="ut-crumb" data-action="crumb" data-id="' + esc(id) + '"' + (i === ids.length - 1 ? ' aria-current="true"' : '') + '>' + typeFor(nodeOf(id)).title + '</button></li>').join('') + '</ul>';
  }

  // ---------- Document Overview (List View) ----------

  function renderOverview() {
    overviewEl.hidden = !overviewOpen;
    app.classList.toggle('has-overview', overviewOpen);
    const btn = app.querySelector('[data-action="overview"]');
    btn.setAttribute('aria-pressed', String(overviewOpen));
    if (!overviewOpen) { overviewEl.innerHTML = ''; return; }
    const rows = [];
    const row = (node, depth) => {
      const t = typeFor(node);
      const has = node.children.length > 0;
      const open = has && expanded.has(node.id);
      rows.push('<li class="ut-lv-row' + (node.id === selectedId ? ' is-selected' : '') + '" data-row-id="' + esc(node.id) + '" style="--depth:' + depth + '" role="treeitem" aria-level="' + (depth + 1) + '"' + (has ? ' aria-expanded="' + open + '"' : '') + (node.id === selectedId ? ' aria-selected="true"' : '') + '>' +
        (has ? '<button class="ut-lv-expander" data-action="lv-toggle" data-id="' + esc(node.id) + '" aria-label="' + (open ? 'Collapse' : 'Expand') + '" tabindex="-1">' + (open ? ICONS.chevronDownSmall : ICONS.chevronRightSmall) + '</button>' : '<span class="ut-lv-expander"></span>') +
        '<button class="ut-lv-select" data-action="lv-select" data-id="' + esc(node.id) + '">' + t.icon + '<span>' + t.title + '</span></button></li>');
      if (open) node.children.forEach((c) => row(c, depth + 1));
    };
    tree.forEach((n) => row(n, 0));
    overviewEl.innerHTML = '<div class="ut-sidebar-head"><h2>Document Overview</h2><button class="ut-icon-btn ut-icon-btn-small" data-action="overview" aria-label="Close" data-tooltip="Close">' + ICONS.close + '</button></div>' +
      '<div class="ut-lv-tabs" role="tablist"><span role="tab" aria-selected="true">List View</span></div>' +
      '<ul class="ut-lv" role="tree" aria-label="Block navigation structure">' + rows.join('') + '</ul>';
  }

  function toggleOverview() {
    overviewOpen = !overviewOpen;
    if (overviewOpen) stats.overviewOpened++;
    note('overview', overviewOpen ? 'Opened Document Overview' : 'Closed Document Overview');
    renderOverview();
    placeToolbar();
  }

  overviewEl.addEventListener('pointerover', (e) => {
    const r = e.target.closest('[data-row-id]');
    highlight(r ? r.dataset.rowId : null);
  });
  overviewEl.addEventListener('pointerleave', () => highlight(null));

  // ---------- Tooltips, like the editor's ----------

  const tip = document.createElement('div');
  tip.className = 'ut-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);
  let tipTimer = null;
  let tipFor = null;
  function showTip(el) {
    tipFor = el;
    tip.textContent = el.dataset.tooltip;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    tip.style.left = Math.round(Math.max(4, Math.min(window.innerWidth - w - 4, r.left + r.width / 2 - w / 2))) + 'px';
    tip.style.top = Math.round(r.bottom + 6) + 'px';
  }
  function hideTip() { clearTimeout(tipTimer); tip.hidden = true; tipFor = null; }
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest && e.target.closest('[data-tooltip]');
    if (el === tipFor) return;
    hideTip();
    if (!el) return;
    tipTimer = setTimeout(() => { if (document.contains(el)) showTip(el); }, 500);
  });
  document.addEventListener('pointerdown', hideTip, true);
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest && e.target.closest('[data-tooltip]');
    if (el && e.target.matches(':focus-visible')) { hideTip(); showTip(el); } else if (!el) hideTip();
  });

  // ---------- Clicks on the editor ----------

  app.addEventListener('click', (e) => {
    const nameBtn = e.target.closest('.ut-tb-name-btn');
    if (nameBtn && toolbarNameClick && selectedId) { toolbarNameClick({ id: selectedId, button: nameBtn }); return; }
    const extra = e.target.closest('.ut-tb-parent-extra');
    if (extra && parentSelector && parentSelector.onClick && selectedId) {
      try { parentSelector.onClick({ id: selectedId, target: e.target, box: extra.parentElement, event: e }); } catch (err) { console.error(err); }
      return;
    }
    const el = e.target.closest('[data-action]');
    if (!el || el.getAttribute('aria-disabled') === 'true') return;
    const action = el.dataset.action;
    const id = selectedId;
    switch (action) {
      case 'overview': toggleOverview(); break;
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'finish': finish(); break;
      case 'select-parent': { const p = find(id).parent; if (p) selectBlock(p.id, { route: 'toolbar' }); keepToolbarFocus('select-parent', 'options'); break; }
      case 'menu-select-parent': { closeMenu(); const p = find(id).parent; if (p) { selectBlock(p.id, { route: 'menu' }); focusBlock(p.id); } break; }
      case 'move-up': moveBlock(id, -1); keepToolbarFocus('move-up', 'move-down'); break;
      case 'move-down': moveBlock(id, 1); keepToolbarFocus('move-down', 'move-up'); break;
      case 'options': if (menuOpen) closeMenu(); else openMenu(); break;
      case 'duplicate': closeMenu(); duplicateBlock(id); break;
      case 'add-before': closeMenu(); insertBeside(id, false); break;
      case 'add-after': closeMenu(); insertBeside(id, true); break;
      case 'delete': closeMenu(); deleteBlock(id, '⋮ menu'); break;
      case 'color': setColor(id, el.dataset.key, el.dataset.color || null); focusInspector('[data-action="color"][data-key="' + el.dataset.key + '"][data-color="' + el.dataset.color + '"]'); break;
      case 'columns-down': setColumnCount(id, nodeOf(id).children.length - 1); focusInspector('[data-action="columns-down"]'); break;
      case 'columns-up': setColumnCount(id, nodeOf(id).children.length + 1); focusInspector('[data-action="columns-up"]'); break;
      case 'crumb': {
        const to = el.dataset.id || null;
        if (to === selectedId) break;
        selectBlock(to, { route: 'breadcrumb' });
        if (to) focusBlock(to);
        break;
      }
      case 'lv-toggle': {
        const rid = el.dataset.id;
        if (expanded.has(rid)) expanded.delete(rid); else expanded.add(rid);
        renderOverview();
        const again = overviewEl.querySelector('[data-action="lv-toggle"][data-id="' + CSS.escape(rid) + '"]');
        if (again) again.focus({ preventScroll: true });
        break;
      }
      case 'lv-select': {
        const rid = el.dataset.id;
        if (rid !== selectedId) selectBlock(rid, { route: 'listview' });
        const again = overviewEl.querySelector('[data-action="lv-select"][data-id="' + CSS.escape(rid) + '"]');
        if (again) again.focus({ preventScroll: true });
        break;
      }
    }
  });

  // After a toolbar button redraws the toolbar, keep focus on the same button
  // (or its neighbour if it's now disabled), so keyboard use keeps working.
  function keepToolbarFocus(action, fallback) {
    let el = toolbarEl.querySelector('[data-action="' + action + '"]');
    if (!el || el.getAttribute('aria-disabled') === 'true') el = toolbarEl.querySelector('[data-action="' + fallback + '"]');
    if (el) el.focus({ preventScroll: true });
  }
  function focusInspector(selector) {
    const el = inspectorEl.querySelector(selector);
    if (el) el.focus({ preventScroll: true });
  }

  // ---------- Keyboard ----------

  document.addEventListener('keydown', (e) => {
    if (e.target.closest && (e.target.closest('dialog') || e.target.closest('.ut-notes'))) return;
    const inRich = !!(e.target.closest && e.target.closest('.ut-rich'));
    const inField = !inRich && e.target.matches && e.target.matches('input, textarea, select');
    const mod = e.metaKey || e.ctrlKey;

    if (mod && (e.key === 'z' || e.key === 'Z') && !inField) {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return;
    }
    if (mod && (e.key === 'y' || e.key === 'Y') && !inField) { e.preventDefault(); redo(); return; }

    if (e.key === 'Escape') {
      if (menuOpen) { e.preventDefault(); closeMenu(); keepToolbarFocus('options', 'options'); return; }
      if (inField) return;
      if (escapeHandler) {
        let handled = false;
        try { handled = escapeHandler({ event: e, selectedId, editing: !!editingId }) === true; } catch (err) { console.error(err); }
        if (handled) { e.preventDefault(); return; }
      }
      if (editingId) {
        // Leave the text, keep the block selected.
        e.preventDefault();
        endTextSession();
        const id = editingId;
        focusBlock(id);
        note('select', 'Escape: left the text, ' + describe(id) + ' still selected');
        return;
      }
      if (selectedId) {
        e.preventDefault();
        selectBlock(null, { route: 'escape' });
        if (document.activeElement && app.contains(document.activeElement)) document.activeElement.blur();
      }
      return;
    }

    if (inRich) {
      // Each text is one block: Enter finishes the stretch of typing but
      // keeps the caret there, and makes no new block.
      if (e.key === 'Enter') { e.preventDefault(); endTextSession(); return; }
      // No formatting in this editor.
      if (mod && /^[biuk]$/i.test(e.key)) { e.preventDefault(); return; }
      if (!mod && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete')) {
        if (!toolbarHidden) { toolbarHidden = true; placeToolbar(); }
        setPointerHover(null);
      }
      return;
    }
    if (inField) return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editingId) {
      // On the block, the toolbar or Document Overview, not in the settings.
      const onBlock = page.contains(e.target) || e.target === document.body || toolbarEl.contains(e.target) || overviewEl.contains(e.target) || overlay.contains(e.target);
      if (!onBlock) return;
      e.preventDefault();
      deleteBlock(selectedId, e.key + ' key');
    }
  });

  // ---------- Keeping things in place ----------

  canvas.addEventListener('scroll', () => {
    placeToolbar();
    emit('scroll', { scrollTop: canvas.scrollTop, scrollLeft: canvas.scrollLeft });
  }, { passive: true });

  // Any change of layout (text wrapping, a panel opening, the window
  // resizing) moves the toolbar and tells the variants to redraw.
  let layoutFrame = null;
  const layoutChanged = () => {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = null;
      placeToolbar();
      emit('render', { reason: 'layout' });
    });
  };
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(layoutChanged);
    ro.observe(page);
    ro.observe(canvas);
  }
  window.addEventListener('resize', layoutChanged);

  // ---------- Tasks ----------

  function task1() {
    const n = nodeOf('monday-text');
    return !!n && /beginners/i.test(n.attrs.content) && !/beginers/i.test(n.attrs.content);
  }
  function task2() {
    const ci = tree.findIndex((n) => n.id === 'classes');
    const ai = tree.findIndex((n) => n.id === 'about');
    if (ci < 0 || ai < 0 || ci > ai) return false;
    const kids = tree[ci].children.map((c) => c.id);
    return kids.includes('classes-heading') && kids.includes('classes-columns');
  }
  function task3() {
    const n = tree.find((x) => x.id === 'hours') || nodeOf('hours');
    return !!n && (n.attrs.background || null) !== START_HOURS_BACKGROUND;
  }
  function task4() {
    const cols = nodeOf('classes-columns');
    if (!cols || cols.children.length !== 2) return false;
    const ids = cols.children.map((c) => c.id).sort().join(',');
    if (ids !== 'monday,wednesday') return false;
    return cols.children.every((c) => ['image', 'heading', 'text'].every((p) => find(c.id + '-' + p, c.children)));
  }

  const TASKS = [
    { text: 'Fix “beginers” → “beginners” in the Monday class.', hint: 'Ticks when the Monday paragraph says “beginners”.', done: task1 },
    { text: 'Move “Classes this week” above “About the studio”.', hint: 'Ticks when the Classes Group is a top-level section above the About Group, with its heading and Columns.', done: task2 },
    { text: 'Give “Opening hours” a different background.', hint: 'Ticks when the Opening hours Group’s own background isn’t Sand.', done: task3 },
    { text: 'Remove the Saturday class.', hint: 'Ticks when the Classes Columns holds only the Monday and Wednesday Columns, with their content.', done: task4 }
  ];

  // Auto-tick (and untick) as the page reaches (or leaves) each task's result.
  function checkTasks() {
    TASKS.forEach((t, i) => {
      const now = t.done();
      if (now === !!doneNow[i]) return;
      doneNow[i] = now;
      ticked[i] = now;
      if (now && !firstDone[i]) firstDone[i] = { at: elapsed(), s: seconds() };
      note('task', 'Task ' + (i + 1) + (now ? ' done' : ' undone'));
    });
    renderNotes();
  }

  // ---------- The completion code ----------

  /*
   * For pasting into the testing tool. For example:
   *   UA-1101-r2.0.1.0.3.4-x1-u0-k3-s245
   *   arm (UC control, UA hover tab, UD layers, UE as Create not Learn) ·
   *   tasks 1–4 done (1) or not (0) when Finished was clicked ·
   *   r: container selections by route: toolbar . menu . breadcrumb .
   *      listview . padding . the arm's own (always 0 for the control) ·
   *   x: wrong targets · u: undos ·
   *   k: clicks on the page before the caret first landed in the Monday
   *      paragraph (kx if it never did) ·
   *   s: seconds from opening to Finished.
   */
  let armCode = ARMS[ARM].code;
  // An arm can have more than one route of its own (A: its tabs, and the
  // section's block list from the toolbar; E: its clicks, and the "···"
  // list); the code's last route number is
  // their total, and the notes panel shows each.
  const armRoutes = [].concat(ARMS[ARM].route || []);
  const armRouteCount = () => armRoutes.reduce((n, r) => n + stats.routes[r], 0);
  function completionCode() {
    commitHeld();
    return [
      armCode,
      TASKS.map((t) => (t.done() ? 1 : 0)).join(''),
      'r' + CORE_ROUTES.map((r) => stats.routes[r]).concat(armRouteCount()).join('.'),
      'x' + stats.wrong,
      'u' + stats.undos,
      'k' + (caretLanded ? stats.clicksBeforeCaret : 'x'),
      's' + seconds()
    ].join('-');
  }

  // Finished asks first, then shows the code. Clicking Finished again later gives a new code.
  let finishEl = null;
  function finish() {
    endTextSession();
    closeMenu();
    if (!finishEl) {
      finishEl = document.createElement('dialog');
      finishEl.className = 'ut-finish';
      finishEl.setAttribute('aria-labelledby', 'ut-finish-title');
      document.body.append(finishEl);
      finishEl.addEventListener('cancel', () => { if (finishEl.dataset.step === 'ask') note('finish', 'Finished: closed the question without answering'); });
      finishEl.addEventListener('close', () => {
        if (finishEl.dataset.step === 'code') note('finish', 'Went back to editing');
        const btn = app.querySelector('[data-action="finish"]');
        if (btn) btn.focus();
      });
      finishEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-not-yet]')) { note('finish', 'Finished: answered “Not yet”'); finishEl.dataset.step = 'no'; finishEl.close(); return; }
        if (e.target.closest('[data-show-code]')) { showCode(); return; }
        if (e.target.closest('[data-back]')) { finishEl.close(); return; }
        if (!e.target.closest('[data-copy-code]')) return;
        const input = finishEl.querySelector('textarea');
        input.select();
        (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject()).then(
          () => toast('Code copied.'),
          () => { try { document.execCommand('copy'); toast('Code copied.'); } catch (err) { toast('Select the code and copy it.'); } }
        );
      });
    }
    note('finish', 'Clicked Finished');
    finishEl.dataset.step = 'ask';
    finishEl.innerHTML = '<h2 id="ut-finish-title">Have you done all four tasks?</h2>' +
      '<div class="ut-finish-actions"><button class="ut-btn ut-btn-primary" data-show-code>Yes, show my code</button><button class="ut-btn ut-btn-secondary" data-not-yet>Not yet</button></div>';
    finishEl.showModal();
    finishEl.querySelector('[data-show-code]').focus();
  }
  function showCode() {
    const code = completionCode();
    note('finish', 'Finished: answered “Yes”. Code ' + code);
    finishEl.dataset.step = 'code';
    finishEl.innerHTML = '<h2 id="ut-finish-title">Thank you</h2><p>Please copy this code into the next question:</p>' +
      '<textarea class="ut-task-code" readonly rows="2" aria-label="Your code">' + code + '</textarea>' +
      '<div class="ut-finish-actions"><button class="ut-btn ut-btn-primary" data-copy-code>Copy code</button><button class="ut-link" data-back>Keep editing</button></div>';
    const input = finishEl.querySelector('textarea');
    input.focus();
    input.select();
  }

  // ---------- The facilitator panel ----------

  let notesEl = null;
  function renderNotes() {
    if (!NOTES || !log) return;
    if (!notesEl) {
      notesEl = document.createElement('aside');
      notesEl.className = 'ut-notes';
      notesEl.setAttribute('aria-label', 'Facilitator notes');
      document.body.append(notesEl);
      notesEl.addEventListener('change', (e) => {
        const box = e.target.closest('[data-task]');
        if (!box) return;
        ticked[box.dataset.task] = box.checked;
        note('task', 'Facilitator ' + (box.checked ? 'ticked' : 'unticked') + ' task ' + (Number(box.dataset.task) + 1));
      });
      notesEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-copy-log]')) {
          const textLog = log.map((l) => l.at + '  ' + l.text).join('\n');
          (navigator.clipboard ? navigator.clipboard.writeText(textLog) : Promise.reject()).then(() => toast('Log copied.'), () => toast('Couldn’t copy. Select the log and copy it.'));
        }
        if (e.target.closest('[data-reset]')) resetAll();
      });
    }
    const suffix = location.hash === '#notes' ? '#notes' : '?notes';
    const links = Object.keys(ARMS).map((v) => '<a href="' + ARMS[v].file + suffix + '"' + (v === ARM ? ' aria-current="page"' : '') + '>' + ARMS[v].letter + '</a>').join('');
    const tasks = TASKS.map((t, i) =>
      '<li class="' + (ticked[i] ? 'is-done' : '') + '" data-task-row="' + (i + 1) + '"><label><input type="checkbox" data-task="' + i + '"' + (ticked[i] ? ' checked' : '') + '> ' + t.text + '</label>' +
      (firstDone[i] ? ' <time>' + firstDone[i].at + '</time>' : '') +
      '<small>' + t.hint + '</small></li>').join('');
    const dd = (key, value) => '<dd data-count="' + key + '">' + value + '</dd>';
    const routeRows = CORE_ROUTES.concat(armRoutes).map((r) => '<dt>' + r + ' <span>· ' + ROUTE_NAME[r] + '</span></dt>' + dd('route-' + r, stats.routes[r])).join('');
    const taskTimes = TASKS.map((t, i) => '<dt>Seconds to task ' + (i + 1) + ' done</dt>' + dd('task-' + (i + 1) + '-seconds', firstDone[i] ? firstDone[i].s : '–')).join('');
    const armKeys = Object.keys(stats.arm);
    const armRows = armKeys.length
      ? '<h3>' + esc(ARMS[ARM].title) + '</h3><dl>' + armKeys.map((k) => '<dt>' + esc(stats.armLabels[k] || k) + '</dt>' + dd('arm-' + k, stats.arm[k])).join('') + '</dl>'
      : (ARM === 'control' ? '' : '<h3>' + esc(ARMS[ARM].title) + '</h3><p>Nothing counted yet.</p>');
    notesEl.innerHTML =
      '<div class="ut-notes-head"><h2>' + esc(ARMS[ARM].title) + ' · Facilitator notes</h2><nav class="ut-switcher" aria-label="Arm">' + links + '</nav></div>' +
      '<p>' + esc(ARMS[ARM].name) + '. Only you can see this panel; open the page without <code>?notes</code> for participants.</p>' +
      '<h3>Tasks</h3><ol class="ut-tasks">' + tasks + '</ol>' +
      '<h3>Container selections by route</h3><dl>' + routeRows + '</dl>' +
      '<h3>Counts</h3><dl>' +
      '<dt>Wrong targets</dt>' + dd('wrong', stats.wrong) +
      '<dt>Undos</dt>' + dd('undos', stats.undos) +
      '<dt>Clicks before the caret first landed in the Monday paragraph</dt>' + dd('clicks-before-caret', caretLanded ? stats.clicksBeforeCaret : stats.clicksBeforeCaret + ' (not yet)') +
      taskTimes +
      '<dt>Document Overview opened</dt>' + dd('overview-opened', stats.overviewOpened) +
      '<dt>⋮ menu opened</dt>' + dd('menu-opened', stats.menuOpened) +
      '</dl>' + armRows +
      '<h3>Log</h3><ol class="ut-log">' + (log.map((l) => '<li class="is-' + l.kind + '"><time>' + l.at + '</time>' + esc(l.text) + '</li>').join('') || '<li>Nothing yet.</li>') + '</ol>' +
      '<div class="ut-notes-actions"><button class="ut-btn ut-btn-secondary" data-copy-log>Copy log</button><button class="ut-btn ut-btn-secondary" data-reset>Reset</button></div>';
  }

  function resetAll() {
    const prev = selectedId;
    const armCounters = Object.keys(stats.arm);
    const labels = stats.armLabels;
    reset();
    // The arm's counters stay listed (at 0) so the panel keeps its shape.
    armCounters.forEach((k) => { stats.arm[k] = 0; });
    stats.armLabels = labels;
    if (document.activeElement && app.contains(document.activeElement)) document.activeElement.blur();
    canvas.scrollTop = 0;
    renderCanvas('reset');
    checkTasks();
    renderNotes();
    if (prev) emit('select', { id: null, previousId: prev, route: 'reset' });
    emit('change', { reason: 'reset' });
    toast('The page is back as it started.');
  }

  // ---------- The variant API ----------

  // Read-only copies of blocks for the variants.
  function publicBlock(node) {
    const t = typeFor(node);
    return Object.freeze({
      id: node.id,
      name: node.name,
      title: t.title,
      icon: t.icon,
      isContainer: !!t.container,
      isText: !!t.text,
      text: t.text ? node.attrs.content : undefined,
      children: Object.freeze(node.children.map(publicBlock))
    });
  }

  let registered = null;
  const api = {
    getTree: () => Object.freeze(tree.map(publicBlock)),
    getBlock: (id) => { const n = nodeOf(id); return n ? publicBlock(n) : null; },
    getParent: (id) => { const f = id ? find(id) : null; return f && f.parent ? f.parent.id : null; },
    getAncestors: (id) => (id && find(id) ? ancestorsOf(id) : []),
    getTopLevelId: (id) => (id ? topLevelOf(id) : null),
    isContainer,
    getSelectedId: () => selectedId,
    isEditingText: () => !!editingId,
    select(id, opts) {
      opts = opts || {};
      if (!id) { selectBlock(null, { route: opts.route || 'api' }); return; }
      if (!find(id)) return;
      selectBlock(id, { route: opts.route || 'api' });
      const rich = opts.caretAt && isText(id) ? richFor(id) : null;
      if (rich) placeCaret(rich, opts.caretAt.x, opts.caretAt.y);
      else focusBlock(id);
    },
    clearSelection() {
      selectBlock(null, { route: 'api' });
      if (document.activeElement && page.contains(document.activeElement)) document.activeElement.blur();
    },
    elementFor,
    idFromElement,
    rectFor,
    toolbarRect,
    canvas,
    overlay,
    highlight,
    on(event, fn) {
      (listeners[event] = listeners[event] || []).push(fn);
      return () => { listeners[event] = listeners[event].filter((f) => f !== fn); };
    },
    setClickResolver(fn) { clickResolver = typeof fn === 'function' ? fn : null; },
    setEscapeHandler(fn) { escapeHandler = typeof fn === 'function' ? fn : null; },
    setHoverResolver(fn) { hoverResolver = typeof fn === 'function' ? fn : null; },
    showBlockNameInToolbar(on, onClick) { toolbarShowsName = on !== false; toolbarNameClick = typeof onClick === 'function' ? onClick : null; renderToolbar(); },
    toolbarNameButton() { return toolbarEl.querySelector('.ut-tb-name-btn'); },
    /*
     * Change the parent selector, the box left of the toolbar (null puts the
     * editor's back). `icon` (SVG) stands in for the parent's icon on the
     * select-parent button, which still selects the parent (route `toolbar`).
     * `before(id)` returns HTML for buttons before it in the same box, for
     * the selected block `id` ('' for none); don't give them data-action,
     * which is the editor's own. A click on them calls
     * `onClick({ id, target, box, event })`. The toolbar is drawn again on every
     * selection, so look the buttons up again with parentSelectorBox().
     */
    setParentSelector(opts) {
      parentSelector = opts ? { icon: opts.icon || null, before: typeof opts.before === 'function' ? opts.before : null, onClick: typeof opts.onClick === 'function' ? opts.onClick : null } : null;
      renderToolbar();
    },
    parentSelectorBox() { return toolbarEl.hidden ? null : toolbarEl.querySelector('.ut-tb-parent'); },
    log(kind, text) { note(String(kind || 'arm'), String(text)); },
    count(key, label) {
      stats.arm[key] = (stats.arm[key] || 0) + 1;
      if (label) stats.armLabels[key] = label;
      renderNotes();
    }
  };

  /*
   * A variant file calls this once. Only the variant named by the page's
   * data-variant runs; its init gets the API once the editor is drawn.
   */
  function registerVariant(v) {
    if (!v || v.id !== ARM || registered) return;
    registered = v;
    if (v.code) armCode = v.code;
    if (typeof v.init === 'function') {
      try { v.init(api); } catch (err) { console.error(err); }
    }
    renderNotes();
  }

  window.Utrillo = Object.freeze({ registerVariant, variant: ARM });

  // ---------- Start ----------

  reset();
  renderCanvas('start');
  checkTasks();
  renderNotes();
})();
