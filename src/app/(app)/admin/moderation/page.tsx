import type { Metadata } from "next";

import { AdminGuard } from "@/components/app/AdminGuard";

import { ModerationView } from "./ModerationView";

export const metadata: Metadata = { title: "File de modération" };

export default function ModerationPage() {
  return (
    <AdminGuard>
      <ModerationView />
    </AdminGuard>
  );
}
