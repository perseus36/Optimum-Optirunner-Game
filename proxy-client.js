// proxy-client.js - Frontend Proxy Client
// Bu dosya frontend'de kullanılacak, API anahtarları yok!

const PROXY_BASE_URL = 'http://localhost:3001/api';

// Proxy Authentication Functions
const proxyAuthFunctions = {
    // Sign in with Google
    async signInWithGoogle() {
        try {
            const response = await fetch(`${PROXY_BASE_URL}/auth/google`, {
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
            
            return { success: true, data: result.data };
        } catch (error) {
            console.error('❌ Google sign in error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Sign out
    async signOut() {
        try {
            const response = await fetch(`${PROXY_BASE_URL}/auth/signout`, {
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
            
            return { success: true };
        } catch (error) {
            console.error('❌ Sign out error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get user profile
    async getUserProfile() {
        try {
            const response = await fetch(`${PROXY_BASE_URL}/profile`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include' // Cookies için
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('❌ Get profile failed:', result.error);
                return { success: false, error: result.error };
            }
            
            return { success: true, data: result.data };
        } catch (error) {
            console.error('❌ Get profile error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Create or update user profile
    async createUserProfile(profileData = {}) {
        try {
            const response = await fetch(`${PROXY_BASE_URL}/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(profileData)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('❌ Create profile failed:', result.error);
                return { success: false, error: result.error };
            }
            
            return { success: true, data: result.data };
        } catch (error) {
            console.error('❌ Create profile error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Update username
    async updateUsername(newUsername) {
        try {
            const response = await fetch(`${PROXY_BASE_URL}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    display_name: newUsername,
                    username_changed: true
                })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('❌ Update username failed:', result.error);
                return { success: false, error: result.error };
            }
            
            return { success: true, data: result.data };
        } catch (error) {
            console.error('❌ Update username error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get leaderboard data
    async getLeaderboard(isWeekly = false, limit = 10) {
        try {
            const response = await fetch(`${PROXY_BASE_URL}/leaderboard?isWeekly=${isWeekly}&limit=${limit}`, {
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
            
            return { success: true, data: result.data };
        } catch (error) {
            console.error('❌ Get leaderboard error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Save score to leaderboard
    async saveToLeaderboard(score, optiEarned, gameDuration = 0, jumpCount = 0) {
        try {
            const response = await fetch(`${PROXY_BASE_URL}/leaderboard`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
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
            
            return { success: true };
        } catch (error) {
            console.error('❌ Save to leaderboard error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Check if user is signed in (simplified)
    isSignedIn() {
        // Bu basit bir kontrol, gerçek implementasyon session/cookie tabanlı olmalı
        return document.cookie.includes('supabase-auth-token');
    },
    
    // Get current user (simplified)
    getCurrentUser() {
        // Bu da basit bir kontrol, gerçek implementasyon session'dan gelmeli
        return null; // Session'dan user bilgisi alınmalı
    }
};

// Export for use in game
if (typeof window !== 'undefined') {
    window.proxyAuthFunctions = proxyAuthFunctions;
    console.log('✅ Proxy auth functions loaded');
}
