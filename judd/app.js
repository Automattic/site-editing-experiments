'use strict';
/*
 * Judd: making a website from first principles.
 *
 * The site is a model of the thing it's about (a pottery studio: its facts,
 * classes, shop and news), pages are views over that model, and the look is a
 * handful of taste dials. Everything you can do by hand you can also say in the
 * command bar, and both change the same model. See README.md.
 */

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => structuredClone(o);
const uid = p => p + Math.random().toString(36).slice(2, 8);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const pad2 = n => String(n).padStart(2, '0');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const listJoin = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* ---------- Dates ---------- */

const TODAY = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); })();
const isoDay = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDay = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const daysFrom = n => isoDay(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + n));
const isPast = s => parseDay(s) < TODAY;
const fmtDate = s => parseDay(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtLong = s => parseDay(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtMonthYear = s => parseDay(s).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const MONTH_NAME = TODAY.toLocaleDateString('en-GB', { month: 'long' });
function fmtTime(t) {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return m ? `${h}.${pad2(m)}${ap}` : `${h}${ap}`;
}

const SEASONS = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
const NOW_SEASON = SEASONS[TODAY.getMonth()];
const NEXT_SEASON = SEASONS[(TODAY.getMonth() + 3) % 12];
const OFF_SEASONS = ['winter', 'spring', 'summer', 'autumn'].filter(s => s !== NOW_SEASON && s !== NEXT_SEASON);
// The sample news mentions a season that's well out of date, whenever you open this.
const STALE_SEASON = NOW_SEASON === 'summer' || NOW_SEASON === 'spring' ? 'winter' : 'summer';

/* ---------- Pictures ---------- */

const HOLLOWELL = ['hero-wheel.jpg', 'studio-hands.jpg'];
const imgSrc = f => (HOLLOWELL.includes(f) || f.startsWith('p-') ? '../albers/images/hollowell/' : '../albers/images/') + f;
const PICS = {
  place: ['hero-wheel.jpg', 'studio-hands.jpg', 'throwing.jpg', 'wheel-studio.jpg', 'shelves.jpg', 'mugs-rack.jpg', 'bowls.jpg', 'bowls-white.jpg'],
  piece: ['p-tea-bowl.jpg', 'p-everyday-mug.jpg', 'p-speckled-cups.jpg', 'p-supper-plate.jpg', 'p-poppy-bottle.jpg', 'p-leaf-cup.jpg', 'p-latte-cup.jpg', 'p-espresso-cups.jpg', 'bowls-white.jpg', 'bowls.jpg', 'mugs-rack.jpg'],
};

/* ================================================================== */
/* The model                                                           */
/* ================================================================== */

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAME = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const DAY_LONG = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

const FACTS = {
  name: 'Studio name',
  tagline: 'Tagline',
  about: 'About',
  address: 'Address',
  phone: 'Phone',
  email: 'Email',
  hours: 'Opening hours',
};

const COLL = {
  classes: { one: 'class', many: 'Classes', pics: 'place' },
  pieces: { one: 'piece', many: 'Shop', pics: 'piece' },
  news: { one: 'news post', many: 'News' },
};

function sampleDoc() {
  return {
    site: {
      name: 'Saltmarsh Pottery',
      tagline: 'Stoneware made by hand, and classes on the wheel',
      about: 'We’re two potters in a converted boat shed by the harbour. Everything in the shop is thrown, trimmed and glazed here, and most weekends we teach.',
      address: '[Unit 4, Harbour Yard, Town, AB1 2CD]',
      phone: '[01234 567890]',
      email: '[hello@example.com]',
      hours: { mon: null, tue: ['10:00', '17:00'], wed: ['10:00', '17:00'], thu: ['10:00', '17:00'], fri: ['10:00', '17:00'], sat: ['10:00', '17:00'], sun: ['11:00', '16:00'] },
      hoursChecked: daysFrom(-240),
      holiday: '',
    },
    collections: {
      classes: [
        { id: 'c1', title: 'Taster session', date: daysFrom(-9), time: '10:00', price: 45, spaces: 6, image: 'throwing.jpg', blurb: 'Two hours on the wheel. Make a bowl or a cup, and we’ll glaze and fire it for you.' },
        { id: 'c2', title: 'Six-week beginners', date: daysFrom(-2), time: '18:30', price: 240, spaces: 8, image: 'wheel-studio.jpg', blurb: 'One evening a week for six weeks: centring, throwing, trimming and glazing.' },
        { id: 'c3', title: 'Taster session', date: daysFrom(4), time: '10:00', price: 45, spaces: 6, image: 'studio-hands.jpg', blurb: 'Two hours on the wheel. Make a bowl or a cup, and we’ll glaze and fire it for you.' },
        { id: 'c4', title: 'Glazing workshop', date: daysFrom(17), time: '10:30', price: 60, spaces: 6, image: 'bowls.jpg', blurb: 'Bring pots you’ve made with us and spend a morning on dipping, pouring and layering glazes.' },
      ],
      pieces: [
        { id: 'p1', title: 'Tea bowl', price: 38, status: 'available', image: 'p-tea-bowl.jpg' },
        { id: 'p2', title: 'Everyday mug', price: 24, status: 'available', image: 'p-everyday-mug.jpg' },
        { id: 'p3', title: 'Speckled cups, pair', price: 42, status: 'sold', image: 'p-speckled-cups.jpg' },
        { id: 'p4', title: 'Supper plate', price: 30, status: 'available', image: 'p-supper-plate.jpg' },
        { id: 'p5', title: 'Poppy bottle', price: 55, status: 'sold', image: 'p-poppy-bottle.jpg' },
        { id: 'p6', title: 'Leaf cup', price: 22, status: 'available', image: 'p-leaf-cup.jpg' },
        { id: 'p7', title: 'Latte cup', price: 26, status: 'available', image: 'p-latte-cup.jpg' },
        { id: 'p8', title: 'Espresso cups, set of four', price: 48, status: 'available', image: 'p-espresso-cups.jpg' },
      ],
      news: [
        { id: 'n2', title: 'Kiln number two has arrived', date: daysFrom(-20), body: 'It’s twice the size of the old one, so firings are quicker and classes get their pots back sooner.' },
        { id: 'n1', title: `New ${STALE_SEASON} glazes`, date: daysFrom(-150), body: `Two new glazes for ${STALE_SEASON}: a sea-glass green and a speckled oat. Both are food-safe, and both look best on the tea bowls.` },
      ],
    },
    pages: [
      {
        id: 'home', title: 'Home', sections: [
          { id: 's-hero', type: 'hero', heading: 'Pots for every day, made by hand', image: 'hero-wheel.jpg', button: { label: 'Book a class', page: 'classes' } },
          { id: 's-up', type: 'upcoming', heading: 'Coming up in the studio', count: 3, past: false },
          { id: 's-shop', type: 'pieces', heading: 'From the shop', count: 4, showSold: true },
          { id: 's-about', type: 'about', heading: 'A small studio by the harbour', image: 'studio-hands.jpg' },
          { id: 's-visit', type: 'visit', heading: 'Come and see us' },
        ],
      },
      {
        id: 'classes', title: 'Classes', sections: [
          { id: 's-ch', type: 'pagehead', heading: 'Classes', text: 'Small groups, all materials included, and we fire everything you make.' },
          { id: 's-call', type: 'upcoming', heading: 'All classes', count: 0, past: true },
          { id: 's-ccta', type: 'cta', heading: 'Booking a group?', text: 'Birthdays, team days and hen parties: we’ll put on a private session for up to eight.', button: { label: 'Get in touch', page: 'visit' } },
        ],
      },
      {
        id: 'shop', title: 'Shop', sections: [
          { id: 's-sh', type: 'pagehead', heading: 'Shop', text: 'Everything is made here in small batches. Collect it from the studio, or we’ll post it to you.' },
          { id: 's-sall', type: 'pieces', heading: 'Everything in the shop', count: 0, showSold: true },
        ],
      },
      {
        id: 'news', title: 'News', sections: [
          { id: 's-nh', type: 'pagehead', heading: 'News', text: 'What’s new in the studio.' },
          { id: 's-nall', type: 'news', heading: '', count: 0 },
        ],
      },
      {
        id: 'visit', title: 'Visit', sections: [
          { id: 's-vh', type: 'pagehead', heading: 'Visit', text: 'Come and watch us work, or pick up something for the table. Parking is on the harbour front.' },
          { id: 's-vv', type: 'visit', heading: 'Opening hours and how to find us' },
          { id: 's-vn', type: 'newsletter', heading: 'Hear about new classes first', text: 'One email a month, when the kiln’s been opened and the new classes are up.' },
        ],
      },
    ],
    shared: { footerNote: 'Made by hand in [Town]. Visitors welcome whenever the door’s open.' },
    taste: { space: 0.45, mood: 0.4, type: 'modern', hue: 'clay' },
    dismissed: [],
  };
}

/* ---------- Model queries ---------- */

const pageOf = (d, id) => d.pages.find(p => p.id === id) || d.pages[0];
function findSec(d, id) {
  for (const p of d.pages) { const s = p.sections.find(x => x.id === id); if (s) return { s, p }; }
  return {};
}
const itemOf = (d, coll, id) => d.collections[coll].find(i => i.id === id);
const sharedVal = (d, page, key) => (page.overrides && key in page.overrides) ? page.overrides[key] : d.shared[key];
const hasOverride = (page, key) => !!(page.overrides && key in page.overrides);
const upcomingClasses = d => d.collections.classes.filter(c => !c.archived && !isPast(c.date)).sort((a, b) => a.date.localeCompare(b.date));
const sortedNews = d => [...d.collections.news].sort((a, b) => b.date.localeCompare(a.date));
function sortClasses(list) {
  const up = list.filter(c => !isPast(c.date)).sort((a, b) => a.date.localeCompare(b.date));
  const past = list.filter(c => isPast(c.date)).sort((a, b) => b.date.localeCompare(a.date));
  return up.concat(past);
}

function getVal(d, path, page) {
  const [a, b, ...rest] = path.split('.');
  if (a === 'site') return d.site[b];
  if (a === 'shared') return sharedVal(d, page, b);
  if (a === 'sec') { let o = findSec(d, b).s; for (const k of rest) o = o?.[k]; return o; }
  return '';
}
function setVal(d, path, v, { pageId, scope } = {}) {
  const [a, b, ...rest] = path.split('.');
  if (a === 'site') { d.site[b] = v; return; }
  if (a === 'shared') {
    const page = pageOf(d, pageId);
    if (scope === 'page') { page.overrides = page.overrides || {}; page.overrides[b] = v; }
    else { d.shared[b] = v; if (page.overrides) delete page.overrides[b]; }
    return;
  }
  if (a === 'sec') {
    let o = findSec(d, b).s;
    for (const k of rest.slice(0, -1)) o = o[k];
    o[rest[rest.length - 1]] = v;
  }
}

function hourLines(h) {
  const same = (x, y) => (!x && !y) || (x && y && x[0] === y[0] && x[1] === y[1]);
  const lines = [];
  let i = 0;
  while (i < 7) {
    const v = h[DAYS[i]];
    let j = i;
    while (j + 1 < 7 && same(h[DAYS[j + 1]], v)) j++;
    lines.push({ days: i === j ? DAY_NAME[DAYS[i]] : `${DAY_NAME[DAYS[i]]}–${DAY_NAME[DAYS[j]]}`, time: v ? `${fmtTime(v[0])}–${fmtTime(v[1])}` : 'Closed' });
    i = j + 1;
  }
  return lines;
}
const siteSlug = d => d.site.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.example';

/* ================================================================== */
/* Taste: a few dials, turned into a design system                     */
/* ================================================================== */

const HUES = {
  clay: { h: 16, name: 'Clay' },
  ochre: { h: 38, name: 'Ochre' },
  sage: { h: 140, name: 'Sage' },
  sea: { h: 198, name: 'Sea' },
  plum: { h: 330, name: 'Plum' },
  ink: { h: 222, name: 'Ink', mono: true },
};
const TYPESETS = {
  modern: { name: 'Modern', note: 'Clean and practical', head: "'Bricolage Grotesque', system-ui, sans-serif", body: "'Instrument Sans', system-ui, sans-serif", w: [600, 700] },
  classic: { name: 'Classic', note: 'Quiet and bookish', head: "'Newsreader', Georgia, serif", body: "'Newsreader', Georgia, serif", w: [400, 500] },
  friendly: { name: 'Friendly', note: 'Soft and welcoming', head: "'Fraunces', Georgia, serif", body: "'Instrument Sans', system-ui, sans-serif", w: [500, 700] },
};
const PRESETS = [
  { id: 'workshop', name: 'Workshop', note: 'Practical and warm', taste: { space: 0.35, mood: 0.5, type: 'modern', hue: 'clay' } },
  { id: 'gallery', name: 'Gallery', note: 'Quiet, lots of white space', taste: { space: 0.9, mood: 0.1, type: 'classic', hue: 'ink' } },
  { id: 'cafe', name: 'Corner café', note: 'Bright and welcoming', taste: { space: 0.5, mood: 0.85, type: 'friendly', hue: 'ochre' } },
  { id: 'journal', name: 'Journal', note: 'Calm and bookish', taste: { space: 0.6, mood: 0.25, type: 'classic', hue: 'sage' } },
  { id: 'seaside', name: 'Seaside', note: 'Fresh and airy', taste: { space: 0.75, mood: 0.5, type: 'modern', hue: 'sea' } },
  { id: 'market', name: 'Market stall', note: 'Loud and lively', taste: { space: 0.2, mood: 1, type: 'friendly', hue: 'plum' } },
];

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}
const lum = ([r, g, b]) => { const c = v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

function tokens(t) {
  const hue = HUES[t.hue] || HUES.clay;
  const set = TYPESETS[t.type] || TYPESETS.modern;
  const h = hue.h, s = t.space, m = t.mood;
  const sat = hue.mono ? 14 + m * 16 : 30 + m * 45;
  const accL = (h >= 30 && h <= 160) ? 33 : 40;
  const accent = [h, sat, accL];
  const ink = [h, 20, 13];
  const onAccent = contrast(hslToRgb(...accent), [1, 1, 1]) >= 4.5 ? '#fff' : `hsl(${ink[0]} ${ink[1]}% ${ink[2]}%)`;
  const ratio = 1.16 + m * 0.2;
  const base = 17 + s;
  return {
    '--bg': `hsl(${h} ${hue.mono ? 8 : 22 + m * 22}% ${97.5 - m * 1.5}%)`,
    '--tint': `hsl(${h} ${hue.mono ? 10 : 28 + m * 26}% ${92.5 - m * 3}%)`,
    '--ink': `hsl(${ink[0]} ${ink[1]}% ${ink[2]}%)`,
    '--soft': `hsl(${h} 9% 36%)`,
    '--line': `hsl(${h} 16% 84%)`,
    '--accent': `hsl(${accent[0]} ${accent[1]}% ${accent[2]}%)`,
    '--on-accent': onAccent,
    '--dark': `hsl(${h} ${hue.mono ? 16 : 24}% 14%)`,
    '--on-dark': `hsl(${h} 25% 95%)`,
    '--on-dark-soft': `hsl(${h} 12% 74%)`,
    '--f-head': set.head,
    '--f-body': set.body,
    '--head-w': String(set.w[m < 0.5 ? 0 : 1]),
    '--h1': `${Math.round(base * ratio ** 4.4)}px`,
    '--h2': `${Math.round(base * ratio ** 2.6)}px`,
    '--h3': `${Math.round(base * ratio ** 1.1)}px`,
    '--body': `${base}px`,
    '--lh': (1.45 + s * 0.2).toFixed(2),
    '--pad': `${Math.round(44 + s * 104)}px`,
    '--gap': `${Math.round(14 + s * 26)}px`,
    '--radius': `${Math.round(2 + m * 20)}px`,
    '--radius-btn': m > 0.7 ? '999px' : `${Math.round(2 + m * 10)}px`,
    '--track': m < 0.45 ? '.14em' : '.04em',
    '--label-case': m < 0.65 ? 'uppercase' : 'none',
  };
}
function applyTaste(el, t) {
  const tk = tokens(t);
  for (const [k, v] of Object.entries(tk)) el.style.setProperty(k, v);
}
const tasteWords = t => [`${t.space < 0.34 ? 'Snug' : t.space > 0.66 ? 'Airy' : 'Comfortable'}`, `${t.mood < 0.34 ? 'calm' : t.mood > 0.66 ? 'lively' : 'easy-going'}`, `${(TYPESETS[t.type] || TYPESETS.modern).name.toLowerCase()} type`, `${(HUES[t.hue] || HUES.clay).name.toLowerCase()}`].join(', ');

/* ================================================================== */
/* App state, history and drafts                                       */
/* ================================================================== */

const app = {
  live: sampleDoc(),
  draft: null,
  past: [],
  future: [],
  pageId: 'home',
  stage: 'site',
  panel: 'content',
  plumbing: false,
  preview: false,
  viewing: null,
  scope: 'all',
  introClosed: false,
};
const doc = () => app.draft || app.live;
const snapshot = () => ({ live: clone(app.live), draft: app.draft ? clone(app.draft) : null });
const curPage = () => pageOf(doc(), app.pageId);
const canEdit = () => !app.preview && app.viewing == null && app.stage === 'site';

function commit(label, fn, opt = {}) {
  app.past.push({ label, at: Date.now(), snap: snapshot() });
  if (app.past.length > 300) app.past.shift();
  app.future = [];
  app.viewing = null;
  fn(doc());
  if (!pageOf(doc(), app.pageId) || !doc().pages.some(p => p.id === app.pageId)) app.pageId = doc().pages[0].id;
  render(opt);
}
function restore(s) {
  app.live = clone(s.live);
  app.draft = s.draft ? clone(s.draft) : null;
  if (!doc().pages.some(p => p.id === app.pageId)) app.pageId = doc().pages[0].id;
}
function undo() {
  const e = app.past.pop();
  if (!e) return;
  app.future.push({ label: e.label, at: e.at, snap: snapshot() });
  restore(e.snap);
  app.viewing = null;
  closePop();
  render();
  receipt(`Undid: ${e.label}`, { redo: true });
}
function redo() {
  const e = app.future.pop();
  if (!e) return;
  app.past.push({ label: e.label, at: e.at, snap: snapshot() });
  restore(e.snap);
  app.viewing = null;
  closePop();
  render();
  receipt(`Redid: ${e.label}`, { undo: true });
}
// The site as it was straight after history entry i (or at the very start, for -1).
function stateAt(i) {
  if (i < 0) return app.past[0].snap;
  return i + 1 < app.past.length ? app.past[i + 1].snap : snapshot();
}
const viewDoc = () => { if (app.viewing != null && app.past.length) { const s = stateAt(app.viewing); return s.draft || s.live; } return doc(); };

/* ================================================================== */
/* Rendering the site                                                  */
/* ================================================================== */

let EDIT = false;

function T(path, val, tag = 'span', cls = '') {
  const kind = path.startsWith('site.') ? 'fact' : path.startsWith('shared.') ? 'shared' : 'sec';
  return `<${tag} class="${cls}" data-path="${path}" data-kind="${kind}"${EDIT ? ' data-edit' : ''}>${esc(val)}</${tag}>`;
}
function rHours(d, cls = '') {
  return `<dl class="s-hours ${cls}" data-fact="hours" title="${EDIT ? 'Your opening hours. Click to change them.' : ''}">${hourLines(d.site.hours).map(l => `<div><dt>${l.days}</dt><dd>${l.time}</dd></div>`).join('')}${d.site.holiday ? `<p class="s-holiday">${esc(d.site.holiday)}</p>` : ''}</dl>`;
}
const head = (s, tag = 'h2', cls = 's-h2') => s.heading || EDIT ? T(`sec.${s.id}.heading`, s.heading, tag, cls) : '';
const btn = s => `<a class="s-btn" href="#" data-goto="${s.button.page}">${T(`sec.${s.id}.button.label`, s.button.label)}</a>`;
const pic = s => `<img src="${imgSrc(s.image)}" alt=""${EDIT ? ` data-pic="${s.id}" title="Click to change the picture"` : ''}>`;
const ghost = (coll, label) => EDIT ? `<button class="s-ghost" data-add="${coll}" type="button"><span>+</span>${label}</button>` : '';

function rClass(c) {
  const past = isPast(c.date);
  return `<article class="s-card s-class${past ? ' is-past' : ''}" data-item="classes:${c.id}">
    <div class="s-card-img"><img src="${imgSrc(c.image)}" alt=""></div>
    <div class="s-card-body">
      <p class="s-label">${past ? 'Already happened · ' : ''}${fmtDate(c.date)} · ${fmtTime(c.time)}</p>
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.blurb)}</p>
      <p class="s-meta"><b>£${esc(c.price)}</b> · ${plural(Number(c.spaces) || 0, 'space', 'spaces')}</p>
    </div>
  </article>`;
}
function rPiece(p) {
  const sold = p.status === 'sold';
  return `<article class="s-card s-piece${sold ? ' is-sold' : ''}" data-item="pieces:${p.id}">
    <div class="s-card-img"><img src="${imgSrc(p.image)}" alt="">${sold ? '<span class="s-badge">Sold</span>' : ''}</div>
    <div class="s-card-body s-piece-body"><h3>${esc(p.title)}</h3><span>£${esc(p.price)}</span></div>
  </article>`;
}

const TYPES = {
  hero: {
    name: 'Opening', about: 'A big welcome with a picture and a button', tone: 'plain',
    make: () => ({ heading: 'A big, friendly welcome', text: 'A sentence or two about what you do.', image: 'wheel-studio.jpg', button: { label: 'Book a class', page: 'classes' } }),
    render: (d, s) => {
      const lead = s.text == null ? T('site.tagline', d.site.tagline, 'p', 's-lead') : T(`sec.${s.id}.text`, s.text, 'p', 's-lead');
      return `<div class="s-hero-grid"><div class="s-hero-text">${T(`sec.${s.id}.heading`, s.heading, 'h1', 's-h1')}${lead}${btn(s)}</div><div class="s-hero-img">${pic(s)}</div></div>`;
    },
  },
  pagehead: {
    name: 'Page title', about: 'A title and a line of introduction', tone: 'plain',
    make: () => ({ heading: 'New page', text: 'A line about what’s on this page.' }),
    render: (d, s) => `${T(`sec.${s.id}.heading`, s.heading, 'h1', 's-h1')}${s.text || EDIT ? T(`sec.${s.id}.text`, s.text, 'p', 's-lead') : ''}`,
  },
  upcoming: {
    name: 'Coming up', about: 'Shows your classes, soonest first', view: 'classes', tone: 'tint',
    make: () => ({ heading: 'Coming up', count: 3, past: false }),
    render: (d, s) => {
      const all = sortClasses(d.collections.classes.filter(c => !c.archived && (s.past || !isPast(c.date))));
      const list = s.count ? all.slice(0, s.count) : all;
      const room = !s.count || list.length < s.count;
      const empty = !list.length && !EDIT ? '<p class="s-empty">No classes are booked in right now. Check back soon.</p>' : '';
      return `${head(s)}<div class="s-grid">${list.map(rClass).join('')}${room ? ghost('classes', 'Add a class') : ''}</div>${empty}`;
    },
  },
  pieces: {
    name: 'Shop', about: 'Shows pieces from your shop', view: 'pieces', tone: 'plain',
    make: () => ({ heading: 'From the shop', count: 4, showSold: true }),
    render: (d, s) => {
      const all = d.collections.pieces.filter(p => s.showSold || p.status !== 'sold');
      const list = s.count ? all.slice(0, s.count) : all;
      return `${head(s)}<div class="s-grid s-grid-shop">${list.map(rPiece).join('')}${!s.count ? ghost('pieces', 'Add a piece') : ''}</div>`;
    },
  },
  news: {
    name: 'News', about: 'Shows your latest news', view: 'news', tone: 'plain',
    make: () => ({ heading: 'News', count: 3 }),
    render: (d, s) => {
      const all = sortedNews(d);
      const list = s.count ? all.slice(0, s.count) : all;
      return `${head(s)}<div class="s-news">${ghost('news', 'Write some news')}${list.map(n => `<article class="s-news-item" data-item="news:${n.id}"><p class="s-label">${fmtDate(n.date)}</p><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></article>`).join('')}</div>`;
    },
  },
  about: {
    name: 'About', about: 'Your story, from your studio details', tone: 'plain',
    make: () => ({ heading: 'About us', image: 'studio-hands.jpg' }),
    render: (d, s) => `<div class="s-about-grid"><div class="s-about-img">${pic(s)}</div><div class="s-about-text">${head(s)}${T('site.about', d.site.about, 'p', 's-body-lg')}</div></div>`,
  },
  visit: {
    name: 'Visit', about: 'Hours, address and contact, from your studio details', tone: 'dark',
    make: () => ({ heading: 'Come and see us' }),
    render: (d, s) => `${head(s)}<div class="s-visit-grid">
      <div><p class="s-label">Opening hours</p>${rHours(d)}</div>
      <div><p class="s-label">Where</p>${T('site.address', d.site.address, 'p')}</div>
      <div><p class="s-label">Get in touch</p>${T('site.phone', d.site.phone, 'p')}${T('site.email', d.site.email, 'p')}</div>
    </div>`,
  },
  cta: {
    name: 'Booking', about: 'A clear invitation to book', tone: 'accent',
    make: () => ({ heading: 'Come and make something', text: 'Classes are small, and you don’t need any experience.', button: { label: 'See the classes', page: 'classes' } }),
    render: (d, s) => `<div class="s-center">${head(s)}${T(`sec.${s.id}.text`, s.text, 'p', 's-lead')}${btn(s)}</div>`,
  },
  newsletter: {
    name: 'Newsletter sign-up', about: 'Collect emails for your newsletter', tone: 'tint',
    make: () => ({ heading: 'Hear about new classes first', text: 'One email a month. Nothing else.' }),
    render: (d, s) => `<div class="s-center">${head(s)}${T(`sec.${s.id}.text`, s.text, 'p', 's-lead')}<form class="s-form" onsubmit="return false"><input type="email" placeholder="Your email address" tabindex="-1" aria-label="Email"><button class="s-btn" type="button">Sign up</button></form></div>`,
  },
  quote: {
    name: 'Quote', about: 'A few words from someone, in their own words', tone: 'plain',
    make: () => ({ text: '[A few words from one of your students]', cite: '[Their name]' }),
    render: (d, s) => `<blockquote class="s-quote">${T(`sec.${s.id}.text`, s.text, 'p')}<cite>${T(`sec.${s.id}.cite`, s.cite)}</cite></blockquote>`,
  },
};
const ADDABLE = ['hero', 'upcoming', 'pieces', 'news', 'about', 'visit', 'cta', 'newsletter', 'quote', 'pagehead'];

function plumbLabel(s) {
  switch (s.type) {
    case 'upcoming': return `View of your classes · ${s.count ? `next ${s.count}` : 'all of them'}${s.past ? ', including past ones' : ' coming up'}`;
    case 'pieces': return `View of your shop · ${s.count ? `first ${s.count}` : 'everything'}${s.showSold ? ', sold pieces shown' : ', sold pieces hidden'}`;
    case 'news': return `View of your news · ${s.count ? `latest ${s.count}` : 'all of it'}`;
    case 'visit': return 'View of your hours, address and contact details';
    case 'about': return 'Section · the text is your About';
    case 'hero': return s.text == null ? 'Section · the line under the heading is your tagline' : 'Section · on this page only';
    default: return 'Section · on this page only';
  }
}
function secbar(s, i, n) {
  const t = TYPES[s.type];
  return `<div class="secbar" contenteditable="false">
    <span class="sb-name">${t.name}${t.view ? ` <em>shows your ${t.view === 'pieces' ? 'shop' : t.view}</em>` : ''}</span>
    <button type="button" data-sa="settings">Settings</button>
    <button type="button" data-sa="up" title="Move up"${i === 0 ? ' disabled' : ''}>↑</button>
    <button type="button" data-sa="down" title="Move down"${i === n - 1 ? ' disabled' : ''}>↓</button>
    <button type="button" data-sa="remove" title="Remove this section">Remove</button>
  </div>`;
}

function renderPage(d, page, { edit = false } = {}) {
  const was = EDIT;
  EDIT = edit;
  const n = page.sections.length;
  const ov = hasOverride(page, 'footerNote');
  const html = `
  <header class="s-header" data-label="Shared · on every page · the menu is made from your pages">
    <div class="s-wrap s-header-in">
      ${T('site.name', d.site.name, 'span', 's-logo')}
      <nav class="s-nav">${d.pages.map(p => `<a href="#" data-goto="${p.id}"${p.id === page.id ? ' class="on" aria-current="page"' : ''}>${esc(p.title)}</a>`).join('')}</nav>
    </div>
  </header>
  ${page.sections.map((s, i) => `
  <section class="s-sec s-${s.type} tone-${s.tone || TYPES[s.type].tone}" data-sec="${s.id}" data-label="${esc(plumbLabel(s))}">
    ${EDIT ? secbar(s, i, n) : ''}
    <div class="s-wrap">${TYPES[s.type].render(d, s)}</div>
  </section>`).join('')}
  ${EDIT ? '<div class="s-addsec"><button type="button" data-addsec>+ Add a section</button></div>' : ''}
  <footer class="s-footer" data-label="Shared · on every page${ov ? ' · this page has its own note' : ''}">
    <div class="s-wrap s-footer-grid">
      <div>${T('site.name', d.site.name, 'p', 's-foot-name')}${T('site.tagline', d.site.tagline, 'p', 's-foot-soft')}${T('shared.footerNote', sharedVal(d, page, 'footerNote'), 'p', 's-foot-soft')}</div>
      <div><p class="s-label">Opening hours</p>${rHours(d, 's-hours-sm')}</div>
      <div><p class="s-label">Find us</p>${T('site.address', d.site.address, 'p')}${T('site.phone', d.site.phone, 'p')}${T('site.email', d.site.email, 'p')}</div>
    </div>
  </footer>`;
  EDIT = was;
  return html;
}

/* ================================================================== */
/* Everywhere: the same model, rendered for other places               */
/* ================================================================== */

function openNow(d) {
  const now = new Date();
  const key = DAYS[(now.getDay() + 6) % 7];
  const v = d.site.hours[key];
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  if (v && mins >= toMin(v[0]) && mins < toMin(v[1])) return { open: true, text: `Open now · closes ${fmtTime(v[1])}` };
  if (v && mins < toMin(v[0])) return { open: false, text: `Closed now · opens ${fmtTime(v[0])} today` };
  for (let i = 1; i <= 7; i++) {
    const k = DAYS[(now.getDay() + 6 + i) % 7];
    if (d.site.hours[k]) return { open: false, text: `Closed now · opens ${fmtTime(d.site.hours[k][0])} ${i === 1 ? 'tomorrow' : DAY_LONG[k]}` };
  }
  return { open: false, text: 'Closed' };
}

function agentData(d) {
  const groups = {};
  DAYS.forEach(k => { const v = d.site.hours[k]; if (v) { const key = v.join('-'); (groups[key] = groups[key] || []).push(DAY_LONG[k]); } });
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: d.site.name,
    description: d.site.tagline,
    url: `https://${siteSlug(d)}`,
    address: d.site.address,
    telephone: d.site.phone,
    email: d.site.email,
    openingHoursSpecification: Object.entries(groups).map(([k, days]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens: k.split('-')[0], closes: k.split('-')[1] })),
    ...(d.site.holiday ? { specialOpeningHoursNote: d.site.holiday } : {}),
    event: upcomingClasses(d).map(c => ({
      '@type': 'EducationEvent', name: c.title, startDate: `${c.date}T${c.time}`, description: c.blurb,
      maximumAttendeeCapacity: Number(c.spaces), offers: { '@type': 'Offer', price: Number(c.price), priceCurrency: 'GBP' },
    })),
    makesOffer: d.collections.pieces.map(p => ({
      '@type': 'Offer', itemOffered: { '@type': 'Product', name: p.title }, price: Number(p.price), priceCurrency: 'GBP',
      availability: p.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    })),
  };
}
function agentAnswers(d) {
  const closed = DAYS.filter(k => !d.site.hours[k]).map(k => DAY_LONG[k] + 's');
  const next = upcomingClasses(d)[0];
  const avail = d.collections.pieces.filter(p => p.status !== 'sold');
  return [
    [`Is ${d.site.name} open on Mondays?`, d.site.hours.mon ? `Yes, ${fmtTime(d.site.hours.mon[0])} to ${fmtTime(d.site.hours.mon[1])}.` : 'No, it’s closed on Mondays.'],
    ['When’s the next class?', next ? `${next.title}, ${fmtLong(next.date)} at ${fmtTime(next.time)}. It’s £${next.price} and there are ${next.spaces} spaces.` : 'There aren’t any classes booked in at the moment.'],
    ['Can I buy a mug there?', avail.some(p => /mug|cup/i.test(p.title)) ? `Yes: ${listJoin(avail.filter(p => /mug|cup/i.test(p.title)).map(p => `${p.title.toLowerCase()} (£${p.price})`))}.` : 'Not right now; nothing like that is in stock.'],
    ['Are they ever closed?', closed.length ? `On ${listJoin(closed)}.${d.site.holiday ? ' ' + d.site.holiday + '.' : ''}` : 'They’re open every day.'],
  ];
}

