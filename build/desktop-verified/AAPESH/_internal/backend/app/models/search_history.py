import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from backend.app.db.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    query = Column(String(255), index=True, nullable=False)
    searched_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "query": self.query,
            "searched_at": self.searched_at.isoformat() if self.searched_at else None,
        }
