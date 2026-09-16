import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AppearanceProvider } from "@/components/appearance-provider";
import { getCurrentUser } from "@/lib/auth/session";
import { listCategories } from "@/server/categories";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const categories = await listCategories(user.id);

  return (
    <AppearanceProvider
      initial={{ mode: user.appearanceMode, theme: user.colorTheme }}
    >
      <AppShell
        user={{ name: user.name, email: user.email }}
        categories={categories}
      >
        {children}
      </AppShell>
    </AppearanceProvider>
  );
}
