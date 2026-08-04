import { Badge, type BadgeVariant } from "@/components/ui";
import type { StatutVendeur } from "@/lib/products/types";

/**
 * Reprend la convention du prototype : le badge de statut ne s'affiche que
 * pour les vendeurs "vérifié" / "confiance" (`hasBadge` dans
 * docs/Design de marketplace locale/Makinum.dc.html) — un vendeur "libre"
 * n'a aucun signe distinctif.
 */
const STATUT_LABEL: Record<StatutVendeur, string> = {
  LIBRE: "libre",
  VERIFIE: "vérifié",
  CONFIANCE: "confiance",
};

const STATUT_VARIANT: Record<StatutVendeur, BadgeVariant> = {
  LIBRE: "libre",
  VERIFIE: "verifie",
  CONFIANCE: "confiance",
};

export function VendeurBadge({ statut }: { statut: StatutVendeur }) {
  if (statut === "LIBRE") return null;
  return (
    <Badge variant={STATUT_VARIANT[statut]} dot>
      {STATUT_LABEL[statut]}
    </Badge>
  );
}
