// ============================================================================
// TechStore BD - Frontend Application Logic
// ============================================================================

// State Management
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('techstore_cart') || '[]');
let categories = [];
let products = [];
let selectedCategory = null;
let currentView = 'store';

// Helper: Format Currency (EUR)
function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(amount);
}

// Helper: Format Date
function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast-msg flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold border ${
        type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' :
        type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' :
        'bg-slate-800/95 border-slate-700 text-slate-100'
    }`;

    const icon = type === 'success' ? 'fa-circle-check text-emerald-400' :
                 type === 'error' ? 'fa-circle-exclamation text-rose-400' :
                 'fa-circle-info text-blue-400';

    toast.innerHTML = `<i class="fa-solid ${icon} text-sm"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    updateCartBadge();
    await checkAuth();
    await loadCategories();
    await loadProducts();
    setupEventListeners();
});

function setupEventListeners() {
    // Search inputs
    const headerSearch = document.getElementById('headerSearchInput');
    const storeSearch = document.getElementById('storeSearchInput');

    if (headerSearch) {
        headerSearch.addEventListener('input', (e) => {
            storeSearch.value = e.target.value;
            loadProducts();
        });
    }

    if (storeSearch) {
        storeSearch.addEventListener('input', (e) => {
            headerSearch.value = e.target.value;
            loadProducts();
        });
    }
}

