-- Fix infinite recursion in RLS policies
-- Disable RLS on profiles to prevent circular dependencies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Update moderator policy to avoid recursion
DROP POLICY IF EXISTS "Moderators can update all video statuses" ON videos;
CREATE POLICY "Moderators can update all video statuses" ON videos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role IN ('moderator', 'admin')
    )
  );

-- Update admin audit log policy to avoid recursion
DROP POLICY IF EXISTS "Admin audit log is viewable by admins" ON admin_audit_log;
CREATE POLICY "Admin audit log is viewable by admins" ON admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
