(function () {
  'use strict';

  // ---------- Data ----------
  var IMAGES = [
    { src: 'images/wheel-studio.jpg', alt: 'A potter’s wheel surrounded by finished pots in a studio' },
    { src: 'images/shelves.jpg', alt: 'Ceramic bowls and saucers stacked on wooden shelves' },
    { src: 'images/mugs-rack.jpg', alt: 'Glazed mugs hanging on a rack' },
    { src: 'images/throwing.jpg', alt: 'Hands shaping clay on a spinning wheel' },
    { src: 'images/bowls.jpg', alt: 'Assorted stoneware bowls on a brown surface' },
    { src: 'images/bowls-white.jpg', alt: 'White and brown ceramic bowls' }
  ];

  function count(sec, sel) { return sec.querySelectorAll(sel).length; }

  // Thumbnail colours: text, secondary text, image, accent, panel
  var TX = '#ECECEC', SB = '#A8A8A8', IG = 'rgba(255,255,255,0.32)', AC = '#9DB2FF', PN = 'rgba(255,255,255,0.12)';

  // Each rect is [x, y, w, h, colour] inside a 72×48 thumbnail.
  var LAYOUTS = {
    hero: [
      { id: 'split', label: 'Split', rects: [[7, 12, 26, 5, TX], [7, 21, 22, 3, SB], [7, 26, 18, 3, SB], [7, 33, 12, 5, AC], [40, 8, 26, 32, IG]] },
      { id: 'centered', label: 'Centered', rects: [[18, 5, 36, 5, TX], [22, 13, 28, 3, SB], [30, 19, 12, 4, AC], [8, 27, 56, 16, IG]] },
      { id: 'gallery', label: 'Image row', when: function (sec) { return count(sec, '.hero-media > .media') >= 2; } },
      { id: 'flip', label: 'Image left', rects: [[6, 8, 26, 32, IG], [39, 12, 26, 5, TX], [39, 21, 22, 3, SB], [39, 26, 18, 3, SB], [39, 33, 12, 5, AC]] }
    ],
    features: [
      { id: 'cols', label: 'Three columns', rects: [[6, 6, 30, 4, TX], [6, 15, 18, 14, IG], [27, 15, 18, 14, IG], [48, 15, 18, 14, IG], [6, 32, 14, 3, SB], [27, 32, 14, 3, SB], [48, 32, 14, 3, SB], [6, 37, 10, 3, SB], [27, 37, 10, 3, SB], [48, 37, 10, 3, SB]] },
      { id: 'list', label: 'Stacked list', rects: [[8, 5, 14, 10, IG], [26, 7, 30, 3, TX], [26, 11, 22, 2, SB], [8, 19, 14, 10, IG], [26, 21, 30, 3, TX], [26, 25, 22, 2, SB], [8, 33, 14, 10, IG], [26, 35, 30, 3, TX], [26, 39, 22, 2, SB]] },
      { id: 'cols4', label: 'Four columns', when: function (sec) { return count(sec, '.card') >= 4; } },
      { id: 'feature', label: 'Featured + two', rects: [[6, 5, 30, 18, IG], [40, 9, 26, 4, TX], [40, 16, 20, 3, SB], [6, 27, 14, 16, IG], [22, 30, 12, 3, TX], [38, 27, 14, 16, IG], [54, 30, 12, 3, TX]] }
    ],
    cta: [
      { id: 'center', label: 'Centered', rects: [[6, 8, 60, 32, PN], [20, 14, 32, 5, TX], [24, 22, 24, 3, SB], [30, 29, 12, 6, AC]] },
      { id: 'split', label: 'Split', rects: [[6, 8, 60, 32, PN], [12, 17, 28, 5, TX], [12, 25, 22, 3, SB], [46, 20, 14, 8, AC]] },
      { id: 'banner', label: 'Dark banner', rects: [[6, 8, 60, 32, '#0E0E0E'], [12, 17, 28, 5, TX], [12, 25, 22, 3, SB], [46, 20, 14, 8, '#F4F2EE']] }
    ],
    text: [
      { id: 'left', label: 'Single column', rects: [[8, 7, 30, 5, TX], [8, 17, 44, 3, SB], [8, 22, 40, 3, SB], [8, 27, 44, 3, SB], [8, 35, 36, 3, SB]] },
      { id: 'center', label: 'Centered', rects: [[21, 7, 30, 5, TX], [14, 17, 44, 3, SB], [16, 22, 40, 3, SB], [14, 27, 44, 3, SB], [18, 35, 36, 3, SB]] },
      { id: 'cols2', label: 'Two text columns', when: function (sec) { return count(sec, '.text-body > p') >= 3; } },
      { id: 'two', label: 'Two columns', rects: [[6, 9, 22, 5, TX], [6, 16, 16, 5, TX], [34, 9, 32, 3, SB], [34, 14, 30, 3, SB], [34, 19, 32, 3, SB], [34, 27, 28, 3, SB], [34, 32, 32, 3, SB]] }
    ],
    image: [
      { id: 'wide', label: 'Contained', rects: [[8, 6, 56, 28, IG], [8, 38, 26, 3, SB]] },
      { id: 'full', label: 'Full width', rects: [[0, 6, 72, 30, IG], [8, 40, 26, 3, SB]] },
      { id: 'side', label: 'With caption', rects: [[6, 8, 40, 32, IG], [50, 16, 16, 3, SB], [50, 21, 14, 3, SB], [50, 26, 16, 3, SB]] }
    ],
    gallery: [
      { id: 'grid3', label: 'Three across', rects: [[6, 5, 26, 4, TX], [6, 13, 18, 13, IG], [27, 13, 18, 13, IG], [48, 13, 18, 13, IG], [6, 29, 18, 13, IG], [27, 29, 18, 13, IG], [48, 29, 18, 13, IG]] },
      { id: 'grid2', label: 'Two across', rects: [[6, 5, 26, 4, TX], [6, 13, 29, 13, IG], [38, 13, 28, 13, IG], [6, 29, 29, 13, IG], [38, 29, 28, 13, IG]] },
      { id: 'grid4', label: 'Four across', when: function (sec) { return count(sec, '.gal-img') >= 8; } },
      { id: 'mosaic', label: 'Mosaic', rects: [[6, 5, 26, 4, TX], [6, 13, 39, 29, IG], [48, 13, 18, 13, IG], [48, 29, 18, 13, IG]] }
    ],
    quote: [
      { id: 'center', label: 'Centered', rects: [[10, 10, 52, 5, TX], [14, 18, 44, 5, TX], [26, 30, 20, 3, SB]] },
      { id: 'left', label: 'Left aligned', rects: [[8, 10, 52, 5, TX], [8, 18, 40, 5, TX], [8, 30, 20, 3, SB]] },
      { id: 'dark', label: 'Dark band', rects: [[0, 4, 72, 40, '#0E0E0E'], [10, 13, 52, 5, TX], [14, 21, 44, 5, TX], [26, 32, 20, 3, SB]] }
    ],
    contact: [
      { id: 'split', label: 'Split', rects: [[7, 9, 24, 5, TX], [7, 18, 22, 3, SB], [7, 23, 18, 3, SB], [7, 31, 14, 5, AC], [38, 8, 28, 32, IG]] },
      { id: 'stacked', label: 'Stacked', rects: [[22, 4, 28, 5, TX], [20, 12, 32, 3, SB], [30, 17, 12, 4, AC], [8, 25, 56, 18, IG]] },
      { id: 'card', label: 'Card', rects: [[0, 0, 72, 48, IG], [8, 10, 30, 28, '#2A2A2A'], [12, 15, 20, 4, TX], [12, 22, 18, 3, SB], [12, 29, 12, 4, AC]] }
    ]
  };

  var MODES = {
    layout: { label: 'Edit layout', desc: 'Pick a preset arrangement, and remove items', hint: '' },
    content: { label: 'Edit content', desc: 'Change text and images; positions stay put', hint: 'Click text to edit · Replace images · Positions are locked' },
    free: { label: 'Freeform', desc: 'Move and resize items; text and images are locked', hint: 'Drag to move · Select an item and drag its handles to resize · Text and images are locked' }
  };

  var ICONS = {
    layout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3858E9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M9 9v12"></path></svg>',
    content: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3858E9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"></path><path d="M13 7l4 4"></path></svg>',
    free: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3858E9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"></path></svg>'
  };

  // What each section can add, and where new items go.
  var ADDABLE = {
    hero: [
      { type: 'heading', label: 'Heading', into: '.hero-text' },
      { type: 'paragraph', label: 'Paragraph', into: '.hero-text' },
      { type: 'button', label: 'Button', into: '.hero-text' },
      { type: 'image', label: 'Image', into: '.hero-media' }
    ],
    features: [
      { type: 'heading', label: 'Heading', before: '.cards' },
      { type: 'paragraph', label: 'Paragraph', before: '.cards' },
      { type: 'button', label: 'Button', into: '.features-inner' },
      { type: 'card', label: 'Card', into: '.cards' }
    ],
    cta: [
      { type: 'heading', label: 'Heading', into: '.cta-text' },
      { type: 'paragraph', label: 'Paragraph', into: '.cta-text' },
      { type: 'button', label: 'Button', into: '.cta-panel', btnClass: 'btn cta-btn' }
    ],
    text: [
      { type: 'heading', label: 'Heading', into: '.text-body' },
      { type: 'paragraph', label: 'Paragraph', into: '.text-body' },
      { type: 'button', label: 'Button', into: '.text-body' },
      { type: 'image', label: 'Image', into: '.text-body' }
    ],
    image: [
      { type: 'heading', label: 'Heading', into: '.image-text' },
      { type: 'paragraph', label: 'Paragraph', into: '.image-text' },
      { type: 'button', label: 'Button', into: '.image-text' }
    ],
    gallery: [
      { type: 'heading', label: 'Heading', before: '.gal-grid' },
      { type: 'paragraph', label: 'Paragraph', before: '.gal-grid' },
      { type: 'image', label: 'Image', into: '.gal-grid', imgClass: 'gal-img' }
    ],
    quote: [
      { type: 'paragraph', label: 'Paragraph', into: '.quote-fig' },
      { type: 'button', label: 'Button', into: '.quote-fig' }
    ],
    contact: [
      { type: 'heading', label: 'Heading', into: '.contact-text' },
      { type: 'paragraph', label: 'Paragraph', into: '.contact-text' },
      { type: 'button', label: 'Button', into: '.contact-text' }
    ]
  };

  // Icons for the Add menu.
  var ADD_ICONS = {
    heading: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4v16M18 4v16M6 12h12"></path></svg>',
    paragraph: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 11h16M4 16h11"></path></svg>',
    button: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="8" rx="4"></rect><path d="M9 12h6"></path></svg>',
    image: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="M21 17l-5-5-9 8"></path></svg>',
    card: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M4 11h16M8 15h8"></path></svg>'
  };

  function newItemHTML(type, key, opts) {
    var d = ' data-drag="' + key + '" data-added';
    switch (type) {
      case 'heading':
        return '<h2 class="added-h"' + d + ' data-resize="text" data-text>New heading</h2>';
      case 'paragraph':
        return '<p class="added-p"' + d + ' data-resize="text" data-text>A new paragraph. Switch to Edit content to change this text.</p>';
      case 'button':
        return '<a href="#" class="' + (opts.btnClass || 'btn') + '"' + d + ' data-resize="text" data-text>New button</a>';
      case 'image':
        return '<div class="media ' + (opts.imgClass || 'added-img') + '"' + d + ' data-resize="box"><img data-img="' + key + 'i" alt="" draggable="false">' +
          '<button class="rep" data-act="replace" data-key="' + key + 'i">Replace image</button></div>';
      case 'card':
        return '<article class="card"' + d + ' data-resize="box"><div class="media card-img"><img data-img="' + key + 'i" alt="" draggable="false">' +
          '<button class="rep" data-act="replace" data-key="' + key + 'i">Replace image</button></div>' +
          '<div class="card-text"><h3 data-text>New card</h3><p data-text>Describe this card. Switch to Edit content to change the text.</p></div></article>';
    }
    return '';
  }

  var addCount = 0;
  var removed = []; // { el, ph } in removal order

  var SNAP_DISTANCE = 6;
  var MIN_SIZE = 40;
  var HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  function fresh() {
    return {
      active: null,
      mode: null,
      layout: {},
      offsets: {},
      sizes: {},
      selected: null,
      images: { hImg: 0, f1i: 4, f2i: 2, f3i: 3 },
      grid: true,
      snap: true
    };
  }

  var state = fresh();
  var drag = null;
  var main = document.querySelector('main');

  function allSections() {
    return Array.prototype.slice.call(document.querySelectorAll('.sec'));
  }

  var DEFAULT_LAYOUT = { hero: 'split', features: 'cols', cta: 'center', text: 'left', image: 'wide', gallery: 'grid3', quote: 'center', contact: 'split' };
  var TITLES = { hero: 'Hero section', features: 'Features section', cta: 'Call to action', text: 'Text section', image: 'Image section', gallery: 'Gallery section', quote: 'Quote section', contact: 'Contact section' };
  var SECTION_TYPES = ['hero', 'features', 'cta', 'text', 'image', 'gallery', 'quote', 'contact'];

  function layoutOf(sec) {
    return state.layout[sec.dataset.section] || DEFAULT_LAYOUT[sec.dataset.type];
  }

  var SEC_ICONS = {
    up: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"></path></svg>',
    down: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"></path></svg>',
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>',
    bin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path><path d="M9 7V4h6v3"></path></svg>'
  };

  // ---------- Build the editing chrome for a section ----------
  function initSection(sec) {
    var key = sec.dataset.section;
    var type = sec.dataset.type;
    var title = TITLES[type];
    sec.dataset.title = title;

    var overlayButtons = '<div class="modebar" role="group" aria-label="Edit this section">' +
      ['layout', 'content', 'free'].map(function (m) {
        return '<button class="ob" data-open="' + m + '" title="' + MODES[m].desc + '">' + ICONS[m] +
          '<span class="obt">' + MODES[m].label + '</span></button>';
      }).join('') + '</div>';


    sec.insertAdjacentHTML('afterbegin',
      '<div class="grid" aria-hidden="true"><div class="gridin">' + new Array(13).join('<span class="gcol"></span>') + '<span class="gmid"></span></div></div>' +
      '<span class="gv" aria-hidden="true"></span><span class="gh" aria-hidden="true"></span>' +
      '<div class="selbox" aria-hidden="true">' + HANDLES.map(function (h) { return '<span class="hd" data-h="' + h + '"></span>'; }).join('') + '<span class="dim"></span></div>' +
      '<div class="ov"><div class="ovtl"><span class="ovl">' + title + '</span>' +
        '<div class="addwrap"><button class="addtrig" data-sec-act="addmenu" aria-haspopup="menu" aria-expanded="false">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>Add</button>' +
          '<div class="addmenu" role="menu" aria-label="Add to ' + title + '">' +
            ADDABLE[type].map(function (a, i) {
              return '<button role="menuitem" data-add="' + i + '">' + ADD_ICONS[a.type] + '<span>' + a.label + '</span></button>';
            }).join('') +
          '</div></div></div>' +
        '<div class="secctl" role="group" aria-label="Section">' +
          '<button class="sbtn" data-sec-act="up" aria-label="Move section up" title="Move up">' + SEC_ICONS.up + '</button>' +
          '<button class="sbtn" data-sec-act="down" aria-label="Move section down" title="Move down">' + SEC_ICONS.down + '</button>' +
          '<button class="sbtn" data-sec-act="duplicate" aria-label="Duplicate section" title="Duplicate">' + SEC_ICONS.copy + '</button>' +
          '<button class="sbtn danger" data-sec-act="delete" aria-label="Delete section" title="Delete section">' + SEC_ICONS.bin + '</button>' +
        '</div>' + overlayButtons + '</div>' +
      '<div class="tb"><span class="tbl"></span><span class="tbh"></span>' +
        '<div class="free-tools">' +
          '<button class="tbb" data-act="grid">Grid</button>' +
          '<button class="tbb" data-act="snap">Snap to guides</button>' +
          '<button class="tbb" data-act="resetpos">Reset positions and sizes</button>' +
        '</div>' +
        '<span class="spacer"></span><button class="done" data-act="done">Done</button></div>' +
      '<div class="xlayer"></div>'
    );

    // The layouts panel lives outside the section, so its live previews don't pick up the
    // section's own styles and the section's queries don't find the previews' copies.
    var lp = document.createElement('div');
    lp.className = 'lp';
    lp.setAttribute('role', 'group');
    lp.setAttribute('aria-label', title + ' layouts');
    lp.innerHTML = '<span class="lph">Layouts</span><div class="lpo"></div>';
    document.body.appendChild(lp);
    sec._lp = lp;

    function onClick(e) {
      // Links shouldn't navigate while a section is being edited.
      if (sec.dataset.mode && e.target.closest('a')) e.preventDefault();

      var btn = e.target.closest('button');
      if (!btn || !(sec.contains(btn) || lp.contains(btn))) return;

      if (btn.dataset.secAct) {
        if (btn.dataset.secAct === 'up') moveSection(sec, -1);
        else if (btn.dataset.secAct === 'down') moveSection(sec, 1);
        else if (btn.dataset.secAct === 'duplicate') duplicateSection(sec);
        else if (btn.dataset.secAct === 'delete') deleteSection(sec);
        else if (btn.dataset.secAct === 'addmenu') {
          var wrapEl = btn.parentNode, opening = !wrapEl.classList.contains('open');
          closeAddMenus();
          wrapEl.classList.toggle('open', opening);
          btn.setAttribute('aria-expanded', String(opening));
          return;
        }
        else return;
      } else if (btn.dataset.open) {
        state.active = key;
        state.mode = btn.dataset.open;
        state.selected = null;
      } else if (btn.dataset.layoutPick) {
        state.layout[key] = btn.dataset.layoutPick;
      } else if (btn.dataset.act === 'done') {
        state.active = null;
        state.mode = null;
        state.selected = null;
        if (document.activeElement) document.activeElement.blur();
      } else if (btn.dataset.act === 'grid') {
        state.grid = !state.grid;
      } else if (btn.dataset.act === 'snap') {
        state.snap = !state.snap;
      } else if (btn.dataset.act === 'resetpos') {
        sec.querySelectorAll('[data-drag]').forEach(function (el) {
          delete state.offsets[el.dataset.drag];
          delete state.sizes[el.dataset.drag];
        });
      } else if (btn.dataset.add) {
        addItem(sec, ADDABLE[type][+btn.dataset.add]);
        closeAddMenus();
      } else if (btn.dataset.remove) {
        removeItem(sec, btn.dataset.remove);
      } else if (btn.dataset.act === 'restore') {
        restoreRemoved(sec);
      } else if (btn.dataset.act === 'replace') {
        var k = btn.dataset.key;
        state.images[k] = ((state.images[k] || 0) + 1) % IMAGES.length;
      } else {
        return;
      }
      render();
    }
    sec.addEventListener('click', onClick);
    lp.addEventListener('click', onClick);
  }

  allSections().forEach(initSection);

  // ---------- Adding and removing items ----------
  function addItem(sec, spec) {
    addCount += 1;
    var key = 'n' + addCount;
    var wrap = document.createElement('div');
    wrap.innerHTML = newItemHTML(spec.type, key, spec);
    var el = wrap.firstChild;
    if (spec.before) {
      var ref = sec.querySelector(spec.before);
      ref.parentNode.insertBefore(el, ref);
    } else {
      sec.querySelector(spec.into).appendChild(el);
    }
    if (spec.type === 'image' || spec.type === 'card') state.images[key + 'i'] = addCount % IMAGES.length;
    el.classList.add('fresh');
    setTimeout(function () { el.classList.remove('fresh'); }, 900);
  }

  function removeItem(sec, key) {
    var el = sec.querySelector('[data-drag="' + key + '"]');
    if (!el) return;
    var ph = document.createComment('removed ' + key);
    el.replaceWith(ph);
    el.classList.remove('doomed');
    removed.push({ el: el, ph: ph, sec: sec });
    if (state.selected === key) state.selected = null;
  }

  function restoreRemoved(sec) {
    for (var i = removed.length - 1; i >= 0; i--) {
      if (sec && removed[i].sec !== sec) continue;
      removed[i].ph.replaceWith(removed[i].el);
      removed.splice(i, 1);
    }
  }

  // Remove buttons sit in a layer over the section, one at each item's top-right corner.
  function positionRemoveButtons() {
    allSections().forEach(function (sec) {
      var layer = sec.querySelector('.xlayer');
      if (sec.dataset.mode !== 'layout') { layer.innerHTML = ''; return; }
      var sr = sec.getBoundingClientRect();
      var panel = local(sec._lp.getBoundingClientRect(), sr);
      var pad = 20; // button half-size plus a little breathing room
      function underPanel(x, y) {
        return x > panel.l - pad && x < panel.l + panel.w + pad && y > panel.t - pad && y < panel.t + panel.h + pad;
      }
      var html = '';
      sec.querySelectorAll('[data-drag]').forEach(function (el) {
        var r = local(el.getBoundingClientRect(), sr);
        // Use the top-right corner unless the layouts panel covers it, then try the other corners.
        // If the item is completely covered, sit the bin just beside the panel, level with the item.
        var midY = r.t + r.h / 2;
        var corners = [[r.l + r.w, r.t], [r.l, r.t], [r.l + r.w, r.t + r.h], [r.l, r.t + r.h],
          [panel.l + panel.w + pad + 2, midY], [panel.l - pad - 2, midY]];
        var spot = corners.filter(function (c) { return !underPanel(c[0], c[1]); })[0] || corners[0];
        var name = (el.querySelector('h3') || el).textContent.trim().slice(0, 40) || 'item';
        html += '<button class="xbtn" data-remove="' + el.dataset.drag + '" style="left:' + spot[0] + 'px;top:' + spot[1] + 'px" aria-label="Remove ' + name.replace(/"/g, '&quot;') + '">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"></path><path d="M9 7V4h6v3"></path></svg></button>';
      });
      layer.innerHTML = html;

    });
  }
  window.addEventListener('resize', function () { renderLayoutPanels(); positionRemoveButtons(); });
  document.addEventListener('load', function (e) { if (e.target.tagName === 'IMG') positionRemoveButtons(); }, true);

  // Highlight the item a remove button points at.
  document.addEventListener('mouseover', function (e) {
    var x = e.target.closest && e.target.closest('.xbtn');
    document.querySelectorAll('.doomed').forEach(function (d) { d.classList.remove('doomed'); });
    if (x) {
      var item = x.closest('.sec').querySelector('[data-drag="' + x.dataset.remove + '"]');
      if (item) item.classList.add('doomed');
    }
  });

  // Reloading is the simplest way to put every section, item and edit back.
  document.getElementById('reset-all').addEventListener('click', function () {
    window.location.reload();
  });

  // ---------- Render state onto the page ----------
  function render() {
    allSections().forEach(function (sec) {
      var key = sec.dataset.section;
      var on = state.active === key;
      var mode = on ? state.mode : '';

      sec.classList.toggle('on', on);
      sec.dataset.mode = mode || '';
      sec.dataset.layout = layoutOf(sec);

      sec.querySelector('.tbl').textContent = mode ? MODES[mode].label : '';
      sec.querySelector('.tbh').textContent = mode ? MODES[mode].hint : '';

      sec.querySelectorAll('[data-text]').forEach(function (el) {
        el.contentEditable = mode === 'content' ? 'true' : 'false';
      });
      sec._lp.querySelectorAll('[data-layout-pick]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.layoutPick === layoutOf(sec)));
      });

      var gridBtn = sec.querySelector('[data-act="grid"]');
      var snapBtn = sec.querySelector('[data-act="snap"]');
      gridBtn.classList.toggle('act', state.grid);
      gridBtn.setAttribute('aria-pressed', String(state.grid));
      snapBtn.classList.toggle('act', state.snap);
      snapBtn.setAttribute('aria-pressed', String(state.snap));
    });

    var secs = allSections();
    secs.forEach(function (sec, i) {
      sec.querySelector('[data-sec-act="up"]').disabled = i === 0;
      sec.querySelector('[data-sec-act="down"]').disabled = i === secs.length - 1;
    });
    document.body.classList.toggle('editing', !!state.active);
    renderInserters();

    document.body.classList.toggle('no-grid', !state.grid);

    document.querySelectorAll('[data-drag]').forEach(function (el) {
      applySize(el);
      applyOffset(el);
    });

    document.querySelectorAll('img[data-img]').forEach(function (img) {
      var pic = IMAGES[(state.images[img.dataset.img] || 0) % IMAGES.length];
      if (img.getAttribute('src') !== pic.src) img.setAttribute('src', pic.src);
      img.alt = pic.alt;
    });

    positionSelection();
    renderLayoutPanels();
    positionRemoveButtons();
  }

  // ---------- Layout panel: live previews of this section's own content ----------
  var MINI_W = 120, MINI_H = 76;
  var CHROME = '.grid, .gv, .gh, .selbox, .ov, .tb, .xlayer, .lp, .rep';

  // A miniature copy of the section's content, rendered in the given layout.
  function miniPreview(sec, layoutId) {
    var copy = document.createElement('div');
    copy.className = 'mini-sec ' + sec.dataset.type;
    copy.dataset.layout = layoutId;
    copy.innerHTML = sec.innerHTML;
    copy.querySelectorAll(CHROME).forEach(function (n) { n.remove(); });
    copy.querySelectorAll('*').forEach(function (n) {
      ['data-drag', 'data-img', 'data-text', 'data-key', 'data-added', 'data-resize', 'contenteditable'].forEach(function (a) { n.removeAttribute(a); });
      n.classList.remove('doomed', 'dragging', 'fresh');
    });
    var stage = document.createElement('span');
    stage.className = 'mini-stage';
    stage.style.width = sec.offsetWidth + 'px';
    stage.appendChild(copy);
    return stage;
  }

  function renderLayoutPanels() {
    allSections().forEach(function (sec) {
      var lp = sec._lp;
      lp.classList.toggle('show', sec.dataset.mode === 'layout');
      if (sec.dataset.mode !== 'layout') return;
      var sr = sec.getBoundingClientRect();
      lp.style.left = sr.left + window.scrollX + sr.width / 2 + 'px';
      lp.style.top = sr.top + window.scrollY + 16 + 'px';
      var current = layoutOf(sec);
      var options = LAYOUTS[sec.dataset.type].filter(function (l) { return !l.when || l.when(sec) || l.id === current; });
      var lpo = lp.querySelector('.lpo');
      lpo.innerHTML = '';
      // Restore removed lives in the panel, and only shows when something has been removed.
      var old = lp.querySelector('.lprestore');
      if (old) old.remove();
      var nRemoved = removed.filter(function (r) { return r.sec === sec; }).length;
      if (nRemoved) {
        var rb = document.createElement('button');
        rb.className = 'lprestore';
        rb.dataset.act = 'restore';
        rb.textContent = 'Restore removed (' + nRemoved + ')';
        lp.appendChild(rb);
      }
      options.forEach(function (l) {
        var b = document.createElement('button');
        b.className = 'lo';
        b.dataset.layoutPick = l.id;
        b.setAttribute('aria-pressed', String(l.id === current));
        b.setAttribute('aria-label', l.label);
        b.innerHTML = '<span class="th mini" aria-hidden="true" inert></span><span>' + l.label + '</span>';
        if (l.when) b.classList.add('lo-new');
        lpo.appendChild(b);
        var th = b.firstChild;
        var stage = miniPreview(sec, l.id);
        th.appendChild(stage);
        var k = MINI_W / sec.offsetWidth;
        var h = stage.offsetHeight * k;
        stage.style.transform = 'translate(0, ' + Math.max(0, (MINI_H - h) / 2) + 'px) scale(' + k + ')';
      });
    });
  }

  function applyOffset(el) {
    var o = state.offsets[el.dataset.drag] || { x: 0, y: 0 };
    el.style.transform = 'translate(' + o.x + 'px, ' + o.y + 'px)';
  }

  function applySize(el) {
    var sz = state.sizes[el.dataset.drag];
    if (sz) {
      el.style.width = sz.w + 'px';
      el.style.height = sz.h == null ? '' : sz.h + 'px';
      el.style.maxWidth = 'none';
      el.style.flex = '0 0 auto';
    } else {
      el.style.width = el.style.height = el.style.maxWidth = el.style.flex = '';
    }
  }

  // Draw the selection box (with resize handles) over the selected item.
  function positionSelection() {
    allSections().forEach(function (sec) {
      var box = sec.querySelector('.selbox');
      var el = state.selected && sec.dataset.mode === 'free' ? sec.querySelector('[data-drag="' + state.selected + '"]') : null;
      box.classList.toggle('show', !!el);
      if (!el) return;
      var r = local(el.getBoundingClientRect(), sec.getBoundingClientRect());
      box.style.left = r.l + 'px';
      box.style.top = r.t + 'px';
      box.style.width = r.w + 'px';
      box.style.height = r.h + 'px';
      box.classList.toggle('text-only', el.dataset.resize === 'text');
      box.querySelector('.dim').textContent = Math.round(r.w) + ' × ' + Math.round(r.h);
    });
  }
  window.addEventListener('resize', positionSelection);

  // ---------- Freeform dragging with snapping guides ----------
  function local(rect, secRect) {
    return { l: rect.left - secRect.left, t: rect.top - secRect.top, w: rect.width, h: rect.height };
  }

  function nearest(points, targets) {
    var best = null;
    points.forEach(function (p) {
      targets.forEach(function (t) {
        var diff = t - p;
        if (Math.abs(diff) <= SNAP_DISTANCE && (!best || Math.abs(diff) < Math.abs(best.d))) best = { d: diff, t: t };
      });
    });
    return best;
  }

  function hideGuides(sec) {
    sec.querySelector('.gv').classList.remove('show');
    sec.querySelector('.gh').classList.remove('show');
  }

  // Snap targets: content edges and centre, section middle, and every other item's edges and centre.
  function snapTargets(sec, el, sr) {
    var inner = sec.querySelector('.inner');
    var ir = inner.getBoundingClientRect();
    var cs = getComputedStyle(inner);
    var xs = [ir.left - sr.left + parseFloat(cs.paddingLeft), sr.width / 2, ir.right - sr.left - parseFloat(cs.paddingRight)];
    var ys = [sr.height / 2];
    sec.querySelectorAll('[data-drag]').forEach(function (n) {
      if (n === el || el.contains(n) || n.contains(el)) return;
      var r = local(n.getBoundingClientRect(), sr);
      xs.push(r.l, r.l + r.w / 2, r.l + r.w);
      ys.push(r.t, r.t + r.h / 2, r.t + r.h);
    });
    return { xs: xs, ys: ys };
  }

  document.addEventListener('pointerdown', function (e) {
    var sec = e.target.closest('.sec');
    if (!sec || sec.dataset.mode !== 'free') return;

    // Resize from a handle on the selection box.
    var handle = e.target.closest('.hd');
    if (handle && state.selected) {
      e.preventDefault();
      var target = sec.querySelector('[data-drag="' + state.selected + '"]');
      var sr0 = sec.getBoundingClientRect();
      var r0 = local(target.getBoundingClientRect(), sr0);
      var t0 = snapTargets(sec, target, sr0);
      drag = {
        type: 'resize', h: handle.dataset.h, el: target, sec: sec, key: state.selected,
        text: target.dataset.resize === 'text', sx: e.clientX, sy: e.clientY,
        L0: r0.l, T0: r0.t, R0: r0.l + r0.w, B0: r0.t + r0.h, w0: target.offsetWidth, h0: target.offsetHeight,
        xs: t0.xs, ys: t0.ys
      };
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      return;
    }

    if (e.target.closest('.tb, button')) return;
    var el = e.target.closest('[data-drag]');

    // Clicking empty space clears the selection.
    if (!el) {
      if (state.selected) { state.selected = null; positionSelection(); }
      return;
    }
    e.preventDefault();
    state.selected = el.dataset.drag;

    var sr = sec.getBoundingClientRect();
    var t = snapTargets(sec, el, sr);
    var o = state.offsets[el.dataset.drag] || { x: 0, y: 0 };
    drag = {
      type: 'move', el: el, sec: sec, key: el.dataset.drag,
      sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y,
      r0: local(el.getBoundingClientRect(), sr), xs: t.xs, ys: t.ys
    };
    el.classList.add('dragging');
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
    positionSelection();
  });

  function resizeMove(e) {
    var d = drag;
    var dx = e.clientX - d.sx;
    var dy = e.clientY - d.sy;
    var gv = d.sec.querySelector('.gv');
    var gh = d.sec.querySelector('.gh');
    var east = d.h.indexOf('e') > -1, west = d.h.indexOf('w') > -1;
    var south = d.h.indexOf('s') > -1, north = d.h.indexOf('n') > -1;
    var w = d.w0, h = d.h0, b;

    if (east) w = d.w0 + dx;
    if (west) w = d.w0 - dx;
    if (!d.text) {
      if (south) h = d.h0 + dy;
      if (north) h = d.h0 - dy;
    }

    if (state.snap) {
      if (east && (b = nearest([d.L0 + w], d.xs))) { w += b.d; gv.style.left = b.t + 'px'; gv.classList.add('show'); }
      if (west && (b = nearest([d.R0 - w], d.xs))) { w -= b.d; gv.style.left = b.t + 'px'; gv.classList.add('show'); }
      if (!d.text && south && (b = nearest([d.T0 + h], d.ys))) { h += b.d; gh.style.top = b.t + 'px'; gh.classList.add('show'); }
      if (!d.text && north && (b = nearest([d.B0 - h], d.ys))) { h -= b.d; gh.style.top = b.t + 'px'; gh.classList.add('show'); }
    }

    w = Math.max(MIN_SIZE, Math.round(w));
    h = Math.max(MIN_SIZE, Math.round(h));
    state.sizes[d.key] = { w: w, h: d.text ? null : h };
    applySize(d.el);

    // Keep the edge opposite the handle where it was, whatever the surrounding layout does.
    var cur = local(d.el.getBoundingClientRect(), d.sec.getBoundingClientRect());
    var wantL = west ? d.R0 - cur.w : d.L0;
    var wantT = (!d.text && north) ? d.B0 - cur.h : d.T0;
    var o = state.offsets[d.key] || { x: 0, y: 0 };
    state.offsets[d.key] = { x: o.x + wantL - cur.l, y: o.y + wantT - cur.t };
    applyOffset(d.el);
    positionSelection();
  }

  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    hideGuides(drag.sec);
    if (drag.type === 'resize') { resizeMove(e); return; }

    var dx = e.clientX - drag.sx;
    var dy = e.clientY - drag.sy;
    var gv = drag.sec.querySelector('.gv');
    var gh = drag.sec.querySelector('.gh');

    if (state.snap) {
      var L = drag.r0.l + dx, T = drag.r0.t + dy, W = drag.r0.w, H = drag.r0.h;
      var bx = nearest([L, L + W / 2, L + W], drag.xs);
      if (bx) { dx += bx.d; gv.style.left = bx.t + 'px'; gv.classList.add('show'); }
      var by = nearest([T, T + H / 2, T + H], drag.ys);
      if (by) { dy += by.d; gh.style.top = by.t + 'px'; gh.classList.add('show'); }
    }

    state.offsets[drag.key] = { x: drag.ox + dx, y: drag.oy + dy };
    applyOffset(drag.el);
    positionSelection();
  });

  function endDrag() {
    if (!drag) return;
    drag.el.classList.remove('dragging');
    hideGuides(drag.sec);
    drag = null;
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  // ---------- Sections: add, move, delete ----------
  var secCount = 0;
  var lastDeleted = null;

  function newSectionHTML(type, id) {
    var p = id + '-';
    var drag = function (k, resize) { return ' data-drag="' + p + k + '" data-resize="' + resize + '"'; };
    var img = function (k) {
      return '<img data-img="' + p + k + '" alt="" draggable="false"><button class="rep" data-act="replace" data-key="' + p + k + '">Replace image</button>';
    };
    var open = '<section class="sec ' + type + '" data-section="' + id + '" data-type="' + type + '" aria-label="' + TITLES[type] + '">';
    if (type === 'hero') {
      return open + '<div class="inner hero-inner"><div class="hero-text">' +
        '<span class="eyebrow"' + drag('tag', 'text') + ' data-text>New section</span>' +
        '<h1' + drag('title', 'text') + ' data-text>A headline for this section</h1>' +
        '<p class="lead"' + drag('body', 'text') + ' data-text>A sentence or two that introduces what this part of the page is about.</p>' +
        '<a href="#" class="btn"' + drag('btn', 'text') + ' data-text>Learn more</a></div>' +
        '<div class="hero-media"><div class="media hero-img"' + drag('img', 'box') + '>' + img('img') + '</div></div></div></section>';
    }
    if (type === 'features') {
      var card = function (n, t, d) {
        return '<article class="card"' + drag('c' + n, 'box') + '><div class="media card-img">' + img('c' + n + 'i') + '</div>' +
          '<div class="card-text"><h3 data-text>' + t + '</h3><p data-text>' + d + '</p></div></article>';
      };
      return open + '<div class="inner features-inner"><h2' + drag('head', 'text') + ' data-text>A new set of features</h2><div class="cards">' +
        card(1, 'First item', 'A short description of the first item.') +
        card(2, 'Second item', 'A short description of the second item.') +
        card(3, 'Third item', 'A short description of the third item.') +
        '</div></div></section>';
    }
    if (type === 'text') {
      return open + '<div class="inner text-inner"><h2' + drag('head', 'text') + ' data-text>Our story</h2><div class="text-body">' +
        '<p' + drag('p1', 'text') + ' data-text>Use this section for a longer piece of writing: the story behind the studio, how the work is made, or anything that needs more than a line or two.</p>' +
        '<p' + drag('p2', 'text') + ' data-text>Add more paragraphs, headings or a button from Edit layout, and change the words in Edit content.</p>' +
        '</div></div></section>';
    }
    if (type === 'image') {
      return open + '<div class="inner image-inner"><div class="media banner-img"' + drag('img', 'box') + '>' + img('img') + '</div>' +
        '<div class="image-text"><p class="caption"' + drag('cap', 'text') + ' data-text>A short caption that describes the photo.</p></div></div></section>';
    }
    if (type === 'gallery') {
      var tiles = '';
      for (var g = 1; g <= 6; g++) tiles += '<div class="media gal-img"' + drag('g' + g, 'box') + '>' + img('g' + g + 'i') + '</div>';
      return open + '<div class="inner gallery-inner"><h2' + drag('head', 'text') + ' data-text>From the studio</h2>' +
        '<div class="gal-grid">' + tiles + '</div></div></section>';
    }
    if (type === 'quote') {
      return open + '<div class="inner quote-inner"><figure class="quote-fig">' +
        '<blockquote' + drag('q', 'text') + ' data-text>\u201cA sentence someone said about the work goes here. Replace it with a real quote.\u201d</blockquote>' +
        '<figcaption' + drag('who', 'text') + ' data-text>[Name], [where they\u2019re from]</figcaption></figure></div></section>';
    }
    if (type === 'contact') {
      return open + '<div class="inner contact-inner"><div class="contact-text">' +
        '<h2' + drag('head', 'text') + ' data-text>Find the studio</h2>' +
        '<p' + drag('addr', 'text') + ' data-text>[Street address], [Town], [Postcode]</p>' +
        '<p' + drag('hours', 'text') + ' data-text>Open [days], [opening hours]</p>' +
        '<a href="#" class="btn"' + drag('btn', 'text') + ' data-text>Get directions</a></div>' +
        '<div class="media contact-img"' + drag('img', 'box') + '>' + img('img') + '</div></div></section>';
    }
    return open + '<div class="inner cta-inner"><div class="cta-panel"><div class="cta-text">' +
      '<h2' + drag('title', 'text') + ' data-text>A new call to action</h2>' +
      '<p class="cta-sub"' + drag('body', 'text') + ' data-text>One line that tells people why they should act now.</p></div>' +
      '<a href="#" class="btn cta-btn"' + drag('btn', 'text') + ' data-text>Get in touch</a></div></div></section>';
  }

  function flash(sec) {
    sec.classList.remove('sec-flash');
    void sec.offsetWidth; // restart the animation
    sec.classList.add('sec-flash');
    setTimeout(function () { sec.classList.remove('sec-flash'); }, 1100);
  }

  function addSection(type, before) {
    secCount += 1;
    var id = 's' + secCount;
    var wrap = document.createElement('div');
    wrap.innerHTML = newSectionHTML(type, id);
    var sec = wrap.firstChild;
    main.insertBefore(sec, before || null);
    // Give the new images a spread of photos.
    sec.querySelectorAll('img[data-img]').forEach(function (img, i) {
      state.images[img.dataset.img] = (secCount + i) % IMAGES.length;
    });
    initSection(sec);
    render();
    sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
    flash(sec);
  }

  // Copy a section with its current text, images, layout, positions and sizes, and place the copy below it.
  var dupCount = 0;
  function duplicateSection(sec) {
    dupCount += 1;
    secCount += 1;
    var id = 's' + secCount;
    var pre = 'd' + dupCount + '-';
    var copy = sec.cloneNode(true);
    // Strip the editing chrome; initSection adds fresh chrome to the copy.
    copy.querySelectorAll('.grid, .gv, .gh, .selbox, .ov, .tb, .xlayer, .lp').forEach(function (n) { n.remove(); });
    copy.classList.remove('on', 'sec-flash');
    copy.removeAttribute('data-mode');
    copy.querySelectorAll('.doomed, .dragging, .fresh').forEach(function (n) { n.classList.remove('doomed', 'dragging', 'fresh'); });
    copy.querySelectorAll('[contenteditable]').forEach(function (n) { n.removeAttribute('contenteditable'); });
    // Give every item and image in the copy its own key, carrying over its position, size and photo.
    copy.querySelectorAll('[data-drag]').forEach(function (n) {
      var k = n.dataset.drag, nk = pre + k;
      if (state.offsets[k]) state.offsets[nk] = { x: state.offsets[k].x, y: state.offsets[k].y };
      if (state.sizes[k]) state.sizes[nk] = { w: state.sizes[k].w, h: state.sizes[k].h };
      n.dataset.drag = nk;
    });
    copy.querySelectorAll('[data-img]').forEach(function (n) {
      var k = n.dataset.img;
      state.images[pre + k] = state.images[k] || 0;
      n.dataset.img = pre + k;
    });
    copy.querySelectorAll('[data-key]').forEach(function (n) { n.dataset.key = pre + n.dataset.key; });
    state.layout[id] = layoutOf(sec);
    copy.dataset.section = id;
    main.insertBefore(copy, sec.nextSibling);
    initSection(copy);
    render();
    copy.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    flash(copy);
  }

  function moveSection(sec, dir) {
    var secs = allSections();
    var i = secs.indexOf(sec);
    var j = i + dir;
    if (j < 0 || j >= secs.length) return;
    if (dir < 0) main.insertBefore(sec, secs[j]);
    else main.insertBefore(sec, secs[j].nextSibling);
    sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    flash(sec);
  }

  function deleteSection(sec) {
    sec._lp.classList.remove('show');
    var ph = document.createComment('deleted section');
    sec.replaceWith(ph);
    lastDeleted = { sec: sec, ph: ph };
    showToast(sec.dataset.title + ' deleted', 'Undo', function () {
      if (!lastDeleted) return;
      lastDeleted.ph.replaceWith(lastDeleted.sec);
      flash(lastDeleted.sec);
      lastDeleted = null;
      render();
    });
  }

  // A small toast with one action, used for undoing a deleted section.
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  var toastTimer = null;
  function showToast(msg, actionLabel, action) {
    toast.innerHTML = '<span></span><button type="button"></button>';
    toast.firstChild.textContent = msg;
    toast.lastChild.textContent = actionLabel;
    toast.lastChild.onclick = function () { hideToast(); action(); };
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 6000);
  }
  function hideToast() { toast.classList.remove('show'); }

  // "Add section" inserters sit in the gaps above, between and below sections.
  function renderInserters() {
    closePicker();
    main.querySelectorAll('.ins').forEach(function (n) { n.remove(); });
    var secs = allSections();
    secs.concat([null]).forEach(function (sec) {
      var ins = document.createElement('div');
      ins.className = 'ins';
      ins.innerHTML = '<span class="insline" aria-hidden="true"></span><button class="insbtn" type="button" aria-haspopup="true">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>Add section</button>';
      main.insertBefore(ins, sec);
    });
  }

  // The section picker, opened from an inserter.
  var picker = document.createElement('div');
  picker.className = 'picker';
  picker.setAttribute('role', 'dialog');
  picker.setAttribute('aria-label', 'Add a section');
  picker.innerHTML = '<span class="pickh">Choose a section to add here</span><div class="picko">' +
    SECTION_TYPES.map(function (t) {
      var rects = LAYOUTS[t][0].rects.map(function (r) {
        return '<span style="left:' + r[0] + 'px;top:' + r[1] + 'px;width:' + r[2] + 'px;height:' + r[3] + 'px;background:' + r[4] + '"></span>';
      }).join('');
      return '<button class="lo" data-new="' + t + '"><span class="th" aria-hidden="true">' + rects + '</span><span>' + TITLES[t].replace(' section', '') + '</span></button>';
    }).join('') + '</div><button type="button" class="pickx" data-pick-cancel>Cancel</button>';
  document.body.appendChild(picker);
  var pickerTarget = null;

  // Opening the picker opens a space in the gap between the two sections and shows the picker in it.
  function openPicker(ins) {
    if (pickerTarget === ins) return;
    closePicker();
    pickerTarget = ins;
    ins.appendChild(picker);
    picker.classList.add('show');
    ins.classList.add('open');
    setTimeout(function () { ins.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 220);
    picker.querySelector('[data-new]').focus({ preventScroll: true });
  }
  function closePicker() {
    if (!pickerTarget) return;
    picker.classList.remove('show');
    pickerTarget.classList.remove('open');
    document.body.appendChild(picker);
    pickerTarget = null;
  }

  // In Edit layout, a click anywhere except the layouts panel and the layout tools leaves the mode,
  // back to the normal hover overlay. That click does nothing else.
  document.addEventListener('click', function (e) {
    if (state.mode !== 'layout' || !state.active) return;
    var sec = document.querySelector('.sec[data-section="' + state.active + '"]');
    if (!sec) return;
    var t = e.target;
    if (sec._lp.contains(t) || t.closest('.tb') || t.closest('.xbtn') || t.closest('#reset-all') || t.closest('.toast')) return;
    e.preventDefault();
    e.stopPropagation();
    state.active = null;
    state.mode = null;
    state.selected = null;
    render();
  }, true);

  function closeAddMenus() {
    document.querySelectorAll('.addwrap.open').forEach(function (w) {
      w.classList.remove('open');
      w.querySelector('.addtrig').setAttribute('aria-expanded', 'false');
    });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.addwrap')) closeAddMenus();
    var insBtn = e.target.closest('.insbtn');
    if (insBtn) { openPicker(insBtn.parentNode); return; }
    var choice = e.target.closest('[data-new]');
    if (choice && pickerTarget) {
      var before = pickerTarget.nextElementSibling && pickerTarget.nextElementSibling.classList.contains('sec') ? pickerTarget.nextElementSibling : null;
      closePicker();
      addSection(choice.dataset.new, before);
      return;
    }
    if (e.target.closest('[data-pick-cancel]') || !e.target.closest('.picker')) closePicker();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePicker(); closeAddMenus(); } });

  render();
})();
