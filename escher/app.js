/*
 * Escher: two toolbars instead of one.
 *
 * Writing toolbar (inspired by Word): style, font and size, bold/italic, lists, alignment.
 * Font and size are never free-form. Every combination is a preset the theme offers, and
 * picking one swaps the block underneath (a block transformation), e.g. "Large" in the
 * headline font turns a paragraph into a level 2 heading.
 *
 * Design toolbar (inspired by PowerPoint): layouts with live preview, backgrounds, spacing,
 * moving things around, picture shapes and button styles.
 */
(() => {
'use strict';

/* ---------------------------------------------------------------- Data */

const IMG_DIR = '../albers/images/';
const PICTURES = [
  { file: 'throwing.jpg', alt: 'Hands shaping clay on a potter’s wheel' },
  { file: 'wheel-studio.jpg', alt: 'A potter’s wheel in the studio' },
  { file: 'bowls.jpg', alt: 'Glazed stoneware bowls' },
  { file: 'bowls-white.jpg', alt: 'Stacked white bowls' },
  { file: 'mugs-rack.jpg', alt: 'Mugs drying on a rack' },
  { file: 'shelves.jpg', alt: 'Shelves of finished pots' },
];

const FONTS = {
  display: { name: 'Bricolage Grotesque', note: 'Bold and friendly, for headlines', css: 'var(--f-display)' },
  body: { name: 'Instrument Sans', note: 'Clear and easy to read', css: 'var(--f-body)' },
  serif: { name: 'Newsreader', note: 'Elegant, for quotes and poems', css: 'var(--f-serif)' },
  mono: { name: 'JetBrains Mono', note: 'Typewriter, for code and details', css: 'var(--f-mono)' },
};
const FONT_ORDER = ['display', 'body', 'serif', 'mono'];
const SIZE_NAMES = { xl: 'Extra large', l: 'Large', m: 'Medium', s: 'Small' };

// The only text options there are. Each is a font + size pair, and each is really a block.
const PRESETS = [
  { id: 'title', name: 'Title', font: 'display', size: 'xl', px: 60, block: { name: 'core/heading', level: 1 } },
  { id: 'heading', name: 'Heading', font: 'display', size: 'l', px: 40, block: { name: 'core/heading', level: 2 } },
  { id: 'subheading', name: 'Subheading', font: 'display', size: 'm', px: 26, block: { name: 'core/heading', level: 3 } },
  { id: 'label', name: 'Label', font: 'display', size: 's', px: 15, block: { name: 'core/heading', level: 4 } },
  { id: 'intro', name: 'Introduction', font: 'body', size: 'l', px: 22, block: { name: 'core/paragraph', fontSize: 'large' } },
  { id: 'body', name: 'Normal', font: 'body', size: 'm', px: 17, block: { name: 'core/paragraph' } },
  { id: 'small', name: 'Small print', font: 'body', size: 's', px: 14, block: { name: 'core/paragraph', fontSize: 'small' } },
  { id: 'pullquote', name: 'Big quote', font: 'serif', size: 'l', px: 36, block: { name: 'core/pullquote' } },
  { id: 'quote', name: 'Quote', font: 'serif', size: 'm', px: 22, block: { name: 'core/quote' } },
  { id: 'verse', name: 'Poem', font: 'serif', size: 's', px: 18, block: { name: 'core/verse' } },
  { id: 'typewriter', name: 'Typewriter', font: 'mono', size: 'm', px: 17, block: { name: 'core/preformatted' } },
  { id: 'code', name: 'Code', font: 'mono', size: 's', px: 14, block: { name: 'core/code' } },
];
const PRESET = Object.fromEntries(PRESETS.map((p) => [p.id, p]));
const LIST_LOOK = { font: 'body', size: 'm', px: 17 };

const LAYOUTS = [
  { id: 'text-media', name: 'Text and picture', ok: (s) => count(s, isMedia) >= 1 && count(s, isText) >= 1 },
  { id: 'media-text', name: 'Picture and text', ok: (s) => count(s, isMedia) >= 1 && count(s, isText) >= 1 },
  { id: 'overlay', name: 'Text over picture', ok: (s) => count(s, isMedia) >= 1 && count(s, isText) >= 1 },
  { id: 'stacked', name: 'Stacked', ok: () => true },
  { id: 'centred', name: 'Centred', ok: () => true },
  { id: 'split', name: 'Heading beside text', ok: (s) => leadingHeadings(s).length > 0 && s.blocks.length > leadingHeadings(s).length },
  { id: 'media-row', name: 'Pictures in a row', ok: (s) => count(s, isMedia) >= 2 },
];
const BACKGROUNDS = [
  { id: 'paper', name: 'Paper' }, { id: 'sand', name: 'Sand' }, { id: 'sage', name: 'Sage' }, { id: 'sky', name: 'Sky' },
  { id: 'clay', name: 'Clay' }, { id: 'forest', name: 'Forest' }, { id: 'ink', name: 'Ink' },
];
const SPACINGS = [
  { id: 'compact', name: 'Compact', note: 'Less room above and below' },
  { id: 'comfortable', name: 'Comfortable', note: 'The usual amount of room' },
  { id: 'spacious', name: 'Spacious', note: 'Lots of room to breathe' },
];
const SHAPES = [
  { id: 'landscape', name: 'Landscape', w: 24, h: 18 },
  { id: 'wide', name: 'Wide', w: 28, h: 16 },
  { id: 'square', name: 'Square', w: 20, h: 20 },
  { id: 'portrait', name: 'Portrait', w: 16, h: 21 },
  { id: 'circle', name: 'Circle', w: 20, h: 20, r: '50%' },
  { id: 'arch', name: 'Arch', w: 16, h: 21, r: '99px 99px 2px 2px' },
];
const COLOURS = [
  { id: 'ink', name: 'Ink', hex: '#1A1A1A' },
  { id: 'charcoal', name: 'Charcoal', hex: '#4A4A4A' },
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  { id: 'cream', name: 'Cream', hex: '#F4E9D8' },
  { id: 'forest', name: 'Forest', hex: '#2F5D50' },
  { id: 'clay', name: 'Clay', hex: '#B5532F' },
  { id: 'sky', name: 'Sky', hex: '#2C4A7A' },
  { id: 'plum', name: 'Plum', hex: '#6B3B5E' },
  { id: 'mustard', name: 'Mustard', hex: '#C9962B' },
];
const COLOUR = Object.fromEntries(COLOURS.map((c) => [c.id, c]));
function colourHex(v) { return !v || v === 'auto' ? null : (COLOUR[v] ? COLOUR[v].hex : v); }
function colourName(v) { return !v || v === 'auto' ? 'Automatic' : (COLOUR[v] ? COLOUR[v].name : v.toUpperCase()); }
function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.4 ? '#1A1A1A' : '#FFFFFF';
}
// A section background is either one of the theme's schemes (a class) or a colour of the user's own.
const BG = Object.fromEntries([
  ['paper', '#F4F2EE'], ['sand', '#EADFCF'], ['sage', '#DDE7E1'], ['sky', '#DCE6EF'], ['clay', '#E9D0C1'], ['forest', '#2F5D50'], ['ink', '#1D1F1E'],
]);
function isCustomBg(bg) { return typeof bg === 'string' && bg.startsWith('#'); }
function bgClass(bg) { return isCustomBg(bg) ? 'bg-custom' : `bg-${bg}`; }
function bgVars(bg) {
  if (!isCustomBg(bg)) return '';
  const ink = inkOn(bg);
  const dark = ink === '#FFFFFF';
  return `--ground:${bg};--ink:${ink};--soft:color-mix(in srgb, ${ink} 72%, ${bg});--accent:${dark ? '#F2D3A8' : '#2F5D50'};--on-accent:${dark ? '#1D1F1E' : '#FFFFFF'};`;
}
function bgName(bg) { return isCustomBg(bg) ? bg.toUpperCase() : (BACKGROUNDS.find((x) => x.id === bg) || { name: bg }).name; }
function bgHex(bg) { return isCustomBg(bg) ? bg : BG[bg]; }
// Colour groups: changing one item's colour asks whether to change all of its kind.
const GROUPS = {
  heading: { one: 'heading', all: 'Every heading', presets: ['title', 'heading', 'subheading', 'label'] },
  text: { one: 'piece of text', all: 'All body text', presets: ['intro', 'body', 'small'] },
  quote: { one: 'quote', all: 'Every quote', presets: ['pullquote', 'quote', 'verse'] },
  code: { one: 'code block', all: 'All code', presets: ['typewriter', 'code'] },
  button: { one: 'button', all: 'Every button', presets: [] },
  section: { one: 'section', all: 'Every section', presets: [] },
};
function groupOf(b) {
  if (b.name === 'core/buttons') return 'button';
  if (b.name === 'core/list') return 'text';
  const p = presetOf(b);
  return p ? Object.keys(GROUPS).find((g) => GROUPS[g].presets.includes(p.id)) : null;
}
const BUTTON_SIZES = [
  { id: 's', name: 'Small' }, { id: 'm', name: 'Medium' }, { id: 'l', name: 'Large' },
];
const BUTTON_CORNERS = [
  { id: 'pill', name: 'Round', r: '999px' }, { id: 'rounded', name: 'Soft', r: '6px' }, { id: 'square', name: 'Square', r: '0' },
];
const BUTTON_STYLES = [
  { id: 'solid', name: 'Filled' }, { id: 'outline', name: 'Outline' }, { id: 'link', name: 'Underlined link' },
];
const INSERTS = [
  { id: 'heading', name: 'Heading', make: () => text('heading', 'New heading') },
  { id: 'body', name: 'Text', make: () => text('body', '') },
  { id: 'ul', name: 'Bulleted list', make: () => list(['First thing', 'Second thing'], false) },
  { id: 'quote', name: 'Quote', make: () => text('quote', 'Something worth repeating.') },
  { id: 'image', name: 'Picture', make: () => image('bowls-white.jpg', 'landscape') },
  { id: 'button', name: 'Button', make: () => button('Find out more', 'solid') },
];

let idSeq = 0;
const uid = (p) => `${p}${(++idSeq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function text(presetId, html, attrs = {}) {
  const p = PRESET[presetId];
  const a = { ...attrs };
  if (p.block.level) a.level = p.block.level;
  if (p.block.fontSize) a.fontSize = p.block.fontSize;
  return { id: uid('b'), name: p.block.name, attrs: a, html };
}
function list(items, ordered) { return { id: uid('b'), name: 'core/list', attrs: { ordered }, items }; }
function image(file, shape) { return { id: uid('b'), name: 'core/image', attrs: { file, shape } }; }
function button(label, variant, url = '#') { return { id: uid('b'), name: 'core/buttons', attrs: { variant, url }, html: label }; }
function section(name, layout, bg, blocks, spacing = 'comfortable') { return { id: uid('s'), name, layout, bg, spacing, blocks }; }

function startingPage() {
  return [
    section('Hero', 'text-media', 'paper', [
      text('label', 'Handmade in small batches'),
      text('title', 'Stoneware for everyday tables'),
      text('intro', 'Bowls, mugs and plates thrown on the wheel and glazed by hand in our studio.'),
      button('Shop the collection', 'solid'),
      image('throwing.jpg', 'portrait'),
    ]),
    section('Our story', 'split', 'sand', [
      text('heading', 'A small studio with a big kiln'),
      text('body', 'We started with one wheel in a garden shed. Now there are six of us, sharing a converted dairy at the edge of town and firing every Friday.'),
      text('body', 'Every piece is made from local clay and finished in glazes we mix ourselves, so no two batches are quite the same.'),
      text('small', 'Seconds are sold at the studio door on the first Saturday of each month.'),
    ]),
    section('Quote', 'centred', 'forest', [
      text('pullquote', 'Every piece is a little different, and that’s the point.'),
      text('small', '[Name], founder'),
    ]),
    section('Classes', 'media-text', 'sage', [
      text('heading', 'Learn to throw'),
      text('body', 'Small classes for complete beginners and people who’ve been away from the wheel for a while.'),
      list(['Six-week beginner course', 'Saturday taster sessions', 'Open studio for members'], false),
      button('See class dates', 'outline'),
      image('wheel-studio.jpg', 'landscape'),
    ]),
    section('Gallery', 'media-row', 'paper', [
      text('heading', 'From the kiln'),
      text('body', 'A few things from this week’s firing.'),
      image('bowls.jpg', 'square'),
      image('mugs-rack.jpg', 'square'),
      image('shelves.jpg', 'square'),
    ]),
    section('Visit', 'centred', 'clay', [
      text('heading', 'Visit the studio'),
      text('body', '[Address line], [Town], [Postcode]'),
      text('small', 'Open Thursday to Sunday, 10am to 5pm'),
      button('Get directions', 'link'),
    ], 'compact'),
  ];
}

const state = { sections: startingPage(), site: { colours: {} } };
let sel = null; // { type: 'section', id } or { type: 'block', id, mode: 'write' | 'design' }

/* ---------------------------------------------------------------- Model helpers */

function isMedia(b) { return b.name === 'core/image'; }
function isText(b) { return !isMedia(b); }
function isWritable(b) { return b.name !== 'core/image'; }
function isProse(b) { return !['core/image', 'core/buttons', 'core/list'].includes(b.name); }
function count(s, fn) { return s.blocks.filter(fn).length; }
function leadingHeadings(s) {
  const out = [];
  for (const b of s.blocks) { if (b.name === 'core/heading') out.push(b); else if (!isMedia(b)) break; }
  return out;
}
function findSection(id) { return state.sections.find((s) => s.id === id); }
function findBlock(id) {
  for (const s of state.sections) {
    const i = s.blocks.findIndex((b) => b.id === id);
    if (i > -1) return { sec: s, b: s.blocks[i], i };
  }
  return null;
}
function presetOf(b) {
  return PRESETS.find((p) => p.block.name === b.name
    && (p.block.level || null) === (b.attrs.level || null)
    && (p.block.fontSize || null) === (b.attrs.fontSize || null)) || null;
}
function lookOf(b) {
  const base = b.name === 'core/list' ? LIST_LOOK : presetOf(b);
  if (!base) return null;
  return b.attrs.customSize ? { ...base, px: b.attrs.customSize, custom: true } : base;
}
// Pictures normally sit in the picture column and everything else in the text column, but a
// picture dropped between pieces of text stays there (attrs.col), and the reverse.
function colOf(b) { return b.attrs.col || (isMedia(b) ? 'media' : 'text'); }
const TWO_COL = ['text-media', 'media-text', 'overlay', 'media-row'];
function layoutOf(s) {
  const l = LAYOUTS.find((x) => x.id === s.layout);
  if (!l || !l.ok(s)) return 'stacked';
  // With nothing left in one of the columns, a two-column layout is just one column.
  if (TWO_COL.includes(l.id) && !(s.blocks.some((b) => colOf(b) === 'media') && s.blocks.some((b) => colOf(b) === 'text'))) return 'stacked';
  return l.id;
}
function describe(b) {
  const a = b.attrs;
  let s = b.name;
  if (b.name === 'core/heading') s += ` · level ${a.level}`;
  if (a.customSize) s += ` · style.typography.fontSize: ${a.customSize}px`;
  else if (a.fontSize) s += ` · fontSize: ${a.fontSize}`;
  if (b.name === 'core/list' && a.ordered) s += ' · ordered';
  if (b.name === 'core/image') s += ` · ${a.shape}`;
  if (b.name === 'core/buttons') {
    s += ` · is-style-${a.variant}`;
    if (a.size && a.size !== 'm') s += ` · size: ${a.size}`;
    if (a.corners && a.corners !== 'pill') s += ` · radius: ${a.corners}`;
    if (a.wide) s += ' · width: 100%';
    else if (a.width) s += ` · width: ${Math.round(a.width)}%`;
  }
  if (a.col) s += ` · in the ${a.col === 'text' ? 'text' : 'picture'} column`;
  if (a.width && b.name !== 'core/buttons') s += ` · width: ${Math.round(a.width)}%`;
  if (a.colour && a.colour !== 'auto') s += COLOUR[a.colour] ? ` · ${b.name === 'core/buttons' && a.variant === 'solid' ? 'backgroundColor' : 'textColor'}: ${a.colour}` : ` · style.color: ${a.colour}`;
  return s;
}
function describePreset(p) {
  let s = p.block.name;
  if (p.block.level) s += ` · level ${p.block.level}`;
  if (p.block.fontSize) s += ` · fontSize: ${p.block.fontSize}`;
  return s;
}
function splitLines(html) {
  return html.split(/<br\s*\/?>|<\/div>\s*<div>|<\/p>\s*<p>|\n/i)
    .map((x) => x.replace(/<\/?(div|p)>/gi, '').trim())
    .filter((x) => x.replace(/<[^>]+>/g, '').trim() !== '');
}
function contentHtml(b) {
  return b.name === 'core/list' ? b.items.join('<br>') : (b.html || '');
}
function applyPreset(b, p) {
  const html = contentHtml(b);
  b.name = p.block.name;
  b.attrs = b.attrs.align ? { align: b.attrs.align } : {};
  if (p.block.level) b.attrs.level = p.block.level;
  if (p.block.fontSize) b.attrs.fontSize = p.block.fontSize;
  b.html = (p.id === 'verse' || p.id === 'typewriter' || p.id === 'code') ? html : html.replace(/\n/g, '<br>');
  delete b.items;
}
function toggleList(b, ordered) {
  if (b.name === 'core/list') {
    if (!!b.attrs.ordered === ordered) { applyPreset(b, PRESET.body); return; }
    b.attrs.ordered = ordered;
    return;
  }
  const items = splitLines(contentHtml(b));
  b.name = 'core/list';
  b.attrs = { ordered, ...(b.attrs.align ? { align: b.attrs.align } : {}) };
  b.items = items.length ? items : [''];
  delete b.html;
}
function cloneDeep(x) { return JSON.parse(JSON.stringify(x)); }
function withNewIds(b) { const c = cloneDeep(b); c.id = uid('b'); return c; }

/* ---------------------------------------------------------------- History */

const history = [];
const future = [];
let textBefore = null;
let textDirty = false;
const snapshot = () => JSON.stringify({ sections: state.sections, site: state.site });
function restore(json) { const o = JSON.parse(json); state.sections = o.sections; state.site = o.site; }

function flushText() {
  if (textDirty && textBefore) { history.push(textBefore); future.length = 0; }
  textDirty = false;
  textBefore = snapshot();
  updateUndo();
}

function change(fn, opts = {}) {
  const caret = sel && sel.type === 'block' && sel.mode === 'write' ? captureCaret() : null;
  flushText();
  const before = snapshot();
  fn();
  if (!opts.keepAsk) hideAsk();
  history.push(before);
  future.length = 0;
  closePop();
  render();
  if (caret && opts.keepCaret !== false && sel && sel.type === 'block' && findBlock(sel.id)) restoreCaret(sel.id, caret);
  renderToolbar();
  updateUndo();
  if (opts.toast) toast(opts.toast);
}

function undo() {
  flushText();
  if (!history.length) return;
  future.push(snapshot());
  restore(history.pop());
  afterTimeTravel();
}
function redo() {
  flushText();
  if (!future.length) return;
  history.push(snapshot());
  restore(future.pop());
  afterTimeTravel();
}
function afterTimeTravel() {
  blurEditing();
  if (sel && sel.type === 'block' && !findBlock(sel.id)) sel = null;
  if (sel && sel.type === 'section' && !findSection(sel.id)) sel = null;
  if (sel && sel.type === 'block') sel.mode = 'design';
  closePop();
  render();
  renderToolbar();
  textBefore = snapshot();
  updateUndo();
}
function updateUndo() {
  $('#undo').disabled = !history.length && !textDirty;
  $('#redo').disabled = !future.length;
}

/* ---------------------------------------------------------------- DOM helpers */

const $ = (q, el = document) => el.querySelector(q);
const page = $('#page');
const tb = $('#tb');
const pop = $('#pop');
const handle = $('#handle');
const dropLine = $('#drop-line');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function h(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

const ICONS = {
  chev: '<path d="M7 10l5 5 5-5"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  grip: '<g fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></g>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  ul: '<path d="M9 6h11M9 12h11M9 18h11"/><g fill="currentColor" stroke="none"><circle cx="4.5" cy="6" r="1.4"/><circle cx="4.5" cy="12" r="1.4"/><circle cx="4.5" cy="18" r="1.4"/></g>',
  ol: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 4.5h1.5V9M3.5 14.2c.3-.6 1-.9 1.6-.7.8.2 1 1.1.4 1.7L3.5 17h2.6" stroke-width="1.3"/>',
  left: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
  center: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
  right: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  design: '<rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/>',
  spacing: '<path d="M4 4h16M4 20h16M12 8v8M9 10.5l3-2.5 3 2.5M9 13.5l3 2.5 3-2.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
  shape: '<rect x="3.5" y="3.5" width="10" height="10" rx="2"/><circle cx="15" cy="15" r="5.5"/>',
  parent: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  swap: '<path d="M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4"/>',
  resize: '<path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6"/>',
  corner: '<path d="M5 19V11a6 6 0 0 1 6-6h8"/>',
  wide: '<path d="M3 7v10M21 7v10M7 12h10M9.5 9.5L7 12l2.5 2.5M14.5 9.5L17 12l-2.5 2.5"/>',
  heading: '<path d="M6 5v14M18 5v14M6 12h12"/>',
  textico: '<path d="M5 7h14M5 12h14M5 17h9"/>',
  quote: '<path d="M7 11H4V7h4v4l-2 6M17 11h-3V7h4v4l-2 6"/>',
  button: '<rect x="3" y="7" width="18" height="10" rx="5"/><path d="M8 12h8"/>',
};
const ic = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------------------------------------------------------------- Render page */

function render() {
  page.replaceChildren(...state.sections.map(sectionEl));
  applySel();
  positionToolbar();
}

function sectionEl(s) {
  const lay = layoutOf(s);
  const el = h('section', `sec ${bgClass(s.bg)} sp-${s.spacing} lay-${lay}`);
  if (isCustomBg(s.bg)) el.style.cssText = bgVars(s.bg);
  el.dataset.id = s.id;
  el.setAttribute('aria-label', s.name);
  const tab = h('div', 'sec-tab');
  tab.textContent = s.name;
  const inner = h('div', 'sec-inner');
  const col = (cls, blocks) => { const c = h('div', `col ${cls}`); c.append(...blocks.map(blockEl)); return c; };

  if (!s.blocks.length) {
    const note = h('div', 'empty-note');
    note.textContent = 'This section is empty. Use Insert in the design toolbar to add something.';
    inner.append(note);
  } else if (lay === 'stacked' || lay === 'centred') {
    inner.append(col('col-all', s.blocks));
  } else if (lay === 'split') {
    const lead = leadingHeadings(s);
    inner.append(col('col-head', lead), col('col-rest', s.blocks.filter((b) => !lead.includes(b))));
  } else {
    inner.append(col('col-text', s.blocks.filter((b) => colOf(b) === 'text')), col('col-media', s.blocks.filter((b) => colOf(b) === 'media')));
  }
  el.append(tab, inner);
  return el;
}

function blockEl(b) {
  let el; let edit = null;
  const a = b.attrs;
  switch (b.name) {
    case 'core/heading': el = h(`h${a.level}`); edit = el; break;
    case 'core/paragraph': el = h('p'); edit = el; break;
    case 'core/quote': el = h('blockquote'); edit = h('p'); el.append(edit); break;
    case 'core/pullquote': { el = h('figure'); const bq = h('blockquote'); edit = h('p'); bq.append(edit); el.append(bq); break; }
    case 'core/verse': el = h('pre'); edit = el; break;
    case 'core/preformatted': el = h('pre'); edit = el; break;
    case 'core/code': el = h('pre'); edit = h('code'); el.append(edit); break;
    case 'core/list': el = h(a.ordered ? 'ol' : 'ul'); edit = el; break;
    case 'core/image': {
      el = h('figure');
      const img = h('img');
      img.src = IMG_DIR + a.file;
      img.alt = (PICTURES.find((p) => p.file === a.file) || {}).alt || '';
      img.draggable = false;
      el.append(img);
      break;
    }
    case 'core/buttons': {
      el = h('div');
      const link = h('a', `btn btn-${a.variant} btn-${a.size || 'm'} btn-${a.corners || 'pill'}${a.wide ? ' btn-wide' : ''}`);
      const bc = colourHex(a.colour && a.colour !== 'auto' ? a.colour : state.site.colours.button);
      if (bc) { link.style.setProperty('--btn', bc); link.style.setProperty('--btn-ink', inkOn(bc)); }
      link.href = a.url || '#';
      link.innerHTML = b.html;
      link.dataset.edit = 'button';
      link.dataset.ph = 'Button text';
      el.append(link);
      break;
    }
    default: el = h('div');
  }
  el.classList.add('b');
  const kind = b.name === 'core/image' ? 'image' : b.name === 'core/buttons' ? 'button' : 'text';
  el.classList.add(`k-${kind}`);
  const p = presetOf(b);
  if (p) el.classList.add(`p-${p.id}`);
  if (b.name === 'core/list') el.classList.add('p-list');
  if (b.name === 'core/image') el.classList.add(`shape-${a.shape}`);
  if (a.align) el.style.textAlign = a.align;
  if (a.customSize) el.style.fontSize = `${a.customSize}px`;
  if (a.width) {
    if (b.name === 'core/buttons') el.querySelector('.btn').style.width = `${a.width}%`;
    else el.style.width = `${a.width}%`;
  }
  const g = groupOf(b);
  const colour = colourHex(a.colour && a.colour !== 'auto' ? a.colour : g && state.site.colours[g]);
  if (colour && b.name !== 'core/buttons') el.style.color = colour;
  el.dataset.id = b.id;
  el.dataset.block = describe(b);

  if (edit && kind === 'text') {
    edit.dataset.edit = 'text';
    edit.contentEditable = 'true';
    edit.dataset.ph = p && p.block.name === 'core/heading' ? 'Heading' : 'Type something…';
    if (b.name === 'core/list') edit.innerHTML = b.items.map((i) => `<li>${i}</li>`).join('');
    else edit.innerHTML = b.html;
  }
  return el;
}

function blockNode(id) { return page.querySelector(`.b[data-id="${id}"]`); }
function sectionNode(id) { return page.querySelector(`.sec[data-id="${id}"]`); }
function editNode(id) { const el = blockNode(id); return el && (el.matches('[data-edit]') ? el : el.querySelector('[data-edit]')); }

/* ---------------------------------------------------------------- Selection */

function setSel(next) {
  const same = JSON.stringify(sel) === JSON.stringify(next);
  sel = next;
  applySel();
  if (!same) { closePop(); renderToolbar(); }
}

function applySel() {
  page.querySelectorAll('.rz').forEach((n) => n.remove());
  page.querySelectorAll('.sel-write, .sel-design, .sec.sel').forEach((el) => el.classList.remove('sel-write', 'sel-design', 'sel'));
  if (sel && sel.type === 'block') {
    const el = blockNode(sel.id);
    if (el) el.classList.add(sel.mode === 'write' ? 'sel-write' : 'sel-design');
    if (el && sel.mode === 'design') addResizeHandles(el);
  } else if (sel && sel.type === 'section') {
    const el = sectionNode(sel.id);
    if (el) el.classList.add('sel');
  }
  updateBar();
}

function updateBar() {
  const hint = $('#eb-hint');
  const mode = $('#eb-mode');
  mode.hidden = !sel;
  if (!sel) {
    hint.textContent = 'Click any text to start writing. Click a picture, or the space around things, to design.';
    return;
  }
  const writing = sel.type === 'block' && sel.mode === 'write';
  mode.className = `eb-mode ${writing ? 'write' : 'design'}`;
  mode.textContent = writing ? 'Writing' : 'Designing';
  if (writing) hint.textContent = 'Pick a size from your theme, or type your own. Press Esc to design this instead.';
  else if (sel.type === 'block') hint.textContent = 'Drag the handle to move it, or use the arrows. Press Esc to select the whole section.';
  else hint.textContent = 'Hover a layout to preview it on the page. Press Esc to deselect.';
}

function blurEditing() {
  const a = document.activeElement;
  if (a && a.closest && a.closest('#page')) a.blur();
}

function startWriting(id, where = 'end') {
  const { b } = findBlock(id) || {};
  if (!b || !isWritable(b)) return;
  const ed = editNode(id);
  if (!ed) return;
  if (b.name === 'core/buttons') ed.contentEditable = 'true';
  ed.focus();
  if (where === 'all') document.getSelection().selectAllChildren(ed);
  else setCaretOffset(ed, where === 'start' ? 0 : Infinity);
  setSel({ type: 'block', id, mode: 'write' });
}

function startDesigning(id) {
  blurEditing();
  setSel({ type: 'block', id, mode: 'design' });
}

page.addEventListener('focusin', (e) => {
  const ed = e.target.closest('[data-edit]');
  if (!ed) return;
  const bel = ed.closest('.b');
  textBefore = snapshot();
  textDirty = false;
  if (!(sel && sel.type === 'block' && sel.id === bel.dataset.id && sel.mode === 'write')) {
    setSel({ type: 'block', id: bel.dataset.id, mode: 'write' });
  }
});

page.addEventListener('focusout', (e) => {
  const ed = e.target.closest('[data-edit]');
  if (!ed) return;
  if (ed.dataset.edit === 'button') ed.contentEditable = 'false';
  flushText();
  // Focus moved somewhere outside the page (not the toolbar, which never takes focus while writing).
  setTimeout(() => {
    const a = document.activeElement;
    const stillHere = a && (a.closest('#page [data-edit]') || a.closest('#tb') || a.closest('#pop'));
    if (!stillHere && sel && sel.type === 'block' && sel.mode === 'write') {
      sel.mode = 'design';
      applySel();
      renderToolbar();
    }
  }, 0);
});

page.addEventListener('input', (e) => {
  const ed = e.target.closest('[data-edit]');
  if (!ed) return;
  syncFromDom(ed.closest('.b').dataset.id);
  textDirty = true;
  updateUndo();
  positionToolbar();
});

function syncFromDom(id) {
  const f = findBlock(id);
  const ed = editNode(id);
  if (!f || !ed) return;
  if (f.b.name === 'core/list') {
    const lis = [...ed.querySelectorAll('li')];
    f.b.items = lis.length ? lis.map((li) => li.innerHTML) : [ed.innerHTML];
  } else {
    f.b.html = ed.innerHTML === '<br>' ? '' : ed.innerHTML;
  }
}

page.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const ed = e.target.closest('[data-edit]');
  if (ed && ed.isContentEditable) return; // let the caret land
  const bel = e.target.closest('.b');
  const sec = e.target.closest('.sec');
  if (bel) {
    e.preventDefault();
    startDesigning(bel.dataset.id);
  } else if (sec) {
    e.preventDefault();
    blurEditing();
    setSel({ type: 'section', id: sec.dataset.id });
  }
});

page.addEventListener('dblclick', (e) => {
  const bel = e.target.closest('.b.k-button');
  if (bel) startWriting(bel.dataset.id, 'all');
});

page.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); });

page.addEventListener('paste', (e) => {
  if (!e.target.closest('[data-edit]')) return;
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, t);
});

/* ---------------------------------------------------------------- Caret helpers */

function getCaretOffset(ed) {
  const s = document.getSelection();
  if (!s.rangeCount || !ed.contains(s.anchorNode)) return null;
  const r = s.getRangeAt(0);
  const pre = r.cloneRange();
  pre.selectNodeContents(ed);
  pre.setEnd(r.endContainer, r.endOffset);
  return pre.toString().length;
}
function setCaretOffset(ed, n) {
  const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
  let node; let left = n; let last = null;
  while ((node = walker.nextNode())) {
    last = node;
    if (left <= node.length) {
      const r = document.createRange();
      r.setStart(node, left); r.collapse(true);
      const s = document.getSelection(); s.removeAllRanges(); s.addRange(r);
      return;
    }
    left -= node.length;
  }
  const r = document.createRange();
  if (last) r.setStart(last, last.length); else r.selectNodeContents(ed);
  r.collapse(!last);
  if (last) r.collapse(true);
  const s = document.getSelection(); s.removeAllRanges(); s.addRange(r);
}
let popCaret = null; // where the caret was before a popover's input took focus
function captureCaret() {
  const ed = sel && editNode(sel.id);
  if (!ed) return null;
  const offset = getCaretOffset(ed);
  return { offset: offset == null && popCaret != null ? popCaret : offset };
}
function restoreCaret(id, caret) {
  const ed = editNode(id);
  if (!ed) return;
  ed.focus();
  setCaretOffset(ed, caret.offset == null ? Infinity : caret.offset);
}
function caretAtStart(ed) {
  const s = document.getSelection();
  return s.isCollapsed && getCaretOffset(ed) === 0;
}

/* ---------------------------------------------------------------- Writing actions */

function currentBlock() { return sel && sel.type === 'block' ? findBlock(sel.id) : null; }

function setPreset(presetId) {
  const f = currentBlock();
  if (!f) return;
  change(() => applyPreset(f.b, PRESET[presetId]));
}
function setFont(font) {
  const f = currentBlock();
  if (!f) return;
  const look = lookOf(f.b) || LIST_LOOK;
  const options = PRESETS.filter((p) => p.font === font);
  const same = options.find((p) => p.size === look.size);
  const pick = same || options.reduce((best, p) => (Math.abs(p.px - look.px) < Math.abs(best.px - look.px) ? p : best));
  // A size someone typed themselves stays put when the font changes, as in Word.
  const keep = look.custom ? look.px : null;
  change(() => { applyPreset(f.b, pick); if (keep && keep !== pick.px) f.b.attrs.customSize = keep; });
}
const MIN_SIZE = 8;
const MAX_SIZE = 160;
function setCustomSize(px) {
  const f = currentBlock();
  if (!f || !Number.isFinite(px)) return;
  const n = Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, px)) * 2) / 2;
  const base = f.b.name === 'core/list' ? LIST_LOOK : presetOf(f.b);
  // Typing a size the theme already has for this font picks that preset instead.
  const same = PRESETS.find((p) => p.font === base.font && p.px === n);
  if (same && f.b.name !== 'core/list') { setPreset(same.id); return; }
  change(() => { if (n === base.px) delete f.b.attrs.customSize; else f.b.attrs.customSize = n; });
}
function stepSize(dir) {
  const f = currentBlock();
  if (!f) return;
  const look = lookOf(f.b);
  if (!look) return;
  const sizes = PRESETS.filter((p) => p.font === look.font).sort((x, y) => x.px - y.px);
  const next = dir > 0 ? sizes.find((p) => p.px > look.px) : [...sizes].reverse().find((p) => p.px < look.px);
  if (next) setPreset(next.id);
}
function canStep(b, dir) {
  const look = lookOf(b);
  if (!look) return false;
  const sizes = PRESETS.filter((p) => p.font === look.font).map((p) => p.px);
  return dir > 0 ? sizes.some((px) => px > look.px) : sizes.some((px) => px < look.px);
}
function setList(ordered) {
  const f = currentBlock();
  if (!f) return;
  change(() => toggleList(f.b, ordered));
}
function setAlign(v) {
  const f = currentBlock();
  if (!f) return;
  change(() => { if (v === 'left') delete f.b.attrs.align; else f.b.attrs.align = v; });
}
function inline(cmd) {
  document.execCommand('styleWithCSS', false, false);
  document.execCommand(cmd);
  if (sel) syncFromDom(sel.id);
  textDirty = true;
  updateUndo();
  refreshInlineState();
}
function refreshInlineState() {
  if (!sel || sel.mode !== 'write') return;
  for (const cmd of ['bold', 'italic', 'underline', 'strikeThrough']) {
    const btn = tb.querySelector(`[data-act="inline"][data-v="${cmd}"]`);
    if (btn) {
      let on = false;
      try { on = document.queryCommandState(cmd); } catch (err) { /* ignore */ }
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', on);
    }
  }
}
document.addEventListener('selectionchange', () => { if (sel && sel.mode === 'write') refreshInlineState(); });

/* Enter makes a new paragraph, Backspace at the start joins, like a word processor. */
page.addEventListener('keydown', (e) => {
  const ed = e.target.closest('[data-edit]');
  if (!ed) return;
  const id = ed.closest('.b').dataset.id;
  const f = findBlock(id);
  if (!f) return;
  const mod = e.metaKey || e.ctrlKey;

  if (mod && e.shiftKey && (e.key === '>' || e.key === '.')) { e.preventDefault(); stepSize(1); return; }
  if (mod && e.shiftKey && (e.key === '<' || e.key === ',')) { e.preventDefault(); stepSize(-1); return; }
  if (mod && e.altKey && /^Digit[1-4]$/.test(e.code) && f.b.name !== 'core/buttons') {
    e.preventDefault(); setPreset(['title', 'heading', 'subheading', 'label'][Number(e.code.slice(-1)) - 1]); return;
  }
  if (mod && e.altKey && e.code === 'Digit0' && f.b.name !== 'core/buttons') { e.preventDefault(); setPreset('body'); return; }

  if (e.key === 'Enter' && !e.shiftKey) {
    if (f.b.name === 'core/buttons') { e.preventDefault(); ed.blur(); startDesigning(id); return; }
    if (f.b.name === 'core/list') return; // new list item, as normal
    const p = presetOf(f.b);
    if (p && ['verse', 'typewriter', 'code'].includes(p.id)) { e.preventDefault(); document.execCommand('insertLineBreak'); return; }
    e.preventDefault();
    splitBlock(f, ed);
    return;
  }
  if (e.key === 'Backspace' && f.b.name !== 'core/buttons' && caretAtStart(ed)) {
    const empty = ed.textContent.trim() === '' && !ed.querySelector('img');
    const prev = f.sec.blocks[f.i - 1];
    if (prev && isProse(prev) && f.b.name !== 'core/list') {
      e.preventDefault();
      const offset = (blockNode(prev.id) && editNode(prev.id).textContent.length) || 0;
      change(() => {
        if (!empty) prev.html = (prev.html || '') + (f.b.html || '');
        f.sec.blocks.splice(f.i, 1);
        sel = { type: 'block', id: prev.id, mode: 'write' };
      }, { keepCaret: false });
      startWriting(prev.id);
      setCaretOffset(editNode(prev.id), offset);
    } else if (empty && f.b.name !== 'core/list') {
      e.preventDefault();
      change(() => { f.sec.blocks.splice(f.i, 1); sel = { type: 'section', id: f.sec.id }; }, { keepCaret: false });
    }
  }
});

function splitBlock(f, ed) {
  const s = document.getSelection();
  if (!s.rangeCount) return;
  const r = s.getRangeAt(0);
  r.deleteContents();
  const tail = r.cloneRange();
  tail.setEnd(ed, ed.childNodes.length);
  const holder = h('div');
  holder.append(tail.extractContents());
  syncFromDom(f.b.id);
  let rest = holder.innerHTML;
  if (holder.textContent.trim() === '' && !holder.querySelector('img')) rest = '';
  const p = presetOf(f.b);
  const keep = p && ['intro', 'body', 'small'].includes(p.id) ? p.id : 'body';
  const carry = {};
  if (f.b.attrs.align) carry.align = f.b.attrs.align;
  if (f.b.attrs.customSize && keep === p.id) carry.customSize = f.b.attrs.customSize;
  const next = text(keep, rest, carry);
  change(() => {
    f.sec.blocks.splice(f.i + 1, 0, next);
    sel = { type: 'block', id: next.id, mode: 'write' };
  }, { keepCaret: false });
  startWriting(next.id, 'start');
}

/* ---------------------------------------------------------------- Design actions */

function moveBlock(id, dir) {
  const f = findBlock(id);
  if (!f) return;
  change(() => {
    const si = state.sections.indexOf(f.sec);
    const j = f.i + dir;
    if (j >= 0 && j < f.sec.blocks.length) {
      [f.sec.blocks[f.i], f.sec.blocks[j]] = [f.sec.blocks[j], f.sec.blocks[f.i]];
    } else {
      const other = state.sections[si + dir];
      if (!other) return;
      f.sec.blocks.splice(f.i, 1);
      if (dir < 0) other.blocks.push(f.b); else other.blocks.unshift(f.b);
    }
  });
  scrollIntoViewIfNeeded(blockNode(id));
}
function canMoveBlock(id, dir) {
  const f = findBlock(id);
  if (!f) return false;
  const si = state.sections.indexOf(f.sec);
  return dir < 0 ? f.i > 0 || si > 0 : f.i < f.sec.blocks.length - 1 || si < state.sections.length - 1;
}
function duplicateBlock(id) {
  const f = findBlock(id);
  const copy = withNewIds(f.b);
  change(() => { f.sec.blocks.splice(f.i + 1, 0, copy); sel = { type: 'block', id: copy.id, mode: 'design' }; }, { toast: 'Duplicated' });
}
function deleteBlock(id) {
  const f = findBlock(id);
  if (!f) return;
  blurEditing();
  change(() => { f.sec.blocks.splice(f.i, 1); sel = { type: 'section', id: f.sec.id }; }, { toast: 'Deleted', keepCaret: false });
}
function setBlockAttr(id, key, v) {
  const f = findBlock(id);
  change(() => { f.b.attrs[key] = v; });
}
function setColour(v) {
  const f = currentBlock();
  if (!f) return;
  const g = groupOf(f.b);
  const before = effectiveColour(f.b);
  change(() => { if (v === 'auto') delete f.b.attrs.colour; else f.b.attrs.colour = v; });
  if (g && before !== effectiveColour(f.b)) askAll(g, v);
}
let askTimer = null;
function askAll(g, v) {
  const others = g === 'section' ? state.sections.length - 1 : state.sections.flatMap((s) => s.blocks).filter((x) => groupOf(x) === g).length - 1;
  if (others < 1) return;
  const what = GROUPS[g];
  const el = $('#ask');
  const isBg = g === 'section';
  const name = isBg ? bgName(v) : v === 'auto' ? 'the automatic colour' : colourName(v);
  const hex = isBg ? bgHex(v) : colourHex(v);
  el.innerHTML = `<span class="sw-round" style="background:${hex || 'transparent'}"></span>
    <span>Use ${name} for ${what.all.toLowerCase()} ${isBg ? 'on this page' : 'on your site'}?</span>
    <button type="button" data-ask="all">${what.all}</button>
    <button type="button" data-ask="one" class="quiet">Just this ${what.one}</button>`;
  el.dataset.group = g;
  el.dataset.colour = v;
  el.hidden = false;
  el.title = others > 0 ? `${others} more on this page` : '';
  clearTimeout(askTimer);
  askTimer = setTimeout(hideAsk, 12000);
}
function hideAsk() { const el = $('#ask'); if (el) el.hidden = true; clearTimeout(askTimer); }
function applyToAll(g, v) {
  if (g === 'section') {
    change(() => { for (const s of state.sections) s.bg = v; }, { toast: `Every section now ${bgName(v)}` });
    return;
  }
  change(() => {
    if (v === 'auto') delete state.site.colours[g]; else state.site.colours[g] = v;
    for (const x of state.sections.flatMap((s) => s.blocks)) if (groupOf(x) === g) delete x.attrs.colour;
  }, { toast: `${GROUPS[g].all} ${v === 'auto' ? 'back to automatic' : `now ${colourName(v)}`}` });
}
function setSectionBg(id, v) {
  const s = findSection(id);
  if (!s || s.bg === v) return;
  change(() => { s.bg = v; });
  askAll('section', v);
}
function setSectionProp(id, key, v) {
  const s = findSection(id);
  change(() => {
    s[key] = v;
    // Picking a layout puts everything back in its usual column.
    if (key === 'layout') s.blocks.forEach((b) => delete b.attrs.col);
  });
}
function moveSection(id, dir) {
  const i = state.sections.findIndex((s) => s.id === id);
  const j = i + dir;
  if (j < 0 || j >= state.sections.length) return;
  change(() => { [state.sections[i], state.sections[j]] = [state.sections[j], state.sections[i]]; });
  scrollIntoViewIfNeeded(sectionNode(id));
}
function duplicateSection(id) {
  const i = state.sections.findIndex((s) => s.id === id);
  const copy = cloneDeep(state.sections[i]);
  copy.id = uid('s');
  copy.name += ' copy';
  copy.blocks.forEach((b) => { b.id = uid('b'); });
  change(() => { state.sections.splice(i + 1, 0, copy); sel = { type: 'section', id: copy.id }; }, { toast: 'Section duplicated' });
}
function deleteSection(id) {
  const i = state.sections.findIndex((s) => s.id === id);
  change(() => { state.sections.splice(i, 1); sel = null; }, { toast: 'Section deleted' });
}
function insertInto(secId, kind) {
  const s = findSection(secId);
  const b = INSERTS.find((x) => x.id === kind).make();
  change(() => { s.blocks.push(b); sel = { type: 'block', id: b.id, mode: 'design' }; }, { keepCaret: false });
  scrollIntoViewIfNeeded(blockNode(b.id));
  if (isWritable(b) && b.name !== 'core/buttons') startWriting(b.id, b.html === '' ? 'start' : 'all');
}
function scrollIntoViewIfNeeded(el) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  if (r.top < 120 || r.bottom > innerHeight - 40) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/* ---------------------------------------------------------------- Toolbar */

function tabsHtml(b) {
  const writing = sel.mode === 'write';
  const canWrite = isWritable(b);
  return `<div class="tabs" role="tablist" aria-label="Toolbar">
    <button class="tab ${writing ? 'on' : ''}" data-act="to-write" role="tab" aria-selected="${writing}" aria-label="Write" data-tip="${canWrite ? 'Write' : 'Write (pictures don\u2019t have text)'}" ${canWrite ? '' : 'disabled'}>${ic('pen')}</button>
    <button class="tab ${writing ? '' : 'on'}" data-act="to-design" role="tab" aria-selected="${!writing}" aria-label="Design" data-tip="Design">${ic('design')}</button>
  </div>`;
}
const sep = '<span class="sep" aria-hidden="true"></span>';
function effectiveColour(b) {
  if (b.attrs.colour && b.attrs.colour !== 'auto') return b.attrs.colour;
  const g = groupOf(b);
  return (g && state.site.colours[g]) || 'auto';
}
function colourDot(b) {
  const sec = findBlock(b.id).sec;
  const hex = colourHex(effectiveColour(b));
  return `<span class="swatch-dot ${bgClass(sec.bg)}" style="${bgVars(sec.bg)}background:${hex || 'var(--accent)'}"></span>`;
}
const btn = (act, inner, title, extra = '') => `<button class="tbb" data-act="${act}" title="${esc(title)}" aria-label="${esc(title)}" ${extra}>${inner}</button>`;
const drop = (popName, cls, label, title, style = '') => `<button class="drop ${cls}" data-pop="${popName}" title="${esc(title)}" aria-haspopup="true" aria-expanded="false"><span class="dl" style="${style}">${label}</span>${ic('chev')}</button>`;

function renderToolbar() {
  if (!sel) { tb.hidden = true; tb.innerHTML = ''; return; }
  let html = '';
  let mode = 'design';
  if (sel.type === 'section') {
    const s = findSection(sel.id);
    if (!s) { sel = null; tb.hidden = true; return; }
    const lay = layoutOf(s);
    const i = state.sections.indexOf(s);
    html = `<div class="tabs"><span class="tab on tab-static" role="img" aria-label="Design" data-tip="Design">${ic('design')}</span></div>
      <span class="tb-name">${esc(s.name)} section</span>${sep}
      <button class="drop drop-icon" data-pop="layout" title="Layout">${thumb(lay)}<span class="dl">Layout</span>${ic('chev')}</button>
      <button class="drop drop-icon" data-pop="background" title="Background"><span class="swatch-dot" style="background:${bgHex(s.bg)}"></span><span class="dl">Background</span>${ic('chev')}</button>
      <button class="drop drop-icon" data-pop="spacing" title="Spacing">${ic('spacing')}<span class="dl">Spacing</span>${ic('chev')}</button>
      ${sep}
      <button class="drop drop-icon" data-pop="insert" title="Insert">${ic('plus')}<span class="dl">Insert</span>${ic('chev')}</button>
      ${sep}
      ${btn('sec-up', ic('up'), 'Move section up', i === 0 ? 'disabled' : '')}
      ${btn('sec-down', ic('down'), 'Move section down', i === state.sections.length - 1 ? 'disabled' : '')}
      ${btn('sec-dup', ic('dup'), 'Duplicate section')}
      <button class="tbb danger" data-act="sec-del" title="Delete section" aria-label="Delete section">${ic('trash')}</button>`;
  } else {
    const f = findBlock(sel.id);
    if (!f) { sel = null; tb.hidden = true; return; }
    const { b } = f;
    if (sel.mode === 'write') {
      mode = 'write';
      html = tabsHtml(b) + (b.name === 'core/buttons' ? writeButtonTools() : writeTools(b));
    } else {
      html = tabsHtml(b) + designTools(f);
    }
  }
  tb.className = `tb ${mode}`;
  tb.innerHTML = html;
  tb.hidden = false;
  tb.setAttribute('aria-label', mode === 'write' ? 'Writing toolbar' : 'Design toolbar');
  refreshInlineState();
  positionToolbar();
}

function writeTools(b) {
  const p = presetOf(b);
  const look = lookOf(b);
  const isList = b.name === 'core/list';
  const styleName = isList ? (b.attrs.ordered ? 'Numbered list' : 'Bulleted list') : p.name;
  const align = b.attrs.align || 'left';
  return `${sep}
    ${drop('style', 'drop-style', esc(styleName), 'Style', `font-family:${FONTS[look.font].css}`)}
    ${sep}
    ${drop('font', 'drop-font', FONTS[look.font].name, 'Font', `font-family:${FONTS[look.font].css}`)}
    ${drop('size', `drop-size${look.custom ? ' custom' : ''}`, look.px, look.custom ? 'Size: your own' : `Size: ${SIZE_NAMES[look.size]}`)}
    ${btn('grow', '<span class="aa">A<small>▲</small></span>', 'Bigger text (Ctrl+Shift+>)', canStep(b, 1) ? '' : 'disabled')}
    ${btn('shrink', '<span class="aa shrink">A<small>▼</small></span>', 'Smaller text (Ctrl+Shift+<)', canStep(b, -1) ? '' : 'disabled')}
    ${sep}
    ${btn('inline', '<span class="txt-b">B</span>', 'Bold (Ctrl+B)', 'data-v="bold"')}
    ${btn('inline', '<span class="txt-i">I</span>', 'Italic (Ctrl+I)', 'data-v="italic"')}
    ${btn('inline', '<span class="txt-u">U</span>', 'Underline (Ctrl+U)', 'data-v="underline"')}
    ${btn('inline', '<span class="txt-s">S</span>', 'Strikethrough', 'data-v="strikeThrough"')}
    <button class="tbb" data-pop="link" title="Link" aria-label="Link">${ic('link')}</button>
    <button class="tbb font-colour" data-pop="colour" title="Font colour" aria-label="Font colour"><span class="fc-a">A</span><span class="fc-bar" style="background:${colourHex(effectiveColour(b)) || 'var(--ui-ink)'}"></span></button>
    ${sep}
    <button class="tbb ${isList && !b.attrs.ordered ? 'on' : ''}" data-act="list" data-v="ul" title="Bullets" aria-label="Bullets">${ic('ul')}</button>
    <button class="tbb ${isList && b.attrs.ordered ? 'on' : ''}" data-act="list" data-v="ol" title="Numbering" aria-label="Numbering">${ic('ol')}</button>
    ${sep}
    ${['left', 'center', 'right'].map((v) => `<button class="tbb ${align === v ? 'on' : ''}" data-act="align" data-v="${v}" title="Align ${v === 'center' ? 'centre' : v}" aria-label="Align ${v === 'center' ? 'centre' : v}">${ic(v)}</button>`).join('')}`;
}

function writeButtonTools() {
  return `${sep}
    ${btn('inline', '<span class="txt-b">B</span>', 'Bold (Ctrl+B)', 'data-v="bold"')}
    ${btn('inline', '<span class="txt-i">I</span>', 'Italic (Ctrl+I)', 'data-v="italic"')}`;
}

function designTools(f) {
  const { b } = f;
  let own = '';
  if (b.name === 'core/image') {
    own = `<button class="drop drop-icon" data-pop="shape" title="Shape">${ic('shape')}<span class="dl">Shape</span>${ic('chev')}</button>
      <button class="drop drop-icon" data-pop="replace" title="Replace picture">${ic('image')}<span class="dl">Replace</span>${ic('chev')}</button>
      ${SWAPS[layoutOf(f.sec)] ? `<button class="tbb" data-act="swap-sides" title="Move to the ${layoutOf(f.sec) === 'text-media' ? 'left' : 'right'} (or drag it across)">${ic('swap')}Swap sides</button>` : ''}${sep}`;
  } else if (b.name === 'core/buttons') {
    own = `<button class="drop drop-icon" data-pop="btnstyle" title="Button style">${ic('button')}<span class="dl">Style</span>${ic('chev')}</button>
      <button class="drop drop-icon" data-pop="colour" title="Colour">${colourDot(b)}<span class="dl">Colour</span>${ic('chev')}</button>
      <button class="drop drop-icon" data-pop="btnsize" title="Size">${ic('resize')}<span class="dl">${BUTTON_SIZES.find((x) => x.id === (b.attrs.size || 'm')).name}</span>${ic('chev')}</button>
      <button class="drop drop-icon" data-pop="corners" title="Corners">${ic('corner')}<span class="dl">Corners</span>${ic('chev')}</button>
      <button class="tbb ${b.attrs.wide ? 'on' : ''}" data-act="btn-wide" title="Full width" aria-label="Full width" aria-pressed="${!!b.attrs.wide}">${ic('wide')}</button>
      <button class="tbb" data-pop="link" title="Where it goes" aria-label="Where it goes">${ic('link')}</button>${sep}`;
  } else {
    const align = b.attrs.align || 'left';
    own = `${['left', 'center', 'right'].map((v) => `<button class="tbb ${align === v ? 'on' : ''}" data-act="align" data-v="${v}" title="Align ${v === 'center' ? 'centre' : v}" aria-label="Align ${v === 'center' ? 'centre' : v}">${ic(v)}</button>`).join('')}${sep}`;
  }
  return `${sep}
    <button class="tbb grip" data-grip title="Drag to move" aria-label="Drag to move">${ic('grip')}</button>
    ${btn('up', ic('up'), 'Move up (Alt+↑)', canMoveBlock(b.id, -1) ? '' : 'disabled')}
    ${btn('down', ic('down'), 'Move down (Alt+↓)', canMoveBlock(b.id, 1) ? '' : 'disabled')}
    ${sep}${own}
    ${btn('dup', ic('dup'), 'Duplicate')}
    <button class="tbb danger" data-act="del" title="Delete (Delete key)" aria-label="Delete">${ic('trash')}</button>
    ${sep}
    <button class="tbb" data-act="parent" title="Select the section (Esc)">${ic('parent')}Section</button>`;
}

function positionToolbar() {
  if (!sel || tb.hidden) return;
  const target = sel.type === 'section' ? sectionNode(sel.id) : blockNode(sel.id);
  if (!target) return;
  const r = target.getBoundingClientRect();
  const top0 = $('#editor-bar').offsetHeight + 8;
  const hgt = tb.offsetHeight;
  const w = tb.offsetWidth;
  let top;
  if (sel.type === 'section') top = Math.max(r.top + 30, top0);
  else {
    top = r.top - hgt - 16;
    if (top < top0) top = r.bottom > top0 && r.bottom + 14 + hgt <= innerHeight - 8 ? r.bottom + 14 : top0;
  }
  const left = Math.min(Math.max(8, (sel.type === 'section' ? r.left + 16 : r.left - 6)), innerWidth - w - 8);
  tb.style.top = `${Math.round(top)}px`;
  tb.style.left = `${Math.round(left)}px`;
  positionPop();
}

tb.addEventListener('mousedown', (e) => {
  // Keep the caret where it is while using the toolbar.
  if (!e.target.closest('input')) e.preventDefault();
});
tb.addEventListener('click', (e) => {
  const popBtn = e.target.closest('[data-pop]');
  if (popBtn) { togglePop(popBtn.dataset.pop, popBtn); return; }
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  const v = el.dataset.v;
  const id = sel && sel.id;
  switch (act) {
    case 'to-write': startWriting(id); break;
    case 'to-design': startDesigning(id); break;
    case 'grow': stepSize(1); break;
    case 'shrink': stepSize(-1); break;
    case 'inline': inline(v); break;
    case 'list': setList(v === 'ol'); break;
    case 'align': setAlign(v); break;
    case 'up': moveBlock(id, -1); break;
    case 'down': moveBlock(id, 1); break;
    case 'dup': duplicateBlock(id); break;
    case 'del': deleteBlock(id); break;
    case 'swap-sides': swapSides(findBlock(id).sec.id); break;
    case 'btn-wide': { const fb = findBlock(id).b; change(() => { fb.attrs.wide = !fb.attrs.wide; delete fb.attrs.width; }); break; }
    case 'parent': { const f = findBlock(id); blurEditing(); setSel({ type: 'section', id: f.sec.id }); break; }
    case 'sec-up': moveSection(id, -1); break;
    case 'sec-down': moveSection(id, 1); break;
    case 'sec-dup': duplicateSection(id); break;
    case 'sec-del': deleteSection(id); break;
    default:
  }
});
tb.addEventListener('pointerdown', (e) => {
  const g = e.target.closest('[data-grip]');
  if (g && sel && sel.type === 'block') beginDrag(sel.id, e);
});

/* ---------------------------------------------------------------- Popovers */

let popState = null; // { name, trigger, preview }

function togglePop(name, trigger) {
  if (popState && popState.name === name) { closePop(); return; }
  closePop();
  const htmlFor = POPS[name];
  if (!htmlFor) return;
  if (name === 'link') saveRange();
  popCaret = sel && sel.type === 'block' && sel.mode === 'write' && editNode(sel.id) ? getCaretOffset(editNode(sel.id)) : null;
  pop.className = `pop pop-${name} ${tb.classList.contains('write') ? 'write' : 'design'}`;
  pop.style.setProperty('--mode', tb.classList.contains('write') ? 'var(--write)' : 'var(--design)');
  pop.style.setProperty('--mode-tint', tb.classList.contains('write') ? 'var(--write-tint)' : 'var(--design-tint)');
  pop.innerHTML = htmlFor();
  pop.style.maxHeight = '';
  pop.hidden = false;
  popState = { name, trigger, preview: null };
  trigger.classList.add('open');
  trigger.setAttribute('aria-expanded', 'true');
  positionPop();
  const input = pop.querySelector('input');
  if (input) { input.focus(); input.select(); }
  const on = pop.querySelector('.on');
  if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
}

function closePop() {
  if (!popState) return;
  endPreview();
  const { trigger } = popState;
  if (trigger) { trigger.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); }
  popState = null;
  pop.hidden = true;
  pop.innerHTML = '';
}

function positionPop() {
  if (!popState || !popState.trigger || !popState.trigger.isConnected) return;
  const r = popState.trigger.getBoundingClientRect();
  const w = pop.offsetWidth;
  const hgt = pop.offsetHeight;
  let top = r.bottom + 6;
  if (top + hgt > innerHeight - 8 && r.top - hgt - 6 > 8) top = r.top - hgt - 6;
  else pop.style.maxHeight = `${Math.max(200, innerHeight - top - 12)}px`;
  pop.style.top = `${Math.round(top)}px`;
  pop.style.left = `${Math.round(Math.min(Math.max(8, r.left), innerWidth - w - 8))}px`;
}

function opt(act, v, on, main, meta = '', extra = '') {
  return `<button class="opt ${on ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}" ${extra} role="menuitemradio" aria-checked="${!!on}">
    <span class="opt-check">${ic('check')}</span><span class="opt-main">${main}</span>${meta ? `<span class="opt-meta">${meta}</span>` : ''}</button>`;
}
const sampleSize = (px, max = 28) => Math.min(px, max);

const POPS = {
  style() {
    const b = currentBlock().b;
    const cur = presetOf(b);
    let out = '';
    for (const font of FONT_ORDER) {
      out += `<div class="pop-head">${FONTS[font].name}</div>`;
      for (const p of PRESETS.filter((x) => x.font === font)) {
        out += opt('preset', p.id, cur && cur.id === p.id,
          `<span class="sample s-${p.id}" style="font-size:${sampleSize(p.px)}px">${p.name}</span><span class="under">${describePreset(p)}</span>`,
          p.px);
      }
    }
    return out + '<div class="pop-foot">These are the styles your theme offers. Change them for the whole site in Styles.</div>';
  },
  font() {
    const look = lookOf(currentBlock().b);
    return FONT_ORDER.map((font) => opt('font', font, look.font === font,
      `<span class="sample" style="font-family:${FONTS[font].css};font-size:19px">${FONTS[font].name}</span><span class="opt-note">${FONTS[font].note}</span>`)).join('')
      + '<div class="pop-foot">Your theme’s fonts. Each comes in a few sizes.</div>';
  },
  size() {
    const look = lookOf(currentBlock().b);
    const sizes = PRESETS.filter((p) => p.font === look.font).sort((a, c) => c.px - a.px);
    return `<div class="pop-head">${FONTS[look.font].name} sizes</div>`
      + `<form class="size-form" data-form="size" novalidate>
          <input type="number" inputmode="decimal" step="0.5" value="${look.px}" aria-label="Font size">
          <span class="size-unit">px</span>
          <button type="submit">Set</button>
        </form>`
      + sizes.map((p) => opt('preset', p.id, !look.custom && look.px === p.px && look.size === p.size,
        `<span class="sample s-${p.id}" style="font-size:${sampleSize(p.px, 34)}px;text-transform:none;letter-spacing:0">${SIZE_NAMES[p.size]}</span><span class="under">${describePreset(p)}</span>`,
        p.px, '')).join('').replace(/class="opt /g, 'class="opt size-row ')
      + `<div class="pop-foot">${look.custom ? 'This is your own size. Pick one of the theme\u2019s to go back to it.' : 'Type any size above, or pick one of the theme\u2019s.'}</div>`;
  },
  link() {
    const b = currentBlock().b;
    const isButton = b.name === 'core/buttons';
    const existing = isButton ? (b.attrs.url === '#' ? '' : b.attrs.url) : currentLinkHref();
    return `<form class="link-form" data-form="link">
      <label for="link-url">${isButton ? 'Where should the button go?' : 'Link to'}</label>
      <input id="link-url" type="text" placeholder="Paste a web address or search pages" value="${esc(existing || '')}">
      <div class="link-actions">${existing ? '<button type="button" data-act="unlink">Remove</button>' : ''}<button type="submit" class="primary">Apply</button></div>
    </form>`;
  },
  layout() {
    const s = findSection(sel.id);
    const cur = layoutOf(s);
    return `<div class="pop-head">Layouts for this section</div><div class="gallery">${LAYOUTS.map((l) => {
      const ok = l.ok(s);
      return `<button class="gal-opt ${cur === l.id ? 'on' : ''}" data-act="sec-set" data-prop="layout" data-v="${l.id}" ${ok ? '' : 'disabled title="Needs different content to work"'}>${thumb(l.id)}${l.name}</button>`;
    }).join('')}</div><div class="pop-foot">Hover a layout to preview it on the page. Click to keep it.</div>`;
  },
  background() {
    const s = findSection(sel.id);
    const custom = isCustomBg(s.bg) ? s.bg : '';
    return `<div class="pop-head">Background</div><div class="swatches">${BACKGROUNDS.map((bg) => `<button class="sw-opt ${s.bg === bg.id ? 'on' : ''}" data-act="sec-set" data-prop="bg" data-v="${bg.id}"><span class="sw-chip bg-${bg.id}" style="background:var(--ground);color:var(--ink)">Aa</span>${bg.name}</button>`).join('')}</div>
      <label class="custom-colour"><span class="sw-round ${custom ? '' : 'rainbow'}" style="${custom ? `background:${custom}` : ''}"></span>
        <span class="opt-main"><span>${custom ? `Your colour ${custom.toUpperCase()}` : 'Choose your own\u2026'}</span><span class="opt-note">Text switches between dark and light to stay readable</span></span>
        <input type="color" data-bg-input value="${bgHex(s.bg)}"></label>`;
  },
  spacing() {
    const s = findSection(sel.id);
    return SPACINGS.map((sp) => opt('sec-set', sp.id, s.spacing === sp.id, `<span>${sp.name}</span><span class="opt-note">${sp.note}</span>`, '', 'data-prop="spacing"')).join('');
  },
  insert() {
    const iconFor = { heading: 'heading', body: 'textico', ul: 'ul', quote: 'quote', image: 'image', button: 'button' };
    return `<div class="pop-head">Add to this section</div>${INSERTS.map((i) => `<button class="opt" data-act="insert" data-v="${i.id}">${ic(iconFor[i.id])}<span class="opt-main">${i.name}</span></button>`).join('')}`;
  },
  shape() {
    const b = currentBlock().b;
    return SHAPES.map((sh) => opt('img-shape', sh.id, b.attrs.shape === sh.id,
      `<span style="display:flex;align-items:center;gap:10px"><span class="shape-ico"><i style="width:${sh.w}px;height:${sh.h}px;border-radius:${sh.r || '2px'}"></i></span>${sh.name}</span>`)).join('');
  },
  replace() {
    const b = currentBlock().b;
    return `<div class="pop-head">Choose a picture</div><div class="pics">${PICTURES.map((p) => `<button class="pic-opt ${b.attrs.file === p.file ? 'on' : ''}" data-act="img-file" data-v="${p.file}" title="${esc(p.alt)}"><img src="${IMG_DIR}${p.file}" alt=""></button>`).join('')}</div>`;
  },
  colour() {
    const b = currentBlock().b;
    const isButton = b.name === 'core/buttons';
    const cur = b.attrs.colour || 'auto';
    const g = groupOf(b);
    const site = g && state.site.colours[g];
    const sec = findBlock(b.id).sec;
    const custom = cur !== 'auto' && !COLOUR[cur] ? cur : '';
    const autoNote = site ? `Same as every ${GROUPS[g].one} (${colourName(site)})` : isButton ? 'Your theme\u2019s accent' : 'Matches the section';
    return `<div class="pop-head">${isButton ? 'Button colour' : 'Font colour'}</div>
      <button class="opt ${cur === 'auto' ? 'on' : ''}" data-act="blk-set" data-prop="colour" data-v="auto">
        <span class="opt-check">${ic('check')}</span><span class="sw-round ${bgClass(sec.bg)}" style="${bgVars(sec.bg)}background:${colourHex(site) || (isButton ? 'var(--accent)' : 'var(--ink)')}"></span>
        <span class="opt-main"><span>Automatic</span><span class="opt-note">${autoNote}</span></span></button>
      <div class="colour-grid">${COLOURS.map((c) => `<button class="sw-round-btn ${cur === c.id ? 'on' : ''}" data-act="blk-set" data-prop="colour" data-v="${c.id}" title="${c.name}" aria-label="${c.name}"><span class="sw-round" style="background:${c.hex}"></span></button>`).join('')}</div>
      <label class="custom-colour"><span class="sw-round ${custom ? '' : 'rainbow'}" style="${custom ? `background:${custom}` : ''}"></span>
        <span class="opt-main"><span>${custom ? `Your colour ${custom.toUpperCase()}` : 'Choose your own\u2026'}</span></span>
        <input type="color" data-colour-input value="${custom || colourHex(effectiveColour(b)) || '#2F5D50'}"></label>`;
  },
  btnsize() {
    const b = currentBlock().b;
    const cur = b.attrs.size || 'm';
    return BUTTON_SIZES.map((x) => opt('blk-set', x.id, cur === x.id,
      `<span style="display:flex;align-items:center;gap:12px"><span class="btn-sample sz-${x.id}">Button</span>${x.name}</span>`, '', 'data-prop="size"')).join('');
  },
  corners() {
    const b = currentBlock().b;
    const cur = b.attrs.corners || 'pill';
    return BUTTON_CORNERS.map((x) => opt('blk-set', x.id, cur === x.id,
      `<span style="display:flex;align-items:center;gap:12px"><span class="btn-sample" style="border-radius:${x.r}">Button</span>${x.name}</span>`, '', 'data-prop="corners"')).join('');
  },
  btnstyle() {
    const b = currentBlock().b;
    return BUTTON_STYLES.map((bs) => opt('blk-set', bs.id, b.attrs.variant === bs.id,
      `<span style="display:flex;align-items:center;gap:12px"><span class="btn-sample ${bs.id}">Button</span>${bs.name}</span>`, '', 'data-prop="variant"')).join('');
  },
};

pop.addEventListener('mousedown', (e) => {
  if (!e.target.closest('input')) e.preventDefault();
});
pop.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const { act, v } = el.dataset;
  const id = sel && sel.id;
  switch (act) {
    case 'preset': setPreset(v); break;
    case 'font': setFont(v); break;
    case 'sec-set': {
      const prop = el.dataset.prop;
      endPreview();
      if (prop === 'bg') setSectionBg(id, v); else setSectionProp(id, prop, v);
      break;
    }
    case 'insert': insertInto(id, v); break;
    case 'img-shape': setBlockAttr(id, 'shape', v); break;
    case 'img-file': setBlockAttr(id, 'file', v); break;
    case 'blk-set': {
      const prop = el.dataset.prop;
      endPreview();
      if (prop === 'colour') setColour(v); else setBlockAttr(id, prop, v);
      break;
    }
    case 'unlink': applyLink(''); break;
    default:
  }
});
pop.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = pop.querySelector('input');
  if (e.target.dataset.form === 'size') setCustomSize(parseFloat(input.value));
  else applyLink(input.value.trim());
});

// PowerPoint-style live preview for section layouts, backgrounds and spacing.
pop.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-act="sec-set"], [data-act="blk-set"]');
  if (!el || el.disabled || !sel || !popState) return;
  const prop = el.dataset.prop;
  const target = el.dataset.act === 'sec-set' ? findSection(sel.id) : (findBlock(sel.id) || {}).b;
  if (!target) return;
  const bag = el.dataset.act === 'sec-set' ? target : target.attrs;
  if (!popState.preview) popState.preview = { bag, prop, value: bag[prop] };
  if (bag[prop] !== el.dataset.v) { bag[prop] = el.dataset.v; renderKeepingCaret(); }
});
function renderKeepingCaret() {
  // Re-rendering replaces the text being edited, so put the caret back.
  const writing = sel && sel.type === 'block' && sel.mode === 'write';
  const off = writing ? popCaret : null;
  render();
  if (writing && editNode(sel.id) && document.activeElement && !document.activeElement.closest('#pop')) {
    editNode(sel.id).focus(); setCaretOffset(editNode(sel.id), off == null ? Infinity : off);
  }
}
pop.addEventListener('mouseleave', () => endPreview());

function endPreview() {
  if (!popState || !popState.preview) return;
  const { bag, prop, value } = popState.preview;
  popState.preview = null;
  if (bag[prop] !== value) { if (value === undefined) delete bag[prop]; else bag[prop] = value; renderKeepingCaret(); }
}
pop.addEventListener('change', (e) => {
  if (e.target.matches('[data-colour-input]')) setColour(e.target.value.toUpperCase());
  if (e.target.matches('[data-bg-input]') && sel && sel.type === 'section') setSectionBg(sel.id, e.target.value.toUpperCase());
});

let savedRange = null;
function saveRange() {
  const s = document.getSelection();
  savedRange = s.rangeCount ? s.getRangeAt(0).cloneRange() : null;
}
function currentLinkHref() {
  const s = document.getSelection();
  if (!s.rangeCount) return '';
  const n = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement);
  const a = n && n.closest('a');
  return a && a.closest('#page') ? a.getAttribute('href') : '';
}
function applyLink(url) {
  const f = currentBlock();
  if (!f) return;
  if (f.b.name === 'core/buttons') {
    closePop();
    setBlockAttr(f.b.id, 'url', url || '#');
    toast(url ? 'Button link saved' : 'Button link removed');
    return;
  }
  const ed = editNode(f.b.id);
  ed.focus();
  if (savedRange) { const s = document.getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
  const s = document.getSelection();
  if (url) {
    if (s.isCollapsed) {
      const a = currentLinkHref();
      if (!a) document.execCommand('insertHTML', false, `<a href="${esc(url)}">${esc(url)}</a>`);
      else { const n = s.anchorNode.parentElement.closest('a'); n.setAttribute('href', url); }
    } else {
      document.execCommand('createLink', false, url);
    }
  } else {
    if (s.isCollapsed) { const n = s.anchorNode && s.anchorNode.parentElement && s.anchorNode.parentElement.closest('a'); if (n) { const r = document.createRange(); r.selectNodeContents(n); s.removeAllRanges(); s.addRange(r); } }
    document.execCommand('unlink');
  }
  syncFromDom(f.b.id);
  textDirty = true;
  updateUndo();
  closePop();
}

document.addEventListener('mousedown', (e) => {
  if (popState && !e.target.closest('#pop') && !e.target.closest('#tb')) closePop();
});

/* ---------------------------------------------------------------- Layout thumbnails */

function thumb(id) {
  const T = (x, y, w, hh, cls = 't-text') => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${hh}" rx="1"/>`;
  const lines = (x, y, w, n = 3, step = 5) => Array.from({ length: n }, (_, k) => T(x, y + k * step, k === n - 1 ? w * 0.6 : w, 2)).join('');
  let inner = '';
  switch (id) {
    case 'text-media': inner = T(8, 14, 34, 5, 't-head') + lines(8, 23, 34) + T(54, 9, 38, 42, 't-img'); break;
    case 'media-text': inner = T(8, 9, 38, 42, 't-img') + T(58, 14, 34, 5, 't-head') + lines(58, 23, 34); break;
    case 'overlay': inner = T(0, 0, 100, 60, 't-img') + T(0, 30, 100, 30, 't-shade') + T(8, 38, 40, 5, 't-light') + T(8, 47, 54, 2, 't-light') + T(8, 52, 34, 2, 't-light'); break;
    case 'stacked': inner = T(14, 9, 44, 5, 't-head') + lines(14, 18, 66) + T(14, 35, 72, 18, 't-img'); break;
    case 'centred': inner = T(28, 12, 44, 5, 't-head') + T(20, 22, 60, 2) + T(24, 27, 52, 2) + T(30, 32, 40, 2) + T(38, 41, 24, 6, 't-head'); break;
    case 'split': inner = T(8, 12, 30, 5, 't-head') + T(8, 20, 22, 5, 't-head') + lines(48, 12, 44, 4) + lines(48, 34, 44, 3); break;
    case 'media-row': inner = T(30, 7, 40, 5, 't-head') + T(26, 16, 48, 2) + T(8, 26, 26, 26, 't-img') + T(37, 26, 26, 26, 't-img') + T(66, 26, 26, 26, 't-img'); break;
    default:
  }
  return `<svg class="thumb" viewBox="0 0 100 60" aria-hidden="true">${inner}</svg>`;
}

