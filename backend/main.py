
from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import String, cast, func, or_, text
from datetime import datetime, timezone

from database import Base, engine
from models import (
    Utilisateur,
    Agent,
    BE,
    Dossier,
    DossierAgent,
    Transmission,
    ActionDossier,
    Notification,
)
from security import verifier_mot_de_passe, creer_jeton
from dependencies import (
    obtenir_utilisateur_connecte,
    exiger_roles,
    obtenir_session_db,
)

from schemas import (
    ConnexionRequest,
    ConnexionResponse,
    DossierCreationRequest,
    TransfertRequest,
)

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
    Body,
    UploadFile,
    File,
    Form,
    Query,
)

from agent_import import lire_agents_excel

import logging

logger = logging.getLogger(__name__)

# ============================================================
# INITIALISATION
# ============================================================

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gestion Dossier SRSP",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROLES_AUTORISES = (
    "SecDRBF",
    "SecSRSP",
    "DIVISION_SOLDE",
    "DIVISION_VISA",
    "DIVISION_PENSIONS",
    "DIVISION_SECOURS",
    "ADMIN",
)

CLE_VERROU_NUMEROTATION_BE = 847261


# ============================================================
# OUTILS DE NUMEROTATION ET DE FORMATAGE
# ============================================================

def prochain_numero_be(db: Session) -> int:
    dernier_numero = db.query(
        func.max(BE.numeroBE)
    ).scalar()

    return (dernier_numero or 0) + 1


def formater_agent(agent: Agent) -> dict:
    return {
        "idAgent": agent.idAgent,
        "IM": agent.IM,
        "numeroPension": agent.numeroPension,
        "nom": agent.nom,
        "prenoms": agent.prenoms,
        "nomComplet": (
            f"{agent.nom} {agent.prenoms or ''}"
        ).strip(),
        "CIN": agent.CIN,
        "corpsCode": agent.corpsCode,
        "sectionCode": agent.sectionCode,
        "FIVCode": agent.FIVCode,
        "typeAgent": agent.typeAgent,
    }
    
def normaliser_chaine(valeur: str | None) -> str | None:
    if valeur is None:
        return None

    texte = str(valeur).strip()
    return texte or None


def normaliser_type_agent(valeur: str | None) -> str:
    if valeur is None:
        return "en_poste"

    type_agent = str(valeur).strip().lower()

    if type_agent in {"en_poste", "en poste", "en-poste"}:
        return "en_poste"

    if type_agent in {"retraite", "retraité", "retraitee"}:
        return "retraite"

    return "en_poste"    


def formater_transmission(transmission):
    if transmission is None:
        return {
            "origine": None,
            "destination": None,
            "dateEnvoi": None,
            "dateReceptionTransmission": None,
            "statutTransmission": None,
            "informationsComplementaires": None,
        }

    return {
        "origine": transmission.origine,
        "destination": transmission.destination,
        "dateEnvoi": (
            transmission.dateEnvoi.isoformat()
            if transmission.dateEnvoi
            else None
        ),
        "dateReceptionTransmission": (
            transmission.dateReception.isoformat()
            if transmission.dateReception
            else None
        ),
        "statutTransmission": transmission.statut,
        "informationsComplementaires": (
            transmission.informationsComplementaires
        ),
    }


def derniere_transmission(db: Session, id_dossier: int):
    return (
        db.query(Transmission)
        .filter(Transmission.idDossier == id_dossier)
        .order_by(Transmission.idTransmission.desc())
        .first()
    )


def formater_dossier_individuel(db: Session, dossier: Dossier):
    agents = [
        formater_agent(lien.agent)
        for lien in dossier.agents
    ]

    transmission = derniere_transmission(
        db,
        dossier.idDossier,
    )

    return {
        "id": dossier.idDossier,
        "idDossier": dossier.idDossier,
        "numeroBE": dossier.numeroBE,
        "referenceDossier": dossier.referenceDossier,
        "objet": dossier.objet,
        "agents": agents,
        "dateReception": (
            dossier.dateReception.isoformat()
            if dossier.dateReception
            else None
        ),
        "statutDossier": dossier.statut,
        "localisationActuelle": dossier.localisationActuelle,
        **formater_transmission(transmission),
    }


# ============================================================
# ROUTES DE TEST
# ============================================================

@app.get("/")
def accueil():
    return {
        "message": "API Gestion Dossier SRSP opérationnelle."
    }


@app.get("/api/test")
def test_api():
    return {
        "message": "Connexion frontend/backend fonctionnelle."
    }


@app.get("/api/test-solde")
def test_solde(
    utilisateur: Utilisateur = Depends(
        exiger_roles("DIVISION_SOLDE")
    ),
):
    return {
        "message": "Accès autorisé à la division SOLDE.",
        "identifiant": utilisateur.identifiant,
        "role": utilisateur.role,
    }


# ============================================================
# AUTHENTIFICATION
# ============================================================

@app.post(
    "/api/auth/login",
    response_model=ConnexionResponse,
)
def connexion(
    donnees: ConnexionRequest,
    db: Session = Depends(obtenir_session_db),
):
    utilisateur = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.identifiant == donnees.identifiant
        )
        .first()
    )

    if utilisateur is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant ou mot de passe incorrect.",
        )

    if not utilisateur.actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte est désactivé.",
        )

    if not verifier_mot_de_passe(
        donnees.motDePasse,
        utilisateur.motDePasse,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant ou mot de passe incorrect.",
        )

    jeton = creer_jeton(
        utilisateur.idUtilisateur,
        utilisateur.role,
    )

    return ConnexionResponse(
        access_token=jeton,
        token_type="bearer",
        identifiant=utilisateur.identifiant,
        role=utilisateur.role,
    )


@app.get("/api/auth/me")
def utilisateur_connecte(
    utilisateur: Utilisateur = Depends(
        obtenir_utilisateur_connecte
    ),
):
    return {
        "idUtilisateur": utilisateur.idUtilisateur,
        "identifiant": utilisateur.identifiant,
        "role": utilisateur.role,
    }


# ============================================================
# AGENTS
# ============================================================

@app.get("/api/agents/recherche")
def rechercher_agent(
    IM: str | None = None,
    numeroPension: str | None = None,
    utilisateur: Utilisateur = Depends(
        exiger_roles(*ROLES_AUTORISES)
    ),
    db: Session = Depends(obtenir_session_db),
):
    if not IM and not numeroPension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Veuillez fournir un IM ou un numéro de pension.",
        )

    if IM:
        agent = (
            db.query(Agent)
            .filter(Agent.IM == IM.strip())
            .first()
        )
    else:
        agent = (
            db.query(Agent)
            .filter(
                Agent.numeroPension == numeroPension.strip()
            )
            .first()
        )

    if agent is None:
        return {
            "trouve": False,
            "agent": None,
        }

    return {
        "trouve": True,
        "agent": formater_agent(agent),
    }


