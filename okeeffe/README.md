# O'Keeffe: pages and menus

Prototypes for user testing how the Pages screen and the site's menus fit together.

Most people with a simple site think "I have pages, and some of them are in my menu", or that the menu *is* their pages. In WordPress they're separate things: pages, menus (a classic menu or a Navigation block's menu), and where each menu appears. A new block-theme site makes this harder to see. Its header's Navigation block starts with a Page List that shows every page automatically, but the first time someone edits that menu, new pages stop appearing in it.

These prototypes put the Pages screen next to a live preview of the site, so every change shows in the header or footer straight away. Each one starts the same way every time, and **Reset** in the top bar puts it back.

## The prototypes

| | Prototype | What it tests |
| --- | --- | --- |
| A | [One list of pages](one-list.html) | The recommended direction. Every page in one list. Pages in the menu come first, in menu order, so the list reads like the header; the rest follow after a gap. A marker on each row says whether the page is in the menu: filled blue for in, a slashed outline for not in, dashed for "in once published". Click a marker for what that means for visitors, and the one action that changes it. |
| B | [Automatic menu](automatic.html) | A as most block-theme sites are today: the header menu is a Page List showing every published page. Markers are pale ("in your menu automatically"). Taking a page out asks once, then switches the menu to one you choose, which is what core's Page List "Convert to links" already does. After that, new pages are marked New instead of being added. |
| C | [Header and footer menus](two-menus.html) | A with two menus. The marker stays one control, and its popover becomes a checklist of the menus the site shows, so the list never splits into sections. Chips say which menus a page is in. |
| D | [Menu and other pages](sections.html) | The earlier take, for comparison: "In your menu" and "Other pages" as two groups, with + and − buttons. |
| E | [Menu in page settings](page-settings.html) | A control close to WordPress today: a table of pages with a Menu column and filters, an "Add to menu" switch when creating a page (with where to place it), and menu switches inside each page's settings. |
| F | [All pages with menu switches](toggles.html) | Every page in page order, child pages under their parent, with an "In menu" switch on each row. Switching on adds the page to the end of the header menu, or to its parent's dropdown if the parent is in the menu; switching off takes it out. Rows never move, and there's no popover: the preview shows the result. Menu order and dropdowns are in the ⋮ menu ("Move earlier in menu", "Move into the About dropdown"). |

What every prototype has:

- **A live site preview.** Click links in the preview to visit pages. Drafts in a menu show dimmed and dashed, since visitors can't see them. **Desktop | Phone** shows the header as a phone sees it, behind a Menu button. The **Site preview** switch hides it.
- **Add page**, with Save as draft or Publish. In A, B and C the new page's popover opens at once, so its menu state is explained where the person is looking.
- **The ⋮ menu on each row**: move up and down, into or out of a dropdown, view on site, publish a draft, and move to trash. Trash lists the menus the page is in, and Undo puts it back where it was. In an automatic menu, moving changes page order, since that's what a Page List sorts by.
- **Undo** on every change, in the message at the bottom.

There's no drag and drop. Ordering is done from the ⋮ menu so that all six behave the same in a test; the real thing would have both.

## Running a test

Each prototype opens in any browser, including on a phone, with no sign-in. Reset between participants.

### Who

People who run, or are about to make, a small site: a business, a club, a portfolio. Not developers or theme authors. Five or six per condition is enough to find the big problems.

### Suggested design

- Compare **A**, **D** and **E** on the core tasks, one prototype per participant, so earlier ones don't teach the later ones. **F** can stand in for A, or be a fourth condition: it asks whether a plain switch on every page is enough without A's markers and explanations.
- Then give everyone **B** and **C** as follow-ups. They test situations, not layouts: the automatic menu most sites have today, and a second menu.

Start each session with: "This is the Pages screen of a website for a bakery, Rosa's Bakery. On the right is the website as visitors see it. Please think aloud as you go. There are no wrong answers; we're testing the design, not you."

