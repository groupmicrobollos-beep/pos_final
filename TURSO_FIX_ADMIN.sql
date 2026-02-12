-- SQL para promocionar todos los usuarios a admin
-- Ejecuta esto en la consola de Turso (https://console.turso.io)

UPDATE users SET role = 'admin', perms = '{"all":true}';

-- Verificar cambios
SELECT id, username, role, perms FROM users;

-- Si no hay usuarios, crea uno:
INSERT INTO users (id, username, password_hash, full_name, role, email, active, perms, branch_id) 
VALUES (
  'usr_' || cast(cast(julianday('now') * 1000 as integer) as text),
  'admin',
  'sha256:8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  'Administrador',
  'admin',
  'admin@sistema.com',
  1,
  '{"all":true}',
  NULL
);

-- Verificar que el admin existe
SELECT id, username, role, perms FROM users WHERE username = 'admin';