# ============================================================
# NOTIFICATIONS
# ============================================================

@app.get("/api/notifications")
def obtenir_notifications(
    utilisateur: Utilisateur = Depends(
        exiger_roles(*ROLES_AUTORISES)
    ),
    db: Session = Depends(obtenir_session_db),
):
    notifications = (
        db.query(Notification)
        .filter(
            Notification.roleDestinataire == utilisateur.role
        )
        .order_by(Notification.dateCreation.desc())
        .all()
    )

    return [
        {
            "idNotification": notification.idNotification,
            "idDossier": notification.idDossier,
            "message": notification.message,
            "lu": notification.lu,
            "dateCreation": (
                notification.dateCreation.isoformat()
                if notification.dateCreation
                else None
            ),
        }
        for notification in notifications
    ]


@app.put("/api/notifications/{idNotification}/lue")
def marquer_notification_lue(
    idNotification: int,
    utilisateur: Utilisateur = Depends(
        exiger_roles(*ROLES_AUTORISES)
    ),
    db: Session = Depends(obtenir_session_db),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.idNotification == idNotification,
            Notification.roleDestinataire == utilisateur.role,
        )
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification introuvable.",
        )

    notification.lu = True

    db.commit()
    db.refresh(notification)

    return {
        "message": "Notification marquée comme lue.",
        "notification": {
            "idNotification": notification.idNotification,
            "idDossier": notification.idDossier,
            "message": notification.message,
            "lu": notification.lu,
            "dateCreation": (
                notification.dateCreation.isoformat()
                if notification.dateCreation
                else None
            ),
        },
    }


# ============================================================
# NUMERO DU PROCHAIN BE
# ============================================================

@app.get("/api/dossiers/prochain-numero-be")
def obtenir_prochain_numero_be(
    utilisateur: Utilisateur = Depends(
        exiger_roles("SecDRBF")
    ),
    db: Session = Depends(obtenir_session_db),
):
    return {
        "numeroBE": prochain_numero_be(db)
    }


# ============================
# ENVOIES DES BE VERS SECSRSP
# ============================
@app.post("/api/dossiers/envoyer-secsrsp")
def envoyer_bes_secdrbf_vers_secsrsp(
    utilisateur: Utilisateur = Depends(
        exiger_roles("SecDRBF")
    ),
    db: Session = Depends(obtenir_session_db),
):
    try:
        dossiers_a_envoyer = (
            db.query(Dossier)
            .filter(Dossier.localisationActuelle == "SecDRBF")
            .order_by(Dossier.numeroBE.asc(), Dossier.idDossier.asc())
            .with_for_update()
            .all()
        )

        if not dossiers_a_envoyer:
            return {
                "message": "Aucun BE enregistré n'est prêt à être envoyé.",
                "nombreBE": 0,
                "nombreDossiers": 0,
            }

        numeros_be = {dossier.numeroBE for dossier in dossiers_a_envoyer}

        for dossier in dossiers_a_envoyer:
            dossier.localisationActuelle = "SecSRSP"
            dossier.statut = "En attente"

            db.add(
                Transmission(
                    idDossier=dossier.idDossier,
                    origine="SecDRBF",
                    destination="SecSRSP",
                    statut="En attente",
                    informationsComplementaires=(
                        "BE transmis par la SecDRBF vers la SecSRSP."
                    ),
                )
            )

            db.add(
                ActionDossier(
                    idDossier=dossier.idDossier,
                    roleActeur=utilisateur.role,
                    action="Envoi à la SecSRSP",
                    resultat="Succès",
                    observation="BE transmis à la SecSRSP.",
                )
            )

            db.add(
                Notification(
                    idDossier=dossier.idDossier,
                    roleDestinataire="SecSRSP",
                    message=(
                        f"Le BE n°{dossier.numeroBE} "
                        f"({dossier.referenceDossier}) "
                        "a été transmis par la SecDRBF."
                    ),
                )
            )

        db.commit()

        return {
            "message": (
                f"{len(numeros_be)} BE et "
                f"{len(dossiers_a_envoyer)} dossier(s) transmis "
                "à la SecSRSP."
            ),
            "nombreBE": len(numeros_be),
            "nombreDossiers": len(dossiers_a_envoyer),
        }

    except Exception:
        db.rollback()
        logger.exception(
            "Erreur lors de l'envoi des BE de la SecDRBF vers la SecSRSP"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Une erreur est survenue pendant l'envoi. "
                "Aucune modification n'a été enregistrée."
            ),
        )

# ============================================================
# CONSULTATION DES DOSSIERS
# ============================================================

@app.get("/api/dossiers")
def obtenir_dossiers(
    utilisateur: Utilisateur = Depends(
        exiger_roles(*ROLES_AUTORISES)
    ),
    db: Session = Depends(obtenir_session_db),
):
    requete = (
        db.query(Dossier)
        .options(
            joinedload(Dossier.agents).joinedload(
                DossierAgent.agent
            ),
            joinedload(Dossier.be),
        )
        .order_by(
            Dossier.dateReception.desc(),
            Dossier.idDossier.desc(),
        )
    )

    if utilisateur.role != "ADMIN":

    # Une division ne voit que les dossiers
    # actuellement dans son service.
        if utilisateur.role.startswith("DIVISION_"):
            requete = requete.filter(
                Dossier.localisationActuelle == utilisateur.role
            )

        # SecDRBF : dossiers encore chez elle,
        # ou déjà envoyés (historique).
        elif utilisateur.role == "SecDRBF":
            requete = requete.filter(
                or_(
                    Dossier.localisationActuelle == "SecDRBF",
                    Dossier.idDossier.in_(
                        db.query(Transmission.idDossier).filter(
                            Transmission.origine == "SecDRBF"
                        )
                    ),
                )
            )

        # SecSRSP (et tout autre rôle non admin) :
        # dossiers déjà passés par ce service.
        else:
            dossiers_du_service = (
                db.query(Transmission.idDossier)
                .filter(
                    or_(
                        Transmission.origine == utilisateur.role,
                        Transmission.destination == utilisateur.role,
                    )
                )
                .distinct()
                .subquery()
            )
    
            requete = requete.filter(
                Dossier.idDossier.in_(dossiers_du_service)
            )

    resultats = requete.all()

    # Les divisions consultent les dossiers individuels.
    if utilisateur.role.startswith("DIVISION_"):
        return [
            formater_dossier_individuel(db, dossier)
            for dossier in resultats
        ]

    # Les secrétariats et l'administration regroupent
    # les dossiers qui appartiennent au même BE.
    groupes = {}

    for dossier in resultats:
        numero_be = dossier.numeroBE

        if numero_be not in groupes:
            groupes[numero_be] = {
                "id": dossier.idDossier,
                "idDossier": dossier.idDossier,
                "numeroBE": numero_be,
                "referenceDossier": dossier.referenceDossier,
                "objet": dossier.objet,
                "nomResponsable": (
                    dossier.be.nomResponsable
                    if dossier.be
                    else None
                ),
                "telephoneResponsable": (
                    dossier.be.telephoneResponsable
                    if dossier.be
                    else None
                ),
                "emailResponsable": (
                    dossier.be.emailResponsable
                    if dossier.be
                    else None
                ),
                "dateReception": (
                    dossier.dateReception.isoformat()
                    if dossier.dateReception
                    else None
                ),
                "statutDossier": dossier.statut,
                "localisationActuelle": dossier.localisationActuelle,
                "agents": [],
                "dossiers": [],
                "_derniere_transmission_id": 0,
            }

        groupe = groupes[numero_be]

        for lien in dossier.agents:
            groupe["agents"].append(
                formater_agent(lien.agent)
            )

        groupe["dossiers"].append({
            "idDossier": dossier.idDossier,
            "idAgent": (
                dossier.agents[0].idAgent
                if dossier.agents
                else None
            ),
            "statutDossier": dossier.statut,
            "localisationActuelle": dossier.localisationActuelle,
        })

        transmission = derniere_transmission(
            db,
            dossier.idDossier,
        )

        if (
            transmission is not None
            and transmission.idTransmission
            > groupe["_derniere_transmission_id"]
        ):
            groupe["_derniere_transmission_id"] = (
                transmission.idTransmission
            )
            groupe.update(
                formater_transmission(transmission)
            )
            groupe["statutDossier"] = dossier.statut

    for groupe in groupes.values():
        groupe.pop("_derniere_transmission_id", None)

    return sorted(
        groupes.values(),
        key=lambda element: element["numeroBE"],
        reverse=True,
    )

