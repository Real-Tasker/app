// Firebase Configuration (Check if already initialized)
let firebaseConfig;
if (typeof window.firebaseConfigInitialized === 'undefined') {
    firebaseConfig = {
        apiKey: "AIzaSyCuwKRim2rlVxs1J_a0EQb-sHwbU6WpJvA",
        authDomain: "real-tasker.firebaseapp.com",
        databaseURL: "https://real-tasker-default-rtdb.firebaseio.com",
        projectId: "real-tasker",
        storageBucket: "real-tasker.firebasestorage.app",
        messagingSenderId: "326170925930",
        appId: "1:326170925930:web:0236eab481271b33862313",
        measurementId: "G-5ECB5C3GK9"
    };
    window.firebaseConfigInitialized = true;
}

// Initialize Firebase only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const database = firebase.database();

// Initialize Main XML Page
document.addEventListener('DOMContentLoaded', function() {
    // Always show Main XML page first
    showPage('mainXmlPage');
    
    // Load admin logo first before initializing
    loadAdminLogo().then(() => {
        initializeMainXmlPage();
    }).catch(() => {
        initializeMainXmlPage();
    });
});

// Global Variables
let currentUser = null;
let signupData = {};
let currentPin = '';
let isSignupFlow = false;
let verificationCheckInterval = null;
let suspensionCheckInterval = null;
let pageHistory = [];
let adminLogoUrl = null;

// Helper function to adjust color brightness
function adjustColorBrightness(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// DOM Elements
const mainContainer = document.getElementById('mainContainer');
const pages = document.querySelectorAll('.page');

// Page Navigation History
function addToHistory(pageId) {
    pageHistory.push(pageId);
    if (pageHistory.length > 10) {
        pageHistory.shift(); // Keep only last 10 pages
    }
}

function goBack() {
    if (pageHistory.length > 1) {
        pageHistory.pop(); // Remove current page
        const previousPage = pageHistory[pageHistory.length - 1];
        showPage(previousPage, false); // Don't add to history when going back
    }
}

// Utility Functions
function showPage(pageId, addToHistoryFlag = true) {
    // Direct page navigation without loading delays
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    if (addToHistoryFlag) {
        addToHistory(pageId);
    }

    // Load admin logo for auth-related pages
    if (['authPage', 'pinPage', 'namePage', 'usernamePage', 'dobPage', 'profilePicturePage', 'pinSetupPage', 'pinConfirmPage', 'verificationPage'].includes(pageId)) {
        if (adminLogoUrl) {
            updateAllPagesWithLogo(adminLogoUrl);
        } else {
            loadAdminLogo();
        }
    }
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.innerHTML = `<p>${message}</p>`;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 3000);
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function generateUID() {
    return 'uid_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Logout Function
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    auth.signOut();
    pageHistory = [];
    showPage('authPage');

    // Clear intervals
    if (verificationCheckInterval) {
        clearInterval(verificationCheckInterval);
        verificationCheckInterval = null;
    }
    if (suspensionCheckInterval) {
        clearInterval(suspensionCheckInterval);
        suspensionCheckInterval = null;
    }

    // Clear all form inputs
    document.querySelectorAll('input').forEach(input => input.value = '');
    signupData = {};
}

// Setup Back Buttons
function setupBackButtons() {
    const backButtons = [
        { id: 'pinPageBack', target: 'authPage' },
        { id: 'namePageBack', target: 'authPage' },
        { id: 'usernamePageBack', target: 'namePage' },
        { id: 'dobPageBack', target: 'usernamePage' },
        { id: 'profilePicturePageBack', target: 'dobPage' },
        { id: 'pinSetupPageBack', target: 'profilePicturePage' },
        { id: 'pinConfirmPageBack', target: 'pinSetupPage' },
        { id: 'verificationPageBack', target: 'pinConfirmPage' }
    ];

    backButtons.forEach(button => {
        const btn = document.getElementById(button.id);
        if (btn) {
            btn.addEventListener('click', () => {
                if (button.target) {
                    showPage(button.target);
                } else {
                    goBack();
                }
            });
        }
    });
}

// Setup Logout Buttons
function setupLogoutButtons() {
    const logoutButtons = [
        'pinPageLogout'
    ];

    logoutButtons.forEach(buttonId => {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.addEventListener('click', logout);
        }
    });
}

// Main XML Page Functions
function initializeMainXmlPage() {
    console.log('Main XML Page initialized');
    
    // Ensure Main XML Page is visible
    showPage('mainXmlPage');
    
    // Load admin logo immediately without delay
    loadAdminLogo();
    
    // Check user status and navigate after 3 seconds
    setTimeout(() => {
        navigateFromMainXml();
    }, 3000);
}

// Load Admin Logo
async function loadAdminLogo() {
    try {
        const logoSnapshot = await database.ref('settings/appLogo').once('value');
        const logoUrl = logoSnapshot.val();
        
        if (logoUrl && logoUrl.trim() !== '') {
            adminLogoUrl = logoUrl;
            
            // Immediately show admin logo on Main XML page first
            const mainAdminLogoSection = document.getElementById('adminLogoSection');
            const mainAdminLogo = document.getElementById('adminLogo');
            const mainDefaultSection = document.getElementById('defaultLogoSection');
            
            if (mainAdminLogoSection && mainAdminLogo && mainDefaultSection) {
                // Show admin logo section immediately
                mainAdminLogoSection.style.display = 'block';
                mainDefaultSection.style.display = 'none';
                mainAdminLogo.src = logoUrl;
                console.log('Admin logo displayed immediately on Main XML page');
            }
            
            // Then update all other pages with admin logo
            updateAllPagesWithLogo(logoUrl);
            showAdminLogoSections();
            
            console.log('Admin logo loaded and displayed immediately on all pages');
        } else {
            // Show default logo sections when no admin logo
            showDefaultLogoSections();
            console.log('No admin logo found, using default logo');
        }
    } catch (error) {
        console.error('Error loading admin logo:', error);
        // Show default logo sections on error
        showDefaultLogoSections();
        console.log('Using default logo due to error');
    }
}

// Show default logo sections when no admin logo is available
function showDefaultLogoSections() {
    // Show default logo sections when no admin logo
    const defaultLogoSection = document.getElementById('defaultLogoSection');
    const adminLogoSection = document.getElementById('adminLogoSection');
    
    if (defaultLogoSection && adminLogoSection) {
        defaultLogoSection.style.display = 'block';
        adminLogoSection.style.display = 'none';
    }
    
    console.log('Showing default logo sections');
}

function showAdminLogoSections() {
    // Show admin logo sections when admin logo is available
    const defaultLogoSection = document.getElementById('defaultLogoSection');
    const adminLogoSection = document.getElementById('adminLogoSection');
    const adminLogo = document.getElementById('adminLogo');
    
    if (defaultLogoSection && adminLogoSection) {
        defaultLogoSection.style.display = 'none';
        adminLogoSection.style.display = 'block';
        
        // Force immediate visibility
        if (adminLogo && adminLogoUrl) {
            adminLogo.src = adminLogoUrl;
        }
    }
    
    // Also update all other pages
    const pages = [
        { prefix: 'auth', title: 'Auth Page' },
        { prefix: 'pin', title: 'PIN Page' },
        { prefix: 'name', title: 'Name Page' }
    ];

    pages.forEach(page => {
        const pageAdminSection = document.getElementById(`${page.prefix}AdminLogoSection`);
        const pageDefaultSection = document.getElementById(`${page.prefix}DefaultLogoSection`);
        const pageAdminLogo = document.getElementById(`${page.prefix}AdminLogo`);
        
        if (pageAdminSection && pageDefaultSection) {
            pageDefaultSection.style.display = 'none';
            pageAdminSection.style.display = 'block';
            
            if (pageAdminLogo && adminLogoUrl) {
                pageAdminLogo.src = adminLogoUrl;
            }
        }
    });
    
    console.log('Showing admin logo sections immediately');
}

// Update all pages with admin logo
function updateAllPagesWithLogo(logoUrl) {
    const pages = [
        { prefix: '', title: 'Main XML Page' },
        { prefix: 'auth', title: 'Auth Page' },
        { prefix: 'pin', title: 'PIN Page' },
        { prefix: 'name', title: 'Name Page' }
    ];

    pages.forEach(page => {
        let adminLogoSection, defaultLogoSection, adminLogoImg;
        
        if (page.prefix === '') {
            // Main XML Page
            adminLogoSection = document.getElementById('adminLogoSection');
            defaultLogoSection = document.getElementById('defaultLogoSection');
            adminLogoImg = document.getElementById('adminLogo');
        } else {
            // Other pages
            adminLogoSection = document.getElementById(`${page.prefix}AdminLogoSection`);
            defaultLogoSection = document.getElementById(`${page.prefix}DefaultLogoSection`);
            adminLogoImg = document.getElementById(`${page.prefix}AdminLogo`);
        }
        
        if (adminLogoSection && adminLogoImg && logoUrl) {
            adminLogoImg.src = logoUrl;
            adminLogoImg.onload = function() {
                adminLogoSection.style.display = 'block';
                if (defaultLogoSection) {
                    defaultLogoSection.style.display = 'none';
                }
                console.log(`Admin logo displayed successfully on ${page.title}`);
            };
            adminLogoImg.onerror = function() {
                console.log(`Failed to load admin logo on ${page.title}, showing default`);
                if (defaultLogoSection) {
                    defaultLogoSection.style.display = 'block';
                }
                adminLogoSection.style.display = 'none';
            };
        }
    });
}

// Navigate from Main XML Page
function navigateFromMainXml() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            
            // Check if user is suspended
            if (currentUser.suspended) {
                showPage('suspendedPage');
                loadContactInfo();
                console.log('Navigated to suspended page');
                return;
            }
            
            // User is logged in, go to home page
            showPage('homePage');
            updateWelcomeMessage();
            updateHeaderProfilePicture();
            setupHeaderProfileClick();
            updateCurrentPageTitle('Home');
            loadTasks();
            updateUserBalance();
            setupBalanceMonitoring();
            startSuspensionCheck();
            console.log('Navigated to home page');
        } catch (error) {
            console.error('Error parsing saved user:', error);
            // If there's an error, treat as not logged in
            localStorage.removeItem('currentUser');
            showPage('authPage');
            // Load admin logo for auth page
            loadAdminLogo();
            console.log('Navigated to auth page due to error');
        }
    } else {
        // User is not logged in, go to auth page
        showPage('authPage');
        // Load admin logo for auth page
        loadAdminLogo();
        console.log('Navigated to auth page');
    }
}

// PIN Input Handling
function setupPinInputs(containerSelector) {
    const pinInputs = document.querySelectorAll(`${containerSelector} .pin-input`);

    pinInputs.forEach((input, index) => {
        // Only allow numbers
        input.addEventListener('input', (e) => {
            const value = e.target.value;

            // Remove non-numeric characters
            if (!/^\d*$/.test(value)) {
                e.target.value = value.replace(/\D/g, '');
                return;
            }

            if (value && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            // Allow only numbers, backspace, delete, tab, and arrow keys
            const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'];
            const isNumber = /^[0-9]$/.test(e.key);

            if (!isNumber && !allowedKeys.includes(e.key)) {
                e.preventDefault();
                return;
            }

            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                pinInputs[index - 1].focus();
            }
        });

        // Prevent paste of non-numeric content
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const numericPaste = paste.replace(/\D/g, '');

            if (numericPaste.length > 0) {
                // Fill inputs with pasted numbers
                for (let i = 0; i < Math.min(numericPaste.length, pinInputs.length - index); i++) {
                    if (index + i < pinInputs.length) {
                        pinInputs[index + i].value = numericPaste[i];
                    }
                }

                // Focus next empty input or last input
                const nextIndex = Math.min(index + numericPaste.length, pinInputs.length - 1);
                pinInputs[nextIndex].focus();
            }
        });
    });
}

// Check if user exists in database
async function checkUserExists(email) {
    try {
        const snapshot = await database.ref('users').orderByChild('email').equalTo(email).once('value');
        return snapshot.exists();
    } catch (error) {
        console.error('Error checking user:', error);
        return false;
    }
}

// Get user data by email
async function getUserByEmail(email) {
    try {
        const snapshot = await database.ref('users').orderByChild('email').equalTo(email).once('value');
        if (snapshot.exists()) {
            const userData = Object.values(snapshot.val())[0];
            const uid = Object.keys(snapshot.val())[0];
            return { ...userData, uid };
        }
        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Verify PIN
async function verifyPin(email, pin) {
    try {
        const user = await getUserByEmail(email);
        return user && user.password === pin;
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return false;
    }
}

// Check if username is available
async function checkUsernameAvailable(username) {
    try {
        const snapshot = await database.ref('users').orderByChild('username').equalTo(username).once('value');
        return !snapshot.exists();
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
}

// Save user to database
async function saveUserToDatabase(userData) {
    try {
        const uid = generateUID();
        await database.ref(`users/${uid}`).set(userData);
        return uid;
    } catch (error) {
        console.error('Error saving user:', error);
        throw error;
    }
}

// Send verification email
async function sendVerificationEmail(email) {
    try {
        // Create a temporary Firebase user to send verification email
        const tempUser = await auth.createUserWithEmailAndPassword(email, 'temp_password_' + Date.now());
        await tempUser.user.sendEmailVerification();

        // Store verification info
        signupData.firebaseUID = tempUser.user.uid;
        signupData.emailVerified = false;

        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
}

// Check email verification status
async function checkEmailVerification() {
    try {
        if (!signupData.firebaseUID) return false;

        const user = await auth.currentUser;
        if (user) {
            await user.reload();
            return user.emailVerified;
        }
        return false;
    } catch (error) {
        console.error('Error checking email verification:', error);
        return false;
    }
}

// Google Sign In
function setupGoogleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();

    document.getElementById('googleBtn').addEventListener('click', async () => {
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            // Check if user exists in our database
            const existingUser = await getUserByEmail(user.email);

            if (existingUser) {
                // Check if user is suspended before logging in
                if (existingUser.suspended) {
                    currentUser = existingUser;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    showPage('suspendedPage');
                    loadContactInfo();
                    return;
                }

                // User exists, log them in
                currentUser = existingUser;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showPage('homePage');
                updateWelcomeMessage();
                updateHeaderProfilePicture();
                setupHeaderProfileClick();
                updateCurrentPageTitle('Home');
                loadTasks();
                updateUserBalance();
                setupBalanceMonitoring();
                startSuspensionCheck();
            } else {
                // New user, redirect to name page (skip email verification for Google users)
                signupData = {
                    email: user.email,
                    name: user.displayName || '',
                    isGoogleUser: true,
                    emailVerified: true
                };
                if (signupData.name) {
                    showPage('usernamePage');
                    setupUsernameAutoFill();
                } else {
                    showPage('namePage');
                }
            }
        } catch (error) {
            console.error('Google sign in error:', error);
            alert('Google sign in failed. Please try again.');
        }
    });
}

// Main Authentication Flow
function setupAuthFlow() {
    const authEmail = document.getElementById('authEmail');
    const continueBtn = document.getElementById('continueBtn');

    // Auto-complete email functionality
    authEmail.addEventListener('input', (e) => {
        let email = e.target.value;

        // Auto-add @gmail.com if user types email without domain
        if (email && !email.includes('@') && email.length > 3) {
            // Check if user stopped typing for 500ms
            clearTimeout(authEmail.autoCompleteTimeout);
            authEmail.autoCompleteTimeout = setTimeout(() => {
                if (!email.includes('@')) {
                    authEmail.value = email + '@gmail.com';
                    // Position cursor before @gmail.com
                    try {
                        authEmail.setSelectionRange(email.length, email.length + 10);
                    } catch (e) {
                        // Fallback for browsers that don't support selection on email inputs
                        authEmail.focus();
                    }
                }
            }, 500);
        }
    });

    // Handle backspace to remove auto-completed part
    authEmail.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
            clearTimeout(authEmail.autoCompleteTimeout);
        }
    });

    continueBtn.addEventListener('click', async () => {
        let email = authEmail.value.trim();

        if (!email) {
            showError('authError', 'Please enter your email address');
            return;
        }

        // Auto-add @gmail.com if no domain provided
        if (!email.includes('@')) {
            email += '@gmail.com';
            authEmail.value = email;
        }

        if (!validateEmail(email)) {
            showError('authError', 'Please enter a valid email address');
            return;
        }

        continueBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        continueBtn.disabled = true;

        try {
            const userExists = await checkUserExists(email);

            if (userExists) {
                // Check if user is suspended before showing PIN page
                const user = await getUserByEmail(email);
                if (user && user.suspended) {
                    currentUser = user;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    showPage('suspendedPage');
                    loadContactInfo();
                    return;
                }

                // User exists, show PIN page for login
                isSignupFlow = false;
                signupData.email = email;
                showPage('pinPage');
            } else {
                // New user, start signup flow
                isSignupFlow = true;
                signupData = { email };

                // Auto-suggest username from email
                const emailUsername = email.split('@')[0];
                signupData.suggestedUsername = emailUsername;

                showPage('namePage');
                // Auto-fill username suggestion
                setupUsernameAutoFill();
            }
        } catch (error) {
            console.error('Error:', error);
            showError('authError', 'Something went wrong. Please try again.');
        } finally {
            continueBtn.innerHTML = 'Continue';
            continueBtn.disabled = false;
        }
    });
}

// PIN Page Logic
function setupPinPage() {
    const pinSubmit = document.getElementById('pinSubmit');

    pinSubmit.addEventListener('click', async () => {
        const pinInputs = document.querySelectorAll('#pinPage .pin-input');
        const pin = Array.from(pinInputs).map(input => input.value).join('');

        if (pin.length !== 5) {
            alert('Please enter a 5-digit PIN');
            return;
        }

        pinSubmit.textContent = 'Verifying...';
        pinSubmit.disabled = true;

        try {
            const isValid = await verifyPin(signupData.email, pin);

            if (isValid) {
                // Login successful
                const user = await getUserByEmail(signupData.email);

                // Check if user is suspended
                if (user && user.suspended) {
                    currentUser = user;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    showPage('suspendedPage');
                    loadContactInfo();
                    return;
                }

                currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showPage('homePage');
                updateWelcomeMessage();
                updateHeaderProfilePicture();
                setupHeaderProfileClick();
                updateCurrentPageTitle('Home');
                loadTasks();
                updateUserBalance();
                setupBalanceMonitoring();
                startSuspensionCheck();
            } else {
                showError('pinError', 'Incorrect PIN. Please try again.');
                pinInputs.forEach(input => input.value = '');
                pinInputs[0].focus();
            }
        } catch (error) {
            console.error('Error verifying PIN:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            pinSubmit.textContent = 'Submit';
            pinSubmit.disabled = false;
        }
    });
}

// Signup Flow
function setupSignupFlow() {
    // Name Page
    document.getElementById('nameConfirm').addEventListener('click', () => {
        const name = document.getElementById('signupName').value.trim();
        if (!name) {
            showError('nameError', 'Please enter your name');
            return;
        }
        signupData.name = name;
        showPage('usernamePage');

        // Auto-fill username suggestion
        setupUsernameAutoFill();
    });

    // Username Page
    document.getElementById('usernameConfirm').addEventListener('click', async () => {
        const username = document.getElementById('signupUsername').value.trim();
        if (!username) {
            showError('usernameError', 'Please enter a username');
            return;
        }

        if (username.length < 3) {
            showError('usernameError', 'Username must be at least 3 characters long');
            return;
        }

        const confirmBtn = document.getElementById('usernameConfirm');
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        confirmBtn.disabled = true;

        try {
            const isAvailable = await checkUsernameAvailable(username);
            if (!isAvailable) {
                showError('usernameError', 'This username is already taken. Please choose another one.');
                return;
            }

            signupData.username = username;

            if (signupData.isGoogleUser) {
                showPage('profilePicturePage');
            } else {
                showPage('dobPage');
            }
        } finally {
            confirmBtn.innerHTML = 'Confirm';
            confirmBtn.disabled = false;
        }
    });

    // Date of Birth Page
    setupDobDropdowns();

    document.getElementById('dobConfirm').addEventListener('click', () => {
        const month = document.getElementById('dobMonth').value;
        const day = document.getElementById('dobDay').value;
        const year = document.getElementById('dobYear').value;

        if (!month || !day || !year) {
            showError('dobError', 'Please select your complete date of birth');
            return;
        }

        const dob = `${year}-${month}-${day}`;

        // Check if user is at least 13 years old
        const today = new Date();
        const birthDate = new Date(dob);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (age < 13 || (age === 13 && monthDiff < 0) || (age === 13 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            showError('dobError', 'You must be at least 13 years old to register');
            return;
        }

        signupData.dob = dob;
        signupData.createdAt = Date.now();
        showPage('profilePicturePage');
    });

    // Profile Picture Upload Page
    setupProfilePictureUpload();

    // PIN Setup Page with number-only validation
    document.getElementById('pinSetupSubmit').addEventListener('click', () => {
        const pinInputs = document.querySelectorAll('#pinSetupPage .pin-input');
        const pin = Array.from(pinInputs).map(input => input.value).join('');

        if (pin.length !== 5) {
            showError('pinSetupError', 'Please enter a 5-digit PIN');
            return;
        }

        if (!/^\d{5}$/.test(pin)) {
            showError('pinSetupError', 'PIN must contain only numbers');
            return;
        }

        currentPin = pin;
        showPage('pinConfirmPage');

        // Clear confirm PIN inputs
        const confirmInputs = document.querySelectorAll('#pinConfirmPage .pin-input');
        confirmInputs.forEach(input => input.value = '');
        confirmInputs[0].focus();
    });

    // PIN Confirm Page
    document.getElementById('confirmPinSubmit').addEventListener('click', async () => {
        const pinInputs = document.querySelectorAll('#pinConfirmPage .pin-input');
        const confirmPin = Array.from(pinInputs).map(input => input.value).join('');

        if (confirmPin.length !== 5) {
            showError('confirmPinError', 'Please enter a 5-digit PIN');
            return;
        }

        if (confirmPin !== currentPin) {
            showError('confirmPinError', "PIN doesn't match. Please try again.");
            pinInputs.forEach(input => input.value = '');
            pinInputs[0].focus();
            return;
        }

        // Save user data
        signupData.password = currentPin;
        signupData.balance = 0;
        signupData.suspended = false;

        const submitBtn = document.getElementById('confirmPinSubmit');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        submitBtn.disabled = true;

        try {
            if (signupData.isGoogleUser) {
                // Google users don't need email verification
                const uid = await saveUserToDatabase(signupData);
                currentUser = { ...signupData, uid };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showPage('successPage');
                setTimeout(() => {
                    showPage('homePage');
                    updateWelcomeMessage();
                    updateHeaderProfilePicture();
                    setupHeaderProfileClick();
                    updateCurrentPageTitle('Home');
                    loadTasks();
                    updateUserBalance();
                    setupBalanceMonitoring();
                    startSuspensionCheck();
                }, 2000);
            } else {
                // Regular users need email verification
                const emailSent = await sendVerificationEmail(signupData.email);
                if (emailSent) {
                    showPage('verificationPage');
                    startVerificationCheck();
                } else {
                    showError('confirmPinError', 'Failed to send verification email. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error saving user:', error);
            showError('confirmPinError', 'Registration failed. Please try again.');
        } finally {
            submitBtn.innerHTML = 'Confirm';
            submitBtn.disabled = false;
        }
    });
}

// Setup username auto-fill from email
function setupUsernameAutoFill() {
    const usernameInput = document.getElementById('signupUsername');

    if (signupData.suggestedUsername && !usernameInput.value) {
        usernameInput.value = signupData.suggestedUsername;
        usernameInput.select(); // Select the text so user can easily change it
    }
}

// Email verification process
function startVerificationCheck() {
    const statusElement = document.getElementById('verificationStatus');
    let checkCount = 0;
    const maxChecks = 60; // Check for 5 minutes (every 5 seconds)

    statusElement.className = 'verification-status checking';
    statusElement.innerHTML = `
        <p>
            <span class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </span>
            Waiting for email verification...
        </p>
    `;

    verificationCheckInterval = setInterval(async () => {
        checkCount++;

        const isVerified = await checkEmailVerification();

        if (isVerified) {
            // Email verified, save user and redirect
            clearInterval(verificationCheckInterval);
            statusElement.className = 'verification-status success';
            statusElement.innerHTML = '<p style="color: #4caf50;"><i class="fas fa-check-circle"></i> Email verified successfully!</p>';

            try {
                signupData.emailVerified = true;
                const uid = await saveUserToDatabase(signupData);
                currentUser = { ...signupData, uid };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));

                // Clean up Firebase Auth user
                if (auth.currentUser) {
                    await auth.currentUser.delete();
                }

                setTimeout(() => {
                    showPage('successPage');
                    setTimeout(() => {
                        showPage('homePage');
                        updateWelcomeMessage();
                        updateHeaderProfilePicture();
                        setupHeaderProfileClick();
                        updateCurrentPageTitle('Home');
                        loadTasks();
                        updateUserBalance();
                        setupBalanceMonitoring();
                        startSuspensionCheck();
                    }, 2000);
                }, 1000);
            } catch (error) {
                console.error('Error completing registration:', error);
                statusElement.className = 'verification-status error';
                statusElement.innerHTML = '<p style="color: #f44336;"><i class="fas fa-exclamation-circle"></i> Registration failed. Please try again.</p>';
            }
        } else if (checkCount >= maxChecks) {
            // Timeout
            clearInterval(verificationCheckInterval);
            statusElement.className = 'verification-status error';
            statusElement.innerHTML = '<p style="color: #ff9800;"><i class="fas fa-clock"></i> Verification timeout. Please click "Resend Email" to try again.</p>';
        } else {
            // Still waiting
            const dots = checkCount % 4;
            statusElement.innerHTML = `
                <p>
                    <span class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
                    Waiting for email verification... (${checkCount * 5}s)
                </p>
            `;
        }
    }, 5000);
}

// Home Page Setup
function updateWelcomeMessage() {
    const welcomeUser = document.getElementById('welcomeUser');
    if (currentUser && currentUser.name) {
        welcomeUser.textContent = currentUser.name;
    }
}

function setupHomePage() {
    document.getElementById('notificationBtn').addEventListener('click', showNotifications);
    setupBottomNavigation();
    setupMoreMenu();
    setupNotificationSystem();
}

// Setup More Menu with Drawer System
function setupMoreMenu() {
    const moreMenuBtn = document.getElementById('moreMenuBtn');

    // Toggle menu drawer
    moreMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openMoreMenuDrawer();
    });

    // Setup drawer menu item actions
    setupDrawerMenuItems();
}

function setupDrawerMenuItems() {
    // Profile menu item
    document.getElementById('profileDrawerItem').addEventListener('click', () => {
        closeMoreMenuDrawer();
        showProfileMenu();
    });



    // History menu item
    document.getElementById('historyDrawerItem').addEventListener('click', () => {
        closeMoreMenuDrawer();
        showHistoryPage();
    });

    // Help menu item
    document.getElementById('helpDrawerItem').addEventListener('click', () => {
        closeMoreMenuDrawer();
        showHelpMenu();
    });

    // Privacy menu item
    document.getElementById('privacyDrawerItem').addEventListener('click', () => {
        closeMoreMenuDrawer();
        showPrivacyMenu();
    });

    // Logout menu item
    document.getElementById('logoutDrawerItem').addEventListener('click', () => {
        closeMoreMenuDrawer();
        setTimeout(() => {
            logout();
        }, 300);
    });
}

// Load notifications in drawer format
async function loadNotificationsInDrawer() {
    const drawerContent = document.getElementById('notificationDrawerContent');

    try {
        // Load both submissions and new tasks for notifications
        const [submissionsSnapshot, tasksSnapshot] = await Promise.all([
            database.ref('submissions').orderByChild('userId').equalTo(currentUser.uid).once('value'),
            database.ref('tasks').orderByChild('createdAt').limitToLast(10).once('value')
        ]);

        const submissions = submissionsSnapshot.val() || {};
        const tasks = tasksSnapshot.val() || {};

        const submissionArray = Object.values(submissions)
            .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

        const tasksArray = Object.keys(tasks).map(key => ({
            id: key,
            ...tasks[key]
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Combine notifications
        let allNotifications = [];

        // Add submission notifications
        submissionArray.slice(0, 5).forEach(submission => {
            allNotifications.push({
                type: 'submission',
                data: submission,
                timestamp: submission.submittedAt || 0
            });
        });

        // Add new task notifications (only recent ones - last 24 hours)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        tasksArray.forEach(task => {
            if (task.createdAt > oneDayAgo) {
                allNotifications.push({
                    type: 'new_task',
                    data: task,
                    timestamp: task.createdAt || 0
                });
            }
        });

        // Sort by timestamp
        allNotifications.sort((a, b) => b.timestamp - a.timestamp);
        allNotifications = allNotifications.slice(0, 15);

        if (allNotifications.length === 0) {
            drawerContent.innerHTML = `
                <div class="notification-empty-drawer">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                </div>
            `;
            return;
        }

        drawerContent.innerHTML = allNotifications.map(notification => {
            if (notification.type === 'submission') {
                const submission = notification.data;
                const statusIcon = {
                    'pending': 'fas fa-clock',
                    'approved': 'fas fa-check-circle',
                    'rejected': 'fas fa-times-circle'
                };

                const statusColor = {
                    'pending': '#f59e0b',
                    'approved': '#10b981',
                    'rejected': '#ef4444'
                };

                return `
                    <div class="notification-drawer-item ${submission.status === 'pending' ? 'unread' : ''}" onclick="closeNotificationDrawer(); handleTaskAction('${submission.taskId}')">
                        <div class="notification-drawer-title">
                            <i class="${statusIcon[submission.status]}" style="color: ${statusColor[submission.status]}"></i>
                            ${submission.taskTitle}
                        </div>
                        <div class="notification-drawer-message">
                            Status: ${submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                            ${submission.status === 'approved' ? ` - Earned $${submission.reward}` : ''}
                        </div>
                        <div class="notification-drawer-time">
                            <i class="fas fa-clock"></i>
                            ${new Date(submission.submittedAt).toLocaleDateString()}
                        </div>
                    </div>
                `;
            } else {
                const task = notification.data;
                return `
                    <div class="notification-drawer-item new-task" onclick="closeNotificationDrawer(); handleTaskAction('${task.id}')">
                        <div class="notification-drawer-title">
                            <i class="fas fa-fire" style="color: #e74c3c"></i>
                            ${task.title}
                        </div>
                        <div class="notification-drawer-message">
                            New ${task.type === 'admin_update' ? 'Admin Update' : 'Task'} Available - $${task.reward}
                        </div>
                        <div class="notification-drawer-time">
                            <i class="fas fa-clock"></i>
                            ${new Date(task.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                `;
            }
        }).join('');

    } catch (error) {
        console.error('Error loading notifications in drawer:', error);
        drawerContent.innerHTML = `
            <div class="notification-empty-drawer">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load notifications</p>
            </div>
        `;
    }
}

// Enhanced menu functions

function showHistoryPage() {
    showPage('historyPage');
    updateCurrentPageTitle('History');
    loadTaskHistory();
}

function showHelpMenu() {
    alert('Help & Support feature coming soon!');
}

function showPrivacyMenu() {
    alert('Privacy settings coming soon!');
}





// Task History
async function loadTaskHistory() {
    const historyContainer = document.getElementById('historyContainer');

    try {
        // Get user's submissions
        const submissionsSnapshot = await database.ref('submissions')
            .orderByChild('userId')
            .equalTo(currentUser.uid)
            .once('value');

        const submissions = submissionsSnapshot.val() || {};
        const submissionArray = Object.keys(submissions).map(key => ({
            id: key,
            ...submissions[key]
        })).sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

        if (submissionArray.length === 0) {
            historyContainer.innerHTML = `
                <div class="no-history">
                    <div class="no-history-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <h3>No Task History</h3>
                    <p>You haven't completed any tasks yet. Start working on tasks to see your history here.</p>
                </div>
            `;
            return;
        }

        let historyHTML = '';

        submissionArray.forEach(submission => {
            const submissionDate = new Date(submission.submittedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const statusClass = submission.status || 'pending';
            const statusText = {
                'approved': 'Approved',                'rejected': 'Rejected',
                'pending': 'Pending Review'
            }[statusClass] || 'Pending Review';

            const reward = submission.status === 'approved' ? (submission.reward || 0) : 0;

            historyHTML += `
                <div class="history-card">
                    <div class="history-header">
                        <h3 class="history-title">${submission.taskTitle}</h3>
                        <span class="history-status status-${statusClass}">${statusText}</span>
                    </div>

                    <div class="history-details">
                        <div class="history-detail-item">
                            <i class="fas fa-dollar-sign"></i>
                            <span class="history-reward">$${reward.toFixed(2)}</span>
                        </div>
                        <div class="history-detail-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Submitted</span>
                        </div>
                        <div class="history-detail-item">
                            <i class="fas fa-link"></i>
                            <span>${submission.submissionLinks ? submission.submissionLinks.length : 0} Links</span>
                        </div>
                        <div class="history-detail-item">
                            <i class="fas fa-desktop"></i>
                            <span>${submission.platform || 'Web'}</span>
                        </div>
                    </div>

                    ${submission.description ? `
                        <div class="history-description">
                            <strong>Description:</strong> ${submission.description}
                        </div>
                    ` : ''}

                    <div class="history-date">
                        <i class="fas fa-clock"></i>
                        ${submissionDate}
                    </div>
                </div>
            `;
        });

        historyContainer.innerHTML = historyHTML;

    } catch (error) {
        console.error('Error loading task history:', error);
        historyContainer.innerHTML = `
            <div class="no-history">
                <div class="no-history-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading History</h3>
                <p>Failed to load your task history. Please try again.</p>
            </div>
        `;
    }
}

// Setup Bottom Navigation
function setupBottomNavigation() {
    const navButtons = document.querySelectorAll('.nav-button');

    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;

            // Remove active class from all buttons
            navButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            e.currentTarget.classList.add('active');

            // Handle different tab actions
            handleTabNavigation(tab);
        });
    });
}

