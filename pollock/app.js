/*
 * Pollock · Drag handles.
 *
 * One editor for every prototype. Each HTML page sets window.PROTOTYPE:
 *   handle: 'today'   (A) the toolbar's drag handle as Gutenberg draws it now:
 *                         a 24px-wide button, icon clipped, pressed against the
 *                         move arrows, skipped by Tab.
 *           'edge'    (B) a six-dot grip on the block's left edge, shown on
 *                         hover and on the selected block. The toolbar keeps
 *                         its move arrows but has no drag handle.
 *           'toolbar' (C) the same place as today, made legible: a full-size
 *                         button with bigger dots, in its own group, with a
 *                         tooltip, reachable by Tab.
 *
 * Everything else is the same in every prototype: what dragging looks like,
 * the drop line, the move arrows, the options menu, undo. So differences in a
 * test come from the handle alone.
 *
 * Add ?notes (or #notes) to the address for the facilitator panel: the tasks tick
 * themselves, and every move (and every try at dragging something that
 * can't be dragged) is logged with the time since the page opened.
 */
(function () {
  'use strict';

  /*
   * Round 2 adds, per page:
   *   round:  2       a longer page where the moves are long, a Finished
   *                   button that shows a completion code to paste into the
   *                   testing tool (which shows the tasks), and a toolbar that
   *                   fades when the pointer is away from it, so it never hides
   *                   the text above the block.
   *   arrows: false   no move arrows in the toolbar (B without arrows).
   *   hint:   true    a "Drag to move" label beside the edge grip while the
   *                   pointer is over it (B with a label).
   *   layout: 'columns' the round 2 page with a full-width cover and the
   *                   opening hours and directions side by side in two
   *                   columns, so handles have to cope with blocks that
   *                   have no margin beside them.
   *   icon:   'arrows' a four-arrow move icon on the edge grip or the bigger
   *                   toolbar handle, in place of the six dots.
   *   code:   'Bh'    the short name that starts the completion code.
   *   directDrag      pictures drag by themselves, as in the editor. On by
   *                   default in round 2, off in round 1.
   */
  const CONFIG = Object.assign({ handle: 'today', round: 1, arrows: true, hint: false, icon: 'dots' }, window.PROTOTYPE || {});
  const ROUND2 = CONFIG.round === 2;
  // As in the editor today, a block that isn't text (here, a picture) can be
  // dragged by itself, without a handle: BlockListBlock is draggable when the
  // block, not a text field in it, has focus. Round 1 didn't have this.
  const DIRECT_DRAG = CONFIG.directDrag != null ? CONFIG.directDrag : ROUND2;
  const NOTES = new URLSearchParams(location.search).has('notes') || location.hash === '#notes';
  const LETTER = CONFIG.code || { today: 'A', edge: 'B', toolbar: 'C' }[CONFIG.handle];
  const PAGES = ROUND2 ? [
    { letter: 'A', href: 'today.html' },
    { letter: 'B', href: 'edge.html' },
    { letter: 'Bn', href: 'edge-no-arrows.html' },
    { letter: 'Bh', href: 'edge-hint.html' },
    { letter: 'Bm', href: 'edge-move-icon.html' },
    { letter: 'C', href: 'toolbar.html' },
    { letter: 'Cm', href: 'toolbar-move-icon.html' },
    { letter: 'Ac', href: 'today-columns.html' },
    { letter: 'Bc', href: 'edge-columns.html' },
    { letter: 'Cc', href: 'toolbar-columns.html' }
  ] : [
    { letter: 'A', href: 'today.html' },
    { letter: 'B', href: 'edge.html' },
    { letter: 'C', href: 'toolbar.html' }
  ];

  // ---------- Icons (from @wordpress/icons, plus a bigger grip) ----------

  const svg = (body) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">' + body + '</svg>';
  const dots = (xs, ys, size) => xs.flatMap((x) => ys.map((y) => '<rect x="' + (x - size / 2) + '" y="' + (y - size / 2) + '" width="' + size + '" height="' + size + '" fill="currentColor" stroke="none"/>')).join('');
  const ICON = {
    paragraph: svg('<path d="M10.75 20V4.75L14.75 4.75M14.75 20V4.75M14.75 4.75H18.5"/><path d="M5.75 9C5.75 11.3472 7.65279 13.25 10 13.25H10.75V4.75H10C7.65279 4.75 5.75 6.65279 5.75 9Z" fill="currentColor"/>'),
    heading: svg('<path d="M3.75 12H11.75M3.75 12V6M3.75 12L3.75 18M11.75 12V6M11.75 12V18" stroke-linecap="square"/><path d="M20.3915 17.9989H16C16 13.4611 20.5 14.6523 20.5 11.2489C20.5 9.54722 18.1957 8.04722 16 9.7489" stroke-linecap="square"/>'),
    image: svg('<path d="M19.25 14.2513L16.0707 11.0707C16.0317 11.0317 15.9683 11.0317 15.9293 11.0707L12.0584 14.9416C12.0245 14.9755 11.9713 14.9806 11.9316 14.9537L8.65791 12.7392C8.62313 12.7156 8.57736 12.7163 8.54332 12.7409L4.75 15.4808M19.25 14.2513V6C19.25 5.30964 18.6904 4.75 18 4.75H6C5.30964 4.75 4.75 5.30964 4.75 6V15.4808M19.25 14.2513V18C19.25 18.6904 18.6904 19.25 18 19.25H6C5.30964 19.25 4.75 18.6904 4.75 18V15.4808"/>'),
    quote: svg('<path d="M10 11.25V6.75H4.75V11.25H10ZM10 11.25V16C10 17.5 9.5 19 6 19M19 11.25V6.75H13.75V11.25H19ZM19 11.25V16C19 17.5 18.5 19 15 19"/><path d="M10 6.75V11.25H4.75V6.75H10Z" fill="currentColor" stroke="none"/><path d="M19 6.75V11.25H13.75V6.75H19Z" fill="currentColor" stroke="none"/>'),
    buttons: svg('<path d="M9.5 7.25H14.5M9.5 16.75H14.5M7 19.75H17C17.6904 19.75 18.25 19.1904 18.25 18.5V15C18.25 14.3096 17.6904 13.75 17 13.75H7C6.30964 13.75 5.75 14.3096 5.75 15V18.5C5.75 19.1904 6.30964 19.75 7 19.75ZM7 10.25H17C17.6904 10.25 18.25 9.69036 18.25 9V5.5C18.25 4.80964 17.6904 4.25 17 4.25H7C6.30964 4.25 5.75 4.80964 5.75 5.5V9C5.75 9.69036 6.30964 10.25 7 10.25Z"/>'),
    // The editor's dragHandle: 0.5px squares with a 1.5px stroke, so 2px dots.
    dragToday: svg(dots([9, 15], [6, 12, 18], 0.5) + ['M9.25 5.75H8.75V6.25H9.25V5.75Z', 'M9.25 11.75H8.75V12.25H9.25V11.75Z', 'M9.25 17.75H8.75V18.25H9.25V17.75Z', 'M15.25 5.75H14.75V6.25H15.25V5.75Z', 'M15.25 11.75H14.75V12.25H15.25V11.75Z', 'M15.25 17.75H14.75V18.25H15.25V17.75Z'].map((d) => '<path d="' + d + '"/>').join('')),
    // The same grid with dots you can see: 3px, rounded.
    // A four-arrow move icon, drawn to match: 1.5px strokes on a 24px grid.
    dragMove: svg('<path d="M12 3.75V20.25M3.75 12H20.25"/><path d="M9.5 6.25L12 3.75L14.5 6.25M9.5 17.75L12 20.25L14.5 17.75M6.25 9.5L3.75 12L6.25 14.5M17.75 9.5L20.25 12L17.75 14.5" stroke-linecap="round" stroke-linejoin="round"/>'),
    dragBig: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + [9, 15].flatMap((x) => [6, 12, 18].map((y) => '<circle cx="' + x + '" cy="' + y + '" r="1.75" fill="currentColor"/>')).join('') + '</svg>',
    columns: svg('<path d="M14.75 5.75H19C19.6904 5.75 20.25 6.30964 20.25 7V17C20.25 17.6904 19.6904 18.25 19 18.25H14.75M14.75 5.75V18.25M14.75 5.75H9.25M14.75 18.25H9.25M9.25 18.25H5C4.30964 18.25 3.75 17.6904 3.75 17V7C3.75 6.30964 4.30964 5.75 5 5.75H9.25M9.25 18.25V5.75"/>'),
    cover: svg('<path d="M20.25 18.75V5.25C20.25 4.42157 19.5784 3.75 18.75 3.75H5.25C4.42157 3.75 3.75 4.42157 3.75 5.25V18.75C3.75 19.5784 4.42157 20.25 5.25 20.25H18.75C19.5784 20.25 20.25 19.5784 20.25 18.75Z"/><path d="M11.5 13.4V3.75H16.5V13.4L14 10.3L11.5 13.4Z" fill="currentColor" stroke="none"/>'),
    up: svg('<path d="M7 13L12 9L17 13"/>'),
    down: svg('<path d="M7 11L12 15L17 11"/>'),
    more: svg(dots([12], [6, 12, 18], 0.5) + '<path d="M11.75 18.25L12.25 18.25L12.25 17.75L11.75 17.75Z"/><path d="M11.75 12.25L12.25 12.25L12.25 11.75L11.75 11.75Z"/><path d="M11.75 6.25L12.25 6.25L12.25 5.75L11.75 5.75Z"/>'),
    align: svg('<path d="M4 5H13M4 12H20M4 19H13"/>'),
    bold: svg('<path d="M8.25 11.75V17.5H12.8642C14.5503 17.5 15.8744 16.0557 15.7283 14.3759C15.5992 12.8903 14.3554 11.75 12.8642 11.75H8.25ZM8.25 11.75V11.25M8.25 11.25V6.5H12.625C13.9367 6.5 15 7.56332 15 8.875C15 10.1867 13.9367 11.25 12.625 11.25H8.25Z"/>'),
    italic: svg('<path d="M11 19L13.5 5"/>'),
    link: svg('<path d="M9.5 12L14.5 12M10 7.75H8.25C5.90279 7.75 4 9.65279 4 12C4 14.3472 5.90279 16.25 8.25 16.25H10M14 16.25H15.75C18.0972 16.25 20 14.3472 20 12C20 9.65279 18.0972 7.75 15.75 7.75L14 7.75"/>'),
    undo: svg('<path d="M8.25 15L4.75 11L8.25 7M4.75 11H15.25C18.25 11 18.5 13.8 18.5 17"/>'),
    redo: svg('<path d="M15 15L18.5 11L15 7M18.5 11H8C5 11 4.75 13.8 4.75 17"/>'),
    plus: svg('<path d="M12 18V6M18 12H6"/>'),
    listView: svg('<path d="M10 17.5H21M6.5 12H17.5M3 6.5H14" stroke-linejoin="round"/>')
  };

  const LOAF = '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="0" y="128" width="320" height="52" fill="#8a4b25" opacity=".35"/><ellipse cx="160" cy="132" rx="120" ry="14" fill="#5a2e14" opacity=".25"/><path d="M60 128 C60 70 100 52 160 52 C220 52 260 70 260 128 Z" fill="#a8562a"/><path d="M78 124 C80 80 112 66 160 66 C208 66 240 80 242 124 Z" fill="#c46a35"/><path d="M110 70 l14 22 M150 62 l10 26 M192 66 l8 24" stroke="#f3c48f" stroke-width="5" stroke-linecap="round"/><circle cx="262" cy="116" r="16" fill="#e8892f"/><path d="M262 100 v-8" stroke="#5f7d3a" stroke-width="4" stroke-linecap="round"/></svg>';

  const BUNS = '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="180" fill="#f1dcc0"/><rect y="120" width="320" height="60" fill="#c9a27a"/>' + [[90, 105], [160, 95], [230, 105], [125, 132], [195, 132]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="34" fill="#c27a3e"/><path d="M' + (x - 18) + ' ' + y + ' a18 18 0 1 0 18 -18 a10 10 0 1 1 -10 10" stroke="#6e3a17" stroke-width="5" fill="none" stroke-linecap="round"/>').join('') + '</svg>';

  // ---------- Content ----------

  const BLOCKS = {
    title: { type: 'heading', level: 1, name: 'Heading', html: 'Autumn at Rosa’s' },
    intro: { type: 'paragraph', name: 'Paragraph', html: 'From this week the counter is full of autumn bakes, made every morning with flour from the mill down the road.' },
    quote: { type: 'quote', name: 'Quote', html: 'The best cinnamon buns in town, and the pumpkin loaf is even better.', cite: 'Ana, a regular' },
    picture: { type: 'image', name: 'Image', caption: 'Spiced pumpkin loaf' },
    'order-heading': { type: 'heading', level: 2, name: 'Heading', html: 'Order for the weekend' },
    'order-text': { type: 'paragraph', name: 'Paragraph', html: 'Whole cakes and loaves need ordering by Thursday at noon. Collect them from the shop on Saturday morning.' },
    closed: { type: 'paragraph', name: 'Paragraph', html: 'We’re closed on Mondays.' },
    button: { type: 'buttons', name: 'Buttons', html: 'Order online' }
  };
  const ICON_FOR = { heading: 'heading', paragraph: 'paragraph', quote: 'quote', image: 'image', buttons: 'buttons', columns: 'columns', cover: 'cover' };
  // a comes straight after b, in the same list (the page, or one column).
  const after = (o, a, b) => { const l = lists[listOf(b)]; return !!l && l.indexOf(a) === l.indexOf(b) + 1; };

  // Round 1: eight blocks, short moves.
  const START_1 = ['title', 'intro', 'quote', 'picture', 'order-heading', 'order-text', 'closed', 'button'];
  const TASKS_1 = [
    { text: 'Put the picture of the pumpkin loaf at the very top, above “Autumn at Rosa’s”.', done: (o) => o[0] === 'picture' },
    { text: 'Move the quote from Ana to the end of the page.', done: (o) => o[o.length - 1] === 'quote' },
    { text: 'Put the Order online button straight under “Order for the weekend”.', done: (o) => after(o, 'button', 'order-heading') },
    { text: 'Move “We’re closed on Mondays” so it comes straight after the first paragraph.', done: (o) => after(o, 'closed', 'intro') }
  ];

  // Round 2: a longer page, where every move is long enough that dragging
  // is quicker than clicking an arrow, and the first one is the longest.
  Object.assign(BLOCKS, {
    'breads-heading': { type: 'heading', level: 2, name: 'Heading', html: 'Our breads' },
    sourdough: { type: 'paragraph', name: 'Paragraph', html: 'Our white sourdough takes two days: a slow rise overnight, then a hot oven first thing.' },
    rye: { type: 'paragraph', name: 'Paragraph', html: 'The dark rye is dense, sour and keeps for a week. It’s best sliced thin with butter.' },
    focaccia: { type: 'paragraph', name: 'Paragraph', html: 'Focaccia comes out at eleven, with rosemary and sea salt, or tomatoes when they’re good.' },
    buns: { type: 'image', name: 'Image', caption: 'Cinnamon buns, out of the oven at eight', art: 'buns' },
    'hours-heading': { type: 'heading', level: 2, name: 'Heading', html: 'Opening hours' },
    'hours-week': { type: 'paragraph', name: 'Paragraph', html: 'Tuesday to Friday, 7am to 4pm.' },
    'hours-sat': { type: 'paragraph', name: 'Paragraph', html: 'Saturday, 8am to 2pm.' },
    'visit-heading': { type: 'heading', level: 2, name: 'Heading', html: 'Visit us' },
    address: { type: 'paragraph', name: 'Paragraph', html: 'You’ll find us at 12 Mill Lane, next to the post office.' },
    parking: { type: 'paragraph', name: 'Paragraph', html: 'There’s free parking behind the shop, and a bike rack by the door.' },
    'gifts-heading': { type: 'heading', level: 2, name: 'Heading', html: 'Gift cards' },
    gifts: { type: 'paragraph', name: 'Paragraph', html: 'Gift cards come in any amount and never run out. Ask at the counter.' },
    newsletter: { type: 'paragraph', name: 'Paragraph', html: 'Join our newsletter for the week’s specials, every Thursday.' }
  });
  const START_2 = ['title', 'intro', 'closed', 'breads-heading', 'sourdough', 'rye', 'focaccia', 'buns', 'order-heading', 'order-text', 'hours-heading', 'hours-week', 'hours-sat', 'visit-heading', 'address', 'parking', 'quote', 'gifts-heading', 'gifts', 'picture', 'newsletter', 'button'];
  const TASKS_2 = [
    { text: 'Put the picture of the pumpkin loaf at the very top of the page, above “Autumn at Rosa’s”.', done: (o) => o[0] === 'picture' },
    { text: '“We’re closed on Mondays” is in the wrong place. Move it to the opening hours, straight after “Saturday, 8am to 2pm.”', done: (o) => after(o, 'closed', 'hours-sat') },
    { text: 'Put the Order online button straight after the paragraph about ordering for the weekend (“Whole cakes and loaves…”).', done: (o) => after(o, 'button', 'order-text') },
    { text: 'Move the quote from Ana so it comes straight after the first paragraph (“From this week…”).', done: (o) => after(o, 'quote', 'intro') }
  ];

  // Round 2, columns layout: the same page with a full-width cover, and the
  // opening hours and directions side by side in a Columns block.
  Object.assign(BLOCKS, {
    cover: { type: 'cover', name: 'Cover', html: 'Fresh every morning', sub: 'Baked on Mill Lane since 1998', full: true },
    columns: { type: 'columns', name: 'Columns', html: 'Opening hours and Visit us', columns: ['col-left', 'col-right'] }
  });
  const LISTS_3 = {
    root: ['title', 'intro', 'closed', 'cover', 'breads-heading', 'sourdough', 'rye', 'focaccia', 'buns', 'order-heading', 'order-text', 'columns', 'quote', 'gifts-heading', 'gifts', 'picture', 'newsletter', 'button'],
    'col-left': ['hours-heading', 'hours-week', 'hours-sat'],
    'col-right': ['parking', 'visit-heading', 'address']
  };
  const TASKS_3 = [
    TASKS_2[0],
    { text: '“We’re closed on Mondays” is in the wrong place. Move it to the opening hours, straight after “Saturday, 8am to 2pm.”', done: (o) => after(o, 'closed', 'hours-sat') },
    { text: 'In “Visit us”, the paragraph about parking is above the heading. Move it so it comes last in that column, after the address.', done: (o) => after(o, 'parking', 'address') },
    { text: 'Move the “Fresh every morning” banner so it comes straight after the Order online button, at the end of the page.', done: (o) => after(o, 'cover', 'button') }
  ];

  const COLUMNS = ROUND2 && CONFIG.layout === 'columns';
  const START_LISTS = COLUMNS ? LISTS_3 : { root: ROUND2 ? START_2 : START_1 };
  const START = Object.values(START_LISTS).flat();
  const TASKS = COLUMNS ? TASKS_3 : ROUND2 ? TASKS_2 : TASKS_1;
  const LIST_NAMES = { root: 'the page', 'col-left': 'the left column', 'col-right': 'the right column' };

  // ---------- State ----------

  // lists: { root: [ids], 'col-left': [ids], … } — the page and each column.
  // order: every block, page order, columns' contents straight after them.
  let lists, order, past, future, selected, hovered, t0, log, firstDone;

  const cloneLists = (l) => JSON.parse(JSON.stringify(l));
  function listOf(id) { return Object.keys(lists).find((k) => lists[k].includes(id)); }
  function flatten(l) {
    const out = [];
    (function walk(key) { l[key].forEach((id) => { out.push(id); (BLOCKS[id].columns || []).forEach(walk); }); })('root');
    return out;
  }
  function setLists(l) { lists = l; order = flatten(l); }

  function resetState() {
    setLists(cloneLists(START_LISTS));
    past = [];
    future = [];
    selected = null;
    hovered = null;
    t0 = performance.now();
    log = [];
    firstDone = TASKS.map(() => null);
  }

  const seconds = () => Math.round((performance.now() - t0) / 1000);
  const elapsed = () => {
    const s = seconds();
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  function note(kind, text) {
    log.push({ at: elapsed(), sec: seconds(), kind, text });
    renderNotes();
  }

  // ---------- DOM ----------

  const $ = (tag, attrs, html) => {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else el.setAttribute(k, v);
    });
    if (html != null) el.innerHTML = html;
    return el;
  };

  const app = $('div', { class: 'app' + (NOTES ? ' has-notes' : '') });
  document.getElementById('app').replaceWith(app);

  // Top bar
  const topbar = $('header', { class: 'topbar' });
  topbar.append($('div', { class: 'wp-logo', 'aria-hidden': 'true', text: 'W' }));
  const inserterBtn = $('button', { class: 'icon-btn btn-primary', 'aria-label': 'Add block', style: 'width:32px;height:32px;margin-left:8px;border-radius:2px;background:var(--blue);color:#fff' }, ICON.plus);
  const undoBtn = $('button', { class: 'icon-btn', 'aria-label': 'Undo' }, ICON.undo);
  const redoBtn = $('button', { class: 'icon-btn', 'aria-label': 'Redo' }, ICON.redo);
  const listViewBtn = $('button', { class: 'icon-btn', 'aria-label': 'Document overview' }, ICON.listView);
  topbar.append(inserterBtn, undoBtn, redoBtn, listViewBtn);
  topbar.append($('div', { class: 'topbar-title' }, '<strong>Autumn menu</strong> · Page'));
  if (NOTES) {
    const sw = $('nav', { class: 'switcher', 'aria-label': 'Prototypes' });
    PAGES.forEach((p) => {
      const a = $('a', { href: p.href + (location.hash === '#notes' ? '#notes' : '?notes'), text: p.letter });
      if (p.letter === LETTER) a.setAttribute('aria-current', 'page');
      sw.append(a);
    });
    topbar.append(sw);
  }
  const resetBtn = $('button', { class: 'btn btn-link', text: 'Reset' });
  // In round 2 only the facilitator gets Reset, so a participant can't lose their place.
  if (!ROUND2 || NOTES) topbar.append(resetBtn);
  topbar.append($('button', { class: 'btn btn-primary', disabled: '', text: 'Save' }));
  app.append(topbar);

  // Canvas
  const scroller = $('div', { class: 'canvas-scroll' });
  const canvas = $('div', { class: 'canvas', role: 'document', 'aria-label': 'Page content' });
  scroller.append(canvas);
  app.append(scroller);

  const blockEls = {};
  function buildBlock(id) {
    const b = BLOCKS[id];
    const el = $('div', { class: 'block block-' + b.type + (b.level ? '-' + b.level : ''), 'data-id': id, 'aria-label': 'Block: ' + b.name, tabindex: '-1' });
    if (b.type === 'heading') el.innerHTML = '<h' + b.level + ' contenteditable="true">' + b.html + '</h' + b.level + '>';
    if (b.type === 'paragraph') el.innerHTML = '<p contenteditable="true">' + b.html + '</p>';
    if (b.type === 'quote') el.innerHTML = '<blockquote><p contenteditable="true" style="margin:0">' + b.html + '</p><cite contenteditable="true">' + b.cite + '</cite></blockquote>';
    if (b.type === 'image') el.innerHTML = '<figure><div class="picture" draggable="false">' + (b.art === 'buns' ? BUNS : LOAF) + '</div><figcaption contenteditable="true">' + b.caption + '</figcaption></figure>';
    if (b.type === 'buttons') el.innerHTML = '<span class="wp-button" contenteditable="true">' + b.html + '</span>';
    if (b.type === 'cover') el.innerHTML = '<div class="cover-bg"><h2 contenteditable="true">' + b.html + '</h2><p contenteditable="true">' + b.sub + '</p></div>';
    if (b.type === 'columns') el.innerHTML = '<div class="wp-columns">' + b.columns.map((k) => '<div class="wp-column" data-list="' + k + '"></div>').join('') + '</div>';
    if (b.full) el.classList.add('alignfull');
    return el;
  }
  function buildBlocks() {
    canvas.querySelectorAll('.block').forEach((el) => el.remove());
    START.forEach((id) => { blockEls[id] = buildBlock(id); });
  }

  // Toolbar, edge handle, drop line, menu: one of each, moved around.
  const toolbar = $('div', { class: 'block-toolbar', role: 'toolbar', 'aria-label': 'Block tools', 'aria-orientation': 'horizontal' });
  const GRIP = CONFIG.icon === 'arrows' ? 'dragMove' : 'dragBig';
  const edgeHandle = $('button', { class: 'edge-handle', 'aria-label': 'Drag to move. Arrow keys move too.', title: 'Drag to move' }, ICON[GRIP]);
  const dropLine = $('div', { class: 'drop-line' });
  const menu = $('div', { class: 'menu', role: 'menu', hidden: '' });
  canvas.append(toolbar, dropLine, menu);
  if (CONFIG.handle === 'edge') canvas.append(edgeHandle);
  const hintEl = $('div', { class: 'edge-hint', 'aria-hidden': 'true', text: 'Drag to move' });
  if (CONFIG.hint) {
    canvas.append(hintEl);
    edgeHandle.removeAttribute('title'); // the label does the tooltip's job
    const show = (on) => hintEl.classList.toggle('is-visible', on && !drag && edgeHandle.classList.contains('is-visible'));
    edgeHandle.addEventListener('pointerenter', () => show(true));
    edgeHandle.addEventListener('pointerleave', () => show(false));
    edgeHandle.addEventListener('focus', () => requestAnimationFrame(() => show(true)));
    edgeHandle.addEventListener('blur', () => show(false));
  }

  const snackbar = $('div', { class: 'snackbar', role: 'status' });
  document.body.append(snackbar);
  let snackTimer;
  function toast(text) {
    snackbar.textContent = text;
    snackbar.classList.add('is-visible');
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => snackbar.classList.remove('is-visible'), 2600);
  }

  // ---------- Rendering ----------

  function render() {
    lists.root.forEach((id) => canvas.insertBefore(blockEls[id], toolbar));
    Object.keys(lists).forEach((k) => {
      if (k === 'root') return;
      const col = canvas.querySelector('.wp-column[data-list="' + k + '"]');
      lists[k].forEach((id) => col.append(blockEls[id]));
    });
    canvas.style.setProperty('--full-w', scroller.clientWidth + 'px');
    Object.entries(blockEls).forEach(([id, el]) => {
      el.classList.toggle('is-selected', id === selected);
      el.classList.toggle('is-hovered', id === hovered && id !== selected && !drag);
    });
    undoBtn.disabled = !past.length;
    redoBtn.disabled = !future.length;
    // Keep focus on the same toolbar button when the toolbar is redrawn.
    const focused = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.block-toolbar [data-action]') : null;
    renderToolbar();
    if (focused) {
      const again = toolbar.querySelector('[data-action="' + focused.dataset.action + '"]');
      if (again && !again.disabled) again.focus();
    }
    position();
    checkTasks();
    renderNotes();
  }

  function toolButton(icon, label, action, extra) {
    const b = $('button', Object.assign({ class: 'icon-btn', 'aria-label': label, title: label, 'data-action': action }, extra || {}), ICON[icon]);
    return b;
  }

  function renderToolbar() {
    toolbar.innerHTML = '';
    if (!selected || drag) { toolbar.classList.remove('is-visible'); return; }
    const b = BLOCKS[selected];
    const own = lists[listOf(selected)];
    const i = own.indexOf(selected);

    const first = $('div', { class: 'tb-group' });
    first.append(toolButton(ICON_FOR[b.type], b.name, 'switcher'));
    if (CONFIG.handle === 'today') {
      // As BlockMover draws it: tabIndex -1, 24px wide, icon clipped.
      const h = toolButton('dragToday', 'Drag', 'drag', { class: 'icon-btn drag-today', tabindex: '-1' });
      h.dataset.handle = 'toolbar';
      first.append(h);
    }
    const movers = $('div', { class: 'movers' });
    const up = toolButton('up', 'Move up', 'up');
    const down = toolButton('down', 'Move down', 'down');
    if (i === 0) up.disabled = true;
    if (i === own.length - 1) down.disabled = true;
    movers.append(up, down);
    if (CONFIG.arrows) first.append(movers);

    const groups = [];
    if (CONFIG.handle === 'toolbar') {
      const g = $('div', { class: 'tb-group' });
      const h = toolButton(GRIP, 'Drag to move. Arrow keys move too.', 'drag', { class: 'icon-btn drag-big', title: 'Drag to move' });
      h.dataset.handle = 'toolbar';
      g.append(h);
      groups.push(g);
    }
    groups.push(first);

    const tools = $('div', { class: 'tb-group' });
    tools.append(toolButton('align', 'Align text', 'align'));
    if (!['image', 'buttons', 'columns', 'cover'].includes(b.type)) {
      tools.append(toolButton('bold', 'Bold', 'bold'), toolButton('italic', 'Italic', 'italic'));
    }
    tools.append(toolButton('link', 'Link', 'link'));
    groups.push(tools);

    const more = $('div', { class: 'tb-group' });
    more.append(toolButton('more', 'Options', 'more', { 'aria-haspopup': 'true' }));
    groups.push(more);

    toolbar.append(...groups);
    toolbar.classList.add('is-visible');
  }

  // Where an element is, relative to the canvas (blocks in columns have other
  // offset parents, so offsetTop isn't enough).
  function rel(el) {
    const r = el.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    return { top: r.top - c.top, left: r.left - c.left, right: r.right - c.left, bottom: r.bottom - c.top, width: r.width, height: r.height };
  }

  // The edge grip goes in the margin to the left of a block when there's room
  // (36px clear of whatever is to its left), and just inside the block's
  // top-left corner when there isn't: full-width blocks, and blocks in any
  // column but the first.
  function gripFitsOutside(id) {
    const el = blockEls[id];
    const r = rel(el);
    let limit = rel(scroller).left;
    const col = el.parentElement.closest('.wp-column');
    if (col && col.previousElementSibling) limit = rel(col.previousElementSibling).right;
    return r.left - limit >= 40;
  }

  function firstLineCentre(el) {
    if (el.classList.contains('block-cover') || el.classList.contains('block-columns')) return 20;
    const inner = el.querySelector('h1, h2, p, .picture, .wp-button');
    if (!inner) return 16;
    if (inner.classList.contains('picture')) return 20;
    if (inner.classList.contains('wp-button')) return inner.offsetHeight / 2;
    const lh = parseFloat(getComputedStyle(inner).lineHeight) || 24;
    return lh / 2;
  }

  function position() {
    if (selected && !drag) {
      const r = rel(blockEls[selected]);
      toolbar.style.top = (r.top - 48 - 14) + 'px';
      // A full-width block's toolbar sits over its corner, as in the editor.
      toolbar.style.left = (BLOCKS[selected].full ? r.left + 12 : r.left - 6) + 'px';
    }
    if (CONFIG.handle === 'edge') {
      const id = drag ? null : (hovered || selected);
      if (id) {
        const el = blockEls[id];
        const r = rel(el);
        const outside = gripFitsOutside(id);
        const top = outside ? r.top + firstLineCentre(el) - 16 : r.top + 6;
        const left = outside ? r.left - 40 : r.left + 6;
        edgeHandle.style.top = top + 'px';
        edgeHandle.style.left = left + 'px';
        edgeHandle.classList.toggle('is-inside', !outside);
        edgeHandle.dataset.id = id;
        edgeHandle.classList.add('is-visible');
        // The label goes to the left of the grip outside, and to its right inside.
        hintEl.style.top = (top + 3) + 'px';
        hintEl.style.left = (outside ? left - 6 : left + 34) + 'px';
        hintEl.classList.toggle('is-right', !outside);
      } else if (document.activeElement !== edgeHandle) {
        edgeHandle.classList.remove('is-visible');
        hintEl.classList.remove('is-visible');
      }
    }
  }

  // ---------- Moving ----------

  function commit(next, method) {
    if (JSON.stringify(next) === JSON.stringify(lists)) return false;
    const moved = (drag && drag.id) || selected;
    const fromList = listOf(moved);
    const from = lists[fromList].indexOf(moved);
    past.push(lists);
    future = [];
    setLists(next);
    const toList = listOf(moved);
    const to = lists[toList].indexOf(moved);
    const where = fromList === toList
      ? (to < from ? 'up' : 'down') + ' ' + Math.abs(to - from)
      : 'from ' + LIST_NAMES[fromList] + ' to ' + LIST_NAMES[toList];
    note('move', describe(moved) + ' ' + where + ' · ' + method);
    return true;
  }

  const describe = (id) => {
    const b = BLOCKS[id];
    const label = (b.html || b.caption || '').replace(/<[^>]+>/g, '');
    return b.name + ' “' + (label.length > 22 ? label.slice(0, 22) + '…' : label) + '”';
  };

  function nudge(id, delta, method) {
    const key = listOf(id);
    const i = lists[key].indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= lists[key].length) return;
    const next = cloneLists(lists);
    next[key].splice(i, 1);
    next[key].splice(j, 0, id);
    selected = id;
    commit(next, method);
    render();
  }

  function undo() {
    if (!past.length) return;
    future.push(lists);
    setLists(past.pop());
    note('other', 'Undo');
    render();
  }
  function redo() {
    if (!future.length) return;
    past.push(lists);
    setLists(future.pop());
    note('other', 'Redo');
    render();
  }

  // ---------- Dragging ----------

  let press = null; // a pointer down on a handle, not yet a drag
  let drag = null;  // { id, source, index }
  let lastPointer = null;
  let chip = null;

  function onHandleDown(e, id, source) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    press = { id, source, x: e.clientX, y: e.clientY };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragUp);
    window.addEventListener('pointercancel', cancelDrag);
  }

  function startDrag() {
    drag = { id: press.id, source: press.source, list: listOf(press.id), index: lists[listOf(press.id)].indexOf(press.id) };
    press = null;
    selected = drag.id;
    document.body.classList.add('is-grabbing');
    blockEls[drag.id].classList.add('is-dragging');
    hintEl.classList.remove('is-visible');
    chip = $('div', { class: 'drag-chip' }, ICON[ICON_FOR[BLOCKS[drag.id].type]] + '<span>' + BLOCKS[drag.id].name + '</span>');
    document.body.append(chip);
    window.getSelection().removeAllRanges();
    render();
    requestAnimationFrame(autoScroll);
  }

  function onDragMove(e) {
    lastPointer = { x: e.clientX, y: e.clientY };
    if (press) {
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 4) return;
      startDrag();
    }
    if (!drag) return;
    chip.style.left = (e.clientX + 14) + 'px';
    chip.style.top = (e.clientY + 14) + 'px';
    updateDrop(e.clientY, e.clientX);
  }

  // Which list the pointer is over: a column, if it's inside one (and that
  // column isn't part of the block being dragged), or else the page.
  function dropList(x, y) {
    for (const col of canvas.querySelectorAll('.wp-column')) {
      if (blockEls[drag.id].contains(col)) continue;
      const r = col.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top - 14 && y <= r.bottom + 14) return col.dataset.list;
    }
    return 'root';
  }

  function updateDrop(y, x) {
    if (x == null) x = drag.x;
    drag.x = x;
    const key = dropList(x, y);
    const rest = lists[key].filter((id) => id !== drag.id);
    let index = rest.length;
    for (let i = 0; i < rest.length; i++) {
      const r = blockEls[rest[i]].getBoundingClientRect();
      if (y < r.top + r.height / 2) { index = i; break; }
    }
    drag.list = key;
    drag.index = index;
    let top;
    if (!rest.length) top = rel(canvas.querySelector('.wp-column[data-list="' + key + '"]')).top;
    else if (index < rest.length) top = rel(blockEls[rest[index]]).top - 14;
    else top = rel(blockEls[rest[rest.length - 1]]).bottom + 14;
    const box = key === 'root' ? { left: 0, width: canvas.clientWidth } : rel(canvas.querySelector('.wp-column[data-list="' + key + '"]'));
    dropLine.style.top = top + 'px';
    dropLine.style.left = box.left + 'px';
    dropLine.style.width = box.width + 'px';
    dropLine.classList.add('is-visible');
  }

  function autoScroll() {
    if (!drag) return;
    if (lastPointer) {
      const r = scroller.getBoundingClientRect();
      const edge = 64;
      let dy = 0;
      if (lastPointer.y < r.top + edge) dy = -Math.ceil((r.top + edge - lastPointer.y) / 4);
      if (lastPointer.y > r.bottom - edge) dy = Math.ceil((lastPointer.y - (r.bottom - edge)) / 4);
      if (dy) { scroller.scrollTop += dy; updateDrop(lastPointer.y, lastPointer.x); }
    }
    requestAnimationFrame(autoScroll);
  }

  function onDragUp() {
    if (press) {
      // A click on the handle with no drag: the handle selects its block, nothing else.
      if (press.source !== 'picture') note('other', 'Clicked the ' + press.source + ' drag handle without dragging');
      selected = press.id;
      press = null;
      cleanupListeners();
      render();
      return;
    }
    if (!drag) return;
    const next = cloneLists(lists);
    Object.keys(next).forEach((k) => { next[k] = next[k].filter((id) => id !== drag.id); });
    next[drag.list].splice(drag.index, 0, drag.id);
    const label = drag.source === 'picture' ? 'dragged the block itself' : 'dragged from the ' + drag.source + ' handle';
    if (!commit(next, label)) note('other', 'Dragged ' + describe(drag.id) + ' and dropped it where it was');
    endDrag();
  }

  function cancelDrag() {
    if (drag) note('other', 'Started dragging ' + describe(drag.id) + ', then cancelled');
    press = null;
    endDrag();
  }

  function endDrag() {
    if (drag) blockEls[drag.id].classList.remove('is-dragging');
    drag = null;
    if (chip) chip.remove();
    chip = null;
    dropLine.classList.remove('is-visible');
    document.body.classList.remove('is-grabbing');
    cleanupListeners();
    render();
  }

  function cleanupListeners() {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragUp);
    window.removeEventListener('pointercancel', cancelDrag);
  }

  // ---------- Tries at dragging something that isn't a handle ----------

  let attempt = null;
  function labelFor(target) {
    if (target.closest('.block-toolbar')) {
      const btn = target.closest('[data-action]');
      if (!btn) return 'the toolbar';
      return { switcher: 'the block icon in the toolbar', up: 'the Move up arrow', down: 'the Move down arrow' }[btn.dataset.action] || 'the toolbar’s ' + btn.getAttribute('aria-label') + ' button';
    }
    const block = target.closest('.block');
    if (!block) return null;
    if (target.closest('.picture')) return 'the picture itself';
    if (target.closest('.cover-bg') && !target.isContentEditable) return 'the cover itself';
    return 'the text of ' + describe(block.dataset.id);
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-handle], .edge-handle') || e.button !== 0) return;
    if (DIRECT_DRAG && (e.target.closest('.picture') || (e.target.closest('.cover-bg') && !e.target.isContentEditable))) return;
    const label = labelFor(e.target);
    attempt = label ? { x: e.clientX, y: e.clientY, label, logged: false } : null;
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (!attempt || attempt.logged || !(e.buttons & 1)) return;
    if (Math.hypot(e.clientX - attempt.x, e.clientY - attempt.y) > 16) {
      attempt.logged = true;
      note('miss', attempt.label.startsWith('the text')
        ? 'Dragged across ' + attempt.label + ' (that selects text)'
        : 'Tried to drag ' + attempt.label);
    }
  });
  document.addEventListener('pointerup', () => { attempt = null; });
  canvas.addEventListener('dragstart', (e) => e.preventDefault());

  // ---------- Events ----------

  canvas.addEventListener('pointerdown', (e) => {
    const picture = DIRECT_DRAG && (e.target.closest('.picture') || (e.target.closest('.cover-bg') && !e.target.isContentEditable));
    if (picture) {
      const id = picture.closest('.block').dataset.id;
      closeMenu();
      if (id !== selected) { selected = id; render(); }
      blockEls[id].focus({ preventScroll: true });
      onHandleDown(e, id, 'picture');
      return;
    }
    const handle = e.target.closest('[data-handle], .edge-handle');
    if (handle) {
      onHandleDown(e, handle.classList.contains('edge-handle') ? handle.dataset.id : selected, handle.classList.contains('edge-handle') ? 'block-edge' : 'toolbar');
      return;
    }
    if (e.target.closest('.block-toolbar, .menu')) return;
    const block = e.target.closest('.block');
    closeMenu();
    const id = block ? block.dataset.id : null;
    if (id !== selected) { selected = id; render(); }
  });

  scroller.addEventListener('pointerdown', (e) => {
    if (e.target === scroller || e.target === canvas) { selected = null; closeMenu(); render(); }
  });

  scroller.addEventListener('pointermove', (e) => {
    if (drag || press) return;
    if (ROUND2) fadeToolbar(e.clientX, e.clientY);
    // The innermost block under the pointer (a block in a column, not the
    // Columns block around it). The margin to a block's left counts as the
    // block only where its grip goes there.
    let id = null;
    let best = Infinity;
    for (const bid of order) {
      const r = blockEls[bid].getBoundingClientRect();
      const reach = CONFIG.handle === 'edge' && gripFitsOutside(bid) ? 56 : 0;
      const pad = listOf(bid) === 'root' ? 14 : 0;
      if (e.clientY >= r.top - pad && e.clientY <= r.bottom + pad && e.clientX >= r.left - reach && e.clientX <= r.right + 8) {
        const area = r.width * r.height;
        if (area < best) { best = area; id = bid; }
      }
    }
    if (e.target.closest('.block-toolbar, .edge-handle')) id = hovered;
    if (id !== hovered) {
      hovered = id;
      Object.entries(blockEls).forEach(([bid, el]) => el.classList.toggle('is-hovered', bid === hovered && bid !== selected));
      position();
    }
  });
  scroller.addEventListener('pointerleave', () => {
    if (drag) return;
    hovered = null;
    Object.values(blockEls).forEach((el) => el.classList.remove('is-hovered'));
    position();
  });

  // Round 2: the toolbar fades when the pointer is away from it and its block,
  // so it never hides the text above the block you're reading.
  function fadeToolbar(x, y) {
    if (!selected) return;
    const near = (r) => x >= r.left - 16 && x <= r.right + 16 && y >= r.top - 16 && y <= r.bottom + 16;
    const close = near(blockEls[selected].getBoundingClientRect()) || near(toolbar.getBoundingClientRect());
    toolbar.classList.toggle('is-faded', !close);
  }

  toolbar.addEventListener('mousedown', (e) => {
    // Keep the text selection for Bold and Italic.
    if (e.target.closest('[data-action="bold"], [data-action="italic"]')) e.preventDefault();
  });

  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const a = btn.dataset.action;
    if (a === 'up') nudge(selected, -1, 'Move up arrow');
    else if (a === 'down') nudge(selected, 1, 'Move down arrow');
    else if (a === 'bold' || a === 'italic') { document.execCommand(a); note('other', a === 'bold' ? 'Bold' : 'Italic'); }
    else if (a === 'more') openMenu(btn);
    else if (a === 'drag') { /* handled by pointer events */ }
    else { note('other', 'Clicked ' + btn.getAttribute('aria-label') + ' in the toolbar'); toast('That isn’t part of this prototype.'); }
  });

  // Arrow keys on a handle you can reach (B and C) move the block.
  function handleKeys(e, id, source) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    nudge(id, e.key === 'ArrowUp' ? -1 : 1, 'arrow keys on the ' + source + ' handle');
  }
  edgeHandle.addEventListener('keydown', (e) => {
    hovered = null;
    handleKeys(e, edgeHandle.dataset.id, 'block-edge');
    requestAnimationFrame(() => edgeHandle.focus());
  });
  edgeHandle.addEventListener('focus', () => { if (edgeHandle.dataset.id) { selected = edgeHandle.dataset.id; render(); } });
  toolbar.addEventListener('keydown', (e) => {
    if (e.target.closest('.drag-big')) {
      handleKeys(e, selected, 'toolbar');
    }
  });

  // Options menu, as in the editor. Move to is how some people move blocks today.
  const MENU = [['Copy'], ['Duplicate'], ['Add before'], ['Add after'], null, ['Move to'], null, ['Delete']];
  function openMenu(btn) {
    menu.innerHTML = '';
    MENU.forEach((item) => {
      if (!item) { menu.append($('hr')); return; }
      const b = $('button', { role: 'menuitem', text: item[0] });
      b.addEventListener('click', () => {
        note(item[0] === 'Move to' ? 'alt' : 'other', 'Options menu: ' + item[0]);
        closeMenu();
        toast('That isn’t part of this prototype.');
      });
      menu.append(b);
    });
    const r = btn.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    menu.style.top = (r.bottom - c.top + 4) + 'px';
    menu.style.left = (r.left - c.left) + 'px';
    menu.hidden = false;
    note('other', 'Opened the Options menu');
  }
  function closeMenu() { menu.hidden = true; }

  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  [inserterBtn, listViewBtn].forEach((b) => b.addEventListener('click', () => {
    note(b === listViewBtn ? 'alt' : 'other', 'Clicked ' + b.getAttribute('aria-label'));
    toast('That isn’t part of this prototype.');
  }));
  resetBtn.addEventListener('click', () => { resetState(); cardOpen = false; buildBlocks(); render(); renderCard(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (drag || press) { cancelDrag(); return; }
      closeMenu();
    }
    const inText = e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !inText) {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    }
  });

  window.addEventListener('resize', position);
  canvas.addEventListener('input', position);

  // ---------- Tasks and notes ----------

  function checkTasks() {
    TASKS.forEach((t, i) => {
      if (t.done(order) && !firstDone[i]) {
        firstDone[i] = { at: elapsed(), sec: seconds() };
        note('task', 'Task ' + (i + 1) + ' done');
      }
    });
  }

  function summary() {
    const moves = log.filter((l) => l.kind === 'move');
    const count = (re) => moves.filter((m) => re.test(m.text)).length;
    const firstDrag = moves.find((m) => /dragged from/.test(m.text));
    return {
      drags: count(/dragged from/),
      pictures: count(/dragged the block itself/),
      arrows: count(/Move (up|down) arrow/),
      keys: count(/arrow keys/),
      misses: log.filter((l) => l.kind === 'miss').length,
      elsewhere: log.filter((l) => l.kind === 'alt').length,
      firstDrag
    };
  }

  /*
   * The completion code, for pasting into the testing tool:
   *   Bh-1101-d3-p1-a5-k0-m2-o1-f45-t40.95.x.130-s180
   *   prototype · each task right (1) or not (0) when they clicked Finished ·
   *   moves by dragging a handle · by dragging a picture itself · by arrows ·
   *   by keyboard · drags on things that aren't handles · looks at Move to or
   *   List View · seconds to the first drag from a handle (x if none) ·
   *   seconds until each task was first right (x if never) · seconds until
   *   they clicked Finished.
   * The testing tool shows the tasks, so the page doesn't know when each one
   * starts; when each was first right is the next best thing.
   */
  function completionCode() {
    const m = summary();
    return [
      LETTER,
      TASKS.map((t) => (t.done(order) ? 1 : 0)).join(''),
      'd' + m.drags, 'p' + m.pictures, 'a' + m.arrows, 'k' + m.keys, 'm' + m.misses, 'o' + m.elsewhere,
      'f' + (m.firstDrag ? m.firstDrag.sec : 'x'),
      't' + firstDone.map((f) => (f ? f.sec : 'x')).join('.'),
      's' + seconds()
    ].join('-');
  }

  // Round 2: a Finished button that shows the code. Clicking it again later
  // gives a new code, in case someone carries on after all.
  let cardEl = null;
  let cardOpen = false;
  function renderCard() {
    if (!ROUND2) return;
    if (!cardEl) { cardEl = $('section', { class: 'task-card', 'aria-live': 'polite', 'aria-label': 'Finish' }); document.body.append(cardEl); }
    cardEl.classList.toggle('is-open', cardOpen);
    if (!cardOpen) {
      cardEl.innerHTML = '<button class="btn btn-primary">Finished</button>';
      cardEl.querySelector('button').addEventListener('click', () => {
        cardOpen = true;
        note('task', 'Clicked Finished. Code ' + completionCode());
        renderCard();
      });
      return;
    }
    const code = completionCode();
    cardEl.innerHTML = '<p class="task-count">Thank you</p><p class="task-text">Please copy this code into the next question:</p><textarea class="task-code" readonly rows="2" aria-label="Your code">' + code + '</textarea><button class="btn btn-primary">Copy code</button><button class="btn btn-link task-back">Keep editing</button>';
    const input = cardEl.querySelector('textarea');
    input.addEventListener('focus', () => input.select());
    cardEl.querySelector('.btn-primary').addEventListener('click', () => {
      input.select();
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('Code copied.'), () => { try { document.execCommand('copy'); toast('Code copied.'); } catch (e) { toast('Select the code and copy it.'); } });
    });
    cardEl.querySelector('.task-back').addEventListener('click', () => { cardOpen = false; note('task', 'Went back to editing'); renderCard(); });
  }

  let notesEl = null;
  function renderNotes() {
    if (!NOTES) return;
    if (!notesEl) { notesEl = $('aside', { class: 'notes', 'aria-label': 'Facilitator notes' }); document.body.append(notesEl); }
    const m = summary();
    const variant = {
      A: 'Today: the toolbar handle as Gutenberg draws it',
      B: 'A grip on the block’s edge',
      Bn: 'A grip on the block’s edge, and no move arrows',
      Bh: 'A grip on the block’s edge, labelled “Drag to move” while the pointer is over it',
      Bm: 'A grip on the block’s edge, with a four-arrow move icon',
      C: 'A bigger handle in the toolbar',
      Cm: 'A bigger handle in the toolbar, with a four-arrow move icon',
      Ac: 'Today, on the page with columns and a full-width cover',
      Bc: 'A grip on the block’s edge, on the page with columns and a full-width cover',
      Cc: 'A bigger handle in the toolbar, on the page with columns and a full-width cover'
    }[LETTER] + (ROUND2 ? ' (round 2: the long page)' : '');
    notesEl.innerHTML =
      '<h2>' + LETTER + ' · Facilitator notes</h2><p>' + variant + '. Only you can see this panel; open the page without <code>?notes</code> for participants.</p>' +
      '<h3>Tasks</h3><ol>' + TASKS.map((t, i) => '<li class="' + (t.done(order) ? 'is-done' : '') + '">' + t.text + (firstDone[i] ? ' <small>(' + firstDone[i].at + ')</small>' : '') + '</li>').join('') + '</ol>' +
      '<h3>Summary</h3><dl>' +
      '<dt>Moves by dragging a handle</dt><dd>' + m.drags + '</dd>' +
      (DIRECT_DRAG ? '<dt>Moves by dragging a picture itself</dt><dd>' + m.pictures + '</dd>' : '') +
      '<dt>Moves with the arrows</dt><dd>' + m.arrows + '</dd>' +
      '<dt>Moves with the keyboard</dt><dd>' + m.keys + '</dd>' +
      '<dt>Dragged on something that isn’t a handle</dt><dd>' + m.misses + '</dd>' +
      '<dt>Looked elsewhere (Move to, List View)</dt><dd>' + m.elsewhere + '</dd>' +
      '<dt>First drag from a handle</dt><dd>' + (m.firstDrag ? m.firstDrag.at : '–') + '</dd>' +
      '</dl>' +
      '<div class="actions"><button class="btn" data-copy>Copy log</button></div>' +
      '<h3>Log</h3><ul class="log">' + (log.length ? log.slice().reverse().map((l) => '<li class="is-' + l.kind + '"><time>' + l.at + '</time>' + l.text + '</li>').join('') : '<li>Nothing yet.</li>') + '</ul>';
    notesEl.querySelector('[data-copy]').addEventListener('click', () => {
      const text = 'Pollock ' + LETTER + '\n' + log.map((l) => l.at + '  ' + l.text).join('\n');
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast('Log copied.'), () => window.prompt('Copy the log:', text));
    });
  }

  // ---------- Start ----------

  resetState();
  buildBlocks();
  render();
  renderCard();
})();