// ============================================================================
// NAVIGATION
// ============================================================================
function navigateTo(viewName) {
    if (viewName === 'admin' && (!currentUser || currentUser.role !== 'admin')) {
        showToast('Acesso restrito a administradores. Faça login com conta admin.', 'error');
        openAuthModal();
        return;
    }

    if (viewName === 'my-orders' && !currentUser) {
        showToast('Inicie sessão para ver as suas encomendas.', 'error');
        openAuthModal();
        return;
    }

    currentView = viewName;
    document.querySelectorAll('.app-view').forEach(view => view.classList.add('hidden'));

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
        targetView.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (viewName === 'my-orders') {
        loadMyOrders();
    } else if (viewName === 'admin') {
        loadAdminStats();
    }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================
async function checkAuth() {
    try {
        const token = localStorage.getItem('techstore_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch('/api/auth/me', { headers });
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
        } else {
            currentUser = null;
            localStorage.removeItem('techstore_token');
        }
    } catch (err) {
        currentUser = null;
    }
    renderAuthUI();
}

function renderAuthUI() {
    const container = document.getElementById('authContainer');
    const myOrdersNavBtn = document.getElementById('myOrdersNavBtn');
    const adminNavBtn = document.getElementById('adminNavBtn');

    if (currentUser) {
        if (myOrdersNavBtn) myOrdersNavBtn.classList.remove('hidden');
        if (adminNavBtn) {
            if (currentUser.role === 'admin') {
                adminNavBtn.classList.remove('hidden');
            } else {
                adminNavBtn.classList.add('hidden');
            }
        }

        container.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="text-right hidden sm:block">
                    <p class="text-xs font-bold text-white">${currentUser.name}</p>
                    <span class="text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        currentUser.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'
                    }">${currentUser.role === 'admin' ? '👑 Admin' : '👤 Cliente'}</span>
                </div>
                <button onclick="handleLogout()" class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs" title="Terminar Sessão">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
            </div>
        `;
    } else {
        if (myOrdersNavBtn) myOrdersNavBtn.classList.add('hidden');
        if (adminNavBtn) adminNavBtn.classList.add('hidden');

        container.innerHTML = `
            <button onclick="openAuthModal()" class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5">
                <i class="fa-solid fa-user"></i>
                <span>Entrar</span>
            </button>
        `;
    }
}

function openAuthModal() {
    document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
}

function switchAuthMode(mode) {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('authTabLoginBtn');
    const tabReg = document.getElementById('authTabRegisterBtn');

    if (mode === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white transition';
        tabReg.className = 'flex-1 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition';
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition';
        tabReg.className = 'flex-1 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white transition';
    }
}

function quickFillLogin(email, password) {
    switchAuthMode('login');
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPassword').value = password;
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Erro ao iniciar sessão.');
        }

        currentUser = data.user;
        localStorage.setItem('techstore_token', data.token);
        closeAuthModal();
        renderAuthUI();
        showToast(`Bem-vindo, ${currentUser.name}!`, 'success');

        if (currentUser.role === 'admin' && currentView === 'admin') {
            loadAdminStats();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone').value;
    const address = document.getElementById('regAddress').value;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, phone, address })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Erro ao criar conta.');
        }

        currentUser = data.user;
        localStorage.setItem('techstore_token', data.token);
        closeAuthModal();
        renderAuthUI();
        showToast('Conta criada com sucesso!', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {}
    currentUser = null;
    localStorage.removeItem('techstore_token');
    renderAuthUI();
    showToast('Sessão terminada.', 'info');
    if (currentView === 'admin' || currentView === 'my-orders') {
        navigateTo('store');
    }
}

// ============================================================================
// CATALOG (CATEGORIES & PRODUCTS)
// ============================================================================
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        categories = data.categories || [];
        renderCategoryChips();
        populateCategorySelects();
    } catch (err) {
        console.error('Erro ao carregar categorias:', err);
    }
}

function renderCategoryChips() {
    const container = document.getElementById('categoryChips');
    if (!container) return;

    let html = `
        <button onclick="selectCategory(null)" class="category-chip whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition border ${
            selectedCategory === null 
            ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30' 
            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
        }">
            <i class="fa-solid fa-border-all mr-1.5"></i> Todos os Produtos
        </button>
    `;

    categories.forEach(cat => {
        const isSelected = selectedCategory === cat.slug;
        html += `
            <button onclick="selectCategory('${cat.slug}')" class="category-chip whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition border ${
                isSelected 
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }">
                <i class="fa-solid fa-tag mr-1.5"></i> ${cat.name} (${cat.product_count})
            </button>
        `;
    });

    container.innerHTML = html;
}

function selectCategory(slug) {
    selectedCategory = slug;
    renderCategoryChips();
    loadProducts();
}

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    const countLabel = document.getElementById('productCountLabel');
    const sort = document.getElementById('sortSelect').value;
    const search = document.getElementById('storeSearchInput').value;

    let url = `/api/products?sort=${encodeURIComponent(sort)}`;
    if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        products = data.products || [];

        countLabel.textContent = `${products.length} ${products.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`;

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-16 text-center space-y-3">
                    <i class="fa-solid fa-box-open text-4xl text-slate-600"></i>
                    <p class="text-slate-400 text-sm">Nenhum produto encontrado com os filtros selecionados.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(p => `
            <div class="product-card bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden flex flex-col justify-between">
                <div>
                    <!-- Image -->
                    <div class="relative h-48 w-full bg-slate-900 overflow-hidden cursor-pointer" onclick="openProductDetail(${p.id})">
                        <img src="${p.image_url}" alt="${p.name}" class="w-full h-full object-cover transition-transform duration-300 hover:scale-105">
                        <span class="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-slate-200 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-slate-700">
                            ${p.category_name}
                        </span>
                        ${p.stock <= 0 ? `
                            <span class="absolute top-3 right-3 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Esgotado
                            </span>
                        ` : p.stock <= 5 ? `
                            <span class="absolute top-3 right-3 bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Só ${p.stock} em stock
                            </span>
                        ` : ''}
                    </div>

                    <!-- Details -->
                    <div class="p-4 space-y-2">
                        <!-- Rating -->
                        <div class="flex items-center gap-1.5 text-xs">
                            <div class="text-amber-400 flex items-center">
                                <i class="fa-solid fa-star"></i>
                            </div>
                            <span class="font-bold text-slate-200">${p.avg_rating ? p.avg_rating : 'Novo'}</span>
                            <span class="text-slate-500">(${p.review_count} ${p.review_count === 1 ? 'avaliação' : 'avaliações'})</span>
                        </div>

                        <h3 class="font-bold text-sm text-white hover:text-blue-400 transition cursor-pointer line-clamp-1" onclick="openProductDetail(${p.id})">
                            ${p.name}
                        </h3>
                        <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            ${p.description}
                        </p>
                    </div>
                </div>

                <!-- Footer & Action -->
                <div class="p-4 pt-0 flex items-center justify-between border-t border-slate-800/60 mt-2">
                    <div>
                        <span class="text-[10px] text-slate-500 block uppercase font-mono">Preço</span>
                        <span class="text-base font-extrabold text-blue-400">${formatCurrency(p.price)}</span>
                    </div>
                    <button onclick="addToCart(${p.id})" ${p.stock <= 0 ? 'disabled' : ''} class="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        p.stock <= 0 
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                    }">
                        <i class="fa-solid fa-cart-plus"></i> Adicionar
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Erro ao carregar produtos:', err);
    }
}

