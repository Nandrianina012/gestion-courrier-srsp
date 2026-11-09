"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TypeImport = "en_poste" | "retraite";

type AgentPreview = {
  IM: string | null;
  nom: string | null;
  prenoms: string | null;
  CIN: string | null;
  corpsCode: string | null;
  sectionCode: string | null;
  FIVCode: string | null;
  typeAgent: string | null;
  numeroPension: string | null;
  action: "creation" | "mise_a_jour";
};

type PreviewResponse = {
  statistiques: {
    total: number;
    creations: number;
    mises_a_jour: number;
  };
  agents: AgentPreview[];
};

type ImportConfirmationResponse = {
  message: string;
  creations: number;
  mises_a_jour: number;
  total: number;
};

const API_BASE = "http://127.0.0.1:8000";

function extraireErreur(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const detail = (payload as { detail?: unknown }).detail;

    if (Array.isArray(detail)) {
      return detail.map((item) => String(item)).join(" ");
    }

    if (typeof detail === "string") {
      return detail;
    }
  }

  return "Une erreur est survenue.";
}

function estPreviewResponse(payload: unknown): payload is PreviewResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const donnees = payload as {
    statistiques?: unknown;
    agents?: unknown;
  };

  return (
    !!donnees.statistiques &&
    typeof donnees.statistiques === "object" &&
    Array.isArray(donnees.agents)
  );
}

export default function AgentsPage() {
  const router = useRouter();

  const [verification, setVerification] = useState(false);
  const [typeImport, setTypeImport] = useState<TypeImport>("en_poste");
  const [fichier, setFichier] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [chargement, setChargement] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    const token = sessionStorage.getItem("access_token");

    if (role !== "ADMIN" || !token) {
      router.replace("/");
      return;
    }

    setVerification(true);
  }, [router]);

  async function importerFichier<T>(url: string): Promise<T> {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      throw new Error("Session expirée.");
    }

    if (!fichier) {
      throw new Error("Sélectionnez un fichier Excel.");
    }

    const formData = new FormData();
    formData.append("fichier", fichier);
    formData.append("typeAgent", typeImport);

    const reponse = await fetch(`${API_BASE}${url}?typeAgent=${typeImport}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const donnees: unknown = await reponse.json().catch(() => undefined);

    if (!reponse.ok) {
      throw new Error(extraireErreur(donnees));
    }

    return donnees as T;
  }

  async function previsualiserImport() {
    if (!fichier) {
      setErreur("Sélectionnez un fichier Excel.");
      return;
    }

    setChargement(true);
    setErreur("");
    setMessage("");

    try {
      const donnees = await importerFichier<PreviewResponse>(
        "/api/admin/agents/import-preview",
      );

      if (!estPreviewResponse(donnees)) {
        throw new Error("Réponse de prévisualisation invalide.");
      }

      setPreview(donnees);
      setMessage(
        `Prévisualisation OK : ${donnees.statistiques.total} agent(s) à traiter.`,
      );
    } catch (erreurImport) {
      setPreview(null);
      setErreur(
        erreurImport instanceof Error
          ? erreurImport.message
          : "Erreur inconnue.",
      );
    } finally {
      setChargement(false);
    }
  }

  async function confirmerImport() {
    if (!fichier || !preview) {
      setErreur("Prévisualisez d’abord le fichier avant de confirmer.");
      return;
    }

    setChargement(true);
    setErreur("");
    setMessage("");

    try {
      const donnees = await importerFichier<ImportConfirmationResponse>(
        "/api/admin/agents/import-confirmer",
      );

      setMessage(
        `Import terminé : ${donnees.creations} création(s), ${donnees.mises_a_jour} mise(s) à jour.`,
      );

      setPreview(null);
      setFichier(null);

      const input = document.getElementById(
        "fichier-agent",
      ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }
    } catch (erreurImport) {
      setErreur(
        erreurImport instanceof Error
          ? erreurImport.message
          : "Erreur inconnue.",
      );
    } finally {
      setChargement(false);
    }
  }

  if (!verification) {
    return null;
  }

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Gestion des agents
        </h1>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTypeImport("en_poste")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              typeImport === "en_poste"
                ? "bg-amber-700 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Agents en poste
          </button>

          <button
            type="button"
            onClick={() => setTypeImport("retraite")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              typeImport === "retraite"
                ? "bg-amber-700 text-white"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Agents retraités
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <label
              htmlFor="fichier-agent"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              {typeImport === "en_poste"
                ? "Fichier Excel des agents en poste"
                : "Fichier Excel des agents retraités"}
            </label>

            <input
              id="fichier-agent"
              type="file"
              accept=".xlsx,.xlsm"
              onChange={(evenement) => {
                const fichierSelectionne = evenement.target.files?.[0] ?? null;
                setFichier(fichierSelectionne);
                setPreview(null);
                setErreur("");
                setMessage("");
              }}
              className="block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-amber-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={previsualiserImport}
              disabled={!fichier || chargement}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {chargement ? "Traitement..." : "Prévisualiser"}
            </button>

            <button
              type="button"
              onClick={confirmerImport}
              disabled={!preview || chargement}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirmer l’import
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          {typeImport === "en_poste" ? (
            <p>
              Colonnes obligatoires : IM, Nom (ou NomComplet), CIN. Les autres
              colonnes sont facultatives, notamment Prenoms, Corps, Section,
              FIV, et même le numéro de pension si l’agent est en poste.
            </p>
          ) : (
            <p>
              Colonnes obligatoires : NumeroPension, Nom (ou NomComplet), CIN.
              Les autres colonnes sont facultatives, notamment Prenoms, Corps,
              Section et FIV. L’IM n’est pas requis pour les retraités.
            </p>
          )}
        </div>

        {fichier && (
          <p className="mt-3 text-sm text-slate-600">
            Fichier sélectionné :{" "}
            <span className="font-medium">{fichier.name}</span>
          </p>
        )}

        {message && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        {erreur && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erreur}
          </div>
        )}
      </section>

      {preview && (
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Total
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {preview.statistiques.total}
              </p>
            </div>

            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Créations
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {preview.statistiques.creations}
              </p>
            </div>

            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Mises à jour
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {preview.statistiques.mises_a_jour}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    {typeImport === "en_poste" ? "IM" : "N° pension"}
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Nom
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Prénoms
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    CIN
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Type
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {preview.agents.map((agent, index) => (
                  <tr
                    key={`${agent.IM ?? agent.numeroPension ?? "agent"}-${index}`}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {typeImport === "en_poste"
                        ? (agent.IM ?? "-")
                        : (agent.numeroPension ?? "-")}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {agent.nom ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {agent.prenoms ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {agent.CIN ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {agent.typeAgent ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          agent.action === "creation"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {agent.action === "creation"
                          ? "Création"
                          : "Mise à jour"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
