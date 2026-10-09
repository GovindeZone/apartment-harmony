import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Indus Anantya Apartment — Apartment Operations" },
      {
        name: "description",
        content:
          "Apartment admin system for staff, security gates, residents, help desk and reports.",
      },
      { property: "og:title", content: "Indus Anantya Apartment — Apartment Operations" },
      {
        property: "og:description",
        content: "Apartment admin system for staff, gates, residents and help desk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => null,
});
