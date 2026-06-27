/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import ReviewsPage from "./ReviewsPage";
import ChatPage from "./ChatPage";

// ── Пуш-уведомления (Service Worker) ──
async function registerPush(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return false;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return false;
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    localStorage.setItem("gp_push_enabled", "true");
    // Сохраняем endpoint для будущих уведомлений (у нас без VAPID — используем local push)
    if (reg.pushManager) {
      localStorage.setItem("gp_push_granted", "true");
    }
    return true;
  } catch { return false; }  
}

function isPushEnabled() {
  return localStorage.getItem("gp_push_enabled") === "true" && Notification.permission === "granted";
}

// Показать локальное пуш-уведомление (через SW)
async function showPushNotification(title: string, body: string, tag = "girly") {
  try {
    if (!isPushEnabled()) return;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (reg) {
      reg.showNotification(title, { body, icon: "/favicon.ico", tag, vibrate: [200, 100, 200] });
    }
  } catch (e) { void e; }
}

// ── Звуковые уведомления ──
const SOUND_PRESETS: Record<string, { label: string; freq: number[]; type: OscillatorType; dur?: number }> = {
  bell: { label: "Колокольчик 🔔", freq: [880, 1100, 880], type: "sine" },
  pop: { label: "Поп 💬", freq: [600, 900], type: "sine" },
  chime: { label: "Перезвон ✨", freq: [523, 659, 784, 1046], type: "triangle" },
  ding: { label: "Динь 🎵", freq: [1047], type: "sine" },
  soft: { label: "Тихий 🎶", freq: [440, 554], type: "sine" },
};

// Нежная мелодия приветствия (как лёгкий переливающийся перезвон)
function playWelcomeSound(volume = 0.35) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Нежная пентатоника: до-ми-соль-ля-до
    const notes = [523.25, 659.25, 783.99, 880, 1046.5, 880, 783.99];
    const gap = 0.13;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * gap;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.25, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t); osc.stop(t + 0.5);
    });
  } catch { /* silent */ }
}

// Победный нежный аккорд при успешной записи
function playBookingSound(volume = 0.4) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Торжественный аккорд: до-ми-соль-до(октава)
    const chords = [
      [523.25, 659.25, 783.99],   // C major
      [659.25, 783.99, 1046.5],   // +octave
    ];
    chords.forEach((chord, ci) => {
      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = ctx.currentTime + ci * 0.22;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume * 0.18, t + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.start(t); osc.stop(t + 0.65);
      });
    });
    // Финальная нотка-«звёздочка»
    const osc3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    osc3.connect(g3); g3.connect(ctx.destination);
    osc3.type = "triangle"; osc3.frequency.value = 1568;
    const t3 = ctx.currentTime + 0.5;
    g3.gain.setValueAtTime(volume * 0.15, t3);
    g3.gain.exponentialRampToValueAtTime(0.001, t3 + 0.4);
    osc3.start(t3); osc3.stop(t3 + 0.45);
  } catch { /* silent */ }
}

function playNotificationSound(preset = "bell", volume = 0.5) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const p = SOUND_PRESETS[preset] || SOUND_PRESETS.bell;
    p.freq.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = p.type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.35);
    });
  } catch { /* AudioContext не доступен */ }
}

function getSoundSettings() {
  try {
    return JSON.parse(localStorage.getItem("gp_sound_settings") || "{}");
  } catch { return {}; }
}
function saveSoundSettings(s: Record<string, any>) {
  localStorage.setItem("gp_sound_settings", JSON.stringify(s));
}

// Проверка: включён ли звук у клиента
function isClientSoundEnabled() {
  try {
    return localStorage.getItem("gp_client_sound") !== "off";
  } catch { return true; }
}
function setClientSound(on: boolean) {
  localStorage.setItem("gp_client_sound", on ? "on" : "off");
}

const LOGO_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/11e394f0-e373-4e52-bea5-7b8a5ce187c2.png";
const QR_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/2b4d4c5d-2ea0-4fb1-8548-564f4e7eb33c.png";
const SALON_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/files/890adaa5-bbaa-4546-9c4e-2406379ded6a.jpg";
const PRICE_IMG = "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=85";
const GALINA_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/8f8e57f4-caad-4931-8d8a-bea880feb389.jpg";

const AUTH_URL = "https://functions.poehali.dev/888bfad7-6580-4f39-b963-78aca5d4d8c0";
const ADMIN_API_URL = "https://functions.poehali.dev/6a39495b-54c8-4d05-a0e8-81e258a80299";
const SEND_BOOKING_URL = "https://functions.poehali.dev/33731d63-c7a5-4a89-b075-6b0a4282ecfc";
const UPLOAD_URL = "https://functions.poehali.dev/ccf6566c-3696-4ba5-af83-98e41caa2162";
const YANDEX_REVIEWS_URL = "https://functions.poehali.dev/4ef8938c-3c1a-44c7-82d4-d62e6f0546fa";

// Корзина магазина (localStorage)
function getCart(): any[] { try { return JSON.parse(localStorage.getItem("gp_cart") || "[]"); } catch { return []; } }
function saveCart(c: any[]) { localStorage.setItem("gp_cart", JSON.stringify(c)); }
function addToCart(product: any) {
  const cart = getCart();
  const idx = cart.findIndex((i: any) => i.product_id === product.id);
  if (idx >= 0) cart[idx].quantity = (cart[idx].quantity || 1) + 1;
  else cart.push({ product_id: product.id, name: product.name, price: Number(product.price), quantity: 1, photo_url: product.photo_url });
  saveCart(cart);
}
function removeFromCart(productId: number) {
  saveCart(getCart().filter((i: any) => i.product_id !== productId));
}
function clearCart() { localStorage.removeItem("gp_cart"); }

const adminPost = (section: string, extra?: object) =>
  fetch(ADMIN_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section, ...extra }) }).then(r => r.json());

// Безопасное сжатие: сначала читаем размеры через Blob URL, потом рисуем сразу в маленький canvas
async function compressImage(file: File): Promise<string> {
  // Ограничиваем входной файл — если > 15 МБ, браузер на телефоне упадёт
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Файл слишком большой (максимум 15 МБ). Выбери фото поменьше.");
  }

  const MAX_PX = 1080;   // максимальная сторона — безопасно для мобильных
  const QUALITY = 0.80;

  return new Promise((resolve, reject) => {
    // Blob URL — не грузит всё в память сразу в отличие от readAsDataURL
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("Не удалось прочитать изображение")); };
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      let { naturalWidth: w, naturalHeight: h } = img;

      // Вычисляем целевой размер
      if (w > MAX_PX || h > MAX_PX) {
        if (w >= h) { h = Math.round((h / w) * MAX_PX); w = MAX_PX; }
        else        { w = Math.round((w / h) * MAX_PX); h = MAX_PX; }
      }

      // Рисуем сразу в маленький canvas — экономим память
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { alpha: false }); // alpha: false — ещё экономия
      if (!ctx) { reject(new Error("Canvas недоступен")); return; }

      ctx.drawImage(img, 0, 0, w, h);

      // Сначала пробуем нужное качество
      let result = canvas.toDataURL("image/jpeg", QUALITY);

      // Если base64 > 2 МБ — жмём сильнее
      if (result.length > 2_000_000) result = canvas.toDataURL("image/jpeg", 0.65);
      if (result.length > 2_000_000) result = canvas.toDataURL("image/jpeg", 0.50);

      // Освобождаем canvas
      canvas.width = 1; canvas.height = 1;

      resolve(result);
    };

    img.src = blobUrl;
  });
}

// Загрузка фото в S3 — с retry при сетевой ошибке
async function uploadPhoto(file: File, folder = "uploads"): Promise<string> {
  const base64 = await compressImage(file);

  // Retry до 3 раз
  let lastError: Error = new Error("Unknown");
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 сек таймаут
      const res = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, folder }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.url) return data.url;
      throw new Error("No URL");
    } catch (err: any) {
      lastError = err;
      if (err.name === "AbortError") lastError = new Error("Превышено время ожидания");
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt)); // пауза между попытками
    }
  }
  throw lastError;
}

// Загрузка видео с телефона в S3
async function uploadVideo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const res = await fetch(UPLOAD_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, folder: "videos" }),
        });
        const data = await res.json();
        if (data.url) resolve(data.url);
        else reject(new Error("No URL"));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function VideoUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [upl, setUpl] = React.useState(false);
  const [progress, setProgress] = React.useState("");
  return (
    <label className="cursor-pointer flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium w-full"
      style={{ background: "hsl(270 50% 96%)", color: "hsl(270 60% 45%)", border: "1.5px dashed hsl(270 50% 78%)" }}>
      {upl ? `⏳ ${progress || "Загружаем видео..."}` : "🎬 Выбрать видео с телефона"}
      <input type="file" accept="video/*" className="hidden" disabled={upl}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 100 * 1024 * 1024) { alert("Видео слишком большое (максимум 100 МБ)"); return; }
          setUpl(true);
          setProgress("Читаем файл...");
          try {
            setProgress("Загружаем...");
            const url = await uploadVideo(file);
            onUploaded(url);
            setProgress("");
          } catch { alert("Ошибка загрузки видео, попробуй ещё раз"); }
          finally { setUpl(false); e.target.value = ""; }
        }} />
    </label>
  );
}

// Минималистичная кнопка загрузки фото для разделов (без useState)
// SectionPhotoUpload — загружает фото и сохраняет в БД без ре-рендера родителя
function SectionPhotoUpload({
  settingKey,
  currentUrl,
  onSaved,
}: {
  settingKey: string;
  currentUrl?: string;
  onSaved: (key: string, url: string) => void;
}) {
  const [upl, setUpl] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [localUrl, setLocalUrl] = React.useState(currentUrl || "");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpl(true);
    setDone(false);
    try {
      const url = await uploadPhoto(file, "sections");
      // Сохраняем прямо в БД — без вызова setSettings родителя
      await adminPost("site_settings", { action: "save", settings: { [settingKey]: url } });
      setLocalUrl(url);
      onSaved(settingKey, url); // обновляем локально в родителе без сброса страницы
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch { alert("Ошибка загрузки, попробуй ещё раз"); }
    finally { setUpl(false); e.target.value = ""; }
  };

  return (
    <div className="space-y-2">
      <label className="cursor-pointer flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium w-full"
        style={{ background: done ? "hsl(142 60% 94%)" : "hsl(335 50% 96%)", color: done ? "hsl(142 60% 35%)" : "hsl(335 60% 45%)", border: `1.5px dashed ${done ? "hsl(142 50% 75%)" : "hsl(335 50% 80%)"}` }}>
        {upl ? "⏳ Загружаем..." : done ? "✅ Сохранено!" : "📷 Загрузить фото"}
        <input type="file" accept="image/*" className="hidden" disabled={upl} onChange={handleFile} />
      </label>
      {localUrl && (
        <div className="relative">
          <img src={localUrl} className="w-full h-20 object-cover rounded-xl" alt="preview" />
        </div>
      )}
    </div>
  );
}

// Переиспользуемая кнопка загрузки фото
function PhotoUploadButton({
  onUploaded, folder = "uploads", label = "📷 Загрузить фото", className = "", uploading, setUploading
}: {
  onUploaded: (url: string) => void;
  folder?: string;
  label?: string;
  className?: string;
  uploading: boolean;
  setUploading: (v: boolean) => void;
}) {
  const [status, setStatus] = React.useState("");
  return (
    <div className={"flex flex-col gap-1 " + className}>
      <label className={"cursor-pointer flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all " + (uploading ? "opacity-60 cursor-not-allowed" : "")}
        style={{ background: "hsl(335 50% 96%)", color: "hsl(335 60% 45%)", border: "1.5px dashed hsl(335 50% 80%)" }}>
        {uploading ? `⏳ ${status || "Сжимаем фото..."}` : label}
        <input type="file" accept="image/*" className="hidden" disabled={uploading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            // Проверяем до начала загрузки — не даём взорвать браузер
            if (file.size > 15 * 1024 * 1024) {
              alert("Фото слишком большое (больше 15 МБ).\nОткрой его в галерее телефона → Поделиться → выбери меньшее качество, или сделай скриншот.");
              e.target.value = "";
              return;
            }
            setUploading(true);
            setStatus("Сжимаем фото...");
            try {
              const url = await uploadPhoto(file, folder);
              setStatus("");
              onUploaded(url);
            } catch (err: any) {
              setStatus("");
              const msg = err?.message || "Неизвестная ошибка";
              alert(`Не удалось загрузить фото.\n${msg}`);
            }
            finally { setUploading(false); e.target.value = ""; }
          }} />
      </label>
      {uploading && (
        <div className="text-[11px] text-center" style={{ color: "hsl(335 40% 60%)" }}>
          {status} Это может занять 10–20 секунд...
        </div>
      )}
    </div>
  );
}

type Page = "home" | "pricelist" | "masters" | "booking" | "profile" | "reviews" | "admin" | "chat" | "gallery" | "documents" | "shop";

// Иконки и цвета по категории для услуг в записи
const CAT_STYLE: Record<string, { icon: string; color: string }> = {
  "Лицо":        { icon: "Sparkles",     color: "from-fuchsia-500 to-pink-600" },
  "Тело":        { icon: "Wind",         color: "from-teal-500 to-cyan-600" },
  "Волосы":      { icon: "Scissors",     color: "from-amber-500 to-yellow-600" },
  "СПА":         { icon: "Flower2",      color: "from-purple-500 to-pink-600" },
  "Криолиполиз": { icon: "Snowflake",    color: "from-cyan-500 to-blue-600" },
  "РФ-лифтинг":  { icon: "Waves",        color: "from-violet-500 to-purple-600" },
  "Другое":      { icon: "Star",         color: "from-pink-500 to-rose-600" },
};
const DEFAULT_SVC_STYLE = { icon: "Star", color: "from-pink-500 to-rose-500" };

function priceItemToService(it: any, idx: number) {
  const style = CAT_STYLE[it.category] || DEFAULT_SVC_STYLE;
  // Парсим длительность: "60 мин" → 60, или просто число
  const dur = it.duration ? parseInt(String(it.duration)) || 60 : 60;
  return { id: it.id ?? idx + 1, name: it.name, category: it.category || "Другое", price: it.price || "Уточнить", duration: dur, icon: style.icon, color: style.color };
}

const DEFAULT_MASTERS = [
  { id: 1, name: "Галина Сиплатова", spec: "Косметолог-эстетист", rating: 5.0, reviews_count: 0, img: GALINA_IMG, tags: ["СМАС-лифтинг", "Биоревитализация", "РФ-лифтинг", "Криолиполиз"] },
];

const timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function getWeekDays() {
  const days = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
  const months = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  const result = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    result.push({ day: days[d.getDay()], date: d.getDate(), month: months[d.getMonth()], full: d });
  }
  return result;
}

const weekDays = getWeekDays();

// Хранение клиента в localStorage
function saveClient(client: any) { localStorage.setItem("gp_client", JSON.stringify(client)); }
function loadClient(): any | null {
  try { return JSON.parse(localStorage.getItem("gp_client") || "null"); } catch { return null; }
}
function clearClient() { localStorage.removeItem("gp_client"); }

