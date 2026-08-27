/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/worker.js

   PURPOSE:
   WORKER CHECK-IN / CHECK-OUT SYSTEM

   FIX:
   - Firebase Anonymous Authentication
   - Prevents "Missing or insufficient permissions"
   - Keeps existing Firestore security rules
   - Office QR verification
   - 30-second QR lifetime
   - Staff ID lookup
   - Active staff verification
   - Daily attendance
   - Check-in
   - Present / Late status
   - Check-out
   - Hosting safe
========================================================= */


/* =========================================================
   FIREBASE AUTH
========================================================= */

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


/* =========================================================
   FIRESTORE
========================================================= */

import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   FIREBASE APP
========================================================= */

import {
    app
} from "./firebase-config.js";


/* =========================================================
   FIREBASE SERVICES
========================================================= */

const auth = getAuth(app);

const db = getFirestore(app);


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentStaff = null;

let currentAttendance = null;

let firebaseWorkerReady = false;


/* =========================================================
   OFFICE QR STATE
========================================================= */

let officeQRVerified = false;

let officeQRTimestamp = null;

let officeQRToken = null;


/* =========================================================
   QR SETTINGS
========================================================= */

const QR_LIFETIME_SECONDS = 30;


/* =========================================================
   ATTENDANCE SETTINGS
========================================================= */

const WORK_START_HOUR = 8;

const WORK_START_MINUTE = 0;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const staffIdInput =
    document.getElementById(
        "staffIdInput"
    );


const checkInButton =
    document.getElementById(
        "checkInButton"
    );


const checkOutButton =
    document.getElementById(
        "checkOutButton"
    );


const workerInfo =
    document.getElementById(
        "workerInfo"
    );


const workerName =
    document.getElementById(
        "workerName"
    );


const workerPosition =
    document.getElementById(
        "workerPosition"
    );


const attendanceStatus =
    document.getElementById(
        "attendanceStatus"
    );


const workerMessage =
    document.getElementById(
        "workerMessage"
    );


const todayDate =
    document.getElementById(
        "todayDate"
    );


const officeAccess =
    document.getElementById(
        "officeAccess"
    );


const officeAccessTitle =
    document.getElementById(
        "officeAccessTitle"
    );


const officeAccessText =
    document.getElementById(
        "officeAccessText"
    );


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "🔥 Virello Worker Attendance starting..."
        );


        console.log(
            "🌐 Website:",
            window.location.origin
        );


        console.log(
            "📄 Worker page:",
            window.location.href
        );


        setTodayDate();


        verifyOfficeQR();


        /*
           Authenticate the public worker page.

           This uses Firebase Anonymous Authentication.

           The worker does NOT need to enter
           an email or password.
        */

        await initializeWorkerAuthentication();


        if (checkInButton) {

            checkInButton.addEventListener(
                "click",
                handleCheckIn
            );

        }


        if (checkOutButton) {

            checkOutButton.addEventListener(
                "click",
                handleCheckOut
            );

        }


        if (staffIdInput) {

            staffIdInput.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        handleCheckIn();

                    }

                }
            );

        }

    }
);


/* =========================================================
   FIREBASE ANONYMOUS AUTHENTICATION
========================================================= */

async function initializeWorkerAuthentication() {

    console.log(
        "🔐 Starting Worker Firebase authentication..."
    );


    /*
       If Firebase already has a user,
       use that user.
    */

    if (auth.currentUser) {

        firebaseWorkerReady = true;


        console.log(
            "✅ Existing Firebase authentication found."
        );


        console.log(
            "👤 Firebase UID:",
            auth.currentUser.uid
        );


        return true;

    }


    try {

        /*
           Create an anonymous Firebase user.

           This is the important fix for the
           Firestore permission problem.
        */

        const result =
            await signInAnonymously(
                auth
            );


        if (
            result &&
            result.user
        ) {

            firebaseWorkerReady = true;


            console.log(
                "✅ Worker authenticated anonymously."
            );


            console.log(
                "👤 Anonymous UID:",
                result.user.uid
            );


            return true;

        }


        throw new Error(
            "Firebase authentication did not return a user."
        );

    }

    catch (error) {

        firebaseWorkerReady = false;


        console.error(
            "❌ Worker Firebase authentication failed:",
            error
        );


        console.error(
            "Firebase error code:",
            error.code
        );


        console.error(
            "Firebase error message:",
            error.message
        );


        showMessage(
            getAuthenticationErrorMessage(
                error
            ),
            "error"
        );


        return false;

    }

}


