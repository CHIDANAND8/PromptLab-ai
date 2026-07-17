import os
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

openai_base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

# Detect if we are running in Docker, and rewrite local base url to host.docker.internal
is_in_docker = os.path.exists('/.dockerenv') or os.getenv("IS_DOCKER", "").lower() == "true"
if is_in_docker:
    if "localhost" in openai_base_url:
        openai_base_url = openai_base_url.replace("localhost", "host.docker.internal")
    elif "127.0.0.1" in openai_base_url:
        openai_base_url = openai_base_url.replace("127.0.0.1", "host.docker.internal")

IS_LOCAL = "localhost" in openai_base_url or "127.0.0.1" in openai_base_url or "0.0.0.0" in openai_base_url or "host.docker.internal" in openai_base_url

# Dedicated client for local Ollama container integration
local_ollama_client = None
if IS_LOCAL:
    local_ollama_client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY", "dummy_key"),
        base_url=openai_base_url
    )

# Dedicated client for pure OpenAI cloud models
openai_cloud_client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "dummy_key"),
    base_url="https://api.openai.com/v1"
)

groq_api_key = os.getenv("GROQ_API_KEY")
groq_client = None
if groq_api_key:
    groq_client = OpenAI(
        api_key=groq_api_key,
        base_url="https://api.groq.com/openai/v1"
    )

DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gpt-3.5-turbo")

def map_model(model: str, provider: str = "openai") -> str:
    """Maps local/shorthand model names to valid identifiers depending on target provider."""
    model_lower = model.lower()
    if provider == "groq":
        if "llama3.2" in model_lower:
            return "llama-3.3-70b-versatile"
        if "llama3" in model_lower or "llama-3" in model_lower:
            return "llama-3.1-8b-instant"
    return model

def get_demo_fallback_response(prompt: str, model: str, temperature: float, max_tokens: int, err_reason: str) -> str:
    return (
        f"[Demo Mode - Simulated {model} Output]\n"
        f"Hi there! Since the API key or endpoint configurations for {model} returned an error, "
        f"here is a simulated response to keep the playground functional:\n\n"
        f"• Prompt requested: \"{prompt}\"\n"
        f"• Settings used: Temperature={temperature}, Max Tokens={max_tokens}\n"
        f"• Error details: {err_reason}\n\n"
        f"Please check your API key credentials or verify if Ollama is running locally."
    )

def stream_demo_fallback(prompt: str, model: str, temperature: float, max_tokens: int, err_reason: str):
    mock_text = (
        f"[Demo Mode - Simulated {model} Output]\n"
        f"Hi there! Since the API key or endpoint configurations for {model} returned an error, "
        f"here is a simulated response to keep the playground functional:\n\n"
        f"• Prompt requested: \"{prompt}\"\n"
        f"• Settings used: Temperature={temperature}, Max Tokens={max_tokens}\n"
        f"• Error details: {err_reason}\n\n"
        f"Please check your API key credentials or verify if Ollama is running locally."
    )
    words = mock_text.split(" ")
    for word in words:
        yield word + " "
        time.sleep(0.04)

def get_active_client_and_model(model: str):
    is_gpt = model.lower().startswith("gpt-")
    is_groq_only = "versatile" in model.lower() or "instant" in model.lower() or "preview" in model.lower() or model.lower().startswith("llama-3.1-") or model.lower().startswith("llama-3.3-")
    
    if is_gpt:
        return openai_cloud_client, model
    elif is_groq_only:
        if groq_client:
            return groq_client, model
        else:
            return openai_cloud_client, "gpt-3.5-turbo"
    else:
        if local_ollama_client:
            return local_ollama_client, model
        else:
            if groq_client:
                return groq_client, map_model(model, "groq")
            else:
                return openai_cloud_client, "gpt-3.5-turbo"