/* ---------------------------------------------------------------- Hover handle and dragging */

let hoverId = null;
page.addEventListener('mousemove', (e) => {
  if (drag) return;
  const bel = e.target.closest('.b');
  if (!bel) { if (!e.target.closest('#handle') && !nearHovered(e)) hideHandle(); return; }
  if (bel.dataset.id === hoverId && !handle.hidden) return;
  hoverId = bel.dataset.id;
  placeHandle(bel);
});
page.addEventListener('mouseleave', (e) => { if (!e.relatedTarget || !e.relatedTarget.closest('#handle')) hideHandle(); });
function placeHandle(bel) {
  const r = bel.getBoundingClientRect();
  handle.innerHTML = ic('grip');
  handle.hidden = false;
  const left = r.left - 32 < 4 ? r.left + 4 : r.left - 32;
  handle.style.left = `${left + scrollX}px`;
  handle.style.top = `${r.top + scrollY + Math.min(4, r.height / 2 - 15)}px`;
}
function hideHandle() { handle.hidden = true; hoverId = null; }
// Keep the handle while the pointer crosses the gap between a block and its handle.
function nearHovered(e) {
  const el = hoverId && blockNode(hoverId);
  if (!el || handle.hidden) return false;
  const r = el.getBoundingClientRect();
  const h = handle.getBoundingClientRect();
  return e.clientX >= Math.min(r.left, h.left) - 6 && e.clientX <= r.right
    && e.clientY >= Math.min(r.top, h.top) - 6 && e.clientY <= Math.max(r.bottom, h.bottom) + 6;
}
handle.addEventListener('mouseleave', (e) => {
  if (drag) return;
  const to = e.relatedTarget;
  if (to && to.closest && to.closest(`.b[data-id="${hoverId}"]`)) return;
  if (!nearHovered(e)) hideHandle();
});
handle.addEventListener('mousedown', (e) => e.preventDefault());
handle.addEventListener('pointerdown', (e) => { if (hoverId) beginDrag(hoverId, e); });

