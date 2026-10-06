// ==========================================
// MONEYTRACK - SUPABASE CONFIGURATION
// ==========================================

// Supabase → Settings → API Keys
// Use the PUBLISHABLE key.
// NEVER use the secret/service_role key here.

const SUPABASE_URL = "https://ciivqmmydlgbcqyrbxkm.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_Cq9XkGGWvEwLJQz-a7stfg__yjNQc9I";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ==========================================
// GLOBAL VARIABLES
// ==========================================

let incomeExpenseChart = null;
let categoryChart = null;

let editingTransactionId = null;
let transactionCache = null;
let passwordRecoveryPending = false;
let passwordRecoveryCallback = false;

let currentUser = null;
let preferredCurrency = "INR";
let preferredDateLocale = "en-IN";
let preferredTheme = "light";

const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const SUPPORTED_DATE_LOCALES = ["en-IN", "en-US", "en-CA"];
const SUPPORTED_THEMES = ["light", "dark"];
const DEFAULT_CATEGORIES = [
    "Food",
    "Travel",
    "Shopping",
    "Bills",
    "Education",
    "Entertainment",
    "Salary",
    "Pocket Money",
    "Other"
];
const BUDGET_CATEGORIES = [
    "Food",
    "Travel",
    "Shopping",
    "Bills",
    "Education",
    "Entertainment",
    "Other"
];
const RECURRING_FREQUENCIES = ["weekly", "monthly"];
const SUPPORTED_AVATARS = [
    "initials",
    "😊",
    "🌟",
    "🎯",
    "💼",
    "🌱"
];
const CURRENCY_LOCALES = {
    INR: "en-IN",
    USD: "en-US",
    EUR: "de-DE",
    GBP: "en-GB"
};

function getCustomCategories() {

    const saved = currentUser?.user_metadata?.customCategories;

    if (!Array.isArray(saved)) {
        return [];
    }

    const seen = new Set(DEFAULT_CATEGORIES.map(category => category.toLowerCase()));

    return saved
        .filter(category => typeof category === "string")
        .map(category => category.trim().slice(0, 40))
        .filter(category => {
            const normalized = category.toLowerCase();
            if (!category || normalized === "__proto__" || seen.has(normalized)) {
                return false;
            }
            seen.add(normalized);
            return true;
        });
}

function getTransactionCategories() {
    return [...DEFAULT_CATEGORIES, ...getCustomCategories()];
}

function getBudgetCategories() {
    return [...BUDGET_CATEGORIES, ...getCustomCategories()];
}

function setSelectOptions(select, categories, selectedValue) {

    if (!select) {
        return;
    }

    const preserveUnavailable = selectedValue !== undefined;
    const selected = preserveUnavailable ? selectedValue : select.value;
    const options = [...categories];

    if (preserveUnavailable && selected && !options.includes(selected)) {
        options.push(selected);
    }

    select.replaceChildren();
    options.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });

    if (selected && options.includes(selected)) {
        select.value = selected;
    }
}

function refreshCategorySelects() {

    setSelectOptions(
        document.getElementById("category"),
        getTransactionCategories()
    );
    setSelectOptions(
        document.getElementById("budgetCategory"),
        getBudgetCategories()
    );
    setSelectOptions(
        document.getElementById("recurringCategory"),
        getTransactionCategories()
    );
}

async function saveAccountMetadata(values) {

    if (!currentUser) {
        throw new Error("Your session has expired. Please log in again.");
    }

    const { data, error } =
        await supabaseClient.auth.updateUser({
            data: {
                ...currentUser.user_metadata,
                ...values
            }
        });

    if (error) {
        throw error;
    }

    currentUser = data.user;
}


// ==========================================
// AUTHENTICATION - SIGN UP
// ==========================================

function formatSignupError(error) {

    const errorMessage =
        String(error?.message || error || "");

    if (/confirmation email|email sending|error sending/i.test(errorMessage)) {
        return "Supabase could not send the confirmation email. Email delivery may be unavailable or restricted. Check the project's Authentication email settings, then try again.";
    }

    if (/email address not authorized|recipient.*inactive|inactive.*address/i.test(errorMessage)) {
        return "Supabase could not send email to this address. Its built-in email service only allows approved addresses; the project owner needs to configure email delivery.";
    }

    return errorMessage || "Could not create your account. Please try again.";
}

async function signup() {

    const name =
        document.getElementById("signupName").value.trim();

    const email =
        document.getElementById("signupEmail").value.trim();

    const password =
        document.getElementById("signupPassword").value;

    const message =
        document.getElementById("authMessage");


    if (!name || !email || !password) {

        message.style.color = "#dc2626";
        message.textContent =
            "Please fill in all fields.";

        return;
    }


    if (password.length < 6) {

        message.style.color = "#dc2626";
        message.textContent =
            "Password must be at least 6 characters.";

        return;
    }


    message.style.color = "#6b7280";
    message.textContent =
        "Creating your account...";


    try {
        const { data, error } =
            await supabaseClient.auth.signUp({

                email: email,

                password: password,

                options: {
                    data: {
                        name: name
                    }
                }

            });

        if (error) {

            console.error("Could not create account:", error);
            message.style.color = "#dc2626";
            message.textContent = formatSignupError(error);
            return;
        }

        message.style.color = "#16a34a";

        message.textContent =
            "Account created. Check your email for a confirmation link before signing in.";

        document.getElementById("signupName").value = "";
        document.getElementById("signupEmail").value = "";
        document.getElementById("signupPassword").value = "";
    } catch (error) {

        console.error("Could not create account:", error);
        message.style.color = "#dc2626";
        message.textContent = formatSignupError(error);
    }
}


// ==========================================
// LOGIN
// ==========================================

async function login() {

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    const message =
        document.getElementById("authMessage");


    if (!email || !password) {

        message.style.color = "#dc2626";
        message.textContent =
            "Please enter your email and password.";

        return;
    }


    message.style.color = "#6b7280";
    message.textContent =
        "Logging in...";


    const { data, error } =
        await supabaseClient.auth.signInWithPassword({

            email: email,

            password: password

        });


    if (error) {

        message.style.color = "#dc2626";
        message.textContent =
            error.message;

        return;
    }


    if (data && data.user) {

        await openApp(data.user);

    }

}

function isPasswordRecoveryCallback() {

    const parameters = new URLSearchParams(
        `${window.location.search.slice(1)}&${window.location.hash.slice(1)}`
    );

    return parameters.get("type") === "recovery";
}

function showForgotPassword() {

    document.getElementById("authTabs").classList.add("hidden");
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("signupForm").classList.add("hidden");
    document.getElementById("forgotPasswordForm").classList.remove("hidden");
    document.getElementById("passwordRecoveryForm").classList.add("hidden");
    document.getElementById("loginTab").classList.remove("active");
    document.getElementById("signupTab").classList.remove("active");
    document.getElementById("authMessage").textContent = "";

    const email =
        document.getElementById("loginEmail").value.trim();

    if (email) {
        document.getElementById("resetEmail").value = email;
    }
}

function showPasswordRecovery() {

    document.getElementById("authTabs").classList.add("hidden");
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("signupForm").classList.add("hidden");
    document.getElementById("forgotPasswordForm").classList.add("hidden");
    document.getElementById("passwordRecoveryForm").classList.remove("hidden");
    document.getElementById("loginTab").classList.add("hidden");
    document.getElementById("signupTab").classList.add("hidden");
    document.getElementById("authMessage").textContent = "";
    document.getElementById("authPage").classList.remove("hidden");
    document.getElementById("appPage").classList.add("hidden");

    if (["http:", "https:"].includes(window.location.protocol)) {
        window.history.replaceState(
            null,
            document.title,
            window.location.pathname
        );
    }
}

async function sendPasswordReset() {

    const emailInput =
        document.getElementById("resetEmail");

    const button =
        document.getElementById("sendResetLinkButton");

    const message =
        document.getElementById("authMessage");

    const email = emailInput.value.trim();

    if (!email || !emailInput.validity.valid) {
        message.textContent = "Please enter a valid email address.";
        emailInput.focus();
        return;
    }

    button.disabled = true;
    button.textContent = "Sending...";
    message.style.color = "#6b7280";
    message.textContent = "Sending password reset link...";

    try {
        const currentUrl = new URL(window.location.href);
        currentUrl.hash = "";
        currentUrl.search = "";

        const options = ["http:", "https:"].includes(window.location.protocol)
            ? { redirectTo: currentUrl.toString() }
            : undefined;

        const { error } =
            await supabaseClient.auth.resetPasswordForEmail(email, options);

        if (error) {
            console.error("Could not send password reset email:", error);
            message.style.color = "#dc2626";
            message.textContent = error.message;
            return;
        }

        message.style.color = "#16a34a";
        message.textContent =
            "If an account exists for that email, a password reset link has been sent.";
    } catch (error) {
        console.error("Could not send password reset email:", error);
        message.style.color = "#dc2626";
        message.textContent =
            `Could not send the reset link: ${error.message}`;
    } finally {
        button.disabled = false;
        button.textContent = "Send Reset Link";
    }
}

async function completePasswordRecovery() {

    const passwordInput =
        document.getElementById("recoveryPassword");

    const confirmInput =
        document.getElementById("recoveryPasswordConfirm");

    const button =
        document.getElementById("saveRecoveryPasswordButton");

    const message =
        document.getElementById("authMessage");

    if (passwordInput.value.length < 6) {
        message.style.color = "#dc2626";
        message.textContent = "Password must be at least 6 characters.";
        passwordInput.focus();
        return;
    }

    if (passwordInput.value !== confirmInput.value) {
        message.style.color = "#dc2626";
        message.textContent = "The passwords do not match.";
        confirmInput.focus();
        return;
    }

    button.disabled = true;
    button.textContent = "Updating...";
    message.textContent = "";

    try {
        const { error } =
            await supabaseClient.auth.updateUser({
                password: passwordInput.value
            });

        if (error) {
            console.error("Could not update password from reset link:", error);
            message.style.color = "#dc2626";
            message.textContent = error.message;
            return;
        }

        const { error: signOutError } =
            await supabaseClient.auth.signOut();

        if (signOutError) {
            console.error(
                "Password was updated, but the recovery session could not be ended:",
                signOutError
            );
        }

        passwordRecoveryPending = false;
        passwordRecoveryCallback = false;
        passwordInput.value = "";
        confirmInput.value = "";
        showLogin();
        message.style.color = "#16a34a";
        message.textContent = signOutError
            ? "Password updated, but the recovery session could not be ended. Sign out before using the new password."
            : "Password updated. You can now sign in with your new password.";
    } catch (error) {
        console.error("Could not update password from reset link:", error);
        message.style.color = "#dc2626";
        message.textContent =
            `Could not update your password: ${error.message}`;
    } finally {
        button.disabled = false;
        button.textContent = "Update Password";
    }
}


