// Made-up sample data for the playground pages. Only there to fill the
// layouts that `ghostly measure` has to get right. Same file in both
// playgrounds.

export type Person = {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  score: number;
  // Places up (+) or down (-) since last week.
  change: number;
  done: number;
  open: number;
};

export const people: Person[] = [
  {
    id: "ada",
    name: "Ada Lovelace",
    initials: "AL",
    color: "#a78bfa",
    role: "Engineer",
    score: 142,
    change: 2,
    done: 9,
    open: 31,
  },
  {
    id: "grace",
    name: "Grace Hopper",
    initials: "GH",
    color: "#f472b6",
    role: "Admiral",
    score: 138,
    change: -1,
    done: 8,
    open: 30,
  },
  {
    id: "alan",
    name: "Alan Turing",
    initials: "AT",
    color: "#60a5fa",
    role: "Mathematician",
    score: 131,
    change: 0,
    done: 7,
    open: 29,
  },
  {
    id: "margaret",
    name: "Margaret Hamilton",
    initials: "MH",
    color: "#34d399",
    role: "Lead developer",
    score: 127,
    change: 3,
    done: 6,
    open: 30,
  },
  {
    id: "linus",
    name: "Linus Torvalds",
    initials: "LT",
    color: "#fbbf24",
    role: "Maintainer",
    score: 119,
    change: -2,
    done: 5,
    open: 28,
  },
  {
    id: "katherine",
    name: "Katherine Johnson",
    initials: "KJ",
    color: "#f87171",
    role: "Mathematician",
    score: 104,
    change: -2,
    done: 4,
    open: 24,
  },
];

// The signed-in person.
export const me = people[0]!;

export type CardStatus = "draft" | "active" | "review" | "done";

// The cards of /cards, on three pages (`?page=2`) with other content and a
// different number of cards each.
export type Card = {
  id: string;
  emoji: string;
  title: string;
  excerpt: string;
  owner: string;
  tags: string[];
  status: CardStatus;
  // Percent done.
  progress: number;
  due: string;
  place: string;
  comments: number;
  // In the summary.
  pinned?: true;
};

