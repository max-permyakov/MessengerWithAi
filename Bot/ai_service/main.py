import json
import os
import sqlite3
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

import aiohttp
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "localhost")
OLLAMA_PORT = os.getenv("OLLAMA_PORT", "11434")
INIT_MODEL = os.getenv("INITMODEL", "nemotron-3-nano:latest")
TIMEOUT = int(os.getenv("TIMEOUT", "300"))
DB_PATH = os.getenv("AI_SERVICE_DB_PATH", "users.db")


class ChatMessage(BaseModel):
    role: str
    content: str
    images: list[str] | None = None


class ChatRequest(BaseModel):
    user_id: str = Field(min_length=1)
    chat_id: str = Field(min_length=1)
    prompt: str = Field(min_length=1)
    model: str | None = None
    stream: bool = True
    prompt_id: int | None = None
    images: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    content: str
    model: str
    prompt_id: int | None = None


class PromptCreateRequest(BaseModel):
    user_id: str
    prompt: str = Field(min_length=1)
    is_global: bool = False


class PromptResponse(BaseModel):
    id: int
    user_id: str
    prompt: str
    is_global: bool
    timestamp: str | None = None


class SessionState(BaseModel):
    model: str
    messages: list[ChatMessage]
    stream: bool
    prompt_id: int | None = None


ACTIVE_CHATS: dict[str, SessionState] = {}


def session_key(user_id: str, chat_id: str) -> str:
    return f"{user_id}:{chat_id}"


def now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS system_prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            prompt TEXT NOT NULL,
            is_global BOOLEAN NOT NULL DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()


def list_prompts(user_id: str | None, is_global: bool | None) -> list[PromptResponse]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if is_global is True:
        cursor.execute(
            "SELECT id, user_id, prompt, is_global, timestamp FROM system_prompts WHERE is_global = 1 ORDER BY id ASC"
        )
    elif is_global is False and user_id:
        cursor.execute(
            "SELECT id, user_id, prompt, is_global, timestamp FROM system_prompts WHERE user_id = ? AND is_global = 0 ORDER BY id ASC",
            (user_id,),
        )
    else:
        cursor.execute(
            "SELECT id, user_id, prompt, is_global, timestamp FROM system_prompts ORDER BY id ASC"
        )

    rows = cursor.fetchall()
    conn.close()
    return [
        PromptResponse(
            id=row[0],
            user_id=str(row[1]),
            prompt=row[2],
            is_global=bool(row[3]),
            timestamp=row[4],
        )
        for row in rows
    ]


def create_prompt(user_id: str, prompt: str, is_global: bool) -> PromptResponse:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO system_prompts (user_id, prompt, is_global) VALUES (?, ?, ?)",
        (user_id, prompt, int(is_global)),
    )
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return PromptResponse(
        id=int(new_id),
        user_id=user_id,
        prompt=prompt,
        is_global=is_global,
        timestamp=now_iso(),
    )


def delete_prompt(prompt_id: int, user_id: str | None = None, is_admin: bool = False) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if is_admin:
        cursor.execute("DELETE FROM system_prompts WHERE id = ?", (prompt_id,))
    elif user_id:
        cursor.execute(
            "DELETE FROM system_prompts WHERE id = ? AND (user_id = ? OR is_global = 1)",
            (prompt_id, user_id),
        )
    else:
        conn.close()
        return False
    removed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return removed


async def ollama_models() -> list[dict[str, Any]]:
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as session:
        async with session.get(f"http://{OLLAMA_BASE_URL}:{OLLAMA_PORT}/api/tags") as response:
            if response.status != 200:
                raise HTTPException(status_code=response.status, detail=await response.text())
            data = await response.json()
            return data.get("models", [])


async def ollama_manage_model(action: str, model_name: str) -> dict[str, Any]:
    url = f"http://{OLLAMA_BASE_URL}:{OLLAMA_PORT}/api/{action}"
    payload = {"name": model_name}
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as session:
        method = session.post if action == "pull" else session.delete
        async with method(url, json=payload) as response:
            text = await response.text()
            if response.status not in (200, 201):
                raise HTTPException(status_code=response.status, detail=text)
            return {"status": response.status, "detail": text}


