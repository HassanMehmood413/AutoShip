// VeRO Alert Handler - Automatically handles VeRO protection override alerts
// This script automatically clicks "Yes" when Amazon shows VeRO override alerts during listing

console.log('🛡️ VeRO Alert Handler loaded');

/**
 * Handles VeRO protection override alerts automatically
 * Looks for alerts with text like "This item is on the VeRO Banned List" and clicks "Yes"
 */
export const handleVeroAlert = async (maxWaitTime = 5000) => {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkForAlert = () => {
            try {
                // Check if we've exceeded max wait time
                if (Date.now() - startTime > maxWaitTime) {
                    console.log('⏰ VeRO alert check timeout - no alert found');
                    resolve(false);
                    return;
                }

                // Look for VeRO alert dialog with multiple possible selectors
                const alertSelectors = [
                    // Standard browser alerts/confirms
                    '[role="dialog"]',
                    '[role="alertdialog"]',
                    '.ui-dialog',
                    '.modal',
                    '.alert-dialog',
                    // Amazon-specific alert containers
                    '.a-alert',
                    '.a-box-alert',
                    '#alertDiv',
                    '.alert-container',
                    // Generic popup containers
                    '.popup',
                    '.overlay',
                    '.dialog-box'
                ];

                let alertElement = null;
                let alertText = '';

                // Check each selector for VeRO alert
                for (const selector of alertSelectors) {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        if (element.style.display !== 'none' && element.offsetParent !== null) {
                            const text = element.textContent || element.innerText || '';
                            if (text.toLowerCase().includes('vero') && 
                                text.toLowerCase().includes('banned') &&
                                (text.toLowerCase().includes('override') || text.toLowerCase().includes('sure'))) {
                                alertElement = element;
                                alertText = text;
                                break;
                            }
                        }
                    }
                    if (alertElement) break;
                }

                // Also check for standard browser confirm dialogs by overriding window.confirm
                if (!alertElement && window.lastConfirmMessage) {
                    if (window.lastConfirmMessage.toLowerCase().includes('vero') && 
                        window.lastConfirmMessage.toLowerCase().includes('banned')) {
                        console.log('🛡️ Detected VeRO confirm dialog:', window.lastConfirmMessage);
                        // Return true for confirm to proceed with listing
                        resolve(true);
                        return;
                    }
                }

                if (alertElement) {
                    console.log('🛡️ VeRO alert detected:', alertText.substring(0, 100) + '...');
                    
                    // Look for "Yes" button or equivalent
                    const yesButtonSelectors = [
                        'button[data-action="yes"]',
                        'button[value="yes"]',
                        'button:contains("Yes")',
                        'input[type="button"][value*="Yes"]',
                        'input[type="submit"][value*="Yes"]',
                        '.btn-yes',
                        '.confirm-yes',
                        '#yes-button',
                        '#confirmYes',
                        'button.primary',
                        'button.btn-primary'
                    ];

                    let yesButton = null;
                    
                    // First try to find button within the alert element
                    for (const selector of yesButtonSelectors) {
                        yesButton = alertElement.querySelector(selector);
                        if (yesButton) break;
                        
                        // Also check for buttons containing "Yes" text
                        const buttons = alertElement.querySelectorAll('button, input[type="button"], input[type="submit"]');
                        for (const button of buttons) {
                            const buttonText = button.textContent || button.value || '';
                            if (buttonText.toLowerCase().includes('yes') || 
                                buttonText.toLowerCase().includes('proceed') ||
                                buttonText.toLowerCase().includes('continue') ||
                                buttonText.toLowerCase().includes('override')) {
                                yesButton = button;
                                break;
                            }
                        }
                        if (yesButton) break;
                    }

                    // If no button found in alert, search globally
                    if (!yesButton) {
                        for (const selector of yesButtonSelectors) {
                            yesButton = document.querySelector(selector);
                            if (yesButton && yesButton.offsetParent !== null) break;
                        }
                    }

                    if (yesButton) {
                        console.log('✅ Clicking "Yes" button to override VeRO protection');
                        yesButton.click();
                        
                        // Wait a moment for the dialog to close
                        setTimeout(() => {
                            console.log('🛡️ VeRO alert handled successfully');
                            resolve(true);
                        }, 1000);
                        return;
                    } else {
                        console.log('⚠️ VeRO alert found but no "Yes" button detected');
                        // Try pressing Enter as fallback
                        const event = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true
                        });
                        alertElement.dispatchEvent(event);
                        
                        setTimeout(() => {
                            console.log('🛡️ Attempted to handle VeRO alert with Enter key');
                            resolve(true);
                        }, 1000);
                        return;
                    }
                }

                // No alert found yet, keep checking
                setTimeout(checkForAlert, 100);
            } catch (error) {
                console.error('❌ Error in VeRO alert handler:', error);
                resolve(false);
            }
        };

        // Start checking for alerts
        checkForAlert();
    });
};

/**
 * Override window.confirm to automatically handle VeRO confirmation dialogs
 */
