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
   - SAME DEVICE / SAME PHONE DAILY LOCK
   - Worker can only use the device that checked them in
   - Hosting safe

   ATTENDANCE RULE:
   - 08:05 AM OR EARLIER = PRESENT
   - 08:06 AM OR LATER = LATE

   DEVICE RULE:
   - One device can check in ONE staff member per day.
   - The same staff member can check out from that same device.
   - Another staff member cannot use that device for attendance.
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
    getDoc,
    setDoc,
    deleteDoc,
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

const auth =
    getAuth(app);


const db =
    getFirestore(app);


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
   DEVICE STATE
========================================================= */

let currentDeviceId = null;


/*
   IMPORTANT:

   This ID is stored in the browser on the phone.

   It remains the same for that browser until
   the browser storage is cleared.
*/

const DEVICE_STORAGE_KEY =
    "virello_attendance_device_id";


/* =========================================================
   QR SETTINGS
========================================================= */

const QR_LIFETIME_SECONDS =
    30;


/* =========================================================
   ATTENDANCE SETTINGS
========================================================= */

/*
   08:05 AM = PRESENT
   08:06 AM = LATE
*/

const PRESENT_CUTOFF_HOUR =
    8;

const PRESENT_CUTOFF_MINUTE =
    5;


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
            "08:05 AM"
        );


        setTodayDate();


        /*
           Create/retrieve device identity.
        */

        currentDeviceId =
            getOrCreateDeviceId();


        console.log(
            "📱 Device ID:",
            currentDeviceId
        );


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
   DEVICE ID
========================================================= */

function getOrCreateDeviceId() {

    try {

        let existingId =
            localStorage.getItem(
                DEVICE_STORAGE_KEY
            );


        if (
            existingId &&
            String(existingId).trim()
        ) {

            return existingId;

        }


        /*
           Generate a strong random browser/device ID.
        */

        let newId = "";


        if (
            window.crypto &&
            typeof window.crypto.randomUUID ===
                "function"
        ) {

            newId =
                window.crypto.randomUUID();

        } else {

            newId =
                "VIRELLO-" +
                Date.now().toString(36) +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 15) +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 15);

        }


        localStorage.setItem(
            DEVICE_STORAGE_KEY,
            newId
        );


        return newId;

    }

    catch (error) {

        console.error(
            "❌ Unable to create device ID:",
            error
        );


        /*
           Fallback for unusual browsers.
        */

        return (
            "VIRELLO-FALLBACK-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 12)
        );

    }

}


/* =========================================================
   DEVICE LOCK DOCUMENT ID
========================================================= */

function getDeviceLockDocumentId() {

    /*
       Firestore document IDs cannot contain "/".

       UUID does not contain "/", but replacing it
       makes this safe for all possible fallback IDs.
    */

    const safeDeviceId =
        String(
            currentDeviceId || ""
        )
        .replace(
            /\//g,
            "_"
        );


    return (
        getDateKey() +
        "_" +
        safeDeviceId
    );

}


/* =========================================================
   CHECK WHETHER DEVICE IS ALREADY LOCKED TODAY
========================================================= */

async function getTodayDeviceLock() {

    if (!currentDeviceId) {

        throw new Error(
            "This device could not be identified."
        );

    }


    const lockId =
        getDeviceLockDocumentId();


    const lockReference =
        doc(
            db,
            "deviceLocks",
            lockId
        );


    const lockSnapshot =
        await getDoc(
            lockReference
        );


    if (
        !lockSnapshot.exists()
    ) {

        return null;

    }


    return {

        id:
            lockSnapshot.id,

        ...lockSnapshot.data()

    };

}


/* =========================================================
   RESERVE DEVICE FOR STAFF
========================================================= */

