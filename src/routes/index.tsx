import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Ashvale Residency — Apartment Operations" },
      {
        name: "description",
        content:
          "Apartment admin system for staff, security gates, residents, help desk and reports.",
      },
      { property: "og:title", content: "Ashvale Residency — Apartment Operations" },
      {
        property: "og:description",
        content: "Apartment admin system for staff, gates, residents and help desk.",
      },
    ],
  }),
  component: () => null,
});
