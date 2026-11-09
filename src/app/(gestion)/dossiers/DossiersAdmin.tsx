
"use client";

import { useMemo, useState } from "react";
import type { Dossier } from "./page";

type Props = {
  dossiers: Dossier[];
  chargement: boolean;
  rechercheActive: boolean;
  onDetails: (dossier: Dossier) => void;
  onTransfert: (dossier: Dossier) => void;
};

type StatutFiltre =
  | "tous"
  | "En attente"
  | "En cours de traitement"
  | "Validé"
  | "Rejeté"
  | "Remis";

const STATUTS: StatutFiltre[] = [
  "tous",
  "En attente",
  "En cours de traitement",
  "Validé",
  "Rejeté",
  "Remis",
];

const ORDRE_SITUATIONS = [
  "SecDRBF",
  "SecSRSP",
  "DIVISION_SOLDE",
  "DIVISION_VISA",
  "DIVISION_PENSIONS",
  "DIVISION_SECOURS",
  "Au responsable",
];

function formaterDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR");
}

function nomDestination(destination: string | null) {
  if (!destination) return "—";

  const destinations: Record<string, string> = {
    SecDRBF: "Secrétariat DRBF",
    SecSRSP: "Secrétariat SRSP",
    DIVISION_SOLDE: "Division SOLDE",
    DIVISION_VISA: "Division VISA",
    DIVISION_PENSIONS: "Division PENSIONS",
    DIVISION_SECOURS: "Division SECOURS",
    "Au responsable": "Au responsable",
  };

  return destinations[destination] ?? destination;
}

// Récupère les statuts des dossiers associés au BE.
// Si le BE ne possède pas de tableau de dossiers,
// on utilise son propre statut.
function obtenirStatuts(dossier: Dossier): string[] {
  const statutsEnfants = dossier.dossiers
    ?.map((element) => element.statutDossier)
    .filter((statut): statut is string => Boolean(statut));

  if (statutsEnfants && statutsEnfants.length > 0) {
    return [...new Set(statutsEnfants)];
  }

  return dossier.statutDossier ? [dossier.statutDossier] : [];
}

// Récupère la situation actuelle du dossier.
function obtenirSituation(dossier: Dossier) {
  return dossier.localisationActuelle ?? dossier.destination ?? "";
}