const OUT = {
  newsletter: {
    name: 'Newsletter', short: 'newsletter', uses: 'your news, classes, shop, hours and address',
    about: 'A monthly email, drafted from your latest news, classes and shop.',
    render(d) {
      const up = upcomingClasses(d).slice(0, 3);
      const n = sortedNews(d)[0];
      const pcs = d.collections.pieces.filter(p => p.status !== 'sold').slice(0, 3);
      return `<div class="mail">
        <div class="mail-head">${T('site.name', d.site.name, 'strong')}<span>${MONTH_NAME} news</span></div>
        ${n ? `<div class="mail-sec" data-item="news:${n.id}"><p class="s-label">${fmtDate(n.date)}</p><h2 class="s-h2">${esc(n.title)}</h2><p>${esc(n.body)}</p></div>` : ''}
        <div class="mail-sec"><h3>Coming up</h3>${up.map(c => `<div class="mail-row" data-item="classes:${c.id}"><div><b>${esc(c.title)}</b><span>${fmtLong(c.date)}, ${fmtTime(c.time)} · £${esc(c.price)}</span></div><span class="s-btn">Book</span></div>`).join('') || '<p>No classes booked in yet.</p>'}</div>
        <div class="mail-sec"><h3>New in the shop</h3><div class="mail-pieces">${pcs.map(p => `<div data-item="pieces:${p.id}"><img src="${imgSrc(p.image)}" alt=""><span>${esc(p.title)} · £${esc(p.price)}</span></div>`).join('')}</div></div>
        <div class="mail-foot">${T('site.name', d.site.name, 'b')}<br>${T('site.address', d.site.address)}<br><span data-fact="hours">${hourLines(d.site.hours).map(l => `${l.days} ${l.time}`).join(' · ')}</span>${d.site.holiday ? `<br>${esc(d.site.holiday)}` : ''}</div>
      </div>`;
    },
  },
  social: {
    name: 'Social post', short: 'social post', uses: 'your next class and your studio name',
    about: 'A post for your next class, with a caption, ready to share.',
    render(d) {
      const c = upcomingClasses(d)[0];
      if (!c) return '<div class="social-empty">There’s no class coming up to post about. Add one and a post appears here.</div>';
      return `<div class="social" data-item="classes:${c.id}">
        <div class="social-card" style="background-image:url('${imgSrc(c.image)}')">
          <div class="social-in">${T('site.name', d.site.name, 'span', 'social-name')}<div><p class="social-date">${fmtLong(c.date)} · ${fmtTime(c.time)}</p><h2>${esc(c.title)}</h2><p class="social-book">£${esc(c.price)} · Book at ${esc(siteSlug(d))}</p></div></div>
        </div>
        <p class="social-caption"><b>${esc(siteSlug(d).replace('.example', ''))}</b> Next up in the studio: ${esc(c.title.toLowerCase())}, ${fmtLong(c.date)} at ${fmtTime(c.time)}. ${esc(c.blurb)} £${esc(c.price)}, ${plural(Number(c.spaces), 'space', 'spaces')}. Book through the link in our bio.</p>
      </div>`;
    },
  },
  listing: {
    name: 'Search listing', short: 'search listing', uses: 'your name, hours, address, phone and classes',
    about: 'What people see when they look you up on a map or a search engine. Your facts travel here; your look doesn’t.',
    render(d) {
      const o = openNow(d);
      return `<div class="listing">
        <div class="listing-map" aria-hidden="true"><span class="listing-pin"></span></div>
        <div class="listing-body">
          ${T('site.name', d.site.name, 'h2')}
          <p class="listing-cat">Pottery studio · Classes · Shop</p>
          <p class="listing-open ${o.open ? 'is-open' : ''}" data-fact="hours">${o.text}</p>
          <dl class="listing-facts">
            <div><dt>Address</dt><dd>${T('site.address', d.site.address)}</dd></div>
            <div><dt>Phone</dt><dd>${T('site.phone', d.site.phone)}</dd></div>
            <div><dt>Website</dt><dd>${esc(siteSlug(d))}</dd></div>
            <div><dt>Hours</dt><dd>${rHours(d, 'listing-hours')}</dd></div>
          </dl>
          <h3>Upcoming events</h3>
          ${upcomingClasses(d).slice(0, 3).map(c => `<div class="listing-event" data-item="classes:${c.id}"><span class="listing-when"><b>${parseDay(c.date).getDate()}</b>${parseDay(c.date).toLocaleDateString('en-GB', { month: 'short' })}</span><span><b>${esc(c.title)}</b><br>${fmtTime(c.time)} · £${esc(c.price)}</span></div>`).join('') || '<p>No upcoming events.</p>'}
        </div>
      </div>`;
    },
  },
  agents: {
    name: 'For AI agents', short: 'data for AI agents', uses: 'everything you’ve told it',
    about: 'Structured data, so assistants can answer questions about you and book on someone’s behalf.',
    render(d) {
      const json = JSON.stringify(agentData(d), null, 2);
      const markers = ['site.name', 'site.tagline', 'site.address', 'site.phone', 'site.email'].map(p => `<span hidden data-path="${p}"></span>`).join('') + '<span hidden data-fact="hours"></span>'
        + upcomingClasses(d).map(c => `<span hidden data-item="classes:${c.id}"></span>`).join('')
        + d.collections.pieces.map(p => `<span hidden data-item="pieces:${p.id}"></span>`).join('');
      return `<div class="agents">${markers}
        <h3>What an assistant can now answer</h3>
        <div class="agents-qa">${agentAnswers(d).map(([q, a]) => `<div><p class="q">${esc(q)}</p><p class="a">${esc(a)}</p></div>`).join('')}</div>
        <h3>What it reads <small>schema.org JSON-LD, published in your pages</small></h3>
        <pre class="agents-json">${esc(json)}</pre>
      </div>`;
    },
  },
};

