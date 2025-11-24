-- Migration: Add notification preferences to user_preferences table
-- This migration adds columns to support the notifications settings page

-- Add notification method preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;

-- Add reminder preference columns
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS reminder_2_weeks_before BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_1_week_before BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_day_of_event BOOLEAN DEFAULT true;

-- Add communication type preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS feedback_requests_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS system_updates_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS promotional_emails_enabled BOOLEAN DEFAULT false;

-- Add timezone setting
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.push_notifications_enabled IS 'Enable push notifications in browser';
COMMENT ON COLUMN user_preferences.email_notifications_enabled IS 'Enable email notifications';
COMMENT ON COLUMN user_preferences.reminder_2_weeks_before IS 'Get reminded 2 weeks before an occasion';
COMMENT ON COLUMN user_preferences.reminder_1_week_before IS 'Get reminded 1 week before an occasion';
COMMENT ON COLUMN user_preferences.reminder_day_of_event IS 'Get reminded on the day of the occasion';
COMMENT ON COLUMN user_preferences.feedback_requests_enabled IS 'Receive feedback requests after sending gifts';
COMMENT ON COLUMN user_preferences.system_updates_enabled IS 'Receive important app updates and announcements';
COMMENT ON COLUMN user_preferences.promotional_emails_enabled IS 'Receive tips, feature highlights, and special offers';
COMMENT ON COLUMN user_preferences.timezone IS 'User timezone for accurate notification timing';