let drag = null;
// Listens on the window rather than capturing the pointer on the handle: the handle and
// toolbar hide once a drag starts, and a hidden element loses its pointer capture.
function beginDrag(id, e, opts = {}) {
  e.preventDefault();
  if (drag) endDragListeners();
  drag = { id, x: e.clientX, y: e.clientY, active: false, target: null, clickToWrite: !!opts.clickToWrite };
  addEventListener('pointermove', onDragMove);
  addEventListener('pointerup', onDragEnd);
  addEventListener('pointercancel', onDragEnd);
}
function endDragListeners() {
  removeEventListener('pointermove', onDragMove);
  removeEventListener('pointerup', onDragEnd);
  removeEventListener('pointercancel', onDragEnd);
}
// PowerPoint-style: press on a picture, a button or an already-selected item and drag it.
page.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('.rz')) return;
  const bel = e.target.closest('.b');
  if (!bel) return;
  const ed = e.target.closest('[data-edit]');
  const selectedForDesign = sel && sel.type === 'block' && sel.id === bel.dataset.id && sel.mode === 'design';
  if (ed && ed.isContentEditable && !selectedForDesign) return; // clicking text writes, as before
  // A second click on something already selected (text or a button) starts writing in it.
  beginDrag(bel.dataset.id, e, { clickToWrite: !!ed && selectedForDesign });
});
function caretFromPoint(x, y) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
  const p = document.caretPositionFromPoint && document.caretPositionFromPoint(x, y);
  if (!p) return null;
  const r = document.createRange(); r.setStart(p.offsetNode, p.offset); r.collapse(true);
  return r;
}
function onDragMove(e) {
  if (!drag) return;
  if (!drag.active) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
    drag.active = true;
    closePop();
    blurEditing();
    const el = blockNode(drag.id);
    const r = el.getBoundingClientRect();
    const g = el.cloneNode(true);
    g.classList.add('ghost');
    g.classList.remove('sel-design', 'sel-write');
    g.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
    g.querySelectorAll('.rz').forEach((n) => n.remove());
    g.style.width = `${Math.min(r.width, el.classList.contains('k-image') ? 220 : 520)}px`;
    const sec = el.closest('.sec');
    g.className += ` ${[...sec.classList].filter((c) => c.startsWith('bg-')).join(' ')}`;
    g.style.cssText += sec.style.cssText;
    document.body.append(g);
    drag.ghost = g;
    drag.dx = Math.min(e.clientX - r.left, 40);
    drag.dy = Math.min(e.clientY - r.top, 30);
    el.classList.add('is-dragging');
    document.body.classList.add('dragging');
    hideHandle();
    tb.hidden = true;
  }
  drag.ghost.style.left = `${e.clientX - drag.dx}px`;
  drag.ghost.style.top = `${e.clientY - drag.dy}px`;
  if (e.clientY < 90) scrollBy(0, -14); else if (e.clientY > innerHeight - 50) scrollBy(0, 14);
  drag.target = findDropTarget(e.clientX, e.clientY);
  showDropLine(drag.target);
}
function findDropTarget(x, y) {
  const under = document.elementFromPoint(x, y);
  if (!under) return null;
  const sec = under.closest('.sec');
  if (!sec) return null;
  const swap = swapTarget(sec, x);
  if (swap) return swap;
  const candidates = [...sec.querySelectorAll('.b')].filter((b) => b.dataset.id !== drag.id && b.offsetParent);
  if (!candidates.length) return { secId: sec.dataset.id, end: true, rect: sec.querySelector('.sec-inner').getBoundingClientRect() };
  let best = null; let bestD = Infinity;
  for (const c of candidates) {
    const r = c.getBoundingClientRect();
    const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
    const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
    const d = dx * 3 + dy;
    if (d < bestD) { bestD = d; best = { c, r }; }
  }
  const before = y < best.r.top + best.r.height / 2;
  const colEl = best.c.closest('.col-text, .col-media');
  const col = colEl ? (colEl.classList.contains('col-text') ? 'text' : 'media') : null;
  return { secId: sec.dataset.id, id: best.c.dataset.id, before, rect: best.r, col };
}
// In a picture-and-text section, dragging a picture across to the text's side swaps the sides.
const SWAPS = { 'text-media': 'media-text', 'media-text': 'text-media' };
function swapTarget(secEl, x) {
  const f = findBlock(drag.id);
  const s = findSection(secEl.dataset.id);
  if (!f || f.sec !== s || !isMedia(f.b) || colOf(f.b) !== 'media' || !SWAPS[layoutOf(s)]) return null;
  const textCol = secEl.querySelector('.col-text');
  const mediaCol = secEl.querySelector('.col-media');
  if (!textCol || !mediaCol) return null;
  const t = textCol.getBoundingClientRect();
  const m = mediaCol.getBoundingClientRect();
  const textOnLeft = t.left < m.left;
  // The strip outside the text column, between it and the edge of the section.
  const sr = secEl.getBoundingClientRect();
  const inStrip = textOnLeft ? x < t.left + 12 : x > t.right - 12;
  if (!inStrip) return null;
  const side = textOnLeft ? 'left' : 'right';
  const pics = f.sec.blocks.filter((b) => isMedia(b) && colOf(b) === 'media').length > 1 ? 'pictures' : 'picture';
  const left = textOnLeft ? sr.left + 16 : t.right + 4;
  const right = textOnLeft ? t.left - 4 : sr.right - 16;
  const rect = { left, top: sr.top + 16, width: Math.max(60, right - left), height: sr.height - 32 };
  return { secId: s.id, swap: SWAPS[layoutOf(s)], side, rect, label: `Move the ${pics} to the ${side}` };
}
function swapSides(secId) {
  const s = findSection(secId);
  const next = SWAPS[layoutOf(s)];
  if (!next) return;
  change(() => { s.layout = next; }, { toast: `Picture moved to the ${next === 'media-text' ? 'left' : 'right'}` });
}
function showDropLine(t) {
  if (!t) { dropLine.hidden = true; return; }
  dropLine.hidden = false;
  dropLine.classList.toggle('zone', !!t.swap);
  if (t.swap) {
    const r = t.rect;
    dropLine.dataset.label = t.label;
    Object.assign(dropLine.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    return;
  }
  dropLine.style.height = '';
  const r = t.rect;
  const y = t.end ? r.bottom - 40 : t.before ? r.top - 9 : r.bottom + 7;
  dropLine.style.left = `${r.left + (t.end ? 40 : 0)}px`;
  dropLine.style.width = `${r.width - (t.end ? 80 : 0)}px`;
  dropLine.style.top = `${y}px`;
}
function onDragEnd(e) {
  const d = drag;
  drag = null;
  endDragListeners();
  dropLine.hidden = true;
  document.body.classList.remove('dragging');
  if (d.ghost) d.ghost.remove();
  const el = blockNode(d.id);
  if (el) el.classList.remove('is-dragging');
  if (!d.active) {
    if (e.type !== 'pointerup') return;
    if (d.clickToWrite) {
      // A click (not a drag) on a selected piece of text starts writing where you clicked.
      startWriting(d.id);
      const r = caretFromPoint(e.clientX, e.clientY);
      const ed = editNode(d.id);
      if (r && ed && ed.contains(r.startContainer)) { const sl = document.getSelection(); sl.removeAllRanges(); sl.addRange(r); }
    } else startDesigning(d.id);
    return;
  }
  const t = d.target;
  if (t && t.swap) {
    sel = { type: 'block', id: d.id, mode: 'design' };
    const s = findSection(t.secId);
    change(() => { s.layout = t.swap; }, { toast: `Picture moved to the ${t.side}`, keepCaret: false });
    return;
  }
  if (!t || t.id === d.id) { sel = { type: 'block', id: d.id, mode: 'design' }; applySel(); renderToolbar(); return; }
  change(() => {
    const src = findBlock(d.id);
    src.sec.blocks.splice(src.i, 1);
    const dest = findSection(t.secId);
    if (t.end) dest.blocks.push(src.b);
    else {
      const i = dest.blocks.findIndex((b) => b.id === t.id);
      dest.blocks.splice(t.before ? i : i + 1, 0, src.b);
    }
    // Keep it in the column it was dropped into.
    const natural = isMedia(src.b) ? 'media' : 'text';
    if (t.col && t.col !== natural) {
      src.b.attrs.col = t.col;
      // A picture moved in among text starts at half the column's width rather than filling it.
      if (isMedia(src.b) && !src.b.attrs.width) src.b.attrs.width = 50;
    } else delete src.b.attrs.col;
    sel = { type: 'block', id: d.id, mode: 'design' };
  }, { toast: 'Moved', keepCaret: false });
}

/* ---------------------------------------------------------------- Resizing */

// PowerPoint-style handles on the selected item. Sizes are a share of the column,
// snapping to quarters and thirds, so things still line up and still reflow on phones.
const SNAPS = [25, 100 / 3, 50, 200 / 3, 75, 100];
function addResizeHandles(el) {
  if (el.closest('.lay-overlay .col-media')) return; // a background picture fills the section
  // A button's block spans the column, so its handles go on the button itself.
  const host = el.classList.contains('k-button') ? el.querySelector('.btn') : el;
  for (const pos of ['nw', 'ne', 'sw', 'se', 'w', 'e']) {
    const hnd = h('span', `rz rz-${pos}`);
    hnd.dataset.pos = pos;
    hnd.setAttribute('aria-hidden', 'true');
    host.append(hnd);
  }
}
let rsz = null;
page.addEventListener('pointerdown', (e) => {
  const hnd = e.target.closest('.rz');
  if (!hnd) return;
  e.preventDefault();
  e.stopPropagation();
  const el = hnd.closest('.b');
  const f = findBlock(el.dataset.id);
  const target = f.b.name === 'core/buttons' ? el.querySelector('.btn') : el;
  const col = el.parentElement.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  const centred = getComputedStyle(el.parentElement).alignItems === 'center' || f.b.name === 'core/buttons' && getComputedStyle(el).justifyContent === 'center';
  rsz = { id: f.b.id, el, target, pos: hnd.dataset.pos, colW: col.width, left: r.left, right: r.right, mid: (r.left + r.right) / 2, centred, pct: null };
  hnd.setPointerCapture(e.pointerId);
  document.body.classList.add('resizing');
  tb.hidden = true;
  hideHandle();
});
page.addEventListener('pointermove', (e) => {
  if (!rsz) return;
  const west = rsz.pos.includes('w');
  let w;
  if (rsz.centred) w = Math.abs(e.clientX - rsz.mid) * 2;
  else w = west ? rsz.right - e.clientX : e.clientX - rsz.left;
  let pct = Math.max(12, Math.min(100, (w / rsz.colW) * 100));
  const near = SNAPS.find((x) => Math.abs(x - pct) < 2.5);
  pct = near || Math.round(pct);
  rsz.pct = pct;
  rsz.target.style.width = `${pct}%`;
  if (!rsz.centred && west && rsz.target === rsz.el) rsz.el.style.marginLeft = `${Math.max(0, (rsz.right - rsz.el.parentElement.getBoundingClientRect().left) / rsz.colW * 100 - pct)}%`;
  sizeTip(e, near ? `${Math.round(pct)}%  \u00b7  ${{ 25: 'a quarter', 33: 'a third', 50: 'half', 67: 'two thirds', 75: 'three quarters', 100: 'full width' }[Math.round(pct)]}` : `${Math.round(pct)}%`);
});
function endResize() {
  if (!rsz) return;
  const { id, pct, el } = rsz;
  rsz = null;
  document.body.classList.remove('resizing');
  sizeTip(null);
  el.style.marginLeft = '';
  if (pct == null) { renderToolbar(); return; }
  const f = findBlock(id);
  change(() => {
    if (pct >= 100) delete f.b.attrs.width; else f.b.attrs.width = Math.round(pct * 100) / 100;
    if (f.b.name === 'core/buttons') f.b.attrs.wide = pct >= 100;
  }, { toast: pct >= 100 ? 'Full width' : `Resized to ${Math.round(pct)}%` });
}
page.addEventListener('pointerup', endResize);
page.addEventListener('pointercancel', endResize);
function sizeTip(e, text) {
  let tip = $('#size-tip');
  if (!e) { if (tip) tip.hidden = true; return; }
  if (!tip) { tip = h('div', 'size-tip'); tip.id = 'size-tip'; document.body.append(tip); }
  tip.textContent = text;
  tip.hidden = false;
  tip.style.left = `${e.clientX + 14}px`;
  tip.style.top = `${e.clientY + 16}px`;
}

/* ---------------------------------------------------------------- Toast */

let toastTimer = null;
function toast(msg) {
  hideAsk();
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span><button type="button" data-undo>Undo</button>`;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 5000);
}
$('#ask').addEventListener('mousedown', (e) => e.preventDefault());
$('#ask').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ask]');
  if (!b) return;
  const { group, colour } = $('#ask').dataset;
  hideAsk();
  if (b.dataset.ask === 'all') applyToAll(group, colour);
});
$('#toast').addEventListener('click', (e) => {
  if (e.target.closest('[data-undo]')) { undo(); $('#toast').hidden = true; }
});

/* ---------------------------------------------------------------- Global keys and chrome */

document.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  const inEditor = e.target.closest && e.target.closest('[data-edit]');
  const inInput = e.target.closest && e.target.closest('input, textarea');

  if (e.key === 'Escape') {
    if (popState) { closePop(); e.preventDefault(); return; }
    if (!sel) return;
    e.preventDefault();
    if (sel.type === 'block' && sel.mode === 'write') startDesigning(sel.id);
    else if (sel.type === 'block') { const f = findBlock(sel.id); setSel(f ? { type: 'section', id: f.sec.id } : null); }
    else setSel(null);
    return;
  }
  if (inInput) return;
  if (mod && e.key.toLowerCase() === 'z' && !inEditor) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && e.key.toLowerCase() === 'y' && !inEditor) { e.preventDefault(); redo(); return; }
  if (inEditor || !sel) return;

  if (sel.type === 'block') {
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteBlock(sel.id); }
    else if (e.key === 'Enter') { e.preventDefault(); const f = findBlock(sel.id); if (f && isWritable(f.b)) startWriting(sel.id, f.b.name === 'core/buttons' ? 'all' : 'end'); }
    else if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); moveBlock(sel.id, -1); }
    else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); moveBlock(sel.id, 1); }
  } else if (sel.type === 'section') {
    if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); moveSection(sel.id, -1); }
    else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); moveSection(sel.id, 1); }
  }
});

$('#undo').addEventListener('mousedown', (e) => e.preventDefault());
$('#redo').addEventListener('mousedown', (e) => e.preventDefault());
$('#undo').addEventListener('click', undo);
$('#redo').addEventListener('click', redo);
$('#reset').addEventListener('click', () => {
  flushText();
  history.push(snapshot());
  state.sections = startingPage();
  state.site = { colours: {} };
  sel = null;
  afterTimeTravel();
  toast('Page reset');
});
$('#show-blocks').addEventListener('change', (e) => {
  document.body.classList.toggle('show-blocks', e.target.checked);
  positionToolbar();
});

addEventListener('scroll', () => { positionToolbar(); if (!drag) hideHandle(); }, { passive: true });
addEventListener('resize', () => positionToolbar());

render();
renderToolbar();
updateBar();
textBefore = snapshot();

// For poking at it from the console.
window.escher = { state, PRESETS, get sel() { return sel; } };
})();