### Core tasks (A, D, E or F)

1. **Read the screen.** "Without clicking anything: which of these pages can a visitor get to from the top of the website?"
   *Watch for:* do they read the markers, the sections or the Menu column? Does anyone think Catering, Privacy policy and the rest are hidden or deleted?
2. **Add a page to the menu.** "Rosa wants customers to find the Catering page from the top of the site. Make that happen."
   *Success:* Catering is in the header. *Watch for:* time to first click; whether they find it on the page row, in the menu or in page settings.
3. **Take a page out.** "The Thank you for your order page is for after checkout. Make sure it isn't in the menu." (In A, D and E it starts out of the menu; ask "How can you tell it isn't?" instead.)
4. **New page.** "Rosa is starting to sell gift cards. Make a Gift cards page and publish it." Then ask: "Can visitors get to it from the top of the site?"
   *Watch for:* whether they expect a new page to be in the menu already. In A, does the popover that opens answer the question? Do they add it?
5. **Dropdown.** "Put Gift cards under About, as part of its dropdown."
   *Watch for:* where they look; whether they expect the page's address to change.
6. **Draft.** "Holiday orders isn't ready yet. Put it in the menu now so it's there when it's published." Then ask what visitors see today.
7. **Trash.** "Catering is closing. Remove the page." In A, add Catering to the menu first.
   *Watch for:* whether they understand it also leaves the menu, and whether they notice Undo.

### Follow-up: automatic menu (B)

1. "Which pages are in the menu here?" (All of them.) "How can you tell?"
2. "Rosa doesn't want Thank you for your order in the menu. Take it out."
   *Watch for:* how they read the confirm, especially "new pages won't be added on their own". Ask afterwards: "What happens now when Rosa makes a new page?"
3. "Publish Holiday orders." (Before step 2, it joins the menu on its own; ask "Where did it go?") After step 2, make a new page and ask whether it's in the menu.

### Follow-up: two menus (C)

1. "Which pages are at the bottom of the website?"
2. "Put Catering at the bottom of the site, not the top."
3. "Visit us is in two places. Take it out of the top only."
   *Watch for:* whether the checklist in the popover is found and understood; whether the chips help or clutter.

### Questions to close with

- "In your own words, what's the difference between a page and the menu?"
- "If you made a new page tomorrow, would it be in the menu?" Their answer shows whether the model stuck.
- In A: "What do the little squares at the right of each page mean?"
- In F: "What does the switch next to each page do?" And: "Is the order of this list the order of your menu?"

### What would tell us A works

- Task 1 answered correctly from the list alone, without opening anything.
- Task 2 done from the page's own row, first try.
- After task 4, participants can say why the new page isn't in the menu, and fix it without help.
- In B, participants can predict what happens to the next new page after taking one out.

## How it maps to WordPress

- **Chosen menu**: a `wp_navigation` menu of Page Link and Custom Link blocks, or a classic `nav_menu`. "In your menu" means a link to that page is in it.
- **Automatic menu**: a Navigation block whose menu is one Page List block (what a new block theme's header falls back to). Page List shows every published page in page order (`menu_order`), with child pages as dropdowns.
- **Taking a page out of an automatic menu** converts the Page List to page links, as core's "Convert to links" does, then removes that page. There's deliberately no "leave this page out" option: it would need a new Page List setting that older WordPress would ignore.
- **New**: pages published after a menu became chosen, and not yet added or kept out. In WordPress this would need storing which pages have been seen.
- **Which menus get a marker**: the menus the site actually shows (header, then footer), named by where they appear rather than by the menu's title.

## Running it

Plain HTML, CSS and JavaScript with no build step: `app.js` and `style.css` are shared, and each page sets `window.PROTOTYPE` to choose a layout (`one-list`, `toggles`, `sections` or `page-settings`) and a starting site (`chosen`, `automatic` or `two-menus`). Serve the repository root with any static server and open `okeeffe/`.

The bakery, its pages and its copy are placeholders.
