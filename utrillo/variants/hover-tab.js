/*
 * Utrillo · A · Hover tab
 *
 * Hovering the page outlines every container under the pointer (Cover, Group,
 * Columns, Column, Buttons), from the section inwards, each with a small name
 * tab just above its top-left corner. Where tabs would overlap they sit side
 * by side, outermost first, so they read like a breadcrumb. Clicking a tab
 * selects that container (route `tab`); hovering a tab highlights it.
 *
 * Tabs hide when the pointer leaves the canvas, while typing (until the
 * pointer moves), while dragging to select text, and wherever they would sit
 * under the block toolbar.
 *
 * The block toolbar also shows the selected block's name beside its icon
 * ("Group", "Column"), so it says the same as the tab that was clicked.
 * Clicking that name lists everything in the selected block's section
 * (route `tree`); picking a row selects that block.
 *
 * This file uses only the API in ../app.js (window.Utrillo.registerVariant).
 */
(function () {
  'use strict';

  const TAB_H = 22;     // keep in step with .uta-tab in hover-tab.css
  const TAB_GAP = 2;    // between tabs that sit side by side
  const HOLD = 6;       // px around a tab that still counts as "on the tab"
  const DRAG = 4;       // px of movement with the button down that makes a drag

  window.Utrillo.registerVariant({
    id: 'hover-tab',
    code: 'UA',
    init: function (api) {
      // The toolbar shows the block's name too, and clicking it lists the
      // blocks in the selected block's section (see "The section's blocks").
      api.showBlockNameInToolbar(true, (info) => toggleTree(info.id));
      const canvas = api.canvas;
      const overlay = api.overlay;

      let inside = false;          // pointer over the canvas
      let lastX = 0, lastY = 0;    // last pointer position (client coords)
      let stack = [];              // containers under the pointer, outermost first
      let typingHidden = false;    // hidden by typing until the pointer moves
      let press = null;            // { x, y } while the button is down on the page
      let dragging = false;        // a press that has moved: selecting text
      let tabHoverId = null;       // the tab under the pointer, if any
      const seen = new Set();      // containers whose tab has been shown at least once
      const els = new Map();       // id → { outline, tab }
      const placed = new Map();    // id → tab box in overlay coords, for visible tabs

      const describe = (id) => {
        const b = api.getBlock(id);
        return b ? b.title + ' (' + id + ')' : id;
      };

      // ---------- Which containers are under the pointer ----------

      function stackFor(el) {
        const id = api.idFromElement(el);
        if (!id) return [];
        return api.getAncestors(id).concat(id).filter((x) => api.isContainer(x));
      }

      // Is the point (client coords) on, or just around, a tab that's showing?
      function nearTab(x, y) {
        if (!placed.size) return false;
        const o = overlay.getBoundingClientRect();
        const px = x - o.left, py = y - o.top;
        for (const r of placed.values()) {
          if (px >= r.left - HOLD && px <= r.right + HOLD && py >= r.top - HOLD && py <= r.bottom + HOLD) return true;
        }
        return false;
      }

      // Work out the stack for what's at the pointer. Over a tab, the
      // toolbar or the ⋮ menu (or in the few pixels between tabs), keep
      // the stack as it is, so a tab doesn't vanish on the way to it.
      function update(target) {
        if (!inside) { setStack([]); return; }
        if (dragging) return;
        const el = target || document.elementFromPoint(lastX, lastY);
        if (!el || !canvas.contains(el)) { setStack([]); return; }
        if (overlay.contains(el) && el !== overlay) return;
        if (el.closest('.ut-toolbar, .ut-menu')) return;
        if (nearTab(lastX, lastY)) {
          // Still extend inwards if the pointer has gone into a container below.
          const next = stackFor(el);
          if (next.length > stack.length && stack.every((id, i) => next[i] === id)) setStack(next);
          return;
        }
        setStack(stackFor(el));
      }

      function setStack(next) {
        const before = new Set(stack);
        stack = next;
        next.forEach((id) => {
          if (before.has(id)) return;
          // A new hover of this container.
          api.count('tabShown', 'Tab shown');
          if (!seen.has(id)) {
            seen.add(id);
            api.log('tab', 'Tab shown for the first time: ' + describe(id));
          }
        });
        draw();
      }

      // ---------- Drawing ----------

      function makeEls(id) {
        const b = api.getBlock(id);
        const outline = document.createElement('div');
        outline.className = 'uta-outline';
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'uta-tab';
        tab.tabIndex = -1;
        tab.dataset.utaTab = id;
        tab.setAttribute('aria-label', 'Select ' + b.title);
        tab.innerHTML = '<span class="uta-tab__icon" aria-hidden="true">' + b.icon + '</span><span class="uta-tab__label">' + b.title + '</span>';
        tab.addEventListener('pointerenter', () => { tabHoverId = id; api.highlight(id); outline.classList.add('is-active'); });
        tab.addEventListener('pointerleave', () => {
          if (tabHoverId === id) { tabHoverId = null; api.highlight(null); }
          outline.classList.remove('is-active');
        });
        // Keep the press to the tab: no text selection, no focus change, and
        // the canvas's own pointerdown (selection, clearing) doesn't run.
        tab.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
        tab.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); });
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!api.getBlock(id)) return;
          api.log('tab', 'Clicked the ' + b.title + ' tab: ' + describe(id));
          api.select(id, { route: 'tab' });
        });
        overlay.appendChild(outline);
        overlay.appendChild(tab);
        const pair = { outline, tab };
        els.set(id, pair);
        return pair;
      }

      function removeEls(id) {
        const pair = els.get(id);
        if (!pair) return;
        pair.outline.remove();
        pair.tab.remove();
        els.delete(id);
        if (tabHoverId === id) { tabHoverId = null; api.highlight(null); }
      }

      const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

      function draw() {
        placed.clear();
        const show = inside && !typingHidden && !dragging;
        const ids = show ? stack.filter((id) => api.getBlock(id) && api.elementFor(id)) : [];
        // Take away what isn't under the pointer any more.
        Array.from(els.keys()).forEach((id) => { if (!ids.includes(id)) removeEls(id); });
        if (!ids.length) return;

        const visibleTop = canvas.scrollTop;
        const toolbar = api.toolbarRect();
        const boxes = [];
        ids.forEach((id) => {
          const pair = els.get(id) || makeEls(id);
          const r = api.rectFor(id);
          if (!r) return;
          pair.outline.style.cssText = 'top:' + r.top + 'px;left:' + r.left + 'px;width:' + r.width + 'px;height:' + r.height + 'px';

          // Just above the container's top-left corner, outside it. If that's
          // scrolled out of view, keep it at the top of the canvas, inside
          // the container, for as long as the container is on screen.
          const w = pair.tab.offsetWidth;
          let top = r.top - TAB_H;
          if (top < visibleTop + 2) top = Math.min(visibleTop + 2, r.bottom - TAB_H);
          let box = { top, bottom: top + TAB_H, left: r.left, right: r.left + w };
          // Beside any earlier (outer) tab it would overlap, on the same line,
          // so they read in order like a breadcrumb.
          for (let guard = 0; guard < 20; guard++) {
            const hit = boxes.find((p) => overlaps(box, { top: p.top, bottom: p.bottom, left: p.left - TAB_GAP, right: p.right + TAB_GAP }));
            if (!hit) break;
            box = { top: hit.top, bottom: hit.bottom, left: hit.right + TAB_GAP, right: hit.right + TAB_GAP + w };
          }
          boxes.push(box);
          // Never under the block toolbar.
          const hidden = !!(toolbar && overlaps(box, toolbar)) || r.bottom - TAB_H < visibleTop;
          pair.tab.hidden = hidden;
          pair.tab.style.top = Math.round(box.top) + 'px';
          pair.tab.style.left = Math.round(box.left) + 'px';
          if (!hidden) placed.set(id, box);
          else if (tabHoverId === id) { tabHoverId = null; api.highlight(null); pair.outline.classList.remove('is-active'); }
        });
      }

      // ---------- Pointer and keyboard ----------

      canvas.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        inside = true;
        lastX = e.clientX; lastY = e.clientY;
        if (press && !dragging && (e.buttons & 1) && Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG) {
          dragging = true;
          draw();
          return;
        }
        if (typingHidden) { typingHidden = false; }
        update(e.target);
        if (!typingHidden) draw();
      });
      canvas.addEventListener('pointerenter', (e) => { inside = true; lastX = e.clientX; lastY = e.clientY; update(e.target); });
      canvas.addEventListener('pointerleave', () => { inside = false; setStack([]); });

      // A press on the page might become a drag to select text.
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !api.idFromElement(e.target)) return;
        press = { x: e.clientX, y: e.clientY };
      });
      document.addEventListener('pointerup', (e) => {
        if (!press) return;
        press = null;
        if (dragging) {
          dragging = false;
          lastX = e.clientX; lastY = e.clientY;
          inside = canvas.contains(document.elementFromPoint(lastX, lastY));
          update();
          draw();
        }
      });

      // Typing hides the tabs until the pointer moves, as the toolbar does.
      document.addEventListener('keydown', (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (!api.isEditingText()) return;
        if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
          if (!typingHidden) { typingHidden = true; draw(); }
        }
      }, true);

      // ---------- Keeping in place ----------

      // Scrolling moves the page under a still pointer; a redraw or a layout
      // change (Document Overview, resize, wrapping) moves the containers.
      api.on('scroll', () => { update(); draw(); });
      api.on('render', () => { update(); draw(); });
      api.on('select', () => draw());
      // Reset puts the page back: "first time" starts over.
      api.on('change', (info) => { if (info && info.reason === 'reset') seen.clear(); });

      // ---------- The section's blocks, from the name in the toolbar ----------

      const escHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const name = (id) => { const b = api.getBlock(id); return b ? b.title + ' (' + id + ')' : id; };
      const tree = document.createElement('div');
      tree.className = 'uta-tree';
      tree.setAttribute('role', 'dialog');
      tree.hidden = true;
      document.body.append(tree);
      let treeTop = null;      // the section whose blocks are listed, or null
      let treeHighlight = null;

      function toggleTree(id) {
        const top = api.getTopLevelId(id);
        if (treeTop && treeTop === top) { closeTree({ focusButton: true }); return; }
        openTree(top);
      }

      function renderTree() {
        const section = api.getBlock(treeTop);
        if (!section) { closeTree(); return; }
        const sel = api.getSelectedId();
        const rows = [];
        const add = (node, depth) => {
          const selected = node.id === sel;
          rows.push('<li class="ut-lv-row uta-tree-row' + (selected ? ' is-selected' : '') + '" style="--depth:' + depth + '">' +
            '<span class="ut-lv-expander"></span>' +
            '<button type="button" class="ut-lv-select" data-tree-id="' + escHtml(node.id) + '"' + (selected ? ' aria-current="true"' : '') + '>' + node.icon + '<span>' + escHtml(node.title) + '</span></button></li>');
          node.children.forEach((c) => add(c, depth + 1));
        };
        add(section, 0);
        tree.setAttribute('aria-label', 'Blocks in this ' + section.title);
        tree.innerHTML = '<div class="uta-tree-head"><h2>' + escHtml(section.title) + '</h2></div>' +
          '<ul class="ut-lv uta-tree-list" aria-label="Blocks in this ' + escHtml(section.title) + '">' + rows.join('') + '</ul>';
      }

      // Under the name button, left edges lined up, kept inside the canvas.
      function placeTree() {
        if (!treeTop) return;
        const btn = api.toolbarNameButton();
        if (!btn) { tree.style.visibility = 'hidden'; return; }
        tree.style.visibility = '';
        btn.setAttribute('aria-expanded', 'true');
        const b = btn.getBoundingClientRect();
        const c = canvas.getBoundingClientRect();
        const vis = { top: c.top + 8, left: c.left + 8, bottom: c.top + canvas.clientHeight - 8, right: c.left + canvas.clientWidth - 8 };
        const below = Math.max(vis.top, b.bottom + 4);
        const room = vis.bottom - below;
        tree.style.maxHeight = (room >= 240 ? room : Math.max(120, vis.bottom - vis.top)) + 'px';
        const w = tree.offsetWidth;
        const h = tree.offsetHeight;
        let top = below;
        if (top + h > vis.bottom) top = vis.bottom - h;
        if (top < vis.top) top = vis.top;
        let left = b.left;
        if (left + w > vis.right) left = vis.right - w;
        if (left < vis.left) left = vis.left;
        tree.style.top = Math.round(top) + 'px';
        tree.style.left = Math.round(left) + 'px';
      }

      function openTree(top) {
        treeTop = top;
        setTreeHighlight(null);
        renderTree();
        tree.hidden = false;
        placeTree();
        api.count('treeOpened', 'Block list opened');
        api.log('arm', 'Opened the block list of ' + name(top) + ' from the toolbar. Selected: ' + (api.getSelectedId() ? name(api.getSelectedId()) : 'nothing'));
        // Open at the top, on the section's own row: the list is there to
        // reach the section, which is the first row. The selected block is
        // still marked further down.
        tree.scrollTop = 0;
        const focusRow = tree.querySelector('.ut-lv-select');
        if (focusRow) focusRow.focus({ preventScroll: true });
      }

      function closeTree(opts) {
        if (!treeTop) return;
        treeTop = null;
        tree.hidden = true;
        tree.innerHTML = '';
        setTreeHighlight(null);
        const btn = api.toolbarNameButton();
        if (btn) {
          btn.setAttribute('aria-expanded', 'false');
          if (opts && opts.focusButton) btn.focus({ preventScroll: true });
        }
      }

      function setTreeHighlight(id) {
        if (id === treeHighlight) return;
        treeHighlight = id;
        api.highlight(id);
      }

      tree.addEventListener('pointerover', (e) => {
        const row = e.target.closest('[data-tree-id]');
        setTreeHighlight(row ? row.dataset.treeId : null);
      });
      tree.addEventListener('pointerleave', () => setTreeHighlight(null));
      tree.addEventListener('focusin', (e) => {
        const row = e.target.closest('[data-tree-id]');
        if (row && row.matches(':focus-visible')) setTreeHighlight(row.dataset.treeId);
      });
      tree.addEventListener('click', (e) => {
        const row = e.target.closest('[data-tree-id]');
        if (!row) return;
        const id = row.dataset.treeId;
        const section = treeTop;
        closeTree();
        api.count('treePicked', 'Block list rows picked');
        api.log('arm', 'Picked ' + name(id) + ' in the block list of ' + name(section));
        // No caretAt: text blocks are selected without a caret.
        if (id !== api.getSelectedId()) api.select(id, { route: 'tree' });
        else { const el = api.elementFor(id); if (el) el.focus({ preventScroll: true }); }
      });
      tree.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
        const rows = Array.from(tree.querySelectorAll('[data-tree-id]'));
        let i = rows.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') i = Math.min(rows.length - 1, i + 1);
        else if (e.key === 'ArrowUp') i = Math.max(0, i - 1);
        else if (e.key === 'Home') i = 0;
        else i = rows.length - 1;
        e.preventDefault();
        if (rows[i]) rows[i].focus();
      });

      // A press outside the list and its button closes it; the press still
      // does whatever it does.
      document.addEventListener('pointerdown', (e) => {
        if (!treeTop) return;
        if (tree.contains(e.target)) return;
        const btn = api.toolbarNameButton();
        if (btn && btn.contains(e.target)) return;
        closeTree();
      }, true);

      api.setEscapeHandler(() => {
        if (!treeTop) return false;
        closeTree({ focusButton: true });
        return true;
      });

      api.on('select', () => { if (treeTop) { renderTree(); placeTree(); } });
      api.on('change', () => { if (treeTop && !api.getBlock(treeTop)) closeTree(); else if (treeTop) { renderTree(); placeTree(); } });
      api.on('render', (e) => {
        if (e && e.reason === 'reset') closeTree();
        if (treeTop) placeTree();
      });
      api.on('scroll', () => placeTree());
      window.addEventListener('resize', () => placeTree());
    }
  });
})();
