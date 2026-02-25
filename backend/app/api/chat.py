"""chat.py — 对话查询 API（SSE 流式）"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.agent.rag_chat import chat_stream

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    history: list[dict] = []
    lang: str = "zh"


@router.post("/stream")
async def stream_chat(req: ChatRequest):
    """流式问答接口"""
    def generate():
        for chunk in chat_stream(req.question, req.history, req.lang):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/status")
def llm_status():
    """检查 LLM 是否可用"""
    from app.agent.llm import llm_available, _load_config
    cfg = _load_config()
    provider = cfg.get("llm_provider", "none")
    model_map = {
        "ollama":   cfg.get("ollama_model", ""),
        "openai":   cfg.get("openai_model", ""),
        "deepseek": cfg.get("deepseek_model", ""),
    }
    return {
        "available": llm_available(),
        "provider": provider,
        "model": model_map.get(provider, "none"),
    }
