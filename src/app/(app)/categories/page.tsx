import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CategoryManager } from "@/components/category-manager";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { listCategoriesWithUsage } from "@/server/categories";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const categories = await listCategoriesWithUsage(user.id);

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Shape your ledger around how you actually think about money."
      />
      <CategoryManager categories={categories} />
    </>
  );
}
