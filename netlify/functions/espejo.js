// netlify/functions/espejo.js
// Función intermedia: recibe las respuestas del mini-test desde la landing,
// llama a la API de Claude de forma segura (la clave nunca se expone al navegador),
// y devuelve el resultado generado.

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

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: text }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error de conexión", detail: err.message }),
    };
  }
};
