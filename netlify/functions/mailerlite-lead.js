// netlify/functions/mailerlite-lead.js
// Recibe nombre y email del Espejo y los agrega al grupo "Leads Espejo" en MailerLite.
// Esto dispara automáticamente la automatización de 3 emails configurada en MailerLite.
exports.handler = async function (event) {
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

  const { name, email } = body;
  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Falta el email" }),
    };
  }

  try {
    const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MAILERLITE_API_KEY}`,
      },
      body: JSON.stringify({
        email: email,
        fields: { name: name || "" },
        groups: ["192544980788577639"], // Grupo: Leads Espejo
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Error de MailerLite", detail: errText }),
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, subscriber: data }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error de conexión", detail: err.message }),
    };
  }
};
