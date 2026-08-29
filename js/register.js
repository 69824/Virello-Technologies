/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/register.js

   PURPOSE:
   Register organization administrator
   Create Firebase Authentication account
   Create organization record in Firestore

   NEW:
   Organizations begin as PENDING until
   Super Admin verifies subscription/payment.
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
    document.getElementById(
        "registerForm"
    );


/* =========================================================
   MESSAGE
========================================================= */

const message =
    document.getElementById(
        "message"
    );


const registerButton =
    document.getElementById(
        "registerButton"
    );


/* =========================================================
   REGISTRATION
========================================================= */

registerForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        /* =========================================
           GET VALUES
        ========================================= */

        const organizationName =
            document
                .getElementById(
                    "organizationName"
                )
                .value
                .trim();


        const organizationType =
            document
                .getElementById(
                    "organizationType"
                )
                .value;


        const country =
            document
                .getElementById(
                    "country"
                )
                .value;


        const adminName =
            document
                .getElementById(
                    "adminName"
                )
                .value
                .trim();


        const email =
            document
                .getElementById(
                    "email"
                )
                .value
                .trim();


        const password =
            document
                .getElementById(
                    "password"
                )
                .value;


        const confirmPassword =
            document
                .getElementById(
                    "confirmPassword"
                )
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

        if (
            password !==
            confirmPassword
        ) {

            showMessage(
                "Passwords do not match.",
                "error"
            );

            return;

        }


        /* =========================================
           PASSWORD LENGTH
        ========================================= */

        if (
            password.length < 6
        ) {

            showMessage(
                "Password must contain at least 6 characters.",
                "error"
            );

            return;

        }


        /* =========================================
           DISABLE BUTTON
        ========================================= */

        registerButton.disabled =
            true;


        registerButton.textContent =
            "Creating Organization...";


        try {

            /* =========================================
               CREATE AUTH USER
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
               ADMIN PROFILE
            ========================================= */

            await updateProfile(
                user,
                {
                    displayName:
                        adminName
                }
            );


            /* =========================================
               CREATE ORGANIZATION
            ========================================= */

            const organizationRef =
                await addDoc(

                    collection(
                        db,
                        "organizations"
                    ),

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


                        /*
                         =====================================
                         SUBSCRIPTION
                         =====================================
                        */

                        status:
                            "pending",

                        subscriptionPlan:
                            "none",

                        subscriptionExpiresAt:
                            null,


                        /*
                         =====================================
                         PAYMENT
                         =====================================
                        */

                        paymentStatus:
                            "pending",

                        paymentVerified:
                            false,

                        paymentMethod:
                            null,

                        paymentReference:
                            null,

                        paymentVerifiedBy:
                            null,

                        paymentVerifiedAt:
                            null,


                        /*
                         =====================================
                         ACCOUNT CONTROL
                         =====================================
                        */

                        suspendedBy:
                            null,

                        suspendedAt:
                            null,


                        /*
                         =====================================
                         TIMESTAMPS
                         =====================================
                        */

                        createdAt:
                            serverTimestamp(),

                        updatedAt:
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
                "Organization registered successfully. Your account is pending subscription verification.",
                "success"
            );


            /*
             =================================================
             TEMPORARY REDIRECT

             The organization can log in, but your dashboard
             should check subscription status before granting
             paid access.
             =================================================
            */

            setTimeout(
                function () {

                    window.location.href =
                        "dashboard.html";

                },
                1800
            );

        }


        catch (error) {

            console.error(
                "REGISTRATION ERROR:",
                error
            );


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


            registerButton.disabled =
                false;


            registerButton.textContent =
                "Create Organization";

        }

    }
);


/* =========================================================
   MESSAGE FUNCTION
========================================================= */

function showMessage(
    text,
    type
) {

    message.textContent =
        text;


    message.className =
        "message " +
        type;

}
