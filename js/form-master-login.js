/* =========================================================
   VIRELLO TECHNOLOGIES
   FORM MASTER LOGIN

   FILE:
   js/form-master-login.js

   PURPOSE:
   - Firebase Authentication
   - Find Form Master profile
   - Store profile locally
   - Redirect to dashboard
========================================================= */

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


/* =========================================================
   DOM
========================================================= */

const loginForm =
    document.getElementById("loginForm");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const errorMessage =
    document.getElementById("errorMessage");

const successMessage =
    document.getElementById("successMessage");


/* =========================================================
   ERROR
========================================================= */

function showError(message) {

    if (!errorMessage) {
        return;
    }

    errorMessage.textContent = message;

    errorMessage.style.display = "block";

}


/* =========================================================
   HIDE ERROR
========================================================= */

function hideError() {

    if (!errorMessage) {
        return;
    }

    errorMessage.textContent = "";

    errorMessage.style.display = "none";

}


/* =========================================================
   SUCCESS
========================================================= */

function showSuccess(message) {

    if (!successMessage) {
        return;
    }

    successMessage.textContent = message;

    successMessage.style.display = "block";

}


/* =========================================================
   HIDE SUCCESS
========================================================= */

function hideSuccess() {

    if (!successMessage) {
        return;
    }

    successMessage.textContent = "";

    successMessage.style.display = "none";

}


/* =========================================================
   LOADING BUTTON
========================================================= */

function setLoading(loading) {

    if (!loginButton) {
        return;
    }

    loginButton.disabled = loading;

    loginButton.textContent =
        loading
            ? "Signing In..."
            : "Sign In";

}


/* =========================================================
   NORMALIZE PROFILE
========================================================= */

function normalizeProfile(
    documentSnapshot,
    user
) {

    const data =
        documentSnapshot.data();

    return {

        id:
            documentSnapshot.id,

        ...data,

        uid:
            data.uid ||
            user.uid,

        email:
            data.email ||
            user.email ||
            "",

        fullName:
            data.fullName ||
            data.name ||
            data.displayName ||
            user.displayName ||
            "Form Master",

        organizationId:
            data.organizationId ||
            data.orgId ||
            data.organizationID ||
            "",

        role:
            data.role ||
            "teacher",

        status:
            data.status ||
            "active"

    };

}


/* =========================================================
   SEARCH COLLECTION BY UID
========================================================= */

async function findByUid(
    collectionName,
    user
) {

    const ref =
        collection(
            db,
            collectionName
        );

    const q =
        query(
            ref,
            where(
                "uid",
                "==",
                user.uid
            )
        );

    const snapshot =
        await getDocs(q);

    if (
        !snapshot.empty
    ) {

        return normalizeProfile(
            snapshot.docs[0],
            user
        );

    }

    return null;

}


/* =========================================================
   SEARCH COLLECTION BY EMAIL
========================================================= */

async function findByEmail(
    collectionName,
    user
) {

    if (!user.email) {
        return null;
    }

    const email =
        user.email
            .trim()
            .toLowerCase();

    const ref =
        collection(
            db,
            collectionName
        );

    const q =
        query(
            ref,
            where(
                "email",
                "==",
                email
            )
        );

    const snapshot =
        await getDocs(q);

    if (
        !snapshot.empty
    ) {

        return normalizeProfile(
            snapshot.docs[0],
            user
        );

    }

    return null;

}


/* =========================================================
   FIND FORM MASTER
========================================================= */

async function findFormMaster(user) {

    console.log(
        "🔎 Looking for Form Master:",
        user.email
    );


    /*
     * STAFF BY UID
     */

    try {

        const profile =
            await findByUid(
                "staff",
                user
            );

        if (profile) {

            console.log(
                "✅ Form Master found in staff by UID",
                profile
            );

            return profile;

        }

    }

    catch (error) {

        console.warn(
            "Staff UID search failed:",
            error
        );

    }


    /*
     * STAFF BY EMAIL
     */

    try {

        const profile =
            await findByEmail(
                "staff",
                user
            );

        if (profile) {

            console.log(
                "✅ Form Master found in staff by email",
                profile
            );

            return profile;

        }

    }

    catch (error) {

        console.warn(
            "Staff email search failed:",
            error
        );

    }


    /*
     * TEACHERS BY UID
     */

    try {

        const profile =
            await findByUid(
                "teachers",
                user
            );

        if (profile) {

            console.log(
                "✅ Form Master found in teachers by UID",
                profile
            );

            return profile;

        }

    }

    catch (error) {

        console.warn(
            "Teachers UID search failed:",
            error
        );

    }


    /*
     * TEACHERS BY EMAIL
     */

    try {

        const profile =
            await findByEmail(
                "teachers",
                user
            );

        if (profile) {

            console.log(
                "✅ Form Master found in teachers by email",
                profile
            );

            return profile;

        }

    }

    catch (error) {

        console.warn(
            "Teachers email search failed:",
            error
        );

    }


    return null;

}