function handleTabNavigation(tab) {
    // Update active state for all nav buttons
    updateNavButtonState(tab);

    switch(tab) {
        case 'home':
            showPage('homePage');
            updateCurrentPageTitle('Home');
            loadTasks();
            break;
        case 'post':
            // Show marketplace page
            showPage('marketplacePage');
            updateCurrentPageTitle('Marketplace');
            loadMarketplaceProducts();
            break;
        case 'chat':
            // Open chat interface
            showChatInterface();
            break;
        case 'leaderboard':
            // Show leaderboard
            showLeaderboard();
            updateLeaderboardUserProfile();
            break;
        case 'profile':
            // Open profile menu
            showProfileMenu();
            break;
    }
}

// Update marketplace user profile
function updateMarketplaceUserProfile() {
    if (!currentUser) return;

    const marketplaceUserImage = document.getElementById('marketplaceUserImage');
    const marketplaceUserPlaceholder = document.getElementById('marketplaceUserPlaceholder');
    const marketplaceUserName = document.getElementById('marketplaceUserName');

    // Update user name
    if (marketplaceUserName) {
        marketplaceUserName.textContent = currentUser.name || currentUser.username || 'User';
        marketplaceUserName.style.display = 'block';
    }

    // Update profile picture
    if (currentUser.profilePicture && currentUser.profilePicture.trim() !== '') {
        marketplaceUserImage.src = currentUser.profilePicture;
        marketplaceUserImage.style.display = 'block';
        marketplaceUserPlaceholder.style.display = 'none';

        marketplaceUserImage.onerror = function() {
            this.style.display = 'none';
            marketplaceUserPlaceholder.style.display = 'flex';
            marketplaceUserPlaceholder.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
        };
    } else {
        marketplaceUserImage.style.display = 'none';
        marketplaceUserPlaceholder.style.display = 'flex';
        marketplaceUserPlaceholder.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
    }
}

// Setup navigation buttons for chat page
function setupChatPageNavigation() {
    const navButtons = document.querySelectorAll('.nav-button[data-tab]');

    navButtons.forEach(button => {
        // Remove existing listeners to avoid duplicates
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;

            // Remove active class from all buttons
            navButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            e.currentTarget.classList.add('active');

            // Handle different tab actions
            handleTabNavigation(tab);
        });
    });
}

// Function to update navigation button active state
function updateNavButtonState(activeTab) {
    // Get all nav buttons across all pages
    const allNavButtons = document.querySelectorAll('.nav-button');

    allNavButtons.forEach(button => {
        button.classList.remove('active');
        if (button.dataset.tab === activeTab) {
            button.classList.add('active');
        }
    });
}

// Placeholder functions for navigation actions
function showPostModal() {
    showPage('marketplacePage');
    updateCurrentPageTitle('Marketplace');
    loadMarketplaceProducts();
}

function showChatInterface() {
    showPage('chatPage');
    updateCurrentPageTitle('Chat');

    // Update chat header with user profile picture - call immediately and after page load
    setTimeout(() => {
        updateChatHeaderProfile();
        loadChatContacts();
        setupChatPageNavigation();
    }, 100);

    // Also call immediately to ensure profile is updated
    updateChatHeaderProfile();

    // Refresh chat contacts to show latest admin messages
    if (currentUser) {
        setTimeout(() => {
            loadChatContacts();
        }, 500);
    }
}

// Function to update chat header profile picture
function updateChatHeaderProfile() {
    if (!currentUser) return;

    const chatUserImage = document.getElementById('chatUserImage');
    const chatUserPlaceholder = document.getElementById('chatUserPlaceholder');

    // Check if user has a profile picture
    if (currentUser.profilePicture && currentUser.profilePicture.trim() !== '') {
        // Show user's uploaded profile picture
        chatUserImage.src = currentUser.profilePicture;
        chatUserImage.style.display = 'block';
        chatUserPlaceholder.style.display = 'none';

        // Handle image load error - fallback to user initial
        chatUserImage.onerror = function() {
            this.style.display = 'none';
            chatUserPlaceholder.style.display = 'flex';
            chatUserPlaceholder.innerHTML = '';
            chatUserPlaceholder.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
        };

        // Handle successful image load
        chatUserImage.onload = function() {
            this.style.display = 'block';
            chatUserPlaceholder.style.display = 'none';
        };
    } else {
        // No profile picture, show user's name initial
        chatUserImage.style.display = 'none';
        chatUserPlaceholder.style.display = 'flex';
        chatUserPlaceholder.innerHTML = '';
        chatUserPlaceholder.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
    }
}

// Function to load chat contacts (admin contact)
async function loadChatContacts() {
    const contactsContainer = document.getElementById('chatContactsContainer');

    try {
        // Load admin display name from settings
        const settingsSnapshot = await database.ref('settings').once('value');
        const settings = settingsSnapshot.val() || {};
        const adminDisplayName = settings.adminDisplayName || 'admin';

        // Get admin's latest message for current user
        let latestAdminMessage = 'Available for support';

        if (currentUser && currentUser.uid) {
            try {
                const adminChatSnapshot = await database.ref(`admin_chats/${currentUser.uid}`)
                    .orderByChild('timestamp')
                    .limitToLast(1)
                    .once('value');

                const adminMessages = adminChatSnapshot.val();
                if (adminMessages) {
                    const lastMessage = Object.values(adminMessages)[0];
                    if (lastMessage && lastMessage.senderType === 'admin' && lastMessage.content) {
                        // Get first line of admin's message (up to 50 characters)
                        const firstLine = lastMessage.content.split('\n')[0];
                        latestAdminMessage = firstLine.length > 50 ? 
                            firstLine.substring(0, 47) + '...' : firstLine;
                    }
                }
            } catch (messageError) {
                console.log('No admin messages found, using default text');
            }
        }

        // Update admin contact card with dynamic name and message
        const adminContactCard = contactsContainer.querySelector('.admin-contact');
        if (adminContactCard) {
            const contactNameElement = adminContactCard.querySelector('.contact-name');
            const contactMessageElement = adminContactCard.querySelector('.contact-last-message');

            if (contactNameElement) {
                contactNameElement.textContent = adminDisplayName;
            }

            if (contactMessageElement) {
                contactMessageElement.textContent = latestAdminMessage;
            }
        }

        console.log('Chat contacts loaded with admin name:', adminDisplayName);
        console.log('Latest admin message preview:', latestAdminMessage);
    } catch (error) {
        console.error('Error loading chat contacts:', error);
        console.log('Chat contacts loaded with default admin name');
    }
}

// Function to open admin live chat when admin card is clicked
function openAdminLiveChat() {
    // Show loading transition
    showPageTransition('Connecting to Admin...');

    setTimeout(() => {
        hidePageTransition();
        openAdminChat();
    }, 1000);
}

// Function to open live chat page
function openLiveChatPage() {
    showPageTransition('Opening Live Chat...');

    setTimeout(() => {
        hidePageTransition();
        showPage('liveChatPage');
        updateCurrentPageTitle('Live Chat');
        initializeLiveChatPage();
    }, 1000);
}

// Initialize bKash style live chat page
function initializeLiveChatPage() {
    // Clear previous messages
    const messagesContainer = document.getElementById('bkashMessagesContainer');
    if (!messagesContainer) return;

    // Setup language selection
    setupBkashLanguageSelection();

    // Setup input handlers
    setupBkashMessageInput();

    // Load existing messages
    loadExistingBkashMessages();

    // Setup real-time message listening
    setupBkashRealTimeMessages();

    // Show welcome typing after language selection
    setTimeout(() => {
        showBkashTyping();
        setTimeout(() => {
            hideBkashTyping();
            addBkashMessage('admin', 'Hello! How can I assist you today?');
        }, 2000);
    }, 3000);
}

// Live Chat Page Functions
function refreshLiveChatUsers() {
    loadLiveChatUsers();
}

function loadLiveChatUsers() {
    const container = document.getElementById('liveChatUsersContainer');
    if (!container) return;

    // Show loading state
    container.innerHTML = `
        <div class="live-chat-empty-state">
            <div class="live-chat-empty-icon">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <h3>Loading Users...</h3>
            <p>Please wait while we load active users</p>
        </div>
    `;

    // For now, show admin as the main contact
    setTimeout(() => {
        container.innerHTML = `
            <div class="live-chat-user-card" onclick="openIndividualChat('admin')">
                <div class="live-chat-user-avatar">
                    <div class="live-chat-user-placeholder">A</div>
                </div>
                <div class="live-chat-user-info">
                    <div class="live-chat-user-name">Admin Support</div>
                    <div class="live-chat-user-last-message">Available for assistance</div>
                    <div class="live-chat-user-status">
                        <i class="fas fa-circle"></i>
                        অনলাইন
                    </div>
                </div>
                <div class="live-chat-user-meta">
                    <div class="live-chat-user-time">Now</div>
                </div>
            </div>
        `;
    }, 1000);
}

function openIndividualChat(userId) {
    if (userId === 'admin') {
        // Open admin chat instead
        openAdminChat();
    } else {
        showPage('individualChatPage');
        updateCurrentPageTitle('Chat with User');
        loadIndividualChatMessages(userId);
    }
}

