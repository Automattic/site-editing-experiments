/*
 * Riley · This page or every page?
 *
 * One simulated site editor, three variants. The site, its pages, the editor
 * around it, the tasks and the log are the same in all three. Only the way the
 * shared header and footer are treated changes:
 *
 *   marked  The header and footer are dimmed and labelled "Shown on every
 *           page". Clicking one offers "Edit header for the whole site"; only
 *           then can it be changed.
 *   ask     The header and footer look like the rest of the page. The first
 *           change to one asks "Every page" or "Just this page".
 *   site    No gate and no question. The header and footer carry "Site header"
 *           and "Site footer" labels, the page's content carries the page's
 *           name, and the top bar lists the whole site's parts beside the
 *           pages.
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
    marked: { code: 'RM', letter: 'A', name: 'Marked before editing: the header and footer are dimmed, labelled, and need a deliberate step to edit' },
    ask: { code: 'RA', letter: 'B', name: 'Ask on the first change: the header and footer look like the page, and the first change asks every page or just this page' },
    site: { code: 'RS', letter: 'C', name: 'Always labelled: Site header, Site footer and the page’s name are always shown, with no gate and no question' }
  };
  const VARIANT = VARIANTS[document.body.dataset.variant] ? document.body.dataset.variant : 'marked';
  const NOTES = new URLSearchParams(location.search).has('notes') || location.hash === '#notes';

  const PAGES = [
    { id: 'home', name: 'Home', path: '' },
    { id: 'about', name: 'About', path: 'about' },
    { id: 'contact', name: 'Contact', path: 'contact' }
  ];
  const PART_NAME = { header: 'header', footer: 'footer' };

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

  // What each editable bit is called in the log.
  const FIELD_NAME = {
    name: 'site name', tagline: 'line under the site name',
    menu0: 'menu item 1', menu1: 'menu item 2', menu2: 'menu item 3',
    address: 'address', phone: 'phone number', hours: 'opening hours', copyright: 'copyright line',
    title: 'main heading', intro: 'first paragraph', caption: 'picture caption'
  };

  // Placeholder pictures, drawn here so the page loads nothing else.
  const PICTURES = {
    home: '<svg viewBox="0 0 640 280" role="img" aria-label="Drawing of a bicycle"><rect width="640" height="280" fill="#dfeae6"/><g fill="none" stroke="#1f5f5b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><circle cx="210" cy="180" r="62"/><circle cx="430" cy="180" r="62"/><path d="M210 180l60-90h110l50 90M270 90l60 90h-120M380 90l-50 90M258 72h34M380 90l-8-26h24"/></g><circle cx="330" cy="180" r="10" fill="#1f5f5b"/></svg>',
    about: '<svg viewBox="0 0 640 280" role="img" aria-label="Drawing of tools hanging above a workbench"><rect width="640" height="280" fill="#efe6d6"/><rect x="60" y="200" width="520" height="22" rx="4" fill="#8a6a45"/><rect x="90" y="222" width="18" height="58" fill="#8a6a45"/><rect x="532" y="222" width="18" height="58" fill="#8a6a45"/><g fill="none" stroke="#5b4a3a" stroke-width="10" stroke-linecap="round"><path d="M150 60v90M210 60v70M270 60v100"/><circle cx="150" cy="52" r="14"/><circle cx="360" cy="96" r="38"/><path d="M450 60v80M430 60h40M520 60v100"/></g><circle cx="360" cy="96" r="8" fill="#5b4a3a"/></svg>',
    contact: '<svg viewBox="0 0 640 280" role="img" aria-label="Drawing of a street map with a pin"><rect width="640" height="280" fill="#e6ece0"/><g stroke="#fff" stroke-width="22" fill="none" stroke-linecap="round"><path d="M-10 90h660M-10 210h420M180 -10v300M470 90v200"/></g><g stroke="#c9d3bf" stroke-width="2" fill="none"><path d="M-10 90h660M-10 210h420M180 -10v300M470 90v200"/></g><rect x="220" y="120" width="210" height="64" rx="6" fill="#d3ddc8"/><path d="M470 150c-26-34-40-52-40-74a40 40 0 0180 0c0 22-14 40-40 74z" fill="#b4532a"/><circle cx="470" cy="78" r="14" fill="#fff"/></svg>'
  };

  // ---------- State ----------

  let site;          // the site as it is now: header, footer, pages, and any per-page copies (own)
  let view;          // { page, preview }
  let gateOpen;      // marked: which part's "edit for the whole site?" offer is open
  let siteEdit;      // marked: which part is being edited for the whole site
  let choice;        // ask: { header: 'all' | 'page', footer: … } once answered
  let lastEdit;      // ask: the last change to each shared part, so its answer can be changed
  let sharedEdits;   // every change to a shared part, and whether another page was looked at since
  let log, stats, startedAt, firstDone, ticked;
  let editing = null; // the text being edited and what it said before
  let asking = null;  // ask: what the open dialog is about
  let cardOpen = false;

  function reset() {
    site = JSON.parse(JSON.stringify(START));
    site.own = { home: {}, about: {}, contact: {} };
    view = { page: 'home', preview: false };
    gateOpen = null;
    siteEdit = null;
    choice = {};
    lastEdit = {};
    sharedEdits = [];
    log = [];
    stats = {
      edits: { header: 0, footer: 0, body: 0 },
      gateClicks: 0, gateThrough: 0, gateBack: 0,
      asked: 0, askAll: 0, askPage: 0, askChanged: 0,
      whole: 0, previews: 0, previewPages: {}, saves: 0
    };
    startedAt = Date.now();
    firstDone = [];
    ticked = [];
    editing = null;
    asking = null;
    cardOpen = false;
  }

  // ---------- Helpers ----------

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pageName = (id) => PAGES.find((p) => p.id === id).name;
  const seconds = () => Math.round((Date.now() - startedAt) / 1000);
  function elapsed() {
    const s = seconds();
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  // What a page shows for a bit of text. A page with its own copy of the
  // header or footer (ask, "Just this page") shows that; otherwise the shared one.
  function value(part, key, page) {
    if (part === 'body') return site.pages[page][key];
    const own = site.own[page][part];
    return own ? own[key] : site[part][key];
  }

  /*
   * Change one bit of the header or footer.
   *   scope 'all'   every page shows the new text, including pages with their own copy.
   *   scope 'page'  the page gets its own copy of the part, and only that changes.
   * Returns what's needed to take the change back (see revertShared).
   */
  function applyShared(part, key, text, page, scope) {
    const before = { key, text, page, scope, shared: site[part][key], own: {}, hadOwn: !!site.own[page][part] };
    PAGES.forEach((p) => { if (site.own[p.id][part]) before.own[p.id] = site.own[p.id][part][key]; });
    if (scope === 'all') {
      site[part][key] = text;
      PAGES.forEach((p) => { if (site.own[p.id][part]) site.own[p.id][part][key] = text; });
    } else {
      if (!site.own[page][part]) site.own[page][part] = Object.assign({}, site[part]);
      site.own[page][part][key] = text;
    }
    return before;
  }

  function revertShared(part, rec) {
    site[part][rec.key] = rec.shared;
    Object.keys(rec.own).forEach((p) => { if (site.own[p][part]) site.own[p][part][rec.key] = rec.own[p]; });
    if (!rec.hadOwn) delete site.own[rec.page][part];
  }

  function note(kind, text) {
    log.push({ at: elapsed(), kind, text });
    renderNotes();
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
    if (VARIANT !== 'marked') return true;
    return part === 'body' ? !siteEdit : siteEdit === part;
  }

  // One bit of text: editable in the editor, plain in the preview.
  function text(tag, part, key, cls) {
    const content = esc(value(part, key, view.page));
    if (!editable(part)) return '<' + tag + (cls ? ' class="' + cls + '"' : '') + '>' + content + '</' + tag + '>';
    return '<' + tag + ' class="field' + (cls ? ' ' + cls : '') + '" contenteditable="true" spellcheck="false" data-part="' + part + '" data-key="' + key + '">' + content + '</' + tag + '>';
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
      '<div><p class="footer-label">Find us</p>' + f('p', 'address') + '</div>' +
      '<div><p class="footer-label">Phone</p>' + f('p', 'phone') + '</div>' +
      '<div><p class="footer-label">Open</p>' + f('p', 'hours') + '</div>' +
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
    const name = PART_NAME[part];
    if (view.preview) return '<' + tag + ' class="part part-' + part + '">' + inner + '</' + tag + '>';

    if (VARIANT === 'marked') {
      if (siteEdit === part) {
        return '<' + tag + ' class="part part-' + part + ' is-site-editing" tabindex="-1" data-region="' + part + '">' +
          '<div class="site-banner"><p><strong>Editing the ' + name + ' for the whole site.</strong> Changes show on every page.</p><button class="btn btn-primary" data-done>Done</button></div>' +
          '<div class="part-inner">' + inner + '</div></' + tag + '>';
      }
      const others = !!siteEdit; // the other shared part is being edited: this one just waits
      return '<' + tag + ' class="part part-' + part + ' is-gated' + (others ? ' is-waiting' : '') + '" data-region="' + part + '">' +
        '<div class="part-inner" inert>' + inner + '</div>' +
        '<button class="gate" data-gate="' + part + '"' + (others ? ' disabled' : '') + ' aria-label="The ' + name + ' is shown on every page. Click to change it."' + (gateOpen === part ? ' aria-expanded="true"' : '') + '>' +
        '<span class="gate-label"><strong>Shown on every page</strong><span>Click to change the ' + name + '</span></span></button>' +
        (gateOpen === part
          ? '<div class="gate-offer" role="group" aria-label="Edit the ' + name + '">' +
            '<p><strong>The ' + name + ' is the same on every page.</strong> A change here shows on Home, About and Contact.</p>' +
            '<div class="gate-actions"><button class="btn btn-primary" data-gate-go="' + part + '">Edit ' + name + ' for the whole site</button><button class="btn" data-gate-back>Leave it</button></div></div>'
          : '') +
        '</' + tag + '>';
    }

    if (VARIANT === 'ask') {
      const chip = choice[part]
        ? '<p class="scope-chip">Changes to the ' + name + ' apply to <strong>' + (choice[part] === 'all' ? 'every page' : 'just this page') + '</strong> <button class="link" data-change="' + part + '">Change</button></p>'
        : '';
      return '<' + tag + ' class="part part-' + part + '" data-region="' + part + '">' + inner + chip + '</' + tag + '>';
    }

    // site
    return '<' + tag + ' class="part part-' + part + ' has-tab is-site-part" tabindex="-1" data-region="' + part + '">' +
      '<p class="part-tab">Site ' + name + '<span> · the same on every page</span></p>' + inner + '</' + tag + '>';
  }

  function bodyPart() {
    const dim = VARIANT === 'marked' && siteEdit && !view.preview;
    const tab = VARIANT === 'site' && !view.preview
      ? '<p class="part-tab">' + pageName(view.page) + ' page<span> · only on this page</span></p>'
      : '';
    return '<main class="part part-body' + (tab ? ' has-tab' : '') + (dim ? ' is-dimmed' : '') + '"' + (dim ? ' inert' : '') + ' data-region="body">' + tab + bodyInner() + '</main>';
  }

  // ---------- Drawing the editor ----------

  const app = document.getElementById('app');

  function topbar() {
    if (view.preview) {
      return '<header class="topbar"><span class="logo" aria-hidden="true">P</span>' +
        '<p class="topbar-text"><strong>Preview.</strong> This is the site as visitors see it. Use its menu to move between pages.</p>' +
        '<span class="spacer"></span><button class="btn btn-primary" data-preview>Back to editing</button></header>';
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
      '</div></div>';
    app.querySelector('.canvas-scroll').scrollTop = scrollTop;
    if (focus) { const el = app.querySelector(focus); if (el) el.focus({ preventScroll: true }); }
    renderCard();
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
      const label = PART_NAME[e.part] + ' on ' + pageName(e.page);
      if (!parts.includes(label)) parts.push(label);
    });
    if (parts.length) note('check', 'Looked at ' + pageName(page) + ' (' + where + ') after changing the ' + parts.join(' and the '));
  }

  function goPage(page) {
    if (page === view.page) return;
    commitEditing();
    if (asking) return; // the change is waiting for an answer first
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
    if (asking) return; // the change is waiting for an answer first
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
    if (asking) return;
    stats.whole++;
    note('site', 'Used Whole site › Site ' + PART_NAME[part] + ' (on the ' + pageName(view.page) + ' page)');
    const el = app.querySelector('[data-region="' + part + '"]');
    el.scrollIntoView({ block: 'center' });
    el.focus({ preventScroll: true });
    el.classList.remove('is-flash');
    void el.offsetWidth; // so the highlight plays again on a second click
    el.classList.add('is-flash');
  }

  // ---------- marked: the gate ----------

  function openGate(part) {
    if (gateOpen === part) return;
    if (gateOpen) backOut('clicked the ' + PART_NAME[part]);
    stats.gateClicks++;
    gateOpen = part;
    note('gate', 'Clicked the ' + PART_NAME[part] + ' (marked “Shown on every page”) on ' + pageName(view.page));
    render('[data-gate-go]');
  }

  function backOut(how) {
    if (!gateOpen) return;
    const part = gateOpen;
    gateOpen = null;
    stats.gateBack++;
    note('gate', 'Backed out of editing the ' + PART_NAME[part] + ' (' + how + ')');
    return part;
  }

  function throughGate(part) {
    gateOpen = null;
    siteEdit = part;
    stats.gateThrough++;
    note('gate', 'Went through: editing the ' + PART_NAME[part] + ' for the whole site, from ' + pageName(view.page));
    render('[data-region="' + part + '"]');
  }

  function doneSiteEdit(how) {
    if (!siteEdit) return;
    commitEditing();
    const part = siteEdit;
    siteEdit = null;
    note('gate', 'Finished editing the ' + PART_NAME[part] + ' for the whole site (' + how + ')');
    return part;
  }

  // Anything that moves away (another page, the preview) closes the offer or the editing state.
  function leaveGate(how) {
    backOut(how);
    doneSiteEdit(how);
  }

  // ---------- Editing text ----------

  const clean = (s) => s.replace(/\s+/g, ' ').trim();

  function fieldName(part, key) {
    return FIELD_NAME[key] || ('“' + (part === 'body' ? START.pages[view.page][key] : START[part][key]) + '”').replace(/^“(.{28}).+”$/, '“$1…”');
  }

  // Store what was typed, if it changed. Called when the text loses focus.
  function commitEditing() {
    if (!editing) return;
    const { el, before } = editing;
    editing = null;
    const part = el.dataset.part;
    const key = el.dataset.key;
    const now = clean(el.textContent);
    if (!now || now === before) { el.textContent = before; return; }
    el.textContent = now;
    const page = view.page;

    if (part === 'body') {
      site.pages[page][key] = now;
      stats.edits.body++;
      note('edit', 'Edited the ' + pageName(page) + ' page’s content (' + fieldName(part, key) + '): “' + before + '” → “' + now + '”');
      checkTasks();
      return;
    }

    // ask: the first change to this part asks where it should apply.
    if (VARIANT === 'ask' && !choice[part]) {
      openAsk({ part, key, page, before, text: now });
      return;
    }
    saveShared(part, key, page, before, now, VARIANT === 'ask' ? choice[part] : 'all');
  }

  function saveShared(part, key, page, before, now, scope) {
    const rec = applyShared(part, key, now, page, scope);
    rec.before = before;
    lastEdit[part] = rec;
    sharedEdits.push({ part, page, checked: false });
    stats.edits[part]++;
    note('edit', 'Edited the ' + PART_NAME[part] + ' (' + fieldName(part, key) + ') on ' + pageName(page) + ': “' + before + '” → “' + now + '”. ' +
      (scope === 'all' ? 'Applies to every page.' : 'Applies to ' + pageName(page) + ' only; it now has its own ' + PART_NAME[part] + '.'));
    checkTasks();
  }

  app.addEventListener('focusin', (e) => {
    const el = e.target.closest('.field');
    if (el && (!editing || editing.el !== el)) editing = { el, before: clean(el.textContent) };
  });

  app.addEventListener('focusout', (e) => {
    if (editing && e.target === editing.el) commitEditing();
  });

  app.addEventListener('keydown', (e) => {
    const el = e.target.closest('.field');
    if (el) {
      // Each bit of text is one line: Enter finishes, Escape puts it back.
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { if (editing) el.textContent = editing.before; el.blur(); }
      return;
    }
    if (e.key === 'Escape' && gateOpen) {
      const part = backOut('Escape');
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
    if ((el = on('data-gate-go'))) { throughGate(el.dataset.gateGo); return; }
    if (on('data-gate-back')) { const part = backOut('Leave it'); render('[data-gate="' + part + '"]'); return; }
    if ((el = on('data-gate'))) { openGate(el.dataset.gate); return; }
    if (on('data-done')) { const part = doneSiteEdit('Done'); render('[data-gate="' + part + '"]'); return; }
    if ((el = on('data-change'))) { openAsk({ part: el.dataset.change, change: true }); return; }
    // A click anywhere else closes the offer.
    if (gateOpen && !e.target.closest('.gate-offer')) { backOut('clicked elsewhere'); render(); }
  });

  function save() {
    commitEditing();
    if (asking) return;
    stats.saves++;
    note('save', 'Clicked Save on ' + pageName(view.page) + (siteEdit ? ' (while editing the ' + PART_NAME[siteEdit] + ' for the whole site)' : ''));
    toast('Saved.');
  }

  // ---------- ask: every page or just this page? ----------

  let dialog = null;

  /*
   * Two uses. With a waiting change ({ part, key, page, before, text }), it
   * asks where that change should apply. With { part, change: true } it's the
   * "Change" link: the last change to that part moves to the new answer.
   */
  function openAsk(about) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'ask';
      dialog.setAttribute('aria-labelledby', 'ask-title');
      document.body.append(dialog);
      dialog.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.scope) answerAsk(btn.dataset.scope);
        else closeAsk('Cancel');
      });
      // Escape closes it without an answer.
      dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeAsk('Escape'); });
      // Keep Tab inside the dialog.
      dialog.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const stops = Array.from(dialog.querySelectorAll('button'));
        const first = stops[0];
        const last = stops[stops.length - 1];
        if (e.shiftKey && (document.activeElement === first || !stops.includes(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    }
    asking = about;
    const part = about.part;
    const name = PART_NAME[part];
    const page = about.change ? lastEdit[part].page : about.page;
    const current = about.change ? choice[part] : null;
    const pageLabel = page === view.page ? 'Just this page' : 'Just the ' + pageName(page) + ' page';
    const option = (scope, title, line) => '<button class="ask-option" data-scope="' + scope + '"' + (current === scope ? ' aria-pressed="true"' : '') + '><strong>' + title + '</strong><span>' + line + '</span>' + (current === scope ? '<em>Chosen now</em>' : '') + '</button>';
    dialog.innerHTML =
      '<h2 id="ask-title" tabindex="-1">' + (about.change ? 'Where should changes to the ' + name + ' apply?' : 'Where should this change apply?') + '</h2>' +
      '<p>' + (about.change
        ? 'Your last change to the ' + name + ' was “' + esc(lastEdit[part].text) + '”, made on the ' + pageName(page) + ' page. It will move to match your answer.'
        : 'You changed the ' + name + ' on the ' + pageName(page) + ' page.') + '</p>' +
      option('all', 'Every page', 'The ' + name + ' changes on every page of the site.') +
      option('page', pageLabel, 'Only the ' + pageName(page) + ' page changes. Other pages keep the ' + name + ' as it was.') +
      '<p class="ask-foot">' + (about.change ? '' : 'Your answer will be used for other changes to the ' + name + '. You can change it later. ') + '<button class="link">' + (about.change ? 'Close' : 'Cancel this change') + '</button></p>';
    dialog.showModal();
    dialog.querySelector('h2').focus();
    if (about.change) {
      note('ask', 'Opened “Change” for the ' + name + ' (now: ' + scopeName(choice[part]) + ')');
    } else {
      stats.asked++;
      note('ask', 'Dialog appeared: first change to the ' + name + ', on ' + pageName(page));
    }
  }

  const scopeName = (scope) => (scope === 'all' ? 'Every page' : 'Just this page');

  function answerAsk(scope) {
    const about = asking;
    const part = about.part;
    asking = null;
    dialog.close();
    if (about.change) {
      const was = choice[part];
      if (was === scope) {
        note('ask', 'Kept the choice for the ' + PART_NAME[part] + ': ' + scopeName(scope));
      } else {
        // Take the last change back and make it again with the new answer.
        const rec = lastEdit[part];
        revertShared(part, rec);
        const again = applyShared(part, rec.key, rec.text, rec.page, scope);
        again.before = rec.before;
        lastEdit[part] = again;
        choice[part] = scope;
        stats.askChanged++;
        note('ask', 'Changed the choice for the ' + PART_NAME[part] + ': ' + scopeName(was) + ' → ' + scopeName(scope) + '. The last change (“' + rec.text + '”, on ' + pageName(rec.page) + ') now applies to ' + (scope === 'all' ? 'every page' : pageName(rec.page) + ' only'));
        checkTasks();
      }
      render('[data-change="' + part + '"]');
      return;
    }
    choice[part] = scope;
    stats[scope === 'all' ? 'askAll' : 'askPage']++;
    note('ask', 'Answered: ' + scopeName(scope) + ' (' + PART_NAME[part] + ')');
    saveShared(part, about.key, about.page, about.before, about.text, scope);
    render('[data-part="' + part + '"][data-key="' + about.key + '"]');
  }

  function closeAsk(how) {
    const about = asking;
    asking = null;
    dialog.close();
    if (about.change) {
      note('ask', 'Closed “Change” for the ' + PART_NAME[about.part] + ' without changing it (' + how + ')');
      render('[data-change="' + about.part + '"]');
      return;
    }
    note('ask', 'Dialog closed without an answer (' + how + '). The change to the ' + PART_NAME[about.part] + ' was undone');
    render('[data-part="' + about.part + '"][data-key="' + about.key + '"]'); // puts the old text back
  }

  // ---------- Tasks, the completion code and the notes panel ----------

  // 0 not changed · 1 changed, the same on every page · 2 changed on Home only · 3 something else
  function taglineState() {
    const now = PAGES.map((p) => value('header', 'tagline', p.id));
    const start = START.header.tagline;
    if (now.every((t) => t === start)) return 0;
    if (now.every((t) => t === now[0])) return 1;
    if (now[0] !== start && now[1] === start && now[2] === start) return 2;
    return 3;
  }
  const TAGLINE_STATES = ['not changed', 'changed on every page', 'changed on Home only', 'different on some pages'];

  const TASKS = [
    { text: 'Update the phone number.', hint: 'Footer, shared. Ticks when every page shows a new number.', done: () => PAGES.every((p) => value('footer', 'phone', p.id) !== START.footer.phone) },
    { text: 'Change the main heading on the About page.', hint: 'This page only.', done: () => site.pages.about.title !== START.pages.about.title },
    { text: 'Rename “Contact” in the menu to “Find us”.', hint: 'Header, shared. Ticks when every page’s menu says Find us.', done: () => PAGES.every((p) => /^find us$/i.test(value('header', 'menu2', p.id))) },
    { text: 'A different line under the site name, on Home only.', hint: 'A probe. Ticks if the line is changed at all; tick it yourself if they explain why not.', done: () => taglineState() > 0, state: () => 'Line under the site name: ' + TAGLINE_STATES[taglineState()] },
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
   *   RM-11101-h2-f1-b1-c2.3-g3.2.1-p1.3-v1-s245
   *   variant (RM marked, RA ask, RS site) ·
   *   the five tasks when Finished was clicked: 1 or 0 for tasks 1, 2, 3 and 5,
   *   and for task 4 the line under the site name: 0 not changed, 1 changed on
   *   every page, 2 changed on Home only, 3 something else ·
   *   edits to the header (h), the footer (f) and page content (b) ·
   *   c: changes to a shared part that were followed by a look at another
   *   page, then all changes to a shared part ·
   *   one part that depends on the variant:
   *     marked  g: clicks on the gated header or footer, went through, backed out
   *     ask     q: dialogs shown, Every page, Just this page, later changes of answer
   *     site    w: uses of Site header and Site footer in the top bar
   *   p: times the preview was opened, then pages seen in it ·
   *   v: clicks on Save · s: seconds until Finished.
   */
  function completionCode() {
    const own = {
      marked: 'g' + [stats.gateClicks, stats.gateThrough, stats.gateBack].join('.'),
      ask: 'q' + [stats.asked, stats.askAll, stats.askPage, stats.askChanged].join('.'),
      site: 'w' + stats.whole
    }[VARIANT];
    return [
      VARIANTS[VARIANT].code,
      TASKS.map((t, i) => (i === 3 ? taglineState() : (t.done() ? 1 : 0))).join(''),
      'h' + stats.edits.header, 'f' + stats.edits.footer, 'b' + stats.edits.body,
      'c' + checkedCount() + '.' + sharedEdits.length,
      own,
      'p' + stats.previews + '.' + previewPages().length,
      'v' + stats.saves,
      's' + seconds()
    ].join('-');
  }

  // The Finished button, and the code it shows. Clicking it again later gives a new code.
  let cardEl = null;
  function renderCard() {
    if (!cardEl) { cardEl = document.createElement('section'); cardEl.className = 'task-card'; cardEl.setAttribute('aria-label', 'Finish'); document.body.append(cardEl); }
    cardEl.classList.toggle('is-open', cardOpen);
    if (!cardOpen) {
      cardEl.innerHTML = '<button class="btn btn-primary">Finished</button>';
      cardEl.querySelector('button').addEventListener('click', () => {
        commitEditing();
        if (asking) return;
        cardOpen = true;
        const unchecked = sharedEdits.filter((e) => !e.checked).length;
        if (sharedEdits.length) {
          note('check', unchecked
            ? 'Finished without looking at another page after ' + unchecked + ' of ' + sharedEdits.length + ' changes to the header or footer'
            : 'Looked at another page after every change to the header or footer (' + sharedEdits.length + ')');
        }
        note('task', 'Clicked Finished. Code ' + completionCode());
        renderCard();
        cardEl.querySelector('textarea').focus();
      });
      return;
    }
    const code = completionCode();
    cardEl.innerHTML = '<p class="task-count">Thank you</p><p class="task-text">Please copy this code into the next question:</p>' +
      '<textarea class="task-code" readonly rows="2" aria-label="Your code">' + code + '</textarea>' +
      '<button class="btn btn-primary">Copy code</button><button class="link task-back">Keep editing</button>';
    const input = cardEl.querySelector('textarea');
    input.addEventListener('focus', () => input.select());
    cardEl.querySelector('.btn-primary').addEventListener('click', () => {
      input.select();
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(
        () => toast('Code copied.'),
        () => { try { document.execCommand('copy'); toast('Code copied.'); } catch (err) { toast('Select the code and copy it.'); } }
      );
    });
    cardEl.querySelector('.task-back').addEventListener('click', () => {
      cardOpen = false;
      note('task', 'Went back to editing');
      renderCard();
      cardEl.querySelector('button').focus();
    });
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
      marked: '<dt>Clicks on the marked header or footer</dt><dd>' + stats.gateClicks + '</dd><dt>Went through to edit</dt><dd>' + stats.gateThrough + '</dd><dt>Backed out</dt><dd>' + stats.gateBack + '</dd>',
      ask: '<dt>Dialogs shown</dt><dd>' + stats.asked + '</dd><dt>Answered Every page</dt><dd>' + stats.askAll + '</dd><dt>Answered Just this page</dt><dd>' + stats.askPage + '</dd><dt>Changed the answer later</dt><dd>' + stats.askChanged + '</dd>',
      site: '<dt>Uses of Site header or Site footer in the top bar</dt><dd>' + stats.whole + '</dd>'
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
      own +
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
