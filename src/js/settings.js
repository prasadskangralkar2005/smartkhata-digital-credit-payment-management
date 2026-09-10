import { supabase } from "./supabase.js";


// =====================================================
// ELEMENTS
// =====================================================

const profileForm =
    document.getElementById("profileForm");

const fullNameInput =
    document.getElementById("fullName");

const emailInput =
    document.getElementById("email");

const profileMessage =
    document.getElementById("profileMessage");

const saveProfileButton =
    document.getElementById("saveProfileButton");

const themeSelect =
    document.getElementById("themeSelect");

const paymentNotifications =
    document.getElementById("paymentNotifications");

const overdueNotifications =
    document.getElementById("overdueNotifications");

const upcomingNotifications =
    document.getElementById("upcomingNotifications");

const logoutButton =
    document.getElementById("logoutButton");

const changePasswordButton =
    document.getElementById("changePasswordButton");

const deleteAccountButton =
    document.getElementById("deleteAccountButton");

const passwordModal =
    document.getElementById("passwordModal");

const closePasswordModal =
    document.getElementById("closePasswordModal");

const sendPasswordReset =
    document.getElementById("sendPasswordReset");

const passwordMessage =
    document.getElementById("passwordMessage");


// =====================================================
// CURRENT USER
// =====================================================

let currentUser = null;


// =====================================================
// INITIALIZE
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeSettings
);


async function initializeSettings() {

    try {

        const {
            data: {
                user
            },
            error
        } = await supabase.auth.getUser();


        if (error) {
            throw error;
        }


        if (!user) {

            window.location.href =
                "/login.html";

            return;
        }


        currentUser = user;
        localStorage.setItem(
    "smartkhata_current_user",
    currentUser.id
);


        await loadProfile();

        loadPreferences();

        applySavedTheme();

        setupEventListeners();


    } catch (error) {

        console.error(
            "Settings initialization error:",
            error
        );

        window.location.href =
            "/login.html";
    }
}


// =====================================================
// LOAD PROFILE
// =====================================================

async function loadProfile() {

    emailInput.value =
        currentUser.email || "";


    // First try the profiles table
    const {
        data: profile,
        error
    } = await supabase
        .from("profiles")
        .select("full_name")
        .eq(
            "user_id",
            currentUser.id
        )
        .maybeSingle();


    if (
        !error &&
        profile
    ) {

        fullNameInput.value =
            profile.full_name || "";

        return;
    }


    // Fallback to Supabase Auth metadata
    fullNameInput.value =
        currentUser.user_metadata?.full_name ||
        "";
}


// =====================================================
// PROFILE UPDATE
// =====================================================

if (profileForm) {

    profileForm.addEventListener(
        "submit",
        updateProfile
    );
}


async function updateProfile(event) {

    event.preventDefault();


    if (!currentUser) {
        return;
    }


    const fullName =
        fullNameInput.value.trim();


    if (!fullName) {

        showProfileMessage(
            "Please enter your full name.",
            "error"
        );

        return;
    }


    saveProfileButton.disabled = true;

    saveProfileButton.textContent =
        "Saving...";


    try {

        // Update Auth metadata
        const {
            error: authError
        } = await supabase.auth.updateUser({

            data: {
                full_name: fullName
            }

        });


        if (authError) {
            throw authError;
        }


        // Update profile table if available
        const {
            error: profileError
        } = await supabase
            .from("profiles")
            .upsert(
                {
                    user_id:
                        currentUser.id,

                    full_name:
                        fullName
                },
                {
                    onConflict:
                        "user_id"
                }
            );


        /*
         * If the profiles table has a different
         * structure or RLS prevents this update,
         * Auth metadata has already been updated.
         */
        if (profileError) {

            console.warn(
                "Profile table update:",
                profileError.message
            );
        }


        showProfileMessage(
            "Profile updated successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Profile update error:",
            error
        );


        showProfileMessage(
            error.message ||
                "Unable to update profile.",
            "error"
        );


    } finally {

        saveProfileButton.disabled =
            false;

        saveProfileButton.textContent =
            "Save Changes";
    }
}


// =====================================================
// PROFILE MESSAGE
// =====================================================

function showProfileMessage(
    message,
    type
) {

    if (!profileMessage) {
        return;
    }


    profileMessage.textContent =
        message;


    profileMessage.style.color =
        type === "success"
            ? "#16a34a"
            : "#dc2626";


    setTimeout(() => {

        profileMessage.textContent = "";

    }, 4000);
}


// =====================================================
// PREFERENCES
// =====================================================

function loadPreferences() {

    const userId =
        currentUser?.id || "guest";


    const preferences =
        JSON.parse(
            localStorage.getItem(
                `smartkhata_preferences_${userId}`
            ) || "{}"
        );


    // Theme
    if (themeSelect) {

        themeSelect.value =
            preferences.theme ||
            "light";
    }


    // Notifications
    if (paymentNotifications) {

        paymentNotifications.checked =
            preferences.paymentNotifications !==
                false;
    }


    if (overdueNotifications) {

        overdueNotifications.checked =
            preferences.overdueNotifications !==
                false;
    }


    if (upcomingNotifications) {

        upcomingNotifications.checked =
            preferences.upcomingNotifications !==
                false;
    }
}