/* Where does something show up? Renders every page and output and looks. */
function placesOf(d, needle) {
  const pages = d.pages.filter(p => renderPage(d, p).includes(needle)).map(p => p.title);
  const outs = Object.values(OUT).filter(o => o.render(d).includes(needle)).map(o => o.short);
  return { pages, outs, count: pages.length + outs.length };
}
function placesText(d, pl) {
  const parts = [];
  if (pl.pages.length) parts.push(pl.pages.length === d.pages.length && pl.pages.length > 2 ? 'every page' : `${listJoin(pl.pages)}`);
  if (pl.outs.length) parts.push(`your ${listJoin(pl.outs)}`);
  return parts.length ? parts.join(', and in ') : 'nowhere yet';
}
const factNeedle = key => key === 'hours' ? 'data-fact="hours"' : `data-path="site.${key}"`;

/* ================================================================== */
/* Render: stage, top bar, banner, panel                               */
/* ================================================================== */

function render(opt = {}) {
  const o = { site: true, panel: true, ...opt };
  const d = viewDoc();
  document.body.classList.toggle('editing', canEdit());
  document.body.classList.toggle('plumb', app.plumbing);
  document.body.classList.toggle('drafting', !!app.draft);
  applyTaste($('#site'), d.taste);
  if (o.site) renderStage(d);
  renderTop();
  renderBanner();
  if (o.panel) renderPanel();
  else updateTabs();
}

function renderStage(d) {
  const site = $('#site');
  if (app.stage === 'site') {
    site.className = 'site';
    site.innerHTML = renderPage(d, pageOf(d, app.pageId), { edit: canEdit() });
    if (canEdit()) $$('[data-edit]', site).forEach(el => { el.contentEditable = 'plaintext-only'; el.spellcheck = false; });
  } else {
    site.className = 'site out out-' + app.stage;
    EDIT = false;
    site.innerHTML = `<div class="out-in">${OUT[app.stage].render(d)}</div>`;
  }
}

