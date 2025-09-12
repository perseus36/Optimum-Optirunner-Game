// netlify-client.js - Simplified Netlify Functions Client
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
    
    // Check if user is signed in
    isSignedIn() {
        console.log('🔍 Checking sign in status via Netlify Functions...');
        // For now, return false - we'll implement proper auth checking later
        return false;
    },
    
    // Get current user
    async getCurrentUser() {
        try {
            console.log('👤 Getting current user via Netlify Functions...');
            
            const response = await fetch(`${NETLIFY_BASE_URL}/profile`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
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
    }
};

// Expose to global scope
window.netlifyAuthFunctions = netlifyAuthFunctions;

console.log('✅ Netlify Functions client loaded');