// Mock Firebase Configuration - No real credentials needed
class MockFirebase {
    constructor() {
        this.auth = new MockAuth();
        this.firestore = new MockFirestore();
        this.storage = new MockStorage();
        this.initialized = true;
        logger.info('Mock Firebase initialized successfully');
    }
}

class MockAuth {
    constructor() {
        this.currentUser = null;
        this.users = JSON.parse(localStorage.getItem('mockUsers')) || [];
    }

    // Helper: save users array back to localStorage
    _persistUsers() {
        localStorage.setItem('mockUsers', JSON.stringify(this.users));
    }

    // Sign in by email OR shopNo + password
    async signInWithEmailAndPassword(identifier, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // identifier may be email (contains '@') OR shopNo
                let user = null;
                
                if (identifier.includes('@')) {
                    // treat as email
                    user = this.users.find(u => u.email && u.email.toLowerCase() === identifier.toLowerCase());
                } else {
                    // treat as shopNo
                    user = this.users.find(u => u.shopNumber && u.shopNumber.toString() === identifier.toString());
                }

                if (!user) {
                    logger.error('Mock login failed - user not found', { identifier });
                    reject(new Error('Invalid credentials'));
                    return;
                }

                if (user.password !== password) {
                    logger.error('Mock login failed - wrong password', { identifier });
                    reject(new Error('Invalid credentials'));
                    return;
                }

                // success
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    shopNumber: user.shopNumber,
                    role: user.role || 'user',
                    name: user.name
                };
                
                logger.info('Mock login successful', { 
                    identifier, 
                    email: user.email, 
                    shopNumber: user.shopNumber 
                });
                
                resolve({ user: this.currentUser });
            }, 500);
        });
    }

    async createUserWithEmailAndPassword(email, password, metadata = {}) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Require both email and shopNumber for registration
                if (!email || !password || !metadata.shopNumber) {
                    reject(new Error('Email, password, and shop number are required'));
                    return;
                }

                // Prevent duplicate by email
                const foundByEmail = this.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
                if (foundByEmail) {
                    reject(new Error('Email already registered'));
                    return;
                }

                // Prevent duplicate by shopNumber
                const foundByShop = this.users.find(u => u.shopNumber && u.shopNumber.toString() === metadata.shopNumber.toString());
                if (foundByShop) {
                    reject(new Error('Shop Number already registered'));
                    return;
                }

                // Create a uid
                const newUid = 'user_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1000);

                const newUser = {
                    uid: newUid,
                    email: email,
                    password: password,
                    shopNumber: metadata.shopNumber,
                    name: metadata.name || '',
                    role: metadata.role || 'user',
                    createdAt: new Date().toISOString(),
                    lastLogin: null
                };

                this.users.push(newUser);
                this._persistUsers();

                // set current user
                this.currentUser = { 
                    uid: newUser.uid, 
                    email: newUser.email, 
                    shopNumber: newUser.shopNumber, 
                    role: newUser.role,
                    name: newUser.name
                };

                logger.info('Mock user registration successful', { 
                    email, 
                    shopNumber: metadata.shopNumber 
                });
                
                resolve({ user: this.currentUser });
            }, 500);
        });
    }

    async signOut() {
        this.currentUser = null;
        logger.info('Mock user signed out');
        return Promise.resolve();
    }

    onAuthStateChanged(callback) {
        // Simulate auth state check
        setTimeout(() => {
            callback(this.currentUser);
        }, 100);
        return () => {}; // Mock unsubscribe function
    }
}

class MockFirestore {
    constructor() {
        this.collections = {
            users: JSON.parse(localStorage.getItem('mockUsersDB')) || [],
            shops: JSON.parse(localStorage.getItem('mockShopsDB')) || [],
            products: JSON.parse(localStorage.getItem('mockProductsDB')) || [],
            offers: JSON.parse(localStorage.getItem('mockOffersDB')) || [],
            categories: JSON.parse(localStorage.getItem('mockCategoriesDB')) || [],
            logs: JSON.parse(localStorage.getItem('mockLogsDB')) || []
        };
    }

    collection(name) {
        return new MockCollectionReference(this.collections[name], name);
    }
}

class MockCollectionReference {
    constructor(data, collectionName) {
        this.data = data;
        this.collectionName = collectionName;
    }

    doc(id) {
        return new MockDocumentReference(this.data, id, this.collectionName);
    }

    add(data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newDoc = {
                    id: 'doc_' + Date.now(),
                    ...data,
                    createdAt: new Date().toISOString()
                };
                this.data.push(newDoc);
                this._saveToStorage();
                logger.info(`Mock document added to ${this.collectionName}`, newDoc);
                resolve({ id: newDoc.id });
            }, 300);
        });
    }

    where(field, operator, value) {
        return new MockQuery(this.data, field, operator, value, this.collectionName);
    }

    orderBy(field, direction = 'asc') {
        return new MockQuery(this.data, null, null, null, this.collectionName, field, direction);
    }

    _saveToStorage() {
        localStorage.setItem(`mock${this.collectionName.charAt(0).toUpperCase() + this.collectionName.slice(1)}DB`, 
                            JSON.stringify(this.data));
    }
}

