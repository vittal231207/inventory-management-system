ALTER TABLE categories
  ADD COLUMN parent_id CHAR(36) NULL AFTER name,
  ADD INDEX ix_category_parent (workspace_id, parent_id),
  ADD CONSTRAINT fk_category_parent
    FOREIGN KEY (parent_id) REFERENCES categories(id);
