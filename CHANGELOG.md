# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `ghostly measure` taps everything: every button, tab, menu, dialog and
  accordion, one after the other, also what a tap opens. `<Ghost>`s that
  only show after a tap are measured, and links in opened menus are
  followed. While tapping, every request that would write (`POST`, `PUT`,
  `PATCH`, `DELETE`) is blocked, buttons and links that log out are never
  tapped, and `data-ghostly-skip` keeps it away from anything else.
- `ghostly measure` measures each breakpoint across all its widths, exact
  to the pixel, from 320px (the smallest phones) up to 1920px. Where the
  layout changes inside a breakpoint (buttons that wrap at 390px, text
  that takes another line), `ghostly.json` gets another entry from that
  width on, e.g. `"base@390"`, and the skeleton switches there too.
- Skeletons measured by `ghostly measure` follow the window like the
  content in between: a `flex-1` column, a button pushed to the right edge
  or a chart with an aspect ratio grow and move exactly like it (stored as
  `widthCalc`, `xCalc`, `heightCalc`, ... and drawn with `calc()` and
  container units).
- The windows of one page run side by side, each with its own browser
  profile, so what a tap stores (a theme, a collapsed sidebar) doesn't
  change the other measurements.
- New playgrounds: test pages that show `ghostly measure` getting every
  kind of layout and tap right. Each part names the case it tests. An
  overview with a sidebar, cards on three pages with other content each,
  filters and a summary that is a sidebar or a sheet, collections as a
  grid or a list and a detail page per collection, charts, account
  settings behind a pretend login, a sign-in and an admin page only the
  footer links to, real async loading and over 40 edge cases. It has tabs,
  menus, popovers, dialogs (one opens by its URL, `?item=5`), an
  accordion, buttons that log out or write, and a part marked
  `data-ghostly-skip`. The Next.js and the Vite playground share the same
  components and pages.
- E2E tests first run `ghostly measure` against both playgrounds (with
  `--cookie`), then check every page and every state a tap reaches
  against what it measured: on a phone, and in a desktop window resized
  from 320 to 1920px, at each breakpoint and at widths inside them. Each
  state loads once, so the whole run takes a few minutes.

### Changed

- `ghostly measure` builds `ghostly.json` anew on every run instead of
  merging into it: ghosts no page showed anymore (renamed, deleted) are
  removed, and no old measurement stays next to the new ones. A broken
  `ghostly.json` (merge conflict markers), which the app can't import, is
  emptied first, so the app loads again, and then measured anew. Before,
  it was an error.
- A `<Ghost>` that shows other data on several pages (the header on the
  page of each group) keeps the measurement of the first page measured,
  not of the last. So a new page doesn't change its skeleton.

### Removed

- `ghostly dev` and its collector on port 6767. `ghostly measure` reaches
  everything it was needed for. `<Ghost>` no longer sends requests in dev
  mode, so the console hint about a missing `ghostly dev` is gone too.
  Measure again with `ghostly measure` once.
- The options `--pages`, `--prune`, `--max-pages`, `--max-taps` and
  `--wait` of `ghostly measure`. It reaches every page a link points to
  and every `<Ghost>` behind a tap on its own, and builds `ghostly.json`
  anew each time, so `--cookie` is the only option left. Link to a page
  no link pointed to yet, e.g. from the footer. Only apps without an end
  are stopped: after 1000 pages, and after 500 taps per page and window.
- `hideClass` from `ghostlyjs/core`. Variants are hidden with
  `fromClass` / `toClass` now, and `variantsOf` returns `from` and `to`
  widths instead of range indexes.

### Fixed

- A `<Ghost>` that a tap starts loading is waited for, also when it
  loads without a request and without changing the page (a timer, a
  cache, a worker). Before, the tap counted as done right away, and a
  `<Ghost>` behind the last tab or a button in a dialog was never
  measured.
- Buttons that a view switch without a URL change removed (tabs that
  swap the content, a wizard) are tapped too: the page is loaded again
  to reach them. Before, everything after the switch was never tapped.
- Checkboxes and radios without text of their own are told apart by
  their `<label>`. Before, all of them looked the same, and only the
  first one was tapped.
