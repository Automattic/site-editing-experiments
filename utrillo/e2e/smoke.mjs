/*
 * Utrillo smoke test.
 *
 *   node utrillo/e2e/smoke.mjs
 *
 * Serves the repository with a tiny static server on a free port, opens each
 * of the four arms in headless Chrome and checks that it loads without
 * console errors. Then, in the control, it does all five tasks through the
 * editor's own routes, and the wrong targets of each, checking the task
 * ticks, the counts in the facilitator panel and the completion code. It
 * checks the gap between two columns as WordPress 7.1.5 has it: a quick
 * click selects the Column to the gap's right; a pause draws an insertion
 * line, which does nothing when clicked but for its "+", which adds a
 * Column. And it checks the inspector's Settings and Styles tabs.
 *
 * Finally it runs utrillo/e2e/<arm>.mjs for each arm that has one
 * (hover-tab, layers, create-not-learn). Each exports a default async function
 * that receives { page, baseUrl, assert, helpers }: `page` is a fresh page
 * that hasn't loaded anything yet (console errors on it fail the test),
 * `baseUrl` is the server's address for the utrillo folder, and `helpers` are
 * the ones below.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

// ---------- A tiny static server over the repository ----------

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseUrl = 'http://127.0.0.1:' + server.address().port + '/utrillo';

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

let failed = false;
const step = (text) => console.log('  · ' + text);

// A page that records console errors and uncaught exceptions.
async function newPage() {
  const page = await context.newPage();
  page.errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') page.errors.push(msg.text()); });
  page.on('pageerror', (err) => page.errors.push(String(err)));
  return page;
}
const noErrors = (page) => assert.deepEqual(page.errors, [], 'console errors: ' + page.errors.join('\n'));

// ---------- Helpers (also given to the arms' tests) ----------

const helpers = {
  block: (page, id) => page.locator('.ut-page [data-block-id="' + id + '"]'),
  selectedId: (page) => page.evaluate(() => { const el = document.querySelector('.ut-page .is-selected'); return el ? el.dataset.blockId : null; }),
  topLevelIds: (page) => page.$$eval('.ut-page > [data-block-id]', (els) => els.map((el) => el.dataset.blockId)),
  count: (page, key) => page.locator('[data-count="' + key + '"]').innerText(),
  taskDone: (page, n) => page.locator('.ut-tasks [data-task-row="' + n + '"]').evaluate((el) => el.classList.contains('is-done')),
  text: (page, id) => helpers.block(page, id).locator('.ut-rich').innerText(),

  // Click inside a block's text just before the given character, as a person
  // would, so the browser puts the caret there.
  async clickTextBefore(page, id, word, index) {
    await helpers.block(page, id).scrollIntoViewIfNeeded();
    const point = await helpers.block(page, id).locator('.ut-rich').evaluate((el, [w, i]) => {
      const node = el.firstChild;
      const at = node.textContent.indexOf(w) + i;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + 1);
      const r = range.getBoundingClientRect();
      return { x: r.left + 1, y: r.top + r.height / 2 };
    }, [word, index]);
    await page.mouse.click(point.x, point.y);
  },
  // Click a block's own area, a few pixels in from its top-left corner (its padding).
  async clickPadding(page, id, dx = 8, dy = 8) {
    await helpers.block(page, id).scrollIntoViewIfNeeded();
    const box = await helpers.block(page, id).boundingBox();
    await page.mouse.click(box.x + dx, box.y + dy);
  },
  // Open a Document Overview row, if it isn't open already.
  async expandRow(page, id) {
    const row = page.locator('.ut-overview [data-row-id="' + id + '"]');
    if ((await row.getAttribute('aria-expanded')) !== 'true') await row.locator('[data-action="lv-toggle"]').click();
  },
  selectParent: (page) => page.locator('.ut-toolbar [data-action="select-parent"]').click(),
  // A quick click in the gap just left of a Column, halfway down it: the
  // Columns' own area. In core that selects the Column to the right of the
  // gap. The pointer comes from outside the canvas first, so the click is
  // its first moment in the gap.
  async clickGapLeftOf(page, id) {
    await helpers.block(page, id).scrollIntoViewIfNeeded();
    const box = await helpers.block(page, id).boundingBox();
    await page.mouse.move(5, 5);
    await page.mouse.click(box.x - 6, box.y + box.height / 2);
  },
  // Rest the pointer in the gap left of a Column until core's insertion line shows.
  async hoverGapLeftOf(page, id) {
    await helpers.block(page, id).scrollIntoViewIfNeeded();
    const box = await helpers.block(page, id).boundingBox();
    await page.mouse.move(5, 5);
    await page.mouse.move(box.x - 6, box.y + box.height / 2);
    await page.waitForFunction(() => { const l = document.querySelector('.ut-gap-inserter'); return !!l && !l.hidden; }, null, { timeout: 3000 });
  },
  // The Styles tab, for blocks that have the inspector's tabs.
  async styles(page) {
    const tab = page.locator('.ut-inspector [data-tab="styles"]');
    if (await tab.count() && (await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  },
  async swatch(page, color) {
    await helpers.styles(page);
    await page.locator('.ut-inspector [data-color="' + color + '"]').click();
  },
  // A toolbar dropdown (Change vertical alignment, Align text), then an item.
  async pickDropdown(page, label, item) {
    await page.locator('.ut-toolbar [data-action="dropdown"][aria-label="' + label + '"]').click();
    await page.locator('.ut-menu').getByRole('menuitemradio', { name: item }).click();
  },
  // A Dimensions slider (gapH: a Columns' horizontal Block spacing; gap: a
  // Group's): press the arrow key `steps` times (negative for left).
  async stepSpacing(page, steps, key = 'gapH') {
    await helpers.styles(page);
    const input = page.locator('.ut-inspector [data-dim="' + key + '"]');
    await input.focus();
    for (let i = 0; i < Math.abs(steps); i++) await page.keyboard.press(steps > 0 ? 'ArrowRight' : 'ArrowLeft');
  },
  // The page's own numbers for a block: the gap between its columns (px),
  // the space above its second block (px), its vertical alignment class.
  gapOf: (page, id) => helpers.block(page, id).evaluate((el) => parseFloat(getComputedStyle(el).columnGap)),
  secondMargin: (page, id) => helpers.block(page, id).evaluate((el) => parseFloat(getComputedStyle(el.children[1]).marginTop)),
  hasClass: (page, id, cls) => helpers.block(page, id).evaluate((el, c) => el.classList.contains(c), cls),

  // Finished → "Yes, show my code" → the code; then Keep editing.
  async finishCode(page) {
    await page.locator('[data-action="finish"]').click();
    const dialog = page.locator('dialog.ut-finish');
    await dialog.getByText('Have you done all five tasks?').waitFor();
    await dialog.getByRole('button', { name: 'Yes, show my code' }).click();
    const code = await dialog.locator('textarea').inputValue();
    await dialog.getByRole('button', { name: 'Keep editing' }).click();
    return code;
  },
  // Check a completion code's parts. Seconds are checked as a number only.
  checkCode(code, expected) {
    const m = /^(U[CADE])-([01]{5})-r(\d+\.\d+\.\d+\.\d+\.\d+\.\d+)-x(\d+)-u(\d+)-k(\d+|x)-s(\d+)$/.exec(code);
    assert.ok(m, 'code has the right shape: ' + code);
    const [, arm, tasks, routes, x, u, k] = m;
    const got = { arm, tasks, routes, x: Number(x), u: Number(u), k: k === 'x' ? 'x' : Number(k) };
    for (const key of Object.keys(expected)) assert.deepEqual(got[key], expected[key], 'code part ' + key + ' in ' + code);
  },
  async reset(page) {
    await page.locator('.ut-notes [data-reset]').click();
    for (let n = 1; n <= 5; n++) assert.equal(await helpers.taskDone(page, n), false, 'task ' + n + ' unticked after Reset');
  }
};
const h = helpers;
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

async function test(name, fn) {
  console.log(name);
  try {
    await fn();
    console.log('  ok');
  } catch (err) {
    failed = true;
    console.log('  FAILED: ' + (err && err.stack || err));
  }
}

// ---------- Every arm loads cleanly ----------

const ARMS = { control: 'UC', 'hover-tab': 'UA', layers: 'UD', 'create-not-learn': 'UE' };
for (const [arm, code] of Object.entries(ARMS)) {
  await test('Loads ' + arm + '.html', async () => {
    const page = await newPage();
    await page.goto(baseUrl + '/' + arm + '.html');
    assert.equal(await page.title(), 'Fernhill Yoga · Editor');
    assert.equal(await page.evaluate(() => window.Utrillo.variant), arm);
    assert.equal((await h.topLevelIds(page)).join(','), 'hero,about,classes,hours,contact');
    assert.equal(await page.locator('.ut-notes').count(), 0, 'no notes panel without ?notes');
    // The arm's code comes through to the completion code.
    const c = await h.finishCode(page);
    h.checkCode(c, { arm: code, tasks: '00000', x: 0, u: 0, k: 'x' });
    noErrors(page);
    await page.close();
  });
}

// ---------- The control: all five tasks through the editor's own routes ----------

await test('Control, run 1: typo by clicking and typing; spacing by the toolbar; alignment by the breadcrumb; background by a gap click; delete by Document Overview', async () => {
  const page = await newPage();
  await page.goto(baseUrl + '/control.html?notes');

  step('task 1: click just before the second “e” of “beginers” and type n');
  await h.clickTextBefore(page, 'monday-text', 'beginers', 5);
  assert.equal(await h.selectedId(page), 'monday-text');
  await page.keyboard.type('n');
  assert.match(await h.text(page, 'monday-text'), /A gentle class for beginners, moving/);
  assert.equal(await h.taskDone(page, 1), true, 'task 1 ticked');
  assert.equal(await h.count(page, 'clicks-before-caret'), '0');

  step('the Paragraph toolbar: Align text between the movers and ⋮, in its own group');
  const groups = () => page.locator('.ut-toolbar .ut-tb-main > .ut-tb-group').evaluateAll((els) => els.map((g) => Array.from(g.querySelectorAll('button, [role="img"]')).map((b) => b.getAttribute('aria-label')).join('|')));
  assert.deepEqual(await groups(), ['Paragraph|Move up|Move down', 'Align text', 'Options']);

  step('task 2: select a paragraph, Select parent block up to the Columns; its toolbar and inspector');
  await h.block(page, 'wednesday-text').locator('.ut-rich').click();
  assert.equal(await h.selectedId(page), 'wednesday-text');
  assert.equal(await page.locator('.ut-toolbar [data-action="select-parent"]').getAttribute('aria-label'), 'Select parent block: Column');
  assert.equal(await page.locator('.ut-toolbar .ut-tb-name').count(), 0, 'the control toolbar shows icons only, as the editor does');
  await h.selectParent(page);
  assert.equal(await h.selectedId(page), 'wednesday');
  assert.deepEqual(await groups(), ['Column|Move left|Move right', 'Change vertical alignment', 'Options']);
  await h.selectParent(page);
  assert.equal(await h.selectedId(page), 'classes-columns');
  assert.deepEqual(await groups(), ['Columns|Move up|Move down', 'Change vertical alignment', 'Options']);
  const titles = () => page.locator('.ut-inspector .ut-panel-title').allInnerTexts();
  assert.deepEqual(await titles(), ['Settings'], 'the Settings tab first, as in core');
  await h.styles(page);
  assert.deepEqual(await titles(), ['Background', 'Dimensions']);
  assert.deepEqual(await page.locator('.ut-inspector .ut-dim-head .ut-label').allInnerTexts(), ['PADDING', 'MARGIN', 'BLOCK SPACING']);
  assert.deepEqual(await page.locator('.ut-inspector [data-dim]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))),
    ['Vertical padding', 'Horizontal padding', 'Vertical margin', 'Vertical block spacing', 'Horizontal block spacing']);
  assert.equal(await h.gapOf(page, 'classes-columns'), 34, 'the default, 2em of 17px');
  assert.equal(await page.locator('.ut-inspector [data-dim="gapH"]').getAttribute('aria-valuetext'), 'Default');

  step('task 2: one step right on horizontal Block spacing is Large, 2px more: not visibly more, so not done');
  await h.stepSpacing(page, 1);
  assert.equal(await h.gapOf(page, 'classes-columns'), 36);
  assert.equal(await h.taskDone(page, 2), false, 'Large isn’t visibly more space');
  step('task 2: one more, X-Large: at least 16px more between the classes, so done');
  await h.stepSpacing(page, 1);
  assert.equal(await page.locator('.ut-inspector [data-dim="gapH"]').getAttribute('aria-valuetext'), 'X-Large');
  const gap = await h.gapOf(page, 'classes-columns');
  assert.ok(gap >= 34 + 16, 'the gap is X-Large, 3.38rem: ' + gap);
  const seen = await page.evaluate(() => { const r = (id) => document.querySelector('[data-block-id="' + id + '"]').getBoundingClientRect(); return r('wednesday').left - r('monday').right; });
  assert.ok(seen >= 50, 'on screen, Monday and Wednesday are at least 50px apart: ' + seen);
  assert.equal(await h.taskDone(page, 2), true, 'task 2 ticked');
  assert.equal(await h.count(page, 'undos'), '0');
  assert.equal(await h.count(page, 'route-toolbar'), '2');

  step('task 3: select the About paragraph, then Columns in the breadcrumb, then Change vertical alignment → Align middle');
  await h.block(page, 'about-text').locator('.ut-rich').click();
  await page.locator('.ut-breadcrumb [data-id="about-columns"]').click();
  assert.equal(await h.selectedId(page), 'about-columns');
  const textTop = await h.block(page, 'about-col-text').evaluate((el) => el.firstElementChild.getBoundingClientRect().top);
  await h.pickDropdown(page, 'Change vertical alignment', 'Align middle');
  assert.equal(await h.hasClass(page, 'about-columns', 'are-vertically-aligned-center'), true);
  assert.equal(await h.hasClass(page, 'about-col-text', 'is-vertically-aligned-center'), true, 'its columns are aligned too, as in core');
  assert.ok(await h.block(page, 'about-col-text').evaluate((el) => el.firstElementChild.getBoundingClientRect().top) > textTop + 20, 'the text moved down to the middle of the picture');
  assert.equal(await page.locator('.ut-toolbar [data-action="dropdown"] svg path[d="M4 12H20"]').count(), 1, 'the toolbar button shows Align middle’s icon');
  assert.equal(await h.taskDone(page, 3), true, 'task 3 ticked');
  assert.equal(await h.count(page, 'route-breadcrumb'), '1');

  step('a click in the gaps between the classes selects the Column to the right, never the Columns');
  await h.clickGapLeftOf(page, 'saturday');
  assert.equal(await h.selectedId(page), 'saturday', 'between 2 and 3: the third Column');
  await h.clickGapLeftOf(page, 'wednesday');
  assert.equal(await h.selectedId(page), 'wednesday', 'between 1 and 2: the second Column');
  assert.equal(await h.count(page, 'route-padding'), '2', 'the padding route');

  step('task 4: with the Wednesday Column selected by the gap, the Styles tab, a background swatch');
  await h.swatch(page, 'sky');
  assert.equal(await h.hasClass(page, 'wednesday', 'has-sky-background-color'), true);
  assert.equal(await h.taskDone(page, 4), true, 'task 4 ticked');

  step('task 5: Document Overview, expand to the third Column, select it, ⋮ → Delete');
  await page.locator('.ut-topbar [data-action="overview"]').click();
  await h.expandRow(page, 'classes');
  await h.expandRow(page, 'classes-columns');
  await page.locator('.ut-overview [data-action="lv-select"][data-id="saturday"]').click();
  assert.equal(await h.selectedId(page), 'saturday');
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await page.locator('.ut-menu').getByRole('menuitem', { name: 'Delete' }).click();
  assert.equal(await h.block(page, 'saturday').count(), 0);
  assert.equal(await h.taskDone(page, 5), true, 'task 5 ticked');
  assert.equal(await h.count(page, 'route-listview'), '1');
  assert.equal(await h.count(page, 'overview-opened'), '1');
  assert.equal(await h.count(page, 'wrong'), '0');

  const code = await h.finishCode(page);
  h.checkCode(code, { arm: 'UC', tasks: '11111', routes: '2.0.1.1.2.0', x: 0, u: 0, k: 0 });
  noErrors(page);

  step('Reset puts the page back');
  await h.reset(page);
  assert.equal((await h.topLevelIds(page)).join(','), 'hero,about,classes,hours,contact');
  assert.match(await h.text(page, 'monday-text'), /beginers/);
  assert.equal(await h.gapOf(page, 'classes-columns'), 34);
  assert.equal(await h.hasClass(page, 'about-columns', 'are-vertically-aligned-center'), false);
  assert.equal(await h.count(page, 'route-toolbar'), '0');
  assert.equal(await page.locator('.ut-log li').innerText(), 'Nothing yet.');
  noErrors(page);
  await page.close();
});

await test('Control, run 2: every wrong target, undo of each new control, the padding and menu routes, delete by the Columns count, Not yet', async () => {
  const page = await newPage();
  await page.goto(baseUrl + '/control.html?notes');
  // Something then Reset, so this also checks a page that has been reset.
  await h.block(page, 'hero-text').locator('.ut-rich').click();
  await h.reset(page);
  const wrongs = () => page.locator('.ut-log li.is-wrong').allInnerTexts();

  step('task 2’s wrong target: the Classes Group’s Block spacing (its padding selects it), a drag across steps counts once');
  await h.clickPadding(page, 'classes');
  assert.equal(await h.selectedId(page), 'classes');
  assert.equal(await h.count(page, 'route-padding'), '1');
  assert.equal(await page.locator('.ut-inspector [data-tab]').count(), 0, 'a Group has no tabs, as in core');
  assert.deepEqual(await page.locator('.ut-inspector .ut-panel-title').allInnerTexts(), ['Background', 'Dimensions']);
  assert.equal(await h.secondMargin(page, 'classes'), 24, 'the Group’s default, 1.5rem');
  const slider = await page.locator('.ut-inspector [data-dim="gap"]').boundingBox();
  await page.mouse.move(slider.x + slider.width * 4 / 7, slider.y + slider.height / 2);
  await page.mouse.down();
  await page.mouse.move(slider.x + slider.width - 2, slider.y + slider.height / 2, { steps: 8 });
  await page.mouse.up();
  assert.ok(await h.secondMargin(page, 'classes') > 70, 'the heading is far from the classes now: ' + await h.secondMargin(page, 'classes'));
  assert.equal(await h.taskDone(page, 2), false, 'the Group’s spacing isn’t the space between the classes');
  assert.equal(await h.count(page, 'wrong'), '1', 'one wrong target for the drag');
  assert.match((await wrongs()).join('\n'), /block spacing of Group/);
  await page.keyboard.press(mod + '+z');
  assert.equal(await h.secondMargin(page, 'classes'), 24, 'one undo takes the whole drag back');
  assert.equal(await h.count(page, 'undos'), '1');

  step('undone, it can count again; but arrow presses on it count once');
  await h.stepSpacing(page, 2, 'gap');
  assert.equal(await h.count(page, 'wrong'), '2', 'two steps, one wrong target');
  await page.keyboard.press(mod + '+z');
  await page.keyboard.press(mod + '+z');
  assert.equal(await h.secondMargin(page, 'classes'), 24);

  step('task 2’s wrong targets on the Classes Columns: padding, margin and vertical Block spacing count once for it');
  await h.block(page, 'wednesday-text').locator('.ut-rich').click();
  await page.locator('.ut-breadcrumb [data-id="classes-columns"]').click();
  await h.stepSpacing(page, 1, 'paddingV');
  await h.stepSpacing(page, 1, 'margin');
  await h.stepSpacing(page, 2, 'gapV');
  assert.ok(await h.block(page, 'classes-columns').evaluate((el) => parseFloat(getComputedStyle(el).paddingTop)) > 0, 'padding set');
  assert.equal(await h.gapOf(page, 'classes-columns'), 34, 'the space between the classes is the same');
  assert.equal(await h.taskDone(page, 2), false);
  assert.equal(await h.count(page, 'wrong'), '3');
  assert.match((await wrongs()).slice(-1)[0], /vertical padding of Columns/);
  assert.equal(await page.locator('.ut-log li.is-wrong-again').count() >= 3, true, 'the repeats are logged, not counted');

  step('task 3’s wrong targets: Align text on the About heading, vertical alignment on the picture’s Column');
  await h.block(page, 'about-heading').locator('.ut-rich').click();
  await h.pickDropdown(page, 'Align text', 'Align text center');
  assert.equal(await h.hasClass(page, 'about-heading', 'has-text-align-center'), true);
  assert.equal(await h.block(page, 'about-heading').locator('.ut-rich').evaluate((el) => getComputedStyle(el).textAlign), 'center');
  assert.equal(await h.taskDone(page, 3), false);
  await h.pickDropdown(page, 'Align text', 'Align text left');
  assert.equal(await h.count(page, 'wrong'), '4', 'a second Align text on the same heading isn’t counted again');
  await h.block(page, 'about-text').locator('.ut-rich').click();
  await h.pickDropdown(page, 'Align text', 'Align text right');
  assert.equal(await h.count(page, 'wrong'), '5');
  // The picture fills its Column, so: the picture, then Select parent block.
  await h.block(page, 'about-image').click();
  await h.selectParent(page);
  assert.equal(await h.selectedId(page), 'about-col-picture');
  await h.pickDropdown(page, 'Change vertical alignment', 'Align middle');
  assert.equal(await h.hasClass(page, 'about-col-picture', 'is-vertically-aligned-center'), true);
  assert.equal(await h.taskDone(page, 3), false, 'the picture’s Column alone doesn’t line the text up');
  assert.equal(await h.count(page, 'wrong'), '6');
  assert.match((await wrongs()).join('\n'), /Align text on Heading 2.*\n.*Align text on Paragraph.*\n.*vertical alignment of Column/);

  step('then the text Column’s own vertical alignment is task 3, and undo unticks it');
  await h.clickGapLeftOf(page, 'about-col-text');
  assert.equal(await h.selectedId(page), 'about-col-text', 'the gap left of the text selects the text Column');
  await h.pickDropdown(page, 'Change vertical alignment', 'Align middle');
  assert.equal(await h.taskDone(page, 3), true, 'task 3 ticked');
  await page.keyboard.press(mod + '+z');
  assert.equal(await h.taskDone(page, 3), false, 'task 3 unticked by undo');
  assert.equal(await h.hasClass(page, 'about-col-text', 'is-vertically-aligned-center'), false);
  await page.keyboard.press(mod + '+Shift+z');
  assert.equal(await h.taskDone(page, 3), true, 'and ticked again by redo');
  // Done now: Align text on the paragraph again isn't a wrong target.
  await h.block(page, 'about-text').locator('.ut-rich').click();
  await h.pickDropdown(page, 'Align text', 'Align text right');
  assert.equal(await h.hasClass(page, 'about-text', 'has-text-align-right'), false, 'picking the one that’s set unsets it, as in core');
  assert.equal(await h.count(page, 'wrong'), '6');

  step('task 4’s wrong targets: the Wednesday heading, the Classes Columns, the Classes Group, another Column');
  await h.block(page, 'wednesday-heading').locator('.ut-rich').click();
  await h.swatch(page, 'sky');
  await h.selectParent(page);
  await h.selectParent(page);
  assert.equal(await h.selectedId(page), 'classes-columns');
  await h.swatch(page, 'sand');
  assert.equal(await h.hasClass(page, 'classes-columns', 'has-sand-background-color'), true, 'the Columns has a Background panel too, as in core');
  await h.swatch(page, 'white');
  assert.equal(await h.count(page, 'wrong'), '8', 'a second swatch on the Columns isn’t counted again');
  await h.selectParent(page);
  await h.swatch(page, 'white');
  await h.clickGapLeftOf(page, 'saturday');
  await h.swatch(page, 'clay');
  assert.equal(await h.taskDone(page, 4), false);
  assert.equal(await h.count(page, 'wrong'), '10');
  assert.match((await wrongs()).slice(-4).join('\n'), /Heading 3.*\n.*Columns.*\n.*Group.*\n.*Column/);
  await h.clickGapLeftOf(page, 'wednesday');
  await h.swatch(page, 'sky');
  assert.equal(await h.taskDone(page, 4), true, 'task 4 ticked');
  await h.swatch(page, 'clay');
  assert.equal(await h.count(page, 'wrong'), '10', 'changing it once done isn’t wrong');

  step('task 5’s wrong target: delete the Saturday heading with the keyboard, then undo');
  await h.block(page, 'saturday-heading').locator('.ut-rich').click();
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), 'saturday-heading', 'Escape leaves the text and keeps the block');
  await page.keyboard.press('Delete');
  assert.equal(await h.block(page, 'saturday-heading').count(), 0);
  assert.equal(await h.count(page, 'wrong'), '11');
  await page.keyboard.press(mod + '+z');
  assert.equal(await h.block(page, 'saturday-heading').count(), 1);

  step('menu route: ⋮ → Select parent block (Group)');
  await h.block(page, 'hours-text').locator('.ut-rich').click();
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await page.locator('.ut-menu').getByRole('menuitem', { name: 'Select parent block (Group)' }).click();
  assert.equal(await h.selectedId(page), 'hours');
  assert.equal(await h.count(page, 'route-menu'), '1');

  step('task 5: select the Classes Columns and lower the count to 2; undo, redo');
  await h.block(page, 'wednesday-text').locator('.ut-rich').click();
  await h.selectParent(page);
  await h.selectParent(page);
  assert.equal(await h.selectedId(page), 'classes-columns');
  assert.equal(await page.locator('.ut-inspector [data-columns-count]').innerText(), '3');
  await page.locator('.ut-inspector [data-action="columns-down"]').click();
  assert.equal(await h.block(page, 'saturday').count(), 0);
  assert.equal(await h.taskDone(page, 5), true, 'task 5 ticked');
  await page.keyboard.press(mod + '+z');
  assert.equal(await h.taskDone(page, 5), false, 'task 5 unticked by undo');
  await page.keyboard.press(mod + '+Shift+z');
  assert.equal(await h.taskDone(page, 5), true, 'task 5 ticked again by redo');

  step('Finished → Not yet goes back; Finished again gives the code');
  await page.locator('[data-action="finish"]').click();
  await page.locator('dialog.ut-finish').getByRole('button', { name: 'Not yet' }).click();
  assert.equal(await page.locator('dialog.ut-finish').evaluate((d) => d.open), false);
  const code = await h.finishCode(page);
  // toolbar: the picture Column, Columns, Group (task 4), Columns ×2 (task 5);
  // breadcrumb: the Classes Columns; padding: the Classes Group, then gaps:
  // text Column, Saturday, Wednesday. Undos: the drag, the two steps, task
  // 3, the Saturday heading, task 5.
  h.checkCode(code, { arm: 'UC', tasks: '00111', routes: '6.1.1.0.4.0', x: 11, u: 6, k: 'x' });
  noErrors(page);
  await page.close();
});

await test('Control, run 3 at 1024×768: undo while typing keeps the caret, the ⋮ menu stays on screen, added blocks aren’t wrong targets, undo reselects a deleted section', async () => {
  const page = await newPage();
  // The notes panel takes 360px on the right, so this leaves the editor
  // itself 1024 wide, as a participant at 1024×768 has it.
  await page.setViewportSize({ width: 1024 + 360, height: 768 });
  await page.goto(baseUrl + '/control.html?notes');
  const editingId = () => page.evaluate(() => { const el = document.querySelector('.ut-page .is-selected.is-editing'); return el ? el.dataset.blockId : null; });
  // Nothing sticks out of the canvas sideways, and the menu is inside it.
  const menuInsideCanvas = async () => {
    const canvas = await page.locator('.ut-canvas').boundingBox();
    const menu = await page.locator('.ut-menu').boundingBox();
    assert.ok(menu.x >= canvas.x && menu.x + menu.width <= canvas.x + canvas.width, 'menu inside the canvas: ' + JSON.stringify({ canvas, menu }));
    assert.equal(await page.locator('.ut-canvas').evaluate((el) => el.scrollWidth <= el.clientWidth), true, 'no horizontal scroll in the canvas');
  };

  step('undo while typing: type “nn”, undo, type “n”');
  await h.clickTextBefore(page, 'monday-text', 'beginers', 5);
  await page.keyboard.type('nn');
  assert.match(await h.text(page, 'monday-text'), /beginnners/);
  await page.keyboard.press(mod + '+z');
  assert.match(await h.text(page, 'monday-text'), /for beginers, moving/);
  assert.equal(await editingId(), 'monday-text', 'the caret is back in the paragraph after undo');
  await page.keyboard.type('n');
  assert.match(await h.text(page, 'monday-text'), /for beginners, moving/);
  assert.equal(await h.taskDone(page, 1), true, 'task 1 ticked');

  step('the ⋮ menu on the Saturday column stays inside the canvas, with and without Document Overview');
  await h.block(page, 'saturday-text').locator('.ut-rich').click();
  await h.selectParent(page);
  assert.equal(await h.selectedId(page), 'saturday');
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await menuInsideCanvas();
  await page.keyboard.press('Escape');
  await page.locator('.ut-topbar [data-action="overview"]').click();
  assert.equal(await page.locator('.ut-canvas').evaluate((el) => el.scrollWidth <= el.clientWidth), true, 'no horizontal scroll with Document Overview open');
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await menuInsideCanvas();
  await page.keyboard.press('Escape');

  step('Columns + then − isn’t a wrong target');
  await page.locator('.ut-overview [data-action="lv-select"][data-id="classes-columns"]').click();
  await page.locator('.ut-inspector [data-action="columns-up"]').click();
  assert.equal(await page.locator('.ut-inspector [data-columns-count]').innerText(), '4');
  await page.locator('.ut-inspector [data-action="columns-down"]').click();
  assert.equal(await page.locator('.ut-inspector [data-columns-count]').innerText(), '3');
  assert.equal(await h.count(page, 'wrong'), '0');

  step('⋮ Add after, then deleting the new paragraph, isn’t a wrong target; the log names it as what was before');
  await h.block(page, 'hours-text').locator('.ut-rich').click();
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await page.locator('.ut-menu').getByRole('menuitem', { name: 'Add after' }).click();
  const added = await h.selectedId(page);
  assert.match(added, /-new\d+$/);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Delete');
  assert.equal(await h.block(page, added).count(), 0);
  assert.equal(await h.selectedId(page), 'hours-text');
  assert.equal(await h.count(page, 'wrong'), '0');
  assert.match(await page.locator('.ut-log li').last().innerText(), /Before: Paragraph .*now deleted/);

  step('deleting a section, then undo, selects the section again');
  await page.locator('.ut-breadcrumb [data-id="hours"]').click();
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await page.locator('.ut-menu').getByRole('menuitem', { name: 'Delete' }).click();
  assert.equal(await h.block(page, 'hours').count(), 0);
  assert.equal(await h.count(page, 'wrong'), '1', 'deleting a section from the starting page is a wrong target');
  await page.keyboard.press(mod + '+z');
  assert.equal(await h.selectedId(page), 'hours');
  assert.equal(await page.locator('[data-for-block="hours"]').count(), 1, 'the toolbar names its block with data-for-block');
  assert.equal(await page.locator('[data-block-id="hours"]').count(), 1, 'only the block carries data-block-id');
  noErrors(page);
  await page.close();
});

await test('Control, run 4: the gap between columns as core has it, and the inspector’s tabs', async () => {
  const page = await newPage();
  await page.goto(baseUrl + '/control.html?notes');
  const line = page.locator('.ut-gap-inserter');
  const hovered = () => page.evaluate(() => Array.from(document.querySelectorAll('.ut-page .is-hovered')).map((el) => el.dataset.blockId));
  const columns = () => page.locator('.ut-page [data-block-id="classes-columns"] > [data-block-name="core/column"]').count();

  step('a quick click in the gap selects the Column to its right');
  await h.clickGapLeftOf(page, 'wednesday');
  assert.equal(await h.selectedId(page), 'wednesday');

  step('the pointer in the gap outlines nothing; after a pause the insertion line shows, down the whole gap');
  await page.keyboard.press('Escape');
  await h.hoverGapLeftOf(page, 'saturday');
  assert.deepEqual(await hovered(), [], 'no hover outline in the gap');
  const lb = await line.boundingBox();
  const wed = await h.block(page, 'wednesday').boundingBox();
  const sat = await h.block(page, 'saturday').boundingBox();
  assert.ok(lb.x > wed.x + wed.width && lb.x + lb.width < sat.x, 'the line is in the gap');
  assert.ok(Math.abs(lb.height - Math.max(wed.height, sat.height)) <= 1, 'as tall as the columns');
  assert.equal(await page.locator('.ut-gap-plus').isVisible(), true, 'with a “+” in its middle');

  step('a click on the line, off the “+”, does nothing: the selection stays');
  await h.block(page, 'monday-text').locator('.ut-rich').click();
  assert.equal(await h.selectedId(page), 'monday-text');
  await h.hoverGapLeftOf(page, 'saturday');
  const lb2 = await line.boundingBox();
  await page.mouse.click(lb2.x + lb2.width / 2, lb2.y + 10);
  assert.equal(await h.selectedId(page), 'monday-text', 'still the Monday paragraph');
  assert.equal(await columns(), 3);
  assert.match(await page.locator('.ut-log').innerText(), /insertion line .*nothing, as in core/);

  step('the “+” adds an empty Column there, selected; not a wrong target');
  await page.locator('.ut-gap-plus').click();
  assert.equal(await columns(), 4);
  const ids = await page.locator('.ut-page [data-block-id="classes-columns"] > [data-block-name="core/column"]').evaluateAll((els) => els.map((e) => e.dataset.blockId));
  assert.equal(ids[0] + ',' + ids[1] + ',' + ids[3], 'monday,wednesday,saturday');
  assert.match(ids[2], /-new\d+$/, 'between Wednesday and Saturday');
  assert.equal(await h.selectedId(page), ids[2]);
  assert.equal(await h.count(page, 'gap-inserts'), '1');
  assert.ok(Number(await h.count(page, 'gap-lines')) >= 2);
  assert.equal(await h.count(page, 'wrong'), '0');
  await page.keyboard.press(mod + '+z');
  assert.equal(await columns(), 3);

  step('tabs: a Columns opens on Settings; Styles has Background and Dimensions; another block opens on Settings again');
  await h.block(page, 'monday-text').locator('.ut-rich').click();
  await page.locator('.ut-breadcrumb [data-id="classes-columns"]').click();
  const tabs = page.locator('.ut-inspector [role="tab"]');
  assert.deepEqual(await tabs.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') + ':' + e.getAttribute('aria-selected'))), ['Settings:true', 'Styles:false']);
  assert.equal(await page.locator('.ut-inspector [data-color]').count(), 0, 'no colours on Settings');
  assert.equal(await page.locator('.ut-inspector [data-columns-count]').innerText(), '3');
  await page.locator('.ut-inspector [data-tab="styles"]').click();
  assert.equal(await page.locator('.ut-inspector [data-tab="styles"]').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('.ut-inspector [data-columns-count]').count(), 0, 'the count is on Settings only');
  assert.ok(await page.locator('.ut-inspector [data-color]').count() > 0);
  assert.equal(await h.count(page, 'styles-opened'), '1');
  await h.clickGapLeftOf(page, 'wednesday');
  assert.equal(await page.locator('.ut-inspector [data-tab="settings"]').getAttribute('aria-selected'), 'true', 'a Column opens on Settings');
  assert.equal(await page.locator('.ut-inspector [data-width]').count(), 1, 'with its Width');
  await h.styles(page);
  assert.deepEqual(await page.locator('.ut-inspector .ut-panel-title').allInnerTexts(), ['Background', 'Dimensions']);
  for (const id of ['classes', 'monday-text', 'classes-heading']) {
    await h.block(page, id === 'classes' ? 'hours-text' : id).locator('.ut-rich').click();
    if (id === 'classes') await page.locator('.ut-breadcrumb [data-id="hours"]').click();
    assert.equal(await page.locator('.ut-inspector [role="tab"]').count(), 0, 'no tabs on ' + id + ', as in core');
  }

  step('a slider released outside the window doesn’t stay held');
  await h.clickGapLeftOf(page, 'wednesday');
  await h.styles(page);
  const sl = await page.locator('.ut-inspector [data-dim="paddingV"]').boundingBox();
  await page.mouse.move(sl.x + 4, sl.y + sl.height / 2);
  await page.mouse.down();
  await page.dispatchEvent('.ut-inspector [data-dim="paddingV"]', 'pointercancel');
  await page.mouse.up();
  await h.clickGapLeftOf(page, 'saturday');
  await h.styles(page);
  assert.equal(await page.locator('.ut-inspector [data-dim]').count(), 2, 'the inspector is drawn for the next block');
  noErrors(page);
  await page.close();
});

// ---------- The arms' own tests ----------

for (const arm of ['hover-tab', 'layers', 'create-not-learn']) {
  const file = path.join(here, arm + '.mjs');
  if (!fs.existsSync(file)) { console.log(arm + '.mjs: none yet, skipped'); continue; }
  await test('Arm ' + arm + ' (' + arm + '.mjs)', async () => {
    const run = (await import(pathToFileURL(file).href)).default;
    const page = await newPage();
    await run({ page, baseUrl, assert, helpers });
    noErrors(page);
    await page.close();
  });
}

await browser.close();
server.close();
console.log(failed ? '\nSome checks failed.' : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
