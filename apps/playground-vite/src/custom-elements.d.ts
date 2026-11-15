// Lets TypeScript accept the playground's custom element in JSX.
import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "ghostly-demo-card": React.HTMLAttributes<HTMLElement>;
    }
  }
}
