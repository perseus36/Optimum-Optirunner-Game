// server.js - Backend Proxy Server
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase configuration (server-side only)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Authentication endpoints
app.post('/api/auth/google', async (req, res) => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: req.body.redirectTo || 'http://localhost:3000'
            }
        });
        
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/signout', async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Profile endpoints
app.get('/api/profile', async (req, res) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/profile', async (req, res) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        
        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                user_id: user.id,
                email: user.email,
                display_name: req.body.display_name || user.user_metadata?.full_name || 'Player',
                avatar_url: user.user_metadata?.avatar_url || null,
                username_changed: req.body.username_changed || false,
                highest_score: req.body.highest_score || 0,
                opti_points: req.body.opti_points || 0,
                games_played: req.body.games_played || 0
            })
            .select()
            .single();
        
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Leaderboard endpoints
app.get('/api/leaderboard', async (req, res) => {
    try {
        const { isWeekly = false, limit = 10 } = req.query;
        const tableName = isWeekly === 'true' ? 'weekly_scores' : 'scores';
        
        const { data, error } = await supabase
            .from(tableName)
            .select('username, score, opti_earned, game_date')
            .order('score', { ascending: false })
            .limit(parseInt(limit));
        
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/leaderboard', async (req, res) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        
        const { score, optiEarned, gameDuration, jumpCount } = req.body;
        
        // Get user profile for username
        const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single();
        
        const username = profile?.display_name || 'Player';
        
        // Save to global scores
        const { error: globalError } = await supabase
            .from('scores')
            .upsert({
                user_id: user.id,
                username: username,
                score: score,
                opti_earned: optiEarned,
                game_duration: gameDuration,
                jump_count: jumpCount
            });
        
        if (globalError) {
            return res.status(400).json({ success: false, error: globalError.message });
        }
        
        // Save to weekly scores
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        
        const { error: weeklyError } = await supabase
            .from('weekly_scores')
            .upsert({
                user_id: user.id,
                username: username,
                score: score,
                opti_earned: optiEarned,
                week_start: weekStart.toISOString(),
                game_duration: gameDuration,
                jump_count: jumpCount
            });
        
        if (weeklyError) {
            return res.status(400).json({ success: false, error: weeklyError.message });
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Proxy server is running' });
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy server running on port ${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
});
