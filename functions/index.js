// functions/index.js
const functions = require('firebase-functions');
const { createClient } = require('@supabase/supabase-js');

// Supabase client
const supabaseUrl = functions.config().supabase.url;
const supabaseKey = functions.config().supabase.key;
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS middleware
const cors = require('cors')({ origin: true });

exports.supabaseProxy = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            const { method, query, body } = req;

            if (method === 'POST' && query.action === 'auth-google') {
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: body.redirectTo || 'https://your-project.firebaseapp.com'
                    }
                });
                
                if (error) {
                    return res.status(400).json({ success: false, error: error.message });
                }
                
                return res.status(200).json({ success: true, data });
            }

            if (method === 'GET' && query.action === 'leaderboard') {
                const { isWeekly = false, limit = 10 } = query;
                const tableName = isWeekly === 'true' ? 'weekly_scores' : 'scores';
                
                const { data, error } = await supabase
                    .from(tableName)
                    .select('username, score, opti_earned, game_date')
                    .order('score', { ascending: false })
                    .limit(parseInt(limit));
                
                if (error) {
                    return res.status(400).json({ success: false, error: error.message });
                }
                
                return res.status(200).json({ success: true, data });
            }

            return res.status(404).json({ success: false, error: 'Endpoint not found' });

        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    });
});