export default function Index() {
  const [page, setPage] = useState<Page>("home");
  const [client, setClient] = useState<any>(loadClient());
  const [dynamicMasters, setDynamicMasters] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [dynamicServices, setDynamicServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingDone, setBookingDone] = useState(false);
  // Занятые слоты: { "2026-06-28": ["11:00","14:00"], ... }
  const [scheduledSlots, setScheduledSlots] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Звук приветствия при открытии сайта (если клиент залогинен)
    if (client && isClientSoundEnabled()) {
      const timer = setTimeout(() => playWelcomeSound(0.3), 600);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Регистрируем Service Worker при старте
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    adminPost("site_settings").then(d => setSiteSettings(d.settings || {})).catch(() => {});
    adminPost("masters", { active_only: true }).then(d => {
      if (d.masters && d.masters.length > 0) {
        setDynamicMasters(d.masters.map((m: any) => ({
          id: m.id,
          name: m.name,
          spec: m.spec || "",
          rating: Number(m.rating) || 5.0,
          reviews_count: m.reviews_count || 0,
          img: m.photo_url || GALINA_IMG,
          tags: m.tags ? m.tags.split(",").map((t: string) => t.trim()) : [],
        })));
      } else {
        setDynamicMasters(DEFAULT_MASTERS);
      }
    }).catch(() => setDynamicMasters(DEFAULT_MASTERS));

    // Загружаем услуги из прайса для формы записи
    adminPost("pricelist_custom", { active_only: true }).then(d => {
      if (d.items && d.items.length > 0) {
        setDynamicServices(d.items.map(priceItemToService));
      }
    }).catch(() => {});

    // Загружаем занятые слоты из расписания
    adminPost("schedule").then(d => {
      const slots: Record<string, string[]> = {};
      (d.schedule || []).forEach((item: any) => {
        const date = item.booking_date?.slice(0, 10);
        const time = item.booking_time?.slice(0, 5);
        if (date && time) {
          if (!slots[date]) slots[date] = [];
          slots[date].push(time);
        }
      });
      setScheduledSlots(slots);
    }).catch(() => {});
  }, []);

  const masters = dynamicMasters.length > 0 ? dynamicMasters : DEFAULT_MASTERS;
  const bookingServices = dynamicServices;
  // Занятые слоты для выбранного дня
  const getBusySlotsForDay = (dayIdx: number): string[] => {
    const d = weekDays[dayIdx];
    if (!d) return [];
    const y = d.full.getFullYear();
    const m = String(d.full.getMonth() + 1).padStart(2, "0");
    const dd = String(d.full.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${dd}`;
    return scheduledSlots[dateStr] || [];
  };

  const handleLogin = (c: any) => {
    const isNew = !loadClient();
    saveClient(c);
    setClient(c);
    // Нежный звук приветствия при входе (учитываем выбранный пресет)
    if (isClientSoundEnabled()) {
      const ss = getSoundSettings();
      const wp = ss.welcome_preset || "welcome_default";
      const vol = ss.volume ?? 0.35;
      setTimeout(() => {
        if (wp === "welcome_chime") playNotificationSound("chime", vol);
        else if (wp === "welcome_soft") playNotificationSound("soft", vol);
        else if (wp !== "welcome_none") playWelcomeSound(vol);
      }, 200);
    }
    if (isNew) {
      adminPost("notify_owner", {
        event_type: "new_client",
        message: `Girly Paradise: новый клиент зарегистрировался! ${c.name}, тел: ${c.phone}`,
      }).catch(() => {});
    }
  };

  const handleLogout = () => {
    clearClient();
    setClient(null);
    setPage("home");
  };

  // Хранилище позиций прокрутки для каждой страницы
  const scrollPositions = React.useRef<Record<string, number>>({});

  const navigateTo = (newPage: Page) => {
    // Сохраняем текущую позицию прокрутки перед уходом
    scrollPositions.current[page] = window.scrollY;
    setPage(newPage);
    // Для новых страниц — скроллим наверх
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const navigateBack = (targetPage: Page) => {
    // Сохраняем позицию текущей страницы
    scrollPositions.current[page] = window.scrollY;
    setPage(targetPage);
    // Восстанавливаем позицию на странице, куда возвращаемся
    requestAnimationFrame(() => {
      const savedPos = scrollPositions.current[targetPage] || 0;
      window.scrollTo({ top: savedPos, behavior: "instant" });
    });
  };

  const startBooking = () => {
    scrollPositions.current[page] = window.scrollY;
    setBookingStep(1);
    setSelectedServices([]);
    setSelectedMaster(null);
    setSelectedDay(0);
    setSelectedTime(null);
    setBookingDone(false);
    setPage("booking");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const confirmBooking = () => {
    setBookingDone(true);
    setBookingStep(4);
    // Торжественный звук при успешной записи
    if (isClientSoundEnabled()) {
      setTimeout(() => playBookingSound(0.4), 300);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "linear-gradient(135deg, #fff5f7 0%, #fce4ec 30%, #fdf6f8 60%, #fff0f3 100%)" }}>
      {/* Floating sparkles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(335 80% 80%), transparent 70%)" }} />
        <div className="absolute bottom-[-5%] left-[-5%] w-[350px] h-[350px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(315 70% 85%), transparent 70%)" }} />
        {["✦","✧","✦","✧","✦","✧","✦"].map((s, i) => (
          <div key={i} className="absolute text-pink-300 animate-float"
            style={{ left: `${5 + i * 14}%`, top: `${15 + (i % 4) * 20}%`, fontSize: 12 + (i % 3) * 6, opacity: 0.5, animationDelay: `${i * 0.7}s` }}>
            {s}
          </div>
        ))}
      </div>

      <div className="relative z-10 pb-24">
        {page === "home" && <HomePage setPage={setPage} startBooking={startBooking} client={client} masters={masters} siteSettings={siteSettings} />}
        {page === "pricelist" && <PriceListPage setPage={navigateTo} onBack={() => navigateBack("home")} startBooking={startBooking} />}
        {page === "masters" && <MastersPage masters={masters} setPage={navigateTo} onBack={() => navigateBack("home")} startBooking={startBooking} />}
        {page === "booking" && (
          <BookingPage
            step={bookingStep}
            setStep={setBookingStep}
            selectedServices={selectedServices}
            setSelectedServices={setSelectedServices}
            selectedMaster={selectedMaster}
            setSelectedMaster={setSelectedMaster}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
            bookingDone={bookingDone}
            confirmBooking={confirmBooking}
            services={bookingServices}
            masters={masters}
            weekDays={weekDays}
            timeSlots={timeSlots}
            busySlots={getBusySlotsForDay(selectedDay)}
            setPage={setPage}
            client={client}
          />
        )}
        {page === "profile" && (
          <ProfilePage client={client} onLogin={handleLogin} onLogout={handleLogout} setPage={setPage} />
        )}
        {page === "reviews" && <ReviewsPage onBack={() => navigateBack("home")} />}
        {page === "gallery" && <ClientGalleryPage setPage={navigateTo} onBack={() => navigateBack("home")} />}
        {page === "documents" && <ClientDocumentsPage setPage={navigateTo} onBack={() => navigateBack("home")} />}
        {page === "chat" && <ChatPage onBack={() => navigateBack("home")} client={client} />}
        {page === "admin" && <AdminPage onBack={() => navigateBack("home")} />}
        {page === "shop" && <ShopPage client={client} onBack={() => navigateBack("home")} />}
      </div>

      <BottomNav page={page} setPage={navigateTo} />
    </div>
  );
}

// ─── HOME ───────────────────────────────────────────────────────────────────

function HomePage({ setPage: navigateTo, startBooking, client, masters, siteSettings }: { setPage: (p: Page) => void; startBooking: () => void; client: any; masters: any[]; siteSettings: Record<string, string> }) {
  const [pressTimer, setPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoPress = () => {
    const t = setTimeout(() => navigateTo("admin"), 2000);
    setPressTimer(t);
  };
  const handleLogoRelease = () => {
    if (pressTimer) clearTimeout(pressTimer);
  };

  const heroImg = siteSettings.hero_image_url || SALON_IMG;
  const wallImg = siteSettings.wall_image_url || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=85";
  const wallTitle = siteSettings.wall_title || "Наш салон";
  const wallSubtitle = siteSettings.wall_subtitle || "Girly Paradise Beauty Apartments";
  const btnColor = siteSettings.hero_color_from || "hsl(335 80% 58%)";
  const btnGrad = { background: `linear-gradient(135deg, ${btnColor}, ${siteSettings.hero_color_to || "hsl(315 70% 65%)"})` };
  const salonPhone = siteSettings.salon_phone || "+79046015556";
  const salonAddress = siteSettings.salon_address || "м. Парнас · ул. Заречная, 10";
  const salonMapsUrl = siteSettings.salon_maps_url || "https://yandex.ru/maps/org/devchachiy_ray/46803820767";

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="relative h-[480px] overflow-hidden">
        <img src={heroImg} alt="Girly Paradise" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(255,220,230,0.15) 0%, rgba(255,182,193,0.25) 40%, rgba(255,240,245,0.96) 100%)"
        }} />
        <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between">
          <div className="w-28 h-28 flex items-center justify-center cursor-pointer select-none drop-shadow-lg"
            onMouseDown={handleLogoPress} onMouseUp={handleLogoRelease} onMouseLeave={handleLogoRelease}
            onTouchStart={handleLogoPress} onTouchEnd={handleLogoRelease}>
            <img src={LOGO_IMG} alt="Girly Paradise" className="w-full h-full object-contain" style={{ filter: "drop-shadow(0 2px 8px rgba(255,182,193,0.5))" }} />
          </div>
          <div className="flex flex-col items-end gap-1.5 pt-1">
            <a href={`tel:${salonPhone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", color: "hsl(335 80% 45%)", border: "1px solid hsl(335 80% 80%)" }}>
              <Icon name="Phone" size={11} />
              <span>{salonPhone}</span>
            </a>
            <a href={salonMapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", color: "hsl(335 60% 50%)", border: "1px solid hsl(335 50% 85%)" }}>
              <Icon name="MapPin" size={11} />
              <span>{salonAddress} →</span>
            </a>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="text-4xl font-oswald font-bold leading-tight mb-3" style={{ color: "hsl(335 60% 30%)" }}>
            Онлайн запись<br /><span className="gradient-text">в один клик</span>
          </h1>
          <button onClick={startBooking}
            className="w-full py-3.5 rounded-2xl font-semibold text-white text-base animate-pulse-glow shadow-lg"
            style={btnGrad}>
            🌸 Записаться сейчас
          </button>
        </div>
      </div>

      {/* Мастера */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-oswald font-semibold" style={{ color: "hsl(335 60% 30%)" }}>Наши мастера</h2>
          <button onClick={() => navigateTo("masters")} className="text-sm font-medium" style={{ color: "hsl(335 80% 55%)" }}>Все →</button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {masters.map((m) => (
            <div key={m.id} className="flex-shrink-0 w-40 card-glow rounded-2xl overflow-hidden cursor-pointer">
              <div className="h-40 overflow-hidden relative">
                <img src={m.img} alt={m.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold truncate" style={{ color: "hsl(335 50% 30%)" }}>{m.name}</div>
                <div className="text-xs mb-2 truncate" style={{ color: "hsl(335 30% 55%)" }}>{m.spec}</div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500 text-xs">★</span>
                  <span className="text-xs font-medium" style={{ color: "hsl(335 50% 40%)" }}>{m.rating}</span>
                  <span className="text-xs" style={{ color: "hsl(335 20% 65%)" }}>({m.reviews_count})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Фото нашего салона — кликабельное, открывается на весь экран */}
      <div className="px-4 mb-5">
        <button className="w-full relative rounded-3xl overflow-hidden shadow-xl text-left"
          style={{ height: Number(siteSettings.wall_height || 220) }}
          onClick={() => {
            const fs = document.createElement("div");
            fs.style.cssText = "position:fixed;inset:0;z-index:9999;background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer";
            const img = document.createElement("img");
            img.src = wallImg;
            img.style.cssText = "max-width:100%;max-height:100%;object-fit:contain;border-radius:12px";
            const close = document.createElement("button");
            close.innerHTML = "✕";
            close.style.cssText = "position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.2);color:white;font-size:18px;border:none;cursor:pointer;font-weight:bold";
            fs.appendChild(img); fs.appendChild(close);
            fs.onclick = () => document.body.removeChild(fs);
            document.body.appendChild(fs);
          }}>
          <img src={wallImg} alt={wallTitle} className="w-full h-full object-cover"
            style={{ objectPosition: `center ${siteSettings.wall_pos || 50}%` }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(255,235,242,0.82) 100%)" }} />
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] flex items-center gap-1"
            style={{ background: "rgba(255,255,255,0.85)", color: "hsl(335 60% 40%)" }}>
            <Icon name="ZoomIn" size={10} /> увеличить
          </div>
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-base font-bold font-oswald" style={{ color: "hsl(335 60% 25%)", textShadow: "0 1px 4px rgba(255,255,255,0.7)" }}>{wallTitle}</p>
            <p className="text-xs mt-0.5" style={{ color: "hsl(335 40% 50%)" }}>{wallSubtitle}</p>
          </div>
          <div className="absolute inset-1 rounded-2xl pointer-events-none" style={{ border: "1.5px solid rgba(255,255,255,0.45)" }} />
        </button>
      </div>

      {/* Разделы */}
      <div className="px-4 mb-5">
        <h2 className="text-xl font-oswald font-semibold mb-3" style={{ color: "hsl(335 60% 30%)" }}>Разделы</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { defaultLabel: "Прайс-лист", sub: "Все услуги и цены", page: "pricelist" as Page, icon: "ClipboardList", imgKey: "section_pricelist_img", hKey: "section_pricelist_h", nameKey: "section_pricelist_name", hiddenKey: "section_pricelist_hidden" },
            { defaultLabel: "Галерея", sub: "Мои работы", page: "gallery" as Page, icon: "Images", imgKey: "section_gallery_img", hKey: "section_gallery_h", nameKey: "section_gallery_name", hiddenKey: "section_gallery_hidden" },
            { defaultLabel: "Отзывы", sub: "Мнения клиентов", page: "reviews" as Page, icon: "Star", imgKey: "section_reviews_img", hKey: "section_reviews_h", nameKey: "section_reviews_name", hiddenKey: "section_reviews_hidden" },
            { defaultLabel: "Документы", sub: "Сертификаты и лицензии", page: "documents" as Page, icon: "FileText", imgKey: "section_documents_img", hKey: "section_documents_h", nameKey: "section_documents_name", hiddenKey: "section_documents_hidden" },
          ].filter(item => siteSettings[item.hiddenKey] !== "true").map(item => {
            const img = siteSettings[item.imgKey];
            const label = siteSettings[item.nameKey] || item.defaultLabel;
            const h = Number(siteSettings[item.hKey] || siteSettings.section_card_height || 140);
            return (
              <button key={item.page} onClick={() => navigateTo(item.page)}
                className="card-glow rounded-2xl overflow-hidden text-left hover:scale-105 transition-all">
                {img ? (
                  <div className="relative" style={{ height: h }}>
                    <img src={img} alt={label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(255,235,242,0.92) 100%)" }} />
                    <div className="absolute bottom-2 left-3">
                      <div className="font-semibold text-xs" style={{ color: "hsl(335 50% 28%)" }}>{label}</div>
                      <div className="text-[10px]" style={{ color: "hsl(335 30% 55%)" }}>{item.sub}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4" style={{ minHeight: h }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: "hsl(335 80% 60% / 0.1)", border: "1px solid hsl(335 70% 85%)" }}>
                      <Icon name={item.icon as any} size={18} style={{ color: "hsl(335 75% 52%)" }} />
                    </div>
                    <div className="font-semibold text-sm mb-0.5" style={{ color: "hsl(335 50% 30%)" }}>{label}</div>
                    <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>{item.sub}</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Видео — под разделами */}
      {siteSettings.video_show === "true" && siteSettings.video_url && (
        <div className="px-4 mb-5">
          {siteSettings.video_title && (
            <h2 className="text-xl font-oswald font-semibold mb-3" style={{ color: "hsl(335 60% 30%)" }}>
              {siteSettings.video_title}
            </h2>
          )}
          <div className="rounded-3xl overflow-hidden shadow-xl"
            style={{ height: Number(siteSettings.video_height || 240) }}>
            {siteSettings.video_url.includes("youtube.com") || siteSettings.video_url.includes("youtu.be") ? (
              <iframe src={siteSettings.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen style={{ border: "none" }} />
            ) : siteSettings.video_url.includes("vk.com") ? (
              <iframe src={siteSettings.video_url} className="w-full h-full"
                allow="autoplay; encrypted-media; fullscreen" style={{ border: "none" }} />
            ) : (
              <video src={siteSettings.video_url} controls playsInline
                className="w-full h-full object-cover" style={{ background: "#000" }} />
            )}
          </div>
        </div>
      )}

      {/* ВКонтакте — только QR без синей кнопки */}
      <div className="px-4 mb-5">
        <div className="card-glow rounded-3xl p-5 text-center">
          <div className="font-oswald font-bold text-lg mb-1" style={{ color: "hsl(335 60% 30%)" }}>Мы ВКонтакте</div>
          <div className="text-xs mb-3" style={{ color: "hsl(335 30% 55%)" }}>Акции, новости и запись онлайн</div>
          <a href="https://vk.ru/world_of_galis" target="_blank" rel="noopener noreferrer" className="flex justify-center">
            <div className="w-44 h-44 rounded-2xl overflow-hidden shadow-md border-2" style={{ borderColor: "hsl(335 50% 88%)" }}>
              <img src={QR_IMG} alt="QR-код группы ВКонтакте" className="w-full h-full object-cover" />
            </div>
          </a>
        </div>
      </div>

      {/* Копирайт внизу */}
      <div className="px-4 pb-4 text-center">
        <p className="text-xs" style={{ color: "hsl(335 20% 70%)" }}>Все права защищены 2026</p>
      </div>
    </div>
  );
}

// ─── ПРАЙС-ЛИСТ ─────────────────────────────────────────────────────────────

// Выносим поиск в отдельный стабильный компонент чтобы клавиатура не исчезала
const PriceSearchInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="relative mb-3">
    <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(335 50% 65%)" }} />
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Поиск услуги..."
      autoComplete="off"
      className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
      style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }}
    />
  </div>
);

function PriceListPage({ setPage, onBack, startBooking }: { setPage: (p: Page) => void; onBack?: () => void; startBooking: () => void }) {
  const [priceItems, setPriceItems] = useState<any[]>([]);
  const [priceLoaded, setPriceLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    adminPost("pricelist_custom", { active_only: true })
      .then(d => {
        if (d.items && d.items.length > 0) {
          setPriceItems(d.items.map((it: any) => ({
            name: it.name,
            category: it.category,
            price: it.price || "Уточнить",
            duration: it.duration || "",
            photo_url: it.photo_url || "",
          })));
          setPriceLoaded(true);
        } else {
          return fetch("https://functions.poehali.dev/440815df-d73f-44e1-957c-6a718db23941/pricelist")
            .then(r => r.json())
            .then(d2 => { setPriceItems(d2.services || []); setPriceLoaded(true); });
        }
      })
      .catch(() => setPriceLoaded(true));
  }, []);

  const cats = ["Все", ...Array.from(new Set(priceItems.map((s: any) => s.category)))];
  const filtered = priceItems.filter((s: any) => {
    const matchCat = activeCategory === "Все" || s.category === activeCategory;
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });
  const grouped: Record<string, any[]> = {};
  filtered.forEach((s: any) => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  return (
    <div className="animate-fade-in">
      {/* Заголовок прайс-листа без картинки */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => onBack ? onBack() : setPage("home")} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
          <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
        </button>
        <div>
          <h1 className="text-2xl font-oswald font-bold" style={{ color: "hsl(335 60% 28%)" }}>Прайс-лист</h1>
          <p className="text-sm" style={{ color: "hsl(335 40% 50%)" }}>Все услуги и цены</p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <PriceSearchInput value={searchQuery} onChange={setSearchQuery} />

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {cats.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={activeCategory === cat
                ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" }
                : { background: "white", color: "hsl(335 50% 55%)", border: "1px solid hsl(335 50% 85%)" }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4">
        {!priceLoaded && (
          <div className="text-center py-12">
            <div className="text-3xl mb-3 animate-float">🌸</div>
            <p className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>Загружаем прайс...</p>
          </div>
        )}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-4">
            <div className="px-3 py-2 rounded-xl mb-2 font-oswald font-bold text-sm tracking-wide"
              style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" }}>
              {cat}
            </div>
            <div className="card-glow rounded-2xl overflow-hidden">
              {items.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < items.length - 1 ? "1px solid hsl(335 30% 92%)" : "none" }}>
                  {item.photo_url && (
                    <img src={item.photo_url} alt={item.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      onError={e => (e.currentTarget.style.display = "none")} />
                  )}
                  <div className="flex-1 text-sm min-w-0" style={{ color: "hsl(335 50% 30%)" }}>{item.name}</div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-sm" style={{ color: "hsl(335 80% 50%)" }}>{item.price}</div>
                    <div className="text-xs" style={{ color: "hsl(335 20% 65%)" }}>{item.duration}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-6">
        <button onClick={startBooking}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base shadow-lg"
          style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
          🌸 Записаться
        </button>
      </div>
    </div>
  );
}

// ─── МАСТЕРА ────────────────────────────────────────────────────────────────

type Master = { id: number; name: string; spec: string; rating: number; reviews_count: number; img: string; tags: string[] };

function MastersPage({ masters: mList, setPage, onBack, startBooking }: { masters: Master[]; setPage: (p: Page) => void; onBack?: () => void; startBooking: () => void }) {
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);

  return (
    <div className="animate-fade-in">
      {/* Полноэкранный просмотр */}
      {fullscreenImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setFullscreenImg(null)}>
          <img src={fullscreenImg} className="max-w-full max-h-full object-contain" alt="мастер" />
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">✕</button>
        </div>
      )}

      <div className="px-4 pt-12 pb-6 flex items-center gap-3">
        <button onClick={() => onBack ? onBack() : setPage("home")} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
          <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
        </button>
        <div>
          <h1 className="text-3xl font-oswald font-bold mb-0.5" style={{ color: "hsl(335 60% 30%)" }}>Мастера 🌸</h1>
          <p className="text-sm" style={{ color: "hsl(335 30% 55%)" }}>Профессионалы своего дела</p>
        </div>
      </div>
      <div className="px-4 space-y-4">
        {mList.map((m, i) => (
          <div key={m.id} className="card-glow rounded-3xl overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="relative h-56 overflow-hidden cursor-pointer" onClick={() => setFullscreenImg(m.img)}>
              <img src={m.img} alt={m.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(255,220,230,0.1) 0%, rgba(255,240,245,0.92) 100%)" }} />
              {/* Подсказка */}
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs flex items-center gap-1"
                style={{ background: "rgba(255,255,255,0.85)", color: "hsl(335 60% 40%)" }}>
                <Icon name="ZoomIn" size={11} /> увеличить
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-xl font-oswald font-bold" style={{ color: "hsl(335 60% 25%)" }}>{m.name}</h3>
                    <p className="text-sm" style={{ color: "hsl(335 40% 50%)" }}>{m.spec}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-yellow-500">★</span>
                      <span className="font-bold" style={{ color: "hsl(335 60% 30%)" }}>{m.rating}</span>
                    </div>
                    <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>{m.reviews_count > 0 ? `${m.reviews_count} отзывов` : "Нет отзывов"}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {m.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "hsl(335 80% 60% / 0.1)", color: "hsl(335 70% 45%)", border: "1px solid hsl(335 80% 82%)" }}>
                    {tag}
                  </span>
                ))}
              </div>
              <button onClick={startBooking}
                className="w-full py-3 rounded-2xl font-semibold text-white shadow-md"
                style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
                Записаться к мастеру
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ЗАПИСЬ ─────────────────────────────────────────────────────────────────

function BookingPage({ step, setStep, selectedServices, setSelectedServices, selectedMaster, setSelectedMaster,
  selectedDay, setSelectedDay, selectedTime, setSelectedTime, bookingDone,
  confirmBooking, services: svcList, masters: mstrList, weekDays: wDays, timeSlots: tSlots, busySlots: bSlots, setPage, client }: any) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messenger, setMessenger] = useState<"whatsapp" | "telegram" | "vk" | null>(null);

  const toggleService = (s: any) => {
    setSelectedServices((prev: any[]) =>
      prev.find((x: any) => x.id === s.id) ? prev.filter((x: any) => x.id !== s.id) : [...prev, s]
    );
  };

  const handleConfirm = async () => {
    if (!selectedServices.length || !selectedTime) return;
    setLoading(true);
    setError("");
    try {
      const dayInfo = wDays[selectedDay];
      const serviceNames = selectedServices.map((s: any) => s.name).join(", ");
      // ISO-дата для синхронизации с расписанием
      const isoDate = dayInfo?.full
        ? `${dayInfo.full.getFullYear()}-${String(dayInfo.full.getMonth()+1).padStart(2,"0")}-${String(dayInfo.full.getDate()).padStart(2,"0")}`
        : "";
      await fetch(SEND_BOOKING_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: client?.name || "Клиент",
          phone: client?.phone || "",
          service: serviceNames,
          master: selectedMaster?.name || "Любой свободный",
          day: `${dayInfo?.day}, ${dayInfo?.date} ${dayInfo?.month}`,
          booking_date_iso: isoDate,
          time: selectedTime,
          price: 0,
        }),
      });
      // Сохраняем запись в историю клиента
      if (client?.id) {
        const dayInfo = wDays[selectedDay];
        const key = "gp_bookings_" + client.id;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const newBooking = {
          id: Date.now(),
          services: selectedServices.map((s: any) => s.name),
          master: selectedMaster?.name || "Любой свободный",
          day: `${dayInfo?.day}, ${dayInfo?.date} ${dayInfo?.month}`,
          time: selectedTime,
          status: "upcoming",
        };
        localStorage.setItem(key, JSON.stringify([newBooking, ...existing]));
      }
      confirmBooking();
    } catch {
      setError("Ошибка отправки. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  if (bookingDone) {
    const dayInfo = wDays[selectedDay];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-scale-in">
        <div className="text-6xl mb-4 animate-float">🌸</div>
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
          <Icon name="Check" size={40} className="text-white" />
        </div>
        <h2 className="text-3xl font-oswald font-bold text-center mb-2" style={{ color: "hsl(335 60% 30%)" }}>Запись подтверждена!</h2>
        <p className="text-center mb-8" style={{ color: "hsl(335 30% 55%)" }}>
          Ждём тебя {dayInfo?.day} в {selectedTime} ✨
        </p>
        <div className="w-full card-glow rounded-3xl p-5 mb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>Услуги</span>
            <span className="font-medium text-sm text-right max-w-[60%]" style={{ color: "hsl(335 50% 30%)" }}>
              {selectedServices.map((s: any) => s.name).join(", ")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>Мастер</span>
            <span className="font-medium text-sm" style={{ color: "hsl(335 50% 30%)" }}>{selectedMaster?.name || "Любой свободный"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>Дата и время</span>
            <span className="font-medium text-sm" style={{ color: "hsl(335 50% 30%)" }}>{dayInfo?.day}, {dayInfo?.date} {dayInfo?.month} в {selectedTime}</span>
          </div>
        </div>
        <button onClick={() => setPage("home")} className="w-full py-4 rounded-2xl font-semibold text-white shadow-md"
          style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
          На главную
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => step === 1 ? setPage("home") : setStep(step - 1)}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
          <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
        </button>
        <div>
          <h1 className="text-xl font-oswald font-bold" style={{ color: "hsl(335 60% 30%)" }}>Запись на услугу</h1>
          <p className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>Шаг {step} из 3</p>
        </div>
      </div>

      <div className="px-4 mb-6">
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-1.5 rounded-full transition-all duration-500"
              style={{ background: s <= step ? "linear-gradient(90deg, hsl(335 80% 60%), hsl(315 70% 65%))" : "hsl(335 30% 90%)" }} />
          ))}
        </div>
      </div>

      {/* Шаг 1: выбор услуг (множественный) — из прайса */}
      {step === 1 && (
        <div className="px-4 animate-slide-up">
          <h2 className="text-lg font-semibold mb-1" style={{ color: "hsl(335 60% 30%)" }}>Выбери услуги</h2>
          <p className="text-xs mb-4" style={{ color: "hsl(335 30% 60%)" }}>Можно выбрать несколько</p>

          {selectedServices.length > 0 && (
            <div className="mb-4 p-3 rounded-2xl flex flex-wrap gap-2" style={{ background: "hsl(335 80% 60% / 0.07)", border: "1px solid hsl(335 80% 82%)" }}>
              {selectedServices.map((s: any) => (
                <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                  style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" }}>
                  {s.name}
                  <button onClick={() => toggleService(s)} className="ml-1 opacity-70 hover:opacity-100">✕</button>
                </span>
              ))}
            </div>
          )}

          {/* Загрузка */}
          {svcList.length === 0 && (
            <div className="text-center py-10">
              <div className="text-3xl animate-float mb-2">🌸</div>
              <p className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>Загружаем услуги...</p>
            </div>
          )}

          {/* Группируем по категориям */}
          {(() => {
            const grouped: Record<string, any[]> = {};
            svcList.forEach((s: any) => {
              const cat = s.category || "Другое";
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(s);
            });
            return Object.entries(grouped).map(([cat, catItems]) => (
              <div key={cat} className="mb-4">
                <div className="px-2 py-1 mb-2 text-[11px] font-bold uppercase tracking-wider rounded-lg inline-block"
                  style={{ background: "hsl(335 80% 60% / 0.1)", color: "hsl(335 60% 40%)" }}>
                  {cat}
                </div>
                <div className="space-y-2">
                  {catItems.map((s: any) => {
                    const checked = selectedServices.find((x: any) => x.id === s.id);
                    const durLabel = s.duration ? `${s.duration} мин` : "";
                    return (
                      <div key={s.id}
                        className="card-glow rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all"
                        style={checked ? { borderColor: "hsl(335 80% 70%)", background: "hsl(335 80% 60% / 0.05)" } : {}}
                        onClick={() => toggleService(s)}>
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon name={s.icon as any} size={14} className="text-white" fallback="Star" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: "hsl(335 50% 30%)" }}>{s.name}</div>
                          <div className="text-xs flex gap-2" style={{ color: "hsl(335 30% 60%)" }}>
                            {durLabel && <span>{durLabel}</span>}
                            {s.price && s.price !== "Уточнить" && <span style={{ color: "hsl(335 70% 50%)" }}>{s.price}</span>}
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                          style={checked
                            ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", borderColor: "transparent" }
                            : { borderColor: "hsl(335 50% 80%)" }}>
                          {checked && <Icon name="Check" size={11} className="text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}


          <button
            onClick={() => selectedServices.length > 0 && setStep(2)}
            disabled={selectedServices.length === 0}
            className="mt-4 w-full py-4 rounded-2xl font-semibold text-white transition-all shadow-md"
            style={selectedServices.length > 0
              ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }
              : { background: "hsl(335 20% 90%)", color: "hsl(335 20% 65%)" }}>
            Далее → {selectedServices.length > 0 && `(${selectedServices.length})`}
          </button>
        </div>
      )}

      {/* Шаг 2: мастер и время */}
      {step === 2 && (
        <div className="px-4 animate-slide-up">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "hsl(335 60% 30%)" }}>Мастер и время</h2>

          <p className="text-xs mb-2 uppercase tracking-wider font-medium" style={{ color: "hsl(335 40% 60%)" }}>Мастер</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-3 mb-4">
            <div onClick={() => setSelectedMaster(null)} className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer">
              <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                style={!selectedMaster
                  ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", boxShadow: "0 0 20px hsl(335 80% 60% / 0.3)" }
                  : { background: "hsl(335 30% 92%)" }}>
                <Icon name="Users" size={20} style={{ color: !selectedMaster ? "white" : "hsl(335 50% 55%)" }} />
              </div>
              <span className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>Любой</span>
            </div>
            {mstrList.map((m: any) => (
              <div key={m.id} onClick={() => setSelectedMaster(m)} className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer">
                <div className="relative">
                  <img src={m.img} alt={m.name} className="w-14 h-14 rounded-full object-cover transition-all"
                    style={selectedMaster?.id === m.id ? { boxShadow: "0 0 0 3px hsl(335 80% 58%)" } : {}} />
                  {selectedMaster?.id === m.id && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "hsl(335 80% 58%)" }}>
                      <Icon name="Check" size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-center max-w-[60px] leading-tight" style={{ color: "hsl(335 30% 60%)" }}>{m.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>

          <p className="text-xs mb-2 uppercase tracking-wider font-medium" style={{ color: "hsl(335 40% 60%)" }}>День</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4">
            {wDays.map((d: any, idx: number) => (
              <button key={idx} onClick={() => setSelectedDay(idx)}
                className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-2xl transition-all"
                style={selectedDay === idx
                  ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" }
                  : { background: "white", color: "hsl(335 40% 55%)", border: "1px solid hsl(335 40% 88%)" }}>
                <span className="text-xs mb-0.5">{d.day}</span>
                <span className="text-lg font-oswald font-bold leading-none">{d.date}</span>
                <span className="text-xs">{d.month}</span>
              </button>
            ))}
          </div>

          <p className="text-xs mb-2 uppercase tracking-wider font-medium" style={{ color: "hsl(335 40% 60%)" }}>Время</p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {tSlots.map((t: string) => {
              const busy = bSlots.includes(t);
              return (
                <button key={t} onClick={() => !busy && setSelectedTime(t)} disabled={busy}
                  className="py-3 rounded-xl text-sm font-medium transition-all"
                  style={busy
                    ? { background: "hsl(335 20% 94%)", color: "hsl(335 20% 75%)" }
                    : selectedTime === t
                    ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" }
                    : { background: "white", color: "hsl(335 50% 40%)", border: "1px solid hsl(335 40% 88%)" }}>
                  {t}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => selectedTime && setStep(3)}
            disabled={!selectedTime}
            className="w-full py-4 rounded-2xl font-semibold text-white transition-all shadow-md"
            style={selectedTime
              ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }
              : { background: "hsl(335 20% 90%)", color: "hsl(335 20% 65%)" }}>
            Далее →
          </button>
        </div>
      )}

      {/* Шаг 3: подтверждение */}
      {step === 3 && (
        <div className="px-4 animate-slide-up">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "hsl(335 60% 30%)" }}>Подтверждение</h2>

          {!client && (
            <div className="mb-4 p-4 rounded-2xl" style={{ background: "hsl(335 80% 60% / 0.08)", border: "1px solid hsl(335 80% 82%)" }}>
              <p className="text-sm font-medium mb-1" style={{ color: "hsl(335 60% 35%)" }}>Необходима регистрация</p>
              <p className="text-xs mb-3" style={{ color: "hsl(335 30% 55%)" }}>Чтобы записаться, войди в профиль по номеру телефона</p>
              <button onClick={() => setPage("profile")}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
                Войти / Зарегистрироваться
              </button>
            </div>
          )}

          <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
            <div>
              <span className="text-xs uppercase tracking-wider" style={{ color: "hsl(335 40% 65%)" }}>Услуги</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedServices.map((s: any) => (
                  <span key={s.id} className="px-2 py-0.5 rounded-full text-xs"
                    style={{ background: "hsl(335 80% 60% / 0.1)", color: "hsl(335 70% 45%)" }}>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
            {[
              { label: "Мастер", val: selectedMaster?.name || "Любой свободный" },
              { label: "День", val: `${wDays[selectedDay]?.day}, ${wDays[selectedDay]?.date} ${wDays[selectedDay]?.month}` },
              { label: "Время", val: selectedTime },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>{item.label}</span>
                <span className="font-medium text-sm" style={{ color: "hsl(335 50% 30%)" }}>{item.val}</span>
              </div>
            ))}
            {client && (
              <div className="flex justify-between items-center pt-2" style={{ borderTop: "1px solid hsl(335 30% 92%)" }}>
                <span className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>Клиент</span>
                <span className="font-medium text-sm" style={{ color: "hsl(335 50% 30%)" }}>{client.name} · {client.phone}</span>
              </div>
            )}
          </div>

          {/* Выбор мессенджера для подтверждения */}
          <div className="mb-4">
            <p className="text-xs font-medium mb-2" style={{ color: "hsl(335 40% 55%)" }}>Получить подтверждение через:</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "whatsapp" as const, label: "WhatsApp", emoji: "💚", color: "hsl(142 60% 45%)" },
                { id: "telegram" as const, label: "Telegram", emoji: "✈️", color: "hsl(200 80% 50%)" },
                { id: "vk" as const, label: "ВКонтакте", emoji: "🔵", color: "hsl(214 60% 50%)" },
              ].map(m => (
                <button key={m.id} onClick={() => setMessenger(messenger === m.id ? null : m.id)}
                  className="py-3 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all"
                  style={messenger === m.id
                    ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white", border: "none" }
                    : { background: "white", color: "hsl(335 50% 40%)", border: "1px solid hsl(335 40% 88%)" }}>
                  <span className="text-lg">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
            {messenger && (
              <p className="text-xs mt-2 text-center" style={{ color: "hsl(335 30% 60%)" }}>
                Подтверждение придёт в {messenger === "whatsapp" ? "WhatsApp" : messenger === "telegram" ? "Telegram" : "ВКонтакте"} после записи
              </p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}

          <button
            onClick={handleConfirm}
            disabled={loading || !client}
            className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg transition-all"
            style={client
              ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }
              : { background: "hsl(335 20% 90%)", color: "hsl(335 20% 65%)" }}>
            {loading ? "Отправляем..." : "Подтвердить запись 🌸"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ПРОФИЛЬ / ВХОД / РЕГИСТРАЦИЯ ───────────────────────────────────────────

function ProfilePage({ client, onLogin, onLogout, setPage }: { client: any; onLogin: (c: any) => void; onLogout: () => void; setPage: (p: Page) => void }) {
  const [mode, setMode] = useState<"auth" | "register">("auth");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 1) return digits ? "+7" : "";
    const d = digits.startsWith("7") ? digits.slice(1) : digits;
    let result = "+7";
    if (d.length > 0) result += " (" + d.slice(0, 3);
    if (d.length >= 3) result += ") " + d.slice(3, 6);
    if (d.length >= 6) result += "-" + d.slice(6, 8);
    if (d.length >= 8) result += "-" + d.slice(8, 10);
    return result;
  };

  const handleSubmit = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 11) { setError("Введите корректный номер телефона"); return; }
    if (mode === "register" && !name.trim()) { setError("Введите имя"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode === "register" ? "register" : "login", phone: "+" + digits, name: name.trim(), birthdate: birthdate || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        onLogin(data.client);
      } else {
        setError(data.error || "Ошибка. Попробуйте снова.");
      }
    } catch {
      setError("Ошибка соединения. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  if (!client) {
    return (
      <div className="animate-fade-in">
        <div className="px-4 pt-12 pb-6">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg"
              style={{ background: "rgba(255,255,255,0.95)" }}>
              <img src={LOGO_IMG} alt="Girly Paradise" className="w-full h-full object-contain p-2" />
            </div>
          </div>
          <h1 className="text-2xl font-oswald font-bold text-center mb-1" style={{ color: "hsl(335 60% 30%)" }}>
            {mode === "auth" ? "Вход в личный кабинет" : "Регистрация"}
          </h1>
          <p className="text-sm text-center mb-6" style={{ color: "hsl(335 30% 55%)" }}>
            {mode === "auth" ? "Введи номер телефона чтобы войти" : "Заполни данные для регистрации"}
          </p>

          <div className="flex rounded-2xl overflow-hidden mb-6" style={{ background: "hsl(335 30% 92%)" }}>
            <button onClick={() => { setMode("auth"); setError(""); }} className="flex-1 py-3 text-sm font-semibold transition-all"
              style={mode === "auth" ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" } : { color: "hsl(335 40% 60%)" }}>
              Вход
            </button>
            <button onClick={() => { setMode("register"); setError(""); }} className="flex-1 py-3 text-sm font-semibold transition-all"
              style={mode === "register" ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" } : { color: "hsl(335 40% 60%)" }}>
              Регистрация
            </button>
          </div>

          <div className="space-y-3">
            {mode === "register" && (
              <>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "hsl(335 40% 55%)" }}>Имя</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Введи своё имя"
                    className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
                    style={{ background: "white", border: "1.5px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "hsl(335 40% 55%)" }}>
                    Дата рождения <span style={{ color: "hsl(335 30% 70%)" }}>(по желанию)</span>
                  </label>
                  <input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
                    style={{ background: "white", border: "1.5px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }} />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "hsl(335 40% 55%)" }}>Номер телефона</label>
              <input
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="+7 (___) ___-__-__"
                type="tel"
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
                style={{ background: "white", border: "1.5px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }}
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-5 w-full py-4 rounded-2xl font-semibold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
            {loading ? "Подождите..." : mode === "auth" ? "Войти" : "Зарегистрироваться"}
          </button>
        </div>
      </div>
    );
  }

  return <ProfileDashboard client={client} onLogout={onLogout} setPage={setPage} />;
}

function ProfileDashboard({ client, onLogout, setPage }: { client: any; onLogout: () => void; setPage: (p: Page) => void }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "done" | "orders">("upcoming");
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<number | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(localStorage.getItem("gp_avatar_" + client.id) || "");
  const [showShare, setShowShare] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const [soundOn, setSoundOn] = useState(isClientSoundEnabled());
  const siteUrl = window.location.href;

  const loadShopOrders = () => {
    if (!client?.id) return;
    setLoadingOrders(true);
    adminPost("shop_orders", { action: "client_orders", client_id: client.id })
      .then(d => { setShopOrders(d.orders || []); setLoadingOrders(false); })
      .catch(() => setLoadingOrders(false));
  };

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("gp_bookings_" + client.id) || "[]");
    setBookings(stored);
    setLoadingHistory(false);
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [client.id]);

  // Подгружаем заказы магазина при переключении на вкладку
  useEffect(() => {
    if (tab === "orders" && shopOrders.length === 0) loadShopOrders();
  }, [tab]);

  const filtered = bookings.filter((b: any) => b.status === tab);

  // Загрузка фото из галереи телефона
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setAvatarUrl(url);
      localStorage.setItem("gp_avatar_" + client.id, url);
    };
    reader.readAsDataURL(file);
  };

  // Поделиться — показываем выбор мессенджеров
  const shareLinks = [
    { label: "WhatsApp", emoji: "💚", url: `https://wa.me/?text=${encodeURIComponent("Записывайся на косметологические процедуры в Girly Paradise! " + siteUrl)}` },
    { label: "Telegram", emoji: "✈️", url: `https://t.me/share/url?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent("Girly Paradise Beauty Apartments — запись онлайн!")}` },
    { label: "ВКонтакте", emoji: "🔵", url: `https://vk.com/share.php?url=${encodeURIComponent(siteUrl)}&title=${encodeURIComponent("Girly Paradise")}` },
    { label: "Скопировать", emoji: "📋", url: "" },
  ];

  const handleShareLink = async (link: typeof shareLinks[0]) => {
    if (!link.url) {
      await navigator.clipboard.writeText(siteUrl);
      alert("Ссылка скопирована!");
    } else {
      window.open(link.url, "_blank");
    }
    setShowShare(false);
    // Уведомляем владельца о поделиться
    adminPost("notify_owner", {
      event_type: "share",
      message: `Girly Paradise: клиент ${client.name} поделился сайтом через ${link.label}!`,
    }).catch(() => {});
  };

  // Добавить на экран
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
    } else {
      // iOS инструкция
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert("Для добавления на экран:\n1. Нажми кнопку «Поделиться» (□↑) в Safari\n2. Выбери «На экран Домой»");
      } else {
        alert("Нажми меню браузера (⋮) → «Установить приложение» или «Добавить на главный экран»");
      }
    }
  };

  const handleSendReview = async () => {
    if (!reviewText.trim()) return;
    // Отправляем в чат как сообщение с отзывом
    await adminPost("broadcast", { message: `⭐ Отзыв от ${client.name} (${client.phone}): ${reviewText}`, channels: ["chat"] });
    setReviewSent(true);
    setTimeout(() => { setShowReview(false); setReviewText(""); setReviewSent(false); }, 2000);
  };

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-4">
        {/* Аватар + имя */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold text-white shadow-md"
                style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : "🌸"}
              </div>
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "hsl(335 80% 58%)", border: "2px solid white" }}>
                <Icon name="Camera" size={10} className="text-white" />
              </div>
            </label>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-oswald font-bold" style={{ color: "hsl(335 60% 30%)" }}>{client.name}</h2>
            <p className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>{client.phone}</p>
            <p className="text-xs mt-0.5" style={{ color: "hsl(335 50% 65%)" }}>Нажми на фото чтобы изменить</p>
          </div>
          <button onClick={onLogout} className="px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
            Выйти
          </button>
        </div>

        {/* Кнопки действий */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button onClick={() => setPage("booking")}
            className="py-3.5 rounded-2xl font-semibold text-white shadow-md text-sm"
            style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
            🌸 Записаться
          </button>
          <button onClick={() => setPage("chat")}
            className="py-3.5 rounded-2xl font-semibold text-sm"
            style={{ background: "white", color: "hsl(335 70% 45%)", border: "1.5px solid hsl(335 70% 80%)" }}>
            💬 Написать нам
          </button>
        </div>

        {/* Кнопки Share / Install / Отзыв / ВКонтакте / Звук */}
        <div className="grid grid-cols-5 gap-1.5 mb-5">
          <button onClick={() => setShowShare(!showShare)}
            className="py-2.5 rounded-2xl text-[10px] font-medium flex flex-col items-center gap-1"
            style={{ background: "hsl(335 50% 96%)", color: "hsl(335 60% 45%)", border: "1px solid hsl(335 50% 85%)" }}>
            <Icon name="Share2" size={15} />
            Поделиться
          </button>
          <button onClick={handleInstall}
            className="py-2.5 rounded-2xl text-[10px] font-medium flex flex-col items-center gap-1"
            style={{ background: "hsl(335 50% 96%)", color: "hsl(335 60% 45%)", border: "1px solid hsl(335 50% 85%)" }}>
            <Icon name="Smartphone" size={15} />
            На экран
          </button>
          <button onClick={() => setShowReview(!showReview)}
            className="py-2.5 rounded-2xl text-[10px] font-medium flex flex-col items-center gap-1"
            style={{ background: "hsl(335 50% 96%)", color: "hsl(335 60% 45%)", border: "1px solid hsl(335 50% 85%)" }}>
            <Icon name="Star" size={15} />
            Отзыв
          </button>
          <a href="https://vk.ru/world_of_galis" target="_blank" rel="noopener noreferrer"
            className="py-2.5 rounded-2xl text-[10px] font-medium flex flex-col items-center gap-1"
            style={{ background: "hsl(215 80% 96%)", color: "hsl(215 70% 45%)", border: "1px solid hsl(215 60% 85%)" }}>
            <Icon name="ExternalLink" size={15} style={{ color: "hsl(215 70% 45%)" }} />
            ВКонтакте
          </a>
          <button onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            setClientSound(next);
            if (next) playWelcomeSound(0.3);
          }}
            className="py-2.5 rounded-2xl text-[10px] font-medium flex flex-col items-center gap-1"
            style={soundOn
              ? { background: "hsl(142 60% 94%)", color: "hsl(142 60% 35%)", border: "1px solid hsl(142 50% 80%)" }
              : { background: "hsl(335 10% 94%)", color: "hsl(335 10% 55%)", border: "1px solid hsl(335 10% 85%)" }}>
            <Icon name={soundOn ? "Volume2" : "VolumeX"} size={15} />
            {soundOn ? "Звук вкл" : "Звук выкл"}
          </button>
        </div>

        {/* Пуш-уведомления для клиента */}
        {!isPushEnabled() && (
          <button
            onClick={async () => {
              const ok = await registerPush();
              if (ok) {
                await showPushNotification("Girly Paradise 🌸", "Отлично! Теперь вы будете первыми узнавать об акциях и новостях салона.");
              } else {
                alert("Разреши уведомления в настройках браузера");
              }
            }}
            className="w-full py-3 rounded-2xl text-sm font-semibold mb-4 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, hsl(270 60% 58%), hsl(300 60% 62%))", color: "white", boxShadow: "0 3px 12px hsl(270 60% 70% / 0.4)" }}>
            <Icon name="Bell" size={16} className="text-white" />
            Включить уведомления 📲
          </button>
        )}
        {isPushEnabled() && (
          <div className="w-full py-2.5 rounded-2xl text-xs font-medium text-center mb-4"
            style={{ background: "hsl(142 60% 94%)", color: "hsl(142 60% 35%)" }}>
            ✅ Уведомления включены
          </div>
        )}

        {/* Поделиться — выбор мессенджера */}
        {showShare && (
          <div className="card-glow rounded-2xl p-4 mb-4 animate-slide-up">
            <p className="text-xs font-medium mb-3" style={{ color: "hsl(335 40% 55%)" }}>Поделиться через:</p>
            <div className="grid grid-cols-2 gap-2">
              {shareLinks.map(link => (
                <button key={link.label} onClick={() => handleShareLink(link)}
                  className="flex items-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium"
                  style={{ background: "hsl(335 80% 98%)", color: "hsl(335 60% 35%)", border: "1px solid hsl(335 50% 88%)" }}>
                  <span className="text-lg">{link.emoji}</span>
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Форма отзыва */}
        {showReview && (
          <div className="card-glow rounded-2xl p-4 mb-4 animate-slide-up">
            <p className="text-xs font-medium mb-2" style={{ color: "hsl(335 40% 55%)" }}>Ваш отзыв:</p>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} rows={3}
              placeholder="Расскажите о вашем визите..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none mb-3"
              style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }} />
            <button onClick={handleSendReview} disabled={!reviewText.trim()}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm"
              style={reviewText.trim() ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" } : { background: "hsl(335 20% 90%)", color: "hsl(335 20% 65%)" }}>
              {reviewSent ? "Спасибо! ✓" : "Отправить отзыв"}
            </button>
          </div>
        )}

        {/* Табы: История + Заказы */}
        <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden mb-4" style={{ background: "hsl(335 30% 92%)" }}>
          <button onClick={() => setTab("upcoming")} className="py-2.5 text-xs font-semibold transition-all"
            style={tab === "upcoming" ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" } : { color: "hsl(335 40% 60%)" }}>
            Предстоящие
          </button>
          <button onClick={() => setTab("done")} className="py-2.5 text-xs font-semibold transition-all"
            style={tab === "done" ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" } : { color: "hsl(335 40% 60%)" }}>
            Были у нас
          </button>
          <button onClick={() => setTab("orders")} className="py-2.5 text-xs font-semibold transition-all relative"
            style={tab === "orders" ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" } : { color: "hsl(335 40% 60%)" }}>
            Заказы 🛍
            {shopOrders.some((o: any) => o.status === "shipped") && tab !== "orders" && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-400" />
            )}
          </button>
        </div>

        {/* История посещений */}
        {(tab === "upcoming" || tab === "done") && (
          <div className="space-y-3 pb-4">
            {loadingHistory && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
            {!loadingHistory && filtered.length === 0 && (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">✨</div>
                <p className="font-medium mb-1" style={{ color: "hsl(335 50% 40%)" }}>
                  {tab === "upcoming" ? "Нет предстоящих записей" : "История пока пуста"}
                </p>
                <p className="text-sm mb-4" style={{ color: "hsl(335 30% 60%)" }}>
                  {tab === "upcoming" ? "Запишись на процедуру прямо сейчас!" : "Запишись на первую процедуру!"}
                </p>
                <button onClick={() => setPage("booking")}
                  className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
                  style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
                  Записаться
                </button>
              </div>
            )}
            {filtered.map((b: any, i: number) => (
              <div key={b.id} className="card-glow rounded-2xl p-4 animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-sm leading-tight" style={{ color: "hsl(335 50% 30%)" }}>
                      {Array.isArray(b.services) ? b.services.join(", ") : (b.service || "Процедура")}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "hsl(335 30% 60%)" }}>{b.master || "Галина Сиплатова"}</div>
                  </div>
                  <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                    style={b.status === "upcoming"
                      ? { background: "hsl(335 80% 60% / 0.12)", color: "hsl(335 80% 50%)", border: "1px solid hsl(335 80% 80%)" }
                      : { background: "hsl(335 20% 93%)", color: "hsl(335 30% 65%)" }}>
                    {b.status === "upcoming" ? "Скоро" : "Были"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: "hsl(335 30% 60%)" }}>
                  <span className="flex items-center gap-1"><Icon name="Calendar" size={11} />{b.day}</span>
                  <span className="flex items-center gap-1"><Icon name="Clock" size={11} />{b.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Заказы из магазина */}
        {tab === "orders" && (
          <div className="space-y-3 pb-4">
            <button onClick={loadShopOrders} className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "hsl(335 60% 55%)" }}>
              <Icon name="RefreshCw" size={12} /> Обновить
            </button>
            {loadingOrders && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
            {!loadingOrders && shopOrders.length === 0 && (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🛍</div>
                <p className="font-medium mb-1" style={{ color: "hsl(335 50% 40%)" }}>Заказов пока нет</p>
                <button onClick={() => setPage("shop")}
                  className="mt-3 px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
                  style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
                  В магазин
                </button>
              </div>
            )}
            {shopOrders.map((o: any) => {
              const STATUS_LABELS: Record<string, string> = {
                new: "🆕 Новый", confirmed: "✅ Подтверждён",
                shipped: "🚚 В пути", done: "✔ Получен", cancelled: "❌ Отменён",
              };
              const STATUS_BG: Record<string, string> = {
                new: "hsl(200 80% 95%)", confirmed: "hsl(142 60% 94%)",
                shipped: "hsl(30 80% 95%)", done: "hsl(142 60% 94%)", cancelled: "hsl(0 60% 96%)",
              };
              const STATUS_COLOR: Record<string, string> = {
                new: "hsl(200 70% 40%)", confirmed: "hsl(142 60% 35%)",
                shipped: "hsl(30 70% 40%)", done: "hsl(142 60% 30%)", cancelled: "hsl(0 60% 50%)",
              };
              return (
                <div key={o.id} className="card-glow rounded-2xl p-4">
                  {/* Шапка заказа */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: "hsl(335 50% 28%)" }}>
                        Заказ #{o.id}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "hsl(335 30% 58%)" }}>
                        {new Date(o.created_at).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: STATUS_BG[o.status] || "hsl(335 20% 95%)", color: STATUS_COLOR[o.status] || "hsl(335 40% 55%)" }}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </div>

                  {/* Товары */}
                  <div className="space-y-1 mb-3">
                    {(o.items || []).map((it: any) => (
                      <div key={it.id} className="flex justify-between text-xs" style={{ color: "hsl(335 30% 58%)" }}>
                        <span>{it.product_name} × {it.quantity}</span>
                        <span className="font-medium">{(it.price * it.quantity).toLocaleString()} ₽</span>
                      </div>
                    ))}
                  </div>

                  {/* Итого */}
                  <div className="flex justify-between items-center mb-3 pt-2 border-t" style={{ borderColor: "hsl(335 40% 92%)" }}>
                    <span className="text-xs" style={{ color: "hsl(335 30% 58%)" }}>
                      {o.delivery_type?.toUpperCase()} · {o.pickup_point || o.delivery_address}
                    </span>
                    <span className="font-oswald font-bold text-sm" style={{ color: "hsl(335 80% 55%)" }}>
                      {Number(o.total_amount).toLocaleString()} ₽
                    </span>
                  </div>

                  {/* Отслеживание (если есть трек-номер) */}
                  {o.status === "shipped" && (
                    <div className="rounded-xl p-3 mb-3" style={{ background: "hsl(30 80% 97%)", border: "1px solid hsl(30 60% 88%)" }}>
                      <div className="text-xs font-semibold mb-1" style={{ color: "hsl(30 70% 40%)" }}>
                        🚚 Заказ отправлен!
                      </div>
                      {o.tracking_number && (
                        <div className="text-xs" style={{ color: "hsl(30 60% 40%)" }}>
                          Трек-номер: <strong>{o.tracking_number}</strong>
                        </div>
                      )}
                      {o.tracking_url && (
                        <a href={o.tracking_url} target="_blank" rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-1.5 text-xs font-medium"
                          style={{ color: "hsl(200 70% 45%)" }}>
                          <Icon name="ExternalLink" size={12} />
                          Отследить посылку
                        </a>
                      )}
                    </div>
                  )}

                  {/* Кнопка отмены */}
                  {(o.status === "new" || o.status === "confirmed") && (
                    <button
                      disabled={cancellingOrder === o.id}
                      onClick={async () => {
                        if (!window.confirm("Отменить заказ?")) return;
                        setCancellingOrder(o.id);
                        await adminPost("shop_orders", { action: "update_status", id: o.id, status: "cancelled" });
                        setCancellingOrder(null);
                        loadShopOrders();
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-medium"
                      style={{ background: "hsl(0 60% 96%)", color: "hsl(0 60% 50%)", border: "1px solid hsl(0 50% 88%)" }}>
                      {cancellingOrder === o.id ? "Отменяем..." : "❌ Отменить заказ"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ПАНЕЛЬ ВЛАДЕЛЬЦА ────────────────────────────────────────────────────────

type AdminSection = "dashboard" | "clients" | "schedule" | "messages" | "notifications" | "expenses" | "gallery" | "staff" | "settings" | "profile_edit" | "pricelist_edit" | "broadcast" | "analytics" | "masters_edit" | "documents" | "templates" | "site_settings" | "shop_admin" | "sections_editor";

// ── Управление разделами сайта ──
const SECTIONS_KEY = "gp_site_sections";
type SiteSection = { id: string; label: string; icon: string; enabled: boolean; builtIn: boolean };
const DEFAULT_SITE_SECTIONS: SiteSection[] = [
  { id: "gallery", label: "Галерея", icon: "🖼", enabled: true, builtIn: true },
  { id: "pricelist", label: "Прайс-лист", icon: "💅", enabled: true, builtIn: true },
  { id: "masters", label: "Мастера", icon: "👩‍⚕️", enabled: true, builtIn: true },
  { id: "reviews", label: "Отзывы", icon: "⭐", enabled: true, builtIn: true },
  { id: "documents", label: "Документы", icon: "📄", enabled: true, builtIn: true },
  { id: "shop", label: "Магазин", icon: "🛍", enabled: true, builtIn: true },
  { id: "booking", label: "Онлайн-запись", icon: "📅", enabled: true, builtIn: true },
];
function loadSiteSections(): SiteSection[] {
  try {
    const saved = JSON.parse(localStorage.getItem(SECTIONS_KEY) || "null");
    if (!saved) return DEFAULT_SITE_SECTIONS;
    // Мерджим дефолтные builtIn с сохранёнными
    const savedMap = Object.fromEntries(saved.map((s: SiteSection) => [s.id, s]));
    const merged = DEFAULT_SITE_SECTIONS.map(d => savedMap[d.id] ? { ...d, enabled: savedMap[d.id].enabled } : d);
    const custom = saved.filter((s: SiteSection) => !s.builtIn);
    return [...merged, ...custom];
  } catch { return DEFAULT_SITE_SECTIONS; }
}
function saveSiteSections(s: SiteSection[]) { localStorage.setItem(SECTIONS_KEY, JSON.stringify(s)); }

function AdminSectionsEditor() {
  const [sections, setSections] = useState<SiteSection[]>(loadSiteSections());
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("✨");
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const toggle = (id: string) => {
    const next = sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    setSections(next); saveSiteSections(next);
  };

  const addSection = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = `custom_${Date.now()}`;
    const next = [...sections, { id, label, icon: newIcon || "✨", enabled: true, builtIn: false }];
    setSections(next); saveSiteSections(next); setNewLabel(""); setNewIcon("✨");
  };

  const removeSection = (id: string) => {
    const next = sections.filter(s => s.id !== id);
    setSections(next); saveSiteSections(next);
  };

  return (
    <div className="px-4 pb-6">
      <p className="text-xs mb-4" style={PS}>Включай и выключай разделы сайта. Выключенные не видны клиентам на главной странице.</p>

      <div className="space-y-2 mb-6">
        {sections.map(s => (
          <div key={s.id} className="card-glow rounded-2xl p-4 flex items-center gap-3">
            <div className="text-2xl w-9 text-center flex-shrink-0">{s.icon}</div>
            <div className="flex-1">
              <div className="font-semibold text-sm" style={P}>{s.label}</div>
              <div className="text-xs" style={PS}>{s.builtIn ? "Встроенный раздел" : "Пользовательский"}</div>
            </div>
            {/* Тоггл вкл/выкл */}
            <button
              onClick={() => toggle(s.id)}
              className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
              style={{ background: s.enabled ? "hsl(335 80% 58%)" : "hsl(335 20% 82%)" }}>
              <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                style={{ left: s.enabled ? 26 : 2 }} />
            </button>
            {/* Удалить (только для кастомных) */}
            {!s.builtIn && (
              <button onClick={() => removeSection(s.id)}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 55%)" }}>
                <Icon name="X" size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Создать новый раздел */}
      <div className="card-glow rounded-2xl p-4 space-y-3">
        <div className="font-semibold text-sm" style={P}>Создать новый раздел</div>
        <div className="flex gap-2">
          <input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="✨"
            className="w-14 px-2 py-2.5 rounded-xl text-center text-lg outline-none flex-shrink-0" style={inp} />
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addSection()}
            placeholder="Название раздела..." autoComplete="off"
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
        </div>
        <button onClick={addSection} disabled={!newLabel.trim()}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
          + Создать раздел
        </button>
      </div>
    </div>
  );
}

const P = { color: "hsl(335 50% 30%)" };
const PS = { color: "hsl(335 30% 60%)" };
const GRAD = { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" };

const ADMIN_SESSION_KEY = "gp_admin_session";

function saveAdminSession(s: any) { localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(s)); }
function loadAdminSession(): any | null {
  try { return JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || "null"); } catch { return null; }
}
function clearAdminSession() { localStorage.removeItem(ADMIN_SESSION_KEY); }

function AdminPage({ onBack }: { onBack: () => void }) {
  const [adminUser, setAdminUser] = useState<any>(loadAdminSession());
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [badges, setBadges] = useState<{ unread_msgs: number; new_orders: number; new_bookings: number }>({ unread_msgs: 0, new_orders: 0, new_bookings: 0 });
  const prevNewBookings = React.useRef(0);

  const loadBadges = () => adminPost("badge_counts").then(d => {
    setBadges(d);
    // Звук при появлении новой записи
    if (d.new_bookings > prevNewBookings.current && prevNewBookings.current >= 0) {
      if (prevNewBookings.current < d.new_bookings) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          [[523, 0], [659, 0.15], [784, 0.30]].forEach(([freq, delay]) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "sine"; osc.frequency.value = freq;
            const t = ctx.currentTime + delay;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.start(t); osc.stop(t + 0.55);
          });
        } catch { /* silent */ }
      }
    }
    prevNewBookings.current = d.new_bookings;
  }).catch(() => {});

  useEffect(() => {
    if (adminUser) {
      adminPost("stats").then(d => setStats(d)).catch(() => {});
      loadBadges();
      // Обновляем бейджи каждые 20 секунд
      const interval = setInterval(loadBadges, 20000);
      return () => clearInterval(interval);
    }
  }, [adminUser]);

  const handleLogin = (user: any) => { saveAdminSession(user); setAdminUser(user); };
  const handleLogout = () => { clearAdminSession(); setAdminUser(null); setSection("dashboard"); };

  if (!adminUser) return <AdminPinScreen onSuccess={handleLogin} onBack={onBack} />;

  const isOwner = adminUser.role === "owner";

  const menuItems: { id: AdminSection; icon: string; label: string; color: string; ownerOnly?: boolean }[] = [
    { id: "schedule", icon: "CalendarDays", label: "Расписание", color: "from-blue-500 to-indigo-500" },
    { id: "clients", icon: "Users", label: "Клиенты", color: "from-purple-500 to-pink-500" },
    { id: "notifications", icon: "Bell", label: "Уведомления", color: "from-orange-500 to-amber-500", ownerOnly: true },
    { id: "expenses", icon: "Wallet", label: "Финансы", color: "from-red-500 to-orange-500", ownerOnly: true },
    { id: "gallery", icon: "Images", label: "Галерея", color: "from-violet-500 to-purple-500" },
    { id: "pricelist_edit", icon: "ClipboardList", label: "Прайс", color: "from-pink-500 to-rose-500", ownerOnly: true },
    { id: "shop_admin", icon: "ShoppingBag", label: "Магазин", color: "from-pink-500 to-rose-400", ownerOnly: true },
    { id: "site_settings", icon: "Paintbrush", label: "Оформление", color: "from-fuchsia-500 to-pink-500", ownerOnly: true },
    { id: "documents", icon: "FileText", label: "Документы", color: "from-amber-500 to-yellow-500", ownerOnly: true },
    { id: "sections_editor", icon: "LayoutDashboard", label: "Разделы сайта", color: "from-teal-500 to-cyan-500", ownerOnly: true },
    { id: "settings", icon: "Settings", label: "Настройки", color: "from-gray-500 to-slate-500", ownerOnly: true },
  ];

  const visibleMenu = isOwner ? menuItems : menuItems.filter(m => !m.ownerOnly);
  const currentLabel = section === "dashboard" ? "Панель управления" : (menuItems.find(m => m.id === section)?.label ?? "Разделы сайта");

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={section === "dashboard" ? onBack : () => setSection("dashboard")}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
          <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-oswald font-bold" style={P}>{currentLabel}</h1>
          <p className="text-xs" style={PS}>{adminUser.name} · {adminUser.role === "owner" ? "Владелец 👑" : "Специалист"}</p>
        </div>
        <button onClick={handleLogout} className="px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
          Выйти
        </button>
      </div>

      {section === "dashboard" && (
        <div className="px-4 pb-6">
          {/* Новые записи — баннер при наличии */}
          {badges.new_bookings > 0 && (
            <button
              onClick={() => { setSection("schedule"); adminPost("badge_counts", { action: "mark_bookings_seen" }); setBadges(b => ({ ...b, new_bookings: 0 })); }}
              className="w-full py-3.5 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2.5 text-sm mb-3 relative animate-pulse"
              style={{ background: "linear-gradient(135deg, hsl(142 70% 42%), hsl(160 65% 38%))", color: "white", boxShadow: "0 4px 16px hsl(142 70% 50% / 0.4)" }}>
              <Icon name="CalendarCheck" size={18} className="text-white" />
              {badges.new_bookings === 1 ? "1 новая запись!" : `${badges.new_bookings} новых записи!`}
              <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center text-white"
                style={{ background: "hsl(0 80% 55%)" }}>
                {badges.new_bookings}
              </span>
            </button>
          )}

          {/* Кнопки главных действий */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setSection("schedule")}
              className="py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 text-sm relative"
              style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", boxShadow: "0 4px 16px hsl(335 80% 65% / 0.4)" }}>
              <Icon name="CalendarPlus" size={18} className="text-white" />
              Записать клиента
            </button>
            <button
              onClick={() => { setSection("messages"); loadBadges(); }}
              className="py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 text-sm relative"
              style={{ background: "white", color: "hsl(335 70% 45%)", border: "2px solid hsl(335 70% 78%)", boxShadow: "0 4px 16px hsl(335 50% 85% / 0.5)" }}>
              <Icon name="MessageCircle" size={18} style={{ color: "hsl(335 70% 45%)" }} />
              Сообщения
              {badges.unread_msgs > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center text-white z-10"
                  style={{ background: "hsl(0 80% 55%)" }}>
                  {badges.unread_msgs > 99 ? "99+" : badges.unread_msgs}
                </span>
              )}
            </button>
          </div>
          {/* Заказы магазина */}
          {isOwner && (
            <button
              onClick={() => { setSection("shop_admin"); loadBadges(); }}
              className="w-full py-3 rounded-2xl font-semibold shadow flex items-center justify-center gap-2 text-sm mb-4 relative"
              style={{ background: "linear-gradient(135deg, hsl(315 70% 65%), hsl(270 60% 62%))", color: "white", boxShadow: "0 3px 12px hsl(315 70% 75% / 0.4)" }}>
              <Icon name="ShoppingBag" size={17} className="text-white" />
              Заказы магазина
              {badges.new_orders > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center text-white z-10"
                  style={{ background: "hsl(0 80% 55%)" }}>
                  {badges.new_orders > 99 ? "99+" : badges.new_orders}
                </span>
              )}
            </button>
          )}

          {/* Краткая сводка на главной */}
          {isOwner && stats && (
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: "Клиентов", val: stats.clients_total, icon: "Users", color: "from-purple-500 to-pink-500" },
                { label: "Записей", val: stats.bookings_total, icon: "CalendarCheck", color: "from-blue-500 to-indigo-500" },
                { label: "В расп.", val: stats.schedule_total, icon: "Clock", color: "from-teal-500 to-cyan-500" },
              ].map(item => (
                <button key={item.label} onClick={() => setSection("analytics")}
                  className="card-glow rounded-2xl p-3 text-left hover:scale-105 transition-all">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-2`}>
                    <Icon name={item.icon as any} size={14} className="text-white" />
                  </div>
                  <div className="text-xl font-oswald font-bold" style={{ color: "hsl(335 80% 55%)" }}>{item.val}</div>
                  <div className="text-[10px] leading-tight" style={PS}>{item.label}</div>
                </button>
              ))}
            </div>
          )}
          {!isOwner && (
            <div className="card-glow rounded-2xl p-5 mb-5 text-center">
              <div className="text-3xl mb-2">🌸</div>
              <p className="font-semibold text-sm" style={P}>Добро пожаловать, {adminUser.name}!</p>
              <p className="text-xs mt-1" style={PS}>Используй меню ниже для работы с записями</p>
            </div>
          )}
          {!stats && isOwner && <div className="text-center py-4"><div className="text-3xl animate-float">🌸</div></div>}

          <h2 className="text-base font-oswald font-semibold mb-3" style={P}>Разделы</h2>
          <div className="grid grid-cols-2 gap-3">
            {visibleMenu.map(item => (
              <button key={item.id} onClick={() => setSection(item.id)}
                className="card-glow rounded-2xl p-4 text-left hover:scale-105 transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                  <Icon name={item.icon as any} size={18} className="text-white" />
                </div>
                <div className="font-semibold text-sm" style={P}>{item.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {section === "clients" && <AdminClients />}
      {section === "schedule" && <AdminSchedule />}
      {section === "messages" && <AdminMessages />}
      {section === "notifications" && isOwner && <AdminNotificationsHub />}
      {/* Финансы = расходы + доходы + сводка + статистика */}
      {section === "expenses" && isOwner && <AdminFinanceHub />}
      {section === "gallery" && <AdminGalleryFolders />}
      {section === "pricelist_edit" && isOwner && <AdminPricelistEditor />}
      {section === "shop_admin" && isOwner && <AdminShop />}
      {section === "site_settings" && isOwner && <AdminSiteSettings />}
      {section === "documents" && isOwner && <AdminDocuments />}
      {section === "sections_editor" && isOwner && <AdminSectionsEditor />}
      {/* Настройки теперь содержат сотрудников */}
      {section === "settings" && isOwner && <AdminSettingsHub currentStaffId={adminUser.id} />}
      {section === "profile_edit" && isOwner && <AdminProfile onLogout={handleLogout} />}
    </div>
  );
}

// ── Документы и сертификаты ──
function AdminDocuments() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", file_url: "", doc_type: "certificate" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const load = () => adminPost("documents").then(d => { setDocs(d.documents || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title || !form.file_url) return;
    setSaving(true);
    await adminPost("documents", { action: "add", ...form });
    setForm({ title: "", description: "", file_url: "", doc_type: "certificate" });
    setAdding(false); setSaving(false); load();
  };

  const toggle = async (id: number) => { await adminPost("documents", { action: "toggle", id }); load(); };

  const DOC_TYPES = [
    { id: "certificate", label: "Сертификат" },
    { id: "license", label: "Лицензия" },
    { id: "diploma", label: "Диплом" },
    { id: "other", label: "Другое" },
  ];

  const isImg = (url: string) => /\.(jpg|jpeg|png|webp|gif)/i.test(url);

  return (
    <div className="px-4 pb-6">
      <p className="text-xs mb-3" style={PS}>Сертификаты и документы отображаются клиентам на сайте</p>
      {!adding && (
        <button onClick={() => setAdding(true)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
          + Добавить документ
        </button>
      )}
      {adding && (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Название</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Сертификат косметолога" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Описание (необязательно)</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Выдан в 2024 году" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Тип</label>
            <div className="flex gap-2 flex-wrap">
              {DOC_TYPES.map(t => (
                <button key={t.id} onClick={() => setForm(p => ({ ...p, doc_type: t.id }))}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={form.doc_type === t.id ? { ...GRAD, color: "white" } : { background: "white", color: "hsl(335 50% 55%)", border: "1px solid hsl(335 50% 85%)" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Фото/скан документа</label>
            <PhotoUploadButton folder="documents" label="📷 Загрузить с телефона" uploading={uploading}
              setUploading={setUploading} onUploaded={url => setForm(p => ({ ...p, file_url: url }))} className="w-full mb-2" />
            {form.file_url && isImg(form.file_url) && (
              <img src={form.file_url} className="w-full h-44 object-cover rounded-xl mt-2" alt="preview" />
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || uploading || !form.title || !form.file_url}
              className="flex-1 py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
              {saving ? "Сохраняем..." : "Добавить"}
            </button>
            <button onClick={() => { setAdding(false); setForm({ title: "", description: "", file_url: "", doc_type: "certificate" }); }}
              className="px-4 py-3 rounded-xl text-sm" style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="space-y-3">
        {docs.map(doc => (
          <div key={doc.id} className="card-glow rounded-2xl overflow-hidden" style={!doc.is_active ? { opacity: 0.5 } : {}}>
            {isImg(doc.file_url) && (
              <img src={doc.file_url} className="w-full h-40 object-cover" alt={doc.title} />
            )}
            <div className="p-4 flex items-start gap-3">
              <div className="flex-1">
                <div className="font-semibold text-sm" style={P}>{doc.title}</div>
                <div className="text-xs mt-0.5" style={PS}>{DOC_TYPES.find(t => t.id === doc.doc_type)?.label}</div>
                {doc.description && <div className="text-xs mt-1" style={PS}>{doc.description}</div>}
              </div>
              <button onClick={() => toggle(doc.id)} className="px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0"
                style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
                {doc.is_active ? "Скрыть" : "Показать"}
              </button>
            </div>
          </div>
        ))}
        {!loading && docs.length === 0 && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm" style={PS}>Документов пока нет</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Статистика (отдельный раздел) ──
function AdminAnalytics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const MONTH_NAMES = ["", "Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

  useEffect(() => {
    Promise.all([
      adminPost("stats"),
      adminPost("monthly_finance"),
    ]).then(([s, mf]) => {
      setStats({ ...s, months: mf.months || [] });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16"><div className="text-4xl animate-float">🌸</div></div>;
  if (!stats) return null;

  const maxIncome = Math.max(...(stats.months || []).map((m: any) => Number(m.total_income) || 0), 1);

  return (
    <div className="px-4 pb-6 space-y-5">
      {/* Записи */}
      <div>
        <h2 className="text-sm font-oswald font-semibold mb-3 uppercase tracking-wider" style={PS}>📅 Записи</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Всего", val: stats.bookings_total, icon: "CalendarCheck", color: "from-blue-500 to-indigo-500" },
            { label: "За месяц", val: stats.bookings_month, icon: "TrendingUp", color: "from-cyan-500 to-blue-500" },
            { label: "В расписании", val: stats.schedule_total, icon: "Clock", color: "from-teal-500 to-cyan-500" },
          ].map(item => (
            <div key={item.label} className="card-glow rounded-2xl p-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-2`}>
                <Icon name={item.icon as any} size={14} className="text-white" />
              </div>
              <div className="text-xl font-oswald font-bold" style={{ color: "hsl(335 80% 55%)" }}>{item.val}</div>
              <div className="text-[10px]" style={PS}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Клиенты */}
      <div>
        <h2 className="text-sm font-oswald font-semibold mb-3 uppercase tracking-wider" style={PS}>👥 Клиенты</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Всего клиентов", val: stats.clients_total, icon: "Users", color: "from-purple-500 to-pink-500" },
            { label: "Новых за месяц", val: `+${stats.clients_month}`, icon: "UserPlus", color: "from-fuchsia-500 to-purple-500" },
          ].map(item => (
            <div key={item.label} className="card-glow rounded-2xl p-4">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-2`}>
                <Icon name={item.icon as any} size={16} className="text-white" />
              </div>
              <div className="text-2xl font-oswald font-bold" style={{ color: "hsl(335 80% 55%)" }}>{item.val}</div>
              <div className="text-xs" style={PS}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Финансы */}
      <div>
        <h2 className="text-sm font-oswald font-semibold mb-3 uppercase tracking-wider" style={PS}>💰 Финансы</h2>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Расх/нед", val: `${(stats.expenses_week||0).toLocaleString()} ₽`, icon: "TrendingDown", color: "from-red-400 to-orange-400" },
            { label: "Расх/мес", val: `${(stats.expenses_month||0).toLocaleString()} ₽`, icon: "Wallet", color: "from-orange-400 to-amber-400" },
            { label: "Расх итог", val: `${(stats.expenses_total||0).toLocaleString()} ₽`, icon: "PiggyBank", color: "from-pink-400 to-rose-400" },
          ].map(item => (
            <div key={item.label} className="card-glow rounded-2xl p-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-2`}>
                <Icon name={item.icon as any} size={14} className="text-white" />
              </div>
              <div className="text-sm font-oswald font-bold leading-tight" style={{ color: "hsl(335 80% 55%)" }}>{item.val}</div>
              <div className="text-[10px]" style={PS}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Доходы по месяцам — мини-бар-чарт */}
      {stats.months && stats.months.length > 0 && (
        <div>
          <h2 className="text-sm font-oswald font-semibold mb-3 uppercase tracking-wider" style={PS}>📊 Доходы по месяцам</h2>
          <div className="card-glow rounded-2xl p-4">
            <div className="flex items-end gap-1.5 h-28">
              {[...stats.months].reverse().slice(0, 6).reverse().map((m: any) => {
                const income = Number(m.total_income) || 0;
                const expenses = Number(m.total_expenses) || 0;
                const h = Math.round((income / maxIncome) * 100);
                return (
                  <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[9px] font-bold" style={{ color: income >= expenses ? "hsl(142 60% 40%)" : "hsl(0 60% 50%)" }}>
                      {income > 0 ? `${Math.round(income/1000)}к` : ""}
                    </div>
                    <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(h, 4)}%`, background: income >= expenses ? "hsl(142 60% 50%)" : "hsl(0 60% 55%)" }} />
                    <div className="text-[9px]" style={PS}>{MONTH_NAMES[m.month]}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs" style={PS}>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Доход</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Расход &gt; Дохода</span>
            </div>
          </div>
        </div>
      )}

      {/* Динамика клиентов */}
      {stats.clients_chart && stats.clients_chart.length > 0 && (
        <div>
          <h2 className="text-sm font-oswald font-semibold mb-3 uppercase tracking-wider" style={PS}>📈 Новые клиенты</h2>
          <div className="card-glow rounded-2xl p-4">
            <div className="space-y-2">
              {stats.clients_chart.map((c: any) => (
                <div key={c.mon} className="flex items-center gap-3">
                  <span className="text-xs w-8 text-right" style={PS}>{c.mon}</span>
                  <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "hsl(335 30% 93%)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (c.cnt / Math.max(...stats.clients_chart.map((x: any) => x.cnt), 1)) * 100)}%`, background: "linear-gradient(90deg, hsl(335 80% 60%), hsl(315 70% 65%))" }} />
                  </div>
                  <span className="text-xs font-bold w-6" style={{ color: "hsl(335 80% 55%)" }}>{c.cnt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Редактор мастеров ──
function AdminMastersEditor() {
  const [masters, setMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", spec: "", rating: "5.0", reviews_count: "0", photo_url: "", tags: "" });
  const [saving, setSaving] = useState(false);
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const load = () => adminPost("masters").then(d => { setMasters(d.masters || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ name: "", spec: "", rating: "5.0", reviews_count: "0", photo_url: "", tags: "" });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(p => ({ ...p, photo_url: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    const data = { ...form, rating: parseFloat(form.rating) || 5.0, reviews_count: parseInt(form.reviews_count) || 0 };
    if (editing) {
      await adminPost("masters", { action: "update", id: editing.id, ...data });
      setEditing(null);
    } else {
      await adminPost("masters", { action: "add", ...data });
      setAdding(false);
    }
    resetForm(); setSaving(false); load();
  };

  const toggle = async (id: number) => { await adminPost("masters", { action: "toggle", id }); load(); };
  const startEdit = (m: any) => {
    setForm({ name: m.name, spec: m.spec || "", rating: String(m.rating || 5.0), reviews_count: String(m.reviews_count || 0), photo_url: m.photo_url || "", tags: m.tags || "" });
    setEditing(m); setAdding(false);
  };

  const FormBlock = () => (
    <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
      {[
        { k: "name", l: "Имя мастера", ph: "Имя Фамилия" },
        { k: "spec", l: "Специализация", ph: "Косметолог-эстетист" },
        { k: "rating", l: "Рейтинг (1-5)", ph: "5.0" },
        { k: "reviews_count", l: "Количество отзывов", ph: "0" },
        { k: "tags", l: "Услуги (через запятую)", ph: "СМАС-лифтинг, РФ-лифтинг" },
      ].map(f => (
        <div key={f.k}>
          <label className="text-xs font-medium block mb-1" style={PS}>{f.l}</label>
          <input value={(form as any)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
            placeholder={f.ph} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
        </div>
      ))}
      <div>
        <label className="text-xs font-medium block mb-1" style={PS}>Фото мастера</label>
        <label className="flex items-center gap-3 cursor-pointer">
          {form.photo_url && (
            <img src={form.photo_url} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" alt="preview" onError={e => (e.currentTarget.style.display="none")} />
          )}
          <div className="flex-1 py-2.5 px-4 rounded-xl text-sm text-center font-medium"
            style={{ background: "hsl(335 50% 96%)", color: "hsl(335 60% 45%)", border: "1.5px dashed hsl(335 50% 80%)" }}>
            {form.photo_url ? "Изменить фото" : "📷 Загрузить из телефона"}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </label>
        {form.photo_url && form.photo_url.startsWith("http") && (
          <input value={form.photo_url} onChange={e => setForm(p => ({ ...p, photo_url: e.target.value }))}
            placeholder="или вставь URL" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mt-2" style={inp} />
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
          {saving ? "Сохраняем..." : editing ? "Сохранить" : "Добавить"}
        </button>
        <button onClick={() => { resetForm(); setAdding(false); setEditing(null); }}
          className="px-4 py-3 rounded-xl text-sm" style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
          Отмена
        </button>
      </div>
    </div>
  );

  return (
    <div className="px-4 pb-6">
      <p className="text-xs mb-3" style={PS}>Мастера отображаются клиентам на странице и при записи</p>
      {!adding && !editing && (
        <button onClick={() => setAdding(true)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
          + Добавить мастера
        </button>
      )}
      {(adding || editing) && <FormBlock />}

      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="space-y-3">
        {masters.map(m => (
          <div key={m.id} className="card-glow rounded-2xl p-4" style={!m.is_active ? { opacity: 0.5 } : {}}>
            <div className="flex items-center gap-3">
              {m.photo_url
                ? <img src={m.photo_url} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt={m.name} onError={e => (e.currentTarget.style.display="none")} />
                : <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0" style={GRAD}>{m.name[0]}</div>
              }
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={P}>{m.name}</div>
                <div className="text-xs" style={PS}>{m.spec}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs" style={{ color: "hsl(40 90% 50%)" }}>★ {m.rating}</span>
                  {m.reviews_count > 0 && <span className="text-xs" style={PS}>{m.reviews_count} отз.</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button onClick={() => startEdit(m)} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "hsl(335 50% 95%)", color: "hsl(335 60% 45%)" }}>✏️</button>
                <button onClick={() => toggle(m.id)} className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
                  {m.is_active ? "Скрыть" : "Показ."}
                </button>
              </div>
            </div>
            {m.tags && (
              <div className="flex flex-wrap gap-1 mt-2">
                {m.tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "hsl(335 80% 60% / 0.1)", color: "hsl(335 70% 45%)" }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {!loading && masters.length === 0 && <div className="text-center py-8 text-sm" style={PS}>Мастеров пока нет</div>}
      </div>
    </div>
  );
}

// ── ПИН-ЭКРАН с отпечатком пальца ──
function AdminPinScreen({ onSuccess, onBack }: { onSuccess: (user: any) => void; onBack: () => void }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [fingerprintAttempts, setFingerprintAttempts] = useState(0);
  const [fingerprintSupported, setFingerprintSupported] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    const supported = !!(window.PublicKeyCredential);
    setFingerprintSupported(supported);
    if (supported) {
      tryFingerprint();
    } else {
      setShowPin(true);
    }
  }, []);

  const tryFingerprint = async () => {
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 30000,
          userVerification: "required",
          rpId: window.location.hostname,
          allowCredentials: [],
        } as any,
      });
      // Если отпечаток прошёл — авторизуем как сохранённый владелец
      const savedSession = localStorage.getItem("gp_fingerprint_user");
      if (savedSession) {
        onSuccess(JSON.parse(savedSession));
      } else {
        setError("Отпечаток принят — введи пин однократно для привязки");
        setShowPin(true);
      }
    } catch {
      const next = fingerprintAttempts + 1;
      setFingerprintAttempts(next);
      if (next >= 5) {
        setError("Отпечаток не распознан после 5 попыток — введи пин-код");
        setShowPin(true);
      } else {
        setError(`Отпечаток не распознан (${next}/5)`);
      }
    }
  };

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) setTimeout(() => checkPin(next), 150);
  };

  const checkPin = async (p: string) => {
    setLoading(true);
    try {
      const data = await adminPost("auth", { pin: p });
      if (data.ok) {
        // Если вошёл пин-кодом — сохраняем для отпечатка
        localStorage.setItem("gp_fingerprint_user", JSON.stringify(data.staff));
        onSuccess(data.staff);
      } else {
        setAttempts(a => a + 1);
        setError("Неверный пин-код");
        setPin("");
      }
    } catch {
      setError("Ошибка соединения");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg mb-6" style={{ background: "rgba(255,255,255,0.95)" }}>
        <img src={LOGO_IMG} alt="Girly Paradise" className="w-full h-full object-contain p-1" />
      </div>
      <h1 className="text-2xl font-oswald font-bold mb-1" style={P}>Панель управления</h1>
      <p className="text-sm mb-6" style={PS}>{showPin ? "Введи пин-код" : "Используй отпечаток пальца"}</p>

      {/* Отпечаток пальца */}
      {fingerprintSupported && !showPin && (
        <div className="flex flex-col items-center mb-8">
          <button onClick={tryFingerprint}
            className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg mb-4 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
            <Icon name="Fingerprint" size={44} className="text-white" />
          </button>
          <p className="text-xs text-center max-w-[200px]" style={PS}>Приложи палец к сканеру</p>
          {error && (
            <div className="mt-3 px-4 py-2 rounded-xl text-sm font-medium text-center"
              style={{ background: "hsl(0 80% 96%)", color: "hsl(0 70% 45%)", border: "1px solid hsl(0 60% 88%)" }}>
              {error}
            </div>
          )}
          <button onClick={() => { setShowPin(true); setError(""); }} className="mt-4 text-sm underline" style={PS}>
            Войти по пин-коду
          </button>
        </div>
      )}

      {/* Пин-код */}
      {(showPin || !fingerprintSupported) && (
        <>
          <div className="flex gap-4 mb-6">
            {[0,1,2,3].map(i => (
              <div key={i} className="w-4 h-4 rounded-full border-2 transition-all duration-200"
                style={pin.length > i
                  ? { background: "hsl(335 80% 58%)", borderColor: "hsl(335 80% 58%)" }
                  : { borderColor: "hsl(335 50% 80%)", background: "transparent" }} />
            ))}
          </div>

          {error && (
            <div className="mb-4 px-4 py-2 rounded-xl text-sm font-medium text-center"
              style={{ background: "hsl(0 80% 96%)", color: "hsl(0 70% 45%)", border: "1px solid hsl(0 60% 88%)" }}>
              {error} {attempts >= 3 && "· Подсказка: 2025"}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {digits.map((d, i) => (
              <button key={i}
                onClick={() => { if (d === "⌫") { setPin(p => p.slice(0,-1)); setError(""); } else if (d) handleDigit(d); }}
                disabled={loading || !d}
                className="h-16 rounded-2xl font-oswald font-bold text-2xl transition-all active:scale-95"
                style={d
                  ? { background: "white", color: "hsl(335 60% 30%)", boxShadow: "0 2px 8px hsl(335 30% 85%)", border: "1px solid hsl(335 30% 92%)" }
                  : { background: "transparent" }}>
                {d}
              </button>
            ))}
          </div>

          {fingerprintSupported && (
            <button onClick={() => { setShowPin(false); setError(""); setPin(""); tryFingerprint(); }}
              className="mt-5 flex items-center gap-2 text-sm font-medium"
              style={{ color: "hsl(335 70% 50%)" }}>
              <Icon name="Fingerprint" size={16} /> Попробовать отпечаток
            </button>
          )}
        </>
      )}

      <button onClick={onBack} className="mt-6 text-sm" style={PS}>← Вернуться на главную</button>
    </div>
  );
}

// ── Клиенты ──
function AdminClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "dormant" | "blacklist">("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [discountVal, setDiscountVal] = useState("");
  const [blReason, setBlReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      adminPost("clients", { filter }),
      adminPost("blacklist"),
    ]).then(([cd, bl]) => {
      setClients(cd.clients || []);
      setBlacklist(bl.blacklist || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [filter]);

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  const addToBlacklist = async (c: any) => {
    if (!blReason.trim()) { alert("Укажи причину"); return; }
    setSaving(true);
    await adminPost("blacklist", { action: "add", client_id: c.id, phone: c.phone, name: c.name, reason: blReason });
    setBlReason(""); setSelected(null); setSaving(false); load();
  };

  const saveDiscount = async (c: any) => {
    setSaving(true);
    await adminPost("clients", { action: "update_discount", id: c.id, discount_percent: parseInt(discountVal) || 0 });
    setSaving(false); setSelected(null); load();
  };

  const removeFromBL = async (id: number) => {
    await adminPost("blacklist", { action: "remove", id }); load();
  };

  const MONTH_RU = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
  const formatBirthdate = (bd: string | null) => {
    if (!bd) return null;
    const d = new Date(bd);
    return `${d.getDate()} ${MONTH_RU[d.getMonth()]}`;
  };
  const isBirthdaySoon = (bd: string | null) => {
    if (!bd) return false;
    const now = new Date();
    const bDay = new Date(bd);
    const next = new Date(now.getFullYear(), bDay.getMonth(), bDay.getDate());
    if (next < now) next.setFullYear(now.getFullYear() + 1);
    return (next.getTime() - now.getTime()) <= 7 * 24 * 60 * 60 * 1000;
  };

  const tabs = [
    { id: "all", label: "Все" },
    { id: "active", label: "Активные" },
    { id: "dormant", label: "Спящие" },
    { id: "blacklist", label: "ЧС" },
  ] as const;

  return (
    <div className="px-4 pb-6">
      {/* Табы */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setFilter(t.id); setSelected(null); }}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={filter === t.id ? { ...GRAD, color: "white" } : { background: "white", color: "hsl(335 50% 55%)", border: "1px solid hsl(335 50% 85%)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Поиск */}
      <div className="relative mb-3">
        <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(335 50% 65%)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени или телефону..."
          className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }} />
      </div>

      {filter === "dormant" && (
        <p className="text-xs mb-3 px-1" style={PS}>Клиенты без записей более 60 дней или никогда не записывавшиеся</p>
      )}
      {filter === "blacklist" && (
        <p className="text-xs mb-3 px-1" style={{ color: "hsl(0 70% 55%)" }}>Клиенты в чёрном списке — не записываются</p>
      )}

      <p className="text-xs mb-3 px-1" style={PS}>{filter === "blacklist" ? blacklist.length : filtered.length} чел.</p>
      {loading && <div className="text-center py-10"><div className="text-3xl animate-float">🌸</div></div>}

      {/* Чёрный список */}
      {filter === "blacklist" && (
        <div className="space-y-2">
          {blacklist.map((b) => (
            <div key={b.id} className="card-glow rounded-2xl p-4 border" style={{ borderColor: "hsl(0 60% 88%)", background: "hsl(0 60% 99%)" }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: "hsl(0 70% 55%)" }}>
                  🚫
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={P}>{b.name}</div>
                  <div className="text-xs" style={{ color: "hsl(335 80% 55%)" }}>{b.phone}</div>
                  {b.reason && <div className="text-xs mt-1" style={{ color: "hsl(0 60% 50%)" }}>Причина: {b.reason}</div>}
                </div>
                <button onClick={() => removeFromBL(b.id)} className="px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0"
                  style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 50%)" }}>Убрать</button>
              </div>
            </div>
          ))}
          {blacklist.length === 0 && <div className="text-center py-8 text-sm" style={PS}>Чёрный список пуст</div>}
        </div>
      )}

      {/* Обычный список */}
      {filter !== "blacklist" && (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id}>
              <button onClick={() => { setSelected(selected?.id === c.id ? null : c); setDiscountVal(String(c.discount_percent || 0)); setBlReason(""); }}
                className="w-full card-glow rounded-2xl p-4 text-left transition-all"
                style={selected?.id === c.id ? { border: "1.5px solid hsl(335 70% 75%)" } : {}}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={GRAD}>
                    {c.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate text-sm" style={P}>{c.name}</div>
                      {isBirthdaySoon(c.birthdate) && <span className="text-xs">🎂</span>}
                      {(c.discount_percent > 0) && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "hsl(142 60% 92%)", color: "hsl(142 60% 35%)" }}>
                          -{c.discount_percent}%
                        </span>
                      )}
                    </div>
                    <div className="text-xs flex items-center gap-2 flex-wrap" style={PS}>
                      <span>{c.phone}</span>
                      {c.birthdate && <span>🎂 {formatBirthdate(c.birthdate)}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-medium" style={{ color: "hsl(335 50% 40%)" }}>{c.bookings_count || 0} зап.</div>
                  </div>
                </div>
              </button>

              {/* Панель действий */}
              {selected?.id === c.id && (
                <div className="card-glow rounded-2xl p-4 mt-1 mb-1 space-y-3 animate-slide-up">
                  <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-sm font-medium" style={{ color: "hsl(335 80% 55%)" }}>
                    <Icon name="Phone" size={14} /> Позвонить {c.phone}
                  </a>
                  {/* Скидка */}
                  <div>
                    <label className="text-xs font-medium block mb-1" style={PS}>Скидка клиента (%)</label>
                    <div className="flex gap-2">
                      {[0, 5, 10, 15, 20].map(d => (
                        <button key={d} onClick={() => setDiscountVal(String(d))}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={discountVal === String(d)
                            ? { ...GRAD, color: "white" }
                            : { background: "hsl(335 20% 93%)", color: "hsl(335 50% 50%)" }}>
                          {d > 0 ? `-${d}%` : "Нет"}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => saveDiscount(c)} disabled={saving}
                      className="w-full py-2 rounded-xl text-xs font-semibold text-white mt-2" style={GRAD}>
                      {saving ? "..." : "Сохранить скидку"}
                    </button>
                  </div>
                  {/* Добавить в ЧС */}
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: "hsl(0 60% 50%)" }}>Добавить в чёрный список</label>
                    <input value={blReason} onChange={e => setBlReason(e.target.value)} placeholder="Причина..."
                      className="w-full px-3 py-2 rounded-xl text-xs outline-none mb-2"
                      style={{ background: "white", border: "1px solid hsl(0 50% 88%)", color: "hsl(335 50% 30%)" }} />
                    <button onClick={() => addToBlacklist(c)} disabled={saving || !blReason.trim()}
                      className="w-full py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 45%)", border: "1px solid hsl(0 50% 85%)" }}>
                      🚫 В чёрный список
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-10"><div className="text-3xl mb-2">👥</div><p className="text-sm" style={PS}>Клиентов нет</p></div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Расписание (с календарём) ──
function AdminSchedule() {
  const [tab, setTab] = useState<"calendar" | "list" | "workhours">("calendar");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ client_name: "", client_phone: "", services: "", master: "Галина", booking_date: "", booking_time: "", notes: "", duration: "" });
  const [saving, setSaving] = useState(false);
  // Прайс-лист для выбора услуг
  const [priceItems, setPriceItems] = useState<any[]>([]);
  const [selectedSvcs, setSelectedSvcs] = useState<any[]>([]);
  const [showSvcPicker, setShowSvcPicker] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Рабочее расписание и выходные
  const [workDays, setWorkDays] = useState<any[]>([]);
  const [daysOff, setDaysOff] = useState<number[]>([]); // 0=Пн..6=Вс
  const [specificDaysOff, setSpecificDaysOff] = useState<string[]>([]); // конкретные даты-выходные
  const [savingWork, setSavingWork] = useState(false);
  const [savedWork, setSavedWork] = useState(false);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = () => adminPost("schedule").then(d => { setItems(d.schedule || []); setLoading(false); });
  useEffect(() => {
    adminPost("pricelist_custom", { active_only: true }).then(d => { setPriceItems(d.items || []); });
  }, []);

  const toggleSvc = (item: any) => {
    setSelectedSvcs(prev => {
      const has = prev.find((s: any) => s.id === item.id);
      const next = has ? prev.filter((s: any) => s.id !== item.id) : [...prev, item];
      // Автосумма длительности
      const totalDur = next.reduce((acc: number, s: any) => acc + (parseInt(s.duration) || 0), 0);
      if (totalDur > 0) setForm(f => ({ ...f, duration: String(totalDur) }));
      return next;
    });
  };
  const loadWork = () => {
    adminPost("work_schedule").then(d => {
      const sorted = (d.days || []).sort((a: any, b: any) => ((a.day_of_week + 6) % 7) - ((b.day_of_week + 6) % 7));
      setWorkDays(sorted);
    });
    adminPost("site_settings").then(d => {
      const s = d.settings || {};
      const off = JSON.parse(s.days_off || "[]");
      setDaysOff(off);
      const specOff = JSON.parse(s.specific_days_off || "[]");
      setSpecificDaysOff(specOff);
    });
  };

  const toggleSpecificDayOff = async (dateStr: string) => {
    const updated = specificDaysOff.includes(dateStr)
      ? specificDaysOff.filter(d => d !== dateStr)
      : [...specificDaysOff, dateStr];
    setSpecificDaysOff(updated);
    await adminPost("site_settings", { action: "save", settings: { specific_days_off: JSON.stringify(updated) } });
  };
  useEffect(() => { load(); loadWork(); }, []);

  const save = async () => {
    if (!form.client_name || !form.booking_date || !form.booking_time) return;
    setSaving(true);
    const servicesStr = selectedSvcs.length > 0
      ? selectedSvcs.map((s: any) => s.name).join(", ")
      : form.services;
    await adminPost("schedule", { action: "add", ...form, services: servicesStr });
    setForm({ client_name: "", client_phone: "", services: "", master: "Галина", booking_date: "", booking_time: "", notes: "", duration: "" });
    setSelectedSvcs([]); setShowSvcPicker(false);
    setAdding(false); setSaving(false); load();
  };
  const del = async (id: number) => { await adminPost("schedule", { action: "delete", id }); load(); };

  const saveWorkHours = async () => {
    setSavingWork(true);
    await adminPost("work_schedule", { action: "save", days: workDays });
    await adminPost("site_settings", { action: "save", settings: { days_off: JSON.stringify(daysOff) } });
    setSavingWork(false); setSavedWork(true); setTimeout(() => setSavedWork(false), 2000);
  };

  const toggleDayOff = (idx: number) => {
    setDaysOff(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]);
  };

  const DAY_NAMES_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const DAY_NAMES_FULL = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
  const MONTH_NAMES = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  // Строим данные месяца
  const firstDay = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  // Понедельник = 0 для сетки
  const startOffset = (firstDay.getDay() + 6) % 7;

  const formatDate = (y: number, m: number, d: number) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  // Записи по датам
  const itemsByDate: Record<string, any[]> = {};
  items.forEach(it => {
    const d = it.booking_date?.slice(0,10);
    if (d) { if (!itemsByDate[d]) itemsByDate[d] = []; itemsByDate[d].push(it); }
  });

  const dayOfWeekForDate = (y: number, m: number, d: number) => (new Date(y, m, d).getDay() + 6) % 7; // 0=Пн

  const todayStr = formatDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const selectedItems = selectedDate ? (itemsByDate[selectedDate] || []) : [];

  // Свободные окна для выбранного дня
  const getFreeSlots = (dateStr: string) => {
    if (!dateStr) return [];
    const dow = dayOfWeekForDate(
      Number(dateStr.slice(0,4)), Number(dateStr.slice(5,7))-1, Number(dateStr.slice(8,10))
    );
    const dayWork = workDays.find(d => ((d.day_of_week + 6) % 7) === dow);
    if (!dayWork || !dayWork.time_from || !dayWork.time_to) return [];
    const bookedTimes = new Set((itemsByDate[dateStr] || []).map((b: any) => b.booking_time?.slice(0,5)));
    const slots: string[] = [];
    const [fh, fm] = (dayWork.time_from || "10:00").split(":").map(Number);
    const [th, tm] = (dayWork.time_to || "20:00").split(":").map(Number);
    let cur = fh * 60 + fm;
    const end = th * 60 + tm;
    while (cur < end) {
      const hh = String(Math.floor(cur / 60)).padStart(2, "0");
      const mm = String(cur % 60).padStart(2, "0");
      const slot = `${hh}:${mm}`;
      if (!bookedTimes.has(slot)) slots.push(slot);
      cur += 60; // шаг 1 час
    }
    return slots;
  };

  return (
    <div className="pb-6">
      {/* Вкладки */}
      <div className="px-4 mb-4">
        <div className="flex rounded-2xl overflow-hidden" style={{ background: "hsl(335 30% 92%)" }}>
          {([
            { id: "calendar", label: "Календарь" },
            { id: "list", label: "Список" },
            { id: "workhours", label: "Часы работы" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 text-xs font-semibold transition-all"
              style={tab === t.id ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── КАЛЕНДАРЬ ─── */}
      {tab === "calendar" && (
        <div className="px-4">
          {/* Навигация по месяцам */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
              <Icon name="ChevronLeft" size={16} style={{ color: "hsl(335 60% 40%)" }} />
            </button>
            <span className="font-oswald font-bold text-base" style={P}>{MONTH_NAMES[calMonth]} {calYear}</span>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
              <Icon name="ChevronRight" size={16} style={{ color: "hsl(335 60% 40%)" }} />
            </button>
          </div>

          {/* Заголовки дней */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES_SHORT.map((d, i) => (
              <div key={d} className="text-center text-[10px] font-semibold py-1"
                style={{ color: daysOff.includes(i) ? "hsl(0 60% 60%)" : "hsl(335 40% 55%)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Сетка дней */}
          <div className="grid grid-cols-7 gap-0.5 mb-4">
            {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDate(calYear, calMonth, day);
              const dow = dayOfWeekForDate(calYear, calMonth, day);
              const isWeeklyOff = daysOff.includes(dow);
              const isSpecificOff = specificDaysOff.includes(dateStr);
              const isOff = isWeeklyOff || isSpecificOff;
              const bookings = itemsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              return (
                <button key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  onMouseDown={() => {
                    longPressTimer.current = setTimeout(() => {
                      toggleSpecificDayOff(dateStr);
                    }, 600);
                  }}
                  onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                  onMouseLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                  onTouchStart={() => {
                    longPressTimer.current = setTimeout(() => {
                      toggleSpecificDayOff(dateStr);
                    }, 600);
                  }}
                  onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                  className="relative flex flex-col items-center justify-start py-1.5 rounded-xl transition-all min-h-[44px]"
                  style={isSelected
                    ? { ...GRAD, color: "white" }
                    : isSpecificOff
                      ? { background: "hsl(0 60% 55%)", }
                      : isToday
                        ? { background: "hsl(335 80% 60% / 0.15)", border: "1.5px solid hsl(335 80% 65%)" }
                        : isWeeklyOff
                          ? { background: "hsl(0 30% 96%)" }
                          : { background: "hsl(335 50% 98%)" }}>
                  <span className="text-xs font-bold"
                    style={isSelected ? { color: "white" }
                      : isSpecificOff ? { color: "white" }
                      : isWeeklyOff ? { color: "hsl(0 50% 70%)" } : P}>
                    {day}
                  </span>
                  {bookings.length > 0 && (
                    <span className="text-[9px] font-bold mt-0.5 px-1 rounded-full"
                      style={isSelected || isSpecificOff
                        ? { background: "rgba(255,255,255,0.3)", color: "white" }
                        : { background: "hsl(335 80% 58%)", color: "white" }}>
                      {bookings.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Кнопка добавить */}
          <button onClick={() => {
            if (selectedDate) setForm(f => ({ ...f, booking_date: selectedDate }));
            setAdding(true);
            setTab("list");
          }} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
            + Добавить запись{selectedDate ? ` на ${selectedDate.slice(8)}.${selectedDate.slice(5,7)}` : ""}
          </button>

          {/* Записи и свободные окна выбранного дня */}
          {selectedDate && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold" style={P}>
                  {selectedDate.slice(8)}.{selectedDate.slice(5,7)}.{selectedDate.slice(0,4)}
                </div>
                {specificDaysOff.includes(selectedDate) && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 45%)" }}>
                    🔴 Выходной (удержать для отмены)
                  </span>
                )}
              </div>

              {/* Записи */}
              {selectedItems.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold mb-2" style={{ color: "hsl(335 80% 50%)" }}>Записи ({selectedItems.length})</div>
                  <div className="space-y-2">
                    {selectedItems.map(item => (
                      <div key={item.id} className="card-glow rounded-2xl p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-sm" style={P}>{item.client_name}</div>
                            <div className="text-xs flex flex-wrap gap-x-2" style={PS}>
                              <span>{item.booking_time}</span>
                              {item.duration && <span style={{ color: "hsl(335 70% 50%)" }}>⏱ {item.duration} мин</span>}
                              {item.services && <span className="truncate max-w-[160px]">{item.services}</span>}
                            </div>
                            {item.client_phone && <a href={`tel:${item.client_phone}`} className="text-xs" style={{ color: "hsl(335 80% 55%)" }}>{item.client_phone}</a>}
                          </div>
                          <button onClick={() => del(item.id)} className="px-2 py-1 rounded-lg text-xs" style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 55%)" }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Свободные окна */}
              {!specificDaysOff.includes(selectedDate) && (() => {
                const freeSlots = getFreeSlots(selectedDate);
                return freeSlots.length > 0 ? (
                  <div>
                    <div className="text-xs font-semibold mb-2" style={{ color: "hsl(142 60% 40%)" }}>
                      ✅ Свободные окна ({freeSlots.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {freeSlots.map(slot => (
                        <button key={slot}
                          onClick={() => {
                            setForm(f => ({ ...f, booking_date: selectedDate, booking_time: slot }));
                            setAdding(true);
                            setTab("list");
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                          style={{ background: "hsl(142 60% 94%)", color: "hsl(142 60% 35%)", border: "1px solid hsl(142 50% 82%)" }}>
                          {slot}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] mt-2" style={PS}>Нажми на время, чтобы сразу создать запись</p>
                  </div>
                ) : selectedItems.length === 0 ? (
                  <div className="text-center py-4 text-xs" style={PS}>Нет данных о рабочих часах. Настрой в «Часы работы»</div>
                ) : null;
              })()}

              <p className="text-[10px] mt-3" style={PS}>💡 Удержи день чтобы сделать его выходным</p>
            </div>
          )}
        </div>
      )}

      {/* ─── СПИСОК ─── */}
      {tab === "list" && (
        <div className="px-4">
          <button onClick={() => setAdding(!adding)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
            {adding ? "✕ Отмена" : "+ Добавить запись"}
          </button>
          {adding && (
            <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={PS}>Имя клиента</label>
                <input value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} placeholder="Имя" autoComplete="off" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={PS}>Телефон</label>
                <input value={form.client_phone} onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))} placeholder="+7..." type="tel" autoComplete="off" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
              </div>
              {/* Выбор услуг из прайса */}
              <div>
                <label className="text-xs font-medium block mb-1" style={PS}>Услуги</label>
                {/* Выбранные услуги */}
                {selectedSvcs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedSvcs.map((s: any) => (
                      <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ ...GRAD, color: "white" }}>
                        {s.name}
                        <button type="button" onClick={() => toggleSvc(s)} className="ml-0.5 opacity-75 hover:opacity-100">✕</button>
                      </span>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setShowSvcPicker(!showSvcPicker)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-left flex items-center justify-between"
                  style={inp}>
                  <span style={selectedSvcs.length === 0 ? { color: "hsl(335 20% 70%)" } : P}>
                    {selectedSvcs.length === 0 ? "Выбрать из прайса..." : `Ещё добавить...`}
                  </span>
                  <Icon name={showSvcPicker ? "ChevronUp" : "ChevronDown"} size={14} style={PS} />
                </button>

                {/* Пикер услуг */}
                {showSvcPicker && (
                  <div className="mt-2 rounded-2xl overflow-hidden border max-h-56 overflow-y-auto" style={{ borderColor: "hsl(335 50% 85%)" }}>
                    {priceItems.length === 0 && (
                      <div className="px-3 py-4 text-xs text-center" style={PS}>Прайс пустой — добавьте услуги в разделе «Прайс»</div>
                    )}
                    {(() => {
                      const grouped: Record<string, any[]> = {};
                      priceItems.forEach((it: any) => {
                        const cat = it.category || "Другое";
                        if (!grouped[cat]) grouped[cat] = [];
                        grouped[cat].push(it);
                      });
                      return Object.entries(grouped).map(([cat, catItems]) => (
                        <div key={cat}>
                          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: "hsl(335 50% 97%)", color: "hsl(335 50% 50%)" }}>{cat}</div>
                          {catItems.map((it: any) => {
                            const checked = selectedSvcs.find((s: any) => s.id === it.id);
                            return (
                              <button key={it.id} type="button" onClick={() => toggleSvc(it)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-t transition-colors hover:bg-pink-50"
                                style={{ borderColor: "hsl(335 30% 93%)", background: checked ? "hsl(335 80% 60% / 0.06)" : "white" }}>
                                <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all"
                                  style={checked
                                    ? { ...GRAD, borderColor: "transparent" }
                                    : { borderColor: "hsl(335 50% 78%)" }}>
                                  {checked && <Icon name="Check" size={10} className="text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm truncate" style={P}>{it.name}</div>
                                  {(it.price || it.duration) && (
                                    <div className="text-[11px] flex gap-2" style={PS}>
                                      {it.price && <span style={{ color: "hsl(335 70% 50%)" }}>{it.price}</span>}
                                      {it.duration && <span>{it.duration}</span>}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Длительность процедуры */}
              <div>
                <label className="text-xs font-medium block mb-1" style={PS}>Длительность процедуры</label>
                <div className="flex gap-2 items-center">
                  <input value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
                    placeholder="мин" type="number" min="5" step="5" autoComplete="off"
                    className="w-28 px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
                  <span className="text-xs" style={PS}>минут</span>
                  <div className="flex gap-1 ml-auto">
                    {[30, 45, 60, 90, 120].map(v => (
                      <button key={v} type="button" onClick={() => setForm(p => ({ ...p, duration: String(v) }))}
                        className="px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                        style={form.duration === String(v)
                          ? { ...GRAD, color: "white" }
                          : { background: "hsl(335 20% 93%)", color: "hsl(335 40% 55%)" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={PS}>Дата</label>
                <input value={form.booking_date} onChange={e => setForm(p => ({ ...p, booking_date: e.target.value }))} type="date" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={PS}>Время</label>
                <input value={form.booking_time} onChange={e => setForm(p => ({ ...p, booking_time: e.target.value }))} type="time" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={PS}>Примечание</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Необязательно" autoComplete="off" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
              </div>
              <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          )}
          {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="card-glow rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-sm" style={P}>{item.client_name}</div>
                    <div className="text-xs" style={PS}>{item.services}</div>
                  </div>
                  <button onClick={() => del(item.id)} className="text-xs px-2 py-1 rounded-lg" style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 55%)" }}>✕</button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs" style={PS}>
                  <span>📅 {item.booking_date}</span>
                  <span>🕐 {item.booking_time}</span>
                  {item.duration && <span>⏱ {item.duration} мин</span>}
                  <span>👩 {item.master}</span>
                </div>
                {item.client_phone && <a href={`tel:${item.client_phone}`} className="text-xs mt-1 block" style={{ color: "hsl(335 80% 55%)" }}>{item.client_phone}</a>}
              </div>
            ))}
            {!loading && items.length === 0 && <div className="text-center py-10 text-sm" style={PS}>Расписание пусто</div>}
          </div>
        </div>
      )}

      {/* ─── ЧАСЫ РАБОТЫ + ВЫХОДНЫЕ ─── */}
      {tab === "workhours" && (
        <div className="px-4 space-y-4">
          {/* Выходные дни */}
          <div className="card-glow rounded-2xl p-4">
            <div className="font-semibold text-sm mb-1" style={P}>Выходные дни</div>
            <p className="text-xs mb-3" style={PS}>Нажми на день чтобы отметить его выходным (красный = выходной)</p>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_NAMES_SHORT.map((d, idx) => (
                <button key={d} onClick={() => toggleDayOff(idx)}
                  className="py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={daysOff.includes(idx)
                    ? { background: "hsl(0 60% 55%)", color: "white" }
                    : { background: "hsl(335 20% 93%)", color: "hsl(335 50% 50%)" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Часы работы по дням */}
          <div className="card-glow rounded-2xl p-4">
            <div className="font-semibold text-sm mb-3" style={P}>Часы работы</div>
            <div className="space-y-3">
              {workDays.map((day, idx) => {
                const dowIdx = (day.day_of_week + 6) % 7;
                const isOff = daysOff.includes(dowIdx);
                return (
                  <div key={day.id || idx} className="flex items-center gap-2">
                    <div className="w-7 text-[11px] font-semibold flex-shrink-0"
                      style={{ color: isOff ? "hsl(0 60% 55%)" : "hsl(335 50% 40%)" }}>
                      {DAY_NAMES_SHORT[dowIdx]}
                    </div>
                    {isOff ? (
                      <div className="flex-1 text-xs text-center py-2 rounded-xl"
                        style={{ background: "hsl(0 40% 97%)", color: "hsl(0 50% 65%)" }}>
                        Выходной
                      </div>
                    ) : (
                      <>
                        <input value={day.time_from || "10:00"} type="time"
                          onChange={e => setWorkDays(prev => prev.map((d2, i) => i === idx ? { ...d2, time_from: e.target.value } : d2))}
                          className="flex-1 px-2 py-2 rounded-xl text-xs outline-none" style={inp} />
                        <span className="text-xs" style={PS}>—</span>
                        <input value={day.time_to || "20:00"} type="time"
                          onChange={e => setWorkDays(prev => prev.map((d2, i) => i === idx ? { ...d2, time_to: e.target.value } : d2))}
                          className="flex-1 px-2 py-2 rounded-xl text-xs outline-none" style={inp} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {savedWork && (
            <div className="p-3 rounded-xl text-sm font-medium text-center" style={{ background: "hsl(142 60% 94%)", color: "hsl(142 60% 35%)" }}>
              ✓ Расписание сохранено
            </div>
          )}
          <button onClick={saveWorkHours} disabled={savingWork}
            className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg" style={GRAD}>
            {savingWork ? "Сохраняем..." : "💾 Сохранить расписание"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Сообщения ──
function AdminMessages() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const prevCount = React.useRef<number>(0);

  const load = () => {
    adminPost("messages").then(d => {
      const newChats = d.chats || [];
      // Звук при новых сообщениях
      if (!loading && newChats.length > 0) {
        const totalNew = newChats.reduce((s: number, c: any) => s + (c.msg_count || 0), 0);
        if (totalNew > prevCount.current) {
          const ss = getSoundSettings();
          if (ss.enabled !== false) {
            playNotificationSound(ss.preset || "bell", Number(ss.volume ?? 0.5));
          }
          // Пуш-уведомление для администратора
          const newCount = totalNew - prevCount.current;
          showPushNotification(
            "Girly Paradise 🌸",
            `${newCount > 1 ? `${newCount} новых сообщений` : "Новое сообщение"} от клиентов`,
            "new-message"
          );
        }
        prevCount.current = totalNew;
      }
      setChats(newChats);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // Поллинг каждые 15 секунд
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-4 pb-6">
      {loading && <div className="text-center py-10"><div className="text-3xl animate-float">🌸</div></div>}
      {!loading && chats.length === 0 && <div className="text-center py-10 text-sm" style={PS}>Сообщений пока нет</div>}
      <div className="space-y-2">
        {chats.map(c => (
          <div key={c.id} className="card-glow rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={GRAD}>
                {c.client_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm" style={P}>{c.client_name}</div>
                <div className="text-xs" style={PS}>{c.client_phone} · {c.msg_count} сообщ.</div>
              </div>
              <div className="text-xs" style={PS}>{c.last_msg?.slice(0, 10)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Уведомления / SMS ──
function AdminNotifications() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sentAll, setSentAll] = useState(false);
  const [tab, setTab] = useState<"send" | "history">("send");

  const load = () => adminPost("notifications").then(d => { setHistory(d.notifications || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const sendOne = async () => {
    if (!phone || !msg) return;
    setSending(true);
    await adminPost("notifications", { action: "send", phone, message: msg });
    setPhone(""); setMsg(""); setSending(false); load();
  };

  const sendAll = async () => {
    if (!msg || !confirm("Отправить SMS всем клиентам?")) return;
    setSending(true);
    await adminPost("notifications", { action: "send_all", message: msg });
    setMsg(""); setSending(false); setSentAll(true); load();
    setTimeout(() => setSentAll(false), 3000);
  };

  const inputStyle = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  return (
    <div className="px-4 pb-6">
      <div className="flex rounded-2xl overflow-hidden mb-4" style={{ background: "hsl(335 30% 92%)" }}>
        <button onClick={() => setTab("send")} className="flex-1 py-2.5 text-sm font-medium transition-all"
          style={tab === "send" ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>Отправить</button>
        <button onClick={() => setTab("history")} className="flex-1 py-2.5 text-sm font-medium transition-all"
          style={tab === "history" ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>История</button>
      </div>

      {tab === "send" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Телефон клиента (или оставь пустым для всех)</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Текст SMS</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Текст сообщения..." rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={sendOne} disabled={sending || !phone || !msg}
              className="py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
              Отправить одному
            </button>
            <button onClick={sendAll} disabled={sending || !msg}
              className="py-3 rounded-xl font-semibold text-sm"
              style={{ background: "hsl(335 50% 96%)", color: "hsl(335 60% 45%)", border: "1.5px solid hsl(335 60% 80%)" }}>
              {sentAll ? "Отправлено ✓" : sending ? "..." : "Всем клиентам"}
            </button>
          </div>
          <p className="text-xs text-center" style={PS}>SMS отправляются через SMS.ru</p>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-2">
          {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
          {!loading && history.length === 0 && <div className="text-center py-8 text-sm" style={PS}>История пуста</div>}
          {history.map(n => (
            <div key={n.id} className="card-glow rounded-xl p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium" style={P}>{n.client_name || n.client_phone}</span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={n.status === "sent" ? { background: "hsl(142 60% 92%)", color: "hsl(142 60% 35%)" } : { background: "hsl(0 60% 95%)", color: "hsl(0 60% 55%)" }}>
                  {n.status === "sent" ? "✓ Доставлено" : "✕ Ошибка"}
                </span>
              </div>
              <p className="text-xs" style={PS}>{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Расходы ──
function AdminExpenses() {
  const [tab, setTab] = useState<"expenses" | "income" | "monthly">("expenses");

  return (
    <div className="px-4 pb-6">
      <div className="flex rounded-2xl overflow-hidden mb-5" style={{ background: "hsl(335 30% 92%)" }}>
        <button onClick={() => setTab("expenses")} className="flex-1 py-2.5 text-sm font-semibold transition-all"
          style={tab === "expenses" ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
          💸 Расходы
        </button>
        <button onClick={() => setTab("income")} className="flex-1 py-2.5 text-sm font-semibold transition-all"
          style={tab === "income" ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
          💰 Доходы
        </button>
        <button onClick={() => setTab("monthly")} className="flex-1 py-2.5 text-sm font-semibold transition-all"
          style={tab === "monthly" ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
          📊 Сводка
        </button>
      </div>
      {tab === "expenses" && <ExpensesTab />}
      {tab === "income" && <IncomeTab />}
      {tab === "monthly" && <MonthlyFinanceTab />}
    </div>
  );
}

function MonthlyFinanceTab() {
  const [months, setMonths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const MONTH_NAMES = ["", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

  const load = () => {
    setLoading(true);
    adminPost("monthly_finance").then(d => { setMonths(d.months || []); setLoading(false); });
  };

  const recalc = async () => {
    setRecalculating(true);
    await adminPost("monthly_finance", { action: "recalc" });
    setRecalculating(false);
    load();
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <button onClick={recalc} disabled={recalculating}
        className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
        {recalculating ? "Считаем..." : "🔄 Пересчитать сводку"}
      </button>
      <p className="text-xs mb-4" style={PS}>Нажми «Пересчитать» чтобы обновить данные на основе внесённых доходов и расходов</p>

      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      {!loading && months.length === 0 && (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm" style={PS}>Нажми «Пересчитать» чтобы собрать данные</p>
        </div>
      )}

      <div className="space-y-3">
        {months.map(m => {
          const profit = Number(m.profit);
          const income = Number(m.total_income);
          const expenses = Number(m.total_expenses);
          return (
            <div key={m.id} className="card-glow rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-oswald font-bold text-base" style={P}>{MONTH_NAMES[m.month]} {m.year}</span>
                <span className="font-bold font-oswald text-base" style={{ color: profit >= 0 ? "hsl(142 60% 40%)" : "hsl(0 60% 50%)" }}>
                  {profit >= 0 ? "+" : ""}{profit.toLocaleString()} ₽
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-2 text-center" style={{ background: "hsl(142 60% 96%)" }}>
                  <div className="text-sm font-bold" style={{ color: "hsl(142 60% 35%)" }}>+{income.toLocaleString()} ₽</div>
                  <div className="text-xs" style={PS}>Доходы</div>
                </div>
                <div className="rounded-xl p-2 text-center" style={{ background: "hsl(0 60% 97%)" }}>
                  <div className="text-sm font-bold" style={{ color: "hsl(0 60% 50%)" }}>−{expenses.toLocaleString()} ₽</div>
                  <div className="text-xs" style={PS}>Расходы</div>
                </div>
              </div>
              {income > 0 && (
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(0 60% 92%)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (income - expenses) / income * 100)}%`, background: "hsl(142 60% 45%)" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ExpensesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ total: 0, month: 0 });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "Расходники", expense_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [saving, setSaving] = useState(false);
  const cats = ["Расходники", "Аренда", "Оборудование", "Реклама", "Зарплата", "Прочее"];
  const inputStyle = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const load = () => adminPost("expenses").then(d => {
    setItems(d.expenses || []); setTotals({ total: d.total || 0, month: d.month || 0 }); setLoading(false);
  });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title || !form.amount) return;
    setSaving(true);
    await adminPost("expenses", { action: "add", ...form, amount: parseFloat(form.amount) });
    setForm({ title: "", amount: "", category: "Расходники", expense_date: new Date().toISOString().slice(0, 10), notes: "" });
    setAdding(false); setSaving(false); load();
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card-glow rounded-2xl p-4">
          <div className="text-xl font-oswald font-bold" style={{ color: "hsl(335 80% 55%)" }}>{totals.month.toLocaleString()} ₽</div>
          <div className="text-xs" style={PS}>За этот месяц</div>
        </div>
        <div className="card-glow rounded-2xl p-4">
          <div className="text-xl font-oswald font-bold" style={{ color: "hsl(335 80% 55%)" }}>{totals.total.toLocaleString()} ₽</div>
          <div className="text-xs" style={PS}>Всего</div>
        </div>
      </div>
      <button onClick={() => setAdding(!adding)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
        {adding ? "✕ Отмена" : "+ Добавить расход"}
      </button>
      {adding && (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          {[{ key: "title", label: "Название", ph: "Косметика, аренда..." }, { key: "amount", label: "Сумма, ₽", ph: "5000" }, { key: "expense_date", label: "Дата", ph: "" }, { key: "notes", label: "Примечание", ph: "Необязательно" }].map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium block mb-1" style={PS}>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.ph} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Категория</label>
            <div className="flex flex-wrap gap-2">
              {cats.map(c => (
                <button key={c} onClick={() => setForm(p => ({ ...p, category: c }))}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={form.category === c ? { ...GRAD, color: "white" } : { background: "white", color: "hsl(335 50% 55%)", border: "1px solid hsl(335 50% 85%)" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      )}
      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="card-glow rounded-2xl p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-semibold text-sm" style={P}>{item.title}</div>
                <div className="text-xs" style={PS}>{item.category} · {item.expense_date}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold font-oswald" style={{ color: "hsl(0 60% 50%)" }}>{Number(item.amount).toLocaleString()} ₽</span>
                <button onClick={async () => { await adminPost("expenses", { action: "delete", id: item.id }); load(); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 55%)" }}>✕</button>
              </div>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && <div className="text-center py-8 text-sm" style={PS}>Расходов нет</div>}
      </div>
    </>
  );
}

function IncomeTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ total: 0, month: 0 });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "Услуги", income_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [saving, setSaving] = useState(false);
  const cats = ["Услуги", "Чаевые", "Продажа косметики", "Абонемент", "Прочее"];
  const inputStyle = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const load = () => adminPost("income").then(d => {
    setItems(d.income || []); setTotals({ total: d.total || 0, month: d.month || 0 }); setLoading(false);
  });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title || !form.amount) return;
    setSaving(true);
    await adminPost("income", { action: "add", ...form, amount: parseFloat(form.amount) });
    setForm({ title: "", amount: "", category: "Услуги", income_date: new Date().toISOString().slice(0, 10), notes: "" });
    setAdding(false); setSaving(false); load();
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card-glow rounded-2xl p-4">
          <div className="text-xl font-oswald font-bold" style={{ color: "hsl(142 60% 40%)" }}>{totals.month.toLocaleString()} ₽</div>
          <div className="text-xs" style={PS}>За этот месяц</div>
        </div>
        <div className="card-glow rounded-2xl p-4">
          <div className="text-xl font-oswald font-bold" style={{ color: "hsl(142 60% 40%)" }}>{totals.total.toLocaleString()} ₽</div>
          <div className="text-xs" style={PS}>Всего</div>
        </div>
      </div>
      <button onClick={() => setAdding(!adding)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
        {adding ? "✕ Отмена" : "+ Добавить доход"}
      </button>
      {adding && (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          {[{ key: "title", label: "Описание", ph: "Криолиполиз, СМАС..." }, { key: "amount", label: "Сумма, ₽", ph: "3000" }, { key: "income_date", label: "Дата", ph: "" }, { key: "notes", label: "Примечание", ph: "Необязательно" }].map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium block mb-1" style={PS}>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.ph} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Категория</label>
            <div className="flex flex-wrap gap-2">
              {cats.map(c => (
                <button key={c} onClick={() => setForm(p => ({ ...p, category: c }))}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={form.category === c ? { ...GRAD, color: "white" } : { background: "white", color: "hsl(335 50% 55%)", border: "1px solid hsl(335 50% 85%)" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      )}
      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="card-glow rounded-2xl p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-semibold text-sm" style={P}>{item.title}</div>
                <div className="text-xs" style={PS}>{item.category} · {item.income_date}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold font-oswald" style={{ color: "hsl(142 60% 40%)" }}>+{Number(item.amount).toLocaleString()} ₽</span>
                <button onClick={async () => { await adminPost("income", { action: "delete", id: item.id }); load(); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 55%)" }}>✕</button>
              </div>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && <div className="text-center py-8 text-sm" style={PS}>Доходов нет</div>}
      </div>
    </>
  );
}

// ── Галерея (папки) — для админа ──
function AdminGalleryFolders() {
  const [folders, setFolders] = useState<any[]>([]);
  const [activeFolder, setActiveFolder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingFolder, setAddingFolder] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [folderForm, setFolderForm] = useState({ name: "", description: "", cover_url: "" });
  const [photoForm, setPhotoForm] = useState({ url: "", title: "" });
  const [photos, setPhotos] = useState<any[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [photoSize, setPhotoSize] = useState<"small" | "medium" | "large" | "wide">("medium");
  const [editingSize, setEditingSize] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [editingFolder, setEditingFolder] = useState(false);
  const [editFolderForm, setEditFolderForm] = useState({ name: "", description: "" });
  const [savingFolder, setSavingFolder] = useState(false);
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const SIZE_OPTIONS = [
    { id: "small",  label: "Маленькое", icon: "⬛", hint: "1×1 · маленький квадрат" },
    { id: "medium", label: "Среднее",   icon: "🟦", hint: "1×1 · обычный квадрат" },
    { id: "large",  label: "Большое",   icon: "🟫", hint: "2×2 · крупное" },
    { id: "wide",   label: "Широкое",   icon: "▬",  hint: "2×1 · горизонтальное" },
  ] as const;

  const loadFolders = () => adminPost("gallery_folders").then(d => { setFolders(d.folders || []); setLoading(false); });
  useEffect(() => { loadFolders(); }, []);

  const loadPhotos = (folderId: number) => {
    setPhotosLoading(true);
    adminPost("gallery", { folder_id: folderId }).then(d => { setPhotos(d.gallery || []); setPhotosLoading(false); });
  };

  const openFolder = (f: any) => { setActiveFolder(f); setAddingPhoto(false); loadPhotos(f.id); };

  const addFolder = async () => {
    if (!folderForm.name) return;
    setSaving(true);
    await adminPost("gallery_folders", { action: "add", ...folderForm });
    setFolderForm({ name: "", description: "", cover_url: "" });
    setAddingFolder(false); setSaving(false); loadFolders();
  };

  const addPhoto = async () => {
    if (!photoForm.url || !activeFolder) return;
    setSaving(true);
    await adminPost("gallery", { action: "add", ...photoForm, folder_id: activeFolder.id, category: activeFolder.name, display_size: photoSize });
    setPhotoForm({ url: "", title: "" });
    setPhotoSize("medium");
    setAddingPhoto(false); setSaving(false); loadPhotos(activeFolder.id);
  };

  const updatePhotoSize = async (id: number, display_size: string) => {
    await adminPost("gallery", { action: "update_size", id, display_size });
    setEditingSize(null);
    setMenuOpen(null);
    loadPhotos(activeFolder!.id);
  };

  const setCoverFromPhoto = async (photoUrl: string) => {
    await adminPost("gallery_folders", { action: "update", id: activeFolder!.id, name: activeFolder!.name, description: activeFolder!.description || "", cover_url: photoUrl });
    setActiveFolder((f: any) => ({ ...f, cover_url: photoUrl }));
    setMenuOpen(null);
    loadFolders();
  };

  const saveFolder = async () => {
    if (!editFolderForm.name.trim() || !activeFolder) return;
    setSavingFolder(true);
    await adminPost("gallery_folders", { action: "update", id: activeFolder.id, name: editFolderForm.name, description: editFolderForm.description, cover_url: activeFolder.cover_url || "" });
    setActiveFolder((f: any) => ({ ...f, name: editFolderForm.name, description: editFolderForm.description }));
    setEditingFolder(false); setSavingFolder(false); loadFolders();
  };

  const removePhoto = async (id: number) => {
    await adminPost("gallery", { action: "deactivate", id }); loadPhotos(activeFolder.id);
  };

  const deleteFolder = async (f: any) => {
    if (!window.confirm(`Удалить папку «${f.name}»?\nВсе фото в папке также будут скрыты.`)) return;
    await adminPost("gallery_folders", { action: "delete", id: f.id });
    loadFolders();
  };

  if (activeFolder) return (
    <div className="px-4 pb-6">
      <button onClick={() => { setActiveFolder(null); setPhotos([]); setEditingFolder(false); }} className="flex items-center gap-2 text-sm mb-4" style={PS}>
        <Icon name="ChevronLeft" size={16} /> Все папки
      </button>

      {/* Заголовок папки — с кнопкой редактирования */}
      {!editingFolder ? (
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-lg font-oswald font-bold" style={P}>{activeFolder.name}</h2>
            {activeFolder.description && <p className="text-xs mt-0.5" style={PS}>{activeFolder.description}</p>}
          </div>
          <button
            onClick={() => { setEditFolderForm({ name: activeFolder.name, description: activeFolder.description || "" }); setEditingFolder(true); }}
            className="ml-2 px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0"
            style={{ background: "hsl(335 50% 95%)", color: "hsl(335 60% 45%)" }}>
            ✏️ Изменить
          </button>
        </div>
      ) : (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          <div className="font-semibold text-sm mb-1" style={P}>Редактирование папки</div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Название</label>
            <input value={editFolderForm.name} onChange={e => setEditFolderForm(p => ({ ...p, name: e.target.value }))}
              autoComplete="off" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Описание (необязательно)</label>
            <input value={editFolderForm.description} onChange={e => setEditFolderForm(p => ({ ...p, description: e.target.value }))}
              autoComplete="off" placeholder="Описание папки..." className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div className="flex gap-2">
            <button onClick={saveFolder} disabled={savingFolder || !editFolderForm.name.trim()}
              className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm" style={GRAD}>
              {savingFolder ? "Сохраняем..." : "Сохранить"}
            </button>
            <button onClick={() => setEditingFolder(false)}
              className="px-4 py-2.5 rounded-xl text-sm" style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setAddingPhoto(!addingPhoto)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
        {addingPhoto ? "✕ Отмена" : "+ Добавить фото"}
      </button>
      {addingPhoto && (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          {/* Загрузка с телефона — кладём в подпапку папки */}
          <PhotoUploadButton
            folder={`gallery/${activeFolder.name.toLowerCase().replace(/\s+/g, "_")}`}
            label="📷 Выбрать фото из галереи"
            uploading={uploadingPhoto}
            setUploading={setUploadingPhoto}
            onUploaded={url => setPhotoForm(p => ({ ...p, url }))}
            className="w-full"
          />
          {/* Или по ссылке */}
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>или вставить ссылку (URL)</label>
            <input value={photoForm.url} onChange={e => setPhotoForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Подпись (необязательно)</label>
            <input value={photoForm.title} onChange={e => setPhotoForm(p => ({ ...p, title: e.target.value }))} placeholder="Описание фото"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          {/* Размер фото */}
          <div>
            <label className="text-xs font-medium block mb-2" style={PS}>Размер в галерее</label>
            <div className="grid grid-cols-4 gap-1.5">
              {SIZE_OPTIONS.map(s => (
                <button key={s.id} onClick={() => setPhotoSize(s.id)}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl text-center transition-all"
                  style={photoSize === s.id
                    ? { ...GRAD, color: "white" }
                    : { background: "hsl(335 20% 95%)", color: "hsl(335 40% 55%)" }}>
                  <span className="text-base leading-none">{s.icon}</span>
                  <span className="text-[10px] font-semibold leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-1.5" style={PS}>
              {SIZE_OPTIONS.find(s => s.id === photoSize)?.hint}
            </p>
          </div>
          {photoForm.url && <img src={photoForm.url} className="w-full h-40 object-cover rounded-xl" alt="preview" onError={e => (e.currentTarget.style.display = "none")} />}
          <button onClick={addPhoto} disabled={saving || uploadingPhoto || !photoForm.url} className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
            {saving ? "Добавляем..." : "Добавить фото"}
          </button>
        </div>
      )}

      {photosLoading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="grid grid-cols-2 gap-2" style={{ gridAutoRows: "minmax(120px, auto)" }}>
        {photos.map(ph => {
          const size = ph.display_size || "medium";
          const colSpan = size === "large" || size === "wide" ? "col-span-2" : "col-span-1";
          const heightClass = size === "small" ? "h-24" : size === "large" ? "h-64" : size === "wide" ? "h-36" : "h-36";
          return (
            <div key={ph.id} className={`card-glow rounded-2xl overflow-hidden relative ${colSpan}`}>
              <img src={ph.url} alt={ph.title} className={`w-full ${heightClass} object-cover`} />
              {ph.title && <div className="px-2 py-1.5 text-xs truncate" style={P}>{ph.title}</div>}

              {/* Кнопка ⋯ */}
              <button
                onClick={() => { setMenuOpen(menuOpen === ph.id ? null : ph.id); setEditingSize(null); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center font-bold shadow text-base leading-none"
                style={{ background: "rgba(255,255,255,0.93)", color: "hsl(335 50% 35%)" }}>
                ···
              </button>

              {/* Выпадающее меню */}
              {menuOpen === ph.id && (
                <div className="absolute top-10 right-2 rounded-2xl shadow-2xl overflow-hidden z-20 min-w-[160px]"
                  style={{ background: "white", border: "1px solid hsl(335 40% 88%)" }}>

                  {/* Сделать обложкой */}
                  <button
                    onClick={() => setCoverFromPhoto(ph.url)}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm font-medium hover:bg-pink-50 transition-colors border-b"
                    style={{ color: "hsl(335 60% 40%)", borderColor: "hsl(335 30% 92%)" }}>
                    <span className="text-base">🖼</span> Сделать обложкой
                  </button>

                  {/* Изменить размер */}
                  <button
                    onClick={() => { setEditingSize(editingSize === ph.id ? null : ph.id); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm font-medium hover:bg-pink-50 transition-colors border-b"
                    style={{ color: "hsl(335 60% 40%)", borderColor: "hsl(335 30% 92%)" }}>
                    <span className="text-base">⤢</span> Изменить размер
                  </button>

                  {/* Удалить */}
                  <button
                    onClick={() => { setMenuOpen(null); removePhoto(ph.id); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm font-medium hover:bg-red-50 transition-colors"
                    style={{ color: "hsl(0 65% 50%)" }}>
                    <span className="text-base">🗑</span> Удалить фото
                  </button>
                </div>
              )}

              {/* Попап смены размера */}
              {editingSize === ph.id && (
                <div className="absolute inset-x-2 bottom-2 rounded-xl p-2.5 shadow-xl z-30"
                  style={{ background: "rgba(255,255,255,0.98)", border: "1px solid hsl(335 50% 85%)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold" style={PS}>Выбери размер</span>
                    <button onClick={() => setEditingSize(null)} className="text-xs" style={PS}>✕</button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {SIZE_OPTIONS.map(s => (
                      <button key={s.id} onClick={() => updatePhotoSize(ph.id, s.id)}
                        className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-center transition-all"
                        style={(ph.display_size || "medium") === s.id
                          ? { ...GRAD, color: "white" }
                          : { background: "hsl(335 20% 95%)", color: "hsl(335 40% 55%)" }}>
                        <span className="text-sm leading-none">{s.icon}</span>
                        <span className="text-[9px] leading-tight">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!photosLoading && photos.length === 0 && (
          <div className="col-span-2 text-center py-8 text-sm" style={PS}>В папке пока нет фото</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="px-4 pb-6">
      <button onClick={() => setAddingFolder(!addingFolder)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
        {addingFolder ? "✕ Отмена" : "+ Создать папку"}
      </button>
      {addingFolder && (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          {[{ key: "name", label: "Название папки", ph: "До и после, Лицо, Тело..." }, { key: "description", label: "Описание", ph: "Необязательно" }].map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium block mb-1" style={PS}>{f.label}</label>
              <input value={(folderForm as any)[f.key]} onChange={e => setFolderForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.ph} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Обложка папки</label>
            <PhotoUploadButton folder="gallery" label="📷 Выбрать обложку" uploading={uploadingCover} setUploading={setUploadingCover}
              onUploaded={url => setFolderForm(p => ({ ...p, cover_url: url }))} className="w-full" />
            {folderForm.cover_url && <img src={folderForm.cover_url} className="w-full h-28 object-cover rounded-xl mt-2" alt="cover" />}
          </div>
          <button onClick={addFolder} disabled={saving || uploadingCover} className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
            {saving ? "Создаём..." : "Создать"}
          </button>
        </div>
      )}
      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="grid grid-cols-2 gap-3">
        {folders.map(f => (
          <div key={f.id} className="card-glow rounded-2xl overflow-hidden relative">
            <div onClick={() => openFolder(f)} className="cursor-pointer hover:scale-105 transition-all">
              {f.cover_url
                ? <img src={f.cover_url} className="w-full h-28 object-cover" alt={f.name} />
                : <div className="w-full h-28 flex items-center justify-center text-4xl" style={{ background: "hsl(335 80% 96%)" }}>🖼</div>}
              <div className="p-3">
                <div className="font-semibold text-sm truncate" style={P}>{f.name}</div>
                {f.description && <div className="text-xs truncate mt-0.5" style={PS}>{f.description}</div>}
              </div>
            </div>
            {/* Кнопка удаления папки */}
            <button
              onClick={e => { e.stopPropagation(); deleteFolder(f); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow"
              style={{ background: "rgba(255,255,255,0.92)", color: "hsl(0 60% 55%)" }}
              title="Удалить папку">
              ✕
            </button>
          </div>
        ))}
        {!loading && folders.length === 0 && <div className="col-span-2 text-center py-8 text-sm" style={PS}>Папок пока нет</div>}
      </div>
    </div>
  );
}

// ── Редактор прайс-листа ──
const PRICELIST_CATS_KEY = "gp_pricelist_cats";
const DEFAULT_CATS = ["Криолиполиз", "Лицо", "Тело", "Волосы", "СПА", "РФ-лифтинг", "Другое"];

function loadCats(): string[] {
  try { return JSON.parse(localStorage.getItem(PRICELIST_CATS_KEY) || "null") || DEFAULT_CATS; } catch { return DEFAULT_CATS; }
}
function saveCats(c: string[]) { localStorage.setItem(PRICELIST_CATS_KEY, JSON.stringify(c)); }

function AdminPricelistEditor() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", category: "", price: "", duration: "", description: "", photo_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingServicePhoto, setUploadingServicePhoto] = useState(false);
  const [cats, setCats] = useState<string[]>(loadCats);
  const [editingCats, setEditingCats] = useState(false);
  const [newCat, setNewCat] = useState("");
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const addCat = () => {
    const v = newCat.trim();
    if (!v || cats.includes(v)) return;
    const next = [...cats, v];
    setCats(next); saveCats(next); setNewCat("");
  };

  const removeCat = (c: string) => {
    const next = cats.filter(x => x !== c);
    setCats(next); saveCats(next);
    if (form.category === c) setForm(p => ({ ...p, category: "" }));
  };

  const resetCats = () => { setCats(DEFAULT_CATS); saveCats(DEFAULT_CATS); };

  // Drag & drop категорий
  const [dragCat, setDragCat] = useState<string | null>(null);
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draggingCats, setDraggingCats] = useState(false);

  const moveCat = (from: string, to: string) => {
    const arr = [...cats];
    const fi = arr.indexOf(from), ti = arr.indexOf(to);
    if (fi < 0 || ti < 0 || fi === ti) return;
    arr.splice(fi, 1); arr.splice(ti, 0, from);
    setCats(arr); saveCats(arr);
  };

  const load = () => adminPost("pricelist_custom").then(d => { setItems(d.items || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ name: "", category: "", price: "", duration: "", description: "", photo_url: "" });

  const save = async () => {
    if (!form.name || !form.category) return;
    setSaving(true);
    if (editing) {
      await adminPost("pricelist_custom", { action: "update", id: editing.id, ...form });
      setEditing(null);
    } else {
      await adminPost("pricelist_custom", { action: "add", ...form });
      setAdding(false);
    }
    resetForm(); setSaving(false); load();
  };

  const startEdit = (item: any) => {
    setForm({ name: item.name, category: item.category, price: item.price || "", duration: item.duration || "", description: item.description || "", photo_url: item.photo_url || "" });
    setEditing(item); setAdding(false);
  };

  const toggle = async (id: number) => { await adminPost("pricelist_custom", { action: "toggle", id }); load(); };
  const remove = async (id: number) => { await adminPost("pricelist_custom", { action: "deactivate", id }); load(); };

  const grouped: Record<string, any[]> = {};
  items.forEach(it => { if (!grouped[it.category]) grouped[it.category] = []; grouped[it.category].push(it); });

  return (
    <div className="px-4 pb-6">
      <p className="text-xs mb-3" style={PS}>Услуги здесь отображаются клиентам в Прайс-листе</p>

      {/* Редактор категорий */}
      {!adding && !editing && (
        <div className="card-glow rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-sm" style={P}>Категории прайса</div>
            <button onClick={() => setEditingCats(!editingCats)}
              className="px-3 py-1 rounded-xl text-xs font-medium"
              style={editingCats ? { ...GRAD, color: "white" } : { background: "hsl(335 20% 93%)", color: "hsl(335 50% 50%)" }}>
              {editingCats ? "Готово" : "✏️ Изменить"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cats.map(c => (
              <div key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium"
                style={{ background: "hsl(335 80% 97%)", color: "hsl(335 60% 40%)", border: "1px solid hsl(335 60% 85%)" }}>
                {c}
                {editingCats && (
                  <button onClick={() => removeCat(c)} className="ml-0.5 text-[10px] font-bold leading-none"
                    style={{ color: "hsl(0 60% 55%)" }}>✕</button>
                )}
              </div>
            ))}
          </div>
          {editingCats && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input value={newCat} onChange={e => setNewCat(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCat()}
                  placeholder="Новая категория..." autoComplete="off"
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none" style={inp} />
                <button onClick={addCat} disabled={!newCat.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={GRAD}>
                  + Добавить
                </button>
              </div>
              <button onClick={resetCats} className="text-xs" style={{ color: "hsl(335 30% 65%)" }}>
                Сбросить к стандартным
              </button>
            </div>
          )}
        </div>
      )}

      {!adding && !editing && (
        <button onClick={() => setAdding(true)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
          + Добавить услугу
        </button>
      )}
      {/* Форма — встроенный JSX, НЕ отдельный компонент, чтобы клавиатура не пропадала */}
      {(adding || editing) && (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Название услуги</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Криолиполиз 2 зоны" autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Цена</label>
            <input value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              placeholder="3 500 ₽" autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Длительность</label>
            <input value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
              placeholder="60 мин" autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Описание</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Необязательно" autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Фото услуги</label>
            <PhotoUploadButton folder="pricelist" label="📷 Выбрать фото" uploading={uploadingServicePhoto}
              setUploading={setUploadingServicePhoto} onUploaded={url => setForm(p => ({ ...p, photo_url: url }))} className="w-full mb-2" />
            {form.photo_url && <img src={form.photo_url} className="w-full h-36 object-cover rounded-xl" alt="preview" onError={e => (e.currentTarget.style.display = "none")} />}
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Категория</label>
            <div className="flex flex-wrap gap-2">
              {cats.map(c => (
                <button key={c} onClick={() => setForm(p => ({ ...p, category: c }))}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={form.category === c ? { ...GRAD, color: "white" } : { background: "white", color: "hsl(335 50% 55%)", border: "1px solid hsl(335 50% 85%)" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
              {saving ? "Сохраняем..." : editing ? "Сохранить" : "Добавить"}
            </button>
            <button onClick={() => { resetForm(); setAdding(false); setEditing(null); }}
              className="px-4 py-3 rounded-xl text-sm" style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}

      {/* Подсказка drag & drop */}
      {!loading && items.length > 0 && !adding && !editing && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-[11px]" style={PS}>Зажми заголовок категории чтобы переместить</span>
          {draggingCats && <span className="text-[11px] font-semibold" style={{ color: "hsl(335 70% 50%)" }}>· режим перестановки</span>}
        </div>
      )}

      {/* Категории в порядке из cats, потом остальные */}
      {[...cats.filter(c => grouped[c]), ...Object.keys(grouped).filter(c => !cats.includes(c))].map(cat => {
        const catItems = grouped[cat] || [];
        const isDragOver = dragOverCat === cat && dragCat !== cat;
        return (
          <div key={cat} className="mb-4"
            onDragOver={e => { e.preventDefault(); setDragOverCat(cat); }}
            onDrop={() => { if (dragCat && dragCat !== cat) { moveCat(dragCat, cat); } setDragCat(null); setDragOverCat(null); }}
            style={isDragOver ? { transform: "scale(1.01)", transition: "transform 0.15s" } : {}}>
            {/* Заголовок категории — drag handle */}
            <div
              draggable
              onDragStart={() => setDragCat(cat)}
              onDragEnd={() => { setDragCat(null); setDragOverCat(null); setDraggingCats(false); }}
              onTouchStart={() => { longPressTimer.current = setTimeout(() => { setDragCat(cat); setDraggingCats(true); }, 500); }}
              onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
              className="px-3 py-2 rounded-xl mb-2 text-xs font-bold tracking-wide flex items-center justify-between select-none cursor-grab active:cursor-grabbing"
              style={dragCat === cat
                ? { background: "hsl(335 50% 70%)", color: "white", opacity: 0.7 }
                : isDragOver
                  ? { background: "hsl(335 80% 50%)", color: "white" }
                  : { ...GRAD, color: "white" }}>
              <span>{cat}</span>
              <span className="text-white/60 text-base">⠿</span>
            </div>
            <div className="space-y-2">
              {catItems.map(item => (
                <div key={item.id} className="card-glow rounded-2xl p-3" style={!item.is_active ? { opacity: 0.5 } : {}}>
                  <div className="flex items-start gap-3">
                    {item.photo_url && <img src={item.photo_url} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt={item.name} onError={e => (e.currentTarget.style.display = "none")} />}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm" style={P}>{item.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.price && <span className="text-xs font-bold" style={{ color: "hsl(335 80% 55%)" }}>{item.price}</span>}
                        {item.duration && <span className="text-xs" style={PS}>{item.duration}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(item)} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: "hsl(335 50% 95%)", color: "hsl(335 60% 45%)" }}>✏️</button>
                      <button onClick={() => toggle(item.id)} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
                        {item.is_active ? "Скрыть" : "Показать"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {!loading && items.length === 0 && <div className="text-center py-10 text-sm" style={PS}>Услуг пока нет — добавьте первую!</div>}

      {items.length > 0 && (
        <div className="mt-6 card-glow rounded-2xl p-4">
          <div className="font-semibold text-sm mb-3" style={P}>Выгрузить прайс</div>
          <button onClick={() => {
            const header = "Категория,Название,Цена,Длительность,Описание\n";
            const rows = items.map((it: any) =>
              `"${it.category}","${it.name}","${it.price || ""}","${it.duration || ""}","${it.description || ""}"`
            ).join("\n");
            const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "praiс-list.csv"; a.click();
            URL.revokeObjectURL(url);
          }} className="w-full py-3 rounded-xl font-semibold text-white text-sm mb-2" style={GRAD}>
            ⬇️ Скачать CSV
          </button>
          <button onClick={() => {
            const lines = items.map((it: any) =>
              `${it.name} — ${it.price || "цена по запросу"}${it.duration ? ` (${it.duration})` : ""}`
            ).join("\n");
            navigator.clipboard.writeText(lines).then(() => alert("Прайс скопирован!"));
          }} className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "hsl(335 20% 93%)", color: "hsl(335 50% 50%)" }}>
            📋 Скопировать текстом
          </button>
        </div>
      )}
    </div>
  );
}

// ── Рассылка и уведомления ──
function AdminBroadcast() {
  const [tab, setTab] = useState<"templates" | "custom" | "personal">("templates");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<string[]>(["sms"]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Для личного уведомления
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientMsg, setClientMsg] = useState("");
  const [clientChannels, setClientChannels] = useState<string[]>(["sms"]);
  const [personalSending, setPersonalSending] = useState(false);
  const [personalResult, setPersonalResult] = useState<string | null>(null);

  useEffect(() => {
    adminPost("clients").then(d => setClients(d.clients || []));
  }, []);

  const PHONE = "+79046015556"; // телефон салона

  const templates = [
    {
      id: "remind",
      label: "Напоминание о записи",
      icon: "Bell",
      color: "from-blue-500 to-indigo-500",
      text: "Girly Paradise: напоминаем, что вы записаны на процедуру. Ждём вас! Адрес: ул. Заречная, 10, м. Парнас. Тел: " + PHONE,
    },
    {
      id: "book",
      label: "Запись подтверждена",
      icon: "CalendarCheck",
      color: "from-emerald-500 to-teal-500",
      text: "Girly Paradise: ваша запись подтверждена! Ждём вас по адресу ул. Заречная, 10, м. Парнас. Есть вопросы? Звоните: " + PHONE,
    },
    {
      id: "cancel",
      label: "Запись отменена",
      icon: "CalendarX",
      color: "from-red-500 to-rose-500",
      text: "Girly Paradise: ваша запись отменена. Если хотите перенести — позвоните нам: " + PHONE + " или запишитесь снова на сайте.",
    },
    {
      id: "review",
      label: "Просьба оставить отзыв",
      icon: "Star",
      color: "from-yellow-500 to-amber-500",
      text: "Girly Paradise: спасибо, что были у нас! Будем рады, если оставите отзыв — это очень важно для нас 🌸 " + PHONE,
    },
    {
      id: "promo",
      label: "Запишитесь снова",
      icon: "Sparkles",
      color: "from-pink-500 to-rose-500",
      text: "Girly Paradise: уже давно не были у нас? Приходите на процедуры! Запись: " + PHONE + " или онлайн на сайте.",
    },
  ];

  const channelList = [
    { id: "sms", label: "SMS", emoji: "📱" },
    { id: "whatsapp", label: "WhatsApp", emoji: "💚" },
    { id: "telegram", label: "Telegram", emoji: "✈️" },
    { id: "max", label: "MAX", emoji: "🟣" },
    { id: "chat", label: "Чат сайта", emoji: "💬" },
  ];

  const toggle = (ch: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(ch) ? list.filter(x => x !== ch) : [...list, ch]);

  const buildLinks = (phone: string, msg: string, chs: string[]) => {
    const p = phone.replace(/\D/g, "");
    const enc = encodeURIComponent(msg);
    const links: { label: string; url: string; emoji: string }[] = [];
    if (chs.includes("whatsapp")) links.push({ label: "WhatsApp", url: `https://wa.me/${p}?text=${enc}`, emoji: "💚" });
    if (chs.includes("telegram")) links.push({ label: "Telegram", url: `https://t.me/+${p}`, emoji: "✈️" });
    if (chs.includes("max")) links.push({ label: "MAX", url: `https://max.ru/send?phone=${p}&text=${enc}`, emoji: "🟣" });
    return links;
  };

  // Массовая рассылка через SMS/чат
  const sendBroadcast = async () => {
    if (!message.trim()) return;
    const smsChs = channels.filter(c => c === "sms" || c === "chat");
    if (smsChs.length === 0) {
      // Только мессенджеры — подсказываем ссылки
      setResult("Для WhatsApp/Telegram рассылки используй «Личное уведомление» — отправь каждому клиенту вручную через кнопку.");
      return;
    }
    setSending(true); setResult(null);
    const data = await adminPost("broadcast", { message, channels: smsChs });
    setResult(data.ok ? `✓ Отправлено ${data.sent || 0} получателям` : "Ошибка. Проверь настройки SMS.ru");
    setSending(false);
    if (data.ok) setMessage("");
  };

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.includes(clientSearch)
  );

  // Личное уведомление клиенту
  const sendPersonal = async () => {
    if (!selectedClient || !clientMsg.trim()) return;
    const smsChs = clientChannels.filter(c => c === "sms");
    setPersonalSending(true); setPersonalResult(null);
    if (smsChs.length > 0) {
      const data = await adminPost("notifications", { action: "send", phone: selectedClient.phone, message: clientMsg, client_id: selectedClient.id });
      if (data.ok) setPersonalResult("sms_sent");
    }
    setPersonalSending(false);
    if (clientChannels.filter(c => c !== "sms" && c !== "chat").length > 0) {
      setPersonalResult("links");
    } else if (!personalResult) {
      setPersonalResult("sms_sent");
    }
  };

  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  return (
    <div className="px-4 pb-6">
      {/* Вкладки */}
      <div className="flex rounded-2xl overflow-hidden mb-4" style={{ background: "hsl(335 30% 92%)" }}>
        {[
          { id: "templates", label: "Шаблоны" },
          { id: "custom", label: "Всем" },
          { id: "personal", label: "Лично" },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id as any); setResult(null); setPersonalResult(null); }}
            className="flex-1 py-2.5 text-xs font-semibold transition-all"
            style={tab === t.id ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ШАБЛОНЫ */}
      {tab === "templates" && (
        <div className="space-y-3">
          <p className="text-xs mb-3" style={PS}>Выбери шаблон — текст подставится автоматически. Затем перейди во вкладку «Всем» или «Лично».</p>
          {templates.map(t => (
            <button key={t.id} onClick={() => { setMessage(t.text); setClientMsg(t.text); setTab("personal"); }}
              className="w-full card-glow rounded-2xl p-4 text-left hover:scale-[1.01] transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon name={t.icon as any} size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={P}>{t.label}</div>
                  <div className="text-xs mt-0.5 truncate" style={PS}>{t.text.slice(0, 55)}...</div>
                </div>
                <Icon name="ChevronRight" size={16} style={PS} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* МАССОВАЯ РАССЫЛКА */}
      {tab === "custom" && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl text-xs" style={{ background: "hsl(335 80% 97%)", color: "hsl(335 60% 45%)", border: "1px solid hsl(335 70% 88%)" }}>
            💡 SMS и чат на сайте отправляются всем сразу. Для WhatsApp/Telegram — используй вкладку «Лично».
          </div>
          <div>
            <p className="text-xs font-medium mb-2" style={PS}>Каналы рассылки</p>
            <div className="flex gap-2 flex-wrap">
              {channelList.map(ch => (
                <button key={ch.id} onClick={() => toggle(ch.id, channels, setChannels)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={channels.includes(ch.id)
                    ? { ...GRAD, color: "white" }
                    : { background: "white", color: "hsl(335 50% 45%)", border: "1px solid hsl(335 40% 85%)" }}>
                  {ch.emoji} {ch.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Текст сообщения</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
              placeholder="Текст для всех клиентов..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inp} />
            <div className="text-xs mt-1 text-right" style={PS}>{message.length} символов</div>
          </div>
          {result && (
            <div className="p-3 rounded-xl text-sm font-medium text-center"
              style={{ background: result.startsWith("✓") ? "hsl(142 60% 94%)" : "hsl(50 90% 95%)", color: result.startsWith("✓") ? "hsl(142 60% 35%)" : "hsl(40 70% 35%)" }}>
              {result}
            </div>
          )}
          <button onClick={sendBroadcast} disabled={sending || !message.trim()}
            className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg"
            style={message.trim() ? GRAD : { background: "hsl(335 20% 90%)", color: "hsl(335 20% 65%)" }}>
            {sending ? "Отправляем..." : "🚀 Разослать всем клиентам"}
          </button>
        </div>
      )}

      {/* ЛИЧНОЕ УВЕДОМЛЕНИЕ */}
      {tab === "personal" && (
        <div className="space-y-4">
          {/* Поиск клиента */}
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Выбери клиента</label>
            <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Имя или телефон..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-2" style={inp} />
            {clientSearch && (
              <div className="max-h-44 overflow-y-auto space-y-1 mb-2">
                {filteredClients.slice(0, 8).map(c => (
                  <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(""); setPersonalResult(null); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left"
                    style={selectedClient?.id === c.id
                      ? { background: "hsl(335 80% 60% / 0.1)", border: "1px solid hsl(335 70% 80%)" }
                      : { background: "hsl(335 80% 98%)", border: "1px solid hsl(335 30% 92%)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={GRAD}>
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={P}>{c.name}</div>
                      <div className="text-xs" style={PS}>{c.phone}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedClient && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "hsl(335 80% 60% / 0.08)", border: "1px solid hsl(335 70% 82%)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={GRAD}>
                  {selectedClient.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={P}>{selectedClient.name}</div>
                  <div className="text-xs" style={PS}>{selectedClient.phone}</div>
                </div>
                <button onClick={() => { setSelectedClient(null); setPersonalResult(null); }} className="text-xs px-2 py-1 rounded-lg" style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>✕</button>
              </div>
            )}
          </div>

          {/* Каналы */}
          <div>
            <p className="text-xs font-medium mb-2" style={PS}>Как отправить</p>
            <div className="flex gap-2 flex-wrap">
              {channelList.map(ch => (
                <button key={ch.id} onClick={() => toggle(ch.id, clientChannels, setClientChannels)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={clientChannels.includes(ch.id)
                    ? { ...GRAD, color: "white" }
                    : { background: "white", color: "hsl(335 50% 45%)", border: "1px solid hsl(335 40% 85%)" }}>
                  {ch.emoji} {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Сообщение */}
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Текст сообщения</label>
            <textarea value={clientMsg} onChange={e => setClientMsg(e.target.value)} rows={4}
              placeholder="Текст для клиента..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inp} />
          </div>

          {/* Ссылки мессенджеров (после отправки или если выбраны) */}
          {selectedClient && clientChannels.some(c => ["whatsapp", "telegram"].includes(c)) && (
            <div className="space-y-2">
              <p className="text-xs font-medium" style={PS}>Открыть диалог в мессенджере:</p>
              {buildLinks(selectedClient.phone, clientMsg || " ", clientChannels).map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full py-3 px-4 rounded-xl font-semibold text-sm"
                  style={{ background: "hsl(335 80% 60% / 0.08)", color: "hsl(335 70% 40%)", border: "1px solid hsl(335 60% 85%)" }}>
                  <span>{link.emoji}</span> Написать в {link.label}
                </a>
              ))}
            </div>
          )}

          {personalResult === "sms_sent" && (
            <div className="p-3 rounded-xl text-sm font-medium text-center"
              style={{ background: "hsl(142 60% 94%)", color: "hsl(142 60% 35%)" }}>
              ✓ SMS отправлено
            </div>
          )}

          <button onClick={sendPersonal} disabled={personalSending || !selectedClient || !clientMsg.trim()}
            className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg"
            style={selectedClient && clientMsg.trim() ? GRAD : { background: "hsl(335 20% 90%)", color: "hsl(335 20% 65%)" }}>
            {personalSending ? "Отправляем..." : "📤 Отправить"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Публичная галерея для клиентов ──
function ClientGalleryPage({ setPage, onBack }: { setPage: (p: Page) => void; onBack?: () => void }) {
  const [folders, setFolders] = useState<any[]>([]);
  const [activeFolder, setActiveFolder] = useState<any | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState<{ url: string; id: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  useEffect(() => {
    adminPost("gallery_folders").then(d => { setFolders(d.folders || []); setLoading(false); });
  }, []);

  const openFolder = (f: any) => {
    setActiveFolder(f); setPhotosLoading(true);
    adminPost("gallery", { folder_id: f.id }).then(d => { setPhotos(d.gallery || []); setPhotosLoading(false); });
  };

  const removePhoto = async (id: number) => {
    setDeleting(true);
    await adminPost("gallery", { action: "deactivate", id });
    setPhotos(prev => prev.filter(p => p.id !== id));
    setFullscreen(null);
    setMenuOpen(null);
    setDeleting(false);
  };

  if (fullscreen) return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setFullscreen(null)}>
      <img src={fullscreen.url} className="max-w-full max-h-full object-contain" alt="фото" />
      {/* Закрыть */}
      <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl"
        onClick={() => setFullscreen(null)}>✕</button>
      {/* Удалить */}
      <button
        onClick={e => { e.stopPropagation(); if (confirm("Удалить это фото?")) removePhoto(fullscreen.id); }}
        disabled={deleting}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm"
        style={{ background: "rgba(220,38,38,0.85)", color: "white", backdropFilter: "blur(8px)" }}>
        🗑 {deleting ? "Удаляем..." : "Удалить фото"}
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        {activeFolder ? (
          <button onClick={() => { setActiveFolder(null); setPhotos([]); }} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
            <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
          </button>
        ) : (
          <button onClick={() => onBack ? onBack() : setPage("home")} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
            <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
          </button>
        )}
        <div>
          <h1 className="text-xl font-oswald font-bold" style={P}>{activeFolder ? activeFolder.name : "Галерея 🖼"}</h1>
          {activeFolder?.description && <p className="text-xs" style={PS}>{activeFolder.description}</p>}
        </div>
      </div>

      {!activeFolder && (
        <div className="px-4 pb-6">
          {loading && <div className="text-center py-12"><div className="text-3xl animate-float">🌸</div></div>}
          {!loading && folders.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🌸</div>
              <p className="text-sm" style={PS}>Галерея скоро будет пополнена</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {folders.map(f => (
              <button key={f.id} onClick={() => openFolder(f)} className="card-glow rounded-2xl overflow-hidden text-left hover:scale-105 transition-all">
                {f.cover_url
                  ? <img src={f.cover_url} className="w-full h-32 object-cover" alt={f.name} />
                  : <div className="w-full h-32 flex items-center justify-center text-4xl" style={{ background: "hsl(335 80% 96%)" }}>🌸</div>}
                <div className="p-3">
                  <div className="font-semibold text-sm" style={P}>{f.name}</div>
                  {f.description && <div className="text-xs mt-0.5 truncate" style={PS}>{f.description}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeFolder && (
        <div className="px-4 pb-6">
          {photosLoading && <div className="text-center py-12"><div className="text-3xl animate-float">🌸</div></div>}
          {!photosLoading && photos.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📷</div>
              <p className="text-sm" style={PS}>В этой папке пока нет фото</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2" style={{ gridAutoRows: "minmax(120px, auto)" }}>
            {photos.map(ph => {
              const size = ph.display_size || "medium";
              const colSpan = size === "large" || size === "wide" ? "col-span-2" : "col-span-1";
              const heightClass = size === "small" ? "h-24" : size === "large" ? "h-64" : size === "wide" ? "h-36" : "h-36";
              return (
                <div key={ph.id} className={`rounded-2xl overflow-hidden relative group ${colSpan}`}>
                  <button onClick={() => setFullscreen({ url: ph.url, id: ph.id })}
                    className="w-full hover:scale-[1.02] transition-all block">
                    <img src={ph.url} alt={ph.title} className={`w-full ${heightClass} object-cover`} />
                    {ph.title && <div className="px-2 py-1.5 text-xs text-left" style={{ background: "hsl(335 80% 98%)", color: "hsl(335 50% 30%)" }}>{ph.title}</div>}
                  </button>
                  {/* Кнопка удаления на фото (три точки) */}
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === ph.id ? null : ph.id); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center font-bold shadow text-base leading-none"
                    style={{ background: "rgba(255,255,255,0.93)", color: "hsl(335 50% 35%)" }}>
                    ···
                  </button>
                  {menuOpen === ph.id && (
                    <div className="absolute top-10 right-2 rounded-2xl shadow-2xl overflow-hidden z-20 min-w-[140px]"
                      style={{ background: "white", border: "1px solid hsl(335 40% 88%)" }}>
                      <button
                        onClick={() => { setFullscreen({ url: ph.url, id: ph.id }); setMenuOpen(null); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm font-medium hover:bg-pink-50 transition-colors border-b"
                        style={{ color: "hsl(335 60% 40%)", borderColor: "hsl(335 30% 92%)" }}>
                        <span>🔍</span> Открыть
                      </button>
                      <button
                        onClick={() => { if (confirm("Удалить это фото?")) removePhoto(ph.id); }}
                        disabled={deleting}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm font-medium hover:bg-red-50 transition-colors"
                        style={{ color: "hsl(0 65% 50%)" }}>
                        <span>🗑</span> Удалить
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Сотрудники ──
function AdminStaff({ currentStaffId }: { currentStaffId: number }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", role: "specialist", pin: "" });
  const [saving, setSaving] = useState(false);
  const [editPin, setEditPin] = useState<number | null>(null);
  const [newPin, setNewPin] = useState("");

  const load = () => adminPost("staff").then(d => { setStaff(d.staff || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name || !form.pin || form.pin.length < 4) return;
    setSaving(true);
    await adminPost("staff", { action: "add", ...form });
    setForm({ name: "", phone: "", role: "specialist", pin: "" });
    setAdding(false); setSaving(false); load();
  };

  const remove = async (id: number) => {
    if (!confirm("Удалить сотрудника?")) return;
    await adminPost("staff", { action: "delete", id }); load();
  };

  const resetPin = async (id: number) => {
    if (newPin.length < 4) return;
    await adminPost("staff", { action: "reset_pin", id, pin: newPin });
    setEditPin(null); setNewPin(""); load();
  };

  const inputStyle = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  return (
    <div className="px-4 pb-6">
      <div className="card-glow rounded-2xl p-4 mb-4 text-sm" style={{ ...PS, fontSize: 12, background: "hsl(335 80% 97%)", border: "1px solid hsl(335 60% 88%)" }}>
        💡 Специалист входит в панель со своим пин-кодом. Он видит расписание, клиентов, галерею и сообщения — но не видит финансы и настройки.
      </div>

      <button onClick={() => setAdding(!adding)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
        {adding ? "✕ Отмена" : "+ Добавить сотрудника"}
      </button>

      {adding && (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          {[
            { key: "name", label: "Имя", ph: "Имя сотрудника" },
            { key: "phone", label: "Телефон", ph: "+7..." },
            { key: "pin", label: "Пин-код (4 цифры)", ph: "1234" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium block mb-1" style={PS}>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.ph} maxLength={f.key === "pin" ? 4 : 100} type={f.key === "pin" ? "number" : "text"}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Роль</label>
            <div className="flex gap-2">
              {[{ val: "specialist", label: "Специалист" }, { val: "admin", label: "Администратор" }].map(r => (
                <button key={r.val} onClick={() => setForm(p => ({ ...p, role: r.val }))}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={form.role === r.val ? { ...GRAD, color: "white" } : { background: "white", color: "hsl(335 50% 55%)", border: "1px solid hsl(335 50% 85%)" }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={add} disabled={saving} className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
            {saving ? "Сохраняем..." : "Добавить"}
          </button>
        </div>
      )}

      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="space-y-3">
        {staff.map(s => (
          <div key={s.id} className="card-glow rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={GRAD}>
                {s.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={P}>{s.name}</div>
                <div className="text-xs" style={PS}>{s.role === "owner" ? "👑 Владелец" : s.role === "admin" ? "🛡 Администратор" : "💅 Специалист"} · {s.phone}</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={s.is_active ? { background: "hsl(142 60% 92%)", color: "hsl(142 60% 35%)" } : { background: "hsl(0 60% 95%)", color: "hsl(0 60% 55%)" }}>
                {s.is_active ? "Активен" : "Отключён"}
              </span>
            </div>
            {s.role !== "owner" && s.id !== currentStaffId && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setEditPin(editPin === s.id ? null : s.id); setNewPin(""); }}
                  className="flex-1 py-2 rounded-xl text-xs font-medium"
                  style={{ background: "hsl(335 50% 96%)", color: "hsl(335 60% 45%)", border: "1px solid hsl(335 50% 85%)" }}>
                  Сменить пин
                </button>
                <button onClick={() => remove(s.id)}
                  className="py-2 px-3 rounded-xl text-xs font-medium"
                  style={{ background: "hsl(0 60% 96%)", color: "hsl(0 60% 50%)" }}>
                  Удалить
                </button>
              </div>
            )}
            {editPin === s.id && (
              <div className="mt-2 flex gap-2">
                <input value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="Новый пин" maxLength={4}
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
                <button onClick={() => resetPin(s.id)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={GRAD}>
                  ОК
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Профиль владельца ──
function AdminProfile({ onLogout }: { onLogout: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputStyle = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  useEffect(() => {
    adminPost("profile").then(d => setProfile(d.profile || {}));
  }, []);

  const set = (key: string, val: string) => setProfile((p: any) => ({ ...p, [key]: val }));

  const save = async () => {
    setSaving(true);
    await adminPost("profile", { action: "save", ...profile });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!profile) return <div className="text-center py-10"><div className="text-3xl animate-float">🌸</div></div>;

  return (
    <div className="px-4 pb-6 space-y-3">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white font-bold" style={GRAD}>
          {(profile.name || "Г")[0]}
        </div>
        <div>
          <div className="font-oswald font-bold text-lg" style={P}>{profile.name} {profile.surname}</div>
          <div className="text-xs" style={PS}>{profile.specialization}</div>
        </div>
      </div>

      {[
        { key: "name", label: "Имя" },
        { key: "surname", label: "Фамилия" },
        { key: "birthdate", label: "Дата рождения", type: "date" },
        { key: "site_name", label: "Название сайта" },
        { key: "phone", label: "Телефон" },
        { key: "email", label: "Почта" },
        { key: "specialization", label: "Специализация" },
      ].map(f => (
        <div key={f.key}>
          <label className="text-xs font-medium block mb-1" style={PS}>{f.label}</label>
          <input value={profile[f.key] || ""} onChange={e => set(f.key, e.target.value)}
            type={f.type || "text"}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
        </div>
      ))}

      <div>
        <label className="text-xs font-medium block mb-1" style={PS}>О себе</label>
        <textarea value={profile.about || ""} onChange={e => set("about", e.target.value)} rows={3}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
      </div>

      <p className="text-xs font-semibold pt-1" style={PS}>Социальные сети</p>
      {[
        { key: "vk_url", label: "ВКонтакте", ph: "https://vk.ru/..." },
        { key: "instagram_url", label: "Instagram", ph: "https://instagram.com/..." },
        { key: "telegram_url", label: "Telegram", ph: "https://t.me/..." },
        { key: "whatsapp_url", label: "WhatsApp", ph: "https://wa.me/..." },
      ].map(f => (
        <div key={f.key}>
          <label className="text-xs font-medium block mb-1" style={PS}>{f.label}</label>
          <input value={profile[f.key] || ""} onChange={e => set(f.key, e.target.value)}
            placeholder={f.ph} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
        </div>
      ))}

      <button onClick={save} disabled={saving}
        className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg" style={GRAD}>
        {saved ? "Сохранено ✓" : saving ? "Сохраняем..." : "Сохранить профиль"}
      </button>

      <button onClick={onLogout}
        className="w-full py-3 rounded-2xl font-semibold text-sm mt-2"
        style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
        Выйти из учётной записи
      </button>
    </div>
  );
}

// ── Рабочее расписание ──
function AdminWorkSchedule() {
  const DAY_NAMES = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputStyle = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  useEffect(() => {
    adminPost("work_schedule").then(d => {
      const sorted = (d.days || []).sort((a: any, b: any) => ((a.day_of_week + 6) % 7) - ((b.day_of_week + 6) % 7));
      setDays(sorted); setLoading(false);
    });
  }, []);

  const update = (idx: number, key: string, val: any) => {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, [key]: val } : d));
  };

  const save = async () => {
    setSaving(true);
    await adminPost("work_schedule", { action: "save", days });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="text-center py-10"><div className="text-3xl animate-float">🌸</div></div>;

  return (
    <div className="px-4 pb-6">
      <p className="text-xs mb-4" style={PS}>Укажи рабочие дни и часы — они будут отображаться для клиентов</p>
      <div className="space-y-3">
        {days.map((day, i) => {
          const dayIdx = (day.day_of_week + 6) % 7;
          return (
            <div key={day.day_of_week} className="card-glow rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm" style={P}>{DAY_NAMES[dayIdx]}</span>
                <button onClick={() => update(i, "is_working", !day.is_working)}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  style={day.is_working
                    ? { ...GRAD, color: "white" }
                    : { background: "hsl(335 20% 93%)", color: "hsl(335 30% 65%)" }}>
                  {day.is_working ? "Рабочий" : "Выходной"}
                </button>
              </div>
              {day.is_working && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs block mb-1" style={PS}>С</label>
                    <input type="time" value={day.time_from || "11:00"} onChange={e => update(i, "time_from", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs block mb-1" style={PS}>До</label>
                    <input type="time" value={day.time_to || "20:00"} onChange={e => update(i, "time_to", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={save} disabled={saving} className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg mt-4" style={GRAD}>
        {saved ? "Сохранено ✓" : saving ? "Сохраняем..." : "Сохранить расписание"}
      </button>
    </div>
  );
}

// ── Шаблоны уведомлений ──
function AdminNotificationTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const VARS = ["{service}", "{day}", "{time}", "{address}", "{phone}", "{name}"];

  const load = () => adminPost("notification_templates").then(d => { setTemplates(d.templates || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    await adminPost("notification_templates", { action: "save", template_key: editing.template_key, title: editing.title, body: editing.body });
    setSaving(false); setEditing(null); load();
  };

  return (
    <div className="px-4 pb-6">
      <p className="text-xs mb-4" style={PS}>
        Переменные: {VARS.map(v => <code key={v} className="mx-0.5 px-1 rounded text-[10px]" style={{ background: "hsl(335 50% 95%)", color: "hsl(335 70% 45%)" }}>{v}</code>)}
      </p>

      {editing ? (
        <div className="card-glow rounded-2xl p-4 space-y-3">
          <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 text-sm mb-2" style={PS}>
            <Icon name="ChevronLeft" size={16} /> Назад
          </button>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Название шаблона</label>
            <input value={editing.title} onChange={e => setEditing((p: any) => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-2" style={PS}>Текст сообщения</label>
            <textarea value={editing.body} onChange={e => setEditing((p: any) => ({ ...p, body: e.target.value }))}
              rows={5} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inp} />
            <p className="text-xs mt-1" style={PS}>{editing.body?.length || 0} символов</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VARS.map(v => (
              <button key={v} onClick={() => setEditing((p: any) => ({ ...p, body: (p.body || "") + v }))}
                className="px-2 py-1 rounded-lg text-[11px] font-medium"
                style={{ background: "hsl(335 50% 95%)", color: "hsl(335 70% 45%)", border: "1px solid hsl(335 50% 85%)" }}>
                +{v}
              </button>
            ))}
          </div>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
            {saving ? "Сохраняем..." : "Сохранить шаблон"}
          </button>
        </div>
      ) : (
        <>
          {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
          <div className="space-y-3">
            {templates.map(t => (
              <div key={t.id} className="card-glow rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-1" style={P}>{t.title}</div>
                    <p className="text-xs leading-relaxed line-clamp-2" style={PS}>{t.body}</p>
                  </div>
                  <button onClick={() => setEditing({ ...t })} className="px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0"
                    style={{ background: "hsl(335 50% 95%)", color: "hsl(335 60% 45%)" }}>
                    ✏️ Изменить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Оформление сайта ──
function AdminSiteSettings() {
  const [tab, setTab] = useState<"design" | "sections" | "documents">("design");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingWall, setUploadingWall] = useState(false);
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const load = () => adminPost("site_settings").then(d => { setSettings(d.settings || {}); setLoading(false); });
  useEffect(() => { load(); }, []);

  const set = (key: string, val: string) => setSettings(p => ({ ...p, [key]: val }));

  const saveAll = async () => {
    setSaving(true);
    await adminPost("site_settings", { action: "save", settings });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const COLORS = ["hsl(335 80% 58%)", "hsl(0 70% 55%)", "hsl(270 60% 55%)", "hsl(210 70% 50%)", "hsl(150 60% 45%)", "hsl(30 80% 50%)"];

  if (loading) return <div className="text-center py-12"><div className="text-3xl animate-float">🌸</div></div>;

  const SECTION_CARDS = [
    { key: "pricelist", label: "Прайс-лист",  imgKey: "section_pricelist_img",  hKey: "section_pricelist_h",  nameKey: "section_pricelist_name" },
    { key: "gallery",   label: "Галерея",      imgKey: "section_gallery_img",    hKey: "section_gallery_h",    nameKey: "section_gallery_name" },
    { key: "reviews",   label: "Отзывы",       imgKey: "section_reviews_img",    hKey: "section_reviews_h",    nameKey: "section_reviews_name" },
    { key: "documents", label: "Документы",    imgKey: "section_documents_img",  hKey: "section_documents_h",  nameKey: "section_documents_name" },
  ];

  return (
    <div className="pb-6">
      {/* Вкладки */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden" style={{ background: "hsl(335 30% 92%)" }}>
          {([
            { id: "design",    label: "Дизайн" },
            { id: "sections",  label: "Разделы" },
            { id: "documents", label: "Документы" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="py-2.5 text-xs font-semibold transition-all"
              style={tab === t.id ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ВКЛАДКА: РАЗДЕЛЫ ── */}
      {tab === "sections" && (
        <div className="px-4 space-y-4">
          <p className="text-xs" style={PS}>Управляй карточками в блоке «Разделы» на главной: включай/выключай, меняй название и фото.</p>

          {SECTION_CARDS.map(f => (
            <div key={f.key} className="card-glow rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {/* Тоггл вкл/выкл */}
                <button
                  onClick={() => { set(`section_${f.key}_hidden`, settings[`section_${f.key}_hidden`] === "true" ? "false" : "true"); saveAll(); }}
                  className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
                  style={{ background: settings[`section_${f.key}_hidden`] === "true" ? "hsl(335 20% 82%)" : "hsl(335 80% 58%)" }}>
                  <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                    style={{ left: settings[`section_${f.key}_hidden`] === "true" ? 2 : 24 }} />
                </button>
                <div className="flex-1">
                  <div className="text-xs font-semibold mb-1" style={P}>{f.label}</div>
                  {/* Переименование */}
                  <input
                    value={settings[f.nameKey] || ""}
                    onChange={e => set(f.nameKey, e.target.value)}
                    onBlur={saveAll}
                    placeholder={f.label}
                    className="w-full px-2.5 py-1.5 rounded-lg text-sm outline-none"
                    style={inp} />
                </div>
              </div>
              {/* Фото */}
              <SectionPhotoUpload
                settingKey={f.imgKey}
                currentUrl={settings[f.imgKey]}
                onSaved={(key, url) => setSettings(prev => ({ ...prev, [key]: url }))}
              />
              {/* Высота */}
              {settings[f.imgKey] && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={PS}>Высота карточки</span>
                    <span className="text-xs font-medium" style={P}>{settings[f.hKey] || "140"}px</span>
                  </div>
                  <input type="range" min="60" max="280" step="4"
                    value={settings[f.hKey] || "140"}
                    onChange={e => set(f.hKey, e.target.value)}
                    className="w-full accent-pink-500" />
                </div>
              )}
            </div>
          ))}

          {/* Вкл/выкл разделы сайта (AdminSectionsEditor встроен) */}
          <div className="card-glow rounded-2xl p-4">
            <div className="font-semibold text-sm mb-3" style={P}>Дополнительные разделы</div>
            <AdminSectionsEditor />
          </div>

          <button onClick={saveAll} disabled={saving} className="w-full py-3 rounded-2xl font-semibold text-white text-sm" style={GRAD}>
            {saving ? "Сохраняем..." : "💾 Сохранить разделы"}
          </button>
          {saved && <div className="p-3 rounded-xl text-sm text-center" style={{ background: "hsl(142 60% 94%)", color: "hsl(142 60% 35%)" }}>✓ Сохранено</div>}
        </div>
      )}

      {/* ── ВКЛАДКА: ДОКУМЕНТЫ ── */}
      {tab === "documents" && (
        <div className="px-4">
          <AdminDocuments />
        </div>
      )}

      {/* ── ВКЛАДКА: ДИЗАЙН ── */}
      {tab === "design" && <div className="px-4 space-y-5">
      {/* Цвет главного экрана */}
      <div className="card-glow rounded-2xl p-4">
        <div className="font-semibold text-sm mb-3" style={P}>Цвет главного экрана</div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {COLORS.map(c => (
            <button key={c} onClick={() => { set("hero_color_from", c); set("hero_color_to", c); }}
              className="h-10 rounded-xl border-2 transition-all"
              style={{ background: c, borderColor: settings.hero_color_from === c ? "hsl(335 80% 40%)" : "transparent" }} />
          ))}
          {/* Свой цвет — color picker */}
          <label className="h-10 rounded-xl border-2 cursor-pointer overflow-hidden relative transition-all flex items-center justify-center"
            title="Выбрать свой цвет"
            style={{
              background: settings.hero_color_from && !COLORS.includes(settings.hero_color_from)
                ? settings.hero_color_from : "linear-gradient(135deg,#f0f,#ff0,#0ff,#f0f)",
              borderColor: settings.hero_color_from && !COLORS.includes(settings.hero_color_from)
                ? "hsl(335 80% 40%)" : "transparent"
            }}>
            <span className="text-white text-[11px] font-bold drop-shadow z-10">+</span>
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={settings.hero_color_from && settings.hero_color_from.startsWith("#")
                ? settings.hero_color_from : "#e91e8c"}
              onChange={e => { set("hero_color_from", e.target.value); set("hero_color_to", e.target.value); }} />
          </label>
        </div>
        {/* Превью цвета */}
        <div className="h-8 rounded-xl mb-3 transition-all"
          style={{ background: `linear-gradient(135deg, ${settings.hero_color_from || "hsl(335 80% 58%)"}, ${settings.hero_color_to || "hsl(315 70% 65%)"})` }} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs block mb-1" style={PS}>Цвет начала</label>
            <input value={settings.hero_color_from || ""} onChange={e => set("hero_color_from", e.target.value)}
              placeholder="hsl(335 80% 58%)" className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={PS}>Цвет конца</label>
            <input value={settings.hero_color_to || ""} onChange={e => set("hero_color_to", e.target.value)}
              placeholder="hsl(315 70% 65%)" className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={inp} />
          </div>
        </div>
      </div>

      {/* Обложка (hero) */}
      <div className="card-glow rounded-2xl p-4">
        <div className="font-semibold text-sm mb-3" style={P}>Обложка главного экрана</div>
        <PhotoUploadButton folder="hero" label="📷 Загрузить обложку" uploading={uploadingHero} setUploading={setUploadingHero}
          onUploaded={url => set("hero_image_url", url)} className="w-full mb-2" />
        {settings.hero_image_url && (
          <img src={settings.hero_image_url} className="w-full h-36 object-cover rounded-xl" alt="hero" />
        )}
        {settings.hero_image_url && (
          <button onClick={() => set("hero_image_url", "")} className="text-xs mt-2" style={{ color: "hsl(0 60% 50%)" }}>
            Убрать обложку
          </button>
        )}
      </div>

      {/* Фото нашего салона */}
      <div className="card-glow rounded-2xl p-4 space-y-3">
        <div className="font-semibold text-sm" style={P}>Фото нашего салона (главная)</div>
        <p className="text-xs" style={PS}>Большой баннер между мастерами и разделами</p>
        <PhotoUploadButton folder="wall" label="📷 Загрузить фото салона" uploading={uploadingWall} setUploading={setUploadingWall}
          onUploaded={url => set("wall_image_url", url)} className="w-full" />
        {settings.wall_image_url && (
          <>
            {/* Слайдер высоты */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs" style={PS}>Высота блока</label>
                <span className="text-xs font-medium" style={P}>{settings.wall_height || "220"}px</span>
              </div>
              <input type="range" min="120" max="420" step="10"
                value={settings.wall_height || "220"}
                onChange={e => set("wall_height", e.target.value)}
                className="w-full accent-pink-500" />
            </div>
            {/* Слайдер позиции фото (object-position) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs" style={PS}>Положение фото (по вертикали)</label>
                <span className="text-xs font-medium" style={P}>{settings.wall_pos || "50"}%</span>
              </div>
              <input type="range" min="0" max="100" step="5"
                value={settings.wall_pos || "50"}
                onChange={e => set("wall_pos", e.target.value)}
                className="w-full accent-pink-500" />
            </div>
            <div style={{ height: Number(settings.wall_height || 220) }} className="rounded-xl overflow-hidden">
              <img src={settings.wall_image_url}
                className="w-full h-full object-cover"
                style={{ objectPosition: `center ${settings.wall_pos || 50}%` }}
                alt="preview" />
            </div>
          </>
        )}
        <button onClick={saveAll} disabled={saving}
          className="w-full py-2.5 rounded-xl font-semibold text-white text-sm" style={GRAD}>
          {saving ? "Сохраняем..." : "💾 Сохранить фото салона"}
        </button>
      </div>

      {/* Видео на главной */}
      <div className="card-glow rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm" style={P}>Видео на главной 🎬</div>
            <p className="text-xs mt-0.5" style={PS}>Появляется под блоком Разделы</p>
          </div>
          {/* Переключатель показать/скрыть */}
          <button
            onClick={() => set("video_show", settings.video_show === "true" ? "false" : "true")}
            className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
            style={{ background: settings.video_show === "true" ? "hsl(335 80% 58%)" : "hsl(335 20% 85%)" }}>
            <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
              style={{ left: settings.video_show === "true" ? 26 : 2 }} />
          </button>
        </div>

        {/* Загрузка видео с телефона */}
        <div>
          <label className="text-xs block mb-2" style={PS}>Загрузить видео с телефона (mp4)</label>
          <VideoUploadButton onUploaded={url => { set("video_url", url); set("video_show", "true"); }} />
          {settings.video_url && settings.video_url.startsWith("https://cdn.poehali.dev") && (
            <p className="text-[10px] mt-1 text-green-600">✅ Видео загружено с телефона</p>
          )}
        </div>

        <div>
          <label className="text-xs block mb-1" style={PS}>Или вставь ссылку (YouTube / ВКонтакте / mp4)</label>
          <input value={settings.video_url || ""} onChange={e => set("video_url", e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-3 py-2.5 rounded-xl text-xs outline-none" style={inp} />
          <p className="text-[10px] mt-1" style={PS}>YouTube: обычная ссылка. ВКонтакте: ссылка на видео из браузера</p>
        </div>

        <div>
          <label className="text-xs block mb-1" style={PS}>Заголовок над видео</label>
          <input value={settings.video_title || ""} onChange={e => set("video_title", e.target.value)}
            placeholder="Наш салон" className="w-full px-3 py-2.5 rounded-xl text-xs outline-none" style={inp} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs" style={PS}>Высота видео</label>
            <span className="text-xs font-medium" style={P}>{settings.video_height || "240"}px</span>
          </div>
          <input type="range" min="160" max="480" step="10"
            value={settings.video_height || "240"}
            onChange={e => set("video_height", e.target.value)}
            className="w-full accent-pink-500" />
        </div>

        {/* Превью */}
        {settings.video_show === "true" && settings.video_url && (
          <div className="rounded-xl overflow-hidden" style={{ height: Number(settings.video_height || 240) }}>
            {settings.video_url.includes("youtube.com") || settings.video_url.includes("youtu.be") ? (
              <iframe
                src={settings.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                className="w-full h-full" style={{ border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen />
            ) : settings.video_url.includes("vk.com") ? (
              <iframe src={settings.video_url} className="w-full h-full" style={{ border: "none" }}
                allow="autoplay; encrypted-media; fullscreen" />
            ) : (
              <video src={settings.video_url} controls playsInline className="w-full h-full object-cover" />
            )}
          </div>
        )}

        <button onClick={saveAll} disabled={saving}
          className="w-full py-2.5 rounded-xl font-semibold text-white text-sm" style={GRAD}>
          {saving ? "Сохраняем..." : "💾 Сохранить настройки видео"}
        </button>
      </div>

      {/* Высота карточек разделов (глобальная) */}
      <div className="card-glow rounded-2xl p-4 space-y-3">
        <div className="font-semibold text-sm" style={P}>Высота карточек разделов</div>
        <p className="text-xs" style={PS}>Единая высота для всех карточек в блоке «Разделы» на главной</p>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs" style={PS}>Высота</label>
            <span className="text-xs font-medium" style={P}>{settings.section_card_height || "140"}px</span>
          </div>
          <input type="range" min="80" max="280" step="8"
            value={settings.section_card_height || "140"}
            onChange={e => set("section_card_height", e.target.value)}
            className="w-full accent-pink-500" />
        </div>
        {/* Мини-превью */}
        <div className="grid grid-cols-2 gap-2">
          {["Прайс-лист", "Галерея", "Отзывы", "Документы"].map(label => (
            <div key={label} className="card-glow rounded-xl overflow-hidden flex items-end"
              style={{ height: Number(settings.section_card_height || 140), background: "hsl(335 80% 60% / 0.08)" }}>
              <div className="p-2">
                <div className="text-xs font-semibold" style={{ color: "hsl(335 50% 28%)" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={saveAll} disabled={saving}
          className="w-full py-2.5 rounded-xl font-semibold text-white text-sm" style={GRAD}>
          {saving ? "Сохраняем..." : "💾 Сохранить высоту"}
        </button>
      </div>

      {/* Адрес и контакты */}
      <div className="card-glow rounded-2xl p-4 space-y-3">
        <div className="font-semibold text-sm mb-1" style={P}>Контакты и адрес</div>
        {[
          { key: "salon_name", label: "Название салона" },
          { key: "salon_phone", label: "Телефон" },
          { key: "salon_address", label: "Адрес" },
          { key: "salon_maps_url", label: "Ссылка на Яндекс Карты" },
          { key: "wall_title", label: "Заголовок на фото салона" },
          { key: "wall_subtitle", label: "Подзаголовок на фото салона" },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs block mb-1" style={PS}>{f.label}</label>
            <input value={settings[f.key] || ""} onChange={e => set(f.key, e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
        ))}
      </div>

      {/* Реквизиты оплаты */}
      <div className="card-glow rounded-2xl p-4 space-y-3">
        <div>
          <div className="font-semibold text-sm mb-0.5" style={P}>Реквизиты для оплаты 💳</div>
          <p className="text-xs mb-3" style={PS}>Клиенты увидят эти данные при оплате заказа картой/СБП</p>
        </div>
        {[
          { key: "payment_phone_sbp", label: "Телефон для СБП (перевод по номеру)" },
          { key: "payment_card_number", label: "Номер карты (необязательно)" },
          { key: "payment_bank_name", label: "Название банка" },
          { key: "payment_recipient_name", label: "Имя получателя (как на карте)" },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs block mb-1" style={PS}>{f.label}</label>
            <input value={settings[f.key] || ""} onChange={e => set(f.key, e.target.value)}
              placeholder={f.key === "payment_phone_sbp" ? "+7 900 000-00-00" : f.key === "payment_card_number" ? "0000 0000 0000 0000" : ""}
              autoComplete="off" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
        ))}
        <button onClick={saveAll} disabled={saving} className="w-full py-2.5 rounded-xl font-semibold text-white text-sm" style={GRAD}>
          {saving ? "Сохраняем..." : "💾 Сохранить реквизиты"}
        </button>
      </div>

      {/* Выходные дни */}
      <div className="card-glow rounded-2xl p-4">
        <div className="font-semibold text-sm mb-1" style={P}>Выходные дни</div>
        <p className="text-xs mb-3" style={PS}>Выбери дни недели когда салон не работает</p>
        <div className="grid grid-cols-4 gap-2">
          {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((day, idx) => {
            const daysOff: number[] = JSON.parse(settings.days_off || "[]");
            const isOff = daysOff.includes(idx);
            return (
              <button key={day} onClick={() => {
                const current: number[] = JSON.parse(settings.days_off || "[]");
                const updated = isOff ? current.filter(d => d !== idx) : [...current, idx];
                set("days_off", JSON.stringify(updated));
              }}
                className="py-2 rounded-xl text-xs font-semibold transition-all"
                style={isOff ? { background: "hsl(0 60% 55%)", color: "white" } : { background: "hsl(335 20% 93%)", color: "hsl(335 50% 50%)" }}>
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {saved && (
        <div className="p-3 rounded-xl text-sm font-medium text-center"
          style={{ background: "hsl(142 60% 94%)", color: "hsl(142 60% 35%)" }}>
          ✓ Настройки сохранены
        </div>
      )}

      <button onClick={saveAll} disabled={saving} className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg" style={GRAD}>
        {saving ? "Сохраняем..." : "💾 Сохранить всё"}
      </button>
    </div>}
    </div>
  );
}

// ── Публичная страница документов ──
function ClientDocumentsPage({ setPage, onBack }: { setPage: (p: Page) => void; onBack?: () => void }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  useEffect(() => {
    adminPost("documents", { active_only: true }).then(d => { setDocs(d.documents || []); setLoading(false); });
  }, []);

  const DOC_TYPE_LABELS: Record<string, string> = {
    certificate: "Сертификат", license: "Лицензия", diploma: "Диплом", other: "Документ",
  };

  if (fullscreen) return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setFullscreen(null)}>
      <img src={fullscreen} className="max-w-full max-h-full object-contain rounded-xl" alt="документ" />
      <button className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">✕</button>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => onBack ? onBack() : setPage("home")} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
          <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
        </button>
        <div>
          <h1 className="text-2xl font-oswald font-bold" style={P}>Документы 📄</h1>
          <p className="text-xs" style={PS}>Сертификаты и лицензии</p>
        </div>
      </div>

      <div className="px-4 pb-6">
        {loading && <div className="text-center py-12"><div className="text-3xl animate-float">🌸</div></div>}
        {!loading && docs.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📄</div>
            <p className="text-sm" style={PS}>Документы скоро появятся</p>
          </div>
        )}
        <div className="space-y-3">
          {docs.map(doc => (
            <div key={doc.id} className="card-glow rounded-2xl overflow-hidden">
              {doc.file_url && /\.(jpg|jpeg|png|webp)/i.test(doc.file_url) && (
                <button onClick={() => setFullscreen(doc.file_url)} className="w-full">
                  <img src={doc.file_url} className="w-full h-48 object-cover" alt={doc.title} />
                </button>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm" style={P}>{doc.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: "hsl(335 80% 55%)" }}>
                      {DOC_TYPE_LABELS[doc.doc_type] || "Документ"}
                    </div>
                    {doc.description && <p className="text-xs mt-1" style={PS}>{doc.description}</p>}
                  </div>
                  {doc.file_url && /\.(jpg|jpeg|png|webp)/i.test(doc.file_url) && (
                    <button onClick={() => setFullscreen(doc.file_url)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium flex-shrink-0"
                      style={{ background: "hsl(335 50% 95%)", color: "hsl(335 60% 45%)" }}>
                      <Icon name="ZoomIn" size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Уведомления (хаб: рассылка + шаблоны + старые уведомления) ──
function AdminNotificationsHub() {
  const [tab, setTab] = useState<"broadcast" | "templates" | "history">("broadcast");
  return (
    <div>
      <div className="px-4 mb-4">
        <div className="flex rounded-2xl overflow-hidden" style={{ background: "hsl(335 30% 92%)" }}>
          {([
            { id: "broadcast", label: "Рассылка" },
            { id: "templates", label: "Шаблоны" },
            { id: "history", label: "История" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 text-xs font-semibold transition-all"
              style={tab === t.id ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "broadcast" && <AdminBroadcast />}
      {tab === "templates" && <AdminNotificationTemplates />}
      {tab === "history" && <AdminNotifications />}
    </div>
  );
}

// ── Сотрудники + Мастера (хаб) ──
function AdminStaffHub({ currentStaffId }: { currentStaffId: number }) {
  const [tab, setTab] = useState<"masters" | "staff">("masters");
  return (
    <div>
      <div className="px-4 mb-4">
        <div className="flex rounded-2xl overflow-hidden" style={{ background: "hsl(335 30% 92%)" }}>
          <button onClick={() => setTab("masters")}
            className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={tab === "masters" ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
            👩‍⚕️ Мастера
          </button>
          <button onClick={() => setTab("staff")}
            className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={tab === "staff" ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
            🔑 Доступ в панель
          </button>
        </div>
      </div>
      {tab === "masters" && <AdminMastersEditor />}
      {tab === "staff" && <AdminStaff currentStaffId={currentStaffId} />}
    </div>
  );
}

// ── Финансы (хаб: расходы + доходы + сводка + статистика) ──
function AdminFinanceHub() {
  const [tab, setTab] = useState<"expenses" | "income" | "monthly" | "stats">("expenses");
  return (
    <div className="px-4 pb-6">
      <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden mb-5" style={{ background: "hsl(335 30% 92%)" }}>
        {([
          { id: "expenses", label: "💸 Расходы" },
          { id: "income", label: "💰 Доходы" },
          { id: "monthly", label: "📊 Сводка" },
          { id: "stats", label: "📈 Статистика" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="py-2.5 text-sm font-semibold transition-all"
            style={tab === t.id ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "expenses" && <ExpensesTab />}
      {tab === "income" && <IncomeTab />}
      {tab === "monthly" && <MonthlyFinanceTab />}
      {tab === "stats" && <AdminAnalytics />}
    </div>
  );
}

// ── Настройки + Сотрудники (хаб) ──
function AdminSettingsHub({ currentStaffId }: { currentStaffId: number }) {
  const [tab, setTab] = useState<"settings" | "staff">("settings");
  return (
    <div>
      <div className="px-4 mb-4">
        <div className="flex rounded-2xl overflow-hidden" style={{ background: "hsl(335 30% 92%)" }}>
          <button onClick={() => setTab("settings")}
            className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={tab === "settings" ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
            ⚙️ Настройки
          </button>
          <button onClick={() => setTab("staff")}
            className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={tab === "staff" ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
            👥 Сотрудники
          </button>
        </div>
      </div>
      {tab === "settings" && <AdminSettings />}
      {tab === "staff" && <AdminStaffHub currentStaffId={currentStaffId} />}
    </div>
  );
}

// ── Настройки ──
function AdminSettings() {
  const SITE_URL = window.location.href;
  const [copied, setCopied] = useState(false);
  const [adminSection, setAdminSection] = useState<"main" | "profile" | "schedule" | "sounds">("main");
  const session = loadAdminSession();
  const [soundSettings, setSoundSettings] = useState(() => getSoundSettings());

  const updateSound = (key: string, val: any) => {
    const updated = { ...soundSettings, [key]: val };
    setSoundSettings(updated);
    saveSoundSettings(updated);
  };

  const copy = () => {
    navigator.clipboard.writeText(SITE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (adminSection === "profile") return (
    <div>
      <div className="px-4 pt-2 pb-3">
        <button onClick={() => setAdminSection("main")} className="flex items-center gap-2 text-sm" style={PS}>
          <Icon name="ChevronLeft" size={16} /> Назад
        </button>
      </div>
      <AdminProfile onLogout={() => { clearAdminSession(); window.location.reload(); }} />
    </div>
  );

  if (adminSection === "schedule") return (
    <div>
      <div className="px-4 pt-2 pb-3">
        <button onClick={() => setAdminSection("main")} className="flex items-center gap-2 text-sm" style={PS}>
          <Icon name="ChevronLeft" size={16} /> Назад
        </button>
        <h2 className="text-lg font-oswald font-semibold mt-1" style={P}>Рабочее расписание</h2>
      </div>
      <AdminWorkSchedule />
    </div>
  );

  if (adminSection === "sounds") return (
    <div className="px-4 pb-6">
      <button onClick={() => setAdminSection("main")} className="flex items-center gap-2 text-sm mb-5" style={PS}>
        <Icon name="ChevronLeft" size={16} /> Назад
      </button>
      <h2 className="text-lg font-oswald font-semibold mb-4" style={P}>Звуковые уведомления</h2>

      {/* Включить/выключить */}
      <div className="card-glow rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm" style={P}>Звук при новых сообщениях</div>
            <div className="text-xs mt-0.5" style={PS}>Сигнал когда клиент написал</div>
          </div>
          <button
            onClick={() => updateSound("enabled", soundSettings.enabled === false ? true : false)}
            className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
            style={{ background: soundSettings.enabled === false ? "hsl(335 20% 85%)" : "hsl(335 80% 58%)" }}>
            <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
              style={{ left: soundSettings.enabled === false ? 2 : 26 }} />
          </button>
        </div>
      </div>

      {/* Громкость */}
      <div className="card-glow rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm" style={P}>Громкость</div>
          <span className="text-sm font-bold" style={{ color: "hsl(335 80% 55%)" }}>
            {Math.round((soundSettings.volume ?? 0.5) * 100)}%
          </span>
        </div>
        <input type="range" min="0" max="1" step="0.05"
          value={soundSettings.volume ?? 0.5}
          onChange={e => updateSound("volume", parseFloat(e.target.value))}
          className="w-full accent-pink-500" />
      </div>

      {/* Мелодия приветствия (при входе клиента) */}
      <div className="card-glow rounded-2xl p-4 mb-4">
        <div className="font-semibold text-sm mb-1" style={P}>Мелодия приветствия 🌸</div>
        <p className="text-xs mb-3" style={PS}>Играет когда клиент открывает приложение</p>
        <div className="space-y-2 mb-3">
          {[
            { key: "welcome_default", label: "Нежная пентатоника (по умолчанию) ✨" },
            { key: "welcome_chime", label: "Хрустальный перезвон 🔮" },
            { key: "welcome_soft", label: "Мягкие ноты 🌙" },
            { key: "welcome_none", label: "Без мелодии 🔇" },
          ].map(opt => (
            <button key={opt.key}
              onClick={() => {
                updateSound("welcome_preset", opt.key);
                if (opt.key === "welcome_chime") playNotificationSound("chime", soundSettings.volume ?? 0.35);
                else if (opt.key === "welcome_soft") playNotificationSound("soft", soundSettings.volume ?? 0.35);
                else if (opt.key !== "welcome_none") playWelcomeSound(soundSettings.volume ?? 0.35);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
              style={(soundSettings.welcome_preset || "welcome_default") === opt.key
                ? { ...GRAD, color: "white" }
                : { background: "hsl(335 20% 95%)", color: "hsl(335 50% 40%)", border: "1px solid hsl(335 30% 88%)" }}>
              <span className="text-sm font-medium">{opt.label}</span>
              {opt.key !== "welcome_none" && <Icon name="Play" size={14} />}
            </button>
          ))}
        </div>
        <button onClick={() => {
          const p = soundSettings.welcome_preset || "welcome_default";
          if (p === "welcome_chime") playNotificationSound("chime", soundSettings.volume ?? 0.35);
          else if (p === "welcome_soft") playNotificationSound("soft", soundSettings.volume ?? 0.35);
          else if (p !== "welcome_none") playWelcomeSound(soundSettings.volume ?? 0.35);
        }} className="w-full py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "hsl(335 50% 96%)", color: "hsl(335 60% 45%)", border: "1px solid hsl(335 50% 85%)" }}>
          🌸 Прослушать мелодию входа
        </button>
      </div>

      {/* Выбор мелодии уведомления */}
      <div className="card-glow rounded-2xl p-4 mb-4">
        <div className="font-semibold text-sm mb-3" style={P}>Мелодия уведомлений (новые SMS)</div>
        <div className="space-y-2">
          {Object.entries(SOUND_PRESETS).map(([key, preset]) => (
            <button key={key}
              onClick={() => { updateSound("preset", key); playNotificationSound(key, soundSettings.volume ?? 0.5); }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
              style={(soundSettings.preset || "bell") === key
                ? { ...GRAD, color: "white" }
                : { background: "hsl(335 20% 95%)", color: "hsl(335 50% 40%)", border: "1px solid hsl(335 30% 88%)" }}>
              <span className="text-sm font-medium">{preset.label}</span>
              <Icon name="Play" size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* Тест */}
      <button
        onClick={() => playNotificationSound(soundSettings.preset || "bell", soundSettings.volume ?? 0.5)}
        className="w-full py-3 rounded-2xl font-semibold text-white"
        style={GRAD}>
        🔔 Проверить звук уведомления
      </button>

      {/* Пуш-уведомления */}
      <div className="card-glow rounded-2xl p-4">
        <div className="font-semibold text-sm mb-1" style={P}>Пуш-уведомления 📲</div>
        <p className="text-xs mb-3" style={PS}>
          Уведомления на экране даже когда приложение свёрнуто. Статус: {" "}
          <span style={{ color: isPushEnabled() ? "hsl(142 60% 40%)" : "hsl(335 50% 55%)", fontWeight: 600 }}>
            {isPushEnabled() ? "✅ Включены" : "⭕ Выключены"}
          </span>
        </p>
        {!isPushEnabled() ? (
          <button
            onClick={async () => {
              const ok = await registerPush();
              if (ok) {
                await showPushNotification("Girly Paradise 🌸", "Пуш-уведомления успешно включены! Теперь вы будете получать уведомления о новых сообщениях и заказах.");
                // Принудительно перерендерить
                window.location.reload();
              } else {
                alert("Не удалось включить уведомления. Проверь настройки браузера — разрешение на уведомления должно быть разрешено.");
              }
            }}
            className="w-full py-3 rounded-2xl font-semibold text-white"
            style={GRAD}>
            📲 Включить пуш-уведомления
          </button>
        ) : (
          <button
            onClick={async () => {
              localStorage.removeItem("gp_push_enabled");
              localStorage.removeItem("gp_push_granted");
              window.location.reload();
            }}
            className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
            Отключить пуш-уведомления
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="px-4 pb-6 space-y-3">
      {/* Профиль */}
      <button onClick={() => setAdminSection("profile")}
        className="w-full card-glow rounded-2xl p-4 flex items-center gap-3 text-left hover:scale-[1.01] transition-all">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={GRAD}>
          {(session?.name || "Г")[0]}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm" style={P}>{session?.name || "Владелец"}</div>
          <div className="text-xs" style={PS}>Редактировать профиль →</div>
        </div>
        <Icon name="ChevronRight" size={18} style={PS} />
      </button>

      {/* Рабочее расписание */}
      <button onClick={() => setAdminSection("schedule")}
        className="w-full card-glow rounded-2xl p-4 flex items-center gap-3 text-left hover:scale-[1.01] transition-all">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(200 80% 92%)" }}>
          <Icon name="CalendarDays" size={18} style={{ color: "hsl(200 80% 40%)" }} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm" style={P}>Рабочее расписание</div>
          <div className="text-xs" style={PS}>Дни работы и часы →</div>
        </div>
        <Icon name="ChevronRight" size={18} style={PS} />
      </button>

      {/* Звуковые уведомления */}
      <button onClick={() => setAdminSection("sounds")}
        className="w-full card-glow rounded-2xl p-4 flex items-center gap-3 text-left hover:scale-[1.01] transition-all">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(45 90% 92%)" }}>
          <Icon name="Bell" size={18} style={{ color: "hsl(45 80% 40%)" }} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm" style={P}>Звуковые уведомления</div>
          <div className="text-xs" style={PS}>
            {soundSettings.enabled === false ? "🔇 Выключены" : `🔔 Вкл · ${SOUND_PRESETS[soundSettings.preset || "bell"]?.label || "Колокольчик"}`}
          </div>
        </div>
        <Icon name="ChevronRight" size={18} style={PS} />
      </button>

      <div className="card-glow rounded-2xl p-4">
        <div className="font-semibold mb-1 text-sm" style={P}>Ссылка на сайт</div>
        <div className="text-xs mb-3 break-all" style={PS}>{SITE_URL}</div>
        <button onClick={copy} className="w-full py-2.5 rounded-xl font-semibold text-white text-sm" style={GRAD}>
          {copied ? "Скопировано ✓" : "Скопировать ссылку"}
        </button>
      </div>

      <div className="card-glow rounded-2xl p-4">
        <div className="font-semibold mb-1 text-sm" style={P}>Доступ в панель</div>
        <div className="text-xs" style={PS}>Удержи логотип на главной 2 секунды → введи пин-код</div>
      </div>

      <div className="card-glow rounded-2xl p-4">
        <div className="font-semibold mb-2 text-sm" style={P}>Уведомления о записях</div>
        <div className="text-xs" style={PS}>
          📧 Письмо на <span style={{ color: "hsl(335 80% 55%)" }}>Siplatova777@list.ru</span><br />
          📱 SMS на +7 (904) 601-55-56
        </div>
      </div>
    </div>
  );
}

// ─── МАГАЗИН ─────────────────────────────────────────────────────────────────

function ShopPage({ client, onBack }: { client: any; onBack: () => void }) {
  const [view, setView] = React.useState<"catalog" | "cart" | "checkout" | "done">("catalog");
  const [categories, setCategories] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [banners, setBanners] = React.useState<any[]>([]);
  const [bannerIdx, setBannerIdx] = React.useState(0);
  const [fullscreenBanner, setFullscreenBanner] = React.useState<any | null>(null);
  const bannerTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeCat, setActiveCat] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [cart, setCart] = React.useState<any[]>(getCart());
  const [selectedProduct, setSelectedProduct] = React.useState<any | null>(null);
  // Форма оформления
  const [deliveryType, setDeliveryType] = React.useState<"sdek" | "ozon" | "post">("sdek");
  const [paymentMethod, setPaymentMethod] = React.useState<"on_delivery" | "card">("card");
  const [address, setAddress] = React.useState("");
  const [pickupPoint, setPickupPoint] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [placing, setPlacing] = React.useState(false);
  const [orderId, setOrderId] = React.useState<number | null>(null);
  const [paymentInfo, setPaymentInfo] = React.useState<Record<string, string> | null>(null);

  const P2 = { color: "hsl(335 50% 28%)" };
  const PS2 = { color: "hsl(335 30% 58%)" };
  const GRAD2 = { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" };

  React.useEffect(() => {
    adminPost("shop_categories", { active_only: true }).then(d => {
      setCategories(d.categories || []);
      if (d.categories?.length > 0) setActiveCat(d.categories[0].id);
    });
    adminPost("shop_banners", { active_only: true }).then(d => setBanners(d.banners || []));
  }, []);

  // Автослайдер баннеров — каждые 3.5 сек
  React.useEffect(() => {
    if (banners.length <= 1) return;
    bannerTimer.current = setInterval(() => {
      setBannerIdx(i => (i + 1) % banners.length);
    }, 3500);
    return () => { if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, [banners.length]);

  React.useEffect(() => {
    if (activeCat === null) return;
    setLoading(true);
    adminPost("shop_products", { category_id: activeCat, active_only: true }).then(d => {
      setProducts(d.products || []);
      setLoading(false);
    });
  }, [activeCat]);

  const refreshCart = () => { const c = getCart(); setCart([...c]); };

  const cartTotal = cart.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
  const cartCount = cart.reduce((s, i) => s + (i.quantity || 1), 0);

  const placeOrder = async () => {
    if (!address.trim() && !pickupPoint.trim()) { alert("Укажи адрес или пункт выдачи"); return; }
    setPlacing(true);
    const res = await adminPost("shop_orders", {
      action: "create",
      client_id: client?.id || null,
      client_name: client?.name || "Гость",
      client_phone: client?.phone || "",
      delivery_type: deliveryType,
      delivery_address: address,
      pickup_point: pickupPoint,
      comment,
      items: cart,
      payment_method: paymentMethod,
    });
    if (res.ok) {
      setOrderId(res.order_id);
      clearCart(); refreshCart();
      if (paymentMethod === "card" && res.payment_info) {
        setPaymentInfo(res.payment_info);
      }
      setView("done");
    }
    setPlacing(false);
  };

  const DELIVERY_OPTS = [
    { id: "sdek", label: "СДЭК", icon: "📦" },
    { id: "ozon", label: "Пункт Ozon", icon: "🟠" },
    { id: "post", label: "Почта России", icon: "✉️" },
  ] as const;

  if (view === "done") return (
    <div className="animate-fade-in pb-8 pt-12 px-6">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-oswald font-bold mb-2" style={P2}>Заказ оформлен!</h2>
        <p className="text-sm mb-1" style={PS2}>Номер заказа: <strong>#{orderId}</strong></p>
        <p className="text-sm" style={PS2}>Проверь SMS — пришло подтверждение.</p>
      </div>

      {/* Реквизиты оплаты (если выбрана карта) */}
      {paymentMethod === "card" && (
        <div className="card-glow rounded-2xl p-5 mb-5" style={{ border: "2px solid hsl(335 70% 80%)" }}>
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">💳</div>
            <div className="font-oswald font-bold text-lg" style={P2}>Оплати заказ переводом</div>
            <div className="text-sm mt-1" style={PS2}>Сумма: <strong>{cartTotal.toLocaleString()} ₽</strong></div>
          </div>
          {paymentInfo?.payment_phone_sbp && (
            <div className="rounded-xl p-3 mb-3 text-center" style={{ background: "hsl(142 60% 95%)" }}>
              <div className="text-xs font-semibold mb-1" style={{ color: "hsl(142 60% 35%)" }}>📱 СБП (Система быстрых платежей)</div>
              <div className="font-bold text-lg" style={{ color: "hsl(142 60% 30%)" }}>{paymentInfo.payment_phone_sbp}</div>
              <div className="text-xs mt-0.5" style={{ color: "hsl(142 50% 45%)" }}>
                {paymentInfo.payment_bank_name || "Банк"} · {paymentInfo.payment_recipient_name || "Получатель"}
              </div>
              <button onClick={() => {
                navigator.clipboard.writeText(paymentInfo?.payment_phone_sbp || "");
                alert("Номер скопирован!");
              }} className="mt-2 px-4 py-1.5 rounded-xl text-xs font-medium"
                style={{ background: "hsl(142 60% 35%)", color: "white" }}>
                Скопировать номер
              </button>
            </div>
          )}
          {paymentInfo?.payment_card_number && (
            <div className="rounded-xl p-3 mb-3 text-center" style={{ background: "hsl(210 80% 96%)" }}>
              <div className="text-xs font-semibold mb-1" style={{ color: "hsl(210 70% 35%)" }}>💳 Номер карты</div>
              <div className="font-bold text-lg tracking-widest" style={{ color: "hsl(210 70% 30%)" }}>
                {paymentInfo.payment_card_number}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "hsl(210 50% 45%)" }}>
                {paymentInfo.payment_bank_name} · {paymentInfo.payment_recipient_name}
              </div>
              <button onClick={() => {
                navigator.clipboard.writeText(paymentInfo?.payment_card_number || "");
                alert("Номер карты скопирован!");
              }} className="mt-2 px-4 py-1.5 rounded-xl text-xs font-medium"
                style={{ background: "hsl(210 70% 40%)", color: "white" }}>
                Скопировать
              </button>
            </div>
          )}
          <p className="text-xs text-center mt-2" style={PS2}>
            После оплаты мы получим уведомление и подтвердим заказ по SMS
          </p>
        </div>
      )}

      <button onClick={() => { setView("catalog"); setPaymentInfo(null); }}
        className="w-full py-4 rounded-2xl font-bold text-white mb-3" style={GRAD2}>
        Продолжить покупки
      </button>
      <button onClick={onBack} className="w-full py-3 rounded-2xl font-medium"
        style={{ background: "hsl(335 20% 94%)", color: "hsl(335 50% 50%)" }}>
        На главную
      </button>
    </div>
  );

  if (view === "checkout") return (
    <div className="animate-fade-in pb-6">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => setView("cart")} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
          <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
        </button>
        <h1 className="text-2xl font-oswald font-bold" style={P2}>Оформление заказа</h1>
      </div>
      <div className="px-4 space-y-4">
        {/* Тип доставки */}
        <div className="card-glow rounded-2xl p-4">
          <div className="font-semibold text-sm mb-3" style={P2}>Способ получения</div>
          <div className="space-y-2">
            {DELIVERY_OPTS.map(opt => (
              <button key={opt.id} onClick={() => setDeliveryType(opt.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={deliveryType === opt.id ? { ...GRAD2, color: "white" } : { background: "hsl(335 20% 96%)", color: "hsl(335 50% 40%)", border: "1px solid hsl(335 30% 88%)" }}>
                <span className="text-xl">{opt.icon}</span>
                <span className="font-semibold text-sm">{opt.label}</span>
                {deliveryType === opt.id && <Icon name="Check" size={16} className="ml-auto text-white" />}
              </button>
            ))}
          </div>
        </div>
        {/* Пункт выдачи */}
        <div className="card-glow rounded-2xl p-4 space-y-3">
          <div className="font-semibold text-sm" style={P2}>Ближайший пункт выдачи</div>
          <input value={pickupPoint} onChange={e => setPickupPoint(e.target.value)}
            placeholder={`Адрес пункта ${DELIVERY_OPTS.find(o => o.id === deliveryType)?.label || ""}...`}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 28%)" }} />
          <div className="font-semibold text-sm" style={P2}>Или укажи свой адрес</div>
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Город, улица, дом, квартира"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 28%)" }} />
        </div>
        {/* Комментарий */}
        <div className="card-glow rounded-2xl p-4">
          <div className="font-semibold text-sm mb-2" style={P2}>Комментарий к заказу</div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
            placeholder="Необязательно..."
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 28%)" }} />
        </div>
        {/* Способ оплаты */}
        <div className="card-glow rounded-2xl p-4">
          <div className="font-semibold text-sm mb-3" style={P2}>Способ оплаты</div>
          <div className="space-y-2">
            <button onClick={() => setPaymentMethod("card")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={paymentMethod === "card" ? { ...GRAD2, color: "white" } : { background: "hsl(335 20% 96%)", color: "hsl(335 50% 40%)", border: "1px solid hsl(335 30% 88%)" }}>
              <span className="text-xl">💳</span>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm">Оплата картой / СБП</div>
                <div className="text-[11px] opacity-80">Переводом на карту</div>
              </div>
              {paymentMethod === "card" && <Icon name="Check" size={16} className="ml-auto" />}
            </button>
            <button onClick={() => setPaymentMethod("on_delivery")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={paymentMethod === "on_delivery" ? { ...GRAD2, color: "white" } : { background: "hsl(335 20% 96%)", color: "hsl(335 50% 40%)", border: "1px solid hsl(335 30% 88%)" }}>
              <span className="text-xl">💵</span>
              <div className="flex-1 text-left">
                <div className="font-semibold text-sm">Оплата при получении</div>
                <div className="text-[11px] opacity-80">Наличными или картой курьеру</div>
              </div>
              {paymentMethod === "on_delivery" && <Icon name="Check" size={16} className="ml-auto" />}
            </button>
          </div>
        </div>
        {/* Итого */}
        <div className="card-glow rounded-2xl p-4 flex justify-between items-center">
          <span className="font-semibold text-sm" style={P2}>Итого к оплате</span>
          <span className="text-xl font-oswald font-bold" style={{ color: "hsl(335 80% 55%)" }}>
            {cartTotal.toLocaleString()} ₽
          </span>
        </div>
        <button onClick={placeOrder} disabled={placing}
          className="w-full py-4 rounded-2xl font-bold text-white shadow-lg text-base" style={GRAD2}>
          {placing ? "Оформляем..." : paymentMethod === "card" ? "💳 Оформить и перейти к оплате" : "✅ Подтвердить заказ"}
        </button>
      </div>
    </div>
  );

  if (view === "cart") return (
    <div className="animate-fade-in pb-6">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => setView("catalog")} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
          <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
        </button>
        <h1 className="text-2xl font-oswald font-bold" style={P2}>Корзина 🛒</h1>
      </div>
      {cart.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🛍</div>
          <p className="text-sm" style={PS2}>Корзина пуста</p>
          <button onClick={() => setView("catalog")} className="mt-4 px-6 py-3 rounded-2xl font-semibold text-white" style={GRAD2}>
            В каталог
          </button>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {cart.map(item => (
            <div key={item.product_id} className="card-glow rounded-2xl p-4 flex items-center gap-3">
              {item.photo_url && <img src={item.photo_url} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" alt={item.name} />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate" style={P2}>{item.name}</div>
                <div className="text-sm font-bold mt-0.5" style={{ color: "hsl(335 80% 55%)" }}>{item.price.toLocaleString()} ₽</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => {
                  const c = getCart(); const idx = c.findIndex((i: any) => i.product_id === item.product_id);
                  if (c[idx].quantity > 1) c[idx].quantity--; else c.splice(idx, 1);
                  saveCart(c); refreshCart();
                }} className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-lg"
                  style={{ background: "hsl(335 20% 93%)", color: "hsl(335 50% 50%)" }}>−</button>
                <span className="w-5 text-center text-sm font-bold" style={P2}>{item.quantity}</span>
                <button onClick={() => { addToCart({ id: item.product_id, ...item }); refreshCart(); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-lg" style={GRAD2}>+</button>
              </div>
              <button onClick={() => { removeFromCart(item.product_id); refreshCart(); }}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 55%)" }}>
                <Icon name="X" size={14} />
              </button>
            </div>
          ))}
          <div className="card-glow rounded-2xl p-4 flex justify-between items-center">
            <span style={PS2}>{cartCount} товар(а)</span>
            <span className="font-oswald font-bold text-lg" style={{ color: "hsl(335 80% 55%)" }}>{cartTotal.toLocaleString()} ₽</span>
          </div>
          <button onClick={() => setView("checkout")} className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-lg" style={GRAD2}>
            Оформить заказ →
          </button>
        </div>
      )}
    </div>
  );

  // ── КАТАЛОГ ──
  return (
    <div className="animate-fade-in pb-6">
      {/* Шапка */}
      <div className="px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
          <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-oswald font-bold" style={P2}>Магазин 🛍</h1>
          <p className="text-xs" style={PS2}>Косметика, аромат и уход</p>
        </div>
        <button onClick={() => setView("cart")} className="relative w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
          <Icon name="ShoppingCart" size={18} style={{ color: "hsl(335 60% 40%)" }} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
              style={{ background: "hsl(335 80% 55%)" }}>{cartCount}</span>
          )}
        </button>
      </div>

      {/* Рекламные баннеры — слайдер */}
      {banners.length > 0 && (
        <div className="px-4 mb-4">
          {/* Слайдер */}
          <div className="relative rounded-2xl overflow-hidden" style={{ height: 160 }}>
            {banners.map((b, i) => (
              <div key={b.id}
                className="absolute inset-0 transition-opacity duration-700 cursor-pointer"
                style={{ opacity: i === bannerIdx ? 1 : 0, pointerEvents: i === bannerIdx ? "auto" : "none" }}
                onClick={() => setFullscreenBanner(b)}>
                {b.image_url
                  ? <img src={b.image_url} className="w-full h-full object-cover" alt={b.title} />
                  : <div className="w-full h-full" style={GRAD2} />
                }
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }} />
                <div className="absolute bottom-3 left-4 right-12">
                  {b.title && <div className="font-bold text-sm text-white leading-tight drop-shadow">{b.title}</div>}
                  {b.subtitle && <div className="text-[11px] text-white/75 mt-0.5 drop-shadow">{b.subtitle}</div>}
                </div>
                {/* Иконка увеличения */}
                <div className="absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(4px)" }}>
                  <Icon name="Maximize2" size={13} className="text-white" />
                </div>
              </div>
            ))}

            {/* Стрелки (если баннеров больше 1) */}
            {banners.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center z-10"
                  style={{ background: "rgba(0,0,0,0.30)", backdropFilter: "blur(4px)" }}
                  onClick={() => { setBannerIdx(i => (i - 1 + banners.length) % banners.length); if (bannerTimer.current) { clearInterval(bannerTimer.current); bannerTimer.current = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 3500); } }}>
                  <Icon name="ChevronLeft" size={15} className="text-white" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center z-10"
                  style={{ background: "rgba(0,0,0,0.30)", backdropFilter: "blur(4px)" }}
                  onClick={() => { setBannerIdx(i => (i + 1) % banners.length); if (bannerTimer.current) { clearInterval(bannerTimer.current); bannerTimer.current = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 3500); } }}>
                  <Icon name="ChevronRight" size={15} className="text-white" />
                </button>
              </>
            )}
          </div>

          {/* Точки-индикаторы */}
          {banners.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setBannerIdx(i)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === bannerIdx ? 20 : 6,
                    height: 6,
                    background: i === bannerIdx ? "hsl(335 80% 58%)" : "hsl(335 40% 82%)"
                  }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Полноэкранный просмотр баннера */}
      {fullscreenBanner && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
          onClick={() => setFullscreenBanner(null)}>
          {fullscreenBanner.image_url
            ? <img src={fullscreenBanner.image_url} className="w-full h-full object-contain" alt={fullscreenBanner.title} />
            : <div className="w-full h-full" style={GRAD2} />
          }
          {/* Текст поверх */}
          {(fullscreenBanner.title || fullscreenBanner.subtitle) && (
            <div className="absolute bottom-16 left-0 right-0 px-6 text-center"
              onClick={e => e.stopPropagation()}>
              {fullscreenBanner.title && (
                <div className="font-oswald font-bold text-2xl text-white mb-2 drop-shadow-lg">{fullscreenBanner.title}</div>
              )}
              {fullscreenBanner.subtitle && (
                <div className="text-white/85 text-sm drop-shadow">{fullscreenBanner.subtitle}</div>
              )}
              {fullscreenBanner.link_url && (
                <a href={fullscreenBanner.link_url} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-block px-6 py-3 rounded-2xl font-semibold text-white text-sm"
                  style={{ background: "hsl(335 80% 55%)" }}
                  onClick={e => e.stopPropagation()}>
                  Перейти →
                </a>
              )}
            </div>
          )}
          {/* Кнопка закрыть */}
          <button className="absolute top-10 right-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
            onClick={() => setFullscreenBanner(null)}>
            <Icon name="X" size={20} className="text-white" />
          </button>
        </div>
      )}

      {/* Категории */}
      {categories.length > 0 && (
        <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)}
              className="flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-semibold transition-all"
              style={activeCat === cat.id ? { ...GRAD2, color: "white" } : { background: "white", color: "hsl(335 50% 50%)", border: "1px solid hsl(335 50% 85%)" }}>
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Товары */}
      {loading && <div className="text-center py-12"><div className="text-3xl animate-float">🌸</div></div>}
      {!loading && products.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-sm" style={PS2}>Товары в этой категории скоро появятся</p>
        </div>
      )}
      <div className="px-4 grid grid-cols-2 gap-3">
        {products.map(prod => (
          <div key={prod.id} onClick={() => setSelectedProduct(prod)}
            className="card-glow rounded-2xl overflow-hidden text-left hover:scale-105 transition-all cursor-pointer">
            {prod.photo_url
              ? <img src={prod.photo_url} className="w-full h-36 object-cover" alt={prod.name} />
              : <div className="w-full h-36 flex items-center justify-center text-3xl" style={{ background: "hsl(335 80% 96%)" }}>🛍</div>
            }
            <div className="p-3">
              <div className="font-semibold text-xs leading-tight mb-1 line-clamp-2" style={P2}>{prod.name}</div>
              <div className="flex items-center justify-between">
                <span className="font-oswald font-bold text-sm" style={{ color: "hsl(335 80% 55%)" }}>
                  {Number(prod.price).toLocaleString()} ₽
                </span>
                <div role="button" tabIndex={0}
                  onClick={e => { e.stopPropagation(); addToCart(prod); refreshCart(); }}
                  onKeyDown={e => e.key === "Enter" && (e.stopPropagation(), addToCart(prod), refreshCart())}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-lg font-bold cursor-pointer"
                  style={GRAD2}>+</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Карточка товара (модалка) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelectedProduct(null)}>
          <div className="w-full max-w-lg rounded-t-3xl overflow-hidden" style={{ background: "white" }}
            onClick={e => e.stopPropagation()}>
            {selectedProduct.photo_url && (
              <img src={selectedProduct.photo_url} className="w-full h-56 object-cover" alt={selectedProduct.name} />
            )}
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-oswald font-bold text-xl" style={P2}>{selectedProduct.name}</h3>
                <button onClick={() => setSelectedProduct(null)} className="text-gray-400 text-xl ml-2">✕</button>
              </div>
              {selectedProduct.description && (
                <p className="text-sm mb-4 leading-relaxed" style={PS2}>{selectedProduct.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="font-oswald font-bold text-2xl" style={{ color: "hsl(335 80% 55%)" }}>
                  {Number(selectedProduct.price).toLocaleString()} ₽
                </span>
                <button onClick={() => { addToCart(selectedProduct); refreshCart(); setSelectedProduct(null); setView("cart"); }}
                  className="px-6 py-3 rounded-2xl font-bold text-white" style={GRAD2}>
                  В корзину 🛒
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── АДМИН: Магазин (товары + категории + заказы + реклама) ──
function AdminShop() {
  const [tab, setTab] = React.useState<"products" | "categories" | "orders" | "banners">("products");
  return (
    <div>
      <div className="px-4 mb-4">
        <div className="grid grid-cols-4 gap-0.5 rounded-2xl overflow-hidden" style={{ background: "hsl(335 30% 92%)" }}>
          {([
            { id: "products", label: "Товары" },
            { id: "categories", label: "Категории" },
            { id: "orders", label: "Заказы" },
            { id: "banners", label: "Реклама" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="py-2.5 text-[11px] font-semibold transition-all"
              style={tab === t.id ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "products" && <AdminShopProducts />}
      {tab === "categories" && <AdminShopCategories />}
      {tab === "orders" && <AdminShopOrders />}
      {tab === "banners" && <AdminShopBanners />}
    </div>
  );
}

function AdminShopCategories() {
  const [cats, setCats] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", description: "" });
  const [saving, setSaving] = React.useState(false);
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const load = () => adminPost("shop_categories").then(d => { setCats(d.categories || []); setLoading(false); });
  React.useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    await adminPost("shop_categories", { action: "add", ...form });
    setForm({ name: "", description: "" }); setAdding(false); setSaving(false); load();
  };

  const del = async (id: number) => { await adminPost("shop_categories", { action: "delete", id }); load(); };

  return (
    <div className="px-4 pb-6">
      {!adding && (
        <button onClick={() => setAdding(true)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
          + Добавить категорию
        </button>
      )}
      {adding && (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs block mb-1" style={PS}>Название</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoComplete="off"
              placeholder="Косметика" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={PS}>Описание (необязательно)</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} autoComplete="off"
              placeholder="Уходовая косметика" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
              {saving ? "..." : "Добавить"}
            </button>
            <button onClick={() => setAdding(false)} className="px-4 py-3 rounded-xl text-sm"
              style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>Отмена</button>
          </div>
        </div>
      )}
      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="space-y-2">
        {cats.map(cat => (
          <div key={cat.id} className="card-glow rounded-2xl p-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold text-sm" style={P}>{cat.name}</div>
              {cat.description && <div className="text-xs" style={PS}>{cat.description}</div>}
            </div>
            <button onClick={() => del(cat.id)} className="px-2.5 py-1 rounded-lg text-xs"
              style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 55%)" }}>Удалить</button>
          </div>
        ))}
        {!loading && cats.length === 0 && <div className="text-center py-8 text-sm" style={PS}>Категорий нет</div>}
      </div>
    </div>
  );
}

function AdminShopProducts() {
  const [cats, setCats] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [form, setForm] = React.useState({ category_id: "", name: "", description: "", price: "", stock: "", photo_url: "" });
  const [saving, setSaving] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const loadAll = () => {
    adminPost("shop_categories", { active_only: true }).then(d => setCats(d.categories || []));
    adminPost("shop_products").then(d => { setProducts(d.products || []); setLoading(false); });
  };
  React.useEffect(() => { loadAll(); }, []);

  const resetForm = () => setForm({ category_id: "", name: "", description: "", price: "", stock: "", photo_url: "" });

  const save = async () => {
    if (!form.name || !form.category_id) return;
    setSaving(true);
    if (editing) {
      await adminPost("shop_products", { action: "update", id: editing.id, ...form, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0 });
      setEditing(null);
    } else {
      await adminPost("shop_products", { action: "add", ...form, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0 });
      setAdding(false);
    }
    resetForm(); setSaving(false); loadAll();
  };

  const startEdit = (p: any) => {
    setForm({ category_id: String(p.category_id || ""), name: p.name, description: p.description || "", price: String(p.price || ""), stock: String(p.stock || ""), photo_url: p.photo_url || "" });
    setEditing(p); setAdding(false);
  };

  const toggle = async (id: number) => { await adminPost("shop_products", { action: "toggle", id }); loadAll(); };
  const del = async (id: number) => { await adminPost("shop_products", { action: "delete", id }); loadAll(); };

  const grouped: Record<string, any[]> = {};
  products.forEach(p => { const k = p.category_name || "Без категории"; if (!grouped[k]) grouped[k] = []; grouped[k].push(p); });

  return (
    <div className="px-4 pb-6">
      {!adding && !editing && (
        <button onClick={() => setAdding(true)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
          + Добавить товар
        </button>
      )}
      {(adding || editing) && (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs block mb-1" style={PS}>Категория</label>
            <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp}>
              <option value="">Выбрать...</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {[{ k: "name", l: "Название товара", ph: "Крем для лица" },
            { k: "description", l: "Описание", ph: "Подробное описание..." },
            { k: "price", l: "Цена, ₽", ph: "1500" },
            { k: "stock", l: "Количество на складе", ph: "10" },
          ].map(f => (
            <div key={f.k}>
              <label className="text-xs block mb-1" style={PS}>{f.l}</label>
              <input value={(form as any)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                placeholder={f.ph} autoComplete="off" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          ))}
          <div>
            <label className="text-xs block mb-2" style={PS}>Фото товара</label>
            <PhotoUploadButton folder="shop" label="📷 Загрузить фото" uploading={uploadingPhoto}
              setUploading={setUploadingPhoto} onUploaded={url => setForm(p => ({ ...p, photo_url: url }))} className="w-full mb-2" />
            {form.photo_url && <img src={form.photo_url} className="w-full h-32 object-cover rounded-xl" alt="preview" />}
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || uploadingPhoto} className="flex-1 py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
              {saving ? "Сохраняем..." : editing ? "Обновить" : "Добавить"}
            </button>
            <button onClick={() => { resetForm(); setAdding(false); setEditing(null); }} className="px-4 py-3 rounded-xl text-sm"
              style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>Отмена</button>
          </div>
        </div>
      )}
      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="mb-4">
          <div className="px-3 py-1.5 rounded-xl mb-2 text-xs font-bold" style={{ ...GRAD, color: "white" }}>{cat}</div>
          <div className="space-y-2">
            {items.map(prod => (
              <div key={prod.id} className="card-glow rounded-2xl p-3 flex items-start gap-3" style={!prod.is_active ? { opacity: 0.5 } : {}}>
                {prod.photo_url && <img src={prod.photo_url} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt={prod.name} />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={P}>{prod.name}</div>
                  <div className="text-xs font-bold" style={{ color: "hsl(335 80% 55%)" }}>{Number(prod.price).toLocaleString()} ₽</div>
                  {prod.description && <div className="text-xs truncate mt-0.5" style={PS}>{prod.description}</div>}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(prod)} className="px-2 py-1 rounded-lg text-xs" style={{ background: "hsl(335 50% 95%)", color: "hsl(335 60% 45%)" }}>✏️</button>
                  <button onClick={() => toggle(prod.id)} className="px-2 py-1 rounded-lg text-xs" style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
                    {prod.is_active ? "Скрыть" : "Показать"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {!loading && products.length === 0 && <div className="text-center py-10 text-sm" style={PS}>Товаров нет — добавьте первый!</div>}
    </div>
  );
}

function AdminShopOrders() {
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("");
  const [expanded, setExpanded] = React.useState<number | null>(null);
  const [trackingInputs, setTrackingInputs] = React.useState<Record<number, string>>({});
  const [trackingUrlInputs, setTrackingUrlInputs] = React.useState<Record<number, string>>({});
  const [sending, setSending] = React.useState<number | null>(null);

  const prevOrderCount = React.useRef<number>(0);
  const load = () => adminPost("shop_orders", filter ? { status: filter } : {}).then(d => {
    const newOrders = d.orders || [];
    const newCount = newOrders.filter((o: any) => o.status === "new").length;
    if (newCount > prevOrderCount.current && prevOrderCount.current >= 0) {
      const diff = newCount - prevOrderCount.current;
      if (diff > 0) {
        showPushNotification("Girly Paradise 🛍", `${diff > 1 ? `${diff} новых заказа` : "Новый заказ"} в магазине!`, "new-order");
        playNotificationSound("bell", 0.5);
      }
    }
    prevOrderCount.current = newCount;
    setOrders(newOrders); setLoading(false);
  });
  React.useEffect(() => { load(); }, [filter]);

  const STATUS_LABELS: Record<string, string> = { new: "🆕 Новый", confirmed: "✅ Подтверждён", shipped: "🚚 Отправлен", done: "✔ Выдан", cancelled: "❌ Отменён" };
  const STATUS_COLORS: Record<string, string> = { new: "hsl(200 80% 50%)", confirmed: "hsl(142 60% 40%)", shipped: "hsl(30 80% 50%)", done: "hsl(142 60% 35%)", cancelled: "hsl(0 60% 50%)" };
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const updateStatus = async (id: number, status: string, extra?: object) => {
    await adminPost("shop_orders", { action: "update_status", id, status, ...extra });
    load();
  };

  const shipOrder = async (o: any) => {
    setSending(o.id);
    const tracking_number = trackingInputs[o.id] || "";
    const tracking_url = trackingUrlInputs[o.id] || "";
    await updateStatus(o.id, "shipped", { tracking_number, tracking_url });
    setSending(null);
  };

  const hideOrder = async (id: number) => {
    await adminPost("shop_orders", { action: "hide", id });
    load();
  };

  return (
    <div className="px-4 pb-6">
      {/* Фильтр */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {[{ v: "", l: "Все" }, { v: "new", l: "Новые" }, { v: "confirmed", l: "Подтвержд." }, { v: "shipped", l: "В пути" }, { v: "done", l: "Выданы" }, { v: "cancelled", l: "Отменены" }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={filter === f.v ? { ...GRAD, color: "white" } : { background: "white", color: "hsl(335 50% 55%)", border: "1px solid hsl(335 50% 85%)" }}>
            {f.l}
          </button>
        ))}
      </div>
      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="space-y-3">
        {orders.map(o => (
          <div key={o.id} className="card-glow rounded-2xl overflow-hidden">
            <button className="w-full p-4 text-left" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm" style={P}>Заказ #{o.id}</div>
                  <div className="text-xs mt-0.5" style={PS}>{o.client_name} · {o.client_phone}</div>
                  <div className="text-xs mt-0.5" style={PS}>{o.delivery_type?.toUpperCase()}: {o.pickup_point || o.delivery_address}</div>
                  {o.tracking_number && (
                    <div className="text-xs mt-0.5 font-medium" style={{ color: "hsl(30 80% 45%)" }}>
                      📦 Трек: {o.tracking_number}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-oswald font-bold text-sm" style={{ color: "hsl(335 80% 55%)" }}>{Number(o.total_amount).toLocaleString()} ₽</div>
                  <div className="text-xs font-medium mt-0.5" style={{ color: STATUS_COLORS[o.status] || "gray" }}>{STATUS_LABELS[o.status] || o.status}</div>
                </div>
              </div>
            </button>
            {expanded === o.id && (
              <div className="px-4 pb-4 border-t" style={{ borderColor: "hsl(335 40% 90%)" }}>
                <div className="mt-3 space-y-1.5 mb-2">
                  {(o.items || []).map((it: any) => (
                    <div key={it.id} className="flex justify-between text-xs" style={PS}>
                      <span>{it.product_name} × {it.quantity}</span>
                      <span className="font-semibold">{(it.price * it.quantity).toLocaleString()} ₽</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs mb-2" style={PS}>
                  {new Date(o.created_at).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {o.comment && <> · {o.comment}</>}
                </div>

                {/* Кнопки быстрых действий */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {/* Отправить заказ */}
                  {o.status !== "shipped" && o.status !== "done" && o.status !== "cancelled" && (
                    <div className="col-span-2 space-y-2 p-3 rounded-xl" style={{ background: "hsl(30 80% 97%)", border: "1px solid hsl(30 60% 88%)" }}>
                      <div className="text-xs font-semibold" style={{ color: "hsl(30 70% 40%)" }}>🚚 Отправить заказ</div>
                      <input
                        value={trackingInputs[o.id] || ""}
                        onChange={e => setTrackingInputs(p => ({ ...p, [o.id]: e.target.value }))}
                        placeholder="Трек-номер (необязательно)"
                        className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={inp} />
                      <input
                        value={trackingUrlInputs[o.id] || ""}
                        onChange={e => setTrackingUrlInputs(p => ({ ...p, [o.id]: e.target.value }))}
                        placeholder="Ссылка для отслеживания (необязательно)"
                        className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={inp} />
                      <button onClick={() => shipOrder(o)} disabled={sending === o.id}
                        className="w-full py-2.5 rounded-xl text-xs font-bold text-white"
                        style={{ background: "hsl(30 80% 50%)" }}>
                        {sending === o.id ? "Отправляем..." : "🚚 Отметить как отправлен + SMS клиенту"}
                      </button>
                    </div>
                  )}

                  {/* Подтвердить */}
                  {o.status === "new" && (
                    <button onClick={() => updateStatus(o.id, "confirmed")}
                      className="py-2.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: "hsl(142 60% 40%)" }}>
                      ✅ Подтвердить
                    </button>
                  )}

                  {/* Выдан */}
                  {o.status === "shipped" && (
                    <button onClick={() => updateStatus(o.id, "done")}
                      className="py-2.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: "hsl(142 60% 35%)" }}>
                      ✔ Отметить выданным
                    </button>
                  )}

                  {/* Отменить */}
                  {o.status !== "done" && o.status !== "cancelled" && (
                    <button onClick={() => updateStatus(o.id, "cancelled")}
                      className="py-2.5 rounded-xl text-xs font-medium"
                      style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 50%)" }}>
                      ❌ Отменить заказ
                    </button>
                  )}

                  {/* Удалить из списка */}
                  <button onClick={() => hideOrder(o.id)}
                    className="py-2.5 rounded-xl text-xs font-medium"
                    style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
                    🗑 Убрать из списка
                  </button>
                </div>

                {/* Все статусы */}
                <div className="pt-2 border-t" style={{ borderColor: "hsl(335 30% 92%)" }}>
                  <div className="text-[10px] mb-1.5" style={PS}>Все статусы:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(STATUS_LABELS).map(([st, lbl]) => (
                      <button key={st} onClick={() => updateStatus(o.id, st)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium"
                        style={o.status === st ? { background: STATUS_COLORS[st], color: "white" } : { background: "hsl(335 20% 95%)", color: "hsl(335 40% 55%)" }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {!loading && orders.length === 0 && <div className="text-center py-10 text-sm" style={PS}>Заказов пока нет</div>}
      </div>
    </div>
  );
}

// ── АДМИН: Рекламные баннеры магазина ──
function AdminShopBanners() {
  const [banners, setBanners] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", subtitle: "", image_url: "", link_url: "" });
  const [saving, setSaving] = React.useState(false);
  const [uploadingBanner, setUploadingBanner] = React.useState(false);
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  const load = () => adminPost("shop_banners").then(d => { setBanners(d.banners || []); setLoading(false); });
  React.useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title && !form.image_url) return;
    setSaving(true);
    await adminPost("shop_banners", { action: "add", ...form });
    setForm({ title: "", subtitle: "", image_url: "", link_url: "" });
    setAdding(false); setSaving(false); load();
  };

  const toggle = async (id: number) => { await adminPost("shop_banners", { action: "toggle", id }); load(); };
  const del = async (id: number) => { await adminPost("shop_banners", { action: "delete", id }); load(); };

  return (
    <div className="px-4 pb-6">
      <p className="text-xs mb-3" style={PS}>Баннеры отображаются вверху магазина</p>
      {!adding && (
        <button onClick={() => setAdding(true)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
          + Добавить баннер
        </button>
      )}
      {adding && (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs block mb-1" style={PS}>Заголовок</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Скидка 20% на косметику!" autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={PS}>Подзаголовок</label>
            <input value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))}
              placeholder="Только до конца месяца" autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs block mb-2" style={PS}>Изображение баннера</label>
            <PhotoUploadButton folder="banners" label="📷 Загрузить изображение" uploading={uploadingBanner}
              setUploading={setUploadingBanner} onUploaded={url => setForm(p => ({ ...p, image_url: url }))} className="w-full mb-2" />
            {form.image_url && <img src={form.image_url} className="w-full h-28 object-cover rounded-xl" alt="banner" />}
          </div>
          <div>
            <label className="text-xs block mb-1" style={PS}>Ссылка при нажатии (необязательно)</label>
            <input value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))}
              placeholder="https://..." autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || uploadingBanner} className="flex-1 py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
              {saving ? "Сохраняем..." : "Добавить"}
            </button>
            <button onClick={() => { setAdding(false); setForm({ title: "", subtitle: "", image_url: "", link_url: "" }); }}
              className="px-4 py-3 rounded-xl text-sm" style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
              Отмена
            </button>
          </div>
        </div>
      )}
      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="space-y-3">
        {banners.map(b => (
          <div key={b.id} className="card-glow rounded-2xl overflow-hidden" style={!b.is_active ? { opacity: 0.5 } : {}}>
            {b.image_url && <img src={b.image_url} className="w-full h-28 object-cover" alt={b.title} />}
            <div className="p-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={P}>{b.title}</div>
                {b.subtitle && <div className="text-xs" style={PS}>{b.subtitle}</div>}
                {b.link_url && <div className="text-[10px] truncate mt-0.5" style={{ color: "hsl(335 70% 55%)" }}>{b.link_url}</div>}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => toggle(b.id)} className="px-2.5 py-1 rounded-lg text-xs"
                  style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
                  {b.is_active ? "Скрыть" : "Показать"}
                </button>
                <button onClick={() => del(b.id)} className="px-2.5 py-1 rounded-lg text-xs"
                  style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 55%)" }}>
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && banners.length === 0 && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📢</div>
            <p className="text-sm" style={PS}>Баннеров пока нет</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── НИЖНЯЯ НАВИГАЦИЯ ────────────────────────────────────────────────────────

function BottomNav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const cartCount = getCart().reduce((s: number, i: any) => s + (i.quantity || 1), 0);
  const items: { id: Page; icon: string; label: string }[] = [
    { id: "home", icon: "Home", label: "Главная" },
    { id: "shop", icon: "ShoppingBag", label: "Магазин" },
    { id: "profile", icon: "User", label: "Профиль" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-2">
      <div className="rounded-3xl px-1 py-3 flex gap-0.5 shadow-lg"
        style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", border: "1px solid hsl(335 40% 88%)" }}>
        {items.map((item) => (
          <button key={item.id} onClick={() => setPage(item.id)}
            className="flex flex-col items-center gap-0.5 px-1 py-1 rounded-2xl transition-all flex-1 relative"
            style={page === item.id ? { background: "hsl(335 80% 60% / 0.12)" } : {}}>
            <div className="relative">
              <Icon name={item.icon as any} size={18}
                style={{ color: page === item.id ? "hsl(335 80% 55%)" : "hsl(335 20% 65%)" }} />
              {item.id === "shop" && cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ background: "hsl(335 80% 55%)" }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium whitespace-nowrap"
              style={{ color: page === item.id ? "hsl(335 80% 55%)" : "hsl(335 20% 65%)" }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}