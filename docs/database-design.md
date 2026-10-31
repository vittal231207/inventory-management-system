# Proposed Stockroom database design

**Status:** logical reference implemented through numbered MySQL 8 migrations `001_initial.sql`, `002_sessions_receipts.sql`, and `003_idempotency_fingerprints.sql`, and `004_batch_purchase_relationship.sql`. The physical schema is intentionally narrower than every future-facing field below (for example, there is no location dimension or custom permission table); migrations have not been applied to a live MySQL instance in this environment.

## Tenancy, identity and access

- `workspaces(id, name, slug, timezone, currency, created_at, updated_at)` is the tenant root.
- `users(id, email_normalized, password_hash, display_name, is_active, created_at, updated_at)` stores identity; never store plain passwords.
- `workspace_memberships(id, workspace_id, user_id, status, joined_at)` associates users with workspaces. Unique `(workspace_id,user_id)`.
- `roles(id, workspace_id nullable, key, name, is_system)` supports global system roles and workspace custom roles. `permissions(id,key)` and `role_permissions(role_id,permission_id)` define grants; `membership_roles(membership_id,role_id)` assigns roles. A workspace membership may have more than one role. In the current schema, roles are global system roles (`administrator`, `inventory_manager`, `analyst`) and authorization checks use those role keys; there is not yet a permissions/role_permissions table.
- Require tenant scoping on all business reads/writes. Add a workspace key to each business table and enforce tenant-safe foreign keys where practical. RBAC must be checked in the server, not inferred from hidden frontend controls.

## Catalogue and stock

- `categories(id,workspace_id,name,active,created_at,updated_at)`: unique lowercased name per workspace; prefer deactivation to deletion.
- `suppliers(id,workspace_id,name,contact_name,contact_email,phone,lead_time_days,status,created_at,updated_at)`: no hard delete while referenced.
- `products(id,workspace_id,category_id,supplier_id,sku,name,description,unit_price,currency,reorder_point,is_active,created_at,updated_at)`: unique case-insensitive `(workspace_id,sku)`; category required, supplier nullable; nonnegative price and reorder point. Do not persist stock status; compute it.
- `locations(id,workspace_id,name,code,active)` provides a future-compatible stock location dimension. The initial UI assumes one default location per workspace; do not make screen code assume multiple locations before the product owner confirms that workflow.
- `inventory_balances(id,workspace_id,location_id,product_id,on_hand,reserved,updated_at)`: unique `(workspace_id,location_id,product_id)`. `available = on_hand - reserved` is a computed value; enforce integer nonnegative quantities unless an explicit workspace policy allows negative stock.
- `stock_movements(id,workspace_id,location_id,product_id,batch_id,type,quantity_delta,reference_type,reference_id,reason,actor_membership_id,idempotency_key,created_at)`: append-only audit ledger. A positive/negative signed delta is stored; API accepts a positive quantity plus movement type. Unique idempotency key per workspace. Balance mutations and ledger inserts must be one transaction. Corrections use compensating movements, never edit prior rows.

## Procurement and batch traceability

- `purchase_orders(id,workspace_id,supplier_id,order_number,status,currency,expected_at,notes,created_by,created_at,updated_at)`: unique `(workspace_id,order_number)`; constrained state transition.
- `purchase_order_lines(id,workspace_id,purchase_order_id,product_id,quantity_ordered,quantity_received,unit_cost,created_at,updated_at)`: quantity received cannot exceed quantity ordered; totals are computed, not authoritative client input.
- `purchase_receipts(id,workspace_id,purchase_order_id,received_by,received_at,idempotency_key)`, `purchase_receipt_lines(id,receipt_id,purchase_order_line_id,quantity_received,batch_id)` preserve partial receiving history. Receipt, batch and stock movement writes are atomic.
- `expiry_batches(id,workspace_id,product_id,purchase_order_line_id nullable,batch_number,received_at,expires_at,quantity_received,quantity_available,created_at,updated_at)`: unique `(workspace_id,product_id,batch_number)`. Quantity changes are derived from movements linked to this batch or maintained transactionally. Expiry status is derived from dates and quantity; never allow an API client to set it arbitrarily.

## Reports, notifications and activity

- `notifications(id,workspace_id,recipient_membership_id,type,title,message,entity_type,entity_id,created_at,read_at)`: user-scoped, indexed by `(recipient_membership_id,read_at,created_at)`.
- An `activity_events` table is optional. If retained, define data retention and avoid copying sensitive fields. It does not replace the stock movement ledger.
- Dashboard and report values should be calculated from the ledger/balances and purchase tables, using workspace timezone for date buckets. Cache derived reports only after measuring load; cached aggregates must be rebuildable from source records.

## Constraints and indexes to agree before migrations

1. Index all foreign keys and tenant-scoped lookup keys (`workspace_id`, product, supplier, status, and relevant timestamps).
2. Unique product SKU, category name and purchase order number within workspace; use a case-insensitive/normalized strategy consistently.
3. `quantity_ordered > 0`, `quantity_received >= 0`, `quantity_received <= quantity_ordered`, money `>= 0`, `lead_time_days >= 0`, `expires_at > received_at`.
4. Keep money as fixed-precision decimal plus ISO currency, never binary float. UI displays formatted numbers; API accepts/returns decimal strings for monetary values.
5. Use UTC for stored timestamps; store workspace IANA timezone for display/report bucketing.
6. Enforce workspace ownership on every related object, including product/category/supplier/batch/purchase line references.
7. Define soft-delete/deactivation semantics and retention windows before shipping user-facing delete controls.

## Open decisions for design review

- SQL engine and migration framework.
- Whether Stockroom launches with one stock location or multiple.
- Negative stock policy and reservation semantics.
- Whether suppliers may share a name and how SKU comparisons normalize punctuation.
- Expiry warning window and timezone/date-only semantics.
- Invitation, password reset, refresh-token and session-revocation flows.


## Current implementation notes

The physical `inventory_balances` table supports one balance per product/workspace and has no `location_id`. `stock_movements` stores `actor_user_id`; `expiry_batches.purchase_line_id` and receipt-line links are maintained by the receipt workflow. Request fingerprints are stored for idempotent product and purchase creation. These differences should be reconciled before adding multi-location or custom permission features.
