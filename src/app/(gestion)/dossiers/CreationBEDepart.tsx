"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dossier } from "./page";
import { objetsDossier } from "@/data/objetsDossier";
import { API } from "@/lib/api";
import type { jsPDF } from "jspdf";

type Props = {
  dossiers: Dossier[];
  roleDivision: string;
  onFermer: () => void;
};

type AgentBE = {
  idAgent: number;
  nomComplet: string;
  IM: string | null;
};

type LigneAgent = {
  cle: string;
  idAgent: string;
  nombreActes: string;
  mvt: string;
};

type Paquet = {
  cle: string;
  agents: LigneAgent[];
};

type Chapitre = {
  cle: string;
  code: string;
  paquets: Paquet[];
};

const CLASSE_INPUT =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528]";
const objetsDisponibles = [
  ...new Set(objetsDossier.map((element) => element.objet)),
];

function nouvelleLigneAgent(): LigneAgent {
  return {
    cle: crypto.randomUUID(),
    idAgent: "",
    nombreActes: "01",
    mvt: "",
  };
}

function nouveauPaquet(): Paquet {
  return {
    cle: crypto.randomUUID(),
    agents: [nouvelleLigneAgent()],
  };
}

function nouveauChapitre(): Chapitre {
  return {
    cle: crypto.randomUUID(),
    code: "",
    paquets: [nouveauPaquet()],
  };
}

function observationParDefaut(objet: string) {
  const objetNormalise = objet.toLocaleLowerCase();

  if (objetNormalise.includes("mandatement")) {
    return "POUR MANDATEMENT";
  }

  if (objetNormalise.includes("retraite")) {
    return "POUR ADMISSION A LA RETRAITE";
  }

  if (objetNormalise.includes("avancement")) {
    return "POUR AVANCEMENT";
  }

  return objet ? `POUR ${objet.toLocaleUpperCase()}` : "POUR TRAITEMENT";
}

function dateDuJour() {
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = String(maintenant.getMonth() + 1).padStart(2, "0");
  const jour = String(maintenant.getDate()).padStart(2, "0");

  return `${annee}-${mois}-${jour}`;
}

function dateEnFrancais(date: string) {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function chargerImagePourPDF(url: string): Promise<string> {
  const reponse = await fetch(url);

  if (!reponse.ok) {
    throw new Error(`Impossible de charger le logo : ${url}`);
  }

  const image = await reponse.blob();

  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();

    lecteur.onload = () => {
      if (typeof lecteur.result === "string") {
        resolve(lecteur.result);
      } else {
        reject(new Error("Le logo n'a pas pu être lu."));
      }
    };

    lecteur.onerror = () => reject(new Error("Erreur de lecture du logo."));
    lecteur.readAsDataURL(image);
  });
}

function nomExpediteur(roleDivision: string) {
  const noms: Record<string, string> = {
    DIVISION_SOLDE:
      "LE CHEF DE SERVICE REGIONAL DE LA SOLDE ET DES PENSIONS VATOVAVY",
    DIVISION_VISA:
      "LE CHEF DE SERVICE REGIONAL DE LA SOLDE ET DES PENSIONS VATOVAVY",
    DIVISION_PENSIONS:
      "LE CHEF DE SERVICE REGIONAL DE LA SOLDE ET DES PENSIONS VATOVAVY",
    DIVISION_SECOURS:
      "LE CHEF DE SERVICE REGIONAL DE LA SOLDE ET DES PENSIONS VATOVAVY",
  };

  return noms[roleDivision] ?? "LE CHEF DE SERVICE REGIONAL";
}

