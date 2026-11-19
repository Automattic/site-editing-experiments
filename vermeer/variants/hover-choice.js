/*
 * Vermeer · D · Hover choice
 *
 * When the pointer rests on the site for HOVER_REST_MS, a pale layer covers the
 * site area with “What would you like to do?” and two large buttons, Edit and
 * Browse. Route: d-overlay (d-overlay-keyboard when Edit is pressed from the
 * keyboard). Prompt kind: overlay.
 *
 *   - Shown when the pointer (mouse or pen) has moved on the site and then
 *     rested for HOVER_REST_MS. A pointer that was already resting on the site
 *     when the page loaded doesn't count until it moves. Scrolling restarts
 *     the wait: scrolling isn't resting.
 *   - Edit: accepted, edit mode with nothing selected.
 *   - Browse (or Escape): dismissed. Not shown again in this browse spell,
 *     even after a reload; back after the next Exit.
 *   - The pointer leaving the site area before a choice: ignored; it comes
 *     back on the next rest. So does going into editing another way, or to
 *     another page, while it's showing.
 *   - A click on the pale layer outside the buttons does nothing (counted in
 *     the notes). The mouse wheel over it still scrolls the site underneath.
 *   - Keyboard: focus moving into the site from outside it shows the layer
 *     with focus on Edit; Tab and Shift-Tab move between the two buttons;
 *     Escape is Browse, and puts focus back where it was going.
 *   - Touch: a touch on the site shows it and does nothing else (the tap isn't
 *     passed through). Browse stops that for the browse spell; after that taps
 *     work as usual.
 *   - Never shown in edit mode, while a dialog (Exit, Finished) is open, or
 *     while the page list is open.
 *   - A layer open when the page is reloaded is recorded as ignored by app.js;
 *     this file keeps the open prompt's id only in memory, so it never records
 *     a second outcome for it.
 */
