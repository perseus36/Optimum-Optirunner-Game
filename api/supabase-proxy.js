// api/supabase-proxy.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Supabase client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { method, query, body } = req;

        // Route handling
        if (method === 'POST' && query.action === 'auth-google') {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: body.redirectTo || 'https://your-site.vercel.app'
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
}
