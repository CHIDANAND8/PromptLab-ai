from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine
from routers import auth, prompt

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PromptLab AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(prompt.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to PromptLab AI API"}
