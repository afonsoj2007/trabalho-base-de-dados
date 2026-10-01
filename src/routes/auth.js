const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { JWT_SECRET, authRequired } = require('../middleware/auth');

const router = express.Router();

// 1. Registo de Novo Utilizador
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, email e palavra-passe são obrigatórios.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'A palavra-passe deve conter pelo menos 6 caracteres.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Verificar se utilizador já existe
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
        if (existing) {
            return res.status(409).json({ error: 'Este endereço de email já se encontra registado.' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const stmt = db.prepare(`
            INSERT INTO users (name, email, password_hash, role, phone, address)
            VALUES (?, ?, ?, 'client', ?, ?)
        `);

        const result = stmt.run(name.trim(), normalizedEmail, password_hash, phone || null, address || null);

        const newUser = {
            id: result.lastInsertRowid,
            name: name.trim(),
            email: normalizedEmail,
            role: 'client',
            phone: phone || null,
            address: address || null
        };

        const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        res.status(201).json({
            message: 'Conta criada com sucesso!',
            user: newUser,
            token
        });
    } catch (err) {
        console.error('Erro no registo:', err);
        res.status(500).json({ error: 'Erro interno ao criar conta.' });
    }
});

// 2. Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email e palavra-passe são obrigatórios.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas. Verifique o email ou senha.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Credenciais inválidas. Verifique o email ou senha.' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });

        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            address: user.address
        };

        res.json({
            message: 'Sessão iniciada com sucesso!',
            user: userData,
            token
        });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro interno ao iniciar sessão.' });
    }
});

// 3. Obter Perfil Atual
router.get('/me', authRequired, (req, res) => {
    res.json({ user: req.user });
});

// 4. Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Sessão terminada com sucesso.' });
});

// 5. Atualizar Perfil
router.put('/profile', authRequired, (req, res) => {
    try {
        const { name, phone, address } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'O nome é obrigatório.' });
        }

        db.prepare(`
            UPDATE users
            SET name = ?, phone = ?, address = ?
            WHERE id = ?
        `).run(name.trim(), phone || null, address || null, req.user.id);

        const updatedUser = db.prepare('SELECT id, name, email, role, phone, address FROM users WHERE id = ?').get(req.user.id);

        res.json({
            message: 'Perfil atualizado com sucesso!',
            user: updatedUser
        });
    } catch (err) {
        console.error('Erro ao atualizar perfil:', err);
        res.status(500).json({ error: 'Erro ao atualizar dados do perfil.' });
    }
});

module.exports = router;
