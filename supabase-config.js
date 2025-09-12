// supabase-config.js - Netlify Functions Version
// API keys are now handled by Netlify Functions proxy

// Global variables
let supabase = null;
let currentUser = null;

// Force cache refresh
console.log('🔄 Cache refresh - supabase-config.js loaded');

// Initialize Supabase (will use Netlify Functions)
function initSupabase() {
    try {
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Supabase SDK not loaded');
            return false;
        }

        // Create a dummy Supabase client for production (Netlify Functions)
        supabase = {
            auth: {
                onAuthStateChange: (callback) => {
                    console.log('✅ Auth state listener set up');
                    // Check for existing auth state
                    const isSignedIn = authFunctions.isSignedIn();
                    callback(isSignedIn ? 'SIGNED_IN' : 'SIGNED_OUT', isSignedIn ? currentUser : null);
                },
                getUser: async () => {
                    console.log('🔍 Getting user via Netlify Functions...');
                    const user = await authFunctions.getCurrentUser();
                    return { data: { user }, error: null };
                }
            }
        };

        // Set window.supabase for compatibility
        window.supabase = supabase;
        window.supabaseReady = true;

        console.log('✅ Using Netlify Functions for Supabase operations');
        
        // Set up auth state listener
        window.addEventListener('userSignedIn', (event) => {
            console.log('✅ User signed in via Netlify Functions');
            currentUser = event.detail.user;
        });
        
        window.addEventListener('userSignedOut', () => {
            console.log('✅ User signed out via Netlify Functions');
            currentUser = null;
        });

        return true;
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error);
        return false;
    }
}