function renderTop() {
  const d = doc();
  const sel = $('#page-select');
  sel.innerHTML = d.pages.map(p => `<option value="${p.id}"${p.id === app.pageId ? ' selected' : ''}>${esc(p.title)}</option>`).join('');
  sel.disabled = app.stage !== 'site';
  $('#undo').disabled = !app.past.length;
  $('#redo').disabled = !app.future.length;
  $('#undo').title = app.past.length ? `Undo: ${app.past[app.past.length - 1].label} (Ctrl+Z)` : 'Nothing to undo';
  $('#redo').title = app.future.length ? `Redo: ${app.future[app.future.length - 1].label} (Ctrl+Shift+Z)` : 'Nothing to redo';
  $('#plumb').checked = app.plumbing;
  $('#preview').checked = app.preview;
  $('#tb-draft').innerHTML = app.draft
    ? `<span class="draft-pill">Draft</span><span class="tb-muted">Visitors still see the live site</span>
       <button class="tb-btn" data-d="compare">Compare</button>
       <button class="tb-btn primary" data-d="publish">Publish</button>
       <button class="tb-btn" data-d="discard">Throw away</button>`
    : `<span class="live-pill"><i></i>Live</span><span class="tb-muted">Changes go live as you make them</span>
       <button class="tb-btn" data-d="start" title="Make a private copy of your whole site to experiment with">Try something…</button>`;
}

function renderBanner() {
  const b = $('#banner');
  if (app.viewing != null && app.past.length) {
    const label = app.viewing < 0 ? 'the very start' : `just after “${app.past[app.viewing].label}”`;
    b.hidden = false;
    b.className = 'banner banner-hist';
    b.innerHTML = `<span>You’re looking at your site as it was at ${esc(label)}. Nothing here is editable.</span><span class="spacer"></span><button data-b="bring">Bring this back</button><button data-b="now" class="primary">Back to now</button>`;
  } else if (app.stage !== 'site') {
    const o = OUT[app.stage];
    b.hidden = false;
    b.className = 'banner banner-out';
    b.innerHTML = `<span><b>${o.name}</b> · made from ${o.uses}. Change anything in Content, or on your pages, and it changes here too.</span><span class="spacer"></span><button data-b="site" class="primary">Back to the website</button>`;
  } else {
    b.hidden = true;
  }
}

/* ---------- Panel ---------- */

const TABS = [['content', 'Content'], ['look', 'Look'], ['todo', 'To do'], ['everywhere', 'Everywhere'], ['history', 'History']];
function tabsHtml() {
  const n = audit(doc()).length;
  return `<nav class="tabs" role="tablist">${TABS.map(([id, label]) => `<button role="tab" data-tab="${id}" aria-selected="${app.panel === id}">${label}${id === 'todo' && n ? `<span class="badge">${n}</span>` : ''}</button>`).join('')}</nav>`;
}
function updateTabs() {
  const t = $('#panel .tabs');
  if (t) t.outerHTML = tabsHtml();
}
function renderPanel() {
  const p = $('#panel');
  const scroll = p.querySelector('.pn-body')?.scrollTop || 0;
  const body = { content: panelContent, look: panelLook, todo: panelTodo, everywhere: panelEverywhere, history: panelHistory }[app.panel]();
  p.innerHTML = `${tabsHtml()}<div class="pn-body">${body}</div>`;
  p.querySelector('.pn-body').scrollTop = scroll;
}

const IDEAS = [
  ['Model the thing, not the page', 'Classes, pieces and news are wrjudd once. Add a class and it shows up on Home, Classes and everywhere else.', 'Add a class', 'idea-add'],
  ['Ask about scope while editing', 'Click the note in the footer, then choose every page or just this one.', 'Show me', 'idea-scope'],
  ['Taste, not properties', 'A few dials and feelings instead of pixels and padding.', 'Open Look', 'idea-look'],
  ['Say it, or do it', 'Type what you want below; it changes the same things your hands do.', 'Try a sentence', 'idea-say'],
  ['The hundredth visit', 'Judd notices what’s gone stale and offers to fix it.', 'Open To do', 'idea-todo'],
  ['Safe to experiment', 'Try changes in a private draft of the whole site, compare, then publish or bin it.', 'Try something', 'idea-draft'],
  ['One source, many places', 'The same content makes your newsletter, a post, your search listing and data for AI agents.', 'Open Everywhere', 'idea-out'],
];

function panelContent() {
  const d = doc();
  const intro = app.introClosed ? '' : `<div class="intro">
    <div class="intro-head"><b>Seven ideas to try</b><button class="x" data-intro-close title="Hide">×</button></div>
    <ol>${IDEAS.map(([t, a, b, act]) => `<li><b>${t}</b><span>${a}</span><button class="link" data-act="${act}">${b} →</button></li>`).join('')}</ol>
  </div>`;
  const field = (key, label, textarea) => {
    const pl = placesOf(d, factNeedle(key));
    const tag = textarea
      ? `<textarea data-site="${key}" rows="3">${esc(d.site[key])}</textarea>`
      : `<input data-site="${key}" value="${esc(d.site[key])}">`;
    return `<label class="fld"><span>${label}<em title="Shown on ${esc(placesText(d, pl))}">in ${plural(pl.count, 'place', 'places')}</em></span>${tag}</label>`;
  };
  const hpl = placesOf(d, factNeedle('hours'));
  const classes = sortClasses(d.collections.classes.filter(c => !c.archived));
  const archived = d.collections.classes.filter(c => c.archived).length;
  const row = (coll, i, sub, tag) => `<button class="row" data-open="${coll}:${i.id}">${i.image ? `<img src="${imgSrc(i.image)}" alt="">` : '<span class="row-dot"></span>'}<span class="row-t"><b>${esc(i.title)}</b><small>${sub}</small></span>${tag ? `<span class="tag">${tag}</span>` : ''}</button>`;
  return `${intro}
  <section class="pn-sec">
    <h3>Your studio</h3>
    <p class="pn-hint">The facts about you. Each is wrjudd once and appears wherever it’s needed.</p>
    ${field('name', 'Name')}${field('tagline', 'Tagline')}${field('about', 'About', true)}${field('address', 'Address')}${field('phone', 'Phone')}${field('email', 'Email')}
    <div class="fld"><span>Opening hours<em title="Shown on ${esc(placesText(d, hpl))}">in ${plural(hpl.count, 'place', 'places')}</em></span>
      <button class="hours-btn" data-hours>${hourLines(d.site.hours).map(l => `<span><b>${l.days}</b> ${l.time}</span>`).join('')}${d.site.holiday ? `<span class="hol">${esc(d.site.holiday)}</span>` : ''}<i>Change</i></button>
    </div>
  </section>
  <section class="pn-sec">
    <h3>Classes <button class="pn-add" data-add="classes">+ Add</button></h3>
    ${classes.map(c => row('classes', c, `${fmtDate(c.date)} · £${esc(c.price)}`, isPast(c.date) ? 'Happened' : '')).join('')}
    ${archived ? `<p class="pn-hint">${plural(archived, 'past class is', 'past classes are')} tidied away.</p>` : ''}
  </section>
  <section class="pn-sec">
    <h3>Shop <button class="pn-add" data-add="pieces">+ Add</button></h3>
    ${d.collections.pieces.map(p => row('pieces', p, `£${esc(p.price)}`, p.status === 'sold' ? 'Sold' : '')).join('')}
  </section>
  <section class="pn-sec">
    <h3>News <button class="pn-add" data-add="news">+ Add</button></h3>
    ${sortedNews(d).map(n => row('news', n, fmtDate(n.date))).join('')}
  </section>
  <section class="pn-sec">
    <h3>Pages <button class="pn-add" data-addpage>+ Add</button></h3>
    <p class="pn-hint">Each page is a few views of the things above. The menu is made from this list.</p>
    ${d.pages.map(p => `<button class="row page-row${p.id === app.pageId ? ' on' : ''}" data-goto="${p.id}"><span class="row-t"><b>${esc(p.title)}</b><small>${p.sections.map(s => TYPES[s.type].name).join(' · ')}</small></span></button>`).join('')}
  </section>`;
}

function presetSwatch(t) {
  const tk = tokens(t);
  return `<span class="sw-prev" style="background:${tk['--bg']};font-family:${tk['--f-head']};font-weight:${tk['--head-w']}">
    <span style="color:${tk['--ink']}">Aa</span><i style="background:${tk['--accent']};border-radius:${tk['--radius-btn']}"></i><i class="b" style="background:${tk['--tint']}"></i>
  </span>`;
}
function panelLook() {
  const t = doc().taste;
  const tk = tokens(t);
  const match = PRESETS.find(p => Object.entries(p.taste).every(([k, v]) => typeof v === 'number' ? Math.abs(t[k] - v) < 0.01 : t[k] === v));
  return `<section class="pn-sec">
    <h3>Start from a feeling</h3>
    <p class="pn-hint">Hover to try one on; click to keep it.</p>
    <div class="presets">${PRESETS.map(p => `<button class="preset${match?.id === p.id ? ' on' : ''}" data-preset="${p.id}">${presetSwatch(p.taste)}<b>${p.name}</b><small>${p.note}</small></button>`).join('')}</div>
  </section>
  <section class="pn-sec">
    <h3>Fine-tune</h3>
    <p class="pn-hint">Right now it’s <b>${tasteWords(t)}</b>.</p>
    <label class="dial"><span>Space</span><input type="range" min="0" max="100" value="${Math.round(t.space * 100)}" data-dial="space"><span class="ends"><i>Snug</i><i>Airy</i></span></label>
    <label class="dial"><span>Mood</span><input type="range" min="0" max="100" value="${Math.round(t.mood * 100)}" data-dial="mood"><span class="ends"><i>Calm</i><i>Lively</i></span></label>
    <div class="dial"><span>Type</span><div class="types">${Object.entries(TYPESETS).map(([k, v]) => `<button class="type${t.type === k ? ' on' : ''}" data-type="${k}" style="font-family:${v.head};font-weight:${v.w[0]}"><b>${v.name}</b><small style="font-family:${v.body}">${v.note}</small></button>`).join('')}</div></div>
    <div class="dial"><span>Colour</span><div class="hues">${Object.entries(HUES).map(([k, v]) => { const x = tokens({ ...t, hue: k }); return `<button class="hue${t.hue === k ? ' on' : ''}" data-hue="${k}" title="${v.name}"><i style="background:${x['--accent']}"></i><i style="background:${x['--tint']}"></i>${v.name}</button>`; }).join('')}</div></div>
  </section>
  <section class="pn-sec">
    <h3>Or just say it</h3>
    <div class="chips">${['More breathing room', 'Calmer', 'Livelier', 'Make it feel more premium', 'Friendlier', 'Warmer', 'Cooler', 'Tighter'].map(s => `<button class="chip" data-say="${s}">${s}</button>`).join('')}</div>
  </section>
  ${app.plumbing ? `<section class="pn-sec"><h3>What the dials set</h3><p class="pn-hint">The design system underneath. You never have to see this.</p>
    <table class="tokens">${Object.entries(tk).map(([k, v]) => `<tr><td>${k}</td><td>${k.match(/bg|tint|ink|soft|line|accent|dark/) && !k.includes('radius') ? `<i style="background:${v}"></i>` : ''}${esc(v.replace(/'/g, '').split(',')[0])}</td></tr>`).join('')}</table></section>` : ''}`;
}

function audit(d) {
  const out = [];
  const dis = new Set(d.dismissed || []);
  const cls = d.collections.classes.filter(c => !c.archived);
  const past = cls.filter(c => isPast(c.date));
  if (past.length) out.push({ id: 'past', title: `${plural(past.length, 'class has', 'classes have')} already happened`, detail: 'They dropped out of “Coming up” on their own, but your Classes page still lists them.', actions: [['Tidy them away', 'archivePast'], ['Show me', 'showPast']] });
  const homeUp = pageOf(d, 'home')?.sections.find(s => s.type === 'upcoming');
  const up = cls.filter(c => !isPast(c.date));
  if (homeUp && homeUp.count && up.length < homeUp.count) out.push({ id: 'thin', title: up.length ? `Only ${plural(up.length, 'class is', 'classes are')} coming up` : 'No classes coming up', detail: `Your homepage has room for ${homeUp.count}. The gap only shows while you’re editing; visitors just see fewer.`, actions: [['Add a class', 'addClass']] });
  const sold = d.collections.pieces.filter(p => p.status === 'sold');
  const showsSold = d.pages.some(p => p.sections.some(s => s.type === 'pieces' && s.showSold));
  if (sold.length && showsSold && !dis.has('sold')) out.push({ id: 'sold', title: `${plural(sold.length, 'piece in the shop is', 'pieces in the shop are')} sold`, detail: `${listJoin(sold.map(p => p.title))}. Hide sold pieces, or keep showing them so people can see what you make?`, actions: [['Hide sold pieces', 'hideSold'], ['Keep showing them', 'dismiss:sold']] });
  const re = new RegExp(`\\b(${OFF_SEASONS.join('|')})\\b`, 'i');
  const texts = [
    ...d.collections.news.map(n => ({ text: `${n.title} ${n.body}`, where: 'your news', go: ['news', n.id] })),
    ...d.pages.flatMap(p => p.sections.map(s => ({ text: [s.heading, s.text].filter(Boolean).join(' '), where: `your ${p.title} page`, go: ['sec', s.id, p.id] }))),
    { text: `${d.site.tagline} ${d.site.about}`, where: 'your studio details', go: ['site'] },
  ];
  for (const t of texts) {
    const m = t.text.match(re);
    if (m && !dis.has('season-' + m[1].toLowerCase())) {
      out.push({ id: 'season', title: `${cap(t.where)} mentions ${m[1].toLowerCase()}`, detail: `It’s ${MONTH_NAME} now. Worth a quick look?`, go: t.go, actions: [['Show me', 'showSeason'], ['It’s fine', 'dismiss:season-' + m[1].toLowerCase()]] });
      break;
    }
  }
  if ((TODAY - parseDay(d.site.hoursChecked)) / 864e5 > 180) out.push({ id: 'hours', title: 'Are your opening hours still right?', detail: `You last checked them in ${fmtMonthYear(d.site.hoursChecked)}. They’re on every page, your search listing and your newsletter.`, actions: [['They’re right', 'hoursOk'], ['Change them', 'hoursEdit']] });
  if ([10, 11].includes(TODAY.getMonth()) && !d.site.holiday && !dis.has('xmas')) out.push({ id: 'xmas', title: 'Open over Christmas?', detail: 'People look up opening hours in December. Add a note and it appears everywhere your hours do.', actions: [['Add a note', 'hoursEdit'], ['No changes', 'dismiss:xmas']] });
  return out;
}

