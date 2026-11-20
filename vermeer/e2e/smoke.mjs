/*
 * Vermeer smoke test.
 *
 *   node vermeer/e2e/smoke.mjs
 *   (or NODE_PATH=/path/to/global/node_modules node vermeer/e2e/smoke.mjs
 *   if Playwright is installed globally)
 *
 * Serves the repository with a tiny static server on a free port, opens each
 * of the five arms in headless Chrome and checks that it loads without console
 * errors, with Create not Learn's chrome around the site. Then, in the
 * control, it does all six tasks through the Edit button, with clicks on the
 * strip, the sidebar (its Pages screen showing a page) and the admin bar on
 * the way, and saves through Review changes and with the keyboard, checking
 * the task ticks, the counts in the facilitator panel and the completion code;
 * checks the code's save parts with changes left unsaved and saved from the
 * Exit dialog; that a reload puts everything back, in browse and in edit mode
 * with an unsaved change; the Exit dialog's three choices; Reset; the API the
 * arms use; and the layout at 1024×768.
 *
 * Finally it runs vermeer/e2e/<arm>.mjs for each arm that has one. Each
 * exports a default async function that receives { page, baseUrl, assert,
 * helpers }: `page` is a fresh page in its own browser context (so its own
 * localStorage) that hasn't loaded anything yet; console errors on it fail
 * the test. `baseUrl` is the server's address for the vermeer folder, and
 * `helpers` are the ones below.
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
const baseUrl = 'http://127.0.0.1:' + server.address().port + '/vermeer';

const chrome = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
const browser = await chromium.launch(chrome ? { executablePath: chrome, headless: true } : { headless: true });

let failed = false;
const step = (text) => console.log('  · ' + text);

// A page in its own context (own localStorage) that records console errors
// and uncaught exceptions. The default size leaves the editor 1440×900 with
// the notes panel's 360px beside it.
async function newPage(viewport) {
  const context = await browser.newContext({ viewport: viewport || { width: 1440 + 360, height: 900 } });
  const page = await context.newPage();
  page.errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') page.errors.push(msg.text()); });
  page.on('pageerror', (err) => page.errors.push(String(err)));
  return page;
}
const closePage = (page) => page.context().close();
const noErrors = (page) => assert.deepEqual(page.errors, [], 'console errors: ' + page.errors.join('\n'));
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

// ---------- Helpers (also given to the arms' tests) ----------

const helpers = {
  mod,
  step,
  // The site and its text, by key (data-k), as in app.js's TEXT table.
  site: (page) => page.locator('.vm-site'),
  k: (page, key) => page.locator('.vm-site [data-k="' + key + '"]'),
  text: (page, key) => helpers.k(page, key).innerText(),
  mode: (page) => page.evaluate(() => window.Vermeer.mode()),
  currentPage: (page) => page.evaluate(() => window.Vermeer.page()),
  // The editing element's key, or null.
  editingKey: (page) => page.evaluate(() => { const el = document.querySelector('.vm-site .is-editing'); return el ? el.dataset.k : null; }),
  // What's outlined as selected without a caret: a section id, a text key, or null.
  selected: (page) => page.evaluate(() => { const el = document.querySelector('.vm-site .is-selected:not(.is-editing)'); return el ? el.dataset.section || el.dataset.k || 'img' : null; }),
  count: (page, key) => page.locator('.vm-notes [data-count="' + key + '"]').innerText(),
  taskDone: (page, n) => page.locator('.vm-notes [data-task-row="' + n + '"]').evaluate((el) => el.classList.contains('is-done')),
  // Everything app.js keeps for this arm, as saved in localStorage.
  state: (page) => page.evaluate(() => JSON.parse(localStorage.getItem('vermeer:' + window.Vermeer.variant))),
  logTexts: async (page) => (await helpers.state(page)).log.map((l) => l.text),
  lastLog: async (page) => { const l = await helpers.logTexts(page); return l[l.length - 1]; },
  tool: (page, action) => page.locator('.vm-toolbar [data-action="' + action + '"]'),

  // A point just before the given character of a word in a text element
  // (index = the word's length for just after its last character).
  async pointBefore(page, key, word, index) {
    await helpers.k(page, key).scrollIntoViewIfNeeded();
    return helpers.k(page, key).evaluate((el, [w, i]) => {
      const node = el.firstChild;
      const at = node.textContent.indexOf(w) + i;
      const range = document.createRange();
      // At the very end, just after the last character.
      const end = at >= node.length;
      range.setStart(node, end ? at - 1 : at);
      range.setEnd(node, end ? at : at + 1);
      const r = range.getBoundingClientRect();
      return { x: end ? r.right - 1 : r.left + 1, y: r.top + r.height / 2 };
    }, [word, index]);
  },
  async clickTextBefore(page, key, word, index) {
    const p = await helpers.pointBefore(page, key, word, index);
    await page.mouse.click(p.x, p.y);
    return p;
  },
  // A click on a section's own background, dx, dy in from its top-left.
  async clickSection(page, section, dx = 12, dy = 12) {
    const el = page.locator('.vm-site [data-section="' + section + '"]');
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    await page.mouse.click(box.x + dx, box.y + dy);
  },
  // Move the pointer to a point (in steps) and wait a moment there.
  async restAt(page, x, y, extra = 150) {
    await page.mouse.move(x, y, { steps: 4 });
    await page.waitForTimeout(500 + extra);
  },
  // Drag across some text, ending with a click that ends a selection.
  async dragSelect(page, key) {
    await helpers.k(page, key).scrollIntoViewIfNeeded();
    const b = await helpers.k(page, key).boundingBox();
    await page.mouse.move(b.x + 4, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + Math.min(160, b.width - 4), b.y + b.height / 2, { steps: 6 });
    await page.mouse.up();
  },

  edit: (page) => helpers.tool(page, 'edit').click(),
  // Save as Create not Learn does: the toolbar's Save opens Review changes,
  // whose "Save N changes" saves.
  async save(page) {
    await helpers.tool(page, 'save').click();
    const d = page.locator('dialog.vm-review');
    await d.waitFor();
    await d.getByRole('button', { name: /^Save \d+ changes?$/ }).click();
    await d.waitFor({ state: 'hidden' });
  },
  // Exit; with a choice ('Save', 'Discard', 'Keep editing') for the dialog.
  async exit(page, choice) {
    await helpers.tool(page, 'exit').click();
    if (!choice) return;
    const d = page.locator('dialog.vm-exit');
    await d.getByText('Save your changes?').waitFor();
    await d.locator('.vm-dialog-actions').getByRole('button', { name: choice, exact: true }).click();
  },
  // Go to a page with the page finder (the page's name in the toolbar).
  async pickPage(page, name) {
    await page.locator('.vm-toolbar .vm-address-btn').click();
    const id = { Home: 'home', Events: 'events', Contact: 'contact' }[name];
    await page.locator('.vm-finder [data-page="' + id + '"]').click();
  },
  // A click on the admin bar, the strip of icons or the sidebar, by its label.
  chrome: (page, where, label) => page.locator({ 'admin bar': '.vm-adminbar', rail: '.vm-rail', sidebar: '.vm-sidebar' }[where] + ' [data-chrome="' + label + '"]').first().click(),
  // Follow a link in the site's menu (browse).
  followMenu: (page, to) => helpers.k(page, 'nav-' + to).click(),
  // Select all of an element's text with the keyboard and type over it.
  async retype(page, key, text) {
    await helpers.k(page, key).click();
    await page.keyboard.press(mod + '+a');
    await page.keyboard.type(text);
  },

  // Finished → "Yes, I've finished" → the code; then Keep editing.
  async finishCode(page) {
    await page.locator('[data-action="finish"]').click();
    const d = page.locator('dialog.vm-finish');
    await d.getByText('Have you done every task?').waitFor();
    await d.getByRole('button', { name: 'Yes, I’ve finished' }).click();
    const code = await d.locator('textarea').inputValue();
    await d.getByRole('button', { name: 'Keep editing' }).click();
    return code;
  },
  // Check a completion code's parts. Seconds are checked as numbers only:
  // `f` is 'x', 'e' or 'a' (the route letter); `tasks` is the saved digits
  // and `screen` what the screen showed after the dot (null if no dot); `v`
  // is 'x' or the save part without its seconds, like 't.2.0'.
  checkCode(code, expected) {
    const m = /^(V0|VA1|VA2|VB|VC)-([01]{6})(?:\.([01]{6}))?-f(x|(\d+\.\d)([ea]))-n(\d+)-g(\d+)-p(\d+\.\d+\.\d+\.\d+)-l(\d+\.\d+)-x(\d+)-b(\d+)-v(x|(\d+)([tkd])\.(\d+)\.(\d+))-w(\d+)-s(\d+)$/.exec(code);
    assert.ok(m, 'code has the right shape: ' + code);
    const [, arm, tasks, screen, f, , fRoute, n, g, p, l, x, b, v, , vHow, vSaves, vDialog, w] = m;
    const got = { arm, tasks, screen: screen || null, f: f === 'x' ? 'x' : fRoute, n: Number(n), g: Number(g), p, l, x: Number(x), b: Number(b),
      v: v === 'x' ? 'x' : vHow + '.' + vSaves + '.' + vDialog, w: Number(w) };
    for (const key of Object.keys(expected)) assert.deepEqual(got[key], expected[key], 'code part ' + key + ' in ' + code);
    return got;
  },
  async reset(page) {
    await Promise.all([page.waitForEvent('load'), page.locator('.vm-notes [data-reset]').click()]);
    for (let n = 1; n <= 6; n++) assert.equal(await helpers.taskDone(page, n), false, 'task ' + n + ' unticked after Reset');
  }
};
const h = helpers;

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

const ARMS = { control: 'V0', 'click-to-edit': 'VA1', 'ask-on-click': 'VA2', 'hover-notice': 'VB', 'choose-on-click': 'VC' };
for (const [arm, code] of Object.entries(ARMS)) {
  await test('Loads ' + arm + '.html', async () => {
    const page = await newPage();
    await page.goto(baseUrl + '/' + arm + '.html');
    assert.equal(await page.title(), 'Cobble Lane Books · Your website');
    assert.equal(await page.evaluate(() => window.Vermeer.variant), arm);
    assert.equal(await h.mode(page), 'browse');
    assert.equal(await h.currentPage(page), 'home');
    assert.equal(await h.text(page, 'home-heading'), 'Books, coffee and a quiet corner');
    assert.equal(await page.locator('.vm-notes').count(), 0, 'no notes panel without ?notes');
    assert.equal(await h.tool(page, 'edit').innerText(), 'Edit', 'every arm keeps the Edit button');
    const c = await h.finishCode(page);
    h.checkCode(c, { arm: code, tasks: '000000', screen: null, f: 'x', n: 0, g: 0, p: '0.0.0.0', l: '0.0', x: 0, b: 0, v: 'x', w: 0 });
    for (const sel of ['.vm-adminbar', '.vm-rail', '.vm-sidebar', '.vm-toolbar [data-action="view"]']) assert.equal(await page.locator(sel).isVisible(), true, sel + ' shown');
    await page.goto(baseUrl + '/' + arm + '.html#notes');
    await page.reload();
    assert.equal(await page.locator('.vm-notes').count(), 1, 'notes panel with #notes');
    assert.match(await page.locator('.vm-notes-arm').innerText(), new RegExp('Code ' + code));
    noErrors(page);
    await closePage(page);
  });
}

// ---------- The control: all six tasks through the Edit button ----------

await test('Control: the six tasks by the Edit button, with the chrome, ticks, counts and the code', async () => {
  const page = await newPage();
  await page.goto(baseUrl + '/control.html?notes');

  step('clicks on the strip, the sidebar and the admin bar before editing are counted (g) and logged');
  await h.chrome(page, 'rail', 'Colors');
  assert.equal(await page.locator('.vm-sidebar .vm-screen').getAttribute('data-screen'), 'colors');
  assert.equal(await page.locator('.vm-sidebar h2').innerText(), 'Colors');
  await h.chrome(page, 'sidebar', 'Back');
  assert.equal(await page.locator('.vm-sidebar .vm-screen').getAttribute('data-screen'), 'home');
  assert.deepEqual(await page.locator('.vm-sidebar .vm-link-row strong').allInnerTexts(), ['Your homepage', 'Pages', 'Name & logo', 'Design', 'Header & footer']);
  await h.chrome(page, 'admin bar', 'New');
  assert.match(await h.lastLog(page), /^Tried the admin bar: New$/);
  assert.equal(await h.count(page, 'g-before'), '3');

  step('two clicks on non-functional spots before editing count; a drag to select text doesn’t');
  await h.k(page, 'picks-intro').click();
  await h.clickSection(page, 'home-hero', 30, 30);
  await h.dragSelect(page, 'picks-intro');
  assert.equal(await h.count(page, 'nf-before'), '2');
  assert.equal(await h.mode(page), 'browse', 'the control does nothing on those clicks');

  step('the Pages screen shows a page in the site area');
  await h.chrome(page, 'sidebar', 'Pages');
  assert.equal(await page.locator('.vm-sidebar .vm-screen').getAttribute('data-screen'), 'pages');
  await h.chrome(page, 'sidebar', 'Events in the list of pages');
  assert.equal(await h.currentPage(page), 'events');
  assert.match((await h.logTexts(page)).join('\n'), /Went to Events from Home \(the Pages screen\)/);
  assert.equal(await page.locator('.vm-sidebar .vm-page-row.is-shown .vm-page-pick').innerText(), 'Events');
  await h.chrome(page, 'sidebar', 'the menu switch for Contact');
  assert.match(await h.lastLog(page), /^Tried the sidebar: the menu switch for Contact$/);
  await h.chrome(page, 'sidebar', 'Back');
  assert.equal(await h.count(page, 'g-before'), '7');

  step('tasks 5 and 3: follow the menu links; book a place on Events; the hours come into view on Contact');
  await page.locator('.vm-site [data-act="book:1"]').click();
  assert.equal(await page.locator('.vm-site [data-act="book:1"]').innerText(), 'Place booked ✓');
  await h.followMenu(page, 'contact');
  await page.locator('.vm-site [data-hours]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.vm-notes [data-task-row="3"]').classList.contains('is-done'));
  assert.match(await page.locator('.vm-notes [data-task-row="3"]').innerText(), /Reached by menu link/);
  await h.followMenu(page, 'events');
  await h.followMenu(page, 'home');
  assert.equal(await h.taskDone(page, 5), true, 'task 5 ticked');
  assert.equal(await h.count(page, 'follows'), '3');
  assert.equal(await h.count(page, 'uses'), '1');

  step('back and forward, the page finder, and the toolbar’s inert controls');
  await h.tool(page, 'back').click();
  assert.equal(await h.currentPage(page), 'events');
  await h.tool(page, 'forward').click();
  assert.equal(await h.currentPage(page), 'home');
  await page.locator('.vm-toolbar .vm-address-btn').click();
  await page.keyboard.type('cont');
  assert.deepEqual(await page.locator('.vm-finder [data-page]').allInnerTexts(), ['Contact']);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.vm-finder').count(), 0);
  await h.tool(page, 'view').click();
  await page.locator('.vm-menu').getByRole('menuitemradio', { name: /Tablet/ }).click();
  assert.match(await h.lastLog(page), /^Tried View, Tablet$/);
  assert.equal(await h.count(page, 'g-before'), '7', 'the toolbar isn’t counted in g');

  step('an accidental entry: Edit, then Exit with no change; the rail and sidebar go, the admin bar stays');
  await h.edit(page);
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await page.locator('.vm-sidebar').isVisible(), false, 'the sidebar hides while editing');
  assert.equal(await page.locator('.vm-rail').isVisible(), false, 'so does the strip');
  assert.equal(await page.locator('.vm-adminbar').isVisible(), true, 'the admin bar stays');
  assert.equal(await page.locator('.vm-zoom').isVisible(), true, 'the zoom controls show');
  assert.equal(await h.editingKey(page), null, 'the Edit button selects nothing');
  assert.match(await h.count(page, 'first-entry'), /s, by the Edit button$/);
  await h.exit(page);
  assert.equal(await h.mode(page), 'browse');
  assert.equal(await h.count(page, 'accidental'), '1');
  assert.equal(await h.count(page, 'exits'), '1');

  step('Edit by keyboard; Save while greyed out is logged; Escape with nothing being edited stays in edit mode');
  await h.tool(page, 'edit').focus();
  await page.keyboard.press('Enter');
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.count(page, 'route-edit-button-keyboard'), '1');
  assert.equal(await page.locator('.vm-site a, .vm-site button').count(), 0, 'no live links or buttons in edit mode');
  assert.equal(await h.tool(page, 'save').getAttribute('aria-disabled'), 'true');
  await h.tool(page, 'save').click({ force: true }); // greyed, but clickable, as in Create not Learn
  assert.equal(await page.locator('dialog.vm-review[open]').count(), 0, 'nothing to review');
  assert.match(await h.lastLog(page), /Clicked Save while it was greyed out/);
  assert.equal(await h.count(page, 'save-grey'), '1');
  await page.keyboard.press('Escape');
  assert.equal(await h.mode(page), 'edit');

  step('task 1: change the heading (ticked on screen); task 2 waits for a save; undo and redo');
  await h.retype(page, 'home-heading', 'Good books and good coffee');
  assert.equal(await h.text(page, 'home-heading'), 'Good books and good coffee');
  assert.equal(await page.locator('.vm-site .vm-section-focus').getAttribute('data-name'), 'Hero', 'the section around it is outlined, named');
  await page.keyboard.press(mod + '+z');
  assert.equal(await h.text(page, 'home-heading'), 'Books, coffee and a quiet corner');
  await page.keyboard.press(mod + '+Shift+z');
  assert.equal(await h.text(page, 'home-heading'), 'Good books and good coffee');
  await page.keyboard.press('Enter');
  assert.equal(await h.editingKey(page), null, 'Enter finishes a heading');
  assert.equal(await h.taskDone(page, 1), true, 'task 1 is what’s on screen');
  assert.equal(await h.taskDone(page, 2), false, 'task 2 waits for a save');
  assert.match(await page.locator('.vm-notes [data-task-row="2"]').innerText(), /On screen, not saved/);
  assert.equal(await h.tool(page, 'save').getAttribute('aria-disabled'), null);
  assert.match(await h.tool(page, 'save').getAttribute('data-tip'), /^1 unsaved change · /);

  step('Escape puts text back');
  await h.clickTextBefore(page, 'picks-heading', 'month', 0);
  await page.keyboard.type('zz');
  await page.keyboard.press('Escape');
  assert.equal(await h.text(page, 'picks-heading'), 'This month’s picks');
  assert.equal(await h.count(page, 'escapes'), '1');

  step('task 6: the “See what’s on” button text; task 4: the footer typo');
  await h.clickTextBefore(page, 'home-cta', 'on', 2);
  assert.equal(await h.editingKey(page), 'home-cta', 'the caret lands in the button’s text');
  await page.keyboard.type(' this month');
  assert.equal(await h.text(page, 'home-cta'), 'See what’s on this month');
  await h.clickTextBefore(page, 'footer-open', 'exept', 2);
  await page.keyboard.type('c');
  assert.equal(await h.text(page, 'footer-open'), 'Open every day except Mondays');
  assert.equal(await page.locator('.vm-site .vm-section-focus').getAttribute('data-name'), 'Footer');

  step('Save opens Review changes: site-wide first, then the page; Discard on the footer; Save 1 change');
  await h.tool(page, 'save').click();
  const review = page.locator('dialog.vm-review');
  await review.waitFor();
  const heads = await review.locator('h3').allInnerTexts();
  assert.match(heads[0], /^Site-wide changes\s*1$/);
  assert.match(heads[1], /^Page changes\s*1$/);
  assert.deepEqual(await review.locator('li strong').allInnerTexts(), ['Footer', 'Home']);
  await review.getByRole('button', { name: 'Discard change to Footer' }).click();
  assert.equal(await h.text(page, 'footer-open'), 'Open every day exept Mondays', 'the footer change is gone');
  await review.getByRole('button', { name: 'Save 1 change' }).click();
  await review.waitFor({ state: 'hidden' });
  for (const n of [1, 2, 6]) assert.equal(await h.taskDone(page, n), true, 'task ' + n + ' ticked');
  assert.equal(await h.taskDone(page, 4), false, 'the typo was discarded');
  assert.equal(await h.tool(page, 'save').getAttribute('aria-disabled'), 'true');
  assert.match(await h.tool(page, 'save').getAttribute('data-tip'), /^All changes saved · /);
  assert.match((await h.logTexts(page)).join('\n'), /Saved 1 change \(Home\) by the toolbar’s Save, in Review changes/);

  step('the typo again, saved with the keyboard');
  await h.clickTextBefore(page, 'footer-open', 'exept', 2);
  await page.keyboard.type('c');
  await page.keyboard.press(mod + '+s');
  assert.equal(await h.taskDone(page, 4), true, 'task 4 ticked');
  assert.match(await h.count(page, 'saves'), /^2 \(0\)$/);
  assert.match(await h.count(page, 'first-save'), /by the toolbar’s Save/);

  step('Exit: straight back to browse, which shows the saved site');
  await h.exit(page);
  assert.equal(await h.mode(page), 'browse');
  assert.equal(await h.text(page, 'home-heading'), 'Good books and good coffee');
  assert.equal(await h.count(page, 'exits'), '2');
  assert.equal(await h.count(page, 'accidental'), '1');
  assert.equal(await h.count(page, 'nf-before'), '2');
  await h.k(page, 'picks-intro').click();
  assert.equal(await h.count(page, 'nf-total'), '3', 'later clicks count in the total');
  await h.chrome(page, 'admin bar', 'Comments');
  assert.equal(await h.count(page, 'g-before'), '7', 'but not before the first entry');
  assert.equal(await h.count(page, 'g-total'), '8');

  const code = await h.finishCode(page);
  h.checkCode(code, { arm: 'V0', tasks: '111111', screen: null, f: 'e', n: 2, g: 7, p: '0.0.0.0', l: '3.1', x: 1, b: 2, v: 't.2.0', w: 0 });
  assert.match((await h.logTexts(page)).join('\n'), /Finished\. Code V0-111111-/);
  noErrors(page);
  await closePage(page);
});

await test('Control: the save task in the code: unsaved at Finished (dotted digits, w), then saved from the Exit dialog (d)', async () => {
  const page = await newPage();
  await page.goto(baseUrl + '/control.html?notes');
  await h.edit(page);
  await h.retype(page, 'home-heading', 'Hello');
  await page.keyboard.press('Enter');
  let code = await h.finishCode(page);
  h.checkCode(code, { tasks: '100000', screen: '110000', v: 'x', w: 1 });
  await h.retype(page, 'cafe-heading', 'Our café');
  await page.keyboard.press('Enter');
  await h.exit(page, 'Save');
  code = await h.finishCode(page);
  h.checkCode(code, { tasks: '110000', screen: null, v: 'd.1.1', w: 0, b: 1, x: 0 });
  noErrors(page);
  await closePage(page);
});

// ---------- Reload, the Exit dialog, Reset ----------

await test('Control: a reload puts everything back; the Exit dialog’s three choices; Reset', async () => {
  const page = await newPage();
  await page.goto(baseUrl + '/control.html?notes');

  step('browse: Events by the address bar, then reload');
  await h.pickPage(page, 'Events');
  assert.equal(await h.currentPage(page), 'events');
  await page.locator('.vm-site [data-act="book:2"]').click();
  await page.reload();
  assert.equal(await h.mode(page), 'browse');
  assert.equal(await h.currentPage(page), 'events');
  assert.equal(await page.locator('.vm-site [data-act="book:2"]').innerText(), 'Place booked ✓');
  assert.equal(await h.tool(page, 'back').getAttribute('aria-disabled'), null, 'back still works after reload');
  assert.match(await h.lastLog(page), /^Page reloaded \(browsing Events\)/);
  assert.equal(await h.count(page, 'uses'), '1', 'counts survive');

  step('edit mode with an unsaved change, then reload');
  await h.edit(page);
  await h.retype(page, 'events-heading', 'Coming up');
  await page.keyboard.press('Enter');
  await page.reload();
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.currentPage(page), 'events');
  assert.equal(await h.text(page, 'events-heading'), 'Coming up');
  assert.equal(await h.tool(page, 'save').isEnabled(), true, 'Save still offered');
  assert.match(await h.lastLog(page), /in edit mode on Events, with 1 unsaved change/);

  step('Exit → Keep editing stays');
  await h.exit(page, 'Keep editing');
  assert.equal(await h.mode(page), 'edit');
  step('Exit → Discard throws the change away');
  await h.exit(page, 'Discard');
  assert.equal(await h.mode(page), 'browse');
  assert.equal(await h.text(page, 'events-heading'), 'What’s on');
  assert.equal(await h.count(page, 'accidental'), '0', 'a visit with a change isn’t accidental, even if discarded');
  step('Exit → Save keeps it');
  await h.edit(page);
  await h.retype(page, 'events-heading', 'Coming up');
  await h.exit(page, 'Save');
  assert.equal(await h.mode(page), 'browse');
  assert.equal(await h.text(page, 'events-heading'), 'Coming up');
  assert.match((await h.logTexts(page)).join('\n'), /saved: yes; dialog: Save/);
  assert.equal(await h.count(page, 'exits'), '2');

  step('Escape in the Exit dialog is Keep editing');
  await h.edit(page);
  await h.retype(page, 'events-intro', 'Something else');
  await h.tool(page, 'exit').click();
  await page.keyboard.press('Escape');
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await page.locator('dialog.vm-exit').evaluate((d) => d.open), false);

  step('a page switch while editing, then Exit stays on that page');
  await h.pickPage(page, 'Contact');
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.currentPage(page), 'contact');
  await h.exit(page, 'Discard');
  assert.equal(await h.currentPage(page), 'contact');

  step('Reset clears everything');
  await h.reset(page);
  assert.equal(await h.mode(page), 'browse');
  assert.equal(await h.currentPage(page), 'home');
  await h.pickPage(page, 'Events');
  assert.equal(await h.text(page, 'events-heading'), 'What’s on');
  assert.equal(await page.locator('.vm-site [data-act="book:2"]').innerText(), 'Book a place');
  assert.equal(await h.count(page, 'exits'), '0');
  assert.equal((await h.logTexts(page)).some((t) => /reloaded/.test(t)), false, 'the log starts again');
  noErrors(page);
  await closePage(page);
});

// ---------- Clicks, focus, reloads mid-typing, tabs ----------

await test('Control: double clicks, focus after page changes and forms, a reload while typing, Discard, two tabs, links stay in this tab', async () => {
  const page = await newPage();
  await page.goto(baseUrl + '/control.html?notes');

  step('a double click on a plain spot counts once and logs once');
  await h.k(page, 'picks-intro').dblclick();
  assert.equal(await h.count(page, 'nf-before'), '1');
  const logs = await h.logTexts(page);
  assert.equal(logs.filter((t) => /picks/.test(t) && /Clicked/.test(t)).length, 1);
  assert.equal(logs.some((t) => /^Selected some text/.test(t)), false, 'the second press isn’t logged as a selection');

  step('a link followed by keyboard puts focus on the new page’s heading; by pointer, on the site area');
  await h.k(page, 'nav-events').focus();
  await page.keyboard.press('Enter');
  assert.equal(await h.currentPage(page), 'events');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.k), 'events-heading');
  await h.followMenu(page, 'home');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'vm-viewport');

  step('the book club panel and what’s typed in a box survive a reload; a sent form focuses its thanks');
  await page.locator('.vm-site [data-act="bookclub"]').click();
  await page.locator('#bc-email').fill('reader@example.com');
  await page.reload();
  assert.equal(await page.locator('.vm-site .cl-club').count(), 1, 'the panel is still open');
  assert.equal(await page.locator('#bc-email').inputValue(), 'reader@example.com');
  await page.locator('.vm-site .cl-club-form button[type="submit"]').click();
  assert.equal(await page.evaluate(() => document.activeElement.dataset.thanks), 'club');

  step('a reload in the middle of typing: the edit is logged once and the visit isn’t accidental');
  await h.edit(page);
  await h.clickTextBefore(page, 'home-heading', 'coffee', 0);
  await page.keyboard.type('fresh ');
  await page.reload();
  assert.equal(await h.mode(page), 'edit');
  let all = await h.logTexts(page);
  assert.equal(all.filter((t) => /^Changed Home heading/.test(t)).length, 1, 'one “Changed” line');
  assert.match(all.find((t) => /^Changed Home heading/.test(t)), /“Books, fresh coffee and a quiet corner” \(finished by the reload\)/);
  assert.equal(await h.count(page, 'edits'), '1');
  await h.save(page);
  await h.exit(page);
  assert.equal(await h.count(page, 'accidental'), '0');
  all = await h.logTexts(page);
  assert.match(all.filter((t) => /^Left edit mode/.test(t)).pop(), /Changes in this visit: yes; saved: yes; dialog: not shown/);

  step('Exit → Discard logs “saved: no”; the page finder while editing is logged once as such');
  await h.edit(page);
  await h.pickPage(page, 'Contact');
  assert.match((await h.logTexts(page)).filter((t) => /^Went to Contact/.test(t)).pop(), /\(the page finder, while editing\)$/);
  await h.retype(page, 'contact-heading', 'Say hello');
  await h.exit(page, 'Discard');
  assert.match((await h.logTexts(page)).filter((t) => /^Left edit mode/.test(t)).pop(), /saved: no; dialog: Discard/);

  step('middle click does nothing; Ctrl+click follows in this tab; links have no context menu');
  await h.k(page, 'nav-events').click({ button: 'middle' });
  await page.waitForTimeout(200);
  assert.equal(page.context().pages().length, 1, 'no new tab');
  assert.equal(await h.currentPage(page), 'contact');
  await h.k(page, 'nav-events').click({ modifiers: [mod] });
  await page.waitForTimeout(200);
  assert.equal(page.context().pages().length, 1, 'no new tab');
  assert.equal(await h.currentPage(page), 'events');
  assert.equal(await h.k(page, 'nav-home').evaluate((a) => !a.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))), true, 'context menu prevented');

  step('a double click on a menu link follows it once');
  const followsBefore = Number(await h.count(page, 'follows'));
  await h.k(page, 'nav-contact').dblclick();
  await page.waitForTimeout(200);
  assert.equal(await h.currentPage(page), 'contact');
  assert.equal(Number(await h.count(page, 'follows')), followsBefore + 1, 'one follow for a double click');

  step('a second tab of the same arm: the first stops saving and says so; “Carry on here” takes over');
  const second = await page.context().newPage();
  second.errors = [];
  second.on('pageerror', (err) => second.errors.push(String(err)));
  await second.goto(baseUrl + '/control.html?notes');
  assert.match(await h.lastLog(second), /^Opened again in a new tab/);
  await page.locator('dialog.vm-stale').waitFor();
  assert.equal(await page.locator('dialog.vm-stale').innerText().then((t) => /open in another tab/.test(t)), true);
  const before = (await h.state(second)).log.length;
  await page.evaluate(() => window.Vermeer.log('from the first tab'));
  assert.equal((await h.state(second)).log.length, before, 'the first tab no longer writes');
  await Promise.all([page.waitForEvent('load'), page.locator('dialog.vm-stale [data-stale-reload]').click()]);
  assert.match(await h.lastLog(page), /^Page reloaded/);
  await second.locator('dialog.vm-stale').waitFor();
  assert.deepEqual(second.errors, []);
  noErrors(page);
  await closePage(page);
});

// ---------- The arm API, as the arms will use it ----------

await test('The window.Vermeer API: classify, enterEdit, perform, prompts, ordering, state', async () => {
  const page = await newPage();
  await page.goto(baseUrl + '/control.html?notes');

  step('classify');
  const kinds = await page.evaluate(() => {
    const V = window.Vermeer;
    const q = (s) => V.site.querySelector(s);
    const c = (s) => { const r = V.classify(q(s)); return [r.kind, r.label, r.textEl ? r.textEl.dataset.k : null, r.section ? r.section.dataset.section : null]; };
    return {
      nav: c('[data-k="nav-events"]'), cta: c('[data-k="home-cta"]'), club: c('[data-act="bookclub"]'),
      heading: c('[data-k="home-heading"]'), art: c('.cl-hero-art svg rect'), hero: c('.cl-hero'), news: c('#nl-email'), newsLabel: c('[data-k="lbl-news"]')
    };
  });
  assert.deepEqual(kinds.nav, ['link', 'Events', 'nav-events', 'header']);
  assert.deepEqual(kinds.cta, ['link', 'See what’s on', 'home-cta', 'home-hero']);
  assert.deepEqual(kinds.club, ['button', 'Join the book club', 'bookclub', 'header']);
  assert.deepEqual(kinds.heading, ['none', 'Home heading', 'home-heading', 'home-hero']);
  assert.deepEqual(kinds.art, ['none', 'Picture of the shop', null, 'home-hero']);
  assert.deepEqual(kinds.hero, ['none', 'background of Top of the Home page', null, 'home-hero']);
  assert.deepEqual(kinds.news, ['field', 'Email address', 'lbl-news', 'footer']);
  assert.deepEqual(kinds.newsLabel, ['field', 'Email address', 'lbl-news', 'footer']);

  step('an arm listener on the site sees app.js’s count first, and preventDefault stops a link');
  await page.evaluate(() => {
    const V = window.Vermeer;
    V.registerRoute('test-click', 'a test click');
    window.seen = [];
    V.site.addEventListener('click', (e) => {
      const info = V.clickInfo(e);
      window.seen.push([info.kind, info.counted, info.selecting]);
      if (info.kind === 'link' && info.el.dataset.k === 'nav-contact') e.preventDefault();
    });
  });
  await h.k(page, 'picks-intro').click();
  await h.k(page, 'nav-contact').click();
  assert.deepEqual(await page.evaluate(() => window.seen), [['none', true, false], ['link', false, false]]);
  assert.equal(await h.currentPage(page), 'home', 'the arm’s preventDefault kept the link from being followed');
  assert.equal(await h.count(page, 'nf-before'), '1');
  assert.equal(await h.count(page, 'follows'), '0');

  step('perform: a link, a button, a field, each with a via note, and no click event');
  await page.evaluate(() => { window.Vermeer.perform(window.Vermeer.site.querySelector('[data-act="bookclub"]'), { via: 'popup' }); });
  assert.equal(await page.locator('.vm-site .cl-club').count(), 1, 'the book club panel opened');
  await page.evaluate(() => { window.Vermeer.perform(window.Vermeer.site.querySelector('#nl-email'), { via: 'popup' }); });
  assert.equal(await page.evaluate(() => document.activeElement.id), 'nl-email');
  await page.keyboard.type('a@b.example');
  await page.evaluate(() => { window.Vermeer.perform(window.Vermeer.site.querySelector('[data-k="news-btn"]'), { via: 'popup' }); });
  assert.equal(await page.locator('.vm-site .cl-footer .cl-thanks').innerText(), 'Thanks, you’re on the list.');
  await page.evaluate(() => { window.Vermeer.perform(window.Vermeer.site.querySelector('[data-k="nav-events"]'), { via: 'popup' }); });
  assert.equal(await h.currentPage(page), 'events');
  assert.equal(await page.evaluate(() => window.seen.length), 2, 'perform sends no click');
  assert.equal(await h.count(page, 'follows'), '1 (1 via popup)');
  assert.equal(await h.count(page, 'uses'), '2 (2 via popup)');
  assert.match((await h.logTexts(page)).join('\n'), /Followed the link “Events” \(menu link, via the popup\) to Events/);

  step('suppressNextClick swallows the next site click before anyone sees it, uncounted');
  await page.evaluate(() => window.Vermeer.suppressNextClick('Touch showed the test prompt'));
  await h.k(page, 'events-intro').click();
  assert.equal(await page.evaluate(() => window.seen.length), 2);
  assert.equal(await h.count(page, 'nf-total'), '1');
  assert.equal(await h.lastLog(page), 'Touch showed the test prompt');

  step('a touch that becomes a scroll (pointercancel) clears suppressNextClick; cancelSuppress does too');
  await page.evaluate(() => { window.Vermeer.suppressNextClick('should not appear'); window.dispatchEvent(new PointerEvent('pointercancel', { pointerType: 'touch' })); });
  await h.k(page, 'events-intro').click();
  assert.equal(await h.count(page, 'nf-total'), '2', 'the click after the cancelled touch counts');
  await page.evaluate(() => { window.Vermeer.suppressNextClick('should not appear either'); window.Vermeer.cancelSuppress(); });
  await h.k(page, 'events-note').click();
  assert.equal(await h.count(page, 'nf-total'), '3');
  assert.equal((await h.logTexts(page)).some((t) => /should not appear/.test(t)), false);
  await page.evaluate(() => { window.seen.length = 2; });

  step('prompts: shown and outcomes; only the first outcome of an id counts');
  const ids = await page.evaluate(() => {
    const V = window.Vermeer;
    const a = V.promptShown('popup', 'on a link'); V.promptOutcome(a, 'followed', 'went to Events');
    const b = V.promptShown('popup'); V.promptOutcome(b, 'dismissed', 'Escape'); V.promptOutcome(b, 'accepted');
    const c = V.promptShown('popup'); V.promptOutcome(c, 'ignored', 'scrolled');
    const d = V.promptShown('popup');
    return [a, b, c, d];
  });
  assert.equal(new Set(ids).size, 4);
  assert.equal(await h.count(page, 'prompts-shown'), '4');
  assert.equal(await h.count(page, 'prompts-followed'), '1');
  assert.equal(await h.count(page, 'prompts-dismissed'), '1');
  assert.equal(await h.count(page, 'prompts-accepted'), '0');

  step('store and spell state; a reload keeps them and marks the open prompt ignored');
  await page.evaluate(() => { window.Vermeer.store.set('x', 1); window.Vermeer.spell.set('dismissed', true); });
  await page.reload();
  assert.equal(await page.evaluate(() => [window.Vermeer.store.get('x'), window.Vermeer.spell.get('dismissed'), window.Vermeer.spell.id()]).then(JSON.stringify), '[1,true,1]');
  assert.equal(await h.count(page, 'prompts-ignored'), '2', 'the prompt open at reload is ignored');
  assert.match((await h.logTexts(page)).join('\n'), /Popup ignored: page reloaded/);

  step('enterEdit on text lands with the caret at the point; on a background, its section is outlined');
  await page.evaluate(() => { window.events = []; window.Vermeer.on('modechange', (d) => window.events.push('mode:' + d.mode + ':' + d.route)); window.Vermeer.on('spellstart', (d) => window.events.push('spell:' + d.id)); });
  const pt = await h.pointBefore(page, 'events-intro', 'talks', 0);
  const landing = await page.evaluate(([x, y]) => {
    const V = window.Vermeer;
    V.registerRoute('test-click', 'a test click');
    const target = document.elementFromPoint(x, y);
    return V.enterEdit('test-click', { target, x, y });
  }, [pt.x, pt.y]);
  assert.deepEqual(landing, { landed: 'text', label: 'Events introduction' });
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.editingKey(page), 'events-intro');
  await page.keyboard.type('long ');
  assert.match(await h.text(page, 'events-intro'), /^Readings, long talks and/);
  await h.exit(page, 'Discard');
  assert.equal(await page.evaluate(() => [window.Vermeer.spell.get('dismissed'), window.Vermeer.spell.id(), window.Vermeer.store.get('x')]).then(JSON.stringify), '[null,2,1]', 'spell state cleared by Exit; store kept');
  const art = await page.evaluate(() => {
    const V = window.Vermeer;
    return V.enterEdit('test-click', { target: V.site.querySelector('.cl-events') });
  });
  assert.deepEqual(art, { landed: 'section', label: 'The list of events' });
  assert.equal(await h.selected(page), 'events-list');
  assert.equal(await h.editingKey(page), null);
  await h.exit(page);
  assert.deepEqual(await page.evaluate(() => window.events), ['mode:edit:test-click', 'mode:browse:exit', 'spell:2', 'mode:edit:test-click', 'mode:browse:exit', 'spell:3']);

  step('an arm route as the first entry gives the a letter');
  const code = await h.finishCode(page);
  h.checkCode(code, { arm: 'V0', f: 'a', n: 3, p: '4.0.2.2', l: '1.2', x: 1, b: 2 });
  noErrors(page);
  await closePage(page);
});

// ---------- The layout at 1024×768 ----------

await test('Control at 1024×768: nothing clipped or scrolling sideways, in browse and edit', async () => {
  const page = await newPage({ width: 1024, height: 768 });
  await page.goto(baseUrl + '/control.html');
  const check = async (label) => {
    const canvas = await page.locator('.vm-canvas').boundingBox();
    for (const b of await page.locator('.vm-toolbar button').all()) {
      const r = await b.boundingBox();
      assert.ok(r.x >= canvas.x && r.x + r.width <= canvas.x + canvas.width + 0.5, label + ': toolbar button inside the canvas');
    }
    assert.equal(await page.locator('.vm-viewport').evaluate((el) => el.scrollWidth <= el.clientWidth), true, label + ': no sideways scroll');
  };
  for (const p of ['Home', 'Events', 'Contact']) {
    await h.pickPage(page, p);
    await check('browse ' + p);
  }
  await h.edit(page);
  await check('edit');
  noErrors(page);
  await closePage(page);
});

// ---------- The arms' own tests ----------

for (const arm of Object.keys(ARMS).filter((a) => a !== 'control')) {
  const file = path.join(here, arm + '.mjs');
  if (!fs.existsSync(file)) { console.log(arm + '.mjs: none yet, skipped'); continue; }
  await test('Arm ' + arm + ' (' + arm + '.mjs)', async () => {
    const run = (await import(pathToFileURL(file).href)).default;
    const page = await newPage();
    await run({ page, baseUrl, assert, helpers });
    noErrors(page);
    await closePage(page);
  });
}

await browser.close();
server.close();
console.log(failed ? '\nSome checks failed.' : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
