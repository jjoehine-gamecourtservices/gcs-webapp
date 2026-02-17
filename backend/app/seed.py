from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal, init_db
from app.models.user import User


def seed_master(db: Session) -> None:
    email = settings.MASTER_EMAIL.lower().strip()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        print(f"[seed] master exists: {email}")
        return

    user = User(
        email=email,
        password_hash=hash_password(settings.MASTER_PASSWORD),
        is_master=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    print(f"[seed] created master: {email} (password from GCS_MASTER_PASSWORD)")


if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        seed_master(db)
    finally:
        db.close()
