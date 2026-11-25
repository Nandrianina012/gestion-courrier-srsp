"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Dossier } from "./page";
import MenuActionsPortail from "./MenuActionsPortail";

type Props = {
  dossiers: Dossier[];
  chargement: boolean;
  rechercheActive: boolean;
  filtrePeriode: ReactNode;
  onDetails: (dossier: Dossier) => void;
};

type SituationFiltre = "enregistres" | "transferes" | "tous";
type StatutFiltre =
  | "tous"
  | "En attente"
  | "Visé"
  | "Rejeté"
  | "Remis";

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
  };

  return destinations[destination] ?? destination;
}

function resumeStatuts(dossiers: { statutDossier: string }[]) {
  const compteurs: Record<string, number> = {};

  for (const dossier of dossiers) {
    const statut = dossier.statutDossier || "Inconnu";
    compteurs[statut] = (compteurs[statut] || 0) + 1;
  }

  const ordre = [
    "En attente",
    "Visé",
    "Rejeté",
    "Remis",
  ];

  return ordre
    .filter((statut) => compteurs[statut])
    .map((statut) => `${compteurs[statut]} ${statut}`)
    .join(" · ");
}

function beEstEnregistre(dossier: Dossier) {
  return dossier.localisationActuelle === "SecDRBF";
}

function dossierEnSouffrance(dossier: Dossier) {
  if (dossier.statutDossier !== "En attente" || !dossier.dateEnvoi) {
    return false;
  }

  const dateArrivee = new Date(dossier.dateEnvoi).getTime();
  const delai = 5 * 24 * 60 * 60 * 1000;

  return (
    Number.isFinite(dateArrivee) &&
    Date.now() - dateArrivee >= delai
  );
}

function bePossedeStatut(dossier: Dossier, statut: StatutFiltre) {
  if (statut === "tous") return true;

  const lignes = dossier.dossiers ?? [];

  if (lignes.length === 0) {
    return dossier.statutDossier === statut;
  }

  return lignes.some((ligne) => ligne.statutDossier === statut);
}

