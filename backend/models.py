from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    prompts = relationship("PromptHistory", back_populates="user")

class PromptHistory(Base):
    __tablename__ = "prompt_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    prompt_text = Column(String)
    model_used = Column(String)
    temperature = Column(Float)
    max_tokens = Column(Integer)
    output = Column(String)
    latency = Column(Float)
    relevance_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="prompts")