// ============================================================================
// PRODUCT DETAIL & REVIEWS MODAL
// ============================================================================
async function openProductDetail(productId) {
    try {
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();
        const p = data.product;

        const content = document.getElementById('productDetailContent');
        content.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                    <div class="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 h-64">
                        <img src="${p.image_url}" alt="${p.name}" class="w-full h-full object-cover">
                    </div>
                    <div class="space-y-3">
                        <span class="text-xs font-bold text-blue-400 uppercase tracking-wider">${p.category_name}</span>
                        <h2 class="text-xl font-bold text-white">${p.name}</h2>
                        <div class="flex items-center gap-2 text-xs">
                            <span class="text-amber-400 font-bold"><i class="fa-solid fa-star"></i> ${p.avg_rating || 'Sem notas'}</span>
                            <span class="text-slate-400">(${p.review_count} avaliações na BD)</span>
                        </div>
                        <div class="text-2xl font-black text-blue-400 pt-1">${formatCurrency(p.price)}</div>
                        <p class="text-xs ${p.stock > 0 ? 'text-emerald-400' : 'text-rose-400'} font-semibold">
                            <i class="fa-solid ${p.stock > 0 ? 'fa-check' : 'fa-xmark'}"></i> ${p.stock > 0 ? `${p.stock} unidades disponíveis no armazém` : 'Esgotado'}
                        </p>
                        <p class="text-xs text-slate-300 leading-relaxed">${p.description}</p>
                        <button onclick="addToCart(${p.id})" ${p.stock <= 0 ? 'disabled' : ''} class="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center justify-center gap-2">
                            <i class="fa-solid fa-cart-shopping"></i> Adicionar ao Carrinho
                        </button>
                    </div>
                </div>

                <!-- Reviews Section -->
                <div class="border-t border-slate-800 pt-6 space-y-4">
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                        <i class="fa-solid fa-comments text-blue-400"></i> Avaliações dos Clientes (Tabela: reviews)
                    </h3>

                    <!-- Review Form -->
                    ${currentUser ? `
                        <form onsubmit="handleReviewSubmit(event, ${p.id})" class="bg-slate-800/70 border border-slate-700/70 p-4 rounded-2xl space-y-3">
                            <p class="text-xs font-semibold text-slate-200">Deixe a sua opinião sobre este produto:</p>
                            <div class="flex items-center gap-3">
                                <label class="text-xs text-slate-400">Classificação:</label>
                                <select id="reviewRatingInput" class="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white">
                                    <option value="5">⭐⭐⭐⭐⭐ (5 - Excelente)</option>
                                    <option value="4">⭐⭐⭐⭐ (4 - Bom)</option>
                                    <option value="3">⭐⭐⭐ (3 - Médio)</option>
                                    <option value="2">⭐⭐ (2 - Fraco)</option>
                                    <option value="1">⭐ (1 - Mau)</option>
                                </select>
                            </div>
                            <textarea id="reviewCommentInput" rows="2" placeholder="O que achou do equipamento?" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"></textarea>
                            <button type="submit" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition">
                                Submeter Avaliação
                            </button>
                        </form>
                    ` : `
                        <div class="bg-slate-800/40 p-3 rounded-xl text-xs text-slate-400 text-center">
                            Faça <button onclick="openAuthModal()" class="text-blue-400 underline font-semibold">login</button> para deixar uma avaliação.
                        </div>
                    `}

                    <!-- Reviews List -->
                    <div class="space-y-3">
                        ${p.reviews && p.reviews.length > 0 ? p.reviews.map(r => `
                            <div class="bg-slate-800/40 border border-slate-700/40 p-3 rounded-xl space-y-1.5">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-white">${r.user_name}</span>
                                    <span class="text-amber-400 text-xs">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                                </div>
                                <p class="text-xs text-slate-300">${r.comment || 'Sem comentário adicional.'}</p>
                                <span class="text-[10px] text-slate-500 block">${formatDate(r.created_at)}</span>
                            </div>
                        `).join('') : `
                            <p class="text-xs text-slate-500 italic">Este produto ainda não possui avaliações. Seja o primeiro a avaliar!</p>
                        `}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('productDetailModal').classList.remove('hidden');
    } catch (err) {
        showToast('Erro ao carregar detalhes do produto.', 'error');
    }
}

