from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import relationship

from database import Base


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    idUtilisateur = Column(Integer, primary_key=True, index=True)

    identifiant = Column(
        String(50),
        nullable=False,
        unique=True,
    )

    motDePasse = Column(
        String(255),
        nullable=False,
    )

    role = Column(
        String(50),
        nullable=False,
    )

    actif = Column(
        Boolean,
        nullable=False,
        default=True,
    )


class Agent(Base):
    __tablename__ = "agents"

    idAgent = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    IM = Column(
        String(50),
        nullable=True,
        unique=True,
        index=True,
    )

    numeroPension = Column(
        String(50),
        nullable=True,
        unique=True,
    )

    nom = Column(
        String(150),
        nullable=False,
    )

    prenoms = Column(
        String(150),
        nullable=True,
    )

    CIN = Column(
        String(20),
        nullable=True,
    )

    corpsCode = Column(
        String(30),
        nullable=True,
    )

    sectionCode = Column(
        String(30),
        nullable=True,
    )

    FIVCode = Column(
        String(30),
        nullable=True,
    )

    typeAgent = Column(
        String(20),
        nullable=False,
        default="en_poste",
    )

    __table_args__ = (
        CheckConstraint(
            "typeAgent IN ('en_poste', 'retraite')",
            name="ck_agent_type",
        ),
    )

    dossiers = relationship(
        "DossierAgent",
        back_populates="agent",
    )


class BE(Base):
    __tablename__ = "bes"

    numeroBE = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    nomResponsable = Column(
        String(150),
        nullable=False,
    )

    telephoneResponsable = Column(
        String(30),
        nullable=False,
    )

    emailResponsable = Column(
        String(150),
        nullable=True,
    )

    dossiers = relationship(
        "Dossier",
        back_populates="be",
    )


class Dossier(Base):
    __tablename__ = "dossiers"

    idDossier = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    numeroBE = Column(
        Integer,
        ForeignKey("bes.numeroBE"),
        nullable=False,
        index=True,
    )

    referenceDossier = Column(
        String(150),
        nullable=False,
    )

    dateReception = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    objet = Column(
        String(255),
        nullable=False,
    )

    statut = Column(
        String(30),
        nullable=False,
        default="En attente",
    )

    localisationActuelle = Column(
        String(50),
        nullable=False,
        default="SecDRBF",
    )

    be = relationship(
        "BE",
        back_populates="dossiers",
    )

    agents = relationship(
        "DossierAgent",
        back_populates="dossier",
        cascade="all, delete-orphan",
    )

    transmissions = relationship(
        "Transmission",
        back_populates="dossier",
        cascade="all, delete-orphan",
    )

    actions = relationship(
        "ActionDossier",
        back_populates="dossier",
        cascade="all, delete-orphan",
    )

    notifications = relationship(
        "Notification",
        back_populates="dossier",
        cascade="all, delete-orphan",
    )


class DossierAgent(Base):
    __tablename__ = "dossiers_agents"

    idDossierAgent = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    idDossier = Column(
        Integer,
        ForeignKey("dossiers.idDossier"),
        nullable=False,
        index=True,
    )

    idAgent = Column(
        Integer,
        ForeignKey("agents.idAgent"),
        nullable=False,
        index=True,
    )

    dossier = relationship(
        "Dossier",
        back_populates="agents",
    )

    agent = relationship(
        "Agent",
        back_populates="dossiers",
    )


class Transmission(Base):
    __tablename__ = "transmissions"

    idTransmission = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    idDossier = Column(
        Integer,
        ForeignKey("dossiers.idDossier"),
        nullable=False,
        index=True,
    )

    origine = Column(
        String(50),
        nullable=False,
    )

    destination = Column(
        String(50),
        nullable=False,
        index=True,
    )

    dateEnvoi = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    dateReception = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    statut = Column(
        String(30),
        nullable=False,
        default="En attente",
    )

    informationsComplementaires = Column(
        Text,
        nullable=True,
    )

    dossier = relationship(
        "Dossier",
        back_populates="transmissions",
    )


class ActionDossier(Base):
    __tablename__ = "actions_dossiers"

    idAction = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    idDossier = Column(
        Integer,
        ForeignKey("dossiers.idDossier"),
        nullable=False,
        index=True,
    )

    roleActeur = Column(
        String(50),
        nullable=False,
    )

    action = Column(
        String(50),
        nullable=False,
    )

    resultat = Column(
        String(50),
        nullable=False,
    )

    observation = Column(
        Text,
        nullable=True,
    )

    dateAction = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    dossier = relationship(
        "Dossier",
        back_populates="actions",
    )


class Notification(Base):
    __tablename__ = "notifications"

    idNotification = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    idDossier = Column(
        Integer,
        ForeignKey("dossiers.idDossier"),
        nullable=True,
        index=True,
    )

    roleDestinataire = Column(
        String(50),
        nullable=False,
        index=True,
    )

    message = Column(
        Text,
        nullable=False,
    )

    lu = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    dateCreation = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    dossier = relationship(
        "Dossier",
        back_populates="notifications",
    )