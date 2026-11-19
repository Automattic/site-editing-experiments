/*
 * Vermeer · A1 · Click to edit
 *
 * A click in browse on anything that isn't a link, button, box or a box's
 * label goes straight into edit mode on that page, with what was clicked
 * ready: in text, the caret goes where the person clicked; on a picture or a
 * background, the section around it is outlined and nothing has a caret.
 * Links, buttons and boxes work as usual. A click that ends a drag to select
 * text does nothing. A tap on a touch screen is a click. Route: a1-click.
 *
 * There's no keyboard version of this route (the spots it reacts to can't
 * take keyboard focus); keyboard users have the Edit button, as in every arm.
 *
 * This file uses only the API in ../app.js (window.Vermeer).
 */
(function () {
  'use strict';

  window.Vermeer.registerVariant({
    id: 'click-to-edit',
    init(api) {
      api.registerRoute('a1-click', 'a click on the site (A1)');

      // app.js has already seen and counted this click in its capture
      // listener; this runs in the bubble phase on the site, before app.js's
      // own default action (which only acts on links and buttons anyway).
      api.site.addEventListener('click', (e) => {
        if (api.mode() !== 'browse' || e.button !== 0) return;
        const info = api.clickInfo(e);
        if (!info || info.kind !== 'none' || info.selecting) return;
        e.preventDefault();
        // A click from the keyboard (detail 0) has no point; land at the end.
        const at = e.detail === 0 ? {} : { x: e.clientX, y: e.clientY };
        api.enterEdit('a1-click', Object.assign({ target: e.target }, at));
      });
    }
  });
})();