function loadIndividualChatMessages(userId) {
    const container = document.getElementById('individualChatMessagesContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="individual-chat-message admin">
            <div class="individual-chat-message-bubble">
                Hello! How can I help you today?
                <div class="individual-chat-message-time">Just now</div>
            </div>
        </div>
    `;
}

function attachIndividualChatFile() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*,application/pdf';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Handle file attachment
            addIndividualChatMessage('user', `📎 File attached: ${file.name}`);
        }
    });

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

function handleIndividualChatKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendIndividualChatMessage();
    }
}

function adjustIndividualChatTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
}

function sendIndividualChatMessage() {
    const input = document.getElementById('individualChatMessageInput');
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    // Add user message
    addIndividualChatMessage('user', message);

    // Clear input
    input.value = '';
    adjustIndividualChatTextarea(input);

    // Simulate admin response
    setTimeout(() => {
        addIndividualChatMessage('admin', 'Thank you for your message. How can I assist you further?');
    }, 1000);
}

function addIndividualChatMessage(sender, message) {
    const container = document.getElementById('individualChatMessagesContainer');
    if (!container) return;

    const messageTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const messageHTML = `
        <div class="individual-chat-message ${sender}">
            <div class="individual-chat-message-bubble">
                ${message}
                <div class="individual-chat-message-time">${messageTime}</div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', messageHTML);
    container.scrollTop = container.scrollHeight;
}

// Load existing messages for current user
async function loadExistingBkashMessages() {
    if (!currentUser) return;

    try {
        const snapshot = await database.ref('bkash_chat_messages')
            .orderByChild('userId')
            .equalTo(currentUser.uid)
            .once('value');

        const messages = snapshot.val() || {};
        const messageArray = Object.keys(messages).map(key => ({
            id: key,
            ...messages[key]
        })).sort((a, b) => a.timestamp - b.timestamp);

        // Display existing messages
        messageArray.forEach(message => {
            if (message.sender !== 'system') {
                addBkashMessage(message.sender, message.message, message.timestamp);
            }
        });

    } catch (error) {
        console.error('Error loading existing messages:', error);
    }
}

// Open Admin Direct Chat
function openAdminDirectChat() {
    // Show loading transition
    showPageTransition('Connecting to Admin...');

    setTimeout(() => {
        hidePageTransition();
        openAdminChat();
    }, 1000);
}

// Send bKash Quick Message
function sendBkashQuickMessage(message) {
    if (!currentUser) {
        alert('প্রথমে লগইন করুন');
        return;
    }

    // Open admin chat with pre-filled message
    openAdminDirectChat();

    // Wait a bit for chat to load, then send message
    setTimeout(() => {
        const input = document.getElementById('adminChatInput');
        if (input) {
            input.value = message + ' - সাহায্য প্রয়োজন';
            // Auto-send the message
            setTimeout(() => {
                sendAdminMessage();
            }, 500);
        }
    }, 1500);
}

// Load User Messages for Live Chat Page
async function loadUserMessagesHistory() {
    if (!currentUser) {
        document.getElementById('userMessagesContainer').innerHTML = `
            <div class="no-messages">
                <i class="fas fa-info-circle"></i>
                <p>প্রথমে লগইন করুন মেসেজ ইতিহাস দেখতে</p>
            </div>
        `;
        return;
    }

    try {
        // Load admin chat messages
        const adminChatSnapshot = await database.ref(`admin_chats/${currentUser.uid}`)
            .orderByChild('timestamp')
            .limitToLast(10)
            .once('value');

        const adminMessages = adminChatSnapshot.val() || {};
        const adminMessageArray = Object.values(adminMessages)
            .sort((a, b) => b.timestamp - a.timestamp);

        const container = document.getElementById('userMessagesContainer');

        if (adminMessageArray.length === 0) {
            container.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comment-slash"></i>
                    <p>এখনও কোনো মেসেজ নেই। এডমিনের সাথে চ্যাট শুরু করুন!</p>
                </div>
            `;
            return;
        }

        let messagesHTML = '';
        adminMessageArray.forEach(message => {
            const messageTime = new Date(message.timestamp).toLocaleDateString('bn-BD', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const statusClass = message.read ? 'replied' : 'pending';
            const statusText = message.read ? 'উত্তর দেওয়া হয়েছে' : 'অপেক্ষমান';

            messagesHTML += `
                <div class="user-message-item">
                    <div class="message-header">
                        <span class="message-status ${statusClass}">${statusText}</span>
                        <span class="message-time">${messageTime}</span>
                    </div>
                    <div class="message-content">
                        ${message.content}
                    </div>
                </div>
            `;
        });

        container.innerHTML = messagesHTML;

    } catch (error) {
        console.error('Error loading user messages:', error);
        document.getElementById('userMessagesContainer').innerHTML = `
            <div class="no-messages">
                <i class="fas fa-exclamation-triangle"></i>
                <p>মেসেজ লোড করতে সমস্যা হয়েছে</p>
            </div>
        `;
    }
}

// Marketplace Functions
async function loadMarketplaceProducts() {
    const container = document.getElementById('marketplaceProductsContainer');

    try {
        // Update marketplace user profile
        updateMarketplaceUserProfile();

        // Keep simple marketplace title
        const marketplacePageTitle = document.getElementById('marketplacePageTitle');
        if (marketplacePageTitle) {
            marketplacePageTitle.textContent = 'Marketplace';
        }

        // Show loading state
        container.innerHTML = `
            <div class="loading-marketplace">
                <div class="marketplace-loading-spinner"></div>
                <p>Loading marketplace products...</p>
            </div>
        `;

        // Load marketplace posts from Firebase
        const snapshot = await database.ref('marketplace_posts').orderByChild('status').equalTo('active').once('value');
        const posts = snapshot.val() || {};

        const postsArray = Object.keys(posts).map(key => ({
            id: key,
            ...posts[key]
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (postsArray.length === 0) {
            container.innerHTML = `
                <div class="marketplace-empty-state">
                    <div class="marketplace-empty-icon">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <h3>No Products Available</h3>
                    <p>Check back later for amazing deals and services from our marketplace!</p>
                </div>
            `;
            return;
        }

        // Display products
        displayMarketplaceProducts(postsArray);

    } catch (error) {
        console.error('Error loading marketplace products:', error);
        container.innerHTML = `
            <div class="marketplace-empty-state">
                <div class="marketplace-empty-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading Products</h3>
                <p>Failed to load marketplace products. Please try again later.</p>
            </div>
        `;
    }
}

// Marketplace user profile section removed as requested

function displayMarketplaceProducts(products) {
    const container = document.getElementById('marketplaceProductsContainer');

    const productsHTML = products.map(product => {
        // Generate rating stars
        const rating = product.rating || 4.96;
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        let starsHTML = '';
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star rating-star"></i>';
        }
        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt rating-star"></i>';
        }
        for (let i = fullStars + (hasHalfStar ? 1 : 0); i < 5; i++) {
            starsHTML += '<i class="far fa-star rating-star"></i>';
        }

        // Price display
        const priceText = product.isFree ? 'Free' : `$${product.price}/${product.period}`;
        const priceClass = product.isFree ? 'product-free-badge' : 'product-price-badge';

        // Verification badge
        let verificationBadge = '';
        if (product.verificationBadge && product.verificationBadge !== 'none') {
            const badgeIcons = {
                'gem': 'fas fa-gem',
                'shield': 'fas fa-shield-alt', 
                'star': 'fas fa-star'
            };
            verificationBadge = `
                <div class="product-verification-badge verification-${product.verificationBadge}">
                    <i class="${badgeIcons[product.verificationBadge]}"></i>
                </div>
            `;
        }

        // Category formatting
        const categoryText = product.category ? 
            product.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
            'General';

        return `
            <div class="marketplace-product-card">
                <div class="product-card-header">
                    <img src="${product.bannerImage}" alt="${product.title}" class="product-banner-image" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22220%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23f8f9fa%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2216%22 fill=%22%23666%22>Image Not Found</text></svg>'">
                    <div class="${priceClass}">
                        ${priceText}
                    </div>
                    ${verificationBadge}
                </div>

                <div class="product-card-content">
                    <div class="product-header">
                        <div class="product-vendor-logo">
                            <i class="${product.vendorLogo || 'fas fa-store'}"></i>
                        </div>
                        <div class="product-info">
                            <h3 class="product-title">${product.title}</h3>
                            <div class="product-vendor">${product.vendorName}</div>
                        </div>
                    </div>

                    <div class="product-description">
                        ${product.description}
                    </div>

                    <div class="product-rating">
                        <div class="rating-stars">
                            ${starsHTML}
                        </div>
                        <span class="rating-text">${rating} (${product.reviewCount || 819})</span>
                    </div>

                    <div class="product-category">
                        ${categoryText}
                    </div>


                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="marketplace-products-grid">
            ${productsHTML}
        </div>
    `;
}

function openProductDetails(productId) {
    // Show product details in a modal or new page
    alert(`Opening product details for ID: ${productId}`);
}

function contactVendor(productId) {
    // Open chat or contact form for vendor
    alert(`Contacting vendor for product ID: ${productId}`);
}

// Initialize Live Chat Page
function initializeLiveChatPage() {
    // Update page title
    updateCurrentPageTitle('Live Chat');

    // Load user's message history
    loadUserMessagesHistory();

    // Update admin profile info
    if (currentUser) {
        const adminProfileStatus = document.querySelector('.admin-profile-status');
        if (adminProfileStatus) {
            adminProfileStatus.textContent = `${currentUser.name} - তাৎক্ষণিক সাহায্যের জন্য এডমিনের সাথে যোগাযোগ করুন`;
        }
    }
}

// Setup real-time message listening
function setupBkashRealTimeMessages() {
    if (!currentUser) return;

    // Listen for new messages
    database.ref('bkash_chat_messages')
        .orderByChild('userId')
        .equalTo(currentUser.uid)
        .on('child_added', (snapshot) => {
            const message = snapshot.val();
            const messageId = snapshot.key;

            // Only add admin messages in real-time (user messages are added immediately)
            if (message.sender === 'admin') {
                // Check if message is newer than page load
                const pageLoadTime = window.bkashPageLoadTime || 0;
                if (message.timestamp > pageLoadTime) {
                    showBkashTyping();
                    setTimeout(() => {
                        hideBkashTyping();
                        addBkashMessage('admin', message.message, message.timestamp);

                        // Mark admin message as read
                        database.ref(`bkash_chat_messages/${messageId}/read`).set(true);
                    }, 1000);
                }
            }
        });

    // Set page load time for real-time detection
    window.bkashPageLoadTime = Date.now();
}

// Setup bKash language selection
function setupBkashLanguageSelection() {
    const languageButtons = document.querySelectorAll('.bkash-language-btn');

    languageButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Remove active class from all buttons
            languageButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            e.target.classList.add('active');

            const selectedLanguage = e.target.dataset.lang;

            // Show confirmation message
            setTimeout(() => {
                showBkashTyping();
                setTimeout(() => {
                    hideBkashTyping();
                    if (selectedLanguage === 'bn') {
                        addBkashMessage('admin', 'ধন্যবাদ! আমি আপনাকে বাংলায় সাহায্য করব। আপনার কোন প্রশ্ন আছে?');
                    } else {
                        addBkashMessage('admin', 'Thank you! I will assist you in English. How can I help you?');
                    }
                }, 1500);
            }, 500);
        });
    });
}

// Setup bKash message input
function setupBkashMessageInput() {
    const input = document.getElementById('bkashMessageInput');
    const sendBtn = document.getElementById('bkashSendBtn');

    if (!input || !sendBtn) return;

    input.addEventListener('input', (e) => {
        const hasText = e.target.value.trim().length > 0;
        sendBtn.disabled = !hasText;

        if (hasText) {
            sendBtn.style.background = '#e91e63';
        } else {
            sendBtn.style.background = '#ccc';
        }
    });
}

// Add bKash message to chat
function addBkashMessage(sender, message, timestamp = null) {
    const messagesArea = document.getElementById('chatMessagesArea');
    if (!messagesArea) return;

    const messageTime = timestamp ? new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    }) : new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const isAdmin = sender === 'admin';
    const messageClass = isAdmin ? 'admin' : 'user';

    const messageHTML = `
        <div class="chat-message ${messageClass}">
            <div class="message-bubble">
                ${message}
                <div class="message-time-stamp">${messageTime}</div>
            </div>
        </div>
    `;

    messagesArea.insertAdjacentHTML('beforeend', messageHTML);
    scrollBkashToBottom();
}

// Show bKash typing indicator
function showBkashTyping() {
    const typingIndicator = document.getElementById('bkashTypingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = 'flex';
        scrollBkashToBottom();
    }
}

// Hide bKash typing indicator
function hideBkashTyping() {
    const typingIndicator = document.getElementById('bkashTypingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = 'none';
    }
}

// Send bKash message
function sendBkashMessage() {
    const input = document.getElementById('bkashMessageInput');
    const message = input.value.trim();

    if (!message || !currentUser) return;

    // Add user message
    addBkashMessage('user', message);

    // Save message to Firebase
    saveBkashMessage('user', message);

    // Clear input
    input.value = '';
    handleBkashMessageInput(input);

    // Real admin will respond through admin panel
    // No auto-response needed
}

// Generate bKash style response
function generateBkashResponse(userMessage) {
    const responses = {
        'help': 'I\'m here to help you with any questions or issues you may have. Please tell me more about what you need assistance with.',
        'balance': 'To check your balance, please go to your profile section or I can help you with any balance-related queries.',
        'payment': 'I can assist you with payment issues. Please describe the specific problem you\'re experiencing.',
        'task': 'For task-related questions, I\'m here to help. What would you like to know about tasks?',
        'সাহায্য': 'আমি আপনাকে যেকোনো প্রশ্ন বা সমস্যায় সাহায্য করতে এখানে আছি। অনুগ্রহ করে আরো বিস্তারিত বলুন।',
        'টাস্ক': 'টাস্ক সংক্রান্ত যেকোনো প্রশ্নে আমি সাহায্য করতে পারি। আপনি কী জানতে চান?',
        'পেমেন্ট': 'পেমেন্ট সংক্রান্ত সমস্যায় আমি সাহায্য করতে পারি। কী সমস্যা হচ্ছে বিস্তারিত বলুন।'
    };

    const lowerMessage = userMessage.toLowerCase();

    // Check for keywords
    for (const keyword in responses) {
        if (lowerMessage.includes(keyword)) {
            return responses[keyword];
        }
    }

    // Default responses
    const defaultResponses = [
        'Thank you for your message. I\'m here to help you with any questions you may have.',
        'I understand your concern. Could you please provide more details so I can assist you better?',
        'I\'m here to help! Please let me know if you have any specific questions.',
        'Thank you for contacting Real Tasker support. How can I assist you today?'
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// Handle bKash message keydown
function handleBkashMessageKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendBkashMessage();
    }
}

// Handle bKash message input
function handleBkashMessageInput(input) {
    const sendBtn = document.getElementById('bkashSendBtn');
    const hasText = input.value.trim().length > 0;

    if (sendBtn) {
        sendBtn.disabled = !hasText;
        sendBtn.style.background = hasText ? '#e91e63' : '#ccc';
    }
}

// Select bKash image
function selectBkashImage() {
    document.getElementById('bkashFileInput').click();
}

// Handle bKash file upload
function handleBkashFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            showBkashImagePreview(e.target.result, file.name);
        };
        reader.readAsDataURL(file);
    } else {
        showBkashToast('Please select an image file only', 'error');
    }
}

// Show bKash image preview
function showBkashImagePreview(imageSrc, fileName) {
    const previewContainer = document.getElementById('bkashImagePreview');
    const previewImg = document.getElementById('previewImage');

    if (previewContainer && previewImg) {
        previewImg.src = imageSrc;
        previewContainer.style.display = 'block';

        // Enable send button
        const sendBtn = document.getElementById('bkashSendBtn');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.style.background = '#e91e63';
        }
    }
}

// Remove bKash image preview
function removeBkashImagePreview() {
    const previewContainer = document.getElementById('bkashImagePreview');
    const fileInput = document.getElementById('bkashFileInput');

    if (previewContainer) {
        previewContainer.style.display = 'none';
    }

    if (fileInput) {
        fileInput.value = '';
    }

    // Update send button state
    const input = document.getElementById('bkashMessageInput');
    const sendBtn = document.getElementById('bkashSendBtn');

    if (input && sendBtn) {
        const hasText = input.value.trim().length > 0;
        sendBtn.disabled = !hasText;
        sendBtn.style.background = hasText ? '#e91e63' : '#ccc';
    }
}

// Toggle bKash emoji picker
function toggleBkashEmoji() {
    const emojiBtn = document.querySelector('.bkash-emoji-btn');
    const input = document.getElementById('bkashMessageInput');

    // Simple emoji insertion
    const emojis = ['😊', '👍', '❤️', '😂', '🙏', '👏', '🔥', '💯', '😍', '🎉'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    if (input) {
        const cursorPos = input.selectionStart;
        const textBefore = input.value.substring(0, cursorPos);
        const textAfter = input.value.substring(cursorPos);

        input.value = textBefore + randomEmoji + textAfter;
        input.setSelectionRange(cursorPos + randomEmoji.length, cursorPos + randomEmoji.length);

        handleBkashMessageInput(input);
        input.focus();
    }

    // Visual feedback
    if (emojiBtn) {
        emojiBtn.style.transform = 'scale(1.2) rotate(360deg)';
        setTimeout(() => {
            emojiBtn.style.transform = '';
        }, 300);
    }
}

// Send bKash quick message
function sendBkashQuickMessage(message) {
    const input = document.getElementById('bkashMessageInput');
    if (input) {
        input.value = message;
        handleBkashMessageInput(input);
        setTimeout(() => {
            sendBkashMessage();
        }, 100);
    }
}

// Scroll to bottom in bKash chat
function scrollBkashToBottom() {
    const chatBody = document.querySelector('.bkash-chat-body');
    if (chatBody) {
        chatBody.scrollTop = chatBody.scrollHeight;
    }
}

// Save bKash message to Firebase
async function saveBkashMessage(sender, message) {
    if (!currentUser) return;

    try {
        const messageData = {
            userId: currentUser.uid,
            senderType: sender,
            senderName: sender === 'admin' ? 'Admin' : currentUser.name || currentUser.username || 'User',
            content: message,
            timestamp: Date.now(),
            read: false,
            delivered: true
        };

        // Save to admin_chats for admin panel access
        await database.ref(`admin_chats/${currentUser.uid}`).push(messageData);

        // Also save to bkash_chat_messages for compatibility
        await database.ref('bkash_chat_messages').push({
            userId: currentUser.uid,
            sender: sender,
            message: message,
            timestamp: Date.now(),
            read: false
        });
    } catch (error) {
        console.error('Error saving bKash message:', error);
    }
}

// Show bKash toast notification
function showBkashToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `bkash-toast toast-${type}`;

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };

    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
    };

    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        font-size: 0.9rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Show success toast notification
function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast-notification';

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-check-circle"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">Success!</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 20px 25px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        z-index: 10001;
        font-family: 'Inter', sans-serif;
        display: flex;
        align-items: center;
        gap: 15px;
        animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        max-width: 350px;
        min-width: 300px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
    `;

    const style = document.createElement('style');
    style.textContent = `
        .toast-icon {
            font-size: 1.5rem;
            opacity: 0.9;
        }
        
        .toast-content {
            flex: 1;
        }
        
        .toast-title {
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 4px;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .toast-message {
            font-size: 0.9rem;
            font-weight: 500;
            opacity: 0.95;
            line-height: 1.4;
        }
        
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
        }
        
        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
            to {
                opacity: 0;
                transform: translateX(100%) scale(0.95);
            }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        setTimeout(() => {
            toast.remove();
            style.remove();
        }, 400);
    }, 3000);
}

// Show profile edited notification on home page
function showProfileEditedNotification(wasFirstSave) {
    const notification = document.createElement('div');
    notification.className = 'profile-edited-notification';

    const title = wasFirstSave ? 'Profile Created Successfully!' : 'Profile Updated Successfully!';
    const message = wasFirstSave ? 
        'Your profile has been created and locked. Some fields can no longer be edited for security.' :
        'Your profile changes have been saved successfully.';

    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                <i class="fas fa-user-check"></i>
            </div>
            <div class="notification-text">
                <h3>${title}</h3>
                <p>${message}</p>
                ${wasFirstSave ? '<small>Important: Personal information is now locked and cannot be changed.</small>' : ''}
            </div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #ffffff, #f8f9fa);
        border: 2px solid #10b981;
        border-radius: 16px;
        box-shadow: 0 12px 35px rgba(16, 185, 129, 0.2);
        z-index: 10000;
        font-family: 'Inter', sans-serif;
        animation: notificationSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        max-width: 450px;
        width: 90%;
        backdrop-filter: blur(10px);
    `;

    const style = document.createElement('style');
    style.textContent = `
        .notification-content {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            padding: 25px;
            position: relative;
        }
        
        .notification-icon {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.3rem;
            flex-shrink: 0;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }
        
        .notification-text {
            flex: 1;
            color: #1f2937;
        }
        
        .notification-text h3 {
            font-size: 1.1rem;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: #059669;
        }
        
        .notification-text p {
            font-size: 0.95rem;
            font-weight: 500;
            margin: 0 0 8px 0;
            line-height: 1.5;
            color: #374151;
        }
        
        .notification-text small {
            font-size: 0.85rem;
            color: #f59e0b;
            font-weight: 600;
            display: block;
            margin-top: 5px;
            font-style: italic;
        }
        
        .notification-close {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(107, 114, 128, 0.1);
            border: none;
            color: #6b7280;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        
        .notification-close:hover {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            transform: scale(1.1);
        }
        
        @keyframes notificationSlideIn {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-30px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Auto remove after 8 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'notificationSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        }
    }, 8000);
}

// Hide User Profile Modal function
function hideUserProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Show Edit Profile Page function
function showEditProfilePage() {
    // Hide the profile modal first
    hideUserProfileModal();
    
    // Show the edit profile page
    showPage('editProfilePage');
    updateCurrentPageTitle('Edit Profile');
    
    // Setup profile picture upload
    setupEditProfilePictureUpload();
    
    // Load current user data into form
    if (currentUser) {
        const editProfileImage = document.getElementById('editProfileImage');
        const editProfilePlaceholder = editProfileImage ? editProfileImage.nextElementSibling : null;
        
        // Set profile picture
        if (editProfileImage && editProfilePlaceholder) {
            if (currentUser.profilePicture && currentUser.profilePicture.trim() !== '') {
                editProfileImage.src = currentUser.profilePicture;
                editProfileImage.style.display = 'block';
                editProfilePlaceholder.style.display = 'none';
            } else {
                editProfileImage.style.display = 'none';
                editProfilePlaceholder.style.display = 'flex';
                editProfilePlaceholder.innerHTML = '<i class="fas fa-user"></i>';
            }
        }
        
        // Set form values safely
        const editFullName = document.getElementById('editFullName');
        const editUsername = document.getElementById('editUsername');
        const editEmail = document.getElementById('editEmail');
        const editBio = document.getElementById('editBio');
        const editEducation = document.getElementById('editEducation');
        const editMobileNumber = document.getElementById('editMobileNumber');
        const countryCodeSelect = document.getElementById('countryCodeSelect');
        const editBirthDay = document.getElementById('editBirthDay');
        const editBirthMonth = document.getElementById('editBirthMonth');
        const editBirthYear = document.getElementById('editBirthYear');
        
        if (editFullName) editFullName.value = currentUser.name || '';
        if (editUsername) editUsername.value = currentUser.username || '';
        if (editEmail) editEmail.value = currentUser.email || '';
        if (editBio) editBio.value = currentUser.bio || '';
        if (editEducation) editEducation.value = currentUser.education || '';
        if (editMobileNumber) editMobileNumber.value = currentUser.mobileNumber || '';
        if (countryCodeSelect) countryCodeSelect.value = currentUser.countryCode || '+880';
        
        // Set gender
        if (currentUser.gender) {
            const genderRadio = document.querySelector(`input[name="gender"][value="${currentUser.gender}"]`);
            if (genderRadio) genderRadio.checked = true;
        }
        
        // Set date of birth
        if (currentUser.dob) {
            const dobParts = currentUser.dob.split('-');
            if (dobParts.length === 3) {
                if (editBirthYear) editBirthYear.value = dobParts[0];
                if (editBirthMonth) editBirthMonth.value = parseInt(dobParts[1]);
                if (editBirthDay) editBirthDay.value = parseInt(dobParts[2]);
            }
        }
        
        // Apply one-time editable restrictions
        applyOneTimeEditableRestrictions();
        
        // Show locked notice if profile is locked
        const profileLockedNotice = document.getElementById('profileLockedNotice');
        if (profileLockedNotice && currentUser.profileLocked) {
            profileLockedNotice.style.display = 'flex';
        } else if (profileLockedNotice) {
            profileLockedNotice.style.display = 'none';
        }
        
        // Setup form validation and character counter
        setupProfileFormValidation();
        setupBioCharacterCounter();
        
        // Setup social media toggles and load settings
        setTimeout(() => {
            setupSocialMediaToggles();
            loadSocialMediaSettings();
        }, 100);
    }
}

// Apply one-time editable field restrictions
function applyOneTimeEditableRestrictions() {
    if (!currentUser) return;
    
    // Check if profile has been saved before (profileLocked flag)
    const isProfileLocked = currentUser.profileLocked === true;
    
    if (isProfileLocked) {
        // Make one-time editable fields read-only but still visible
        const oneTimeFields = [
            'editFullName',
            'editUsername', 
            'editMobileNumber',
            'countryCodeSelect'
        ];
        
        oneTimeFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.readOnly = true;
                field.disabled = true;
                field.style.cursor = 'not-allowed';
                field.style.backgroundColor = '#f9fafb';
                field.style.color = '#6b7280';
                field.style.borderColor = '#e5e7eb';
                field.style.opacity = '0.8';
                
                // Add a lock icon to show it's locked
                if (!field.parentElement.querySelector('.locked-icon')) {
                    const lockIcon = document.createElement('div');
                    lockIcon.className = 'locked-icon';
                    lockIcon.innerHTML = '<i class="fas fa-lock"></i>';
                    lockIcon.style.cssText = `
                        position: absolute;
                        right: 15px;
                        top: 50%;
                        transform: translateY(-50%);
                        color: #9ca3af;
                        pointer-events: none;
                        z-index: 10;
                    `;
                    field.parentElement.style.position = 'relative';
                    field.parentElement.appendChild(lockIcon);
                }
            }
        });
        
        // Make gender radio buttons read-only but still show selected value
        const genderRadios = document.querySelectorAll('input[name="gender"]');
        genderRadios.forEach(radio => {
            radio.disabled = true;
            radio.style.cursor = 'not-allowed';
            const label = radio.nextElementSibling;
            if (label) {
                label.style.cursor = 'not-allowed';
                label.style.opacity = '0.6';
            }
        });
        
        // Make country code container read-only but still show selected value
        const countryContainer = document.querySelector('.country-code-container');
        if (countryContainer) {
            countryContainer.style.cursor = 'not-allowed';
            countryContainer.style.backgroundColor = '#f9fafb';
            countryContainer.style.borderColor = '#e5e7eb';
            countryContainer.style.opacity = '0.8';
            const hiddenSelect = countryContainer.querySelector('.hidden-country-select');
            if (hiddenSelect) {
                hiddenSelect.disabled = true;
            }
        }
        
        // Social media toggles remain editable (only certain profile fields are locked)
        
        // Update save button text to indicate some fields are locked
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-edit"></i> Update Available Fields';
        }
    }
}

// Enhanced save profile function with success redirect and lock mechanism
async function saveProfile() {
    if (!currentUser) {
        alert('Please log in to save your profile');
        return;
    }
    
    const saveBtn = document.getElementById('saveProfileBtn');
    const originalText = saveBtn.innerHTML;
    
    try {
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        
        // Collect form data - only update editable fields
        const profileData = {};
        
        // For locked profiles, only allow certain fields to be updated
        if (currentUser.profileLocked) {
            // Only allow bio, education, and social media to be updated
            profileData.bio = document.getElementById('editBio')?.value.trim() || currentUser.bio || '';
            profileData.education = document.getElementById('editEducation')?.value || currentUser.education || '';
            profileData.profilePicture = currentUser.profilePicture || '';
            
            // Keep existing locked values
            profileData.name = currentUser.name;
            profileData.username = currentUser.username;
            profileData.mobileNumber = currentUser.mobileNumber || '';
            profileData.countryCode = currentUser.countryCode || '+880';
            profileData.gender = currentUser.gender || '';
            profileData.dob = currentUser.dob || '';
        } else {
            // First time saving - collect all data
            profileData.name = document.getElementById('editFullName')?.value.trim() || currentUser.name;
            profileData.username = document.getElementById('editUsername')?.value.trim() || currentUser.username;
            profileData.bio = document.getElementById('editBio')?.value.trim() || currentUser.bio || '';
            profileData.education = document.getElementById('editEducation')?.value || currentUser.education || '';
            profileData.mobileNumber = document.getElementById('editMobileNumber')?.value.trim() || currentUser.mobileNumber || '';
            profileData.countryCode = document.getElementById('countryCodeSelect')?.value || currentUser.countryCode || '+880';
            profileData.profilePicture = currentUser.profilePicture || '';
            
            // Get gender
            const selectedGender = document.querySelector('input[name="gender"]:checked');
            if (selectedGender) {
                profileData.gender = selectedGender.value;
            } else {
                profileData.gender = currentUser.gender || '';
            }
            
            // Get date of birth
            const birthDay = document.getElementById('editBirthDay')?.value;
            const birthMonth = document.getElementById('editBirthMonth')?.value;
            const birthYear = document.getElementById('editBirthYear')?.value;
            
            if (birthDay && birthMonth && birthYear) {
                profileData.dob = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
            } else {
                profileData.dob = currentUser.dob || '';
            }
            
            // Lock profile after first save
            profileData.profileLocked = true;
            profileData.profileLockedAt = Date.now();
        }
        
        // Get social media settings and URLs (always editable)
        const socialMediaSettings = {};
        const socialMediaUrls = {};
        const socialToggles = document.querySelectorAll('.toggle-switch:not(:disabled)');
        
        socialToggles.forEach(toggle => {
            const platform = toggle.id.replace('Toggle', '');
            socialMediaSettings[platform] = toggle.checked;
            
            // If toggle is checked, get the URL
            if (toggle.checked) {
                const urlInput = document.getElementById(`${platform}Url`);
                if (urlInput && urlInput.value.trim()) {
                    socialMediaUrls[platform] = urlInput.value.trim();
                }
            }
        });
        
        profileData.socialMedia = socialMediaUrls; // Save actual URLs instead of just toggles
        profileData.socialMediaSettings = socialMediaSettings; // Keep settings for reference
        
        // Preserve other user data
        const updatedUserData = {
            ...currentUser,
            ...profileData,
            updatedAt: Date.now()
        };
        
        // Save to Firebase
        await database.ref(`users/${currentUser.uid}`).update(updatedUserData);
        
        // Update local currentUser
        const wasFirstSave = !currentUser.profileLocked;
        currentUser = updatedUserData;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Show success animation and message
        saveBtn.innerHTML = '<i class="fas fa-check-circle"></i> Saved Successfully!';
        saveBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        
        // Update header profile picture
        updateHeaderProfilePicture();
        
        // Show success toast notification
        showSuccessToast('Profile updated successfully!');
        
        // Redirect to home page after 1.5 seconds
        setTimeout(() => {
            showPage('homePage');
            updateCurrentPageTitle('Home');
            loadTasks();
            
            // Show profile edited notification on home page
            setTimeout(() => {
                showProfileEditedNotification(wasFirstSave);
            }, 500);
            
            // Update navigation to home
            updateNavButtonState('home');
            
        }, 1500);
        
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile. Please try again.');
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Auto detect user's country based on IP address
async function detectUserCountry() {
    // Don't auto-detect if user manually selected a country
    if (window.countryManuallySelected) {
        console.log('Skipping IP detection - user manually selected country');
        return;
    }
    
    try {
        console.log('Detecting user country from IP address...');
        
        // Try multiple IP geolocation services for better accuracy
        const services = [
            'https://ipapi.co/json/',
            'https://ip-api.com/json/',
            'https://ipinfo.io/json'
        ];
        
        for (const serviceUrl of services) {
            try {
                const response = await fetch(serviceUrl);
                if (!response.ok) continue;
                
                const data = await response.json();
                let countryCode = null;
                let countryName = null;
                let countryCodeISO = null;
                
                // Handle different service response formats
                if (serviceUrl.includes('ipapi.co')) {
                    countryCode = data.country_calling_code;
                    countryName = data.country_name;
                    countryCodeISO = data.country_code;
                } else if (serviceUrl.includes('ip-api.com')) {
                    countryCodeISO = data.countryCode;
                    countryName = data.country;
                    // Get calling code from our mapping
                    const callingCodeMap = getCallingCodeMap();
                    countryCode = callingCodeMap[countryCodeISO];
                } else if (serviceUrl.includes('ipinfo.io')) {
                    countryCodeISO = data.country;
                    countryName = data.country;
                    const callingCodeMap = getCallingCodeMap();
                    countryCode = callingCodeMap[countryCodeISO];
                }
                
                if (countryCode && countryCodeISO) {
                    const flag = getCountryFlag(countryCodeISO);
                    
                    // Update the country selector
                    const countrySelect = document.getElementById('countryCodeSelect');
                    const countryContainer = document.querySelector('.country-code-container');
                    
                    if (countrySelect && countryContainer) {
                        // Find the matching option
                        const matchingOption = [...countrySelect.options].find(option => 
                            option.value === countryCode
                        );
                        
                        if (matchingOption) {
                            countrySelect.value = countryCode;
                            
                            // Update display
                            const flagElement = countryContainer.querySelector('.country-flag');
                            const nameElement = countryContainer.querySelector('.country-name');
                            const codeElement = countryContainer.querySelector('.country-code');
                            
                            if (flagElement) flagElement.textContent = flag;
                            if (nameElement) nameElement.textContent = countryName;
                            if (codeElement) codeElement.textContent = countryCode;
                            
                            // Update mobile input for detected country
                            updateMobileInputForCountry(countryCode);
                            
                            console.log(`✅ Auto-detected country: ${countryName} (${countryCode}) from IP`);
                            return; // Successfully detected, exit function
                        }
                    }
                }
            } catch (serviceError) {
                console.log(`Service ${serviceUrl} failed:`, serviceError);
                continue; // Try next service
            }
        }
        
        // If all services fail, set default
        throw new Error('All IP geolocation services failed');
        
    } catch (error) {
        console.log('Could not detect country automatically:', error);
        // Default to Bangladesh if detection fails
        setDefaultCountry();
    }
}

// Get calling code mapping for country ISO codes
function getCallingCodeMap() {
    return {
        'AF': '+93', 'AL': '+355', 'DZ': '+213', 'AS': '+1684', 'AD': '+376', 'AO': '+244', 'AI': '+1264', 'AG': '+1268',
        'AR': '+54', 'AM': '+374', 'AW': '+297', 'AU': '+61', 'AT': '+43', 'AZ': '+994', 'BS': '+1242', 'BH': '+973',
        'BD': '+880', 'BB': '+1246', 'BY': '+375', 'BE': '+32', 'BZ': '+501', 'BJ': '+229', 'BM': '+1441', 'BT': '+975',
        'BO': '+591', 'BA': '+387', 'BW': '+267', 'BR': '+55', 'BN': '+673', 'BG': '+359', 'BF': '+226', 'BI': '+257',
        'KH': '+855', 'CM': '+237', 'CA': '+1', 'CV': '+238', 'KY': '+1345', 'CF': '+236', 'TD': '+235', 'CL': '+56',
        'CN': '+86', 'CO': '+57', 'KM': '+269', 'CG': '+242', 'CD': '+243', 'CK': '+682', 'CR': '+506', 'CI': '+225',
        'HR': '+385', 'CU': '+53', 'CY': '+357', 'CZ': '+420', 'DK': '+45', 'DJ': '+253', 'DM': '+1767', 'DO': '+1809',
        'EC': '+593', 'EG': '+20', 'SV': '+503', 'GQ': '+240', 'ER': '+291', 'EE': '+372', 'ET': '+251', 'FJ': '+679',
        'FI': '+358', 'FR': '+33', 'GF': '+594', 'PF': '+689', 'GA': '+241', 'GM': '+220', 'GE': '+995', 'DE': '+49',
        'GH': '+233', 'GI': '+350', 'GR': '+30', 'GL': '+299', 'GD': '+1473', 'GP': '+590', 'GU': '+1671', 'GT': '+502',
        'GN': '+224', 'GW': '+245', 'GY': '+592', 'HT': '+509', 'HN': '+504', 'HK': '+852', 'HU': '+36', 'IS': '+354',
        'IN': '+91', 'ID': '+62', 'IR': '+98', 'IQ': '+964', 'IE': '+353', 'IL': '+972', 'IT': '+39', 'JM': '+1876',
        'JP': '+81', 'JO': '+962', 'KZ': '+7', 'KE': '+254', 'KI': '+686', 'KP': '+850', 'KR': '+82', 'KW': '+965',
        'KG': '+996', 'LA': '+856', 'LV': '+371', 'LB': '+961', 'LS': '+266', 'LR': '+231', 'LY': '+218', 'LI': '+423',
        'LT': '+370', 'LU': '+352', 'MO': '+853', 'MK': '+389', 'MG': '+261', 'MW': '+265', 'MY': '+60', 'MV': '+960',
        'ML': '+223', 'MT': '+356', 'MH': '+692', 'MQ': '+596', 'MR': '+222', 'MU': '+230', 'YT': '+262', 'MX': '+52',
        'FM': '+691', 'MD': '+373', 'MC': '+377', 'MN': '+976', 'ME': '+382', 'MS': '+1664', 'MA': '+212', 'MZ': '+258',
        'MM': '+95', 'NA': '+264', 'NR': '+674', 'NP': '+977', 'NL': '+31', 'NC': '+687', 'NZ': '+64', 'NI': '+505',
        'NE': '+227', 'NG': '+234', 'NU': '+683', 'NF': '+672', 'MP': '+1670', 'NO': '+47', 'OM': '+968', 'PK': '+92',
        'PW': '+680', 'PS': '+970', 'PA': '+507', 'PG': '+675', 'PY': '+595', 'PE': '+51', 'PH': '+63', 'PL': '+48',
        'PT': '+351', 'PR': '+1787', 'QA': '+974', 'RE': '+262', 'RO': '+40', 'RU': '+7', 'RW': '+250', 'BL': '+590',
        'SH': '+290', 'KN': '+1869', 'LC': '+1758', 'MF': '+590', 'PM': '+508', 'VC': '+1784', 'WS': '+685', 'SM': '+378',
        'ST': '+239', 'SA': '+966', 'SN': '+221', 'RS': '+381', 'SC': '+248', 'SL': '+232', 'SG': '+65', 'SX': '+1721',
        'SK': '+421', 'SI': '+386', 'SB': '+677', 'SO': '+252', 'ZA': '+27', 'ES': '+34', 'LK': '+94', 'SD': '+249',
        'SR': '+597', 'SZ': '+268', 'SE': '+46', 'CH': '+41', 'SY': '+963', 'TW': '+886', 'TJ': '+992', 'TZ': '+255',
        'TH': '+66', 'TL': '+670', 'TG': '+228', 'TK': '+690', 'TO': '+676', 'TT': '+1868', 'TN': '+216', 'TR': '+90',
        'TM': '+993', 'TC': '+1649', 'TV': '+688', 'UG': '+256', 'UA': '+380', 'AE': '+971', 'GB': '+44', 'US': '+1',
        'UY': '+598', 'UZ': '+998', 'VU': '+678', 'VA': '+379', 'VE': '+58', 'VN': '+84', 'VG': '+1284', 'VI': '+1340',
        'WF': '+681', 'EH': '+212', 'YE': '+967', 'ZM': '+260', 'ZW': '+263'
    };
}

// Get country flag emoji based on country code
function getCountryFlag(countryCode) {
    const flagMap = {
        'AF': '🇦🇫', 'AL': '🇦🇱', 'DZ': '🇩🇿', 'AS': '🇦🇸', 'AD': '🇦🇩', 'AO': '🇦🇴', 'AI': '🇦🇮', 'AG': '🇦🇬', 'AR': '🇦🇷', 'AM': '🇦🇲',
        'AW': '🇦🇼', 'AU': '🇦🇺', 'AT': '🇦🇹', 'AZ': '🇦🇿', 'BS': '🇧🇸', 'BH': '🇧🇭', 'BD': '🇧🇩', 'BB': '🇧🇧', 'BY': '🇧🇾', 'BE': '🇧🇪',
        'BZ': '🇧🇿', 'BJ': '🇧🇯', 'BM': '🇧🇲', 'BT': '🇧🇹', 'BO': '🇧🇴', 'BA': '🇧🇦', 'BW': '🇧🇼', 'BR': '🇧🇷', 'BN': '🇧🇳', 'BG': '🇧🇬',
        'BF': '🇧🇫', 'BI': '🇧🇮', 'KH': '🇰🇭', 'CM': '🇨🇲', 'CA': '🇨🇦', 'CV': '🇨🇻', 'KY': '🇰🇾', 'CF': '🇨🇫', 'TD': '🇹🇩', 'CL': '🇨🇱',
        'CN': '🇨🇳', 'CO': '🇨🇴', 'KM': '🇰🇲', 'CG': '🇨🇬', 'CD': '🇨🇩', 'CK': '🇨🇰', 'CR': '🇨🇷', 'CI': '🇨🇮', 'HR': '🇭🇷', 'CU': '🇨🇺',
        'CY': '🇨🇾', 'CZ': '🇨🇿', 'DK': '🇩🇰', 'DJ': '🇩🇯', 'DM': '🇩🇲', 'DO': '🇩🇴', 'EC': '🇪🇨', 'EG': '🇪🇬', 'SV': '🇸🇻', 'GQ': '🇬🇶',
        'ER': '🇪🇷', 'EE': '🇪🇪', 'ET': '🇪🇹', 'FJ': '🇫🇯', 'FI': '🇫🇮', 'FR': '🇫🇷', 'GF': '🇬🇫', 'PF': '🇵🇫', 'GA': '🇬🇦', 'GM': '🇬🇲',
        'GE': '🇬🇪', 'DE': '🇩🇪', 'GH': '🇬🇭', 'GI': '🇬🇮', 'GR': '🇬🇷', 'GL': '🇬🇱', 'GD': '🇬🇩', 'GP': '🇬🇵', 'GU': '🇬🇺', 'GT': '🇬🇹',
        'GN': '🇬🇳', 'GW': '🇬🇼', 'GY': '🇬🇾', 'HT': '🇭🇹', 'HN': '🇭🇳', 'HK': '🇭🇰', 'HU': '🇭🇺', 'IS': '🇮🇸', 'IN': '🇮🇳', 'ID': '🇮🇩',
        'IR': '🇮🇷', 'IQ': '🇮🇶', 'IE': '🇮🇪', 'IL': '🇮🇱', 'IT': '🇮🇹', 'JM': '🇯🇲', 'JP': '🇯🇵', 'JO': '🇯🇴', 'KZ': '🇰🇿', 'KE': '🇰🇪',
        'KI': '🇰🇮', 'KP': '🇰🇵', 'KR': '🇰🇷', 'KW': '🇰🇼', 'KG': '🇰🇬', 'LA': '🇱🇦', 'LV': '🇱🇻', 'LB': '🇱🇧', 'LS': '🇱🇸', 'LR': '🇱🇷',
        'LY': '🇱🇾', 'LI': '🇱🇮', 'LT': '🇱🇹', 'LU': '🇱🇺', 'MO': '🇲🇴', 'MK': '🇲🇰', 'MG': '🇲🇬', 'MW': '🇲🇼', 'MY': '🇲🇾', 'MV': '🇲🇻',
        'ML': '🇲🇱', 'MT': '🇲🇹', 'MH': '🇲🇭', 'MQ': '🇲🇶', 'MR': '🇲🇷', 'MU': '🇲🇺', 'YT': '🇾🇹', 'MX': '🇲🇽', 'FM': '🇫🇲', 'MD': '🇲🇩',
        'MC': '🇲🇨', 'MN': '🇲🇳', 'ME': '🇲🇪', 'MS': '🇲🇸', 'MA': '🇲🇦', 'MZ': '🇲🇿', 'MM': '🇲🇲', 'NA': '🇳🇦', 'NR': '🇳🇷', 'NP': '🇳🇵',
        'NL': '🇳🇱', 'NC': '🇳🇨', 'NZ': '🇳🇿', 'NI': '🇳🇮', 'NE': '🇳🇪', 'NG': '🇳🇬', 'NU': '🇳🇺', 'NF': '🇳🇫', 'MP': '🇲🇵', 'NO': '🇳🇴',
        'OM': '🇴🇲', 'PK': '🇵🇰', 'PW': '🇵🇼', 'PS': '🇵🇸', 'PA': '🇵🇦', 'PG': '🇵🇬', 'PY': '🇵🇾', 'PE': '🇵🇪', 'PH': '🇵🇭', 'PL': '🇵🇱',
        'PT': '🇵🇹', 'PR': '🇵🇷', 'QA': '🇶🇦', 'RE': '🇷🇪', 'RO': '🇷🇴', 'RU': '🇷🇺', 'RW': '🇷🇼', 'BL': '🇧🇱', 'SH': '🇸🇭', 'KN': '🇰🇳',
        'LC': '🇱🇨', 'MF': '🇲🇫', 'PM': '🇵🇲', 'VC': '🇻🇨', 'WS': '🇼🇸', 'SM': '🇸🇲', 'ST': '🇸🇹', 'SA': '🇸🇦', 'SN': '🇸🇳', 'RS': '🇷🇸',
        'SC': '🇸🇨', 'SL': '🇸🇱', 'SG': '🇸🇬', 'SX': '🇸🇽', 'SK': '🇸🇰', 'SI': '🇸🇮', 'SB': '🇸🇧', 'SO': '🇸🇴', 'ZA': '🇿🇦', 'ES': '🇪🇸',
        'LK': '🇱🇰', 'SD': '🇸🇩', 'SR': '🇸🇷', 'SZ': '🇸🇿', 'SE': '🇸🇪', 'CH': '🇨🇭', 'SY': '🇸🇾', 'TW': '🇹🇼', 'TJ': '🇹🇯', 'TZ': '🇹🇿',
        'TH': '🇹🇭', 'TL': '🇹🇱', 'TG': '🇹🇬', 'TK': '🇹🇰', 'TO': '🇹🇴', 'TT': '🇹🇹', 'TN': '🇹🇳', 'TR': '🇹🇷', 'TM': '🇹🇲', 'TC': '🇹🇨',
        'TV': '🇹🇻', 'UG': '🇺🇬', 'UA': '🇺🇦', 'AE': '🇦🇪', 'GB': '🇬🇧', 'US': '🇺🇸', 'UY': '🇺🇾', 'UZ': '🇺🇿', 'VU': '🇻🇺', 'VA': '🇻🇦',
        'VE': '🇻🇪', 'VN': '🇻🇳', 'VG': '🇻🇬', 'VI': '🇻🇮', 'WF': '🇼🇫', 'EH': '🇪🇭', 'YE': '🇾🇪', 'ZM': '🇿🇲', 'ZW': '🇿🇼'
    };
    return flagMap[countryCode] || '🏳️';
}

// Set default country to Bangladesh
function setDefaultCountry() {
    const countrySelect = document.getElementById('countryCodeSelect');
    const countryContainer = document.querySelector('.country-code-container');
    
    if (countrySelect && countryContainer) {
        countrySelect.value = '+880';
        
        const flagElement = countryContainer.querySelector('.country-flag');
        const nameElement = countryContainer.querySelector('.country-name');
        const codeElement = countryContainer.querySelector('.country-code');
        
        if (flagElement) flagElement.textContent = '🇧🇩';
        if (nameElement) nameElement.textContent = 'Bangladesh';
        if (codeElement) codeElement.textContent = '+880';
    }
}

// Fix missing adjustTextareaHeight function
function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Country-specific mobile number configurations
const countryMobileConfigs = {
    '+880': { // Bangladesh
        name: 'Bangladesh',
        flag: '🇧🇩',
        digits: 11,
        minDigits: 11,
        maxDigits: 11,
        pattern: /^(01[3-9]\d{8})$/,
        placeholder: '01XXXXXXXXX',
        example: '01712345678',
        format: '01X-XXXX-XXXX'
    },
    '+1': { // United States/Canada
        name: 'United States',
        flag: '🇺🇸',
        digits: 10,
        minDigits: 10,
        maxDigits: 10,
        pattern: /^([2-9]\d{2}[2-9]\d{2}\d{4})$/,
        placeholder: 'XXXXXXXXXX',
        example: '2125551234',
        format: 'XXX-XXX-XXXX'
    },
    '+91': { // India
        name: 'India',
        flag: '🇮🇳',
        digits: 10,
        minDigits: 10,
        maxDigits: 10,
        pattern: /^([6-9]\d{9})$/,
        placeholder: 'XXXXXXXXXX',
        example: '9876543210',
        format: 'XXXXX-XXXXX'
    },
    '+86': { // China
        name: 'China',
        flag: '🇨🇳',
        digits: 11,
        minDigits: 11,
        maxDigits: 11,
        pattern: /^(1[3-9]\d{9})$/,
        placeholder: '1XXXXXXXXXX',
        example: '13812345678',
        format: 'XXX-XXXX-XXXX'
    },
    '+44': { // United Kingdom
        name: 'United Kingdom',
        flag: '🇬🇧',
        digits: 10,
        minDigits: 10,
        maxDigits: 11,
        pattern: /^([1-9]\d{8,9})$/,
        placeholder: 'XXXXXXXXXX',
        example: '7912345678',
        format: 'XXXX-XXX-XXX'
    },
    '+81': { // Japan
        name: 'Japan',
        flag: '🇯🇵',
        digits: 11,
        minDigits: 10,
        maxDigits: 11,
        pattern: /^([7-9]0\d{8,9})$/,
        placeholder: 'XXXXXXXXXXX',
        example: '09012345678',
        format: 'XXX-XXXX-XXXX'
    },
    '+49': { // Germany
        name: 'Germany',
        flag: '🇩🇪',
        digits: 11,
        minDigits: 10,
        maxDigits: 12,
        pattern: /^(1[5-7]\d{8,10})$/,
        placeholder: 'XXXXXXXXXXX',
        example: '15123456789',
        format: 'XXX-XXX-XXXXX'
    },
    '+33': { // France
        name: 'France',
        flag: '🇫🇷',
        digits: 9,
        minDigits: 9,
        maxDigits: 9,
        pattern: /^([6-7]\d{8})$/,
        placeholder: 'XXXXXXXXX',
        example: '612345678',
        format: 'XX-XX-XX-XX-XX'
    },
    '+92': { // Pakistan
        name: 'Pakistan',
        flag: '🇵🇰',
        digits: 10,
        minDigits: 10,
        maxDigits: 10,
        pattern: /^(3\d{9})$/,
        placeholder: '3XXXXXXXXX',
        example: '3001234567',
        format: 'XXX-XXX-XXXX'
    },
    '+966': { // Saudi Arabia
        name: 'Saudi Arabia',
        flag: '🇸🇦',
        digits: 9,
        minDigits: 9,
        maxDigits: 9,
        pattern: /^(5\d{8})$/,
        placeholder: '5XXXXXXXX',
        example: '501234567',
        format: 'XXX-XXX-XXX'
    },
    '+971': { // UAE
        name: 'United Arab Emirates',
        flag: '🇦🇪',
        digits: 9,
        minDigits: 9,
        maxDigits: 9,
        pattern: /^(5[0-6]\d{7})$/,
        placeholder: '5XXXXXXXX',
        example: '501234567',
        format: 'XXX-XXX-XXX'
    },
    '+60': { // Malaysia
        name: 'Malaysia',
        flag: '🇲🇾',
        digits: 9,
        minDigits: 9,
        maxDigits: 10,
        pattern: /^(1[0-9]\d{7,8})$/,
        placeholder: 'XXXXXXXXX',
        example: '123456789',
        format: 'XX-XXX-XXXX'
    },
    '+65': { // Singapore
        name: 'Singapore',
        flag: '🇸🇬',
        digits: 8,
        minDigits: 8,
        maxDigits: 8,
        pattern: /^([89]\d{7})$/,
        placeholder: 'XXXXXXXX',
        example: '91234567',
        format: 'XXXX-XXXX'
    },
    '+82': { // South Korea
        name: 'South Korea',
        flag: '🇰🇷',
        digits: 11,
        minDigits: 10,
        maxDigits: 11,
        pattern: /^(01[0-9]\d{7,8})$/,
        placeholder: '01XXXXXXXXX',
        example: '01012345678',
        format: 'XXX-XXXX-XXXX'
    },
    '+66': { // Thailand
        name: 'Thailand',
        flag: '🇹🇭',
        digits: 9,
        minDigits: 9,
        maxDigits: 9,
        pattern: /^([6-9]\d{8})$/,
        placeholder: 'XXXXXXXXX',
        example: '612345678',
        format: 'XX-XXX-XXXX'
    }
};

// Get country configuration
function getCountryConfig(countryCode) {
    return countryMobileConfigs[countryCode] || {
        name: 'Unknown',
        flag: '🌍',
        digits: 10,
        minDigits: 8,
        maxDigits: 15,
        pattern: /^\d{8,15}$/,
        placeholder: 'Enter phone number',
        example: '1234567890',
        format: 'Phone Number'
    };
}

// Update mobile input based on country selection
function updateMobileInputForCountry(countryCode) {
    const config = getCountryConfig(countryCode);
    const mobileInput = document.getElementById('editMobileNumber');
    const mobileInfo = document.getElementById('mobileInfo');
    
    if (mobileInput) {
        mobileInput.placeholder = config.placeholder;
        mobileInput.setAttribute('maxlength', config.maxDigits.toString());
        
        // Update info message
        if (mobileInfo) {
            const infoSpan = mobileInfo.querySelector('span');
            if (infoSpan) {
                infoSpan.textContent = `Enter ${config.digits} digit ${config.name} mobile number (Format: ${config.format})`;
            }
        }
        
        // Clear any existing input
        if (mobileInput.value) {
            validateMobileNumber(mobileInput.value, countryCode);
        }
    }
}

// Validate mobile number based on country
function validateMobileNumber(value, countryCode) {
    const config = getCountryConfig(countryCode);
    const mobileValidation = document.getElementById('mobileValidation');
    const mobileInput = document.getElementById('editMobileNumber');
    
    if (!mobileInput || !mobileValidation) return false;
    
    // Remove non-digits
    const cleanValue = value.replace(/\D/g, '');
    
    if (!cleanValue) {
        showValidationMessage(mobileValidation, 'Mobile number is required', 'error');
        mobileInput.parentElement.classList.add('error');
        return false;
    }
    
    if (cleanValue.length < config.minDigits) {
        showValidationMessage(mobileValidation, `${config.name} mobile number must be at least ${config.minDigits} digits`, 'error');
        mobileInput.parentElement.classList.add('error');
        return false;
    }
    
    if (cleanValue.length > config.maxDigits) {
        showValidationMessage(mobileValidation, `${config.name} mobile number cannot exceed ${config.maxDigits} digits`, 'error');
        mobileInput.parentElement.classList.add('error');
        return false;
    }
    
    if (cleanValue.length === config.digits && !config.pattern.test(cleanValue)) {
        showValidationMessage(mobileValidation, `Invalid ${config.name} mobile number format. Example: ${config.example}`, 'error');
        mobileInput.parentElement.classList.add('error');
        return false;
    }
    
    if (cleanValue.length === config.digits) {
        hideValidationMessage(mobileValidation);
        mobileInput.parentElement.classList.remove('error');
        mobileInput.parentElement.classList.add('valid');
        return true;
    }
    
    // Still typing, show intermediate validation
    showValidationMessage(mobileValidation, `Enter ${config.digits} digits for ${config.name}`, 'info');
    mobileInput.parentElement.classList.remove('error', 'valid');
    return false;
}

// Setup Profile Form Validation
function setupProfileFormValidation() {
    const form = document.querySelector('.profile-form');
    if (!form) return;
    
    // Auto detect user's country when form loads
    setTimeout(() => {
        detectUserCountry();
    }, 500); // Small delay to ensure DOM is ready

    // Real-time validation for full name
    const fullNameInput = document.getElementById('editFullName');
    const nameValidation = document.getElementById('nameValidation');
    
    if (fullNameInput && nameValidation) {
        fullNameInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value.length < 2) {
                showValidationMessage(nameValidation, 'Name must be at least 2 characters long', 'error');
                e.target.parentElement.classList.add('error');
            } else {
                hideValidationMessage(nameValidation);
                e.target.parentElement.classList.remove('error');
                e.target.parentElement.classList.add('valid');
            }
        });
    }

    // Country code selector functionality
    const countrySelect = document.getElementById('countryCodeSelect');
    const countryContainer = document.querySelector('.country-code-container');
    
    if (countrySelect && countryContainer) {
        // Update display when country changes
        countrySelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const flag = selectedOption.getAttribute('data-flag');
            const name = selectedOption.getAttribute('data-name');
            const code = e.target.value;
            
            console.log('Country manually changed:', { flag, name, code });
            
            // Mark as manually selected to prevent auto-detection override
            window.countryManuallySelected = true;
            
            // Update the display
            const flagElement = countryContainer.querySelector('.country-flag');
            const nameElement = countryContainer.querySelector('.country-name');
            const codeElement = countryContainer.querySelector('.country-code');
            
            if (flagElement) flagElement.textContent = flag;
            if (nameElement) nameElement.textContent = name;
            if (codeElement) codeElement.textContent = code;
            
            // Update mobile input for selected country
            updateMobileInputForCountry(code);
            
            // Clear existing mobile number when country changes
            const mobileInput = document.getElementById('editMobileNumber');
            if (mobileInput) {
                mobileInput.value = '';
                mobileInput.focus();
            }
        });
        
        // Initialize mobile input for default country
        const defaultCountryCode = countrySelect.value || '+880';
        updateMobileInputForCountry(defaultCountryCode);
        
        // Set initial display values
        const selectedOption = countrySelect.options[countrySelect.selectedIndex];
        if (selectedOption) {
            const flag = selectedOption.getAttribute('data-flag');
            const name = selectedOption.getAttribute('data-name');
            const code = countrySelect.value;
            
            const flagElement = countryContainer.querySelector('.country-flag');
            const nameElement = countryContainer.querySelector('.country-name');
            const codeElement = countryContainer.querySelector('.country-code');
            
            if (flagElement) flagElement.textContent = flag;
            if (nameElement) nameElement.textContent = name;
            if (codeElement) codeElement.textContent = code;
        }
    }

    // Enhanced mobile number validation with country-specific rules
    const mobileInput = document.getElementById('editMobileNumber');
    const mobileValidation = document.getElementById('mobileValidation');
    
    if (mobileInput && mobileValidation) {
        mobileInput.addEventListener('input', (e) => {
            // Allow only digits
            let value = e.target.value.replace(/\D/g, '');
            const countryCode = document.getElementById('countryCodeSelect').value || '+880';
            const config = getCountryConfig(countryCode);
            
            // Limit input length based on country
            if (value.length > config.maxDigits) {
                value = value.substring(0, config.maxDigits);
            }
            
            e.target.value = value;
            
            // Validate the number
            validateMobileNumber(value, countryCode);
        });
        
        mobileInput.addEventListener('blur', (e) => {
            const countryCode = document.getElementById('countryCodeSelect').value || '+880';
            validateMobileNumber(e.target.value, countryCode);
        });
    }

    // Gender validation
    const genderInputs = document.querySelectorAll('input[name="gender"]');
    const genderValidation = document.getElementById('genderValidation');
    
    genderInputs.forEach(input => {
        input.addEventListener('change', () => {
            hideValidationMessage(genderValidation);
        });
    });

    // Date of birth validation
    const dobInputs = [
        document.getElementById('editBirthDay'),
        document.getElementById('editBirthMonth'),
        document.getElementById('editBirthYear')
    ];
    const dobValidation = document.getElementById('dobValidation');
    
    dobInputs.forEach(input => {
        if (input) {
            input.addEventListener('change', () => {
                validateDateOfBirth();
            });
        }
    });

    function validateDateOfBirth() {
        const day = parseInt(document.getElementById('editBirthDay').value);
        const month = parseInt(document.getElementById('editBirthMonth').value);
        const year = parseInt(document.getElementById('editBirthYear').value);
        
        if (!day || !month || !year) {
            return; // Allow incomplete dates during input
        }
        
        const birthDate = new Date(year, month - 1, day);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (birthDate > today) {
            showValidationMessage(dobValidation, 'Birth date cannot be in the future', 'error');
        } else if (age < 13) {
            showValidationMessage(dobValidation, 'You must be at least 13 years old', 'error');
        } else if (age > 100) {
            showValidationMessage(dobValidation, 'Please enter a valid birth year', 'error');
        } else {
            hideValidationMessage(dobValidation);
        }
    }
}

// Setup Bio Character Counter
function setupBioCharacterCounter() {
    const bioTextarea = document.getElementById('editBio');
    const characterCounter = document.getElementById('bioCharacterCounter');
    
    if (bioTextarea && characterCounter) {
        function updateCounter() {
            const currentLength = bioTextarea.value.length;
            const maxLength = 500;
            
            characterCounter.textContent = `${currentLength}/${maxLength}`;
            
            if (currentLength > maxLength * 0.9) {
                characterCounter.classList.add('warning');
            } else {
                characterCounter.classList.remove('warning');
            }
            
            if (currentLength >= maxLength) {
                characterCounter.classList.add('error');
            } else {
                characterCounter.classList.remove('error');
            }
        }
        
        bioTextarea.addEventListener('input', updateCounter);
        updateCounter(); // Initial count
    }
}

// Validation Message Helper Functions
function showValidationMessage(element, message, type = 'error') {
    if (element) {
        element.querySelector('span').textContent = message;
        element.className = `validation-message ${type}`;
        element.style.display = 'block';
    }
}

function hideValidationMessage(element) {
    if (element) {
        element.style.display = 'none';
    }
}

// Enhanced Save Profile Function
async function saveProfile() {
    const saveBtn = document.getElementById('saveProfileBtn');
    if (!saveBtn || !currentUser) return;

    // Validate required fields
    const fullName = document.getElementById('editFullName').value.trim();
    const selectedGender = document.querySelector('input[name="gender"]:checked');
    const mobileNumber = document.getElementById('editMobileNumber').value.trim();
    const countryCode = document.getElementById('countryCodeSelect').value || '+880';
    
    let hasErrors = false;

    // Validate full name
    if (!fullName || fullName.length < 2) {
        showValidationMessage(document.getElementById('nameValidation'), 'Please enter your full name', 'error');
        hasErrors = true;
    }

    // Validate gender
    if (!selectedGender) {
        showValidationMessage(document.getElementById('genderValidation'), 'Please select your gender', 'error');
        hasErrors = true;
    }

    // Validate mobile number with country-specific rules
    if (mobileNumber && !validateMobileNumber(mobileNumber, countryCode)) {
        hasErrors = true;
    }

    if (hasErrors) {
        return;
    }

    // Show loading state
    saveBtn.classList.add('saving');
    saveBtn.textContent = 'Saving...';

    try {
        // Collect all form data
        const profileData = {
            name: fullName,
            username: document.getElementById('editUsername').value.trim(),
            bio: document.getElementById('editBio').value.trim(),
            gender: selectedGender.value,
            education: document.getElementById('editEducation').value,
            mobileNumber: mobileNumber,
            countryCode: countryCode,
            birthDay: document.getElementById('editBirthDay').value,
            birthMonth: document.getElementById('editBirthMonth').value,
            birthYear: document.getElementById('editBirthYear').value,
            lastUpdated: Date.now()
        };

        // Add profile picture if updated
        if (window.tempProfilePicture) {
            profileData.profilePicture = window.tempProfilePicture;
            // Clear temp data
            delete window.tempProfilePicture;
        }

        // Create date of birth string
        if (profileData.birthDay && profileData.birthMonth && profileData.birthYear) {
            profileData.dob = `${profileData.birthYear}-${profileData.birthMonth.padStart(2, '0')}-${profileData.birthDay.padStart(2, '0')}`;
        }

        // Update in Firebase
        await database.ref(`users/${currentUser.uid}`).update(profileData);

        // Update local user data
        Object.assign(currentUser, profileData);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Show success message
        const successFeedback = document.getElementById('profileSuccessFeedback');
        if (successFeedback) {
            successFeedback.classList.add('active');
            setTimeout(() => {
                successFeedback.classList.remove('active');
            }, 3000);
        }

        // Update other UI elements
        updateWelcomeMessage();
        updateHeaderProfilePicture();

    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile. Please try again.');
    } finally {
        saveBtn.classList.remove('saving');
        saveBtn.textContent = 'Save';
    }
}

// Hide Edit Profile Page function
function hideEditProfilePage() {
    showPage('homePage');
    updateCurrentPageTitle('Home');
}

// Setup Edit Profile Picture Upload
function setupEditProfilePictureUpload() {
    const profilePictureInput = document.getElementById('editProfilePictureInput');
    const editProfileImage = document.getElementById('editProfileImage');
    const editProfilePlaceholder = editProfileImage ? editProfileImage.nextElementSibling : null;

    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file only.');
                    return;
                }

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image size should be less than 5MB.');
                    return;
                }

                // Create FileReader to preview image
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageDataUrl = event.target.result;
                    
                    // Update preview
                    if (editProfileImage && editProfilePlaceholder) {
                        editProfileImage.src = imageDataUrl;
                        editProfileImage.style.display = 'block';
                        editProfilePlaceholder.style.display = 'none';
                    }

                    // Store image data for saving
                    window.tempProfilePicture = imageDataUrl;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Setup Social Media Toggles
function setupSocialMediaToggles() {
    const socialMediaPlatforms = [
        'tiktok', 'facebook', 'instagram', 'telegram', 
        'whatsapp', 'twitter', 'linkedin', 'discord', 'youtube'
    ];

    socialMediaPlatforms.forEach(platform => {
        const toggle = document.getElementById(`${platform}Toggle`);
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                handleSocialMediaToggle(platform, e.target.checked);
            });
        }
    });
}

// Handle Social Media Toggle
function handleSocialMediaToggle(platform, isEnabled) {
    if (!currentUser) return;

    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    
    if (isEnabled) {
        // Show input modal for social media link
        showSocialMediaInputModal(platform, platformName);
    } else {
        // Remove social media link
        removeSocialMediaLink(platform);
    }
}

// Show Social Media Input Modal
function showSocialMediaInputModal(platform, platformName) {
    // Get platform-specific placeholder
    const placeholders = {
        youtube: 'https://www.youtube.com/@username',
        tiktok: 'https://www.tiktok.com/@username',
        facebook: 'https://www.facebook.com/username',
        instagram: 'https://www.instagram.com/username',
        telegram: 'https://t.me/channelname',
        whatsapp: 'https://wa.me/1234567890',
        twitter: 'https://twitter.com/username or https://x.com/username',
        linkedin: 'https://www.linkedin.com/in/username',
        discord: 'https://discord.gg/servername'
    };

    const modal = document.createElement('div');
    modal.className = 'modal-overlay social-input-modal';
    modal.innerHTML = `
        <div class="modal-container social-input-container">
            <div class="modal-header">
                <h3><i class="fab fa-${platform}"></i> Add ${platformName} Profile</h3>
                <button class="modal-close" onclick="closeSocialInputModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="socialLink">${platformName} ${platform === 'youtube' ? 'Channel' : platform === 'telegram' ? 'Channel/Group' : 'Profile'} URL</label>
                    <input type="url" id="socialLink" class="form-input" 
                           placeholder="${placeholders[platform] || `https://${platform}.com/yourusername`}" required>
                    <div class="url-hint">
                        <i class="fas fa-info-circle"></i>
                        <span id="urlHint">Enter your ${platformName} ${platform === 'youtube' ? 'channel' : 'profile'} link only</span>
                    </div>
                </div>
                <div class="social-preview" id="socialPreview" style="display: none;">
                    <div class="preview-icon ${platform}-icon">
                        <i class="fab fa-${platform === 'twitter' ? 'x-twitter' : platform}"></i>
                    </div>
                    <div class="preview-text">
                        <div class="preview-platform">${platformName}</div>
                        <div class="preview-url" id="previewUrl"></div>
                    </div>
                </div>
                <div class="validation-error" id="validationError" style="display: none;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span id="errorMessage"></span>
                </div>
            </div>
            <div class="modal-actions">
                <button class="modal-btn confirm-btn" id="saveBtn" onclick="saveSocialMediaLink('${platform}')" disabled>
                    <i class="fas fa-save"></i>
                    Save Link
                </button>
                <button class="modal-btn cancel-btn" onclick="closeSocialInputModal()">
                    <i class="fas fa-times"></i>
                    Cancel
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 50);

    // Setup input validation
    const input = document.getElementById('socialLink');
    const preview = document.getElementById('socialPreview');
    const previewUrl = document.getElementById('previewUrl');
    const validationError = document.getElementById('validationError');
    const errorMessage = document.getElementById('errorMessage');
    const saveBtn = document.getElementById('saveBtn');

    input.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        
        // Reset states
        preview.style.display = 'none';
        validationError.style.display = 'none';
        saveBtn.disabled = true;
        
        if (url) {
            const validation = validateSocialMediaUrl(platform, url);
            
            if (validation.valid) {
                preview.style.display = 'flex';
                previewUrl.textContent = url;
                saveBtn.disabled = false;
                input.style.borderColor = '#10b981';
            } else {
                validationError.style.display = 'block';
                errorMessage.textContent = validation.message;
                input.style.borderColor = '#ef4444';
            }
        } else {
            input.style.borderColor = '';
        }
    });

    input.focus();
}

