/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/attendance.js

   STEP:
   5B

   PURPOSE:
   Complete Staff Attendance Management

   FEATURES:
   - Administrator authentication
   - Load organization
   - Load active staff
   - Display attendance register
   - Select attendance date
   - Display worker check-in timestamps correctly
   - Check in staff
   - Check out staff
   - Save attendance to Firestore
   - Worker check-in records supported
   - Worker check-out records supported
   - Attendance statistics
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
    addDoc,
    updateDoc,
    doc
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

let selectedDate = "";


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

const attendanceDate =
    document.getElementById("attendanceDate");

const attendanceTableBody =
    document.getElementById("attendanceTableBody");

const emptyState =
    document.getElementById("emptyState");

const totalStaffElement =
    document.getElementById("totalStaff");

const presentTodayElement =
    document.getElementById("presentToday");

const lateTodayElement =
    document.getElementById("lateToday");

const absentTodayElement =
    document.getElementById("absentToday");


/* =========================================================
   START
========================================================= */

console.log(
    "🔥 Virello Attendance 5B loaded."
);


document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🔥 Virello Attendance starting..."
        );

        startAttendance();

    }
);


/* =========================================================
   START ATTENDANCE
========================================================= */

function startAttendance() {

    console.log(
        "🔐 Checking administrator authentication..."
    );


    onAuthStateChanged(
        auth,
        async user => {

            try {

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
                    "✅ Attendance authenticated:",
                    user.email
                );


                /* =========================================
                   SET TODAY
                ========================================= */

                selectedDate =
                    getLocalDateString();


                if (attendanceDate) {

                    attendanceDate.value =
                        selectedDate;

                }


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
                   DISPLAY
                ========================================= */

                renderAttendanceTable();


                updateStatistics();


                hideLoading();


                console.log(
                    "✅ Virello Attendance 5B ready."
                );

            }

            catch (error) {

                console.error(
                    "❌ Attendance initialization error:",
                    error
                );


                showError(
                    error.message ||
                    "Unable to load attendance."
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

    if (!currentOrganization) {

        return;

    }


    const organization =
        currentOrganization;


    if (organizationName) {

        organizationName.textContent =
            organization.organizationName ||
            organization.name ||
            "Organization";

    }


    if (organizationType) {

        organizationType.textContent =
            organization.organizationType ||
            organization.type ||
            "Organization";

    }


    if (organizationCountry) {

        organizationCountry.textContent =
            organization.country ||
            "Country";

    }


    if (adminName) {

        adminName.textContent =
            organization.adminName ||
            organization.ownerName ||
            currentUser.displayName ||
            currentUser.email ||
            "Administrator";

    }


    if (subscriptionStatus) {

        const status =
            organization.status ||
            organization.subscriptionStatus ||
            "Active";


        subscriptionStatus.textContent =
            "Subscription: " +
            formatStatus(status);

    }

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

            const data =
                staffDocument.data();


            const staff = {

                id:
                    staffDocument.id,

                ...data

            };


            const status =
                String(
                    staff.status ||
                    "active"
                ).toLowerCase();


            if (
                status !== "inactive"
            ) {

                staffMembers.push(
                    staff
                );

            }

        }
    );


    console.log(
        "✅ Active staff loaded:",
        staffMembers
    );


    console.log(
        "👥 Active staff count:",
        staffMembers.length
    );

}


/* =========================================================
   LOAD ATTENDANCE
========================================================= */

async function loadAttendance() {

    console.log(
        "📅 Loading attendance for:",
        selectedDate
    );


    if (!currentOrganization) {

        return;

    }


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
                selectedDate
            )

        );


    const snapshot =
        await getDocs(
            attendanceQuery
        );


    attendanceRecords = [];


    snapshot.forEach(
        attendanceDocument => {

            const data =
                attendanceDocument.data();


            attendanceRecords.push({

                id:
                    attendanceDocument.id,

                ...data

            });

        }
    );


    console.log(
        "✅ Attendance records loaded:",
        attendanceRecords
    );


    console.log(
        "🕒 Attendance record count:",
        attendanceRecords.length
    );

}


