/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Icon from "@/components/ui/icon";
import ReviewsPage from "./ReviewsPage";

const LOGO_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/14d6f8e1-0772-4340-a687-4fe03df40989.png";
const QR_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/2b4d4c5d-2ea0-4fb1-8548-564f4e7eb33c.png";
const SALON_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/files/890adaa5-bbaa-4546-9c4e-2406379ded6a.jpg";
const GALINA_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/8f8e57f4-caad-4931-8d8a-bea880feb389.jpg";

const AUTH_URL = "https://functions.poehali.dev/888bfad7-6580-4f39-b963-78aca5d4d8c0";
const CLIENTS_URL = "https://functions.poehali.dev/8e7601f2-57a9-4e42-982f-91f900c6831c";
const SEND_BOOKING_URL = "https://functions.poehali.dev/33731d63-c7a5-4a89-b075-6b0a4282ecfc";

type Page = "home" | "pricelist" | "masters" | "booking" | "profile" | "reviews" | "admin";

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

const masters = [
  { id: 1, name: "Галина Сиплатова", spec: "Косметолог-эстетист", rating: 5.0, reviews: 312, img: GALINA_IMG, tags: ["СМАС-лифтинг", "Биоревитализация", "РФ-лифтинг", "Криолиполиз"] },
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
  const [selectedServices, setSelectedServices] = useState<typeof services>([]);
  const [selectedMaster, setSelectedMaster] = useState<typeof masters[0] | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingDone, setBookingDone] = useState(false);

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
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(335 80% 80%), transparent 70%)" }} />
        <div className="absolute bottom-[-5%] left-[-5%] w-[350px] h-[350px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(315 70% 85%), transparent 70%)" }} />
      </div>

      <div className="relative z-10 pb-24">
        {page === "home" && <HomePage setPage={setPage} startBooking={startBooking} client={client} />}
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
        {page === "reviews" && <ReviewsPage />}
        {page === "admin" && <AdminPage onBack={() => setPage("home")} />}
      </div>

      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}

// ─── HOME ───────────────────────────────────────────────────────────────────

