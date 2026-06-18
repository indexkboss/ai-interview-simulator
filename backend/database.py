# ==========================================
# database.py
# Configuration SQLAlchemy + connexion BD
# ==========================================

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

# ─── Configuration BD ───
# Utilise SQLite pour développement (simple, pas de serveur)
# En production: utiliser PostgreSQL ou MySQL

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./interview_simulator.db"  # ← Créé automatiquement
)

# Configuration moteur SQLAlchemy
if DATABASE_URL.startswith("sqlite"):
    # Pour SQLite, ajouter check_same_thread=False pour éviter les erreurs
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    # Pour PostgreSQL/MySQL
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base pour les modèles
Base = declarative_base()


# ─── Fonction de dépendance FastAPI ───
def get_db():
    """
    Dépendance FastAPI pour injecter une session BD dans les routes.
    
    Utilisation dans un router:
    @router.get("/endpoint")
    async def endpoint(db: Session = Depends(get_db)):
        # db est une session SQLAlchemy
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Initialisation BD ───
def init_db():
    """
    Crée toutes les tables basées sur les modèles.
    À appeler au démarrage de main.py
    """
    Base.metadata.create_all(bind=engine)
    print("✅ Base de données initialisée")