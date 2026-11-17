/*
 * Utrillo · B · Section first
 *
 * Clicks go from the outside in, as in a section-based editor. A click on
 * the page goes to the next "stop" under the pointer, counting from what is
 * selected now. The stops, from outside in, are:
 *
 *   1. the top-level section (the Cover or a Group)
 *   2. the Column under the pointer, if the click is inside a Columns
 *   3. the block clicked (with the caret where you clicked, for text)
 *
 * Columns, Buttons and inner Groups aren't stops (they can still be selected
 * with the toolbar, the ⋮ menu, the breadcrumb and Document Overview), so a
 * click in the Cover goes from the Cover straight to its Button.
 *
 * So: with nothing selected, or something in another section, a click
 * selects the section. With the section selected, the next click selects the
 * Column under the pointer (or the block, where there's no Column). With a
 * Column selected, the next click selects the block. With a block selected, a
 * click in the same block moves the caret; on another block in the same Column
 * (or the same section, where there's no Column) it goes straight there; and
 * anywhere else in the section it goes to that point's Column. A double click
 * goes straight to the block, caret there.
 *
 * Escape goes back out a stop: out of the text first (as the editor's own
 * Escape), then block → Column (or section) → section → nothing.
 *
 * The hover outline shows what the next click would select, and the pointer
 * is an arrow where it would select a container, a text cursor where it would
 * reach text.
 *
 * This file uses only the API in ../app.js (window.Utrillo.registerVariant).
 */
(function () {
  'use strict';

  window.Utrillo.registerVariant({
    id: 'section-first',
    code: 'UB',
    init: function (api) {
      var canvas = api.canvas;

      function blockName(id) {
        var el = api.elementFor(id);
        return el ? el.dataset.blockName : null;
      }
      // The block's title and a few of its words, for the log.
      function label(id) {
        var b = api.getBlock(id);
        if (!b) return String(id);
        if (b.isText) {
          var t = (b.text || '').trim();
          return b.title + ' “' + (t.length > 30 ? t.slice(0, 29).trimEnd() + '…' : t) + '”';
        }
        // A section or a Column: name it by its first words, as people do.
        var el = api.elementFor(id);
        var words = el && (el.querySelector('[data-block-name="core/heading"] .ut-rich') || el.querySelector('.ut-rich'));
        if (words) {
          var w = words.textContent.trim();
          return b.title + ' (“' + (w.length > 30 ? w.slice(0, 29).trimEnd() + '…' : w) + '”)';
        }
        return b.title;
      }

      // The stops under a block, from the outside in: [section, Column?, block?].
      // A container that isn't a stop (Columns, Buttons, a Column's empty
      // space) ends the list at the stop around it.
      function stopsFor(id) {
        if (!id) return [];
        var section = api.getTopLevelId(id);
        var stops = [section];
        if (id === section) return stops;
        var chain = api.getAncestors(id).concat([id]);
        for (var i = 1; i < chain.length; i++) {
          if (blockName(chain[i]) === 'core/column') stops.push(chain[i]);
        }
        if (!api.isContainer(id)) stops.push(id);
        return stops;
      }

      // Is `a` the block `b` or one of its ancestors?
      function contains(a, b) {
        return a === b || api.getAncestors(b).indexOf(a) !== -1;
      }

      // What a click on `targetId` selects, with `selectedId` selected: the
      // stop just inside the deepest stop that holds the selection. With the
      // selection in another section (or nothing selected), that's the section.
      function nextStop(targetId, selectedId) {
        var stops = stopsFor(targetId);
        if (!stops.length) return null;
        var depth = -1;
        if (selectedId) {
          for (var i = 0; i < stops.length; i++) {
            if (contains(stops[i], selectedId)) depth = i;
          }
        }
        return stops[Math.min(depth + 1, stops.length - 1)];
      }
      // A double click: the innermost stop under the pointer.
      function innermostStop(targetId) {
        var stops = stopsFor(targetId);
        return stops.length ? stops[stops.length - 1] : null;
      }

      // ---------- Clicks ----------

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

      api.setClickResolver(function (info) {
        var target = info.targetId;
        var selected = info.selectedId;
        var id;
        if (isSecondPress(info.event)) {
          // The second press of a double click: straight to the block clicked.
          // The first press has already gone one stop in; this one finishes
          // the job, whatever that first press selected.
          id = innermostStop(target);
          // The first press has already been counted as a click (route
          // `click` if it selected a container, and in k): count these so the
          // facilitator can take them off.
          // Only when that first press stopped at a container: a double click
          // inside text already being edited added nothing to take off.
          if (selected && api.isContainer(selected) && id !== selected) {
            api.count('dblFirstPress', 'Double click first presses');
          }
          if (id && id !== selected) {
            api.log('arm', 'Double click: straight to ' + label(id) + (selected ? ' (the first click had selected ' + label(selected) + ')' : ''));
          }
        } else {
          id = nextStop(target, selected);
          if (id && id !== selected) {
            var stops = stopsFor(id);
            var kind = stops.length === 1 ? 'the section' : (blockName(id) === 'core/column' ? 'a Column' : 'the block');
            api.log('arm', 'Section-first click: ' + kind + ', ' + label(id) + (selected ? ' (from ' + label(selected) + ')' : ''));
          }
        }
        if (!id) return null;
        // Always answer, so a click on a container's own area never counts as
        // the editor's `padding` route here: in this arm it's a stop.
        return { id: id, caret: !api.isContainer(id) && !!(api.getBlock(id) || {}).isText };
      });

      // ---------- Hover and the pointer ----------

      var last = null; // the last pointer position over the page

      function setCursor(id) {
        var text = !!id && !!(api.getBlock(id) || {}).isText;
        canvas.classList.toggle('sf-next-text', text);
        canvas.classList.toggle('sf-next-arrow', !text);
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
      // Straight away, so the outline is right as soon as the selection
      // changes, and again after the frame in case the layout moved.
      api.on('select', function () { refreshHover(); requestAnimationFrame(refreshHover); });
      api.on('render', function () { requestAnimationFrame(refreshHover); });

      // ---------- Escape ----------

      // The stop around a block: the deepest stop that holds it, itself not
      // included. Null for a section.
      function outerStop(id) {
        var stops = stopsFor(id);
        for (var i = stops.length - 1; i >= 0; i--) {
          if (stops[i] !== id) return stops[i];
        }
        return null;
      }

      api.setEscapeHandler(function (info) {
        // Leaving the text comes first, as the editor's own Escape does.
        if (info.editing) return false;
        var selected = info.selectedId;
        if (!selected) return false;
        var out = outerStop(selected);
        api.count('escapeOut', 'Escape steps out');
        if (out) {
          api.log('arm', 'Escape: stepped out from ' + label(selected) + ' to ' + label(out));
          api.select(out, { route: 'escape' });
        } else {
          api.log('arm', 'Escape: stepped out from ' + label(selected) + ' to nothing selected');
          api.clearSelection();
        }
        return true;
      });

      setCursor(null);
    }
  });
})();
