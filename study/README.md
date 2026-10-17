# Website editor study

An unmoderated user test of the editing ideas in this repo, which runs on its own: send people a link, and the study page takes them through it, notices when they've done each task, asks them about it and collects the results. Nobody has to watch or moderate.

**[Take the study](https://automattic.github.io/site-editing-experiments/study/)** · **[Results page](https://automattic.github.io/site-editing-experiments/study/results.html)**

## What it compares

Five editors, all editing the same small site for a pottery studio (Northfield Ceramics):

| Editor | What it is | How it runs |
| --- | --- | --- |
| [Albers](../albers/) | Hover a section for Edit layout, Edit content or Freeform | Static mockup, in a frame |
| [Cassatt](../cassatt/) | The phone-first version: tap a section, tools in a bottom toolbar | Static mockup, in its phone frame |
| [Degas](../degas/) | Albers' modes on real blocks, in the site editor | WordPress in Playground |
| [Bourgeois](../bourgeois/) | The Section Site Editor plugin: section menu, Add a Section, Edit section and View layouts | WordPress in Playground |
| Gutenberg | The site editor with no plugin: the baseline | WordPress in Playground |

Albers, Cassatt and Degas start from the same page. Bourgeois and Gutenberg both start from the same page built from Bourgeois's own section patterns (ordinary core blocks, with the same section order and the main headings matched), so those two are a like-for-like comparison of the plugin against the editor without it. The WordPress editors open in the site editor on that page. Playground starts a fresh, throwaway WordPress for each person, and nothing is saved.

## How a session goes

About 25 minutes, on a computer.

1. **Welcome:** what to expect, what's recorded, consent, and two background questions: how often they use WordPress, and whether they've changed a website's design before.
2. **Three editors**, one after another, shown only as "Editor 1, 2, 3". Each person gets three of the five, in a balanced rotation (below). Each editor starts loading before it's needed, so the WordPress ones are usually ready by the time someone gets to them.
3. **Five tasks in each editor.** The task is shown in a bar above the editor, worded by goal and never by an editor's controls. The study checks the page every half-second and moves on as soon as the task is done. People can also choose **I've done it** (recorded as "thought done" if the page doesn't show it) or **Skip this task**, and after 4 minutes it moves on by itself. After each task: *"Overall, how easy or difficult was this task?"* (1–7, the Single Ease Question).
4. **After each editor:** the two UMUX-Lite statements ("This editor's capabilities meet my requirements", "This editor is easy to use", 1–7) and "What, if anything, confused you or got in your way?".
5. **At the end:** which of the three they'd rather use for changes like these, and why; anything else; then a completion code and their results.

### The tasks

| | Task (as shown) | Done when |
| --- | --- | --- |
| 1 | Change the main heading at the top of the page so it says: Handmade stoneware from Northfield | The top section's heading reads exactly that (ignoring case and punctuation) |
| 2 | In the top section of the page, swap the photo and the text around, so each is where the other was. | The photo has crossed to the other side of the heading, along the way they were laid out (left/right, or top/bottom on Cassatt's phone layout). A Cover layout, with the text over the photo, doesn't count |
| 3 | Give the section just below the top one (the one with three cards) a different background colour. | That section's background (or that of anything covering most of it) is different from when the editor loaded |
| 4 | Add a section with a customer quote straight after the top section. | The section right after the top one contains a quote: a blockquote, a quote or testimonial block, or text in curly quotes. Moving the page's existing quote up also counts |
| 5 | Remove the section with the prices from the page. | There's one fewer section showing two or more prices |

The checks are the same in every editor, because they don't look at an editor's own data. A small script, the **probe** ([`wp/probe.js`](wp/probe.js)), reads the page as it appears in the editor (its sections, their headings, photos, backgrounds and quotes, with any editing chrome left out) and turns it into the same description whichever editor it's in. [`tasks.js`](tasks.js) compares that with the description taken when the editor loaded. For Albers and Cassatt the study reads their frames directly. In WordPress, the probe is loaded in the editor by a small plugin ([`wp/study-probe.php`](wp/study-probe.php)) and posts its description up to the study page.

A task that's already done when it comes up (say, while doing an earlier one) is recorded as "done earlier" and skipped.

### Who sees which editors

Ten groups, each three editors in a set order: five rotations of Albers → Cassatt → Degas → Bourgeois → Gutenberg, and the same five reversed. Across the ten groups, each editor appears six times, twice in each position, so neither the editor nor the order of editors favours any one of them. People are put in a group at random, or you can assign groups yourself (below) to keep the numbers even. Ten people (one per group) gives six sessions per editor. Thirty gives eighteen.

## Running it

Send people the study link. These URL parameters are all optional:

| Parameter | What it does |
| --- | --- |
| `pid` | A participant ID to store with their results, e.g. from a recruiting platform: `?pid={{PROLIFIC_PID}}` |
| `group` | `0`–`9`, to assign a group instead of picking one at random |
| `editors` | A list of editors instead of a group, e.g. `?editors=degas,gutenberg` for a two-editor study |
| `endpoint` | A URL the results are sent to as JSON (`POST`, `text/plain`), after each editor and at the end, so unfinished sessions are kept too |
| `done` | A URL for the **Return to finish** button at the end, e.g. a Prolific or UserTesting completion link |
| `limit` | Seconds allowed per task (default 240) |

For example: `…/study/?pid=ab12&group=3&endpoint=https://script.google.com/macros/s/…/exec&done=https://app.prolific.com/submissions/complete?cc=XYZ`

### Collecting results

Without an endpoint, people can download their results at the end (**Download my answers**) and send you the file. A copy also stays in their browser's local storage.

With an endpoint, the study sends the results there. Anything that accepts a POST body will do. For a Google Sheet, for example, a short Apps Script web app (deployed for "Anyone") that appends each body to a column:

```js
function doPost( e ) {
	SpreadsheetApp.getActive().getSheets()[ 0 ].appendRow( [ new Date(), e.postData.contents ] );
	return ContentService.createTextOutput( 'ok' );
}
```

### Reading the results

Open the [results page](results.html) and drop in the files, or paste the JSON (one object per line works, so a column copied from the sheet above does too). It keeps each person's most complete record and shows:

- **By editor:** sessions, tasks done, "thought done" but not seen on the page, gave up (skipped or timed out), median time per task, average ease, UMUX-Lite (0–100), and how often it was the preferred one among the people who used it.
- **By task:** the same for each task and editor.
- **What people said:** what got in their way in each editor, and why they preferred one.
- **Who took part:** WordPress use and design experience.
- **Download CSV:** one row per task attempt, for a spreadsheet or stats package.

Results pages only show what you add; nothing is uploaded anywhere.

## What's recorded

Per person: their participant ID, group and editors, two background answers, start and finish times, window size and browser. Per editor: how long it took to load, and the UMUX-Lite answers and comment. Per task: the outcome (`success`, `claimed`, `skipped`, `timeout` or `done-earlier`), the time taken, the number of clicks in the editor, and the ease rating. Then the preference, the reason and any other comments. The study doesn't record people's screens or anything they type into the editors.

## Before a round of testing

Run the health check after changing any of the prototypes, since the study reads their pages:

```
cd study
npm install
npx playwright install chromium
npm run health                                      # the published study
STUDY_URL=http://localhost:8000/study/ npm run health   # a local copy
```

It opens each editor the way the study does and checks that the study can read it and that no task counts as done before anyone has touched it.

The study was checked by doing every task in every editor (through Albers' and Cassatt's own controls, and through the editor's data in WordPress) and confirming each was detected when it was done and not before, including through real Playground, and that look-alike changes don't count: a Cover layout isn't a swap, recolouring the top section isn't task 3, moving the gallery up isn't adding a quote, and deleting the FAQ isn't removing the prices.

## Things to know

- **It's for computers.** The welcome screen warns if the window is narrower than 1200px. Cassatt is shown in its phone frame, as it is on a computer anyway; a phone-only study of Cassatt would be a different test.
- **Albers and Cassatt don't save.** That's fine here: the study reads the page as it is, without anyone needing to save.
- **"Thought done, not seen" deserves a look.** It's either a way of doing the task the checks don't recognise, or an editor that made someone think they'd done it. Their comment usually says which.
- **The first WordPress editor can take up to a minute to start.** It begins loading on the welcome screen, while people read, and each next editor loads during the one before.
- Albers and Cassatt run with `?embed`, which hides Albers' site switcher and Cassatt's introduction (help text the other editors don't get).

## Files

- `index.html`, `study.js`, `study.css`: the study.
- `tasks.js`: the tasks and how each is checked.
- `wp/`: the probe, and the WordPress plugin that loads it, makes the study's page and opens it in the site editor.
- `blueprints/`: Playground blueprints for Degas, Bourgeois and Gutenberg. Each installs its plugins from this repo's `trunk`.
- `results.html`: the results page.
- `test/health.mjs`: the health check.
