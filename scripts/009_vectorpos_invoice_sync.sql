-- 009_vectorpos_invoice_sync.sql
-- Adds VectorPOS invoice sync fields and state storage.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoices_source_check'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_source_check
      CHECK (source IN ('manual', 'vectorpos'));
  END IF;
END
$$;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS source_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS source_payload JSONB,
  ADD COLUMN IF NOT EXISTS source_client_phone TEXT,
  ADD COLUMN IF NOT EXISTS source_client_name TEXT,
  ADD COLUMN IF NOT EXISTS match_status TEXT NOT NULL DEFAULT 'matched',
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS points_applied_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoices_match_status_check'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_match_status_check
      CHECK (match_status IN ('matched', 'unmatched', 'duplicate'));
  END IF;
END
$$;

UPDATE invoices
SET source = 'manual'
WHERE source IS NULL;

UPDATE invoices
SET match_status = CASE WHEN client_id IS NULL THEN 'unmatched' ELSE 'matched' END
WHERE match_status IS NULL;

UPDATE invoices
SET imported_at = COALESCE(imported_at, created_at)
WHERE imported_at IS NULL;

UPDATE invoices
SET points_applied_at = COALESCE(points_applied_at, created_at)
WHERE client_id IS NOT NULL AND points_applied_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_source_invoice_id_unique
  ON invoices(source, source_invoice_id)
  WHERE source_invoice_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS integration_sync_state (
  provider TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  start_from_invoice_id INTEGER NOT NULL DEFAULT 0,
  last_checked_invoice_id INTEGER,
  last_imported_invoice_id INTEGER,
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  miss_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE integration_sync_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'integration_sync_state'
      AND policyname = 'admin_all_integration_sync_state'
  ) THEN
    CREATE POLICY "admin_all_integration_sync_state"
      ON integration_sync_state
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
