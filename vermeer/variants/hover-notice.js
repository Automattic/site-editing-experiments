/*
 * Vermeer · B · Hover notice
 *
 * As soon as the pointer moves over the site, a notice floats over
 * the bottom of the site area, centred: “Trying to change something on this
 * page?” with Start editing and ×. It lays over the site without moving it
 * and stays put while the site scrolls. Route: b-notice (b-notice-keyboard
 * when Start editing is pressed from the keyboard). Prompt kind: notice.
 *
 *   - Shown on the first movement of the pointer (mouse or pen) over the
 *     site area, with no wait. A pointer that was already over the site when
 *     the page loaded doesn't count until it moves. Not while a button is
 *     held down (a drag to select text).
 *   - A notice is counted as seen (`b-seen`, in the notes) once the pointer
 *     or keyboard focus has stayed in the site area for 1 s without a break
 *     while it's up (the leave grace doesn't count): with no wait, shown and
 *     ignored mostly follow the pointer's path.
 *   - Stays while the pointer, or keyboard focus, is anywhere in the site area
 *     (the notice included). Goes 1 s after both have left: ignored. Coming
 *     back within that second keeps it. Going to another page keeps it.
 *   - Start editing: accepted, edit mode with nothing selected.
 *   - × (or Escape inside the notice): dismissed. Not shown again in this
 *     browse spell, even after a reload; back after the next Exit.
 *   - Going into edit mode another way (the Edit button) while it's showing:
 *     ignored.
 *   - Keyboard: focus moving into the site from outside it shows the notice
 *     and announces it; the next Tab goes to Start editing, then ×, then on
 *     into the site after the element focus first went to. Focus coming back
 *     into the site while it shows puts Start editing next again.
 *   - Touch: the first touch on the site while no notice has been shown in
 *     this browse spell shows it and does nothing else (the tap isn't passed
 *     through). After that taps work as usual.
 *   - Never shown in edit mode, while a dialog (Exit, Finished) is open, or
 *     while the page list is open.
 *   - A notice open when the page is reloaded is recorded as ignored by
 *     app.js; this file keeps the open prompt's id only in memory, so it never
 *     records a second outcome for it.
 */