export default function CreationBEDepart({
  dossiers,
  roleDivision,
  onFermer,
}: Props) {
  const maintenant = new Date();

  const [annee, setAnnee] = useState(String(maintenant.getFullYear()));
  const [numeroBE, setNumeroBE] = useState<number | null>(null);
  const [destinataire, setDestinataire] = useState(
    "Monsieur LE CHEF DE SERVICE CENTRAL DE LA SOLDE ANTANANARIVO",
  );
  const [expediteur, setExpediteur] = useState(nomExpediteur(roleDivision));
  const [dateEnvoi, setDateEnvoi] = useState(dateDuJour());
  const [objet, setObjet] = useState("");
  const [modeSaisie, setModeSaisie] = useState<"chapitres" | "agents">(
    "chapitres",
  );
  const [chapitres, setChapitres] = useState<Chapitre[]>([nouveauChapitre()]);
  const [agentsSimples, setAgentsSimples] = useState<
    {
      cle: string;
      idAgent: string;
      nomManuel: string;
      nombreActes: string;
      mvt: string;
    }[]
  >([
    {
      cle: crypto.randomUUID(),
      idAgent: "",
      nomManuel: "",
      nombreActes: "01",
      mvt: "",
    },
  ]);
  const [observation, setObservation] = useState("POUR TRAITEMENT");
  const [lieu, setLieu] = useState("Mananjary");

  const [telechargementEnCours, setTelechargementEnCours] = useState(false);
  const [erreurPDF, setErreurPDF] = useState("");
  const [chargementNumeroBE, setChargementNumeroBE] = useState(true);
  const cleReservationRef = useRef<string | null>(null);

  useEffect(() => {
    let actif = true;
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      setErreurPDF("Votre session a expiré. Reconnectez-vous pour créer un BE.");
      setChargementNumeroBE(false);
      return () => {
        actif = false;
      };
    }

    cleReservationRef.current ??= crypto.randomUUID();

    async function reserverNumeroBE() {
      try {
        const reponse = await fetch(`${API}/api/dossiers/reserver-numero-be`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": cleReservationRef.current!,
          },
        });
        const resultat = await reponse.json().catch(() => null);

        if (!reponse.ok || typeof resultat?.numeroBE !== "number") {
          throw new Error(
            typeof resultat?.detail === "string"
              ? resultat.detail
              : "Impossible de réserver le numéro du BE.",
          );
        }

        if (actif) setNumeroBE(resultat.numeroBE);
      } catch (error) {
        if (actif) {
          setErreurPDF(
            error instanceof Error
              ? error.message
              : "Erreur lors de la réservation du numéro de BE.",
          );
        }
      } finally {
        if (actif) setChargementNumeroBE(false);
      }
    }

    void reserverNumeroBE();

    return () => {
      actif = false;
    };
  }, []);

  const agentsDisponibles = useMemo(() => {
    const objetRecherche = objet.trim().toLocaleLowerCase();

    if (!objetRecherche) return [];

    const agents = new Map<number, AgentBE>();

    for (const dossier of dossiers) {
      if (
        dossier.statutDossier !== "Visé" ||
        dossier.objet.trim().toLocaleLowerCase() !== objetRecherche
      ) {
        continue;
      }

      for (const agent of dossier.agents) {
        if (!agents.has(agent.idAgent)) {
          agents.set(agent.idAgent, {
            idAgent: agent.idAgent,
            nomComplet: agent.nomComplet,
            IM: agent.IM,
          });
        }
      }
    }

    return [...agents.values()].sort((a, b) =>
      a.nomComplet.localeCompare(b.nomComplet, "fr"),
    );
  }, [dossiers, objet]);

  const totalActes =
    modeSaisie === "chapitres"
      ? chapitres.reduce(
          (totalChapitre, chapitre) =>
            totalChapitre +
            chapitre.paquets.reduce(
              (totalPaquet, paquet) =>
                totalPaquet +
                paquet.agents.reduce(
                  (totalAgents, agent) =>
                    totalAgents + (Number.parseInt(agent.nombreActes, 10) || 0),
                  0,
                ),
              0,
            ),
          0,
        )
      : agentsSimples.reduce(
          (total, agent) =>
            total + (Number.parseInt(agent.nombreActes, 10) || 0),
          0,
        );

  function mettreAJourChapitre(
    cleChapitre: string,
    miseAJour: (chapitre: Chapitre) => Chapitre,
  ) {
    setChapitres((actuels) =>
      actuels.map((chapitre) =>
        chapitre.cle === cleChapitre ? miseAJour(chapitre) : chapitre,
      ),
    );
  }

  function ajouterChapitre() {
    setChapitres((actuels) => [...actuels, nouveauChapitre()]);
  }

  function ajouterPaquet(cleChapitre: string) {
    mettreAJourChapitre(cleChapitre, (chapitre) => ({
      ...chapitre,
      paquets: [...chapitre.paquets, nouveauPaquet()],
    }));
  }

  function ajouterAgent(cleChapitre: string, clePaquet: string) {
    mettreAJourChapitre(cleChapitre, (chapitre) => ({
      ...chapitre,
      paquets: chapitre.paquets.map((paquet) =>
        paquet.cle === clePaquet
          ? { ...paquet, agents: [...paquet.agents, nouvelleLigneAgent()] }
          : paquet,
      ),
    }));
  }

  async function telechargerBE() {
    setTelechargementEnCours(true);
    setErreurPDF("");

    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const [logoRepublique, logoDGBF] = await Promise.all([
        chargerImagePourPDF("/Logo_RM_MEF.png"),
        chargerImagePourPDF("/logoDGBF.png"),
      ]);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let lignes: string[][] = [];
      if (modeSaisie === "chapitres") {
        lignes = [];
        chapitres.forEach((chapitre, indexChapitre) => {
          chapitre.paquets.forEach((paquet, indexPaquet) => {
            paquet.agents.forEach((ligne, indexAgent) => {
              const agent = agentsDisponibles.find(
                (element) => String(element.idAgent) === ligne.idAgent,
              );

              if (indexChapitre === 0 && indexPaquet === 0 && indexAgent === 0) {
                lignes.push([`Dossier ${objet.toLocaleLowerCase()} aux noms de :`, "", "", ""]);
              }

              if (indexAgent === 0) {
                lignes.push([`Chapitre : ${chapitre.code || "—"}`, "", "", ""]);
              }

              if (indexAgent === 0) {
                lignes.push([
                  `Paquet N°${String(indexPaquet + 1).padStart(2, "0")} :`,
                  "",
                  "",
                  "",
                ]);
              }

              lignes.push([
                `- ${agent?.nomComplet ?? "Agent non sélectionné"} ; IM : ${agent?.IM ?? "—"}`,
                ligne.nombreActes || "0",
                ligne.mvt || "—",
                "",
              ]);
            });
          });
        });
      } else {
        lignes = [];
        agentsSimples.forEach((agent, idx) => {
          let nom = "";
          let im = "";
          if (agent.idAgent) {
            const agentTrouve = agentsDisponibles.find(
              (a) => String(a.idAgent) === agent.idAgent,
            );
            nom = agentTrouve?.nomComplet || "";
            im = agentTrouve?.IM || "";
          } else if (agent.nomManuel) {
            nom = agent.nomManuel;
            im = "";
          }

          if (idx === 0) {
            lignes.push([`Dossier ${objet.toLocaleLowerCase()} aux noms de :`, "", "", ""]);
          }

          lignes.push([
            `- ${nom}${im ? ` ; IM : ${im}` : ""}`,
            agent.nombreActes || "0",
            agent.mvt || "—",
            "",
          ]);
        });
      }

      function dessinerEntete(document: jsPDF) {
        const largeurPage = document.internal.pageSize.getWidth();

        document.setTextColor(0, 0, 0);
        document.setFont("helvetica", "normal");

        const logoRepubliqueDimensions =
          document.getImageProperties(logoRepublique);
        const largeurLogoRepublique = 40;
        const hauteurLogoRepublique =
          (largeurLogoRepublique * logoRepubliqueDimensions.height) /
          logoRepubliqueDimensions.width;

        document.addImage(
          logoRepublique,
          "PNG",
          (largeurPage - largeurLogoRepublique) / 2,
          3,
          largeurLogoRepublique,
          hauteurLogoRepublique,
        );

        const logoDGBFDimensions = document.getImageProperties(logoDGBF);
        const largeurLogoDGBF = 26;
        const hauteurLogoDGBF =
          (largeurLogoDGBF * logoDGBFDimensions.height) /
          logoDGBFDimensions.width;

        document.addImage(
          logoDGBF,
          "PNG",
          43,
          32,
          largeurLogoDGBF,
          hauteurLogoDGBF,
        );

        document.setFontSize(8);
        document.setFont("helvetica", "bold");

        document.text(
          [
            "MINISTERE DE L'ECONOMIE ET DES FINANCES",
            "SECRETARIAT GENERAL",
            "DIRECTION GENERALE DU BUDGET ET DES FINANCES",
            "DIRECTION REGIONALE DU BUDGET ET DES FINANCES",
            "Service Régional de la Solde et des Pensions",
            "VATOVAVY",
            "--oOo--",
          ],
          57,
          72,
          {
            align: "center",
            lineHeightFactor: 1.8,
          },
        );

        document.setFontSize(8);
        document.setFont("helvetica", "normal");

        const centreBlocAdresse = 157;
        const largeurBlocAdresse = 82;

        document.text(
          `${lieu}, le ${dateEnFrancais(dateEnvoi).toLocaleUpperCase()}`,
          centreBlocAdresse,
          77,
          { align: "center" },
        );

        document.setFont("helvetica", "bold");

        const lignesExpediteur = document.splitTextToSize(
          expediteur,
          largeurBlocAdresse,
        );

        document.text(lignesExpediteur, centreBlocAdresse, 86, {
          align: "center",
          lineHeightFactor: 1.4,
        });

        const positionA = 86 + lignesExpediteur.length * 5 + 5;

        document.setFont("helvetica", "normal");

        document.text("À", centreBlocAdresse, positionA, {
          align: "center",
        });

        const lignesDestinataire = document.splitTextToSize(
          destinataire,
          largeurBlocAdresse,
        );

        document.text(lignesDestinataire, centreBlocAdresse, positionA + 10, {
          align: "center",
          lineHeightFactor: 1.4,
        });

        document.setFont("helvetica", "bold");
        document.setFontSize(10);

        const titre = `BORDEREAU D'ENVOI N° ${numeroFormate} /${annee}-MEF/SG/DGBF/DRBF/SRSP.VTV`;
        const titreLignes = document.splitTextToSize(titre, largeurPage - 28);

        document.text(titreLignes, largeurPage / 2, 130, {
          align: "center",
          lineHeightFactor: 1.2,
        });
      }

      const limitesObservationsParPage = new Map<
        number,
        { haut: number; bas: number }
      >();

      autoTable(pdf, {
        head: [
          ["DESIGNATION DES PIECES", "NOMBRE ACTE", "MVT", "OBSERVATIONS"],
        ],
        body: lignes,
        foot: [["TOTAL", String(totalActes).padStart(2, "0"), "", ""]],
        showFoot: "lastPage",
        rowPageBreak: "avoid",
        startY: 135,
        margin: {
          top: 135,
          right: 14,
          bottom: 15,
          left: 14,
        },
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 8,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
          cellPadding: 2,
          overflow: "linebreak",
          valign: "top",
          fillColor: [255, 255, 255],
        },
        headStyles: {
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          minCellHeight: 10,
        },
        footStyles: {
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          minCellHeight: 8,
          lineWidth: {
            top: 0.2,
            bottom: 0.2,
            left: 0.2,
            right: 0.2,
          },
        },
        columnStyles: {
          0: {
            cellWidth: 98,
            valign: "top",
          },
          1: { cellWidth: 20, halign: "center", valign: "middle" },
          2: { cellWidth: 18, halign: "center", valign: "middle" },
          3: { cellWidth: 46, halign: "center", valign: "middle" },
        },
        didParseCell: (data) => {
          if (data.section === "body") {
            // Réduction de la hauteur minimale pour un rendu plus compact et élégant
            data.cell.styles.minCellHeight = lignes.length <= 4 ? 18 : 8;

            data.cell.styles.lineWidth = {
              top: 0,
              bottom: 0,
              left: 0.2,
              right: 0.2,
            };

            if (data.column.index === 0) {
              data.cell.styles.cellPadding = {
                top: 1.5,
                right: 2,
                bottom: 1.5,
                left: 3,
              };
            }
          }

          if (data.section === "foot") {
            data.cell.styles.lineWidth = {
              top: data.column.index === 3 ? 0 : 0.2,
              bottom: 0.2,
              left: 0.2,
              right: 0.2,
            };
          }
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const texteLigne = String(data.cell.text ?? "");
            const xTexte = data.cell.x + 3;
            // Correction : positionné à 4.2 mm du haut de la cellule (juste sous le texte)
            const ySoulignement = data.cell.y + 4.2;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.2);

            if (texteLigne.startsWith("Chapitre")) {
              const largeurMot = pdf.getTextWidth("Chapitre");
              pdf.line(xTexte, ySoulignement, xTexte + largeurMot, ySoulignement);
            } else if (texteLigne.startsWith("Paquet N°")) {
              const matchPaquet = texteLigne.match(/^Paquet N°\d+/);
              const texteASouligner = matchPaquet ? matchPaquet[0] : "Paquet";
              const largeurMot = pdf.getTextWidth(texteASouligner);
              pdf.line(xTexte, ySoulignement, xTexte + largeurMot, ySoulignement);
            }
          }

          if (data.section === "body" && data.column.index === 3) {
            const limites = limitesObservationsParPage.get(data.pageNumber);

            limitesObservationsParPage.set(data.pageNumber, {
              haut: limites ? Math.min(limites.haut, data.cell.y) : data.cell.y,
              bas: limites
                ? Math.max(limites.bas, data.cell.y + data.cell.height)
                : data.cell.y + data.cell.height,
            });

            if (!limites) {
              pdf.setDrawColor(0, 0, 0);
              pdf.setLineWidth(0.2);
              pdf.line(14, data.cell.y, 14 + 98 + 20 + 18 + 46, data.cell.y);
            }
          }
        },
        didDrawPage: (data) => {
          dessinerEntete(pdf);

          const limites = limitesObservationsParPage.get(data.pageNumber);

          if (limites) {
            const centreX = 14 + 98 + 20 + 18 + 23;
            const centreY = (limites.haut + limites.bas) / 2;
            const largeurMax = 42;
            const taillePolice = 8;
            const facteurInterligne = 1.3;
            const hauteurInterligne =
              (taillePolice * facteurInterligne) / 2.8346;
            const espaceEntreTextes = 2.5;

            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(taillePolice);
            pdf.setFont("helvetica", "normal");
            const lignesIntro = pdf.splitTextToSize(
              "En ayant l'honneur de vous transmettre",
              largeurMax,
            );

            const texteBrut = (observation || `POUR ${objet || "TRAITEMENT"}`)
              .trim()
              .toLocaleUpperCase();
            const mentionPour = texteBrut.startsWith("POUR ")
              ? texteBrut
              : `POUR ${texteBrut}`;
            const texteObjet = `« ${mentionPour} »`;

            pdf.setFont("helvetica", "bold");
            const lignesObjet = pdf.splitTextToSize(texteObjet, largeurMax);

            const hauteurBloc =
              (lignesIntro.length + lignesObjet.length) * hauteurInterligne +
              espaceEntreTextes;
            const debutY = Math.max(
              limites.haut + 5,
              centreY - hauteurBloc / 2 + hauteurInterligne * 0.8,
            );

            pdf.setFont("helvetica", "normal");
            pdf.text(lignesIntro, centreX, debutY, {
              align: "center",
              lineHeightFactor: facteurInterligne,
            });

            pdf.setFont("helvetica", "bold");
            pdf.text(
              lignesObjet,
              centreX,
              debutY +
                lignesIntro.length * hauteurInterligne +
                espaceEntreTextes,
              {
                align: "center",
                lineHeightFactor: facteurInterligne,
              },
            );
          }

          if (data.cursor) {
            const debutXObservation = 14 + 98 + 20 + 18;
            const finXObservation = debutXObservation + 46;
            const basYTableau = data.cursor.y;

            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.2);
            pdf.line(
              debutXObservation,
              basYTableau,
              finXObservation,
              basYTableau,
            );
          }
        },
      });

      const nomFichier = `BE-${numeroFormate}-${annee}.pdf`;
      pdf.save(nomFichier);
    } catch (erreur) {
      setErreurPDF(
        erreur instanceof Error
          ? erreur.message
          : "Le téléchargement du BE a échoué.",
      );
    } finally {
      setTelechargementEnCours(false);
    }
  }

  const numeroFormate = String(numeroBE ?? "").padStart(3, "0");

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !telechargementEnCours) {
          onFermer();
        }
      }}
      className="be-modal-backdrop fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-0 sm:p-6"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-creation-be-depart"
        className="be-modal-panel max-h-[100dvh] w-full max-w-6xl overflow-y-auto rounded-none border border-amber-200 bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-xl sm:p-6"
      >
        <style jsx global>{`
          @page {
            size: A4 portrait;
            margin: 15mm;
          }

          @media print {
            body * {
              visibility: hidden !important;
            }

            .be-depart-document,
            .be-depart-document * {
              visibility: visible !important;
            }

            .be-depart-document {
              display: block !important;
              position: absolute !important;
              inset: 0 auto auto 0 !important;
              width: 100% !important;
              color: #000 !important;
              background: #fff !important;
              font-family: Arial, sans-serif !important;
              font-size: 9pt !important;
            }

            .be-depart-document table {
              width: 100%;
              border-collapse: collapse;
            }

            .be-depart-document thead {
              display: table-header-group;
            }

            .be-depart-document tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .be-depart-document th,
            .be-depart-document td {
              border: 1px solid #000 !important;
              padding: 5px !important;
              vertical-align: top;
            }

            .be-depart-document .be-header {
              border: 0 !important;
              padding: 0 0 10px !important;
            }

            .be-depart-document .be-header-inner {
              display: flex;
              justify-content: space-between;
              gap: 16px;
            }

            .be-depart-document .be-admin,
            .be-depart-document .be-address {
              width: 50%;
              text-align: center;
              line-height: 1.25;
            }

            .be-depart-document .be-logo {
              height: 45px;
              max-width: 90px;
              object-fit: contain;
              margin: 0 auto 5px;
            }

            .be-depart-document .be-title {
              text-align: center;
              font-weight: bold;
              text-decoration: underline;
              padding: 8px 0 !important;
            }

            .be-depart-document .be-col-designation {
              width: 55%;
            }

            .be-depart-document .be-col-nombre,
            .be-depart-document .be-col-mvt {
              width: 10%;
              text-align: center;
            }

            .be-depart-document .be-col-observation {
              width: 25%;
              text-align: center;
            }

            .be-depart-document .be-total {
              font-weight: bold;
              text-align: center;
            }

            .be-depart-document .be-signature {
              border: 0 !important;
              text-align: right;
              padding-top: 40px !important;
              color: #9b1c1c;
              font-weight: bold;
            }

            .be-depart-form {
              display: none !important;
            }
          }
        `}</style>

        <div className="be-depart-form">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="titre-creation-be-depart"
                className="text-lg font-semibold text-slate-900"
              >
                Créer un BE de départ
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Les suggestions d’agents viennent des dossiers visés ayant le
                même objet.
              </p>
            </div>

            <button
              type="button"
              onClick={onFermer}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              x
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Destinataire
              </label>
              <input
                value={destinataire}
                onChange={(e) => setDestinataire(e.target.value)}
                className={CLASSE_INPUT}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Expéditeur
              </label>
              <input
                value={expediteur}
                onChange={(e) => setExpediteur(e.target.value)}
                className={CLASSE_INPUT}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Numéro du BE
              </label>
              <input
                type="text"
                value={numeroBE ?? ""}
                readOnly
                placeholder={chargementNumeroBE ? "Réservation..." : "Indisponible"}
                className={CLASSE_INPUT}
              />
              <p className="mt-1 text-xs text-slate-500">
                Référence affichée : BORDERAU D’ENVOI N° {numeroFormate} /
                {annee}
                -MEF/SG/DGBF/DRBF/SRSP.VTV
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Année
              </label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={annee}
                onChange={(e) => setAnnee(e.target.value)}
                className={CLASSE_INPUT}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Date d’envoi
              </label>
              <input
                type="date"
                value={dateEnvoi}
                onChange={(e) => setDateEnvoi(e.target.value)}
                className={CLASSE_INPUT}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Lieu
              </label>
              <input
                value={lieu}
                onChange={(e) => setLieu(e.target.value)}
                className={CLASSE_INPUT}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Objet
              </label>
              <input
                list="objets-be-depart"
                value={objet}
                onChange={(e) => {
                  const nouvelObjet = e.target.value;
                  setObjet(nouvelObjet);
                  setObservation(observationParDefaut(nouvelObjet));
                }}
                placeholder="Choisir ou saisir un objet"
                className={CLASSE_INPUT}
              />
              <datalist id="objets-be-depart">
                {objetsDisponibles.map((objetDisponible) => (
                  <option key={objetDisponible} value={objetDisponible} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 sm:gap-4">
            <button
              type="button"
              className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-medium sm:flex-none ${modeSaisie === "chapitres" ? "border-[#B38528] text-[#705212] bg-amber-50" : "border-slate-300 text-slate-700 bg-white"}`}
              onClick={() => setModeSaisie("chapitres")}
            >
              Ajouter des chapitres
            </button>
            <button
              type="button"
              className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-medium sm:flex-none ${modeSaisie === "agents" ? "border-[#B38528] text-[#705212] bg-amber-50" : "border-slate-300 text-slate-700 bg-white"}`}
              onClick={() => setModeSaisie("agents")}
            >
              Sans chapitre
            </button>
          </div>

          {modeSaisie === "chapitres" ? (
            <>
              <div className="mt-6 space-y-5">
                {chapitres.map((chapitre, indexChapitre) => (
                  <section
                    key={chapitre.cle}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Chapitre {indexChapitre + 1}
                        </h3>
                        <label className="mt-2 block text-sm text-slate-700">
                          Code du chapitre
                        </label>
                        <input
                          value={chapitre.code}
                          onChange={(e) =>
                            mettreAJourChapitre(chapitre.cle, (actuel) => ({
                              ...actuel,
                              code: e.target.value,
                            }))
                          }
                          placeholder="Ex. 00 210 114"
                          className={`${CLASSE_INPUT} mt-1`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => ajouterPaquet(chapitre.cle)}
                        className="rounded-lg border border-[#B38528] px-3 py-2 text-sm font-medium text-[#705212] hover:bg-amber-50"
                      >
                        + Ajouter un paquet
                      </button>
                    </div>

                    <div className="space-y-4">
                      {chapitre.paquets.map((paquet, indexPaquet) => (
                        <section
                          key={paquet.cle}
                          className="rounded-lg bg-slate-50 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold text-slate-800">
                              Paquet N°{String(indexPaquet + 1).padStart(2, "0")}
                            </h4>

                            <button
                              type="button"
                              onClick={() =>
                                ajouterAgent(chapitre.cle, paquet.cle)
                              }
                              className="text-sm font-medium text-[#8C6A1E] hover:underline"
                            >
                              + Ajouter un agent
                            </button>
                          </div>

                          <div className="space-y-3">
                            {paquet.agents.map((ligne, indexAgent) => (
                              <div
                                key={ligne.cle}
                                className="grid gap-3 border-t border-slate-200 pt-3 md:grid-cols-[minmax(0,2fr)_120px_140px]"
                              >
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">
                                    Agent {indexAgent + 1}
                                  </label>
                                  <select
                                    value={ligne.idAgent}
                                    onChange={(e) => {
                                      const idAgent = e.target.value;
                                      mettreAJourChapitre(
                                        chapitre.cle,
                                        (actuel) => ({
                                          ...actuel,
                                          paquets: actuel.paquets.map(
                                            (paquetActuel) =>
                                              paquetActuel.cle === paquet.cle
                                                ? {
                                                    ...paquetActuel,
                                                    agents:
                                                      paquetActuel.agents.map(
                                                        (agentActuel) =>
                                                          agentActuel.cle ===
                                                          ligne.cle
                                                            ? {
                                                                ...agentActuel,
                                                                idAgent,
                                                              }
                                                            : agentActuel,
                                                      ),
                                                  }
                                                : paquetActuel,
                                          ),
                                        }),
                                      );
                                    }}
                                    disabled={!objet}
                                    className={CLASSE_INPUT}
                                  >
                                    <option value="">
                                      {objet
                                        ? agentsDisponibles.length > 0
                                          ? "Sélectionner un agent"
                                          : "Aucun agent visé pour cet objet"
                                        : "Choisir d’abord l’objet"}
                                    </option>
                                    {agentsDisponibles.map((agent) => (
                                      <option
                                        key={agent.idAgent}
                                        value={String(agent.idAgent)}
                                      >
                                        {agent.nomComplet} ; IM :{" "}
                                        {agent.IM ?? "—"}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">
                                    Nombre acte
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={ligne.nombreActes}
                                    onChange={(e) =>
                                      mettreAJourChapitre(
                                        chapitre.cle,
                                        (actuel) => ({
                                          ...actuel,
                                          paquets: actuel.paquets.map(
                                            (paquetActuel) =>
                                              paquetActuel.cle === paquet.cle
                                                ? {
                                                    ...paquetActuel,
                                                    agents:
                                                      paquetActuel.agents.map(
                                                        (agentActuel) =>
                                                          agentActuel.cle ===
                                                          ligne.cle
                                                            ? {
                                                                ...agentActuel,
                                                                nombreActes:
                                                                  e.target
                                                                    .value,
                                                              }
                                                            : agentActuel,
                                                      ),
                                                  }
                                                : paquetActuel,
                                          ),
                                        }),
                                      )
                                    }
                                    className={CLASSE_INPUT}
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-600">
                                    MVT
                                  </label>
                                  <input
                                    type="text"
                                    value={ligne.mvt}
                                    onChange={(e) =>
                                      mettreAJourChapitre(
                                        chapitre.cle,
                                        (actuel) => ({
                                          ...actuel,
                                          paquets: actuel.paquets.map(
                                            (paquetActuel) =>
                                              paquetActuel.cle === paquet.cle
                                                ? {
                                                    ...paquetActuel,
                                                    agents:
                                                      paquetActuel.agents.map(
                                                        (agentActuel) =>
                                                          agentActuel.cle ===
                                                          ligne.cle
                                                            ? {
                                                                ...agentActuel,
                                                                mvt: e.target
                                                                  .value,
                                                              }
                                                            : agentActuel,
                                                      ),
                                                  }
                                                : paquetActuel,
                                          ),
                                        }),
                                      )
                                    }
                                    placeholder="Ex. 13 ou 71/67"
                                    className={CLASSE_INPUT}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <button
                type="button"
                onClick={ajouterChapitre}
                className="mt-5 rounded-lg border border-[#B38528] px-3 py-2 text-sm font-medium text-[#705212] hover:bg-amber-50"
              >
                + Ajouter un chapitre
              </button>
            </>
          ) : (
            <>
              <div className="mt-6 space-y-5">
                <section className="rounded-lg border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">
                    Liste des agents concernés
                  </h3>
                  <div className="space-y-3">
                    {agentsSimples.map((agent, idx) => (
                      <div
                        key={agent.cle}
                        className="grid gap-3 border-t border-slate-200 pt-3 md:grid-cols-[minmax(0,2fr)_120px_140px]"
                      >
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            Agent {idx + 1}
                          </label>
                          <select
                            value={agent.idAgent}
                            onChange={(e) => {
                              const idAgent = e.target.value;
                              setAgentsSimples((list) =>
                                list.map((a) =>
                                  a.cle === agent.cle
                                    ? { ...a, idAgent, nomManuel: "" }
                                    : a,
                                ),
                              );
                            }}
                            disabled={!objet}
                            className={CLASSE_INPUT}
                          >
                            <option value="">
                              {objet
                                ? agentsDisponibles.length > 0
                                  ? "Sélectionner un agent"
                                  : "Aucun agent visé pour cet objet"
                                : "Choisir d’abord l’objet"}
                            </option>
                            {agentsDisponibles.map((a) => (
                              <option key={a.idAgent} value={String(a.idAgent)}>
                                {a.nomComplet} ; IM : {a.IM ?? "—"}
                              </option>
                            ))}
                          </select>
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={agent.nomManuel}
                              onChange={(e) =>
                                setAgentsSimples((list) =>
                                  list.map((a) =>
                                    a.cle === agent.cle
                                      ? {
                                          ...a,
                                          nomManuel: e.target.value,
                                          idAgent: "",
                                        }
                                      : a,
                                  ),
                                )
                              }
                              placeholder="Ou saisir un nom libre"
                              className={CLASSE_INPUT}
                              disabled={!!agent.idAgent}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            Nombre acte
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={agent.nombreActes}
                            onChange={(e) =>
                              setAgentsSimples((list) =>
                                list.map((a) =>
                                  a.cle === agent.cle
                                    ? { ...a, nombreActes: e.target.value }
                                    : a,
                                ),
                              )
                            }
                            className={CLASSE_INPUT}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            MVT
                          </label>
                          <input
                            type="text"
                            value={agent.mvt}
                            onChange={(e) =>
                              setAgentsSimples((list) =>
                                list.map((a) =>
                                  a.cle === agent.cle
                                    ? { ...a, mvt: e.target.value }
                                    : a,
                                ),
                              )
                            }
                            placeholder="Ex. 13 ou 71/67"
                            className={CLASSE_INPUT}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          {agentsSimples.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setAgentsSimples((list) =>
                                  list.filter((a) => a.cle !== agent.cle),
                                )
                              }
                              className="text-xs text-red-600 hover:underline"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAgentsSimples((list) => [
                        ...list,
                        {
                          cle: crypto.randomUUID(),
                          idAgent: "",
                          nomManuel: "",
                          nombreActes: "01",
                          mvt: "",
                        },
                      ])
                    }
                    className="mt-4 rounded-lg border border-[#B38528] px-3 py-2 text-sm font-medium text-[#705212] hover:bg-amber-50"
                  >
                    + Ajouter un agent
                  </button>
                </section>
              </div>
            </>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Observation
              </label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={2}
                className={CLASSE_INPUT}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            {erreurPDF && (
              <p role="alert" className="mr-auto text-sm text-red-700">
                {erreurPDF}
              </p>
            )}

            <button
              type="button"
              onClick={() => void telechargerBE()}
              disabled={
                !objet ||
                numeroBE === null ||
                chargementNumeroBE ||
                totalActes === 0 ||
                telechargementEnCours
              }
              className="rounded-lg bg-[#8C6A1E] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#755817] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {telechargementEnCours
                ? "Préparation du PDF..."
                : "Télécharger le BE"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}