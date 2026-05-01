from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int

class PromptRequest(BaseModel):
    prompt: str
    model: str = "gpt-3.5-turbo"
    temperature: float = 0.7
    max_tokens: int = 256

class CompareRequest(BaseModel):
    prompts: List[str]
    model: str = "gpt-3.5-turbo"

class EvaluateRequest(BaseModel):
    prompt_a: str
    prompt_b: str
    output_a: str
    output_b: str

class SuggestRequest(BaseModel):
    prompt: str

class PromptHistoryResponse(BaseModel):
    id: int
    prompt_text: str
    model_used: str
    output: str
    latency: float
    created_at: datetime
    
    model_config = {
        "from_attributes": True,
        "protected_namespaces": ()
    }
