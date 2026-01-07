// FitFindr Gym Cloud Database System
// Cross-device authentication using cloud storage

class FitFindrCloudDB {
    constructor() {
        // You can replace this with your own backend API
        this.apiBase = 'https://jsonbin.io/v3/b'; // Free JSON storage service
        this.apiKey = '$2a$10$your-api-key-here'; // Replace with your API key
        this.binId = 'your-bin-id-here'; // Replace with your bin ID
        this.fallbackToLocal = true; // Fallback to IndexedDB if cloud fails
        this.localDB = null;
    }

    // Initialize cloud database
    async init() {
        console.log('Initializing cloud database...');
        
        // Initialize local fallback
        if (this.fallbackToLocal) {
            try {
                const { FitFindrDB } = await import('./database.js');
                this.localDB = new FitFindrDB();
                await this.localDB.init();
                console.log('Local fallback database ready');
            } catch (error) {
                console.warn('Local fallback failed:', error);
            }
        }

        // Test cloud connection
        try {
            await this.testCloudConnection();
            console.log('Cloud database connection successful');
            return true;
        } catch (error) {
            console.warn('Cloud database unavailable, using local storage');
            return this.localDB !== null;
        }
    }

    // Test cloud connection
    async testCloudConnection() {
        const response = await fetch(`${this.apiBase}/${this.binId}`, {
            method: 'GET',
            headers: {
                'X-Master-Key': this.apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Cloud connection failed');
        }

        return true;
    }

    // Hash password for security
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'FitFindrCloudSalt2023');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Get all users from cloud
    async getCloudUsers() {
        try {
            const response = await fetch(`${this.apiBase}/${this.binId}`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            return data.record.users || [];
        } catch (error) {
            console.error('Cloud fetch failed:', error);
            if (this.localDB) {
                return await this.localDB.getAllUsers();
            }
            return [];
        }
    }

    // Save users to cloud
    async saveCloudUsers(users) {
        try {
            const response = await fetch(`${this.apiBase}/${this.binId}`, {
                method: 'PUT',
                headers: {
                    'X-Master-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    users: users,
                    lastUpdated: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save users');
            }

            return true;
        } catch (error) {
            console.error('Cloud save failed:', error);
            return false;
        }
    }

    // Register new user (cloud + local)
    async registerUser(userData) {
        try {
            const hashedPassword = await this.hashPassword(userData.password);
            
            const newUser = {
                id: Date.now(), // Simple ID generation
                fullName: userData.fullName,
                email: userData.email.toLowerCase(),
                password: hashedPassword,
                registrationDate: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                loginAttempts: 0,
                lockedUntil: null,
                membershipType: 'basic',
                profilePicture: null,
                deviceRegistered: navigator.userAgent.substring(0, 50) // Track device
            };

            // Get existing users
            const users = await this.getCloudUsers();
            
            // Check if email already exists
            const existingUser = users.find(u => u.email === newUser.email);
            if (existingUser) {
                return { success: false, message: 'Email already exists' };
            }

            // Add new user
            users.push(newUser);

            // Save to cloud
            const cloudSaved = await this.saveCloudUsers(users);
            
            // Save to local as backup
            if (this.localDB) {
                try {
                    await this.localDB.registerUser(userData);
                } catch (localError) {
                    console.warn('Local backup save failed:', localError);
                }
            }

            if (cloudSaved) {
                console.log('User registered successfully in cloud');
                return { success: true, userId: newUser.id, user: newUser };
            } else {
                throw new Error('Cloud registration failed');
            }

        } catch (error) {
            console.error('Registration error:', error);
            
            // Fallback to local registration
            if (this.localDB) {
                console.log('Falling back to local registration');
                return await this.localDB.registerUser(userData);
            }
            
            return { success: false, message: 'Registration failed: ' + error.message };
        }
    }

    // Authenticate user (cloud + local)
    async authenticateUser(email, password) {
        try {
            const hashedPassword = await this.hashPassword(password);
            
            // Get users from cloud
            const users = await this.getCloudUsers();
            const user = users.find(u => u.email === email.toLowerCase());

            if (!user) {
                return { success: false, message: 'User not found' };
            }

            // Check if account is locked
            if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
                return { 
                    success: false, 
                    message: 'Account temporarily locked. Try again later.' 
                };
            }

            // Check password
            if (user.password === hashedPassword) {
                // Update last login and reset attempts
                user.loginAttempts = 0;
                user.lockedUntil = null;
                user.lastLogin = new Date().toISOString();
                user.lastDevice = navigator.userAgent.substring(0, 50);
                
                // Update in cloud
                const userIndex = users.findIndex(u => u.id === user.id);
                users[userIndex] = user;
                await this.saveCloudUsers(users);
                
                // Update local backup
                if (this.localDB) {
                    try {
                        await this.localDB.authenticateUser(email, password);
                    } catch (localError) {
                        console.warn('Local backup update failed:', localError);
                    }
                }

                return { 
                    success: true, 
                    user: {
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email,
                        membershipType: user.membershipType,
                        lastLogin: user.lastLogin
                    }
                };
            } else {
                // Increment login attempts
                user.loginAttempts = (user.loginAttempts || 0) + 1;
                
                // Lock account after 5 failed attempts
                if (user.loginAttempts >= 5) {
                    user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                }
                
                // Update in cloud
                const userIndex = users.findIndex(u => u.id === user.id);
                users[userIndex] = user;
                await this.saveCloudUsers(users);
                
                return { 
                    success: false, 
                    message: `Invalid password. ${5 - user.loginAttempts} attempts remaining.` 
                };
            }

        } catch (error) {
            console.error('Authentication error:', error);
            
            // Fallback to local authentication
            if (this.localDB) {
                console.log('Falling back to local authentication');
                return await this.localDB.authenticateUser(email, password);
            }
            
            return { success: false, message: 'Authentication failed: ' + error.message };
        }
    }

    // Get all users (for display)
    async getAllUsers() {
        try {
            const users = await this.getCloudUsers();
            return users.map(user => ({
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                registrationDate: user.registrationDate,
                lastLogin: user.lastLogin,
                membershipType: user.membershipType,
                isActive: user.isActive,
                deviceRegistered: user.deviceRegistered,
                lastDevice: user.lastDevice
            }));
        } catch (error) {
            console.error('Error getting users:', error);
            
            // Fallback to local
            if (this.localDB) {
                return await this.localDB.getAllUsers();
            }
            
            return [];
        }
    }

    // Sync local data to cloud
    async syncToCloud() {
        if (!this.localDB) return false;

        try {
            const localUsers = await this.localDB.getAllUsers();
            const cloudUsers = await this.getCloudUsers();
            
            // Merge users (cloud takes priority for conflicts)
            const mergedUsers = [...cloudUsers];
            
            localUsers.forEach(localUser => {
                const existsInCloud = cloudUsers.find(u => u.email === localUser.email);
                if (!existsInCloud) {
                    mergedUsers.push({
                        ...localUser,
                        id: Date.now() + Math.random(),
                        syncedFromLocal: true
                    });
                }
            });

            await this.saveCloudUsers(mergedUsers);
            console.log('Local data synced to cloud successfully');
            return true;
        } catch (error) {
            console.error('Sync failed:', error);
            return false;
        }
    }

    // Check if user exists across devices
    async checkUserExists(email) {
        const users = await this.getCloudUsers();
        const user = users.find(u => u.email === email.toLowerCase());
        
        if (user) {
            return {
                exists: true,
                devices: [user.deviceRegistered, user.lastDevice].filter(Boolean),
                lastLogin: user.lastLogin
            };
        }
        
        return { exists: false };
    }
}

// Initialize cloud database instance
const FitFindrCloudDB = new FitFindrCloudDB();

// Export for use in other files
window.FitFindrCloudDB = FitFindrCloudDB;