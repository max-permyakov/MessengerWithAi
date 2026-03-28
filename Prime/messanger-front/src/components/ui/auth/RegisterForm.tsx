import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { registerUser, setAuthSession } from "@/lib/auth"

const registerSchema = z
  .object({
    username: z.string().min(3, "Минимум 3 символа").max(30, "Максимум 30 символов"),
    password: z.string().min(6, "Минимум 6 символов"),
    confirmPassword: z.string().min(6, "Подтверди пароль"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterForm() {
  console.log("RegisterForm render")
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true)

    try {
      const data = await registerUser({
        username: values.username,
        password: values.password,
      })

      setAuthSession(data.token, data.username ?? values.username)
      toast.success("Регистрация успешна")
      navigate("/chat", { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка регистрации"
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
          <p className="auth-subtitle">Зарегестрируйтесь, чтобы быть в прайме.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="auth-form">
          <div className="auth-field">
            <label htmlFor="register-username">Имя пользователя</label>
            <input
              id="register-username"
              type="text"
              autoComplete="username"
              placeholder="new_user"
              className="auth-input"
              {...form.register("username")}
            />
            {form.formState.errors.username && (
              <p className="auth-error">{form.formState.errors.username.message}</p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="register-password">Пароль</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className="auth-input"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="auth-error">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="register-confirm-password">Повтори пароль</label>
            <input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className="auth-input"
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <p className="auth-error">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? "Создаем..." : "Зарегистрироваться"}
          </Button>
        </form>

        <p className="auth-footer">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="auth-link">
            Войти
          </Link>
        </p>
      </div>
    </section>
  )
}
