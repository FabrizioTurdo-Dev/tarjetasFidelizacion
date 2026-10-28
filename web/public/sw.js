// Service worker de De la Casa: solo muestra los avisos de Administración (solicitudes nuevas del formulario).
// No intercepta pedidos ni guarda nada en caché: la app funciona igual que sin él.
// Se registra solo cuando el superadmin toca "Activar avisos" (components/admin/Avisos.tsx).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* aviso sin datos */ }
  const base = self.registration.scope;
  e.waitUntil(self.registration.showNotification(d.titulo || "De la Casa", {
    body: d.cuerpo || "Tenés una solicitud nueva.",
    icon: base + "icons/icon-192.png",
    tag: d.tag || "solicitud",
    data: { url: base + "admin/?v=solicitudes" },
  }));
});

// Al tocar el aviso: si Administración ya está abierta, la trae al frente en Solicitudes; si no, la abre.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope + "admin/";
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const abierta = ventanas.find((v) => new URL(v.url).pathname.includes("/admin/"));
    if (!abierta) return self.clients.openWindow(url);
    await abierta.focus();
    if (abierta.navigate) await abierta.navigate(url).catch(() => {});
  })());
});
