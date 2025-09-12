// secure-client.js - API Key Rotation ile Güvenlik
class SecureSupabaseClient {
    constructor() {
        this.apiKeys = [
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsa2hjb2p1aXpocXdob3l4aGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MjQ3OTUsImV4cCI6MjA3MzIwMDc5NX0.3yUNb1_RRVpHPiXYiewEraQrFfcE0SAfoYCE7-Zuq84'
            // Yeni anahtarlar buraya eklenebilir
        ];
        this.currentKeyIndex = 0;
        this.supabase = null;
        this.init();
    }

    init() {
        // API anahtarını rastgele seç
        const randomIndex = Math.floor(Math.random() * this.apiKeys.length);
        this.currentKeyIndex = randomIndex;
        
        // Supabase client oluştur
        this.supabase = window.supabase.createClient(
            'https://ulkhcojuizhqwhoyxhef.supabase.co',
            this.apiKeys[this.currentKeyIndex]
        );
        
        // Anahtarları bellekten temizle
        this.apiKeys = null;
        
        console.log('✅ Secure Supabase client initialized');
    }

    // Rate limiting
    async makeRequest(operation, ...args) {
        const now = Date.now();
        const lastRequest = localStorage.getItem('lastRequest') || 0;
        const timeDiff = now - lastRequest;
        
        // Minimum 100ms bekle
        if (timeDiff < 100) {
            await new Promise(resolve => setTimeout(resolve, 100 - timeDiff));
        }
        
        localStorage.setItem('lastRequest', Date.now());
        
        return await operation.apply(this.supabase, args);
    }

    // Güvenli auth
    async signInWithGoogle() {
        return await this.makeRequest(
            this.supabase.auth.signInWithOAuth,
            {
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            }
        );
    }

    // Güvenli leaderboard
    async getLeaderboard(isWeekly = false, limit = 10) {
        const tableName = isWeekly ? 'weekly_scores' : 'scores';
        return await this.makeRequest(
            this.supabase.from(tableName).select('username, score, opti_earned, game_date').order('score', { ascending: false }).limit(limit)
        );
    }
}

// Export
if (typeof window !== 'undefined') {
    window.SecureSupabaseClient = SecureSupabaseClient;
    console.log('✅ Secure Supabase client loaded');
}