#========================
#HISTORIQUE
#========================
@app.get("/api/historique")
def rechercher_historique(
    recherche: str = Query(..., min_length=2, max_length=150),
    utilisateur: Utilisateur = Depends(
        exiger_roles(*ROLES_AUTORISES)
    ),
    db: Session = Depends(obtenir_session_db),
):
    terme = recherche.strip()

    if len(terme) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Saisissez au moins deux caractères.",
        )

    motif = f"%{terme}%"

    filtre_recherche = or_(
        Dossier.referenceDossier.ilike(motif),
        cast(Dossier.numeroBE, String).ilike(motif),
        Dossier.agents.any(
            DossierAgent.agent.has(
                or_(
                    Agent.IM.ilike(motif),
                    Agent.nom.ilike(motif),
                    Agent.prenoms.ilike(motif),
                    func.concat(
                        Agent.nom,
                        " ",
                        func.coalesce(Agent.prenoms, ""),
                    ).ilike(motif),
                )
            )
        ),
    )

    requete = db.query(Dossier).filter(filtre_recherche)

    if utilisateur.role.startswith("DIVISION_"):
        requete = requete.filter(
            or_(
                Dossier.localisationActuelle == utilisateur.role,
                Dossier.transmissions.any(
                    or_(
                        Transmission.origine == utilisateur.role,
                        Transmission.destination == utilisateur.role,
                    )
                ),
                Dossier.actions.any(
                    ActionDossier.roleActeur == utilisateur.role
                ),
            )
        )

    total = requete.count()

    resultats = (
        requete.options(
            joinedload(Dossier.agents).joinedload(DossierAgent.agent),
            joinedload(Dossier.be),
            joinedload(Dossier.actions),
            joinedload(Dossier.transmissions),
        )
        .order_by(Dossier.dateReception.desc(), Dossier.idDossier.desc())
        .limit(100)
        .all()
    )

    def date_iso(valeur):
        return valeur.isoformat() if valeur else None

    def date_tri(valeur):
        if valeur is None:
            return 0

        if valeur.tzinfo is None:
            valeur = valeur.replace(tzinfo=timezone.utc)

        return valeur.timestamp()

    dossiers_formates = []

    def est_evenement_historiquement_inutile(evenement):
        if evenement.get("type") == "transmission":
            details = (evenement.get("details") or "").strip()

            if (
                evenement.get("titre") == "Transmission"
                and evenement.get("destination") == "SecSRSP"
                and details == "Renvoyé à la SecSRSP pour réorientation."
            ):
                return True

            return (
                evenement.get("titre") == "Transmission"
                and evenement.get("acteur") == "SecDRBF"
                and evenement.get("destination") == "SecSRSP"
                and evenement.get("statut") == "En attente"
            )

        if evenement.get("type") == "action":
            return (
                evenement.get("titre") == "Transférer"
                and evenement.get("statut") == "Succès"
                and evenement.get("details") == "Transfert sans observation."
            )

        return False

    for dossier in resultats:
        chronologie = []

        for action in dossier.actions:
            evenement = {
                "_tri": date_tri(action.dateAction),
                "type": "action",
                "date": date_iso(action.dateAction),
                "titre": action.action,
                "acteur": action.roleActeur,
                "statut": action.resultat,
                "details": action.observation,
            }

            if not est_evenement_historiquement_inutile(evenement):
                chronologie.append(evenement)

        for transmission in dossier.transmissions:
            evenement = {
                "_tri": date_tri(transmission.dateEnvoi),
                "type": "transmission",
                "date": date_iso(transmission.dateEnvoi),
                "dateReception": date_iso(transmission.dateReception),
                "titre": "Transmission",
                "acteur": transmission.origine,
                "destination": transmission.destination,
                "statut": transmission.statut,
                "details": transmission.informationsComplementaires,
            }

            if not est_evenement_historiquement_inutile(evenement):
                chronologie.append(evenement)

        chronologie.sort(key=lambda evenement: evenement["_tri"])

        for evenement in chronologie:
            evenement.pop("_tri", None)

        agents = [
            formater_agent(lien.agent)
            for lien in dossier.agents
            if lien.agent is not None
        ]

        dossiers_formates.append(
            {
                "idDossier": dossier.idDossier,
                "numeroBE": dossier.numeroBE,
                "referenceDossier": dossier.referenceDossier,
                "objet": dossier.objet,
                "dateReception": date_iso(dossier.dateReception),
                "statut": dossier.statut,
                "localisationActuelle": dossier.localisationActuelle,
                "agents": agents,
                "responsable": (
                    {
                        "nom": dossier.be.nomResponsable,
                        "telephone": dossier.be.telephoneResponsable,
                        "email": dossier.be.emailResponsable,
                    }
                    if dossier.be
                    else None
                ),
                "chronologie": chronologie,
            }
        )

    return {
        "recherche": terme,
        "total": total,
        "limite": 100,
        "resultatsTronques": total > 100,
        "dossiers": dossiers_formates,
    }

# ============================================================
# CREATION D'UN BE PAR LA SECDRBF
# ============================================================

