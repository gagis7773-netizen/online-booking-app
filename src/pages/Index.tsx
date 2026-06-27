/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import ReviewsPage from "./ReviewsPage";
import ChatPage from "./ChatPage";

const LOGO_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/14d6f8e1-0772-4340-a687-4fe03df40989.png";
const QR_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/2b4d4c5d-2ea0-4fb1-8548-564f4e7eb33c.png";
const SALON_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/files/890adaa5-bbaa-4546-9c4e-2406379ded6a.jpg";
const PRICE_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/files/f4378294-5088-4fed-866f-23d184cb3882.jpg";
const GALINA_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/8f8e57f4-caad-4931-8d8a-bea880feb389.jpg";

const AUTH_URL = "https://functions.poehali.dev/888bfad7-6580-4f39-b963-78aca5d4d8c0";
const ADMIN_API_URL = "https://functions.poehali.dev/6a39495b-54c8-4d05-a0e8-81e258a80299";
const SEND_BOOKING_URL = "https://functions.poehali.dev/33731d63-c7a5-4a89-b075-6b0a4282ecfc";

const adminPost = (section: string, extra?: object) =>
  fetch(ADMIN_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section, ...extra }) }).then(r => r.json());

type Page = "home" | "pricelist" | "masters" | "booking" | "profile" | "reviews" | "admin" | "chat" | "gallery";

const services = [
  { id: 1, name: "Криолиполиз", category: "Тело", price: 0, duration: 60, icon: "Snowflake", color: "from-cyan-500 to-blue-600" },
  { id: 2, name: "Вакуумный массаж", category: "Тело", price: 0, duration: 60, icon: "Wind", color: "from-teal-500 to-cyan-600" },
  { id: 3, name: "СМАС-лифтинг", category: "Лицо", price: 0, duration: 90, icon: "Zap", color: "from-yellow-500 to-orange-500" },
  { id: 4, name: "Биоревитализация и мезо без иглы", category: "Лицо", price: 0, duration: 60, icon: "Droplets", color: "from-blue-500 to-indigo-600" },
  { id: 5, name: "Микроигольчатый РФ-лифтинг", category: "Лицо", price: 0, duration: 60, icon: "Sparkles", color: "from-fuchsia-500 to-pink-600" },
  { id: 6, name: "Увеличение губ без иглы", category: "Лицо", price: 0, duration: 45, icon: "Heart", color: "from-rose-500 to-pink-600" },
  { id: 7, name: "Уходовые процедуры по лицу", category: "Лицо", price: 0, duration: 60, icon: "Star", color: "from-pink-500 to-rose-600" },
  { id: 8, name: "СПА-программы", category: "Тело", price: 0, duration: 90, icon: "Flower2", color: "from-purple-500 to-pink-600" },
  { id: 9, name: "Микронидлинг", category: "Лицо", price: 0, duration: 60, icon: "CircleDot", color: "from-indigo-500 to-purple-600" },
  { id: 10, name: "Липолитики", category: "Тело", price: 0, duration: 45, icon: "Flame", color: "from-orange-500 to-red-600" },
  { id: 11, name: "Волосы", category: "Волосы", price: 0, duration: 60, icon: "Scissors", color: "from-amber-500 to-yellow-600" },
  { id: 12, name: "РФ-лифтинг тело и лицо", category: "Лицо", price: 0, duration: 60, icon: "Waves", color: "from-violet-500 to-purple-600" },
];

const DEFAULT_MASTERS = [
  { id: 1, name: "Галина Сиплатова", spec: "Косметолог-эстетист", rating: 5.0, reviews_count: 0, img: GALINA_IMG, tags: ["СМАС-лифтинг", "Биоревитализация", "РФ-лифтинг", "Криолиполиз"] },
];

