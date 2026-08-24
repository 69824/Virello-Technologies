/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/attendance-history.js

   PURPOSE:
   Attendance History

   FEATURES:
   - Administrator authentication
   - Load organization
   - Load staff
   - Load attendance records
   - Date range filtering
   - Staff filtering
   - Attendance statistics
   - Attendance history table
   - Logout

   FIRESTORE:

   organizations
      └── ownerUid

   staff
      └── organizationId

   attendance
      ├── organizationId
      ├── staffDocumentId
      ├── staffId
      ├── date
      ├── checkIn
      ├── checkOut
      └── status
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

let allAttendanceRecords = [];

let filteredAttendanceRecords = [];


/* =========================================================
   DOM ELEMENTS
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


const fromDate =
    document.getElementById("fromDate");


const toDate =
    document.getElementById("toDate");


const staffFilter =
    document.getElementById("staffFilter");


const searchButton =
    document.getElementById("searchButton");


const clearButton =
    document.getElementById("clearButton");


const totalRecords =
    document.getElementById("totalRecords");


const totalPresent =
    document.getElementById("totalPresent");


const totalLate =
    document.getElementById("totalLate");


const totalAbsent =
    document.getElementById("totalAbsent");


const historyTableContainer =
    document.getElementById(
        "historyTableContainer"
    );


const historyTableBody =
    document.getElementById(
        "historyTableBody"
    );


const emptyState =
    document.getElementById(
        "emptyState"
    );


/* =========================================================
   START
========================================================= */

console.log(
    "🔥 Virello attendance-history.js loaded."
);


/* =========================================================
   AUTHENTICATION
========================================================= */

onAuthStateChanged(
    auth,
    async user => {

        console.log(
            "🔐 Checking attendance history authentication..."
        );


        try {

            /* =========================================
               NO USER
            ========================================= */

            if (!user) {

                console.log(
                    "⚠️ No authenticated administrator."
                );


                window.location.href =
                    "login.html";


                return;

            }


            currentUser =
                user;


            console.log(
                "✅ Attendance history authenticated:",
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
               LOAD ATTENDANCE
            ========================================= */

            await loadAttendance();


            /* =========================================
               STAFF FILTER
            ========================================= */

            populateStaffFilter();


            /* =========================================
               DEFAULT DATES
            ========================================= */

            setDefaultDates();


            /* =========================================
               FILTER
            ========================================= */

            applyFilters();


            /* =========================================
               HIDE LOADING
            ========================================= */

            hideLoading();


            console.log(
                "✅ Attendance history loaded successfully."
            );


        } catch (error) {

            console.error(
                "❌ Attendance history error:",
                error
            );


            showError(
                error.message ||
                "Unable to load attendance history."
            );

        }

    }
);


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


    const organizationDocument =
        snapshot.docs[0];


    currentOrganization = {

        id:
            organizationDocument.id,

        ...organizationDocument.data()

    };


    console.log(
        "✅ Organization loaded:",
        currentOrganization
    );


    displayOrganization();

}


/* =========================================================
   DISPLAY ORGANIZATION
========================================================= */

function displayOrganization() {

    const name =
        currentOrganization.organizationName ||
        currentOrganization.name ||
        "Organization";


    const type =
        currentOrganization.organizationType ||
        currentOrganization.type ||
        "Organization";


    const country =
        currentOrganization.country ||
        "Country";


    const administrator =
        currentOrganization.adminName ||
        currentOrganization.ownerName ||
        currentUser.displayName ||
        currentUser.email ||
        "Administrator";


    if (organizationName) {

        organizationName.textContent =
            name;

    }


    if (organizationType) {

        organizationType.textContent =
            type;

    }


    if (organizationCountry) {

        organizationCountry.textContent =
            country;

    }


    if (adminName) {

        adminName.textContent =
            administrator;

    }


    if (subscriptionStatus) {

        const status =
            currentOrganization.status ||
            currentOrganization.subscriptionStatus ||
            "Active";


        subscriptionStatus.textContent =
            "Subscription: " +
            capitalizeFirst(
                status
            );

    }

}


/* =========================================================
   LOAD STAFF
========================================================= */

async function loadStaff() {

    console.log(
        "👥 Loading staff..."
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
        documentSnapshot => {

            staffMembers.push({

                id:
                    documentSnapshot.id,

                ...documentSnapshot.data()

            });

        }
    );


    console.log(
        "✅ Staff loaded:",
        staffMembers
    );

}


