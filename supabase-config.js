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

        // For local testing, use real Supabase SDK
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '8000') {
            console.log('🏠 Local testing - using real Supabase SDK');
            supabase = window.supabase.createClient(
                'https://ulkhcojuizhqwhoyxhef.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsa2hjb2p1aXpocXdob3l4aGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MjQ3OTUsImV4cCI6MjA3MzIwMDc5NX0.3yUNb1_RRVpHPiXYiewEraQrFfcE0SAfoYCE7-Zuq84'
            );
        } else {
            // Create a dummy Supabase client for production (Netlify Functions)
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
            },
            // Add createClient method for Google OAuth
            createClient: (url, key) => {
                console.log('🔧 Creating temporary Supabase client for OAuth...');
                return {
                    auth: {
                        signInWithOAuth: async (options) => {
                            console.log('🔐 OAuth request via Netlify Functions...');
                            // For local testing, use direct Supabase client
                            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                                console.log('🏠 Local testing - using direct Supabase client');
                                // Use the real Supabase SDK for local testing
                                const realSupabase = window.supabase.createClient(url, key);
                                return await realSupabase.auth.signInWithOAuth(options);
                            }
                            
                            // Use Netlify Functions for production
                            const response = await fetch('/.netlify/functions/supabase-proxy/auth/google', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ redirectTo: window.location.origin })
                            });
                            const result = await response.json();
                            if (result.success) {
                                return { data: result.data, error: null };
                            } else {
                                return { data: null, error: { message: result.error } };
                            }
                        }
                    }
                };
            }
        };
        }

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
            console.log('🔐 Attempting Google sign in via direct Supabase...');
            
            // For local testing, use the existing real Supabase client
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '8000') {
                console.log('🏠 Local testing - using existing real Supabase client');
                
                if (typeof window.supabase === 'undefined') {
                    console.error('❌ Supabase client not available');
                    return { success: false, error: 'Supabase client not available' };
                }
                
                console.log('✅ Using existing Supabase client for OAuth...');
                
                const { data, error } = await window.supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin
                    }
                });
                
                if (error) {
                    console.error('❌ Google sign in failed:', error);
                    return { success: false, error: error.message };
                }
                
                console.log('✅ Google sign in successful, redirecting...');
                return { success: true, data };
            }
            
            // For production, use Netlify Functions
            console.log('🌐 Production - using Netlify Functions...');
            
            // Use Netlify Functions for OAuth
            const response = await fetch('/.netlify/functions/supabase-proxy/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ redirectTo: window.location.origin })
            });
            
            const result = await response.json();
            if (result.success) {
                console.log('✅ Google OAuth URL generated via Netlify Functions');
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
        
        if (now >= expiresAtTime) {
            console.log('❌ Token expired, clearing storage');
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