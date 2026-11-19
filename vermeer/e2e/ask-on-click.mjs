/*
 * Vermeer · A2 · Ask on click: the popover, its outcomes, keyboard, placing, the code.
 * Run by smoke.mjs (node vermeer/e2e/smoke.mjs).
 */
export default async function ({ page, baseUrl, assert, helpers: h }) {
  await page.goto(baseUrl + '/ask-on-click.html?notes');
  const pop = page.locator('.vm-layer .vm-ask');
  const focused = () => page.evaluate(() => { const a = document.activeElement; return a.dataset.choice || a.dataset.k || a.className; });
  const counts = async () => [await h.count(page, 'prompts-shown'), await h.count(page, 'prompts-accepted'), await h.count(page, 'prompts-dismissed'), await h.count(page, 'prompts-ignored')].join('.');
  // The popover lies inside the site area (the viewport less its scrollbar).
  const inside = async (label) => {
    const vp = await page.locator('.vm-viewport').evaluate((el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.left + el.clientWidth, b: r.top + el.clientHeight }; });
    const b = await pop.boundingBox();
    assert.ok(b.x >= vp.l + 4 && b.y >= vp.t + 4 && b.x + b.width <= vp.r - 4 && b.y + b.height <= vp.b - 4, label + ': popover inside the site area ' + JSON.stringify([b, vp]));
    return b;
  };

  h.step('A2: a drag to select text, links and buttons don’t ask');
  await h.dragSelect(page, 'picks-intro');
  assert.equal(await pop.count(), 0);
  await page.locator('.vm-site [data-act="bookclub"]').click();
  assert.equal(await page.locator('.vm-site .cl-club').count(), 1, 'the book club button works');
  await page.locator('.vm-site [data-act="bookclub"]').click();
  assert.equal(await pop.count(), 0);

  h.step('A2: a click on the heading asks, at the click, with focus on Edit; Escape is dismissed');
  const p1 = await h.clickTextBefore(page, 'home-heading', 'coffee', 0);
  assert.equal(await pop.count(), 1);
  assert.equal(await h.mode(page), 'browse');
  assert.equal(await page.getByRole('dialog', { name: 'Do you want to edit?' }).count(), 1, 'role dialog, named by its question');
  assert.deepEqual(await pop.getByRole('button').allInnerTexts(), ['No', 'Edit']);
  assert.equal(await focused(), 'edit', 'focus on Edit');
  const b1 = await inside('heading');
  assert.ok(b1.y > p1.y && b1.y - p1.y < 24 && b1.x <= p1.x && p1.x - b1.x < 48, 'just below the click point');
  await page.keyboard.press('Escape');
  assert.equal(await pop.count(), 0);
  assert.equal(await focused(), 'vm-viewport', 'focus back on the site area');
  assert.equal(await counts(), '1.0.1.0');

  h.step('A2: No is dismissed');
  await h.clickTextBefore(page, 'home-heading', 'quiet', 0);
  await pop.getByRole('button', { name: 'No' }).click();
  assert.equal(await pop.count(), 0);
  assert.equal(await h.mode(page), 'browse');
  assert.equal(await counts(), '2.0.2.0');

  h.step('A2: another plain click moves it (the first ignored); a link click closes it (ignored) and goes');
  await h.k(page, 'picks-intro').click();
  await h.clickSection(page, 'home-picks', 10, 10);
  assert.equal(await pop.count(), 1, 'one popover, at the new spot');
  assert.equal(await counts(), '4.0.2.1');
  await h.followMenu(page, 'events');
  assert.equal(await pop.count(), 0);
  assert.equal(await h.currentPage(page), 'events');
  assert.equal(await counts(), '4.0.2.2');

  h.step('A2: scrolling the site closes it (ignored); so does a click outside the site');
  await h.k(page, 'events-intro').click();
  assert.equal(await pop.count(), 1);
  const vb = await page.locator('.vm-viewport').boundingBox();
  await page.mouse.move(vb.x + 20, vb.y + 20);
  await page.mouse.wheel(0, 300);
  await page.waitForFunction(() => !document.querySelector('.vm-ask'));
  assert.equal(await counts(), '5.0.2.3');
  await h.k(page, 'events-note').click();
  await page.locator('.vm-sidebar').click({ position: { x: 20, y: 200 } });
  assert.equal(await pop.count(), 0);
  assert.equal(await counts(), '6.0.2.4');
  assert.match((await h.logTexts(page)).join('\n'), /Popover ignored: scrolled the site/);

  h.step('A2: a double-click opens one popover, not two');
  await h.k(page, 'events-note').dblclick();
  assert.equal(await pop.count(), 1);
  assert.equal(await counts(), '7.0.2.4');
  await page.keyboard.press('Escape');

  h.step('A2: keyboard in the popover: Tab moves between the two and stays; Enter on Edit lands with the caret at the click');
  await h.followMenu(page, 'home');
  await h.clickTextBefore(page, 'home-heading', 'coffee', 0);
  await page.keyboard.press('Tab');
  assert.equal(await focused(), 'no');
  await page.keyboard.press('Tab');
  assert.equal(await focused(), 'edit', 'focus stays in the popover');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await focused(), 'edit');
  await page.keyboard.press('Enter');
  assert.equal(await pop.count(), 0);
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.editingKey(page), 'home-heading');
  await page.keyboard.type('good ');
  assert.equal(await h.text(page, 'home-heading'), 'Books, good coffee and a quiet corner');
  assert.equal(await counts(), '8.1.3.4');
  assert.equal(await h.count(page, 'route-a2-popover'), '1');
  assert.match(await h.count(page, 'first-entry'), /by Edit, in the popover \(A2\)$/);
  await page.keyboard.press('Enter');
  await h.save(page);
  await h.exit(page);

  h.step('A2: Edit on the picture outlines its section');
  const art = await page.locator('.vm-site .cl-hero-art').boundingBox();
  await page.mouse.click(art.x + 40, art.y + 40);
  await pop.getByRole('button', { name: 'Edit' }).click();
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.selected(page), 'home-hero');
  assert.equal(await h.editingKey(page), null);
  await h.exit(page);

  h.step('A2: at the right and bottom edges it stays inside the site area and flips above');
  const edge = await page.evaluate(() => {
    const vp = window.Vermeer.viewport;
    const r = vp.getBoundingClientRect();
    const pts = { right: [r.left + vp.clientWidth - 3, r.top + 160], bottom: [r.left + 200, r.top + vp.clientHeight - 3] };
    const out = {};
    for (const [k, [x, y]] of Object.entries(pts)) out[k] = { x, y, kind: window.Vermeer.classify(document.elementFromPoint(x, y)).kind };
    return out;
  });
  for (const [where, p] of Object.entries(edge)) {
    assert.equal(p.kind, 'none', where + ' edge point is a plain spot');
    await page.mouse.click(p.x, p.y);
    assert.equal(await pop.count(), 1, where + ' edge');
    const b = await inside(where + ' edge');
    if (where === 'bottom') assert.ok(b.y + b.height < p.y, 'flipped above the point');
    await page.keyboard.press('Escape');
  }

  h.step('A2: the Edit button by keyboard still works');
  await h.tool(page, 'edit').focus();
  await page.keyboard.press('Enter');
  assert.equal(await h.mode(page), 'edit');
  await h.exit(page);

  h.step('A2: a reload with the popover open counts it as ignored');
  await h.k(page, 'picks-intro').click();
  await page.reload();
  assert.equal(await pop.count(), 0);
  assert.equal(await counts(), '12.2.5.5');

  h.step('A2: the code');
  const code = await h.finishCode(page);
  // Non-functional clicks before the first entry: heading ×3, picks intro,
  // picks background, events intro, events note, the double-click (counted
  // once) = 8. Book club button used twice, menu
  // links followed twice.
  h.checkCode(code, { arm: 'VA2', tasks: '10000', f: 'a', n: 8, p: '12.2.5.5', l: '2.2', x: 2, b: 3 });
}