// ==========================================
// LOGOUT
// ==========================================

async function logout() {

    await supabaseClient.auth.signOut();
    currentUser = null;
    transactionCache = null;

    document.getElementById("appPage")
        .classList.add("hidden");

    document.getElementById("authPage")
        .classList.remove("hidden");

    document.getElementById("loginEmail").value = "";
    document.getElementById("loginPassword").value = "";

    showLogin();
}


// ==========================================
// LOGIN / SIGNUP TABS
// ==========================================

function showLogin() {

    const authTabs =
        document.getElementById("authTabs");

    const loginForm =
        document.getElementById("loginForm");

    const signupForm =
        document.getElementById("signupForm");

    const forgotPasswordForm =
        document.getElementById("forgotPasswordForm");

    const passwordRecoveryForm =
        document.getElementById("passwordRecoveryForm");

    const loginTab =
        document.getElementById("loginTab");

    const signupTab =
        document.getElementById("signupTab");

    const message =
        document.getElementById("authMessage");


    if (loginForm)
        loginForm.classList.remove("hidden");

    if (authTabs)
        authTabs.classList.remove("hidden");

    if (signupForm)
        signupForm.classList.add("hidden");

    if (forgotPasswordForm)
        forgotPasswordForm.classList.add("hidden");

    if (passwordRecoveryForm)
        passwordRecoveryForm.classList.add("hidden");

    if (loginTab)
        loginTab.classList.add("active");

    if (signupTab)
        signupTab.classList.remove("active");

    if (loginTab)
        loginTab.classList.remove("hidden");

    if (signupTab)
        signupTab.classList.remove("hidden");

    if (message)
        message.textContent = "";
}


function showSignup() {

    const authTabs =
        document.getElementById("authTabs");

    const loginForm =
        document.getElementById("loginForm");

    const signupForm =
        document.getElementById("signupForm");

    const forgotPasswordForm =
        document.getElementById("forgotPasswordForm");

    const passwordRecoveryForm =
        document.getElementById("passwordRecoveryForm");

    const loginTab =
        document.getElementById("loginTab");

    const signupTab =
        document.getElementById("signupTab");

    const message =
        document.getElementById("authMessage");


    if (loginForm)
        loginForm.classList.add("hidden");

    if (authTabs)
        authTabs.classList.remove("hidden");

    if (forgotPasswordForm)
        forgotPasswordForm.classList.add("hidden");

    if (passwordRecoveryForm)
        passwordRecoveryForm.classList.add("hidden");

    if (signupForm)
        signupForm.classList.remove("hidden");

    if (loginTab)
        loginTab.classList.remove("active");

    if (signupTab)
        signupTab.classList.add("active");

    if (loginTab)
        loginTab.classList.remove("hidden");

    if (signupTab)
        signupTab.classList.remove("hidden");

    if (message)
        message.textContent = "";
}


// ==========================================
// GET CURRENT USER
// ==========================================

async function getCurrentUser({ throwOnError = false } = {}) {

    const {
        data,
        error
    } = await supabaseClient.auth.getUser();


    if (error) {

        if (throwOnError) {
            throw error;
        }

        return null;

    }


    return data.user || null;
}


// ==========================================
// OPEN APP
// ==========================================

async function openApp(user) {

    currentUser = user;
    const savedTheme =
        user.user_metadata?.theme ||
        localStorage.getItem(`moneytrack-theme-${user.id}`) ||
        "light";
    preferredTheme =
        SUPPORTED_THEMES.includes(savedTheme)
            ? savedTheme
            : "light";
    applyTheme(preferredTheme);
    preferredCurrency =
        SUPPORTED_CURRENCIES.includes(user.user_metadata?.currency)
            ? user.user_metadata.currency
            : "INR";
    preferredDateLocale =
        SUPPORTED_DATE_LOCALES.includes(user.user_metadata?.dateFormat)
            ? user.user_metadata.dateFormat
            : "en-IN";
    updateAmountPlaceholder();

    const authPage =
        document.getElementById("authPage");

    const appPage =
        document.getElementById("appPage");


    if (authPage)
        authPage.classList.add("hidden");

    if (appPage)
        appPage.classList.remove("hidden");


    const name =
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";


    const welcomeText =
        document.getElementById("welcomeText");

    if (welcomeText) {

        welcomeText.textContent =
            `Hi, ${name}`;

    }

    populateProfile(user);
    refreshCategorySelects();
    refreshSavingsGoalSelect();
    updateSavingsGoalAvailability();
    renderCategoryList();


    const todayDate =
        document.getElementById("todayDate");

    if (todayDate) {

        todayDate.textContent =
            new Date().toLocaleDateString(
                preferredDateLocale,
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );

    }


    const transactionDate =
        document.getElementById("transactionDate");

    if (
        transactionDate &&
        !transactionDate.value
    ) {

        transactionDate.value =
            new Date()
                .toISOString()
                .split("T")[0];

    }


    initializeReportMonth();
    initializeBudgetMonth();
    initializeRecurringDate();
    renderRecurringTemplates();

    await updateDashboard();

    // Always start on Transaction History
    showView("history");
}


// ==========================================
// PROFILE
// ==========================================

function populateProfile(user) {

    const name =
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";

    const profileName =
        document.getElementById("profileName");

    const profileEmail =
        document.getElementById("profileEmail");

    const profileAvatar =
        document.getElementById("profileAvatar");

    const profileMemberSince =
        document.getElementById("profileMemberSince");

    const profileAvatarChoice =
        document.getElementById("profileAvatarChoice");

    const profileCurrency =
        document.getElementById("profileCurrency");

    const profileDateFormat =
        document.getElementById("profileDateFormat");

    const avatar =
        SUPPORTED_AVATARS.includes(user.user_metadata?.avatar)
            ? user.user_metadata.avatar
            : "initials";

    if (profileName) {
        profileName.value = name;
    }

    if (profileEmail) {
        profileEmail.value = user.email || "";
    }

    if (profileAvatar) {
        profileAvatar.textContent =
            avatar === "initials"
                ? name.charAt(0).toUpperCase()
                : avatar;
    }

    if (profileMemberSince) {
        profileMemberSince.value =
            user.created_at
                ? formatDate(user.created_at)
                : "Not available";
    }

    if (profileAvatarChoice) {
        profileAvatarChoice.value = avatar;
    }

    if (profileCurrency) {
        profileCurrency.value = preferredCurrency;
    }

    if (profileDateFormat) {
        profileDateFormat.value = preferredDateLocale;
    }

}

function applyTheme(theme) {

    preferredTheme = theme;
    document.body.dataset.theme = theme;

    if (currentUser) {
        localStorage.setItem(
            `moneytrack-theme-${currentUser.id}`,
            theme
        );
    }

    const lightButton =
        document.getElementById("lightThemeButton");

    const darkButton =
        document.getElementById("darkThemeButton");

    if (lightButton && darkButton) {
        lightButton.classList.toggle("active", theme === "light");
        darkButton.classList.toggle("active", theme === "dark");
        lightButton.setAttribute("aria-pressed", String(theme === "light"));
        darkButton.setAttribute("aria-pressed", String(theme === "dark"));
    }
}

async function setThemePreference(theme) {

    const message =
        document.getElementById("profileMessage");

    if (!SUPPORTED_THEMES.includes(theme)) {
        message.textContent = "Please choose a supported theme.";
        message.className = "profile-message error";
        return;
    }

    if (!currentUser) {
        message.textContent = "Your session has expired. Please log in again.";
        message.className = "profile-message error";
        return;
    }

    applyTheme(theme);
    message.textContent = "Saving appearance preference...";
    message.className = "profile-message";

    const { data, error } =
        await supabaseClient.auth.updateUser({
            data: {
                ...currentUser.user_metadata,
                theme
            }
        });

    if (error) {
        console.error("Could not save appearance preference:", error);
        message.textContent =
            `Theme changed for this device, but could not be saved to your account: ${error.message}`;
        message.className = "profile-message error";
        return;
    }

    currentUser = data.user;
    message.textContent = "Appearance preference saved.";
    message.className = "profile-message success";
}

function previewProfileAvatar() {

    const profileAvatar =
        document.getElementById("profileAvatar");

    const profileAvatarChoice =
        document.getElementById("profileAvatarChoice");

    const profileName =
        document.getElementById("profileName");

    if (!profileAvatar || !profileAvatarChoice) {
        return;
    }

    profileAvatar.textContent =
        profileAvatarChoice.value === "initials"
            ? (profileName?.value.trim().charAt(0) || "U").toUpperCase()
            : profileAvatarChoice.value;
}


