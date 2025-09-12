// functions/supabase-proxy.js - Full Supabase Proxy Function
const { createClient } = require('@supabase/supabase-js');

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
        // Supabase client (environment variables from Netlify)
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Missing Supabase environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ success: false, error: 'Server configuration error' })
            };
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { httpMethod, path, body, queryStringParameters } = event;
        const data = body ? JSON.parse(body) : {};
        const query = queryStringParameters || {};

        console.log(`📡 Request: ${httpMethod} ${path}`);

        // Route handling
        if (path.includes('/auth/google') && httpMethod === 'POST') {
            console.log('🔐 Processing Google auth request');
            
            const { data: result, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: data.redirectTo || event.headers.origin
                }
            });
            
            if (error) {
                console.error('❌ Google auth error:', error);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, data: result })
            };
        }

        // Profile operations
        if (path.includes('/profile') && httpMethod === 'GET') {
            console.log('👤 Getting user profile');
            
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Not authenticated' })
                };
            }
            
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (error) {
                console.error('❌ Profile fetch error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, data: profile })
            };
        }

        // Update profile
        if (path.includes('/profile') && httpMethod === 'PUT') {
            console.log('👤 Updating user profile');
            
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Not authenticated' })
                };
            }
            
            const { data: profile, error } = await supabase
                .from('profiles')
                .update(data)
                .eq('user_id', user.id)
                .select()
                .single();
            
            if (error) {
                console.error('❌ Profile update error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, data: profile })
            };
        }

        // Leaderboard operations
        if (path.includes('/leaderboard') && httpMethod === 'GET') {
            console.log('🏆 Getting leaderboard');
            
            const { data: scores, error } = await supabase
                .from('scores')
                .select('*')
                .order('score', { ascending: false })
                .limit(10);
            
            if (error) {
                console.error('❌ Leaderboard fetch error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, data: scores })
            };
        }

        // Save score
        if (path.includes('/score') && httpMethod === 'POST') {
            console.log('💾 Saving score');
            
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Not authenticated' })
                };
            }
            
            const { data: score, error } = await supabase
                .from('scores')
                .upsert({
                    user_id: user.id,
                    username: data.username,
                    score: data.score,
                    opti_points: data.opti_points,
                    total_game_time: data.total_game_time,
                    jump_count: data.jump_count
                }, {
                    onConflict: 'user_id'
                })
                .select()
                .single();
            
            if (error) {
                console.error('❌ Score save error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, data: score })
            };
        }

        // Default response
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, error: 'Endpoint not found' })
        };

    } catch (error) {
        console.error('❌ Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};