/* =========================================================
   LOAD ATTENDANCE
========================================================= */

async function loadAttendance() {

    console.log(
        "📋 Loading attendance records..."
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
            )
        );


    const snapshot =
        await getDocs(
            attendanceQuery
        );


    allAttendanceRecords = [];


    snapshot.forEach(
        documentSnapshot => {

            allAttendanceRecords.push({

                id:
                    documentSnapshot.id,

                ...documentSnapshot.data()

            });

        }
    );


    console.log(
        "✅ Attendance records loaded:",
        allAttendanceRecords
    );


    console.log(
        "📋 Total attendance records:",
        allAttendanceRecords.length
    );

}


/* =========================================================
   POPULATE STAFF FILTER
========================================================= */

function populateStaffFilter() {

    if (!staffFilter) {

        return;

    }


    staffFilter.innerHTML = `

        <option value="all">
            All Staff
        </option>

    `;


    staffMembers.forEach(
        staff => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                staff.id;


            option.textContent =
                getStaffName(
                    staff
                );


            staffFilter.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   DEFAULT DATES
========================================================= */

function setDefaultDates() {

    const today =
        getLocalDateString();


    if (fromDate) {

        fromDate.value =
            today;

    }


    if (toDate) {

        toDate.value =
            today;

    }

}


/* =========================================================
   SEARCH BUTTON
========================================================= */

if (searchButton) {

    searchButton.addEventListener(
        "click",
        () => {

            applyFilters();

        }
    );

}


/* =========================================================
   CLEAR BUTTON
========================================================= */

if (clearButton) {

    clearButton.addEventListener(
        "click",
        () => {

            setDefaultDates();


            if (staffFilter) {

                staffFilter.value =
                    "all";

            }


            applyFilters();

        }
    );

}


/* =========================================================
   APPLY FILTERS
========================================================= */

function applyFilters() {

    const start =
        fromDate?.value ||
        "";


    const end =
        toDate?.value ||
        "";


    const selectedStaff =
        staffFilter?.value ||
        "all";


    console.log(
        "🔎 Applying filters:",
        {
            start,
            end,
            selectedStaff
        }
    );


    filteredAttendanceRecords =
        allAttendanceRecords.filter(
            record => {

                /* =====================================
                   DATE
                ===================================== */

                const recordDate =
                    record.date ||
                    "";


                if (
                    start &&
                    recordDate < start
                ) {

                    return false;

                }


                if (
                    end &&
                    recordDate > end
                ) {

                    return false;

                }


                /* =====================================
                   STAFF
                ===================================== */

                if (
                    selectedStaff !==
                    "all"
                ) {

                    const matchesStaff =
                        record.staffDocumentId ===
                        selectedStaff;


                    if (!matchesStaff) {

                        return false;

                    }

                }


                return true;

            }
        );


    /* =========================================
       SORT NEWEST FIRST
    ========================================= */

    filteredAttendanceRecords.sort(
        (a, b) => {

            if (
                a.date ===
                b.date
            ) {

                return 0;

            }


            return a.date <
                b.date
                ? 1
                : -1;

        }
    );


    console.log(
        "🔎 Filtered records:",
        filteredAttendanceRecords
    );


    renderHistory();

    updateStatistics();

}


/* =========================================================
   RENDER HISTORY
========================================================= */

function renderHistory() {

    if (!historyTableBody) {

        console.error(
            "❌ historyTableBody not found."
        );


        return;

    }


    historyTableBody.innerHTML =
        "";


    if (
        filteredAttendanceRecords.length ===
        0
    ) {

        if (historyTableContainer) {

            historyTableContainer.style.display =
                "none";

        }


        if (emptyState) {

            emptyState.style.display =
                "block";

        }


        return;

    }


    if (historyTableContainer) {

        historyTableContainer.style.display =
            "block";

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    filteredAttendanceRecords.forEach(
        record => {

            const staff =
                findStaffForRecord(
                    record
                );


            const staffName =
                staff
                    ? getStaffName(staff)
                    : (
                        record.staffName ||
                        "Staff Member"
                    );


            const position =
                staff
                    ? getStaffPosition(staff)
                    : "Staff";


            const staffId =
                staff
                    ? getStaffId(staff)
                    : (
                        record.staffId ||
                        "N/A"
                    );


            const initials =
                getInitials(
                    staffName
                );


            const status =
                String(
                    record.status ||
                    "absent"
                )
                .toLowerCase();


            let statusClass =
                "status-absent";


            if (
                status ===
                "present"
            ) {

                statusClass =
                    "status-present";

            }


            if (
                status ===
                "late"
            ) {

                statusClass =
                    "status-late";

            }


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        record.date ||
                        "—"
                    )}
                </td>


                <td>

                    <div class="person">

                        <div class="avatar">

                            ${escapeHTML(
                                initials
                            )}

                        </div>

                        <div>

                            <div class="person-name">

                                ${escapeHTML(
                                    staffName
                                )}

                            </div>

                            <div class="person-position">

                                ${escapeHTML(
                                    position
                                )}

                            </div>

                        </div>

                    </div>

                </td>


                <td>

                    ${escapeHTML(
                        staffId
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        record.checkIn ||
                        "—"
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        record.checkOut ||
                        "—"
                    )}

                </td>


                <td>

                    <span
                        class="status ${statusClass}"
                    >

                        ${escapeHTML(
                            capitalizeFirst(
                                status
                            )
                        )}

                    </span>

                </td>

            `;


            historyTableBody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   UPDATE STATISTICS
========================================================= */

function updateStatistics() {

    const records =
        filteredAttendanceRecords;


    const total =
        records.length;


    const present =
        records.filter(
            record =>
                String(
                    record.status ||
                    ""
                )
                .toLowerCase() ===
                "present"
        ).length;


    const late =
        records.filter(
            record =>
                String(
                    record.status ||
                    ""
                )
                .toLowerCase() ===
                "late"
        ).length;


    /*
       Important:
       History only counts actual attendance
       documents.

       It does NOT invent absent records for
       dates where no attendance document exists.
    */

    const absent =
        records.filter(
            record =>
                String(
                    record.status ||
                    ""
                )
                .toLowerCase() ===
                "absent"
        ).length;


    if (totalRecords) {

        totalRecords.textContent =
            total;

    }


    if (totalPresent) {

        totalPresent.textContent =
            present;

    }


    if (totalLate) {

        totalLate.textContent =
            late;

    }


    if (totalAbsent) {

        totalAbsent.textContent =
            absent;

    }


    console.log(
        "📊 History statistics:",
        {
            total,
            present,
            late,
            absent
        }
    );

}


/* =========================================================
   FIND STAFF
========================================================= */

function findStaffForRecord(
    record
) {

    return staffMembers.find(
        staff => {

            if (
                record.staffDocumentId ===
                staff.id
            ) {

                return true;

            }


            if (
                record.staffId &&
                (
                    record.staffId ===
                    staff.staffId ||

                    record.staffId ===
                    staff.employeeId
                )
            ) {

                return true;

            }


            return false;

        }
    );

}


/* =========================================================
   STAFF NAME
========================================================= */

function getStaffName(
    staff
) {

    return (

        staff.fullName ||

        staff.name ||

        staff.staffName ||

        [
            staff.firstName,
            staff.lastName
        ]
        .filter(Boolean)
        .join(" ") ||

        "Staff Member"

    );

}


/* =========================================================
   STAFF POSITION
========================================================= */

function getStaffPosition(
    staff
) {

    return (

        staff.position ||

        staff.role ||

        staff.jobTitle ||

        "Staff"

    );

}


/* =========================================================
   STAFF ID
========================================================= */

function getStaffId(
    staff
) {

    return (

        staff.staffId ||

        staff.employeeId ||

        staff.id ||

        "N/A"

    );

}


/* =========================================================
   INITIALS
========================================================= */

function getInitials(
    name
) {

    const words =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (
        words.length ===
        0
    ) {

        return "S";

    }


    if (
        words.length ===
        1
    ) {

        return words[0]
            .substring(
                0,
                2
            )
            .toUpperCase();

    }


    return (
        words[0][0] +
        words[words.length - 1][0]
    )
    .toUpperCase();

}


/* =========================================================
   DATE
========================================================= */

function getLocalDateString(
    date = new Date()
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        )
        .padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


/* =========================================================
   CAPITALIZE
========================================================= */

function capitalizeFirst(
    value
) {

    if (!value) {

        return "";

    }


    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(value)

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
        "❌ Virello History Error:",
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


            } catch (error) {

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
                    "Unable to logout."
                );

            }

        }
    );

}