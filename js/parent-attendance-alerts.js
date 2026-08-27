/* =========================================================
   VIRELLO TECHNOLOGIES
   PARENT ATTENDANCE ALERT CENTER

   FILE:
   js/parent-attendance-alerts.js

   PURPOSE:
   Displays attendance alerts belonging to the
   currently authenticated parent.

   SECURITY MODEL:

   Firebase Auth
        ↓
   Parent UID
        ↓
   attendanceAlerts.parentUid
        ↓
   Only that parent's alerts are displayed.
========================================================= */

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser =
    null;

let alerts =
    [];


/* =========================================================
   DOM
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

const alertsContainer =
    document.getElementById(
        "alertsContainer"
    );

const alertCount =
    document.getElementById(
        "alertCount"
    );

const unreadCount =
    document.getElementById(
        "unreadCount"
    );

const markAllReadButton =
    document.getElementById(
        "markAllReadButton"
    );

const backToDashboardButton =
    document.getElementById(
        "backToDashboard"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        startAlertCenter();

    }
);


/* =========================================================
   AUTHENTICATION
========================================================= */

function startAlertCenter() {

    console.log(
        "🔐 Checking parent authentication..."
    );


    onAuthStateChanged(
        auth,
        async user => {

            try {

                if (!user) {

                    window.location.href =
                        "login.html";

                    return;

                }


                currentUser =
                    user;


                console.log(
                    "✅ Parent authenticated:",
                    user.uid
                );


                await loadParentAlerts();


                hideLoading();

            }

            catch (error) {

                console.error(
                    "❌ Parent alert center error:",
                    error
                );


                showError(
                    error.message ||
                    "Unable to load attendance alerts."
                );

            }

        }
    );

}


/* =========================================================
   LOAD PARENT ALERTS
========================================================= */

async function loadParentAlerts() {

    if (!currentUser) {
        return;
    }


    console.log(
        "🔔 Loading attendance alerts..."
    );


    const alertsRef =
        collection(
            db,
            "attendanceAlerts"
        );


    /*
       IMPORTANT:

       We search by parentUid.

       This means a parent can only receive
       alerts that were created for their
       authenticated Firebase account.
    */

    const alertsQuery =
        query(

            alertsRef,

            where(
                "parentUid",
                "==",
                currentUser.uid
            )

        );


    const snapshot =
        await getDocs(
            alertsQuery
        );


    alerts = [];


    snapshot.forEach(
        alertDocument => {

            alerts.push({

                id:
                    alertDocument.id,

                ...alertDocument.data()

            });

        }
    );


    /*
       Newest first.
    */

    alerts.sort(
        (a, b) => {

            const dateA =
                getTimestampValue(
                    a.createdAt
                );

            const dateB =
                getTimestampValue(
                    b.createdAt
                );


            return dateB - dateA;

        }
    );


    renderAlerts();


    updateCounts();


    console.log(
        "✅ Parent attendance alerts loaded:",
        alerts.length
    );

}


/* =========================================================
   RENDER ALERTS
========================================================= */

function renderAlerts() {

    if (!alertsContainer) {
        return;
    }


    if (!alerts.length) {

        alertsContainer.innerHTML = `

            <div class="no-alerts">

                <div class="no-alerts-icon">
                    🔔
                </div>

                <h3>
                    No Attendance Alerts
                </h3>

                <p>
                    You will see your child's attendance
                    updates here when the school records
                    attendance.
                </p>

            </div>

        `;

        return;

    }


    alertsContainer.innerHTML =
        "";


    alerts.forEach(
        alert => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "attendance-alert";


            if (
                alert.read !== true
            ) {

                item.classList.add(
                    "unread"
                );

            }


            const type =
                String(
                    alert.type ||
                    alert.attendanceStatus ||
                    "attendance"
                )
                    .toLowerCase();


            const icon =
                alert.icon ||
                getAlertIcon(
                    type
                );


            const title =
                alert.title ||
                getAlertTitle(
                    type
                );


            const message =
                alert.message ||
                "Attendance update available.";


            const date =
                formatAlertDate(
                    alert.attendanceDate
                );


            item.innerHTML = `

                <div class="alert-icon ${escapeHtml(type)}">

                    ${escapeHtml(icon)}

                </div>


                <div class="alert-content">

                    <div class="alert-top">

                        <h3>

                            ${escapeHtml(
                                title
                            )}

                        </h3>

                        ${
                            alert.read !== true
                            ? `
                                <span class="new-badge">
                                    NEW
                                </span>
                            `
                            : ""
                        }

                    </div>


                    <div class="alert-student">

                        ${escapeHtml(
                            alert.studentName ||
                            "Student"
                        )}

                        ${
                            alert.className
                            ? `
                                <span>
                                    •
                                    ${escapeHtml(
                                        alert.className
                                    )}
                                </span>
                            `
                            : ""
                        }

                    </div>


                    <p>

                        ${escapeHtml(
                            message
                        )}

                    </p>


                    <div class="alert-date">

                        ${escapeHtml(
                            date
                        )}

                    </div>


                    ${
                        alert.read !== true
                        ? `
                            <button
                                type="button"
                                class="mark-read-button"
                                data-alert-id="${escapeHtml(
                                    alert.id
                                )}"
                            >
                                Mark as Read
                            </button>
                        `
                        : ""
                    }

                </div>

            `;


            alertsContainer.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   MARK SINGLE ALERT READ
