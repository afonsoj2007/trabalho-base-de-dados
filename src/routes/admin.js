const express = require('express');
const { db } = require('../database');
const { adminRequired } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas deste router exigem autenticação de Administrador
router.use(adminRequired);

// 1. Estatísticas e Métricas da Base de Dados (Consultas Analíticas SQL)
router.get('/stats', (req, res) => {
    try {
        // Estatísticas Gerais
        const generalStats = db.prepare(`
            SELECT 
                (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelado') as total_revenue,
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COUNT(*) FROM users WHERE role = 'client') as total_clients,
                (SELECT COUNT(*) FROM products) as total_products,
                (SELECT COUNT(*) FROM products WHERE stock <= 5) as low_stock_count
        `).get();

        // Top 5 Produtos Mais Vendidos (JOIN + GROUP BY + SUM)
        const topProducts = db.prepare(`
            SELECT 
                p.id,
                p.name,
                c.name as category_name,
                p.price,
                COALESCE(SUM(oi.quantity), 0) as units_sold,
                ROUND(COALESCE(SUM(oi.quantity * oi.unit_price), 0), 2) as product_revenue
            FROM products p
            INNER JOIN categories c ON p.category_id = c.id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelado'
            GROUP BY p.id
            ORDER BY units_sold DESC
            LIMIT 5
        `).all();

        // Vendas por Categoria (Multi-tabela JOIN)
        const categoryStats = db.prepare(`
            SELECT 
                c.name as category_name,
                COUNT(DISTINCT p.id) as total_products,
                COALESCE(SUM(oi.quantity), 0) as total_units_sold,
                ROUND(COALESCE(SUM(oi.quantity * oi.unit_price), 0), 2) as category_revenue
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelado'
            GROUP BY c.id
            ORDER BY category_revenue DESC
        `).all();

        // Distribuição de Estados das Encomendas
        const ordersByStatus = db.prepare(`
            SELECT 
                status, 
                COUNT(*) as count,
                ROUND(COALESCE(SUM(total), 0), 2) as total_amount
            FROM orders
            GROUP BY status
        `).all();

        res.json({
            general: generalStats,
            topProducts,
            categoryStats,
            ordersByStatus
        });
    } catch (err) {
        console.error('Erro ao obter estatísticas de administração:', err);
        res.status(500).json({ error: 'Erro ao calcular métricas da base de dados.' });
    }
});

// 2. Listar Todas as Encomendas do Sistema
router.get('/orders', (req, res) => {
    try {
        const orders = db.prepare(`
            SELECT 
                o.id,
                o.user_id,
                u.name as client_name,
                u.email as client_email,
                o.total,
                o.status,
                o.payment_method,
                o.shipping_address,
                o.created_at,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as total_items
            FROM orders o
            INNER JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        `).all();

        res.json({ orders });
    } catch (err) {
        console.error('Erro ao carregar todas as encomendas:', err);
        res.status(500).json({ error: 'Erro ao carregar encomendas.' });
    }
});

// 3. Atualizar Estado de uma Encomenda
router.patch('/orders/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pendente', 'pago', 'enviado', 'entregue', 'cancelado'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado de encomenda inválido.' });
        }

        const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
        const info = stmt.run(status, req.params.id);

        if (info.changes === 0) {
            return res.status(404).json({ error: 'Encomenda não encontrada.' });
        }

        res.json({ message: `Estado da encomenda atualizado para "${status}".` });
    } catch (err) {
        console.error('Erro ao atualizar estado da encomenda:', err);
        res.status(500).json({ error: 'Erro ao atualizar estado.' });
    }
});

