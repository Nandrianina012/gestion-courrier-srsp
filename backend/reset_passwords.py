
import argparse

from database import SessionLocal
from models import Utilisateur
from security import password_hasher


# Identifiants et mots de passe temporaires pour le développement.
comptes = {
    "secdrbf": "SecDRBF",
    "secsrsp": "SecSRSP",
    "solde": "DIVISION_SOLDE",
    "visa": "DIVISION_VISA",
    "pension": "DIVISION_PENSIONS",
    "secour": "DIVISION_SECOURS",
    "admin": "ADMIN",
}

parser = argparse.ArgumentParser()
parser.add_argument(
    "--admin-only",
    action="store_true",
    help="Réinitialise uniquement le compte administrateur.",
)
arguments = parser.parse_args()
comptes_a_reinitialiser = (
    {"admin": "ADMIN"} if arguments.admin_only else comptes
)

db = SessionLocal()

try:
    for identifiant, role in comptes_a_reinitialiser.items():
        utilisateur = (
            db.query(Utilisateur)
            .filter(Utilisateur.role == role)
            .first()
        )

        if utilisateur is None:
            print(f"Compte introuvable pour le rôle : {role}")
            continue

        utilisateur.identifiant = identifiant
        utilisateur.motDePasse = password_hasher.hash(identifiant)
        utilisateur.actif = True

        print(f"Compte préparé : {identifiant} ({role})")

    db.commit()
    print("\nMise à jour terminée.")

except Exception:
    db.rollback()
    raise

finally:
    db.close()
