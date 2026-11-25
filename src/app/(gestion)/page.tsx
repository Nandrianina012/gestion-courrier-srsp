"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API } from "@/lib/api";

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

type StatistiqueDivision = {
  code: string;
  nom: string;
  total: number;
  enAttente: number;
  vises: number;
  rejetes: number;
  autres: number;
};

type SemaineTraitement = {
  semaine: number;
  transferts: number;
  decisions: number;
  taux: number | null;
};

type StatistiquesTraitement = {
  mois: string;
  semaines: SemaineTraitement[];
};

const NOMS_ROLES: Record<string, string> = {
  SecDRBF: "Secrétariat DRBF",
  SecSRSP: "Secrétariat SRSP",
  DIVISION_SOLDE: "Division SOLDE",
  DIVISION_VISA: "Division VISA",
  DIVISION_PENSIONS: "Division PENSIONS",
  DIVISION_SECOURS: "Division SECOURS",
  ADMIN: "Administration",
};

const ROLES_DIVISIONS = [
  "DIVISION_SOLDE",
  "DIVISION_VISA",
  "DIVISION_PENSIONS",
  "DIVISION_SECOURS",
];

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

function normaliserStatutAffichage(statut: string | null | undefined) {
  if (!statut) return "—";

  const statuts: Record<string, string> = {
    Validé: "Visé",
  };

  return statuts[statut] ?? statut;
}