/* =========================================================
   VERIFY PROFILE
========================================================= */

function verifyProfile(profile) {

    if (!profile) {
        throw new Error(
            "Your Firebase account is not registered as a Virello Form Master. Please contact your administrator."
        );
    }

    const role =
        String(profile.role || "")
            .trim()
            .toLowerCase();

    const isFormMaster =
        profile.isFormMaster === true ||
        role === "form_master";

    if (!isFormMaster) {
        throw new Error(
            "This account is not a Virello Form Master account. Please use the correct login page."
        );
    }

    if (!profile.organizationId) {
        throw new Error(
            "Your Form Master account is not connected to a Virello organization."
        );
    }

    const status =
        String(profile.status || "active")
            .trim()
            .toLowerCase();

    if (
        status === "inactive" ||
        status === "disabled" ||
        status === "suspended"
    ) {
        throw new Error(
            "Your Form Master account is inactive. Please contact your administrator."
        );
    }

    return true;
}


/* =========================================================
   STORE PROFILE
========================================================= */

function storeProfile(
    profile
) {

    localStorage.setItem(
        "virelloFormMaster",
        JSON.stringify(profile)
    );

}


/* =========================================================
   LOGIN
========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            hideError();

            hideSuccess();

            const email =
                emailInput
                    .value
                    .trim()
                    .toLowerCase();

            const password =
                passwordInput.value;


            if (!email) {

                showError(
                    "Please enter your email address."
                );

                return;

            }


            if (!password) {

                showError(
                    "Please enter your password."
                );

                return;

            }


            setLoading(true);


            try {

                console.log(
                    "🔐 Form Master login:",
                    email
                );


                /*
                 * FIREBASE AUTHENTICATION
                 */

                const credential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    credential.user;


                console.log(
                    "✅ Firebase authentication successful:",
                    user.uid
                );


                /*
                 * FIND FORM MASTER RECORD
                 */

                const profile =
                    await findFormMaster(
                        user
                    );


                verifyProfile(
                    profile
                );


                /*
                 * SAVE PROFILE
                 */

                storeProfile(
                    profile
                );


                console.log(
                    "✅ Form Master verified:",
                    profile
                );


                showSuccess(
                    "Login successful. Opening dashboard..."
                );


                /*
                 * REDIRECT
                 */

                setTimeout(
                    () => {

                        window.location.href =
                            "form-master-dashboard.html";

                    },
                    300
                );

            }

            catch (error) {

                console.error(
                    "❌ Form Master login error:",
                    error
                );


                let message =
                    "Unable to sign in. Please try again.";


                switch (
                    error.code
                ) {

                    case "auth/invalid-credential":

                    case "auth/wrong-password":

                    case "auth/user-not-found":

                        message =
                            "Incorrect email or password.";

                        break;


                    case "auth/invalid-email":

                        message =
                            "Please enter a valid email address.";

                        break;


                    case "auth/user-disabled":

                        message =
                            "This Firebase account has been disabled.";

                        break;


                    case "auth/too-many-requests":

                        message =
                            "Too many login attempts. Please wait and try again.";

                        break;


                    case "auth/network-request-failed":

                        message =
                            "Network connection failed. Check your internet connection.";

                        break;


                    case "permission-denied":

                        message =
                            "Login succeeded, but Virello cannot read your Form Master profile. Check Firestore permissions.";

                        break;


                    default:

                        if (
                            error.message
                        ) {

                            message =
                                error.message;

                        }

                }


                try {
                    await signOut(auth);
                } catch {
                    // Ignore logout failure after rejected verification.
                }

                localStorage.removeItem("virelloFormMaster");

                showError(
                    message
                );

            }

            finally {

                setLoading(false);

            }

        }
    );

}


console.log(
    "✅ Virello Form Master Login loaded."
);