function HomePage({ setPage, startBooking, client }: { setPage: (p: Page) => void; startBooking: () => void; client: any }) {
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
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg cursor-pointer select-none"
            style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}
            onMouseDown={handleLogoPress} onMouseUp={handleLogoRelease} onMouseLeave={handleLogoRelease}
            onTouchStart={handleLogoPress} onTouchEnd={handleLogoRelease}>
            <img src={LOGO_IMG} alt="Girly Paradise" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", color: "hsl(335 80% 55%)", border: "1px solid hsl(335 80% 80%)" }}>
            <Icon name="MapPin" size={12} />
            <span>м. Парнас</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="text-4xl font-oswald font-bold leading-tight mb-3" style={{ color: "hsl(335 60% 30%)" }}>
            Запишись<br /><span className="gradient-text">в один клик</span>
          </h1>
          <button
            onClick={startBooking}
            className="w-full py-3.5 rounded-2xl font-semibold text-white text-base animate-pulse-glow shadow-lg"
            style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
            🌸 Записаться сейчас
          </button>
        </div>
      </div>

      {/* Популярные услуги */}
      <div className="px-4 mt-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-oswald font-semibold" style={{ color: "hsl(335 60% 30%)" }}>Популярные услуги</h2>
          <button onClick={() => setPage("pricelist")} className="text-sm font-medium" style={{ color: "hsl(335 80% 55%)" }}>Все →</button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {services.slice(0, 5).map((s, i) => (
            <div key={s.id} className="flex-shrink-0 w-36 card-glow rounded-2xl p-4 cursor-pointer" style={{ animationDelay: `${i * 0.1}s` }} onClick={startBooking}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                <Icon name={s.icon as any} size={18} className="text-white" />
              </div>
              <div className="text-sm font-medium leading-tight mb-2" style={{ color: "hsl(335 50% 30%)" }}>{s.name}</div>
              <div className="text-xs font-medium" style={{ color: "hsl(335 80% 55%)" }}>Уточнить цену</div>
            </div>
          ))}
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
                  <span className="text-xs" style={{ color: "hsl(335 20% 65%)" }}>({m.reviews})</span>
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
            { label: "Прайс-лист", sub: "Все услуги и цены", page: "pricelist" as Page, emoji: "💅" },
            { label: "Отзывы", sub: "Мнения клиентов", page: "reviews" as Page, emoji: "⭐" },
          ].map(item => (
            <button key={item.page} onClick={() => setPage(item.page)}
              className="card-glow rounded-2xl p-4 text-left hover:scale-105 transition-all">
              <div className="text-2xl mb-2">{item.emoji}</div>
              <div className="font-semibold text-sm mb-0.5" style={{ color: "hsl(335 50% 30%)" }}>{item.label}</div>
              <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>{item.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ВКонтакте */}
      <div className="px-4 mb-5">
        <div className="card-glow rounded-3xl p-5 text-center">
          <div className="font-oswald font-bold text-lg mb-1" style={{ color: "hsl(335 60% 30%)" }}>Мы ВКонтакте</div>
          <div className="text-xs mb-3" style={{ color: "hsl(335 30% 55%)" }}>Акции, новости и запись онлайн</div>
          <div className="flex justify-center mb-3">
            <div className="w-44 h-44 rounded-2xl overflow-hidden shadow-md border-2" style={{ borderColor: "hsl(335 50% 88%)" }}>
              <img src={QR_IMG} alt="QR-код группы ВКонтакте" className="w-full h-full object-cover" />
            </div>
          </div>
          <a href="https://vk.com/id903571459" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm shadow-md"
            style={{ background: "linear-gradient(135deg, #4c75a3, #5b8ec2)" }}>
            Открыть страницу
          </a>
        </div>
      </div>

      {/* Контакты */}
      <div className="px-4 mb-2">
        <div className="card-glow rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
              <img src={LOGO_IMG} alt="Girly Paradise" className="w-full h-full object-contain p-1 bg-white" />
            </div>
            <div>
              <h2 className="text-lg font-oswald font-semibold leading-tight" style={{ color: "hsl(335 60% 30%)" }}>Girly Paradise</h2>
              <p className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>Beauty Apartments ✨</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="tel:+79046015556" className="flex items-center gap-3 group flex-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(335 80% 60% / 0.12)", border: "1px solid hsl(335 80% 80%)" }}>
                <Icon name="Phone" size={18} style={{ color: "hsl(335 80% 55%)" }} />
              </div>
              <div>
                <div className="font-semibold group-hover:underline" style={{ color: "hsl(335 50% 30%)" }}>+7 (904) 601-55-56</div>
                <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>Нажми чтобы позвонить</div>
              </div>
            </a>
            <a href="https://wa.me/79046015556" target="_blank" rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
              style={{ background: "hsl(142 60% 45% / 0.15)", border: "1px solid hsl(142 60% 70%)" }}>
              <span style={{ fontSize: 18 }}>💬</span>
            </a>
          </div>
          <a href="https://yandex.ru/profile/46803820767?lang=ru" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "hsl(335 80% 60% / 0.12)", border: "1px solid hsl(335 80% 80%)" }}>
              <Icon name="MapPin" size={18} style={{ color: "hsl(335 80% 55%)" }} />
            </div>
            <div className="flex-1">
              <div className="font-semibold group-hover:underline" style={{ color: "hsl(335 50% 30%)" }}>ул. Заречная, 10</div>
              <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>Санкт-Петербург · м. Парнас · открыть на карте →</div>
            </div>
          </a>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "hsl(335 80% 60% / 0.12)", border: "1px solid hsl(335 80% 80%)" }}>
              <Icon name="Clock" size={18} style={{ color: "hsl(335 80% 55%)" }} />
            </div>
            <div>
              <div className="font-semibold" style={{ color: "hsl(335 50% 30%)" }}>Ежедневно: 11:00 – 20:00</div>
              <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>Без выходных</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ПРАЙС-ЛИСТ ─────────────────────────────────────────────────────────────

function PriceListPage({ setPage, startBooking }: { setPage: (p: Page) => void; startBooking: () => void }) {
  const [priceItems, setPriceItems] = useState<any[]>([]);
  const [priceLoaded, setPriceLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");

  if (!priceLoaded) {
    fetch("https://functions.poehali.dev/440815df-d73f-44e1-957c-6a718db23941/pricelist")
      .then(r => r.json())
      .then(d => { setPriceItems(d.services || []); setPriceLoaded(true); })
      .catch(() => setPriceLoaded(true));
  }

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
      <div className="px-4 pt-12 pb-3">
        <h1 className="text-3xl font-oswald font-bold mb-1" style={{ color: "hsl(335 60% 30%)" }}>Прайс-лист 💅</h1>
        <p className="text-sm mb-4" style={{ color: "hsl(335 30% 55%)" }}>Все услуги и цены</p>

        <div className="relative mb-3">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(335 50% 65%)" }} />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск услуги..."
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }} />
        </div>

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
                <div key={i} className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < items.length - 1 ? "1px solid hsl(335 30% 92%)" : "none" }}>
                  <div className="flex-1 text-sm pr-2" style={{ color: "hsl(335 50% 30%)" }}>{item.name}</div>
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

