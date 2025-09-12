// netlify/functions/validator.js
function validateInput(data, type) {
    const validators = {
        username: (value) => {
            if (typeof value !== 'string') return false;
            if (value.length < 3 || value.length > 20) return false;
            if (!/^[a-zA-Z0-9_-]+$/.test(value)) return false;
            return true;
        },
        
        score: (value) => {
            if (typeof value !== 'number') return false;
            if (value < 0 || value > 1000000) return false; // Max 1M score
            if (!Number.isInteger(value)) return false;
            return true;
        },
        
        email: (value) => {
            if (typeof value !== 'string') return false;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        }
    };
    
    return validators[type] ? validators[type](data) : true;
}

function sanitizeInput(input) {
    if (typeof input === 'string') {
        // XSS protection
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    return input;
}

function validateGameData(data) {
    const { score, optiEarned, gameDuration, jumpCount } = data;
    
    // Score validation
    if (!validateInput(score, 'score')) {
        return { valid: false, error: 'Invalid score' };
    }
    
    // OPTI validation
    if (!validateInput(optiEarned, 'score') || optiEarned > 1000) {
        return { valid: false, error: 'Invalid OPTI points' };
    }
    
    // Game duration validation (max 1 hour)
    if (!validateInput(gameDuration, 'score') || gameDuration > 3600000) {
        return { valid: false, error: 'Invalid game duration' };
    }
    
    // Jump count validation (max 10000 jumps)
    if (!validateInput(jumpCount, 'score') || jumpCount > 10000) {
        return { valid: false, error: 'Invalid jump count' };
    }
    
    return { valid: true };
}

module.exports = {
    validateInput,
    sanitizeInput,
    validateGameData
};
