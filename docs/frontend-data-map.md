# Stockroom frontend data map

This document records what the current React UI reads and what the provider interface returns. It describes the frontend at this commit; values in `sampleData.js` and `sampleProvider.js` are illustrative and are not backend records.

## Current screens and view models

| Screen | Current inputs | UI-required fields | Provider operation |
|---|---|---|---|
| Dashboard | Aggregate cards, activity series, low-stock list, recent activity, product rows | `stats.totalProducts`, `stats.stockValue`, `stats.currency`, `stats.lowStockItems`, `stats.pendingOrders`, `stats.pendingPurchaseValue`, `stats.arrivingToday`; `activity.total`, `activity.series[{day,incoming,outgoing}]`, `activity.changePercent`; low-stock `{sku,name,available,reorderPoint}`; activity `{id,type,description,createdAtLabel}` | `dashboard.getOverview({range})`; `products.list()` |
| Inventory | Product page, category list, expiry batches | Product view `{id,sku,name,category,categoryId,supplier,stock,price,currency,status,reorderPoint,initials,color}`; category `{id,name,active}`; batch `{id,batchNumber,productName,receivedAt,expiresAt,quantity,status}` | `products.list`, `products.create`, `categories.list`, `batches.list` |
| Stock movements | Movement rows | `{id,type,productName,quantity,reference,createdAtLabel}` | `stockMovements.list`, `stockMovements.create` |
| Purchases | Purchase order rows | `{id,orderNumber,supplierName,itemCount,total,currency,status}` | `purchases.list`, `purchases.create`, `purchases.updateStatus` |
| Suppliers | Supplier rows | `{id,name,contactEmail,phone,productCount,leadTimeDays,status}` | `suppliers.list`, `suppliers.create`, `suppliers.update` |
| Reports | Summary cards and future series | `{range,inventoryTurnover,unitsReceived,stockoutRatePercent,change,series}` | `reports.getInventorySummary` |
| Team & access | Workspace member rows | `{id,name,email,role,lastActiveLabel,status}` | `users.list`, future `users.create`, `users.updateRole` |
| Notifications | Header unread dot and popover | `{id,type,title,message,createdAt,readAt}` | `notifications.list`, `notifications.markRead` |
| Authentication | No sign-in UI exists yet | Login response contains access token, user, workspace | `auth.login`, `auth.logout`, `auth.me` |

`ProductTable` consumes the compact product view model. HTTP product resources are normalized by `services/api/normalizers.js`; screens should not need to know nested transport fields such as `unitPrice.amount` or `stock.available`.

## Provider boundary

- `services/api/index.js` selects `sampleProvider` by default.
- Set `VITE_DATA_SOURCE=api` to select `httpProvider`; set `VITE_API_BASE_URL` to override `/api/v1`.
- `sampleProvider` keeps mutable in-memory products, read states and CRUD fixtures for the current browser session. Refreshing the page resets them.
- `useApiQuery` handles asynchronous reads and exposes `data`, `loading`, `error` and `reload`.
- API mode intentionally reports request errors; it does not silently swap to sample records.
- Existing color/initials are presentation hints. The backend should not persist them; the view adapter derives them when absent.

## Current integration limits

The inventory table loads one product page and its pagination controls are intentionally disabled pending real pagination wiring. Product creation is wired through the provider. Stock, purchase, supplier and user lists, dashboard, reports, notifications and batch reads are provider-backed; their write affordances are not present in these screens yet. Theme preference remains local UI state and is not a server resource.
