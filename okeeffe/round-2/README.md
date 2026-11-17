# O'Keeffe round 2: pages and the menu, one thing or two?

Four prototypes for one user test about a website's pages and the menu at the top of the site.

A new block-theme site's header menu is automatic: it shows every published page, and new pages join it on their own. In WordPress today, the first time someone edits that menu it's converted to a list of links, and from then on it's a separate thing from the pages: new pages don't appear in it, and renaming a page doesn't rename its link.

The test asks two questions:

1. **Do people understand pages and the menu as one thing or two?** After changing the menu, can they say where a page went, what it's called, and whether the next new page will be in the menu?
2. **Can they change the menu?** Take a page out, reorder it, get a new page in, and change what an item says.

It compares two things, crossed: what the menu *is* after you change it (converted to links, or still connected to the pages), and *where* you change it (on the Pages screen, or in the menu's own sidebar, opened by clicking the menu on the site).

## The prototypes

| | Prototype | The menu after a change | Where the menu is changed |
| --- | --- | --- | --- |
| Control | [WordPress today](control.html) | Converts to links | The menu's own sidebar. Click the menu in the preview and a **Navigation** sidebar opens. It shows one **Page List** row with the published pages listed under it, and nothing there can be moved or taken out. Selecting the Page List row shows its settings, with a **Detach Page List** button; selecting a page under it goes straight to the same question. The **Detach Page List** dialog asks first (Cancel, Detach), then converts the menu to links: today's published pages, in the same order and at the same levels. After that the sidebar lists the links. Each has a drag handle and a ⋮ menu (Move up, Move down, Add submenu link, Remove); selecting one shows its **Text** (the label, which can be edited) and the page it links to; and **+** below the list adds a link, picked from a list of the site's published pages that narrows as you type. A drag changes a link's level only on purpose: moved at least 40 pixels to the right of where the drag started, it goes into the submenu of the link above; moved at least 40 pixels to the left, it comes out; otherwise it keeps the level it has. As in WordPress a link can go under Home, but only with that movement to the right. The Pages panel has no menu controls. |
| B | [Explained](explained.html) | Converts to links, and says so | The Pages screen. Every page has a marker saying whether it's in the menu: pale for "in your menu automatically", filled for in, a slashed outline for not in, dashed for "once published". Clicking a marker opens a popover with what that means and the actions: **Remove from menu** and **Rename in menu**. The first of either asks once ("you choose the menu's pages from now on … new pages won't be added on their own") and then converts. Rename in menu then asks for the new name; one message follows when that's done or cancelled, and its Undo takes back the conversion along with the name. After that, new pages are marked **New** and the popover offers **Add to menu** or **Keep it out**. Pages in the menu come first in the list, in menu order; drag a page by its handle, or use Move up and Move down in its ⋮ menu. |
| F | [Connected switches](switches.html) | Stays connected | The Pages screen. Every page has an **In menu** switch. Switching one off takes that page out of the menu and changes nothing else: no question, and the menu still follows the pages. The list is the menu's order: drag a page by its handle or use Move up and Move down, and child pages move with their parent. "Put under About" and "Take out from under About" change a page's parent. A new page arrives switched on; nothing in the panel says so beforehand, though a draft's row says "Shows in the menu once published". |
| Q | [Menu switches](menu-switches.html) | Stays connected | The menu's own sidebar, opened the same way as the control's. It lists the published pages as the menu's items, child pages under their parent, with no Page List row. Each has a drag handle, a **show/hide toggle** and a ⋮ menu (Move up, Move down). Switching a page off takes it out of the menu and changes nothing else. Moving a page changes page order, and the Pages panel's order with it; dragging it at least 40 pixels to the right of where the drag started makes it a child of the page above, and at least 40 pixels to the left takes it out, which changes its parent and so its address; otherwise it keeps the level it has (the same rule as the control's). Nothing else can be added and pages can't be removed from the list. Below the list, **Switch to advanced menu** asks first (Cancel, Switch), then turns the pages into links: the sidebar becomes the control's list of links, with **Hide** and **Show** in each ⋮ menu and an **Add new pages automatically** switch, on, below the list. Pages that were off become hidden links. The Pages panel has no menu controls. |

Two things follow from the model, and they are what the test is about:

- **Renaming.** While the menu is automatic or connected, a menu item's words are the page's title: rename the page and the menu follows, and there's no separate label. Once a menu has been converted to links, each link has its own label, copied from the page's title when it was converted (or when the link was added). After that, renaming the page doesn't change the link, and changing the link's label doesn't rename the page.
- **New pages.** An automatic or connected menu shows a page as soon as it's published, at its place in page order, which for a new page is the end. A menu that has been converted to links doesn't. Q's advanced menu is the exception: it adds a link for each newly published page until "Add new pages automatically" is turned off.

In B and F, clicking a link in the preview's menu visits that page. In the control and Q, clicking the menu selects it, as it does in the editor, so pages are visited from the Pages panel. The sidebar is closed by its close button, by Escape, or by clicking anywhere else in the preview, and a reload leaves it as it was.

The control and Q share one sidebar. Everything in it after a conversion is the same in both, apart from Hide, Show and "Add new pages automatically", which only Q's advanced menu has.

## What's the same in all four

Anything that differs beyond the table above is a bug.

- **The site**: Rosa's Bakery, an invented bakery. Its pages, in page order: Home; About, with child pages Our story and Team; Bread and cakes; Catering; Visit us; Thank you for your order; and Holiday orders, a draft. The header menu starts automatic, so it reads Home, About (Our story, Team), Bread and cakes, Catering, Visit us, Thank you for your order. There's no footer menu.
- **The shell**: a top bar (the site's icon, "Pages", "Rosa's Bakery"), the Pages panel on the left, the site as visitors see it on the right, and a bar along the bottom with **Finished**. Nothing in the participant's view names the prototype or switches to another one, and there's no Reset there.
- **The preview** shows the header menu, the current page's title and placeholder content, and "Draft: only you can see this page" on a draft. It updates straight away. Visitors don't see drafts or hidden links, so the menu doesn't show them. Under the label "The site as visitors see it" is the page's address.
- **The Pages panel's basics**: the pages as a tree, a Draft badge, **Add page** (a title, then Save as draft or Publish), and a ⋮ menu on each row with **Rename**, View on site, Publish (on a draft) and Move to trash (not on Home). Move to trash asks first, with the same words in every prototype and nothing about the menu: "Move "Catering" to trash?", "Visitors won't be able to see this page any more.", Cancel and Move to trash. Clicking a page's title shows it in the preview, whether or not it's in the menu. The panel doesn't count the pages in the menu, since that would answer the first task.
- **Undo**: every change shows a message at the bottom with Undo. The message stays for 12 seconds, and longer while the pointer is over it or the keyboard is in it. Ctrl+Z (Cmd+Z on a Mac) does the same as the button and still works after the message has gone. Undo is one level: it takes back the last change, until the next change is made. The shortcut is left alone while typing in a field or while a dialog is open, and the message is never shown with a dialog open. Undo closes anything that's open first.
- **Reordering** is by drag and by Move up and Move down wherever a prototype lets things be reordered. A handle also takes the up and down arrow keys. The message after a move is the same in every prototype (""Catering" moved"). A drag let go of outside its list, or ended with Escape, moves nothing.
- **Dialogs** close with Cancel, Escape or a click outside, and a double-click on the button that opens one doesn't close it again. Escape only ever closes the topmost thing.
- **The tasks, the log, the Finished button and the completion code.**
- **The browser tab's title**, "Rosa's Bakery · Pages". The address still names the prototype (`control.html`, `explained.html`, `switches.html`, `menu-switches.html`); hide it or use a link shortener if that matters for your test.
- **A reload keeps everything.** The site, the log and the counts are kept for the browser tab, so an accidental reload, or a testing tool reopening the link, doesn't start the participant again. A new tab starts fresh. Each prototype keeps its own.

The prototypes are for desktop browsers, from 1024 to 1500 pixels wide.

## Facilitator notes

Add `?notes` or `#notes` to the address (`switches.html?notes`) for a panel on the right that participants shouldn't see. It has:

- the prototype's letter and a line describing it;
- the six tasks. Tasks 2 to 6 are ticked, with the time, when the site reaches the result, and each shows where it stands now. Task 1 is a question, so it's never ticked for you. You can tick and untick any of them yourself;
- the counts that go into the completion code;
- a log of everything, with times since the page opened (or since Reset), and **Copy log** to paste it into your notes;
- Control | B | F | Q links to switch prototype, keeping the panel open, and **Reset**, which puts the site back and clears the log, the counts and what was kept for the tab.

The tasks aren't shown to participants: they read them in the testing tool, or you read them out.

The log records every page viewed in the preview and where from; every page added, published, renamed (the old and new title) and moved to trash; every Undo, with what it undid and whether it was the button or the keyboard; every page taken out of the menu or put in, and how (switch, popover, remove, toggle); every reorder, with how (drag, Move up/down, or the arrow keys) and the places it moved from and to; each convert or switch-to-advanced dialog shown, confirmed or cancelled, and what set it off; every change to a link's label, with the old and new text and what the page is still called; each task reached, straight after the action that reached it; and Finished, with the code. It records the Add page, Rename, Move to trash and "Rename in menu" dialogs being opened and cancelled, and how (Cancel, Escape, a click outside); drags that moved nothing (let go without moving, cancelled with Escape, dropped outside the list), which aren't counted as reorders; and "Page reloaded" each time the page is loaded again in the same tab, with a line for any dialog the reload closed, so that dialogs shown, confirmed and cancelled add up. A reload while "Have you done every task?" is open says so, and isn't counted as turning back. In B it also records each marker popover opened. In the control and Q it records the Navigation sidebar opening and closing, and how (which menu item was clicked, the close button, Escape, a click elsewhere in the preview); the Page List row or a link being selected; each toggle; links added (and whether at the end of the menu or in a submenu), hidden, shown and removed; "Add new pages automatically" being switched; and reorders in the sidebar, with the level as well as the place ("from place 4 at the top level to place 1 under About"). Clicks on things that look as if they should do something and don't are recorded as "tried to …": selecting a page under the control's Page List (which opens the Detach Page List dialog), clicking a page's name in Q's list, trying to drag the control's Page List row or a page under it, Move up on the first item or Move down on the last, the arrow keys on a handle at either end of a list (in every prototype), and clicking a link in the header menu again once the menu is selected.

## The completion code

**Finished**, in the bar at the bottom, first asks "Have you done every task?", with a way back. Then it shows a code to copy into the next question of an unmoderated testing tool, for example `OC-11212-ml140-d1.1-f35-r1.2-np-x0-u2-k3-e0-s412`. "Keep editing" goes back, and clicking Finished again gives a new code.

| Part | Meaning |
| --- | --- |
| `OC`, `OB`, `OF`, `OQ` | The prototype: the control, B, F, Q. |
| `11212` | Tasks 2 to 6 when Finished was clicked. Tasks 2, 3 and 5: 1 for reached, 0 for not. Tasks 4 and 6: 0 not published, 1 published but not shown in the menu, 2 published and shown in the menu. For task 4, any published page with "gift" in its title counts, in capitals or not: "Gift cards", "Giftcards", "Gift-cards", "Gift vouchers". |
| `ma`, `ml140`, `mv140`, `mx140` | The menu at the end. `ma`: still automatic or connected. `ml140`: converted to links, 140 seconds after the page opened. `mv140` (Q only): switched to an advanced menu that still adds new pages, at 140 seconds. `mx140` (Q only): an advanced menu with "Add new pages automatically" later turned off; the seconds are still when it was switched. |
| `d1.1` | Convert or switch-to-advanced dialogs shown, then confirmed. Always `d0.0` in F. |
| `f35` | Seconds until the first change to what the menu shows or its order, however it was made. That includes taking a page out, moving one and changing a link's label, and also renaming, adding, publishing or trashing a page while the menu is automatic or connected, since the menu follows the pages then. `f0`: never. |
| `r1.2` | Reorders by drag, then by Move up and Move down. The arrow keys on a handle count with Move up and Move down. A drag that moved nothing isn't counted. |
| `np`, `nl`, `n0` | How task 5 was done. `np`: the page was renamed, so its title is now "Find us". `nl`: only a link's label was changed. `n0`: neither. |
| `x0` | Pages moved to trash and not restored. |
| `u2` | Uses of Undo, by the button or with Ctrl+Z / Cmd+Z. |
| `k3` | The prototype's own count. Control and Q: times the Navigation sidebar was opened. B: marker popovers opened by the person (the one that opens by itself after Add page isn't counted). F: switches flipped. |
| `e0` | Times Finished was clicked and the person turned back at "Have you done every task?". |
| `s412` | Seconds from opening the page to clicking Finished. |

The tasks are read from the site as it is when Finished is clicked, not from the ticks. A change that was undone doesn't count towards the tasks or the `m` part, but the dialogs, reorders and switches that led to it stay counted.

## Running a test

Each prototype opens in a desktop browser with no sign-in. Use Reset in the notes panel between participants, or a new tab.

### Who

People who run, or are about to make, a small site: a business, a club, a portfolio. Not developers or theme authors, and not people who already know how WordPress menus work. Five or six per prototype finds the big problems.

### Design

One prototype per participant, since the first one teaches how the menu works and that carries over to the next. Change the order you run them in from day to day.

**Don't say "navigation", "link", "convert", "detach" or "automatic" before they do.** The tasks say what Rosa wants, not where to do it. Tasks 4 and 6 have a question to ask *before* the person looks at the site: ask it, then let them look.

Start with: "This is the Pages screen of a website for a bakery, Rosa's Bakery. On the right is the website as visitors see it. Rosa has asked you to make a few changes. Please think aloud as you go. There are no wrong answers; we're testing the design, not you."

### Tasks

1. "Without clicking anything: which of these pages can a visitor get to from the top of the website?"
   Then: **"How many pages does this site have, and how many are in the menu?"**
   *Watch for:* whether they read the menu in the preview or the list of pages; whether they count the child pages under About; whether they think the draft is in the menu. In B, whether the markers are read; in F, the switches.
2. "The Thank you for your order page is only for people who've just ordered. Take it out of the menu, without deleting it."
   Then: **"Where is that page now? Can a visitor still get to it?"**
   *Watch for:* where they look first, the page or the menu on the site. In the control and Q, whether they find that the menu can be clicked. In the control, what they make of the Page List row and the pages under it, how they get to the Detach Page List dialog (the log says which), and whether they read "new pages will no longer be added automatically". In B, how they read the confirm. Whether anyone reaches for Move to trash.
3. "Rosa wants Catering to come straight after Home in the menu."
   Then: **"Did anything else change order anywhere?"**
   *Watch for:* drag or Move up; in F and Q the list of pages changes order with the menu, and in the control it doesn't: do they notice, and does it match what they expected? In the control and Q, a drag only puts Catering under another item if it's moved 40 pixels or more to the right; the log says when that happens, and Undo puts it back.
4. "Rosa is starting to sell gift cards. Make a Gift cards page and publish it."
   Ask before they look at the site: **"Is the new page in the menu?"** Then: "Rosa wants it there. Make sure it is."
   *Watch for:* what they predict, and why. In the control and in B after a conversion the page isn't in the menu: how long until they see that, and can they add it? In B, does the popover that opens answer the question? In F and Q it's already there: do they look for something to do anyway?
5. "In the menu, 'Visit us' should say 'Find us'."
   Then: **"What is the page itself called now?"**
   *Watch for:* whether they rename the page or look for the menu item's own text. Where the menu is links, renaming the page doesn't change the menu: do they notice, and what do they try next? In the control, a page renamed before the menu is detached does rename the menu item, and the link is then made with the new name. In Q's pages menu, clicking a page's name in the sidebar does nothing; the log records the try. Whether their answer about the page's name is right.
6. "Holiday orders is ready. Publish it."
   Ask before they look at the site: **"Will it be in the menu?"**
   *Watch for:* whether the answer follows from what they've seen so far. This is the same question as task 4, after more experience.

### Questions to close with

- "What's the difference between a page and the menu?"
- "If you made a new page tomorrow, would it be in the menu?"

### What to watch for

- **The predictions in tasks 4 and 6.** This is the main measure of the first question. Compare what people say with what the prototype then does, per prototype. A right answer with a reason ("because I took one out, it stopped adding them") is worth more than a right guess.
- **Task 5, and the answer to "What is the page itself called now?"** The `n` part of the code says which was changed. Renaming the page is a fine answer where the menu is connected; where it's links, watch whether the person can tell that the page and the link now have different names.
- **Task 2 done with Move to trash**, and then Undo or not. The `x` part counts pages left in the trash.
- **Time to the first change to the menu** (the `f` part), and in the control and Q, how long before the menu on the site is clicked at all.
- **Dialogs confirmed without reading.** Ask what it said. The `d` part gives shown and confirmed.
- **Words.** Note what people call the menu ("the tabs", "the top bar", "the links") and whether "in your menu", "Navigation", "Page List" and "Detach" mean anything to them.

### What would favour each

- **Connected (F and Q)**: predictions in tasks 4 and 6 are right more often than in the control and B, task 5 is done by renaming the page without confusion, and nobody is surprised that reordering the menu reorders the pages.
- **Converting (the control and B)**: people want the menu and the pages to be separate, for example a menu label that differs from the page's title, or a menu order that differs from page order, and they understand that new pages need adding.
- **B over the control**: the confirm and the markers lead to right predictions where the control's Detach Page List dialog doesn't.
- **The Pages screen (B and F) over the sidebar (the control and Q)**: tasks 2 and 3 are started sooner and finished more often.
- **The sidebar over the Pages screen**: people go to the menu on the site first and find what they need there, or say that changing the menu from a list of pages is odd.

## How it maps to WordPress

- **The automatic menu** is a Navigation block whose menu holds one Page List block, which is what a new block theme's header falls back to. Page List shows every published page in page order (`menu_order`), child pages as submenus.
- **Converting to links** is the Page List's own Detach step, which replaces it with a Page Link block for each page. Each link stores its own label.
- **The control's words** are WordPress's, from the Page List block in `@wordpress/block-library` 12.1.0, the latest release of the package when this was built (`src/page-list/edit.jsx`): the button "Detach Page List", the dialog's title "Detach Page List", its buttons "Cancel" and "Detach", and its text "This Navigation Menu displays your website's pages. Detaching will enable you to add, delete, or reorder pages. However, new pages will no longer be added automatically." That release shows no notice in the sidebar, so the control has none. The package that WordPress 7.0 itself ships (9.40.2) words the same step differently: a notice with the same sentence but "Editing it will enable you…", an "Edit" button beside it, and an "Edit Page List" dialog with "Cancel" and "Edit". To test against that wording instead, change `convertCopy()` and `navPageListHtml()` in `app.js`. "Move up", "Move down", "Add submenu link", "Remove" followed by the link's name, "Text" and "This Navigation Menu is empty." are also the block library's words.
- **The control's sidebar before detaching** follows the Navigation block's list view: a Page List row, expanded, with a row for each published page under it. In WordPress, selecting the Page List shows its settings, where Detach Page List is, and selecting or dragging one of the pages under it opens the Detach Page List dialog; the control does the same, except that the pages can't be dragged.
- **What the control leaves out or simplifies.** WordPress's list view has no handles (a row is dragged by any part of it); the control and Q show one so that drag works the same way in every prototype. WordPress's ⋮ menu on a link also has Duplicate, Add before and Add after, which the control lacks. Before detaching, WordPress also has a ⋮ menu on the Page List row (with Remove), the Page List's Parent setting, a Detach button in the toolbar on the site itself, and a + that can add a link beside the Page List; the control has none of these, so its menu is either a Page List or links, never both. After detaching, WordPress's + searches posts and other content and takes a typed address, and a new link's settings open as it's added; the control's + lists published pages only. Links go two levels deep. "Add submenu link" picks a page for the new link.
- **B** is the same conversion, started from the Pages screen and explained in the prototype's own words. "New" would need WordPress to store which pages have been seen since the menu was converted.
- **F** is a Page List that leaves some pages out, which needs a setting on the block for the pages that are off. Its order is page order, and "Put under" changes a page's parent, and so its address.
- **Q** simulates [Quinn](../../quinn/), a Gutenberg pull request: a menu that is only a Page List lists its pages in the Navigation block's sidebar with a toggle each, and "Switch to advanced menu" turns them into links on a menu that still adds new pages. Following Quinn, switching a parent page off in Q hides its child pages too, though their toggles stay on; in F they move up to the top level, as they did in O'Keeffe's first round. Following Quinn again, nothing warns that moving a page under another changes its address. New pages are always made at the top level here, so an advanced menu adds each one at its end. The words of the Switch to advanced menu dialog and its "Switch" button are the prototype's, written from Quinn's description. As in F, Home can't be put under another page and nothing can be put under Home. Changing a row's level is by drag only (40 pixels or more to the right or left, as above), so it can't be done from the keyboard; Move up, Move down and the arrow keys on a handle move a row within its level.
- **Drafts** aren't shown in the preview's menu in any prototype, since the preview is the site as visitors see it and WordPress doesn't output a link to an unpublished page.

## Running it

Plain HTML, CSS and JavaScript with no build step and nothing loaded from elsewhere. `app.js` and `style.css` in this folder are round 2's own copy of the O'Keeffe engine, so the first round's prototypes in the folder above are unchanged. Each page sets `window.PROTOTYPE = { arm }` to `control`, `explained`, `switches` or `menu-switches`. Serve the repository root with any static server and open `okeeffe/round-2/`.

The bakery, its pages and its copy are placeholders.
