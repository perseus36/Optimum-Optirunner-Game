-- Add username_change_count column to profiles table
-- Bu dosyayı Supabase SQL Editor'da çalıştır

-- 1. Add username_change_count column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_change_count INTEGER DEFAULT 0;

-- 2. Update existing profiles to set username_change_count based on username_changed
UPDATE profiles 
SET username_change_count = 1 
WHERE username_changed = TRUE AND username_change_count = 0;

-- 3. Add comment to the column
COMMENT ON COLUMN profiles.username_change_count IS 'Number of times the user has changed their username (max 2)';

-- 4. Add check constraint to ensure username_change_count doesn't exceed 2
ALTER TABLE profiles ADD CONSTRAINT check_username_change_limit 
CHECK (username_change_count >= 0 AND username_change_count <= 2);

-- 5. Success message
DO $$
BEGIN
    RAISE NOTICE '✅ username_change_count column added to profiles table';
    RAISE NOTICE '📊 Updated existing profiles with username_changed = TRUE';
    RAISE NOTICE '🔒 Added check constraint for max 2 username changes';
    RAISE NOTICE '🎮 Username change limit is now 2!';
END $$;
