/* Prototipo: datos de ejemplo compartidos por todas las pantallas.
   En la app real esto es la base de datos (Supabase). Acá se guarda en el navegador (localStorage),
   así lo que se edita en admin.html se ve en tarjeta, escanear y panel desde ESTE mismo navegador. */
(function () {
  const KEY = "habitue_proto_negocios_v1";
  const iso = d => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

  const ejemplo = () => [
    { id: "cafe-lunar", nombre: "Café Lunar", rubro: "Cafetería", color: "#7a3e2b", espera: 6, vence: 60,
      estado: "prueba", inicio: iso(-12), empleados: ["Juan", "Carla"],
      premios: [{ visitas: 10, nombre: "Café con medialuna" }, { visitas: 20, nombre: "20% en cualquier torta" }, { visitas: 100, nombre: "Cena para dos" }] },
    { id: "cafe-marte", nombre: "Café Marte", rubro: "Cafetería", color: "#b3261e", espera: 6, vence: 60,
      estado: "prueba", inicio: iso(-25), empleados: ["Pablo"],
      premios: [{ visitas: 8, nombre: "Café gratis" }, { visitas: 15, nombre: "10% en la cuenta" }] }
  ];

  const leer = () => {
    try { const a = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(a) && a.length) return a; } catch (e) {}
    return ejemplo();
  };
  const guardar = a => { try { localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch (e) { return false; } };
  const restaurar = () => { try { localStorage.removeItem(KEY); } catch (e) {} };

  const actual = () => {
    const a = leer(), id = new URLSearchParams(location.search).get("n");
    return a.find(x => x.id === id) || a[0];
  };

  const iniciales = nombre => (nombre || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Texto oscuro o claro según el color del negocio, para que siempre se lea.
  const tinta = hex => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return "#fff7f2";
    const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? "#1c1a19" : "#fff7f2";
  };
  const aplicarMarca = (n, el) => {
    const s = (el || document.documentElement).style;
    s.setProperty("--marca", n.color);
    s.setProperty("--marca-ink", tinta(n.color));
    s.setProperty("--marca-soft", "color-mix(in srgb, " + n.color + " 16%, var(--surface))");
  };

  const premios = n => (n.premios || []).slice().sort((a, b) => a.visitas - b.visitas);
  // Premio siguiente para una cantidad de visitas (o null si ya llegó al último).
  const siguiente = (n, visitas) => premios(n).find(p => p.visitas > visitas) || null;

  const finPrueba = n => { const d = new Date(n.inicio + "T00:00:00"); d.setDate(d.getDate() + 30); return d; };
  const diasPrueba = n => Math.ceil((finPrueba(n) - new Date()) / 864e5);

  window.H = { leer, guardar, restaurar, actual, iniciales, esc, aplicarMarca, premios, siguiente, finPrueba, diasPrueba };
})();
