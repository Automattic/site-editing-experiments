/*
 * Vermeer · B · Hover notice: its own route, prompt outcomes, code parts,
 * keyboard entry and the first-touch rule. Run by smoke.mjs.
 */
export default async function ({ page, baseUrl, assert, helpers: h }) {
  const notice = page.locator('.vm-stage > .vb-notice');
  const prompts = async () => (await h.state(page)).stats.prompts;
  const expectPrompts = async (want, label) => {
    const p = await prompts();
    assert.deepEqual({ shown: p.shown, accepted: p.accepted, dismissed: p.dismissed, ignored: p.ignored }, want, label);
  };
  const vp = async () => page.locator('.vm-viewport').boundingBox();
  // A plain spot on the site (the picks section), and one outside it (the sidebar).
  const spot = async (dy = 0) => { const b = await vp(); return { x: b.x + b.width / 2 + 40, y: b.y + b.height / 2 + dy }; };
  const outside = async () => { const b = await page.locator('.vm-sidebar').boundingBox(); return { x: b.x + b.width / 2, y: b.y + 120 }; };
  const restOnSite = async (dy = 0) => { const p = await spot(dy); await h.restAt(page, p.x, p.y); };
  // The copy of Edit sits exactly on the real one (rect within 0.5px) and
  // looks like it; the card wraps it with padding and stays in the canvas.
  const checkPlacement = async (where) => {
    const m = await page.evaluate(() => {
      const r = (sel) => document.querySelector(sel).getBoundingClientRect();
      const real = r('.vm-toolbar [data-action="edit"]'), copy = r('.vb-notice [data-vb="start"]'), n = r('.vb-notice'), cv = r('.vm-canvas');
      return {
        d: Math.max(...['left', 'top', 'width', 'height'].map((k) => Math.abs(real[k] - copy[k]))),
        pad: [copy.top - n.top, n.right - copy.right, n.bottom - copy.bottom],
        inCanvas: n.left >= cv.left && n.right <= cv.right + 0.5 && n.top >= cv.top - 0.5,
        same: ['backgroundColor', 'color', 'borderRadius', 'fontSize', 'fontWeight', 'fontFamily'].every((p) => getComputedStyle(document.querySelector('.vm-toolbar [data-action="edit"]'))[p] === getComputedStyle(document.querySelector('.vb-notice [data-vb="start"]'))[p]),
        // What's on top at the middle of the real Edit button: the copy.
        onTop: document.elementFromPoint(real.left + real.width / 2, real.top + real.height / 2).closest('[data-vb="start"]') !== null
      };
    });
    assert.ok(m.d <= 0.5, where + ': the copy has the real Edit button’s rect (' + m.d + ')');
    assert.ok(m.same, where + ': the copy looks like the real Edit button');
    assert.ok(m.pad.every((p) => p >= 4 && p <= 8.5), where + ': the card wraps it with padding (' + m.pad + ')');
    assert.ok(m.inCanvas, where + ': the card stays inside the canvas');
    assert.ok(m.onTop, where + ': the copy is on top of the real Edit');
  };
  const moveOut = async () => { const p = await outside(); await page.mouse.move(p.x, p.y, { steps: 3 }); };

  await page.goto(baseUrl + '/hover-notice.html#notes');

  h.step('a pointer already resting on the site when the page loads doesn’t count until it moves');
  const still = await spot();
  await page.goto('about:blank');
  await page.mouse.move(still.x, still.y);
  await page.goto(baseUrl + '/hover-notice.html#notes');
  await page.waitForTimeout(900);
  assert.equal(await notice.count(), 0, 'no notice from a pointer that hasn’t moved since load');
  assert.equal(await h.count(page, 'arm-b-later-at-edit'), '0', 'the later-entries count shows from the start');

  h.step('appears on the pointer’s first movement over the site, with no wait, top right under the toolbar, its Edit lined up under the real one');
  const p0 = await spot(30);
  await page.mouse.move(p0.x, p0.y);
  assert.equal(await notice.count(), 1, 'shown straight away');
  assert.equal(await notice.locator('.vb-notice-text').innerText(), 'Trying to change something on this page?');
  assert.equal(await notice.getByRole('button', { name: 'Edit', exact: true }).count(), 1);
  assert.equal(await notice.getByRole('button', { name: 'Close' }).count(), 1);
  assert.equal(await notice.getAttribute('role'), 'region');
  {
    await page.waitForTimeout(250); // the slide-in
    await checkPlacement('1440 wide, with the notes panel');
  }
  await expectPrompts({ shown: 1, accepted: 0, dismissed: 0, ignored: 0 }, 'shown once');
  await page.waitForTimeout(1100);
  assert.equal((await h.state(page)).stats.arm['b-seen'], 1, 'up for a second: counted as seen');

  h.step('moving while it shows, scrolling and going to another page keep it; the site isn’t pushed down');
  const top0 = await page.locator('.vm-site').evaluate((el) => el.getBoundingClientRect().top);
  await page.mouse.move(p0.x + 30, p0.y + 30, { steps: 3 });
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  assert.equal(await notice.count(), 1);
  await page.locator('.vm-viewport').evaluate((el) => { el.scrollTop = 0; });
  assert.equal(await page.locator('.vm-site').evaluate((el) => el.getBoundingClientRect().top), top0, 'site not pushed down');

  h.step('it follows the real Edit button when the window changes size (1024 wide)');
  await page.setViewportSize({ width: 1024 + 360, height: 768 });
  await page.waitForTimeout(100);
  await checkPlacement('1024 wide, with the notes panel');
  await page.setViewportSize({ width: 1440 + 360, height: 900 });
  await page.waitForTimeout(100);
  await checkPlacement('back at 1440');

  h.step('it lies over the toolbar’s right end (···, View, the status tick), not the site; the pointer over it keeps it; clicks on it aren’t chrome or toolbar clicks');
  const covered = await page.evaluate(() => {
    const n = document.querySelector('.vb-notice').getBoundingClientRect();
    const hit = (el) => { const e = el.getBoundingClientRect(); return e.right > n.left && e.left < n.right && e.bottom > n.top && e.top < n.bottom; };
    return { toolbar: [...document.querySelectorAll('.vm-toolbar [data-action]')].filter(hit).map((el) => el.dataset.action), site: [...document.querySelectorAll('.vm-site [data-k]')].filter(hit).map((el) => el.dataset.k) };
  });
  for (const a of ['page-options', 'view', 'edit']) assert.ok(covered.toolbar.includes(a), 'covers ' + a);
  assert.deepEqual(covered.site, [], 'covers nothing in the site');
  {
    const t = await notice.locator('.vb-notice-text').boundingBox();
    await page.mouse.move(t.x + 20, t.y + t.height / 2, { steps: 6 });
    await page.waitForTimeout(1400);
    assert.equal(await notice.count(), 1, 'the pointer over the card keeps it');
    const g = (await h.state(page)).stats.gTotal, log = (await h.logTexts(page)).length;
    await page.mouse.click(t.x + 20, t.y + t.height / 2);
    assert.equal((await h.state(page)).stats.gTotal, g, 'not a chrome click');
    assert.equal(await h.mode(page), 'browse');
    assert.equal(await notice.count(), 1);
    assert.equal((await h.logTexts(page)).length, log, 'nothing logged for a click on its text');
    await page.mouse.move(p0.x, p0.y, { steps: 4 });
  }

  h.step('leaving for under a second keeps it; leaving for a second is ignored');
  await moveOut();
  await page.waitForTimeout(500);
  await page.mouse.move(p0.x, p0.y, { steps: 2 });
  await page.waitForTimeout(900);
  assert.equal(await notice.count(), 1, 'came back in time');
  await moveOut();
  await page.waitForTimeout(500);
  assert.equal(await notice.count(), 1, 'still there half a second after leaving');
  await page.waitForTimeout(800);
  assert.equal(await notice.count(), 0, 'gone a second after leaving');
  await expectPrompts({ shown: 1, accepted: 0, dismissed: 0, ignored: 1 }, 'ignored');

  h.step('the page finder over the site holds it off');
  await h.tool(page, 'pages').click();
  const pick = await page.locator('.vm-finder [data-page="contact"]').boundingBox();
  await h.restAt(page, pick.x + 20, pick.y + pick.height / 2);
  assert.equal(await notice.count(), 0, 'not over the page finder');
  await page.keyboard.press('Escape');
  await page.locator('.vm-finder').waitFor({ state: 'detached' });

  h.step('the notice’s Edit: accepted, edit mode with nothing selected');
  await restOnSite();
  await notice.waitFor();
  await notice.getByRole('button', { name: 'Edit', exact: true }).click();
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.editingKey(page), null);
  assert.equal(await h.selected(page), null);
  assert.equal(await notice.count(), 0);
  await expectPrompts({ shown: 2, accepted: 1, dismissed: 0, ignored: 1 }, 'accepted');
  assert.equal((await h.state(page)).stats.byRoute['b-notice'], 1);

  h.step('never in edit mode');
  await restOnSite(40);
  assert.equal(await notice.count(), 0, 'no notice while editing');

  h.step('× after Exit: dismissed, and not again in this browse spell, even after a reload');
  await h.exit(page);
  await restOnSite();
  await notice.waitFor();
  await notice.getByRole('button', { name: 'Close' }).click();
  assert.equal(await notice.count(), 0);
  await expectPrompts({ shown: 3, accepted: 1, dismissed: 1, ignored: 1 }, 'dismissed');
  await moveOut();
  await restOnSite(60);
  assert.equal(await notice.count(), 0, 'stays dismissed');
  await page.reload();
  await restOnSite();
  await page.waitForTimeout(300);
  assert.equal(await notice.count(), 0, 'stays dismissed after a reload');

  h.step('back after the next Exit (a new browse spell)');
  await h.edit(page);
  await h.exit(page);
  await restOnSite();
  await notice.waitFor();
  await expectPrompts({ shown: 4, accepted: 1, dismissed: 1, ignored: 1 }, 'shown in the new spell');

  h.step('seen needs a second of the pointer in the site while it shows, not just a second up');
  {
    const seenBefore = (await h.state(page)).stats.arm['b-seen'] || 0;
    // restOnSite above had the pointer in for about 0.65 s: leave straight away.
    await page.mouse.move(10, 10); // the admin bar, outside the site
    await page.waitForTimeout(600); // inside the leave grace: still shown
    assert.equal(await notice.count(), 1, 'still up within the grace');
    { const p = await spot(); await page.mouse.move(p.x, p.y, { steps: 2 }); }
    await page.waitForTimeout(600);
    assert.equal((await h.state(page)).stats.arm['b-seen'] || 0, seenBefore, 'up about 2 s but never a full second with the pointer in: not seen');
    await page.waitForTimeout(600);
    assert.equal((await h.state(page)).stats.arm['b-seen'] || 0, seenBefore + 1, 'a full second in: seen');
  }

  h.step('a reload with it open records it as ignored, once');
  await page.reload();
  await expectPrompts({ shown: 4, accepted: 1, dismissed: 1, ignored: 2 }, 'ignored by the reload');
  assert.equal(await notice.count(), 0, 'not drawn again by the reload itself');
  await page.reload();
  await expectPrompts({ shown: 4, accepted: 1, dismissed: 1, ignored: 2 }, 'not counted again by a second reload');

  h.step('keyboard: focus moving into the site shows it, announced, with its Edit next in the Tab order');
  // Straight out, so no step of the move lands on the site (which now shows it at once).
  { const o = await outside(); await page.mouse.move(o.x, o.y); }
  await h.tool(page, 'edit').focus();
  await page.keyboard.press('Tab');
  await notice.waitFor();
  const first = await page.evaluate(() => document.activeElement.dataset.k || document.activeElement.textContent);
  assert.equal(first, 'site-name', 'focus went into the site as usual');
  await page.waitForTimeout(80);
  assert.match(await page.locator('.vm-live').innerText(), /Trying to change something on this page\? Press Tab/);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.vb), 'start');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.k), 'site-name', 'Shift-Tab goes back');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.vb), 'close');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.k), 'nav-home', 'then on into the site after the site name');
  assert.equal(await notice.count(), 1, 'still there while focus is in the site');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'view', 'back out past the real Edit (out of the Tab order while the card is over it) to View');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.k), 'site-name');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.vb), 'start', 'its Edit next again on coming back in');
  await page.keyboard.press('Enter');
  assert.equal(await h.mode(page), 'edit');
  {
    const st = (await h.state(page)).stats;
    assert.equal(st.byRoute['b-notice-again'], 1, 'a later press of the copy, after having been in editing, has its own route');
    assert.equal(st.byRoute['b-notice-keyboard'] || 0, 0);
    // Entries: the notice's Edit first, then the real Edit, then the copy again.
    assert.deepEqual(st.byRoute, { 'b-notice': 1, 'edit-button': 1, 'b-notice-again': 1 });
    assert.equal(await h.count(page, 'arm-b-later-at-edit'), '2', 'later entries at Edit’s place: the real Edit and the copy');
  }
  await expectPrompts({ shown: 5, accepted: 2, dismissed: 1, ignored: 2 }, 'keyboard accepted');
  await h.exit(page);

  h.step('the code: VB, first entry by the notice, prompts 5.2.1.2');
  const code = await h.finishCode(page);
  h.checkCode(code, { arm: 'VB', tasks: '000000', f: 'a', n: 0, p: '5.2.1.2', l: '0.0', x: 3, b: 3 });

  h.step('the Edit button still works and gives the e letter');
  await h.reset(page);
  await h.edit(page);
  h.checkCode(await h.finishCode(page), { arm: 'VB', f: 'e', p: '0.0.0.0' });

  h.step('touch: the first tap shows the notice and doesn’t follow the link under the finger; then taps work');
  const context = await page.context().browser().newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
  const tp = await context.newPage();
  const errors = [];
  tp.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  tp.on('pageerror', (e) => errors.push(String(e)));
  try {
    await tp.goto(baseUrl + '/hover-notice.html');
    await h.k(tp, 'nav-events').tap();
    await tp.locator('.vm-stage > .vb-notice').waitFor();
    await tp.waitForTimeout(300);
    assert.equal(await h.currentPage(tp), 'home', 'the first tap wasn’t passed through');
    assert.equal(await h.mode(tp), 'browse');
    const st = await h.state(tp);
    assert.equal(st.stats.follows, 0, 'no link follow counted');
    assert.equal(st.stats.nfTotal, 0, 'not counted as a click that did nothing');
    // The notice sits over the toolbar, so the menu stays clear.
    assert.equal(await tp.evaluate(() => { const r = document.querySelector('.vm-site [data-k="nav-events"]').getBoundingClientRect(); return !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).closest('.vb-notice'); }), false, 'the notice doesn’t cover the menu');
    await h.k(tp, 'nav-events').tap();
    await tp.waitForTimeout(200);
    assert.equal(await h.currentPage(tp), 'events', 'the second tap follows the link');
    assert.equal(await tp.locator('.vm-stage > .vb-notice').count(), 1, 'the notice stays');
    await tp.locator('.vb-notice').getByRole('button', { name: 'Close' }).tap();
    await h.k(tp, 'nav-contact').tap();
    await tp.waitForTimeout(200);
    assert.equal(await h.currentPage(tp), 'contact');
    assert.equal(await tp.locator('.vm-stage > .vb-notice').count(), 0);
    h.checkCode(await h.finishCode(tp), { arm: 'VB', f: 'x', p: '1.0.1.0', l: '2.0' });
    h.step('touch: a first tap where the notice will appear doesn’t land on its button');
    await tp.evaluate(() => localStorage.clear());
    await tp.reload();
    const b = await tp.locator('.vm-viewport').boundingBox();
    await tp.touchscreen.tap(b.x + b.width / 2, b.y + b.height - 50);
    await tp.locator('.vm-stage > .vb-notice').waitFor();
    await tp.waitForTimeout(300);
    assert.equal(await h.mode(tp), 'browse', 'still browsing');
    assert.equal((await h.state(tp)).stats.prompts.accepted, 0);
    assert.deepEqual(errors, [], 'console errors (touch): ' + errors.join('\n'));
  } finally {
    await context.close();
  }

  h.step('touch that becomes a scroll: the next tap isn’t swallowed');
  {
    const ctx = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 } });
    const tp = await ctx.newPage();
    const errors = [];
    tp.on('pageerror', (err) => errors.push(String(err)));
    try {
      await tp.goto(baseUrl + '/hover-notice.html');
      await h.k(tp, 'picks-intro').evaluate((el) => {
        el.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true, cancelable: true, isPrimary: true }));
        el.dispatchEvent(new PointerEvent('pointercancel', { pointerType: 'touch', bubbles: true, isPrimary: true }));
      });
      await tp.locator('.vm-stage > .vb-notice').waitFor();
      await h.k(tp, 'nav-events').click();
      assert.equal(await h.currentPage(tp), 'events', 'the tap after the scroll follows the link');
      h.step('B: the real Edit is covered by the copy and out of the Tab order while it shows; back in it once the notice goes');
      assert.equal(await tp.evaluate(() => { const r = document.querySelector('.vm-toolbar [data-action="edit"]').getBoundingClientRect(); return !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).closest('.vb-notice'); }), true, 'the copy is on top');
      assert.equal(await h.tool(tp, 'edit').getAttribute('tabindex'), '-1');
      await tp.locator('.vb-notice').getByRole('button', { name: 'Close' }).click();
      assert.equal(await h.tool(tp, 'edit').getAttribute('tabindex'), null);
      await h.edit(tp);
      assert.equal(await h.mode(tp), 'edit');
      assert.deepEqual(errors, []);
    } finally {
      await ctx.close();
    }
  }
}
