"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Utilisateur = {
  idUtilisateur: number;
  identifiant: string;
  role: string;
};

type Agent = {
  idAgent: number;
  IM: string;
  nom?: string;
  prenoms?: string;
  nomComplet?: string;
};

type DossierIndividuel = {
  id: number;
  idDossier?: number;
  numeroBE?: number;
  numeroDossier?: number;
  referenceDossier: string;
  objet: string;
  idAgent?: number | null;
  IM?: string | null;
  nomCompletAgent?: string | null;
  agents?: Agent[];
  dateReception: string | null;
  statutDossier: string;
  localisationActuelle?: string | null;
  origine?: string | null;
  destination?: string | null;
  dateEnvoi?: string | null;
  dateReceptionTransmission?: string | null;
  statutTransmission?: string | null;
  informationsComplementaires?: string | null;
  nomResponsable?: string | null;
  telephoneResponsable?: string | null;
  emailResponsable?: string | null;
};

type DossierDansBE = {
  idDossier: number;
  idAgent: number | null;
  statutDossier: string;
  localisationActuelle: string | null;
};

type GroupeBE = {
  id: number;
  idDossier: number;
  numeroBE: number;
  referenceDossier: string;
  objet: string;
  nomResponsable?: string | null;
  telephoneResponsable?: string | null;
  emailResponsable?: string | null;
  dateReception: string | null;
  statutDossier: string;
  localisationActuelle: string | null;
  agents: Agent[];
  dossiers: DossierDansBE[];
  origine: string | null;
  destination: string | null;
  dateEnvoi: string | null;
  dateReceptionTransmission: string | null;
  statutTransmission: string | null;
  informationsComplementaires: string | null;
};

type DossierAPI = GroupeBE | DossierIndividuel;

type Statistique = {
  titre: string;
  valeur: number;
  detail: string;
  couleur: string;
};

const API = "http://127.0.0.1:8000";

const NOMS_ROLES: Record<string, string> = {
  SecDRBF: "Secrétariat DRBF",
  SecSRSP: "Secrétariat SRSP",
  DIVISION_SOLDE: "Division SOLDE",
  DIVISION_VISA: "Division VISA",
  DIVISION_PENSIONS: "Division PENSIONS",
  DIVISION_SECOURS: "Division SECOURS",
  ADMIN: "Administration",
};

function estDivision(role: string) {
  return role.startsWith("DIVISION_");
}

function estGroupeBE(dossier: DossierAPI): dossier is GroupeBE {
  return Array.isArray((dossier as GroupeBE).dossiers);
}

function formaterDate(date: string | null | undefined) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("fr-FR");
}

function nomDestination(destination: string | null | undefined) {
  if (!destination) return "Non renseignée";

  return NOMS_ROLES[destination] ?? destination;
}

function couleurStatut(statut: string) {
  if (statut === "Validé" || statut === "Remis") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (statut === "Rejeté") {
    return "bg-red-50 text-red-700";
  }

  if (statut === "En cours de traitement") {
    return "bg-amber-50 text-[#705212]";
  }

  return "bg-slate-100 text-slate-700";
}

/**
 * Récupère tous les dossiers individuels.
 * Pour les secrétariats et l'administration, l'API renvoie des groupes BE.
 * Pour les divisions, elle renvoie des dossiers individuels.
 */
function obtenirDossiersIndividuels(
  donnees: DossierAPI[],
): DossierIndividuel[] {
  const resultat: DossierIndividuel[] = [];

  donnees.forEach((element) => {
    if (estGroupeBE(element)) {
      element.dossiers.forEach((dossierBE) => {
        const agent = element.agents.find(
          (a) => a.idAgent === dossierBE.idAgent,
        );

        resultat.push({
          id: dossierBE.idDossier,
          idDossier: dossierBE.idDossier,
          numeroBE: element.numeroBE,
          referenceDossier: element.referenceDossier,
          objet: element.objet,
          idAgent: dossierBE.idAgent,
          IM: agent?.IM ?? null,
          nomCompletAgent: agent?.nomComplet ?? null,
          agents: agent ? [agent] : [],
          dateReception: element.dateReception,
          statutDossier: dossierBE.statutDossier,
          localisationActuelle: dossierBE.localisationActuelle,
          origine: element.origine,
          destination: element.destination,
          dateEnvoi: element.dateEnvoi,
          dateReceptionTransmission: element.dateReceptionTransmission,
          statutTransmission: element.statutTransmission,
          informationsComplementaires: element.informationsComplementaires,
          nomResponsable: element.nomResponsable,
          telephoneResponsable: element.telephoneResponsable,
          emailResponsable: element.emailResponsable,
        });
      });
    } else {
      resultat.push(element);
    }
  });

  return resultat;
}

