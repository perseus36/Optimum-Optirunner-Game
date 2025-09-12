-- Fix RLS Policies for Netlify Functions
-- Bu script Supabase SQL Editor'da çalıştırılacak

-- 1. PROFILES TABLOSU İÇİN RLS DÜZELTMESİ
-- Mevcut politikaları sil
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Yeni politikalar oluştur (Service Role Key için)
-- Herkes profiles'u okuyabilir
CREATE POLICY "Anyone can view profiles" ON profiles
    FOR SELECT USING (true);

-- Herkes profile ekleyebilir/güncelleyebilir (Service Role Key için)
CREATE POLICY "Anyone can insert profiles" ON profiles
    FOR INSERT WITH CHECK (true);

-- Herkes profile güncelleyebilir (Service Role Key için)
CREATE POLICY "Anyone can update profiles" ON profiles
    FOR UPDATE USING (true);

-- 2. SCORES TABLOSU İÇİN RLS DÜZELTMESİ
-- Mevcut politikaları sil
DROP POLICY IF EXISTS "Anyone can view scores" ON scores;
DROP POLICY IF EXISTS "Users can insert own scores" ON scores;
DROP POLICY IF EXISTS "Users can update own scores" ON scores;

-- Yeni politikalar oluştur
-- Herkes scores'u okuyabilir
CREATE POLICY "Anyone can view scores" ON scores
    FOR SELECT USING (true);

-- Herkes score ekleyebilir/güncelleyebilir (Service Role Key için)
CREATE POLICY "Anyone can insert scores" ON scores
    FOR INSERT WITH CHECK (true);

-- Herkes score güncelleyebilir (Service Role Key için)
CREATE POLICY "Anyone can update scores" ON scores
    FOR UPDATE USING (true);

-- 3. WEEKLY_SCORES TABLOSU İÇİN RLS DÜZELTMESİ
-- Mevcut politikaları sil
DROP POLICY IF EXISTS "Anyone can view weekly_scores" ON weekly_scores;
DROP POLICY IF EXISTS "Users can insert own weekly_scores" ON weekly_scores;
DROP POLICY IF EXISTS "Users can update own weekly_scores" ON weekly_scores;

-- Yeni politikalar oluştur
-- Herkes weekly_scores'u okuyabilir
CREATE POLICY "Anyone can view weekly_scores" ON weekly_scores
    FOR SELECT USING (true);

-- Herkes weekly score ekleyebilir/güncelleyebilir (Service Role Key için)
CREATE POLICY "Anyone can insert weekly_scores" ON weekly_scores
    FOR INSERT WITH CHECK (true);

-- Herkes weekly score güncelleyebilir (Service Role Key için)
CREATE POLICY "Anyone can update weekly_scores" ON weekly_scores
    FOR UPDATE USING (true);

-- 4. BAŞARILI DÜZELTME MESAJI
DO $$
BEGIN
    RAISE NOTICE '✅ RLS politikaları başarıyla güncellendi!';
    RAISE NOTICE '🔓 Artık Service Role Key ile tüm işlemler çalışacak';
    RAISE NOTICE '📊 Profiles, scores ve weekly_scores tabloları açık';
    RAISE NOTICE '🎮 Oyun skorları artık kaydedilecek!';
END $$;
