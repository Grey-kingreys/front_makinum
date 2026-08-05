import type { Metadata } from "next";

import { LegalPageLayout, LegalSection, type LegalTocEntry } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description:
    "Conditions générales d'utilisation de Makinum : rôle de facilitateur, comptes, obligations des vendeurs et des acheteurs, modération, responsabilité et droit applicable.",
};

const LAST_UPDATED = "2026-08-05";

const SOMMAIRE: LegalTocEntry[] = [
  { id: "objet", label: "Objet du service" },
  { id: "role", label: "Rôle strictement facilitateur" },
  { id: "comptes", label: "Comptes utilisateurs" },
  { id: "obligations-vendeurs", label: "Obligations des vendeurs" },
  { id: "obligations-acheteurs", label: "Obligations des acheteurs" },
  { id: "avis", label: "Avis et évaluations" },
  { id: "moderation", label: "Modération et signalements" },
  { id: "suspension", label: "Suspension de compte" },
  { id: "responsabilite", label: "Limitation de responsabilité" },
  { id: "droit-applicable", label: "Droit applicable" },
];

export default function CguPage() {
  return (
    <LegalPageLayout title="Conditions générales d'utilisation" lastUpdated={LAST_UPDATED} sommaire={SOMMAIRE}>
      <LegalSection id="objet" title="1. Objet du service">
        <p>
          Makinum est une plateforme numérique guinéenne (application web et mobile installable) qui met en
          relation des personnes souhaitant vendre des produits avec des personnes souhaitant les acheter,
          sur la base de leur proximité géographique. Les présentes conditions générales d&apos;utilisation
          (« CGU ») régissent l&apos;accès et l&apos;usage de Makinum par toute personne créant un compte
          (« l&apos;utilisateur »).
        </p>
        <p>
          En créant un compte ou en utilisant Makinum, l&apos;utilisateur accepte sans réserve les présentes
          CGU ainsi que la{" "}
          <a href="/confidentialite" className="underline">
            politique de confidentialité
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="role" title="2. Rôle strictement facilitateur">
        <p>
          Makinum met en relation acheteurs et vendeurs. Makinum n&apos;est <strong>jamais</strong> partie à
          la transaction conclue entre un acheteur et un vendeur, n&apos;est <strong>jamais</strong> un
          intermédiaire financier, et n&apos;assure <strong>jamais</strong> la livraison des produits.
        </p>
        <p>
          Aucun paiement n&apos;est intégré à l&apos;application. Le règlement du prix se fait exclusivement
          entre l&apos;acheteur et le vendeur, en dehors de Makinum, au moment de la livraison ou de la
          remise du produit (paiement à la livraison). Makinum ne collecte, ne détient et ne transmet
          aucun fonds pour le compte de ses utilisateurs.
        </p>
        <p>
          La mise en contact entre acheteur et vendeur (appel téléphonique, message WhatsApp) se fait
          directement entre les deux parties, en dehors de l&apos;application. La négociation, la
          conclusion, l&apos;exécution et le règlement de la transaction relèvent de la seule responsabilité
          des utilisateurs concernés.
        </p>
      </LegalSection>

      <LegalSection id="comptes" title="3. Comptes utilisateurs">
        <p>
          La création d&apos;un compte se fait avec une adresse e-mail et un mot de passe. L&apos;adresse
          e-mail est vérifiée par un code à usage unique (OTP) envoyé par e-mail. Un compte est strictement
          personnel : une même personne ne peut détenir qu&apos;un seul compte, associé à une seule adresse
          e-mail.
        </p>
        <p>
          Un numéro de téléphone valide est en outre exigé des utilisateurs souhaitant vendre sur Makinum :
          il sert de canal de contact (appel téléphonique ou WhatsApp) par lequel les acheteurs intéressés
          par leurs annonces peuvent les joindre, comme précisé dans la{" "}
          <a href="/confidentialite" className="underline">
            politique de confidentialité
          </a>
          .
        </p>
        <p>
          L&apos;utilisateur s&apos;engage à fournir des informations exactes lors de son inscription et à
          les maintenir à jour. Il est seul responsable de la confidentialité de ses identifiants de
          connexion et de toute activité effectuée depuis son compte.
        </p>
      </LegalSection>

      <LegalSection id="obligations-vendeurs" title="4. Obligations des vendeurs">
        <p>Tout utilisateur publiant des annonces de vente s&apos;engage à respecter les règles suivantes :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>publier un maximum de 30 produits actifs simultanément sur son profil ;</li>
          <li>
            décrire ses produits de manière exacte et sincère : prix, quantité, état, disponibilité réelle ;
          </li>
          <li>
            n&apos;utiliser que des photographies authentiques des produits proposés, prises par
            l&apos;utilisateur ou dont il détient les droits d&apos;usage — aucune image trompeuse ou tirée
            d&apos;un autre site ;
          </li>
          <li>
            ne proposer que des produits et services licites, dont la vente est autorisée sur le territoire
            de la République de Guinée ;
          </li>
          <li>honorer les échanges convenus avec les acheteurs de bonne foi.</li>
        </ul>
        <p>
          Le non-respect de ces obligations peut entraîner un retrait d&apos;annonce, un avertissement, ou
          une suspension de compte dans les conditions décrites à la section « Modération et signalements ».
        </p>
      </LegalSection>

      <LegalSection id="obligations-acheteurs" title="5. Obligations des acheteurs">
        <p>Tout utilisateur souhaitant acheter un produit via Makinum s&apos;engage à :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>contacter les vendeurs de bonne foi, avec une intention d&apos;achat réelle ;</li>
          <li>
            se présenter aux rendez-vous convenus avec le vendeur, ou prévenir en cas
            d&apos;empêchement ;
          </li>
          <li>régler le prix convenu au vendeur au moment de la livraison, selon les modalités arrêtées entre eux ;</li>
          <li>
            ne pas exploiter la plateforme à des fins frauduleuses (fausses demandes, harcèlement de
            vendeurs, etc.).
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="avis" title="6. Avis et évaluations">
        <p>
          Les utilisateurs peuvent laisser un avis sur un vendeur uniquement après une demande d&apos;achat
          réelle passée sur ce vendeur via Makinum. Les avis rédigés sans demande d&apos;achat associée ne
          sont pas autorisés et pourront être retirés.
        </p>
        <p>
          Les avis doivent rester factuels, respectueux, et porter sur l&apos;expérience de mise en relation
          ou de transaction. Tout avis diffamatoire, injurieux ou manifestement mensonger pourra être
          signalé et modéré.
        </p>
      </LegalSection>

      <LegalSection id="moderation" title="7. Modération et signalements">
        <p>
          Tout utilisateur peut signaler une annonce, un avis ou un comportement qu&apos;il estime
          contraire aux présentes CGU. Chaque signalement fait l&apos;objet d&apos;un examen humain par
          l&apos;équipe de modération de Makinum.
        </p>
        <p>Selon la gravité constatée, la modération peut décider, de façon graduée :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>d&apos;un avertissement adressé à l&apos;utilisateur concerné ;</li>
          <li>de la désactivation temporaire d&apos;une annonce, d&apos;un avis ou d&apos;une fonctionnalité ;</li>
          <li>de la suspension du compte, temporaire ou définitive, en cas de manquement grave ou répété.</li>
        </ul>
      </LegalSection>

      <LegalSection id="suspension" title="8. Suspension de compte">
        <p>
          Makinum se réserve le droit de suspendre ou de désactiver un compte en cas de non-respect des
          présentes CGU, de fraude avérée ou suspectée, de fausses annonces répétées, ou de comportement
          mettant en danger la confiance entre utilisateurs. L&apos;utilisateur concerné en est informé,
          et peut contester la décision auprès du support.
        </p>
        <p>
          L&apos;utilisateur peut à tout moment demander la clôture de son propre compte auprès du support
          de Makinum.
        </p>
      </LegalSection>

      <LegalSection id="responsabilite" title="9. Limitation de responsabilité">
        <p>
          Makinum s&apos;efforce de fournir un service de mise en relation fiable, mais n&apos;offre aucune
          garantie quant à l&apos;exactitude des annonces publiées par les utilisateurs, à la disponibilité
          effective des produits, ou à la bonne exécution des transactions.
        </p>
        <p>
          Les transactions (négociation, paiement, livraison) sont conclues et exécutées entièrement en
          dehors de la plateforme, directement entre acheteur et vendeur. En conséquence, Makinum ne peut
          être tenue responsable des litiges, pertes, dommages ou préjudices résultant d&apos;une
          transaction entre utilisateurs, y compris en cas de non-livraison, de produit non conforme, ou de
          défaut de paiement.
        </p>
        <p>
          Il appartient à chaque utilisateur de faire preuve de vigilance raisonnable avant de conclure une
          transaction (vérification du produit, du prix, des conditions de remise).
        </p>
      </LegalSection>

      <LegalSection id="droit-applicable" title="10. Droit applicable">
        <p>
          Les présentes CGU sont soumises au droit de la République de Guinée. Tout litige relatif à leur
          interprétation ou à leur exécution relève de la compétence exclusive des juridictions guinéennes,
          sauf disposition légale impérative contraire.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
