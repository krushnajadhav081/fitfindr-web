// Login Page JavaScript

let dbReady = false;
let dbInitPromise = null;

// Initialize database when page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Show loading indicator
    showDatabaseStatus('Initializing database...', 'loading');
    
    try {
        // Wait for FitFindrDB to be available
        if (!window.DemoCloudDB) {
            throw new Error('DemoCloudDB not loaded');
        }
        
        // Initialize database with retry logic
        dbInitPromise = initializeDatabase();
        await dbInitPromise;
        
        dbReady = true;
        console.log('Database initialized successfully');
        showDatabaseStatus('Database ready', 'success');
        
        // Load registered users count
        await loadRegisteredUsersCount();
        
        // Debug: Show available users
        const users = await window.DemoCloudDB.getAllUsers();
        console.log('Available users for login:', users.map(u => ({ email: u.email, name: u.fullName })));
        
        // Test registered users display
        setTimeout(() => {
            const showUsersBtn = document.getElementById('showUsersBtn');
            if (showUsersBtn) {
                console.log('Show users button found, testing functionality...');
                // Auto-click to test (for debugging)
                // showUsersBtn.click();
            } else {
                console.error('Show users button not found!');
            }
        }, 3000);
        
        // Clean expired sessions
        await window.DemoCloudDB.showCrossDeviceStatus();
        
        // Hide status after 2 seconds
        setTimeout(() => hideDatabaseStatus(), 2000);
        
    } catch (error) {
        console.error('Database initialization failed:', error);
        showDatabaseStatus('Database initialization failed. Retrying...', 'error');
        
        // Retry after 2 seconds
        setTimeout(async () => {
            try {
                if (window.DemoCloudDB) {
                    await window.DemoCloudDB.init();
                    dbReady = true;
                    showDatabaseStatus('Database ready', 'success');
                    await loadRegisteredUsersCount();
                    setTimeout(() => hideDatabaseStatus(), 2000);
                } else {
                    throw new Error('DemoCloudDB still not available');
                }
            } catch (retryError) {
                console.error('Database retry failed:', retryError);
                showDatabaseStatus('Database unavailable. Please refresh the page.', 'error');
            }
        }, 2000);
    }

    setupLoginForm();
    setupSocialButtons();
    setupRegisteredUsers();
});

// Initialize database with better error handling
async function initializeDatabase() {
    if (!window.indexedDB) {
        throw new Error('IndexedDB not supported in this browser');
    }
    
    if (!window.DemoCloudDB) {
        throw new Error('DemoCloudDB class not available');
    }
    
    return await window.DemoCloudDB.init();
}

