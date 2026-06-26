/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Icon from "@/components/ui/icon";
import ChatPage from "./ChatPage";
import PromotionsPage from "./PromotionsPage";
import GalleryPage from "./GalleryPage";
import ReviewsPage from "./ReviewsPage";

const HERO_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/files/4ca5a6ce-1c3c-4f87-8e7b-310455a10051.jpg";
const MASTER_IMG1 = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/files/e395c63f-3160-4bb4-8eb0-3f30851c376c.jpg";
const TEAM_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/files/04d60e29-907d-4125-ad17-d755f9dc780a.jpg";
const LOGO_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/91d2850b-d07b-4736-9ab4-23d3cca534fa.png";
const QR_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/2b4d4c5d-2ea0-4fb1-8548-564f4e7eb33c.png";

type Page = "home" | "services" | "masters" | "booking" | "profile" | "chat" | "promotions" | "gallery" | "reviews";

const services = [
  { id: 1, name: "Криолиполиз", category: "Тело", price: 0, duration: 60, icon: "Snowflake", color: "from-cyan-500 to-blue-600" },
  { id: 2, name: "Вакуумный массаж", category: "Тело", price: 0, duration: 60, icon: "Wind", color: "from-teal-500 to-cyan-600" },
  { id: 3, name: "СМАС-лифтинг", category: "Лицо", price: 0, duration: 90, icon: "Zap", color: "from-yellow-500 to-orange-500" },
  { id: 4, name: "Биоревитализация и мезо без иглы", category: "Лицо", price: 0, duration: 60, icon: "Droplets", color: "from-blue-500 to-indigo-600" },
  { id: 5, name: "Микроигольчатый РФ-лифтинг", category: "Лицо", price: 0, duration: 60, icon: "Sparkles", color: "from-fuchsia-500 to-pink-600" },
  { id: 6, name: "Увеличение губ без иглы", category: "Лицо", price: 0, duration: 45, icon: "Heart", color: "from-rose-500 to-pink-600" },
  { id: 7, name: "Уходовые процедуры по лицу", category: "Лицо", price: 0, duration: 60, icon: "Star", color: "from-pink-500 to-rose-600" },
  { id: 8, name: "СПА-программы", category: "Тело", price: 0, duration: 90, icon: "Flower", color: "from-purple-500 to-pink-600" },
  { id: 9, name: "Микронидлинг", category: "Лицо", price: 0, duration: 60, icon: "CircleDot", color: "from-indigo-500 to-purple-600" },
  { id: 10, name: "Липолитики", category: "Тело", price: 0, duration: 45, icon: "Flame", color: "from-orange-500 to-red-600" },
  { id: 11, name: "Волосы", category: "Волосы", price: 0, duration: 60, icon: "Scissors", color: "from-amber-500 to-yellow-600" },
  { id: 12, name: "РФ-лифтинг тело и лицо", category: "Лицо", price: 0, duration: 60, icon: "Waves", color: "from-violet-500 to-purple-600" },
];

const categories = ["Все", "Лицо", "Тело", "Волосы"];

const GALINA_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/8f8e57f4-caad-4931-8d8a-bea880feb389.jpg";

const masters = [
  { id: 1, name: "Галина Сиплатова", spec: "Косметолог-эстетист", rating: 5.0, reviews: 312, img: GALINA_IMG, tags: ["СМАС-лифтинг", "Биоревитализация", "РФ-лифтинг", "Криолиполиз"] },
];

const timeSlots = ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
const busySlots = ["10:00", "13:00", "15:00", "18:00"];

const myBookings = [
  { id: 1, service: "Чистка лица", master: "Галина Сиплатова", date: "15 мая 2026", time: "14:00", status: "upcoming", price: 3200 },
  { id: 2, service: "Массаж лица", master: "Галина Сиплатова", date: "28 апреля 2026", time: "11:00", status: "done", price: 2800 },
];

const weekDays = [
  { day: "Пн", date: 5 }, { day: "Вт", date: 6 }, { day: "Ср", date: 7 },
  { day: "Чт", date: 8 }, { day: "Пт", date: 9 }, { day: "Сб", date: 10 }, { day: "Вс", date: 11 },
];

