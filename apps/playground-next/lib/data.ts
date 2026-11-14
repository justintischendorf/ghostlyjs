// Made-up data for the playground pages.

export const members = [
  { name: "Ada Lovelace", role: "Engineer", initials: "AL" },
  { name: "Grace Hopper", role: "Admiral", initials: "GH" },
  { name: "Alan Turing", role: "Mathematician", initials: "AT" },
  { name: "Margaret Hamilton", role: "Lead developer", initials: "MH" },
  { name: "Linus Torvalds", role: "Maintainer", initials: "LT" },
  { name: "Katherine Johnson", role: "Mathematician", initials: "KJ" },
];

export const posts = [
  {
    author: "Ada Lovelace",
    time: "2 min ago",
    text: "Just shipped skeletons that measure themselves. No more hand-written loading states.",
    image: true,
  },
  {
    author: "Grace Hopper",
    time: "1 h ago",
    text: "A short post.",
    image: false,
  },
  {
    author: "Alan Turing",
    time: "Yesterday",
    text: "A much longer post that wraps over several lines, so the skeleton has to draw one box per line of text. Resize the window and compare how the lines break in the content and in the skeleton.",
    image: false,
  },
];

export const stats = [
  { label: "Revenue", value: "$48,210", change: "+12.4%" },
  { label: "Orders", value: "1,284", change: "+3.1%" },
  { label: "Customers", value: "892", change: "-0.8%" },
  { label: "Refunds", value: "14", change: "+2" },
];

export const sales = [40, 65, 30, 80, 55, 90, 70, 45, 60, 85, 50, 75];

export const orders = [
  { id: "#1042", customer: "Ada Lovelace", status: "Paid", total: "$120.00" },
  { id: "#1041", customer: "Grace Hopper", status: "Pending", total: "$64.50" },
  { id: "#1040", customer: "Alan Turing", status: "Paid", total: "$310.20" },
  {
    id: "#1039",
    customer: "Linus Torvalds",
    status: "Refunded",
    total: "$18.00",
  },
];
