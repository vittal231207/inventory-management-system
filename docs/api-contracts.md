# Stockroom API contracts and implementation notes

**Status:** shared contract reference. Concrete workflow coverage was exercised against the local MySQL 8 database on 2026-10-31. Examples are illustrative where noted; check the actual JSON view models in `client/src/services/api/normalizers.js` for database response normalization.

## Implementation snapshot (2026-10-31)

The Express routes and sample/API frontend providers cover authentication/session revocation, dashboard and inventory reports, products, categories, stock ledger, suppliers, purchases/receipts, expiry batches, notifications and workspace users. The implementation includes workspace scoping, role checks, input validation, pagination/search filters, stock transactions, purchase receipt transactions, and idempotency keys for product creation, stock operations, batch receipts, purchase creation and purchase receipts. Workflow verification exercised these paths against a temporary MySQL workspace, then removed the test records.

Migrations 001–006 and the idempotent seed were verified. Automated server tests still use mocked database connections; the end-to-end MySQL workflow is a manual acceptance check, not part of `npm test`. Sample mode remains independent and uses labelled in-memory data. Rerun the database workflow after changing schema, query or transaction behavior.

## Conventions

- Base path: `/api/v1`; JSON request and response bodies; UTF-8.
- Workspace-scoped routes derive workspace from the authenticated membership. Do not trust a client-provided workspace ID for authorization.
- Use UTC ISO-8601 timestamps, ISO date-only strings (`YYYY-MM-DD`), UUIDs for IDs, integer quantities, decimal money strings and ISO-4217 currency codes. Preserve MySQL `DATE` values as date-only strings at API boundaries; serializing them as JavaScript timestamps can shift the displayed calendar date by one day.
- Lists accept `page` (1-based, default 1), `pageSize` (default 25, maximum 1000; large pages should be avoided for routine UI reads), `search`, optional resource filters, and a documented `sortBy`/`sortOrder` allowlist.
- List response: `{ "items": [], "page": 1, "pageSize": 25, "total": 0, "totalPages": 0 }`.
- Create returns `201 Created` and a resource; reads and updates return `200`; successful delete/revoke or logout may return `204`.
- Errors use `application/problem+json`: `{ "type": "about:blank", "title": "Validation failed", "status": 422, "code": "VALIDATION_ERROR", "detail": "Review the highlighted fields.", "errors": [{"field":"sku","code":"required","message":"SKU is required."}], "requestId":"req_..." }`.
- Common statuses: `400` malformed query/body, `401` missing/expired auth, `403` insufficient role, `404` absent or out-of-workspace ID, `409` duplicate SKU/state conflict, `422` validation, `429` throttling, `500` unexpected failure. Never leak SQL or stack traces.
- POST requests that create stock or receipts should accept an `Idempotency-Key`; retries must not duplicate inventory changes.

## Authentication and users

### `POST /auth/login`

Request: `{ "email": "person@example.com", "password": "…", "workspaceSlug": "northstar" }` (`workspaceSlug` optional when the account has one workspace). Validate email syntax, required password, rate limit by account and source, and return the same generic `401 INVALID_CREDENTIALS` for unknown email or wrong password.

Response: `{ "accessToken":"…", "tokenType":"Bearer", "expiresAt":"2026-10-31T13:00:00Z", "user":{"id":"…","name":"…","email":"…","roles":["inventory_manager"]}, "workspace":{"id":"…","name":"Northstar Studio"} }`.

### `POST /auth/logout`, `GET /auth/me`

Logout revokes the current database-backed session; response `204`. `GET /auth/me` returns the authenticated user, active workspace, and active role keys. The frontend keeps the short-lived access token in tab-scoped session storage, and the API checks session revocation and current membership/roles on each request. There is no refresh-token flow.

### `GET /users`, `POST /users`, `PATCH /users/{userId}/role`, `PATCH /users/{userId}/status`

