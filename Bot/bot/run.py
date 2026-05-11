from aiogram import Bot, Dispatcher, types
from aiogram.enums import ParseMode
from aiogram.filters.command import Command, CommandStart
from aiogram.types import Message
from aiogram.utils.keyboard import InlineKeyboardBuilder
from func.FormatResponse import MAX_LEN, split_markdown_preserve
from func.InitDB import init_db, register_user, save_chat_message
from func.interactions import *
import asyncio
import traceback
import io
import base64
bot = Bot(token=token)
dp = Dispatcher()
start_kb = InlineKeyboardBuilder()
settings_kb = InlineKeyboardBuilder()

start_kb.row(
    types.InlineKeyboardButton(text="ℹ️ О боте", callback_data="about"))
start_kb.row(
    types.InlineKeyboardButton(text="🔄 Выбрать модель LLM", callback_data="switchllm"),)
start_kb.row(
    types.InlineKeyboardButton(text="📋 Выбрать системный промт", callback_data="select_prompt"),)
start_kb.row(
    types.InlineKeyboardButton(text="📋 Выбрать локальный системный промт", callback_data="select_local_prompt")
    

)


commands = [
    types.BotCommand(command="start", description="Меню"),
    types.BotCommand(command="reset", description="Сбросить чат"),
    types.BotCommand(command="history", description="Просмотреть историю сообщений"),
    types.BotCommand(command="pullmodel", description="Загрузить модель из Ollama"),
    types.BotCommand(command="addglobalprompt", description="Добавить глобальный промт"),
    types.BotCommand(command="addprivateprompt", description="Добавить личный промт"),
    types.BotCommand(command="admin",description="Панель администратора")

]

ACTIVE_CHATS = {}
ACTIVE_CHATS_LOCK = contextLock()
modelname = os.getenv("INITMODEL")
mention = None
selected_prompt_id = 6  
CHAT_TYPE_GROUP = "group"
CHAT_TYPE_SUPERGROUP = "supergroup"


@dp.message(Command("admin"))
@perms_admins
async def admin_panel(message: Message) -> None:
    admin_kb = InlineKeyboardBuilder()
    admin_kb.row(
        types.InlineKeyboardButton(text="🗑️ Удалить LLM", callback_data="delete_model"),
        types.InlineKeyboardButton(text="🗑️ Удалить Системный промт", callback_data="delete_prompt"), 
        types.InlineKeyboardButton(text="📋 Список пользователей и удаление пользователя", callback_data="list_users"),
    )
    await message.answer("ADMIN PANEl", reply_markup=admin_kb.as_markup())

    


async def get_bot_info():
    global mention
    if mention is None:
        get = await bot.get_me()
        mention = f"@{get.username}"
    return mention

@dp.message(CommandStart())
async def command_start_handler(message: Message) -> None:
    user_id = message.from_user.id
    user_name = message.from_user.full_name
    register_user(user_id, user_name)
    
    start_message = f"Привет, <b>{message.from_user.full_name}</b>!"
    await message.answer(
        start_message,
        parse_mode=ParseMode.HTML,
        reply_markup=start_kb.as_markup(),
        disable_web_page_preview=True,
    )
    
@perms_registered
@dp.message(Command("reset"))
async def command_reset_handler(message: Message):
    async with ACTIVE_CHATS_LOCK:
        ACTIVE_CHATS.pop(message.from_user.id, None)

    logging.info(f"Chat reset for {message.from_user.first_name}")
    await message.answer("✅ Чат был сброшен")

@perms_registered
@dp.message(Command("history"))
async def command_get_context_handler(message: Message):
    user_id = message.from_user.id

    if user_id not in ACTIVE_CHATS:
        await message.answer("Нет истории чата для отображения")
        return

    messages = ACTIVE_CHATS[user_id].get("messages", [])

    if not messages:
        await message.answer("История чата пуста")
        return

    context = []
    for msg in messages:
        role = msg.get("role", "unknown").capitalize()
        content = msg.get("content", "")
        context.append(f"{role}: {content}")

    text = "\n\n".join(context)

    await message.answer(text)  


