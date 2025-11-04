class UserManager {
    constructor() {
        this.filters = {
            category: '',
            floor: '',
            priceRange: { min: 0, max: 10000 }
        };
        this.initUserFunctions();
    }

    initUserFunctions() {
        this.loadCategories();
        this.loadFloors();
        this.loadShops();
        this.setupEventListeners();
    }

    async loadCategories() {
        try {
            const snapshot = await db.collection('categories').where('status', '==', 'active').get();
            const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderCategories(categories);
            logger.info('Categories loaded successfully', { count: categories.length });
        } catch (error) {
            logger.error('Failed to load categories', { error: error.message });
        }
    }

    async loadShops(filters = {}) {
        try {
            let query = db.collection('shops').where('status', '==', 'active');

            if (filters.category) {
                query = query.where('category', '==', filters.category);
            }

            if (filters.floor) {
                query = query.where('floor', '==', filters.floor);
            }

            const snapshot = await query.get();
            const shops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderShops(shops);
            logger.info('Shops loaded with filters', { filters, count: shops.length });
        } catch (error) {
            logger.error('Failed to load shops with filters', { filters, error: error.message });
        }
    }

    async loadShopOffers(shopId) {
        try {
            const snapshot = await db.collection('offers')
                .where('shopId', '==', shopId)
                .where('status', '==', 'active')
                .orderBy('createdAt', 'desc')
                .get();

            const offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderOffers(offers);
            logger.info('Shop offers loaded', { shopId, count: offers.length });
        } catch (error) {
            logger.error('Failed to load shop offers', { shopId, error: error.message });
        }
    }

    async compareProducts(productIds) {
        try {
            const products = [];
            for (const productId of productIds) {
                const doc = await db.collection('products').doc(productId).get();
                if (doc.exists) {
                    products.push({ id: doc.id, ...doc.data() });
                }
            }
            
            this.renderComparison(products);
            logger.info('Products comparison', { productIds, count: products.length });
        } catch (error) {
            logger.error('Failed to compare products', { productIds, error: error.message });
        }
    }

    renderShops(shops) {
        const container = document.getElementById('shops-container');
        if (!container) return;

        container.innerHTML = shops.map(shop => `
            <div class="shop-card" data-shop-id="${shop.id}">
                <div class="shop-header">
                    <h3>${shop.name}</h3>
                    <span class="floor-badge">Floor ${shop.floor}</span>
                </div>
                <div class="shop-info">
                    <p><strong>Category:</strong> ${shop.category}</p>
                    <p><strong>Description:</strong> ${shop.description}</p>
                    <p><strong>Contact:</strong> ${shop.contact}</p>
                </div>
                <div class="shop-actions">
                    <button onclick="userManager.viewShopDetails('${shop.id}')">View Details</button>
                    <button onclick="userManager.viewOffers('${shop.id}')">View Offers</button>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        document.getElementById('category-filter')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
        });

        document.getElementById('floor-filter')?.addEventListener('change', (e) => {
            this.filters.floor = e.target.value;
            this.applyFilters();
        });

        document.getElementById('price-range')?.addEventListener('change', (e) => {
            this.filters.priceRange.max = parseInt(e.target.value);
            this.applyFilters();
        });
    }

    applyFilters() {
        this.loadShops(this.filters);
    }
}

const userManager = new UserManager();