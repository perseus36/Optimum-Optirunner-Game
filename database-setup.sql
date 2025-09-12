-- Optimum Game Database Setup
-- Bu dosya Supabase SQL Editor'da çalıştırılacak

-- 1. PROFILES TABLOSU (Kullanıcı Profilleri)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    username_changed BOOLEAN DEFAULT FALSE,
    highest_score INTEGER DEFAULT 0,
    opti_points INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraints
    UNIQUE(user_id),
    UNIQUE(email)
);

-- 2. SCORES TABLOSU (Global Skorlar)
CREATE TABLE IF NOT EXISTS scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    username TEXT NOT NULL,
    score INTEGER NOT NULL,
    opti_earned INTEGER DEFAULT 0,
    game_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    game_duration INTEGER DEFAULT 0,
    jump_count INTEGER DEFAULT 0
);

-- 3. WEEKLY_SCORES TABLOSU (Haftalık Skorlar)
CREATE TABLE IF NOT EXISTS weekly_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    score INTEGER NOT NULL,
    opti_earned INTEGER DEFAULT 0,
    week_start TIMESTAMP WITH TIME ZONE NOT NULL,
    game_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    game_duration INTEGER DEFAULT 0,
    jump_count INTEGER DEFAULT 0,
    UNIQUE(user_id, week_start)
);

-- 4. LEADERBOARD TABLOSU (Skorlar) - DEPRECATED
CREATE TABLE IF NOT EXISTS leaderboard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    score INTEGER NOT NULL,
    opti_earned INTEGER DEFAULT 0,
    game_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_weekly BOOLEAN DEFAULT FALSE
);

-- 5. BANNED_USERS TABLOSU (Ban Sistemi)
CREATE TABLE IF NOT EXISTS banned_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    reason TEXT NOT NULL,
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    banned_by TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. ROW LEVEL SECURITY (RLS) POLİTİKALARI

-- Profiles tablosu için RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi profillerini görebilir
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi profillerini güncelleyebilir
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi profillerini oluşturabilir
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Scores tablosu için RLS
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Herkes scores'u okuyabilir
DROP POLICY IF EXISTS "Anyone can view scores" ON scores;
CREATE POLICY "Anyone can view scores" ON scores
    FOR SELECT USING (true);

-- Kullanıcılar sadece kendi skorlarını ekleyebilir
DROP POLICY IF EXISTS "Users can insert own scores" ON scores;
CREATE POLICY "Users can insert own scores" ON scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar sadece kendi skorlarını güncelleyebilir
DROP POLICY IF EXISTS "Users can update own scores" ON scores;
CREATE POLICY "Users can update own scores" ON scores
    FOR UPDATE USING (auth.uid() = user_id);

-- Weekly_scores tablosu için RLS
ALTER TABLE weekly_scores ENABLE ROW LEVEL SECURITY;

-- Herkes weekly_scores'u okuyabilir
DROP POLICY IF EXISTS "Anyone can view weekly_scores" ON weekly_scores;
CREATE POLICY "Anyone can view weekly_scores" ON weekly_scores
    FOR SELECT USING (true);

-- Kullanıcılar sadece kendi haftalık skorlarını ekleyebilir
DROP POLICY IF EXISTS "Users can insert own weekly_scores" ON weekly_scores;
CREATE POLICY "Users can insert own weekly_scores" ON weekly_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar sadece kendi haftalık skorlarını güncelleyebilir
DROP POLICY IF EXISTS "Users can update own weekly_scores" ON weekly_scores;
CREATE POLICY "Users can update own weekly_scores" ON weekly_scores
    FOR UPDATE USING (auth.uid() = user_id);

-- Leaderboard tablosu için RLS (DEPRECATED)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Herkes leaderboard'u okuyabilir
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON leaderboard;
CREATE POLICY "Anyone can view leaderboard" ON leaderboard
    FOR SELECT USING (true);

-- Kullanıcılar sadece kendi skorlarını ekleyebilir
DROP POLICY IF EXISTS "Users can insert own scores" ON leaderboard;
CREATE POLICY "Users can insert own scores" ON leaderboard
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Banned users tablosu için RLS
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;

-- Sadece adminler ban listesini görebilir (şimdilik herkes)
DROP POLICY IF EXISTS "Anyone can view banned users" ON banned_users;
CREATE POLICY "Anyone can view banned users" ON banned_users
    FOR SELECT USING (true);

