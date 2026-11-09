from database import engine, Base
import models


print("Suppression des anciennes tables...")

# Supprime les tables correspondant aux modèles connus par SQLAlchemy.
Base.metadata.drop_all(bind=engine)

print("Anciennes tables supprimées.")


print("Création des nouvelles tables...")

# Crée les tables correspondant aux modèles actuels.
Base.metadata.create_all(bind=engine)

print("Nouvelles tables créées avec succès.")