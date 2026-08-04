import type { Metadata } from "next";

import { LegalPageLayout, LegalSection, type LegalTocEntry } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité de Makinum : données collectées, usages, absence de données bancaires, suppression des métadonnées EXIF des photos, durée de conservation et droits des utilisateurs.",
};

const LAST_UPDATED = "2026-08-04";

const SOMMAIRE: LegalTocEntry[] = [
  { id: "donnees-collectees", label: "Données collectées" },
  { id: "usages", label: "Usages des données" },
  { id: "donnees-non-collectees", label: "Ce que nous ne collectons pas" },
  { id: "photos-exif", label: "Photos et métadonnées de localisation" },
  { id: "contact-hors-app", label: "Contact direct hors application" },
  { id: "conservation", label: "Durée de conservation" },
  { id: "droits", label: "Vos droits" },
];

export default function ConfidentialitePage() {
  return (
    <LegalPageLayout
      title="Politique de confidentialité"
      lastUpdated={LAST_UPDATED}
      sommaire={SOMMAIRE}
    >
      <LegalSection id="donnees-collectees" title="1. Données collectées">
        <p>Pour fonctionner, Makinum collecte les données suivantes :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>votre nom (tel que renseigné à l&apos;inscription) ;</li>
          <li>votre numéro de téléphone, utilisé comme identifiant de compte et vérifié par SMS (OTP) ;</li>
          <li>votre adresse e-mail, si vous choisissez d&apos;en renseigner une (optionnel) ;</li>
          <li>
            votre position géographique approximative, pour vous montrer et vous proposer des annonces
            situées près de chez vous ;
          </li>
          <li>
            les contenus que vous publiez vous-même : annonces, photos de produits, avis, messages de
            signalement.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="usages" title="2. Usages des données">
        <p>Ces données sont utilisées exclusivement pour :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>mettre en relation les utilisateurs sur la base de leur proximité géographique ;</li>
          <li>vérifier votre numéro de téléphone à l&apos;inscription et lors de la récupération de compte (OTP) ;</li>
          <li>
            vous envoyer des notifications utiles au service (confirmation, sécurité du compte, activité
            liée à vos annonces) ;
          </li>
          <li>assurer la modération des annonces, avis et signalements décrite dans les CGU.</li>
        </ul>
        <p>
          Vos données ne sont ni vendues, ni louées, ni partagées à des fins publicitaires avec des tiers.
        </p>
      </LegalSection>

      <LegalSection id="donnees-non-collectees" title="3. Ce que nous ne collectons pas">
        <p>
          Makinum ne propose aucun paiement intégré à l&apos;application : le règlement des transactions se
          fait directement entre acheteur et vendeur, à la livraison, en dehors de la plateforme. En
          conséquence, Makinum ne collecte, ne stocke et ne traite <strong>aucune donnée bancaire</strong>
          {" "}(numéro de carte, coordonnées de compte, identifiants mobile money ou autre moyen de
          paiement).
        </p>
      </LegalSection>

      <LegalSection id="photos-exif" title="4. Photos et métadonnées de localisation">
        <p>
          Les photographies de produits que vous mettez en ligne peuvent, selon votre appareil, contenir des
          métadonnées techniques (EXIF) incluant la position GPS précise du lieu de la prise de vue.
        </p>
        <p>
          Ces métadonnées EXIF sont automatiquement supprimées par Makinum lors de l&apos;envoi de la photo.
          La position exacte à laquelle une photo a été prise n&apos;est donc jamais divulguée aux autres
          utilisateurs ni conservée par la plateforme au-delà du traitement de mise en ligne.
        </p>
      </LegalSection>

      <LegalSection id="contact-hors-app" title="5. Contact direct hors application">
        <p>
          Makinum facilite la prise de contact entre acheteur et vendeur, mais n&apos;héberge pas de
          messagerie interne : la mise en relation se fait par appel téléphonique ou via WhatsApp, en
          dehors de l&apos;application.
        </p>
        <p>
          Pour permettre cette mise en relation, le numéro de téléphone d&apos;un utilisateur peut être
          rendu visible à un autre utilisateur avec lequel il entre en contact au sujet d&apos;une annonce.
          C&apos;est un fonctionnement assumé de la version actuelle de Makinum, dont l&apos;utilisateur est
          informé dès son inscription : il reste libre de ne pas donner suite à un contact.
        </p>
      </LegalSection>

      <LegalSection id="conservation" title="6. Durée de conservation">
        <p>
          Vos données sont conservées le temps nécessaire à l&apos;usage du service et à la relation
          contractuelle avec Makinum. En cas de suppression ou de longue inactivité de votre compte, vos
          données personnelles sont supprimées ou anonymisées dans un délai raisonnable, sous réserve des
          obligations légales de conservation qui s&apos;imposeraient à Makinum.
        </p>
      </LegalSection>

      <LegalSection id="droits" title="7. Vos droits">
        <p>
          Vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression des données vous
          concernant. Vous pouvez exercer ces droits à tout moment en contactant le support de Makinum
          depuis l&apos;application, ou via les coordonnées de contact indiquées sur le site.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
