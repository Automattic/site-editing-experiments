(function () {
  'use strict';

  // ---------- Data ----------
  var IMG = '../albers/images/';
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
    header: { title: 'Header', global: true, layouts: [['inline', 'Links beside logo', 'logo left, links right'], ['stacked', 'Links below logo', 'links under the logo'], ['centered', 'Centred', 'centred']],
      add: [['link', 'Link', '.hnav'], ['button', 'Button', '.hnav']] },
    hero: { title: 'Hero', layouts: [['stack', 'Image on top', 'image left, text right'], ['textfirst', 'Text on top', 'text left, image right'], ['overlay', 'Text over image', 'full-width image']],
      add: [['heading', 'Heading', '.hero-text'], ['paragraph', 'Paragraph', '.hero-text'], ['button', 'Button', '.hero-text'], ['image', 'Image', '.hero-media']] },
    features: { title: 'Features', layouts: [['stack', 'Stacked cards', 'three columns'], ['carousel', 'Swipe through', 'a row of cards'], ['list', 'Compact list', 'two-column list']],
      add: [['card', 'Card', '.cards'], ['heading', 'Heading', '.feat-head'], ['paragraph', 'Paragraph', '.feat-head']] },
    gallery: { title: 'Gallery', layouts: [['grid2', 'Two across', 'three across'], ['single', 'One per row', 'two large across'], ['carousel', 'Swipe through', 'one long row']],
      add: [['image', 'Image', '.gal-grid'], ['heading', 'Heading', '.gal-head'], ['paragraph', 'Paragraph', '.gal-head']] },
    quote: { title: 'Quote', layouts: [['center', 'Centred', 'centred'], ['left', 'Left aligned', 'left aligned'], ['dark', 'Dark band', 'dark band']],
      add: [['paragraph', 'Paragraph', '.quote-fig'], ['button', 'Button', '.quote-fig']] },
    pricing: { title: 'Pricing', layouts: [['stack', 'Stacked', 'side by side'], ['carousel', 'Swipe through', 'side by side'], ['compact', 'Compact', 'rows']],
      add: [['plan', 'Plan', '.plans'], ['heading', 'Heading', '.price-head'], ['paragraph', 'Paragraph', '.price-head']] },
    faq: { title: 'FAQ', layouts: [['cards', 'Cards', 'two columns of cards'], ['plain', 'Plain list', 'one narrow column'], ['numbered', 'Numbered', 'two numbered columns']],
      add: [['qa', 'Question', '.faq-list'], ['heading', 'Heading', '.faq-head'], ['paragraph', 'Paragraph', '.faq-head']] },
    newsletter: { title: 'Newsletter', layouts: [['panel', 'Panel', 'text and form side by side'], ['plain', 'Plain', 'centred'], ['dark', 'Dark band', 'dark, side by side']],
      add: [['heading', 'Heading', '.nl-text'], ['paragraph', 'Paragraph', '.nl-text']] },
    cta: { title: 'Call to action', layouts: [['panel', 'Panel', 'centred panel'], ['plain', 'Plain', 'centred'], ['banner', 'Dark banner', 'button on the right']],
      add: [['heading', 'Heading', '.cta-text'], ['paragraph', 'Paragraph', '.cta-text'], ['button', 'Button', '.cta-text']] },
    contact: { title: 'Contact', layouts: [['imagetop', 'Image on top', 'text left, image right'], ['imagebottom', 'Image below', 'image left, text right'], ['card', 'Card over image', 'card over a wide image']],
      add: [['heading', 'Heading', '.contact-text'], ['paragraph', 'Paragraph', '.contact-text'], ['button', 'Button', '.contact-text']] },
    footer: { title: 'Footer', global: true, layouts: [['stacked', 'Stacked', 'columns in a row'], ['twocol', 'Two columns', 'brand beside two columns'], ['centered', 'Centred', 'centred']],
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
    desktop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
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
  var state = { sel: null, mode: null, item: null, sheet: null, layout: {}, palette: {}, img: {}, view: 'phone', tools: 'bottom' };
  var page = document.getElementById('page');
  var stage = document.getElementById('stage');
  var deskbar = document.getElementById('deskbar');
  var handlesEl = document.getElementById('handles');
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
          '<div class="nl-form"' + I('form') + '><span class="nl-field"' + T + '>Email address</span>' +
          '<span class="btn" role="button"' + T + '>Sign up</span></div></div></div>';
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

  // ---------- Phone and desktop views ----------
  // The desktop view lays the same page out at desktop width and zooms out to fit the screen.
  var DESKTOP_W = 1280;
  // On a computer (a wide window), the desktop view is a full-size editor with the same tools,
  // in a floating bar at the bottom. On a phone it's a zoomed-out preview; tapping it goes back to
  // the phone view to edit.
  function deskEdit() { return state.view === 'desktop' && frame.classList.contains('wide'); }
  function setView(v) {
    if (v === state.view) return;
    state.view = v;
    frame.classList.toggle('desk', v === 'desktop');
    document.querySelectorAll('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === v)); });
    state.mode = null; state.item = null;
    closeSheet();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    fitView();
    if (v === 'desktop' && !deskEdit()) state.sel = null;
    render();
    if (state.sel) { var sec = state.sel; setTimeout(function () { scrollToSection(sec); flash(sec); }, 30); }
    else screen.scrollTop = 0;
  }
  function fitView() {
    var wide = state.view === 'desktop' && window.innerWidth >= 1000;
    frame.classList.toggle('wide', wide);
    document.body.classList.toggle('desk-wide', wide);
    deskbar.hidden = !(state.view === 'desktop' && !wide);
    if (state.view === 'desktop' && !(wide && screen.clientWidth >= 960)) {
      var k = screen.clientWidth / DESKTOP_W;
      page.style.width = DESKTOP_W + 'px';
      page.style.transform = 'scale(' + k + ')';
      stage.style.height = Math.ceil(page.offsetHeight * k) + 'px';
    } else {
      page.style.width = page.style.transform = stage.style.height = '';
    }
    if (state.view === 'desktop' && !wide && state.sel) { state.sel = null; state.mode = null; state.item = null; closeSheet(); render(); }
    placeDock();
  }
  window.addEventListener('resize', fitView);
  page.addEventListener('load', fitView, true);
  document.querySelectorAll('[data-view]').forEach(function (b) {
    b.addEventListener('click', function () { setView(b.dataset.view); });
  });

  // Taps on the page
  screen.addEventListener('click', function (e) {
    if (e.target.closest('a')) e.preventDefault();
    var sec = e.target.closest('.sec');
    // In the desktop preview, tapping a section goes back to the phone view to edit it.
    if (state.view === 'desktop' && !deskEdit()) {
      setView('phone');
      if (sec) { select(sec); setTimeout(function () { scrollToSection(sec); flash(sec); }, 30); }
      return;
    }
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
  function dockButton(act, icon, label, key) {
    return '<button type="button" class="dbtn" data-act="' + act + '"' + (key ? ' aria-keyshortcuts="' + key + '"' : '') + '>' + ICON[icon] +
      '<span>' + label + (key ? '<kbd class="kbd" aria-hidden="true">' + key + '</kbd>' : '') + '</span></button>';
  }

  function renderDock() {
    var sec = state.sel;
    var showDock = !!sec && state.mode !== 'layout';
    dock.hidden = !showDock;
    frame.classList.toggle('has-dock', showDock || !!state.sheet);
    if (!showDock) { placeDock(); return; }
    var t = typeOf(sec);
    var html = '';
    if (!state.mode) {
      html = '<div class="dock-row">' +
        dockButton('mode-layout', 'layout', 'Layout', 'L') + dockButton('mode-content', 'content', 'Content', 'C') +
        dockButton('mode-arrange', 'arrange', 'Arrange', 'A') + dockButton('sheet-add', 'add', 'Add') +
        dockButton('sheet-more', 'more', 'More') + '</div>';
    } else if (state.mode === 'content') {
      var canRemove = state.item && state.item.isConnected;
      html = '<div class="dock-bar"><span class="dock-hint">' +
        (t.global ? ICON.globe + 'Editing the ' + t.title.toLowerCase() + ' on every page' : (deskEdit() ? 'Click' : 'Tap') + ' text to type, or a photo to replace it') + '</span>' +
        '<button type="button" class="dock-icon" data-act="remove-item" aria-label="Remove selected item"' + (canRemove ? '' : ' disabled') + '>' + ICON.bin + '</button>' +
        '<button type="button" class="dock-done" data-act="exit">Done</button></div>';
    } else if (state.mode === 'arrange') {
      var it = state.item && state.item.isConnected ? state.item : null;
      var prev = it && siblingItem(it, -1), next = it && siblingItem(it, 1);
      html = '<div class="dock-bar"><span class="dock-hint">' + (deskEdit() ? (it ? 'Drag to move it, or use the arrows' : 'Drag an item to move it') : (it ? 'Hold and drag it, or use the arrows' : 'Hold an item, then drag it')) + '</span>' +
        '<button type="button" class="dock-icon" data-act="item-up" aria-label="Move item up"' + (prev ? '' : ' disabled') + '>' + ICON.up + '</button>' +
        '<button type="button" class="dock-icon" data-act="item-down" aria-label="Move item down"' + (next ? '' : ' disabled') + '>' + ICON.down + '</button>' +
        '<button type="button" class="dock-icon" data-act="remove-item" aria-label="Remove item"' + (it ? '' : ' disabled') + '>' + ICON.bin + '</button>' +
        '<button type="button" class="dock-done" data-act="exit">Done</button></div>' +
        (deskEdit() ? '' : '<p class="dock-note">Free positioning is available when editing on a larger screen.</p>');
    }
    if (state.tools !== 'bottom' || deskEdit()) {
      html = '<div class="dock-name">' + (t.global ? ICON.globe + t.title + '<span class="tabnote"> · shown on every page</span>' : t.title) + '</div>' + html;
    }
    dock.innerHTML = html;
    placeDock();
  }

  // ---------- Where the tools go: bottom, top of the section, or right of the section ----------
  // Top: the toolbar sits at the top of the selected section and sticks to the top of the screen
  // while you scroll through it. Right: a narrow column on the right of the section, kept in the
  // middle of whatever part of the section is on screen. Either way the section makes room for the
  // toolbar, so it doesn't cover anything you might want to tap.
  function placeDock() {
    // On a computer, the bar sits at the bottom of the selected section, and sticks to the bottom of the
    // window while the section's end is out of view.
    var mode = deskEdit() ? 'deskbottom' : state.view === 'desktop' ? 'bottom' : state.tools;
    var on = mode !== 'bottom' && !dock.hidden && !!state.sel && state.sel.isConnected;
    var gap = mode === 'deskbottom' ? 16 : 8;
    var h = on ? dock.offsetHeight : 0, w = on ? dock.offsetWidth : 0;
    sections().forEach(function (s) {
      var sel = on && s === state.sel;
      var pt = sel && mode === 'section' ? (h + gap * 2) + 'px' : '';
      var pr = sel && mode === 'right' ? (w + gap * 2) + 'px' : '';
      var pb = sel && mode === 'deskbottom' ? (h + gap * 2) + 'px' : '';
      if (s.style.paddingTop !== pt) s.style.paddingTop = pt;
      if (s.style.paddingRight !== pr) s.style.paddingRight = pr;
      if (s.style.paddingBottom !== pb) s.style.paddingBottom = pb;
    });
    positionHandles();
    if (!on) { dock.style.top = ''; sheet.style.bottom = sheet.style.maxHeight = ''; return; }
    var fr = frame.getBoundingClientRect(), sr = screen.getBoundingClientRect(), r = state.sel.getBoundingClientRect();
    var top;
    if (mode !== 'deskbottom') sheet.style.bottom = sheet.style.maxHeight = '';
    if (mode === 'deskbottom') {
      top = Math.min(r.bottom - fr.top - h - gap, sr.bottom - fr.top - h - 20);
      top = Math.max(top, r.top - fr.top + gap);
      // Add, More and photo panels open just above the bar.
      sheet.style.bottom = Math.round(fr.height - top + 10) + 'px';
      sheet.style.maxHeight = Math.max(240, Math.round(top - (sr.top - fr.top) - 20)) + 'px';
    } else if (mode === 'section') {
      top = Math.min(Math.max(r.top - fr.top + gap, sr.top - fr.top + gap), r.bottom - fr.top - h - gap);
    } else {
      var mid = (Math.max(r.top, sr.top) + Math.min(r.bottom, sr.bottom)) / 2 - fr.top;
      top = Math.min(mid - h / 2, r.bottom - fr.top - h - gap);
      top = Math.max(top, r.top - fr.top + gap);
    }
    dock.style.top = Math.round(top) + 'px';
  }
  screen.addEventListener('scroll', placeDock, { passive: true });
  window.addEventListener('resize', placeDock);

  function setTools(v) {
    state.tools = v;
    try { localStorage.setItem('mse-tools', v); } catch (err) { /* not available */ }
    frame.classList.toggle('tools-section', v === 'section');
    frame.classList.toggle('tools-right', v === 'right');
    document.querySelectorAll('[data-tools]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tools === v)); });
    render();
    if (state.sel) scrollToSection(state.sel);
  }
  document.querySelectorAll('[data-tools]').forEach(function (b) {
    b.addEventListener('click', function () { setTools(b.dataset.tools); });
  });

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
    copy.style.paddingTop = '';
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
    if (kind === 'layout') sheet.style.bottom = sheet.style.maxHeight = '';
    // The layout sheet keeps the section in view above it; the others dim the page.
    scrim.hidden = kind === 'layout';
    renderSheet();
    renderDock();
    if (kind !== 'layout') placeDock();
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
        // On a phone, each layout is named for the phone and notes its desktop arrangement; on desktop, the other way round.
        var desk = deskEdit();
        var main = desk ? l[2].charAt(0).toUpperCase() + l[2].slice(1) : l[1];
        b.setAttribute('aria-label', main + (desk ? '. On phones: ' + l[1] : '. On desktop: ' + l[2]));
        b.innerHTML = '<span class="lay-th" aria-hidden="true" inert></span><span class="lay-label">' + main + '</span>' +
          '<span class="lay-desk">' + (desk ? ICON.phone + l[1] : ICON.desktop + l[2]) + '</span>';
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

  // ---------- Keyboard ----------
  // Esc steps back out (closes a sheet, leaves a mode, then deselects). L, C and A switch modes.
  document.addEventListener('keydown', function (e) {
    if (state.view === 'desktop' && !deskEdit()) return;
    if (e.key === 'Escape') {
      if (state.sheet && state.sheet !== 'layout') { closeSheet(); render(); }
      else if (state.mode) exitMode();
      else if (state.sel) select(null);
      return;
    }
    var t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!state.sel || state.mode || state.sheet) return;
    var k = e.key.toLowerCase();
    if (k === 'l') setMode('layout');
    else if (k === 'c') setMode('content');
    else if (k === 'a') setMode('arrange');
  });

  // ---------- Drag and drop in Arrange ----------
  // On a computer you drag an item straight away. On a phone a swipe still scrolls the page, so you
  // press and hold an item to pick it up. A copy follows the pointer, the others slide out of the way,
  // and a dashed slot shows where it'll land.
  var drag = null;
  var press = null;

  function itemSiblings(it) {
    return Array.prototype.filter.call(it.parentElement.children, function (n) { return n.hasAttribute('data-item'); });
  }
  function arranging() { return state.mode === 'arrange' && state.sel && state.sel.isConnected && !(state.view === 'desktop' && !deskEdit()); }

  function positionHandles() {
    var base = stage.getBoundingClientRect();
    if (drag) {
      var slot = handlesEl.querySelector('.slot');
      var L = drag.self, pr = drag.parent.getBoundingClientRect();
      if (slot) {
        slot.style.left = (pr.left + L.x - base.left) + 'px'; slot.style.top = (pr.top + L.y - base.top) + 'px';
        slot.style.width = L.w + 'px'; slot.style.height = L.h + 'px';
      }
      return;
    }
    if (handlesEl.firstChild) handlesEl.innerHTML = '';
  }
  // Inner scrollers (like a carousel of cards) move items too.
  page.addEventListener('scroll', function () { if (arranging()) positionHandles(); }, true);

  // Positions are kept relative to the items' container, so scrolling doesn't upset them.
  function measure() {
    var pr = drag.parent.getBoundingClientRect();
    var rel = function (r) { return { x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height }; };
    drag.self = rel(drag.it.getBoundingClientRect());
    drag.rects = new Map();
    drag.sibs.forEach(function (n) { if (n !== drag.it) drag.rects.set(n, rel(n.getBoundingClientRect())); });
  }

  function surface(el) {
    // The colour behind an item, so a lifted heading or paragraph stays readable over the others.
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      var c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c;
    }
    return '#fff';
  }

  function beginDrag(it, x, y) {
    var r = it.getBoundingClientRect();
    drag = { it: it, parent: it.parentElement, ox: x - r.left, oy: y - r.top, px: x, py: y, moved: false,
      home: it.nextSibling, sibs: itemSiblings(it) };
    state.item = it;
    render();
  }

  // A copy of the item, with its styles baked in, floats above everything so nothing can clip it.
  function makeGhost(it) {
    var copy = it.cloneNode(true);
    var from = [it].concat(Array.prototype.slice.call(it.querySelectorAll('*')));
    var to = [copy].concat(Array.prototype.slice.call(copy.querySelectorAll('*')));
    from.forEach(function (el, i) {
      var cs = getComputedStyle(el), st = to[i].style;
      for (var k = 0; k < cs.length; k++) st.setProperty(cs[k], cs.getPropertyValue(cs[k]));
      to[i].removeAttribute('contenteditable');
      to[i].removeAttribute('id');
    });
    copy.removeAttribute('data-item');
    copy.style.margin = '0'; copy.style.position = 'static'; copy.style.transform = 'none';
    copy.style.outline = 'none'; copy.style.animation = 'none'; copy.style.transition = 'none';
    var r = it.getBoundingClientRect();
    var g = document.createElement('div');
    g.className = 'ghost';
    g.setAttribute('aria-hidden', 'true');
    g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
    var bg = getComputedStyle(it).backgroundColor.replace(/\s/g, '');
    g.style.background = bg === 'rgba(0,0,0,0)' ? surface(it.parentElement) : 'transparent';
    g.style.borderRadius = getComputedStyle(it).borderRadius;
    copy.style.width = r.width + 'px'; copy.style.height = r.height + 'px'; copy.style.boxSizing = 'border-box';
    g.appendChild(copy);
    frame.appendChild(g);
    return g;
  }

  function liftDrag() {
    drag.moved = true;
    var it = drag.it;
    drag.ghost = makeGhost(it);
    it.classList.add('dragging');
    measure();
    handlesEl.classList.add('dragging');
    handlesEl.innerHTML = '<div class="slot"></div>';
    positionHandles();
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function placeGhost() {
    var fr = frame.getBoundingClientRect();
    drag.ghost.style.transform = 'translate(' + (drag.px - drag.ox - fr.left) + 'px,' + (drag.py - drag.oy - fr.top) + 'px) rotate(-1deg) scale(1.03)';
  }

  function followPointer() {
    var it = drag.it, L = drag.self, pr = drag.parent.getBoundingClientRect();
    placeGhost();
    // Is the pointer over another item? Then the dragged one takes its place.
    var hit = null, after = false;
    drag.rects.forEach(function (R, n) {
      if (hit) return;
      var x = pr.left + R.x, y = pr.top + R.y;
      if (drag.px < x || drag.px > x + R.w || drag.py < y || drag.py > y + R.h) return;
      var across = Math.abs(R.y - L.y) < Math.min(R.h, L.h) / 2;
      hit = n;
      after = across ? drag.px > x + R.w / 2 : drag.py > y + R.h / 2;
    });
    if (!hit) return;
    var itFirst = !!(it.compareDocumentPosition(hit) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (after === itFirst) reorder(hit, after);
  }

  function reorder(target, after) {
    var it = drag.it;
    var others = drag.sibs.filter(function (n) { return n !== it; });
    var first = others.map(function (n) { return n.getBoundingClientRect(); });
    others.forEach(function (n) { n.getAnimations().forEach(function (a) { a.cancel(); }); });
    drag.parent.insertBefore(it, after ? target.nextSibling : target);
    drag.sibs = itemSiblings(it);
    measure();
    // Slide the others from where they were to where they are now.
    others.forEach(function (n, i) {
      var last = n.getBoundingClientRect(), f = first[i];
      var dx = f.left - last.left, dy = f.top - last.top;
      if (dx || dy) n.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
    positionHandles();
  }

  // Dragging near the top or bottom of the screen scrolls the page.
  function autoScroll() {
    if (!drag) return;
    var sr = screen.getBoundingClientRect();
    var bottom = sr.bottom;
    if (!dock.hidden) { var dr = dock.getBoundingClientRect(); if (dr.top > sr.top + sr.height / 2) bottom = Math.min(bottom, dr.top); }
    var edge = 64, v = 0;
    // Only as far as the items' container: once its end is in view, there's nowhere further to drop.
    var pr = drag.parent.getBoundingClientRect();
    if (drag.py < sr.top + edge && pr.top < sr.top + 16) v = -Math.min(Math.ceil((sr.top + edge - drag.py) / 5), sr.top + 16 - pr.top);
    else if (drag.py > bottom - edge && pr.bottom > bottom - 16) v = Math.min(Math.ceil((drag.py - (bottom - edge)) / 5), pr.bottom - bottom + 16);
    if (v) { screen.scrollTop += v; followPointer(); }
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function endDrag() {
    var d = drag;
    drag = null;
    cancelAnimationFrame(d.raf);
    handlesEl.classList.remove('dragging');
    var it = d.it;
    if (d.moved) {
      // The copy settles into the slot, then the item itself reappears there.
      var fr = frame.getBoundingClientRect(), r = it.getBoundingClientRect(), g = d.ghost;
      g.style.transition = 'transform 0.18s ease-out, box-shadow 0.18s ease-out';
      g.style.transform = 'translate(' + (r.left - fr.left) + 'px,' + (r.top - fr.top) + 'px)';
      g.style.boxShadow = 'none';
      setTimeout(function () {
        g.remove();
        it.classList.remove('dragging');
        positionHandles();
      }, 190);
      if (it.nextSibling !== d.home) {
        var parent = d.parent, home = d.home;
        toast('Item moved', 'Undo', function () {
          parent.insertBefore(it, home && home.parentNode === parent ? home : null);
          state.item = it;
          render();
        });
      }
    }
    render();
  }

  page.addEventListener('pointerdown', function (e) {
    if (!arranging() || e.button !== 0) return;
    var it = e.target.closest('[data-item]');
    if (!it || !state.sel.contains(it) || itemSiblings(it).length < 2) return;
    if (e.pointerType === 'mouse') { e.preventDefault(); beginDrag(it, e.clientX, e.clientY); return; }
    // Touch: press and hold to pick the item up, so a swipe still scrolls.
    it.classList.add('pressing');
    press = { it: it, x: e.clientX, y: e.clientY, timer: setTimeout(function () {
      var p = press;
      press = null;
      if (!p) return;
      p.it.classList.remove('pressing');
      beginDrag(p.it, p.x, p.y);
      liftDrag();
      followPointer();
      if (navigator.vibrate) navigator.vibrate(10);
    }, 300) };
  });
  function cancelPress() {
    if (!press) return;
    clearTimeout(press.timer);
    press.it.classList.remove('pressing');
    press = null;
  }
  document.addEventListener('pointermove', function (e) {
    if (press && Math.abs(e.clientX - press.x) + Math.abs(e.clientY - press.y) > 8) cancelPress();
  });
  // Once an item is picked up, the finger moves it instead of scrolling the page.
  document.addEventListener('touchmove', function (e) { if (drag) e.preventDefault(); }, { passive: false });
  page.addEventListener('contextmenu', function (e) { if (arranging() && e.target.closest('[data-item]')) e.preventDefault(); });
  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    drag.px = e.clientX; drag.py = e.clientY;
    if (!drag.moved) {
      if (Math.abs(e.clientX - (drag.ox + drag.it.getBoundingClientRect().left)) + Math.abs(e.clientY - (drag.oy + drag.it.getBoundingClientRect().top)) < 4) return;
      liftDrag();
    }
    followPointer();
  });
  document.addEventListener('pointerup', function () { cancelPress(); if (drag) endDrag(); });
  document.addEventListener('pointercancel', function () { cancelPress(); if (drag) endDrag(); });

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

  var savedTools = null;
  try { savedTools = localStorage.getItem('mse-tools'); } catch (err) { /* not available */ }
  var asked = /[?&]tools=(section|right)/.exec(location.search);
  if (asked) savedTools = asked[1];
  if (savedTools === 'section' || savedTools === 'right') setTools(savedTools); else render();
})();