- A tap that navigates while the page is read (a form that posts, which
  is blocked and shows an error page) no longer fails the whole page with
  "Execution context was destroyed".
- The routes of a hash router (`#/orders`, `#!/orders`) are measured as
  pages. Before, their links counted as a place on the same page, and
  only the start page was measured, without a warning. `#top` still
  stays on the page.
- A tap that only changes the query of the URL, like a dialog that keeps
  its state in `?item=3`, is measured on the same page. Before,
  `ghostly measure` measured it as a page of its own and reported the
  dialog's `<Ghost>` as never shown on the page it opened from.
- Links to a place on the same page (`#top`) are no longer measured as
  pages. After a tap that added a query, they counted as a page of their
  own.
- "Not measured everywhere" no longer counts a `<Ghost>` another page
  measured, like one in a menu that a dialog covers on one page.
- A `<Ghost>` that is hidden at a width (a sidebar below `lg`) and shows
  under the same name elsewhere after a tap (the same summary in a sheet)
  is measured where it shows. Before, the hidden one was measured with no
  size, and its skeleton was missing in the sheet.
- Text that fills its line at one width and keeps its width after that
  (a plain sentence that just fits) no longer stretches its skeleton to the
  full width of a wider parent.
- Skeletons of content that fills its parent (cards, tables, headings in a
  block) fill it too, also when it is wider than when measured. Before,
  they kept the measured width, so on a phone wider than the measured
  375px they were shorter than the content. `ghostly.json` stores this as
  `fill`; measure again to get it.
- Skeletons of other content have the measured width as a real width
  instead of `width: 100%`. A parent sized by its content (`w-auto`,
  `inline-flex`, a toolbar) now makes room for the skeleton like for the
  content. Before, it counted as 0px there, so the toolbar got narrower,
  wrapped and moved the page below it.
- Text pieces of one line in different sizes keep their own bars. Before,
  a piece left of a bigger one that sits a bit higher (a name next to a
  score in a table row) was joined into it and vanished from the skeleton.
- Elements hidden for screen readers only (`sr-only`, `clip-path:
  inset(50%)` or `clip: rect(0 0 0 0)`) are no longer drawn, like a hidden
  file input over an avatar.
- Cards and other large boxes stretch with the skeleton like text lines.
  Before, a box that wasn't clearly wider than high kept its measured
  width, so in a wider skeleton the content of a card stuck out of it.
  Only circles and small boxes (icons, up to 64px) keep their size now.

## [0.2.0] - 2026-11-16

### Added

