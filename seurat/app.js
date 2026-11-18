/*
 * Seurat · Where the typography controls live
 *
 * One simulated page editor, three variants. The page, its blocks, the seven
 * typography controls (Font, Size, Appearance, Line height, Letter spacing,
 * Decoration, Letter case), the tasks and the log are the same in all three.
 * Only the place the typography controls are found changes:
 *
 *   sidebar  The control, after the WordPress editor as it is today. The
 *            controls are in the Typography panel of the settings sidebar's
 *            Block tab. Only Size shows at first; the others are turned on
 *            from the panel's options menu.
 *   toolbar  The controls are on the toolbar above the selected text, the way
 *            Squarespace arranges its text toolbar: a text style menu first,
 *            then Font and Size, each naming what the text is set in now, and
 *            a "More text options" button for the rest.
 *   menu     After the block toolbar proposal in Gutenberg issue #85204:
 *            block name, movers, one options menu and delete. "Style goes in
 *            the menu", so the controls are a Typography flyout in the options
 *            menu, and formatting appears when text is selected.
 *
 * Each HTML page picks its variant with <body data-variant="…">.
 *
 * Add ?notes (or #notes) to the address for the facilitator panel: the tasks,
 * some counts, and a log of what the person did with times since the page
 * opened. Everything is kept in memory, so reloading the page starts again.
 */
