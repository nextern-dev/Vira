import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { readAppearanceCookie } from "@/lib/auth/appearance-cookie";
import { getCurrentUser } from "@/lib/auth/session";
import "./globals.css";

const siteUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Vira — Personal expense tracker",
    template: "%s · Vira",
  },
  description:
    "Vira is a private, precise expense tracker: log income and spending, organise it by category, set budgets and see exactly where your money goes.",
  applicationName: "Vira",
  creator: "Nextern",
  authors: [{ name: "Nextern" }],
  publisher: "Nextern",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Vira",
    title: "Vira — Personal expense tracker",
    description:
      "Private, precise expense tracking by Nextern: income, expenses, categories, budgets and analytics — all scoped to you.",
    images: [
      {
        url: "/brand/vira-cover.png",
        width: 1200,
        height: 630,
        alt: "Vira — personal expense tracker by Nextern",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vira — Personal expense tracker",
    description:
      "Private, precise expense tracking by Nextern: income, expenses, categories, budgets and analytics — all scoped to you.",
    images: ["/brand/vira-cover.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f17" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

/** Resolves only system mode before paint; palette and explicit mode are SSR. */
const systemModeBootstrap = `
(function(){
  var root=document.documentElement;
  if(root.dataset.appearanceMode!=='system')return;
  var resolved=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  root.dataset.colorScheme=resolved;
  root.style.colorScheme=resolved;
})();`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [cookieAppearance, user] = await Promise.all([
    readAppearanceCookie(),
    getCurrentUser(),
  ]);
  const appearance = user
    ? { mode: user.appearanceMode, theme: user.colorTheme }
    : cookieAppearance;
  const serverScheme = appearance.mode === "dark" ? "dark" : "light";

  return (
    <html
      lang="en"
      data-theme={appearance.theme}
      data-appearance-mode={appearance.mode}
      data-color-scheme={serverScheme}
      data-cookie-theme={cookieAppearance.theme}
      data-cookie-mode={cookieAppearance.mode}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: systemModeBootstrap }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
