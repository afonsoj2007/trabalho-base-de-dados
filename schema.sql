-- ============================================================================
-- ESQUEMA DA BASE DE DADOS RELACIONAL: TechStore BD
-- ============================================================================
-- Trabalho prático de Base de Dados
-- Sistema de Gestão de E-commerce com Autenticação e Gestão de Encomendas
-- SGBD: SQLite 3 com suporte a Integridade Referencial (Foreign Keys)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. TABELA DE UTILIZADORES (users)
-- Armazena os clientes e administradores da plataforma com senhas cifradas (bcrypt)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. TABELA DE CATEGORIAS (categories)
-- Classificação hierárquica dos produtos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT DEFAULT 'tag'
);

-- ----------------------------------------------------------------------------
-- 3. TABELA DE PRODUTOS (products)
-- Catálogo de produtos associados a uma categoria (Relação 1:N com categories)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ----------------------------------------------------------------------------
-- 4. TABELA DE ENCOMENDAS / PEDIDOS (orders)
-- Cabeçalho da encomenda efetuada por um utilizador (Relação 1:N com users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total REAL NOT NULL DEFAULT 0.0 CHECK (total >= 0),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'enviado', 'entregue', 'cancelado')),
    shipping_address TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'multibanco' CHECK (payment_method IN ('multibanco', 'mbway', 'cartao', 'paypal')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ----------------------------------------------------------------------------
-- 5. TABELA DE ITENS DA ENCOMENDA (order_items)
-- Tabela de ligação / junção que resolve o relacionamento N:M entre orders e products
-- Contém atributos próprios: quantidade e preço unitário histórico da venda
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ----------------------------------------------------------------------------
-- 6. TABELA DE AVALIAÇÕES (reviews)
-- Feedback deixado por utilizadores para produtos (Relação N:M com restrição UNIQUE)
-- Um utilizador só pode avaliar o mesmo produto uma vez.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE(product_id, user_id)
);

-- ============================================================================
-- ÍNDICES PARA OTIMIZAÇÃO DE PERFORMANCE EM CONSULTAS FREQUENTES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
