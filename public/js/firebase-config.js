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

    async signInWithEmailAndPassword(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const user = this.users.find(u => u.email === email && u.password === password);
                if (user) {
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email
                    };
                    logger.info('Mock login successful', { email });
                    resolve({ user: this.currentUser });
                } else {
                    logger.error('Mock login failed', { email });
                    reject(new Error('Invalid credentials'));
                }
            }, 500);
        });
    }

    async createUserWithEmailAndPassword(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (this.users.find(u => u.email === email)) {
                    reject(new Error('Email already exists'));
                    return;
                }

                const newUser = {
                    uid: 'user_' + Date.now(),
                    email: email,
                    password: password,
                    createdAt: new Date()
                };

                this.users.push(newUser);
                localStorage.setItem('mockUsers', JSON.stringify(this.users));

                this.currentUser = {
                    uid: newUser.uid,
                    email: newUser.email
                };

                logger.info('Mock user registration successful', { email });
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