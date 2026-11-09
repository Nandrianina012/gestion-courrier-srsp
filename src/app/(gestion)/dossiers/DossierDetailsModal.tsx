"use client";

import type { Dossier, AgentRecherche } from "./page";

type Props = {
  dossier: Dossier | null;
  agentsDetails: AgentRecherche[];
  chargementAgentDetails: boolean;
  erreurDetails: string;
  agentsOuverts: number[];
  onFermer: () => void;
  onBasculerAgent: (idAgent: number) => void;
};

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

export default function DossierDetailsModal({
  dossier,
  agentsDetails,
  chargementAgentDetails,
  erreurDetails,
  agentsOuverts,
  onFermer,
  onBasculerAgent,
}: Props) {
  if (!dossier) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onFermer}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-details-dossier"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="titre-details-dossier"
              className="text-lg font-semibold text-slate-900"
            >
              BE n°{dossier.numeroBE}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {dossier.referenceDossier}
            </p>
          </div>

          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer les détails"
            className="text-xl text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Objet du BE</p>
            <p className="mt-1 text-sm text-slate-900">{dossier.objet}</p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Date d'enregistrement</p>
            <p className="mt-1 text-sm text-slate-900">
              {formaterDate(dossier.dateReception)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Etat des dossiers</p>
            <p className="mt-1 text-sm font-medium text-[#705212]">
              {dossier.statutDossier || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Localisation actuelle</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {nomDestination(dossier.localisationActuelle)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">
              Date de dernière transmission
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {formaterDate(dossier.dateEnvoi)}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs text-slate-500">Observation</p>

            <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {dossier.informationsComplementaires || "Aucune observation."}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Responsable</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {dossier.nomResponsable || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Téléphone du responsable</p>
            <p className="mt-1 text-sm text-slate-900">
              {dossier.telephoneResponsable || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Email du responsable</p>
            <p className="mt-1 text-sm text-slate-900">
              {dossier.emailResponsable || "—"}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4 sm:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Agents du BE ({dossier.agents.length})
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Affichez ou masquez les informations de chaque agent.
            </p>

            {chargementAgentDetails ? (
              <p className="mt-3 text-sm text-slate-500">
                Chargement des fiches des agents...
              </p>
            ) : erreurDetails ? (
              <p className="mt-3 text-sm text-amber-700">{erreurDetails}</p>
            ) : (
              <div className="mt-3 space-y-3">
                {dossier.agents.map((agent, index) => {
                  const detail =
                    agentsDetails.find(
                      (item) => item.idAgent === agent.idAgent,
                    ) ?? agentsDetails.find((item) => item.IM === agent.IM);

                  const ouvert = agentsOuverts.includes(agent.idAgent);

                  const dossierAgent = dossier.dossiers?.find(
                    (item) => item.idAgent === agent.idAgent,
                  );

                  return (
                    <div
                      key={`${agent.idAgent}-${index}`}
                      className="rounded-lg border border-slate-200"
                    >
                      <button
                        type="button"
                        onClick={() => onBasculerAgent(agent.idAgent)}
                        aria-expanded={ouvert}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <span>
                          <span className="font-medium text-slate-900">
                            {agent.nomComplet ||
                              detail?.nomComplet ||
                              "Agent sans nom"}
                          </span>

                          <span className="ml-2 text-xs text-slate-500">
                            IM : {agent.IM || "—"}
                          </span>

                          <span className="ml-2 text-xs font-medium text-[#8C6A1E]">
                            {dossierAgent?.statutDossier || "—"}
                          </span>
                        </span>

                        <span className="text-sm text-[#8C6A1E]">
                          {ouvert ? "Masquer" : "Afficher"}
                        </span>
                      </button>

                      {ouvert && (
                        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 px-4 py-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-slate-500">Nom</p>
                            <p className="mt-1 text-sm text-slate-900">
                              {detail?.nomComplet || agent.nomComplet || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">IM</p>
                            <p className="mt-1 text-sm text-slate-900">
                              {detail?.IM || agent.IM || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">CIN</p>
                            <p className="mt-1 text-sm text-slate-900">
                              {detail?.CIN || agent.CIN || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Type d'agent
                            </p>
                            <p className="mt-1 text-sm text-slate-900">
                              {(detail?.typeAgent || agent.typeAgent) ===
                              "retraite"
                                ? "Retraité"
                                : "En poste"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Numéro de pension
                            </p>
                            <p className="mt-1 text-sm text-slate-900">
                              {detail?.numeroPension ||
                                agent.numeroPension ||
                                "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">Corps</p>
                            <p className="mt-1 text-sm text-slate-900">
                              {detail?.corpsCode || agent.corpsCode || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">Section</p>
                            <p className="mt-1 text-sm text-slate-900">
                              {detail?.sectionCode || agent.sectionCode || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">FIV</p>
                            <p className="mt-1 text-sm text-slate-900">
                              {detail?.FIVCode || agent.FIVCode || "—"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onFermer}
            className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
