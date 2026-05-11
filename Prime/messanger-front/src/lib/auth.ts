export interface AuthCredentials {
  username: string
  password: string
  displayName?: string  // Display name for registration
  publicKey?: string  // Optional public key for E2EE registration
  encryptedPrivateKey?: string  // Optional encrypted private key for E2EE registration
}

export interface AuthResponse {
  token: string
  username?: string
  userId?: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "https://192.168.0.233:4001"
const TOKEN_STORAGE_KEY = "messenger_token"
const USERNAME_STORAGE_KEY = "messenger_username"
const USER_ID_STORAGE_KEY = "messenger_user_id"

async function postAuth(endpoint: string, payload: AuthCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const body = (await response.json().catch(() => null)) as
    | AuthResponse
    | { message?: string; error?: string }
    | null

  if (!response.ok) {
    const errorMessage =
      (body && "message" in body && body.message) ||
      (body && "error" in body && body.error) ||
      "Ошибка авторизации"

    throw new Error(errorMessage)
  }

  if (!body || !("token" in body) || typeof body.token !== "string") {
    throw new Error("Сервер вернул некорректный ответ")
  }

  return body
}

export function registerUser(payload: AuthCredentials) {
  return postAuth("/api/auth/register", payload)
}

export function loginUser(payload: AuthCredentials) {
  return postAuth("/api/auth/login", payload)
}

export function setAuthSession(token: string, username?: string, userId?: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)

  if (username) {
    localStorage.setItem(USERNAME_STORAGE_KEY, username)
  }
  
  if (userId) {
    localStorage.setItem(USER_ID_STORAGE_KEY, userId)
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(USERNAME_STORAGE_KEY)
  localStorage.removeItem(USER_ID_STORAGE_KEY)
}

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function getUsername() {
  return localStorage.getItem(USERNAME_STORAGE_KEY)
}

export function getUserId() {
  return localStorage.getItem(USER_ID_STORAGE_KEY)
}
