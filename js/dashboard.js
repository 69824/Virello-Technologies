/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/dashboard.js

   PURPOSE:
   Complete Organization Dashboard

   SECURITY:
   - Requires Firebase authentication
   - Loads organization owned by current user
   - Checks organization status
   - Blocks suspended organizations
   - Blocks pending organizations
   - Blocks inactive organizations
   - Blocks expired organizations
   - Real-time monitoring of organization status
   - Automatically signs out suspended accounts
========================================================= */


/* =========================================================
   FIREBASE AUTH
========================================================= */

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


/* =========================================================
   FIRESTORE
========================================================= */

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   FIREBASE CONFIG
========================================================= */

import {
    auth,
    db
} from "./firebase-config.js";


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;

let currentOrganization = null;

let staffMembers = [];

let attendanceRecords = [];

let organizationListener = null;

let accessBlocked = false;


/* =========================================================
   HTML ELEMENTS
========================================================= */

const loadingScreen =
    document.getElementById(
        "loadingScreen"
    );

const errorScreen =
    document.getElementById(
        "errorScreen"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );

const organizationName =
    document.getElementById(
        "organizationName"
    );

const organizationType =
    document.getElementById(
        "organizationType"
    );

const organizationCountry =
    document.getElementById(
        "organizationCountry"
    );

const subscriptionStatus =
    document.getElementById(
        "subscriptionStatus"
    );

const adminName =
    document.getElementById(
        "adminName"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const totalStaffElement =
    document.getElementById(
        "totalStaff"
    );

const presentTodayElement =
    document.getElementById(
        "presentToday"
    );

const lateTodayElement =
    document.getElementById(
        "lateToday"
    );

const absentTodayElement =
    document.getElementById(
        "absentToday"
    );


/* =========================================================
   START DASHBOARD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🔥 Virello Dashboard starting..."
        );


        initializeDashboard();

    }
);


/* =========================================================
   INITIALIZE DASHBOARD
========================================================= */

function initializeDashboard() {

    console.log(
        "🔐 Checking administrator authentication..."
    );


    onAuthStateChanged(
        auth,
        async user => {

            try {

                /* =========================================
                   USER NOT LOGGED IN
                ========================================= */

                if (!user) {

                    console.log(
                        "⚠️ No authenticated administrator."
                    );


                    redirectToLogin();

                    return;

                }


                /* =========================================
                   SAVE USER
                ========================================= */

                currentUser =
                    user;


                console.log(
                    "✅ Dashboard authenticated:",
                    user.email
                );


                /* =========================================
                   LOAD ORGANIZATION
                ========================================= */

                await loadOrganization();


                if (
                    !currentOrganization ||
                    accessBlocked
                ) {

                    return;

                }


                /* =========================================
                   START REAL-TIME STATUS MONITOR
                ========================================= */

                startOrganizationStatusListener();


                /* =========================================
                   LOAD STAFF
                ========================================= */

                await loadStaff();


                if (accessBlocked) {
                    return;
                }


                /* =========================================
                   LOAD TODAY ATTENDANCE
                ========================================= */

                await loadTodayAttendance();


                if (accessBlocked) {
                    return;
                }


                /* =========================================
                   UPDATE STATISTICS
                ========================================= */

                updateDashboardStatistics();


                /* =========================================
                   HIDE LOADING
                ========================================= */

                hideLoading();


                console.log(
                    "✅ Virello dashboard loaded successfully."
                );

            }


            catch (error) {

                console.error(
                    "❌ Dashboard initialization error:",
                    error
                );


                if (!accessBlocked) {

                    showError(
                        error.message ||
                        "Unable to load your dashboard."
                    );

                }

            }

        }
    );

}


/* =========================================================
   LOAD ORGANIZATION
========================================================= */

async function loadOrganization() {

    console.log(
        "🏢 Loading organization..."
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
                currentUser.uid
            )

        );


    const snapshot =
        await getDocs(
            organizationQuery
        );


    console.log(
        "🏢 Organizations found:",
        snapshot.size
    );


    if (snapshot.empty) {

        showError(
            "No organization was found for this administrator account."
        );

        return;

    }


    /* =========================================
       GET ORGANIZATION
    ========================================= */

    const organizationDocument =
        snapshot.docs[0];


    currentOrganization = {

        id:
            organizationDocument.id,

        ...organizationDocument.data()

    };


    console.log(
        "🏢 Organization loaded:",
        currentOrganization
    );


    /* =========================================
       CHECK STATUS BEFORE LOADING DASHBOARD
    ========================================= */

    const allowed =
        await enforceOrganizationStatus(
            currentOrganization
        );


    if (!allowed) {

        return;

    }


    displayOrganization();

}


