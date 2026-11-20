/*
 * Vermeer · From looking at your site to changing it
 *
 * One small website in one simple editor, five arms. The editor opens with the
 * site on view, as visitors see it ("browse"). To change it, people have to
 * get into edit mode. The control has only the Edit button in the editor's
 * toolbar, as the Create not Learn prototype does today. Each other arm adds
 * one more way in, through the site itself, and keeps the Edit button.
 *
 * This file is everything the five arms share: the site (Cobble Lane Books,
 * three pages); Create not Learn's chrome around it (WordPress's admin bar,
 * the strip of icons, the sidebar and its screens, the canvas toolbar, the
 * page finder, Save with Review changes), with browse and edit modes, Exit
 * with its dialog, Undo and Redo and the back and forward history working;
 * state that survives a reload; the tasks, the counts, the log, the
 * facilitator panel (?notes or #notes), and Finished with its code.
 *
 * The control (control.html) is this file alone. Each other arm adds its own
 * route in variants/<arm>.js (and .css), using only the API below. The arms'
 * names and code prefixes are in the VARIANTS table in this file, so a code
 * is right even if an arm's script fails to load; an arm script only adds
 * behaviour and its own route names.
 *
 *   control          V0   only the Edit button
 *   click-to-edit    VA1  a click on a non-functional spot goes straight in
 *   ask-on-click     VA2  that click asks "Do you want to edit?"
 *   hover-notice     VB   the pointer on the site shows a notice with a button
 *   choose-on-click  VC   any click offers its action or Edit
 *
 * Everything is kept in localStorage under `vermeer:<variant>` and written on
 * every change, so a reload puts the person back exactly where they were.
 * Reset in the notes panel clears it. If the same arm is open in two tabs,
 * the one that wrote last is live: the other stops writing and asks to be
 * reloaded. Site links can't be opened in a new tab.
 *
 * ======================================================================
 * The arm API: window.Vermeer
 * ======================================================================
 *
 * An arm file calls Vermeer.registerVariant({ id, init(api) }) once. Only the
 * arm named by the page's <body data-variant> runs; `init` gets the API (the
 * same object as window.Vermeer) once the editor is drawn and the saved state
 * restored. Arms never need to touch this file.
 *
 * Constants and facts
 *   variant                            the arm's id ('control', 'click-to-edit', …)
 *   mode()                             'browse' or 'edit'
 *   page()                             'home', 'events' or 'contact'
 *   pageName(id?)                      'Home', 'Events', 'Contact'
 *   site                               the site element. It stays the same element for the
 *                                      whole session; its contents are redrawn on every page or
 *                                      mode change (listen for 'render').
 *   viewport                           the scrolling area around the site ("the site area" for
 *                                      hover: pointerenter / pointerleave / scroll here)
 *   stage                              the element holding the viewport and the layer: "the site
 *                                      area" including anything an arm lays over it
 *   blocked()                          true while a dialog (Exit, Finished) or the page list is
 *                                      open; hover arms shouldn't show anything then
 *   routeLabel(name)                   the human label of a route ('the Edit button')
 *   layer                              an empty element laid exactly over the viewport, above the
 *                                      site, for an arm's popovers, notices and overlays. It lets
 *                                      the pointer through (pointer-events: none): give your own
 *                                      elements pointer-events: auto. Clicks in it are not site
 *                                      clicks, so they're never counted as non-functional.
 *   toLayer(clientX, clientY)          → { x, y } in the layer's coordinates
 *   lastPointerType()                  pointerType of the last pointerdown anywhere: 'mouse',
 *                                      'touch', 'pen' (or '' before any)
 *
 * Reading a click
 *   classify(target)                   → { kind, el, label, textEl, textLabel, section, sectionLabel }
 *                                      kind: 'link' | 'button' | 'field' | 'none' (non-functional).
 *                                      el: the link/button/field (null for 'none'). label: a human
 *                                      label ("Events", "Book a place", "Email"; for 'none' the
 *                                      text's label or the section's). textEl: the editable text an
 *                                      edit would land on (the link or button text itself, a
 *                                      field's label, the paragraph clicked), or null for a picture
 *                                      or background. section: the nearest section element.
 *                                      Links also have to (page id), toName ('Events') and
 *                                      samePage (true for a link further down the same page).
 *   clickInfo(event)                   → classify() of a browse click as app.js saw it in its
 *                                      capture listener, plus { selecting, counted }: selecting is
 *                                      true when the click ended a text selection (then nothing
 *                                      should happen); counted is true if app.js counted it as a
 *                                      non-functional click. null for events app.js didn't see.
 *
 * Doing things
 *   enterEdit(route, { target, x, y }) enter edit mode by the named route. With a target, the
 *                                      text it belongs to is made ready with the caret at (x, y)
 *                                      (the click point, in client coordinates; at the end if
 *                                      none), or for a picture or background the nearest section
 *                                      is outlined as selected. With no target, nothing is
 *                                      selected (as the Edit button). Returns { landed: 'text' |
 *                                      'section' | 'nothing', label }. Logged and counted.
 *   perform(target, { via })           do what a browse click on target would: follow the link,
 *                                      press the button (submit buttons submit their form, with
 *                                      the browser's checks), or focus the field. Counted as a
 *                                      link follow or button use with `via` in the log (for
 *                                      example 'popup'). No click event is sent, so arm listeners
 *                                      don't see it again.
 *   suppressNextClick(reason)          the next click on the site (within 1 s) is swallowed by
 *                                      app.js before anything else sees it and isn't counted:
 *                                      for "the first touch stands in for hover". Call it from a
 *                                      pointerdown listener. app.js clears it itself on
 *                                      pointercancel (a touch that became a scroll).
 *   cancelSuppress()                   clear a pending suppressNextClick
 *   announce(text)                     say text in a polite live region (screen readers)
 *
 * Prompts (A2 popover, B notice, C popup)
 *   promptShown(kind, detail?)         → id. Logs and counts it as shown. kind is a short name
 *                                      ('popover', 'notice', 'popup').
 *   promptOutcome(id, outcome, detail?) outcome: 'accepted' (chose edit), 'dismissed' (No, ×,
 *                                      Escape, Keep looking), 'followed' (C: chose the
 *                                      link, button or field; counts as dismissed in the code
 *                                      and is shown apart in the notes), or 'ignored' (went away
 *                                      without a choice). Only the first outcome of an id counts.
 *                                      Prompts still open when the page is reloaded are recorded
 *                                      as ignored ("page reloaded").
 *
 * Routes, notes and state
 *   registerRoute(name, label)         name an arm's route into edit mode ('a1-click') with a
 *                                      human label for the log and notes panel. Arm routes give
 *                                      the `a` letter in the code; the Edit button gives `e`.
 *   log(text, kind?)                   add a line to the event log
 *   count(key, label)                  add 1 to an arm-specific count shown in the notes panel
 *   store.get(key) / store.set(key, v) small per-arm state, kept across reloads, cleared by Reset
 *   spell.get(key) / spell.set(key, v) the same, but cleared whenever a new browse spell starts
 *   spell.id()                         the browse spell's number (1 at first open, +1 per Exit)
 *   on(event, fn)                      → unsubscribe function. Events:
 *                                        'render'     { mode, page } the site was redrawn
 *                                        'modechange' { mode, route, label } entered or left edit mode
 *                                        'pagechange' { page, from, route }
 *                                        'spellstart' { id } a new browse spell, after Exit
 *                                        'scroll'     the viewport scrolled
 *
 * Ordering (so arms can't double count):
 *   - app.js listens for clicks on the viewport in the CAPTURE phase, registered before any arm
 *     script runs, so it sees every site click before an arm does. There it applies
 *     suppressNextClick, classifies the click and counts it if it's non-functional (browse only,
 *     not ending a selection, and only the first press of a double or triple click). Arms must not count non-functional clicks themselves.
 *   - Arms listen on api.site (either phase) or the viewport in the capture phase.
 *   - app.js's default action for a browse click (follow a link, press a button) runs on the
 *     viewport in the BUBBLE phase and is skipped if the arm called event.preventDefault().
 *     So an arm that wants a click for itself calls preventDefault(), and later perform().
 *   - Edit-mode handling ignores any event that began while in browse, so the click that
 *     enters edit mode isn't also taken as a click in the editor.
 *
 * Add ?notes (or #notes) to the address for the facilitator panel.
 */
