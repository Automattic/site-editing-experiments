/*
 * Vermeer · A2 · Ask on click
 *
 * The click that A1 takes straight into edit mode (in browse, on anything that
 * isn't a link, button, box or a box's label, and not the end of a drag to
 * select text) instead opens a small popover at that spot: "Do you want to
 * edit?", with No and Edit (primary). Edit lands as A1 does: the caret where
 * the person clicked, or for a picture or background its section outlined.
 * Route: a2-popover. Prompt kind: popover.
 *
 * Outcomes: Edit = accepted; No or Escape = dismissed; a click anywhere else,
 * scrolling the site, going to another page, or the site being redrawn =
 * ignored. That other click still does what it would have done: a link goes,
 * a button works, and another click on a plain spot opens the popover again
 * there. It asks every time. A double-click keeps the popover its first click
 * opened, rather than closing it and opening another at the same spot.
 *
 * Keyboard: when it opens, focus moves to Edit; Tab and Shift+Tab move
 * between No and Edit, Escape closes it and focus goes back where it was (the
 * site area, which a click there gives focus to). The spots it opens on can't
 * take keyboard focus, so keyboard users go in by the Edit button, as in
 * every arm.
 *
 * This file uses only the API in ../app.js (window.Vermeer).
 */
(function () {
  'use strict';

  const GAP = 12;          // between the click point and the popover
  const MARGIN = 8;        // between the popover and the edges of the site area
  const ARROW_IN = 18;     // how far in from the popover's side its arrow can go
  const DOUBLE_PX = 6;     // a second press this close to the first is a double-click

  window.Vermeer.registerVariant({
    id: 'ask-on-click',
    init(api) {
      api.registerRoute('a2-popover', 'Edit, in the popover (A2)');
      const vp = api.viewport;
      let open = null;     // { el, id, target, point, prevFocus, scrollTop, keep }
      let uid = 0;

      function show(info, target, point) {
        if (open) close('ignored', 'another click on the site');
        const el = document.createElement('div');
        const titleId = 'vm-ask-title-' + (++uid);
        el.className = 'vm-ask';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-labelledby', titleId);
        el.innerHTML = '<p class="vm-ask-title" id="' + titleId + '">Do you want to edit?</p>' +
          '<div class="vm-ask-actions">' +
            '<button type="button" class="vm-btn vm-btn-secondary" data-choice="no">No</button>' +
            '<button type="button" class="vm-btn vm-btn-primary" data-choice="edit">Edit</button>' +
          '</div>';
        const prevFocus = document.activeElement;
        api.layer.append(el);
        place(el, point);
        const id = api.promptShown('popover', 'on ' + info.label);
        open = { el, id, target, point, prevFocus, scrollTop: vp.scrollTop, keep: false };
        el.addEventListener('click', onChoice);
        el.addEventListener('keydown', onKey);
        el.querySelector('[data-choice="edit"]').focus({ preventScroll: true });
      }

      // Below the point if it fits, else above; never outside the site area
      // (the viewport less its scrollbar). The arrow points at the spot.
      function place(el, point) {
        const W = vp.clientWidth, H = vp.clientHeight;
        const p = api.toLayer(point.x, point.y);
        const w = el.offsetWidth, h = el.offsetHeight;
        const left = Math.max(MARGIN, Math.min(p.x - 28, W - w - MARGIN));
        let top = p.y + GAP, side = 'below';
        if (top + h > H - MARGIN) {
          if (p.y - GAP - h >= MARGIN) { top = p.y - GAP - h; side = 'above'; }
          else { top = Math.max(MARGIN, H - MARGIN - h); side = 'none'; }
        }
        el.style.left = Math.round(left) + 'px';
        el.style.top = Math.round(top) + 'px';
        el.style.setProperty('--arrow-x', Math.round(Math.max(ARROW_IN, Math.min(p.x - left, w - ARROW_IN))) + 'px');
        el.dataset.side = side;
      }

      function close(outcome, detail, refocus) {
        if (!open) return null;
        const o = open;
        open = null;
        const hadFocus = o.el.contains(document.activeElement);
        o.el.remove();
        api.promptOutcome(o.id, outcome, detail);
        if (refocus && hadFocus) {
          const prev = o.prevFocus;
          if (prev && prev.isConnected && prev !== document.body && !api.layer.contains(prev)) prev.focus({ preventScroll: true });
          else vp.focus({ preventScroll: true });
        }
        return o;
      }

      function onChoice(e) {
        const b = e.target.closest('[data-choice]');
        if (!b || !open) return;
        if (b.dataset.choice === 'no') { close('dismissed', 'No', true); return; }
        const o = close('accepted', 'Edit');
        api.enterEdit('a2-popover', { target: o.target, x: o.point.x, y: o.point.y });
      }

      function onKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          close('dismissed', 'Escape', true);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          const bs = [...open.el.querySelectorAll('button')];
          const i = bs.indexOf(document.activeElement);
          bs[(i + (e.shiftKey ? bs.length - 1 : 1)) % bs.length].focus();
        }
      }
      document.addEventListener('keydown', (e) => {
        if (open && e.key === 'Escape' && !open.el.contains(document.activeElement)) {
          e.preventDefault();
          close('dismissed', 'Escape', true);
        }
      }, true);

      // Going away without a choice.
      document.addEventListener('mousedown', (e) => {
        if (!open || open.el.contains(e.target)) return;
        const p = open.point;
        if (e.detail >= 2 && Math.abs(e.clientX - p.x) <= DOUBLE_PX && Math.abs(e.clientY - p.y) <= DOUBLE_PX) {
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

      // The click: app.js has already counted it; this runs in the bubble
      // phase on the site, before app.js's default action for links and
      // buttons, which this leaves alone.
      api.site.addEventListener('click', (e) => {
        if (api.mode() !== 'browse' || e.button !== 0) return;
        const info = api.clickInfo(e);
        if (!info || info.kind !== 'none' || info.selecting) return;
        e.preventDefault();
        if (open && open.keep && e.detail >= 2) { open.keep = false; return; }
        if (e.detail === 0) return; // no point to ask at
        show(info, e.target, { x: e.clientX, y: e.clientY });
      });
    }
  });
})();