function obtenirStatutsBE(dossiers: DossierDansBE[]) {
  const ordre = [
    "En attente",
    "En cours de traitement",
    "Validé",
    "Rejeté",
    "Remis",
  ];

  const compteurs = new Map<string, number>();

  dossiers.forEach((dossier) => {
    compteurs.set(
      dossier.statutDossier,
      (compteurs.get(dossier.statutDossier) ?? 0) + 1,
    );
  });

  return ordre
    .filter((statut) => compteurs.has(statut))
    .map((statut) => `${compteurs.get(statut)} ${statut}`)
    .join(" · ");
}

function obtenirNomAgents(agents: Agent[]) {
  if (!agents || agents.length === 0) return "Aucun agent";

  return agents
    .map(
      (agent) =>
        agent.nomComplet ?? `${agent.nom ?? ""} ${agent.prenoms ?? ""}`.trim(),
    )
    .filter(Boolean)
    .join(", ");
}

function obtenirIMAgents(agents: Agent[]) {
  if (!agents || agents.length === 0) return "—";

  return agents.map((agent) => agent.IM).join(", ");
}

function creerStatistiques(role: string, donnees: DossierAPI[]): Statistique[] {
  const dossiers = obtenirDossiersIndividuels(donnees);

  const repartition = dossiers.reduce<Record<string, number>>(
    (compteurs, dossier) => {
      const localisation = dossier.localisationActuelle ?? "Non renseignée";

      compteurs[localisation] = (compteurs[localisation] ?? 0) + 1;

      return compteurs;
    },
    {},
  );

  console.log("Répartition des dossiers :", repartition);

  const enAttente = dossiers.filter((d) => d.statutDossier === "En attente");

  const enCours = dossiers.filter(
    (d) => d.statutDossier === "En cours de traitement",
  );

  const valides = dossiers.filter((d) => d.statutDossier === "Validé");

  const rejetes = dossiers.filter((d) => d.statutDossier === "Rejeté");

  const remis = dossiers.filter((d) => d.statutDossier === "Remis");

  if (role === "SecDRBF") {
    const dossiersAuSRSP = dossiers.filter(
      (d) => d.localisationActuelle === "SecSRSP",
    );

    const dossiersAuxDivisions = dossiers.filter((d) =>
      d.localisationActuelle?.startsWith("DIVISION_"),
    );

    return [
      {
        titre: "Total enregistré",
        valeur: dossiers.length,
        detail: "Nombre total de dossiers enregistrés",
        couleur: "bg-[#F7E9B4] text-[#705212]",
      },
      {
        titre: "Dossiers au Secrétariat SRSP",
        valeur: dossiersAuSRSP.length,
        detail: "Dossiers actuellement localisés au SRSP",
        couleur: "bg-amber-50 text-amber-700",
      },
      {
        titre: "Dossiers transférés aux divisions",
        valeur: dossiersAuxDivisions.length,
        detail: "Dossiers actuellement localisés dans une division",
        couleur: "bg-orange-50 text-orange-700",
      },
    ];
  }

  if (role === "SecSRSP") {
    const dossiersNonTransferes = dossiers.filter(
      (d) => d.localisationActuelle === "SecSRSP",
    );

    const dossiersTransferes = dossiers.filter((d) =>
      d.localisationActuelle?.startsWith("DIVISION_"),
    );

    return [
      {
        titre: "Total enregistré",
        valeur: dossiers.length,
        detail: "Nombre total de dossiers suivis par le SRSP",
        couleur: "bg-[#F7E9B4] text-[#705212]",
      },
      {
        titre: "Dossiers non transférés",
        valeur: dossiersNonTransferes.length,
        detail: "Dossiers actuellement au Secrétariat SRSP",
        couleur: "bg-amber-50 text-amber-700",
      },
      {
        titre: "Dossiers transférés",
        valeur: dossiersTransferes.length,
        detail: "Dossiers actuellement dans les divisions",
        couleur: "bg-orange-50 text-orange-700",
      },
    ];
  }

  if (estDivision(role)) {
    return [
      {
        titre: "Dossiers reçus",
        valeur: dossiers.length,
        detail: "Dossiers présents dans votre liste",
        couleur: "bg-[#F7E9B4] text-[#705212]",
      },
      {
        titre: "En cours",
        valeur: enCours.length,
        detail: "Dossiers en cours de traitement",
        couleur: "bg-amber-50 text-amber-700",
      },
      {
        titre: "Dossiers traités",
        valeur: valides.length + rejetes.length,
        detail: "Dossiers validés ou rejetés",
        couleur: "bg-emerald-50 text-emerald-700",
      },
    ];
  }

  if (role === "ADMIN") {
    return [
      {
        titre: "Total des dossiers",
        valeur: dossiers.length,
        detail: "Nombre total de dossiers individuels",
        couleur: "bg-[#F7E9B4] text-[#705212]",
      },
      {
        titre: "En attente",
        valeur: enAttente.length,
        detail: "Dossiers en attente",
        couleur: "bg-orange-50 text-orange-700",
      },
      {
        titre: "En cours",
        valeur: enCours.length,
        detail: "Dossiers en cours de traitement",
        couleur: "bg-amber-50 text-amber-700",
      },
      {
        titre: "Validés",
        valeur: valides.length,
        detail: "Dossiers validés",
        couleur: "bg-emerald-50 text-emerald-700",
      },
      {
        titre: "Rejetés",
        valeur: rejetes.length,
        detail: "Dossiers rejetés",
        couleur: "bg-red-50 text-red-700",
      },
      {
        titre: "Remis",
        valeur: remis.length,
        detail: "Dossiers remis au responsable",
        couleur: "bg-green-50 text-green-700",
      },
    ];
  }

  return [];
}

