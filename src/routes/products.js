const express = require('express');
const { db } = require('../database');
const { authRequired, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 1. Obter todas as categorias com contagem de produtos (SQL GROUP BY)
router.get('/categories', (req, res) => {
    try {
        const query = `
            SELECT 
                c.id, 
                c.name, 
                c.slug, 
                c.description, 
                c.icon,
                COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            GROUP BY c.id
            ORDER BY c.name ASC
        `;
        const categories = db.prepare(query).all();
        res.json({ categories });
    } catch (err) {
        console.error('Erro ao listar categorias:', err);
        res.status(500).json({ error: 'Erro ao obter categorias.' });
    }
});

// 2. Listar produtos com filtros, ordenação e média de avaliações (SQL JOINs + AVG)
router.get('/products', (req, res) => {
    try {
        const { category, search, minPrice, maxPrice, sort } = req.query;

        let sql = `
            SELECT 
                p.id,
                p.category_id,
                c.name as category_name,
                c.slug as category_slug,
                p.name,
                p.description,
                p.price,
                p.stock,
                p.image_url,
                p.created_at,
                ROUND(AVG(r.rating), 1) as avg_rating,
                COUNT(r.id) as review_count
            FROM products p
            INNER JOIN categories c ON p.category_id = c.id
            LEFT JOIN reviews r ON p.id = r.product_id
            WHERE 1=1
        `;
        const params = [];

        if (category) {
            sql += ` AND (c.slug = ? OR c.id = ?)`;
            params.push(category, category);
        }

        if (search) {
            sql += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
            params.push(`%${search.trim()}%`, `%${search.trim()}%`);
        }

        if (minPrice) {
            sql += ` AND p.price >= ?`;
            params.push(Number(minPrice));
        }

        if (maxPrice) {
            sql += ` AND p.price <= ?`;
            params.push(Number(maxPrice));
        }

        sql += ` GROUP BY p.id`;

        // Ordenação
        switch (sort) {
            case 'price_asc':
                sql += ` ORDER BY p.price ASC`;
                break;
            case 'price_desc':
                sql += ` ORDER BY p.price DESC`;
                break;
            case 'name_asc':
                sql += ` ORDER BY p.name ASC`;
                break;
            case 'rating':
                sql += ` ORDER BY avg_rating DESC NULLS LAST`;
                break;
            case 'newest':
            default:
                sql += ` ORDER BY p.created_at DESC`;
                break;
        }

        const products = db.prepare(sql).all(...params);
        res.json({ products });
    } catch (err) {
        console.error('Erro ao listar produtos:', err);
        res.status(500).json({ error: 'Erro ao carregar produtos.' });
    }
});

// 3. Obter detalhes de um produto e suas avaliações
router.get('/products/:id', (req, res) => {
    try {
        const productId = req.params.id;

        const productQuery = `
            SELECT 
                p.id,
                p.category_id,
                c.name as category_name,
                c.slug as category_slug,
                p.name,
                p.description,
                p.price,
                p.stock,
                p.image_url,
                p.created_at,
                ROUND(AVG(r.rating), 1) as avg_rating,
                COUNT(r.id) as review_count
            FROM products p
            INNER JOIN categories c ON p.category_id = c.id
            LEFT JOIN reviews r ON p.id = r.product_id
            WHERE p.id = ?
            GROUP BY p.id
        `;

        const product = db.prepare(productQuery).get(productId);

        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }

        // Buscar avaliações individuais com o nome do utilizador
        const reviewsQuery = `
            SELECT 
                r.id,
                r.rating,
                r.comment,
                r.created_at,
                u.name as user_name
            FROM reviews r
            INNER JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC
        `;
        const reviews = db.prepare(reviewsQuery).all(productId);

        res.json({
            product: {
                ...product,
                reviews
            }
        });
    } catch (err) {
        console.error('Erro ao obter detalhes do produto:', err);
        res.status(500).json({ error: 'Erro ao carregar produto.' });
    }
});

// 4. Submeter avaliação para um produto (requer autenticação)
router.post('/products/:id/reviews', authRequired, (req, res) => {
    try {
        const productId = req.params.id;
        const { rating, comment } = req.body;
        const userId = req.user.id;

        const numRating = parseInt(rating, 10);
        if (!numRating || numRating < 1 || numRating > 5) {
            return res.status(400).json({ error: 'A avaliação deve ser entre 1 e 5 estrelas.' });
        }

        // Verificar se produto existe
        const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }

        // Inserir ou atualizar avaliação (UPSERT com SQL padrão SQLite)
        const stmt = db.prepare(`
            INSERT INTO reviews (product_id, user_id, rating, comment)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(product_id, user_id) 
            DO UPDATE SET rating = excluded.rating, comment = excluded.comment, created_at = CURRENT_TIMESTAMP
        `);

        stmt.run(productId, userId, numRating, comment ? comment.trim() : null);

        res.json({ message: 'Avaliação registada com sucesso!' });
    } catch (err) {
        console.error('Erro ao submeter avaliação:', err);
        res.status(500).json({ error: 'Erro ao guardar avaliação.' });
    }
});

module.exports = router;
