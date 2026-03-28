import { BrowserRouter } from "react-router-dom"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"

const THEME_STORAGE_KEY = "prime_messenger_theme"

function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme
}

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "prime"
applyTheme(savedTheme)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