@app.post("/api/dossiers")
def creer_dossier(
    donnees: DossierCreationRequest,
    utilisateur: Utilisateur = Depends(
        exiger_roles("SecDRBF")
    ),
    db: Session = Depends(obtenir_session_db),
):
    """
    Crée un BE et tous les dossiers qui lui appartiennent.

    Le numéro du BE est généré par le backend.
    Un BE peut contenir plusieurs dossiers.
    Le BE reste au niveau de la SecDRBF jusqu'à son
    envoi manuel vers la SecSRSP.
    """

    try:
        db.execute(
            text("SELECT pg_advisory_xact_lock(:cle)"),
            {"cle": CLE_VERROU_NUMEROTATION_BE},
        )

        numero_be = prochain_numero_be(db)

        nom_responsable = donnees.nomResponsable.strip()
        telephone_responsable = donnees.telephoneResponsable.strip()
        email_responsable = (
            donnees.emailResponsable.strip()
            if donnees.emailResponsable
            else None
        )
        reference = donnees.referenceDossier.strip()
        objet = donnees.objet.strip()

        if not nom_responsable or not telephone_responsable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Le nom et le téléphone du responsable sont obligatoires."
                ),
            )

        if not reference or not objet:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La référence et l'objet sont obligatoires.",
            )

        if not donnees.agents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le BE doit contenir au moins un agent.",
            )

        reference_existante = (
            db.query(Dossier)
            .filter(Dossier.referenceDossier == reference)
            .first()
        )

        if reference_existante:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cette référence de dossier existe déjà.",
            )

        # Créer le BE parent.
        be = BE(
            numeroBE=numero_be,
            nomResponsable=nom_responsable,
            telephoneResponsable=telephone_responsable,
            emailResponsable=email_responsable,
        )
        db.add(be)
        db.flush()

        agents_traites = []
        IM_deja_ajoutes = set()

        # Vérifier tous les agents avant de créer les dossiers.
        for donnees_agent in donnees.agents:
            IM = donnees_agent.IM.strip()

            if not IM:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="L'IM de chaque agent est obligatoire.",
                )

            if IM in IM_deja_ajoutes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"L'IM {IM} figure plusieurs fois dans ce BE.",
                )

            IM_deja_ajoutes.add(IM)

            agent = (
                db.query(Agent)
                .filter(Agent.IM == IM)
                .first()
            )

            if agent is None:
                nom_complet = (
                    donnees_agent.nomCompletAgent or ""
                ).strip()

                if not nom_complet:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Agent IM {IM} introuvable. "
                            "Veuillez saisir son nom complet."
                        ),
                    )

                morceaux = nom_complet.split(maxsplit=1)

                agent = Agent(
                    IM=IM,
                    nom=morceaux[0],
                    prenoms=(
                        morceaux[1]
                        if len(morceaux) > 1
                        else None
                    ),
                    typeAgent="en_poste",
                )

                db.add(agent)
                db.flush()

            agents_traites.append(agent)

        dossiers_crees = []

        # Créer un dossier pour chaque agent.
        for agent in agents_traites:
            dossier = Dossier(
                numeroBE=numero_be,
                referenceDossier=reference,
                objet=objet,
                statut="En attente",
                localisationActuelle="SecDRBF",
            )

            db.add(dossier)
            db.flush()

            db.add(
                DossierAgent(
                    idDossier=dossier.idDossier,
                    idAgent=agent.idAgent,
                )
            )

            db.add(
                ActionDossier(
                    idDossier=dossier.idDossier,
                    roleActeur=utilisateur.role,
                    action="Enregistrer",
                    resultat="Succès",
                    observation="BE enregistré à la SecDRBF.",
                )
            )

            dossiers_crees.append(dossier)

        premier_dossier = dossiers_crees[0]

        # Notification uniquement pour la SecDRBF.
        db.add(
            Notification(
                idDossier=premier_dossier.idDossier,
                roleDestinataire="SecDRBF",
                message=(
                    f"Le BE n°{numero_be} ({reference}) "
                    "a été enregistré."
                ),
            )
        )

        db.commit()

        return {
            "message": "BE enregistré avec succès.",
            "numeroBE": numero_be,
            "nombreDossiers": len(dossiers_crees),
            "referenceDossier": reference,
            "nomResponsable": nom_responsable,
            "telephoneResponsable": telephone_responsable,
            "emailResponsable": email_responsable,
            "agents": [
                {
                    "idDossier": dossier.idDossier,
                    "idAgent": agent.idAgent,
                    "IM": agent.IM,
                    "nom": agent.nom,
                    "prenoms": agent.prenoms,
                    "nomComplet": (
                        f"{agent.nom} {agent.prenoms or ''}"
                    ).strip(),
                }
                for dossier, agent in zip(
                    dossiers_crees,
                    agents_traites,
                )
            ],
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        logger.exception("Erreur réelle lors de la création du BE")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Une erreur est survenue lors de la création du BE. "
                "Aucune modification n'a été enregistrée."
            ),
        )


# ============================================================
# TRANSFERT D'UN BE VERS UNE DIVISION
# ============================================================

@app.post("/api/dossiers/transfert")
def transferer_be(
    donnees: TransfertRequest,
    utilisateur: Utilisateur = Depends(
        exiger_roles("SecSRSP")
    ),
    db: Session = Depends(obtenir_session_db),
):
    """
    Transfère l'ensemble d'un BE vers une seule division.

    Le statut du dossier reste "En attente" : le transfert
    est un mouvement, pas encore un traitement par la division.
    """

    try:
        destinations_autorisees = {
            "DIVISION_SOLDE",
            "DIVISION_VISA",
            "DIVISION_PENSIONS",
            "DIVISION_SECOURS",
        }

        if donnees.destination not in destinations_autorisees:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Destination de transfert invalide.",
            )

        dossiers_be = (
    db.query(Dossier)
    .filter(Dossier.numeroBE == donnees.numeroBE)
    .with_for_update()
    .all()
)

        if not dossiers_be:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="BE introuvable.",
            )

        observations = {
            item.idAgent: item.observation.strip()
            for item in donnees.observationsAgents
        }

        ids_agents_du_be = {
            lien.agent.idAgent
            for dossier in dossiers_be
            for lien in dossier.agents
        }

        ids_agents_observes = {
            item.idAgent
            for item in donnees.observationsAgents
        }

        if not ids_agents_observes.issubset(ids_agents_du_be):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Une observation concerne un agent "
                    "qui ne figure pas dans ce BE."
                ),
            )

        # Le BE doit être encore entre les mains de la SecSRSP.
        for dossier in dossiers_be:
            derniere = derniere_transmission(
                db,
                dossier.idDossier,
            )

            if (
                derniere is None
                or derniere.destination != "SecSRSP"
                or derniere.statut != "En attente"
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Au moins un dossier de ce BE n'est plus "
                        "en attente de transfert par la SecSRSP."
                    ),
                )

        for dossier in dossiers_be:
            agents_dossier = [
                lien.agent for lien in dossier.agents
            ]

            if not agents_dossier:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Le dossier {dossier.idDossier} "
                        "n'a aucun agent associé."
                    ),
                )

            observations_dossier = [
                observations[agent.idAgent]
                for agent in agents_dossier
                if agent.idAgent in observations
                and observations[agent.idAgent]
            ]

            observation = "\n".join(observations_dossier)

            db.add(
                Transmission(
                    idDossier=dossier.idDossier,
                    origine="SecSRSP",
                    destination=donnees.destination,
                    statut="En attente",
                    informationsComplementaires=observation or None,
                )
            )

            # Le transfert ne signifie pas encore que la division
            # a commencé le traitement.
            dossier.statut = "En attente"
            dossier.localisationActuelle = donnees.destination

            db.add(
                ActionDossier(
                    idDossier=dossier.idDossier,
                    roleActeur=utilisateur.role,
                    action="Transférer",
                    resultat="Succès",
                    observation=(
                        observation
                        or "Transfert sans observation."
                    ),
                )
            )

        db.add(
            Notification(
                idDossier=dossiers_be[0].idDossier,
                roleDestinataire=donnees.destination,
                message=(
                    f"Le BE n°{donnees.numeroBE} "
                    f"({dossiers_be[0].referenceDossier}) "
                    "a été transféré par la SecSRSP."
                ),
            )
        )

        db.commit()

        return {
            "message": "BE transféré avec succès.",
            "numeroBE": donnees.numeroBE,
            "destination": donnees.destination,
            "nombreDossiers": len(dossiers_be),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        logger.exception("Erreur réelle lors du transfert du BE")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Une erreur est survenue lors du transfert. "
                "Aucune modification n'a été enregistrée."
            ),
        )

