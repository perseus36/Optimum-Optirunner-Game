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
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        
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

        if (path.includes('/profile') && httpMethod === 'GET') {
            console.log('👤 Processing profile request');
            
            // Get authorization header
            const authHeader = event.headers.authorization || event.headers.Authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'No authorization token' })
                };
            }
            
            const token = authHeader.substring(7);
            
            // Verify token and get user
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            
            if (authError || !user) {
                console.error('❌ Auth error:', authError?.message);
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Invalid token' })
                };
            }
            
            // Get user profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (profileError && profileError.code !== 'PGRST116') {
                console.error('❌ Profile error:', profileError.message);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: profileError.message })
                };
            }
            
            console.log('✅ Profile retrieved');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    data: profile || { 
                        id: user.id, 
                        display_name: user.user_metadata?.full_name || 'Player',
                        email: user.email,
                        avatar_url: user.user_metadata?.avatar_url || '',
                        highest_score: 0,
                        opti_points: 0,
                        games_played: 0
                    }
                })
            };
        }

        if (path.includes('/profile/username') && httpMethod === 'PUT') {
            console.log('👤 Processing username change request');
            console.log('New username:', data.display_name);
            
            // Get authorization header
            const authHeader = event.headers.authorization || event.headers.Authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'No authorization token' })
                };
            }
            
            const token = authHeader.substring(7);
            
            // Verify token and get user
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            
            if (authError || !user) {
                console.error('❌ Auth error:', authError?.message);
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Invalid token' })
                };
            }
            
            // Check if user already changed username
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('username_changed, display_name')
                .eq('user_id', user.id)
                .single();
            
            if (existingProfile?.username_changed) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Username already changed once' })
                };
            }
            
            // Update username in profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .update({
                    display_name: data.display_name,
                    username_changed: true
                })
                .eq('user_id', user.id)
                .select()
                .single();
            
            if (profileError) {
                console.error('❌ Username update error:', profileError.message);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: profileError.message })
                };
            }
            
            // Update username in existing scores
            const { error: scoresUpdateError } = await supabase
                .from('scores')
                .update({ username: data.display_name })
                .eq('user_id', user.id);
            
            if (scoresUpdateError) {
                console.error('❌ Scores username update error:', scoresUpdateError.message);
            } else {
                console.log('✅ Scores username updated');
            }
            
            // Update username in existing weekly scores
            const { error: weeklyScoresUpdateError } = await supabase
                .from('weekly_scores')
                .update({ username: data.display_name })
                .eq('user_id', user.id);
            
            if (weeklyScoresUpdateError) {
                console.error('❌ Weekly scores username update error:', weeklyScoresUpdateError.message);
            } else {
                console.log('✅ Weekly scores username updated');
            }
            
            console.log('✅ Username updated in all tables');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, data: profile })
            };
        }

        if (path.includes('/profile') && httpMethod === 'POST') {
            console.log('👤 Processing profile creation/update request');
            console.log('Request data:', data);
            
            // Get authorization header
            const authHeader = event.headers.authorization || event.headers.Authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'No authorization token' })
                };
            }
            
            const token = authHeader.substring(7);
            
            // Verify token and get user
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            
            if (authError || !user) {
                console.error('❌ Auth error:', authError?.message);
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Invalid token' })
                };
            }
            
            console.log('👤 User verified:', user.id);
            
            // Check if profile exists
            const { data: existingProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('❌ Error fetching existing profile:', fetchError);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: fetchError.message })
                };
            }
            
            console.log('👤 Existing profile:', existingProfile);
            
            // Prepare profile data with proper defaults
            const profileData = {
                user_id: user.id,
                email: user.email,
                avatar_url: user.user_metadata?.avatar_url || existingProfile?.avatar_url || '',
                display_name: data.display_name || existingProfile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player',
                highest_score: data.highest_score !== undefined ? data.highest_score : (existingProfile?.highest_score || 0),
                opti_points: data.opti_points !== undefined ? data.opti_points : (existingProfile?.opti_points || 0),
                games_played: data.games_played !== undefined ? data.games_played : (existingProfile?.games_played || 0),
                username_changed: data.username_changed !== undefined ? data.username_changed : (existingProfile?.username_changed || false)
            };
            
            console.log('🔄 Upserting profile data:', profileData);
            
            // Use upsert with conflict resolution
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .upsert(profileData, { 
                    onConflict: 'user_id',
                    ignoreDuplicates: false 
                })
                .select()
                .single();
            
            if (profileError) {
                console.error('❌ Profile upsert error:', profileError.message);
                console.error('Profile error details:', profileError);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: profileError.message })
                };
            }
            
            console.log('✅ Profile upserted successfully:', profile);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, data: profile })
            };
        }

        if (path.includes('/leaderboard') && httpMethod === 'POST') {
            console.log('💾 Processing save score request');
            console.log('📊 Received data:', data);
            
            const { score, optiEarned, gameDuration, jumpCount } = data;
            
            console.log('📊 Parsed values:');
            console.log('- score:', score, typeof score);
            console.log('- optiEarned:', optiEarned, typeof optiEarned);
            console.log('- gameDuration:', gameDuration, typeof gameDuration);
            console.log('- jumpCount:', jumpCount, typeof jumpCount);
            
            // Basic validation
            if (typeof score !== 'number' || score < 0 || score > 1000000) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Invalid score' })
                };
            }
            
            // Get authorization header
            const authHeader = event.headers.authorization || event.headers.Authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'No authorization token' })
                };
            }
            
            const token = authHeader.substring(7);
            
            // Verify token and get user
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            
            if (authError || !user) {
                console.error('❌ Auth error:', authError?.message);
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Invalid token' })
                };
            }
            
            // Get user profile for username
            const { data: profile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('user_id', user.id)
                .single();
            
            const username = profile?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player';
            console.log('🎯 Using username for score:', username);
            
            // Save to global scores
            console.log('🔄 Saving to global scores table...');
            console.log('User ID:', user.id);
            console.log('Username:', username);
            console.log('Score:', score);
            
            const scoreData = {
                user_id: user.id,
                username: username,
                score: score,
                opti_earned: optiEarned || 0,
                game_duration: gameDuration || 0,
                jump_count: jumpCount || 0
            };
            
            console.log('📊 Score data to insert:', scoreData);
            
            const { data: globalResult, error: globalError } = await supabase
                .from('scores')
                .upsert(scoreData)
                .select();
            
            if (globalError) {
                console.error('❌ Global score save error:', globalError.message);
                console.error('Global error details:', globalError);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: globalError.message })
                };
            } else {
                console.log('✅ Global score saved successfully:', globalResult);
            }
            
            // Save to weekly scores
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
            weekStart.setHours(0, 0, 0, 0);
            
            console.log('🔄 Saving to weekly scores table...');
            console.log('Week start:', weekStart.toISOString());
            
            const weeklyScoreData = {
                user_id: user.id,
                username: username,
                score: score,
                opti_earned: optiEarned || 0,
                week_start: weekStart.toISOString(),
                game_duration: gameDuration || 0,
                jump_count: jumpCount || 0
            };
            
            console.log('📊 Weekly score data to insert:', weeklyScoreData);
            
            const { data: weeklyResult, error: weeklyError } = await supabase
                .from('weekly_scores')
                .upsert(weeklyScoreData)
                .select();
            
            if (weeklyError) {
                console.error('❌ Weekly score save error:', weeklyError.message);
                console.error('Weekly error details:', weeklyError);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: weeklyError.message })
                };
            } else {
                console.log('✅ Weekly score saved successfully:', weeklyResult);
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

        // Debug endpoint - test database connection
        if (path.includes('/debug') && httpMethod === 'GET') {
            console.log('🔍 Debug endpoint called');
            
            try {
                // Test profiles table
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('*')
                    .limit(5);
                
                // Test scores table
                const { data: scores, error: scoresError } = await supabase
                    .from('scores')
                    .select('*')
                    .limit(5);
                
                // Test weekly_scores table
                const { data: weeklyScores, error: weeklyScoresError } = await supabase
                    .from('weekly_scores')
                    .select('*')
                    .limit(5);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        data: {
                            profiles: {
                                count: profiles?.length || 0,
                                data: profiles,
                                error: profilesError?.message
                            },
                            scores: {
                                count: scores?.length || 0,
                                data: scores,
                                error: scoresError?.message
                            },
                            weekly_scores: {
                                count: weeklyScores?.length || 0,
                                data: weeklyScores,
                                error: weeklyScoresError?.message
                            },
                            supabase_url: supabaseUrl ? 'SET' : 'NOT_SET',
                            supabase_key: supabaseKey ? 'SET' : 'NOT_SET'
                        }
                    })
                };
            } catch (error) {
                console.error('❌ Debug endpoint error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: error.message
                    })
                };
            }
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