"use client";

import { useState } from "react";
import type { Dossier } from "./page";

type Props = {
  dossiers: Dossier[];
  chargement: boolean;
  rechercheActive: boolean;
  onDetails: (dossier: Dossier) => void;
  onRenvoyer: (dossier: Dossier) => void;
  onCommencerTraitement: (dossier: Dossier) => void;
  onValider: (dossier: Dossier) => void;
  onRejeter: (dossier: Dossier) => void;
  onRemettreResponsable: (dossier: Dossier) => void;
};

type StatutFiltre =
  | "En attente"
  | "En cours de traitement"
  | "Validé"
  | "Rejeté"
  | "Remis";

function formaterDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR");
}

function statutDuDossier(dossier: Dossier) {
  return dossier.statutDossier || dossier.statutTransmission || "";
}

export default function DossiersDivision({
  dossiers,
  chargement,
  rechercheActive,
  onDetails,
  onRenvoyer,
  onCommencerTraitement,
  onValider,
  onRejeter,
  onRemettreResponsable,
}: Props) {
  const [menuOuvert, setMenuOuvert] = useState<number | null>(null);
  const [statut, setStatut] = useState<StatutFiltre>("En attente");
  const [ordreBEDesc, setOrdreBEDesc] = useState(true);

  const dossiersAffiches = dossiers
    .filter((dossier) => statutDuDossier(dossier) === statut)
    .slice()
    .sort((a, b) => {
      if (a.numeroBE !== b.numeroBE) {
        return ordreBEDesc
          ? b.numeroBE - a.numeroBE
          : a.numeroBE - b.numeroBE;
      }

      // Même BE : on garde un ordre stable par n° de dossier.
      return b.idDossier - a.idDossier;
    });

  const messageVide =
    dossiers.length === 0
      ? rechercheActive
        ? "Aucun dossier ne correspond à votre recherche."
        : "Aucun dossier à traiter pour le moment."
      : "Aucun dossier ne correspond au statut sélectionné.";

  return (
    <div className="mt-5">
      <div className="mb-4">
        <label
          htmlFor="filtre-statut-division"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Statut
        </label>
        <select
          id="filtre-statut-division"
          value={statut}
          onChange={(e) => setStatut(e.target.value as StatutFiltre)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528] sm:max-w-[260px]"
        >
          <option value="En attente">En attente</option>
          <option value="En cours de traitement">
            En cours de traitement
          </option>
          <option value="Validé">Validé(s)</option>
          <option value="Rejeté">Rejeté(s)</option>
          <option value="Remis">Remis</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-amber-50 text-slate-700">
              <th className="px-4 py-3 font-semibold">N° dossier</th>
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
              <th className="px-4 py-3 font-semibold">Reçu le</th>
              <th className="px-4 py-3 font-semibold">Référence</th>
              <th className="px-4 py-3 font-semibold">IM Agent</th>
              <th className="px-4 py-3 font-semibold">Objet</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Observation</th>
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
                  {messageVide}
                </td>
              </tr>
            ) : (
              dossiersAffiches.map((dossier) => {
                const agent = dossier.agents[0];
                const statutLigne = statutDuDossier(dossier);

                const peutRenvoyer = statutLigne === "En attente";
                const peutDecider = statutLigne === "En cours de traitement";
                const peutRemettreResponsable =
                  statutLigne === "Validé" || statutLigne === "Rejeté";

                return (
                  <tr
                    key={dossier.idDossier ?? dossier.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-semibold text-[#705212]">
                      {dossier.idDossier}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {dossier.numeroBE}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {formaterDate(dossier.dateReception)}
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-900">
                      {dossier.referenceDossier}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {agent?.IM || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {dossier.objet}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-[#705212]">
                        {statutLigne || "—"}
                      </span>
                    </td>

                    <td className="max-w-xs px-4 py-3 text-slate-600">
                      <span className="block truncate">
                        {dossier.informationsComplementaires || "—"}
                      </span>
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
                          <div className="absolute right-4 top-10 z-30 w-56 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg">
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
                              disabled={!peutRenvoyer}
                              title={
                                peutRenvoyer
                                  ? "Renvoyer ce dossier à la SecSRSP"
                                  : "Le dossier ne peut plus être renvoyé après le début du traitement."
                              }
                              onClick={() => {
                                if (!peutRenvoyer) return;

                                setMenuOuvert(null);
                                onRenvoyer(dossier);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm ${
                                peutRenvoyer
                                  ? "text-slate-700 hover:bg-amber-50 hover:text-[#8C6A1E]"
                                  : "cursor-not-allowed text-slate-400"
                              }`}
                            >
                              Renvoyer à Sec SRSP
                            </button>

                            <button
                              type="button"
                              disabled={!peutRenvoyer}
                              title={
                                peutRenvoyer
                                  ? "Commencer le traitement de ce dossier"
                                  : "Le traitement a déjà commencé."
                              }
                              onClick={() => {
                                if (!peutRenvoyer) return;

                                setMenuOuvert(null);
                                onCommencerTraitement(dossier);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm ${
                                peutRenvoyer
                                  ? "text-slate-700 hover:bg-amber-50 hover:text-[#8C6A1E]"
                                  : "cursor-not-allowed text-slate-400"
                              }`}
                            >
                              Commencer le traitement
                            </button>

                            <button
                              type="button"
                              disabled={!peutDecider}
                              title={
                                peutDecider
                                  ? "Valider ce dossier"
                                  : "Le dossier doit être en cours de traitement pour être validé."
                              }
                              onClick={() => {
                                if (!peutDecider) return;

                                setMenuOuvert(null);
                                onValider(dossier);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm ${
                                peutDecider
                                  ? "text-slate-700 hover:bg-amber-50 hover:text-[#8C6A1E]"
                                  : "cursor-not-allowed text-slate-400"
                              }`}
                            >
                              Valider
                            </button>

                            <button
                              type="button"
                              disabled={!peutDecider}
                              title={
                                peutDecider
                                  ? "Rejeter ce dossier"
                                  : "Le dossier doit être en cours de traitement pour être rejeté."
                              }
                              onClick={() => {
                                if (!peutDecider) return;

                                setMenuOuvert(null);
                                onRejeter(dossier);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm ${
                                peutDecider
                                  ? "text-red-600 hover:bg-red-50"
                                  : "cursor-not-allowed text-slate-400"
                              }`}
                            >
                              Rejeter
                            </button>

                            <button
                              type="button"
                              disabled={!peutRemettreResponsable}
                              title={
                                peutRemettreResponsable
                                  ? "Remettre le dossier au responsable"
                                  : "Le dossier doit être validé ou rejeté pour être remis au responsable."
                              }
                              onClick={() => {
                                if (!peutRemettreResponsable) return;

                                setMenuOuvert(null);
                                onRemettreResponsable(dossier);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm ${
                                peutRemettreResponsable
                                  ? "text-slate-700 hover:bg-amber-50 hover:text-[#8C6A1E]"
                                  : "cursor-not-allowed text-slate-400"
                              }`}
                            >
                              Remettre au responsable
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
        {dossiersAffiches.length} dossier
        {dossiersAffiches.length > 1 ? "s" : ""} affiché
        {dossiersAffiches.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}