List is paginated. Account-create body: `{ "email":"…", "name":"…", "password":"…", "roleIds":["…"] }`; accounts are created with a caller-supplied temporary password; role change body: `{ "roleIds":["…"] }`. Require `team:read` / `team:manage`; do not allow removal or demotion of the last workspace administrator. Validate all role IDs belong to the active workspace. Return membership status and role summaries, never credentials.

## Dashboard

### `GET /dashboard/overview?range=7d|30d|quarter`

Response: `{ "stats":{"totalProducts":1284,"productChangePercent":8.2,"stockValue":"2485600.00","currency":"INR","stockValueChangePercent":12.5,"lowStockItems":12,"lowStockChange":-3,"pendingOrders":8,"pendingPurchaseValue":"124800.00","arrivingToday":2}, "activity":{"total":486,"changePercent":6.4,"series":[{"day":"Mon","incoming":38,"outgoing":24}]}, "lowStock":[{"sku":"…","name":"…","available":8,"reorderPoint":20}], "recentActivity":[{"id":"…","type":"Stock received","description":"…","createdAtLabel":"10:42 AM"}] }`.

`range` is required from the allowlist (default `7d`). Counts and series must be computed in the workspace timezone or include the timezone explicitly. Low-stock membership is `available <= reorderPoint`; zero stock is separately identifiable. Dashboard aggregates are read-only.

## Products and categories

### `GET /products`, `GET /products/{productId}`, `POST /products`, `PATCH /products/{productId}`

