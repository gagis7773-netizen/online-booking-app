/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const CHAT_URL = "https://functions.poehali.dev/cadfcb18-918a-427c-a334-5c8c8ace2c06";

const pink = "hsl(335 80% 55%)";
const pinkBg = "hsl(335 80% 60% / 0.1)";
const pinkBorder = "hsl(335 50% 85%)";
const textDark = "hsl(335 50% 25%)";
const textMid = "hsl(335 30% 55%)";
const grad = "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))";

function playPing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [[880, 0], [1100, 0.18]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t); osc.stop(t + 0.45);
    });
  } catch { /* silent */ }
}

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

export default function ChatPage({ onBack, client }: { onBack?: () => void; client?: any }) {
  const [name, setName] = useState(client?.name || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevIncoming = useRef(0);
  const chatIdRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

  const loadMessages = async (id: number) => {
    try {
      const res = await fetch(`${CHAT_URL}/messages?chat_id=${id}`);
      const data = await res.json();
      const msgs: any[] = data.messages || [];
      const incoming = msgs.filter(m => m.sender !== "client").length;
      if (incoming > prevIncoming.current && prevIncoming.current >= 0) playPing();
      prevIncoming.current = incoming;
      setMessages(msgs);
      scrollToBottom();
    } catch { /* повторим при следующем поллинге */ }
  };

  const startChat = async (n: string, p: string) => {
    const res = await fetch(`${CHAT_URL}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_name: n, client_phone: p, message: "Здравствуйте! Хочу узнать подробнее." }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.chat_id) throw new Error("no chat_id");
    setChatId(data.chat_id);
    chatIdRef.current = data.chat_id;
    setStarted(true);
    localStorage.setItem("gp_chat", JSON.stringify({ chatId: data.chat_id, name: n, phone: p }));
    loadMessages(data.chat_id);
  };

  // Восстановить сессию или автостарт
  useEffect(() => {
    const saved = localStorage.getItem("gp_chat");
    if (saved) {
      try {
        const { chatId: id, name: n, phone: p } = JSON.parse(saved);
        if (id) {
          setChatId(id); chatIdRef.current = id;
          setName(n || ""); setPhone(p || ""); setStarted(true);
          loadMessages(id);
          return;
        }
      } catch { localStorage.removeItem("gp_chat"); }
    }
    if (client?.name?.trim()) {
      setStarting(true);
      startChat(client.name.trim(), client.phone || "")
        .catch(() => {})
        .finally(() => setStarting(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Поллинг каждые 6 секунд
  useEffect(() => {
    if (!started || !chatId) return;
    const iv = setInterval(() => { if (chatIdRef.current) loadMessages(chatIdRef.current); }, 6000);
    return () => clearInterval(iv);
  }, [started, chatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async (content: string, type = "text", fileData?: string, fileName?: string) => {
    if (!chatId || (!content.trim() && !fileData)) return;
    setSending(true);
    try {
      const body: any = { chat_id: chatId, sender: "client", content, type };
      if (fileData) { body.file_data = fileData; body.file_name = fileName; }
      const res = await fetch(`${CHAT_URL}/send`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, {
          id: data.id, sender: "client", type,
          content: content || fileName,
          file_url: null, file_name: fileName,
          created_at: data.created_at || new Date().toISOString(),
        }]);
        setInput("");
        scrollToBottom();
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1];
      sendMessage(file.name, file.type.startsWith("image/") ? "image" : "file", b64, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Экран загрузки ──
  if (starting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen animate-fade-in">
        <div className="text-4xl mb-3 animate-bounce">💬</div>
        <p className="text-sm" style={{ color: textMid }}>Открываем чат...</p>
      </div>
    );
  }

  // ── Форма начала чата ──
  if (!started) {
    return (
      <div className="min-h-screen animate-fade-in flex flex-col" style={{ background: "hsl(335 60% 98%)" }}>
        {/* Header */}
        <div className="px-4 pt-12 pb-4 flex items-center gap-3" style={{ background: "white", borderBottom: `1px solid ${pinkBorder}` }}>
          {onBack && (
            <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: pinkBg }}>
              <Icon name="ChevronLeft" size={18} style={{ color: pink }} />
            </button>
          )}
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: grad }}>🌸</div>
          <div>
            <div className="font-semibold text-sm" style={{ color: textDark }}>Girly Paradise</div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
              <span className="text-xs" style={{ color: textMid }}>онлайн</span>
            </div>
          </div>
        </div>

        {/* Форма */}
        <div className="flex-1 flex flex-col justify-center px-5 py-8">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">💬</div>
            <h1 className="text-2xl font-oswald font-bold mb-1" style={{ color: textDark }}>Написать нам</h1>
            <p className="text-sm" style={{ color: textMid }}>Введите имя — и начнём общение</p>
          </div>

          <div className="space-y-3">
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Ваше имя *"
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
              style={{ background: "white", border: `1.5px solid ${pinkBorder}`, color: textDark }}
              onKeyDown={e => e.key === "Enter" && inputRef.current?.focus()}
            />
            <input
              ref={inputRef}
              value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="Телефон (необязательно)"
              type="tel"
              className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
              style={{ background: "white", border: `1.5px solid ${pinkBorder}`, color: textDark }}
            />

            {startError && (
              <div className="px-4 py-3 rounded-2xl text-sm text-center" style={{ background: "hsl(0 60% 96%)", color: "hsl(0 60% 45%)" }}>
                {startError}
              </div>
            )}

            <button
              onClick={async () => {
                if (!name.trim()) return;
                setStartError("");
                setStarting(true);
                try { await startChat(name.trim(), phone); }
                catch { setStartError("Не удалось подключиться. Попробуйте ещё раз."); }
                finally { setStarting(false); }
              }}
              disabled={!name.trim() || starting}
              className="w-full py-4 rounded-2xl font-semibold text-white text-base shadow-lg transition-all active:scale-95"
              style={{ background: name.trim() ? grad : "hsl(335 20% 88%)", color: name.trim() ? "white" : "hsl(335 20% 65%)" }}>
              {starting ? "Подключаемся..." : "Начать чат 🌸"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Активный чат ──
  return (
    <div className="flex flex-col animate-fade-in" style={{ height: "calc(100dvh - 72px)", background: "hsl(335 60% 98%)" }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-3 flex items-center gap-3 flex-shrink-0"
        style={{ background: "white", borderBottom: `1px solid ${pinkBorder}` }}>
        {onBack && (
          <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: pinkBg }}>
            <Icon name="ChevronLeft" size={18} style={{ color: pink }} />
          </button>
        )}
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: grad }}>🌸</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm" style={{ color: textDark }}>Girly Paradise</div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
            <span className="text-xs" style={{ color: textMid }}>онлайн · ответим скоро</span>
          </div>
        </div>
        <button onClick={() => chatIdRef.current && loadMessages(chatIdRef.current)}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: pinkBg }}>
          <Icon name="RefreshCw" size={15} style={{ color: pink }} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: textMid }}>
            <div className="text-4xl">✉️</div>
            <p className="text-sm">Напишите нам — мы ответим!</p>
          </div>
        )}
        {messages.map((msg: any, i: number) => {
          const isClient = msg.sender === "client";
          const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString();
          return (
            <div key={msg.id || i}>
              {showDate && (
                <div className="text-center my-2">
                  <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: "hsl(335 30% 90%)", color: textMid }}>
                    {new Date(msg.created_at).toLocaleDateString("ru", { day: "numeric", month: "long" })}
                  </span>
                </div>
              )}
              <div className={`flex ${isClient ? "justify-end" : "justify-start"} items-end gap-2`}>
                {!isClient && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mb-1" style={{ background: grad }}>🌸</div>
                )}
                <div className="max-w-[78%]">
                  {msg.type === "image" && msg.file_url && (
                    <img src={msg.file_url} alt="фото" className="rounded-2xl max-w-full shadow-sm mb-0.5" style={{ maxHeight: 240 }} />
                  )}
                  {msg.type === "file" && msg.file_url && (
                    <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm shadow-sm mb-0.5"
                      style={isClient ? { background: grad, color: "white" } : { background: "white", color: textDark, border: `1px solid ${pinkBorder}` }}>
                      <Icon name="Paperclip" size={14} />
                      {msg.file_name || "Файл"}
                    </a>
                  )}
                  {(msg.type === "text" || !msg.file_url) && msg.content && (
                    <div className="px-4 py-2.5 rounded-2xl text-sm shadow-sm"
                      style={isClient
                        ? { background: grad, color: "white", borderBottomRightRadius: 4 }
                        : { background: "white", color: textDark, border: `1px solid ${pinkBorder}`, borderBottomLeftRadius: 4 }}>
                      {msg.content}
                    </div>
                  )}
                  <div className="text-[11px] mt-0.5 px-1" style={{ color: textMid, textAlign: isClient ? "right" : "left" }}>
                    {formatTime(msg.created_at)}
                    {isClient && <span className="ml-1" style={{ color: "hsl(335 60% 70%)" }}>✓</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 flex-shrink-0" style={{ background: "white", borderTop: `1px solid ${pinkBorder}` }}>
        <div className="flex items-center gap-2">
          <button onClick={() => fileRef.current?.click()}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: pinkBg }}>
            <Icon name="Paperclip" size={18} style={{ color: pink }} />
          </button>
          <input ref={fileRef} type="file" className="hidden" accept="image/*,application/pdf,.doc,.docx" onChange={handleFile} />
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Сообщение..."
            className="flex-1 px-4 py-3 rounded-full text-sm outline-none"
            style={{ background: "hsl(335 40% 97%)", border: `1px solid ${pinkBorder}`, color: textDark }}
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-all active:scale-90"
            style={{ background: input.trim() ? grad : "hsl(335 20% 88%)" }}>
            <Icon name="Send" size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
