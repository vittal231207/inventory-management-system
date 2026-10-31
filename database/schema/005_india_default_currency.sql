ALTER TABLE workspaces ALTER COLUMN currency SET DEFAULT 'INR';
ALTER TABLE products ALTER COLUMN currency SET DEFAULT 'INR';
ALTER TABLE purchase_orders ALTER COLUMN currency SET DEFAULT 'INR';

-- The default workspace and DEMO-001 product are explicitly created by seed.js.
-- Leave all other workspace and product amounts unchanged.
UPDATE workspaces SET currency='INR' WHERE slug='default' AND currency='USD';
UPDATE products p
JOIN workspaces w ON w.id=p.workspace_id
SET p.unit_price=7499.00,p.currency='INR'
WHERE w.slug='default' AND p.sku='DEMO-001'
  AND p.name='Demo wireless headphones' AND p.currency='USD';
