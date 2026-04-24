-- Add last_seen_announcement_id column to user_profiles table
-- This tracks the last announcement ID a user has seen

DO $$ 
BEGIN
    -- Add last_seen_announcement_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'last_seen_announcement_id'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD COLUMN last_seen_announcement_id uuid
        REFERENCES public.app_announcements (id) ON DELETE SET NULL;

        COMMENT ON COLUMN public.user_profiles.last_seen_announcement_id IS
            'Last announcement ID the user has seen (for What is New tracking)';
    END IF;
END $$;

-- Add index for faster queries when checking unread announcements
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen_announcement
ON public.user_profiles (last_seen_announcement_id)
WHERE last_seen_announcement_id IS NOT NULL;