# ============================================================
# RETOUR D'UN BE PAR UNE DIVISION VERS LA SECSRS
# ============================================================

@app.post("/api/dossiers/{id_dossier}/renvoyer-secsrsp")
def renvoyer_dossier_sec_srsp(
    id_dossier: int,
    utilisateur: Utilisateur = Depends(
        exiger_roles(
            "DIVISION_SOLDE",
            "DIVISION_VISA",
            "DIVISION_PENSIONS",
            "DIVISION_SECOURS",
        )
    ),
    db: Session = Depends(obtenir_session_db),
):
    try:
        # --------------------------------------------------------
        # 1. Trouver le dossier qui a déclenché le retour.
        # --------------------------------------------------------
        dossier_declencheur = (
            db.query(Dossier)
            .filter(Dossier.idDossier == id_dossier)
            .with_for_update()
            .first()
        )

        if dossier_declencheur is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dossier introuvable.",
            )

        # --------------------------------------------------------
        # 2. Vérifier que ce dossier appartient bien
        #    à la division de l'utilisateur connecté.
        # --------------------------------------------------------
        if dossier_declencheur.localisationActuelle != utilisateur.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Ce dossier ne se trouve pas dans votre division."
                ),
            )

        # --------------------------------------------------------
        # 3. Le retour est possible uniquement si le dossier
        #    est encore en attente.
        # --------------------------------------------------------
        if dossier_declencheur.statut != "En attente":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Le dossier est actuellement "
                    f"« {dossier_declencheur.statut} ». "
                    "Il ne peut plus être renvoyé à la SecSRSP."
                ),
            )

        numero_be = dossier_declencheur.numeroBE

        # --------------------------------------------------------
        # 4. Récupérer TOUS les dossiers du même BE.
        # --------------------------------------------------------
        dossiers_be = (
            db.query(Dossier)
            .filter(Dossier.numeroBE == numero_be)
            .with_for_update()
            .all()
        )

        if not dossiers_be:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Aucun dossier associé à ce BE.",
            )

        # --------------------------------------------------------
        # 5. Vérifier que tous les dossiers du BE sont encore
        #    dans cette même division et en attente.
        #
        #    Si un seul dossier a déjà changé d'état ou de
        #    localisation, on bloque tout le retour.
        # --------------------------------------------------------
        for dossier in dossiers_be:

            if dossier.localisationActuelle != utilisateur.role:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Le dossier {dossier.idDossier} du BE n'est "
                        "plus dans cette division. "
                        "Le retour du BE n'a pas été effectué."
                    ),
                )

            if dossier.statut != "En attente":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Le dossier {dossier.idDossier} du BE est "
                        f"actuellement « {dossier.statut} ». "
                        "Le retour du BE n'a pas été effectué."
                    ),
                )

        # --------------------------------------------------------
        # 6. Nom lisible de la division.
        # --------------------------------------------------------
        noms_divisions = {
            "DIVISION_SOLDE": "Division SOLDE",
            "DIVISION_VISA": "Division VISA",
            "DIVISION_PENSIONS": "Division PENSIONS",
            "DIVISION_SECOURS": "Division SECOURS",
        }

        nom_division = noms_divisions.get(
            utilisateur.role,
            utilisateur.role,
        )

        # --------------------------------------------------------
        # 7. Renvoyer TOUS les dossiers du BE à la SecSRSP.
        # --------------------------------------------------------
        for dossier in dossiers_be:

            # Nouvelle transmission :
            # Division → SecSRSP
            db.add(
                Transmission(
                    idDossier=dossier.idDossier,
                    origine=utilisateur.role,
                    destination="SecSRSP",
                    statut="En attente",
                    informationsComplementaires=(
                        "Renvoyé à la SecSRSP pour réorientation."
                    ),
                )
            )

            # Nouvelle localisation.
            dossier.localisationActuelle = "SecSRSP"

            # Le statut reste "En attente".
            dossier.statut = "En attente"

            # Historique de l'action.
            db.add(
                ActionDossier(
                    idDossier=dossier.idDossier,
                    roleActeur=utilisateur.role,
                    action="Retour à la SecSRSP",
                    resultat="Succès",
                    observation=(
                        "Renvoyé à la SecSRSP pour réorientation."
                    ),
                )
            )

            # Notification pour chaque dossier.
            db.add(
                Notification(
                    idDossier=dossier.idDossier,
                    roleDestinataire="SecSRSP",
                    message=(
                        f"Le BE n°{numero_be} "
                        "a été renvoyé à la SecSRSP "
                        "pour réorientation."
                    ),
                )
            )

        # --------------------------------------------------------
        # 8. Une seule validation pour tout le BE.
        # --------------------------------------------------------
        db.commit()

        return {
            "message": (
                f"Le BE n°{numero_be} et ses "
                f"{len(dossiers_be)} dossier(s) ont été "
                "renvoyés à la SecSRSP pour réorientation."
            ),
            "numeroBE": numero_be,
            "nombreDossiers": len(dossiers_be),
            "localisationActuelle": "SecSRSP",
            "statutDossier": "En attente",
            "divisionOrigine": nom_division,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()

        logger.exception(
            "Erreur lors du retour du BE vers la SecSRSP"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Une erreur est survenue lors du retour du BE. "
                "Aucune modification n'a été enregistrée."
            ),
        )



