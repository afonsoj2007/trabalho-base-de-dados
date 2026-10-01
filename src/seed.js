const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('./database');

async function seed() {
    initDatabase();

    console.log('🌱 A semear a base de dados com dados iniciais...');

    // 1. Inserir Utilizadores
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount === 0) {
        const insertUser = db.prepare(`
            INSERT INTO users (name, email, password_hash, role, phone, address)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const hashAdmin = await bcrypt.hash('admin123', 10);
        const hashClient1 = await bcrypt.hash('cliente123', 10);
        const hashClient2 = await bcrypt.hash('cliente123', 10);

        insertUser.run('Administrador', 'admin@techstore.pt', hashAdmin, 'admin', '+351 912 345 678', 'Av. da Liberdade 100, Lisboa');
        insertUser.run('Afonso Silva', 'afonso@email.pt', hashClient1, 'client', '+351 923 456 789', 'Rua de Santa Catarina 45, Porto');
        insertUser.run('Maria Santos', 'maria@email.pt', hashClient2, 'client', '+351 934 567 890', 'Largo do Rato 12, Coimbra');

        console.log('✅ Utilizadores de teste inseridos.');
    }

    // 2. Inserir Categorias
    const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
    if (catCount === 0) {
        const insertCategory = db.prepare(`
            INSERT INTO categories (name, slug, description, icon)
            VALUES (?, ?, ?, ?)
        `);

        insertCategory.run('Portáteis & PCs', 'computadores', 'Laptops, ultrabooks e computadores desktop de alta performance', 'laptop');
        insertCategory.run('Smartphones & Tablets', 'smartphones', 'Dispositivos móveis topo de gama, 5G e ecrãs OLED', 'smartphone');
        insertCategory.run('Gaming & Consolas', 'gaming', 'Periféricos RGB mecânicos, monitores gaming e comandos', 'gamepad-2');
        insertCategory.run('Áudio & Acessórios', 'audio', 'Auscultadores sem fios com cancelamento de ruído e colunas', 'headphones');

        console.log('✅ Categorias inseridas.');
    }

    // 3. Inserir Produtos
    const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    if (prodCount === 0) {
        const cats = db.prepare('SELECT id, slug FROM categories').all();
        const catMap = {};
        cats.forEach(c => catMap[c.slug] = c.id);

        const insertProduct = db.prepare(`
            INSERT INTO products (category_id, name, description, price, stock, image_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const products = [
            {
                cat: 'computadores',
                name: 'MacBook Pro 14" M3 Pro',
                description: 'Processador Apple M3 Pro de 12 núcleos, 18GB de memória unificada, 512GB SSD e ecrã Liquid Retina XDR de 120Hz.',
                price: 1899.99,
                stock: 12,
                image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'
            },
            {
                cat: 'computadores',
                name: 'Dell XPS 15 OLED Touch',
                description: 'Intel Core i7 13ª Geração, 32GB RAM DDR5, 1TB NVMe SSD, gráfica NVIDIA RTX 4060 e acabamento em alumínio usinado.',
                price: 1549.50,
                stock: 8,
                image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80'
            },
            {
                cat: 'computadores',
                name: 'Lenovo ThinkPad X1 Carbon Gen 11',
                description: 'Ultra portátil de topo empresarial, ultraleve em fibra de carbono, Intel Core i7, 16GB RAM e autonomia até 16h.',
                price: 1399.00,
                stock: 15,
                image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80'
            },
            {
                cat: 'smartphones',
                name: 'iPhone 16 Pro 256GB Titânio',
                description: 'Novo chip A18 Pro, estrutura resistente em titânio aeroespacial, câmara de 48MP com zoom 5x e botão de controlo de câmara.',
                price: 1249.00,
                stock: 20,
                image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80'
            },
            {
                cat: 'smartphones',
                name: 'Samsung Galaxy S24 Ultra 512GB',
                description: 'Processador Snapdragon 8 Gen 3 for Galaxy, ecrã Dynamic AMOLED 2X de 6.8", caneta S-Pen integrada e recursos Galaxy AI.',
                price: 1199.99,
                stock: 14,
                image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=800&q=80'
            },
            {
                cat: 'smartphones',
                name: 'Google Pixel 9 Pro 128GB',
                description: 'Chip Google Tensor G4 com IA avançada, ecrã Super Actua de 120Hz e a melhor fotografia computacional do mercado.',
                price: 949.00,
                stock: 10,
                image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80'
            },
            {
                cat: 'gaming',
                name: 'Teclado Mecânico Custom Wireless RGB',
                description: 'Switches táteis lubrificados de fábrica, estrutura Gasket-mount com isolamento acústico e ligação Bluetooth / 2.4GHz.',
                price: 149.90,
                stock: 25,
                image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80'
            },
            {
                cat: 'gaming',
                name: 'Rato Gaming Sem Fios Ultraleve 4K',
                description: 'Sensor ótico de 26.000 DPI, taxa de atualização sem fios de 4000Hz, bateria de 80h e peso pena de apenas 49 gramas.',
                price: 89.90,
                stock: 30,
                image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80'
            },
            {
                cat: 'gaming',
                name: 'Monitor Gaming 27" QHD 240Hz Fast IPS',
                description: 'Resolução 2560x1440, tempo de resposta de 0.5ms GtG, compatível com G-Sync e AMD FreeSync Premium Pro.',
                price: 379.99,
                stock: 7,
                image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80'
            },
            {
                cat: 'audio',
                name: 'Sony WH-1000XM5 Auscultadores ANC',
                description: 'Cancelamento de ruído líder de mercado com 8 microfones, áudio de alta resolução Hi-Res sem fios e 30h de autonomia.',
                price: 299.99,
                stock: 18,
                image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'
            },
            {
                cat: 'audio',
                name: 'AirPods Pro 2ª Geração USB-C',
                description: 'Áudio adaptativo ativo, modo transparência personalizado, cancelamento de ruído até 2x mais potente e estojo MagSafe USB-C.',
                price: 249.00,
                stock: 22,
                image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80'
            },
            {
                cat: 'audio',
                name: 'Coluna Bluetooth Portátil Hi-Fi 40W',
                description: 'Som estéreo envolvente de 360°, proteção IPX7 à prova de água e pó, bateria de 24 horas e emparelhamento TWS duplo.',
                price: 79.90,
                stock: 40,
                image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80'
            }
        ];

        for (const p of products) {
            insertProduct.run(catMap[p.cat], p.name, p.description, p.price, p.stock, p.image);
        }

        console.log('✅ Produtos inseridos.');
    }

    // 4. Inserir Encomendas de Teste
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    if (orderCount === 0) {
        const afonso = db.prepare('SELECT id FROM users WHERE email = ?').get('afonso@email.pt');
        const maria = db.prepare('SELECT id FROM users WHERE email = ?').get('maria@email.pt');
        const prods = db.prepare('SELECT id, price FROM products LIMIT 5').all();

        const insertOrder = db.prepare(`
            INSERT INTO orders (user_id, total, status, shipping_address, payment_method, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now', ?))
        `);

        const insertOrderItem = db.prepare(`
            INSERT INTO order_items (order_id, product_id, quantity, unit_price)
            VALUES (?, ?, ?, ?)
        `);

        // Encomenda 1 (Afonso - Paga)
        const order1Info = insertOrder.run(
            afonso.id,
            prods[0].price + prods[3].price,
            'pago',
            'Rua de Santa Catarina 45, 4000-442 Porto',
            'mbway',
            '-3 days'
        );
        insertOrderItem.run(order1Info.lastInsertRowid, prods[0].id, 1, prods[0].price);
        insertOrderItem.run(order1Info.lastInsertRowid, prods[3].id, 1, prods[3].price);

        // Encomenda 2 (Maria - Enviada)
        const order2Info = insertOrder.run(
            maria.id,
            prods[1].price * 1,
            'enviado',
            'Largo do Rato 12, 3000-111 Coimbra',
            'multibanco',
            '-1 days'
        );
        insertOrderItem.run(order2Info.lastInsertRowid, prods[1].id, 1, prods[1].price);

        // Encomenda 3 (Afonso - Pendente)
        const order3Info = insertOrder.run(
            afonso.id,
            prods[2].price * 1,
            'pendente',
            'Rua de Santa Catarina 45, 4000-442 Porto',
            'cartao',
            'now'
        );
        insertOrderItem.run(order3Info.lastInsertRowid, prods[2].id, 1, prods[2].price);

        console.log('✅ Encomendas de teste inseridas.');
    }

    // 5. Inserir Avaliações de Produtos
    const revCount = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
    if (revCount === 0) {
        const afonso = db.prepare('SELECT id FROM users WHERE email = ?').get('afonso@email.pt');
        const maria = db.prepare('SELECT id FROM users WHERE email = ?').get('maria@email.pt');
        const prods = db.prepare('SELECT id FROM products LIMIT 3').all();

        const insertReview = db.prepare(`
            INSERT INTO reviews (product_id, user_id, rating, comment)
            VALUES (?, ?, ?, ?)
        `);

        insertReview.run(prods[0].id, afonso.id, 5, 'Excelente máquina! Velocidade inacreditável e autonomia para um dia inteiro.');
        insertReview.run(prods[1].id, maria.id, 4, 'Qualidade de construção fantástica. O ecrã OLED tem cores vibrantes.');

        console.log('✅ Avaliações inseridas.');
    }

    console.log('🎉 Inicialização da base de dados concluída!');
    console.log('----------------------------------------------------');
    console.log('Contas criadas para teste:');
    console.log('👑 Admin:   admin@techstore.pt   | Senha: admin123');
    console.log('👤 Cliente: afonso@email.pt      | Senha: cliente123');
    console.log('👤 Cliente: maria@email.pt       | Senha: cliente123');
    console.log('----------------------------------------------------');
}

if (require.main === module) {
    seed();
}

module.exports = { seed };