function panelTodo() {
  const items = audit(doc());
  if (!items.length) return `<section class="pn-sec todo-done"><p class="big">✓</p><h3>Nothing needs you</h3><p class="pn-hint">Judd keeps an eye on dates, seasons, stock and facts that go stale, and will list anything here.</p></section>`;
  return `<section class="pn-sec">
    <h3>Things worth a look</h3>
    <p class="pn-hint">Most site work isn’t building, it’s keeping things true. Judd checks dates, seasons, stock and old facts.</p>
    ${items.map(i => `<div class="todo"><b>${esc(i.title)}</b><p>${esc(i.detail)}</p><div class="todo-acts">${i.actions.map(([l, a], n) => `<button class="${n ? '' : 'primary'}" data-act="${a}" data-todo="${i.id}">${esc(l)}</button>`).join('')}</div></div>`).join('')}
  </section>`;
}

function panelEverywhere() {
  const all = [['site', 'Website', 'Your pages, in your look.'], ...Object.entries(OUT).map(([k, o]) => [k, o.name, o.about])];
  return `<section class="pn-sec">
    <h3>One source, many places</h3>
    <p class="pn-hint">Your website is one way of showing your content. Here are some others, made from exactly the same things. Edit anything and watch them change.</p>
    ${all.map(([k, n, a]) => `<button class="out-row${app.stage === k ? ' on' : ''}" data-stage="${k}"><b>${n}</b><small>${a}</small></button>`).join('')}
  </section>`;
}

function ago(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} hr ago`;
}
function panelHistory() {
  const rows = app.past.map((e, i) => ({ i, label: e.label, at: e.at })).reverse();
  return `<section class="pn-sec">
    <h3>History</h3>
    <p class="pn-hint">Every change is kept. Click one to see your site as it was then, and bring it back if you like. Bringing something back is a change too, so you can undo that as well.</p>
    <button class="hist${app.viewing == null ? ' on' : ''}" data-hist="now"><b>Now</b><small>${app.draft ? 'Editing a draft' : 'Live'}</small></button>
    ${rows.map(r => `<button class="hist${app.viewing === r.i ? ' on' : ''}" data-hist="${r.i}"><b>${esc(r.label)}</b><small>${ago(r.at)}</small></button>`).join('')}
    ${app.past.length ? `<button class="hist${app.viewing === -1 ? ' on' : ''}" data-hist="-1"><b>The start</b><small>The sample studio</small></button>` : '<p class="pn-hint">Nothing yet. Make a change and it appears here.</p>'}
  </section>`;
}

/* ================================================================== */
/* Popovers                                                            */
/* ================================================================== */

const pop = () => $('#pop');
function openPop(anchor, html, cls = '') {
  const p = pop();
  p.className = 'pop ' + cls;
  p.innerHTML = html;
  p.hidden = false;
  p._anchor = anchor;
  placePop(anchor);
  return p;
}
function placePop(anchor) {
  const p = pop();
  if (!anchor || !anchor.isConnected) return;
  const r = anchor.getBoundingClientRect();
  const w = p.offsetWidth, h = p.offsetHeight;
  const vw = innerWidth, vh = innerHeight;
  let left = r.right + 12;
  let top = r.top;
  if (left + w > vw - 12) left = r.left - w - 12;
  if (left < 12) { left = clamp(r.left, 12, vw - w - 12); top = r.bottom + 8; if (top + h > vh - 12) top = r.top - h - 8; }
  top = clamp(top, 64, Math.max(64, vh - h - 12));
  p.style.left = left + 'px';
  p.style.top = top + 'px';
}
function closePop() { pop().hidden = true; pop()._anchor = null; }

function picRow(cur, kind) {
  return `<div class="pics">${PICS[kind].map(f => `<button type="button" data-pickpic="${f}" class="${f === cur ? 'on' : ''}"><img src="${imgSrc(f)}" alt=""></button>`).join('')}</div>`;
}

function itemForm(coll, it) {
  const f = (k, label, type = 'text', extra = '') => `<label class="fld"><span>${label}</span><input data-f="${k}" type="${type}" value="${esc(it[k])}" ${extra}></label>`;
  if (coll === 'classes') return `${f('title', 'Name')}<div class="two">${f('date', 'Date', 'date')}${f('time', 'Time', 'time')}</div><div class="two">${f('price', 'Price (£)', 'number', 'min="0"')}${f('spaces', 'Spaces', 'number', 'min="1"')}</div><label class="fld"><span>Description</span><textarea data-f="blurb" rows="3">${esc(it.blurb)}</textarea></label><div class="fld"><span>Picture</span>${picRow(it.image, 'place')}</div>`;
  if (coll === 'pieces') return `${f('title', 'Name')}${f('price', 'Price (£)', 'number', 'min="0"')}<div class="fld"><span>Status</span><div class="seg"><button type="button" data-status="available" class="${it.status !== 'sold' ? 'on' : ''}">Available</button><button type="button" data-status="sold" class="${it.status === 'sold' ? 'on' : ''}">Sold</button></div></div><div class="fld"><span>Picture</span>${picRow(it.image, 'piece')}</div>`;
  return `${f('title', 'Headline')}${f('date', 'Date', 'date')}<label class="fld"><span>Text</span><textarea data-f="body" rows="4">${esc(it.body)}</textarea></label>`;
}
function whereLine(coll, id) {
  const d = doc();
  const pl = placesOf(d, `data-item="${coll}:${id}"`);
  const it = itemOf(d, coll, id);
  let why = '';
  if (coll === 'classes' && it && isPast(it.date)) why = ' It’s already happened, so it’s left Coming up on its own.';
  if (coll === 'pieces' && it?.status === 'sold' && pl.count < 2) why = ' It’s sold, so most places leave it out.';
  return `<b>Shown on</b> ${esc(placesText(d, pl))}.${why}`;
}
function openItem(coll, id, anchor) {
  const it = itemOf(doc(), coll, id);
  if (!it) return;
  const p = openPop(anchor, `
    <div class="pop-head"><span class="pop-kind">${cap(COLL[coll].one)}</span><button class="x" data-close title="Close">×</button></div>
    <div class="pop-body">${itemForm(coll, it)}</div>
    <p class="pop-where">${whereLine(coll, id)}</p>
    <div class="pop-foot"><button data-del>Delete</button><span class="spacer"></span><button class="primary" data-close>Done</button></div>`, 'pop-item');
  p._item = { coll, id };
}
function changeItem(coll, id, k, v) {
  const it = itemOf(doc(), coll, id);
  if (!it || String(it[k]) === String(v)) return;
  if (k === 'price' || k === 'spaces') v = Number(v) || 0;
  commit(`Changed ${it.title}`, d => { itemOf(d, coll, id)[k] = v; });
  const w = pop().querySelector('.pop-where');
  if (w) w.innerHTML = whereLine(coll, id);
}
function addItem(coll, anchor) {
  const id = uid(coll[0]);
  const made = {
    classes: { id, title: 'New class', date: daysFrom(21), time: '10:00', price: 45, spaces: 6, image: 'throwing.jpg', blurb: 'What you’ll make, and what to bring.' },
    pieces: { id, title: 'New piece', price: 30, status: 'available', image: 'bowls-white.jpg' },
    news: { id, title: 'Something new', date: daysFrom(0), body: 'A few words about it.' },
  }[coll];
  commit(`Added a ${COLL[coll].one}`, d => { coll === 'classes' ? d.collections[coll].push(made) : d.collections[coll].unshift(made); });
  const onCanvas = $(`#site [data-item="${coll}:${id}"]`);
  const inPanel = $(`#panel [data-open="${coll}:${id}"]`);
  const a = (anchor && anchor.isConnected && anchor) || onCanvas || inPanel || $('#stage');
  if (onCanvas) { onCanvas.scrollIntoView({ block: 'center', behavior: 'smooth' }); flashEl(onCanvas); }
  setTimeout(() => {
    openItem(coll, id, onCanvas || a);
    const t = pop().querySelector('[data-f="title"]');
    if (t) { t.focus(); t.select(); }
  }, onCanvas ? 280 : 0);
}

function openHours(anchor, focusHoliday) {
  const d = doc();
  const h = d.site.hours;
  const pl = placesOf(d, factNeedle('hours'));
  const p = openPop(anchor, `
    <div class="pop-head"><span class="pop-kind">Opening hours</span><button class="x" data-close>×</button></div>
    <div class="pop-body">
      ${DAYS.map(k => `<div class="hrow"><label><input type="checkbox" data-open-day="${k}"${h[k] ? ' checked' : ''}>${DAY_LONG[k]}</label>${h[k] ? `<input type="time" data-o="${k}" value="${h[k][0]}"><span>to</span><input type="time" data-c="${k}" value="${h[k][1]}">` : '<span class="closed">Closed</span>'}</div>`).join('')}
      <label class="fld"><span>Holidays and exceptions</span><input data-holiday value="${esc(d.site.holiday)}" placeholder="For example: Closed 24 December to 2 January"></label>
    </div>
    <p class="pop-where"><b>Shown on</b> ${esc(placesText(d, pl))}. Last checked ${fmtMonthYear(d.site.hoursChecked)}.</p>
    <div class="pop-foot"><button data-hours-ok>These are right</button><span class="spacer"></span><button class="primary" data-close>Done</button></div>`, 'pop-hours');
  p._hours = true;
  if (focusHoliday) setTimeout(() => p.querySelector('[data-holiday]')?.focus(), 30);
}
function changeHours(fn, label = 'Changed your opening hours') {
  commit(label, d => { fn(d.site); d.site.hoursChecked = daysFrom(0); });
  if (!pop().hidden && pop()._hours) openHours(pop()._anchor && pop()._anchor.isConnected ? pop()._anchor : null);
}

function openPicPicker(secId, anchor) {
  const { s } = findSec(doc(), secId);
  openPop(anchor, `<div class="pop-head"><span class="pop-kind">Picture</span><button class="x" data-close>×</button></div><div class="pop-body">${picRow(s.image, 'place')}</div>`, 'pop-pic')._pic = secId;
}

function openSettings(secId, anchor) {
  const { s, p: page } = findSec(doc(), secId);
  if (!s) return;
  const t = TYPES[s.type];
  const opt = (k, v, label) => `<button type="button" data-set="${k}" data-v="${v}" class="${String(s[k] ?? '') === String(v) ? 'on' : ''}">${label}</button>`;
  let body = '';
  if (s.type === 'upcoming') body += `<div class="fld"><span>How many classes</span><div class="seg">${opt('count', 3, 'Next 3')}${opt('count', 6, 'Next 6')}${opt('count', 0, 'All')}</div></div><label class="check"><input type="checkbox" data-toggle="past"${s.past ? ' checked' : ''}> Include classes that have happened</label>`;
  if (s.type === 'pieces') body += `<div class="fld"><span>How many pieces</span><div class="seg">${opt('count', 4, '4')}${opt('count', 8, '8')}${opt('count', 0, 'All')}</div></div><label class="check"><input type="checkbox" data-toggle="showSold"${s.showSold ? ' checked' : ''}> Show sold pieces</label>`;
  if (s.type === 'news') body += `<div class="fld"><span>How much news</span><div class="seg">${opt('count', 3, 'Latest 3')}${opt('count', 0, 'All')}</div></div>`;
  const tone = s.tone || t.tone;
  body += `<div class="fld"><span>Background</span><div class="seg">${['plain', 'tint', 'dark', 'accent'].map(v => `<button type="button" data-tone="${v}" class="${tone === v ? 'on' : ''}">${cap(v)}</button>`).join('')}</div></div>`;
  if (t.view) body += `<p class="pop-where">This section is a view: it shows your ${t.view === 'pieces' ? 'shop' : t.view} and keeps up with them by itself. To change what’s in it, change the ${t.view === 'pieces' ? 'pieces' : t.view}.</p>`;
  const p = openPop(anchor, `<div class="pop-head"><span class="pop-kind">${t.name} on ${esc(page.title)}</span><button class="x" data-close>×</button></div><div class="pop-body">${body}</div>`, 'pop-settings');
  p._settings = secId;
}

function openAddSection(anchor) {
  openPop(anchor, `<div class="pop-head"><span class="pop-kind">Add a section to ${esc(curPage().title)}</span><button class="x" data-close>×</button></div>
    <div class="pop-body add-list">${ADDABLE.map(k => `<button type="button" data-addtype="${k}"><b>${TYPES[k].name}</b><small>${TYPES[k].about}</small></button>`).join('')}</div>`, 'pop-add');
}
function addSection(type, { pageId = app.pageId, label } = {}) {
  const id = uid('s-');
  commit(label || `Added a ${TYPES[type].name} section to ${pageOf(doc(), pageId).title}`, d => {
    const p = pageOf(d, pageId);
    const at = p.sections.length && p.sections[p.sections.length - 1].type === 'visit' && type !== 'visit' ? p.sections.length - 1 : p.sections.length;
    p.sections.splice(at, 0, { id, type, ...TYPES[type].make() });
  });
  const el = $(`#site [data-sec="${id}"]`);
  if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); flashEl(el); }
  return id;
}

/* ================================================================== */
/* Editing in place, with scope asked at the moment of editing        */
/* ================================================================== */

const pill = () => $('#pill');
let activeEdit = null;

