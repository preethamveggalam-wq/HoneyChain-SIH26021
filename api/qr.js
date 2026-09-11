export default async function handler(req, res) {
  try {
    const data = String(req.query?.data || '').trim();
    if (!data) return res.status(400).send('Missing QR data');
    const target = `https://api.qrserver.com/v1/create-qr-code/?size=900x900&qzone=20&ecc=H&format=png&data=${encodeURIComponent(data)}`;
    const r = await fetch(target);
    if (!r.ok) return res.status(502).send('QR provider unavailable');
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).send('QR generation failed');
  }
}