export default function DossiersSecDRBF({
  dossiers,
  chargement,
  rechercheActive,
  filtrePeriode,
  onDetails,
}: Props) {
  const [menuOuvert, setMenuOuvert] = useState<number | null>(null);
  const [ancreMenu, setAncreMenu] = useState<HTMLButtonElement | null>(null);
  const [situation, setSituation] = useState<SituationFiltre>("enregistres");
  const [statut, setStatut] = useState<StatutFiltre>("tous");
  const [ordreBEDesc, setOrdreBEDesc] = useState(true);

  const dossiersAffiches = useMemo(() => {
    return [...dossiers]
      .filter((dossier) => {
        if (situation === "enregistres") return beEstEnregistre(dossier);
        if (situation === "transferes") return !beEstEnregistre(dossier);
        return true;
      })
      .filter((dossier) => bePossedeStatut(dossier, statut))
      .sort((a, b) =>
        ordreBEDesc ? b.numeroBE - a.numeroBE : a.numeroBE - b.numeroBE,
      );
  }, [dossiers, situation, statut, ordreBEDesc]);

  const messageVide =
    dossiers.length === 0
      ? rechercheActive
        ? "Aucun dossier ne correspond à votre recherche."
        : "Aucun dossier enregistré pour le moment."
      : "Aucun BE ne correspond aux filtres sélectionnés.";

  return (
    <div className="mt-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="filtre-situation-drbf"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Situation
          </label>
          <select
            id="filtre-situation-drbf"
            value={situation}
            onChange={(e) =>
              setSituation(e.target.value as SituationFiltre)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528] sm:min-w-[200px]"
          >
            <option value="enregistres">Enregistré(s)</option>
            <option value="transferes">Transféré(s)</option>
            <option value="tous">Tous les BE</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="filtre-statut-drbf"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Statut
          </label>
          <select
            id="filtre-statut-drbf"
            value={statut}
            onChange={(e) => setStatut(e.target.value as StatutFiltre)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528] sm:min-w-[220px]"
          >
            <option value="tous">Tous les dossiers</option>
            <option value="En attente">En attente</option>
            
            <option value="Visé">Visé(s)</option>
            <option value="Rejeté">Rejeté(s)</option>
            <option value="Remis">Remis</option>
          </select>
        </div>
        </div>

        {filtrePeriode}
      </div>

      <div className="space-y-3 xl:hidden">
        {chargement ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Chargement des dossiers...
          </p>
        ) : dossiersAffiches.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{messageVide}</p>
        ) : (
          dossiersAffiches.map((dossier) => (
            <article
              key={dossier.idDossier ?? dossier.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    BE n°{dossier.numeroBE}
                  </p>
                  <h3 className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {dossier.referenceDossier}
                  </h3>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-[#705212]">
                  {resumeStatuts(dossier.dossiers ?? []) || "—"}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Enregistré le</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {formaterDate(dossier.dateReception)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Agents</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {dossier.agents.length}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Objet</dt>
                  <dd className="mt-0.5 break-words text-slate-800">
                    {dossier.objet}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Agents concernés</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {dossier.agents.map((agent) => agent.nomComplet).filter(Boolean).join(", ") || "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onDetails(dossier)}
                  className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Détails
                </button>
                <button
                  type="button"
                  disabled
                  className="min-h-11 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-400"
                >
                  Modifier
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-amber-50 text-slate-700">
              <th className="px-4 py-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setOrdreBEDesc((actuel) => !actuel)}
                  className="inline-flex items-center gap-1 hover:text-[#8C6A1E]"
                  aria-label={
                    ordreBEDesc
                      ? "Trier par numéro de BE croissant"
                      : "Trier par numéro de BE décroissant"
                  }
                >
                  N° BE
                  <span className="text-xs" aria-hidden="true">
                    {ordreBEDesc ? "↓" : "↑"}
                  </span>
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">Enregistré le</th>
              <th className="px-4 py-3 font-semibold">Référence</th>
              <th className="px-4 py-3 font-semibold">Agents</th>
              <th className="px-4 py-3 font-semibold">Objet</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {chargement ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  Chargement des dossiers...
                </td>
              </tr>
            ) : dossiersAffiches.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  {messageVide}
                </td>
              </tr>
            ) : (
              dossiersAffiches.map((dossier) => {
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
                      <div className="text-xs text-slate-500">
                        {dossier.agents.length}{" "}
                        {dossier.agents.length > 1 ? "agents" : "agent"}
                      </div>

                      <div className="mt-1 space-y-0.5 text-sm text-slate-700">
                        {dossier.agents.slice(0, 2).map((agent) => (
                          <div key={agent.idAgent}>{agent.nomComplet}</div>
                        ))}

                        {dossier.agents.length > 2 && (
                          <div className="text-xs text-slate-400">
                            + {dossier.agents.length - 2} autre
                            {dossier.agents.length - 2 > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {dossier.objet}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-all duration-200 ${
                          dossierEnSouffrance(dossier)
                            ? "animate-[pulse_1.2s_ease-in-out_infinite] border-red-300 bg-red-100 text-red-800 ring-4 ring-red-200/70"
                            : "border-amber-200 bg-amber-50 text-[#705212]"
                        }`}
                      >
                        {dossierEnSouffrance(dossier) && (
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
                        )}
                        {resumeStatuts(dossier.dossiers ?? [])}
                      </span>
                    </td>

                    <td className="relative px-4 py-3">
                      <div className="relative text-right">
                        <button
                          type="button"
                          aria-label="Ouvrir les actions du dossier"
                          aria-expanded={menuOuvert === dossier.id}
                          onClick={(evenement) => {
                            if (menuOuvert === dossier.id) {
                              setMenuOuvert(null);
                              setAncreMenu(null);
                            } else {
                              setMenuOuvert(dossier.id);
                              setAncreMenu(evenement.currentTarget);
                            }
                          }}
                          className="rounded-lg px-3 py-1.5 text-xl font-bold text-slate-600 hover:bg-amber-50 hover:text-[#8C6A1E]"
                        >
                          ⋮
                        </button>

                        {menuOuvert === dossier.id && (
                          <MenuActionsPortail
                            ancre={ancreMenu}
                            largeur="w-48"
                            onFermer={() => setMenuOuvert(null)}
                          >
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
                              disabled
                              title="La modification sera ajoutée dans une prochaine étape."
                              className="w-full cursor-not-allowed px-4 py-2.5 text-left text-sm text-slate-400"
                            >
                              Modifier
                            </button>
                          </MenuActionsPortail>
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
        {dossiersAffiches.length} BE affiché
        {dossiersAffiches.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}