from __future__ import annotations

import re
from io import BytesIO

from openpyxl import load_workbook

ALIASES = {
    "im": "IM",
    "matricule": "IM",
    "numeropension": "NumeroPension",
    "numpension": "NumeroPension",
    "num_pension": "NumeroPension",
    "numeroetpension": "NumeroPension",
    "pension": "NumeroPension",
    "nom": "Nom",
    "noms": "Nom",
    "nomcomplet": "Nom",
    "nomscomplet": "Nom",
    "nomcompletagent": "Nom",
    "prenom": "Prenoms",
    "prenoms": "Prenoms",
    "cin": "CIN",
    "cni": "CIN",
    "corps": "Corps",
    "corpscode": "Corps",
    "section": "Section",
    "sectioncode": "Section",
    "fiv": "FIV",
    "fivcode": "FIV",
    "typeagent": "TypeAgent",
}

CHAMPS_RECONNUS = [
    "IM",
    "NumeroPension",
    "Nom",
    "Prenoms",
    "CIN",
    "Corps",
    "Section",
    "FIV",
]

CHAMPS_REQUIS_PAR_TYPE = {
    "en_poste": ["IM", "Nom", "CIN"],
    "retraite": ["NumeroPension", "Nom", "CIN"],
}

LONGUEURS_MAX = {
    "IM": 50,
    "Nom": 150,
    "Prenoms": 150,
    "CIN": 20,
    "Corps": 30,
    "Section": 30,
    "FIV": 30,
    "TypeAgent": 20,
    "NumeroPension": 50,
}

TYPES_AGENT = {"en_poste", "retraite"}
TAILLE_MAX_FICHIER = 10 * 1024 * 1024
NOMBRE_MAX_LIGNES = 20_000


def normaliser_nom_colonne(valeur: object) -> str:
    if valeur is None:
        return ""

    texte = str(valeur).strip()
    if not texte:
        return ""

    texte = texte.casefold()
    texte = re.sub(r"[àâäáã]", "a", texte)
    texte = re.sub(r"[éèêë]", "e", texte)
    texte = re.sub(r"[îïí]", "i", texte)
    texte = re.sub(r"[ôöó]", "o", texte)
    texte = re.sub(r"[ùûü]", "u", texte)
    texte = re.sub(r"[ç]", "c", texte)
    texte = re.sub(r"[^a-z0-9]", "", texte)

    return ALIASES.get(texte, texte)


def normaliser_valeur_excel(valeur: object) -> str | None:
    if valeur is None:
        return None

    if isinstance(valeur, str):
        return valeur.strip() or None

    if isinstance(valeur, (int, float)):
        if isinstance(valeur, float) and not valeur.is_integer():
            texte = str(valeur).strip()
        else:
            texte = str(int(valeur)).strip()
        return texte or None

    if isinstance(valeur, bool):
        return str(valeur).strip() or None

    texte = str(valeur).strip()
    return texte or None


def humaniser_nom_colonne(nom: str) -> str:
    mappage = {
        "IM": "IM",
        "NumeroPension": "Numéro de pension",
        "Nom": "Nom",
        "Prenoms": "Prénoms",
        "CIN": "CIN",
        "Corps": "Corps",
        "Section": "Section",
        "FIV": "FIV",
    }
    return mappage.get(nom, nom)


