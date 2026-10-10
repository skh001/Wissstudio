-- ═══════════════════════════════════════════════════════════════
-- Receipts and supplier invoices can be uploaded as PDF.
-- ═══════════════════════════════════════════════════════════════
update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/gif','application/pdf']
where id = 'media';
