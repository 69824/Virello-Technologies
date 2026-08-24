/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/register.js

   PURPOSE:
   Register organization administrator
   Create Firebase Authentication account
   Create organization record in Firestore
========================================================= */


/* =========================================================
   FIREBASE IMPORTS
========================================================= */

import {
    auth,
    db
} from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   FORM
========================================================= */

const registerForm =
    document.getElementById("registerForm");


/* =========================================================
   MESSAGE ELEMENTS
========================================================= */

const message =
    document.getElementById("message");


const registerButton =
    document.getElementById("registerButton");


/* =========================================================
   REGISTRATION
========================================================= */

registerForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    /* =========================================
       GET FORM VALUES
    ========================================= */

    const organizationName =
        document
            .getElementById("organizationName")
            .value
            .trim();


    const organizationType =
        document
            .getElementById("organizationType")
            .value;


    const country =
        document
            .getElementById("country")
            .value;


    const adminName =
        document
            .getElementById("adminName")
            .value
            .trim();


    const email =
        document
            .getElementById("email")
            .value
            .trim();


    const password =
        document
            .getElementById("password")
            .value;


    const confirmPassword =
        document
            .getElementById("confirmPassword")
            .value;


    /* =========================================
       VALIDATION
    ========================================= */

    if (
        !organizationName ||
        !organizationType ||
        !country ||
        !adminName ||
        !email ||
        !password ||
        !confirmPassword
    ) {

        showMessage(
            "Please complete all required fields.",
            "error"
        );

        return;
    }


    /* =========================================
       PASSWORD MATCH
    ========================================= */

    if (password !== confirmPassword) {

        showMessage(
            "Passwords do not match.",
            "error"
        );

        return;
    }


    /* =========================================
       PASSWORD LENGTH
    ========================================= */

    if (password.length < 6) {

        showMessage(
            "Password must contain at least 6 characters.",
            "error"
        );

        return;
    }


    /* =========================================
       DISABLE BUTTON
    ========================================= */

    registerButton.disabled = true;

    registerButton.textContent =
        "Creating Organization...";


    try {

        /* =========================================
           CREATE FIREBASE USER
        ========================================= */

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            userCredential.user;


        console.log(
            "Firebase user created:",
            user.uid
        );


        /* =========================================
           UPDATE ADMINISTRATOR PROFILE
        ========================================= */

        await updateProfile(
            user,
            {
                displayName: adminName
            }
        );


        /* =========================================
           CREATE ORGANIZATION
        ========================================= */

        const organizationRef =
            await addDoc(
                collection(db, "organizations"),
                {

                    organizationName:
                        organizationName,

                    organizationType:
                        organizationType,

                    country:
                        country,

                    adminName:
                        adminName,

                    adminEmail:
                        email,

                    ownerUid:
                        user.uid,

                    status:
                        "active",

                    subscriptionPlan:
                        "none",

                    createdAt:
                        serverTimestamp()

                }
            );


        console.log(
            "Organization created:",
            organizationRef.id
        );


        /* =========================================
           SUCCESS
        ========================================= */

        showMessage(
            "Organization registered successfully.",
            "success"
        );


        /*
        =============================================
        TEMPORARY REDIRECT

        Dashboard will be created in a later step.
        =============================================
        */

        setTimeout(function () {

            window.location.href =
                "dashboard.html";

        }, 1500);


    } catch (error) {

        console.error(
            "REGISTRATION ERROR:",
            error
        );


        /* =========================================
           FIREBASE ERROR HANDLING
        ========================================= */

        let errorMessage =
            "Registration failed. Please try again.";


        if (
            error.code ===
            "auth/email-already-in-use"
        ) {

            errorMessage =
                "This email address is already registered.";

        }


        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            errorMessage =
                "Please enter a valid email address.";

        }


        else if (
            error.code ===
            "auth/weak-password"
        ) {

            errorMessage =
                "The password is too weak.";

        }


        else if (
            error.code ===
            "permission-denied"
        ) {

            errorMessage =
                "Firestore permission denied. Check your Firestore security rules.";

        }


        showMessage(
            errorMessage,
            "error"
        );


        /* =========================================
           ENABLE BUTTON AGAIN
        ========================================= */

        registerButton.disabled = false;

        registerButton.textContent =
            "Create Organization";

    }

});


/* =========================================================
   MESSAGE FUNCTION
========================================================= */

function showMessage(text, type) {

    message.textContent = text;

    message.className =
        "message " + type;

}