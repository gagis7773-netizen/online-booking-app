/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const CONTENT_URL = "https://functions.poehali.dev/440815df-d73f-44e1-957c-6a718db23941";
const pink = "hsl(335 80% 55%)";
const textDark = "hsl(335 50% 25%)";
const textMid = "hsl(335 30% 55%)";
const pinkBorder = "hsl(335 50% 85%)";

export default function PromotionsPage({ onBook }: { onBook: () => void }) {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${CONTENT_URL}/promotions`)
      .then(r => r.json())
      .then(d => setPromos(d.promotions || []))
      .finally(() => setLoading(false));
  }, []);

  const fallbackPromos = [
    { id: 1, title: "Криолиполиз живота", discount_text: "–20% на первый сеанс", description: "Только в июне! Минус объёмы без боли и реабилитации. Аппарат нового поколения.", image_url: null, valid_until: "2026-06-30" },
    { id: 2, title: "Комплекс СМАС + РФ-лифтинг", discount_text: "–15% при записи онлайн", description: "Подтяжка лица без операции — сочетание двух мощнейших методик.", image_url: null, valid_until: "2026-07-15" },
    { id: 3, title: "Биоревитализация", discount_text: "2 сеанса по цене 1.5", description: "Глубокое увлажнение и омоложение без игл. Результат с первой процедуры.", image_url: null, valid_until: null },
  ];

  const displayPromos = promos.length > 0 ? promos : fallbackPromos;

  return (
    <div className="animate-fade-in pb-4">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-3xl font-oswald font-bold mb-1" style={{ color: textDark }}>Акции 🎁</h1>
        <p className="text-sm" style={{ color: textMid }}>Специальные предложения для наших клиентов</p>
      </div>

      {loading && (
        <div className="text-center py-12" style={{ color: textMid }}>
          <div className="text-3xl mb-2 animate-float">🌸</div>
          <div className="text-sm">Загружаем акции...</div>
        </div>
      )}

      <div className="px-4 space-y-4">
        {displayPromos.map((promo: any, i: number) => (
          <div key={promo.id} className="card-glow rounded-3xl overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
            {/* Image или gradient placeholder */}
            {promo.image_url ? (
              <img src={promo.image_url} alt={promo.title} className="w-full h-44 object-cover" />
            ) : (
              <div className="w-full h-32 flex items-center justify-center text-5xl"
                style={{ background: `linear-gradient(135deg, hsl(335 80% 92%), hsl(315 70% 90%))` }}>
                {["🌸", "✨", "💆‍♀️"][i % 3]}
              </div>
            )}
            <div className="p-5">
              {/* Скидка */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
                style={{ background: `linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))`, color: "white" }}>
                <Icon name="Tag" size={12} />
                {promo.discount_text || "Специальная цена"}
              </div>
              <h3 className="text-lg font-oswald font-bold mb-1" style={{ color: textDark }}>{promo.title}</h3>
              {promo.description && (
                <p className="text-sm mb-3" style={{ color: textMid }}>{promo.description}</p>
              )}
              {promo.valid_until && (
                <div className="flex items-center gap-1.5 text-xs mb-4" style={{ color: textMid }}>
                  <Icon name="Clock" size={12} />
                  До {new Date(promo.valid_until).toLocaleDateString("ru", { day: "numeric", month: "long" })}
                </div>
              )}
              <button onClick={onBook}
                className="w-full py-3 rounded-xl font-semibold text-white shadow-md"
                style={{ background: `linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))` }}>
                Записаться по акции
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-4 mt-6">
        <div className="card-glow rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(335 80% 60% / 0.1)", border: `1px solid ${pinkBorder}` }}>
            <Icon name="Bell" size={18} style={{ color: pink }} />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm" style={{ color: textDark }}>Хочешь первой узнавать об акциях?</div>
            <div className="text-xs" style={{ color: textMid }}>Напиши нам в чат — добавим в список</div>
          </div>
        </div>
      </div>
    </div>
  );
}