async function reserveDeviceForStaff(
    staff
) {

    if (!currentDeviceId) {

        throw new Error(
            "This device could not be identified."
        );

    }


    const lockId =
        getDeviceLockDocumentId();


    const lockReference =
        doc(
            db,
            "deviceLocks",
            lockId
        );


    const existingLock =
        await getDoc(
            lockReference
        );


    /*
       Device has already been used today.
    */

    if (
        existingLock.exists()
    ) {

        const lockData =
            existingLock.data();


        const lockedStaffId =
            String(
                lockData.staffId ||
                ""
            );


        /*
           Same staff member is allowed to
           continue using their own device.
        */

        if (
            lockedStaffId ===
            String(
                staff.staffId ||
                ""
            )
        ) {

            return {

                allowed:
                    true,

                sameStaff:
                    true,

                lock:
                    lockData

            };

        }


        /*
           Different staff member = BLOCK.
        */

        return {

            allowed:
                false,

            sameStaff:
                false,

            lock:
                lockData

        };

    }


    /*
       Device has not been used today.

       Reserve it for this staff member.
    */

    const lockData = {

        deviceId:
            currentDeviceId,

        staffDocumentId:
            staff.id,

        staffId:
            staff.staffId,

        staffName:
            staff.fullName ||
            staff.name ||
            "Staff Member",

        organizationId:
            staff.organizationId ||
            null,

        date:
            getDateKey(),

        createdAt:
            serverTimestamp(),

        updatedAt:
            serverTimestamp(),

        lockType:
            "daily_staff_attendance"

    };


    await setDoc(
        lockReference,
        lockData
    );


    console.log(
        "🔐 Device reserved for:",
        staff.fullName ||
        staff.name ||
        staff.staffId
    );


    return {

        allowed:
            true,

        sameStaff:
            true,

        lock:
            lockData

    };

}


/* =========================================================
   DELETE DEVICE LOCK
========================================================= */

