import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const certDir = path.resolve(rootDir, "certs")
const keyPath = process.env.VITE_HTTPS_KEY ?? path.join(certDir, "dev-key.pem")
const certPath = process.env.VITE_HTTPS_CERT ?? path.join(certDir, "dev-cert.pem")

const https =
  fs.existsSync(keyPath) && fs.existsSync(certPath)
    ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    : undefined

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    https,
  },
})
