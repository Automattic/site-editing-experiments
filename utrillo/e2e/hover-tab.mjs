/*
 * Utrillo · A · Hover tab: the arm's own flows, run by smoke.mjs.
 *
 * Hovering a paragraph shows the Group, Columns and Column tabs; clicking a
 * tab selects that container (route `tab`) without the canvas selecting what
 * lies under the tab; the tabs hide while typing, while dragging to select
 * text and when the pointer leaves the canvas. Then tasks 1–5, with tasks
 * 2–5 done by tabs, and the completion code. A click in the gap between two
 * columns selects the Column to its right, as in the control.
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

  step('the block name and the block controls together: Columns, movers | Change vertical alignment | ⋮');
  const groups = await page.locator('.ut-toolbar .ut-tb-main > .ut-tb-group').evaluateAll((els) => els.map((g) => g.innerText.trim() || Array.from(g.querySelectorAll('button')).map((b) => b.getAttribute('aria-label')).join('|')));
  assert.deepEqual(groups, ['Columns', 'Change vertical alignment', 'Options']);

  step('task 2: (from nothing selected) the Columns tab, then Block spacing two steps right');
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), null);
  await hoverText('monday-text');
  await clickTab('classes-columns');
  assert.equal(await h.selectedId(page), 'classes-columns');
  await h.stepSpacing(page, 2);
  assert.ok(await h.gapOf(page, 'classes-columns') > 50);
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

  step('task 3: hover the About paragraph, its Columns tab, then Change vertical alignment → Align middle');
  await hoverText('about-text');
  assert.deepEqual(await shownTabs(), ['about', 'about-columns', 'about-col-text']);
  await clickTab('about-columns');
  assert.equal(await h.selectedId(page), 'about-columns');
  await h.pickDropdown(page, 'Change vertical alignment', 'Align middle');
  assert.equal(await h.taskDone(page, 3), true, 'task 3 ticked');

  step('a click in the gap left of the Saturday class selects its Column, by the padding route');
  await h.clickGapLeftOf(page, 'saturday');
  assert.equal(await h.selectedId(page), 'saturday');
  assert.equal(await h.count(page, 'route-padding'), '1');
  await page.keyboard.press('Escape');

  step('resting in the gap: no Columns tab (core outlines nothing there), the Group’s stays; the insertion line shows');
  await h.hoverGapLeftOf(page, 'wednesday');
  assert.deepEqual(await shownTabs(), ['classes']);
  assert.equal(await page.locator('.ut-overlay .uta-outline').count(), 1, 'only the Group is outlined');
  await page.mouse.move(5, 5);

  step('task 4 at 1440×900: the Wednesday Column’s tab, then a swatch');
  await page.setViewportSize({ width: 1440, height: 900 });
  await hoverText('wednesday-text');
  await clickTab('wednesday');
  assert.equal(await h.selectedId(page), 'wednesday');
  await h.swatch(page, 'sky');
  assert.equal(await h.taskDone(page, 4), true, 'task 4 ticked');

  step('task 5, with Wednesday still selected: the Saturday tab moves out from under Wednesday’s toolbar, and is clickable');
  assert.equal(await h.selectedId(page), 'wednesday');
  await hoverText('saturday-text');
  assert.deepEqual(await shownTabs(), ['classes', 'classes-columns', 'saturday']);
  const wtb = await page.locator('.ut-toolbar').boundingBox();
  const st = await tab('saturday').boundingBox();
  const satBox = await h.block(page, 'saturday').boundingBox();
  assert.ok(st.x >= wtb.x + wtb.width || st.y >= wtb.y + wtb.height || st.y + st.height <= wtb.y, 'not under the toolbar: ' + JSON.stringify({ st, wtb }));
  assert.ok(st.x >= satBox.x - 1 && st.x < satBox.x + satBox.width, 'still at the Saturday Column');
  await clickTab('saturday');
  assert.equal(await h.selectedId(page), 'saturday');
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await page.locator('.ut-menu').getByRole('menuitem', { name: 'Delete' }).click();
  assert.equal(await h.block(page, 'saturday').count(), 0);
  assert.equal(await h.taskDone(page, 5), true, 'task 5 ticked');
  // Group and Columns (above), then Columns, About Columns, Wednesday, Saturday.
  assert.equal(await h.count(page, 'route-tab'), '6');
  assert.equal(await h.count(page, 'wrong'), '0');

  const code = await h.finishCode(page);
  h.checkCode(code, { arm: 'UA', tasks: '11111', routes: '0.0.0.0.1.6', x: 0, u: 0, k: 0 });
  await page.setViewportSize({ width: 1600, height: 1000 });

  step('Reset clears the arm’s counts');
  await h.reset(page);
  assert.equal(await h.count(page, 'route-tab'), '0');
  await page.mouse.move(5, 5);
  await hoverText('hours-text');
  assert.match(await page.locator('.ut-log').innerText(), /Tab shown for the first time: Group \(hours\)/, 'first-shown logged again after Reset');

  step('The block name in the toolbar lists the section’s blocks');
  await h.clickTextBefore(page, 'monday-text', 'gentle');
  assert.equal(await h.selectedId(page), 'monday-text');
  const nameBtn = page.locator('.ut-toolbar .ut-tb-name-btn');
  assert.equal(await nameBtn.getAttribute('aria-expanded'), 'false');
  await nameBtn.click();
  const tree = page.locator('.uta-tree');
  await tree.waitFor({ state: 'visible' });
  assert.equal(await nameBtn.getAttribute('aria-expanded'), 'true');
  const ids = await tree.locator('[data-tree-id]').evaluateAll((els) => els.map((e) => e.dataset.treeId));
  assert.equal(ids[0], 'classes', 'the list starts with the section');
  assert.ok(ids.includes('monday-text') && ids.includes('saturday'), 'and has everything in it');
  assert.equal(await tree.locator('.is-selected [data-tree-id]').getAttribute('data-tree-id'), 'monday-text', 'the selected block is marked');
  const nb = await nameBtn.boundingBox(); const tb = await tree.boundingBox();
  assert.ok(tb.y >= nb.y + nb.height && Math.abs(tb.x - nb.x) <= 2, 'the list opens under the name');
  await page.keyboard.press('Escape');
  await tree.waitFor({ state: 'hidden' });
  assert.equal(await h.selectedId(page), 'monday-text', 'Escape only closes the list');
  await nameBtn.click();
  await tree.locator('[data-tree-id="classes"]').click();
  await tree.waitFor({ state: 'hidden' });
  assert.equal(await h.selectedId(page), 'classes');
  assert.equal(await h.count(page, 'route-tree'), '1');
  assert.equal(await h.count(page, 'arm-treeOpened'), '2');
  assert.equal(await h.count(page, 'arm-treePicked'), '1');
  assert.equal((await page.locator('.ut-toolbar .ut-tb-name').textContent()).trim(), 'Group');
  await page.locator('.ut-toolbar .ut-tb-name-btn').click();
  await tree.waitFor({ state: 'visible' });
  await page.mouse.click(5, 5);
  await tree.waitFor({ state: 'hidden' });
  const code2 = await h.finishCode(page);
  h.checkCode(code2, { arm: 'UA', routes: '0.0.0.0.0.1' });
}