@dp.message(Command("addglobalprompt"))
@perms_registered
async def add_global_prompt_handler(message: Message):
    prompt_text = message.text.split(maxsplit=1)[1] if len(message.text.split()) > 1 else None  # Get the prompt text from the command arguments
    if prompt_text:
        add_system_prompt(message.from_user.id, prompt_text, True)
        await message.answer("Глобальный промт добавлен успешно.")
    else:
        await message.answer("Пожалуйста, предоставьте текст промта для добавления.")

@dp.message(Command("addprivateprompt"))
@perms_registered
async def add_private_prompt_handler(message: Message):
    prompt_text = message.text.split(maxsplit=1)[1] if len(message.text.split()) > 1 else None  # Get the prompt text from the command arguments
    if prompt_text:
        add_system_prompt(message.from_user.id, prompt_text, False)
        await message.answer("Приватный промт добавлен успешно.")
    else:
        await message.answer("Пожалуйста, предоставьте текст промта для добавления.")

@dp.message(Command("pullmodel"))
@perms_admins
async def pull_model_handler(message: Message) -> None:
    model_name = message.text.split(maxsplit=1)[1] if len(message.text.split()) > 1 else None  # Get the model name from the command arguments
    logging.info(f"Downloading {model_name}")
    if model_name:
        response = await manage_model("pull", model_name)
        if response.status == 200:
            await message.answer(f"Модель '{model_name}' загружается.")
        else:
            await message.answer(f"Не удалось загрузить модель '{model_name}': {response.reason}")
    else:
        await message.answer("Пожалуйста, укажите имя модели для загрузки.")

@dp.callback_query(lambda query: query.data == "settings")
@perms_registered
async def settings_callback_handler(query: types.CallbackQuery):
    await bot.send_message(
        chat_id=query.message.chat.id,
        text=f"Выберите нужное действие.",
        parse_mode=ParseMode.HTML,
        disable_web_page_preview=True,
        reply_markup=settings_kb.as_markup()
    )

@dp.callback_query(lambda query: query.data == "switchllm")
@perms_registered
async def switchllm_callback_handler(query: types.CallbackQuery):
    models = await model_list()
    switchllm_builder = InlineKeyboardBuilder()
    for model in models:
        modelname = model["name"]
        modelfamilies = ""
        if model["details"]["families"]:
            modelicon = {"nemotron-3-nano":"⚡","vl":"📷",}
            try:
                modelfamilies = "".join(
                    [modelicon[family] for family in model["details"]["families"]]
                )
            except KeyError as e:
                modelfamilies = f"✨"
        switchllm_builder.row(
            types.InlineKeyboardButton(
                text=f"{modelname} {modelfamilies}", callback_data=f"model_{modelname}"
            )
        )
    await query.message.edit_text(
        f"{len(models)} Доступные модели.\nЛучшие модели:\ntranslategemma:latest\nnemotron-3-nano:latest\nqwen3-vl:latest", reply_markup=switchllm_builder.as_markup(),
    )

@dp.callback_query(lambda query: query.data.startswith("model_"))
@perms_registered
async def model_callback_handler(query: types.CallbackQuery):
    global modelname
    global modelfamily
    modelname = query.data.split("model_")[1]
    back = InlineKeyboardBuilder()
    await query.message.edit_text(f"Выбранная модель: {modelname}")
    
    await query.message.answer(
        text="Menu",
        parse_mode=ParseMode.HTML,
        reply_markup=start_kb.as_markup(),
        disable_web_page_preview=True,
    )