(function () {
  'use strict';

  // ---------- The arms ----------

  const VARIANTS = {
    control: { code: 'V0', letter: '0', file: 'control.html', name: 'Control: only the Edit button' },
    'click-to-edit': { code: 'VA1', letter: 'A1', file: 'click-to-edit.html', name: 'A1 · Click to edit: a click on anything that isn’t a link, button or box goes straight into editing it' },
    'ask-on-click': { code: 'VA2', letter: 'A2', file: 'ask-on-click.html', name: 'A2 · Ask on click: that click asks “Do you want to edit?”' },
    'hover-notice': { code: 'VB', letter: 'B', file: 'hover-notice.html', name: 'B · Hover notice: the pointer on the site shows a notice with Start editing' },
    'choose-on-click': { code: 'VC', letter: 'C', file: 'choose-on-click.html', name: 'C · Choose on click: every click offers its own action or Edit' }
  };
  const VARIANT = VARIANTS[document.body.dataset.variant] ? document.body.dataset.variant : 'control';
  const ARM = VARIANTS[VARIANT];
  const NOTES = new URLSearchParams(location.search).has('notes') || location.hash === '#notes';
  const STORE_KEY = 'vermeer:' + VARIANT;

  // Routes into edit mode. The Edit button's are built in; arms add theirs.
  const ROUTES = {
    'edit-button': { label: 'the Edit button', core: true },
    'edit-button-keyboard': { label: 'the Edit button, by keyboard', core: true }
  };

  // ---------- Icons (24px, as the WordPress icons) ----------

  const svg = (d, extra) => '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"' + (extra || '') + '><path d="' + d + '"/></svg>';
  const ICONS = {
    back: svg('M14.6 7l-1.2-1L8 12l5.4 6 1.2-1-4.6-5z'),
    forward: svg('M10.6 6L9.4 7l4.6 5-4.6 5 1.2 1 5.4-6z'),
    search: svg('M13 5c-3.3 0-6 2.7-6 6 0 1.4.5 2.7 1.3 3.7l-3.8 3.8 1.1 1.1 3.8-3.8c1 .8 2.3 1.3 3.7 1.3 3.3 0 6-2.7 6-6S16.3 5 13 5zm0 10.5c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z'),
    desktop: svg('M20.5 16h-.7V8c0-1.1-.9-2-2-2H6.2c-1.1 0-2 .9-2 2v8h-.7c-.8 0-1.5.7-1.5 1.5h20c0-.8-.7-1.5-1.5-1.5zM5.7 8c0-.3.2-.5.5-.5h11.6c.3 0 .5.2.5.5v7.6H5.7V8z'),
    pencil: svg('m19 7-3-3-8.5 8.5-1 4 4-1L19 7Zm-7 11.5H5V20h7v-1.5Z'),
    undo: svg('M18.3 11.7c-.6-.6-1.4-.9-2.3-.9H6.7l2.9-3.3-1.1-1-4.5 5L8.5 16l1-1-2.7-2.7H16c.5 0 .9.2 1.3.5 1 1 1 3.4 1 4.5v.3h1.5v-.2c0-1.5 0-4.3-1.5-5.7z'),
    redo: svg('M15.6 6.5l-1.1 1 2.9 3.3H8c-.9 0-1.7.3-2.3.9-1.4 1.5-1.4 4.2-1.4 5.6v.2h1.5v-.3c0-1.1 0-3.5 1-4.5.3-.3.7-.5 1.3-.5h9.2L14.5 15l1.1 1.1 4.6-4.6-4.6-5z'),
    close: svg('M12 13.06l3.712 3.713 1.061-1.06L13.061 12l3.712-3.712-1.06-1.06L12 10.938 8.288 7.227l-1.061 1.06L10.939 12l-3.712 3.712 1.06 1.061L12 13.061z'),
    tip: svg('M12 15.8c-3.7 0-6.8-3-6.8-6.8s3-6.8 6.8-6.8c3.7 0 6.8 3 6.8 6.8s-3.1 6.8-6.8 6.8zm0-12C9.1 3.8 6.8 6.1 6.8 9s2.4 5.2 5.2 5.2c2.9 0 5.2-2.4 5.2-5.2S14.9 3.8 12 3.8zM8 17.5h8V19H8zM10 20.5h4V22h-4z'),
    check: svg('M16.7 7.1l-6.3 8.5-3.3-2.5-.9 1.2 4.5 3.4L17.9 8z'),
    page: svg('M15.5 7.5h-7V9h7V7.5Zm-7 3.5h7v1.5h-7V11Zm7 3.5h-7V16h7v-1.5Z M17 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm.5 14a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v12Z'),
    // The admin bar's, after its dashicons.
    wp: svg('M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zM3.01 12c0-1.3.28-2.54.78-3.66l4.3 11.78A9 9 0 0 1 3.01 12zM12 20.99c-.88 0-1.73-.13-2.54-.37l2.7-7.84 2.76 7.57.06.12c-.93.33-1.94.52-2.98.52zm1.24-13.2c.54-.03 1.03-.09 1.03-.09.49-.06.43-.77-.06-.74 0 0-1.46.11-2.4.11-.88 0-2.37-.11-2.37-.11-.49-.03-.54.71-.06.74 0 0 .46.06.94.09l1.4 3.84-1.97 5.9-3.28-9.74c.54-.03 1.03-.09 1.03-.09.49-.06.43-.77-.06-.74 0 0-1.46.11-2.4.11-.17 0-.37 0-.58-.01A8.98 8.98 0 0 1 12 3.01c2.33 0 4.44.89 6.03 2.35l-.12-.01c-.88 0-1.51.77-1.51 1.6 0 .74.43 1.37.89 2.11.34.6.74 1.37.74 2.48 0 .77-.3 1.67-.69 2.91l-.9 3-3.2-9.67zm3.28 12l2.75-7.94c.51-1.28.68-2.31.68-3.22 0-.33-.02-.64-.06-.92A8.94 8.94 0 0 1 20.99 12a8.98 8.98 0 0 1-4.47 7.78z'),
    dashboard: svg('M12 5a8.5 8.5 0 0 0-7.4 12.7l.3.5h14.2l.3-.5A8.5 8.5 0 0 0 12 5zm0 2.3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-4.6 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm9.2 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM6.3 13.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm11.4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-3.3-3.8 1 .8-2.2 3.4a1.6 1.6 0 1 1-1.2-.8z'),
    updates: svg('M12 4.5a7.5 7.5 0 0 0-7.1 5h2.1A5.5 5.5 0 0 1 16.9 9L14.5 11.5H20V6l-1.7 1.7A7.5 7.5 0 0 0 12 4.5zM4 12.5V18l1.7-1.7A7.5 7.5 0 0 0 19.1 14.5H17a5.5 5.5 0 0 1-9.9.5l2.4-2.5z'),
    comment: svg('M4.5 5h15c.3 0 .5.2.5.5v10c0 .3-.2.5-.5.5H10l-4.5 3.5V16h-1a.5.5 0 0 1-.5-.5v-10c0-.3.2-.5.5-.5z'),
    plus: svg('M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z'),
    // The rail's and the sidebar's, after @wordpress/icons.
    home: svg('M12 4 4 7.9V20h16V7.9L12 4zm6.5 14.5H14V13h-4v5.5H5.5V8.8L12 5.7l6.5 3.1v9.7z'),
    pages: svg('M14.5 5.5h-7V7h7V5.5ZM7.5 9h7v1.5h-7V9Zm7 3.5h-7V14h7v-1.5Z M16 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm.5 14a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v12Z M20 8v11a2 2 0 0 1-2 2H8v-1.5h10a.5.5 0 0 0 .5-.5V8H20Z'),
    postList: svg('M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm.5 14a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5h12a.5.5 0 0 1 .5.5v12ZM7 11h2V9H7v2Zm0 4h2v-2H7v2Zm3-4h7V9h-7v2Zm0 4h7v-2h-7v2Z'),
    networking: svg('M5 4.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5H7.8v3.7h4.2v-.7a.5.5 0 0 1 .5-.5h0V11h-.5V7.5h2V11h-.5v1.5h4.1a.5.5 0 0 1 .4.5v2.5h1a.5.5 0 0 1 .5.5v3.5a.5.5 0 0 1-.5.5h-3.5a.5.5 0 0 1-.5-.5V16a.5.5 0 0 1 .5-.5h1V14h-8v1.5h1a.5.5 0 0 1 .5.5v3.5a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V16a.5.5 0 0 1 .5-.5h1.3V9.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5zM6 6v2h2V6H6zm0 11v1.5h2V17H6zm10.5 0v1.5h2V17h-2z'),
    navigation: svg('M12 4a8 8 0 1 0 .001 16.001A8 8 0 0 0 12 4zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM9 15l2.1-4.4L15 9l-2.1 4.4z'),
    siteLogo: svg('M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm0 1.5a7 7 0 0 1 6.8 8.7c-1.4-1.6-3.6-2.7-6.8-2.7s-5.4 1.1-6.8 2.7A7 7 0 0 1 12 5zm0 14a7 7 0 0 1-6-3.4c1-1.6 2.9-3.1 6-3.1s5 1.5 6 3.1A7 7 0 0 1 12 19z'),
    media: svg('M4 5.5h10v8.6l-2.6-2.6-2.5 2.5-1.4-1.4L4 16V5.5zm-1.5-1.5v14.5h13V4h-13zM8 9.5A1.3 1.3 0 1 0 8 7a1.3 1.3 0 0 0 0 2.5zm9.5-1v7.3a2 2 0 1 0 1.5 1.9V10h2V8.5h-3.5z'),
    color: svg('M17.2 10.9c-.5-1-1.2-2.1-2.1-3.2-.6-.9-1.3-1.7-2.1-2.6L12 4l-1 1.1c-.6.9-1.3 1.7-2 2.6-.8 1.2-1.5 2.3-2 3.2-.6 1.2-1 2.2-1 3 0 3.4 2.7 6.1 6.1 6.1s6.1-2.7 6.1-6.1c0-.8-.3-1.8-1-3zm-5.1 7.6c-2.5 0-4.6-2.1-4.6-4.6 0-.3.1-1 .8-2.3.5-.9 1.1-1.9 2-3.1.7-.9 1.3-1.7 1.8-2.3.7.8 1.3 1.6 1.8 2.3.8 1.1 1.5 2.2 2 3.1.7 1.3.8 2 .8 2.3 0 2.5-2.1 4.6-4.6 4.6z'),
    typography: svg('M6.9 7 3 17.8h1.7l1-2.8h4.1l1 2.8h1.7L8.6 7H6.9zm-.7 6.6 1.5-4.3 1.5 4.3h-3zM21.6 17c-.1.1-.2.2-.3.2-.1.1-.2.1-.4.1s-.3-.1-.4-.2c-.1-.1-.1-.3-.1-.6V12c0-.5 0-1-.1-1.4-.1-.4-.3-.7-.5-1-.2-.2-.5-.4-.9-.5-.4 0-.8-.1-1.3-.1s-1 .1-1.4.2c-.4.1-.7.3-1 .4-.2.2-.4.3-.6.5-.1.2-.2.4-.2.7 0 .3.1.5.2.8.2.2.4.3.8.3.3 0 .6-.1.8-.3.2-.2.3-.4.3-.7 0-.3-.1-.5-.2-.7-.2-.2-.4-.3-.6-.4.2-.2.4-.3.7-.4.3-.1.6-.1.8-.1.3 0 .6 0 .8.1.2.1.4.3.5.5.1.2.2.5.2.9v1.1c0 .3-.1.5-.3.6-.2.2-.5.3-.9.4-.3.1-.7.3-1.1.4-.4.1-.8.3-1.1.5-.3.2-.6.4-.8.7-.2.3-.3.7-.3 1.2 0 .6.2 1.1.5 1.4.3.4.9.5 1.6.5.5 0 1-.1 1.4-.3.4-.2.8-.6 1.1-1.1 0 .4.1.7.3 1 .2.3.6.4 1.2.4.4 0 .7-.1.9-.2.2-.1.5-.3.7-.4h-.3zm-3-.9c-.2.4-.5.7-.8.8-.3.2-.6.2-.8.2-.4 0-.6-.1-.9-.3-.2-.2-.3-.6-.3-1.1 0-.5.1-.9.3-1.2s.5-.5.8-.7c.3-.2.7-.3 1-.5.3-.1.6-.3.7-.6v3.4z'),
    code: svg('M20.8 10.7l-4.3-4.3-1.1 1.1 4.3 4.3c.1.1.1.3 0 .4l-4.3 4.3 1.1 1.1 4.3-4.3c.7-.8.7-1.9 0-2.6zM4.2 11.8l4.3-4.3-1-1-4.3 4.3c-.7.7-.7 1.8 0 2.5l4.3 4.3 1.1-1.1-4.3-4.3c-.2-.1-.2-.3-.1-.4z'),
    drawerLeft: svg('M18 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM8.5 18.5H6c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h2.5v13zm10-.5c0 .3-.2.5-.5.5h-8v-13h8c.3 0 .5.2.5.5v12z'),
    category: svg('M6 5.5h3a.5.5 0 01.5.5v3a.5.5 0 01-.5.5H6a.5.5 0 01-.5-.5V6a.5.5 0 01.5-.5zM4 6a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm11-.5h3a.5.5 0 01.5.5v3a.5.5 0 01-.5.5h-3a.5.5 0 01-.5-.5V6a.5.5 0 01.5-.5zM13 6a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V6zm5 8.5h-3a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5zM15 13a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2v-3a2 2 0 00-2-2h-3zm-9 1.5h3a.5.5 0 01.5.5v3a.5.5 0 01-.5.5H6a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5zM4 15a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3z'),
    brush: svg('M4 20h8v-1.5H4V20zM18.9 3.5c-.6-.6-1.5-.6-2.1 0l-7.2 7.2c-.4-.1-.7 0-1.1.1-.5.2-1.5.7-1.9 2.2-.4 1.7-.8 2.2-1.1 2.7-.1.1-.2.3-.3.4l-.6 1.1H6c2 0 3.4-.4 4.7-1.4.8-.6 1.2-1.4 1.3-2.3 0-.3 0-.5-.1-.7L19 5.7c.5-.6.5-1.6-.1-2.2zM9.7 14.7c-.7.5-1.5.8-2.4 1 .2-.5.5-1.2.8-2.3.2-.6.4-1 .8-1.1.5-.1 1 .1 1.3.3.2.2.3.5.2.8 0 .3-.1.9-.7 1.3z'),
    siteParts: svg('M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm.5 14a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5v-1.5h13V18Zm0-3h-13V9h13v6Zm0-7.5h-13V6a.5.5 0 0 1 .5-.5h12a.5.5 0 0 1 .5.5v1.5Z'),
    header: svg('M18.5 10.5H10v8h8a.5.5 0 00.5-.5v-7.5zm-10 0h-3V18a.5.5 0 00.5.5h2.5v-8zM6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z'),
    footer: svg('M18 5.5H6a.5.5 0 00-.5.5v3h13V6a.5.5 0 00-.5-.5zm.5 5h-13V18a.5.5 0 00.5.5h12a.5.5 0 00.5-.5v-7.5zM6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2zm1 13.5h10V16H7v1.5z'),
    chevronRight: svg('M10.6 6L9.4 7l4.6 5-4.6 5 1.2 1 5.4-6z'),
    chevronDown: svg('M17.5 11.6 12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z'),
    moreVertical: svg('M13 19h-2v-2h2v2zm0-6h-2v-2h2v2zm0-6h-2V5h2v2z'),
    moreHorizontal: svg('M11 13h2v-2h-2v2zm-6 0h2v-2H5v2zm12-2v2h2v-2h-2z'),
    settings: svg('m19 7.5h-7.628c-.3089-.87389-1.1423-1.5-2.122-1.5-.97966 0-1.81309.62611-2.12197 1.5h-2.12803v1.5h2.12803c.30888.87389 1.14231 1.5 2.12197 1.5.9797 0 1.8131-.62611 2.122-1.5h7.628zm-9.75 1.5c-.4142 0-.75-.33579-.75-.75 0-.41421.3358-.75.75-.75.4142 0 .75.33579.75.75 0 .41421-.3358.75-.75.75zm8.75 6.5h-2.128c-.3089-.8739-1.1423-1.5-2.122-1.5s-1.8131.6261-2.122 1.5h-7.628v1.5h7.628c.3089.8739 1.1423 1.5 2.122 1.5s1.8131-.6261 2.122-1.5h2.128zm-4.25 1.5c-.4142 0-.75-.3358-.75-.75s.3358-.75.75-.75.75.3358.75.75-.3358.75-.75.75z'),
    listView: svg('M3 6h11v1.5H3V6Zm3.5 5.5h11V13h-11v-1.5ZM21 17H10v1.5h11V17Z'),
    square: svg('M18 5.5H6a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V6a.5.5 0 0 0-.5-.5ZM6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'),
    minus: svg('M7 11.5h10V13H7z'),
    published: svg('M12 18.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0zm11.53-1.47-1.06-1.06L11 12.94l-1.47-1.47-1.06 1.06L11 15.06l4.53-4.53z'),
    globe: svg('M12 3.3a8.7 8.7 0 1 0 0 17.4 8.7 8.7 0 0 0 0-17.4zm6.7 8h-3.1a14 14 0 0 0-1.1-5.4 7.2 7.2 0 0 1 4.2 5.4zM12 4.8c.8 1 1.9 3.1 2.1 6.5H9.9C10.1 7.9 11.2 5.8 12 4.8zM9.5 5.9a14 14 0 0 0-1.1 5.4H5.3a7.2 7.2 0 0 1 4.2-5.4zm-4.2 6.9h3.1a14 14 0 0 0 1.1 5.3 7.2 7.2 0 0 1-4.2-5.3zm6.7 6.4c-.8-1-1.9-3.1-2.1-6.4h4.2c-.2 3.3-1.3 5.4-2.1 6.4zm2.5-1.1a14 14 0 0 0 1.1-5.3h3.1a7.2 7.2 0 0 1-4.2 5.3z'),
    external: svg('M19.5 4.5h-7V6h4.44l-5.97 5.97 1.06 1.06L18 7.06v4.44h1.5v-7Zm-13 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3H17v3a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h3V5.5h-3Z'),
    chevronLeft: svg('M14.6 7l-1.2-1L8 12l5.4 6 1.2-1-4.6-5z'),
    tablet: svg('M17 4H7c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H7c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h10c.3 0 .5.2.5.5v12zm-7.5-.5h4V16h-4v1.5z'),
    mobile: svg('M15 4H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5 14c0 .3-.2.5-.5.5H9c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h6c.3 0 .5.2.5.5v12zm-4.5-.5h2V16h-2v1.5z')
  };

  // ---------- The site: Cobble Lane Books ----------

  const PAGES = { home: 'Home', events: 'Events', contact: 'Contact' };
  const PAGE_IDS = Object.keys(PAGES);

  // Every bit of text that can be changed: [label for the log, starting text].
  // Keys starting nav-, site-, bookclub and footer- are on every page.
  const TEXT = {
    'site-name': ['Site name at the top', 'Cobble Lane Books'],
    'nav-home': ['“Home” in the menu', 'Home'],
    'nav-events': ['“Events” in the menu', 'Events'],
    'nav-contact': ['“Contact” in the menu', 'Contact'],
    bookclub: ['“Join the book club” button', 'Join the book club'],

    'home-kicker': ['Line above the Home heading', 'Independent bookshop & café'],
    'home-heading': ['Home heading', 'Books, coffee and a quiet corner'],
    'home-intro-a': ['Home introduction', 'A bookshop at the top of Cobble Lane, with a café corner at the back. Come in to browse, stay for a slice of cake, or join us for one of our '],
    'home-intro-link': ['Link in the Home introduction', 'evening readings and talks'],
    'home-intro-b': ['Home introduction (end)', ', most Thursdays after closing.'],
    'home-cta': ['“See what’s on” button', 'See what’s on'],
    'picks-heading': ['“This month’s picks” heading', 'This month’s picks'],
    'picks-intro': ['Line under “This month’s picks”', 'Chosen by the people who work here. Ask at the till and we’ll tell you why.'],
    'pick1-title': ['First pick’s title', 'The Lighthouse Year'],
    'pick1-text': ['First pick’s description', 'A keeper’s diary of one winter on the rocks. Quiet, funny, hard to put down.'],
    'pick2-title': ['Second pick’s title', 'Small Hours on Mercer Street'],
    'pick2-text': ['Second pick’s description', 'Five neighbours, one power cut and a very long night. Our favourite first novel this year.'],
    'pick3-title': ['Third pick’s title', 'A Field Guide to Rain'],
    'pick3-text': ['Third pick’s description', 'Everything you never knew about drizzle, with lovely drawings. Perfect for a wet weekend.'],
    'cafe-heading': ['Café heading', 'The café corner'],
    'cafe-text': ['Café description', 'Coffee from a roaster down the road, tea in proper pots, and cakes baked every morning. Sit as long as you like, with any book from the shelves.'],

    'events-kicker': ['Line above the Events heading', 'In the shop, after closing'],
    'events-heading': ['Events heading', 'What’s on'],
    'events-intro': ['Events introduction', 'Readings, talks and our book club, with tea and cake. Every event is free; booking just helps us put out enough chairs.'],
    'ev1-date': ['First event’s date', 'Thu 3 Dec, 7pm'],
    'ev1-title': ['First event’s title', 'An evening with Mira Holt'],
    'ev1-text': ['First event’s description', 'The author of The Lighthouse Year reads from it and answers your questions.'],
    'ev1-btn': ['First event’s “Book a place” button', 'Book a place'],
    'ev2-date': ['Second event’s date', 'Sat 12 Dec, 10am'],
    'ev2-title': ['Second event’s title', 'Winter stories for little ones'],
    'ev2-text': ['Second event’s description', 'Stories, songs and hot chocolate for under-sevens and their grown-ups.'],
    'ev2-btn': ['Second event’s “Book a place” button', 'Book a place'],
    'ev3-date': ['Third event’s date', 'Thu 17 Dec, 7pm'],
    'ev3-title': ['Third event’s title', 'Book club: Small Hours on Mercer Street'],
    'ev3-text': ['Third event’s description', 'This month’s book club. Read it, or just come and listen.'],
    'ev3-btn': ['Third event’s “Book a place” button', 'Book a place'],
    'events-note': ['Events closing paragraph', 'Doors open fifteen minutes before each event. The shop is step-free, and there’s a quiet room upstairs if you need a break.'],

    'contact-kicker': ['Line above the Contact heading', 'Visit, ring or write'],
    'contact-heading': ['Contact heading', 'Come and see us'],
    'contact-intro': ['Contact introduction', 'We’re at the top of Cobble Lane, five minutes’ walk from the station. Ring us, send a message, or just pop in.'],
    directions: ['“Get directions” link', 'Get directions'],
    'hours-heading': ['“Opening hours” heading', 'Opening hours'],
    'hours-1-day': ['Opening hours: Monday', 'Monday'],
    'hours-1-time': ['Opening hours: Monday’s hours', 'Closed'],
    'hours-2-day': ['Opening hours: Tuesday to Friday', 'Tuesday to Friday'],
    'hours-2-time': ['Opening hours: Tuesday to Friday’s hours', '9am to 6pm'],
    'hours-3-day': ['Opening hours: Saturday', 'Saturday'],
    'hours-3-time': ['Opening hours: Saturday’s hours', '9am to 5pm'],
    'hours-4-day': ['Opening hours: Sunday', 'Sunday'],
    'hours-4-time': ['Opening hours: Sunday’s hours', '10am to 4pm'],
    'contact-phone': ['Phone number on the Contact page', 'Phone 01632 960 418'],
    'contact-email': ['Email address on the Contact page', 'hello@cobblelanebooks.example'],
    'form-heading': ['Contact form heading', 'Send us a message'],
    'lbl-name': ['Contact form: “Name” label', 'Name'],
    'lbl-email': ['Contact form: “Email” label', 'Email'],
    'lbl-message': ['Contact form: “Message” label', 'Message'],
    'send-btn': ['“Send message” button', 'Send message'],
    'findus-heading': ['“Finding us” heading', 'Finding us'],
    'findus-text': ['“Finding us” description', 'Cobble Lane runs uphill from the market square. We’re the green shopfront at the top, opposite the bakery. There’s a bike rack outside.'],

    'footer-name': ['Site name in the footer', 'Cobble Lane Books'],
    'footer-address': ['Address in the footer', '14 Cobble Lane, Hartfield HF1 4QT'],
    'footer-phone': ['Phone number in the footer', '01632 960 418'],
    'footer-open': ['Opening line in the footer', 'Open every day exept Mondays'],
    'footer-find': ['“How to find us” link in the footer', 'How to find us'],
    'news-heading': ['Newsletter heading in the footer', 'Our monthly newsletter'],
    'news-text': ['Newsletter line in the footer', 'New books, events and the odd recipe from the café.'],
    'lbl-news': ['Newsletter: “Email address” label', 'Email address'],
    'news-btn': ['“Sign up” button in the footer', 'Sign up'],
    'footer-copy': ['Copyright line', '© 2026 Cobble Lane Books']
  };
  const ORIGINAL = Object.fromEntries(Object.entries(TEXT).map(([k, v]) => [k, v[1]]));
  const labelOf = (key) => (TEXT[key] ? TEXT[key][0] : key);
  const pageOfKey = (key) => (/^(site-|nav-|bookclub|footer-|news-|lbl-news)/.test(key) ? 'every page' : key.startsWith('home-') || key.startsWith('pick') || key.startsWith('cafe-') ? 'Home' : key.startsWith('ev') ? 'Events' : 'Contact');

  const PICTURES = {
    hero: '<svg class="cl-art" viewBox="0 0 560 440" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Drawing of the shop: shelves of books, an armchair and a cup of coffee"><rect width="560" height="440" fill="#E9DFCC"/><rect x="0" y="330" width="560" height="110" fill="#B98A5E"/><rect x="0" y="330" width="560" height="10" fill="#A0764E"/>' +
      '<g><rect x="40" y="40" width="300" height="290" rx="6" fill="#6B4A33"/><rect x="52" y="52" width="276" height="266" fill="#3E2A1D"/>' +
      '<rect x="52" y="134" width="276" height="10" fill="#6B4A33"/><rect x="52" y="226" width="276" height="10" fill="#6B4A33"/>' +
      '<g><rect x="60" y="70" width="16" height="64" fill="#C8643B"/><rect x="78" y="78" width="12" height="56" fill="#E8B04B"/><rect x="92" y="66" width="18" height="68" fill="#2F5B4A"/><rect x="112" y="74" width="14" height="60" fill="#DCD3C0"/><rect x="128" y="62" width="20" height="72" fill="#8A3F2A"/><rect x="150" y="80" width="12" height="54" fill="#5E7F9A"/><rect x="164" y="70" width="16" height="64" fill="#E8B04B"/><path d="M186 134l14-60 14 3-14 57z" fill="#C8643B"/><rect x="222" y="72" width="18" height="62" fill="#2F5B4A"/><rect x="242" y="66" width="14" height="68" fill="#DCD3C0"/><rect x="258" y="78" width="20" height="56" fill="#5E7F9A"/><rect x="280" y="68" width="14" height="66" fill="#8A3F2A"/><rect x="296" y="74" width="22" height="60" fill="#E8B04B"/></g>' +
      '<g><rect x="60" y="164" width="22" height="62" fill="#5E7F9A"/><rect x="84" y="156" width="14" height="70" fill="#E8B04B"/><rect x="100" y="168" width="18" height="58" fill="#8A3F2A"/><rect x="120" y="160" width="12" height="66" fill="#DCD3C0"/><rect x="134" y="166" width="20" height="60" fill="#2F5B4A"/><rect x="156" y="158" width="16" height="68" fill="#C8643B"/><rect x="190" y="196" width="70" height="14" fill="#DCD3C0"/><rect x="186" y="210" width="78" height="16" fill="#2F5B4A"/><rect x="270" y="160" width="16" height="66" fill="#E8B04B"/><rect x="288" y="168" width="12" height="58" fill="#8A3F2A"/><rect x="302" y="158" width="18" height="68" fill="#5E7F9A"/></g>' +
      '<g><rect x="60" y="254" width="16" height="64" fill="#2F5B4A"/><rect x="78" y="262" width="20" height="56" fill="#DCD3C0"/><rect x="100" y="250" width="14" height="68" fill="#C8643B"/><rect x="116" y="258" width="18" height="60" fill="#E8B04B"/><rect x="136" y="264" width="12" height="54" fill="#5E7F9A"/><rect x="150" y="252" width="20" height="66" fill="#8A3F2A"/><rect x="172" y="260" width="14" height="58" fill="#2F5B4A"/><rect x="188" y="254" width="18" height="64" fill="#DCD3C0"/><rect x="230" y="262" width="16" height="56" fill="#C8643B"/><rect x="248" y="252" width="22" height="66" fill="#5E7F9A"/><rect x="272" y="258" width="14" height="60" fill="#E8B04B"/><rect x="288" y="250" width="18" height="68" fill="#2F5B4A"/></g></g>' +
      '<g><path d="M372 212c0-26 20-44 48-44h44c28 0 48 18 48 44v58h-140z" fill="#2F5B4A"/><rect x="356" y="236" width="36" height="88" rx="16" fill="#24473A"/><rect x="492" y="236" width="36" height="88" rx="16" fill="#24473A"/><rect x="380" y="262" width="124" height="40" rx="10" fill="#3B6E5A"/><rect x="372" y="300" width="140" height="22" rx="6" fill="#24473A"/><rect x="380" y="320" width="10" height="14" fill="#3E2A1D"/><rect x="494" y="320" width="10" height="14" fill="#3E2A1D"/></g>' +
      '<g><rect x="380" y="368" width="150" height="10" rx="3" fill="#6B4A33"/><rect x="396" y="378" width="8" height="40" fill="#6B4A33"/><rect x="506" y="378" width="8" height="40" fill="#6B4A33"/><path d="M420 344h34l-4 24h-26z" fill="#FFF8EC"/><path d="M454 350c10 0 10 12 0 12" fill="none" stroke="#FFF8EC" stroke-width="4"/><path d="M430 336c-4-8 4-10 0-18M442 336c-4-8 4-10 0-18" fill="none" stroke="#FFF8EC" stroke-width="3" stroke-linecap="round" opacity=".8"/><rect x="470" y="356" width="44" height="12" rx="2" fill="#C8643B"/><rect x="474" y="346" width="36" height="10" rx="2" fill="#E8B04B"/></g>' +
      '<g><path d="M400 70h110v76H400z" fill="#F7EFDF" stroke="#6B4A33" stroke-width="6"/><path d="M455 70v76M400 108h110" stroke="#6B4A33" stroke-width="4"/><circle cx="430" cy="92" r="10" fill="#E8B04B" opacity=".7"/></g>' +
      '<path d="M372 168c-10-30 8-50 26-50 2 24-10 40-26 50z" fill="#3B6E5A"/><rect x="360" y="160" width="22" height="10" fill="#6B4A33"/></svg>',
    cover1: '<svg class="cl-cover" viewBox="0 0 120 170" role="img" aria-label="Cover of The Lighthouse Year: a lighthouse on dark blue"><rect width="120" height="170" fill="#22384F"/><circle cx="92" cy="32" r="12" fill="#F3E6C4"/><path d="M0 132q30-10 60 0t60 0v38H0z" fill="#3E5C78"/><path d="M52 132l4-62h10l4 62z" fill="#F3E6C4"/><rect x="54" y="62" width="14" height="10" fill="#C8643B"/><path d="M61 66L10 46v40z" fill="#F3E6C4" opacity=".35"/><rect x="0" y="0" width="8" height="170" fill="#000" opacity=".15"/></svg>',
    cover2: '<svg class="cl-cover" viewBox="0 0 120 170" role="img" aria-label="Cover of Small Hours on Mercer Street: a row of houses at night"><rect width="120" height="170" fill="#E8B04B"/><path d="M10 120V80l18-16 18 16v40zM46 120V70l18-16 18 16v50zM82 120V84l14-12 14 12v36z" fill="#2B2A3A"/><rect x="20" y="92" width="8" height="10" fill="#F7EFDF"/><rect x="58" y="80" width="8" height="10" fill="#F7EFDF"/><rect x="92" y="96" width="8" height="8" fill="#F7EFDF"/><rect x="0" y="120" width="120" height="50" fill="#2B2A3A"/><circle cx="96" cy="34" r="10" fill="#F7EFDF"/><rect x="0" y="0" width="8" height="170" fill="#000" opacity=".12"/></svg>',
    cover3: '<svg class="cl-cover" viewBox="0 0 120 170" role="img" aria-label="Cover of A Field Guide to Rain: an umbrella under falling rain"><rect width="120" height="170" fill="#DDE6DA"/><g stroke="#5E7F9A" stroke-width="3" stroke-linecap="round"><path d="M20 20l-4 12M44 14l-4 12M70 22l-4 12M96 12l-4 12M30 46l-4 12M84 44l-4 12"/></g><path d="M22 104a38 38 0 0 1 76 0z" fill="#C8643B"/><path d="M60 104v34a8 8 0 0 1-16 0" fill="none" stroke="#2F5B4A" stroke-width="4" stroke-linecap="round"/><rect x="0" y="0" width="8" height="170" fill="#000" opacity=".1"/></svg>',
    cafe: '<svg class="cl-art" viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Drawing of the café counter with cakes and a coffee machine"><rect width="480" height="300" fill="#F2E6D3"/><rect y="190" width="480" height="110" fill="#2F5B4A"/><rect y="182" width="480" height="12" fill="#6B4A33"/><rect x="60" y="100" width="90" height="82" rx="8" fill="#B7B9B4"/><rect x="72" y="114" width="66" height="26" rx="4" fill="#5E6360"/><rect x="88" y="150" width="10" height="20" fill="#5E6360"/><rect x="112" y="150" width="10" height="20" fill="#5E6360"/><path d="M200 182h80v-6a40 12 0 0 0-80 0z" fill="#fff" opacity=".7"/><path d="M212 176v-34h56v34z" fill="#C8643B"/><path d="M212 142h56l-6-12h-44z" fill="#F7EFDF"/><circle cx="240" cy="126" r="6" fill="#8A3F2A"/><path d="M310 182h90v-4a45 10 0 0 0-90 0z" fill="#fff" opacity=".7"/><path d="M322 178l34-30 34 30z" fill="#E8B04B"/><path d="M322 178l34-30v30z" fill="#D69A33"/><rect x="40" y="30" width="400" height="44" rx="6" fill="#24473A"/><g fill="#F7EFDF"><rect x="64" y="46" width="60" height="6" rx="3"/><rect x="144" y="46" width="90" height="6" rx="3"/><rect x="254" y="46" width="50" height="6" rx="3"/><rect x="324" y="46" width="90" height="6" rx="3"/></g></svg>',
    map: '<svg class="cl-map" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A simple map: the shop at the top of Cobble Lane, opposite the bakery, above the market square"><rect width="600" height="300" fill="#EDE7DA"/><g fill="#DCD3C0"><rect x="20" y="20" width="150" height="90" rx="6"/><rect x="20" y="150" width="150" height="130" rx="6"/><rect x="430" y="20" width="150" height="120" rx="6"/><rect x="430" y="180" width="150" height="100" rx="6"/></g><rect x="200" y="0" width="200" height="300" fill="#DDE6DA"/><path d="M0 130h600" stroke="#fff" stroke-width="22"/><path d="M300 0v300" stroke="#fff" stroke-width="26"/><path d="M220 210h160v70H220z" fill="#C9D6C3"/><text x="300" y="252" font-family="system-ui, sans-serif" font-size="14" fill="#4E5F52" text-anchor="middle">Market square</text><text x="318" y="70" font-family="system-ui, sans-serif" font-size="13" fill="#6B6F66" transform="rotate(90 318 70)">Cobble Lane</text><rect x="236" y="30" width="44" height="34" rx="4" fill="#E8B04B"/><text x="258" y="80" font-family="system-ui, sans-serif" font-size="12" fill="#6B6F66" text-anchor="middle">Bakery</text><circle cx="342" cy="46" r="16" fill="#24473A"/><circle cx="342" cy="46" r="6" fill="#fff"/><text x="364" y="51" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#24473A">Us</text></svg>',
    logo: '<svg class="cl-logo" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="20" fill="#24473A"/><path d="M11 13h7.5c1 0 1.5.6 1.5 1.5V28c-.5-1-1.4-1.5-2.5-1.5H11zM29 13h-7.5c-1 0-1.5.6-1.5 1.5V28c.5-1 1.4-1.5 2.5-1.5H29z" fill="#F7EFDF"/></svg>'
  };

  // ---------- Saved state ----------

  const deepCopy = (o) => JSON.parse(JSON.stringify(o));
  function freshState() {
    return {
      v: 1,
      firstOpen: Date.now(),
      mode: 'browse',
      hist: { stack: ['home'], i: 0 },
      saved: deepCopy(ORIGINAL),
      draft: deepCopy(ORIGINAL),
      undo: [], redo: [], sid: 0,
      log: [],
      stats: {
        first: null, entries: 0, byRoute: {}, nfBefore: 0, nfTotal: 0,
        prompts: { shown: 0, accepted: 0, dismissed: 0, followed: 0, ignored: 0 }, promptKinds: {},
        follows: 0, followsVia: 0, uses: 0, usesVia: 0,
        accidental: 0, exits: 0, pages: 0, saves: 0, edits: 0, undos: 0, redos: 0, escapes: 0, finished: 0,
        gBefore: 0, gTotal: 0, tried: 0, saveGrey: 0, reviews: 0, reviewsCancelled: 0, discards: 0,
        firstUnsavedT: null, firstSave: null, savesDialog: 0,
        arm: {}, armLabels: {}
      },
      tasks: {}, manual: {},
      menuFollowed: {},
      visit: null,
      spell: { id: 1, data: {} },
      store: {},
      prompts: { next: 1, open: {} },
      booked: {}, sent: {}, clubOpen: false, fields: {},
      pending: null,
      ui: { screen: 'home', parent: 'home', allSaved: false },
      scroll: { browse: 0, edit: 0 }
    };
  }
  let S;
  let reloaded = false;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { S = JSON.parse(raw); reloaded = !!(S && S.v === 1); }
  } catch (err) { S = null; }
  if (!S || S.v !== 1) S = freshState();
  for (const k of Object.keys(ORIGINAL)) { if (!(k in S.saved)) S.saved[k] = ORIGINAL[k]; if (!(k in S.draft)) S.draft[k] = S.saved[k]; }
  if (!S.fields) S.fields = {};
  if (!S.ui) S.ui = { screen: 'home', parent: 'home', allSaved: false };

  // Two tabs of the same arm would overwrite each other's state. The tab that
  // wrote last is the live one: when another tab writes (or Reset clears) the
  // same key, this tab stops writing and says so, and a reload of it carries
  // on from what's stored. A tab knows it's been reloaded (rather than opened
  // a second time) from a marker in sessionStorage, which is kept per tab.
  let stale = false;
  let openedAgain = false;
  try {
    const mark = 'vermeer-tab:' + STORE_KEY;
    if (reloaded && !sessionStorage.getItem(mark)) openedAgain = true;
    sessionStorage.setItem(mark, '1');
  } catch (err) { /* no sessionStorage: treat as a reload */ }

  let resetting = false;
  function persist() {
    if (resetting || stale) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (err) { /* private mode: carry on in memory */ }
  }

  const now = () => (Date.now() - S.firstOpen) / 1000;
  const page = () => S.hist.stack[S.hist.i];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const quote = (s) => '“' + (String(s).length > 60 ? String(s).slice(0, 59) + '…' : s) + '”';
  const fmtTime = (t) => { const s = Math.max(0, Math.floor(t)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // ---------- Log ----------

  function note(kind, text) {
    S.log.push({ t: Math.round(now() * 10) / 10, kind, text });
    persist();
    renderNotes();
  }

  // ---------- Listeners for arms ----------

  const listeners = {};
  function emit(event, detail) {
    for (const fn of (listeners[event] || []).slice()) {
      try { fn(detail); } catch (err) { console.error(err); }
    }
  }

  // ---------- The frame: as Create not Learn draws it ----------

  /*
   * Create not Learn's chrome (trunk 54b6612), drawn here without building
   * it: WordPress's admin bar across the top; the dark strip of icons on the
   * left; the sidebar with Home's places to start, the Pages screen and the
   * other screens, their controls drawn but inert; and the canvas with its
   * toolbar. The canvas is the only part that works fully: Back and Forward,
   * the page finder, Edit, Undo and Redo, Exit and Save.
   *
   * Clicks on the admin bar, the strip and the sidebar are counted (the code's
   * `g`, before the first time in editing) and logged. Anything drawn but
   * inert logs "Tried …".
   */

  const ADDRESS = 'cobblelanebooks.example';
  const PAGE_PATH = { home: '/', events: '/events/', contact: '/contact/' };

  const app = document.getElementById('app');
  app.className = 'vm-app' + (NOTES ? ' has-notes' : '');
  const ab = (label, inner, cls) => '<button type="button" class="vm-ab-item' + (cls ? ' ' + cls : '') + '" data-chrome="' + label + '">' + inner + '</button>';
  app.innerHTML =
    '<div class="vm-adminbar" role="navigation" aria-label="Toolbar">' +
      '<div class="vm-ab-left">' +
        ab('WordPress logo', ICONS.wp, 'vm-ab-logo') +
        ab('Cobble Lane Books', ICONS.dashboard + '<span>Cobble Lane Books</span>') +
        ab('Updates', ICONS.updates + '<span>1</span>') +
        ab('Search', ICONS.search + '<span>' + (/Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘K' : 'Ctrl+K') + '</span>') +
        ab('Comments', ICONS.comment + '<span>0</span>') +
        ab('New', ICONS.plus + '<span>New</span>') +
      '</div>' +
      '<div class="vm-ab-right">' + ab('Howdy, admin', '<span>Howdy, admin</span><span class="vm-ab-avatar" aria-hidden="true"></span>') + '</div>' +
    '</div>' +
    '<div class="vm-editor">' +
      '<nav class="vm-rail" aria-label="Main"></nav>' +
      '<aside class="vm-sidebar" aria-label="Sidebar"></aside>' +
      '<section class="vm-canvas" aria-label="Your page">' +
        '<div class="vm-toolbar" role="toolbar" aria-label="Page tools"></div>' +
        '<div class="vm-stage">' +
          '<div class="vm-viewport" tabindex="-1"><div class="vm-site cl"></div></div>' +
          '<div class="vm-layer"></div>' +
          '<div class="vm-zoom" role="group" aria-label="Zoom">' +
            '<button type="button" class="vm-icon-btn" data-tool="zoom-in" aria-disabled="true" aria-label="Zoom in" data-tip="Zoom in" data-tip-side="left">' + ICONS.plus + '</button>' +
            '<button type="button" class="vm-icon-btn" data-tool="zoom-out" aria-label="Zoom out to arrange sections" data-tip="Zoom out to arrange sections" data-tip-side="left">' + ICONS.minus + '</button>' +
          '</div>' +
        '</div>' +
      '</section>' +
    '</div>' +
    '<div class="vm-bottombar"><button type="button" class="vm-btn vm-btn-primary" data-action="finish">Finished</button><p>Click Finished when you’ve done everything you were asked to.</p></div>' +
    '<div class="vm-live" aria-live="polite" role="status"></div>';
  const adminbar = app.querySelector('.vm-adminbar');
  const rail = app.querySelector('.vm-rail');
  const sidebar = app.querySelector('.vm-sidebar');
  const toolbar = app.querySelector('.vm-toolbar');
  const viewport = app.querySelector('.vm-viewport');
  const site = app.querySelector('.vm-site');
  const layer = app.querySelector('.vm-layer');
  const zoom = app.querySelector('.vm-zoom');
  const live = app.querySelector('.vm-live');

  function announce(text) {
    live.textContent = '';
    setTimeout(() => { live.textContent = text; }, 30);
  }

  function hasUnsaved() { return Object.keys(S.draft).some((k) => S.draft[k] !== S.saved[k]); }
  function unsavedCount() { return Object.keys(S.draft).filter((k) => S.draft[k] !== S.saved[k]).length; }

  // What a bit of text belongs to, as Create not Learn's Review changes
  // lists it: the header or footer (site parts, on every page), or a page.
  const ENTITIES = {
    header: { label: 'Header', detail: 'Site part', siteWide: true },
    footer: { label: 'Footer', detail: 'Site part', siteWide: true },
    home: { label: 'Home', detail: 'Page' },
    events: { label: 'Events', detail: 'Page' },
    contact: { label: 'Contact', detail: 'Page' }
  };
  const entityOf = (key) => (/^(site-|nav-|bookclub)/.test(key) ? 'header' : /^(footer-|news-|lbl-news)/.test(key) ? 'footer'
    : /^(home-|pick|cafe-)/.test(key) ? 'home' : /^ev/.test(key) ? 'events' : 'contact');
  // The changes waiting to be saved, one per header, footer or page.
  function changes() {
    const out = [];
    for (const k of Object.keys(S.draft)) {
      if (S.draft[k] === S.saved[k]) continue;
      const id = entityOf(k);
      if (!out.includes(id)) out.push(id);
    }
    return Object.keys(ENTITIES).filter((id) => out.includes(id));
  }
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const SAVE_KEYS = isMacPlatform() ? '⌘S' : 'Ctrl+S';
  function isMacPlatform() { return /Mac|iPhone|iPad/.test(navigator.platform || ''); }

  // ---------- The strip of icons ----------

  // Create not Learn's menu items (`includes/editor-registry.php`), as the
  // folded sidebar shows them: Home; Pages and Posts; Site overview, Menus,
  // Name & logo and Media; Colors and Fonts; and at the foot Advanced, then
  // Expand sidebar and the workspace switcher.
  const RAIL = [
    { id: 'home', label: 'Home', icon: 'home', go: 'home' }, null,
    { id: 'pages', label: 'Pages', icon: 'pages', go: 'pages' },
    { id: 'posts', label: 'Posts', icon: 'postList', go: 'posts' }, null,
    { id: 'overview', label: 'Site overview', icon: 'networking', go: 'overview' },
    { id: 'menus', label: 'Menus', icon: 'navigation', go: 'menus' },
    { id: 'identity', label: 'Name & logo', icon: 'siteLogo', go: 'identity' },
    { id: 'media', label: 'Media', icon: 'media', go: 'media' }, null,
    { id: 'colors', label: 'Colors', icon: 'color', go: 'colors' },
    { id: 'fonts', label: 'Fonts', icon: 'typography', go: 'fonts' }
  ];
  const RAIL_FOOT = [
    { label: 'Advanced', icon: 'code' }, null,
    { label: 'Expand sidebar', icon: 'drawerLeft' },
    { label: 'Workspace: Default', icon: 'category' }
  ];
  function renderRail() {
    const btn = (it) => it ? '<button type="button" class="vm-rail-btn' + (it.go && S.ui.screen === it.go ? ' is-current' : '') + '" data-chrome="' + it.label + '"' +
      (it.go ? ' data-go="' + it.go + '"' : '') + ' aria-label="' + it.label + '" data-tip="' + it.label + '" data-tip-side="right"' +
      (it.go && S.ui.screen === it.go ? ' aria-current="page"' : '') + '>' + ICONS[it.icon] + '</button>' : '<span class="vm-rail-sep" aria-hidden="true"></span>';
    rail.innerHTML = '<div class="vm-rail-top">' + RAIL.map(btn).join('') + '</div><div class="vm-rail-foot">' + RAIL_FOOT.map(btn).join('') + '</div>';
  }

  // ---------- The sidebar's screens ----------

  // Home's places to start, in the Default workspace's order
  // (`src/start-places.js`, `src/workspaces/presets.js`).
  const PLACES = [
    { id: 'homepage', icon: 'home', title: 'Your homepage', desc: 'Make the first page visitors see your own.' },
    { id: 'pages', icon: 'pages', title: 'Pages', desc: 'Add pages like About and Contact, and pick your menu.' },
    { id: 'identity', icon: 'siteLogo', title: 'Name & logo', desc: 'Name your site and add a logo.' },
    { id: 'design', icon: 'brush', title: 'Design', desc: 'Pick the colors and fonts of your whole site.' },
    { id: 'siteParts', icon: 'siteParts', title: 'Header & footer', desc: 'Choose the top and bottom of every page.' }
  ];
  const TITLES = { home: 'Home', pages: 'Pages', posts: 'Posts', overview: 'Site overview', menus: 'Menus', identity: 'Name & logo', media: 'Media', design: 'Design', colors: 'Colors', fonts: 'Fonts', siteParts: 'Header & footer' };

  const row = (o) => '<button type="button" class="vm-link-row" data-chrome="' + o.title + '"' + (o.go ? ' data-go="' + o.go + '"' : '') + (o.homepage ? ' data-homepage' : '') + '>' +
    '<span class="vm-link-icon">' + ICONS[o.icon] + '</span><span class="vm-link-text"><strong>' + o.title + '</strong>' + (o.desc ? '<span>' + o.desc + '</span>' : '') + '</span>' +
    '<span class="vm-link-chevron">' + ICONS.chevronRight + '</span></button>';
  const head = (title, extra) => '<div class="vm-screen-head"><button type="button" class="vm-icon-btn vm-back" data-chrome="Back" data-go="' + (S.ui.parent || 'home') + '" aria-label="Back" data-tip="Back">' + ICONS.chevronLeft + '</button>' +
    '<h2>' + title + '</h2>' + (extra || '') + '</div>';
  const desc = (t) => '<p class="vm-screen-desc">' + t + '</p>';
  const field = (label, value, ph) => '<label class="vm-field"><span>' + label + '</span><input type="text" readonly value="' + esc(value || '') + '" placeholder="' + esc(ph || '') + '" data-chrome="the ' + label + ' box"></label>';

  function screenHTML(id) {
    if (id === 'home') {
      return '<div class="vm-sitecard"><span class="vm-site-mark" aria-hidden="true">C</span><div><h2>Cobble Lane Books</h2>' +
        '<button type="button" class="vm-site-address" data-chrome="' + ADDRESS + ' (opens the live site in a new tab)">' + ADDRESS + ' ↗</button></div></div>' +
        '<div class="vm-places" role="group" aria-label="Start working on your site">' +
          PLACES.map((p) => row({ title: p.title, desc: p.desc, icon: p.icon, go: p.id === 'homepage' ? null : p.id, homepage: p.id === 'homepage' })).join('') +
        '</div>' +
        '<p class="vm-hint">Tip: follow links to look around your site, and press Edit to change the page you’re on.</p>';
    }
    if (id === 'pages') {
      const pageRow = (pid) => '<div class="vm-page-row' + (pid === page() ? ' is-shown' : '') + '">' +
        '<button type="button" class="vm-page-pick" data-chrome="' + (pid === 'home' ? 'Homepage' : PAGES[pid]) + ' in the list of pages" data-show-page="' + pid + '">' +
          (pid === 'home' ? ICONS.home : ICONS.page) + '<span>' + (pid === 'home' ? 'Homepage' : PAGES[pid]) + '</span></button>' +
        '<button type="button" class="vm-icon-btn vm-row-more" data-chrome="Page options for ' + PAGES[pid] + '" aria-label="Page options">' + ICONS.moreVertical + '</button>' +
        '<button type="button" class="vm-toggle" role="switch" aria-checked="true" data-chrome="the menu switch for ' + PAGES[pid] + '" aria-label="Show ' + PAGES[pid] + ' in your menu"><span></span></button>' +
      '</div>';
      return head('Pages', '<button type="button" class="vm-btn vm-btn-primary" data-chrome="Add page">Add page</button><button type="button" class="vm-icon-btn" data-chrome="Page options" aria-label="Page options" data-tip="Page options">' + ICONS.moreVertical + '</button>') +
        desc('Every page on your site. Pick one to see it, and switch it on to show it in your menu.') +
        '<div class="vm-page-list">' + PAGE_IDS.map(pageRow).join('') +
          '<button type="button" class="vm-add-square" data-chrome="Add (the + under the pages)" aria-label="Add">' + ICONS.plus + '</button></div>' +
        '<div class="vm-more-links" role="group" aria-label="More options">' +
          row({ title: 'System pages', desc: 'Change pages your site makes for itself, like the 404 page.', icon: 'pages' }) +
          row({ title: 'Manage all menus', desc: 'Add a menu for your footer, or anywhere else.', icon: 'navigation' }) +
        '</div>';
    }
    if (id === 'posts') {
      return head('Posts', '<button type="button" class="vm-btn vm-btn-primary" data-chrome="Add post">Add post</button>') + desc('Your blog posts, newest first.') +
        '<div class="vm-empty">' + ICONS.postList + '<strong>No posts yet</strong><span>Create your first post to start adding content here.</span>' +
        '<button type="button" class="vm-btn vm-btn-primary" data-chrome="Add post (empty list)">Add post</button></div>';
    }
    if (id === 'overview') {
      return head('Site overview') + desc('Every page on your site, at a glance · 3 pages') +
        '<div class="vm-overview" data-chrome="the site overview map">' + PAGE_IDS.map((pid) => '<span class="vm-ov-node' + (pid === 'home' ? ' is-root' : '') + '">' + PAGES[pid] + '</span>').join('') + '</div>';
    }
    if (id === 'menus') {
      return head('Menus', '<button type="button" class="vm-btn vm-btn-primary" data-chrome="Add a menu">Add a menu</button>') +
        desc('The links visitors use to get around your site. Your main menu, the one in your header, lists your pages by itself. Choose which on the Pages screen.') +
        '<div class="vm-more-links">' + row({ title: 'Main menu', desc: 'In your header · Home, Events, Contact', icon: 'navigation' }) + '</div>';
    }
    if (id === 'identity') {
      return head('Name & logo') + desc('Your site’s name, tagline, and logo. Shown in your header, browser tabs, and search results.') +
        '<div class="vm-form">' + field('Site name', S.saved['site-name']) + field('Tagline', '', 'Add a tagline') +
        '<div class="vm-field"><span>Logo</span><button type="button" class="vm-dropzone" data-chrome="Add a logo">' + ICONS.plus + 'Add a logo</button></div></div>';
    }
    if (id === 'media') {
      return head('Media', '<button type="button" class="vm-btn vm-btn-primary" data-chrome="Upload">Upload</button>') +
        desc('The photos, videos, and files on your site. Upload new ones here, or open one to crop it or change its details.') +
        '<div class="vm-media-grid">' + ['#C8643B', '#2F5B4A', '#E8B04B', '#5E7F9A', '#DDE6DA', '#8A3F2A'].map((c, i) => '<button type="button" class="vm-media-tile" style="background:' + c + '" data-chrome="picture ' + (i + 1) + ' in Media" aria-label="Picture ' + (i + 1) + '"></button>').join('') + '</div>';
    }
    if (id === 'design') {
      const looks = [['Cobble Lane', '#24473A', '#FBF7F0', '#C8643B'], ['Evening', '#1D2F27', '#E9E2D3', '#E8B04B'], ['Paper', '#22302A', '#FFFFFF', '#5E7F9A'], ['Clay', '#8A3F2A', '#F3E9D8', '#2F5B4A']];
      return head('Design') + desc('How your whole site looks.') +
        '<div class="vm-looks">' + looks.map((l, i) => '<button type="button" class="vm-look' + (i === 0 ? ' is-current' : '') + '" data-chrome="the look ' + l[0] + '"><span class="vm-look-art" style="background:' + l[2] + '"><b style="color:' + l[1] + '">Aa</b><i style="background:' + l[3] + '"></i></span><span>' + l[0] + '</span></button>').join('') + '</div>' +
        '<div class="vm-more-links" role="group" aria-label="More design options">' +
          row({ title: 'Colors', desc: 'Pick the colors your whole site uses.', icon: 'color', go: 'colors' }) +
          row({ title: 'Fonts', desc: 'Pick the fonts your whole site uses.', icon: 'typography', go: 'fonts' }) +
          row({ title: 'Name & logo', desc: 'Name your site and add a logo.', icon: 'siteLogo', go: 'identity' }) +
        '</div>';
    }
    if (id === 'colors') {
      const sets = [['#24473A', '#FBF7F0', '#C8643B', '#E8B04B'], ['#1D2F27', '#E9E2D3', '#5E7F9A', '#DDE6DA'], ['#8A3F2A', '#F3E9D8', '#2F5B4A', '#E8B04B']];
      return head('Colors') + desc('The colors your whole site uses. Your theme provides these palettes.') +
        '<div class="vm-palettes">' + sets.map((p, i) => '<button type="button" class="vm-palette' + (i === 0 ? ' is-current' : '') + '" data-chrome="palette ' + (i + 1) + '">' + p.map((c) => '<i style="background:' + c + '"></i>').join('') + '</button>').join('') + '</div>';
    }
    if (id === 'fonts') {
      const pairs = [['Serif and sans', 'Georgia, serif'], ['All sans', 'system-ui, sans-serif'], ['Typewriter', 'ui-monospace, monospace']];
      return head('Fonts') + desc('The fonts your whole site uses. Your theme provides these pairings.') +
        '<div class="vm-palettes">' + pairs.map((p, i) => '<button type="button" class="vm-fontpair' + (i === 0 ? ' is-current' : '') + '" data-chrome="the fonts ' + p[0] + '"><b style="font-family:' + p[1] + '">Aa</b><span>' + p[0] + '</span></button>').join('') + '</div>';
    }
    if (id === 'siteParts') {
      return head('Header & footer') +
        '<div class="vm-more-links vm-first">' +
          row({ title: 'Header', desc: 'Choose how the top of every page looks.', icon: 'header' }) +
          row({ title: 'Footer', desc: 'Choose how the bottom of every page looks.', icon: 'footer' }) +
        '</div>';
    }
    return '';
  }
  function renderSidebar() {
    sidebar.innerHTML = '<div class="vm-screen" data-screen="' + S.ui.screen + '">' + screenHTML(S.ui.screen) + '</div>';
    renderRail();
  }
  function openScreen(id, how) {
    const from = S.ui.screen;
    // Colors, Fonts and Name & logo reached from Design go back to it.
    S.ui.parent = (from === 'design' && ['colors', 'fonts', 'identity'].includes(id)) ? 'design' : 'home';
    S.ui.screen = id;
    renderSidebar();
    renderToolbar();
    persist();
    // From the keyboard, focus goes into the screen opened.
    if (keyboardLast) { const f = sidebar.querySelector('.vm-back, button'); if (f) f.focus(); }
    if (id !== from) note('chrome', how + ': opened the ' + TITLES[id] + ' screen');
  }

  // A click on the admin bar, the strip or the sidebar: counted, logged, and
  // done if it's one of the few that do something.
  function chromeClick(e, where) {
    const el = e.target.closest('[data-chrome]');
    if (!el && e.target.closest('input, label')) return; // a click on a field's label repeats on its box
    if (!S.stats.first) S.stats.gBefore++;
    S.stats.gTotal++;
    if (!el) { note('chrome', 'Clicked an empty part of the ' + where); return; }
    const label = el.dataset.chrome;
    const whereName = { 'admin bar': 'the admin bar', rail: 'the strip of icons', sidebar: 'the sidebar' }[where];
    if (el.dataset.go) { openScreen(el.dataset.go, (where === 'rail' ? 'Strip of icons' : 'Sidebar') + ', ' + label); return; }
    if (el.dataset.homepage != null) {
      openScreen('pages', 'Sidebar, Your homepage');
      if (page() !== 'home') go('home', 'the sidebar’s Your homepage');
      renderSidebar();
      return;
    }
    if (el.dataset.showPage) {
      const to = el.dataset.showPage;
      if (to !== page()) go(to, 'the Pages screen');
      else note('chrome', 'Sidebar, ' + label + ' (already on show)');
      renderSidebar();
      const again = sidebar.querySelector('[data-show-page="' + to + '"]');
      if (again && keyboardLast) again.focus();
      return;
    }
    note('tried', 'Tried ' + whereName + ': ' + label);
    S.stats.tried++;
    persist();
    renderNotes();
  }
  adminbar.addEventListener('click', (e) => chromeClick(e, 'admin bar'));
  rail.addEventListener('click', (e) => chromeClick(e, 'rail'));
  sidebar.addEventListener('click', (e) => chromeClick(e, 'sidebar'));

  // ---------- The canvas toolbar ----------

  const tip = (t) => ' data-tip="' + t + '"';
  function saveTip() {
    const n = changes().length;
    return (n ? plural(n, 'unsaved change', 'unsaved changes') : S.ui.allSaved ? 'All changes saved' : '') + (n || S.ui.allSaved ? ' · ' : '') + SAVE_KEYS;
  }
  let toolbarDrawn = '';
  const drawnKey = () => S.mode + ':' + page() + ':' + (S.ui.screen === 'pages' && page() === 'home');
  let saveBusy = false;
  let lastChangeCount = 0;
  // Redraws the toolbar when the mode or page changes; otherwise updates the
  // buttons in place, so a click that blurs the text (and so updates Save)
  // still lands on the button it started on.
  function renderToolbar() {
    const edit = S.mode === 'edit';
    if (toolbarDrawn === drawnKey()) {
      const set = (action, off) => { const el = toolbar.querySelector('[data-action="' + action + '"]'); if (el) { if (off) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled'); } };
      if (edit) {
        set('undo', !S.undo.length);
        set('redo', !S.redo.length);
        updateSave();
      } else {
        set('back', S.hist.i <= 0);
        set('forward', S.hist.i >= S.hist.stack.length - 1);
      }
      return;
    }
    toolbarDrawn = drawnKey();
    // On the Pages screen the homepage is named as Create not Learn's Pages
    // canvas names it: "Homepage", with what it shows after it.
    const asHomepage = S.ui.screen === 'pages' && page() === 'home';
    const title = asHomepage ? 'Homepage' : PAGES[page()];
    const center = '<div class="vm-switcher"><button type="button" class="vm-address-btn" data-action="pages" aria-haspopup="true" aria-expanded="false" aria-label="' + title + ', Published. Go to another page"' + tip(ADDRESS + PAGE_PATH[page()]) + '>' +
        ICONS.search + '<span class="vm-address-title">' + title + '</span>' + (asHomepage ? '<span class="vm-address-meta">Home</span>' : '') + '</button>' +
        '<span class="vm-address-status" data-action="pages-status" aria-hidden="true"' + tip('Published') + '>' + ICONS.published + '</span></div>' +
      (page() === 'home' ? '<button type="button" class="vm-icon-btn vm-small-btn" data-action="page-options" aria-label="Page options" aria-haspopup="true"' + tip('Page options') + '>' + ICONS.moreHorizontal + '</button>' : '');
    const view = '<button type="button" class="vm-icon-btn" data-action="view" aria-label="View" aria-haspopup="true"' + tip('View') + '>' + ICONS.desktop + '</button>';
    let left, right;
    if (edit) {
      left = '<button type="button" class="vm-icon-btn" data-action="undo" aria-label="Undo"' + (S.undo.length ? '' : ' aria-disabled="true"') + tip('Undo ' + (isMacPlatform() ? '⌘Z' : 'Ctrl+Z')) + '>' + ICONS.undo + '</button>' +
        '<button type="button" class="vm-icon-btn" data-action="redo" aria-label="Redo"' + (S.redo.length ? '' : ' aria-disabled="true"') + tip('Redo ' + (isMacPlatform() ? '⇧⌘Z' : 'Ctrl+Shift+Z')) + '>' + ICONS.redo + '</button>' +
        '<button type="button" class="vm-icon-btn" data-action="overview" aria-label="Document Overview"' + tip('Document Overview') + '>' + ICONS.listView + '</button>';
      right = view + '<button type="button" class="vm-icon-btn" data-action="zoom-out" aria-label="Zoom out"' + tip('Zoom out') + '>' + ICONS.square + '</button>' +
        '<button type="button" class="vm-btn vm-btn-secondary vm-exit-btn" data-action="exit" aria-describedby="vm-exit-desc">Exit</button><span id="vm-exit-desc" hidden>Stop editing</span>' +
        '<button type="button" class="vm-btn vm-btn-primary vm-save" data-action="save" aria-keyshortcuts="' + (isMacPlatform() ? 'Meta+S' : 'Control+S') + '">Save</button>';
    } else {
      left = '<button type="button" class="vm-icon-btn" data-action="back" aria-label="Back in preview"' + (S.hist.i > 0 ? '' : ' aria-disabled="true"') + tip('Back in preview') + '>' + ICONS.back + '</button>' +
        '<button type="button" class="vm-icon-btn" data-action="forward" aria-label="Forward in preview"' + (S.hist.i < S.hist.stack.length - 1 ? '' : ' aria-disabled="true"') + tip('Forward in preview') + '>' + ICONS.forward + '</button>';
      right = view + '<button type="button" class="vm-btn vm-btn-primary vm-edit-btn" data-action="edit" aria-describedby="vm-edit-desc">' + ICONS.pencil + '<span>Edit</span></button>' +
        '<span id="vm-edit-desc" hidden>Change this page</span>';
    }
    const focused = document.activeElement && toolbar.contains(document.activeElement) ? document.activeElement.dataset.action : null;
    toolbar.innerHTML = '<div class="vm-tb-left">' + left + '</div><div class="vm-tb-center">' + center + '</div><div class="vm-tb-right">' + right + '</div>';
    if (edit) { lastChangeCount = changes().length; updateSave(); }
    if (focused) { const el = toolbar.querySelector('[data-action="' + focused + '"]'); if (el) el.focus(); }
  }
  // Save: greyed (but still focusable and clickable, as Create not Learn's)
  // while there's nothing to save, "Saving…" while saving, and a pulse each
  // time a new change joins the list. How many changes are waiting is in its
  // tooltip, as there.
  function updateSave() {
    const sv = toolbar.querySelector('[data-action="save"]');
    if (!sv) return;
    const n = changes().length;
    if (n) sv.removeAttribute('aria-disabled'); else sv.setAttribute('aria-disabled', 'true');
    sv.textContent = saveBusy ? 'Saving…' : 'Save';
    sv.dataset.tip = saveTip();
    sv.setAttribute('aria-description', saveTip());
    if (n > lastChangeCount) {
      sv.classList.remove('is-pulsing');
      requestAnimationFrame(() => sv.classList.add('is-pulsing'));
    }
    lastChangeCount = n;
  }
  toolbar.addEventListener('animationend', (e) => { if (e.target.classList) e.target.classList.remove('is-pulsing'); });

  // ---------- Drawing the site ----------

  function siteHTML(pg, mode) {
    const E = mode === 'edit';
    const c = E ? S.draft : S.saved;
    const tab = E ? ' tabindex="0"' : '';
    const tx = (key, tag, cls) => { tag = tag || 'span'; return '<' + tag + ' class="' + (cls || '') + '" data-k="' + key + '"' + tab + '>' + esc(c[key]) + '</' + tag + '>'; };
    const link = (key, to, via, cls) => E
      ? '<span class="' + cls + '" data-k="' + key + '"' + tab + '>' + esc(c[key]) + '</span>'
      : '<a class="' + cls + '" href="#/' + to + '" data-k="' + key + '" data-to="' + to + '" data-via="' + via + '">' + esc(c[key]) + '</a>';
    const button = (key, act, cls, text, submit) => E
      ? '<span class="' + cls + '" data-k="' + key + '"' + tab + '>' + esc(c[key]) + '</span>'
      : '<button type="' + (submit ? 'submit' : 'button') + '" class="' + cls + '" data-k="' + key + '"' + (act ? ' data-act="' + act + '"' : '') + '>' + esc(text != null ? text : c[key]) + '</button>';
    const label = (key, forId) => E
      ? '<span class="cl-label" data-k="' + key + '"' + tab + '>' + esc(c[key]) + '</span>'
      : '<label class="cl-label" for="' + forId + '" data-k="' + key + '">' + esc(c[key]) + '</label>';
    const input = (id, type, extra) => (type === 'textarea'
      ? '<textarea class="cl-input" id="' + id + '" name="' + id + '" rows="4"' + (E ? ' readonly tabindex="-1" aria-hidden="true"' : ' required') + (extra || '') + '></textarea>'
      : '<input class="cl-input" id="' + id + '" name="' + id + '" type="' + type + '"' + (E ? ' readonly tabindex="-1" aria-hidden="true"' : ' required') + (extra || '') + '>');

    const nav = (key, to) => '<li>' + link(key, to, 'menu link', 'cl-nav-link' + (pg === to ? ' is-current' : '')) + '</li>';
    const header =
      '<header class="cl-header" data-section="header" data-name="Header" data-label="Header">' +
        '<div class="cl-wrap cl-header-in">' +
          '<div class="cl-brand">' + PICTURES.logo + link('site-name', 'home', 'site name', 'cl-brand-name') + '</div>' +
          '<nav class="cl-nav" aria-label="Menu"><ul>' + nav('nav-home', 'home') + nav('nav-events', 'events') + nav('nav-contact', 'contact') + '</ul></nav>' +
          button('bookclub', 'bookclub', 'cl-btn cl-btn-dark cl-btn-small') +
        '</div>' +
        (!E && clubOpen ? clubPanel() : '') +
      '</header>';

    let main = '';
    if (pg === 'home') {
      main =
        '<section class="cl-hero" data-section="home-hero" data-name="Hero" data-label="Top of the Home page"><div class="cl-wrap cl-hero-in">' +
          '<div class="cl-hero-text">' + tx('home-kicker', 'p', 'cl-kicker') + tx('home-heading', 'h1', 'cl-h1') +
            '<p class="cl-lede" data-k-near="home-intro-a">' + tx('home-intro-a') + link('home-intro-link', 'events', 'text link', 'cl-inline-link') + tx('home-intro-b') + '</p>' +
            '<p class="cl-actions">' + link('home-cta', 'events', 'button link', 'cl-btn cl-btn-accent') + '</p>' +
          '</div>' +
          '<figure class="cl-hero-art" data-img="Picture of the shop">' + PICTURES.hero + '</figure>' +
        '</div></section>' +
        '<section class="cl-picks" data-section="home-picks" data-name="Book picks" data-label="This month’s picks"><div class="cl-wrap">' +
          tx('picks-heading', 'h2', 'cl-h2') + tx('picks-intro', 'p', 'cl-sub') +
          '<div class="cl-cards">' + [1, 2, 3].map((n) =>
            '<article class="cl-card"><div class="cl-card-art" data-img="Book cover">' + PICTURES['cover' + n] + '</div>' +
            '<div class="cl-card-body">' + tx('pick' + n + '-title', 'h3', 'cl-h3') + tx('pick' + n + '-text', 'p', 'cl-card-text') + '</div></article>').join('') +
          '</div>' +
        '</div></section>' +
        '<section class="cl-cafe" data-section="home-cafe" data-name="Café" data-label="The café corner"><div class="cl-wrap cl-cafe-in">' +
          '<figure class="cl-cafe-art" data-img="Picture of the café">' + PICTURES.cafe + '</figure>' +
          '<div class="cl-cafe-text">' + tx('cafe-heading', 'h2', 'cl-h2') + tx('cafe-text', 'p', 'cl-body') + '</div>' +
        '</div></section>';
    } else if (pg === 'events') {
      main =
        '<section class="cl-pagehead" data-section="events-head" data-name="Intro" data-label="Top of the Events page"><div class="cl-wrap cl-narrow">' +
          tx('events-kicker', 'p', 'cl-kicker') + tx('events-heading', 'h1', 'cl-h1') + tx('events-intro', 'p', 'cl-lede') +
        '</div></section>' +
        '<section class="cl-events" data-section="events-list" data-name="Events" data-label="The list of events"><div class="cl-wrap cl-narrow"><ol class="cl-event-list">' +
          [1, 2, 3].map((n) => {
            const booked = !E && S.booked['ev' + n];
            return '<li class="cl-event' + (booked ? ' is-booked' : '') + '">' +
              '<div class="cl-event-date">' + tx('ev' + n + '-date', 'p') + '</div>' +
              '<div class="cl-event-body">' + tx('ev' + n + '-title', 'h2', 'cl-h3') + tx('ev' + n + '-text', 'p', 'cl-body') + '</div>' +
              '<div class="cl-event-action">' + button('ev' + n + '-btn', 'book:' + n, 'cl-btn ' + (booked ? 'cl-btn-booked' : 'cl-btn-outline'), booked ? 'Place booked ✓' : null) + '</div>' +
            '</li>';
          }).join('') +
        '</ol>' + tx('events-note', 'p', 'cl-body cl-note') + '</div></section>';
    } else {
      const hoursRow = (n) => '<div class="cl-hours-row">' + tx('hours-' + n + '-day', 'dt') + tx('hours-' + n + '-time', 'dd') + '</div>';
      main =
        '<section class="cl-pagehead" data-section="contact-head" data-name="Intro" data-label="Top of the Contact page"><div class="cl-wrap cl-narrow">' +
          tx('contact-kicker', 'p', 'cl-kicker') + tx('contact-heading', 'h1', 'cl-h1') + tx('contact-intro', 'p', 'cl-lede') +
          '<p class="cl-actions">' + link('directions', 'contact#find-us', 'directions link', 'cl-inline-link cl-arrow-link') + '</p>' +
        '</div></section>' +
        '<section class="cl-contact" data-section="contact-main" data-name="Hours and form" data-label="Opening hours and the contact form"><div class="cl-wrap cl-contact-in">' +
          '<div class="cl-panel cl-hours" data-hours>' + tx('hours-heading', 'h2', 'cl-h2') + '<dl>' + [1, 2, 3, 4].map(hoursRow).join('') + '</dl>' +
            '<div class="cl-contact-lines">' + tx('contact-phone', 'p') + tx('contact-email', 'p') + '</div></div>' +
          '<form class="cl-panel cl-form" data-form="contact" novalidate-off>' + tx('form-heading', 'h2', 'cl-h2') +
            '<div class="cl-field">' + label('lbl-name', 'cf-name') + input('cf-name', 'text', ' autocomplete="name"') + '</div>' +
            '<div class="cl-field">' + label('lbl-email', 'cf-email') + input('cf-email', 'email', ' autocomplete="email"') + '</div>' +
            '<div class="cl-field">' + label('lbl-message', 'cf-message') + input('cf-message', 'textarea') + '</div>' +
            '<div class="cl-form-foot">' + button('send-btn', null, 'cl-btn cl-btn-dark', null, true) +
              (!E && S.sent.contact ? '<p class="cl-thanks" tabindex="-1" data-thanks="contact">Thanks, we’ll reply within two days.</p>' : '') + '</div>' +
          '</form>' +
        '</div></section>' +
        '<section class="cl-findus" id="find-us" data-section="contact-findus" data-name="Map" data-label="Finding us"><div class="cl-wrap cl-findus-in">' +
          '<div>' + tx('findus-heading', 'h2', 'cl-h2') + tx('findus-text', 'p', 'cl-body') + '</div>' +
          '<figure class="cl-map-wrap" data-img="Map">' + PICTURES.map + '</figure>' +
        '</div></section>';
    }

    const footer =
      '<footer class="cl-footer" data-section="footer" data-name="Footer" data-label="Footer"><div class="cl-wrap cl-footer-in">' +
        '<div class="cl-footer-col">' + tx('footer-name', 'p', 'cl-footer-name') + tx('footer-address', 'p') + tx('footer-phone', 'p') + tx('footer-open', 'p', 'cl-footer-open') +
          '<p>' + link('footer-find', 'contact', 'footer link', 'cl-footer-link') + '</p></div>' +
        '<form class="cl-footer-col cl-news" data-form="news">' + tx('news-heading', 'h2', 'cl-h4') + tx('news-text', 'p') +
          label('lbl-news', 'nl-email') +
          '<div class="cl-news-row">' + input('nl-email', 'email', ' autocomplete="email"') + button('news-btn', null, 'cl-btn cl-btn-light', null, true) + '</div>' +
          (!E && S.sent.news ? '<p class="cl-thanks" tabindex="-1" data-thanks="news">Thanks, you’re on the list.</p>' : '') +
        '</form>' +
      '</div><div class="cl-wrap">' + tx('footer-copy', 'p', 'cl-copy') + '</div></footer>';

    return header + '<main class="cl-main">' + main + '</main>' + footer;
  }

  // The book club panel, opened by the header's button in browse.
  let clubOpen = !!S.clubOpen;
  function clubPanel() {
    return '<div class="cl-club" role="region" aria-label="Book club"><div class="cl-wrap cl-club-in">' +
      '<div><p class="cl-club-title">The book club</p><p>We meet on the third Thursday of each month, after closing, with tea and a book. Leave your email and we’ll send you the next one.</p></div>' +
      (S.sent.club ? '<p class="cl-thanks" tabindex="-1" data-thanks="club">Lovely. We’ll send you next month’s book.</p>'
        : '<form class="cl-club-form" data-form="club"><label class="cl-label" for="bc-email">Email</label><div class="cl-news-row"><input class="cl-input" id="bc-email" type="email" required autocomplete="email"><button type="submit" class="cl-btn cl-btn-dark">Count me in</button></div></form>') +
      '<button type="button" class="cl-club-close" data-act="club-close" aria-label="Close the book club panel">' + ICONS.close + '</button>' +
    '</div></div>';
  }

  let hoursObserver = null;
  function renderSite() {
    if (hoursObserver) { hoursObserver.disconnect(); hoursObserver = null; }
    editing = null;
    site.classList.toggle('is-edit', S.mode === 'edit');
    site.classList.toggle('is-browse', S.mode !== 'edit');
    site.setAttribute('aria-label', S.mode === 'edit' ? 'Your page, editing: ' + PAGES[page()] : 'Your website: ' + PAGES[page()]);
    site.innerHTML = siteHTML(page(), S.mode);
    if (S.mode === 'browse') {
      for (const f of site.querySelectorAll('.cl-input')) if (S.fields[f.id] != null) f.value = S.fields[f.id];
      for (const a of site.querySelectorAll('a[href]')) a.draggable = false;
    }
    if (S.mode === 'browse' && page() === 'contact') watchHours();
    emit('render', { mode: S.mode, page: page() });
  }

  function renderAll() {
    app.classList.toggle('is-edit', S.mode === 'edit');
    closePicker(false);
    renderToolbar();
    renderSidebar();
    renderSite();
  }

  // ---------- Classifying what was clicked ----------

  // The text a point belongs to: the element itself, or for a paragraph
  // made of several bits (the Home introduction, with its link), its main bit
  // when the point is in the gaps between them.
  function textTarget(el) {
    const k = el.closest('[data-k]');
    if (k) return k;
    const near = el.closest('[data-k-near]');
    return near ? near.querySelector('[data-k="' + near.dataset.kNear + '"]') : null;
  }

  function classify(target) {
    const el = target && target.nodeType === 1 ? target : target && target.parentElement;
    const out = { kind: 'none', el: null, label: '', textEl: null, textLabel: '', section: null, sectionLabel: '' };
    if (!el || !site.contains(el)) return out;
    out.section = el.closest('[data-section]');
    out.sectionLabel = out.section ? out.section.dataset.label : '';
    const textOf = (n) => (n.textContent || '').replace(/\s+/g, ' ').trim();
    const a = el.closest('a[href]');
    const btn = el.closest('button, summary');
    const field = el.closest('input, textarea, select, label');
    if (a) {
      // to: the page the link goes to; samePage: a link to a place further
      // down the page it's on ("Get directions").
      const [toPage, anchor] = String(a.dataset.to || 'home').split('#');
      Object.assign(out, { kind: 'link', el: a, label: textOf(a), to: toPage, toName: PAGES[toPage], samePage: !!anchor && toPage === page() });
    } else if (btn) {
      Object.assign(out, { kind: 'button', el: btn, label: btn.getAttribute('aria-label') || textOf(btn) });
    } else if (field) {
      const lab = field.tagName === 'LABEL' ? field : (field.id && site.querySelector('label[for="' + field.id + '"]'));
      const input = field.tagName === 'LABEL' ? (field.htmlFor && document.getElementById(field.htmlFor)) : field;
      Object.assign(out, { kind: 'field', el: input || field, label: lab ? textOf(lab) : (field.name || 'box') });
      if (lab && lab.dataset.k) { out.textEl = lab; out.textLabel = labelOf(lab.dataset.k); }
      return out;
    }
    const k = textTarget(el);
    if (k) { out.textEl = k; out.textLabel = labelOf(k.dataset.k); }
    if (out.kind === 'none') {
      const img = el.closest('[data-img]');
      out.label = out.textEl ? out.textLabel : img ? img.dataset.img : out.sectionLabel ? 'background of ' + out.sectionLabel : 'the page';
    }
    return out;
  }

  // ---------- Browse: clicks, links, buttons, forms ----------

  const infoByEvent = new WeakMap();
  const bornInBrowse = new WeakSet();
  let suppress = null;
  let lastPointerType = '';
  window.addEventListener('pointerdown', (e) => { lastPointerType = e.pointerType || ''; keyboardLast = false; }, true);
  // A touch that turns into a scroll sends pointercancel and no click: don't
  // leave the suppression waiting for the next real tap.
  window.addEventListener('pointercancel', () => { suppress = null; }, true);
  // Whether the last thing the person did was a key press (for where focus
  // goes after a page change).
  let keyboardLast = false;
  window.addEventListener('keydown', () => { keyboardLast = true; }, true);

  // M4: links stay in this tab. A middle click or auxclick on a site link
  // does nothing (it would open a second copy of this prototype); Ctrl, Cmd
  // or Shift with a click is an ordinary click; and links have no context
  // menu or dragging, so "Open in new tab" isn't offered.
  viewport.addEventListener('auxclick', (e) => {
    const a = e.target.closest && e.target.closest('.vm-site a[href]');
    if (!a) return;
    e.preventDefault();
    if (S.mode === 'browse') note('click', 'Middle-clicked the link ' + quote(a.textContent.trim()) + ' (does nothing here)');
  }, true);
  viewport.addEventListener('mousedown', (e) => { if (e.button === 1 && e.target.closest && e.target.closest('.vm-site a[href]')) e.preventDefault(); }, true);
  viewport.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest('.vm-site a[href]')) e.preventDefault(); }, true);
  viewport.addEventListener('dragstart', (e) => { if (e.target.closest && e.target.closest('.vm-site a[href]')) e.preventDefault(); }, true);

  // Mark pointer events that start in browse, so edit-mode handling ignores
  // the gesture that entered edit mode.
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'dblclick']) {
    viewport.addEventListener(type, (e) => { if (S.mode === 'browse') bornInBrowse.add(e); }, true);
  }

  // The counter, in the capture phase, before any arm sees the click.
  viewport.addEventListener('click', (e) => {
    if (S.mode !== 'browse' || !site.contains(e.target)) return;
    if (suppress && Date.now() < suppress.until) {
      const reason = suppress.reason;
      suppress = null;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (reason) note('arm', reason);
      return;
    }
    suppress = null;
    const info = classify(e.target);
    const sel = window.getSelection();
    info.selecting = !!(sel && !sel.isCollapsed && sel.toString().trim() && site.contains(sel.anchorNode));
    info.counted = false;
    // A double or triple click counts once: its later presses (detail 2, 3)
    // aren't counted or logged, in every arm.
    if (e.detail > 1) {
      // nothing: the first press was counted
    } else if (info.kind === 'none' && !info.selecting) {
      info.counted = true;
      S.stats.nfTotal++;
      if (!S.stats.first) S.stats.nfBefore++;
      note('click', 'Clicked ' + info.label + ' (not a link or button), in browse');
    } else if (info.kind === 'none' && info.selecting) {
      note('click', 'Selected some text in ' + info.label);
    }
    infoByEvent.set(e, info);
  }, true);

  // The default action, in the bubble phase, unless an arm took the click.
  let lastDefaultActionAt = -Infinity;
  viewport.addEventListener('click', (e) => {
    if (!bornInBrowse.has(e) || S.mode !== 'browse' || e.defaultPrevented) return;
    if (!e.target.isConnected || !site.contains(e.target)) return;
    const info = infoByEvent.get(e) || classify(e.target);
    // A double click follows a link or presses a button once, in every arm,
    // as C's box asks once: the second press would land on the new page.
    // Only when the first press of the same double click did act: a first
    // touch that stood in for hover (B) leaves the second free to act.
    const isLinkOrButton = info.kind === 'link' || info.kind === 'button';
    if (isLinkOrButton && e.detail > 1 && e.timeStamp - lastDefaultActionAt < 800) { e.preventDefault(); return; }
    if (isLinkOrButton) lastDefaultActionAt = e.timeStamp;
    if (info.kind === 'link') { e.preventDefault(); follow(info.el, null); }
    else if (info.kind === 'button') {
      if (info.el.type === 'submit') { countUse(info.el, null); return; } // the form's submit does the rest
      e.preventDefault();
      pressButton(info.el, null);
    }
  });

  const fieldNoted = new WeakSet();
  site.addEventListener('focusin', (e) => {
    if (S.mode !== 'browse') return;
    const f = e.target.closest && e.target.closest('input, textarea');
    if (f && !fieldNoted.has(f)) { fieldNoted.add(f); note('use', 'Clicked or tabbed into the box ' + quote(classify(f).label)); }
  });

  // What's typed in the site's boxes is kept, so a reload doesn't lose it.
  site.addEventListener('input', (e) => {
    if (S.mode !== 'browse' || !e.target.matches || !e.target.matches('.cl-input')) return;
    S.fields[e.target.id] = e.target.value;
    persist();
  });

  site.addEventListener('submit', (e) => {
    e.preventDefault();
    if (S.mode !== 'browse') return;
    const form = e.target.dataset.form;
    const THANKS = { news: 'Thanks, you’re on the list.', contact: 'Thanks, we’ll reply within two days.', club: 'Lovely. We’ll send you next month’s book.' };
    if (form === 'news') { S.sent.news = true; note('use', 'Signed up to the newsletter in the footer: “' + THANKS.news + '”'); }
    else if (form === 'contact') { S.sent.contact = true; note('use', 'Sent the contact form: “' + THANKS.contact + '”'); }
    else if (form === 'club') { S.sent.club = true; note('use', 'Joined the book club in its panel'); }
    for (const f of e.target.querySelectorAll('.cl-input')) delete S.fields[f.id];
    persist();
    const top = viewport.scrollTop;
    renderSite();
    viewport.scrollTop = top;
    const thanks = site.querySelector('[data-thanks="' + form + '"]');
    if (thanks) thanks.focus({ preventScroll: true });
    if (THANKS[form]) announce(THANKS[form]);
  });

  const linkLabel = (a) => quote((a.textContent || '').trim());
  function follow(a, via) {
    const to = a.dataset.to || 'home';
    const viaText = via ? ', via the ' + via : '';
    S.stats.follows++;
    if (via) S.stats.followsVia++;
    const key = a.dataset.k;
    if (key && key.startsWith('nav-') && !S.menuFollowed[to]) S.menuFollowed[to] = Math.round(now() * 10) / 10;
    if (to.includes('#')) {
      note('use', 'Followed the link ' + linkLabel(a) + ' (' + a.dataset.via + viaText + ')');
      const [pg, anchor] = to.split('#');
      if (pg !== page()) go(pg, a.dataset.via);
      const target = site.querySelector('#' + anchor);
      if (target) viewport.scrollTo({ top: target.offsetTop - 8, behavior: 'smooth' });
      checkTasks();
      return;
    }
    note('use', 'Followed the link ' + linkLabel(a) + ' (' + a.dataset.via + viaText + ') to ' + PAGES[to]);
    go(to, a.dataset.via, true);
    checkTasks();
  }

  function countUse(btn, via) {
    S.stats.uses++;
    if (via) S.stats.usesVia++;
    note('use', 'Used the button ' + quote(btn.getAttribute('aria-label') || btn.textContent.trim()) + (via ? ' via the ' + via : ''));
  }

  function pressButton(btn, via) {
    countUse(btn, via);
    const act = btn.dataset.act || '';
    const top = viewport.scrollTop;
    if (act === 'bookclub') { clubOpen = !clubOpen; S.clubOpen = clubOpen; persist(); renderSite(); viewport.scrollTop = top; if (clubOpen) { const f = site.querySelector('#bc-email'); if (f) f.focus({ preventScroll: true }); } }
    else if (act === 'club-close') { clubOpen = false; S.clubOpen = false; persist(); renderSite(); viewport.scrollTop = top; const b = site.querySelector('[data-act="bookclub"]'); if (b) b.focus({ preventScroll: true }); }
    else if (act.startsWith('book:')) {
      const n = act.split(':')[1];
      S.booked['ev' + n] = !S.booked['ev' + n];
      persist();
      renderSite();
      viewport.scrollTop = top;
      const b = site.querySelector('[data-act="book:' + n + '"]');
      if (b) b.focus({ preventScroll: true });
    }
  }

  // perform(): what a browse click would do, without sending a click.
  function perform(target, opts) {
    opts = opts || {};
    if (S.mode !== 'browse') return false;
    const info = classify(target);
    const via = opts.via || null;
    if (info.kind === 'link') { follow(info.el, via); return true; }
    if (info.kind === 'button') {
      if (info.el.type === 'submit' && info.el.form) {
        countUse(info.el, via);
        if (info.el.form.reportValidity()) info.el.form.requestSubmit(info.el);
        return true;
      }
      pressButton(info.el, via);
      return true;
    }
    if (info.kind === 'field') {
      fieldNoted.add(info.el);
      info.el.focus();
      note('use', 'Went into the box ' + quote(info.label) + (via ? ' via the ' + via : ''));
      return true;
    }
    return false;
  }

  // ---------- Pages and history ----------

  function go(to, route, isLink) {
    const from = page();
    if (to === from) {
      if (isLink) { viewport.scrollTo({ top: 0 }); }
      return;
    }
    if (S.mode === 'edit') commitEditing();
    S.hist.stack = S.hist.stack.slice(0, S.hist.i + 1);
    S.hist.stack.push(to);
    S.hist.i = S.hist.stack.length - 1;
    switched(from, route);
  }
  function switched(from, route) {
    S.stats.pages++;
    clubOpen = false;
    note('page', 'Went to ' + PAGES[page()] + ' from ' + PAGES[from] + ' (' + route + (S.mode === 'edit' ? ', while editing' : '') + ')');
    renderAll();
    viewport.scrollTop = 0;
    S.scroll[S.mode] = 0;
    persist();
    settleFocus();
    emit('pagechange', { page: page(), from, route });
  }
  // After a page change, focus mustn't fall to the page's body. If it's in
  // the toolbar (the arrows, the page list) it stays there. Otherwise, after
  // a key press while browsing, it goes to the new page's main heading;
  // after a click, to the site area, without scrolling.
  function settleFocus() {
    const a = document.activeElement;
    if (a && a !== document.body && a.isConnected && (toolbar.contains(a) || layer.contains(a))) return;
    const h1 = site.querySelector('h1');
    if (keyboardLast && S.mode === 'browse' && h1) {
      // Focusable only while it has focus, so clicks on it don't focus it.
      h1.tabIndex = -1;
      h1.addEventListener('blur', () => { if (S.mode === 'browse') h1.removeAttribute('tabindex'); }, { once: true });
      h1.focus({ preventScroll: true });
    }
    else if (keyboardLast && S.mode === 'edit') { const b = toolbar.querySelector('[data-action="pages"]'); if (b) b.focus({ preventScroll: true }); }
    else viewport.focus({ preventScroll: true });
  }

  function historyStep(d) {
    const i = S.hist.i + d;
    if (i < 0 || i >= S.hist.stack.length) return;
    const from = page();
    S.hist.i = i;
    if (page() === from) { renderToolbar(); persist(); return; }
    switched(from, d < 0 ? 'back arrow' : 'forward arrow');
  }

  // ---------- The page finder and the toolbar's menus ----------

  /*
   * The page's name in the toolbar turns into Create not Learn's page finder
   * when clicked: a "Go to page…" field over the bar, with the site's main
   * pages under it and Add a page and Manage pages at its foot. Typing narrows
   * the list; the arrow keys and Enter pick; Escape closes it. Only one of the
   * finder and the menus (Page options, View) is open at a time: `picker`.
   */
  let picker = null;
  function closePicker(refocus) {
    if (!picker) return;
    const p = picker;
    picker = null;
    p.el.remove();
    if (p.btn) p.btn.setAttribute('aria-expanded', 'false');
    if (refocus) {
      const b = toolbar.querySelector('[data-action="' + p.action + '"]');
      if (b) b.focus();
    }
  }
  document.addEventListener('pointerdown', (e) => {
    if (picker && !picker.el.contains(e.target) && !(e.target.closest && e.target.closest('[data-action="' + picker.action + '"]'))) closePicker(false);
  }, true);

  function openFinder(btn) {
    closePicker(false);
    const el = document.createElement('div');
    el.className = 'vm-finder';
    el.innerHTML = '<div class="vm-finder-field">' + ICONS.search + '<input type="text" role="combobox" aria-expanded="true" aria-controls="vm-finder-list" aria-label="Find or go to any page" placeholder="Go to page…" autocomplete="off"></div>' +
      '<p class="vm-finder-heading" id="vm-finder-heading">Main pages</p><ul class="vm-finder-list" id="vm-finder-list" role="listbox" aria-labelledby="vm-finder-heading"></ul>' +
      '<div class="vm-finder-foot"><button type="button" data-finder="add">Add a page' + ICONS.plus + '</button><button type="button" data-finder="manage">Manage pages' + ICONS.pages + '</button></div>';
    document.body.append(el);
    const bar = btn.closest('.vm-switcher') || btn;
    const r = bar.getBoundingClientRect();
    const w = Math.max(r.width, 320);
    el.style.left = Math.round(Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    el.style.top = Math.round(r.top) + 'px';
    el.style.width = Math.round(w) + 'px';
    picker = { el, btn, action: 'pages' };
    btn.setAttribute('aria-expanded', 'true');
    const input = el.querySelector('input');
    const list = el.querySelector('ul');
    let active = 0;
    let shown = PAGE_IDS.slice();
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      shown = PAGE_IDS.filter((id) => !q || PAGES[id].toLowerCase().includes(q) || (id === 'home' && 'homepage'.includes(q)));
      active = Math.min(active, Math.max(0, shown.length - 1));
      list.innerHTML = shown.length ? shown.map((id, i) => '<li role="option" id="vm-finder-' + id + '" data-page="' + id + '" aria-selected="' + (i === active) + '" class="' + (i === active ? 'is-active' : '') + (id === page() ? ' is-current' : '') + '">' +
        '<span>' + PAGES[id] + '</span>' + (id === 'home' ? '<span class="vm-finder-role">(Homepage)</span>' : '') + '</li>').join('') : '<li class="vm-finder-empty">No pages found.</li>';
      input.setAttribute('aria-activedescendant', shown.length ? 'vm-finder-' + shown[active] : '');
    };
    const pick = (id) => {
      closePicker(true);
      if (id !== page()) go(id, 'the page finder');
      else note('page', 'Picked ' + PAGES[id] + ' in the page finder (already on show)');
    };
    draw();
    input.focus();
    input.addEventListener('input', () => { active = 0; draw(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(1, shown.length); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active + Math.max(1, shown.length) - 1) % Math.max(1, shown.length); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) pick(shown[active]); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePicker(true); }
    });
    el.addEventListener('mousemove', (e) => {
      const li = e.target.closest('[data-page]');
      if (li) { const i = shown.indexOf(li.dataset.page); if (i !== active) { active = i; draw(); } }
    });
    el.addEventListener('click', (e) => {
      const li = e.target.closest('[data-page]');
      if (li) { pick(li.dataset.page); return; }
      const f = e.target.closest('[data-finder]');
      if (!f) return;
      if (f.dataset.finder === 'manage' && S.mode === 'browse') {
        closePicker(false);
        openScreen('pages', 'Page finder, Manage pages');
        return;
      }
      closePicker(true);
      tried(f.dataset.finder === 'add' ? 'the page finder’s Add a page' : 'the page finder’s Manage pages (while editing)');
    });
    // Presses in the list keep focus in the field, so the list stays put.
    el.addEventListener('mousedown', (e) => { if (e.target !== input) e.preventDefault(); });
    el.addEventListener('focusout', (e) => { if (picker && picker.el === el && !el.contains(e.relatedTarget)) closePicker(false); });
  }

  // A small menu under a toolbar button. items: { label, desc, icon,
  // checked, pick } or null for a line between groups.
  function openMenu(btn, action, items, label) {
    closePicker(false);
    const el = document.createElement('div');
    el.className = 'vm-menu';
    el.setAttribute('role', 'menu');
    el.setAttribute('aria-label', label);
    el.innerHTML = items.map((it, i) => it ? '<button type="button" role="' + (it.checked != null ? 'menuitemradio' : 'menuitem') + '"' + (it.checked != null ? ' aria-checked="' + it.checked + '"' : '') + ' data-i="' + i + '">' +
      (it.icon ? ICONS[it.icon] : '') + '<span class="vm-menu-text"><span>' + it.label + '</span>' + (it.desc ? '<small>' + it.desc + '</small>' : '') + '</span>' + (it.checked ? '<span class="vm-menu-check">' + ICONS.check + '</span>' : '') + '</button>'
      : '<hr>').join('');
    document.body.append(el);
    const r = btn.getBoundingClientRect();
    const w = el.offsetWidth;
    el.style.top = Math.round(r.bottom + 4) + 'px';
    el.style.left = Math.round(Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))) + 'px';
    picker = { el, btn, action };
    btn.setAttribute('aria-expanded', 'true');
    const buttons = [...el.querySelectorAll('button')];
    buttons[0].focus();
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const it = items[Number(b.dataset.i)];
      closePicker(true);
      it.pick();
    });
    el.addEventListener('keydown', (e) => {
      const i = buttons.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(i + 1) % buttons.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(i + buttons.length - 1) % buttons.length].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePicker(true); }
      else if (e.key === 'Tab') closePicker(false);
    });
  }

  // Drawn but not built: logged, and counted in the notes.
  function tried(what) {
    S.stats.tried++;
    note('tried', 'Tried ' + what);
  }

  function pageOptions(btn) {
    openMenu(btn, 'page-options', [{
      label: 'Manage homepage', icon: 'settings',
      pick: () => {
        if (S.mode === 'browse') openScreen('pages', 'Toolbar, Page options, Manage homepage');
        else tried('Page options, Manage homepage (while editing)');
      }
    }], 'Page options');
  }
  function viewMenu(btn) {
    const dev = (label, desc) => ({ label, desc, checked: label === 'Desktop', pick: () => (label === 'Desktop' ? note('tried', 'View: Desktop (already)') : tried('View, ' + label)) });
    openMenu(btn, 'view', [dev('Desktop', 'How it looks on a computer.'), dev('Tablet', 'How it looks on a tablet.'), dev('Mobile', 'How it looks on a phone.'), null,
      { label: 'Open in a new tab', pick: () => tried('View, Open in a new tab') },
      { label: 'Open in advanced editor', pick: () => tried('View, Open in advanced editor') }], 'View');
  }

  zoom.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (!b) return;
    tried(b.dataset.tool === 'zoom-in' ? 'Zoom in (greyed out)' : 'Zoom out to arrange sections (bottom right)');
  });

  // ---------- Edit mode: changing text ----------

  let editing = null; // { el, key, before }
  let selectedBox = null;
  const supportsPlain = (() => { const d = document.createElement('div'); try { d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only'; } catch (err) { return false; } })();

  function clearSelected() {
    for (const el of site.querySelectorAll('.is-selected')) el.classList.remove('is-selected');
    selectedBox = null;
    markSection();
  }
  function selectBox(el) {
    commitEditing();
    clearSelected();
    if (!el) return;
    el.classList.add('is-selected');
    selectedBox = el;
    markSection();
  }
  // Create not Learn's look for what's being worked on: the section around
  // it outlined, with its name in a tab (data-name). Nothing in it can be
  // clicked; Create not Learn's section toolbar isn't drawn.
  function markSection() {
    const cur = (editing && editing.el) || site.querySelector('.is-selected');
    const sec = cur ? cur.closest('[data-section]') : null;
    for (const el of site.querySelectorAll('.vm-section-focus')) if (el !== sec) el.classList.remove('vm-section-focus');
    if (sec) sec.classList.add('vm-section-focus');
  }

  function beginEditing(el) {
    if (editing && editing.el === el) return;
    commitEditing();
    clearSelected();
    el.contentEditable = supportsPlain ? 'plaintext-only' : 'true';
    el.setAttribute('role', 'textbox');
    el.setAttribute('aria-label', labelOf(el.dataset.k));
    el.spellcheck = false;
    el.classList.add('is-selected', 'is-editing');
    editing = { el, key: el.dataset.k, before: S.draft[el.dataset.k], sid: ++S.sid };
    markSection();
    // Kept so a reload in the middle of typing can still log the edit.
    S.pending = { key: editing.key, before: editing.before };
    persist();
  }

  function commitEditing(opts) {
    if (!editing) return;
    const { el, key, before } = editing;
    editing = null;
    S.pending = null;
    let text = el.textContent.replace(/\s+/g, ' ');
    if (!text.trim()) {
      text = before;
      el.textContent = before;
      S.draft[key] = before;
      note('edit', 'Emptied ' + labelOf(key) + ' and it was put back');
    } else if (text !== S.draft[key]) {
      S.draft[key] = text;
    }
    el.removeAttribute('contenteditable');
    el.removeAttribute('role');
    el.removeAttribute('aria-label');
    el.classList.remove('is-editing');
    if (!(opts && opts.keepSelected)) el.classList.remove('is-selected');
    else selectedBox = el;
    markSection();
    if (S.draft[key] !== before) {
      S.stats.edits++;
      if (S.visit) S.visit.changed = true;
      note('edit', 'Changed ' + labelOf(key) + ' (' + pageOfKey(key) + '): ' + quote(before) + ' → ' + quote(S.draft[key]));
    }
    persist();
    renderToolbar();
  }

  // Typing goes through here. Undo steps are merged while typing in one bit
  // of text (one step per editing spell of that element, split by undo).
  function recordInput(key, prev, value) {
    const top = S.undo[S.undo.length - 1];
    if (top && top.sid === editing.sid && top.key === key) top.after = value;
    else S.undo.push({ key, before: prev, after: value, sid: editing.sid });
    S.redo = [];
    if (value !== S.saved[key]) {
      S.ui.allSaved = false;
      if (S.stats.firstUnsavedT == null) S.stats.firstUnsavedT = Math.round(now() * 10) / 10;
    }
    S.draft[key] = value;
    persist();
  }

  function caretOffsetAt(el, x, y) {
    if (x == null || y == null) return null;
    const vis = layer.style.visibility;
    layer.style.visibility = 'hidden';
    let node = null, off = 0;
    try {
      if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (r) { node = r.startContainer; off = r.startOffset; } }
      else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { node = p.offsetNode; off = p.offset; } }
    } finally { layer.style.visibility = vis; }
    if (!node || !el.contains(node)) return null;
    const r = document.createRange();
    r.selectNodeContents(el);
    r.setEnd(node, off);
    return r.toString().length;
  }
  function placeCaretAtOffset(el, offset) {
    el.focus({ preventScroll: true });
    const range = document.createRange();
    const node = el.firstChild;
    if (node && node.nodeType === 3 && offset != null) range.setStart(node, Math.min(offset, node.length));
    else { range.selectNodeContents(el); range.collapse(false); }
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  function caretInside(el) {
    const sel = window.getSelection();
    return sel && sel.rangeCount && el.contains(sel.anchorNode);
  }

  // Pointer: make the text editable as the press starts, so the browser puts
  // the caret where the person pressed.
  viewport.addEventListener('pointerdown', (e) => {
    if (S.mode !== 'edit' || bornInBrowse.has(e) || !site.contains(e.target)) return;
    if (e.button !== 0) return;
    const k = textTarget(e.target);
    if (k) {
      beginEditing(k);
      if (!k.contains(e.target)) { e.preventDefault(); placeCaretAtOffset(k, null); }
      return;
    }
    e.preventDefault();
    const img = e.target.closest('[data-img]');
    const section = e.target.closest('[data-section]');
    if (img) { selectBox(img); note('edit', 'Clicked ' + img.dataset.img + ' while editing (pictures can’t be changed here)'); }
    else selectBox(section);
    if (document.activeElement && site.contains(document.activeElement)) document.activeElement.blur();
  });
  viewport.addEventListener('click', (e) => {
    if (S.mode !== 'edit' || bornInBrowse.has(e) || !site.contains(e.target)) return;
    e.preventDefault();
    const k = e.target.closest('[data-k]');
    if (k && editing && editing.el === k && !caretInside(k)) placeCaretAtOffset(k, caretOffsetAt(k, e.clientX, e.clientY));
  });
  site.addEventListener('focusin', (e) => {
    if (S.mode !== 'edit') return;
    const k = e.target.closest && e.target.closest('[data-k]');
    if (k && !(editing && editing.el === k) && !k.classList.contains('is-selected')) { beginEditing(k); placeCaretAtOffset(k, null); }
  });
  site.addEventListener('focusout', (e) => {
    if (S.mode !== 'edit' || !editing || e.target !== editing.el) return;
    if (e.relatedTarget && editing.el.contains(e.relatedTarget)) return;
    commitEditing();
  });
  site.addEventListener('input', (e) => {
    if (S.mode !== 'edit' || !editing || e.target !== editing.el) return;
    const text = editing.el.textContent.replace(/[\r\n]+/g, ' ');
    if (text !== editing.el.textContent) { editing.el.textContent = text; placeCaretAtOffset(editing.el, null); }
    recordInput(editing.key, S.draft[editing.key], text);
    renderToolbar();
  });
  site.addEventListener('paste', (e) => {
    if (S.mode !== 'edit' || !editing) return;
    e.preventDefault();
    const text = (e.clipboardData ? e.clipboardData.getData('text/plain') : '').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  });
  site.addEventListener('dragstart', (e) => { if (S.mode === 'edit') e.preventDefault(); });
  site.addEventListener('drop', (e) => { if (S.mode === 'edit') e.preventDefault(); });

  site.addEventListener('keydown', (e) => {
    if (S.mode !== 'edit') return;
    const k = e.target.closest && e.target.closest('[data-k]');
    if (!k) return;
    if (editing && editing.el === k) {
      if (e.key === 'Enter') { e.preventDefault(); commitEditing({ keepSelected: true }); k.focus({ preventScroll: true }); }
      else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        const { key, before } = editing;
        const was = S.draft[key];
        if (was !== before) {
          S.undo.push({ key, before: was, after: before, sid: editing.sid });
          S.redo = [];
          S.draft[key] = before;
        }
        k.textContent = before;
        editing.before = before;
        S.stats.escapes++;
        note('edit', 'Pressed Escape in ' + labelOf(key) + (was !== before ? ': put back ' + quote(before) : ''));
        commitEditing({ keepSelected: true });
        k.focus({ preventScroll: true });
      }
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      beginEditing(k);
      placeCaretAtOffset(k, null);
    }
  });

  function applyText(key, value) {
    S.draft[key] = value;
    for (const el of site.querySelectorAll('[data-k="' + key + '"]')) {
      el.textContent = value;
      if (editing && editing.el === el) placeCaretAtOffset(el, null);
    }
  }
  function undo() {
    const top = S.undo.pop();
    if (!top) return;
    if (editing && editing.key !== top.key) commitEditing();
    applyText(top.key, top.before);
    if (editing) editing.sid = ++S.sid;
    S.redo.push(top);
    S.stats.undos++;
    if (S.visit) S.visit.changed = true;
    note('undo', 'Undo: ' + labelOf(top.key) + ' back to ' + quote(top.before));
    persist();
    renderToolbar();
  }
  function redo() {
    const top = S.redo.pop();
    if (!top) return;
    if (editing && editing.key !== top.key) commitEditing();
    applyText(top.key, top.after);
    if (editing) editing.sid = ++S.sid;
    S.undo.push(top);
    S.stats.redos++;
    if (S.visit) S.visit.changed = true;
    note('undo', 'Redo: ' + labelOf(top.key) + ' to ' + quote(top.after));
    persist();
    renderToolbar();
  }

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  // Ctrl/Cmd+S is always caught, so the browser's "Save page as" never opens.
  window.addEventListener('keydown', (e) => {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (!mod || e.altKey || e.key.toLowerCase() !== 's') return;
    e.preventDefault();
    e.stopPropagation();
    keySave();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (S.mode !== 'edit' || document.querySelector('dialog[open]')) return;
    const mod = isMac ? e.metaKey : e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if (mod && key === 'y') { e.preventDefault(); redo(); }
    else if (e.key === 'Escape' && !editing && selectedBox) { clearSelected(); }
  });

  // ---------- Entering and leaving edit mode ----------

  // The element at the top of the viewport, to keep in place across the
  // change of width when the sidebar goes or comes back.
  function scrollAnchor(prefer) {
    const vr = viewport.getBoundingClientRect();
    let el = prefer && prefer.isConnected ? prefer : null;
    if (!el) el = [...site.querySelectorAll('[data-section]')].find((s) => s.getBoundingClientRect().bottom > vr.top + 1) || null;
    if (!el) return null;
    const sel = el.dataset.k ? '[data-k="' + el.dataset.k + '"]' : el.dataset.section ? '[data-section="' + el.dataset.section + '"]' : null;
    return sel ? { sel, top: el.getBoundingClientRect().top - vr.top } : null;
  }
  function restoreAnchor(a) {
    if (!a) return;
    const el = site.querySelector(a.sel);
    if (!el) return;
    const vr = viewport.getBoundingClientRect();
    viewport.scrollTop += el.getBoundingClientRect().top - vr.top - a.top;
  }

  function enterEdit(route, opts) {
    opts = opts || {};
    if (S.mode === 'edit') return { landed: 'nothing', label: '' };
    if (!ROUTES[route]) ROUTES[route] = { label: route, core: false };
    closePicker(false);
    const info = opts.target ? classify(opts.target) : null;
    let landing = { landed: 'nothing', label: '' };
    let offset = null, key = null, sectionId = null;
    if (info && info.textEl) {
      key = info.textEl.dataset.k;
      offset = caretOffsetAt(info.textEl, opts.x, opts.y);
      landing = { landed: 'text', label: labelOf(key) };
    } else if (info && info.section) {
      sectionId = info.section.dataset.section;
      landing = { landed: 'section', label: info.section.dataset.label };
    }
    const anchor = scrollAnchor(info ? info.textEl || info.section : null);
    S.scroll.browse = viewport.scrollTop;
    S.mode = 'edit';
    S.stats.entries++;
    S.stats.byRoute[route] = (S.stats.byRoute[route] || 0) + 1;
    S.visit = { route, t: Math.round(now() * 10) / 10, changed: false, page: page() };
    const firstTime = !S.stats.first;
    if (firstTime) S.stats.first = { t: Math.round(now() * 10) / 10, route, core: !!ROUTES[route].core };
    clubOpen = false;
    renderAll();
    restoreAnchor(anchor);
    if (key) {
      const el = site.querySelector('[data-k="' + key + '"]');
      if (el) { beginEditing(el); placeCaretAtOffset(el, offset); }
    } else if (sectionId) {
      selectBox(site.querySelector('[data-section="' + sectionId + '"]'));
      viewport.focus({ preventScroll: true });
    } else {
      viewport.focus({ preventScroll: true });
    }
    S.scroll.edit = viewport.scrollTop;
    note('mode', 'Entered edit mode on ' + PAGES[page()] + ' by ' + ROUTES[route].label + '. Ready: ' + (landing.landed === 'nothing' ? 'nothing selected' : landing.landed === 'section' ? 'the section ' + quote(landing.label) + ' outlined' : landing.label + (offset != null ? ', caret where clicked' : ', caret at the end')) + (firstTime ? ' (first time, ' + S.stats.first.t.toFixed(1) + ' s after first open)' : ''));
    announce('Editing ' + PAGES[page()] + '. Choose any words on the page to change them.');
    emit('modechange', { mode: 'edit', route, label: ROUTES[route].label });
    return landing;
  }

  // saved: what to log for "saved", worked out by the caller before any
  // discarding ('yes', 'no', 'some'), or left to work out here.
  function leaveEdit(choice, saved) {
    const visit = S.visit || { changed: false };
    S.scroll.edit = viewport.scrollTop;
    const anchor = scrollAnchor(null);
    S.mode = 'browse';
    S.stats.exits++;
    if (!visit.changed) S.stats.accidental++;
    const savedText = saved || (hasUnsaved() ? (visit.saved ? 'some' : 'no') : 'yes');
    note('mode', 'Left edit mode by Exit, on ' + PAGES[page()] + '. Changes in this visit: ' + (visit.changed ? 'yes' : 'no') + '; saved: ' + (visit.changed ? savedText : '–') + '; dialog: ' + (choice || 'not shown') + (visit.changed ? '' : '. Counted as an accidental entry'));
    S.visit = null;
    S.undo = []; S.redo = [];
    S.spell = { id: S.spell.id + 1, data: {} };
    renderAll();
    restoreAnchor(anchor);
    S.scroll.browse = viewport.scrollTop;
    persist();
    const btn = toolbar.querySelector('[data-action="edit"]');
    if (btn) btn.focus({ preventScroll: true });
    emit('modechange', { mode: 'browse', route: 'exit', label: 'Exit' });
    emit('spellstart', { id: S.spell.id });
    checkTasks();
  }

  // ---------- Saving: Save, Review changes, Ctrl+S, the Exit dialog ----------

  /*
   * As Create not Learn: Save opens "Review changes", which lists what's
   * waiting (site-wide changes first, then page changes), each with Discard,
   * and saves them with "Save 1 change". Ctrl/Cmd+S saves straight away, as
   * the editor's own shortcut does. The Exit dialog's Save saves too. Each
   * save records how it was made: t (the toolbar's Save), k (the keyboard),
   * d (the Exit dialog).
   */
  // Ctrl/Cmd+S: in edit mode it saves (k), also from Review changes or the
  // Exit dialog (where it does what their Save does, and leaves with the
  // Exit dialog's); elsewhere it does nothing but is logged.
  function keySave() {
    const open = document.querySelector('dialog[open]');
    if (open && open === reviewDialog) {
      if (!hasUnsaved()) return;
      note('save', 'Pressed ' + SAVE_KEYS + ' in Review changes');
      setReviewOpen(false);
      reviewDialog.close();
      save('k');
      restoreFocusToToolbar();
      return;
    }
    if (open && open === exitDialog) {
      note('save', 'Pressed ' + SAVE_KEYS + ' in the Exit dialog');
      exitDialog.close();
      save('k');
      leaveEdit('Save, by ' + SAVE_KEYS, 'yes');
      return;
    }
    if (open) { note('save', 'Pressed ' + SAVE_KEYS + ' with a dialog open (nothing happens)'); return; }
    if (S.mode !== 'edit') { note('save', 'Pressed ' + SAVE_KEYS + ' while browsing (nothing happens)'); return; }
    commitEditing({ keepSelected: !!editing });
    if (!save('k')) note('save', 'Pressed ' + SAVE_KEYS + ' with nothing to save');
  }

  function save(how) {
    if (S.mode !== 'edit') return false;
    if (!hasUnsaved()) return false;
    const list = changes();
    S.saved = deepCopy(S.draft);
    S.stats.saves++;
    if (how === 'd') S.stats.savesDialog++;
    if (!S.stats.firstSave) S.stats.firstSave = { t: Math.round(now() * 10) / 10, how };
    if (S.visit) S.visit.saved = true;
    S.ui.allSaved = true;
    note('save', 'Saved ' + plural(list.length, 'change', 'changes') + ' (' + list.map((id) => ENTITIES[id].label).join(', ') + ') by ' + { t: 'the toolbar’s Save, in Review changes', k: SAVE_KEYS, d: 'Save in the Exit dialog' }[how]);
    persist();
    saveBusy = true;
    renderToolbar();
    setTimeout(() => { saveBusy = false; if (S.mode === 'edit') renderToolbar(); }, 400);
    announce('All changes saved');
    checkTasks();
    return true;
  }

  function discardEntity(id) {
    for (const k of Object.keys(S.draft)) if (entityOf(k) === id) S.draft[k] = S.saved[k];
    S.undo = S.undo.filter((u) => entityOf(u.key) !== id);
    S.redo = S.redo.filter((u) => entityOf(u.key) !== id);
  }
  function redrawKeepingScroll() {
    const top = viewport.scrollTop;
    renderSite();
    viewport.scrollTop = top;
    renderToolbar();
  }

  let reviewDialog = null;
  function openReview() {
    commitEditing();
    if (!hasUnsaved()) {
      S.stats.saveGrey++;
      note('save', 'Clicked Save while it was greyed out (nothing to save)');
      return;
    }
    S.stats.reviews++;
    note('save', 'Clicked Save: Review changes opened (' + changes().map((id) => ENTITIES[id].label).join(', ') + ')');
    if (!reviewDialog) {
      reviewDialog = document.createElement('dialog');
      reviewDialog.className = 'vm-dialog vm-review';
      reviewDialog.setAttribute('aria-labelledby', 'vm-review-title');
      document.body.append(reviewDialog);
      reviewDialog.addEventListener('cancel', (e) => { e.preventDefault(); closeReview('Escape'); });
      reviewDialog.addEventListener('click', (e) => {
        if (e.target === reviewDialog) { closeReview('a click outside'); return; }
        const b = e.target.closest('[data-review]');
        if (!b) return;
        const what = b.dataset.review;
        if (what === 'cancel' || what === 'close') closeReview(what === 'cancel' ? 'Cancel' : '×');
        else if (what === 'save') { setReviewOpen(false); reviewDialog.close(); save('t'); restoreFocusToToolbar(); }
        else if (what === 'discard') {
          const id = b.dataset.entity;
          discardEntity(id);
          note('save', 'Review changes: discarded the change to ' + ENTITIES[id].label);
          S.stats.discards++;
          persist();
          redrawKeepingScroll();
          if (!hasUnsaved()) { setReviewOpen(false); reviewDialog.close(); restoreFocusToToolbar(); } else { drawReview(); reviewDialog.querySelector('[data-review="close"]').focus(); }
        } else if (what === 'discard-all') drawReview(true);
        else if (what === 'keep') { drawReview(); reviewDialog.querySelector('[data-review="close"]').focus(); }
        else if (what === 'discard-all-sure') {
          const n = changes().length;
          S.draft = deepCopy(S.saved);
          S.undo = []; S.redo = [];
          S.stats.discards += n;
          note('save', 'Review changes: Discard all (' + plural(n, 'change', 'changes') + ' thrown away)');
          setReviewOpen(false);
          reviewDialog.close();
          redrawKeepingScroll();
          restoreFocusToToolbar();
          snackbar('Changes discarded.');
        }
      });
    }
    drawReview();
    reviewDialog.showModal();
    setReviewOpen(true);
    // As core's Modal: focus starts on its first control, the × in its
    // header, so Enter doesn't save at once.
    reviewDialog.querySelector('[data-review="close"]').focus();
  }
  // Kept, so a reload with it open is counted as closed without saving.
  function setReviewOpen(on) { S.ui.reviewOpen = on; persist(); }
  function restoreFocusToToolbar() {
    const b = toolbar.querySelector('[data-action="save"]');
    if (b) b.focus();
  }
  function closeReview(how) {
    setReviewOpen(false);
    S.stats.reviewsCancelled++;
    note('save', 'Review changes closed without saving (' + how + ')');
    reviewDialog.close();
    restoreFocusToToolbar();
  }
  function drawReview(confirming) {
    const list = changes();
    const n = list.length;
    const close = '<button type="button" class="vm-dialog-close" data-review="close" aria-label="Close">' + ICONS.close + '</button>';
    if (confirming) {
      reviewDialog.innerHTML = close + '<h2 id="vm-review-title">Discard changes?</h2><p>' +
        (n === 1 ? 'Your 1 unsaved change will be lost, and your site goes back to how visitors see it now. This can’t be undone.'
          : 'All ' + n + ' unsaved changes will be lost, and your site goes back to how visitors see it now. This can’t be undone.') + '</p>' +
        '<div class="vm-dialog-actions"><button type="button" class="vm-btn vm-btn-tertiary" data-review="keep">Keep changes</button><button type="button" class="vm-btn vm-btn-destructive" data-review="discard-all-sure">Discard changes</button></div>';
      reviewDialog.querySelector('[data-review="keep"]').focus();
      return;
    }
    const group = (siteWide) => {
      const items = list.filter((id) => !!ENTITIES[id].siteWide === siteWide);
      if (!items.length) return '';
      return '<section class="vm-review-group' + (siteWide ? ' is-site-wide' : '') + '"><div class="vm-review-group-head">' + (siteWide ? ICONS.globe : ICONS.page) +
        '<div><h3>' + (siteWide ? 'Site-wide changes' : 'Page changes') + '<span class="vm-review-count">' + items.length + '</span></h3>' +
        '<p>' + (siteWide ? 'These change every page of your site.' : 'These change only the page or post they were made on.') + '</p></div></div>' +
        '<ul>' + items.map((id) => '<li><div><strong>' + ENTITIES[id].label + '</strong><span>' + ENTITIES[id].detail + '</span></div>' +
          '<button type="button" class="vm-btn vm-btn-tertiary vm-btn-small' + (siteWide ? ' is-site-wide' : '') + '" data-review="discard" data-entity="' + id + '" aria-label="Discard change to ' + ENTITIES[id].label + '">Discard</button></li>').join('') + '</ul></section>';
    };
    reviewDialog.innerHTML = close + '<h2 id="vm-review-title">Review changes</h2>' +
      '<p>Visitors see these once you save them. Discard any you don’t want to keep.</p>' +
      '<div class="vm-review-groups">' + group(true) + group(false) + '</div>' +
      '<div class="vm-dialog-actions vm-review-foot"><button type="button" class="vm-btn vm-btn-tertiary vm-btn-danger" data-review="discard-all">Discard all</button><span></span>' +
        '<button type="button" class="vm-btn vm-btn-tertiary" data-review="cancel">Cancel</button><button type="button" class="vm-btn vm-btn-primary" data-review="save">Save ' + plural(n, 'change', 'changes') + '</button></div>';
  }

  // Core's snackbar, at the foot of the canvas, for a few seconds.
  let snackTimer = null;
  function snackbar(text) {
    let el = app.querySelector('.vm-snackbar');
    if (!el) { el = document.createElement('div'); el.className = 'vm-snackbar'; el.setAttribute('role', 'status'); app.querySelector('.vm-stage').append(el); }
    el.textContent = text;
    el.hidden = false;
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => { el.hidden = true; }, 4000);
  }

  // The Exit dialog, when there are unsaved changes. Create not Learn's Exit
  // discards them without asking; this asks, with Create not Learn's own
  // dialog for leaving editing another way, plus Keep editing.
  let exitDialog = null;
  function exit() {
    commitEditing();
    if (!hasUnsaved()) { leaveEdit(null); return; }
    if (!exitDialog) {
      exitDialog = document.createElement('dialog');
      exitDialog.className = 'vm-dialog vm-exit';
      exitDialog.setAttribute('aria-labelledby', 'vm-exit-title');
      exitDialog.setAttribute('aria-describedby', 'vm-exit-text');
      exitDialog.innerHTML = '<button type="button" class="vm-dialog-close" data-choice="keep" aria-label="Keep editing">' + ICONS.close + '</button>' +
        '<h2 id="vm-exit-title">Save your changes?</h2><p id="vm-exit-text">Your site only shows saved changes, so unsaved ones won’t appear there.</p>' +
        '<div class="vm-dialog-actions"><button type="button" class="vm-btn vm-btn-tertiary" data-choice="keep">Keep editing</button><button type="button" class="vm-btn vm-btn-secondary" data-choice="discard">Discard</button><button type="button" class="vm-btn vm-btn-primary" data-choice="save">Save</button></div>';
      document.body.append(exitDialog);
      exitDialog.addEventListener('click', (e) => {
        const b = e.target.closest('[data-choice]');
        if (b) exitChoice(b.dataset.choice);
      });
      exitDialog.addEventListener('cancel', (e) => { e.preventDefault(); exitChoice('keep'); });
    }
    note('mode', 'Pressed Exit with ' + plural(changes().length, 'unsaved change', 'unsaved changes') + ': asked “Save your changes?”');
    exitDialog.showModal();
    exitDialog.querySelector('[data-choice="save"]').focus();
  }
  function exitChoice(choice) {
    exitDialog.close();
    if (choice === 'keep') {
      note('mode', 'Exit dialog: Keep editing');
      const b = toolbar.querySelector('[data-action="exit"]');
      if (b) b.focus();
      return;
    }
    if (choice === 'save') { save('d'); leaveEdit('Save', 'yes'); return; }
    const n = changes().length;
    const saved = S.visit && S.visit.saved ? 'some, the rest discarded' : 'no';
    S.draft = deepCopy(S.saved);
    note('mode', 'Exit dialog: Discard (' + plural(n, 'unsaved change', 'unsaved changes') + ' thrown away)');
    leaveEdit('Discard', saved);
  }

  // ---------- Toolbar actions ----------

  toolbar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action;
    if (a === 'save') { openReview(); return; }
    if (b.getAttribute('aria-disabled') === 'true') return;
    if (a === 'edit') enterEdit(e.detail === 0 ? 'edit-button-keyboard' : 'edit-button');
    else if (a === 'back') historyStep(-1);
    else if (a === 'forward') historyStep(1);
    else if (a === 'pages' || a === 'pages-status') { if (picker && picker.action === 'pages') closePicker(true); else openFinder(toolbar.querySelector('.vm-address-btn')); }
    else if (a === 'page-options') { if (picker && picker.action === a) closePicker(true); else pageOptions(b); }
    else if (a === 'view') { if (picker && picker.action === a) closePicker(true); else viewMenu(b); }
    else if (a === 'overview') tried('Document Overview');
    else if (a === 'zoom-out') tried('Zoom out (toolbar)');
    else if (a === 'undo') undo();
    else if (a === 'redo') redo();
    else if (a === 'exit') exit();
  });
  // Keep focus in the text when Undo or Redo is pressed with the pointer.
  toolbar.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-action="undo"], [data-action="redo"]');
    if (b && editing) e.preventDefault();
  });

  let scrollTimer = null;
  viewport.addEventListener('scroll', () => {
    emit('scroll', { top: viewport.scrollTop });
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { S.scroll[S.mode] = viewport.scrollTop; persist(); }, 200);
  }, { passive: true });

  // ---------- Tasks ----------

  // The six tasks. Tasks 2, 4 and 6 count from the saved site; the code
  // adds what the screen showed after a dot when that differs. Task 1 is
  // what's on screen, saved or not; task 2 is saving it.
  const TASKS = [
    { n: 1, text: 'Change the main heading on the Home page', hint: 'Ticked when the heading on screen, saved or not, is different.' },
    { n: 2, text: 'Make sure visitors can see the new heading (save)', hint: 'Ticked when the saved Home heading is different.', saved: true },
    { n: 3, text: 'Find the opening hours on the Contact page', hint: 'Ticked when the hours were at least half in view on Contact, while browsing.' },
    { n: 4, text: 'Fix the typo in the footer (“exept”)', hint: 'Ticked when the saved footer says “except” and not “exept”.', saved: true },
    { n: 5, text: 'Check that the menu links work', hint: 'Ticked when each menu link has been followed while browsing.' },
    { n: 6, text: 'Change the text on the “See what’s on” button', hint: 'Ticked when the saved button text is different.', saved: true }
  ];
  const menuDone = () => PAGE_IDS.filter((p) => S.menuFollowed[p] != null).length;
  // onScreen: read tasks 2, 4 and 6 from what the screen shows (the draft)
  // rather than from the saved site.
  function taskState(n, onScreen) {
    const src = onScreen ? S.draft : S.saved;
    if (n === 1) return S.draft['home-heading'] !== ORIGINAL['home-heading'];
    if (n === 2) return src['home-heading'] !== ORIGINAL['home-heading'];
    if (n === 3) return !!S.hoursSeen;
    if (n === 4) return /except/i.test(src['footer-open']) && !/exept/i.test(src['footer-open']);
    if (n === 5) return menuDone() === 3;
    if (n === 6) return src['home-cta'] !== ORIGINAL['home-cta'];
    return false;
  }
  function checkTasks() {
    for (const t of TASKS) {
      const done = taskState(t.n);
      const was = !!(S.tasks[t.n] && S.tasks[t.n].done);
      if (done && !was) { S.tasks[t.n] = { done: true, t: Math.round(now() * 10) / 10 }; note('task', 'Task ' + t.n + ' done: ' + t.text); }
      else if (!done && was) { S.tasks[t.n] = { done: false }; note('task', 'Task ' + t.n + ' undone: ' + t.text); }
    }
    persist();
    renderNotes();
  }

  function watchHours() {
    const el = site.querySelector('[data-hours]');
    if (!el || S.hoursSeen || !('IntersectionObserver' in window)) return;
    hoursObserver = new IntersectionObserver((entries) => {
      if (S.mode !== 'browse' || page() !== 'contact') return;
      if (entries.some((en) => en.isIntersecting && en.intersectionRatio >= 0.5)) {
        let how = 'unknown';
        for (let i = S.log.length - 1; i >= 0; i--) { const m = /^Went to Contact from \w+ \((.+)\)$/.exec(S.log[i].text); if (m) { how = m[1]; break; } }
        S.hoursSeen = { t: Math.round(now() * 10) / 10, route: S.log.some((l) => /^Went to Contact/.test(l.text)) ? how : 'already on Contact' };
        note('task', 'Opening hours in view on Contact, while browsing (reached Contact by ' + S.hoursSeen.route + ')');
        hoursObserver.disconnect();
        hoursObserver = null;
        checkTasks();
      }
    }, { root: viewport, threshold: [0, 0.5, 1] });
    hoursObserver.observe(el);
  }

  // ---------- Prompts ----------

  function promptShown(kind, detail) {
    const id = S.prompts.next++;
    S.prompts.open[id] = { kind, t: Math.round(now() * 10) / 10 };
    S.stats.prompts.shown++;
    S.stats.promptKinds[kind] = (S.stats.promptKinds[kind] || 0) + 1;
    note('prompt', 'Shown: ' + kind + (detail ? ' (' + detail + ')' : ''));
    return id;
  }
  function promptOutcome(id, outcome, detail) {
    const p = S.prompts.open[id];
    if (!p || !['accepted', 'dismissed', 'ignored', 'followed'].includes(outcome)) return false;
    delete S.prompts.open[id];
    S.stats.prompts[outcome]++;
    note('prompt', p.kind[0].toUpperCase() + p.kind.slice(1) + ' ' + outcome + (detail ? ': ' + detail : '') + ' (after ' + Math.max(0, now() - p.t).toFixed(1) + ' s)');
    return true;
  }

  // ---------- Completion code ----------

  /*
   * VA1-110111.111111-f12.4a-n3-g2-p4.1.2.1-l5.2-x1-b2-v34t.3.1-w1-s245
   *   arm code · tasks 1–6 from the saved site, then after a dot what the
   *   screen showed, if that differs · f: seconds to first entry into edit
   *   mode and the route (e Edit button, a the arm's own; fx never) · n:
   *   non-functional clicks before then · g: clicks on the admin bar, the
   *   strip of icons and the sidebar before then · p: prompts shown,
   *   accepted, dismissed (including C's "followed"), ignored · l: link
   *   follows, button uses · x: accidental entries · b: Exits · v: seconds
   *   from the first unsaved change to the first save, how that save was
   *   made (t toolbar, k keyboard, d Exit dialog), saves, saves through the
   *   Exit dialog (vx never saved) · w: unsaved changes at Finished · s:
   *   seconds from first open to Finished.
   */
  function taskDigits() {
    const saved = TASKS.map((t) => (taskState(t.n) ? '1' : '0')).join('');
    const screen = TASKS.map((t) => (taskState(t.n, true) ? '1' : '0')).join('');
    return saved === screen ? saved : saved + '.' + screen;
  }
  function savePart() {
    const st = S.stats;
    if (!st.firstSave) return 'vx';
    const secs = Math.max(0, Math.round(st.firstSave.t - (st.firstUnsavedT != null ? st.firstUnsavedT : st.firstSave.t)));
    return 'v' + secs + st.firstSave.how + '.' + st.saves + '.' + st.savesDialog;
  }
  function completionCode() {
    const st = S.stats;
    const f = st.first ? 'f' + st.first.t.toFixed(1) + (st.first.core ? 'e' : 'a') : 'fx';
    const p = 'p' + [st.prompts.shown, st.prompts.accepted, st.prompts.dismissed + st.prompts.followed, st.prompts.ignored].join('.');
    return [ARM.code, taskDigits(), f, 'n' + st.nfBefore, 'g' + st.gBefore, p, 'l' + st.follows + '.' + st.uses, 'x' + st.accidental, 'b' + st.exits, savePart(), 'w' + changes().length, 's' + Math.round(now())].join('-');
  }

  let finishDialog = null;
  function finish() {
    if (S.mode === 'edit') commitEditing();
    if (!finishDialog) {
      finishDialog = document.createElement('dialog');
      finishDialog.className = 'vm-dialog vm-finish';
      finishDialog.setAttribute('aria-labelledby', 'vm-finish-title');
      document.body.append(finishDialog);
      finishDialog.addEventListener('click', (e) => {
        if (e.target.closest('[data-back]')) { note('task', 'Went back from Finished'); finishDialog.close(); return; }
        if (e.target.closest('[data-sure]')) { showCode(); return; }
        if (e.target.closest('[data-copy-code]')) {
          const input = finishDialog.querySelector('textarea');
          input.select();
          (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject()).then(
            () => { e.target.closest('[data-copy-code]').textContent = 'Copied'; },
            () => { try { document.execCommand('copy'); } catch (err) { /* select and copy by hand */ } }
          );
        }
      });
      finishDialog.addEventListener('close', () => { const b = app.querySelector('[data-action="finish"]'); if (b) b.focus(); });
    }
    note('task', 'Clicked Finished and was asked whether every task is done');
    finishDialog.innerHTML = '<h2 id="vm-finish-title">Have you done every task?</h2><p>Finished is the last step. Only carry on if you’ve done everything you were asked to.</p>' +
      '<div class="vm-dialog-actions"><button type="button" class="vm-btn vm-btn-tertiary" data-back>Not yet, keep editing</button><button type="button" class="vm-btn vm-btn-primary" data-sure>Yes, I’ve finished</button></div>';
    finishDialog.showModal();
    finishDialog.querySelector('[data-back]').focus();
  }
  function showCode() {
    const code = completionCode();
    S.stats.finished++;
    note('task', 'Finished. Code ' + code);
    finishDialog.innerHTML = '<h2 id="vm-finish-title">Thank you</h2><p>Please copy this code into the next question:</p>' +
      '<textarea class="vm-code" readonly rows="2" aria-label="Your code">' + code + '</textarea>' +
      '<div class="vm-dialog-actions"><button type="button" class="vm-btn vm-btn-tertiary" data-back>Keep editing</button><button type="button" class="vm-btn vm-btn-primary" data-copy-code>Copy code</button></div>';
    const input = finishDialog.querySelector('textarea');
    input.focus();
    input.select();
  }
  app.querySelector('[data-action="finish"]').addEventListener('click', finish);

  // ---------- Facilitator notes ----------

  let notesEl = null;
  function renderNotes() {
    if (!NOTES) return;
    if (!notesEl) {
      notesEl = document.createElement('aside');
      notesEl.className = 'vm-notes';
      notesEl.setAttribute('aria-label', 'Facilitator notes');
      document.body.append(notesEl);
      notesEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-reset]')) { resetting = true; try { localStorage.removeItem(STORE_KEY); } catch (err) { /* nothing kept */ } location.reload(); return; }
        if (e.target.closest('[data-copy-log]')) {
          const text = S.log.map((l) => fmtTime(l.t) + '  ' + l.text).join('\n');
          (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(() => {});
          e.target.closest('[data-copy-log]').textContent = 'Copied';
        }
      });
      notesEl.addEventListener('change', (e) => {
        const box = e.target.closest('[data-manual]');
        if (!box) return;
        S.manual[box.dataset.manual] = box.checked;
        note('task', 'Facilitator ' + (box.checked ? 'ticked' : 'unticked') + ' task ' + box.dataset.manual);
      });
    }
    if (!S) return;
    const st = S.stats;
    const keep = notesEl.querySelector('.vm-log');
    const atBottom = !keep || keep.scrollTop + keep.clientHeight >= keep.scrollHeight - 4;
    const row = (key, label, value, wide) => '<dt' + (wide ? ' class="is-wide"' : '') + '>' + label + '</dt><dd' + (wide ? ' class="is-wide"' : '') + ' data-count="' + key + '">' + value + '</dd>';
    const switcher = Object.entries(VARIANTS).map(([id, v]) => id === VARIANT
      ? '<strong>' + v.letter + '</strong>' : '<a href="' + v.file + '?notes">' + v.letter + '</a>').join(' | ');
    const routes = Object.keys(Object.assign({}, ROUTES, st.byRoute)).map((r) =>
      row('route-' + r, 'Entries by ' + (ROUTES[r] ? ROUTES[r].label : r), st.byRoute[r] || 0)).join('');
    const arm = Object.keys(st.arm).map((k) => row('arm-' + k, esc(st.armLabels[k] || k), st.arm[k])).join('');
    notesEl.innerHTML =
      '<div class="vm-notes-head"><h2>Facilitator notes</h2><span class="vm-switch">' + switcher + '</span></div>' +
      '<p class="vm-notes-arm">' + esc(ARM.name) + '. Code <code>' + ARM.code + '</code>.</p>' +
      '<p>Now: <strong data-now-mode>' + (S.mode === 'edit' ? 'editing' : 'browsing') + '</strong> ' + PAGES[page()] + (S.mode === 'browse' ? ', browse spell ' + S.spell.id : '') + '.</p>' +
      '<h3>Tasks</h3><ol class="vm-tasks">' + TASKS.map((t) => {
        const done = taskState(t.n);
        const screenOnly = !done && t.saved && taskState(t.n, true);
        const tt = S.tasks[t.n] && S.tasks[t.n].done ? S.tasks[t.n].t : null;
        return '<li data-task-row="' + t.n + '" class="' + (done ? 'is-done' : screenOnly ? 'is-unsaved' : '') + '">' +
          '<label><input type="checkbox" data-manual="' + t.n + '"' + (S.manual[t.n] ? ' checked' : '') + ' aria-label="Your tick for task ' + t.n + '"> ' + esc(t.text) + '</label>' +
          (done ? ' <span class="vm-done">✓ ' + (tt != null ? fmtTime(tt) : '') + '</span>' : '') +
          (screenOnly ? ' <span class="vm-unsaved">On screen, not saved</span>' : '') +
          (t.n === 5 ? ' <span data-menu-progress>' + menuDone() + '/3</span>' : '') +
          '<small>' + esc(t.hint) + (t.n === 3 && S.hoursSeen ? ' Reached by ' + esc(S.hoursSeen.route) + '.' : '') + '</small></li>';
      }).join('') + '</ol>' +
      '<p class="vm-small">Ticks with a time are automatic and go into the code. The boxes are yours, for your notes only.</p>' +
      '<h3>Counts</h3><dl>' +
        row('first-entry', 'First into edit mode', st.first ? st.first.t.toFixed(1) + ' s, by ' + esc(ROUTES[st.first.route] ? ROUTES[st.first.route].label : st.first.route) : 'not yet', true) +
        row('nf-before', 'Non-functional clicks before then', st.nfBefore) +
        row('nf-total', 'Non-functional clicks in all (browse)', st.nfTotal) +
        row('g-before', 'Clicks on the admin bar, strip and sidebar before then', st.gBefore) +
        row('g-total', 'Clicks on the admin bar, strip and sidebar in all', st.gTotal) +
        row('tried', 'Things tried that are only drawn', st.tried) +
        row('entries', 'Entries into edit mode', st.entries) + routes +
        row('exits', 'Exits back to browse', st.exits) +
        row('accidental', 'Accidental entries (Exit with no change)', st.accidental) +
        row('prompts-shown', 'Prompts shown', st.prompts.shown) +
        row('prompts-accepted', '· accepted (chose edit)', st.prompts.accepted) +
        row('prompts-dismissed', '· dismissed', st.prompts.dismissed) +
        row('prompts-followed', '· followed (chose the link, button or box)', st.prompts.followed) +
        row('prompts-ignored', '· ignored', st.prompts.ignored) +
        row('follows', 'Links followed (browse)', st.follows + (st.followsVia ? ' (' + st.followsVia + ' via popup)' : '')) +
        row('uses', 'Buttons used (browse)', st.uses + (st.usesVia ? ' (' + st.usesVia + ' via popup)' : '')) +
        row('menu', 'Menu links followed', menuDone() + '/3') +
        row('pages', 'Page switches', st.pages) +
        row('saves', 'Saves (through the Exit dialog)', st.saves + ' (' + st.savesDialog + ')') +
        row('first-save', 'First save', st.firstSave ? st.firstSave.t.toFixed(1) + ' s, by ' + { t: 'the toolbar’s Save', k: SAVE_KEYS, d: 'the Exit dialog' }[st.firstSave.how] + (st.firstUnsavedT != null ? ', ' + Math.round(st.firstSave.t - st.firstUnsavedT) + ' s after the first unsaved change' : '') : 'not yet', true) +
        row('reviews', 'Review changes opened / closed without saving', st.reviews + ' / ' + st.reviewsCancelled) +
        row('save-grey', 'Save clicked while greyed out', st.saveGrey) +
        row('unsaved', 'Unsaved changes now', changes().length) +
        row('edits', 'Edits', st.edits) +
        row('undos', 'Undos / redos', st.undos + ' / ' + st.redos) +
        row('escapes', 'Escapes in text', st.escapes) + arm +
      '</dl>' +
      '<h3>Log</h3><ol class="vm-log">' + (S.log.length ? S.log.map((l) => '<li class="is-' + l.kind + '"><time>' + fmtTime(l.t) + '</time>' + esc(l.text) + '</li>').join('') : '<li>Nothing yet.</li>') + '</ol>' +
      '<div class="vm-notes-actions"><button type="button" class="vm-btn vm-btn-secondary" data-copy-log>Copy log</button><button type="button" class="vm-btn vm-btn-tertiary" data-reset>Reset</button></div>';
    const log = notesEl.querySelector('.vm-log');
    if (atBottom) log.scrollTop = log.scrollHeight;
    else if (keep) log.scrollTop = keep.scrollTop;
  }

  // ---------- The API ----------

  let registered = null;
  const api = {
    variant: VARIANT,
    code: ARM.code,
    mode: () => S.mode,
    page,
    pageName: (id) => PAGES[id || page()],
    site,
    viewport,
    stage: viewport.parentElement,
    layer,
    blocked: () => !!(picker || document.querySelector('dialog[open]')),
    routeLabel: (name) => (ROUTES[name] ? ROUTES[name].label : String(name)),
    toLayer(x, y) { const r = layer.getBoundingClientRect(); return { x: x - r.left, y: y - r.top, width: r.width, height: r.height }; },
    lastPointerType: () => lastPointerType,
    classify,
    clickInfo: (e) => infoByEvent.get(e) || null,
    enterEdit,
    perform,
    suppressNextClick(reason) { suppress = { until: Date.now() + 1000, reason: reason ? String(reason) : '' }; },
    cancelSuppress() { suppress = null; },
    announce,
    promptShown,
    promptOutcome,
    registerRoute(name, label) { ROUTES[name] = { label: String(label || name), core: false }; renderNotes(); },
    log(text, kind) { note(kind || 'arm', String(text)); },
    count(key, label) {
      S.stats.arm[key] = (S.stats.arm[key] || 0) + 1;
      if (label) S.stats.armLabels[key] = label;
      persist();
      renderNotes();
    },
    store: {
      get: (k) => S.store[k],
      set(k, v) { S.store[k] = v; persist(); }
    },
    spell: {
      id: () => S.spell.id,
      get: (k) => S.spell.data[k],
      set(k, v) { S.spell.data[k] = v; persist(); }
    },
    on(event, fn) {
      (listeners[event] = listeners[event] || []).push(fn);
      return () => { listeners[event] = (listeners[event] || []).filter((f) => f !== fn); };
    },
    registerVariant(v) {
      if (!v || v.id !== VARIANT || registered) return;
      registered = v;
      if (typeof v.init === 'function') {
        try { v.init(api); } catch (err) { console.error(err); }
      }
      renderNotes();
    }
  };
  window.Vermeer = api;

  // ---------- Start ----------

  renderAll();
  viewport.scrollTop = S.scroll[S.mode] || 0;
  if (reloaded) {
    const open = Object.keys(S.prompts.open);
    note('reload', (openedAgain ? 'Opened again in a new tab or window (any earlier tab stops saving)' : 'Page reloaded') + (S.mode === 'edit' ? ' (in edit mode on ' + PAGES[page()] + (hasUnsaved() ? ', with ' + unsavedCount() + ' unsaved change' + (unsavedCount() === 1 ? '' : 's') : '') + ')' : ' (browsing ' + PAGES[page()] + ')'));
    for (const id of open) promptOutcome(Number(id), 'ignored', 'page reloaded');
    if (S.ui.reviewOpen) {
      S.ui.reviewOpen = false;
      S.stats.reviewsCancelled++;
      note('save', 'Review changes closed without saving (page reloaded)');
    }
    // Text being typed in when the page was reloaded: its change is in the
    // draft already; log it and count it as an edit, as finishing would have.
    if (S.pending) {
      const { key, before } = S.pending;
      S.pending = null;
      if (!String(S.draft[key] || '').trim()) {
        S.draft[key] = before;
        note('edit', 'Emptied ' + labelOf(key) + ' and it was put back (when the page was reloaded)');
        if (S.mode === 'edit') renderSite();
      } else if (S.draft[key] !== before) {
        S.stats.edits++;
        if (S.visit) S.visit.changed = true;
        note('edit', 'Changed ' + labelOf(key) + ' (' + pageOfKey(key) + '): ' + quote(before) + ' → ' + quote(S.draft[key]) + ' (finished by the reload)');
      }
      persist();
      renderToolbar();
    }
    // Unsaved changes in the draft after a reload are this visit's changes.
    if (S.mode === 'edit' && S.visit && hasUnsaved() && !S.visit.changed) { S.visit.changed = true; persist(); }
  } else {
    note('mode', 'Opened ' + ARM.name.split(':')[0] + ', browsing Home');
  }
  checkTasks();
  renderNotes();

  // Another tab wrote this arm's state (or Reset it): this one stops writing,
  // so neither overwrites the other, and says so over everything.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORE_KEY || stale || resetting) return;
    stale = true;
    const d = document.createElement('dialog');
    d.className = 'vm-dialog vm-stale';
    d.setAttribute('aria-labelledby', 'vm-stale-title');
    d.innerHTML = '<h2 id="vm-stale-title">This website is open in another tab</h2><p>Carry on in the other tab, or reload this one to carry on here.</p>' +
      '<div class="vm-dialog-actions"><button type="button" class="vm-btn vm-btn-primary" data-stale-reload>Carry on here</button></div>';
    document.body.append(d);
    d.addEventListener('cancel', (ev) => ev.preventDefault());
    d.querySelector('[data-stale-reload]').addEventListener('click', () => location.reload());
    for (const other of document.querySelectorAll('dialog[open]')) if (other !== d) other.close();
    d.showModal();
  });
})();
