// Enhanced Application Manager
class AppManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.initAuth();
        this.initUI();
        this.initEventListeners();
        logger.info('AppManager initialized');
    }

    initAuth() {
        // Check if user is logged in
        const user = auth.currentUser;
        if (user) {
            this.currentUser = user;
            this.updateUIForUser();
        }
    }

    initUI() {
        // Initialize all UI components
        this.initNavigation();
        this.initModals();
        this.initToastSystem();
    }

    initEventListeners() {
        // Global event listeners
        document.addEventListener('click', this.handleGlobalClick.bind(this));
    }

    initNavigation() {
        // Update navigation based on auth state
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        if (this.currentUser) {
            // User is logged in
            navLinks.innerHTML = `
                <li><a href="admin-dashboard.html">Dashboard</a></li>
                <li><a href="#" onclick="appManager.logout()">Logout</a></li>
            `;
        }
    }

    initModals() {
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    initToastSystem() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(toastContainer);
        }
    }

    handleGlobalClick(e) {
        // Handle dynamic button clicks
        const button = e.target.closest('button');
        if (!button) return;

        // Handle data-action attributes
        const action = button.dataset.action;
        if (action) {
            e.preventDefault();
            this.handleAction(action, button);
        }
    }

    handleAction(action, button) {
        const actions = {
            'create-shop': () => this.showCreateShopModal(),
            'create-offer': () => this.showCreateOfferModal(),
            'create-category': () => this.showCreateCategoryModal(),
            'filter-shops': () => this.filterShops(),
            'compare-products': () => this.compareProducts(),
            'view-offers': () => this.viewOffers(button.dataset.shopId),
            'view-shop': () => this.viewShopDetails(button.dataset.shopId),
            'edit-shop': () => this.editShop(button.dataset.shopId),
            'delete-shop': () => this.deleteShop(button.dataset.shopId)
        };

        if (actions[action]) {
            actions[action]();
        }
    }

    // Modal Management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
    }

    // Toast System
    showToast(message, type = 'success', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="toast-icon">${this.getToastIcon(type)}</div>
                <div>${message}</div>
            </div>
        `;

        const container = document.getElementById('toast-container') || document.body;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || '💡';
    }

    // Authentication
    async logout() {
        const result = await authManager.logout();
        if (result.success) {
            this.showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            this.showToast('Logout failed: ' + result.error, 'error');
        }
    }

    // Shop Management
    async showCreateShopModal() {
        await this.loadCategoriesForSelect();
        this.showModal('createShopModal');
    }

    async loadCategoriesForSelect() {
        try {
            const snapshot = await db.collection('categories').where('status', '==', 'active').get();
            const categories = snapshot.docs.map(doc => doc.data());
            
            const select = document.getElementById('shopCategory');
            if (select) {
                select.innerHTML = '<option value="">Select Category</option>' +
                    categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
            }
        } catch (error) {
            this.showToast('Failed to load categories', 'error');
        }
    }

    async createShop(shopData) {
        try {
            const result = await adminManager.createShop(shopData);
            if (result.success) {
                this.showToast('Shop created successfully!', 'success');
                this.closeModal('createShopModal');
                this.refreshShops();
                return true;
            } else {
                this.showToast('Failed to create shop: ' + result.error, 'error');
                return false;
            }
        } catch (error) {
            this.showToast('Error creating shop: ' + error.message, 'error');
            return false;
        }
    }

    async editShop(shopId) {
        try {
            const shopDoc = await db.collection('shops').doc(shopId).get();
            if (shopDoc.exists) {
                const shop = shopDoc.data();
                this.populateEditShopForm(shopId, shop);
                this.showModal('editShopModal');
            }
        } catch (error) {
            this.showToast('Error loading shop details', 'error');
        }
    }

    async deleteShop(shopId) {
        if (confirm('Are you sure you want to delete this shop?')) {
            try {
                await db.collection('shops').doc(shopId).update({ status: 'inactive' });
                this.showToast('Shop deleted successfully', 'success');
                this.refreshShops();
            } catch (error) {
                this.showToast('Error deleting shop', 'error');
            }
        }
    }

    // Offer Management
    async showCreateOfferModal() {
        await this.loadShopsForSelect();
        this.showModal('createOfferModal');
    }

    async loadShopsForSelect() {
        try {
            const snapshot = await db.collection('shops')
                .where('createdBy', '==', auth.currentUser.uid)
                .where('status', '==', 'active')
                .get();
            
            const shops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const select = document.getElementById('offerShop');
            if (select) {
                select.innerHTML = '<option value="">Select Shop</option>' +
                    shops.map(shop => `<option value="${shop.id}">${shop.name}</option>`).join('');
            }
        } catch (error) {
            this.showToast('Failed to load shops', 'error');
        }
    }

    // Category Management
    async showCreateCategoryModal() {
        this.showModal('createCategoryModal');
    }

    // Filtering
    async filterShops() {
        const category = document.getElementById('categoryFilter')?.value;
        const floor = document.getElementById('floorFilter')?.value;
        
        const filters = {};
        if (category) filters.category = category;
        if (floor) filters.floor = floor;

        await userManager.loadShops(filters);
        this.showToast('Filters applied', 'success');
    }

    // Utility Methods
    refreshShops() {
        if (window.adminManager) {
            adminManager.loadShops();
        }
        if (window.userManager) {
            userManager.loadShops();
        }
    }

    updateUIForUser() {
        // Update UI elements based on user state
        const loginBtn = document.querySelector('a[href="login.html"]');
        const registerBtn = document.querySelector('a[href="register.html"]');
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
    }

    // Form Handling
    handleFormSubmit(formId, submitCallback) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                
                // Show loading state
                submitBtn.innerHTML = '<div class="loading"></div> Processing...';
                submitBtn.disabled = true;
                
                try {
                    await submitCallback(e);
                } catch (error) {
                    this.showToast('Error: ' + error.message, 'error');
                } finally {
                    // Restore button
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
    }
}

// Initialize the app
const appManager = new AppManager();

// Utility function to format dates
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Utility function to generate unique IDs
function generateId(prefix = '') {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}