List filters: `search`, `categoryId`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder`. A product response is `{ "id":"…","sku":"EL-2048","name":"Studio Headphones","category":{"id":"…","name":"Audio"},"supplier":{"id":"…","name":"Sonos Wholesale"},"unitPrice":{"amount":"14999.00","currency":"INR"},"stock":{"onHand":10,"reserved":2,"available":8,"reorderPoint":20},"status":"LOW_STOCK","isActive":true,"createdAt":"…","updatedAt":"…" }`. `status` is derived from available and reorder point, not user supplied.

Create body: `{ "sku":"EL-2048","name":"Studio Headphones","categoryId":"…","supplierId":"…","unitPrice":{"amount":"14999.00","currency":"INR"},"openingStock":10,"reorderPoint":20 }`; `supplierId` may be null. Required: trimmed SKU/name/category, nonnegative money with currency precision, integer nonnegative stock and reorder point. SKU is case-insensitively unique per workspace. Validate referenced category/supplier are active in the workspace. Opening stock creation must create its opening movement in the same transaction. PATCH may update name, category, supplier, price, reorder point or active state; stock quantity must change through stock movements only.

### `GET /categories`, `POST /categories`, `PATCH /categories/{categoryId}`

Category: `{ "id":"…","name":"Audio","active":true }`. Create body `{ "name":"Audio" }`. Trim and cap name at 80 characters; unique per workspace (case-insensitive); do not hard-delete a referenced category—deactivate it instead.

## Stock movements

### `GET /stock-movements`, `POST /stock-movements`

Filters: `productId`, `type`, `from`, `to`, `page`, `pageSize`. Row: `{ "id":"…","type":"RECEIPT","productId":"…","productName":"USB-C Hub Pro","batchId":null,"quantity":24,"reference":"PO-124","reason":null,"createdAt":"…","createdAtLabel":"10:42 AM","actor":{"id":"…","name":"…"} }`.

Create body: `{ "productId":"…","type":"RECEIPT|ISSUE|ADJUSTMENT|RESERVATION|RELEASE","quantity":24,"referenceType":"PURCHASE_ORDER","referenceId":"…","batchId":"…","reason":"…" }`. Quantity is a positive integer; direction is determined by type. Adjustment requires a reason. Batch, if set, must belong to that product and workspace. Write an immutable audit row and update inventory balance atomically. Do not permit negative available stock unless a workspace policy explicitly enables it.

## Suppliers and purchases

### `GET /suppliers`, `POST /suppliers`, `PATCH /suppliers/{supplierId}`

Supplier: `{ "id":"…","name":"Northstar Supply","contactName":"…","contactEmail":"orders@example.com","phone":"…","leadTimeDays":5,"productCount":18,"status":"ACTIVE" }`. Create requires trimmed name, valid optional email/phone and nonnegative integer lead time. Name unique per workspace unless Aakarshi chooses a different business rule. Deactivate rather than delete suppliers referenced by products/orders.

### `GET /purchases`, `GET /purchases/{purchaseId}`, `POST /purchases`, `PATCH /purchases/{purchaseId}/status`, `POST /purchases/{purchaseId}/receipts`

Purchase response includes `{ "id":"…","orderNumber":"PO-124","supplierId":"…","supplierName":"Northstar Supply","status":"IN_TRANSIT","currency":"INR","itemCount":4,"total":"342400.00","expectedAt":"…","lines":[{"id":"…","productId":"…","sku":"…","productName":"…","quantityOrdered":4,"quantityReceived":0,"unitCost":"85600.00"}] }`.

Create body: `{ "supplierId":"…","currency":"INR","expectedAt":"…","notes":"…","lines":[{"productId":"…","quantityOrdered":4,"unitCost":"85600.00"}] }`. Require at least one line, active supplier/products, integer quantity > 0, nonnegative unit costs in purchase currency. Totals are server-calculated. Legal transitions are `DRAFT → SUBMITTED → ORDERED → IN_TRANSIT → PARTIALLY_RECEIVED → RECEIVED`; `CANCELLED` allowed only before any receipt. Status body `{ "status":"SUBMITTED" }`. Receipt body `{ "receivedAt":"…","lines":[{"purchaseLineId":"…","quantityReceived":4,"batchNumber":"LOT-…","expiresAt":"…"}] }`; quantities cannot exceed remaining order quantities. Receipt, batch creation where supplied, and stock movements commit atomically and are idempotent.

## Reports and expiry batches

### `GET /reports/inventory?range=30d|quarter|year` or `?from=…&to=…&groupBy=day|week|month`

The frontend currently requests `range=30d`; explicit `from`/`to` bounds may be used for custom reports. Response: `{ "range":{"from":"…","to":"…","currency":"INR"},"stockValue":2485600,"inventoryTurnover":4.8,"unitsReceived":2481,"stockoutRatePercent":1.2,"change":{"turnover":0.6,"unitsReceivedPercent":12.4,"stockoutRatePercent":-0.3},"series":[] }`. Validate `from <= to`, allowed `groupBy`, and a maximum range suitable for the deployment. Reports are read-only and scoped to workspace permissions.

### `GET /expiry-batches`, `POST /expiry-batches`

List filters: `productId`, `expiringBefore`, `status`, `page`, `pageSize`. Batch: `{ "id":"…","batchNumber":"LOT-24081","productId":"…","productName":"Organic Cleaning Solution","purchaseLineId":"…","receivedAt":"2026-08-12","expiresAt":"2026-11-18","quantityReceived":30,"quantityAvailable":24,"status":"EXPIRING_SOON" }`. Create body: `{ "productId":"…","batchNumber":"LOT-24081","receivedAt":"…","expiresAt":"…","quantityReceived":30,"purchaseLineId":"…" }`. Require expiry after receipt, positive quantity and workspace/product consistency. Batch number uniqueness is scoped to product/workspace. Available batch quantity changes only through movements; status (`HEALTHY`, `EXPIRING_SOON`, `EXPIRED`, `DEPLETED`) is computed from expiry and available quantity, with the warning window configurable by workspace.

## Notifications

### `GET /notifications`, `PATCH /notifications/{notificationId}/read`

List filters: `unreadOnly`, `page`, `pageSize`. Notification: `{ "id":"…","type":"LOW_STOCK","title":"Low stock items","message":"…","createdAt":"…","readAt":null }`. Read body `{ "read":true }`; set `readAt` server-side. Notifications are user scoped; a user cannot mark another user's notification read. Return `404` for an ID outside the caller's scope.
