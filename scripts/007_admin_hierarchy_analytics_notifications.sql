-- 007_admin_hierarchy_analytics_notifications.sql
-- Adds: hierarchical admin users, audit log, scheduled banners, scheduled notifications,
-- issuer/validator traceability, and client daily limit override controls.

-- 1) Admin users and roles
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'gerente', 'supervisor', 'caja')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Audit log for detailed edition history
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  comment TEXT,
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_user_id, created_at DESC);

-- 3) Client override for daily redemption limit
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS daily_limit_override BOOLEAN NOT NULL DEFAULT false;

-- 4) Traceability in invoices and redemptions
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS issued_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

ALTER TABLE redemptions
  ADD COLUMN IF NOT EXISTS validated_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_issued_by_admin_id ON invoices(issued_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_validated_by_admin_id ON redemptions(validated_by_admin_id);

-- 5) Scheduled banners + WhatsApp button type
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS button_type TEXT NOT NULL DEFAULT 'url'
    CHECK (button_type IN ('url', 'whatsapp'));

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;

-- 6) Client notifications with scheduling
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  schedule_type TEXT NOT NULL DEFAULT 'immediate'
    CHECK (schedule_type IN ('immediate', 'once', 'daily', 'monthly', 'yearly')),
  scheduled_at TIMESTAMPTZ,
  schedule_day INTEGER,
  schedule_month INTEGER,
  schedule_year INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(is_active, created_at DESC);

-- 7) Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 8) Policies (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_users' AND policyname = 'admin_all_admin_users'
  ) THEN
    CREATE POLICY "admin_all_admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'admin_all_audit_logs'
  ) THEN
    CREATE POLICY "admin_all_audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'admin_all_notifications'
  ) THEN
    CREATE POLICY "admin_all_notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;