async def generate(messages: list[ChatMessage], model: str, stream: bool) -> AsyncGenerator[dict[str, Any], None]:
    payload = {
        "model": model,
        "messages": [message.model_dump(exclude_none=True) for message in messages],
        "stream": stream,
    }
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as session:
        async with session.post(f"http://{OLLAMA_BASE_URL}:{OLLAMA_PORT}/api/chat", json=payload) as response:
            if response.status != 200:
                raise HTTPException(status_code=response.status, detail=await response.text())
            if not stream:
                data = await response.json()
                yield data
                return
            buffer = b""
            async for chunk in response.content.iter_any():
                buffer += chunk
                while b"\n" in buffer:
                    line, buffer = buffer.split(b"\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    yield json.loads(line)
            if buffer.strip():
                yield json.loads(buffer)


def resolve_system_prompt(user_id: str, prompt_id: int | None) -> PromptResponse | None:
    if prompt_id is None:
        return None
    prompts = list_prompts(user_id=user_id, is_global=None)
    for prompt in prompts:
        if prompt.id == prompt_id:
            return prompt
    return None


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Prime AI Service", version="1.0.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ai/models")
async def get_models() -> list[dict[str, Any]]:
    return await ollama_models()


@app.post("/ai/models/pull")
async def pull_model(name: str = Query(min_length=1)) -> dict[str, Any]:
    return await ollama_manage_model("pull", name)


@app.delete("/ai/models/{name}")
async def remove_model(name: str) -> dict[str, Any]:
    return await ollama_manage_model("delete", name)


@app.get("/ai/prompts", response_model=list[PromptResponse])
async def get_prompts(
    user_id: str | None = None,
    is_global: bool | None = None,
) -> list[PromptResponse]:
    return list_prompts(user_id=user_id, is_global=is_global)


@app.post("/ai/prompts", response_model=PromptResponse)
async def add_prompt(request: PromptCreateRequest) -> PromptResponse:
    return create_prompt(request.user_id, request.prompt, request.is_global)


@app.delete("/ai/prompts/{prompt_id}")
async def remove_prompt(
    prompt_id: int,
    user_id: str | None = None,
    is_admin: bool = False,
) -> dict[str, bool]:
    deleted = delete_prompt(prompt_id, user_id=user_id, is_admin=is_admin)
    if not deleted:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {"deleted": True}


@app.post("/ai/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    key = session_key(request.user_id, request.chat_id)
    model_name = request.model or INIT_MODEL
    prompt_row = resolve_system_prompt(request.user_id, request.prompt_id)

    state = ACTIVE_CHATS.get(key)
    messages: list[ChatMessage] = []
    if state:
        messages.extend(state.messages)

    if prompt_row and not any(m.role == "system" for m in messages):
        messages.append(ChatMessage(role="system", content=prompt_row.prompt))

    messages.append(ChatMessage(role="user", content=request.prompt, images=request.images or []))

    answer = ""
    async for data in generate(messages=messages, model=model_name, stream=False):
        msg = data.get("message") or {}
        answer += msg.get("content", "")

    messages.append(ChatMessage(role="assistant", content=answer))
    ACTIVE_CHATS[key] = SessionState(
        model=model_name,
        messages=messages,
        stream=request.stream,
        prompt_id=request.prompt_id,
    )
    return ChatResponse(content=answer.strip(), model=model_name, prompt_id=request.prompt_id)


@app.post("/ai/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    key = session_key(request.user_id, request.chat_id)
    model_name = request.model or INIT_MODEL
    prompt_row = resolve_system_prompt(request.user_id, request.prompt_id)

    state = ACTIVE_CHATS.get(key)
    messages: list[ChatMessage] = []
    if state:
        messages.extend(state.messages)
    if prompt_row and not any(m.role == "system" for m in messages):
        messages.append(ChatMessage(role="system", content=prompt_row.prompt))
    messages.append(ChatMessage(role="user", content=request.prompt, images=request.images or []))

    async def event_stream() -> AsyncGenerator[str, None]:
        answer = ""
        async for data in generate(messages=messages, model=model_name, stream=True):
            msg = data.get("message") or {}
            chunk = msg.get("content", "")
            if chunk:
                answer += chunk
                yield f"data: {json.dumps({'chunk': chunk, 'done': False})}\n\n"
            if data.get("done"):
                messages.append(ChatMessage(role="assistant", content=answer))
                ACTIVE_CHATS[key] = SessionState(
                    model=model_name,
                    messages=messages,
                    stream=True,
                    prompt_id=request.prompt_id,
                )
                yield f"data: {json.dumps({'chunk': '', 'done': True, 'content': answer.strip(), 'model': model_name})}\n\n"
                break

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.delete("/ai/chat/session")
async def reset_chat_session(user_id: str = Query(min_length=1), chat_id: str = Query(min_length=1)) -> dict[str, bool]:
    key = session_key(user_id, chat_id)
    removed = ACTIVE_CHATS.pop(key, None) is not None
    return {"deleted": removed}
