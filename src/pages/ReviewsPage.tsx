/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const CONTENT_URL = "https://functions.poehali.dev/440815df-d73f-44e1-957c-6a718db23941";
const pink = "hsl(335 80% 55%)";
const textDark = "hsl(335 50% 25%)";
const textMid = "hsl(335 30% 55%)";
const pinkBorder = "hsl(335 50% 85%)";

const SERVICES = ["Криолиполиз", "СМАС-лифтинг", "Биоревитализация", "РФ-лифтинг", "Увеличение губ", "Уходовые процедуры", "Микронидлинг", "Вакуумный массаж", "Другое"];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [service, setService] = useState(SERVICES[0]);
  const [photo, setPhoto] = useState<{ data: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadReviews(); }, []);

  const loadReviews = () => {
    fetch(`${CONTENT_URL}/reviews`)
      .then(r => r.json())
      .then(d => setReviews(d.reviews?.length ? d.reviews : FALLBACK_REVIEWS));
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
    const body: any = { client_name: name, rating, text, service };
    if (photo) { body.photo_data = photo.data; body.photo_name = photo.name; }
    await fetch(`${CONTENT_URL}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setDone(true);
    setSending(false);
    setShowForm(false);
    loadReviews();
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "5.0";

  return (
    <div className="animate-fade-in pb-4">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-3xl font-oswald font-bold mb-1" style={{ color: textDark }}>Отзывы ⭐</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(s => (
              <span key={s} style={{ color: s <= Math.round(Number(avgRating)) ? "#f59e0b" : "hsl(335 20% 85%)", fontSize: 18 }}>★</span>
            ))}
          </div>
          <span className="font-bold" style={{ color: textDark }}>{avgRating}</span>
          <span className="text-sm" style={{ color: textMid }}>· {reviews.length} отзывов</span>
        </div>
      </div>

      {/* Кнопка написать отзыв */}
      <div className="px-4 mb-5">
        <button onClick={() => setShowForm(true)}
          className="w-full py-3.5 rounded-2xl font-semibold text-white shadow-md"
          style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
          🌸 Написать отзыв
        </button>
      </div>

      {done && (
        <div className="mx-4 mb-4 p-4 rounded-2xl text-sm font-medium text-center"
          style={{ background: "hsl(335 80% 60% / 0.1)", color: pink, border: `1px solid ${pinkBorder}` }}>
          Спасибо! Ваш отзыв опубликован ✨
        </div>
      )}

      {/* Отзывы */}
      <div className="px-4 space-y-3">
        {reviews.map((r: any, i: number) => (
          <div key={r.id || i} className="card-glow rounded-2xl p-4 animate-slide-up" style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
                {r.client_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm truncate" style={{ color: textDark }}>{r.client_name}</div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ color: s <= r.rating ? "#f59e0b" : "hsl(335 20% 85%)", fontSize: 13 }}>★</span>
                    ))}
                  </div>
                </div>
                {r.service && <div className="text-xs mt-0.5" style={{ color: pink }}>{r.service}</div>}
                {r.text && <p className="text-sm mt-2 leading-relaxed" style={{ color: textMid }}>{r.text}</p>}
                {r.photo_url && (
                  <img src={r.photo_url} alt="фото к отзыву" className="mt-2 w-full h-36 object-cover rounded-xl" />
                )}
                <div className="text-xs mt-2" style={{ color: "hsl(335 20% 70%)" }}>
                  {r.created_at ? new Date(r.created_at).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" }) : ""}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Форма отзыва — модалка */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 space-y-4" style={{ background: "white" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-oswald font-bold" style={{ color: textDark }}>Ваш отзыв</h2>
              <button onClick={() => setShowForm(false)} style={{ color: textMid }}>✕</button>
            </div>

            {/* Рейтинг */}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: textMid }}>Оценка</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRating(s)}
                    style={{ fontSize: 28, color: s <= rating ? "#f59e0b" : "hsl(335 20% 85%)" }}>★</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider block mb-1" style={{ color: textMid }}>Ваше имя *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Имя"
                className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                style={{ background: "hsl(335 30% 97%)", border: `1px solid ${pinkBorder}`, color: textDark }} />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider block mb-1" style={{ color: textMid }}>Услуга</label>
              <select value={service} onChange={e => setService(e.target.value)}
                className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                style={{ background: "hsl(335 30% 97%)", border: `1px solid ${pinkBorder}`, color: textDark }}>
                {SERVICES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wider block mb-1" style={{ color: textMid }}>Отзыв *</label>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Поделитесь впечатлением..." rows={3}
                className="w-full px-4 py-3 rounded-xl outline-none text-sm resize-none"
                style={{ background: "hsl(335 30% 97%)", border: `1px solid ${pinkBorder}`, color: textDark }} />
            </div>

            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "hsl(335 80% 60% / 0.08)", color: pink, border: `1px solid ${pinkBorder}` }}>
                <Icon name="Image" size={16} />
                {photo ? `📎 ${photo.name}` : "Прикрепить фото результата"}
              </button>
            </div>

            <button onClick={submit} disabled={!name.trim() || !text.trim() || sending}
              className="w-full py-3.5 rounded-2xl font-semibold text-white shadow-md"
              style={{ background: name.trim() && text.trim() ? "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" : "hsl(335 20% 88%)", color: name.trim() && text.trim() ? "white" : "hsl(335 20% 65%)" }}>
              {sending ? "Отправляем..." : "Опубликовать отзыв"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const FALLBACK_REVIEWS = [
  { id: 1, client_name: "Анна К.", rating: 5, text: "Криолиполиз — просто чудо! После 2 сеансов ушло 4 см в объёме живота. Галина настоящий профессионал, всё объяснила, было комфортно.", service: "Криолиполиз", photo_url: null, created_at: "2026-05-20T10:00:00" },
  { id: 2, client_name: "Мария Р.", rating: 5, text: "Делала СМАС-лифтинг. Результат потрясающий! Овал лица чёткий, кожа подтянулась. Рекомендую всем кто хочет молодость без операции.", service: "СМАС-лифтинг", photo_url: null, created_at: "2026-05-15T14:00:00" },
  { id: 3, client_name: "Ольга Т.", rating: 5, text: "РФ-лифтинг лица — отличный результат после курса 5 сеансов. Кожа стала более упругой, морщинки разгладились. Атмосфера в студии очень уютная!", service: "РФ-лифтинг", photo_url: null, created_at: "2026-05-01T11:00:00" },
];
