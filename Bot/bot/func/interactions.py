# >> interactions
import logging
import os
import aiohttp
import json
import sqlite3
from aiogram import types
from aiohttp import ClientTimeout
from asyncio import Lock
from functools import wraps
from dotenv import load_dotenv

load_dotenv()
token = os.getenv("TOKEN")
allowed_ids = list(map(int, os.getenv("USER_IDS", "").split(",")))
admin_ids = list(map(int, os.getenv("ADMIN_IDS", "").split(",")))
ollama_base_url = os.getenv("OLLAMA_BASE_URL")
ollama_port = os.getenv("OLLAMA_PORT", "11434")
log_level_str = os.getenv("LOG_LEVEL", "INFO")
allow_all_users_in_groups = bool(int(os.getenv("ALLOW_ALL_USERS_IN_GROUPS", "0")))
log_levels = list(logging._levelToName.values())
timeout = os.getenv("TIMEOUT", "3000")
if log_level_str not in log_levels:
    log_level = logging.DEBUG
else:
    log_level = logging.getLevelName(log_level_str)
logging.basicConfig(level=log_level)

async def manage_model(action: str, model_name: str):
    async with aiohttp.ClientSession() as session:
        url = f"http://{ollama_base_url}:{ollama_port}/api/{action}"
        
        if action == "pull":
            # Use the exact payload structure from the curl example
            data = json.dumps({"name": model_name})
            headers = {
                'Content-Type': 'application/json'
            }
            logging.info(f"Pulling model: {model_name}")
            logging.info(f"Request URL: {url}")
            logging.info(f"Request Payload: {data}")
            
            async with session.post(url, data=data, headers=headers) as response:
                logging.info(f"Pull model response status: {response.status}")
                response_text = await response.text()
                logging.info(f"Pull model response text: {response_text}")
                return response
        elif action == "delete":
            data = json.dumps({"name": model_name})
            headers = {
                'Content-Type': 'application/json'
            }
            async with session.delete(url, data=data, headers=headers) as response:
                return response
        else:
            logging.error(f"Unsupported model management action: {action}")
            return None

def add_system_prompt(user_id, prompt, is_global):
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute("INSERT INTO system_prompts (user_id, prompt, is_global) VALUES (?, ?, ?)",
              (user_id, prompt, is_global))
    conn.commit()
    conn.close()

def get_system_prompts(user_id=None, is_global=None):
    conn = sqlite3.connect('users.db')
    c = conn.cursor()

    if is_global:
        query = "SELECT * FROM system_prompts WHERE is_global = 1"
        c.execute(query)

    elif user_id is not None:
        query = "SELECT * FROM system_prompts WHERE user_id = ? AND is_global = 0"
        c.execute(query, (user_id,))

    else:
        query = "SELECT * FROM system_prompts"
        c.execute(query)

    prompts = c.fetchall()
    conn.close()
    return prompts

    
    c.execute(query, params)
    prompts = c.fetchall()
    conn.close()    
    return prompts

def delete_system_prompt(prompt_id):
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute("DELETE FROM system_prompts WHERE id = ?", (prompt_id,))
    conn.commit()
    conn.close()

async def model_list():
    async with aiohttp.ClientSession() as session:
        url = f"http://{ollama_base_url}:{ollama_port}/api/tags"
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                return data["models"]
            else:
                return []
                