@dp.callback_query(lambda query: query.data == "about")
async def about_callback_handler(query: types.CallbackQuery):
    dotenv_model = os.getenv("INITMODEL")
    global modelname
    await bot.send_message(
        chat_id=query.message.chat.id,
        text=f"""<b>🤖 AI Chat Bot на базе Ollama</b>

👋 Привет, {query.from_user.full_name}!

Это умный бот, который использует мощь локальных нейросетей Ollama для общения с вами.

<b>✨ Основные возможности:</b>
• 💬 Работа в личных сообщениях, группах и супергруппах
• 🎨 Поддержка кастомных системных промптов
• 🖼️ Распознавание изображений (для VL-моделей)
• 🗄️ Полная база данных пользователей и истории чатов
• 🔧 Гибкая настройка моделей и промптов

<b>📚 Как начать пользоваться:</b>

1️⃣ <b>Выберите модель</b> — нажмите "Выбрать модель LLM"
   • Меньше цифра → быстрее, но проще (20b > 4b > 400m)
   • VL-модели работают с изображениями 📷

2️⃣ <b>Настройте промпт</b> — задайте поведение бота
   • Глобальные промпты: /addglobalprompt "You are batman"
   • Личные промпты: /addprivateprompt "Ты помощник"

3️⃣ <b>Начните общение</b> — просто напишите сообщение!

📖 Подробная инструкция в <a href='https://t.me/virusibesplatno/13'>этой публикации</a>

<b>⚙️ Ваша конфигурация:</b>
└─ Модель: <code>{modelname}</code>
└─ По умолчанию: <code>{dotenv_model}</code>

━━━━━━━━━━━━━━━━━━━━
<b>👨‍💻 Разработчик:</b> @Massimo_16
<b>📄 Лицензия:</b> <a href='https://github.com/max-permyakov/TgBot-ollama-v2/blob/main/LICENSE'>MIT</a>
<b>💻 Исходный код:</b> <a href='https://github.com/max-permyakov/TgBot-ollama-v2'>GitHub</a>""",
        parse_mode=ParseMode.HTML,
        disable_web_page_preview=True,
    )

@dp.callback_query(lambda query: query.data == "list_users")
@perms_admins
async def list_users_callback_handler(query: types.CallbackQuery):
    users = get_all_users_from_db()
    user_kb = InlineKeyboardBuilder()
    for user_id, user_name in users:
        user_kb.row(types.InlineKeyboardButton(text=f"{user_name} ({user_id})", callback_data=f"remove_{user_id}"))
    user_kb.row(types.InlineKeyboardButton(text="Cancel", callback_data="cancel_remove"))
    await query.message.answer("Select a user to remove:", reply_markup=user_kb.as_markup())

@dp.callback_query(lambda query: query.data.startswith("remove_"))
@perms_admins
async def remove_user_from_list_handler(query: types.CallbackQuery):
    user_id = int(query.data.split("_")[1])
    if remove_user_from_db(user_id):
        await query.answer(f"User {user_id} has been removed.")
        await query.message.edit_text(f"User {user_id} has been removed.")
    else:
        await query.answer(f"User {user_id} not found.")

@dp.callback_query(lambda query: query.data == "cancel_remove")
@perms_admins
async def cancel_remove_handler(query: types.CallbackQuery):
    await query.message.edit_text("User removal cancelled.")


@dp.callback_query(lambda query: query.data == "select_prompt") 
@perms_registered
async def select_prompt_callback_handler(query: types.CallbackQuery):
    prompts = get_system_prompts(user_id=query.from_user.id,is_global=True)
    prompt_kb = InlineKeyboardBuilder()
    for prompt in prompts:
        prompt_id, _, prompt_text, _, _ = prompt
        prompt_kb.row(
            types.InlineKeyboardButton(
                text=prompt_text, callback_data=f"prompt_{prompt_id}"
            )
        )
    await query.message.edit_text(
        f"{len(prompts)} system prompts available.", reply_markup=prompt_kb.as_markup()
    )



@dp.callback_query(lambda query: query.data == "select_local_prompt") 
@perms_registered
async def select_prompt_callback_handler(query: types.CallbackQuery):
    prompts = get_system_prompts(user_id=query.from_user.id,is_global=False)
    prompt_kb = InlineKeyboardBuilder()
    for prompt in prompts:
        prompt_id, _, prompt_text, _, _ = prompt
        prompt_kb.row(
            types.InlineKeyboardButton(
                text=prompt_text, callback_data=f"prompt_{prompt_id}"
            )
        )
    await query.message.edit_text(
        f"{len(prompts)} system prompts available.", reply_markup=prompt_kb.as_markup()
    )


@dp.callback_query(lambda query: query.data.startswith("prompt_"))
@perms_registered
async def prompt_callback_handler(query: types.CallbackQuery):
    global selected_prompt_id
    selected_prompt_id = int(query.data.split("prompt_")[1])
    await query.answer(f"Selected prompt ID: {selected_prompt_id}")