# ============================================================
# VISER UN DOSSIER PAR UNE DIVISION
# ============================================================

@app.post("/api/dossiers/{id_dossier}/viser")
def viser_dossier(
    id_dossier: int,
    utilisateur: Utilisateur = Depends(
        exiger_roles(
            "DIVISION_SOLDE",
            "DIVISION_VISA",
            "DIVISION_PENSIONS",
            "DIVISION_SECOURS",
        )
    ),
    db: Session = Depends(obtenir_session_db),
):
    try:
        # --------------------------------------------------------
        # 1. Trouver le dossier.
        # --------------------------------------------------------
        dossier = (
            db.query(Dossier)
            .filter(Dossier.idDossier == id_dossier)
            .with_for_update()
            .first()
        )

        if dossier is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dossier introuvable.",
            )

        # --------------------------------------------------------
        # 2. Vérifier que le dossier se trouve bien
        #    dans la division de l'utilisateur connecté.
        # --------------------------------------------------------
        if dossier.localisationActuelle != utilisateur.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Ce dossier ne se trouve pas dans votre division."
                ),
            )

        # --------------------------------------------------------
        # 3. Le dossier doit être en attente.
        # --------------------------------------------------------
        if dossier.statut != "En attente":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Le dossier est actuellement « {dossier.statut} ». "
                    "Il ne peut être visé que lorsqu'il est en attente."
                ),
            )

        # --------------------------------------------------------
        # 4. Changer le statut du dossier.
        #
        #    La localisation ne change pas :
        #    le dossier reste dans la division actuelle.
        # --------------------------------------------------------
        dossier.statut = "Visé"

        # --------------------------------------------------------
        # 5. Enregistrer l'action dans l'historique.
        # --------------------------------------------------------
        db.add(
            ActionDossier(
                idDossier=dossier.idDossier,
                roleActeur=utilisateur.role,
                action="Viser",
                resultat="Succès",
                observation=(
                    "Le dossier a été visé par la division."
                ),
            )
        )

        # --------------------------------------------------------
        # 6. Enregistrer les modifications.
        # --------------------------------------------------------
        db.commit()

        return {
            "message": "Le dossier a été visé avec succès.",
            "idDossier": dossier.idDossier,
            "statutDossier": dossier.statut,
            "localisationActuelle": dossier.localisationActuelle,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()

        logger.exception(
            "Erreur lors de la visa du dossier"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Une erreur est survenue"
                ". Aucune modification n'a été enregistrée."
            ),
        )    
    

# ============================================================
# REJETER UN DOSSIER PAR UNE DIVISION
# ============================================================

@app.post("/api/dossiers/{id_dossier}/rejeter")
def rejeter_dossier(
    id_dossier: int,
    motif: str = Body(..., embed=True),
    utilisateur: Utilisateur = Depends(
        exiger_roles(
            "DIVISION_SOLDE",
            "DIVISION_VISA",
            "DIVISION_PENSIONS",
            "DIVISION_SECOURS",
        )
    ),
    db: Session = Depends(obtenir_session_db),
):
    try:
        # --------------------------------------------------------
        # 1. Vérifier que le motif est renseigné.
        # --------------------------------------------------------
        if not motif.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le motif du rejet est obligatoire.",
            )

        # --------------------------------------------------------
        # 2. Trouver le dossier.
        # --------------------------------------------------------
        dossier = (
            db.query(Dossier)
            .filter(Dossier.idDossier == id_dossier)
            .with_for_update()
            .first()
        )

        if dossier is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dossier introuvable.",
            )

        # --------------------------------------------------------
        # 3. Vérifier que le dossier se trouve bien
        #    dans la division de l'utilisateur connecté.
        # --------------------------------------------------------
        if dossier.localisationActuelle != utilisateur.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Ce dossier ne se trouve pas dans votre division."
                ),
            )

        # --------------------------------------------------------
        # 4. Le dossier doit être en cours de traitement.
        # --------------------------------------------------------
        if dossier.statut != "En attente":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Le dossier est actuellement « {dossier.statut} ». "
                    "Il ne peut être rejeté que lorsqu'il est en attente."
                ),
            )

        # --------------------------------------------------------
        # 5. Changer le statut du dossier.
        # --------------------------------------------------------
        dossier.statut = "Rejeté"

        # --------------------------------------------------------
        # 6. Enregistrer l'action et son motif dans l'historique.
        # --------------------------------------------------------
        db.add(
            ActionDossier(
                idDossier=dossier.idDossier,
                roleActeur=utilisateur.role,
                action="Rejeter",
                resultat="Succès",
                observation=motif.strip(),
            )
        )

        # --------------------------------------------------------
        # 7. Enregistrer les modifications.
        # --------------------------------------------------------
        db.commit()

        return {
            "message": "Le dossier a été rejeté avec succès.",
            "idDossier": dossier.idDossier,
            "statutDossier": dossier.statut,
            "localisationActuelle": dossier.localisationActuelle,
            "motif": motif.strip(),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()

        logger.exception(
            "Erreur lors du rejet du dossier"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Une erreur est survenue lors du rejet "
                "du dossier. Aucune modification n'a été enregistrée."
            ),
        )    


# ============================================================
# REMETTRE UN DOSSIER AU RESPONSABLE
# ============================================================

@app.post("/api/dossiers/{id_dossier}/remettre-responsable")
def remettre_dossier_responsable(
    id_dossier: int,
    utilisateur: Utilisateur = Depends(
        exiger_roles(
            "DIVISION_SOLDE",
            "DIVISION_VISA",
            "DIVISION_PENSIONS",
            "DIVISION_SECOURS",
        )
    ),
    db: Session = Depends(obtenir_session_db),
):
    try:
        # --------------------------------------------------------
        # 1. Trouver le dossier.
        # --------------------------------------------------------
        dossier = (
            db.query(Dossier)
            .filter(Dossier.idDossier == id_dossier)
            .with_for_update()
            .first()
        )

        if dossier is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dossier introuvable.",
            )

        # --------------------------------------------------------
        # 2. Vérifier que le dossier se trouve bien
        #    dans la division de l'utilisateur connecté.
        # --------------------------------------------------------
        if dossier.localisationActuelle != utilisateur.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Ce dossier ne se trouve pas dans votre division."
                ),
            )

        # --------------------------------------------------------
        # 3. La remise est possible uniquement après
        #    validation ou rejet.
        # --------------------------------------------------------
        if dossier.statut not in ("Visé", "Rejeté"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Le dossier est actuellement "
                    f"« {dossier.statut} ». "
                    "Il ne peut être remis au responsable "
                    "que lorsqu'il est visé ou rejeté."
                ),
            )

        # --------------------------------------------------------
        # 4. Vérifier que le dossier possède bien un responsable.
        # --------------------------------------------------------
        if dossier.be is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Aucun responsable n'est associé "
                    "au bordereau de ce dossier."
                ),
            )

        # --------------------------------------------------------
        # 5. Passer le dossier au statut « Remis » et la localisation à « Au responsable ».
        # --------------------------------------------------------
        dossier.statut = "Remis"
        dossier.localisationActuelle = "Au responsable"

        # --------------------------------------------------------
        # 6. Enregistrer la remise dans l'historique.
        # --------------------------------------------------------
        db.add(
            ActionDossier(
                idDossier=dossier.idDossier,
                roleActeur=utilisateur.role,
                action="Remettre au responsable",
                resultat="Succès",
                observation=(
                    "Dossier remis physiquement au responsable : "
                    f"{dossier.be.nomResponsable}."
                ),
            )
        )

        # --------------------------------------------------------
        # 7. Enregistrer les modifications.
        # --------------------------------------------------------
        db.commit()

        return {
            "message": "Le dossier a été remis au responsable avec succès.",
            "idDossier": dossier.idDossier,
            "statutDossier": dossier.statut,
            "nomResponsable": dossier.be.nomResponsable,
            "telephoneResponsable": dossier.be.telephoneResponsable,
            "emailResponsable": dossier.be.emailResponsable,
            "localisationActuelle": dossier.localisationActuelle,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()

        logger.exception(
            "Erreur lors de la remise du dossier au responsable"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Une erreur est survenue lors de la remise "
                "du dossier au responsable. "
                "Aucune modification n'a été enregistrée."
            ),
        )        
        
        
