import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { loginUser, setAuthSession } from "@/lib/auth"

const loginSchema = z.object({
  username: z.string().min(3, "Минимум 3 символа").max(30, "Максимум 30 символов"),
  password: z.string().min(6, "Минимум 6 символов"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true)

    try {
      const data = await loginUser({
        username: values.username,
        password: values.password,
      })

      setAuthSession(data.token, data.username ?? values.username)
      toast.success("С возвращением!")
      navigate("/chat", { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка входа"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-bg" aria-hidden="true" />
      <div className="auth-glow auth-glow--left" aria-hidden="true" />
      <div className="auth-glow auth-glow--right" aria-hidden="true" />

      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-eyebrow">Prime</h1>
          <p className="auth-subtitle">Privite. Reliable. Instant. Messaging. Everywhere</p>
          <p className="auth-subtitle">Войдите, чтобы быть в Прайме</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="auth-form">
          <div className="auth-field">
            <label htmlFor="login-username">Имя пользователя</label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              placeholder="your_nickname"
              className="auth-input"
              {...form.register("username")}
            />
            {form.formState.errors.username && (
              <p className="auth-error">{form.formState.errors.username.message}</p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Пароль</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="auth-input"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="auth-error">{form.formState.errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? "Входим..." : "Войти"}
          </Button>
        </form>

        <p className="auth-footer">
          Нет аккаунта?{" "}
          <Link to="/register" className="auth-link">Создать</Link>
        </p>
      </div>
    </section>
  )
}
