/*
 * Utrillo · D · Layers: the arm's own checks, run by smoke.mjs.
 *
 * The Layers button shows on hover and while something in its section is
 * selected, stays clear of the block toolbar, and opens the section's tree.
 * Rows highlight on hover and select on click (route `layers` for
 * containers, no caret for text). Tasks 2, 3 and 4 are done through it;
 * Escape and an outside click close it; the arm's counters show in the notes.
 */
export default async function ({ page, baseUrl, assert, helpers: h }) {
  const step = (text) => console.log('  · ' + text);
  const button = (id) => page.locator('.ut-overlay .utl-button[data-layers-for="' + id + '"]');
  const pop = page.locator('.utl-popover');
  const row = (id) => pop.locator('[data-layers-id="' + id + '"]');
  const popOpen = () => pop.evaluate((el) => !el.hidden);
  const rowIds = () => pop.locator('[data-layers-id]').evaluateAll((els) => els.map((el) => el.dataset.layersId));

  // Point at a section (near its top, away from any text), as a person would.
  async function hoverSection(id) {
    await h.block(page, id).scrollIntoViewIfNeeded();
    const box = await h.block(page, id).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 12);
  }
  async function openLayers(id) {
    await hoverSection(id);
    await button(id).click();
    assert.equal(await popOpen(), true, 'Layers popover opens for ' + id);
  }

  await page.goto(baseUrl + '/layers.html?notes');

  step('no buttons at first; hovering Classes shows its button, at its top-right corner, inside');
  assert.equal(await page.locator('.utl-button').count(), 0);
  await hoverSection('classes');
  await button('classes').waitFor();
  assert.equal(await page.locator('.utl-button').count(), 1, 'only the hovered section has a button');
  const sec = await h.block(page, 'classes').boundingBox();
  const btn = await button('classes').boundingBox();
  assert.ok(Math.abs(sec.x + sec.width - 8 - (btn.x + btn.width)) <= 1, 'button 8px in from the right edge');
  assert.ok(Math.abs(sec.y + 8 - btn.y) <= 1, 'button 8px in from the top edge');
  assert.match(await button('classes').innerText(), /Layers/);

  // The button's box sits inside the visible canvas (checked before any
  // click, as Playwright's click would scroll it into view).
  const canvasBox = () => page.locator('.ut-canvas').boundingBox();
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  async function assertInView(id, why) {
    // Wait for the button to settle inside the canvas (it's placed after the
    // scroll, on the next frame), then check it, so a failure still says why.
    await page.waitForFunction((id) => {
      const c = document.querySelector('.ut-canvas').getBoundingClientRect();
      const el = document.querySelector('.ut-overlay .utl-button[data-layers-for="' + id + '"]') || null;
      if (!el) return false;
      const b = el.getBoundingClientRect();
      return b.top >= c.top && b.bottom <= c.bottom && b.left >= c.left && b.right <= c.right;
    }, id, { timeout: 2000 }).catch(() => {});
    const c = await canvasBox();
    const b = await button(id).boundingBox();
    assert.ok(b, 'button for ' + id + ' shown (' + why + ')');
    assert.ok(b.y >= c.y && b.y + b.height <= c.y + c.height && b.x >= c.x && b.x + b.width <= c.x + c.width,
      'button for ' + id + ' inside the visible canvas (' + why + '): ' + JSON.stringify({ b, c }));
    return b;
  }
  // Scroll the canvas so a block's top sits a little below the canvas top.
  async function scrollToBlock(id, offset) {
    await page.evaluate(([id, offset]) => {
      const canvas = document.querySelector('.ut-canvas');
      const el = document.querySelector('.ut-page [data-block-id="' + id + '"]');
      canvas.scrollTop += el.getBoundingClientRect().top - canvas.getBoundingClientRect().top - offset;
    }, [id, offset]);
  }

  step('1024×768, scrolled to the Monday paragraph: the Classes button stays pinned in view');
  await page.setViewportSize({ width: 1024, height: 768 });
  await scrollToBlock('monday-text', 60);
  const secTop = (await h.block(page, 'classes').boundingBox()).y;
  assert.ok(secTop < (await canvasBox()).y, 'the section’s top has scrolled out of view');
  const monday = await h.block(page, 'monday-text').boundingBox();
  await page.mouse.move(monday.x + 20, monday.y + monday.height / 2);
  await button('classes').waitFor();
  const pinned = await assertInView('classes', 'hovering Monday, scrolled');
  assert.ok(Math.abs(pinned.y - ((await canvasBox()).y + 8)) <= 1, 'pinned 8px below the canvas top');

  step('1440×900, scrolled, Saturday Column selected: the button stays in view and clear of the toolbar');
  await page.setViewportSize({ width: 1440, height: 900 });
  await scrollToBlock('saturday', 30);
  await h.block(page, 'saturday-text').locator('.ut-rich').click();
  await h.selectParent(page);
  assert.equal(await h.selectedId(page), 'saturday');
  await scrollToBlock('saturday', 30);
  await page.mouse.move(5, 5);
  const kept = await assertInView('classes', 'Saturday selected, scrolled');
  assert.equal(overlaps(kept, await page.locator('.ut-toolbar').boundingBox()), false, 'button not under the toolbar');
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), null);
  assert.equal(await h.count(page, 'route-toolbar'), '1');

  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.evaluate(() => { document.querySelector('.ut-canvas').scrollTop = 0; });
  await h.reset(page);

  step('moving to Opening hours moves the button there');
  await hoverSection('hours');
  await button('hours').waitFor();
  assert.equal(await button('classes').count(), 0);

  step('with the Wednesday paragraph selected the Classes button stays, clear of the toolbar');
  await h.block(page, 'wednesday-text').locator('.ut-rich').click();
  await hoverSection('hours');
  assert.equal(await button('classes').count(), 1, 'shown while something in the section is selected');
  assert.equal(await button('hours').count(), 1, 'and the hovered section has its own');
  const tb = await page.locator('.ut-toolbar').boundingBox();
  const b2 = await button('classes').boundingBox();
  const overlap = b2.x < tb.x + tb.width && b2.x + b2.width > tb.x && b2.y < tb.y + tb.height && b2.y + b2.height > tb.y;
  assert.equal(overlap, false, 'button not under the toolbar');

  step('clicking the button doesn’t change the selection; the popover lists the Classes tree');
  await button('classes').click();
  assert.equal(await popOpen(), true);
  assert.equal(await h.selectedId(page), 'wednesday-text', 'the press didn’t fall through to the canvas');
  assert.equal(await pop.locator('.utl-popover-head').innerText(), 'Group');
  assert.deepEqual(await rowIds(), [
    'classes', 'classes-heading', 'classes-columns',
    'monday', 'monday-image', 'monday-heading', 'monday-text',
    'wednesday', 'wednesday-image', 'wednesday-heading', 'wednesday-text',
    'saturday', 'saturday-image', 'saturday-heading', 'saturday-text'
  ]);
  assert.equal(await row('wednesday-text').evaluate((el) => el.closest('li').classList.contains('is-selected')), true, 'selected block’s row highlighted');
  assert.equal(await row('classes-columns').innerText(), 'Columns');
  const p = await pop.boundingBox();
  const b3 = await button('classes').boundingBox();
  assert.ok(p.y >= b3.y + b3.height, 'popover below the button');
  assert.ok(Math.abs(p.x + p.width - (b3.x + b3.width)) <= 1, 'popover right-aligned to the button');
  assert.equal(await h.count(page, 'arm-layersOpened'), '1');

  step('hovering a row highlights the block on the canvas');
  await row('classes-columns').hover();
  assert.equal(await h.block(page, 'classes-columns').evaluate((el) => el.classList.contains('is-hovered')), true);

  step('Escape closes the popover and does nothing else');
  await page.keyboard.press('Escape');
  assert.equal(await popOpen(), false);
  assert.equal(await h.selectedId(page), 'wednesday-text', 'Escape kept the selection');
  assert.equal(await h.block(page, 'classes-columns').evaluate((el) => el.classList.contains('is-hovered')), false, 'highlight cleared');

  step('a click outside closes it (and the click does what it would)');
  await openLayers('classes');
  await h.block(page, 'hours-heading').locator('.ut-rich').click();
  assert.equal(await popOpen(), false);
  assert.equal(await h.selectedId(page), 'hours-heading');

  step('picking a text row selects it without a caret');
  await openLayers('classes');
  await row('monday-text').click();
  assert.equal(await popOpen(), false, 'closes after a pick');
  assert.equal(await h.selectedId(page), 'monday-text');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('.ut-rich')), false, 'no caret in the text');
  assert.equal(await h.count(page, 'route-layers'), '0', 'a text block isn’t a container selection');

  step('task 2: Layers → Group row selects the Classes Group (route layers), then Move up');
  await openLayers('classes');
  await row('classes').click();
  assert.equal(await h.selectedId(page), 'classes');
  assert.equal(await h.count(page, 'route-layers'), '1');
  await page.locator('.ut-toolbar [data-action="move-up"]').click();
  assert.equal((await h.topLevelIds(page)).join(','), 'hero,classes,about,hours,contact');
  assert.equal(await h.taskDone(page, 2), true, 'task 2 ticked');

  step('task 3: Opening hours Layers → Group row → a swatch');
  await openLayers('hours');
  assert.deepEqual(await rowIds(), ['hours', 'hours-heading', 'hours-text']);
  await row('hours').click();
  assert.equal(await h.selectedId(page), 'hours');
  await page.locator('.ut-inspector [data-color="sky"]').click();
  assert.equal(await h.taskDone(page, 3), true, 'task 3 ticked');
  assert.equal(await h.count(page, 'route-layers'), '2');

  step('task 4: Classes Layers → Saturday’s Column row → ⋮ Delete');
  await openLayers('classes');
  await row('saturday').click();
  assert.equal(await h.selectedId(page), 'saturday');
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await page.locator('.ut-menu').getByRole('menuitem', { name: 'Delete' }).click();
  assert.equal(await h.block(page, 'saturday').count(), 0);
  assert.equal(await h.taskDone(page, 4), true, 'task 4 ticked');
  assert.equal(await h.count(page, 'route-layers'), '3');
  assert.equal(await h.count(page, 'wrong'), '0');

  step('one popover at a time; the tree follows the page');
  await openLayers('classes');
  assert.equal((await rowIds()).includes('saturday'), false, 'Saturday gone from the tree');
  await hoverSection('hours');
  await button('hours').click();
  assert.equal(await pop.count(), 1);
  assert.deepEqual(await rowIds(), ['hours', 'hours-heading', 'hours-text']);
  await page.keyboard.press('Escape');
  assert.equal(await popOpen(), false);

  step('counters in the notes panel, and the code');
  assert.equal(await h.count(page, 'arm-layersOpened'), '8');
  assert.equal(await h.count(page, 'arm-layersPicked'), '4');
  const notes = await page.locator('.ut-notes').innerText();
  assert.match(notes, /Layers opened/);
  assert.match(notes, /Layers rows picked/);
  assert.match(notes, /Opened Layers on Group \(“Classes this week”\)/);
  assert.match(notes, /Picked Column 3 of 3 \(“Saturday breath”\)/);
  const code = await h.finishCode(page);
  h.checkCode(code, { arm: 'UD', tasks: '0111', routes: '0.0.0.0.0.3', x: 0, u: 0 });

  step('Reset zeroes the counters, popover closed');
  await h.reset(page);
  assert.equal(await h.count(page, 'arm-layersOpened'), '0');
  assert.equal(await popOpen(), false);
}