========================================================= */

if (alertsContainer) {

    alertsContainer.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    "[data-alert-id]"
                );


            if (!button) {
                return;
            }


            const alertId =
                button.dataset.alertId;


            if (!alertId) {
                return;
            }


            try {

                button.disabled =
                    true;

                button.textContent =
                    "Updating...";


                await updateDoc(
                    doc(
                        db,
                        "attendanceAlerts",
                        alertId
                    ),
                    {
                        read:
                            true
                    }
                );


                const alert =
                    alerts.find(
                        item =>
                            item.id ===
                            alertId
                    );


                if (alert) {

                    alert.read =
                        true;

                }


                renderAlerts();

                updateCounts();

            }

            catch (error) {

                console.error(
                    "❌ Mark alert read error:",
                    error
                );


                alert(
                    "Unable to mark this alert as read."
                );


                button.disabled =
                    false;

                button.textContent =
                    "Mark as Read";

            }

        }
    );

}


/* =========================================================
   MARK ALL READ
========================================================= */

if (markAllReadButton) {

    markAllReadButton.addEventListener(
        "click",
        async () => {

            const unreadAlerts =
                alerts.filter(
                    alert =>
                        alert.read !== true
                );


            if (!unreadAlerts.length) {

                alert(
                    "There are no unread alerts."
                );

                return;

            }


            markAllReadButton.disabled =
                true;


            markAllReadButton.textContent =
                "Marking as Read...";


            try {

                for (
                    const alert
                    of unreadAlerts
                ) {

                    await updateDoc(
                        doc(
                            db,
                            "attendanceAlerts",
                            alert.id
                        ),
                        {
                            read:
                                true
                        }
                    );


                    alert.read =
                        true;

                }


                renderAlerts();

                updateCounts();

            }

            catch (error) {

                console.error(
                    "❌ Mark all read error:",
                    error
                );


                alert(
                    "Unable to mark all alerts as read."
                );

            }

            finally {

                markAllReadButton.disabled =
                    false;


                markAllReadButton.textContent =
                    "Mark All as Read";

            }

        }
    );

}


/* =========================================================
   COUNTS
========================================================= */

function updateCounts() {

    const total =
        alerts.length;


    const unread =
        alerts.filter(
            alert =>
                alert.read !== true
        ).length;


    if (alertCount) {

        alertCount.textContent =
            total;

    }


    if (unreadCount) {

        unreadCount.textContent =
            unread;

    }


    if (markAllReadButton) {

        markAllReadButton.style.display =
            unread > 0
                ? "inline-flex"
                : "none";

    }

}


/* =========================================================
   ALERT ICON
========================================================= */

function getAlertIcon(
    type
) {

    if (
        type === "present"
    ) {

        return "🟢";

    }


    if (
        type === "late"
    ) {

        return "🟡";

    }


    if (
        type === "absent"
    ) {

        return "🔴";

    }


    return "🔔";

}


/* =========================================================
   ALERT TITLE
========================================================= */

function getAlertTitle(
    type
) {

    if (
        type === "present"
    ) {

        return "ATTENDANCE CONFIRMED";

    }


    if (
        type === "late"
    ) {

        return "LATE ARRIVAL";

    }


    if (
        type === "absent"
    ) {

        return "ABSENCE ALERT";

    }


    return "ATTENDANCE UPDATE";

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatAlertDate(
    date
) {

    if (!date) {
        return "Attendance update";
    }


    /*
       YYYY-MM-DD
    */

    if (
        typeof date ===
        "string"
    ) {

        const parts =
            date.split("-");


        if (
            parts.length === 3
        ) {

            return `${parts[2]}/${parts[1]}/${parts[0]}`;

        }

    }


    return String(
        date
    );

}


/* =========================================================
   FIRESTORE TIMESTAMP
========================================================= */

function getTimestampValue(
    timestamp
) {

    if (!timestamp) {
        return 0;
    }


    if (
        typeof timestamp.toMillis ===
        "function"
    ) {

        return timestamp.toMillis();

    }


    if (
        typeof timestamp.seconds ===
        "number"
    ) {

        return timestamp.seconds * 1000;

    }


    if (
        timestamp instanceof Date
    ) {

        return timestamp.getTime();

    }


    return 0;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   BACK TO DASHBOARD
========================================================= */

if (backToDashboardButton) {

    backToDashboardButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "student-parent-dashboard.html";

        }
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
                    "❌ Logout error:",
                    error
                );


                logoutButton.disabled =
                    false;


                logoutButton.textContent =
                    "Logout";

            }

        }
    );

}


/* =========================================================
   LOADING
========================================================= */

function hideLoading() {

    if (loadingScreen) {

        loadingScreen.style.display =
            "none";

    }

}


/* =========================================================
   ERROR
========================================================= */

function showError(
    message
) {

    if (loadingScreen) {

        loadingScreen.style.display =
            "none";

    }


    if (errorScreen) {

        errorScreen.style.display =
            "flex";

    }


    if (errorMessage) {

        errorMessage.textContent =
            message;

    }

}


/* =========================================================
   FINAL
========================================================= */

console.log(
    "✅ Virello parent-attendance-alerts.js loaded."
);
