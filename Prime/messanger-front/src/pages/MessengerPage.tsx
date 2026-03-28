import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { LogOut, Search, Send, User, Users, Plus, Paperclip, MoreVertical, Settings, Trash2, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import type { HubConnection } from "@microsoft/signalr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { clearAuthSession, getUsername, getToken } from "@/lib/auth";
import {
  createChat,
  createAiPrompt,
  deleteAiModel,
  deleteAiPrompt,
  clearAiHistory,
  downloadFile,
  forwardMessage,
  getChatDetails,
  getFileBlobUrl,
  getConversations,
  getAiModels,
  getAiPrompts,
  getMessages,
  getUserProfileById,
  deleteMessage as apiDeleteMessage,
  openFileInNewTab,
  pullAiModel,
  resetAiSession,
  sendFileMessage,
  sendMessage,
  searchUsers,
} from "@/lib/chatApi";
import type { ChatDetails, Conversation, Message, User as ApiUser, UserProfile } from "@/lib/chatApi";

type ConversationType = "direct" | "group";
type UiMessage = Message & { uploading?: boolean; progress?: number };

export function MessengerPage() {
  const navigate = useNavigate();
  const username = getUsername() ?? "Вы";

  // ==================== Состояния ====================
  const [filter, setFilter] = useState<"all" | "direct" | "group" | "ai">("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, UiMessage[]>>({});
  const [selectedId, setSelectedId] = useState("");
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);
  const [isForwarding, setIsForwarding] = useState(false);
  const chatIdRef = useRef<string>("");
  const hubRef = useRef<HubConnection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insecureNotifWarnedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const previewUrlsRef = useRef<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<{ url: string; kind: "image" | "video" } | null>(null);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [chatInfo, setChatInfo] = useState<ChatDetails | null>(null);
  const [isLoadingChatInfo, setIsLoadingChatInfo] = useState(false);
  const [participantProfile, setParticipantProfile] = useState<UserProfile | null>(null);
  const [isParticipantOpen, setIsParticipantOpen] = useState(false);
  const [isLoadingParticipant, setIsLoadingParticipant] = useState(false);
  const [isAiManagerOpen, setIsAiManagerOpen] = useState(false);
  const [aiPrompts, setAiPrompts] = useState<{ id: number; prompt: string; isGlobal: boolean }[]>([]);
  const [aiModels, setAiModels] = useState<{ name: string }[]>([]);
  const [selectedAiModel, setSelectedAiModel] = useState<string>("");
  const [selectedAiPromptId, setSelectedAiPromptId] = useState<string>("");
  const [newPrompt, setNewPrompt] = useState("");
  const [isGlobalPrompt, setIsGlobalPrompt] = useState(false);
  const [modelToPull, setModelToPull] = useState("");

  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [theme, setTheme] = useState<string>(() => document.documentElement.dataset.theme || "prime");

  // Форма создания чата
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newType, setNewType] = useState<ConversationType>("direct");
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<ApiUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<ApiUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const activeChat = conversations.find(c => c.id === selectedId);
  const isAiChat = activeChat?.type === "ai";

  const messages = selectedId ? messagesByConversation[selectedId] ?? [] : [];

  // ==================== Эффекты ====================
  useEffect(() => {
    chatIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    if ("Notification" in window) {
      if (!window.isSecureContext) {
        if (!insecureNotifWarnedRef.current) {
          insecureNotifWarnedRef.current = true;
          toast.info("Системные уведомления работают только на HTTPS или localhost");
        }
      } else if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => undefined);
      }
    }
    const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
    const connection = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/chat`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("ReceiveMessage", (message: Message) => {
      const chatId = chatIdRef.current;
      if (!chatId) return;
      setMessagesByConversation(prev => {
        const current = prev[chatId] ?? [];
        if (current.some(m => m.id === message.id)) return prev;
        return { ...prev, [chatId]: [...current, message] };
      });
      if (!message.isMine) {
        const snippet = message.text?.trim() || (message.fileName ? `Файл: ${message.fileName}` : "Новое сообщение");
        toast.info(`${message.author}: ${snippet}`);
        if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
          try {
            new Notification("Новое сообщение", {
              body: `${message.author}: ${snippet}`,
              icon: "/vite.svg",
              badge: "/vite.svg",
            });
          } catch {
            // ignore notification errors
          }
        }
      }
    });

    // Обработка уведомлений о новых сообщениях
    connection.on("ReceiveNewMessageNotification", (chatId: string, notification: { messageId: string; chatId: string; author: string; text: string; createdAt: string; isAi: boolean }) => {
      // Обновляем счётчик непрочитанных в списке чатов
      setConversations(prev => prev.map(c => {
        if (c.id === chatId) {
          return { ...c, unreadCount: (c.unreadCount || 0) + 1 };
        }
        return c;
      }));

      // Показываем уведомление, только если это не текущий активный чат или окно скрыто
      const isCurrentChat = chatId === chatIdRef.current;
      if (!isCurrentChat || document.hidden) {
        const snippet = notification.text?.trim() || "Новое сообщение";
        
        // Воспроизводим звук уведомления
        playNotificationSound();
        
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(`Новое сообщение от ${notification.author}`, {
              body: snippet,
              icon: "/vite.svg",
              badge: "/vite.svg",
              tag: chatId,
              requireInteraction: false,
            });
          } catch {
            // ignore notification errors
          }
        }
        
        // Показываем toast уведомление
        toast.info(`${notification.author}: ${snippet}`);
      }
    });

    // Обработка обновления счётчика непрочитанных
    connection.on("UnreadCountUpdated", (chatId: string, unreadCount: number) => {
      setConversations(prev => prev.map(c => {
        if (c.id === chatId) {
          return { ...c, unreadCount };
        }
        return c;
      }));
    });

    hubRef.current = connection;
    connection.start().catch(() => undefined);
    return () => {
      connection.stop().catch(() => undefined);
      hubRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedId || !hubRef.current) return;
    hubRef.current.invoke("JoinChat", selectedId).catch(() => undefined);
  }, [selectedId]);

  useEffect(() => {
    if (!getToken()) navigate("/login", { replace: true });
  }, [navigate]);

  // Загрузка чатов
  const loadChats = async () => {
    setIsLoadingChats(true);
    try {
      const data = await getConversations();
      setConversations(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    } catch {
      toast.error("Не удалось загрузить чаты");
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => { loadChats(); }, []);

  // Поиск пользователей для создания чата
  useEffect(() => {
    const term = userSearch.trim();
    if (term.length < 2) {
      setUserResults([]);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const data = await searchUsers(term);
        if (!cancelled) setUserResults(data);
      } catch {
        if (!cancelled) setUserResults([]);
      } finally {
        if (!cancelled) setIsSearchingUsers(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [userSearch]);

  // При переключении типа ограничиваем выбор одного пользователя для личного чата
  useEffect(() => {
    if (newType === "direct" && selectedUsers.length > 1) {
      setSelectedUsers(selectedUsers.slice(0, 1));
    }
  }, [newType, selectedUsers]);

  // Сброс формы при закрытии (если когда-нибудь будет модалка)
  useEffect(() => {
    if (!isCreateOpen) {
      setNewName("");
      setNewType("direct");
      setUserSearch("");
      setUserResults([]);
      setSelectedUsers([]);
      setIsCreating(false);
    }
  }, [isCreateOpen]);

  // Загрузка сообщений
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const load = async (showLoading: boolean) => {
      if (showLoading) setIsLoadingMessages(true);
      try {
        const msgs = await getMessages(selectedId);
        const withMine = msgs.map(m => ({ ...m, isMine: m.author === username }));
        if (!cancelled) setMessagesByConversation(prev => ({ ...prev, [selectedId]: withMine }));
      } catch {
        if (showLoading) toast.error("Не удалось загрузить сообщения");
      } finally {
        if (showLoading) setIsLoadingMessages(false);
      }
    };
    load(true);
    const interval = setInterval(() => load(false), 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedId, username]);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(() => {
    let cancelled = false;
    const loadPreviews = async () => {
      const candidates = messages.filter(m => isPreviewable(m) && !previewUrls[m.id]);
      if (candidates.length === 0) return;

      for (const msg of candidates) {
        try {
          const url = await getFileBlobUrl(msg.fileUrl!);
          if (!cancelled) {
            setPreviewUrls(prev => ({ ...prev, [msg.id]: url }));
          } else {
            URL.revokeObjectURL(url);
          }
        } catch {
          // ignore preview errors
        }
      }
    };

    loadPreviews();
    return () => {
      cancelled = true;
    };
  }, [messages, previewUrls]);

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const filteredChats = useMemo(() => {
    return conversations.filter(c => {
      const typeOk = filter === "all" || c.type === filter;
      const searchOk = c.title.toLowerCase().includes(query.toLowerCase()) ||
                       c.subtitle.toLowerCase().includes(query.toLowerCase());
      return typeOk && searchOk;
    });
  }, [conversations, filter, query]);

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} Б`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} КБ`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} МБ`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} ГБ`;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const maxPreviewSize = 50 * 1024 * 1024*1024;
  const isPreviewable = (msg: UiMessage) => {
    if (!msg.fileUrl || !msg.fileContentType) return false;
    if (msg.uploading) return false;
    if (msg.fileSize && msg.fileSize > maxPreviewSize) return false;
    return msg.fileContentType.startsWith("image/") || msg.fileContentType.startsWith("video/");
  };

  const visibleResults = useMemo(() => {
    const selectedIds = new Set(selectedUsers.map(u => u.id));
    return userResults.filter(u => !selectedIds.has(u.id));
  }, [userResults, selectedUsers]);

  const handleSelectUser = (user: ApiUser) => {
    if (newType === "direct") {
      setSelectedUsers([user]);
    } else {
      setSelectedUsers(prev => (prev.some(u => u.id === user.id) ? prev : [...prev, user]));
    }
    setUserSearch("");
    setUserResults([]);
  };

  const handleRemoveUser = (id: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleSelectChat = (id: string) => {
    setSelectedId(id);
    setIsMobileChatOpen(true);
    // Сбрасываем счётчик непрочитанных для выбранного чата
    setConversations(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, unreadCount: 0 };
      }
      return c;
    }));
  };

  // Воспроизведение звука уведомления
  const playNotificationSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {
      // ignore audio errors
    }
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
    document.documentElement.dataset.theme = value;
    localStorage.setItem("prime_messenger_theme", value);
  };

  const loadAiManager = async () => {
    try {
      const [prompts, models] = await Promise.all([getAiPrompts(), getAiModels()]);
      setAiPrompts(prompts.map(p => ({ id: p.id, prompt: p.prompt, isGlobal: p.isGlobal })));
      setAiModels(models.map(m => ({ name: String(m.name ?? "") })).filter(m => m.name));
      if (!selectedAiModel && models.length > 0) {
        const first = String(models[0]?.name ?? "");
        if (first) setSelectedAiModel(first);
      }
    } catch (err: any) {
      toast.error(err.message || "Не удалось загрузить настройки AI");
    }
  };

  useEffect(() => {
    if (!isAiChat) return;
    if (aiPrompts.length === 0 || aiModels.length === 0) {
      loadAiManager();
    }
  }, [isAiChat]);

  const handleOpenChatInfo = async () => {
    if (!selectedId) return;
    setIsChatInfoOpen(true);
    setIsLoadingChatInfo(true);
    try {
      const info = await getChatDetails(selectedId);
      setChatInfo(info);
    } catch (err: any) {
      toast.error(err.message || "Не удалось загрузить информацию");
      setChatInfo(null);
    } finally {
      setIsLoadingChatInfo(false);
    }
  };

  const openParticipant = async (p: { id: string; username: string }) => {
    setIsParticipantOpen(true);
    setIsLoadingParticipant(true);
    setParticipantProfile(null);
    try {
      const profile = await getUserProfileById(p.id);
      setParticipantProfile(profile);
    } catch {
      // Fallback: minimal info
      setParticipantProfile({ id: p.id, username: p.username });
    } finally {
      setIsLoadingParticipant(false);
    }
  };

  const handleWriteToUser = async (usernameToWrite: string) => {
    try {
      // Если личный чат уже есть в списке — просто переключаемся на него
      const existing = conversations.find(
        c => c.type === "direct" && c.title === usernameToWrite
      );
      if (existing) {
        setSelectedId(existing.id);
        setIsMobileChatOpen(true);
        setIsParticipantOpen(false);
        setIsChatInfoOpen(false);
        return;
      }

      const conv = await createChat("", false, [usernameToWrite]);
      setSelectedId(conv.id);
      setIsMobileChatOpen(true);
      setIsParticipantOpen(false);
      setIsChatInfoOpen(false);
      await loadChats();
    } catch (err: any) {
      toast.error(err.message || "Не удалось открыть личный чат");
    }
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedId) return;
    let tempId: string | null = null;

    try {
      const caption = draft.trim();
      tempId = `upload-${Date.now()}`;
      const tempMessage: UiMessage = {
        id: tempId,
        author: username,
        text: caption,
        time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
        isMine: true,
        createdAt: new Date().toISOString(),
        fileName: file.name,
        fileSize: file.size,
        fileContentType: file.type,
        hasFile: true,
        uploading: true,
        progress: 0,
      };

      setMessagesByConversation(p => ({
        ...p,
        [selectedId]: [...(p[selectedId] ?? []), tempMessage],
      }));

      if (caption) setDraft("");

      const newMsg = await sendFileMessage(
        selectedId,
        file,
        caption || undefined,
        percent => {
          setMessagesByConversation(p => ({
            ...p,
            [selectedId]: (p[selectedId] ?? []).map(m =>
              m.id === tempId ? { ...m, progress: percent } : m
            ),
          }));
        },
        isAiChat
          ? {
              model: selectedAiModel || null,
              promptId: selectedAiPromptId ? Number(selectedAiPromptId) : null,
            }
          : undefined
      );

      newMsg.isMine = true;
      setMessagesByConversation(p => ({
        ...p,
        [selectedId]: (p[selectedId] ?? []).map(m => (m.id === tempId ? newMsg : m)),
      }));
      await loadChats();
    } catch (err: any) {
      if (tempId) {
        setMessagesByConversation(p => ({
          ...p,
          [selectedId]: (p[selectedId] ?? []).filter(m => m.id !== tempId),
        }));
      }
      toast.error(err.message || "Ошибка отправки файла");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpenFile = async (msg: Message) => {
    if (!msg.fileUrl) return;
    try {
      await openFileInNewTab(msg.fileUrl);
    } catch (err: any) {
      toast.error(err.message || "Не удалось открыть файл");
    }
  };

  const handleDownload = async (msg: Message) => {
    if (!msg.fileUrl) return;
    try {
      await downloadFile(msg.fileUrl, msg.fileName ?? "file");
    } catch (err: any) {
      toast.error(err.message || "Не удалось сохранить файл");
    }
  };

  const handleOpenForward = (msg: Message) => {
    setForwardMessageId(msg.id);
    setIsForwardOpen(true);
    setOpenMenuId(null);
  };

  const handleForwardToChat = async (chatId: string) => {
    if (!forwardMessageId) return;
    setIsForwarding(true);
    try {
      const newMsg = await forwardMessage(chatId, forwardMessageId);
      if (chatId === selectedId) {
        setMessagesByConversation(p => ({ ...p, [chatId]: [...(p[chatId] ?? []), newMsg] }));
      }
      setIsForwardOpen(false);
      setForwardMessageId(null);
      toast.success("Файл переслан");
    } catch (err: any) {
      toast.error(err.message || "Не удалось переслать файл");
    } finally {
      setIsForwarding(false);
    }
  };

  const handleDeleteMessage = async (msg: Message) => {
    if (!selectedId) return;
    const ok = window.confirm("Удалить это сообщение?");
    if (!ok) return;
    try {
      await apiDeleteMessage(selectedId, msg.id);
      setMessagesByConversation(p => ({
        ...p,
        [selectedId]: (p[selectedId] ?? []).filter(m => m.id !== msg.id),
      }));
    } catch (err: any) {
      toast.error(err.message || "Не удалось удалить сообщение");
    } finally {
      setOpenMenuId(null);
    }
  };

  // ==================== Действия ====================
  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId) return;
    setDraft("");
    try {
      const newMsg = await sendMessage(
        selectedId,
        text,
        isAiChat
          ? {
              model: selectedAiModel || null,
              promptId: selectedAiPromptId ? Number(selectedAiPromptId) : null,
            }
          : undefined
      );
      newMsg.isMine = true;
      setMessagesByConversation(p => ({ ...p, [selectedId]: [...(p[selectedId] ?? []), newMsg] }));
      await loadChats();
    } catch {
      setDraft(text);
      toast.error("Ошибка отправки");
    }
  };

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const isGroup = newType === "group";
      const usernames = selectedUsers.map(u => u.username);

      if (isGroup && !newName.trim()) throw new Error("Название группы обязательно");
      if (!isGroup && usernames.length !== 1) throw new Error("Выберите одного пользователя");

      const newConv = await createChat(isGroup ? newName.trim() : "", isGroup, usernames);

      setConversations(prev => [...prev, newConv]);
      setSelectedId(newConv.id);
      setIsCreateOpen(false);

      setNewName("");
      setNewType("direct");
      setUserSearch("");
      setUserResults([]);
      setSelectedUsers([]);

      toast.success(isGroup ? "Группа создана ✓" : "Личный чат создан ✓");
    } catch (err: any) {
      toast.error(err.message || "Ошибка создания");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-[100svh] w-full flex-col bg-background text-foreground overflow-hidden md:grid md:h-screen md:grid-cols-[minmax(280px,1fr)_2fr]">
      {/* ==================== ЛЕВАЯ ПАНЕЛЬ ==================== */}
      <aside
        className={cn(
          "border-r border-border flex flex-col bg-card w-full md:w-auto",
          isMobileChatOpen ? "hidden md:flex" : "flex"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <p className=" uppercase tracking-[0.12em] text-muted-foreground">PRIME</p>
            <p className="font-semibold text-lg">{username}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              title="Профиль"
            >
              <Settings className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                clearAuthSession();
                navigate("/login");
              }}
              title="Выйти"
            >
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>

        {/* Поиск */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Поиск чатов..."
              className="pl-10 bg-input border-border"
            />
          </div>
        </div>

        {/* Фильтры */}
        <div className="flex flex-col gap-2 px-4 pb-3">
          <div className="flex gap-1">
            {["all", "direct", "group", "ai"].map((f: any) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 py-2 text-sm rounded-lg transition",
                  filter === f ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                )}
              >
                {f === "all" ? "Все" : f === "direct" ? "Личные" : f === "group" ? "Группы" : "AI"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Тема:</span>
            <div className="flex gap-1">
              {[
                { id: "prime", label: "Фиолетовая" },
                { id: "light", label: "Светлая" },
                { id: "blue", label: "Синяя" },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleThemeChange(t.id)}
                  className={cn(
                    "px-2 py-1 rounded-full border text-[11px]",
                    theme === t.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-muted/60"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Кнопка Новый чат */}
        <div className="px-4 pb-4">
          <Button className="w-full bg-primary hover:bg-primary-hover" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 size-4" /> Новый чат / группа
          </Button>
        </div>

        {/* Список чатов */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {isLoadingChats ? (
            <div className="text-center py-10 text-muted-foreground">Загрузка...</div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Чатов пока нет</div>
          ) : (
            filteredChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={cn(
                  "w-full text-left p-3 rounded-2xl transition flex gap-3 items-center",
                  selectedId === chat.id ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted"
                )}
              >
                <div className="shrink-0">
                  {chat.avatarUrl ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}${chat.avatarUrl}`}
                      alt={chat.title}
                      className="size-8 rounded-full object-cover border border-border"
                    />
                  ) : chat.type === "group" ? (
                    <Users className="size-5 text-primary" />
                  ) : chat.type === "ai" ? (
                    <Bot className="size-5 text-cyan-400" />
                  ) : (
                    <User className="size-5 text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{chat.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{chat.subtitle}</p>
                </div>
                {chat.unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full mt-0.5">
                    {chat.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ==================== ПРАВАЯ ПАНЕЛЬ (чат) ==================== */}
      <main
        className={cn(
          "min-w-0 flex-1 flex min-h-0 flex-col bg-background",
          isMobileChatOpen ? "flex" : "hidden md:flex"
        )}
      >
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center flex-col text-muted-foreground">
            <Users className="size-16 opacity-30 mb-4" />
            <p className="text-xl">Выберите чат слева</p>
          </div>
        ) : (
          <>
            {/* Заголовок чата */}
            <header
              className="h-14 border-b border-border px-6 flex items-center gap-3 bg-card cursor-pointer"
              onClick={handleOpenChatInfo}
            >
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={e => {
                  e.stopPropagation();
                  setIsMobileChatOpen(false);
                }}
              >
                ←
              </Button>
              <div className="flex items-center gap-3">
                {activeChat.avatarUrl ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}${activeChat.avatarUrl}`}
                    alt={activeChat.title}
                    className="size-8 rounded-full object-cover border border-border"
                    onClick={e => e.stopPropagation()}
                  />
                ) : activeChat.type === "group" ? (
                  <Users className="size-5 text-primary" />
                ) : activeChat.type === "ai" ? (
                  <Bot className="size-5 text-cyan-400" />
                ) : (
                  <User className="size-5 text-emerald-400" />
                )}
                <div className="text-left">
                  <p className="font-semibold hover:underline">{activeChat.title}</p>
                  <p className="text-xs text-muted-foreground hover:underline">{activeChat.subtitle}</p>
                </div>
                {isAiChat && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async e => {
                      e.stopPropagation();
                      await loadAiManager();
                      setIsAiManagerOpen(true);
                    }}
                  >
                    AI
                  </Button>
                )}
              </div>
            </header>

            {/* Сообщения */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-24 md:pb-6 space-y-6 bg-[#0a0012]/50">
              {isLoadingMessages ? (
                <div className="text-center py-12">Загрузка сообщений...</div>
              ) : (
                messages.map(msg => {
                  const hasFile = msg.hasFile || !!msg.fileUrl;
                  const previewUrl = previewUrls[msg.id];
                  const isImage = msg.fileContentType?.startsWith("image/");
                  const isVideo = msg.fileContentType?.startsWith("video/");
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "max-w-[75%] rounded-3xl px-5 py-3",
                        msg.isMine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs opacity-70">{msg.author}</p>
                          {msg.text && <p className="text-[15px] leading-relaxed">{msg.text}</p>}

                          {hasFile && (
                            <button
                              type="button"
                              onClick={() => !msg.uploading && handleOpenFile(msg)}
                              className={cn(
                                "mt-2 w-full rounded-2xl border border-border/60 px-4 py-3 text-left",
                                msg.isMine ? "bg-primary/20" : "bg-background/60",
                                msg.uploading ? "opacity-80 cursor-default" : "hover:bg-muted/40"
                              )}
                            >
                              {previewUrl && isImage && (
                                <img
                                  src={previewUrl}
                                  alt={msg.fileName ?? "preview"}
                                  className="mb-2 w-full rounded-xl object-cover max-h-72 cursor-zoom-in"
                                  onClick={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setLightbox({ url: previewUrl, kind: "image" });
                                  }}
                                />
                              )}
                              {previewUrl && isVideo && (
                                <div className="mb-2">
                                  <video
                                    src={previewUrl}
                                    controls
                                    className="w-full rounded-xl max-h-72"
                                    onClick={e => e.stopPropagation()}
                                  />
                                  <button
                                    type="button"
                                    className="mt-2 text-xs underline opacity-80 hover:opacity-100"
                                    onClick={e => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setLightbox({ url: previewUrl, kind: "video" });
                                    }}
                                  >
                                    Открыть крупно
                                  </button>
                                </div>
                              )}
                              <p className="font-medium truncate">{msg.fileName ?? "Файл"}</p>
                              <p className="text-xs opacity-70">
                                {formatFileSize(msg.fileSize)} · {formatDate(msg.createdAt)}
                              </p>
                              {msg.uploading && (
                                <div className="mt-2">
                                  <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                                    <div
                                      className="h-full bg-primary-foreground/80"
                                      style={{ width: `${msg.progress ?? 0}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] opacity-70 mt-1">
                                    Загрузка {msg.progress ?? 0}%
                                  </p>
                                </div>
                              )}
                            </button>
                          )}

                          <p className="text-right text-[10px] opacity-60 mt-1">
                            {msg.time}
                            {msg.isMine && (msg.read || msg.delivered) && (
                              <span className="ml-1">
                                {msg.read ? "✓✓" : "✓"}
                              </span>
                            )}
                          </p>
                        </div>

                        {!msg.uploading && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(openMenuId === msg.id ? null : msg.id)}
                              className={cn(
                                "rounded-full p-1 transition",
                                msg.isMine ? "hover:bg-primary/30" : "hover:bg-muted/80"
                              )}
                            >
                              <MoreVertical className="size-4" />
                            </button>
                            {openMenuId === msg.id && (
                              <div
                                className={cn(
                                  "absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg"
                                )}
                              >
                                {hasFile && (
                                  <button
                                    type="button"
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleDownload(msg);
                                    }}
                                  >
                                    Сохранить как
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => handleOpenForward(msg)}
                                >
                                  Переслать
                                </button>
                                {msg.isMine && (
                                  <button
                                    type="button"
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted text-destructive flex items-center gap-2"
                                    onClick={() => handleDeleteMessage(msg)}
                                  >
                                    <Trash2 className="size-3" /> Удалить
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Поле ввода */}
            <form onSubmit={handleSend} className="sticky bottom-0 p-4 border-t border-border bg-card">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              {isAiChat && (
                <div className="mb-3 grid gap-2 md:grid-cols-2">
                  <label className="text-xs text-muted-foreground">
                    Модель
                    <select
                      className="mt-1 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
                      value={selectedAiModel}
                      onChange={e => setSelectedAiModel(e.target.value)}
                    >
                      <option value="">По умолчанию</option>
                      {aiModels.map(m => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Промпт
                    <select
                      className="mt-1 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
                      value={selectedAiPromptId}
                      onChange={e => setSelectedAiPromptId(e.target.value)}
                    >
                      <option value="">Без промпта</option>
                      {aiPrompts.map(p => (
                        <option key={p.id} value={String(p.id)}>
                          {p.isGlobal ? "[global] " : ""}{p.prompt}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <div className="flex gap-2 bg-input rounded-3xl p-1.5 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={handlePickFile}
                  disabled={!selectedId}
                >
                  <Paperclip className="size-5" />
                </Button>
                <Input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Напишите сообщение..."
                  className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-base"
                />
                <Button type="submit" disabled={!draft.trim()} className="bg-primary hover:bg-primary-hover px-6">
                  <Send className="size-5" />
                </Button>
              </div>
            </form>
          </>
        )}
      </main>

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !isCreating && setIsCreateOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-4 text-foreground shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Новый чат / группа</p>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
              >
                ×
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setNewType("direct")}
                className={cn(
                  "flex-1 rounded-xl py-2 text-sm transition",
                  newType === "direct" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                )}
                disabled={isCreating}
              >
                Личный
              </button>
              <button
                type="button"
                onClick={() => setNewType("group")}
                className={cn(
                  "flex-1 rounded-xl py-2 text-sm transition",
                  newType === "group" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                )}
                disabled={isCreating}
              >
                Группа
              </button>
            </div>

            {newType === "group" && (
              <div className="mt-4 space-y-2">
                <Label>Название группы</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Например: бездельники"
                  disabled={isCreating}
                />
              </div>
            )}

            <div className="mt-4 space-y-2">
              <Label>Пользователи</Label>
              <Input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Поиск по username..."
                disabled={isCreating}
              />

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleRemoveUser(u.id)}
                      className="rounded-full bg-muted px-3 py-1 text-sm hover:bg-muted/80"
                      disabled={isCreating}
                      title="Убрать"
                    >
                      {u.username} ×
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-2 max-h-60 overflow-y-auto space-y-2">
                {isSearchingUsers ? (
                  <p className="text-sm text-muted-foreground">Поиск...</p>
                ) : visibleResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {userSearch.trim().length < 2 ? "Введите минимум 2 символа" : "Ничего не найдено"}
                  </p>
                ) : (
                  visibleResults.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full rounded-xl border border-border px-3 py-2 text-left hover:bg-muted disabled:opacity-60"
                      onClick={() => handleSelectUser(u)}
                      disabled={isCreating}
                    >
                      <p className="font-medium">{u.username}</p>
                      <p className="text-xs text-muted-foreground">id: {u.id}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                Отмена
              </Button>
              <Button type="button" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Создание..." : "Создать"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isForwardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !isForwarding && setIsForwardOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-4 text-foreground shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Переслать файл</p>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsForwardOpen(false)}
                disabled={isForwarding}
              >
                ×
              </button>
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет доступных чатов</p>
              ) : (
                conversations.map(chat => (
                  <button
                    key={chat.id}
                    type="button"
                    className="w-full rounded-xl border border-border px-3 py-2 text-left hover:bg-muted disabled:opacity-60"
                    onClick={() => handleForwardToChat(chat.id)}
                    disabled={isForwarding}
                  >
                    <p className="font-medium">{chat.title}</p>
                    <p className="text-xs text-muted-foreground">{chat.subtitle}</p>
                  </button>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsForwardOpen(false)}
                disabled={isForwarding}
              >
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}

      {isChatInfoOpen && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsChatInfoOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-4 text-foreground shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Информация</p>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsChatInfoOpen(false)}
              >
                ×
              </button>
            </div>

            {isLoadingChatInfo ? (
              <div className="mt-4 text-sm text-muted-foreground">Загрузка...</div>
            ) : !chatInfo ? (
              <div className="mt-4 text-sm text-muted-foreground">Нет данных</div>
            ) : (
              <>
                <div className="mt-4 space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Тип:</span>{" "}
                    {chatInfo.type === "group" ? "Группа" : "Личный чат"}
                  </p>
                  {chatInfo.type === "group" && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Название:</span>{" "}
                      {chatInfo.name || "—"}
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium">
                    {chatInfo.type === "group" ? "Участники" : "Собеседник"}
                  </p>
                  <div className="mt-2 max-h-72 overflow-y-auto space-y-2">
                    {chatInfo.participants
                      .filter(p => p.username !== username)
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full rounded-xl border border-border px-3 py-2 text-left hover:bg-muted"
                          onClick={() => openParticipant({ id: p.id, username: p.username })}
                        >
                          <p className="font-medium">
                            {p.displayName ? `${p.displayName} (@${p.username})` : p.username}
                          </p>
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isParticipantOpen && (
        <div
          className="fixed inset-0 z-[56] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setIsParticipantOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-4 text-foreground shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Пользователь</p>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsParticipantOpen(false)}
              >
                ×
              </button>
            </div>

            {isLoadingParticipant ? (
              <div className="mt-4 text-sm text-muted-foreground">Загрузка...</div>
            ) : !participantProfile ? (
              <div className="mt-4 text-sm text-muted-foreground">Нет данных</div>
            ) : (
              <>
                <div className="mt-4">
                  <p className="font-medium">
                    {participantProfile.displayName
                      ? `${participantProfile.displayName} (@${participantProfile.username})`
                      : participantProfile.username}
                  </p>
                  {participantProfile.bio && (
                    <p className="mt-2 text-sm text-muted-foreground">{participantProfile.bio}</p>
                  )}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() => handleWriteToUser(participantProfile.username)}
                  >
                    Написать
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="w-full max-w-4xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                type="button"
                className="rounded-xl border border-white/20 bg-black/40 px-3 py-1 text-sm text-white hover:bg-black/60"
                onClick={() => setLightbox(null)}
              >
                Закрыть
              </button>
            </div>
            {lightbox.kind === "image" ? (
              <img src={lightbox.url} alt="preview" className="w-full max-h-[80svh] object-contain rounded-2xl" />
            ) : (
              <video src={lightbox.url} controls autoPlay className="w-full max-h-[80svh] rounded-2xl bg-black" />
            )}
          </div>
        </div>
      )}

      {isAiManagerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={() => setIsAiManagerOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-4 text-foreground shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">AI настройки</p>
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setIsAiManagerOpen(false)}>×</button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-medium">Промпты</p>
                <div className="mt-2 flex gap-2">
                  <Input value={newPrompt} onChange={e => setNewPrompt(e.target.value)} placeholder="Новый промпт..." />
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!newPrompt.trim()) return;
                      await createAiPrompt(newPrompt.trim(), isGlobalPrompt);
                      setNewPrompt("");
                      await loadAiManager();
                    }}
                  >
                    Добавить
                  </Button>
                </div>
                <label className="mt-2 block text-xs text-muted-foreground">
                  <input type="checkbox" checked={isGlobalPrompt} onChange={e => setIsGlobalPrompt(e.target.checked)} /> Глобальный
                </label>
                <div className="mt-3 max-h-56 overflow-y-auto space-y-2">
                  {aiPrompts.map(p => (
                    <div key={p.id} className="rounded-xl border border-border px-3 py-2">
                      <p className="text-sm">{p.prompt}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{p.isGlobal ? "global" : "private"} #{p.id}</span>
                        <button
                          type="button"
                          className="text-destructive"
                          onClick={async () => {
                            await deleteAiPrompt(p.id);
                            await loadAiManager();
                          }}
                        >
                          удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium">Модели Ollama</p>
                <div className="mt-2 flex gap-2">
                  <Input value={modelToPull} onChange={e => setModelToPull(e.target.value)} placeholder="Например qwen3:latest" />
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!modelToPull.trim()) return;
                      await pullAiModel(modelToPull.trim());
                      setModelToPull("");
                      await loadAiManager();
                    }}
                  >
                    Pull
                  </Button>
                </div>
                <div className="mt-3 max-h-56 overflow-y-auto space-y-2">
                  {aiModels.map(m => (
                    <div key={m.name} className="rounded-xl border border-border px-3 py-2 flex items-center justify-between">
                      <span className="text-sm">{m.name}</span>
                      <button
                        type="button"
                        className="text-destructive text-xs"
                        onClick={async () => {
                          await deleteAiModel(m.name);
                          await loadAiManager();
                        }}
                      >
                        delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {isAiChat && selectedId && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await resetAiSession(selectedId);
                      toast.success("AI сессия сброшена");
                    } catch (err: any) {
                      toast.error(err.message || "Не удалось сбросить сессию");
                    }
                  }}
                >
                  Сбросить сессию
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    const ok = window.confirm("Очистить историю чата с AI?");
                    if (!ok) return;
                    try {
                      await clearAiHistory(selectedId);
                      setMessagesByConversation(p => ({ ...p, [selectedId]: [] }));
                      toast.success("История очищена");
                    } catch (err: any) {
                      toast.error(err.message || "Не удалось очистить историю");
                    }
                  }}
                >
                  Очистить историю
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
