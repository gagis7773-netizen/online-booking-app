// Service Worker для Girly Paradise — пуш-уведомления
const CACHE_NAME = "girly-paradise-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

// Обработка пуш-уведомлений
self.addEventListener("push", e => {
  let data = { title: "Girly Paradise 🌸", body: "У вас новое уведомление", icon: "/favicon.ico" };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "/favicon.ico",
      badge: "/favicon.ico",
      vibrate: [200, 100, 200],
      tag: data.tag || "girly-notification",
      renotify: true,
      data: { url: data.url || "/" },
    })
  );
});

// Клик по уведомлению — открываем приложение
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          return;
        }
      }
      self.clients.openWindow(url);
    })
  );
});
