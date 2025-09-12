// functions/supabase-proxy.js - Simplified Proxy Function
exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Check environment variables
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Missing Supabase environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Server configuration error',
                    hasUrl: !!supabaseUrl,
                    hasKey: !!supabaseKey
                })
            };
        }

        // Simple response for now
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Supabase proxy working!',
                hasUrl: !!supabaseUrl,
                hasKey: !!supabaseKey,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('❌ Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message 
            })
        };
    }
};