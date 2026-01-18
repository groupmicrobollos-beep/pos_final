-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  perms TEXT, -- JSON
  active BOOLEAN DEFAULT 1,
  reset_token TEXT,
  reset_token_expires DATETIME,
  branch_id TEXT, -- Relation to branches
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Products & Services
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  price REAL DEFAULT 0,
  type TEXT DEFAULT 'product', -- 'product' or 'service'
  category TEXT,
  stock INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Branches (Sucursales)
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  cuit TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers (Proveedores)
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_info TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Quotes (Presupuestos)
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  client_name TEXT,
  client_dni TEXT,
  client_address TEXT,
  client_phone TEXT,
  client_email TEXT,
  vehicle TEXT,
  siniestro TEXT, -- Nro de siniestro
  branch_id TEXT,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  total REAL DEFAULT 0,
  items TEXT, -- JSON array of items {id, description, price, quantity, type, vat_enabled}
  signature TEXT, -- Base64 string
  vat_policy TEXT DEFAULT 'all', -- 'all', 'services', 'parts'
  status TEXT DEFAULT 'draft',
  created_by TEXT,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);
