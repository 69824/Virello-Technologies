/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/login.js

   PURPOSE:
   Organization administrator login.

   SECURITY:
   - Authenticates administrator
   - Finds organization owned by the account
   - Checks organization status
   - Blocks suspended organizations
   - Blocks pending organizations
   - Blocks inactive organizations
   - Blocks expired organizations
========================================================= */


/* =========================================================
   FIREBASE AUTH IMPORT
========================================================= */

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


/* =========================================================
   FIRESTORE IMPORT
========================================================= */

import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   FIREBASE CONFIG
========================================================= */

import {
    auth,
    db
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

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent =
        message;

    loginMessage.className =
        type;

}


/* =========================================================
   CHECK ORGANIZATION STATUS
========================================================= */

async function checkOrganizationStatus(
    user
) {

    console.log(
        "🏢 Checking organization status..."
    );


    const organizationsRef =
        collection(
            db,
            "organizations"
        );


    const organizationQuery =
        query(
            organizationsRef,
            where(
                "ownerUid",
                "==",
                user.uid
            )
        );


    const snapshot =
        await getDocs(
            organizationQuery
        );


    /* =========================================
       NO ORGANIZATION
    ========================================= */

    if (snapshot.empty) {

        return {
            allowed: false,
            message:
                "No organization was found for this administrator account."
        };

    }


    /* =========================================
       GET ORGANIZATION
    ========================================= */

    const organization =
        snapshot.docs[0].data();


    const status =
        String(
            organization.status ||
            "pending"
        ).toLowerCase();


    console.log(
        "🏢 Organization status:",
        status
    );


    /* =========================================
       SUSPENDED
    ========================================= */

    if (status === "suspended") {

        return {
            allowed: false,
            message:
                "Your organization account has been suspended by Virello Technologies. Please contact the administrator."
        };

    }


    /* =========================================
       PENDING
    ========================================= */

    if (status === "pending") {

        return {
            allowed: false,
            message:
                "Your organization is still pending verification. Please wait for subscription/payment approval."
        };

    }


    /* =========================================
       INACTIVE
    ========================================= */

    if (status === "inactive") {

        return {
            allowed: false,
            message:
                "Your organization account is inactive. Please contact Virello Technologies."
        };

    }


    /* =========================================
       EXPIRED
    ========================================= */

    if (status === "expired") {

        return {
            allowed: false,
            message:
                "Your organization subscription has expired. Please renew your subscription."
        };

    }


    /* =========================================
       ACTIVE
    ========================================= */

    if (status === "active") {

        return {
            allowed: true,
            organization
        };

    }


    /* =========================================
       UNKNOWN STATUS
    ========================================= */

    return {
        allowed: false,
        message:
            "Your organization account is not currently authorized to access the platform."
    };

}


/* =========================================================
   LOGIN FORM
========================================================= */

if (!loginForm) {

    console.error(
        "❌ loginForm was not found."
    );

} else {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            /* =========================================
               GET VALUES
            ========================================= */

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;


            /* =========================================
               VALIDATION
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

            if (loginButton) {

                loginButton.disabled =
                    true;

                loginButton.textContent =
                    "Checking Account...";

            }


            if (loginMessage) {

                loginMessage.className =
                    "";

            }


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
                    "✅ Firebase login successful:",
                    user.uid
                );


                /* =====================================
                   CHECK ORGANIZATION
                ===================================== */

                const access =
                    await checkOrganizationStatus(
                        user
                    );


                /* =====================================
                   ACCESS DENIED
                ===================================== */

                if (!access.allowed) {

                    console.warn(
                        "🚫 Organization access denied:",
                        access.message
                    );


                    await signOut(
                        auth
                    );


                    showMessage(
                        access.message,
                        "error"
                    );


                    if (loginButton) {

                        loginButton.disabled =
                            false;

                        loginButton.textContent =
                            "Sign In";

                    }


                    return;

                }


                /* =====================================
                   ACCESS GRANTED
                ===================================== */

                console.log(
                    "✅ Organization access granted."
                );


                showMessage(
                    "Login successful. Opening your dashboard...",
                    "success"
                );


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
                   FIREBASE ERRORS
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


                else if (
                    error.code ===
                    "permission-denied"
                ) {

                    message =
                        "Unable to verify your organization status because Firestore permission was denied.";

                }


                showMessage(
                    message,
                    "error"
                );


                if (loginButton) {

                    loginButton.disabled =
                        false;

                    loginButton.textContent =
                        "Sign In";

                }

            }

        }
    );

}


/* =========================================================
   FINAL LOG
========================================================= */

console.log(
    "✅ Virello secure login.js loaded."
);
