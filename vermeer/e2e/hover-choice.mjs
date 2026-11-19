/*
 * Vermeer · D · Hover choice: its own route, prompt outcomes, code parts,
 * keyboard entry and the touch rule. Run by smoke.mjs.
 */
export default async function ({ page, baseUrl, assert, helpers: h }) {
  const overlay = page.locator('.vm-layer .vd-overlay');
  const prompts = async () => (await h.state(page)).stats.prompts;
  const expectPrompts = async (want, label) => {
    const p = await prompts();
    assert.deepEqual({ shown: p.shown, accepted: p.accepted, dismissed: p.dismissed, ignored: p.ignored }, want, label);
  };
  const vp = async () => page.locator('.vm-viewport').boundingBox();
  const spot = async (dy = 0) => { const b = await vp(); return { x: b.x + b.width / 2 + 40, y: b.y + b.height / 2 + dy }; };
  const outside = async () => { const b = await page.locator('.vm-sidebar').boundingBox(); return { x: b.x + b.width / 2, y: b.y + 120 }; };
  const restOnSite = async (dy = 0) => { const p = await spot(dy); await h.restAt(page, p.x, p.y); };
  const moveOut = async () => { const p = await outside(); await page.mouse.move(p.x, p.y, { steps: 3 }); };
  const active = () => page.evaluate(() => { const a = document.activeElement; return a.dataset.vd || a.dataset.k || a.dataset.action || a.tagName; });
  const editExit = async () => { await h.edit(page); await h.exit(page); };

  await page.goto(baseUrl + '/hover-choice.html#notes');

  h.step('a pointer already resting on the site when the page loads doesn’t count until it moves');
  await page.mouse.move(...Object.values(await spot()));
  await page.reload();
  await page.waitForTimeout(h.HOVER_REST_MS + 400);
  assert.equal(await overlay.count(), 0);

  h.step('appears after the rest, not before, covering the site area');
  const p0 = await spot(30);
  await page.mouse.move(p0.x, p0.y, { steps: 4 });
  await page.waitForTimeout(h.HOVER_REST_MS - 250);
  assert.equal(await overlay.count(), 0, 'not before HOVER_REST_MS');
  await page.waitForTimeout(400);
  await overlay.waitFor();
  assert.equal(await overlay.locator('.vd-question').innerText(), 'What would you like to do?');
  assert.equal(await overlay.getByRole('button', { name: 'Edit', exact: true }).count(), 1);
  assert.equal(await overlay.getByRole('button', { name: 'Browse', exact: true }).count(), 1);
  {
    const o = await overlay.boundingBox(), l = await page.locator('.vm-layer').boundingBox();
    assert.deepEqual([o.x, o.y, o.width, o.height].map(Math.round), [l.x, l.y, l.width, l.height].map(Math.round), 'covers the site area');
  }
  await expectPrompts({ shown: 1, accepted: 0, dismissed: 0, ignored: 0 }, 'shown');

  h.step('the pointer leaving before a choice: ignored at once; it comes back on the next rest');
  await moveOut();
  assert.equal(await overlay.count(), 0);
  await expectPrompts({ shown: 1, accepted: 0, dismissed: 0, ignored: 1 }, 'ignored');
  await restOnSite();
  await overlay.waitFor();

  h.step('a click on the layer outside the buttons does nothing; the wheel still scrolls the site');
  const ob = await overlay.boundingBox();
  await page.mouse.click(ob.x + 30, ob.y + 30);
  assert.equal(await overlay.count(), 1);
  assert.equal(await h.mode(page), 'browse');
  const st0 = await h.state(page);
  assert.equal(st0.stats.arm['d-layer-clicks'], 1);
  assert.equal(st0.stats.nfTotal, 0, 'not a site click');
  await page.mouse.move(ob.x + 40, ob.y + 40);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(200);
  assert.ok(await page.locator('.vm-viewport').evaluate((el) => el.scrollTop) > 100, 'site scrolled under the layer');
  assert.equal(await overlay.count(), 1, 'scrolling keeps it');

  h.step('Edit: accepted, edit mode with nothing selected');
  await overlay.getByRole('button', { name: 'Edit', exact: true }).click();
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.editingKey(page), null);
  assert.equal(await h.selected(page), null);
  assert.equal(await overlay.count(), 0);
  assert.equal((await h.state(page)).stats.byRoute['d-overlay'], 1);
  await expectPrompts({ shown: 2, accepted: 1, dismissed: 0, ignored: 1 }, 'accepted');

  h.step('never in edit mode');
  await restOnSite(40);
  assert.equal(await overlay.count(), 0);

  h.step('Browse: dismissed for this browse spell, even after a reload');
  await h.exit(page);
  await restOnSite();
  await overlay.waitFor();
  await overlay.getByRole('button', { name: 'Browse', exact: true }).click();
  assert.equal(await overlay.count(), 0);
  await expectPrompts({ shown: 3, accepted: 1, dismissed: 1, ignored: 1 }, 'dismissed');
  await moveOut();
  await restOnSite(60);
  assert.equal(await overlay.count(), 0, 'stays dismissed');
  await page.reload();
  await restOnSite();
  await page.waitForTimeout(300);
  assert.equal(await overlay.count(), 0, 'stays dismissed after a reload');

  h.step('back after the next Exit; a reload with it open records it as ignored, once');
  await editExit();
  await restOnSite();
  await overlay.waitFor();
  await page.reload();
  await expectPrompts({ shown: 4, accepted: 1, dismissed: 1, ignored: 2 }, 'ignored by the reload');
  assert.equal(await overlay.count(), 0);
  await page.reload();
  await expectPrompts({ shown: 4, accepted: 1, dismissed: 1, ignored: 2 }, 'not again on a second reload');

  h.step('not over the Finished dialog');
  await page.locator('[data-action="finish"]').click();
  await page.locator('dialog.vm-finish').getByText('Have you done every task?').waitFor();
  const v = await vp();
  await h.restAt(page, v.x + 60, v.y + 60);
  await h.restAt(page, v.x + 80, v.y + v.height - 60);
  assert.equal(await overlay.count(), 0, 'not while the dialog is open');
  await page.locator('dialog.vm-finish').getByRole('button', { name: 'Not yet, keep editing' }).click();

  h.step('keyboard: focus into the site shows it with focus on Edit; Escape is Browse and puts focus back');
  await moveOut();
  await h.tool(page, 'edit').focus();
  await page.keyboard.press('Tab');
  await overlay.waitFor();
  assert.equal(await active(), 'edit', 'focus on Edit');
  await page.keyboard.press('Escape');
  assert.equal(await overlay.count(), 0);
  assert.equal(await active(), 'site-name', 'focus back where it was going');
  await expectPrompts({ shown: 5, accepted: 1, dismissed: 2, ignored: 2 }, 'Escape dismissed');

  h.step('keyboard: Tab and Shift-Tab move between the two buttons; Enter on Edit');
  await editExit();
  await moveOut();
  await h.tool(page, 'edit').focus();
  await page.keyboard.press('Tab');
  await overlay.waitFor();
  assert.equal(await active(), 'edit');
  await page.keyboard.press('Tab');
  assert.equal(await active(), 'browse');
  await page.keyboard.press('Tab');
  assert.equal(await active(), 'edit');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await active(), 'browse');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await active(), 'edit');
  await page.keyboard.press('Enter');
  assert.equal(await h.mode(page), 'edit');
  assert.equal((await h.state(page)).stats.byRoute['d-overlay-keyboard'], 1);
  await expectPrompts({ shown: 6, accepted: 2, dismissed: 2, ignored: 2 }, 'keyboard accepted');
  await h.exit(page);

  h.step('the code: VD, first entry by the layer, prompts 6.2.2.2');
  h.checkCode(await h.finishCode(page), { arm: 'VD', tasks: '00000', f: 'a', n: 0, p: '6.2.2.2', l: '0.0', x: 4, b: 4 });

  h.step('the Edit button still works and gives the e letter');
  await h.reset(page);
  await h.edit(page);
  h.checkCode(await h.finishCode(page), { arm: 'VD', f: 'e', p: '0.0.0.0' });

  h.step('touch: a tap shows the layer and doesn’t follow the link under the finger; after Browse taps work');
  const context = await page.context().browser().newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true });
  const tp = await context.newPage();
  const errors = [];
  tp.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  tp.on('pageerror', (e) => errors.push(String(e)));
  try {
    await tp.goto(baseUrl + '/hover-choice.html');
    await h.k(tp, 'nav-events').tap();
    const to = tp.locator('.vm-layer .vd-overlay');
    await to.waitFor();
    await tp.waitForTimeout(300);
    assert.equal(await h.currentPage(tp), 'home', 'the tap wasn’t passed through');
    const st = await h.state(tp);
    assert.equal(st.stats.follows, 0);
    assert.equal(st.stats.nfTotal, 0);
    await to.getByRole('button', { name: 'Browse', exact: true }).tap();
    assert.equal(await to.count(), 0);
    await h.k(tp, 'nav-events').tap();
    await tp.waitForTimeout(200);
    assert.equal(await h.currentPage(tp), 'events', 'after Browse the tap follows the link');
    assert.equal(await to.count(), 0);
    h.checkCode(await h.finishCode(tp), { arm: 'VD', f: 'x', p: '1.0.1.0', l: '1.0' });
    assert.deepEqual(errors, [], 'console errors (touch): ' + errors.join('\n'));
  } finally {
    await context.close();
  }

  h.step('D: the layer is a modal dialog and the site is inert while it shows; the Edit button’s name in the log');
  {
    const ctx = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 } });
    const tp = await ctx.newPage();
    try {
      await tp.goto(baseUrl + '/hover-choice.html');
      const b = await tp.locator('.vm-viewport').boundingBox();
      await h.restAt(tp, b.x + b.width / 2, b.y + b.height / 2);
      const o = tp.locator('.vm-layer .vd-overlay');
      await o.waitFor();
      assert.equal(await o.getAttribute('role'), 'dialog');
      assert.equal(await o.getAttribute('aria-modal'), 'true');
      assert.equal(await tp.getByRole('dialog', { name: 'What would you like to do?' }).count(), 1);
      assert.equal(await tp.evaluate(() => window.Vermeer.site.inert), true);
      // Pressed without moving the pointer off the site (which would be ignored first).
      await tp.evaluate(() => document.querySelector('.vm-toolbar [data-action="edit"]').click());
      assert.equal(await tp.evaluate(() => window.Vermeer.site.inert), false, 'not inert once it’s gone');
      assert.match((await h.logTexts(tp)).join('\n'), /Overlay ignored: went into editing by the Edit button/);
    } finally {
      await ctx.close();
    }
  }
}