- `--cookie name=value` option for `ghostly measure`: sends the cookie with
  every page, so pages behind a login (e.g. a session cookie) are measured
  too instead of only the login page they redirect to. Repeat it for more
  cookies; the value may contain `=`. ([#36])

## [0.1.0] - 2026-11-15

### Added

- `<Ghost>` component: shows its children once `isLoading` is false,
  otherwise a skeleton built from the measurement stored under its `name`.
  ([#14], [#15])
- `<GhostlyProvider>` passes the measurements from `ghostly.json` to every
  `<Ghost>` in the app. ([#14])
- `count` prop on `<Ghost>` for lists: only the first item is measured and
  the skeleton repeats it `count` times, or as often as there were items
  when measured (`count` without a value). Works while the data is still
  missing, and the list's gap and grid apply to the skeletons. The
  playgrounds use it for the team grid and the posts that load for real.
  ([#25])
- `data-ghost` attribute with the name on the content wrapper and the
  skeletons, to find a `<Ghost>` in the browser's dev tools. ([#25])
- Responsive skeletons: a `<Ghost>` is measured once per breakpoint
  (Tailwind's by default, others with the `breakpoints` prop of
  `<GhostlyProvider>`), and CSS media queries show the skeleton for the
  current window width. The server renders the same HTML as the browser,
  so there are no hydration errors. A breakpoint that was never measured
  uses the next smaller measured one. ([#26])
- Measuring in dev mode: `<Ghost>` measures the real rendered content (text
  lines, surfaces, images, icons, form controls, Shadow DOM) instead of
  using predefined variants. Production builds don't measure. ([#15])
- Skeletons draw the measured boxes, adapt to the available width and work
  in light and dark mode. ([#16], [#17])
- `ghostly dev` command: a local collector that receives the measurements
  from the browser and writes them to `ghostly.json`. Its output shows the
  logo, each update with the time, and a clear message when the port is
  already in use (e.g. by a second `ghostly dev`). When it isn't running,
  the browser console shows one hint per page load how to save the
  measurements. ([#17], [#31])
- `ghostly measure <url>` command: opens every page of the running app in a
  headless browser at every breakpoint, waits until each `<Ghost>` shows
  its content and writes the measurements to `ghostly.json`. So nobody has
  to resize the window or click through the pages by hand. It follows the
  app's links (`--pages` adds others), reports each `<Ghost>` that never
  showed its content, and `--prune` removes ghosts no page showed. It
  uses the installed Chrome or Edge, so nothing has to be downloaded
  (`playwright-core` is a dependency of the package, without browsers).
  In a terminal, a spinner shows the page, a bar of its breakpoints and
  how many pages are known so far. A production build is reported right
  away instead of after visiting every page: `<GhostlyProvider>` marks dev
  mode (`data-ghostly-dev` on its style tag). Ctrl+C ends with a closing
  line. ([#27], [#31])
- Output of the `ghostly` commands with `@clack/prompts`: the logo, colors
  (only in a terminal and without `NO_COLOR`), one line per step and a
  closing line. Problems the user can fix, like a missing URL, an unknown
  option or a broken `ghostly.json` (e.g. after a merge conflict), are a
  short message instead of a stack trace; a broken file is reported
  before measuring and never overwritten. `ghostly --help` and
  `ghostly --version` (also `-h` and `-v`). ([#31])
- `isMeasuring()`: true in the browser of `ghostly measure`, for content
  that only shows after a click (the playgrounds' loading toggle). ([#27])
- The package names Node 20.12 as the minimum (`engines`), the version
  `@clack/prompts` needs for the output of the commands. So npm warns on
  install instead of the command failing later. Bun ignores `engines`;
  both commands also run with Bun 1.1.11 or newer. ([#28], [#31], [#34])
- A single placeholder bar for a `<Ghost>` that was never measured. ([#19])
- Pulse animation on skeletons, turned off when the user prefers reduced
  motion. `<GhostlyProvider>` adds the styles, so no stylesheet needs to
  be imported. ([#21])
- Package entries: `ghostlyjs` (React), `ghostlyjs/core` and the `ghostly`
  command, built with tsdown. ([#13]) The entries also load with
  `require()` in Node versions that can require ES modules (20.19+,
  22.12+). ([#31]) The package contains the README and the license, so
  npm shows them. ([#34])
- Logo: a smiling, floating ghost whose eyes blink (not with reduced
  motion). Shown at the top of the README, from an absolute URL so it
  also shows on npm. ([#20], [#30])
- Next.js playground with pages for common layouts, real async loading,
  edge cases and a light/dark toggle. ([#14], [#18], [#20], [#21])
- Vite playground with the same pages on React 18.0.0, the oldest React
  the package supports. ([#23])
- The playgrounds are responsive at every Tailwind breakpoint (`sm` to
  `2xl`): each page changes its layout, and the content gets wider at each
  one, so every breakpoint has its own measurement to test. The nav shows
  the current breakpoint. ([#29])
- Unit tests with Vitest for the measuring code, `<Ghost>` and
  `<GhostlyProvider>` (in dev mode and in production) and the
  `ghostly dev` collector. The browser parts run in Chromium, because the
  measuring reads the real layout. ([#24])
- E2E tests with Playwright: in both playgrounds, at a phone width and the
  smallest width of every breakpoint, each skeleton must cover the same area as its content, box by
  box, also on the page that loads for real. Unit and e2e tests run in CI.
  ([#24], [#26], [#29])
- Linting and formatting with oxlint and oxfmt, CI checks, PR template and
  Dependabot. ([#4], [#5], [#9], [#11])
- README with the requirements, installation, a quick start for Next.js
  and Vite with both commands and their options, the usage of `<Ghost>`
  (lists, Suspense, breakpoints), styling and troubleshooting. ([#34])
- MIT license and security policy. ([#7], [#12])

### Changed

- `ghostly.json` stores the measurements of each `<Ghost>` per breakpoint:
  `{ "name": { "xl": { ... } } }` instead of `{ "name": { ... } }`. Files
  from before have to be measured again. ([#26])

### Fixed

- `<Ghost>` measures again when a web font arrives after its content
  showed, so text isn't measured with the fallback font. ([#27])
- More accurate skeletons: centered and right-aligned content, height of
  text-only content, divider borders no longer drawn as surfaces, text
  split into pieces joined per line, no text bars inside filled circles,
  overflow clipping (`truncate`, `line-clamp`, scroll areas), rotated and
  scaled elements, inline images and rounded icons. ([#19])
- Text bars of lines below each other no longer overlap (headings with a
  tight `line-height` like `leading-none`) or touch (the usual line
  heights): each bar takes 80% of its line, so a gap stays like between
  the letters. ([#33])
- The placeholder package can be published to npm. ([#3])

### Removed

- The unfinished `ghostly generate` command. `ghostly dev` already writes
  the measurements to `ghostly.json`. ([#22])

## [0.0.1] - 2026-11-13

### Added

- Placeholder package `ghostlyjs` on npm to reserve the name. Not usable yet.
  ([#1], [#2])

[Unreleased]: https://github.com/justintischendorf/ghostlyjs/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/justintischendorf/ghostlyjs/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/justintischendorf/ghostlyjs/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/justintischendorf/ghostlyjs/releases/tag/v0.0.1
[#1]: https://github.com/justintischendorf/ghostlyjs/pull/1
[#2]: https://github.com/justintischendorf/ghostlyjs/pull/2
[#3]: https://github.com/justintischendorf/ghostlyjs/pull/3
[#4]: https://github.com/justintischendorf/ghostlyjs/pull/4
[#5]: https://github.com/justintischendorf/ghostlyjs/pull/5
[#7]: https://github.com/justintischendorf/ghostlyjs/pull/7
[#9]: https://github.com/justintischendorf/ghostlyjs/pull/9
[#11]: https://github.com/justintischendorf/ghostlyjs/pull/11
[#12]: https://github.com/justintischendorf/ghostlyjs/pull/12
[#13]: https://github.com/justintischendorf/ghostlyjs/pull/13
[#14]: https://github.com/justintischendorf/ghostlyjs/pull/14
[#15]: https://github.com/justintischendorf/ghostlyjs/pull/15
[#16]: https://github.com/justintischendorf/ghostlyjs/pull/16
[#17]: https://github.com/justintischendorf/ghostlyjs/pull/17
[#18]: https://github.com/justintischendorf/ghostlyjs/pull/18
[#19]: https://github.com/justintischendorf/ghostlyjs/pull/19
[#20]: https://github.com/justintischendorf/ghostlyjs/pull/20
[#21]: https://github.com/justintischendorf/ghostlyjs/pull/21
[#22]: https://github.com/justintischendorf/ghostlyjs/pull/22
[#23]: https://github.com/justintischendorf/ghostlyjs/pull/23
[#24]: https://github.com/justintischendorf/ghostlyjs/pull/24
[#25]: https://github.com/justintischendorf/ghostlyjs/pull/25
[#26]: https://github.com/justintischendorf/ghostlyjs/pull/26
[#27]: https://github.com/justintischendorf/ghostlyjs/pull/27
[#28]: https://github.com/justintischendorf/ghostlyjs/pull/28
[#29]: https://github.com/justintischendorf/ghostlyjs/pull/29
[#30]: https://github.com/justintischendorf/ghostlyjs/pull/30
[#31]: https://github.com/justintischendorf/ghostlyjs/pull/31
[#33]: https://github.com/justintischendorf/ghostlyjs/pull/33
[#34]: https://github.com/justintischendorf/ghostlyjs/pull/34
[#36]: https://github.com/justintischendorf/ghostlyjs/pull/36
