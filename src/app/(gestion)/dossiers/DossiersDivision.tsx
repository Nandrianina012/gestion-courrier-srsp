"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { Dossier } from "./page";
import MenuActionsPortail from "./MenuActionsPortail";

type Props = {
  dossiers: Dossier[];
  chargement: boolean;
  rechercheActive: boolean;
  filtrePeriode: ReactNode;
  onDetails: (dossier: Dossier) => void;
  onRenvoyer: (dossier: Dossier) => void;
  onViser: (dossier: Dossier) => void;
  onRejeter: (dossier: Dossier) => void;
  onRemettreResponsable: (dossier: Dossier) => void;
};

type StatutFiltre = "tous" | "En attente" | "Visé" | "Rejeté" | "Remis";

function formaterDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR");
}

function normaliserStatutAffichage(statut: string | null | undefined) {
  if (!statut) return "";

  const statuts: Record<string, string> = {
    Validé: "Visé",
  };

  return statuts[statut] ?? statut;
}

function statutDuDossier(dossier: Dossier) {
  return normaliserStatutAffichage(
    dossier.statutDossier || dossier.statutTransmission || "",
  );
}

function dossierEnSouffrance(dossier: Dossier) {
  if (dossier.statutDossier !== "En attente" || !dossier.dateEnvoi) {
    return false;
  }

  const dateArriveeDansLaDivision = new Date(dossier.dateEnvoi).getTime();
  const cinqJoursEnMillisecondes = 5 * 24 * 60 * 60 * 1000;

  return (
    Number.isFinite(dateArriveeDansLaDivision) &&
    Date.now() - dateArriveeDansLaDivision >= cinqJoursEnMillisecondes
  );
}

export default function DossiersDivision({
  dossiers,
  chargement,
  rechercheActive,
  filtrePeriode,
  onDetails,
  onRenvoyer,
  onViser,
  onRejeter,
  onRemettreResponsable,
}: Props) {
  const [menuOuvert, setMenuOuvert] = useState<number | null>(null);
  const [ancreMenu, setAncreMenu] = useState<HTMLButtonElement | null>(null);
  const [statut, setStatut] = useState<StatutFiltre>("En attente");
  const [ordreBEDesc, setOrdreBEDesc] = useState(true);

  const dossiersAffiches = dossiers
    .filter((dossier) => statut === "tous" || statutDuDossier(dossier) === statut)
    .slice()
    .sort((a, b) => {
      if (a.numeroBE !== b.numeroBE) {
        return ordreBEDesc ? b.numeroBE - a.numeroBE : a.numeroBE - b.numeroBE;
      }

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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528] sm:min-w-[260px]"
          >
            <option value="tous">Tous les dossiers</option>
            <option value="En attente">En attente</option>
            <option value="Visé">Visé(s)</option>
            <option value="Rejeté">Rejeté(s)</option>
            <option value="Remis">Remis</option>
          </select>
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
          dossiersAffiches.map((dossier) => {
            const agent = dossier.agents[0];
            const statutLigne = statutDuDossier(dossier);
            const enSouffrance = dossierEnSouffrance(dossier);
            const peutDecider = statutLigne === "En attente";
            const peutRemettreResponsable =
              statutLigne === "Visé" || statutLigne === "Rejeté";

            return (
              <article
                key={dossier.idDossier ?? dossier.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Dossier #{dossier.idDossier} · BE n°{dossier.numeroBE}
                    </p>
                    <h3 className="mt-1 break-words text-sm font-semibold text-slate-900">
                      {dossier.referenceDossier}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      enSouffrance
                        ? "animate-pulse border-red-300 bg-red-100 text-red-800"
                        : "border-amber-200 bg-amber-50 text-[#705212]"
                    }`}
                  >
                    {statutLigne || "—"}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div className="col-span-2">
                    <dt className="text-xs text-slate-500">Objet</dt>
                    <dd className="mt-0.5 break-words text-slate-800">
                      {dossier.objet}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Reçu le</dt>
                    <dd className="mt-0.5 text-slate-700">
                      {formaterDate(dossier.dateReception)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">IM agent</dt>
                    <dd className="mt-0.5 break-all text-slate-700">
                      {agent?.IM || "—"}
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
                    disabled={statutLigne !== "En attente"}
                    onClick={() => onRenvoyer(dossier)}
                    className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Renvoyer
                  </button>
                  <button
                    type="button"
                    disabled={!peutDecider}
                    onClick={() => onViser(dossier)}
                    className="min-h-11 rounded-lg bg-[#8C6A1E] px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Viser
                  </button>
                  <button
                    type="button"
                    disabled={!peutDecider}
                    onClick={() => onRejeter(dossier)}
                    className="min-h-11 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Rejeter
                  </button>
                  {peutRemettreResponsable && (
                    <button
                      type="button"
                      onClick={() => onRemettreResponsable(dossier)}
                      className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      Remettre au responsable
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="hidden overflow-x-auto xl:block">
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
                  <span className="text-xs">{ordreBEDesc ? "↓" : "↑"}</span>
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">Reçu le</th>
              <th className="px-4 py-3 font-semibold">Référence</th>
              <th className="px-4 py-3 font-semibold">IM Agent</th>
              <th className="px-4 py-3 font-semibold">Objet</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
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
                const enSouffrance = dossierEnSouffrance(dossier);

                const peutRenvoyer = statutLigne === "En attente";
                const peutDecider = statutLigne === "En attente";
                const peutRemettreResponsable =
                  statutLigne === "Visé" || statutLigne === "Rejeté";

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
                      <span
                        className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-all duration-200 ${
                          enSouffrance
                            ? "animate-[pulse_1.2s_ease-in-out_infinite] border-red-300 bg-red-100 text-red-800 ring-4 ring-red-200/70"
                            : "border-amber-200 bg-amber-50 text-[#705212]"
                        }`}
                      >
                        {enSouffrance && (
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
                        )}
                        {statutLigne || "—"}
                      </span>
                    </td>

                    <td className="relative px-4 py-3">
                      <div className="relative text-left">
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
                            largeur="w-56"
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
                              disabled={!peutDecider}
                              title={
                                peutDecider
                                  ? "Viser ce dossier"
                                  : "Le dossier doit être en attente pour être visé."
                              }
                              onClick={() => {
                                if (!peutDecider) return;

                                setMenuOuvert(null);
                                onViser(dossier);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm ${
                                peutDecider
                                  ? "text-slate-700 hover:bg-amber-50 hover:text-[#8C6A1E]"
                                  : "cursor-not-allowed text-slate-400"
                              }`}
                            >
                              Viser
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
                                  : "Le dossier doit être visé ou rejeté pour être remis au responsable."
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
        {dossiersAffiches.length} dossier
        {dossiersAffiches.length > 1 ? "s" : ""} affiché
        {dossiersAffiches.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}
