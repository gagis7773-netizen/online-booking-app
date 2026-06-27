/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const CHAT_URL = "https://functions.poehali.dev/cadfcb18-918a-427c-a334-5c8c8ace2c06";

// Звук при новом входящем сообщении для клиента
function playClientMessageSound() {
  try {
    const soundOn = localStorage.getItem("gp_client_sound") !== "off";
    if (!soundOn) return;
    const ss = JSON.parse(localStorage.getItem("gp_sound_settings") || "{}");
    const vol = ss.volume ?? 0.4;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Мягкий двойной «пинг»
    [[880, 0], [1100, 0.18]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol * 0.25, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t); osc.stop(t + 0.45);
    });
  } catch { /* silent */ }
}

const pink = "hsl(335 80% 55%)";
const pinkBg = "hsl(335 80% 60% / 0.1)";
const pinkBorder = "hsl(335 50% 85%)";
const textDark = "hsl(335 50% 25%)";
const textMid = "hsl(335 30% 55%)";

export default function ChatPage({ onBack, client }: { onBack?: () => void; client?: any }) {
  const [name, setName] = useState(client?.name || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const [autoStarting, setAutoStarting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef<number>(0);
  const chatIdRef = useRef<number | null>(null);

  const scroll = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const loadMessages = async (id: number) => {
    const res = await fetch(`${CHAT_URL}/messages?chat_id=${id}`);
    const data = await res.json();
    const msgs = data.messages || [];
    const incoming = msgs.filter((m: any) => m.sender !== "client");
    if (incoming.length > prevMsgCount.current && prevMsgCount.current > 0) {
      playClientMessageSound();
    }
    prevMsgCount.current = incoming.length;
    setMessages(msgs);
  };

  const startChat = async (clientName: string, clientPhone: string) => {
    if (!clientName.trim()) return;
    const res = await fetch(`${CHAT_URL}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_name: clientName, client_phone: clientPhone, message: "Здравствуйте! Хочу узнать подробнее." }),
    });
    const data = await res.json();
    setChatId(data.chat_id);
    chatIdRef.current = data.chat_id;
    setStarted(true);
    localStorage.setItem("girly_chat", JSON.stringify({ chatId: data.chat_id, name: clientName, phone: clientPhone }));
    loadMessages(data.chat_id);
  };

  useEffect(() => {
    // Восстановить сессию из localStorage
    const saved = localStorage.getItem("girly_chat");
    if (saved) {
      const { chatId: id, name: n, phone: p } = JSON.parse(saved);
      setChatId(id); chatIdRef.current = id;
      setName(n); setPhone(p); setStarted(true);
      loadMessages(id);
      return;
    }
    // Клиент уже залогинен — стартуем чат автоматически
    if (client?.name) {
      setAutoStarting(true);
      startChat(client.name, client.phone || "").finally(() => setAutoStarting(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Поллинг новых сообщений каждые 8 секунд
  useEffect(() => {
    if (!started || !chatId) return;
    const interval = setInterval(() => { if (chatIdRef.current) loadMessages(chatIdRef.current); }, 8000);
    return () => clearInterval(interval);
  }, [started, chatId]);

  useEffect(() => { scroll(); }, [messages]);

  const sendMessage = async (content: string, type = "text", fileData?: string, fileName?: string) => {
    if (!chatId || (!content && !fileData)) return;
    setSending(true);
    const body: any = { chat_id: chatId, sender: "client", content, type };
    if (fileData) { body.file_data = fileData; body.file_name = fileName; }
    const res = await fetch(`${CHAT_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setMessages(prev => [...prev, {
      id: data.id, sender: "client", type, content: content || fileName,
      file_url: null, file_name: fileName, created_at: data.created_at
    }]);
    setInput("");
    setSending(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      const isImg = file.type.startsWith("image/");
      sendMessage(file.name, isImg ? "image" : "file", base64, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  if (!started) {
    // Автозапуск — клиент залогинен, ждём пока чат откроется
    if (autoStarting) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen animate-fade-in">
          <div className="text-5xl mb-4 animate-float">💬</div>
          <p className="text-sm" style={{ color: textMid }}>Открываем чат...</p>
        </div>
      );
    }

    return (
      <div className="animate-fade-in px-4 pt-12 pb-6">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 text-sm mb-6" style={{ color: textMid }}>
            <Icon name="ChevronLeft" size={16} /> Назад
          </button>
        )}
        <h1 className="text-3xl font-oswald font-bold mb-1" style={{ color: textDark }}>Написать нам 💬</h1>
        <p className="text-sm mb-6" style={{ color: textMid }}>Ответим в ближайшее время</p>
        <div className="card-glow rounded-3xl p-6 space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider block mb-1" style={{ color: textMid }}>Ваше имя *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Введите имя"
              className="w-full px-4 py-3 rounded-xl outline-none text-sm"
              style={{ background: "white", border: `1px solid ${pinkBorder}`, color: textDark }} />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider block mb-1" style={{ color: textMid }}>Телефон (необязательно)</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 (999) 000-00-00" type="tel"
              className="w-full px-4 py-3 rounded-xl outline-none text-sm"
              style={{ background: "white", border: `1px solid ${pinkBorder}`, color: textDark }} />
          </div>
          <button onClick={() => startChat(name, phone)} disabled={!name.trim()}
            className="w-full py-4 rounded-2xl font-semibold text-white text-base shadow-md"
            style={{ background: name.trim() ? `linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))` : "hsl(335 20% 88%)", color: name.trim() ? "white" : "hsl(335 20% 65%)" }}>
            Начать чат 🌸
          </button>
        </div>
        <div className="card-glow rounded-2xl p-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: pinkBg }}>
              <Icon name="Clock" size={18} style={{ color: pink }} />
            </div>
            <div>
              <div className="font-medium text-sm" style={{ color: textDark }}>Время ответа</div>
              <div className="text-xs" style={{ color: textMid }}>Обычно отвечаем в течение 1 часа</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-fade-in" style={{ height: "calc(100vh - 80px)" }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-3 flex items-center gap-3 border-b" style={{ borderColor: pinkBorder, background: "rgba(255,255,255,0.9)" }}>
        {onBack && (
          <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: pinkBg }}>
            <Icon name="ChevronLeft" size={18} style={{ color: pink }} />
          </button>
        )}
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: `linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))` }}>
          🌸
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm" style={{ color: textDark }}>Girly Paradise</div>
          <div className="text-xs" style={{ color: textMid }}>Отвечаем в течение 1 часа</div>
        </div>
        <button onClick={() => loadMessages(chatId!)} className="p-2 rounded-xl" style={{ background: pinkBg }}>
          <Icon name="RefreshCw" size={16} style={{ color: pink }} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8" style={{ color: textMid }}>
            <div className="text-3xl mb-2">💬</div>
            <div className="text-sm">Напишите нам — мы ответим!</div>
          </div>
        )}
        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex ${msg.sender === "client" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[75%]">
              {msg.type === "image" && msg.file_url && (
                <img src={msg.file_url} alt="фото" className="rounded-2xl max-w-full mb-1 shadow-sm" />
              )}
              {msg.type === "file" && msg.file_url && (
                <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl mb-1 text-sm"
                  style={{ background: msg.sender === "client" ? `linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))` : "white", color: msg.sender === "client" ? "white" : textDark, border: msg.sender === "admin" ? `1px solid ${pinkBorder}` : "none" }}>
                  <Icon name="Paperclip" size={14} />
                  {msg.file_name || "Файл"}
                </a>
              )}
              {(msg.type === "text" || msg.type === "link" || !msg.file_url) && (
                <div className="px-4 py-2.5 rounded-2xl text-sm shadow-sm"
                  style={msg.sender === "client"
                    ? { background: `linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))`, color: "white", borderBottomRightRadius: 4 }
                    : { background: "white", color: textDark, border: `1px solid ${pinkBorder}`, borderBottomLeftRadius: 4 }}>
                  {msg.content}
                </div>
              )}
              <div className="text-xs mt-0.5 px-1" style={{ color: textMid, textAlign: msg.sender === "client" ? "right" : "left" }}>
                {formatTime(msg.created_at)}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t" style={{ borderColor: pinkBorder, background: "rgba(255,255,255,0.95)" }}>
        <div className="flex gap-2 items-end">
          <button onClick={() => fileRef.current?.click()} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: pinkBg }}>
            <Icon name="Paperclip" size={18} style={{ color: pink }} />
          </button>
          <input ref={fileRef} type="file" className="hidden" accept="image/*,application/pdf,.doc,.docx" onChange={handleFile} />
          <div className="flex-1 relative">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Напишите сообщение..." className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: "white", border: `1px solid ${pinkBorder}`, color: textDark }} />
          </div>
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
            style={{ background: input.trim() ? `linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))` : "hsl(335 20% 88%)" }}>
            <Icon name="Send" size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}