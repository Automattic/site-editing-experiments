/*
 * Vermeer · C · Choose on click: the popup on links, buttons, boxes and plain
 * spots, its outcomes, the keyboard, placing, and the code.
 * Run by smoke.mjs (node vermeer/e2e/smoke.mjs).
 */
export default async function ({ page, baseUrl, assert, helpers: h }) {
  await page.goto(baseUrl + '/choose-on-click.html?notes');
  const pop = page.locator('.vm-layer .vm-choose');
  const choices = () => pop.getByRole('button').allInnerTexts();
  const choose = (name) => pop.getByRole('button', { name, exact: true }).click();
  const active = () => page.evaluate(() => { const a = document.activeElement; return a.id || a.dataset.choice || a.dataset.k || a.className; });
  const counts = async () => [await h.count(page, 'prompts-shown'), await h.count(page, 'prompts-accepted'), await h.count(page, 'prompts-dismissed'), await h.count(page, 'prompts-followed'), await h.count(page, 'prompts-ignored')].join('.');
  const inside = async (label) => {
    const vp = await page.locator('.vm-viewport').evaluate((el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.left + el.clientWidth, b: r.top + el.clientHeight }; });
    const b = await pop.boundingBox();
    assert.ok(b.x >= vp.l + 4 && b.y >= vp.t + 4 && b.x + b.width <= vp.r - 4 && b.y + b.height <= vp.b - 4, label + ': popup inside the site area ' + JSON.stringify([b, vp]));
    return b;
  };

  h.step('C: a menu link asks “Go to Events” or “Edit this”; going there is followed');
  await h.followMenu(page, 'events');
  assert.equal(await h.currentPage(page), 'home', 'the click alone doesn’t follow the link');
  assert.equal(await page.getByRole('dialog', { name: 'What would you like to do?' }).count(), 1);
  assert.deepEqual(await choices(), ['Go to Events', 'Edit this']);
  assert.equal(await active(), 'do', 'focus on the first choice');
  const [w1, w2] = await Promise.all([0, 1].map((i) => pop.getByRole('button').nth(i).boundingBox()));
  assert.ok(Math.abs(w1.width - w2.width) < 1 && Math.abs(w1.height - w2.height) < 1, 'the two choices are the same size');
  await inside('menu link');
  await choose('Go to Events');
  assert.equal(await pop.count(), 0);
  assert.equal(await h.currentPage(page), 'events');
  assert.equal(await h.count(page, 'follows'), '1 (1 via popup)');
  assert.equal(await page.locator('.vm-notes [data-menu-progress]').innerText(), '1/3', 'counts for task 4');
  assert.equal(await counts(), '1.0.0.1.0');

  h.step('C: “Book a place” asks “Use this button”, which books it');
  await page.locator('.vm-site [data-act="book:1"]').click();
  assert.deepEqual(await choices(), ['Use this button', 'Edit this']);
  assert.equal(await page.locator('.vm-site [data-act="book:1"]').innerText(), 'Book a place', 'not pressed yet');
  await choose('Use this button');
  assert.equal(await page.locator('.vm-site [data-act="book:1"]').innerText(), 'Place booked ✓');
  assert.equal(await active(), 'ev1-btn', 'focus on the button it pressed');
  assert.equal(await h.count(page, 'uses'), '1 (1 via popup)');

  h.step('C: plain text asks “Keep looking” (dismissed) or “Edit this”');
  await h.k(page, 'events-intro').click();
  assert.deepEqual(await choices(), ['Keep looking', 'Edit this']);
  await choose('Keep looking');
  assert.equal(await pop.count(), 0);
  assert.equal(await active(), 'vm-viewport');
  assert.equal(await counts(), '3.0.1.2.0');

  h.step('C: a box asks “Fill in this box” and doesn’t take focus until chosen; then typing works and clicks in it go through');
  await page.locator('#nl-email').click();
  assert.deepEqual(await choices(), ['Fill in this box', 'Edit this']);
  assert.notEqual(await active(), 'nl-email', 'the box hasn’t got focus yet');
  await choose('Fill in this box');
  assert.equal(await active(), 'nl-email');
  await page.keyboard.type('a@b.example');
  await page.locator('#nl-email').click();
  assert.equal(await pop.count(), 0, 'a click in the box that has focus doesn’t ask');
  await page.keyboard.type('m');
  assert.equal(await page.locator('#nl-email').inputValue(), 'a@b.examplem');
  await page.keyboard.press('Backspace');

  h.step('C: “Sign up” (a submit button) asks, then sends the form');
  await page.locator('.vm-site [data-k="news-btn"]').click();
  assert.deepEqual(await choices(), ['Use this button', 'Edit this']);
  assert.equal(await page.locator('.vm-site .cl-footer .cl-thanks').count(), 0, 'not sent yet');
  await choose('Use this button');
  assert.equal(await page.locator('.vm-site .cl-footer .cl-thanks').innerText(), 'Thanks, you’re on the list.');
  assert.equal(await counts(), '5.0.1.4.0');

  h.step('C: a box’s label asks too; Escape is dismissed and focus goes back');
  await h.k(page, 'lbl-news').click();
  assert.deepEqual(await choices(), ['Fill in this box', 'Edit this']);
  await page.keyboard.press('Escape');
  assert.equal(await pop.count(), 0);
  assert.equal(await counts(), '6.0.2.4.0');

  h.step('C: another click moves it (ignored); scrolling closes it (ignored); a double-click opens one');
  await h.k(page, 'events-heading').click();
  await h.k(page, 'events-note').click();
  assert.equal(await pop.count(), 1);
  assert.equal(await counts(), '8.0.2.4.1');
  const vb = await page.locator('.vm-viewport').boundingBox();
  await page.mouse.move(vb.x + 20, vb.y + 20);
  await page.mouse.wheel(0, -200);
  await page.waitForFunction(() => !document.querySelector('.vm-choose'));
  assert.equal(await counts(), '8.0.2.4.2');
  await h.k(page, 'ev2-text').dblclick();
  assert.equal(await pop.count(), 1);
  assert.equal(await counts(), '9.0.2.4.2');
  await page.keyboard.press('Escape');

  h.step('C: keyboard: Tab into a box doesn’t ask, Enter in it sends the form without asking, Space on a button asks');
  await page.locator('.vm-site [data-k="footer-find"]').focus();
  await page.keyboard.press('Tab');
  assert.equal(await active(), 'nl-email');
  assert.equal(await pop.count(), 0);
  await page.keyboard.press('Enter');
  assert.equal(await pop.count(), 0, 'Enter in a box submits its form without asking');
  assert.equal(await active(), 'nl-email', 'the box was empty, so the browser kept focus there to ask for an address');
  await page.keyboard.press('Tab');
  assert.equal(await active(), 'news-btn');
  await page.keyboard.press('Space');
  assert.deepEqual(await choices(), ['Use this button', 'Edit this']);
  await page.keyboard.press('Escape');
  assert.equal(await active(), 'news-btn', 'focus back on the button');
  assert.equal(await counts(), '10.0.4.4.2');

  h.step('C: Space on a link asks, without scrolling the page');
  await page.locator('.vm-site [data-k="nav-home"]').focus();
  const top = await page.locator('.vm-viewport').evaluate((el) => el.scrollTop);
  await page.keyboard.press('Space');
  assert.deepEqual(await choices(), ['Go to Home', 'Edit this']);
  assert.equal(await page.locator('.vm-viewport').evaluate((el) => el.scrollTop), top);
  await page.keyboard.press('Enter');
  assert.equal(await h.currentPage(page), 'home', 'Enter on the first choice goes');
  assert.equal(await counts(), '11.0.4.5.2');

  h.step('C: “Join the book club” opens its panel; clicks in its box (which has focus) go through');
  await page.locator('.vm-site [data-act="bookclub"]').click();
  await choose('Use this button');
  assert.equal(await page.locator('.vm-site .cl-club').count(), 1);
  assert.equal(await active(), 'bc-email');
  await page.locator('#bc-email').click();
  assert.equal(await pop.count(), 0);
  await page.locator('.vm-site [data-act="club-close"]').click();
  assert.deepEqual(await choices(), ['Use this button', 'Edit this page'], 'no words on the × button');
  await choose('Use this button');
  assert.equal(await page.locator('.vm-site .cl-club').count(), 0);
  assert.equal(await counts(), '13.0.4.7.2');

  h.step('C: the hard task by pointer: Edit this on “See what’s on” puts the caret in its words, at the click');
  await h.clickTextBefore(page, 'home-cta', 'on', 0);
  assert.equal(await h.currentPage(page), 'home');
  assert.deepEqual(await choices(), ['Go to Events', 'Edit this']);
  await choose('Edit this');
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.editingKey(page), 'home-cta');
  await page.keyboard.type('X');
  assert.equal(await h.text(page, 'home-cta'), 'See what’s Xon');
  assert.equal(await h.count(page, 'route-c-popup'), '1');
  assert.match(await h.count(page, 'first-entry'), /by Edit this, in the popup \(C\)$/);
  assert.match((await h.logTexts(page)).join('\n'), /Ready: “See what’s on” button, caret where clicked/);
  await page.keyboard.press('Escape');
  assert.equal(await h.text(page, 'home-cta'), 'See what’s on');
  await h.exit(page);
  assert.equal(await counts(), '14.1.4.7.2');

  h.step('C: the hard task by keyboard: Enter on the link asks under it; Tab, Enter on Edit this puts the caret in its words');
  await page.locator('.vm-site [data-k="home-cta"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await h.currentPage(page), 'home');
  assert.deepEqual(await choices(), ['Go to Events', 'Edit this']);
  const cta = await h.k(page, 'home-cta').boundingBox();
  const kb = await inside('keyboard');
  assert.ok(kb.y >= cta.y + cta.height && kb.y < cta.y + cta.height + 24, 'just under the link');
  await page.keyboard.press('Tab');
  assert.equal(await active(), 'edit');
  await page.keyboard.press('Enter');
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.editingKey(page), 'home-cta');
  await page.keyboard.type(' now');
  assert.equal(await h.text(page, 'home-cta'), 'See what’s on now');
  await page.keyboard.press('Enter');
  await h.save(page);
  await h.exit(page);
  assert.equal(await h.text(page, 'home-cta'), 'See what’s on now');
  assert.match((await h.logTexts(page)).join('\n'), /Shown: popup \(on the link “See what’s on”, by keyboard\)/);

  h.step('C: the inline text link and the picture');
  await h.k(page, 'home-intro-link').click();
  assert.deepEqual(await choices(), ['Go to Events', 'Edit this']);
  await page.keyboard.press('Escape');
  const art = await page.locator('.vm-site .cl-hero-art').boundingBox();
  await page.mouse.click(art.x + 40, art.y + 40);
  assert.deepEqual(await choices(), ['Keep looking', 'Edit this page']);
  await choose('Edit this page');
  assert.equal(await h.mode(page), 'edit');
  assert.equal(await h.selected(page), 'home-hero');
  assert.equal(await h.editingKey(page), null);
  await h.exit(page);

  h.step('C: at the right and bottom edges it stays inside the site area and flips above');
  const edge = await page.evaluate(() => {
    const vp = window.Vermeer.viewport;
    const r = vp.getBoundingClientRect();
    const pts = { right: [r.left + vp.clientWidth - 3, r.top + 160], bottom: [r.left + 200, r.top + vp.clientHeight - 3] };
    const out = {};
    for (const [k, [x, y]] of Object.entries(pts)) out[k] = { x, y, kind: window.Vermeer.classify(document.elementFromPoint(x, y)).kind };
    return out;
  });
  for (const [where, p] of Object.entries(edge)) {
    await page.mouse.click(p.x, p.y);
    assert.equal(await pop.count(), 1, where + ' edge');
    const b = await inside(where + ' edge');
    if (where === 'bottom') assert.ok(b.y + b.height < p.y, 'flipped above the point');
    await page.keyboard.press('Escape');
  }

  h.step('C: the code');
  // Non-functional clicks before the first entry: events intro, events
  // heading, events note, the double-click (counted once) = 4. Links: Events, Home;
  // buttons: Book a place, Sign up, the Enter in the box (a submit), Join the
  // book club, the panel's × = 5.
  const code = await h.finishCode(page);
  h.checkCode(code, { arm: 'VC', tasks: '000001', f: 'a', n: 4, p: '19.3.14.2', l: '2.5', x: 2, b: 3 });

  h.step('C: a link further down the same page offers “Follow this link”');
  await h.pickPage(page, 'Contact');
  await h.k(page, 'directions').click();
  assert.deepEqual(await page.locator('.vm-layer .vm-choose button').allInnerTexts(), ['Follow this link', 'Edit this']);
  assert.equal(await page.locator('.vm-layer .vm-choose').getAttribute('aria-modal'), 'true');
  await page.keyboard.press('Escape');
}
