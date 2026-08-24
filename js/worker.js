/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/worker.js

   STEP:
   5B / HOSTING VERSION

   PURPOSE:
   WORKER CHECK-IN / CHECK-OUT SYSTEM

   FEATURES:
   - Office QR verification
   - 30-second QR lifetime
   - Staff ID lookup
   - Active staff verification
   - Daily attendance
   - Check-in
   - Check-out
   - Firestore attendance records

   FIRESTORE COLLECTIONS:
   attendance
   staff

   HOSTING:
   No IPv4 address
   No localhost
   No 127.0.0.1
========================================================= */


/* =========================================================
   FIREBASE
========================================================= */

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


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


import {
    app
} from "./firebase-config.js";


/* =========================================================
   FIREBASE SERVICES
========================================================= */

const auth =
    getAuth(app);


const db =
    getFirestore(app);


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentStaff =
    null;


let currentAttendance =
    null;


/* =========================================================
   OFFICE QR STATE
========================================================= */

let officeQRVerified =
    false;


let officeQRTimestamp =
    null;


let officeQRToken =
    null;


/* =========================================================
   QR SETTINGS
========================================================= */

const QR_LIFETIME_SECONDS =
    30;


/* =========================================================
   DOM
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
    () => {

        console.log(
            "🔥 Virello Worker Attendance starting..."
        );


        console.log(
            "🌐 Current website:",
            window.location.origin
        );


        console.log(
            "📄 Current worker page:",
            window.location.href
        );


        setTodayDate();


        verifyOfficeQR();


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


    /* =====================================================
       CHECK REQUIRED QR PARAMETERS
    ===================================================== */

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


    /* =====================================================
       VALIDATE TIMESTAMP
    ===================================================== */

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


    /* =====================================================
       CHECK QR AGE
    ===================================================== */

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
            "This QR code has expired. Please scan the current QR displayed at the office."
        );


        return;

    }


    /* =====================================================
       QR IS VALID
    ===================================================== */

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
   FIRESTORE DATE KEY
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
   HANDLE CHECK IN
========================================================= */

async function handleCheckIn() {

    clearMessage();


    /* =====================================================
       QR ACCESS CHECK
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
       CHECK QR HAS NOT EXPIRED
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
       DISABLE BUTTON
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
           ACTIVE STAFF ONLY
        ================================================= */

        if (
            staff.status &&
            staff.status !== "active"
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
           CREATE ATTENDANCE
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
                "",

            organizationId:
                staff.organizationId ||
                null,

            date:
                getDateKey(),

            status:
                "present",

            checkIn:
                serverTimestamp(),

            checkOut:
                null,

            createdAt:
                serverTimestamp(),

            /* =============================================
               QR ACCESS RECORD
            ============================================= */

            attendanceAccess:
                "office_qr",

            officeQRTimestamp:
                officeQRTimestamp,

            officeQRToken:
                officeQRToken

        };


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


        showCheckedIn();


        console.log(
            "✅ Worker checked in:",
            newAttendance.id
        );

    } catch (error) {

        console.error(
            "❌ Check-in error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to record check-in.",
            "error"
        );

    } finally {

        if (checkInButton) {

            checkInButton.disabled =
                false;


            checkInButton.textContent =
                "Check In";

        }

    }

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
            "Staff";

    }

}


/* =========================================================
   CHECKED IN
========================================================= */

function showCheckedIn() {

    if (attendanceStatus) {

        attendanceStatus.textContent =
            "✓ You are checked in.";

        attendanceStatus.className =
            "attendance-status status-present";

    }


    if (checkOutButton) {

        checkOutButton.disabled =
            false;

        checkOutButton.style.display =
            "block";

    }


    if (staffIdInput) {

        staffIdInput.disabled =
            true;

    }


    if (checkInButton) {

        checkInButton.style.display =
            "none";

    }


    showMessage(
        "Check-in recorded successfully.",
        "success"
    );

}


/* =========================================================
   ALREADY CHECKED IN
========================================================= */

function showAlreadyCheckedIn() {

    if (attendanceStatus) {

        attendanceStatus.textContent =
            "✓ You are already checked in.";

        attendanceStatus.className =
            "attendance-status status-present";

    }


    if (checkOutButton) {

        checkOutButton.disabled =
            false;

        checkOutButton.style.display =
            "block";

    }


    if (staffIdInput) {

        staffIdInput.disabled =
            true;

    }


    if (checkInButton) {

        checkInButton.style.display =
            "none";

    }


    showMessage(
        "You have already checked in today.",
        "success"
    );

}


/* =========================================================
   COMPLETED
========================================================= */

function showCompletedAttendance() {

    if (attendanceStatus) {

        attendanceStatus.textContent =
            "✓ Attendance completed for today.";

        attendanceStatus.className =
            "attendance-status status-complete";

    }


    if (checkOutButton) {

        checkOutButton.disabled =
            true;

        checkOutButton.textContent =
            "Attendance Complete";

    }


    if (staffIdInput) {

        staffIdInput.disabled =
            true;

    }


    if (checkInButton) {

        checkInButton.style.display =
            "none";

    }


    showMessage(
        "You have already checked in and checked out today.",
        "success"
    );

}


/* =========================================================
   HANDLE CHECK OUT
========================================================= */

async function handleCheckOut() {

    clearMessage();


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

                status:
                    "completed",

                updatedAt:
                    serverTimestamp()

            }
        );


        currentAttendance.checkOut =
            true;


        currentAttendance.status =
            "completed";


        showCompletedAttendance();


        console.log(
            "✅ Worker checked out:",
            currentAttendance.id
        );


    } catch (error) {

        console.error(
            "❌ Check-out error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to record check-out.",
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
    "✅ Virello Worker Check-In System loaded."
);


console.log(
    "🌐 Hosting-safe worker system active."
);


console.log(
    "🔐 Office QR verification active."
);