// Close Social Input Modal
function closeSocialInputModal() {
    const modal = document.querySelector('.social-input-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

// Save Social Media Link
async function saveSocialMediaLink(platform) {
    const input = document.getElementById('socialLink');
    const url = input.value.trim();

    if (!url) {
        showValidationError('Please enter a URL');
        return;
    }

    const validation = validateSocialMediaUrl(platform, url);
    if (!validation.valid) {
        showValidationError(validation.message);
        return;
    }

    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        // Save to Firebase
        if (currentUser && currentUser.uid) {
            await database.ref(`users/${currentUser.uid}/socialMedia/${platform}`).set({
                url: url,
                enabled: true,
                addedAt: Date.now()
            });

            // Update local user data
            if (!currentUser.socialMedia) currentUser.socialMedia = {};
            currentUser.socialMedia[platform] = {
                url: url,
                enabled: true,
                addedAt: Date.now()
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        closeSocialInputModal();
        showSuccessToast(`${platform.charAt(0).toUpperCase() + platform.slice(1)} profile added successfully!`);
    } catch (error) {
        console.error('Error saving social media link:', error);
        showValidationError('Failed to save social media link. Please try again.');
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Show validation error in modal
function showValidationError(message) {
    const validationError = document.getElementById('validationError');
    const errorMessage = document.getElementById('errorMessage');
    
    if (validationError && errorMessage) {
        errorMessage.textContent = message;
        validationError.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            if (validationError) {
                validationError.style.display = 'none';
            }
        }, 5000);
    }
}

// Remove Social Media Link
async function removeSocialMediaLink(platform) {
    try {
        if (currentUser && currentUser.uid) {
            await database.ref(`users/${currentUser.uid}/socialMedia/${platform}`).remove();

            // Update local user data
            if (currentUser.socialMedia && currentUser.socialMedia[platform]) {
                delete currentUser.socialMedia[platform];
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        }

        showSuccessToast(`${platform.charAt(0).toUpperCase() + platform.slice(1)} profile removed successfully!`);
    } catch (error) {
        console.error('Error removing social media link:', error);
        alert('Failed to remove social media link. Please try again.');
    }
}

// Enhanced URL validation for social media platforms
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Validate specific social media platform URLs
function validateSocialMediaUrl(platform, url) {
    if (!isValidUrl(url)) {
        return { valid: false, message: 'Please enter a valid URL' };
    }

    const patterns = {
        youtube: {
            patterns: [
                /^https?:\/\/(www\.)?youtube\.com\/@[\w\.-]+$/,
                /^https?:\/\/(www\.)?youtube\.com\/c\/[\w\.-]+$/,
                /^https?:\/\/(www\.)?youtube\.com\/channel\/[\w\.-]+$/,
                /^https?:\/\/(www\.)?youtube\.com\/user\/[\w\.-]+$/
            ],
            message: 'Please enter a valid YouTube channel URL (e.g., https://www.youtube.com/@username)'
        },
        tiktok: {
            patterns: [
                /^https?:\/\/(www\.)?tiktok\.com\/@[\w\.-]+$/
            ],
            message: 'Please enter a valid TikTok profile URL (e.g., https://www.tiktok.com/@username)'
        },
        facebook: {
            patterns: [
                /^https?:\/\/(www\.)?facebook\.com\/[\w\.-]+$/,
                /^https?:\/\/(www\.)?facebook\.com\/profile\.php\?id=\d+$/,
                /^https?:\/\/(www\.)?facebook\.com\/pages\/[\w\.-]+\/\d+$/
            ],
            message: 'Please enter a valid Facebook profile or page URL (e.g., https://www.facebook.com/username)'
        },
        instagram: {
            patterns: [
                /^https?:\/\/(www\.)?instagram\.com\/[\w\.-]+\/?$/
            ],
            message: 'Please enter a valid Instagram profile URL (e.g., https://www.instagram.com/username)'
        },
        telegram: {
            patterns: [
                /^https?:\/\/(www\.)?t\.me\/[\w\.-]+$/,
                /^https?:\/\/(www\.)?telegram\.me\/[\w\.-]+$/
            ],
            message: 'Please enter a valid Telegram channel/group URL (e.g., https://t.me/channelname)'
        },
        whatsapp: {
            patterns: [
                /^https?:\/\/(www\.)?wa\.me\/\d+$/,
                /^https?:\/\/(www\.)?whatsapp\.com\/channel\/[\w\.-]+$/,
                /^https?:\/\/(www\.)?chat\.whatsapp\.com\/[\w\.-]+$/
            ],
            message: 'Please enter a valid WhatsApp contact or group URL (e.g., https://wa.me/1234567890)'
        },
        twitter: {
            patterns: [
                /^https?:\/\/(www\.)?twitter\.com\/[\w\.-]+$/,
                /^https?:\/\/(www\.)?x\.com\/[\w\.-]+$/
            ],
            message: 'Please enter a valid X (Twitter) profile URL (e.g., https://twitter.com/username or https://x.com/username)'
        },
        linkedin: {
            patterns: [
                /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w\.-]+\/?$/,
                /^https?:\/\/(www\.)?linkedin\.com\/company\/[\w\.-]+\/?$/
            ],
            message: 'Please enter a valid LinkedIn profile or company URL (e.g., https://www.linkedin.com/in/username)'
        },
        discord: {
            patterns: [
                /^https?:\/\/(www\.)?discord\.gg\/[\w\.-]+$/,
                /^https?:\/\/(www\.)?discord\.com\/invite\/[\w\.-]+$/,
                /^https?:\/\/(www\.)?discord\.com\/users\/\d+$/
            ],
            message: 'Please enter a valid Discord server invite or profile URL (e.g., https://discord.gg/servername)'
        }
    };

    const platformValidation = patterns[platform];
    if (!platformValidation) {
        return { valid: true, message: '' }; // If no specific validation, allow any valid URL
    }

    const isValid = platformValidation.patterns.some(pattern => pattern.test(url));
    
    return {
        valid: isValid,
        message: isValid ? '' : platformValidation.message
    };
}

// Show Success Toast
function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        z-index: 10001;
        font-size: 0.9rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Load user's social media settings
function loadSocialMediaSettings() {
    if (!currentUser || !currentUser.socialMedia) return;

    const socialMediaPlatforms = [
        'tiktok', 'facebook', 'instagram', 'telegram', 
        'whatsapp', 'twitter', 'linkedin', 'discord', 'youtube'
    ];

    socialMediaPlatforms.forEach(platform => {
        const toggle = document.getElementById(`${platform}Toggle`);
        if (toggle && currentUser.socialMedia[platform]) {
            toggle.checked = currentUser.socialMedia[platform].enabled;
        }
    });
}

// Show Withdrawal History Page
function showWithdrawHistoryPage() {
    showPage('withdrawalHistoryPage');
    updateCurrentPageTitle('Withdrawal History');
    loadWithdrawalHistory();
    loadAdminPaymentMethodsForHistory();
}

// Show Withdrawal History Details Page
function showWithdrawalHistoryDetailsPage() {
    showPage('withdrawalHistoryDetailsPage');
    updateCurrentPageTitle('Withdrawal History');
    loadWithdrawalHistoryDetails();
}

// Load Withdrawal History Details
async function loadWithdrawalHistoryDetails() {
    const container = document.getElementById('withdrawalHistoryListContainer');
    
    if (!currentUser) {
        container.innerHTML = `
            <div class="no-history-found">
                <div class="no-history-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <h3>Login Required</h3>
                <p>Please login to view your withdrawal history</p>
            </div>
        `;
        return;
    }

    try {
        // Show loading state
        container.innerHTML = `
            <div class="loading-history">
                <div class="history-loading-spinner"></div>
                <p>Loading withdrawal history...</p>
            </div>
        `;

        // Load user's withdrawal requests from Firebase
        const withdrawalsSnapshot = await database.ref('withdrawal_requests')
            .orderByChild('userId')
            .equalTo(currentUser.uid)
            .once('value');

        const withdrawals = withdrawalsSnapshot.val() || {};
        const withdrawalArray = Object.keys(withdrawals).map(key => ({
            id: key,
            ...withdrawals[key]
        })).sort((a, b) => (b.requestDate || b.timestamp || 0) - (a.requestDate || a.timestamp || 0));

        if (withdrawalArray.length === 0) {
            container.innerHTML = `
                <div class="no-history-found">
                    <div class="no-history-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <h3>No Withdrawal History</h3>
                    <p>You haven't made any withdrawal requests yet.</p>
                </div>
            `;
            return;
        }

        // Display withdrawal history
        displayWithdrawalHistoryDetails(withdrawalArray);

    } catch (error) {
        console.error('Error loading withdrawal history:', error);
        container.innerHTML = `
            <div class="no-history-found">
                <div class="no-history-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading History</h3>
                <p>Failed to load withdrawal history. Please try again.</p>
            </div>
        `;
    }
}

// Display Withdrawal History Details
function displayWithdrawalHistoryDetails(withdrawals) {
    const container = document.getElementById('withdrawalHistoryListContainer');
    
    let historyHTML = '';
    
    withdrawals.forEach(withdrawal => {
        const requestDate = new Date(withdrawal.requestDate || withdrawal.timestamp || Date.now());
        const formattedDate = requestDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const statusClass = withdrawal.status || 'pending';
        const statusText = {
            'pending': 'Processing',
            'approved': 'Completed',
            'cancelled': 'Cancelled',
            'rejected': 'Rejected'
        }[statusClass] || 'Unknown';

        const statusIcon = {
            'pending': 'fas fa-clock',
            'approved': 'fas fa-check-circle',
            'cancelled': 'fas fa-times-circle',
            'rejected': 'fas fa-ban'
        }[statusClass] || 'fas fa-question-circle';

        const statusColor = {
            'pending': '#f59e0b',
            'approved': '#10b981',
            'cancelled': '#ef4444',
            'rejected': '#ef4444'
        }[statusClass] || '#6b7280';

        historyHTML += `
            <div class="withdrawal-history-detail-item" data-status="${statusClass}">
                <div class="history-item-header">
                    <div class="payment-method-section">
                        <div class="payment-method-logo">
                            <img src="${withdrawal.paymentMethodLogo || 'https://via.placeholder.com/40x40'}" 
                                 alt="${withdrawal.paymentMethod || 'Payment Method'}" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="payment-logo-placeholder" style="display: none;">
                                <i class="fas fa-wallet"></i>
                            </div>
                        </div>
                        <div class="payment-method-details">
                            <h4>${withdrawal.paymentMethod || withdrawal.currencyName || 'Unknown Method'}</h4>
                            <p class="payment-account">${withdrawal.walletNumber || withdrawal.accountNumber || 'Account Hidden'}</p>
                        </div>
                    </div>
                    <div class="amount-status-section">
                        <div class="withdrawal-amount-display">$${(withdrawal.amount || 0).toFixed(2)}</div>
                        <div class="status-badge status-${statusClass}">
                            <i class="${statusIcon}"></i>
                            ${statusText}
                        </div>
                    </div>
                </div>
                
                <div class="history-item-details">
                    <div class="detail-row">
                        <span class="detail-label">Request Date:</span>
                        <span class="detail-value">${formattedDate}</span>
                    </div>
                    ${withdrawal.email ? `
                        <div class="detail-row">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${withdrawal.email}</span>
                        </div>
                    ` : ''}
                    ${withdrawal.accountHolderName ? `
                        <div class="detail-row">
                            <span class="detail-label">Account Name:</span>
                            <span class="detail-value">${withdrawal.accountHolderName}</span>
                        </div>
                    ` : ''}
                    ${withdrawal.adminNotes ? `
                        <div class="detail-row admin-notes">
                            <span class="detail-label">Admin Notes:</span>
                            <span class="detail-value">${withdrawal.adminNotes}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = historyHTML;
}

// Filter History Function
function filterHistory(status) {
    // Update active tab
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Filter history items
    const historyItems = document.querySelectorAll('.withdrawal-history-detail-item');
    
    historyItems.forEach(item => {
        if (status === 'all') {
            item.style.display = 'block';
        } else {
            const itemStatus = item.dataset.status;
            item.style.display = itemStatus === status ? 'block' : 'none';
        }
    });
}

// Load Admin Payment Methods for Android-Style Withdrawal History by Categories
async function loadAdminPaymentMethodsForHistory() {
    try {
        // Load payment methods from Firebase (admin added)
        const methodsSnapshot = await database.ref('paymentMethods')
            .orderByChild('isActive')
            .equalTo(true)
            .once('value');

        const methods = methodsSnapshot.val() || {};
        const methodsArray = Object.keys(methods).map(key => ({
            id: key,
            ...methods[key]
        }));

        // Load color settings from admin panel
        const colorSnapshot = await database.ref('withdrawal_history_colors').once('value');
        const colorSettings = colorSnapshot.val() || {};

        // Define category containers
        const categoryContainers = {
            'recommended': document.getElementById('recommendedMethodsGrid'),
            'payment-cards': document.getElementById('paymentCardsGrid'),
            'payment-systems': document.getElementById('paymentSystemsGrid'),
            'e-wallets': document.getElementById('eWalletsGrid'),
            'bank-transfer': document.getElementById('bankTransferGrid'),
            'internet-banking': document.getElementById('internetBankingGrid'),
            'cryptocurrency': document.getElementById('cryptocurrencyGrid')
        };

        // Initialize all categories as empty
        Object.keys(categoryContainers).forEach(category => {
            const container = categoryContainers[category];
            if (container) {
                container.innerHTML = `
                    <div class="category-empty-state">
                        <i class="fas fa-info-circle"></i>
                        No methods available in this category
                    </div>
                `;
            }
        });

        if (methodsArray.length === 0) {
            return;
        }

        // Group methods by category
        const categorizedMethods = {
            'recommended': [],
            'payment-cards': [],
            'payment-systems': [],
            'e-wallets': [],
            'bank-transfer': [],
            'internet-banking': [],
            'cryptocurrency': []
        };

        // Categorize each method based on admin selection
        methodsArray.forEach(method => {
            const category = method.category || 'recommended';
            if (categorizedMethods[category]) {
                categorizedMethods[category].push(method);
            } else {
                // If category doesn't exist, add to recommended
                categorizedMethods['recommended'].push(method);
            }
        });

        // Display methods in each category
        Object.keys(categorizedMethods).forEach(category => {
            const container = categoryContainers[category];
            const methods = categorizedMethods[category];

            if (container && methods.length > 0) {
                const methodsHTML = methods.map(method => {
                    const methodClass = method.currencyName.toLowerCase().replace(/\s+/g, '-');
                    
                    // Get color from admin settings or method settings
                    const colorKey = method.currencyName.toLowerCase();
                    const adminSetColor = colorSettings[colorKey] ? colorSettings[colorKey].color : null;
                    const customColor = adminSetColor || method.nameColor || method.paymentNameColor || '#667eea';
                    
                    // Create enhanced design with color bar effect and click handler
                    return `
                        <div class="android-payment-card enhanced-payment-card" onclick="openWithdrawalModal('${method.id}')">
                            <div class="android-payment-logo">
                                <img src="${method.logoUrl || 'https://via.placeholder.com/60x60'}" alt="${method.currencyName}">
                            </div>
                            <div class="android-payment-name enhanced-payment-name ${methodClass}" 
                                 style="background: linear-gradient(135deg, ${customColor}, ${adjustColorBrightness(customColor, -20)}); color: white; position: relative; overflow: hidden;">
                                ${method.currencyName}
                                <div class="payment-color-bar" style="position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, transparent 10%, ${customColor} 50%, transparent 90%); box-shadow: 0 0 10px ${customColor}; animation: colorPulse 2s ease-in-out infinite;"></div>
                            </div>
                        </div>
                    `;
                }).join('');

                container.innerHTML = methodsHTML;
            }
        });

    } catch (error) {
        console.error('Error loading admin payment methods:', error);
        
        // Show error in all category containers
        const categoryContainers = [
            'recommendedMethodsGrid', 'paymentCardsGrid', 'paymentSystemsGrid',
            'eWalletsGrid', 'bankTransferGrid', 'internetBankingGrid', 'cryptocurrencyGrid'
        ];

        categoryContainers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="category-empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        Failed to load methods
                    </div>
                `;
            }
        });
    }
}

// Open withdrawal modal when payment method is clicked
async function openWithdrawalModal(methodId) {
    if (!currentUser) {
        alert('অনুগ্রহ করে লগইন করুন');
        return;
    }

    try {
        // Get payment method details
        const methodSnapshot = await database.ref(`paymentMethods/${methodId}`).once('value');
        const method = methodSnapshot.val();

        if (!method) {
            alert('পেমেন্ট মেথড পাওয়া যায়নি');
            return;
        }

        // Store selected method globally
        window.selectedWithdrawalMethod = method;
        window.selectedWithdrawalMethodId = methodId;

        // Show withdrawal modal
        showWithdrawalRequestModal(method);

    } catch (error) {
        console.error('Error opening withdrawal modal:', error);
        alert('পেমেন্ট মেথড লোড করতে সমস্যা হয়েছে');
    }
}

// Show withdrawal request modal (bKash style)
function showWithdrawalRequestModal(method) {
    const modal = document.getElementById('withdrawalRequestModal');
    if (!modal) {
        createWithdrawalRequestModal();
        return showWithdrawalRequestModal(method);
    }

    // Update modal content with method details
    document.getElementById('withdrawalMethodLogo').src = method.logoUrl || 'https://via.placeholder.com/60x60';
    document.getElementById('withdrawalMethodName').textContent = method.currencyName;
    document.getElementById('withdrawalMinAmount').textContent = method.minWithdrawal || 1;
    document.getElementById('withdrawalMaxAmount').textContent = method.maxWithdrawal || 10000;
    
    // Set input limits
    const amountInput = document.getElementById('withdrawalAmount');
    amountInput.min = method.minWithdrawal || 1;
    amountInput.max = method.maxWithdrawal || 10000;
    amountInput.value = method.minWithdrawal || 500;

    // Show user balance
    document.getElementById('userCurrentBalance').textContent = `$${(currentUser.balance || 0).toFixed(2)}`;

    // Set dynamic label from admin wallet label - use admin wallet label if available, otherwise empty
    const walletLabel = document.getElementById('walletNumberLabel');
    if (method.walletLabel && method.walletLabel.trim() !== '') {
        walletLabel.textContent = method.walletLabel;
    } else {
        walletLabel.textContent = '';
    }

    // Show/hide email field based on admin setting
    const emailFieldGroup = document.getElementById('emailFieldGroup');
    if (method.email && method.email.trim() !== '') {
        emailFieldGroup.style.display = 'block';
        document.getElementById('withdrawalEmail').placeholder = method.email;
        
        // Set dynamic email label from admin setting
        const emailLabelElement = emailFieldGroup.querySelector('label');
        if (method.emailLabel && method.emailLabel.trim() !== '') {
            emailLabelElement.textContent = method.emailLabel;
        } else {
            emailLabelElement.textContent = '';
        }
    } else {
        emailFieldGroup.style.display = 'none';
    }

    // Show/hide account name field based on admin setting
    const accountNameFieldGroup = document.getElementById('accountNameFieldGroup');
    if (method.accountName && method.accountName.trim() !== '') {
        accountNameFieldGroup.style.display = 'block';
        document.getElementById('accountNameLabel').textContent = method.accountName;
        document.getElementById('withdrawalAccountName').placeholder = method.accountName;
    } else {
        accountNameFieldGroup.style.display = 'none';
    }

    // Show modal
    modal.classList.add('active');
}

// Create withdrawal request modal dynamically
function createWithdrawalRequestModal() {
    const modalHTML = `
        <div id="withdrawalRequestModal" class="modal-overlay">
            <div class="withdrawal-modal-container">
                <div class="withdrawal-modal-header">
                    <div class="withdrawal-method-info">
                        <img id="withdrawalMethodLogo" src="" alt="Method Logo" class="withdrawal-method-logo">
                        <h3 id="withdrawalMethodName">Payment Method</h3>
                    </div>
                    <button class="modal-close" onclick="closeWithdrawalModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="withdrawal-modal-body">
                    <div class="withdrawal-balance-info">
                        <div class="balance-display">
                            <span class="balance-label">Current Balance:</span>
                            <span class="balance-amount" id="userCurrentBalance">$0.00</span>
                        </div>
                    </div>

                    <div class="withdrawal-form">
                        <div class="form-group">
                            <label>Amount (Min <span id="withdrawalMinAmount">500</span>.00 BDT / Max <span id="withdrawalMaxAmount">20000</span>.00 BDT):</label>
                            <input type="number" id="withdrawalAmount" class="withdrawal-input" value="500.00" step="0.01">
                        </div>

                        <div class="form-group">
                            <label id="walletNumberLabel"></label>
                            <input type="text" id="withdrawalWalletNumber" class="withdrawal-input" placeholder="">
                        </div>

                        <div class="form-group" id="emailFieldGroup" style="display: none;">
                            <label></label>
                            <input type="email" id="withdrawalEmail" class="withdrawal-input" placeholder="Enter your email address">
                        </div>

                        <div class="form-group" id="accountNameFieldGroup" style="display: none;">
                            <label id="accountNameLabel">Account Holder Name:</label>
                            <input type="text" id="withdrawalAccountName" class="withdrawal-input" placeholder="Enter account holder name">
                        </div>
                    </div>
                </div>

                <div class="withdrawal-modal-footer">
                    <button class="confirm-withdrawal-btn" onclick="confirmWithdrawalRequest()">
                        CONFIRM
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close withdrawal modal
function closeWithdrawalModal() {
    const modal = document.getElementById('withdrawalRequestModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Show error message function
function showWithdrawalError(inputId, message) {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) return;
    
    // Remove existing error message
    const existingError = inputElement.parentNode.querySelector('.withdrawal-error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create and add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'withdrawal-error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // Add error styling to input
    inputElement.style.borderColor = '#ef4444';
    inputElement.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
    
    // Insert error message after input
    inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);
    
    // Remove error styling when user starts typing
    inputElement.addEventListener('input', function() {
        this.style.borderColor = '';
        this.style.boxShadow = '';
        const errorMsg = this.parentNode.querySelector('.withdrawal-error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    }, { once: true });
}

// Clear all error messages
function clearWithdrawalErrors() {
    const errorMessages = document.querySelectorAll('.withdrawal-error-message');
    errorMessages.forEach(error => error.remove());
    
    const inputs = document.querySelectorAll('#withdrawalRequestModal .withdrawal-input');
    inputs.forEach(input => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    });
}

// Confirm withdrawal request
async function confirmWithdrawalRequest() {
    // Clear previous errors
    clearWithdrawalErrors();
    
    const amount = parseFloat(document.getElementById('withdrawalAmount').value);
    const walletNumber = document.getElementById('withdrawalWalletNumber').value.trim();
    const emailField = document.getElementById('withdrawalEmail');
    const email = emailField ? emailField.value.trim() : '';

    // Validate amount
    if (!amount || amount <= 0) {
        showWithdrawalError('withdrawalAmount', 'Please enter a valid amount');
        return;
    }

    // Validate wallet number (now email)
    if (!walletNumber) {
        showWithdrawalError('withdrawalWalletNumber', 'Please enter your wallet number');
        return;
    }

    // Check email if field is visible and required
    const emailFieldGroup = document.getElementById('emailFieldGroup');
    if (emailFieldGroup && emailFieldGroup.style.display !== 'none' && !email) {
        showWithdrawalError('withdrawalEmail', 'Please enter your email address');
        return;
    }

    // Check account name if field is visible and required
    const accountNameField = document.getElementById('withdrawalAccountName');
    const accountName = accountNameField ? accountNameField.value.trim() : '';
    const accountNameFieldGroup = document.getElementById('accountNameFieldGroup');
    if (accountNameFieldGroup && accountNameFieldGroup.style.display !== 'none' && !accountName) {
        showWithdrawalError('withdrawalAccountName', 'Please enter account holder name');
        return;
    }

    const method = window.selectedWithdrawalMethod;
    if (!method) {
        showWithdrawalError('withdrawalAmount', 'পেমেন্ট মেথড সিলেক্ট করুন');
        return;
    }

    // Check if user has sufficient balance
    if (amount > (currentUser.balance || 0)) {
        showWithdrawalError('withdrawalAmount', `Insufficient balance. Your current balance: $${(currentUser.balance || 0).toFixed(2)}`);
        return;
    }

    // Check amount limits
    if (amount < (method.minWithdrawal || 1)) {
        showWithdrawalError('withdrawalAmount', `Minimum withdrawal amount: $${method.minWithdrawal || 1}`);
        return;
    }

    if (amount > (method.maxWithdrawal || 10000)) {
        showWithdrawalError('withdrawalAmount', `Maximum withdrawal amount: $${method.maxWithdrawal || 10000}`);
        return;
    }

    const confirmBtn = document.querySelector('.confirm-withdrawal-btn');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = 'Processing...';
    confirmBtn.disabled = true;

    try {
        // Generate short UID for admin display
        const shortUid = currentUser.uid ? currentUser.uid.replace(/[^0-9]/g, '') || currentUser.uid.substring(currentUser.uid.length - 6) : 'N/A';

        // Create comprehensive withdrawal request for admin panel
        const withdrawalData = {
            userId: currentUser.uid,
            userUid: currentUser.uid,
            userName: currentUser.name || currentUser.username || 'Unknown User',
            userEmail: currentUser.email || 'No email',
            shortUid: shortUid,
            paymentMethodId: window.selectedWithdrawalMethodId,
            paymentMethodTitle: method.title || method.currencyName,
            currencyName: method.currencyName,
            paymentMethod: method.currencyName,
            paymentMethodLogo: method.logoUrl,
            description: method.description || '',
            amount: amount,
            paymentDetails: {
                accountNumber: walletNumber,
                walletNumber: walletNumber,
                email: email || null,
                accountName: accountName || null
            },
            walletNumber: walletNumber,
            withdrawalEmail: email || null,
            accountHolderName: accountName || null,
            status: 'pending',
            requestDate: Date.now(),
            timestamp: Date.now(),
            createdAt: Date.now(),
            adminNotes: null,
            processedAt: null,
            processedBy: null
        };

        // Save to Firebase withdrawals collection for admin panel
        await database.ref('withdrawals').push(withdrawalData);

        // Also save to withdrawal_requests for backward compatibility
        await database.ref('withdrawal_requests').push(withdrawalData);

        // Deduct amount from user balance temporarily (will be restored if rejected)
        const newBalance = (currentUser.balance || 0) - amount;
        await database.ref(`users/${currentUser.uid}/balance`).set(newBalance);
        
        // Update local user balance
        currentUser.balance = newBalance;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserBalance();

        // Close modal
        closeWithdrawalModal();

        // Show success message
        showWithdrawalSuccessModal(amount, method.currencyName);

        // History removed - no need to reload

        console.log('✅ Withdrawal request created successfully for admin panel:', {
            userId: currentUser.uid,
            userName: currentUser.name,
            amount: amount,
            currency: method.currencyName,
            status: 'pending'
        });

    } catch (error) {
        console.error('Error creating withdrawal request:', error);
        alert('উইথড্র রিকোয়েস্ট করতে সমস্যা হয়েছে');
    } finally {
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
    }
}

// Show withdrawal success modal with premium design and English text
function showWithdrawalSuccessModal(amount, currency) {
    const successModal = document.createElement('div');
    successModal.className = 'withdrawal-success-overlay';
    successModal.innerHTML = `
        <div class="withdrawal-success-container">
            <div class="success-header">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
            </div>
            <div class="success-content">
                <h2 class="success-title">Withdrawal Request Successful!</h2>
                <div class="success-amount">$${amount.toFixed(2)}</div>
                <p class="success-message">Your ${currency} withdrawal request has been successfully submitted.</p>
                <p class="success-submessage">Admin will review your request shortly and process the payment.</p>
            </div>
            <div class="success-actions">
                <button class="success-close-btn" onclick="closeSuccessModal()">
                    <i class="fas fa-check"></i>
                    Continue
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(successModal);

    // Add premium entrance animation delay
    setTimeout(() => {
        successModal.classList.add('active');
    }, 50);

    // Auto close after 6 seconds (increased for better UX)
    setTimeout(() => {
        closeSuccessModal();
    }, 6000);
}

// Close success modal
function closeSuccessModal() {
    const successModal = document.querySelector('.withdrawal-success-overlay');
    if (successModal) {
        successModal.remove();
    }
}

// Load Withdrawal History for Android Design
async function loadWithdrawalHistory() {
    const container = document.getElementById('androidHistoryList');
    
    if (!currentUser) {
        container.innerHTML = `
            <div class="android-no-history">
                <div class="android-no-history-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <h3>Login Required</h3>
                <p>Please login to view your withdrawal history</p>
            </div>
        `;
        return;
    }

    try {
        // Show loading state
        container.innerHTML = `
            <div class="android-loading">
                <div class="android-loading-spinner"></div>
                <p>Loading withdrawal history...</p>
            </div>
        `;

        // Load user's withdrawal requests from Firebase
        const withdrawalsSnapshot = await database.ref('withdrawal_requests')
            .orderByChild('userId')
            .equalTo(currentUser.uid)
            .once('value');

        const withdrawals = withdrawalsSnapshot.val() || {};
        const withdrawalArray = Object.keys(withdrawals).map(key => ({
            id: key,
            ...withdrawals[key]
        })).sort((a, b) => (b.requestDate || 0) - (a.requestDate || 0));

        if (withdrawalArray.length === 0) {
            container.innerHTML = '';
            return;
        }

        // Display withdrawal history in Android style
        let historyHTML = '';
        withdrawalArray.forEach(withdrawal => {
            const requestDate = new Date(withdrawal.requestDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            const statusClass = withdrawal.status || 'pending';
            const statusText = {
                'pending': 'Pending',
                'approved': 'Approved',
                'cancelled': 'Cancelled'
            }[statusClass] || 'Unknown';

            historyHTML += `
                <div class="android-history-item status-${statusClass}">
                    <div class="android-item-header">
                        <div class="android-payment-info">
                            <img src="${withdrawal.paymentMethodLogo || 'https://via.placeholder.com/36x36'}" alt="Payment Method" class="android-method-logo">
                            <div class="android-method-details">
                                <h4>${withdrawal.paymentMethod || 'Unknown Method'}</h4>
                                <p>${withdrawal.currency || 'USD'}</p>
                            </div>
                        </div>
                        <div class="android-amount-section">
                            <span class="android-amount">$${(withdrawal.amount || 0).toFixed(2)}</span>
                            <span class="android-status-badge status-${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    
                    <div class="android-item-details">
                        <div class="android-detail-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${requestDate}</span>
                        </div>
                        <div class="android-detail-item">
                            <i class="fas fa-envelope"></i>
                            <span>${withdrawal.email ? withdrawal.email.substring(0, 20) + '...' : 'No email'}</span>
                        </div>
                        <div class="android-detail-item">
                            <i class="fas fa-phone"></i>
                            <span>${withdrawal.phone || 'No phone'}</span>
                        </div>
                        <div class="android-detail-item">
                            <i class="fas fa-clock"></i>
                            <span>Processing</span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = historyHTML;

    } catch (error) {
        console.error('Error loading withdrawal history:', error);
        container.innerHTML = `
            <div class="android-no-history">
                <div class="android-no-history-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading History</h3>
                <p>Failed to load withdrawal history. Please try again.</p>
            </div>
        `;
    }
}

// Show Withdrawal Page
function showWithdrawPage() {
    showPage('withdrawalPage');
    updateCurrentPageTitle('Withdraw Money');
    loadUserBalance();
    setupBkashWithdrawalForm();
}

// Setup bKash Withdrawal Form
function setupBkashWithdrawalForm() {
    const form = document.getElementById('bkashWithdrawalForm');
    const amountInput = document.getElementById('withdrawalAmountInput');
    const walletInput = document.getElementById('walletNumberInput');
    const confirmBtn = document.getElementById('confirmWithdrawalBtn');

    // Load user balance
    if (currentUser) {
        const balanceElement = document.getElementById('withdrawalBalance');
        balanceElement.textContent = `$${(currentUser.balance || 0).toFixed(2)}`;
    }

    // Form validation
    function validateForm() {
        const amount = parseFloat(amountInput.value);
        const wallet = walletInput.value.trim();
        
        const isValid = amount >= 2 && amount <= 1000 && wallet.length >= 11;
        confirmBtn.disabled = !isValid;
        
        if (isValid) {
            confirmBtn.style.background = 'linear-gradient(135deg, #e91e63, #c2185b)';
        } else {
            confirmBtn.style.background = '#ccc';
        }
    }

    amountInput.addEventListener('input', validateForm);
    walletInput.addEventListener('input', validateForm);

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(amountInput.value);
        const walletNumber = walletInput.value.trim();

        if (!currentUser) {
            alert('প্রথমে লগইন করুন');
            return;
        }

        if (amount < 2 || amount > 1000) {
            alert('পরিমাণ ২.০০ থেকে ১০০০.০০ টাকার মধ্যে হতে হবে');
            return;
        }

        if (walletNumber.length < 11) {
            alert('সঠিক ওয়ালেট নাম্বার দিন');
            return;
        }

        if (amount > (currentUser.balance || 0)) {
            alert('আপনার ব্যালেন্স অপর্যাপ্ত');
            return;
        }

        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        confirmBtn.disabled = true;

        try {
            // Create withdrawal request
            const withdrawalData = {
                userId: currentUser.uid,
                userName: currentUser.name || currentUser.username,
                userEmail: currentUser.email,
                paymentMethod: 'bKash',
                currency: 'BDT',
                amount: amount,
                walletNumber: walletNumber,
                status: 'pending',
                requestDate: Date.now(),
                timestamp: Date.now()
            };

            // Save to Firebase
            await database.ref('withdrawal_requests').push(withdrawalData);

            // Deduct amount from user balance
            const newBalance = (currentUser.balance || 0) - amount;
            await database.ref(`users/${currentUser.uid}/balance`).set(newBalance);
            
            // Update local user balance
            currentUser.balance = newBalance;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            // Show success message
            showBkashWithdrawalSuccess(amount);

            // Reset form
            form.reset();
            validateForm();

        } catch (error) {
            console.error('Error creating withdrawal request:', error);
            alert('উইথড্র রিকোয়েস্ট করতে সমস্যা হয়েছে');
        } finally {
            confirmBtn.innerHTML = 'CONFIRM';
            confirmBtn.disabled = false;
        }
    });

    // Initial validation
    validateForm();
}

// Show bKash withdrawal success with English text
function showBkashWithdrawalSuccess(amount) {
    const successModal = document.createElement('div');
    successModal.className = 'bkash-success-overlay';
    successModal.innerHTML = `
        <div class="bkash-success-container">
            <div class="success-header">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h2>Withdrawal Request Successful!</h2>
            </div>
            <div class="success-body">
                <div class="success-amount">$${amount.toFixed(2)}</div>
                <p>Your bKash withdrawal request has been successfully submitted.</p>
                <p>Admin will review your request shortly and process the payment.</p>
            </div>
            <div class="success-actions">
                <button class="success-btn" onclick="closeBkashSuccess()">
                    <i class="fas fa-check"></i>
                    Continue
                </button>
            </div>
        </div>
    `;

    // Add success modal styles
    const style = document.createElement('style');
    style.textContent = `
        .bkash-success-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        }

        .bkash-success-container {
            background: white;
            border-radius: 20px;
            padding: 0;
            max-width: 350px;
            width: 90%;
            text-align: center;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .success-header {
            background: linear-gradient(135deg, #4caf50, #45a049);
            color: white;
            padding: 30px 20px;
        }

        .success-icon {
            font-size: 3rem;
            margin-bottom: 15px;
            animation: successPulse 1s ease;
        }

        .success-header h2 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 700;
        }

        .success-body {
            padding: 25px 20px;
        }

        .success-amount {
            font-size: 2rem;
            font-weight: 800;
            color: #4caf50;
            margin-bottom: 15px;
        }

        .success-body p {
            color: #666;
            font-size: 0.95rem;
            line-height: 1.5;
            margin-bottom: 10px;
        }

        .success-actions {
            padding: 0 20px 20px;
        }

        .success-btn {
            width: 100%;
            background: linear-gradient(135deg, #4caf50, #45a049);
            color: white;
            border: none;
            padding: 15px;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .success-btn:hover {
            background: linear-gradient(135deg, #45a049, #388e3c);
            transform: translateY(-2px);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes successPulse {
            0% { transform: scale(0.5); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(successModal);

    // Auto close after 5 seconds
    setTimeout(() => {
        closeBkashSuccess();
    }, 5000);
}

// Close bKash success modal
function closeBkashSuccess() {
    const successModal = document.querySelector('.bkash-success-overlay');
    if (successModal) {
        successModal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            successModal.remove();
        }, 300);
    }
}

// Load user balance for withdrawal page
function loadUserBalance() {
    const balanceElement = document.getElementById('withdrawalBalance');
    if (balanceElement && currentUser) {
        balanceElement.textContent = `$${(currentUser.balance || 0).toFixed(2)}`;
    }
}

// Load withdrawal methods
async function loadWithdrawalMethods() {
    const container = document.getElementById('paymentMethodsGrid');
    
    if (!container) return;

    try {
        // Show loading state
        container.innerHTML = `
            <div class="loading-methods">
                <div class="methods-loading-spinner"></div>
                <p>Loading payment methods...</p>
            </div>
        `;

        // Load withdrawal methods from Firebase
        const methodsSnapshot = await database.ref('withdrawal_methods')
            .orderByChild('isActive')
            .equalTo(true)
            .once('value');

        const methods = methodsSnapshot.val() || {};
        const methodsArray = Object.keys(methods).map(key => ({
            id: key,
            ...methods[key]
        }));

        if (methodsArray.length === 0) {
            container.innerHTML = `
                <div class="no-methods">
                    <div class="no-methods-icon">
                        <i class="fas fa-credit-card"></i>
                    </div>
                    <h3>No Payment Methods Available</h3>
                    <p>Please contact support for withdrawal options.</p>
                </div>
            `;
            return;
        }

        // Display payment methods
        const methodsHTML = methodsArray.map(method => `
            <div class="payment-method-card" onclick="selectWithdrawalMethod('${method.id}')">
                <div class="method-card-header">
                    <img src="${method.logoUrl || 'https://via.placeholder.com/60x60'}" alt="${method.currencyName}" class="method-logo">
                    <div class="method-info">
                        <h3>${method.currencyName}</h3>
                        <p>${method.title}</p>
                    </div>
                </div>
                <div class="method-card-body">
                    <p>${method.description}</p>
                    <div class="method-limits">
                        <span>Min: $${method.minWithdrawal}</span>
                        <span>Max: $${method.maxWithdrawal}</span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = methodsHTML;

    } catch (error) {
        console.error('Error loading withdrawal methods:', error);
        container.innerHTML = `
            <div class="no-methods">
                <div class="no-methods-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading Methods</h3>
                <p>Failed to load payment methods. Please try again.</p>
            </div>
        `;
    }
}

// Select withdrawal method
function selectWithdrawalMethod(methodId) {
    // Store selected method and navigate to details page
    localStorage.setItem('selectedWithdrawalMethodId', methodId);
    showPage('withdrawalDetailsPage');
    updateCurrentPageTitle('Withdrawal Details');
    loadSelectedMethodDetails(methodId);
}

// Load selected method details
async function loadSelectedMethodDetails(methodId) {
    try {
        const methodSnapshot = await database.ref(`withdrawal_methods/${methodId}`).once('value');
        const method = methodSnapshot.val();

        if (!method) {
            alert('Payment method not found');
            showWithdrawPage();
            return;
        }

        // Update selected method info
        const selectedMethodInfo = document.getElementById('selectedMethodInfo');
        if (selectedMethodInfo) {
            selectedMethodInfo.innerHTML = `
                <div class="selected-method-card">
                    <img src="${method.logoUrl}" alt="${method.currencyName}" class="selected-method-logo">
                    <div class="selected-method-details">
                        <h3>${method.currencyName}</h3>
                        <p>${method.title}</p>
                        <p>${method.description}</p>
                    </div>
                </div>
            `;
        }

        // Update amount limits
        const amountLimits = document.getElementById('amountLimits');
        if (amountLimits) {
            amountLimits.innerHTML = `
                <small>Minimum: $${method.minWithdrawal} - Maximum: $${method.maxWithdrawal}</small>
            `;
        }

        // Set min and max for amount input
        const amountInput = document.getElementById('withdrawAmount');
        if (amountInput) {
            amountInput.setAttribute('min', method.minWithdrawal);
            amountInput.setAttribute('max', method.maxWithdrawal);
        }

    } catch (error) {
        console.error('Error loading method details:', error);
        alert('Failed to load method details');
        showWithdrawPage();
    }
}

// Show live typing indicator
function showLiveTypingIndicator() {
    document.getElementById('liveTypingIndicator').style.display = 'flex';
    scrollToBottomLiveChat();
}

// Hide live typing indicator
function hideLiveTypingIndicator() {
    document.getElementById('liveTypingIndicator').style.display = 'none';
}

// Add message to live chat
function addLiveChatMessage(sender, message, isWelcome = false) {
    const messagesContainer = document.getElementById('liveChatMessages');
    const messageTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const isAdmin = sender === 'admin';
    const messageClass = isAdmin ? 'admin' : 'user';
    const avatarInitial = isAdmin ? 'A' : (currentUser ? currentUser.name.charAt(0).toUpperCase() : 'U');

    const messageHTML = `
        <div class="live-chat-message ${messageClass}">
            <div class="live-message-avatar">
                ${avatarInitial}
            </div>
            <div class="live-message-content">
                <div class="live-message-bubble">
                    ${message}
                </div>
                <div class="live-message-time">
                    <i class="fas fa-clock"></i>
                    ${messageTime}
                    ${!isAdmin ? '<i class="fas fa-check" style="color: #10b981; margin-left: 5px;"></i>' : ''}
                </div>
            </div>
        </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    scrollToBottomLiveChat();

    // Save message to Firebase if not welcome message
    if (!isWelcome && currentUser) {
        saveLiveChatMessage(sender, message);
    }
}

// Save live chat message to Firebase
async function saveLiveChatMessage(sender, message) {
    try {
        const messageData = {
            userId: currentUser.uid,
            userName: currentUser.name,
            userEmail: currentUser.email,
            userProfilePicture: currentUser.profilePicture || null,
            sender: sender,
            message: message,
            timestamp: Date.now(),
            read: false,
            delivered: true
        };

        // Save to admin_chats for admin panel access
        await database.ref(`admin_chats/${currentUser.uid}`).push(messageData);

        // Also save to bkash_chat_messages for compatibility
        await database.ref('bkash_chat_messages').push({
            userId: currentUser.uid,
            userName: currentUser.name,
            userEmail: currentUser.email,
            userProfilePicture: currentUser.profilePicture || null,
            sender: sender,
            message: message,
            timestamp: Date.now(),
            chatType: 'admin_chat',
            read: false
        });

        // Also save to admin notifications
        await database.ref('admin_notifications').push({
            type: 'live_chat_message',
            userId: currentUser.uid,
            userName: currentUser.name,
            userEmail: currentUser.email,
            userProfilePicture: currentUser.profilePicture || null,
            message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
            timestamp: Date.now(),
            read: false
        });
    } catch (error) {
        console.error('Error saving live chat message:', error);
    }
}

// Send live chat message
function sendLiveChatMessage() {
    const input = document.getElementById('liveChatMessageInput');
    const message = input.value.trim();

    if (!message || !currentUser) return;

    // Add user message
    addLiveChatMessage('user', message);

    // Clear input
    input.value = '';
    adjustLiveChatTextarea(input);

    // Show admin typing indicator
    setTimeout(() => {
        showLiveTypingIndicator();

        // Simulate admin response
        const responseTime = Math.random() * 2000 + 1500;
        setTimeout(() => {
            hideLiveTypingIndicator();
            const response = generateLiveChatResponse(message);
            addLiveChatMessage('admin', response);
        }, responseTime);
    }, 800);
}

// Generate automatic response for live chat
function generateLiveChatResponse(userMessage) {
    const responses = {
        'সাহায্য': 'আমি আপনাকে সাহায্য করতে এখানে আছি। আপনার কোন নির্দিষ্ট সমস্যা আছে?',
        'টাস্ক': 'টাস্ক সম্পর্কিত যেকোনো প্রশ্ন করুন। আমি সব টাস্কের বিস্তারিত তথ্য দিতে পারি।',
        'পেমেন্ট': 'পেমেন্ট সংক্রান্ত সমস্যার জন্য আমাদের একাউন্ট বিভাগে যোগাযোগ করুন। আমি এখনই প্রক্রিয়া শুরু করছি।',
        'সমস্যা': 'আপনার সমস্যাটি বিস্তারিত বলুন। আমি সমাধান দেওয়ার চেষ্টা করব।',
        'hello': 'Hello! How can I help you today?',
        'hi': 'Hi there! I\'m here to assist you with any questions.',
        'thanks': 'You\'re welcome! Is there anything else I can help you with?'
    };

    const lowerMessage = userMessage.toLowerCase();

    // Check for keywords in the message
    for (const keyword in responses) {
        if (lowerMessage.includes(keyword)) {
            return responses[keyword];
        }
    }

    return 'ধন্যবাদ আপনার মেসেজের জন্য। আমি আপনার প্রশ্নটি দেখছি এবং শীঘ্রই উত্তর দেব। কোনো জরুরি সমস্যা থাকলে আরো বিস্তারিত বলুন।';
}

// Handle Enter key for live chat
function handleLiveChatEnter(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendLiveChatMessage();
    }
}

// Auto-resize textarea for live chat
function adjustLiveChatTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Scroll to bottom of live chat
function scrollToBottomLiveChat() {
    const messagesArea = document.querySelector('.live-chat-messages-area');
    if (messagesArea) {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
}

// Send quick message
function sendQuickMessage(message) {
    const input = document.getElementById('liveChatMessageInput');
    input.value = message;
    sendLiveChatMessage();
}

// Update leaderboard user profile
function updateLeaderboardUserProfile() {
    if (!currentUser) return;

    const leaderboardUserImage = document.getElementById('leaderboardUserImage');
    const leaderboardUserPlaceholder = document.getElementById('leaderboardUserPlaceholder');
    const leaderboardUserName = document.getElementById('leaderboardUserName');

    // Update user name
    if (leaderboardUserName) {
        leaderboardUserName.textContent = currentUser.name || currentUser.username || 'User';
    }

    // Check if elements exist before updating
    if (!leaderboardUserImage || !leaderboardUserPlaceholder) {
        console.log('Leaderboard profile elements not found');
        return;
    }

    // Update profile picture with proper error handling
    if (currentUser.profilePicture && currentUser.profilePicture.trim() !== '') {
        console.log('Loading leaderboard profile picture:', currentUser.profilePicture);
        leaderboardUserImage.src = currentUser.profilePicture;
        leaderboardUserImage.style.display = 'block';
        leaderboardUserPlaceholder.style.display = 'none';

        leaderboardUserImage.onerror = function() {
            console.log('Failed to load leaderboard user profile picture');
            this.style.display = 'none';
            leaderboardUserPlaceholder.style.display = 'flex';
            leaderboardUserPlaceholder.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
        };

        leaderboardUserImage.onload = function() {
            console.log('Leaderboard profile picture loaded successfully');
            this.style.display = 'block';
            leaderboardUserPlaceholder.style.display = 'none';
        };
    } else {
        console.log('No profile picture found, showing placeholder');
        leaderboardUserImage.style.display = 'none';
        leaderboardUserPlaceholder.style.display = 'flex';
        leaderboardUserPlaceholder.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
    }
}

function showLeaderboard() {
    showPage('leaderboardPage');
    updateCurrentPageTitle('Leaderboard');

    // Update leaderboard user profile
    updateLeaderboardUserProfile();

    // Set current date in Bengali format
    const today = new Date();
    const bengaliDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    document.getElementById('leaderboardDate').textContent = bengaliDate;

    // Setup navigation
    setupLeaderboardNavigation();

    loadLeaderboard();
}

// Scroll to top function for leaderboard
function scrollToTopLeaderboard() {
    const leaderboardContainer = document.querySelector('.leaderboard-page-container');
    if (leaderboardContainer) {
        leaderboardContainer.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Also scroll the main window
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

    // Add visual feedback
    const scrollBtn = document.querySelector('.scroll-to-top-btn');
    if (scrollBtn) {
        scrollBtn.style.transform = 'translateY(-8px) scale(1.15)';
        setTimeout(() => {
            scrollBtn.style.transform = '';
        }, 300);
    }
}

// Setup leaderboard navigation
function setupLeaderboardNavigation() {
    const navButtons = document.querySelectorAll('#leaderboardPage .nav-button');

    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;

            // Remove active class from all buttons
            navButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            e.currentTarget.classList.add('active');

            // Handle navigation
            handleLeaderboardNavigation(tab);
        });
    });
}

function handleLeaderboardNavigation(tab) {
    switch(tab) {
        case 'home':
            showPage('homePage');
            updateCurrentPageTitle('Home');
            loadTasks();
            break;
        case 'post':
            showPage('marketplacePage');
            updateCurrentPageTitle('Marketplace');
            loadMarketplaceProducts();
            break;
        case 'chat':
            showChatInterface();
            break;
        case 'leaderboard':
            // Already on leaderboard, just refresh
            updateLeaderboardUserProfile();
            loadLeaderboard();
            break;
        case 'profile':
            showProfileMenu();
            break;
    }
}

// Load leaderboard data from Firebase
async function loadLeaderboard() {
    try {
        // Show loading state
        document.getElementById('rankingList').innerHTML = `
            <div class="loading-leaderboard">
                <div class="leaderboard-loading-spinner"></div>
                <p>Loading leaderboard...</p>
            </div>
        `;

        // Get all users from Firebase
        const usersSnapshot = await database.ref('users').once('value');
        const users = usersSnapshot.val() || {};

        // Convert to array and sort by balance (highest first)
        const usersArray = Object.keys(users).map(uid => ({
            uid: uid,
            ...users[uid]
        })).sort((a, b) => (b.balance || 0) - (a.balance || 0));

        if (usersArray.length === 0) {
            document.getElementById('rankingList').innerHTML = `
                <div class="empty-leaderboard">
                    <div class="empty-leaderboard-icon">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <h3>No Users Found</h3>
                    <p>Be the first to earn and claim your spot!</p>
                </div>
            `;
            return;
        }

        // Update podium (top 3)
        updatePodium(usersArray.slice(0, 3));

        // Update ranking list (starting from 4th position)
        updateRankingList(usersArray);

    } catch (error) {
        console.error('Error loading leaderboard:', error);
        document.getElementById('rankingList').innerHTML = `
            <div class="empty-leaderboard">
                <div class="empty-leaderboard-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading Leaderboard</h3>
                <p>Failed to load leaderboard data. Please try again.</p>
            </div>
        `;
    }
}

// Update podium for top 3 users
function updatePodium(topUsers) {
    const positions = ['position1', 'position2', 'position3'];

    positions.forEach((positionId, index) => {
        const positionElement = document.getElementById(positionId);
        const user = topUsers[index];

        if (user) {
            // Update avatar
            const image = positionElement.querySelector('.podium-image');
            const placeholder = positionElement.querySelector('.podium-placeholder');

            if (user.profilePicture && user.profilePicture.trim() !== '') {
                image.src = user.profilePicture;
                image.style.display = 'block';
                placeholder.style.display = 'none';

                image.onerror = function() {
                    this.style.display = 'none';
                    placeholder.style.display = 'flex';
                    placeholder.innerHTML = user.name ? user.name.charAt(0).toUpperCase() : 'U';
                };
            } else {
                image.style.display = 'none';
                placeholder.style.display = 'flex';
                placeholder.innerHTML = user.name ? user.name.charAt(0).toUpperCase() : 'U';
            }

            // Update name
            const nameElement = positionElement.querySelector('.podium-name');
            nameElement.textContent = user.name || user.username || 'Anonymous';

            // Update amount
            const amountElement = positionElement.querySelector('.amount-value');
            amountElement.textContent = (user.balance || 0).toLocaleString();

            // Show position
            positionElement.style.display = 'flex';
        } else {
            // Hide position if no user
            positionElement.style.display = 'none';
        }
    });
}

// Update ranking list starting from 4th position
function updateRankingList(usersArray) {
    const rankingList = document.getElementById('rankingList');

    if (usersArray.length <= 3) {
        rankingList.innerHTML = `
            <div class="empty-leaderboard" style="padding: 40px 20px;">
                <h3 style="font-size: 1.1rem; margin-bottom: 10px;">Top 3 Only</h3>
                <p style="font-size: 0.9rem;">Only top 3 users available for ranking.</p>
            </div>
        `;
        return;
    }

    let rankingHTML = '';

    // Start from 4th position (index 3)
    for (let i = 3; i < usersArray.length && i < 50; i++) {
        const user = usersArray[i];
        const rank = i + 1;

        rankingHTML += `
            <div class="ranking-item">
                <div class="rank-number">${rank}</div>
                <div class="user-info">
                    <div class="user-avatar">
                        ${user.profilePicture && user.profilePicture.trim() !== '' ? 
                            `<img src="${user.profilePicture}" alt="${user.name}" class="user-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div class="user-placeholder" style="display: none;">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>` :
                            `<div class="user-placeholder">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>`
                        }
                    </div>
                    <div class="user-details">
                        <h4 class="user-name">${user.name || user.username || 'Anonymous'}</h4>
                        <p class="user-subtitle">Real Tasker Member</p>
                    </div>
                </div>
                <div class="user-earnings">
                    <div class="earnings-icon">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <span>${(user.balance || 0).toLocaleString()}</span>
                </div>
            </div>
        `;
    }

    rankingList.innerHTML = rankingHTML;
}

function showNotifications() {
    openNotificationDrawer();
}

function showProfileMenu() {
    showUserProfileModal();
}

// Enhanced User Profile Modal
function showUserProfileModal() {
    if (!currentUser) return;

    // Update profile picture
    const profilePictureLarge = document.getElementById('profilePictureLarge');
    const profileImageLarge = document.getElementById('profileImageLarge');

    if (currentUser.profilePicture) {
        profileImageLarge.src = currentUser.profilePicture;
        profileImageLarge.style.display = 'block';
        profilePictureLarge.querySelector('.profile-placeholder-large').style.display = 'none';
    } else {
        profileImageLarge.style.display = 'none';
        profilePictureLarge.querySelector('.profile-placeholder-large').style.display = 'flex';
    }
    
    // Setup withdrawal button
    setupWithdrawalButton();

// Chat Modal Functions
function showChatModal() {
    // Redirect to chat page instead of showing modal
    showPage('chatPage');
    updateCurrentPageTitle('Chat');
    loadChatMessages();
}

function hideChatModal() {
    showPage('homePage');
    updateCurrentPageTitle('Home');
    loadTasks();
}

// Admin Chat Functions
function openAdminChat() {
    document.getElementById('adminChatModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Initialize admin chat
    initializeAdminChat();
    loadAdminMessages();

    // Setup auto-resize for textarea
    setupAdminChatAutoResize();
}

function closeAdminChat() {
    document.getElementById('adminChatModal').classList.remove('active');
    document.body.style.overflow = '';
}

function initializeAdminChat() {
    // Set up real-time listener for admin messages
    if (currentUser && currentUser.uid) {
        const adminChatRef = database.ref(`admin_chats/${currentUser.uid}`);

        // Listen for new messages
        adminChatRef.on('child_added', (snapshot) => {
            const message = snapshot.val();
            const messageId = snapshot.key;
            displayAdminMessage(message, messageId);
        });

        // Listen for message updates
        adminChatRef.on('child_changed', (snapshot) => {
            const message = snapshot.val();
            const messageId = snapshot.key;
            updateAdminMessage(message, messageId);
        });
    }
}

async function loadAdminMessages() {
    if (!currentUser || !currentUser.uid) return;

    const messagesContainer = document.getElementById('adminMessagesContainer');

    try {
        // Load existing messages
        const chatSnapshot = await database.ref(`admin_chats/${currentUser.uid}`)
            .orderByChild('timestamp')
            .limitToLast(50)
            .once('value');

        const messages = chatSnapshot.val() || {};

        // Clear container
        messagesContainer.innerHTML = '';

        // Display messages
        Object.keys(messages).forEach(messageId => {
            const message = messages[messageId];
            displayAdminMessage(message, messageId);
        });

        // Scroll to bottom
        scrollToBottom('adminChatMessages');

    } catch (error) {
        console.error('Error loading admin messages:', error);
        messagesContainer.innerHTML = `
            <div class="admin-error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load messages. Please try again.</p>
            </div>
        `;
    }
}

function displayAdminMessage(message, messageId) {
    const messagesContainer = document.getElementById('adminMessagesContainer');
    const messageTime = new Date(message.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const isUser = message.senderType === 'user';
    const messageClass = isUser ? 'user' : 'admin';

    const messageHTML = `
        <div class="admin-message ${messageClass}" id="admin-msg-${messageId}">
            <div class="admin-message-avatar">
                ${isUser ? currentUser.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div class="admin-message-content">
                <div class="admin-message-bubble">
                    ${message.content}
                    ${message.imageUrl ? `
                        <div class="admin-message-image">
                            <img src="${message.imageUrl}" alt="Message Image" style="max-width: 200px; border-radius: 12px; margin-top: 10px; cursor: pointer;" onclick="showImageModal('${message.imageUrl}')">
                        </div>
                    ` : ''}
                </div>
                <div class="admin-message-time">
                    <i class="fas fa-clock"></i>
                    ${messageTime}
                    ${isUser ? `
                        <div class="admin-message-status">
                            <i class="fas fa-check ${message.read ? 'message-read' : 'message-delivered'}"></i>
                            ${message.read ? 'Read' : 'Delivered'}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    scrollToBottom('adminChatMessages');
}

function updateAdminMessage(message, messageId) {
    const messageElement = document.getElementById(`admin-msg-${messageId}`);
    if (messageElement) {
        const statusElement = messageElement.querySelector('.admin-message-status');
        if (statusElement && message.read) {
            statusElement.innerHTML = `
                <i class="fas fa-check message-read"></i>
                Read
            `;
        }
    }
}

async function sendAdminMessage() {
    const input = document.getElementById('adminChatInput');
    const message = input.value.trim();

    if (!message || !currentUser) return;

    const sendBtn = document.querySelector('.admin-send-btn');
    const originalHTML = sendBtn.innerHTML;

    // Show loading state
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    sendBtn.disabled = true;

    try {
        const messageData = {
            userId: currentUser.uid,
            userName: currentUser.name,
            userEmail: currentUser.email,
            userProfilePicture: currentUser.profilePicture || null,
            senderType: 'user',
            content: message,
            timestamp: Date.now(),
            read: false,
            delivered: true
        };

        // Save message to admin chat
        await database.ref(`admin_chats/${currentUser.uid}`).push(messageData);

        // Also save to bkash_chat_messages for compatibility
        await database.ref('bkash_chat_messages').push({
            userId: currentUser.uid,
            userName: currentUser.name,
            userEmail: currentUser.email,
            userProfilePicture: currentUser.profilePicture || null,
            sender: 'user',
            message: message,
            timestamp: Date.now(),
            chatType: 'admin_chat',
            read: false
        });

        // Also save to admin notifications
        await database.ref('admin_notifications').push({
            type: 'new_user_message',
            userId: currentUser.uid,
            userName: currentUser.name,
            userEmail: currentUser.email,
            userProfilePicture: currentUser.profilePicture || null,
            message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
            timestamp: Date.now(),
            read: false
        });

        // Clear input
        input.value = '';
        adjustAdminTextareaHeight(input);

        // Show success feedback
        showAdminChatToast('Message sent to admin!', 'success');

        // Simulate admin typing response (for demo)
        setTimeout(() => {
            showAdminTyping();
            setTimeout(() => {
                hideAdminTyping();
                // This would normally come from admin, but for demo we'll simulate
                simulateAdminResponse(message);
            }, 2000);
        }, 1000);

    } catch (error) {
        console.error('Error sending admin message:', error);
        showAdminChatToast('Failed to send message. Please try again.', 'error');
    } finally {
        sendBtn.innerHTML = originalHTML;
        sendBtn.disabled = false;
    }
}

function simulateAdminResponse(userMessage) {
    // This is just for demo - in real implementation, admin would respond manually
    const responses = {
        'help': 'আমি আপনাকে সাহায্য করতে এখানে আছি। আপনার কোন নির্দিষ্ট সমস্যা আছে?',
        'task': 'টাস্ক সম্পর্কিত সমস্যার জন্য আমি আপনাকে দ্রুত সমাধান দিতে পারি।',
        'payment': 'পেমেন্ট বিষয়ে আমাদের একাউন্ট টিম খুব শীঘ্রই আপনার সাথে যোগাযোগ করবে।',
        'problem': 'আপনার সমস্যাটি আমি বুঝতে পেরেছি। এক্ষুনি সমাধানের ব্যবস্থা করছি।'
    };

    const lowerMessage = userMessage.toLowerCase();
    let response = 'আপনার মেসেজ পেয়েছি। আমি আপনার সমস্যা দেখে নিচ্ছি এবং খুব শীঘ্রই সমাধান দেব।';

    if (lowerMessage.includes('help') || lowerMessage.includes('সাহায্য')) {
        response = responses.help;
    } else if (lowerMessage.includes('task') || lowerMessage.includes('টাস্ক')) {
        response = responses.task;
    } else if (lowerMessage.includes('payment') || lowerMessage.includes('পেমেন্ট') || lowerMessage.includes('টাকা')) {
        response = responses.payment;
    } else if (lowerMessage.includes('problem') || lowerMessage.includes('সমস্যা')) {
        response = responses.problem;
    }

    // Simulate admin response
    const adminMessageData = {
        userId: currentUser.uid,
        senderType: 'admin',
        senderName: 'Admin',
        content: response,
        timestamp: Date.now(),
        read: false,
        delivered: true
    };

    // Add to admin chat
    database.ref(`admin_chats/${currentUser.uid}`).push(adminMessageData);
}

function showAdminTyping() {
    document.getElementById('adminTyping').style.display = 'flex';
    scrollToBottom('adminChatMessages');
}

function hideAdminTyping() {
    document.getElementById('adminTyping').style.display = 'none';
}

function setupAdminChatAutoResize() {
    const textarea = document.getElementById('adminChatInput');
    if (textarea) {
        textarea.addEventListener('input', (e) => {
            adjustAdminTextareaHeight(e.target);
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAdminMessage();
            }
        });
    }
}

function adjustAdminTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
}

function selectAdminImage() {
    document.getElementById('adminChatImageInput').click();
}

async function sendAdminImageMessage(file) {
    if (!file || !currentUser) return;

    try {
        const imageDataUrl = await convertImageToDataUrl(file);

        const messageData = {
            userId: currentUser.uid,
            userName: currentUser.name,
            userEmail: currentUser.email,
            senderType: 'user',
            content: 'Sent an image',
            imageUrl: imageDataUrl,
            timestamp: Date.now(),
            read: false,
            delivered: true
        };

        await database.ref(`admin_chats/${currentUser.uid}`).push(messageData);
        showAdminChatToast('Image sent to admin!', 'success');

    } catch (error) {
        console.error('Error sending admin image:', error);
        showAdminChatToast('Failed to send image. Please try again.', 'error');
    }
}

function showAdminChatToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `admin-chat-toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        font-size: 0.9rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Setup admin chat image upload
document.addEventListener('DOMContentLoaded', () => {
    const adminChatImageInput = document.getElementById('adminChatImageInput');
    if (adminChatImageInput) {
        adminChatImageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await sendAdminImageMessage(file);
            }
        });
    }
});

// Premium Chat Functions
let selectedImageFile = null;
let currentChatMessages = [];

// Initialize Premium Chat
function initializePremiumChat() {
    loadChatMessages();
    setupMessageInput();
    displayUserProfileInChat();

    // Show welcome message after delay
    setTimeout(() => {
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            addChatMessage('admin', 'আসসালামু আলাইকুম! আমি Real Tasker Admin Support টিম থেকে। আপনাকে কিভাবে সাহায্য করতে পারি?');
        }, 2000);
    }, 1000);
}

// Display user profile picture in chat
function displayUserProfileInChat() {
    if (!currentUser) return;

    const userAvatarElements = document.querySelectorAll('.user-avatar-img');
    const avatarPlaceholders = document.querySelectorAll('.avatar-placeholder');

    if (currentUser.profilePicture) {
        userAvatarElements.forEach(img => {
            img.src = currentUser.profilePicture;
            img.style.display = 'block';
        });
        avatarPlaceholders.forEach(placeholder => {
            placeholder.style.display = 'none';
        });
    } else {
        userAvatarElements.forEach(img => {
            img.style.display = 'none';
        });
        avatarPlaceholders.forEach(placeholder => {
            placeholder.style.display = 'flex';
            placeholder.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
        });
    }
}

// Setup message input
function setupMessageInput() {
    const textarea = document.getElementById('messageTextarea');
    const sendBtn = document.getElementById('premiumSendBtn');
    const charCount = document.getElementById('charCount');

    if (!textarea) return;

    textarea.addEventListener('input', (e) => {
        const text = e.target.value;
        const length = text.length;

        // Update character counter
        charCount.textContent = length;
        charCount.style.color = length > 1800 ? '#f44336' : '#666';

        // Enable/disable send button
        const hasText = text.trim().length > 0;
        const hasImage = selectedImageFile !== null;
        sendBtn.disabled = !(hasText || hasImage);

        // Auto-resize textarea
        adjustTextareaHeight(e.target);
    });

    textarea.addEventListener('keydown', handleMessageKeydown);
}

// Handle message keydown events
function handleMessageKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendPremiumMessage();
    }
}

// Handle message input changes
function handleMessageInput(textarea) {
    adjustTextareaHeight(textarea);

    const text = textarea.value;
    const length = text.length;
    const charCount = document.getElementById('charCount');
    const sendBtn = document.getElementById('premiumSendBtn');

    // Update character counter
    charCount.textContent = length;
    charCount.style.color = length > 1800 ? '#f44336' : '#666';

    // Enable/disable send button
    const hasText = text.trim().length > 0;
    const hasImage = selectedImageFile !== null;
    sendBtn.disabled = !(hasText || hasImage);
}

// Handle message paste events
function handleMessagePaste(event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;

    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            handleImageFile(file);
            break;
        }
    }
}