-- Sadece adminler ban ekleyebilir (şimdilik herkes)
DROP POLICY IF EXISTS "Anyone can insert bans" ON banned_users;
CREATE POLICY "Anyone can insert bans" ON banned_users
    FOR INSERT WITH CHECK (true);

-- 5. TRIGGER FONKSİYONLARI

-- Updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Profiles tablosu için trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. YARDIMCI FONKSİYONLAR

-- Kullanıcının ban durumunu kontrol et
CREATE OR REPLACE FUNCTION is_user_banned(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM banned_users 
        WHERE email = user_email 
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- Haftalık leaderboard'u temizle (eski kayıtları sil)
CREATE OR REPLACE FUNCTION clean_weekly_leaderboard()
RETURNS VOID AS $$
BEGIN
    DELETE FROM leaderboard 
    WHERE is_weekly = TRUE 
    AND game_date < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 7. BAŞLANGIÇ VERİLERİ (Test için)
-- Bu kısım isteğe bağlı, test verileri eklemek için

-- 8. İNDEXLER (Performans için)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_highest_score ON profiles(highest_score DESC);

-- Scores tablosu indexleri
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_game_date ON scores(game_date DESC);

-- Weekly_scores tablosu indexleri
CREATE INDEX IF NOT EXISTS idx_weekly_scores_user_id ON weekly_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_scores_score ON weekly_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_scores_week_start ON weekly_scores(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_scores_game_date ON weekly_scores(game_date DESC);

-- Leaderboard tablosu indexleri (DEPRECATED)
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_weekly ON leaderboard(is_weekly, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_date ON leaderboard(game_date DESC);

CREATE INDEX IF NOT EXISTS idx_banned_users_user_id ON banned_users(user_id);
CREATE INDEX IF NOT EXISTS idx_banned_users_email ON banned_users(email);
CREATE INDEX IF NOT EXISTS idx_banned_users_active ON banned_users(is_active);

-- 9. MEVCUT TABLOLARI GÜNCELLE (Eğer varsa)
-- Scores tablosuna unique constraint ekle
DO $$
BEGIN
    -- Eğer scores tablosu varsa ve unique constraint yoksa ekle
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scores') THEN
        -- Unique constraint ekle
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'scores' AND constraint_name = 'scores_user_id_key'
        ) THEN
            ALTER TABLE scores ADD CONSTRAINT scores_user_id_key UNIQUE (user_id);
            RAISE NOTICE '✅ Unique constraint added to scores table';
        END IF;
    END IF;
    
    -- Weekly_scores tablosuna unique constraint ekle
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weekly_scores') THEN
        -- Unique constraint ekle
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'weekly_scores' AND constraint_name = 'weekly_scores_user_id_week_start_key'
        ) THEN
            ALTER TABLE weekly_scores ADD CONSTRAINT weekly_scores_user_id_week_start_key UNIQUE (user_id, week_start);
            RAISE NOTICE '✅ Unique constraint added to weekly_scores table';
        END IF;
    END IF;
END $$;

-- 10. DUPLICATE KAYITLARI TEMİZLE
-- Global scores tablosunda her kullanıcının sadece en yüksek skoru kalacak
DELETE FROM scores 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM scores 
    ORDER BY user_id, score DESC
);

-- Weekly scores tablosunda her kullanıcının her hafta sadece en yüksek skoru kalacak
-- Önce duplicate kayıtları göster
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM weekly_scores w1
    WHERE EXISTS (
        SELECT 1 FROM weekly_scores w2 
        WHERE w2.user_id = w1.user_id 
        AND w2.week_start = w1.week_start 
        AND w2.id != w1.id
    );
    
    RAISE NOTICE 'Found % duplicate weekly records', duplicate_count;
END $$;

-- Duplicate kayıtları temizle
DELETE FROM weekly_scores 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, week_start) id 
    FROM weekly_scores 
    ORDER BY user_id, week_start, score DESC
);

-- 11. BAŞARILI KURULUM MESAJI
DO $$
BEGIN
    RAISE NOTICE '✅ Optimum Game veritabanı başarıyla kuruldu!';
    RAISE NOTICE '📊 Tablolar: profiles, scores, weekly_scores, banned_users';
    RAISE NOTICE '🔒 RLS politikaları aktif';
    RAISE NOTICE '⚡ İndexler oluşturuldu';
    RAISE NOTICE '🔑 Unique constraintler eklendi';
    RAISE NOTICE '🎯 Duplicate skorlar temizlendi';
    RAISE NOTICE '🎮 Oyun hazır!';
END $$;
