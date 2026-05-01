from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import time
import concurrent.futures

import models, schemas, auth_handler, llm_service
from database import get_db

router = APIRouter(
    prefix="/prompt",
    tags=["prompt"]
)

@router.post("/test")
def test_prompt(request: schemas.PromptRequest, current_user: models.User = Depends(auth_handler.get_current_user), db: Session = Depends(get_db)):
    start_time = time.time()
    
    output = llm_service.generate_response(
        prompt=request.prompt,
        model=request.model,
        temperature=request.temperature,
        max_tokens=request.max_tokens
    )
    
    latency = time.time() - start_time
    
    db_prompt = models.PromptHistory(
        user_id=current_user.id,
        prompt_text=request.prompt,
        model_used=request.model,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        output=output,
        latency=latency
    )
    db.add(db_prompt)
    db.commit()
    db.refresh(db_prompt)
    
    return {"output": output, "latency": latency, "id": db_prompt.id}

@router.post("/test-stream")
def test_stream(request: schemas.PromptRequest, current_user: models.User = Depends(auth_handler.get_current_user), db: Session = Depends(get_db)):
    def generate():
        start_time = time.time()
        full_text = ""
        for chunk in llm_service.stream_response(
            prompt=request.prompt,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        ):
            full_text += chunk
            yield chunk
            
        latency = time.time() - start_time
        
        db_prompt = models.PromptHistory(
            user_id=current_user.id,
            prompt_text=request.prompt,
            model_used=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            output=full_text,
            latency=latency
        )
        db.add(db_prompt)
        db.commit()

    return StreamingResponse(generate(), media_type="text/plain")

@router.post("/compare")
def compare_prompts(request: schemas.CompareRequest, current_user: models.User = Depends(auth_handler.get_current_user), db: Session = Depends(get_db)):
    outputs = []
    
    def process_prompt(prompt):
        start_time = time.time()
        output = llm_service.generate_response(prompt, request.model, 0.7, 256)
        latency = time.time() - start_time
        return prompt, output, latency

    with concurrent.futures.ThreadPoolExecutor() as executor:
        results = list(executor.map(process_prompt, request.prompts))
        
    for prompt, output, latency in results:
        db_prompt = models.PromptHistory(
            user_id=current_user.id,
            prompt_text=prompt,
            model_used=request.model,
            temperature=0.7,
            max_tokens=256,
            output=output,
            latency=latency
        )
        db.add(db_prompt)
        outputs.append(output)
        
    db.commit()
    
    analysis = {"analysis_a": "", "analysis_b": ""}
    if len(request.prompts) >= 2 and len(outputs) >= 2:
        analysis = llm_service.evaluate_comparison(
            request.prompts[0], request.prompts[1], 
            outputs[0], outputs[1]
        )
        
    return {
        "outputs": outputs,
        "analysis": [analysis.get("analysis_a", ""), analysis.get("analysis_b", "")]
    }

@router.post("/evaluate")
def evaluate_prompts(request: schemas.EvaluateRequest, current_user: models.User = Depends(auth_handler.get_current_user)):
    analysis = llm_service.evaluate_comparison(
        request.prompt_a, request.prompt_b, 
        request.output_a, request.output_b
    )
    ans_a = analysis.get("analysis_a", "")
    ans_b = analysis.get("analysis_b", "")
    
    import json
    if not isinstance(ans_a, str):
        ans_a = json.dumps(ans_a, indent=2)
    if not isinstance(ans_b, str):
        ans_b = json.dumps(ans_b, indent=2)
        
    return {
        "analysis": [ans_a, ans_b]
    }

@router.get("/history")
def get_history(current_user: models.User = Depends(auth_handler.get_current_user), db: Session = Depends(get_db)):
    history = db.query(models.PromptHistory).filter(models.PromptHistory.user_id == current_user.id).order_by(models.PromptHistory.created_at.desc()).all()
    return history

@router.post("/suggest")
def suggest_prompt(request: schemas.SuggestRequest, current_user: models.User = Depends(auth_handler.get_current_user)):
    suggestion = llm_service.suggest_improvement(request.prompt)
    return {"suggestion": suggestion}
