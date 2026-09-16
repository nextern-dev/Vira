import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vira — Personal Expense Tracker",
    short_name: "Vira",
    description:
      "Private, precise expense tracking: income, expenses, categories, budgets and analytics — built by Nextern.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b0f17",
    theme_color: "#080809",
    icons: [
      {
        src: "/brand/vira-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
