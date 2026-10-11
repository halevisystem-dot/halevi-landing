// netlify/functions/espejo.js
// Función intermedia: recibe las respuestas del mini-test desde la landing,
// llama a la API de Claude de forma segura (la clave nunca se expone al navegador),
// devuelve el resultado generado y, si el visitante dejó nombre y correo,
// le envía una copia de su lectura por email desde contacto@halevisystem.com.
//
// Variables de entorno necesarias en Netlify:
//   ANTHROPIC_API_KEY  (ya existe)
//   SMTP_USER          correo remitente, p. ej. contacto@halevisystem.com
//   SMTP_PASS          contraseña de ese buzón
//   SMTP_HOST          (opcional) por defecto mail.privateemail.com

const nodemailer = require("nodemailer");

// Respuestas permitidas. Deben coincidir con las opciones del test en index.html.
// Así nadie puede colar texto arbitrario en el prompt de Claude.
const OPCIONES = {
  q1: ["En el amor", "En el dinero", "En mi cuerpo o mi salud", "En cómo me veo a mí mismo/a"],
  q2: ["Sí, todo el tiempo", "A veces, y me asusta", "Prefiero no pensarlo", "No lo había notado hasta ahora"],
  q3: ["Sí, constantemente", "A veces", "No, pero sí emocionalmente", "No lo había conectado así"],
  q4: ["Mis relaciones", "Mi tranquilidad económica", "Mi salud y energía", "Cómo me siento conmigo mismo/a"],
};

const URL_COMPRA = "https://payhip.com/b/nUea8";

