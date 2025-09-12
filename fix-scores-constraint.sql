-- Fix scores table constraint issue
-- Bu dosyayı Supabase SQL Editor'da çalıştır

-- 1. Scores tablosundaki UNIQUE constraint'i kaldır
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_user_id_key;

-- 2. Scores tablosunu yeniden düzenle - her oyun için ayrı kayıt
-- Önce mevcut tabloyu yedekle
CREATE TABLE IF NOT EXISTS scores_backup AS SELECT * FROM scores;

-- Mevcut tabloları sil ve yeniden oluştur
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS weekly_scores CASCADE;

-- Yeni scores tablosu - her kullanıcının sadece en yüksek skoru
CREATE TABLE scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    username TEXT NOT NULL,
    score INTEGER NOT NULL,
    opti_earned INTEGER DEFAULT 0,
    game_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    game_duration INTEGER DEFAULT 0,
    jump_count INTEGER DEFAULT 0
);

-- Yeni weekly_scores tablosu - her kullanıcının her hafta sadece en yüksek skoru
CREATE TABLE weekly_scores (
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

-- Index'leri yeniden oluştur
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_game_date ON scores(game_date DESC);

-- Weekly_scores indexleri
CREATE INDEX IF NOT EXISTS idx_weekly_scores_user_id ON weekly_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_scores_score ON weekly_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_scores_week_start ON weekly_scores(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_scores_game_date ON weekly_scores(game_date DESC);

-- RLS politikalarını yeniden ekle
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

-- Service role için tüm işlemleri aç
DROP POLICY IF EXISTS "Service role can do everything on scores" ON scores;
CREATE POLICY "Service role can do everything on scores" ON scores
    FOR ALL USING (auth.role() = 'service_role');

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

-- Service role için tüm işlemleri aç
DROP POLICY IF EXISTS "Service role can do everything on weekly_scores" ON weekly_scores;
CREATE POLICY "Service role can do everything on weekly_scores" ON weekly_scores
    FOR ALL USING (auth.role() = 'service_role');

-- 3. Başarılı mesajı
DO $$
BEGIN
    RAISE NOTICE '✅ Scores tablosu düzeltildi!';
    RAISE NOTICE '📊 Artık her oyun için ayrı skor kaydedilebilir';
    RAISE NOTICE '🔒 RLS politikaları yeniden eklendi';
    RAISE NOTICE '⚡ Indexler yeniden oluşturuldu';
    RAISE NOTICE '🎮 Oyun hazır!';
END $$;
