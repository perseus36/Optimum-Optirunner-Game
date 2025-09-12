// netlify/functions/supabase-proxy.js - Ana Proxy Function
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
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
                console.error('❌ Google auth error:', error.message);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }
            
            console.log('✅ Google auth successful');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, data: result })
            };
        }

        if (path.includes('/auth/signout') && httpMethod === 'POST') {
            console.log('🚪 Processing sign out request');
            
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('❌ Sign out error:', error.message);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }
            
            console.log('✅ Sign out successful');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
            };
        }

        if (path.includes('/leaderboard') && httpMethod === 'GET') {
            console.log('🏆 Processing leaderboard request');
            
            const { isWeekly = false, limit = 10 } = query;
            const tableName = isWeekly === 'true' ? 'weekly_scores' : 'scores';
            
            const { data: result, error } = await supabase
                .from(tableName)
                .select('username, score, opti_earned, game_date')
                .order('score', { ascending: false })
                .limit(parseInt(limit));
            
            if (error) {
                console.error('❌ Leaderboard error:', error.message);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }
            
            console.log(`✅ Leaderboard loaded: ${result.length} entries`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, data: result })
            };
        }

        if (path.includes('/leaderboard') && httpMethod === 'POST') {
            console.log('💾 Processing save score request');
            
            const { score, optiEarned, gameDuration, jumpCount } = data;
            
            // Basic validation
            if (typeof score !== 'number' || score < 0 || score > 1000000) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Invalid score' })
                };
            }
            
            // Get user profile for username (simplified - in real app, use JWT)
            const { data: profiles } = await supabase
                .from('profiles')
                .select('display_name')
                .limit(1);
            
            const username = profiles?.[0]?.display_name || 'Player';
            
            // Save to global scores
            const { error: globalError } = await supabase
                .from('scores')
                .upsert({
                    username: username,
                    score: score,
                    opti_earned: optiEarned || 0,
                    game_duration: gameDuration || 0,
                    jump_count: jumpCount || 0
                });
            
            if (globalError) {
                console.error('❌ Global score save error:', globalError.message);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: globalError.message })
                };
            }
            
            // Save to weekly scores
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
            weekStart.setHours(0, 0, 0, 0);
            
            const { error: weeklyError } = await supabase
                .from('weekly_scores')
                .upsert({
                    username: username,
                    score: score,
                    opti_earned: optiEarned || 0,
                    week_start: weekStart.toISOString(),
                    game_duration: gameDuration || 0,
                    jump_count: jumpCount || 0
                });
            
            if (weeklyError) {
                console.error('❌ Weekly score save error:', weeklyError.message);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: weeklyError.message })
                };
            }
            
            console.log(`✅ Score saved: ${score} points`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
            };
        }

        // Health check
        if (path.includes('/health')) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    status: 'OK', 
                    message: 'Netlify Functions proxy is running',
                    timestamp: new Date().toISOString(),
                    version: '1.0.0'
                })
            };
        }

        // Default response
        console.log('❌ Endpoint not found:', path);
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ success: false, error: 'Endpoint not found' })
        };

    } catch (error) {
        console.error('💥 Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: 'Internal server error' })
        };
    }
};