/*
 * Utrillo · E · As Create not Learn
 *
 * Selects parents the way the Create not Learn prototype
 * (github.com/Automattic/create-not-learn-editor) does, with both of its
 * parts. So it differs from the control in two things, not one.
 *
 * 1. Clicks go from the outside in, at Create not Learn's levels
 *    (src/site-canvas/section-modes/use-section-clicks.js and rows.js there):
 *
 *      section  a click on a section that isn't selected (or holds nothing
 *               selected) selects the section: the Cover or a Group.
 *      row      with the section selected, a click on a "row of cards"
 *               selects the row: a Columns whose columns are alike (two or
 *               more Columns made of the same kinds of blocks, none given a
 *               width), like the three classes. About's picture beside its
 *               text isn't a row.
 *      block    with the section selected and no row there, or with the
 *               row selected and the click inside it, the click goes
 *               straight to the block, caret where they clicked.
 *
 *    Once a block in the section is selected, clicks in the section reach
 *    blocks as in the editor, except that a click in a row other than the
 *    one the selected block is in selects that row first. A double click
 *    goes straight to the block, with a collapsed caret where it landed.
 *
 *    Escape steps back as Create not Learn's does: from a block (or its
 *    text) in one step to the row it's in, or the section if none; from
 *    the row to the section; from the section to nothing.
 *
 *    The hover outline shows what the next click would select, and the
 *    pointer is an arrow where it would select a container, a text cursor
 *    where it would reach text. A section, row or Column selected by a
 *    click is the `click` route. Every press may be the first of a double
 *    click, so its counts are held (provisional, see app.js) and dropped if
 *    it was.
 *
 * 2. Create not Learn's parent selector, in place of the editor's, in the
 *    same box left of the toolbar. From two levels deep it has "···"
 *    ("Select a block further up"), which opens a list above the toolbar of
 *    every block the selected one sits in, outermost first: the outermost
 *    with its icon, each deeper one led by a rule as long as it is deep.
 *    Pointing at a row lights its block up; picking it selects it (route
 *    `lineage`). Then the select-parent button, with Create not Learn's own
 *    icon, which selects the parent as in the control (route `toolbar`).
 *
 * This file uses only the API in ../app.js (window.Utrillo.registerVariant).
 */
