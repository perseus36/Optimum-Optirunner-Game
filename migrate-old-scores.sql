-- Migration Script: Eski Skorları Kurtarma
-- Bu script Supabase SQL Editor'da çalıştırılacak

-- 1. Önce mevcut durumu kontrol et
DO $$
DECLARE
    profiles_count INTEGER;
    scores_count INTEGER;
    weekly_scores_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    SELECT COUNT(*) INTO scores_count FROM scores;
    SELECT COUNT(*) INTO weekly_scores_count FROM weekly_scores;
    
    RAISE NOTICE '📊 Mevcut Durum:';
    RAISE NOTICE '   Profiles: %', profiles_count;
    RAISE NOTICE '   Scores: %', scores_count;
    RAISE NOTICE '   Weekly Scores: %', weekly_scores_count;
END $$;

-- 2. Eski leaderboard tablosundan skorları kurtar (eğer varsa)
DO $$
DECLARE
    leaderboard_count INTEGER;
    migrated_count INTEGER := 0;
BEGIN
    -- Leaderboard tablosu var mı kontrol et
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leaderboard') THEN
        SELECT COUNT(*) INTO leaderboard_count FROM leaderboard;
        RAISE NOTICE '📋 Leaderboard tablosunda % kayıt bulundu', leaderboard_count;
        
        -- Eski skorları profiles tablosuna aktar
        INSERT INTO profiles (user_id, display_name, email, highest_score, opti_points, games_played, created_at, updated_at)
        SELECT DISTINCT ON (l.user_id)
            l.user_id,
            l.username as display_name,
            COALESCE(a.email, 'unknown@example.com') as email,
            l.score as highest_score,
            l.opti_earned as opti_points,
            1 as games_played,
            l.game_date as created_at,
            NOW() as updated_at
        FROM leaderboard l
        LEFT JOIN auth.users a ON a.id = l.user_id
        WHERE l.user_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM profiles p WHERE p.user_id = l.user_id
        )
        ORDER BY l.user_id, l.score DESC;
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        RAISE NOTICE '✅ % profil leaderboard tablosundan kurtarıldı', migrated_count;
        
        -- Eski skorları scores tablosuna aktar
        INSERT INTO scores (user_id, username, score, opti_earned, game_date, game_duration, jump_count)
        SELECT DISTINCT ON (l.user_id)
            l.user_id,
            l.username,
            l.score,
            l.opti_earned,
            l.game_date,
            0 as game_duration,
            0 as jump_count
        FROM leaderboard l
        WHERE l.user_id IS NOT NULL
        AND l.is_weekly = FALSE
        AND NOT EXISTS (
            SELECT 1 FROM scores s WHERE s.user_id = l.user_id
        )
        ORDER BY l.user_id, l.score DESC;
        
        RAISE NOTICE '✅ Eski global skorlar kurtarıldı';
        
        -- Eski haftalık skorları weekly_scores tablosuna aktar
        INSERT INTO weekly_scores (user_id, username, score, opti_earned, week_start, game_date, game_duration, jump_count)
        SELECT DISTINCT ON (l.user_id, DATE_TRUNC('week', l.game_date))
            l.user_id,
            l.username,
            l.score,
            l.opti_earned,
            DATE_TRUNC('week', l.game_date) as week_start,
            l.game_date,
            0 as game_duration,
            0 as jump_count
        FROM leaderboard l
        WHERE l.user_id IS NOT NULL
        AND l.is_weekly = TRUE
        ORDER BY l.user_id, DATE_TRUNC('week', l.game_date), l.score DESC;
        
        RAISE NOTICE '✅ Eski haftalık skorlar kurtarıldı';
        
    ELSE
        RAISE NOTICE 'ℹ️ Leaderboard tablosu bulunamadı';
    END IF;
END $$;

-- 3. Mevcut profiles tablosundaki eksik user_id'leri düzelt
UPDATE profiles 
SET user_id = id 
WHERE user_id IS NULL 
AND id IN (SELECT id FROM auth.users);

-- 4. Mevcut scores tablosundaki eksik user_id'leri düzelt
UPDATE scores 
SET user_id = (
    SELECT p.user_id 
    FROM profiles p 
    WHERE p.display_name = scores.username 
    LIMIT 1
)
WHERE user_id IS NULL;

-- 5. Mevcut weekly_scores tablosundaki eksik user_id'leri düzelt
UPDATE weekly_scores 
SET user_id = (
    SELECT p.user_id 
    FROM profiles p 
    WHERE p.display_name = weekly_scores.username 
    LIMIT 1
)
WHERE user_id IS NULL;

-- 6. Duplicate kayıtları temizle
-- Profiles tablosunda aynı user_id'ye sahip duplicate kayıtları temizle
DELETE FROM profiles 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM profiles 
    WHERE user_id IS NOT NULL
    ORDER BY user_id, created_at ASC
);

-- Scores tablosunda aynı user_id'ye sahip duplicate kayıtları temizle (en yüksek skoru tut)
DELETE FROM scores 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM scores 
    WHERE user_id IS NOT NULL
    ORDER BY user_id, score DESC
);

-- Weekly_scores tablosunda duplicate kayıtları temizle
DELETE FROM weekly_scores 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, week_start) id 
    FROM weekly_scores 
    WHERE user_id IS NOT NULL
    ORDER BY user_id, week_start, score DESC
);

-- 7. Final durumu kontrol et
DO $$
DECLARE
    profiles_count INTEGER;
    scores_count INTEGER;
    weekly_scores_count INTEGER;
    profiles_with_user_id INTEGER;
    scores_with_user_id INTEGER;
    weekly_scores_with_user_id INTEGER;
BEGIN
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    SELECT COUNT(*) INTO scores_count FROM scores;
    SELECT COUNT(*) INTO weekly_scores_count FROM weekly_scores;
    
    SELECT COUNT(*) INTO profiles_with_user_id FROM profiles WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO scores_with_user_id FROM scores WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO weekly_scores_with_user_id FROM weekly_scores WHERE user_id IS NOT NULL;
    
    RAISE NOTICE '🎯 Migration Tamamlandı!';
    RAISE NOTICE '📊 Final Durum:';
    RAISE NOTICE '   Profiles: % (user_id olan: %)', profiles_count, profiles_with_user_id;
    RAISE NOTICE '   Scores: % (user_id olan: %)', scores_count, scores_with_user_id;
    RAISE NOTICE '   Weekly Scores: % (user_id olan: %)', weekly_scores_count, weekly_scores_with_user_id;
    
    IF profiles_with_user_id = profiles_count AND scores_with_user_id = scores_count AND weekly_scores_with_user_id = weekly_scores_count THEN
        RAISE NOTICE '✅ Tüm kayıtlar başarıyla user_id ile eşleştirildi!';
    ELSE
        RAISE NOTICE '⚠️ Bazı kayıtlar hala user_id eksik!';
    END IF;
END $$;

-- 8. Başarılı migration mesajı
DO $$
BEGIN
    RAISE NOTICE '🎉 Migration başarıyla tamamlandı!';
    RAISE NOTICE '🔗 Artık kullanıcılar eski skorlarını görebilecek!';
    RAISE NOTICE '🚀 Yeni oyun skorları da doğru şekilde kaydedilecek!';
END $$;