// Auto-resize textarea
function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Select image from gallery
function selectImageFromGallery() {
    document.getElementById('galleryInput').click();
}

// Handle gallery upload
function handleGalleryUpload(event) {
    const file = event.target.files[0];
    if (file) {
        handleImageFile(file);
    }
}

// Handle camera upload
function handleCameraUpload(event) {
    const file = event.target.files[0];
    if (file) {
        handleImageFile(file);
    }
}

// Handle image file processing
async function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        showChatToast('অনুগ্রহ করে একটি valid image file select করুন', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showChatToast('Image size 10MB এর কম হতে হবে', 'error');
        return;
    }

    try {
        // Process and compress image
        const processedImage = await processImageForChat(file);

        // Show image preview
        showImagePreview(selectedImageFile);

        // Enable send button
        document.getElementById('premiumSendBtn').disabled = false;

        showChatToast('Image uploaded successfully!', 'success');

    } catch (error) {
        console.error('Error processing image:', error);
        showChatToast('Image upload failed. Please try again.', 'error');
    }
}

// Process image for chat
function processImageForChat(file) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Resize for optimization
            const maxWidth = 800;
            const maxHeight = 600;

            let { width, height } = img;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve({ dataUrl });
        };

        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

// Show image preview
function showImagePreview(imageData) {
    const previewArea = document.getElementById('imagePreviewArea');
    const previewImage = document.getElementById('previewImage');
    const imageName = document.getElementById('imageName');
    const imageSize = document.getElementById('imageSize');

    previewImage.src = imageData.dataUrl;
    imageName.textContent = imageData.fileName;
    imageSize.textContent = formatFileSize(imageData.size);

    previewArea.style.display = 'block';
    previewArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Remove image preview
function removeImagePreview() {
    selectedImageFile = null;
    document.getElementById('imagePreviewArea').style.display = 'none';

    // Reset file inputs
    document.getElementById('galleryInput').value = '';
    document.getElementById('cameraInput').value = '';

    // Update send button state
    const textarea = document.getElementById('messageTextarea');
    const hasText = textarea.value.trim().length > 0;
    document.getElementById('premiumSendBtn').disabled = !hasText;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Send premium message
async function sendPremiumMessage() {
    const textarea = document.getElementById('messageTextarea');
    const message = textarea.value.trim();
    const sendBtn = document.getElementById('premiumSendBtn');

    if (!message && !selectedImageFile) return;
    if (!currentUser) {
        showChatToast('প্রথমে লগইন করুন', 'error');
        return;
    }

    // Show loading state
    const btnContent = sendBtn.querySelector('.send-btn-content');
    const btnLoading = sendBtn.querySelector('.send-btn-loading');

    btnContent.style.display = 'none';
    btnLoading.style.display = 'flex';
    sendBtn.disabled = true;

    try {
        const messageData = {
            userId: currentUser.uid,
            userName: currentUser.name,
            userEmail: currentUser.email,
            userProfilePicture: currentUser.profilePicture || null,
            senderType: 'user',
            content: message || 'Sent an image',
            imageUrl: selectedImageFile ? selectedImageFile.dataUrl : null,
            timestamp: Date.now(),
            read: false,
            delivered: true
        };

        // Save to Firebase
        await database.ref('premium_chat_messages').push(messageData);

        // Add to UI
        addChatMessage('user', message, selectedImageFile ? selectedImageFile.dataUrl : null);

        // Clear inputs
        textarea.value = '';
        adjustTextareaHeight(textarea);
        removeImagePreview();
        document.getElementById('charCount').textContent = '0';

        // Simulate admin response
        setTimeout(() => {
            showTypingIndicator();
            setTimeout(() => {
                hideTypingIndicator();
                const response = generateAdminResponse(message);
                addChatMessage('admin', response);
            }, Math.random() * 2000 + 1000);
        }, 500);

        showChatToast('Message sent successfully!', 'success');

    } catch (error) {
        console.error('Error sending message:', error);
        showChatToast('Failed to send message. Please try again.', 'error');
    } finally {
        btnContent.style.display = 'flex';
        btnLoading.style.display = 'none';
        sendBtn.disabled = false;
    }
}

// Add chat message to UI
function addChatMessage(sender, message, imageUrl = null) {
    const messagesArea = document.getElementById('chatMessagesArea');
    const messageTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const isUser = sender === 'user';
    const messageClass = isUser ? 'user' : 'admin';

    let avatarHtml = '';
    if (isUser) {
        if (currentUser && currentUser.profilePicture) {
            avatarHtml = `
                <div class="user-avatar-ring">
                    <img src="${currentUser.profilePicture}" alt="User" class="user-avatar-img">
                </div>
            `;
        } else {
            avatarHtml = `
                <div class="user-avatar-ring">
                    <div class="avatar-placeholder">${currentUser ? currentUser.name.charAt(0).toUpperCase() : 'U'}</div>
                </div>
            `;
        }
    } else {
        avatarHtml = `
            <div class="user-avatar-ring">
                <div class="avatar-placeholder">A</div>
            </div>
        `;
    }

    const messageHTML = `
        <div class="chat-message ${messageClass}">
            <div class="message-avatar">
                ${avatarHtml}
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    ${message}
                    ${imageUrl ? `
                        <div class="message-image">
                            <img src="${imageUrl}" alt="Shared image" onclick="showFullImage('${imageUrl}')">
                        </div>
                    ` : ''}
                </div>
                <div class="message-time">
                    <i class="fas fa-clock"></i>
                    ${messageTime}
                    ${isUser ? '<i class="fas fa-check" style="color: #10b981; margin-left: 5px;"></i>' : ''}
                </div>
            </div>
        </div>
    `;

    messagesArea.insertAdjacentHTML('beforeend', messageHTML);
    scrollToBottom();

    currentChatMessages.push({
        sender,
        message,
        imageUrl,
        timestamp: Date.now()
    });
}

// Show full image
function showFullImage(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'image-full-modal';
    modal.innerHTML = `
        <div class="image-full-overlay" onclick="this.parentElement.remove()">
            <img src="${imageUrl}" alt="Full Image" class="image-full-display">
            <button class="image-full-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;

    document.body.appendChild(modal);
}

// Show typing indicator
function showTypingIndicator() {
    document.getElementById('advancedTypingIndicator').style.display = 'flex';
    scrollToBottom();
}

// Hide typing indicator
function hideTypingIndicator() {
    document.getElementById('advancedTypingIndicator').style.display = 'none';
}

// Generate admin response
function generateAdminResponse(userMessage) {
    const responses = {
        'সাহায্য': 'আমি আপনাকে সাহায্য করতে এখানে আছি। আপনার কোন নির্দিষ্ট সমস্যা আছে?',
        'টাস্ক': 'টাস্ক সম্পর্কিত যেকোন প্রশ্ন করুন। আমি সব টাস্কের বিস্তারিত তথ্য দিতে পারি।',
        'পেমেন্ট': 'পেমেন্ট সংক্রান্ত সমস্যার জন্য আমাদের একাউন্ট বিভাগ বিভাগ খুব শীঘ্রই আপনার সাথে যোগাযোগ করবে।',
        'একাউন্ট': 'আপনার একাউন্ট সম্পর্কিত যেকোন সমস্যার সমাধান করতে পারি। বিস্তারিত বলুন।',
        'সমস্যা': 'আপনার সমস্যাটি বিস্তারিত বলুন। আমি সমাধান দেওয়ার চেষ্টা করব।',
        'hello': 'Hello! How can I help you today?',
        'hi': 'Hi there! I\'m here to assist you with any questions.',
        'thanks': 'You\'re welcome! Is there anything else I can help you with?'
    };

    const lowerMessage = userMessage.toLowerCase();

    for (const keyword in responses) {
        if (lowerMessage.includes(keyword)) {
            return responses[keyword];
        }
    }

    return 'ধন্যবাদ আপনার মেসেজের জন্য। আমি আপনার প্রশ্নটি দেখছি এবং শীঘ্রই উত্তর দেব। কোনো জরুরি সমস্যা থাকলে আরো বিস্তারিত বলুন।';
}

// Send quick message
function sendQuickMessage(message) {
    const textarea = document.getElementById('messageTextarea');
    textarea.value = message;
    handleMessageInput(textarea);
    setTimeout(() => {
        sendPremiumMessage();
    }, 100);
}

// Scroll to bottom
function scrollToBottom() {
    const chatBody = document.querySelector('.premium-chat-body');
    if (chatBody) {
        chatBody.scrollTop = chatBody.scrollHeight;
    }
}

// Load chat messages
async function loadChatMessages() {
    if (!currentUser) return;

    try {
        const snapshot = await database.ref('premium_chat_messages')
            .orderByChild('userId')
            .equalTo(currentUser.uid)
            .limitToLast(50)
            .once('value');

        const messages = snapshot.val() || {};
        const messageArray = Object.values(messages).sort((a, b) => a.timestamp - b.timestamp);

        messageArray.forEach(message => {
            addChatMessage(message.senderType, message.content, message.imageUrl);
        });

    } catch (error) {
        console.error('Error loading chat messages:', error);
    }
}

// Refresh messages
function refreshMessages() {
    const messagesArea = document.getElementById('chatMessagesArea');
    messagesArea.innerHTML = '';
    currentChatMessages = [];
    loadChatMessages();
    showChatToast('Messages refreshed!', 'success');
}

// Toggle emoji picker with enhanced functionality
function toggleEmojiPicker() {
    const emojiBtn = document.querySelector('.emoji-action-btn');
    const textarea = document.getElementById('messageTextarea');

    // Simple emoji insertion
    const emojis = ['😀', '😂', '🥰', '😍', '🤔', '👍', '👎', '❤️', '🔥', '💯', '🎉', '👏', '🙏', '💪', '✨'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    // Insert emoji at cursor position
    const cursorPos = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, cursorPos);
    const textAfter = textarea.value.substring(cursorPos);

    textarea.value = textBefore + randomEmoji + textAfter;
    textarea.setSelectionRange(cursorPos + randomEmoji.length, cursorPos + randomEmoji.length);

    // Trigger input event to update send button state
    handleMessageInput(textarea);

    // Focus back to textarea
    textarea.focus();

    // Add visual feedback
    emojiBtn.style.transform = 'scale(1.2) rotate(360deg)';
    setTimeout(() => {
        emojiBtn.style.transform = '';
    }, 300);

    showChatToast('Emoji added! 😊', 'success');
}

// Enhanced select image from gallery
function selectImageFromGallery() {
    const plusBtn = document.querySelector('.plus-action-btn');

    // Add visual feedback
    plusBtn.style.transform = 'scale(0.9) rotate(180deg)';
    setTimeout(() => {
        plusBtn.style.transform = '';
    }, 200);

    document.getElementById('galleryInput').click();
}

// Initialize premium chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    const liveChatPage = document.getElementById('liveChatPage');
    if (liveChatPage) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    if (liveChatPage.classList.contains('active')) {
                        setTimeout(() => {
                            initializePremiumChat();
                        }, 100);
                    }
                }
            });
        });

        observer.observe(liveChatPage, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
});

// Enhanced chat toast function
function showChatToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `premium-chat-toast toast-${type}`;

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };

    const colors = {
        success: 'linear-gradient(135deg, #10b981, #059669)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        info: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)'
    };

    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        font-size: 0.9rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

function closeLiveChat() {
    document.getElementById('liveChatModal').classList.remove('active');
    document.body.style.overflow = '';
}

function initializeLiveChat() {
    const messagesContainer = document.getElementById('liveChatMessages');
    const welcomeExists = messagesContainer.querySelector('.live-chat-welcome');

    if (!welcomeExists) {
        messagesContainer.innerHTML = `
            <div class="live-chat-welcome">
                <div class="welcome-avatar">
                    <span class="team-initial">RT</span>
                </div>
                <div class="welcome-message">
                    <h4>Welcome to Live Support!</h4>
                    <p>আমরা আপনাকে সাহায্য করতে এখানে আছি। কোন প্রশ্ন থাকলে জিজ্ঞাসা করুন।</p>
                </div>
            </div>
        `;
    }
}

function showTypingIndicator() {
    document.getElementById('liveChatTyping').style.display = 'flex';
    scrollToBottom('liveChatMessages');
}

function hideTypingIndicator() {
    document.getElementById('liveChatTyping').style.display = 'none';
}

function addSupportMessage(message) {
    const messagesContainer = document.getElementById('liveChatMessages');
    const messageTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const messageHTML = `
        <div class="live-message support">
            <div class="welcome-avatar">
                <span class="team-initial">RT</span>
            </div>
            <div class="live-message-content">
                <div class="live-message-bubble">
                    ${message}
                </div>
                <div class="live-message-time">${messageTime}</div>
            </div>
        </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    scrollToBottom('liveChatMessages');
}

function addUserMessage(message) {
    const messagesContainer = document.getElementById('liveChatMessages');
    const messageTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const messageHTML = `
        <div class="live-message user">
            <div class="live-message-content">
                <div class="live-message-bubble">
                    ${message}
                </div>
                <div class="live-message-time">${messageTime}</div>
            </div>
        </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    scrollToBottom('liveChatMessages');
}

function sendLiveMessage() {
    const input = document.getElementById('liveChatInput');
    const message = input.value.trim();

    if (!message) return;

    // Add user message
    addUserMessage(message);

    // Clear input
    input.value = '';
    adjustLiveTextareaHeight(input);

    // Show typing indicator
    setTimeout(() => {
        showTypingIndicator();

        // Simulate response after 1-3 seconds
        const responseTime = Math.random() * 2000 + 1000;
        setTimeout(() => {
            hideTypingIndicator();

            // Generate auto response based on message
            const response = generateAutoResponse(message);
            addSupportMessage(response);
        }, responseTime);
    }, 500);
}

function generateAutoResponse(userMessage) {
    const responses = {
        'help': 'আমি আপনাকে সাহায্য করতে পারি। আপনার কোন নির্দিষ্ট সমস্যা আছে?',
        'task': 'টাস্ক সম্পর্কিত যেকোন প্রশ্ন করুন। আমি সব টাস্কের বিস্তারিত জানি।',
        'payment': 'পেমেন্ট সংক্রান্ত সমস্যার জন্য আমাদের একাউন্ট বিভাগে যোগাযোগ করুন।',
        'problem': 'আপনার সমস্যাটি বিস্তারিত বলুন। আমি সমাধান দেওয়ার চেষ্টা করব।'
    };

    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('help') || lowerMessage.includes('সাহায্য')) {
        return responses.help;
    } else if (lowerMessage.includes('task') || lowerMessage.includes('টাস্ক')) {
        return responses.task;
    } else if (lowerMessage.includes('payment') || lowerMessage.includes('পেমেন্ট') || lowerMessage.includes('টাকা')) {
        return responses.payment;
    } else if (lowerMessage.includes('problem') || lowerMessage.includes('সমস্যা')) {
        return responses.problem;
    } else {
        return 'ধন্যবাদ আপনার মেসেজের জন্য। আমাদের সাপোর্ট টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।';
    }
}

function setupLiveChatAutoResize() {
    const textarea = document.getElementById('liveChatInput');
    if (textarea) {
        textarea.addEventListener('input', (e) => {
            adjustLiveTextareaHeight(e.target);
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !event.shiftKey) {
                e.preventDefault();
                sendLiveMessage();
            }
        });
    }
}

function adjustLiveTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
}

function scrollToBottom(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function selectLiveImage() {
    document.getElementById('liveChatImageInput').click();
}

function requestScreenShare() {
    addUserMessage('Screen share অনুরোধ পাঠানো হয়েছে');
    setTimeout(() => {
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            addSupportMessage('স্ক্রিন শেয়ার ফিচার শীঘ্রই আসছে। এখনের জন্য আপনি স্ক্রিনশট পাঠাতে পারেন।');
        }, 1500);
    }, 500);
}

function requestVideoCall() {
    addUserMessage('ভিডিও কল অনুরোধ পাঠানো হয়েছে');
    setTimeout(() => {
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            addSupportMessage('ভিডিও কল ফিচার শীঘ্রই উপলব্ধ হবে। এখনের জন্য লাইভ চ্যাটের মাধ্যমে যোগাযোগ করুন।');
        }, 1500);
    }, 500);
}

function sendQuickReply(type) {
    let message = '';
    switch(type) {
        case 'Need Help':
            message = 'আমার সাহায্য প্রয়োজন';
            break;
        default:
            message = type;
    }

    document.getElementById('liveChatInput').value = message;
    sendLiveMessage();
}

// Add event listeners for chat actions
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('openComposeBtn').addEventListener('click', showComposeModal);
    document.getElementById('closeComposeBtn').addEventListener('click', hideChatComposeModal);
    document.getElementById('sendComposeBtn').addEventListener('click', sendComposeMessage);
    document.getElementById('removeComposeImageBtn').addEventListener('click', removeComposeImage);
    document.getElementById('closeChatBtn').addEventListener('click', hideChatModal);
    document.getElementById('addNoteBtn').addEventListener('click', showAddNoteModal);
    document.getElementById('closeAddNoteBtn').addEventListener('click', hideAddNoteModal);
    document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
    document.querySelector('.chat-send-btn').addEventListener('click', sendMessage);
    document.querySelector('.chat-image-upload-btn').addEventListener('click', openImageSelector);

    // Close compose modal on overlay click
    document.getElementById('chatComposeModal').addEventListener('click', (e) => {
        if (e.target.id === 'chatComposeModal') {
            hideChatComposeModal();
        }
    });

    // Close add note modal on overlay click
    document.getElementById('addNoteModal').addEventListener('click', (e) => {
        if (e.target.id === 'addNoteModal') {
            hideAddNoteModal();
        }
    });

    // Close chat modal on overlay click
    document.getElementById('chatModal').addEventListener('click', (e) => {
        if (e.target.id === 'chatModal') {
            hideChatModal();
        }
    });
});

    // Generate 7-digit user ID based on user's unique data
    const generateDisplayUserId = (userData) => {
        if (userData.customId) return userData.customId;

        // Create a unique 7-digit ID based on user's email and creation time
        const emailHash = userData.email ? userData.email.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0) : 0;

        const timeHash = userData.createdAt ? userData.createdAt : Date.now();
        const combined = Math.abs(emailHash + timeHash);
        const sevenDigitId = (1000000 + (combined % 9000000)).toString();

        return sevenDigitId;
    };

// Chat Page Functions
async function loadChatMessages() {
    const container = document.getElementById('chatMessagesContainer');

    try {
        // Get chat messages from Firebase
        const chatSnapshot = await database.ref('chat_messages')
            .orderByChild('timestamp')
            .limitToLast(50)
            .once('value');

        const messages = chatSnapshot.val() || {};
        const messageArray = Object.keys(messages).map(key => ({
            id: key,
            ...messages[key]
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        if (messageArray.length === 0) {
            container.innerHTML = `
                <div class="no-chat-messages">
                    <div class="no-chat-icon">
                        <i class="fas fa-comments"></i>
                    </div>
                    <h3>No Messages Yet</h3>
                    <p>Start a conversation by sending your first message!</p>
                </div>
            `;
            return;
        }

        let messagesHTML = '';

        messageArray.forEach(message => {
            const messageTime = new Date(message.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const isAdmin = message.senderType === 'admin';
            const isUnread = message.status === 'unread' && message.userId === currentUser?.uid;
            const senderInitial = message.senderName ? message.senderName.charAt(0).toUpperCase() : 'U';

            messagesHTML += `
                <div class="chat-message-item ${isUnread ? 'unread' : ''} ${isAdmin ? 'admin-message' : ''}" 
                     onclick="markMessageAsRead('${message.id}')">
                    <div class="chat-message-header">
                        <div class="chat-message-sender">
                            <div class="chat-sender-avatar ${isAdmin ? 'admin' : ''}">
                                ${isAdmin ? 'A' : senderInitial}
                            </div>
                            <div class="chat-sender-info">
                                <div class="chat-sender-name">${message.senderName || 'User'}</div>
                                <div class="chat-sender-role">${isAdmin ? 'Admin' : 'User'}</div>
                            </div>
                        </div>
                        <div class="chat-message-time">
                            <i class="fas fa-clock"></i>
                            ${messageTime}
                        </div>
                    </div>

                    ${message.subject ? `
                        <div class="chat-message-subject">${message.subject}</div>
                    ` : ''}

                    <div class="chat-message-content">
                        ${message.content}
                    </div>

                    ${message.imageUrl ? `
                        <div class="chat-message-image">
                            <img src="${message.imageUrl}" alt="Message Image" onclick="showImageModal('${message.imageUrl}')">
                        </div>
                    ` : ''}

                    <div class="chat-message-actions">
                        <span class="chat-message-status status-${message.status || 'new'}">
                            ${getMessageStatusText(message.status || 'new')}
                        </span>
                        ${!isAdmin && message.userId === currentUser?.uid ? `
                            <button class="chat-reply-btn" onclick="event.stopPropagation(); replyToMessage('${message.id}')">
                                <i class="fas fa-reply"></i>
                                Reply
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = messagesHTML;

        // Setup chat tabs
        setupChatTabs();

    } catch (error) {
        console.error('Error loading chat messages:', error);
        container.innerHTML = `
            <div class="no-chat-messages">
                <div class="no-chat-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error Loading Messages</h3>
                <p>Failed to load messages. Please try again.</p>
            </div>
        `;
    }
}

function getMessageStatusText(status) {
    const statusMap = {
        'new': 'New',
        'read': 'Read',
        'replied': 'Replied',
        'unread': 'Unread'
    };
    return statusMap[status] || 'New';
}

function setupChatTabs() {
    const tabs = document.querySelectorAll('.chat-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            e.target.classList.add('active');

            // Filter messages based on tab
            filterMessagesByTab(e.target.dataset.tab);
        });
    });
}

function filterMessagesByTab(tabType) {
    const messages = document.querySelectorAll('.chat-message-item');

    messages.forEach(message => {
        switch(tabType) {
            case 'unread':
                message.style.display = message.classList.contains('unread') ? 'block' : 'none';
                break;
            case 'groups':
                // For now, show admin messages as "group" messages
                message.style.display = message.classList.contains('admin-message') ? 'block' : 'none';
                break;
            case 'requests':
                // Show messages with reply requests
                message.style.display = message.querySelector('.chat-reply-btn') ? 'block' : 'none';
                break;
            default:
                message.style.display = 'block';
                break;
        }
    });
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message || !currentUser) return;

    const sendBtn = document.querySelector('.chat-send-btn');
    const originalHTML = sendBtn.innerHTML;

    // Show loading state
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    sendBtn.disabled = true;

    try {
        const messageData = {
            userId: currentUser.uid,
            senderName: currentUser.name,
            senderEmail: currentUser.email,
            senderType: 'user',
            content: message,
            timestamp: Date.now(),
            status: 'new'
        };

        // Save message to Firebase
        await database.ref('chat_messages').push(messageData);

        // Clear input
        input.value = '';
        adjustTextareaHeight(input);

        // Reload messages
        loadChatMessages();

        // Show success feedback
        showChatToast('Message sent successfully!', 'success');

    } catch (error) {
        console.error('Error sending message:', error);
        showChatToast('Failed to send message. Please try again.', 'error');
    } finally {
        sendBtn.innerHTML = originalHTML;
        sendBtn.disabled = false;
    }
}

function openImageSelector() {
    document.getElementById('chatImageInput').click();
}

// Setup image upload for chat
document.addEventListener('DOMContentLoaded', () => {
    const chatImageInput = document.getElementById('chatImageInput');
    if (chatImageInput) {
        chatImageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await sendImageMessage(file);
            }
        });
    }
});

async function sendImageMessage(file) {
    if (!file || !currentUser) return;

    const sendBtn = document.querySelector('.chat-send-btn');
    const originalHTML = sendBtn.innerHTML;

    // Show loading state
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    sendBtn.disabled = true;

    try {
        // Convert image to data URL
        const imageDataUrl = await convertImageToDataUrl(file);

        const messageData = {
            userId: currentUser.uid,
            senderName: currentUser.name,
            senderEmail: currentUser.email,
            senderType: 'user',
            content: 'Sent an image',
            imageUrl: imageDataUrl,
            timestamp: Date.now(),
            status: 'new'
        };

        // Save message to Firebase
        await database.ref('chat_messages').push(messageData);

        // Reload messages
        loadChatMessages();

        // Show success feedback
        showChatToast('Image sent successfully!', 'success');

    } catch (error) {
        console.error('Error sending image:', error);
        showChatToast('Failed to send image. Please try again.', 'error');
    } finally {
        sendBtn.innerHTML = originalHTML;
        sendBtn.disabled = false;
    }
}

function convertImageToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Resize image to reasonable size
            const maxWidth = 800;
            const maxHeight = 600;

            let { width, height } = img;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataUrl);
        };

        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

function setupChatAutoResize() {
    const textarea = document.getElementById('chatInput');
    if (textarea) {
        textarea.addEventListener('input', (e) => {
            adjustTextareaHeight(e.target);
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

async function markMessageAsRead(messageId) {
    try {
        await database.ref(`chat_messages/${messageId}`).update({
            status: 'read',
            readAt: Date.now()
        });

        // Update UI
        const messageElement = document.querySelector(`[onclick*="${messageId}"]`);
        if (messageElement) {
            messageElement.classList.remove('unread');
            const statusElement = messageElement.querySelector('.chat-message-status');
            if (statusElement) {
                statusElement.textContent = 'Read';
                statusElement.className = 'chat-message-status status-read';
            }
        }
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

function replyToMessage(messageId) {
    // For now, just open compose modal
    showComposeModal();
}

// Chat Modal Functions
function showComposeModal() {
    document.getElementById('chatComposeModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Setup image preview
    setupComposeImagePreview();
}

function hideChatComposeModal() {
    document.getElementById('chatComposeModal').classList.remove('active');
    document.body.style.overflow = '';

    // Clear form
    document.getElementById('composeSubject').value = '';
    document.getElementById('composeMessage').value = '';
    document.getElementById('composeImage').value = '';
    hideComposeImagePreview();
}

function setupComposeImagePreview() {
    const imageInput = document.getElementById('composeImage');
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('composeImagePreview');
                const img = document.getElementById('composePreviewImg');
                img.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
}

function removeComposeImage() {
    document.getElementById('composeImage').value = '';
    hideComposeImagePreview();
}

function hideComposeImagePreview() {
    document.getElementById('composeImagePreview').style.display = 'none';
    document.getElementById('composePreviewImg').src = '';
}

async function sendComposeMessage() {
    const subject = document.getElementById('composeSubject').value.trim();
    const message = document.getElementById('composeMessage').value.trim();
    const imageFile = document.getElementById('composeImage').files[0];

    if (!subject && !message) {
        showChatToast('Please enter a subject or message', 'error');
        return;
    }

    if (!currentUser) {
        showChatToast('Please log in first', 'error');
        return;
    }

    const sendBtn = document.getElementById('sendComposeBtn');
    const originalHTML = sendBtn.innerHTML;

    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    sendBtn.disabled = true;

    try {
        let imageUrl = null;

        if (imageFile) {
            imageUrl = await convertImageToDataUrl(imageFile);
        }

        const messageData = {
            userId: currentUser.uid,
            senderName: currentUser.name,
            senderEmail: currentUser.email,
            senderType: 'user',
            subject: subject || null,
            content: message || 'No message content',
            imageUrl: imageUrl,
            timestamp: Date.now(),
            status: 'new'
        };

        await database.ref('chat_messages').push(messageData);

        hideChatComposeModal();
        loadChatMessages();
        showChatToast('Message sent successfully!', 'success');

    } catch (error) {
        console.error('Error sending compose message:', error);
        showChatToast('Failed to send message. Please try again.', 'error');
    } finally {
        sendBtn.innerHTML = originalHTML;
        sendBtn.disabled = false;
    }
}

// Add Note Modal Functions
function showAddNoteModal() {
    document.getElementById('addNoteModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideAddNoteModal() {
    document.getElementById('addNoteModal').classList.remove('active');
    document.body.style.overflow = '';

    // Clear form
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('notePriority').value = 'medium';
}

async function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const priority = document.getElementById('notePriority').value;

    if (!title || !content) {
        showChatToast('Please fill in all fields', 'error');
        return;
    }

    if (!currentUser) {
        showChatToast('Please log in first', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveNoteBtn');
    const originalHTML = saveBtn.innerHTML;

    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        const noteData = {
            userId: currentUser.uid,
            userName: currentUser.name,
            userEmail: currentUser.email,
            title: title,
            content: content,
            priority: priority,
            createdAt: Date.now(),
            type: 'note'
        };

        await database.ref('user_notes').push(noteData);

        hideAddNoteModal();
        showChatToast('Note saved successfully!', 'success');

    } catch (error) {
        console.error('Error saving note:', error);
        showChatToast('Failed to save note. Please try again.', 'error');
    } finally {
        saveBtn.innerHTML = originalHTML;
        saveBtn.disabled = false;
    }
}

function showChatToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `chat-toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #27ae60, #2ecc71)' : 'linear-gradient(135deg, #e74c3c, #c0392b)'};
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        font-size: 0.9rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Withdrawal System Functions
function setupWithdrawalButton() {
    // Add withdrawal button to profile menu if it doesn't exist
    const profileMenu = document.querySelector('.user-profile-menu');
    if (profileMenu && !document.getElementById('withdrawalBtn')) {
        const withdrawalBtn = document.createElement('button');
        withdrawalBtn.id = 'withdrawalBtn';
        withdrawalBtn.className = 'profile-menu-item';
        withdrawalBtn.innerHTML = '<i class="fas fa-money-bill-wave"></i> Withdraw Money';
        withdrawalBtn.addEventListener('click', showWithdrawalPage);
        
        // Insert after balance display
        const balanceItem = profileMenu.querySelector('.balance-display');
        if (balanceItem && balanceItem.nextSibling) {
            profileMenu.insertBefore(withdrawalBtn, balanceItem.nextSibling);
        } else {
            profileMenu.appendChild(withdrawalBtn);
        }
    }
}

async function showWithdrawalPage() {
    // Close profile modal first
    hideUserProfileModal();
    
    // Create withdrawal page
    const withdrawalPageHTML = `
        <div id="withdrawalPage" class="page active">
            <div class="withdrawal-container">
                <div class="withdrawal-header">
                    <button class="back-btn" onclick="closeWithdrawalPage()">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2>Withdraw Money</h2>
                </div>
                
                <div class="withdrawal-balance">
                    <div class="balance-card">
                        <h3>Available Balance</h3>
                        <div class="balance-amount">$${(currentUser.balance || 0).toFixed(2)}</div>
                    </div>
                </div>
                
                <div class="withdrawal-form">
                    <h3>Select Payment Method</h3>
                    <div id="paymentMethodsList" class="payment-methods-list">
                        <div class="loading">Loading payment methods...</div>
                    </div>
                    
                    <div id="withdrawalDetailsForm" class="withdrawal-details" style="display: none;">
                        <h3>Withdrawal Details</h3>
                        
                        <div class="form-group">
                            <label for="withdrawalAmount">Amount ($)</label>
                            <input type="number" id="withdrawalAmount" min="1" step="0.01" class="form-control" placeholder="Enter amount">
                        </div>
                        
                        <div class="form-group">
                            <label for="accountName">Account Name</label>
                            <input type="text" id="accountName" class="form-control" placeholder="Enter account name">
                        </div>
                        
                        <div class="form-group">
                            <label for="accountNumber">Account Number/Email</label>
                            <input type="text" id="accountNumber" class="form-control" placeholder="Enter account number or email">
                        </div>
                        
                        <button id="submitWithdrawalBtn" class="submit-btn" onclick="submitWithdrawalRequest()">
                            Submit Withdrawal Request
                        </button>
                    </div>
                </div>
                
                <div class="withdrawal-history">
                    <h3>Withdrawal History</h3>
                    <div id="withdrawalHistoryList" class="history-list">
                        <div class="loading">Loading history...</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing withdrawal page if any
    const existingPage = document.getElementById('withdrawalPage');
    if (existingPage) {
        existingPage.remove();
    }
    
    // Add new withdrawal page
    document.body.insertAdjacentHTML('beforeend', withdrawalPageHTML);
    
    // Load payment methods only
    await loadPaymentMethodsForWithdrawal();
}

async function loadPaymentMethodsForWithdrawal() {
    const container = document.getElementById('paymentMethodsList');
    
    try {
        const snapshot = await database.ref('paymentMethods').orderByChild('isActive').equalTo(true).once('value');
        const methods = snapshot.val() || {};
        const methodsArray = Object.keys(methods).map(key => ({ id: key, ...methods[key] }));
        
        if (methodsArray.length === 0) {
            container.innerHTML = '<div class="no-methods">No payment methods available</div>';
            return;
        }
        
        let methodsHTML = '';
        methodsArray.forEach(method => {
            methodsHTML += `
                <div class="payment-method-card" onclick="selectPaymentMethod('${method.id}', '${method.currencyName}', ${method.minAmount}, ${method.maxWithdrawal})">
                    <div class="method-logo">
                        ${method.logoUrl ? 
                            `<img src="${method.logoUrl}" alt="${method.currencyName}">` :
                            `<div class="logo-placeholder">${method.currencyName.charAt(0)}</div>`
                        }
                    </div>
                    <div class="method-info">
                        <h4>${method.currencyName}</h4>
                        <p>${method.title}</p>
                        <small>Min: $${method.minAmount} - Max: $${method.maxWithdrawal}</small>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = methodsHTML;
        
    } catch (error) {
        console.error('Error loading payment methods:', error);
        container.innerHTML = '<div class="error">Failed to load payment methods</div>';
    }
}

function selectPaymentMethod(methodId, currencyName, minAmount, maxAmount) {
    // Store selected method
    window.selectedPaymentMethod = { id: methodId, name: currencyName, min: minAmount, max: maxAmount };
    
    // Show selected state
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Show withdrawal form
    const form = document.getElementById('withdrawalDetailsForm');
    form.style.display = 'block';
    
    // Set amount limits
    const amountInput = document.getElementById('withdrawalAmount');
    amountInput.min = minAmount;
    amountInput.max = Math.min(maxAmount, currentUser.balance || 0);
    amountInput.placeholder = `Enter amount ($${minAmount} - $${Math.min(maxAmount, currentUser.balance || 0)})`;
}

async function submitWithdrawalRequest() {
    if (!window.selectedPaymentMethod) {
        alert('Please select a payment method');
        return;
    }
    
    const amount = parseFloat(document.getElementById('withdrawalAmount').value);
    const accountName = document.getElementById('accountName').value.trim();
    const accountNumber = document.getElementById('accountNumber').value.trim();
    
    if (!amount || amount < window.selectedPaymentMethod.min || amount > window.selectedPaymentMethod.max) {
        alert(`Amount must be between $${window.selectedPaymentMethod.min} and $${window.selectedPaymentMethod.max}`);
        return;
    }
    
    if (amount > (currentUser.balance || 0)) {
        alert('Insufficient balance');
        return;
    }
    
    if (!accountName || !accountNumber) {
        alert('Please fill in all account details');
        return;
    }
    
    const submitBtn = document.getElementById('submitWithdrawalBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        const withdrawalData = {
            userId: currentUser.uid,
            userUid: currentUser.uid,
            userName: currentUser.name,
            userEmail: currentUser.email,
            paymentMethodId: window.selectedPaymentMethod.id,
            paymentMethodTitle: window.selectedPaymentMethod.name,
            currencyName: window.selectedPaymentMethod.name,
            amount: amount,
            paymentDetails: {
                accountName: accountName,
                accountNumber: accountNumber
            },
            status: 'pending',
            timestamp: Date.now()
        };
        
        await database.ref('withdrawals').push(withdrawalData);
        
        alert('Withdrawal request submitted successfully! Admin will review and process your request.');
        
        // Refresh history
        await loadWithdrawalHistory();
        
        // Clear form
        document.getElementById('withdrawalAmount').value = '';
        document.getElementById('accountName').value = '';
        document.getElementById('accountNumber').value = '';
        document.getElementById('withdrawalDetailsForm').style.display = 'none';
        document.querySelectorAll('.payment-method-card').forEach(card => {
            card.classList.remove('selected');
        });
        
    } catch (error) {
        console.error('Error submitting withdrawal:', error);
        alert('Failed to submit withdrawal request. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Withdrawal Request';
    }
}

async function loadWithdrawalHistory() {
    const container = document.getElementById('withdrawalHistoryList');
    
    try {
        const snapshot = await database.ref('withdrawals').orderByChild('userId').equalTo(currentUser.uid).once('value');
        const withdrawals = snapshot.val() || {};
        const withdrawalsArray = Object.keys(withdrawals)
            .map(key => ({ id: key, ...withdrawals[key] }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        if (withdrawalsArray.length === 0) {
            container.innerHTML = '<div class="no-history">No withdrawal history found</div>';
            return;
        }
        
        let historyHTML = '';
        withdrawalsArray.forEach(withdrawal => {
            const date = new Date(withdrawal.timestamp).toLocaleDateString();
            const statusClass = `status-${withdrawal.status}`;
            
            historyHTML += `
                <div class="withdrawal-history-item">
                    <div class="withdrawal-info">
                        <h4>$${withdrawal.amount}</h4>
                        <p>${withdrawal.currencyName}</p>
                        <small>${date}</small>
                    </div>
                    <div class="withdrawal-status">
                        <span class="status-badge ${statusClass}">${withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = historyHTML;
        
    } catch (error) {
        console.error('Error loading withdrawal history:', error);
        container.innerHTML = '<div class="error">Failed to load history</div>';
    }
}

function closeWithdrawalPage() {
    const withdrawalPage = document.getElementById('withdrawalPage');
    if (withdrawalPage) {
        withdrawalPage.remove();
    }
    showPage('homePage');
    updateCurrentPageTitle('Home');
}

function showImageModal(imageUrl) {
    // Create a simple image modal
    const modal = document.createElement('div');
    modal.className = 'image-modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;

    modal.innerHTML = `
        <img src="${imageUrl}" alt="Full Image" style="max-width: 90%; max-height: 90%; border-radius: 12px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
    `;

    modal.addEventListener('click', () => {
        modal.remove();
    });

    document.body.appendChild(modal);
}

    // Update profile information
    document.getElementById('profileUserName').textContent = currentUser.name || 'Unknown';
    document.getElementById('profileEmail').textContent = currentUser.email || 'No email';
    document.getElementById('profileBalance').textContent = `$${(currentUser.balance || 0).toFixed(2)}`;
    document.getElementById('profileUserId').textContent = generateDisplayUserId(currentUser);

    showModal('userProfileModal');
}

function hideProfileModal() {
    hideModal('userProfileModal');
}

function copyUserId() {
    const userId = document.getElementById('profileUserId').textContent;
    navigator.clipboard.writeText(userId).then(() => {
        // Show success feedback
        const copyBtn = document.getElementById('copyUserIdBtn');
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        copyBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';

        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
        alert('Failed to copy User ID');
    });
}

// Modal Functions
function showResendModal() {
    const modal = document.getElementById('resendConfirmModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideResendModal() {
    const modal = document.getElementById('resendConfirmModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Enhanced resend email function
async function handleResendEmail() {
    const btn = document.getElementById('resendEmail');
    const statusElement = document.getElementById('verificationStatus');

    // Add loading state
    btn.classList.add('btn-loading');
    btn.disabled = true;

    statusElement.className = 'verification-status checking';
    statusElement.innerHTML = `
        <p>
            <span class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </span>
            Sending verification email...
        </p>
    `;

    try {
        await sendVerificationEmail(signupData.email);

        // Success state
        statusElement.className = 'verification-status success';
        statusElement.innerHTML = '<p style="color: #4caf50;"><i class="fas fa-check-circle"></i> Verification email sent successfully! Please check your inbox.</p>';

        // Restart verification check
        if (verificationCheckInterval) {
            clearInterval(verificationCheckInterval);
        }
        setTimeout(() => {
            startVerificationCheck();
        }, 2000);

    } catch (error) {
        console.error('Error resending email:', error);

        // Error state
        statusElement.className = 'verification-status error';
        statusElement.innerHTML = '<p style="color: #f44336;"><i class="fas fa-exclamation-circle"></i> Failed to send email. Please try again.</p>';

        setTimeout(() => {
            statusElement.className = 'verification-status';
            statusElement.innerHTML = '<p>Waiting for email verification...</p>';
        }, 5000);
    } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
    }
}

// Load contact information for suspended page
async function loadContactInfo() {
    try {
        const snapshot = await database.ref('settings').once('value');
        const settings = snapshot.val() || {};

        const contactButtons = document.getElementById('contactButtons');

        const telegramLink = settings.telegramLink || 'https://t.me/support';
        const supportEmail = settings.supportEmail || 'support@realtasker.com';

        contactButtons.innerHTML = `
            <a href="${telegramLink}" target="_blank" class="contact-btn telegram-btn">
                <i class="fab fa-telegram-plane"></i>
                Contact via Telegram
            </a>
            <a href="mailto:${supportEmail}" class="contact-btn email-btn">
                <i class="fas fa-envelope"></i>
                Send Email
            </a>
        `;

        // Check suspension status every 10 seconds
        startSuspensionCheck();

    } catch (error) {
        console.error('Error loading contact info:', error);
        const contactButtons = document.getElementById('contactButtons');
        contactButtons.innerHTML = `
            <a href="https://t.me/support" target="_blank" class="contact-btn telegram-btn">
                <i class="fab fa-telegram-plane"></i>
                Contact via Telegram
            </a>
            <a href="mailto:support@realtasker.com" class="contact-btn email-btn">
                <i class="fas fa-envelope"></i>
                Send Email
            </a>
        `;
    }
}

// Check suspension status periodically
function startSuspensionCheck() {
    if (suspensionCheckInterval) {
        clearInterval(suspensionCheckInterval);
    }

    suspensionCheckInterval = setInterval(async () => {
        if (!currentUser || !currentUser.uid) {
            clearInterval(suspensionCheckInterval);
            return;
        }

        try {
            const snapshot = await database.ref(`users/${currentUser.uid}`).once('value');
            const userData = snapshot.val();

            if (userData && userData.suspended) {
                // User is suspended, redirect to suspended page
                clearInterval(suspensionCheckInterval);
                showPage('suspendedPage');
                loadContactInfo();
            } else if (userData && !userData.suspended && document.getElementById('suspendedPage').classList.contains('active')) {
                // User is no longer suspended and currently on suspended page
                clearInterval(suspensionCheckInterval);

                // Show success message before redirect
                document.querySelector('.suspended-title').textContent = 'Account Restored!';
                document.querySelector('.suspended-title').style.color = '#27ae60';
                document.querySelector('.suspended-message').innerHTML = 'Great news! Your account has been restored. You will be redirected to the homepage in a few seconds.';
                document.querySelector('.suspended-icon').innerHTML = '<i class="fas fa-check-circle"></i>';
                document.querySelector('.suspended-icon').style.background = 'linear-gradient(135deg, #27ae60, #229954)';

                setTimeout(() => {
                    showPage('homePage');
                    updateWelcomeMessage();
                    updateHeaderProfilePicture();
                    setupHeaderProfileClick();
                    updateCurrentPageTitle('Home');
                    loadTasks();
                    updateUserBalance();
                    setupBalanceMonitoring();
                    startSuspensionCheck(); // Restart suspension check
                }, 3000);
            }
        } catch (error) {
            console.error('Error checking suspension status:', error);
        }
    }, 10000); // Check every 10 seconds
}

// Setup DOB dropdowns
function setupDobDropdowns() {
    const daySelect = document.getElementById('dobDay');
    const yearSelect = document.getElementById('dobYear');
    const monthSelect = document.getElementById('dobMonth');

    // Populate days (1-31)
    for (let day = 1; day <= 31; day++) {
        const option = document.createElement('option');
        option.value = day.toString().padStart(2, '0');
        option.textContent = day;
        daySelect.appendChild(option);
    }

    // Populate years (current year - 100 to current year - 13)
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 13; year >= currentYear - 100; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;        yearSelect.appendChild(option);
    }

    // Update days when month changes
    monthSelect.addEventListener('change', () => {
        const month = monthSelect.value;
        const year = yearSelect.value || currentYear;

        if (month) {
            const daysInMonth = new Date(year, month, 0).getDate();

            // Clear existing options except first
            daySelect.innerHTML = '<option value="">Day</option>';

            // Add days for selected month
            for (let day = 1; day <= daysInMonth; day++) {
                const option = document.createElement('option');
                option.value = day.toString().padStart(2, '0');
                option.textContent = day;
                daySelect.appendChild(option);
            }
        }
    });

    // Update days when year changes (for leap year)
    yearSelect.addEventListener('change', () => {
        const month = monthSelect.value;
        const year = yearSelect.value;

        if (month && year) {
            const daysInMonth = new Date(year, month, 0).getDate();
            const currentDay = daySelect.value;

            // Clear existing options except first
            daySelect.innerHTML = '<option value="">Day</option>';

            // Add days for selected month/year
            for (let day = 1; day <= daysInMonth; day++) {
                const option = document.createElement('option');
                option.value = day.toString().padStart(2, '0');
                option.textContent = day;
                daySelect.appendChild(option);
            }

            // Restore selected day if still valid
            if (currentDay && parseInt(currentDay) <= daysInMonth) {
                daySelect.value = currentDay;
            }
        }
    });
}

function closeMoreMenuDrawer() {
    const drawer = document.getElementById('moreMenuDrawer');
    drawer.classList.remove('active');
    document.body.style.overflow = '';
}

// Check Authentication State - Show main XML page first, then redirect after 4 seconds
async function checkAuthState() {
    const savedUser = localStorage.getItem('currentUser');

    // Hide splash screen and show main container
    splashScreen.style.display = 'none';
    mainContainer.style.display = 'block';

    // Always show main XML page first
    showPage('mainXmlPage');

    // Wait 4 seconds before checking authentication and redirecting
    setTimeout(async () => {
        if (savedUser) {
            try {
                currentUser = JSON.parse(savedUser);

                // Check suspension status from database
                const snapshot = await database.ref(`users/${currentUser.uid}`).once('value');
                const userData = snapshot.val();

                if (userData && userData.suspended) {
                    // User is suspended, show suspended page
                    showPage('suspendedPage');
                    loadContactInfo();
                    return;
                }

                // User is logged in and not suspended, go to homepage
                showPage('homePage');
                updateWelcomeMessage();
                updateHeaderProfilePicture();
                setupHeaderProfileClick();
                updateCurrentPageTitle('Home');
                loadTasks();
                updateUserBalance();
                setupBalanceMonitoring();
                startSuspensionCheck();

            } catch (error) {
                console.error('Error loading user data:', error);
                // Invalid user data, clear and show auth page
                localStorage.removeItem('currentUser');
                currentUser = null;
                showPage('authPage');
            }
        } else {
            // No user logged in, show auth page
            showPage('authPage');
        }
    }, 4000); // 4 seconds delay
}

// Profile Picture Upload Setup
function setupProfilePictureUpload() {
    const profilePictureInput = document.getElementById('profilePictureInput');
    const profileCameraInput = document.getElementById('profileCameraInput');
    const profilePreview = document.getElementById('profilePreview');
    const uploadStatus = document.getElementById('uploadStatus');
    const profileSuccessDisplay = document.getElementById('profileSuccessDisplay');
    const confirmBtn = document.getElementById('confirmProfilePicture');
    const skipBtn = document.getElementById('skipProfilePicture');

    let uploadedImageData = null;

    // Handle gallery file selection
    profilePictureInput.addEventListener('change', async (e) => {
        handleImageUpload(e.target.files[0]);
    });

    // Handle camera file selection
    profileCameraInput.addEventListener('change', async (e) => {
        handleImageUpload(e.target.files[0]);
    });

    // Common image upload handler
    async function handleImageUpload(file) {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showError('profilePictureError', 'Please select a valid image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showError('profilePictureError', 'Image size must be less than 10MB');
            return;
        }

        // Show loading state
        uploadStatus.style.display = 'block';
        profileSuccessDisplay.style.display = 'none';
        confirmBtn.disabled = true;

        try {
            // Process and compress image
            const processedImage = await processImageForProfile(file);

            // Show high-quality preview
            profilePreview.innerHTML = `<img src="${processedImage.dataUrl}" alt="Profile Preview">`;

            // Simulate upload processing
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Store processed image data
            uploadedImageData = {
                dataUrl: processedImage.dataUrl,
                fileName: file.name,
                size: file.size,
                type: file.type,
                timestamp: Date.now()
            };

            // Show success state
            uploadStatus.style.display = 'none';
            profileSuccessDisplay.style.display = 'block';
            confirmBtn.disabled = false;

            // Store in signup data
            signupData.profilePicture = uploadedImageData.dataUrl;
            signupData.profilePictureData = uploadedImageData;

        } catch (error) {
            console.error('Upload error:', error);
            uploadStatus.style.display = 'none';
            showError('profilePictureError', 'Failed to process image. Please try again.');
        }
    }

    // Process image for high-quality display
    async function processImageForProfile(file) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate dimensions for high-quality crop
                const size = Math.min(img.width, img.height);
                const x = (img.width - size) / 2;
                const y = (img.height - size) / 2;

                // Set canvas size for high quality (400x400)
                canvas.width = 400;
                canvas.height = 400;

                // Enable high-quality rendering
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Draw cropped and resized image
                ctx.drawImage(img, x, y, size, size, 0, 0, 400, 400);

                // Convert to high-quality data URL
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                resolve({ dataUrl });
            };

            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    // Skip profile picture
    skipBtn.addEventListener('click', () => {
        signupData.profilePicture = null;
        signupData.profilePictureData = null;
        showPage('pinSetupPage');
    });

    // Confirm profile picture
    confirmBtn.addEventListener('click', () => {
        if (uploadedImageData) {
            showPage('pinSetupPage');
        }
    });
}

// Updated updateHeaderProfilePicture function to work with all pages
function updateHeaderProfilePicture() {
    if (!currentUser) return;

    // Update all headers (Home, Chat, Leaderboard)
    const headerElements = [
        {
            image: document.getElementById('headerProfileImage'),
            placeholder: document.getElementById('headerProfilePlaceholder'),
            userName: document.getElementById('welcomeUser')
        },
        {
            image: document.getElementById('chatUserImage'),
            placeholder: document.getElementById('chatUserPlaceholder'),
            userName: document.getElementById('chatUserName')
        },
        {
            image: document.getElementById('leaderboardUserImage'),
            placeholder: document.getElementById('leaderboardUserPlaceholder'),
            userName: document.getElementById('leaderboardUserName')
        }
    ];

    headerElements.forEach(element => {
        if (!element.image || !element.placeholder) return;

        // Update user name
        if (element.userName) {
            element.userName.textContent = currentUser.name || currentUser.username || 'User';
        }

        if (currentUser.profilePicture && currentUser.profilePicture.trim() !== '') {
            element.image.src = currentUser.profilePicture;
            element.image.style.display = 'block';
            element.placeholder.style.display = 'none';

            element.image.onerror = function() {
                this.style.display = 'none';
                element.placeholder.style.display = 'flex';
                element.placeholder.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
            };
        } else {
            element.image.style.display = 'none';
            element.placeholder.style.display = 'flex';
            element.placeholder.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
        }
    });
}

// New function to update current page title
function updateCurrentPageTitle(title) {
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = title;
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupPinInputs('#pinPage');
    setupPinInputs('#pinSetupPage');
    setupPinInputs('#pinConfirmPage');
    setupDobDropdowns();
    setupProfilePictureUpload();
    setupAdminLogin();
    setupAuthFlow();
    setupPinPage();
    setupSignupFlow();
    setupHomePage();
    setupBackButtons();
    setupLogoutButtons();
    setupGoogleSignIn();
    setupAutoResize();

    // Setup chat functionality
    if (typeof setupChatAutoResize === 'function') {
        setupChatAutoResize();
    }

    // Setup live chat title listener
    setupLiveChatTitleListener();

    // Initialize splash screen
    initializeSplashScreen();

    // Check authentication
    checkAuth();
});

// Function to load tasks from Firebase Database and display them on the homepage
async function loadTasks() {
    const tasksContainer = document.getElementById('tasksContainer');

    try {
        // Get tasks from Firebase Database
        const tasksSnapshot = await database.ref('tasks').orderByChild('createdAt').once('value');
        const tasksData = tasksSnapshot.val();

        if (!tasksData) {
            tasksContainer.innerHTML = `
                <div class="no-tasks">
                    <div class="no-tasks-icon">
                        <i class="fas fa-clipboard-list"></i>
                    </div>
                    <h3>কোনো টাস্ক নেই</h3>
                    <p>এই মুহূর্তে কোনো টাস্ক উপলব্ধ নেই। নতুন টাস্কের জন্য পরে দেখুন।</p>
                </div>
            `;
            return;
        }

        let tasksHTML = '';

        // Convert object to array and sort by creation time (newest first)
        const tasksArray = Object.keys(tasksData).map(key => ({
            id: key,
            ...tasksData[key]
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        tasksArray.forEach(task => {
            const completedCount = task.submissions ? Object.keys(task.submissions).length : 0;
            const totalSlots = task.maxSubmissions || 100;
            const progressPercentage = Math.min((completedCount / totalSlots) * 100, 100);

            // Calculate time ago
            const timeAgo = task.createdAt ? getTimeAgo(task.createdAt) : 'Just now';
            const fullDate = task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Today';

            // Get badge type
            const badgeType = task.type === 'admin_update' ? 'admin-update' : 'new-task';
            const badgeText = task.type === 'admin_update' ? '📢 ADMIN UPDATE' : '🔥 NEW TASK';

            // Get platforms
            const platforms = task.platforms || ['web'];
            const platformTags = platforms.map(platform => {
                const platformNames = {
                    'instagram': 'Instagram',
                    'tiktok': 'TikTok',
                    'youtube': 'YouTube',
                    'web': 'Web'
                };
                return `<span class="platform-tag ${platform}">${platformNames[platform] || platform}</span>`;
            }).join('');

            // Check if user has already submitted
            const userSubmitted = task.submissions && currentUser && task.submissions[currentUser.uid];
            const isTaskFull = completedCount >= totalSlots;

            // Generate auto link for task
            const taskAutoLink = `${window.location.origin}/task?id=${task.id}`;

            tasksHTML += `
                <div class="task-card" onclick="handleTaskAction('${task.id}')">
                    ${task.bannerImage ? `
                        <div class="task-banner-container">
                            <img src="${task.bannerImage}" alt="Task Banner" class="task-banner">
                            <div class="task-time-overlay">
                                <i class="fas fa-clock"></i>
                                ${timeAgo}
                            </div>
                            <div class="task-badge-overlay">
                                <span class="task-badge ${badgeType}">${badgeText}</span>
                            </div>
                        </div>
                    ` : `
                        <div class="task-card-content">
                            <div class="task-header">
                                <span class="task-badge ${badgeType}">${badgeText}</span>
                                <span class="task-time">
                                    <i class="fas fa-clock"></i>
                                    ${timeAgo}
                                </span>
                            </div>
                        </div>
                    `}

                    <div class="task-card-content">
                        <h3 class="task-title">${task.title}</h3>
                        <p class="task-description">${task.description}</p>

                        <div class="task-date-info">
                            <span><i class="fas fa-calendar-alt"></i> Published: ${fullDate}</span>
                            <span><i class="fas fa-eye"></i> Live</span>
                        </div>

                        <div class="task-meta">
                            <div class="task-meta-item">
                                <i class="fas fa-dollar-sign"></i>
                                <span class="task-reward">$${task.reward || '0.00'}</span>
                            </div>
                            <div class="task-meta-item">
                                <i class="fas fa-users"></i>
                                <span>${completedCount}/${totalSlots}</span>
                            </div>
                            <div class="task-meta-item">
                                <i class="fas fa-chart-line"></i>
                                <span>Active</span>
                            </div>
                        </div>

                        <div class="task-platforms">
                            ${platformTags}
                        </div>

                        <div class="task-progress">
                            <div class="progress-header">
                                <span class="progress-title">Completed</span>
                                <span class="progress-percentage">${progressPercentage.toFixed(0)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                            </div>
                        </div>



                        ${userSubmitted ? `
                            <div class="user-submission">
                                <div class="submission-header">
                                    <span class="submission-user">Your Submission</span>
                                    <span class="submission-status ${userSubmitted.status || 'pending'}">
                                        ${getStatusText(userSubmitted.status || 'pending')}
                                    </span>
                                </div>
                                <div class="submission-amount">
                                    Earned: $${userSubmitted.status === 'approved' ? task.reward : '0.00'}
                                </div>
                            </div>
                        ` : ''}

                        <div class="task-footer">
                            <button class="task-action-btn" 
                                    onclick="handleTaskAction('${task.id}')"
                                    ${userSubmitted ? 'disabled' : ''}
                                    ${isTaskFull ? 'disabled' : ''}>
                                <i class="fas ${userSubmitted ? 'fa-check' : isTaskFull ? 'fa-ban' : 'fa-play'}"></i>
                                ${userSubmitted ? 'Already Submitted' : isTaskFull ? 'Task Full' : 'Start Work'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        tasksContainer.innerHTML = tasksHTML;

        // Setup refresh button
        setupRefreshButton();

    } catch (error) {
        console.error('Error loading tasks:', error);
        tasksContainer.innerHTML = `
            <div class="no-tasks">
                <div class="no-tasks-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>কোনো টাস্ক নেই</h3>
                <p>এই মুহূর্তে কোনো টাস্ক উপলব্ধ নেই। নতুন টাস্কের জন্য পরে দেখুন।</p>
            </div>
        `;
    }
}

// Helper function to get time ago
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Helper function to get status text
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pending',
        'approved': 'Approved',
        'rejected': 'Rejected'
    };
    return statusMap[status] || 'Pending';
}

// Handle task action with loading animation
async function handleTaskAction(taskId) {
    if (!currentUser) {
        alert('প্রথমে লগইন করুন');
        return;
    }

    // Show loading animation on button
    const clickedButton = event.target;
    const originalContent = clickedButton.innerHTML;

    clickedButton.classList.add('loading');
    clickedButton.innerHTML = '';

    // Show page transition overlay
    showPageTransition('Loading Task Details...');

    try {
        // Add realistic loading delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const taskSnapshot = await database.ref(`tasks/${taskId}`).once('value');
        const task = taskSnapshot.val();

        if (task) {
            hidePageTransition();
            showTaskSubmissionModal(taskId, task);
        } else {
            hidePageTransition();
            alert('Task not found!');
        }
    } catch (error) {
        console.error('Error loading task:', error);
        hidePageTransition();
        alert('Failed to load task. Please try again.');
    } finally {
        // Reset button state
        clickedButton.classList.remove('loading');
        clickedButton.innerHTML = originalContent;
    }
}

// Show page transition overlay
function showPageTransition(message = 'Loading...') {
    const overlay = document.getElementById('pageTransitionOverlay');
    const textElement = overlay.querySelector('.transition-text');

    if (textElement) {
        textElement.innerHTML = `
            ${message}
            <div class="transition-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Hide page transition overlay
function hidePageTransition() {
    const overlay = document.getElementById('pageTransitionOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Setup refresh button
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshTasks');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadTasks();
        });
    }
}

// Function to update user balance from Firebase
async function updateUserBalance() {
    const balanceElement = document.getElementById('userBalance');

    try {
        const snapshot = await database.ref(`users/${currentUser.uid}/balance`).once('value');
        const balance = snapshot.val() || 0;

        if (balanceElement) {
            balanceElement.textContent = `$${balance.toFixed(2)}`;
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
        if (balanceElement) {
            balanceElement.textContent = '$0.00';
        }
    }
}

// Setup balance monitoring
function setupBalanceMonitoring() {
    database.ref(`users/${currentUser.uid}/balance`).on('value', (snapshot) => {
        const balance = snapshot.val() || 0;
        const balanceElement = document.getElementById('userBalance');
        if (balanceElement) {
            balanceElement.textContent = `$${balance.toFixed(2)}`;
        }
    });
}

// Advanced dollar management system for users
async function addDollarToUser(userId, amount, reason, adminId) {
    try {
        const userRef = database.ref(`users/${userId}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();

        if (!userData) {
            throw new Error('User not found');
        }

        const currentBalance = userData.balance || 0;
        const newBalance = currentBalance + amount;

        // Update user balance
        await userRef.update({ balance: newBalance });

        // Log transaction
        const transactionRef = database.ref('transactions').push();
        await transactionRef.set({
            userId: userId,
            userName: userData.name,
            userEmail: userData.email,
            adminId: adminId,
            type: 'credit',
            amount: amount,
            reason: reason,
            previousBalance: currentBalance,
            newBalance: newBalance,
            timestamp: Date.now(),
            status: 'completed'
        });

        // Create notification for user
        const notificationRef = database.ref('user_notifications').push();
        await notificationRef.set({
            userId: userId,
            type: 'balance_credit',
            title: 'অ্যাকাউন্টে টাকা যোগ হয়েছে',
            message: `আপনার অ্যাকাউন্টে $${amount.toFixed(2)} যোগ করা হয়েছে। কারণ: ${reason}`,
            amount: amount,
            timestamp: Date.now(),
            read: false
        });

        return {
            success: true,
            newBalance: newBalance,
            transactionId: transactionRef.key
        };

    } catch (error) {
        console.error('Error adding dollar to user:', error);
        throw error;
    }
}

// Function to deduct dollars from user
async function deductDollarFromUser(userId, amount, reason, adminId) {
    try {
        const userRef = database.ref(`users/${userId}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val();

        if (!userData) {
            throw new Error('User not found');
        }

        const currentBalance = userData.balance || 0;

        if (currentBalance < amount) {
            throw new Error('Insufficient balance');
        }

        const newBalance = currentBalance - amount;

        // Update user balance
        await userRef.update({ balance: newBalance });

        // Log transaction
        const transactionRef = database.ref('transactions').push();
        await transactionRef.set({
            userId: userId,
            userName: userData.name,
            userEmail: userData.email,
            adminId: adminId,
            type: 'debit',
            amount: amount,
            reason: reason,
            previousBalance: currentBalance,
            newBalance: newBalance,
            timestamp: Date.now(),
            status: 'completed'
        });

        // Create notification for user
        const notificationRef = database.ref('user_notifications').push();
        await notificationRef.set({
            userId: userId,
            type: 'balance_debit',
            title: 'অ্যাকাউন্ট থেকে টাকা কাটা হয়েছে',
            message: `আপনার অ্যাকাউন্ট থেকে $${amount.toFixed(2)} কাটা হয়েছে। কারণ: ${reason}`,
            amount: amount,
            timestamp: Date.now(),
            read: false
        });

        return {
            success: true,
            newBalance: newBalance,
            transactionId: transactionRef.key
        };

    } catch (error) {
        console.error('Error deducting dollar from user:', error);
        throw error;
    }
}

// Function to get user transaction history
async function getUserTransactions(userId) {
    try {
        const transactionsSnapshot = await database.ref('transactions')
            .orderByChild('userId')
            .equalTo(userId)
            .once('value');

        const transactions = transactionsSnapshot.val() || {};

        return Object.keys(transactions).map(key => ({
            id: key,
            ...transactions[key]
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    } catch (error) {
        console.error('Error getting user transactions:', error);
        return [];
    }
}

// Function to process task reward automatically
async function processTaskReward(submissionId, taskId, userId, approve = true) {
    try {
        const taskSnapshot = await database.ref(`tasks/${taskId}`).once('value');
        const task = taskSnapshot.val();

        if (!task) {
            throw new Error('Task not found');
        }

        const submissionRef = database.ref(`submissions/${submissionId}`);

        if (approve) {
            const reward = task.reward || 0;

            // Add reward to user balance
            const result = await addDollarToUser(
                userId, 
                reward, 
                `Task completion reward for: ${task.title}`, 
                'system'
            );

            // Update submission status
            await submissionRef.update({
                status: 'approved',
                approvedAt: Date.now(),
                rewardPaid: reward
            });

            return {
                success: true,
                reward: reward,
                newBalance: result.newBalance
            };
        } else {
            // Reject submission
            await submissionRef.update({
                status: 'rejected',
                rejectedAt: Date.now(),
                rewardPaid: 0
            });

            return {
                success: true,
                reward: 0
            };
        }

    } catch (error) {
        console.error('Error processing task reward:', error);
        throw error;
    }
}

// Task Submission Modal Functions
function showTaskSubmissionModal(taskId, task) {
    document.getElementById('taskModalTitle').textContent = task.title;

    // Populate task content
    const taskContent = document.getElementById('taskModalContent');
    taskContent.innerHTML = `
        ${task.bannerImage ? `<img src="${task.bannerImage}" alt="Task Banner" style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 20px;">` : ''}
        <div class="task-details">
            <h4>${task.title}</h4>
            <p>${task.description}</p>
            <div style="display: flex; gap: 20px; margin: 15px 0;">
                <span><i class="fas fa-dollar-sign"></i> <strong>$${task.reward}</strong></span>
                <span><i class="fas fa-users"></i> ${Object.keys(task.submissions || {}).length}/${task.maxSubmissions || 100}</span>
            </div>
            ${task.requirements ? `
                <div class="task-requirements">
                    <h5><i class="fas fa-list-check"></i> Requirements</h5>
                    <div class="requirements-content">${task.requirements}</div>
                </div>
            ` : ''}
            ${task.googleDriveLink ? `
                <div class="task-assets">
                    <h5><i class="fas fa-download"></i> Download Assets</h5>
                    <a href="${task.googleDriveLink}" target="_blank" class="assets-btn">
                        <i class="fab fa-google-drive"></i> Google Drive Assets
                    </a>
                </div>
            ` : ''}
        </div>
    `;

    // Populate platform options
    const platformOptions = document.getElementById('platformOptions');
    const platforms = task.platforms || ['web'];
    platformOptions.innerHTML = platforms.map(platform => `
        <label class="platform-option">
            <input type="radio" name="platform" value="${platform}" ${platforms.length === 1 ? 'checked' : ''}>
            <span>${platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
        </label>
    `).join('');

    // Store task ID for submission
    document.getElementById('taskSubmissionModal').dataset.taskId = taskId;

    // Setup submission form
    setupSubmissionForm();

    // Show modal
    document.getElementById('taskSubmissionModal').classList.add('active');
}

function hideTaskModal() {
    document.getElementById('taskSubmissionModal').classList.remove('active');
    // Reset form
    document.getElementById('submissionDescription').value = '';
    document.getElementById('submissionLink1').value = '';
    document.getElementById('additionalLinks').innerHTML = '';
}

function setupSubmissionForm() {
    // Add link functionality
    let linkCount = 1;
    document.getElementById('addLinkBtn').onclick = () => {
        linkCount++;
        const additionalLinks = document.getElementById('additionalLinks');
        const linkDiv = document.createElement('div');
        linkDiv.className = 'additional-link';
        linkDiv.innerHTML = `
            <input type="url" class="form-input" placeholder="https://example.com/additional-content">
            <button type="button" class="remove-link-btn" onclick="this.parentElement.remove()">
                <i class="fas fa-trash"></i>
            </button>
        `;
        additionalLinks.appendChild(linkDiv);
    };

    // Submit task functionality
    document.getElementById('submitTaskBtn').onclick = submitTask;
}

async function submitTask() {
    const modal = document.getElementById('taskSubmissionModal');
    const taskId = modal.dataset.taskId;
    const description = document.getElementById('submissionDescription').value.trim();
    const mainLink = document.getElementById('submissionLink1').value.trim();
    const selectedPlatform = document.querySelector('input[name="platform"]:checked');
    const submitBtn = document.getElementById('submitTaskBtn');

    // Validation
    const errors = [];

    if (!mainLink) {
        errors.push('Please provide at least one submission link');
    }

    if (!selectedPlatform) {
        errors.push('Please select a platform');
    }

    // Validate URL format
    if (mainLink && !isValidURL(mainLink)) {
        errors.push('Please provide a valid URL');
    }

    if (errors.length > 0) {
        showValidationErrors(errors);
        return;
    }

    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;

    // Collect all links
    const links = [mainLink];
    document.querySelectorAll('#additionalLinks input').forEach(input => {
        if (input.value.trim() && isValidURL(input.value.trim())) {
            links.push(input.value.trim());
        }
    });

    try {
        // Get task details for reward
        const taskSnapshot = await database.ref(`tasks/${taskId}`).once('value');
        const task = taskSnapshot.val();

        const submissionData = {
            userId: currentUser.uid,
            userName: currentUser.name,
            userEmail: currentUser.email,
            taskId: taskId,
            taskTitle: task.title,
            description: description,
            submissionLinks: links,
            platform: selectedPlatform.value,
            status: 'pending',
            reward: task.reward,
            submittedAt: Date.now()
        };

        // Save submission
        const newSubmissionRef = database.ref('submissions').push();
        await newSubmissionRef.set(submissionData);

        // Update task submissions count
        await database.ref(`tasks/${taskId}/submissions/${currentUser.uid}`).set({
            submissionId: newSubmissionRef.key,
            status: 'pending',
            submittedAt: Date.now()
        });

        hideTaskModal();

        // Show success message
        showSuccessMessage('Task submitted successfully! You will be notified once it\'s reviewed.');

        // Reload tasks to update UI (this will hide the completed task)
        loadTasks();

    } catch (error) {
        console.error('Error submitting task:', error);
        alert('Failed to submit task. Please try again.');
    } finally {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Task';
        submitBtn.disabled = false;
    }
}

function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function showValidationErrors(errors) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-errors';
    errorDiv.innerHTML = `
        <div class="error-header">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Please fix the following errors:</span>
        </div>
        <ul>
            ${errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
    `;

    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
        z-index: 10001;
        max-width: 400px;
        font-size: 0.9rem;
        animation: slideInRight 0.3s ease;
    `;

    // Style the error content
    const style = document.createElement('style');
    style.textContent = `
        .validation-errors .error-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 700;
            margin-bottom: 12px;
        }
        .validation-errors ul {
            margin: 0;
            padding-left: 20px;
        }
        .validation-errors li {
            margin-bottom: 5px;
        }
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            errorDiv.remove();
            style.remove();
        }, 300);
    }, 5000);
}

// Profile Modal Functions
function showUserProfileModal() {
    if (!currentUser) {
        alert('Please log in first');
        return;
    }

    // Generate 7-digit user ID based on user's unique data
    const generateDisplayUserId = (userData) => {
        if (userData.customId) return userData.customId;

        // Create a unique 7-digit ID based on user's email and creation time
        const emailHash = userData.email ? userData.email.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0) : 0;

        const timeHash = userData.createdAt ? userData.createdAt : Date.now();
        const combined = Math.abs(emailHash + timeHash);
        const sevenDigitId = (1000000 + (combined % 9000000)).toString();

        return sevenDigitId;
    };

    // Populate profile data
    document.getElementById('profileUserName').textContent = currentUser.name || 'Unknown';
    document.getElementById('profileEmail').textContent = currentUser.email || 'Unknown';
    document.getElementById('profileUserId').textContent = generateDisplayUserId(currentUser);

    // Set profile picture
    const profileImageLarge = document.getElementById('profileImageLarge');
    const profilePlaceholderLarge = document.querySelector('.profile-placeholder-large');

    if (currentUser.profilePicture) {
        profileImageLarge.src = currentUser.profilePicture;
        profileImageLarge.style.display = 'block';
        profilePlaceholderLarge.style.display = 'none';
    } else {
        profileImageLarge.style.display = 'none';
        profilePlaceholderLarge.style.display = 'flex';
    }

    // Load current balance
    updateProfileBalance();

    // Show modal
    document.getElementById('userProfileModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideProfileModal() {
    document.getElementById('userProfileModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function updateProfileBalance() {
    try {
        const snapshot = await database.ref(`users/${currentUser.uid}/balance`).once('value');
        const balance = snapshot.val() || 0;
        document.getElementById('profileBalance').textContent = `$${balance.toFixed(2)}`;
    } catch (error) {
        console.error('Error fetching balance for profile:', error);
        document.getElementById('profileBalance').textContent = '$0.00';
    }
}

function copyUserId() {
    const userId = document.getElementById('profileUserId').textContent;
    navigator.clipboard.writeText(userId).then(() => {
        // Show success feedback
        const copyBtn = document.getElementById('copyUserIdBtn');
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        copyBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';

        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
        alert('Failed to copy User ID');
    });
}

// Update header profile picture click to open profile modal
function updateHeaderProfilePicture() {
    const headerProfileImage = document.getElementById('headerProfileImage');
    const profilePictureHeader = document.getElementById('profilePictureHeader');

    if (currentUser && currentUser.profilePicture) {
        headerProfileImage.src = currentUser.profilePicture;
        headerProfileImage.style.display = 'block';
    } else {
        headerProfileImage.style.display = 'none';
    }

    // Add click event to profile picture
    if (profilePictureHeader) {
        profilePictureHeader.style.cursor = 'pointer';
        profilePictureHeader.addEventListener('click', showUserProfileModal);
    }
}

// New function to setup header profile click event
function setupHeaderProfileClick() {
    const profilePictureHeader = document.getElementById('profilePictureHeader');
    if (profilePictureHeader) {
        profilePictureHeader.style.cursor = 'pointer';
        profilePictureHeader.addEventListener('click', showUserProfileModal);
    }
}

// Enhanced Drawer System
function setupNotificationSystem() {
    const notificationBtn = document.getElementById('notificationBtn');

    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openNotificationDrawer();
    });

    // Load initial notifications
    loadNotifications();
}

function openNotificationDrawer() {
    const drawer = document.getElementById('notificationDrawer');
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadNotificationsInDrawer();

    // Close on overlay click
    drawer.addEventListener('click', (e) => {
        if (e.target === drawer) {
            closeNotificationDrawer();
        }
    });
}

function closeNotificationDrawer() {
    const drawer = document.getElementById('notificationDrawer');
    drawer.classList.remove('active');
    document.body.style.overflow = '';
}

function openMoreMenuDrawer() {
    const drawer = document.getElementById('moreMenuDrawer');
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Close on overlay click
    drawer.addEventListener('click', (e) => {
        if (e.target === drawer) {
            closeMoreMenuDrawer();
        }
    });
}

function closeMoreMenuDrawer() {
    const drawer = document.getElementById('moreMenuDrawer');
    drawer.classList.remove('active');
    document.body.style.overflow = '';
}

// Load notification page with full task details
async function loadNotificationPage() {
    const notificationContainer = document.getElementById('notificationPageContainer');

    try {
        // Load all tasks for notifications
        const tasksSnapshot = await database.ref('tasks').orderByChild('createdAt').once('value');
        const tasks = tasksSnapshot.val() || {};

        const tasksArray = Object.keys(tasks).map(key => ({
            id: key,
            ...tasks[key]
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (tasksArray.length === 0) {
            notificationContainer.innerHTML = `
                <div class="no-notifications">
                    <div class="no-notifications-icon">
                        <i class="fas fa-bell-slash"></i>
                    </div>
                    <h3>কোনো নোটিফিকেশন নেই</h3>
                    <p>এই মুহূর্তে কোনো নোটিফিকেশন উপলব্ধ নেই।</p>
                </div>
            `;
            return;
        }

        let notificationsHTML = '';

        tasksArray.forEach(task => {
            const timeAgo = task.createdAt ? getTimeAgo(task.createdAt) : 'Just now';
            const fullDate = task.createdAt ? new Date(task.createdAt).toLocaleDateString('bn-BD', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'আজ';

            // Generate auto link for task
            const taskAutoLink = `https://www.realtasker.com/task/${task.id}`;

            notificationsHTML += `
                <div class="notification-task-card" onclick="openTaskPage('${task.id}')">
                    ${task.bannerImage ? `
                        <div class="notification-banner-container">
                            <img src="${task.bannerImage}" alt="Task Banner" class="notification-task-banner">
                        </div>
                    ` : ''}

                    <div class="notification-task-content">
                        <div class="notification-task-header">
                            <h3 class="notification-task-title">${task.title}</h3>
                            <span class="notification-task-time">
                                <i class="fas fa-clock"></i>
                                ${timeAgo}
                            </span>
                        </div>

                        <p class="notification-task-description">${task.description}</p>

                        <div class="notification-task-date">
                            <span><i class="fas fa-calendar-alt"></i> Published: ${fullDate}</span>
                        </div>

                        <div class="notification-task-link">
                            <button class="task-link-btn" onclick="event.stopPropagation(); copyTaskLink('${taskAutoLink}')">
                                <i class="fas fa-link"></i>
                                Copy Task Link
                            </button>
                        </div>

                        <div class="notification-task-meta">
                            <span class="reward-amount">
                                <i class="fas fa-dollar-sign"></i>
                                $${task.reward || '0.00'}
                            </span>
                            <span class="task-status">
                                <i class="fas fa-fire"></i>
                                Active
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });

        notificationContainer.innerHTML = notificationsHTML;

    } catch (error) {
        console.error('Error loading notification page:', error);
        notificationContainer.innerHTML = `
            <div class="no-notifications">
                <div class="no-notifications-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>লোড করতে ব্যর্থ</h3>
                <p>নোটিফিকেশন লোড করতে সমস্যা হয়েছে।</p>
            </div>
        `;
    }
}

// Function to copy task link
function copyTaskLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        alert('টাস্ক লিংক কপি হয়েছে!');
    }).catch(err => {
        console.error('Could not copy text: ', err);
        alert('লিংক কপি করতে সমস্যা হয়েছে।');
    });
}

// Function to open individual task page
function openTaskPage(taskId) {
    // For now, redirect to task action
    handleTaskAction(taskId);
}

async function loadNotifications() {
    if (!currentUser || !currentUser.uid) {
        console.log('No current user, skipping notification load');
        return;
    }

    try {
        // Load both submissions and new tasks for notifications
        const [submissionsSnapshot, tasksSnapshot] = await Promise.all([
            database.ref('submissions').orderByChild('userId').equalTo(currentUser.uid).once('value'),
            database.ref('tasks').orderByChild('createdAt').limitToLast(5).once('value')
        ]);

        const submissions = submissionsSnapshot.val() || {};
        const tasks = tasksSnapshot.val() || {};
        const notificationList = document.getElementById('notificationList');
        const notificationCount = document.getElementById('notificationCount');

        const submissionArray = Object.values(submissions)
            .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

        const tasksArray = Object.keys(tasks).map(key => ({
            id: key,
            ...tasks[key]
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Combine notifications
        let allNotifications = [];

        // Add submission notifications
        submissionArray.slice(0, 5).forEach(submission => {
            allNotifications.push({
                type: 'submission',
                data: submission,
                timestamp: submission.submittedAt || 0
            });
        });

        // Add new task notifications (only recent ones - last 24 hours)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        tasksArray.forEach(task => {
            if (task.createdAt > oneDayAgo) {
                allNotifications.push({
                    type: 'new_task',
                    data: task,
                    timestamp: task.createdAt || 0
                });
            }
        });

        // Sort by timestamp
        allNotifications.sort((a, b) => b.timestamp - a.timestamp);
        allNotifications = allNotifications.slice(0, 10);

        if (allNotifications.length === 0) {
            notificationList.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                </div>
            `;
            notificationCount.textContent = '0';
            notificationCount.style.display = 'none';
            return;
        }

        notificationList.innerHTML = allNotifications.map(notification => {
            if (notification.type === 'submission') {
                const submission = notification.data;
                const statusIcon = {
                    'pending': 'fas fa-clock',
                    'approved': 'fas fa-check-circle',
                    'rejected': 'fas fa-times-circle'
                };

                const statusColor = {
                    'pending': '#f59e0b',
                    'approved': '#10b981',
                    'rejected': '#ef4444'
                };

                return `
                    <div class="notification-item ${submission.status === 'pending' ? 'unread' : ''}" onclick="handleTaskAction('${submission.taskId}')">
                        <div class="notification-title">
                            <i class="${statusIcon[submission.status]}" style="color: ${statusColor[submission.status]}"></i>
                            ${submission.taskTitle}
                        </div>
                        <div class="notification-message">
                            Status: ${submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                            ${submission.status === 'approved' ? ` - Earned $${submission.reward}` : ''}
                        </div>
                        <div class="notification-time">
                            ${new Date(submission.submittedAt).toLocaleDateString()}
                        </div>
                    </div>
                `;
            } else {
                const task = notification.data;
                return `
                    <div class="notification-item new-task" onclick="handleTaskAction('${task.id}')">
                        <div class="notification-title">
                            <i class="fas fa-fire" style="color: #e74c3c"></i>
                            ${task.title}
                        </div>
                        <div class="notification-message">
                            New ${task.type === 'admin_update' ? 'Admin Update' : 'Task'} Available - $${task.reward}
                        </div>
                        <div class="notification-time">
                            ${new Date(task.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                `;
            }
        }).join('');

        // Update notification count (pending submissions + new tasks)
        const pendingCount = submissionArray.filter(s => s.status === 'pending').length;
        const newTasksCount = tasksArray.filter(t => t.createdAt > oneDayAgo).length;
        const totalNotifications = pendingCount + newTasksCount;

        notificationCount.textContent = totalNotifications > 0 ? totalNotifications : '';
        notificationCount.style.display = totalNotifications > 0 ? 'block' : 'none';

    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}


// Live Chat Image Handling
document.addEventListener('DOMContentLoaded', () => {
    const liveChatImageInput = document.getElementById('liveChatImageInput');
    if (liveChatImageInput) {
        liveChatImageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await sendLiveImageMessage(file);
            }
        });
    }
});

async function sendLiveImageMessage(file) {
    if (!file) return;

    try {
        const imageDataUrl = await convertImageToDataUrl(file);

        // Add user image message
        const messagesContainer = document.getElementById('liveChatMessages');
        const messageTime = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const messageHTML = `
            <div class="live-message user">
                <div class="live-message-content">
                    <div class="live-message-bubble">
                        <img src="${imageDataUrl}" alt="Sent Image" style="max-width: 200px; border-radius: 12px; cursor: pointer;" onclick="showImageModal('${imageDataUrl}')">
                    </div>
                    <div class="live-message-time">${messageTime}</div>
                </div>
            </div>
        `;

        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        scrollToBottom('liveChatMessages');

        // Show typing indicator and response
        setTimeout(() => {
            showTypingIndicator();
            setTimeout(() => {
                hideTypingIndicator();
                addSupportMessage('ছবি পেয়েছি। আমি দেখে নিচ্ছি এবং শীঘ্রই উত্তর দেব।');
            }, 2000);
        }, 1000);

    } catch (error) {
        console.error('Error sending image:', error);
        showChatToast('Failed to send image. Please try again.', 'error');
    }
}

// Setup real-time listener for live chat title updates
function setupLiveChatTitleListener() {
    database.ref('settings/liveChatTitle').on('value', (snapshot) => {
        const liveChatTitle = snapshot.val();
        if (liveChatTitle) {
            // Update all live chat title elements
            const titleElements = document.querySelectorAll('.bkash-title');
            titleElements.forEach(element => {
                element.textContent = liveChatTitle;
            });

            // Update live chat page titles
            const liveChatPageTitles = document.querySelectorAll('.live-chat-title');
            liveChatPageTitles.forEach(element => {
                element.textContent = 'Live Chat - ' + liveChatTitle;
            });
        }
    });
}

// Admin Login Setup
function setupAdminLogin() {
    // Admin login functionality placeholder
    console.log('Admin login setup initialized');
}

// Setup auto-resize functionality
function setupAutoResize() {
    // Auto-resize setup for textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            adjustTextareaHeight(e.target);
        });
    });
}

// Setup chat auto-resize functionality
function setupChatAutoResize() {
    // Load chat contacts when chat page is accessed
    if (document.getElementById('chatPage').classList.contains('active')) {
        loadChatContacts();
    }
}

// Initialize Splash Screen
function initializeSplashScreen() {
    // Splash screen initialization
    console.log('Splash screen initialized');
}

// Check authentication state
function checkAuth() {
    checkAuthState();
}

// Check Authentication State
function checkAdminAuth() {
    const savedAdmin = localStorage.getItem('currentAdmin');
    if (savedAdmin) {
        currentAdmin = JSON.parse(savedAdmin);
        document.getElementById('adminUserName').textContent = currentAdmin.name;
        showPage('adminDashboard');
        loadDashboardStats();
    } else {
        showPage('adminLoginPage');
    }
}


// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupPinInputs('#pinPage');
    setupPinInputs('#pinSetupPage');
    setupPinInputs('#pinConfirmPage');
    setupDobDropdowns();
    setupProfilePictureUpload();
    setupAdminLogin();
    setupAuthFlow();
    setupPinPage();
    setupSignupFlow();
    setupHomePage();
    setupBackButtons();
    setupLogoutButtons();
    setupGoogleSignIn();
    setupAutoResize();

    // Setup chat functionality
    if (typeof setupChatAutoResize === 'function') {
        setupChatAutoResize();
    }

    // Setup live chat title listener
    setupLiveChatTitleListener();

    // Initialize splash screen
    initializeSplashScreen();

    // Check authentication
    checkAuth();
});