export default function DossiersAdmin({
  dossiers,
  chargement,
  rechercheActive,
  onDetails,
  onTransfert,
}: Props) {
  const [menuOuvert, setMenuOuvert] = useState<number | null>(null);

  const [situationFiltre, setSituationFiltre] = useState("toutes");

  const [statutFiltre, setStatutFiltre] =
    useState<StatutFiltre>("tous");

  const [ordreBE, setOrdreBE] = useState<"desc" | "asc">("desc");

  // Les situations sont récupérées à partir des données reçues.
  // Cela permet aussi d'afficher une situation supplémentaire
  // si elle apparaît dans les données de l'application.
  const situationsDisponibles = useMemo(() => {
    const situations = [
      ...new Set(
        dossiers
          .map((dossier) => obtenirSituation(dossier))
          .filter(Boolean),
      ),
    ];

    return situations.sort((a, b) => {
      const indexA = ORDRE_SITUATIONS.indexOf(a);
      const indexB = ORDRE_SITUATIONS.indexOf(b);

      if (indexA === -1 && indexB === -1) {
        return a.localeCompare(b, "fr");
      }

      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }, [dossiers]);

  // Application des filtres et du tri.
  const dossiersAffiches = useMemo(() => {
    return [...dossiers]
      .filter((dossier) => {
        if (
          situationFiltre !== "toutes" &&
          obtenirSituation(dossier) !== situationFiltre
        ) {
          return false;
        }

        if (
          statutFiltre !== "tous" &&
          !obtenirStatuts(dossier).includes(statutFiltre)
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const difference = Number(a.numeroBE) - Number(b.numeroBE);

        if (difference !== 0) {
          return ordreBE === "desc" ? -difference : difference;
        }

        return ordreBE === "desc"
          ? b.idDossier - a.idDossier
          : a.idDossier - b.idDossier;
      });
  }, [dossiers, situationFiltre, statutFiltre, ordreBE]);

  function changerOrdreBE() {
    setOrdreBE((ancien) => (ancien === "desc" ? "asc" : "desc"));
  }

  function reinitialiserFiltres() {
    setSituationFiltre("toutes");
    setStatutFiltre("tous");
    setOrdreBE("desc");
  }

  const filtresActifs =
    situationFiltre !== "toutes" || statutFiltre !== "tous";

  return (
    <div className="mt-5">
      {/* Filtres d'administration */}
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Filtrer les dossiers
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Affinez la liste selon la localisation actuelle et le statut.
            </p>
          </div>

          {filtresActifs && (
            <button
              type="button"
              onClick={reinitialiserFiltres}
              className="text-sm font-medium text-[#8C6A1E] hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="filtre-situation-admin"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Localisation actuelle
            </label>

            <select
              id="filtre-situation-admin"
              value={situationFiltre}
              onChange={(e) => setSituationFiltre(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528]"
            >
              <option value="toutes">Toutes les situations</option>

              {situationsDisponibles.map((situation) => (
                <option key={situation} value={situation}>
                  {nomDestination(situation)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filtre-statut-admin"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Statut du dossier
            </label>

            <select
              id="filtre-statut-admin"
              value={statutFiltre}
              onChange={(e) =>
                setStatutFiltre(e.target.value as StatutFiltre)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528]"
            >
              {STATUTS.map((statut) => (
                <option key={statut} value={statut}>
                  {statut === "tous" ? "Tous les statuts" : statut}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des dossiers */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-amber-50 text-slate-700">
              <th className="px-4 py-3 font-semibold">
                <button
                  type="button"
                  onClick={changerOrdreBE}
                  title="Changer l'ordre de tri"
                  className="inline-flex items-center gap-2 hover:text-[#8C6A1E]"
                >
                  N° BE
                  <span className="text-[#8C6A1E]">
                    {ordreBE === "desc" ? "↓" : "↑"}
                  </span>
                </button>
              </th>

              <th className="px-4 py-3 font-semibold">Enregistré le</th>
              <th className="px-4 py-3 font-semibold">Référence</th>
              <th className="px-4 py-3 font-semibold">Agents</th>
              <th className="px-4 py-3 font-semibold">Objet</th>
              <th className="px-4 py-3 font-semibold">Origine</th>
              <th className="px-4 py-3 font-semibold">
                Localisation actuelle
              </th>
              <th className="px-4 py-3 font-semibold">Statut(s)</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {chargement ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  Chargement des dossiers...
                </td>
              </tr>
            ) : dossiersAffiches.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  {rechercheActive || filtresActifs
                    ? "Aucun dossier ne correspond aux critères sélectionnés."
                    : "Aucun dossier enregistré pour le moment."}
                </td>
              </tr>
            ) : (
              dossiersAffiches.map((dossier) => {
                const nomsAgents = dossier.agents
                  .map((agent) => agent.nomComplet)
                  .filter(Boolean);

                const imsAgents = dossier.agents
                  .map((agent) => agent.IM)
                  .filter(Boolean);

                const statuts = obtenirStatuts(dossier);

                return (
                  <tr
                    key={dossier.idDossier ?? dossier.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-semibold text-[#705212]">
                      {dossier.numeroBE}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {formaterDate(dossier.dateReception)}
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-900">
                      {dossier.referenceDossier}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      <div>{dossier.agents.length} agent(s)</div>

                      <div
                        className="mt-1 max-w-xs truncate text-xs text-slate-500"
                        title={nomsAgents.join(", ")}
                      >
                        {nomsAgents.join(", ") ||
                          imsAgents.join(", ") ||
                          "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {dossier.objet}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {nomDestination(dossier.origine)}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {nomDestination(obtenirSituation(dossier) || null)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex max-w-[220px] flex-wrap gap-1.5">
                        {statuts.length > 0 ? (
                          statuts.map((statut) => (
                            <span
                              key={statut}
                              className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-[#705212]"
                            >
                              {statut}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    <td className="relative px-4 py-3">
                      <div className="relative text-right">
                        <button
                          type="button"
                          aria-label="Ouvrir les actions du dossier"
                          aria-expanded={menuOuvert === dossier.id}
                          onClick={() =>
                            setMenuOuvert(
                              menuOuvert === dossier.id ? null : dossier.id,
                            )
                          }
                          className="rounded-lg px-3 py-1.5 text-xl font-bold text-slate-600 hover:bg-amber-50 hover:text-[#8C6A1E]"
                        >
                          ⋮
                        </button>

                        {menuOuvert === dossier.id && (
                          <div className="absolute right-4 top-10 z-30 w-48 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg">
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOuvert(null);
                                onDetails(dossier);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-amber-50 hover:text-[#8C6A1E]"
                            >
                              Détails
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setMenuOuvert(null);
                                onTransfert(dossier);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-amber-50 hover:text-[#8C6A1E]"
                            >
                              Transfert
                            </button>

                            <button
                              type="button"
                              disabled
                              title="Le traitement sera activé dans une prochaine étape."
                              className="w-full cursor-not-allowed px-4 py-2.5 text-left text-sm text-slate-400"
                            >
                              Viser
                            </button>

                            <button
                              type="button"
                              disabled
                              title="Le traitement sera activé dans une prochaine étape."
                              className="w-full cursor-not-allowed px-4 py-2.5 text-left text-sm text-slate-400"
                            >
                              Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        {dossiersAffiches.length} dossier(s) affiché(s)
        {dossiersAffiches.length !== dossiers.length &&
          ` sur ${dossiers.length}`}
      </p>
    </div>
  );
}