async function saveProfile() {

    const profileName =
        document.getElementById("profileName");

    const saveButton =
        document.getElementById("saveProfileButton");

    const message =
        document.getElementById("profileMessage");

    const avatar =
        document.getElementById("profileAvatarChoice").value;

    const currency =
        document.getElementById("profileCurrency").value;

    const dateFormat =
        document.getElementById("profileDateFormat").value;

    const theme =
        preferredTheme;

    const name =
        profileName?.value.trim() || "";

    if (!name) {
        message.textContent = "Please enter your name.";
        message.className = "profile-message error";
        profileName?.focus();
        return;
    }

    if (!currentUser) {
        message.textContent = "Your session has expired. Please log in again.";
        message.className = "profile-message error";
        return;
    }

    if (
        !SUPPORTED_CURRENCIES.includes(currency) ||
        !SUPPORTED_DATE_LOCALES.includes(dateFormat) ||
        !SUPPORTED_AVATARS.includes(avatar) ||
        !SUPPORTED_THEMES.includes(theme)
    ) {
        message.textContent = "Please choose supported profile preferences.";
        message.className = "profile-message error";
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
    message.textContent = "";

    const { data, error } =
        await supabaseClient.auth.updateUser({
            data: {
                ...currentUser.user_metadata,
                name,
                avatar,
                currency,
                dateFormat,
                theme
            }
        });

    saveButton.disabled = false;
    saveButton.textContent = "Save Profile & Preferences";

    if (error) {
        console.error("Could not update profile:", error);
        message.textContent = error.message;
        message.className = "profile-message error";
        return;
    }

    currentUser = data.user;
    preferredCurrency = currency;
    preferredDateLocale = dateFormat;
    applyTheme(theme);
    updateAmountPlaceholder();
    populateProfile(currentUser);

    const welcomeText =
        document.getElementById("welcomeText");

    if (welcomeText) {
        welcomeText.textContent = `Hi, ${name}`;
    }

    const todayDate =
        document.getElementById("todayDate");

    if (todayDate) {
        todayDate.textContent =
            new Date().toLocaleDateString(
                preferredDateLocale,
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );
    }

    await updateDashboard();

    message.textContent = "Profile and preferences updated successfully.";
    message.className = "profile-message success";
}

async function changePassword() {

    const newPassword =
        document.getElementById("newPassword");

    const confirmPassword =
        document.getElementById("confirmPassword");

    const saveButton =
        document.getElementById("changePasswordButton");

    const message =
        document.getElementById("passwordMessage");

    if (!currentUser) {
        message.textContent = "Your session has expired. Please log in again.";
        message.className = "profile-message error";
        return;
    }

    if (newPassword.value.length < 6) {
        message.textContent = "Password must be at least 6 characters.";
        message.className = "profile-message error";
        newPassword.focus();
        return;
    }

    if (newPassword.value !== confirmPassword.value) {
        message.textContent = "The passwords do not match.";
        message.className = "profile-message error";
        confirmPassword.focus();
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Updating...";
    message.textContent = "";

    const { data, error } =
        await supabaseClient.auth.updateUser({
            password: newPassword.value
        });

    saveButton.disabled = false;
    saveButton.textContent = "Update Password";

    if (error) {
        console.error("Could not update password:", error);
        message.textContent = error.message;
        message.className = "profile-message error";
        return;
    }

    currentUser = data.user;
    document.getElementById("passwordForm").reset();
    message.textContent = "Password updated successfully.";
    message.className = "profile-message success";
}

// ==========================================
// GET TRANSACTIONS
// ==========================================

async function getTransactions({ throwOnError = false } = {}) {

    const user =
        await getCurrentUser({ throwOnError });


    if (!user) {

        if (throwOnError) {
            throw new Error(
                "Your session has expired. Please log in again."
            );
        }

        return [];

    }


    const {
        data,
        error
    } = await supabaseClient

        .from("transactions")

        .select("*")

        .eq("user_id", user.id)

        .order("date", {
            ascending: false
        });


    if (error) {

        console.error(
            "Could not load transactions:",
            error
        );

        if (throwOnError) {
            throw error;
        }

        return [];

    }


    return data || [];
}

function initializeBudgetMonth() {

    const monthInput =
        document.getElementById("budgetMonth");

    if (monthInput && !monthInput.value) {
        const now = new Date();
        monthInput.value =
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
}

function getBudgetLimits() {

    const savedBudgets =
        currentUser?.user_metadata?.budgets;

    if (
        !savedBudgets ||
        typeof savedBudgets !== "object" ||
        Array.isArray(savedBudgets)
    ) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(savedBudgets).filter(
            ([category, limit]) =>
                getBudgetCategories().includes(category) &&
                Number.isFinite(Number(limit)) &&
                Number(limit) > 0
        ).map(
            ([category, limit]) =>
                [category, Number(limit)]
        )
    );
}

function getLocalISODate(date = new Date()) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isValidISODate(value) {

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

function advanceRecurringDate(dateValue, frequency, preferredDay) {

    const date = new Date(`${dateValue}T00:00:00Z`);

    if (frequency === "weekly") {
        date.setUTCDate(date.getUTCDate() + 7);
    } else {
        const day = Number.isInteger(preferredDay)
            ? preferredDay
            : date.getUTCDate();
        date.setUTCDate(1);
        date.setUTCMonth(date.getUTCMonth() + 1);
        const lastDay = new Date(
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
        ).getUTCDate();
        date.setUTCDate(Math.min(day, lastDay));
    }

    return date.toISOString().slice(0, 10);
}

function getRecurringTemplates() {

    const saved =
        currentUser?.user_metadata?.recurringTransactions;

    if (!Array.isArray(saved)) {
        return [];
    }

    return saved.filter(template =>
        template &&
        typeof template.id === "string" &&
        ["expense", "income"].includes(template.type) &&
        Number.isFinite(Number(template.amount)) &&
        Number(template.amount) > 0 &&
        getTransactionCategories().includes(template.category) &&
        RECURRING_FREQUENCIES.includes(template.frequency) &&
        isValidISODate(template.nextDate) &&
        (!template.pendingDate || isValidISODate(template.pendingDate))
    ).map(template => ({
        id: template.id,
        type: template.type,
        amount: Number(template.amount),
        category: template.category,
        description: String(template.description || "-"),
        frequency: template.frequency,
        nextDate: template.nextDate,
        reminderDays: [0, 1, 3, 7].includes(Number(template.reminderDays))
            ? Number(template.reminderDays)
            : 3,
        dayOfMonth: Number.isInteger(template.dayOfMonth) &&
            template.dayOfMonth >= 1 &&
            template.dayOfMonth <= 31
                ? template.dayOfMonth
                : Number(template.nextDate.slice(-2)),
        ...(template.pendingDate
            ? { pendingDate: template.pendingDate }
            : {})
    }));
}

async function saveRecurringTemplates(templates) {

    if (!currentUser) {
        throw new Error("Your session has expired. Please log in again.");
    }

    const { data, error } =
        await supabaseClient.auth.updateUser({
            data: {
                ...currentUser.user_metadata,
                recurringTransactions: templates
            }
        });

    if (error) {
        throw error;
    }

    currentUser = data.user;
}

function initializeRecurringDate() {

    const input =
        document.getElementById("recurringNextDate");

    if (input && !input.value) {
        input.value = getLocalISODate();
    }
}

async function saveRecurringTemplate() {

    const form =
        document.getElementById("recurringForm");

    const button =
        document.getElementById("saveRecurringButton");

    const message =
        document.getElementById("recurringMessage");

    const type =
        document.getElementById("recurringType").value;

    const amount =
        Number(document.getElementById("recurringAmount").value);

    const category =
        document.getElementById("recurringCategory").value;

    const frequency =
        document.getElementById("recurringFrequency").value;

    const nextDate =
        document.getElementById("recurringNextDate").value;

    const reminderDays =
        type === "expense"
            ? Number(document.getElementById("recurringReminderDays").value)
            : 0;

    const description =
        document.getElementById("recurringDescription").value.trim() || "-";

    if (!currentUser) {
        message.textContent = "Your session has expired. Please log in again.";
        message.className = "profile-message error";
        return;
    }

    if (
        !["expense", "income"].includes(type) ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !getTransactionCategories().includes(category) ||
        !RECURRING_FREQUENCIES.includes(frequency) ||
        ![0, 1, 3, 7].includes(reminderDays) ||
        !isValidISODate(nextDate)
    ) {
        message.textContent =
            "Enter a valid amount, category, repeat schedule, and first due date.";
        message.className = "profile-message error";
        return;
    }

    button.disabled = true;
    button.textContent = "Saving...";
    message.textContent = "";
    message.className = "profile-message";

    try {
        const templates = getRecurringTemplates();
        templates.push({
            id: makeLocalId(),
            type,
            amount,
            category,
            description,
            frequency,
            nextDate,
            reminderDays,
            dayOfMonth: Number(nextDate.slice(-2))
        });

        await saveRecurringTemplates(templates);
        form.reset();
        initializeRecurringDate();
        renderRecurringTemplates();
        message.textContent =
            type === "expense" && reminderDays > 0
                ? "Recurring item saved. MoneyTrack will remind you in the app and ask you to confirm it when due."
                : "Recurring item saved. MoneyTrack will ask you to confirm it when due.";
        message.className = "profile-message success";
    } catch (error) {
        console.error("Could not save recurring item:", error);
        message.textContent =
            `Could not save recurring item: ${error.message}`;
        message.className = "profile-message error";
    } finally {
        button.disabled = false;
        button.textContent = "Save recurring item";
    }
}

function renderRecurringTemplates() {

    const list =
        document.getElementById("recurringList");

    const empty =
        document.getElementById("recurringEmptyMessage");

    if (!list || !empty) {
        return;
    }

    const templates = getRecurringTemplates();
    const today = getLocalISODate();

    list.replaceChildren();
    empty.classList.toggle("hidden", templates.length > 0);

    templates.forEach(template => {

        const dueDate = template.pendingDate || template.nextDate;
        const daysUntil = daysUntilISO(today, dueDate);
        const dueNow = daysUntil <= 0;
        const needsReminder =
            template.type === "expense" &&
            template.reminderDays > 0 &&
            daysUntil <= template.reminderDays;
        const card = document.createElement("article");
        card.className =
            `recurring-card${dueNow ? " recurring-card-due" : needsReminder ? " recurring-card-reminder" : ""}`;

        const details = document.createElement("div");
        details.className = "recurring-card-details";

        const title = document.createElement("h3");
        title.textContent = template.description === "-"
            ? template.category
            : template.description;

        const kind = document.createElement("span");
        kind.className = template.type === "income"
            ? "income-text"
            : "expense-text";
        kind.textContent =
            `${template.type === "income" ? "Income" : "Expense"} · ${template.category}`;

        const schedule = document.createElement("p");
        schedule.textContent =
            `${template.frequency === "weekly" ? "Weekly" : "Monthly"} · ` +
            `${template.pendingDate ? "Confirmation pending" : `Next due ${formatDate(template.nextDate)}`}` +
            (template.type === "expense" && template.reminderDays > 0
                ? ` · Reminder ${template.reminderDays} ${template.reminderDays === 1 ? "day" : "days"} before`
                : "");

        const amount = document.createElement("strong");
        amount.textContent = formatMoney(template.amount);
        details.append(title, kind, schedule);

        const actions = document.createElement("div");
        actions.className = "recurring-card-actions";

        if (dueNow) {
            const confirmButton = document.createElement("button");
            confirmButton.type = "button";
            confirmButton.className = "primary-btn recurring-confirm-btn";
            confirmButton.dataset.recurringId = template.id;
            confirmButton.textContent = template.pendingDate
                ? "Retry adding"
                : "Review & add";
            confirmButton.addEventListener(
                "click",
                () => confirmRecurringOccurrence(template.id)
            );
            actions.appendChild(confirmButton);
        }

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "budget-remove-btn";
        removeButton.textContent = "Remove";
        removeButton.addEventListener(
            "click",
            () => removeRecurringTemplate(template.id)
        );
        actions.appendChild(removeButton);

        const amountArea = document.createElement("div");
        amountArea.className = "recurring-card-amount";
        amountArea.append(amount, actions);
        card.append(details, amountArea);
        list.appendChild(card);
    });

    renderBillReminders();
}

function daysUntilISO(fromDate, toDate) {
    const from = new Date(`${fromDate}T00:00:00Z`);
    const to = new Date(`${toDate}T00:00:00Z`);
    return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function renderBillReminders() {

    const list = document.getElementById("billReminderList");
    const empty = document.getElementById("billReminderEmpty");

    if (!list || !empty) {
        return;
    }

    const today = getLocalISODate();
    const reminders = getRecurringTemplates()
        .filter(template => {
            if (template.type !== "expense" || template.reminderDays <= 0) {
                return false;
            }
            const dueDate = template.pendingDate || template.nextDate;
            return daysUntilISO(today, dueDate) <= template.reminderDays;
        })
        .sort((left, right) =>
            (left.pendingDate || left.nextDate)
                .localeCompare(right.pendingDate || right.nextDate)
        );

    list.replaceChildren();
    empty.classList.toggle("hidden", reminders.length > 0);

    reminders.forEach(template => {
        const dueDate = template.pendingDate || template.nextDate;
        const daysUntil = daysUntilISO(today, dueDate);
        const item = document.createElement("article");
        item.className = `bill-reminder-item${daysUntil <= 0 ? " bill-reminder-overdue" : ""}`;

        const details = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = template.description === "-"
            ? template.category
            : template.description;
        const date = document.createElement("span");
        date.textContent = daysUntil < 0
            ? `Overdue · ${formatDate(dueDate)}`
            : daysUntil === 0
                ? "Due today"
                : `Due in ${daysUntil} ${daysUntil === 1 ? "day" : "days"}`;
        details.append(title, date);

        const amount = document.createElement("strong");
        amount.className = "bill-reminder-amount";
        amount.textContent = formatMoney(template.amount);
        item.append(details, amount);
        list.appendChild(item);
    });
}

async function removeRecurringTemplate(id) {

    if (!currentUser) {
        return;
    }

    if (!confirm("Remove this recurring item? This will not change past transactions.")) {
        return;
    }

    const message =
        document.getElementById("recurringMessage");

    try {
        const templates =
            getRecurringTemplates().filter(template => template.id !== id);
        await saveRecurringTemplates(templates);
        renderRecurringTemplates();
        message.textContent = "Recurring item removed.";
        message.className = "profile-message success";
    } catch (error) {
        console.error("Could not remove recurring item:", error);
        message.textContent =
            `Could not remove recurring item: ${error.message}`;
        message.className = "profile-message error";
    }
}

async function confirmRecurringOccurrence(id) {

    const button =
        [...document.querySelectorAll(".recurring-confirm-btn")]
            .find(candidate => candidate.dataset.recurringId === id);

    const message =
        document.getElementById("recurringMessage");

    const originalTemplates = getRecurringTemplates();
    const template = originalTemplates.find(item => item.id === id);

    if (!template || !currentUser) {
        message.textContent = "This recurring item is no longer available.";
        message.className = "profile-message error";
        renderRecurringTemplates();
        return;
    }

    const today = getLocalISODate();
    const occurrenceDate = template.pendingDate || template.nextDate;

    if (!template.pendingDate && occurrenceDate > today) {
        message.textContent = "This recurring item is not due yet.";
        message.className = "profile-message error";
        return;
    }

    const confirmed = confirm(
        `Add this ${template.type} transaction?\n\n` +
        `${template.description === "-" ? template.category : template.description}\n` +
        `${formatMoney(template.amount)} · ${formatDate(occurrenceDate)}`
    );

    if (!confirmed) {
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "Adding...";
    }

    message.textContent = "";
    message.className = "profile-message";

    let templates = originalTemplates;

    if (!template.pendingDate) {
        templates = originalTemplates.map(item =>
            item.id === id
                ? {
                    ...item,
                    nextDate: advanceRecurringDate(
                        item.nextDate,
                        item.frequency,
                        item.dayOfMonth
                    ),
                    pendingDate: occurrenceDate
                }
                : item
        );

        try {
            await saveRecurringTemplates(templates);
        } catch (error) {
            console.error("Could not prepare recurring occurrence:", error);
            message.textContent =
                `Could not prepare this transaction: ${error.message}`;
            message.className = "profile-message error";
            renderRecurringTemplates();
            return;
        }
    }

    const occurrence =
        templates.find(item => item.id === id);

    try {
        const transactions =
            await getTransactions({ throwOnError: true });

        const alreadyRecorded = transactions.some(transaction =>
            transaction.type === occurrence.type &&
            transaction.category === occurrence.category &&
            Number(transaction.amount) === occurrence.amount &&
            transaction.date === occurrenceDate &&
            (transaction.description || "-") === occurrence.description
        );

        if (!alreadyRecorded) {
            const { error } =
                await supabaseClient
                    .from("transactions")
                    .insert({
                        user_id: currentUser.id,
                        type: occurrence.type,
                        amount: occurrence.amount,
                        date: occurrenceDate,
                        category: occurrence.category,
                        description: occurrence.description
                    });

            if (error) {
                throw error;
            }
        }

        const completedTemplates = templates.map(item => {
            if (item.id !== id) {
                return item;
            }

            const { pendingDate, ...completed } = item;
            return completed;
        });

        currentUser = {
            ...currentUser,
            user_metadata: {
                ...currentUser.user_metadata,
                recurringTransactions: completedTemplates
            }
        };

        try {
            await saveRecurringTemplates(completedTemplates);
        } catch (error) {
            console.error("Could not sync completed recurring schedule:", error);
            message.textContent =
                "Transaction added, but the recurring schedule could not sync. Please restore the connection before confirming another occurrence.";
            message.className = "profile-message error";
            renderRecurringTemplates();
            await updateDashboard();
            return;
        }

        renderRecurringTemplates();
        message.textContent = alreadyRecorded
            ? "This transaction was already recorded; the recurring schedule has been updated."
            : "Transaction added to your history.";
        message.className = "profile-message success";
        await updateDashboard();
    } catch (error) {
        console.error("Could not add recurring transaction:", error);
        message.textContent =
            `Could not add this transaction. The occurrence is saved for retry: ${error.message}`;
        message.className = "profile-message error";
        renderRecurringTemplates();
    }
}

async function saveBudgetLimits(budgets) {

    const { data, error } =
        await supabaseClient.auth.updateUser({
            data: {
                ...currentUser.user_metadata,
                budgets
            }
        });

    if (error) {
        throw error;
    }

    currentUser = data.user;
}

async function saveMonthlyBudget() {

    const categoryInput =
        document.getElementById("budgetCategory");

    const limitInput =
        document.getElementById("budgetLimit");

    const saveButton =
        document.getElementById("saveBudgetButton");

    const message =
        document.getElementById("budgetMessage");

    const category = categoryInput.value;
    const limit = Number(limitInput.value);

    if (!currentUser) {
        message.textContent =
            "Your session has expired. Please log in again.";
        message.className = "profile-message error";
        return;
    }

    if (
        !getBudgetCategories().includes(category) ||
        !Number.isFinite(limit) ||
        limit <= 0
    ) {
        message.textContent =
            "Choose an expense category and enter a limit greater than zero.";
        message.className = "profile-message error";
        limitInput.focus();
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
    message.textContent = "";
    message.className = "profile-message";

    try {
        const budgets = getBudgetLimits();
        budgets[category] = limit;
        await saveBudgetLimits(budgets);
        limitInput.value = "";
        const refreshed = await updateBudgets();
        message.textContent = refreshed
            ? `${category} monthly budget saved.`
            : `${category} budget was saved, but spending totals could not be refreshed.`;
        message.className = refreshed
            ? "profile-message success"
            : "profile-message error";
    } catch (error) {
        console.error("Could not save monthly budget:", error);
        message.textContent =
            `Could not save this budget: ${error.message}`;
        message.className = "profile-message error";
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Budget";
    }
}

async function removeMonthlyBudget(category) {

    if (!getBudgetCategories().includes(category) || !currentUser) {
        return;
    }

    if (!confirm(`Remove the ${category} monthly budget?`)) {
        return;
    }

    const message =
        document.getElementById("budgetMessage");

    message.textContent = "Removing budget...";
    message.className = "profile-message";

    try {
        const budgets = getBudgetLimits();
        delete budgets[category];
        await saveBudgetLimits(budgets);
        const refreshed = await updateBudgets();
        message.textContent = refreshed
            ? `${category} monthly budget removed.`
            : `${category} budget was removed, but spending totals could not be refreshed.`;
        message.className = refreshed
            ? "profile-message success"
            : "profile-message error";
    } catch (error) {
        console.error("Could not remove monthly budget:", error);
        message.textContent =
            `Could not remove this budget: ${error.message}`;
        message.className = "profile-message error";
    }
}

async function updateBudgets() {

    initializeBudgetMonth();

    try {
        renderBudgetCards(
            await getTransactions({ throwOnError: true })
        );
        return true;
    } catch (error) {
        console.error("Could not refresh budget totals:", error);
        const cards =
            document.getElementById("budgetCards");
        const summary =
            document.getElementById("budgetSummary");
        const emptyMessage =
            document.getElementById("budgetEmptyMessage");
        const loadError =
            document.getElementById("budgetLoadError");

        cards.replaceChildren();
        summary.replaceChildren();
        emptyMessage.classList.add("hidden");
        loadError.textContent =
            `Could not load transaction data: ${error.message}`;
        loadError.classList.remove("hidden");
        return false;
    }
}

function renderBudgetCards(transactions) {

    const cards =
        document.getElementById("budgetCards");

    const summary =
        document.getElementById("budgetSummary");

    const loadError =
        document.getElementById("budgetLoadError");

    const emptyMessage =
        document.getElementById("budgetEmptyMessage");

    const monthInput =
        document.getElementById("budgetMonth");

    if (!cards || !summary || !emptyMessage) {
        return;
    }

    const budgets = getBudgetLimits();
    const now = new Date();
    const selectedMonth =
        monthInput?.value ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const categories = getBudgetCategories().filter(
        category => budgets[category] > 0
    );

    cards.replaceChildren();
    summary.replaceChildren();
    loadError.classList.add("hidden");
    loadError.textContent = "";
    emptyMessage.classList.toggle("hidden", categories.length > 0);

    if (!categories.length) {
        return;
    }

    let totalLimit = 0;
    let totalSpent = 0;

    categories.forEach(category => {

        const limit = budgets[category];
        const spent = transactions.reduce(
            (sum, transaction) => {
                if (
                    transaction.type === "expense" &&
                    transaction.category === category &&
                    typeof transaction.date === "string" &&
                    transaction.date.startsWith(selectedMonth)
                ) {
                    return sum + (Number(transaction.amount) || 0);
                }

                return sum;
            },
            0
        );

        const remaining = limit - spent;
        const percentage = limit > 0
            ? (spent / limit) * 100
            : 0;
        const state = percentage > 100
            ? "over"
            : percentage >= 80
                ? "near"
                : "on-track";

        totalLimit += limit;
        totalSpent += spent;

        const card = document.createElement("article");
        card.className = `budget-card ${state}`;

        const heading = document.createElement("div");
        heading.className = "budget-card-heading";

        const title = document.createElement("h3");
        title.textContent = category;

        const limitText = document.createElement("span");
        limitText.textContent = `${formatMoney(limit)} limit`;

        heading.append(title, limitText);

        const amounts = document.createElement("div");
        amounts.className = "budget-amounts";

        const spentText = document.createElement("strong");
        spentText.textContent = formatMoney(spent);

        const limitLabel = document.createElement("span");
        limitLabel.textContent = `of ${formatMoney(limit)} spent`;
        amounts.append(spentText, limitLabel);

        const progress = document.createElement("div");
        progress.className = "budget-progress-track";
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-label", `${category} budget used`);
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", "100");
        progress.setAttribute(
            "aria-valuenow",
            String(Math.min(100, Math.round(percentage)))
        );

        const progressFill = document.createElement("div");
        progressFill.className = "budget-progress-fill";
        progressFill.style.width = `${Math.min(100, percentage)}%`;
        progress.appendChild(progressFill);

        const status = document.createElement("p");
        status.className = "budget-status";
        status.textContent = remaining >= 0
            ? `${formatMoney(remaining)} remaining`
            : `${formatMoney(Math.abs(remaining))} over budget`;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "budget-remove-btn";
        removeButton.textContent = "Remove";
        removeButton.setAttribute(
            "aria-label",
            `Remove ${category} budget`
        );
        removeButton.addEventListener(
            "click",
            () => removeMonthlyBudget(category)
        );

        card.append(
            heading,
            amounts,
            progress,
            status,
            removeButton
        );
        cards.appendChild(card);
    });

    const monthLabel = new Date(`${selectedMonth}-01T00:00:00`)
        .toLocaleDateString(preferredDateLocale, {
            month: "long",
            year: "numeric"
        });
    const summaryText = document.createElement("p");
    summaryText.textContent =
        `${monthLabel}: ${formatMoney(totalSpent)} spent across ` +
        `${categories.length} ${categories.length === 1 ? "budget" : "budgets"} ` +
        `with a combined limit of ${formatMoney(totalLimit)}.`;
    summary.appendChild(summaryText);
}


// ==========================================
// ADD TRANSACTION
// ==========================================

function makeLocalId() {
    return window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSavingsGoals() {

    const saved = currentUser?.user_metadata?.savingsGoals;

    if (!Array.isArray(saved)) {
        return [];
    }

    return saved.filter(goal =>
        goal &&
        typeof goal.id === "string" &&
        typeof goal.name === "string" &&
        goal.name.trim().length > 0 &&
        Number.isFinite(Number(goal.target)) &&
        Number(goal.target) > 0 &&
        (!goal.targetDate || isValidISODate(goal.targetDate))
    ).map(goal => ({
        id: goal.id,
        name: goal.name.trim().slice(0, 60),
        target: Number(goal.target),
        targetDate: goal.targetDate || ""
    }));
}

function getSavingsContributions() {

    const saved = currentUser?.user_metadata?.savingsContributions;

    if (!Array.isArray(saved)) {
        return [];
    }

    const seen = new Set();

    return saved.filter(contribution => {
        if (
            !contribution ||
            (typeof contribution.transactionId !== "string" &&
                typeof contribution.transactionId !== "number") ||
            typeof contribution.goalId !== "string"
        ) {
            return false;
        }

        const transactionId = String(contribution.transactionId);
        if (seen.has(transactionId)) {
            return false;
        }
        seen.add(transactionId);
        return true;
    }).map(contribution => ({
        transactionId: String(contribution.transactionId),
        goalId: contribution.goalId
    }));
}

function refreshSavingsGoalSelect(selectedGoalId = "") {

    const select = document.getElementById("transactionSavingsGoal");
    if (!select) {
        return;
    }

    select.replaceChildren();

    const noGoal = document.createElement("option");
    noGoal.value = "";
    noGoal.textContent = "Not linked to a savings goal";
    select.appendChild(noGoal);

    getSavingsGoals().forEach(goal => {
        const option = document.createElement("option");
        option.value = goal.id;
        option.textContent = goal.name;
        select.appendChild(option);
    });

    select.value = selectedGoalId;
}

function updateSavingsGoalAvailability() {

    const type = document.getElementById("transactionType");
    const select = document.getElementById("transactionSavingsGoal");

    if (!type || !select) {
        return;
    }

    select.disabled = type.value !== "expense";

    if (select.disabled) {
        select.value = "";
    }
}

function getGoalContributionTotal(goalId, transactions) {

    const linkedIds = new Set(
        getSavingsContributions()
            .filter(item => item.goalId === goalId)
            .map(item => item.transactionId)
    );

    return transactions.reduce((total, transaction) => {
        if (
            transaction.type === "expense" &&
            linkedIds.has(String(transaction.id))
        ) {
            return total + (Number(transaction.amount) || 0);
        }
        return total;
    }, 0);
}

function renderSavingsGoals(transactions = transactionCache || []) {

    const list = document.getElementById("savingsGoalList");
    const empty = document.getElementById("savingsGoalEmpty");

    if (!list || !empty) {
        return;
    }

    const goals = getSavingsGoals();
    list.replaceChildren();
    empty.classList.toggle("hidden", goals.length > 0);

    goals.forEach(goal => {
        const saved = getGoalContributionTotal(goal.id, transactions);
        const percentage = Math.min(100, saved / goal.target * 100);
        const remaining = Math.max(0, goal.target - saved);
        const card = document.createElement("article");
        card.className = "feature-card savings-goal-card";

        const heading = document.createElement("div");
        heading.className = "feature-card-heading";

        const title = document.createElement("h3");
        title.textContent = goal.name;

        const targetDate = document.createElement("span");
        targetDate.textContent = goal.targetDate
            ? `Target date · ${formatDate(goal.targetDate)}`
            : "No target date";
        heading.append(title, targetDate);

        const amounts = document.createElement("div");
        amounts.className = "feature-card-amounts";
        const current = document.createElement("strong");
        current.textContent = formatMoney(saved);
        const target = document.createElement("span");
        target.textContent = `of ${formatMoney(goal.target)}`;
        amounts.append(current, target);

        const progress = document.createElement("div");
        progress.className = "feature-progress-track";
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-label", `${goal.name} progress`);
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", String(goal.target));
        progress.setAttribute("aria-valuenow", String(Math.min(saved, goal.target)));
        const fill = document.createElement("div");
        fill.className = "feature-progress-fill";
        fill.style.width = `${percentage}%`;
        progress.appendChild(fill);

        const status = document.createElement("p");
        status.className = "feature-card-status";
        status.textContent = remaining > 0
            ? `${formatMoney(remaining)} left to reach your goal`
            : "Goal reached!";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "budget-remove-btn";
        removeButton.textContent = "Remove goal";
        removeButton.addEventListener("click", () => removeSavingsGoal(goal.id));

        card.append(heading, amounts, progress, status, removeButton);
        list.appendChild(card);
    });
}

async function saveSavingsGoal() {

    const nameInput = document.getElementById("savingsGoalName");
    const targetInput = document.getElementById("savingsGoalTarget");
    const dateInput = document.getElementById("savingsGoalDate");
    const button = document.getElementById("saveSavingsGoalButton");
    const message = document.getElementById("savingsGoalMessage");
    const name = nameInput.value.trim();
    const target = Number(targetInput.value);
    const targetDate = dateInput.value;

    if (
        !currentUser ||
        !name ||
        name.length > 60 ||
        !Number.isFinite(target) ||
        target <= 0 ||
        (targetDate && !isValidISODate(targetDate))
    ) {
        message.textContent = currentUser
            ? "Enter a goal name, a target above zero, and a valid target date."
            : "Your session has expired. Please log in again.";
        message.className = "profile-message error";
        return;
    }

    button.disabled = true;
    button.textContent = "Saving...";
    message.textContent = "";
    message.className = "profile-message";

    try {
        const goals = getSavingsGoals();
        if (goals.some(goal => goal.name.toLowerCase() === name.toLowerCase())) {
            throw new Error("A savings goal with that name already exists.");
        }

        goals.push({
            id: makeLocalId(),
            name,
            target,
            targetDate
        });

        await saveAccountMetadata({ savingsGoals: goals });
        document.getElementById("savingsGoalForm").reset();
        refreshSavingsGoalSelect();
        renderSavingsGoals();
        message.textContent = "Savings goal created.";
        message.className = "profile-message success";
    } catch (error) {
        console.error("Could not create savings goal:", error);
        message.textContent = `Could not create savings goal: ${error.message}`;
        message.className = "profile-message error";
    } finally {
        button.disabled = false;
        button.textContent = "Create goal";
    }
}

async function removeSavingsGoal(goalId) {

    const goal = getSavingsGoals().find(item => item.id === goalId);
    if (!goal || !currentUser) {
        return;
    }

    if (!confirm(`Remove the "${goal.name}" savings goal? Its linked transactions will remain in your history.`)) {
        return;
    }

    const message = document.getElementById("savingsGoalMessage");

    try {
        const goals = getSavingsGoals().filter(item => item.id !== goalId);
        const contributions = getSavingsContributions()
            .filter(item => item.goalId !== goalId);
        await saveAccountMetadata({
            savingsGoals: goals,
            savingsContributions: contributions
        });
        refreshSavingsGoalSelect();
        renderSavingsGoals();
        message.textContent = "Savings goal removed. Transactions were not changed.";
        message.className = "profile-message success";
    } catch (error) {
        console.error("Could not remove savings goal:", error);
        message.textContent = `Could not remove savings goal: ${error.message}`;
        message.className = "profile-message error";
    }
}

async function updateTransactionSavingsGoal(transactionId, goalId, type) {

    const existing = getSavingsContributions();
    const contributions = existing
        .filter(item => item.transactionId !== String(transactionId));

    if (goalId) {
        if (type !== "expense") {
            throw new Error("Only expense transactions can contribute to savings goals.");
        }
        if (!getSavingsGoals().some(goal => goal.id === goalId)) {
            throw new Error("That savings goal is no longer available.");
        }
        contributions.push({
            transactionId: String(transactionId),
            goalId
        });
    } else if (contributions.length === existing.length) {
        return;
    }

    await saveAccountMetadata({ savingsContributions: contributions });
}

function renderCategoryList() {

    const list = document.getElementById("categoryList");
    if (!list) {
        return;
    }

    list.replaceChildren();
    getTransactionCategories().forEach(category => {
        const row = document.createElement("div");
        row.className = "category-row";

        const name = document.createElement("strong");
        name.textContent = category;
        row.appendChild(name);

        if (DEFAULT_CATEGORIES.includes(category)) {
            const badge = document.createElement("span");
            badge.className = "category-default-badge";
            badge.textContent = "Built in";
            row.appendChild(badge);
        } else {
            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "budget-remove-btn";
            removeButton.textContent = "Remove";
            removeButton.addEventListener(
                "click",
                () => removeCustomCategory(category)
            );
            row.appendChild(removeButton);
        }

        list.appendChild(row);
    });
}

async function addCustomCategory() {

    const input = document.getElementById("newCategoryName");
    const button = document.getElementById("addCategoryButton");
    const message = document.getElementById("categoryMessage");
    const name = input.value.trim();

    if (
        !currentUser ||
        !name ||
        name.length > 40 ||
        name.toLowerCase() === "__proto__"
    ) {
        message.textContent = currentUser
            ? "Enter a category name up to 40 characters long that is not reserved."
            : "Your session has expired. Please log in again.";
        message.className = "profile-message error";
        return;
    }

    if (getTransactionCategories().some(category =>
        category.toLowerCase() === name.toLowerCase()
    )) {
        message.textContent = "That category already exists.";
        message.className = "profile-message error";
        return;
    }

    button.disabled = true;
    button.textContent = "Adding...";

    try {
        await saveAccountMetadata({
            customCategories: [...getCustomCategories(), name]
        });
        input.value = "";
        refreshCategorySelects();
        renderCategoryList();
        message.textContent = `${name} category added.`;
        message.className = "profile-message success";
    } catch (error) {
        console.error("Could not add category:", error);
        message.textContent = `Could not add category: ${error.message}`;
        message.className = "profile-message error";
    } finally {
        button.disabled = false;
        button.textContent = "Add category";
    }
}

async function removeCustomCategory(category) {

    if (!currentUser || !getCustomCategories().includes(category)) {
        return;
    }

    const isUsedByBudget =
        Object.prototype.hasOwnProperty.call(getBudgetLimits(), category);
    const isUsedByRecurring =
        getRecurringTemplates().some(template => template.category === category);

    if (isUsedByBudget || isUsedByRecurring) {
        const usage = [
            isUsedByBudget ? "a monthly budget" : "",
            isUsedByRecurring ? "a recurring transaction" : ""
        ].filter(Boolean).join(" and ");
        const message = document.getElementById("categoryMessage");
        message.textContent =
            `Remove ${usage} using this category first. Historical transactions will remain unchanged.`;
        message.className = "profile-message error";
        return;
    }

    if (!confirm(`Remove the "${category}" category? Historical transactions will keep this category name.`)) {
        return;
    }

    const message = document.getElementById("categoryMessage");

    try {
        await saveAccountMetadata({
            customCategories: getCustomCategories()
                .filter(item => item !== category)
        });
        refreshCategorySelects();
        renderCategoryList();
        message.textContent = `${category} category removed. Historical transactions were not changed.`;
        message.className = "profile-message success";
    } catch (error) {
        console.error("Could not remove category:", error);
        message.textContent = `Could not remove category: ${error.message}`;
        message.className = "profile-message error";
    }
}

async function addTransaction() {

    // If currently editing, update instead
    if (editingTransactionId !== null) {

        await updateTransaction(
            editingTransactionId
        );

        return;
    }


    const user =
        await getCurrentUser();


    if (!user) {

        alert("Please log in first.");

        return;
    }


    const type =
        document.getElementById(
            "transactionType"
        ).value;

    const amount =
        Number(
            document.getElementById(
                "amount"
            ).value
        );

    const date =
        document.getElementById(
            "transactionDate"
        ).value;

    const category =
        document.getElementById(
            "category"
        ).value;

    const description =
        document.getElementById(
            "description"
        ).value.trim();

    const savingsGoalId =
        document.getElementById("transactionSavingsGoal").value;


    if (!amount || amount <= 0) {

        alert(
            "Please enter a valid amount."
        );

        return;
    }


    if (!date) {

        alert(
            "Please select a date."
        );

        return;
    }

    if (savingsGoalId && type !== "expense") {
        alert("Only expense transactions can contribute to a savings goal.");
        return;
    }

    const {
        data: inserted,
        error
    } = await supabaseClient

        .from("transactions")

        .insert({

            user_id: user.id,

            type: type,

            amount: amount,

            date: date,

            category: category,

            description:
                description || "-"

        })
        .select("id")
        .single();


    if (error) {

        console.error(error);

        alert(
            "Could not save transaction: " +
            error.message
        );

        return;
    }

    if (savingsGoalId) {
        try {
            await updateTransactionSavingsGoal(
                inserted.id,
                savingsGoalId,
                type
            );
        } catch (error) {
            console.error("Could not link transaction to savings goal:", error);
            alert(
                `Transaction was saved, but its savings-goal contribution could not be recorded: ${error.message}`
            );
        }
    }

    resetTransactionForm();

    await updateDashboard();

    // Keep user on History after adding
    showView("history");
}


// ==========================================
// EDIT TRANSACTION
// ==========================================

async function editTransaction(id) {

    const transactions =
        await getTransactions();


    const transaction =
        transactions.find(
            item =>
                String(item.id) === String(id)
        );


    if (!transaction) {

        return;

    }


    document.getElementById(
        "transactionType"
    ).value =
        transaction.type;
    updateSavingsGoalAvailability();


    document.getElementById(
        "amount"
    ).value =
        transaction.amount;


    document.getElementById(
        "transactionDate"
    ).value =
        transaction.date;


    setSelectOptions(
        document.getElementById("category"),
        getTransactionCategories(),
        transaction.category
    );


    document.getElementById(
        "description"
    ).value =
        transaction.description === "-"
            ? ""
            : transaction.description;

    const linkedGoal = getSavingsContributions()
        .find(item => item.transactionId === String(id));
    refreshSavingsGoalSelect(linkedGoal?.goalId || "");

    editingTransactionId = id;


    const button =
        document.querySelector(
            ".transaction-form .primary-btn"
        );


    if (button) {

        button.textContent =
            "Update Transaction";

    }


    const form =
        document.querySelector(
            ".transaction-form"
        );


    if (form) {

        form.scrollIntoView({

            behavior: "smooth",

            block: "center"

        });

    }

}


// ==========================================
// UPDATE TRANSACTION
// ==========================================

async function updateTransaction(id) {

    const user =
        await getCurrentUser();


    if (!user) {

        alert(
            "Please log in first."
        );

        return;
    }


    const type =
        document.getElementById(
            "transactionType"
        ).value;

    const amount =
        Number(
            document.getElementById(
                "amount"
            ).value
        );

    const date =
        document.getElementById(
            "transactionDate"
        ).value;

    const category =
        document.getElementById(
            "category"
        ).value;

    const description =
        document.getElementById(
            "description"
        ).value.trim();

    const savingsGoalId =
        document.getElementById("transactionSavingsGoal").value;


    if (!amount || amount <= 0) {

        alert(
            "Please enter a valid amount."
        );

        return;
    }


    if (!date) {

        alert(
            "Please select a date."
        );

        return;
    }

    if (savingsGoalId && type !== "expense") {
        alert("Only expense transactions can contribute to a savings goal.");
        return;
    }

    const {
        error
    } = await supabaseClient

        .from("transactions")

        .update({

            type: type,

            amount: amount,

            date: date,

            category: category,

            description:
                description || "-"

        })

        .eq("id", id)

        .eq("user_id", user.id);


    if (error) {

        console.error(error);

        alert(
            "Could not update transaction: " +
            error.message
        );

        return;
    }

    try {
        await updateTransactionSavingsGoal(id, savingsGoalId, type);
    } catch (error) {
        console.error("Could not update savings goal contribution:", error);
        alert(
            `Transaction was updated, but its savings-goal link could not be saved: ${error.message}`
        );
    }

    resetTransactionForm();

    await updateDashboard();

    showView("history");
}


// ==========================================
// RESET TRANSACTION FORM
// ==========================================

function resetTransactionForm() {

    editingTransactionId = null;


    const amount =
        document.getElementById("amount");

    const description =
        document.getElementById(
            "description"
        );


    if (amount)
        amount.value = "";

    if (description)
        description.value = "";

    refreshSavingsGoalSelect();
    updateSavingsGoalAvailability();

    const button =
        document.querySelector(
            ".transaction-form .primary-btn"
        );


    if (button) {

        button.textContent =
            "Add Transaction";

    }

}


// ==========================================
// DELETE TRANSACTION
// ==========================================

async function deleteTransaction(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this transaction?"
        );


    if (!confirmed) {

        return;

    }


    const user =
        await getCurrentUser();


    if (!user) {

        alert(
            "Please log in first."
        );

        return;
    }


    const {
        error
    } = await supabaseClient

        .from("transactions")

        .delete()

        .eq("id", id)

        .eq("user_id", user.id);


    if (error) {

        console.error(error);

        alert(
            "Could not delete transaction: " +
            error.message
        );

        return;
    }

    try {
        await updateTransactionSavingsGoal(id, "", "expense");
    } catch (error) {
        console.error("Could not remove savings transaction link:", error);
        alert(
            `Transaction was deleted, but its savings-goal link could not be cleared: ${error.message}`
        );
    }

    await updateDashboard();

}


// ==========================================
// DASHBOARD
// ==========================================

async function updateDashboard() {

    const transactions =
        await getTransactions();

    transactionCache = transactions;


    let income = 0;

    let expenses = 0;


    transactions.forEach(
        transaction => {

            const amount =
                Number(
                    transaction.amount
                ) || 0;


            if (
                transaction.type ===
                "income"
            ) {

                income += amount;

            }


            if (
                transaction.type ===
                "expense"
            ) {

                expenses += amount;

            }

        }
    );


    const balance =
        income - expenses;


    const totalIncome =
        document.getElementById(
            "totalIncome"
        );

    const totalExpense =
        document.getElementById(
            "totalExpense"
        );

    const balanceElement =
        document.getElementById(
            "balance"
        );


    if (totalIncome) {

        totalIncome.textContent =
            formatMoney(income);

    }


    if (totalExpense) {

        totalExpense.textContent =
            formatMoney(expenses);

    }


    if (balanceElement) {

        balanceElement.textContent =
            formatMoney(balance);

    }

    renderDashboardInsights(transactions);
    renderSavingsGoals(transactions);
    renderBillReminders();

    renderTransactions(
        transactions
    );

    renderBudgetCards(transactions);


    initializeReportMonth();

    await updateReports();
}

function renderDashboardInsights(transactions) {

    const now = new Date();
    const currentMonth =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const previousDate =
        new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth =
        `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;
    const today = getLocalISODate(now);
    const previousMonthLastDay =
        new Date(previousDate.getFullYear(), previousDate.getMonth() + 1, 0)
            .getDate();
    const previousPeriodEnd = getLocalISODate(
        new Date(
            previousDate.getFullYear(),
            previousDate.getMonth(),
            Math.min(now.getDate(), previousMonthLastDay)
        )
    );

    let currentSpending = 0;
    let previousSpending = 0;
    const categoryTotals = new Map();

    transactions.forEach(transaction => {
        if (transaction.type !== "expense") {
            return;
        }

        const amount = Number(transaction.amount) || 0;
        const date = String(transaction.date || "").slice(0, 10);
        const month = date.slice(0, 7);

        if (month === currentMonth && date <= today) {
            currentSpending += amount;
            const category = transaction.category || "Other";
            categoryTotals.set(
                category,
                (categoryTotals.get(category) || 0) + amount
            );
        } else if (
            month === previousMonth &&
            date <= previousPeriodEnd
        ) {
            previousSpending += amount;
        }
    });

    const currentAmount =
        document.getElementById("monthToDateSpending");
    const currentCaption =
        document.getElementById("monthSpendingCaption");
    const changeAmount =
        document.getElementById("monthlySpendingChange");
    const comparison =
        document.getElementById("monthlySpendingComparison");
    const topCategory =
        document.getElementById("topSpendingCategory");
    const topAmount =
        document.getElementById("topSpendingAmount");

    currentAmount.textContent = formatMoney(currentSpending);
    currentCaption.textContent =
        `Month to date · ${now.toLocaleDateString(preferredDateLocale, { month: "long" })}`;

    changeAmount.className = "insight-change";
    if (previousSpending === 0) {
        changeAmount.textContent =
            currentSpending === 0 ? "—" : "New spending";
        comparison.textContent = currentSpending === 0
            ? "No expenses in either month"
            : `No spending through ${formatDate(previousPeriodEnd)} last month`;
    } else {
        const change =
            ((currentSpending - previousSpending) / previousSpending) * 100;
        const rounded = Math.round(Math.abs(change));

        if (change > 0) {
            changeAmount.textContent = `${rounded}% more`;
            changeAmount.classList.add("spending-increase");
        } else if (change < 0) {
            changeAmount.textContent = `${rounded}% less`;
            changeAmount.classList.add("spending-decrease");
        } else {
            changeAmount.textContent = "No change";
        }

        comparison.textContent =
            `${formatMoney(currentSpending)} vs ${formatMoney(previousSpending)} through ${formatDate(previousPeriodEnd)}`;
    }

    const topEntry =
        [...categoryTotals.entries()]
            .sort((a, b) => b[1] - a[1])[0];

    topCategory.textContent = topEntry?.[0] || "—";
    topAmount.textContent = topEntry
        ? `${formatMoney(topEntry[1])} spent month to date`
        : "No expenses recorded this month";
}


// ==========================================
// TRANSACTION HISTORY
// ==========================================

function getFilteredTransactions(transactions) {

    const filterElement =
        document.getElementById(
            "filterType"
        );

    const searchElement =
        document.getElementById(
            "transactionSearch"
        );

    const dateFromElement =
        document.getElementById(
            "transactionDateFrom"
        );

    const dateToElement =
        document.getElementById(
            "transactionDateTo"
        );

    const filter =
        filterElement
            ? filterElement.value
            : "all";

    const search =
        searchElement
            ? searchElement.value.trim().toLocaleLowerCase()
            : "";

    const dateFrom =
        dateFromElement?.value || "";

    const dateTo =
        dateToElement?.value || "";

    let filtered =
        [...transactions];


    if (filter !== "all") {

        filtered =
            filtered.filter(
                transaction =>
                    transaction.type ===
                    filter
            );

    }

    if (search) {
        filtered = filtered.filter(transaction => {
            const searchableValues = [
                transaction.category,
                transaction.description,
                transaction.type,
                transaction.date,
                formatDate(transaction.date),
                transaction.amount
            ];

            return searchableValues.some(value =>
                String(value ?? "")
                    .toLocaleLowerCase()
                    .includes(search)
            );
        });
    }

    if (dateFrom) {
        filtered = filtered.filter(
            transaction =>
                typeof transaction.date === "string" &&
                transaction.date >= dateFrom
        );
    }

    if (dateTo) {
        filtered = filtered.filter(
            transaction =>
                typeof transaction.date === "string" &&
                transaction.date <= dateTo
        );
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
        filtered = [];
    }


    filtered.sort(
        (a, b) =>
            new Date(b.date) -
            new Date(a.date)
    );

    return filtered;
}

function renderTransactions(
    transactions
) {

    const list =
        document.getElementById(
            "transactionList"
        );

    const emptyMessage =
        document.getElementById(
            "emptyMessage"
        );

    const exportButton =
        document.getElementById(
            "exportTransactionsButton"
        );

    const exportMessage =
        document.getElementById(
            "exportMessage"
        );

    if (!list) {
        return;
    }

    const dateFrom =
        document.getElementById("transactionDateFrom")?.value || "";
    const dateTo =
        document.getElementById("transactionDateTo")?.value || "";

    const filtered = getFilteredTransactions(transactions);
    list.innerHTML = "";

    if (exportMessage) {
        exportMessage.textContent = "";
    }

    if (exportButton) {
        exportButton.disabled = filtered.length === 0;
    }

    if (filtered.length === 0) {

        if (emptyMessage) {

            emptyMessage.style.display =
                "block";
            emptyMessage.textContent =
                dateFrom && dateTo && dateFrom > dateTo
                    ? "The start date must be on or before the end date."
                    : transactions.length === 0
                        ? "No transactions yet."
                        : "No transactions match these filters.";

        }

        return;

    }


    if (emptyMessage) {

        emptyMessage.style.display =
            "none";

    }


    filtered.forEach(
        transaction => {

            const row =
                document.createElement(
                    "tr"
                );


            const typeText =
                transaction.type ===
                    "income"
                    ? "Income"
                    : "Expense";


            const amount =
                Number(
                    transaction.amount
                ) || 0;


            const amountText =
                transaction.type ===
                    "income"

                    ? `+${formatMoney(
                        amount
                    )}`

                    : `-${formatMoney(
                        amount
                    )}`;


            row.innerHTML = `

                <td>
                    ${formatDate(
                transaction.date
            )}
                </td>

                <td class="${transaction.type}-text">
                    ${typeText}
                </td>

                <td>
                    ${escapeHTML(
                transaction.category ||
                "Other"
            )}
                </td>

                <td>
                    ${escapeHTML(
                transaction.description ||
                "-"
            )}
                </td>

                <td class="${transaction.type}-text">
                    ${amountText}
                </td>

                <td class="action-buttons">

                    <button
                        class="edit-btn"
                        type="button"
                        onclick="editTransaction('${transaction.id}')">
                        Edit
                    </button>

                    <button
                        class="delete-btn"
                        type="button"
                        onclick="deleteTransaction('${transaction.id}')">
                        Delete
                    </button>

                </td>

            `;


            list.appendChild(row);

        }
    );

}

function escapeCsvCell(value) {

    let text = String(value ?? "");

    if (
        typeof value !== "number" &&
        /^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(text)
    ) {
        text = `'${text}`;
    }

    return `"${text.replace(/"/g, '""')}"`;
}

function exportTransactionsCsv() {

    const transactions = transactionCache;

    if (!transactions) {
        const message = document.getElementById("exportMessage");
        message.textContent =
            "Transactions are still loading. Please try again in a moment.";
        return;
    }

    const filtered = getFilteredTransactions(transactions);
    const message = document.getElementById("exportMessage");

    if (!filtered.length) {
        message.textContent =
            "There are no matching transactions to export.";
        return;
    }

    const rows = [
        ["Date", "Type", "Category", "Description", "Amount"],
        ...filtered.map(transaction => [
            transaction.date,
            transaction.type === "income" ? "Income" : "Expense",
            transaction.category || "Other",
            transaction.description || "-",
            Number.isFinite(Number(transaction.amount))
                ? transaction.type === "income"
                    ? Number(transaction.amount)
                    : -Number(transaction.amount)
                : ""
        ])
    ];

    const csv = `\uFEFF${rows.map(
        row => row.map(escapeCsvCell).join(",")
    ).join("\r\n")}`;

    let objectUrl;

    try {
        const blob = new Blob(
            [csv],
            { type: "text/csv;charset=utf-8" }
        );
        objectUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        const timestamp = new Date()
            .toISOString()
            .slice(0, 10);
        link.href = objectUrl;
        link.download = `moneytrack-transactions-${timestamp}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        message.textContent =
            `${filtered.length} transaction${filtered.length === 1 ? "" : "s"} exported to CSV.`;
    } catch (error) {
        console.error("Could not export transactions:", error);
        message.textContent =
            "Could not create the CSV file. Please try again.";
    } finally {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    }
}


// ==========================================
// FILTER TRANSACTIONS
// ==========================================

function filterTransactions() {

    if (transactionCache !== null) {
        renderTransactions(transactionCache);
        return;
    }

    getTransactions().then(transactions => {
        transactionCache = transactions;
        renderTransactions(transactions);
    });
}

function clearTransactionFilters() {

    document.getElementById("transactionSearch").value = "";
    document.getElementById("filterType").value = "all";
    document.getElementById("transactionDateFrom").value = "";
    document.getElementById("transactionDateTo").value = "";
    filterTransactions();

}


// ==========================================
// MONEY FORMAT
// ==========================================

function formatMoney(amount) {

    return new Intl.NumberFormat(
        CURRENCY_LOCALES[preferredCurrency],
        {

            style: "currency",

            currency: preferredCurrency,

            maximumFractionDigits: 0

        }
    ).format(amount);

}

function updateAmountPlaceholder() {

    const amountInput =
        document.getElementById("amount");

    if (amountInput) {
        amountInput.placeholder = formatMoney(0);
    }
}


// ==========================================
// DATE FORMAT
// ==========================================

function formatDate(date) {

    return new Date(date)
        .toLocaleDateString(
            preferredDateLocale,

            {

                day: "2-digit",

                month: "2-digit",

                year: "numeric"

            }
        );

}


// ==========================================
// SECURITY
// ==========================================

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        String(value ?? "");

    return div.innerHTML;

}


// ==========================================
// REPORT MONTH
// ==========================================

function initializeReportMonth() {

    const input =
        document.getElementById(
            "reportMonth"
        );


    if (!input) {

        return;

    }


    if (!input.value) {

        const today =
            new Date();


        input.value =
            `${today.getFullYear()}-${String(
                today.getMonth() + 1
            ).padStart(2, "0")}`;

    }

}


// ==========================================
// CHANGE REPORT MONTH
// ==========================================

function changeReportMonth(
    direction
) {

    const input =
        document.getElementById(
            "reportMonth"
        );


    if (!input) {

        return;

    }


    initializeReportMonth();


    const [year, month] =
        input.value
            .split("-")
            .map(Number);


    const date =
        new Date(
            year,
            month - 1 + direction,
            1
        );


    input.value =
        `${date.getFullYear()}-${String(
            date.getMonth() + 1
        ).padStart(2, "0")}`;


    updateReports();

}


// ==========================================
// UPDATE REPORTS
// ==========================================

async function updateReports() {

    const transactions =
        await getTransactions();


    const input =
        document.getElementById(
            "reportMonth"
        );


    if (!input) {

        return;

    }


    initializeReportMonth();


    const month =
        input.value;


    const monthlyTransactions =
        transactions.filter(
            transaction =>
                String(
                    transaction.date
                ).substring(0, 7) ===
                month
        );


    let income = 0;

    let expenses = 0;


    monthlyTransactions.forEach(
        transaction => {

            const amount =
                Number(
                    transaction.amount
                ) || 0;


            if (
                transaction.type ===
                "income"
            ) {

                income += amount;

            }


            if (
                transaction.type ===
                "expense"
            ) {

                expenses += amount;

            }

        }
    );


    const balance =
        income - expenses;


    // --------------------------------------
    // REPORT SUMMARY
    // --------------------------------------

    const reportIncome =
        document.getElementById(
            "reportIncome"
        );

    const reportExpenses =
        document.getElementById(
            "reportExpenses"
        );

    const reportExpense =
        document.getElementById(
            "reportExpense"
        );

    const reportSavings =
        document.getElementById(
            "reportSavings"
        );

    const reportBalance =
        document.getElementById(
            "reportBalance"
        );

    const reportSavingsRate =
        document.getElementById(
            "reportSavingsRate"
        );


    if (reportIncome) {

        reportIncome.textContent =
            formatMoney(income);

    }


    if (reportExpenses) {

        reportExpenses.textContent =
            formatMoney(expenses);

    }


    if (reportExpense) {

        reportExpense.textContent =
            formatMoney(expenses);

    }


    if (reportSavings) {

        reportSavings.textContent =
            formatMoney(balance);

    }


    if (reportBalance) {

        reportBalance.textContent =
            formatMoney(balance);

    }


    if (reportSavingsRate) {

        const rate =
            income > 0
                ? (balance / income) * 100
                : 0;


        reportSavingsRate.textContent =
            `${rate.toFixed(1)}%`;

    }


    // --------------------------------------
    // CHARTS
    // --------------------------------------

    drawIncomeExpenseChart(
        income,
        expenses
    );


    drawCategoryChart(
        monthlyTransactions
    );


}


// ==========================================
// INCOME VS EXPENSE CHART
// ==========================================

function drawIncomeExpenseChart(
    income,
    expenses
) {

    const canvas =
        document.getElementById(
            "incomeExpenseChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    if (incomeExpenseChart) {

        incomeExpenseChart.destroy();

        incomeExpenseChart = null;

    }


    incomeExpenseChart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels: [
                        "Income",
                        "Expenses"
                    ],

                    datasets: [{

                        label:
                            "Amount",

                        data: [
                            income,
                            expenses
                        ],

                        backgroundColor: [
                            "#137c68",
                            "#d2ad68"
                        ],

                        borderRadius: 8,

                        maxBarThickness: 56

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            display:
                                false

                        }

                    },

                    scales: {

                        x: {

                            grid: {
                                display: false
                            },

                            ticks: {
                                color: "#52666a"
                            }

                        },

                        y: {

                            beginAtZero:
                                true,

                            grid: {
                                color: "rgba(16, 44, 58, 0.08)"
                            },

                            ticks: {

                                color: "#687a7d",

                                callback:
                                    function (
                                        value
                                    ) {

                                        return formatMoney(Number(value));

                                    }

                            }

                        }

                    }

                }

            }
        );

}


// ==========================================
// CATEGORY CHART
// ==========================================

function drawCategoryChart(
    transactions
) {

    const canvas =
        document.getElementById(
            "categoryChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    const categoryTotals = {};


    transactions.forEach(
        transaction => {

            if (
                transaction.type !==
                "expense"
            ) {

                return;

            }


            const category =
                transaction.category ||
                "Other";


            const amount =
                Number(
                    transaction.amount
                ) || 0;


            categoryTotals[category] =
                (
                    categoryTotals[
                    category
                    ] || 0
                ) + amount;

        }
    );


    const labels =
        Object.keys(
            categoryTotals
        );


    const values =
        Object.values(
            categoryTotals
        );


    if (categoryChart) {

        categoryChart.destroy();

        categoryChart = null;

    }


    categoryChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: labels,

                    datasets: [{

                        data: values,

                        backgroundColor: [
                            "#137c68",
                            "#d2ad68",
                            "#527a70",
                            "#b78d4f",
                            "#83aa91",
                            "#748c8c",
                            "#c87560",
                            "#365e66",
                            "#d5c59e"
                        ],

                        borderColor: "#ffffff",

                        borderWidth: 3,

                        hoverOffset: 8

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            position:
                                "bottom",

                            labels: {
                                color: "#52666a",
                                padding: 18
                            }

                        }

                    }

                }

            }
        );

}


// ==========================================
// MAIN APP TAB SWITCHER
// ==========================================
// THIS IS THE IMPORTANT PART
//
// Transaction History button:
// showView("history")
//
// Reports button:
// showView("reports")
//
// Only ONE of the two main sections
// will be visible at a time.
// ==========================================

function showView(view) {

    const views = {
        history: {
            tab: "historyTab",
            section: "historySection"
        },
        budgets: {
            tab: "budgetsTab",
            section: "budgetsSection"
        },
        recurring: {
            tab: "recurringTab",
            section: "recurringSection"
        },
        billReminders: {
            tab: "billRemindersTab",
            section: "billRemindersSection"
        },
        savingsGoals: {
            tab: "savingsGoalsTab",
            section: "savingsGoalsSection"
        },
        categories: {
            tab: "categoriesTab",
            section: "categoriesSection"
        },
        reports: {
            tab: "reportsTab",
            section: "reportsSection"
        },
        profile: {
            tab: "profileTab",
            section: "profileSection"
        }
    };

    if (!views[view]) {
        return;
    }

    Object.values(views).forEach(({ tab, section }) => {
        document.getElementById(tab)?.classList.toggle(
            "active",
            views[view].tab === tab
        );
        document.getElementById(section)?.classList.toggle(
            "hidden",
            views[view].section !== section
        );
    });

    document.getElementById("dashboardSection")?.classList.toggle(
        "hidden",
        view !== "history"
    );

    if (view === "reports") {
        initializeReportMonth();
        updateReports();
    }

    if (view === "budgets") {
        initializeBudgetMonth();
        updateBudgets();
    }

    if (view === "recurring") {
        initializeRecurringDate();
        renderRecurringTemplates();
    }

    if (view === "billReminders") {
        renderBillReminders();
    }

    if (view === "savingsGoals") {
        renderSavingsGoals();
    }

    if (view === "categories") {
        refreshCategorySelects();
        renderCategoryList();
    }

    if (view === "profile" && currentUser) {
        populateProfile(currentUser);
    }

}


// ==========================================
// COMPATIBILITY FUNCTIONS
// ==========================================

// These allow your existing HTML buttons
// to continue working if they currently use
// showHistory() or showReports().

function showHistory() {

    showView("history");

}


function showReports() {

    showView("reports");

}


// ==========================================
// STARTUP
// ==========================================

async function startup() {

    const isRecovery =
        passwordRecoveryCallback ||
        isPasswordRecoveryCallback();

    const user =
        await getCurrentUser();

    if (isRecovery && passwordRecoveryPending) {
        showPasswordRecovery();

        if (!user) {
            const message =
                document.getElementById("authMessage");
            message.style.color = "#dc2626";
            message.textContent =
                "This reset link is invalid or expired. Request a new password reset link.";
        }

        return;
    }
    if (isRecovery && !user) {
        showLogin();
        const message =
            document.getElementById("authMessage");
        message.style.color = "#dc2626";
        message.textContent =
            "This reset link is invalid or expired. Request a new password reset link.";
        return;
    }


    if (user) {

        await openApp(user);

    } else {

        const appPage =
            document.getElementById(
                "appPage"
            );

        const authPage =
            document.getElementById(
                "authPage"
            );


        if (appPage) {

            appPage.classList.add(
                "hidden"
            );

        }


        if (authPage) {

            authPage.classList.remove(
                "hidden"
            );

        }


        showLogin();

    }

}


// ==========================================
// AUTH STATE LISTENER
// ==========================================

supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

        if (
            event === "PASSWORD_RECOVERY" &&
            session?.user
        ) {
            passwordRecoveryPending = true;
            passwordRecoveryCallback = true;
            currentUser = session.user;
            showPasswordRecovery();
            return;
        }


        if (
            event === "SIGNED_IN" &&
            session?.user
        ) {

            await openApp(session.user);

        }


        if (
            event === "SIGNED_OUT"
        ) {

            currentUser = null;
            transactionCache = null;
            passwordRecoveryPending = false;
            passwordRecoveryCallback = false;

            const appPage =
                document.getElementById(
                    "appPage"
                );

            const authPage =
                document.getElementById(
                    "authPage"
                );


            if (appPage) {

                appPage.classList.add(
                    "hidden"
                );

            }


            if (authPage) {

                authPage.classList.remove(
                    "hidden"
                );

            }

        }

    }
);


// ==========================================
// START APPLICATION
// ==========================================

window.onload = startup;


// ==========================================
// DOM READY
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        // Default to Transaction History
        showView("history");

    }
);