/* =========================================================
   AUTH ERROR MESSAGE
========================================================= */

function getAuthenticationErrorMessage(
    error
) {

    if (
        error &&
        error.code ===
        "auth/operation-not-allowed"
    ) {

        return (
            "Worker attendance authentication is not enabled. " +
            "Please enable Anonymous sign-in in Firebase Authentication."
        );

    }


    if (
        error &&
        error.code ===
        "auth/network-request-failed"
    ) {

        return (
            "Unable to connect to Firebase. " +
            "Please check your internet connection and try again."
        );

    }


    return (
        "Unable to connect to the Virello attendance system. " +
        "Please refresh the page and try again."
    );

}


/* =========================================================
   CHECK FIREBASE AUTH READY
========================================================= */

async function ensureWorkerAuthentication() {

    if (
        firebaseWorkerReady &&
        auth.currentUser
    ) {

        return true;

    }


    return await initializeWorkerAuthentication();

}


/* =========================================================
   OFFICE QR VERIFICATION
========================================================= */

function verifyOfficeQR() {

    console.log(
        "🔐 Checking Office QR access..."
    );


    const params =
        new URLSearchParams(
            window.location.search
        );


    const officeQR =
        params.get(
            "officeQR"
        );


    const timestamp =
        params.get(
            "timestamp"
        );


    const token =
        params.get(
            "token"
        );


    if (
        officeQR !== "1" ||
        !timestamp ||
        !token
    ) {

        console.warn(
            "⚠️ Worker page opened without Office QR."
        );


        officeQRVerified =
            false;


        officeQRTimestamp =
            null;


        officeQRToken =
            null;


        setOfficeAccessState(
            false,
            "Office QR Required",
            "Please scan the official Virello office QR code before using attendance."
        );


        return;

    }


    const qrTimestamp =
        Number(
            timestamp
        );


    if (
        !Number.isFinite(
            qrTimestamp
        )
    ) {

        console.warn(
            "❌ Invalid QR timestamp."
        );


        officeQRVerified =
            false;


        setOfficeAccessState(
            false,
            "Invalid Office QR",
            "The QR code information is invalid. Please scan the current office QR code."
        );


        return;

    }


    const now =
        Date.now();


    const age =
        Math.abs(
            now -
            qrTimestamp
        );


    const maxAge =
        QR_LIFETIME_SECONDS *
        1000;


    if (
        age >
        maxAge
    ) {

        console.warn(
            "❌ Office QR expired."
        );


        officeQRVerified =
            false;


        officeQRTimestamp =
            null;


        officeQRToken =
            null;


        setOfficeAccessState(
            false,
            "Office QR Expired",
            "This QR code has expired. Please scan the current office QR code."
        );


        return;

    }


    officeQRTimestamp =
        qrTimestamp;


    officeQRToken =
        token;


    officeQRVerified =
        true;


    console.log(
        "✅ Office QR verified."
    );


    console.log(
        "⏱ QR age:",
        age,
        "milliseconds"
    );


    setOfficeAccessState(
        true,
        "✓ Office QR Verified",
        "You accessed Virello attendance through the official office QR code."
    );

}


/* =========================================================
   OFFICE ACCESS DISPLAY
========================================================= */