type Master = { id: number; name: string; spec: string; rating: number; reviews: number; img: string; tags: string[] };

function MastersPage({ masters: mList, setPage, startBooking }: { masters: Master[]; setPage: (p: Page) => void; startBooking: () => void }) {
  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-3xl font-oswald font-bold mb-1" style={{ color: "hsl(335 60% 30%)" }}>Мастера 🌸</h1>
        <p className="text-sm" style={{ color: "hsl(335 30% 55%)" }}>Профессионалы своего дела</p>
      </div>
      <div className="px-4 space-y-4">
        {mList.map((m, i) => (
          <div key={m.id} className="card-glow rounded-3xl overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="relative h-56 overflow-hidden">
              <img src={m.img} alt={m.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(255,220,230,0.1) 0%, rgba(255,240,245,0.92) 100%)" }} />
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
                    <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>{m.reviews} отзывов</div>
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

          <div className="card-glow rounded-2xl p-4 mb-6 space-y-3">
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

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md"
            style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
            🌸
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-oswald font-bold" style={{ color: "hsl(335 60% 30%)" }}>{client.name}</h2>
            <p className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>{client.phone}</p>
          </div>
          <button onClick={onLogout} className="px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: "hsl(335 20% 93%)", color: "hsl(335 40% 60%)" }}>
            Выйти
          </button>
        </div>

        <button onClick={() => setPage("booking")}
          className="w-full py-4 rounded-2xl font-semibold text-white shadow-lg mb-4"
          style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
          🌸 Записаться на услугу
        </button>

        <div className="card-glow rounded-2xl p-5 text-center">
          <div className="text-4xl mb-3">✨</div>
          <p className="font-semibold mb-1" style={{ color: "hsl(335 60% 30%)" }}>Ты в нашей базе!</p>
          <p className="text-sm" style={{ color: "hsl(335 30% 55%)" }}>Записывайся в один клик — твои данные уже сохранены</p>
        </div>
      </div>
    </div>
  );
}

// ─── АДМИН: КЛИЕНТСКАЯ БАЗА ─────────────────────────────────────────────────

function AdminPage({ onBack }: { onBack: () => void }) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useState(() => {
    fetch(CLIENTS_URL)
      .then(r => r.json())
      .then(d => { setClients(d.clients || []); setLoading(false); })
      .catch(() => setLoading(false));
  });

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
          <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
        </button>
        <div>
          <h1 className="text-xl font-oswald font-bold" style={{ color: "hsl(335 60% 30%)" }}>Клиентская база</h1>
          <p className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>{clients.length} клиентов</p>
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(335 50% 65%)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по имени или телефону..."
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }} />
        </div>
      </div>

      <div className="px-4 space-y-2 pb-6">
        {loading && (
          <div className="text-center py-12">
            <div className="text-3xl mb-3 animate-float">🌸</div>
            <p className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>Загружаем базу...</p>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-3">👤</div>
            <p style={{ color: "hsl(335 30% 65%)" }}>Нет клиентов</p>
          </div>
        )}
        {filtered.map((c, i) => (
          <div key={c.id} className="card-glow rounded-2xl p-4 animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
                {c.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate" style={{ color: "hsl(335 50% 30%)" }}>{c.name}</div>
                <a href={`tel:${c.phone}`} className="text-sm" style={{ color: "hsl(335 80% 55%)" }}>{c.phone}</a>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-medium" style={{ color: "hsl(335 50% 40%)" }}>{c.bookings_count} зап.</div>
                <div className="text-xs" style={{ color: "hsl(335 20% 65%)" }}>с {c.registered_at}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── НИЖНЯЯ НАВИГАЦИЯ ────────────────────────────────────────────────────────

function BottomNav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const items: { id: Page; icon: string; label: string }[] = [
    { id: "home", icon: "Home", label: "Главная" },
    { id: "pricelist", icon: "ClipboardList", label: "Прайс" },
    { id: "masters", icon: "Users", label: "Мастера" },
    { id: "booking", icon: "CalendarPlus", label: "Записаться" },
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