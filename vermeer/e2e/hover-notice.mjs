/*
 * Vermeer · B · Hover notice: its own route, prompt outcomes, code parts,
 * keyboard entry and the first-touch rule. Run by smoke.mjs.
 */
export default async function ({ page, baseUrl, assert, helpers: h }) {
  const notice = page.locator('.vm-layer .vb-notice');
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
  const moveOut = async () => { const p = await outside(); await page.mouse.move(p.x, p.y, { steps: 3 }); };

  await page.goto(baseUrl + '/hover-notice.html#notes');

  h.step('a pointer already resting on the site when the page loads doesn’t count until it moves');
  await page.mouse.move(...Object.values(await spot()));
  await page.reload();
  await page.waitForTimeout(h.HOVER_REST_MS + 400);
  assert.equal(await notice.count(), 0, 'no notice from a pointer that hasn’t moved since load');

  h.step('appears after the rest, not before, centred over the bottom of the site');
  const p0 = await spot(30);
  await page.mouse.move(p0.x, p0.y, { steps: 4 });
  await page.waitForTimeout(h.HOVER_REST_MS - 250);
  assert.equal(await notice.count(), 0, 'not before HOVER_REST_MS');
  await page.waitForTimeout(400);
  await notice.waitFor();
  assert.equal(await notice.locator('.vb-notice-text').innerText(), 'Trying to change something on this page?');
  assert.equal(await notice.getByRole('button', { name: 'Start editing' }).count(), 1);
  assert.equal(await notice.getByRole('button', { name: 'Close' }).count(), 1);
  assert.equal(await notice.getAttribute('role'), 'region');
  {
    await page.waitForTimeout(250); // the slide-in
    const n = await notice.boundingBox(), v = await vp();
    assert.ok(Math.abs(n.x + n.width / 2 - (v.x + v.width / 2)) < 2, 'centred');
    assert.ok(v.y + v.height - (n.y + n.height) > 8 && v.y + v.height - (n.y + n.height) < 40, 'near the bottom of the site area');
    const menu = await h.k(page, 'nav-events').boundingBox();
    assert.ok(menu.y + menu.height < n.y, 'doesn’t cover the menu');
  }
  await expectPrompts({ shown: 1, accepted: 0, dismissed: 0, ignored: 0 }, 'shown once');

  h.step('moving while it shows, scrolling and going to another page keep it; the site isn’t pushed down');
  const top0 = await page.locator('.vm-site').evaluate((el) => el.getBoundingClientRect().top);
  await page.mouse.move(p0.x + 30, p0.y + 30, { steps: 3 });
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  assert.equal(await notice.count(), 1);
  await page.locator('.vm-viewport').evaluate((el) => { el.scrollTop = 0; });
  assert.equal(await page.locator('.vm-site').evaluate((el) => el.getBoundingClientRect().top), top0, 'site not pushed down');

  h.step('the footer’s opening line can be scrolled clear of it and clicked');
  await page.locator('.vm-viewport').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  {
    const line = await h.k(page, 'footer-open').boundingBox(), n = await notice.boundingBox();
    assert.ok(line.y + line.height < n.y, 'footer line above the notice when scrolled to the bottom');
  }
  await page.locator('.vm-viewport').evaluate((el) => { el.scrollTop = 0; });

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

  h.step('the page list over the site holds it off');
  await h.tool(page, 'pages').click();
  const pick = await page.locator('.vm-picker [data-page="contact"]').boundingBox();
  await h.restAt(page, pick.x + 20, pick.y + pick.height / 2);
  assert.equal(await notice.count(), 0, 'not over the page list');
  await page.keyboard.press('Escape');
  await page.locator('.vm-picker').waitFor({ state: 'detached' });

  h.step('Start editing: accepted, edit mode with nothing selected');
  await restOnSite();
  await notice.waitFor();
  await notice.getByRole('button', { name: 'Start editing' }).click();
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

  h.step('a reload with it open records it as ignored, once');
  await page.reload();
  await expectPrompts({ shown: 4, accepted: 1, dismissed: 1, ignored: 2 }, 'ignored by the reload');
  assert.equal(await notice.count(), 0, 'not drawn again by the reload itself');
  await page.reload();
  await expectPrompts({ shown: 4, accepted: 1, dismissed: 1, ignored: 2 }, 'not counted again by a second reload');

  h.step('keyboard: focus moving into the site shows it, announced, with Start editing next in the Tab order');
  await moveOut();
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
  assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'edit', 'back out to the Edit button');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.k), 'site-name');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.vb), 'start', 'Start editing next again on coming back in');
  await page.keyboard.press('Enter');
  assert.equal(await h.mode(page), 'edit');
  assert.equal((await h.state(page)).stats.byRoute['b-notice-keyboard'], 1);
  await expectPrompts({ shown: 5, accepted: 2, dismissed: 1, ignored: 2 }, 'keyboard accepted');
  await h.exit(page);

  h.step('the code: VB, first entry by the notice, prompts 5.2.1.2');
  const code = await h.finishCode(page);
  h.checkCode(code, { arm: 'VB', tasks: '00000', f: 'a', n: 0, p: '5.2.1.2', l: '0.0', x: 3, b: 3 });

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
    await tp.locator('.vm-layer .vb-notice').waitFor();
    await tp.waitForTimeout(300);
    assert.equal(await h.currentPage(tp), 'home', 'the first tap wasn’t passed through');
    assert.equal(await h.mode(tp), 'browse');
    const st = await h.state(tp);
    assert.equal(st.stats.follows, 0, 'no link follow counted');
    assert.equal(st.stats.nfTotal, 0, 'not counted as a click that did nothing');
    await h.k(tp, 'nav-events').tap();
    await tp.waitForTimeout(200);
    assert.equal(await h.currentPage(tp), 'events', 'the second tap follows the link');
    assert.equal(await tp.locator('.vm-layer .vb-notice').count(), 1, 'the notice stays');
    await tp.locator('.vb-notice').getByRole('button', { name: 'Close' }).tap();
    await h.k(tp, 'nav-contact').tap();
    await tp.waitForTimeout(200);
    assert.equal(await h.currentPage(tp), 'contact');
    assert.equal(await tp.locator('.vm-layer .vb-notice').count(), 0);
    h.checkCode(await h.finishCode(tp), { arm: 'VB', f: 'x', p: '1.0.1.0', l: '2.0' });
    h.step('touch: a first tap where the notice will appear doesn’t land on its button');
    await tp.evaluate(() => localStorage.clear());
    await tp.reload();
    const b = await tp.locator('.vm-viewport').boundingBox();
    await tp.touchscreen.tap(b.x + b.width / 2, b.y + b.height - 50);
    await tp.locator('.vm-layer .vb-notice').waitFor();
    await tp.waitForTimeout(300);
    assert.equal(await h.mode(tp), 'browse', 'still browsing');
    assert.equal((await h.state(tp)).stats.prompts.accepted, 0);
    assert.deepEqual(errors, [], 'console errors (touch): ' + errors.join('\n'));
  } finally {
    await context.close();
  }
}
