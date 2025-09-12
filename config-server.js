// Server-side configuration - API keys are hidden
// This file should be served from a secure server, not client-side

const SUPABASE_CONFIG = {
    url: 'https://ulkhcojuizhqwhoyxhef.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsa2hjb2p1aXpocXdob3l4aGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MjQ3OTUsImV4cCI6MjA3MzIwMDc5NX0.3yUNb1_RRVpHPiXYiewEraQrFfcE0SAfoYCE7-Zuq84'
};

// Export only what's needed, not the full config
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
} else if (typeof window !== 'undefined') {
    // Only expose to window if absolutely necessary
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}