function showPill(el) {
  const d = doc();
  const kind = el.dataset.kind;
  const path = el.dataset.path;
  const page = curPage();
  let html = '';
  if (kind === 'fact') {
    const key = path.split('.')[1];
    const pl = placesOf(d, factNeedle(key));
    html = `<span class="dot fact"></span><span><b>${FACTS[key]}</b> · one fact, used on ${esc(placesText(d, pl))}. Change it here and it changes everywhere.</span>`;
  } else if (kind === 'shared') {
    const n = d.pages.length;
    html = `<span class="dot shared"></span><span><b>Footer note</b> · change it on</span>
      <span class="seg seg-pill"><button type="button" data-scope="all" class="${app.scope === 'all' ? 'on' : ''}">Every page (${n})</button><button type="button" data-scope="page" class="${app.scope === 'page' ? 'on' : ''}">Just ${esc(page.title)}</button></span>`;
  } else {
    html = `<span class="dot sec"></span><span><b>${esc(page.title)}</b> · this text is only on this page</span>`;
  }
  const p = pill();
  p.className = 'pill pill-' + kind;
  p.innerHTML = html;
  p.hidden = false;
  placePill(el);
}
function placePill(el) {
  const p = pill();
  if (p.hidden || !el?.isConnected) return;
  const r = el.getBoundingClientRect();
  const top = r.top - p.offsetHeight - 10 < 64 ? r.bottom + 10 : r.top - p.offsetHeight - 10;
  p.style.top = top + 'px';
  p.style.left = clamp(r.left, 12, innerWidth - p.offsetWidth - 12) + 'px';
}
function hidePill() { pill().hidden = true; }
function mirrors(el) { return $$(`#site [data-path="${el.dataset.path}"]`).filter(x => x !== el); }

function onEditFocus(el) {
  activeEdit = el;
  el._orig = el.textContent;
  el._cancel = false;
  if (el.dataset.kind === 'shared') app.scope = hasOverride(curPage(), el.dataset.path.split('.')[1]) ? 'page' : 'all';
  if (el.dataset.kind === 'fact') mirrors(el).forEach(m => m.classList.add('mirror'));
  closePop();
  showPill(el);
}
function onEditInput(el) {
  if (el.dataset.kind === 'fact') mirrors(el).forEach(m => { m.textContent = el.textContent; });
  placePill(el);
}
function onEditBlur(el) {
  activeEdit = null;
  hidePill();
  $$('#site .mirror').forEach(m => m.classList.remove('mirror'));
  const path = el.dataset.path;
  const kind = el.dataset.kind;
  if (el._cancel) {
    el.textContent = el._orig;
    if (kind === 'fact') mirrors(el).forEach(m => { m.textContent = el._orig; });
    return;
  }
  const v = el.textContent.replace(/\s+/g, ' ').trim();
  const page = curPage();
  const old = getVal(doc(), path, page);
  const key = path.split('.')[1];
  const scopeChanged = kind === 'shared' && (app.scope === 'page') !== hasOverride(page, key);
  if (v === old && !scopeChanged) return;
  let label = `Changed text on ${page.title}`;
  if (kind === 'fact') label = `Changed your ${FACTS[key].toLowerCase()}`;
  if (kind === 'shared') label = app.scope === 'page' ? `Changed the footer note on ${page.title} only` : 'Changed the footer note on every page';
  commit(label, d => setVal(d, path, v, { pageId: page.id, scope: app.scope }), { site: false });
  if (kind === 'fact') receipt(`${FACTS[key]} updated in ${plural(placesOf(doc(), factNeedle(key)).count, 'place', 'places')}`, { undo: true });
  if (kind === 'shared') receipt(app.scope === 'page' ? `Footer note changed on ${page.title} only` : `Footer note changed on all ${doc().pages.length} pages`, { undo: true });
}