# ====================
# Prévisualisation de l'importation des agents
# ====================        
@app.post("/api/admin/agents/import-preview")
async def apercu_import_agents(
    fichier: UploadFile = File(...),
    typeAgent: str = Query("en_poste"),
    utilisateur: Utilisateur = Depends(exiger_roles("ADMIN")),
    db: Session = Depends(obtenir_session_db),
):
    if not fichier.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun fichier sélectionné.",
        )

    nom_fichier = fichier.filename.lower()
    if not (nom_fichier.endswith(".xlsx") or nom_fichier.endswith(".xlsm")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier doit être un Excel .xlsx ou .xlsm.",
        )

    type_agent = normaliser_type_agent(typeAgent)
    if type_agent not in {"en_poste", "retraite"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le type d'import doit être 'en_poste' ou 'retraite'.",
        )

    contenu = await fichier.read()

    try:
        lignes, erreurs = lire_agents_excel(contenu, type_agent)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if erreurs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=erreurs[:20],
        )

    preview = []
    creations = 0
    mises_a_jour = 0

    for ligne in lignes:
        if type_agent == "en_poste":
            im = normaliser_chaine(ligne.get("IM"))
            numero_pension = normaliser_chaine(ligne.get("NumeroPension"))
            agent_existant = (
                db.query(Agent)
                .filter(Agent.IM == im)
                .first()
                if im
                else None
            )

            if numero_pension:
                conflit = (
                    db.query(Agent)
                    .filter(
                        Agent.numeroPension == numero_pension,
                        Agent.IM != im,
                    )
                    .first()
                )
                if conflit:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Le numéro de pension {numero_pension} est déjà "
                            f"utilisé par l'agent IM {conflit.IM}."
                        ),
                    )

            action = "creation" if agent_existant is None else "mise_a_jour"
            if agent_existant is None:
                creations += 1
            else:
                mises_a_jour += 1

            preview.append(
                {
                    "IM": im,
                    "nom": normaliser_chaine(ligne.get("Nom")),
                    "prenoms": normaliser_chaine(ligne.get("Prenoms")),
                    "CIN": normaliser_chaine(ligne.get("CIN")),
                    "corpsCode": normaliser_chaine(ligne.get("Corps")),
                    "sectionCode": normaliser_chaine(ligne.get("Section")),
                    "FIVCode": normaliser_chaine(ligne.get("FIV")),
                    "typeAgent": "en_poste",
                    "numeroPension": numero_pension,
                    "action": action,
                }
            )

        else:
            numero_pension = normaliser_chaine(ligne.get("NumeroPension"))
            agent_existant = (
                db.query(Agent)
                .filter(Agent.numeroPension == numero_pension)
                .first()
                if numero_pension
                else None
            )

            if numero_pension:
                conflit = (
                    db.query(Agent)
                    .filter(
                        Agent.numeroPension == numero_pension,
                        Agent.numeroPension == numero_pension,
                    )
                    .first()
                )
                if conflit and conflit.idAgent is not None:
                    pass

            action = "creation" if agent_existant is None else "mise_a_jour"
            if agent_existant is None:
                creations += 1
            else:
                mises_a_jour += 1

            preview.append(
                {
                    "IM": None,
                    "nom": normaliser_chaine(ligne.get("Nom")),
                    "prenoms": normaliser_chaine(ligne.get("Prenoms")),
                    "CIN": normaliser_chaine(ligne.get("CIN")),
                    "corpsCode": normaliser_chaine(ligne.get("Corps")),
                    "sectionCode": normaliser_chaine(ligne.get("Section")),
                    "FIVCode": normaliser_chaine(ligne.get("FIV")),
                    "typeAgent": "retraite",
                    "numeroPension": numero_pension,
                    "action": action,
                }
            )

    return {
        "statistiques": {
            "total": len(preview),
            "creations": creations,
            "mises_a_jour": mises_a_jour,
        },
        "agents": preview,
    }