def lire_agents_excel(
    contenu: bytes,
    type_agent: str,
) -> tuple[list[dict[str, str | None]], list[str]]:
    if type_agent not in TYPES_AGENT:
        raise ValueError("Le type d'import est invalide.")

    if not contenu:
        raise ValueError("Le fichier est vide.")

    if len(contenu) > TAILLE_MAX_FICHIER:
        raise ValueError("Le fichier dépasse la limite de 10 Mo.")

    try:
        classeur = load_workbook(
            BytesIO(contenu),
            read_only=True,
            data_only=True,
        )
    except Exception as erreur:
        raise ValueError(
            "Le fichier est illisible. Vérifiez qu'il s'agit bien d'un fichier Excel (.xlsx ou .xlsm)."
        ) from erreur

    try:
        feuille = classeur.active
        ligne_entete = next(feuille.iter_rows(min_row=1, max_row=1), None)

        if not ligne_entete:
            raise ValueError("Le classeur ne contient pas de ligne d'en-tête.")

        entetes: dict[str, int] = {}
        for index, cellule in enumerate(ligne_entete):
            if cellule.value is None:
                continue

            nom = normaliser_nom_colonne(cellule.value)
            if nom:
                entetes[nom] = index

        colonnes_requises = set(CHAMPS_REQUIS_PAR_TYPE[type_agent])
        colonnes_absentes = sorted(
            colonne for colonne in colonnes_requises if colonne not in entetes
        )

        if colonnes_absentes:
            noms = ", ".join(humaniser_nom_colonne(colonne) for colonne in colonnes_absentes)
            raise ValueError(f"Colonnes manquantes : {noms}.")

        agents: list[dict[str, str | None]] = []
        erreurs: list[str] = []
        lignes_im: dict[str, int] = {}
        lignes_pension: dict[str, int] = {}

        for numero_ligne, ligne in enumerate(feuille.iter_rows(min_row=2), start=2):
            if numero_ligne > NOMBRE_MAX_LIGNES + 1:
                erreurs.append(
                    f"Le fichier contient plus de {NOMBRE_MAX_LIGNES} lignes. Vérifiez le fichier avant l'import."
                )
                break

            if all(cell.value is None for cell in ligne):
                continue

            donnees: dict[str, str | None] = {}
            erreurs_ligne: list[str] = []

            for nom_colonne in CHAMPS_RECONNUS:
                index = entetes.get(nom_colonne)
                if index is None:
                    continue

                cellule = ligne[index] if index < len(ligne) else None
                valeur = None

                if cellule is not None and cellule.data_type == "f":
                    erreurs_ligne.append(
                        f"La colonne {humaniser_nom_colonne(nom_colonne)} contient une formule. Remplacez-la par une valeur simple."
                    )
                    valeur = None
                elif cellule is not None and cellule.value is not None:
                    valeur = normaliser_valeur_excel(cellule.value)

                if valeur is not None and len(valeur) > LONGUEURS_MAX[nom_colonne]:
                    erreurs_ligne.append(
                        f"La colonne {humaniser_nom_colonne(nom_colonne)} dépasse {LONGUEURS_MAX[nom_colonne]} caractères."
                    )

                if nom_colonne in {"IM", "CIN", "FIV"} and valeur is not None:
                    valeur = valeur.replace(".0", "")
                    valeur = valeur.replace(".00", "")

                donnees[nom_colonne] = valeur

            if type_agent == "en_poste":
                im = donnees.get("IM")
                if not im:
                    erreurs_ligne.append("L'IM est obligatoire pour un agent en poste.")

                if donnees.get("NumeroPension") and len(donnees["NumeroPension"]) > LONGUEURS_MAX["NumeroPension"]:
                    erreurs_ligne.append("Le numéro de pension est trop long.")
            else:
                numero_pension = donnees.get("NumeroPension")
                if not numero_pension:
                    erreurs_ligne.append("Le numéro de pension est obligatoire pour un agent retraité.")

                if donnees.get("IM"):
                    erreurs_ligne.append("Un agent retraité ne doit pas avoir d'IM. Supprimez la valeur ou laissez la cellule vide.")

            nom = donnees.get("Nom")
            if not nom:
                erreurs_ligne.append(
                    "Le nom est obligatoire. Si le nom et le prénom sont dans une seule colonne, utilisez une colonne 'NomComplet' ou 'Nom complet'."
                )

            if not donnees.get("CIN"):
                erreurs_ligne.append("Le CIN est obligatoire.")

            if type_agent == "en_poste" and donnees.get("IM"):
                im_valeur = donnees["IM"]
                if im_valeur in lignes_im:
                    erreurs_ligne.append(f"L'IM {im_valeur} est en doublon à la ligne {lignes_im[im_valeur]}.")
                else:
                    lignes_im[im_valeur] = numero_ligne

            if donnees.get("NumeroPension"):
                pension_valeur = donnees["NumeroPension"]
                if pension_valeur in lignes_pension:
                    erreurs_ligne.append(
                        f"Le numéro de pension {pension_valeur} est en doublon à la ligne {lignes_pension[pension_valeur]}."
                    )
                else:
                    lignes_pension[pension_valeur] = numero_ligne

            if erreurs_ligne:
                erreurs.extend(f"Ligne {numero_ligne} : {erreur}" for erreur in erreurs_ligne)
            else:
                donnees["typeAgent"] = type_agent
                agents.append(donnees)

        return agents, erreurs
    finally:
        classeur.close()