function closeProductDetailModal() {
    document.getElementById('productDetailModal').classList.add('hidden');
}

async function handleReviewSubmit(e, productId) {
    e.preventDefault();
    const rating = document.getElementById('reviewRatingInput').value;
    const comment = document.getElementById('reviewCommentInput').value;

    try {
        const token = localStorage.getItem('techstore_token');
        const res = await fetch(`/api/products/${productId}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rating, comment })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Erro ao submeter avaliação.');
        }

        showToast('Avaliação guardada com sucesso!', 'success');
        openProductDetail(productId); // Reload modal reviews
        loadProducts(); // Reload averages
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============================================================================
// SHOPPING CART & ACID CHECKOUT
// ============================================================================
function updateCartBadge() {
    const badge = document.getElementById('cartCountBadge');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (totalItems > 0) {
        badge.textContent = totalItems;
        badge.classList.remove('scale-0');
    } else {
        badge.classList.add('scale-0');
    }
    localStorage.setItem('techstore_cart', JSON.stringify(cart));
}

function addToCart(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (prod.stock <= 0) {
        showToast('Produto sem stock disponível.', 'error');
        return;
    }

    const existing = cart.find(item => item.productId === productId);
    if (existing) {
        if (existing.quantity >= prod.stock) {
            showToast(`Atingiu o limite de stock (${prod.stock} un.) para este produto.`, 'error');
            return;
        }
        existing.quantity += 1;
    } else {
        cart.push({
            productId: prod.id,
            name: prod.name,
            price: prod.price,
            image: prod.image_url,
            stock: prod.stock,
            quantity: 1
        });
    }

    updateCartBadge();
    showToast(`"${prod.name}" adicionado ao carrinho!`, 'success');
}

function openCartModal() {
    renderCartItems();
    if (currentUser && currentUser.address) {
        const addrInput = document.getElementById('checkoutAddress');
        if (addrInput && !addrInput.value) {
            addrInput.value = currentUser.address;
        }
    }
    document.getElementById('cartModal').classList.remove('hidden');
}

function closeCartModal() {
    document.getElementById('cartModal').classList.add('hidden');
}

function updateCartQuantity(productId, delta) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.productId !== productId);
    } else if (item.quantity > item.stock) {
        item.quantity = item.stock;
        showToast(`Stock máximo disponível: ${item.stock}`, 'error');
    }

    updateCartBadge();
    renderCartItems();
}

function removeCartItem(productId) {
    cart = cart.filter(i => i.productId !== productId);
    updateCartBadge();
    renderCartItems();
}

function renderCartItems() {
    const container = document.getElementById('cartItemsList');
    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');
    const footer = document.getElementById('cartFooter');

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="h-64 flex flex-col items-center justify-center text-center space-y-3">
                <i class="fa-solid fa-cart-shopping text-3xl text-slate-700"></i>
                <p class="text-xs text-slate-400">O seu carrinho está vazio.</p>
                <button onclick="closeCartModal(); navigateTo('store')" class="text-xs text-blue-400 font-semibold underline">
                    Explorar produtos
                </button>
            </div>
        `;
        footer.classList.add('hidden');
        return;
    }

    footer.classList.remove('hidden');

    let total = 0;
    container.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl">
                <img src="${item.image}" alt="${item.name}" class="w-14 h-14 object-cover rounded-xl bg-slate-900">
                <div class="flex-1 min-w-0">
                    <h4 class="text-xs font-bold text-white truncate">${item.name}</h4>
                    <p class="text-xs font-extrabold text-blue-400">${formatCurrency(item.price)}</p>
                    <div class="flex items-center gap-2 mt-1.5">
                        <button onclick="updateCartQuantity(${item.productId}, -1)" class="w-5 h-5 rounded-md bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs">
                            -
                        </button>
                        <span class="text-xs font-bold text-white font-mono">${item.quantity}</span>
                        <button onclick="updateCartQuantity(${item.productId}, 1)" class="w-5 h-5 rounded-md bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs">
                            +
                        </button>
                    </div>
                </div>
                <button onclick="removeCartItem(${item.productId})" class="text-slate-500 hover:text-rose-400 p-1 transition" title="Remover">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
        `;
    }).join('');

    subtotalEl.textContent = formatCurrency(total);
    totalEl.textContent = formatCurrency(total);
}

async function executeCheckout() {
    if (!currentUser) {
        showToast('Inicie sessão para poder finalizar a encomenda.', 'error');
        openAuthModal();
        return;
    }

    if (cart.length === 0) {
        showToast('O seu carrinho está vazio.', 'error');
        return;
    }

    const shipping_address = document.getElementById('checkoutAddress').value;
    const payment_method = document.getElementById('checkoutPayment').value;

    if (!shipping_address || !shipping_address.trim()) {
        showToast('Por favor insira a morada de entrega.', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('techstore_token');
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                items: cart,
                shipping_address: shipping_address.trim(),
                payment_method
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Erro ao processar a encomenda.');
        }

        // Sucesso na transação da base de dados!
        cart = [];
        updateCartBadge();
        closeCartModal();
        showToast(`Encomenda #${data.orderId} criada com sucesso via Transação ACID!`, 'success');

        // Recarregar produtos para atualizar stock na interface
        await loadProducts();

        // Redirecionar para os pedidos
        navigateTo('my-orders');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============================================================================
// CLIENT ORDERS VIEW
// ============================================================================
async function loadMyOrders() {
    const container = document.getElementById('myOrdersList');
    container.innerHTML = '<p class="text-xs text-slate-400">A carregar encomendas da base de dados...</p>';

    try {
        const token = localStorage.getItem('techstore_token');
        const res = await fetch('/api/orders/my-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const orders = data.orders || [];

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-12 text-center space-y-3">
                    <i class="fa-solid fa-receipt text-3xl text-slate-600"></i>
                    <p class="text-slate-400 text-xs">Ainda não realizou nenhuma encomenda.</p>
                    <button onclick="navigateTo('store')" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                        Fazer Compras
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(o => `
            <div class="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div class="space-y-0.5">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-bold text-white font-mono">Encomenda #${o.id}</span>
                            <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getStatusBadgeClass(o.status)}">
                                ${o.status}
                            </span>
                        </div>
                        <p class="text-xs text-slate-400">${formatDate(o.created_at)} &bull; Pagamento: <span class="uppercase font-mono">${o.payment_method}</span></p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs text-slate-400 block">Total</span>
                        <span class="text-base font-extrabold text-blue-400">${formatCurrency(o.total)}</span>
                    </div>
                </div>

                <!-- Items -->
                <div class="space-y-2">
                    ${o.items.map(item => `
                        <div class="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/40 last:border-0">
                            <div class="flex items-center gap-3">
                                <img src="${item.image_url}" alt="${item.product_name}" class="w-10 h-10 object-cover rounded-lg bg-slate-900">
                                <div>
                                    <p class="font-bold text-slate-200">${item.product_name}</p>
                                    <p class="text-slate-400">${item.quantity} x ${formatCurrency(item.unit_price)}</p>
                                </div>
                            </div>
                            <span class="font-mono font-bold text-slate-300">${formatCurrency(item.quantity * item.unit_price)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="pt-2 text-[11px] text-slate-400">
                    <i class="fa-solid fa-location-dot text-slate-500 mr-1"></i> Morada: ${o.shipping_address}
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p class="text-xs text-rose-400">Erro ao carregar histórico de encomendas.</p>';
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'pago':
            return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        case 'enviado':
            return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        case 'entregue':
            return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
        case 'cancelado':
            return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
        case 'pendente':
        default:
            return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    }
}

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-blue-600', 'text-white');
        btn.classList.add('bg-slate-800', 'text-slate-300');
    });

    const activeBtn = document.getElementById(`adminTabBtn-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-slate-800', 'text-slate-300');
        activeBtn.classList.add('active', 'bg-blue-600', 'text-white');
    }

    ['metrics', 'products', 'orders', 'sql-sandbox'].forEach(t => {
        const tabEl = document.getElementById(`adminTab-${t}`);
        if (tabEl) {
            if (t === tabName) tabEl.classList.remove('hidden');
            else tabEl.classList.add('hidden');
        }
    });

    if (tabName === 'metrics') loadAdminStats();
    if (tabName === 'products') loadAdminProducts();
    if (tabName === 'orders') loadAdminOrders();
    if (tabName === 'sql-sandbox') {
        if (!document.getElementById('sqlEditorInput').value) {
            setSqlPreset('preset1');
        }
    }
}

async function loadAdminStats() {
    try {
        const token = localStorage.getItem('techstore_token');
        const res = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        // Update KPIs
        document.getElementById('statRevenue').textContent = formatCurrency(data.general.total_revenue);
        document.getElementById('statOrders').textContent = data.general.total_orders;
        document.getElementById('statClients').textContent = data.general.total_clients;
        document.getElementById('statLowStock').textContent = data.general.low_stock_count;

        // Top products table
        const topBody = document.getElementById('topProductsTableBody');
        topBody.innerHTML = data.topProducts.map(tp => `
            <tr>
                <td class="px-3 py-2.5 font-medium text-white">${tp.name}</td>
                <td class="px-3 py-2.5 text-center font-mono font-bold text-blue-400">${tp.units_sold}</td>
                <td class="px-3 py-2.5 text-right font-mono font-bold text-emerald-400">${formatCurrency(tp.product_revenue)}</td>
            </tr>
        `).join('') || '<tr><td colspan="3" class="px-3 py-4 text-center text-slate-500">Sem vendas registadas ainda.</td></tr>';

        // Category stats table
        const catBody = document.getElementById('categoryStatsTableBody');
        catBody.innerHTML = data.categoryStats.map(cs => `
            <tr>
                <td class="px-3 py-2.5 font-medium text-white">${cs.category_name}</td>
                <td class="px-3 py-2.5 text-center font-mono">${cs.total_units_sold}</td>
                <td class="px-3 py-2.5 text-right font-mono font-bold text-emerald-400">${formatCurrency(cs.category_revenue)}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Erro ao carregar estatísticas:', err);
    }
}

async function loadAdminProducts() {
    const tbody = document.getElementById('adminProductsTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-4 text-center text-slate-400">A carregar produtos da BD...</td></tr>';

    try {
        const res = await fetch('/api/products?sort=newest');
        const data = await res.json();
        const prods = data.products || [];

        tbody.innerHTML = prods.map(p => `
            <tr class="hover:bg-slate-900/40 transition">
                <td class="px-4 py-3 font-mono text-slate-500">#${p.id}</td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                        <img src="${p.image_url}" class="w-8 h-8 rounded-lg object-cover bg-slate-900">
                        <span class="font-bold text-white">${p.name}</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-slate-300">${p.category_name}</td>
                <td class="px-4 py-3 font-mono font-bold text-blue-400">${formatCurrency(p.price)}</td>
                <td class="px-4 py-3">
                    <span class="font-mono font-bold ${p.stock <= 5 ? 'text-amber-400' : 'text-emerald-400'}">${p.stock}</span> un.
                </td>
                <td class="px-4 py-3 text-right space-x-2">
                    <button onclick="editProductModal(${p.id})" class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition">
                        Editar
                    </button>
                    <button onclick="deleteProduct(${p.id})" class="px-2.5 py-1 bg-rose-900/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/50 rounded-lg text-xs font-semibold transition">
                        Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-4 text-center text-rose-400">Erro ao carregar produtos.</td></tr>';
    }
}

function populateCategorySelects() {
    const select = document.getElementById('adminProdCategory');
    if (!select) return;

    select.innerHTML = categories.map(c => `
        <option value="${c.id}">${c.name}</option>
    `).join('');
}

function openProductModal(productId = null) {
    populateCategorySelects();
    const form = document.getElementById('adminProductForm');
    form.reset();
    document.getElementById('adminProductId').value = '';
    document.getElementById('adminProductModalTitle').innerHTML = '<i class="fa-solid fa-plus text-blue-500"></i> Adicionar Produto';

    if (productId) {
        const prod = products.find(p => p.id === productId);
        if (prod) {
            document.getElementById('adminProductId').value = prod.id;
            document.getElementById('adminProdName').value = prod.name;
            document.getElementById('adminProdCategory').value = prod.category_id;
            document.getElementById('adminProdPrice').value = prod.price;
            document.getElementById('adminProdStock').value = prod.stock;
            document.getElementById('adminProdImage').value = prod.image_url;
            document.getElementById('adminProdDesc').value = prod.description;
            document.getElementById('adminProductModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-blue-500"></i> Editar Produto';
        }
    }

    document.getElementById('adminProductModal').classList.remove('hidden');
}

function editProductModal(productId) {
    openProductModal(productId);
}

function closeAdminProductModal() {
    document.getElementById('adminProductModal').classList.add('hidden');
}

async function handleProductFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('adminProductId').value;
    const name = document.getElementById('adminProdName').value;
    const category_id = document.getElementById('adminProdCategory').value;
    const price = document.getElementById('adminProdPrice').value;
    const stock = document.getElementById('adminProdStock').value;
    const image_url = document.getElementById('adminProdImage').value;
    const description = document.getElementById('adminProdDesc').value;

    const payload = {
        name, category_id, price, stock, image_url, description
    };

    const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
    const method = id ? 'PUT' : 'POST';

    try {
        const token = localStorage.getItem('techstore_token');
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Erro ao guardar produto.');
        }

        closeAdminProductModal();
        showToast(data.message || 'Produto guardado com sucesso!', 'success');
        await loadCategories();
        await loadProducts();
        loadAdminProducts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Tem a certeza que deseja eliminar este produto? (A base de dados verificará integridade com chaves estrangeiras)')) {
        return;
    }

    try {
        const token = localStorage.getItem('techstore_token');
        const res = await fetch(`/api/admin/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Erro ao eliminar produto.');
        }

        showToast(data.message, 'success');
        await loadCategories();
        await loadProducts();
        loadAdminProducts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Category creation modal
function openCategoryModal() {
    document.getElementById('adminCategoryModal').classList.remove('hidden');
}
function closeAdminCategoryModal() {
    document.getElementById('adminCategoryModal').classList.add('hidden');
}

async function handleCategoryFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('adminCatName').value;
    const description = document.getElementById('adminCatDesc').value;

    try {
        const token = localStorage.getItem('techstore_token');
        const res = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, description })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Erro ao criar categoria.');
        }

        closeAdminCategoryModal();
        showToast(data.message, 'success');
        await loadCategories();
        await loadProducts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Admin Orders
async function loadAdminOrders() {
    const tbody = document.getElementById('adminOrdersTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-4 text-center text-slate-400">A carregar encomendas...</td></tr>';

    try {
        const token = localStorage.getItem('techstore_token');
        const res = await fetch('/api/admin/orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const orders = data.orders || [];

        tbody.innerHTML = orders.map(o => `
            <tr class="hover:bg-slate-900/40 transition">
                <td class="px-4 py-3 font-mono font-bold text-white">#${o.id}</td>
                <td class="px-4 py-3">
                    <p class="font-bold text-white">${o.client_name}</p>
                    <p class="text-[11px] text-slate-400">${o.client_email}</p>
                </td>
                <td class="px-4 py-3 text-slate-400 text-xs">${formatDate(o.created_at)}</td>
                <td class="px-4 py-3 font-mono font-bold text-blue-400">${formatCurrency(o.total)}</td>
                <td class="px-4 py-3 uppercase font-mono text-[11px] text-slate-300">${o.payment_method}</td>
                <td class="px-4 py-3">
                    <select onchange="updateOrderStatus(${o.id}, this.value)" class="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2 py-1 font-semibold text-white focus:outline-none focus:border-blue-500">
                        <option value="pendente" ${o.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="pago" ${o.status === 'pago' ? 'selected' : ''}>Pago</option>
                        <option value="enviado" ${o.status === 'enviado' ? 'selected' : ''}>Enviado</option>
                        <option value="entregue" ${o.status === 'entregue' ? 'selected' : ''}>Entregue</option>
                        <option value="cancelado" ${o.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </td>
                <td class="px-4 py-3 text-right">
                    <span class="text-xs text-slate-500">${o.total_items} itens</span>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="7" class="px-4 py-4 text-center text-slate-500">Sem encomendas.</td></tr>';
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-4 text-center text-rose-400">Erro ao carregar encomendas.</td></tr>';
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const token = localStorage.getItem('techstore_token');
        const res = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Erro ao atualizar estado.');
        }

        showToast(data.message, 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============================================================================
// SQL EXPLORER & SANDBOX
// ============================================================================
const SQL_PRESETS = {
    preset1: `SELECT 
    p.name AS Produto,
    c.name AS Categoria,
    p.price AS Preco_Unitario,
    COALESCE(SUM(oi.quantity), 0) AS Unidades_Vendidas,
    ROUND(COALESCE(SUM(oi.quantity * oi.unit_price), 0), 2) AS Total_Faturado
FROM products p
INNER JOIN categories c ON p.category_id = c.id
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id
ORDER BY Unidades_Vendidas DESC;`,

    preset2: `SELECT 
    c.name AS Categoria,
    COUNT(DISTINCT p.id) AS Qtd_Produtos,
    COUNT(r.id) AS Qtd_Avaliacoes,
    ROUND(AVG(r.rating), 2) AS Media_Classificacao
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
LEFT JOIN reviews r ON p.id = r.product_id
GROUP BY c.id
ORDER BY Media_Classificacao DESC;`,

    preset3: `SELECT 
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
ORDER BY Montante_Total_Gasto DESC;`,

    preset4: `SELECT 
    type, 
    name, 
    tbl_name, 
    sql 
FROM sqlite_schema 
WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%';`
};

function setSqlPreset(presetKey) {
    const sql = SQL_PRESETS[presetKey];
    if (sql) {
        document.getElementById('sqlEditorInput').value = sql;
        executeSqlQuery();
    }
}

async function executeSqlQuery() {
    const query = document.getElementById('sqlEditorInput').value;
    const statusBox = document.getElementById('sqlExecutionStatus');
    const rowCountEl = document.getElementById('sqlRowCount');
    const timeEl = document.getElementById('sqlExecutionTime');
    const resultsContainer = document.getElementById('sqlResultsContainer');
    const head = document.getElementById('sqlResultHead');
    const body = document.getElementById('sqlResultBody');

    if (!query || !query.trim()) {
        showToast('Escreva uma consulta SQL primeiro.', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('techstore_token');
        const res = await fetch('/api/admin/sql-runner', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query: query.trim() })
        });
        const data = await res.json();

        if (!data.success) {
            throw new Error(data.error || 'Erro na execução SQL.');
        }

        statusBox.classList.remove('hidden');
        rowCountEl.textContent = `${data.rowCount} linhas retornadas`;
        timeEl.textContent = `Executado em ${data.executionTimeMs}ms`;

        resultsContainer.classList.remove('hidden');

        if (data.columns.length === 0) {
            head.innerHTML = '<tr><th class="p-3">Resultado</th></tr>';
            body.innerHTML = '<tr><td class="p-3 text-slate-500 italic">Nenhum resultado retornado.</td></tr>';
            return;
        }

        head.innerHTML = `<tr>${data.columns.map(c => `<th class="px-4 py-2.5 font-bold text-blue-400 border-r border-slate-800 last:border-0">${c}</th>`).join('')}</tr>`;
        body.innerHTML = data.rows.map(row => `
            <tr class="hover:bg-slate-800/40 transition">
                ${data.columns.map(c => `<td class="px-4 py-2 text-slate-300 border-r border-slate-800/60 last:border-0 whitespace-nowrap">${row[c] !== null ? row[c] : '<span class="text-slate-600">NULL</span>'}</td>`).join('')}
            </tr>
        `).join('');

    } catch (err) {
        showToast(err.message, 'error');
        resultsContainer.classList.remove('hidden');
        head.innerHTML = '<tr><th class="p-3 text-rose-400">Erro SQL</th></tr>';
        body.innerHTML = `<tr><td class="p-3 text-rose-300 font-mono text-xs">${err.message}</td></tr>`;
    }
}

// Demo Info Modal
function openDemoInfoModal() {
    document.getElementById('demoInfoModal').classList.remove('hidden');
}
function closeDemoInfoModal() {
    document.getElementById('demoInfoModal').classList.add('hidden');
}
