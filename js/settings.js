// Settings Page JavaScript

let dbReady = false;
let currentUser = null;

// Initialize settings page
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Initialize database
        if (window.DemoCloudDB) {
            await window.DemoCloudDB.init();
            dbReady = true;
            console.log('Settings: Database initialized');
        }

        // Load user profile
        await loadUserProfile();
        
        // Setup form handlers
        setupChangePasswordForm();
        setupDeviceInfo();
        
    } catch (error) {
        console.error('Settings initialization failed:', error);
        showSettingsMessage('Failed to load settings. Please refresh the page.', 'error');
    }
});

// Load user profile information
async function loadUserProfile() {
    try {
        const userEmail = localStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');
        const membershipType = localStorage.getItem('membershipType');
        const userId = localStorage.getItem('userId');

        if (!userEmail || !dbReady) {
            throw new Error('User data not available');
        }

        // Get full user data from database
        const users = await window.DemoCloudDB.getAllUsers();
        currentUser = users.find(u => u.email === userEmail);

        if (!currentUser) {
            throw new Error('User not found in database');
        }

        // Update profile display
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('userName').textContent = currentUser.fullName;
        document.getElementById('membershipType').textContent = currentUser.membershipType || 'Basic';
        
        // Format dates
        const registrationDate = new Date(currentUser.registrationDate);
        document.getElementById('memberSince').textContent = registrationDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const lastLoginDate = currentUser.lastLogin ? new Date(currentUser.lastLogin) : null;
        document.getElementById('lastLogin').textContent = lastLoginDate ? 
            lastLoginDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'Never';

        console.log('✅ User profile loaded successfully');

    } catch (error) {
        console.error('Error loading user profile:', error);
        showSettingsMessage('Failed to load user profile.', 'error');
    }
}

// Setup device information
function setupDeviceInfo() {
    try {
        // Current device info
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        
        // Simplified device detection
        let deviceType = 'Desktop';
        if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
            deviceType = 'Mobile Device';
        } else if (/Tablet|iPad/.test(userAgent)) {
            deviceType = 'Tablet';
        }

        let browserName = 'Unknown Browser';
        if (userAgent.includes('Chrome')) browserName = 'Google Chrome';
        else if (userAgent.includes('Firefox')) browserName = 'Mozilla Firefox';
        else if (userAgent.includes('Safari')) browserName = 'Safari';
        else if (userAgent.includes('Edge')) browserName = 'Microsoft Edge';

        document.getElementById('currentDevice').textContent = `${deviceType} - ${browserName}`;
        document.getElementById('currentPlatform').textContent = platform;

    } catch (error) {
        console.error('Error setting up device info:', error);
        document.getElementById('currentDevice').textContent = 'Unable to detect';
        document.getElementById('currentPlatform').textContent = 'Unknown';
    }
}

