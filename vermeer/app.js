/*
 * Vermeer · From looking at your site to changing it
 *
 * One small website in one simple editor, six arms. The editor opens with the
 * site on view, as visitors see it ("browse"). To change it, people have to
 * get into edit mode. The control has only the Edit button in the editor's
 * toolbar, as the Create not Learn prototype does today. Each other arm adds
 * one more way in, through the site itself, and keeps the Edit button.
 *
 * This file is everything the six arms share: the site (Cobble Lane Books,
 * three pages), the editor frame around it (browse and edit modes, Save,
 * Exit with its dialog, Undo and Redo, the page picker, the back and forward
 * history), state that survives a reload, the tasks, the counts, the log,
 * the facilitator panel (?notes or #notes), and Finished with its code.
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
 *   hover-notice     VB   resting on the site shows a notice with a button
 *   choose-on-click  VC   any click offers its action or Edit
 *   hover-choice     VD   resting on the site shows an Edit / Browse overlay
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
 *   HOVER_REST_MS                      500: how long the pointer rests before a hover arm reacts
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
 * Prompts (A2 popover, B notice, C popup, D overlay)
 *   promptShown(kind, detail?)         → id. Logs and counts it as shown. kind is a short name
 *                                      ('popover', 'notice', 'popup', 'overlay').
 *   promptOutcome(id, outcome, detail?) outcome: 'accepted' (chose edit), 'dismissed' (No, ×,
 *                                      Browse, Escape, Keep looking), 'followed' (C: chose the
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
    'hover-notice': { code: 'VB', letter: 'B', file: 'hover-notice.html', name: 'B · Hover notice: resting on the site shows a notice with Start editing' },
    'choose-on-click': { code: 'VC', letter: 'C', file: 'choose-on-click.html', name: 'C · Choose on click: every click offers its own action or Edit' },
    'hover-choice': { code: 'VD', letter: 'D', file: 'hover-choice.html', name: 'D · Hover choice: resting on the site shows Edit or Browse' }
  };
  const VARIANT = VARIANTS[document.body.dataset.variant] ? document.body.dataset.variant : 'control';
  const ARM = VARIANTS[VARIANT];
  const NOTES = new URLSearchParams(location.search).has('notes') || location.hash === '#notes';
  const STORE_KEY = 'vermeer:' + VARIANT;
  const HOVER_REST_MS = 500;

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
    page: svg('M15.5 7.5h-7V9h7V7.5Zm-7 3.5h7v1.5h-7V11Zm7 3.5h-7V16h7v-1.5Z M17 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm.5 14a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v12Z')
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

  // ---------- The frame ----------

  const app = document.getElementById('app');
  app.className = 'vm-app' + (NOTES ? ' has-notes' : '');
  app.innerHTML =
    '<div class="vm-editor">' +
      '<aside class="vm-sidebar" aria-label="Your website">' +
        '<div class="vm-sitecard"><span class="vm-avatar" aria-hidden="true">C</span><span class="vm-sitecard-name">Cobble Lane Books</span></div>' +
        '<p class="vm-tip">' + ICONS.tip + '<span>Tip: follow links to look around your site, and press Edit to change the page you’re on.</span></p>' +
      '</aside>' +
      '<section class="vm-canvas" aria-label="Your page">' +
        '<div class="vm-toolbar" role="toolbar" aria-label="Page tools"></div>' +
        '<div class="vm-stage">' +
          '<div class="vm-viewport" tabindex="-1"><div class="vm-site cl"></div></div>' +
          '<div class="vm-layer"></div>' +
        '</div>' +
      '</section>' +
    '</div>' +
    '<div class="vm-bottombar"><button type="button" class="vm-btn vm-btn-primary" data-action="finish">Finished</button><p>Click Finished when you’ve done everything you were asked to.</p></div>' +
    '<div class="vm-live" aria-live="polite" role="status"></div>';
  const toolbar = app.querySelector('.vm-toolbar');
  const viewport = app.querySelector('.vm-viewport');
  const site = app.querySelector('.vm-site');
  const layer = app.querySelector('.vm-layer');
  const live = app.querySelector('.vm-live');

  function announce(text) {
    live.textContent = '';
    setTimeout(() => { live.textContent = text; }, 30);
  }

  function hasUnsaved() { return Object.keys(S.draft).some((k) => S.draft[k] !== S.saved[k]); }
  function unsavedCount() { return Object.keys(S.draft).filter((k) => S.draft[k] !== S.saved[k]).length; }

  let savedFlash = false;
  let toolbarDrawn = '';
  // Redraws the toolbar when the mode or page changes; otherwise updates the
  // buttons in place, so a click that blurs the text (and so updates Save)
  // still lands on the button it started on.
  function renderToolbar() {
    const edit = S.mode === 'edit';
    if (toolbarDrawn === S.mode + ':' + page()) {
      const set = (action, off) => { const el = toolbar.querySelector('[data-action="' + action + '"]'); if (el) { if (off) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled'); } };
      if (edit) {
        set('undo', !S.undo.length);
        set('redo', !S.redo.length);
        const unsaved = hasUnsaved();
        const sv = toolbar.querySelector('[data-action="save"]');
        if (sv) { sv.disabled = !unsaved; sv.textContent = savedFlash && !unsaved ? 'Saved' : 'Save'; }
      } else {
        set('back', S.hist.i <= 0);
        set('forward', S.hist.i >= S.hist.stack.length - 1);
      }
      return;
    }
    toolbarDrawn = S.mode + ':' + page();
    const addr = '<div class="vm-address"><button type="button" class="vm-address-btn" data-action="pages" aria-haspopup="true" aria-expanded="false" aria-label="Page: ' + PAGES[page()] + '. Choose a page">' + ICONS.search + '<span>' + PAGES[page()] + '</span></button></div>';
    let left, right;
    if (edit) {
      left = '<button type="button" class="vm-icon-btn" data-action="undo" aria-label="Undo"' + (S.undo.length ? '' : ' aria-disabled="true"') + ' data-tip="Undo">' + ICONS.undo + '</button>' +
        '<button type="button" class="vm-icon-btn" data-action="redo" aria-label="Redo"' + (S.redo.length ? '' : ' aria-disabled="true"') + ' data-tip="Redo">' + ICONS.redo + '</button>';
      const unsaved = hasUnsaved();
      right = '<button type="button" class="vm-btn vm-btn-secondary" data-action="exit">Exit</button>' +
        '<button type="button" class="vm-btn vm-btn-primary" data-action="save"' + (unsaved ? '' : ' disabled') + '>' + (savedFlash && !unsaved ? 'Saved' : 'Save') + '</button>';
    } else {
      left = '<button type="button" class="vm-icon-btn" data-action="back" aria-label="Back"' + (S.hist.i > 0 ? '' : ' aria-disabled="true"') + ' data-tip="Back">' + ICONS.back + '</button>' +
        '<button type="button" class="vm-icon-btn" data-action="forward" aria-label="Forward"' + (S.hist.i < S.hist.stack.length - 1 ? '' : ' aria-disabled="true"') + ' data-tip="Forward">' + ICONS.forward + '</button>';
      right = '<button type="button" class="vm-icon-btn" aria-label="Desktop view" aria-disabled="true" data-tip="Desktop view">' + ICONS.desktop + '</button>' +
        '<button type="button" class="vm-btn vm-btn-primary vm-edit-btn" data-action="edit" aria-describedby="vm-edit-desc" data-tip="Change this page">' + ICONS.pencil + '<span>Edit</span></button>' +
        '<span id="vm-edit-desc" hidden>Change this page</span>';
    }
    const focused = document.activeElement && toolbar.contains(document.activeElement) ? document.activeElement.dataset.action : null;
    toolbar.innerHTML = '<div class="vm-tb-left">' + left + '</div>' + addr + '<div class="vm-tb-right">' + right + '</div>';
    if (focused) { const el = toolbar.querySelector('[data-action="' + focused + '"]'); if (el) el.focus(); }
  }

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
      '<header class="cl-header" data-section="header" data-label="Header">' +
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
        '<section class="cl-hero" data-section="home-hero" data-label="Top of the Home page"><div class="cl-wrap cl-hero-in">' +
          '<div class="cl-hero-text">' + tx('home-kicker', 'p', 'cl-kicker') + tx('home-heading', 'h1', 'cl-h1') +
            '<p class="cl-lede" data-k-near="home-intro-a">' + tx('home-intro-a') + link('home-intro-link', 'events', 'text link', 'cl-inline-link') + tx('home-intro-b') + '</p>' +
            '<p class="cl-actions">' + link('home-cta', 'events', 'button link', 'cl-btn cl-btn-accent') + '</p>' +
          '</div>' +
          '<figure class="cl-hero-art" data-img="Picture of the shop">' + PICTURES.hero + '</figure>' +
        '</div></section>' +
        '<section class="cl-picks" data-section="home-picks" data-label="This month’s picks"><div class="cl-wrap">' +
          tx('picks-heading', 'h2', 'cl-h2') + tx('picks-intro', 'p', 'cl-sub') +
          '<div class="cl-cards">' + [1, 2, 3].map((n) =>
            '<article class="cl-card"><div class="cl-card-art" data-img="Book cover">' + PICTURES['cover' + n] + '</div>' +
            '<div class="cl-card-body">' + tx('pick' + n + '-title', 'h3', 'cl-h3') + tx('pick' + n + '-text', 'p', 'cl-card-text') + '</div></article>').join('') +
          '</div>' +
        '</div></section>' +
        '<section class="cl-cafe" data-section="home-cafe" data-label="The café corner"><div class="cl-wrap cl-cafe-in">' +
          '<figure class="cl-cafe-art" data-img="Picture of the café">' + PICTURES.cafe + '</figure>' +
          '<div class="cl-cafe-text">' + tx('cafe-heading', 'h2', 'cl-h2') + tx('cafe-text', 'p', 'cl-body') + '</div>' +
        '</div></section>';
    } else if (pg === 'events') {
      main =
        '<section class="cl-pagehead" data-section="events-head" data-label="Top of the Events page"><div class="cl-wrap cl-narrow">' +
          tx('events-kicker', 'p', 'cl-kicker') + tx('events-heading', 'h1', 'cl-h1') + tx('events-intro', 'p', 'cl-lede') +
        '</div></section>' +
        '<section class="cl-events" data-section="events-list" data-label="The list of events"><div class="cl-wrap cl-narrow"><ol class="cl-event-list">' +
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
        '<section class="cl-pagehead" data-section="contact-head" data-label="Top of the Contact page"><div class="cl-wrap cl-narrow">' +
          tx('contact-kicker', 'p', 'cl-kicker') + tx('contact-heading', 'h1', 'cl-h1') + tx('contact-intro', 'p', 'cl-lede') +
          '<p class="cl-actions">' + link('directions', 'contact#find-us', 'directions link', 'cl-inline-link cl-arrow-link') + '</p>' +
        '</div></section>' +
        '<section class="cl-contact" data-section="contact-main" data-label="Opening hours and the contact form"><div class="cl-wrap cl-contact-in">' +
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
        '<section class="cl-findus" id="find-us" data-section="contact-findus" data-label="Finding us"><div class="cl-wrap cl-findus-in">' +
          '<div>' + tx('findus-heading', 'h2', 'cl-h2') + tx('findus-text', 'p', 'cl-body') + '</div>' +
          '<figure class="cl-map-wrap" data-img="Map">' + PICTURES.map + '</figure>' +
        '</div></section>';
    }

    const footer =
      '<footer class="cl-footer" data-section="footer" data-label="Footer"><div class="cl-wrap cl-footer-in">' +
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
    renderToolbar();
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
    // touch that stood in for hover (B, D) leaves the second free to act.
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

  // ---------- Page picker ----------

  let picker = null;
  function openPicker(btn) {
    closePicker();
    picker = document.createElement('div');
    picker.className = 'vm-picker';
    picker.setAttribute('role', 'menu');
    picker.setAttribute('aria-label', 'Pages');
    picker.innerHTML = '<p class="vm-picker-title">Pages</p>' + PAGE_IDS.map((id) =>
      '<button type="button" role="menuitemradio" aria-checked="' + (id === page()) + '" data-page="' + id + '">' + ICONS.page + '<span>' + PAGES[id] + '</span>' + (id === page() ? ICONS.check : '') + '</button>').join('');
    document.body.append(picker);
    const r = btn.getBoundingClientRect();
    picker.style.left = Math.round(r.left + r.width / 2 - 130) + 'px';
    picker.style.top = Math.round(r.bottom + 6) + 'px';
    btn.setAttribute('aria-expanded', 'true');
    picker.querySelector('[aria-checked="true"]').focus();
    picker.addEventListener('click', (e) => {
      const b = e.target.closest('[data-page]');
      if (!b) return;
      const to = b.dataset.page;
      closePicker(true);
      if (to !== page()) go(to, 'address bar');
    });
    picker.addEventListener('keydown', (e) => {
      const items = [...picker.querySelectorAll('[data-page]')];
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i + items.length - 1) % items.length].focus(); }
      if (e.key === 'Escape') { e.preventDefault(); closePicker(true); }
      if (e.key === 'Tab') closePicker(false);
    });
  }
  function closePicker(refocus) {
    if (!picker) return;
    picker.remove();
    picker = null;
    const btn = toolbar.querySelector('[data-action="pages"]');
    if (btn) { btn.setAttribute('aria-expanded', 'false'); if (refocus) btn.focus(); }
  }
  document.addEventListener('pointerdown', (e) => {
    if (picker && !picker.contains(e.target) && !e.target.closest('[data-action="pages"]')) closePicker(false);
  }, true);

  // ---------- Edit mode: changing text ----------

  let editing = null; // { el, key, before }
  let selectedBox = null;
  const supportsPlain = (() => { const d = document.createElement('div'); try { d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only'; } catch (err) { return false; } })();

  function clearSelected() {
    for (const el of site.querySelectorAll('.is-selected')) el.classList.remove('is-selected');
    selectedBox = null;
  }
  function selectBox(el) {
    commitEditing();
    clearSelected();
    if (!el) return;
    el.classList.add('is-selected');
    selectedBox = el;
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
  document.addEventListener('keydown', (e) => {
    if (S.mode !== 'edit' || document.querySelector('dialog[open]')) return;
    const mod = isMac ? e.metaKey : e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    else if (mod && key === 'y') { e.preventDefault(); redo(); }
    else if (mod && key === 's') { e.preventDefault(); save(); }
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

  let savedTimer = null;
  function save() {
    if (S.mode !== 'edit') return;
    commitEditing({ keepSelected: !!(editing) });
    if (!hasUnsaved()) return;
    const n = unsavedCount();
    S.saved = deepCopy(S.draft);
    S.stats.saves++;
    if (S.visit) S.visit.saved = true;
    note('save', 'Saved (' + n + ' change' + (n === 1 ? '' : 's') + ')');
    savedFlash = true;
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => { savedFlash = false; if (S.mode === 'edit') renderToolbar(); }, 1600);
    persist();
    renderToolbar();
    if (document.activeElement === document.body || !document.activeElement) { const b = toolbar.querySelector('[data-action="exit"]'); if (b) b.focus(); }
    announce('Saved. Your website now shows your changes.');
    checkTasks();
  }

  // The Exit dialog, when there are unsaved changes.
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
    note('mode', 'Pressed Exit with ' + unsavedCount() + ' unsaved change' + (unsavedCount() === 1 ? '' : 's') + ': asked “Save your changes?”');
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
    if (choice === 'save') { save(); leaveEdit('Save', 'yes'); return; }
    const n = unsavedCount();
    const saved = S.visit && S.visit.saved ? 'some, the rest discarded' : 'no';
    S.draft = deepCopy(S.saved);
    note('mode', 'Exit dialog: Discard (' + n + ' unsaved change' + (n === 1 ? '' : 's') + ' thrown away)');
    leaveEdit('Discard', saved);
  }

  // ---------- Toolbar actions ----------

  toolbar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    const a = b.dataset.action;
    if (a === 'edit') enterEdit(e.detail === 0 ? 'edit-button-keyboard' : 'edit-button');
    else if (a === 'back') historyStep(-1);
    else if (a === 'forward') historyStep(1);
    else if (a === 'pages') { if (picker) closePicker(true); else openPicker(b); }
    else if (a === 'undo') undo();
    else if (a === 'redo') redo();
    else if (a === 'save') save();
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

  const TASKS = [
    { n: 1, text: 'Change the main heading on the Home page', hint: 'Ticked when the saved Home heading is different.' },
    { n: 2, text: 'Find the opening hours on the Contact page', hint: 'Ticked when the hours were at least half in view on Contact, while browsing.' },
    { n: 3, text: 'Fix the typo in the footer (“exept”)', hint: 'Ticked when the saved footer says “except” and not “exept”.' },
    { n: 4, text: 'Check that the menu links work', hint: 'Ticked when each menu link has been followed while browsing.' },
    { n: 5, text: 'Change the text on the “See what’s on” button', hint: 'Ticked when the saved button text is different.' }
  ];
  const menuDone = () => PAGE_IDS.filter((p) => S.menuFollowed[p] != null).length;
  function taskState(n) {
    if (n === 1) return S.saved['home-heading'] !== ORIGINAL['home-heading'];
    if (n === 2) return !!S.hoursSeen;
    if (n === 3) return /except/i.test(S.saved['footer-open']) && !/exept/i.test(S.saved['footer-open']);
    if (n === 4) return menuDone() === 3;
    if (n === 5) return S.saved['home-cta'] !== ORIGINAL['home-cta'];
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
   * VA1-10111-f12.4a-n3-p4.1.2.1-l5.2-x1-b2-s245
   *   arm code · tasks 1–5 · f: seconds to first entry into edit mode and
   *   the route (e Edit button, a the arm's own; fx never) · n: non-functional
   *   clicks before then · p: prompts shown, accepted, dismissed (including
   *   C's "followed"), ignored · l: link follows, button uses · x: accidental
   *   entries · b: Exits · s: seconds from first open to Finished.
   */
  function completionCode() {
    const st = S.stats;
    const tasks = TASKS.map((t) => (taskState(t.n) ? '1' : '0')).join('');
    const f = st.first ? 'f' + st.first.t.toFixed(1) + (st.first.core ? 'e' : 'a') : 'fx';
    const p = 'p' + [st.prompts.shown, st.prompts.accepted, st.prompts.dismissed + st.prompts.followed, st.prompts.ignored].join('.');
    return [ARM.code, tasks, f, 'n' + st.nfBefore, p, 'l' + st.follows + '.' + st.uses, 'x' + st.accidental, 'b' + st.exits, 's' + Math.round(now())].join('-');
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
        const tt = S.tasks[t.n] && S.tasks[t.n].done ? S.tasks[t.n].t : null;
        return '<li data-task-row="' + t.n + '" class="' + (done ? 'is-done' : '') + '">' +
          '<label><input type="checkbox" data-manual="' + t.n + '"' + (S.manual[t.n] ? ' checked' : '') + ' aria-label="Your tick for task ' + t.n + '"> ' + esc(t.text) + '</label>' +
          (done ? ' <span class="vm-done">✓ ' + (tt != null ? fmtTime(tt) : '') + '</span>' : '') +
          (t.n === 4 ? ' <span data-menu-progress>' + menuDone() + '/3</span>' : '') +
          '<small>' + esc(t.hint) + (t.n === 2 && S.hoursSeen ? ' Reached by ' + esc(S.hoursSeen.route) + '.' : '') + '</small></li>';
      }).join('') + '</ol>' +
      '<p class="vm-small">Ticks with a time are automatic and go into the code. The boxes are yours, for your notes only.</p>' +
      '<h3>Counts</h3><dl>' +
        row('first-entry', 'First into edit mode', st.first ? st.first.t.toFixed(1) + ' s, by ' + esc(ROUTES[st.first.route] ? ROUTES[st.first.route].label : st.first.route) : 'not yet', true) +
        row('nf-before', 'Non-functional clicks before then', st.nfBefore) +
        row('nf-total', 'Non-functional clicks in all (browse)', st.nfTotal) +
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
        row('saves', 'Saves', st.saves) +
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
    HOVER_REST_MS,
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
