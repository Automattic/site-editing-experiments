/*
 * Utrillo · D · Layers
 *
 * Each top-level section gets a small "Layers" button inside its top-right
 * corner, while the pointer is over the section and while anything in it is
 * selected. The button opens a popover with that section's block tree, all
 * expanded, drawn like Document Overview's rows. Hovering a row highlights
 * the block on the canvas; clicking a row selects it (route `layers` for
 * containers; text blocks are selected without a caret) and closes the
 * popover. Escape or a click outside closes it.
 *
 * The buttons are drawn in the API's overlay (so they scroll with the page).
 * The popover is drawn at the end of <body>, fixed, above the block toolbar,
 * and kept inside the visible part of the canvas.
 *
 * This file uses only the API in ../app.js (window.Utrillo.registerVariant).
 */
(function () {
  'use strict';

  // A layers icon: a diamond with two layers under it, drawn in the editor's
  // 24px stroke style.
  const STACK_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" style="fill:none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M12 4.75 19.25 8.5 12 12.25 4.75 8.5Z"/><path d="M4.75 12 12 15.75 19.25 12"/><path d="M4.75 15.5 12 19.25 19.25 15.5"/></svg>';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  window.Utrillo.registerVariant({
    id: 'layers',
    code: 'UD',
    init: function (api) {
      const canvas = api.canvas;
      const overlay = api.overlay;
      const INSET = 8;   // the button sits 8px in from the section's corner
      const GAP = 8;     // space kept around the toolbar and the canvas edges

      let hoverTop = null;    // the top-level section under the pointer
      let openTop = null;     // the section whose popover is open
      let highlighted = null; // what we asked api.highlight to show
      let frame = null;

      // ---------- Names for the log ----------

      function firstText(node) {
        if (node.isText && node.text) return node.text;
        for (const c of node.children) { const t = firstText(c); if (t) return t; }
        return null;
      }
      function describe(id) {
        const b = api.getBlock(id);
        if (!b) return id;
        if (b.isText) return b.title + ' “' + short(b.text, 40) + '”';
        // A Column: say which one, as the three in Classes share a title.
        const parent = api.getParent(id);
        const hint = firstText(b);
        let where = '';
        if (parent) {
          const siblings = api.getBlock(parent).children;
          const i = siblings.findIndex((s) => s.id === id);
          if (siblings.length > 1) where = ' ' + (i + 1) + ' of ' + siblings.length;
        }
        return b.title + where + (hint ? ' (“' + short(hint, 28) + '”)' : '');
      }

      // ---------- The buttons ----------

      const buttons = new Map(); // section id → button element

      function makeButton(id) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'utl-button';
        btn.dataset.layersFor = id;
        btn.setAttribute('aria-haspopup', 'true');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = STACK_ICON + '<span>Layers</span>';
        btn.addEventListener('pointerenter', () => { if (!openTop) setHighlight(id); });
        btn.addEventListener('pointerleave', () => { if (!openTop) setHighlight(null); });
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (openTop === id) close({ focusButton: true });
          else open(id);
        });
        return btn;
      }

      // Which sections show a button: under the pointer, holding the
      // selection, or with the popover open.
      function wanted() {
        const ids = new Set();
        const tops = api.getTree().map((b) => b.id);
        const sel = api.getSelectedId();
        if (sel) ids.add(api.getTopLevelId(sel));
        if (hoverTop) ids.add(hoverTop);
        if (openTop) ids.add(openTop);
        return tops.filter((t) => ids.has(t));
      }

      const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

      function placeButtons() {
        const ids = wanted();
        for (const [id, btn] of buttons) {
          if (!ids.includes(id) || !api.getBlock(id)) { btn.remove(); buttons.delete(id); }
        }
        const tb = api.toolbarRect();
        // The top of the visible canvas, in overlay coordinates: a button
        // whose section top has scrolled away stays pinned just below it.
        const cr = canvas.getBoundingClientRect();
        const or = overlay.getBoundingClientRect();
        const visTop = cr.top - or.top;
        // Likewise its right edge, if the canvas is narrower than the page
        // and scrolls sideways.
        const visRight = cr.left + canvas.clientWidth - or.left;
        for (const id of ids) {
          let btn = buttons.get(id);
          if (!btn) { btn = makeButton(id); buttons.set(id, btn); overlay.append(btn); }
          const r = api.rectFor(id);
          if (!r) continue;
          const w = btn.offsetWidth;
          const h = btn.offsetHeight;
          const left = Math.max(r.left + INSET, Math.min(r.right, visRight) - INSET - w);
          let top = Math.max(r.top + INSET, visTop + INSET);
          top = Math.min(top, r.bottom - h - INSET);
          // Keep clear of the block toolbar: if it would cover the button,
          // drop the button to just below the toolbar.
          if (tb) {
            const box = { left: left - 4, right: left + w + 4, top: top - 4, bottom: top + h + 4 };
            if (overlaps(box, tb)) top = tb.bottom + GAP;
          }
          btn.style.left = Math.round(left) + 'px';
          btn.style.top = Math.round(top) + 'px';
          btn.setAttribute('aria-expanded', String(openTop === id));
          btn.classList.toggle('is-open', openTop === id);
          btn.setAttribute('aria-label', 'Layers: ' + api.getBlock(id).title);
        }
      }

      // ---------- The popover ----------

      const pop = document.createElement('div');
      pop.className = 'utl-popover';
      pop.setAttribute('role', 'dialog');
      pop.hidden = true;
      document.body.append(pop);

      function renderPopover() {
        const section = api.getBlock(openTop);
        if (!section) { close(); return; }
        const sel = api.getSelectedId();
        const rows = [];
        const add = (node, depth) => {
          const selected = node.id === sel;
          // A plain list of buttons (no tree roles: nothing here expands or
          // collapses); the selected one is marked with aria-current.
          rows.push('<li class="ut-lv-row utl-row' + (selected ? ' is-selected' : '') + '" style="--depth:' + depth + '">' +
            '<span class="ut-lv-expander"></span>' +
            '<button type="button" class="ut-lv-select" data-layers-id="' + esc(node.id) + '"' + (selected ? ' aria-current="true"' : '') + '>' + node.icon + '<span>' + esc(node.title) + '</span></button></li>');
          node.children.forEach((c) => add(c, depth + 1));
        };
        add(section, 0);
        pop.setAttribute('aria-label', 'Layers: ' + section.title);
        pop.innerHTML = '<div class="utl-popover-head"><h2>' + esc(section.title) + '</h2></div>' +
          '<ul class="ut-lv utl-tree" aria-label="Blocks in this ' + esc(section.title) + '">' + rows.join('') + '</ul>';
      }

      // Under the button, right edges lined up; kept inside the visible canvas.
      function placePopover() {
        if (!openTop) return;
        const btn = buttons.get(openTop);
        if (!btn) return;
        const b = btn.getBoundingClientRect();
        const c = canvas.getBoundingClientRect();
        const vis = { top: c.top + GAP, left: c.left + GAP, bottom: c.top + canvas.clientHeight - GAP, right: c.left + canvas.clientWidth - GAP };
        // Below the button when there's room (scrolling inside if it's
        // taller than the room); only when there's little room below does it
        // slide up, staying inside the visible canvas.
        const below = Math.max(vis.top, b.bottom + 4);
        const room = vis.bottom - below;
        pop.style.maxHeight = (room >= 240 ? room : Math.max(120, vis.bottom - vis.top)) + 'px';
        const w = pop.offsetWidth;
        const h = pop.offsetHeight;
        let top = below;
        if (top + h > vis.bottom) top = vis.bottom - h;
        if (top < vis.top) top = vis.top;
        let left = b.right - w;
        if (left + w > vis.right) left = vis.right - w;
        if (left < vis.left) left = vis.left;
        pop.style.top = Math.round(top) + 'px';
        pop.style.left = Math.round(left) + 'px';
      }

      function open(id) {
        if (openTop) close();
        openTop = id;
        setHighlight(null);
        renderPopover();
        pop.hidden = false;
        placeButtons();
        placePopover();
        api.count('layersOpened', 'Layers opened');
        api.log('arm', 'Opened Layers on ' + describe(id) + '. Selected: ' + (api.getSelectedId() ? describe(api.getSelectedId()) : 'nothing'));
        const focusRow = pop.querySelector('.is-selected .ut-lv-select') || pop.querySelector('.ut-lv-select');
        if (focusRow) focusRow.focus({ preventScroll: true });
        const selRow = pop.querySelector('.is-selected');
        if (selRow) selRow.scrollIntoView({ block: 'nearest' });
      }

      function close(opts) {
        if (!openTop) return;
        const was = openTop;
        openTop = null;
        pop.hidden = true;
        pop.innerHTML = '';
        setHighlight(null);
        placeButtons();
        if (opts && opts.focusButton) {
          const btn = buttons.get(was);
          if (btn) btn.focus({ preventScroll: true });
        }
      }

      function setHighlight(id) {
        if (id === highlighted) return;
        highlighted = id;
        api.highlight(id);
      }

      // Rows: hover highlights, click selects and closes.
      pop.addEventListener('pointerover', (e) => {
        const row = e.target.closest('[data-layers-id]');
        setHighlight(row ? row.dataset.layersId : null);
      });
      pop.addEventListener('pointerleave', () => setHighlight(null));
      pop.addEventListener('focusin', (e) => {
        const row = e.target.closest('[data-layers-id]');
        if (row && row.matches(':focus-visible')) setHighlight(row.dataset.layersId);
      });
      pop.addEventListener('click', (e) => {
        const row = e.target.closest('[data-layers-id]');
        if (!row) return;
        const id = row.dataset.layersId;
        const section = openTop;
        close();
        api.count('layersPicked', 'Layers rows picked');
        api.log('arm', 'Picked ' + describe(id) + ' in the Layers of ' + describe(section));
        // No caretAt: text blocks are selected without a caret.
        if (id !== api.getSelectedId()) api.select(id, { route: 'layers' });
        else { const el = api.elementFor(id); if (el) el.focus({ preventScroll: true }); }
      });
      // Up and down arrows move between rows.
      pop.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
        const rows = Array.from(pop.querySelectorAll('[data-layers-id]'));
        let i = rows.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') i = Math.min(rows.length - 1, i + 1);
        else if (e.key === 'ArrowUp') i = Math.max(0, i - 1);
        else if (e.key === 'Home') i = 0;
        else i = rows.length - 1;
        e.preventDefault();
        if (rows[i]) rows[i].focus();
      });

      // A press outside the popover and its button closes it. (Captured, so
      // it runs before the canvas selects anything; the press still does
      // whatever it does.)
      document.addEventListener('pointerdown', (e) => {
        if (!openTop) return;
        if (pop.contains(e.target)) return;
        const btn = buttons.get(openTop);
        if (btn && btn.contains(e.target)) return;
        close();
      }, true);

      // Escape with the popover open closes it and does nothing else.
      api.setEscapeHandler(() => {
        if (!openTop) return false;
        close({ focusButton: true });
        return true;
      });

      // ---------- Following the pointer, the selection and the page ----------

      function schedule() {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = null;
          placeButtons();
          placePopover();
        });
      }

      canvas.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const onButton = e.target.closest && e.target.closest('.utl-button');
        let top = null;
        if (onButton) top = onButton.dataset.layersFor;
        else {
          const id = api.idFromElement(e.target);
          top = id ? api.getTopLevelId(id) : null;
        }
        if (top !== hoverTop) { hoverTop = top; placeButtons(); placePopover(); }
      });
      canvas.addEventListener('pointerleave', () => {
        if (hoverTop === null) return;
        hoverTop = null;
        placeButtons();
      });
      // The toolbar comes back when the pointer moves after typing.
      document.addEventListener('mousemove', schedule);

      api.on('select', () => {
        placeButtons();
        if (openTop) { renderPopover(); placePopover(); }
      });
      api.on('change', () => {
        if (openTop && !api.getBlock(openTop)) close();
        else if (openTop) { renderPopover(); }
        schedule();
      });
      api.on('render', (e) => {
        if (e && e.reason === 'reset') { close(); hoverTop = null; }
        if (openTop && !api.getBlock(openTop)) close();
        placeButtons();
        placePopover();
      });
      api.on('scroll', () => { placeButtons(); placePopover(); });
      window.addEventListener('resize', schedule);

      placeButtons();
    }
  });
})();
