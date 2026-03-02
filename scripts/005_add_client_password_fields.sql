-- Add password fields to clients table
-- password_hash stores the bcrypt hash
-- password_plain stores the plain text password for admin visibility (as per business requirement)
-- has_password indicates whether the client has set up their password yet

ALTER TABLE clients ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS password_plain TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false;
