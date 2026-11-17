import { collections, moreCollections } from "@/lib/data";
import CollectionScreen from "@/screens/collection";

// The nav reads the path, which isn't known before the request for a
// dynamic route: this page may block a navigation for a moment.
export const instant = false;

// Every collection is known, so each page can be rendered ahead of time.
export function generateStaticParams() {
  return [...collections, ...moreCollections].map((item) => ({ id: item.id }));
}

export default async function CollectionPage({
  params,
}: PageProps<"/collections/[id]">) {
  const { id } = await params;
  return <CollectionScreen id={id} />;
}