(function () {
  'use strict';

  const VARIANTS = {
    sidebar: { code: 'SC', letter: '0', file: 'sidebar.html', name: 'Control: as the WordPress editor does today, the typography controls are in the settings sidebar’s Typography panel, with only Size showing until the others are turned on' },
    toolbar: { code: 'ST', letter: 'A', file: 'toolbar.html', name: 'On the toolbar: text style, Font and Size are on the toolbar above the selected text, with the rest under “More text options”' },
    menu: { code: 'SM', letter: 'B', file: 'menu.html', name: 'In the options menu: the toolbar is block name, movers, options and delete, and the typography controls are a Typography flyout in the options menu' }
  };
  const VARIANT = VARIANTS[document.body.dataset.variant] ? document.body.dataset.variant : 'sidebar';
  const NOTES = new URLSearchParams(location.search).has('notes') || location.hash === '#notes';

  // ---------- The theme ----------

  const FONTS = [
    { id: 'georgia', name: 'Georgia', stack: "Georgia, 'Times New Roman', serif" },
    { id: 'helvetica', name: 'Helvetica', stack: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    { id: 'trebuchet', name: 'Trebuchet', stack: "'Trebuchet MS', 'Lucida Grande', sans-serif" },
    { id: 'courier', name: 'Courier', stack: "'Courier New', Courier, monospace" }
  ];
  const SIZES = [
    { id: 's', short: 'S', name: 'Small', px: 14 },
    { id: 'm', short: 'M', name: 'Medium', px: 18 },
    { id: 'l', short: 'L', name: 'Large', px: 24 },
    { id: 'xl', short: 'XL', name: 'Extra Large', px: 36 }
  ];
  const APPEARANCES = [['', 'Default'], ['regular', 'Regular'], ['italic', 'Italic'], ['bold', 'Bold'], ['bolditalic', 'Bold Italic']];
  const DECORATIONS = [['', '–', 'None'], ['underline', 'U', 'Underline'], ['line-through', 'S', 'Strikethrough']];
  const CASES = [['', '–', 'None'], ['uppercase', 'AB', 'Uppercase'], ['lowercase', 'ab', 'Lowercase'], ['capitalize', 'Ab', 'Capitalize']];
  const LABELS = { font: 'Font', size: 'Size', appearance: 'Appearance', lineHeight: 'Line height', letterSpacing: 'Letter spacing', decoration: 'Decoration', case: 'Letter case' };
  const KEYS = Object.keys(LABELS);
  const HEADING_PX = [0, 40, 28, 22, 18];

  // What the theme gives a block before anyone changes it.
  function defaults(b) {
    return b.type === 'heading'
      ? { font: 'georgia', px: HEADING_PX[b.level], weight: 700, lh: 1.2 }
      : { font: 'helvetica', px: 18, weight: 400, lh: 1.6 };
  }

  // ---------- The starting page ----------

  // An invented bakery. The phone number is a bracketed placeholder.
  const START = [
    { id: 'h1', type: 'heading', level: 1, html: 'Fresh bread, baked every morning' },
    { id: 'p1', type: 'paragraph', html: 'Marlow Lane Bakery has baked sourdough, rye and seeded loaves in the same brick oven since 1987. Everything is made by hand and sold the day it is baked.' },
    { id: 'h2', type: 'heading', level: 2, html: 'Opening hours' },
    { id: 'p2', type: 'paragraph', html: 'Tuesday to Saturday, 7am to 3pm. Closed on Sunday and Monday.' },
    { id: 'h3', type: 'heading', level: 2, html: 'Order ahead' },
    { id: 'p3', type: 'paragraph', html: 'Want a loaf kept back for you? Call [phone number] before 10am or ask at the counter, and we’ll have it wrapped and waiting. Large orders for cafes and events need two days’ notice, and we can deliver within three miles of the bakery.' }
  ];
  const emptyTypo = () => ({ font: '', size: '', custom: null, appearance: '', lineHeight: null, letterSpacing: null, decoration: '', case: '' });

  const TASKS = [
    { text: 'Make the first paragraph’s text bigger', hint: 'Ticked when the paragraph under the main heading is larger than the theme’s 18px, by any route.', done: () => eff(block('p1')).px > 18 },
    { text: 'Change the main heading’s font', hint: 'Ticked when “Fresh bread, baked every morning” has been given a font other than Georgia. Changing it to a paragraph doesn’t count.', done: () => { const f = block('h1').typo.font; return !!f && f !== 'georgia'; } },
    { text: 'Put more space between the lines of the last paragraph', hint: 'Ticked when the paragraph under “Order ahead” has a line height above the theme’s 1.6.', done: () => eff(block('p3')).lh > 1.6 }
  ];

  // ---------- State ----------

  let S, log, stats, t0, firstDone, ticked, toastTimer;
  const app = document.getElementById('app');

  function reset() {
    S = {
      blocks: START.map((b) => Object.assign({ align: '', typo: emptyTypo() }, b)),
      sel: null,        // the selected block's id
      menu: null,       // the open menu's name
      fly: null,        // menu variant: the open flyout
      q: '',            // menu variant: the options menu's search
      sidebar: true,    // settings sidebar open
      tab: 'page',      // 'page' or 'block'
      shown: {},        // control: typography controls turned on, per block
      customSize: {},   // blocks whose Size control is in "custom" mode
      undo: [], redo: []
    };
    log = [];
    stats = { opens: 0, changes: 0, transforms: 0, textEdits: 0, saves: 0, finishBack: 0, inert: 0, firstTypo: 0 };
    t0 = Date.now();
    firstDone = {};
    ticked = {};
  }

  const block = (id) => S.blocks.find((b) => b.id === id);
  const selected = () => (S.sel ? block(S.sel) : null);
  const seconds = () => Math.round((Date.now() - t0) / 1000);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function elapsed() {
    const s = seconds();
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function note(kind, text) {
    log.push({ at: elapsed(), kind, text });
    renderNotes();
  }

  function toast(text) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = text;
    el.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-shown'), 2500);
  }

  // ---------- A block's typography ----------

  // The values a block is shown in: its own where it has them, the theme's otherwise.
  function eff(b) {
    const d = defaults(b);
    const t = b.typo;
    const preset = SIZES.find((s) => s.id === t.size);
    const bold = t.appearance === 'bold' || t.appearance === 'bolditalic';
    const italic = t.appearance === 'italic' || t.appearance === 'bolditalic';
    return {
      font: t.font || d.font,
      px: t.custom != null ? t.custom : preset ? preset.px : d.px,
      weight: t.appearance ? (bold ? 700 : 400) : d.weight,
      italic,
      lh: t.lineHeight != null ? t.lineHeight : d.lh,
      ls: t.letterSpacing != null ? t.letterSpacing : 0
    };
  }

  const fontOf = (id) => FONTS.find((f) => f.id === id);

  function css(b) {
    const e = eff(b);
    return [
      'font-family:' + fontOf(e.font).stack,
      'font-size:' + e.px + 'px',
      'font-weight:' + e.weight,
      'font-style:' + (e.italic ? 'italic' : 'normal'),
      'line-height:' + e.lh,
      'letter-spacing:' + e.ls + 'px',
      'text-decoration:' + (b.typo.decoration || 'none'),
      'text-transform:' + (b.typo.case || 'none'),
      'text-align:' + (b.align || 'left')
    ].join(';');
  }

  function blockName(b) {
    return b.type === 'heading' ? 'Heading ' + b.level : 'Paragraph';
  }

  function blockLabel(b) {
    const el = blkEl(b.id);
    const words = (el ? el.textContent : b.html).trim();
    return blockName(b) + ' “' + (words.length > 28 ? words.slice(0, 27) + '…' : words) + '”';
  }

  // How a control's value reads in the log.
  function describe(b, key) {
    const t = b.typo;
    const d = defaults(b);
    if (key === 'font') return t.font ? fontOf(t.font).name : 'Default (' + fontOf(d.font).name + ')';
    if (key === 'size') {
      if (t.custom != null) return t.custom + 'px (custom)';
      const p = SIZES.find((s) => s.id === t.size);
      return p ? p.name + ' (' + p.px + 'px)' : 'Default (' + d.px + 'px)';
    }
    if (key === 'appearance') return (APPEARANCES.find((a) => a[0] === t.appearance) || APPEARANCES[0])[1];
    if (key === 'lineHeight') return t.lineHeight != null ? String(t.lineHeight) : 'Default (' + d.lh + ')';
    if (key === 'letterSpacing') return t.letterSpacing != null ? t.letterSpacing + 'px' : 'Default (0)';
    if (key === 'decoration') return (DECORATIONS.find((a) => a[0] === t.decoration) || DECORATIONS[0])[2];
    return (CASES.find((a) => a[0] === t.case) || CASES[0])[2];
  }

  // ---------- Undo ----------

  function syncText() {
    S.blocks.forEach((b) => { const el = blkEl(b.id); if (el) b.html = el.innerHTML; });
  }

  function pushUndo() {
    syncText();
    S.undo.push(JSON.stringify(S.blocks));
    if (S.undo.length > 100) S.undo.shift();
    S.redo = [];
  }

  function travel(from, to, word) {
    if (!from.length) return;
    syncText();
    to.push(JSON.stringify(S.blocks));
    S.blocks = JSON.parse(from.pop());
    if (S.sel && !block(S.sel)) S.sel = null;
    note('undo', word);
    renderCanvas();
    renderChrome();
    checkTasks();
  }

  // ---------- Changing things ----------

  // One typography change, from any of the three places.
  function setTypo(b, key, val, focus) {
    flushNumber();
    const before = describe(b, key);
    if ((b.typo[key] == null ? '' : b.typo[key]) === val && !(key === 'size' && b.typo.custom != null)) { renderChrome(focus); return; }
    pushUndo();
    applyTypo(b, key, val);
    logTypo(b, key, before);
    renderChrome(focus);
  }

  function applyTypo(b, key, val) {
    if (key === 'size') { b.typo.size = val; b.typo.custom = null; }
    else if (key === 'custom') { b.typo.custom = val; if (val != null) b.typo.size = ''; }
    else b.typo[key] = val;
    const el = blkEl(b.id);
    if (el) el.style.cssText = css(b);
  }

  function logTypo(b, key, before) {
    const k = key === 'custom' ? 'size' : key;
    const after = describe(b, k);
    if (after === before) return;
    stats.changes++;
    if (!stats.firstTypo) stats.firstTypo = Math.max(1, seconds());
    note('edit', blockLabel(b) + ': ' + LABELS[k] + ' ' + before + ' → ' + after);
    checkTasks();
  }

  function setAlign(b, val) {
    pushUndo();
    b.align = val;
    blkEl(b.id).style.cssText = css(b);
    note('other', blockLabel(b) + ': aligned ' + (val || 'left'));
  }

  function setType(b, type, level) {
    if (b.type === type && (type !== 'heading' || b.level === level)) return;
    const before = blockName(b);
    pushUndo();
    b.type = type;
    if (type === 'heading') b.level = level || 2; else delete b.level;
    stats.transforms++;
    note('other', 'Changed ' + before + ' to ' + blockLabel(b));
    renderCanvas();
    checkTasks();
  }

  function move(b, dir) {
    const i = S.blocks.indexOf(b);
    const j = i + dir;
    if (j < 0 || j >= S.blocks.length) return;
    pushUndo();
    S.blocks.splice(i, 1);
    S.blocks.splice(j, 0, b);
    note('other', 'Moved ' + blockLabel(b) + (dir < 0 ? ' up' : ' down'));
    renderCanvas();
  }

  function format(cmd) {
    const b = selected();
    if (!b) return;
    const el = blkEl(b.id);
    const sel = getSelection();
    // Nothing selected: the whole block, and the caret goes back afterwards so typing doesn't replace it.
    const whole = !sel.rangeCount || sel.isCollapsed || !el.contains(sel.anchorNode);
    if (whole) {
      const r = document.createRange();
      r.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    pushUndo();
    document.execCommand(cmd);
    if (whole) sel.collapseToEnd();
    b.html = el.innerHTML;
    note('other', blockLabel(b) + ': ' + cmd);
  }

  function inert(label) {
    stats.inert++;
    note('other', 'Clicked “' + label + '”, which does nothing in this prototype');
    toast('“' + label + '” isn’t part of this prototype.');
  }

  // Opening a menu, a flyout, a tab or a hidden control: the looking around.
  function opened(what) {
    stats.opens++;
    note('look', 'Opened ' + what);
  }

  const MENU_NAMES = {
    transform: 'the block’s transform menu', level: 'the heading level menu', align: 'the align menu', moreformat: 'the “More” formatting menu',
    options: 'the options menu', style: 'the text style menu', font: 'the Font menu', size: 'the Size menu', moretext: '“More text options”',
    blockname: 'the block name menu', typoopts: 'the Typography panel’s options menu'
  };

  function toggleMenu(name) {
    if (S.menu === name) { S.menu = null; S.fly = null; S.q = ''; return; }
    S.menu = name;
    S.fly = null;
    S.q = '';
    opened(MENU_NAMES[name] || name);
  }

  function select(id) {
    if (S.sel === id) return;
    flushNumber();
    S.sel = id;
    S.menu = null;
    S.fly = null;
    if (id) {
      S.tab = 'block';
      note('select', 'Selected ' + blockLabel(block(id)));
    }
    app.querySelectorAll('.blk').forEach((el) => el.classList.toggle('is-selected', el.dataset.id === id));
    renderChrome();
  }

  // ---------- Tasks ----------

  function checkTasks() {
    TASKS.forEach((t, i) => {
      if (t.done() && !firstDone[i]) {
        firstDone[i] = { at: elapsed(), s: Math.max(1, seconds()) };
        ticked[i] = true;
        note('task', 'Task ' + (i + 1) + ' reached: ' + t.text);
      }
    });
    renderNotes();
  }

  function completionCode() {
    return [
      VARIANTS[VARIANT].code,
      TASKS.map((t) => (t.done() ? 1 : 0)).join(''),
      't' + TASKS.map((t, i) => (firstDone[i] ? firstDone[i].s : 0)).join('.'),
      'f' + stats.firstTypo,
      'c' + stats.changes,
      'm' + stats.opens,
      'x' + stats.transforms,
      'e' + stats.finishBack,
      's' + seconds()
    ].join('-');
  }

  // ---------- Icons ----------

  const svg = (d, extra) => '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"' + (extra || '') + '>' + d + '</svg>';
  const line = (d) => svg('<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.5"/>');
  const ICON = {
    up: line('M7 14l5-5 5 5'),
    down: line('M7 10l5 5 5-5'),
    chev: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    right: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 3l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    drag: svg('<g fill="currentColor"><circle cx="9" cy="7" r="1.4"/><circle cx="15" cy="7" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="17" r="1.4"/><circle cx="15" cy="17" r="1.4"/></g>'),
    left: line('M5 7h14M5 12h9M5 17h12'),
    center: line('M5 7h14M8 12h8M6 17h12'),
    alignright: line('M5 7h14M10 12h9M7 17h12'),
    link: line('M10 14a3.5 3.5 0 005 0l3-3a3.5 3.5 0 00-5-5l-1 1M14 10a3.5 3.5 0 00-5 0l-3 3a3.5 3.5 0 005 5l1-1'),
    dots: svg('<g fill="currentColor"><circle cx="12" cy="6" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="18" r="1.6"/></g>'),
    trash: line('M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10.5 10.5v5M13.5 10.5v5'),
    para: svg('<path d="M10 5h8v1.5h-2V19h-1.5V6.5h-2V19H11v-6a4 4 0 01-1-8z" fill="currentColor"/>'),
    plus: line('M12 6v12M6 12h12'),
    undo: line('M9 7l-4 4 4 4M5 11h9a4 4 0 010 8h-3'),
    redo: line('M15 7l4 4-4 4M19 11h-9a4 4 0 000 8h3'),
    panel: line('M4.5 5.5h15v13h-15zM14.5 5.5v13'),
    close: line('M7 7l10 10M17 7L7 17'),
    // Two sliders with round knobs, for "More text options".
    textopts: svg('<path d="M4 9h16M4 15h16" stroke="currentColor" stroke-width="1.5"/><circle cx="15.5" cy="9" r="2.25" fill="currentColor"/><circle cx="8.5" cy="15" r="2.25" fill="currentColor"/>'),
    sliders: line('M5 8h9M17 8h2M5 16h2M10 16h9M15.5 6v4M8.5 14v4'),
    search: line('M11 17a6 6 0 100-12 6 6 0 000 12zM15.5 15.5L19 19')
  };
  const blockIcon = (b) => (b.type === 'heading' ? '<span class="tb-glyph">H' + b.level + '</span>' : ICON.para);
  const alignIcon = (b) => ICON[b.align === 'center' ? 'center' : b.align === 'right' ? 'alignright' : 'left'];

  // ---------- The seven controls, the same in every variant ----------

  function seg(key, options, current) {
    return '<div class="seg" role="group" aria-label="' + LABELS[key] + '">' + options.map((o) =>
      '<button data-set="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (current === o[0]) + '" title="' + (o[2] || o[1]) + '" aria-label="' + (o[2] || o[1]) + '">' + o[1] + '</button>').join('') + '</div>';
  }

  function control(key, b) {
    const t = b.typo;
    const d = defaults(b);
    const id = 'c-' + key;
    if (key === 'font') {
      return '<div class="ctl"><label for="' + id + '">Font</label><select id="' + id + '" data-k="font">' +
        '<option value="">Default</option>' + FONTS.map((f) => '<option value="' + f.id + '"' + (t.font === f.id ? ' selected' : '') + '>' + f.name + '</option>').join('') +
        '</select></div>';
    }
    if (key === 'size') {
      const custom = S.customSize[b.id] || t.custom != null;
      return '<div class="ctl"><div class="ctl-head"><label' + (custom ? ' for="' + id + '"' : '') + '>Size' + (custom ? '' : ' <span class="ctl-value">' + (SIZES.find((s) => s.id === t.size) || { name: 'Default' }).name + '</span>') + '</label>' +
        '<button class="ctl-icon" data-act="custom-size" aria-pressed="' + custom + '" title="' + (custom ? 'Use size preset' : 'Set custom size') + '" aria-label="' + (custom ? 'Use size preset' : 'Set custom size') + '">' + ICON.sliders + '</button></div>' +
        (custom
          ? '<div class="ctl-unit"><input id="' + id + '" type="number" data-k="custom" min="8" max="160" step="1" value="' + eff(b).px + '"><span>px</span></div>'
          : seg('size', SIZES.map((s) => [s.id, s.short, s.name + ', ' + s.px + 'px']), t.size)) +
        '</div>';
    }
    if (key === 'appearance') {
      return '<div class="ctl"><label for="' + id + '">Appearance</label><select id="' + id + '" data-k="appearance">' +
        APPEARANCES.map((a) => '<option value="' + a[0] + '"' + (t.appearance === a[0] ? ' selected' : '') + '>' + a[1] + '</option>').join('') + '</select></div>';
    }
    if (key === 'lineHeight') {
      return '<div class="ctl"><label for="' + id + '">Line height</label><input id="' + id + '" type="number" data-k="lineHeight" min="1" max="3" step="0.1" value="' + eff(b).lh + '"></div>';
    }
    if (key === 'letterSpacing') {
      return '<div class="ctl"><label for="' + id + '">Letter spacing</label><div class="ctl-unit"><input id="' + id + '" type="number" data-k="letterSpacing" min="-2" max="20" step="0.5" value="' + eff(b).ls + '"><span>px</span></div></div>';
    }
    if (key === 'decoration') return '<div class="ctl"><span class="ctl-label">Decoration</span>' + seg('decoration', DECORATIONS, t.decoration) + '</div>';
    return '<div class="ctl"><span class="ctl-label">Letter case</span>' + seg('case', CASES, t.case) + '</div>';
  }

  // ---------- Menus ----------

  const item = (attrs, label, opts) => '<button class="mi' + (opts && opts.cls ? ' ' + opts.cls : '') + '" role="menuitem" ' + attrs + (opts && opts.current ? ' aria-current="true"' : '') + (opts && opts.style ? ' style="' + opts.style + '"' : '') + '>' +
    '<span>' + label + '</span>' + (opts && opts.value ? '<em>' + opts.value + '</em>' : '') + (opts && opts.fly ? ICON.right : '') + '</button>';
  const dead = (label) => item('data-inert="' + esc(label) + '"', label);
  const group = (title) => '<div class="mi-title">' + title + '</div>';

  function transformItems(b) {
    return item('data-type="paragraph"', 'Paragraph', { current: b.type === 'paragraph' }) +
      item('data-type="heading"', 'Heading', { current: b.type === 'heading' }) +
      dead('List') + dead('Quote');
  }
  const levelItems = (b) => [1, 2, 3, 4].map((n) => item('data-type="heading" data-level="' + n + '"', 'Heading ' + n, { current: b.type === 'heading' && b.level === n })).join('');
  const alignItems = (b) => [['', 'Align text left'], ['center', 'Align text center'], ['right', 'Align text right']].map((a) => item('data-align="' + a[0] + '"', a[1], { current: (b.align || '') === a[0] })).join('');

  // The menu variant's options menu: one menu, every item labelled, with flyouts.
  const FLYOUTS = { align: 'Align', typography: 'Typography', format: 'Format', styles: 'Styles', insert: 'Insert', more: 'More' };

  function flyout(name, b) {
    if (name === 'align') return group('Text alignment') + alignItems(b);
    if (name === 'typography') return '<div class="fly-controls">' + KEYS.map((k) => control(k, b)).join('') + '</div>';
    if (name === 'format') return item('data-format="bold"', 'Bold') + item('data-format="italic"', 'Italic') + dead('Link') + dead('Highlight') + dead('Inline code') + dead('Strikethrough');
    if (name === 'styles') return dead('Copy styles') + dead('Paste styles');
    if (name === 'insert') return dead('Inline image') + dead('Footnote') + dead('Block before') + dead('Block after');
    return dead('Lock') + dead('Rename') + dead('Hide') + dead('Edit as HTML');
  }

  // What the options menu's search can find, and where each thing lives.
  const SEARCH = [
    ['Align text left', 'Align', 'data-align=""'], ['Align text center', 'Align', 'data-align="center"'], ['Align text right', 'Align', 'data-align="right"']
  ].concat(KEYS.map((k) => [LABELS[k], 'Typography', 'data-fly="typography"']), [
    ['Bold', 'Format', 'data-format="bold"'], ['Italic', 'Format', 'data-format="italic"'], ['Link', 'Format'], ['Highlight', 'Format'], ['Inline code', 'Format'], ['Strikethrough', 'Format'],
    ['Copy styles', 'Styles'], ['Paste styles', 'Styles'],
    ['Inline image', 'Insert'], ['Footnote', 'Insert'], ['Block before', 'Insert'], ['Block after', 'Insert'],
    ['Duplicate'], ['Group'], ['Create pattern'], ['Lock', 'More'], ['Rename', 'More'], ['Hide', 'More'], ['Edit as HTML', 'More']
  ]);

  function optionsMenuB(b) {
    const q = S.q.trim().toLowerCase();
    let body;
    if (q) {
      const hits = SEARCH.filter((s) => s[0].toLowerCase().includes(q) || (s[1] || '').toLowerCase().includes(q));
      body = hits.length
        ? hits.map((s) => item(s[2] || 'data-inert="' + s[0] + '"', s[0], { value: s[1] ? 'in ' + s[1] : '' })).join('')
        : '<p class="mi-empty">Nothing found.</p>';
    } else {
      const alignName = { '': 'Left', center: 'Center', right: 'Right' }[b.align || ''];
      body = Object.keys(FLYOUTS).slice(0, 5).map((f) => item('data-fly="' + f + '" aria-haspopup="true" aria-expanded="' + (S.fly === f) + '"', FLYOUTS[f], { fly: true, value: f === 'align' ? alignName : '', cls: S.fly === f ? 'is-open' : '' })).join('') +
        '<hr>' + dead('Copy') + dead('Cut') + dead('Duplicate') + dead('Group') + dead('Create pattern') + '<hr>' +
        item('data-fly="more" aria-haspopup="true" aria-expanded="' + (S.fly === 'more') + '"', 'More', { fly: true, cls: S.fly === 'more' ? 'is-open' : '' });
    }
    return '<div class="pop-search">' + ICON.search + '<input type="search" data-q placeholder="Search" aria-label="Search options" value="' + esc(S.q) + '"></div>' +
      '<div class="pop-list">' + body + '</div>' +
      (S.fly && !q ? '<div class="pop fly" data-pop role="menu" aria-label="' + FLYOUTS[S.fly] + '">' + flyout(S.fly, b) + '</div>' : '');
  }

  function menuBody(name, b) {
    if (name === 'transform') return group('Transform to') + transformItems(b);
    if (name === 'level') return levelItems(b);
    if (name === 'align') return alignItems(b);
    if (name === 'moreformat') return dead('Highlight') + dead('Inline code') + dead('Inline image') + dead('Strikethrough') + dead('Footnote');
    if (name === 'style') return levelItems(b) + item('data-type="paragraph"', 'Paragraph', { current: b.type === 'paragraph' });
    if (name === 'font') {
      const d = fontOf(defaults(b).font);
      return item('data-set="font" data-v=""', 'Default', { current: !b.typo.font, value: d.name, style: 'font-family:' + d.stack }) +
        FONTS.map((f) => item('data-set="font" data-v="' + f.id + '"', f.name, { current: b.typo.font === f.id, style: 'font-family:' + f.stack })).join('');
    }
    if (name === 'size') return '<div class="fly-controls">' + control('size', b) + '</div>';
    if (name === 'moretext') return '<div class="fly-controls">' + ['appearance', 'lineHeight', 'letterSpacing', 'decoration', 'case'].map((k) => control(k, b)).join('') + '</div>';
    if (name === 'blockname') {
      return group('Transform') + transformItems(b) + (b.type === 'heading' ? group('Level') + levelItems(b) : '') +
        group('Style presets') + item('data-inert="Default style"', 'Default', { current: true });
    }
    if (name === 'options') {
      if (VARIANT === 'menu') return optionsMenuB(b);
      return dead('Copy') + dead('Cut') + dead('Duplicate') + dead('Add before') + dead('Add after') + '<hr>' +
        (VARIANT === 'toolbar' ? item('data-move="-1"', 'Move up') + item('data-move="1"', 'Move down') + '<hr>' : '') +
        dead('Copy styles') + dead('Paste styles') + '<hr>' + dead('Group') + dead('Lock') + dead('Rename') + dead('Create pattern') + dead('Edit as HTML') + '<hr>' + dead('Delete');
    }
    return '';
  }

  // A toolbar button, with its menu under it when it's the open one.
  function tb(opts, b) {
    const open = opts.menu && S.menu === opts.menu;
    const attrs = opts.menu ? 'data-menu="' + opts.menu + '" aria-haspopup="true" aria-expanded="' + open + '"' : opts.attrs;
    return '<span class="tb-item">' +
      '<button class="tb-btn' + (opts.wide ? ' is-wide' : '') + (open ? ' is-open' : '') + '" ' + attrs + ' title="' + opts.title + '" aria-label="' + opts.title + '"' + (opts.disabled ? ' disabled' : '') + '>' +
      opts.inner + (opts.menu && opts.wide ? ICON.chev : '') + '</button>' +
      (open ? '<div class="pop' + (opts.right ? ' is-right' : '') + (opts.menu === 'options' && VARIANT === 'menu' ? ' has-fly' : '') + '" data-pop role="menu" aria-label="' + opts.title + '">' + menuBody(opts.menu, b) + '</div>' : '') +
      '</span>';
  }

  function toolbarHTML(b) {
    const i = S.blocks.indexOf(b);
    const sep = '<span class="tb-sep"></span>';
    const up = tb({ attrs: 'data-move="-1"', title: 'Move up', inner: ICON.up, disabled: i === 0 }, b);
    const down = tb({ attrs: 'data-move="1"', title: 'Move down', inner: ICON.down, disabled: i === S.blocks.length - 1 }, b);
    const bold = tb({ attrs: 'data-format="bold"', title: 'Bold', inner: '<span class="tb-glyph"><b>B</b></span>' }, b);
    const italic = tb({ attrs: 'data-format="italic"', title: 'Italic', inner: '<span class="tb-glyph tb-italic">I</span>' }, b);
    const link = tb({ attrs: 'data-inert="Link"', title: 'Link', inner: ICON.link }, b);
    const align = tb({ menu: 'align', title: 'Align text', inner: alignIcon(b) }, b);
    const options = tb({ menu: 'options', title: 'Options', inner: ICON.dots, right: VARIANT !== 'menu' }, b);

    if (VARIANT === 'sidebar') {
      return tb({ menu: 'transform', title: blockName(b), inner: blockIcon(b) }, b) +
        tb({ attrs: 'data-inert="Drag"', title: 'Drag', inner: ICON.drag }, b) +
        '<span class="tb-movers">' + up + down + '</span>' + sep +
        (b.type === 'heading' ? tb({ menu: 'level', title: 'Change level', inner: '<span class="tb-glyph">H' + b.level + '</span>' }, b) : '') +
        align + sep + bold + italic + link +
        tb({ menu: 'moreformat', title: 'More', inner: ICON.down }, b) + sep + options;
    }
    if (VARIANT === 'toolbar') {
      const e = eff(b);
      return tb({ menu: 'style', title: 'Text style', inner: '<span>' + blockName(b) + '</span>', wide: true }, b) + sep +
        tb({ menu: 'font', title: 'Font', inner: '<span style="font-family:' + fontOf(e.font).stack + '">' + fontOf(e.font).name + '</span>', wide: true }, b) +
        tb({ menu: 'size', title: 'Size', inner: '<span>' + e.px + '</span>', wide: true }, b) + sep +
        bold + italic + link + sep + align +
        tb({ menu: 'moretext', title: 'More text options', inner: ICON.textopts }, b) + sep + options;
    }
    return tb({ menu: 'blockname', title: 'Change block', inner: blockIcon(b) + '<span>' + (b.type === 'heading' ? 'Heading' : 'Paragraph') + '</span>', wide: true }, b) + sep +
      up + down + sep + options +
      tb({ attrs: 'data-inert="Delete"', title: 'Delete', inner: ICON.trash }, b);
  }

  // ---------- The settings sidebar ----------

  function sidebarHTML() {
    const b = selected();
    const head = '<div class="sb-tabs" role="tablist">' +
      '<button role="tab" data-tab="page" aria-selected="' + (S.tab === 'page') + '">Page</button>' +
      '<button role="tab" data-tab="block" aria-selected="' + (S.tab === 'block') + '">Block</button>' +
      '<button class="sb-close" data-act="sidebar" title="Close Settings" aria-label="Close Settings">' + ICON.close + '</button></div>';
    if (S.tab === 'page') {
      return head + '<div class="sb-body"><div class="sb-card"><strong>Home</strong><p>The page you’re editing.</p></div>' +
        '<dl class="sb-rows"><dt>Status</dt><dd>Published</dd><dt>Link</dt><dd>/</dd><dt>Author</dt><dd>[site owner]</dd><dt>Template</dt><dd>Pages</dd><dt>Discussion</dt><dd>Closed</dd></dl></div>';
    }
    if (!b) return head + '<div class="sb-body"><p class="sb-empty">No block selected.</p></div>';
    let typo = '';
    if (VARIANT === 'sidebar') {
      const shown = S.shown[b.id] || {};
      const on = (k) => k === 'size' || shown[k] || hasValue(b, k);
      const open = S.menu === 'typoopts';
      typo = '<section class="sb-panel"><div class="sb-panel-head"><h3>Typography</h3>' +
        '<span class="tb-item"><button class="ctl-icon' + (open ? ' is-open' : '') + '" data-menu="typoopts" aria-haspopup="true" aria-expanded="' + open + '" title="Typography options" aria-label="Typography options">' + ICON.dots + '</button>' +
        (open ? '<div class="pop is-right" data-pop role="menu" aria-label="Typography options">' +
          KEYS.map((k) => '<button class="mi" role="menuitemcheckbox" aria-checked="' + !!on(k) + '" data-show="' + k + '"><span>' + LABELS[k] + '</span><em>' + (on(k) ? '✓' : '') + '</em></button>').join('') +
          '<hr>' + item('data-act="reset-typo"', 'Reset all') + '</div>' : '') +
        '</span></div>' + KEYS.filter(on).map((k) => control(k, b)).join('') + '</section>';
    }
    const row = (label) => '<button class="sb-row" data-inert="' + label + '"><span class="sb-swatch"></span>' + label + '</button>';
    return head + '<div class="sb-body">' +
      '<div class="sb-card"><span class="sb-card-icon">' + blockIcon(b) + '</span><div><strong>' + (b.type === 'heading' ? 'Heading' : 'Paragraph') + '</strong><p>' +
      (b.type === 'heading' ? 'Introduce new sections and organize content to help visitors (and search engines) understand the structure of your content.' : 'Start with the basic building block of all narrative.') + '</p></div></div>' +
      '<section class="sb-panel"><div class="sb-panel-head"><h3>Color</h3><button class="ctl-icon" data-inert="Color options" title="Color options" aria-label="Color options">' + ICON.dots + '</button></div>' + row('Text') + row('Background') + '</section>' +
      typo +
      '<section class="sb-panel"><div class="sb-panel-head"><h3>Dimensions</h3><button class="ctl-icon" data-inert="Dimensions options" title="Dimensions options" aria-label="Dimensions options">' + ICON.plus + '</button></div></section>' +
      '<section class="sb-panel"><button class="sb-toggle" data-inert="Advanced">Advanced ' + ICON.chev + '</button></section>' +
      '</div>';
  }

  function hasValue(b, k) {
    const t = b.typo;
    if (k === 'size') return !!t.size || t.custom != null;
    return t[k] !== '' && t[k] != null;
  }

  // ---------- Drawing ----------

  const blkEl = (id) => app.querySelector('.blk[data-id="' + id + '"]');

  function blockHTML(b) {
    const tag = b.type === 'heading' ? 'h' + b.level : 'p';
    return '<' + tag + ' class="blk' + (S.sel === b.id ? ' is-selected' : '') + '" data-id="' + b.id + '" contenteditable="true" spellcheck="false" style="' + css(b) + '">' + b.html + '</' + tag + '>' +
      // A picture that isn't a block: it keeps the main heading clear of the toolbar of the paragraph under it.
      (b.id === 'h1' ? '<figure class="picture" aria-hidden="true"><svg viewBox="0 0 720 220" preserveAspectRatio="xMidYMid slice"><rect width="720" height="220" fill="#e9dcc3"/><ellipse cx="210" cy="150" rx="150" ry="62" fill="#b9793a"/><ellipse cx="210" cy="140" rx="150" ry="62" fill="#d39a55"/><path d="M120 120l30 36M180 108l30 40M240 108l30 40" stroke="#f1d6a8" stroke-width="7" stroke-linecap="round"/><ellipse cx="520" cy="158" rx="118" ry="50" fill="#a86a30"/><ellipse cx="520" cy="148" rx="118" ry="50" fill="#c58947"/><path d="M455 132l26 30M515 124l26 34M575 132l22 28" stroke="#efd2a0" stroke-width="6" stroke-linecap="round"/></svg></figure>' : '');
  }

  function renderCanvas() {
    app.querySelector('[data-blocks]').innerHTML = S.blocks.map(blockHTML).join('');
    renderChrome();
  }

  // The toolbar, the sidebar and the top bar's buttons. The page's text is
  // left alone, so the caret stays where it is.
  function renderChrome(focus) {
    const b = selected();
    const layer = app.querySelector('[data-tb]');
    layer.innerHTML = b ? '<div class="tb" role="toolbar" aria-label="Block tools">' + toolbarHTML(b) + '</div>' : '';
    const side = app.querySelector('[data-sidebar]');
    side.hidden = !S.sidebar;
    side.innerHTML = S.sidebar ? sidebarHTML() : '';
    positionToolbar();
    app.querySelector('[data-act="sidebar"]').setAttribute('aria-pressed', S.sidebar);
    app.querySelector('[data-act="undo"]').disabled = !S.undo.length;
    app.querySelector('[data-act="redo"]').disabled = !S.redo.length;
    // A menu that opens below the fold is scrolled into view, flyout included.
    const pops = app.querySelectorAll('.tb-layer [data-pop]');
    if (pops.length) pops[pops.length - 1].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (focus) {
      const target = app.querySelector(focus);
      if (target) {
        target.focus({ preventScroll: true });
        if (target.type === 'search') target.setSelectionRange(target.value.length, target.value.length);
      }
    }
    renderNotes();
  }

  function render() {
    app.className = 'app' + (NOTES ? ' has-notes' : '');
    app.innerHTML =
      '<header class="topbar"><span class="logo" aria-hidden="true">W</span>' +
      '<button class="top-btn is-primary" data-inert="Add block" title="Add block" aria-label="Add block">' + ICON.plus + '</button>' +
      '<button class="top-btn" data-act="undo" title="Undo" aria-label="Undo">' + ICON.undo + '</button>' +
      '<button class="top-btn" data-act="redo" title="Redo" aria-label="Redo">' + ICON.redo + '</button>' +
      '<p class="topbar-title"><strong>Home</strong> · Page</p>' +
      '<button class="btn" data-inert="View">View</button>' +
      '<button class="btn btn-primary" data-act="save">Save</button>' +
      '<button class="top-btn" data-act="sidebar" title="Settings" aria-label="Settings" aria-pressed="true">' + ICON.panel + '</button>' +
      '<button class="top-btn" data-inert="Options" title="Options" aria-label="Options">' + ICON.dots + '</button></header>' +
      '<div class="main"><div class="canvas-scroll" data-canvas><div class="canvas"><div class="sheet">' +
      '<div class="site-head"><span class="site-name">Marlow Lane Bakery</span><span class="site-menu"><span>Home</span><span>Our bread</span><span>Find us</span></span></div>' +
      '<div class="blocks" data-blocks></div><div class="tb-layer" data-tb></div><div class="seltb" data-seltb hidden></div>' +
      '</div></div></div><aside class="sidebar" data-sidebar aria-label="Settings"></aside></div>' +
      '<div class="bottombar"><button class="btn btn-primary" data-finish>Finished</button><p>Click Finished when you’ve done everything you were asked to.</p></div>';
    renderCanvas();
  }

  // ---------- Events ----------

  // Buttons on the toolbar don't take the caret or the selection out of the text.
  app.addEventListener('mousedown', (e) => {
    if (e.target.closest('.tb-layer button, .seltb button')) e.preventDefault();
    const canvas = e.target.closest('[data-canvas]');
    // A press on the canvas's own scrollbar isn't a click on the page.
    if (canvas && e.target === canvas && (e.offsetX >= canvas.clientWidth || e.offsetY >= canvas.clientHeight)) return;
    if (canvas && !e.target.closest('.blk, .tb-layer, .seltb')) {
      if (S.sel) note('select', 'Clicked away from the blocks');
      select(null);
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (S.menu && !e.target.closest('[data-pop], [data-menu]')) closeMenus();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.menu) {
      const name = S.menu;
      if (S.fly) S.fly = null; else { S.menu = null; S.q = ''; }
      renderChrome(S.menu ? '[data-q]' : '[data-menu="' + name + '"]');
    }
  });

  app.addEventListener('focusin', (e) => {
    const el = e.target.closest('.blk');
    if (el) select(el.dataset.id);
    const num = e.target.closest('input[type="number"][data-k]');
    if (num && selected()) { num._b = selected(); num._before = describe(selected(), num.dataset.k === 'custom' ? 'size' : num.dataset.k); num._snap = false; }
  });

  app.addEventListener('focusout', (e) => {
    const num = e.target.closest('input[type="number"][data-k]');
    if (num) commitNumber(num);
  });

  app.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest('.blk')) e.preventDefault();
  });

  app.addEventListener('paste', (e) => {
    if (!e.target.closest('.blk')) return;
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' '));
  });

  app.addEventListener('input', (e) => {
    const el = e.target.closest('.blk');
    if (el) {
      const b = block(el.dataset.id);
      if (!el._edited) { el._edited = true; stats.textEdits++; note('other', 'Typed in ' + blockLabel(b)); }
      b.html = el.innerHTML;
      return;
    }
    if (e.target.matches('[data-q]')) {
      S.q = e.target.value;
      S.fly = null;
      renderChrome('[data-q]');
      return;
    }
    // Number boxes change the page as you type; the change is logged when you leave the box.
    const num = e.target.closest('input[type="number"][data-k]');
    const b = selected();
    if (num && b) {
      const key = num.dataset.k;
      let v = num.value === '' ? null : Number(num.value);
      if (v != null && (isNaN(v) || v < Number(num.min) || v > Number(num.max))) return;
      if (key === 'custom' && v == null) return;
      if (!num._snap) { pushUndo(); num._snap = true; app.querySelector('[data-act="undo"]').disabled = false; }
      applyTypo(b, key, v);
      if (!stats.firstTypo) stats.firstTypo = Math.max(1, seconds());
      const label = app.querySelector('[data-menu="size"] span');
      if (label) label.textContent = eff(b).px;
      checkTasks();
      positionToolbar();
    }
  });

  app.addEventListener('change', (e) => {
    const b = selected();
    if (!b) return;
    const sel = e.target.closest('select[data-k]');
    if (sel) { setTypo(b, sel.dataset.k, sel.value, '#' + sel.id); return; }
  });

  function positionToolbar() {
    const bar = app.querySelector('.tb');
    const b = selected();
    if (!bar || !b) return;
    const el = blkEl(b.id);
    bar.style.top = (el.offsetTop - bar.offsetHeight - 12) + 'px';
    bar.style.left = el.offsetLeft + 'px';
  }
  window.addEventListener('resize', positionToolbar);

  // A number box's change is logged once, when the person leaves the box.
  function commitNumber(num) {
    const b = num._b;
    if (!b || !block(b.id)) return;
    const key = num.dataset.k;
    const k = key === 'custom' ? 'size' : key;
    logTypo(b, key, num._before);
    num._before = describe(b, k);
    num._snap = false;
    // The box shows what was applied, so a number outside the range doesn't linger.
    const e = eff(b);
    num.value = key === 'custom' ? e.px : key === 'lineHeight' ? e.lh : e.ls;
  }

  function flushNumber() {
    const a = document.activeElement;
    if (a && a.matches && a.matches('input[type="number"][data-k]')) commitNumber(a);
  }

  // Closing a menu without redrawing, so the click that closed it still lands on what was clicked.
  function closeMenus() {
    S.menu = null; S.fly = null; S.q = '';
    app.querySelectorAll('[data-pop]').forEach((el) => el.remove());
    app.querySelectorAll('[data-menu]').forEach((el) => { el.classList.remove('is-open'); el.setAttribute('aria-expanded', 'false'); });
  }

  app.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    flushNumber();
    const b = selected();
    const d = t.dataset;

    if ('finish' in d) { finish(); return; }
    if (d.inert) { inert(d.inert); return; }
    if (d.act === 'undo') { travel(S.undo, S.redo, 'Undo'); return; }
    if (d.act === 'redo') { travel(S.redo, S.undo, 'Redo'); return; }
    if (d.act === 'save') { syncText(); stats.saves++; note('other', 'Saved'); toast('Saved.'); return; }
    if (d.act === 'sidebar') {
      S.sidebar = !S.sidebar;
      if (S.menu === 'typoopts') S.menu = null;
      if (S.sidebar) opened('the settings sidebar'); else note('look', 'Closed the settings sidebar');
      renderChrome();
      return;
    }
    if (d.tab) {
      if (S.tab !== d.tab) { S.tab = d.tab; opened('the sidebar’s ' + (d.tab === 'page' ? 'Page' : 'Block') + ' tab'); renderChrome('[data-tab="' + d.tab + '"]'); }
      return;
    }
    if (!b) return;

    if (d.menu) { toggleMenu(d.menu); renderChrome(); return; }
    if (d.fly) {
      S.q = '';
      if (S.fly === d.fly) S.fly = null; else { S.fly = d.fly; opened('the options menu’s ' + FLYOUTS[d.fly] + ' flyout'); }
      renderChrome();
      return;
    }
    if (d.show) {
      const shown = S.shown[b.id] || (S.shown[b.id] = {});
      const k = d.show;
      const isOn = k === 'size' || shown[k] || hasValue(b, k);
      if (isOn) {
        // Unticking a control resets it, as the editor's panel does.
        const before = describe(b, k);
        pushUndo();
        shown[k] = false;
        if (k === 'size') { applyTypo(b, 'size', ''); S.customSize[b.id] = false; }
        else applyTypo(b, k, k === 'lineHeight' || k === 'letterSpacing' ? null : '');
        logTypo(b, k, before);
        note('look', 'Typography options: reset ' + LABELS[k]);
      } else {
        shown[k] = true;
        opened('the ' + LABELS[k] + ' control, from the Typography panel’s options');
      }
      renderChrome();
      return;
    }
    if (d.act === 'reset-typo') {
      pushUndo();
      const had = KEYS.filter((k) => hasValue(b, k));
      b.typo = emptyTypo();
      S.shown[b.id] = {};
      S.customSize[b.id] = false;
      blkEl(b.id).style.cssText = css(b);
      S.menu = null;
      if (had.length) stats.changes++;
      note('edit', blockLabel(b) + ': reset all typography' + (had.length ? ' (' + had.map((k) => LABELS[k]).join(', ') + ')' : ''));
      checkTasks();
      renderChrome();
      return;
    }
    if (d.act === 'custom-size') {
      const on = !(S.customSize[b.id] || b.typo.custom != null);
      S.customSize[b.id] = on;
      if (on) opened('the custom size box');
      else if (b.typo.custom != null) { const before = describe(b, 'size'); pushUndo(); applyTypo(b, 'custom', null); logTypo(b, 'size', before); }
      renderChrome(on ? '#c-size' : null);
      return;
    }
    if (d.set) {
      // Pressing the size that's already chosen clears it, as in the editor.
      const v = d.set === 'size' && b.typo.size === d.v ? '' : d.v;
      if (d.set === 'font') S.menu = null;
      setTypo(b, d.set, v);
      return;
    }
    if (d.type) { S.menu = null; setType(b, d.type, d.level ? Number(d.level) : undefined); renderChrome(); return; }
    if ('align' in d) { setAlign(b, d.align); S.menu = null; S.fly = null; S.q = ''; renderChrome(); return; }
    if (d.move) { S.menu = null; move(b, Number(d.move)); return; }
    if (d.format) { format(d.format); if (S.menu) { S.menu = null; S.fly = null; S.q = ''; renderChrome(); } return; }
  });

  // The menu variant: formatting appears when text is selected.
  document.addEventListener('selectionchange', () => {
    if (VARIANT !== 'menu') return;
    const bar = app.querySelector('[data-seltb]');
    if (!bar) return;
    const sel = getSelection();
    const node = sel.rangeCount && !sel.isCollapsed ? sel.getRangeAt(0).commonAncestorContainer : null;
    const el = node && (node.nodeType === 1 ? node : node.parentElement).closest('.blk');
    if (!el) { bar.hidden = true; return; }
    if (bar.hidden) {
      bar.innerHTML = '<button class="tb-btn" data-format="bold" title="Bold" aria-label="Bold"><span class="tb-glyph"><b>B</b></span></button>' +
        '<button class="tb-btn" data-format="italic" title="Italic" aria-label="Italic"><span class="tb-glyph tb-italic">I</span></button>' +
        '<button class="tb-btn" data-inert="Link" title="Link" aria-label="Link">' + ICON.link + '</button>';
      bar.hidden = false;
      note('look', 'Selected some text; the formatting toolbar appeared');
    }
    const r = sel.getRangeAt(0).getBoundingClientRect();
    const sheet = app.querySelector('.sheet').getBoundingClientRect();
    bar.style.top = (r.bottom - sheet.top + 8) + 'px';
    bar.style.left = Math.max(0, r.left - sheet.left) + 'px';
  });

  // ---------- Finished ----------

  // Finished asks first, then shows the code in a dialog. Clicking Finished
  // again later gives a new code.
  let finishEl = null;
  let finishSure = false;
  let finishSkipClose = false;
  function finish() {
    flushNumber();
    syncText();
    if (!finishEl) {
      finishEl = document.createElement('dialog');
      finishEl.className = 'finish';
      finishEl.setAttribute('aria-labelledby', 'finish-title');
      document.body.append(finishEl);
      finishEl.addEventListener('close', () => {
        if (finishSkipClose) { finishSkipClose = false; return; } // on the way to the code
        if (finishEl.querySelector('[data-sure]')) stats.finishBack++;
        note('task', 'Went back to editing');
        const btn = app.querySelector('[data-finish]');
        if (btn) btn.focus();
      });
      finishEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-back]')) {
          finishEl.close();
          return;
        }
        if (e.target.closest('[data-sure]')) { finishSure = true; finishSkipClose = true; finishEl.close(); finish(); return; }
        if (!e.target.closest('[data-copy-code]')) return;
        const input = finishEl.querySelector('textarea');
        input.select();
        (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject()).then(
          () => toast('Code copied.'),
          () => { try { document.execCommand('copy'); toast('Code copied.'); } catch (err) { toast('Select the code and copy it.'); } }
        );
      });
    }
    if (!finishSure) {
      note('task', 'Clicked Finished and was asked whether every task is done');
      finishEl.innerHTML = '<h2 id="finish-title">Have you done every task?</h2><p>Finished is the last step. Only carry on if you’ve done everything you were asked to.</p>' +
        '<div class="finish-actions"><button class="btn btn-primary" data-sure>Yes, I’ve finished</button><button class="link" data-back>Not yet, keep editing</button></div>';
      finishEl.showModal();
      finishEl.querySelector('[data-back]').focus();
      return;
    }
    finishSure = false;
    const code = completionCode();
    note('task', 'Clicked Finished. Code ' + code);
    finishEl.innerHTML = '<h2 id="finish-title">Thank you</h2><p>Please copy this code into the next question:</p>' +
      '<textarea class="task-code" readonly rows="2" aria-label="Your code">' + code + '</textarea>' +
      '<div class="finish-actions"><button class="btn btn-primary" data-copy-code>Copy code</button><button class="link" data-back>Keep editing</button></div>';
    finishEl.showModal();
    const input = finishEl.querySelector('textarea');
    input.focus();
    input.select();
  }

  // ---------- Facilitator notes ----------

  let notesEl = null;
  function renderNotes() {
    if (!NOTES || !S) return;
    if (!notesEl) {
      notesEl = document.createElement('aside');
      notesEl.className = 'notes';
      notesEl.setAttribute('aria-label', 'Facilitator notes');
      document.body.append(notesEl);
      notesEl.addEventListener('change', (e) => {
        const box = e.target.closest('[data-task]');
        if (!box) return;
        ticked[box.dataset.task] = box.checked;
        note('task', 'Facilitator ' + (box.checked ? 'ticked' : 'unticked') + ' task ' + (Number(box.dataset.task) + 1));
      });
      notesEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-copy]')) {
          const textLog = log.map((l) => l.at + '  ' + l.text).join('\n');
          (navigator.clipboard ? navigator.clipboard.writeText(textLog) : Promise.reject()).then(() => toast('Log copied.'), () => toast('Couldn’t copy. Select the log and copy it.'));
        }
        if (e.target.closest('[data-reset]')) { reset(); render(); toast('The page is back as it started.'); }
      });
    }
    const suffix = location.hash === '#notes' ? '#notes' : '?notes';
    const links = Object.keys(VARIANTS).map((v) => '<a href="' + VARIANTS[v].file + suffix + '"' + (v === VARIANT ? ' aria-current="page"' : '') + '>' + VARIANTS[v].letter + '</a>').join('');
    const tasks = TASKS.map((t, i) =>
      '<li class="' + (ticked[i] ? 'is-done' : '') + '"><label><input type="checkbox" data-task="' + i + '"' + (ticked[i] ? ' checked' : '') + '> ' + t.text + '</label>' +
      (firstDone[i] ? ' <time>' + firstDone[i].at + '</time>' : '') + '<small>' + t.hint + (firstDone[i] && !t.done() ? ' Reached, then undone.' : '') + '</small></li>').join('');
    notesEl.innerHTML =
      '<div class="notes-head"><h2>' + VARIANTS[VARIANT].letter + ' · Facilitator notes</h2><nav class="switcher" aria-label="Variant">' + links + '</nav></div>' +
      '<p>' + VARIANTS[VARIANT].name + '. Only you can see this panel; open the page without <code>?notes</code> for participants.</p>' +
      '<h3>Tasks</h3><ol class="tasks">' + tasks + '</ol>' +
      '<h3>Counts</h3><dl>' +
      '<dt>Seconds to the first typography change</dt><dd>' + (stats.firstTypo || '–') + '</dd>' +
      '<dt>Typography changes</dt><dd>' + stats.changes + '</dd>' +
      '<dt>Menus, flyouts, tabs and hidden controls opened</dt><dd>' + stats.opens + '</dd>' +
      '<dt>Blocks changed to another kind</dt><dd>' + stats.transforms + '</dd>' +
      '<dt>Clicks on things that do nothing here</dt><dd>' + stats.inert + '</dd>' +
      '<dt>Turned back at “Have you done every task?”</dt><dd>' + stats.finishBack + '</dd>' +
      '<dt>Saves</dt><dd>' + stats.saves + '</dd></dl>' +
      '<h3>Log</h3><ol class="log">' + (log.map((l) => '<li class="is-' + l.kind + '"><time>' + l.at + '</time>' + esc(l.text) + '</li>').join('') || '<li>Nothing yet.</li>') + '</ol>' +
      '<div class="actions"><button class="btn" data-copy>Copy log</button><button class="btn" data-reset>Reset</button></div>';
  }

  // ---------- Start ----------

  reset();
  render();
})();