export default function DashboardPage() {
  const router = useRouter();

  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [donnees, setDonnees] = useState<DossierAPI[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let annule = false;

    async function chargerTableauDeBord() {
      const token = sessionStorage.getItem("access_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const reponseCompte = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!reponseCompte.ok) {
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("identifiant");
          sessionStorage.removeItem("role");
          router.replace("/login");
          return;
        }

        const compte: Utilisateur = await reponseCompte.json();

        if (!annule) setUtilisateur(compte);

        const reponseDossiers = await fetch(`${API}/api/dossiers`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!reponseDossiers.ok) {
          throw new Error(
            "Impossible de charger les dossiers. Vérifiez les autorisations de votre compte.",
          );
        }

        const resultat: DossierAPI[] = await reponseDossiers.json();

        if (!annule) setDonnees(resultat);
      } catch (error) {
        if (!annule) {
          setErreur(
            error instanceof Error
              ? error.message
              : "Une erreur est survenue pendant le chargement.",
          );
        }
      } finally {
        if (!annule) setChargement(false);
      }
    }

    chargerTableauDeBord();

    return () => {
      annule = true;
    };
  }, [router]);

  if (chargement) {
    return (
      <div className="py-16 text-center text-slate-500">
        Chargement du tableau de bord...
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="mx-auto mt-8 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-semibold text-[#705212]">
          Tableau de bord indisponible
        </h1>
        <p className="mt-2 text-sm text-slate-700">{erreur}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] px-4 py-2 text-sm font-medium text-white"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!utilisateur) return null;

  const role = utilisateur.role;
  const nomRole = NOMS_ROLES[role] ?? role;

  const statistiques = creerStatistiques(role, donnees);

  const donneesRecentes = [...donnees]
    .sort((a, b) => {
      const dateA = a.dateReception ? new Date(a.dateReception).getTime() : 0;

      const dateB = b.dateReception ? new Date(b.dateReception).getTime() : 0;

      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-[#8C6A1E]">
          {nomRole.toUpperCase()}
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Tableau de bord
        </h1>

        <p className="mt-2 text-slate-500">Statistiques des dossiers</p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statistiques.map((statistique) => (
          <article
            key={statistique.titre}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">
                {statistique.titre}
              </p>

              <span
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${statistique.couleur}`}
              >
                {role === "ADMIN" ? "Global" : nomRole}
              </span>
            </div>

            <p className="mt-4 text-3xl font-bold text-slate-900">
              {statistique.valeur}
            </p>

            <p className="mt-2 text-sm text-slate-500">{statistique.detail}</p>
          </article>
        ))}
      </section>

      {role === "ADMIN" && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Accès administration
          </h2>

          <p className="mt-1 text-m text-slate-500">
            Gérer les utilisateurs - Gérer les agents
          </p>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {estDivision(role) ? "Dossiers récents" : "BE récents"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Les cinq derniers éléments enregistrés.
            </p>
          </div>

          <Link
            href="/dossiers"
            className="text-sm font-semibold text-[#8C6A1E] hover:text-[#705212]"
          >
            Voir tous les dossiers →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-amber-50 text-slate-600">
              <tr>
                <th className="px-5 py-4 font-medium">N°</th>
                <th className="px-5 py-4 font-medium">Référence</th>
                <th className="px-5 py-4 font-medium">Agent / IM</th>
                <th className="px-5 py-4 font-medium">Objet</th>
                {estDivision(role) && (
                  <th className="px-5 py-4 font-medium">
                    Localisation actuelle
                  </th>
                )}
                <th className="px-5 py-4 font-medium">Statut</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {donneesRecentes.length === 0 ? (
                <tr>
                  <td
                    colSpan={estDivision(role) ? 6 : 5}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Aucun élément récent à afficher.
                  </td>
                </tr>
              ) : (
                donneesRecentes.map((element) => {
                  if (estGroupeBE(element)) {
                    const statut = obtenirStatutsBE(element.dossiers);

                    return (
                      <tr
                        key={`be-${element.numeroBE}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          {element.numeroBE}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#705212]">
                          {element.referenceDossier}
                        </td>

                        <td className="max-w-[240px] px-5 py-4">
                          <p className="font-medium text-slate-800">
                            {obtenirNomAgents(element.agents)}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            IM : {obtenirIMAgents(element.agents)}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {element.objet}
                        </td>

                        <td className="px-5 py-4">
                          {statut ? (
                            <div className="flex flex-wrap gap-1">
                              {statut.split(" · ").map((item) => {
                                const nom = item.replace(/^\d+\s/, "");

                                return (
                                  <span
                                    key={item}
                                    className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${couleurStatut(nom)}`}
                                  >
                                    {item}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  }

                  const dossier = element;
                  const statut = dossier.statutDossier;
                  const nomAgent =
                    dossier.nomCompletAgent ??
                    obtenirNomAgents(dossier.agents ?? []);
                  const imAgent =
                    dossier.IM ?? obtenirIMAgents(dossier.agents ?? []);

                  return (
                    <tr
                      key={`dossier-${dossier.idDossier ?? dossier.id}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {dossier.numeroBE ?? dossier.numeroDossier ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#705212]">
                        {dossier.referenceDossier}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {nomAgent || "Aucun agent"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          IM : {imAgent || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {dossier.objet}
                      </td>

                      {estDivision(role) && (
                        <td className="px-5 py-4 text-slate-600">
                          {nomDestination(dossier.localisationActuelle)}
                        </td>
                      )}

                      <td className="px-5 py-4">
                        <span
                          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${couleurStatut(statut)}`}
                        >
                          {statut}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          {obtenirDossiersIndividuels(donnees).length} dossier(s) individuel(s)
          dans les données reçues.
        </div>
      </section>
    </div>
  );
}
