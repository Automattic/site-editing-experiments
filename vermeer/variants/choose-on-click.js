/*
 * Vermeer · C · Choose on click
 *
 * Every click (or tap) on the site in browse opens a small popup at that spot
 * with two choices, side by side and the same size: first what the click
 * would have done, then editing (styled primary).
 *
 *   on a link            "Go to <page name>" (Go to Events), or "Follow this link"
 *                        for a link further down the same page → follows it
 *   on a button          "Use this button"            → presses it
 *   on a box or its label "Fill in this box"          → puts the caret in the box
 *   anywhere else        "Keep looking"               → closes the popup
 *
 * The edit choice is "Edit this" on anything with words (a link's or a
 * button's words, a box's label, a heading, a paragraph) and "Edit this page"
 * on a picture or a background. It lands as A1 does: the caret where the
 * person clicked (in the link's or button's words too), or the section
 * outlined. Route: c-popup. Prompt kind: popup.
 *
 * Outcomes: Edit this = accepted; the first choice = followed (link, button,
 * box) or dismissed (Keep looking); Escape = dismissed; a click anywhere else,
 * scrolling the site, going to another page, or the site being redrawn =
 * ignored. A click elsewhere still does what it would have done (on the site,
 * that's another popup there). It asks every time.
 *
 * Boxes: a click on a box that doesn't have focus is held back (its mousedown
 * is cancelled, so the box doesn't take focus) and asks. Once the box has
 * focus, through "Fill in this box" or by Tab, typing works and clicks in it
 * go straight through. Moving into a box with Tab never asks.
 *
 * Keyboard: Enter on a link, and Enter or Space on a button, make the browser
 * send a click with no pointer (event.detail === 0); that click is caught like
 * any other and asks, with the popup under the link or button. Space on a
 * link (which browsers don't treat as a press) asks too: its keydown is
 * cancelled, so the page doesn't scroll, and the popup opens on keyup. Enter
 * in a box, which submits the form by itself, goes straight through. In the
 * popup, focus starts on the first choice; Tab and Shift+Tab move between the
 * two, Escape closes it and focus goes back where it was.
 *
 * A double-click keeps the popup its first click opened, rather than closing
 * it and opening another at the same spot.
 *
 * This file uses only the API in ../app.js (window.Vermeer).
 */
