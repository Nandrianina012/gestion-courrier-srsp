"use client";

import type { Dossier } from "./page";
import { objetsDossier } from "@/data/objetsDossier";

type Props = {
  dossier: Dossier | null;
  destination: string;
  observationsAgents: Record<number, string>;
  piecesCochees: Record<number, string[]>;
  onDestinationChange: (destination: string) => void;
  onObservationChange: (idAgent: number, observation: string) => void;
  onPieceChange: (
    idAgent: number,
    piece: string,
    cochee: boolean,
  ) => void;
  onFermer: () => void;
  onConfirmer: () => void;
};

const destinations = [
  {
    value: "DIVISION_VISA",
    label: "Division VISA",
  },
  {
    value: "DIVISION_SOLDE",
    label: "Division SOLDE",
  },
  {
    value: "DIVISION_PENSIONS",
    label: "Division PENSIONS",
  },
  {
    value: "DIVISION_SECOURS",
    label: "Division SECOURS",
  },
];

export default function TransfertModal({
  dossier,
  destination,
  observationsAgents,
  piecesCochees,
  onDestinationChange,
  onObservationChange,
  onPieceChange,
  onFermer,
  onConfirmer,
}: Props) {
  if (!dossier) return null;

  const objetDossier = objetsDossier.find(
    (element) => element.objet === dossier.objet,
  );

  const pieces = objetDossier?.pieces ?? [];

  const destinationLabel =
    destinations.find((item) => item.value === destination)?.label ??
    "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onFermer}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-transfert-dossier"
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="titre-transfert-dossier"
              className="text-lg font-semibold text-slate-900"
            >
              Transfert du BE n°{dossier.numeroBE}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {dossier.referenceDossier} — {dossier.objet}
            </p>
          </div>

          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer le transfert"
            className="text-xl text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Division destinataire
            </label>

            <select
              value={destination}
              onChange={(e) => onDestinationChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528]"
            >
              <option value="">Sélectionner une division</option>

              {destinations.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <p className="mt-1.5 text-xs text-slate-500">
              Tous les dossiers de ce BE seront transférés vers cette
              même division.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Vérification des pièces
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              La vérification est effectuée séparément pour chaque agent.
            </p>
          </div>

          <div className="space-y-5">
            {dossier.agents.map((agent, index) => {
              const piecesAgent =
                piecesCochees[agent.idAgent] ?? [];

              return (
                <div
                  key={agent.idAgent}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-4">
                    <h4 className="font-semibold text-slate-900">
                      Agent {index + 1} —{" "}
                      {agent.nomComplet || "Nom non renseigné"}
                    </h4>

                    <p className="mt-1 text-xs text-slate-500">
                      IM : {agent.IM || "—"} · ID dossier :{" "}
                      {agent.idAgent}
                    </p>
                  </div>

                  {pieces.length > 0 ? (
                    <div className="space-y-2">
                      {pieces.map((piece) => {
                        const cochee = piecesAgent.includes(piece);

                        return (
                          <label
                            key={piece}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:bg-amber-50"
                          >
                            <input
                              type="checkbox"
                              checked={cochee}
                              onChange={(e) =>
                                onPieceChange(
                                  agent.idAgent,
                                  piece,
                                  e.target.checked,
                                )
                              }
                              className="mt-0.5 h-4 w-4 accent-[#8C6A1E]"
                            />

                            <span className="text-sm text-slate-700">
                              {piece}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-white p-3 text-sm text-amber-700">
                      Aucune liste de pièces n'est définie pour cet
                      objet.
                    </p>
                  )}

                  <div className="mt-5">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Observation
                    </label>

                    <textarea
                      value={
                        observationsAgents[agent.idAgent] ?? ""
                      }
                      onChange={(e) =>
                        onObservationChange(
                          agent.idAgent,
                          e.target.value,
                        )
                      }
                      rows={3}
                      placeholder="Ex. Complet ou Manque : ..."
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {destination
              ? `Destination : ${destinationLabel}`
              : "Aucune division sélectionnée"}
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onFermer}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </button>

            <button
              type="button"
              disabled={!destination}
              onClick={onConfirmer}
              className="rounded-lg bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] px-5 py-2.5 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {destination
                ? `Transférer vers ${destinationLabel}`
                : "Sélectionner une division"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}