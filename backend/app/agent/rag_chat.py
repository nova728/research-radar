"""
差异化功能 #3 — 对话查询（基于本地论文库的 RAG）
不依赖外部向量数据库，用 TF-IDF 做轻量检索
可选升级：如果用户安装了 sentence-transformers，自动切换到语义检索
"""
import json
from app.db.database import get_conn
from app.agent.llm import call_llm_stream, llm_available

RAG_PROMPT_ZH = """你是一位 AI 领域研究助手，根据以下 ArXiv 论文资料回答用户问题。
只基于提供的资料回答，如资料中没有相关信息请如实说明。
回答用中文，简洁准确，并在回答末尾标注引用的论文编号。

参考论文：
{context}

用户问题：{question}

请给出回答："""

RAG_PROMPT_EN = """You are an AI research assistant. Answer the user's question based strictly on the ArXiv papers provided below.
Only use the provided papers as your source. If the information is not available, say so clearly.
Reply in English, be concise and accurate, and cite paper numbers at the end of your answer.

Reference papers:
{context}

User question: {question}

Answer:"""


def retrieve_papers(query: str, top_k: int = 8) -> list[dict]:
    """
    检索最相关的论文
    自动检测可用的检索方式：语义 > TF-IDF > 关键词匹配
    """
    try:
        return _semantic_retrieve(query, top_k)
    except ImportError:
        pass

    try:
        return _tfidf_retrieve(query, top_k)
    except Exception:
        pass

    return _keyword_retrieve(query, top_k)


def _semantic_retrieve(query: str, top_k: int) -> list[dict]:
    """语义检索（需要 sentence-transformers）"""
    from sentence_transformers import SentenceTransformer
    import numpy as np

    model = SentenceTransformer("all-MiniLM-L6-v2")  # 轻量，80MB
    conn = get_conn()
    papers = conn.execute(
        "SELECT id, title, abstract, url, topic FROM papers ORDER BY fetched_at DESC LIMIT 500"
    ).fetchall()
    papers = [dict(p) for p in papers]

    if not papers:
        return []

    texts = [f"{p['title']} {p['abstract']}" for p in papers]
    query_vec = model.encode([query])
    doc_vecs = model.encode(texts)

    scores = (query_vec @ doc_vecs.T)[0]
    top_indices = np.argsort(scores)[::-1][:top_k]
    return [papers[i] for i in top_indices]


def _tfidf_retrieve(query: str, top_k: int) -> list[dict]:
    """TF-IDF 检索（需要 scikit-learn）"""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    conn = get_conn()
    papers = conn.execute(
        "SELECT id, title, abstract, url, topic FROM papers ORDER BY fetched_at DESC LIMIT 500"
    ).fetchall()
    papers = [dict(p) for p in papers]

    if not papers:
        return []

    texts = [f"{p['title']} {p['abstract']}" for p in papers]
    vectorizer = TfidfVectorizer(max_features=1000, stop_words="english")
    X = vectorizer.fit_transform(texts + [query])

    sims = cosine_similarity(X[-1:], X[:-1])[0]
    top_indices = sims.argsort()[::-1][:top_k]
    return [papers[i] for i in top_indices]


def _keyword_retrieve(query: str, top_k: int) -> list[dict]:
    """降级：SQL LIKE 关键词匹配"""
    conn = get_conn()
    # 取查询词中最有意义的词
    words = [w for w in query.split() if len(w) > 3][:3]
    if not words:
        words = [query[:20]]

    results = []
    seen = set()
    for word in words:
        rows = conn.execute(
            """SELECT id, title, abstract, url, topic FROM papers
               WHERE title LIKE ? OR abstract LIKE ?
               ORDER BY created_at DESC LIMIT ?""",
            (f"%{word}%", f"%{word}%", top_k),
        ).fetchall()
        for r in rows:
            if r["id"] not in seen:
                results.append(dict(r))
                seen.add(r["id"])

    return results[:top_k]


def chat_stream(question: str, history: list[dict] | None = None, lang: str = "zh"):
    """
    流式问答生成器
    yield: {"type": "token", "content": "..."} 或 {"type": "sources", "content": [...]}
    """
    # Step 1: 检索相关论文
    papers = retrieve_papers(question)

    if not papers:
        no_data_msg = "暂无相关论文数据，请先进行一次抓取。" if lang == "zh" else "No relevant papers found. Please fetch papers first."
        yield json.dumps({"type": "token", "content": no_data_msg}, ensure_ascii=False)
        return

    # Step 2: 构造上下文
    context_parts = []
    for i, p in enumerate(papers):
        context_parts.append(
            f"[{i+1}] 标题：{p['title']}\n摘要：{p['abstract'][:400]}..."
        )
    context = "\n\n".join(context_parts)

    RAG_PROMPT = RAG_PROMPT_ZH if lang == "zh" else RAG_PROMPT_EN
    prompt = RAG_PROMPT.format(context=context, question=question)

    # Step 3: 先发送引用来源
    sources = [
        {"index": i + 1, "id": p["id"], "title": p["title"], "url": p["url"], "topic": p["topic"]}
        for i, p in enumerate(papers)
    ]
    yield json.dumps({"type": "sources", "content": sources}, ensure_ascii=False)

    # Step 4: 流式生成回答
    if llm_available():
        for chunk in call_llm_stream(prompt):
            yield json.dumps({"type": "token", "content": chunk}, ensure_ascii=False)
    else:
        # 降级：返回检索到的论文摘要
        if lang == "zh":
            msg = f"（LLM 未配置）找到 {len(papers)} 篇相关论文，最相关的是：\n\n"
        else:
            msg = f"(LLM not configured) Found {len(papers)} relevant papers. Most relevant:\n\n"
        msg += "\n".join(f"• {p['title']}" for p in papers[:3])
        yield json.dumps({"type": "token", "content": msg}, ensure_ascii=False)

    yield json.dumps({"type": "done"}, ensure_ascii=False)
