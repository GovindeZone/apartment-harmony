import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/department-integration")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        (await import("@/lib/department-integrations.server")).handleIntegration(request),
      PUT: async ({ request }) =>
        (await import("@/lib/department-integrations.server")).handleIntegration(request),
    },
  },
});
