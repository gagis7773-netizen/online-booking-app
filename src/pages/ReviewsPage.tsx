/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const CONTENT_URL = "https://functions.poehali.dev/440815df-d73f-44e1-957c-6a718db23941";
const REVIEWS_URL = "https://functions.poehali.dev/c89e40ae-c0aa-45a1-8480-d692d54ff847";
const YANDEX_REVIEWS_URL = "https://functions.poehali.dev/4ef8938c-3c1a-44c7-82d4-d62e6f0546fa";
const pink = "hsl(335 80% 55%)";
const textDark = "hsl(335 50% 25%)";
const textMid = "hsl(335 30% 55%)";
const pinkBorder = "hsl(335 50% 85%)";
const GRAD = { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" };

const SERVICES = ["Криолиполиз", "СМАС-лифтинг", "Биоревитализация", "РФ-лифтинг", "Увеличение губ", "Уходовые процедуры", "Микронидлинг", "Вакуумный массаж", "Другое"];

const FALLBACK_REVIEWS: any[] = [];

export default function ReviewsPage({ onBack }: { onBack?: () => void }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [yandexReviews, setYandexReviews] = useState<any[]>([]);
  const [yandexRating, setYandexRating] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"site" | "yandex">("site");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [service, setService] = useState(SERVICES[0]);
  const [photo, setPhoto] = useState<{ data: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [done, setDone] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Поднимаем модал над клавиатурой через visualViewport
  useEffect(() => {
    if (!showForm) { setKeyboardOffset(0); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
    };
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => { vv.removeEventListener("resize", onResize); vv.removeEventListener("scroll", onResize); };
  }, [showForm]);

  useEffect(() => {
    loadReviews();
    loadYandexReviews();
  }, []);

  const loadReviews = () => {
    fetch(REVIEWS_URL)
      .then(r => r.json())
      .then(d => setReviews(d.reviews?.length ? d.reviews : FALLBACK_REVIEWS))
      .catch(() => setReviews(FALLBACK_REVIEWS));
  };

  const loadYandexReviews = () => {
    fetch(YANDEX_REVIEWS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get" }),
    })
      .then(r => r.json())
      .then(d => {
        const loaded = d.reviews || [];
        setYandexReviews(loaded);
        setYandexRating(d.rating || null);
        // Если в кеше пусто — автоматически синхронизируем с Яндекс
        if (loaded.length === 0) {
          syncYandexSilent();
        }
      })
      .catch(() => {});
  };

  const syncYandexSilent = () => {
    fetch(YANDEX_REVIEWS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync" }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) loadYandexReviews();
      })
      .catch(() => {});
  };

  const syncYandex = async () => {
    setSyncing(true);
    try {
      const res = await fetch(YANDEX_REVIEWS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = await res.json();
      if (data.ok) {
        await loadYandexReviews();
      }
    } catch { setSyncing(false); return; }
    setSyncing(false);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setPhoto({ data: base64, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!name.trim() || !text.trim()) return;
    setSending(true);
    try {
      const body: any = { client_name: name, rating, text, service };
      if (photo) { body.photo_data = photo.data; body.photo_name = photo.name; }
      const res = await fetch(REVIEWS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && (data.id || data.success)) {
        setDone(true);
        setShowForm(false);
        setName("");
        setText("");
        setRating(5);
        setPhoto(null);
        loadReviews();
      } else {
        alert("Не удалось отправить отзыв. Попробуйте ещё раз.");
      }
    } catch {
      alert("Ошибка соединения. Проверьте интернет и попробуйте снова.");
    } finally {
      setSending(false);
    }
  };

  const siteAvg = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "5.0";

  const yandexAvg = yandexRating?.rating
    ? Number(yandexRating.rating).toFixed(1)
    : yandexReviews.length > 0
      ? (yandexReviews.reduce((s, r) => s + (r.rating || 5), 0) / yandexReviews.length).toFixed(1)
      : null;

  const displayedReviews = activeTab === "yandex" ? yandexReviews : reviews;
  const displayedAvg = activeTab === "yandex" ? (yandexAvg || siteAvg) : siteAvg;
  const displayedCount = activeTab === "yandex"
    ? (yandexRating?.reviews_count || yandexReviews.length)
    : reviews.length;

  return (
    <div className="animate-fade-in pb-4">
      {/* Шапка */}
      <div className="px-4 pt-12 pb-4 flex items-start gap-3">
        {onBack && (
          <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
            style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
            <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-oswald font-bold mb-1" style={{ color: textDark }}>Отзывы ⭐</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(s => (
                <span key={s} style={{ color: s <= Math.round(Number(displayedAvg)) ? "#f59e0b" : "hsl(335 20% 85%)", fontSize: 16 }}>★</span>
              ))}
            </div>
            <span className="font-bold text-sm" style={{ color: textDark }}>{displayedAvg}</span>
            <span className="text-xs" style={{ color: textMid }}>· {displayedCount} отзывов</span>
            {activeTab === "yandex" && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "hsl(48 95% 92%)", color: "hsl(48 80% 35%)" }}>
                Яндекс Карты
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="px-4 mb-4">
        <div className="flex rounded-2xl overflow-hidden" style={{ background: "hsl(335 30% 92%)" }}>
          <button onClick={() => setActiveTab("site")} className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={activeTab === "site" ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
            🌸 Отзывы сайта
          </button>
          <button onClick={() => setActiveTab("yandex")} className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={activeTab === "yandex" ? { ...GRAD, color: "white" } : { color: "hsl(335 40% 60%)" }}>
            🗺 Яндекс Карты
          </button>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="px-4 mb-4 space-y-2">
        {/* Оставить отзыв на Яндексе */}
        {activeTab === "yandex" && (
          <a href="https://yandex.ru/maps/org/devchachiy_ray/46803820767" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-white shadow-md"
            style={GRAD}>
            ⭐ Оставить отзыв на Яндекс Картах
          </a>
        )}
        {/* Написать отзыв на сайте */}
        {activeTab === "site" && (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3.5 rounded-2xl font-semibold text-white shadow-md"
            style={GRAD}>
            🌸 Написать отзыв
          </button>
        )}
        {/* Кнопка обновить (маленькая, вторичная) */}
        {activeTab === "yandex" && (
          <button onClick={syncYandex} disabled={syncing}
            className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
            style={{ background: "hsl(335 20% 96%)", color: "hsl(335 40% 60%)", border: "1px solid hsl(335 30% 90%)" }}>
            <Icon name="RefreshCw" size={12} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Обновляем..." : "Обновить отзывы с Яндекс Карт"}
          </button>
        )}
      </div>

      {done && (
        <div className="mx-4 mb-4 p-4 rounded-2xl text-sm font-medium text-center"
          style={{ background: "hsl(335 80% 60% / 0.1)", color: pink, border: `1px solid ${pinkBorder}` }}>
          Спасибо! Ваш отзыв отправлен и появится после проверки ✨
        </div>
      )}

      {/* Список отзывов */}
      <div className="px-4 space-y-3">
        {displayedReviews.length === 0 && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">⭐</div>
            <p className="text-sm" style={{ color: textMid }}>
              {activeTab === "yandex" ? "Нажми «Обновить» чтобы загрузить отзывы" : "Будьте первым, кто оставит отзыв!"}
            </p>
          </div>
        )}
        {displayedReviews.map((r: any, i: number) => (
          <div key={r.id || r.yandex_id || i} className="card-glow rounded-2xl p-4 animate-slide-up" style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                style={GRAD}>
                {(r.client_name || r.author_name || "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm truncate" style={{ color: textDark }}>
                    {r.client_name || r.author_name || "Аноним"}
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0 items-center">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ color: s <= (r.rating || 5) ? "#f59e0b" : "hsl(335 20% 85%)", fontSize: 13 }}>★</span>
                    ))}
                    {activeTab === "yandex" && (
                      <span className="ml-1 text-[10px] opacity-60" style={{ color: textMid }}>я</span>
                    )}
                  </div>
                </div>
                {r.service && <div className="text-xs mt-0.5" style={{ color: pink }}>{r.service}</div>}
                {(r.text) && (
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: textMid }}>{r.text}</p>
                )}
                {r.photo_url && (
                  <img src={r.photo_url} alt="фото к отзыву" className="mt-2 w-full h-36 object-cover rounded-xl" />
                )}
                <div className="text-xs mt-2" style={{ color: "hsl(335 20% 70%)" }}>
                  {(r.review_date || r.created_at)
                    ? new Date(r.review_date || r.created_at).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })
                    : ""}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Форма отзыва */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg mx-auto rounded-t-3xl flex flex-col"
            style={{ background: "white", maxHeight: "80dvh", transform: `translateY(-${keyboardOffset}px)`, transition: "transform 0.2s ease" }}
            onClick={e => e.stopPropagation()}>

            {/* Шапка — всегда видна, не скроллится */}
            <div className="px-5 pt-4 pb-3 flex-shrink-0 border-b" style={{ borderColor: "hsl(335 30% 92%)" }}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-oswald font-bold" style={{ color: textDark }}>Ваш отзыв</h2>
                <button onClick={() => setShowForm(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{ background: "hsl(335 20% 93%)", color: textMid }}>✕</button>
              </div>
              {/* Звёзды */}
              <div className="flex gap-1.5 mb-3">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRating(s)}
                    style={{ fontSize: 28, color: s <= rating ? "#f59e0b" : "hsl(335 20% 85%)" }}>★</button>
                ))}
              </div>
              {/* Кнопка отправить — ЗДЕСЬ, всегда вверху */}
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center justify-center gap-1 px-3 py-3 rounded-xl text-sm font-semibold flex-shrink-0"
                  style={photo
                    ? { background: "hsl(142 50% 94%)", color: "hsl(142 55% 35%)", border: "1.5px solid hsl(142 50% 78%)" }
                    : { background: "hsl(335 30% 96%)", color: "hsl(335 50% 50%)", border: `1.5px dashed ${pinkBorder}` }}>
                  <span style={{ fontSize: 18 }}>📷</span>
                  {photo ? "✓" : ""}
                </button>
                <button onClick={submit} disabled={sending || !name.trim() || !text.trim()}
                  className="flex-1 py-3 rounded-xl font-bold text-sm shadow-md transition-all"
                  style={name.trim() && text.trim()
                    ? { ...GRAD, color: "white" }
                    : { background: "hsl(335 20% 90%)", color: "hsl(335 20% 65%)" }}>
                  {sending ? "Отправляем..." : "Опубликовать отзыв ✓"}
                </button>
              </div>
            </div>

            {/* Поля — скроллируются */}
            <div className="px-5 py-3 overflow-y-auto flex-1 space-y-3">
              {photo && (
                <div className="relative">
                  <img src={`data:image/jpeg;base64,${photo.data}`} alt="preview"
                    className="w-full h-20 object-cover rounded-xl" />
                  <button onClick={() => setPhoto(null)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(0,0,0,0.55)", color: "white" }}>✕</button>
                </div>
              )}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: textMid }}>Ваше имя *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Имя"
                  className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                  style={{ background: "hsl(335 30% 97%)", border: `1px solid ${pinkBorder}`, color: textDark }} />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: textMid }}>Отзыв *</label>
                <textarea value={text} onChange={e => setText(e.target.value)}
                  placeholder="Поделитесь впечатлением..." rows={4}
                  className="w-full px-3 py-2.5 rounded-xl outline-none text-sm resize-none"
                  style={{ background: "hsl(335 30% 97%)", border: `1px solid ${pinkBorder}`, color: textDark }} />
              </div>
              <div className="pb-4" />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}