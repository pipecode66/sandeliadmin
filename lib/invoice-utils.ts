export const ADMIN_INVOICE_SELECT = [
  "id",
  "client_id",
  "invoice_number",
  "amount",
  "points_earned",
  "created_at",
  "imported_at",
  "source",
  "source_invoice_id",
  "source_client_phone",
  "source_client_name",
  "match_status",
  "points_applied_at",
  "issued_by_admin_id",
  "clients(full_name, email, phone)",
  "issued_by:admin_users!invoices_issued_by_admin_id_fkey(full_name, email, role)",
].join(", ")

export const CLIENT_INVOICE_SELECT = [
  "id",
  "client_id",
  "invoice_number",
  "amount",
  "points_earned",
  "created_at",
  "imported_at",
  "source",
  "source_invoice_id",
  "source_client_phone",
  "source_client_name",
  "match_status",
  "points_applied_at",
  "issued_by_admin_id",
  "issued_by:admin_users!invoices_issued_by_admin_id_fkey(full_name, email, role)",
].join(", ")

export function calculateInvoicePoints(amount: number) {
  if (!Number.isFinite(amount) || amount < 1000) return 0
  return Math.floor(amount / 1000)
}
