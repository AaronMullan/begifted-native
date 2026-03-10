-- Set admin for robobullock@gmail.com (if the user exists)
UPDATE profiles
SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'robobullock@gmail.com');
