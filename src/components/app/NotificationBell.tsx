"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { useNotifications } from "@/lib/notifications";

/**
 * Cloche de notifications — lien vers /notifications avec badge nbNonLues
 * (masqué à 0). Placée dans la rangée d'en-tête de la sidebar (Sidebar.tsx),
 * toujours visible : aussi bien sur la barre mobile (repliée) que sur la
 * sidebar desktop. NotificationsProvider (monté dans AppShell) porte déjà le
 * fetch initial ; le badge se resynchronise après chaque marquage lu depuis
 * /notifications (refresh()).
 */
export function NotificationBell() {
  const pathname = usePathname();
  const { nbNonLues } = useNotifications();
  const active = pathname === "/notifications";
  const hasUnread = nbNonLues > 0;

  return (
    <Link
      href="/notifications"
      aria-current={active ? "page" : undefined}
      aria-label={
        hasUnread
          ? `Notifications, ${nbNonLues} non lue${nbNonLues > 1 ? "s" : ""}`
          : "Notifications"
      }
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-cream/72 transition-colors hover:bg-cream/8 hover:text-cream"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {hasUnread ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-brand"
        >
          {nbNonLues > 99 ? "99+" : nbNonLues}
        </span>
      ) : null}
    </Link>
  );
}