function couleurStatut(statut: string) {
  const statutNormalise = normaliserStatutAffichage(statut);

  if (statutNormalise === "Visé" || statutNormalise === "Remis") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (statutNormalise === "Rejeté") {
    return "bg-red-50 text-red-700";
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

function obtenirStatistiquesDivisions(
  donnees: DossierAPI[],
): StatistiqueDivision[] {
  const dossiers = obtenirDossiersIndividuels(donnees);

  return ROLES_DIVISIONS.map((code) => {
    const dossiersDivision = dossiers.filter(
      (dossier) => dossier.localisationActuelle === code,
    );
    const enAttente = dossiersDivision.filter(
      (dossier) => dossier.statutDossier === "En attente",
    ).length;
    const vises = dossiersDivision.filter(
      (dossier) => normaliserStatutAffichage(dossier.statutDossier) === "Visé",
    ).length;
    const rejetes = dossiersDivision.filter(
      (dossier) => normaliserStatutAffichage(dossier.statutDossier) === "Rejeté",
    ).length;

    return {
      code,
      nom: NOMS_ROLES[code],
      total: dossiersDivision.length,
      enAttente,
      vises,
      rejetes,
      autres: dossiersDivision.length - enAttente - vises - rejetes,
    };
  });
}

function obtenirStatutsBE(dossiers: DossierDansBE[]) {
  const ordre = [
    "En attente",
    "Visé",
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

  const vises = dossiers.filter(
    (d) => normaliserStatutAffichage(d.statutDossier) === "Visé",
  );

  const rejetes = dossiers.filter(
    (d) => normaliserStatutAffichage(d.statutDossier) === "Rejeté",
  );

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
        titre: "Dossiers visés",
        valeur: vises.length,
        detail: "Dossiers visés par votre division",
        couleur: "bg-emerald-50 text-emerald-700",
      },
      {
        titre: "Dossiers rejetés",
        valeur: rejetes.length,
        detail: "Dossiers rejetés par votre division",
        couleur: "bg-red-50 text-red-700",
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
        titre: "Visés",
        valeur: vises.length,
        detail: "Dossiers visés",
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
  const [moisTraitement, setMoisTraitement] = useState("");
  const [statistiquesTraitement, setStatistiquesTraitement] =
    useState<StatistiquesTraitement | null>(null);
  const [erreurTraitement, setErreurTraitement] = useState("");
  const [chargementTraitement, setChargementTraitement] = useState(false);
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

  useEffect(() => {
    if (utilisateur?.role !== "ADMIN") return;

    setMoisTraitement((moisActuel) =>
      moisActuel || new Date().toISOString().slice(0, 7),
    );
  }, [utilisateur?.role]);

  useEffect(() => {
    if (utilisateur?.role !== "ADMIN" || !moisTraitement) return;

    let annule = false;
    const token = sessionStorage.getItem("access_token");

    if (!token) return;

    async function chargerStatistiquesTraitement() {
      setChargementTraitement(true);
      setErreurTraitement("");

      try {
        const reponse = await fetch(
          `${API}/api/admin/statistiques-traitement?mois=${moisTraitement}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );

        const resultat: unknown = await reponse.json().catch(() => null);

        if (!reponse.ok) {
          throw new Error("Impossible de charger la tendance de traitement.");
        }

        if (!annule) {
          setStatistiquesTraitement(resultat as StatistiquesTraitement);
        }
      } catch (error) {
        if (!annule) {
          setErreurTraitement(
            error instanceof Error
              ? error.message
              : "Erreur lors du chargement des statistiques.",
          );
        }
      } finally {
        if (!annule) setChargementTraitement(false);
      }
    }

    void chargerStatistiquesTraitement();

    return () => {
      annule = true;
    };
  }, [utilisateur?.role, moisTraitement]);

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
  const statistiquesDivisions =
    role === "ADMIN" ? obtenirStatistiquesDivisions(donnees) : [];
  const semainesTraitement = statistiquesTraitement?.semaines ?? [];
  const maximumTaux = Math.max(
    100,
    Math.ceil(
      Math.max(0, ...semainesTraitement.map((semaine) => semaine.taux ?? 0)) /
        50,
    ) * 50,
  );
  const moisPrecedent = () => {
    const [anneeMois, numeroMois] = moisTraitement.split("-").map(Number);
    const date = new Date(Date.UTC(anneeMois, numeroMois - 2, 1));
    setMoisTraitement(date.toISOString().slice(0, 7));
  };
  const moisSuivant = () => {
    const [anneeMois, numeroMois] = moisTraitement.split("-").map(Number);
    const date = new Date(Date.UTC(anneeMois, numeroMois, 1));
    setMoisTraitement(date.toISOString().slice(0, 7));
  };
  const moisCourant = new Date().toISOString().slice(0, 7);
  const libelleMois = moisTraitement
    ? new Date(`${moisTraitement}-01T00:00:00Z`).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

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

      {role === "ADMIN" && (
        <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
          <section
            aria-labelledby="titre-repartition-divisions"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="titre-repartition-divisions"
                className="text-lg font-bold text-slate-900"
              >
                Dossiers par division
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Dossiers actuellement affectés à chaque division, par statut.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                En attente
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                Visés
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                Rejetés
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
                Autres
              </span>
            </div>
            </div>

            <div className="mt-6 space-y-5">
            {statistiquesDivisions.map((division) => {
              const segments = [
                {
                  nom: "En attente",
                  valeur: division.enAttente,
                  couleur: "bg-amber-400",
                },
                {
                  nom: "Visés",
                  valeur: division.vises,
                  couleur: "bg-emerald-500",
                },
                {
                  nom: "Rejetés",
                  valeur: division.rejetes,
                  couleur: "bg-red-500",
                },
                {
                  nom: "Autres statuts",
                  valeur: division.autres,
                  couleur: "bg-slate-300",
                },
              ];

              return (
                <div
                  key={division.code}
                  className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_48px] sm:items-center sm:gap-4"
                >
                  <p className="text-sm font-medium text-slate-700">
                    {division.nom}
                  </p>

                  <div
                    role="img"
                    aria-label={`${division.nom} : ${division.total} dossiers au total; ${division.enAttente} en attente, ${division.vises} visés, ${division.rejetes} rejetés et ${division.autres} autres.`}
                    className="flex h-3.5 w-full overflow-hidden rounded-sm bg-slate-100"
                  >
                    {division.total > 0 ? (
                      segments.map(
                        (segment) =>
                          segment.valeur > 0 && (
                            <span
                              key={segment.nom}
                              title={`${segment.nom} : ${segment.valeur}`}
                              className={`${segment.couleur} h-full`}
                              style={{
                                width: `${(segment.valeur / division.total) * 100}%`,
                              }}
                            />
                          ),
                      )
                    ) : (
                      <span className="h-full w-full bg-slate-100" />
                    )}
                  </div>

                  <p className="text-right text-sm font-semibold tabular-nums text-slate-900">
                    {division.total}
                  </p>

                  <p className="text-xs text-slate-500 sm:col-start-2">
                    {division.enAttente} en attente · {division.vises} visé
                    {division.vises > 1 ? "s" : ""} · {division.rejetes} rejeté
                    {division.rejetes > 1 ? "s" : ""}
                    {division.autres > 0 && ` · ${division.autres} autres`}
                  </p>
                </div>
              );
            })}
            </div>
          </section>

          <section
            aria-labelledby="titre-tendance-traitement"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="titre-tendance-traitement"
                  className="text-lg font-bold text-slate-900"
                >
                  Taux de traitement hebdomadaire
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Toutes divisions confondues
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Mois précédent"
                  disabled={!moisTraitement}
                  onClick={moisPrecedent}
                  className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  ←
                </button>
                <span className="min-w-[112px] text-center text-sm font-medium capitalize text-slate-700">
                  {libelleMois}
                </span>
                <button
                  type="button"
                  aria-label="Mois suivant"
                  disabled={!moisTraitement || moisTraitement >= moisCourant}
                  onClick={moisSuivant}
                  className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Décisions (visés + rejetés) ÷ dossiers transférés aux divisions.
            </p>

            {chargementTraitement ? (
              <p className="mt-6 text-sm text-slate-500">
                Chargement des statistiques…
              </p>
            ) : erreurTraitement ? (
              <p role="alert" className="mt-6 text-sm text-red-700">
                {erreurTraitement}
              </p>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-[30px_minmax(0,1fr)] gap-x-2">
                  <div className="flex h-36 flex-col justify-between pb-5 text-right text-[10px] tabular-nums text-slate-400">
                    {[maximumTaux, Math.round(maximumTaux / 2), 0].map((valeur) => (
                      <span key={valeur}>{valeur}%</span>
                    ))}
                  </div>

                  <div className="relative h-36 border-b border-l border-slate-300">
                    <div className="pointer-events-none absolute inset-0 flex h-[calc(100%-1.25rem)] flex-col justify-between">
                      {[0, 1, 2].map((ligne) => (
                        <span
                          key={ligne}
                          className="w-full border-t border-dashed border-slate-200"
                        />
                      ))}
                    </div>
                    <div className="relative grid h-full grid-cols-4 items-end gap-2 px-2">
                      {semainesTraitement.map((semaine) => {
                        const taux = semaine.taux ?? 0;
                        const hauteur = Math.min(
                          (taux / maximumTaux) * 100,
                          100,
                        );

                        return (
                          <div
                            key={semaine.semaine}
                            className="flex h-full flex-col items-center justify-end"
                          >
                            <span className="mb-1 text-[10px] font-medium tabular-nums text-slate-600">
                              {semaine.taux === null ? "—" : `${taux}%`}
                            </span>
                            <div className="flex h-[calc(100%-2.25rem)] w-full items-end justify-center">
                              <span
                                role="img"
                                aria-label={`Semaine ${semaine.semaine} : ${semaine.taux === null ? "aucun transfert" : `taux ${taux}%`}, ${semaine.decisions} décisions pour ${semaine.transferts} transferts`}
                                className="w-8 max-w-full rounded-t-sm bg-emerald-500/80"
                                style={{ height: `${hauteur}%` }}
                              />
                            </div>
                            <span className="mt-1 text-[10px] text-slate-500">
                              S{semaine.semaine}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 pl-8 text-center text-[10px] leading-4 text-slate-500">
                  {semainesTraitement.map((semaine) => (
                    <span key={semaine.semaine}>
                      {semaine.decisions}/{semaine.transferts}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  Un taux supérieur à 100 % signifie que des dossiers reçus avant ce mois ont aussi été traités.
                </p>
              </>
            )}
          </section>
        </div>
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

        <div className="space-y-3 p-3 xl:hidden">
          {donneesRecentes.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Aucun élément récent à afficher.
            </p>
          ) : (
            donneesRecentes.map((element) => {
              if (estGroupeBE(element)) {
                const statut = obtenirStatutsBE(element.dossiers);

                return (
                  <article
                    key={`recent-mobile-be-${element.numeroBE}`}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500">
                          BE n°{element.numeroBE}
                        </p>
                        <h3 className="mt-1 break-words text-sm font-semibold text-[#705212]">
                          {element.referenceDossier}
                        </h3>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {statut || "—"}
                      </span>
                    </div>
                    <p className="mt-3 break-words text-sm text-slate-800">
                      {obtenirNomAgents(element.agents)}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      IM : {obtenirIMAgents(element.agents)}
                    </p>
                    <p className="mt-2 break-words text-sm text-slate-600">
                      {element.objet}
                    </p>
                  </article>
                );
              }

              const dossier = element;
              const statut = normaliserStatutAffichage(dossier.statutDossier);

              return (
                <article
                  key={`recent-mobile-dossier-${dossier.idDossier ?? dossier.id}`}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        Dossier n°{dossier.numeroBE ?? dossier.numeroDossier ?? "—"}
                      </p>
                      <h3 className="mt-1 break-words text-sm font-semibold text-[#705212]">
                        {dossier.referenceDossier}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {statut}
                    </span>
                  </div>
                  <p className="mt-3 break-words text-sm font-medium text-slate-800">
                    {dossier.nomCompletAgent ?? obtenirNomAgents(dossier.agents ?? [])}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    IM : {dossier.IM ?? obtenirIMAgents(dossier.agents ?? [])}
                  </p>
                  <p className="mt-2 break-words text-sm text-slate-600">
                    {dossier.objet}
                  </p>
                  {estDivision(role) && (
                    <p className="mt-2 text-xs text-slate-500">
                      {nomDestination(dossier.localisationActuelle)}
                    </p>
                  )}
                </article>
              );
            })
          )}
        </div>

        <div className="hidden overflow-x-auto xl:block">
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
                  const statut = normaliserStatutAffichage(dossier.statutDossier);                  const enSouffrance =
                    statut === "En attente" &&
                    dossier.dateEnvoi &&
                    Date.now() - new Date(dossier.dateEnvoi).getTime() >=
                      5 * 24 * 60 * 60 * 1000;                  const nomAgent =
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
                          className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-all duration-200 ${
                            enSouffrance
                              ? "animate-[pulse_1.2s_ease-in-out_infinite] border-red-300 bg-red-100 text-red-800 ring-4 ring-red-200/70"
                              : "border-transparent bg-slate-100 text-slate-700"
                          }`}
                        >
                          {enSouffrance && (
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
                          )}
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