/* =========================================================
   RENDER ATTENDANCE TABLE
========================================================= */

function renderAttendanceTable() {

    if (!attendanceTableBody) {

        console.error(
            "❌ attendanceTableBody not found."
        );

        return;

    }


    attendanceTableBody.innerHTML =
        "";


    if (!staffMembers.length) {

        if (emptyState) {

            emptyState.style.display =
                "block";


            emptyState.textContent =
                "No active staff members found.";

        }

        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    staffMembers.forEach(
        staff => {

            const record =
                findAttendanceRecord(
                    staff.id
                );


            const row =
                document.createElement(
                    "tr"
                );


            const name =
                getStaffName(
                    staff
                );


            const staffId =
                staff.staffId ||
                staff.employeeId ||
                staff.id;


            const position =
                staff.position ||
                staff.role ||
                staff.jobTitle ||
                "Staff";


            const initials =
                getInitials(
                    name
                );


            /*
               IMPORTANT:

               Worker attendance may store
               checkIn/checkOut as Firestore
               Timestamp objects.

               formatTime() converts them
               into readable time.
            */

            const checkIn =
                formatTime(
                    record?.checkIn
                );


            const checkOut =
                formatTime(
                    record?.checkOut
                );


            const status =
                getAttendanceStatus(
                    record
                );


            row.innerHTML = `

                <td>

                    <div class="attendance-person">

                        <div class="attendance-avatar">
                            ${escapeHtml(initials)}
                        </div>

                        <div>

                            <div class="attendance-name">
                                ${escapeHtml(name)}
                            </div>

                            <div class="attendance-position">
                                ${escapeHtml(position)}
                            </div>

                        </div>

                    </div>

                </td>


                <td>
                    ${escapeHtml(staffId)}
                </td>


                <td>
                    ${escapeHtml(checkIn)}
                </td>


                <td>
                    ${escapeHtml(checkOut)}
                </td>


                <td>
                    ${getStatusBadge(status)}
                </td>


                <td>

                    <div class="attendance-actions">

                        ${getActionButton(
                            staff,
                            record
                        )}

                    </div>

                </td>

            `;


            attendanceTableBody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   FIND ATTENDANCE RECORD
========================================================= */

function findAttendanceRecord(
    staffDocumentId
) {

    return attendanceRecords.find(
        record => {

            /*
               Main worker attendance field.
            */

            if (
                record.staffDocumentId ===
                staffDocumentId
            ) {

                return true;

            }


            /*
               Compatibility with older records.
            */

            if (
                record.staffId ===
                staffDocumentId
            ) {

                return true;

            }


            /*
               Some worker records may use
               workerStaffId.
            */

            if (
                record.workerStaffId ===
                staffDocumentId
            ) {

                return true;

            }


            return false;

        }
    );

}


/* =========================================================
   GET ATTENDANCE STATUS
========================================================= */

function getAttendanceStatus(
    record
) {

    if (!record) {

        return "absent";

    }


    const status =
        String(
            record.status ||
            ""
        ).toLowerCase();


    if (
        status === "late"
    ) {

        return "late";

    }


    if (
        status === "present"
    ) {

        return "present";

    }


    /*
       If there is a check-in but
       no status was saved, treat it
       as present.
    */

    if (
        record.checkIn
    ) {

        return "present";

    }


    return "absent";

}


/* =========================================================
   STATUS BADGE
========================================================= */

function getStatusBadge(
    status
) {

    if (
        status === "present"
    ) {

        return `

            <span class="attendance-status status-present">
                Present
            </span>

        `;

    }


    if (
        status === "late"
    ) {

        return `

            <span class="attendance-status status-late">
                Late
            </span>

        `;

    }


    return `

        <span class="attendance-status status-absent">
            Absent
        </span>

    `;

}


/* =========================================================
   ACTION BUTTON
========================================================= */

function getActionButton(
    staff,
    record
) {

    /*
       No attendance record.
    */

    if (!record) {

        return `

            <button
                type="button"
                class="attendance-checkin-button"
                data-action="checkin"
                data-staff-id="${escapeHtml(staff.id)}"
            >
                Check In
            </button>

        `;

    }


    /*
       Worker/admin has checked in,
       but has NOT checked out.

       SHOW CHECK OUT.
    */

    if (
        record.checkIn &&
        !record.checkOut
    ) {

        return `

            <button
                type="button"
                class="attendance-checkout-button"
                data-action="checkout"
                data-record-id="${escapeHtml(record.id)}"
            >
                Check Out
            </button>

        `;

    }


    /*
       Both check-in and check-out
       are completed.
    */

    return `

        <span class="attendance-complete">
            Completed
        </span>

    `;

}


/* =========================================================
   TABLE BUTTON EVENTS
========================================================= */

if (attendanceTableBody) {

    attendanceTableBody.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    "button[data-action]"
                );


            if (!button) {

                return;

            }


            const action =
                button.dataset.action;


            try {

                button.disabled =
                    true;


                if (
                    action === "checkin"
                ) {

                    await checkInStaff(
                        button.dataset.staffId
                    );

                }


                if (
                    action === "checkout"
                ) {

                    await checkOutStaff(
                        button.dataset.recordId
                    );

                }

            }

            catch (error) {

                console.error(
                    "❌ Attendance action failed:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to update attendance."
                );


                button.disabled =
                    false;

            }

        }
    );

}


/* =========================================================
   CHECK IN STAFF FROM ADMIN REGISTER
========================================================= */

async function checkInStaff(
    staffDocumentId
) {

    console.log(
        "🟢 Checking in staff:",
        staffDocumentId
    );


    if (
        selectedDate !==
        getLocalDateString()
    ) {

        throw new Error(
            "You can only check staff in for today's date."
        );

    }


    const staff =
        staffMembers.find(
            item =>
                item.id ===
                staffDocumentId
        );


    if (!staff) {

        throw new Error(
            "Staff member could not be found."
        );

    }


    const existing =
        findAttendanceRecord(
            staffDocumentId
        );


    if (existing) {

        throw new Error(
            "This staff member already has an attendance record for today."
        );

    }


    const now =
        new Date();


    const status =
        isLate(now)
            ? "late"
            : "present";


    const attendanceData = {

        organizationId:
            currentOrganization.id,

        staffDocumentId:
            staffDocumentId,

        date:
            selectedDate,

        status:
            status,

        /*
           Admin-created records use
           a readable string.
        */

        checkIn:
            getTimeString(now),

        checkOut:
            "",

        createdAt:
            now.toISOString(),

        updatedAt:
            now.toISOString(),

        recordedBy:
            currentUser.uid

    };


    const attendanceRef =
        collection(
            db,
            "attendance"
        );


    const newDocument =
        await addDoc(
            attendanceRef,
            attendanceData
        );


    console.log(
        "✅ Staff checked in:",
        newDocument.id
    );


    await loadAttendance();


    renderAttendanceTable();


    updateStatistics();


    alert(
        `${getStaffName(staff)} checked in successfully.`
    );

}


/* =========================================================
   CHECK OUT STAFF
========================================================= */

async function checkOutStaff(
    attendanceDocumentId
) {

    console.log(
        "🔵 Checking out attendance:",
        attendanceDocumentId
    );


    if (
        selectedDate !==
        getLocalDateString()
    ) {

        throw new Error(
            "You can only check staff out for today's date."
        );

    }


    const attendanceRecord =
        attendanceRecords.find(
            record =>
                record.id ===
                attendanceDocumentId
        );


    if (!attendanceRecord) {

        throw new Error(
            "Attendance record could not be found."
        );

    }


    if (
        attendanceRecord.checkOut
    ) {

        throw new Error(
            "This staff member has already checked out."
        );

    }


    const attendanceDocumentRef =
        doc(
            db,
            "attendance",
            attendanceDocumentId
        );


    const now =
        new Date();


    /*
       Save checkout as readable
       time string.

       This keeps the register
       consistent.
    */

    await updateDoc(
        attendanceDocumentRef,
        {

            checkOut:
                getTimeString(now),

            updatedAt:
                now.toISOString()

        }
    );


    console.log(
        "✅ Staff checked out successfully."
    );


    await loadAttendance();


    renderAttendanceTable();


    updateStatistics();


    alert(
        "Staff member checked out successfully."
    );

}


/* =========================================================
   DATE CHANGE
========================================================= */

if (attendanceDate) {

    attendanceDate.addEventListener(
        "change",
        async () => {

            try {

                selectedDate =
                    attendanceDate.value;


                if (!selectedDate) {

                    return;

                }


                console.log(
                    "📅 Date changed:",
                    selectedDate
                );


                showTableLoading();


                await loadAttendance();


                renderAttendanceTable();


                updateStatistics();

            }

            catch (error) {

                console.error(
                    "❌ Date change error:",
                    error
                );


                alert(
                    "Unable to load attendance for this date."
                );

            }

        }
    );

}


/* =========================================================
   UPDATE STATISTICS
========================================================= */

function updateStatistics() {

    const total =
        staffMembers.length;


    let present =
        0;


    let late =
        0;


    staffMembers.forEach(
        staff => {

            const record =
                findAttendanceRecord(
                    staff.id
                );


            if (!record) {

                return;

            }


            const status =
                String(
                    record.status ||
                    ""
                ).toLowerCase();


            if (
                status === "present"
            ) {

                present++;

            }


            if (
                status === "late"
            ) {

                late++;

            }

        }
    );


    const absent =
        Math.max(
            total -
            present -
            late,
            0
        );


    if (totalStaffElement) {

        totalStaffElement.textContent =
            total;

    }


    if (presentTodayElement) {

        presentTodayElement.textContent =
            present;

    }


    if (lateTodayElement) {

        lateTodayElement.textContent =
            late;

    }


    if (absentTodayElement) {

        absentTodayElement.textContent =
            absent;

    }


    console.log(
        "📊 Attendance statistics:",
        {
            date:
                selectedDate,

            total,

            present,

            late,

            absent
        }
    );

}


/* =========================================================
   SHOW TABLE LOADING
========================================================= */

function showTableLoading() {

    if (!attendanceTableBody) {

        return;

    }


    attendanceTableBody.innerHTML = `

        <tr>

            <td
                colspan="6"
                style="
                    text-align:center;
                    padding:40px;
                    color:#64748b;
                "
            >
                Loading attendance...
            </td>

        </tr>

    `;

}


/* =========================================================
   GET STAFF NAME
========================================================= */

function getStaffName(
    staff
) {

    return (

        staff.name ||

        staff.fullName ||

        staff.staffName ||

        staff.employeeName ||

        "Unnamed Staff"

    );

}


/* =========================================================
   GET INITIALS
========================================================= */

function getInitials(
    name
) {

    const words =
        String(name)
            .trim()
            .split(/\s+/);


    if (!words.length) {

        return "ST";

    }


    if (
        words.length === 1
    ) {

        return words[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (

        words[0][0] +
        words[words.length - 1][0]

    ).toUpperCase();

}


/* =========================================================
   FORMAT TIME
   IMPORTANT FIX FOR WORKER TIMESTAMP
========================================================= */

function formatTime(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";

    }


    /*
       CASE 1
       Firestore Timestamp

       Example:

       Timestamp {
           seconds: 1787561417,
           nanoseconds: 766000000
       }

       Firestore Timestamp objects
       normally have a toDate() method.
    */

    if (
        typeof value.toDate === "function"
    ) {

        try {

            const date =
                value.toDate();


            return formatDateTime(
                date
            );

        }

        catch (error) {

            console.warn(
                "⚠️ Could not convert Firestore Timestamp:",
                error
            );

        }

    }


    /*
       CASE 2
       Timestamp-like object

       Example:

       {
           seconds: 1787561417,
           nanoseconds: 766000000
       }
    */

    if (
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {

        try {

            const milliseconds =
                (
                    value.seconds *
                    1000
                ) +
                (
                    (value.nanoseconds || 0) /
                    1000000
                );


            const date =
                new Date(
                    milliseconds
                );


            return formatDateTime(
                date
            );

        }

        catch (error) {

            console.warn(
                "⚠️ Could not convert Timestamp object:",
                error
            );

        }

    }


    /*
       CASE 3
       JavaScript Date
    */

    if (
        value instanceof Date
    ) {

        return formatDateTime(
            value
        );

    }


    /*
       CASE 4
       Number

       Could be Unix timestamp
       in seconds or milliseconds.
    */

    if (
        typeof value === "number"
    ) {

        try {

            let milliseconds =
                value;


            /*
               Unix seconds are normally
               around 10 digits.

               JavaScript milliseconds are
               around 13 digits.
            */

            if (
                value < 100000000000
            ) {

                milliseconds =
                    value * 1000;

            }


            const date =
                new Date(
                    milliseconds
                );


            return formatDateTime(
                date
            );

        }

        catch (error) {

            console.warn(
                "⚠️ Could not convert numeric timestamp:",
                error
            );

        }

    }


    /*
       CASE 5
       ISO date string.

       Example:

       2026-08-24T10:30:00.000Z
    */

    if (
        typeof value === "string"
    ) {

        /*
           If already a normal time,
           don't modify it.

           Examples:
           08:30 AM
           2:45 PM
        */

        if (
            isSimpleTimeString(value)
        ) {

            return value;

        }


        const parsedDate =
            new Date(value);


        if (
            !Number.isNaN(
                parsedDate.getTime()
            )
        ) {

            return formatDateTime(
                parsedDate
            );

        }


        /*
           Unknown string:
           display it rather than losing data.
        */

        return value;

    }


    return "—";

}


/* =========================================================
   FORMAT JAVASCRIPT DATE
========================================================= */

function formatDateTime(
    date
) {

    if (
        !(date instanceof Date) ||
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }


    return date.toLocaleTimeString(
        [],
        {
            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );

}


/* =========================================================
   CHECK SIMPLE TIME STRING
========================================================= */

function isSimpleTimeString(
    value
) {

    if (
        typeof value !== "string"
    ) {

        return false;

    }


    /*
       Matches:

       8:30 AM
       08:30 AM
       8:30 PM
       08:30 PM
       08:30
       18:30
    */

    return /^\d{1,2}:\d{2}(\s?(AM|PM|am|pm))?$/.test(
        value.trim()
    );

}


/* =========================================================
   GET TIME STRING
========================================================= */

function getTimeString(
    date
) {

    return date.toLocaleTimeString(
        [],
        {
            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );

}


/* =========================================================
   DETERMINE LATE
========================================================= */

function isLate(
    date
) {

    const hour =
        date.getHours();


    const minute =
        date.getMinutes();


    /*
       Attendance starts at 08:00.

       08:00 or earlier = Present
       After 08:00 = Late
    */

    if (
        hour > 8
    ) {

        return true;

    }


    if (
        hour === 8 &&
        minute > 0
    ) {

        return true;

    }


    return false;

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
   FORMAT STATUS
========================================================= */

function formatStatus(
    status
) {

    const value =
        String(
            status
        ).toLowerCase();


    if (
        value === "active"
    ) {

        return "Active";

    }


    if (
        value === "inactive"
    ) {

        return "Inactive";

    }


    if (
        value === "expired"
    ) {

        return "Expired";

    }


    return status || "Active";

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
                    "❌ Logout failed:",
                    error
                );


                logoutButton.disabled =
                    false;


                logoutButton.textContent =
                    "Logout";


                alert(
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

    if (loadingScreen) {

        loadingScreen.style.display =
            "none";

    }

}


/* =========================================================
   SHOW ERROR
========================================================= */

function showError(
    message
) {

    console.error(
        "❌ Virello Attendance Error:",
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
   FINAL
========================================================= */

console.log(
    "✅ Virello complete attendance.js STEP 5B loaded."
);