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

  // Thumbnail colours: text, secondary text, image, accent, panel
  var TX = '#ECECEC', SB = '#A8A8A8', IG = 'rgba(255,255,255,0.32)', AC = '#9DB2FF', PN = 'rgba(255,255,255,0.12)';

  // Each rect is [x, y, w, h, colour] inside a 72×48 thumbnail.
  var LAYOUTS = {
    hero: [
      { id: 'split', label: 'Split', rects: [[7, 12, 26, 5, TX], [7, 21, 22, 3, SB], [7, 26, 18, 3, SB], [7, 33, 12, 5, AC], [40, 8, 26, 32, IG]] },
      { id: 'centered', label: 'Centered', rects: [[18, 5, 36, 5, TX], [22, 13, 28, 3, SB], [30, 19, 12, 4, AC], [8, 27, 56, 16, IG]] },
      { id: 'flip', label: 'Image left', rects: [[6, 8, 26, 32, IG], [39, 12, 26, 5, TX], [39, 21, 22, 3, SB], [39, 26, 18, 3, SB], [39, 33, 12, 5, AC]] }
    ],
    features: [
      { id: 'cols', label: 'Three columns', rects: [[6, 6, 30, 4, TX], [6, 15, 18, 14, IG], [27, 15, 18, 14, IG], [48, 15, 18, 14, IG], [6, 32, 14, 3, SB], [27, 32, 14, 3, SB], [48, 32, 14, 3, SB], [6, 37, 10, 3, SB], [27, 37, 10, 3, SB], [48, 37, 10, 3, SB]] },
      { id: 'list', label: 'Stacked list', rects: [[8, 5, 14, 10, IG], [26, 7, 30, 3, TX], [26, 11, 22, 2, SB], [8, 19, 14, 10, IG], [26, 21, 30, 3, TX], [26, 25, 22, 2, SB], [8, 33, 14, 10, IG], [26, 35, 30, 3, TX], [26, 39, 22, 2, SB]] },
      { id: 'feature', label: 'Featured + two', rects: [[6, 5, 30, 18, IG], [40, 9, 26, 4, TX], [40, 16, 20, 3, SB], [6, 27, 14, 16, IG], [22, 30, 12, 3, TX], [38, 27, 14, 16, IG], [54, 30, 12, 3, TX]] }
    ],
    cta: [
      { id: 'center', label: 'Centered', rects: [[6, 8, 60, 32, PN], [20, 14, 32, 5, TX], [24, 22, 24, 3, SB], [30, 29, 12, 6, AC]] },
      { id: 'split', label: 'Split', rects: [[6, 8, 60, 32, PN], [12, 17, 28, 5, TX], [12, 25, 22, 3, SB], [46, 20, 14, 8, AC]] },
      { id: 'banner', label: 'Dark banner', rects: [[6, 8, 60, 32, '#0E0E0E'], [12, 17, 28, 5, TX], [12, 25, 22, 3, SB], [46, 20, 14, 8, '#F4F2EE']] }
    ]
  };

  var MODES = {
    layout: { label: 'Edit layout', desc: 'Pick from preset arrangements for this section', hint: 'Pick a preset and watch the section change' },
    content: { label: 'Edit content', desc: 'Change text and images; positions stay put', hint: 'Click text to edit · Replace images · Positions are locked' },
    free: { label: 'Freeform', desc: 'Move and resize items; text and images are locked', hint: 'Drag to move · Select an item and drag its handles to resize · Text and images are locked' }
  };

  var ICONS = {
    layout: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3858E9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M9 9v12"></path></svg>',
    content: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3858E9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"></path><path d="M13 7l4 4"></path></svg>',
    free: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3858E9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"></path></svg>'
  };

  var SNAP_DISTANCE = 6;
  var MIN_SIZE = 40;
  var HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  function fresh() {
    return {
      active: null,
      mode: null,
      layout: { hero: 'split', features: 'cols', cta: 'center' },
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
  var sections = Array.prototype.slice.call(document.querySelectorAll('.sec'));

  // Remember the original copy so "Reset everything" can restore it.
  var originals = [];
  document.querySelectorAll('[data-text]').forEach(function (el) { originals.push([el, el.innerHTML]); });

  // ---------- Build the editing chrome for each section ----------
  sections.forEach(function (sec) {
    var key = sec.dataset.section;
    var title = sec.dataset.title;

    var overlayButtons = ['layout', 'content', 'free'].map(function (m) {
      return '<button class="ob" data-open="' + m + '">' + ICONS[m] +
        '<span class="obt">' + MODES[m].label + '</span>' +
        '<span class="obd">' + MODES[m].desc + '</span></button>';
    }).join('');

    var layoutButtons = LAYOUTS[key].map(function (l) {
      var rects = l.rects.map(function (r) {
        return '<span style="left:' + r[0] + 'px;top:' + r[1] + 'px;width:' + r[2] + 'px;height:' + r[3] + 'px;background:' + r[4] + '"></span>';
      }).join('');
      return '<button class="lo" data-layout-pick="' + l.id + '" aria-pressed="false">' +
        '<span class="th" aria-hidden="true">' + rects + '</span><span>' + l.label + '</span></button>';
    }).join('');

    sec.insertAdjacentHTML('afterbegin',
      '<div class="grid" aria-hidden="true"><div class="gridin">' + new Array(13).join('<span class="gcol"></span>') + '<span class="gmid"></span></div></div>' +
      '<span class="gv" aria-hidden="true"></span><span class="gh" aria-hidden="true"></span>' +
      '<div class="selbox" aria-hidden="true">' + HANDLES.map(function (h) { return '<span class="hd" data-h="' + h + '"></span>'; }).join('') + '<span class="dim"></span></div>' +
      '<div class="ov"><span class="ovl">' + title + '</span>' + overlayButtons + '</div>' +
      '<div class="tb"><span class="tbl"></span><span class="tbh"></span>' +
        '<div class="free-tools">' +
          '<button class="tbb" data-act="grid">Grid</button>' +
          '<button class="tbb" data-act="snap">Snap to guides</button>' +
          '<button class="tbb" data-act="resetpos">Reset positions and sizes</button>' +
        '</div><span class="spacer"></span><button class="done" data-act="done">Done</button></div>' +
      '<div class="lp" role="group" aria-label="' + title + ' layouts"><span class="lph">Layouts</span><div class="lpo">' + layoutButtons + '</div></div>'
    );

    sec.addEventListener('click', function (e) {
      // Links shouldn't navigate while a section is being edited.
      if (sec.dataset.mode && e.target.closest('a')) e.preventDefault();

      var btn = e.target.closest('button');
      if (!btn || !sec.contains(btn)) return;

      if (btn.dataset.open) {
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
      } else if (btn.dataset.act === 'replace') {
        var k = btn.dataset.key;
        state.images[k] = ((state.images[k] || 0) + 1) % IMAGES.length;
      } else {
        return;
      }
      render();
    });
  });

  document.getElementById('reset-all').addEventListener('click', function () {
    state = fresh();
    drag = null;
    originals.forEach(function (pair) { pair[0].innerHTML = pair[1]; });
    render();
  });

  // ---------- Render state onto the page ----------
  function render() {
    sections.forEach(function (sec) {
      var key = sec.dataset.section;
      var on = state.active === key;
      var mode = on ? state.mode : '';

      sec.classList.toggle('on', on);
      sec.dataset.mode = mode || '';
      sec.dataset.layout = state.layout[key];

      sec.querySelector('.tbl').textContent = mode ? MODES[mode].label : '';
      sec.querySelector('.tbh').textContent = mode ? MODES[mode].hint : '';

      sec.querySelectorAll('[data-text]').forEach(function (el) {
        el.contentEditable = mode === 'content' ? 'true' : 'false';
      });
      sec.querySelectorAll('[data-layout-pick]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.layoutPick === state.layout[key]));
      });

      var gridBtn = sec.querySelector('[data-act="grid"]');
      var snapBtn = sec.querySelector('[data-act="snap"]');
      gridBtn.classList.toggle('act', state.grid);
      gridBtn.setAttribute('aria-pressed', String(state.grid));
      snapBtn.classList.toggle('act', state.snap);
      snapBtn.setAttribute('aria-pressed', String(state.snap));
    });

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
    sections.forEach(function (sec) {
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

  render();
})();
