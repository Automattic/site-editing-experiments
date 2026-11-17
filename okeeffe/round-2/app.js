/*
 * O'Keeffe round 2 · Pages and the site's menu.
 *
 * One engine for four prototypes. Each HTML page sets window.PROTOTYPE = { arm }:
 *   control        OC  the menu converts to links; changed in the menu's own sidebar
 *   explained      OB  the menu converts to links, explained; changed on the Pages screen
 *   switches       OF  the menu stays connected; changed on the Pages screen
 *   menu-switches  OQ  the menu stays connected; changed in the menu's own sidebar
 *
 * Everything else is the same in all four: the site, the shell, the preview, the Pages
 * panel's basics, the tasks, the log and the completion code.
 *
 * ---------------------------------------------------------------------------------------
 * THE MODEL, AND HOW THE NAVIGATION SIDEBAR (control, menu-switches) SHOULD USE IT
 * ---------------------------------------------------------------------------------------
 *
 * state.pages   [{ id, title, status: 'publish' | 'draft', parent }]. Array order is page
 *               order. Ids never change (renaming a page keeps its id and address).
 *               pageTreeRows() gives them as a tree: [{ p, depth }].
 * state.menu    {
 *                 mode: 'automatic' | 'links' | 'advanced',
 *                 excluded: [pageId],   automatic only: pages switched off (F, Q)
 *                 items: [{ id, pageId, label, depth: 0 | 1, hidden }],   links / advanced
 *                 autoAdd: bool,        advanced only: "Add new pages automatically"
 *                 convertedAt, autoAddOffAt   seconds, for the completion code
 *               }
 *
 * Reading the menu:
 *   menuEntries()   what the menu holds: automatic -> every published page that isn't
 *                   excluded, [{ pageId, depth }]; links / advanced -> state.menu.items.
 *   shownMenu()     what visitors see, as a tree [{ pageId, itemId, label, sub: [] }]:
 *                   no drafts, no hidden links. The preview and the tasks read this.
 *   entryLabel(e)   a link's own label, or the page's title while the menu is automatic.
 *   isExcluded(id), inMenu(pageId), linkFor(pageId), itemById(id).
 *
 * Changing it. Wrap every change the person makes in commit(fn, message): it keeps the
 * Undo snapshot, notes the first change to what the menu shows (the code's f part),
 * re-checks the tasks, saves to sessionStorage, renders and shows the message with Undo.
 * Inside fn, call the model functions:
 *   setExcluded(pageId, off)            automatic menu: switch a page off / on
 *   convertToLinks('links'|'advanced')  today's published pages become links, same order
 *                                       and levels, labels copied from titles; pages that
 *                                       were excluded become hidden links. 'advanced'
 *                                       also sets autoAdd. Stamps convertedAt.
 *   addLink(pageId, parentItemId?)      label copied from the title; returns the item
 *   removeLink(itemId)                  child links move up a level
 *   setLinkHidden(itemId, hidden)       a hidden parent hides its submenu too
 *   setLinkLabel(itemId, text)          the label only; the page keeps its title
 *   setAutoAdd(on)                      stamps autoAddOffAt when turned off
 *   moveEntry(kind, id, targetId, after), stepEntry(kind, id, dir)
 *                                       kind 'page' reorders page order among siblings
 *                                       (and so an automatic menu); kind 'item' reorders
 *                                       links within their level. siblingIds(kind, id).
 *   indentItem(itemId), outdentItem(itemId)   a link into / out of the submenu above
 *   nestPage(pageId, parentId), unnestPage(pageId)   changes the page's parent (address)
 *   createPage(title, status), publishPage(id), renamePage(id, title), trashPage(id)
 * createPage and publishPage already do the right thing for every mode: an automatic menu
 * shows the page; a links menu doesn't; an advanced menu with autoAdd adds a link at the
 * end (or at the end of its parent's submenu when the parent is in the menu).
 *
 * The convert / switch-to-advanced confirm: askConvert({ trigger, pageId?, then? }) shows
 * the dialog and counts it; the dialog's confirm button runs actions.convert, which counts
 * the confirm, converts (advanced in menu-switches, links elsewhere) and then runs the
 * `then` step. Cancelling is logged by closeDialog(). The words are in convertCopy().
 *
 * Logging and counting (none of this is undone by Undo):
 *   log(kind, text)            kinds: visit, page, menu, order, dialog, sidebar, tried,
 *                              undo, task. Use 'tried' for clicks that do nothing.
 *   countReorder(how)          how: 'drag' | 'move' (the code's r part)
 *   stats.own                  the arm's own count (k): sidebar opens are counted by
 *                              openSidebar(); B counts popovers; F counts switches.
 *   stats.dialogsShown / dialogsConfirmed   counted by askConvert / actions.convert.
 * The completion code (completionCode()) and the tasks (taskValues()) read only the model
 * above, so nothing in them is specific to an arm.
 *
 * The seam: search for "SEAM: NAVIGATION SIDEBAR". openSidebar() / closeSidebar() already
 * select the menu, count, log and render a third column; sidebarBodyHtml() is where the
 * list goes. Add its actions to the `actions` object (every element with data-action is
 * dispatched there with its data- attributes) and any dialogs to dialogHtml().
 */
