const jwt = require('jsonwebtoken');
const { db } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-trabalho-base-de-dados-2026';

function getTokenFromRequest(req) {
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return null;
}

function authRequired(req, res, next) {
    const token = getTokenFromRequest(req);
    if (!token) {
        return res.status(401).json({ error: 'Acesso não autorizado. Por favor faça login.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.prepare('SELECT id, name, email, role, phone, address FROM users WHERE id = ?').get(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'Utilizador não encontrado ou sessão expirada.' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    }
}

function adminRequired(req, res, next) {
    authRequired(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso restrito apenas a administradores.' });
        }
        next();
    });
}

function optionalAuth(req, res, next) {
    const token = getTokenFromRequest(req);
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = db.prepare('SELECT id, name, email, role, phone, address FROM users WHERE id = ?').get(decoded.id);
            if (user) {
                req.user = user;
            }
        } catch (err) {
            // Ignorar erro se opcional
        }
    }
    next();
}

module.exports = {
    JWT_SECRET,
    authRequired,
    adminRequired,
    optionalAuth
};