/* ================================================================== */
/* Saying it: a small, rule-based command interpreter                 */
/* ================================================================== */
/* A stand-in for a language model. It only understands a few kinds of  */
/* sentence, but the point is that what you say and what you do by hand */
/* both change the same model, and you can see and undo either.         */

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function dayKey(word) { const w = word.toLowerCase().slice(0, 3); return DAYS.find(k => k === w); }
function parseWhen(str) {
  const s = str.toLowerCase().trim().replace(/(\d)(st|nd|rd|th)\b/, '$1');
  if (s === 'today') return daysFrom(0);
  if (s === 'tomorrow') return daysFrom(1);
  let m = s.match(/^in (\d+) (day|week)s?$/);
  if (m) return daysFrom(Number(m[1]) * (m[2] === 'week' ? 7 : 1));
  m = s.match(/^(?:next |this )?(sun|mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?)(?:day)?$/);
  if (m) {
    const target = WEEKDAYS.findIndex(w => w.startsWith(m[1].slice(0, 3)));
    let add = (target - TODAY.getDay() + 7) % 7 || 7;
    if (s.startsWith('next ') && add < 7) add += 0;
    return daysFrom(add);
  }
  m = s.match(/^(\d{1,2}) ([a-z]+)$/) || s.match(/^([a-z]+) (\d{1,2})$/);
  if (m) {
    const [day, mon] = /\d/.test(m[1]) ? [Number(m[1]), m[2]] : [Number(m[2]), m[1]];
    const mi = MONTHS.indexOf(mon.slice(0, 3));
    if (mi < 0 || day < 1 || day > 31) return null;
    let d = new Date(TODAY.getFullYear(), mi, day);
    if (d < TODAY) d = new Date(TODAY.getFullYear() + 1, mi, day);
    return isoDay(d);
  }
  return null;
}
function parseTime(str) {
  const m = String(str).toLowerCase().trim().match(/^(\d{1,2})(?:[:.](\d\d))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  if (!m[3] && h < 8) h += 12; // "open 10 to 5" means 5pm
  if (h > 23 || min > 59) return null;
  return `${pad2(h)}:${pad2(min)}`;
}
function fuzzy(list, words) {
  const w = words.toLowerCase().replace(/^the |^my |^our /, '').trim();
  return list.find(i => i.title.toLowerCase() === w) || list.find(i => i.title.toLowerCase().includes(w)) || list.find(i => w.includes(i.title.toLowerCase().split(/[ ,]/)[0]));
}
const SEC_WORDS = [
  [/book|call to action|cta|private|group/, 'cta'], [/newsletter|mailing|subscribe|sign.?up|email/, 'newsletter'], [/about|story|who we are/, 'about'],
  [/shop|pieces|products|store|for sale/, 'pieces'], [/class|upcoming|events|what.?s on|coming up|workshop/, 'upcoming'],
  [/visit|hours|opening|location|address|find us|contact|map/, 'visit'], [/news|updates|blog/, 'news'],
  [/quote|testimonial|review/, 'quote'], [/hero|welcome|banner|intro|opening section/, 'hero'],
];
const secTypeOf = s => (SEC_WORDS.find(([re]) => re.test(s)) || [])[1];

const TASTE_RULES = [
  [/breathing room|more space|spacious|\bair(y|ier)\b|room to breathe|less cramped|spread (it )?out/, t => ({ space: clamp(t.space + 0.25) }), 'more breathing room'],
  [/tighter|compact|\bsnug|less space|denser|less spread/, t => ({ space: clamp(t.space - 0.25) }), 'tighter spacing'],
  [/premium|elegant|luxur|upmarket|posh|refined|sophisticated|expensive|classy|high.?end/, t => ({ type: 'classic', mood: clamp(t.mood - 0.2), space: clamp(t.space + 0.2) }), 'a more premium feel'],
  [/\bcalm|quieter|\bquiet|softer|subtle|minimal|gentler|relaxed|toned? down/, t => ({ mood: clamp(t.mood - 0.25) }), 'a calmer mood'],
  [/livel|bolder|\bbold\b|energetic|louder|punch|vibrant|exciting|more fun|brighter/, t => ({ mood: clamp(t.mood + 0.25) }), 'a livelier mood'],
  [/friendl|playful|welcoming|approachable/, t => ({ type: 'friendly', mood: clamp(t.mood + 0.1) }), 'friendlier type'],
  [/modern|contemporary|crisp|\bclean/, () => ({ type: 'modern' }), 'modern type'],
  [/classic|traditional|timeless|old.?fashioned|bookish|serif/, () => ({ type: 'classic' }), 'classic type'],
  [/warmer|\bwarm\b/, t => ({ hue: ['sea', 'ink', 'sage'].includes(t.hue) ? 'clay' : t.hue === 'clay' ? 'ochre' : 'clay' }), 'warmer colours'],
  [/cooler|\bcool\b|colder|fresher/, t => ({ hue: ['clay', 'ochre', 'plum'].includes(t.hue) ? 'sea' : t.hue === 'sea' ? 'sage' : 'sea' }), 'cooler colours'],
];
const HUE_WORDS = [[/terracotta|clay|orange|rust|\bred\b|brick/, 'clay'], [/ochre|yellow|mustard|gold/, 'ochre'], [/sage|green|olive/, 'sage'], [/blue|\bsea\b|teal|navy|aqua/, 'sea'], [/plum|purple|pink|berry|violet/, 'plum'], [/grey|gray|black|\bink\b|monochrome|neutral|charcoal/, 'ink']];

function interpret(raw) {
  const t = raw.trim().replace(/[.!?]+$/, '');
  const s = t.toLowerCase().replace(/[’‘]/g, "'");
  const d = doc();
  const page = curPage();
  let m;
  if (!s) return null;

  if (/^(undo|undo that|take that back)$/.test(s)) return { undo: true };

  if ((m = s.match(/^(?:go to|open|show me|show|take me to)\s+(?:the\s+|my\s+)?(.+?)(?:\s+page)?$/))) {
    const p = d.pages.find(x => x.title.toLowerCase() === m[1] || x.id === m[1]);
    if (p) return { nav: p.id, say: `Here’s your ${p.title} page` };
    const o = Object.entries(OUT).find(([, v]) => v.name.toLowerCase().includes(m[1]) || m[1].includes(v.short));
    if (o) return { stage: o[0], say: `Here’s your ${o[1].name.toLowerCase()}` };
  }

  // Sold pieces
  if (/\b(hide|remove|don'?t show|stop showing)\b.*\bsold\b/.test(s)) return { label: 'Hid sold pieces', fn: x => x.pages.forEach(p => p.sections.forEach(q => { if (q.type === 'pieces') q.showSold = false; })), say: 'Sold pieces are hidden everywhere your shop appears' };
  if (/\bshow\b.*\bsold\b/.test(s)) return { label: 'Showed sold pieces', fn: x => x.pages.forEach(p => p.sections.forEach(q => { if (q.type === 'pieces') q.showSold = true; })), say: 'Sold pieces are back, marked Sold' };
  if ((m = s.match(/^(?:mark |set )?(?:the |our |my )?(.+?) (?:as |is |are )?(sold(?: out)?|available|back in stock|in stock)$/))) {
    const it = fuzzy(d.collections.pieces, m[1]);
    if (it) {
      const st = m[2].startsWith('sold') ? 'sold' : 'available';
      return { label: `Marked ${it.title} as ${st}`, fn: x => { itemOf(x, 'pieces', it.id).status = st; }, say: `${it.title} is ${st === 'sold' ? 'sold' : 'available again'}`, where: `data-item="pieces:${it.id}"` };
    }
  }

  // Hours
  if ((m = s.match(/closed (?:from |between )?(\d{1,2}(?:st|nd|rd|th)? [a-z]+|[a-z]+ \d{1,2}(?:st|nd|rd|th)?) (?:to|until|till|and|-|–) (\d{1,2}(?:st|nd|rd|th)? [a-z]+|[a-z]+ \d{1,2}(?:st|nd|rd|th)?)/))) {
    const a = parseWhen(m[1]), b = parseWhen(m[2]);
    if (a && b) {
      const note = `Closed ${parseDay(a).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} to ${parseDay(b).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;
      return { label: 'Added a holiday note to your hours', fn: x => { x.site.holiday = note; x.site.hoursChecked = daysFrom(0); }, say: `“${note}” now shows wherever your hours do`, where: 'data-fact="hours"' };
    }
  }
  if ((m = s.match(/(?:closed|shut|not open) (?:on )?(mon|tue|wed|thu|fri|sat|sun)[a-z]*/))) {
    const k = dayKey(m[1]);
    return { label: `Closed on ${DAY_LONG[k]}s`, fn: x => { x.site.hours[k] = null; x.site.hoursChecked = daysFrom(0); }, say: `You’re now closed on ${DAY_LONG[k]}s`, where: 'data-fact="hours"' };
  }
  if ((m = s.match(/open (?:on )?(mon|tue|wed|thu|fri|sat|sun)[a-z]*(?: (?:from )?(\d{1,2}(?:[:.]\d\d)?\s*(?:am|pm)?)\s*(?:-|–|to|until|till)\s*(\d{1,2}(?:[:.]\d\d)?\s*(?:am|pm)?))?/))) {
    const k = dayKey(m[1]);
    const o = m[2] ? parseTime(m[2]) : '10:00', c = m[3] ? parseTime(m[3]) : '16:00';
    if (o && c) return { label: `Opened on ${DAY_LONG[k]}s`, fn: x => { x.site.hours[k] = [o, c]; x.site.hoursChecked = daysFrom(0); }, say: `You’re open ${DAY_LONG[k]}s, ${fmtTime(o)} to ${fmtTime(c)}`, where: 'data-fact="hours"' };
  }

  // Classes
  let title = null, rest = '';
  if ((m = t.match(/^(?:add|put on|schedule|run|create) (?:a |an |another )?(?:new )?(?:class|workshop|session)(?: called| named|:)? (.+)$/i))) rest = m[1];
  else if ((m = t.match(/^(?:add|put on|schedule|run|create) (?:a |an |another )?(?:new )?(.+?) (class|workshop|session|course)\b(.*)$/i))) { title = `${cap(m[1])} ${m[2].toLowerCase()}`; rest = m[3]; }
  if (m) {
    let price = 45, time = '10:00', date = null, spaces = 6;
    let r = ' ' + rest + ' ';
    r = r.replace(/\s(?:for |at |costing )?£(\d+)/i, (_, p) => { price = Number(p); return ' '; });
    r = r.replace(/\s(?:for |with )?(\d+) (?:people|spaces|places|students)/i, (_, n) => { spaces = Number(n); return ' '; });
    r = r.replace(/\sat (\d{1,2}(?:[:.]\d\d)?\s*(?:am|pm)?)(?=\s)/i, (all, x) => { const tt = parseTime(x); if (tt) { time = tt; return ' '; } return all; });
    r = r.replace(/\s(?:on |next |this )?((?:next |this )?(?:mon|tues|wednes|thurs|fri|satur|sun)day|tomorrow|today|\d{1,2}(?:st|nd|rd|th)? [a-z]{3,9}|[a-z]{3,9} \d{1,2}(?:st|nd|rd|th)?|in \d+ (?:days?|weeks?))(?=\s)/i, (all, x) => { const dd = parseWhen(x); if (dd) { date = dd; return ' '; } return all; });
    if (!title) title = cap(r.trim().replace(/^["“']|["”']$/g, '').replace(/\s+/g, ' '));
    if (title) {
      const id = uid('c');
      date = date || daysFrom(14);
      const c = { id, title, date, time, price, spaces, image: /glaz/i.test(title) ? 'bowls.jpg' : /raku|fir/i.test(title) ? 'shelves.jpg' : 'throwing.jpg', blurb: 'What you’ll make, and what to bring.' };
      return { label: `Added ${title}`, fn: x => x.collections.classes.push(c), say: `Added ${title} on ${fmtLong(date)} at ${fmtTime(time)}`, where: `data-item="classes:${id}"`, item: ['classes', id] };
    }
  }

  // Pages
  if ((m = t.match(/^(?:add|make|create) (?:a )?(?:new )?page (?:called |named |for |about )?(.+)$/i))) {
    const name = cap(m[1].replace(/^["“']|["”']$/g, ''));
    const id = uid('pg-');
    return { label: `Added a ${name} page`, fn: x => x.pages.push({ id, title: name, sections: [{ id: uid('s-'), type: 'pagehead', heading: name, text: 'A line about what’s on this page.' }, { id: uid('s-'), type: 'cta', ...TYPES.cta.make() }] }), say: `Added a ${name} page; it’s in the menu on every page`, nav: id };
  }

  // News
  if ((m = t.match(/^(?:post|add news|news|announce|tell people|write)(?: that| about)?[:\s]+(.+)$/i))) {
    const id = uid('n');
    const title = cap(m[1]);
    return { label: 'Posted some news', fn: x => x.collections.news.unshift({ id, title, date: daysFrom(0), body: 'A few words about it.' }), say: `Posted “${title}”`, where: `data-item="news:${id}"`, item: ['news', id] };
  }

  // Name
  if ((m = t.match(/^(?:rename|call) (?:the |our |my )?(?:studio|site|business|shop|us|it) (?:to )?(.+)$/i))) {
    const name = m[1].replace(/^["“']|["”']$/g, '');
    return { label: 'Changed your studio name', fn: x => { x.site.name = name; }, say: `You’re now ${name}, everywhere`, where: 'data-path="site.name"' };
  }

  // Sections
  if ((m = s.match(/^(?:add|put|insert|include|i want|i need|give me)(?: in)? (?:a |an |some |the )?(.+?)(?: section| bit| part| block| area)?(?: (?:to|on|at the bottom of) (?:the |this |my )?(?:page|home ?page|homepage))?$/))) {
    const type = secTypeOf(m[1]);
    if (type && !TASTE_RULES.some(([re]) => re.test(s))) return { section: type };
  }
  if ((m = s.match(/^(?:remove|delete|hide|get rid of|drop|lose)(?: the| that| this)? (.+?)(?: section| bit| part)?(?: from (?:this|the) page)?$/))) {
    const type = secTypeOf(m[1]);
    if (type) {
      const sec = page.sections.find(x => x.type === type);
      if (!sec) return { say: `There isn’t a ${TYPES[type].name} section on ${page.title}`, nothing: true };
      return { label: `Removed the ${TYPES[type].name} section from ${page.title}`, fn: x => { const p = pageOf(x, page.id); p.sections = p.sections.filter(q => q.id !== sec.id); }, say: `Removed the ${TYPES[type].name} section from ${page.title}` };
    }
  }

  // Taste
  const patches = [];
  const said = [];
  let probe = { ...d.taste };
  for (const [re, f, words] of TASTE_RULES) if (re.test(s)) { const pt = f(probe); probe = { ...probe, ...pt }; patches.push(pt); said.push(words); }
  if (!patches.length) for (const [re, hue] of HUE_WORDS) if (re.test(s)) { probe = { ...probe, hue }; patches.push({ hue }); said.push(`${HUES[hue].name.toLowerCase()} colours`); break; }
  if (patches.length) {
    const final = probe;
    return { label: cap(listJoin(said)), fn: x => { x.taste = { ...final }; }, say: `${cap(listJoin(said))}. It’s now ${tasteWords(final)}.`, taste: true };
  }
  return { fail: true };
}

const EXAMPLES = [
  'Add a class called Raku firing on Saturday at 2pm for £65',
  'Make it feel more premium',
  'More breathing room',
  'Mark the tea bowl as sold',
  'We’re closed 24 December to 2 January',
  'Add a booking section',
  'Post: Seconds sale this weekend',
  'Make it green',
];

function runCommand(text) {
  const r = interpret(text);
  if (!r) return;
  if (r.undo) { undo(); return; }
  if (r.fail) { receipt(`I didn’t catch that. In this prototype you can say things like:`, { examples: EXAMPLES.slice(0, 4) }); return; }
  if (r.nothing) { receipt(r.say); return; }
  if (r.section) { addSection(r.section); receipt(`Added a ${TYPES[r.section].name} section to ${curPage().title}`, { undo: true }); return; }
  if (r.stage && !r.fn) { setStage(r.stage); receipt(r.say); return; }
  if (r.nav && !r.fn) { go(r.nav); receipt(r.say); return; }
  if (r.fn) commit(r.label, r.fn);
  if (r.nav) go(r.nav);
  let say = r.say;
  if (r.where) {
    const pl = placesOf(doc(), r.where);
    say += pl.count ? `. Now on ${placesText(doc(), pl)}.` : '.';
    const el = $(`#site [${r.where}]`);
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); flashEl(el); }
  } else if (r.taste) {
    flashEl($('#site'));
  }
  receipt(say, { undo: true, open: r.item });
}

/* ---------- Receipts ---------- */

let receiptTimer;
function receipt(text, { undo: canUndo, redo: canRedo, examples, open } = {}) {
  const el = $('#receipt');
  el.hidden = false;
  el.innerHTML = `<span class="r-text">${esc(text)}</span>
    ${examples ? `<span class="r-ex">${examples.map(e => `<button data-ex="${esc(e)}">${esc(e)}</button>`).join('')}</span>` : ''}
    ${open ? `<button class="r-btn" data-ropen="${open.join(':')}">Edit details</button>` : ''}
    ${canUndo ? '<button class="r-btn" data-rundo>Undo</button>' : ''}${canRedo ? '<button class="r-btn" data-rredo>Redo</button>' : ''}
    <button class="r-x" data-rx title="Dismiss">×</button>`;
  clearTimeout(receiptTimer);
  receiptTimer = setTimeout(() => { el.hidden = true; }, examples ? 14000 : 7000);
}

/* ================================================================== */
/* Navigation, flashing, compare                                       */
/* ================================================================== */

function go(pageId) {
  if (!doc().pages.some(p => p.id === pageId)) return;
  app.pageId = pageId;
  app.stage = 'site';
  closePop();
  render();
  $('#stage').scrollTop = 0;
}
function setStage(k) {
  app.stage = k;
  closePop();
  render();
  $('#stage').scrollTop = 0;
}
function flashEl(el) {
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1600);
}

function openCompare() {
  if (!app.draft) return;
  const c = $('#compare');
  c.hidden = false;
  const page = pageOf(app.draft, app.pageId);
  const livePage = app.live.pages.find(p => p.id === app.pageId) || app.live.pages[0];
  c.innerHTML = `<div class="cmp-bar"><b>Compare: ${esc(page.title)}</b><span class="tb-muted">Scroll either side; they move together.</span><span class="spacer"></span>
      <button class="tb-btn" data-c="close">Keep editing the draft</button><button class="tb-btn primary" data-c="publish">Publish the draft</button></div>
    <div class="cmp-cols">
      <div class="cmp-col"><p class="cmp-label">Live now <small>${esc(tasteWords(app.live.taste))}</small></p><div class="cmp-view"><div class="cmp-frame site" id="cmp-live">${renderPage(app.live, livePage)}</div></div></div>
      <div class="cmp-col"><p class="cmp-label draft">Your draft <small>${esc(tasteWords(app.draft.taste))}</small></p><div class="cmp-view"><div class="cmp-frame site" id="cmp-draft">${renderPage(app.draft, page)}</div></div></div>
    </div>`;
  applyTaste($('#cmp-live'), app.live.taste);
  applyTaste($('#cmp-draft'), app.draft.taste);
  fitCompare();
  const views = $$('.cmp-view', c);
  let lock = false;
  views.forEach(v => v.addEventListener('scroll', () => {
    if (lock) return;
    lock = true;
    const other = views.find(x => x !== v);
    other.scrollTop = v.scrollTop / Math.max(1, v.scrollHeight - v.clientHeight) * (other.scrollHeight - other.clientHeight);
    requestAnimationFrame(() => { lock = false; });
  }));
}
function fitCompare() {
  $$('.cmp-view').forEach(v => {
    const f = v.firstElementChild;
    const scale = v.clientWidth / 1280;
    f.style.transform = `scale(${scale})`;
    v.style.setProperty('--h', f.scrollHeight * scale + 'px');
    f.parentElement.style.height = '';
    f.style.marginBottom = `${-(f.scrollHeight * (1 - scale))}px`;
  });
}

/* ================================================================== */
/* Actions from To do and the intro                                    */
/* ================================================================== */

function runAction(act, anchor) {
  const d = doc();
  if (act.startsWith('dismiss:')) { const key = act.slice(8); commit('Dismissed a suggestion', x => { x.dismissed = [...(x.dismissed || []), key]; }); return; }
  switch (act) {
    case 'archivePast': {
      const n = d.collections.classes.filter(c => !c.archived && isPast(c.date)).length;
      commit(`Tidied away ${plural(n, 'past class', 'past classes')}`, x => x.collections.classes.forEach(c => { if (isPast(c.date)) c.archived = true; }));
      receipt(`Tidied away ${plural(n, 'past class', 'past classes')}. They’re kept, just not shown.`, { undo: true });
      break;
    }
    case 'showPast': go('classes'); setTimeout(() => { const el = $('#site .s-class.is-past'); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); $$('#site .s-class.is-past').forEach(flashEl); } }, 50); break;
    case 'addClass': case 'idea-add': {
      if (act === 'idea-add' && app.pageId !== 'home') go('home');
      const g = $('#site [data-add="classes"]');
      if (g) { g.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => addItem('classes', $('#site [data-add="classes"]')), 300); }
      else addItem('classes', anchor);
      break;
    }
    case 'hideSold': runCommand('hide sold pieces'); break;
    case 'showSeason': {
      const item = audit(d).find(i => i.id === 'season');
      if (!item) break;
      const [kind, a, b] = item.go;
      if (kind === 'news') {
        go('news');
        setTimeout(() => { const el = $(`#site [data-item="news:${a}"]`); if (el) { el.scrollIntoView({ block: 'center' }); flashEl(el); openItem('news', a, el); } }, 50);
      } else if (kind === 'sec') {
        go(b);
        setTimeout(() => { const el = $(`#site [data-sec="${a}"]`); if (el) { el.scrollIntoView({ block: 'center' }); flashEl(el); } }, 50);
      } else { app.panel = 'content'; renderPanel(); }
      break;
    }
    case 'hoursOk': commit('Checked your opening hours', x => { x.site.hoursChecked = daysFrom(0); }); receipt('Thanks. Judd will ask again in six months.', { undo: true }); break;
    case 'hoursEdit': {
      const el = $('#site .s-footer [data-fact="hours"]') || $('#site [data-fact="hours"]');
      if (el) { el.scrollIntoView({ block: 'center' }); setTimeout(() => openHours(el, true), 60); }
      break;
    }
    case 'idea-scope': {
      const el = $('#site [data-path="shared.footerNote"]');
      if (el) { el.scrollIntoView({ block: 'center' }); setTimeout(() => { el.focus(); placePill(el); }, 120); }
      break;
    }
    case 'idea-look': app.panel = 'look'; renderPanel(); break;
    case 'idea-todo': app.panel = 'todo'; renderPanel(); break;
    case 'idea-out': app.panel = 'everywhere'; renderPanel(); setStage('newsletter'); break;
    case 'idea-say': { const i = $('#cmd-input'); i.value = EXAMPLES[0]; i.focus(); i.select(); showSuggest(); break; }
    case 'idea-draft': if (!app.draft) startDraft(); break;
  }
}

function startDraft() {
  commit('Started a draft', () => { app.draft = clone(app.live); });
  receipt('You’re in a draft: a private copy of your whole site. Change anything; visitors won’t see it until you publish.', {});
}

/* ================================================================== */
/* Events                                                              */
/* ================================================================== */

const site = $('#site');

site.addEventListener('focusin', e => { const el = e.target.closest('[data-edit]'); if (el && canEdit()) onEditFocus(el); });
site.addEventListener('input', e => { const el = e.target.closest('[data-edit]'); if (el) onEditInput(el); });
site.addEventListener('focusout', e => { const el = e.target.closest('[data-edit]'); if (el && canEdit()) onEditBlur(el); });
site.addEventListener('keydown', e => {
  const el = e.target.closest('[data-edit]');
  if (!el) return;
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
  if (e.key === 'Escape') { el._cancel = true; el.blur(); }
});
site.addEventListener('paste', e => {
  const el = e.target.closest('[data-edit]');
  if (!el) return;
  e.preventDefault();
  document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\s+/g, ' '));
});

