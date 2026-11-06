'use strict';

/* ==================================================================
   Klee: a website generated from what you say and what you do.

   The site is never coded and never stored. What's stored is the
   INPUTS: a brief, opinions, and your direct edits. A pipeline turns
   inputs into a page in stages (plan → look → sections → your edits),
   each stage cached under a hash of exactly what it read. Same inputs,
   same site, every time; change one input and only the stages that
   read it run again.

   The "model" here is a seeded stand-in: rules plus a pseudo-random
   generator keyed by the inputs. It stands where a language model
   would, behind the same cache, so the editing experience is what's
   being tested, not the generation.
   ================================================================== */

/* ---------- Utilities ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const titleCase = s => s.replace(/\b([a-z])([a-z']*)/g, (m, a, b, i) => (i > 0 && /^(a|an|and|the|of|in|on|to|for|at|by|or)$/.test(m) ? m : a.toUpperCase() + b));

function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined)
      .map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
const hash = v => cyrb53(typeof v === 'string' ? v : canon(v)).toString(16).padStart(14, '0');
const short = h => '#' + String(h).slice(0, 7);
function rngFrom(...parts) {
  let a = cyrb53(parts.map(p => (typeof p === 'string' ? p : canon(p))).join('|')) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
function getPath(o, path) {
  return path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);
}
function setPath(o, path, val) {
  const ks = path.split('.');
  const last = ks.pop();
  const t = ks.reduce((v, k) => (v == null ? undefined : v[k]), o);
  if (t != null) t[last] = val;
}

/* ==================================================================
   The vocabulary: kinds of site, section types and their layouts.
   Everything the model can say has to be made of these.
   ================================================================== */

const PIPELINE = 'klee-1';
const MODELS = {
  'stand-in-1': 'Stand-in 1',
  'stand-in-2': 'Stand-in 2 (newer)',
};
const COST = { plan: 900, look: 650, sections: 1500 };
const STAGES = [
  ['plan', 'Plan', 'What the site is and which sections it needs'],
  ['look', 'Look', 'Colours, type, spacing and shapes'],
  ['sections', 'Sections', 'Layouts and words for every section'],
  ['edits', 'Your edits', 'Your own changes, applied on top. No model needed'],
];

const KINDS = {
  food: {
    label: 'Bakery or café', test: /\b(bak\w*|bread|caf[eé]|coffee|restaurant|kitchen|pastr\w*|cakes?|deli|bistro|pizza\w*|tea ?room)\b/,
    hue: 24, things: ['bread', 'pastries', 'coffee'], offer: 'Menu', ev: 'classes',
    plan: ['hero', 'intro', 'offerings', 'gallery', 'testimonial', 'visit', 'cta'],
  },
  music: {
    label: 'Band or musician', test: /\b(band|music\w*|gigs?|album|songs?|singer|choir|dj|records?)\b/,
    hue: 262, things: ['loud songs', 'quiet songs', 'live shows'], offer: 'Records', ev: 'gigs',
    plan: ['hero', 'events', 'intro', 'gallery', 'cta'],
  },
  club: {
    label: 'Club or community group', test: /\b(club|charity|foundation|volunteers?|community|trails?|cycling|riding|running|society|group|association)\b/,
    hue: 150, things: ['rides', 'skills sessions', 'socials'], offer: 'Membership', ev: 'events',
    plan: ['hero', 'intro', 'features', 'events', 'gallery', 'cta'],
  },
  maker: {
    label: 'Maker or craft studio', test: /\b(potter\w*|ceramic\w*|crafts?|print\w*|jewel\w*|woodwork\w*|makers?|weav\w*|knit\w*|glass|handmade|kiln)\b/,
    hue: 16, things: ['mugs', 'bowls', 'vases'], offer: 'Shop', ev: 'classes',
    plan: ['hero', 'offerings', 'intro', 'gallery', 'testimonial', 'visit', 'cta'],
  },
  pro: {
    label: 'Studio or consultancy', test: /\b(design\w*|consult\w*|agency|freelanc\w*|architect\w*|photograph\w*|developers?|studio)\b/,
    hue: 218, things: ['strategy', 'design', 'websites'], offer: 'Services', ev: 'workshops',
    plan: ['hero', 'features', 'gallery', 'testimonial', 'intro', 'cta'],
  },
};
const KIND_ORDER = ['food', 'music', 'club', 'maker', 'pro'];

const LAYOUTS = {
  hero: ['split', 'split-flip', 'over', 'stacked'],
  intro: ['split', 'split-flip', 'centred'],
  offerings: ['cards', 'list', 'rows'],
  features: ['cards', 'list'],
  events: ['list', 'cards'],
  gallery: ['grid', 'mosaic'],
  testimonial: ['quote', 'card'],
  visit: ['split', 'centred'],
  cta: ['band', 'card'],
  faq: ['list', 'columns'],
};
const SIMPLEST = { hero: 'stacked', intro: 'centred', offerings: 'list', features: 'list', events: 'list', gallery: 'grid', testimonial: 'quote', visit: 'centred', cta: 'card', faq: 'list' };
const BOLDEST = { hero: 'over', intro: 'split', offerings: 'cards', features: 'cards', events: 'cards', gallery: 'mosaic', testimonial: 'quote', visit: 'split', cta: 'band', faq: 'columns' };
const LAYOUT_NAMES = { split: 'text beside a picture', 'split-flip': 'picture beside the text', over: 'text over a big picture', stacked: 'centred, picture below', centred: 'centred', cards: 'cards', list: 'a simple list', rows: 'picture rows', grid: 'an even grid', mosaic: 'a mosaic', quote: 'a big quote', card: 'a card', band: 'a full-width band', columns: 'two columns' };

function secLabel(type, plan) {
  const K = KINDS[plan.kindKey];
  return ({
    hero: 'Hero', intro: 'About', offerings: K.offer, features: 'What we do',
    events: cap(plan.evWord || K.ev), gallery: 'Gallery', testimonial: 'Testimonial',
    visit: 'Visit', cta: 'Sign-up', faq: 'Questions',
  })[type] || cap(type);
}
const FIELD_NAMES = { heading: 'heading', body: 'text', button: 'button', quote: 'quote', who: 'quote credit', hours: 'opening hours' };
function fieldLabel(path) {
  const m = path.match(/^items\.(\d+)\.(\w+)$/);
  if (m) return `item ${+m[1] + 1} ${({ title: 'title', body: 'text', price: 'price', when: 'date', q: 'question', a: 'answer' })[m[2]] || m[2]}`;
  return FIELD_NAMES[path] || path;
}

