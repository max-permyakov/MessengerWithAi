import { getToken } from "./auth";

export interface Conversation {
  id: string;
  type: "direct" | "group" | "ai";
  title: string;
  subtitle: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
  avatarUrl?: string | null;
}

export interface Message {
  id: string;
  author: string; // Username
  text: string;
  role?: "user" | "assistant" | "system";
  isAi?: boolean;
  modelName?: string | null;
  promptId?: number | null;
  time: string; // formatted
  isMine: boolean; // Проставляется на фронте
  createdAt: string; // ISO
  fileName?: string | null;
  fileSize?: number | null;
  fileUrl?: string | null;
  fileContentType?: string | null;
  hasFile?: boolean;
  delivered?: boolean;
  read?: boolean;
  // E2EE fields
  encryptedText?: string | null;
  encryptedKey?: string | null;
  encryptedKeyForSender?: string | null;
  isEncrypted?: boolean;
}

export interface User {
  id: string;
  username: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface ChatParticipant {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface ChatDetails {
  id: string;
  type: "direct" | "group" | "ai";
  name?: string | null;
  createdAt: string;
  participants: ChatParticipant[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "https://192.168.0.233:4001";

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Нет токена авторизации");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.message || body.error || "Ошибка запроса");
  }

  return body;
}

export function getConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>("/api/chats");
}

export interface AiPrompt {
  id: number;
  userId: string;
  prompt: string;
  isGlobal: boolean;
  timestamp?: string | null;
}

export interface AiModel {
  name: string;
  [key: string]: unknown;
}

export function getAiPrompts(isGlobal?: boolean): Promise<AiPrompt[]> {
  const suffix = typeof isGlobal === "boolean" ? `?isGlobal=${isGlobal}` : "";
  return apiFetch<AiPrompt[]>(`/api/ai/prompts${suffix}`);
}

export function createAiPrompt(prompt: string, isGlobal = false): Promise<AiPrompt> {
  return apiFetch<AiPrompt>("/api/ai/prompts", {
    method: "POST",
    body: JSON.stringify({ prompt, isGlobal }),
  });
}

export function deleteAiPrompt(promptId: number): Promise<void> {
  return apiFetch<void>(`/api/ai/prompts/${promptId}`, {
    method: "DELETE",
  });
}

export function getAiModels(): Promise<AiModel[]> {
  return apiFetch<AiModel[]>("/api/ai/models");
}

export function pullAiModel(name: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/ai/models/pull?name=${encodeURIComponent(name)}`, {
    method: "POST",
  });
}

export function deleteAiModel(name: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/ai/models/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export function resetAiSession(chatId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/ai/chat/${chatId}/session`, {
    method: "DELETE",
  });
}

export function clearAiHistory(chatId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/ai/chat/${chatId}/history`, {
    method: "DELETE",
  });
}

export function getMessages(chatId: string): Promise<Message[]> {
  return apiFetch<Message[]>(`/api/chats/${chatId}/messages`);
}

export function sendMessage(
  chatId: string,
  text: string,
  options?: { model?: string | null; promptId?: number | null }
): Promise<Message> {
  return apiFetch<Message>(`/api/chats/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      text,
      model: options?.model ?? null,
      promptId: options?.promptId ?? null,
    }),
  });
}

/**
 * Send encrypted message
 */
export function sendEncryptedMessage(
  chatId: string,
  encryptedText: string,
  encryptedKey: string,
  encryptedKeyForSender: string,
  options?: { model?: string | null; promptId?: number | null }
): Promise<Message> {
  return apiFetch<Message>(`/api/chats/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      text: "", // Empty text for encrypted messages
      encryptedText,
      encryptedKey,
      encryptedKeyForSender,
      isEncrypted: true,
      model: options?.model ?? null,
      promptId: options?.promptId ?? null,
    }),
  });
}

export function sendFileMessage(
  chatId: string,
  file: File,
  text?: string,
  onProgress?: (percent: number) => void,
  options?: { model?: string | null; promptId?: number | null }
): Promise<Message> {
  const token = getToken();
  if (!token) return Promise.reject(new Error("Нет токена авторизации"));

  const formData = new FormData();
  if (text) formData.append("text", text);
  if (options?.model) formData.append("model", options.model);
  if (options?.promptId != null) formData.append("promptId", String(options.promptId));
  formData.append("file", file);

  return new Promise<Message>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/chats/${chatId}/messages/file`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = event => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      };
    }

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body as Message);
        } else {
          reject(new Error(body.message || body.error || "Ошибка загрузки файла"));
        }
      } catch {
        reject(new Error("Ошибка загрузки файла"));
      }
    };

    xhr.onerror = () => reject(new Error("Ошибка загрузки файла"));
    xhr.send(formData);
  });
}