class MockQuery {
    constructor(data, field, operator, value, collectionName, orderField, orderDirection) {
        this.data = [...data];
        this.field = field;
        this.operator = operator;
        this.value = value;
        this.collectionName = collectionName;
        this.orderField = orderField;
        this.orderDirection = orderDirection;
    }

    where(field, operator, value) {
        return new MockQuery(this.data, field, operator, value, this.collectionName, this.orderField, this.orderDirection);
    }

    orderBy(field, direction) {
        return new MockQuery(this.data, this.field, this.operator, this.value, this.collectionName, field, direction);
    }

    async get() {
        return new Promise((resolve) => {
            setTimeout(() => {
                let result = [...this.data];

                // Apply where clause
                if (this.field && this.operator && this.value !== undefined) {
                    result = result.filter(doc => {
                        switch (this.operator) {
                            case '==': return doc[this.field] === this.value;
                            default: return true;
                        }
                    });
                }

                // Apply ordering
                if (this.orderField) {
                    result.sort((a, b) => {
                        if (a[this.orderField] < b[this.orderField]) return this.orderDirection === 'asc' ? -1 : 1;
                        if (a[this.orderField] > b[this.orderField]) return this.orderDirection === 'asc' ? 1 : -1;
                        return 0;
                    });
                }

                logger.info(`Mock query executed on ${this.collectionName}`, { 
                    results: result.length,
                    filters: { field: this.field, operator: this.operator, value: this.value }
                });

                resolve({
                    docs: result.map(doc => ({
                        id: doc.id,
                        data: () => ({ ...doc }),
                        exists: true
                    }))
                });
            }, 200);
        });
    }
}

class MockDocumentReference {
    constructor(data, id, collectionName) {
        this.data = data;
        this.id = id;
        this.collectionName = collectionName;
    }

    async get() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const doc = this.data.find(d => d.id === this.id);
                resolve({
                    exists: !!doc,
                    data: () => doc ? { ...doc } : null,
                    id: this.id
                });
            }, 200);
        });
    }

    async set(data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const index = this.data.findIndex(d => d.id === this.id);
                if (index !== -1) {
                    this.data[index] = { ...this.data[index], ...data };
                } else {
                    this.data.push({ id: this.id, ...data });
                }
                this._saveToStorage();
                logger.info(`Mock document set in ${this.collectionName}`, { id: this.id, data });
                resolve();
            }, 300);
        });
    }

    async update(data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const index = this.data.findIndex(d => d.id === this.id);
                if (index !== -1) {
                    this.data[index] = { ...this.data[index], ...data };
                    this._saveToStorage();
                    logger.info(`Mock document updated in ${this.collectionName}`, { id: this.id, data });
                    resolve();
                }
            }, 300);
        });
    }

    _saveToStorage() {
        localStorage.setItem(`mock${this.collectionName.charAt(0).toUpperCase() + this.collectionName.slice(1)}DB`, 
                            JSON.stringify(this.data));
    }
}

class MockStorage {
    // Simple mock storage - you can extend this if needed
    ref(path) {
        return {
            put: (file) => Promise.resolve({
                ref: { getDownloadURL: () => Promise.resolve('mock-url/' + path) }
            })
        };
    }
}

// Mock logger that works without Firebase
const logger = {
    info: (message, data = {}) => {
        console.log(`[INFO] ${message}`, data);
        logToMockStorage('INFO', message, data);
    },
    error: (message, error = {}) => {
        console.error(`[ERROR] ${message}`, error);
        logToMockStorage('ERROR', message, error);
    },
    warn: (message, data = {}) => {
        console.warn(`[WARN] ${message}`, data);
        logToMockStorage('WARN', message, data);
    }
};

function logToMockStorage(level, message, data) {
    const logs = JSON.parse(localStorage.getItem('mockLogsDB')) || [];
    logs.push({
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
        user: 'mock-user'
    });
    localStorage.setItem('mockLogsDB', JSON.stringify(logs));
}

// Initialize mock Firebase
const firebase = new MockFirebase();
const auth = firebase.auth;
const db = firebase.firestore;
const storage = firebase.storage;

// Auth Manager Class
class AuthManager {
    constructor() {
        this.initAuthListeners();
        this.initializeAdminUser();
        logger.info('AuthManager initialized');
    }

    initializeAdminUser() {
        const users = JSON.parse(localStorage.getItem('mockUsers')) || [];
        if (!users.find(u => u.email === 'admin@supermall.com')) {
            users.push({
                uid: 'admin_001',
                email: 'admin@supermall.com',
                password: 'admin123',
                role: 'admin',
                name: 'Super Admin',
                shopNumber: 'ADMIN',
                createdAt: new Date().toISOString(),
                lastLogin: null
            });
            localStorage.setItem('mockUsers', JSON.stringify(users));
            logger.info('Default admin user created');
        }
    }