async function removeDeviceLock() {

    if (!currentDeviceId) {

        return;

    }


    try {

        const lockId =
            getDeviceLockDocumentId();


        await deleteDoc(
            doc(
                db,
                "deviceLocks",
                lockId
            )
        );


        console.log(
            "🧹 Device lock removed because attendance creation failed."
        );

    }

    catch (error) {

        console.warn(
            "⚠️ Could not remove temporary device lock:",
            error
        );

    }

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


    /* =====================================================
       REQUIRED PARAMETERS
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
       TIMESTAMP
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
       QR AGE
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
            "This QR code has expired. Please scan the current office QR code."
        );


        return;

    }


    /* =====================================================
       QR VERIFIED
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
   ATTENDANCE STATUS
========================================================= */

function getAttendanceStatus() {

    const now =
        new Date();


    const hour =
        now.getHours();


    const minute =
        now.getMinutes();


    /*
       Before 08:00
       = PRESENT
    */

    if (
        hour <
        PRESENT_CUTOFF_HOUR
    ) {

        return "present";

    }


    /*
       After 08:00 but before 08:06
       = PRESENT
    */

    if (
        hour ===
        PRESENT_CUTOFF_HOUR
        &&
        minute <=
        PRESENT_CUTOFF_MINUTE
    ) {

        return "present";

    }


    /*
       08:06 or later
       = LATE
    */

    return "late";

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
   DEVICE OWNERSHIP CHECK
========================================================= */

function attendanceBelongsToCurrentDevice(
    attendance
) {

    if (!attendance) {

        return true;

    }


    /*
       Older attendance records may not have
       deviceId because this feature is new.

       Do not break old records.
    */

    if (
        !attendance.deviceId
    ) {

        return true;

    }


    return (
        String(
            attendance.deviceId
        ) ===
        String(
            currentDeviceId
        )
    );

}


/* =========================================================
   HANDLE CHECK IN
========================================================= */

async function handleCheckIn() {

    clearMessage();


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
       QR EXPIRATION
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


    let deviceWasReserved =
        false;


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


        /* =================================================
           EXISTING STAFF ATTENDANCE
        ================================================= */

        if (existingAttendance) {

            /*
               If this attendance belongs to another device,
               prevent the worker from using another phone.
            */

            if (
                !attendanceBelongsToCurrentDevice(
                    existingAttendance
                )
            ) {

                displayWorker(
                    staff
                );


                showMessage(
                    "This staff member has already checked in today using another phone/device. Please use the same phone used for check-in.",
                    "error"
                );


                if (checkInButton) {

                    checkInButton.disabled =
                        false;

                }


                return;

            }


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
           CHECK DEVICE LOCK
        ================================================= */

        const deviceLock =
            await getTodayDeviceLock();


        if (deviceLock) {

            const lockedStaffId =
                String(
                    deviceLock.staffId ||
                    ""
                );


            /*
               Another staff member is trying
               to use this phone.
            */

            if (
                lockedStaffId !==
                String(
                    staff.staffId ||
                    ""
                )
            ) {

                console.warn(
                    "🚫 Device already assigned to another staff member."
                );


                showMessage(
                    "This phone has already been used for another staff member's attendance today. You cannot check in another staff member using this phone.",
                    "error"
                );


                if (workerInfo) {

                    workerInfo.classList.remove(
                        "show"
                    );

                }


                return;

            }

        }


        /* =================================================
           RESERVE DEVICE
        ================================================= */

        const reservation =
            await reserveDeviceForStaff(
                staff
            );


        if (
            !reservation.allowed
        ) {

            showMessage(
                "This phone has already been used for another staff member's attendance today.",
                "error"
            );


            return;

        }


        deviceWasReserved =
            !reservation.sameStaff;


        /* =================================================
           CURRENT TIME
        ================================================= */

        const checkInTime =
            new Date();


        /* =================================================
           STATUS
        ================================================= */

        const attendanceStatusValue =
            getAttendanceStatus();


        console.log(
            "🕒 Actual check-in time:",
            checkInTime.toLocaleTimeString(
                "en-GB"
            )
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


            /* =============================================
               ATTENDANCE INFORMATION
            ============================================= */

            attendanceType:
                attendanceStatusValue,

            attendanceCompleted:
                false,

            checkInHour:
                checkInTime.getHours(),

            checkInMinute:
                checkInTime.getMinutes(),

            checkInSecond:
                checkInTime.getSeconds(),


            /* =============================================
               DEVICE INFORMATION
            ============================================= */

            deviceId:
                currentDeviceId,

            deviceLockDate:
                getDateKey(),


            /* =============================================
               QR ACCESS
            ============================================= */

            attendanceAccess:
                "office_qr",

            officeQRTimestamp:
                officeQRTimestamp,

            officeQRToken:
                officeQRToken

        };


        /* =================================================
           CREATE ATTENDANCE
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


        /* =================================================
           SHOW RESULT
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
            "📱 Device locked to Staff ID:",
            staff.staffId
        );


    }

    catch (error) {

        console.error(
            "❌ Check-in error:",
            error
        );


        /*
           If we reserved the device but failed
           to create attendance, remove the lock.
        */

        if (
            deviceWasReserved
        ) {

            await removeDeviceLock();

        }


        showMessage(
            error.message ||
            "Unable to record check-in.",
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
   PRESENT
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

        checkOutButton.textContent =
            "Check Out";

    }


    disableStaffId();

    hideCheckInButton();


    showMessage(
        "Check-in recorded successfully. You are marked Present. This phone is now assigned to your attendance for today.",
        "success"
    );

}


/* =========================================================
   LATE
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

        checkOutButton.textContent =
            "Check Out";

    }


    disableStaffId();

    hideCheckInButton();


    showMessage(
        "Check-in recorded. You arrived after 8:05 AM and have been marked Late. This phone is now assigned to your attendance for today.",
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
        status ===
        "late"
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

        checkOutButton.textContent =
            "Check Out";

    }


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


    /* =====================================================
       DEVICE SECURITY CHECK
    ===================================================== */

    if (
        currentAttendance.deviceId &&
        String(
            currentAttendance.deviceId
        ) !==
        String(
            currentDeviceId
        )
    ) {

        showMessage(
            "You must check out using the same phone/device that was used to check in.",
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
           DO NOT change Present/Late.

           The original status remains.
        */


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
    "🕘 Attendance cutoff: 08:05 AM"
);


console.log(
    "🟢 08:05 AM or earlier = Present"
);


console.log(
    "🟡 08:06 AM or later = Late"
);


console.log(
    "🔐 Same-phone daily attendance protection active."
);


console.log(
    "📱 One device = one staff attendance per day."
);


console.log(
    "🌐 Hosting-safe worker system active."
);
