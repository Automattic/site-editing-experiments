(function () {
  'use strict';

  // ---------- Data ----------
  var IMG = '../section-editing-modes/images/';
  var IMAGES = [
    { src: IMG + 'wheel-studio.jpg', alt: 'A potter’s wheel surrounded by finished pots in a studio' },
    { src: IMG + 'shelves.jpg', alt: 'Ceramic bowls and saucers stacked on wooden shelves' },
    { src: IMG + 'mugs-rack.jpg', alt: 'Glazed mugs on a rack' },
    { src: IMG + 'throwing.jpg', alt: 'Hands shaping clay on a spinning wheel' },
    { src: IMG + 'bowls.jpg', alt: 'Assorted stoneware bowls' },
    { src: IMG + 'bowls-white.jpg', alt: 'White and brown ceramic bowls' }
  ];

  var PALETTES = [
    { id: 'default', label: 'Default', sw: ['#F4F2EE', '#1A1A1A', '#2F5D50'] },
    { id: 'sand', label: 'Sand', sw: ['#EFE6D8', '#2B2118', '#9A4E26'] },
    { id: 'sage', label: 'Sage', sw: ['#DCE6DF', '#16261F', '#2F5D50'] },
    { id: 'sky', label: 'Sky', sw: ['#E2EBF4', '#14213A', '#2B57A8'] },
    { id: 'clay', label: 'Clay', sw: ['#F2E1D7', '#2A1A14', '#A84A22'] },
    { id: 'night', label: 'Night', sw: ['#191919', '#F4F2EE', '#E2B865'] }
  ];

  // Section types: name, mobile layouts and what can be added to them.
  var TYPES = {
    header: { title: 'Header', global: true, layouts: [['inline', 'Links beside logo'], ['stacked', 'Links below logo'], ['centered', 'Centred']],
      add: [['link', 'Link', '.hnav'], ['button', 'Button', '.hnav']] },
    hero: { title: 'Hero', layouts: [['stack', 'Image on top'], ['textfirst', 'Text on top'], ['overlay', 'Text over image']],
      add: [['heading', 'Heading', '.hero-text'], ['paragraph', 'Paragraph', '.hero-text'], ['button', 'Button', '.hero-text'], ['image', 'Image', '.hero-media']] },
    features: { title: 'Features', layouts: [['stack', 'Stacked cards'], ['carousel', 'Swipe through'], ['list', 'Compact list']],
      add: [['card', 'Card', '.cards'], ['heading', 'Heading', '.feat-head'], ['paragraph', 'Paragraph', '.feat-head']] },
    gallery: { title: 'Gallery', layouts: [['grid2', 'Two across'], ['single', 'One per row'], ['carousel', 'Swipe through']],
      add: [['image', 'Image', '.gal-grid'], ['heading', 'Heading', '.gal-head'], ['paragraph', 'Paragraph', '.gal-head']] },
    quote: { title: 'Quote', layouts: [['center', 'Centred'], ['left', 'Left aligned'], ['dark', 'Dark band']],
      add: [['paragraph', 'Paragraph', '.quote-fig'], ['button', 'Button', '.quote-fig']] },
    pricing: { title: 'Pricing', layouts: [['stack', 'Stacked'], ['carousel', 'Swipe through'], ['compact', 'Compact']],
      add: [['plan', 'Plan', '.plans'], ['heading', 'Heading', '.price-head'], ['paragraph', 'Paragraph', '.price-head']] },
    faq: { title: 'FAQ', layouts: [['cards', 'Cards'], ['plain', 'Plain list'], ['numbered', 'Numbered']],
      add: [['qa', 'Question', '.faq-list'], ['heading', 'Heading', '.faq-head'], ['paragraph', 'Paragraph', '.faq-head']] },
    newsletter: { title: 'Newsletter', layouts: [['panel', 'Panel'], ['plain', 'Plain'], ['dark', 'Dark band']],
      add: [['heading', 'Heading', '.nl-text'], ['paragraph', 'Paragraph', '.nl-text']] },
    cta: { title: 'Call to action', layouts: [['panel', 'Panel'], ['plain', 'Plain'], ['banner', 'Dark banner']],
      add: [['heading', 'Heading', '.cta-text'], ['paragraph', 'Paragraph', '.cta-text'], ['button', 'Button', '.cta-text']] },
    contact: { title: 'Contact', layouts: [['imagetop', 'Image on top'], ['imagebottom', 'Image below'], ['card', 'Card over image']],
      add: [['heading', 'Heading', '.contact-text'], ['paragraph', 'Paragraph', '.contact-text'], ['button', 'Button', '.contact-text']] },
    footer: { title: 'Footer', global: true, layouts: [['stacked', 'Stacked'], ['twocol', 'Two columns'], ['centered', 'Centred']],
      add: [['fcol', 'Column', '.footer-cols'], ['paragraph', 'Paragraph', '.footer-base']] }
  };
  // Types that can be added as new sections, with a simple diagram for the picker: [x, y, w, h, kind]
  var NEW_TYPES = ['hero', 'features', 'gallery', 'quote', 'pricing', 'faq', 'newsletter', 'cta', 'contact'];
  var DIAGRAMS = {
    hero: [[6, 6, 48, 30, 'i'], [6, 42, 34, 5, 't'], [6, 51, 44, 3, 's'], [6, 58, 18, 6, 'a']],
    features: [[6, 6, 30, 4, 't'], [6, 14, 48, 16, 'i'], [6, 34, 30, 3, 's'], [6, 42, 48, 16, 'i'], [6, 62, 30, 3, 's']],
    gallery: [[6, 6, 30, 4, 't'], [6, 14, 23, 16, 'i'], [31, 14, 23, 16, 'i'], [6, 32, 23, 16, 'i'], [31, 32, 23, 16, 'i'], [6, 50, 23, 16, 'i'], [31, 50, 23, 16, 'i']],
    quote: [[8, 22, 44, 5, 't'], [12, 31, 36, 5, 't'], [20, 42, 20, 3, 's']],
    pricing: [[6, 6, 30, 4, 't'], [6, 14, 48, 22, 'p'], [6, 40, 48, 22, 'p']],
    faq: [[6, 6, 26, 4, 't'], [6, 14, 48, 11, 'p'], [6, 28, 48, 11, 'p'], [6, 42, 48, 11, 'p'], [6, 56, 48, 11, 'p']],
    newsletter: [[6, 14, 48, 44, 'p'], [12, 22, 36, 5, 't'], [12, 31, 30, 3, 's'], [12, 40, 24, 7, 'w'], [38, 40, 10, 7, 'a']],
    cta: [[6, 18, 48, 36, 'p'], [14, 26, 32, 5, 't'], [16, 35, 28, 3, 's'], [22, 43, 16, 6, 'a']],
    contact: [[6, 6, 48, 24, 'i'], [6, 36, 30, 5, 't'], [6, 45, 40, 3, 's'], [6, 51, 32, 3, 's'], [6, 58, 18, 6, 'a']]
  };

  var ICON = {
    layout: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></svg>',
    content: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/></svg>',
    arrange: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6l-3 3 3 3M5 9h9M16 12l3 3-3 3M19 15h-9"/></svg>',
    add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    bin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    heading: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v16M18 4v16M6 12h12"/></svg>',
    paragraph: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 11h16M4 16h11"/></svg>',
    button: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="8" rx="4"/><path d="M9 12h6"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/></svg>',
    card: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 11h16M8 15h8"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    fcol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h5M5 10h4M5 14h5M14 5h5M14 10h4M14 14h5"/></svg>',
    qa: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01"/></svg>',
    plan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>'
  };

  // ---------- State ----------
  var state = { sel: null, mode: null, item: null, sheet: null, layout: {}, palette: {}, img: {} };
  var page = document.getElementById('page');
  var screen = document.getElementById('screen');
  var frame = document.getElementById('frame');
  var dock = document.getElementById('dock');
  var sheet = document.getElementById('sheet');
  var scrim = document.getElementById('scrim');
  var toastEl = document.getElementById('toast');
  var fileInput = document.getElementById('file-input');
  var uid = 0;
  var lastRemoved = null;

  // ---------- Templates ----------
  function newId() { uid += 1; return 's' + uid; }

  function sectionHTML(type, id) {
    var I = function (n) { return ' data-item="' + id + '-' + n + '"'; };
    var T = ' data-text';
    var M = function (n, cls) {
      return '<div class="media ' + (cls || '') + '"' + I(n) + ' data-media><img data-img="' + id + '-' + n + '" alt="" draggable="false"></div>';
    };
    var tag = type === 'header' ? 'header' : type === 'footer' ? 'footer' : 'section';
    var open = '<' + tag + ' class="sec ' + type + '" data-id="' + id + '" data-type="' + type + '" aria-label="' + TYPES[type].title + '">';
    var close = '</' + tag + '>';
    var body = '';
    switch (type) {
      case 'header':
        body = '<div class="inner hdr-inner"><span class="logo"' + I('logo') + T + '>Northfield Ceramics</span><nav class="hnav" aria-label="Main">' +
          '<a href="#"' + I('l1') + T + '>Shop</a><a href="#"' + I('l2') + T + '>Classes</a><a href="#"' + I('l3') + T + '>Visit</a></nav></div>';
        break;
      case 'hero':
        body = '<div class="inner hero-inner"><div class="hero-text"><span class="eyebrow"' + I('tag') + T + '>Handmade in small batches</span>' +
          '<h1' + I('title') + T + '>Stoneware for everyday tables</h1>' +
          '<p class="lead"' + I('body') + T + '>Bowls, mugs and plates thrown on the wheel and glazed by hand in our studio.</p>' +
          '<a href="#" class="btn"' + I('btn') + T + '>Shop the collection</a></div>' +
          '<div class="hero-media">' + M('img') + '</div></div>';
        break;
      case 'features':
        var card = function (n, t, d) {
          return '<article class="card"' + I('c' + n) + '>' + M('c' + n + 'i', 'card-img').replace(' data-item="' + id + '-c' + n + 'i"', '') +
            '<div class="card-text"><h3' + T + '>' + t + '</h3><p' + T + '>' + d + '</p></div></article>';
        };
        body = '<div class="inner"><div class="feat-head"><h2' + I('head') + T + '>What we make</h2></div><div class="cards">' +
          card(1, 'Tableware', 'Plates, bowls and serving pieces built for daily use.') +
          card(2, 'Mugs & cups', 'Comfortable handles and generous sizes, glazed inside and out.') +
          card(3, 'Classes', 'Learn to throw on the wheel in a four-week evening course.') + '</div></div>';
        break;
      case 'gallery':
        var tiles = '';
        for (var g = 1; g <= 6; g++) tiles += M('g' + g, 'gal-img');
        body = '<div class="inner"><div class="gal-head"><h2' + I('head') + T + '>From the studio</h2></div><div class="gal-grid">' + tiles + '</div></div>';
        break;
      case 'quote':
        body = '<div class="inner"><figure class="quote-fig"><blockquote' + I('q') + T + '>“A sentence someone said about the work goes here. Replace it with a real quote.”</blockquote>' +
          '<figcaption' + I('who') + T + '>[Name], [where they’re from]</figcaption></figure></div>';
        break;
      case 'pricing':
        var plan = function (n, name, desc) {
          return '<div class="plan"' + I('p' + n) + '><h3' + T + '>' + name + '</h3><p class="price"' + T + '>[£00]<span> / month</span></p>' +
            '<p' + T + '>' + desc + '</p><a href="#" class="btn"' + T + '>Choose plan</a></div>';
        };
        body = '<div class="inner"><div class="price-head"><h2' + I('head') + T + '>Classes and memberships</h2></div><div class="plans">' +
          plan(1, 'Taster', 'A single evening on the wheel.') + plan(2, 'Course', 'Four weekly sessions with clay and firing included.') +
          plan(3, 'Studio member', 'Open studio time each month.') + '</div></div>';
        break;
      case 'faq':
        var qa = function (n, q) {
          return '<div class="qa"' + I('q' + n) + '><h3' + T + '>' + q + '</h3><p' + T + '>Answer this question here. Switch to Content to change it.</p></div>';
        };
        body = '<div class="inner"><div class="faq-head"><h2' + I('head') + T + '>Questions</h2></div><div class="faq-list">' +
          qa(1, 'Do you ship your pottery?') + qa(2, 'Can I book a private class?') + qa(3, 'Is your stoneware dishwasher safe?') + '</div></div>';
        break;
      case 'newsletter':
        body = '<div class="inner"><div class="nl-panel"><div class="nl-text"><h2' + I('head') + T + '>Hear about new work first</h2>' +
          '<p' + I('body') + T + '>An occasional email when new pieces and class dates go up.</p></div>' +
          '<div class="nl-form"' + I('form') + '><label class="sr-only" for="' + id + '-email">Email address</label>' +
          '<input id="' + id + '-email" type="email" placeholder="Email address" autocomplete="off"><button type="button" class="btn">Sign up</button></div></div></div>';
        break;
      case 'cta':
        body = '<div class="inner"><div class="cta-panel"><div class="cta-text"><h2' + I('title') + T + '>Visit the open studio</h2>' +
          '<p' + I('body') + T + '>See the kilns, meet the makers and browse seconds at reduced prices.</p>' +
          '<a href="#" class="btn"' + I('btn') + T + '>Plan your visit</a></div></div></div>';
        break;
      case 'contact':
        body = '<div class="inner contact-inner"><div class="contact-media">' + M('img') + '</div><div class="contact-text">' +
          '<h2' + I('head') + T + '>Find the studio</h2><p' + I('addr') + T + '>[Street address], [Town], [Postcode]</p>' +
          '<p' + I('hours') + T + '>Open [days], [opening hours]</p><a href="#" class="btn"' + I('btn') + T + '>Get directions</a></div></div>';
        break;
      case 'footer':
        var col = function (n, h, links) {
          return '<div class="footer-col"' + I('col' + n) + '><h2' + T + '>' + h + '</h2>' +
            links.map(function (l) { return '<a href="#"' + T + '>' + l + '</a>'; }).join('') + '</div>';
        };
        body = '<div class="inner footer-inner"><div class="footer-brand"' + I('brand') + '><span class="logo"' + T + '>Northfield Ceramics</span>' +
          '<p' + T + '>Stoneware for everyday tables, thrown and glazed by hand in our studio.</p></div><div class="footer-cols">' +
          col(1, 'Explore', ['Shop', 'Classes', 'Visit the studio']) + col(2, 'Contact', ['[email address]', '[phone number]']) + '</div>' +
          '<div class="footer-base"><span' + I('copy') + T + '>© Northfield Ceramics</span><span' + I('credit') + T + '>Photos from Unsplash</span></div></div>';
        break;
    }
    return open + body + close;
  }

  function itemHTML(type, key) {
    var d = ' data-item="' + key + '" data-added';
    switch (type) {
      case 'heading': return '<h2' + d + ' data-text>New heading</h2>';
      case 'paragraph': return '<p class="added-p"' + d + ' data-text>A new paragraph. Switch to Content to change this text.</p>';
      case 'button': return '<a href="#" class="btn"' + d + ' data-text>New button</a>';
      case 'link': return '<a href="#"' + d + ' data-text>New link</a>';
      case 'image': return '<div class="media"' + d + ' data-media><img data-img="' + key + '" alt="" draggable="false"></div>';
      case 'card': return '<article class="card"' + d + '><div class="media card-img" data-media><img data-img="' + key + 'i" alt="" draggable="false"></div>' +
        '<div class="card-text"><h3 data-text>New card</h3><p data-text>Describe this card here.</p></div></article>';
      case 'plan': return '<div class="plan"' + d + '><h3 data-text>New plan</h3><p class="price" data-text>[£00]<span> / month</span></p>' +
        '<p data-text>What’s included in this plan.</p><a href="#" class="btn" data-text>Choose plan</a></div>';
      case 'qa': return '<div class="qa"' + d + '><h3 data-text>A new question?</h3><p data-text>The answer goes here.</p></div>';
      case 'fcol': return '<div class="footer-col"' + d + '><h2 data-text>New column</h2><a href="#" data-text>First link</a><a href="#" data-text>Second link</a></div>';
    }
    return '';
  }

  // ---------- Building the page ----------
  function makeSection(type) {
    var id = newId();
    var wrap = document.createElement('div');
    wrap.innerHTML = sectionHTML(type, id);
    var sec = wrap.firstChild;
    sec.insertAdjacentHTML('afterbegin', '<span class="sectab" aria-hidden="true">' +
      (TYPES[type].global ? ICON.globe + TYPES[type].title + '<span class="tabnote"> · shown on every page</span>' : TYPES[type].title) + '</span>');
    var n = 0;
    sec.querySelectorAll('img[data-img]').forEach(function (img) { state.img[img.dataset.img] = (uid + n++) % IMAGES.length; });
    return sec;
  }

  ['header', 'hero', 'features', 'gallery', 'quote', 'pricing', 'faq', 'newsletter', 'cta', 'contact', 'footer'].forEach(function (t) {
    page.appendChild(makeSection(t));
  });
  // A little variety to start with.
  state.layout[page.querySelector('.quote').dataset.id] = 'dark';
  state.layout[page.querySelector('.cta').dataset.id] = 'panel';

  function sections() { return Array.prototype.slice.call(page.querySelectorAll('.sec')); }
  function bodySections() { return sections().filter(function (s) { return !TYPES[s.dataset.type].global; }); }
  function typeOf(sec) { return TYPES[sec.dataset.type]; }
  function layoutOf(sec) { return state.layout[sec.dataset.id] || typeOf(sec).layouts[0][0]; }
  function paletteOf(sec) { return state.palette[sec.dataset.id] || 'default'; }

  // ---------- Rendering ----------
  function render() {
    sections().forEach(function (sec) {
      var on = sec === state.sel;
      sec.classList.toggle('selected', on);
      sec.dataset.layout = layoutOf(sec);
      sec.dataset.palette = paletteOf(sec);
      sec.dataset.mode = on && state.mode ? state.mode : '';
      var editing = on && state.mode === 'content';
      sec.querySelectorAll('[data-text]').forEach(function (el) { el.contentEditable = editing ? 'true' : 'false'; });
    });
    page.querySelectorAll('.item-on').forEach(function (el) { el.classList.remove('item-on'); });
    if (state.item && state.item.isConnected) state.item.classList.add('item-on');
    page.querySelectorAll('img[data-img]').forEach(function (img) {
      var v = state.img[img.dataset.img];
      var pic = typeof v === 'object' && v ? v : IMAGES[(v || 0) % IMAGES.length];
      if (img.getAttribute('src') !== pic.src) img.setAttribute('src', pic.src);
      img.alt = pic.alt;
    });
    renderDock();
    if (state.sheet) renderSheet();
  }

  // ---------- Selecting ----------
  function select(sec) {
    if (state.sel === sec) return;
    state.sel = sec;
    state.mode = null;
    state.item = null;
    closeSheet();
    render();
  }

  function setMode(mode) {
    state.mode = mode;
    state.item = null;
    if (mode === 'layout') {
      state.sel._snap = { layout: layoutOf(state.sel), palette: paletteOf(state.sel) };
      openSheet('layout');
      scrollToSection(state.sel);
    } else {
      closeSheet();
    }
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    render();
  }

  function exitMode() {
    state.mode = null;
    state.item = null;
    closeSheet();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    render();
  }

  function scrollToSection(sec) {
    screen.scrollTo({ top: Math.max(0, sec.offsetTop - 8), behavior: 'smooth' });
  }

  // Taps on the page
  screen.addEventListener('click', function (e) {
    if (e.target.closest('a')) e.preventDefault();
    var sec = e.target.closest('.sec');
    if (sec && sec === state.sel && state.mode === 'content') {
      var media = e.target.closest('[data-media]');
      if (media) { state.item = media.closest('[data-item]') || media; openSheet('image', media); render(); return; }
      state.item = e.target.closest('[data-item]');
      renderDock();
      return;
    }
    if (sec && sec === state.sel && state.mode === 'arrange') {
      var it = e.target.closest('[data-item]');
      state.item = it && it.parentElement ? it : null;
      render();
      return;
    }
    if (state.mode === 'layout' && sec === state.sel) return;
    if (state.mode) exitMode();
    select(sec || null);
  });

  // In Content mode, remember which item the cursor is in so it can be removed.
  screen.addEventListener('focusin', function (e) {
    if (state.mode !== 'content') return;
    var it = e.target.closest && e.target.closest('[data-item]');
    if (it) { state.item = it; renderDock(); }
  });

  // ---------- Bottom dock ----------
  function dockButton(act, icon, label, extra) {
    return '<button type="button" class="dbtn' + (extra || '') + '" data-act="' + act + '">' + ICON[icon] + '<span>' + label + '</span></button>';
  }

  function renderDock() {
    var sec = state.sel;
    var showDock = !!sec && state.mode !== 'layout';
    dock.hidden = !showDock;
    frame.classList.toggle('has-dock', showDock || !!state.sheet);
    if (!showDock) return;
    var t = typeOf(sec);
    var html = '';
    if (!state.mode) {
      html = '<div class="dock-row">' +
        dockButton('mode-layout', 'layout', 'Layout') + dockButton('mode-content', 'content', 'Content') +
        dockButton('mode-arrange', 'arrange', 'Arrange') + dockButton('sheet-add', 'add', 'Add') +
        dockButton('sheet-more', 'more', 'More') + '</div>';
    } else if (state.mode === 'content') {
      var canRemove = state.item && state.item.isConnected;
      html = '<div class="dock-bar"><span class="dock-hint">' +
        (t.global ? ICON.globe + 'Editing the ' + t.title.toLowerCase() + ' on every page' : 'Tap text to type, or a photo to replace it') + '</span>' +
        '<button type="button" class="dock-icon" data-act="remove-item" aria-label="Remove selected item"' + (canRemove ? '' : ' disabled') + '>' + ICON.bin + '</button>' +
        '<button type="button" class="dock-done" data-act="exit">Done</button></div>';
    } else if (state.mode === 'arrange') {
      var it = state.item && state.item.isConnected ? state.item : null;
      var prev = it && siblingItem(it, -1), next = it && siblingItem(it, 1);
      html = '<div class="dock-bar"><span class="dock-hint">' + (it ? 'Move the selected item' : 'Tap an item to move it') + '</span>' +
        '<button type="button" class="dock-icon" data-act="item-up" aria-label="Move item up"' + (prev ? '' : ' disabled') + '>' + ICON.up + '</button>' +
        '<button type="button" class="dock-icon" data-act="item-down" aria-label="Move item down"' + (next ? '' : ' disabled') + '>' + ICON.down + '</button>' +
        '<button type="button" class="dock-icon" data-act="remove-item" aria-label="Remove item"' + (it ? '' : ' disabled') + '>' + ICON.bin + '</button>' +
        '<button type="button" class="dock-done" data-act="exit">Done</button></div>' +
        '<p class="dock-note">Free positioning is available when editing on a larger screen.</p>';
    }
    dock.innerHTML = html;
  }

  function siblingItem(el, dir) {
    var n = dir < 0 ? el.previousElementSibling : el.nextElementSibling;
    while (n && !n.hasAttribute('data-item')) n = dir < 0 ? n.previousElementSibling : n.nextElementSibling;
    return n;
  }

  dock.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || b.disabled) return;
    var act = b.dataset.act;
    if (act === 'mode-layout') setMode('layout');
    else if (act === 'mode-content') setMode('content');
    else if (act === 'mode-arrange') setMode('arrange');
    else if (act === 'sheet-add') openSheet('add');
    else if (act === 'sheet-more') openSheet('more');
    else if (act === 'exit') exitMode();
    else if (act === 'remove-item') removeItem(state.item);
    else if (act === 'item-up' || act === 'item-down') moveItem(state.item, act === 'item-up' ? -1 : 1);
  });
  // Keep the dock's buttons from stealing focus from the text being edited.
  dock.addEventListener('pointerdown', function (e) { if (state.mode === 'content' && e.target.closest('button')) e.preventDefault(); });

  // ---------- Items ----------
  function moveItem(it, dir) {
    var other = siblingItem(it, dir);
    if (!other) return;
    if (dir < 0) other.parentNode.insertBefore(it, other);
    else other.parentNode.insertBefore(it, other.nextSibling);
    it.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    render();
  }

  function removeItem(it) {
    if (!it || !it.isConnected) return;
    var ph = document.createComment('removed');
    it.replaceWith(ph);
    it.classList.remove('item-on');
    lastRemoved = { el: it, ph: ph };
    state.item = null;
    closeSheetIf('image');
    render();
    toast('Item removed', 'Undo', undoRemove);
  }

  function undoRemove() {
    if (!lastRemoved) return;
    lastRemoved.ph.replaceWith(lastRemoved.el);
    lastRemoved = null;
    render();
  }

  var addCount = 0;
  function addItem(sec, spec) {
    addCount += 1;
    var key = sec.dataset.id + '-n' + addCount;
    var wrap = document.createElement('div');
    wrap.innerHTML = itemHTML(spec[0], key);
    var el = wrap.firstChild;
    var into = sec.querySelector(spec[2]);
    into.appendChild(el);
    el.querySelectorAll('img[data-img]').forEach(function (img) { state.img[img.dataset.img] = addCount % IMAGES.length; });
    el.classList.add('fresh');
    setTimeout(function () { el.classList.remove('fresh'); }, 1000);
    closeSheet();
    render();
    setTimeout(function () { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 50);
  }

  // ---------- Sections ----------
  function moveSection(sec, dir) {
    var list = bodySections();
    var i = list.indexOf(sec), j = i + dir;
    if (j < 0 || j >= list.length) return;
    if (dir < 0) page.insertBefore(sec, list[j]); else page.insertBefore(sec, list[j].nextSibling);
    closeSheet();
    render();
    setTimeout(function () { scrollToSection(sec); flash(sec); }, 30);
  }

  function duplicateSection(sec) {
    var id = newId();
    var copy = sec.cloneNode(true);
    var old = sec.dataset.id;
    copy.dataset.id = id;
    copy.classList.remove('selected');
    copy.querySelectorAll('[contenteditable]').forEach(function (n) { n.removeAttribute('contenteditable'); });
    copy.querySelectorAll('.item-on, .fresh').forEach(function (n) { n.classList.remove('item-on', 'fresh'); });
    copy.querySelectorAll('[data-item]').forEach(function (n) { n.dataset.item = n.dataset.item.replace(old, id); });
    copy.querySelectorAll('[data-img]').forEach(function (n) {
      var nk = n.dataset.img.replace(old, id);
      state.img[nk] = state.img[n.dataset.img];
      n.dataset.img = nk;
    });
    copy.querySelectorAll('[id]').forEach(function (n) { n.id = n.id.replace(old, id); });
    copy.querySelectorAll('[for]').forEach(function (n) { n.setAttribute('for', n.getAttribute('for').replace(old, id)); });
    state.layout[id] = layoutOf(sec);
    state.palette[id] = paletteOf(sec);
    page.insertBefore(copy, sec.nextSibling);
    closeSheet();
    state.sel = copy;
    render();
    setTimeout(function () { scrollToSection(copy); flash(copy); }, 30);
    toast(typeOf(sec).title + ' duplicated');
  }

  function deleteSection(sec) {
    var ph = document.createComment('deleted section');
    sec.replaceWith(ph);
    lastRemoved = { el: sec, ph: ph };
    closeSheet();
    state.sel = null;
    state.mode = null;
    render();
    toast(typeOf(sec).title + ' deleted', 'Undo', function () {
      undoRemove();
      select(sec);
      scrollToSection(sec);
    });
  }

  function addSection(type, after) {
    var sec = makeSection(type);
    page.insertBefore(sec, after ? after.nextSibling : page.querySelector('.footer'));
    closeSheet();
    state.sel = sec;
    state.mode = null;
    render();
    setTimeout(function () { scrollToSection(sec); flash(sec); }, 30);
  }

  function flash(sec) {
    sec.classList.remove('flash');
    void sec.offsetWidth;
    sec.classList.add('flash');
  }

  // ---------- Sheets ----------
  var sheetTarget = null;
  function openSheet(kind, target) {
    state.sheet = kind;
    sheetTarget = target || null;
    sheet.hidden = false;
    sheet.dataset.kind = kind;
    // The layout sheet keeps the section in view above it; the others dim the page.
    scrim.hidden = kind === 'layout';
    renderSheet();
    renderDock();
  }
  function closeSheet() {
    state.sheet = null;
    sheetTarget = null;
    sheet.hidden = true;
    scrim.hidden = true;
    frame.classList.toggle('has-dock', !!state.sel);
  }
  function closeSheetIf(kind) { if (state.sheet === kind) closeSheet(); }

  scrim.addEventListener('click', function () { closeSheet(); render(); });

  function previewHTML(sec, layout) {
    // A miniature copy of the section in the given layout.
    var copy = document.createElement('div');
    copy.className = 'mini-sec ' + sec.dataset.type;
    copy.dataset.layout = layout;
    copy.dataset.palette = paletteOf(sec);
    copy.innerHTML = sec.innerHTML;
    copy.querySelectorAll('.sectab').forEach(function (n) { n.remove(); });
    copy.querySelectorAll('*').forEach(function (n) {
      ['data-item', 'data-img', 'data-text', 'data-media', 'contenteditable', 'id', 'for'].forEach(function (a) { n.removeAttribute(a); });
      n.classList.remove('item-on', 'fresh');
    });
    return copy;
  }

  function renderSheet() {
    var sec = state.sel;
    var kind = state.sheet;
    var title = document.getElementById('sheet-title');
    var actions = document.getElementById('sheet-actions');
    var body = document.getElementById('sheet-body');
    if (!sec && kind !== null) { closeSheet(); return; }
    var t = typeOf(sec);
    var note = t.global ? '<p class="sheet-note">' + ICON.globe + 'You’re editing the ' + t.title.toLowerCase() + ' on every page of your site.</p>' : '';

    if (kind === 'layout') {
      var changed = sec._snap && (sec._snap.layout !== layoutOf(sec) || sec._snap.palette !== paletteOf(sec));
      title.textContent = t.title + ' layout';
      actions.innerHTML = '<button type="button" class="sbtn-ghost" data-act="layout-reset"' + (changed ? '' : ' disabled') + '>Reset</button>' +
        '<button type="button" class="sbtn-primary" data-act="exit">Done</button>';
      body.innerHTML = note + '<div class="lay-row" role="group" aria-label="Layouts"></div>' +
        '<h3 class="sheet-sub">Colours</h3><div class="pal-row" role="group" aria-label="Colour palette">' +
        PALETTES.map(function (p) {
          return '<button type="button" class="pal" data-palette="' + p.id + '" aria-pressed="' + (paletteOf(sec) === p.id) + '">' +
            '<span class="palsw" aria-hidden="true">' + p.sw.map(function (c) { return '<span style="background:' + c + '"></span>'; }).join('') + '</span>' + p.label + '</button>';
        }).join('') + '</div>';
      var row = body.querySelector('.lay-row');
      var w = screen.clientWidth;
      t.layouts.forEach(function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'lay';
        b.dataset.layout = l[0];
        b.setAttribute('aria-pressed', String(layoutOf(sec) === l[0]));
        b.setAttribute('aria-label', l[1]);
        b.innerHTML = '<span class="lay-th" aria-hidden="true" inert></span><span class="lay-label">' + l[1] + '</span>';
        row.appendChild(b);
        var th = b.querySelector('.lay-th');
        var stage = document.createElement('span');
        stage.className = 'lay-stage';
        stage.style.width = w + 'px';
        stage.appendChild(previewHTML(sec, l[0]));
        th.appendChild(stage);
        var k = th.clientWidth / w;
        stage.style.transform = 'scale(' + k + ')';
        // Short sections (like the header) get shorter previews, so they aren't mostly empty.
        th.style.height = Math.max(44, Math.min(150, Math.ceil(stage.offsetHeight * k))) + 'px';
      });
      var cur = row.querySelector('[aria-pressed="true"]');
      if (cur) row.scrollLeft = Math.max(0, cur.offsetLeft - 16);
    } else if (kind === 'add') {
      title.textContent = 'Add';
      actions.innerHTML = '<button type="button" class="sbtn-icon" data-act="close" aria-label="Close">' + ICON.close + '</button>';
      var addTo = '<h3 class="sheet-sub">To this ' + (t.global ? t.title.toLowerCase() : 'section') + '</h3><div class="add-grid">' +
        t.add.map(function (a, i) { return '<button type="button" class="add-btn" data-add="' + i + '">' + ICON[a[0]] + '<span>' + a[1] + '</span></button>'; }).join('') + '</div>';
      var newSec = sec.dataset.type === 'header' || !t.global
        ? '<h3 class="sheet-sub">New section ' + (sec.dataset.type === 'header' ? 'at the top of the page' : 'below this one') + '</h3><div class="type-grid">' +
          NEW_TYPES.map(function (nt) {
            return '<button type="button" class="type-btn" data-new="' + nt + '"><span class="type-th" aria-hidden="true">' +
              DIAGRAMS[nt].map(function (r) { return '<span class="d-' + r[4] + '" style="left:' + r[0] + 'px;top:' + r[1] + 'px;width:' + r[2] + 'px;height:' + r[3] + 'px"></span>'; }).join('') +
              '</span><span>' + TYPES[nt].title + '</span></button>';
          }).join('') + '</div>'
        : '';
      body.innerHTML = note + addTo + newSec;
    } else if (kind === 'more') {
      title.textContent = t.title;
      actions.innerHTML = '<button type="button" class="sbtn-icon" data-act="close" aria-label="Close">' + ICON.close + '</button>';
      if (t.global) {
        body.innerHTML = note + '<p class="sheet-text">The ' + t.title.toLowerCase() + ' stays at the ' + (sec.dataset.type === 'header' ? 'top' : 'bottom') +
          ' of every page, so it can’t be moved, duplicated or deleted.</p>';
      } else {
        var list = bodySections(), i = list.indexOf(sec);
        body.innerHTML = '<div class="act-list">' +
          '<button type="button" class="act" data-act="sec-up"' + (i > 0 ? '' : ' disabled') + '>' + ICON.up + 'Move up</button>' +
          '<button type="button" class="act" data-act="sec-down"' + (i < list.length - 1 ? '' : ' disabled') + '>' + ICON.down + 'Move down</button>' +
          '<button type="button" class="act" data-act="sec-dup">' + ICON.copy + 'Duplicate</button>' +
          '<button type="button" class="act danger" data-act="sec-del">' + ICON.bin + 'Delete section</button></div>';
      }
    } else if (kind === 'image') {
      title.textContent = 'Replace image';
      actions.innerHTML = '<button type="button" class="sbtn-icon" data-act="close" aria-label="Close">' + ICON.close + '</button>';
      body.innerHTML = '<button type="button" class="act" data-act="pick-file">' + ICON.phone + 'Choose from your device</button>' +
        '<h3 class="sheet-sub">Or pick a photo</h3><div class="photo-grid">' +
        IMAGES.map(function (im, i) { return '<button type="button" class="photo" data-photo="' + i + '" aria-label="' + im.alt + '"><img src="' + im.src + '" alt=""></button>'; }).join('') +
        '</div><button type="button" class="act danger" data-act="remove-item">' + ICON.bin + 'Remove image</button>';
    }
  }

  sheet.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || b.disabled) return;
    var sec = state.sel;
    var t = sec && typeOf(sec);
    if (b.dataset.act === 'exit') { exitMode(); return; }
    if (b.dataset.act === 'close') { closeSheet(); render(); return; }
    if (b.dataset.act === 'layout-reset') {
      state.layout[sec.dataset.id] = sec._snap.layout;
      state.palette[sec.dataset.id] = sec._snap.palette;
      render();
      return;
    }
    if (b.classList.contains('lay')) { state.layout[sec.dataset.id] = b.dataset.layout; render(); return; }
    if (b.classList.contains('pal')) { state.palette[sec.dataset.id] = b.dataset.palette; render(); return; }
    if (b.dataset.add) { addItem(sec, t.add[+b.dataset.add]); return; }
    if (b.dataset.new) { addSection(b.dataset.new, sec); return; }
    if (b.dataset.act === 'sec-up') { moveSection(sec, -1); return; }
    if (b.dataset.act === 'sec-down') { moveSection(sec, 1); return; }
    if (b.dataset.act === 'sec-dup') { duplicateSection(sec); return; }
    if (b.dataset.act === 'sec-del') { deleteSection(sec); return; }
    if (b.dataset.photo !== undefined && sheetTarget) {
      var img = sheetTarget.querySelector('img[data-img]');
      state.img[img.dataset.img] = +b.dataset.photo;
      closeSheet();
      render();
      return;
    }
    if (b.dataset.act === 'pick-file') { fileInput.click(); return; }
    if (b.dataset.act === 'remove-item') { removeItem(sheetTarget && (sheetTarget.closest('[data-item]') || sheetTarget)); }
  });

  // A photo from the device replaces the image (kept in memory only).
  fileInput.addEventListener('change', function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f || !sheetTarget) return;
    var img = sheetTarget.querySelector('img[data-img]');
    state.img[img.dataset.img] = { src: URL.createObjectURL(f), alt: 'Your photo' };
    fileInput.value = '';
    closeSheet();
    render();
  });

  // ---------- Toast ----------
  var toastTimer = null;
  function toast(msg, actionLabel, action) {
    toastEl.innerHTML = '<span></span>' + (actionLabel ? '<button type="button"></button>' : '');
    toastEl.firstChild.textContent = msg;
    if (actionLabel) {
      toastEl.lastChild.textContent = actionLabel;
      toastEl.lastChild.onclick = function () { toastEl.classList.remove('show'); action(); };
    }
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 5000);
  }

  document.getElementById('reset-all').addEventListener('click', function () { window.location.reload(); });

  // Keep the dock above the on-screen keyboard on phones.
  if (window.visualViewport) {
    var fit = function () {
      if (window.innerWidth > 600) { frame.style.height = ''; return; }
      frame.style.height = window.visualViewport.height + 'px';
    };
    window.visualViewport.addEventListener('resize', fit);
    fit();
  }

  render();
})();
