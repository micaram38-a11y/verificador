// Función de servidor: recibe la afirmación, consulta a Claude con TU clave
// (guardada en Netlify como variable de entorno) y devuelve el veredicto.
import { getStore } from "@netlify/blobs";

const MODELO = process.env.MODELO_CLAUDE || "claude-sonnet-5-5";
const LIMITE_POR_PERSONA = Number(process.env.LIMITE_DIARIO_POR_PERSONA || 15);
const LIMITE_TOTAL = Number(process.env.LIMITE_DIARIO_TOTAL || 300);
const MAX_CARACTERES = 500;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

function construirPrompt(afirmacion, conBusqueda) {
  return `Sos un verificador de afirmaciones para un proyecto escolar de ciencias.

Analizá esta afirmación y clasificala:
"""${afirmacion}"""

${conBusqueda ? "Buscá en la web información actual y confiable antes de responder." : ""}

Respondé ÚNICAMENTE con un objeto JSON válido, sin markdown, sin backticks y sin texto antes ni después, con esta forma exacta:
{
  "veredicto": "Verdadera" | "Falsa" | "Dudosa",
  "puntaje": 0,
  "tipo": "hecho verificable | opinión | predicción | afirmación mixta",
  "resumen": "una o dos oraciones",
  "razones": ["motivo corto", "motivo corto"],
  "fuentes": [{"titulo": "nombre del sitio", "url": "https://..."}]
}

Reglas:
- "puntaje" es un entero de 0 a 100: 0 = definitivamente falsa, 50 = incierta, 100 = definitivamente verdadera. Que coincida con el veredicto.
- Usá "Dudosa" si falta contexto, si la evidencia está dividida, o si es una opinión o una predicción. En ese caso aclaralo en "resumen".
- Si la afirmación es parcialmente cierta, explicá qué parte falla.
- "fuentes" puede ser una lista vacía.
- Escribí todo en español, claro y breve.`;
}

function extraerJSON(txt) {
  const i = txt.indexOf("{"), f = txt.lastIndexOf("}");
  if (i === -1 || f === -1) throw new Error("sin JSON");
  return JSON.parse(txt.slice(i, f + 1));
}

// Cuenta usos por persona (IP) y totales del día. Devuelve true si se pasó del límite.
async function excedeLimite(ip) {
  const store = getStore({ name: "limites", consistency: "strong" });
  const hoy = new Date().toISOString().slice(0, 10);
  const claveIp = `${hoy}/ip/${ip}`;
  const claveTotal = `${hoy}/total`;
  const [usosIp, usosTotal] = await Promise.all([
    store.get(claveIp).then(Number).catch(() => 0),
    store.get(claveTotal).then(Number).catch(() => 0),
  ]);
  if ((usosIp || 0) >= LIMITE_POR_PERSONA) return "Llegaste al límite de consultas de hoy. Probá mañana.";
  if ((usosTotal || 0) >= LIMITE_TOTAL) return "La página alcanzó el límite de consultas de hoy. Probá mañana.";
  await Promise.all([
    store.set(claveIp, String((usosIp || 0) + 1)),
    store.set(claveTotal, String((usosTotal || 0) + 1)),
  ]);
  return null;
}

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "Falta configurar la clave de la API" }, 500);

  let cuerpo;
  try { cuerpo = await req.json(); } catch { return json({ error: "Solicitud inválida" }, 400); }

  const afirmacion = String(cuerpo.afirmacion || "").trim().slice(0, MAX_CARACTERES);
  const conBusqueda = cuerpo.buscar !== false;
  if (afirmacion.length < 3) return json({ error: "La afirmación es demasiado corta" }, 400);

  try {
    const motivo = await excedeLimite(context.ip || "desconocida");
    if (motivo) return json({ error: motivo }, 429);
  } catch (e) {
    console.error("Error en el contador de límites:", e);
  }

  const pedido = {
    model: MODELO,
    max_tokens: 1500,
    messages: [{ role: "user", content: construirPrompt(afirmacion, conBusqueda) }],
  };
  if (conBusqueda) pedido.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }];

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(pedido),
    });
    const data = await r.json();
    if (!r.ok || data.error) {
      console.error("Error de la API:", data.error);
      return json({ error: "El servicio de análisis no respondió. Probá de nuevo en un rato." }, 502);
    }
    const txt = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return json(extraerJSON(txt));
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo interpretar la respuesta. Probá de nuevo." }, 500);
  }
};

export const config = { path: "/api/verificar" };
