/*
 * O'Keeffe round 2 · Pages and the site's menu.
 *
 * One engine for five prototypes. Each HTML page sets window.PROTOTYPE = { arm }:
 *   control        OC  the menu converts to links; changed in the menu's own sidebar
 *   auto-add       OA  the menu is links from the start, and still gets new pages while its
 *                      "Auto add pages" switch is on; changed in the menu's own sidebar
 *   explained      OB  the menu converts to links, explained; changed on the Pages screen
 *   switches       OF  the menu stays connected; changed on the Pages screen
 *   menu-switches  OQ  the menu stays connected; changed in the menu's own sidebar
 *
 * The same in all five: the site, the shell, the preview, the Pages panel's basics, the
 * tasks, the log and the completion code. The three arms that change the menu in its own
 * sidebar (control, auto-add, menu-switches) simulate WordPress's editor, so they also have
 * its saving: a menu change is unsaved until Save, and Undo and Redo are the editor's. B and
 * F apply every change at once, with the message's Undo.
 *
 * ---------------------------------------------------------------------------------------
 * THE MODEL, AND HOW THE PAGES PANEL AND THE NAVIGATION SIDEBAR USE IT
 * ---------------------------------------------------------------------------------------
 *
 * state.pages   [{ id, title, status: 'publish' | 'draft', parent }]. Array order is page
 *               order. Ids never change (renaming a page keeps its id and address).
 *               pageTreeRows() gives them as a tree: [{ p, depth }].
 * state.menu    {
 *                 mode: 'automatic' | 'links' | 'advanced',
 *                 excluded: [pageId],   automatic only: pages switched off (F, Q)
 *                 items: [{ id, pageId, label, depth: 0 | 1, hidden }],   links / advanced
 *                                       A link to a typed address has url and no pageId.
 *                                       The control's menu is 'links' from the start, and
 *                                       an item can be { id, type: 'pagelist', depth: 0 }:
 *                                       a Page List, which stands for the published pages
 *                                       as they are now, among whatever links are beside it.
 *                 autoAdd: bool,        advanced only: "Add new pages automatically" (Q),
 *                                       "Auto add pages" (auto-add, which starts advanced)
 *                 convertedAt, autoAddOffAt, mixedAt, removedAt   seconds, for the code
 *               }
 * state.saved   (sidebar arms) what has been saved: { menu, order, parents }.
 * state.hist    (sidebar arms) the editor's history: { stack: [{ menu, order, parents,
 *               what }], at, dirty }. See "The editor's saving, Undo and Redo".
 *
 * Reading the menu:
 *   menuEntries()   what the menu holds: automatic -> every published page that isn't
 *                   excluded, [{ pageId, depth }]; links / advanced -> state.menu.items,
 *                   with a Page List replaced by its pages ({ pageId, depth, list }).
 *   shownMenu()     what visitors see, as a tree [{ pageId, itemId, label, sub: [] }]:
 *                   no drafts, no hidden links. The tasks and the code read this.
 *   shownMenu(true) the menu as the preview draws it, standing in for the editor's canvas:
 *                   the same, except that a link to a draft page (made with Create page,
 *                   Publish off) is drawn, marked draft (DRAFT_LINKS). The preview reads this.
 *   entryLabel(e)   a link's own label, or the page's title while the menu is automatic.
 *   isExcluded(id), inMenu(pageId), linkFor(pageId), itemById(id).
 *
 * Changing it, in B and F and from the Pages panel in every arm (Add page, Rename, Publish,
 * Move to trash). Wrap the change in commit(fn, message): it keeps the
 * Undo snapshot, notes the first change to what the menu shows (the code's f part),
 * re-checks the tasks, saves to sessionStorage, renders and shows the message with Undo.
 * Undo is one level: the message's button, or Ctrl+Z / Cmd+Z, until the next change.
 * commit(fn, message, { quiet }) shows no message (a dialog is about to open), and
 * { keepUndo } makes the change part of the one before, so one Undo takes back both.
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
 * or a Page List shows the page; a links menu doesn't; an advanced menu with autoAdd adds a
 * link at the end (or at the end of its parent's submenu when the parent is in the menu) when
 * a page is published, never for a draft.
 *
 * Changing the menu in the sidebar arms. Wrap the change in edit(fn, what): it adds a step
 * to the history (what is how Undo and Redo name it in the log), shows no message, and
 * leaves the change unsaved. onSaved(fn) runs fn with `state` standing for the saved site:
 * the tasks, the m and n parts of the code and the notes panel are read that way.
 *
 * The convert / switch-to-advanced confirm: askConvert({ trigger, pageId?, then? }) shows
 * the dialog and counts it; the dialog's confirm button runs actions.convert, which counts
 * the confirm, converts (advanced in menu-switches, links elsewhere) and then runs the
 * `then` step. Cancelling is logged by closeDialog(). The words are in convertCopy().
 * Every dialog (ui.dialog) is opened with openDialog(d), which logs it, and closed by its
 * own action, by closeDialog(how) or by Undo. A dialog whose page or link has gone closes
 * itself (dialogSubject()). The Undo message is never shown while a dialog is open.
 *
 * Logging and counting (none of this is undone by Undo):
 *   log(kind, text)            kinds: visit, page, menu, order, dialog, sidebar, tried,
 *                              undo, task, reload. Use 'tried' for clicks that do nothing.
 *                              Log after commit(): the "Task N reached" lines that the
 *                              change set off are added straight after the next log line.
 *   countReorder(how)          how: 'drag' | 'move' (the code's r part)
 *   stats.own                  the arm's own count (k): sidebar opens are counted by
 *                              openSidebar(); B counts popovers; F counts switches.
 *   stats.dialogsShown / dialogsConfirmed   counted by askConvert / actions.convert.
 * The completion code (completionCode()) and the tasks (taskValues()) read only the model
 * above, so nothing in them is specific to an arm.
 *
 * The site editor (control, A, Q): search for "The site editor's navigation". A dark column
 * on the left (ui.screen: Design, Pages, Navigation, or a screen that isn't part of the
 * prototype), the site as the main area on Design, and core's Pages screen (Add Page, Edit,
 * View, Rename…, Trash…) in its place on Pages. A draft is published from the top bar's
 * Publish, with the page on the site. B and F keep their Pages panel.
 *
 * The Navigation sidebar: search for "THE NAVIGATION SIDEBAR". It is one component, drawn
 * from the model above, that follows the Navigation block's list view in WordPress's editor;
 * its actions, and the top bar's Undo, Redo and Save, are in navActions.
 */
