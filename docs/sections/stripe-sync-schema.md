## Stripe Sync Database Schema

Syncing Stripe data to your database allows you to query payment data alongside your app data, reduce API calls, and build faster dashboards.

```sql
-- Products from Stripe
CREATE TABLE stripe_products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Prices from Stripe
CREATE TABLE stripe_prices (
  id VARCHAR(255) PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES stripe_products(id),
  currency VARCHAR(3) NOT NULL,
  unit_amount INTEGER,
  recurring_interval VARCHAR(50),
  active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customer mapping
CREATE TABLE stripe_customers (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE stripe_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  customer_id VARCHAR(255) REFERENCES stripe_customers(id),
  price_id VARCHAR(255) REFERENCES stripe_prices(id),
  status VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

These tables mirror Stripe's data model while adding foreign key relationships to your local users table.
