-- Normalize banners: remove whatsapp redirect_type constraint, allow only 'url'
-- Update existing whatsapp banners to url type with wa.me link

UPDATE banners
SET redirect_type = 'url',
    redirect_url = 'https://wa.me/3242773556'
WHERE redirect_type = 'whatsapp';

-- Drop and recreate constraint to only allow 'url'
ALTER TABLE banners DROP CONSTRAINT IF EXISTS banners_redirect_type_check;
ALTER TABLE banners ADD CONSTRAINT banners_redirect_type_check CHECK (redirect_type IN ('url'));