(function () {
  'use strict';

  const ARMS = {
    control: { code: 'OC', letter: 'Control', file: 'control.html', where: 'sidebar', name: 'WordPress today: the menu is changed in its own sidebar, opened by clicking the menu on the site, and changing it converts it to links' },
    'auto-add': { code: 'OA', letter: 'A', file: 'auto-add.html', where: 'sidebar', name: 'Auto add: the menu is links from the start, changed in its own sidebar as in WordPress today, and an “Auto add pages” switch, on at the start, keeps adding newly published pages' },
    explained: { code: 'OB', letter: 'B', file: 'explained.html', where: 'pages', name: 'Explained: the menu is changed on the Pages screen, and taking a page out or renaming it in the menu converts the menu to links, after one confirm that says so' },
    switches: { code: 'OF', letter: 'F', file: 'switches.html', where: 'pages', name: 'Connected switches: every page has an “In menu” switch on the Pages screen, the list is the menu’s order, and the menu never converts' },
    'menu-switches': { code: 'OQ', letter: 'Q', file: 'menu-switches.html', where: 'sidebar', name: 'Menu switches: the menu’s own sidebar lists the pages with a show/hide toggle each, and the menu stays connected' }
  };
  const ARM = ARMS[(window.PROTOTYPE || {}).arm] ? window.PROTOTYPE.arm : 'control';
  const IN_SIDEBAR = ARMS[ARM].where === 'sidebar';
  // Q follows Quinn: switching a parent off hides its child pages too. F keeps O'Keeffe's
  // behaviour: child pages that are on move up to the top level.
  const PARENT_OFF_HIDES_CHILDREN = ARM === 'menu-switches';
  // Hiding a link is Quinn's, so only Q's advanced menu has Hide and Show.
  const CAN_HIDE = ARM === 'menu-switches';
  // The auto-add arm has no Page List: its menu is links from the start, with a switch that
  // keeps new pages arriving.
  const STARTS_AS_LINKS = ARM === 'auto-add';
  // Q's pages menu lists draft pages in its sidebar (with a Draft badge and a toggle that can't
  // be switched until the page is published); they're never in the menu on the site.
  const CANVAS_DRAFTS = ARM === 'menu-switches';
  // A link to a draft page, which only Create page (Publish off) in Add link makes, is drawn on
  // the site as the editor's canvas draws it, "Gift cards (Draft)" with a wavy underline, in the
  // control, A and Q's advanced menu. Visitors don't see it until the page is published.
  const DRAFT_LINKS = IN_SIDEBAR;
  const IS_MAC = /Mac|iPhone|iPad/.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '');
  const SITE = 'rosasbakery.example';
  const NOTES = new URLSearchParams(location.search).has('notes') || location.hash === '#notes';
  const STORE_KEY = 'okeeffe-round-2:' + ARM;
  // The site editor's screens (sidebar arms): Design (the site), and its entries. The entries
  // with a › lead to a screen of their own in core; Identity and Styles are listed as core lists
  // them. Only Pages and Navigation are part of the prototype.
  const SCREENS = { site: 'Design', identity: 'Identity', styles: 'Styles', pages: 'Pages', navigation: 'Navigation', patterns: 'Patterns', templates: 'Templates' };
  const SN_ENTRIES = { identity: false, styles: false, pages: true, navigation: true, patterns: true, templates: true };
  const OTHER_SCREENS = ['identity', 'styles', 'patterns', 'templates'];

  // ---------- Starting state ----------

  function startingState() {
    const start = {
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
    // The three arms in the test start with the six published pages only: Holiday orders, a draft,
    // was there for a task that's gone. B and F, which aren't in the test, keep it.
    if (IN_SIDEBAR) start.pages = start.pages.filter((p) => p.id !== 'holiday-orders');
    if (ARM === 'control') {
      // WordPress today: a menu whose one item is a Page List. Links can sit beside it.
      start.menu.mode = 'links';
      start.menu.items = [{ id: 'page-list-1', type: 'pagelist', depth: 0 }];
    }
    if (STARTS_AS_LINKS) {
      // The same links, with the same ids, as the control's menu straight after detaching.
      start.menu.items = start.pages.filter((p) => p.status === 'publish').map((p) => ({ id: 'link-' + start.seq++, pageId: p.id, label: p.title, depth: p.parent ? 1 : 0, hidden: false }));
      start.menu.mode = 'advanced';
      start.menu.autoAdd = true;
    }
    // Each page's Order number (WordPress's menu_order), as the round's site was set up in
    // WordPress: 0 to 8 in page order. Page order is these numbers, then the title.
    start.pages.forEach((p, i) => { p.order = i; });
    start.made = start.pages.map((p) => p.id);
    if (IN_SIDEBAR) {
      // The editor's saving: what has been saved, and the history that Undo and Redo walk.
      const first = { menu: JSON.parse(JSON.stringify(start.menu)), order: start.pages.map((p) => p.id), parents: {}, nums: {}, what: '' };
      start.pages.forEach((p) => { first.parents[p.id] = p.parent; first.nums[p.id] = p.order; });
      start.saved = JSON.parse(JSON.stringify(first));
      start.hist = { stack: [first], at: 0, dirty: 0 };
    }
    return start;
  }

  function startingUi() {
    return { pop: null, more: null, dialog: null, current: 'home', flash: null, focus: null, sidebar: false, navSel: null, navAdd: null, linkEdit: null, collapsed: {}, savePanel: null, typing: null,
      // The sidebar arms' site editor: the screen in its navigation column, and the Pages screen's
      // selected row, status filter and search.
      screen: 'site', pagesSel: null, pagesFilter: 'all', pagesSearch: '' };
  }

  function startingStats() {
    return { dialogsShown: 0, dialogsConfirmed: 0, firstMenuChange: 0, dragReorders: 0, moveReorders: 0, undos: 0, redos: 0, saves: 0, panelCancels: 0, own: 0, finishBack: 0, firstPages: 0, firstNavScreen: 0, orderUses: 0, catOutSaved: false, catOutScreen: false };
  }

  let state = startingState();
  let ui = startingUi();
  let stats = startingStats();
  let events = [];
  let startedAt = Date.now();
  let firstDone = [];
  let ticked = [];
  let undo = null;
  // Task lines wait here until the action that reached them has been logged.
  let pendingTaskLines = [];
  let typingAtReload = null;
  // The control's Page List row. No page id can be this: ids are made of a-z, 0-9 and "-".
  const PAGE_LIST = '#page-list';

  // ---------- Keeping it across a reload ----------

  // sessionStorage, so an accidental reload keeps the participant's work and a new tab starts
  // fresh. If it isn't available, everything simply lives in memory.
  function save() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({
        state, stats, events, startedAt, firstDone, ticked, current: ui.current, sidebar: ui.sidebar,
        screen: ui.screen, pagesSel: ui.pagesSel, pagesFilter: ui.pagesFilter, pagesSearch: ui.pagesSearch,
        // What was open, so that a reload can say what it closed.
        dialog: ui.dialog ? dialogLabel(ui.dialog) : null, finish: finishStep, panel: !!ui.savePanel,
        // An Add link that was open, and a Text being typed, so a reload can finish them.
        adding: ui.navAdd ? placeWords(ui.navAdd) : null, addingText: ui.navAdd ? (ui.navAdd.q || '').trim() : '', typing: ui.typing
      }));
    } catch (e) { /* in memory only */ }
  }

  function restore() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
      if (!saved || !saved.state || !saved.state.menu) return false;
      // Kept by an earlier version of this prototype, without the editor's saving: start again.
      if (IN_SIDEBAR && !saved.state.hist) return false;
      state = saved.state;
      stats = Object.assign(startingStats(), saved.stats);
      events = saved.events || [];
      startedAt = saved.startedAt || Date.now();
      firstDone = saved.firstDone || [];
      ticked = saved.ticked || [];
      ui.current = saved.current && page(saved.current) ? saved.current : 'home';
      // A reload leaves the Navigation sidebar as it was, without counting another opening.
      ui.sidebar = IN_SIDEBAR && !!saved.sidebar;
      // ... and on the site editor's screen it was on.
      if (IN_SIDEBAR && SCREENS[saved.screen]) ui.screen = saved.screen;
      if (IN_SIDEBAR) { ui.pagesSel = saved.pagesSel && page(saved.pagesSel) ? saved.pagesSel : null; ui.pagesFilter = saved.pagesFilter || 'all'; ui.pagesSearch = saved.pagesSearch || ''; }
      // A reload closes whatever dialog was open: say so, so that dialogs shown, confirmed
      // and cancelled still add up.
      const unsaved = unsavedCount();
      events.push({ at: elapsed(), kind: 'reload', text: 'Page reloaded' + (unsaved ? ', with ' + unsaved + ' unsaved menu ' + (unsaved === 1 ? 'change' : 'changes') + ', which ' + (unsaved === 1 ? 'is' : 'are') + ' kept' : '') });
      if (saved.panel) events.push({ at: elapsed(), kind: 'save', text: 'The save panel was open and was closed by the reload (not counted as cancelled)' });
      if (saved.adding) events.push({ at: elapsed(), kind: 'sidebar', text: 'Add link closed without adding anything (the page was reloaded' + (saved.addingText ? ', with ' + q(saved.addingText) + ' typed in Search or type URL' : '') + '): the “Page link” row ' + saved.adding + ' goes' });
      // Typing in a link's Text when the page was reloaded: what it came to is logged next.
      typingAtReload = IN_SIDEBAR && saved.typing ? saved.typing : null;
      if (saved.dialog) events.push({ at: elapsed(), kind: 'dialog', text: saved.dialog + ' dialog closed by reload' });
      if (saved.finish === 'ask') events.push({ at: elapsed(), kind: 'task', text: '“Have you done every task?” was open and was closed by the reload (not counted as turning back)' });
      if (saved.finish === 'code') events.push({ at: elapsed(), kind: 'task', text: 'The completion code was showing and was closed by the reload' });
      save();
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
    // "Task N reached" goes after the action that reached it.
    if (pendingTaskLines.length) { events.push(...pendingTaskLines); pendingTaskLines = []; }
    save();
    renderNotes();
  }

  function flushTaskLines() {
    if (!pendingTaskLines.length) return;
    events.push(...pendingTaskLines);
    pendingTaskLines = [];
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
  const isPageList = (it) => !!it && it.type === 'pagelist';
  // A block other than a link or a Page List, added with Add block: Buttons, Search, Social Icons.
  const isBlock = (it) => !!it && it.type === 'block';
  const BLOCKS = {
    buttons: { title: 'Buttons', icon: 'buttons', desc: 'Prompt visitors to take action with a group of button-style links.' },
    search: { title: 'Search', icon: 'search', desc: 'Help visitors find your content.' },
    social: { title: 'Social Icons', icon: 'social', desc: 'Display icons linking to your profiles or sites.' }
  };
  const itemTitle = (it) => (isPageList(it) ? 'Page List' : it.label);
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
  // With drafts (Q's pages menu, as the editor's canvas draws it), draft pages that aren't
  // switched off are in it too, marked draft.
  function automaticItems(drafts) {
    const live = (p) => (p.status === 'publish' || !!drafts) && !isExcluded(p.id);
    const out = [];
    pageTreeRows().forEach(({ p, depth }) => {
      if (!live(p)) return;
      const parent = depth ? page(p.parent) : null;
      if (parent && isExcluded(parent.id) && PARENT_OFF_HIDES_CHILDREN) return;
      const e = { pageId: p.id, depth: parent && live(parent) ? 1 : 0 };
      if (p.status !== 'publish') e.draft = true;
      out.push(e);
    });
    return out;
  }

  // A Page List among the links (the control) stands for the published pages, as they are now.
  function menuEntries(drafts) {
    if (isAutomatic()) return automaticItems(drafts);
    if (!state.menu.items.some(isPageList)) return state.menu.items;
    return state.menu.items.reduce((all, it) => all.concat(isPageList(it) ? automaticItems().map((e) => ({ pageId: e.pageId, depth: e.depth, list: it.id })) : it), []);
  }
  // Does the menu show this page under its title (so that renaming the page renames it there)?
  const followsTitle = (pageId) => isAutomatic() || menuEntries().some((e) => e.pageId === pageId && e.list);
  const inMenu = (pageId) => menuEntries().some((e) => e.pageId === pageId);
  const entryLabel = (e) => (e.label != null ? e.label : (page(e.pageId) || {}).title);

  // What visitors see: no drafts and no hidden links. A hidden link hides its submenu; the
  // links under a draft move up a level, so they stay reachable.
  // shownMenu(true) is the menu as the preview draws it, standing in for the editor's canvas:
  // the same, except that Q's pages menu also shows the drafts that are switched on, marked
  // draft (node.draft). The tasks and the code read shownMenu(), never this.
  function shownMenu(canvas) {
    const tree = [];
    let parentShown = false;
    let parentHidden = false;
    const draftLinks = !!canvas && DRAFT_LINKS && state.menu.mode !== 'automatic';
    menuEntries(false).forEach((e) => {
      const p = page(e.pageId);
      const linkToDraft = draftLinks && !!p && !e.list && p.status !== 'publish';
      // A link to a typed address, or another block, has no page: it shows unless it's hidden.
      const visible = (e.url || e.block ? true : !!p && (p.status === 'publish' || !!e.draft || linkToDraft)) && !e.hidden;
      const draft = (!!e.draft || linkToDraft) && !!p && p.status !== 'publish';
      if (e.depth === 0) {
        parentShown = visible;
        parentHidden = !!e.hidden;
        if (visible) tree.push({ pageId: e.pageId || null, itemId: e.id || null, list: e.list || null, url: e.url || null, block: e.block || null, label: entryLabel(e), draft, sub: [] });
        return;
      }
      if (!visible || parentHidden) return;
      const node = { pageId: e.pageId || null, itemId: e.id || null, list: e.list || null, url: e.url || null, block: e.block || null, label: entryLabel(e), draft, sub: [] };
      if (parentShown) tree[tree.length - 1].sub.push(node); else tree.push(node);
    });
    return tree;
  }
  const shownFlat = () => shownMenu().reduce((all, n) => all.concat(n, n.sub), []);
  const isShown = (pageId) => shownFlat().some((n) => n.pageId === pageId);
  // In the preview's menu, drafts included (Q's pages menu): for the log only.
  const onCanvas = (pageId) => shownMenu(true).reduce((all, n) => all.concat(n, n.sub), []).some((n) => n.pageId === pageId);
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

  // A new menu item's id: unused in the menu on screen, the saved menu and every step of the
  // history, so that a copy, an undone item and a new one can never share one.
  function newItemId(prefix) {
    const menus = [state.menu];
    if (state.saved) menus.push(state.saved.menu);
    if (state.hist) state.hist.stack.forEach((st) => menus.push(st.menu));
    const taken = (id) => menus.some((m) => m.items.some((it) => it.id === id));
    let id;
    do { id = prefix + state.seq++; } while (taken(id));
    return id;
  }

  // The switch out of automatic: the menu becomes today's published pages as links, in the
  // same order and at the same levels, each with its own label copied from the page's title.
  function convertToLinks(mode) {
    const m = state.menu;
    if (!isAutomatic()) return;
    const published = (p) => p && p.status === 'publish';
    // Published pages only: a draft isn't in Q's pages menu, and the advanced menu adds it when
    // it's published, while Add new pages automatically is on.
    const taken = (p) => published(p);
    m.items = pageTreeRows().filter((r) => taken(r.p)).map((r) => ({
      id: newItemId('link-'),
      pageId: r.p.id,
      label: r.p.title,
      depth: r.depth && taken(page(r.p.parent)) ? 1 : 0,
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
    const item = { id: newItemId('link-'), pageId, label: p.title, depth: 0, hidden: false };
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
    renumber();
  }

  // A page's Order number (menu_order). Moving pages by hand numbers them afresh, in order.
  const orderOf = (p) => (typeof p.order === 'number' ? p.order : state.pages.indexOf(p));
  function renumber() { state.pages.forEach((p, i) => { p.order = i; }); }
  const byOrder = (num, title) => (a, b) => (num(a) - num(b)) || title(a).localeCompare(title(b), undefined, { sensitivity: 'base' });

  // Order… on the Pages screen (the sidebar arms): the page's number changes, and page order
  // is the numbers, then the titles, as in WordPress. It's saved at once, like Rename, so it
  // changes the saved order and every step of the editor's history alike.
  function setPageOrder(pageId, n) {
    const p = page(pageId);
    if (!p) return;
    state.pages.forEach((x) => { x.order = orderOf(x); });
    p.order = n;
    const at = (x) => state.pages.indexOf(x);
    state.pages = state.pages.slice().sort((a, b) => byOrder((x) => x.order, (x) => x.title)(a, b) || at(a) - at(b));
    if (!IN_SIDEBAR) return;
    const title = (id) => (page(id) || { title: '' }).title;
    [state.saved].concat(state.hist.stack).forEach((snap) => {
      if (!snap.nums) { snap.nums = {}; snap.order.forEach((id, i) => { snap.nums[id] = i; }); }
      snap.nums[pageId] = n;
      const idx = (id) => snap.order.indexOf(id);
      snap.order = snap.order.slice().sort((a, b) => byOrder((id) => (id in snap.nums ? snap.nums[id] : idx(id)), title)(a, b) || idx(a) - idx(b));
    });
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
    renumber();
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
    if (IN_SIDEBAR) { addOnPublish(pageId); return; }
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

  function createPage(title, status, quietly) {
    const id = makeId(title);
    // A new page goes last in page order (in WordPress its Order would be 0: see the README).
    state.pages.push({ id, title, status, parent: null, order: state.pages.reduce((m, p) => Math.max(m, orderOf(p)), -1) + 1 });
    if (state.made) state.made.push(id);
    if (status === 'publish' && !quietly) pageWentLive(id);
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
    // The Pages screen's Trash lists what's in the trash, by title.
    const gone = page(pageId);
    if (gone) (state.bin || (state.bin = [])).push({ id: pageId, title: gone.title });
    // Its links go from the menu: on screen, as saved, and at every step Undo can go back to.
    everyMenu(() => {
      const m = state.menu;
      m.items.filter((it) => it.pageId === pageId).forEach((it) => removeLink(it.id));
      m.excluded = m.excluded.filter((x) => x !== pageId);
    });
    state.pages.forEach((p) => { if (p.parent === pageId) p.parent = null; });
    state.pages = state.pages.filter((p) => p.id !== pageId);
    state.fresh = state.fresh.filter((x) => x !== pageId);
    state.trashed.push(pageId);
    if (ui.current === pageId) ui.current = 'home';
  }

  // ---------- The editor's saving, Undo and Redo (control, auto-add, menu-switches) ----------
  //
  // These three arms change the menu inside WordPress's editor, so a menu change is unsaved
  // until Save, and Undo and Redo are the editor's: many levels, in the top bar and on the
  // keyboard. state.menu (and, in Q, the order and parents of state.pages) is what's on
  // screen. state.saved is what has been saved: { menu, order, parents }. state.hist is the
  // history: { stack: [{ menu, order, parents, what }], at, dirty }.
  //
  // What the Pages panel does (Add page, Rename, Publish, Move to trash) is not part of this:
  // it applies at once, to what's on screen and what's saved alike, with its own message and
  // Undo. Where such a change touches the menu (a trashed page's links go; a published page
  // is added by "Auto add pages") it's made to every copy of the menu, so Undo and Save never
  // bring a trashed page's link back or lose an added one.

  function snapshot(what, pageId) {
    const parents = {};
    state.pages.forEach((p) => { parents[p.id] = p.parent || null; });
    const nums = {};
    state.pages.forEach((p) => { nums[p.id] = orderOf(p); });
    return { menu: clone(state.menu), order: state.pages.map((p) => p.id), parents, nums, what: what || '', page: pageId || null };
  }

  // Pages in a snapshot's order, with its parents. Pages made since go last.
  function arrange(pages, snap) {
    const at = (p) => { const i = snap.order.indexOf(p.id); return i < 0 ? snap.order.length : i; };
    const out = pages.map((p, i) => ({ p, i })).sort((a, b) => at(a.p) - at(b.p) || a.i - b.i).map((x) => x.p);
    out.forEach((p) => {
      if (!(p.id in snap.parents)) return;
      const parent = snap.parents[p.id];
      p.parent = parent && pages.some((x) => x.id === parent) ? parent : null;
    });
    // The Order numbers that went with that order.
    if (snap.nums) out.forEach((p) => { if (p.id in snap.nums) p.order = snap.nums[p.id]; });
    return out;
  }

  function applySnapshot(snap) {
    state.menu = clone(snap.menu);
    state.pages = arrange(state.pages, snap);
  }

  // Run fn with `state` standing for what has been saved. Everything that reads the menu
  // reads `state`, so the tasks and the code can be worked out for the saved site.
  function onSaved(fn) {
    if (!IN_SIDEBAR) return fn();
    const live = state;
    state = Object.assign({}, live, { menu: live.saved.menu, pages: arrange(live.pages.map((p) => Object.assign({}, p)), live.saved) });
    try { return fn(); } finally { state = live; }
  }

  // Run fn once for each copy of the menu, with state.menu standing for that copy.
  function everyMenu(fn) {
    if (!IN_SIDEBAR) { fn(); return; }
    const live = state.menu;
    try {
      [live, state.saved.menu].concat(state.hist.stack.map((s) => s.menu)).forEach((m) => { state.menu = m; fn(); });
    } finally { state.menu = live; }
  }

  // A page has just been published. The Page List and Q's pages menu show it without being
  // told. A menu of links gets a link only if the SAVED menu has its auto-add setting on,
  // since that's the menu the site acts on; the link is then in every copy.
  function addOnPublish(pageId) {
    const sm = state.saved.menu;
    if (!(sm.mode === 'advanced' && sm.autoAdd)) return;
    const p = page(pageId);
    const id = newItemId('link-');
    everyMenu(() => {
      const m = state.menu;
      if (m.mode !== 'advanced' || m.items.some((it) => it.pageId === pageId)) return;
      const item = { id, pageId, label: p.title, depth: 0, hidden: false };
      let i = hasParent(p) ? m.items.findIndex((it) => it.pageId === p.parent && it.depth === 0) : -1;
      if (i >= 0) {
        i += 1;
        while (i < m.items.length && m.items[i].depth > 0) i += 1;
        item.depth = 1;
        m.items.splice(i, 0, item);
      } else m.items.push(item);
    });
  }

  const sameAsSaved = () => {
    const a = snapshot();
    const b = state.saved;
    const parents = (s) => state.pages.map((p) => p.id + ':' + (s.parents[p.id] || '')).join();
    const order = (s) => arrange(state.pages.map((p) => ({ id: p.id })), s).map((p) => p.id).join();
    return JSON.stringify(a.menu) === JSON.stringify(b.menu) && order(a) === order(b) && parents(a) === parents(b);
  };
  const menuUnsaved = () => IN_SIDEBAR && JSON.stringify(state.menu) !== JSON.stringify(state.saved.menu);

  // Whether a page that has just been published is in the menu, for the log: in the sidebar
  // arms the saved menu (what visitors see) and the menu on screen can differ.
  function menuWords(pageId) {
    const screen = isShown(pageId);
    const saved = onSaved(() => isShown(pageId));
    const m = state.menu;
    const sm = state.saved.menu;
    let w;
    if (screen && saved) w = 'it is now in the menu';
    else if (!screen && !saved) w = 'it is not in the menu';
    else if (saved) {
      w = ARM === 'menu-switches' && sm.mode === 'automatic' && m.mode === 'automatic' ? 'it is in the saved pages menu, so visitors see it, but switched off in the pages menu on screen, which isn’t saved yet'
        : ARM === 'menu-switches' && sm.mode === 'automatic' ? 'it is in the saved pages menu, so visitors see it, but not in the advanced menu on screen, which isn’t saved yet'
        : ARM === 'control' && sm.items.some(isPageList) ? 'it is in the saved menu’s Page List, so visitors see it, but not in the menu on screen, whose changes aren’t saved yet'
        : 'it is in the saved menu, so visitors see it, but not in the menu on screen, whose changes aren’t saved yet';
    } else w = 'it is in the menu on screen, but not in the saved menu, so visitors don’t see it yet';
    if (m.mode === 'advanced' && sm.mode === 'advanced' && m.autoAdd !== sm.autoAdd) w += ' (the saved menu’s setting decides this: the switch was changed but not saved)';
    return w;
  }

  // Q: a draft's toggle in the pages menu, for the log line of its publishing. On screen and
  // as saved, when they differ. Nothing once neither menu is a pages menu.
  // (Q's draft toggles can't be switched, so a draft's publishing has no toggle to report.)
  function draftToggleWords() { return ''; }

  // The pages whose place or parent on screen isn't what's saved (Q's pages menu moves
  // pages), narrowed to the ones the person moved since the last save.
  function pagesUnsaved() {
    if (!IN_SIDEBAR) return [];
    const savedPages = arrange(state.pages.map((p) => ({ id: p.id, parent: p.parent })), state.saved);
    const place = (list, p) => list.filter((x) => (x.parent || null) === (p.parent || null)).findIndex((x) => x.id === p.id);
    const differ = state.pages.filter((p) => {
      const s = savedPages.find((x) => x.id === p.id);
      return (s.parent || null) !== (p.parent || null) || place(savedPages, s) !== place(state.pages, p);
    });
    const moved = state.hist.stack.map((s) => s.page).filter(Boolean);
    const mine = differ.filter((p) => moved.includes(p.id));
    return mine.length ? mine : differ;
  }

  // How many menu changes are waiting to be saved: the changes made since the last save,
  // less the ones undone (or the ones undone from before it). Nothing, if the screen is back
  // to what was saved.
  function unsavedCount() {
    if (!IN_SIDEBAR || !state.hist || sameAsSaved()) return 0;
    return Math.max(1, Math.abs(state.hist.dirty));
  }

  // The control's menu is a Page List, a Page List with something beside it (links, or a
  // second Page List), links only (after detaching), or links only after the Page List was
  // removed without detaching. The moment it first becomes mixed, or loses its last Page List
  // without being detached, is stamped on the menu for the code's m part.
  const isPlainPageList = (m) => m.items.length === 1 && isPageList(m.items[0]);
  function stampMenu() {
    if (ARM !== 'control') return;
    const m = state.menu;
    const lists = m.items.filter(isPageList).length;
    if (lists && !isPlainPageList(m) && m.mixedAt == null) m.mixedAt = Math.max(1, seconds());
    if (!lists && m.convertedAt == null && m.removedAt == null) m.removedAt = Math.max(1, seconds());
  }

  // A change to the menu in these arms. No message: the editor shows none.
  function edit(fn, what, pageId) {
    endTyping();
    const sig = menuSignature();
    fn();
    stampMenu();
    const h = state.hist;
    h.stack.length = h.at + 1;
    h.stack.push(snapshot(what, pageId));
    if (h.stack.length > 200) h.stack.shift();
    h.at = h.stack.length - 1;
    h.dirty = sameAsSaved() ? 0 : Math.abs(h.dirty) + 1;
    undo = null;
    hideToast();
    ui.more = null;
    if (!stats.firstMenuChange && menuSignature() !== sig) stats.firstMenuChange = Math.max(1, seconds());
    checkTasks();
    save();
    render();
  }

  // Closes whatever is open that a step back or forward might be about.
  function closeForHistory(what) {
    const open = ui.dialog;
    dropAdd(what);
    ui.dialog = null; ui.pop = null; ui.more = null; ui.typing = null;
    if (drag) endDrag(null, true, 'interrupted');
    if (open) log('dialog', dialogLabel(open) + ' dialog closed by Undo or Redo');
  }

  function editorUndo(how) {
    const h = state.hist;
    if (h.at === 0) { log('tried', 'Tried Undo (' + how + ') with nothing to undo'); return; }
    closeForHistory('Undo');
    const what = h.stack[h.at].what;
    h.at--;
    applySnapshot(h.stack[h.at]);
    h.dirty = sameAsSaved() ? 0 : h.dirty - 1;
    stats.undos++;
    undo = null;
    hideToast();
    checkTasks();
    log('undo', 'Undo (' + how + '): ' + what + (sameAsSaved() ? '; the menu is back to what was saved' : ''));
    render();
  }

  function editorRedo(how) {
    const h = state.hist;
    if (h.at >= h.stack.length - 1) { log('tried', 'Tried Redo (' + how + ') with nothing to redo'); return; }
    closeForHistory('Redo');
    h.at++;
    applySnapshot(h.stack[h.at]);
    h.dirty = sameAsSaved() ? 0 : h.dirty + 1;
    stats.redos++;
    undo = null;
    hideToast();
    checkTasks();
    log('undo', 'Redo (' + how + '): ' + h.stack[h.at].what + (sameAsSaved() ? '; the menu is back to what was saved' : ''));
    render();
  }

  // What the save panel lists: the menu, if it has unsaved changes, and each moved page.
  function saveEntities() {
    const list = [];
    if (menuUnsaved()) list.push({ key: 'menu', group: 'Navigation Menus', name: 'Navigation' });
    pagesUnsaved().forEach((p) => list.push({ key: 'page:' + p.id, group: 'Pages', name: p.title }));
    return list;
  }
  const entityWords = (list) => ['Navigation Menus', 'Pages'].map((g) => {
    const names = list.filter((e) => e.group === g).map((e) => e.name);
    return names.length ? g + ': ' + names.join(', ') : '';
  }).filter(Boolean).join('; ');

  function openSavePanel(how) {
    const list = saveEntities();
    if (!list.length) { log('tried', 'Tried Save (' + how + ') with nothing to save'); return; }
    dropAdd('Save was clicked');
    ui.savePanel = { off: [] };
    ui.more = null; ui.pop = null;
    ui.focus = 'save-cancel';
    undo = null;
    hideToast();
    log('save', 'Save clicked (' + how + '): the save panel is shown, listing ' + entityWords(list));
    render();
  }

  function closeSavePanel(how) {
    if (!ui.savePanel) return;
    ui.savePanel = null;
    stats.panelCancels++;
    ui.focus = 'ed-save';
    log('save', 'Save panel closed without saving (' + how + ')');
    render();
  }

  function saveNow() {
    const panel = ui.savePanel;
    if (!panel) return;
    const list = saveEntities().filter((e) => !panel.off.includes(e.key));
    const left = saveEntities().filter((e) => panel.off.includes(e.key));
    if (!list.length) { log('tried', 'Tried Save in the save panel with nothing ticked'); return; }
    const now = snapshot();
    if (list.some((e) => e.key === 'menu')) state.saved.menu = now.menu;
    // Page order is one thing: saving any moved page saves where the pages are.
    if (list.some((e) => e.group === 'Pages')) { state.saved.order = now.order; state.saved.parents = now.parents; }
    const h = state.hist;
    if (sameAsSaved()) h.dirty = 0;
    else {
      // Saved in part (Q: the menu or the pages, not both). What's still unsaved is the
      // changes since the last save of the kind that wasn't saved: page moves, or the rest.
      const menuSaved = list.some((e) => e.key === 'menu');
      const recent = h.dirty > 0 ? h.stack.slice(h.at - h.dirty + 1, h.at + 1) : [];
      h.dirty = Math.max(1, recent.filter((st) => (menuSaved ? !!st.page : !st.page)).length);
    }
    ui.savePanel = null;
    ui.focus = 'ed-save';
    stats.saves++;
    checkTasks();
    log('save', 'Saved: ' + entityWords(list) + (left.length ? '. Left unsaved, unticked: ' + entityWords(left) : ''));
    render();
    showToast('Site updated.', false);
  }

  // ---------- Changes (each one can be undone) ----------

  // opts.quiet: no message yet (a dialog is about to open; the flow shows one when it ends).
  // opts.keepUndo: this change finishes a flow that began with the last one, so Undo still
  // goes back to before that one.
  function commit(fn, message, opts) {
    const o = opts || {};
    if (IN_SIDEBAR) endTyping();
    const before = { state: clone(state), current: ui.current, message: message || '' };
    const sig = menuSignature();
    fn();
    // A Pages panel change can bring the menu back to what's saved (trashing a page whose link
    // was the only unsaved change): then nothing is waiting to be saved.
    if (IN_SIDEBAR && sameAsSaved()) state.hist.dirty = 0;
    if (o.keepUndo && undo) undo.message = before.message; else undo = before;
    ui.more = null;
    if (!stats.firstMenuChange && menuSignature() !== sig) stats.firstMenuChange = Math.max(1, seconds());
    checkTasks();
    save();
    render();
    if (message && !o.quiet) showToast(message, true); else hideToast();
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
    enter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6v5a3 3 0 0 1-3 3H6"/><path d="M9 10l-4 4 4 4"/></svg>',
    expander: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10.5 8.5L13.5 12L10.5 15.5"/></svg>',
    customLink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.5 14.5h-1V16h1a4 4 0 0 0 0-8h-1v1.5h1a2.5 2.5 0 0 1 0 5z"/><path d="M4 12h10M9 7.5 4.5 12 9 16.5"/></svg>',
    buttons: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4.75" y="4.75" width="14.5" height="5.5" rx="1.25"/><rect x="4.75" y="13.75" width="14.5" height="5.5" rx="1.25"/></svg>',
    pageList: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M7.75 20.25H19c.69 0 1.25-.56 1.25-1.25V5.75"/><path d="M7.5 6.25h7M7.5 9.75h7M7.5 13.25h7M17.25 16V4c0-.69-.56-1.25-1.25-1.25H6c-.69 0-1.25.56-1.25 1.25v12c0 .69.56 1.25 1.25 1.25h10c.69 0 1.25-.56 1.25-1.25z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="13" cy="10" r="5.25"/><path d="M9.25 13.75 5 18"/></svg>',
    social: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="17" cy="6" r="2.25"/><circle cx="7" cy="12" r="2.25"/><circle cx="17" cy="18" r="2.25"/><path d="m9 11 6-4M9 13l6 4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    unseen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/><path d="M4 4l16 16"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6L4 10l4 4"/><path d="M4 10h10a5 5 0 0 1 0 10h-2"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 6l4 4-4 4"/><path d="M20 10H10a5 5 0 0 0 0 10h2"/></svg>',
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

  // ---------- The plain Pages panel (control, auto-add, menu-switches) ----------

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
      <p class="footnote">Switched-on pages show in your header menu, in the order of this list.</p>`;
  }

  // =======================================================================================
  // THE NAVIGATION SIDEBAR (control, auto-add and menu-switches): one component
  // =======================================================================================
  //
  // In these three arms a click on the header menu in the preview selects it and opens the
  // Navigation sidebar, a third column of the workspace (see .navside in style.css). It
  // follows the Navigation block's list view in WordPress's editor (see the README for
  // what was checked against a running editor, and for where it stops short):
  //   The list         one row for each item of the menu. Rows have no handles: a row is
  //                    dragged by its name. Each has a ⋮ (Move up, Move down, Add submenu
  //                    link, Duplicate, Add before, Add after, Remove), and below the list is
  //                    a + that adds a link.
  //   A Page List      (the control's menu starts as one) is a row with the published pages
  //                    listed under it. Those can't be changed: selecting or dragging one
  //                    asks to detach the Page List. Links can be added beside it, and it can
  //                    be moved among them, duplicated or removed.
  //   Selecting a row  replaces the list with that item's settings: a link's Text and Link
  //                    to; a Page List's Detach Page List button. A back button returns.
  //   Adding a link    puts a "Page link" row where it will go and opens "Search or type
  //                    URL" under it: the site's pages, a typed address, or Create page.
  //   Q's pages menu   lists the published pages themselves, each with a show/hide toggle
  //                    and a ⋮ (Move up, Move down), with Switch to advanced menu below.
  //   Q's advanced menu and the auto-add arm are the list of links, plus Hide and Show (Q)
  //                    and a switch below the list that keeps adding new pages.
  // View state: ui.sidebar (open), ui.navSel (the selected item's id), ui.navAdd ({ place:
  // 'end' | 'before' | 'after' | 'sub', ref, create, title, publish }: the Add link popover).

  function openSidebar(how) {
    if (!IN_SIDEBAR) return;
    if (!ui.sidebar) {
      ui.sidebar = true;
      ui.collapsed = {};
      stats.own++;
      log('sidebar', 'Navigation sidebar opened (' + how + ')');
    }
    ui.pop = null; ui.more = null;
    render();
  }

  function closeSidebar(how) {
    if (!ui.sidebar) return;
    endTyping();
    dropAdd('closed the sidebar');
    ui.sidebar = false;
    ui.navSel = null;
    ui.collapsed = {};
    if (ui.more && ui.more.indexOf('nav:') === 0) ui.more = null;
    log('sidebar', 'Navigation sidebar closed (' + how + ')');
    render();
  }

  const navKey = (id) => 'nav:' + id;
  const published = (p) => !!p && p.status === 'publish';

  // The rows of the sidebar's list. kind: 'page' (Q's pages menu), 'item' (a link),
  // 'pagelist' (a Page List) or 'plpage' (a page shown under a Page List).
  function navRows() {
    if (isAutomatic()) {
      // Q's pages menu: every page, drafts too, in page order.
      return pageTreeRows().map((r) => {
        const nested = !!r.depth;
        return { kind: 'page', id: r.p.id, title: r.p.title, depth: nested ? 1 : 0, group: nested ? r.p.parent : '', draft: !published(r.p) };
      });
    }
    const rows = [];
    let parent = '';
    state.menu.items.forEach((it) => {
      if (it.depth === 0) parent = it.id;
      if (isPageList(it)) {
        rows.push({ kind: 'pagelist', id: it.id, title: 'Page List', depth: 0, group: '' });
        automaticItems().forEach((e) => rows.push({ kind: 'plpage', id: it.id + ':' + e.pageId, pageId: e.pageId, list: it.id, title: page(e.pageId).title, depth: e.depth + 1, group: it.id }));
        return;
      }
      rows.push({ kind: 'item', id: it.id, title: it.label, depth: it.depth, group: it.depth ? parent : '', hidden: !!it.hidden, block: isBlock(it) ? it.block : null });
      if (isBlock(it) && it.block === 'buttons') rows.push({ kind: 'blockchild', id: it.id + ':button', parent: it.id, title: 'Button', depth: it.depth + 1, group: it.id });
    });
    return rows;
  }

  // The rows a row can be moved among with Move up / Move down: the ones at its level, under
  // the same parent.
  function navSibs(kind, id) {
    const rows = navRows();
    const row = rows.find((r) => r.id === id);
    return row ? rows.filter((r) => r.depth === row.depth && r.group === row.group).map((r) => r.id) : [];
  }

  const navTitle = (kind, id) => (kind === 'item' ? (itemById(id) ? itemTitle(itemById(id)) : undefined) : (page(id) || {}).title);

  // Where a row is, in words, for the log.
  function navPlace(kind, id) {
    const row = navRows().find((r) => r.id === id);
    if (!row) return 'nowhere';
    return 'place ' + (navSibs(kind, id).indexOf(id) + 1) + (row.group ? ' under ' + q(navTitle(kind, row.group)) : ' at the top level');
  }

  // Home is the site's front page: it isn't put under another page, and (as in F) pages
  // aren't put under it. A link goes under any link, but not under a Page List, and a Page
  // List isn't put under anything.
  function canNest(kind, id, parentId) {
    if (kind === 'item') return !isPageList(itemById(id)) && !isBlock(itemById(id)) && !!itemById(parentId) && !isPageList(itemById(parentId)) && !isBlock(itemById(parentId));
    return id !== 'home' && parentId !== 'home';
  }

  // The ⋮ of a row, with core's items in core's order. Move up and Move down are always
  // listed, and are unavailable at the ends.
  function navMoreHtml(row) {
    const sibs = navSibs(row.kind, row.id);
    const k = sibs.indexOf(row.id);
    const item = (action, text, data, off) => {
      const attrs = Object.entries(data).map(([key, v]) => ` data-${key}="${esc(v)}"`).join('');
      return off
        ? `<button type="button" role="menuitem" aria-disabled="true" data-action="nav-dead" data-what="${esc(off)}">${text}</button>`
        : `<button type="button" role="menuitem" data-action="${action}"${attrs}>${text}</button>`;
    };
    const name = row.kind === 'pagelist' ? 'the Page List' : q(row.title);
    const kind = row.kind === 'page' ? 'page' : 'item';
    let html = item('nav-move', 'Move up', { kind, id: row.id, dir: -1 }, k <= 0 ? 'use Move up on ' + name + ', which is already first' : '') +
      item('nav-move', 'Move down', { kind, id: row.id, dir: 1 }, k >= sibs.length - 1 ? 'use Move down on ' + name + ', which is already last' : '');
    if (row.kind !== 'page') {
      html += item('nav-ask-add', 'Add submenu link', { place: 'sub', ref: row.id },
        row.kind === 'pagelist' ? 'use Add submenu link on the Page List' : row.block ? 'use Add submenu link on ' + name + ', which can’t have a submenu' : row.depth ? 'use Add submenu link on ' + name + ', which is already in a submenu' : '');
      html += item('nav-duplicate', 'Duplicate', { item: row.id });
      html += item('nav-ask-add', 'Add before', { place: 'before', ref: row.id });
      html += item('nav-ask-add', 'Add after', { place: 'after', ref: row.id });
      if (CAN_HIDE && state.menu.mode === 'advanced' && row.kind !== 'pagelist' && !row.block) html += item('nav-hide', row.hidden ? 'Show' : 'Hide', { item: row.id });
      const short = row.title.length > 25 ? row.title.slice(0, 22) + '...' : row.title;
      html += '<hr>' + item('nav-remove', 'Remove ' + esc(short), { item: row.id });
    }
    return `<div class="moremenu" role="menu">${html}</div>`;
  }

  function navOptionsButton(row) {
    const key = navKey(row.id);
    return `<button type="button" class="icon-btn" data-action="more" data-key="${esc(key)}" data-focus="more:${esc(key)}" aria-label="Options for ${esc(row.title)}" aria-expanded="${ui.more === key ? 'true' : 'false'}">${ICON.more}</button>`;
  }

  // The address a link shows: a page's path, or the address that was typed.
  const pagePath = (p) => '/' + slug(p);

  // The Add link popover, under the "Page link" row that marks where the link will go.
  function navPickerHtml() {
    const a = ui.navAdd;
    if (a.create) {
      return `<div class="nav-picker" role="dialog" aria-label="Create page">
        <button type="button" class="link nav-back" data-action="nav-create-back" data-focus="nav-create-back">Back</button>
        <div class="field"><label for="nav-create-title">Title</label><input type="text" id="nav-create-title" placeholder="No title" value="${esc(a.title || '')}" autocomplete="off" data-focus="nav-create-title"></div>
        <button type="button" class="switch nav-publish" aria-pressed="${a.publish !== false}" data-action="nav-create-publish" data-focus="nav-create-publish"><span class="switch-track"></span><span>Publish</span></button>
        <p class="nav-help">Turn off to save as a draft. Drafts won't appear on your site until published.</p>
        <div class="nav-picker-actions"><button type="button" class="btn btn-small" data-action="nav-create-back" data-how="Cancel" data-focus="nav-create-cancel">Cancel</button><button type="button" class="btn btn-small btn-primary" data-action="nav-create" data-focus="nav-create">Create page</button></div>
      </div>`;
    }
    if (a.blocks) {
      // Add block: the blocks a Navigation offers, as core lists them. In a submenu, links only.
      const sub = navAddDepth() > 0;
      const offer = [['page-link', 'Page link', 'page'], ['custom-link', 'Custom Link', 'customLink'], ['buttons', 'Buttons', 'buttons'], ['page-list', 'Page List', 'pageList'], ['search', 'Search', 'search'], ['social', 'Social Icons', 'social']]
        .filter(([b]) => !sub || b === 'page-link' || b === 'custom-link');
      return `<div class="nav-picker" role="dialog" aria-label="Add block">
        <p class="sr-only">Choose a block to add to your Navigation.</p>
        <button type="button" class="link nav-back nav-caps-btn" data-action="nav-blocks-back" data-focus="nav-blocks-back">${ICON.back}<span>Back</span></button>
        <h4 class="nav-caps nav-blocks-head">Blocks</h4>
        <div class="nav-block-grid">${offer.map(([b, title, icon]) => `<button type="button" class="nav-block-btn" data-action="nav-block" data-block="${b}" data-focus="nav-block:${b}">${ICON[icon]}<span>${title}</span></button>`).join('')}</div>
      </div>`;
    }
    // The site's published pages, newest first, as the editor suggests them.
    const pages = state.made.slice().reverse().map(page).filter(published).map((p) =>
      `<li${a.q && !p.title.toLowerCase().includes(a.q.trim().toLowerCase()) ? ' hidden' : ''}><button type="button" data-action="nav-add" data-page="${esc(p.id)}" data-find="${esc(p.title.toLowerCase())}"><span>${esc(p.title)}</span><small>${p.id === 'home' ? 'Front page' : esc(pagePath(p)) + ' · Page'}</small></button></li>`).join('');
    return `<div class="nav-picker" role="dialog" aria-label="Add link">
      <div class="nav-search-wrap"><input type="text" id="nav-search" placeholder="Search or type URL" aria-label="Search or type URL" autocomplete="off" data-focus="nav-search" value="${esc(a.q || '')}">${applyButton('nav-apply', a.q)}</div>
      <ul class="nav-results" aria-label="Suggestions">${pages}</ul>
      ${a.custom ? '' : `<button type="button" class="nav-create-open" data-action="nav-create-open" data-focus="nav-create-open">${ICON.plus}<span>Create page</span></button>`}
      <button type="button" class="nav-blocks-open" data-action="nav-blocks-open" data-focus="nav-blocks-open">${ICON.plus}<span>Add block</span></button>
    </div>`;
  }

  // The ↵ inside a link field, as core's Apply: off until something is typed.
  function applyButton(action, text) {
    return `<button type="button" class="nav-apply" data-action="${action}" data-focus="${action}" aria-label="Apply" aria-disabled="${String(text || '').trim() ? 'false' : 'true'}">${ICON.enter}</button>`;
  }

  function navPlaceholderHtml(depth) {
    return `<li class="row nav-row nav-placeholder" data-row="nav:placeholder" data-depth="${depth}">
      <div class="row-main"><span class="indent" style="width:${depth * 16}px"></span><span class="nav-label">${ui.navAdd && ui.navAdd.custom ? 'Custom Link' : 'Page link'}</span></div>${navPickerHtml()}</li>`;
  }

  // As in core's list view: a row with rows under it has a chevron before its name, and its
  // name says whether they're shown (aria-expanded). The chevron itself is hidden from
  // screen readers; ← and → on the row do the same.
  function expanderHtml(row, x) {
    if (!x.kids) return '<span class="nav-expander nav-expander-gap"></span>';
    return `<span class="nav-expander${x.open ? ' is-open' : ''}" data-action="nav-expand" data-id="${esc(row.id)}" aria-hidden="true">${ICON.expander}</span>`;
  }
  const expandedAttr = (x) => (x.kids ? ` aria-expanded="${x.open}"` : '');

  function navRowHtml(row, x) {
    x = x || { kids: false, open: true, hidden: false };
    const key = navKey(row.id);
    const off = row.kind === 'page' && isExcluded(row.id);
    const hid = x.hidden ? ' hidden' : '';
    if (row.kind === 'plpage') {
      // A page under a Page List: selecting it, or trying to drag it, asks to detach.
      return `<li class="row nav-row nav-inner" data-row="${esc(key)}" data-drag-id="${esc(row.id)}" data-drag-group="${esc(row.group)}" data-depth="${row.depth}" data-locked="${esc(q(row.title) + ' under the Page List')}"${hid}>
        <div class="row-main"><span class="indent" style="width:${row.depth * 16}px"></span>${expanderHtml(row, x)}<button type="button" class="nav-label" data-action="nav-locked" data-page="${esc(row.pageId)}" data-list="${esc(row.list)}" data-focus="nav-row:${esc(row.id)}"${expandedAttr(x)}>${esc(row.title)}</button></div>
      </li>`;
    }
    if (row.kind === 'blockchild') {
      // The Button inside Buttons: selecting it selects the Buttons.
      return `<li class="row nav-row nav-inner" data-row="${esc(key)}" data-drag-id="${esc(row.id)}" data-drag-group="${esc(row.group)}" data-depth="${row.depth}"${hid}>
        <div class="row-main"><span class="indent" style="width:${row.depth * 16}px"></span>${expanderHtml(row, x)}<button type="button" class="nav-label" data-action="nav-select" data-id="${esc(row.parent)}" data-focus="nav-row:${esc(row.id)}">${esc(row.title)}</button></div>
      </li>`;
    }
    const label = row.kind === 'page'
      ? `<span class="nav-label nav-grip" data-action="nav-dead" data-what="select ${esc(q(row.title))} in the Navigation sidebar (a page in a pages menu has nothing to show)">${esc(row.title)}</span>`
      : `<button type="button" class="nav-label nav-grip" data-action="nav-select" data-id="${esc(row.id)}" data-focus="nav-row:${esc(row.id)}"${expandedAttr(x)}>${esc(row.title)}</button>`;
    // A draft's toggle is off and can't be switched until the page is published (it then joins
    // the menu, switched on, as a newly published page does). A click on it is logged.
    const toggle = row.kind !== 'page' ? ''
      : row.draft
        ? `<button type="button" class="switch nav-switch" aria-pressed="false" aria-disabled="true" data-action="nav-toggle-draft" data-page="${esc(row.id)}" data-focus="nav-sw:${esc(row.id)}" aria-label="Show ${esc(row.title)} in the menu" aria-describedby="nav-sw-why-${esc(row.id)}"><span class="switch-track"></span><span class="sr-only" id="nav-sw-why-${esc(row.id)}">Publish this page to add it to the menu</span></button>`
        : `<button type="button" class="switch nav-switch" aria-pressed="${!off}" data-action="nav-toggle" data-page="${esc(row.id)}" data-focus="nav-sw:${esc(row.id)}" aria-label="Show ${esc(row.title)} in the menu"><span class="switch-track"></span></button>`;
    return `<li class="row nav-row${off || row.hidden ? ' dim' : ''}" data-row="${esc(key)}" data-kind="${row.kind === 'page' ? 'page' : 'item'}" data-drag-id="${esc(row.id)}" data-drag-group="${esc(row.group)}" data-depth="${row.depth}"${row.kind === 'pagelist' ? ' data-pagelist="1"' : ''}${hid}>
      <div class="row-main">
        <span class="indent" style="width:${row.depth * 16}px"></span>
        ${expanderHtml(row, x)}
        ${label}
        ${row.draft ? '<span class="badge draft nav-draft">Draft</span>' : ''}
        ${row.hidden ? `<span class="nav-hidden" role="img" aria-label="Hidden">${ICON.unseen}</span>` : ''}
        ${toggle}
        ${navOptionsButton(row)}
      </div>${ui.more === key ? navMoreHtml(row) : ''}</li>`;
  }

  // The list, with the "Page link" row of a link that's being added where it will go.
  function navListHtml(rows) {
    const a = ui.navAdd;
    // Rows under a collapsed row are left in the list, hidden, so a drag still takes them along.
    let shut = -1;
    const html = rows.map((row, i) => {
      if (shut >= 0 && row.depth <= shut) shut = -1;
      const kids = !!rows[i + 1] && rows[i + 1].depth > row.depth;
      const open = !(kids && ui.collapsed[row.id]);
      const x = { kids, open, hidden: shut >= 0 };
      if (shut < 0 && !open) shut = row.depth;
      return navRowHtml(row, x);
    });
    if (a) {
      let at = rows.length;
      let depth = 0;
      const i = rows.findIndex((r) => r.id === a.ref);
      if (i >= 0) {
        const ref = rows[i];
        let end = i + 1;
        while (end < rows.length && rows[end].depth > ref.depth) end++;
        if (a.place === 'before') { at = i; depth = ref.depth; }
        else if (a.place === 'after') { at = end; depth = ref.depth; }
        else if (a.place === 'sub') { at = end; depth = ref.depth + 1; }
      }
      html.splice(at, 0, navPlaceholderHtml(depth));
    }
    return html.length
      ? `<ul class="list nav-list" aria-label="Navigation items">${html.join('')}</ul>`
      : '<p class="nav-empty">This Navigation Menu is empty.</p>';
  }

  const AUTO_ADD_LABEL = STARTS_AS_LINKS ? 'Auto add pages' : 'Add new pages automatically';

  // A selected item's settings, in place of the list, with a way back to it.
  function navInspectorHtml(it) {
    if (isPageList(it)) {
      return `<p class="nav-desc">Display a list of all pages.</p>
        <h3 class="nav-heading">Settings</h3>
        <button type="button" class="btn nav-wide nav-outline" data-action="nav-ask-detach" data-item="${esc(it.id)}" data-focus="nav-ask-detach">Detach Page List</button>`;
    }
    if (isBlock(it)) {
      const b = BLOCKS[it.block];
      return `<p class="nav-desc">${esc(b.desc)}</p><h3 class="nav-heading">Settings</h3><p class="nav-help">This prototype has no settings for ${esc(b.title)}.</p>`;
    }
    const p = page(it.pageId);
    const linkTo = it.url
      ? `<strong>${esc(it.url)}</strong><span>${esc(it.url)}</span><span class="nav-badges"><span class="nav-badge">External link</span></span>`
      : `<strong>${esc(p.title)}</strong><span>${esc(pagePath(p))}</span><span class="nav-badges"><span class="nav-badge">Page</span><span class="nav-badge">${p.status === 'publish' ? 'Published' : 'Draft'}</span></span>`;
    return `<h3 class="nav-heading">Settings</h3>
      <div class="field"><label class="nav-caps" for="nav-text">Text</label><input type="text" id="nav-text" value="${esc(it.label)}" autocomplete="off" data-item="${esc(it.id)}" data-focus="nav-text:${esc(it.id)}"></div>
      <div class="field"><span class="nav-caps" id="nav-linkto-caps">Link to</span>${ui.linkEdit && ui.linkEdit.id === it.id
        ? `<div class="nav-search-wrap"><input type="text" id="nav-linkto-input" aria-labelledby="nav-linkto-caps" placeholder="Search or type URL" value="${esc(ui.linkEdit.text)}" autocomplete="off" data-focus="nav-linkto-input">${applyButton('nav-linkto-apply', ui.linkEdit.text)}</div>`
        : `<button type="button" class="nav-linkto" data-action="nav-linkto" data-item="${esc(it.id)}" data-focus="nav-linkto" aria-labelledby="nav-linkto-caps nav-linkto-what"><span id="nav-linkto-what" class="nav-linkto-text">${linkTo}</span></button>`}${p && !it.url && p.status !== 'publish' ? '<p class="nav-help nav-draft-note">This link is to a draft page and will not appear on your site until the page is published.</p>' : ''}</div>`;
  }

  // screen: drawn on the site editor's Navigation screen, with that screen's description.
  function sidebarBodyHtml(screen) {
    const m = state.menu;
    const sel = ui.navSel ? itemById(ui.navSel) : null;
    if (sel) return navInspectorHtml(sel);
    const intro = screen
      ? '<p class="nav-desc">Navigation Menus are a curated collection of blocks that allow visitors to get around your site.</p>'
      : '<p class="nav-desc">A collection of blocks that allow visitors to get around your site.</p>';
    const list = navListHtml(navRows());
    if (isAutomatic()) {
      return `${intro}${list}<button type="button" class="btn nav-wide" data-action="nav-ask-advanced" data-focus="nav-ask-advanced">Switch to advanced menu</button>`;
    }
    const adding = !!ui.navAdd && ui.navAdd.place === 'end';
    return `${intro}${list}
      <button type="button" class="nav-append" data-action="nav-ask-add" data-place="end" data-focus="nav-append" aria-label="Add page" aria-expanded="${adding ? 'true' : 'false'}">${ICON.plus}</button>
      ${m.mode === 'advanced' ? `<button type="button" class="switch nav-auto" aria-pressed="${m.autoAdd}" data-action="nav-autoadd" data-focus="nav-autoadd"><span class="switch-track"></span><span>${AUTO_ADD_LABEL}</span></button>` : ''}`;
  }

  // The save panel takes the sidebar's place while it's open, as in the editor.
  function savePanelHtml() {
    const list = saveEntities();
    const n = list.length;
    const groups = ['Navigation Menus', 'Pages'].map((g) => {
      const boxes = list.filter((e) => e.group === g).map((e) =>
        `<label class="savepanel-item"><input type="checkbox" data-entity="${esc(e.key)}"${ui.savePanel.off.includes(e.key) ? '' : ' checked'}> ${esc(e.name)}</label>`).join('');
      return boxes ? `<div class="savepanel-group"><h3>${g}</h3>${boxes}</div>` : '';
    }).join('');
    return `<aside class="navside savepanel" role="region" aria-label="Save panel">
      <div class="savepanel-actions"><button type="button" class="btn nav-outline" data-action="save-cancel" data-focus="save-cancel">Cancel</button><button type="button" class="btn btn-primary" data-action="save-confirm" data-focus="save-confirm">Save</button></div>
      <div class="navside-body">
        <div class="savepanel-prompt"><strong>Are you ready to save?</strong><p>${n === 1 ? 'There is <strong>1 site change</strong> waiting to be saved.' : 'There are <strong>' + n + ' site changes</strong> waiting to be saved.'}</p></div>
        ${groups}
      </div>
    </aside>`;
  }

  // Undo, trash or detaching can take the selected row, or the row a link was going beside, away.
  function tidyNav() {
    if (ui.navSel && !itemById(ui.navSel)) ui.navSel = null;
    if (ui.navAdd && (isAutomatic() || (ui.navAdd.ref && !itemById(ui.navAdd.ref)))) dropAdd('what it was beside has gone');
  }

  function sidebarHtml() {
    if (!IN_SIDEBAR) return '';
    if (ui.savePanel && !saveEntities().length) { ui.savePanel = null; log('save', 'Save panel closed: nothing is left to save'); }
    if (ui.savePanel) return savePanelHtml();
    if (!ui.sidebar) return '';
    tidyNav();
    const sel = ui.navSel ? itemById(ui.navSel) : null;
    const head = sel
      ? `<button type="button" class="icon-btn nav-back-btn" data-action="nav-back" data-focus="nav-back" aria-label="Go to &quot;Navigation&quot; block">${ICON.back}</button><h2>${navSelName(sel)}</h2>`
      : '<h2>Navigation</h2>';
    return `<aside class="navside" aria-label="Navigation">
      <div class="navside-head${sel ? ' has-back' : ''}">${head}<button type="button" class="icon-btn" data-action="close-sidebar" data-focus="close-sidebar" aria-label="Close Navigation">${ICON.close}</button></div>
      <div class="navside-body">${sidebarBodyHtml()}</div>
    </aside>`;
  }

  // One move among a row's own level, by Move up / Move down.
  function navStep(kind, id, dir) {
    const sibs = navSibs(kind, id);
    const k = sibs.indexOf(id) + dir;
    if (k < 0 || k >= sibs.length) return false;
    const title = navTitle(kind, id);
    const from = navPlace(kind, id);
    edit(() => { moveEntry(kind, id, sibs[k], dir > 0); ui.focus = 'more:' + navKey(id); }, q(title) + ' moved ' + (dir < 0 ? 'up' : 'down'), kind === 'page' ? id : null);
    countReorder('move');
    log('order', 'Reordered by Move up/down in the sidebar: ' + q(title) + ' from ' + from + ' to ' + navPlace(kind, id) + (kind === 'item' ? ' among the menu’s items' : ' in page order'));
    return true;
  }

  // A drop in the sidebar. t: { depth, parent: the row it goes under or '', before: the row
  // it goes in front of or null, prev: the row above the gap or null }. A page's place is
  // its place in page order and its parent page; a link's is its place among the links.
  function navDrop(kind, id, t) {
    const title = navTitle(kind, id);
    const from = navPlace(kind, id);
    const rows = navRows();
    const row = rows.find((r) => r.id === id);
    const levelChanged = row.group !== t.parent;
    edit(() => {
      if (kind === 'page') {
        const p = page(id);
        p.parent = t.parent || null;
        if (t.before) moveEntry('page', id, t.before, false);
        else if (t.prev && t.prev !== t.parent) {
          // Last at its level: after the row above the gap, or after that row's parent.
          const prev = rows.find((r) => r.id === t.prev);
          moveEntry('page', id, t.depth === 0 && prev.group ? prev.group : t.prev, true);
        }
      } else {
        const items = state.menu.items;
        const at = items.findIndex((it) => it.id === id);
        const block = items.splice(at, itemBlockEnd(at) - at);
        if (block.length === 1 && !isPageList(block[0])) block[0].depth = t.depth;
        let to = items.length;
        if (t.before && itemById(t.before)) to = items.findIndex((it) => it.id === t.before);
        else if (t.depth === 1) to = items.findIndex((it) => it.id === t.prev) + 1;
        items.splice(to, 0, ...block);
      }
      ui.focus = 'nav-row:' + id;
    }, q(title) + (!levelChanged ? ' moved' : t.parent ? ' moved under ' + q(navTitle(kind, t.parent)) : ' moved to the top level'), kind === 'page' ? id : null);
    countReorder('drag');
    log('order', 'Reordered by drag in the sidebar: ' + q(title) + ' from ' + from + ' to ' + navPlace(kind, id) + (kind === 'item' ? ' among the menu’s items' : ' in page order' + (levelChanged ? '; its parent page changed, and so its address' : '')));
  }

  // A link's Text changes the menu as it's typed, and one Undo takes back the whole of it:
  // the first keystroke makes a step in the history, and the rest of the typing amends it.
  function typeLabel(itemId, text) {
    const it = itemById(itemId);
    if (!it) return;
    const h = state.hist;
    const sig = menuSignature();
    if (!ui.typing || ui.typing.item !== itemId || ui.typing.at !== h.at) {
      const from = it.label;
      it.label = text;
      h.stack.length = h.at + 1;
      h.stack.push(snapshot('the Text of ' + q(from) + ' changed'));
      h.at = h.stack.length - 1;
      h.dirty = Math.abs(h.dirty) + 1;
      ui.typing = { item: itemId, from, at: h.at };
      undo = null;
      hideToast();
    } else {
      it.label = text;
      h.stack[h.at] = snapshot(h.stack[h.at].what);
    }
    if (!stats.firstMenuChange && menuSignature() !== sig) stats.firstMenuChange = Math.max(1, seconds());
    checkTasks();
    save();
    // Only the site's menu and the top bar are redrawn, so the field keeps the keyboard.
    const nav = root.querySelector('.site-nav > ul');
    if (nav) nav.innerHTML = siteNavHtml();
    syncTopbar();
    renderNotes();
  }

  // The field has been left (or Enter pressed): say what the typing came to.
  function endTyping(how) {
    const t = ui.typing;
    ui.typing = null;
    if (!t) return;
    const it = itemById(t.item);
    const h = state.hist;
    if (!it || h.at !== t.at) return;
    const text = it.label.trim();
    if (!text || text === t.from) {
      // Nothing came of it: the step is taken out of the history again.
      it.label = t.from;
      h.stack.pop();
      h.at = h.stack.length - 1;
      h.dirty = h.dirty > 0 ? h.dirty - 1 : h.dirty;
      if (!text) log('menu', 'Emptied the Text of ' + q(t.from) + ': put back, since a link needs some text');
      checkTasks();
      save();
      render();
      return;
    }
    it.label = text;
    h.stack[h.at] = snapshot('the Text of ' + q(t.from) + ' changed to ' + q(text));
    checkTasks();
    save();
    log('menu', 'Renamed a link’s label: ' + q(t.from) + ' to ' + q(text) + ' (Text, in the sidebar' + (it.pageId && page(it.pageId) ? '; the page is still called ' + q(page(it.pageId).title) : '') + ')' + (how ? '; ' + how : ''));
  }

  // Where a new link goes: at the end, before or after an item, or in a link's submenu.
  function insertItem(item, place, refId) {
    const m = state.menu;
    const i = refId ? m.items.findIndex((it) => it.id === refId) : -1;
    if (i < 0 || place === 'end') { item.depth = 0; m.items.push(item); }
    else if (place === 'before') { item.depth = m.items[i].depth; m.items.splice(i, 0, item); }
    else if (place === 'after') { item.depth = m.items[i].depth; m.items.splice(m.items[i].depth === 0 ? itemBlockEnd(i) : i + 1, 0, item); }
    else { item.depth = 1; m.items.splice(itemBlockEnd(i), 0, item); }
    state.fresh = state.fresh.filter((x) => x !== item.pageId);
    return item;
  }

  // The level the "Page link" row stands at: 0 at the top level, 1 in a submenu.
  function navAddDepth() {
    const a = ui.navAdd;
    const ref = a && a.ref ? itemById(a.ref) : null;
    if (!ref || a.place === 'end') return 0;
    return a.place === 'sub' ? 1 : ref.depth;
  }

  const placeWords = (a) => {
    const ref = a.ref ? itemById(a.ref) : null;
    if (!ref || a.place === 'end') return 'at the end of the menu';
    const name = isPageList(ref) ? 'the Page List' : q(ref.label);
    return a.place === 'sub' ? 'in the submenu of ' + name : a.place + ' ' + name;
  };

  // A typed address: something with a scheme, or that starts like a path, or has a dot in it.
  function asAddress(text) {
    if (!text || /\s/.test(text)) return null;
    if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(text)) return text;
    if (/^www\.|^[^.\s]+\.[^.\s]/.test(text)) return 'https://' + text;
    return null;
  }

  // Collapsing and expanding a row of the sidebar's list. Not a change to the menu: not saved,
  // not in Undo, and forgotten when the list is shown afresh, as core forgets it.
  function toggleCollapsed(id, how, want) {
    const row = navRows().find((r) => r.id === id);
    if (!row) return;
    const shut = want != null ? !want : !ui.collapsed[id];
    if (!!ui.collapsed[id] === shut) return;
    if (shut) ui.collapsed[id] = true; else delete ui.collapsed[id];
    ui.focus = ui.focus && ui.focus.indexOf('nav-row:') === 0 ? 'nav-row:' + id : ui.focus;
    log('sidebar', (shut ? 'Collapsed ' : 'Expanded ') + (row.kind === 'pagelist' ? 'the Page List' : q(row.title)) + ' in the Navigation’s list (' + how + '): the rows under it are ' + (shut ? 'hidden' : 'shown'));
    render();
  }

  // Link to's field: Enter or Apply changes where the link goes; Escape leaves it as it was.
  function applyLinkTo(how) {
    const e = ui.linkEdit;
    const it = e && itemById(e.id);
    if (!it) { ui.linkEdit = null; return; }
    const text = (e.text || '').trim();
    const was = it.url || pagePath(page(it.pageId));
    if (text === was) { closeLinkTo(how + ', unchanged'); return; }
    const url = asAddress(text);
    if (!url) {
      log('tried', how + ' in Link to with ' + (text ? q(text) + ', which isn’t an address' : 'nothing typed') + ': the link isn’t changed');
      return;
    }
    edit(() => {
      const live = itemById(e.id);
      live.url = url;
      delete live.pageId;
      ui.linkEdit = null;
      ui.focus = 'nav-linkto';
    }, q(it.label) + ' now links to ' + q(url));
    log('menu', 'Link to changed (' + how + '): ' + q(it.label) + ' now goes to ' + q(text) + ' (' + url + '), not ' + q(was) + '; its text is unchanged');
  }
  function closeLinkTo(how) {
    if (!ui.linkEdit) return false;
    ui.linkEdit = null;
    ui.focus = 'nav-linkto';
    log('sidebar', 'Link to closed without a change (' + how + ')');
    render();
    return true;
  }

  // A typed address's label, as core makes it: the address without http:// or https://.
  const linkLabel = (text) => text.replace(/^https?:\/\//i, '');

  // Enter in Search or type URL, or its Apply (↵): a typed address becomes a link.
  function applyTyped(how) {
    if (!ui.navAdd) return;
    const text = (ui.navAdd.q || '').trim();
    if (asAddress(text)) { navActions['nav-add-url']({ text }); return; }
    log('tried', how + ' in Search or type URL with ' + (text ? q(text) + ', which isn’t an address' : 'nothing typed') + ': nothing is added');
  }

  // An Add link that ends without a link: always logged, however it ended, with what was typed.
  function dropAdd(how) {
    if (!ui.navAdd) return false;
    const typed = (ui.navAdd.q || '').trim();
    ui.navAdd = null;
    log('sidebar', 'Add link closed without adding anything (' + how + (typed ? ', with ' + q(typed) + ' typed in Search or type URL' : '') + '): the “Page link” row goes');
    return true;
  }

  function closeAdd(how) {
    const a = ui.navAdd;
    if (!a) return;
    dropAdd(how);
    ui.focus = a.place === 'end' || !a.ref ? 'nav-append' : 'more:' + navKey(a.ref);
    render();
  }

  // The Page List (and its pages) becomes links, where it was, at the same levels.
  function detachPageList(itemId) {
    const m = state.menu;
    const i = m.items.findIndex((it) => it.id === itemId);
    if (i < 0) return;
    const links = pageTreeRows().filter((r) => published(r.p)).map((r) => ({
      id: newItemId('link-'), pageId: r.p.id, label: r.p.title, depth: r.depth && published(page(r.p.parent)) ? 1 : 0, hidden: false
    }));
    m.items.splice(i, 1, ...links);
    if (m.convertedAt == null) m.convertedAt = Math.max(1, seconds());
  }

  const navActions = {
    'nav-select'(d) {
      const it = itemById(d.id);
      if (!it) return;
      // The click that ends a drag isn't a selection.
      if (justDragged) return;
      dropAdd('another row was selected');
      ui.linkEdit = null;
      ui.collapsed = {};
      ui.navSel = d.id;
      ui.more = null;
      ui.focus = isPageList(it) ? 'nav-ask-detach' : 'nav-back';
      log('sidebar', isPageList(it) ? 'Selected the Page List row: its settings take the list’s place, with Detach Page List' : 'Selected the link ' + q(it.label) + ': its settings take the list’s place, with Text and Link to');
      render();
    },
    'nav-back'() {
      endTyping();
      ui.linkEdit = null;
      const id = ui.navSel;
      ui.navSel = null;
      ui.focus = 'nav-row:' + id;
      log('sidebar', 'Went back to the Navigation’s list');
      render();
    },
    // A page under a Page List: selecting it asks to detach the Page List, as core does.
    'nav-locked'(d) {
      const p = page(d.page);
      if (!p) return;
      // The click that ends a drag: the drag has already been dealt with.
      if (lockedDragged) return;
      log('tried', 'Tried to select ' + q(p.title) + ' under the Page List, which can’t be edited: the Detach Page List dialog opens instead');
      askConvert({ trigger: 'selected ' + q(p.title) + ' under the Page List', itemId: d.list });
    },
    'nav-dead'(d) { if (!justDragged) log('tried', 'Tried to ' + d.what); },
    'nav-ask-detach'(d) { askConvert({ trigger: 'the Detach Page List button', itemId: d.item }); },
    'nav-ask-advanced'() { askConvert({ trigger: 'the Switch to advanced menu button' }); },
    'nav-toggle-draft'(d) {
      const p = page(d.page);
      if (p) log('tried', 'Tried the toggle of ' + q(p.title) + ', a draft, in the pages menu: it can’t be switched until the page is published');
    },
    'nav-toggle'(d) {
      const p = page(d.page);
      const on = !isExcluded(d.page);
      const was = onCanvas(d.page);
      const draft = p.status !== 'publish';
      edit(() => { setExcluded(d.page, on); ui.focus = 'nav-sw:' + d.page; }, q(p.title) + ' switched ' + (on ? 'off' : 'on'));
      log('menu', (on ? 'Took ' + q(p.title) + ' out of the menu' : 'Put ' + q(p.title) + ' in the menu') + ' (toggle, in the sidebar)' +
        (draft ? ', a draft: ' + (on ? 'it will stay out of the menu when it’s published' : 'it will be in the menu once it’s published') + ', once this is saved' : '') +
        (onCanvas(d.page) === was ? '; the header didn’t change, because its parent page is off' : ''));
    },
    'nav-move'(d) { navStep(d.kind, d.id, Number(d.dir)); },
    // + below the list, Add before, Add after, Add submenu link: a "Page link" row where the
    // link will go, with Search or type URL under it.
    'nav-ask-add'(d) {
      const place = d.place || 'end';
      const ref = d.ref || null;
      if (ui.navAdd && ui.navAdd.place === place && (ui.navAdd.ref || null) === ref) { closeAdd('the same control again'); return; }
      dropAdd('another Add was chosen');
      ui.navAdd = { place, ref, create: false, title: '', publish: true };
      if (place === 'sub' && ref) delete ui.collapsed[ref];
      ui.more = null; ui.navSel = null;
      ui.focus = 'nav-search';
      log('sidebar', (place === 'end' ? 'Add link (+) clicked' : { before: 'Add before', after: 'Add after', sub: 'Add submenu link' }[place] + ' chosen') + ': a “Page link” row is shown ' + placeWords(ui.navAdd) + ', with Search or type URL');
      render();
      const picker = root.querySelector('.nav-picker');
      if (picker) picker.scrollIntoView({ block: 'nearest' });
    },
    'nav-add'(d) {
      const a = ui.navAdd;
      const p = page(d.page);
      if (!a || !p) return;
      const where = placeWords(a);
      edit(() => {
        insertItem({ id: newItemId('link-'), pageId: p.id, label: p.title, hidden: false }, a.place, a.ref);
        ui.navAdd = null;
        ui.focus = 'nav-append';
      }, 'a link to ' + q(p.title) + ' added');
      log('menu', 'Link added: ' + q(p.title) + ', ' + where + ' (picked from the suggestions in the sidebar)');
    },
    'nav-add-url'(d) {
      const a = ui.navAdd;
      const url = asAddress(d.text);
      if (!a || !url) return;
      const where = placeWords(a);
      edit(() => {
        insertItem({ id: newItemId('link-'), url, label: linkLabel(d.text), hidden: false }, a.place, a.ref);
        ui.navAdd = null;
        ui.focus = 'nav-append';
      }, 'a link to ' + q(url) + ' added');
      log('menu', 'Link added to a typed address: ' + q(d.text) + ' (' + url + '), ' + where);
    },
    // Add block, in Add link: the blocks a Navigation offers.
    'nav-blocks-open'() {
      if (!ui.navAdd) return;
      const field = document.getElementById('nav-search');
      if (field) ui.navAdd.q = field.value;
      ui.navAdd.blocks = true;
      ui.focus = 'nav-blocks-back';
      log('sidebar', 'Add block chosen in Add link: the blocks the menu can hold are shown');
      render();
    },
    'nav-blocks-back'() {
      if (!ui.navAdd) return;
      ui.navAdd.blocks = false;
      ui.focus = 'nav-blocks-open';
      log('sidebar', 'Add block: went back to Search or type URL (Back)');
      render();
    },
    'nav-block'(d) {
      const a = ui.navAdd;
      if (!a) return;
      const where = placeWords(a);
      if (d.block === 'page-link' || d.block === 'custom-link') {
        // Both go back to Search or type URL; Custom Link's has no Create page, as in core.
        a.blocks = false;
        a.custom = d.block === 'custom-link';
        a.q = '';
        ui.focus = 'nav-search';
        log('sidebar', 'Add block: ' + (a.custom ? 'Custom Link' : 'Page link') + ' chosen; the row reads ' + q(a.custom ? 'Custom Link' : 'Page link') + ', with Search or type URL');
        render();
        return;
      }
      if (d.block === 'page-list') {
        edit(() => {
          insertItem({ id: newItemId('page-list-'), type: 'pagelist', depth: 0 }, a.place, a.ref);
          ui.navAdd = null;
          ui.focus = 'nav-append';
        }, 'a Page List added');
        log('menu', 'Block added with Add block: a Page List, ' + where + '; it shows every published page');
        return;
      }
      const b = BLOCKS[d.block];
      if (!b) return;
      edit(() => {
        insertItem({ id: newItemId('block-'), type: 'block', block: d.block, label: b.title, hidden: false }, a.place, a.ref);
        ui.navAdd = null;
        ui.focus = 'nav-append';
      }, 'a ' + b.title + ' block added');
      log('menu', 'Block added with Add block: ' + q(b.title) + ', ' + where);
    },
    // A row's chevron: shows or hides the rows under it. Nothing is selected.
    'nav-expand'(d) { toggleCollapsed(d.id, 'chevron'); },
    'nav-apply'(d, el) {
      if (!ui.navAdd) return;
      const field = document.getElementById('nav-search');
      if (field) ui.navAdd.q = field.value;
      if (!(ui.navAdd.q || '').trim()) { log('tried', 'Clicked Apply (↵) in Search or type URL with nothing typed: it is off until something is typed'); return; }
      applyTyped('Clicked Apply (↵)');
    },
    // Link to, in a link's settings: a button that opens a field for its address.
    'nav-linkto'(d) {
      const it = itemById(d.item);
      if (!it) return;
      endTyping();
      const now = it.url || pagePath(page(it.pageId));
      ui.linkEdit = { id: it.id, text: now };
      ui.focus = 'nav-linkto-input';
      log('sidebar', 'Link to clicked for ' + q(it.label) + ': a field with its address (' + now + ') opens');
      render();
    },
    'nav-linkto-apply'() { applyLinkTo('Clicked Apply (↵)'); },
    'nav-create-open'() {
      if (!ui.navAdd) return;
      const typed = (document.getElementById('nav-search') || {}).value || '';
      ui.navAdd.create = true;
      if (!ui.navAdd.title && typed && !asAddress(typed.trim())) ui.navAdd.title = typed.trim();
      // The keyboard goes to Back first, as in WordPress.
      ui.focus = 'nav-create-back';
      log('sidebar', 'Create page chosen in Add link');
      render();
    },
    'nav-create-back'(d) {
      if (!ui.navAdd) return;
      ui.navAdd.create = false;
      ui.focus = 'nav-search';
      log('sidebar', 'Create page: went back to Search or type URL (' + (d.how || 'Back') + ')');
      render();
    },
    'nav-create-publish'() {
      if (!ui.navAdd) return;
      ui.navAdd.publish = ui.navAdd.publish === false;
      ui.focus = 'nav-create-publish';
      render();
    },
    // Create page makes the page at once, as the Pages panel's Add page does, and a link to it
    // that is unsaved like any other change to the menu.
    'nav-create'() {
      const a = ui.navAdd;
      if (!a) return;
      const field = document.getElementById('nav-create-title');
      const title = (field ? field.value : a.title || '').trim();
      if (!title) { if (field) { field.focus(); field.setAttribute('aria-invalid', 'true'); } return; }
      const status = a.publish === false ? 'draft' : 'publish';
      const where = placeWords(a);
      // A menu whose saved setting adds new pages (A's Auto add pages, Q's advanced menu) adds
      // this one as it adds any page that's published, wherever it was made: one link, at the
      // end, in the saved menu too. Nothing is left to save.
      const sm = state.saved.menu;
      if (status === 'publish' && sm.mode === 'advanced' && sm.autoAdd) {
        const sig = menuSignature();
        endTyping();
        ui.navAdd = null;
        const id = createPage(title, status);
        ui.flash = keyRow(id);
        ui.focus = 'nav-append';
        if (!stats.firstMenuChange && menuSignature() !== sig) stats.firstMenuChange = Math.max(1, seconds());
        checkTasks();
        save();
        render();
        log('page', 'Added ' + q(title) + ' with Create page in the sidebar’s Add link, ' + (status === 'draft' ? 'saved as a draft' : 'published'));
        log('menu', 'The saved menu’s “' + AUTO_ADD_LABEL + '” added a link to it at the end of the menu, as for any ' + (status === 'draft' ? 'new page, drafts included (shown as a draft until it’s published)' : 'page that’s published') + (a.place === 'end' ? '' : ' (not ' + where + ')') + '; there is nothing to save');
        return;
      }
      // The page: applied everywhere at once. Its own link is the one being added, so the
      // menu's auto-add doesn't add another.
      const id = createPage(title, status, true);
      ui.flash = keyRow(id);
      edit(() => {
        insertItem({ id: newItemId('link-'), pageId: id, label: title, hidden: false }, a.place, a.ref);
        ui.navAdd = null;
        ui.focus = 'nav-append';
      }, 'a link to the new page ' + q(title) + ' added');
      log('page', 'Added ' + q(title) + ' with Create page in the sidebar’s Add link, ' + (status === 'draft' ? 'saved as a draft' : 'published'));
      log('menu', 'Link added: ' + q(title) + ', ' + where + ' (to the page just created)');
    },
    'nav-duplicate'(d) {
      const it = itemById(d.item);
      if (!it) return;
      let copyId;
      edit(() => {
        const items = state.menu.items;
        const i = items.indexOf(it);
        const end = itemBlockEnd(i);
        const copies = items.slice(i, end).map((x) => Object.assign({}, x, { id: newItemId(isPageList(x) ? 'page-list-' : 'link-') }));
        copyId = copies[0].id;
        items.splice(end, 0, ...copies);
        // The copy is selected, as in the editor.
        ui.navSel = copyId;
        ui.focus = 'nav-back';
      }, isPageList(it) ? 'the Page List duplicated' : q(it.label) + ' duplicated');
      log('menu', (isPageList(it) ? 'Page List duplicated' : 'Link duplicated: ' + q(it.label)) + ' (Duplicate, in the sidebar); the copy is selected');
    },
    'nav-remove'(d) {
      const it = itemById(d.item);
      if (!it) return;
      const label = itemTitle(it);
      // The keyboard goes to the row that takes its place, or the one above, or the + button.
      const rows = navRows().filter((r) => r.kind !== 'plpage');
      const at = rows.findIndex((r) => r.id === d.item);
      const near = rows[at + 1] || rows[at - 1];
      edit(() => {
        removeLink(d.item);
        ui.focus = near ? 'nav-row:' + near.id : 'nav-append';
      }, isPageList(it) ? 'the Page List removed' : q(label) + ' removed');
      log('menu', isPageList(it) ? 'Page List removed from the menu without detaching (Remove Page List, in the sidebar): its pages are no longer in the menu' + (state.menu.items.length ? '' : ', which is now empty')
        : 'Link removed: ' + q(label) + ' (Remove, in the sidebar)' + (it.pageId ? '; its page is still published' : ''));
    },
    'nav-hide'(d) {
      const it = itemById(d.item);
      const hide = !it.hidden;
      edit(() => { setLinkHidden(d.item, hide); ui.focus = 'more:' + navKey(d.item); }, q(it.label) + (hide ? ' hidden' : ' shown'));
      log('menu', (hide ? 'Link hidden: ' : 'Link shown again: ') + q(it.label) + ' (' + (hide ? 'Hide' : 'Show') + ', in the sidebar)');
    },
    'nav-autoadd'() {
      const on = !state.menu.autoAdd;
      edit(() => { setAutoAdd(on); ui.focus = 'nav-autoadd'; }, '“' + AUTO_ADD_LABEL + '” switched ' + (on ? 'on' : 'off'));
      log('menu', STARTS_AS_LINKS ? 'Auto add pages switched ' + (on ? 'on' : 'off') : '“Add new pages automatically” turned ' + (on ? 'on' : 'off'));
    },

    // The editor's top bar and save panel.
    'ed-undo'() { endTyping(); editorUndo('top bar'); },
    'ed-redo'() { endTyping(); editorRedo('top bar'); },
    'ed-save'() { endTyping(); openSavePanel('top bar'); },
    'save-cancel'() { closeSavePanel('Cancel'); },
    'save-confirm'() { saveNow(); }
  };

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
    if (ARM === 'menu-switches' && !detachesList(d)) {
      return {
        title: 'Switch to advanced menu',
        body: '<p>The pages will become links you can edit. New pages will still be added automatically.</p>',
        confirm: 'Switch'
      };
    }
    // WordPress's own words: the Page List block's Detach dialog in @wordpress/block-library
    // 12.1.0 (src/page-list/edit.jsx). The README has the wording WordPress 7.0 ships with.
    return {
      title: 'Detach Page List',
      body: '<p>This Navigation Menu displays your website\'s pages. Detaching will enable you to add, delete, or reorder pages. However, new pages will no longer be added automatically.</p>',
      confirm: 'Detach'
    };
  }

  // A Page List added with Add block in A or Q's advanced menu is detached as the control's is.
  const detachesList = (d) => !!d && !!d.itemId && isPageList(itemById(d.itemId));
  const dialogName = (d) => (ARM === 'control' || detachesList(d) ? 'Detach Page List (convert to links)' : ARM === 'menu-switches' ? 'Switch to advanced menu' : 'Convert to links');

  // Show the confirm. d: { trigger: what the person did, pageId?: the page it was about,
  // then?: 'remove' | 'rename', what to do with that page once the menu is links }.
  function askConvert(d) {
    stats.dialogsShown++;
    openDialog(Object.assign({ type: 'convert' }, d));
  }

  // ---------- Dialogs ----------

  // What a dialog is called in the log.
  function dialogLabel(d) {
    return d.type === 'convert' ? dialogName(d) : { add: 'Add page', rename: 'Rename', trash: 'Move to trash', label: 'Rename in menu', order: 'Order' }[d.type];
  }

  // The page or link a dialog is about. Undo, or anything else, may have taken it away.
  function dialogSubject(d) {
    if (d.type === 'label') { const it = itemById(d.itemId); return it && page(it.pageId) ? it : null; }
    if (d.type === 'rename' || d.type === 'trash' || d.pageId) return page(d.pageId) || null;
    if (d.type === 'convert' && d.itemId) return isPageList(itemById(d.itemId)) ? true : null;
    return true;
  }

  // Every dialog opens here: it notes where the keyboard was (so a cancelled dialog hands
  // focus back), and logs the opening.
  function openDialog(d, note) {
    const active = document.activeElement;
    let from = null;
    if (active && active.closest) {
      if (active.closest('.moremenu') && ui.more) from = 'more:' + ui.more;
      else if (active.closest('.pop') && ui.pop) from = 'pop:' + ui.pop;
      else if (active.dataset) from = active.dataset.focus || null;
    }
    ui.dialog = Object.assign({ from }, d);
    ui.pop = null; ui.more = null;
    const subject = dialogSubject(ui.dialog);
    if (!subject) { ui.dialog = null; render(); return; }
    const about = [];
    if (d.type === 'convert') about.push(d.trigger);
    if (d.type === 'label') about.push(q(subject.label));
    else if (subject !== true) about.push(q(subject.title));
    if (note) about.push(note);
    log('dialog', dialogLabel(d) + ' dialog shown' + (about.length ? ' (' + about.join(', ') + ')' : ''));
    render();
  }

  // The dialog's page or link has gone: close it without a fuss.
  function dropDialog() {
    const d = ui.dialog;
    if (!d) return;
    ui.dialog = null;
    log('dialog', dialogLabel(d) + ' dialog closed: what it was about is no longer there');
    render();
  }

  // The convert dialog of the sidebar arms (the control's Detach Page List, Q's Switch to
  // advanced menu) behaves as WordPress's ConfirmDialog.
  const isConfirm = (d) => !!d && d.type === 'convert' && IN_SIDEBAR;

  function dialogHtml() {
    const d = ui.dialog;
    if (!d) return '';
    if (!dialogSubject(d)) { ui.dialog = null; return ''; }
    let body = '';
    if (d.type === 'add' && IN_SIDEBAR) {
      // Core's Add Page on the Pages screen: a draft, which then opens.
      body = `<h2 id="dlg-title">Draft new: Page</h2>
        <div class="field"><label for="dlg-name">Title</label><input type="text" id="dlg-name" value="${esc(d.name || '')}" placeholder="No title" autocomplete="off"></div>
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('create', 'Create draft', { status: 'draft' }, 'btn-primary')}</div>`;
    } else if (d.type === 'add') {
      body = `<h2 id="dlg-title">New page</h2>
        <div class="field"><label for="dlg-name">Title</label><input type="text" id="dlg-name" value="${esc(d.name || '')}" autocomplete="off"></div>
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('create', 'Save as draft', { status: 'draft' })}${btn('create', 'Publish', { status: 'publish' }, 'btn-primary')}</div>`;
    }
    if (d.type === 'order') {
      // WordPress's Order… dialog, from the Pages screen: the page's menu_order, saved at once.
      const p = page(d.pageId);
      body = `<button type="button" class="icon-btn dialog-x" data-action="close-dialog" data-how="the close button" data-focus="dialog-x" aria-label="Close">${ICON.close}</button><h2 id="dlg-title">Order</h2>
        <p>Determines the order of pages. Pages with the same order value are sorted alphabetically. Negative order values are supported.</p>
        <div class="field"><label class="nav-caps" for="dlg-order">Order</label><input type="number" id="dlg-order" value="${orderOf(p)}" autocomplete="off"></div>
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('order', 'Save', { page: p.id }, 'btn-primary')}</div>`;
    }
    if (d.type === 'rename') {
      const p = page(d.pageId);
      body = `<h2 id="dlg-title">${IN_SIDEBAR ? 'Rename' : 'Rename page'}</h2>
        <div class="field"><label for="dlg-name">${IN_SIDEBAR ? 'Name' : 'Title'}</label><input type="text" id="dlg-name" value="${esc(p.title)}" autocomplete="off"></div>
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
      // In the sidebar arms the confirm is WordPress's ConfirmDialog (Quinn uses it too): a
      // close button labelled Cancel, a text-style Cancel, and the keyboard on the dialog.
      const x = isConfirm(d) ? `<button type="button" class="icon-btn dialog-x" data-action="close-dialog" data-how="the close button" data-focus="dialog-x" aria-label="Cancel">${ICON.close}</button>` : '';
      body = `${x}<h2 id="dlg-title">${copy.title}</h2>${copy.body}
        <div class="dialog-actions">${btn('close-dialog', 'Cancel', {}, isConfirm(d) ? 'btn-text' : '')}${btn('convert', copy.confirm, {}, 'btn-primary')}</div>`;
    }
    if (d.type === 'trash') {
      const p = page(d.pageId);
      // Nothing about the menu. The sidebar arms have core's words, from its Pages screen.
      if (IN_SIDEBAR) body = `<p id="dlg-title" class="dialog-q">Are you sure you want to move "${esc(p.title)}" to the trash?</p>
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('trash', 'Trash', { page: p.id }, 'btn-danger')}</div>`;
      else body = `<h2 id="dlg-title">Move "${esc(p.title)}" to trash?</h2>
        <p>Visitors won't be able to see this page any more.</p>
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('trash', 'Move to trash', { page: p.id }, 'btn-danger')}</div>`;
    }
    return `<div class="scrim${isConfirm(d) ? ' centred' : ''}" data-action="scrim"><div class="dialog${isConfirm(d) || d.type === 'order' ? ' has-x' : ''}" role="dialog" aria-modal="true" aria-labelledby="dlg-title"${isConfirm(d) ? ' tabindex="-1"' : ''}>${body}</div></div>`;
  }

  function closeDialog(how) {
    const d = ui.dialog;
    if (!d) return;
    if (d.from) ui.focus = d.from;
    ui.dialog = null;
    log('dialog', dialogLabel(d) + ' dialog cancelled (' + how + ')' + (d.afterConvert ? '; the menu stays converted' : ''));
    render();
    // B's Rename in menu, cancelled after the conversion: the flow's one message.
    if (d.afterConvert && undo) showToast(undo.message, true);
  }

  // ---------- The site preview ----------

  // What a block other than a link looks like in the header, as the editor's canvas draws it.
  function siteBlockHtml(n) {
    const sel = IN_SIDEBAR ? ` data-item="${esc(n.itemId)}"` : '';
    if (n.block === 'buttons') return `<a href="#" class="site-block site-button"${sel} data-nav-link="Buttons" data-focus="visit:${esc(n.itemId)}">Add text…</a>`;
    if (n.block === 'search') return `<a href="#" class="site-block site-search"${sel} data-nav-link="Search" data-focus="visit:${esc(n.itemId)}" aria-label="Search"><span>Optional placeholder…</span><span class="site-search-btn">${ICON.search}</span></a>`;
    return `<a href="#" class="site-block site-social"${sel} data-nav-link="Social Icons" data-focus="visit:${esc(n.itemId)}" aria-label="Social Icons">${ICON.plus}</a>`;
  }

  function siteLink(n) {
    if (n.block) return siteBlockHtml(n);
    const current = ui.current === n.pageId ? ' aria-current="page"' : '';
    // Where the menu is changed in its own sidebar, a click on it selects it, as in the editor.
    const act = IN_SIDEBAR ? '' : ` data-action="visit" data-page="${esc(n.pageId)}" data-how="the header menu"`;
    const sel = IN_SIDEBAR ? ` data-item="${esc(n.itemId || n.list || '')}"` : '';
    // A draft, as the editor's canvas draws a link to one.
    const text = n.draft ? `<span class="site-draft-label">${esc(n.label)} (Draft)</span>` : esc(n.label);
    return `<a href="#"${act}${sel}${n.draft ? ' data-draft="1"' : ''} data-nav-link="${esc(n.label)}" data-focus="visit:${esc(n.itemId || n.pageId)}"${current}>${text}${n.sub.length ? ' ' + ICON.chevron : ''}</a>`;
  }

  const siteNavHtml = () => shownMenu(true).map((n) => `<li>${siteLink(n)}${n.sub.length ? `<ul class="sub">${n.sub.map((s) => `<li>${siteLink(s)}</li>`).join('')}</ul>` : ''}</li>`).join('');

  // The editor's Undo, Redo and Save, in the top bar of the three sidebar arms.
  function topbarToolsHtml() {
    if (!IN_SIDEBAR) return { left: '', right: '' };
    const h = state.hist;
    const tool = (action, label, icon, off) => `<button type="button" class="icon-btn ed-tool" data-action="${action}" data-focus="${action}" aria-label="${label}" aria-disabled="${off}">${icon}</button>`;
    return {
      left: `<span class="ed-tools">${tool('ed-undo', 'Undo', ICON.undo, h.at === 0)}${tool('ed-redo', 'Redo', ICON.redo, h.at >= h.stack.length - 1)}</span>`,
      // While the save panel is open its own Cancel and Save stand where Save was.
      // On the site, showing a draft: core's page editor has Publish in the top bar.
      right: ui.savePanel ? '' : `<div class="topbar-right">${topSaveHtml()}</div>`
    };
  }

  // The top bar's one button, as in WordPress's page editor: Publish while the page on the site
  // is a draft and nothing else is waiting to be saved (with "Saved" beside it); otherwise Save,
  // which opens the save panel, and is pale with nothing to save. With a draft and unsaved menu
  // changes it's Save, which saves those; Publish comes back after.
  const showsPublish = () => IN_SIDEBAR && ui.screen === 'site' && (page(ui.current) || {}).status === 'draft' && !saveEntities().length;
  function topSaveHtml() {
    if (showsPublish()) return `<span class="ed-saved">${SN_ICON.check}Saved</span><button type="button" class="btn btn-primary ed-publish ed-save-slot" data-action="publish" data-page="${esc(ui.current)}" data-how="the top bar’s Publish, with the page on the site" data-focus="ed-save">Publish</button>`;
    return `<button type="button" class="btn btn-primary ed-save ed-save-slot" data-action="ed-save" data-focus="ed-save" aria-disabled="${!saveEntities().length}">Save</button>`;
  }

  function syncTopbar() {
    if (!IN_SIDEBAR) return;
    const h = state.hist;
    const set = (sel, off) => { const el = root.querySelector(sel); if (el) el.setAttribute('aria-disabled', String(off)); };
    set('[data-action="ed-undo"]', h.at === 0);
    set('[data-action="ed-redo"]', h.at >= h.stack.length - 1);
    set('[data-action="ed-save"]', !saveEntities().length);
    // Publish and Save trade places as the menu gets or loses unsaved changes.
    const slot = root.querySelector('.topbar-right');
    if (slot && !ui.savePanel && !!slot.querySelector('.ed-publish') !== showsPublish()) {
      const had = document.activeElement && document.activeElement.closest('.topbar-right');
      slot.innerHTML = topSaveHtml();
      if (had) slot.querySelector('.ed-save-slot').focus();
    }
    const foot = root.querySelector('.sn-foot');
    if (foot) foot.innerHTML = snFootHtml();
  }

  function renderSite() {
    const nav = shownMenu(true).map((n) => `<li>${siteLink(n)}${n.sub.length ? `<ul class="sub">${n.sub.map((s) => `<li>${siteLink(s)}</li>`).join('')}</ul>` : ''}</li>`).join('');
    const cur = page(ui.current) || page('home') || state.pages[0];
    const hero = cur.id === 'home'
      ? '<h1>Fresh bread, every morning.</h1><p>Sourdough, pastries and cakes baked on Mill Street since [YEAR].</p>'
      : `<h1>${esc(cur.title)}</h1><p>[The ${esc(cur.title)} page's content.]</p>`;
    const draft = cur.status === 'draft' ? '<span class="site-draft-note">Draft: only you can see this page</span>' : '';
    const select = IN_SIDEBAR ? ` data-action="select-menu"` : '';
    return `<div class="site">
      <header class="site-header">
        <button type="button" class="site-name" data-action="visit" data-page="home" data-how="the site's name" data-focus="visit:home-logo">Rosa's Bakery</button>
        <nav class="site-nav${IN_SIDEBAR ? ' selectable' : ''}${ui.sidebar ? ' selected' : ''}${nav ? '' : ' empty'}" aria-label="Site header menu"${select}><ul>${nav}</ul>${IN_SIDEBAR && !nav ? '<button type="button" class="site-nav-empty" data-focus="visit:empty-menu" aria-label="The header menu, which is empty"></button>' : ''}</nav>
      </header>
      <section class="site-hero"><div>${hero}${draft}</div><div class="site-photo" role="img" aria-label="Photo placeholder">Photo</div></section>
      <footer class="site-footer"><span>Rosa's Bakery</span></footer>
    </div>`;
  }

  // Where a Pages action was done, for the log: the sidebar arms say whether it was the Pages screen.
  const whereWords = () => (!IN_SIDEBAR ? '' : ui.screen === 'pages' ? ' (on the Pages screen)' : ' (on the ' + SCREENS[ui.screen] + ' screen)');

  // ---------- The site editor's navigation (control, auto-add, menu-switches) ----------
  //
  // As WordPress's site editor (seen running in WordPress 7.1.5 with Gutenberg 24.4.2): a dark column on the left. At the start it's "Design" with the entries
  // Identity, Styles, Pages, Navigation, Patterns and Templates, and the main area is the site,
  // which is edited as before (click the header menu for its sidebar). Pages swaps the main area
  // for core's pages screen: a list column (Add Page, Search, a row per page, by title) and a
  // preview of the selected page. Navigation shows the menu's list in the column itself, the
  // same list as the menu's sidebar, editing the same menu with the same saving. The other four
  // entries aren't part of the prototype: each says so. ui.screen is where the column is.

  // Leaving a screen (or opening one) is logged, so the log shows how people found Pages.
  function goScreen(screen, how) {
    if (!IN_SIDEBAR || !SCREENS[screen] || ui.screen === screen) return;
    const from = ui.screen;
    endTyping();
    if (from === 'navigation') { dropAdd('left the Navigation screen'); ui.navSel = null; ui.linkEdit = null; ui.collapsed = {}; }
    if (screen !== 'site' && ui.sidebar) closeSidebar('opened the ' + SCREENS[screen] + ' screen');
    ui.more = null; ui.pop = null;
    ui.screen = screen;
    if (screen === 'navigation') ui.collapsed = {};
    if (screen === 'pages' && !stats.firstPages) stats.firstPages = Math.max(1, seconds());
    if (screen === 'navigation' && !stats.firstNavScreen) stats.firstNavScreen = Math.max(1, seconds());
    if (from !== 'site') log('screen', 'Left the ' + SCREENS[from] + ' screen (' + how + ')');
    if (screen !== 'site') log('screen', 'Opened the ' + SCREENS[screen] + ' screen (' + how + ')' + (OTHER_SCREENS.includes(screen) ? ': it isn’t part of this prototype' : ''));
    else log('screen', 'Back to Design: the site, where it can be edited (' + how + ')');
    ui.focus = screen === 'site' ? (from === 'pages' || from === 'navigation' || OTHER_SCREENS.includes(from) ? 'sn:' + from : null) : 'sn-back';
    render();
  }

  const SN_ICON = {
    identity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="7.25"/><path d="M5 12h14M12 4.75c2.2 2.4 2.2 12.1 0 14.5"/></svg>',
    styles: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 4.75a7.25 7.25 0 0 1 0 14.5z" fill="currentColor"/></svg>',
    pages: ICON.page,
    navigation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="7.25"/><path d="M14.5 9.5l-1.5 3.5-3.5 1.5 1.5-3.5z"/></svg>',
    patterns: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M12 7l-3.5 5L12 17l3.5-5z"/></svg>',
    templates: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4.75" y="4.75" width="14.5" height="14.5" rx="1.25"/><path d="M4.75 10h14.5M10 10v9.25"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M10 7l5 5-5 5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5.5 12.5l4 4 9-9"/></svg>',
    published: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="7.25"/><path d="M8.75 12.25l2.25 2.25 4.25-4.5"/></svg>',
    draft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="7.25"/><path d="M5.5 12h13" /><path d="M6.6 15.5h10.8" /></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 7.5h12M9.5 7.5V5.75h5V7.5M7.5 7.5l.75 11h7.5l.75-11"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="7.25"/></svg>'
  };
  const PAGE_FILTERS = [['all', 'All Pages', 'pages'], ['publish', 'Published', 'published'], ['future', 'Scheduled', 'filter'], ['draft', 'Drafts', 'draft'], ['pending', 'Pending', 'filter'], ['private', 'Private', 'filter'], ['trash', 'Trash', 'trash']];

  function snBack(label, action, data, focus) {
    const attrs = Object.entries(data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
    return `<button type="button" class="icon-btn sn-back" data-action="${action}"${attrs} data-focus="${focus || 'sn-back'}" aria-label="${esc(label)}">${ICON.back}</button>`;
  }

  // The column's foot: "Saved", or a button that opens the save panel, as in core.
  function snFootHtml() {
    const n = saveEntities().length;
    return n
      ? `<button type="button" class="btn btn-primary sn-review" data-action="sn-review" data-focus="sn-review">Review ${n} ${n === 1 ? 'change' : 'changes'}…</button>`
      : `<span class="sn-saved">${SN_ICON.check}Saved</span>`;
  }

  function siteNavColumnHtml() {
    const s = ui.screen;
    let head;
    let body;
    if (s === 'site') {
      head = `${snBack('Go to the Dashboard', 'sn-dashboard', {}, 'sn-dashboard')}<h2>Design</h2>`;
      body = `<p class="sn-desc">Customize the appearance of your website using the block editor.</p>
        <ul class="sn-entries">${Object.keys(SN_ENTRIES).map((k) => `<li><button type="button" class="sn-entry" data-action="sn-screen" data-screen="${k}" data-how="the ${SCREENS[k]} entry" data-focus="sn:${k}">${SN_ICON[k]}<span>${SCREENS[k]}</span>${SN_ENTRIES[k] ? SN_ICON.chev : ''}</button></li>`).join('')}</ul>`;
    } else if (s === 'pages') {
      head = `${snBack('Back', 'sn-screen', { screen: 'site', how: 'the Pages screen’s back arrow' })}<h2>Pages</h2>`;
      body = `<p class="sn-desc">Manage or edit the pages that make up your site, and their appearance.</p>
        <ul class="sn-entries">${PAGE_FILTERS.map(([k, t, icon]) => `<li><button type="button" class="sn-entry${ui.pagesFilter === k ? ' is-current' : ''}" data-action="pages-filter" data-filter="${k}" data-focus="pf:${k}" aria-current="${ui.pagesFilter === k ? 'true' : 'false'}">${SN_ICON[icon]}<span>${t}</span></button></li>`).join('')}</ul>`;
    } else if (s === 'navigation') {
      tidyNav();
      const sel = ui.navSel ? itemById(ui.navSel) : null;
      head = sel
        ? `${snBack('Go to "Navigation" block', 'nav-back', {}, 'nav-back')}<h2>${navSelName(sel)}</h2>`
        : `${snBack('Back', 'sn-screen', { screen: 'site', how: 'the Navigation screen’s back arrow' })}<h2>Navigation</h2>`;
      body = `<div class="navside navscreen" aria-label="Navigation"><div class="navside-body">${sidebarBodyHtml(true)}</div></div>`;
    } else {
      head = `${snBack('Back', 'sn-screen', { screen: 'site', how: 'the ' + SCREENS[s] + ' screen’s back arrow' })}<h2>${SCREENS[s]}</h2>`;
      body = `<p class="sn-desc">${SCREENS[s]} isn’t part of this prototype.</p>`;
    }
    return `<nav class="sitenav" aria-label="Site editor">
      <div class="sn-head">${head}</div>
      <div class="sn-body">${body}</div>
      <div class="sn-foot">${snFootHtml()}</div>
    </nav>`;
  }

  // Core's list: by title, A to Z, each top-level page followed by its child pages (not
  // indented). Not page order.
  function pagesListPages() {
    const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    const out = [];
    state.pages.filter((p) => !hasParent(p)).sort(byTitle).forEach((t) => {
      out.push(t);
      state.pages.filter((c) => c.parent === t.id).sort(byTitle).forEach((c) => out.push(c));
    });
    const f = ui.pagesFilter;
    const want = (p) => f === 'all' || p.status === f;
    const words = ui.pagesSearch.trim().toLowerCase();
    return out.filter((p) => want(p) && (!words || p.title.toLowerCase().includes(words)));
  }

  function pagesMoreHtml(p) {
    const item = (action, text, data, cls) => {
      const attrs = Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
      return `<button type="button" role="menuitem" class="${cls || ''}" data-action="${action}"${attrs}>${text}</button>`;
    };
    const dead = (text) => `<button type="button" role="menuitem" aria-disabled="true" data-action="pages-dead" data-what="${esc(text + ' on ' + q(p.title))}">${text}</button>`;
    let html = item('pages-edit', 'Edit', { page: p.id, how: 'Edit in its ⋮ on the Pages screen' }) +
      item('view', 'View', { page: p.id, how: 'View in its ⋮ on the Pages screen' });
    if (p.id !== 'home') html += item('ask-trash', 'Trash…', { page: p.id }, 'danger');
    html += dead('Duplicate…') + item('ask-rename', 'Rename…', { page: p.id }) + item('ask-order', 'Order…', { page: p.id });
    // WordPress doesn't offer these on the page that is already the homepage.
    if (p.status === 'publish' && p.id !== 'home') html += dead('Set as homepage…') + dead('Set as posts page…');
    return `<div class="moremenu" role="menu">${html}</div>`;
  }

  function pagesScreenHtml() {
    const sel = ui.pagesSel && page(ui.pagesSel) ? ui.pagesSel : null;
    let list;
    if (ui.pagesFilter === 'trash') {
      const bin = (state.bin || []).filter((b) => !page(b.id) && (!ui.pagesSearch.trim() || b.title.toLowerCase().includes(ui.pagesSearch.trim().toLowerCase())));
      list = bin.length ? `<ul class="plist" aria-label="Pages">${bin.map((b) => `<li class="prow is-trash"><div class="prow-main"><span class="prow-thumb"></span><span class="prow-text"><span class="prow-line"><span class="prow-title">${esc(b.title)}</span></span><span class="prow-status">${SN_ICON.trash}Trash</span></span></div></li>`).join('')}</ul>` : '';
    } else {
      const rows = pagesListPages().map((p) => {
        const key = keyRow(p.id);
        const on = sel === p.id;
        return `<li class="prow${on ? ' is-selected' : ''}${ui.flash === key ? ' flash' : ''}" data-row="${esc(key)}">
          <button type="button" class="prow-main" data-action="pages-select" data-page="${esc(p.id)}" data-focus="title:${esc(p.id)}" aria-pressed="${on}">
            <span class="prow-thumb"></span>
            <span class="prow-text"><span class="prow-line"><span class="prow-title">${esc(p.title)}</span>${p.id === 'home' ? '<span class="prow-badge">Homepage</span>' : ''}</span>
            <span class="prow-status">${p.status === 'publish' ? SN_ICON.published + 'Published' : SN_ICON.draft + 'Draft'}</span></span>
          </button>
          <button type="button" class="prow-edit" data-action="pages-edit" data-page="${esc(p.id)}" data-how="Edit on its row on the Pages screen" data-focus="pedit:${esc(p.id)}" aria-label="Edit ${esc(p.title)}">Edit</button>
          <button type="button" class="icon-btn" data-action="more" data-key="${esc(key)}" data-focus="more:${esc(key)}" aria-label="Actions for ${esc(p.title)}" aria-expanded="${ui.more === key ? 'true' : 'false'}">${ICON.more}</button>
          ${ui.more === key ? pagesMoreHtml(p) : ''}</li>`;
      }).join('');
      list = rows ? `<ul class="plist" aria-label="Pages">${rows}</ul>` : '';
    }
    const filterName = PAGE_FILTERS.find((x) => x[0] === ui.pagesFilter)[1];
    const shown = page(sel || ui.current) || page('home') || state.pages[0];
    // The preview of the selected page (the front page until a row is chosen). A click on it
    // edits that page: back to the site, showing it.
    return `<main class="pagescreen" aria-label="Pages">
        <div class="ps-head"><h2>Pages</h2>${btn('ask-add', 'Add Page', {}, 'btn-small btn-primary')}</div>
        <div class="ps-tools"><input type="search" id="pages-search" placeholder="Search" aria-label="Search" value="${esc(ui.pagesSearch)}" autocomplete="off" data-focus="pages-search">${ui.pagesFilter !== 'all' ? `<span class="ps-chip">Status includes: ${esc(filterName)}</span>` : ''}</div>
        ${list || '<p class="ps-empty">No results</p>'}
      </main>
      ${previewHtml(shown, 'pages-edit', { page: shown.id, how: 'a click on the preview of ' + q(shown.title) + ' on the Pages screen' }, 'Edit ' + shown.title)}`;
  }

  // The site as a preview that can't be changed (the main area of every screen but Design's):
  // a click on it edits it, as in core.
  function previewHtml(p, action, data, label) {
    const attrs = Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
    let site = '';
    if (p) { const keep = ui.current; ui.current = p.id; site = renderSite(); ui.current = keep; }
    return `<section class="stage preview" aria-label="Site preview">
        <div class="stage-bar"><span>Your site</span><span class="stage-url">${esc(pageUrl(p))}</span></div>
        <div class="preview-wrap"><div class="preview-site" inert>${site}</div><button type="button" class="preview-edit" data-action="${action}"${attrs} data-focus="preview-edit" aria-label="${esc(label)}"></button></div>
      </section>`;
  }

  // The selected item's name, as the sidebar's heading says it.
  const navSelName = (sel) => (isPageList(sel) ? 'Page List' : isBlock(sel) ? BLOCKS[sel.block].title : 'Page link');

  const siteNavActions = {
    'sn-screen'(d) { goScreen(d.screen, d.how || 'the ' + SCREENS[d.screen] + ' entry'); },
    'sn-dashboard'() { log('tried', 'Tried to go to the Dashboard (the Design screen’s back arrow): not part of this prototype'); },
    'sn-review'() { openSavePanel('the Review changes button at the foot of the site editor’s navigation'); },
    'pages-filter'(d) {
      if (ui.pagesFilter === d.filter) return;
      ui.pagesFilter = d.filter;
      ui.more = null;
      ui.focus = 'pf:' + d.filter;
      log('screen', 'Pages screen: showing ' + PAGE_FILTERS.find((x) => x[0] === d.filter)[1]);
      render();
    },
    'pages-select'(d) {
      const p = page(d.page);
      if (!p) return;
      ui.more = null;
      if (ui.pagesSel !== p.id) {
        ui.pagesSel = p.id;
        log('visit', 'Pages screen: selected ' + q(p.title) + '; the preview beside the list shows it');
      }
      ui.focus = 'title:' + p.id;
      render();
    },
    'pages-edit'(d) {
      const p = page(d.page);
      if (!p) return;
      ui.pagesSel = p.id;
      visit(p.id, d.how);
      goScreen('site', d.how);
    },
    'pages-dead'(d) { ui.more = null; log('tried', 'Tried ' + d.what + ' on the Pages screen: not part of this prototype'); render(); }
  };

  // ---------- Render ----------

  const root = document.getElementById('app');
  document.body.classList.toggle('has-notes', NOTES);

  function render() {
    const active = document.activeElement;
    const focusKey = ui.focus || (active && active.dataset && active.dataset.focus);
    ui.focus = null;
    const panelScroll = (root.querySelector('.panel, .pagescreen') || {}).scrollTop || 0;
    const stageScroll = (root.querySelector('.stage') || {}).scrollTop || 0;
    const sideScroll = (root.querySelector('.navside-body') || {}).scrollTop || 0;

    const panel = ARM === 'explained' ? renderExplained() : ARM === 'switches' ? renderSwitches() : IN_SIDEBAR ? '' : renderPlain();
    const cur = page(ui.current) || page('home') || state.pages[0];
    const dialog = dialogHtml();
    const tools = topbarToolsHtml();
    const side = sidebarHtml();
    // When a dialog opened or closed: the second click of a double-click is ignored then.
    if (ui.dialog !== drawnDialog) {
      dialogChangedAt = Date.now();
      if (ui.dialog) dialogOpenedAt = dialogChangedAt;
      drawnDialog = ui.dialog;
    }

    const stage = `<section class="stage" aria-label="Site preview">
            <div class="stage-bar"><span>Your site</span><span class="stage-url">${esc(pageUrl(cur))}</span></div>
            ${renderSite()}
          </section>`;
    // The sidebar arms: the site editor's navigation column, then the screen's main area.
    const main = !IN_SIDEBAR ? `<main class="panel" aria-label="Pages">${panel}</main>
          ${stage}`
      : ui.screen === 'site' ? siteNavColumnHtml() + stage
      : ui.screen === 'pages' ? siteNavColumnHtml() + pagesScreenHtml()
      : siteNavColumnHtml() + previewHtml(cur, 'sn-screen', { screen: 'site', how: 'a click on the preview' }, 'Edit your site');
    root.innerHTML = `
      <div class="app arm-${ARM}${IN_SIDEBAR ? ' screen-' + ui.screen : ''}">
        <div class="topbar">
          <div class="topbar-left"><span class="site-icon" aria-hidden="true">R</span>${IN_SIDEBAR ? '' : '<span class="topbar-title">Pages</span>'}<span class="topbar-sub">Rosa's Bakery</span>${tools.left}</div>${tools.right}
        </div>
        <div class="workspace">
          ${main}
          ${side}
        </div>
        <div class="bottombar"><button type="button" class="btn btn-primary" data-action="finish" data-focus="finish">Finished</button><p>Click Finished when you've done everything you were asked to.</p></div>
      </div>
      ${dialog}`;

    const panelEl = root.querySelector('.panel, .pagescreen');
    if (panelEl) panelEl.scrollTop = panelScroll;
    root.querySelector('.stage').scrollTop = stageScroll;
    const sideEl = root.querySelector('.navside-body');
    if (sideEl) sideEl.scrollTop = sideScroll;

    if (ui.dialog) {
      // The ConfirmDialog takes the keyboard itself, as core's does; Enter there confirms.
      const first = isConfirm(ui.dialog) ? root.querySelector('.dialog') : root.querySelector('.dialog input, .dialog .btn-primary, .dialog .btn-danger');
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
    syncToast();
    save();
    renderNotes();
  }

  // The message at the bottom, with Undo after a change. It stays for 12 seconds; the
  // clock stops while the pointer is over it or the keyboard is in it, and while a dialog
  // covers it (an Undo message is never shown with a dialog open).
  const TOAST_MS = 12000;
  let toast = null;

  function toastEl() {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      t.setAttribute('role', 'status');
      t.hidden = true;
      document.body.appendChild(t);
      t.addEventListener('pointerenter', () => { if (toast) { toast.hover = true; syncToast(); } });
      t.addEventListener('pointerleave', () => { if (toast) { toast.hover = false; syncToast(); } });
      t.addEventListener('focusin', () => { if (toast) { toast.focus = true; syncToast(); } });
      t.addEventListener('focusout', () => { if (toast) { toast.focus = false; syncToast(); } });
    }
    return t;
  }

  function syncToast() {
    const t = toastEl();
    if (!toast) { t.hidden = true; return; }
    const covered = toast.canUndo && (!!ui.dialog || !!finishStep);
    t.hidden = covered;
    // On the Pages screen the message sits over the preview, clear of the list and its ⋮ buttons.
    if (IN_SIDEBAR) {
      const ps = root.querySelector('.pagescreen');
      const app = root.querySelector('.app');
      if (ps && app) {
        const left = ps.getBoundingClientRect().right + 16;
        Object.assign(t.style, { left: left + 'px', right: 'auto', transform: 'none', maxWidth: Math.max(160, app.getBoundingClientRect().right - left - 16) + 'px' });
      } else Object.assign(t.style, { left: '', right: '', transform: '', maxWidth: '' });
    }
    const paused = covered || toast.hover || toast.focus;
    if (paused && toast.timer) {
      clearTimeout(toast.timer);
      toast.timer = null;
      toast.left -= Date.now() - toast.since;
    } else if (!paused && !toast.timer) {
      toast.since = Date.now();
      toast.timer = setTimeout(hideToast, Math.max(toast.left, 0));
    }
  }

  function showToast(text, canUndo) {
    const t = toastEl();
    if (toast) clearTimeout(toast.timer);
    t.innerHTML = `<span>${esc(text)}</span>${canUndo ? '<button type="button" data-action="undo">Undo</button>' : ''}`;
    t.hidden = false;
    toast = { canUndo: !!canUndo, left: TOAST_MS, since: 0, timer: null, hover: t.matches(':hover'), focus: false };
    syncToast();
  }

  function hideToast() {
    if (toast) clearTimeout(toast.timer);
    toast = null;
    toastEl().hidden = true;
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
    }, `"${title}" moved`);
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

  // A click on an item of the header menu once the menu is selected selects that item, as on
  // the editor's canvas: a link, or the Page List that a page belongs to. (A click there never
  // opens the Detach dialog.) The page isn't shown. how: '' or ' (the second click of the
  // double-click that opened the sidebar)'.
  function clickSelectedMenu(itemId, label, how) {
    const it = itemById(itemId);
    if (!it) { log('tried', 'Clicked ' + q(label) + ' in the header menu, which is selected' + how + ': nothing more is shown for a page in a pages menu'); return; }
    if (ui.navSel === it.id) { log('tried', 'Clicked ' + q(label) + ' in the header menu again' + how + ': ' + (isPageList(it) ? 'the Page List' : 'the link') + ' is already selected'); return; }
    endTyping();
    dropAdd('the header menu was clicked');
    ui.navSel = it.id; ui.more = null;
    ui.focus = isPageList(it) ? 'nav-ask-detach' : 'nav-back';
    log('sidebar', 'Clicked ' + q(label) + ' in the header menu, which is selected' + how + ': ' + (isPageList(it) ? 'the Page List is selected, and its settings take the list’s place, with Detach Page List' : 'that link is selected, and its settings take the list’s place'));
    render();
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
    'ask-convert'(d) { if (d.page && !page(d.page)) return; askConvert({ trigger: d.trigger === 'rename' ? 'Rename in menu' : d.trigger === 'remove' ? 'Remove from menu' : d.trigger, pageId: d.page || null, then: d.page ? d.trigger : null }); },
    convert() {
      const d = ui.dialog;
      if (!d || d.type !== 'convert') return;
      if (!dialogSubject(d)) { dropDialog(); return; }
      const p = d.pageId ? page(d.pageId) : null;
      const mode = ARM === 'menu-switches' ? 'advanced' : 'links';
      const detaching = ARM === 'control' || detachesList(d);
      ui.dialog = null;
      stats.dialogsConfirmed++;
      log('dialog', dialogName(d) + ' dialog confirmed');
      if (IN_SIDEBAR) {
        // In the editor: an unsaved change, with no message.
        // Q: drafts switched off become hidden links (see convertToLinks); say which.
        const offDrafts = !detaching && CANVAS_DRAFTS && isAutomatic() ? state.pages.filter((p) => p.status !== 'publish' && isExcluded(p.id)).map((p) => q(p.title)) : [];
        edit(() => {
          if (detaching) detachPageList(d.itemId); else convertToLinks(mode);
          ui.navSel = null;
          const firstLink = state.menu.items.find((it) => !isPageList(it));
          if (firstLink) ui.focus = 'nav-row:' + firstLink.id;
        }, detaching ? 'the Page List detached' : 'switched to an advanced menu');
        log('menu', (detaching ? 'Page List detached: its pages are now links' : mode === 'advanced' ? 'Menu switched to an advanced menu (links, new pages still added)' : 'Page List detached: its pages are now links') +
          (offDrafts.length ? '; ' + (offDrafts.length === 1 ? 'the draft ' + offDrafts[0] + ', which was switched off, becomes a hidden link' : 'the drafts ' + offDrafts.join(', ') + ', which were switched off, become hidden links') + ', so it stays out of the menu when published' : ''));
        return;
      }
      if (d.then === 'remove') {
        commit(() => { convertToLinks(mode); removeLink(linkFor(p.id).id); ui.flash = keyRow(p.id); ui.focus = 'pop:' + keyRow(p.id); },
          `"${p.title}" taken out. You now choose your menu's pages.`);
        log('menu', 'Menu converted to links, and ' + q(p.title) + ' taken out of it (popover, Remove from menu)');
        return;
      }
      // B's Rename in menu goes on to ask for the new name. Nothing is said about the
      // conversion while that dialog is open: the flow shows one message when it ends.
      const renaming = d.then === 'rename';
      commit(() => {
        convertToLinks(mode);
        if (p) ui.focus = 'pop:' + keyRow(p.id);
        else if (IN_SIDEBAR && state.menu.items.length) ui.focus = 'nav-row:' + state.menu.items[0].id;
      },
        mode === 'advanced' ? 'Switched to an advanced menu' : ARM === 'explained' ? 'You now choose your menu\'s pages' : 'The menu\'s pages are now links',
        { quiet: renaming });
      log('menu', mode === 'advanced' ? 'Menu switched to an advanced menu (links, new pages still added)' : 'Menu converted to links');
      if (renaming) {
        const link = linkFor(p.id);
        if (link) { ui.focus = 'pop:' + keyRow(p.id); openDialog({ type: 'label', itemId: link.id, afterConvert: true }, 'after the conversion'); ui.dialog.from = 'pop:' + keyRow(p.id); }
        else showToast(undo.message, true);
      }
    },
    'ask-label'(d) { openDialog({ type: 'label', itemId: d.item }); },
    'save-label'() {
      const d = ui.dialog;
      if (!d || d.type !== 'label') return;
      if (!dialogSubject(d)) { dropDialog(); return; }
      const text = readName();
      if (!text) { invalidName(); return; }
      const it = itemById(d.itemId);
      const old = it.label;
      ui.dialog = null;
      ui.focus = 'pop:' + keyRow(it.pageId);
      if (text === old) {
        log('dialog', 'Rename in menu dialog closed with Save, with the text unchanged' + (d.afterConvert ? '; the menu stays converted' : ''));
        render();
        if (d.afterConvert && undo) showToast(undo.message, true);
        return;
      }
      // After B's conversion this is the end of one flow: one message, and Undo takes back
      // the new name and the conversion together.
      commit(() => { setLinkLabel(it.id, text); ui.flash = keyRow(it.pageId); ui.focus = 'pop:' + keyRow(it.pageId); },
        `"${old}" is now "${text}" in your menu` + (d.afterConvert ? '. You now choose your menu\'s pages.' : ''), { keepUndo: !!d.afterConvert });
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
    view(d) {
      visit(d.page, d.how || 'the Pages panel'); ui.more = null;
      // The Pages screen's View: the site, showing the page (core opens the page in a new tab).
      if (IN_SIDEBAR && ui.screen === 'pages') { ui.pagesSel = d.page; goScreen('site', d.how); return; }
      render();
    },
    visit(d) { visit(d.page, d.how || 'the preview'); ui.focus = 'visit:' + d.page; render(); },
    publish(d) {
      const p = page(d.page);
      if (!p) return;
      const was = isShown(d.page);
      // The keyboard stays on the row: its marker (B's popover) or its ⋮ button.
      const focus = d.how && d.how.indexOf('top bar') >= 0 ? 'ed-save' : (d.how === 'its marker' ? 'pop:' : 'more:') + keyRow(d.page);
      const toggle = draftToggleWords(d.page);
      commit(() => { publishPage(d.page); ui.pop = null; ui.flash = keyRow(d.page); ui.focus = focus; }, `"${p.title}" is published`);
      log('page', 'Published ' + q(p.title) + ' (from ' + (d.how || 'the Pages panel') + ')' + toggle + (IN_SIDEBAR && ui.screen !== 'site' ? whereWords() : '') + '; ' + (IN_SIDEBAR ? menuWords(d.page) : isShown(d.page) && !was ? 'it is now in the menu' : 'it is not in the menu'));
    },
    'ask-add'() { openDialog({ type: 'add' }); },
    create(d) {
      if (!ui.dialog || ui.dialog.type !== 'add') return;
      const title = readName();
      if (!title) { invalidName(); return; }
      ui.dialog = null;
      let id;
      commit(() => {
        id = createPage(title, d.status);
        ui.flash = keyRow(id);
        ui.current = id;
        // In B the new page's popover opens, so its menu state is explained straight away.
        if (ARM === 'explained') { ui.pop = keyRow(id); ui.focus = 'pop:' + keyRow(id); popOpenedItselfAt = Date.now(); }
        else if (ARM === 'switches') ui.focus = 'sw:' + id;
        else ui.focus = 'more:' + keyRow(id);
        // Core opens a new draft in the editor: here, the site, showing it, with Publish in the top bar.
        if (IN_SIDEBAR) { ui.screen = 'site'; ui.pagesSel = id; ui.focus = 'ed-save'; }
      }, `"${title}" ${d.status === 'draft' ? 'saved as a draft' : 'published'}`);
      log('page', 'Added ' + q(title) + ', ' + (d.status === 'draft' ? 'saved as a draft' + (CANVAS_DRAFTS && isAutomatic() ? '; it is listed in the pages menu with its toggle off, and joins the menu, switched on, once it’s published' : '') : 'published; ' + (IN_SIDEBAR ? menuWords(id) : isShown(id) ? 'it is now in the menu' : 'it is not in the menu')) + (IN_SIDEBAR ? ' (Add Page, Create draft, on the Pages screen)' : ''));
      if (IN_SIDEBAR) log('screen', 'Left the Pages screen (Create draft opens the new page on the site; the top bar shows ' + (showsPublish() ? 'Publish' : 'Save, since the menu has unsaved changes') + ')');
      log('visit', 'The preview shows the new page, ' + q(title));
      if (ARM === 'explained') log('menu', 'Marker popover opened on its own after Add page: ' + q(title) + ' (not counted)');
    },
    'ask-rename'(d) { openDialog({ type: 'rename', pageId: d.page }); },
    rename() {
      const dlg = ui.dialog;
      if (!dlg || dlg.type !== 'rename') return;
      if (!dialogSubject(dlg)) { dropDialog(); return; }
      const title = readName();
      if (!title) { invalidName(); return; }
      const d = { page: dlg.pageId };
      const p = page(d.page);
      const old = p.title;
      ui.dialog = null;
      if (title === old) {
        if (dlg.from) ui.focus = dlg.from;
        log('dialog', 'Rename dialog closed with Save, with the title unchanged');
        render();
        return;
      }
      const link = linkFor(p.id);
      commit(() => { renamePage(d.page, title); ui.flash = keyRow(d.page); ui.focus = 'more:' + keyRow(d.page); }, `"${old}" is now "${title}"`);
      log('page', 'Renamed a page’s title: ' + q(old) + ' to ' + q(title) + (followsTitle(p.id) ? (isShown(p.id) || onCanvas(p.id) ? '; the menu follows' : '') : link ? '; its link in the menu still says ' + q(link.label) : '') + whereWords());
    },
    'ask-trash'(d) { openDialog({ type: 'trash', pageId: d.page }); },
    'ask-order'(d) { openDialog({ type: 'order', pageId: d.page }); },
    // Order…: WordPress takes the whole number in what's typed (0.5 is 0, nothing is 0).
    order() {
      const dlg = ui.dialog;
      if (!dlg || dlg.type !== 'order') return;
      if (!dialogSubject(dlg)) { dropDialog(); return; }
      const p = page(dlg.pageId);
      const field = document.getElementById('dlg-order');
      const typed = Number(field ? field.value : 0);
      const n = Number.isFinite(typed) ? Math.trunc(typed) : 0;
      const was = orderOf(p);
      const before = shownMenu().map((x) => x.label).join(', ');
      const placeBefore = state.pages.filter((x) => (x.parent || null) === (p.parent || null)).indexOf(p);
      ui.dialog = null;
      commit(() => { setPageOrder(p.id, n); ui.flash = keyRow(p.id); ui.focus = 'more:' + keyRow(p.id); }, 'Order updated.');
      const after = shownMenu().map((x) => x.label).join(', ');
      const placeAfter = state.pages.filter((x) => (x.parent || null) === (p.parent || null)).indexOf(p);
      if (n !== was && placeAfter !== placeBefore) stats.orderUses++;
      log('order', 'Order… on ' + q(p.title) + ': ' + was + ' to ' + n + whereWords() + '; in page order it went from place ' + (placeBefore + 1) + ' to place ' + (placeAfter + 1) + (p.parent && page(p.parent) ? ' under ' + q(page(p.parent).title) : ' at the top level') +
        (after !== before ? '; the header menu now reads ' + after : '; the header menu didn’t change'));
    },
    trash() {
      const dlg = ui.dialog;
      if (!dlg || dlg.type !== 'trash') return;
      if (!dialogSubject(dlg)) { dropDialog(); return; }
      const d = { page: dlg.pageId };
      const p = page(d.page);
      ui.dialog = null;
      // The keyboard goes to the row that takes its place, or the one above.
      const keys = [...root.querySelectorAll('.panel [data-row], .pagescreen [data-row]')].map((el) => el.dataset.row);
      const at = keys.indexOf(keyRow(d.page));
      const near = keys[at + 1] || keys[at - 1];
      commit(() => { trashPage(d.page); ui.pop = null; if (near) ui.focus = 'more:' + near; if (ui.pagesSel === d.page) ui.pagesSel = null; }, `"${p.title}" moved to trash`);
      log('page', 'Moved ' + q(p.title) + ' to trash' + whereWords());
    },
    'close-dialog'(d) { closeDialog((d && d.how) || 'Cancel'); },
    // A click outside a dialog closes it only if the pointer went down outside it too, and
    // not in the dialog's first half second: the second click of a double-click on the
    // button that opened it lands here.
    scrim(d, el, ev) { if (ev.target === el && downOnScrim && Date.now() - dialogOpenedAt >= GUARD_MS) closeDialog('clicked outside'); },

    // Control and Q: the menu on the site, and its sidebar.
    'select-menu'(d, el, ev) {
      const link = ev.target.closest('[data-nav-link]');
      // With the menu already selected, a click on one of its items selects that item, as on
      // the editor's canvas: a link, or the Page List that a page belongs to. (A click there
      // never opens the Detach dialog.) The page isn't shown.
      if (ui.sidebar && !ui.savePanel && link) { clickSelectedMenu(link.dataset.item, link.dataset.navLink, ''); return; }
      openedBy = link ? { item: link.dataset.item || '', label: link.dataset.navLink } : null;
      openSidebar(link ? 'clicked ' + q(link.dataset.navLink) + ' in the header menu' : 'clicked the header menu');
      sidebarOpenedAt = Date.now();
    },
    'close-sidebar'() { closeSidebar('close button'); },
    ...navActions,
    ...siteNavActions,

    // One level of Undo: the last change, until the next one. From the message's button
    // or with Ctrl+Z / Cmd+Z (how === 'keyboard').
    undo(d) {
      if (!undo) return;
      const what = undo.message;
      // Whatever is open may be about something Undo takes away, so it closes first.
      const open = ui.dialog;
      dropAdd('Undo');
      ui.dialog = null; ui.pop = null; ui.more = null;
      if (drag) endDrag(null, true, 'interrupted');
      state = undo.state;
      ui.current = page(undo.current) ? undo.current : 'home';
      undo = null;
      if (IN_SIDEBAR && sameAsSaved()) state.hist.dirty = 0;
      stats.undos++;
      hideToast();
      checkTasks();
      if (open) log('dialog', dialogLabel(open) + ' dialog closed by Undo');
      log('undo', (d && d.how === 'keyboard' ? 'Undo (keyboard)' : 'Undo') + (what ? ': ' + what : ''));
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

  // Double-clicks. The second click of a double-click on a button that opens or closes a
  // dialog would land on whatever is there next (the scrim, which cancels the dialog; the
  // page under a dialog that has just closed). So for half a second after a dialog opens or
  // closes, a second click is ignored, and so is any click on the scrim; and a popover that
  // has just opened by itself isn't closed by a click elsewhere.
  const GUARD_MS = 500;
  let drawnDialog = null;
  let dialogChangedAt = 0;
  let dialogOpenedAt = 0;
  let popOpenedItselfAt = 0;
  // The sidebar arms: when a ⋮ item was last chosen, when a click on the header menu last
  // opened the sidebar, and what was clicked.
  let moreItemAt = 0;
  let guardFocus = null;
  let sidebarOpenedAt = 0;
  let openedBy = null;
  let downOnScrim = false;
  document.addEventListener('pointerdown', (ev) => {
    downOnScrim = !!(ev.target.classList && ev.target.classList.contains('scrim'));
  }, true);

  document.addEventListener('click', (ev) => {
    if (ev.target.closest('a[href="#"]')) ev.preventDefault();
    if (ev.detail > 1 && Date.now() - dialogChangedAt < GUARD_MS) return;
    if (IN_SIDEBAR && !ev.target.closest('.notes')) {
      // The second click of a double-click on a ⋮ item lands on whatever is under it now.
      if (ev.detail > 1 && Date.now() - moreItemAt < GUARD_MS) {
        // Its pointerdown may have moved the keyboard to what's there now: put it back.
        if (guardFocus && guardFocus.isConnected && document.activeElement !== guardFocus) guardFocus.focus({ preventScroll: true });
        return;
      }
      // The sidebar's arrival moves the preview, so for half a second after a click on the
      // header menu opened it, a click in the preview is ignored; and the second click of a
      // double-click, wherever it lands, counts as a second click on what was clicked first.
      if (Date.now() - sidebarOpenedAt < GUARD_MS) {
        if (ev.detail > 1 && openedBy) {
          const o = openedBy;
          openedBy = null;
          if (ui.sidebar && !ui.savePanel) clickSelectedMenu(o.item, o.label, ' (the second click of the double-click that opened the sidebar)');
          return;
        }
        if (ev.target.closest('.stage')) {
          const other = ev.target.closest('[data-nav-link]');
          if (other) log('tried', 'Tried to click ' + q(other.dataset.navLink) + ' in the header menu straight after opening the sidebar; ignored');
          return;
        }
        // A fresh click somewhere else: the person has moved on, so the guard ends.
        openedBy = null;
        sidebarOpenedAt = 0;
      }
      // A click outside the Add link popover closes it, as in the editor.
      // The top bar's Undo, with Add link open, only takes the "Page link" row away, as in the
      // editor: nothing else is undone, and it isn't counted as an Undo.
      if (ui.navAdd && ev.target.closest('[data-action="ed-undo"]')) {
        const a = ui.navAdd;
        dropAdd('Undo');
        ui.focus = a.place === 'end' || !a.ref ? 'nav-append' : 'more:' + navKey(a.ref);
        render();
        return;
      }
      if (ui.navAdd && !ev.target.closest('.nav-picker, [data-action="nav-ask-add"]')) {
        const named = ev.target.closest('[data-action="ed-save"]') ? 'Save' : ev.target.closest('[data-action="close-sidebar"]') ? 'closed the sidebar' : null;
        const where = ev.target.closest('.panel') ? 'clicked the Pages panel' : ev.target.closest('.sitenav .sn-head, .sitenav .sn-foot, .sitenav .sn-entries') ? 'clicked the site editor’s navigation' : ev.target.closest('.stage') ? 'clicked the preview' : ev.target.closest('.navside') ? 'clicked elsewhere in the sidebar' : ev.target.closest('.topbar') ? 'clicked the top bar' : 'clicked elsewhere';
        if (dropAdd(named || where)) render();
      }
    }
    // A click elsewhere in the preview closes the Navigation sidebar.
    if (ui.sidebar && ev.target.closest('.stage') && !ev.target.closest('.site-nav')) closeSidebar('clicked elsewhere in the preview');
    const el = ev.target.closest('[data-action]');
    if (!el) {
      // A click elsewhere closes an open popover or ⋮ menu.
      if ((ui.pop || ui.more) && !ev.target.closest('.pop, .moremenu, .notes, #toast') && Date.now() - popOpenedItselfAt >= GUARD_MS) { ui.pop = null; ui.more = null; render(); }
      return;
    }
    const action = actions[el.dataset.action];
    if (!action) return;
    // A ⋮ item, and a row whose click puts its settings in the list's place: the second click of
    // a double-click would land on whatever has just appeared there.
    // So is a click that changes the site editor's screen: what's under the pointer is new.
    const guarded = IN_SIDEBAR && (el.closest('.moremenu') || ['nav-select', 'sn-screen', 'pages-edit', 'view'].includes(el.dataset.action));
    if (guarded) moreItemAt = Date.now();
    action(Object.assign({}, el.dataset), el, ev);
    if (guarded) guardFocus = document.activeElement;
  });

  document.addEventListener('keydown', (ev) => {
    // Ctrl+Z / Cmd+Z: the same single Undo as the message's button, until the next change.
    // Not while typing in a field (the field's own undo), and not with a dialog open.
    const key = String(ev.key).toLowerCase();
    // Redo is Ctrl+Shift+Z or Ctrl+Y, and on a Mac Cmd+Shift+Z (Cmd+Y is the browser's there).
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (key === 'z' || (key === 'y' && !ev.shiftKey && !(IS_MAC && ev.metaKey && !ev.ctrlKey)))) {
      const t = ev.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing || ui.dialog || finishStep || drag) return;
      const redo = key === 'y' || ev.shiftKey;
      // The last thing done was in the Pages panel, and its message's Undo is still on offer:
      // Ctrl+Z takes that back. Otherwise, in the sidebar arms, it's the editor's Undo and
      // Redo; in B and F there is only the one Undo.
      // With Add link open, Undo only takes the "Page link" row away (see the top bar's Undo).
      if (IN_SIDEBAR && !redo && ui.navAdd) { ev.preventDefault(); const a = ui.navAdd; dropAdd('Undo'); ui.focus = a.place === 'end' || !a.ref ? 'nav-append' : 'more:' + navKey(a.ref); render(); return; }
      if (!redo && undo) { ev.preventDefault(); actions.undo({ how: 'keyboard' }); return; }
      if (!IN_SIDEBAR) return;
      ev.preventDefault();
      if (redo) editorRedo('keyboard'); else editorUndo('keyboard');
      return;
    }
    // Tab stays inside an open dialog.
    if (ev.key === 'Tab' && ui.dialog && !(ev.target.closest && ev.target.closest('.notes'))) {
      const stops = [...root.querySelectorAll('.dialog input, .dialog button')];
      if (stops.length) {
        const i = stops.indexOf(document.activeElement);
        ev.preventDefault();
        stops[i < 0 ? (ev.shiftKey ? stops.length - 1 : 0) : (i + (ev.shiftKey ? -1 : 1) + stops.length) % stops.length].focus();
      }
      return;
    }
    if (ev.key === 'Escape') {
      // Escape closes the topmost thing only. The Finished dialog closes itself.
      if (finishStep) return;
      if (drag) { endDrag(ev, true, 'escape'); return; }
      if (ui.dialog) { closeDialog('Escape'); return; }
      if (ui.more) { const k = ui.more; ui.more = null; ui.focus = 'more:' + k; render(); return; }
      if (ui.pop) { const k = ui.pop; ui.pop = null; ui.focus = 'pop:' + k; render(); return; }
      if (ui.savePanel) { closeSavePanel('Escape'); return; }
      if (ui.navAdd) { closeAdd('Escape'); return; }
      if (ui.linkEdit && ui.navSel === ui.linkEdit.id) { closeLinkTo('Escape'); return; }
      if (ui.navSel) { navActions['nav-back'](); return; }
      if (ui.sidebar) closeSidebar('Escape');
      return;
    }
    if ((ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && !ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.target.closest && ev.target.tagName !== 'INPUT' && !ev.target.closest('.moremenu')) {
      const li = ev.target.closest('.navside .nav-list > li[data-drag-id]');
      const ex = li && li.querySelector(':scope > .row-main > .nav-expander[data-id]');
      if (ex) {
        const open = ex.classList.contains('is-open');
        if (ev.key === 'ArrowLeft' ? open : !open) { ev.preventDefault(); toggleCollapsed(ex.dataset.id, ev.key === 'ArrowLeft' ? '← key' : '→ key', ev.key === 'ArrowRight'); return; }
      }
    }
    if (ev.key === 'Enter' && ev.target.id === 'nav-text') { ev.preventDefault(); endTyping(); return; }
    if (ev.key === 'Enter' && ev.target.id === 'nav-linkto-input') { ev.preventDefault(); if (ui.linkEdit) ui.linkEdit.text = ev.target.value; applyLinkTo('Pressed Enter'); return; }
    // Search or type URL: Enter adds a typed address. ArrowDown goes into the suggestions.
    if (ev.target.id === 'nav-search' && (ev.key === 'Enter' || ev.key === 'ArrowDown')) {
      ev.preventDefault();
      const text = ev.target.value.trim();
      if (ev.key === 'ArrowDown') { const first = root.querySelector('.nav-results li:not([hidden]) button'); if (first) first.focus(); return; }
      if (ui.navAdd) ui.navAdd.q = text;
      applyTyped('Pressed Enter');
      return;
    }
    if (ev.target.closest && ev.target.closest('.nav-results') && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
      ev.preventDefault();
      const items = [...root.querySelectorAll('.nav-results li:not([hidden]) button')];
      const i = items.indexOf(document.activeElement) + (ev.key === 'ArrowDown' ? 1 : -1);
      if (i < 0) document.getElementById('nav-search').focus(); else if (items[i]) items[i].focus();
      return;
    }
    if (ev.key === 'Enter' && ev.target.id === 'nav-create-title') { ev.preventDefault(); navActions['nav-create'](); return; }
    // ConfirmDialog: Enter anywhere in it but on its buttons confirms (a button does its own thing).
    if (ev.key === 'Enter' && isConfirm(ui.dialog) && ev.target.closest && ev.target.closest('.dialog') && !ev.target.closest('button')) {
      ev.preventDefault();
      if (!ev.repeat) actions.convert();
      return;
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
    root.querySelectorAll('.drop-line').forEach((el) => el.remove());
  }

  // In the Navigation sidebar there are no handles: as in the editor's list view, a row is
  // dragged by its name. A press that doesn't move is an ordinary click.
  let justDragged = false;
  document.addEventListener('pointerdown', (ev) => {
    const grip = ev.target.closest('.navside .nav-grip');
    const h = ev.target.closest('.handle') || (grip && grip.closest('li[data-drag-id]') ? grip : null);
    if (!h || ev.button > 0) return;
    const li = h.closest('li');
    const side = !!h.closest('.navside');
    // No text selection or native drag starts (Safari); the row still takes the keyboard.
    ev.preventDefault();
    if (h.focus) h.focus();
    try { h.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable; the document still hears the moves */ }
    if (!side) { ui.more = null; ui.pop = null; }
    drag = { id: li.dataset.dragId, group: li.dataset.dragGroup, kind: side ? li.dataset.kind : h.dataset.kind, list: li.parentElement, target: null, moved: false, outside: false, x: ev.clientX, y: ev.clientY, side, li };
    if (!side) rowsBlock(li).forEach((r) => r.classList.add('dragging'));
  });

  // A drag let go of outside its list (with a small margin) is cancelled, as Escape does.
  const DRAG_MARGIN = 40;
  function outsideList(ev) {
    if (!drag || !drag.list.isConnected || ev.clientX == null) return false;
    const b = drag.list.getBoundingClientRect();
    // In the sidebar, pulling a nested row out to the left mustn't count as leaving the list.
    const left = drag.side ? DRAG_MARGIN * 4 : DRAG_MARGIN;
    return ev.clientX < b.left - left || ev.clientX > b.right + DRAG_MARGIN || ev.clientY < b.top - DRAG_MARGIN || ev.clientY > b.bottom + DRAG_MARGIN;
  }

  // In the Navigation sidebar a drag can also change a row's level, but only on purpose: the
  // pointer has to have moved NEST_PX to the right of where the drag started for the row to
  // go under the row above the gap (or beside that row, under its parent), or NEST_PX to the
  // left for it to come out to the top level. Otherwise it keeps the level it has (where it
  // can't, it goes to the top level). A row with rows under it stays at the top level. The
  // same rule in the control and Q.
  const NEST_PX = 40;
  function sideDragMove(ev) {
    if (!drag.moved && (Math.abs(ev.clientY - drag.y) > 4 || Math.abs(ev.clientX - drag.x) > 12)) {
      drag.moved = true;
      if (drag.li.isConnected) rowsBlock(drag.li).forEach((r) => r.classList.add('dragging'));
    }
    clearDropMarks();
    drag.target = null;
    drag.outside = outsideList(ev);
    if (!drag.moved || drag.outside) return;
    const all = [...drag.list.querySelectorAll(':scope > li[data-drag-id]')];
    const self = all.find((li) => li.dataset.dragId === drag.id);
    if (!self) return;
    const block = rowsBlock(self);
    const rows = all.filter((li) => !block.includes(li));
    const depthOf = (li) => Number(li.dataset.depth);
    let k = rows.findIndex((li) => { const r = li.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
    if (k < 0) k = rows.length;
    const hasRowsUnder = block.length > 1 || !!self.dataset.pagelist;
    const box = drag.list.getBoundingClientRect();
    const dx = ev.clientX - drag.x;
    // The level asked for: a deliberate move to the right or left, or else the one it has.
    const want = hasRowsUnder ? 0 : dx >= NEST_PX ? 1 : dx <= -NEST_PX ? 0 : depthOf(self);
    const parentAt = (i) => {
      const above = rows[i - 1] || null;
      return !above ? null : depthOf(above) ? rows.find((li) => li.dataset.dragId === above.dataset.dragGroup) : above;
    };
    const canChildAt = (i) => { const pr = parentAt(i); return !hasRowsUnder && !!pr && canNest(drag.kind, drag.id, pr.dataset.dragId); };
    // Under Home (the control's links allow it, as core does) only ever with that movement,
    // even for a row that is already in a submenu.
    const isHome = (li) => (drag.kind === 'item' ? (itemById(li.dataset.dragId) || {}).pageId : li.dataset.dragId) === 'home';
    let depth = want === 1 && canChildAt(k) && (dx >= NEST_PX || !isHome(parentAt(k))) ? 1 : 0;
    // A top-level row can't sit in the middle of a submenu. It never joins the submenu for
    // that: it goes above or below the whole group, whichever is nearer. A row pulled out of
    // its own submenu goes below it.
    if (depth === 0 && rows[k] && depthOf(rows[k]) > 0) {
      let start = Math.max(k - 1, 0);
      while (start > 0 && depthOf(rows[start]) > 0) start--;
      let end = k;
      while (end < rows.length && depthOf(rows[end]) > 0) end++;
      const top = rows[start].getBoundingClientRect().top;
      const bottom = rows[end - 1].getBoundingClientRect().bottom;
      const own = rows[start].dataset.dragId === self.dataset.dragGroup;
      k = !own && ev.clientY < (top + bottom) / 2 ? start : end;
    }
    const prev = rows[k - 1] || null;
    const next = rows[k] || null;
    const parentRow = parentAt(k);
    // Dropping it where it already is changes nothing.
    if (k === all.indexOf(self) && depth === depthOf(self)) return;
    drag.target = {
      depth,
      parent: depth ? parentRow.dataset.dragId : '',
      before: next && depthOf(next) === depth ? next.dataset.dragId : null,
      prev: prev ? prev.dataset.dragId : null
    };
    const line = document.createElement('div');
    line.className = 'drop-line';
    line.style.top = ((next ? next.getBoundingClientRect().top : prev.getBoundingClientRect().bottom) - box.top - 2) + 'px';
    line.style.left = (8 + depth * 16) + 'px';
    drag.list.appendChild(line);
  }

  // The control's Page List and the pages under it can't be dragged. A try is logged once.
  let lockedDrag = null;
  let lockedDragged = false;
  document.addEventListener('pointerdown', (ev) => {
    const li = ev.target.closest && ev.target.closest('.navside li[data-locked]');
    lockedDrag = li && !(ev.button > 0) ? { what: li.dataset.locked, list: li.dataset.dragGroup, x: ev.clientX, y: ev.clientY, logged: false } : null;
    lockedDragged = false;
  });
  // Dragging one of the Page List's pages opens the Detach Page List dialog as soon as the drag
  // starts, wherever it's then let go of, as in WordPress (seen in a running editor).
  document.addEventListener('pointermove', (ev) => {
    if (!lockedDrag || lockedDrag.logged || Math.hypot(ev.clientX - lockedDrag.x, ev.clientY - lockedDrag.y) < 8) return;
    lockedDrag.logged = true;
    if (!itemById(lockedDrag.list) || ui.dialog) return;
    log('tried', 'Tried to drag ' + lockedDrag.what + ', which can’t be moved until the Page List is detached: the Detach Page List dialog opens');
    askConvert({ trigger: 'tried to drag ' + lockedDrag.what, itemId: lockedDrag.list });
  });
  function lockedDragEnd() {
    // The click that may follow a pointerup comes before this timer, and knows it was a drag.
    lockedDragged = !!(lockedDrag && lockedDrag.logged);
    lockedDrag = null;
    setTimeout(() => { lockedDragged = false; }, 0);
  }
  document.addEventListener('pointerup', lockedDragEnd);
  document.addEventListener('pointercancel', lockedDragEnd);

  document.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    if (drag.side) { sideDragMove(ev); return; }
    if (Math.abs(ev.clientY - drag.y) > 4) drag.moved = true;
    const sibs = [...drag.list.querySelectorAll('li[data-drag-id]')].filter((li) => li.dataset.dragGroup === drag.group);
    clearDropMarks();
    drag.target = null;
    drag.outside = outsideList(ev);
    if (drag.outside) return;
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

  // why: 'escape' | 'interrupted' when cancelled. A drag that moves nothing is logged, and
  // isn't counted as a reorder.
  function endDrag(ev, cancel, why) {
    if (!drag) return;
    const outside = drag.outside || (!cancel && !!ev && outsideList(ev));
    const d = drag;
    drag = null;
    // The click that follows a drag in the sidebar isn't a click on the row.
    // (It's forgotten once the pointer is let go: a drag cancelled with Escape still ends in a click.)
    if (d.side && d.moved) justDragged = true;
    clearDropMarks();
    root.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
    if (!cancel && !outside && d.target && d.moved) {
      if (d.side) navDrop(d.kind, d.id, d.target); else reorder(d.kind, d.id, d.target.id, d.target.after, 'drag');
      return;
    }
    // In the sidebar a press that didn't move is a click on the row, not a drag.
    if (d.side && !d.moved) return;
    const title = d.kind === 'item' ? (itemById(d.id) ? itemTitle(itemById(d.id)) : null) : (page(d.id) || {}).title;
    if (title == null) return;
    log('tried', 'Started dragging ' + q(title) + ' and ' + (why === 'escape' ? 'cancelled with Escape' : why === 'interrupted' ? 'the drag was interrupted' : outside ? 'dropped outside the list' : 'let go without moving it'));
  }
  document.addEventListener('pointerup', (ev) => endDrag(ev, false));
  document.addEventListener('pointerup', () => setTimeout(() => { justDragged = false; }, 0));
  document.addEventListener('pointercancel', (ev) => endDrag(ev, true, 'interrupted'));

  document.addEventListener('keydown', (ev) => {
    const h = ev.target.closest && ev.target.closest('.handle');
    if (!h || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return;
    ev.preventDefault();
    const dir = ev.key === 'ArrowUp' ? -1 : 1;
    const side = !!h.closest('.navside');
    const title = h.dataset.kind === 'item' ? (itemById(h.dataset.drag) || {}).label : (page(h.dataset.drag) || {}).title;
    const moved = step(h.dataset.kind, h.dataset.drag, dir, 'keys');
    if (!moved) {
      showToast(`Already ${dir < 0 ? 'first' : 'last'}`, false);
      log('tried', 'Tried to move ' + q(title) + (dir < 0 ? ' up' : ' down') + ' with the arrow keys on its handle' + (side ? ' in the sidebar' : '') + ', but it is already ' + (dir < 0 ? 'first' : 'last'));
    }
  });

  // ---------- The Navigation sidebar's fields ----------

  // A link's Text changes the menu as it's typed. When the field is left, what the typing
  // came to is logged; that can redraw the editor, so it waits until the click or key press
  // that took the person out of the field has been handled: a click on Finished isn't lost.
  let pointerIsDown = false;
  let afterPointer = null;
  document.addEventListener('pointerdown', () => { pointerIsDown = true; }, true);
  function pointerReleased() {
    pointerIsDown = false;
    if (afterPointer) { const fn = afterPointer; afterPointer = null; setTimeout(fn, 0); }
  }
  document.addEventListener('pointerup', pointerReleased, true);
  document.addEventListener('pointercancel', pointerReleased, true);

  document.addEventListener('focusout', (ev) => {
    if (ev.target.id !== 'nav-text' || !ui.typing) return;
    if (pointerIsDown) afterPointer = endTyping; else setTimeout(endTyping, 0);
  });

  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.id === 'nav-text') { typeLabel(t.dataset.item, t.value); return; }
    if (t.id === 'nav-create-title' && ui.navAdd) { ui.navAdd.title = t.value; t.removeAttribute('aria-invalid'); return; }
    // Search or type URL narrows the suggestions as you type, without redrawing.
    if (t.id === 'nav-linkto-input' && ui.linkEdit) { ui.linkEdit.text = t.value; t.parentElement.querySelector('.nav-apply').setAttribute('aria-disabled', t.value.trim() ? 'false' : 'true'); return; }
    // The Pages screen's Search narrows the list as you type.
    if (t.id === 'pages-search') { ui.pagesSearch = t.value; ui.more = null; const at = t.selectionStart; render(); const el = root.querySelector('#pages-search'); if (el) { el.focus(); el.setSelectionRange(at, at); } return; }
    if (t.id !== 'nav-search') return;
    if (ui.navAdd) { ui.navAdd.q = t.value; save(); }
    t.parentElement.querySelector('.nav-apply').setAttribute('aria-disabled', t.value.trim() ? 'false' : 'true');
    const want = t.value.trim().toLowerCase();
    t.closest('.nav-picker').querySelectorAll('.nav-results li').forEach((li) => { li.hidden = !li.firstElementChild.dataset.find.includes(want); });
  });

  // The save panel's ticks.
  document.addEventListener('change', (ev) => {
    const box = ev.target.closest && ev.target.closest('.savepanel [data-entity]');
    if (!box || !ui.savePanel) return;
    const key = box.dataset.entity;
    ui.savePanel.off = ui.savePanel.off.filter((k) => k !== key);
    if (!box.checked) ui.savePanel.off.push(key);
    log('save', (box.checked ? 'Ticked ' : 'Unticked ') + q(box.parentElement.textContent.trim()) + ' in the save panel');
  });

  // ---------- Tasks ----------

  const hasText = (s, want) => String(s || '').trim().toLowerCase() === want;

  // Task 7: a link to Rosa's Instagram: any case, with or without www. or m., a slash at the
  // end, or a query or fragment after it; not another account that starts the same.
  const INSTAGRAM = /(^|\/\/|\.)instagram\.com\/rosasbakery\/?($|[?#])/i;

  // Tasks 2 and 3 ask for Catering out of the menu, then back in it. Whether it has been out
  // is kept, apart, for the saved site and for the screen: Catering, published, missing from
  // the menu visitors see (saved), or from the menu on screen. It's noted after every change,
  // and on a reload, and stays noted: Undo, Redo, Save and reloading never clear it.
  function noteCateringOut() {
    const out = () => { const c = page('catering'); return !!c && c.status === 'publish' && !isShown('catering'); };
    if (!stats.catOutScreen && out()) stats.catOutScreen = true;
    if (!stats.catOutSaved && onSaved(out)) stats.catOutSaved = true;
  }

  // The five tasks right now, on screen (or, with saved, for the saved site): 1 is 0 (no
  // published page with "gift" in its title), 1 (published, not in the menu) or 2 (in it); the
  // rest are 1 or 0.
  function taskValues(saved) {
    const tree = shownMenu();
    const flat = shownFlat();
    const shown = (id) => flat.some((n) => n.pageId === id);
    const home = tree.findIndex((n) => n.pageId === 'home');
    // Any published page with "gift" in its title: Gift cards, Giftcards, Gift vouchers.
    const gift = state.pages.filter((p) => p.status === 'publish' && /gift/i.test(p.title));
    const catering = page('catering');
    const wasOut = saved ? stats.catOutSaved : stats.catOutScreen;
    const live = !!catering && catering.status === 'publish';
    return {
      1: !gift.length ? 0 : gift.some((p) => shown(p.id)) ? 2 : 1,
      // Catering has been out of the menu (see noteCateringOut) and is still published.
      2: wasOut && live ? 1 : 0,
      // ... and is back in it now.
      3: wasOut && live && shown('catering') ? 1 : 0,
      // Any label counts. B and F can't hold a link to another site, so it's always 0 there.
      4: flat.some((n) => n.url && INSTAGRAM.test(n.url)) ? 1 : 0,
      5: home >= 0 && tree[home + 1] && tree[home + 1].pageId === 'visit-us' ? 1 : 0
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
    { n: 1, text: 'Make and publish a Gift cards page, and get it into the menu.', hint: 'Ticks when a published page with “gift” in its title is in the header menu. Ask first: will a new page show in the menu by itself?', full: 2, state: (v) => THREE[v] },
    { n: 2, text: 'Take Catering out of the menu, but keep the page.', hint: 'Ticks when Catering has been out of the header menu while published, and is still published (it stays ticked when task 3 puts it back).', state: (v) => (v ? 'it has been out of the menu, and is published' : page('catering') && page('catering').status === 'publish' ? 'it hasn’t been out of the menu' : 'the page is in the trash') },
    { n: 3, text: 'Put Catering back in the menu.', hint: 'Ticks when Catering, after being out of the header menu, is in it again.', state: (v) => (v ? 'back in the menu' : 'not back in the menu') },
    { n: 4, text: 'Add Rosa’s Instagram page (instagram.com/rosasbakery) to the menu.', hint: IN_SIDEBAR ? 'Ticks when the header menu has a link to instagram.com/rosasbakery (with or without www., a slash at the end or a query), whatever its label.' : 'Doesn’t apply here: this prototype has no way to add a link to another site, so it is always 0.', state: (v) => (v ? 'the menu has a link to it' : 'the menu has no link to it') },
    { n: 5, text: 'Move Visit us to straight after Home.', hint: 'Ticks when Visit us is the top-level item right after Home in the header.', state: (v) => (v ? 'right after Home' : 'not right after Home') }
  ];

  // In the three sidebar arms the tasks are read from the saved site: a change to the menu
  // counts once it has been saved.
  const savedTaskValues = () => onSaved(() => taskValues(true));

  function checkTasks() {
    noteCateringOut();
    const values = savedTaskValues();
    TASKS.forEach((t, i) => {
      if (!t.n) return;
      const v = values[t.n];
      const mark = firstDone[i] || (firstDone[i] = {});
      // Task 1: note the first time the page is published, and what the menu did.
      if (t.full && v > 0 && !mark.published) {
        mark.published = elapsed();
        pendingTaskLines.push({ at: elapsed(), kind: 'task', text: 'Task ' + t.n + ': ' + THREE[v] });
      }
      if (v >= (t.full || 1) && !mark.at) {
        mark.at = elapsed();
        ticked[i] = true;
        pendingTaskLines.push({ at: elapsed(), kind: 'task', text: 'Task ' + t.n + ' reached' });
      }
    });
    // Normally the action's own log line takes these with it. This is the safety net.
    if (pendingTaskLines.length) setTimeout(flushTaskLines, 0);
  }

  // ---------- The completion code ----------

  /*
   * For pasting into an unmoderated testing tool. For example:
   *   OC-21111-mp140-d0.0-f35-r1.2-o0-n0-x0-u2.1-k3-g40-y30-e0-w0-v2.1-s412
   * OC, OA, OB, OF, OQ: the arm · the five tasks when Finished was clicked ·
   * m: the menu at the end (ma automatic, ml links, mv advanced and still adding pages,
   *    mx advanced with adding turned off; each with the seconds when it was converted.
   *    In OA nothing is converted: mv, with no seconds, while Auto add pages is on, and mx
   *    with the seconds when it was last turned off) ·
   * d: convert dialogs shown, confirmed · f: seconds until the first change to what the
   * menu shows (0 never) · r: reorders by drag, by Move up/down · n: whether Visit us was made to say Find us, no longer a task
   * (np page renamed, nl only a link's label, n0 neither) · x: pages in the trash ·
   * u: uses of Undo, of Redo · k: the arm's own count · g: seconds until the Pages screen was
   * first opened (sidebar arms; 0 never, always 0 in B and F) · e: times turned back at "Have you
   * done every task?" · w: unsaved menu changes at Finished · v: saves, save panels closed
   * without saving · s: seconds until Finished.
   * In the sidebar arms the tasks, m and n are read from the saved site; if the screen showed
   * different task digits they follow after a dot (21000.21111). The control's m: ma the Page
   * List alone, mp it has links (or a second Page List) beside it, ml detached, mr removed
   * without detaching.
   */
  function menuPart() {
    const m = state.menu;
    if (m.mode === 'automatic') return 'ma';
    if (ARM === 'control') {
      // The Page List alone; the Page List with links beside it; detached; or removed.
      const lists = m.items.filter(isPageList).length;
      if (lists) return isPlainPageList(m) ? 'ma' : 'mp' + m.mixedAt;
      return m.convertedAt != null ? 'ml' + m.convertedAt : 'mr' + m.removedAt;
    }
    if (m.mode === 'links') return 'ml' + m.convertedAt;
    // A Page List added with Add block (and not detached) in A or Q's advanced menu: a p
    // after mv / mx (mvp, mxp140), before the seconds.
    const p = m.items.some(isPageList) ? 'p' : '';
    if (STARTS_AS_LINKS) return m.autoAdd ? 'mv' + p : 'mx' + p + m.autoAddOffAt;
    return (m.autoAdd ? 'mv' : 'mx') + p + m.convertedAt;
  }

  function completionCode() {
    noteCateringOut();
    const digits = (v) => [1, 2, 3, 4, 5].map((n) => v[n]).join('');
    const saved = digits(savedTaskValues());
    const screen = digits(taskValues());
    return [
      ARMS[ARM].code,
      // The saved site; and, after a dot, what the screen showed if that was different.
      saved === screen ? saved : saved + '.' + screen,
      onSaved(menuPart),
      'd' + stats.dialogsShown + '.' + stats.dialogsConfirmed,
      'f' + stats.firstMenuChange,
      'r' + stats.dragReorders + '.' + stats.moveReorders,
      // Order… used to move a page in page order (Pages screen); always o0 in B and F.
      'o' + (stats.orderUses || 0),
      'n' + onSaved(renameHow),
      'x' + state.trashed.length,
      'u' + stats.undos + '.' + stats.redos,
      'k' + stats.own,
      // Seconds until the Pages screen was first opened (sidebar arms); always g0 in B and F.
      'g' + (stats.firstPages || 0),
      // Seconds until the site editor's Navigation screen was first opened; always y0 in B and F.
      'y' + (stats.firstNavScreen || 0),
      'e' + stats.finishBack,
      'w' + unsavedCount(),
      'v' + stats.saves + '.' + stats.panelCancels,
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
      // The bookkeeping is done as the dialog is told to close, not when its close event
      // arrives a moment later, so a reload or a key press straight after isn't missed.
      const closed = () => {
        if (!finishStep) return;
        const turnedBack = finishStep === 'ask';
        finishStep = null;
        if (turnedBack) { stats.finishBack++; log('task', 'Turned back at “Have you done every task?”'); }
        save();
        syncToast();
        const b = root.querySelector('[data-action="finish"]');
        if (b) b.focus();
      };
      finishEl.addEventListener('close', closed);
      finishEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-back]')) { finishEl.close(); closed(); return; }
        if (e.target.closest('[data-sure]')) { showCode(); return; }
        if (!e.target.closest('[data-copy-code]')) return;
        const input = finishEl.querySelector('textarea');
        copyText(input.value, input, 'Code copied', 'Select the code and copy it.');
      });
    }
    ui.pop = null; ui.more = null;
    finishStep = 'ask';
    syncToast();
    log('task', 'Clicked Finished and was asked whether every task is done');
    finishEl.innerHTML = '<h2 id="finish-title">Have you done every task?</h2><p>Finished is the last step. Only carry on if you’ve done everything you were asked to.</p>' +
      '<div class="finish-actions"><button type="button" class="btn btn-primary" data-sure>Yes, I’ve finished</button><button type="button" class="link" data-back>Not yet, keep editing</button></div>';
    if (!finishEl.open) finishEl.showModal();
    finishEl.querySelector('[data-back]').focus();
  }

  // Copying: the clipboard, or else the old way from a selected field. If that says no
  // (execCommand returns false) or throws, say how to do it by hand.
  function copyText(text, field, done, failed) {
    const oldWay = () => {
      let ok = false;
      let made = null;
      try {
        if (!field) {
          made = document.createElement('textarea');
          made.value = text;
          made.setAttribute('readonly', '');
          made.className = 'visually-hidden';
          (finishEl && finishEl.open ? finishEl : document.body).append(made);
        }
        (field || made).select();
        ok = document.execCommand('copy') === true;
      } catch (err) { ok = false; }
      if (made) made.remove();
      showToast(ok ? done : failed, false);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => showToast(done, false), oldWay);
    else oldWay();
  }

  function showCode() {
    finishStep = 'code';
    checkTasks();
    flushTaskLines();
    const code = completionCode();
    const waiting = unsavedCount();
    log('task', 'Finished' + (waiting ? ' with ' + waiting + ' unsaved menu ' + (waiting === 1 ? 'change' : 'changes') : '') + '. Code ' + code);
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
          copyText(text, null, 'Log copied', 'Couldn’t copy. Select the log and copy it.');
        }
        if (e.target.closest('[data-reset]')) { reset(); showToast('Back to how it started', false); }
      });
    }
    const scroll = notesEl.scrollTop;
    const suffix = location.hash === '#notes' ? '#notes' : '?notes';
    const links = Object.keys(ARMS).map((a) => `<a href="${ARMS[a].file}${suffix}" title="${esc(ARMS[a].name)}"${a === ARM ? ' aria-current="page"' : ''}>${ARMS[a].letter}</a>`).join('');
    noteCateringOut();
    const values = savedTaskValues();
    const screen = taskValues();
    const tasks = TASKS.map((t, i) => {
      const mark = firstDone[i] || {};
      // Done on screen but not saved: said apart from done.
      const waiting = t.n && screen[t.n] !== values[t.n];
      const onScreen = waiting ? ` <em class="unsaved">On screen, not saved: ${esc(t.state(screen[t.n]))}.</em>` : '';
      return `<li class="${ticked[i] ? 'is-done' : ''}${waiting ? ' is-unsaved' : ''}"><label><input type="checkbox" data-task="${i}"${ticked[i] ? ' checked' : ''}> ${t.text}</label>` +
        (mark.at ? ` <time>${mark.at}</time>` : '') +
        `<small>${t.hint}${t.state ? (IN_SIDEBAR ? ' Saved: ' : ' Now: ') + esc(onSaved(() => t.state(values[t.n]))) + '.' : ''}${onScreen}</small></li>`;
    }).join('');
    const m = IN_SIDEBAR ? state.saved.menu : state.menu;
    const lists = m.items.filter(isPageList).length;
    const menuNow = ARM === 'control' ? (lists ? (isPlainPageList(m) ? 'the Page List' : (lists > 1 ? lists + ' Page Lists' : 'the Page List') + (m.items.length > lists ? ' with links beside it' : '') + ', since ' + m.mixedAt + 's') : m.convertedAt != null ? 'links, detached at ' + m.convertedAt + 's' : 'the Page List was removed at ' + m.removedAt + 's')
      : m.mode === 'automatic' ? 'automatic' + (m.excluded.length ? ', ' + m.excluded.length + ' switched off' : '')
      : m.mode === 'links' ? 'links, since ' + m.convertedAt + 's'
      : STARTS_AS_LINKS ? 'links from the start; Auto add pages ' + (m.autoAdd ? 'on' : 'off, turned off at ' + m.autoAddOffAt + 's')
      : 'advanced, since ' + m.convertedAt + 's, ' + (m.autoAdd ? 'still adding new pages' : 'adding new pages turned off at ' + m.autoAddOffAt + 's');
    const own = { control: 'Times the Navigation sidebar was opened', 'auto-add': 'Times the Navigation sidebar was opened', 'menu-switches': 'Times the Navigation sidebar was opened', explained: 'Marker popovers opened', switches: 'Switches flipped' }[ARM];
    notesEl.innerHTML =
      `<div class="notes-head"><h2>${ARMS[ARM].letter} · Facilitator notes</h2><nav class="switcher" aria-label="Prototype">${links}</nav></div>` +
      `<p>${ARMS[ARM].name}. Only you can see this panel; open the page without <code>?notes</code> for participants.</p>` +
      `<h3>Tasks</h3><ol class="tasks">${tasks}</ol>` +
      '<h3>Counts</h3><dl>' +
      `<dt>${IN_SIDEBAR ? 'The saved menu' : 'The menu now'}</dt><dd>${esc(menuNow)}</dd>` +
      (IN_SIDEBAR ? `<dt>Unsaved menu changes</dt><dd>${unsavedCount()}</dd><dt>Saves; save panel closed without saving</dt><dd>${stats.saves}; ${stats.panelCancels}</dd>` : '') +
      `<dt>Convert dialogs shown, confirmed</dt><dd>${stats.dialogsShown}, ${stats.dialogsConfirmed}</dd>` +
      `<dt>First change to what the menu shows</dt><dd>${stats.firstMenuChange ? stats.firstMenuChange + 's' : 'not yet'}</dd>` +
      `<dt>Reorders by drag</dt><dd>${stats.dragReorders}</dd>` +
      `<dt>Reorders by Move up/down</dt><dd>${stats.moveReorders}</dd>` +
      `<dt>Pages in the trash</dt><dd>${state.trashed.length}</dd>` +
      `<dt>Uses of Undo${IN_SIDEBAR ? '; Redo' : ''}</dt><dd>${stats.undos}${IN_SIDEBAR ? '; ' + stats.redos : ''}</dd>` +
      `<dt>${own}</dt><dd>${stats.own}</dd>` +
      (IN_SIDEBAR ? `<dt>First opened the Pages screen</dt><dd>${stats.firstPages ? stats.firstPages + 's' : 'not yet'}</dd><dt>First opened the Navigation screen</dt><dd>${stats.firstNavScreen ? stats.firstNavScreen + 's' : 'not yet'}</dd><dt>Pages moved with Order…</dt><dd>${stats.orderUses || 0}</dd>` : '') +
      `<dt>Turned back at “Have you done every task?”</dt><dd>${stats.finishBack}</dd></dl>` +
      `<h3>Log</h3><ol class="log">${events.map((l) => `<li class="is-${l.kind}"><time>${l.at}</time>${esc(l.text)}</li>`).join('') || '<li>Nothing yet.</li>'}</ol>` +
      '<div class="actions"><button type="button" class="btn btn-small" data-copy>Copy log</button><button type="button" class="btn btn-small" data-reset>Reset</button></div>';
    notesEl.scrollTop = scroll;
  }

  // ---------- Start ----------

  if (!restore()) save();
  if (typingAtReload) { ui.typing = typingAtReload; typingAtReload = null; endTyping('typed before the page was reloaded'); }
  checkTasks();
  flushTaskLines();
  render();
})();
