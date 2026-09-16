"use client";

import { Analytics } from "@vercel/analytics/next";

const OPT_OUT_KEY = "vira_analytics_opt_out";

export function ViraAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (window.localStorage.getItem(OPT_OUT_KEY) === "1") {
          return null;
        }
        return event;
      }}
    />
  );
}