(function () {
  'use strict';
  if (!window.Vermeer) return;

  window.Vermeer.registerVariant({
    id: 'hover-choice',
    init(api) {
      api.registerRoute('d-overlay', 'the layer’s Edit');
      api.registerRoute('d-overlay-keyboard', 'the layer’s Edit, by keyboard');

      const stage = api.viewport.parentElement;
      const pencil = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="m19 7-3-3-8.5 8.5-1 4 4-1L19 7Zm-7 11.5H5V20h7v-1.5Z"/></svg>';

      let overlay = null;
      let promptId = null;   // memory only: see the note above
      let restTimer = null;
      let pointerInside = false;
      let moved = false;
      let keyboardInUse = false; // a key pressed since the last pointer press
      let kbAnchor = null;
      let programmatic = false;
      let touchPending = false;

      const blocked = () => api.mode() !== 'browse' || !!document.querySelector('dialog[open], .vm-picker');
      const eligible = () => !overlay && !blocked() && !api.spell.get('dismissed');
      const focusQuietly = (el) => { if (!el || !el.isConnected) return; programmatic = true; try { el.focus({ preventScroll: true }); } finally { programmatic = false; } };

      function show(how, focusEdit) {
        if (!eligible()) return;
        clearTimeout(restTimer);
        promptId = api.promptShown('overlay', how);
        overlay = document.createElement('div');
        overlay.className = 'vd-overlay';
        overlay.setAttribute('role', 'region');
        overlay.setAttribute('aria-labelledby', 'vd-question');
        overlay.innerHTML =
          '<div class="vd-panel">' +
            '<p class="vd-question" id="vd-question">What would you like to do?</p>' +
            '<div class="vd-choices">' +
              '<button type="button" class="vd-btn vd-edit" data-vd="edit">' + pencil + '<span>Edit</span></button>' +
              '<button type="button" class="vd-btn vd-browse" data-vd="browse">Browse</button>' +
            '</div>' +
          '</div>';
        api.layer.append(overlay);
        requestAnimationFrame(() => { if (overlay) overlay.classList.add('is-in'); });
        if (focusEdit) focusQuietly(overlay.querySelector('[data-vd="edit"]'));
        api.announce('What would you like to do? Edit, or Browse.');
      }

      function hide(outcome, detail) {
        if (!overlay) return;
        const hadFocus = overlay.contains(document.activeElement);
        if (promptId != null) api.promptOutcome(promptId, outcome, detail);
        promptId = null;
        overlay.remove();
        overlay = null;
        const anchor = kbAnchor;
        kbAnchor = null;
        if (hadFocus && api.mode() === 'browse') focusQuietly(anchor && anchor.isConnected ? anchor : api.viewport);
      }

      function browse(detail) {
        api.spell.set('dismissed', true);
        hide('dismissed', detail);
      }

      function restart() {
        clearTimeout(restTimer);
        if (!pointerInside || !moved || !eligible()) return;
        restTimer = setTimeout(() => {
          if (pointerInside && eligible()) show('pointer rested', false);
        }, api.HOVER_REST_MS);
      }

      function left() {
        pointerInside = false;
        clearTimeout(restTimer);
        if (overlay) hide('ignored', 'the pointer left the site');
      }

      // Hover, by what's under the pointer: the site and the layer over it are
      // one area; the page list and dialogs laid over it are not.
      document.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        if (stage.contains(e.target)) {
          moved = true;
          pointerInside = true;
          if (e.buttons) { clearTimeout(restTimer); return; }
          if (!overlay) restart();
        } else if (pointerInside) left();
      }, true);
      document.documentElement.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'touch' && pointerInside) left();
      });
      api.on('scroll', () => { if (!overlay) restart(); });

      // Touch: a touch on the site stands in for hover.
      document.addEventListener('pointerdown', (e) => {
        keyboardInUse = false;
        if (e.pointerType !== 'touch' || !api.site.contains(e.target) || !eligible()) return;
        e.preventDefault(); // no focus or mouse events from this touch
        if (touchPending) return;
        api.suppressNextClick('Touch on the site showed the layer (stands in for hover; not passed through)');
        touchPending = true;
      }, true);
      // Drawn once the tap's click has gone (app.js swallows it): drawn at the
      // touch, the layer would be under the finger and take the click itself,
      // and app.js would then swallow the next real tap instead.
      const showForTouch = () => { if (!touchPending) return; touchPending = false; setTimeout(() => show('touch', false), 0); };
      document.addEventListener('click', showForTouch, true);
      document.addEventListener('pointercancel', showForTouch, true); // a touch that scrolls
      document.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch' && touchPending) setTimeout(showForTouch, 400); }, true);

      // Keyboard: focus moving into the site from outside it.
      api.site.addEventListener('focusin', (e) => {
        if (programmatic || !keyboardInUse) return;
        if (e.relatedTarget && stage.contains(e.relatedTarget)) return;
        if (!eligible()) return;
        kbAnchor = e.target;
        show('keyboard focus', true);
      });

      document.addEventListener('keydown', (e) => {
        keyboardInUse = true;
        if (!overlay) return;
        const a = document.activeElement;
        const inOverlay = overlay.contains(a);
        if (e.key === 'Escape' && (inOverlay || stage.contains(a) || a === document.body)) {
          e.preventDefault();
          browse('Escape');
          return;
        }
        if (e.key === 'Tab' && (inOverlay || stage.contains(a))) {
          e.preventDefault();
          const edit = overlay.querySelector('[data-vd="edit"]');
          const br = overlay.querySelector('[data-vd="browse"]');
          (a === edit ? br : a === br ? edit : e.shiftKey ? br : edit).focus();
        }
      }, true);

      api.layer.addEventListener('click', (e) => {
        if (!overlay || !overlay.contains(e.target)) return;
        const b = e.target.closest('[data-vd]');
        if (!b) { api.count('d-layer-clicks', 'Clicks on the layer outside its buttons'); api.log('Clicked the layer outside its buttons (nothing happens)', 'click'); return; }
        if (b.dataset.vd === 'browse') { browse('Browse'); return; }
        const route = e.detail === 0 ? 'd-overlay-keyboard' : 'd-overlay';
        if (promptId != null) api.promptOutcome(promptId, 'accepted', 'Edit');
        promptId = null;
        hide();
        api.enterEdit(route);
      });

      // The wheel over the layer still scrolls the site underneath.
      api.layer.addEventListener('wheel', (e) => {
        if (!overlay || !overlay.contains(e.target)) return;
        e.preventDefault();
        api.viewport.scrollBy({ top: e.deltaY, left: 0 });
      }, { passive: false });

      api.on('modechange', ({ mode, route }) => {
        clearTimeout(restTimer);
        if (mode === 'edit') hide('ignored', 'went into editing by ' + (route || 'another way'));
      });
      api.on('pagechange', ({ page }) => { if (overlay) hide('ignored', 'went to ' + api.pageName(page)); });
    }
  });
})();