export const cardPages: Card[][] = [
  [
    {
      id: "1",
      emoji: "📏",
      title: "Measure the header",
      excerpt:
        "The logo, the links and the buttons on the right, at every width.",
      owner: "ada",
      tags: ["layout", "nav"],
      status: "draft",
      progress: 10,
      due: "Mon",
      place: "Berlin",
      comments: 3,
      pinned: true,
    },
    {
      id: "2",
      emoji: "🧱",
      title: "Wrap the sidebar",
      excerpt:
        "Next to the content from lg on, below it on phones and tablets.",
      owner: "alan",
      tags: ["layout"],
      status: "active",
      progress: 45,
      due: "Mon",
      place: "London",
      comments: 0,
    },
    {
      id: "3",
      emoji: "👆",
      title: "Tap every menu",
      excerpt: "Menus, popovers and tabs only show their content after a tap.",
      owner: "linus",
      tags: ["taps", "overlays", "a11y"],
      status: "review",
      progress: 80,
      due: "Tue",
      place: "Helsinki",
      comments: 12,
      pinned: true,
    },
    {
      id: "4",
      emoji: "🔗",
      title: "Follow the links",
      excerpt: "Every link to a page of the same site is a page to measure.",
      owner: "grace",
      tags: ["pages"],
      status: "draft",
      progress: 0,
      due: "Wed",
      place: "New York",
      comments: 1,
    },
    {
      id: "5",
      emoji: "💾",
      title: "Store the widths",
      excerpt: "Only the widths where the layout changes end up in the file.",
      owner: "margaret",
      tags: ["json", "size"],
      status: "done",
      progress: 100,
      due: "Fri",
      place: "Boston",
      comments: 7,
      pinned: true,
    },
    {
      id: "6",
      emoji: "👻",
      title: "Draw the skeleton",
      excerpt: "One bar per line of text, one box per image and per button.",
      owner: "katherine",
      tags: ["render"],
      status: "done",
      progress: 100,
      due: "Fri",
      place: "Hampton",
      comments: 2,
    },
  ],
  [
    {
      id: "7",
      emoji: "🌗",
      title: "Switch the theme while the skeletons show",
      excerpt:
        "Page 2 has other content than page 1: longer titles, more tags and fewer cards. The stored skeletons come from page 1, the fresh ones from this page.",
      owner: "grace",
      tags: ["theme", "colors", "dark mode", "tokens"],
      status: "active",
      progress: 30,
      due: "Next week",
      place: "Arlington",
      comments: 21,
    },
    {
      id: "8",
      emoji: "🌍",
      title: "Right to left",
      excerpt: "Short text.",
      owner: "alan",
      tags: ["i18n"],
      status: "review",
      progress: 65,
      due: "Thu",
      place: "Manchester",
      comments: 4,
      pinned: true,
    },
    {
      id: "9",
      emoji: "🖼️",
      title: "Images that load late",
      excerpt:
        "The image keeps its aspect ratio, so the box is right before the image is there.",
      owner: "margaret",
      tags: ["media", "aspect ratio"],
      status: "draft",
      progress: 5,
      due: "Sat",
      place: "Cambridge",
      comments: 0,
    },
    {
      id: "10",
      emoji: "📱",
      title: "Phones of every size",
      excerpt: "From 320 to 767 pixels: four columns become two, then one.",
      owner: "ada",
      tags: ["breakpoints", "mobile", "sm"],
      status: "done",
      progress: 100,
      due: "Sun",
      place: "London",
      comments: 9,
    },
  ],
  [
    {
      id: "11",
      emoji: "⏳",
      title: "Data that loads in useEffect",
      excerpt:
        "The last page: only two cards. A list measured with six items shows two skeletons here when they are measured fresh.",
      owner: "linus",
      tags: ["async"],
      status: "review",
      progress: 90,
      due: "Today",
      place: "Portland",
      comments: 15,
    },
    {
      id: "12",
      emoji: "🧪",
      title: "Edge cases",
      excerpt:
        "Transforms, contents, iframes, canvas and more, on their own page.",
      owner: "katherine",
      tags: ["tests", "edge cases"],
      status: "active",
      progress: 55,
      due: "Tomorrow",
      place: "Hampton",
      comments: 6,
    },
  ],
];

export const cards: Card[] = cardPages.flat();

export type Collection = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  items: number;
  rank: number;
  private: boolean;
};

export const collections: Collection[] = [
  {
    id: "1",
    name: "Layouts",
    emoji: "📐",
    description: "Grids, flex rows and columns that change per breakpoint.",
    items: 18,
    rank: 1,
    private: true,
  },
  {
    id: "2",
    name: "Overlays",
    emoji: "🪟",
    description: "Dialogs, menus and sheets.",
    items: 7,
    rank: 3,
    private: false,
  },
  {
    id: "3",
    name: "Charts",
    emoji: "📈",
    description:
      "Bars, lines, donuts and grids of squares. A longer description that wraps over more lines than the others, so the cards differ in height.",
    items: 42,
    rank: 12,
    private: false,
  },
];

// One more, shown after "Load more". Each collection has its own detail
// page, all measured: few of them keep `ghostly measure` fast.
export const moreCollections: Collection[] = [
  {
    id: "4",
    name: "Forms",
    emoji: "📝",
    description: "Inputs, switches and radio cards.",
    items: 9,
    rank: 4,
    private: true,
  },
];

export const stats = [
  { label: "Pages", value: "11", hint: "and one only --pages finds" },
  { label: "Ghosts", value: "80+", hint: "on every page" },
  { label: "Breakpoints", value: "6", hint: "from 320 to 1920px" },
  { label: "Edge cases", value: "45", hint: "on their own page" },
];

