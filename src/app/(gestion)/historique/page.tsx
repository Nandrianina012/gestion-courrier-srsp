"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "http://127.0.0.1:8000";

type AgentHistorique = {
  idAgent: number;
  IM: string | null;
  numeroPension: string | null;
  nom: string;
  prenoms: string | null;
  nomComplet: string;
  CIN: string | null;
  corpsCode: string | null;
  sectionCode: string | null;
  FIVCode: string | null;
  typeAgent: string;
};

type EvenementHistorique = {
  type: "action" | "transmission";
  date: string | null;
  dateReception?: string | null;
  titre: string;
  acteur: string | null;
  destination?: string | null;
  statut: string | null;
  details: string | null;
};

type DossierHistorique = {
  idDossier: number;
  numeroBE: number;
  referenceDossier: string;
  objet: string;
  dateReception: string | null;
  statut: string;
  localisationActuelle: string;
  agents: AgentHistorique[];
  responsable: {
    nom: string;
    telephone: string;
    email: string | null;
  } | null;
  chronologie: EvenementHistorique[];
};

type ReponseHistorique = {
  recherche: string;
  total: number;
  limite: number;
  resultatsTronques: boolean;
  dossiers: DossierHistorique[];
};

function formaterDate(date: string | null) {
  if (!date) return "Date non renseignée";

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) return "Date invalide";

  return valeur.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extraireErreur(payload: unknown) {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;

    if (typeof detail === "string") return detail;
  }

  return "La recherche historique a échoué.";
}

function badgeStatut(statut: string) {
  if (statut === "Visé") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (statut === "Rejeté") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-amber-200 bg-amber-50 text-amber-900";
}

function libelleLocalisation(code: string | null | undefined) {
  if (!code) return "Non renseignée";

  const libelles: Record<string, string> = {
    SecDRBF: "Secrétariat DRBF",
    SecSRSP: "Secrétariat SRSP",
    DIVISION_SOLDE: "Division SOLDE",
    DIVISION_VISA: "Division VISA",
    DIVISION_PENSIONS: "Division PENSIONS",
    DIVISION_SECOURS: "Division SECOURS",
  };

  return libelles[code] ?? code;
}

function estEvenementRedondant(evenement: EvenementHistorique) {
  const details = (evenement.details ?? "").trim();

  if (evenement.type === "transmission") {
    return (
      evenement.titre === "Transmission" &&
      evenement.destination === "SecSRSP" &&
      details === "Renvoyé à la SecSRSP pour réorientation."
    );
  }

  if (evenement.type === "action") {
    return (
      evenement.titre === "Transférer" &&
      details === "Transfert sans observation."
    );
  }

  return false;
}

function formatParcours(evenement: EvenementHistorique) {
  if (evenement.type === "transmission" && evenement.destination) {
    return `${libelleLocalisation(evenement.acteur)} → ${libelleLocalisation(evenement.destination)}`;
  }

  return libelleLocalisation(evenement.acteur);
}

