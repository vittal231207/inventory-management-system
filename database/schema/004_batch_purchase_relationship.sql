ALTER TABLE expiry_batches
  ADD CONSTRAINT fk_expiry_batch_purchase_line
  FOREIGN KEY (purchase_line_id) REFERENCES purchase_order_lines(id);
