/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/worker.js

   PURPOSE:
   WORKER CHECK-IN / CHECK-OUT SYSTEM

   FEATURES:
   - Office QR verification
   - 30-second QR lifetime
   - Staff ID lookup
   - Active staff verification
   - Daily attendance
   - Automatic Present / Late detection
   - Check-in
   - Check-out
   - Firestore attendance records
   - Hosting safe

   ATTENDANCE RULE:
   - BEFORE 09:00 AM = PRESENT
   - 09:00 AM OR LATER = LATE
========================================================= */


/* =========================================================
   FIREBASE AUTH
========================================================= */

import {
    getAuth
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
   FIREBASE CONFIG
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

/*
   Attendance cutoff time.

   Before 09:00 = Present
   09:00 or later = Late
*/

const LATE_HOUR = 9;

const LATE_MINUTE = 0;


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


        console.log(
            "🕘 Attendance cutoff:",
            "09:00 AM"
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


        officeQRVerified = false;

        officeQRTimestamp = null;

        officeQRToken = null;


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


        officeQRVerified = false;


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


        officeQRVerified = false;

        officeQRTimestamp = null;

        officeQRToken = null;


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
   TODAY DATE DISPLAY
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
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
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


    return `${year}-${month}-${day}`;

}


/* =========================================================
   GET CURRENT ATTENDANCE STATUS
=========================================================

   BEFORE 09:00 AM
   = PRESENT

   09:00 AM OR LATER
   = LATE
========================================================= */

function getAttendanceStatus() {

    const now =
        new Date();


    const hour =
        now.getHours();


    const minute =
        now.getMinutes();


    if (
        hour > LATE_HOUR
    ) {

        return "late";

    }


    if (
        hour === LATE_HOUR &&
        minute >= LATE_MINUTE
    ) {

        return "late";

    }


    return "present";

}


/* =========================================================
   GET ATTENDANCE LABEL
========================================================= */

function getAttendanceLabel(
    status
) {

    if (
        status === "late"
    ) {

        return "Late";

    }


    return "Present";

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
            String(
                staff.status
            ).toLowerCase() !== "active"
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
           DETERMINE PRESENT OR LATE
        =================================================

           IMPORTANT:

           This is calculated at the exact moment
           the staff member presses Check In.

           QR generation time DOES NOT determine
           attendance status.
        ================================================= */

        const attendanceStatusValue =
            getAttendanceStatus();


        const attendanceLabel =
            getAttendanceLabel(
                attendanceStatusValue
            );


        const checkInTime =
            new Date();


        console.log(
            "🕒 Actual check-in time:",
            checkInTime.toLocaleTimeString(
                "en-GB"
            )
        );


        console.log(
            "📊 Attendance status:",
            attendanceLabel
        );


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
                attendanceStatusValue,

            checkIn:
                serverTimestamp(),

            checkOut:
                null,

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp(),

            /* =============================================
               ACTUAL ATTENDANCE INFORMATION
            ============================================= */

            attendanceType:
                attendanceStatusValue,

            checkInHour:
                checkInTime.getHours(),

            checkInMinute:
                checkInTime.getMinutes(),

            checkInSecond:
                checkInTime.getSeconds(),

            /* =============================================
               QR ACCESS INFORMATION
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


        /* =================================================
           SHOW CORRECT RESULT
        ================================================= */

        if (
            attendanceStatusValue ===
            "late"
        ) {

            showLateCheckedIn();

        } else {

            showCheckedIn();

        }


        console.log(
            "✅ Worker attendance recorded:",
            newAttendance.id
        );


        console.log(
            "📊 Final attendance status:",
            attendanceStatusValue
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
   CHECKED IN — PRESENT
========================================================= */

function showCheckedIn() {

    if (attendanceStatus) {

        attendanceStatus.textContent =
            "✓ You are checked in — Present.";

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
        "Check-in recorded successfully. You are marked Present.",
        "success"
    );

}


/* =========================================================
   CHECKED IN — LATE
========================================================= */

function showLateCheckedIn() {

    if (attendanceStatus) {

        attendanceStatus.textContent =
            "✓ You are checked in — Late.";

        attendanceStatus.className =
            "attendance-status status-late";

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
        "Check-in recorded. You arrived after 9:00 AM and have been marked Late.",
        "success"
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
        status === "late"
    ) {

        if (attendanceStatus) {

            attendanceStatus.textContent =
                "✓ You are already checked in — Late.";

            attendanceStatus.className =
                "attendance-status status-late";

        }


        showMessage(
            "You have already checked in today and are marked Late.",
            "success"
        );

    } else {

        if (attendanceStatus) {

            attendanceStatus.textContent =
                "✓ You are already checked in — Present.";

            attendanceStatus.className =
                "attendance-status status-present";

        }


        showMessage(
            "You have already checked in today and are marked Present.",
            "success"
        );

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
        status === "late"
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

                updatedAt:
                    serverTimestamp(),

                attendanceCompleted:
                    true

            }
        );


        currentAttendance.checkOut =
            true;


        currentAttendance.attendanceCompleted =
            true;


        /*
           IMPORTANT:

           We DO NOT change the original
           Present/Late status to "completed".

           This means reports can still correctly
           see whether the worker was Present or Late.
        */


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
   DISABLE STAFF ID
========================================================= */

function disableStaffId() {

    if (staffIdInput) {

        staffIdInput.disabled =
            true;

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
   FINAL SYSTEM LOG
========================================================= */

console.log(
    "✅ Virello Worker Check-In System loaded."
);


console.log(
    "🕘 Attendance cutoff: 09:00 AM"
);


console.log(
    "🟢 Before 09:00 AM = Present"
);


console.log(
    "🟡 09:00 AM or later = Late"
);


console.log(
    "🔴 No attendance record = Absent"
);


console.log(
    "🌐 Hosting-safe worker system active."
);


console.log(
    "🔐 Office QR verification active."
);
