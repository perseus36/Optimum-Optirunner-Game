// supabase-config.js - Netlify Functions Version
// API keys are now handled by Netlify Functions proxy

// Global variables
let supabase = null;
let currentUser = null;

// Initialize Supabase (will use Netlify Functions)
function initSupabase() {
    try {
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Supabase SDK not loaded');
            return false;
        }

        // Create a dummy Supabase client for compatibility
        supabase = {
            auth: {
                onAuthStateChange: (callback) => {
                    console.log('✅ Auth state listener set up');
                    // For now, just call the callback with no user
                    callback('SIGNED_OUT', null);
                },
                getUser: async () => {
                    console.log('🔍 Getting user via Netlify Functions...');
                    return { data: { user: null }, error: null };
                }
            }
        };

        // Set window.supabase for compatibility
        window.supabase = supabase;
        window.supabaseReady = true;

        console.log('✅ Using Netlify Functions for Supabase operations');
        
        // Set up auth state listener (simplified)
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
            console.log('📡 Response data:', result.data);
            
            // Redirect to Google OAuth
            if (result.data && result.data.url) {
                console.log('🔄 Redirecting to Google OAuth URL:', result.data.url);
                window.location.href = result.data.url;
                return { success: true, data: result.data };
            } else {
                console.error('❌ No OAuth URL received from server');
                return { success: false, error: 'No OAuth URL received' };
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
            return { success: true };
        } catch (error) {
            console.error('❌ Sign out error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Check if user is signed in
    isSignedIn() {
        console.log('🔍 Checking sign in status via Netlify Functions...');
        
        // For now, always return false to force proper authentication
        console.log('❌ User is not signed in (forcing authentication)');
        return false;
    },
    
    // Get current user
    async getCurrentUser() {
        try {
            console.log('👤 Getting current user via Netlify Functions...');
            
            const response = await fetch('/.netlify/functions/supabase-proxy/profile', {
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
    },
    
    // Get user profile (for game.js compatibility)
    async getUserProfile() {
        try {
            console.log('👤 Getting user profile via Netlify Functions...');
            
            const response = await fetch('/.netlify/functions/supabase-proxy/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.log('ℹ️ No user profile found');
                return null;
            }
            
            console.log('✅ User profile retrieved via Netlify Functions');
            return result.data;
        } catch (error) {
            console.error('❌ Get user profile error:', error);
            return null;
        }
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