def generate_response(prompt: str, model: str, temperature: float, max_tokens: int):
    is_gpt = model.lower().startswith("gpt-")
    is_groq_only = "versatile" in model.lower() or "instant" in model.lower() or "preview" in model.lower() or model.lower().startswith("llama-3.1-") or model.lower().startswith("llama-3.3-")
    
    primary_client = None
    primary_model = model
    secondary_client = None
    secondary_model = model
    
    if is_gpt:
        primary_client = openai_cloud_client
        primary_model = model
        if groq_client:
            secondary_client = groq_client
            secondary_model = "llama-3.3-70b-versatile"
    elif is_groq_only:
        if groq_client:
            primary_client = groq_client
            primary_model = model
            secondary_client = openai_cloud_client
            secondary_model = "gpt-3.5-turbo"
        else:
            primary_client = openai_cloud_client
            primary_model = "gpt-3.5-turbo"
    else:
        if local_ollama_client:
            primary_client = local_ollama_client
            primary_model = model
            if groq_client:
                secondary_client = groq_client
                secondary_model = map_model(model, "groq")
            else:
                secondary_client = openai_cloud_client
                secondary_model = "gpt-3.5-turbo"
        else:
            if groq_client:
                primary_client = groq_client
                primary_model = map_model(model, "groq")
                secondary_client = openai_cloud_client
                secondary_model = "gpt-3.5-turbo"
            else:
                primary_client = openai_cloud_client
                primary_model = "gpt-3.5-turbo"

    def check_keys(target_client):
        if target_client == openai_cloud_client:
            api_key = os.getenv("OPENAI_API_KEY", "dummy_key")
            if api_key in ("dummy_key", "your_openai_api_key_here", "") or api_key.startswith("sk-proj-your"):
                raise ValueError("PlaceHolder/Dummy OpenAI API key detected")
        if target_client == groq_client:
            api_key = os.getenv("GROQ_API_KEY", "")
            if api_key in ("your_groq_api_key_here", "", "dummy") or api_key.startswith("gsk_your"):
                raise ValueError("PlaceHolder/Dummy Groq API key detected")

    try:
        check_keys(primary_client)
        response = primary_client.chat.completions.create(
            model=primary_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
    except Exception as e_primary:
        print(f"Primary client error: {e_primary}")
        if secondary_client:
            try:
                check_keys(secondary_client)
                response = secondary_client.chat.completions.create(
                    model=secondary_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                return response.choices[0].message.content
            except Exception as e_secondary:
                print(f"Secondary client error: {e_secondary}")
                return get_demo_fallback_response(prompt, model, temperature, max_tokens, f"{e_primary} / {e_secondary}")
        else:
            return get_demo_fallback_response(prompt, model, temperature, max_tokens, str(e_primary))

def stream_response(prompt: str, model: str, temperature: float, max_tokens: int):
    is_gpt = model.lower().startswith("gpt-")
    is_groq_only = "versatile" in model.lower() or "instant" in model.lower() or "preview" in model.lower() or model.lower().startswith("llama-3.1-") or model.lower().startswith("llama-3.3-")
    
    primary_client = None
    primary_model = model
    secondary_client = None
    secondary_model = model
    
    if is_gpt:
        primary_client = openai_cloud_client
        primary_model = model
        if groq_client:
            secondary_client = groq_client
            secondary_model = "llama-3.3-70b-versatile"
    elif is_groq_only:
        if groq_client:
            primary_client = groq_client
            primary_model = model
            secondary_client = openai_cloud_client
            secondary_model = "gpt-3.5-turbo"
        else:
            primary_client = openai_cloud_client
            primary_model = "gpt-3.5-turbo"
    else:
        if local_ollama_client:
            primary_client = local_ollama_client
            primary_model = model
            if groq_client:
                secondary_client = groq_client
                secondary_model = map_model(model, "groq")
            else:
                secondary_client = openai_cloud_client
                secondary_model = "gpt-3.5-turbo"
        else:
            if groq_client:
                primary_client = groq_client
                primary_model = map_model(model, "groq")
                secondary_client = openai_cloud_client
                secondary_model = "gpt-3.5-turbo"
            else:
                primary_client = openai_cloud_client
                primary_model = "gpt-3.5-turbo"

    def check_keys(target_client):
        if target_client == openai_cloud_client:
            api_key = os.getenv("OPENAI_API_KEY", "dummy_key")
            if api_key in ("dummy_key", "your_openai_api_key_here", "") or api_key.startswith("sk-proj-your"):
                raise ValueError("PlaceHolder/Dummy OpenAI API key detected")
        if target_client == groq_client:
            api_key = os.getenv("GROQ_API_KEY", "")
            if api_key in ("your_groq_api_key_here", "", "dummy") or api_key.startswith("gsk_your"):
                raise ValueError("PlaceHolder/Dummy Groq API key detected")

    try:
        check_keys(primary_client)
        response = primary_client.chat.completions.create(
            model=primary_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e_primary:
        print(f"Primary streaming error: {e_primary}")
        if secondary_client:
            try:
                check_keys(secondary_client)
                response = secondary_client.chat.completions.create(
                    model=secondary_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True
                )
                for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except Exception as e_secondary:
                print(f"Secondary streaming error: {e_secondary}")
                for chunk in stream_demo_fallback(prompt, model, temperature, max_tokens, f"{e_primary} / {e_secondary}"):
                    yield chunk
        else:
            for chunk in stream_demo_fallback(prompt, model, temperature, max_tokens, str(e_primary)):
                yield chunk

def suggest_improvement(prompt: str):
    active_client, eval_model = get_active_client_and_model(DEFAULT_MODEL)
    try:
        if active_client == openai_cloud_client:
            api_key = os.getenv("OPENAI_API_KEY", "dummy_key")
            if api_key in ("dummy_key", "your_openai_api_key_here", "") or api_key.startswith("sk-proj-your"):
                raise ValueError("Dummy OpenAI API key detected")
        if active_client == groq_client:
            api_key = os.getenv("GROQ_API_KEY", "")
            if api_key in ("your_groq_api_key_here", "", "dummy") or api_key.startswith("gsk_your"):
                raise ValueError("Dummy Groq API key detected")

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
        print(f"suggest_improvement error: {e}")
        return f"Please act as an expert assistant and accurately answer the prompt: '{prompt}'"

def evaluate_comparison(prompt_a: str, prompt_b: str, output_a: str, output_b: str):
    import json
    active_client, eval_model = get_active_client_and_model(DEFAULT_MODEL)
    try:
        if active_client == openai_cloud_client:
            api_key = os.getenv("OPENAI_API_KEY", "dummy_key")
            if api_key in ("dummy_key", "your_openai_api_key_here", "") or api_key.startswith("sk-proj-your"):
                raise ValueError("Dummy OpenAI API key detected")
        if active_client == groq_client:
            api_key = os.getenv("GROQ_API_KEY", "")
            if api_key in ("your_groq_api_key_here", "", "dummy") or api_key.startswith("gsk_your"):
                raise ValueError("Dummy Groq API key detected")

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
        print(f"evaluate_comparison error: {e}")
        return {
            "analysis_a": f"❌ Analysis Fallback (Due to key/connection error: {str(e)}):\n- Prompt A structure should be finalized manually.\n- Make it action-oriented.",
            "analysis_b": f"✅ Analysis Fallback (Due to key/connection error: {str(e)}):\n- Prompt B should include target formats.\n- Validate length requirements."
        }