function setOfficeAccessState(
    verified,
    title,
    text
) {

    if (!officeAccess) {

        return;

    }


    officeAccess.classList.add(
        "show"
    );


    if (verified) {

        officeAccess.classList.remove(
            "invalid"
        );

    } else {

        officeAccess.classList.add(
            "invalid"
        );

    }


    if (officeAccessTitle) {

        officeAccessTitle.textContent =
            title;

    }


    if (officeAccessText) {

        officeAccessText.textContent =
            text;

    }

}


/* =========================================================
   TODAY DATE
========================================================= */

function setTodayDate() {

    if (!todayDate) {

        return;

    }


    const now =
        new Date();


    todayDate.textContent =
        now.toLocaleDateString(
            "en-GB",
            {
                weekday:
                    "long",

                year:
                    "numeric",

                month:
                    "long",

                day:
                    "numeric"
            }
        );

}


/* =========================================================
   DATE KEY
========================================================= */

function getDateKey() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    message,
    type
) {

    if (!workerMessage) {

        return;

    }


    workerMessage.textContent =
        message;


    workerMessage.className =
        "message show " +
        type;

}


/* =========================================================
   CLEAR MESSAGE
========================================================= */

function clearMessage() {

    if (!workerMessage) {

        return;

    }


    workerMessage.textContent =
        "";


    workerMessage.className =
        "message";

}


/* =========================================================
   FIND STAFF
========================================================= */

async function findStaff(
    staffId
) {

    console.log(
        "🔎 Searching Staff ID:",
        staffId
    );


    /*
       Make absolutely sure Firebase
       authentication exists before Firestore.
    */

    const authenticated =
        await ensureWorkerAuthentication();


    if (!authenticated) {

        throw new Error(
            "Worker authentication is not available."
        );

    }


    const staffRef =
        collection(
            db,
            "staff"
        );


    const staffQuery =
        query(
            staffRef,

            where(
                "staffId",
                "==",
                staffId
            )
        );


    const snapshot =
        await getDocs(
            staffQuery
        );


    if (
        snapshot.empty
    ) {

        return null;

    }


    const staffDocument =
        snapshot.docs[0];


    const staffData =
        staffDocument.data();


    return {

        id:
            staffDocument.id,

        ...staffData

    };

}


/* =========================================================
   FIND TODAY'S ATTENDANCE
========================================================= */

async function findTodayAttendance(
    staff
) {

    const authenticated =
        await ensureWorkerAuthentication();


    if (!authenticated) {

        throw new Error(
            "Worker authentication is not available."
        );

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
                "staffDocumentId",
                "==",
                staff.id
            ),

            where(
                "date",
                "==",
                getDateKey()
            )

        );


    const snapshot =
        await getDocs(
            attendanceQuery
        );


    if (
        snapshot.empty
    ) {

        return null;

    }


    const attendanceDocument =
        snapshot.docs[0];


    return {

        id:
            attendanceDocument.id,

        ...attendanceDocument.data()

    };

}


/* =========================================================
   DETERMINE IF CHECK-IN IS LATE
========================================================= */

