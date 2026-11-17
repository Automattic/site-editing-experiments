/*
 * Utrillo · B · Section first: the arm's own flows, run by smoke.mjs.
 *
 * All four tasks with section-first clicks: the typo by section → Column →
 * text, Escape back out a stop at a time, the Cover's stops, a double click
 * straight to text, then the move, the background and the delete, each from
 * one click on the section. Checks the counts and the completion code.
 */
export default async function ({ page, baseUrl, assert, helpers: h }) {
  const step = (text) => console.log('  · ' + text);
  const hovered = () => page.evaluate(() => { const el = document.querySelector('.ut-page .is-hovered'); return el ? el.dataset.blockId : null; });
  const nextIsText = () => page.evaluate(() => document.querySelector('.ut-canvas').classList.contains('sf-next-text'));
  // The hover and the pointer follow the selection; wait for them rather
  // than reading once.
  const waitHovered = async (id, message) => {
    try {
      await page.waitForFunction((want) => { const el = document.querySelector('.ut-page .is-hovered'); return (el ? el.dataset.blockId : null) === want; }, id, { timeout: 2000 });
    } catch (err) { assert.equal(await hovered(), id, message); }
  };
  const waitNextIsText = async (want, message) => {
    try {
      await page.waitForFunction((w) => document.querySelector('.ut-canvas').classList.contains('sf-next-text') === w, want, { timeout: 2000 });
    } catch (err) { assert.equal(await nextIsText(), want, message); }
  };
  // The block whose text has the caret, or null.
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

  // Two presses in the same place within half a second are a double click, as
  // in the operating system; a person's separate clicks are further apart.
  const pause = () => page.waitForTimeout(600);

  await page.goto(baseUrl + '/section-first.html?notes');

  step('task 1: the first click on the Monday paragraph selects the Classes section');
  await h.clickTextBefore(page, 'monday-text', 'beginers', 5);
  assert.equal(await h.selectedId(page), 'classes');
  assert.equal(await editing(), null, 'no caret yet');
  assert.equal(await h.count(page, 'route-click'), '1');

  step('with the section selected, hovering a Column outlines that Column, with an arrow pointer');
  const wed = await point('wednesday-heading');
  await page.mouse.move(wed.x, wed.y);
  await waitHovered('wednesday', 'the Column under the pointer is outlined');
  await waitNextIsText(false, 'arrow pointer over a Column');

  step('the second click selects the Monday Column, the third puts the caret in the text');
  await pause();
  await h.clickTextBefore(page, 'monday-text', 'beginers', 5);
  assert.equal(await h.selectedId(page), 'monday');
  assert.equal(await editing(), null, 'no caret yet');
  await waitHovered('monday-text', 'the hover now shows the paragraph, the next stop');
  await waitNextIsText(true, 'text cursor once the next click reaches text');
  await pause();
  await h.clickTextBefore(page, 'monday-text', 'beginers', 5);
  assert.equal(await h.selectedId(page), 'monday-text');
  assert.equal(await editing(), 'monday-text');
  await page.keyboard.type('n');
  assert.match(await h.text(page, 'monday-text'), /A gentle class for beginners, moving/);
  assert.equal(await h.taskDone(page, 1), true, 'task 1 ticked');
  assert.equal(await h.count(page, 'clicks-before-caret'), '2', 'the section and Column clicks came before the caret');
  assert.equal(await h.count(page, 'route-click'), '2');

  step('Escape: out of the text, then paragraph → Column → section → nothing');
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), 'monday-text');
  assert.equal(await editing(), null, 'left the text');
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), 'monday');
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), 'classes');
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), null);
  assert.equal(await h.count(page, 'arm-escapeOut'), '3');
  assert.equal(await h.count(page, 'route-click'), '2', 'Escape steps aren’t counted as clicks');

  step('the Cover: first click selects the Cover, the next goes straight to the Button (Buttons skipped)');
  const btn = await point('hero-button', 20, 12);
  await page.mouse.click(btn.x, btn.y);
  assert.equal(await h.selectedId(page), 'hero');
  await pause();
  await page.mouse.click(btn.x, btn.y);
  assert.equal(await h.selectedId(page), 'hero-button');
  assert.equal(await editing(), 'hero-button');
  assert.equal(await h.count(page, 'route-click'), '3');

  step('a double click goes straight to the text, with the caret there');
  const contact = await point('contact-text', 60, 10);
  await page.mouse.dblclick(contact.x, contact.y);
  assert.equal(await h.selectedId(page), 'contact-text');
  assert.equal(await editing(), 'contact-text');
  assert.match(await logText(), /Double click: straight to Paragraph/);
  assert.equal(await h.count(page, 'arm-dblFirstPress'), '1', 'the double click’s first press is counted');
  // The first press of the double click selected the contact section on the way.
  assert.equal(await h.count(page, 'route-click'), '4');

  step('task 2: one click on the Classes heading selects the section; Move up');
  await h.block(page, 'classes-heading').locator('.ut-rich').click();
  assert.equal(await h.selectedId(page), 'classes');
  await page.locator('.ut-toolbar [data-action="move-up"]').click();
  assert.equal((await h.topLevelIds(page)).join(','), 'hero,classes,about,hours,contact');
  assert.equal(await h.taskDone(page, 2), true, 'task 2 ticked');

  step('task 3: one click on the Opening hours heading selects the section; a swatch');
  await h.block(page, 'hours-heading').locator('.ut-rich').click();
  assert.equal(await h.selectedId(page), 'hours');
  await page.locator('.ut-inspector [data-color="sky"]').click();
  assert.equal(await h.block(page, 'hours').evaluate((el) => el.classList.contains('has-sky-background-color')), true);
  assert.equal(await h.taskDone(page, 3), true, 'task 3 ticked');

  step('task 4: click the Saturday heading twice (section, then Column), ⋮ → Delete');
  await h.block(page, 'saturday-heading').locator('.ut-rich').click();
  assert.equal(await h.selectedId(page), 'classes');
  await pause();
  await h.block(page, 'saturday-heading').locator('.ut-rich').click();
  assert.equal(await h.selectedId(page), 'saturday');
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await page.locator('.ut-menu').getByRole('menuitem', { name: 'Delete' }).click();
  assert.equal(await h.block(page, 'saturday').count(), 0);
  assert.equal(await h.taskDone(page, 4), true, 'task 4 ticked');

  // section, Column (task 1) + Cover + contact (double click) + Classes + Opening hours + Classes, Saturday
  assert.equal(await h.count(page, 'route-click'), '8');
  assert.equal(await h.count(page, 'route-padding'), '0', 'no padding route in this arm');
  assert.equal(await h.count(page, 'wrong'), '0');

  const code = await h.finishCode(page);
  h.checkCode(code, { arm: 'UB', tasks: '1111', routes: '0.0.0.0.0.8', x: 0, u: 0, k: 2 });

  step('a click in a section’s padding selects the section, as a stop, not by the padding route');
  await h.reset(page);
  await h.clickPadding(page, 'about');
  assert.equal(await h.selectedId(page), 'about');
  await pause();
  await h.clickPadding(page, 'about');
  assert.equal(await h.selectedId(page), 'about', 'padding is the section’s own stop');
  assert.equal(await h.count(page, 'route-click'), '1');
  assert.equal(await h.count(page, 'route-padding'), '0');
}
