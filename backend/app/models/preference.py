from sqlalchemy import Column, String, Text
from backend.app.db.database import Base


class UserPreference(Base):
    __tablename__ = "user_preferences"

    key = Column(String(128), primary_key=True)
    value = Column(Text, nullable=False)

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
        }