(function () {
  'use strict';
  if (!window.Vermeer) return;

  window.Vermeer.registerVariant({
    id: 'hover-notice',
    init(api) {
      const LEAVE_MS = 1000;
      api.registerRoute('b-notice', 'the notice’s Start editing');
      api.registerRoute('b-notice-keyboard', 'the notice’s Start editing, by keyboard');

      const stage = api.stage;
      const pencil = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="m19 7-3-3-8.5 8.5-1 4 4-1L19 7Zm-7 11.5H5V20h7v-1.5Z"/></svg>';
      const cross = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M12 13.06l3.712 3.713 1.061-1.06L13.061 12l3.712-3.712-1.06-1.06L12 10.938 8.288 7.227l-1.061 1.06L10.939 12l-3.712 3.712 1.06 1.061L12 13.061z"/></svg>';

      let notice = null;      // the element while shown
      let promptId = null;    // its prompt id (memory only: see the note above)
      let leaveTimer = null;
      let seenTimer = null;
      let seenCounted = false; // for the notice that's up now
      let pointerInside = false;
      let moved = false;      // a real pointer movement on the site since load
      let kbAnchor = null;    // the site element keyboard focus went to when it opened
      let programmatic = false;
      let touchPending = false;

      const blocked = () => api.mode() !== 'browse' || api.blocked();
      const eligible = () => !notice && !blocked() && !api.spell.get('dismissed');
      // Keyboard focus keeps the notice only while the keyboard is in use (a
      // mouse click leaves focus on a button, which shouldn't hold it open).
      // (Also: focus counts as coming by keyboard only if a key was pressed
      // since the last pointer press.)
      let keyboardInUse = false;
      document.addEventListener('keydown', () => { keyboardInUse = true; }, true);
      const focusInside = () => keyboardInUse && stage.contains(document.activeElement);
      const focusQuietly = (el) => { if (!el || !el.isConnected) return; programmatic = true; try { el.focus({ preventScroll: true }); } finally { programmatic = false; } };

      function show(how) {
        if (!eligible()) return;
        promptId = api.promptShown('notice', how);
        api.spell.set('shown', true);
        notice = document.createElement('div');
        notice.className = 'vb-notice';
        notice.setAttribute('role', 'region');
        notice.setAttribute('aria-label', 'Start editing');
        notice.innerHTML =
          '<p class="vb-notice-text">Trying to change something on this page?</p>' +
          '<button type="button" class="vb-notice-start" data-vb="start">' + pencil + '<span>Start editing</span></button>' +
          '<button type="button" class="vb-notice-close" data-vb="close" aria-label="Close">' + cross + '</button>';
        api.layer.append(notice);
        api.viewport.classList.add('vb-room');
        seenCounted = false;
        armSeen();
        requestAnimationFrame(() => { if (notice) notice.classList.add('is-in'); });
        api.announce('Trying to change something on this page? ' + (how === 'keyboard focus' ? 'Press Tab for Start editing.' : 'Start editing button.'));
      }

      function hide(outcome, detail) {
        if (!notice) return;
        clearTimeout(leaveTimer);
        clearTimeout(seenTimer);
        const hadFocus = notice.contains(document.activeElement);
        if (promptId != null) api.promptOutcome(promptId, outcome, detail);
        promptId = null;
        notice.remove();
        notice = null;
        api.viewport.classList.remove('vb-room');
        const anchor = kbAnchor;
        kbAnchor = null;
        if (hadFocus && api.mode() === 'browse') focusQuietly(anchor && anchor.isConnected ? anchor : api.viewport);
      }

      // Seen: the pointer or focus stayed in the site area for a second while
      // the notice was up. Leaving stops the clock; coming back starts it again.
      function armSeen() {
        clearTimeout(seenTimer);
        if (!notice || seenCounted) return;
        seenTimer = setTimeout(() => {
          if (!notice || seenCounted || !(pointerInside || focusInside())) return;
          seenCounted = true;
          api.count('b-seen', 'Notices seen (pointer or focus in the site for 1 s while up)');
        }, 1000);
      }

      function scheduleLeave() {
        clearTimeout(leaveTimer);
        clearTimeout(seenTimer);
        if (!notice) return;
        leaveTimer = setTimeout(() => {
          if (!notice || pointerInside || focusInside()) return;
          hide('ignored', 'the pointer and focus left the site');
        }, LEAVE_MS);
      }

      // No wait: the first movement over the site shows it.
      function restart() {
        if (pointerInside && moved && eligible()) show('pointer moved over the site');
      }

      // Hover: where the pointer is, by what's under it, so the notice (in the
      // layer) and the site count as one area, and the page list and dialogs
      // (laid over it, but not in it) don't.
      document.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const inside = stage.contains(e.target);
        if (inside) {
          moved = true;
          if (!pointerInside) { pointerInside = true; clearTimeout(leaveTimer); armSeen(); }
          if (e.buttons) return; // not while dragging
          restart();
        } else if (pointerInside) {
          pointerInside = false;
          scheduleLeave();
        }
      }, true);
      document.documentElement.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch' || !pointerInside) return;
        pointerInside = false;
        scheduleLeave();
      });

      // Touch: the first touch stands in for hover.
      document.addEventListener('pointerdown', (e) => {
        keyboardInUse = false;
        if (e.pointerType !== 'touch' || !api.site.contains(e.target)) return;
        if (blocked() || api.spell.get('shown') || api.spell.get('dismissed')) return;
        e.preventDefault(); // no focus or mouse events from this touch
        api.suppressNextClick('First touch on the site showed the notice (stands in for hover; not passed through)');
        api.spell.set('shown', true);
        touchPending = true;
      }, true);
      // Drawn once the tap's click has gone (app.js swallows it), so the click
      // can't land on the notice's own buttons under the finger.
      const showForTouch = () => { if (!touchPending) return; touchPending = false; setTimeout(() => show('first touch'), 0); };
      document.addEventListener('click', showForTouch, true);
      // A touch that becomes a scroll sends no click: stop waiting to swallow one
      // (app.js does too), and show it now.
      document.addEventListener('pointercancel', () => { if (touchPending) api.cancelSuppress(); showForTouch(); }, true);
      document.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch' && touchPending) setTimeout(showForTouch, 400); }, true);

      // Keyboard: focus moving into the site from outside it.
      api.site.addEventListener('focusin', (e) => {
        if (programmatic || !keyboardInUse) return;
        if (e.relatedTarget && stage.contains(e.relatedTarget)) return;
        if (notice) { clearTimeout(leaveTimer); armSeen(); kbAnchor = e.target; return; } // Start editing is next again
        if (!eligible()) return;
        kbAnchor = e.target;
        show('keyboard focus');
      });
      stage.addEventListener('focusout', (e) => {
        if (!notice) return;
        if (e.relatedTarget && stage.contains(e.relatedTarget)) return;
        setTimeout(() => { if (notice && !focusInside() && !pointerInside) scheduleLeave(); }, 0);
      });

      // Tab order: right after the element focus went to.
      const tabbables = () => [...api.site.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.getClientRects().length);
      document.addEventListener('keydown', (e) => {
        if (!notice) return;
        const start = notice.querySelector('[data-vb="start"]');
        const close = notice.querySelector('[data-vb="close"]');
        const a = document.activeElement;
        if (e.key === 'Escape' && notice.contains(a)) { e.preventDefault(); hide('dismissed', 'Escape'); api.spell.set('dismissed', true); return; }
        if (e.key !== 'Tab' || !kbAnchor) return;
        if (!e.shiftKey && a === kbAnchor) { e.preventDefault(); start.focus(); }
        else if (e.shiftKey && a === start && kbAnchor.isConnected) { e.preventDefault(); kbAnchor.focus(); }
        else if (!e.shiftKey && a === close) {
          const list = tabbables();
          const i = list.indexOf(kbAnchor);
          const next = list[i + 1];
          kbAnchor = null;
          if (next) { e.preventDefault(); focusQuietly(next); }
        }
      }, true);

      api.layer.addEventListener('click', (e) => {
        const b = e.target.closest('.vb-notice [data-vb]');
        if (!b || !notice) return;
        if (b.dataset.vb === 'close') {
          api.spell.set('dismissed', true);
          hide('dismissed', '×');
        } else {
          const route = e.detail === 0 ? 'b-notice-keyboard' : 'b-notice';
          if (promptId != null) api.promptOutcome(promptId, 'accepted', 'Start editing');
          promptId = null;
          hide();
          api.enterEdit(route);
        }
      });

      api.on('modechange', ({ mode, route, label }) => {
        if (mode === 'edit') hide('ignored', 'went into editing by ' + (label || api.routeLabel(route) || 'another way'));
      });
    }
  });
})();
