// Signup Page JavaScript

let dbReady = false;

// Initialize database when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Wait for DemoCloudDB to be available
        if (!window.DemoCloudDB) {
            throw new Error('DemoCloudDB not loaded');
        }
        
        await window.DemoCloudDB.init();
        dbReady = true;
        console.log('Database initialized for signup');
    } catch (error) {
        console.error('Database initialization failed:', error);
        
        // Retry after a short delay
        setTimeout(async () => {
            try {
                if (window.DemoCloudDB) {
                    await window.DemoCloudDB.init();
                    dbReady = true;
                    console.log('Database initialized for signup (retry successful)');
                } else {
                    console.error('DemoCloudDB still not available after retry');
                }
            } catch (retryError) {
                console.error('Database retry failed:', retryError);
            }
        }, 1000);
    }

    const signupForm = document.getElementById('signupForm');
    
    // Handle form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!dbReady) {
                alert('Database not ready. Please wait and try again.');
                return;
            }
            
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const terms = document.getElementById('terms').checked;
            
            // Validation
            if (!fullName || !email || !password || !confirmPassword) {
                alert('Please fill in all fields');
                return;
            }
            
            if (fullName.length < 2) {
                alert('Full name must be at least 2 characters long');
                return;
            }
            
            if (!isValidEmail(email)) {
                alert('Please enter a valid email address');
                return;
            }
            
            if (password.length < 6) {
                alert('Password must be at least 6 characters long');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            if (!terms) {
                alert('Please accept the Terms & Conditions');
                return;
            }
            
            // Show loading state
            const signupBtn = document.querySelector('.login-btn');
            const originalText = signupBtn.innerHTML;
            
            signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            signupBtn.disabled = true;
            
            try {
                // Register user
                const result = await window.DemoCloudDB.registerUser({
                    fullName: fullName.trim(),
                    email: email.trim(),
                    password: password
                });
                
                if (result.success) {
                    // Show animated success message
                    showAnimatedMessage(
                        `🎉 Welcome to FitFindr, ${fullName}!`,
                        'Account created successfully. Redirecting to login...',
                        'success'
                    );
                    
                    // Redirect to login page after animation
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    showAnimatedMessage(
                        '❌ Registration Failed',
                        result.message || 'Please try again with different details.',
                        'error'
                    );
                }
            } catch (error) {
                console.error('Registration error:', error);
                if (error.message && error.message.includes('Email already exists')) {
                    showAnimatedMessage(
                        '📧 Email Already Registered',
                        'This email is already in use. Please login or use a different email.',
                        'warning'
                    );
                } else {
                    showAnimatedMessage(
                        '⚠️ Registration Error',
                        'Something went wrong. Please try again.',
                        'error'
                    );
                }
            } finally {
                // Reset button
                signupBtn.innerHTML = originalText;
                signupBtn.disabled = false;
            }
        });
    }
    
    // Social signup buttons
    const googleBtn = document.querySelector('.google-btn');
    const facebookBtn = document.querySelector('.facebook-btn');
    
    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            alert('Google signup integration would be implemented here with OAuth 2.0');
        });
    }
    
    if (facebookBtn) {
        facebookBtn.addEventListener('click', function() {
            alert('Facebook signup integration would be implemented here with Facebook SDK');
        });
    }
    
    // Password strength indicator
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = getPasswordStrength(password);
            showPasswordStrength(strength);
        });
    }
    
    // Real-time email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', async function() {
            const email = this.value.trim();
            if (email && isValidEmail(email) && dbReady) {
                // Check if email already exists
                try {
                    const users = await window.DemoCloudDB.getAllUsers();
                    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
                    
                    if (existingUser) {
                        this.style.borderColor = '#dc3545';
                        showEmailError('This email is already registered');
                    } else {
                        this.style.borderColor = '#28a745';
                        hideEmailError();
                    }
                } catch (error) {
                    console.error('Email check failed:', error);
                }
            }
        });
    }
});

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

// Password strength checker
function getPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return strength;
}

