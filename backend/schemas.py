from pydantic import BaseModel, Field


class ConnexionRequest(BaseModel):
    identifiant: str = Field(
        min_length=1,
        max_length=50,
    )

    motDePasse: str = Field(
        min_length=1,
        max_length=128,
    )


class ConnexionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    identifiant: str
    role: str


class AgentDossierRequest(BaseModel):
    IM: str = Field(
        min_length=1,
        max_length=50,
    )

    nomCompletAgent: str | None = Field(
        default=None,
        max_length=300,
    )


class DossierCreationRequest(BaseModel):
    """
    Création d'un BE par le Secrétaire DRBF.

    Un même BE peut contenir plusieurs dossiers.
    Le numeroBE est généré automatiquement par le backend.
    """

    nomResponsable: str = Field(
        min_length=1,
        max_length=150,
    )

    telephoneResponsable: str = Field(
        min_length=1,
        max_length=30,
    )

    emailResponsable: str | None = Field(
        default=None,
        max_length=150,
    )

    referenceDossier: str = Field(
        min_length=1,
        max_length=150,
    )

    objet: str = Field(
        min_length=1,
        max_length=255,
    )

    agents: list[AgentDossierRequest] = Field(
        min_length=1,
    )


class ObservationAgentRequest(BaseModel):
    """
    Observation effectuée par le SecSRSP pour un agent
    lors de la vérification des pièces du dossier.
    """

    idAgent: int = Field(
        ge=1,
    )

    observation: str = Field(
        default="",
        max_length=2000,
    )


class TransfertRequest(BaseModel):
    """
    Transfert de l'ensemble d'un BE par le SecSRSP
    vers une seule division.

    Les observations sont conservées individuellement
    pour chaque agent.
    """

    numeroBE: int = Field(
        ge=1,
    )

    destination: str = Field(
        min_length=1,
        max_length=50,
    )

    observationsAgents: list[ObservationAgentRequest] = Field(
        default_factory=list,
    )