// Look of the skeletons. Everything that comes from a measurement (size,
// position, radius) is set inline by <GhostSkeleton>; this holds the rest.
// <GhostlyProvider> adds it to the page once in a <style> tag, so users
// don't need to import a stylesheet.

export const css: string = `
.ghostly-skeleton {
  position: relative;
}

.ghostly-box,
.ghostly-placeholder {
  background-color: color-mix(in srgb, currentColor 10%, transparent);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
}

.ghostly-box {
  position: absolute;
}

.ghostly-placeholder {
  position: relative;
  height: 1.25em;
  border-radius: 4px;
}

.ghostly-skeleton,
.ghostly-placeholder {
  animation: ghostly-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  will-change: opacity;
}

@keyframes ghostly-pulse {
  50% {
    opacity: 0.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ghostly-skeleton,
  .ghostly-placeholder {
    animation: none;
  }
}
`;
