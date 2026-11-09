/*
 * O'Keeffe · Pages and menus.
 *
 * One engine for every prototype. Each HTML page sets window.PROTOTYPE:
 *   variant: 'one-list' | 'toggles' | 'sections' | 'page-settings'
 *   start:   'chosen' | 'automatic' | 'two-menus'
 *
 * Menus work the way they do in WordPress:
 *   - an automatic menu is a Page List: every published page, in page order,
 *     child pages as dropdowns. New pages appear on their own.
 *   - a chosen menu is a list of page links and links. New pages don't.
 * The only way out of automatic is the switch core already has (Page List
 * "Convert to links"), offered as one confirm.
 */
(function () {
  'use strict';

  const CONFIG = Object.assign({ variant: 'one-list', start: 'chosen' }, window.PROTOTYPE || {});
  const SITE = 'rosasbakery.example';

  // ---------- Starting state ----------

  function startingState() {
    const pages = [
      { id: 'home', title: 'Home', status: 'publish', parent: null },
      { id: 'our-menu', title: 'Our menu', status: 'publish', parent: null },
      { id: 'about', title: 'About', status: 'publish', parent: null },
      { id: 'our-story', title: 'Our story', status: 'publish', parent: 'about' },
      { id: 'wholesale', title: 'Wholesale', status: 'publish', parent: 'about' },
      { id: 'visit-us', title: 'Visit us', status: 'publish', parent: null },
      { id: 'catering', title: 'Catering', status: 'publish', parent: null },
      { id: 'privacy-policy', title: 'Privacy policy', status: 'publish', parent: null },
      { id: 'thank-you', title: 'Thank you for your order', status: 'publish', parent: null },
      { id: 'holiday-orders', title: 'Holiday orders', status: 'draft', parent: null }
    ];
    const header = {
      id: 'header', name: 'Header menu', where: 'Top of every page', mode: 'chosen',
      items: [
        { type: 'page', pageId: 'home', depth: 0 },
        { type: 'page', pageId: 'our-menu', depth: 0 },
        { type: 'page', pageId: 'about', depth: 0 },
        { type: 'page', pageId: 'our-story', depth: 1 },
        { type: 'page', pageId: 'visit-us', depth: 0 }
      ]
    };
    const menus = [header];
    if (CONFIG.start === 'automatic') {
      header.mode = 'automatic';
      header.items = [];
    }
    if (CONFIG.start === 'two-menus') {
      menus.push({
        id: 'footer', name: 'Footer menu', where: 'Bottom of every page', mode: 'chosen',
        items: [
          { type: 'page', pageId: 'privacy-policy', depth: 0 },
          { type: 'page', pageId: 'visit-us', depth: 0 },
          { type: 'link', label: 'Instagram', url: 'instagram.com/rosasbakery', depth: 0 }
        ]
      });
    }
    return { pages, menus, fresh: [], seq: 1 };
  }

  function startingUi() {
    return {
      pop: null, more: null, dialog: null, current: 'home', device: 'desktop',
      phoneMenu: false, preview: true, flash: null, focus: null,
      selected: null, filter: 'all', freshLink: null
    };
  }

  let state = startingState();
  let ui = startingUi();
  let undo = null;
  let toastTimer = null;

  // ---------- Model helpers ----------

  const page = (id) => state.pages.find((p) => p.id === id);
  const menu = (id) => state.menus.find((m) => m.id === id);
  const header = () => state.menus[0];
  const clone = (x) => JSON.parse(JSON.stringify(x));

  // What an automatic menu shows: published pages in page order, children under parents.
  function automaticItems() {
    const live = state.pages.filter((p) => p.status === 'publish');
    const isTop = (p) => !p.parent || !live.some((q) => q.id === p.parent);
    const out = [];
    live.filter(isTop).forEach((t) => {
      out.push({ type: 'page', pageId: t.id, depth: 0 });
      live.filter((c) => c.parent === t.id).forEach((c) => out.push({ type: 'page', pageId: c.id, depth: 1 }));
    });
    return out;
  }
  const itemsOf = (m) => (m.mode === 'automatic' ? automaticItems() : m.items);
  const inMenu = (pageId, m) => itemsOf(m).some((i) => i.type === 'page' && i.pageId === pageId);
  const menusWith = (pageId) => state.menus.filter((m) => inMenu(pageId, m));
  const topLevelCount = (m) => itemsOf(m).filter((i) => i.depth === 0).length;
  const label = (item) => (item.type === 'link' ? item.label : (page(item.pageId) || {}).title);
  const slug = (p) => (p.id === 'home' ? '' : (p.parent ? p.parent + '/' : '') + p.id);
  const pageUrl = (p) => SITE + '/' + slug(p);
  const isFresh = (id) => state.fresh.includes(id);

  function makeId(title) {
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
    let id = base;
    while (page(id)) id = base + '-' + state.seq++;
    return id;
  }

  // A chosen menu stops taking new pages on its own, so pages made later are flagged New.
  function flagIfNeeded(id) {
    if (state.menus.some((m) => m.mode === 'chosen') && !state.menus.some((m) => inMenu(id, m))) {
      if (!state.fresh.includes(id)) state.fresh.push(id);
    }
  }

  // ---------- Changes (each one can be undone) ----------

  function change(fn, message) {
    const before = { state: clone(state), current: ui.current };
    fn();
    syncToggleMenu();
    undo = before;
    ui.more = null;
    render();
    if (message) showToast(message, true);
  }

  function addToMenu(pageId, menuId, place) {
    const m = menu(menuId);
    if (m.mode === 'automatic' || inMenu(pageId, m)) return;
    if (place && place !== 'end') {
      // Put it at the end of a top-level item's dropdown.
      let i = m.items.findIndex((it) => it.type === 'page' && it.pageId === place);
      if (i >= 0) {
        i += 1;
        while (i < m.items.length && m.items[i].depth > 0) i += 1;
        m.items.splice(i, 0, { type: 'page', pageId, depth: 1 });
      } else {
        m.items.push({ type: 'page', pageId, depth: 0 });
      }
    } else {
      m.items.push({ type: 'page', pageId, depth: 0 });
    }
    state.fresh = state.fresh.filter((x) => x !== pageId);
  }

  function removeItemAt(m, index) {
    const removed = m.items[index];
    m.items.splice(index, 1);
    // Its dropdown items move up a level rather than vanishing.
    if (removed && removed.depth === 0) {
      for (let i = index; i < m.items.length && m.items[i].depth > 0; i++) m.items[i].depth = 0;
    }
  }

  function removeFromMenu(pageId, menuId) {
    const m = menu(menuId);
    const i = m.items.findIndex((it) => it.type === 'page' && it.pageId === pageId);
    if (i >= 0) removeItemAt(m, i);
  }

  // The one switch out of automatic: the menu becomes today's pages as links.
  function convertToChosen(menuId) {
    const m = menu(menuId);
    m.items = automaticItems().map((i) => Object.assign({}, i));
    m.mode = 'chosen';
  }

  function moveItem(menuId, index, dir) {
    const m = menu(menuId);
    const items = m.items;
    const it = items[index];
    if (!it) return;
    if (it.depth > 0) {
      const j = index + dir;
      if (items[j] && items[j].depth > 0) { items[index] = items[j]; items[j] = it; }
      return;
    }
    const blockEnd = (start) => { let e = start + 1; while (e < items.length && items[e].depth > 0) e++; return e; };
    const end = blockEnd(index);
    const block = items.slice(index, end);
    if (dir < 0) {
      let p = index - 1;
      while (p >= 0 && items[p].depth > 0) p--;
      if (p < 0) return;
      items.splice(index, block.length);
      items.splice(p, 0, ...block);
    } else {
      if (end >= items.length) return;
      const nextEnd = blockEnd(end);
      const next = items.slice(end, nextEnd);
      items.splice(index, block.length + next.length, ...next, ...block);
    }
  }

  function indentItem(menuId, index) {
    const m = menu(menuId);
    const it = m.items[index];
    const hasChildren = m.items[index + 1] && m.items[index + 1].depth > 0;
    if (it && it.depth === 0 && index > 0 && !hasChildren) it.depth = 1;
  }

  function outdentItem(menuId, index) {
    const m = menu(menuId);
    const it = m.items[index];
    if (!it || it.depth === 0) return;
    m.items.splice(index, 1);
    let e = index;
    while (e < m.items.length && m.items[e].depth > 0) e++;
    it.depth = 0;
    m.items.splice(e, 0, it);
  }

  // In an automatic menu, order is page order: swap with the neighbouring sibling page.
  function movePageOrder(pageId, dir) {
    const p = page(pageId);
    const sibs = state.pages.filter((q) => q.parent === p.parent && q.status === 'publish');
    const k = sibs.indexOf(p) + dir;
    if (k < 0 || k >= sibs.length) return;
    const a = state.pages.indexOf(p);
    const b = state.pages.indexOf(sibs[k]);
    state.pages[a] = sibs[k];
    state.pages[b] = p;
  }

  function createPage(title, status, opts) {
    const id = makeId(title);
    state.pages.push({ id, title, status, parent: null });
    if (opts && opts.menuId) addToMenu(id, opts.menuId, opts.place);
    else flagIfNeeded(id);
    return id;
  }

  function publish(pageId) {
    page(pageId).status = 'publish';
  }

  function trash(pageId) {
    state.menus.forEach((m) => {
      if (m.mode === 'automatic') return;
      for (let i = m.items.length - 1; i >= 0; i--) {
        if (m.items[i].type === 'page' && m.items[i].pageId === pageId) removeItemAt(m, i);
      }
    });
    state.pages.forEach((p) => { if (p.parent === pageId) p.parent = null; });
    state.pages = state.pages.filter((p) => p.id !== pageId);
    state.fresh = state.fresh.filter((x) => x !== pageId);
    if (ui.current === pageId) ui.current = 'home';
    if (ui.selected === pageId) ui.selected = null;
  }

  // ---------- Small render helpers ----------

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const ICON = {
    page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    lines: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h9"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    grip: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    burger: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };

  function btn(action, text, data, cls) {
    const attrs = Object.entries(data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
    return `<button type="button" class="btn ${cls || ''}" data-action="${action}"${attrs} data-focus="${esc(action + ':' + Object.values(data || {}).join(':'))}">${text}</button>`;
  }

  function markerHtml(kind, key, title, expanded) {
    const words = { in: 'in your menu', auto: 'in your menu automatically', pending: 'joins your menu when published', out: 'not in your menu' }[kind];
    return `<button type="button" class="marker ${kind}" data-action="pop" data-key="${esc(key)}" data-focus="pop:${esc(key)}" aria-expanded="${expanded ? 'true' : 'false'}" aria-label="${esc(title)}: ${words}"><span class="marker-face">${ICON.lines}</span></button>`;
  }

  function moreButton(key, title) {
    return `<button type="button" class="icon-btn" data-action="more" data-key="${esc(key)}" data-focus="more:${esc(key)}" aria-label="More actions for ${esc(title)}" aria-expanded="${ui.more === key ? 'true' : 'false'}">${ICON.more}</button>`;
  }

  // ---------- Rows for the one-list and sections variants ----------

  // Every page in one list: menu items first, in menu order (so the list reads like the header),
  // then every other page in page order, after a gap.
  function listRows() {
    const rows = [];
    const seen = new Set();
    state.menus.forEach((m) => {
      itemsOf(m).forEach((item, index) => {
        if (item.type === 'link') {
          rows.push({ key: `link:${m.id}:${index}`, kind: 'link', item, menuId: m.id, index, depth: item.depth });
          return;
        }
        if (seen.has(item.pageId)) return;
        seen.add(item.pageId);
        rows.push({ key: `page:${item.pageId}`, kind: 'page', pageId: item.pageId, menuId: m.id, index, depth: item.depth });
      });
    });
    let first = true;
    state.pages.forEach((p) => {
      if (seen.has(p.id)) return;
      rows.push({ key: `page:${p.id}`, kind: 'page', pageId: p.id, depth: 0, rest: true, gap: first && rows.length > 0 });
      first = false;
    });
    return rows;
  }

  function markerKind(p) {
    const ms = menusWith(p.id);
    if (ms.length) {
      if (p.status === 'draft') return 'pending';
      return ms.every((m) => m.mode === 'automatic') ? 'auto' : 'in';
    }
    if (p.status === 'draft' && state.menus.some((m) => m.mode === 'automatic')) return 'pending';
    return 'out';
  }

  function popoverFor(row) {
    const two = state.menus.length > 1;
    if (row.kind === 'link') {
      const m = menu(row.menuId);
      return {
        title: `A link in your ${m.name.toLowerCase()}`,
        text: `Goes to <code>${esc(row.item.url)}</code>. It isn't a page on your site.`,
        actions: btn('remove-link', 'Remove from menu', { menu: row.menuId, index: row.index })
      };
    }
    const p = page(row.pageId);
    const kind = markerKind(p);
    const ms = menusWith(p.id);
    const auto = header().mode === 'automatic';

    if (two) {
      const checks = state.menus.map((m) => `
        <label class="check"><input type="checkbox" data-action="toggle-menu" data-page="${esc(p.id)}" data-menu="${esc(m.id)}" data-focus="toggle-menu:${esc(p.id)}:${esc(m.id)}" ${inMenu(p.id, m) ? 'checked' : ''}> ${esc(m.name)} <small>${esc(m.where)}</small></label>`).join('');
      const text = p.status === 'draft'
        ? 'This is a draft. Menus you tick will show it once it\'s published.'
        : ms.length ? `Visitors see "${esc(p.title)}" in the menus ticked below.` : `"${esc(p.title)}" is live at <code>${esc(pageUrl(p))}</code>, but it isn't in any menu. Tick a menu to show it there.`;
      const extra = p.status === 'draft' ? btn('publish', 'Publish now', { page: p.id }, 'btn-small') : '';
      return { title: ms.length ? 'Shown in' : 'Not in a menu', text, checks, actions: extra };
    }

    const m = header();
    if (kind === 'auto') {
      return {
        title: 'In your menu automatically',
        text: `Your header menu lists every published page, so "${esc(p.title)}" shows there too.`,
        actions: btn('ask-convert', 'Remove from menu', { page: p.id, menu: m.id }, 'btn-small')
      };
    }
    if (kind === 'pending' && auto) {
      return {
        title: 'Joins your menu when published',
        text: 'Your header menu shows every published page, so this draft will appear in it as soon as you publish it.',
        actions: btn('publish', 'Publish now', { page: p.id }, 'btn-small btn-primary')
      };
    }
    if (kind === 'pending') {
      return {
        title: 'In your menu once published',
        text: 'It has a place in the header, but visitors won\'t see it until you publish the page.',
        actions: btn('publish', 'Publish now', { page: p.id }, 'btn-small btn-primary') + btn('remove', 'Remove from menu', { page: p.id, menu: m.id }, 'btn-small')
      };
    }
    if (kind === 'in') {
      return {
        title: 'In your header menu',
        text: `Visitors see "${esc(p.title)}" at the top of every page.`,
        actions: btn('remove', 'Remove from menu', { page: p.id, menu: m.id }, 'btn-small')
      };
    }
    // out
    const fresh = isFresh(p.id);
    const text = p.status === 'draft'
      ? 'This draft isn\'t in the header. Add it now and it will appear once you publish it.'
      : `"${esc(p.title)}" is live at <code>${esc(pageUrl(p))}</code>, but visitors won't find it in the header. Links and search still reach it.` +
        (fresh ? ' New pages aren\'t added to your menu on their own, because you choose its pages.' : '');
    return {
      title: 'Not in your menu',
      text,
      actions: btn('add', 'Add to menu', { page: p.id, menu: m.id }, 'btn-small btn-primary') + (fresh ? btn('dismiss', 'Keep it out', { page: p.id }, 'btn-small') : '')
    };
  }

  function moreMenuFor(row) {
    if (CONFIG.variant === 'toggles') return moreMenuHtml(toggleMoreItems(row));
    const items = [];
    if (row.kind === 'link') {
      items.push(['move-up', 'Move up', { menu: row.menuId, index: row.index }]);
      items.push(['move-down', 'Move down', { menu: row.menuId, index: row.index }]);
      items.push(['remove-link', 'Remove from menu', { menu: row.menuId, index: row.index }]);
    } else {
      const p = page(row.pageId);
      const m = row.menuId ? menu(row.menuId) : null;
      if (m && !row.rest && m.mode === 'chosen') {
        items.push(['move-up', 'Move up', { menu: m.id, index: row.index }]);
        items.push(['move-down', 'Move down', { menu: m.id, index: row.index }]);
        if (row.depth === 0 && row.index > 0) items.push(['indent', 'Move into the dropdown above', { menu: m.id, index: row.index }]);
        if (row.depth > 0) items.push(['outdent', 'Move out of the dropdown', { menu: m.id, index: row.index }]);
        items.push('hr');
      }
      if (m && !row.rest && m.mode === 'automatic') {
        items.push(['page-up', 'Move up', { page: p.id }]);
        items.push(['page-down', 'Move down', { page: p.id }]);
        items.push('hr');
      }
      items.push(['view', 'View on site', { page: p.id }]);
      if (p.status === 'draft') items.push(['publish', 'Publish', { page: p.id }]);
      if (p.id !== 'home') items.push(['ask-trash', 'Move to trash', { page: p.id }, 'danger']);
    }
    return moreMenuHtml(items);
  }

  function moreMenuHtml(items) {
    return `<div class="moremenu" role="menu">${items.map((it) => {
      if (it === 'hr') return '<hr>';
      const [action, text, data, cls] = it;
      const attrs = Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
      return `<button type="button" role="menuitem" class="${cls || ''}" data-action="${action}"${attrs}>${text}</button>`;
    }).join('')}</div>`;
  }

  function rowBadges(p) {
    let b = '';
    if (p.status === 'draft') b += '<span class="badge draft">Draft</span>';
    if (isFresh(p.id)) b += '<span class="badge new">New</span>';
    if (state.menus.length > 1) {
      menusWith(p.id).forEach((m) => { b += `<span class="badge chip">${esc(m.name.replace(' menu', ''))}</span>`; });
    }
    return b;
  }

  function oneListRowHtml(row) {
    const flash = ui.flash === row.key ? ' flash' : '';
    if (row.kind === 'link') {
      const pop = ui.pop === row.key ? popHtml(popoverFor(row)) : '';
      return `<li class="row${flash}" data-row="${esc(row.key)}">
        <div class="row-main">
          <span class="indent" style="width:${row.depth * 20}px"></span>
          <span class="row-icon" style="color:var(--blue)">${ICON.link}</span>
          <span class="row-text"><span class="row-title">${esc(row.item.label)}</span>${state.menus.length > 1 ? `<span class="badge chip">${esc(menu(row.menuId).name.replace(' menu', ''))}</span>` : ''}<span class="row-meta">Link · ${esc(row.item.url)}</span></span>
          ${markerHtml('in', row.key, row.item.label, ui.pop === row.key)}
          ${moreButton(row.key, row.item.label)}
        </div>${ui.more === row.key ? moreMenuFor(row) : ''}${pop}</li>`;
    }
    const p = page(row.pageId);
    const kind = markerKind(p);
    const dim = kind === 'out' ? ' dim' : '';
    const pop = ui.pop === row.key ? popHtml(popoverFor(row)) : '';
    return `<li class="row${dim}${flash}${row.gap ? ' gap-before' : ''}" data-row="${esc(row.key)}">
      <div class="row-main">
        <span class="indent" style="width:${row.depth * 20}px"></span>
        <span class="row-icon">${ICON.page}</span>
        <span class="row-text"><span class="row-title">${esc(p.title)}</span>${rowBadges(p)}</span>
        ${markerHtml(kind, row.key, p.title, ui.pop === row.key)}
        ${moreButton(row.key, p.title)}
      </div>${ui.more === row.key ? moreMenuFor(row) : ''}${pop}</li>`;
  }

  function popHtml(pop) {
    return `<div class="pop" role="dialog" aria-label="${esc(pop.title)}">
      <p class="pop-title">${pop.title}</p>
      <p class="pop-text">${pop.text}</p>
      ${pop.checks ? `<div>${pop.checks}</div>` : ''}
      <div class="pop-actions">${pop.actions || ''}${btn('close-pop', 'Close', {}, 'btn-small')}</div>
    </div>`;
  }

  function legendHtml() {
    const auto = header().mode === 'automatic';
    return `<div class="legend" aria-hidden="true">
      <span><span class="marker ${auto ? 'auto' : 'in'}"><span class="marker-face">${ICON.lines}</span></span>${auto ? 'In your menu automatically' : 'In your menu'}</span>
      <span><span class="marker pending"><span class="marker-face">${ICON.lines}</span></span>When published</span>
      ${auto ? '' : `<span><span class="marker out"><span class="marker-face">${ICON.lines}</span></span>Not in your menu</span>`}
    </div>`;
  }

  function panelHead(extra) {
    const n = state.pages.length;
    const inHeader = itemsOf(header()).filter((i) => i.type === 'page').length;
    return `<div class="panel-head">
      <span class="panel-count">${n} pages · ${inHeader} in your header menu</span>
      <span class="panel-actions">${extra || ''}${btn('ask-add', 'Add page', {}, 'btn-small btn-dark')}</span>
    </div>`;
  }

  function freshBanner() {
    const n = state.fresh.length;
    if (!n || CONFIG.variant === 'page-settings') return '';
    return `<div class="banner"><strong>${n === 1 ? '1 new page isn\'t' : n + ' new pages aren\'t'} in your menu</strong>
      You choose your menu's pages, so new ones aren't added on their own. ${CONFIG.variant === 'one-list' ? 'They\'re marked New in the list.' : CONFIG.variant === 'toggles' ? 'They\'re marked New, with their switch off.' : 'They\'re in Other pages, marked New.'}</div>`;
  }

  function autoBanner() {
    if (header().mode !== 'automatic') return '';
    return '<div class="banner"><strong>Your header menu shows all pages automatically</strong>New pages join it as soon as they\'re published. Use a page\'s ⋮ menu to change the order.</div>';
  }

  function renderOneList() {
    const rows = listRows();
    return `${panelHead(btn('ask-link', 'Add link', {}, 'btn-small'))}
      ${autoBanner()}${freshBanner()}
      <ul class="list" aria-label="Pages">${rows.map(oneListRowHtml).join('')}</ul>
      ${legendHtml()}`;
  }

  // ---------- Toggles variant (every page, a switch on each) ----------

  // The list is the menu's order. Pages are in page order, child pages under their parent, and
  // switched-on pages appear in the header menu in that same order, child pages in their parent's
  // dropdown. So reordering the list (drag, or ⋮) reorders the menu, and a switch never moves a row.
  // That's a Page List with a switch on each page, stored as a chosen menu.
  function pageTreeRows() {
    const rows = [];
    const isTop = (p) => !p.parent || !page(p.parent);
    state.pages.filter(isTop).forEach((t) => {
      rows.push({ p: t, depth: 0 });
      state.pages.filter((c) => c.parent === t.id).forEach((c) => rows.push({ p: c, depth: 1 }));
    });
    return rows;
  }

  // Rebuild the header from the list: the pages that are on, in list order, then any links.
  function syncToggleMenu() {
    const m = header();
    if (CONFIG.variant !== 'toggles' || m.mode !== 'chosen') return;
    const on = new Set(m.items.filter((i) => i.type === 'page').map((i) => i.pageId));
    const links = m.items.filter((i) => i.type === 'link').map((l) => Object.assign(l, { depth: 0 }));
    m.items = pageTreeRows().filter((r) => on.has(r.p.id))
      .map((r) => ({ type: 'page', pageId: r.p.id, depth: r.depth && on.has(r.p.parent) ? 1 : 0 }))
      .concat(links);
  }

  const siblingsOf = (p) => state.pages.filter((q) => (q.parent && page(q.parent) ? q.parent : null) === (p.parent && page(p.parent) ? p.parent : null));

  // Move a page before or after a sibling. Child pages go with their parent.
  function placePage(pageId, targetId, after) {
    const p = page(pageId);
    if (!p || pageId === targetId) return;
    state.pages.splice(state.pages.indexOf(p), 1);
    const i = state.pages.indexOf(page(targetId));
    state.pages.splice(after ? i + 1 : i, 0, p);
  }

  function stepPage(pageId, dir) {
    const sibs = siblingsOf(page(pageId));
    const k = sibs.findIndex((q) => q.id === pageId) + dir;
    if (k < 0 || k >= sibs.length) return false;
    placePage(pageId, sibs[k].id, dir > 0);
    return true;
  }

  // The top-level page just above, which this one could go under.
  function pageAbove(p) {
    if (p.parent || p.id === 'home' || state.pages.some((q) => q.parent === p.id)) return null;
    const sibs = siblingsOf(p);
    const k = sibs.indexOf(p);
    return k > 0 && sibs[k - 1].id !== 'home' ? sibs[k - 1] : null;
  }

  function toggleMoreItems(row) {
    const m = header();
    if (row.kind === 'link') return [['remove-link', 'Remove from menu', { menu: row.menuId, index: row.index }]];
    const p = page(row.pageId);
    const items = [];
    const sibs = siblingsOf(p);
    const k = sibs.indexOf(p);
    if (k > 0) items.push(['page-step', 'Move up', { page: p.id, dir: -1 }]);
    if (k < sibs.length - 1) items.push(['page-step', 'Move down', { page: p.id, dir: 1 }]);
    const above = pageAbove(p);
    if (above) items.push(['page-nest', `Put under ${esc(above.title)}`, { page: p.id, parent: above.id }]);
    if (p.parent && page(p.parent)) items.push(['page-unnest', `Take out from under ${esc(page(p.parent).title)}`, { page: p.id }]);
    if (items.length) items.push('hr');
    items.push(['view', 'View on site', { page: p.id }]);
    if (p.status === 'draft') items.push(['publish', 'Publish', { page: p.id }]);
    if (p.id !== 'home') items.push(['ask-trash', 'Move to trash', { page: p.id }, 'danger']);
    return items;
  }

  function menuPlace(p, m) {
    const items = itemsOf(m);
    const i = items.findIndex((it) => it.type === 'page' && it.pageId === p.id);
    if (i < 0) return null;
    if (items[i].depth > 0) {
      let j = i - 1;
      while (j >= 0 && items[j].depth > 0) j--;
      return { index: i, depth: items[i].depth, under: j >= 0 ? label(items[j]) : null };
    }
    return { index: i, depth: 0, under: null };
  }

  function toggleRowHtml({ p, depth }) {
    const m = header();
    const key = keyRow(p.id);
    const on = inMenu(p.id, m);
    const place = menuPlace(p, m);
    const auto = m.mode === 'automatic';
    let meta = '';
    if (on && p.status === 'draft') meta = 'Shows in the menu once published';
    else if (!on && p.status === 'draft' && auto) meta = 'Joins the menu when published';
    else if (place && place.under) meta = `In the ${place.under} dropdown`;
    const row = place
      ? { key, kind: 'page', pageId: p.id, menuId: m.id, index: place.index, depth: place.depth }
      : { key, kind: 'page', pageId: p.id, rest: true, depth: 0 };
    const pending = !on && p.status === 'draft' && auto;
    const parent = p.parent && page(p.parent) ? p.parent : '';
    return `<li class="row${on || pending ? '' : ' dim'}${ui.flash === key ? ' flash' : ''}" data-row="${esc(key)}" data-page="${esc(p.id)}" data-parent="${esc(parent)}">
      <div class="row-main">
        <button type="button" class="handle" data-drag="${esc(p.id)}" data-focus="drag:${esc(p.id)}" aria-label="Reorder ${esc(p.title)}. Use the up and down arrow keys, or drag." aria-describedby="reorder-hint">${ICON.grip}</button>
        <span class="indent" style="width:${depth * 20}px"></span>
        <span class="row-icon">${ICON.page}</span>
        <span class="row-text"><span class="row-title">${esc(p.title)}</span>${rowBadges(p)}${meta ? `<span class="row-meta">${esc(meta)}</span>` : ''}</span>
        <button type="button" class="switch menu-switch${auto && on ? ' auto' : ''}" aria-pressed="${on}" data-action="switch-menu" data-page="${esc(p.id)}" data-menu="${esc(m.id)}" data-focus="sw:${esc(p.id)}" aria-label="Show ${esc(p.title)} in your header menu"><span class="switch-track"></span></button>
        ${moreButton(key, p.title)}
      </div>${ui.more === key ? moreMenuFor(row) : ''}</li>`;
  }

  function renderToggles() {
    const m = header();
    const auto = m.mode === 'automatic';
    return `${panelHead(btn('ask-link', 'Add link', {}, 'btn-small'))}
      ${autoBanner()}${freshBanner()}
      <div class="toggle-list">
        <div class="toggle-head" aria-hidden="true"><span>Page</span><span>In menu</span></div>
        <span id="reorder-hint" class="visually-hidden">Your header menu follows the order of this list.</span>
        <ul class="list" aria-label="Pages">${pageTreeRows().map(toggleRowHtml).join('')}</ul>
      </div>
      ${m.items.some((i) => i.type === 'link') && !auto ? `<div class="group"><div class="group-head"><h2 class="group-title">Links in your menu</h2></div>
        <ul class="list">${m.items.map((it, index) => it.type !== 'link' ? '' : oneListRowHtml({ key: `link:${m.id}:${index}`, kind: 'link', item: it, menuId: m.id, index, depth: 0 })).join('')}</ul></div>` : ''}
      <p class="footnote">${auto ? 'Your header menu shows every published page. Switch one off to choose the menu\'s pages yourself.' : 'Switched-on pages show in your header menu in the order of this list. Drag a page by its handle to reorder, or use its ⋮ menu to move it or put it under another page. Pages that are off are still live at their address.'}</p>`;
  }

  // ---------- Sections variant (In your menu / Other pages) ----------

  function sectionRowHtml(m, item, index) {
    const key = item.type === 'link' ? `link:${m.id}:${index}` : `page:${item.pageId}:${m.id}`;
    const row = item.type === 'link'
      ? { key, kind: 'link', item, menuId: m.id, index, depth: item.depth }
      : { key, kind: 'page', pageId: item.pageId, menuId: m.id, index, depth: item.depth };
    const title = label(item);
    const p = item.type === 'page' ? page(item.pageId) : null;
    const removeAction = item.type === 'link'
      ? `data-action="remove-link" data-menu="${esc(m.id)}" data-index="${index}"`
      : `data-action="${m.mode === 'automatic' ? 'ask-convert' : 'remove'}" data-page="${esc(item.pageId)}" data-menu="${esc(m.id)}"`;
    return `<li class="row${ui.flash === key ? ' flash' : ''}" data-row="${esc(key)}">
      <div class="row-main">
        <span class="indent" style="width:${item.depth * 20}px"></span>
        <span class="row-icon"${item.type === 'link' ? ' style="color:var(--blue)"' : ''}>${item.type === 'link' ? ICON.link : ICON.page}</span>
        <span class="row-text"><span class="row-title">${esc(title)}</span>${p ? rowBadges(p) : ''}${item.type === 'link' ? `<span class="row-meta">Link · ${esc(item.url)}</span>` : ''}${item.depth ? '<span class="row-meta">In a dropdown</span>' : ''}</span>
        <button type="button" class="icon-btn" ${removeAction} data-focus="rm:${esc(key)}" aria-label="Remove ${esc(title)} from ${esc(m.name.toLowerCase())}">${ICON.minus}</button>
        ${moreButton(key, title)}
      </div>${ui.more === key ? moreMenuFor(row) : ''}</li>`;
  }

  function renderSections() {
    let html = panelHead('') + autoBanner() + freshBanner();
    const two = state.menus.length > 1;
    state.menus.forEach((m) => {
      const items = itemsOf(m);
      const auto = m.mode === 'automatic';
      html += `<section class="group menu${auto ? ' auto' : ''}" aria-label="${esc(two ? m.name : 'In your menu')}">
        <div class="group-head"><h2 class="group-title">${esc(two ? m.name : 'In your menu')}</h2><span class="tag blue">${esc(two ? m.where : m.name.replace(' menu', ''))}</span>${auto ? '<span class="tag blue">Automatic</span>' : ''}</div>
        ${items.length ? `<ul class="list">${items.map((it, i) => sectionRowHtml(m, it, i)).join('')}</ul>` : '<div class="empty">Nothing in this menu yet.</div>'}
        ${auto ? '' : `<div class="group-foot">
          <button type="button" class="add-btn" data-action="ask-add" data-menu="${esc(m.id)}" data-focus="ask-add:${esc(m.id)}">+ New page in menu</button>
          <button type="button" class="add-btn" data-action="ask-link" data-menu="${esc(m.id)}" data-focus="ask-link:${esc(m.id)}">+ Link</button></div>`}
      </section>`;
    });
    const other = state.pages.filter((p) => !menusWith(p.id).length);
    html += `<section class="group" aria-label="Other pages">
      <div class="group-head"><h2 class="group-title">Other pages</h2></div>
      <div class="group-sub">${header().mode === 'automatic' ? 'Every published page is in your menu. Drafts wait here until they\'re published.' : 'Live on your site with their own address, just not in a menu.'}</div>
      ${other.length ? `<ul class="list">${other.map((p) => {
        const key = `page:${p.id}`;
        const row = { key, kind: 'page', pageId: p.id, rest: true, depth: 0 };
        const canAdd = state.menus.some((m) => m.mode === 'chosen');
        const addBtn = canAdd
          ? (two
            ? `<button type="button" class="icon-btn add" data-action="pop" data-key="${esc(key)}" data-focus="pop:${esc(key)}" aria-expanded="${ui.pop === key}" aria-label="Add ${esc(p.title)} to a menu">${ICON.plus}</button>`
            : `<button type="button" class="icon-btn add" data-action="add" data-page="${esc(p.id)}" data-menu="${esc(header().id)}" data-focus="add:${esc(p.id)}" aria-label="Add ${esc(p.title)} to your menu">${ICON.plus}</button>`)
          : '';
        return `<li class="row${ui.flash === key ? ' flash' : ''}" data-row="${esc(key)}">
          <div class="row-main">
            <span class="row-icon">${ICON.page}</span>
            <span class="row-text"><span class="row-title">${esc(p.title)}</span>${rowBadges(p)}${p.status === 'draft' && !canAdd ? '<span class="row-meta">Joins the menu when published</span>' : ''}</span>
            ${addBtn}${moreButton(key, p.title)}
          </div>${ui.more === key ? moreMenuFor(row) : ''}${ui.pop === key ? popHtml(popoverFor(row)) : ''}</li>`;
      }).join('')}</ul>` : '<div class="empty">Every page is in a menu.</div>'}
      <div class="group-foot"><button type="button" class="add-btn" data-action="ask-add" data-focus="ask-add:other">+ New page</button></div>
    </section>
    <p class="footnote">Pages outside the menu are still public at their address and can show in search results.</p>`;
    return html;
  }

  // ---------- Page settings variant (route 2 control) ----------

  function menuText(p) {
    const parts = [];
    state.menus.forEach((m) => {
      const items = itemsOf(m);
      const i = items.findIndex((it) => it.type === 'page' && it.pageId === p.id);
      if (i < 0) return;
      let s = m.name.replace(' menu', '');
      if (items[i].depth > 0) {
        let j = i - 1;
        while (j >= 0 && items[j].depth > 0) j--;
        if (j >= 0) s += ' › ' + label(items[j]);
      }
      parts.push(s);
    });
    return parts.join(', ');
  }

  function placeOptions(m, selected) {
    const tops = itemsOf(m).filter((i) => i.depth === 0 && i.type === 'page');
    return `<option value="end"${selected === 'end' ? ' selected' : ''}>At the end</option>` +
      tops.map((t) => `<option value="${esc(t.pageId)}"${selected === t.pageId ? ' selected' : ''}>Under ${esc(label(t))}</option>`).join('');
  }

  function renderPageSettings() {
    if (ui.selected && page(ui.selected)) {
      const p = page(ui.selected);
      const menusHtml = state.menus.map((m) => {
        const on = inMenu(p.id, m);
        return `<div class="toggle-row">
          <div><strong>Show in ${esc(m.name.toLowerCase())}</strong><span>${esc(m.where)}</span></div>
          <button type="button" class="switch" aria-pressed="${on}" data-action="${on ? 'remove' : 'add'}" data-page="${esc(p.id)}" data-menu="${esc(m.id)}" data-focus="sw:${esc(m.id)}" aria-label="Show ${esc(p.title)} in ${esc(m.name.toLowerCase())}"><span class="switch-track"></span></button>
        </div>`;
      }).join('');
      return `<div class="settings">
        <button type="button" class="back" data-action="close-settings" data-focus="close-settings">‹ All pages</button>
        <div class="field"><label for="rename">Title</label><input type="text" id="rename" value="${esc(p.title)}" data-focus="rename"></div>
        <div class="field"><span class="label">Address</span><span class="hint">${esc(pageUrl(p))}</span></div>
        <div class="field"><span class="label">Status</span><span class="hint">${p.status === 'draft' ? 'Draft · only you can see it' : 'Published'}</span>${p.status === 'draft' ? btn('publish', 'Publish', { page: p.id }, 'btn-small btn-primary') : ''}</div>
        <div class="card"><span class="label" style="font-weight:600">Menu</span>${menusHtml}
          <span class="hint" style="font-size:12px;color:var(--ink-3)">${menusWith(p.id).length ? 'Shown as: ' + esc(menuText(p)) : 'Not in a menu. The page is still live at its address.'}</span></div>
        ${p.id !== 'home' ? btn('ask-trash', 'Move to trash', { page: p.id }, 'btn-small') : ''}
      </div>`;
    }
    const counts = { all: state.pages.length, in: state.pages.filter((p) => menusWith(p.id).length).length };
    counts.out = counts.all - counts.in;
    const shown = state.pages.filter((p) => ui.filter === 'all' || (ui.filter === 'in') === !!menusWith(p.id).length);
    return `${panelHead('')}
      <div class="filters" role="group" aria-label="Filter pages">
        ${[['all', 'All'], ['in', 'In a menu'], ['out', 'Not in a menu']].map(([k, t]) => `<button type="button" aria-pressed="${ui.filter === k}" data-action="filter" data-value="${k}" data-focus="filter:${k}">${t} · ${counts[k]}</button>`).join('')}
      </div>
      <div class="table"><div class="table-inner">
        <div class="trow head"><span>Title</span><span>Status</span><span>Menu</span><span></span></div>
        ${shown.map((p) => {
          const key = `page:${p.id}`;
          const mt = menuText(p);
          return `<div class="trow${ui.flash === key ? ' flash' : ''}" style="position:relative">
            <button type="button" class="link-btn" data-action="open-settings" data-page="${esc(p.id)}" data-focus="open:${esc(p.id)}">${esc(p.title)}</button>
            <span class="muted">${p.status === 'draft' ? 'Draft' : 'Published'}</span>
            <span class="${mt ? '' : 'muted'}">${esc(mt || 'Not in a menu')}</span>
            ${moreButton(key, p.title)}
            ${ui.more === key ? moreMenuFor({ key, kind: 'page', pageId: p.id, rest: true }) : ''}
          </div>`;
        }).join('')}
      </div></div>`;
  }

  // ---------- Dialogs ----------

  function dialogHtml() {
    const d = ui.dialog;
    if (!d) return '';
    let body = '';
    if (d.type === 'add') {
      const m = d.menuId ? menu(d.menuId) : null;
      let routeTwo = '';
      if (CONFIG.variant === 'page-settings') {
        const target = menu(d.target || 'header');
        const on = d.toMenu !== false;
        routeTwo = `<div class="card">
          <div class="toggle-row"><div><strong id="tm-label">Add to menu</strong><span>On by default while your header menu is short. It has ${topLevelCount(header())} items.</span></div>
            <button type="button" class="switch" aria-pressed="${on}" aria-labelledby="tm-label" data-action="dlg-toggle" data-focus="dlg-toggle"><span class="switch-track"></span></button></div>
          ${on ? `${state.menus.length > 1 ? `<div class="field"><span class="label">Which menu</span><div class="radio-row">${state.menus.map((mm) => `<label><input type="radio" name="dlg-menu" value="${esc(mm.id)}" data-action="dlg-menu" ${mm.id === target.id ? 'checked' : ''}> ${esc(mm.name)}</label>`).join('')}</div></div>` : ''}
          <div class="field"><label for="dlg-place">Place it</label><select id="dlg-place">${placeOptions(target, d.place || 'end')}</select></div>` : '<span class="hint" style="font-size:13px;color:var(--ink-3)">The page will be live at its own address, with no menu link.</span>'}
        </div>`;
      }
      body = `<h2 id="dlg-title">${m ? 'New page in your ' + esc(m.name.toLowerCase()) : 'New page'}</h2>
        <div class="field"><label for="dlg-name">Title</label><input type="text" id="dlg-name" value="${esc(d.name || '')}" placeholder="For example, Gift cards" autocomplete="off"></div>
        ${m ? `<p class="note">It goes at the end of the ${esc(m.name.toLowerCase())}. Visitors see it once it's published.</p>` : ''}
        ${routeTwo}
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('create', 'Save as draft', { status: 'draft' })}${btn('create', 'Publish', { status: 'publish' }, 'btn-primary')}</div>`;
    }
    if (d.type === 'link') {
      const m = menu(d.menuId || 'header');
      body = `<h2 id="dlg-title">Add a link to your ${esc(m.name.toLowerCase())}</h2>
        <div class="field"><label for="dlg-name">Text</label><input type="text" id="dlg-name" placeholder="For example, Instagram" autocomplete="off"></div>
        <div class="field"><label for="dlg-url">Address</label><input type="url" id="dlg-url" placeholder="instagram.com/rosasbakery" autocomplete="off"></div>
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('create-link', 'Add link', { menu: m.id }, 'btn-primary')}</div>`;
    }
    if (d.type === 'convert') {
      const p = page(d.pageId);
      const count = automaticItems().filter((i) => i.pageId !== p.id).length;
      body = `<h2 id="dlg-title">Take "${esc(p.title)}" out of your menu?</h2>
        <p>Your header menu shows every published page automatically. Taking one out means you choose the menu's pages from now on: your other ${count} pages stay, and new pages won't be added on their own.</p>
        <p class="note">Nothing else in your header changes. New pages will be marked New until you add them or keep them out.</p>
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('convert', 'Remove and choose pages myself', { page: p.id, menu: d.menuId }, 'btn-primary')}</div>`;
    }
    if (d.type === 'trash') {
      const p = page(d.pageId);
      const ms = menusWith(p.id);
      body = `<h2 id="dlg-title">Move "${esc(p.title)}" to trash?</h2>
        ${ms.length ? `<p>It's in ${ms.length === 1 ? 'your ' + esc(ms[0].name.toLowerCase()) : ms.length + ' menus'}. It will be taken out of ${ms.length === 1 ? 'it' : 'all of them'}.</p>
        <ul>${ms.map((m) => `<li>${esc(m.name)}<small>${m.mode === 'automatic' ? 'Automatic' : 'Chosen by you'}</small></li>`).join('')}</ul>
        <p class="note">Undo puts it back in the same place.</p>` : '<p>It isn\'t in any menu, so nothing else on your site changes.</p>'}
        <div class="dialog-actions">${btn('close-dialog', 'Cancel')}${btn('trash', 'Move to trash', { page: p.id }, 'btn-danger')}</div>`;
    }
    return `<div class="scrim" data-action="scrim"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${body}</div></div>`;
  }

  // ---------- The site preview ----------

  function siteNavItems(m) {
    const items = itemsOf(m);
    const out = [];
    items.forEach((it) => {
      if (it.depth > 0 && out.length) out[out.length - 1].sub.push(it);
      else out.push(Object.assign({ sub: [] }, it));
    });
    return out;
  }

  function siteLink(it) {
    if (it.type === 'link') return `<a href="#" data-action="site-link" data-focus="site-link:${esc(it.label)}">${esc(it.label)}</a>`;
    const p = page(it.pageId);
    const cls = [p.status === 'draft' ? 'draft-link' : '', ui.flash === `page:${p.id}` || ui.freshLink === p.id ? 'fresh' : ''].join(' ').trim();
    return `<a href="#" data-action="visit" data-page="${esc(p.id)}" data-focus="visit:${esc(p.id)}" class="${cls}"${ui.current === p.id ? ' aria-current="page"' : ''}>${esc(p.title)}${p.status === 'draft' ? ' <span class="site-tag">Draft</span>' : ''}`;
  }

  function renderSite() {
    const nav = siteNavItems(header()).map((it) => {
      if (!it.sub.length) return `<li>${siteLink(it)}</a></li>`;
      return `<li>${siteLink(it)} ${ICON.chevron}</a><ul class="sub">${it.sub.map((s) => `<li>${siteLink(s)}</a></li>`).join('')}</ul></li>`;
    }).join('');
    const footer = state.menus[1];
    const cur = page(ui.current) || page('home');
    const hero = cur.id === 'home'
      ? `<h1>Fresh bread, every morning.</h1><p>Sourdough, pastries and cakes baked on Mill Street since [YEAR].</p>`
      : `<h1>${esc(cur.title)}</h1><p>[The ${esc(cur.title)} page's content.]</p>${cur.status === 'draft' ? '<span class="site-draft-note">Draft: only you can see this page</span>' : ''}${!menusWith(cur.id).length ? '<span class="site-draft-note" style="background:#f0f0f1;color:#3c434a">Not in a menu: visitors reach it from links and search</span>' : ''}`;
    return `<div class="site">
      <header class="site-header">
        <button type="button" class="site-name" data-action="visit" data-page="home" data-focus="visit:home-logo">Rosa's Bakery</button>
        <button type="button" class="menu-toggle" data-action="phone-menu" aria-expanded="${ui.phoneMenu}" data-focus="phone-menu">${ICON.burger} Menu</button>
        <nav class="site-nav${ui.phoneMenu ? ' open' : ''}" aria-label="Site header menu"><ul>${nav}</ul></nav>
      </header>
      <section class="site-hero"><div>${hero}</div><div class="site-photo" role="img" aria-label="Photo placeholder">Photo</div></section>
      <footer class="site-footer"><span>Rosa's Bakery</span>${footer ? `<ul aria-label="Site footer menu">${itemsOf(footer).map((it) => `<li>${it.type === 'link' ? `<a href="#" data-action="site-link">${esc(it.label)}</a>` : `<a href="#" data-action="visit" data-page="${esc(it.pageId)}" class="${ui.flash === `page:${it.pageId}` ? 'fresh' : ''}">${esc(label(it))}</a>`}</li>`).join('')}</ul>` : ''}</footer>
    </div>`;
  }

  // ---------- Switching between prototypes ----------

  // Plain links, so they work served from the repo and from a published copy alike.
  const PROTOTYPES = [
    ['A', 'one-list.html', 'One list of pages'],
    ['B', 'automatic.html', 'Automatic menu'],
    ['C', 'two-menus.html', 'Header and footer menus'],
    ['D', 'sections.html', 'Menu and other pages'],
    ['E', 'page-settings.html', 'Menu in page settings'],
    ['F', 'toggles.html', 'All pages with menu switches']
  ];

  function switcherHtml() {
    const here = (location.pathname.split('/').pop() || '').toLowerCase();
    return `<nav class="switcher" aria-label="Prototypes"><span class="switcher-label">Prototype</span>${PROTOTYPES.map(([letter, file, name]) =>
      `<a href="${file}" title="${esc(name)}" aria-label="${letter}: ${esc(name)}"${here === file ? ' aria-current="page"' : ''}>${letter}</a>`).join('')}</nav>`;
  }

  // ---------- Render ----------

  const root = document.getElementById('app');

  function render() {
    const active = document.activeElement;
    const focusKey = ui.focus || (active && active.dataset && active.dataset.focus);
    ui.focus = null;

    const panel = CONFIG.variant === 'sections' ? renderSections()
      : CONFIG.variant === 'page-settings' ? renderPageSettings()
      : CONFIG.variant === 'toggles' ? renderToggles()
      : renderOneList();

    root.innerHTML = `
      <div class="app">
        <div class="topbar">
          <div class="topbar-left"><span class="site-icon" aria-hidden="true">R</span><span class="topbar-title">Pages</span><span class="topbar-sub">Rosa's Bakery</span></div>
          ${switcherHtml()}
          <div class="topbar-right">
            <button type="button" class="switch" aria-pressed="${ui.preview}" data-action="toggle-preview" data-focus="toggle-preview">Site preview <span class="switch-track"></span></button>
            ${btn('reset', 'Reset', {}, 'btn-small btn-ghost')}
          </div>
        </div>
        <div class="workspace${ui.preview ? '' : ' no-preview'}">
          <main class="panel" aria-label="Pages">${panel}</main>
          ${ui.preview ? `<section class="stage${ui.device === 'phone' ? ' phone' : ''}" aria-label="Site preview">
            <div class="stage-bar"><span>${esc((page(ui.current) || page('home')).title)} · changes show here straight away</span>
              <div class="seg" role="group" aria-label="Preview size"><button type="button" aria-pressed="${ui.device === 'desktop'}" data-action="device" data-value="desktop" data-focus="device:desktop">Desktop</button><button type="button" aria-pressed="${ui.device === 'phone'}" data-action="device" data-value="phone" data-focus="device:phone">Phone</button></div>
            </div>
            ${renderSite()}
          </section>` : ''}
        </div>
      </div>
      ${dialogHtml()}`;

    if (ui.dialog) {
      const first = root.querySelector('.dialog input, .dialog .btn-primary, .dialog .btn-danger');
      if (first && !root.querySelector('.dialog').contains(document.activeElement)) first.focus();
    } else if (focusKey) {
      const el = root.querySelector(`[data-focus="${CSS.escape(focusKey)}"]`);
      if (el) el.focus();
    }
    if (ui.more) {
      const item = root.querySelector('.moremenu [role="menuitem"]');
      if (item && !(focusKey || '').startsWith('menuitem')) item.focus();
    }
    if (ui.flash) {
      const f = ui.flash;
      setTimeout(() => {
        if (ui.flash !== f) return;
        ui.flash = null;
        root.querySelectorAll('.site .fresh').forEach((el) => el.classList.remove('fresh'));
      }, 2400);
    }
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

  // ---------- Actions ----------

  const keyRow = (pageId) => `page:${pageId}`;

  // Where focus should land after a change, so keyboard users stay on the row they acted on.
  function focusFor(pageId, menuId) {
    if (CONFIG.variant === 'page-settings') return ui.selected ? 'sw:' + menuId : 'open:' + pageId;
    if (CONFIG.variant === 'toggles') return 'sw:' + pageId;
    if (CONFIG.variant === 'sections') return 'more:' + keyRow(pageId) + (menuId && menusWith(pageId).some((m) => m.id === menuId) ? ':' + menuId : '');
    return 'pop:' + keyRow(pageId);
  }
  function itemFocus(menuId, index) {
    const it = menu(menuId).items[index];
    if (!it) return null;
    if (it.type === 'link') return `more:link:${menuId}:${index}`;
    return CONFIG.variant === 'sections' ? `more:page:${it.pageId}:${menuId}` : 'more:' + keyRow(it.pageId);
  }

  const actions = {
    pop(d) { ui.pop = ui.pop === d.key ? null : d.key; ui.more = null; ui.focus = 'pop:' + d.key; render(); },
    'close-pop'() { const k = ui.pop; ui.pop = null; ui.focus = 'pop:' + k; render(); },
    more(d) { ui.more = ui.more === d.key ? null : d.key; ui.pop = null; ui.focus = 'more:' + d.key; render(); },

    add(d) {
      const p = page(d.page);
      change(() => { addToMenu(d.page, d.menu); ui.pop = null; ui.flash = keyRow(d.page); ui.focus = focusFor(d.page, d.menu); },
        `"${p.title}" is in your ${menu(d.menu).name.toLowerCase()}`);
    },
    remove(d) {
      const p = page(d.page);
      change(() => { removeFromMenu(d.page, d.menu); ui.pop = null; ui.flash = keyRow(d.page); ui.focus = focusFor(d.page, d.menu); },
        `"${p.title}" is no longer in your ${menu(d.menu).name.toLowerCase()}`);
    },
    'toggle-menu'(d) {
      const m = menu(d.menu);
      if (m.mode === 'automatic' && inMenu(d.page, m)) { ui.dialog = { type: 'convert', pageId: d.page, menuId: d.menu }; render(); return; }
      const on = inMenu(d.page, m);
      ui.focus = `toggle-menu:${d.page}:${d.menu}`;
      change(() => { if (on) removeFromMenu(d.page, d.menu); else addToMenu(d.page, d.menu); ui.flash = keyRow(d.page); ui.pop = keyRow(d.page); },
        `"${page(d.page).title}" ${on ? 'taken out of' : 'added to'} your ${m.name.toLowerCase()}`);
    },
    // The toggles prototype: one switch per page, no popover. On adds it to the end of the menu,
    // or to its parent's dropdown when the parent is in the menu; off takes it out.
    'switch-menu'(d) {
      const m = menu(d.menu);
      const p = page(d.page);
      const on = inMenu(d.page, m);
      if (m.mode === 'automatic') {
        if (on) { ui.dialog = { type: 'convert', pageId: d.page, menuId: d.menu }; render(); }
        else showToast(p.status === 'draft' ? `"${p.title}" joins your menu when it's published` : 'Every published page is already in your menu', false);
        return;
      }
      const parent = p.parent && page(p.parent);
      const under = !on && parent && menuPlace(parent, m) && menuPlace(parent, m).depth === 0 ? parent : null;
      change(() => {
        if (on) removeFromMenu(d.page, d.menu);
        else addToMenu(d.page, d.menu, under ? under.id : 'end');
        ui.flash = keyRow(d.page);
        ui.focus = 'sw:' + d.page;
      }, on ? `"${p.title}" is no longer in your header menu`
        : under ? `"${p.title}" added to the ${under.title} dropdown`
        : `"${p.title}" added to the end of your header menu` + (p.status === 'draft' ? '. It shows once published.' : ''));
    },
    'page-step'(d) {
      const p = page(d.page);
      change(() => { stepPage(d.page, Number(d.dir)); ui.flash = keyRow(d.page); ui.focus = 'more:' + keyRow(d.page); },
        `"${p.title}" moved ${Number(d.dir) < 0 ? 'up' : 'down'}`);
    },
    'page-nest'(d) {
      const p = page(d.page);
      const parent = page(d.parent);
      change(() => {
        p.parent = parent.id;
        // It goes last under its new parent.
        state.pages.splice(state.pages.indexOf(p), 1);
        state.pages.push(p);
        ui.flash = keyRow(d.page); ui.focus = 'more:' + keyRow(d.page);
      }, `"${p.title}" is under ${parent.title}. Its address is now ${SITE}/${parent.id}/${p.id}`);
    },
    'page-unnest'(d) {
      const p = page(d.page);
      const parent = page(p.parent);
      change(() => {
        p.parent = null;
        placePage(p.id, parent.id, true);
        ui.flash = keyRow(d.page); ui.focus = 'more:' + keyRow(d.page);
      }, `"${p.title}" is no longer under ${parent.title}. Its address is now ${SITE}/${p.id}`);
    },
    'remove-link'(d) {
      const m = menu(d.menu);
      const it = m.items[Number(d.index)];
      change(() => { removeItemAt(m, Number(d.index)); ui.pop = null; }, `"${it.label}" link removed`);
    },
    dismiss(d) {
      change(() => { state.fresh = state.fresh.filter((x) => x !== d.page); ui.pop = null; ui.focus = 'pop:' + keyRow(d.page); },
        `"${page(d.page).title}" stays out of your menu`);
    },
    'ask-convert'(d) { ui.dialog = { type: 'convert', pageId: d.page, menuId: d.menu }; ui.pop = null; render(); },
    convert(d) {
      const p = page(d.page);
      ui.dialog = null;
      change(() => { convertToChosen(d.menu); removeFromMenu(d.page, d.menu); ui.flash = keyRow(d.page); ui.focus = 'pop:' + keyRow(d.page); },
        `"${p.title}" taken out. You now choose your menu's pages.`);
    },
    publish(d) {
      const p = page(d.page);
      const auto = menusWith(d.page).length || state.menus.some((m) => m.mode === 'automatic');
      change(() => { publish(d.page); ui.pop = null; ui.flash = keyRow(d.page); if (!menusWith(d.page).length) flagIfNeeded(d.page); },
        auto && menusWith(d.page).length ? `"${p.title}" is published and visitors can see it in your menu` : `"${p.title}" is published`);
    },
    'move-up'(d) { moveAndFocus(d, () => moveItem(d.menu, Number(d.index), -1)); },
    'move-down'(d) { moveAndFocus(d, () => moveItem(d.menu, Number(d.index), 1)); },
    indent(d) { moveAndFocus(d, () => indentItem(d.menu, Number(d.index)), 'Moved into the dropdown. Its page address hasn\'t changed.'); },
    outdent(d) { moveAndFocus(d, () => outdentItem(d.menu, Number(d.index)), 'Moved out of the dropdown'); },
    'page-up'(d) { change(() => { movePageOrder(d.page, -1); ui.focus = 'more:' + keyRow(d.page); }); },
    'page-down'(d) { change(() => { movePageOrder(d.page, 1); ui.focus = 'more:' + keyRow(d.page); }); },
    view(d) { ui.current = d.page; ui.more = null; ui.preview = true; render(); },
    visit(d) { ui.current = d.page; ui.phoneMenu = false; ui.focus = 'visit:' + d.page; render(); },
    'site-link'() { showToast('That link goes to another website', false); },

    'ask-add'(d) {
      ui.dialog = { type: 'add', menuId: d.menu || null, toMenu: topLevelCount(header()) < 7, target: 'header', place: 'end' };
      ui.more = null; ui.pop = null; render();
    },
    'ask-link'(d) { ui.dialog = { type: 'link', menuId: d.menu || 'header' }; render(); },
    'dlg-toggle'() { const d = ui.dialog; d.name = readName(); d.toMenu = d.toMenu === false; ui.focus = 'dlg-toggle'; render(); },
    'dlg-menu'(d, el) { const dd = ui.dialog; dd.name = readName(); dd.target = el.value; dd.place = 'end'; render(); },
    create(d) {
      const title = readName();
      if (!title) { const i = document.getElementById('dlg-name'); i.focus(); i.setAttribute('aria-invalid', 'true'); return; }
      const dlg = ui.dialog;
      let opts = null;
      if (dlg.menuId) opts = { menuId: dlg.menuId };
      if (CONFIG.variant === 'page-settings' && dlg.toMenu !== false) {
        const place = document.getElementById('dlg-place');
        opts = { menuId: dlg.target || 'header', place: place ? place.value : 'end' };
      }
      ui.dialog = null;
      let id;
      change(() => {
        id = createPage(title, d.status, opts);
        ui.flash = keyRow(id);
        ui.current = id;
        // In the one-list prototype the new page's popover opens, so its menu state is explained straight away.
        if (CONFIG.variant === 'one-list') { ui.pop = keyRow(id); ui.focus = 'pop:' + keyRow(id); }
        // In the toggles prototype focus lands on its switch, which is off.
        if (CONFIG.variant === 'toggles') ui.focus = 'sw:' + id;
      }, `"${title}" ${d.status === 'draft' ? 'saved as a draft' : 'published'}`);
    },
    'create-link'(d) {
      const name = readName();
      const url = (document.getElementById('dlg-url').value || '').trim();
      if (!name || !url) { (name ? document.getElementById('dlg-url') : document.getElementById('dlg-name')).focus(); return; }
      ui.dialog = null;
      change(() => { menu(d.menu).items.push({ type: 'link', label: name, url, depth: 0 }); }, `"${name}" link added`);
    },
    'ask-trash'(d) { ui.dialog = { type: 'trash', pageId: d.page }; ui.more = null; render(); },
    trash(d) {
      const p = page(d.page);
      ui.dialog = null;
      change(() => { trash(d.page); ui.pop = null; }, `"${p.title}" moved to trash`);
    },
    'close-dialog'() { ui.dialog = null; render(); },
    scrim(d, el, ev) { if (ev.target === el) { ui.dialog = null; render(); } },

    'open-settings'(d) { ui.selected = d.page; ui.current = d.page; ui.focus = 'close-settings'; render(); },
    'close-settings'() { const s = ui.selected; ui.selected = null; ui.focus = 'open:' + s; render(); },
    filter(d) { ui.filter = d.value; ui.focus = 'filter:' + d.value; render(); },

    'toggle-preview'() { ui.preview = !ui.preview; ui.focus = 'toggle-preview'; render(); },
    device(d) { ui.device = d.value; ui.phoneMenu = false; ui.focus = 'device:' + d.value; render(); },
    'phone-menu'() { ui.phoneMenu = !ui.phoneMenu; ui.focus = 'phone-menu'; render(); },
    undo() {
      if (!undo) return;
      state = undo.state;
      ui.current = page(undo.current) ? undo.current : 'home';
      undo = null;
      ui.pop = null; ui.more = null;
      document.getElementById('toast').hidden = true;
      render();
    },
    reset() {
      state = startingState();
      ui = startingUi();
      undo = null;
      render();
      showToast('Back to how it started', false);
    }
  };

  // Moving changes indexes, so find the same item afterwards and keep focus on it.
  function moveAndFocus(d, fn, message) {
    const m = menu(d.menu);
    const item = m.items[Number(d.index)];
    change(() => {
      fn();
      const i = m.items.indexOf(item);
      ui.focus = itemFocus(d.menu, i);
    }, message);
  }

  function readName() {
    const i = document.getElementById('dlg-name');
    return i ? i.value.trim() : '';
  }

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el) {
      // A click elsewhere closes an open popover or ⋮ menu.
      if ((ui.pop || ui.more) && !ev.target.closest('.pop, .moremenu')) { ui.pop = null; ui.more = null; render(); }
      return;
    }
    const action = actions[el.dataset.action];
    if (!action) return;
    if (el.tagName === 'A') ev.preventDefault();
    if (el.dataset.action === 'scrim') { action(el.dataset, el, ev); return; }
    action(Object.assign({}, el.dataset), el, ev);
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (drag) { endDrag(ev, true); return; }
      if (ui.dialog) { ui.dialog = null; render(); return; }
      if (ui.more) { const k = ui.more; ui.more = null; ui.focus = 'more:' + k; render(); return; }
      if (ui.pop) { const k = ui.pop; ui.pop = null; ui.focus = 'pop:' + k; render(); }
    }
    if (ev.key === 'Enter' && ui.dialog && ev.target.tagName === 'INPUT' && ev.target.type !== 'checkbox' && ev.target.type !== 'radio') {
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

  // ---------- Reordering the toggles list: drag a handle, or arrow keys on it ----------

  // Only among siblings: top-level pages among themselves (each with its child pages), and child
  // pages within their parent. Putting a page under another is in the ⋮ menu, because it changes
  // the page's address.
  let drag = null;

  function rowsBlock(li) {
    // A top-level row and the child rows under it.
    const out = [li];
    let n = li.nextElementSibling;
    while (n && n.dataset.parent && n.dataset.parent === li.dataset.page) { out.push(n); n = n.nextElementSibling; }
    return out;
  }

  function clearDropMarks() {
    root.querySelectorAll('.drop-before, .drop-after').forEach((el) => el.classList.remove('drop-before', 'drop-after'));
  }

  document.addEventListener('pointerdown', (ev) => {
    const h = ev.target.closest('.handle');
    if (!h || CONFIG.variant !== 'toggles' || ev.button > 0) return;
    const li = h.closest('li');
    ev.preventDefault();
    h.setPointerCapture(ev.pointerId);
    ui.more = null; ui.pop = null;
    drag = { id: li.dataset.page, parent: li.dataset.parent, handle: h, target: null, moved: false, y: ev.clientY };
    rowsBlock(li).forEach((r) => r.classList.add('dragging'));
  });

  document.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    if (Math.abs(ev.clientY - drag.y) > 4) drag.moved = true;
    const sibs = [...root.querySelectorAll('.toggle-list li[data-page]')].filter((li) => li.dataset.parent === drag.parent);
    clearDropMarks();
    drag.target = null;
    for (const li of sibs) {
      const block = rowsBlock(li);
      const top = block[0].getBoundingClientRect().top;
      const bottom = block[block.length - 1].getBoundingClientRect().bottom;
      if (ev.clientY < (top + bottom) / 2) { drag.target = { id: li.dataset.page, after: false }; block[0].classList.add('drop-before'); break; }
    }
    if (!drag.target && sibs.length) {
      const last = sibs[sibs.length - 1];
      const block = rowsBlock(last);
      drag.target = { id: last.dataset.page, after: true };
      block[block.length - 1].classList.add('drop-after');
    }
    // Dropping right next to where it is changes nothing.
    if (drag.target) {
      const ids = sibs.map((li) => li.dataset.page);
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
    const p = page(d.id);
    change(() => { placePage(d.id, d.target.id, d.target.after); ui.flash = keyRow(d.id); ui.focus = 'drag:' + d.id; },
      `"${p.title}" moved. Your header menu follows this order.`);
  }
  document.addEventListener('pointerup', (ev) => endDrag(ev, false));
  document.addEventListener('pointercancel', (ev) => endDrag(ev, true));

  document.addEventListener('keydown', (ev) => {
    const h = ev.target.closest && ev.target.closest('.handle');
    if (!h || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return;
    ev.preventDefault();
    const id = h.dataset.drag;
    const p = page(id);
    const dir = ev.key === 'ArrowUp' ? -1 : 1;
    const sibs = siblingsOf(p);
    const k = sibs.indexOf(p) + dir;
    if (k < 0 || k >= sibs.length) { showToast(`"${p.title}" is already ${dir < 0 ? 'first' : 'last'}`, false); return; }
    change(() => { stepPage(id, dir); ui.focus = 'drag:' + id; ui.flash = keyRow(id); },
      `"${p.title}" moved ${dir < 0 ? 'up' : 'down'}`);
  });

  // Renaming in page settings updates the title as you type, without re-rendering the field.
  document.addEventListener('input', (ev) => {
    if (ev.target.id === 'rename' && ui.selected) {
      const p = page(ui.selected);
      p.title = ev.target.value || 'Untitled';
      const site = root.querySelector('.site');
      if (site) site.outerHTML = renderSite();
    }
  });

  render();
})();
