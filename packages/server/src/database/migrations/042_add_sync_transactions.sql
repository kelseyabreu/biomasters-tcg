-- Migration: Add sync_transactions table for idempotency protection
-- Prevents duplicate sync processing if connection is interrupted

CREATE TABLE IF NOT EXISTS sync_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  actions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT,
  
  -- Index for fast lookups
  CONSTRAINT unique_transaction_per_user UNIQUE(user_id, transaction_id)
);

-- Create indices for efficient queries
CREATE INDEX IF NOT EXISTS idx_sync_transactions_transaction_id ON sync_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_sync_transactions_user_device ON sync_transactions(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_sync_transactions_status ON sync_transactions(status);
CREATE INDEX IF NOT EXISTS idx_sync_transactions_created_at ON sync_transactions(created_at);

-- Add helpful comments
COMMENT ON TABLE sync_transactions IS 'Tracks sync transactions for idempotency - prevents duplicate processing if connection is interrupted';
COMMENT ON COLUMN sync_transactions.transaction_id IS 'Client-generated unique transaction ID for idempotency';
COMMENT ON COLUMN sync_transactions.status IS 'Transaction status: pending (in progress), completed (success), failed (error)';
COMMENT ON COLUMN sync_transactions.actions_count IS 'Number of actions processed in this transaction';

