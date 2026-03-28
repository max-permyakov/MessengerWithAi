import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearAuthSession, getToken } from "@/lib/auth";
import { deleteMyAccount, getMyProfile, updateMyProfile, uploadMyAvatar } from "@/lib/chatApi";

export function ProfilePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!getToken()) navigate("/login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const me = await getMyProfile();
        if (cancelled) return;
        setUsername(me.username);
        setAvatarUrl(me.avatarUrl ?? null);
        setDisplayName(me.displayName ?? "");
        setBio(me.bio ?? "");
      } catch (err: any) {
        toast.error(err.message || "Не удалось загрузить профиль");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePickAvatar = () => fileRef.current?.click();

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingAvatar(true);
      const updated = await uploadMyAvatar(file);
      setAvatarUrl(updated.avatarUrl ?? null);
      toast.success("Аватарка обновлена ✓");
    } catch (err: any) {
      toast.error(err.message || "Не удалось загрузить аватарку");
    } finally {
      setIsUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    try {
      setIsSaving(true);
      const updated = await updateMyProfile({
        displayName: displayName.trim() ? displayName.trim() : null,
        bio: bio.trim() ? bio.trim() : null,
      });
      setDisplayName(updated.displayName ?? "");
      setBio(updated.bio ?? "");
      toast.success("Профиль сохранён ✓");
    } catch (err: any) {
      toast.error(err.message || "Не удалось сохранить профиль");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    const ok = window.confirm("Точно удалить аккаунт? Это действие необратимо.");
    if (!ok) return;
    try {
      setIsDeleting(true);
      await deleteMyAccount();
      clearAuthSession();
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Не удалось удалить аккаунт");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <div className="mx-auto w-full max-w-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Профиль</p>
            <h1 className="text-2xl font-semibold">{isLoading ? "Загрузка..." : username}</h1>
          </div>
          <Button variant="outline" onClick={() => navigate("/chat")}>
            Назад
          </Button>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <div className="size-20 overflow-hidden rounded-2xl border border-border bg-muted">
              {avatarUrl ? (
                <img
                  src={("http://192.168.0.232:4000") + avatarUrl}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-muted-foreground">—</div>
              )}
            </div>
            <div className="flex-1">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <Button onClick={handlePickAvatar} disabled={isUploadingAvatar || isLoading}>
                {isUploadingAvatar ? "Загрузка..." : "Загрузить аватарку"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">Только изображения (png/jpg/webp/gif)</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="space-y-2">
            <Label>Имя</Label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Артём"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label>О себе</Label>
            <Input
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Короткое описание"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={isSaving || isLoading}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>

        <div className="mt-6 rounded-2xl border border-destructive/40 bg-card p-5">
          <p className="font-medium">Опасная зона</p>
          <p className="text-sm text-muted-foreground mt-1">
            Удаление аккаунта удалит ваши сообщения и участие в чатах.
          </p>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || isLoading}>
              {isDeleting ? "Удаление..." : "Удалить аккаунт"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                clearAuthSession();
                navigate("/login", { replace: true });
              }}
            >
              Выйти
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

