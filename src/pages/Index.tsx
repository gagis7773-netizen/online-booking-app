/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Icon from "@/components/ui/icon";

const HERO_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/files/6b57d904-553a-4a99-8cb9-fe605cdc050f.jpg";
const MASTER_IMG1 = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/files/e395c63f-3160-4bb4-8eb0-3f30851c376c.jpg";
const TEAM_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/files/04d60e29-907d-4125-ad17-d755f9dc780a.jpg";
const LOGO_IMG = "https://cdn.poehali.dev/projects/5f8fa1c3-7bb5-4e9b-a111-7b9182713699/bucket/91d2850b-d07b-4736-9ab4-23d3cca534fa.png";

type Page = "home" | "services" | "masters" | "booking" | "profile";

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
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(315 100% 60%), transparent 70%)" }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, hsl(270 100% 65%), transparent 70%)" }} />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, hsl(185 100% 55%), transparent 70%)" }} />
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
      </div>

      {/* Bottom Nav */}
      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}

function HomePage({ setPage, startBooking }: { setPage: (p: Page) => void; startBooking: (s: typeof services[0]) => void }) {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="relative h-[420px] overflow-hidden">
        <img src={HERO_IMG} alt="hero" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(15,15,25,0.3) 0%, rgba(15,15,25,0.7) 60%, rgba(15,15,25,1) 100%)"
        }} />
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)" }}>
            <img src={LOGO_IMG} alt="Girly Paradise" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-white/80 text-xs"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}>
            <Icon name="MapPin" size={12} />
            <span>м. Парнас</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
            style={{ background: "hsl(315 100% 60% / 0.2)", border: "1px solid hsl(315 100% 60% / 0.4)", color: "hsl(315 100% 75%)" }}>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Свободные окна сегодня
          </div>
          <h1 className="text-4xl font-oswald font-bold text-white leading-tight mb-2">
            Запишись<br /><span className="gradient-text">в один клик</span>
          </h1>
          <p className="text-white/60 text-sm">Лучшие мастера · Удобное время · Без звонков</p>
        </div>
      </div>

      {/* Popular services */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-oswald font-semibold text-white">Популярные услуги</h2>
          <button onClick={() => setPage("services")} className="text-sm" style={{ color: "hsl(315 100% 65%)" }}>
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
              <div className="text-sm font-medium text-white leading-tight mb-2">{s.name}</div>
              <div className="text-xs" style={{ color: "hsl(315 100% 65%)" }}>{s.price > 0 ? `${s.price} ₽` : "Уточнить цену"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Masters */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-oswald font-semibold text-white">Наши мастера</h2>
          <button onClick={() => setPage("masters")} className="text-sm" style={{ color: "hsl(315 100% 65%)" }}>
            Все →
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {masters.map((m) => (
            <div key={m.id} className="flex-shrink-0 w-40 card-glow rounded-2xl overflow-hidden cursor-pointer">
              <div className="h-40 overflow-hidden">
                <img src={m.img} alt={m.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold text-white truncate">{m.name}</div>
                <div className="text-xs text-white/50 mb-2 truncate">{m.spec}</div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400 text-xs">★</span>
                  <span className="text-xs text-white/70">{m.rating}</span>
                  <span className="text-xs text-white/30">({m.reviews})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 mb-6">
        <button
          onClick={() => setPage("services")}
          className="w-full py-4 rounded-2xl font-semibold text-white text-lg animate-pulse-glow"
          style={{ background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))" }}>
          Записаться сейчас
        </button>
      </div>

      {/* Contacts */}
      <div className="px-4 mb-2">
        <div className="card-glow rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
              style={{ background: "white" }}>
              <img src={LOGO_IMG} alt="Girly Paradise" className="w-full h-full object-contain p-1" />
            </div>
            <div>
              <h2 className="text-lg font-oswald font-semibold text-white leading-tight">Girly Paradise</h2>
              <p className="text-white/40 text-xs">Beauty Apartments</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="tel:+79046015556" className="flex items-center gap-3 group flex-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(315 100% 60% / 0.15)" }}>
                <Icon name="Phone" size={18} style={{ color: "hsl(315 100% 65%)" }} />
              </div>
              <div>
                <div className="text-white font-semibold group-hover:underline">+7 (904) 601-55-56</div>
                <div className="text-white/40 text-xs">Нажми чтобы позвонить</div>
              </div>
            </a>
            <a href="https://wa.me/79046015556" target="_blank" rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
              style={{ background: "hsl(142 70% 40% / 0.2)", border: "1px solid hsl(142 70% 40% / 0.3)" }}>
              <span style={{ fontSize: 18 }}>💬</span>
            </a>
          </div>
          <a href="https://yandex.ru/profile/46803820767?lang=ru" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "hsl(270 100% 65% / 0.15)" }}>
              <Icon name="MapPin" size={18} style={{ color: "hsl(270 100% 70%)" }} />
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold group-hover:underline">ул. Заречная, 10</div>
              <div className="text-white/40 text-xs">Санкт-Петербург · м. Парнас · открыть на карте →</div>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "hsl(185 100% 55% / 0.15)" }}>
              <Icon name="Clock" size={18} style={{ color: "hsl(185 100% 60%)" }} />
            </div>
            <div>
              <div className="text-white font-semibold">Ежедневно: 11:00 – 20:00</div>
              <div className="text-white/40 text-xs">Без выходных</div>
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
  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-3xl font-oswald font-bold text-white mb-1">Услуги</h1>
        <p className="text-white/50 text-sm mb-4">Выбери что тебе нужно</p>

        {/* Search */}
        <div className="relative mb-4">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск услуги..."
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
            style={{ background: "hsl(240 8% 12%)", border: "1px solid hsl(240 8% 20%)" }}
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={activeCategory === cat
                ? { background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))", color: "white" }
                : { background: "hsl(240 8% 12%)", color: "hsl(0 0% 60%)", border: "1px solid hsl(240 8% 20%)" }
              }>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 grid grid-cols-1 gap-3">
        {filteredServices.map((s, i) => (
          <div
            key={s.id}
            className="card-glow rounded-2xl p-4 flex items-center gap-4 cursor-pointer animate-slide-up"
            style={{ animationDelay: `${i * 0.05}s` }}
            onClick={() => startBooking(s)}>
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
              <Icon name={s.icon as any} size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium">{s.name}</div>
              <div className="text-white/40 text-xs mt-0.5">{s.category} · {s.duration} мин</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-bold font-oswald text-lg" style={{ color: "hsl(315 100% 65%)" }}>{s.price > 0 ? `${s.price} ₽` : "Уточнить"}</div>
              <div className="text-xs text-white/30">за сеанс</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Master = { id: number; name: string; spec: string; rating: number; reviews: number; img: string; tags: string[] };

function MastersPage({ masters, setPage }: { masters: Master[]; setPage: (p: Page) => void }) {
  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-12 pb-6">
        <h1 className="text-3xl font-oswald font-bold text-white mb-1">Мастера</h1>
        <p className="text-white/50 text-sm">Профессионалы своего дела</p>
      </div>

      <div className="px-4 space-y-4">
        {masters.map((m: any, i: number) => (
          <div key={m.id} className="card-glow rounded-3xl overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="relative h-48 overflow-hidden">
              <img src={m.img} alt={m.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(to bottom, transparent 40%, rgba(15,15,25,0.95) 100%)"
              }} />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-xl font-oswald font-bold text-white">{m.name}</h3>
                    <p className="text-white/60 text-sm">{m.spec}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-yellow-400">★</span>
                      <span className="text-white font-bold">{m.rating}</span>
                    </div>
                    <div className="text-white/40 text-xs">{m.reviews} отзывов</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {m.tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-xs"
                    style={{ background: "hsl(315 100% 60% / 0.15)", color: "hsl(315 100% 70%)", border: "1px solid hsl(315 100% 60% / 0.3)" }}>
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setPage("services")}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))" }}>
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
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-float"
          style={{ background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))" }}>
          <Icon name="Check" size={40} className="text-white" />
        </div>
        <h2 className="text-3xl font-oswald font-bold text-white text-center mb-2">Запись подтверждена!</h2>
        <p className="text-white/50 text-center mb-8">Ждём тебя {wDays.find((d: any) => d.date === selectedDay)?.day} в {selectedTime}</p>

        <div className="w-full card-glow rounded-3xl p-5 mb-6">
          <div className="space-y-3">
            {[
              { label: "Услуга", val: selectedService?.name },
              { label: "Мастер", val: selectedMaster?.name || "Любой свободный" },
              { label: "День", val: `${wDays.find((d: any) => d.date === selectedDay)?.day}, ${selectedDay} мая` },
              { label: "Время", val: selectedTime },
              { label: "Стоимость", val: `${selectedService?.price} ₽` },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-white/40 text-sm">{item.label}</span>
                <span className="text-white font-medium text-sm">{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => setPage("home")} className="w-full py-4 rounded-2xl font-semibold text-white"
          style={{ background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))" }}>
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
          style={{ background: "hsl(240 8% 15%)" }}>
          <Icon name="ChevronLeft" size={20} className="text-white" />
        </button>
        <div>
          <h1 className="text-xl font-oswald font-bold text-white">Запись на услугу</h1>
          <p className="text-white/40 text-xs">Шаг {step} из 3</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-6">
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-1 rounded-full transition-all duration-500"
              style={{ background: s <= step ? "linear-gradient(90deg, hsl(315 100% 60%), hsl(270 100% 65%))" : "hsl(240 8% 20%)" }} />
          ))}
        </div>
      </div>

      {/* Step 1: Choose service */}
      {step === 1 && (
        <div className="px-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-white mb-4">Выбери услугу</h2>
          {selectedService && (
            <div className="card-glow rounded-2xl p-4 mb-4 flex items-center gap-3"
              style={{ borderColor: "hsl(315 100% 60% / 0.5)" }}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedService.color} flex items-center justify-center`}>
                <Icon name={selectedService.icon as any} size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-white font-medium text-sm">{selectedService.name}</div>
                <div className="text-white/40 text-xs">{selectedService.price} ₽ · {selectedService.duration} мин</div>
              </div>
              <Icon name="CheckCircle" size={20} style={{ color: "hsl(315 100% 65%)" }} />
            </div>
          )}
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
            {svcList.map((s: any) => (
              <div key={s.id}
                className="card-glow rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all"
                style={selectedService?.id === s.id ? { borderColor: "hsl(315 100% 60% / 0.5)", background: "hsl(315 100% 60% / 0.05)" } : {}}
                onClick={() => setSelectedService(s)}>
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon name={s.icon as any} size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{s.name}</div>
                  <div className="text-white/40 text-xs">{s.duration} мин</div>
                </div>
                <div className="text-sm font-bold" style={{ color: "hsl(315 100% 65%)" }}>{s.price} ₽</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => selectedService && setStep(2)}
            disabled={!selectedService}
            className="mt-4 w-full py-4 rounded-2xl font-semibold text-white transition-all"
            style={selectedService
              ? { background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))" }
              : { background: "hsl(240 8% 20%)", color: "hsl(0 0% 40%)" }}>
            Далее →
          </button>
        </div>
      )}

      {/* Step 2: Choose master & time */}
      {step === 2 && (
        <div className="px-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-white mb-4">Мастер и время</h2>

          <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Мастер</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-3 mb-4">
            <div onClick={() => setSelectedMaster(null)} className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer">
              <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                style={!selectedMaster
                  ? { background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))", boxShadow: "0 0 20px hsl(315 100% 60% / 0.4)" }
                  : { background: "hsl(240 8% 18%)" }}>
                <Icon name="Users" size={20} className="text-white" />
              </div>
              <span className="text-xs text-white/60">Любой</span>
            </div>
            {mstrList.map((m: any) => (
              <div key={m.id} onClick={() => setSelectedMaster(m)} className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer">
                <div className="relative">
                  <img src={m.img} alt={m.name} className="w-14 h-14 rounded-full object-cover transition-all"
                    style={selectedMaster?.id === m.id
                      ? { outline: "3px solid hsl(315 100% 60%)", outlineOffset: "2px" }
                      : { opacity: 0.6 }} />
                  {selectedMaster?.id === m.id && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "hsl(315 100% 55%)" }}>
                      <Icon name="Check" size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-white/60 text-center w-16 truncate">{m.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>

          <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">День</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4">
            {wDays.map((d: any) => (
              <button key={d.date} onClick={() => setSelectedDay(d.date)}
                className="flex-shrink-0 w-12 py-3 rounded-2xl text-center transition-all"
                style={selectedDay === d.date
                  ? { background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))", color: "white" }
                  : { background: "hsl(240 8% 12%)", color: "hsl(0 0% 60%)" }}>
                <div className="text-xs opacity-70">{d.day}</div>
                <div className="text-lg font-bold font-oswald">{d.date}</div>
              </button>
            ))}
          </div>

          <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Время</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {tSlots.map((t: string) => {
              const busy = bSlots.includes(t);
              return (
                <button key={t} onClick={() => !busy && setSelectedTime(t)} disabled={busy}
                  className="py-2 rounded-xl text-sm font-medium transition-all"
                  style={busy
                    ? { background: "hsl(240 8% 12%)", color: "hsl(0 0% 30%)", textDecoration: "line-through" }
                    : selectedTime === t
                      ? { background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))", color: "white" }
                      : { background: "hsl(240 8% 15%)", color: "white", border: "1px solid hsl(240 8% 22%)" }
                  }>
                  {t}
                </button>
              );
            })}
          </div>

          <button onClick={() => selectedTime && setStep(3)} disabled={!selectedTime}
            className="w-full py-4 rounded-2xl font-semibold text-white transition-all"
            style={selectedTime
              ? { background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))" }
              : { background: "hsl(240 8% 20%)", color: "hsl(0 0% 40%)" }}>
            Далее →
          </button>
        </div>
      )}

      {/* Step 3: Contact details */}
      {step === 3 && (
        <div className="px-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-white mb-2">Ваши данные</h2>
          <p className="text-white/40 text-sm mb-6">Для подтверждения записи</p>

          <div className="card-glow rounded-2xl p-4 mb-6">
            <div className="space-y-2">
              {[
                { label: "Услуга", val: selectedService?.name },
                { label: "Мастер", val: selectedMaster?.name || "Любой свободный" },
                { label: "День", val: `${wDays.find((d: any) => d.date === selectedDay)?.day}, ${selectedDay} мая` },
                { label: "Время", val: selectedTime },
                { label: "Стоимость", val: `${selectedService?.price} ₽` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-white/40 text-sm">{item.label}</span>
                  <span className="text-white text-sm font-medium">{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div>
              <label className="text-white/50 text-xs mb-1 block uppercase tracking-wider">Ваше имя</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Введите имя"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/20 outline-none"
                style={{ background: "hsl(240 8% 12%)", border: "1px solid hsl(240 8% 20%)" }} />
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block uppercase tracking-wider">Телефон</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 000-00-00" type="tel"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/20 outline-none"
                style={{ background: "hsl(240 8% 12%)", border: "1px solid hsl(240 8% 20%)" }} />
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block uppercase tracking-wider">Email для подтверждения</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" type="email"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/20 outline-none"
                style={{ background: "hsl(240 8% 12%)", border: "1px solid hsl(240 8% 20%)" }} />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center mb-3">{error}</p>
          )}
          <button onClick={handleConfirm} disabled={!name || !phone || loading}
            className="w-full py-4 rounded-2xl font-semibold text-white text-lg transition-all flex items-center justify-center gap-2"
            style={name && phone && !loading
              ? { background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))" }
              : { background: "hsl(240 8% 20%)", color: "hsl(0 0% 40%)" }}>
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Отправляем...
              </>
            ) : "Подтвердить запись"}
          </button>
          <p className="text-center text-white/20 text-xs mt-3">Нажимая кнопку, вы соглашаетесь с условиями</p>
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
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))" }}>
            А
          </div>
          <div>
            <h2 className="text-xl font-oswald font-bold text-white">Анна Иванова</h2>
            <p className="text-white/40 text-sm">+7 (999) 123-45-67</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { val: "3", label: "Записей" },
            { val: "7500 ₽", label: "Потрачено" },
            { val: "4.8★", label: "Мой рейтинг" },
          ].map((item) => (
            <div key={item.label} className="card-glow rounded-2xl p-3 text-center">
              <div className="text-lg font-bold font-oswald" style={{ color: "hsl(315 100% 65%)" }}>{item.val}</div>
              <div className="text-xs text-white/40">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="flex rounded-2xl overflow-hidden" style={{ background: "hsl(240 8% 12%)" }}>
          <button onClick={() => setTab("upcoming")}
            className="flex-1 py-3 text-sm font-medium transition-all"
            style={tab === "upcoming"
              ? { background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))", color: "white" }
              : { color: "hsl(0 0% 50%)" }}>
            Предстоящие
          </button>
          <button onClick={() => setTab("done")}
            className="flex-1 py-3 text-sm font-medium transition-all"
            style={tab === "done"
              ? { background: "linear-gradient(135deg, hsl(315 100% 55%), hsl(270 100% 60%))", color: "white" }
              : { color: "hsl(0 0% 50%)" }}>
            История
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-white/30">Нет записей</p>
          </div>
        )}
        {filtered.map((b: any, i: number) => (
          <div key={b.id} className="card-glow rounded-2xl p-4 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-white font-semibold">{b.service}</h3>
                <p className="text-white/40 text-sm">{b.master}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium"
                style={b.status === "upcoming"
                  ? { background: "hsl(315 100% 60% / 0.15)", color: "hsl(315 100% 70%)" }
                  : { background: "hsl(240 8% 20%)", color: "hsl(0 0% 50%)" }}>
                {b.status === "upcoming" ? "Скоро" : "Завершено"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white/40 text-sm">
                <span className="flex items-center gap-1">
                  <Icon name="Calendar" size={13} />
                  {b.date}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="Clock" size={13} />
                  {b.time}
                </span>
              </div>
              <span className="font-bold font-oswald" style={{ color: "hsl(315 100% 65%)" }}>{b.price} ₽</span>
            </div>
            {b.status === "upcoming" && (
              <button className="mt-3 w-full py-2 rounded-xl text-sm text-white/50 transition-all"
                style={{ border: "1px solid hsl(240 8% 22%)" }}>
                Отменить запись
              </button>
            )}
            {b.status === "done" && (
              <button className="mt-3 w-full py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "hsl(315 100% 60% / 0.1)", color: "hsl(315 100% 70%)", border: "1px solid hsl(315 100% 60% / 0.2)" }}>
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
    { id: "masters", icon: "Users", label: "Мастера" },
    { id: "booking", icon: "CalendarPlus", label: "Записаться" },
    { id: "profile", icon: "User", label: "Профиль" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-2">
      <div className="rounded-3xl px-2 py-3 flex justify-around"
        style={{ background: "hsl(240 8% 10% / 0.95)", backdropFilter: "blur(20px)", border: "1px solid hsl(240 8% 18%)" }}>
        {items.map((item) => (
          <button key={item.id} onClick={() => setPage(item.id)}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-2xl transition-all"
            style={page === item.id ? { background: "hsl(315 100% 60% / 0.15)" } : {}}>
            <Icon name={item.icon as any} size={20}
              style={{ color: page === item.id ? "hsl(315 100% 65%)" : "hsl(0 0% 45%)" }} />
            <span className="text-xs font-medium"
              style={{ color: page === item.id ? "hsl(315 100% 65%)" : "hsl(0 0% 40%)" }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}