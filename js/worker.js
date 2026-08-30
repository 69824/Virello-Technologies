/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/worker.js

   PURPOSE:
   WORKER CHECK-IN / CHECK-OUT / LEAVE SYSTEM

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
   - Same device / same phone daily lock
   - Leave request submission
   - Leave requests stored in Firestore
   - Hosting safe

   ATTENDANCE RULE:
   - 08:05 AM OR EARLIER = PRESENT
   - 08:06 AM OR LATER = LATE

   DEVICE RULE:
   - One device can check in ONE staff member per day.
   - Same staff member can check out from same device.
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
   LEAVE DOM
========================================================= */

const leaveSection =
    document.getElementById(
        "leaveSection"
    );


const showLeaveButton =
    document.getElementById(
        "showLeaveButton"
    );


const leaveForm =
    document.getElementById(
        "leaveForm"
    );


const leaveType =
    document.getElementById(
        "leaveType"
    );


const leaveStartDate =
    document.getElementById(
        "leaveStartDate"
    );


const leaveEndDate =
    document.getElementById(
        "leaveEndDate"
    );


const leaveReason =
    document.getElementById(
        "leaveReason"
    );


const submitLeaveButton =
    document.getElementById(
        "submitLeaveButton"
    );


const leaveSuccess =
    document.getElementById(
        "leaveSuccess"
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


        setTodayDate();


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


        if (showLeaveButton) {

            showLeaveButton.addEventListener(
                "click",
                showLeaveForm
            );

        }


        if (submitLeaveButton) {

            submitLeaveButton.addEventListener(
                "click",
                handleLeaveSubmission
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
   CHECK DEVICE LOCK
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
   RESERVE DEVICE
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


        return {

            allowed:
                false,

            sameStaff:
                false,

            lock:
                lockData

        };

    }


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
   REMOVE DEVICE LOCK
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

    }

    catch (error) {

        console.warn(
            "⚠️ Could not remove device lock:",
            error
        );

    }

}


/* =========================================================
   OFFICE QR VERIFICATION
========================================================= */

