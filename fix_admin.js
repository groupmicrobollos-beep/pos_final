#!/usr/bin/env node
/**
 * Script para promocionar usuarios a admin o crear admin por defecto
 * Uso: node fix_admin.js
 */

const { createClient } = require('@libsql/client');
const crypto = require('crypto');
require('dotenv').config();

const rawUrl = process.env.TURSO_DATABASE_URL;
const url = rawUrl ? rawUrl.replace("libsql://", "https://") : undefined;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error('❌ ERROR: TURSO_DATABASE_URL o TURSO_AUTH_TOKEN no están configuradas');
    console.error('Asegúrate de que .env contiene ambas variables');
    process.exit(1);
}

const db = createClient({
    url: url,
    authToken: authToken,
});

async function main() {
    try {
        console.log('🔍 Conectando a Turso...');
        
        // Contar usuarios existentes
        const countResult = await db.execute("SELECT COUNT(*) as count FROM users");
        const userCount = countResult.rows[0]?.count || 0;
        
        console.log(`📊 Total de usuarios en BD: ${userCount}`);
        
        if (userCount === 0) {
            console.log('⚙️ No hay usuarios. Creando admin default...');
            const passHash = "sha256:" + crypto.createHash('sha256').update("admin123").digest('hex');
            const adminId = `usr_${Date.now()}`;
            
            await db.execute({
                sql: `INSERT INTO users (id, username, password_hash, full_name, role, email, active, perms, branch_id) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [adminId, 'admin', passHash, 'Administrador', 'admin', 'admin@sistema.com', 1, '{"all":true}', null]
            });
            
            console.log('✅ Admin creado:');
            console.log('   Usuario: admin');
            console.log('   Contraseña: admin123');
            console.log('   ID: ' + adminId);
        } else {
            console.log('👥 Usuarios existentes encontrados. Verificando roles...');
            
            // Obtener todos los usuarios
            const result = await db.execute("SELECT id, username, role FROM users ORDER BY created_at ASC LIMIT 10");
            const users = result.rows || [];
            
            console.log('\n📋 Usuarios actuales:');
            for (const user of users) {
                console.log(`   - ${user.username} (${user.id}) → Rol: ${user.role}`);
            }
            
            // Actualizar TODOS los usuarios para que sean admin
            console.log('\n⚡ Promocionando TODOS los usuarios a admin...');
            
            const adminPerms = JSON.stringify({ all: true });
            const updateResult = await db.execute({
                sql: "UPDATE users SET role = ?, perms = ? WHERE 1=1",
                args: ['admin', adminPerms]
            });
            
            console.log(`✅ ${userCount} usuario(s) actualizado(s) a admin`);
            
            // Verificar cambios
            console.log('\n✔️ Verificando cambios:');
            const verifyResult = await db.execute("SELECT id, username, role, perms FROM users LIMIT 10");
            for (const user of verifyResult.rows) {
                let perms = user.perms;
                if (typeof perms === 'string') {
                    try { perms = JSON.parse(perms); } catch (e) { }
                }
                console.log(`   ✓ ${user.username} → Rol: ${user.role}, Perms: ${JSON.stringify(perms)}`);
            }
        }
        
        console.log('\n🎉 ¡HECHO! Ya puedes hacer login');
        console.log('   Usuario: admin');
        console.log('   Contraseña: admin123');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
        process.exit(1);
    }
}

main();