site.addEventListener('click', e => {
  const goto = e.target.closest('[data-goto]');
  if (canEdit()) {
    if (e.target.closest('[data-edit]')) { if (goto) e.preventDefault(); return; }
    const sa = e.target.closest('[data-sa]');
    if (sa) {
      const sec = sa.closest('[data-sec]').dataset.sec;
      const { s, p } = findSec(doc(), sec);
      const i = p.sections.indexOf(s);
      if (sa.dataset.sa === 'settings') openSettings(sec, sa);
      if (sa.dataset.sa === 'up' || sa.dataset.sa === 'down') {
        const j = sa.dataset.sa === 'up' ? i - 1 : i + 1;
        commit(`Moved the ${TYPES[s.type].name} section ${sa.dataset.sa}`, d => { const q = pageOf(d, p.id).sections; [q[i], q[j]] = [q[j], q[i]]; });
        flashEl($(`#site [data-sec="${sec}"]`));
      }
      if (sa.dataset.sa === 'remove') {
        commit(`Removed the ${TYPES[s.type].name} section from ${p.title}`, d => { const pg = pageOf(d, p.id); pg.sections = pg.sections.filter(q => q.id !== sec); });
        receipt(`Removed the ${TYPES[s.type].name} section`, { undo: true });
      }
      return;
    }
    const item = e.target.closest('[data-item]');
    if (item) { const [coll, id] = item.dataset.item.split(':'); openItem(coll, id, item); return; }
    const add = e.target.closest('[data-add]');
    if (add) { addItem(add.dataset.add, add); return; }
    const hours = e.target.closest('[data-fact="hours"]');
    if (hours) { openHours(hours); return; }
    const pic = e.target.closest('[data-pic]');
    if (pic) { openPicPicker(pic.dataset.pic, pic); return; }
    if (e.target.closest('[data-addsec]')) { openAddSection(e.target.closest('[data-addsec]')); return; }
  }
  if (goto) { e.preventDefault(); if (app.stage === 'site') go(goto.dataset.goto); }
});

// Popover
document.addEventListener('mousedown', e => {
  const p = pop();
  if (!p.hidden && !p.contains(e.target) && !(p._anchor && p._anchor.contains?.(e.target)) && !e.target.closest('#receipt')) closePop();
  if (e.target.closest('#pill')) e.preventDefault(); // keep focus in the text being edited
});
pop().addEventListener('click', e => {
  const p = pop();
  if (e.target.closest('[data-close]')) { closePop(); return; }
  if (p._item) {
    const { coll, id } = p._item;
    const it = itemOf(doc(), coll, id);
    if (e.target.closest('[data-del]')) { closePop(); commit(`Deleted ${it.title}`, d => { d.collections[coll] = d.collections[coll].filter(i => i.id !== id); }); receipt(`Deleted ${it.title}`, { undo: true }); return; }
    const st = e.target.closest('[data-status]');
    if (st) { changeItem(coll, id, 'status', st.dataset.status); $$('[data-status]', p).forEach(b => b.classList.toggle('on', b === st)); return; }
    const pk = e.target.closest('[data-pickpic]');
    if (pk) { changeItem(coll, id, 'image', pk.dataset.pickpic); $$('[data-pickpic]', p).forEach(b => b.classList.toggle('on', b === pk)); return; }
  }
  if (p._pic) {
    const pk = e.target.closest('[data-pickpic]');
    if (pk) { const id = p._pic; commit('Changed a picture', d => { findSec(d, id).s.image = pk.dataset.pickpic; }); closePop(); }
    return;
  }
  if (p._hours && e.target.closest('[data-hours-ok]')) { commit('Checked your opening hours', x => { x.site.hoursChecked = daysFrom(0); }); closePop(); receipt('Thanks. Judd will ask again in six months.', { undo: true }); return; }
  if (p._settings) {
    const id = p._settings;
    const set = e.target.closest('[data-set]');
    const tone = e.target.closest('[data-tone]');
    if (set) commit('Changed what a section shows', d => { findSec(d, id).s[set.dataset.set] = Number(set.dataset.v); });
    if (tone) commit('Changed a section’s background', d => { findSec(d, id).s.tone = tone.dataset.tone; });
    if (set || tone) openSettings(id, $(`#site [data-sec="${id}"] [data-sa="settings"]`) || p._anchor);
    return;
  }
  const at = e.target.closest('[data-addtype]');
  if (at) { closePop(); addSection(at.dataset.addtype); }
});
pop().addEventListener('change', e => {
  const p = pop();
  const f = e.target.closest('[data-f]');
  if (f && p._item) { changeItem(p._item.coll, p._item.id, f.dataset.f, f.value); return; }
  if (p._settings && e.target.matches('[data-toggle]')) {
    const id = p._settings, k = e.target.dataset.toggle, v = e.target.checked;
    commit('Changed what a section shows', d => { findSec(d, id).s[k] = v; });
    return;
  }
  if (p._hours) {
    const t = e.target;
    if (t.dataset.openDay) { const k = t.dataset.openDay; changeHours(s => { s.hours[k] = t.checked ? ['10:00', '17:00'] : null; }); return; }
    if (t.dataset.o || t.dataset.c) { const k = t.dataset.o || t.dataset.c; const i = t.dataset.o ? 0 : 1; changeHours(s => { s.hours[k] = [...s.hours[k]]; s.hours[k][i] = t.value; }); return; }
    if (t.matches('[data-holiday]')) changeHours(s => { s.holiday = t.value.trim(); }, t.value.trim() ? 'Added a holiday note to your hours' : 'Removed the holiday note');
  }
});
pop().addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });

// Pill (scope)
pill().addEventListener('click', e => {
  const b = e.target.closest('[data-scope]');
  if (!b) return;
  app.scope = b.dataset.scope;
  $$('[data-scope]', pill()).forEach(x => x.classList.toggle('on', x === b));
});

// Panel
const panel = $('#panel');
panel.addEventListener('click', e => {
  const t = e.target;
  const tab = t.closest('[data-tab]');
  if (tab) { app.panel = tab.dataset.tab; renderPanel(); return; }
  if (t.closest('[data-intro-close]')) { app.introClosed = true; renderPanel(); return; }
  const act = t.closest('[data-act]');
  if (act) { runAction(act.dataset.act, act); return; }
  const open = t.closest('[data-open]');
  if (open) { const [coll, id] = open.dataset.open.split(':'); openItem(coll, id, open); return; }
  const add = t.closest('[data-add]');
  if (add) { addItem(add.dataset.add, add); return; }
  if (t.closest('[data-hours]')) { openHours(t.closest('[data-hours]')); return; }
  const g = t.closest('[data-goto]');
  if (g) { go(g.dataset.goto); return; }
  if (t.closest('[data-addpage]')) { runCommand('add a page called Gallery'); return; }
  const pr = t.closest('[data-preset]');
  if (pr) { const p = PRESETS.find(x => x.id === pr.dataset.preset); commit(`Changed the look to ${p.name}`, d => { d.taste = { ...p.taste }; }); return; }
  const ty = t.closest('[data-type]');
  if (ty) { commit(`Changed to ${TYPESETS[ty.dataset.type].name.toLowerCase()} type`, d => { d.taste.type = ty.dataset.type; }); return; }
  const hu = t.closest('[data-hue]');
  if (hu) { commit(`Changed colour to ${HUES[hu.dataset.hue].name}`, d => { d.taste.hue = hu.dataset.hue; }); return; }
  const say = t.closest('[data-say]');
  if (say) { runCommand(say.dataset.say); return; }
  const st = t.closest('[data-stage]');
  if (st) { setStage(st.dataset.stage); return; }
  const h = t.closest('[data-hist]');
  if (h) { const v = h.dataset.hist; app.viewing = v === 'now' ? null : Number(v); closePop(); render(); return; }
});
panel.addEventListener('input', e => {
  const f = e.target.closest('[data-site]');
  if (f) $$(`#site [data-path="site.${f.dataset.site}"]`).forEach(x => { x.textContent = f.value; x.classList.add('mirror'); });
  const dial = e.target.closest('[data-dial]');
  if (dial) applyTaste($('#site'), { ...doc().taste, [dial.dataset.dial]: dial.value / 100 });
});
panel.addEventListener('change', e => {
  const f = e.target.closest('[data-site]');
  if (f) {
    const key = f.dataset.site;
    $$('#site .mirror').forEach(x => x.classList.remove('mirror'));
    if (doc().site[key] !== f.value) commit(`Changed your ${FACTS[key].toLowerCase()}`, d => { d.site[key] = f.value; }, { panel: false });
    return;
  }
  const dial = e.target.closest('[data-dial]');
  if (dial) {
    const k = dial.dataset.dial, v = dial.value / 100, old = doc().taste[k];
    const label = k === 'space' ? (v > old ? 'More breathing room' : 'Tighter spacing') : (v > old ? 'Livelier' : 'Calmer');
    commit(label, d => { d.taste[k] = v; });
  }
});
// Hover to try on a look
panel.addEventListener('mouseover', e => {
  const pr = e.target.closest('[data-preset],[data-type],[data-hue]');
  if (!pr || app.stage !== 'site') return;
  const t = { ...doc().taste };
  if (pr.dataset.preset) Object.assign(t, PRESETS.find(x => x.id === pr.dataset.preset).taste);
  if (pr.dataset.type) t.type = pr.dataset.type;
  if (pr.dataset.hue) t.hue = pr.dataset.hue;
  applyTaste($('#site'), t);
});
panel.addEventListener('mouseout', e => {
  const pr = e.target.closest('[data-preset],[data-type],[data-hue]');
  if (pr && !pr.contains(e.relatedTarget)) applyTaste($('#site'), viewDoc().taste);
});

// Banner
$('#banner').addEventListener('click', e => {
  const b = e.target.closest('[data-b]');
  if (!b) return;
  if (b.dataset.b === 'now') { app.viewing = null; render(); }
  if (b.dataset.b === 'site') setStage('site');
  if (b.dataset.b === 'bring') {
    const i = app.viewing;
    const s = clone(stateAt(i));
    const label = i < 0 ? 'the start' : `“${app.past[i].label}”`;
    commit(`Went back to ${label}`, () => { app.live = s.live; app.draft = s.draft; });
    receipt(`Brought back your site as it was at ${label}`, { undo: true });
  }
});

// Top bar
$('#page-select').addEventListener('change', e => go(e.target.value));
$('#plumb').addEventListener('change', e => { app.plumbing = e.target.checked; render(); });
$('#preview').addEventListener('change', e => { app.preview = e.target.checked; closePop(); render(); });
$('#undo').addEventListener('click', undo);
$('#redo').addEventListener('click', redo);
$('#reset').addEventListener('click', () => { commit('Started again', () => { app.live = sampleDoc(); app.draft = null; }); app.pageId = 'home'; app.stage = 'site'; render(); receipt('Back to the sample studio. Undo if you didn’t mean it.', { undo: true }); });
$('#tb-draft').addEventListener('click', e => {
  const b = e.target.closest('[data-d]');
  if (!b) return;
  const a = b.dataset.d;
  if (a === 'start') startDraft();
  if (a === 'compare') openCompare();
  if (a === 'publish') { commit('Published your draft', () => { app.live = app.draft; app.draft = null; }); receipt('Published. Visitors now see your changes.', { undo: true }); }
  if (a === 'discard') { commit('Threw away your draft', () => { app.draft = null; }); receipt('Draft thrown away. The live site never changed.', { undo: true }); }
});
$('#compare').addEventListener('click', e => {
  const b = e.target.closest('[data-c]');
  if (!b) return;
  $('#compare').hidden = true;
  if (b.dataset.c === 'publish') { commit('Published your draft', () => { app.live = app.draft; app.draft = null; }); receipt('Published. Visitors now see your changes.', { undo: true }); }
});

// Command bar
const input = $('#cmd-input');
function showSuggest() {
  const s = $('#suggest');
  s.hidden = false;
  s.innerHTML = `<p>Try saying</p>${EXAMPLES.map(x => `<button data-ex="${esc(x)}">${esc(x)}</button>`).join('')}`;
}
input.addEventListener('focus', () => { if (!input.value) showSuggest(); });
input.addEventListener('input', () => { $('#suggest').hidden = !!input.value; });
input.addEventListener('blur', () => setTimeout(() => { $('#suggest').hidden = true; }, 150));
input.addEventListener('keydown', e => { if (e.key === 'Escape') { input.value = ''; input.blur(); } });
$('#cmd').addEventListener('submit', e => {
  e.preventDefault();
  const v = input.value;
  if (!v.trim()) return;
  input.value = '';
  $('#suggest').hidden = true;
  runCommand(v);
});
$('#cmd-wrap').addEventListener('mousedown', e => { if (e.target.closest('[data-ex]')) e.preventDefault(); });
$('#cmd-wrap').addEventListener('click', e => {
  const ex = e.target.closest('[data-ex]');
  if (ex) { input.value = ''; $('#suggest').hidden = true; runCommand(ex.dataset.ex); return; }
  if (e.target.closest('[data-rundo]')) { $('#receipt').hidden = true; undo(); return; }
  if (e.target.closest('[data-rredo]')) { $('#receipt').hidden = true; redo(); return; }
  if (e.target.closest('[data-rx]')) { $('#receipt').hidden = true; return; }
  const o = e.target.closest('[data-ropen]');
  if (o) {
    const [coll, id] = o.dataset.ropen.split(':');
    const el = $(`#site [data-item="${coll}:${id}"]`) || $(`#panel [data-open="${coll}:${id}"]`) || o;
    openItem(coll, id, el);
  }
});

// Keyboard
document.addEventListener('keydown', e => {
  const inField = e.target.closest('input, textarea, select, [contenteditable="plaintext-only"], [contenteditable="true"]');
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !inField) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !inField) { e.preventDefault(); redo(); return; }
  if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) && !inField) { e.preventDefault(); input.focus(); return; }
  if (e.key === 'Escape') { closePop(); if (!$('#compare').hidden) $('#compare').hidden = true; }
});

$('#stage').addEventListener('scroll', () => {
  if (activeEdit) placePill(activeEdit);
  if (!pop().hidden && pop()._anchor?.isConnected && $('#site').contains(pop()._anchor)) placePop(pop()._anchor);
}, { passive: true });
addEventListener('resize', () => { if (!$('#compare').hidden) fitCompare(); });

render();