(function () {
  'use strict';

  window.Utrillo.registerVariant({
    id: 'create-not-learn',
    code: 'UE',
    init: function (api) {
      var canvas = api.canvas;

      // The block's title and a few of its words, for the log.
      function label(id) {
        var b = api.getBlock(id);
        if (!b) return String(id);
        if (b.isText) {
          var t = (b.text || '').trim();
          return b.title + ' “' + (t.length > 30 ? t.slice(0, 29).trimEnd() + '…' : t) + '”';
        }
        // A container: name it by its first words, as people do.
        var el = api.elementFor(id);
        var words = el && (el.querySelector('[data-block-name="core/heading"] .ut-rich') || el.querySelector('.ut-rich'));
        if (words) {
          var w = words.textContent.trim();
          return b.title + ' (“' + (w.length > 30 ? w.slice(0, 29).trimEnd() + '…' : w) + '”)';
        }
        return b.title;
      }

      // ---------- Rows of cards (rows.js getRowKind there) ----------

      // Blocks with blocks inside that are still one thing on the page.
      var WHOLE_BLOCKS = ['core/buttons'];
      // The kinds of blocks an item shows, sorted and joined.
      function kinds(block) {
        var out = {};
        (function visit(node) {
          if (WHOLE_BLOCKS.indexOf(node.name) !== -1 || !node.children.length) { out[node.name] = true; return; }
          node.children.forEach(visit);
        })(block);
        return Object.keys(out).sort().join();
      }
      // A row of columns: two or more Columns, alike. (No Column here has a
      // width of its own, and there are no grid Groups, Create not Learn's
      // other sort of row.)
      function isRow(id) {
        var b = api.getBlock(id);
        if (!b || b.name !== 'core/columns' || b.children.length < 2) return false;
        if (!b.children.every(function (c) { return c.name === 'core/column'; })) return false;
        var k = kinds(b.children[0]);
        return !!k && b.children.every(function (c) { return kinds(c) === k; });
      }
      // The row a block is in, or is, in its section: the outermost.
      function rowOf(id) {
        if (!id) return null;
        var chain = api.getAncestors(id).concat([id]);
        for (var i = 1; i < chain.length; i++) if (isRow(chain[i])) return chain[i];
        return null;
      }

      // ---------- Where a click goes ----------

      // What a click on `targetId` selects, with `selectedId` selected.
      function nextStop(targetId, selectedId) {
        if (!targetId) return null;
        var section = api.getTopLevelId(targetId);
        // Nothing selected, or something in another section: the section.
        if (!selectedId || api.getTopLevelId(selectedId) !== section) return section;
        // The row open: none with the section itself selected, else the row
        // the selected block is in (or is), as Create not Learn's follows it.
        var open = selectedId === section ? null : rowOf(selectedId);
        var row = rowOf(targetId);
        if (row && row !== open) return row;
        return targetId;
      }

      // A pointerdown's own `detail` is always 0, so a double click is told
      // apart here: a second press soon after the first, in the same place.
      var DOUBLE_MS = 500, DOUBLE_PX = 5;
      var lastPress = null;
      function isSecondPress(e) {
        var prev = lastPress;
        lastPress = { t: e.timeStamp, x: e.clientX, y: e.clientY };
        if (!prev || e.timeStamp - prev.t > DOUBLE_MS) return false;
        if (Math.abs(e.clientX - prev.x) > DOUBLE_PX || Math.abs(e.clientY - prev.y) > DOUBLE_PX) return false;
        lastPress = null; // a third press starts again
        return true;
      }

      // Set by a double click's second press that goes into text: its
      // mousedown is stopped, so the browser doesn't select the word, and
      // the caret is put at the point instead, collapsed.
      var collapseNext = null;

      api.setClickResolver(function (info) {
        var target = info.targetId;
        var selected = info.selectedId;
        var e = info.event;
        collapseNext = null;
        if (isSecondPress(e)) {
          // Straight to the block clicked, whatever the first press selected.
          // Already typing in that block, the browser's own double click
          // (selecting a word) is left alone, as Create not Learn leaves it.
          var typing = selected === target && api.isEditingText();
          if (target !== selected) api.log('arm', 'Double click: straight to ' + label(target) + (selected ? ' (the first press had selected ' + label(selected) + ')' : ''));
          var text = !!(api.getBlock(target) || {}).isText;
          if (text && !typing) collapseNext = { id: target, x: e.clientX, y: e.clientY };
          return { id: target, caret: text, double: true };
        }
        var id = nextStop(target, selected);
        if (!id) return null;
        if (id !== selected && api.isContainer(id)) {
          var kind = id === api.getTopLevelId(id) ? 'the section' : isRow(id) ? 'the row of cards' : 'a ' + api.getBlock(id).title;
          api.log('arm', 'Section click: ' + kind + ', ' + label(id) + (selected ? ' (from ' + label(selected) + ')' : ''));
        }
        // Always answer, so a click on a container's own area never counts as
        // the editor's `padding` route here. Held, in case it's the first
        // press of a double click.
        return { id: id, caret: !api.isContainer(id) && !!(api.getBlock(id) || {}).isText, provisional: DOUBLE_MS };
      });

      canvas.addEventListener('mousedown', function (e) {
        if (!collapseNext || e.detail < 2) return;
        var c = collapseNext;
        collapseNext = null;
        e.preventDefault();
        api.select(c.id, { caretAt: { x: c.x, y: c.y } });
      }, true);

      // ---------- Hover and the pointer ----------

      var last = null; // the last pointer position over the page

      function setCursor(id) {
        var text = !!id && !!(api.getBlock(id) || {}).isText;
        canvas.classList.toggle('cnl-next-text', text);
        canvas.classList.toggle('cnl-next-arrow', !text);
      }

      api.setHoverResolver(function (info) {
        last = { x: info.event.clientX, y: info.event.clientY };
        var id = info.targetId ? nextStop(info.targetId, info.selectedId) : null;
        setCursor(id);
        return id;
      });
      canvas.addEventListener('pointerleave', function () { last = null; });

      // After the selection changes the next stop changes too, though the
      // pointer hasn't moved: work the hover out again where the pointer is.
      function refreshHover() {
        if (!last) return;
        var el = document.elementFromPoint(last.x, last.y);
        if (!el || !canvas.contains(el)) return;
        el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: last.x, clientY: last.y, pointerType: 'mouse' }));
      }
      api.on('select', function () { refreshHover(); requestAnimationFrame(refreshHover); });
      api.on('render', function () { requestAnimationFrame(refreshHover); });

      // ---------- Escape ----------

      // A block (or its text) → the row it's in, or the section; the row →
      // the section; the section → nothing. Out of the text in the same step.
      function outerStop(id) {
        var section = api.getTopLevelId(id);
        if (id === section) return null;
        if (isRow(id)) return section;
        return rowOf(id) || section;
      }

      api.setEscapeHandler(function (info) {
        // An open "···" list closes first, back to its button.
        if (lineageOpen) { closeLineage({ focusButton: true }); return true; }
        var selected = info.selectedId;
        if (!selected) return false;
        var out = outerStop(selected);
        api.count('escapeOut', 'Escape steps out');
        if (out) {
          api.log('arm', 'Escape: stepped out from ' + label(selected) + (info.editing ? ' (and its text)' : '') + ' to ' + label(out));
          api.select(out, { route: 'escape' });
        } else {
          api.log('arm', 'Escape: stepped out from ' + label(selected) + ' to nothing selected');
          api.clearSelection();
        }
        return true;
      });

      setCursor(null);

      // ---------- The parent selector, as Create not Learn draws it ----------

      // Create not Learn's select-parent icon: a block in front of the one it
      // sits in (src/block-toolbar/parent-selector.jsx there).
      var SELECT_PARENT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" style="fill:none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false"><path d="M8.75 8.75V6c0-.69.56-1.25 1.25-1.25h8c.69 0 1.25.56 1.25 1.25v8c0 .69-.56 1.25-1.25 1.25h-2.75" /><rect x="4.75" y="8.75" width="10.5" height="10.5" rx="1.25" /></svg>';
      // The editor's moreHorizontal, from @wordpress/icons 20.
      var MORE_HORIZONTAL = '<svg viewBox="0 0 24 24" style="fill:none" stroke="currentColor" stroke-width="1.5" width="24" height="24" aria-hidden="true" focusable="false"><path d="M18.25 12.25L18.25 11.75L17.75 11.75L17.75 12.25L18.25 12.25Z" fill="currentColor" stroke="none"></path><path d="M12.25 12.25L12.25 11.75L11.75 11.75L11.75 12.25L12.25 12.25Z" fill="currentColor" stroke="none"></path><path d="M6.25 12.25L6.25 11.75L5.75 11.75L5.75 12.25L6.25 12.25Z" fill="currentColor" stroke="none"></path><path d="M18.25 12.25L18.25 11.75L17.75 11.75L17.75 12.25L18.25 12.25Z"></path><path d="M12.25 12.25L12.25 11.75L11.75 11.75L11.75 12.25L12.25 12.25Z"></path><path d="M6.25 12.25L6.25 11.75L5.75 11.75L5.75 12.25L6.25 12.25Z"></path></svg>';
      var LINEAGE_LABEL = 'Select a block further up';

      var lineageOpen = false;   // the "···" list is open
      var lineageFor = null;     // the block it was opened on
      var lineageHighlight = null;
      var menu = document.createElement('div');
      menu.className = 'cnl-lineage';
      menu.setAttribute('role', 'menu');
      menu.setAttribute('aria-label', LINEAGE_LABEL);
      menu.tabIndex = -1;
      menu.hidden = true;
      document.body.append(menu);

      function escHtml(t) {
        return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
      }
      function lineageButton() {
        var box = api.parentSelectorBox();
        return box ? box.querySelector('.cnl-lineage-btn') : null;
      }

      // "···" only from two levels deep: with one block around it, the
      // select-parent button is all there is to pick.
      api.setParentSelector({
        icon: SELECT_PARENT,
        before: function (id) {
          if (api.getAncestors(id).length < 2) return '';
          return '<button type="button" class="ut-tb-btn cnl-lineage-btn" aria-label="' + LINEAGE_LABEL + '" data-tooltip="' + LINEAGE_LABEL + '" aria-haspopup="true" aria-expanded="' + (lineageOpen && lineageFor === id) + '">' + MORE_HORIZONTAL + '</button>';
        },
        onClick: function (info) {
          if (!info.target.closest('.cnl-lineage-btn')) return;
          if (lineageOpen) { closeLineage({ focusButton: true }); return; }
          // A click from the keyboard (Enter or Space) has no clicks to
          // count: focus the first row then, as menus do.
          openLineage(info.id, info.event.detail === 0);
        }
      });

      function renderLineage() {
        var ids = api.getAncestors(lineageFor);
        menu.innerHTML = ids.map(function (id, depth) {
          var b = api.getBlock(id);
          var lead = depth
            ? '<span class="cnl-lineage__rule" style="--cnl-lineage-depth:' + depth + '" aria-hidden="true"></span>'
            : '<span class="cnl-lineage__icon" aria-hidden="true">' + b.icon + '</span>';
          return '<button type="button" role="menuitem" tabindex="-1" class="ut-menu-item cnl-lineage__item" data-lineage-id="' + escHtml(id) + '" data-depth="' + depth + '"><span class="cnl-lineage__label">' + lead + escHtml(b.title) + '</span></button>';
        }).join('');
      }

      // Above the "···" button, left edges lined up, 8px between, as
      // Create not Learn opens it; below the button only if there's no room
      // above in the canvas. Kept inside the canvas sideways.
      function placeLineage() {
        if (!lineageOpen) return;
        var btn = lineageButton();
        if (!btn) { closeLineage(); return; }
        var b = btn.getBoundingClientRect();
        var c = canvas.getBoundingClientRect();
        var vis = { top: c.top + 4, left: c.left + 4, bottom: c.top + canvas.clientHeight - 4, right: c.left + canvas.clientWidth - 4 };
        var w = menu.offsetWidth;
        var h = menu.offsetHeight;
        var top = b.top - 8 - h;
        menu.dataset.side = 'top';
        if (top < vis.top) { top = b.bottom + 8; menu.dataset.side = 'bottom'; }
        var left = b.left;
        if (left + w > vis.right) left = vis.right - w;
        if (left < vis.left) left = vis.left;
        menu.style.top = Math.round(top) + 'px';
        menu.style.left = Math.round(left) + 'px';
      }

      function openLineage(id, fromKeyboard) {
        lineageFor = id;
        lineageOpen = true;
        setLineageHighlight(null);
        renderLineage();
        menu.hidden = false;
        var btn = lineageButton();
        if (btn) btn.setAttribute('aria-expanded', 'true');
        placeLineage();
        api.count('lineageOpened', '“···” list opened');
        api.log('arm', 'Opened the “···” list on ' + label(id) + ': ' + api.getAncestors(id).map(function (a) { return api.getBlock(a).title; }).join(', '));
        var first = menu.querySelector('[data-lineage-id]');
        if (fromKeyboard && first) first.focus({ preventScroll: true });
        else menu.focus({ preventScroll: true });
      }

      function closeLineage(opts) {
        if (!lineageOpen) return;
        lineageOpen = false;
        lineageFor = null;
        menu.hidden = true;
        menu.innerHTML = '';
        setLineageHighlight(null);
        var btn = lineageButton();
        if (btn) {
          btn.setAttribute('aria-expanded', 'false');
          if (opts && opts.focusButton) btn.focus({ preventScroll: true });
        }
      }

      function setLineageHighlight(id) {
        if (id === lineageHighlight) return;
        lineageHighlight = id;
        api.highlight(id);
      }

      menu.addEventListener('pointerover', function (e) {
        var row = e.target.closest('[data-lineage-id]');
        setLineageHighlight(row ? row.dataset.lineageId : null);
      });
      menu.addEventListener('pointerleave', function () { setLineageHighlight(null); });
      // Focus leaving the list (but not to its own button) closes it.
      menu.addEventListener('focusout', function (e) {
        if (!lineageOpen) return;
        var to = e.relatedTarget;
        if (to && menu.contains(to)) return;
        var btn = lineageButton();
        if (to && btn && btn === to) return;
        // A press on a row moves focus to it; a press on the list's own
        // padding has nowhere to go (null): keep the list then.
        if (!to && menu.matches(':hover')) return;
        closeLineage();
      });
      menu.addEventListener('focusin', function (e) {
        var row = e.target.closest('[data-lineage-id]');
        if (row && row.matches(':focus-visible')) setLineageHighlight(row.dataset.lineageId);
      });
      menu.addEventListener('click', function (e) {
        var row = e.target.closest('[data-lineage-id]');
        if (!row) return;
        var id = row.dataset.lineageId;
        var from = lineageFor;
        var depth = Number(row.dataset.depth);
        closeLineage();
        api.count('lineagePicked', '“···” rows picked');
        api.log('arm', 'Picked ' + label(id) + ' (row ' + (depth + 1) + ') in the “···” list on ' + label(from));
        api.select(id, { route: 'lineage' });
      });
      // The rows aren't in the Tab order (tabindex -1): the arrow keys move
      // between them, and Tab or Shift+Tab closes the list, going on from the
      // "···" button, as Create not Learn's menu does.
      menu.addEventListener('keydown', function (e) {
        // Delete and Backspace here mustn't delete the selected block.
        if (e.key === 'Delete' || e.key === 'Backspace') { e.stopPropagation(); return; }
        if (e.key === 'Tab') {
          var btn = lineageButton();
          // Focus moves to the button first, so Tab's own move goes on from it.
          if (btn) btn.focus({ preventScroll: true });
          closeLineage();
          return;
        }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
        var rows = Array.prototype.slice.call(menu.querySelectorAll('[data-lineage-id]'));
        var i = rows.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') i = i < 0 ? 0 : Math.min(rows.length - 1, i + 1);
        else if (e.key === 'ArrowUp') i = i < 0 ? rows.length - 1 : Math.max(0, i - 1);
        else if (e.key === 'Home') i = 0;
        else i = rows.length - 1;
        e.preventDefault();
        if (rows[i]) rows[i].focus();
      });

      // A press outside the list and its button closes it; the press still
      // does whatever it does.
      document.addEventListener('pointerdown', function (e) {
        if (!lineageOpen) return;
        if (menu.contains(e.target)) return;
        var btn = lineageButton();
        if (btn && btn.contains(e.target)) return;
        closeLineage();
      }, true);

      api.on('select', function () { closeLineage(); });
      api.on('change', function () { closeLineage(); });
      api.on('render', function (e) {
        if (e && e.reason === 'reset') closeLineage();
        requestAnimationFrame(placeLineage);
      });
      api.on('scroll', function () { placeLineage(); });
      window.addEventListener('resize', function () { placeLineage(); });
    }
  });
})();
