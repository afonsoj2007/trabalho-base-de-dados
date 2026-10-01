# 🛒 TechStore BD - Aplicação Web com Base de Dados Relacional

Projeto académico completo de **Base de Dados Relacional** com aplicação Web interativa, sistema de autenticação seguro (senhas com hash bcrypt + JWT), catálogo de produtos, gestão transacional de encomendas (ACID) e painel analítico com **Explorador SQL em tempo real**.

---

## 🚀 Tecnologias Utilizadas

- **SGBD (Base de Dados):** SQLite 3 (com `better-sqlite3`, WAL mode e integridade referencial ativa).
- **Backend:** Node.js (v24) + Express.
- **Autenticação:** JSON Web Tokens (JWT) + Hashing com `bcryptjs`.
- **Frontend:** HTML5, Tailwind CSS, JavaScript Vanilla (ES6+), FontAwesome Icons.
- **Transações:** Atomicidade e Consistência (ACID) com `db.transaction()`.

---

## 🗄️ Modelo Relacional da Base de Dados

O esquema físico é composto por 6 entidades relacionais normalizadas (3FN):

```
       +-------------+
       |    users    |
       +-------------+
        | 1       | 1
        |         |
        | N       | N
  +------------+  +-------------+
  |   orders   |  |   reviews   |
  +------------+  +-------------+
        | 1              | N
        |                |
        | N              | 1
+---------------+  +-------------+  N      1  +--------------+
|  order_items  |--|  products   |------------|  categories  |
+---------------+  +-------------+            +--------------+
```

### Descrição das Tabelas e Cardinalidades:

1. **`users`**:
   - `id` (PK, INT AUTOINCREMENT)
   - `name` (TEXT NOT NULL)
   - `email` (TEXT UNIQUE NOT NULL)
   - `password_hash` (TEXT NOT NULL) - *Cifrada com bcrypt*
   - `role` (TEXT NOT NULL CHECK 'admin' / 'client')
   - `phone`, `address`, `created_at`

2. **`categories`**:
   - `id` (PK, INT AUTOINCREMENT)
   - `name` (TEXT UNIQUE NOT NULL)
   - `slug` (TEXT UNIQUE NOT NULL)
   - `description`, `icon`

3. **`products`**:
   - `id` (PK, INT AUTOINCREMENT)
   - `category_id` (FK &rarr; `categories.id` ON DELETE RESTRICT) &bull; *Relação 1:N*
   - `name`, `description`
   - `price` (REAL NOT NULL CHECK &ge; 0)
   - `stock` (INT NOT NULL CHECK &ge; 0)
   - `image_url`, `created_at`

4. **`orders`**:
   - `id` (PK, INT AUTOINCREMENT)
   - `user_id` (FK &rarr; `users.id` ON DELETE CASCADE) &bull; *Relação 1:N*
   - `total` (REAL NOT NULL CHECK &ge; 0)
   - `status` (TEXT CHECK 'pendente', 'pago', 'enviado', 'entregue', 'cancelado')
   - `shipping_address`, `payment_method`, `created_at`

5. **`order_items`** *(Tabela de Associação N:M entre `orders` e `products`)*:
   - `id` (PK, INT AUTOINCREMENT)
   - `order_id` (FK &rarr; `orders.id` ON DELETE CASCADE)
   - `product_id` (FK &rarr; `products.id` ON DELETE RESTRICT)
   - `quantity` (INT NOT NULL CHECK &gt; 0)
   - `unit_price` (REAL NOT NULL CHECK &ge; 0) - *Registo histórico do preço no momento da compra*

6. **`reviews`** *(Avaliações de Produtos)*:
   - `id` (PK, INT AUTOINCREMENT)
   - `product_id` (FK &rarr; `products.id` ON DELETE CASCADE)
   - `user_id` (FK &rarr; `users.id` ON DELETE CASCADE)
   - `rating` (INT NOT NULL CHECK 1..5)
   - `comment`, `created_at`
   - `UNIQUE(product_id, user_id)` &bull; *Garante que cada cliente só avalia um produto 1 vez*

---

## 🔐 Contas de Acesso Rápido (Demonstração)

A aplicação conta com botões de preenchimento automático em 1 clique na janela de login:

| Papel | Email | Palavra-passe | Funcionalidades |
| :--- | :--- | :--- | :--- |
| 👑 **Administrador** | `admin@techstore.pt` | `admin123` | Painel de métricas analíticas, CRUD de produtos e categorias, gestão de encomendas e **Explorador SQL** |
| 👤 **Cliente 1** | `afonso@email.pt` | `cliente123` | Compra de produtos, histórico de encomendas e submissão de avaliações |
| 👤 **Cliente 2** | `maria@email.pt` | `cliente123` | Compras e consulta de perfil |

---

## ⚡ Como Executar o Projeto

No terminal do seu computador (PowerShell ou CMD):

1. **Navegue até à pasta do projeto:**
   ```powershell
   cd "C:\Users\afons\.gemini\antigravity\scratch\ecommerce-database-app"
   ```

2. **(Opcional) Recriar ou repor dados de teste:**
   ```powershell
   npm run seed
   ```

3. **Iniciar o Servidor:**
   ```powershell
   npm start
   ```

4. **Abrir a Aplicação no Navegador:**
   Abra [http://localhost:3000](http://localhost:3000).

---

## 📊 Consultas SQL Destacadas para Apresentar ao Professor

No painel de administração da aplicação, existe um separador **"Explorador SQL & Esquema ER"** onde pode executar consultas ao vivo:

### 1. Produtos Mais Vendidos e Faturação (JOIN + GROUP BY + SUM):
```sql
SELECT 
    p.name AS Produto,
    c.name AS Categoria,
    p.price AS Preco_Unitario,
    COALESCE(SUM(oi.quantity), 0) AS Unidades_Vendidas,
    ROUND(COALESCE(SUM(oi.quantity * oi.unit_price), 0), 2) AS Total_Faturado
FROM products p
INNER JOIN categories c ON p.category_id = c.id
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id
ORDER BY Unidades_Vendidas DESC;
```

### 2. Média de Avaliações por Categoria (Multi-tabela JOIN + AVG):
```sql
SELECT 
    c.name AS Categoria,
    COUNT(DISTINCT p.id) AS Qtd_Produtos,
    COUNT(r.id) AS Qtd_Avaliacoes,
    ROUND(AVG(r.rating), 2) AS Media_Classificacao
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
LEFT JOIN reviews r ON p.id = r.product_id
GROUP BY c.id
ORDER BY Media_Classificacao DESC;
```

### 3. Total Gasto por Cliente (GROUP BY + HAVING):
```sql
SELECT 
    u.id AS ID_Cliente,
    u.name AS Nome,
    u.email AS Email,
    COUNT(o.id) AS Total_Encomendas,
    ROUND(SUM(o.total), 2) AS Montante_Total_Gasto
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status != 'cancelado'
GROUP BY u.id
HAVING COUNT(o.id) >= 1
ORDER BY Montante_Total_Gasto DESC;
```

---

## 🛡️ Propriedades ACID Implementadas

- **Atomicidade & Consistência:** Ao finalizar o checkout (`POST /api/orders`), o backend executa uma **transação atómica**:
  1. Valida se há unidades suficientes de cada produto selecionado no stock.
  2. Insere a encomenda em `orders`.
  3. Insere cada item em `order_items`.
  4. Abate a quantidade adquirida diretamente na coluna `stock` da tabela `products`.
  *Se qualquer um dos passos falhar (por exemplo, falta de stock de um item), toda a operação sofre ROLLBACK automático.*