function isLate(
    date
) {

    const hour =
        date.getHours();


    const minute =
        date.getMinutes();


    if (
        hour <
        WORK_START_HOUR
    ) {

        return false;

    }


    if (
        hour ===
        WORK_START_HOUR &&
        minute ===
        WORK_START_MINUTE
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   GET ATTENDANCE STATUS
========================================================= */

function getCheckInStatus(
    date
) {

    if (
        isLate(date)
    ) {

        return "late";

    }


    return "present";

}


/* =========================================================
   GET READABLE TIME
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
   HANDLE CHECK IN
========================================================= */

async function handleCheckIn() {

    clearMessage();


    /* =====================================================
       FIREBASE AUTH
    ===================================================== */

    const authenticated =
        await ensureWorkerAuthentication();


    if (!authenticated) {

        return;

    }


    /* =====================================================
       QR CHECK
    ===================================================== */

    if (
        !officeQRVerified
    ) {

        showMessage(
            "Please scan the current official Office QR code before checking in.",
            "error"
        );


        setOfficeAccessState(
            false,
            "Office QR Required",
            "Attendance check-in requires scanning the official Virello office QR code."
        );


        return;

    }


    /* =====================================================
       QR EXPIRATION CHECK
    ===================================================== */

    if (
        !isOfficeQRStillValid()
    ) {

        officeQRVerified =
            false;


        showMessage(
            "The Office QR code has expired. Please scan the new QR code.",
            "error"
        );


        setOfficeAccessState(
            false,
            "Office QR Expired",
            "Please scan the current QR displayed at the office."
        );


        return;

    }


    /* =====================================================
       STAFF ID
    ===================================================== */

    const staffId =
        String(
            staffIdInput?.value ||
            ""
        ).trim();


    if (!staffId) {

        showMessage(
            "Please enter your Staff ID.",
            "error"
        );


        if (staffIdInput) {

            staffIdInput.focus();

        }


        return;

    }


    /* =====================================================
       BUTTON
    ===================================================== */

    if (checkInButton) {

        checkInButton.disabled =
            true;


        checkInButton.textContent =
            "Checking...";

    }


    try {

        /* =================================================
           FIND STAFF
        ================================================= */

        const staff =
            await findStaff(
                staffId
            );


        if (!staff) {

            showMessage(
                "Staff ID not found. Please check your Staff ID.",
                "error"
            );


            return;

        }


        /* =================================================
           ACTIVE STAFF
        ================================================= */

        const staffStatus =
            String(
                staff.status ||
                "active"
            ).toLowerCase();


        if (
            staffStatus !==
            "active"
        ) {

            showMessage(
                "This staff account is inactive. Please contact your administrator.",
                "error"
            );


            return;

        }


        currentStaff =
            staff;


        console.log(
            "👤 Staff:",
            staff.fullName ||
            staff.name
        );


        console.log(
            "🏢 Organization:",
            staff.organizationId
        );


        /* =================================================
           FIND EXISTING ATTENDANCE
        ================================================= */

        const existingAttendance =
            await findTodayAttendance(
                staff
            );


        if (existingAttendance) {

            currentAttendance =
                existingAttendance;


            displayWorker(
                staff
            );


            if (
                existingAttendance.checkOut
            ) {

                showCompletedAttendance();

            } else {

                showAlreadyCheckedIn();

            }


            return;

        }


        /* =================================================
           CURRENT TIME
        ================================================= */

        const now =
            new Date();


        /* =================================================
           AUTOMATIC STATUS
        ================================================= */

        const attendanceStatusValue =
            getCheckInStatus(
                now
            );


        const readableCheckIn =
            getTimeString(
                now
            );


        console.log(
            "🕒 Check-in time:",
            readableCheckIn
        );


        console.log(
            "📊 Attendance status:",
            attendanceStatusValue
        );


        /* =================================================
           ATTENDANCE DATA
        ================================================= */

        const attendanceData = {

            staffDocumentId:
                staff.id,

            staffId:
                staff.staffId,

            staffName:
                staff.fullName ||
                staff.name ||
                "Staff Member",

            position:
                staff.position ||
                staff.role ||
                "",

            organizationId:
                staff.organizationId ||
                null,

            date:
                getDateKey(),

            status:
                attendanceStatusValue,

            checkIn:
                serverTimestamp(),

            checkOut:
                null,

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp(),

            attendanceAccess:
                "office_qr",

            officeQRTimestamp:
                officeQRTimestamp,

            officeQRToken:
                officeQRToken

        };


        /* =================================================
           CREATE FIRESTORE RECORD
        ================================================= */

        const attendanceRef =
            collection(
                db,
                "attendance"
            );


        const newAttendance =
            await addDoc(
                attendanceRef,
                attendanceData
            );


        currentAttendance = {

            id:
                newAttendance.id,

            ...attendanceData

        };


        displayWorker(
            staff
        );


        if (
            attendanceStatusValue ===
            "late"
        ) {

            showLateCheckedIn();

        } else {

            showCheckedIn();

        }


        console.log(
            "✅ Worker checked in:",
            newAttendance.id
        );


        console.log(
            "📊 Saved status:",
            attendanceStatusValue
        );

    }

    catch (error) {

        console.error(
            "❌ Check-in error:",
            error
        );


        console.error(
            "❌ Firebase error code:",
            error.code
        );


        console.error(
            "❌ Firebase error message:",
            error.message
        );


        showMessage(
            getFirestoreErrorMessage(
                error
            ),
            "error"
        );

    }

    finally {

        if (checkInButton) {

            checkInButton.disabled =
                false;


            checkInButton.textContent =
                "Check In";

        }

    }

}


/* =========================================================
   FIRESTORE ERROR MESSAGE
========================================================= */

function getFirestoreErrorMessage(
    error
) {

    if (
        error &&
        error.code ===
        "permission-denied"
    ) {

        return (
            "Virello could not access attendance data. " +
            "Please make sure Anonymous Authentication is enabled in Firebase."
        );

    }


    if (
        error &&
        error.code ===
        "failed-precondition"
    ) {

        return (
            "Firebase needs a database index for this attendance search."
        );

    }


    return (
        error?.message ||
        "Unable to record attendance."
    );

}


/* =========================================================
   CHECK QR STILL VALID
========================================================= */

function isOfficeQRStillValid() {

    if (
        !officeQRVerified ||
        !officeQRTimestamp ||
        !officeQRToken
    ) {

        return false;

    }


    const now =
        Date.now();


    const age =
        Math.abs(
            now -
            officeQRTimestamp
        );


    const maxAge =
        QR_LIFETIME_SECONDS *
        1000;


    return (
        age <=
        maxAge
    );

}


/* =========================================================
   DISPLAY WORKER
========================================================= */

function displayWorker(
    staff
) {

    if (workerInfo) {

        workerInfo.classList.add(
            "show"
        );

    }


    if (workerName) {

        workerName.textContent =
            staff.fullName ||
            staff.name ||
            "Staff Member";

    }


    if (workerPosition) {

        workerPosition.textContent =
            staff.position ||
            staff.role ||
            "Staff";

    }

}


/* =========================================================
   NORMAL PRESENT
========================================================= */

function showCheckedIn() {

    if (attendanceStatus) {

        attendanceStatus.textContent =
            "✓ You are checked in — Present.";

        attendanceStatus.className =
            "attendance-status status-present";

    }


    showCheckOutButton();


    disableStaffId();


    hideCheckInButton();


    showMessage(
        "Check-in recorded successfully. You are marked Present.",
        "success"
    );

}


/* =========================================================
   LATE
========================================================= */

function showLateCheckedIn() {

    if (attendanceStatus) {

        attendanceStatus.textContent =
            "🕒 You are checked in — Late.";

        attendanceStatus.className =
            "attendance-status status-late";

    }


    showCheckOutButton();


    disableStaffId();


    hideCheckInButton();


    showMessage(
        "Check-in recorded. You arrived after 8:00 AM and have been marked Late.",
        "warning"
    );

}


/* =========================================================
   ALREADY CHECKED IN
========================================================= */

function showAlreadyCheckedIn() {

    const status =
        String(
            currentAttendance?.status ||
            "present"
        ).toLowerCase();


    if (
        status ===
        "late"
    ) {

        if (attendanceStatus) {

            attendanceStatus.textContent =
                "🕒 You are already checked in — Late.";

            attendanceStatus.className =
                "attendance-status status-late";

        }


        showMessage(
            "You have already checked in today and were marked Late.",
            "warning"
        );

    } else {

        if (attendanceStatus) {

            attendanceStatus.textContent =
                "✓ You are already checked in — Present.";

            attendanceStatus.className =
                "attendance-status status-present";

        }


        showMessage(
            "You have already checked in today.",
            "success"
        );

    }


    showCheckOutButton();


    disableStaffId();


    hideCheckInButton();

}


/* =========================================================
   COMPLETED ATTENDANCE
========================================================= */

function showCompletedAttendance() {

    const status =
        String(
            currentAttendance?.status ||
            ""
        ).toLowerCase();


    if (
        status ===
        "late"
    ) {

        if (attendanceStatus) {

            attendanceStatus.textContent =
                "✓ Attendance completed — Late.";

            attendanceStatus.className =
                "attendance-status status-late";

        }

    } else {

        if (attendanceStatus) {

            attendanceStatus.textContent =
                "✓ Attendance completed — Present.";

            attendanceStatus.className =
                "attendance-status status-present";

        }

    }


    if (checkOutButton) {

        checkOutButton.disabled =
            true;

        checkOutButton.textContent =
            "Attendance Complete";

        checkOutButton.style.display =
            "block";

    }


    disableStaffId();


    hideCheckInButton();


    showMessage(
        status === "late"
            ? "You checked in late and have completed your attendance for today."
            : "You have completed your attendance for today.",
        "success"
    );

}


/* =========================================================
   SHOW CHECKOUT BUTTON
========================================================= */

function showCheckOutButton() {

    if (checkOutButton) {

        checkOutButton.disabled =
            false;

        checkOutButton.textContent =
            "Check Out";

        checkOutButton.style.display =
            "block";

    }

}


/* =========================================================
   HIDE CHECK-IN BUTTON
========================================================= */

function hideCheckInButton() {

    if (checkInButton) {

        checkInButton.style.display =
            "none";

    }

}


/* =========================================================
   DISABLE STAFF ID
========================================================= */

function disableStaffId() {

    if (staffIdInput) {

        staffIdInput.disabled =
            true;

    }

}


/* =========================================================
   HANDLE CHECK OUT
========================================================= */

async function handleCheckOut() {

    clearMessage();


    const authenticated =
        await ensureWorkerAuthentication();


    if (!authenticated) {

        return;

    }


    if (
        !currentStaff ||
        !currentAttendance
    ) {

        showMessage(
            "Attendance record could not be found.",
            "error"
        );


        return;

    }


    if (
        currentAttendance.checkOut
    ) {

        showCompletedAttendance();


        return;

    }


    const confirmed =
        confirm(
            `Check out ${
                currentStaff.fullName ||
                currentStaff.name ||
                "staff member"
            }?`
        );


    if (!confirmed) {

        return;

    }


    if (checkOutButton) {

        checkOutButton.disabled =
            true;


        checkOutButton.textContent =
            "Checking Out...";

    }


    try {

        const attendanceDocument =
            doc(
                db,
                "attendance",
                currentAttendance.id
            );


        await updateDoc(
            attendanceDocument,
            {

                checkOut:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }
        );


        currentAttendance.checkOut =
            true;


        showCompletedAttendance();


        console.log(
            "✅ Worker checked out:",
            currentAttendance.id
        );


    }

    catch (error) {

        console.error(
            "❌ Check-out error:",
            error
        );


        console.error(
            "❌ Firebase error code:",
            error.code
        );


        console.error(
            "❌ Firebase error message:",
            error.message
        );


        showMessage(
            getFirestoreErrorMessage(
                error
            ),
            "error"
        );


        if (checkOutButton) {

            checkOutButton.disabled =
                false;


            checkOutButton.textContent =
                "Check Out";

        }

    }

}


/* =========================================================
   FINAL LOG
========================================================= */

console.log(
    "✅ Virello Worker Attendance loaded."
);


console.log(
    "🔐 Anonymous Firebase authentication enabled."
);


console.log(
    "🕒 Automatic 08:00 AM late detection active."
);


console.log(
    "🟢 08:00 AM or earlier = Present."
);


console.log(
    "🟡 After 08:00 AM = Late."
);


console.log(
    "🔴 No attendance record = Absent."
);


console.log(
    "🔐 Office QR verification active."
);


console.log(
    "🌐 Hosting-safe worker system active."
);
