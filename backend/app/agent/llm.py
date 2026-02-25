"""
LLM 调用封装
优先级：Ollama（本地）> OpenAI / DeepSeek（云端）> 降级无 LLM
用户在 ~/.research-radar/config.json 里配置
"""
import json
import os
from pathlib import Path

_config: dict | None = None


def _load_config() -> dict:
    config_path = Path.home() / ".research-radar" / "config.json"
    if config_path.exists():
        with open(config_path) as f:
            return json.load(f)
    # 默认配置：尝试本地 Ollama
    default = {
        "llm_provider": "ollama",
        "ollama_model": "qwen2.5:7b",
        "ollama_base_url": "http://localhost:11434",
        "openai_api_key": "",
        "openai_model": "gpt-4o-mini",
        "deepseek_api_key": "",
        "deepseek_model": "deepseek-chat",
    }
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with open(config_path, "w") as f:
        json.dump(default, f, indent=2, ensure_ascii=False)
    return default


def llm_available() -> bool:
    cfg = _load_config()
    provider = cfg.get("llm_provider", "none")
    if provider == "none":
        return False
    if provider == "ollama":
        return _check_ollama(cfg)
    if provider == "openai":
        return bool(cfg.get("openai_api_key"))
    if provider == "deepseek":
        return bool(cfg.get("deepseek_api_key"))
    return False


def _check_ollama(cfg: dict) -> bool:
    try:
        import urllib.request
        urllib.request.urlopen(cfg["ollama_base_url"] + "/api/tags", timeout=2)
        return True
    except Exception:
        return False


def call_llm(prompt: str, max_tokens: int = 800) -> str:
    """统一 LLM 调用接口"""
    cfg = _load_config()
    provider = cfg.get("llm_provider", "none")

    try:
        if provider == "ollama":
            return _call_ollama(prompt, cfg, max_tokens)
        elif provider == "openai":
            return _call_openai(prompt, cfg, max_tokens)
        elif provider == "deepseek":
            return _call_deepseek(prompt, cfg, max_tokens)
    except Exception as e:
        print(f"[LLM] 调用失败: {e}")
        return f"（LLM 调用失败: {e}）"

    return "（LLM 未配置）"


def _call_ollama(prompt: str, cfg: dict, max_tokens: int) -> str:
    import urllib.request
    import json

    payload = json.dumps({
        "model": cfg.get("ollama_model", "qwen2.5:7b"),
        "prompt": prompt,
        "stream": False,
        "options": {"num_predict": max_tokens},
    }).encode()

    req = urllib.request.Request(
        cfg["ollama_base_url"] + "/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
        return data.get("response", "")


def _call_openai(prompt: str, cfg: dict, max_tokens: int) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=cfg["openai_api_key"])
    resp = client.chat.completions.create(
        model=cfg.get("openai_model", "gpt-4o-mini"),
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content


def _call_deepseek(prompt: str, cfg: dict, max_tokens: int) -> str:
    from openai import OpenAI  # DeepSeek 兼容 OpenAI SDK
    client = OpenAI(
        api_key=cfg["deepseek_api_key"],
        base_url="https://api.deepseek.com",
    )
    resp = client.chat.completions.create(
        model=cfg.get("deepseek_model", "deepseek-chat"),
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content


def call_llm_stream(prompt: str):
    """流式调用，用于 Chat 接口，yield str chunks"""
    cfg = _load_config()
    provider = cfg.get("llm_provider", "none")

    if provider == "ollama":
        yield from _stream_ollama(prompt, cfg)
    elif provider in ("openai", "deepseek"):
        yield from _stream_openai_compat(prompt, cfg)
    else:
        yield "（LLM 未配置，请编辑 ~/.research-radar/config.json）"


def _stream_ollama(prompt: str, cfg: dict):
    import urllib.request
    import json

    payload = json.dumps({
        "model": cfg.get("ollama_model", "qwen2.5:7b"),
        "prompt": prompt,
        "stream": True,
    }).encode()
    req = urllib.request.Request(
        cfg["ollama_base_url"] + "/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        for line in resp:
            if line:
                chunk = json.loads(line)
                yield chunk.get("response", "")
                if chunk.get("done"):
                    break


def _stream_openai_compat(prompt: str, cfg: dict):
    from openai import OpenAI
    if cfg.get("llm_provider") == "deepseek":
        client = OpenAI(api_key=cfg["deepseek_api_key"], base_url="https://api.deepseek.com")
        model = cfg.get("deepseek_model", "deepseek-chat")
    else:
        client = OpenAI(api_key=cfg["openai_api_key"])
        model = cfg.get("openai_model", "gpt-4o-mini")

    stream = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