// =====================================================
// SAVE PREFERENCES
// =====================================================

function savePreferences() {

    if (!currentUser) {
        return;
    }


    const preferences = {

        theme:
            themeSelect?.value ||
            "light",

        paymentNotifications:
            paymentNotifications?.checked ??
            true,

        overdueNotifications:
            overdueNotifications?.checked ??
            true,

        upcomingNotifications:
            upcomingNotifications?.checked ??
            true
    };


    localStorage.setItem(

        `smartkhata_preferences_${currentUser.id}`,

        JSON.stringify(preferences)
    );
}


// =====================================================
// EVENT LISTENERS
// =====================================================

function setupEventListeners() {

    // Theme
    themeSelect?.addEventListener(
        "change",
        () => {

            const theme =
                themeSelect.value;

            applyTheme(theme);

            savePreferences();
        }
    );


    // Notification settings
    paymentNotifications?.addEventListener(
        "change",
        savePreferences
    );


    overdueNotifications?.addEventListener(
        "change",
        savePreferences
    );


    upcomingNotifications?.addEventListener(
        "change",
        savePreferences
    );


    // Logout
    logoutButton?.addEventListener(
        "click",
        logout
    );


    // Password
    changePasswordButton?.addEventListener(
        "click",
        openPasswordModal
    );


    closePasswordModal?.addEventListener(
        "click",
        closePasswordDialog
    );


    sendPasswordReset?.addEventListener(
        "click",
        sendPasswordResetEmail
    );


    // Close modal when clicking outside
    passwordModal?.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                passwordModal
            ) {
                closePasswordDialog();
            }
        }
    );


    // Delete account
    deleteAccountButton?.addEventListener(
        "click",
        deleteAccount
    );
}


// =====================================================
// THEME
// =====================================================

function applyTheme(theme) {

    if (window.SmartKhataTheme) {

        window.SmartKhataTheme.apply(theme);

    } else {

        if (theme === "dark") {

            document.documentElement.setAttribute(
                "data-theme",
                "dark"
            );

        } else {

            document.documentElement.removeAttribute(
                "data-theme"
            );
        }
    }
}


function applySavedTheme() {

    const theme =
        themeSelect?.value ||
        "light";


    applyTheme(theme);
}


// =====================================================
// PASSWORD MODAL
// =====================================================

function openPasswordModal() {

    if (!passwordModal) {
        return;
    }


    passwordMessage.textContent = "";


    passwordModal.classList.add(
        "show"
    );
}


function closePasswordDialog() {

    passwordModal?.classList.remove(
        "show"
    );
}


// =====================================================
// PASSWORD RESET
// =====================================================

async function sendPasswordResetEmail() {

    if (!currentUser?.email) {

        showPasswordMessage(
            "Email address not found.",
            "error"
        );

        return;
    }


    sendPasswordReset.disabled =
        true;

    sendPasswordReset.textContent =
        "Sending...";


    try {

        const redirectUrl =
            `${window.location.origin}/login.html`;


        const {
            error
        } = await supabase.auth.resetPasswordForEmail(
            currentUser.email,
            {
                redirectTo:
                    redirectUrl
            }
        );


        if (error) {
            throw error;
        }


        showPasswordMessage(
            "Password reset link sent to your email.",
            "success"
        );


        setTimeout(
            closePasswordDialog,
            2500
        );


    } catch (error) {

        console.error(
            "Password reset error:",
            error
        );


        showPasswordMessage(
            error.message ||
                "Unable to send reset link.",
            "error"
        );


    } finally {

        sendPasswordReset.disabled =
            false;

        sendPasswordReset.textContent =
            "Send Reset Link";
    }
}


// =====================================================
// PASSWORD MESSAGE
// =====================================================

function showPasswordMessage(
    message,
    type
) {

    if (!passwordMessage) {
        return;
    }


    passwordMessage.textContent =
        message;


    passwordMessage.style.color =
        type === "success"
            ? "#16a34a"
            : "#dc2626";
}


// =====================================================
// LOGOUT
// =====================================================

async function logout() {

    const confirmed =
        confirm(
            "Are you sure you want to logout?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
        } = await supabase.auth.signOut();


        if (error) {
            throw error;
        }


        window.location.href =
            "/login.html";


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        alert(
            "Unable to logout. Please try again."
        );
    }
}


// =====================================================
// DELETE ACCOUNT
// =====================================================

async function deleteAccount() {

    const firstConfirmation =
        confirm(
            "Are you sure you want to delete your SmartKhata account?\n\nThis action cannot be undone."
        );


    if (!firstConfirmation) {
        return;
    }


    const secondConfirmation =
        confirm(
            "FINAL WARNING\n\nYour account and associated data may be permanently deleted.\n\nContinue?"
        );


    if (!secondConfirmation) {
        return;
    }


    try {

        /*
         * Supabase client-side applications should
         * not directly delete auth.users.
         *
         * We sign the user out here rather than
         * pretending the account was deleted.
         *
         * Actual account deletion should be handled
         * securely using a Supabase Edge Function
         * or backend service.
         */

        alert(
            "Account deletion requires secure server-side processing. This feature will be connected next."
        );


    } catch (error) {

        console.error(
            "Delete account error:",
            error
        );
    }
}