/*
 * Utrillo · A · Hover tab: the arm's own flows, run by smoke.mjs.
 *
 * Hovering a paragraph shows the Group, Columns and Column tabs; clicking a
 * tab selects that container (route `tab`) without the canvas selecting what
 * lies under the tab; the tabs hide while typing, while dragging to select
 * text and when the pointer leaves the canvas. Then tasks 1–4, with tasks
 * 2–4 done by tabs, and the completion code.
 */
export default async function ({ page, baseUrl, assert, helpers: h }) {
  const step = (text) => console.log('  · ' + text);
  const tab = (id) => page.locator('.ut-overlay .uta-tab[data-uta-tab="' + id + '"]');
  const shownTabs = () => page.$$eval('.ut-overlay .uta-tab:not([hidden])', (els) => els.map((el) => el.dataset.utaTab));
  // Move the pointer into a block's text, as a person would (in steps).
  async function hoverText(id, steps = 5) {
    await h.block(page, id).scrollIntoViewIfNeeded();
    const box = await h.block(page, id).locator('.ut-rich').boundingBox();
    await page.mouse.move(box.x + 20, box.y + 8, { steps });
  }
  // Move to a tab's middle in steps (so the path crosses the page) and click it.
  async function clickTab(id) {
    const box = await tab(id).boundingBox();
    assert.ok(box, 'the ' + id + ' tab is showing');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  await page.goto(baseUrl + '/hover-tab.html?notes');

  step('task 1: the ordinary text edit still works (click before the second “e”, type n)');
  await h.clickTextBefore(page, 'monday-text', 'beginers', 5);
  assert.equal(await h.selectedId(page), 'monday-text');
  assert.equal((await page.locator('.ut-toolbar .ut-tb-name').textContent()).trim(), 'Paragraph', 'text blocks are named too');
  await page.keyboard.type('n');
  assert.match(await h.text(page, 'monday-text'), /beginners/);
  assert.equal(await h.taskDone(page, 1), true, 'task 1 ticked');
  assert.deepEqual(await shownTabs(), [], 'typing hides the tabs');

  step('moving the pointer brings them back, for the selected paragraph’s containers');
  await hoverText('monday-text');
  assert.deepEqual(await shownTabs(), ['classes', 'classes-columns', 'monday']);
  assert.equal((await tab('classes').innerText()).trim(), 'Group');
  assert.equal((await tab('classes-columns').innerText()).trim(), 'Columns');
  assert.equal((await tab('monday').innerText()).trim(), 'Column');
  assert.equal(await page.locator('.ut-overlay .uta-outline').count(), 3, 'an outline for each container');

  step('tabs sit above their container’s top-left; Columns and Column side by side, outermost first');
  const [gBox, csBox, cBox] = await Promise.all(['classes', 'classes-columns', 'monday'].map((id) => tab(id).boundingBox()));
  const [gBlock, csBlock] = await Promise.all(['classes', 'classes-columns'].map((id) => h.block(page, id).boundingBox()));
  assert.ok(Math.abs(gBox.y + gBox.height - gBlock.y) <= 1 && Math.abs(gBox.x - gBlock.x) <= 1, 'Group tab just above its top-left');
  assert.ok(Math.abs(csBox.y + csBox.height - csBlock.y) <= 1 && Math.abs(csBox.x - csBlock.x) <= 1, 'Columns tab just above its top-left');
  assert.ok(cBox.x >= csBox.x + csBox.width && Math.abs(cBox.y - csBox.y) <= 1, 'Column tab beside the Columns tab, on the same line');

  step('a drag to select text hides the tabs and still selects text');
  const t = await h.block(page, 'monday-text').locator('.ut-rich').boundingBox();
  await page.mouse.move(t.x + 4, t.y + 8);
  await page.mouse.down();
  await page.mouse.move(t.x + 60, t.y + 10, { steps: 4 });
  assert.deepEqual(await shownTabs(), [], 'no tabs while dragging');
  await page.mouse.move(t.x + 160, t.y + 12, { steps: 4 });
  await page.mouse.up();
  assert.ok((await page.evaluate(() => String(window.getSelection()))).length > 5, 'text got selected');
  assert.ok((await shownTabs()).length > 0, 'tabs back after the drag');

  step('the pointer leaving the canvas hides them');
  await page.mouse.move(5, 5, { steps: 3 });
  assert.deepEqual(await shownTabs(), []);
  assert.equal(await page.locator('.ut-overlay .uta-outline').count(), 0);

  step('hovering a tab highlights its container; clicking the Group tab selects the Classes Group');
  await hoverText('monday-text');
  const box = await tab('classes').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
  assert.equal(await h.block(page, 'classes').evaluate((el) => el.classList.contains('is-hovered')), true, 'Group highlighted');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  assert.equal(await h.selectedId(page), 'classes');
  assert.equal(await h.count(page, 'route-tab'), '1');
  assert.equal((await page.locator('.ut-toolbar .ut-tb-name').textContent()).trim(), 'Group', 'the toolbar names the block, as the tab did');
  assert.equal(await h.count(page, 'route-padding'), '0', 'the canvas didn’t also select what was under the tab');
  assert.ok(Number(await h.count(page, 'arm-tabShown')) >= 3, 'tabShown counted');
  assert.match(await page.locator('.ut-log').innerText(), /Clicked the Group tab/);
  assert.match(await page.locator('.ut-log').innerText(), /Tab shown for the first time: Column \(monday\)/);

  step('a tab clicked on top of other content (Columns tab over the Classes heading) selects only the Columns');
  await hoverText('wednesday-text');
  await clickTab('classes-columns');
  assert.equal(await h.selectedId(page), 'classes-columns');
  assert.equal(await h.count(page, 'route-tab'), '2');
  assert.equal((await page.locator('.ut-toolbar .ut-tb-name').textContent()).trim(), 'Columns', 'the toolbar names the Columns');

  step('task 2: the Group tab, then Move up');
  await hoverText('wednesday-text');
  await clickTab('classes');
  assert.equal(await h.selectedId(page), 'classes');
  await page.locator('.ut-toolbar [data-action="move-up"]').click();
  assert.equal((await h.topLevelIds(page)).join(','), 'hero,classes,about,hours,contact');
  assert.equal(await h.taskDone(page, 2), true, 'task 2 ticked');

  step('tabs follow the page through a scroll and Document Overview opening');
  await hoverText('hours-text');
  await page.locator('.ut-canvas').evaluate((el) => { el.scrollTop += 40; });
  // Wait (polling) until the tab sits just above its block's top-left.
  const followsBlock = (id) => page.waitForFunction((id) => {
    const t = document.querySelector('.ut-overlay .uta-tab[data-uta-tab="' + id + '"]');
    const b = document.querySelector('.ut-page [data-block-id="' + id + '"]');
    if (!t || !b || t.hidden) return false;
    const tr = t.getBoundingClientRect(), br = b.getBoundingClientRect();
    return Math.abs(tr.left - br.left) <= 1 && Math.abs(tr.bottom - br.top) <= 1;
  }, id, { timeout: 3000 }).then(() => true, () => false);
  assert.ok(await followsBlock('hours'), 'hours tab still on its Group after a scroll');
  await page.locator('.ut-topbar [data-action="overview"]').click();
  await hoverText('hours-text');
  assert.ok(await followsBlock('hours'), 'hours tab still on its Group with Document Overview open');
  await page.locator('.ut-topbar [data-action="overview"]').click();

  step('task 3: hover the Opening hours paragraph, its Group tab, then a swatch');
  await hoverText('hours-text');
  assert.deepEqual(await shownTabs(), ['hours']);
  await clickTab('hours');
  assert.equal(await h.selectedId(page), 'hours');
  await page.locator('.ut-inspector [data-color="sky"]').click();
  assert.equal(await h.taskDone(page, 3), true, 'task 3 ticked');

  step('task 4: the Saturday Column’s tab, then ⋮ → Delete');
  await hoverText('saturday-text');
  assert.deepEqual(await shownTabs(), ['classes', 'classes-columns', 'saturday']);
  await clickTab('saturday');
  assert.equal(await h.selectedId(page), 'saturday');
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await page.locator('.ut-menu').getByRole('menuitem', { name: 'Delete' }).click();
  assert.equal(await h.block(page, 'saturday').count(), 0);
  assert.equal(await h.taskDone(page, 4), true, 'task 4 ticked');
  assert.equal(await h.count(page, 'route-tab'), '5');
  assert.equal(await h.count(page, 'wrong'), '0');

  const code = await h.finishCode(page);
  h.checkCode(code, { arm: 'UA', tasks: '1111', routes: '0.0.0.0.0.5', x: 0, u: 0, k: 0 });

  step('Reset clears the arm’s counts');
  await h.reset(page);
  assert.equal(await h.count(page, 'route-tab'), '0');
  await page.mouse.move(5, 5);
  await hoverText('hours-text');
  assert.match(await page.locator('.ut-log').innerText(), /Tab shown for the first time: Group \(hours\)/, 'first-shown logged again after Reset');
}
