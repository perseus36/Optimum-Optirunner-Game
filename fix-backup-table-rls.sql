-- Fix RLS warning for scores_backup table
-- Bu dosyayı Supabase SQL Editor'da çalıştır

-- 1. scores_backup tablosuna RLS ekle
ALTER TABLE scores_backup ENABLE ROW LEVEL SECURITY;

-- 2. Sadece service_role erişebilsin
DROP POLICY IF EXISTS "Service role can access backup table" ON scores_backup;
CREATE POLICY "Service role can access backup table" ON scores_backup
    FOR ALL USING (auth.role() = 'service_role');

-- 3. Alternatif: Tabloyu sil (eğer artık gerekli değilse)
-- DROP TABLE IF EXISTS scores_backup;

-- 4. Başarılı mesajı
DO $$
BEGIN
    RAISE NOTICE '✅ scores_backup tablosu RLS ile korundu!';
    RAISE NOTICE '🔒 Artık sadece service_role erişebilir';
    RAISE NOTICE '⚠️ Uyarı kaybolacak';
END $$;
