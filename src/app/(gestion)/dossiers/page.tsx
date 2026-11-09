"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { objetsDossier } from "@/data/objetsDossier";

import DossiersSecDRBF from "./DossiersSecDRBF";
import DossiersSecSRSP from "./DossiersSecSRSP";
import DossiersDivision from "./DossiersDivision";
import DossiersAdmin from "./DossiersAdmin";
import DossierDetailsModal from "./DossierDetailsModal";
import TransfertModal from "./TransfertModal";

export type Utilisateur = {
  idUtilisateur: number;
  identifiant: string;
  role: string;
};

export type AgentDossier = {
  idAgent: number;
  IM: string | null;
  numeroPension?: string | null;
  nom: string;
  prenoms: string | null;
  nomComplet: string;
  CIN?: string | null;
  corpsCode?: string | null;
  sectionCode?: string | null;
  FIVCode?: string | null;
  typeAgent: string;
};

export type Dossier = {
  id: number;
  idDossier: number;
  numeroBE: number;
  dossiers?: {
    idDossier: number;
    idAgent: number | null;
    statutDossier: string;
  }[];
  referenceDossier: string;
  objet: string;
  agents: AgentDossier[];
  dateReception: string | null;
  statutDossier: string;
  origine: string | null;
  destination: string | null;
  dateEnvoi: string | null;
  dateReceptionTransmission: string | null;
  statutTransmission: string | null;
  informationsComplementaires: string | null;
  localisationActuelle: string | null;
  nomResponsable: string | null;
  telephoneResponsable: string | null;
  emailResponsable: string | null;
};

export type AgentRecherche = AgentDossier & {
  numeroPension: string | null;
  CIN: string | null;
  corpsCode: string | null;
  sectionCode: string | null;
  FIVCode: string | null;
};

type AgentFormulaire = {
  cle: number;
  IM: string;
  nomCompletAgent: string;
  agentTrouve: AgentRecherche | null;
  agentNonTrouve: boolean;
  rechercheEnCours: boolean;
};

const API = "http://127.0.0.1:8000";

const objetsDisponibles = objetsDossier.map((element) => element.objet);

const CLASSE_INPUT =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528]";

function nouvelAgentFormulaire(cle: number): AgentFormulaire {
  return {
    cle,
    IM: "",
    nomCompletAgent: "",
    agentTrouve: null,
    agentNonTrouve: false,
    rechercheEnCours: false,
  };
}

