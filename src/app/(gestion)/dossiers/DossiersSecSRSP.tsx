"use client";

import { useState } from "react";
import type { Dossier } from "./page";

type Props = {
  dossiers: Dossier[];
  chargement: boolean;
  rechercheActive: boolean;
  onDetails: (dossier: Dossier) => void;
  onTransfert: (dossier: Dossier) => void;
};

type SituationFiltre = "non_transferes" | "transferes" | "tous";
type StatutFiltre =
  | "tous"
  | "En attente"
  | "En cours de traitement"
  | "Validé"
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

function resumeStatuts(
  dossiers: {
    idDossier: number;
    idAgent: number | null;
    statutDossier: string;
  }[],
) {
  const compteurs: Record<string, number> = {};

  for (const dossier of dossiers) {
    const statut = dossier.statutDossier || "Inconnu";
    compteurs[statut] = (compteurs[statut] || 0) + 1;
  }

  const ordre = [
    "En attente",
    "En cours de traitement",
    "Validé",
    "Rejeté",
    "Remis",
  ];

  return ordre
    .filter((statut) => compteurs[statut])
    .map((statut) => {
      const nombre = compteurs[statut];

      const libelle =
        statut === "Validé" && nombre > 1
          ? "Validés"
          : statut === "Rejeté" && nombre > 1
            ? "Rejetés"
            : statut;

      return `${nombre} ${libelle}`;
    })
    .join(" · ");
}

function estNonTransfere(dossier: Dossier) {
  return dossier.localisationActuelle === "SecSRSP";
}

function estTransfereVersDivision(dossier: Dossier) {
  return (dossier.localisationActuelle ?? "").startsWith("DIVISION_");
}

function bePossedeStatut(dossier: Dossier, statut: StatutFiltre) {
  if (statut === "tous") return true;

  const lignes = dossier.dossiers ?? [];

  if (lignes.length === 0) {
    return dossier.statutDossier === statut;
  }

  return lignes.some((ligne) => ligne.statutDossier === statut);
}

export default function DossiersSecSRSP({
  dossiers,
  chargement,
  rechercheActive,
  onDetails,
  onTransfert,
}: Props) {
  const [menuOuvert, setMenuOuvert] = useState<number | null>(null);
  const [situation, setSituation] = useState<SituationFiltre>("non_transferes");
  const [statut, setStatut] = useState<StatutFiltre>("tous");
  const [ordreBEDesc, setOrdreBEDesc] = useState(true);

  const dossiersAffiches = dossiers
    .filter((dossier) => {
      if (situation === "non_transferes") {
        return estNonTransfere(dossier);
      }

      if (situation === "transferes") {
        return estTransfereVersDivision(dossier);
      }

      return true;
    })
    .filter((dossier) => bePossedeStatut(dossier, statut))
    .slice()
    .sort((a, b) =>
      ordreBEDesc ? b.numeroBE - a.numeroBE : a.numeroBE - b.numeroBE,
    );

  const messageVide =
    dossiers.length === 0
      ? rechercheActive
        ? "Aucun BE ne correspond à votre recherche."
        : "Aucun BE enregistré pour le moment."
      : "Aucun BE ne correspond aux filtres sélectionnés.";

  return (
    <div className="mt-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label
            htmlFor="filtre-situation-srsp"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Situation
          </label>
          <select
            id="filtre-situation-srsp"
            value={situation}
            onChange={(e) =>
              setSituation(e.target.value as SituationFiltre)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528] sm:min-w-[200px]"
          >
            <option value="non_transferes">Non transférés</option>
            <option value="transferes">Transféré(s)</option>
            <option value="tous">Tous les BE</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="filtre-statut-srsp"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Statut
          </label>
          <select
            id="filtre-statut-srsp"
            value={statut}
            onChange={(e) => setStatut(e.target.value as StatutFiltre)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528] sm:min-w-[220px]"
          >
            <option value="tous">Tous les dossiers</option>
            <option value="En attente">En attente</option>
            <option value="En cours de traitement">
              En cours de traitement
            </option>
            <option value="Validé">Validé(s)</option>
            <option value="Rejeté">Rejeté(s)</option>
            <option value="Remis">Remis</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-amber-50 text-slate-700">
              <th className="px-4 py-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setOrdreBEDesc((actuel) => !actuel)}
                  className="inline-flex items-center gap-1 hover:text-[#8C6A1E]"
                >
                  N° BE
                  <span className="text-xs">
                    {ordreBEDesc ? "↓" : "↑"}
                  </span>
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">Enregistré le</th>
              <th className="px-4 py-3 font-semibold">Référence</th>
              <th className="px-4 py-3 font-semibold">Agents</th>
              <th className="px-4 py-3 font-semibold">Objet</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Transmis le</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {chargement ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  Chargement des BE...
                </td>
              </tr>
            ) : dossiersAffiches.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  {messageVide}
                </td>
              </tr>
            ) : (
              dossiersAffiches.map((dossier) => {
                const idLigne = dossier.idDossier ?? dossier.id;
                const nombreAgents = dossier.agents.length;
                const statutAffiche = resumeStatuts(dossier.dossiers ?? []);

                const dateTransmission =
                  dossier.destination &&
                  dossier.destination.startsWith("DIVISION_")
                    ? formaterDate(dossier.dateEnvoi)
                    : "—";

                return (
                  <tr
                    key={idLigne}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-semibold text-[#705212]">
                      BE n°{dossier.numeroBE}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {formaterDate(dossier.dateReception)}
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-900">
                      {dossier.referenceDossier}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      <div className="text-xs text-slate-500">
                        {nombreAgents}{" "}
                        {nombreAgents > 1 ? "agents" : "agent"}
                      </div>

                      <div className="mt-1 space-y-0.5 text-sm text-slate-700">
                        {dossier.agents.slice(0, 2).map((agent) => (
                          <div key={agent.idAgent}>
                            {agent.nomComplet || "Nom indisponible"}
                          </div>
                        ))}

                        {nombreAgents > 2 && (
                          <div className="text-xs text-slate-400">
                            + {nombreAgents - 2} autre
                            {nombreAgents - 2 > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {dossier.objet}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-[#705212]">
                        {statutAffiche}
                      </span>

                      {dossier.destination && (
                        <div className="mt-1 text-xs text-slate-500">
                          Localisation : {nomDestination(dossier.destination)}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {dateTransmission}
                    </td>

                    <td className="relative px-4 py-3">
                      <div className="relative text-right">
                        <button
                          type="button"
                          aria-label={`Ouvrir les actions du BE ${dossier.numeroBE}`}
                          aria-expanded={menuOuvert === idLigne}
                          onClick={() =>
                            setMenuOuvert(
                              menuOuvert === idLigne ? null : idLigne,
                            )
                          }
                          className="rounded-lg px-3 py-1.5 text-xl font-bold text-slate-600 hover:bg-amber-50 hover:text-[#8C6A1E]"
                        >
                          ⋮
                        </button>

                        {menuOuvert === idLigne && (
                          <div className="absolute right-4 top-10 z-30 w-48 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg">
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOuvert(null);
                                onDetails(dossier);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-amber-50 hover:text-[#8C6A1E]"
                            >
                              Détails du BE
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setMenuOuvert(null);
                                onTransfert(dossier);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-amber-50 hover:text-[#8C6A1E]"
                            >
                              Transmettre le BE
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
        {dossiersAffiches.length} BE affiché
        {dossiersAffiches.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}