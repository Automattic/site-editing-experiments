/*
 * Utrillo smoke test.
 *
 *   node utrillo/e2e/smoke.mjs
 *
 * Serves the repository with a tiny static server on a free port, opens each
 * of the three arms in headless Chrome and checks that it loads without
 * console errors. Then, in the control, it does all four tasks through the
 * editor's own routes, twice (with Reset between), checking the task ticks,
 * the counts in the facilitator panel and the completion code.
 *
 * Finally it runs utrillo/e2e/<arm>.mjs for each arm that has one
 * (hover-tab, layers). Each exports a default async function
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

  // Finished → "Yes, show my code" → the code; then Keep editing.
  async finishCode(page) {
    await page.locator('[data-action="finish"]').click();
    const dialog = page.locator('dialog.ut-finish');
    await dialog.getByText('Have you done all four tasks?').waitFor();
    await dialog.getByRole('button', { name: 'Yes, show my code' }).click();
    const code = await dialog.locator('textarea').inputValue();
    await dialog.getByRole('button', { name: 'Keep editing' }).click();
    return code;
  },
  // Check a completion code's parts. Seconds are checked as a number only.
  checkCode(code, expected) {
    const m = /^(U[CABD])-([01]{4})-r(\d+\.\d+\.\d+\.\d+\.\d+\.\d+)-x(\d+)-u(\d+)-k(\d+|x)-s(\d+)$/.exec(code);
    assert.ok(m, 'code has the right shape: ' + code);
    const [, arm, tasks, routes, x, u, k] = m;
    const got = { arm, tasks, routes, x: Number(x), u: Number(u), k: k === 'x' ? 'x' : Number(k) };
    for (const key of Object.keys(expected)) assert.deepEqual(got[key], expected[key], 'code part ' + key + ' in ' + code);
  },
  async reset(page) {
    await page.locator('.ut-notes [data-reset]').click();
    for (let n = 1; n <= 4; n++) assert.equal(await helpers.taskDone(page, n), false, 'task ' + n + ' unticked after Reset');
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

const ARMS = { control: 'UC', 'hover-tab': 'UA', layers: 'UD' };
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
    h.checkCode(c, { arm: code, tasks: '0000', x: 0, u: 0, k: 'x' });
    noErrors(page);
    await page.close();
  });
}

// ---------- The control: all four tasks through the editor's own routes ----------

await test('Control, run 1: typo by clicking and typing, move by the toolbar, background by the breadcrumb, delete by Document Overview', async () => {
  const page = await newPage();
  await page.goto(baseUrl + '/control.html?notes');

  step('task 1: click just before the second “e” of “beginers” and type n');
  await h.clickTextBefore(page, 'monday-text', 'beginers', 5);
  assert.equal(await h.selectedId(page), 'monday-text');
  await page.keyboard.type('n');
  assert.match(await h.text(page, 'monday-text'), /A gentle class for beginners, moving/);
  assert.equal(await h.taskDone(page, 1), true, 'task 1 ticked');
  assert.equal(await h.count(page, 'clicks-before-caret'), '0');

  step('task 2: select a paragraph, Select parent block up to the section, Move up');
  await h.block(page, 'wednesday-text').locator('.ut-rich').click();
  assert.equal(await h.selectedId(page), 'wednesday-text');
  assert.equal(await page.locator('.ut-toolbar [data-action="select-parent"]').getAttribute('aria-label'), 'Select parent block: Column');
  assert.equal(await page.locator('.ut-toolbar .ut-tb-name').count(), 0, 'the control toolbar shows icons only, as the editor does');
  await h.selectParent(page);
  assert.equal(await h.selectedId(page), 'wednesday');
  await h.selectParent(page);
  assert.equal(await h.selectedId(page), 'classes-columns');
  await h.selectParent(page);
  assert.equal(await h.selectedId(page), 'classes');
  assert.equal(await page.locator('.ut-toolbar [data-action="select-parent"]').count(), 0, 'a section has no parent button');
  await page.locator('.ut-toolbar [data-action="move-up"]').click();
  assert.equal((await h.topLevelIds(page)).join(','), 'hero,classes,about,hours,contact');
  assert.equal(await h.taskDone(page, 2), true, 'task 2 ticked');
  assert.equal(await h.count(page, 'route-toolbar'), '3');

  step('task 3: select the Opening hours paragraph, then Group in the breadcrumb, then a swatch');
  await h.block(page, 'hours-text').locator('.ut-rich').click();
  await page.locator('.ut-breadcrumb [data-id="hours"]').click();
  assert.equal(await h.selectedId(page), 'hours');
  await page.locator('.ut-inspector [data-color="sky"]').click();
  assert.equal(await h.block(page, 'hours').evaluate((el) => el.classList.contains('has-sky-background-color')), true);
  assert.equal(await h.taskDone(page, 3), true, 'task 3 ticked');
  assert.equal(await h.count(page, 'route-breadcrumb'), '1');

  step('task 4: Document Overview, expand to the third Column, select it, ⋮ → Delete');
  await page.locator('.ut-topbar [data-action="overview"]').click();
  await h.expandRow(page, 'classes');
  await h.expandRow(page, 'classes-columns');
  await page.locator('.ut-overview [data-action="lv-select"][data-id="saturday"]').click();
  assert.equal(await h.selectedId(page), 'saturday');
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await page.locator('.ut-menu').getByRole('menuitem', { name: 'Delete' }).click();
  assert.equal(await h.block(page, 'saturday').count(), 0);
  assert.equal(await h.taskDone(page, 4), true, 'task 4 ticked');
  assert.equal(await h.count(page, 'route-listview'), '1');
  assert.equal(await h.count(page, 'overview-opened'), '1');
  assert.equal(await h.count(page, 'wrong'), '0');

  const code = await h.finishCode(page);
  h.checkCode(code, { arm: 'UC', tasks: '1111', routes: '3.0.1.1.0.0', x: 0, u: 0, k: 0 });
  noErrors(page);

  step('Reset puts the page back');
  await h.reset(page);
  assert.equal((await h.topLevelIds(page)).join(','), 'hero,about,classes,hours,contact');
  assert.match(await h.text(page, 'monday-text'), /beginers/);
  assert.equal(await h.count(page, 'route-toolbar'), '0');
  assert.equal(await page.locator('.ut-log li').innerText(), 'Nothing yet.');
  noErrors(page);
  await page.close();
});

await test('Control, run 2: a wrong delete and undo, the padding and menu routes, delete by lowering the Columns count, redo, Not yet', async () => {
  const page = await newPage();
  await page.goto(baseUrl + '/control.html?notes');
  // Run 1 then Reset, so this also checks a page that has been reset.
  await h.block(page, 'hero-text').locator('.ut-rich').click();
  await h.reset(page);

  step('a wrong target: delete the Saturday heading with the keyboard, then undo');
  await h.block(page, 'saturday-heading').locator('.ut-rich').click();
  await page.keyboard.press('Escape');
  assert.equal(await h.selectedId(page), 'saturday-heading', 'Escape leaves the text and keeps the block');
  await page.keyboard.press('Delete');
  assert.equal(await h.block(page, 'saturday-heading').count(), 0);
  assert.equal(await h.count(page, 'wrong'), '1');
  await page.keyboard.press(mod + '+z');
  assert.equal(await h.block(page, 'saturday-heading').count(), 1);
  assert.equal(await h.count(page, 'undos'), '1');

  step('padding route: a click in the Opening hours section’s padding selects it');
  await h.clickPadding(page, 'hours');
  assert.equal(await h.selectedId(page), 'hours');
  assert.equal(await h.count(page, 'route-padding'), '1');

  step('menu route: ⋮ → Select parent block (Group)');
  await h.block(page, 'hours-text').locator('.ut-rich').click();
  await page.locator('.ut-toolbar [data-action="options"]').click();
  await page.locator('.ut-menu').getByRole('menuitem', { name: 'Select parent block (Group)' }).click();
  assert.equal(await h.selectedId(page), 'hours');
  assert.equal(await h.count(page, 'route-menu'), '1');

  step('task 4: select the Classes Columns and lower the count to 2');
  await h.block(page, 'wednesday-text').locator('.ut-rich').click();
  await h.selectParent(page);
  await h.selectParent(page);
  assert.equal(await h.selectedId(page), 'classes-columns');
  assert.equal(await page.locator('.ut-inspector [data-columns-count]').innerText(), '3');
  await page.locator('.ut-inspector [data-action="columns-down"]').click();
  assert.equal(await page.locator('.ut-inspector [data-columns-count]').innerText(), '2');
  assert.equal(await h.block(page, 'saturday').count(), 0);
  assert.equal(await h.taskDone(page, 4), true, 'task 4 ticked');

  step('undo unticks it, redo ticks it again');
  await page.keyboard.press(mod + '+z');
  assert.equal(await h.taskDone(page, 4), false, 'task 4 unticked by undo');
  assert.equal(await h.block(page, 'saturday').count(), 1);
  await page.keyboard.press(mod + '+Shift+z');
  assert.equal(await h.taskDone(page, 4), true, 'task 4 ticked again by redo');

  step('Finished → Not yet goes back; Finished again gives the code');
  await page.locator('[data-action="finish"]').click();
  await page.locator('dialog.ut-finish').getByRole('button', { name: 'Not yet' }).click();
  assert.equal(await page.locator('dialog.ut-finish').evaluate((d) => d.open), false);
  const code = await h.finishCode(page);
  h.checkCode(code, { arm: 'UC', tasks: '0001', routes: '2.1.0.0.1.0', x: 1, u: 2, k: 'x' });
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

// ---------- The arms' own tests ----------

for (const arm of ['hover-tab', 'layers']) {
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