async def generate(payload: dict, modelname: str, prompt: str):
    client_timeout = ClientTimeout(total=int(timeout))
    async with aiohttp.ClientSession(timeout=client_timeout) as session:
        url = f"http://{ollama_base_url}:{ollama_port}/api/chat"

        # Prepare the payload according to Ollama API specification
        ollama_payload = {
            "model": modelname,
            "messages": payload.get("messages", []),
            "stream": payload.get("stream", True)
        }

        try:
            logging.info(f"Sending request to Ollama API: {url}")
            logging.info(f"Payload: {json.dumps(ollama_payload, indent=2)}")

            async with session.post(url, json=ollama_payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logging.error(f"API Error: {response.status} - {error_text}")
                    raise aiohttp.ClientResponseError(
                        request_info=response.request_info,
                        history=response.history,
                        status=response.status,
                        message=f"API Error: {error_text}"
                    )

                buffer = b""
                async for chunk in response.content.iter_any():
                    buffer += chunk
                    while b"\n" in buffer:
                        line, buffer = buffer.split(b"\n", 1)
                        line = line.strip()
                        if line:
                            try:
                                yield json.loads(line)
                            except json.JSONDecodeError as e:
                                logging.error(f"JSON Decode Error: {e}")
                                logging.error(f"Problematic line: {line}")

        except aiohttp.ClientError as e:
            logging.error(f"Client Error during request: {e}")
            raise

def load_allowed_ids_from_db():
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute("SELECT id FROM users")
    user_ids = [row[0] for row in c.fetchall()]
    print(f"users_ids: {user_ids}")
    conn.close()
    return user_ids

def is_registered(user_id):
   if user_id in load_allowed_ids_from_db():
       return True
   else: return False

def get_all_users_from_db():
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute("SELECT id, name FROM users")
    users = c.fetchall()
    conn.close()
    return users

def remove_user_from_db(user_id):
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute("DELETE FROM users WHERE id = ?", (user_id,))
    removed = c.rowcount > 0
    conn.commit()
    conn.close()
    if removed:
        allowed_ids = [id for id in allowed_ids if id != user_id]
    return removed

def perms_allowed(func):
    @wraps(func)
    async def wrapper(message: types.Message = None, query: types.CallbackQuery = None):
        user_id = message.from_user.id if message else query.from_user.id
        if user_id in admin_ids or user_id in allowed_ids:
            if message:
                return await func(message)
            elif query:
                return await func(query=query)
        else:
            if message:
                if message and message.chat.type in ["supergroup", "group"] :
                    if allow_all_users_in_groups:
                        return await func(message)
                    return
                await message.answer("Access Denied")
            elif query:
                if message and message.chat.type in ["supergroup", "group"]:
                    return
                await query.answer("Access Denied")

    return wrapper


def perms_admins(func):
    @wraps(func)
    async def wrapper(event, *args, **kwargs):
        
        # --- MESSAGE ---
        if isinstance(event, types.Message):
            user = event.from_user
            chat_type = event.chat.type

        # --- CALLBACK ---
        elif isinstance(event, types.CallbackQuery):
            user = event.from_user
            chat_type = (
                event.message.chat.type
                if event.message and event.message.chat
                else None
            )

        else:
            return await func(event, *args, **kwargs)

        user_id = user.id

        
        if user_id in admin_ids:
            return await func(event, *args, **kwargs)

        logging.info(
            f"[DENIED] {user.first_name} {user.last_name} ({user_id}) А ВЫ НЕ АДМИН!"
        )

        # в группах молчим
        if chat_type in ("group", "supergroup"):
            return

        # личный чат
        if isinstance(event, types.Message):
            await event.answer(
                " А ВЫ НЕ АДМИН!",
                show_alert=True
            )

        elif isinstance(event, types.CallbackQuery):
            await event.answer(
                " А ВЫ НЕ АДМИН!",
                show_alert=True
            )

    return wrapper


def perms_registered(func):
    @wraps(func)
    async def wrapper(event, *args, **kwargs):
        
        # --- MESSAGE ---
        if isinstance(event, types.Message):
            user = event.from_user
            chat_type = event.chat.type

        # --- CALLBACK ---
        elif isinstance(event, types.CallbackQuery):
            user = event.from_user
            chat_type = (
                event.message.chat.type
                if event.message and event.message.chat
                else None
            )

        else:
            return await func(event, *args, **kwargs)

        user_id = user.id

        # ✔ проверка регистрации
        if is_registered(user_id):
            return await func(event, *args, **kwargs)

        # ❌ доступ запрещён
        logging.info(
            f"[DENIED] {user.first_name} {user.last_name} ({user_id}) not registered"
        )

        # в группах молчим
        if chat_type in ("group", "supergroup"):
            return

        # личный чат
        if isinstance(event, types.Message):
            await event.answer(
                "⛔️ У вас нет доступа.\n"
                "Используйте /start для регистрации."
            )

        elif isinstance(event, types.CallbackQuery):
            await event.answer(
                "⛔️ Сначала зарегистрируйтесь (/start)",
                show_alert=True
            )

    return wrapper

class contextLock:
    lock = Lock()

    async def __aenter__(self):
        await self.lock.acquire()

    async def __aexit__(self, exc_type, exc_value, exc_traceback):
        self.lock.release()