const timeSlots = ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
const busySlots = ["10:00", "13:00", "15:00", "18:00"];

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
  const [selectedServices, setSelectedServices] = useState<typeof services>([]);
  const [selectedMaster, setSelectedMaster] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingDone, setBookingDone] = useState(false);

  useEffect(() => {
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
  }, []);

  const masters = dynamicMasters.length > 0 ? dynamicMasters : DEFAULT_MASTERS;

  const handleLogin = (c: any) => {
    saveClient(c);
    setClient(c);
  };

  const handleLogout = () => {
    clearClient();
    setClient(null);
    setPage("home");
  };

  const startBooking = () => {
    setBookingStep(1);
    setSelectedServices([]);
    setSelectedMaster(null);
    setSelectedDay(0);
    setSelectedTime(null);
    setBookingDone(false);
    setPage("booking");
  };

  const confirmBooking = () => {
    setBookingDone(true);
    setBookingStep(4);
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
        {page === "home" && <HomePage setPage={setPage} startBooking={startBooking} client={client} masters={masters} />}
        {page === "pricelist" && <PriceListPage setPage={setPage} startBooking={startBooking} />}
        {page === "masters" && <MastersPage masters={masters} setPage={setPage} startBooking={startBooking} />}
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
            services={services}
            masters={masters}
            weekDays={weekDays}
            timeSlots={timeSlots}
            busySlots={busySlots}
            setPage={setPage}
            client={client}
          />
        )}
        {page === "profile" && (
          <ProfilePage client={client} onLogin={handleLogin} onLogout={handleLogout} setPage={setPage} />
        )}
        {page === "reviews" && <ReviewsPage onBack={() => setPage("home")} />}
        {page === "gallery" && <ClientGalleryPage setPage={setPage} />}
        {page === "chat" && <ChatPage onBack={() => setPage("home")} />}
        {page === "admin" && <AdminPage onBack={() => setPage("home")} />}
      </div>

      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}

// ─── HOME ───────────────────────────────────────────────────────────────────

function HomePage({ setPage, startBooking, client, masters }: { setPage: (p: Page) => void; startBooking: () => void; client: any; masters: any[] }) {
  const [pressTimer, setPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoPress = () => {
    const t = setTimeout(() => setPage("admin"), 2000);
    setPressTimer(t);
  };
  const handleLogoRelease = () => {
    if (pressTimer) clearTimeout(pressTimer);
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="relative h-[480px] overflow-hidden">
        <img src={SALON_IMG} alt="Girly Paradise" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(255,220,230,0.15) 0%, rgba(255,182,193,0.25) 40%, rgba(255,240,245,0.96) 100%)"
        }} />
        <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg cursor-pointer select-none"
            style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}
            onMouseDown={handleLogoPress} onMouseUp={handleLogoRelease} onMouseLeave={handleLogoRelease}
            onTouchStart={handleLogoPress} onTouchEnd={handleLogoRelease}>
            <img src={LOGO_IMG} alt="Girly Paradise" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex flex-col items-end gap-1.5 pt-1">
            <a href="tel:+79046015556"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", color: "hsl(335 80% 45%)", border: "1px solid hsl(335 80% 80%)" }}>
              <Icon name="Phone" size={11} />
              <span>+7 (904) 601-55-56</span>
            </a>
            <a href="https://yandex.ru/maps/org/devchachiy_ray/46803820767?si=tk0bmt4ttr79ee9mkbgjgzmduc" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", color: "hsl(335 60% 50%)", border: "1px solid hsl(335 50% 85%)" }}>
              <Icon name="MapPin" size={11} />
              <span>м. Парнас · ул. Заречная, 10 →</span>
            </a>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="text-4xl font-oswald font-bold leading-tight mb-3" style={{ color: "hsl(335 60% 30%)" }}>
            Онлайн запись<br /><span className="gradient-text">в один клик</span>
          </h1>
          <button
            onClick={startBooking}
            className="w-full py-3.5 rounded-2xl font-semibold text-white text-base animate-pulse-glow shadow-lg"
            style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
            🌸 Записаться сейчас
          </button>
        </div>
      </div>

      {/* Мастера */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-oswald font-semibold" style={{ color: "hsl(335 60% 30%)" }}>Наши мастера</h2>
          <button onClick={() => setPage("masters")} className="text-sm font-medium" style={{ color: "hsl(335 80% 55%)" }}>Все →</button>
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

      {/* Разделы */}
      <div className="px-4 mb-5">
        <h2 className="text-xl font-oswald font-semibold mb-3" style={{ color: "hsl(335 60% 30%)" }}>Разделы</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Прайс-лист", sub: "Все услуги и цены", page: "pricelist" as Page, icon: "ClipboardList" },
            { label: "Галерея", sub: "Мои работы", page: "gallery" as Page, icon: "Images" },
            { label: "Отзывы", sub: "Мнения клиентов", page: "reviews" as Page, icon: "Star" },
          ].map(item => (
            <button key={item.page} onClick={() => setPage(item.page)}
              className="card-glow rounded-2xl p-4 text-left hover:scale-105 transition-all">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "hsl(335 80% 60% / 0.1)", border: "1px solid hsl(335 70% 85%)" }}>
                <Icon name={item.icon as any} size={18} style={{ color: "hsl(335 75% 52%)" }} />
              </div>
              <div className="font-semibold text-sm mb-0.5" style={{ color: "hsl(335 50% 30%)" }}>{item.label}</div>
              <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>{item.sub}</div>
            </button>
          ))}
        </div>
      </div>

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

