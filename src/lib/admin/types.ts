/**
 * Types alignés sur le contrat backend (lecture seule) :
 * backend/src/reports/admin-users.types.ts.
 */

import type { PublicUser } from "@/lib/auth/types";

/**
 * Vue admin d'un utilisateur : même forme que `PublicUser` (CDC §2, §7) —
 * pas de champ supplémentaire propre à l'admin pour l'instant.
 */
export type AdminUserView = PublicUser;

export interface AdminUserListResult {
  items: AdminUserView[];
  total: number;
  page: number;
  limit: number;
}
