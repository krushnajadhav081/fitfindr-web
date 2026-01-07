// FitFindr Gym Database Management System
// Using IndexedDB for robust data storage

class FitFindrDB {
    constructor() {
        this.dbName = 'FitFindrGymDB';
        this.version = 1;
        this.db = null;
        this.isInitialized = false;
    }

    // Initialize database
    async init() {
        if (this.isInitialized && this.db) {
            console.log('Database already initialized');
            return this.db;
        }

        return new Promise((resolve, reject) => {
            console.log('Starting database initialization...');
            
            if (!window.indexedDB) {
                const error = new Error('IndexedDB not supported in this browser');
                console.error(error.message);
                reject(error);
                return;
            }

            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                const error = new Error(`Database failed to open: ${request.error?.message || 'Unknown error'}`);
                console.error(error.message);
                reject(error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                console.log('Database opened successfully');
                
                // Add error handler for database
                this.db.onerror = (event) => {
                    console.error('Database error:', event.target.error);
                };
                
                resolve(this.db);
            };

            request.onupgradeneeded = (e) => {
                console.log('Database upgrade needed, creating object stores...');
                this.db = e.target.result;

                // Create Users object store
                if (!this.db.objectStoreNames.contains('users')) {
                    console.log('Creating users object store...');
                    const usersStore = this.db.createObjectStore('users', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    // Create indexes for efficient querying
                    usersStore.createIndex('email', 'email', { unique: true });
                    usersStore.createIndex('fullName', 'fullName', { unique: false });
                    usersStore.createIndex('registrationDate', 'registrationDate', { unique: false });
                    usersStore.createIndex('lastLogin', 'lastLogin', { unique: false });
                    console.log('Users object store created');
                }

                // Create Sessions object store
                if (!this.db.objectStoreNames.contains('sessions')) {
                    console.log('Creating sessions object store...');
                    const sessionsStore = this.db.createObjectStore('sessions', { 
                        keyPath: 'sessionId' 
                    });
                    sessionsStore.createIndex('userId', 'userId', { unique: false });
                    sessionsStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('Sessions object store created');
                }

                // Create User Activity Log
                if (!this.db.objectStoreNames.contains('userActivity')) {
                    console.log('Creating userActivity object store...');
                    const activityStore = this.db.createObjectStore('userActivity', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    activityStore.createIndex('userId', 'userId', { unique: false });
                    activityStore.createIndex('action', 'action', { unique: false });
                    activityStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('UserActivity object store created');
                }

                console.log('Database setup complete');
            };
        });
    }

    // Check if database is ready
    isReady() {
        return this.isInitialized && this.db !== null;
    }

    // Get database status
    getStatus() {
        return {
            initialized: this.isInitialized,
            connected: this.db !== null,
            dbName: this.dbName,
            version: this.version
        };
    }

    // Hash password for security
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'FitFindrSalt2023'); // Add salt
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Generate session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    // Register new user
    async registerUser(userData) {
        if (!this.isReady()) {
            throw new Error('Database not initialized. Please wait and try again.');
        }

        try {
            const hashedPassword = await this.hashPassword(userData.password);
            
            const user = {
                fullName: userData.fullName,
                email: userData.email.toLowerCase(),
                password: hashedPassword,
                registrationDate: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                loginAttempts: 0,
                lockedUntil: null,
                membershipType: 'basic',
                profilePicture: null
            };

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['users'], 'readwrite');
                const store = transaction.objectStore('users');
                const request = store.add(user);

                request.onsuccess = () => {
                    console.log('User registered successfully');
                    this.logActivity(request.result, 'USER_REGISTERED', 'New user account created');
                    resolve({ success: true, userId: request.result, user: user });
                };

                request.onerror = () => {
                    if (request.error.name === 'ConstraintError') {
                        reject({ success: false, message: 'Email already exists' });
                    } else {
                        reject({ success: false, message: 'Registration failed' });
                    }
                };
            });
        } catch (error) {
            return { success: false, message: 'Registration failed: ' + error.message };
        }
    }

    // Authenticate user
    async authenticateUser(email, password) {
        if (!this.isReady()) {
            throw new Error('Database not initialized. Please wait and try again.');
        }

        try {
            const hashedPassword = await this.hashPassword(password);
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['users'], 'readwrite');
                const store = transaction.objectStore('users');
                const index = store.index('email');
                const request = index.get(email.toLowerCase());

                request.onsuccess = () => {
                    const user = request.result;
                    
                    if (!user) {
                        resolve({ success: false, message: 'User not found' });
                        return;
                    }

                    // Check if account is locked
                    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
                        resolve({ 
                            success: false, 
                            message: 'Account temporarily locked. Try again later.' 
                        });
                        return;
                    }

                    // Check password
                    if (user.password === hashedPassword) {
                        // Reset login attempts and update last login
                        user.loginAttempts = 0;
                        user.lockedUntil = null;
                        user.lastLogin = new Date().toISOString();
                        
                        const updateRequest = store.put(user);
                        updateRequest.onsuccess = () => {
                            this.logActivity(user.id, 'USER_LOGIN', 'Successful login');
                            resolve({ 
                                success: true, 
                                user: {
                                    id: user.id,
                                    fullName: user.fullName,
                                    email: user.email,
                                    membershipType: user.membershipType,
                                    lastLogin: user.lastLogin
                                }
                            });
                        };
                    } else {
                        // Increment login attempts
                        user.loginAttempts = (user.loginAttempts || 0) + 1;
                        
                        // Lock account after 5 failed attempts
                        if (user.loginAttempts >= 5) {
                            user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
                        }
                        
                        store.put(user);
                        this.logActivity(user.id, 'FAILED_LOGIN', `Failed login attempt #${user.loginAttempts}`);
                        
                        resolve({ 
                            success: false, 
                            message: `Invalid password. ${5 - user.loginAttempts} attempts remaining.` 
                        });
                    }
                };

                request.onerror = () => {
                    reject({ success: false, message: 'Authentication failed' });
                };
            });
        } catch (error) {
            return { success: false, message: 'Authentication error: ' + error.message };
        }
    }

    // Create user session
    async createSession(userId) {
        const sessionId = this.generateSessionId();
        const session = {
            sessionId: sessionId,
            userId: userId,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            isActive: true
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            const request = store.add(session);

            request.onsuccess = () => {
                localStorage.setItem('FitFindrSession', sessionId);
                resolve({ success: true, sessionId: sessionId });
            };

            request.onerror = () => {
                reject({ success: false, message: 'Session creation failed' });
            };
        });
    }

    // Validate session
    async validateSession(sessionId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions', 'users'], 'readonly');
            const sessionStore = transaction.objectStore('sessions');
            const request = sessionStore.get(sessionId);

            request.onsuccess = () => {
                const session = request.result;
                
                if (!session || !session.isActive || new Date() > new Date(session.expiresAt)) {
                    resolve({ valid: false, message: 'Session expired' });
                    return;
                }

                // Get user data
                const userStore = transaction.objectStore('users');
                const userRequest = userStore.get(session.userId);
                
                userRequest.onsuccess = () => {
                    const user = userRequest.result;
                    if (user && user.isActive) {
                        resolve({ 
                            valid: true, 
                            user: {
                                id: user.id,
                                fullName: user.fullName,
                                email: user.email,
                                membershipType: user.membershipType
                            }
                        });
                    } else {
                        resolve({ valid: false, message: 'User account inactive' });
                    }
                };
            };

            request.onerror = () => {
                reject({ valid: false, message: 'Session validation failed' });
            };
        });
    }

    // Logout user
    async logout(sessionId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            const request = store.get(sessionId);

            request.onsuccess = () => {
                const session = request.result;
                if (session) {
                    session.isActive = false;
                    store.put(session);
                    this.logActivity(session.userId, 'USER_LOGOUT', 'User logged out');
                }
                localStorage.removeItem('FitFindrSession');
                resolve({ success: true });
            };

            request.onerror = () => {
                reject({ success: false, message: 'Logout failed' });
            };
        });
    }

    // Get all users (for admin/demo purposes)
    async getAllUsers() {
        if (!this.isReady()) {
            throw new Error('Database not initialized. Please wait and try again.');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.getAll();

            request.onsuccess = () => {
                const users = request.result.map(user => ({
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    registrationDate: user.registrationDate,
                    lastLogin: user.lastLogin,
                    membershipType: user.membershipType,
                    isActive: user.isActive
                }));
                resolve(users);
            };

            request.onerror = () => {
                reject([]);
            };
        });
    }

    // Log user activity
    async logActivity(userId, action, details) {
        const activity = {
            userId: userId,
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            ipAddress: 'localhost', // In real app, get actual IP
            userAgent: navigator.userAgent
        };

        const transaction = this.db.transaction(['userActivity'], 'readwrite');
        const store = transaction.objectStore('userActivity');
        store.add(activity);
    }

    // Get user activity log
    async getUserActivity(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['userActivity'], 'readonly');
            const store = transaction.objectStore('userActivity');
            const index = store.index('userId');
            const request = index.getAll(userId);

            request.onsuccess = () => {
                const activities = request.result
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, limit);
                resolve(activities);
            };

            request.onerror = () => {
                reject([]);
            };
        });
    }

    // Clean expired sessions
    async cleanExpiredSessions() {
        const transaction = this.db.transaction(['sessions'], 'readwrite');
        const store = transaction.objectStore('sessions');
        const index = store.index('createdAt');
        const request = index.openCursor();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const session = cursor.value;
                if (new Date() > new Date(session.expiresAt)) {
                    cursor.delete();
                }
                cursor.continue();
            }
        };
    }
}

// Initialize database instance
const FitFindrDB = new FitFindrDB();

// Export for use in other files
window.FitFindrDB = FitFindrDB;