@dp.callback_query(lambda query: query.data == "delete_prompt")
@perms_admins
async def delete_prompt_callback_handler(query: types.CallbackQuery):
    prompts = get_system_prompts(user_id=query.from_user.id)
    delete_prompt_kb = InlineKeyboardBuilder()
    for prompt in prompts:
        prompt_id, _, prompt_text, _, _ = prompt
        delete_prompt_kb.row(
            types.InlineKeyboardButton(
                text=prompt_text, callback_data=f"delete_prompt_{prompt_id}"
            )
        )
    await query.message.edit_text(
        f"{len(prompts)} system prompts available for deletion.", reply_markup=delete_prompt_kb.as_markup()
    )

@dp.callback_query(lambda query: query.data == "delete_local_prompt")
@perms_registered
async def delete_prompt_callback_handler(query: types.CallbackQuery):
    prompts = get_system_prompts(user_id=query.from_user.id,is_global=False)
    delete_prompt_kb = InlineKeyboardBuilder()
    for prompt in prompts:
        prompt_id, _, prompt_text, _, _ = prompt
        delete_prompt_kb.row(
            types.InlineKeyboardButton(
                text=prompt_text, callback_data=f"delete_prompt_{prompt_id}"
            )
        )
    await query.message.edit_text(
        f"{len(prompts)} system prompts available for deletion.", reply_markup=delete_prompt_kb.as_markup()
    )

@dp.callback_query(lambda query: query.data.startswith("delete_prompt_"))
@perms_registered
async def delete_prompt_confirm_handler(query: types.CallbackQuery):
    prompt_id = int(query.data.split("delete_prompt_")[1])
    delete_system_prompt(prompt_id)
    await query.answer(f"Deleted prompt ID: {prompt_id}")

@dp.callback_query(lambda query: query.data == "delete_model")
@perms_admins
async def delete_model_callback_handler(query: types.CallbackQuery):
    models = await model_list()
    delete_model_kb = InlineKeyboardBuilder()
    for model in models:
        modelname = model["name"]
        delete_model_kb.row(
            types.InlineKeyboardButton(
                text=modelname, callback_data=f"delete_model_{modelname}"
            )
        )
    await query.message.edit_text(
        f"{len(models)} models available for deletion.", reply_markup=delete_model_kb.as_markup()
    )

@dp.callback_query(lambda query: query.data.startswith("delete_model_"))
@perms_admins
async def delete_model_confirm_handler(query: types.CallbackQuery):
    modelname = query.data.split("delete_model_")[1]
    response = await manage_model("delete", modelname)
    if response.status == 200:
        await query.answer(f"Deleted model: {modelname}")
    else:
        await query.answer(f"Failed to delete model: {modelname}")

@dp.message()
@perms_registered
async def handle_message(message: types.Message):
    await get_bot_info()
    
    if message.chat.type == "private":
        await ollama_request(message)
        return

    if await is_mentioned_in_group_or_supergroup(message):
        thread = await collect_message_thread(message)
        prompt = format_thread_for_prompt(thread)
        
        await ollama_request(message, prompt)

async def is_mentioned_in_group_or_supergroup(message: types.Message):
    if message.chat.type not in ["group", "supergroup"]:
        return False
    
    is_mentioned = (
        (message.text and message.text.startswith(mention)) or
        (message.caption and message.caption.startswith(mention))
    )
    
    is_reply_to_bot = (
        message.reply_to_message and 
        message.reply_to_message.from_user.id == bot.id
    )
    
    return is_mentioned or is_reply_to_bot

async def collect_message_thread(message: types.Message, thread=None):
    if thread is None:
        thread = []
    
    thread.insert(0, message)
    
    if message.reply_to_message:
        await collect_message_thread(message.reply_to_message, thread)
    
    return thread

def format_thread_for_prompt(thread):
    prompt = "Conversation thread:\n\n"
    for msg in thread:
        sender = "User" if msg.from_user.id != bot.id else "Bot"
        content = msg.text or msg.caption or "[No text content]"
        prompt += f"{sender}: {content}\n\n"
    
    prompt += "History:"
    return prompt

async def process_image(message):
    image_base64 = ""
    if message.content_type == "photo":
        image_buffer = io.BytesIO()
        await bot.download(message.photo[-1], destination=image_buffer)
        image_base64 = base64.b64encode(image_buffer.getvalue()).decode("utf-8")
    return image_base64