export default function DossiersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dossierIdNotification = searchParams.get("dossierId");

  const [chargement, setChargement] = useState(true);
  const [chargementDossiers, setChargementDossiers] = useState(false);
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState("");

  // Création d'un BE.
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [referenceDossier, setReferenceDossier] = useState("");
  const [objet, setObjet] = useState("");
  const [agentsFormulaire, setAgentsFormulaire] = useState<AgentFormulaire[]>([
    nouvelAgentFormulaire(1),
  ]);
  const [nomResponsable, setNomResponsable] = useState("");
  const [telephoneResponsable, setTelephoneResponsable] = useState("");
  const [emailResponsable, setEmailResponsable] = useState("");
  const [objetSuggestionsVisibles, setObjetSuggestionsVisibles] =
    useState(false);
  const [prochaineCleAgent, setProchaineCleAgent] = useState(2);
  const [erreurFormulaire, setErreurFormulaire] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [numeroBE, setNumeroBE] = useState<number | null>(null);
  const [chargementNumeroBE, setChargementNumeroBE] = useState(false);

  const [referenceTouchee, setReferenceTouchee] = useState(false);
  const [objetTouche, setObjetTouche] = useState(false);
  const [imsTouches, setImsTouches] = useState<number[]>([]);

  const timersRecherche = useRef<Record<number, ReturnType<typeof setTimeout>>>(
    {},
  );

  // Détails.
  const [dossierSelectionne, setDossierSelectionne] = useState<Dossier | null>(
    null,
  );
  const [agentsDetails, setAgentsDetails] = useState<AgentRecherche[]>([]);
  const [chargementAgentDetails, setChargementAgentDetails] = useState(false);
  const [erreurDetails, setErreurDetails] = useState("");
  const [agentsOuverts, setAgentsOuverts] = useState<number[]>([]);

  // Transfert.
  const [dossierATransferer, setDossierATransferer] = useState<Dossier | null>(
    null,
  );
  const [destinationTransfert, setDestinationTransfert] = useState("");
  const [observationsAgents, setObservationsAgents] = useState<
    Record<number, string>
  >({});
  const [piecesCochees, setPiecesCochees] = useState<Record<number, string[]>>(
    {},
  );

  const [toast, setToast] = useState<{
    type: "succes" | "erreur";
    message: string;
  } | null>(null);

  const [dossierARenvoyer, setDossierARenvoyer] = useState<Dossier | null>(
    null,
  );

  const [renvoiEnCours, setRenvoiEnCours] = useState(false);

  const [envoiBEsEnCours, setEnvoiBEsEnCours] = useState(false);

  const [confirmationEnvoiOuverte, setConfirmationEnvoiOuverte] =
    useState(false);

  const [dossierAValider, setDossierAValider] = useState<Dossier | null>(null);

  const [dossierARejeter, setDossierARejeter] = useState<Dossier | null>(null);

  const [motifRejet, setMotifRejet] = useState("");

  const [decisionEnCours, setDecisionEnCours] = useState(false);

  const [dossierARemettre, setDossierARemettre] = useState<Dossier | null>(
    null,
  );

  const [remiseEnCours, setRemiseEnCours] = useState(false);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    async function initialiserPage() {
      const token = sessionStorage.getItem("access_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const reponse = await fetch(`${API}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!reponse.ok) {
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("identifiant");
          sessionStorage.removeItem("role");
          router.replace("/login");
          return;
        }

        const compte: Utilisateur = await reponse.json();

        setUtilisateur(compte);
        await chargerDossiers(token);
      } catch (error) {
        setErreur(
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
        );
      } finally {
        setChargement(false);
      }
    }

    void initialiserPage();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function chargerDossiers(token?: string) {
    const accessToken = token ?? sessionStorage.getItem("access_token");

    if (!accessToken) return;

    console.log("1. chargerDossiers() est appelée");

    setErreur("");

    try {
      const reponse = await fetch(`${API}/api/dossiers`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      console.log("2. Réponse API :", reponse.status);

      if (!reponse.ok) {
        const resultat = await reponse.json().catch(() => null);

        throw new Error(
          resultat?.detail ?? "Impossible de récupérer les dossiers.",
        );
      }

      const donnees: Dossier[] = await reponse.json();

      console.log("3. Nombre de dossiers reçus :", donnees.length);
      console.log("Données reçues :", donnees);

      setDossiers(donnees);
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de charger les dossiers.",
      );
    } finally {
      setChargementDossiers(false);
    }
  }

  async function chargerProchainNumeroBE(token?: string) {
    const accessToken = token ?? sessionStorage.getItem("access_token");

    if (!accessToken) return;

    setChargementNumeroBE(true);

    try {
      const reponse = await fetch(`${API}/api/dossiers/prochain-numero-be`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const resultat = await reponse.json().catch(() => null);

      if (!reponse.ok) {
        const detail = resultat?.detail;

        throw new Error(
          typeof detail === "string"
            ? detail
            : (detail?.message ??
                "Impossible de récupérer le prochain numéro de BE."),
        );
      }

      setNumeroBE(resultat.numeroBE);
    } catch (error) {
      setErreurFormulaire(
        error instanceof Error
          ? error.message
          : "Erreur lors du chargement du numéro de BE.",
      );
    } finally {
      setChargementNumeroBE(false);
    }
  }

  async function rechercherAgent(cle: number, IMForce?: string) {
    const agentForm = agentsFormulaire.find((agent) => agent.cle === cle);

    const matricule = (IMForce ?? agentForm?.IM ?? "").trim();

    if (!agentForm) return;

    if (!matricule) {
      setAgentsFormulaire((anciens) =>
        anciens.map((agent) =>
          agent.cle === cle
            ? {
                ...agent,
                agentTrouve: null,
                agentNonTrouve: false,
                rechercheEnCours: false,
                nomCompletAgent: "",
              }
            : agent,
        ),
      );

      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setAgentsFormulaire((anciens) =>
      anciens.map((agent) =>
        agent.cle === cle && agent.IM.trim() === matricule
          ? {
              ...agent,
              rechercheEnCours: true,
              agentTrouve: null,
              agentNonTrouve: false,
              nomCompletAgent: "",
            }
          : agent,
      ),
    );

    try {
      const reponse = await fetch(
        `${API}/api/agents/recherche?IM=${encodeURIComponent(matricule)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!reponse.ok) {
        throw new Error("Impossible de rechercher l'agent.");
      }

      const resultat = await reponse.json();

      setAgentsFormulaire((anciens) =>
        anciens.map((agent) => {
          if (agent.cle !== cle || agent.IM.trim() !== matricule) {
            return agent;
          }

          if (resultat.trouve) {
            const agentTrouve: AgentRecherche = resultat.agent;

            return {
              ...agent,
              agentTrouve,
              agentNonTrouve: false,
              nomCompletAgent: agentTrouve.nomComplet,
              rechercheEnCours: false,
            };
          }

          return {
            ...agent,
            agentTrouve: null,
            agentNonTrouve: true,
            rechercheEnCours: false,
          };
        }),
      );
    } catch (error) {
      setAgentsFormulaire((anciens) =>
        anciens.map((agent) =>
          agent.cle === cle && agent.IM.trim() === matricule
            ? {
                ...agent,
                rechercheEnCours: false,
                agentTrouve: null,
                agentNonTrouve: false,
              }
            : agent,
        ),
      );

      setErreurFormulaire(
        error instanceof Error
          ? error.message
          : "Erreur lors de la recherche de l'agent.",
      );
    }
  }

  function programmerRechercheAgent(cle: number, valeur: string) {
    if (timersRecherche.current[cle]) {
      clearTimeout(timersRecherche.current[cle]);
    }

    modifierAgent(cle, {
      IM: valeur,
      agentTrouve: null,
      agentNonTrouve: false,
      rechercheEnCours: false,
      nomCompletAgent: "",
    });

    setErreurFormulaire("");

    if (!valeur.trim()) return;

    timersRecherche.current[cle] = setTimeout(() => {
      void rechercherAgent(cle, valeur);
    }, 500);
  }

  function modifierAgent(cle: number, changements: Partial<AgentFormulaire>) {
    setAgentsFormulaire((anciens) =>
      anciens.map((agent) =>
        agent.cle === cle ? { ...agent, ...changements } : agent,
      ),
    );
  }

  function ajouterAgent() {
    setAgentsFormulaire((anciens) => [
      ...anciens,
      nouvelAgentFormulaire(prochaineCleAgent),
    ]);

    setProchaineCleAgent((cle) => cle + 1);
    setErreurFormulaire("");
  }

  function retirerAgent(cle: number) {
    if (timersRecherche.current[cle]) {
      clearTimeout(timersRecherche.current[cle]);
      delete timersRecherche.current[cle];
    }

    setAgentsFormulaire((anciens) =>
      anciens.filter((agent) => agent.cle !== cle),
    );

    setImsTouches((anciens) => anciens.filter((id) => id !== cle));

    setErreurFormulaire("");
  }

  function reinitialiserFormulaire() {
    Object.values(timersRecherche.current).forEach(clearTimeout);
    timersRecherche.current = {};

    setReferenceDossier("");
    setObjet("");
    setNomResponsable("");
    setTelephoneResponsable("");
    setEmailResponsable("");

    setReferenceTouchee(false);
    setObjetTouche(false);
    setImsTouches([]);

    setAgentsFormulaire([nouvelAgentFormulaire(prochaineCleAgent)]);
    setProchaineCleAgent((cle) => cle + 1);
  }

  async function creerDossier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErreurFormulaire("");

    setReferenceTouchee(true);
    setObjetTouche(true);
    setImsTouches(agentsFormulaire.map((agent) => agent.cle));

    if (!nomResponsable.trim()) {
      setErreurFormulaire("Le nom complet du responsable est obligatoire.");
      return;
    }

    if (!telephoneResponsable.trim()) {
      setErreurFormulaire("Le téléphone du responsable est obligatoire.");
      return;
    }

    if (numeroBE === null) {
      setErreurFormulaire(
        "Le numéro du BE n'est pas encore disponible. Réessayez.",
      );
      return;
    }

    if (!referenceDossier.trim()) {
      setErreurFormulaire("La référence du BE est obligatoire.");
      return;
    }

    if (!objet.trim()) {
      setErreurFormulaire("L'objet du BE est obligatoire.");
      return;
    }

    if (agentsFormulaire.length === 0) {
      setErreurFormulaire("Le BE doit contenir au moins un agent.");
      return;
    }

    const IMs = agentsFormulaire.map((agent) => agent.IM.trim());

    if (IMs.some((im) => !im)) {
      setErreurFormulaire("Veuillez saisir l'IM de chaque agent.");
      return;
    }

    if (new Set(IMs.map((im) => im.toLowerCase())).size !== IMs.length) {
      setErreurFormulaire(
        "Un même IM ne peut pas figurer plusieurs fois dans le même BE.",
      );
      return;
    }

    if (agentsFormulaire.some((agent) => agent.rechercheEnCours)) {
      setErreurFormulaire(
        "Veuillez attendre la fin de la recherche des agents.",
      );
      return;
    }

    const agentSansNom = agentsFormulaire.find(
      (agent) => !agent.agentTrouve && !agent.nomCompletAgent.trim(),
    );

    if (agentSansNom) {
      setErreurFormulaire(
        `L'agent IM ${agentSansNom.IM.trim()} n'est pas dans la base. Saisissez son nom complet pour continuer.`,
      );
      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setEnregistrement(true);

    try {
      const reponse = await fetch(`${API}/api/dossiers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nomResponsable: nomResponsable.trim(),
          telephoneResponsable: telephoneResponsable.trim(),
          emailResponsable: emailResponsable.trim() || null,
          referenceDossier: referenceDossier.trim(),
          objet: objet.trim(),
          agents: agentsFormulaire.map((agent) => ({
            IM: agent.IM.trim(),
            nomCompletAgent: agent.agentTrouve
              ? null
              : agent.nomCompletAgent.trim(),
          })),
        }),
      });

      const resultat = await reponse.json().catch(() => null);

      if (!reponse.ok) {
        if (
          reponse.status === 409 &&
          typeof resultat?.detail?.numeroBE === "number"
        ) {
          setNumeroBE(resultat.detail.numeroBE);

          setErreurFormulaire(
            "Le numéro du BE a changé. Le nouveau numéro est affiché ; vérifiez le formulaire puis réessayez.",
          );

          return;
        }

        const detail = resultat?.detail;

        const message = Array.isArray(detail)
          ? detail
              .map((erreur: { loc?: unknown[]; msg?: string }) => {
                const champ = Array.isArray(erreur.loc)
                  ? erreur.loc.filter((partie) => partie !== "body").join(" → ")
                  : "";

                return `${champ ? `${champ} : ` : ""}${erreur.msg ?? "Valeur invalide"}`;
              })
              .join(" ; ")
          : typeof detail === "string"
            ? detail
            : (detail?.message ?? "Impossible d'enregistrer le BE.");

        throw new Error(message);
      }

      setToast({
        type: "succes",
        message: `BE n°${resultat.numeroBE} enregistré avec ${resultat.nombreDossiers} dossier(s) et envoyé à la SecSRSP.`,
      });

      reinitialiserFormulaire();

      window.dispatchEvent(new Event("actualiser-notifications"));

      await chargerDossiers(token);
      await chargerProchainNumeroBE(token);
    } catch (error) {
      setErreurFormulaire(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.",
      );
    } finally {
      setEnregistrement(false);
    }
  }

  const objetsFiltres = objetsDisponibles.filter((objetDisponible) =>
    objetDisponible.toLowerCase().includes(objet.toLowerCase().trim()),
  );

  const dossiersFiltres = dossiers.filter((dossier) => {
    const terme = recherche.toLowerCase().trim();

    if (!terme) return true;

    const agentsTexte = dossier.agents
      .map((agent) => `${agent.IM ?? ""} ${agent.nomComplet}`)
      .join(" ")
      .toLowerCase();

    return (
      dossier.referenceDossier.toLowerCase().includes(terme) ||
      dossier.objet.toLowerCase().includes(terme) ||
      agentsTexte.includes(terme) ||
      (dossier.destination ?? "").toLowerCase().includes(terme) ||
      (dossier.origine ?? "").toLowerCase().includes(terme) ||
      (dossier.statutDossier ?? "").toLowerCase().includes(terme) ||
      (dossier.statutTransmission ?? "").toLowerCase().includes(terme) ||
      (dossier.informationsComplementaires ?? "")
        .toLowerCase()
        .includes(terme) ||
      String(dossier.numeroBE).includes(terme)
    );
  });

  async function ouvrirDetails(dossier: Dossier) {
    setDossierSelectionne(dossier);
    setAgentsDetails([]);
    setErreurDetails("");
    setChargementAgentDetails(true);
    setAgentsOuverts([]);

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      setChargementAgentDetails(false);
      return;
    }

    try {
      const details = await Promise.all(
        dossier.agents.map(async (agent) => {
          if (!agent.IM) return null;

          const reponse = await fetch(
            `${API}/api/agents/recherche?IM=${encodeURIComponent(agent.IM)}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          if (!reponse.ok) return null;

          const resultat = await reponse.json();

          return resultat.trouve ? (resultat.agent as AgentRecherche) : null;
        }),
      );

      setAgentsDetails(
        details.filter((agent): agent is AgentRecherche => agent !== null),
      );

      if (details.every((agent) => agent === null)) {
        setErreurDetails(
          "Les fiches détaillées des agents ne sont pas disponibles.",
        );
      }
    } catch (error) {
      setErreurDetails(
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les fiches des agents.",
      );
    } finally {
      setChargementAgentDetails(false);
    }
  }

  function ouvrirTransfert(dossier: Dossier) {
    setDossierSelectionne(null);

    setDestinationTransfert("");
    setObservationsAgents({});
    setPiecesCochees({});

    setDossierATransferer(dossier);
  }

  function renvoyerDossier(dossier: Dossier) {
    setDossierARenvoyer(dossier);
  }

  function demanderValidation(dossier: Dossier) {
    setDossierAValider(dossier);
  }

  async function confirmerValidation() {
    if (!dossierAValider) {
      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setDecisionEnCours(true);

    try {
      const reponse = await fetch(
        `${API}/api/dossiers/${dossierAValider.idDossier}/valider`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const resultat = await reponse.json().catch(() => null);

      if (!reponse.ok) {
        const detail = resultat?.detail;

        throw new Error(
          typeof detail === "string"
            ? detail
            : (detail?.message ?? "Impossible de valider le dossier."),
        );
      }

      setDossierAValider(null);

      window.dispatchEvent(new Event("actualiser-notifications"));

      setToast({
        type: "succes",
        message: resultat?.message ?? "Le dossier a été validé avec succès.",
      });

      await chargerDossiers(token);
    } catch (error) {
      setToast({
        type: "erreur",
        message:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      });
    } finally {
      setDecisionEnCours(false);
    }
  }

  function demanderRejet(dossier: Dossier) {
    setMotifRejet("");
    setDossierARejeter(dossier);
  }

  function demanderRemiseResponsable(dossier: Dossier) {
    setDossierARemettre(dossier);
  }

  async function confirmerRemiseResponsable() {
    if (!dossierARemettre) {
      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setRemiseEnCours(true);

    try {
      const reponse = await fetch(
        `${API}/api/dossiers/${dossierARemettre.idDossier}/remettre-responsable`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const resultat = await reponse.json().catch(() => null);

      if (!reponse.ok) {
        const detail = resultat?.detail;

        throw new Error(
          typeof detail === "string"
            ? detail
            : (detail?.message ??
                "Impossible de remettre le dossier au responsable."),
        );
      }

      setDossierARemettre(null);

      window.dispatchEvent(new Event("actualiser-notifications"));

      setToast({
        type: "succes",
        message:
          resultat?.message ??
          "Le dossier a été remis au responsable avec succès.",
      });

      await chargerDossiers(token);
    } catch (error) {
      setToast({
        type: "erreur",
        message:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      });
    } finally {
      setRemiseEnCours(false);
    }
  }

  async function confirmerRejet() {
    if (!dossierARejeter) {
      return;
    }

    const motif = motifRejet.trim();

    if (!motif) {
      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setDecisionEnCours(true);

    try {
      const reponse = await fetch(
        `${API}/api/dossiers/${dossierARejeter.idDossier}/rejeter`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            motif,
          }),
        },
      );

      const resultat = await reponse.json().catch(() => null);

      if (!reponse.ok) {
        const detail = resultat?.detail;

        throw new Error(
          typeof detail === "string"
            ? detail
            : (detail?.message ?? "Impossible de rejeter le dossier."),
        );
      }

      setDossierARejeter(null);
      setMotifRejet("");

      window.dispatchEvent(new Event("actualiser-notifications"));

      setToast({
        type: "succes",
        message: resultat?.message ?? "Le dossier a été rejeté avec succès.",
      });

      await chargerDossiers(token);
    } catch (error) {
      setToast({
        type: "erreur",
        message:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      });
    } finally {
      setDecisionEnCours(false);
    }
  }

  async function commencerTraitement(dossier: Dossier) {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const reponse = await fetch(
        `${API}/api/dossiers/${dossier.idDossier}/commencer-traitement`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const resultat = await reponse.json().catch(() => null);

      if (!reponse.ok) {
        const detail = resultat?.detail;

        throw new Error(
          typeof detail === "string"
            ? detail
            : (detail?.message ?? "Impossible de commencer le traitement."),
        );
      }

      window.dispatchEvent(new Event("actualiser-notifications"));

      setToast({
        type: "succes",
        message: resultat?.message ?? "Le traitement du dossier a commencé.",
      });

      await chargerDossiers(token);
    } catch (error) {
      setToast({
        type: "erreur",
        message:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      });
    }
  }

  function fermerDetails() {
    setDossierSelectionne(null);
    setAgentsDetails([]);
    setErreurDetails("");
  }

  async function confirmerEnvoiBEsSecSRSP() {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const nombreBEsEnregistres = new Set(
      dossiers
        .filter((dossier) => dossier.localisationActuelle === "SecDRBF")
        .map((dossier) => dossier.numeroBE),
    ).size;

    if (nombreBEsEnregistres === 0) {
      setConfirmationEnvoiOuverte(false);
      setToast({
        type: "erreur",
        message: "Aucun BE enregistré n'est prêt à être envoyé.",
      });
      return;
    }

    setEnvoiBEsEnCours(true);

    try {
      const reponse = await fetch(`${API}/api/dossiers/envoyer-secsrsp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resultat = await reponse.json().catch(() => null);

      if (!reponse.ok) {
        const detail = resultat?.detail;
        throw new Error(
          typeof detail === "string"
            ? detail
            : "Impossible d'envoyer les BE à la SecSRSP.",
        );
      }

      setConfirmationEnvoiOuverte(false);
      window.dispatchEvent(new Event("actualiser-notifications"));

      setToast({
        type: "succes",
        message: resultat?.message ?? "Les BE ont été envoyés à la SecSRSP.",
      });

      await chargerDossiers(token);
    } catch (error) {
      setToast({
        type: "erreur",
        message:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue pendant l'envoi des BE.",
      });
    } finally {
      setEnvoiBEsEnCours(false);
    }
  }

  async function confirmerRenvoi() {
    if (!dossierARenvoyer) {
      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setRenvoiEnCours(true);

    try {
      const reponse = await fetch(
        `${API}/api/dossiers/${dossierARenvoyer.idDossier}/renvoyer-secsrsp`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const resultat = await reponse.json().catch(() => null);

      if (!reponse.ok) {
        const detail = resultat?.detail;

        throw new Error(
          typeof detail === "string"
            ? detail
            : (detail?.message ?? "Impossible de renvoyer le BE à la SecSRSP."),
        );
      }

      setDossierARenvoyer(null);

      window.dispatchEvent(new Event("actualiser-notifications"));

      setToast({
        type: "succes",
        message:
          resultat?.message ??
          "Le BE a été renvoyé à la SecSRSP pour réorientation.",
      });

      // Actualiser immédiatement la liste.
      await chargerDossiers(token);
    } catch (error) {
      setToast({
        type: "erreur",
        message:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue.",
      });
    } finally {
      setRenvoiEnCours(false);
    }
  }

  function fermerTransfert() {
    setDossierATransferer(null);
    setDestinationTransfert("");
    setObservationsAgents({});
    setPiecesCochees({});
  }

  function basculerAgentOuvert(idAgent: number) {
    setAgentsOuverts((anciens) =>
      anciens.includes(idAgent)
        ? anciens.filter((id) => id !== idAgent)
        : [...anciens, idAgent],
    );
  }

  function modifierObservationAgent(idAgent: number, observation: string) {
    setObservationsAgents((anciens) => ({
      ...anciens,
      [idAgent]: observation,
    }));
  }

  function modifierPieceAgent(idAgent: number, piece: string, cochee: boolean) {
    setPiecesCochees((anciens) => {
      const piecesActuelles = anciens[idAgent] ?? [];

      const nouvellesPieces = cochee
        ? piecesActuelles.includes(piece)
          ? piecesActuelles
          : [...piecesActuelles, piece]
        : piecesActuelles.filter((item) => item !== piece);

      return {
        ...anciens,
        [idAgent]: nouvellesPieces,
      };
    });
  }

  /*
   * Le endpoint backend du transfert n'apparaît pas
   * dans le page.tsx fourni.
   *
   * On ne l'invente donc pas ici.
   *
   * Les données sont déjà prêtes :
   * - dossierATransferer
   * - destinationTransfert
   * - observationsAgents
   * - piecesCochees
   *
   * Cette fonction sera branchée sur le véritable endpoint
   * de transfert à l'étape suivante.
   */

  async function confirmerTransfert() {
    if (!dossierATransferer) {
      return;
    }

    if (!destinationTransfert) {
      setToast({
        type: "erreur",
        message: "Veuillez sélectionner une division destinataire.",
      });
      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const reponse = await fetch(`${API}/api/dossiers/transfert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          numeroBE: dossierATransferer.numeroBE,
          destination: destinationTransfert,
          observationsAgents: dossierATransferer.agents.map((agent) => ({
            idAgent: agent.idAgent,
            observation: observationsAgents[agent.idAgent] ?? "",
          })),
        }),
      });

      const resultat = await reponse.json().catch(() => null);

      if (!reponse.ok) {
        const detail = resultat?.detail;

        throw new Error(
          typeof detail === "string"
            ? detail
            : (detail?.message ?? "Le transfert a échoué."),
        );
      }

      fermerTransfert();

      window.dispatchEvent(new Event("actualiser-notifications"));

      setToast({
        type: "succes",
        message: resultat?.message ?? "Le BE a été transféré avec succès.",
      });

      await chargerDossiers(token);
    } catch (error) {
      setToast({
        type: "erreur",
        message:
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue pendant le transfert.",
      });
    }
  }

  useEffect(() => {
    if (!dossierIdNotification || dossiers.length === 0) {
      return;
    }

    const idRecherche = Number(dossierIdNotification);

    const dossier = dossiers.find(
      (item) => item.idDossier === idRecherche || item.id === idRecherche,
    );

    if (dossier) {
      void ouvrirDetails(dossier);

      router.replace("/dossiers", {
        scroll: false,
      });
    }
  }, [dossierIdNotification, dossiers]);

  if (chargement) {
    return (
      <div className="py-16 text-center text-slate-500">
        Vérification du compte en cours...
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="mx-auto mt-8 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-semibold text-[#705212]">
          Impossible d'afficher les dossiers
        </h1>

        <p className="mt-2 text-sm text-slate-700">{erreur}</p>

        <button
          type="button"
          onClick={() => router.replace("/")}
          className="mt-4 rounded-lg bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] px-4 py-2 text-sm font-medium text-white"
        >
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  if (!utilisateur) return null;

  const role = utilisateur.role;

  const estSecDRBF = role === "SecDRBF";

  const estSecSRSP = role === "SecSRSP";

  const estAdmin = role === "ADMIN";

  const estDivision = [
    "DIVISION_SOLDE",
    "DIVISION_VISA",
    "DIVISION_PENSIONS",
    "DIVISION_SECOURS",
  ].includes(role);

  return (
    <section className="space-y-6">
      {toast && (
        <div
          role={toast.type === "erreur" ? "alert" : "status"}
          className={`fixed right-5 top-5 z-[100] flex max-w-md items-start gap-3 rounded-xl border p-4 shadow-lg ${
            toast.type === "succes"
              ? "border-green-200 bg-white text-green-800"
              : "border-red-200 bg-white text-red-800"
          }`}
        >
          <span className="mt-0.5 text-lg">
            {toast.type === "succes" ? "✓" : "!"}
          </span>

          <p className="flex-1 text-sm font-medium">{toast.message}</p>

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Fermer la notification"
            className="text-lg opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-[#8C6A1E]">
            {estSecDRBF
              ? "Secrétariat DRBF"
              : estSecSRSP
                ? "Secrétariat SRSP"
                : estAdmin
                  ? "Administration"
                  : role}
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Gestion des dossiers
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Connecté en tant que {utilisateur.identifiant}
          </p>
        </div>

        {estSecDRBF && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                const ouvrir = !afficherFormulaire;

                setAfficherFormulaire(ouvrir);
                setErreurFormulaire("");

                if (ouvrir) {
                  void chargerProchainNumeroBE();
                }
              }}
              className="rounded-lg bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            >
              {afficherFormulaire ? "Fermer" : "+ Nouveau BE"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmationEnvoiOuverte(true)}
              disabled={
                envoiBEsEnCours ||
                !dossiers.some(
                  (dossier) => dossier.localisationActuelle === "SecDRBF",
                )
              }
              className="rounded-lg bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {envoiBEsEnCours
                ? "Envoi en cours..."
                : "Envoyer les BE enregistrés à SRSP"}
            </button>

            
          </div>
        )}
      </div>

      {estSecDRBF && afficherFormulaire && (
        <div className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-slate-900">
            Enregistrer un nouveau bordereau d'envoi (BE)
          </h2>

          <form
            onSubmit={creerDossier}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Numéro du BE
              </label>

              <input
                type="number"
                value={numeroBE ?? ""}
                readOnly
                placeholder={
                  chargementNumeroBE ? "Chargement..." : "Numéro indisponible"
                }
                className={`${CLASSE_INPUT} bg-slate-100`}
              />

              <p className="mt-1 text-xs text-slate-500">Sous numéro</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Référence du BE
              </label>

              <input
                type="text"
                required
                value={referenceDossier}
                onBlur={() => setReferenceTouchee(true)}
                onChange={(e) => {
                  setReferenceDossier(e.target.value);
                  setErreurFormulaire("");
                }}
                placeholder="Ex. N°2026/06-DREN.H.M/SGRH/DIV.S"
                className={`${CLASSE_INPUT} ${
                  referenceTouchee && !referenceDossier.trim()
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : ""
                }`}
              />

              {referenceTouchee && !referenceDossier.trim() && (
                <p className="mt-1 text-xs text-red-600">
                  La référence du BE est obligatoire.
                </p>
              )}
            </div>

            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Objet
              </label>

              <input
                type="text"
                required
                value={objet}
                onFocus={() => setObjetSuggestionsVisibles(true)}
                onBlur={() => {
                  setObjetTouche(true);

                  window.setTimeout(() => {
                    setObjetSuggestionsVisibles(false);
                  }, 150);
                }}
                onChange={(e) => {
                  setObjet(e.target.value);
                  setObjetSuggestionsVisibles(true);
                  setErreurFormulaire("");
                }}
                placeholder="Ex. Demande d'avancement"
                className={`${CLASSE_INPUT} ${
                  objetTouche && !objet.trim()
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : ""
                }`}
              />

              {objetSuggestionsVisibles && objetsFiltres.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {objetsFiltres.map((objetDisponible, index) => (
                    <button
                      key={`${objetDisponible}-${index}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setObjet(objetDisponible);
                        setObjetSuggestionsVisibles(false);
                        setErreurFormulaire("");
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-amber-50 hover:text-[#8C6A1E]"
                    >
                      {objetDisponible}
                    </button>
                  ))}
                </div>
              )}

              {objetTouche && !objet.trim() && (
                <p className="mt-1 text-xs text-red-600">
                  L'objet du BE est obligatoire.
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Agents concernés ({agentsFormulaire.length})
                </h3>

                <button
                  type="button"
                  onClick={ajouterAgent}
                  className="rounded-lg border border-[#B38528] px-3 py-2 text-sm font-medium text-[#705212] hover:bg-amber-50"
                >
                  + Ajouter un autre agent
                </button>
              </div>

              <div className="space-y-4">
                {agentsFormulaire.map((agent, index) => {
                  const imEnDouble =
                    agent.IM.trim() !== "" &&
                    agentsFormulaire.filter(
                      (autre) =>
                        autre.IM.trim().toLowerCase() ===
                        agent.IM.trim().toLowerCase(),
                    ).length > 1;

                  const imVide =
                    imsTouches.includes(agent.cle) && !agent.IM.trim();

                  return (
                    <div
                      key={agent.cle}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-800">
                          Agent {index + 1}
                        </h4>

                        {agentsFormulaire.length > 1 && (
                          <button
                            type="button"
                            onClick={() => retirerAgent(agent.cle)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Retirer
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            IM
                          </label>

                          <input
                            type="text"
                            required
                            value={agent.IM}
                            onBlur={() =>
                              setImsTouches((anciens) =>
                                anciens.includes(agent.cle)
                                  ? anciens
                                  : [...anciens, agent.cle],
                              )
                            }
                            onChange={(e) =>
                              programmerRechercheAgent(
                                agent.cle,
                                e.target.value,
                              )
                            }
                            placeholder="Numéro matricule"
                            className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-1 ${
                              imVide
                                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                                : agent.agentTrouve
                                  ? "border-green-400 focus:border-green-500 focus:ring-green-500"
                                  : "border-slate-300 focus:border-[#B38528] focus:ring-[#B38528]"
                            }`}
                          />

                          {imVide && (
                            <p className="mt-1 text-xs text-red-600">
                              L'IM est obligatoire.
                            </p>
                          )}

                          {imEnDouble && (
                            <p className="mt-1 text-xs text-red-600">
                              Cet IM est déjà utilisé dans ce BE.
                            </p>
                          )}

                          {agent.rechercheEnCours && (
                            <p className="mt-1 text-xs text-slate-500">
                              Recherche de l'agent...
                            </p>
                          )}

                          {agent.agentTrouve && (
                            <p className="mt-1 text-xs text-green-700">
                              Agent trouvé : {agent.agentTrouve.nomComplet}
                            </p>
                          )}

                          {agent.agentNonTrouve && (
                            <p className="mt-1 text-xs text-amber-700">
                              Aucun agent trouvé pour cet IM. Saisissez son nom
                              complet pour continuer.
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Nom complet de l'agent
                          </label>

                          <input
                            type="text"
                            required={!agent.agentTrouve}
                            value={agent.nomCompletAgent}
                            onChange={(e) => {
                              modifierAgent(agent.cle, {
                                nomCompletAgent: e.target.value,
                              });

                              setErreurFormulaire("");
                            }}
                            disabled={!!agent.agentTrouve}
                            placeholder={
                              agent.agentTrouve
                                ? "Nom récupéré automatiquement"
                                : "Nom et prénoms"
                            }
                            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none ${
                              agent.agentTrouve
                                ? "border-green-300 bg-green-50"
                                : agent.agentNonTrouve &&
                                    !agent.nomCompletAgent.trim()
                                  ? "border-red-400 bg-white focus:border-red-500 focus:ring-red-500"
                                  : "border-slate-300 bg-white focus:border-[#B38528] focus:ring-[#B38528]"
                            }`}
                          />

                          {agent.agentNonTrouve &&
                            !agent.nomCompletAgent.trim() && (
                              <p className="mt-1 text-xs text-red-600">
                                Le nom complet est obligatoire si l'agent n'est
                                pas dans la base.
                              </p>
                            )}

                          {agent.agentNonTrouve && (
                            <p className="mt-1.5 text-xs text-slate-500">
                              Sa fiche pourra être complétée lors de la mise à
                              jour de la liste des agents.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Nom complet du responsable
              </label>
              <input
                type="text"
                required
                maxLength={150}
                value={nomResponsable}
                onChange={(e) => {
                  setNomResponsable(e.target.value);
                  setErreurFormulaire("");
                }}
                placeholder="Nom et prénoms de la personne qui dépose le BE"
                className={CLASSE_INPUT}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Téléphone du responsable
              </label>
              <input
                type="tel"
                required
                maxLength={30}
                value={telephoneResponsable}
                onChange={(e) => {
                  setTelephoneResponsable(e.target.value);
                  setErreurFormulaire("");
                }}
                placeholder="Numéro de téléphone"
                className={CLASSE_INPUT}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                E-mail du responsable (facultatif)
              </label>
              <input
                type="email"
                maxLength={150}
                value={emailResponsable}
                onChange={(e) => {
                  setEmailResponsable(e.target.value);
                  setErreurFormulaire("");
                }}
                placeholder="Adresse e-mail"
                className={CLASSE_INPUT}
              />
            </div>

            {erreurFormulaire && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2"
              >
                {erreurFormulaire}
              </div>
            )}

            <div className="flex justify-end gap-3 md:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setAfficherFormulaire(false);
                  setErreurFormulaire("");
                }}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={enregistrement}
                className="rounded-lg bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] px-5 py-2.5 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enregistrement ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {estAdmin ? "Tous les dossiers" : "Dossiers"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Rechercher par numéro, référence, agent, IM, objet, destination,
              statut ou observation.
            </p>
          </div>

          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un dossier..."
            className={`${CLASSE_INPUT} sm:max-w-sm`}
          />
        </div>

        {estSecDRBF && (
          <DossiersSecDRBF
            dossiers={dossiersFiltres}
            chargement={chargementDossiers}
            rechercheActive={!!recherche.trim()}
            onDetails={ouvrirDetails}
          />
        )}

        {estSecSRSP && (
          <DossiersSecSRSP
            dossiers={dossiersFiltres}
            chargement={chargementDossiers}
            rechercheActive={!!recherche.trim()}
            onDetails={ouvrirDetails}
            onTransfert={ouvrirTransfert}
          />
        )}

        {estDivision && (
          <DossiersDivision
            dossiers={dossiersFiltres}
            chargement={chargementDossiers}
            rechercheActive={!!recherche.trim()}
            onDetails={ouvrirDetails}
            onRenvoyer={renvoyerDossier}
            onCommencerTraitement={commencerTraitement}
            onValider={demanderValidation}
            onRejeter={demanderRejet}
            onRemettreResponsable={demanderRemiseResponsable}
          />
        )}

        {estAdmin && (
          <DossiersAdmin
            dossiers={dossiersFiltres}
            chargement={chargementDossiers}
            rechercheActive={!!recherche.trim()}
            onDetails={ouvrirDetails}
            onTransfert={ouvrirTransfert}
          />
        )}
      </div>

      <DossierDetailsModal
        dossier={dossierSelectionne}
        agentsDetails={agentsDetails}
        chargementAgentDetails={chargementAgentDetails}
        erreurDetails={erreurDetails}
        agentsOuverts={agentsOuverts}
        onFermer={fermerDetails}
        onBasculerAgent={basculerAgentOuvert}
      />

      <TransfertModal
        dossier={dossierATransferer}
        destination={destinationTransfert}
        observationsAgents={observationsAgents}
        piecesCochees={piecesCochees}
        onDestinationChange={setDestinationTransfert}
        onObservationChange={modifierObservationAgent}
        onPieceChange={modifierPieceAgent}
        onFermer={fermerTransfert}
        onConfirmer={confirmerTransfert}
      />

      {dossierARenvoyer && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-confirmation-renvoi"
            className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xl text-[#8C6A1E]">
                ↩
              </div>

              <div className="flex-1">
                <h2
                  id="titre-confirmation-renvoi"
                  className="text-lg font-semibold text-slate-900"
                >
                  Renvoyer le BE à la SecSRSP ?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Le dossier{" "}
                  <span className="font-semibold text-slate-800">
                    {dossierARenvoyer.referenceDossier}
                  </span>{" "}
                  appartient au BE n°
                  <span className="font-semibold text-slate-800">
                    {" "}
                    {dossierARenvoyer.numeroBE}
                  </span>
                  .
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Le renvoi entraînera le retour de{" "}
                  <span className="font-semibold text-[#8C6A1E]">
                    tous les dossiers de ce BE
                  </span>{" "}
                  à la SecSRSP pour réorientation.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={renvoiEnCours}
                onClick={() => setDossierARenvoyer(null)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={renvoiEnCours}
                onClick={() => void confirmerRenvoi()}
                className="rounded-lg bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {renvoiEnCours ? "Renvoi en cours..." : "Renvoyer le BE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {dossierARejeter && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Rejeter le dossier ?
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Vous êtes sur le point de rejeter le dossier{" "}
              <span className="font-semibold">
                {dossierARejeter.referenceDossier}
              </span>
              .
            </p>

            <div className="mt-5">
              <label
                htmlFor="motif-rejet"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Motif du rejet
              </label>

              <textarea
                id="motif-rejet"
                value={motifRejet}
                onChange={(e) => setMotifRejet(e.target.value)}
                placeholder="Saisissez le motif du rejet..."
                rows={4}
                className="w-full text-slate-800 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#8C6A1E]"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDossierARejeter(null);
                  setMotifRejet("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={!motifRejet.trim() || decisionEnCours}
                onClick={() => void confirmerRejet()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {decisionEnCours ? "Rejet en cours..." : "Rejeter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {dossierAValider && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Valider le dossier ?
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Vous êtes sur le point de valider le dossier{" "}
              <span className="font-semibold">
                {dossierAValider.referenceDossier}
              </span>
              .
            </p>

            <p className="mt-3 text-sm text-slate-600">
              Cette action enregistrera le dossier comme validé.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDossierAValider(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={decisionEnCours}
                onClick={() => void confirmerValidation()}
                className="rounded-lg bg-[#8C6A1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#755817] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {decisionEnCours ? "Validation en cours..." : "Valider"}
              </button>
            </div>
          </div>
        </div>
      )}
      {dossierARemettre && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Remettre le dossier au responsable ?
            </h2>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={remiseEnCours}
                onClick={() => setDossierARemettre(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={remiseEnCours}
                onClick={() => void confirmerRemiseResponsable()}
                className="rounded-lg bg-[#8C6A1E] px-4 py-2 text-sm font-medium text-white hover:bg-[#755817] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {remiseEnCours
                  ? "Remise en cours..."
                  : "Remettre au responsable"}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmationEnvoiOuverte && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-confirmation-envoi-bes"
            className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xl text-[#8C6A1E]">
                →
              </div>

              <div className="flex-1">
                <h2
                  id="titre-confirmation-envoi-bes"
                  className="text-lg font-semibold text-slate-900"
                >
                  Envoyer les BE à la SecSRSP ?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Tous les BE encore enregistrés à la SecDRBF seront transmis à
                  la SecSRSP. Leur statut restera « En attente ».
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={envoiBEsEnCours}
                onClick={() => setConfirmationEnvoiOuverte(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={envoiBEsEnCours}
                onClick={() => void confirmerEnvoiBEsSecSRSP()}
                className="rounded-lg bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {envoiBEsEnCours ? "Envoi en cours..." : "Confirmer l'envoi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
