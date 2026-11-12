/*
 * Riley · This page or every page?
 *
 * One simulated site editor, five variants. The site, its pages, the editor
 * around it, the tasks and the log are the same in all five. Only the way the
 * shared header and footer are treated changes:
 *
 *   plain   The control. The header and footer look and behave like the rest
 *           of the page. Nothing says they are shared.
 *   marked  The header and footer look like the rest of the page until the
 *           pointer is over one. Then it is outlined and labelled "Shown on
 *           every page" with an "Edit header" button, and one click unlocks
 *           it. It locks again as soon as the person works anywhere else.
 *   site    No lock and no question. The header and footer carry "Site header"
 *           and "Site footer" labels, the page's content carries the page's
 *           name, and the top bar lists the whole site's parts beside the
 *           pages.
 *   told    Looks like the control. After each change to the header or footer
 *           a message says "Updated on all 3 pages", with Undo. It doesn't
 *           ask anything and doesn't get in the way.
 *   summary Looks like the control. Save lists what changed and where ("On
 *           every page", "Only on the About page") before saving.
 *
 * An earlier version had a fourth treatment, "ask" (the first change asks
 * "Every page" or "Just this page"). It was dropped after review; it is in
 * this folder's history.
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
    plain: { code: 'RP', letter: '0', name: 'Control: the header and footer look and behave like the rest of the page, and nothing says they are shared' },
    marked: { code: 'RM', letter: 'A', name: 'Shown on hover: pointing at the header or footer shows “Shown on every page” and an Edit button, and one click unlocks it' },
    site: { code: 'RS', letter: 'C', name: 'Always labelled: Site header, Site footer and the page’s name are always shown, with no lock and no question' },
    told: { code: 'RT', letter: 'D', name: 'Told after the change: nothing is marked, and each change to the header or footer is followed by “Updated on all 3 pages” with Undo' },
    summary: { code: 'RU', letter: 'E', name: 'Summary at save: nothing is marked, and Save lists what changed on every page and what changed on one page' }
  };
  const VARIANT = VARIANTS[document.body.dataset.variant] ? document.body.dataset.variant : 'marked';
  // These three show the header and footer exactly like the rest of the page.
  const UNMARKED = ['plain', 'told', 'summary'].includes(VARIANT);
  const NOTES = new URLSearchParams(location.search).has('notes') || location.hash === '#notes';

  const PAGES = [
    { id: 'home', name: 'Home', path: '' },
    { id: 'about', name: 'About', path: 'about' },
    { id: 'contact', name: 'Contact', path: 'contact' }
  ];

  // ---------- The starting site ----------

  // An invented bike repair shop. The header and footer are stored once and
  // shown on every page; each page has its own content.
  const START = {
    header: {
      name: 'Pennywheel Bike Repair',
      tagline: 'Repairs and servicing for everyday bikes',
      menu0: 'Home',
      menu1: 'About',
      menu2: 'Contact'
    },
    footer: {
      address: '12 Tannery Row, Eastmere',
      phone: '01632 960 147',
      hours: 'Tuesday to Saturday, 9am to 5pm',
      copyright: '© 2026 Pennywheel Bike Repair'
    },
    pages: {
      home: {
        title: 'Your bike, running smoothly again',
        intro: 'Bring in a bike that squeaks, slips or won’t stop, and ride it home the same week. We fix all kinds, from school-run bikes to old tourers.',
        caption: 'Most repairs are done within three days.',
        servicesTitle: 'What we do',
        s1Title: 'Punctures and tyres',
        s1Text: 'New tubes and tyres fitted while you wait, most days.',
        s2Title: 'Brakes and gears',
        s2Text: 'Cables, pads and adjustments so everything works first time.',
        s3Title: 'Full service',
        s3Text: 'A top-to-bottom check, clean and tune, with a list of what we found.',
        dropTitle: 'No booking needed',
        dropText: 'Drop your bike in any time we’re open. We’ll look it over with you and say what it needs and what it will cost before we start.'
      },
      about: {
        title: 'About the workshop',
        intro: 'Pennywheel started with one repair stand in a shed. Today it’s a small workshop with two mechanics and a lot of spare parts.',
        caption: 'The workbench, where most of the work happens.',
        whoTitle: 'Who we are',
        whoText: 'Sam and Priya have fixed bikes for more than twenty years between them. They would rather mend a part than replace it, and they’ll show you what they did.',
        howTitle: 'How we work',
        howText: 'We tell you the price before we start, we keep the old parts for you to see, and we only do the work a bike needs.'
      },
      contact: {
        title: 'Visit the workshop',
        intro: 'We’re at the end of Tannery Row, behind the old dye works. Look for the green door with a wheel on it.',
        caption: 'Tannery Row is a two-minute walk from the market square.',
        hereTitle: 'Getting here',
        hereText: 'There are bike racks outside the door. If you’re bringing a bike by car, you can stop in the yard for ten minutes to unload.',
        bookTitle: 'Booking a repair',
        bookText: 'You don’t need to book. For a full service, call ahead on the number at the bottom of this page and we’ll keep a stand free.'
      }
    }
  };

  // What each editable bit is called, in the log and for screen readers.
  const FIELD_NAME = {
    name: 'site name', tagline: 'line under the site name',
    menu0: 'menu item 1', menu1: 'menu item 2', menu2: 'menu item 3',
    address: 'address', phone: 'phone number', hours: 'opening hours', copyright: 'copyright line',
    title: 'main heading', intro: 'first paragraph', caption: 'picture caption',
    servicesTitle: 'second heading',
    s1Title: 'first service, name', s1Text: 'first service, description',
    s2Title: 'second service, name', s2Text: 'second service, description',
    s3Title: 'third service, name', s3Text: 'third service, description',
    dropTitle: 'third heading', dropText: 'last paragraph',
    whoTitle: 'second heading', whoText: 'second paragraph',
    howTitle: 'third heading', howText: 'third paragraph',
    hereTitle: 'second heading', hereText: 'second paragraph',
    bookTitle: 'third heading', bookText: 'third paragraph'
  };

  // Placeholder pictures, drawn here so the page loads nothing else.
  const PICTURES = {
    home: '<svg viewBox="0 0 640 280" role="img" aria-label="Drawing of a bicycle"><rect width="640" height="280" fill="#dfeae6"/><g fill="none" stroke="#1f5f5b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><circle cx="210" cy="180" r="62"/><circle cx="430" cy="180" r="62"/><path d="M210 180l60-90h110l50 90M270 90l60 90h-120M380 90l-50 90M258 72h34M380 90l-8-26h24"/></g><circle cx="330" cy="180" r="10" fill="#1f5f5b"/></svg>',
    about: '<svg viewBox="0 0 640 280" role="img" aria-label="Drawing of tools hanging above a workbench"><rect width="640" height="280" fill="#efe6d6"/><rect x="60" y="200" width="520" height="22" rx="4" fill="#8a6a45"/><rect x="90" y="222" width="18" height="58" fill="#8a6a45"/><rect x="532" y="222" width="18" height="58" fill="#8a6a45"/><g fill="none" stroke="#5b4a3a" stroke-width="10" stroke-linecap="round"><path d="M150 60v90M210 60v70M270 60v100"/><circle cx="150" cy="52" r="14"/><circle cx="360" cy="96" r="38"/><path d="M450 60v80M430 60h40M520 60v100"/></g><circle cx="360" cy="96" r="8" fill="#5b4a3a"/></svg>',
    contact: '<svg viewBox="0 0 640 280" role="img" aria-label="Drawing of a street map with a pin"><rect width="640" height="280" fill="#e6ece0"/><g stroke="#fff" stroke-width="22" fill="none" stroke-linecap="round"><path d="M-10 90h660M-10 210h420M180 -10v300M470 90v200"/></g><g stroke="#c9d3bf" stroke-width="2" fill="none"><path d="M-10 90h660M-10 210h420M180 -10v300M470 90v200"/></g><rect x="220" y="120" width="210" height="64" rx="6" fill="#d3ddc8"/><path d="M470 150c-26-34-40-52-40-74a40 40 0 0180 0c0 22-14 40-40 74z" fill="#b4532a"/><circle cx="470" cy="78" r="14" fill="#fff"/></svg>'
  };

  // ---------- State ----------

  let site;          // the site as it is now: header, footer and pages
  let view;          // { page, preview }
  let siteEdit;      // marked: which part is unlocked for editing
  let gateShown;     // marked: which part's label a tap has shown (touch has no hover)
  let unsaved;       // summary: what has changed since the last save, one entry per bit of text
  let sharedEdits;   // every change to a shared part, and whether another page was looked at since
  let log, stats, startedAt, firstDone, ticked;
  let editing = null; // the text being edited and what it said before
  let lastPointer = 'mouse';
  let hoverTimer = null;

  function reset() {
    site = JSON.parse(JSON.stringify(START));
    view = { page: 'home', preview: false };
    siteEdit = null;
    gateShown = null;
    unsaved = [];
    hideTold();
    sharedEdits = [];
    log = [];
    stats = {
      edits: { header: 0, footer: 0, body: 0 },
      gateShown: 0, gateThrough: 0,
      told: 0, toldUndo: 0,
      sumShown: 0, sumSaved: 0, sumBack: 0,
      whole: 0, previews: 0, previewPages: {}, saves: 0
    };
    startedAt = Date.now();
    firstDone = [];
    ticked = [];
    editing = null;
    clearTimeout(hoverTimer);
  }

  // ---------- Helpers ----------

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pageName = (id) => PAGES.find((p) => p.id === id).name;
  const seconds = () => Math.round((Date.now() - startedAt) / 1000);
  function elapsed() {
    const s = seconds();
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  // What a page shows for a bit of text. The header and footer are stored once.
  function value(part, key, page) {
    return part === 'body' ? site.pages[page][key] : site[part][key];
  }

  function note(kind, text) {
    log.push({ at: elapsed(), kind, text });
    renderNotes();
  }

  // told: the message after a change to the header or footer. It stays for a
  // while, longer if the pointer or keyboard focus is on it, and has Undo.
  let toldEl = null;
  let toldTimer = null;
  let toldRec = null;
  function hideTold() {
    clearTimeout(toldTimer);
    toldRec = null;
    if (toldEl) toldEl.classList.remove('is-shown');
  }
  function tell(rec) {
    if (!toldEl) {
      toldEl = document.createElement('div');
      toldEl.className = 'told';
      toldEl.setAttribute('role', 'status');
      document.body.append(toldEl);
      toldEl.addEventListener('click', (e) => { if (e.target.closest('[data-undo]')) undoTold(); });
      const wait = () => { clearTimeout(toldTimer); toldTimer = setTimeout(() => { if (toldEl.matches(':hover, :focus-within')) wait(); else hideTold(); }, 10000); };
      toldEl.wait = wait;
    }
    toldRec = rec;
    stats.told++;
    toldEl.innerHTML = '<p><strong>Updated on all ' + PAGES.length + ' pages.</strong> The ' + rec.part + ' is the same on ' + PAGES.map((p) => p.name).join(', ').replace(/, ([^,]*)$/, ' and $1') + '.</p><button class="btn" data-undo>Undo</button>';
    toldEl.classList.toggle('has-notes', NOTES);
    toldEl.classList.add('is-shown');
    toldEl.wait();
    note('told', 'Message shown: “Updated on all ' + PAGES.length + ' pages” (' + rec.part + ', ' + fieldName(rec.key) + ')');
  }
  function undoTold() {
    const rec = toldRec;
    if (!rec) return;
    hideTold();
    commitEditing();
    if (site[rec.part][rec.key] === rec.now) site[rec.part][rec.key] = rec.before;
    const i = sharedEdits.indexOf(rec.entry);
    if (i > -1) sharedEdits.splice(i, 1);
    stats.toldUndo++;
    note('undo', 'Used Undo in the message: the ' + rec.part + ' (' + fieldName(rec.key) + ') went back to “' + rec.before + '” on every page');
    render('[data-part="' + rec.part + '"][data-key="' + rec.key + '"]');
    checkTasks();
  }

  let toastTimer = null;
  function toast(text) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = text;
    el.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-shown'), 2500);
  }

  // ---------- Drawing the site ----------

  // Can this part's text be edited right now?
  function editable(part) {
    if (view.preview) return false;
    if (VARIANT !== 'marked' || part === 'body') return true;
    return siteEdit === part;
  }

  // One bit of text: editable in the editor, plain in the preview.
  function text(tag, part, key, cls) {
    const content = esc(value(part, key, view.page));
    if (!editable(part)) return '<' + tag + (cls ? ' class="' + cls + '"' : '') + '>' + content + '</' + tag + '>';
    const label = (part === 'body' ? pageName(view.page) + ' page' : 'Site ' + part) + ': ' + FIELD_NAME[key];
    return '<' + tag + ' class="field' + (cls ? ' ' + cls : '') + '" contenteditable="true" spellcheck="false" role="textbox" aria-label="' + esc(label) + '" data-part="' + part + '" data-key="' + key + '">' + content + '</' + tag + '>';
  }

  function headerInner() {
    const h = (tag, key, cls) => text(tag, 'header', key, cls);
    let menu;
    if (view.preview) {
      // Visitors get working links.
      menu = PAGES.map((p, i) => '<a href="#' + p.id + '" data-go="' + p.id + '"' + (p.id === view.page ? ' aria-current="page"' : '') + '>' + esc(value('header', 'menu' + i, view.page)) + '</a>').join('');
    } else {
      menu = PAGES.map((p, i) => h('span', 'menu' + i, 'menu-item' + (p.id === view.page ? ' is-current' : ''))).join('');
    }
    return '<div class="brand">' + h('p', 'name', 'site-name') + h('p', 'tagline', 'site-tagline') + '</div>' +
      '<nav class="menu" aria-label="Site menu">' + menu + '</nav>';
  }

  function footerInner() {
    const f = (tag, key, cls) => text(tag, 'footer', key, cls);
    return '<div class="footer-cols">' +
      '<div><p class="footer-label">Where we are</p>' + f('p', 'address') + '</div>' +
      '<div><p class="footer-label">Phone</p>' + f('p', 'phone') + '</div>' +
      '<div><p class="footer-label">Opening hours</p>' + f('p', 'hours') + '</div>' +
      '</div>' + f('p', 'copyright', 'copyright');
  }

  function bodyInner() {
    const b = (tag, key, cls) => text(tag, 'body', key, cls);
    const picture = '<figure class="picture">' + PICTURES[view.page] + b('figcaption', 'caption') + '</figure>';
    const top = '<section class="hero">' + b('h1', 'title') + b('p', 'intro', 'lede') + picture + '</section>';
    if (view.page === 'home') {
      const card = (n) => '<div class="card">' + b('h3', 's' + n + 'Title') + b('p', 's' + n + 'Text') + '</div>';
      return top +
        '<section>' + b('h2', 'servicesTitle') + '<div class="cards">' + card(1) + card(2) + card(3) + '</div></section>' +
        '<section>' + b('h2', 'dropTitle') + b('p', 'dropText') + '</section>';
    }
    if (view.page === 'about') {
      return top + '<section>' + b('h2', 'whoTitle') + b('p', 'whoText') + '</section><section>' + b('h2', 'howTitle') + b('p', 'howText') + '</section>';
    }
    return top + '<section>' + b('h2', 'hereTitle') + b('p', 'hereText') + '</section><section>' + b('h2', 'bookTitle') + b('p', 'bookText') + '</section>';
  }

  // The header or footer, with whatever the variant adds around it.
  function sharedPart(part) {
    const tag = part;
    const inner = part === 'header' ? headerInner() : footerInner();
    const name = part;
    if (view.preview) return '<' + tag + ' class="part part-' + part + '">' + inner + '</' + tag + '>';

    if (UNMARKED) {
      return '<' + tag + ' class="part part-' + part + '" data-region="' + part + '">' + inner + '</' + tag + '>';
    }

    if (VARIANT === 'marked') {
      if (siteEdit === part) {
        return '<' + tag + ' class="part part-' + part + ' is-site-editing" tabindex="-1" data-region="' + part + '">' +
          '<div class="site-banner"><p><strong>Editing the ' + name + ' for the whole site.</strong> Changes show on every page.</p><button class="btn btn-primary" data-done>Done</button></div>' +
          '<div class="part-inner">' + inner + '</div></' + tag + '>';
      }
      // Locked. It looks like the rest of the page until the pointer is over
      // it (or it has keyboard focus, or it has been tapped once).
      return '<' + tag + ' class="part part-' + part + ' is-gated" data-region="' + part + '">' +
        '<div class="part-inner" inert>' + inner + '</div>' +
        '<button class="gate' + (gateShown === part ? ' is-shown' : '') + '" data-gate="' + part + '" aria-label="The ' + name + ' is shown on every page. Edit ' + name + '.">' +
        '<span class="gate-label"><strong>Shown on every page</strong><em>Edit ' + name + '</em></span></button>' +
        '</' + tag + '>';
    }

    // site
    return '<' + tag + ' class="part part-' + part + ' has-tab is-site-part" tabindex="-1" data-region="' + part + '">' +
      '<p class="part-tab">Site ' + name + '<span> · the same on every page</span></p>' + inner + '</' + tag + '>';
  }

  function bodyPart() {
    const tab = VARIANT === 'site' && !view.preview
      ? '<p class="part-tab">' + pageName(view.page) + ' page<span> · only on this page</span></p>'
      : '';
    return '<main class="part part-body' + (tab ? ' has-tab' : '') + '" data-region="body">' + tab + bodyInner() + '</main>';
  }

  // ---------- Drawing the editor ----------

  const app = document.getElementById('app');

  function topbar() {
    if (view.preview) {
      return '<header class="topbar"><span class="logo" aria-hidden="true">P</span>' +
        '<p class="topbar-text"><strong>Preview.</strong> This is the site as visitors see it. Use its menu to move between pages.</p>' +
        '<button class="btn btn-primary" data-preview>Back to editing</button></header>';
    }
    const pages = PAGES.map((p) => '<button data-page="' + p.id + '"' + (p.id === view.page ? ' aria-current="page"' : '') + '>' + p.name + '</button>').join('');
    // Only the site variant lists the whole site's parts beside the pages.
    const whole = VARIANT === 'site'
      ? '<div class="tabs tabs-whole" role="group" aria-label="Whole site"><span class="tabs-label">Whole site</span><button data-whole="header">Site header</button><button data-whole="footer">Site footer</button></div>'
      : '';
    return '<header class="topbar"><span class="logo" aria-hidden="true">P</span>' + whole +
      '<div class="tabs" role="group" aria-label="Pages"><span class="tabs-label">Pages</span>' + pages + '</div>' +
      '<span class="spacer"></span><button class="btn" data-preview>Preview site</button><button class="btn btn-primary" data-save>Save</button></header>';
  }

  /*
   * Draw everything again. `focus` is a selector to move focus to afterwards,
   * since the thing that had focus has usually been redrawn.
   */
  function render(focus) {
    commitEditing();
    const scroller = app.querySelector('.canvas-scroll');
    const scrollTop = scroller ? scroller.scrollTop : 0;
    const path = PAGES.find((p) => p.id === view.page).path;
    app.className = 'app variant-' + VARIANT + (NOTES ? ' has-notes' : '') + (view.preview ? ' is-preview' : '');
    app.innerHTML = topbar() +
      '<div class="canvas-scroll"><div class="canvas">' +
      (view.preview ? '<p class="address-bar" aria-label="Web address"><span>pennywheel.example/' + path + '</span></p>' : '') +
      '<div class="sheet">' + sharedPart('header') + bodyPart() + sharedPart('footer') + '</div>' +
      '</div></div>' +
      '<div class="bottombar"><button class="btn btn-primary" data-finish>Finished</button><p>Click Finished when you’ve done everything you were asked to.</p></div>';
    app.querySelector('.canvas-scroll').scrollTop = scrollTop;
    if (focus) { const el = app.querySelector(focus); if (el) el.focus({ preventScroll: true }); }
    renderNotes();
  }

  // ---------- Looking at pages ----------

  /*
   * The key signal: after changing a shared part, did the person look at
   * another page (in the editor or the preview) to see what happened there?
   */
  function looked(page, where) {
    const parts = [];
    sharedEdits.forEach((e) => {
      if (e.checked || e.page === page) return;
      e.checked = true;
      const label = e.part + ' on ' + pageName(e.page);
      if (!parts.includes(label)) parts.push(label);
    });
    if (parts.length) note('check', 'Looked at ' + pageName(page) + ' (' + where + ') after changing the ' + parts.join(' and the '));
  }

  function goPage(page) {
    if (page === view.page) return;
    commitEditing();
    leaveGate('switched page');
    const from = view.page;
    view.page = page;
    note('nav', 'Switched page: ' + pageName(from) + ' → ' + pageName(page));
    looked(page, 'editor');
    render('[data-page="' + page + '"]');
    app.querySelector('.canvas-scroll').scrollTop = 0;
  }

  function togglePreview() {
    commitEditing();
    leaveGate('opened the preview');
    view.preview = !view.preview;
    if (view.preview) {
      stats.previews++;
      stats.previewPages[view.page] = true;
      note('preview', 'Opened the preview on ' + pageName(view.page));
      looked(view.page, 'preview');
    } else {
      note('preview', 'Left the preview on ' + pageName(view.page) + '. Pages seen in previews so far: ' + previewPages().join(', '));
    }
    render('[data-preview]');
    app.querySelector('.canvas-scroll').scrollTop = 0;
    checkTasks();
  }

  const previewPages = () => PAGES.filter((p) => stats.previewPages[p.id]).map((p) => p.name);

  function previewGo(page) {
    if (page === view.page) { note('preview', 'Preview: clicked the menu link for the page already showing (' + pageName(page) + ')'); return; }
    view.page = page;
    stats.previewPages[page] = true;
    note('preview', 'Preview: went to ' + pageName(page));
    looked(page, 'preview');
    render('[data-go="' + page + '"]');
    app.querySelector('.canvas-scroll').scrollTop = 0;
  }

  // site: "Site header" and "Site footer" in the top bar show where that part is.
  function wholeSite(part) {
    commitEditing();
    stats.whole++;
    note('site', 'Used Whole site › Site ' + part + ' (on the ' + pageName(view.page) + ' page)');
    const el = app.querySelector('[data-region="' + part + '"]');
    el.scrollIntoView({ block: 'center' });
    el.focus({ preventScroll: true });
    el.classList.remove('is-flash');
    void el.offsetWidth; // so the highlight plays again on a second click
    el.classList.add('is-flash');
  }

  // ---------- marked: shown on hover, one click to unlock ----------

  // Draw one shared part again without touching the rest of the page, so
  // whatever the person has just clicked into keeps its focus and caret.
  function redrawPart(part) {
    const el = app.querySelector('[data-region="' + part + '"]');
    if (el) el.outerHTML = sharedPart(part);
  }

  function hideGate() {
    if (!gateShown) return;
    gateShown = null;
    app.querySelectorAll('.gate.is-shown').forEach((g) => g.classList.remove('is-shown'));
  }

  // The label counts as seen once the pointer has rested on the part for a moment.
  function gateSeen(part, how) {
    stats.gateShown++;
    note('gate', '“Shown on every page” appeared on the ' + part + ' (' + how + ') on ' + pageName(view.page));
  }

  function gateClick(part) {
    // Touch has no hover: the first tap shows the label, the second unlocks.
    if (lastPointer === 'touch' && gateShown !== part) {
      hideGate();
      gateShown = part;
      const g = app.querySelector('[data-gate="' + part + '"]');
      if (g) g.classList.add('is-shown');
      gateSeen(part, 'tap');
      return;
    }
    unlock(part);
  }

  function unlock(part) {
    clearTimeout(hoverTimer);
    commitEditing();
    gateShown = null;
    if (siteEdit && siteEdit !== part) {
      note('gate', 'The ' + siteEdit + ' locked again (moved to the ' + part + ')');
    }
    siteEdit = part;
    stats.gateThrough++;
    note('gate', 'Unlocked the ' + part + ' with one click, on ' + pageName(view.page));
    render('[data-region="' + part + '"]');
  }

  function doneSiteEdit(how) {
    if (!siteEdit) return;
    commitEditing();
    const part = siteEdit;
    siteEdit = null;
    note('gate', 'The ' + part + ' locked again (' + how + ')');
    return part;
  }

  // Working anywhere else locks the part again. Only that part is redrawn.
  function relock(how) {
    if (!siteEdit) return;
    const part = siteEdit;
    if (editing && editing.el.closest('[data-region="' + part + '"]')) commitEditing();
    siteEdit = null;
    note('gate', 'The ' + part + ' locked again (' + how + ')');
    redrawPart(part);
  }

  // Anything that moves away (another page, the preview) locks it again.
  function leaveGate(how) {
    gateShown = null;
    doneSiteEdit(how);
  }

  app.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse'; }, true);

  app.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const gate = e.target.closest && e.target.closest('[data-gate]');
    if (!gate || (e.relatedTarget && gate.contains(e.relatedTarget))) return;
    const part = gate.dataset.gate;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => gateSeen(part, 'hover'), 400);
  });

  app.addEventListener('pointerout', (e) => {
    const gate = e.target.closest && e.target.closest('[data-gate]');
    if (!gate || (e.relatedTarget && gate.contains(e.relatedTarget))) return;
    clearTimeout(hoverTimer);
  });

  // ---------- Editing text ----------

  const clean = (s) => s.replace(/\s+/g, ' ').trim();

  const fieldName = (key) => FIELD_NAME[key];
  // Where a bit of text is: "header", "footer" or "About page's content".
  const whereName = (part, page) => (part === 'body' ? pageName(page) + ' page’s content' : part);

  // Store what was typed, if it changed. Called when the text loses focus.
  function commitEditing() {
    if (!editing) return;
    const { el, before } = editing;
    editing = null;
    const part = el.dataset.part;
    const key = el.dataset.key;
    const now = clean(el.textContent);
    const page = view.page;
    if (!now) {
      // Emptied: the old text goes back, and the log says so.
      el.textContent = before;
      note('undo', 'Emptied the ' + fieldName(key) + ' in the ' + whereName(part, page) + (part === 'body' ? '' : ' on ' + pageName(page)) + '. The old text was put back: “' + before + '”');
      return;
    }
    if (now === before) { el.textContent = before; return; }
    el.textContent = now;

    if (part === 'body') {
      site.pages[page][key] = now;
      track(part, page, key, before, now);
      stats.edits.body++;
      note('edit', 'Edited the ' + pageName(page) + ' page’s content (' + fieldName(key) + '): “' + before + '” → “' + now + '”');
      checkTasks();
      return;
    }

    site[part][key] = now;
    track(part, page, key, before, now);
    const entry = { part, page, checked: false };
    sharedEdits.push(entry);
    stats.edits[part]++;
    note('edit', 'Edited the ' + part + ' (' + fieldName(key) + ') on ' + pageName(page) + ': “' + before + '” → “' + now + '”. Applies to every page.');
    if (VARIANT === 'told') tell({ part, key, before, now, entry });
    checkTasks();
  }

  // Keep one entry per bit of text changed since the last save: what it said
  // at the last save and what it says now. Changing it back removes the entry.
  function track(part, page, key, before, now) {
    const id = part === 'body' ? 'body:' + page + ':' + key : part + ':' + key;
    const found = unsaved.find((c) => c.id === id);
    if (found) {
      found.now = now;
      if (found.now === found.before) unsaved.splice(unsaved.indexOf(found), 1);
    } else {
      unsaved.push({ id, part, page, key, before, now });
    }
  }

  app.addEventListener('focusin', (e) => {
    const el = e.target.closest('.field');
    if (el && (!editing || editing.el !== el)) editing = { el, before: clean(el.textContent) };
    // marked: moving into text outside the unlocked part locks it again.
    if (el && siteEdit && !el.closest('[data-region="' + siteEdit + '"]')) relock('moved to other text');
  });

  app.addEventListener('focusout', (e) => {
    if (editing && e.target === editing.el) commitEditing();
  });

  app.addEventListener('keydown', (e) => {
    const el = e.target.closest('.field');
    if (el) {
      // Each bit of text is one line: Enter finishes, Escape puts it back.
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') {
        if (editing) {
          const typed = clean(el.textContent);
          const part = el.dataset.part;
          if (typed !== editing.before) {
            note('undo', 'Gave up a change with Escape, in the ' + whereName(part, view.page) + (part === 'body' ? '' : ' on ' + pageName(view.page)) + ' (' + fieldName(el.dataset.key) + '): “' + typed + '” was not kept');
          }
          el.textContent = editing.before;
        }
        el.blur();
      }
      return;
    }
    if (e.key === 'Escape' && siteEdit) {
      const part = doneSiteEdit('Escape');
      render('[data-gate="' + part + '"]');
    }
  });

  // Pasted text goes in as plain text.
  app.addEventListener('paste', (e) => {
    if (!e.target.closest('.field')) return;
    e.preventDefault();
    const pasted = clean((e.clipboardData || window.clipboardData).getData('text'));
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    sel.deleteFromDocument();
    sel.getRangeAt(0).insertNode(document.createTextNode(pasted));
    sel.collapseToEnd();
  });

  app.addEventListener('click', (e) => {
    const on = (attr) => e.target.closest('[' + attr + ']');
    let el;
    if ((el = on('data-go'))) { e.preventDefault(); previewGo(el.dataset.go); return; }
    if ((el = on('data-page'))) { goPage(el.dataset.page); return; }
    if ((el = on('data-whole'))) { wholeSite(el.dataset.whole); return; }
    if (on('data-preview')) { togglePreview(); return; }
    if (on('data-save')) { save(); return; }
    if (on('data-finish')) { finish(); return; }
    if ((el = on('data-gate'))) { gateClick(el.dataset.gate); return; }
    if (on('data-done')) { const part = doneSiteEdit('Done'); render('[data-gate="' + part + '"]'); return; }
    // A click anywhere else hides a tapped label and locks an unlocked part.
    hideGate();
    if (siteEdit && !e.target.closest('[data-region="' + siteEdit + '"]')) relock('clicked elsewhere');
  });

  function save() {
    commitEditing();
    stats.saves++;
    note('save', 'Clicked Save on ' + pageName(view.page) + (siteEdit ? ' (while editing the ' + siteEdit + ' for the whole site)' : ''));
    if (VARIANT === 'summary') {
      if (unsaved.length) openSummary();
      else toast('Nothing new to save.');
      return;
    }
    unsaved = [];
    toast('Saved.');
  }

  // ---------- summary: what changed and where, before saving ----------

  let summaryEl = null;
  let summaryAnswered = false;

  function openSummary() {
    if (!summaryEl) {
      summaryEl = document.createElement('dialog');
      summaryEl.className = 'summary';
      summaryEl.setAttribute('aria-labelledby', 'summary-title');
      document.body.append(summaryEl);
      summaryEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-confirm]')) {
          summaryAnswered = true;
          stats.sumSaved++;
          unsaved = [];
          note('save', 'Saved from the summary');
          summaryEl.close();
          toast('Saved.');
        } else if (e.target.closest('[data-back]')) {
          summaryEl.close();
        }
      });
      // Escape and Keep editing both end here.
      summaryEl.addEventListener('close', () => {
        if (!summaryAnswered) {
          stats.sumBack++;
          note('save', 'Went back to editing from the summary without saving');
        }
        const btn = app.querySelector('[data-save]');
        if (btn) btn.focus();
      });
    }
    summaryAnswered = false;
    const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    const row = (c) => '<li><strong>' + (c.part === 'body' ? cap(fieldName(c.key)) : cap(c.part) + ' · ' + (/^menu/.test(c.key) ? 'menu item' : fieldName(c.key))) + '</strong><span>“' + esc(c.before) + '” → “' + esc(c.now) + '”</span></li>';
    const shared = unsaved.filter((c) => c.part !== 'body');
    let groups = shared.length ? '<h3>On every page</h3><ul>' + shared.map(row).join('') + '</ul>' : '';
    const counts = [];
    if (shared.length) counts.push(shared.length + ' on every page');
    PAGES.forEach((p) => {
      const own = unsaved.filter((c) => c.part === 'body' && c.page === p.id);
      if (!own.length) return;
      groups += '<h3>Only on the ' + p.name + ' page</h3><ul>' + own.map(row).join('') + '</ul>';
      counts.push(own.length + ' on ' + p.name + ' only');
    });
    summaryEl.innerHTML = '<h2 id="summary-title" tabindex="-1">Save ' + unsaved.length + (unsaved.length === 1 ? ' change?' : ' changes?') + '</h2>' + groups +
      '<div class="finish-actions"><button class="btn btn-primary" data-confirm>Save</button><button class="link" data-back>Keep editing</button></div>';
    stats.sumShown++;
    note('save', 'Summary shown: ' + counts.join(', '));
    summaryEl.showModal();
    summaryEl.querySelector('h2').focus();
  }

  // ---------- Tasks, the completion code and the notes panel ----------

  // 0 not changed · 1 changed (it changes on every page; no prototype can change one page's)
  function taglineState() {
    return site.header.tagline === START.header.tagline ? 0 : 1;
  }
  const TAGLINE_STATES = ['not changed', 'changed on every page'];

  const TASKS = [
    { text: 'Update the phone number.', hint: 'Footer, shared. Ticks when every page shows a new number.', done: () => PAGES.every((p) => value('footer', 'phone', p.id) !== START.footer.phone) },
    { text: 'Change the main heading on the About page.', hint: 'This page only.', done: () => site.pages.about.title !== START.pages.about.title },
    { text: 'Rename “Contact” in the menu to “Find us”.', hint: 'Header, shared. Ticks when every page’s menu says Find us.', done: () => PAGES.every((p) => /^find us$/i.test(value('header', 'menu2', p.id))) },
    { text: 'A different line under the site name, on Home only.', hint: 'A probe: it can’t be done, since the line is the same on every page. Ticks if the line is changed at all; tick it yourself if they explain why not.', done: () => taglineState() > 0, state: () => 'Line under the site name: ' + TAGLINE_STATES[taglineState()] },
    { text: 'Check the site as a visitor would.', hint: 'Ticks when the preview is opened.', done: () => stats.previews > 0, state: () => 'Seen in the preview: ' + (previewPages().join(', ') || 'nothing yet') }
  ];

  function checkTasks() {
    TASKS.forEach((t, i) => {
      if (t.done() && !firstDone[i]) {
        firstDone[i] = { at: elapsed() };
        ticked[i] = true;
        note('task', 'Task ' + (i + 1) + ' reached');
      }
    });
    renderNotes();
  }

  const checkedCount = () => sharedEdits.filter((e) => e.checked).length;

  /*
   * The completion code, for pasting into the testing tool. For example:
   *   RM-11101-h2-f1-b1-c2.3-g4.2-p1.3-v1-s245
   *   variant (RP control, RM shown on hover, RS always labelled, RT told
   *   after the change, RU summary at save) ·
   *   the five tasks when Finished was clicked: 1 or 0 for tasks 1, 2, 3 and 5,
   *   and for task 4 the line under the site name: 0 not changed, 1 changed
   *   (which changes it on every page) ·
   *   edits to the header (h), the footer (f) and page content (b) ·
   *   c: changes to a shared part that were followed by a look at another
   *   page, then all changes to a shared part ·
   *   one part that depends on the variant (the control has none):
   *     marked  g: times the label was shown (a hover that rested, or a tap), times unlocked
   *     site    w: uses of Site header and Site footer in the top bar
   *     told    t: messages shown, times Undo was used in one
   *     summary u: summaries shown, saved from one, went back without saving
   *   p: times the preview was opened, then pages seen in it ·
   *   v: clicks on Save · s: seconds until Finished.
   */
  function completionCode() {
    const own = {
      marked: 'g' + [stats.gateShown, stats.gateThrough].join('.'),
      site: 'w' + stats.whole,
      told: 't' + [stats.told, stats.toldUndo].join('.'),
      summary: 'u' + [stats.sumShown, stats.sumSaved, stats.sumBack].join('.')
    }[VARIANT];
    return [
      VARIANTS[VARIANT].code,
      TASKS.map((t, i) => (i === 3 ? taglineState() : (t.done() ? 1 : 0))).join(''),
      'h' + stats.edits.header, 'f' + stats.edits.footer, 'b' + stats.edits.body,
      'c' + checkedCount() + '.' + sharedEdits.length
    ].concat(own ? [own] : [], [
      'p' + stats.previews + '.' + previewPages().length,
      'v' + stats.saves,
      's' + seconds()
    ]).join('-');
  }

  // Finished shows the code in a dialog. Clicking Finished again later gives a new code.
  let finishEl = null;
  function finish() {
    commitEditing();
    if (!finishEl) {
      finishEl = document.createElement('dialog');
      finishEl.className = 'finish';
      finishEl.setAttribute('aria-labelledby', 'finish-title');
      document.body.append(finishEl);
      finishEl.addEventListener('close', () => {
        note('task', 'Went back to editing');
        const btn = app.querySelector('[data-finish]');
        if (btn) btn.focus();
      });
      finishEl.addEventListener('click', (e) => {
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
    const unchecked = sharedEdits.filter((e) => !e.checked).length;
    if (sharedEdits.length) {
      note('check', unchecked
        ? 'Finished without looking at another page after ' + unchecked + ' of ' + sharedEdits.length + ' changes to the header or footer'
        : 'Looked at another page after every change to the header or footer (' + sharedEdits.length + ')');
    }
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

  let notesEl = null;
  function renderNotes() {
    if (!NOTES || !site) return;
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
        if (e.target.closest('[data-reset]')) { reset(); render(); toast('The site is back as it started.'); }
      });
    }
    const suffix = location.hash === '#notes' ? '#notes' : '?notes';
    const links = Object.keys(VARIANTS).map((v) => '<a href="' + v + '.html' + suffix + '"' + (v === VARIANT ? ' aria-current="page"' : '') + '>' + VARIANTS[v].letter + '</a>').join('');
    const tasks = TASKS.map((t, i) =>
      '<li class="' + (ticked[i] ? 'is-done' : '') + '"><label><input type="checkbox" data-task="' + i + '"' + (ticked[i] ? ' checked' : '') + '> ' + t.text + '</label>' +
      (firstDone[i] ? ' <time>' + firstDone[i].at + '</time>' : '') +
      '<small>' + t.hint + (t.state ? ' ' + t.state() + '.' : '') + '</small></li>').join('');
    const own = {
      marked: '<dt>Times “Shown on every page” appeared</dt><dd>' + stats.gateShown + '</dd><dt>Times unlocked</dt><dd>' + stats.gateThrough + '</dd>',
      site: '<dt>Uses of Site header or Site footer in the top bar</dt><dd>' + stats.whole + '</dd>',
      told: '<dt>Times “Updated on all 3 pages” was shown</dt><dd>' + stats.told + '</dd><dt>Times Undo was used in it</dt><dd>' + stats.toldUndo + '</dd>',
      summary: '<dt>Save summaries shown</dt><dd>' + stats.sumShown + '</dd><dt>Saved from the summary</dt><dd>' + stats.sumSaved + '</dd><dt>Went back without saving</dt><dd>' + stats.sumBack + '</dd>'
    }[VARIANT];
    notesEl.innerHTML =
      '<div class="notes-head"><h2>' + VARIANTS[VARIANT].letter + ' · Facilitator notes</h2><nav class="switcher" aria-label="Variant">' + links + '</nav></div>' +
      '<p>' + VARIANTS[VARIANT].name + '. Only you can see this panel; open the page without <code>?notes</code> for participants.</p>' +
      '<h3>Tasks</h3><ol class="tasks">' + tasks + '</ol>' +
      '<h3>Counts</h3><dl>' +
      '<dt>Edits to the header</dt><dd>' + stats.edits.header + '</dd>' +
      '<dt>Edits to the footer</dt><dd>' + stats.edits.footer + '</dd>' +
      '<dt>Edits to page content</dt><dd>' + stats.edits.body + '</dd>' +
      '<dt>Header or footer changes followed by a look at another page</dt><dd>' + checkedCount() + ' of ' + sharedEdits.length + '</dd>' +
      (own || '') +
      '<dt>Preview opened</dt><dd>' + stats.previews + '</dd>' +
      '<dt>Pages seen in the preview</dt><dd>' + (previewPages().join(', ') || 'none') + '</dd>' +
      '<dt>Saves</dt><dd>' + stats.saves + '</dd></dl>' +
      '<h3>Log</h3><ol class="log">' + (log.map((l) => '<li class="is-' + l.kind + '"><time>' + l.at + '</time>' + esc(l.text) + '</li>').join('') || '<li>Nothing yet.</li>') + '</ol>' +
      '<div class="actions"><button class="btn" data-copy>Copy log</button><button class="btn" data-reset>Reset</button></div>';
  }

  // ---------- Start ----------

  reset();
  render();
})();