export function forwardMessage(chatId: string, messageId: string): Promise<Message> {
  return apiFetch<Message>(`/api/chats/${chatId}/messages/forward`, {
    method: "POST",
    body: JSON.stringify({ messageId }),
  });
}

export function deleteMessage(chatId: string, messageId: string): Promise<void> {
  return apiFetch<void>(`/api/chats/${chatId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

export async function createChat(name: string, isGroup: boolean, usernames: string[]): Promise<Conversation> {
  const token = getToken();
  if (!token) throw new Error("Нет токена авторизации");

  const response = await fetch(`${API_BASE_URL}/api/chats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, isGroup, usernames }),
  });

  const body = await response.json().catch(() => ({}));

  if (response.ok) return body as Conversation;

  if (response.status === 409 && body && typeof body.chatId === "string") {
    const chats = await getConversations();
    const existing = chats.find(c => c.id === body.chatId);
    if (existing) return existing;
    throw new Error(body.message || "Личный чат уже существует");
  }

  throw new Error(body.message || body.error || "Ошибка создания чата");
}

export function searchUsers(query: string): Promise<User[]> {
  return apiFetch<User[]>(`/api/users?search=${encodeURIComponent(query)}`);
}

export function getChatDetails(chatId: string): Promise<ChatDetails> {
  return apiFetch<ChatDetails>(`/api/chats/${chatId}`);
}

export function getMyProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/api/users/me");
}

export function updateMyProfile(payload: { displayName?: string | null; bio?: string | null }): Promise<UserProfile> {
  return apiFetch<UserProfile>("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getUserProfileById(id: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/api/users/${id}`);
}

/**
 * Get user's public key for E2EE
 */
export function getUserPublicKey(userId: string): Promise<{ publicKey: string | null }> {
  return apiFetch<{ publicKey: string | null }>(`/api/users/${userId}/publickey`);
}

export async function uploadMyAvatar(file: File): Promise<UserProfile> {
  const token = getToken();
  if (!token) throw new Error("Нет токена авторизации");

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((body && (body.message || body.error)) || "Ошибка загрузки аватарки");
  }

  return body as UserProfile;
}

export async function deleteMyAccount(): Promise<{ message: string }> {
  const token = getToken();
  if (!token) throw new Error("Нет токена авторизации");

  const response = await fetch(`${API_BASE_URL}/api/users/me`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((body && (body.message || body.error)) || "Ошибка удаления аккаунта");
  }

  return body as { message: string };
}

export async function downloadFile(fileUrl: string, filename?: string) {
  const token = getToken();
  if (!token) throw new Error("Нет токена авторизации");

  const response = await fetch(`${API_BASE_URL}${fileUrl}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body && (body.message || body.error)) || "Ошибка скачивания");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "file";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function openFileInNewTab(fileUrl: string) {
  const token = getToken();
  if (!token) throw new Error("Нет токена авторизации");

  const response = await fetch(`${API_BASE_URL}${fileUrl}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body && (body.message || body.error)) || "Ошибка открытия файла");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function getFileBlobUrl(fileUrl: string): Promise<string> {
  const token = getToken();
  if (!token) throw new Error("Нет токена авторизации");

  const response = await fetch(`${API_BASE_URL}${fileUrl}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error((body && (body.message || body.error)) || "Ошибка загрузки файла");
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
