# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- `data-ghost` attribute with the name on the content wrapper and the
  skeletons, to find a `<Ghost>` in the browser's dev tools.
- Responsive skeletons: a `<Ghost>` is measured once per breakpoint
  (Tailwind's by default, others with the `breakpoints` prop of
  `<GhostlyProvider>`), and CSS media queries show the skeleton for the
  current window width. The server renders the same HTML as the browser,
  so there are no hydration errors. A breakpoint that was never measured
  uses the next smaller measured one.
- Measuring in dev mode: `<Ghost>` measures the real rendered content (text
  lines, surfaces, images, icons, form controls, Shadow DOM) instead of
  using predefined variants. Production builds don't measure. ([#15])
- Skeletons draw the measured boxes, adapt to the available width and work
  in light and dark mode. ([#16], [#17])
- `ghostly dev` command: a local collector that receives the measurements
  from the browser and writes them to `ghostly.json`. ([#17])
- `ghostly measure <url>` command: opens every page of the running app in a
  headless browser at every breakpoint, waits until each `<Ghost>` shows
  its content and writes the measurements to `ghostly.json`. So nobody has
  to resize the window or click through the pages by hand. It follows the
  app's links (`--pages` adds others), reports each `<Ghost>` that never
  showed its content, and `--prune` removes ghosts no page showed. It
  uses the installed Chrome or Edge, so nothing has to be downloaded
  (`playwright-core` is a dependency of the package, without browsers).
- `isMeasuring()`: true in the browser of `ghostly measure`, for content
  that only shows after a click (the playgrounds' loading toggle).
- The package names Node 20 as the minimum (`engines`), the version
  `playwright-core` needs for `ghostly measure`. So npm warns on install
  instead of the command failing later. Bun ignores `engines`; both
  commands also run with Bun.
- A single placeholder bar for a `<Ghost>` that was never measured. ([#19])
- Pulse animation on skeletons, turned off when the user prefers reduced
  motion. `<GhostlyProvider>` adds the styles, so no stylesheet needs to
  be imported. ([#21])
- Package entries: `ghostlyjs` (React), `ghostlyjs/core` and the `ghostly`
  command, built with tsdown. ([#13])
- Logo. ([#20])
- Next.js playground with pages for common layouts, real async loading,
  edge cases and a light/dark toggle. ([#14], [#18], [#20], [#21])
- Vite playground with the same pages on React 18.0.0, the oldest React
  the package supports. ([#23])
- Unit tests with Vitest for the measuring code, `<Ghost>` and
  `<GhostlyProvider>` (in dev mode and in production) and the
  `ghostly dev` collector. The browser parts run in Chromium, because the
  measuring reads the real layout.
- E2E tests with Playwright: in both playgrounds, at desktop and phone
  width, each skeleton must cover the same area as its content, box by
  box, also on the page that loads for real. Unit and e2e tests run in CI.
- Linting and formatting with oxlint and oxfmt, CI checks, PR template and
  Dependabot. ([#4], [#5], [#9], [#11])
- MIT license and security policy. ([#7], [#12])

### Changed

- `ghostly.json` stores the measurements of each `<Ghost>` per breakpoint:
  `{ "name": { "xl": { ... } } }` instead of `{ "name": { ... } }`. Files
  from before have to be measured again.

### Fixed

- `<Ghost>` measures again when a web font arrives after its content
  showed, so text isn't measured with the fallback font.
- More accurate skeletons: centered and right-aligned content, height of
  text-only content, divider borders no longer drawn as surfaces, text
  split into pieces joined per line, no text bars inside filled circles,
  overflow clipping (`truncate`, `line-clamp`, scroll areas), rotated and
  scaled elements, inline images and rounded icons. ([#19])
- The placeholder package can be published to npm. ([#3])

### Removed

- The unfinished `ghostly generate` command. `ghostly dev` already writes
  the measurements to `ghostly.json`. ([#22])

## [0.0.1] - 2026-11-13

### Added

- Placeholder package `ghostlyjs` on npm to reserve the name. Not usable yet.
  ([#1], [#2])

[Unreleased]: https://github.com/justintischendorf/ghostlyjs/compare/v0.0.1...HEAD
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
