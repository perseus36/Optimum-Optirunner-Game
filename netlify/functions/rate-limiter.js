// netlify/functions/rate-limiter.js
const rateLimitMap = new Map();

function checkRateLimit(ip, endpoint) {
    const key = `${ip}-${endpoint}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100; // Max 100 requests per 15 minutes
    
    if (!rateLimitMap.has(key)) {
        rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
        return true;
    }
    
    const data = rateLimitMap.get(key);
    
    if (now > data.resetTime) {
        data.count = 1;
        data.resetTime = now + windowMs;
        return true;
    }
    
    if (data.count >= maxRequests) {
        return false; // Rate limit exceeded
    }
    
    data.count++;
    return true;
}

function isIPBanned(ip) {
    const bannedIPs = [
        // Buraya banlanacak IP'ler eklenebilir
    ];
    return bannedIPs.includes(ip);
}

exports.handler = async (event, context) => {
    const clientIP = event.headers['x-forwarded-for'] || 
                    event.headers['x-real-ip'] || 
                    event.connection?.remoteAddress || 
                    'unknown';
    
    // IP ban check
    if (isIPBanned(clientIP)) {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: 'IP banned' })
        };
    }
    
    // Rate limit check
    if (!checkRateLimit(clientIP, event.path)) {
        return {
            statusCode: 429,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: false, 
                error: 'Rate limit exceeded. Try again later.' 
            })
        };
    }
    
    // Continue with main function
    return await mainHandler(event, context);
};