function PriceListPage({ setPage, startBooking }: { setPage: (p: Page) => void; startBooking: () => void }) {
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
      {/* Баннер прайс-листа */}
      <div className="relative h-44 overflow-hidden mb-4">
        <img src={PRICE_IMG} alt="Прайс-лист" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(255,220,230,0.1) 0%, rgba(255,240,245,0.88) 100%)" }} />
        <div className="absolute top-3 left-3">
          <button onClick={() => setPage("home")} className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}>
            <Icon name="ChevronLeft" size={18} style={{ color: "hsl(335 60% 40%)" }} />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <h1 className="text-3xl font-oswald font-bold" style={{ color: "hsl(335 60% 28%)" }}>Прайс-лист 💅</h1>
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

function MastersPage({ masters: mList, setPage, startBooking }: { masters: Master[]; setPage: (p: Page) => void; startBooking: () => void }) {
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
        <button onClick={() => setPage("home")} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
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
      await fetch(SEND_BOOKING_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: client?.name || "Клиент",
          phone: client?.phone || "",
          service: serviceNames,
          master: selectedMaster?.name || "Любой свободный",
          day: `${dayInfo?.day}, ${dayInfo?.date} ${dayInfo?.month}`,
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

      {/* Шаг 1: выбор услуг (множественный) */}
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

          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
            {svcList.map((s: any) => {
              const checked = selectedServices.find((x: any) => x.id === s.id);
              return (
                <div key={s.id}
                  className="card-glow rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all"
                  style={checked ? { borderColor: "hsl(335 80% 70%)", background: "hsl(335 80% 60% / 0.05)" } : {}}
                  onClick={() => toggleService(s)}>
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon name={s.icon as any} size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "hsl(335 50% 30%)" }}>{s.name}</div>
                    <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>{s.duration} мин</div>
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
        body: JSON.stringify({ action: mode === "register" ? "register" : "login", phone: "+" + digits, name: name.trim() }),
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
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "hsl(335 40% 55%)" }}>Имя</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Введи своё имя"
                  className="w-full px-4 py-3.5 rounded-xl text-sm outline-none"
                  style={{ background: "white", border: "1.5px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }}
                />
              </div>
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
  const [tab, setTab] = useState<"upcoming" | "done">("upcoming");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(localStorage.getItem("gp_avatar_" + client.id) || "");
  const [showShare, setShowShare] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewSent, setReviewSent] = useState(false);
  const siteUrl = window.location.href;

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("gp_bookings_" + client.id) || "[]");
    setBookings(stored);
    setLoadingHistory(false);
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [client.id]);

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

        {/* Кнопки Share / Install / Отзыв */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <button onClick={() => setShowShare(!showShare)}
            className="py-3 rounded-2xl text-xs font-medium flex flex-col items-center gap-1"
            style={{ background: "hsl(335 50% 96%)", color: "hsl(335 60% 45%)", border: "1px solid hsl(335 50% 85%)" }}>
            <Icon name="Share2" size={16} />
            Поделиться
          </button>
          <button onClick={handleInstall}
            className="py-3 rounded-2xl text-xs font-medium flex flex-col items-center gap-1"
            style={{ background: "hsl(335 50% 96%)", color: "hsl(335 60% 45%)", border: "1px solid hsl(335 50% 85%)" }}>
            <Icon name="Smartphone" size={16} />
            На экран
          </button>
          <button onClick={() => setShowReview(!showReview)}
            className="py-3 rounded-2xl text-xs font-medium flex flex-col items-center gap-1"
            style={{ background: "hsl(335 50% 96%)", color: "hsl(335 60% 45%)", border: "1px solid hsl(335 50% 85%)" }}>
            <Icon name="Star" size={16} />
            Отзыв
          </button>
        </div>

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

        {/* История посещений */}
        <h3 className="text-lg font-oswald font-semibold mb-3" style={{ color: "hsl(335 60% 30%)" }}>История посещений</h3>

        <div className="flex rounded-2xl overflow-hidden mb-4" style={{ background: "hsl(335 30% 92%)" }}>
          <button onClick={() => setTab("upcoming")} className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={tab === "upcoming" ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" } : { color: "hsl(335 40% 60%)" }}>
            Предстоящие
          </button>
          <button onClick={() => setTab("done")} className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={tab === "done" ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" } : { color: "hsl(335 40% 60%)" }}>
            Были у нас
          </button>
        </div>

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
      </div>
    </div>
  );
}

// ─── ПАНЕЛЬ ВЛАДЕЛЬЦА ────────────────────────────────────────────────────────

type AdminSection = "dashboard" | "clients" | "schedule" | "messages" | "notifications" | "expenses" | "gallery" | "staff" | "settings" | "profile_edit" | "pricelist_edit" | "broadcast" | "analytics" | "masters_edit";

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

  useEffect(() => {
    if (adminUser) adminPost("stats").then(d => setStats(d)).catch(() => {});
  }, [adminUser]);

  const handleLogin = (user: any) => { saveAdminSession(user); setAdminUser(user); };
  const handleLogout = () => { clearAdminSession(); setAdminUser(null); setSection("dashboard"); };

  if (!adminUser) return <AdminPinScreen onSuccess={handleLogin} onBack={onBack} />;

  const isOwner = adminUser.role === "owner";

  const menuItems: { id: AdminSection; icon: string; label: string; color: string; ownerOnly?: boolean }[] = [
    { id: "schedule", icon: "CalendarDays", label: "Расписание", color: "from-blue-500 to-indigo-500" },
    { id: "clients", icon: "Users", label: "Клиенты", color: "from-purple-500 to-pink-500" },
    { id: "analytics", icon: "BarChart3", label: "Статистика", color: "from-pink-500 to-fuchsia-500", ownerOnly: true },
    { id: "messages", icon: "MessageCircle", label: "Сообщения", color: "from-teal-500 to-cyan-500" },
    { id: "notifications", icon: "Bell", label: "Уведомления", color: "from-orange-500 to-amber-500", ownerOnly: true },
    { id: "expenses", icon: "Wallet", label: "Финансы", color: "from-red-500 to-orange-500", ownerOnly: true },
    { id: "gallery", icon: "Images", label: "Галерея", color: "from-violet-500 to-purple-500" },
    { id: "pricelist_edit", icon: "ClipboardList", label: "Прайс", color: "from-pink-500 to-rose-500", ownerOnly: true },
    { id: "masters_edit", icon: "UserCircle", label: "Мастера", color: "from-rose-400 to-pink-500", ownerOnly: true },
    { id: "broadcast", icon: "Send", label: "Рассылка", color: "from-sky-500 to-blue-500", ownerOnly: true },
    { id: "staff", icon: "ShieldCheck", label: "Сотрудники", color: "from-emerald-500 to-teal-500", ownerOnly: true },
    { id: "settings", icon: "Settings", label: "Настройки", color: "from-gray-500 to-slate-500", ownerOnly: true },
  ];

  const visibleMenu = isOwner ? menuItems : menuItems.filter(m => !m.ownerOnly);
  const currentLabel = section === "dashboard" ? "Панель управления" : menuItems.find(m => m.id === section)?.label;

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
      {section === "analytics" && isOwner && <AdminAnalytics />}
      {section === "messages" && <AdminMessages />}
      {section === "notifications" && isOwner && <AdminNotifications />}
      {section === "expenses" && isOwner && <AdminExpenses />}
      {section === "gallery" && <AdminGalleryFolders />}
      {section === "pricelist_edit" && isOwner && <AdminPricelistEditor />}
      {section === "masters_edit" && isOwner && <AdminMastersEditor />}
      {section === "broadcast" && isOwner && <AdminBroadcast />}
      {section === "staff" && isOwner && <AdminStaff currentStaffId={adminUser.id} />}
      {section === "settings" && isOwner && <AdminSettings />}
      {section === "profile_edit" && isOwner && <AdminProfile onLogout={handleLogout} />}
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminPost("clients").then(d => { setClients(d.clients || []); setLoading(false); });
  }, []);

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  return (
    <div className="px-4 pb-6">
      <div className="relative mb-4">
        <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(335 50% 65%)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
          className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }} />
      </div>
      <p className="text-xs mb-3" style={PS}>{filtered.length} клиентов</p>
      {loading && <div className="text-center py-10"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="space-y-2">
        {filtered.map((c, i) => (
          <div key={c.id} className="card-glow rounded-2xl p-4" style={{ animationDelay: `${i * 0.03}s` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={GRAD}>
                {c.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate text-sm" style={P}>{c.name}</div>
                <a href={`tel:${c.phone}`} className="text-sm" style={{ color: "hsl(335 80% 55%)" }}>{c.phone}</a>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-medium" style={{ color: "hsl(335 50% 40%)" }}>{c.bookings_count} зап.</div>
                <div className="text-xs" style={PS}>с {c.registered_at}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Расписание ──
function AdminSchedule() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ client_name: "", client_phone: "", services: "", master: "Галина", booking_date: "", booking_time: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = () => adminPost("schedule").then(d => { setItems(d.schedule || []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.client_name || !form.booking_date || !form.booking_time) return;
    setSaving(true);
    await adminPost("schedule", { action: "add", ...form });
    setForm({ client_name: "", client_phone: "", services: "", master: "Галина", booking_date: "", booking_time: "", notes: "" });
    setAdding(false);
    setSaving(false);
    load();
  };

  const del = async (id: number) => {
    await adminPost("schedule", { action: "delete", id });
    load();
  };

  const inputStyle = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

  return (
    <div className="px-4 pb-6">
      <button onClick={() => setAdding(!adding)}
        className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm"
        style={GRAD}>
        {adding ? "✕ Отмена" : "+ Добавить запись"}
      </button>

      {adding && (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          {[
            { key: "client_name", label: "Имя клиента", ph: "Имя" },
            { key: "client_phone", label: "Телефон", ph: "+7..." },
            { key: "services", label: "Услуги", ph: "Криолиполиз, СМАС..." },
            { key: "booking_date", label: "Дата", ph: "2026-07-15" },
            { key: "booking_time", label: "Время", ph: "14:00" },
            { key: "notes", label: "Примечание", ph: "Необязательно" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium block mb-1" style={PS}>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.ph} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            </div>
          ))}
          <button onClick={save} disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      )}

      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.id} className="card-glow rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-sm" style={P}>{item.client_name}</div>
                <div className="text-xs" style={PS}>{item.services}</div>
              </div>
              <button onClick={() => del(item.id)} className="text-xs px-2 py-1 rounded-lg" style={{ background: "hsl(0 60% 95%)", color: "hsl(0 60% 55%)" }}>✕</button>
            </div>
            <div className="flex items-center gap-3 text-xs" style={PS}>
              <span>📅 {item.booking_date}</span>
              <span>🕐 {item.booking_time}</span>
              <span>👩 {item.master}</span>
            </div>
            {item.client_phone && <a href={`tel:${item.client_phone}`} className="text-xs mt-1 block" style={{ color: "hsl(335 80% 55%)" }}>{item.client_phone}</a>}
          </div>
        ))}
        {!loading && items.length === 0 && <div className="text-center py-10 text-sm" style={PS}>Расписание пусто</div>}
      </div>
    </div>
  );
}

// ── Сообщения ──
function AdminMessages() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminPost("messages").then(d => { setChats(d.chats || []); setLoading(false); });
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
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };

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
    await adminPost("gallery", { action: "add", ...photoForm, folder_id: activeFolder.id, category: activeFolder.name });
    setPhotoForm({ url: "", title: "" });
    setAddingPhoto(false); setSaving(false); loadPhotos(activeFolder.id);
  };

  const removePhoto = async (id: number) => {
    await adminPost("gallery", { action: "deactivate", id }); loadPhotos(activeFolder.id);
  };

  if (activeFolder) return (
    <div className="px-4 pb-6">
      <button onClick={() => { setActiveFolder(null); setPhotos([]); }} className="flex items-center gap-2 text-sm mb-4" style={PS}>
        <Icon name="ChevronLeft" size={16} /> Все папки
      </button>
      <h2 className="text-lg font-oswald font-bold mb-1" style={P}>{activeFolder.name}</h2>
      {activeFolder.description && <p className="text-xs mb-4" style={PS}>{activeFolder.description}</p>}

      <button onClick={() => setAddingPhoto(!addingPhoto)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
        {addingPhoto ? "✕ Отмена" : "+ Добавить фото"}
      </button>
      {addingPhoto && (
        <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Ссылка на фото (URL)</label>
            <input value={photoForm.url} onChange={e => setPhotoForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={PS}>Подпись (необязательно)</label>
            <input value={photoForm.title} onChange={e => setPhotoForm(p => ({ ...p, title: e.target.value }))} placeholder="Описание фото"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
          </div>
          {photoForm.url && <img src={photoForm.url} className="w-full h-40 object-cover rounded-xl" alt="preview" onError={e => (e.currentTarget.style.display = "none")} />}
          <button onClick={addPhoto} disabled={saving} className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
            {saving ? "Добавляем..." : "Добавить фото"}
          </button>
        </div>
      )}

      {photosLoading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="grid grid-cols-2 gap-3">
        {photos.map(ph => (
          <div key={ph.id} className="card-glow rounded-2xl overflow-hidden relative">
            <img src={ph.url} alt={ph.title} className="w-full h-36 object-cover" />
            {ph.title && <div className="px-2 py-1.5 text-xs truncate" style={P}>{ph.title}</div>}
            <button onClick={() => removePhoto(ph.id)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.92)", color: "hsl(0 60% 55%)" }}>✕</button>
          </div>
        ))}
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
          {[{ key: "name", label: "Название папки", ph: "До и после, Лицо, Тело..." }, { key: "description", label: "Описание", ph: "Необязательно" }, { key: "cover_url", label: "URL обложки", ph: "https://..." }].map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium block mb-1" style={PS}>{f.label}</label>
              <input value={(folderForm as any)[f.key]} onChange={e => setFolderForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.ph} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
            </div>
          ))}
          <button onClick={addFolder} disabled={saving} className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={GRAD}>
            {saving ? "Создаём..." : "Создать"}
          </button>
        </div>
      )}
      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      <div className="grid grid-cols-2 gap-3">
        {folders.map(f => (
          <button key={f.id} onClick={() => openFolder(f)} className="card-glow rounded-2xl overflow-hidden text-left hover:scale-105 transition-all">
            {f.cover_url
              ? <img src={f.cover_url} className="w-full h-28 object-cover" alt={f.name} />
              : <div className="w-full h-28 flex items-center justify-center text-4xl" style={{ background: "hsl(335 80% 96%)" }}>🖼</div>}
            <div className="p-3">
              <div className="font-semibold text-sm truncate" style={P}>{f.name}</div>
              {f.description && <div className="text-xs truncate mt-0.5" style={PS}>{f.description}</div>}
            </div>
          </button>
        ))}
        {!loading && folders.length === 0 && <div className="col-span-2 text-center py-8 text-sm" style={PS}>Папок пока нет</div>}
      </div>
    </div>
  );
}

