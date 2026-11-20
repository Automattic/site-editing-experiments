/*
 * Utrillo · E · As Create not Learn: the arm's own flows, run by smoke.mjs.
 *
 * Both of its parts. Clicks at Create not Learn's levels: Classes goes
 * section → row of cards (its Columns) → the block, About (whose columns
 * aren't alike) section → the block; Escape steps back as Create not
 * Learn's does; a double click goes straight to the text with a collapsed
 * caret and counts as one press. The parent selector: Create not Learn's
 * icon, "···" from two levels deep only, its list above the toolbar (rows,
 * rules, icon, hover, pick, Escape, a click outside, the keyboard and Tab).
 * Then tasks 2 to 5 by E's routes (a click in the gap between columns, at
 * E's levels, reaches the Column to its right, as in core), the counts and
 * the completion code, and task 1 again by a double click.
 *
 * Separate clicks are made at points more than 5px apart, so none of them is
 * taken for a double click. A press's counts are held for half a second in
 * case it is one, so counts are polled for, not read once.
 */
export default async function ({ page, baseUrl, assert, helpers: h }) {
  const step = (text) => console.log('  · ' + text);
  const hovered = () => page.evaluate(() => { const el = document.querySelector('.ut-page .is-hovered'); return el ? el.dataset.blockId : null; });
  const waitHovered = async (id, message) => {
    try {
      await page.waitForFunction((want) => { const el = document.querySelector('.ut-page .is-hovered'); return (el ? el.dataset.blockId : null) === want; }, id, { timeout: 2000 });
    } catch (err) { assert.equal(await hovered(), id, message); }
  };
  const editing = () => page.evaluate(() => {
    const el = document.activeElement;
    if (!el || !el.classList.contains('ut-rich')) return null;
    const block = el.closest('[data-block-id]');
    return block && block.classList.contains('is-editing') ? block.dataset.blockId : null;
  });
  const logText = () => page.locator('.ut-log').innerText();
  const point = async (id, dx = 30, dy = 10) => {
    await h.block(page, id).scrollIntoViewIfNeeded();
    const box = await h.block(page, id).boundingBox();
    return { x: box.x + dx, y: box.y + dy };
  };
  const clickAt = async (id, dx, dy) => { const p = await point(id, dx, dy); await page.mouse.click(p.x, p.y); };
  // A count in the notes panel, once it reads `want`.
  const waitCount = async (key, want, message) => {
    try {
      await page.waitForFunction(([k, w]) => { const el = document.querySelector('[data-count="' + k + '"]'); return !!el && el.textContent === w; }, [key, want], { timeout: 2000 });
    } catch (err) { assert.equal(await h.count(page, key), want, message || key); }
  };

  const box = page.locator('.ut-toolbar .ut-tb-parent');
  const more = box.locator('.cnl-lineage-btn');
  const parentBtn = box.locator('[data-action="select-parent"]');
  const menu = page.locator('.cnl-lineage');
  const menuOpen = () => menu.evaluate((el) => !el.hidden);
  const waitMenu = async (open) => {
    await page.waitForFunction((want) => { const el = document.querySelector('.cnl-lineage'); return !!el && el.hidden === !want; }, open, { timeout: 2000 });
  };

  await page.goto(baseUrl + '/create-not-learn.html?notes');

  step('task 1: the first click on the Monday paragraph selects the Classes section');
  await h.clickTextBefore(page, 'monday-text', 'gentle', 2);
  assert.equal(await h.selectedId(page), 'classes');
  assert.equal(await editing(), null, 'no caret yet');
  await waitCount('route-click', '1');

  step('with the section selected, pointing at a class outlines the row of cards, the Columns');
  const wed = await point('wednesday-heading');
  await page.mouse.move(wed.x, wed.y);
  await waitHovered('classes-columns', 'the row is the next stop');

  step('the second click selects the row (Columns), the third puts the caret in the text');
  await h.clickTextBefore(page, 'monday-text', 'moving', 2);
  assert.equal(await h.selectedId(page), 'classes-columns');
  assert.equal(await editing(), null, 'no caret yet');
  await waitHovered('monday-text', 'the hover now shows the paragraph, the next stop');
  await h.clickTextBefore(page, 'monday-text', 'beginers', 5);
  assert.equal(await h.selectedId(page), 'monday-text');
  assert.equal(await editing(), 'monday-text');
  await page.keyboard.type('n');
  assert.match(await h.text(page, 'monday-text'), /A gentle class for beginners, moving/);
  assert.equal(await h.taskDone(page, 1), true, 'task 1 ticked');
  await waitCount('clicks-before-caret', '2', 'the section and row clicks came before the caret');
  await waitCount('route-click', '2');

  step('with the row open, a click on another card goes straight to its block');
  await clickAt('wednesday-text', 40, 10);
  assert.equal(await h.selectedId(page), 'wednesday-text');
  assert.equal(await editing(), 'wednesday-text');

  step('Escape: from the text in one step to the row it’s in, then the section, then nothing');
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), 'classes-columns');
  assert.equal(await editing(), null, 'out of the text too');
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), 'classes');
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), null);
  await waitCount('arm-escapeOut', '3');
  await waitCount('route-click', '2', 'Escape selections aren’t counted');

  step('About (a picture beside text, not a row): section, then straight to the text; one Escape back to the section');
  await clickAt('about-text', 20, 10);
  assert.equal(await h.selectedId(page), 'about');
  await clickAt('about-text', 120, 10);
  assert.equal(await h.selectedId(page), 'about-text');
  assert.equal(await editing(), 'about-text');
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), 'about');
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), null);
  await waitCount('route-click', '3');

  step('a double click goes straight to the text with a collapsed caret, and counts as one press');
  const mon = await point('monday-text', 60, 10);
  await page.mouse.dblclick(mon.x, mon.y);
  assert.equal(await h.selectedId(page), 'monday-text');
  assert.equal(await editing(), 'monday-text');
  assert.equal(await page.evaluate(() => window.getSelection().isCollapsed), true, 'a caret, not a selected word');
  await page.waitForFunction(() => /first of a double click: not counted/.test(document.querySelector('.ut-log').innerText));
  assert.match(await logText(), /Double click: straight to Paragraph/);
  assert.equal(await h.count(page, 'route-click'), '3', 'its first press (the section) isn’t counted');

  step('the parent selector for the Monday paragraph (3 blocks around it): “···”, then Create not Learn’s icon');
  assert.equal(await more.count(), 1, '“···” from two levels deep');
  assert.equal(await more.getAttribute('aria-label'), 'Select a block further up');
  assert.equal(await more.getAttribute('data-tooltip'), 'Select a block further up');
  assert.equal(await more.getAttribute('data-action'), null, 'the variant’s button has no data-action');
  assert.equal(await parentBtn.getAttribute('aria-label'), 'Select parent block: Column');
  assert.equal(await parentBtn.locator('svg rect[x="4.75"][y="8.75"]').count(), 1, 'Create not Learn’s select-parent icon');
  assert.equal(await box.evaluate((el) => Array.from(el.querySelectorAll('button')).map((b) => b.className.includes('cnl-lineage-btn') ? 'more' : b.dataset.action).join(',')), 'more,select-parent');
  // The box grows to the left: the toolbar itself is where it is in the control, 56px in from the block.
  const mainLeft = await page.locator('.ut-toolbar .ut-tb-main').evaluate((el) => el.getBoundingClientRect().left);
  const blockLeft = await h.block(page, 'monday-text').evaluate((el) => el.getBoundingClientRect().left);
  assert.ok(Math.abs(mainLeft - blockLeft - 56) <= 1, 'toolbar 56px in from the block: ' + (mainLeft - blockLeft));

  step('“···” opens a list above the toolbar: Group, Columns, Column, with rules of 0, 16 and 32px');
  await more.click();
  await waitMenu(true);
  assert.equal(await more.getAttribute('aria-expanded'), 'true');
  const toolbarTop = await page.locator('.ut-toolbar').evaluate((el) => el.getBoundingClientRect().top);
  const menuBox = await menu.boundingBox();
  assert.ok(menuBox.y + menuBox.height <= toolbarTop, 'the list is above the toolbar: ' + JSON.stringify({ menuBox, toolbarTop }));
  assert.equal(await menu.getAttribute('data-side'), 'top');
  assert.ok(menuBox.width >= 260, 'at least 260px wide');
  const rows = await menu.locator('[data-lineage-id]').evaluateAll((els) => els.map((el) => {
    const rule = el.querySelector('.cnl-lineage__rule');
    return { id: el.dataset.lineageId, text: el.innerText.trim(), rule: rule ? Math.round(rule.getBoundingClientRect().width) : 0, icon: !!el.querySelector('.cnl-lineage__icon svg') };
  }));
  assert.deepEqual(rows, [
    { id: 'classes', text: 'Group', rule: 0, icon: true },
    { id: 'classes-columns', text: 'Columns', rule: 16, icon: false },
    { id: 'monday', text: 'Column', rule: 32, icon: false }
  ]);
  assert.equal(await h.count(page, 'arm-lineageOpened'), '1');
  assert.match(await logText(), /Opened the “···” list on Paragraph .*: Group, Columns, Column/);

  step('pointing at a row lights its block up');
  await menu.locator('[data-lineage-id="classes-columns"]').hover();
  await waitHovered('classes-columns', 'the Columns is highlighted');

  step('Escape closes the list, and the selection stays');
  await page.keyboard.press('Escape');
  await waitMenu(false);
  assert.equal(await h.selectedId(page), 'monday-text');
  assert.equal(await h.count(page, 'arm-escapeOut'), '5', 'closing the list isn’t a step out');
  assert.equal(await more.getAttribute('aria-expanded'), 'false');

  step('a click outside closes it too');
  await more.click();
  await waitMenu(true);
  await page.locator('.ut-inspector .ut-sidebar-head').click();
  await waitMenu(false);
  assert.equal(await h.selectedId(page), 'monday-text');

  step('picking Group selects the Classes Group, route lineage');
  await more.click();
  await waitMenu(true);
  await menu.locator('[data-lineage-id="classes"]').click();
  await waitMenu(false);
  assert.equal(await h.selectedId(page), 'classes');
  await waitCount('route-lineage', '1');
  assert.equal(await h.count(page, 'arm-lineageOpened'), '3');
  assert.equal(await h.count(page, 'arm-lineagePicked'), '1');
  assert.match(await logText(), /Picked Group .*in the “···” list on Paragraph/);

  step('the Opening hours paragraph (one block around it): no “···”, just the select-parent button');
  await clickAt('hours-text', 20, 10);
  assert.equal(await h.selectedId(page), 'hours');
  await waitCount('route-click', '4');
  await clickAt('hours-text', 120, 10);
  assert.equal(await h.selectedId(page), 'hours-text');
  assert.equal(await more.count(), 0, 'no “···” with one block around it');
  assert.equal(await parentBtn.getAttribute('aria-label'), 'Select parent block: Group');
  assert.equal(await parentBtn.locator('svg rect[x="4.75"]').count(), 1);
  assert.equal(Math.round((await box.boundingBox()).width), 48, 'the box is the usual 48px with one button');
  await parentBtn.click();
  assert.equal(await h.selectedId(page), 'hours', 'the select-parent button selects the parent');
  assert.equal(await h.count(page, 'route-toolbar'), '1');

  step('task 2: a click on the Classes heading selects the section, one on a class the row (Columns); Block spacing');
  await clickAt('classes-heading', 20, 12);
  assert.equal(await h.selectedId(page), 'classes');
  await clickAt('monday-heading', 20, 12);
  assert.equal(await h.selectedId(page), 'classes-columns');
  await h.stepSpacing(page, 2);
  assert.equal(await h.taskDone(page, 2), true, 'task 2 ticked');

  step('task 3: About’s section, its paragraph, then “···” → Columns; Change vertical alignment → Align middle');
  await clickAt('about-text', 20, 10);
  assert.equal(await h.selectedId(page), 'about');
  await clickAt('about-text', 120, 10);
  assert.equal(await h.selectedId(page), 'about-text');
  await more.click();
  await waitMenu(true);
  await menu.locator('[data-lineage-id="about-columns"]').click();
  await waitMenu(false);
  assert.equal(await h.selectedId(page), 'about-columns');
  await h.pickDropdown(page, 'Change vertical alignment', 'Align middle');
  assert.equal(await h.taskDone(page, 3), true, 'task 3 ticked');

  step('task 4: section, row, then a click in the gap left of Wednesday selects its Column (E’s click route); a swatch');
  await clickAt('wednesday-heading', 20, 12);
  assert.equal(await h.selectedId(page), 'classes');
  await clickAt('wednesday-heading', 80, 12);
  assert.equal(await h.selectedId(page), 'classes-columns');
  await h.clickGapLeftOf(page, 'wednesday');
  assert.equal(await h.selectedId(page), 'wednesday', 'the gap goes to the Column on its right');
  assert.equal(await h.count(page, 'route-padding'), '0', 'by E’s clicks, not the padding route');
  await h.swatch(page, 'sky');
  assert.equal(await h.taskDone(page, 4), true, 'task 4 ticked');
  // Back out to nothing, so the next click starts at the section.
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), 'classes-columns');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), null);

  step('task 5: click the Saturday heading three times (section, row, heading)');
  await clickAt('saturday-heading', 20, 12);
  assert.equal(await h.selectedId(page), 'classes');
  await clickAt('saturday-heading', 80, 12);
  assert.equal(await h.selectedId(page), 'classes-columns');
  await clickAt('saturday-heading', 140, 12);
  assert.equal(await h.selectedId(page), 'saturday-heading');

  step('the “···” list from the keyboard: rows out of the Tab order, arrows move, Tab closes it');
  await page.keyboard.press('Escape'); // out of the text: to the row
  assert.equal(await h.selectedId(page), 'classes-columns');
  await clickAt('saturday-heading', 100, 12);
  assert.equal(await h.selectedId(page), 'saturday-heading');
  await more.focus();
  await page.keyboard.press('Enter');
  await waitMenu(true);
  const focusedRow = () => page.evaluate(() => (document.activeElement && document.activeElement.dataset.lineageId) || null);
  assert.equal(await focusedRow(), 'classes', 'opened from the keyboard, the first row has focus');
  assert.deepEqual(await menu.locator('[data-lineage-id]').evaluateAll((els) => els.map((el) => el.tabIndex)), [-1, -1, -1]);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  assert.equal(await focusedRow(), 'saturday');
  await page.keyboard.press('Tab');
  await waitMenu(false);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'select-parent', 'Tab goes on from the “···” button');
  assert.equal(await h.selectedId(page), 'saturday-heading');

  step('task 5: “···” → Column selects the Saturday Column; ⋮ → Delete');
  await more.click();
  await waitMenu(true);
  assert.equal(await more.evaluate((el) => getComputedStyle(el).backgroundColor), 'rgb(237, 237, 237)', 'pressed in grey while open');
  await menu.locator('[data-lineage-id="saturday"]').click();
  assert.equal(await h.selectedId(page), 'saturday');
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await page.locator('.ut-menu').getByRole('menuitem', { name: 'Delete' }).click();
  assert.equal(await h.block(page, 'saturday').count(), 0);
  assert.equal(await h.taskDone(page, 5), true, 'task 5 ticked');

  // classes, row (task 1) + about + hours + classes, row (task 2) + about
  // (task 3) + classes, row, Wednesday (task 4) + classes, row (task 5)
  await waitCount('route-click', '12');
  await waitCount('route-lineage', '3');
  await waitCount('arm-lineageOpened', '6');
  await waitCount('arm-lineagePicked', '3');
  assert.equal(await h.count(page, 'route-padding'), '0', 'no padding route in this arm');
  assert.equal(await h.count(page, 'wrong'), '0');
  assert.equal(await page.locator('.ut-notes dt', { hasText: 'lineage' }).innerText(), 'lineage · the “···” list of blocks further up');

  const code = await h.finishCode(page);
  // The last route number is click + lineage: 12 + 3.
  h.checkCode(code, { arm: 'UE', tasks: '11111', routes: '1.0.0.0.0.15', x: 0, u: 0, k: 2 });

  step('task 1 again, by a double click on “beginers” and typing: the word isn’t replaced, k0');
  await h.reset(page);
  await h.block(page, 'monday-text').scrollIntoViewIfNeeded();
  const word = await h.block(page, 'monday-text').locator('.ut-rich').evaluate((el) => {
    const node = el.firstChild;
    const at = node.textContent.indexOf('beginers') + 5;
    const range = document.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + 1);
    const r = range.getBoundingClientRect();
    return { x: r.left + 1, y: r.top + r.height / 2 };
  });
  await page.mouse.dblclick(word.x, word.y);
  assert.equal(await editing(), 'monday-text');
  assert.equal(await page.evaluate(() => window.getSelection().isCollapsed), true, 'a caret, not a selected word');
  await page.keyboard.type('n');
  assert.match(await h.text(page, 'monday-text'), /A gentle class for beginners, moving/);
  assert.equal(await h.taskDone(page, 1), true, 'task 1 ticked');
  await page.waitForFunction(() => /first of a double click: not counted/.test(document.querySelector('.ut-log').innerText));
  assert.equal(await h.count(page, 'clicks-before-caret'), '0');
  assert.equal(await h.count(page, 'route-click'), '0', 'the double click’s first press isn’t a click');
  h.checkCode(await h.finishCode(page), { arm: 'UE', tasks: '10000', routes: '0.0.0.0.0.0', k: 0 });
}
