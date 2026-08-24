/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/firebase-config.js

   PURPOSE:
   Central Firebase configuration for Virello.

   USED BY:
   - login.js
   - register.js
   - dashboard.js
   - staff.js
   - attendance.js
========================================================= */


/* =========================================================
   FIREBASE APP
========================================================= */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";


/* =========================================================
   FIREBASE AUTHENTICATION
========================================================= */

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


/* =========================================================
   FIRESTORE DATABASE
========================================================= */

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   FIREBASE CONFIGURATION
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyDL7URJ6AJEAbcmYlBEqoD9One_6sSBXbo",
  authDomain: "attendx-27b9c.firebaseapp.com",
  projectId: "attendx-27b9c",
  storageBucket: "attendx-27b9c.firebasestorage.app",
  messagingSenderId: "429773494133",
  appId: "1:429773494133:web:49ae5ceb345c7df864253c"
};


/* =========================================================
   INITIALIZE FIREBASE
========================================================= */

const app =
    initializeApp(
        firebaseConfig
    );


/* =========================================================
   INITIALIZE AUTH
========================================================= */

const auth =
    getAuth(app);


/* =========================================================
   INITIALIZE FIRESTORE
========================================================= */

const db =
    getFirestore(app);


/* =========================================================
   EXPORT SERVICES
========================================================= */

export {
    app,
    auth,
    db
};


/* =========================================================
   CONFIRMATION
========================================================= */

console.log(
    "🔥 Virello Firebase initialized successfully."
);

console.log(
    "🔥 Firebase Authentication ready."
);

console.log(
    "🔥 Firestore database ready."
);

