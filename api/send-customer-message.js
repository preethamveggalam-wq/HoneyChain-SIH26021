export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  const body = req.body || {};
  const digits = String(body.phone || "").replace(/\D/g, "");
  const channel = String(body.channel || "sms").toLowerCase();
  const countryCode = String(body.countryCode || "+91").trim();
  const message = String(body.message || "").trim();

  if (!/^\d{10}$/.test(digits)) {
    return res.status(400).json({ ok: false, message: "Customer mobile number must be exactly 10 digits." });
  }
  if (!/^\+\d{1,4}$/.test(countryCode)) {
    return res.status(400).json({ ok: false, message: "Invalid country calling code." });
  }
  if (!message) {
    return res.status(400).json({ ok: false, message: "Message cannot be empty." });
  }
  if (!['sms', 'whatsapp'].includes(channel)) {
    return res.status(400).json({ ok: false, message: "Unsupported messaging channel." });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const smsFrom = process.env.TWILIO_FROM_NUMBER;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token) {
    return res.status(503).json({
      ok: false,
      code: "MESSAGING_NOT_CONFIGURED",
      message: "Messaging provider credentials are not configured."
    });
  }

  const toNumber = `${countryCode}${digits}`;
  const to = channel === 'whatsapp' ? `whatsapp:${toNumber}` : toNumber;
  const from = channel === 'whatsapp' ? whatsappFrom : smsFrom;

  if (!from) {
    return res.status(503).json({
      ok: false,
      code: "SENDER_NOT_CONFIGURED",
      message: channel === 'whatsapp'
        ? "TWILIO_WHATSAPP_FROM is not configured."
        : "TWILIO_FROM_NUMBER is not configured."
    });
  }

  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: message
  });
  if (channel === "whatsapp" && body.qrUrl) params.set("MediaUrl", String(body.qrUrl));

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const twilio = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const data = await twilio.json().catch(() => ({}));
  if (!twilio.ok) {
    return res.status(502).json({
      ok: false,
      code: "TWILIO_ERROR",
      message: data.message || "The messaging provider rejected the message."
    });
  }

  return res.status(200).json({
    ok: true,
    message: `Customer details sent successfully by ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}.`,
    sid: data.sid || null
  });
}