// ── Редактор прайс-листа ──
function AdminPricelistEditor() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", category: "", price: "", duration: "", description: "", photo_url: "" });
  const [saving, setSaving] = useState(false);
  const inp = { background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" };
  const cats = ["Криолиполиз", "Лицо", "Тело", "Волосы", "СПА", "РФ-лифтинг", "Другое"];

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

  const FormBlock = () => (
    <div className="card-glow rounded-2xl p-4 mb-4 space-y-3">
      {[{ k: "name", l: "Название услуги", ph: "Криолиполиз 2 зоны" }, { k: "price", l: "Цена", ph: "3 500 ₽" }, { k: "duration", l: "Длительность", ph: "60 мин" }, { k: "photo_url", l: "Фото (URL)", ph: "https://..." }, { k: "description", l: "Описание", ph: "Необязательно" }].map(f => (
        <div key={f.k}>
          <label className="text-xs font-medium block mb-1" style={PS}>{f.l}</label>
          <input value={(form as any)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
            placeholder={f.ph} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inp} />
        </div>
      ))}
      {form.photo_url && <img src={form.photo_url} className="w-full h-36 object-cover rounded-xl" alt="preview" onError={e => (e.currentTarget.style.display = "none")} />}
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
        <button onClick={() => { resetForm(); setAdding(false); setEditing(null); }} className="px-4 py-3 rounded-xl text-sm" style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
          Отмена
        </button>
      </div>
    </div>
  );

  return (
    <div className="px-4 pb-6">
      <p className="text-xs mb-3" style={PS}>Услуги здесь отображаются клиентам в Прайс-листе</p>
      {!adding && !editing && (
        <button onClick={() => setAdding(true)} className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm" style={GRAD}>
          + Добавить услугу
        </button>
      )}
      {(adding || editing) && <FormBlock />}

      {loading && <div className="text-center py-8"><div className="text-3xl animate-float">🌸</div></div>}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="mb-4">
          <div className="px-3 py-1.5 rounded-xl mb-2 text-xs font-bold tracking-wide" style={{ ...GRAD, color: "white" }}>{cat}</div>
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
      ))}
      {!loading && items.length === 0 && <div className="text-center py-10 text-sm" style={PS}>Услуг пока нет — добавьте первую!</div>}
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
function ClientGalleryPage({ setPage }: { setPage: (p: Page) => void }) {
  const [folders, setFolders] = useState<any[]>([]);
  const [activeFolder, setActiveFolder] = useState<any | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  useEffect(() => {
    adminPost("gallery_folders").then(d => { setFolders(d.folders || []); setLoading(false); });
  }, []);

  const openFolder = (f: any) => {
    setActiveFolder(f); setPhotosLoading(true);
    adminPost("gallery", { folder_id: f.id }).then(d => { setPhotos(d.gallery || []); setPhotosLoading(false); });
  };

  if (fullscreen) return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setFullscreen(null)}>
      <img src={fullscreen} className="max-w-full max-h-full object-contain" alt="фото" />
      <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl">✕</button>
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
          <button onClick={() => setPage("home")} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
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
          <div className="grid grid-cols-2 gap-2">
            {photos.map(ph => (
              <button key={ph.id} onClick={() => setFullscreen(ph.url)} className="rounded-2xl overflow-hidden hover:scale-[1.02] transition-all">
                <img src={ph.url} alt={ph.title} className="w-full h-36 object-cover" />
                {ph.title && <div className="px-2 py-1.5 text-xs text-left" style={{ background: "hsl(335 80% 98%)", ...P }}>{ph.title}</div>}
              </button>
            ))}
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

