// Las tarjetas que el cliente final fue abriendo se recuerdan en este dispositivo.
// No hay cuenta de cliente: lo único que identifica una tarjeta es su token secreto.
const KEY = "habitue_tarjetas_v1";
const TOKEN = /^[0-9a-f]{32,64}$/i;

export function tokensGuardados(): string[] {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(a) ? a.filter((t) => typeof t === "string" && TOKEN.test(t)) : [];
  } catch { return []; }
}

function guardar(tokens: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(tokens)); } catch { /* modo privado: no se recuerda */ }
}

export function agregarToken(t: string) {
  if (!TOKEN.test(t)) return;
  const a = tokensGuardados();
  if (!a.includes(t)) guardar([...a, t]);
}

export function quitarToken(t: string) {
  guardar(tokensGuardados().filter((x) => x !== t));
}

/** Acepta una lista separada por comas (?k=a,b) o un link de tarjeta (…/t/?k=TOKEN). */
export function tokensDeTexto(txt: string): string[] {
  let s = txt.trim();
  try { const k = new URL(s).searchParams.get("k"); if (k) s = k; } catch { /* no era un link */ }
  return s.split(",").map((x) => x.trim()).filter((x) => TOKEN.test(x));
}
