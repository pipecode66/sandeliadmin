CREATE TABLE IF NOT EXISTS admin_user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID UNIQUE NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  goal_period TEXT NOT NULL DEFAULT 'daily'
    CHECK (goal_period IN ('daily', 'weekly', 'biweekly', 'monthly')),
  invoice_goal INTEGER NOT NULL DEFAULT 0 CHECK (invoice_goal >= 0),
  client_goal INTEGER NOT NULL DEFAULT 0 CHECK (client_goal >= 0),
  redemption_goal INTEGER NOT NULL DEFAULT 0 CHECK (redemption_goal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_user_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_user_goals'
      AND policyname = 'admin_all_admin_user_goals'
  ) THEN
    CREATE POLICY "admin_all_admin_user_goals"
      ON admin_user_goals FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
