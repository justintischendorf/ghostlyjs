<div align="center">

<img src="https://raw.githubusercontent.com/justintischendorf/ghostlyjs/main/assets/logo.svg" width="128" alt="" />

<h1>GhostlyJs</h1>

<p>
  <strong>Skeleton loaders for React that measure your real UI.</strong>
  <br />
  No more hand-written skeletons.
</p>

</div>

Wrap a component in `<Ghost>`, open your app in dev mode, and GhostlyJs
measures what is really on the screen: every text line, image, icon, button
and card, at every breakpoint. While your data loads, it draws a skeleton
with exactly that shape. When the design changes, measure again instead of
rewriting skeletons by hand.

```tsx
<Ghost name="profile" isLoading={isLoading}>
  <ProfileCard user={user} />
</Ghost>
```

<img src="https://raw.githubusercontent.com/justintischendorf/ghostlyjs/main/assets/divider.svg" width="100%" alt="" />

## 📋 Requirements

| What              | Version                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------ |
| React             | 18 or newer                                                                                |
| `ghostly` CLI     | Node.js 20.12 or newer, or Bun 1.1.11 or newer                                             |
| `ghostly measure` | An installed Chrome or Edge, or a browser download (see [below](#no-chrome-or-edge-found)) |

> [!NOTE]
> Next.js, Vite and any other React setup work. The commands only
> talk to apps running on `localhost`.

<img src="https://raw.githubusercontent.com/justintischendorf/ghostlyjs/main/assets/divider.svg" width="100%" alt="" />

## 📦 Installation

```bash
npm install ghostlyjs
```

```bash
pnpm add ghostlyjs
```

```bash
yarn add ghostlyjs
```

```bash
bun add ghostlyjs
```

<img src="https://raw.githubusercontent.com/justintischendorf/ghostlyjs/main/assets/divider.svg" width="100%" alt="" />

## 🚀 Quick start

### 1. Create `ghostly.json`

The measurements live in `ghostly.json` next to your `package.json`. Create
it empty, so your app can import it before anything was measured:

```bash
echo {} > ghostly.json
```

### 2. Add the provider

Wrap your app once in `<GhostlyProvider>` and pass it the measurements.

**Next.js (App Router)**: `app/layout.tsx`. The provider is a client
component, so it can sit in your server layout.

```tsx
import { GhostlyProvider } from "ghostlyjs";
import type { ReactNode } from "react";

import data from "../ghostly.json";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GhostlyProvider data={data}>{children}</GhostlyProvider>
      </body>
    </html>
  );
}
```

**Vite and other setups**: around your app, e.g. in `src/main.tsx`.

```tsx
import { GhostlyProvider } from "ghostlyjs";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import data from "../ghostly.json";
import App from "./app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GhostlyProvider data={data}>
      <App />
    </GhostlyProvider>
  </StrictMode>,
);
```

> [!TIP]
> Importing JSON needs `"resolveJsonModule": true` in your `tsconfig.json`.
> Next.js and Vite set it by default.

### 3. Wrap what loads

Wrap each part of the UI that waits for data in a `<Ghost>` with a unique
`name`:

```tsx
import { Ghost } from "ghostlyjs";

export function Profile() {
  const { user, isLoading } = useUser();

  return (
    <Ghost name="profile" isLoading={isLoading}>
      <div className="flex items-center gap-4">
        <img src={user?.avatar} alt="" className="size-12 rounded-full" />
        <div>
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.role}</p>
        </div>
      </div>
    </Ghost>
  );
}
```

### 4. Measure

Start your app in **dev mode** (e.g. `npm run dev`), then run a command
from the folder with your `package.json`. Both write `ghostly.json`.

**`ghostly measure <url>`** opens every page in a headless browser at every
breakpoint (at its smallest width), follows your app's links and waits
until each `<Ghost>` shows its content.

```bash
npx ghostly measure http://localhost:3000
```

| Option                | Default | What it does                                                                                |
| --------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `--pages /a,/b`       |         | Also measures pages no link points to.                                                      |
| `--prune`             | off     | Removes ghosts no page showed, e.g. renamed or deleted ones.                                |
| `--max-pages <n>`     | `50`    | Follows links to at most `n` pages.                                                         |
| `--wait <ms>`         | `3000`  | How long a page may stay quiet before a `<Ghost>` that still loads counts as never loading. |
| `--cookie name=value` |         | Sends a cookie with every page, e.g. your login session. Repeat it for more cookies.        |

For pages behind a login, copy your session cookie from the browser's dev
tools (Application → Cookies) and pass it with `--cookie`:

```bash
npx ghostly measure http://localhost:3000/dashboard --cookie "session=..."
```

**`ghostly dev`** saves measurements while you use the app, for content
`ghostly measure` can't reach, like behind a click. It measures
at your window width; resize the window for other breakpoints.

```bash
npx ghostly dev
```

> [!IMPORTANT]
> Only `--prune` removes measurements. Run
> `ghostly measure --prune` first, then add the rest with `ghostly dev`.

Reload the page: while `isLoading` is `true`, each `<Ghost>` shows its
skeleton. `npx ghostly --help` lists all commands and options.

<img src="https://raw.githubusercontent.com/justintischendorf/ghostlyjs/main/assets/divider.svg" width="100%" alt="" />

## 🧩 Usage

### Wrapping components

```tsx
<Ghost name="order-summary" isLoading={isLoading}>
  <OrderSummary order={order} />
</Ghost>
```

- **`name`** is the key in `ghostly.json`. Use one name per piece of UI.
  Two `<Ghost>`s with the same name share one measurement, which is fine
  when they show the same thing.
- **`isLoading`**: `true` shows the skeleton, `false` the children.
- **Wrap the content itself**, not a component that renders its own
  loading state. The `<Ghost>` measures exactly what it wraps.

> [!NOTE]
> A `<Ghost>` that was never measured shows a single placeholder bar, so the
> user still sees that something loads.

### Lists with `count`

For lists, put the `<Ghost>` **inside** the list's container and pass
`count`. Only the first item is measured, and the skeleton repeats it. The
container's grid and gap apply to the skeletons like to the real items.

```tsx
<ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  <Ghost name="posts" isLoading={isLoading} count={6}>
    {posts.map((post) => (
      <li key={post.id} className="rounded-2xl border p-4">
        <h3 className="font-semibold">{post.title}</h3>
        <p className="text-gray-500">{post.excerpt}</p>
      </li>
    ))}
  </Ghost>
</ul>
```

| `count`            | Skeletons shown                                   |
| ------------------ | ------------------------------------------------- |
| `count={6}`        | Always 6.                                         |
| `count` (no value) | As many as there were items when it was measured. |
| left out           | Not a list: the whole content is one skeleton.    |

### Suspense and server components

A `<Ghost>` can be the fallback of a `<Suspense>`. Give the fallback and
the content the same `name`: the content is measured, the fallback shows
its skeleton.

```tsx
import { Ghost } from "ghostlyjs";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense
      fallback={
        <Ghost name="profile" isLoading>
          {null}
        </Ghost>
      }
    >
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  const user = await getUser();
  return (
    <Ghost name="profile" isLoading={false}>
      <ProfileCard user={user} />
    </Ghost>
  );
}
```

### Breakpoints

Layouts change with the window width, so a `<Ghost>` is measured once per
breakpoint.

The default breakpoints are Tailwind's:

| Name   | From    |
| ------ | ------- |
| `base` | 0 px    |
| `sm`   | 640 px  |
| `md`   | 768 px  |
| `lg`   | 1024 px |
| `xl`   | 1280 px |
| `2xl`  | 1536 px |

If your CSS uses other widths, pass them to the provider. The names are up
to you; below the smallest one is always `base`.

```tsx
<GhostlyProvider data={data} breakpoints={{ tablet: 700, desktop: 1100 }}>
  {children}
</GhostlyProvider>
```

> [!NOTE]
> A breakpoint that was never measured uses the next smaller measured one.
> After changing the breakpoints, measure again.

> [!TIP]
> `ghostly measure` doesn't click. Content that only shows after a click (a
> tab, a dialog, a "load more" button) isn't measured by it. Either measure
> it by hand with [`ghostly dev`](#4-measure), or show it right away while
> measuring.

### Types

```ts
import type { GhostProps, GhostlyProviderProps } from "ghostlyjs";
import type { Breakpoints, GhostlyData } from "ghostlyjs/core";
```

<img src="https://raw.githubusercontent.com/justintischendorf/ghostlyjs/main/assets/divider.svg" width="100%" alt="" />

## 🎨 Styling

The skeletons use your text color at 10% opacity, so they fit light and
dark mode without configuration. To change their look, style these classes
in your own CSS:

| Class                  | Element                                             |
| ---------------------- | --------------------------------------------------- |
| `.ghostly-skeleton`    | The frame of one skeleton. Pulses.                  |
| `.ghostly-box`         | One shape inside it: a text line, an image, a card. |
| `.ghostly-placeholder` | The bar of a `<Ghost>` never measured.              |

```css
.ghostly-box,
.ghostly-placeholder {
  background-color: rgb(148 163 184 / 0.2);
}
```

> [!NOTE]
> The pulse is turned off when the user prefers reduced motion.

<img src="https://raw.githubusercontent.com/justintischendorf/ghostlyjs/main/assets/divider.svg" width="100%" alt="" />

## 🩺 Troubleshooting

#### A `<Ghost>` shows a single grey bar

It was never measured. Run `ghostly measure`, or open the page with
`ghostly dev` running. If `ghostly measure` reports that it never showed
its content, it loads too slowly (raise `--wait`) or only after a click
(use [`isMeasuring()`](#content-behind-a-click-with-ismeasuring) or
`ghostly dev`).

#### "This is a production build"

`<Ghost>` only measures in dev mode. Point `ghostly measure` at your dev
server (`npm run dev`), not at `npm run build && npm start`.

#### "Port 6767 is in use"

Another `ghostly dev` is already running, e.g. in another terminal. Stop it
or use that one.

#### "No Chrome or Edge found"

`ghostly measure` uses your installed Chrome or Edge. Without one, download
a browser for it once (about 200 MB):

```bash
npx playwright-core install chromium-headless-shell
```

#### "ghostly.json is broken"

Usually a merge conflict. Fix the file, or delete it, create an empty one
(`{}`) and measure again.

#### The skeleton doesn't match after a design change

Measure again. `ghostly.json` only knows the layout from when it was
measured.

<img src="https://raw.githubusercontent.com/justintischendorf/ghostlyjs/main/assets/divider.svg" width="100%" alt="" />

## 📄 License

[MIT](https://github.com/justintischendorf/ghostlyjs/blob/main/LICENSE)