export default function Index() {
  const [page, setPage] = useState<Page>("home");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [selectedService, setSelectedService] = useState<typeof services[0] | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<typeof masters[0] | null>(null);
  const [selectedDay, setSelectedDay] = useState(7);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingDone, setBookingDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServices = services.filter(s => {
    const matchCategory = activeCategory === "Все" || s.category === activeCategory;
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const startBooking = (service: typeof services[0]) => {
    setSelectedService(service);
    setBookingStep(1);
    setSelectedMaster(null);
    setSelectedDay(7);
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
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(335 80% 80%), transparent 70%)" }} />
        <div className="absolute bottom-[-5%] left-[-5%] w-[350px] h-[350px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(315 70% 85%), transparent 70%)" }} />
        <div className="absolute top-[50%] left-[20%] w-[200px] h-[200px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(350 90% 80%), transparent 70%)" }} />
        {/* Floating sparkles */}
        {["✦","✧","✦","✧","✦"].map((s, i) => (
          <div key={i} className="absolute text-pink-300 opacity-40 animate-float"
            style={{ left: `${10 + i * 20}%`, top: `${20 + (i % 3) * 25}%`, fontSize: 12 + (i % 3) * 6, animationDelay: `${i * 0.8}s` }}>
            {s}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 pb-24">
        {page === "home" && <HomePage setPage={setPage} startBooking={startBooking} />}
        {page === "services" && (
          <ServicesPage
            filteredServices={filteredServices}
            categories={categories}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            startBooking={startBooking}
          />
        )}
        {page === "masters" && <MastersPage masters={masters} setPage={setPage} />}
        {page === "booking" && (
          <BookingPage
            step={bookingStep}
            setStep={setBookingStep}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
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
          />
        )}
        {page === "profile" && <ProfilePage myBookings={myBookings} />}
        {page === "chat" && <ChatPage />}
        {page === "promotions" && <PromotionsPage onBook={() => setPage("booking")} />}
        {page === "gallery" && <GalleryPage />}
        {page === "reviews" && <ReviewsPage />}
      </div>

      {/* Bottom Nav */}
      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}

function HomePage({ setPage, startBooking }: { setPage: (p: Page) => void; startBooking: (s: typeof services[0]) => void }) {
  const CRYO_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/files/4ca5a6ce-1c3c-4f87-8e7b-310455a10051.jpg";
  const MASTER_CRYO_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/files/2c7a77fe-1082-4a71-841a-064e78bf562c.jpg";

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="relative h-[480px] overflow-hidden">
        <img src={CRYO_IMG} alt="Girly Paradise" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(255,220,230,0.2) 0%, rgba(255,182,193,0.3) 40%, rgba(255,240,245,0.95) 100%)"
        }} />
        {/* Sparkles overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {["✦","✧","✦","✧","✦","✧"].map((s, i) => (
            <div key={i} className="absolute text-pink-300 animate-float"
              style={{ left: `${5 + i * 17}%`, top: `${10 + (i % 3) * 20}%`, fontSize: 14 + (i % 3) * 6, opacity: 0.6, animationDelay: `${i * 0.6}s` }}>
              {s}
            </div>
          ))}
        </div>
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg"
            style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}>
            <img src={LOGO_IMG} alt="Girly Paradise" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", color: "hsl(335 80% 55%)", border: "1px solid hsl(335 80% 80%)" }}>
            <Icon name="MapPin" size={12} />
            <span>м. Парнас</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
            style={{ background: "hsl(335 80% 60% / 0.15)", border: "1px solid hsl(335 80% 60% / 0.3)", color: "hsl(335 80% 45%)" }}>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Свободные окна сегодня
          </div>
          <h1 className="text-4xl font-oswald font-bold leading-tight mb-2" style={{ color: "hsl(335 60% 30%)" }}>
            Запишись<br /><span className="gradient-text">в один клик</span>
          </h1>
          <p className="text-sm" style={{ color: "hsl(335 30% 55%)" }}>Лучшие мастера · Удобное время · Без звонков</p>
        </div>
      </div>

      {/* Master photo banner */}
      <div className="px-4 mb-6 -mt-2">
        <div className="card-glow rounded-3xl overflow-hidden relative">
          <img src={MASTER_CRYO_IMG} alt="Мастер за работой" className="w-full h-56 object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(255,240,245,0.9) 0%, transparent 50%)" }} />
          <div className="absolute top-3 right-3 text-2xl opacity-60">🌸</div>
          <div className="absolute top-3 left-3 text-xl opacity-50">✨</div>
        </div>
      </div>

      {/* Popular services */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-oswald font-semibold" style={{ color: "hsl(335 60% 30%)" }}>Популярные услуги</h2>
          <button onClick={() => setPage("services")} className="text-sm font-medium" style={{ color: "hsl(335 80% 55%)" }}>
            Все →
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {services.slice(0, 5).map((s, i) => (
            <div key={s.id}
              className="flex-shrink-0 w-36 card-glow rounded-2xl p-4 cursor-pointer"
              style={{ animationDelay: `${i * 0.1}s` }}
              onClick={() => startBooking(s)}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                <Icon name={s.icon as any} size={18} className="text-white" />
              </div>
              <div className="text-sm font-medium leading-tight mb-2" style={{ color: "hsl(335 50% 30%)" }}>{s.name}</div>
              <div className="text-xs font-medium" style={{ color: "hsl(335 80% 55%)" }}>{s.price > 0 ? `${s.price} ₽` : "Уточнить цену"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Masters */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-oswald font-semibold" style={{ color: "hsl(335 60% 30%)" }}>Наши мастера</h2>
          <button onClick={() => setPage("masters")} className="text-sm font-medium" style={{ color: "hsl(335 80% 55%)" }}>
            Все →
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {masters.map((m) => (
            <div key={m.id} className="flex-shrink-0 w-40 card-glow rounded-2xl overflow-hidden cursor-pointer">
              <div className="h-40 overflow-hidden relative">
                <img src={m.img} alt={m.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 text-sm">🌸</div>
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

      {/* Quick links */}
      <div className="px-4 mb-5">
        <h2 className="text-xl font-oswald font-semibold mb-3" style={{ color: "hsl(335 60% 30%)" }}>Разделы</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Акции", sub: "Скидки и спецпредложения", page: "promotions", emoji: "🎁" },
            { label: "Галерея", sub: "Результаты до и после", page: "gallery", emoji: "✨" },
            { label: "Отзывы", sub: "Мнения клиентов", page: "reviews", emoji: "⭐" },
            { label: "Написать нам", sub: "Ответим в чате", page: "chat", emoji: "💬" },
          ].map(item => (
            <button key={item.page} onClick={() => setPage(item.page as any)}
              className="card-glow rounded-2xl p-4 text-left hover:scale-105 transition-all">
              <div className="text-2xl mb-2">{item.emoji}</div>
              <div className="font-semibold text-sm mb-0.5" style={{ color: "hsl(335 50% 30%)" }}>{item.label}</div>
              <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>{item.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 mb-6">
        <button
          onClick={() => setPage("services")}
          className="w-full py-4 rounded-2xl font-semibold text-white text-lg animate-pulse-glow shadow-lg"
          style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
          🌸 Записаться сейчас
        </button>
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

      {/* Contacts */}
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

function ServicesPage({ filteredServices, categories, activeCategory, setActiveCategory, searchQuery, setSearchQuery, startBooking }: {
  filteredServices: typeof services;
  categories: string[];
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  startBooking: (s: typeof services[0]) => void;
}) {
  const [tab, setTab] = useState<"list" | "price">("list");
  const [priceItems, setPriceItems] = useState<any[]>([]);
  const [priceLoaded, setPriceLoaded] = useState(false);

  const loadPrice = () => {
    if (priceLoaded) return;
    fetch("https://functions.poehali.dev/440815df-d73f-44e1-957c-6a718db23941/pricelist")
      .then(r => r.json())
      .then(d => { setPriceItems(d.services || []); setPriceLoaded(true); });
  };

  // Группируем по категориям
  const grouped: Record<string, any[]> = {};
  priceItems.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-3xl font-oswald font-bold" style={{ color: "hsl(335 60% 30%)" }}>Услуги 🌸</h1>
          <a href="https://functions.poehali.dev/440815df-d73f-44e1-957c-6a718db23941/pricelist?format=csv"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "linear-gradient(135deg,#b8860b,#ffd700)", color: "#2d1015", boxShadow: "0 2px 8px rgba(255,215,0,0.3)" }}>
            <Icon name="Download" size={13} />
            Скачать прайс
          </a>
        </div>

        {/* Вкладки */}
        <div className="flex rounded-2xl overflow-hidden mb-4 mt-3" style={{ background: "hsl(335 30% 92%)" }}>
          <button onClick={() => setTab("list")} className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={tab === "list" ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" } : { color: "hsl(335 40% 60%)" }}>
            Записаться
          </button>
          <button onClick={() => { setTab("price"); loadPrice(); }} className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={tab === "price" ? { background: "linear-gradient(135deg,#b8860b,#ffd700)", color: "#2d1015" } : { color: "hsl(335 40% 60%)" }}>
            Прайс-лист
          </button>
        </div>

      </div>

      {/* ПРАЙС-ЛИСТ */}
      {tab === "price" && (
        <div className="px-4 pb-4">
          {!priceLoaded && <div className="text-center py-8 text-sm" style={{ color: "hsl(335 30% 60%)" }}>Загружаем прайс... 🌸</div>}
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
      )}

      {/* СПИСОК УСЛУГ */}
      {tab === "list" && (
        <>
          <div className="px-4 mb-3">
            <p className="text-sm mb-3" style={{ color: "hsl(335 30% 55%)" }}>Выбери что тебе нужно</p>
            <div className="relative mb-3">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(335 50% 65%)" }} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск услуги..."
                className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }} />
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {categories.map((cat) => (
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
          <div className="px-4 grid grid-cols-1 gap-3 pb-4">
            {filteredServices.map((s, i) => (
              <div key={s.id} className="card-glow rounded-2xl p-4 flex items-center gap-4 cursor-pointer animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s` }} onClick={() => startBooking(s)}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <Icon name={s.icon as any} size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium" style={{ color: "hsl(335 50% 30%)" }}>{s.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "hsl(335 30% 60%)" }}>{s.category} · {s.duration} мин</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold font-oswald text-lg" style={{ color: "hsl(335 80% 55%)" }}>{s.price > 0 ? `${s.price} ₽` : "Уточнить"}</div>
                  <div className="text-xs" style={{ color: "hsl(335 20% 65%)" }}>за сеанс</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type Master = { id: number; name: string; spec: string; rating: number; reviews: number; img: string; tags: string[] };

function MastersPage({ masters, setPage }: { masters: Master[]; setPage: (p: Page) => void }) {
  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-3xl font-oswald font-bold mb-1" style={{ color: "hsl(335 60% 30%)" }}>Мастера 🌸</h1>
        <p className="text-sm" style={{ color: "hsl(335 30% 55%)" }}>Профессионалы своего дела</p>
      </div>

      <div className="px-4 space-y-4">
        {masters.map((m: any, i: number) => (
          <div key={m.id} className="card-glow rounded-3xl overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="relative h-56 overflow-hidden">
              <img src={m.img} alt={m.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(to bottom, rgba(255,220,230,0.1) 0%, rgba(255,240,245,0.92) 100%)"
              }} />
              <div className="absolute top-3 right-3 text-2xl">✨</div>
              <div className="absolute top-3 left-3 text-xl">🌸</div>
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
                {m.tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "hsl(335 80% 60% / 0.1)", color: "hsl(335 80% 50%)", border: "1px solid hsl(335 80% 80%)" }}>
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setPage("services")}
                className="w-full py-3 rounded-xl font-semibold text-white shadow-md"
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

const SEND_BOOKING_URL = "https://functions.poehali.dev/33731d63-c7a5-4a89-b075-6b0a4282ecfc";

function BookingPage({ step, setStep, selectedService, setSelectedService, selectedMaster, setSelectedMaster,
  selectedDay, setSelectedDay, selectedTime, setSelectedTime, bookingDone,
  confirmBooking, services: svcList, masters: mstrList, weekDays: wDays, timeSlots: tSlots, busySlots: bSlots, setPage }: any) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!name || !phone) return;
    setLoading(true);
    setError("");
    try {
      const dayLabel = wDays.find((d: any) => d.date === selectedDay);
      await fetch(SEND_BOOKING_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          service: selectedService?.name,
          master: selectedMaster?.name || "Любой свободный",
          day: `${dayLabel?.day}, ${selectedDay} мая`,
          time: selectedTime,
          price: selectedService?.price,
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-scale-in">
        <div className="text-6xl mb-4 animate-float">🌸</div>
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
          <Icon name="Check" size={40} className="text-white" />
        </div>
        <h2 className="text-3xl font-oswald font-bold text-center mb-2" style={{ color: "hsl(335 60% 30%)" }}>Запись подтверждена!</h2>
        <p className="text-center mb-8" style={{ color: "hsl(335 30% 55%)" }}>Ждём тебя {wDays.find((d: any) => d.date === selectedDay)?.day} в {selectedTime} ✨</p>

        <div className="w-full card-glow rounded-3xl p-5 mb-6">
          <div className="space-y-3">
            {[
              { label: "Услуга", val: selectedService?.name },
              { label: "Мастер", val: selectedMaster?.name || "Любой свободный" },
              { label: "День", val: `${wDays.find((d: any) => d.date === selectedDay)?.day}, ${selectedDay} мая` },
              { label: "Время", val: selectedTime },
              { label: "Стоимость", val: selectedService?.price > 0 ? `${selectedService?.price} ₽` : "Уточнить" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>{item.label}</span>
                <span className="font-medium text-sm" style={{ color: "hsl(335 50% 30%)" }}>{item.val}</span>
              </div>
            ))}
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
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => step === 1 ? setPage("services") : setStep(step - 1)}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "hsl(335 50% 92%)", border: "1px solid hsl(335 50% 82%)" }}>
          <Icon name="ChevronLeft" size={20} style={{ color: "hsl(335 60% 40%)" }} />
        </button>
        <div>
          <h1 className="text-xl font-oswald font-bold" style={{ color: "hsl(335 60% 30%)" }}>Запись на услугу</h1>
          <p className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>Шаг {step} из 3</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-6">
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-1.5 rounded-full transition-all duration-500"
              style={{ background: s <= step ? "linear-gradient(90deg, hsl(335 80% 60%), hsl(315 70% 65%))" : "hsl(335 30% 90%)" }} />
          ))}
        </div>
      </div>

      {/* Step 1: Choose service */}
      {step === 1 && (
        <div className="px-4 animate-slide-up">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "hsl(335 60% 30%)" }}>Выбери услугу</h2>
          {selectedService && (
            <div className="card-glow rounded-2xl p-4 mb-4 flex items-center gap-3"
              style={{ borderColor: "hsl(335 80% 70%)" }}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedService.color} flex items-center justify-center`}>
                <Icon name={selectedService.icon as any} size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm" style={{ color: "hsl(335 50% 30%)" }}>{selectedService.name}</div>
                <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>{selectedService.price > 0 ? `${selectedService.price} ₽ · ` : ""}{selectedService.duration} мин</div>
              </div>
              <Icon name="CheckCircle" size={20} style={{ color: "hsl(335 80% 55%)" }} />
            </div>
          )}
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
            {svcList.map((s: any) => (
              <div key={s.id}
                className="card-glow rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all"
                style={selectedService?.id === s.id ? { borderColor: "hsl(335 80% 70%)", background: "hsl(335 80% 60% / 0.05)" } : {}}
                onClick={() => setSelectedService(s)}>
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon name={s.icon as any} size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "hsl(335 50% 30%)" }}>{s.name}</div>
                  <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>{s.duration} мин</div>
                </div>
                <div className="text-sm font-bold" style={{ color: "hsl(335 80% 55%)" }}>{s.price > 0 ? `${s.price} ₽` : "Уточнить"}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => selectedService && setStep(2)}
            disabled={!selectedService}
            className="mt-4 w-full py-4 rounded-2xl font-semibold text-white transition-all shadow-md"
            style={selectedService
              ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }
              : { background: "hsl(335 20% 90%)", color: "hsl(335 20% 65%)" }}>
            Далее →
          </button>
        </div>
      )}

      {/* Step 2: Choose master & time */}
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
                    style={selectedMaster?.id === m.id
                      ? { outline: "3px solid hsl(335 80% 58%)", outlineOffset: "2px" }
                      : { opacity: 0.7 }} />
                  {selectedMaster?.id === m.id && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "hsl(335 80% 58%)" }}>
                      <Icon name="Check" size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-center w-16 truncate" style={{ color: "hsl(335 30% 60%)" }}>{m.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>

          <p className="text-xs mb-2 uppercase tracking-wider font-medium" style={{ color: "hsl(335 40% 60%)" }}>День</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4">
            {wDays.map((d: any) => (
              <button key={d.date} onClick={() => setSelectedDay(d.date)}
                className="flex-shrink-0 w-12 py-3 rounded-2xl text-center transition-all"
                style={selectedDay === d.date
                  ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" }
                  : { background: "white", color: "hsl(335 40% 55%)", border: "1px solid hsl(335 40% 88%)" }}>
                <div className="text-xs opacity-70">{d.day}</div>
                <div className="text-lg font-bold font-oswald">{d.date}</div>
              </button>
            ))}
          </div>

          <p className="text-xs mb-2 uppercase tracking-wider font-medium" style={{ color: "hsl(335 40% 60%)" }}>Время</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {tSlots.map((t: string) => {
              const busy = bSlots.includes(t);
              return (
                <button key={t} onClick={() => !busy && setSelectedTime(t)} disabled={busy}
                  className="py-2 rounded-xl text-sm font-medium transition-all"
                  style={busy
                    ? { background: "hsl(335 20% 94%)", color: "hsl(335 20% 75%)", textDecoration: "line-through" }
                    : selectedTime === t
                      ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" }
                      : { background: "white", color: "hsl(335 50% 45%)", border: "1px solid hsl(335 40% 85%)" }
                  }>
                  {t}
                </button>
              );
            })}
          </div>

          <button onClick={() => selectedTime && setStep(3)} disabled={!selectedTime}
            className="w-full py-4 rounded-2xl font-semibold text-white transition-all shadow-md"
            style={selectedTime
              ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }
              : { background: "hsl(335 20% 90%)", color: "hsl(335 20% 65%)" }}>
            Далее →
          </button>
        </div>
      )}

      {/* Step 3: Contact details */}
      {step === 3 && (
        <div className="px-4 animate-slide-up">
          <h2 className="text-lg font-semibold mb-2" style={{ color: "hsl(335 60% 30%)" }}>Ваши данные</h2>
          <p className="text-sm mb-6" style={{ color: "hsl(335 30% 60%)" }}>Для подтверждения записи</p>

          <div className="card-glow rounded-2xl p-4 mb-6">
            <div className="space-y-2">
              {[
                { label: "Услуга", val: selectedService?.name },
                { label: "Мастер", val: selectedMaster?.name || "Любой свободный" },
                { label: "День", val: `${wDays.find((d: any) => d.date === selectedDay)?.day}, ${selectedDay} мая` },
                { label: "Время", val: selectedTime },
                { label: "Стоимость", val: selectedService?.price > 0 ? `${selectedService?.price} ₽` : "Уточнить" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>{item.label}</span>
                  <span className="text-sm font-medium" style={{ color: "hsl(335 50% 30%)" }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div>
              <label className="text-xs mb-1 block uppercase tracking-wider font-medium" style={{ color: "hsl(335 40% 60%)" }}>Ваше имя</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Введите имя"
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }} />
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-wider font-medium" style={{ color: "hsl(335 40% 60%)" }}>Телефон</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 000-00-00" type="tel"
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }} />
            </div>
            <div>
              <label className="text-xs mb-1 block uppercase tracking-wider font-medium" style={{ color: "hsl(335 40% 60%)" }}>Email для подтверждения</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" type="email"
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{ background: "white", border: "1px solid hsl(335 50% 85%)", color: "hsl(335 50% 30%)" }} />
            </div>
          </div>

          {/* Предоплата */}
          <div className="card-glow rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="CreditCard" size={16} style={{ color: "hsl(335 80% 55%)" }} />
              <span className="text-sm font-semibold" style={{ color: "hsl(335 50% 30%)" }}>Предоплата (необязательно)</span>
            </div>
            <p className="text-xs mb-3" style={{ color: "hsl(335 30% 60%)" }}>Внесите предоплату для гарантии записи. Оставшаяся сумма — на месте.</p>
            <div className="grid grid-cols-3 gap-2">
              {[0, 500, 1000].map(amt => (
                <button key={amt} type="button"
                  className="py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "hsl(335 30% 95%)", color: "hsl(335 50% 45%)", border: "1px solid hsl(335 40% 85%)" }}>
                  {amt === 0 ? "Без предоплаты" : `${amt} ₽`}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: "hsl(335 30% 65%)" }}>Реквизиты для перевода уточните в чате или по телефону</p>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mb-3">{error}</p>
          )}
          <button onClick={handleConfirm} disabled={!name || !phone || loading}
            className="w-full py-4 rounded-2xl font-semibold text-white text-lg transition-all flex items-center justify-center gap-2 shadow-md"
            style={name && phone && !loading
              ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }
              : { background: "hsl(335 20% 90%)", color: "hsl(335 20% 65%)" }}>
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Отправляем...
              </>
            ) : "🌸 Подтвердить запись"}
          </button>
          <p className="text-center text-xs mt-3" style={{ color: "hsl(335 20% 70%)" }}>Нажимая кнопку, вы соглашаетесь с условиями</p>
        </div>
      )}
    </div>
  );
}

function ProfilePage({ myBookings }: { myBookings: any[] }) {
  const [tab, setTab] = useState<"upcoming" | "done">("upcoming");
  const filtered = myBookings.filter((b: any) => b.status === tab);

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md"
            style={{ background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))" }}>
            🌸
          </div>
          <div>
            <h2 className="text-xl font-oswald font-bold" style={{ color: "hsl(335 60% 30%)" }}>Анна Иванова</h2>
            <p className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>+7 (999) 123-45-67</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { val: "3", label: "Записей" },
            { val: "7500 ₽", label: "Потрачено" },
            { val: "4.8★", label: "Мой рейтинг" },
          ].map((item) => (
            <div key={item.label} className="card-glow rounded-2xl p-3 text-center">
              <div className="text-lg font-bold font-oswald" style={{ color: "hsl(335 80% 55%)" }}>{item.val}</div>
              <div className="text-xs" style={{ color: "hsl(335 30% 60%)" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="flex rounded-2xl overflow-hidden" style={{ background: "hsl(335 30% 92%)" }}>
          <button onClick={() => setTab("upcoming")}
            className="flex-1 py-3 text-sm font-medium transition-all"
            style={tab === "upcoming"
              ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" }
              : { color: "hsl(335 40% 60%)" }}>
            Предстоящие
          </button>
          <button onClick={() => setTab("done")}
            className="flex-1 py-3 text-sm font-medium transition-all"
            style={tab === "done"
              ? { background: "linear-gradient(135deg, hsl(335 80% 58%), hsl(315 70% 65%))", color: "white" }
              : { color: "hsl(335 40% 60%)" }}>
            История
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🌸</div>
            <p style={{ color: "hsl(335 30% 65%)" }}>Нет записей</p>
          </div>
        )}
        {filtered.map((b: any, i: number) => (
          <div key={b.id} className="card-glow rounded-2xl p-4 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold" style={{ color: "hsl(335 50% 30%)" }}>{b.service}</h3>
                <p className="text-sm" style={{ color: "hsl(335 30% 60%)" }}>{b.master}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium"
                style={b.status === "upcoming"
                  ? { background: "hsl(335 80% 60% / 0.12)", color: "hsl(335 80% 50%)", border: "1px solid hsl(335 80% 80%)" }
                  : { background: "hsl(335 20% 93%)", color: "hsl(335 30% 65%)" }}>
                {b.status === "upcoming" ? "Скоро" : "Завершено"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm" style={{ color: "hsl(335 30% 60%)" }}>
                <span className="flex items-center gap-1">
                  <Icon name="Calendar" size={13} />
                  {b.date}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="Clock" size={13} />
                  {b.time}
                </span>
              </div>
              <span className="font-bold font-oswald" style={{ color: "hsl(335 80% 55%)" }}>{b.price} ₽</span>
            </div>
            {b.status === "upcoming" && (
              <button className="mt-3 w-full py-2 rounded-xl text-sm transition-all"
                style={{ border: "1px solid hsl(335 40% 85%)", color: "hsl(335 40% 65%)" }}>
                Отменить запись
              </button>
            )}
            {b.status === "done" && (
              <button className="mt-3 w-full py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "hsl(335 80% 60% / 0.08)", color: "hsl(335 80% 55%)", border: "1px solid hsl(335 80% 82%)" }}>
                ★ Оставить отзыв
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BottomNav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const items: { id: Page; icon: string; label: string }[] = [
    { id: "home", icon: "Home", label: "Главная" },
    { id: "services", icon: "Sparkles", label: "Услуги" },
    { id: "promotions", icon: "Tag", label: "Акции" },
    { id: "gallery", icon: "Images", label: "Галерея" },
    { id: "reviews", icon: "Star", label: "Отзывы" },
    { id: "chat", icon: "MessageCircle", label: "Чат" },
    { id: "booking", icon: "CalendarPlus", label: "Записаться" },
    { id: "masters", icon: "Users", label: "Мастера" },
    { id: "profile", icon: "User", label: "Профиль" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-2">
      <div className="rounded-3xl px-1 py-3 flex gap-0.5 overflow-x-auto scrollbar-hide shadow-lg"
        style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", border: "1px solid hsl(335 40% 88%)" }}>
        {items.map((item) => (
          <button key={item.id} onClick={() => setPage(item.id as Page)}
            className="flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-2xl transition-all flex-shrink-0"
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