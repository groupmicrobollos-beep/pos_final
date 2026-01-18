const { db } = require('./db');
const crypto = require('crypto');

function hashPassword(plain) {
    return "sha256:" + crypto.createHash('sha256').update(plain).digest('hex');
}

async function create() {
    const user = {
        id: crypto.randomUUID(),
        username: 'admin',
        password: 'admin123',
        email: 'admin@microbollos.com',
        full_name: 'Administrador',
        role: 'admin',
        active: 1,
        perms: JSON.stringify({ all: true })
    };

    const passHash = hashPassword(user.password);

    try {
        await db.execute({
            sql: `INSERT INTO users (id, username, email, password_hash, full_name, role, active, perms)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [user.id, user.username, user.email, passHash, user.full_name, user.role, user.active, user.perms]
        });
        console.log('✅ Usuario creado con éxito');
        console.log('---------------------------');
        console.log('Usuario:  admin');
        console.log('Password: admin123');
        console.log('---------------------------');
    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            console.log('⚠️ El usuario "admin" ya existe.');
        } else {
            console.error('Error creating user:', e);
        }
    }
}

create();