// ── Настройки ──
function AdminSettings() {
  const SITE_URL = window.location.href;
  const [copied, setCopied] = useState(false);
  const [adminSection, setAdminSection] = useState<"main" | "profile" | "schedule">("main");
  const session = loadAdminSession();

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

// ─── НИЖНЯЯ НАВИГАЦИЯ ────────────────────────────────────────────────────────

function BottomNav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const items: { id: Page; icon: string; label: string }[] = [
    { id: "home", icon: "Home", label: "Главная" },
    { id: "gallery", icon: "Images", label: "Галерея" },
    { id: "booking", icon: "CalendarPlus", label: "Записаться" },
    { id: "reviews", icon: "Star", label: "Отзывы" },
    { id: "profile", icon: "User", label: "Профиль" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-2">
      <div className="rounded-3xl px-1 py-3 flex gap-0.5 shadow-lg"
        style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", border: "1px solid hsl(335 40% 88%)" }}>
        {items.map((item) => (
          <button key={item.id} onClick={() => setPage(item.id)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-2xl transition-all flex-1"
            style={page === item.id ? { background: "hsl(335 80% 60% / 0.12)" } : {}}>
            <Icon name={item.icon as any} size={18}
              style={{ color: page === item.id ? "hsl(335 80% 55%)" : "hsl(335 20% 65%)" }} />
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