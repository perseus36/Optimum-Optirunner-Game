// netlify-client.js - Netlify Functions Client
const NETLIFY_BASE_URL = '/.netlify/functions/supabase-proxy';

// Netlify Functions Authentication Functions
const netlifyAuthFunctions = {
    // Sign in with Google
    async signInWithGoogle() {
        try {
            console.log('🔐 Attempting Google sign in via Netlify Functions...');
            
            const response = await fetch(`${NETLIFY_BASE_URL}/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    redirectTo: window.location.origin
                })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('❌ Google sign in failed:', result.error);
                return { success: false, error: result.error };
            }
            
            console.log('✅ Google sign in successful via Netlify Functions');
            return { success: true, data: result.data };
        } catch (error) {
            console.error('❌ Google sign in error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Sign out
    async signOut() {
        try {
            console.log('🚪 Attempting sign out via Netlify Functions...');
            
            const response = await fetch(`${NETLIFY_BASE_URL}/auth/signout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('❌ Sign out failed:', result.error);
                return { success: false, error: result.error };
            }
            
            console.log('✅ Sign out successful via Netlify Functions');
            return { success: true };
        } catch (error) {
            console.error('❌ Sign out error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get leaderboard data
    async getLeaderboard(isWeekly = false, limit = 10) {
        try {
            console.log(`🏆 Fetching ${isWeekly ? 'weekly' : 'global'} leaderboard via Netlify Functions...`);
            
            const response = await fetch(`${NETLIFY_BASE_URL}/leaderboard?isWeekly=${isWeekly}&limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('❌ Get leaderboard failed:', result.error);
                return { success: false, error: result.error };
            }
            
            console.log(`✅ Leaderboard loaded: ${result.data.length} entries`);
            return { success: true, data: result.data };
        } catch (error) {
            console.error('❌ Get leaderboard error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Save score to leaderboard
    async saveToLeaderboard(score, optiEarned, gameDuration = 0, jumpCount = 0) {
        try {
            console.log(`💾 Saving score ${score} via Netlify Functions...`);
            
            const response = await fetch(`${NETLIFY_BASE_URL}/leaderboard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    score: score,
                    optiEarned: optiEarned,
                    gameDuration: gameDuration,
                    jumpCount: jumpCount
                })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('❌ Save to leaderboard failed:', result.error);
                return { success: false, error: result.error };
            }
            
            console.log('✅ Score saved successfully via Netlify Functions');
            return { success: true };
        } catch (error) {
            console.error('❌ Save to leaderboard error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Health check
    async healthCheck() {
        try {
            console.log('🏥 Checking Netlify Functions health...');
            
            const response = await fetch(`${NETLIFY_BASE_URL}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (result.status === 'OK') {
                console.log('✅ Netlify Functions are healthy');
                return { success: true, data: result };
            } else {
                console.error('❌ Netlify Functions health check failed');
                return { success: false, error: 'Health check failed' };
            }
        } catch (error) {
            console.error('❌ Health check error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Check if user is signed in (simplified)
    isSignedIn() {
        // Bu basit bir kontrol, gerçek implementasyon session/cookie tabanlı olmalı
        return localStorage.getItem('supabase-auth-token') !== null;
    },
    
    // Get current user (simplified)
    getCurrentUser() {
        // Bu da basit bir kontrol, gerçek implementasyon session'dan gelmeli
        const userData = localStorage.getItem('supabase-user');
        return userData ? JSON.parse(userData) : null;
    }
};

// Export for use in game
if (typeof window !== 'undefined') {
    window.netlifyAuthFunctions = netlifyAuthFunctions;
    console.log('✅ Netlify auth functions loaded');
    
    // Test health check on load
    netlifyAuthFunctions.healthCheck().then(result => {
        if (result.success) {
            console.log('🎉 Netlify Functions proxy is ready!');
        } else {
            console.warn('⚠️ Netlify Functions proxy may not be ready');
        }
    });
}
