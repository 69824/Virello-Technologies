/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/dashboard.js

   PURPOSE:
   Complete Organization Dashboard

   LOADS:
   - Logged-in administrator
   - Organization
   - Total active staff
   - Present today
   - Late today
   - Absent today
   - Attendance records

   FIREBASE STRUCTURE:

   organizations
      └── organization document
          ownerUid

   staff
      └── staff document
          organizationId

   attendance
      └── attendance document
          organizationId
          staffDocumentId
          date
          status
          checkIn
          checkOut

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
   GLOBAL STATE
========================================================= */

let currentUser = null;

let currentOrganization = null;

let staffMembers = [];

let attendanceRecords = [];


/* =========================================================
   HTML ELEMENTS
========================================================= */

const loadingScreen =
    document.getElementById("loadingScreen");

const errorScreen =
    document.getElementById("errorScreen");

const errorMessage =
    document.getElementById("errorMessage");

const organizationName =
    document.getElementById("organizationName");

const organizationType =
    document.getElementById("organizationType");

const organizationCountry =
    document.getElementById("organizationCountry");

const subscriptionStatus =
    document.getElementById("subscriptionStatus");

const adminName =
    document.getElementById("adminName");

const logoutButton =
    document.getElementById("logoutButton");

const totalStaffElement =
    document.getElementById("totalStaff");

const presentTodayElement =
    document.getElementById("presentToday");

const lateTodayElement =
    document.getElementById("lateToday");

const absentTodayElement =
    document.getElementById("absentToday");


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

                    window.location.href =
                        "login.html";

                    return;

                }


                /* =========================================
                   SAVE CURRENT USER
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


                if (!currentOrganization) {

                    return;

                }


                /* =========================================
                   LOAD STAFF
                ========================================= */

                await loadStaff();


                /* =========================================
                   LOAD TODAY ATTENDANCE
                ========================================= */

                await loadTodayAttendance();


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


                showError(
                    error.message ||
                    "Unable to load your dashboard."
                );

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
       GET FIRST ORGANIZATION
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


    displayOrganization();

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


    if (value === "none") {

        return "Active";

    }


    return status || "Active";

}


/* =========================================================
   LOAD STAFF
========================================================= */

async function loadStaff() {

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

                return status !== "inactive";

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

                return status === "present";

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

                return status === "late";

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
       DISPLAY TOTAL STAFF
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


    return `${year}-${month}-${day}`;

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
   FINAL LOG
========================================================= */

console.log(
    "✅ Virello complete dashboard.js loaded."
);