// Show database status with animations
function showDatabaseStatus(message, type) {
    let statusDiv = document.getElementById('db-status');
    
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'db-status';
        statusDiv.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        `;
        document.body.appendChild(statusDiv);
    }
    
    const animations = {
        loading: {
            bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            icon: 'fas fa-spinner fa-spin',
            animation: 'slideInBounce 0.6s ease-out, pulse 2s infinite'
        },
        success: {
            bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            color: 'white',
            icon: 'fas fa-check-circle',
            animation: 'slideInSuccess 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55), successGlow 1s ease-in-out'
        },
        error: {
            bg: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
            color: 'white',
            icon: 'fas fa-exclamation-triangle',
            animation: 'slideInShake 0.6s ease-out, errorShake 0.5s ease-in-out 0.6s'
        }
    };
    
    const style = animations[type] || animations.loading;
    
    // Add CSS animations if not already added
    if (!document.getElementById('message-animations')) {
        const animationStyles = document.createElement('style');
        animationStyles.id = 'message-animations';
        animationStyles.textContent = `
            @keyframes slideInBounce {
                0% { transform: translateX(-50%) translateY(-100px) scale(0.8); opacity: 0; }
                60% { transform: translateX(-50%) translateY(10px) scale(1.05); opacity: 1; }
                100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
            }
            
            @keyframes slideInSuccess {
                0% { transform: translateX(-50%) translateY(-100px) scale(0.5) rotate(-10deg); opacity: 0; }
                50% { transform: translateX(-50%) translateY(5px) scale(1.1) rotate(5deg); opacity: 1; }
                100% { transform: translateX(-50%) translateY(0) scale(1) rotate(0deg); opacity: 1; }
            }
            
            @keyframes slideInShake {
                0% { transform: translateX(-50%) translateY(-100px); opacity: 0; }
                50% { transform: translateX(-50%) translateY(0); opacity: 1; }
                60% { transform: translateX(-45%) translateY(0); }
                70% { transform: translateX(-55%) translateY(0); }
                80% { transform: translateX(-48%) translateY(0); }
                90% { transform: translateX(-52%) translateY(0); }
                100% { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            
            @keyframes pulse {
                0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
                50% { box-shadow: 0 6px 30px rgba(102, 126, 234, 0.4); }
            }
            
            @keyframes successGlow {
                0% { box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
                50% { box-shadow: 0 8px 40px rgba(17, 153, 142, 0.6), 0 0 20px rgba(56, 239, 125, 0.3); }
                100% { box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
            }
            
            @keyframes errorShake {
                0%, 100% { transform: translateX(-50%) translateY(0); }
                25% { transform: translateX(-48%) translateY(0); }
                75% { transform: translateX(-52%) translateY(0); }
            }
            
            @keyframes slideOut {
                0% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
                100% { transform: translateX(-50%) translateY(-100px) scale(0.8); opacity: 0; }
            }
        `;
        document.head.appendChild(animationStyles);
    }
    
    statusDiv.style.background = style.bg;
    statusDiv.style.color = style.color;
    statusDiv.style.animation = style.animation;
    statusDiv.innerHTML = `<i class="${style.icon}" style="margin-right: 8px;"></i>${message}`;
    statusDiv.style.opacity = '1';
    statusDiv.style.transform = 'translateX(-50%) translateY(0)';
}

// Hide database status with animation
function hideDatabaseStatus() {
    const statusDiv = document.getElementById('db-status');
    if (statusDiv) {
        statusDiv.style.animation = 'slideOut 0.4s ease-in-out';
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.parentNode.removeChild(statusDiv);
            }
        }, 400);
    }
}

// Setup login form
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Wait for database if it's still initializing
            if (!dbReady && dbInitPromise) {
                showDatabaseStatus('Waiting for database...', 'loading');
                try {
                    await dbInitPromise;
                    dbReady = true;
                    hideDatabaseStatus();
                } catch (error) {
                    showDatabaseStatus('Database error. Please refresh the page.', 'error');
                    return;
                }
            }
            
            if (!dbReady) {
                alert('Database not available. Please refresh the page and try again.');
                return;
            }
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;
            
            // Basic validation
            if (!email || !password) {
                alert('Please fill in all fields');
                return;
            }
            
            if (!isValidEmail(email)) {
                alert('Please enter a valid email address');
                return;
            }
            
            // Show loading state
            const loginBtn = document.querySelector('.login-btn');
            const originalText = loginBtn.innerHTML;
            
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            loginBtn.disabled = true;
            
            try {
                // Authenticate user
                console.log('Attempting login with:', email);
                const result = await window.DemoCloudDB.authenticateUser(email, password);
                console.log('Authentication result:', result);
                
                if (result.success) {
                    // Store user data (no session creation needed for demo)
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userEmail', result.user.email);
                    localStorage.setItem('userName', result.user.fullName);
                    localStorage.setItem('userId', result.user.id);
                    localStorage.setItem('membershipType', result.user.membershipType);
                    
                    showDatabaseStatus(`Welcome back, ${result.user.fullName}!`, 'success');
                    
                    // Redirect after short delay
                    setTimeout(() => {
                        window.location.href = 'home.html';
                    }, 1000);
                } else {
                    alert(result.message || 'Login failed. Please check your credentials.');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed. Please try again.');
            } finally {
                // Reset button
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
            }
        });
    }
}

// Setup social buttons
function setupSocialButtons() {
    const googleBtn = document.querySelector('.google-btn');
    const facebookBtn = document.querySelector('.facebook-btn');
    
    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            alert('Google login integration would be implemented here with OAuth 2.0');
        });
    }
    
    if (facebookBtn) {
        facebookBtn.addEventListener('click', function() {
            alert('Facebook login integration would be implemented here with Facebook SDK');
        });
    }
}

// Setup registered users functionality
function setupRegisteredUsers() {
    const showUsersBtn = document.getElementById('showUsersBtn');
    const registeredUsersSection = document.getElementById('registeredUsersSection');
    
    if (showUsersBtn && registeredUsersSection) {
        showUsersBtn.addEventListener('click', async function() {
            if (!dbReady) {
                alert('Database not ready. Please wait a moment and try again.');
                return;
            }
            
            const isVisible = registeredUsersSection.style.display !== 'none';
            
            if (isVisible) {
                registeredUsersSection.style.display = 'none';
                this.innerHTML = '<i class="fas fa-users"></i> Show Registered Users';
            } else {
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Users...';
                
                try {
                    await displayRegisteredUsers();
                    registeredUsersSection.style.display = 'block';
                    this.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Registered Users';
                } catch (error) {
                    console.error('Error displaying users:', error);
                    this.innerHTML = '<i class="fas fa-users"></i> Show Registered Users';
                    alert('Failed to load users. Please try again.');
                }
            }
        });
        
        // Auto-load users count on page load
        setTimeout(async () => {
            if (dbReady) {
                try {
                    const users = await window.DemoCloudDB.getAllUsers();
                    if (users && users.length > 0) {
                        showUsersBtn.innerHTML = `<i class="fas fa-users"></i> Show Registered Users (${users.length})`;
                    }
                } catch (error) {
                    console.error('Error loading user count:', error);
                }
            }
        }, 1000);
    } else {
        console.error('Show users button or section not found');
    }
}

// Display registered users
async function displayRegisteredUsers() {
    if (!dbReady) {
        console.log('Database not ready for displaying users');
        return;
    }
    
    const usersList = document.getElementById('usersList');
    
    try {
        console.log('Attempting to load users from DemoCloudDB...');
        
        // Check if DemoCloudDB is available
        if (!window.DemoCloudDB) {
            throw new Error('DemoCloudDB not available');
        }
        
        const users = await window.DemoCloudDB.getAllUsers();
        console.log('Loaded users:', users);
        
        if (users.length === 0) {
            usersList.innerHTML = '<p style="margin: 0; font-size: 0.85rem; color: #666; text-align: center;">No registered users yet. <a href="signup.html" style="color: var(--primary);">Sign up</a> to create an account!</p>';
            return;
        }
        
        usersList.innerHTML = users.map(user => `
            <div class="user-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; margin-bottom: 0.5rem; background: white; border-radius: 6px; cursor: pointer; border: 1px solid #e0e0e0; transition: all 0.2s ease;" 
                 onclick="fillUserCredentials('${user.email}', '${user.fullName}', '${user.membershipType}', '${getPasswordForEmail(user.email)}')"
                 onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.transform='translateY(-1px)'"
                 onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
                <div>
                    <strong style="font-size: 0.9rem; color: var(--primary);">${user.fullName}</strong>
                    <div style="font-size: 0.75rem; color: #666; margin-top: 2px;">${user.email}</div>
                    <div style="font-size: 0.7rem; color: #999; margin-top: 2px;">
                        <i class="fas fa-crown" style="color: #ffd700;"></i> ${user.membershipType ? user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1) : 'Basic'} Member
                        ${user.lastLogin ? `• Last login: ${new Date(user.lastLogin).toLocaleDateString()}` : '• Never logged in'}
                    </div>
                    <div style="font-size: 0.65rem; color: #28a745; margin-top: 3px; font-weight: 500;">
                        <i class="fas fa-key" style="margin-right: 3px;"></i>Password: ${getPasswordForEmail(user.email)}
                    </div>
                </div>
                <div style="font-size: 0.7rem; color: #999; text-align: right;">
                    <i class="fas fa-mouse-pointer"></i><br>
                    <span>Click for instant login</span>
                </div>
            </div>
        `).join('');
        
        console.log('✅ Users displayed successfully');
        
    } catch (error) {
        console.error('Error loading users:', error);
        usersList.innerHTML = `
            <div style="text-align: center; padding: 1rem;">
                <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i> Error loading users
                </p>
                <p style="margin: 0; font-size: 0.75rem; color: #666;">
                    ${error.message}
                </p>
                <button onclick="location.reload()" style="margin-top: 0.5rem; padding: 0.25rem 0.75rem; background: var(--primary); color: white; border: none; border-radius: 4px; font-size: 0.75rem; cursor: pointer;">
                    Refresh Page
                </button>
            </div>
        `;
    }
}

// Helper function to get password for demo accounts
function getPasswordForEmail(email) {
    const demoPasswords = {
        'john@demo.com': 'john123'
    };
    return demoPasswords[email.toLowerCase()] || '';
}

// Fill user credentials with enhanced animations
window.fillUserCredentials = function(email, fullName, membershipType, password) {
    // Fill both email and password
    document.getElementById('email').value = email;
    document.getElementById('password').value = password || getPasswordForEmail(email);
    
    // Enhanced visual feedback with ripple effect
    const userItems = document.querySelectorAll('.user-item');
    userItems.forEach(item => {
        if (item.textContent.includes(email)) {
            // Create ripple effect
            const ripple = document.createElement('div');
            ripple.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                background: radial-gradient(circle, rgba(40, 167, 69, 0.3) 0%, transparent 70%);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: rippleEffect 0.8s ease-out;
                pointer-events: none;
                z-index: 1;
            `;
            
            item.style.position = 'relative';
            item.style.overflow = 'hidden';
            item.appendChild(ripple);
            
            // Enhanced item animation
            item.style.background = 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)';
            item.style.borderColor = '#28a745';
            item.style.transform = 'scale(1.05) translateY(-2px)';
            item.style.boxShadow = '0 8px 25px rgba(40, 167, 69, 0.3)';
            item.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            
            // Remove ripple after animation
            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 800);
            
            // Reset item styles
            setTimeout(() => {
                item.style.background = 'white';
                item.style.borderColor = '#e0e0e0';
                item.style.transform = 'scale(1) translateY(0)';
                item.style.boxShadow = 'none';
            }, 2500);
        }
    });
    
    // Enhanced success message with slide-in animation
    const tempMsg = document.createElement('div');
    tempMsg.style.cssText = `
        position: fixed; 
        top: 20px; 
        right: -400px; 
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
        color: white; 
        padding: 16px 24px; 
        border-radius: 12px; 
        z-index: 9999; 
        font-size: 0.95rem;
        box-shadow: 0 8px 32px rgba(40, 167, 69, 0.4);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        min-width: 280px;
        transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    tempMsg.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <i class="fas fa-check-circle" style="margin-right: 8px; font-size: 1.1rem;"></i> 
            <strong>Ready to Login!</strong>
        </div>
        <div style="font-size: 0.85rem; opacity: 0.9;">
            Logged in as <strong>${fullName}</strong><br>
            Email & password filled - <strong>Click Sign In!</strong>
        </div>
    `;
    
    // Add ripple animation CSS if not exists
    if (!document.getElementById('ripple-animations')) {
        const rippleStyles = document.createElement('style');
        rippleStyles.id = 'ripple-animations';
        rippleStyles.textContent = `
            @keyframes rippleEffect {
                0% { width: 0; height: 0; opacity: 1; }
                100% { width: 200px; height: 200px; opacity: 0; }
            }
            
            @keyframes messageSlideIn {
                0% { transform: translateX(100%) scale(0.8); opacity: 0; }
                60% { transform: translateX(-10px) scale(1.05); opacity: 1; }
                100% { transform: translateX(0) scale(1); opacity: 1; }
            }
            
            @keyframes messageSlideOut {
                0% { transform: translateX(0) scale(1); opacity: 1; }
                100% { transform: translateX(100%) scale(0.8); opacity: 0; }
            }
        `;
        document.head.appendChild(rippleStyles);
    }
    
    document.body.appendChild(tempMsg);
    
    // Trigger slide-in animation
    setTimeout(() => {
        tempMsg.style.right = '20px';
        tempMsg.style.animation = 'messageSlideIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    }, 100);
    
    // Auto-hide with slide-out animation
    setTimeout(() => {
        tempMsg.style.animation = 'messageSlideOut 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53)';
        tempMsg.style.right = '-400px';
        setTimeout(() => {
            if (document.body.contains(tempMsg)) {
                document.body.removeChild(tempMsg);
            }
        }, 500);
    }, 3500);
};

// Load registered users count
async function loadRegisteredUsersCount() {
    if (!dbReady) return;
    
    try {
        const users = await window.DemoCloudDB.getAllUsers();
        const showUsersBtn = document.getElementById('showUsersBtn');
        if (showUsersBtn && users.length > 0) {
            showUsersBtn.innerHTML = `<i class="fas fa-users"></i> Show Registered Users (${users.length})`;
        }
    } catch (error) {
        console.error('Error loading user count:', error);
    }
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}