    initAuthListeners() {
        // Check for existing session
        const currentUser = auth.currentUser;
        if (currentUser) {
            logger.info('Existing user session found', { email: currentUser.email });
            this.updateLastLogin(currentUser.uid);
        }
    }

    async updateLastLogin(uid) {
        const users = JSON.parse(localStorage.getItem('mockUsers')) || [];
        const userIndex = users.findIndex(u => u.uid === uid);
        if (userIndex !== -1) {
            users[userIndex].lastLogin = new Date().toISOString();
            localStorage.setItem('mockUsers', JSON.stringify(users));
        }
    }

    async register(email, password, userData) {
        try {
            const result = await auth.createUserWithEmailAndPassword(email, password, userData);
            if (result.user) {
                // Save additional user data to mockUsers array
                const users = JSON.parse(localStorage.getItem('mockUsers')) || [];
                const userIndex = users.findIndex(u => u.uid === result.user.uid);
                if (userIndex !== -1) {
                    users[userIndex] = { 
                        ...users[userIndex], 
                        ...userData,
                        createdAt: new Date().toISOString()
                    };
                    localStorage.setItem('mockUsers', JSON.stringify(users));
                }

                // Show success message
                if (window.appManager) {
                    appManager.showToast(`Welcome to Super Mall, ${userData.name}!`, 'success');
                }

                // Redirect to appropriate dashboard
                setTimeout(() => {
                    if (userData.role === 'admin') {
                        window.location.href = 'sampleDataView.html';
                    } else {
                        window.location.href = 'user-dashboard.html';
                    }
                }, 1500);
                
                return { success: true, user: result.user };
            }
        } catch (error) {
            logger.error('Registration failed', { email, error: error.message });
            return { success: false, error: error.message };
        }
    }

    async login(identifier, password) {
        try {
            const result = await auth.signInWithEmailAndPassword(identifier, password);
            if (result.user) {
                await this.updateLastLogin(result.user.uid);
                
                const users = JSON.parse(localStorage.getItem('mockUsers')) || [];
                const userData = users.find(u => u.uid === result.user.uid);
                
                if (userData) {
                    // Store logged in user data
                    localStorage.setItem('loggedInUser', JSON.stringify(userData));
                    
                    // Show welcome toast
                    if (window.appManager) {
                        appManager.showToast(`Welcome back, ${userData.name || userData.email}!`, 'success');
                    }
                    
                    // Redirect based on role
                    setTimeout(() => {
                        if (userData.role === 'admin') {
                            window.location.href = 'sampleDataView.html';
                        } else {
                            window.location.href = 'user-dashboard.html';
                        }
                    }, 1000);
                }
                
                return { success: true, user: result.user };
            }
        } catch (error) {
            logger.error('Login failed', { identifier, error: error.message });
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await auth.signOut();
            localStorage.removeItem('loggedInUser');
            logger.info('User logged out successfully');
            
            if (window.appManager) {
                appManager.showToast('Logged out successfully', 'info');
            }
            
            return { success: true };
        } catch (error) {
            logger.error('Logout failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    getCurrentUserData() {
        const currentUser = auth.currentUser;
        if (!currentUser) return null;
        
        const users = JSON.parse(localStorage.getItem('mockUsers')) || [];
        return users.find(u => u.uid === currentUser.uid);
    }
}

const authManager = new AuthManager();

// Sample data initialization
function initializeSampleData() {
    if (!localStorage.getItem('sampleDataInitialized')) {
        const sampleCategories = [
            { id: 'cat1', name: 'Clothing', description: 'Fashion and apparel', status: 'active', createdAt: new Date().toISOString() },
            { id: 'cat2', name: 'Electronics', description: 'Gadgets and devices', status: 'active', createdAt: new Date().toISOString() },
            { id: 'cat3', name: 'Food & Beverages', description: 'Restaurants and cafes', status: 'active', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem('mockCategoriesDB', JSON.stringify(sampleCategories));

        const sampleShops = [
            { 
                id: 'shop1', 
                name: 'Fashion Hub', 
                description: 'Latest fashion trends', 
                category: 'Clothing', 
                floor: '1', 
                contact: 'contact@fashionhub.com',
                createdBy: 'admin',
                status: 'active',
                createdAt: new Date().toISOString()
            },
            { 
                id: 'shop2', 
                name: 'Tech World', 
                description: 'Latest gadgets and electronics', 
                category: 'Electronics', 
                floor: '2', 
                contact: 'info@techworld.com',
                createdBy: 'admin',
                status: 'active',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('mockShopsDB', JSON.stringify(sampleShops));

        localStorage.setItem('sampleDataInitialized', 'true');
    }
}

// Initialize sample data when the app loads
document.addEventListener('DOMContentLoaded', initializeSampleData);