// Supabase Configuration - Netlify Functions Version
// API keys are now handled by Netlify Functions proxy

// These will be replaced by Netlify Functions
const SUPABASE_URL = 'https://ulkhcojuizhqwhoyxhef.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsa2hjb2p1aXpocXdob3l4aGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MjQ3OTUsImV4cCI6MjA3MzIwMDc5NX0.3yUNb1_RRVpHPiXYiewEraQrFfcE0SAfoYCE7-Zuq84';

// Global variables
let supabase = null;
let currentUser = null;

// Initialize Supabase
function initSupabase() {
    try {
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Supabase SDK not loaded');
            return false;
        }

                    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    console.log('✅ Supabase initialized');
                    
                    // Set up auth state listener
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            currentUser = session?.user || null;
            
            if (event === 'SIGNED_IN') {
                console.log('✅ User signed in:', currentUser?.email);
                window.dispatchEvent(new CustomEvent('userSignedIn', { detail: { user: currentUser } }));
            } else if (event === 'SIGNED_OUT') {
                console.log('✅ User signed out');
                window.dispatchEvent(new CustomEvent('userSignedOut'));
            }
        });

        return true;
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error);
        return false;
    }
}

// Authentication Functions
const authFunctions = {
    // Sign in with Google
    async signInWithGoogle() {
        if (!supabase) return { success: false, error: 'Supabase not initialized' };
        
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            
            if (error) {
                console.error('❌ Google sign in failed:', error);
                return { success: false, error: error.message };
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Google sign in error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Sign out
    async signOut() {
        if (!supabase) return { success: false, error: 'Supabase not initialized' };
        
        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('❌ Sign out failed:', error);
                return { success: false, error: error.message };
            }
            
            return { success: true };
        } catch (error) {
            console.error('❌ Sign out error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get current user
    getCurrentUser() {
        return currentUser;
    },
    
    // Check if user is signed in
    isSignedIn() {
        return currentUser !== null;
    },
    
    // Get user profile
    async getUserProfile() {
        if (!currentUser) return { success: false, error: 'No user signed in' };
        
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();
            
            if (error) {
                console.error('❌ Get profile failed:', error);
                return { success: false, error: error.message };
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Get profile error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Create or update user profile
    async createUserProfile(profileData = {}) {
        if (!currentUser) return { success: false, error: 'No user signed in' };
        
        try {
            const { data, error } = await supabase
                .from('profiles')
                .upsert({
                    user_id: currentUser.id,
                    email: currentUser.email,
                    display_name: profileData.display_name || currentUser.user_metadata?.full_name || 'Player',
                    avatar_url: currentUser.user_metadata?.avatar_url || null,
                    username_changed: profileData.username_changed || false,
                    highest_score: profileData.highest_score || 0,
                    opti_points: profileData.opti_points || 0,
                    games_played: profileData.games_played || 0
                })
                .select()
                .single();
            
            if (error) {
                console.error('❌ Create profile failed:', error);
                return { success: false, error: error.message };
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Create profile error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Update username
    async updateUsername(newUsername) {
        if (!currentUser) return { success: false, error: 'No user signed in' };
        
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    display_name: newUsername,
                    username_changed: true
                })
                .eq('user_id', currentUser.id)
                .select()
                .single();
            
            if (error) {
                console.error('❌ Update username failed:', error);
                return { success: false, error: error.message };
            }
            
            // Update username in leaderboards
            await this.updateLeaderboardUsername(newUsername);
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Update username error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Update username in leaderboards
    async updateLeaderboardUsername(newUsername) {
        if (!currentUser) return { success: false, error: 'No user signed in' };
        
        try {
            console.log('🔄 Updating username in leaderboards:', newUsername);
            
            // Update global scores table
            const { error: globalError } = await supabase
                .from('scores')
                .update({ username: newUsername })
                .eq('user_id', currentUser.id);
            
            if (globalError) {
                console.error('❌ Update global scores username failed:', globalError);
            } else {
                console.log('✅ Global scores username updated');
            }
            
            // Update weekly scores table
            const { error: weeklyError } = await supabase
                .from('weekly_scores')
                .update({ username: newUsername })
                .eq('user_id', currentUser.id);
            
            if (weeklyError) {
                console.error('❌ Update weekly scores username failed:', weeklyError);
            } else {
                console.log('✅ Weekly scores username updated');
            }
            
            return { success: true };
        } catch (error) {
            console.error('❌ Update leaderboard username error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Update score and OPTI points
    async updateScoreAndOpti(score, optiEarned) {
        if (!currentUser) return { success: false, error: 'No user signed in' };
        
        try {
            console.log('🔄 === UPDATING SCORE AND OPTI ===');
            console.log('New score:', score);
            console.log('OPTI earned:', optiEarned);
            console.log('Current user:', currentUser.email);
            
            // First, get current profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('highest_score, opti_points, games_played, display_name')
                .eq('user_id', currentUser.id)
                .single();
            
            if (profileError) {
                console.error('❌ Get profile failed:', profileError);
                return { success: false, error: profileError.message };
            }
            
            console.log('Current profile:', profile);
            
            // Update profile with new highest score and OPTI points
            const newHighestScore = Math.max(profile.highest_score, score);
            const newOptiPoints = profile.opti_points + optiEarned;
            const newGamesPlayed = profile.games_played + 1;
            
            console.log('Calculated updates:');
            console.log('- New highest score:', newHighestScore);
            console.log('- New OPTI points:', newOptiPoints);
            console.log('- New games played:', newGamesPlayed);
            
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    highest_score: newHighestScore,
                    opti_points: newOptiPoints,
                    games_played: newGamesPlayed
                })
                .eq('user_id', currentUser.id)
                .select()
                .single();
            
            if (error) {
                console.error('❌ Update score failed:', error);
                return { success: false, error: error.message };
            }
            
            console.log('✅ Score and OPTI updated successfully');
            console.log('Updated profile:', data);
            return { success: true, data };
            
        } catch (error) {
            console.error('❌ Update score error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Get leaderboard data
    async getLeaderboard(isWeekly = false, limit = 10) {
        try {
            const tableName = isWeekly ? 'weekly_scores' : 'scores';
            const { data, error } = await supabase
                .from(tableName)
                .select('username, score, opti_earned, game_date')
                .order('score', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.error('❌ Get leaderboard failed:', error);
                return { success: false, error: error.message };
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('❌ Get leaderboard error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Save score to leaderboard (only if it's the highest score)
    async saveToLeaderboard(score, optiEarned, gameDuration = 0, jumpCount = 0) {
        if (!currentUser) return { success: false, error: 'No user signed in' };
        
        try {
            console.log('Saving to leaderboard:', { score, optiEarned, gameDuration, jumpCount });
            
            // Get user profile for username
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('user_id', currentUser.id)
                .single();
            
            if (profileError) {
                console.error('❌ Get profile for leaderboard failed:', profileError);
                return { success: false, error: profileError.message };
            }
            
            const username = profile.display_name || 'Player';
            
            // Check if this score is higher than existing global score
            const { data: existingGlobal, error: globalCheckError } = await supabase
                .from('scores')
                .select('score')
                .eq('user_id', currentUser.id)
                .single();
            
            if (globalCheckError && globalCheckError.code !== 'PGRST116') {
                console.error('❌ Check global score failed:', globalCheckError);
                return { success: false, error: globalCheckError.message };
            }
            
            // Only save if this is a new high score or no existing score
            if (!existingGlobal || score > existingGlobal.score) {
                console.log('🎯 New high score! Saving to global leaderboard...');
                
                // Update or insert to global scores table
                if (existingGlobal) {
                    // Update existing record
                    const { error: scoresError } = await supabase
                        .from('scores')
                        .update({
                            username: username,
                            score: score,
                            opti_earned: optiEarned,
                            game_duration: gameDuration,
                            jump_count: jumpCount
                        })
                        .eq('user_id', currentUser.id);
                    
                    if (scoresError) {
                        console.error('❌ Update scores failed:', scoresError);
                        return { success: false, error: scoresError.message };
                    }
                } else {
                    // Insert new record
                    const { error: scoresError } = await supabase
                        .from('scores')
                        .insert({
                            user_id: currentUser.id,
                            username: username,
                            score: score,
                            opti_earned: optiEarned,
                            game_duration: gameDuration,
                            jump_count: jumpCount
                        });
                    
                    if (scoresError) {
                        console.error('❌ Insert scores failed:', scoresError);
                        return { success: false, error: scoresError.message };
                    }
                }
            } else {
                console.log('ℹ️ Score not higher than existing global score, skipping global leaderboard');
            }
            
            // Check weekly score
            const weekStart = this.getWeekStart(new Date());
            console.log('📅 Week start calculated:', weekStart.toISOString());
            console.log('📅 Week start date:', weekStart.toDateString());
            
            const { data: existingWeekly, error: weeklyCheckError } = await supabase
                .from('weekly_scores')
                .select('score, week_start')
                .eq('user_id', currentUser.id)
                .eq('week_start', weekStart.toISOString())
                .single();
            
            if (weeklyCheckError && weeklyCheckError.code !== 'PGRST116') {
                console.error('❌ Check weekly score failed:', weeklyCheckError);
                return { success: false, error: weeklyCheckError.message };
            }
            
            console.log('📊 Existing weekly record:', existingWeekly);
            
            // Only save if this is a new weekly high score or no existing weekly score
            if (!existingWeekly || score > existingWeekly.score) {
                console.log('🎯 New weekly high score! Saving to weekly leaderboard...');
                console.log('📊 Comparison: New score', score, 'vs existing score', existingWeekly?.score || 'none');
                
                // Update or insert to weekly scores table
                if (existingWeekly) {
                    // Update existing record
                    const { error: weeklyError } = await supabase
                        .from('weekly_scores')
                        .update({
                            username: username,
                            score: score,
                            opti_earned: optiEarned,
                            game_duration: gameDuration,
                            jump_count: jumpCount
                        })
                        .eq('user_id', currentUser.id)
                        .eq('week_start', weekStart.toISOString());
                    
                    if (weeklyError) {
                        console.error('❌ Update weekly_scores failed:', weeklyError);
                        return { success: false, error: weeklyError.message };
                    }
                } else {
                    // Insert new record
                    const { error: weeklyError } = await supabase
                        .from('weekly_scores')
                        .insert({
                            user_id: currentUser.id,
                            username: username,
                            score: score,
                            opti_earned: optiEarned,
                            week_start: weekStart.toISOString(),
                            game_duration: gameDuration,
                            jump_count: jumpCount
                        });
                    
                    if (weeklyError) {
                        console.error('❌ Insert weekly_scores failed:', weeklyError);
                        return { success: false, error: weeklyError.message };
                    }
                }
            } else {
                console.log('ℹ️ Score not higher than existing weekly score, skipping weekly leaderboard');
            }
            
            console.log('✅ Score saved to leaderboards (if it was a new high score)');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Save to leaderboard error:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Helper function to get week start
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const weekStart = new Date(d);
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0); // Set to start of day
        return weekStart;
    },
    
    // Check ban status
    async checkBanStatus() {
        if (!currentUser) return { success: false, error: 'No user signed in' };
        
        try {
            const { data, error } = await supabase
                .from('banned_users')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('is_active', true)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('❌ Check ban status failed:', error);
                return { success: false, error: error.message };
            }
            
            return { success: true, isBanned: !!data };
        } catch (error) {
            console.error('❌ Check ban status error:', error);
            return { success: false, error: error.message };
        }
    }
};

// Initialize when script loads
if (typeof window !== 'undefined') {
    // Wait for Supabase SDK to be available
    const checkSupabase = () => {
        if (typeof window.supabase !== 'undefined') {
            console.log('✅ Supabase SDK found, initializing...');
            initSupabase();
            window.supabase = supabase; // Expose supabase globally
            window.authFunctions = authFunctions;
            window.supabaseReady = true;
            console.log('✅ Supabase and AuthFunctions exposed globally');
            
            // Dispatch ready event
            window.dispatchEvent(new Event('supabaseReady'));
        } else {
            console.log('⏳ Waiting for Supabase SDK...');
            setTimeout(checkSupabase, 100);
        }
    };
    
    // Start checking immediately
    checkSupabase();
}