(function () {
  'use strict';

  const ARMS = {
    control: { code: 'OC', letter: 'Control', file: 'control.html', where: 'sidebar', name: 'WordPress today: the menu is changed in its own sidebar, opened by clicking the menu on the site, and changing it converts it to links' },
    explained: { code: 'OB', letter: 'B', file: 'explained.html', where: 'pages', name: 'Explained: the menu is changed on the Pages screen, and taking a page out or renaming it in the menu converts the menu to links, after one confirm that says so' },
    switches: { code: 'OF', letter: 'F', file: 'switches.html', where: 'pages', name: 'Connected switches: every page has an “In menu” switch on the Pages screen, the list is the menu’s order, and the menu never converts' },
    'menu-switches': { code: 'OQ', letter: 'Q', file: 'menu-switches.html', where: 'sidebar', name: 'Menu switches: the menu’s own sidebar lists the pages with a show/hide toggle each, and the menu stays connected' }
  };
  const ARM = ARMS[(window.PROTOTYPE || {}).arm] ? window.PROTOTYPE.arm : 'control';
  const IN_SIDEBAR = ARMS[ARM].where === 'sidebar';
  // Q follows Quinn: switching a parent off hides its child pages too. F keeps O'Keeffe's
  // behaviour: child pages that are on move up to the top level.
  const PARENT_OFF_HIDES_CHILDREN = ARM === 'menu-switches';
  const SITE = 'rosasbakery.example';
  const NOTES = new URLSearchParams(location.search).has('notes') || location.hash === '#notes';
  const STORE_KEY = 'okeeffe-round-2:' + ARM;

  // ---------- Starting state ----------

  function startingState() {
    return {
      pages: [
        { id: 'home', title: 'Home', status: 'publish', parent: null },
        { id: 'about', title: 'About', status: 'publish', parent: null },
        { id: 'our-story', title: 'Our story', status: 'publish', parent: 'about' },
        { id: 'team', title: 'Team', status: 'publish', parent: 'about' },
        { id: 'bread-and-cakes', title: 'Bread and cakes', status: 'publish', parent: null },
        { id: 'catering', title: 'Catering', status: 'publish', parent: null },
        { id: 'visit-us', title: 'Visit us', status: 'publish', parent: null },
        { id: 'thank-you', title: 'Thank you for your order', status: 'publish', parent: null },
        { id: 'holiday-orders', title: 'Holiday orders', status: 'draft', parent: null }
      ],
      menu: { mode: 'automatic', excluded: [], items: [], autoAdd: false, convertedAt: null, autoAddOffAt: null },
      fresh: [],
      trashed: [],
      seq: 1
    };
  }

  function startingUi() {
    return { pop: null, more: null, dialog: null, current: 'home', flash: null, focus: null, sidebar: false };
  }

  function startingStats() {
    return { dialogsShown: 0, dialogsConfirmed: 0, firstMenuChange: 0, dragReorders: 0, moveReorders: 0, undos: 0, own: 0, finishBack: 0 };
  }

  let state = startingState();
  let ui = startingUi();
  let stats = startingStats();
  let events = [];
  let startedAt = Date.now();
  let firstDone = [];
  let ticked = [];
  let undo = null;
  let toastTimer = null;

  // ---------- Keeping it across a reload ----------

  // sessionStorage, so an accidental reload keeps the participant's work and a new tab starts
  // fresh. If it isn't available, everything simply lives in memory.
  function save() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ state, stats, events, startedAt, firstDone, ticked, current: ui.current }));
    } catch (e) { /* in memory only */ }
  }

  function restore() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
      if (!saved || !saved.state || !saved.state.menu) return false;
      state = saved.state;
      stats = Object.assign(startingStats(), saved.stats);
      events = saved.events || [];
      startedAt = saved.startedAt || Date.now();
      firstDone = saved.firstDone || [];
      ticked = saved.ticked || [];
      ui.current = saved.current && page(saved.current) ? saved.current : 'home';
      return true;
    } catch (e) { return false; }
  }

  function forget() {
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* nothing to clear */ }
  }

  // ---------- Time and the log ----------

  const seconds = () => Math.round((Date.now() - startedAt) / 1000);
  function elapsed() {
    const s = seconds();
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function log(kind, text) {
    events.push({ at: elapsed(), kind, text });
    save();
    renderNotes();
  }

  function countReorder(how) {
    if (how === 'drag') stats.dragReorders++; else stats.moveReorders++;
  }

  // ---------- Model: reading ----------

  const page = (id) => state.pages.find((p) => p.id === id);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const hasParent = (p) => !!(p.parent && page(p.parent));
  const slug = (p) => (p.id === 'home' ? '' : (hasParent(p) ? p.parent + '/' : '') + p.id);
  const pageUrl = (p) => SITE + '/' + slug(p);
  const isFresh = (id) => state.fresh.includes(id);
  const isExcluded = (id) => state.menu.excluded.includes(id);
  const isAutomatic = () => state.menu.mode === 'automatic';
  const itemById = (id) => state.menu.items.find((i) => i.id === id);
  const linkFor = (pageId) => state.menu.items.find((i) => i.pageId === pageId);
  const q = (s) => '“' + s + '”';

  // Every page as a tree, in page order: top-level pages, each followed by its child pages.
  function pageTreeRows() {
    const rows = [];
    state.pages.filter((p) => !hasParent(p)).forEach((t) => {
      rows.push({ p: t, depth: 0 });
      state.pages.filter((c) => c.parent === t.id).forEach((c) => rows.push({ p: c, depth: 1 }));
    });
    return rows;
  }

  // What an automatic menu holds: published pages in page order, child pages under their
  // parent, leaving out the pages that are switched off.
  function automaticItems() {
    const live = (p) => p.status === 'publish' && !isExcluded(p.id);
    const out = [];
    pageTreeRows().forEach(({ p, depth }) => {
      if (!live(p)) return;
      const parent = depth ? page(p.parent) : null;
      if (parent && isExcluded(parent.id) && PARENT_OFF_HIDES_CHILDREN) return;
      out.push({ pageId: p.id, depth: parent && live(parent) ? 1 : 0 });
    });
    return out;
  }

  const menuEntries = () => (isAutomatic() ? automaticItems() : state.menu.items);
  const inMenu = (pageId) => menuEntries().some((e) => e.pageId === pageId);
  const entryLabel = (e) => (e.label != null ? e.label : (page(e.pageId) || {}).title);

  // What visitors see: no drafts and no hidden links. A hidden link hides its submenu; the
  // links under a draft move up a level, so they stay reachable.
  function shownMenu() {
    const tree = [];
    let parentShown = false;
    let parentHidden = false;
    menuEntries().forEach((e) => {
      const p = page(e.pageId);
      const visible = !!p && p.status === 'publish' && !e.hidden;
      if (e.depth === 0) {
        parentShown = visible;
        parentHidden = !!e.hidden;
        if (visible) tree.push({ pageId: e.pageId, itemId: e.id || null, label: entryLabel(e), sub: [] });
        return;
      }
      if (!visible || parentHidden) return;
      const node = { pageId: e.pageId, itemId: e.id || null, label: entryLabel(e), sub: [] };
      if (parentShown) tree[tree.length - 1].sub.push(node); else tree.push(node);
    });
    return tree;
  }
  const shownFlat = () => shownMenu().reduce((all, n) => all.concat(n, n.sub), []);
  const isShown = (pageId) => shownFlat().some((n) => n.pageId === pageId);
  const menuSignature = () => JSON.stringify(shownMenu().map((n) => [n.pageId, n.label, n.sub.map((s) => [s.pageId, s.label])]));

  function makeId(title) {
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
    let id = base;
    while (page(id) || state.trashed.includes(id)) id = base + '-' + state.seq++;
    return id;
  }

  // ---------- Model: changing ----------

  function setExcluded(pageId, off) {
    const m = state.menu;
    m.excluded = m.excluded.filter((x) => x !== pageId);
    if (off) m.excluded.push(pageId);
  }

  // The switch out of automatic: the menu becomes today's published pages as links, in the
  // same order and at the same levels, each with its own label copied from the page's title.
  function convertToLinks(mode) {
    const m = state.menu;
    if (!isAutomatic()) return;
    const published = (p) => p && p.status === 'publish';
    m.items = pageTreeRows().filter((r) => published(r.p)).map((r) => ({
      id: 'link-' + state.seq++,
      pageId: r.p.id,
      label: r.p.title,
      depth: r.depth && published(page(r.p.parent)) ? 1 : 0,
      hidden: isExcluded(r.p.id)
    }));
    m.mode = mode === 'advanced' ? 'advanced' : 'links';
    m.autoAdd = m.mode === 'advanced';
    m.excluded = [];
    m.convertedAt = Math.max(1, seconds());
    m.autoAddOffAt = null;
  }

  function addLink(pageId, parentItemId) {
    const m = state.menu;
    const p = page(pageId);
    if (isAutomatic() || !p) return null;
    const item = { id: 'link-' + state.seq++, pageId, label: p.title, depth: 0, hidden: false };
    let i = parentItemId ? m.items.findIndex((it) => it.id === parentItemId && it.depth === 0) : -1;
    if (i >= 0) {
      i += 1;
      while (i < m.items.length && m.items[i].depth > 0) i += 1;
      item.depth = 1;
      m.items.splice(i, 0, item);
    } else {
      m.items.push(item);
    }
    state.fresh = state.fresh.filter((x) => x !== pageId);
    return item;
  }

  function removeLink(itemId) {
    const items = state.menu.items;
    const index = items.findIndex((it) => it.id === itemId);
    if (index < 0) return;
    const removed = items[index];
    items.splice(index, 1);
    // Its submenu's links move up a level rather than vanishing.
    if (removed.depth === 0) {
      for (let i = index; i < items.length && items[i].depth > 0; i++) items[i].depth = 0;
    }
  }

  function setLinkHidden(itemId, hidden) {
    const it = itemById(itemId);
    if (it) it.hidden = !!hidden;
  }

  function setLinkLabel(itemId, text) {
    const it = itemById(itemId);
    if (it) it.label = text;
  }

  function setAutoAdd(on) {
    const m = state.menu;
    m.autoAdd = !!on;
    m.autoAddOffAt = on ? null : Math.max(1, seconds());
  }

  // Ordering. kind 'page': page order among sibling pages (an automatic menu follows it).
  // kind 'item': the links of a converted menu, within their level.
  function itemBlockEnd(index) {
    const items = state.menu.items;
    let e = index + 1;
    if (items[index].depth === 0) while (e < items.length && items[e].depth > 0) e++;
    return e;
  }

  function siblingIds(kind, id) {
    if (kind === 'item') {
      const items = state.menu.items;
      const index = items.findIndex((it) => it.id === id);
      if (index < 0) return [];
      if (items[index].depth === 0) return items.filter((it) => it.depth === 0).map((it) => it.id);
      let parent = index;
      while (parent > 0 && items[parent].depth > 0) parent--;
      return items.slice(parent + 1, itemBlockEnd(parent)).map((it) => it.id);
    }
    const p = page(id);
    if (!p) return [];
    const parentOf = (x) => (hasParent(x) ? x.parent : null);
    // In B the list only orders the pages that are in the menu, so drafts aren't stepped over.
    const counts = (x) => ARM !== 'explained' || x.status === 'publish';
    return state.pages.filter((x) => parentOf(x) === parentOf(p) && counts(x)).map((x) => x.id);
  }

  function moveEntry(kind, id, targetId, after) {
    if (id === targetId) return;
    if (kind === 'item') {
      const items = state.menu.items;
      const from = items.findIndex((it) => it.id === id);
      if (from < 0) return;
      const block = items.splice(from, itemBlockEnd(from) - from);
      const t = items.findIndex((it) => it.id === targetId);
      items.splice(after ? itemBlockEnd(t) : t, 0, ...block);
      return;
    }
    const p = page(id);
    state.pages.splice(state.pages.indexOf(p), 1);
    const i = state.pages.indexOf(page(targetId));
    state.pages.splice(after ? i + 1 : i, 0, p);
  }

  function stepEntry(kind, id, dir) {
    const sibs = siblingIds(kind, id);
    const k = sibs.indexOf(id) + dir;
    if (k < 0 || k >= sibs.length) return false;
    moveEntry(kind, id, sibs[k], dir > 0);
    return true;
  }

  function indentItem(itemId) {
    const items = state.menu.items;
    const index = items.findIndex((it) => it.id === itemId);
    const it = items[index];
    const hasChildren = items[index + 1] && items[index + 1].depth > 0;
    if (it && it.depth === 0 && index > 0 && !hasChildren) it.depth = 1;
  }

  function outdentItem(itemId) {
    const items = state.menu.items;
    const index = items.findIndex((it) => it.id === itemId);
    const it = items[index];
    if (!it || it.depth === 0) return;
    items.splice(index, 1);
    let e = index;
    while (e < items.length && items[e].depth > 0) e++;
    it.depth = 0;
    items.splice(e, 0, it);
  }

  function nestPage(pageId, parentId) {
    const p = page(pageId);
    p.parent = parentId;
    // It goes last under its new parent.
    state.pages.splice(state.pages.indexOf(p), 1);
    state.pages.push(p);
  }

  function unnestPage(pageId) {
    const p = page(pageId);
    const parentId = p.parent;
    p.parent = null;
    moveEntry('page', pageId, parentId, true);
  }

  // A page has just become public. An automatic menu shows it without being told. A menu of
  // links doesn't, unless it's an advanced menu that still adds new pages.
  function pageWentLive(pageId) {
    const m = state.menu;
    if (isAutomatic() || linkFor(pageId)) return;
    if (m.mode === 'advanced' && m.autoAdd) {
      const p = page(pageId);
      const parentLink = hasParent(p) ? m.items.find((it) => it.pageId === p.parent && it.depth === 0) : null;
      addLink(pageId, parentLink ? parentLink.id : null);
    }
  }

  // B marks pages made after the menu became links as New, until they're added or kept out.
  function flagIfNeeded(pageId) {
    if (ARM === 'explained' && !isAutomatic() && !linkFor(pageId) && !isFresh(pageId)) state.fresh.push(pageId);
  }

  function createPage(title, status) {
    const id = makeId(title);
    state.pages.push({ id, title, status, parent: null });
    if (status === 'publish') pageWentLive(id);
    flagIfNeeded(id);
    return id;
  }

  function publishPage(pageId) {
    const p = page(pageId);
    if (!p || p.status === 'publish') return;
    p.status = 'publish';
    pageWentLive(pageId);
    flagIfNeeded(pageId);
  }

  // The page's title. While the menu is automatic the menu shows the title, so it follows.
  // A link keeps its own label.
  function renamePage(pageId, title) {
    page(pageId).title = title;
  }

  function trashPage(pageId) {
    const m = state.menu;
    m.items.filter((it) => it.pageId === pageId).forEach((it) => removeLink(it.id));
    m.excluded = m.excluded.filter((x) => x !== pageId);
    state.pages.forEach((p) => { if (p.parent === pageId) p.parent = null; });
    state.pages = state.pages.filter((p) => p.id !== pageId);
    state.fresh = state.fresh.filter((x) => x !== pageId);
    state.trashed.push(pageId);
    if (ui.current === pageId) ui.current = 'home';
  }

  // ---------- Changes (each one can be undone) ----------

  function commit(fn, message) {
    const before = { state: clone(state), current: ui.current, message: message || '' };
    const sig = menuSignature();
    fn();
    undo = before;
    ui.more = null;
    if (!stats.firstMenuChange && menuSignature() !== sig) stats.firstMenuChange = Math.max(1, seconds());
    checkTasks();
    save();
    render();
    if (message) showToast(message, true);
  }

  // ---------- Small render helpers ----------

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const ICON = {
    page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    lines: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h9"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    grip: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>'
  };

  function btn(action, text, data, cls) {
    const attrs = Object.entries(data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
    return `<button type="button" class="btn ${cls || ''}" data-action="${action}"${attrs} data-focus="${esc(action + ':' + Object.values(data || {}).join(':'))}">${text}</button>`;
  }

  const keyRow = (pageId) => `page:${pageId}`;

  function moreButton(key, title) {
    return `<button type="button" class="icon-btn" data-action="more" data-key="${esc(key)}" data-focus="more:${esc(key)}" aria-label="More actions for ${esc(title)}" aria-expanded="${ui.more === key ? 'true' : 'false'}">${ICON.more}</button>`;
  }

  function moreMenuHtml(items) {
    return `<div class="moremenu" role="menu">${items.map((it) => {
      if (it === 'hr') return '<hr>';
      const [action, text, data, cls] = it;
      const attrs = Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
      return `<button type="button" role="menuitem" class="${cls || ''}" data-action="${action}"${attrs}>${text}</button>`;
    }).join('')}</div>`;
  }

  // The ⋮ menu's basics, the same in every arm.
  function basicMoreItems(p) {
    const items = [['ask-rename', 'Rename', { page: p.id }], ['view', 'View on site', { page: p.id, how: 'the ⋮ menu' }]];
    if (p.status === 'draft') items.push(['publish', 'Publish', { page: p.id, how: 'the ⋮ menu' }]);
    if (p.id !== 'home') items.push(['ask-trash', 'Move to trash', { page: p.id }, 'danger']);
    return items;
  }

  function titleButton(p) {
    return `<button type="button" class="row-title" data-action="view" data-page="${esc(p.id)}" data-how="its title in the Pages panel" data-focus="title:${esc(p.id)}">${esc(p.title)}</button>`;
  }

  function handleHtml(kind, id, title) {
    return `<button type="button" class="handle" data-drag="${esc(id)}" data-kind="${kind}" data-focus="drag:${esc(id)}" aria-label="Reorder ${esc(title)}. Use the up and down arrow keys, or drag." aria-describedby="reorder-hint">${ICON.grip}</button>`;
  }

  function draftBadge(p) {
    return p.status === 'draft' ? '<span class="badge draft">Draft</span>' : '';
  }

  function panelHead() {
    const n = state.pages.length;
    return `<div class="panel-head">
      <span class="panel-count">${n} ${n === 1 ? 'page' : 'pages'}</span>
      <span class="panel-actions">${btn('ask-add', 'Add page', {}, 'btn-small btn-dark')}</span>
    </div>`;
  }

  // ---------- The plain Pages panel (control, menu-switches) ----------

  // No menu controls of any kind: the tree of pages, Draft badges, Add page and the ⋮ basics.
  function renderPlain() {
    const rows = pageTreeRows().map(({ p, depth }) => {
      const key = keyRow(p.id);
      return `<li class="row${ui.flash === key ? ' flash' : ''}" data-row="${esc(key)}">
        <div class="row-main">
          <span class="indent" style="width:${depth * 20}px"></span>
          <span class="row-icon">${ICON.page}</span>
          <span class="row-text">${titleButton(p)}${draftBadge(p)}</span>
          ${moreButton(key, p.title)}
        </div>${ui.more === key ? moreMenuHtml(basicMoreItems(p)) : ''}</li>`;
    }).join('');
    return `${panelHead()}<ul class="list" aria-label="Pages">${rows}</ul>`;
  }

  // ---------- B, explained: one list with a menu marker on each page ----------

  // Pages in the menu come first, in menu order, so the list reads like the header. The rest
  // follow after a gap.
  function listRows() {
    const rows = [];
    const seen = new Set();
    const kind = isAutomatic() ? 'page' : 'item';
    let parentId = '';
    menuEntries().forEach((e) => {
      if (seen.has(e.pageId)) return;
      seen.add(e.pageId);
      const id = kind === 'page' ? e.pageId : e.id;
      if (e.depth === 0) parentId = id;
      rows.push({ key: keyRow(e.pageId), pageId: e.pageId, entry: e, depth: e.depth, kind, dragId: id, group: e.depth === 0 ? '' : parentId });
    });
    let first = true;
    state.pages.forEach((p) => {
      if (seen.has(p.id)) return;
      rows.push({ key: keyRow(p.id), pageId: p.id, depth: 0, rest: true, gap: first && rows.length > 0 });
      first = false;
    });
    return rows;
  }

  function markerKind(p) {
    if (isAutomatic()) return p.status === 'draft' ? 'pending' : 'auto';
    if (linkFor(p.id)) return p.status === 'draft' ? 'pending' : 'in';
    return 'out';
  }

  function markerHtml(kind, key, title, expanded) {
    const words = { in: 'in your menu', auto: 'in your menu automatically', pending: 'joins your menu when published', out: 'not in your menu' }[kind];
    return `<button type="button" class="marker ${kind}" data-action="pop" data-key="${esc(key)}" data-focus="pop:${esc(key)}" aria-expanded="${expanded ? 'true' : 'false'}" aria-label="${esc(title)}: ${words}"><span class="marker-face">${ICON.lines}</span></button>`;
  }

  function popoverFor(row) {
    const p = page(row.pageId);
    const kind = markerKind(p);
    const link = linkFor(p.id);
    if (kind === 'auto') {
      return {
        title: 'In your menu automatically',
        text: `Your header menu lists every published page, so "${esc(p.title)}" shows there too.`,
        actions: btn('ask-convert', 'Remove from menu', { page: p.id, trigger: 'remove' }, 'btn-small') + btn('ask-convert', 'Rename in menu', { page: p.id, trigger: 'rename' }, 'btn-small')
      };
    }
    if (kind === 'pending' && isAutomatic()) {
      return {
        title: 'Joins your menu when published',
        text: 'Your header menu shows every published page, so this draft will appear in it as soon as you publish it.',
        actions: btn('publish', 'Publish now', { page: p.id, how: 'its marker' }, 'btn-small btn-primary')
      };
    }
    if (kind === 'pending') {
      return {
        title: 'In your menu once published',
        text: 'It has a place in the header, but visitors won\'t see it until you publish the page.',
        actions: btn('publish', 'Publish now', { page: p.id, how: 'its marker' }, 'btn-small btn-primary') + btn('remove', 'Remove from menu', { page: p.id }, 'btn-small') + btn('ask-label', 'Rename in menu', { item: link.id }, 'btn-small')
      };
    }
    if (kind === 'in') {
      return {
        title: 'In your header menu',
        text: `Visitors see "${esc(link.label)}" at the top of every page.` + (link.label !== p.title ? ` It goes to your "${esc(p.title)}" page.` : ''),
        actions: btn('remove', 'Remove from menu', { page: p.id }, 'btn-small') + btn('ask-label', 'Rename in menu', { item: link.id }, 'btn-small')
      };
    }
    const fresh = isFresh(p.id);
    const text = p.status === 'draft'
      ? 'This draft isn\'t in the header. Add it now and it will appear once you publish it.'
      : `"${esc(p.title)}" is live at <code>${esc(pageUrl(p))}</code>, but visitors won't find it in the header. Links and search still reach it.` +
        (fresh ? ' New pages aren\'t added to your menu on their own, because you choose its pages.' : '');
    return {
      title: 'Not in your menu',
      text,
      actions: btn('add', 'Add to menu', { page: p.id }, 'btn-small btn-primary') + (fresh ? btn('dismiss', 'Keep it out', { page: p.id }, 'btn-small') : '')
    };
  }

  function popHtml(pop) {
    return `<div class="pop" role="dialog" aria-label="${esc(pop.title)}">
      <p class="pop-title">${pop.title}</p>
      <p class="pop-text">${pop.text}</p>
      <div class="pop-actions">${pop.actions || ''}${btn('close-pop', 'Close', {}, 'btn-small')}</div>
    </div>`;
  }

  function moveItems(kind, id) {
    const sibs = siblingIds(kind, id);
    const k = sibs.indexOf(id);
    const items = [];
    if (k > 0) items.push(['move', 'Move up', { kind, id, dir: -1 }]);
    if (k >= 0 && k < sibs.length - 1) items.push(['move', 'Move down', { kind, id, dir: 1 }]);
    return items;
  }

  function explainedMoreItems(row) {
    const p = page(row.pageId);
    let items = [];
    if (row.entry) {
      items = moveItems(row.kind, row.dragId);
      if (row.kind === 'item') {
        const all = state.menu.items;
        const index = all.indexOf(row.entry);
        const hasChildren = all[index + 1] && all[index + 1].depth > 0;
        if (row.depth === 0 && index > 0 && !hasChildren) items.push(['indent', 'Move into the dropdown above', { item: row.entry.id }]);
        if (row.depth > 0) items.push(['outdent', 'Move out of the dropdown', { item: row.entry.id }]);
      }
      if (items.length) items.push('hr');
    }
    return items.concat(basicMoreItems(p));
  }

  function explainedRowHtml(row) {
    const p = page(row.pageId);
    const kind = markerKind(p);
    const link = linkFor(p.id);
    const meta = link && link.label !== p.title ? `In your menu as "${link.label}"` : '';
    const drag = row.entry ? ` data-drag-id="${esc(row.dragId)}" data-drag-group="${esc(row.group)}"` : '';
    return `<li class="row${kind === 'out' ? ' dim' : ''}${ui.flash === row.key ? ' flash' : ''}${row.gap ? ' gap-before' : ''}" data-row="${esc(row.key)}"${drag}>
      <div class="row-main">
        ${row.entry ? handleHtml(row.kind, row.dragId, p.title) : '<span class="handle-gap"></span>'}
        <span class="indent" style="width:${row.depth * 20}px"></span>
        <span class="row-icon">${ICON.page}</span>
        <span class="row-text">${titleButton(p)}${draftBadge(p)}${isFresh(p.id) ? '<span class="badge new">New</span>' : ''}${meta ? `<span class="row-meta">${esc(meta)}</span>` : ''}</span>
        ${markerHtml(kind, row.key, p.title, ui.pop === row.key)}
        ${moreButton(row.key, p.title)}
      </div>${ui.more === row.key ? moreMenuHtml(explainedMoreItems(row)) : ''}${ui.pop === row.key ? popHtml(popoverFor(row)) : ''}</li>`;
  }

  function legendHtml() {
    const auto = isAutomatic();
    const face = (kind) => `<span class="marker ${kind}"><span class="marker-face">${ICON.lines}</span></span>`;
    return `<div class="legend" aria-hidden="true">
      <span>${face(auto ? 'auto' : 'in')}${auto ? 'In your menu automatically' : 'In your menu'}</span>
      <span>${face('pending')}When published</span>
      ${auto ? '' : `<span>${face('out')}Not in your menu</span>`}
    </div>`;
  }

  function renderExplained() {
    const n = state.fresh.length;
    const banner = isAutomatic()
      ? '<div class="banner"><strong>Your header menu shows all pages automatically</strong>New pages join it as soon as they\'re published. Drag a page by its handle, or use its ⋮ menu, to change the order.</div>'
      : n ? `<div class="banner"><strong>${n === 1 ? '1 new page isn\'t' : n + ' new pages aren\'t'} in your menu</strong>You choose your menu's pages, so new ones aren't added on their own. They're marked New in the list.</div>` : '';
    return `${panelHead()}${banner}
      <span id="reorder-hint" class="visually-hidden">Your header menu follows the order of the pages that are in it.</span>
      <ul class="list drag-list" aria-label="Pages">${listRows().map(explainedRowHtml).join('')}</ul>
      ${legendHtml()}`;
  }

  // ---------- F, connected switches: every page with an "In menu" switch ----------

  // The list is the menu's order: pages in page order, child pages under their parent, and
  // the pages that are on show in the header in that order. A switch never moves a row, and
  // the menu never stops being automatic: a page that's off is simply left out.
  function pageAbove(p) {
    if (hasParent(p) || p.id === 'home' || state.pages.some((x) => x.parent === p.id)) return null;
    const sibs = siblingIds('page', p.id);
    const k = sibs.indexOf(p.id);
    return k > 0 && sibs[k - 1] !== 'home' ? page(sibs[k - 1]) : null;
  }

  function switchesMoreItems(p) {
    const items = moveItems('page', p.id);
    const above = pageAbove(p);
    if (above) items.push(['page-nest', `Put under ${esc(above.title)}`, { page: p.id, parent: above.id }]);
    if (hasParent(p)) items.push(['page-unnest', `Take out from under ${esc(page(p.parent).title)}`, { page: p.id }]);
    if (items.length) items.push('hr');
    return items.concat(basicMoreItems(p));
  }

  function switchRowHtml({ p, depth }) {
    const key = keyRow(p.id);
    const on = !isExcluded(p.id);
    const parent = hasParent(p) ? page(p.parent) : null;
    let meta = '';
    if (on && p.status === 'draft') meta = 'Shows in the menu once published';
    else if (on && parent && !isExcluded(parent.id) && parent.status === 'publish') meta = `In the ${parent.title} dropdown`;
    return `<li class="row${on ? '' : ' dim'}${ui.flash === key ? ' flash' : ''}" data-row="${esc(key)}" data-drag-id="${esc(p.id)}" data-drag-group="${esc(parent ? parent.id : '')}">
      <div class="row-main">
        ${handleHtml('page', p.id, p.title)}
        <span class="indent" style="width:${depth * 20}px"></span>
        <span class="row-icon">${ICON.page}</span>
        <span class="row-text">${titleButton(p)}${draftBadge(p)}${meta ? `<span class="row-meta">${esc(meta)}</span>` : ''}</span>
        <button type="button" class="switch menu-switch" aria-pressed="${on}" data-action="switch-menu" data-page="${esc(p.id)}" data-focus="sw:${esc(p.id)}" aria-label="Show ${esc(p.title)} in your header menu"><span class="switch-track"></span></button>
        ${moreButton(key, p.title)}
      </div>${ui.more === key ? moreMenuHtml(switchesMoreItems(p)) : ''}</li>`;
  }

  function renderSwitches() {
    return `${panelHead()}
      <div class="toggle-list">
        <div class="toggle-head" aria-hidden="true"><span>Page</span><span>In menu</span></div>
        <span id="reorder-hint" class="visually-hidden">Your header menu follows the order of this list.</span>
        <ul class="list drag-list" aria-label="Pages">${pageTreeRows().map(switchRowHtml).join('')}</ul>
      </div>
      <p class="footnote">Switched-on pages show in your header menu, in the order of this list. New pages are switched on when they're published. Pages that are off are still live at their address.</p>`;
  }

  // =======================================================================================
  // SEAM: NAVIGATION SIDEBAR (control and menu-switches). Builder 2 builds the list here.
  // =======================================================================================
  //
  // In these two arms a click on the header menu in the preview selects it and opens the
  // Navigation sidebar, a third column of the workspace (see .navside in style.css). What's
  // already done: the hover outline and selected state on the menu, opening and closing
  // (clicking elsewhere in the preview, the close button, Escape), the count of opens
  // (stats.own, the code's k part) and the log lines. What's left: sidebarBodyHtml(), which
  // should render the menu from the model described at the top of this file, in two modes:
  //   control        automatic -> one locked Page List row, its notice and Edit (askConvert);
  //                  links -> the links list with labels, Move up / Move down / Remove, Add.
  //   menu-switches  automatic -> the pages with a show/hide toggle each (setExcluded), drag
  //                  and Move up / Move down (moveEntry / stepEntry with kind 'page'), and
  //                  "Switch to advanced menu" (askConvert); advanced -> the links list plus
  //                  Hide and "Add new pages automatically" (setAutoAdd).
  // ui.sidebar is true while it's open; add any view state it needs to startingUi().

  function openSidebar(how) {
    if (!IN_SIDEBAR) return;
    if (!ui.sidebar) {
      ui.sidebar = true;
      stats.own++;
      log('sidebar', 'Navigation sidebar opened (' + how + ')');
    }
    ui.pop = null; ui.more = null;
    render();
  }

  function closeSidebar(how) {
    if (!ui.sidebar) return;
    ui.sidebar = false;
    log('sidebar', 'Navigation sidebar closed (' + how + ')');
    render();
  }

  function sidebarBodyHtml() {
    // Builder 2: the menu's items go here.
    return '';
  }

  function sidebarHtml() {
    if (!IN_SIDEBAR || !ui.sidebar) return '';
    return `<aside class="navside" aria-label="Navigation">
      <div class="navside-head"><h2>Navigation</h2><button type="button" class="icon-btn" data-action="close-sidebar" data-focus="close-sidebar" aria-label="Close Navigation">${ICON.close}</button></div>
      <div class="navside-body">${sidebarBodyHtml()}</div>
    </aside>`;
  }

  // The words of the confirm that converts the menu, by arm and by what set it off.
  function convertCopy(d) {
    const p = d.pageId ? page(d.pageId) : null;
    if (ARM === 'explained') {
      const count = automaticItems().length;
      if (d.then === 'rename') {
        return {
          title: `Give "${esc(p.title)}" its own name in your menu?`,
          body: `<p>Your header menu shows every published page automatically, under each page's title. Renaming one means you choose the menu's pages from now on: all ${count} pages stay, and new pages won't be added on their own.</p>
            <p class="note">Nothing else in your header changes. New pages will be marked New until you add them or keep them out.</p>`,
          confirm: 'Rename and choose pages myself'
        };
      }
      return {
        title: `Take "${esc(p.title)}" out of your menu?`,
        body: `<p>Your header menu shows every published page automatically. Taking one out means you choose the menu's pages from now on: your other ${count - 1} pages stay, and new pages won't be added on their own.</p>
          <p class="note">Nothing else in your header changes. New pages will be marked New until you add them or keep them out.</p>`,
        confirm: 'Remove and choose pages myself'
      };
    }
    if (ARM === 'menu-switches') {
      return {
        title: 'Switch to advanced menu',
        body: '<p>The pages will become links you can edit. New pages will still be added automatically.</p>',
        confirm: 'Switch'
      };
    }
    return {
      title: 'Edit Page List',
      body: '<p>This Navigation Menu displays your website\'s pages. Editing it will enable you to add, delete, or reorder pages. However, new pages will no longer be added automatically.</p>',
      confirm: 'Edit'
    };
  }

  // Show the confirm. d: { trigger: what the person did, pageId?: the page it was about,
  // then?: 'remove' | 'rename', what to do with that page once the menu is links }.
  function askConvert(d) {
    ui.dialog = Object.assign({ type: 'convert' }, d);
    ui.pop = null; ui.more = null;
    stats.dialogsShown++;
    log('dialog', (ARM === 'menu-switches' ? 'Switch to advanced menu' : 'Convert to links') + ' dialog shown (' + d.trigger + (d.pageId ? ', ' + q(page(d.pageId).title) : '') + ')');
    render();
  }

  // ---------- Dialogs ----------

  function dialogHtml() {
    const d = ui.dialog;
    if (!d) return '';
    let body = '';
    if (d.type === 'add') {
      body = `<h2 id="dlg-title">New page</h2>
        <div class="field"><label for="dlg-name">Title</label><input type="text" id="dlg-name" value="${esc(d.name || '')}" autocomplete="off"></div>
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('create', 'Save as draft', { status: 'draft' })}${btn('create', 'Publish', { status: 'publish' }, 'btn-primary')}</div>`;
    }
    if (d.type === 'rename') {
      const p = page(d.pageId);
      body = `<h2 id="dlg-title">Rename page</h2>
        <div class="field"><label for="dlg-name">Title</label><input type="text" id="dlg-name" value="${esc(p.title)}" autocomplete="off"></div>
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('rename', 'Save', { page: p.id }, 'btn-primary')}</div>`;
    }
    if (d.type === 'label') {
      const it = itemById(d.itemId);
      const p = page(it.pageId);
      body = `<h2 id="dlg-title">Rename in menu</h2>
        <div class="field"><label for="dlg-name">Text</label><input type="text" id="dlg-name" value="${esc(it.label)}" autocomplete="off"></div>
        <div class="field"><span class="label">Page</span><span class="hint">${esc(p.title)} · ${esc(pageUrl(p))}</span></div>
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('save-label', 'Save', { item: it.id }, 'btn-primary')}</div>`;
    }
    if (d.type === 'convert') {
      const copy = convertCopy(d);
      body = `<h2 id="dlg-title">${copy.title}</h2>${copy.body}
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('convert', copy.confirm, {}, 'btn-primary')}</div>`;
    }
    if (d.type === 'trash') {
      const p = page(d.pageId);
      body = `<h2 id="dlg-title">Move "${esc(p.title)}" to trash?</h2>
        <p>${isShown(p.id) || inMenu(p.id) ? 'It\'s in your header menu, and it will be taken out of it.' : 'It isn\'t in your header menu, so nothing else on your site changes.'}</p>
        <p class="note">Undo puts it back in the same place.</p>
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('trash', 'Move to trash', { page: p.id }, 'btn-danger')}</div>`;
    }
    return `<div class="scrim" data-action="scrim"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${body}</div></div>`;
  }

  function closeDialog(how) {
    const d = ui.dialog;
    if (!d) return;
    if (d.type === 'convert') log('dialog', (ARM === 'menu-switches' ? 'Switch to advanced menu' : 'Convert to links') + ' dialog cancelled (' + how + ')');
    ui.dialog = null;
    render();
  }

  // ---------- The site preview ----------

  function siteLink(n) {
    const current = ui.current === n.pageId ? ' aria-current="page"' : '';
    // Where the menu is changed in its own sidebar, a click on it selects it, as in the editor.
    const act = IN_SIDEBAR ? '' : ` data-action="visit" data-page="${esc(n.pageId)}" data-how="the header menu"`;
    return `<a href="#"${act} data-nav-link="${esc(n.label)}" data-focus="visit:${esc(n.itemId || n.pageId)}"${current}>${esc(n.label)}${n.sub.length ? ' ' + ICON.chevron : ''}</a>`;
  }

  function renderSite() {
    const nav = shownMenu().map((n) => `<li>${siteLink(n)}${n.sub.length ? `<ul class="sub">${n.sub.map((s) => `<li>${siteLink(s)}</li>`).join('')}</ul>` : ''}</li>`).join('');
    const cur = page(ui.current) || page('home') || state.pages[0];
    const hero = cur.id === 'home'
      ? '<h1>Fresh bread, every morning.</h1><p>Sourdough, pastries and cakes baked on Mill Street since [YEAR].</p>'
      : `<h1>${esc(cur.title)}</h1><p>[The ${esc(cur.title)} page's content.]</p>`;
    const draft = cur.status === 'draft' ? '<span class="site-draft-note">Draft: only you can see this page</span>' : '';
    const select = IN_SIDEBAR ? ` data-action="select-menu"` : '';
    return `<div class="site">
      <header class="site-header">
        <button type="button" class="site-name" data-action="visit" data-page="home" data-how="the site's name" data-focus="visit:home-logo">Rosa's Bakery</button>
        <nav class="site-nav${IN_SIDEBAR ? ' selectable' : ''}${ui.sidebar ? ' selected' : ''}" aria-label="Site header menu"${select}><ul>${nav}</ul></nav>
      </header>
      <section class="site-hero"><div>${hero}${draft}</div><div class="site-photo" role="img" aria-label="Photo placeholder">Photo</div></section>
      <footer class="site-footer"><span>Rosa's Bakery</span></footer>
    </div>`;
  }

  // ---------- Render ----------

  const root = document.getElementById('app');
  document.body.classList.toggle('has-notes', NOTES);

  function render() {
    const active = document.activeElement;
    const focusKey = ui.focus || (active && active.dataset && active.dataset.focus);
    ui.focus = null;
    const panelScroll = (root.querySelector('.panel') || {}).scrollTop || 0;
    const stageScroll = (root.querySelector('.stage') || {}).scrollTop || 0;

    const panel = ARM === 'explained' ? renderExplained() : ARM === 'switches' ? renderSwitches() : renderPlain();
    const cur = page(ui.current) || page('home') || state.pages[0];

    root.innerHTML = `
      <div class="app arm-${ARM}">
        <div class="topbar">
          <div class="topbar-left"><span class="site-icon" aria-hidden="true">R</span><span class="topbar-title">Pages</span><span class="topbar-sub">Rosa's Bakery</span></div>
        </div>
        <div class="workspace">
          <main class="panel" aria-label="Pages">${panel}</main>
          <section class="stage" aria-label="Site preview">
            <div class="stage-bar"><span>The site as visitors see it</span><span class="stage-url">${esc(pageUrl(cur))}</span></div>
            ${renderSite()}
          </section>
          ${sidebarHtml()}
        </div>
        <div class="bottombar"><button type="button" class="btn btn-primary" data-action="finish" data-focus="finish">Finished</button><p>Click Finished when you've done everything you were asked to.</p></div>
      </div>
      ${dialogHtml()}`;

    const panelEl = root.querySelector('.panel');
    panelEl.scrollTop = panelScroll;
    root.querySelector('.stage').scrollTop = stageScroll;

    if (ui.dialog) {
      const first = root.querySelector('.dialog input, .dialog .btn-primary, .dialog .btn-danger');
      if (first && !root.querySelector('.dialog').contains(document.activeElement)) { first.focus(); if (first.select) first.select(); }
    } else if (focusKey) {
      const el = root.querySelector(`[data-focus="${CSS.escape(focusKey)}"]`);
      if (el) el.focus({ preventScroll: true });
    }
    if (ui.more) {
      const item = root.querySelector('.moremenu [role="menuitem"]');
      if (item) item.focus({ preventScroll: true });
    }
    // An open ⋮ menu or popover near the bottom of the list is scrolled into view.
    const open = root.querySelector('.moremenu, .pop');
    if (open) open.scrollIntoView({ block: 'nearest' });
    if (ui.flash) {
      const f = ui.flash;
      setTimeout(() => { if (ui.flash === f) ui.flash = null; }, 1700);
    }
    renderNotes();
  }

  function showToast(text, canUndo) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.innerHTML = `<span>${esc(text)}</span>${canUndo ? '<button type="button" data-action="undo">Undo</button>' : ''}`;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 7000);
  }

  function hideToast() {
    const t = document.getElementById('toast');
    if (t) t.hidden = true;
  }

  // ---------- Actions ----------

  function readName() {
    const i = document.getElementById('dlg-name');
    return i ? i.value.trim() : '';
  }

  function invalidName() {
    const i = document.getElementById('dlg-name');
    i.focus();
    i.setAttribute('aria-invalid', 'true');
  }

  function visit(pageId, how) {
    const p = page(pageId);
    if (!p) return;
    ui.current = pageId;
    log('visit', 'Viewed ' + q(p.title) + ' in the preview (from ' + how + ')');
  }

  // One reorder, by drag, by Move up / Move down or by the arrow keys on a handle.
  function reorder(kind, id, targetId, after, how) {
    const sibs = siblingIds(kind, id);
    const from = sibs.indexOf(id) + 1;
    const title = kind === 'item' ? itemById(id).label : page(id).title;
    const focus = how === 'move' ? 'more:' + keyRow(kind === 'item' ? itemById(id).pageId : id) : 'drag:' + id;
    commit(() => {
      moveEntry(kind, id, targetId, after);
      ui.flash = keyRow(kind === 'item' ? itemById(id).pageId : id);
      ui.focus = focus;
    }, ARM === 'switches' ? `"${title}" moved. Your header menu follows this order.` : `"${title}" moved`);
    const to = siblingIds(kind, id).indexOf(id) + 1;
    countReorder(how === 'drag' ? 'drag' : 'move');
    log('order', 'Reordered by ' + (how === 'drag' ? 'drag' : how === 'keys' ? 'the arrow keys on the handle (counted with Move up/down)' : 'Move up/down') + ': ' + q(title) + ' from place ' + from + ' to ' + to + (kind === 'item' ? ' among the menu’s links' : ' in page order'));
  }

  function step(kind, id, dir, how) {
    const sibs = siblingIds(kind, id);
    const k = sibs.indexOf(id) + dir;
    if (k < 0 || k >= sibs.length) return false;
    reorder(kind, id, sibs[k], dir > 0, how);
    return true;
  }

  const actions = {
    // B's marker popovers. Opening one counts (the code's k part).
    pop(d) {
      const opening = ui.pop !== d.key;
      ui.pop = opening ? d.key : null;
      ui.more = null;
      ui.focus = 'pop:' + d.key;
      if (opening) {
        const p = page(d.key.replace('page:', ''));
        stats.own++;
        log('menu', 'Marker popover opened: ' + q(p.title) + ' (' + { auto: 'in the menu automatically', in: 'in the menu', pending: 'joins the menu when published', out: 'not in the menu' }[markerKind(p)] + ')');
      }
      render();
    },
    'close-pop'() { const k = ui.pop; ui.pop = null; ui.focus = 'pop:' + k; render(); },
    more(d) { ui.more = ui.more === d.key ? null : d.key; ui.pop = null; ui.focus = 'more:' + d.key; render(); },

    // B, once the menu is links.
    add(d) {
      const p = page(d.page);
      commit(() => { addLink(d.page); ui.pop = null; ui.flash = keyRow(d.page); ui.focus = 'pop:' + keyRow(d.page); }, `"${p.title}" is in your header menu`);
      log('menu', 'Put ' + q(p.title) + ' in the menu (popover, Add to menu)');
    },
    remove(d) {
      const p = page(d.page);
      commit(() => { removeLink(linkFor(d.page).id); ui.pop = null; ui.flash = keyRow(d.page); ui.focus = 'pop:' + keyRow(d.page); }, `"${p.title}" is no longer in your header menu`);
      log('menu', 'Took ' + q(p.title) + ' out of the menu (popover, Remove from menu)');
    },
    dismiss(d) {
      const p = page(d.page);
      commit(() => { state.fresh = state.fresh.filter((x) => x !== d.page); ui.pop = null; ui.focus = 'pop:' + keyRow(d.page); }, `"${p.title}" stays out of your menu`);
      log('menu', 'Kept ' + q(p.title) + ' out of the menu (popover, Keep it out)');
    },
    'ask-convert'(d) { askConvert({ trigger: d.trigger === 'rename' ? 'Rename in menu' : d.trigger === 'remove' ? 'Remove from menu' : d.trigger, pageId: d.page || null, then: d.page ? d.trigger : null }); },
    convert() {
      const d = ui.dialog;
      const p = d.pageId ? page(d.pageId) : null;
      const mode = ARM === 'menu-switches' ? 'advanced' : 'links';
      ui.dialog = null;
      stats.dialogsConfirmed++;
      log('dialog', (mode === 'advanced' ? 'Switch to advanced menu' : 'Convert to links') + ' dialog confirmed');
      if (d.then === 'remove') {
        commit(() => { convertToLinks(mode); removeLink(linkFor(p.id).id); ui.flash = keyRow(p.id); ui.focus = 'pop:' + keyRow(p.id); },
          `"${p.title}" taken out. You now choose your menu's pages.`);
        log('menu', 'Menu converted to links, and ' + q(p.title) + ' taken out of it (popover, Remove from menu)');
        return;
      }
      commit(() => { convertToLinks(mode); if (p) ui.focus = 'pop:' + keyRow(p.id); },
        mode === 'advanced' ? 'Switched to an advanced menu' : ARM === 'explained' ? 'You now choose your menu\'s pages' : 'The menu\'s pages are now links');
      log('menu', mode === 'advanced' ? 'Menu switched to an advanced menu (links, new pages still added)' : 'Menu converted to links');
      if (d.then === 'rename') { ui.dialog = { type: 'label', itemId: linkFor(p.id).id }; render(); }
    },
    'ask-label'(d) { ui.dialog = { type: 'label', itemId: d.item }; ui.pop = null; ui.more = null; render(); },
    'save-label'(d) {
      const text = readName();
      if (!text) { invalidName(); return; }
      const it = itemById(d.item);
      const old = it.label;
      ui.dialog = null;
      if (text === old) { render(); return; }
      commit(() => { setLinkLabel(d.item, text); ui.flash = keyRow(it.pageId); ui.focus = 'pop:' + keyRow(it.pageId); }, `"${old}" is now "${text}" in your menu`);
      log('menu', 'Renamed a link’s label: ' + q(old) + ' to ' + q(text) + ' (the page is still called ' + q(page(it.pageId).title) + ')');
    },
    indent(d) {
      const it = itemById(d.item);
      commit(() => { indentItem(d.item); ui.focus = 'more:' + keyRow(it.pageId); }, 'Moved into the dropdown. Its page address hasn\'t changed.');
      log('order', q(it.label) + ' moved into the dropdown above it');
    },
    outdent(d) {
      const it = itemById(d.item);
      commit(() => { outdentItem(d.item); ui.focus = 'more:' + keyRow(it.pageId); }, 'Moved out of the dropdown');
      log('order', q(it.label) + ' moved out of its dropdown');
    },

    // F: one switch per page. Nothing else changes, and nothing is asked.
    'switch-menu'(d) {
      const p = page(d.page);
      const on = !isExcluded(d.page);
      stats.own++;
      commit(() => { setExcluded(d.page, on); ui.flash = keyRow(d.page); ui.focus = 'sw:' + d.page; },
        on ? `"${p.title}" is no longer in your header menu`
          : p.status === 'draft' ? `"${p.title}" will show in your header menu once it's published` : `"${p.title}" is in your header menu`);
      log('menu', (on ? 'Took ' + q(p.title) + ' out of the menu' : 'Put ' + q(p.title) + ' in the menu') + ' (switch)' + (p.status === 'draft' ? ', a draft' : ''));
    },
    'page-nest'(d) {
      const p = page(d.page);
      const parent = page(d.parent);
      commit(() => { nestPage(d.page, d.parent); ui.flash = keyRow(d.page); ui.focus = 'more:' + keyRow(d.page); },
        `"${p.title}" is under ${parent.title}. Its address is now ${SITE}/${parent.id}/${p.id}`);
      log('order', q(p.title) + ' put under ' + q(parent.title));
    },
    'page-unnest'(d) {
      const p = page(d.page);
      const parent = page(p.parent);
      commit(() => { unnestPage(d.page); ui.flash = keyRow(d.page); ui.focus = 'more:' + keyRow(d.page); },
        `"${p.title}" is no longer under ${parent.title}. Its address is now ${SITE}/${p.id}`);
      log('order', q(p.title) + ' taken out from under ' + q(parent.title));
    },

    move(d) { step(d.kind, d.id, Number(d.dir), 'move'); },

    // The basics, in every arm.
    view(d) { visit(d.page, d.how || 'the Pages panel'); ui.more = null; render(); },
    visit(d) { visit(d.page, d.how || 'the preview'); ui.focus = 'visit:' + d.page; render(); },
    publish(d) {
      const p = page(d.page);
      const was = isShown(d.page);
      commit(() => { publishPage(d.page); ui.pop = null; ui.flash = keyRow(d.page); }, `"${p.title}" is published`);
      log('page', 'Published ' + q(p.title) + ' (from ' + (d.how || 'the Pages panel') + '); ' + (isShown(d.page) && !was ? 'it is now in the menu' : 'it is not in the menu'));
    },
    'ask-add'() { ui.dialog = { type: 'add' }; ui.more = null; ui.pop = null; render(); },
    create(d) {
      const title = readName();
      if (!title) { invalidName(); return; }
      ui.dialog = null;
      let id;
      commit(() => {
        id = createPage(title, d.status);
        ui.flash = keyRow(id);
        ui.current = id;
        // In B the new page's popover opens, so its menu state is explained straight away.
        if (ARM === 'explained') { ui.pop = keyRow(id); ui.focus = 'pop:' + keyRow(id); }
        else if (ARM === 'switches') ui.focus = 'sw:' + id;
        else ui.focus = 'more:' + keyRow(id);
      }, `"${title}" ${d.status === 'draft' ? 'saved as a draft' : 'published'}`);
      log('page', 'Added ' + q(title) + ', ' + (d.status === 'draft' ? 'saved as a draft' : 'published; ' + (isShown(id) ? 'it is now in the menu' : 'it is not in the menu')));
      log('visit', 'The preview shows the new page, ' + q(title));
      if (ARM === 'explained') log('menu', 'Marker popover opened on its own after Add page: ' + q(title) + ' (not counted)');
    },
    'ask-rename'(d) { ui.dialog = { type: 'rename', pageId: d.page }; ui.more = null; ui.pop = null; render(); },
    rename(d) {
      const title = readName();
      if (!title) { invalidName(); return; }
      const p = page(d.page);
      const old = p.title;
      ui.dialog = null;
      if (title === old) { render(); return; }
      const link = linkFor(p.id);
      commit(() => { renamePage(d.page, title); ui.flash = keyRow(d.page); ui.focus = 'more:' + keyRow(d.page); }, `"${old}" is now "${title}"`);
      log('page', 'Renamed a page’s title: ' + q(old) + ' to ' + q(title) + (isAutomatic() ? (isShown(p.id) ? '; the menu follows' : '') : link ? '; its link in the menu still says ' + q(link.label) : ''));
    },
    'ask-trash'(d) { ui.dialog = { type: 'trash', pageId: d.page }; ui.more = null; ui.pop = null; render(); },
    trash(d) {
      const p = page(d.page);
      ui.dialog = null;
      commit(() => { trashPage(d.page); ui.pop = null; }, `"${p.title}" moved to trash`);
      log('page', 'Moved ' + q(p.title) + ' to trash');
    },
    'close-dialog'() { closeDialog('Cancel'); },
    scrim(d, el, ev) { if (ev.target === el) closeDialog('clicked outside'); },

    // Control and Q: the menu on the site, and its sidebar.
    'select-menu'(d, el, ev) {
      const link = ev.target.closest('[data-nav-link]');
      openSidebar(link ? 'clicked ' + q(link.dataset.navLink) + ' in the header menu' : 'clicked the header menu');
    },
    'close-sidebar'() { closeSidebar('close button'); },

    undo() {
      if (!undo) return;
      const what = undo.message;
      state = undo.state;
      ui.current = page(undo.current) ? undo.current : 'home';
      undo = null;
      ui.pop = null; ui.more = null;
      stats.undos++;
      hideToast();
      checkTasks();
      log('undo', 'Undo' + (what ? ': ' + what : ''));
      render();
    },
    finish() { finish(); }
  };

  function reset() {
    forget();
    state = startingState();
    ui = startingUi();
    stats = startingStats();
    events = [];
    startedAt = Date.now();
    firstDone = [];
    ticked = [];
    undo = null;
    hideToast();
    save();
    render();
  }

  document.addEventListener('click', (ev) => {
    if (ev.target.closest('a[href="#"]')) ev.preventDefault();
    // A click elsewhere in the preview closes the Navigation sidebar.
    if (ui.sidebar && ev.target.closest('.stage') && !ev.target.closest('.site-nav')) closeSidebar('clicked elsewhere in the preview');
    const el = ev.target.closest('[data-action]');
    if (!el) {
      // A click elsewhere closes an open popover or ⋮ menu.
      if ((ui.pop || ui.more) && !ev.target.closest('.pop, .moremenu, .notes')) { ui.pop = null; ui.more = null; render(); }
      return;
    }
    const action = actions[el.dataset.action];
    if (!action) return;
    action(Object.assign({}, el.dataset), el, ev);
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (drag) { endDrag(ev, true); return; }
      if (ui.dialog) { closeDialog('Escape'); return; }
      if (ui.more) { const k = ui.more; ui.more = null; ui.focus = 'more:' + k; render(); return; }
      if (ui.pop) { const k = ui.pop; ui.pop = null; ui.focus = 'pop:' + k; render(); return; }
      if (ui.sidebar) closeSidebar('Escape');
    }
    if (ev.key === 'Enter' && ui.dialog && ev.target.tagName === 'INPUT') {
      ev.preventDefault();
      const primary = root.querySelector('.dialog .btn-primary');
      if (primary) primary.click();
    }
    if (ui.more && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
      const items = [...root.querySelectorAll('.moremenu [role="menuitem"]')];
      const i = items.indexOf(document.activeElement);
      if (items.length) { ev.preventDefault(); items[(i + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
    }
  });

  // ---------- Reordering a list: drag a handle, or arrow keys on it ----------

  // Rows that can be dragged carry data-drag-id and data-drag-group (the row they sit under,
  // or '' at the top level). A row moves among the rows of its own group, and takes the rows
  // under it along.
  let drag = null;

  function rowsBlock(li) {
    const out = [li];
    let n = li.nextElementSibling;
    while (n && n.dataset.dragGroup && n.dataset.dragGroup === li.dataset.dragId) { out.push(n); n = n.nextElementSibling; }
    return out;
  }

  function clearDropMarks() {
    root.querySelectorAll('.drop-before, .drop-after').forEach((el) => el.classList.remove('drop-before', 'drop-after'));
  }

  document.addEventListener('pointerdown', (ev) => {
    const h = ev.target.closest('.handle');
    if (!h || ev.button > 0) return;
    const li = h.closest('li');
    ev.preventDefault();
    h.focus();
    try { h.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable; the document still hears the moves */ }
    ui.more = null; ui.pop = null;
    drag = { id: li.dataset.dragId, group: li.dataset.dragGroup, kind: h.dataset.kind, list: li.parentElement, target: null, moved: false, y: ev.clientY };
    rowsBlock(li).forEach((r) => r.classList.add('dragging'));
  });

  document.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    if (Math.abs(ev.clientY - drag.y) > 4) drag.moved = true;
    const sibs = [...drag.list.querySelectorAll('li[data-drag-id]')].filter((li) => li.dataset.dragGroup === drag.group);
    clearDropMarks();
    drag.target = null;
    for (const li of sibs) {
      const block = rowsBlock(li);
      const top = block[0].getBoundingClientRect().top;
      const bottom = block[block.length - 1].getBoundingClientRect().bottom;
      if (ev.clientY < (top + bottom) / 2) { drag.target = { id: li.dataset.dragId, after: false }; block[0].classList.add('drop-before'); break; }
    }
    if (!drag.target && sibs.length) {
      const last = sibs[sibs.length - 1];
      const block = rowsBlock(last);
      drag.target = { id: last.dataset.dragId, after: true };
      block[block.length - 1].classList.add('drop-after');
    }
    // Dropping right next to where it is changes nothing.
    if (drag.target) {
      const ids = sibs.map((li) => li.dataset.dragId);
      const from = ids.indexOf(drag.id);
      const to = ids.indexOf(drag.target.id) + (drag.target.after ? 1 : 0);
      if (to === from || to === from + 1) { drag.target = null; clearDropMarks(); }
    }
  });

  function endDrag(ev, cancel) {
    if (!drag) return;
    const d = drag;
    drag = null;
    clearDropMarks();
    root.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
    if (cancel || !d.target || !d.moved) return;
    reorder(d.kind, d.id, d.target.id, d.target.after, 'drag');
  }
  document.addEventListener('pointerup', (ev) => endDrag(ev, false));
  document.addEventListener('pointercancel', (ev) => endDrag(ev, true));

  document.addEventListener('keydown', (ev) => {
    const h = ev.target.closest && ev.target.closest('.handle');
    if (!h || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return;
    ev.preventDefault();
    const dir = ev.key === 'ArrowUp' ? -1 : 1;
    if (!step(h.dataset.kind, h.dataset.drag, dir, 'keys')) showToast(`Already ${dir < 0 ? 'first' : 'last'}`, false);
  });

  // ---------- Tasks ----------

  const hasText = (s, want) => String(s || '').trim().toLowerCase() === want;

  // The state of tasks 2 to 6 right now. Tasks 2, 3 and 5 are 1 or 0; tasks 4 and 6 are
  // 0 (not published), 1 (published, not shown in the menu) or 2 (published and shown).
  function taskValues() {
    const tree = shownMenu();
    const flat = shownFlat();
    const shown = (id) => flat.some((n) => n.pageId === id);
    const thanks = page('thank-you');
    const home = tree.findIndex((n) => n.pageId === 'home');
    const gift = state.pages.filter((p) => p.status === 'publish' && /gift card/i.test(p.title));
    const holiday = page('holiday-orders');
    return {
      2: thanks && thanks.status === 'publish' && !shown('thank-you') ? 1 : 0,
      3: home >= 0 && tree[home + 1] && tree[home + 1].pageId === 'catering' ? 1 : 0,
      4: !gift.length ? 0 : gift.some((p) => shown(p.id)) ? 2 : 1,
      5: flat.some((n) => n.pageId === 'visit-us' && hasText(n.label, 'find us')) ? 1 : 0,
      6: !holiday || holiday.status !== 'publish' ? 0 : shown('holiday-orders') ? 2 : 1
    };
  }

  // How task 5 was done: the page was renamed, only a link's label was changed, or neither.
  function renameHow() {
    const p = page('visit-us');
    if (p && hasText(p.title, 'find us')) return 'p';
    if (state.menu.items.some((it) => it.pageId === 'visit-us' && hasText(it.label, 'find us'))) return 'l';
    return '0';
  }

  const THREE = ['not published', 'published, not in the menu', 'published and in the menu'];
  const TASKS = [
    { text: 'Look only: which pages can a visitor reach from the top of the site?', hint: 'Never ticked automatically.' },
    { n: 2, text: 'Take “Thank you for your order” out of the menu without deleting it.', hint: 'Ticks when the page isn’t in the header menu and is still published.', state: (v) => (v ? 'out of the menu, still published' : page('thank-you') ? 'still in the menu' : 'the page is in the trash') },
    { n: 3, text: 'Move Catering to straight after Home.', hint: 'Ticks when Catering is the top-level item right after Home in the header.', state: (v) => (v ? 'right after Home' : 'not right after Home') },
    { n: 4, text: 'Make and publish a Gift cards page and get it into the menu.', hint: 'Ticks when a published page with “gift card” in its title is in the header menu.', full: 2, state: (v) => THREE[v] },
    { n: 5, text: 'Make “Visit us” say “Find us” in the menu.', hint: 'Ticks when the menu item for the Visit us page reads Find us.', state: (v) => (v ? 'the menu says Find us' : 'the menu doesn’t say Find us') + '; ' + { p: 'the page is called Find us', l: 'only the link’s label was changed', 0: 'the page is called ' + q((page('visit-us') || {}).title || 'nothing: it’s in the trash') }[renameHow()] },
    { n: 6, text: 'Publish Holiday orders.', hint: 'Ticks when it’s published. Ask first whether it will be in the menu.', full: 1, state: (v) => THREE[v] }
  ];

  function checkTasks() {
    const values = taskValues();
    TASKS.forEach((t, i) => {
      if (!t.n) return;
      const v = values[t.n];
      const mark = firstDone[i] || (firstDone[i] = {});
      // Tasks 4 and 6: note the first time the page is published, and what the menu did.
      if (t.full && v > 0 && !mark.published) {
        mark.published = elapsed();
        events.push({ at: elapsed(), kind: 'task', text: 'Task ' + t.n + ': ' + THREE[v] });
      }
      if (v >= (t.full || 1) && !mark.at) {
        mark.at = elapsed();
        ticked[i] = true;
        events.push({ at: elapsed(), kind: 'task', text: 'Task ' + t.n + ' reached' });
      }
    });
  }

  // ---------- The completion code ----------

  /*
   * For pasting into an unmoderated testing tool. For example:
   *   OB-11212-ml140-d1.1-f35-r1.2-np-x0-u2-k3-e0-s412
   * OC, OB, OF, OQ: the arm · tasks 2 to 6 when Finished was clicked ·
   * m: the menu at the end (ma automatic, ml links, mv advanced and still adding pages,
   *    mx advanced with adding turned off; each with the seconds when it was converted) ·
   * d: convert dialogs shown, confirmed · f: seconds until the first change to what the
   * menu shows (0 never) · r: reorders by drag, by Move up/down · n: how task 5 was done
   * (np page renamed, nl only a link's label, n0 neither) · x: pages in the trash ·
   * u: uses of Undo · k: the arm's own count · e: times turned back at "Have you done
   * every task?" · s: seconds until Finished.
   */
  function menuPart() {
    const m = state.menu;
    if (m.mode === 'automatic') return 'ma';
    if (m.mode === 'links') return 'ml' + m.convertedAt;
    return (m.autoAdd ? 'mv' : 'mx') + m.convertedAt;
  }

  function completionCode() {
    const v = taskValues();
    return [
      ARMS[ARM].code,
      [2, 3, 4, 5, 6].map((n) => v[n]).join(''),
      menuPart(),
      'd' + stats.dialogsShown + '.' + stats.dialogsConfirmed,
      'f' + stats.firstMenuChange,
      'r' + stats.dragReorders + '.' + stats.moveReorders,
      'n' + renameHow(),
      'x' + state.trashed.length,
      'u' + stats.undos,
      'k' + stats.own,
      'e' + stats.finishBack,
      's' + seconds()
    ].join('-');
  }

  // Finished asks first, then shows the code. Clicking Finished again later gives a new code.
  let finishEl = null;
  let finishStep = null;

  function finish() {
    if (!finishEl) {
      finishEl = document.createElement('dialog');
      finishEl.className = 'finish';
      finishEl.setAttribute('aria-labelledby', 'finish-title');
      document.body.append(finishEl);
      finishEl.addEventListener('close', () => {
        if (finishStep === 'ask') { stats.finishBack++; log('task', 'Turned back at “Have you done every task?”'); }
        finishStep = null;
        const b = root.querySelector('[data-action="finish"]');
        if (b) b.focus();
      });
      finishEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-back]')) { finishEl.close(); return; }
        if (e.target.closest('[data-sure]')) { showCode(); return; }
        if (!e.target.closest('[data-copy-code]')) return;
        const input = finishEl.querySelector('textarea');
        input.select();
        (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject()).then(
          () => showToast('Code copied', false),
          () => { try { document.execCommand('copy'); showToast('Code copied', false); } catch (err) { showToast('Select the code and copy it', false); } }
        );
      });
    }
    ui.pop = null; ui.more = null;
    finishStep = 'ask';
    log('task', 'Clicked Finished and was asked whether every task is done');
    finishEl.innerHTML = '<h2 id="finish-title">Have you done every task?</h2><p>Finished is the last step. Only carry on if you’ve done everything you were asked to.</p>' +
      '<div class="finish-actions"><button type="button" class="btn btn-primary" data-sure>Yes, I’ve finished</button><button type="button" class="link" data-back>Not yet, keep editing</button></div>';
    if (!finishEl.open) finishEl.showModal();
    finishEl.querySelector('[data-back]').focus();
  }

  function showCode() {
    finishStep = 'code';
    checkTasks();
    const code = completionCode();
    log('task', 'Finished. Code ' + code);
    finishEl.innerHTML = '<h2 id="finish-title">Thank you</h2><p>Please copy this code into the next question:</p>' +
      '<textarea class="task-code" readonly rows="2" aria-label="Your code">' + esc(code) + '</textarea>' +
      '<div class="finish-actions"><button type="button" class="btn btn-primary" data-copy-code>Copy code</button><button type="button" class="link" data-back>Keep editing</button></div>';
    const input = finishEl.querySelector('textarea');
    input.focus();
    input.select();
  }

  // ---------- The facilitator's notes panel (?notes or #notes) ----------

  let notesEl = null;

  function renderNotes() {
    if (!NOTES) return;
    if (!notesEl) {
      notesEl = document.createElement('aside');
      notesEl.className = 'notes';
      notesEl.setAttribute('aria-label', 'Facilitator notes');
      document.body.append(notesEl);
      notesEl.addEventListener('change', (e) => {
        const box = e.target.closest('[data-task]');
        if (!box) return;
        ticked[box.dataset.task] = box.checked;
        log('task', 'Facilitator ' + (box.checked ? 'ticked' : 'unticked') + ' task ' + (Number(box.dataset.task) + 1));
      });
      notesEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-copy]')) {
          const text = events.map((l) => l.at + '  ' + l.text).join('\n');
          (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => showToast('Log copied', false), () => showToast('Couldn’t copy. Select the log and copy it.', false));
        }
        if (e.target.closest('[data-reset]')) { reset(); showToast('Back to how it started', false); }
      });
    }
    const scroll = notesEl.scrollTop;
    const suffix = location.hash === '#notes' ? '#notes' : '?notes';
    const links = Object.keys(ARMS).map((a) => `<a href="${ARMS[a].file}${suffix}" title="${esc(ARMS[a].name)}"${a === ARM ? ' aria-current="page"' : ''}>${ARMS[a].letter}</a>`).join('');
    const values = taskValues();
    const tasks = TASKS.map((t, i) => {
      const mark = firstDone[i] || {};
      return `<li class="${ticked[i] ? 'is-done' : ''}"><label><input type="checkbox" data-task="${i}"${ticked[i] ? ' checked' : ''}> ${t.text}</label>` +
        (mark.at ? ` <time>${mark.at}</time>` : '') +
        `<small>${t.hint}${t.state ? ' Now: ' + esc(t.state(values[t.n])) + '.' : ''}</small></li>`;
    }).join('');
    const m = state.menu;
    const menuNow = m.mode === 'automatic' ? 'automatic' + (m.excluded.length ? ', ' + m.excluded.length + ' switched off' : '')
      : m.mode === 'links' ? 'links, since ' + m.convertedAt + 's'
      : 'advanced, since ' + m.convertedAt + 's, ' + (m.autoAdd ? 'still adding new pages' : 'adding new pages turned off at ' + m.autoAddOffAt + 's');
    const own = { control: 'Times the Navigation sidebar was opened', 'menu-switches': 'Times the Navigation sidebar was opened', explained: 'Marker popovers opened', switches: 'Switches flipped' }[ARM];
    notesEl.innerHTML =
      `<div class="notes-head"><h2>${ARMS[ARM].letter} · Facilitator notes</h2><nav class="switcher" aria-label="Prototype">${links}</nav></div>` +
      `<p>${ARMS[ARM].name}. Only you can see this panel; open the page without <code>?notes</code> for participants.</p>` +
      `<h3>Tasks</h3><ol class="tasks">${tasks}</ol>` +
      '<h3>Counts</h3><dl>' +
      `<dt>The menu now</dt><dd>${esc(menuNow)}</dd>` +
      `<dt>Convert dialogs shown, confirmed</dt><dd>${stats.dialogsShown}, ${stats.dialogsConfirmed}</dd>` +
      `<dt>First change to what the menu shows</dt><dd>${stats.firstMenuChange ? stats.firstMenuChange + 's' : 'not yet'}</dd>` +
      `<dt>Reorders by drag</dt><dd>${stats.dragReorders}</dd>` +
      `<dt>Reorders by Move up/down</dt><dd>${stats.moveReorders}</dd>` +
      `<dt>Pages in the trash</dt><dd>${state.trashed.length}</dd>` +
      `<dt>Uses of Undo</dt><dd>${stats.undos}</dd>` +
      `<dt>${own}</dt><dd>${stats.own}</dd>` +
      `<dt>Turned back at “Have you done every task?”</dt><dd>${stats.finishBack}</dd></dl>` +
      `<h3>Log</h3><ol class="log">${events.map((l) => `<li class="is-${l.kind}"><time>${l.at}</time>${esc(l.text)}</li>`).join('') || '<li>Nothing yet.</li>'}</ol>` +
      '<div class="actions"><button type="button" class="btn btn-small" data-copy>Copy log</button><button type="button" class="btn btn-small" data-reset>Reset</button></div>';
    notesEl.scrollTop = scroll;
  }

  // ---------- Start ----------

  if (!restore()) save();
  checkTasks();
  render();
})();