export default function HistoriquePage() {
  const router = useRouter();

  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<DossierHistorique[]>([]);
  const [total, setTotal] = useState(0);
  const [tronque, setTronque] = useState(false);
  const [rechercheLancee, setRechercheLancee] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!sessionStorage.getItem("access_token")) {
      router.replace("/login");
    }
  }, [router]);

  async function lancerRecherche(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const terme = recherche.trim();

    if (terme.length < 2) {
      setErreur("Saisissez au moins deux caractères pour lancer la recherche.");
      setResultats([]);
      setTotal(0);
      setRechercheLancee(false);
      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setChargement(true);
    setErreur("");
    setRechercheLancee(true);

    try {
      const reponse = await fetch(
        `${API}/api/historique?recherche=${encodeURIComponent(terme)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      const donnees: unknown = await reponse.json().catch(() => null);

      if (!reponse.ok) {
        throw new Error(extraireErreur(donnees));
      }

      const resultat = donnees as ReponseHistorique;

      setResultats(resultat.dossiers);
      setTotal(resultat.total);
      setTronque(resultat.resultatsTronques);
    } catch (erreurRecherche) {
      setErreur(
        erreurRecherche instanceof Error
          ? erreurRecherche.message
          : "Impossible de joindre le serveur.",
      );
      setResultats([]);
      setTotal(0);
      setTronque(false);
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="space-y-7">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold text-[#8C6A1E]">
          Consultation transversale
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Historique des dossiers
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Retrouvez un dossier avec sa référence, son numéro de BE, le nom d’un
          agent ou son IM. Les résultats suivent les droits de votre service.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form
          onSubmit={lancerRecherche}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="recherche-historique" className="sr-only">
            Référence, numéro de BE, nom ou IM de l’agent
          </label>

          <input
            id="recherche-historique"
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Référence, n° BE, nom d’agent ou IM"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528]"
          />

          <button
            type="submit"
            disabled={chargement}
            className="rounded-lg bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {chargement ? "Recherche..." : "Rechercher"}
          </button>
        </form>

        {erreur && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {erreur}
          </p>
        )}
      </section>

      {chargement && (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          Recherche des dossiers et de leur chronologie...
        </p>
      )}

      {!chargement && rechercheLancee && resultats.length === 0 && !erreur && (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-slate-800">
            Aucun dossier trouvé
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Vérifiez la référence, le numéro de BE, le nom ou l’IM saisi.
          </p>
        </section>
      )}

      {!chargement && resultats.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700">
              {total} dossier{total > 1 ? "s" : ""} trouvé
              {total > 1 ? "s" : ""}
            </h2>
            <p className="text-xs text-slate-500">
              Recherche : « {recherche.trim()} »
            </p>
          </div>

          {tronque && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Les 100 premiers résultats sont affichés. Affinez votre recherche
              pour consulter les autres dossiers.
            </p>
          )}

          {resultats.map((dossier) => (
            <article
              key={dossier.idDossier}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase text-[#8C6A1E]">
                      BE n° {dossier.numeroBE}
                    </span>
                    <span className="text-slate-300">/</span>
                    <span className="text-xs text-slate-500">
                      Dossier #{dossier.idDossier}
                    </span>
                  </div>

                  <h3 className="mt-2 break-words text-lg font-semibold text-slate-900">
                    {dossier.referenceDossier}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{dossier.objet}</p>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeStatut(
                      dossier.statut,
                    )}`}
                  >
                    {dossier.statut}
                  </span>
                  <span className="text-xs text-slate-500">
                    {libelleLocalisation(dossier.localisationActuelle)}
                  </span>
                </div>
              </div>

              <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <section>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Informations du dossier
                  </h4>

                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-slate-500">Reçu le</dt>
                      <dd className="mt-1 text-sm text-slate-800">
                        {formaterDate(dossier.dateReception)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-slate-500">
                        Agents associés
                      </dt>
                      <dd className="mt-1 text-sm text-slate-800">
                        {dossier.agents.length}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5">
                    <h5 className="text-xs font-semibold uppercase text-slate-500">
                      Agents
                    </h5>

                    <div className="mt-2 space-y-2">
                      {dossier.agents.map((agent) => (
                        <div
                          key={agent.idAgent}
                          className="rounded-lg border border-slate-200 p-3"
                        >
                          <p className="font-medium text-slate-900">
                            {agent.nomComplet}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            IM : {agent.IM || "—"}
                            {agent.numeroPension
                              ? ` · Pension : ${agent.numeroPension}`
                              : ""}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            CIN : {agent.CIN || "—"} · {agent.typeAgent}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {dossier.responsable && (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <h5 className="text-xs font-semibold uppercase text-slate-500">
                        Responsable du BE
                      </h5>
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {dossier.responsable.nom}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {dossier.responsable.telephone}
                        {dossier.responsable.email
                          ? ` · ${dossier.responsable.email}`
                          : ""}
                      </p>
                    </div>
                  )}
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Chronologie
                  </h4>

                  {(() => {
                    const chronologieAffichee = dossier.chronologie.filter(
                      (evenement) => !estEvenementRedondant(evenement),
                    );

                    if (chronologieAffichee.length === 0) {
                      return (
                        <p className="mt-3 text-sm text-slate-500">
                          Aucune action enregistrée pour ce dossier.
                        </p>
                      );
                    }

                    return (
                      <ol className="mt-4 space-y-0">
                        {chronologieAffichee.map((evenement, index) => {
                          const detailsUtiles = (evenement.details ?? "").trim();
                          const detailsAFaireApparaitre =
                            detailsUtiles &&
                            ![
                              "Renvoyé à la SecSRSP pour réorientation.",
                              "Transfert sans observation.",
                              "BE enregistré à la SecDRBF.",
                            ].includes(detailsUtiles);

                          return (
                            <li
                              key={`${evenement.type}-${evenement.date}-${index}`}
                              className="relative border-l border-amber-200 pb-5 pl-5 last:pb-0"
                            >
                              <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#B38528] shadow-sm" />

                              <p className="text-sm font-semibold text-slate-900">
                                {evenement.titre}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700">
                                  {formaterDate(evenement.date)}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="font-medium text-slate-700">
                                  {formatParcours(evenement)}
                                </span>
                              </div>

                              {detailsAFaireApparaitre && (
                                <p className="mt-2 text-sm leading-5 text-slate-600">
                                  {detailsUtiles}
                                </p>
                              )}

                              {evenement.dateReception && (
                                <p className="mt-2 text-xs text-slate-500">
                                  Réception : {formaterDate(evenement.dateReception)}
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    );
                  })()}

                  <div className="mt-5 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                      Localisation actuelle
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {libelleLocalisation(dossier.localisationActuelle)}
                    </p>
                  </div>
                </section>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}