/* ---------- Reading the brief ---------- */
function readBrief(brief) {
  const b = brief || '';
  const low = b.toLowerCase();
  let kindKey = 'pro', kindWord = '';
  for (const k of KIND_ORDER) {
    const m = low.match(KINDS[k].test);
    if (m) { kindKey = k; kindWord = m[0]; break; }
  }
  const place = (b.match(/\b(?:in|from|near)\s+([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?)/) || [])[1] || '';
  let things = [];
  const m = b.match(/\b(?:we|i|they)?\s*(?:bake|bakes|make|makes|sell|sells|play|plays|run|runs|design|designs|build|builds|serve|serves|grow|grows|throw|throws|teach|teaches|organise|organises|organize|organizes|offer|offers|do)\s+([^.;!?]+)/i);
  if (m) {
    things = m[1].split(/,|\band\b|&/i)
      .map(s => s.trim()
        .replace(/\b(every|each|on|at|for|from|in|to|with|since|all|by)\b.*$/i, '')
        .replace(/^(a|an|the|some|our|lots of|plenty of)\s+/i, '')
        .trim().toLowerCase())
      .filter(s => s && s.split(/\s+/).length <= 3 && !/^(we|i|they|run|do)\b/.test(s));
  }
  const K = KINDS[kindKey];
  for (const t of K.things) if (things.length < 3 && !things.includes(t)) things.push(t);
  const evWord = (low.match(/\b(classes|workshops|gigs|shows|rides|sessions|events|courses|tours|meetups|talks|tastings)\b/) || [])[1] || '';
  const tone = /luxur|premium|bespoke|exclusive|fine dining/.test(low) ? 'refined'
    : /\b(loud|punk|fun|playful|wild|noisy|silly)\b/.test(low) ? 'lively'
      : /\b(small|family|friendly|local|neighbourhood|cosy|cozy|welcoming)\b/.test(low) ? 'warm' : 'plain';
  return { kindKey, kindWord, place, things: things.slice(0, 3), evWord, tone, low };
}

/* ==================================================================
   Opinions: what the stand-in model understands.
   ================================================================== */

const COLOURS = { red: 4, crimson: 350, orange: 26, terracotta: 16, rust: 14, coral: 10, yellow: 46, mustard: 42, gold: 40, green: 142, sage: 110, olive: 75, forest: 150, teal: 178, turquoise: 174, blue: 214, navy: 226, indigo: 240, purple: 270, violet: 268, lilac: 280, pink: 334, magenta: 315, brown: 25 };
const TYPE_WORDS = [
  [/^(testimonials?|reviews?|quotes?)$/, 'testimonial'],
  [/^(carousels?|sliders?)$/, 'carousel'],
  [/^(galler(y|ies)|photos|pictures|images)$/, 'gallery'],
  [/^(menu|prices|shop|products|services|offerings?|records)$/, 'offerings'],
  [/^(classes|events|gigs|workshops|calendar|rides|dates)$/, 'events'],
  [/^(newsletter|signup|sign-up|cta|mailing)$/, 'cta'],
  [/^(faqs?|questions)$/, 'faq'],
  [/^(about|story|intro)$/, 'intro'],
  [/^(map|hours|visit|opening|location)$/, 'visit'],
  [/^(features)$/, 'features'],
];
const typeFromWord = w => { for (const [re, t] of TYPE_WORDS) if (re.test(w)) return t; return null; };
const NEG = new Set(['no', 'without', 'remove', 'drop', 'lose', 'hate', 'ditch', 'kill', 'skip', 'delete', 'cut']);
const POS = new Set(['add', 'need', 'needs', 'want', 'include', 'keep', 'like', 'love', 'bring']);

function interpret(text) {
  const t = ' ' + String(text).toLowerCase().replace(/[’]/g, "'").trim() + ' ';
  const fx = [];
  const add = (cat, key, val = true, note = '') => {
    if (!fx.some(f => f.key === key && f.val === val)) fx.push({ cat, key, val, note });
  };
  const has = re => re.test(t);

  // Structure: which sections exist.
  const words = t.match(/[a-z'-]+/g) || [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i], p1 = words[i - 1], p2 = words[i - 2];
    let pol = null;
    if (NEG.has(w) || (w === 'rid' && p1 === 'get')) pol = 'neg';
    else if (POS.has(w)) pol = ['not', "don't", 'dont', 'never'].includes(p1) || ["don't", 'dont'].includes(p2) ? 'neg' : 'pos';
    if (!pol) continue;
    for (let j = i + 1; j <= i + 4 && j < words.length; j++) {
      const ty = typeFromWord(words[j]);
      if (ty) {
        if (ty === 'carousel') add('plan', 'exclude', 'carousel', pol === 'neg' ? 'no carousels (there aren’t any, and there won’t be)' : 'carousels aren’t something it can make');
        else if (!(pol === 'pos' && /^(more|fewer|less)$/.test(words[j - 1]))) add('plan', pol === 'neg' ? 'exclude' : 'include', ty, `${pol === 'neg' ? 'no' : 'add a'} ${ty === 'cta' ? 'sign-up' : ty} section`);
        break;
      }
    }
  }
  if (has(/fewer sections|shorter page|less stuff|too many sections|keep it short|too long\b(?! ?copy)|one screen/)) add('plan', 'fewer', true, 'fewer sections');

  // Look: site-wide feel.
  if (has(/\b(calm|quiet|gentle|relax|serene|peaceful|tone (it )?down|toned down|soothing)/)) add('look', 'mood', -0.3, 'calmer');
  if (has(/(livel|playful|\bfun\b|energ|vibrant|exciting|cheerful|jolly)/)) add('look', 'mood', 0.3, 'livelier');
  if (has(/(premium|luxur|upmarket|elegant|refined|expensive|posh|classy|sophisticat|high[- ]end|fancy)/)) add('look', 'premium', true, 'more premium');
  if (has(/warm/)) add('look', 'temp', 'warm', 'warmer colours');
  if (has(/\b(cool|cooler|cold|colder|crisp)\b/)) add('look', 'temp', 'cool', 'cooler colours');
  if (has(/\b(dark|darker|moody|night)\b/)) add('look', 'dark', true, 'dark');
  if (has(/\b(light|lighter|bright|brighter|pale|paler)\b(?! ?weight)/)) add('look', 'dark', false, 'light');
  if (has(/(breath|\bairy|spacious|more space|more room|roomier|open it up|minimal)/)) add('look', 'space', 0.3, 'more space');
  if (has(/(compact|\btight|dense|denser|less space|squash|cramped)/)) add('look', 'space', -0.3, 'tighter spacing');
  if (has(/(serif|classic|tradition|bookish|editorial|literary|old[- ]fashioned|timeless)/) && !has(/sans/)) add('look', 'type', 'serif', 'classic type');
  if (has(/(modern|clean|techy|geometric|minimal|sleek|contemporary|sans)/)) add('look', 'type', 'modern', 'modern type');
  if (has(/(friendly|rounded|\bround|\bsoft\b|approachable|homely|cosy|cozy)/)) add('look', 'shape', 'round', 'softer, rounder shapes');
  if (has(/(sharp|square|angular|brutal|hard edges|crisp edges)/)) add('look', 'shape', 'sharp', 'sharp corners');
  if (has(/\b(bold|bolder|loud|louder|punchy|striking|dramatic|pop)\b/)) add('look', 'bold', true, 'bolder');
  for (const [name, h] of Object.entries(COLOURS)) {
    if (new RegExp('\\b' + name + '\\b').test(t)) { add('look', 'hue', h, name); break; }
  }

  // Copy: how things are worded.
  if (has(/(sentence case|lower ?case|less shouty|capitals|capitalis|capitaliz|title case)/)) add('copy', 'sentenceCase', true, 'sentence case for headings');
  if (has(/(exclamation|shouting|over-?excited|less excited|too excited|hype|calmer copy|calmer words)/)) add('copy', 'noExclaim', true, 'no exclamation marks');
  if (has(/(concise|short(er)? (copy|text|words|sentences|paragraphs)|fewer words|less (text|copy|words)|wordy|waffl|too long copy|copy is too long|text is too long)/)) add('copy', 'concise', true, 'shorter copy');

  // Layout: how a section is arranged.
  if (has(/(busy|clutter|too much going on|simpl|cleaner|declutter|messy)/)) add('layout', 'simpler', true, 'simpler layout');
  if (has(/(bigger|more impact|grander|make (it|this) sing|hero-?ier)/)) add('layout', 'bolder', true, 'bigger, bolder layout');
  if (has(/(image|photo|picture) (on the )?left|left[- ]hand (image|photo|picture)/)) add('layout', 'image', 'left', 'picture on the left');
  if (has(/(image|photo|picture) (on the )?right|right[- ]hand (image|photo|picture)/)) add('layout', 'image', 'right', 'picture on the right');
  if (has(/cent(er|re)/)) add('layout', 'centre', true, 'centred');
  if (has(/(more (photos|images|pictures)|image[- ]heavy|lead with (photos|images|pictures)|more visual)/)) add('layout', 'moreImages', true, 'more pictures');
  if (has(/(fewer|less) (items|things|cards|options|products|choices)/)) add('layout', 'items', -1, 'fewer items');
  if (has(/more (items|things|cards|options|products|choices)/)) add('layout', 'items', 1, 'more items');
  if (has(/(stand out|highlight|colou?red background|make (it|this) pop)/)) add('layout', 'tone', 'accent', 'a coloured background');
  if (has(/(plain background|white background|no background)/)) add('layout', 'tone', 'plain', 'a plain background');
  return fx;
}

// Section-scoped opinions turn site-wide "look" words into layout changes
// for just that section: "calmer" on one section means simpler, not a new palette.
function effectsFor(op) {
  let fx = interpret(op.text);
  if (op.scope === 'section') {
    fx = fx.flatMap(f => {
      if (f.cat === 'plan' && f.key === 'exclude' && f.val === op.target) return [f];
      if (f.cat === 'plan') return [];
      if (f.cat !== 'look') return [f];
      if (f.key === 'mood') return [{ cat: 'layout', key: f.val < 0 ? 'simpler' : 'bolder', val: true, note: f.val < 0 ? 'simpler layout' : 'bigger, bolder layout' }];
      if (f.key === 'bold') return [{ cat: 'layout', key: 'bolder', val: true, note: 'bigger, bolder layout' }];
      if (f.key === 'premium') return [{ cat: 'layout', key: 'simpler', val: true, note: 'simpler layout' }];
      if (f.key === 'dark') return [{ cat: 'layout', key: 'tone', val: f.val ? 'dark' : 'plain', note: f.val ? 'a dark background' : 'a plain background' }];
      if (f.key === 'hue') return [{ cat: 'layout', key: 'tone', val: 'accent', note: 'a coloured background' }];
      return [];
    });
  }
  return fx;
}
const STAGE_OF = { plan: 'plan', look: 'look', copy: 'sections', layout: 'sections' };

/* ==================================================================
   The pipeline. Each stage is a pure function of its payload and the
   model, cached under a hash of both.
   ================================================================== */

const cache = new Map();
const stageKey = (stage, payload, model) => stage + ':' + hash({ stage, payload, model, pipeline: PIPELINE });

function activeOps(inp, cats) {
  return inp.opinions.filter(o => o.on).map(o => ({
    text: o.text, scope: o.scope, target: o.target || null,
    fx: effectsFor(o).filter(f => cats.includes(f.cat)),
  })).filter(o => o.fx.length);
}
const planPayload = inp => ({ brief: inp.brief, seed: inp.seed, ops: activeOps(inp, ['plan']).map(o => ({ text: o.text, fx: o.fx })) });
const lookPayload = (inp, plan) => ({ kindKey: plan.kindKey, tone: plan.tone, seed: inp.seed, ops: activeOps(inp, ['look']).filter(o => o.scope === 'site').map(o => ({ text: o.text, fx: o.fx })) });
const secPayload = (inp, plan) => ({ plan, seed: inp.seed, ops: activeOps(inp, ['copy', 'layout']) });

function genPlan(p, model) {
  const r = rngFrom(model, 'plan', p.brief, p.seed);
  const br = readBrief(p.brief);
  const K = KINDS[br.kindKey];
  const why = {};
  let types = [...K.plan];
  const kindWhy = br.kindWord ? `The brief says “${br.kindWord}”, so it’s a ${K.label.toLowerCase()} site` : `Nothing in the brief says what kind of site, so a general ${K.label.toLowerCase()} site`;
  types.forEach(t => { why[t] = [`${kindWhy}, and those usually have one`]; });
  if (br.evWord && !types.includes('events')) {
    const at = types.indexOf('offerings') >= 0 ? types.indexOf('offerings') + 1 : 2;
    types.splice(at, 0, 'events');
    why.events = [`The brief mentions ${br.evWord}`];
  }
  if (!types.includes('visit') && /\b(hours|open|visit|address|drop in|come in|shop front)\b/.test(br.low)) {
    types.splice(types.length - 1, 0, 'visit');
    why.visit = ['The brief talks about opening or visiting'];
  }
  if (types.includes('testimonial') && r() < 0.3) {
    types = types.filter(t => t !== 'testimonial');
  }
  if (model === 'stand-in-2' && !types.includes('faq')) {
    types.splice(types.length - 1, 0, 'faq');
    why.faq = ['Stand-in 2 likes to add questions and answers'];
  }
  for (const o of p.ops) {
    for (const f of o.fx) {
      if (f.key === 'exclude' && f.val !== 'carousel') {
        types = types.filter(t => t !== f.val);
      } else if (f.key === 'include' && !types.includes(f.val)) {
        const at = types.includes('cta') ? types.indexOf('cta') : types.length;
        types.splice(at, 0, f.val);
        why[f.val] = [`You said “${o.text}”`];
      } else if (f.key === 'include') {
        why[f.val] = [...(why[f.val] || []), `You said “${o.text}”`];
      } else if (f.key === 'fewer') {
        const body = types.filter(t => t !== 'hero' && t !== 'cta');
        types = ['hero', ...body.slice(0, 2), ...(types.includes('cta') ? ['cta'] : [])];
        types.forEach(t => { why[t] = [...(why[t] || []), `Kept when you said “${o.text}”`]; });
      }
    }
  }
  return {
    kindKey: br.kindKey, kindWord: br.kindWord, place: br.place, things: br.things,
    evWord: br.evWord, tone: br.tone, sections: types, why, kindWhy,
  };
}

const HUE_NAMES = [[12, 'red'], [32, 'terracotta'], [48, 'ochre'], [70, 'mustard'], [100, 'olive'], [160, 'green'], [190, 'teal'], [235, 'blue'], [285, 'violet'], [330, 'plum'], [361, 'red']];
const hueName = h => HUE_NAMES.find(([max]) => h < max)[1];

function genLook(p, model) {
  const r = rngFrom(model, 'look', p.kindKey, p.tone, p.seed);
  const K = KINDS[p.kindKey];
  let hue = (K.hue + Math.round((r() - 0.5) * 26) + 360) % 360;
  let mood = { plain: 0.45, warm: 0.5, refined: 0.25, lively: 0.75 }[p.tone] + (r() - 0.5) * 0.2;
  let space = 0.45 + (r() - 0.5) * 0.3;
  let type = pick(r, { food: ['serif', 'friendly'], maker: ['serif', 'friendly', 'modern'], music: ['modern', 'friendly'], club: ['friendly', 'modern'], pro: ['modern', 'serif'] }[p.kindKey]);
  if (p.tone === 'refined') type = 'serif';
  let shape = mood > 0.62 ? 'round' : 'soft';
  let dark = p.kindKey === 'music' && r() < 0.6;
  let sat = 0.55, bold = false, premium = false;
  if (model === 'stand-in-2') { space += 0.12; sat -= 0.06; }
  const why = [
    `${K.label} sites start ${hueName(hue)}`,
    `The brief reads ${({ plain: 'plain and straightforward', warm: 'warm and local', refined: 'refined', lively: 'lively' })[p.tone]}, so the mood starts ${mood < 0.4 ? 'calm' : mood > 0.6 ? 'lively' : 'in the middle'}`,
  ];
  if (dark) why.push('Band sites are often dark');
  for (const o of p.ops) {
    for (const f of o.fx) {
      switch (f.key) {
        case 'mood': mood += f.val; break;
        case 'temp': hue = f.val === 'warm' ? 28 + (hue % 12) : 205 + (hue % 16); break;
        case 'dark': dark = f.val; break;
        case 'space': space += f.val; break;
        case 'type': type = f.val; break;
        case 'shape': shape = f.val; break;
        case 'bold': bold = true; mood += 0.15; break;
        case 'hue': hue = f.val; break;
        case 'premium': premium = true; type = 'serif'; space += 0.2; mood -= 0.15; sat -= 0.12; break;
      }
      why.push(`“${o.text}” → ${f.note}`);
    }
  }
  return { hue, sat: clamp(sat, 0.15, 0.85), mood: clamp(mood, 0, 1), space: clamp(space, 0, 1), type, shape, dark, bold, premium, why };
}

/* ---------- Words ---------- */
const COPY = {
  hero: {
    h: {
      food: ['Fresh {T0}, Every Morning!', 'Proper {T0}, Baked Slowly', 'Baked in {Place}, Eaten Warm'],
      maker: ['Made by Hand{InPlace}', 'Things to Use Every Day!', 'Slow Made, Well Used'],
      music: ['New Songs, Loud Rooms!', 'Live This Season', 'Turn It Up!'],
      club: ['Come Join Us!', 'Everyone Welcome', 'Find Your People{InPlace}'],
      pro: ['Clear Thinking, Well Made', 'Good Ideas, Shipped!', 'Work That Works'],
    },
    b: {
      food: ['{name} is a small bakery{inplace}. We make {things} from scratch every day, with long fermentation and good flour. Come early, because the {t0} goes fast!', 'Everything at {name} is made by hand before sunrise: {things}, and a good cup of coffee to go with them.'],
      maker: ['{name} makes {things} by hand{inplace}. Every piece is thrown, glazed and fired in our own studio, so no two are quite the same.', 'Useful, lovely things for everyday life. {name} makes {things} in small batches and sells them straight from the studio.'],
      music: ['{name} make {things}{inplace}. Catch us live before the next record lands. The shows are where the songs really happen!', 'Four people, too many pedals and a van that mostly works. {name} play {things} wherever they’ll have us.'],
      club: ['{name} is a friendly group{inplace}. We organise {things} for all abilities, and your first one is always free!', 'Whether you’re brand new or you’ve been at it for years, {name} has {things} for you. Come and say hello.'],
      pro: ['{name} helps teams with {things}{inplace}. We keep things simple, say what we think, and finish what we start.', 'Small team, big care. {name} does {things} for people who want it done properly.'],
    },
    cta: { food: ['See what’s baking', 'Come and visit'], maker: ['Browse the shop', 'Book a class'], music: ['See the dates', 'Listen now'], club: ['Join the club', 'See what’s on'], pro: ['Start a project', 'See our work'] },
    img: { food: 'loaves cooling on the rack', maker: 'shelves of finished pieces', music: 'the band on stage', club: 'the group out together', pro: 'the team at work' },
  },
  intro: {
    h: ['About {name}', 'Our Story', 'Who We Are'],
    b: {
      food: ['We started {name} because we couldn’t find bread we wanted to eat. Ten years on, we still mix every dough by hand and let it take its time. Our {t1} are made with local butter and our {t2} is roasted down the road.', 'A neighbourhood bakery with flour on every surface. We bake for the people who live and work around us, and we know most of them by name.'],
      maker: ['{name} began at a kitchen table with a second-hand wheel. Now there’s a proper studio, a kiln that hums all night, and a small team who love making useful things.', 'We make things to be used, not kept for best. Mugs for your morning, bowls for your supper, and vases for whatever you pick on the way home.'],
      music: ['{name} met at a party where nobody else wanted to play. Three records later, we still don’t. We write {t0} and {t1}, and we’re happiest in a small, sweaty room.', 'We’re a band who believe in volume, friendship and a good chorus.'],
      club: ['{name} started with three friends and a WhatsApp group. Now we’re a proper community of all ages and abilities, run entirely by volunteers.', 'We believe everyone deserves a place to learn, play and belong. That’s it, really.'],
      pro: ['{name} is a small, senior team. You talk to the people doing the work, and we tell you plainly what we think will help.', 'We’ve spent years making {things} for organisations of every size. We like hard problems and clear answers.'],
    },
    img: 'the people behind it',
  },
  offerings: {
    h: { food: ['On the Menu Today', 'What We Bake'], maker: ['In the Shop', 'New from the Studio'], music: ['Records', 'Listen and Buy'], club: ['Membership', 'Ways to Join'], pro: ['What We Do', 'Services'] },
    b: {
      food: ['Baked fresh each morning and usually gone by lunch.', 'Made with organic flour and plenty of patience.', 'A regular favourite. Ask us what’s in it today.', 'Seasonal, so it changes every few weeks.'],
      maker: ['Thrown on the wheel and glazed in our own colours.', 'Made in small batches, so each one is a little different.', 'Dishwasher safe, and nice to hold.', 'A studio favourite that keeps selling out.'],
      music: ['Our latest, on vinyl, CD and everywhere you stream.', 'The one people still shout for at the end.', 'Recorded live in one take, mistakes and all.', 'Limited pressing, signed if you ask nicely.'],
      club: ['Everything you need to get started, all year round.', 'For families who want to come along together.', 'Half price for students and under-18s.', 'For people who want to help run things.'],
      pro: ['Find out what matters before anyone builds anything.', 'Clear, careful work that people actually enjoy using.', 'Built properly, handed over cleanly, supported after.', 'An extra pair of senior hands when you need one.'],
    },
    extra: { food: 'seasonal specials', maker: 'gift sets', music: 'merch', club: 'volunteering', pro: 'training' },
    price: { food: [3, 9, '£{n}.50'], maker: [18, 65, '£{n}'], music: [10, 25, '£{n}'], club: [20, 60, '£{n} a year'], pro: [2, 12, 'From £{n},000'] },
  },
  events: {
    h: ['Coming Up', '{Ev} This Season', 'Upcoming {Ev}'],
    t: {
      food: ['Sourdough for Beginners', 'A Morning of Pastry', 'Bread and Butter Club', 'Pizza Night'],
      maker: ['Throwing Taster', 'Glazing Afternoon', 'Six-Week Wheel Course', 'Kiln Opening Party'],
      music: ['Album Launch', 'Festival Set', 'Acoustic Night', 'Hometown Show'],
      club: ['Saturday Social', 'Skills Session', 'Summer Weekender', 'Beginners’ Morning'],
      pro: ['Open Studio', 'Design Clinic', 'Lunch and Learn', 'Portfolio Night'],
    },
    when: ['Saturdays, 10am', 'Thursday evenings', 'First Sunday of the month', 'Every Wednesday, 7pm', 'Sunday, 2pm', 'Friday night'],
    b: ['Small groups, all welcome, no experience needed.', 'Booking essential, as places go quickly!', 'Bring a friend, and leave with something you made.', 'Tickets on the door, or book ahead to be sure.'],
  },
  features: {
    h: ['What We Do', 'How It Works', 'Why People Come Back'],
    b: ['We keep it simple and make sure everyone feels welcome.', 'Run by people who care, for people who want to get better.', 'Every week, all year, whatever the weather.', 'Good company, and tea afterwards.'],
  },
  gallery: { h: ['A Look Inside', 'Recent Work', 'Behind the Scenes'], extra: { food: ['the counter', 'early morning', 'the oven', 'the queue', 'flour everywhere', 'Saturday'], maker: ['the wheel', 'the glaze shelf', 'the kiln', 'packing orders', 'drying racks', 'the shop'], music: ['the crowd', 'the van', 'sound check', 'the studio', 'backstage', 'the merch table'], club: ['the start line', 'the clubhouse', 'tea afterwards', 'muddy boots', 'the summer trip', 'awards night'], pro: ['the whiteboard', 'a workshop', 'the studio', 'launch day', 'sketches', 'the team'] } },
  testimonial: {
    q: {
      food: ['The best {t0} I’ve had outside of Paris, and they know my order before I do!', 'Our Saturday mornings revolve around this place. The {t1} alone are worth the queue.'],
      maker: ['I use my mug from {name} every single morning. It just feels right in your hand.', 'Beautiful work, and the class was the most relaxing three hours of my year!'],
      music: ['Loud, joyful and genuinely moving. Go and see them before everyone else does!', 'The best live band I’ve seen in years.'],
      club: ['I turned up knowing nobody, and now these are my best friends.', 'Brilliant for beginners. Nobody makes you feel slow!'],
      pro: ['They told us what we needed to hear, then built exactly what we needed.', 'Calm, clear and very good. We’ll keep working with them.'],
    },
    who: ['A regular{commaPlace}', 'Jo, a customer since 2019', 'Sam, who comes every week'],
  },
  visit: {
    h: ['Visit Us', 'Come and Say Hello', 'Find Us'],
    b: ['We’re at [address]{inplace}. Pop in for a chat, or just to see what’s new.', 'You’ll find us at [address]{inplace}. There’s parking round the back and a bench out front.'],
    hours: ['Tuesday to Saturday, 8am to 3pm. Closed Sunday and Monday.', 'Wednesday to Sunday, 9am to 4pm.'],
  },
  cta: {
    h: { food: ['Get First Dibs!', 'Hear About Specials'], maker: ['Be First to the Kiln Opening', 'Hear About New Work!'], music: ['Join the Mailing List!', 'Never Miss a Show'], club: ['Ready to Join?', 'Come Along This Week!'], pro: ['Let’s Talk!', 'Got a Project?'] },
    b: ['One short email a month. No spam, ever!', 'Sign up and we’ll let you know what’s coming before anyone else.'],
    btn: ['Sign me up', 'Keep me posted', 'Count me in'],
  },
  faq: {
    h: ['Questions and Answers', 'Good to Know'],
    items: [['Can I book for a group?', 'Yes! Get in touch and we’ll sort something out.'], ['Do you do gift cards?', 'We do, in any amount, and they never expire.'], ['Is it accessible?', 'There’s step-free access and an accessible toilet.'], ['How do I get in touch?', 'Email us at [email] and we’ll reply within a day.']],
  },
};

function fill(s, ctx) {
  return s
    .replaceAll('{T0}', titleCase(ctx.things[0])).replaceAll('{t0}', ctx.things[0])
    .replaceAll('{t1}', ctx.things[1]).replaceAll('{t2}', ctx.things[2])
    .replaceAll('{things}', `${ctx.things[0]}, ${ctx.things[1]} and ${ctx.things[2]}`)
    .replaceAll('{Place}', ctx.place).replaceAll('{InPlace}', ctx.place ? ` in ${ctx.place}` : '')
    .replaceAll('{inplace}', ctx.place ? ` in ${ctx.place}` : '')
    .replaceAll('{commaPlace}', ctx.place ? `, ${ctx.place}` : '')
    .replaceAll('{Ev}', titleCase(ctx.ev));
}
const pickT = (r, list, ctx) => { const ok = list.filter(s => ctx.place || !/\{Place\}/.test(s)); return pick(r, ok.length ? ok : list); };

const isProper = (w, ctx) => /^\{name\}/.test(w) || (ctx && ctx.proper.some(p => p && p.split(/\s+/).includes(w.replace(/[^\w'’-]/g, ''))));
function sentenceCase(s, ctx) {
  let first = true;
  return s.replace(/[A-Za-z{][\w'’{}-]*/g, w => {
    if (first) { first = false; return w; }
    if (w === 'I' || isProper(w, ctx) || /^[A-Z]{2,}$/.test(w)) return w;
    return w.toLowerCase();
  });
}

function genSection(type, plan, ops, seed, model, index = 0) {
  const r = rngFrom(model, 'sec', type, seed, plan.kindKey);
  const kk = plan.kindKey;
  const ctx = { things: plan.things, place: plan.place, ev: plan.evWord || KINDS[kk].ev, proper: [plan.place] };
  const mine = ops.filter(o => o.scope === 'site' || o.target === type);
  const fx = mine.flatMap(o => o.fx.map(f => ({ ...f, from: o.text, scope: o.scope })));
  const why = [...(plan.why[type] || [])];
  let layout = pick(r, LAYOUTS[type]);
  why.push(`The model chose ${LAYOUT_NAMES[layout]} for the layout`);
  let tone = type === 'cta' ? pick(r, ['accent', 'dark']) : type === 'hero' ? pick(r, ['plain', 'tint']) : (index % 2 ? 'tint' : 'plain');
  let items = 3, big = false, quiet = false, moreImages = false;
  const siteMore = fx.some(f => f.key === 'moreImages' && f.scope === 'site');
  for (const f of fx) {
    if (f.cat !== 'layout') continue;
    const says = `“${f.from}”${f.scope === 'section' ? ' (this section)' : ''} → ${f.note}`;
    if (f.key === 'simpler') { layout = SIMPLEST[type]; items = Math.min(items, 2); quiet = true; big = false; why.push(says); }
    if (f.key === 'bolder') { layout = BOLDEST[type]; big = true; quiet = false; why.push(says); }
    if (f.key === 'image' && /split/.test(layout)) { layout = f.val === 'left' ? 'split-flip' : 'split'; why.push(says); }
    if (f.key === 'image' && LAYOUTS[type].includes('split') && !/split/.test(layout) && f.scope === 'section') { layout = f.val === 'left' ? 'split-flip' : 'split'; why.push(says); }
    if (f.key === 'centre') { const c = LAYOUTS[type].find(l => l === 'centred' || l === 'stacked' || l === 'quote'); if (c) { layout = c; why.push(says); } }
    if (f.key === 'moreImages') { moreImages = true; if (type === 'gallery' || f.scope === 'section') why.push(says); }
    if (f.key === 'items') { items = clamp(items + f.val, 2, 4); why.push(says); }
    if (f.key === 'tone') { tone = f.val; why.push(says); }
  }
  if (siteMore && type === 'hero' && layout === 'stacked') layout = 'over';

  const c = {};
  switch (type) {
    case 'hero':
      c.heading = fill(pickT(r, COPY.hero.h[kk], ctx), ctx);
      c.body = fill(pick(r, COPY.hero.b[kk]), ctx);
      c.button = pick(r, COPY.hero.cta[kk]);
      c.image = COPY.hero.img[kk];
      break;
    case 'intro':
      c.heading = fill(pick(r, COPY.intro.h), ctx);
      c.body = fill(pick(r, COPY.intro.b[kk]), ctx);
      c.image = COPY.intro.img;
      break;
    case 'offerings': {
      c.heading = pick(r, COPY.offerings.h[kk]);
      const names = [...plan.things, COPY.offerings.extra[kk]];
      const [lo, hi, fmt] = COPY.offerings.price[kk];
      const bodies = [...COPY.offerings.b[kk]];
      c.items = names.slice(0, items).map((t, i) => ({
        title: titleCase(t), body: bodies.splice(Math.floor(r() * bodies.length), 1)[0],
        price: fmt.replace('{n}', lo + Math.floor(r() * (hi - lo))), image: t,
      }));
      break;
    }
    case 'events': {
      c.heading = fill(pick(r, COPY.events.h), ctx);
      const ts = [...COPY.events.t[kk]], ws = [...COPY.events.when];
      c.items = Array.from({ length: items }, (_, i) => ({
        title: ts.splice(Math.floor(r() * ts.length), 1)[0],
        when: ws.splice(Math.floor(r() * ws.length), 1)[0],
        body: COPY.events.b[(i + Math.floor(r() * 4)) % 4],
      }));
      break;
    }
    case 'features': {
      c.heading = pick(r, COPY.features.h);
      const bs = [...COPY.features.b];
      c.items = [...plan.things, COPY.offerings.extra[kk]].slice(0, items).map(t => ({ title: titleCase(t), body: bs.splice(Math.floor(r() * bs.length), 1)[0] }));
      break;
    }
    case 'gallery': {
      c.heading = pick(r, COPY.gallery.h);
      const n = moreImages || siteMore ? 6 : (r() < 0.5 ? 3 : 4);
      c.images = [...plan.things, ...COPY.gallery.extra[kk]].slice(0, n);
      break;
    }
    case 'testimonial':
      c.quote = fill(pick(r, COPY.testimonial.q[kk]), ctx);
      c.who = fill(pick(r, COPY.testimonial.who), ctx);
      break;
    case 'visit':
      c.heading = pick(r, COPY.visit.h);
      c.body = fill(pick(r, COPY.visit.b), ctx);
      c.hours = pick(r, COPY.visit.hours);
      break;
    case 'cta':
      c.heading = pick(r, COPY.cta.h[kk]);
      c.body = pick(r, COPY.cta.b);
      c.button = pick(r, COPY.cta.btn);
      break;
    case 'faq':
      c.heading = pick(r, COPY.faq.h);
      c.items = COPY.faq.items.slice(0, Math.max(items, 3)).map(([q, a]) => ({ q, a }));
      break;
  }
  if ((moreImages && f_has(fx, 'moreImages', 'section')) && (type === 'intro' || type === 'visit') && layout === 'centred') layout = 'split';

  // Copy opinions rewrite the words the model just chose.
  for (const f of fx) {
    if (f.cat !== 'copy') continue;
    let touched = false;
    const each = (fn, keys) => {
      for (const k of keys) if (typeof c[k] === 'string') { const v = fn(c[k], k); if (v !== c[k]) { c[k] = v; touched = true; } }
      for (const it of c.items || []) for (const k of Object.keys(it)) if (keys.includes(k === 'title' || k === 'q' ? 'heading' : k === 'a' ? 'body' : k)) { const v = fn(it[k], k); if (v !== it[k]) { it[k] = v; touched = true; } }
    };
    if (f.key === 'sentenceCase') each(v => sentenceCase(v, ctx), ['heading']);
    if (f.key === 'noExclaim') each((v, k) => (/^(heading|title|q|button)$/.test(k) ? v.replace(/!/g, '') : v.replace(/!/g, '.')), ['heading', 'body', 'button', 'quote', 'who']);
    if (f.key === 'concise') each(v => (v.match(/^.*?[.!?](?=\s|$)/) || [v])[0], ['body', 'quote']);
    if (touched) why.push(`“${f.from}” → ${f.note}`);
  }
  return { id: type, type, layout, tone, big, quiet, content: c, why };
}
const f_has = (fx, key, scope) => fx.some(f => f.key === key && (!scope || f.scope === scope));

function genSections(p, model) {
  return p.plan.sections.map((t, i) => genSection(t, p.plan, p.ops, p.seed, model, i));
}

/* ---------- Your edits, applied on top (no model) ---------- */
function mergeOrder(order, list) {
  const res = order.filter(id => list.includes(id));
  list.forEach((id, i) => {
    if (res.includes(id)) return;
    const before = list.slice(0, i).reverse().find(x => res.includes(x));
    res.splice(before ? res.indexOf(before) + 1 : 0, 0, id);
  });
  return res;
}
const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim();

function applyEdits(gen, inp) {
  const byId = Object.fromEntries(gen.map(s => [s.id, s]));
  let ids = gen.map(s => s.id);
  for (const [sid, pin] of Object.entries(inp.pins)) {
    if (!byId[sid]) ids.splice(clamp(pin.index, 0, ids.length), 0, sid);
    byId[sid] = pin.snapshot;
  }
  ids = ids.filter(id => !inp.removed.includes(id));
  if (inp.order) ids = mergeOrder(inp.order, ids);
  const sections = ids.map(id => ({ ...clone(byId[id]), pinned: !!inp.pins[id], edited: [] }));
  const conflicts = [], dormant = [];
  for (const [key, e] of Object.entries(inp.edits)) {
    const [sid, path] = key.split(':');
    const s = sections.find(x => x.id === sid);
    const cur = s && getPath(s.content, path);
    if (cur === undefined) { dormant.push(key); continue; }
    if (norm(cur) !== norm(e.from) && norm(cur) !== norm(e.value)) conflicts.push({ key, wanted: cur, kept: e.value });
    setPath(s.content, path, e.value);
    s.edited.push(path);
  }
  return { sections, conflicts, dormant };
}

/* ---------- Running it ---------- */
async function stage(name, key, fn, ui) {
  if (cache.has(key)) { ui && setPipe(name, 'cached'); return cache.get(key); }
  if (ui) { setPipe(name, 'running'); await sleep(COST[name]); }
  const out = fn();
  cache.set(key, out);
  ui && setPipe(name, 'ran');
  return out;
}
async function build(inp, { ui = true } = {}) {
  if (ui) STAGES.forEach(([s]) => setPipe(s, 'waiting'));
  const m = inp.model;
  const pp = planPayload(inp);
  const pk = stageKey('plan', pp, m);
  const plan = await stage('plan', pk, () => genPlan(pp, m), ui);
  const lp = lookPayload(inp, plan);
  const lk = stageKey('look', lp, m);
  const look = await stage('look', lk, () => genLook(lp, m), ui);
  const sp = secPayload(inp, plan);
  const sk = stageKey('sections', sp, m);
  const gen = await stage('sections', sk, () => genSections(sp, m), ui);
  const applied = applyEdits(gen, inp);
  ui && setPipe('edits', Object.keys(inp.edits).length || inp.removed.length || inp.order || Object.keys(inp.pins).length ? 'ran' : 'cached');
  const res = { inp: clone(inp), plan, look, gen, ...applied, keys: { plan: pk, look: lk, sections: sk } };
  res.inputsHash = hash(inp);
  res.hash = hash({ name: inp.name, look: { ...look, why: undefined }, sections: applied.sections.map(s => ({ ...s, why: undefined })) });
  return res;
}
// Which stages would have to run for these inputs? (Cheap: no waiting.)
function wouldRun(inp) {
  const m = inp.model;
  const pp = planPayload(inp), pk = stageKey('plan', pp, m);
  const plan = cache.get(pk) || genPlan(pp, m);
  const lk = stageKey('look', lookPayload(inp, plan), m);
  const sk = stageKey('sections', secPayload(inp, plan), m);
  return [['plan', pk], ['look', lk], ['sections', sk]].filter(([, k]) => !cache.has(k)).map(([s]) => s);
}

/* ==================================================================
   Rendering: the only real code. A fixed function from spec to HTML.
   ================================================================== */

function hslToRgb(h, s, l) {
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}
const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(clamp(s, 0, 1) * 100)}% ${Math.round(clamp(l, 0, 1) * 100)}%)`;
function lum([r, g, b]) {
  const c = v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}
function inkFor(h, s, l) {
  const L = lum(hslToRgb(h, clamp(s, 0, 1), clamp(l, 0, 1)));
  return (1.05) / (L + 0.05) >= (L + 0.05) / 0.06 ? '#fff' : '#141414';
}
function tokens(lk) {
  const h = lk.hue;
  const s = clamp(lk.sat + (lk.mood - 0.5) * 0.3, 0.12, 0.9);
  const d = lk.dark;
  const accL = d ? 0.64 : lk.premium ? 0.3 : 0.42 - lk.mood * 0.05;
  const scale = 1.17 + lk.mood * 0.14 + (lk.bold ? 0.07 : 0);
  const fonts = {
    serif: ["'Fraunces', Georgia, serif", "'Newsreader', Georgia, serif", 500],
    modern: ["'Instrument Sans', system-ui, sans-serif", "'Instrument Sans', system-ui, sans-serif", 650],
    friendly: ["'Bricolage Grotesque', system-ui, sans-serif", "'Instrument Sans', system-ui, sans-serif", 650],
  }[lk.type];
  return {
    '--bg': d ? hsl(h, s * 0.25, 0.09) : hsl(h, s * 0.45, lk.premium ? 0.975 : 0.965),
    '--surface': d ? hsl(h, s * 0.3, 0.14) : hsl(h, s * 0.55, 0.915),
    '--ink': d ? hsl(h, 0.15, 0.93) : hsl(h, 0.3, 0.11),
    '--muted': d ? hsl(h, 0.1, 0.7) : hsl(h, 0.14, 0.34),
    '--accent': hsl(h, s + 0.1, accL),
    '--accent-ink': inkFor(h, s + 0.1, accL),
    '--dark': d ? hsl(h, s * 0.35, 0.18) : hsl(h, 0.3, 0.13),
    '--dark-ink': hsl(h, 0.15, 0.94),
    '--f-display': fonts[0], '--f-body': fonts[1], '--w-display': fonts[2],
    '--h1': `${Math.round(clamp(16 * scale ** 5, 40, 78))}px`,
    '--h2': `${Math.round(clamp(16 * scale ** 3.4, 28, 50))}px`,
    '--h3': `${Math.round(16 * scale ** 1.4)}px`,
    '--pad': `${Math.round(52 + lk.space * 84)}px`,
    '--gap': `${Math.round(14 + lk.space * 22)}px`,
    '--radius': `${lk.shape === 'sharp' ? 0 : lk.shape === 'round' ? 22 : 6 + Math.round(lk.mood * 6)}px`,
    '--btn-radius': `${lk.shape === 'sharp' ? 0 : lk.shape === 'round' ? 999 : 6 + Math.round(lk.mood * 6)}px`,
  };
}

function renderSite(res, o = {}) {
  const { edit = false, review = null, prevRes = null } = o;
  const name = res.inp.name;
  const T = tokens(res.look);
  const style = Object.entries(T).map(([k, v]) => `${k}:${v}`).join(';');
  const put = s => esc(String(s ?? '').replaceAll('{name}', name));
  const nav = res.sections.filter(s => ['intro', 'offerings', 'events', 'visit', 'features', 'faq'].includes(s.type)).slice(0, 4);

  const secHTML = (s, from = res, extra = '') => {
    const E = (path, tag = 'span', cls = '') => {
      const val = getPath(s.content, path);
      const mine = s.edited && s.edited.includes(path);
      const kept = review && review.conflictKeys.has(`${s.id}:${path}`);
      return `<${tag} class="${cls}${edit ? ' ed' : ''}${mine ? ' mine' : ''}${kept ? ' kept' : ''}" data-path="${s.id}:${path}"${edit ? ' contenteditable="plaintext-only" spellcheck="false"' : ''}>${put(val)}</${tag}>`;
    };
    const ph = (label, cls = '') => `<div class="ph ${cls}" role="img" aria-label="Photo: ${esc(label)}"><span>${esc(label)}</span></div>`;
    const c = s.content;
    let inner = '';
    switch (s.type) {
      case 'hero':
        inner = `<div class="wrap hero-grid"><div class="hero-text">${E('heading', 'h1')}${E('body', 'p', 'lede')}<p class="btns"><span class="btn">${E('button')}</span></p></div>${ph(c.image, 'hero-ph')}</div>`;
        break;
      case 'intro':
        inner = `<div class="wrap two"><div class="txt">${E('heading', 'h2')}${E('body', 'p', 'lede')}</div>${s.layout === 'centred' ? '' : ph(c.image)}</div>`;
        break;
      case 'offerings':
        inner = `<div class="wrap">${E('heading', 'h2')}<div class="items n${c.items.length}">${c.items.map((it, i) => `<article class="item">${s.layout !== 'list' ? ph(it.image, 'item-ph') : ''}<div class="item-txt"><div class="item-top">${E(`items.${i}.title`, 'h3')}${E(`items.${i}.price`, 'span', 'price')}</div>${E(`items.${i}.body`, 'p')}</div></article>`).join('')}</div></div>`;
        break;
      case 'features':
        inner = `<div class="wrap">${E('heading', 'h2')}<div class="items n${c.items.length}">${c.items.map((it, i) => `<article class="item"><span class="num">${i + 1}</span>${E(`items.${i}.title`, 'h3')}${E(`items.${i}.body`, 'p')}</article>`).join('')}</div></div>`;
        break;
      case 'events':
        inner = `<div class="wrap">${E('heading', 'h2')}<div class="items n${c.items.length}">${c.items.map((it, i) => `<article class="item">${E(`items.${i}.when`, 'span', 'when')}<div>${E(`items.${i}.title`, 'h3')}${E(`items.${i}.body`, 'p')}</div><span class="btn ghost">Book</span></article>`).join('')}</div></div>`;
        break;
      case 'gallery':
        inner = `<div class="wrap">${E('heading', 'h2')}<div class="pics n${c.images.length}">${c.images.map(l => ph(l)).join('')}</div></div>`;
        break;
      case 'testimonial':
        inner = `<div class="wrap narrow"><blockquote>${E('quote', 'p', 'quote')}<footer>${E('who')}</footer></blockquote></div>`;
        break;
      case 'visit':
        inner = `<div class="wrap two"><div class="txt">${E('heading', 'h2')}${E('body', 'p', 'lede')}<p class="hours"><strong>Open</strong> ${E('hours')}</p></div>${s.layout === 'centred' ? '' : ph('map', 'map-ph')}</div>`;
        break;
      case 'cta':
        inner = `<div class="wrap cta-in"><div>${E('heading', 'h2')}${E('body', 'p')}</div><div class="signup"><span class="input">Your email</span><span class="btn">${E('button')}</span></div></div>`;
        break;
      case 'faq':
        inner = `<div class="wrap">${E('heading', 'h2')}<div class="qa">${c.items.map((it, i) => `<div class="qa-item">${E(`items.${i}.q`, 'h3')}${E(`items.${i}.a`, 'p')}</div>`).join('')}</div></div>`;
        break;
    }
    const label = secLabel(s.type, from.plan);
    const tools = edit ? `<div class="sec-tools" contenteditable="false">
        <span class="st-name">${esc(label)}${s.pinned ? ' <span class="st-pin" title="Pinned: regenerating leaves it alone">📌</span>' : ''}</span>
        <button data-act="up" title="Move up" aria-label="Move ${esc(label)} up">↑</button>
        <button data-act="down" title="Move down" aria-label="Move ${esc(label)} down">↓</button>
        <button data-act="pin">${s.pinned ? 'Unpin' : 'Pin'}</button>
        <button data-act="why">Why?</button>
        <button data-act="remove" title="Remove this section">Remove</button>
      </div>` : '';
    return `<section class="sec s-${s.type} l-${s.layout} t-${s.tone}${s.big ? ' big' : ''}${s.quiet ? ' quiet' : ''}${s.pinned ? ' is-pinned' : ''}${extra}" data-sid="${s.id}" id="sec-${s.id}">${tools}${review ? reviewChip(s.id, review) : ''}${inner}</section>`;
  };

  let body = '';
  if (review) {
    const R = review;
    const prevIds = R.prev.sections.map(s => s.id);
    const out = res.sections.map(s => {
      if (R.diff.changed.includes(s.id) && R.keepOld[s.id]) {
        return { id: s.id, html: secHTML(R.prev.sections.find(x => x.id === s.id), R.prev, ' rv-old') };
      }
      const cls = R.diff.changed.includes(s.id) ? ' rv-changed' : R.diff.added.includes(s.id) ? (R.dropAdded[s.id] ? ' rv-dropped' : ' rv-added') : '';
      return { id: s.id, html: secHTML(s, res, cls) };
    });
    // Sections the model took out go back where they were, as ghosts.
    for (const sid of R.diff.removed) {
      const old = R.prev.sections.find(x => x.id === sid);
      const prior = prevIds.slice(0, prevIds.indexOf(sid)).reverse().find(id => out.some(o => o.id === id));
      const at = prior ? out.findIndex(o => o.id === prior) + 1 : 0;
      out.splice(at, 0, { id: sid, html: secHTML(old, R.prev, R.keepRemoved[sid] ? ' rv-kept' : ' rv-removed') });
    }
    body = out.map(o => o.html).join('');
  } else {
    body = res.sections.map(s => secHTML(s)).join('');
  }

  return `<div class="site" style="${style}">
    <header class="s-nav"><div class="wrap nav-in">
      <span class="brand${edit ? ' ed' : ''}" data-path="site:name"${edit ? ' contenteditable="plaintext-only" spellcheck="false"' : ''}>${esc(name)}</span>
      <nav>${nav.map(s => `<span>${esc(secLabel(s.type, res.plan))}</span>`).join('')}</nav>
    </div></header>
    ${body}
    <footer class="s-foot"><div class="wrap foot-in">
      <strong>${esc(name)}</strong>
      <span>${res.plan.place ? esc(res.plan.place) + ' · ' : ''}[address] · [email]</span>
      <span class="made">Generated, not coded · site ${short(res.hash)}</span>
    </div></footer>
  </div>`;
}

function reviewChip(sid, R) {
  if (R.diff.changed.includes(sid)) {
    const old = !!R.keepOld[sid];
    return `<div class="rv-chip" contenteditable="false"><span>${old ? 'Keeping the old version' : 'Changed'}</span>
      <span class="seg"><button data-rv="new" data-sid="${sid}" aria-pressed="${!old}">New</button><button data-rv="old" data-sid="${sid}" aria-pressed="${old}">Old</button></span>
      ${old ? '<em>It’ll be pinned so it stays like this</em>' : ''}</div>`;
  }
  if (R.diff.added.includes(sid)) {
    const drop = !!R.dropAdded[sid];
    return `<div class="rv-chip add" contenteditable="false"><span>${drop ? 'Leaving this out' : 'New section'}</span>
      <span class="seg"><button data-rv="add-keep" data-sid="${sid}" aria-pressed="${!drop}">Add it</button><button data-rv="add-drop" data-sid="${sid}" aria-pressed="${drop}">Leave it out</button></span></div>`;
  }
  if (R.diff.removed.includes(sid)) {
    const keep = !!R.keepRemoved[sid];
    const edited = R.prev.sections.find(s => s.id === sid)?.edited?.length;
    return `<div class="rv-chip rem" contenteditable="false"><span>${keep ? (edited ? 'Kept, because you’d edited it' : 'Keeping this') : 'The model took this out'}</span>
      <span class="seg"><button data-rv="rem-keep" data-sid="${sid}" aria-pressed="${keep}">Keep it</button><button data-rv="rem-drop" data-sid="${sid}" aria-pressed="${!keep}">Let it go</button></span></div>`;
  }
  return '';
}

/* ==================================================================
   Editor state
   ================================================================== */

const EXAMPLES = [
  ['Bakery', 'Little Loaf', 'A small sourdough bakery in Bristol. We bake bread, pastries and cakes every morning, and run weekend baking classes.'],
  ['Band', 'The Weather Station', 'A loud, fun four-piece band from Leeds. We play gigs most weekends and have a new record coming out.'],
  ['Design studio', 'North & Field', 'A two-person design studio in Glasgow. We do branding, websites and illustration for charities and small businesses.'],
  ['Cycling club', 'Hillside Wheelers', 'A friendly cycling club near Sheffield. We organise rides, skills sessions and socials for all abilities.'],
  ['Pottery', 'Tidewater Ceramics', 'A pottery studio in Whitstable. We make mugs, bowls and plates by hand and teach evening classes.'],
];
function freshInputs() {
  const [, name, brief] = EXAMPLES[0];
  return { name, brief, opinions: [], edits: {}, order: null, removed: [], pins: {}, seed: 1, model: 'stand-in-1' };
}

const S = {
  inputs: null, result: null, history: [], hpos: -1, review: null,
  selected: null, busy: false, tab: 'brief', sources: false, scope: 'site',
  dismissed: new Set(), suggestion: null, holding: false, nextOpId: 1,
};
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('klee:' + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('klee:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  clear() { try { localStorage.removeItem('klee:inputs'); localStorage.removeItem('klee:hash'); } catch { /* storage unavailable */ } },
};

/* ---------- Pipeline strip ---------- */
const pipeState = {};
function setPipe(name, state) { pipeState[name] = state; renderPipe(); }
function renderPipe() {
  $('#pipe').innerHTML = STAGES.map(([k, label, tip], i) => {
    const st = pipeState[k] || 'waiting';
    const word = { cached: 'cached', ran: k === 'edits' ? 'applied' : 'ran', running: 'running…', waiting: '' }[st];
    return `${i ? '<span class="pipe-arrow" aria-hidden="true">→</span>' : ''}<span class="pipe-st ${st}" title="${esc(tip)}"><i aria-hidden="true"></i>${label}${word ? ` <em>${word}</em>` : ''}</span>`;
  }).join('') + (S.result ? `<span class="pipe-hash" title="The page's fingerprint. Same inputs, same fingerprint.">${short(S.result.hash)}</span>` : '');
}

/* ---------- Committing changes ---------- */
async function propose(next, label, { review = true, ui = true, quiet = false } = {}) {
  if (S.busy) return false;
  S.busy = true; renderChrome();
  const prev = S.result;
  let res;
  try { res = await build(next, { ui }); } finally { S.busy = false; }
  if (!review || !prev) { commit(res, label, { quiet }); return true; }
  const diff = diffResults(prev, res);
  if (!diff.any) {
    commit(res, label);
    toast(`Nothing on the page changed. “${label}” is saved in your inputs anyway.`);
    return true;
  }
  const R = { label, prev, next: res, diff, keepOld: {}, dropAdded: {}, keepRemoved: {} };
  for (const sid of diff.removed) if (prev.sections.find(s => s.id === sid)?.edited?.length) R.keepRemoved[sid] = true;
  R.conflictKeys = new Set(diff.newConflicts.map(c => c.key));
  S.review = R;
  S.selected = null;
  renderAll();
  $('#stage').scrollTo({ top: 0 });
  return true;
}
const strip = s => canon({ ...s, why: undefined, pinned: undefined, edited: undefined });
function diffResults(a, b) {
  const aIds = a.sections.map(s => s.id), bIds = b.sections.map(s => s.id);
  const look = canon({ ...a.look, why: undefined }) !== canon({ ...b.look, why: undefined });
  const changed = bIds.filter(id => aIds.includes(id) && strip(a.sections.find(s => s.id === id)) !== strip(b.sections.find(s => s.id === id)));
  const added = bIds.filter(id => !aIds.includes(id));
  const removed = aIds.filter(id => !bIds.includes(id) && !b.inp.removed.includes(id));
  const oldC = new Set(a.conflicts.map(c => c.key));
  const newConflicts = b.conflicts.filter(c => !oldC.has(c.key));
  const nowDormant = b.dormant.filter(k => !a.dormant.includes(k));
  const order = canon(aIds.filter(i => bIds.includes(i))) !== canon(bIds.filter(i => aIds.includes(i)));
  return { look, changed, added, removed, newConflicts, nowDormant, order, any: look || changed.length || added.length || removed.length || order };
}
function commit(res, label, { quiet = false } = {}) {
  S.result = res;
  S.inputs = clone(res.inp);
  S.history = S.history.slice(0, S.hpos + 1);
  S.history.push({ label, inputs: clone(res.inp), hash: res.hash });
  S.hpos = S.history.length - 1;
  store.set('inputs', S.inputs); store.set('hash', res.hash);
  S.suggestion = infer();
  if (quiet) { renderPanel(); renderChrome(); renderPipe(); markMine(); } else renderAll();
}
// After a text edit the page already shows the new words, so don't redraw
// it (that would steal focus from wherever you clicked next): just mark
// which text is now yours.
function markMine() {
  $$('#site .ed[data-path]').forEach(el => {
    const [sid, path] = el.dataset.path.split(':');
    const sec = S.result.sections.find(s => s.id === sid);
    el.classList.toggle('mine', !!sec && sec.edited.includes(path));
  });
  const f = $('#site .made');
  if (f) f.textContent = `Generated, not coded · site ${short(S.result.hash)}`;
}
async function travel(to) {
  if (S.busy || S.review || to < 0 || to >= S.history.length) return;
  S.busy = true;
  const res = await build(S.history[to].inputs, { ui: true });
  S.busy = false;
  S.hpos = to; S.result = res; S.inputs = clone(res.inp);
  store.set('inputs', S.inputs); store.set('hash', res.hash);
  S.suggestion = infer();
  renderAll();
  const ran = ['plan', 'look', 'sections'].some(s => pipeState[s] === 'ran');
  toast(`Back to “${S.history[to].label}”.${ran ? '' : ' Every stage came from the cache, so it was instant.'}`);
}

async function acceptReview() {
  const R = S.review;
  const inp = clone(R.next.inp);
  let pinned = 0;
  const snap = sid => clone(R.prev.inp.pins[sid]?.snapshot || R.prev.gen.find(s => s.id === sid));
  for (const sid of R.diff.changed) if (R.keepOld[sid]) { inp.pins[sid] = { snapshot: snap(sid), index: R.prev.gen.findIndex(s => s.id === sid) }; pinned++; }
  for (const sid of R.diff.removed) if (R.keepRemoved[sid]) { inp.pins[sid] = { snapshot: snap(sid), index: R.prev.sections.findIndex(s => s.id === sid) }; pinned++; }
  for (const sid of R.diff.added) if (R.dropAdded[sid] && !inp.removed.includes(sid)) inp.removed.push(sid);
  S.review = null;
  const res = await build(inp, { ui: false });
  commit(res, R.label + (pinned ? ` (kept ${pinned} as ${pinned === 1 ? 'it was' : 'they were'})` : ''));
}
function discardReview() {
  S.review = null;
  build(S.inputs, { ui: true }).then(() => renderAll());
  toast('Thrown away. Your inputs are as they were.');
}

/* ---------- Learning opinions from edits ---------- */
const capsAfterFirst = (s, ctx) => (s.replace(/[!.,?]/g, '').split(/\s+/).slice(1).filter(w => /^[A-Z]/.test(w) && !isProper(w, ctx) && !/^(I|[A-Z]{2,})$/.test(w)).length);
function infer() {
  const inp = S.inputs, res = S.result;
  if (!inp || !res) return null;
  const ctx = { proper: [res.plan.place, inp.name] };
  const edits = Object.entries(inp.edits);
  const hasOp = key => inp.opinions.some(o => o.on && o.scope === 'site' && interpret(o.text).some(f => f.key === key));
  const heading = k => /:(heading|items\.\d+\.(title|q))$/.test(k);
  const sc = edits.filter(([k, e]) => heading(k) && capsAfterFirst(e.from, ctx) > 0 && capsAfterFirst(e.value, ctx) === 0);
  if (sc.length >= 2 && !hasOp('sentenceCase') && !S.dismissed.has('sentenceCase')) {
    return { key: 'sentenceCase', text: 'Use sentence case for headings', why: `You’ve changed ${sc.length} headings to sentence case.`, yes: 'Yes, every heading' };
  }
  const ex = edits.filter(([, e]) => /!/.test(e.from) && !/!/.test(e.value));
  if (ex.length >= 2 && !hasOp('noExclaim') && !S.dismissed.has('noExclaim')) {
    return { key: 'noExclaim', text: 'No exclamation marks', why: `You’ve taken the exclamation mark out of ${ex.length} bits of text.`, yes: 'Yes, everywhere' };
  }
  const cut = edits.filter(([k, e]) => /:(body|items\.\d+\.body|quote)$/.test(k) && e.from.length > 50 && e.value.length < e.from.length * 0.75);
  if (cut.length >= 2 && !hasOp('concise') && !S.dismissed.has('concise')) {
    return { key: 'concise', text: 'Keep the copy short', why: `You’ve cut ${cut.length} paragraphs down.`, yes: 'Yes, shorten the rest' };
  }
  return null;
}

/* ---------- Actions ---------- */
// With a section selected, guess what the opinion is about: words about the
// whole feel ("warmer", "premium", "no testimonials") are about the site;
// words about arrangement ("too busy", "picture on the left") are about the
// section. The guess is shown, and one click changes it.
function scopeFor(text) {
  if (!S.selected) return 'site';
  if (S.scope !== 'auto') return S.scope;
  const fx = interpret(text);
  if (!fx.length) return 'section';
  const local = fx.some(f => f.cat === 'layout');
  return local ? 'section' : 'site';
}
function newOpinion(text, scope, target, extra = {}) {
  return { id: 'o' + (S.nextOpId++) + '-' + hash(text + Date.now()).slice(0, 4), text, scope, target: scope === 'section' ? target : null, on: true, ...extra };
}
async function addOpinion(text) {
  text = text.trim();
  if (!text || S.busy || S.review) return;
  const scope = scopeFor(text);
  const op = newOpinion(text, scope, S.selected);
  const fx = effectsFor(op);
  if (!fx.length) {
    toast('The stand-in model doesn’t understand that one yet. A real model would. Try “calmer”, “too busy” or “no testimonials”.');
    return;
  }
  const next = clone(S.inputs);
  next.opinions.push(op);
  $('#cmd-input').value = '';
  renderRead();
  const where = scope === 'section' ? ` (${secLabel(S.selected, S.result.plan)})` : '';
  await propose(next, `“${text}”${where}`);
}
function commitTextEdit(el) {
  const key = el.dataset.path;
  const [sid, path] = key.split(':');
  const value = norm(el.innerText);
  const next = clone(S.inputs);
  if (sid === 'site') {
    if (!value || value === S.inputs.name) { el.textContent = S.inputs.name; return; }
    next.name = value;
    return propose(next, `Renamed to ${value}`, { review: false, ui: false });
  }
  const sec = S.result.sections.find(s => s.id === sid);
  const shown = norm(String(getPath(sec.content, path)).replaceAll('{name}', S.inputs.name));
  if (value === shown) return;
  const genSec = (S.result.inp.pins[sid]?.snapshot) || S.result.gen.find(s => s.id === sid);
  const from = String(getPath(genSec.content, path) ?? '');
  const stored = S.inputs.name ? value.split(S.inputs.name).join('{name}') : value;
  if (!value || norm(stored) === norm(from)) delete next.edits[key];
  else next.edits[key] = { value: stored, from };
  return propose(next, `Edited the ${secLabel(sid, S.result.plan)} ${fieldLabel(path)}`, { review: false, ui: false, quiet: true });
}
async function sectionAction(act, sid) {
  if (S.busy) return;
  const next = clone(S.inputs);
  const label = secLabel(sid, S.result.plan);
  const ids = S.result.sections.map(s => s.id);
  const i = ids.indexOf(sid);
  if (act === 'up' || act === 'down') {
    const j = act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    next.order = ids;
    await propose(next, `Moved ${label} ${act}`, { review: false, ui: false });
    S.selected = sid; renderAll();
    $(`#sec-${sid}`)?.scrollIntoView({ block: 'nearest' });
  } else if (act === 'remove') {
    next.removed.push(sid);
    delete next.pins[sid];
    if (S.selected === sid) S.selected = null;
    await propose(next, `Removed ${label}`, { review: false, ui: false });
    toast(`Removed ${label}. That’s one of your edits now, so regenerating won’t bring it back.`, { undo: true });
  } else if (act === 'pin') {
    if (next.pins[sid]) {
      delete next.pins[sid];
      await propose(next, `Unpinned ${label}`);
    } else {
      const g = S.result.gen.find(s => s.id === sid);
      next.pins[sid] = { snapshot: clone(g), index: S.result.gen.findIndex(s => s.id === sid) };
      await propose(next, `Pinned ${label}`, { review: false, ui: false });
      toast(`Pinned ${label}. The model will leave it exactly as it is.`);
    }
  } else if (act === 'why') {
    showWhy(sid);
  }
}

/* ==================================================================
   Chrome
   ================================================================== */

function renderAll() {
  renderStage();
  renderPanel();
  renderChrome();
  renderPipe();
}
function renderChrome() {
  $('#undo').disabled = S.hpos <= 0 || !!S.review || S.busy;
  $('#redo').disabled = S.hpos >= S.history.length - 1 || !!S.review || S.busy;
  $('#takes').disabled = !!S.review || S.busy || !S.result;
  $('#cmd-go').disabled = !!S.review || S.busy;
  $('#cmd-input').disabled = !!S.review;
  document.body.classList.toggle('busy', S.busy);
  document.body.classList.toggle('reviewing', !!S.review);
  document.body.classList.toggle('show-sources', S.sources);
  renderScope();
  renderSuggest();
  renderRead();
}

function renderStage() {
  const site = $('#site');
  if (!S.result) { site.innerHTML = '<div class="empty">Making your site…</div>'; return; }
  const R = S.review;
  if (R) {
    site.innerHTML = S.holding ? renderSite(R.prev) : renderSite(R.next, { review: R });
    renderReviewBar();
  } else {
    $('#review').hidden = true;
    site.innerHTML = renderSite(S.result, { edit: true });
  }
  if (S.selected) $(`#sec-${S.selected}`)?.classList.add('selected');
}

function renderReviewBar() {
  const R = S.review, d = R.diff;
  const bits = [];
  if (d.look) bits.push('the look changed');
  if (d.changed.length) bits.push(`${d.changed.length} section${d.changed.length > 1 ? 's' : ''} changed`);
  if (d.added.length) bits.push(`${d.added.length} new`);
  if (d.removed.length) bits.push(`${d.removed.length} taken out`);
  if (d.order) bits.push('the order changed');
  const plan = R.next.plan;
  const kept = d.newConflicts.map(c => {
    const [sid, path] = c.key.split(':');
    return `<li>Your ${esc(secLabel(sid, plan))} ${esc(fieldLabel(path))}: kept “${esc(String(c.kept).replaceAll('{name}', R.next.inp.name))}”. <span>It would have said “${esc(String(c.wanted).replaceAll('{name}', R.next.inp.name))}”.</span></li>`;
  });
  const dormant = d.nowDormant.filter(k => !R.keepRemoved[k.split(':')[0]]).map(k => {
    const [sid, path] = k.split(':');
    return `<li>Your edit to the ${esc(secLabel(sid, plan))} ${esc(fieldLabel(path))} has nowhere to go now. It’s kept, and comes back if that does.</li>`;
  });
  const ran = ['plan', 'look', 'sections'].filter(s => pipeState[s] === 'ran').map(s => STAGES.find(x => x[0] === s)[1]);
  const el = $('#review');
  el.hidden = false;
  el.innerHTML = `<div class="rv-main">
      <div class="rv-txt"><strong>${esc(R.label)}</strong> <span>${cap(bits.join(', ')) || 'Small changes'}.${ran.length ? ` Re-ran ${ran.join(' and ')}.` : ''}</span></div>
      <button class="rv-btn hold" id="rv-hold" title="Hold to see the page as it was">Hold to see before</button>
      <button class="rv-btn" id="rv-discard">Throw away</button>
      <button class="rv-btn primary" id="rv-accept">Keep changes</button>
    </div>
    ${kept.length || dormant.length ? `<ul class="rv-notes">${kept.length ? `<li class="h">Your edits win: ${kept.length === 1 ? 'this one stayed' : 'these stayed'} as you wrote ${kept.length === 1 ? 'it' : 'them'}</li>` : ''}${kept.join('')}${dormant.join('')}</ul>` : ''}`;
}

function renderPanel() {
  const p = $('#panel');
  const inp = S.inputs;
  if (!inp) return;
  const editsN = Object.keys(inp.edits).length + inp.removed.length + Object.keys(inp.pins).length + (inp.order ? 1 : 0);
  const tabs = [['brief', 'Brief'], ['opinions', 'Opinions', inp.opinions.filter(o => o.on).length], ['edits', 'Your edits', editsN], ['lock', 'Lock']];
  let body = '';
  const dis = S.review || S.busy ? ' disabled' : '';
  if (S.tab === 'brief') {
    body = `<div class="pn-sec">
      <h3>The brief</h3>
      <p class="pn-hint">Say what the site is for in a sentence or two. The model plans the whole site from this.</p>
      <label class="fld"><span>Name <em>a fact: changing it never runs the model</em></span><input id="f-name" value="${esc(inp.name)}"${dis}></label>
      <label class="fld"><span>What is it?</span><textarea id="f-brief" rows="5"${dis}>${esc(inp.brief)}</textarea></label>
      <button class="pn-btn primary" id="f-go"${dis}>Regenerate from the brief</button>
      <p class="pn-hint small">Your opinions and edits carry over. You’ll see what changes before anything is kept.</p>
    </div>
    <div class="pn-sec">
      <h3>Or start from an example</h3>
      <div class="chips">${EXAMPLES.map(([l], i) => `<button class="chip" data-ex="${i}"${dis}>${esc(l)}</button>`).join('')}</div>
    </div>
    <div class="pn-sec">
      <h3>What the model made of it</h3>
      <ul class="facts">
        <li><span>Kind</span>${esc(KINDS[S.result.plan.kindKey].label)}</li>
        <li><span>Place</span>${esc(S.result.plan.place || '—')}</li>
        <li><span>Things</span>${esc(S.result.plan.things.join(', '))}</li>
        <li><span>Sections</span>${esc(S.result.plan.sections.map(t => secLabel(t, S.result.plan)).join(', '))}</li>
      </ul>
      <p class="pn-hint small">${esc(S.result.plan.kindWhy)}.</p>
    </div>`;
  } else if (S.tab === 'opinions') {
    const ops = inp.opinions;
    const T = S.result.look;
    body = `<div class="pn-sec">
      <h3>Your opinions</h3>
      <p class="pn-hint">Everything you’ve told it, in your words. Switch one off or remove it and you’ll see what changes before it’s kept.</p>
      ${ops.length ? `<ul class="ops">${ops.map(o => {
        const fx = effectsFor(o);
        return `<li class="op${o.on ? '' : ' off'}">
          <label class="op-sw" title="${o.on ? 'Switch off' : 'Switch on'}"><input type="checkbox" data-op-toggle="${o.id}"${o.on ? ' checked' : ''}${dis}><span class="track" aria-hidden="true"></span></label>
          <div class="op-body"><strong>“${esc(o.text)}”</strong>
            <span class="op-meta">${o.scope === 'section' ? `${esc(secLabel(o.target, S.result.plan))} only` : 'Whole site'}${o.learned ? ' · <em>learned from your edits</em>' : ''}</span>
            <span class="op-fx">${esc(fx.map(f => f.note).join(', ') || 'no effect')}</span></div>
          <button class="op-x" data-op-del="${o.id}" title="Remove this opinion"${dis}>×</button></li>`;
      }).join('')}</ul>` : '<p class="pn-empty">None yet. Use the bar at the bottom: select a section first to talk about just that section.</p>'}
    </div>
    <div class="pn-sec">
      <h3>The look right now</h3>
      <div class="swatches">${['--bg', '--surface', '--accent', '--ink'].map(k => `<i style="background:${tokens(T)[k]}" title="${k.slice(2)}"></i>`).join('')}
        <span>${esc(hueName(T.hue))} · ${T.dark ? 'dark' : 'light'} · ${({ serif: 'classic', modern: 'modern', friendly: 'friendly' })[T.type]} type · ${T.space > 0.6 ? 'airy' : T.space < 0.35 ? 'snug' : 'even'} spacing</span></div>
      <ul class="why-list">${T.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
    </div>`;
  } else if (S.tab === 'edits') {
    const plan = S.result.plan;
    const rows = Object.entries(inp.edits).map(([k, e]) => {
      const [sid, path] = k.split(':');
      const dormant = S.result.dormant.includes(k);
      const over = S.result.conflicts.some(c => c.key === k);
      return `<li class="ed-row${dormant ? ' dormant' : ''}"><div><span class="ed-where">${esc(secLabel(sid, plan))} ${esc(fieldLabel(path))}${dormant ? ' · not on the page now' : ''}${over ? ' · <em>overrides the model</em>' : ''}</span>
        <span class="ed-val">“${esc(e.value.replaceAll('{name}', inp.name))}”</span>
        <span class="ed-was">was “${esc(String(e.from).replaceAll('{name}', inp.name))}”</span></div>
        <button class="op-x" data-ed-del="${esc(k)}" title="Undo this edit"${dis}>×</button></li>`;
    });
    const rem = inp.removed.map(sid => `<li class="ed-row"><div><span class="ed-where">Removed</span><span class="ed-val">${esc(secLabel(sid, plan))}</span></div><button class="pn-link" data-rem-back="${sid}"${dis}>Bring back</button></li>`);
    const pins = Object.keys(inp.pins).map(sid => `<li class="ed-row"><div><span class="ed-where">Pinned</span><span class="ed-val">${esc(secLabel(sid, plan))}</span></div><button class="pn-link" data-unpin="${sid}"${dis}>Unpin</button></li>`);
    const ord = inp.order ? [`<li class="ed-row"><div><span class="ed-where">Section order</span><span class="ed-val">Yours</span></div><button class="pn-link" data-order-reset${dis}>Let the model decide</button></li>`] : [];
    const all = [...rows, ...rem, ...pins, ...ord];
    body = `<div class="pn-sec">
      <h3>Your edits</h3>
      <p class="pn-hint">Click any text on the page and type. Each change is saved as an input, so it always wins: the model works around it.</p>
      ${all.length ? `<ul class="eds">${all.join('')}</ul>` : '<p class="pn-empty">Nothing yet. Click a heading on the page and change it.</p>'}
    </div>`;
  } else if (S.tab === 'lock') {
    const r = S.result;
    const st = k => (cache.has(r.keys[k]) ? 'cached' : 'not cached');
    body = `<div class="pn-sec">
      <h3>The lock</h3>
      <p class="pn-hint">The site is never stored. Your inputs are, and the page is rebuilt from them. Each stage is cached under a hash of what it read, so the same inputs always give the same page.</p>
      <ul class="facts mono">
        <li><span>Inputs</span><code>${short(r.inputsHash)}</code></li>
        <li><span>Plan</span><code>${short(r.keys.plan.split(':')[1])} <em>${st('plan')}</em></code></li>
        <li><span>Look</span><code>${short(r.keys.look.split(':')[1])} <em>${st('look')}</em></code></li>
        <li><span>Sections</span><code>${short(r.keys.sections.split(':')[1])} <em>${st('sections')}</em></code></li>
        <li><span>Page</span><code>${short(r.hash)}</code></li>
        <li><span>Cache</span><code>${cache.size} stage results</code></li>
      </ul>
      <button class="pn-btn" id="lk-rebuild"${dis}>Rebuild from scratch</button>
      <p class="pn-hint small">Empties the cache and runs every stage again. You should get the same page fingerprint.</p>
    </div>
    <div class="pn-sec">
      <h3>Model</h3>
      <p class="pn-hint">The model is pinned like any other dependency. Upgrading it is a change you review.</p>
      <div class="chips">${Object.entries(MODELS).map(([k, l]) => `<button class="chip${inp.model === k ? ' on' : ''}" data-model="${k}"${dis}>${esc(l)}</button>`).join('')}</div>
      <p class="pn-hint small">Take ${inp.seed}. <button class="pn-link" id="lk-takes"${dis}>See other takes</button></p>
    </div>
    <div class="pn-sec">
      <h3>History</h3>
      <ol class="hist">${S.history.map((h, i) => `<li class="${i === S.hpos ? 'now' : ''}${i > S.hpos ? ' future' : ''}"><button data-hist="${i}"${dis}>${esc(h.label)}</button><span>${short(h.hash)}</span></li>`).reverse().join('')}</ol>
    </div>
    <div class="pn-sec">
      <h3>Your inputs, in full</h3>
      <pre class="lockfile">${esc(JSON.stringify({ model: inp.model, pipeline: PIPELINE, seed: inp.seed, name: inp.name, brief: inp.brief, opinions: inp.opinions.map(o => ({ text: o.text, scope: o.scope === 'section' ? o.target : 'site', on: o.on })), edits: Object.fromEntries(Object.entries(inp.edits).map(([k, e]) => [k, e.value])), removed: inp.removed, order: inp.order, pinned: Object.keys(inp.pins) }, null, 2))}</pre>
    </div>`;
  }
  p.innerHTML = `<div class="tabs" role="tablist">${tabs.map(([k, l, n]) => `<button role="tab" data-tab="${k}" aria-selected="${S.tab === k}">${l}${n ? ` <span class="count">${n}</span>` : ''}</button>`).join('')}</div><div class="pn-body">${body}</div>`;
}

function renderScope() {
  const el = $('#cmd-scope');
  if (!S.selected || S.review || !S.result) {
    el.innerHTML = '<span class="sc-hint">Talking about the whole site. Click a section to talk about just that one.</span>';
    return;
  }
  const label = secLabel(S.selected, S.result.plan);
  const text = $('#cmd-input').value.trim();
  const now = scopeFor(text);
  const guess = S.scope === 'auto' && text ? ' <em>(a guess)</em>' : '';
  el.innerHTML = `<span class="sc-hint">About</span>
    <button class="sc${now === 'section' ? ' on' : ''}" data-scope="section">This ${esc(label)} section${now === 'section' ? guess : ''}</button>
    <button class="sc${now === 'site' ? ' on' : ''}" data-scope="site">The whole site${now === 'site' ? guess : ''}</button>
    <button class="sc-x" data-scope="clear" title="Deselect">×</button>`;
}
function renderRead() {
  const el = $('#cmd-read');
  const text = $('#cmd-input').value.trim();
  if (!text || !S.result) { el.innerHTML = ''; return; }
  const scope = scopeFor(text);
  const op = { text, scope, target: S.selected };
  const fx = effectsFor(op);
  if (!fx.length) {
    el.innerHTML = `<span class="rd-no">The stand-in doesn’t know this one. Try “calmer”, “too busy”, “no testimonials”, “make it green” or “sentence case”.</span>`;
    return;
  }
  const next = clone(S.inputs);
  next.opinions.push({ id: 'preview', ...op, on: true });
  const runs = wouldRun(next);
  const secs = runs.reduce((a, s) => a + COST[s], 0) / 1000;
  el.innerHTML = `<span class="rd-yes">Understood: ${esc(fx.map(f => f.note).join(', '))}</span> · <span>${scope === 'section' ? esc(secLabel(S.selected, S.result.plan)) + ' only' : 'whole site'}</span> · <span class="rd-cost">${runs.length ? `re-runs ${runs.map(s => STAGES.find(x => x[0] === s)[1]).join(' and ')}, about ${secs.toFixed(1)}s` : 'already cached, instant'}</span>`;
}
function renderSuggest() {
  const el = $('#suggest');
  const s = S.suggestion;
  if (!s || S.review) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<span class="sg-icon" aria-hidden="true">✦</span><div><strong>${esc(s.why)}</strong> Make “${esc(s.text.toLowerCase())}” a rule for the whole site?</div>
    <button class="sg-yes" id="sg-yes">${esc(s.yes)}</button><button class="sg-no" id="sg-no">Not now</button>`;
}

let toastTimer;
function toast(msg, { undo = false } = {}) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button id="toast-undo">Undo</button>' : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 5200);
}

let popShownAt = 0;
function showWhy(sid) {
  const s = S.result.sections.find(x => x.id === sid);
  const btn = $(`#sec-${sid} [data-act="why"]`);
  const pop = $('#pop');
  const edited = s.edited.map(p => fieldLabel(p));
  pop.innerHTML = `<h4>Why the ${esc(secLabel(sid, S.result.plan))} looks like this</h4>
    <ul class="why-list">${s.why.map(w => `<li>${esc(w)}</li>`).join('')}
    ${s.pinned ? '<li class="you">Pinned by you, so the model leaves it as it was</li>' : ''}
    ${edited.length ? `<li class="you">You wrote the ${esc(edited.join(', '))} yourself</li>` : ''}</ul>`;
  pop.hidden = false;
  popShownAt = Date.now();
  const r = btn.getBoundingClientRect();
  pop.style.top = `${Math.min(r.bottom + 8, innerHeight - pop.offsetHeight - 12)}px`;
  pop.style.left = `${Math.min(r.left, innerWidth - pop.offsetWidth - 12)}px`;
}

async function showTakes() {
  if (S.busy || S.review) return;
  const m = $('#modal');
  const base = S.inputs.seed;
  const seeds = [base + 1, base + 2, base + 3];
  m.hidden = false;
  m.innerHTML = `<div class="md-card" role="dialog" aria-label="Other takes">
    <div class="md-head"><div><h2>Other takes</h2><p>Same brief, same opinions, same edits, different seed. Your edits and pinned sections come along to every take.</p></div><button class="md-x" id="md-x" aria-label="Close">×</button></div>
    <div class="takes">${[base, ...seeds].map((sd, i) => `<div class="take" data-seed="${sd}"><div class="take-frame"><div class="take-scale"><div class="take-loading">Generating…</div></div></div>
      <div class="take-foot"><span>${i ? `Take ${sd}` : `Take ${sd} · current`}</span>${i ? `<button class="pn-btn primary small" data-use="${sd}" disabled>Use this</button>` : ''}</div></div>`).join('')}</div></div>`;
  const draw = (sd, res) => {
    const t = m.querySelector(`.take[data-seed="${sd}"]`);
    if (!t) return;
    t.querySelector('.take-scale').innerHTML = renderSite(res);
    const b = t.querySelector('[data-use]');
    if (b) b.disabled = false;
  };
  draw(base, S.result);
  for (const sd of seeds) {
    const next = { ...clone(S.inputs), seed: sd };
    const cached = !wouldRun(next).length;
    if (!cached) await sleep(500);
    if (m.hidden) return;
    draw(sd, await build(next, { ui: false }));
  }
}

/* ==================================================================
   Events
   ================================================================== */

function bind() {
  const site = $('#site');

  site.addEventListener('click', e => {
    const act = e.target.closest('[data-act]');
    const sec = e.target.closest('.sec');
    const rv = e.target.closest('[data-rv]');
    if (rv && S.review) {
      const sid = rv.dataset.sid, R = S.review;
      ({
        new: () => { delete R.keepOld[sid]; }, old: () => { R.keepOld[sid] = true; },
        'add-keep': () => { delete R.dropAdded[sid]; }, 'add-drop': () => { R.dropAdded[sid] = true; },
        'rem-keep': () => { R.keepRemoved[sid] = true; }, 'rem-drop': () => { delete R.keepRemoved[sid]; },
      })[rv.dataset.rv]();
      const y = $('#stage').scrollTop;
      renderStage();
      $('#stage').scrollTop = y;
      return;
    }
    if (S.review) return;
    if (act && sec) { e.preventDefault(); sectionAction(act.dataset.act, sec.dataset.sid); return; }
    if (sec) {
      if (S.selected !== sec.dataset.sid) {
        $$('.sec.selected').forEach(x => x.classList.remove('selected'));
        S.selected = sec.dataset.sid;
        S.scope = 'auto';
        sec.classList.add('selected');
        renderScope(); renderRead();
      }
    } else if (!e.target.closest('.ed')) {
      S.selected = null;
      $$('.sec.selected').forEach(x => x.classList.remove('selected'));
      renderScope(); renderRead();
    }
  });
  site.addEventListener('focusin', e => {
    const el = e.target.closest('.ed');
    if (el) el.dataset.before = el.innerText;
  });
  site.addEventListener('focusout', e => {
    const el = e.target.closest('.ed');
    if (!el || S.review) return;
    if (el.innerText === el.dataset.before) return;
    commitTextEdit(el);
  });
  site.addEventListener('keydown', e => {
    const el = e.target.closest('.ed');
    if (!el) return;
    if (e.key === 'Escape') { el.innerText = el.dataset.before; el.blur(); }
    if (e.key === 'Enter' && (!/^P$/.test(el.tagName) || !e.shiftKey)) { e.preventDefault(); el.blur(); }
  });

  $('#review').addEventListener('click', e => {
    if (e.target.id === 'rv-accept') acceptReview();
    if (e.target.id === 'rv-discard') discardReview();
  });
  const hold = on => {
    if (!S.review || S.holding === on) return;
    S.holding = on;
    const y = $('#stage').scrollTop;
    renderStage();
    $('#stage').scrollTop = y;
    $('#rv-hold')?.classList.toggle('on', on);
  };
  $('#review').addEventListener('pointerdown', e => { if (e.target.id === 'rv-hold') hold(true); });
  addEventListener('pointerup', () => hold(false));
  $('#review').addEventListener('keydown', e => { if (e.target.id === 'rv-hold' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); hold(true); } });
  $('#review').addEventListener('keyup', e => { if (e.target.id === 'rv-hold') hold(false); });

  $('#cmd').addEventListener('submit', e => { e.preventDefault(); addOpinion($('#cmd-input').value); });
  $('#cmd-input').addEventListener('input', () => { renderRead(); renderScope(); });
  $('#cmd-scope').addEventListener('click', e => {
    const b = e.target.closest('[data-scope]');
    if (!b) return;
    if (b.dataset.scope === 'clear') { S.selected = null; $$('.sec.selected').forEach(x => x.classList.remove('selected')); }
    else S.scope = b.dataset.scope;
    renderScope(); renderRead();
  });
  $('#suggest').addEventListener('click', async e => {
    const s = S.suggestion;
    if (!s) return;
    if (e.target.id === 'sg-no') { S.dismissed.add(s.key); S.suggestion = null; renderSuggest(); }
    if (e.target.id === 'sg-yes') {
      S.dismissed.add(s.key); S.suggestion = null;
      const next = clone(S.inputs);
      next.opinions.push(newOpinion(s.text, 'site', null, { learned: true }));
      await propose(next, `“${s.text}” (learned from your edits)`);
    }
  });

  $('#panel').addEventListener('click', async e => {
    const t = e.target;
    const tab = t.closest('[data-tab]');
    if (tab) { S.tab = tab.dataset.tab; renderPanel(); return; }
    if (S.busy || S.review) return;
    if (t.id === 'f-go') {
      const next = clone(S.inputs);
      next.brief = $('#f-brief').value.trim();
      next.name = $('#f-name').value.trim() || next.name;
      await propose(next, 'Changed the brief');
    }
    const ex = t.closest('[data-ex]');
    if (ex) {
      const [l, name, brief] = EXAMPLES[+ex.dataset.ex];
      await propose({ ...clone(S.inputs), name, brief }, `Started from the ${l.toLowerCase()} example`);
    }
    if (t.dataset.opDel) {
      const next = clone(S.inputs);
      const o = next.opinions.find(x => x.id === t.dataset.opDel);
      next.opinions = next.opinions.filter(x => x.id !== t.dataset.opDel);
      await propose(next, `Removed “${o.text}”`);
    }
    if (t.dataset.edDel) {
      const next = clone(S.inputs);
      delete next.edits[t.dataset.edDel];
      await propose(next, 'Undid an edit', { review: false, ui: false });
    }
    if (t.dataset.remBack) {
      const next = clone(S.inputs);
      next.removed = next.removed.filter(x => x !== t.dataset.remBack);
      await propose(next, `Brought back ${secLabel(t.dataset.remBack, S.result.plan)}`, { review: false, ui: false });
    }
    if (t.dataset.unpin) sectionAction('pin', t.dataset.unpin);
    if (t.hasAttribute('data-order-reset')) {
      const next = clone(S.inputs);
      next.order = null;
      await propose(next, 'Let the model order the sections');
    }
    if (t.dataset.model && t.dataset.model !== S.inputs.model) {
      await propose({ ...clone(S.inputs), model: t.dataset.model }, `Switched to ${MODELS[t.dataset.model]}`);
    }
    if (t.dataset.hist) travel(+t.dataset.hist);
    if (t.id === 'lk-takes') showTakes();
    if (t.id === 'lk-rebuild') {
      const before = S.result.hash;
      cache.clear();
      S.busy = true; renderChrome();
      const res = await build(S.inputs, { ui: true });
      S.busy = false;
      S.result = res;
      renderAll();
      toast(res.hash === before ? `Rebuilt every stage from nothing: ${short(res.hash)}, identical to before.` : `Rebuilt, but the fingerprint changed (${short(before)} → ${short(res.hash)}). That would be a bug.`);
    }
  });
  $('#panel').addEventListener('change', async e => {
    const id = e.target.dataset.opToggle;
    if (!id || S.busy || S.review) return;
    const next = clone(S.inputs);
    const o = next.opinions.find(x => x.id === id);
    o.on = e.target.checked;
    await propose(next, `${o.on ? 'Switched on' : 'Switched off'} “${o.text}”`);
  });
  $('#panel').addEventListener('keydown', e => {
    if (e.target.id === 'f-name' && e.key === 'Enter') e.target.blur();
  });
  $('#panel').addEventListener('focusout', e => {
    if (e.target.id !== 'f-name' || S.busy || S.review) return;
    const v = e.target.value.trim();
    if (v && v !== S.inputs.name) propose({ ...clone(S.inputs), name: v }, `Renamed to ${v}`, { review: false, ui: false });
  });

  $('#takes').addEventListener('click', showTakes);
  $('#modal').addEventListener('click', async e => {
    if (e.target.id === 'md-x' || e.target.id === 'modal') { $('#modal').hidden = true; return; }
    const use = e.target.closest('[data-use]');
    if (use) {
      $('#modal').hidden = true;
      await propose({ ...clone(S.inputs), seed: +use.dataset.use }, `Chose take ${use.dataset.use}`, { review: false });
    }
  });
  $('#undo').addEventListener('click', () => travel(S.hpos - 1));
  $('#redo').addEventListener('click', () => travel(S.hpos + 1));
  $('#reset').addEventListener('click', async () => {
    if (S.busy) return;
    S.review = null; S.selected = null; S.dismissed.clear();
    S.history = []; S.hpos = -1; S.result = null;
    store.clear();
    await propose(freshInputs(), 'Started from the sample bakery', { review: false });
  });
  $('#sources').addEventListener('change', e => { S.sources = e.target.checked; renderChrome(); });
  $('#toast').addEventListener('click', e => { if (e.target.id === 'toast-undo') { $('#toast').hidden = true; travel(S.hpos - 1); } });

  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#pop') && !e.target.closest('[data-act="why"]')) $('#pop').hidden = true;
  });
  document.addEventListener('keydown', e => {
    const typing = e.target.closest('input, textarea, [contenteditable]');
    if (e.key === 'Escape') { $('#pop').hidden = true; if (!$('#modal').hidden) $('#modal').hidden = true; }
    if (typing) return;
    if (e.key === '/') { e.preventDefault(); $('#cmd-input').focus(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); travel(e.shiftKey ? S.hpos + 1 : S.hpos - 1); }
  });
  $('#stage').addEventListener('scroll', () => { if (Date.now() - popShownAt > 400) $('#pop').hidden = true; });
}

/* ---------- Start ---------- */
async function start() {
  bind();
  renderPipe();
  const saved = store.get('inputs');
  const savedHash = store.get('hash');
  const inp = saved && saved.brief ? { ...freshInputs(), ...saved } : freshInputs();
  S.nextOpId = (inp.opinions?.length || 0) + 1;
  renderStage();
  await propose(inp, saved ? 'Rebuilt from your saved inputs' : 'Generated from the brief', { review: false });
  if (saved && savedHash) {
    toast(S.result.hash === savedHash
      ? `Rebuilt from your saved inputs with an empty cache: ${short(S.result.hash)}, the same page as last time.`
      : `Rebuilt from your saved inputs, but the page came out different (${short(savedHash)} → ${short(S.result.hash)}).`);
  }
}
start();