async def add_prompt_to_active_chats(message, prompt, image_base64, modelname, system_prompt=None):
    async with ACTIVE_CHATS_LOCK:
        messages = []
        
        if system_prompt:
            existing_system_messages = [msg for msg in ACTIVE_CHATS.get(message.from_user.id, {}).get('messages', []) if msg.get('role') == 'system']
            
            if not existing_system_messages:
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })
        
        if ACTIVE_CHATS.get(message.from_user.id):
            messages.extend([msg for msg in ACTIVE_CHATS[message.from_user.id].get("messages", []) if msg.get('role') != 'system'])
        
        messages.append({
            "role": "user",
            "content": prompt,
            "images": ([image_base64] if image_base64 else []),
        })
        
        ACTIVE_CHATS[message.from_user.id] = {
            "model": modelname,
            "messages": messages,
            "stream": True,
        }

async def handle_response(message, response_data, full_response):
    full_response_stripped = full_response.strip()
    if full_response_stripped == "":
        return
    if response_data.get("done"):
        text = full_response_stripped
        await send_response(message, text)
        async with ACTIVE_CHATS_LOCK:
            if ACTIVE_CHATS.get(message.from_user.id) is not None:
                ACTIVE_CHATS[message.from_user.id]["messages"].append(
                    {"role": "assistant", "content": full_response_stripped}
                )
        logging.info(
            f"[Response]: '{full_response_stripped}' for {message.from_user.first_name} {message.from_user.last_name}"
        )
        return True
    return False


async def send_response(message, text):
    if message.chat.id < 0 or message.chat.id == message.from_user.id:
        chunks = split_markdown_preserve(text, MAX_LEN)
        for chunk in chunks:
            await bot.send_message(chat_id=message.chat.id, text=chunk, parse_mode=ParseMode.MARKDOWN)
    else:
        if len(text) <= MAX_LEN:
            await bot.edit_message_text(
                chat_id=message.chat.id,
                message_id=message.message_id,
                text=text,
                parse_mode=ParseMode.MARKDOWN,
            )
        else:
            chunks = split_markdown_preserve(text, MAX_LEN)
            for chunk in chunks:
                await bot.send_message(chat_id=message.chat.id, text=chunk, parse_mode=ParseMode.MARKDOWN)


async def ollama_request(message: types.Message, prompt: str = None):
    try:
        full_response = ""
        await bot.send_chat_action(message.chat.id, "typing")
        image_base64 = await process_image(message)
        
        if prompt is None:
            prompt = message.text or message.caption

        system_prompt = None

        global_prompts = get_system_prompts(is_global=True)
        for sp in global_prompts:
            if sp[0] == selected_prompt_id:
                system_prompt = sp[2]
                break

        if system_prompt is None:
            private_prompts = get_system_prompts(user_id=message.from_user.id, is_global=False)
            for sp in private_prompts:
                if sp[0] == selected_prompt_id:
                    system_prompt = sp[2]
                    break

        if system_prompt is None:
            logging.warning(
                f"Selected prompt ID {selected_prompt_id} not found "
                f"(user {message.from_user.id})"
            )

        save_chat_message(message.from_user.id, "user", prompt)

        await add_prompt_to_active_chats(message, prompt, image_base64, modelname, system_prompt)
        
        logging.info(
            f"[OllamaAPI]: Processing '{prompt}' for {message.from_user.first_name} {message.from_user.last_name}"
        )
        
        payload = ACTIVE_CHATS.get(message.from_user.id)
        
        async for response_data in generate(payload, modelname, prompt):
            msg = response_data.get("message")
            if msg is None:
                continue
            chunk = msg.get("content", "")
            full_response += chunk

            if any([c in chunk for c in ".\n!?"]) or response_data.get("done"):
                if await handle_response(message, response_data, full_response):
                    save_chat_message(message.from_user.id, "assistant", full_response)
                    break

    except Exception as e:
        print(f"-----\n[OllamaAPI-ERR] CAUGHT FAULT!\n{traceback.format_exc()}\n-----")
        await bot.send_message(
            chat_id=message.chat.id,
            text=f"Something went wrong: {str(e)}",
            parse_mode=ParseMode.HTML,
        )

async def main():
    init_db()
    allowed_ids = load_allowed_ids_from_db()
    print(f"allowed_ids: {allowed_ids}")
    await bot.set_my_commands(commands)
    await dp.start_polling(bot, skip_update=True)

if __name__ == "__main__":
    asyncio.run(main())