// 4. Criar Novo Produto (CRUD)
router.post('/products', (req, res) => {
    try {
        const { category_id, name, description, price, stock, image_url } = req.body;

        if (!category_id || !name || price === undefined || stock === undefined) {
            return res.status(400).json({ error: 'Categoria, nome, preço e stock são campos obrigatórios.' });
        }

        const numPrice = parseFloat(price);
        const numStock = parseInt(stock, 10);

        if (isNaN(numPrice) || numPrice < 0) {
            return res.status(400).json({ error: 'Preço deve ser um número positivo.' });
        }
        if (isNaN(numStock) || numStock < 0) {
            return res.status(400).json({ error: 'Stock deve ser um número inteiro não negativo.' });
        }

        const stmt = db.prepare(`
            INSERT INTO products (category_id, name, description, price, stock, image_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            category_id,
            name.trim(),
            description ? description.trim() : null,
            numPrice,
            numStock,
            image_url ? image_url.trim() : 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80'
        );

        res.status(201).json({
            message: 'Produto criado com sucesso!',
            productId: result.lastInsertRowid
        });
    } catch (err) {
        console.error('Erro ao criar produto:', err);
        res.status(500).json({ error: 'Erro ao criar produto na base de dados.' });
    }
});

// 5. Editar Produto (CRUD)
router.put('/products/:id', (req, res) => {
    try {
        const { category_id, name, description, price, stock, image_url } = req.body;
        const productId = req.params.id;

        const numPrice = parseFloat(price);
        const numStock = parseInt(stock, 10);

        const stmt = db.prepare(`
            UPDATE products
            SET category_id = ?, name = ?, description = ?, price = ?, stock = ?, image_url = ?
            WHERE id = ?
        `);

        const result = stmt.run(category_id, name, description, numPrice, numStock, image_url, productId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }

        res.json({ message: 'Produto atualizado com sucesso!' });
    } catch (err) {
        console.error('Erro ao atualizar produto:', err);
        res.status(500).json({ error: 'Erro ao atualizar produto.' });
    }
});

// 6. Eliminar Produto (CRUD com proteção de integridade referencial)
router.delete('/products/:id', (req, res) => {
    try {
        const productId = req.params.id;

        // Verificar se existem encomendas com este produto
        const existingOrder = db.prepare('SELECT id FROM order_items WHERE product_id = ? LIMIT 1').get(productId);
        if (existingOrder) {
            return res.status(400).json({ 
                error: 'Não é possível eliminar este produto porque já existem encomendas registadas com ele (Integridade Referencial ON DELETE RESTRICT).' 
            });
        }

        const stmt = db.prepare('DELETE FROM products WHERE id = ?');
        const result = stmt.run(productId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Produto não encontrado.' });
        }

        res.json({ message: 'Produto removido com sucesso.' });
    } catch (err) {
        console.error('Erro ao eliminar produto:', err);
        res.status(500).json({ error: 'Erro ao remover produto da base de dados.' });
    }
});

// 7. Criar Nova Categoria
router.post('/categories', (req, res) => {
    try {
        const { name, description, icon } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
        }

        const slug = name.trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '-');

        const stmt = db.prepare(`
            INSERT INTO categories (name, slug, description, icon)
            VALUES (?, ?, ?, ?)
        `);

        stmt.run(name.trim(), slug, description || null, icon || 'tag');

        res.status(201).json({ message: 'Categoria criada com sucesso!' });
    } catch (err) {
        console.error('Erro ao criar categoria:', err);
        res.status(400).json({ error: 'Categoria já existente ou dados inválidos.' });
    }
});

// 8. Explorador SQL Dinâmico (Perfeito para demonstração ao professor)
// Executa consultas SELECT de leitura e retorna as colunas e os dados
router.post('/sql-runner', (req, res) => {
    try {
        const { query } = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Consulta SQL não fornecida.' });
        }

        const trimmed = query.trim();
        const upper = trimmed.toUpperCase();

        // Segurança: Permitir apenas consultas de leitura (SELECT, EXPLAIN, PRAGMA)
        if (!upper.startsWith('SELECT') && !upper.startsWith('EXPLAIN') && !upper.startsWith('PRAGMA')) {
            return res.status(403).json({ 
                error: 'Por motivos de integridade, o explorador dinâmico apenas permite consultas de leitura (SELECT).' 
            });
        }

        const startTime = Date.now();
        const rows = db.prepare(trimmed).all();
        const executionTimeMs = Date.now() - startTime;

        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

        res.json({
            success: true,
            columns,
            rows,
            rowCount: rows.length,
            executionTimeMs
        });
    } catch (err) {
        res.status(400).json({ 
            success: false,
            error: err.message 
        });
    }
});

module.exports = router;