(function () {
  'use strict';

  const GAP = 12;          // between the click point and the popup
  const MARGIN = 8;        // between the popup and the edges of the site area
  const ARROW_IN = 18;     // how far in from the popup's side its arrow can go
  const DOUBLE_PX = 6;     // a second press this close to the first is a double-click
  const PENCIL = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="m19 7-3-3-8.5 8.5-1 4 4-1L19 7Zm-7 11.5H5V20h7v-1.5Z"/></svg>';

  window.Vermeer.registerVariant({
    id: 'choose-on-click',
    init(api) {
      api.registerRoute('c-popup', 'Edit this, in the popup (C)');
      const vp = api.viewport;

      let open = null;        // { el, id, info, target, point, anchor, prevFocus, scrollTop, keep }
      let passField = null;   // a box that already had focus when pressed: let its click through
      let spaceLink = null;   // a link with Space held down on it

      // ---------- Showing, placing and closing the popup ----------

      const quote = (s) => '“' + s + '”';
      function describe(info, keyboard) {
        const how = keyboard ? ', by keyboard' : '';
        if (info.kind === 'link') return 'on the link ' + quote(info.label) + how;
        if (info.kind === 'button') return 'on the button ' + quote(info.label) + how;
        if (info.kind === 'field') return 'on the box ' + quote(info.label) + how;
        return 'on ' + info.label + how;
      }
      function firstChoice(info) {
        if (info.kind === 'link') return info.samePage ? 'Follow this link' : 'Go to ' + info.toName;
        if (info.kind === 'button') return 'Use this button';
        if (info.kind === 'field') return 'Fill in this box';
        return 'Keep looking';
      }

      // anchor: { x, top, bottom } in client coordinates. A click is a point
      // (top = bottom); a keyboard press anchors to the link or button.
      function show(info, target, anchor, point, keyboard) {
        if (open) close('ignored', 'another click on the site');
        const first = firstChoice(info);
        const edit = info.textEl ? 'Edit this' : 'Edit this page';
        const el = document.createElement('div');
        el.className = 'vm-choose';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-label', 'What would you like to do?');
        el.innerHTML = '<div class="vm-choose-actions">' +
          '<button type="button" class="vm-btn vm-btn-secondary" data-choice="do"></button>' +
          '<button type="button" class="vm-btn vm-btn-primary" data-choice="edit">' + PENCIL + '<span></span></button>' +
          '</div>';
        el.querySelector('[data-choice="do"]').textContent = first;
        el.querySelector('[data-choice="edit"] span').textContent = edit;
        const prevFocus = document.activeElement;
        api.layer.append(el);
        place(el, anchor);
        const id = api.promptShown('popup', describe(info, keyboard));
        open = { el, id, info, target, point, anchor, prevFocus, scrollTop: vp.scrollTop, first, edit, keep: false };
        el.addEventListener('click', onChoice);
        el.addEventListener('keydown', onKey);
        el.querySelector('[data-choice="do"]').focus({ preventScroll: true });
      }

      // Below the point if it fits, else above; never outside the site area
      // (the viewport less its scrollbar). The arrow points at the spot.
      function place(el, anchor) {
        const W = vp.clientWidth, H = vp.clientHeight;
        const a = api.toLayer(anchor.x, anchor.top);
        const b = api.toLayer(anchor.x, anchor.bottom);
        const w = el.offsetWidth, h = el.offsetHeight;
        let left = Math.max(MARGIN, Math.min(a.x - 28, W - w - MARGIN));
        let top = b.y + GAP, side = 'below';
        if (top + h > H - MARGIN) {
          if (a.y - GAP - h >= MARGIN) { top = a.y - GAP - h; side = 'above'; }
          else { top = Math.max(MARGIN, H - MARGIN - h); side = 'none'; }
        }
        el.style.left = Math.round(left) + 'px';
        el.style.top = Math.round(top) + 'px';
        el.style.setProperty('--arrow-x', Math.round(Math.max(ARROW_IN, Math.min(a.x - left, w - ARROW_IN))) + 'px');
        el.dataset.side = side;
      }

      function close(outcome, detail, refocus) {
        if (!open) return null;
        const o = open;
        open = null;
        const hadFocus = o.el.contains(document.activeElement);
        o.el.remove();
        api.promptOutcome(o.id, outcome, detail);
        if (refocus && hadFocus) restoreFocus(o.prevFocus);
        return o;
      }
      function restoreFocus(prev) {
        if (prev && prev.isConnected && prev !== document.body && !api.layer.contains(prev)) prev.focus({ preventScroll: true });
        else vp.focus({ preventScroll: true });
      }

      // ---------- The two choices ----------

      function onChoice(e) {
        const b = e.target.closest('[data-choice]');
        if (!b || !open) return;
        const o = open;
        if (b.dataset.choice === 'edit') {
          close('accepted', o.edit);
          api.enterEdit('c-popup', Object.assign({ target: o.target }, o.point || {}));
          return;
        }
        if (o.info.kind === 'none') { close('dismissed', 'Keep looking', true); return; }
        close('followed', o.first);
        const key = o.info.el && o.info.el.dataset.k;
        api.perform(o.target, { via: 'popup' });
        // Where focus goes: perform() focuses the box, or the button it
        // pressed; after a link, or a form that was sent and redrawn, the
        // same link or button if it's still there, else the site area.
        const now = document.activeElement;
        if (!now || now === document.body || !now.isConnected) {
          const same = key && o.info.kind !== 'link' ? api.site.querySelector('[data-k="' + key + '"]') : null;
          if (same && same.matches('a, button')) same.focus({ preventScroll: true });
          else vp.focus({ preventScroll: true });
        }
      }

      function onKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          close('dismissed', 'Escape', true);
        } else if (e.key === 'Tab') {
          // Keep focus on the two choices until one is made or Escape.
          e.preventDefault();
          const bs = [...open.el.querySelectorAll('button')];
          const i = bs.indexOf(document.activeElement);
          bs[(i + (e.shiftKey ? bs.length - 1 : 1)) % bs.length].focus();
        }
      }
      // Escape when focus has wandered out of the popup (a click on its edge).
      document.addEventListener('keydown', (e) => {
        if (open && e.key === 'Escape' && !open.el.contains(document.activeElement)) {
          e.preventDefault();
          close('dismissed', 'Escape', true);
        }
      }, true);

      // ---------- Going away without a choice ----------

      // A press anywhere but the popup: ignored, and the press carries on
      // (on the site, its click opens a new popup there). The second press of
      // a double-click on the same spot keeps the popup instead.
      document.addEventListener('mousedown', (e) => {
        if (!open || open.el.contains(e.target)) return;
        const p = open.point;
        if (e.detail >= 2 && p && Math.abs(e.clientX - p.x) <= DOUBLE_PX && Math.abs(e.clientY - p.y) <= DOUBLE_PX) {
          open.keep = true;
          e.preventDefault();
          return;
        }
        close('ignored', api.site.contains(e.target) ? 'clicked elsewhere on the site' : 'clicked outside the site');
      }, true);
      api.on('scroll', () => {
        if (open && Math.abs(vp.scrollTop - open.scrollTop) > 2) close('ignored', 'scrolled the site', true);
      });
      api.on('render', () => close('ignored', 'the page changed'));
      api.on('modechange', () => close('ignored', 'went into editing another way'));
      window.addEventListener('resize', () => close('ignored', 'the window changed size', true));

      // ---------- Clicks on the site ----------

      const fieldOf = (t) => (t && t.closest ? t.closest('input, textarea, select') : null);

      // A press on a box that hasn't got focus: don't let it take focus yet.
      api.site.addEventListener('mousedown', (e) => {
        passField = null;
        if (api.mode() !== 'browse') return;
        const f = fieldOf(e.target);
        if (!f) return;
        if (document.activeElement === f) passField = f;
        else e.preventDefault();
      });

      function anchorOf(el) {
        const r = el.getBoundingClientRect();
        const vr = vp.getBoundingClientRect();
        const x = Math.max(vr.left, Math.min(r.left + Math.min(r.width / 2, 40), vr.right));
        return { x, top: Math.max(r.top, vr.top), bottom: Math.min(r.bottom, vr.bottom) };
      }

      // Capture phase on the site: after app.js has counted the click, before
      // its default action (which preventDefault() stops).
      api.site.addEventListener('click', (e) => {
        if (api.mode() !== 'browse') return;
        const info = api.clickInfo(e) || api.classify(e.target);
        const keyboard = e.detail === 0;
        if (keyboard) {
          // Enter in a box submits its form by sending a click to the submit
          // button; that isn't a press of the button, so let it through.
          if (info.kind === 'button' && info.el.type === 'submit' && document.activeElement !== info.el) return;
          if (info.kind !== 'link' && info.kind !== 'button') return;
          e.preventDefault();
          show(info, info.el, anchorOf(info.el), null, true);
          return;
        }
        if (open && open.keep && e.detail >= 2) { open.keep = false; e.preventDefault(); return; }
        if (info.kind === 'field' && passField && passField === info.el) { passField = null; return; }
        passField = null;
        if (info.kind === 'none' && info.selecting) return;
        e.preventDefault();
        const point = { x: e.clientX, y: e.clientY };
        show(info, e.target, { x: point.x, top: point.y, bottom: point.y }, point, false);
      }, true);

      // Space on a link: no scroll, and ask on keyup, as a button would.
      api.site.addEventListener('keydown', (e) => {
        if (api.mode() !== 'browse' || e.key !== ' ') return;
        const a = e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        e.preventDefault();
        spaceLink = a;
      });
      api.site.addEventListener('keyup', (e) => {
        if (e.key !== ' ' || !spaceLink) return;
        const a = spaceLink;
        spaceLink = null;
        if (api.mode() !== 'browse' || !a.isConnected || e.target.closest('a[href]') !== a) return;
        e.preventDefault();
        show(api.classify(a), a, anchorOf(a), null, true);
      });
    }
  });
})();