// Authentication Functions (using Netlify Functions)
const authFunctions = {
    // Sign in with Google
    async signInWithGoogle() {
        try {
            console.log('🔐 Attempting Google sign in via Netlify Functions...');
            
            const response = await fetch('/.netlify/functions/supabase-proxy/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ redirectTo: window.location.origin })
            });
            
            const result = await response.json();
            if (result.success) {
                console.log('✅ Google OAuth URL generated via Netlify Functions');
                // Redirect to Google OAuth
                if (result.data && result.data.url) {
                    window.location.href = result.data.url;
                }
                return { success: true, data: result.data };
            } else {
                console.error('❌ Google sign in failed via Netlify Functions:', result.error);
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('❌ Google sign in error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Sign out
    async signOut() {
        try {
            console.log('🚪 Attempting sign out via Netlify Functions...');
            
            // Clear local storage
            localStorage.removeItem('supabase_access_token');
            localStorage.removeItem('supabase_expires_at');
            
            const response = await fetch('/.netlify/functions/supabase-proxy/auth/signout', {
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
            
            // Dispatch sign out event
            window.dispatchEvent(new CustomEvent('userSignedOut'));
            
            return { success: true };
        } catch (error) {
            console.error('❌ Sign out error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Check if user is signed in
    isSignedIn() {
        console.log('🔍 Checking sign in status via Netlify Functions...');
        
        // Check for stored tokens
        const accessToken = localStorage.getItem('supabase_access_token');
        const expiresAt = localStorage.getItem('supabase_expires_at');
        
        if (!accessToken || !expiresAt) {
            console.log('❌ No stored tokens found');
            return false;
        }
        
        // Check if token is expired
        const now = Date.now();
        const expiresAtTime = parseInt(expiresAt);
        
        // Convert expires_at from seconds to milliseconds if needed
        const expiresAtMs = expiresAtTime < 10000000000 ? expiresAtTime * 1000 : expiresAtTime;
        
        // Add 5 minute buffer for token expiry
        const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        if (now >= (expiresAtMs - bufferTime)) {
            console.log('❌ Token expired or expiring soon, clearing storage');
            localStorage.removeItem('supabase_access_token');
            localStorage.removeItem('supabase_expires_at');
            return false;
        }
        
        console.log('✅ User is signed in (valid token)');
        return true;
    },
    
    // Get current user
    async getCurrentUser() {
        try {
            console.log('👤 Getting current user via Netlify Functions...');
            
            const accessToken = localStorage.getItem('supabase_access_token');
            if (!accessToken) {
                console.log('ℹ️ No access token found');
                return null;
            }
            
            const response = await fetch('/.netlify/functions/supabase-proxy/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.log('ℹ️ No user signed in');
                return null;
            }
            
            console.log('✅ Current user retrieved via Netlify Functions');
            return result.data;
        } catch (error) {
            console.error('❌ Get current user error:', error);
            return null;
        }
    },
    
    // Get user profile (for game.js compatibility)
    async getUserProfile() {
        try {
            console.log('👤 Getting user profile via Netlify Functions...');
            
            const accessToken = localStorage.getItem('supabase_access_token');
            if (!accessToken) {
                console.log('ℹ️ No access token found');
                return { success: false, error: 'No access token' };
            }
            
            const response = await fetch('/.netlify/functions/supabase-proxy/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.log('ℹ️ No user profile found');
                return { success: false, error: result.error };
            }
            
            console.log('✅ User profile retrieved via Netlify Functions');
            return { success: true, data: result.data };
        } catch (error) {
            console.error('❌ Get user profile error:', error);
            return { success: false, error: error.message };
        }
    },

    // Create or update user profile
    async createUserProfile(profileData = {}) {
        try {
            console.log('👤 Creating/updating user profile via Netlify Functions...');
            
            const accessToken = localStorage.getItem('supabase_access_token');
            if (!accessToken) {
                console.log('ℹ️ No access token found');
                return { success: false, error: 'No access token' };
            }
            
            const response = await fetch('/.netlify/functions/supabase-proxy/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(profileData)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('❌ Create profile failed:', result.error);
                return { success: false, error: result.error };
            }
            
            console.log('✅ Profile created/updated via Netlify Functions');
            return { success: true, data: result.data };
        } catch (error) {
            console.error('❌ Create profile error:', error);
            return { success: false, error: error.message };
        }
    },

    // Update username
    async updateUsername(newUsername) {
        try {
            console.log('👤 Updating username via Netlify Functions...');
            
            const accessToken = localStorage.getItem('supabase_access_token');
            if (!accessToken) {
                console.log('ℹ️ No access token found');
                return { success: false, error: 'No access token' };
            }
            
            const response = await fetch('/.netlify/functions/supabase-proxy/profile/username', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    display_name: newUsername
                })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('❌ Update username failed:', result.error);
                return { success: false, error: result.error };
            }
            
            console.log('✅ Username updated via Netlify Functions');
            return { success: true, data: result.data };
        } catch (error) {
            console.error('❌ Update username error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get leaderboard data
    async getLeaderboard(isWeekly = false, limit = 10) {
        try {
            console.log('🏆 Getting leaderboard via Netlify Functions...');
            
            const response = await fetch(`/.netlify/functions/supabase-proxy/leaderboard?isWeekly=${isWeekly}&limit=${limit}`, {
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
            
            console.log('✅ Leaderboard retrieved via Netlify Functions');
            return { success: true, data: result.data };
        } catch (error) {
            console.error('❌ Get leaderboard error:', error);
            return { success: false, error: error.message };
        }
    },

    // Save score to leaderboard
    async saveToLeaderboard(score, optiEarned, gameDuration = 0, jumpCount = 0) {
        try {
            console.log('💾 Saving score to leaderboard via Netlify Functions...');
            
            const accessToken = localStorage.getItem('supabase_access_token');
            if (!accessToken) {
                console.log('ℹ️ No access token found');
                return { success: false, error: 'No access token' };
            }
            
            const response = await fetch('/.netlify/functions/supabase-proxy/leaderboard', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
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
            
            console.log('✅ Score saved to leaderboard via Netlify Functions');
            return { success: true };
        } catch (error) {
            console.error('❌ Save to leaderboard error:', error);
            return { success: false, error: error.message };
        }
    },


    // Check ban status (placeholder)
    async checkBanStatus() {
        // For now, always return not banned
        return { success: true, isBanned: false };
    }
};

// Expose to global scope
window.authFunctions = authFunctions;

// Check for OAuth callback
function handleOAuthCallback() {
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
        console.log('🔐 OAuth callback detected');
        
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const expiresAt = params.get('expires_at');
        
        if (accessToken && expiresAt) {
            console.log('✅ Storing OAuth tokens');
            console.log('🔍 Token:', accessToken.substring(0, 20) + '...');
            console.log('🔍 Expires At:', expiresAt);
            console.log('🔍 Current Time:', Date.now());
            console.log('🔍 Expires Time:', parseInt(expiresAt));
            
            localStorage.setItem('supabase_access_token', accessToken);
            localStorage.setItem('supabase_expires_at', expiresAt);
            
            // Clear the hash
            window.location.hash = '';
            
            // Dispatch sign in event
            window.dispatchEvent(new CustomEvent('userSignedIn', { 
                detail: { 
                    user: { 
                        access_token: accessToken,
                        expires_at: expiresAt
                    } 
                } 
            }));
            
            console.log('✅ User signed in successfully');
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initSupabase();
        handleOAuthCallback();
    });
} else {
    initSupabase();
    handleOAuthCallback();
}