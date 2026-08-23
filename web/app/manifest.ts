import type { MetadataRoute } from "next";

// Full offline/installable behavior (service worker, icon set, install
// prompts) comes in Stage 8/10 — this just registers the manifest now so
// it isn't retrofitted later. See docs/02-feature-list.md §24.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "School Management System",
    short_name: "SMS",
    description:
      "School Management System for one secondary school in Lagos, Nigeria.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc", // --background, prompts/00-DESIGN-SYSTEM.md §2
    theme_color: "#4f46e5", // --primary, prompts/00-DESIGN-SYSTEM.md §2
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
