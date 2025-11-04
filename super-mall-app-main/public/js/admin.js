class AdminManager {
    constructor() {
        this.currentShop = null;
        this.initAdminFunctions();
    }

    initAdminFunctions() {
        // Initialize all admin functionality
        this.loadShops();
        this.loadCategories();
        this.loadOffers();
        this.setupEventListeners();
    }

    async createShop(shopData) {
        try {
            const shopRef = await db.collection('shops').add({
                ...shopData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser.uid,
                status: 'active'
            });

            logger.info('Shop created successfully', { shopId: shopRef.id, shopName: shopData.name });
            return { success: true, shopId: shopRef.id };
        } catch (error) {
            logger.error('Failed to create shop', { shopData, error: error.message });
            return { success: false, error: error.message };
        }
    }

    async updateShop(shopId, shopData) {
        try {
            await db.collection('shops').doc(shopId).update({
                ...shopData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            logger.info('Shop updated successfully', { shopId, shopData });
            return { success: true };
        } catch (error) {
            logger.error('Failed to update shop', { shopId, shopData, error: error.message });
            return { success: false, error: error.message };
        }
    }

    async createOffer(offerData) {
        try {
            const offerRef = await db.collection('offers').add({
                ...offerData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser.uid,
                status: 'active'
            });

            logger.info('Offer created successfully', { offerId: offerRef.id, offerTitle: offerData.title });
            return { success: true, offerId: offerRef.id };
        } catch (error) {
            logger.error('Failed to create offer', { offerData, error: error.message });
            return { success: false, error: error.message };
        }
    }

    async manageCategory(categoryData) {
        try {
            const categoryRef = await db.collection('categories').add({
                ...categoryData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            logger.info('Category created successfully', { categoryId: categoryRef.id, categoryName: categoryData.name });
            return { success: true, categoryId: categoryRef.id };
        } catch (error) {
            logger.error('Failed to create category', { categoryData, error: error.message });
            return { success: false, error: error.message };
        }
    }

    async loadShops() {
        try {
            const snapshot = await db.collection('shops')
                .where('createdBy', '==', auth.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();

            const shops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderShops(shops);
            logger.info('Shops loaded successfully', { count: shops.length });
        } catch (error) {
            logger.error('Failed to load shops', { error: error.message });
        }
    }

    renderShops(shops) {
        const container = document.getElementById('shops-container');
        if (!container) return;

        container.innerHTML = shops.map(shop => `
            <div class="shop-card" data-shop-id="${shop.id}">
                <h3>${shop.name}</h3>
                <p>Floor: ${shop.floor}</p>
                <p>Category: ${shop.category}</p>
                <p>Status: ${shop.status}</p>
                <button onclick="adminManager.editShop('${shop.id}')">Edit</button>
                <button onclick="adminManager.deleteShop('${shop.id}')">Delete</button>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Setup all admin event listeners
        document.getElementById('create-shop-btn')?.addEventListener('click', () => this.showCreateShopModal());
        document.getElementById('create-offer-btn')?.addEventListener('click', () => this.showCreateOfferModal());
    }
}

const adminManager = new AdminManager();