# ===========================================================
# CONFIRMER L'IMPORTATION DES AGENTS    
# ===========================================================
@app.post("/api/admin/agents/import-confirmer")
async def confirmer_import_agents(
    fichier: UploadFile = File(...),
    typeAgent: str = Query("en_poste"),
    utilisateur: Utilisateur = Depends(exiger_roles("ADMIN")),
    db: Session = Depends(obtenir_session_db),
):
    if not fichier.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun fichier sélectionné.",
        )

    nom_fichier = fichier.filename.lower()
    if not (nom_fichier.endswith(".xlsx") or nom_fichier.endswith(".xlsm")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier doit être un Excel .xlsx ou .xlsm.",
        )

    type_agent = normaliser_type_agent(typeAgent)
    if type_agent not in {"en_poste", "retraite"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le type d'import doit être 'en_poste' ou 'retraite'.",
        )

    contenu = await fichier.read()

    try:
        lignes, erreurs = lire_agents_excel(contenu, type_agent)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if erreurs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=erreurs[:20],
        )

    creations = 0
    mises_a_jour = 0
    identifiants_traites: set[str] = set()

    for ligne in lignes:
        if type_agent == "en_poste":
            im = normaliser_chaine(ligne.get("IM"))
            numero_pension = normaliser_chaine(ligne.get("NumeroPension"))

            if not im:
                continue

            if im in identifiants_traites:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"L'IM {im} apparaît plusieurs fois dans le fichier.",
                )
            identifiants_traites.add(im)

            if numero_pension:
                conflit = (
                    db.query(Agent)
                    .filter(
                        Agent.numeroPension == numero_pension,
                        Agent.IM != im,
                    )
                    .first()
                )

                if conflit:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Le numéro de pension {numero_pension} est déjà "
                            f"utilisé par l'agent IM {conflit.IM}."
                        ),
                    )

            agent = db.query(Agent).filter(Agent.IM == im).first()

            if agent is None:
                agent = Agent(
                    IM=im,
                    nom=(normaliser_chaine(ligne.get("Nom")) or "").strip(),
                    prenoms=normaliser_chaine(ligne.get("Prenoms")),
                    CIN=normaliser_chaine(ligne.get("CIN")),
                    corpsCode=normaliser_chaine(ligne.get("Corps")),
                    sectionCode=normaliser_chaine(ligne.get("Section")),
                    FIVCode=normaliser_chaine(ligne.get("FIV")),
                    typeAgent="en_poste",
                    numeroPension=numero_pension,
                )
                db.add(agent)
                creations += 1
            else:
                agent.nom = (normaliser_chaine(ligne.get("Nom")) or agent.nom).strip()
                agent.prenoms = normaliser_chaine(ligne.get("Prenoms")) or agent.prenoms
                agent.CIN = normaliser_chaine(ligne.get("CIN")) or agent.CIN
                agent.corpsCode = normaliser_chaine(ligne.get("Corps")) or agent.corpsCode
                agent.sectionCode = normaliser_chaine(ligne.get("Section")) or agent.sectionCode
                agent.FIVCode = normaliser_chaine(ligne.get("FIV")) or agent.FIVCode
                agent.typeAgent = "en_poste"
                if numero_pension:
                    agent.numeroPension = numero_pension
                mises_a_jour += 1

        else:
            numero_pension = normaliser_chaine(ligne.get("NumeroPension"))
            if not numero_pension:
                continue

            if numero_pension in identifiants_traites:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Le numéro de pension {numero_pension} apparaît plusieurs fois dans le fichier.",
                )
            identifiants_traites.add(numero_pension)

            agent = (
                db.query(Agent)
                .filter(Agent.numeroPension == numero_pension)
                .first()
            )

            if agent is None:
                agent = Agent(
                    IM=None,
                    nom=(normaliser_chaine(ligne.get("Nom")) or "").strip(),
                    prenoms=normaliser_chaine(ligne.get("Prenoms")),
                    CIN=normaliser_chaine(ligne.get("CIN")),
                    corpsCode=normaliser_chaine(ligne.get("Corps")),
                    sectionCode=normaliser_chaine(ligne.get("Section")),
                    FIVCode=normaliser_chaine(ligne.get("FIV")),
                    typeAgent="retraite",
                    numeroPension=numero_pension,
                )
                db.add(agent)
                creations += 1
            else:
                agent.nom = (normaliser_chaine(ligne.get("Nom")) or agent.nom).strip()
                agent.prenoms = normaliser_chaine(ligne.get("Prenoms")) or agent.prenoms
                agent.CIN = normaliser_chaine(ligne.get("CIN")) or agent.CIN
                agent.corpsCode = normaliser_chaine(ligne.get("Corps")) or agent.corpsCode
                agent.sectionCode = normaliser_chaine(ligne.get("Section")) or agent.sectionCode
                agent.FIVCode = normaliser_chaine(ligne.get("FIV")) or agent.FIVCode
                agent.typeAgent = "retraite"
                agent.numeroPension = numero_pension
                mises_a_jour += 1

        db.flush()

    db.commit()

    return {
        "message": "Import des agents terminé.",
        "creations": creations,
        "mises_a_jour": mises_a_jour,
        "total": creations + mises_a_jour,
    }
    
    
#==========================
#Importation des agents depuis un fichier Excel
#==========================
@app.post("/api/admin/agents/import-confirmer")
async def confirmer_import_agents(
    fichier: UploadFile = File(...),
    utilisateur: Utilisateur = Depends(exiger_roles("ADMIN")),
    db: Session = Depends(obtenir_session_db),
):
    if not fichier.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun fichier sélectionné.",
        )

    nom_fichier = fichier.filename.lower()
    if not (nom_fichier.endswith(".xlsx") or nom_fichier.endswith(".xlsm")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier doit être un Excel .xlsx ou .xlsm.",
        )

    contenu = await fichier.read()

    try:
        lignes, erreurs = lire_agents_excel(contenu)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if erreurs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=erreurs[:20],
        )

    creations = 0
    mises_a_jour = 0
    IM_deja_traite: set[str] = set()

    for ligne in lignes:
        im = normaliser_chaine(ligne["IM"])
        if not im:
            continue

        if im in IM_deja_traite:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"L'IM {im} apparaît plusieurs fois dans le fichier.",
            )
        IM_deja_traite.add(im)

        numero_pension = normaliser_chaine(ligne["numeroPension"])
        if numero_pension:
            conflit = (
                db.query(Agent)
                .filter(
                    Agent.numeroPension == numero_pension,
                    Agent.IM != im,
                )
                .first()
            )

            if conflit:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Le numéro de pension {numero_pension} est déjà "
                        f"utilisé par l'agent IM {conflit.IM}."
                    ),
                )

        agent = db.query(Agent).filter(Agent.IM == im).first()

        if agent is None:
            agent = Agent(
                IM=im,
                nom=(normaliser_chaine(ligne["nom"]) or "").strip(),
                prenoms=normaliser_chaine(ligne["prenoms"]),
                CIN=normaliser_chaine(ligne["CIN"]),
                corpsCode=normaliser_chaine(ligne["corpsCode"]),
                sectionCode=normaliser_chaine(ligne["sectionCode"]),
                FIVCode=normaliser_chaine(ligne["FIVCode"]),
                typeAgent=normaliser_type_agent(ligne["typeAgent"]),
                numeroPension=numero_pension,
            )
            db.add(agent)
            creations += 1
        else:
            agent.nom = (normaliser_chaine(ligne["nom"]) or agent.nom).strip()
            agent.prenoms = normaliser_chaine(ligne["prenoms"]) or agent.prenoms
            agent.CIN = normaliser_chaine(ligne["CIN"]) or agent.CIN
            agent.corpsCode = (
                normaliser_chaine(ligne["corpsCode"]) or agent.corpsCode
            )
            agent.sectionCode = (
                normaliser_chaine(ligne["sectionCode"]) or agent.sectionCode
            )
            agent.FIVCode = (
                normaliser_chaine(ligne["FIVCode"]) or agent.FIVCode
            )
            agent.typeAgent = normaliser_type_agent(ligne["typeAgent"])
            if numero_pension:
                agent.numeroPension = numero_pension
            mises_a_jour += 1

        db.flush()

    db.commit()

    return {
        "message": "Import des agents terminé.",
        "creations": creations,
        "mises_a_jour": mises_a_jour,
        "total": creations + mises_a_jour,
    }    
    