// Values for the charts.
export const monthly = [8, 12, 5, 14, 9, 11, 16, 7, 13, 10, 15, 12];
export const weekly = [3, 5, 4, 0, 6, 2, 4];

export type Activity = { id: string; who: string; text: string; time: string };

export const activities: Activity[] = [
  {
    id: "a1",
    who: "Grace Hopper",
    text: "opened a dialog",
    time: "2 min",
  },
  {
    id: "a2",
    who: "Alan Turing",
    text: "switched to the list view",
    time: "1 h",
  },
  {
    id: "a3",
    who: "Margaret Hamilton",
    text: "resized the window from 320 to 1920 pixels, and every skeleton followed the content all the way.",
    time: "Yesterday",
  },
  {
    id: "a4",
    who: "Linus Torvalds",
    text: "changed the theme",
    time: "Mon",
  },
];

export type Message = { id: string; from: string; text: string; time: string };

export const messages: Message[] = [
  {
    id: "m1",
    from: "grace",
    text: "Messages from others sit on the left.",
    time: "09:12",
  },
  {
    id: "m2",
    from: "alan",
    text: "Each one is as wide as its text, up to a limit.",
    time: "09:15",
  },
  {
    id: "m3",
    from: "ada",
    text: "Own messages sit on the right.",
    time: "09:16",
  },
  {
    id: "m4",
    from: "margaret",
    text: "A long message wraps over several lines, and where it wraps changes with the window width, so the skeleton gets another measurement at each width where a word moves to the next line.",
    time: "10:02",
  },
  { id: "m5", from: "ada", text: "👍", time: "10:03" },
];

export type Notification = {
  id: string;
  title: string;
  text: string;
  time: string;
  unread: boolean;
};

export const notifications: Notification[] = [
  {
    id: "n1",
    title: "Inside a popover",
    text: "This list only shows after a tap on the bell.",
    time: "10 min",
    unread: true,
  },
  {
    id: "n2",
    title: "A list with count",
    text: "The skeleton repeats the first item.",
    time: "Yesterday",
    unread: true,
  },
  {
    id: "n3",
    title: "Read",
    text: "No dot in front of this one.",
    time: "Mon",
    unread: false,
  },
];

export const sessions = [
  { id: "s1", device: "MacBook Pro", place: "Berlin", current: true },
  { id: "s2", device: "iPhone 17", place: "Berlin", current: false },
  { id: "s3", device: "Firefox on Windows", place: "Hamburg", current: false },
];

// A cell of the matrix: good, okay, bad or empty.
export type CellResult = "good" | "okay" | "bad" | "empty";

// A matrix of people × the cards of the first page, row by row.
export const matrix: { person: string; cells: [string, CellResult][] }[] =
  people.map((person, row) => ({
    person: person.id,
    cells: cardPages[0]!.map((card, column) => {
      const results: CellResult[] = ["good", "okay", "bad", "okay"];
      return card.status === "draft" || card.status === "active"
        ? ["–", "empty"]
        : [
            `${(row + column) % 4}:${(row * 2 + column) % 3}`,
            results[(row + column) % results.length]!,
          ];
    }),
  }));

export const jobs = [
  { id: "j1", name: "Open every page", progress: 100, state: "Done" },
  { id: "j2", name: "Tap every button", progress: 64, state: "Running" },
  { id: "j3", name: "Write ghostly.json", progress: 0, state: "Queued" },
];

export const log = [
  "[10:00:01] pages: 11 found by following the links, 1 added with --pages",
  "[10:00:02] taps: 37 on /cards, the dialog of ?item=5 measured on the same page",
  "[10:00:05] widths: 320 to 1920, exact to the pixel where the layout changes",
  "[10:00:09] note: a line this long doesn't wrap, the block scrolls sideways instead of getting wider",
];
