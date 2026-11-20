/*
 * Vermeer · A1 · Click to edit: its own route, its landings, the code.
 * Run by smoke.mjs (node vermeer/e2e/smoke.mjs).
 */
export default async function ({ page, baseUrl, assert, helpers: h }) {
  await page.goto(baseUrl + '/click-to-edit.html?notes');

  h.step('A1: a drag to select text, links, buttons and boxes all work as in browse');
  await h.dragSelect(page, 'picks-intro');
  assert.equal(await h.mode(page), 'browse', 'a click that ends a selection does nothing');
  await h.k(page, 'lbl-news').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'nl-email', 'a label puts the caret in its box');
  await page.keyboard.type('a@b.example');
  assert.equal(await page.locator('#nl-email').inputValue(), 'a@b.example');
  await page.locator('#nl-email').click();
  assert.equal(await h.mode(page), 'browse', 'a click in a box stays in browse');
  await h.followMenu(page, 'events');
  assert.equal(await h.currentPage(page), 'events');
  await page.locator('.vm-site [data-act="book:1"]').click();
  assert.equal(await page.locator('.vm-site [data-act="book:1"]').innerText(), 'Place booked ✓');
  await h.followMenu(page, 'home');
  assert.equal(await h.mode(page), 'browse');
  assert.equal(await h.count(page, 'nf-before'), '0', 'none of those was a non-functional click');

  h.step('A1: a click in the heading goes straight in, with the caret where it was clicked');
  await h.clickTextBefore(page, 'home-heading', 'coffee', 0);
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.editingKey(page), 'home-heading');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.k), 'home-heading', 'focus is in the heading');
  await page.keyboard.type('fresh ');
  assert.equal(await h.text(page, 'home-heading'), 'Books, fresh coffee and a quiet corner');
  assert.equal(await h.count(page, 'route-a1-click'), '1');
  assert.match(await h.count(page, 'first-entry'), /by a click on the site \(A1\)$/);
  assert.match((await h.logTexts(page)).join('\n'), /by a click on the site \(A1\)\. Ready: Home heading, caret where clicked/);
  await page.keyboard.press('Enter');
  await h.save(page);
  await h.exit(page);
  assert.equal(await h.mode(page), 'browse');
  assert.equal(await h.text(page, 'home-heading'), 'Books, fresh coffee and a quiet corner');

  h.step('A1: a click on the picture goes in with its section outlined and no caret');
  const art = await page.locator('.vm-site .cl-hero-art').boundingBox();
  await page.mouse.click(art.x + 40, art.y + 40);
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.selected(page), 'home-hero');
  assert.equal(await h.editingKey(page), null);
  await h.exit(page);
  assert.equal(await h.count(page, 'accidental'), '1', 'in and out with no change is accidental');

  h.step('A1: a click on a section’s background does the same');
  await h.clickSection(page, 'home-picks', 6, 6);
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.selected(page), 'home-picks');
  await h.exit(page);

  h.step('A1: the keyboard route is the Edit button, as in every arm');
  await h.tool(page, 'edit').focus();
  await page.keyboard.press('Enter');
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.count(page, 'route-edit-button-keyboard'), '1');
  assert.equal(await h.editingKey(page), null);
  await h.exit(page);

  h.step('A1: the footer typo, by a click just after “ex”');
  await h.clickTextBefore(page, 'footer-open', 'exept', 2);
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.editingKey(page), 'footer-open');
  await page.keyboard.type('c');
  assert.equal(await h.text(page, 'footer-open'), 'Open every day except Mondays');
  await page.keyboard.press('Enter');
  await h.save(page);
  await h.exit(page);

  h.step('A1: the code');
  assert.equal(await h.count(page, 'route-a1-click'), '4');
  assert.equal(await h.count(page, 'prompts-shown'), '0');
  const code = await h.finishCode(page);
  // 1 non-functional click before the first entry (the heading); 2 menu
  // links and 1 button; 2 accidental entries (picture, background) plus the
  // keyboard Edit = 3; 5 Exits.
  h.checkCode(code, { arm: 'VA1', tasks: '110100', f: 'a', n: 1, p: '0.0.0.0', l: '2.1', x: 3, b: 5 });

  h.step('A1: a click in the Home introduction beside its last line (not on a word) still lands in its text');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const gap = await page.evaluate(() => {
    // The line of the paragraph with the most room after its last word.
    const p = window.Vermeer.site.querySelector('.cl-lede[data-k-near]');
    const pr = p.getBoundingClientRect();
    const lines = {};
    for (const span of p.querySelectorAll('[data-k]')) {
      for (const r of span.getClientRects()) {
        const key = Math.round(r.top);
        if (!lines[key] || r.right > lines[key].right) lines[key] = { right: r.right, top: r.top, height: r.height };
      }
    }
    const best = Object.values(lines).sort((a, b) => a.right - b.right)[0];
    return { x: Math.min(pr.right - 4, best.right + 20), y: best.top + best.height / 2, room: pr.right - best.right };
  });
  assert.ok(gap.room > 30, 'the last line leaves room beside it');
  await page.mouse.click(gap.x, gap.y);
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.editingKey(page), 'home-intro-a');
}