function verifyOfficeQR() {

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

        officeQRVerified =
            false;


        setOfficeAccessState(
            false,
            "Office QR Required",
            "Please scan the official Virello office QR code before using attendance or leave management."
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

        officeQRVerified =
            false;


        setOfficeAccessState(
            false,
            "Invalid Office QR",
            "The QR code information is invalid."
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


    if (
        hour <
        PRESENT_CUTOFF_HOUR
    ) {

        return "present";

    }


    if (
        hour ===
        PRESENT_CUTOFF_HOUR
        &&
        minute <=
        PRESENT_CUTOFF_MINUTE
    ) {

        return "present";

    }


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
   FIND TODAY ATTENDANCE
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


    if (
        !isOfficeQRStillValid()
    ) {

        officeQRVerified =
            false;


        showMessage(
            "The Office QR code has expired. Please scan the new QR code.",
            "error"
        );


        return;

    }


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


        staffIdInput?.focus();

        return;

    }


    if (checkInButton) {

        checkInButton.disabled =
            true;

        checkInButton.textContent =
            "Checking...";

    }


    let deviceWasReserved =
        false;


    try {

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


        const existingAttendance =
            await findTodayAttendance(
                staff
            );


        if (existingAttendance) {

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


                return;

            }


            currentAttendance =
                existingAttendance;


            displayWorker(
                staff
            );


            showLeaveSection();


            if (
                existingAttendance.checkOut
            ) {

                showCompletedAttendance();

            } else {

                showAlreadyCheckedIn();

            }


            return;

        }


        const deviceLock =
            await getTodayDeviceLock();


        if (deviceLock) {

            const lockedStaffId =
                String(
                    deviceLock.staffId ||
                    ""
                );


            if (
                lockedStaffId !==
                String(
                    staff.staffId ||
                    ""
                )
            ) {

                showMessage(
                    "This phone has already been used for another staff member's attendance today.",
                    "error"
                );


                return;

            }

        }


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


        const checkInTime =
            new Date();


        const attendanceStatusValue =
            getAttendanceStatus();


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

            deviceId:
                currentDeviceId,

            deviceLockDate:
                getDateKey(),

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


        showLeaveSection();


        if (
            attendanceStatusValue ===
            "late"
        ) {

            showLateCheckedIn();

        } else {

            showCheckedIn();

        }


    }

    catch (error) {

        console.error(
            "❌ Check-in error:",
            error
        );


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
   QR STILL VALID
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


    return (
        age <=
        QR_LIFETIME_SECONDS * 1000
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
   SHOW LEAVE SECTION
========================================================= */

function showLeaveSection() {

    if (!leaveSection) {

        return;

    }


    leaveSection.classList.add(
        "show"
    );

}


/* =========================================================
   SHOW LEAVE FORM
========================================================= */

function showLeaveForm() {

    if (!currentStaff) {

        showMessage(
            "Please enter and verify your Staff ID first.",
            "error"
        );

        return;

    }


    if (
        !officeQRVerified ||
        !isOfficeQRStillValid()
    ) {

        showMessage(
            "Please scan the current official Office QR code before submitting leave.",
            "error"
        );

        return;

    }


    if (leaveForm) {

        leaveForm.classList.add(
            "show"
        );

    }


    if (showLeaveButton) {

        showLeaveButton.textContent =
            "Leave Request Form Open";

    }

}


/* =========================================================
   LEAVE DATE VALIDATION
========================================================= */

function validateLeaveDates(
    startDate,
    endDate
) {

    if (!startDate || !endDate) {

        return {
            valid: false,
            message: "Please select both the start date and end date."
        };

    }


    if (endDate < startDate) {

        return {
            valid: false,
            message: "The leave end date cannot be before the start date."
        };

    }


    return {
        valid: true,
        message: ""
    };

}


/* =========================================================
   SUBMIT LEAVE
========================================================= */

async function handleLeaveSubmission() {

    clearMessage();


    if (!currentStaff) {

        showMessage(
            "Please verify your Staff ID before submitting leave.",
            "error"
        );

        return;

    }


    if (!officeQRVerified) {

        showMessage(
            "Please scan the official office QR code before submitting leave.",
            "error"
        );

        return;

    }


    if (!isOfficeQRStillValid()) {

        officeQRVerified =
            false;


        showMessage(
            "The Office QR code has expired. Please scan the new QR code.",
            "error"
        );

        return;

    }


    const selectedLeaveType =
        String(
            leaveType?.value ||
            ""
        ).trim();


    const startDate =
        String(
            leaveStartDate?.value ||
            ""
        ).trim();


    const endDate =
        String(
            leaveEndDate?.value ||
            ""
        ).trim();


    const reason =
        String(
            leaveReason?.value ||
            ""
        ).trim();


    if (!selectedLeaveType) {

        showMessage(
            "Please select a leave type.",
            "error"
        );

        return;

    }


    const dateValidation =
        validateLeaveDates(
            startDate,
            endDate
        );


    if (!dateValidation.valid) {

        showMessage(
            dateValidation.message,
            "error"
        );

        return;

    }


    if (!reason) {

        showMessage(
            "Please provide the reason for your leave request.",
            "error"
        );

        return;

    }


    if (reason.length < 5) {

        showMessage(
            "Please provide a little more information about your leave.",
            "error"
        );

        return;

    }


    if (submitLeaveButton) {

        submitLeaveButton.disabled =
            true;

        submitLeaveButton.textContent =
            "Submitting...";

    }


    try {

        const leaveData = {

            staffDocumentId:
                currentStaff.id,

            staffId:
                currentStaff.staffId,

            staffName:
                currentStaff.fullName ||
                currentStaff.name ||
                "Staff Member",

            position:
                currentStaff.position ||
                currentStaff.role ||
                "",

            organizationId:
                currentStaff.organizationId ||
                null,

            leaveType:
                selectedLeaveType,

            startDate:
                startDate,

            endDate:
                endDate,

            reason:
                reason,

            status:
                "pending",

            submittedDate:
                getDateKey(),

            submittedAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp(),

            submittedThrough:
                "worker_qr",

            officeQRTimestamp:
                officeQRTimestamp,

            officeQRToken:
                officeQRToken,

            deviceId:
                currentDeviceId

        };


        const leaveRef =
            collection(
                db,
                "leaveRequests"
            );


        const leaveDocument =
            await addDoc(
                leaveRef,
                leaveData
            );


        console.log(
            "✅ Leave request submitted:",
            leaveDocument.id
        );


        if (leaveSuccess) {

            leaveSuccess.textContent =
                "✓ Leave request submitted successfully. Your request is now Pending and will be reviewed by your administrator.";

            leaveSuccess.classList.add(
                "show"
            );

        }


        showMessage(
            "Leave request submitted successfully.",
            "success"
        );


        if (leaveType) {

            leaveType.value =
                "";

        }


        if (leaveStartDate) {

            leaveStartDate.value =
                "";

        }


        if (leaveEndDate) {

            leaveEndDate.value =
                "";

        }


        if (leaveReason) {

            leaveReason.value =
                "";

        }


        if (leaveForm) {

            leaveForm.classList.remove(
                "show"
            );

        }


        if (showLeaveButton) {

            showLeaveButton.textContent =
                "Submit Another Leave Request";

        }

    }

    catch (error) {

        console.error(
            "❌ Leave submission error:",
            error
        );


        showMessage(
            "Unable to submit leave request: " +
            (
                error.message ||
                "Unknown error"
            ),
            "error"
        );

    }

    finally {

        if (submitLeaveButton) {

            submitLeaveButton.disabled =
                false;

            submitLeaveButton.textContent =
                "Submit Leave Request";

        }

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
        "Check-in recorded. You arrived after 8:05 AM and have been marked Late.",
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


    if (attendanceStatus) {

        if (
            status ===
            "late"
        ) {

            attendanceStatus.textContent =
                "✓ Attendance completed — Late.";

            attendanceStatus.className =
                "attendance-status status-late";

        } else {

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
   CHECK OUT
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


        showCompletedAttendance();


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
    "✅ Virello Worker Attendance + Leave System loaded."
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
    "📋 Leave submission enabled."
);


console.log(
    "🌐 Hosting-safe worker system active."
);