/* =========================================================
   ENFORCE ORGANIZATION STATUS
========================================================= */

async function enforceOrganizationStatus(
    organization
) {

    if (!organization) {

        return false;

    }


    const status =
        String(
            organization.status ||
            "pending"
        ).toLowerCase();


    console.log(
        "🔐 Organization access status:",
        status
    );


    /* =========================================
       ACTIVE
    ========================================= */

    if (status === "active") {

        return true;

    }


    /* =========================================
       SUSPENDED
    ========================================= */

    if (status === "suspended") {

        await blockOrganizationAccess(
            "Your organization account has been suspended by Virello Technologies."
        );

        return false;

    }


    /* =========================================
       PENDING
    ========================================= */

    if (status === "pending") {

        await blockOrganizationAccess(
            "Your organization is pending subscription/payment verification."
        );

        return false;

    }


    /* =========================================
       INACTIVE
    ========================================= */

    if (status === "inactive") {

        await blockOrganizationAccess(
            "Your organization account is inactive."
        );

        return false;

    }


    /* =========================================
       EXPIRED
    ========================================= */

    if (status === "expired") {

        await blockOrganizationAccess(
            "Your organization subscription has expired."
        );

        return false;

    }


    /* =========================================
       UNKNOWN
    ========================================= */

    await blockOrganizationAccess(
        "Your organization is not authorized to access the platform."
    );


    return false;

}


/* =========================================================
   REAL-TIME ORGANIZATION STATUS LISTENER
========================================================= */

function startOrganizationStatusListener() {

    if (!currentOrganization) {

        return;

    }


    if (organizationListener) {

        organizationListener();

        organizationListener =
            null;

    }


    console.log(
        "👁️ Starting real-time organization status monitoring..."
    );


    const organizationRef =
        doc(
            db,
            "organizations",
            currentOrganization.id
        );


    organizationListener =
        onSnapshot(

            organizationRef,

            async snapshot => {

                try {

                    if (!snapshot.exists()) {

                        console.warn(
                            "⚠️ Organization document no longer exists."
                        );


                        await blockOrganizationAccess(
                            "Your organization account could not be found."
                        );


                        return;

                    }


                    const updatedOrganization =
                        snapshot.data();


                    const oldStatus =
                        String(
                            currentOrganization.status ||
                            ""
                        ).toLowerCase();


                    const newStatus =
                        String(
                            updatedOrganization.status ||
                            "pending"
                        ).toLowerCase();


                    console.log(
                        "🔄 Organization status changed:",
                        oldStatus,
                        "→",
                        newStatus
                    );


                    currentOrganization = {

                        id:
                            snapshot.id,

                        ...updatedOrganization

                    };


                    /* =====================================
                       ACTIVE
                    ===================================== */

                    if (
                        newStatus ===
                        "active"
                    ) {

                        displayOrganization();

                        return;

                    }


                    /* =====================================
                       ANY BLOCKED STATUS
                    ===================================== */

                    await blockOrganizationAccess(
                        getStatusMessage(
                            newStatus
                        )
                    );

                }


                catch (error) {

                    console.error(
                        "❌ Organization status listener error:",
                        error
                    );

                }

            },

            error => {

                console.error(
                    "❌ Organization real-time listener error:",
                    error
                );

            }

        );

}


/* =========================================================
   STATUS MESSAGE
========================================================= */

function getStatusMessage(
    status
) {

    switch (status) {

        case "suspended":

            return (
                "Your organization account has been suspended by Virello Technologies."
            );


        case "pending":

            return (
                "Your organization account is pending subscription/payment verification."
            );


        case "inactive":

            return (
                "Your organization account is inactive."
            );


        case "expired":

            return (
                "Your organization subscription has expired."
            );


        default:

            return (
                "Your organization is no longer authorized to access the platform."
            );

    }

}


/* =========================================================
   BLOCK ORGANIZATION ACCESS
========================================================= */

