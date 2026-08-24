/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/login.js

   PURPOSE:
   Authenticate organization administrators.
========================================================= */


/* =========================================================
   FIREBASE IMPORT
========================================================= */

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


/* =========================================================
   FIREBASE CONFIG
========================================================= */

import {
    auth
} from "./firebase-config.js";


/* =========================================================
   HTML ELEMENTS
========================================================= */

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const loginMessage =
    document.getElementById("loginMessage");


/* =========================================================
   SHOW MESSAGE
========================================================= */

function showMessage(
    message,
    type
) {

    loginMessage.textContent =
        message;

    loginMessage.className =
        type;

}


/* =========================================================
   LOGIN
========================================================= */

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        /* =========================================
           BASIC VALIDATION
        ========================================= */

        if (!email || !password) {

            showMessage(
                "Please enter your email and password.",
                "error"
            );

            return;
        }


        /* =========================================
           DISABLE BUTTON
        ========================================= */

        loginButton.disabled =
            true;

        loginButton.textContent =
            "Signing In...";


        loginMessage.className =
            "";


        try {


            /* =====================================
               FIREBASE LOGIN
            ===================================== */

            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                userCredential.user;


            console.log(
                "✅ Login successful:",
                user.uid
            );


            showMessage(
                "Login successful. Opening your dashboard...",
                "success"
            );


            /* =====================================
               DASHBOARD
            ===================================== */

            setTimeout(
                () => {

                    window.location.href =
                        "dashboard.html";

                },
                700
            );


        }

        catch (error) {

            console.error(
                "❌ Login error:",
                error
            );


            let message =
                "Unable to sign in. Please check your details and try again.";


            /* =====================================
               FIREBASE ERROR HANDLING
            ===================================== */

            if (
                error.code ===
                "auth/invalid-credential"
            ) {

                message =
                    "Incorrect email or password.";

            }


            else if (
                error.code ===
                "auth/user-not-found"
            ) {

                message =
                    "No account was found with this email.";

            }


            else if (
                error.code ===
                "auth/wrong-password"
            ) {

                message =
                    "Incorrect password.";

            }


            else if (
                error.code ===
                "auth/invalid-email"
            ) {

                message =
                    "Please enter a valid email address.";

            }


            else if (
                error.code ===
                "auth/too-many-requests"
            ) {

                message =
                    "Too many login attempts. Please wait and try again.";

            }


            showMessage(
                message,
                "error"
            );


            loginButton.disabled =
                false;

            loginButton.textContent =
                "Sign In";

        }

    }
);