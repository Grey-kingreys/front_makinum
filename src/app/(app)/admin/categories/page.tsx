import type { Metadata } from "next";

import { AdminGuard } from "@/components/app/AdminGuard";

import { CategoriesView } from "./CategoriesView";

export const metadata: Metadata = { title: "Catégories" };

export default function CategoriesPage() {
  return (
    <AdminGuard>
      <CategoriesView />
    </AdminGuard>
  );
}
