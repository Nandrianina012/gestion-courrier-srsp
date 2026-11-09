import secrets

from pwdlib import PasswordHash
from database import SessionLocal
from models import Utilisateur


# Algorithme utilisé pour hacher les mots de passe.
password_hasher = PasswordHash.recommended()


# Comptes des entités.
COMPTES = [
    ("secdrbf", "SecDRBF"),
    ("secsrsp", "SecSRSP"),
    ("solde", "DIVISION_SOLDE"),
    ("visa", "DIVISION_VISA"),
    ("pensions", "DIVISION_PENSIONS"),
    ("secours", "DIVISION_SECOURS"),
    ("admin", "ADMIN"),
]


def creer_comptes():
    """Crée les comptes qui n'existent pas encore."""

    db = SessionLocal()
    comptes_crees = []

    try:
        for identifiant, role in COMPTES:

            # Ne pas créer un doublon si le compte existe déjà.
            compte_existant = (
                db.query(Utilisateur)
                .filter_by(identifiant=identifiant)
                .first()
            )

            if compte_existant:
                print(f"Compte déjà existant : {identifiant}")
                continue

            # Générer un mot de passe aléatoire pour ce compte.
            mot_de_passe = secrets.token_urlsafe(12)

            # Transformer le mot de passe en hash avant stockage.
            mot_de_passe_hash = password_hasher.hash(mot_de_passe)

            nouvel_utilisateur = Utilisateur(
                identifiant=identifiant,
                motDePasse=mot_de_passe_hash,
                role=role,
                actif=True,
            )

            db.add(nouvel_utilisateur)

            # Garder les identifiants pour les afficher après validation.
            comptes_crees.append((identifiant, role, mot_de_passe))

        # Enregistrer les nouveaux comptes dans PostgreSQL.
        db.commit()

        print("\n=== COMPTES CRÉÉS ===")

        for identifiant, role, mot_de_passe in comptes_crees:
            print(f"Identifiant : {identifiant}")
            print(f"Rôle        : {role}")
            print(f"Mot de passe: {mot_de_passe}")
            print("-" * 30)

        if not comptes_crees:
            print("Aucun nouveau compte à créer.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    creer_comptes()