/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";

const CONTENT_URL = "https://functions.poehali.dev/440815df-d73f-44e1-957c-6a718db23941";
const textDark = "hsl(335 50% 25%)";
const textMid = "hsl(335 30% 55%)";

const CATEGORIES = [
  { id: "all", label: "Все" },
  { id: "cryo", label: "Криолиполиз" },
  { id: "smas", label: "СМАС-лифтинг" },
  { id: "rf", label: "РФ-лифтинг" },
  { id: "lips", label: "Губы без иглы" },
];

const FALLBACK: any[] = [
  { id: 1, category: "cryo", description: "Живот — 2 сеанса криолиполиза", before_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&q=80", after_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&q=80" },
  { id: 2, category: "smas", description: "Подтяжка контура лица", before_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&q=80", after_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80" },
  { id: 3, category: "rf", description: "РФ-лифтинг лица — 5 сеансов", before_url: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=300&q=80", after_url: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=300&q=80" },
  { id: 4, category: "lips", description: "Увеличение губ без иглы", before_url: "https://images.unsplash.com/photo-1592621385612-4d7129426394?w=300&q=80", after_url: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=300&q=80" },
];

export default function GalleryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [view, setView] = useState<"before" | "after">("after");

  useEffect(() => {
    fetch(`${CONTENT_URL}/gallery`)
      .then(r => r.json())
      .then(d => setItems(d.gallery?.length ? d.gallery : FALLBACK))
      .catch(() => setItems(FALLBACK));
  }, []);

  const filtered = cat === "all" ? items : items.filter((i: any) => i.category === cat);

  return (
    <div className="animate-fade-in pb-4">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-3xl font-oswald font-bold mb-1" style={{ color: textDark }}>Галерея ✨</h1>
        <p className="text-sm" style={{ color: textMid }}>Реальные результаты наших клиентов</p>
      </div>

      {/* Категории */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={cat === c.id
              ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" }
              : { background: "white", color: textMid, border: "1px solid hsl(335 50% 85%)" }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Сетка */}
      <div className="px-4 grid grid-cols-2 gap-3">
        {filtered.map((item: any, i: number) => (
          <div key={item.id} className="card-glow rounded-2xl overflow-hidden cursor-pointer animate-slide-up"
            style={{ animationDelay: `${i * 0.07}s` }}
            onClick={() => { setSelected(item); setView("after"); }}>
            <div className="relative h-44 overflow-hidden">
              <img src={item.after_url || item.before_url} alt={item.description}
                className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
                После
              </div>
              <div className="absolute inset-x-0 bottom-0 p-2"
                style={{ background: "linear-gradient(to top, rgba(255,240,245,0.95), transparent)" }}>
                <div className="text-xs font-medium" style={{ color: textDark }}>{item.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16" style={{ color: textMid }}>
          <div className="text-4xl mb-3">🌸</div>
          <div>Скоро добавим результаты</div>
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: "white" }}
            onClick={e => e.stopPropagation()}>
            {/* Before/After switcher */}
            <div className="flex">
              {(["before", "after"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className="flex-1 py-3 text-sm font-semibold transition-all"
                  style={view === v
                    ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" }
                    : { background: "hsl(335 20% 95%)", color: textMid }}>
                  {v === "before" ? "До" : "После"}
                </button>
              ))}
            </div>
            <div className="h-64 overflow-hidden">
              <img src={view === "before" ? selected.before_url : selected.after_url}
                alt={view} className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <div className="text-sm font-medium mb-3" style={{ color: textDark }}>{selected.description}</div>
              <button onClick={() => setSelected(null)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
