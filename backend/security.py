
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash


# Charge le fichier .env situé dans le dossier backend.
chemin_env = Path(__file__).resolve().parent / ".env"
load_dotenv(chemin_env)

# Récupère la clé secrète utilisée pour signer les jetons.
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY est absente du fichier backend/.env"
    )

JWT_ALGORITHM = "HS256"
JWT_DURATION_MINUTES = 480

# Prépare le système de hachage des mots de passe.
password_hasher = PasswordHash.recommended()


def verifier_mot_de_passe(
    mot_de_passe: str,
    hash_stocke: str,
) -> bool:
    """Compare un mot de passe avec son hash enregistré."""
    return password_hasher.verify(mot_de_passe, hash_stocke)


def creer_jeton(id_utilisateur: int, role: str) -> str:
    """Crée un jeton JWT valable pendant 30 minutes."""

    maintenant = datetime.now(timezone.utc)

    donnees_jeton = {
        "sub": str(id_utilisateur),
        "role": role,
        "iat": maintenant,
        "exp": maintenant + timedelta(minutes=JWT_DURATION_MINUTES),
    }

    return jwt.encode(
        donnees_jeton,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def verifier_jeton(jeton: str) -> dict:
    """Vérifie la signature et l'expiration d'un jeton JWT."""

    return jwt.decode(
        jeton,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM],
    )