async function blockOrganizationAccess(
    message
) {

    /* =========================================
       PREVENT DUPLICATE EXECUTION
    ========================================= */

    if (accessBlocked) {

        return;

    }


    accessBlocked =
        true;


    console.warn(
        "🚫 ORGANIZATION ACCESS BLOCKED:",
        message
    );


    /* =========================================
       STOP REAL-TIME LISTENER
    ========================================= */

    if (organizationListener) {

        organizationListener();

        organizationListener =
            null;

    }


    /* =========================================
       SHOW MESSAGE
    ========================================= */

    showError(
        message +
        " You will be signed out."
    );


    /* =========================================
       SIGN OUT
    ========================================= */

    try {

        await signOut(
            auth
        );

    }

    catch (error) {

        console.error(
            "❌ Sign out after access block failed:",
            error
        );

    }


    /* =========================================
       REDIRECT
    ========================================= */

    setTimeout(
        () => {

            window.location.href =
                "login.html";

        },
        1800
    );

}


/* =========================================================
   DISPLAY ORGANIZATION
========================================================= */

function displayOrganization() {

    if (!currentOrganization) {

        return;

    }


    /* =========================================
       ORGANIZATION NAME
    ========================================= */

    const name =
        currentOrganization.organizationName ||
        currentOrganization.name ||
        "Organization";


    if (organizationName) {

        organizationName.textContent =
            name;

    }


    /* =========================================
       ORGANIZATION TYPE
    ========================================= */

    const type =
        currentOrganization.organizationType ||
        currentOrganization.type ||
        "Organization";


    if (organizationType) {

        organizationType.textContent =
            type;

    }


    /* =========================================
       COUNTRY
    ========================================= */

    const country =
        currentOrganization.country ||
        "Country";


    if (organizationCountry) {

        organizationCountry.textContent =
            country;

    }


    /* =========================================
       ADMINISTRATOR
    ========================================= */

    const administrator =
        currentOrganization.adminName ||
        currentOrganization.ownerName ||
        currentUser.displayName ||
        currentUser.email ||
        "Administrator";


    if (adminName) {

        adminName.textContent =
            administrator;

    }


    /* =========================================
       SUBSCRIPTION
    ========================================= */

    const subscription =
        currentOrganization.subscriptionStatus ||
        currentOrganization.subscription ||
        currentOrganization.status ||
        "Active";


    if (subscriptionStatus) {

        subscriptionStatus.textContent =
            "Subscription: " +
            formatSubscription(
                subscription
            );

    }

}


/* =========================================================
   FORMAT SUBSCRIPTION
========================================================= */

function formatSubscription(
    status
) {

    const value =
        String(status)
            .toLowerCase();


    if (value === "active") {

        return "Active";

    }


    if (value === "inactive") {

        return "Inactive";

    }


    if (value === "expired") {

        return "Expired";

    }


    if (value === "suspended") {

        return "Suspended";

    }


    if (value === "pending") {

        return "Pending Verification";

    }


    if (value === "none") {

        return "Inactive";

    }


    return status || "Unknown";

}


/* =========================================================
   LOAD STAFF
========================================================= */

async function loadStaff() {

    if (accessBlocked) {
        return;
    }


    console.log(
        "👥 Loading staff for organization:",
        currentOrganization.id
    );


    const staffRef =
        collection(
            db,
            "staff"
        );


    const staffQuery =
        query(
            staffRef,

            where(
                "organizationId",
                "==",
                currentOrganization.id
            )

        );


    const snapshot =
        await getDocs(
            staffQuery
        );


    if (accessBlocked) {
        return;
    }


    staffMembers = [];


    snapshot.forEach(
        staffDocument => {

            staffMembers.push({

                id:
                    staffDocument.id,

                ...staffDocument.data()

            });

        }
    );


    console.log(
        "✅ Staff loaded:",
        staffMembers
    );


    console.log(
        "👥 Total staff documents:",
        staffMembers.length
    );

}


/* =========================================================
   LOAD TODAY'S ATTENDANCE
========================================================= */

