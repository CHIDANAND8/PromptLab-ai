import os
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "dummy_key"),
    base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
)

groq_api_key = os.getenv("GROQ_API_KEY")
groq_client = None
if groq_api_key:
    groq_client = OpenAI(
        api_key=groq_api_key,
        base_url="https://api.groq.com/openai/v1"
    )

DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gpt-3.5-turbo")

def generate_response(prompt: str, model: str, temperature: float, max_tokens: int):
    # Mocking response if API key is dummy to allow running without valid key
    api_key = os.getenv("OPENAI_API_KEY", "dummy_key")
    if api_key == "dummy_key" or api_key == "your_openai_api_key_here":
        return f"[Mocked {model} Output] The AI responded to: '{prompt}'. Parameters: temp={temperature}, max_tokens={max_tokens}."

    try:
        active_client = groq_client if (groq_client and not model.startswith("gpt-")) else client
        try:
            response = active_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens
            )
        except Exception as e:
            if active_client == groq_client and ("model_not_found" in str(e) or "does not exist" in str(e) or "decommissioned" in str(e)):
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens
                )
            else:
                raise e
        return response.choices[0].message.content
    except Exception as e:
        return f"[Fallback Mode - {model}] The AI processed your prompt: '{prompt}'. (Error details: {str(e)})"

def stream_response(prompt: str, model: str, temperature: float, max_tokens: int):
    api_key = os.getenv("OPENAI_API_KEY", "dummy_key")
    if api_key == "dummy_key" or api_key == "your_openai_api_key_here":
        mock_text = f"[Mocked {model} Output] The AI responded to: '{prompt}'. Parameters: temp={temperature}, max_tokens={max_tokens}."
        words = mock_text.split(" ")
        for word in words:
            time.sleep(0.05)
            yield word + " "
        return

    try:
        active_client = groq_client if (groq_client and not model.startswith("gpt-")) else client
        try:
            response = active_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
        except Exception as e:
            if active_client == groq_client and ("model_not_found" in str(e) or "does not exist" in str(e) or "decommissioned" in str(e)):
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True
                )
            else:
                raise e
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        yield f"\n[Error during streaming] {str(e)}"

def suggest_improvement(prompt: str):
    api_key = os.getenv("OPENAI_API_KEY", "dummy_key")
    if api_key == "dummy_key" or api_key == "your_openai_api_key_here":
        return f"You are an expert system. Please accurately answer: {prompt}"
        
    try:
        active_client = groq_client if groq_client else client
        # For suggest_improvement, we just use DEFAULT_MODEL or a lightweight model
        eval_model = "llama-3.1-8b-instant" if groq_client else DEFAULT_MODEL
        response = active_client.chat.completions.create(
            model=eval_model,
            messages=[
                {"role": "system", "content": "You are a prompt engineering expert. Improve the following prompt to be more specific, clear, and likely to yield a better result. Return ONLY the improved prompt text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=256
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"[Fallback Mode] You are an expert system. Please accurately answer: {prompt} (Note: Real response failed)"

def evaluate_comparison(prompt_a: str, prompt_b: str, output_a: str, output_b: str):
    import json
    api_key = os.getenv("OPENAI_API_KEY", "dummy_key")
    if api_key == "dummy_key" or api_key == "your_openai_api_key_here":
        return {
            "analysis_a": "❌ Problems:\n- Ambiguous intent\n- No format instruction\n- Lacks depth",
            "analysis_b": "✅ Improvements:\n- Full form used\n- Output format defined\n- Better clarity"
        }
        
    try:
        active_client = groq_client if groq_client else client
        eval_model = "llama-3.1-8b-instant" if groq_client else DEFAULT_MODEL
        response = active_client.chat.completions.create(
            model=eval_model,
            messages=[
                {"role": "system", "content": "You are a Prompt Engineering evaluator. Compare Prompt A and Prompt B. For each prompt, provide ONLY a suggested 'Improved Prompt' followed by a brief 3-line maximum explanation of why it is better. Do not provide long explanations. Return a JSON object with keys 'analysis_a' and 'analysis_b'."},
                {"role": "user", "content": f"Prompt A: {prompt_a}\nOutput A: {output_a}\n\nPrompt B: {prompt_b}\nOutput B: {output_b}"}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        return {
            "analysis_a": f"❌ Problems (Fallback Mode):\n- API Connection Failed\n- Error: {str(e)}",
            "analysis_b": "✅ Improvements:\n- Ensure Ollama is running or API key has quota\n- Try restarting backend"
        }