function escaparHtml(t) {
  return String(t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailValido(e) {
  return typeof e === "string" && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function limpiarNombre(n) {
  if (typeof n !== "string") return "";
  return n.replace(/[<>\r\n]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

function crearTransporte() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "mail.privateemail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
}

function construirCorreo(nombre, texto) {
  const primerNombre = nombre.split(" ")[0];
  const nombreHtml = escaparHtml(primerNombre);
  const parrafos = texto
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const lecturaHtml = parrafos
    .map((p, i) => {
      const margen = i === parrafos.length - 1 ? "0" : "0 0 14px 0";
      return `<p style="margin:${margen};">${escaparHtml(p)}</p>`;
    })
    .join("");

  const serif = "Georgia,'Times New Roman',serif";
  const sans = "Arial,Helvetica,sans-serif";

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tu lectura del Espejo</title>
</head>
<body style="margin:0;padding:0;background:#EDE6DA;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDE6DA;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FAF7F2;">
    <tr><td align="center" style="padding:40px 40px 8px 40px;font-family:${serif};font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#1A1410;">Haleví Systems</td></tr>
    <tr><td align="center" style="padding:0 40px 28px 40px;font-size:12px;color:#C4A882;">&#9670;</td></tr>
    <tr><td style="padding:0 40px;font-family:${serif};font-size:28px;line-height:1.3;color:#1A1410;">Hola, ${nombreHtml}.</td></tr>
    <tr><td style="padding:12px 40px 24px 40px;font-family:${sans};font-size:14px;line-height:1.7;color:#5C4F47;">Aquí está la lectura que pediste en el Espejo de 60 segundos. Léela con calma.</td></tr>
    <tr><td style="padding:0 40px 24px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background:#EEF3F8;border-left:3px solid #5C7B9A;padding:22px 20px;font-family:${serif};font-style:italic;font-size:18px;line-height:1.75;color:#1A1410;">${lecturaHtml}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 40px 28px 40px;font-family:${sans};font-size:14px;line-height:1.7;color:#5C4F47;">Esto es solo la superficie. Tu Análisis Sistémico Personal completo revela exactamente de dónde viene este patrón y cómo empezar a soltarlo.</td></tr>
    <tr><td align="center" style="padding:0 40px 40px 40px;">
      <a href="${URL_COMPRA}" style="display:inline-block;background:#B5613A;color:#FAF7F2;font-family:${sans};font-size:13px;font-weight:bold;letter-spacing:1px;text-decoration:none;padding:16px 36px;">Quiero ver mi patrón completo</a>
    </td></tr>
    <tr><td style="padding:24px 40px 36px 40px;border-top:1px solid #D9CEBF;font-family:${sans};font-size:11px;line-height:1.7;color:#5C4F47;">
      Esta lectura se generó con ayuda de inteligencia artificial a partir de tus cuatro respuestas. No es un diagnóstico ni reemplaza un acompañamiento profesional.<br><br>
      Recibes este correo porque pediste tu lectura en halevisystem.com. Si no fuiste tú, puedes ignorarlo. Puedes responder a este mensaje si tienes alguna pregunta.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const textoPlano =
    `Hola, ${primerNombre}.\n\n` +
    `Aquí está la lectura que pediste en el Espejo de 60 segundos:\n\n` +
    `${parrafos.join("\n\n")}\n\n` +
    `Esto es solo la superficie. Tu Análisis Sistémico Personal completo revela exactamente de dónde viene este patrón y cómo empezar a soltarlo:\n` +
    `${URL_COMPRA}\n\n` +
    `---\n` +
    `Esta lectura se generó con ayuda de inteligencia artificial a partir de tus cuatro respuestas. No es un diagnóstico ni reemplaza un acompañamiento profesional.\n` +
    `Recibes este correo porque pediste tu lectura en halevisystem.com. Si no fuiste tú, puedes ignorarlo.\n`;

  return { html, textoPlano, asunto: `${primerNombre}, aquí está tu lectura` };
}

async function enviarLectura(nombre, email, texto) {
  const transporte = crearTransporte();
  if (!transporte) {
    throw new Error("SMTP_USER o SMTP_PASS no están configuradas en Netlify");
  }
  const { html, textoPlano, asunto } = construirCorreo(nombre, texto);
  await transporte.sendMail({
    from: `"Saúl Haleví · Haleví Systems" <${process.env.SMTP_USER}>`,
    to: email,
    replyTo: process.env.SMTP_USER,
    subject: asunto,
    text: textoPlano,
    html: html,
  });
}

exports.handler = async function (event) {
  // Solo aceptar POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método no permitido" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Cuerpo de solicitud inválido" }),
    };
  }

  const { q1, q2, q3, q4 } = body;

  if (!q1 || !q2 || !q3 || !q4) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Faltan respuestas del test" }),
    };
  }

  const respuestas = { q1, q2, q3, q4 };
  for (const clave of Object.keys(OPCIONES)) {
    if (!OPCIONES[clave].includes(respuestas[clave])) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Respuesta no válida" }),
      };
    }
  }

  const prompt = `Eres Saúl Haleví, analista sistémico de Haleví Systems, formado en constelaciones familiares y psicología sistémica. Tu voz es profunda, íntima, pausada y directa.

Respuestas del cliente:
1. Patrón que se repite: ${q1}
2. Patrón heredado de los padres: ${q2}
3. Cómo se manifiesta en el cuerpo: ${q3}
4. Qué cambiaría primero: ${q4}

Genera un mini-resultado de 80 a 110 palabras, en segunda persona, hablando directo. Abre nombrando el patrón con su respuesta exacta de la pregunta 1. Conecta con el origen familiar usando lenguaje sistémico (ej: esto no empezó contigo). Cierra abriendo tensión sin resolverla del todo, invitando a profundizar. Sin markdown, sin comillas, sin preámbulo, solo el texto del resultado.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Error de la API de Claude", detail: errText }),
      };
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!text) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Respuesta vacía" }),
      };
    }

    // Enviar copia por email. Si falla, la lectura se muestra igual en pantalla.
    let emailSent = false;
    const nombre = limpiarNombre(body.nombre);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (nombre && emailValido(email)) {
      try {
        await enviarLectura(nombre, email, text);
        emailSent = true;
      } catch (errCorreo) {
        console.error("No se pudo enviar el correo de la lectura:", errCorreo.message);
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: text, emailSent: emailSent }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error de conexión", detail: err.message }),
    };
  }
};
