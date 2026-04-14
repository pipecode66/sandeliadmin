ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS birthday_month INTEGER;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS birthday_day INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clients_birthday_month_check'
  ) THEN
    ALTER TABLE clients
      ADD CONSTRAINT clients_birthday_month_check
      CHECK (birthday_month IS NULL OR birthday_month BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clients_birthday_day_check'
  ) THEN
    ALTER TABLE clients
      ADD CONSTRAINT clients_birthday_day_check
      CHECK (birthday_day IS NULL OR birthday_day BETWEEN 1 AND 31);
  END IF;
END $$;
