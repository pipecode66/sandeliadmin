UPDATE banners
SET redirect_type = 'url',
    redirect_url = NULL
WHERE redirect_type <> 'url';

ALTER TABLE banners DROP CONSTRAINT IF EXISTS banners_redirect_type_check;

ALTER TABLE banners
ADD CONSTRAINT banners_redirect_type_check CHECK (redirect_type IN ('url'));