// Setup change password form
function setupChangePasswordForm() {
    const form = document.getElementById('changePasswordForm');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!dbReady || !currentUser) {
                showSettingsMessage('Database not ready. Please refresh the page.', 'error');
                return;
            }

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            // Validation
            if (!currentPassword || !newPassword || !confirmNewPassword) {
                showSettingsMessage('Please fill in all password fields.', 'error');
                return;
            }

            if (newPassword.length < 6) {
                showSettingsMessage('New password must be at least 6 characters long.', 'error');
                return;
            }

            if (newPassword !== confirmNewPassword) {
                showSettingsMessage('New passwords do not match. Please check and try again.', 'error');
                return;
            }

            if (currentPassword === newPassword) {
                showSettingsMessage('New password must be different from current password.', 'error');
                return;
            }

            // Additional password strength check
            if (newPassword.length < 8) {
                const proceed = confirm('Your new password is less than 8 characters. For better security, we recommend using at least 8 characters. Do you want to continue?');
                if (!proceed) {
                    return;
                }
            }

            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            submitBtn.disabled = true;

            try {
                // Verify current password first
                const authResult = await window.DemoCloudDB.authenticateUser(currentUser.email, currentPassword);
                
                if (!authResult.success) {
                    showSettingsMessage('Current password is incorrect. Please try again.', 'error');
                    return;
                }

                // Update password
                const updateResult = await updateUserPassword(currentUser.email, newPassword);
                
                if (updateResult.success) {
                    showSettingsMessage('Password updated successfully! You will be logged out for security.', 'success');
                    
                    // Clear form
                    form.reset();
                    
                    // Auto-logout after password change for security
                    setTimeout(() => {
                        showSettingsMessage('Logging out for security...', 'warning');
                        setTimeout(() => {
                            logout();
                        }, 2000);
                    }, 2000);
                } else {
                    showSettingsMessage(updateResult.message || 'Failed to update password. Please try again.', 'error');
                }

            } catch (error) {
                console.error('Password change error:', error);
                showSettingsMessage('An error occurred while updating password. Please try again.', 'error');
            } finally {
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

// Update user password in database
async function updateUserPassword(email, newPassword) {
    try {
        if (!window.DemoCloudDB) {
            return { success: false, message: 'Database not available' };
        }

        const users = window.DemoCloudDB.getCloudUsers();
        const userIndex = users.findIndex(u => u.email === email.toLowerCase());

        if (userIndex === -1) {
            return { success: false, message: 'User not found' };
        }

        // Hash new password using the same method as registration
        const hashedPassword = await window.DemoCloudDB.hashPassword(newPassword);
        
        // Update user password and metadata
        users[userIndex].password = hashedPassword;
        users[userIndex].passwordChangedAt = new Date().toISOString();
        users[userIndex].lastPasswordChange = new Date().toISOString();
        
        // Save to database
        const saved = window.DemoCloudDB.saveCloudUsers(users);
        
        if (saved) {
            console.log('✅ Password updated successfully for:', email);
            
            // Update current user object
            currentUser.password = hashedPassword;
            currentUser.passwordChangedAt = users[userIndex].passwordChangedAt;
            
            return { success: true, message: 'Password updated successfully' };
        } else {
            return { success: false, message: 'Failed to save password change to database' };
        }

    } catch (error) {
        console.error('Error updating password:', error);
        return { success: false, message: 'Password update failed: ' + error.message };
    }
}

// Export account data
function exportAccountData() {
    try {
        if (!currentUser) {
            showSettingsMessage('User data not available for export.', 'error');
            return;
        }

        // Create exportable data (excluding sensitive info)
        const exportData = {
            fullName: currentUser.fullName,
            email: currentUser.email,
            membershipType: currentUser.membershipType,
            registrationDate: currentUser.registrationDate,
            lastLogin: currentUser.lastLogin,
            isActive: currentUser.isActive,
            deviceInfo: currentUser.deviceInfo,
            exportedAt: new Date().toISOString()
        };

        // Create and download file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `FitFindr-account-data-${currentUser.email}-${new Date().toISOString().split('T')[0]}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSettingsMessage('Account data exported successfully!', 'success');

    } catch (error) {
        console.error('Export error:', error);
        showSettingsMessage('Failed to export account data.', 'error');
    }
}

// Confirm account deletion
function confirmDeleteAccount() {
    showDeleteConfirmation();
}

// Show delete confirmation modal
function showDeleteConfirmation() {
    const modal = document.createElement('div');
    modal.id = 'delete-confirmation-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        animation: fadeIn 0.3s ease-out;
    `;

    modal.innerHTML = `
        <div style="
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: slideInScale 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        ">
            <div style="color: #dc3545; font-size: 4rem; margin-bottom: 1rem;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            
            <h2 style="color: #dc3545; margin-bottom: 1rem;">Delete Account</h2>
            
            <p style="color: #666; margin-bottom: 1.5rem; line-height: 1.6;">
                Are you absolutely sure you want to delete your account?<br>
                <strong>This action cannot be undone.</strong><br><br>
                All your data including:
            </p>
            
            <ul style="text-align: left; color: #666; margin-bottom: 1.5rem; padding-left: 2rem;">
                <li>Profile information</li>
                <li>Membership details</li>
                <li>Login history</li>
                <li>Account preferences</li>
            </ul>
            
            <p style="color: #dc3545; font-weight: bold; margin-bottom: 2rem;">
                Will be permanently deleted!
            </p>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="closeDeleteModal()" style="
                    padding: 12px 24px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 1rem;
                ">
                    <i class="fas fa-times"></i> Cancel
                </button>
                
                <button onclick="proceedWithDeletion()" style="
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 1rem;
                ">
                    <i class="fas fa-trash-alt"></i> Yes, Delete My Account
                </button>
            </div>
        </div>
    `;

    // Add animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideInScale {
            0% { transform: scale(0.7) translateY(-50px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(modal);
}

// Close delete modal
window.closeDeleteModal = function() {
    const modal = document.getElementById('delete-confirmation-modal');
    if (modal) {
        modal.style.animation = 'fadeIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 300);
    }
};

// Proceed with account deletion
window.proceedWithDeletion = async function() {
    if (!currentUser || !dbReady) {
        showSettingsMessage('Cannot delete account at this time.', 'error');
        closeDeleteModal();
        return;
    }

    try {
        // Show loading in modal
        const modal = document.getElementById('delete-confirmation-modal');
        const modalContent = modal.querySelector('div');
        modalContent.innerHTML = `
            <div style="color: #dc3545; font-size: 3rem; margin-bottom: 1rem;">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <h2 style="color: #dc3545; margin-bottom: 1rem;">Deleting Account...</h2>
            <p style="color: #666;">Please wait while we delete your account.</p>
        `;

        // Delete user from database
        const users = window.DemoCloudDB.getCloudUsers();
        const filteredUsers = users.filter(u => u.email !== currentUser.email);
        
        const saved = window.DemoCloudDB.saveCloudUsers(filteredUsers);
        
        if (saved) {
            // Clear local storage
            localStorage.clear();
            
            // Show success message
            modalContent.innerHTML = `
                <div style="color: #28a745; font-size: 3rem; margin-bottom: 1rem;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2 style="color: #28a745; margin-bottom: 1rem;">Account Deleted</h2>
                <p style="color: #666; margin-bottom: 1.5rem;">
                    Your account has been successfully deleted.<br>
                    You will be redirected to the login page.
                </p>
                <div style="width: 200px; height: 4px; background: #e9ecef; border-radius: 2px; margin: 0 auto; overflow: hidden;">
                    <div style="width: 0; height: 100%; background: #28a745; border-radius: 2px; animation: progressBar 3s ease-in-out forwards;"></div>
                </div>
            `;

            // Add progress bar animation
            const progressStyle = document.createElement('style');
            progressStyle.textContent = `
                @keyframes progressBar {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
            `;
            document.head.appendChild(progressStyle);

            // Redirect after 3 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);

        } else {
            throw new Error('Failed to delete account from database');
        }

    } catch (error) {
        console.error('Account deletion error:', error);
        closeDeleteModal();
        showSettingsMessage('Failed to delete account. Please try again.', 'error');
    }
};

// Toggle password visibility
function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Show settings messages
function showSettingsMessage(message, type) {
    // Remove existing message
    const existingMsg = document.getElementById('settings-message');
    if (existingMsg) {
        existingMsg.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.id = 'settings-message';
    
    const colors = {
        success: { bg: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', icon: 'fas fa-check-circle' },
        error: { bg: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', icon: 'fas fa-exclamation-triangle' },
        warning: { bg: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)', icon: 'fas fa-exclamation-circle' }
    };
    
    const style = colors[type] || colors.success;
    
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${style.bg};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        z-index: 10000;
        font-size: 0.95rem;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        max-width: 350px;
        animation: slideInRight 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    
    messageDiv.innerHTML = `
        <div style="display: flex; align-items: center;">
            <i class="${style.icon}" style="margin-right: 12px; font-size: 1.2rem;"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add animation
    if (!document.getElementById('settings-message-animations')) {
        const animationStyles = document.createElement('style');
        animationStyles.id = 'settings-message-animations';
        animationStyles.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(animationStyles);
    }
    
    document.body.appendChild(messageDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (document.body.contains(messageDiv)) {
            messageDiv.style.animation = 'slideInRight 0.5s ease-out reverse';
            setTimeout(() => {
                if (document.body.contains(messageDiv)) {
                    document.body.removeChild(messageDiv);
                }
            }, 500);
        }
    }, 5000);
}

// Logout function (same as home.html)
function logout() {
    localStorage.clear();
    showSettingsMessage('Logged out successfully!', 'success');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}
// Scroll to top functionality
function addScrollToTopButton() {
    // Create scroll to top button
    const scrollBtn = document.createElement('button');
    scrollBtn.className = 'scroll-to-top';
    scrollBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    scrollBtn.setAttribute('aria-label', 'Scroll to top');
    
    // Add click handler
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Add to page
    document.body.appendChild(scrollBtn);
    
    // Show/hide based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollBtn.classList.add('show');
        } else {
            scrollBtn.classList.remove('show');
        }
    });
}

// Initialize scroll to top button when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add scroll to top button after a short delay
    setTimeout(() => {
        addScrollToTopButton();
    }, 1000);
});

// Ensure smooth scrolling for the entire page
function ensureSmoothScrolling() {
    // Force enable scrolling
    document.body.style.overflowY = 'auto';
    document.documentElement.style.overflowY = 'auto';
    
    // Ensure proper height calculations
    const settingsContainer = document.querySelector('.settings-container');
    if (settingsContainer) {
        settingsContainer.style.minHeight = 'auto';
    }
}

// Call smooth scrolling function
ensureSmoothScrolling();