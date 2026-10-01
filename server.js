const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./src/database');

const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const orderRoutes = require('./src/routes/orders');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar tabelas e integridade da base de dados
initDatabase();

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir ficheiros estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API REST
app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Endpoint de verificação de integridade do servidor
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        database: 'SQLite 3 (WAL mode active)',
        timestamp: new Date().toISOString()
    });
});

// Fallback SPA para todas as outras rotas não tratadas
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicialização do servidor
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Servidor TechStore BD ativo em http://localhost:${PORT}`);
    console.log(`📦 Base de Dados SQLite conectada com integridade ativada.`);
    console.log(`====================================================`);
});