async function loadTodayAttendance() {

    if (accessBlocked) {
        return;
    }


    const today =
        getLocalDateString();


    console.log(
        "📅 Loading attendance for:",
        today
    );


    console.log(
        "🏢 Organization ID:",
        currentOrganization.id
    );


    const attendanceRef =
        collection(
            db,
            "attendance"
        );


    const attendanceQuery =
        query(

            attendanceRef,

            where(
                "organizationId",
                "==",
                currentOrganization.id
            ),

            where(
                "date",
                "==",
                today
            )

        );


    const snapshot =
        await getDocs(
            attendanceQuery
        );


    if (accessBlocked) {
        return;
    }


    attendanceRecords = [];


    snapshot.forEach(
        attendanceDocument => {

            attendanceRecords.push({

                id:
                    attendanceDocument.id,

                ...attendanceDocument.data()

            });

        }
    );


    console.log(
        "✅ Today's attendance loaded:",
        attendanceRecords
    );


    console.log(
        "🕒 Attendance records:",
        attendanceRecords.length
    );

}


/* =========================================================
   UPDATE DASHBOARD STATISTICS
========================================================= */

function updateDashboardStatistics() {

    if (accessBlocked) {
        return;
    }


    console.log(
        "📊 Updating dashboard statistics..."
    );


    /* =========================================
       ACTIVE STAFF
    ========================================= */

    const activeStaff =
        staffMembers.filter(
            staff => {

                const status =
                    String(
                        staff.status ||
                        "active"
                    ).toLowerCase();


                return status !==
                    "inactive";

            }
        );


    const total =
        activeStaff.length;


    /* =========================================
       PRESENT
    ========================================= */

    const present =
        attendanceRecords.filter(
            record => {

                const status =
                    String(
                        record.status ||
                        ""
                    ).toLowerCase();


                return status ===
                    "present";

            }
        ).length;


    /* =========================================
       LATE
    ========================================= */

    const late =
        attendanceRecords.filter(
            record => {

                const status =
                    String(
                        record.status ||
                        ""
                    ).toLowerCase();


                return status ===
                    "late";

            }
        ).length;


    /* =========================================
       ABSENT
    ========================================= */

    const absent =
        Math.max(
            total -
            present -
            late,
            0
        );


    console.log(
        "📊 Dashboard totals:",
        {
            total,
            present,
            late,
            absent
        }
    );


    /* =========================================
       DISPLAY TOTAL
    ========================================= */

    if (totalStaffElement) {

        totalStaffElement.textContent =
            total;

    }


    /* =========================================
       DISPLAY PRESENT
    ========================================= */

    if (presentTodayElement) {

        presentTodayElement.textContent =
            present;

    }


    /* =========================================
       DISPLAY LATE
    ========================================= */

    if (lateTodayElement) {

        lateTodayElement.textContent =
            late;

    }


    /* =========================================
       DISPLAY ABSENT
    ========================================= */

    if (absentTodayElement) {

        absentTodayElement.textContent =
            absent;

    }

}


/* =========================================================
   GET LOCAL DATE
========================================================= */

function getLocalDateString(
    date = new Date()
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


/* =========================================================
   LOGOUT
========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                console.log(
                    "🚪 Logging out..."
                );


                logoutButton.disabled =
                    true;


                logoutButton.textContent =
                    "Logging out...";


                if (organizationListener) {

                    organizationListener();

                    organizationListener =
                        null;

                }


                await signOut(
                    auth
                );


                window.location.href =
                    "login.html";

            }


            catch (error) {

                console.error(
                    "❌ Logout failed:",
                    error
                );


                logoutButton.disabled =
                    false;


                logoutButton.textContent =
                    "Logout";


                alert(
                    error.message ||
                    "Unable to log out. Please try again."
                );

            }

        }
    );

}


/* =========================================================
   HIDE LOADING
========================================================= */

function hideLoading() {

    if (!loadingScreen) {

        return;

    }


    loadingScreen.style.display =
        "none";

}


/* =========================================================
   SHOW ERROR
========================================================= */

function showError(
    message
) {

    console.error(
        "❌ Virello Dashboard Error:",
        message
    );


    if (loadingScreen) {

        loadingScreen.style.display =
            "none";

    }


    if (errorScreen) {

        errorScreen.style.display =
            "block";

    }


    if (errorMessage) {

        errorMessage.textContent =
            message;

    }

}


/* =========================================================
   REDIRECT TO LOGIN
========================================================= */

function redirectToLogin() {

    window.location.href =
        "login.html";

}


/* =========================================================
   FINAL LOG
========================================================= */

console.log(
    "✅ Virello secure dashboard.js loaded."
);
