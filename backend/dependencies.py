
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from database import SessionLocal
from models import Utilisateur
from security import verifier_jeton


# Récupère le jeton envoyé dans l'en-tête Authorization.
bearer_scheme = HTTPBearer()


def obtenir_session_db():
    """Ouvre une session avec PostgreSQL pour une requête."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def obtenir_utilisateur_connecte(
    identifiants: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(obtenir_session_db),
) -> Utilisateur:
    """Vérifie le jeton et retrouve le compte connecté."""

    jeton = identifiants.credentials

    try:
        donnees = verifier_jeton(jeton)
        id_utilisateur = int(donnees["sub"])

    except (jwt.InvalidTokenError, KeyError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton invalide ou expiré.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    utilisateur = (
        db.query(Utilisateur)
        .filter(Utilisateur.idUtilisateur == id_utilisateur)
        .first()
    )

    if utilisateur is None or not utilisateur.actif:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Compte introuvable ou désactivé.",
        )

    return utilisateur


def exiger_roles(*roles_autorises: str):
    """Autorise uniquement les rôles indiqués."""

    def verifier_role(
        utilisateur: Utilisateur = Depends(obtenir_utilisateur_connecte),
    ) -> Utilisateur:

        if utilisateur.role not in roles_autorises:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas la permission d'effectuer cette action.",
            )

        return utilisateur

    return verifier_role