export const setupVeroConfirmOverride = () => {
    const originalConfirm = window.confirm;
    
    window.confirm = function(message) {
        window.lastConfirmMessage = message;
        
        // Check if this is a VeRO-related confirmation
        if (message && message.toLowerCase().includes('vero') && 
            message.toLowerCase().includes('banned') &&
            (message.toLowerCase().includes('override') || message.toLowerCase().includes('sure'))) {
            
            console.log('🛡️ Auto-confirming VeRO override dialog:', message.substring(0, 100) + '...');
            return true; // Automatically click "Yes"
        }
        
        // For non-VeRO confirmations, use original behavior
        return originalConfirm.call(this, message);
    };
    
    console.log('🛡️ VeRO confirm override setup complete');
};

/**
 * Monitor for VeRO alerts continuously during listing process
 */
export const startVeroAlertMonitoring = (duration = 60000) => {
    console.log('🛡️ Starting continuous VeRO alert monitoring for', duration / 1000, 'seconds');
    
    // Setup confirm override
    setupVeroConfirmOverride();
    
    // Monitor for alerts every 200ms (more frequent for post-AI alerts)
    const monitorInterval = setInterval(async () => {
        try {
            await handleVeroAlert(300); // Quick check
        } catch (error) {
            console.error('❌ Error in VeRO monitoring:', error);
        }
    }, 200);
    
    // Stop monitoring after specified duration
    setTimeout(() => {
        clearInterval(monitorInterval);
        console.log('🛡️ VeRO alert monitoring stopped');
    }, duration);
    
    return monitorInterval;
};

/**
 * Special monitoring for post-AI-optimization VeRO alerts
 * Starts immediately and monitors more aggressively
 */
export const startPostAIVeroMonitoring = () => {
    console.log('🤖 Starting post-AI-optimization VeRO alert monitoring');
    
    // Setup confirm override immediately
    setupVeroConfirmOverride();
    
    // More aggressive monitoring for post-AI alerts
    const monitorInterval = setInterval(async () => {
        try {
            const handled = await handleVeroAlert(1000);
            if (handled) {
                console.log('✅ Post-AI VeRO alert handled, stopping monitoring');
                clearInterval(monitorInterval);
            }
        } catch (error) {
            console.error('❌ Error in post-AI VeRO monitoring:', error);
        }
    }, 100); // Very frequent checking
    
    // Stop monitoring after 45 seconds
    setTimeout(() => {
        clearInterval(monitorInterval);
        console.log('🤖 Post-AI VeRO alert monitoring stopped');
    }, 45000);
    
    return monitorInterval;
};

/**
 * Helper function to wait for and handle VeRO alerts with retry logic
 */
export const waitForAndHandleVeroAlert = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        console.log(`🛡️ VeRO alert check attempt ${i + 1}/${retries}`);
        
        const handled = await handleVeroAlert(2000);
        if (handled) {
            console.log('✅ VeRO alert handled successfully');
            return true;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('⚠️ No VeRO alert detected after all attempts');
    return false;
};

// Detect AI optimization completion and start aggressive monitoring
const detectAIOptimizationCompletion = () => {
    // Look for signs that AI optimization has completed
    const checkForAICompletion = () => {
        // Check for auto-listing triggers or optimization completion indicators
        const urlParams = new URLSearchParams(window.location.search);
        const hasAutoList = urlParams.get('autoList') === 'true';
        
        // Check for AI-related elements or completion signals
        const aiElements = document.querySelectorAll('[data-ai-optimized], .ai-completed, #ai-optimizer-complete');
        const hasAISignals = aiElements.length > 0;
        
        // Check for auto-listing being triggered (from the logs you shared)
        const consoleHasAutoListing = window.lastLoggedMessage && 
            window.lastLoggedMessage.includes('Auto-listing triggered');
            
        if (hasAutoList || hasAISignals || consoleHasAutoListing) {
            console.log('🤖 AI optimization completion detected, starting VeRO monitoring');
            startPostAIVeroMonitoring();
            return true;
        }
        return false;
    };
    
    // Check immediately and then periodically
    if (!checkForAICompletion()) {
        const checkInterval = setInterval(() => {
            if (checkForAICompletion()) {
                clearInterval(checkInterval);
            }
        }, 1000);
        
        // Stop checking after 30 seconds
        setTimeout(() => clearInterval(checkInterval), 30000);
    }
};

// Override console.log to detect AI completion messages
const originalConsoleLog = console.log;
console.log = function(...args) {
    const message = args.join(' ');
    window.lastLoggedMessage = message;
    
    // Check for AI-related completion messages
    if (message.includes('Auto-listing triggered') || 
        message.includes('AI optimizer') ||
        message.includes('optimization complete')) {
        console.log('🤖 Detected AI completion in console, starting VeRO monitoring');
        setTimeout(() => startPostAIVeroMonitoring(), 1000);
    }
    
    return originalConsoleLog.apply(this, args);
};

// Auto-start monitoring when script loads
document.addEventListener('DOMContentLoaded', () => {
    setupVeroConfirmOverride();
    detectAIOptimizationCompletion();
    console.log('🛡️ VeRO Alert Handler initialized - ready to handle VeRO protection override dialogs');
});

// Also start immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupVeroConfirmOverride();
        detectAIOptimizationCompletion();
    });
} else {
    setupVeroConfirmOverride();
    detectAIOptimizationCompletion();
}

console.log('🛡️ VeRO Alert Handler loaded - will automatically handle VeRO protection override dialogs');

// Export for global access
window.VeroHandler = {
    handleVeroAlert,
    setupVeroConfirmOverride,
    startVeroAlertMonitoring,
    startPostAIVeroMonitoring,
    waitForAndHandleVeroAlert
};