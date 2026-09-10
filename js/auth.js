import { supabase } from "./supabase.js";


// ============================================================
// REGISTER
// ============================================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const fullName =
            document.getElementById("fullName").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        const message =
            document.getElementById("message");

        const button =
            document.getElementById("registerButton");


        // --------------------------------------------------------
        // Password confirmation
        // --------------------------------------------------------

        if (password !== confirmPassword) {

            message.textContent =
                "Passwords do not match.";

            return;
        }


        button.disabled = true;

        button.textContent =
            "Creating Account...";


        try {

            // ----------------------------------------------------
            // IMPORTANT:
            // Send the verification email to our callback page.
            // The current website origin is detected automatically.
            // ----------------------------------------------------

            const redirectUrl =
                `${window.location.origin}/auth/callback.html`;


            const { data, error } =
                await supabase.auth.signUp({

                    email: email,

                    password: password,

                    options: {

                        data: {
                            full_name: fullName
                        },

                        emailRedirectTo: redirectUrl
                    }
                });


            if (error) {

                console.error(
                    "Registration error:",
                    error
                );

                message.textContent =
                    error.message;

                return;
            }


            console.log(
                "Registered user:",
                data.user
            );


            message.textContent =
                "Account created! Please check your email and confirm your account before logging in.";


            registerForm.reset();


        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            message.textContent =
                "Something went wrong. Please try again.";

        } finally {

            button.disabled = false;

            button.textContent =
                "Create Account";
        }

    });

}



// ============================================================
// LOGIN
// ============================================================

const loginForm =
    document.getElementById("loginForm");


if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();


        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;


        const message =
            document.getElementById("message");

        const button =
            document.getElementById("loginButton");


        button.disabled = true;

        button.textContent =
            "Logging in...";


        try {

            const { data, error } =
                await supabase.auth.signInWithPassword({

                    email: email,

                    password: password

                });


            if (error) {

                console.error(
                    "Login error:",
                    error
                );

                message.textContent =
                    error.message;

                return;
            }


            console.log(
                "Logged in user:",
                data.user
            );


            window.location.href =
                "/dashboard.html";


        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            message.textContent =
                "Something went wrong. Please try again.";

        } finally {

            button.disabled = false;

            button.textContent =
                "Login";
        }

    });

}