const express = require('express');
const { db } = require('../database');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// 1. Criar Encomenda com Transação Atómica (ACID)
// Demonstra o uso de Transações na Base de Dados para garantir consistência de stock
router.post('/', authRequired, (req, res) => {
    const { items, shipping_address, payment_method } = req.body;
    const userId = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'O carrinho está vazio.' });
    }

    if (!shipping_address || !shipping_address.trim()) {
        return res.status(400).json({ error: 'A morada de envio é obrigatória.' });
    }

    const validPaymentMethods = ['multibanco', 'mbway', 'cartao', 'paypal'];
    const selectedPayment = validPaymentMethods.includes(payment_method) ? payment_method : 'multibanco';

    // Transação Atómica do SQLite (Tudo ou Nada)
    const placeOrderTransaction = db.transaction(() => {
        let calculatedTotal = 0;
        const verifiedItems = [];

        // 1. Validar disponibilidade de stock e obter preços atuais
        const checkProductStmt = db.prepare('SELECT id, name, price, stock FROM products WHERE id = ?');
        
        for (const item of items) {
            const product = checkProductStmt.get(item.productId);
            if (!product) {
                throw new Error(`Produto #${item.productId} não foi encontrado.`);
            }

            const quantity = parseInt(item.quantity, 10);
            if (isNaN(quantity) || quantity <= 0) {
                throw new Error(`Quantidade inválida para o produto "${product.name}".`);
            }

            if (product.stock < quantity) {
                throw new Error(`Stock insuficiente para "${product.name}". Disponível: ${product.stock}, Solicitado: ${quantity}`);
            }

            const itemSubtotal = product.price * quantity;
            calculatedTotal += itemSubtotal;

            verifiedItems.push({
                product,
                quantity,
                unitPrice: product.price
            });
        }

        // 2. Inserir Registo Principal na tabela `orders`
        const insertOrderStmt = db.prepare(`
            INSERT INTO orders (user_id, total, status, shipping_address, payment_method)
            VALUES (?, ?, 'pago', ?, ?)
        `);

        const orderResult = insertOrderStmt.run(
            userId,
            calculatedTotal,
            shipping_address.trim(),
            selectedPayment
        );
        const orderId = orderResult.lastInsertRowid;

        // 3. Inserir itens na tabela `order_items` e abater stock na tabela `products`
        const insertItemStmt = db.prepare(`
            INSERT INTO order_items (order_id, product_id, quantity, unit_price)
            VALUES (?, ?, ?, ?)
        `);

        const updateStockStmt = db.prepare(`
            UPDATE products 
            SET stock = stock - ? 
            WHERE id = ?
        `);

        for (const vItem of verifiedItems) {
            insertItemStmt.run(orderId, vItem.product.id, vItem.quantity, vItem.unitPrice);
            updateStockStmt.run(vItem.quantity, vItem.product.id);
        }

        return {
            orderId,
            total: calculatedTotal,
            itemsCount: verifiedItems.length
        };
    });

    try {
        const result = placeOrderTransaction();
        res.status(201).json({
            message: 'Encomenda realizada com sucesso!',
            orderId: result.orderId,
            total: result.total
        });
    } catch (err) {
        console.error('Falha na transação de encomenda:', err.message);
        res.status(400).json({ error: err.message || 'Falha ao processar encomenda.' });
    }
});

// 2. Listar Encomendas do Utilizador Autenticado (Histórico)
router.get('/my-orders', authRequired, (req, res) => {
    try {
        const userId = req.user.id;

        // Obter encomendas
        const orders = db.prepare(`
            SELECT 
                id, 
                total, 
                status, 
                shipping_address, 
                payment_method, 
                created_at
            FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
        `).all(userId);

        // Para cada encomenda, obter os itens com dados do produto (JOIN)
        const getItemsStmt = db.prepare(`
            SELECT 
                oi.id,
                oi.product_id,
                oi.quantity,
                oi.unit_price,
                p.name as product_name,
                p.image_url
            FROM order_items oi
            INNER JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `);

        const fullOrders = orders.map(order => ({
            ...order,
            items: getItemsStmt.all(order.id)
        }));

        res.json({ orders: fullOrders });
    } catch (err) {
        console.error('Erro ao listar encomendas do utilizador:', err);
        res.status(500).json({ error: 'Erro ao obter histórico de encomendas.' });
    }
});

// 3. Obter Detalhes de uma Encomenda Específica
router.get('/:id', authRequired, (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        let orderQuery = `
            SELECT 
                o.id, 
                o.user_id,
                u.name as user_name,
                u.email as user_email,
                o.total, 
                o.status, 
                o.shipping_address, 
                o.payment_method, 
                o.created_at
            FROM orders o
            INNER JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `;

        if (!isAdmin) {
            orderQuery += ` AND o.user_id = ?`;
        }

        const order = isAdmin 
            ? db.prepare(orderQuery).get(orderId) 
            : db.prepare(orderQuery).get(orderId, userId);

        if (!order) {
            return res.status(404).json({ error: 'Encomenda não encontrada.' });
        }

        const items = db.prepare(`
            SELECT 
                oi.id,
                oi.product_id,
                oi.quantity,
                oi.unit_price,
                (oi.quantity * oi.unit_price) as subtotal,
                p.name as product_name,
                p.image_url
            FROM order_items oi
            INNER JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `).all(orderId);

        res.json({
            order: {
                ...order,
                items
            }
        });
    } catch (err) {
        console.error('Erro ao obter encomenda:', err);
        res.status(500).json({ error: 'Erro ao carregar detalhes da encomenda.' });
    }
});

module.exports = router;