function showPasswordStrength(strength) {
    // Remove existing strength indicator
    const existingIndicator = document.querySelector('.password-strength');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const passwordGroup = document.getElementById('password').closest('.form-group');
    const indicator = document.createElement('div');
    indicator.className = 'password-strength';
    indicator.style.cssText = `
        margin-top: 0.5rem;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    `;
    
    let strengthText = '';
    let strengthColor = '';
    
    if (strength < 3) {
        strengthText = 'Weak';
        strengthColor = '#dc3545';
    } else if (strength < 5) {
        strengthText = 'Medium';
        strengthColor = '#ffc107';
    } else {
        strengthText = 'Strong';
        strengthColor = '#28a745';
    }
    
    indicator.innerHTML = `
        <div style="flex: 1; height: 4px; background: #e1e5e9; border-radius: 2px; overflow: hidden;">
            <div style="width: ${(strength / 6) * 100}%; height: 100%; background: ${strengthColor}; transition: all 0.3s ease;"></div>
        </div>
        <span style="color: ${strengthColor}; font-weight: 500;">${strengthText}</span>
    `;
    
    passwordGroup.appendChild(indicator);
}

// Show email error with animation
function showEmailError(message) {
    hideEmailError(); // Remove existing error
    
    const emailInput = document.getElementById('email');
    const errorDiv = document.createElement('div');
    errorDiv.id = 'email-error';
    errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 0.8rem;
        margin-top: 0.25rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        opacity: 0;
        transform: translateY(-10px);
        animation: errorSlideIn 0.3s ease-out forwards;
    `;
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle" style="animation: shake 0.5s ease-in-out;"></i> ${message}`;
    
    // Add shake animation for icon
    if (!document.getElementById('email-error-animations')) {
        const errorStyles = document.createElement('style');
        errorStyles.id = 'email-error-animations';
        errorStyles.textContent = `
            @keyframes errorSlideIn {
                0% { opacity: 0; transform: translateY(-10px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-2px); }
                75% { transform: translateX(2px); }
            }
        `;
        document.head.appendChild(errorStyles);
    }
    
    emailInput.parentNode.appendChild(errorDiv);
}

// Hide email error
function hideEmailError() {
    const existingError = document.getElementById('email-error');
    if (existingError) {
        existingError.remove();
    }
}

// Show animated messages
function showAnimatedMessage(title, message, type) {
    // Remove existing message
    const existingMsg = document.getElementById('animated-message');
    if (existingMsg) {
        existingMsg.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.id = 'animated-message';
    
    const animations = {
        success: {
            bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            borderColor: '#38ef7d',
            animation: 'successBounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        },
        error: {
            bg: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
            borderColor: '#ff4b2b',
            animation: 'errorShake 0.6s ease-out'
        },
        warning: {
            bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            borderColor: '#f5576c',
            animation: 'warningPulse 0.7s ease-out'
        }
    };
    
    const style = animations[type] || animations.success;
    
    messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        background: ${style.bg};
        color: white;
        padding: 24px 32px;
        border-radius: 16px;
        z-index: 10001;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        border: 2px solid ${style.borderColor};
        min-width: 320px;
        max-width: 90vw;
        animation: ${style.animation};
    `;
    
    messageDiv.innerHTML = `
        <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 8px;">
            ${title}
        </div>
        <div style="font-size: 0.95rem; opacity: 0.9; line-height: 1.4;">
            ${message}
        </div>
    `;
    
    // Add animation styles if not exists
    if (!document.getElementById('signup-message-animations')) {
        const animationStyles = document.createElement('style');
        animationStyles.id = 'signup-message-animations';
        animationStyles.textContent = `
            @keyframes successBounce {
                0% { transform: translate(-50%, -50%) scale(0) rotate(-10deg); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.1) rotate(5deg); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
            }
            
            @keyframes errorShake {
                0%, 100% { transform: translate(-50%, -50%) scale(1); }
                10%, 30%, 50%, 70%, 90% { transform: translate(-48%, -50%) scale(1); }
                20%, 40%, 60%, 80% { transform: translate(-52%, -50%) scale(1); }
            }
            
            @keyframes warningPulse {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            
            @keyframes fadeOut {
                0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
            }
        `;
        document.head.appendChild(animationStyles);
    }
    
    document.body.appendChild(messageDiv);
    
    // Auto-hide after delay (except for success which redirects)
    if (type !== 'success') {
        setTimeout(() => {
            messageDiv.style.animation = 'fadeOut 0.4s ease-in-out';
            setTimeout(() => {
                if (document.body.contains(messageDiv)) {
                    document.body.removeChild(messageDiv);
                }
            }, 400);
        }, 4000);
    }
}