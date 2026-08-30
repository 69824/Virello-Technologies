/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/worker.js

   PURPOSE:
   WORKER CHECK-IN / CHECK-OUT / LEAVE SYSTEM

   COMPLETE VERSION

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
   - Leave status checking
   - Pending leave protection
   - Approved leave display
   - Rejected leave display
   - Future approved leave display
   - Approved current leave prevents attendance
   - Leave dates automatically checked
   - Staff switching clears previous state
   - Supports approved/Approved/APPROVED
   - Supports different approval field names
   - Hosting safe

   ATTENDANCE:
   08:05 AM OR EARLIER = PRESENT
   08:06 AM OR LATER = LATE

   DEVICE:
   One device can check in ONE staff member per day.
   Same staff member can check out from same device.

   LEAVE:
   Pending = cannot submit another request
   Approved current = attendance blocked
   Approved future = displayed but attendance allowed
   Rejected = new request allowed
   Expired approved = attendance normal
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

const auth = getAuth(app);

const db = getFirestore(app);


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentStaff = null;
let currentAttendance = null;
let currentLeaveRequest = null;
let currentLeaveState = "none";


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

const QR_LIFETIME_SECONDS = 30;


/* =========================================================
   ATTENDANCE SETTINGS
========================================================= */

const PRESENT_CUTOFF_HOUR = 8;
const PRESENT_CUTOFF_MINUTE = 5;


/* =========================================================
   DOM
========================================================= */

const staffIdInput =
    document.getElementById("staffIdInput");

const checkInButton =
    document.getElementById("checkInButton");

const checkOutButton =
    document.getElementById("checkOutButton");

const workerInfo =
    document.getElementById("workerInfo");

const workerName =
    document.getElementById("workerName");

const workerPosition =
    document.getElementById("workerPosition");

const attendanceStatus =
    document.getElementById("attendanceStatus");

const workerMessage =
    document.getElementById("workerMessage");

const todayDate =
    document.getElementById("todayDate");

const officeAccess =
    document.getElementById("officeAccess");

const officeAccessTitle =
    document.getElementById("officeAccessTitle");

const officeAccessText =
    document.getElementById("officeAccessText");


/* =========================================================
   LEAVE DOM
========================================================= */

const leaveSection =
    document.getElementById("leaveSection");

const showLeaveButton =
    document.getElementById("showLeaveButton");

const leaveForm =
    document.getElementById("leaveForm");

const leaveType =
    document.getElementById("leaveType");

const leaveStartDate =
    document.getElementById("leaveStartDate");

const leaveEndDate =
    document.getElementById("leaveEndDate");

const leaveReason =
    document.getElementById("leaveReason");

const submitLeaveButton =
    document.getElementById("submitLeaveButton");

const leaveSuccess =
    document.getElementById("leaveSuccess");


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
                async event => {

                    if (event.key === "Enter") {

                        event.preventDefault();

                        await verifyStaffFromInput();

                    }

                }
            );


            staffIdInput.addEventListener(
                "input",
                () => {

                    const value =
                        String(
                            staffIdInput.value || ""
                        ).trim();

                    if (!value) {

                        resetStaffState();

                        return;

                    }

                    if (
                        currentStaff &&
                        value.toUpperCase() !==
                        String(
                            currentStaff.staffId || ""
                        ).toUpperCase()
                    ) {

                        resetStaffState();

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
   VERIFY STAFF
========================================================= */

async function verifyStaffFromInput() {

    clearMessage();

    const staffId =
        String(
            staffIdInput?.value || ""
        ).trim();

    if (!staffId) {

        showMessage(
            "Please enter your Staff ID.",
            "error"
        );

        staffIdInput?.focus();

        return;

    }


    try {

        const staff =
            await findStaff(staffId);


        if (!staff) {

            resetStaffState();

            showMessage(
                "Staff ID not found. Please check your Staff ID.",
                "error"
            );

            return;

        }


        const staffStatus =
            String(
                staff.status || "active"
            )
            .trim()
            .toLowerCase();


        if (staffStatus !== "active") {

            resetStaffState();

            showMessage(
                "This staff account is inactive. Please contact your administrator.",
                "error"
            );

            return;

        }


        currentStaff = staff;
        currentAttendance = null;
        currentLeaveRequest = null;
        currentLeaveState = "none";


        displayWorker(staff);


        console.log(
            "👤 Staff selected:",
            staff
        );


        const leaveResult =
            await checkStaffLeaveStatus(staff);


        console.log(
            "📋 Leave result:",
            leaveResult
        );


        if (
            leaveResult.state === "approved"
        ) {

            return;

        }


        if (
            leaveResult.state === "approved_future"
        ) {

            return;

        }


        if (
            leaveResult.state === "pending"
        ) {

            return;

        }


        prepareForNormalAttendanceDisplay();

    }

    catch (error) {

        console.error(
            "❌ Staff verification error:",
            error
        );

        showMessage(
            error.message ||
            "Unable to verify staff member.",
            "error"
        );

    }

}


/* =========================================================
   RESET STAFF STATE
========================================================= */

function resetStaffState() {

    currentStaff = null;
    currentAttendance = null;
    currentLeaveRequest = null;
    currentLeaveState = "none";


    if (workerInfo) {

        workerInfo.classList.remove("show");

    }


    if (attendanceStatus) {

        attendanceStatus.textContent = "";

        attendanceStatus.className =
            "attendance-status";

    }


    if (leaveSuccess) {

        leaveSuccess.textContent = "";

        leaveSuccess.classList.remove("show");

    }


    if (leaveForm) {

        leaveForm.classList.remove("show");

    }


    if (showLeaveButton) {

        showLeaveButton.style.display =
            "block";

        showLeaveButton.textContent =
            "Request Leave";

    }


    if (checkInButton) {

        checkInButton.style.display =
            "block";

        checkInButton.disabled =
            false;

        checkInButton.textContent =
            "Check In";

    }


    if (checkOutButton) {

        checkOutButton.style.display =
            "none";

        checkOutButton.disabled =
            true;

    }

}


/* =========================================================
   NORMAL ATTENDANCE DISPLAY
========================================================= */

function prepareForNormalAttendanceDisplay() {

    if (checkInButton) {

        checkInButton.style.display =
            "block";

        checkInButton.disabled =
            false;

        checkInButton.textContent =
            "Check In";

    }


    if (checkOutButton) {

        checkOutButton.style.display =
            "none";

        checkOutButton.disabled =
            true;

    }


    if (attendanceStatus) {

        attendanceStatus.textContent = "";

    }

}


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

        }

        else {

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
            "❌ Device ID error:",
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
   DEVICE LOCK ID
========================================================= */

function getDeviceLockDocumentId() {

    const safeDeviceId =
        String(
            currentDeviceId || ""
        )
        .replace(/\//g, "_");


    return (
        getDateKey() +
        "_" +
        safeDeviceId
    );

}


/* =========================================================
   GET DEVICE LOCK
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
        await getDoc(lockReference);


    if (!lockSnapshot.exists()) {

        return null;

    }


    return {

        id: lockSnapshot.id,

        ...lockSnapshot.data()

    };

}


/* =========================================================
   RESERVE DEVICE
========================================================= */

async function reserveDeviceForStaff(
    staff
) {

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


    if (existingLock.exists()) {

        const lockData =
            existingLock.data();


        const lockedStaffId =
            String(
                lockData.staffId || ""
            );


        if (
            lockedStaffId ===
            String(
                staff.staffId || ""
            )
        ) {

            return {

                allowed: true,

                sameStaff: true,

                lock: lockData

            };

        }


        return {

            allowed: false,

            sameStaff: false,

            lock: lockData

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

        allowed: true,

        sameStaff: false,

        lock: lockData

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
   OFFICE QR
========================================================= */

function verifyOfficeQR() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const officeQR =
        params.get("officeQR");

    const timestamp =
        params.get("timestamp");

    const token =
        params.get("token");


    if (
        officeQR !== "1" ||
        !timestamp ||
        !token
    ) {

        officeQRVerified = false;


        setOfficeAccessState(
            false,
            "Office QR Required",
            "Please scan the official Virello office QR code before using attendance or leave management."
        );


        return;

    }


    const qrTimestamp =
        Number(timestamp);


    if (
        !Number.isFinite(qrTimestamp)
    ) {

        officeQRVerified = false;


        setOfficeAccessState(
            false,
            "Invalid Office QR",
            "The QR code information is invalid."
        );


        return;

    }


    const age =
        Math.abs(
            Date.now() -
            qrTimestamp
        );


    if (
        age >
        QR_LIFETIME_SECONDS * 1000
    ) {

        officeQRVerified = false;
        officeQRTimestamp = null;
        officeQRToken = null;


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


    officeAccess.classList.add("show");


    if (verified) {

        officeAccess.classList.remove(
            "invalid"
        );

    }

    else {

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
   TODAY
========================================================= */

function setTodayDate() {

    if (!todayDate) {

        return;

    }


    todayDate.textContent =
        new Date().toLocaleDateString(
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
        ).padStart(2, "0");


    const day =
        String(
            now.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

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
        hour < PRESENT_CUTOFF_HOUR
    ) {

        return "present";

    }


    if (
        hour === PRESENT_CUTOFF_HOUR &&
        minute <= PRESENT_CUTOFF_MINUTE
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
        "message show " + type;

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


    if (snapshot.empty) {

        return null;

    }


    const staffDocument =
        snapshot.docs[0];


    return {

        id:
            staffDocument.id,

        ...staffDocument.data()

    };

}


/* =========================================================
   FIND TODAY ATTENDANCE
========================================================= */

async function findTodayAttendance(
    staff
) {

    const attendanceQuery =
        query(

            collection(
                db,
                "attendance"
            ),

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


    if (snapshot.empty) {

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
   FIND STAFF LEAVE REQUESTS

   IMPORTANT FIX:

   This query is intentionally based on the STAFF DOCUMENT ID.

   Example:

   Dainel Bayoh
   staff document ID = abc123

   leaveRequests document:
   staffDocumentId = abc123

   This allows the worker to find the approved request.
========================================================= */

async function findStaffLeaveRequests(
    staff
) {

    console.log(
        "🔎 Searching leave requests for:",
        staff.staffId
    );

    console.log(
        "🆔 Staff document ID:",
        staff.id
    );


    const leaveRef =
        collection(
            db,
            "leaveRequests"
        );


    const leaveQuery =
        query(
            leaveRef,

            where(
                "staffDocumentId",
                "==",
                staff.id
            )

        );


    const snapshot =
        await getDocs(
            leaveQuery
        );


    console.log(
        "📋 Leave documents found:",
        snapshot.size
    );


    const requests = [];


    snapshot.forEach(
        leaveDocument => {

            const data =
                leaveDocument.data();


            console.log(
                "📄 Leave document:",
                leaveDocument.id,
                data
            );


            requests.push({

                id:
                    leaveDocument.id,

                ...data

            });

        }
    );


    requests.sort(
        (a, b) => {

            return (
                getTimestampMillis(
                    b.createdAt ||
                    b.submittedAt ||
                    b.updatedAt
                )
                -
                getTimestampMillis(
                    a.createdAt ||
                    a.submittedAt ||
                    a.updatedAt
                )
            );

        }
    );


    return requests;

}


/* =========================================================
   NORMALIZE LEAVE STATUS

   Supports:

   approved
   Approved
   APPROVED
   approved_current
========================================================= */

function normalizeLeaveStatus(
    request
) {

    const raw =
        request?.status ??
        request?.leaveStatus ??
        request?.approvalStatus ??
        "";


    return String(
        raw
    )
    .trim()
    .toLowerCase();

}


/* =========================================================
   GET LEAVE START
========================================================= */

function getLeaveStartDate(
    request
) {

    return String(
        request?.startDate ||
        request?.leaveStartDate ||
        ""
    ).trim();

}


/* =========================================================
   GET LEAVE END
========================================================= */

function getLeaveEndDate(
    request
) {

    return String(
        request?.endDate ||
        request?.leaveEndDate ||
        ""
    ).trim();

}


/* =========================================================
   GET LEAVE TYPE
========================================================= */

function getLeaveType(
    request
) {

    return (
        request?.leaveType ||
        request?.type ||
        "Leave"
    );

}


/* =========================================================
   GET CURRENT STAFF LEAVE
========================================================= */

async function getCurrentStaffLeave(
    staff
) {

    const requests =
        await findStaffLeaveRequests(
            staff
        );


    if (!requests.length) {

        console.log(
            "ℹ️ No leave request found."
        );


        return {

            state: "none",

            request: null

        };

    }


    const today =
        getDateKey();


    console.log(
        "📅 Today:",
        today
    );


    /* =====================================================
       APPROVED
    ===================================================== */

    const approvedRequests =
        requests.filter(
            request => {

                const status =
                    normalizeLeaveStatus(
                        request
                    );


                return (
                    status === "approved" ||
                    status === "approve"
                );

            }
        );


    console.log(
        "✅ Approved requests:",
        approvedRequests
    );


    /* =====================================================
       CURRENT APPROVED LEAVE
    ===================================================== */

    const activeApprovedLeave =
        approvedRequests.find(
            request => {

                const start =
                    getLeaveStartDate(
                        request
                    );


                const end =
                    getLeaveEndDate(
                        request
                    );


                console.log(
                    "🏖️ Checking approved leave:",
                    {
                        start,
                        end,
                        today
                    }
                );


                if (!start || !end) {

                    return false;

                }


                return (
                    start <= today &&
                    end >= today
                );

            }
        );


    if (activeApprovedLeave) {

        console.log(
            "🏖️ CURRENT APPROVED LEAVE FOUND:",
            activeApprovedLeave
        );


        return {

            state: "approved",

            request:
                activeApprovedLeave

        };

    }


    /* =====================================================
       FUTURE APPROVED LEAVE
    ===================================================== */

    const futureApprovedLeave =
        approvedRequests.find(
            request => {

                const start =
                    getLeaveStartDate(
                        request
                    );


                return (
                    start &&
                    start > today
                );

            }
        );


    if (futureApprovedLeave) {

        console.log(
            "📅 FUTURE APPROVED LEAVE FOUND:",
            futureApprovedLeave
        );


        return {

            state: "approved_future",

            request:
                futureApprovedLeave

        };

    }


    /* =====================================================
       PENDING
    ===================================================== */

    const pendingRequests =
        requests.filter(
            request => {

                return (
                    normalizeLeaveStatus(
                        request
                    ) === "pending"
                );

            }
        );


    const activePendingRequest =
        pendingRequests.find(
            request => {

                const end =
                    getLeaveEndDate(
                        request
                    );


                if (!end) {

                    return true;

                }


                return end >= today;

            }
        );


    if (activePendingRequest) {

        console.log(
            "🕒 PENDING LEAVE FOUND:",
            activePendingRequest
        );


        return {

            state: "pending",

            request:
                activePendingRequest

        };

    }


    /* =====================================================
       REJECTED
    ===================================================== */

    const rejectedRequest =
        requests.find(
            request => {

                return (
                    normalizeLeaveStatus(
                        request
                    ) === "rejected"
                );

            }
        );


    if (rejectedRequest) {

        return {

            state: "rejected",

            request:
                rejectedRequest

        };

    }


    return {

        state: "none",

        request: null

    };

}


/* =========================================================
   CHECK STAFF LEAVE STATUS
========================================================= */

async function checkStaffLeaveStatus(
    staff
) {

    currentLeaveRequest = null;
    currentLeaveState = "none";


    try {

        const result =
            await getCurrentStaffLeave(
                staff
            );


        currentLeaveState =
            result.state;


        currentLeaveRequest =
            result.request;


        console.log(
            "📋 FINAL LEAVE STATE:",
            {
                staff:
                    staff.staffId,

                state:
                    currentLeaveState,

                request:
                    currentLeaveRequest
            }
        );


        applyLeaveStateToInterface();


        return result;

    }

    catch (error) {

        console.error(
            "❌ LEAVE LOOKUP FAILED:",
            error
        );


        currentLeaveState =
            "error";


        currentLeaveRequest =
            null;


        showMessage(
            "Unable to check leave status: " +
            (
                error.message ||
                "Firestore error"
            ),
            "error"
        );


        return {

            state: "error",

            request: null

        };

    }

}


/* =========================================================
   APPLY LEAVE STATE
========================================================= */

function applyLeaveStateToInterface() {

    switch (
        currentLeaveState
    ) {

        case "pending":

            showPendingLeave();

            break;


        case "approved":

            showApprovedLeave();

            break;


        case "approved_future":

            showFutureApprovedLeave();

            break;


        case "rejected":

            showRejectedLeave();

            break;


        default:

            showNormalLeaveState();

            break;

    }

}


/* =========================================================
   SHOW PENDING
========================================================= */

function showPendingLeave() {

    showLeaveSection();


    if (leaveForm) {

        leaveForm.classList.remove(
            "show"
        );

    }


    if (showLeaveButton) {

        showLeaveButton.style.display =
            "none";

    }


    const request =
        currentLeaveRequest;


    const type =
        getLeaveType(
            request
        );


    const start =
        getLeaveStartDate(
            request
        );


    const end =
        getLeaveEndDate(
            request
        );


    if (leaveSuccess) {

        leaveSuccess.textContent =
            start && end

                ? `🕒 Your ${type} request is currently PENDING from ${formatLeaveDate(start)} to ${formatLeaveDate(end)}. Please wait for your administrator to review it.`

                : `🕒 Your ${type} request is currently PENDING. Please wait for your administrator to review it.`;

        leaveSuccess.classList.add(
            "show"
        );

    }


    showMessage(
        "🕒 Your leave request is currently pending. Please wait for your administrator to review it.",
        "warning"
    );

}


/* =========================================================
   SHOW APPROVED CURRENT LEAVE
========================================================= */

function showApprovedLeave() {

    showLeaveSection();


    if (leaveForm) {

        leaveForm.classList.remove(
            "show"
        );

    }


    if (showLeaveButton) {

        showLeaveButton.style.display =
            "none";

    }


    const request =
        currentLeaveRequest;


    const type =
        getLeaveType(
            request
        );


    const start =
        getLeaveStartDate(
            request
        );


    const end =
        getLeaveEndDate(
            request
        );


    console.log(
        "🎉 DISPLAYING APPROVED LEAVE:",
        {
            type,
            start,
            end,
            request
        }
    );


    if (leaveSuccess) {

        leaveSuccess.textContent =
            `✅ Your ${type} Has Been Approved — Leave approved from ${formatLeaveDate(start)} to ${formatLeaveDate(end)}.`;

        leaveSuccess.classList.add(
            "show"
        );

    }


    if (attendanceStatus) {

        attendanceStatus.textContent =
            `🏖️ You are currently on approved leave (${formatLeaveDate(start)} to ${formatLeaveDate(end)}).`;

        attendanceStatus.className =
            "attendance-status status-approved";

    }


    if (checkInButton) {

        checkInButton.disabled =
            true;

        checkInButton.style.display =
            "none";

    }


    if (checkOutButton) {

        checkOutButton.disabled =
            true;

        checkOutButton.style.display =
            "none";

    }


    showMessage(
        `✅ Your ${type} Has Been Approved. Leave period: ${formatLeaveDate(start)} to ${formatLeaveDate(end)}. Attendance is not required today.`,
        "success"
    );

}


/* =========================================================
   SHOW FUTURE APPROVED
========================================================= */

function showFutureApprovedLeave() {

    showLeaveSection();


    if (leaveForm) {

        leaveForm.classList.remove(
            "show"
        );

    }


    if (showLeaveButton) {

        showLeaveButton.style.display =
            "none";

    }


    const request =
        currentLeaveRequest;


    const type =
        getLeaveType(
            request
        );


    const start =
        getLeaveStartDate(
            request
        );


    const end =
        getLeaveEndDate(
            request
        );


    if (leaveSuccess) {

        leaveSuccess.textContent =
            `✅ Leave Approved — Your ${type} has been approved for ${formatLeaveDate(start)} to ${formatLeaveDate(end)}.`;

        leaveSuccess.classList.add(
            "show"
        );

    }


    if (checkInButton) {

        checkInButton.style.display =
            "block";

        checkInButton.disabled =
            false;

    }


    showMessage(
        `✅ Your ${type} has been approved for ${formatLeaveDate(start)} to ${formatLeaveDate(end)}. You can continue normal attendance until your leave starts.`,
        "success"
    );

}


/* =========================================================
   SHOW REJECTED
========================================================= */

function showRejectedLeave() {

    showLeaveSection();


    if (leaveForm) {

        leaveForm.classList.remove(
            "show"
        );

    }


    if (showLeaveButton) {

        showLeaveButton.style.display =
            "block";

        showLeaveButton.textContent =
            "Submit Another Leave Request";

    }


    if (leaveSuccess) {

        leaveSuccess.textContent =
            "❌ Your previous leave request was rejected. You may submit a new leave request.";

        leaveSuccess.classList.add(
            "show"
        );

    }


    if (checkInButton) {

        checkInButton.style.display =
            "block";

        checkInButton.disabled =
            false;

    }


    showMessage(
        "Your previous leave request was rejected. You may submit another request.",
        "error"
    );

}


/* =========================================================
   NORMAL LEAVE
========================================================= */

function showNormalLeaveState() {

    if (showLeaveButton) {

        showLeaveButton.style.display =
            "block";

        showLeaveButton.textContent =
            "Request Leave";

    }


    if (leaveSuccess) {

        leaveSuccess.textContent =
            "";

        leaveSuccess.classList.remove(
            "show"
        );

    }


    if (checkInButton) {

        checkInButton.style.display =
            "block";

        checkInButton.disabled =
            false;

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
        currentLeaveState === "pending"
    ) {

        showMessage(
            "You already have a pending leave request. Please wait for your administrator to review it.",
            "warning"
        );

        return;

    }


    if (
        currentLeaveState === "approved"
    ) {

        showMessage(
            "You are currently on approved leave. A new leave request cannot be submitted at this time.",
            "warning"
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
   VALIDATE LEAVE DATES
========================================================= */

function validateLeaveDates(
    startDate,
    endDate
) {

    if (!startDate || !endDate) {

        return {

            valid: false,

            message:
                "Please select both the start date and end date."

        };

    }


    if (endDate < startDate) {

        return {

            valid: false,

            message:
                "The leave end date cannot be before the start date."

        };

    }


    return {

        valid: true,

        message: ""

    };

}


/* =========================================================
   HANDLE LEAVE SUBMISSION
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


    const latestLeaveState =
        await checkStaffLeaveStatus(
            currentStaff
        );


    if (
        latestLeaveState.state ===
        "pending"
    ) {

        showMessage(
            "You already have a pending leave request. Please wait for your administrator to review it.",
            "warning"
        );

        return;

    }


    if (
        latestLeaveState.state ===
        "approved"
    ) {

        showMessage(
            "You are currently on approved leave. You cannot submit another leave request during this leave period.",
            "warning"
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

        officeQRVerified = false;

        showMessage(
            "The Office QR code has expired. Please scan the new QR code.",
            "error"
        );

        return;

    }


    const selectedLeaveType =
        String(
            leaveType?.value || ""
        ).trim();


    const startDate =
        String(
            leaveStartDate?.value || ""
        ).trim();


    const endDate =
        String(
            leaveEndDate?.value || ""
        ).trim();


    const reason =
        String(
            leaveReason?.value || ""
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

            createdAt:
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


        const leaveDocument =
            await addDoc(
                collection(
                    db,
                    "leaveRequests"
                ),
                leaveData
            );


        currentLeaveRequest = {

            id:
                leaveDocument.id,

            ...leaveData

        };


        currentLeaveState =
            "pending";


        if (leaveSuccess) {

            leaveSuccess.textContent =
                "🕒 Leave request submitted successfully. Your request is now Pending.";

            leaveSuccess.classList.add(
                "show"
            );

        }


        showMessage(
            "🕒 Leave request submitted successfully. Please wait for your administrator to approve or reject it.",
            "success"
        );


        if (leaveType) {

            leaveType.value = "";

        }


        if (leaveStartDate) {

            leaveStartDate.value = "";

        }


        if (leaveEndDate) {

            leaveEndDate.value = "";

        }


        if (leaveReason) {

            leaveReason.value = "";

        }


        if (leaveForm) {

            leaveForm.classList.remove(
                "show"
            );

        }


        if (showLeaveButton) {

            showLeaveButton.style.display =
                "none";

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
   CHECK IN
========================================================= */

async function handleCheckIn() {

    clearMessage();


    if (!officeQRVerified) {

        showMessage(
            "Please scan the current official Office QR code before checking in.",
            "error"
        );

        return;

    }


    if (!isOfficeQRStillValid()) {

        officeQRVerified = false;

        showMessage(
            "The Office QR code has expired. Please scan the new QR code.",
            "error"
        );

        return;

    }


    const staffId =
        String(
            staffIdInput?.value || ""
        ).trim();


    if (!staffId) {

        showMessage(
            "Please enter your Staff ID.",
            "error"
        );

        return;

    }


    if (checkInButton) {

        checkInButton.disabled =
            true;

        checkInButton.textContent =
            "Checking...";

    }


    let deviceWasReserved = false;


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
                staff.status || "active"
            )
            .trim()
            .toLowerCase();


        if (
            staffStatus !== "active"
        ) {

            showMessage(
                "This staff account is inactive.",
                "error"
            );

            return;

        }


        currentStaff =
            staff;


        currentAttendance =
            null;


        displayWorker(
            staff
        );


        /* =================================================
           CHECK LEAVE FIRST
        ================================================= */

        const leaveResult =
            await checkStaffLeaveStatus(
                staff
            );


        if (
            leaveResult.state ===
            "approved"
        ) {

            return;

        }


        /* =================================================
           EXISTING ATTENDANCE
        ================================================= */

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

                showMessage(
                    "This staff member has already checked in today using another phone/device.",
                    "error"
                );

                return;

            }


            currentAttendance =
                existingAttendance;


            showLeaveSection();


            if (
                existingAttendance.checkOut
            ) {

                showCompletedAttendance();

            }

            else {

                showAlreadyCheckedIn();

            }


            return;

        }


        /* =================================================
           DEVICE LOCK
        ================================================= */

        const deviceLock =
            await getTodayDeviceLock();


        if (deviceLock) {

            const lockedStaffId =
                String(
                    deviceLock.staffId || ""
                );


            if (
                lockedStaffId !==
                String(
                    staff.staffId || ""
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


        if (!reservation.allowed) {

            showMessage(
                "This phone has already been used for another staff member's attendance today.",
                "error"
            );

            return;

        }


        deviceWasReserved =
            !reservation.sameStaff;


        /* =================================================
           CREATE ATTENDANCE
        ================================================= */

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


        const newAttendance =
            await addDoc(
                collection(
                    db,
                    "attendance"
                ),
                attendanceData
            );


        currentAttendance = {

            id:
                newAttendance.id,

            ...attendanceData

        };


        showLeaveSection();


        if (
            attendanceStatusValue ===
            "late"
        ) {

            showLateCheckedIn();

        }

        else {

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
   QR VALIDITY
========================================================= */

function isOfficeQRStillValid() {

    if (
        !officeQRVerified ||
        !officeQRTimestamp ||
        !officeQRToken
    ) {

        return false;

    }


    const age =
        Math.abs(
            Date.now() -
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


    if (attendanceStatus) {

        attendanceStatus.textContent =
            status === "late"
                ? "✓ You are already checked in — Late."
                : "✓ You are already checked in — Present.";

        attendanceStatus.className =
            status === "late"
                ? "attendance-status status-late"
                : "attendance-status status-present";

    }


    if (checkOutButton) {

        checkOutButton.disabled =
            false;

        checkOutButton.style.display =
            "block";

        checkOutButton.textContent =
            "Check Out";

    }


    hideCheckInButton();


    showMessage(
        status === "late"
            ? "You have already checked in today and are marked Late."
            : "You have already checked in today and are marked Present.",
        "success"
    );

}


/* =========================================================
   COMPLETED
========================================================= */

function showCompletedAttendance() {

    const status =
        String(
            currentAttendance?.status ||
            ""
        ).toLowerCase();


    if (attendanceStatus) {

        attendanceStatus.textContent =
            status === "late"
                ? "✓ Attendance completed — Late."
                : "✓ Attendance completed — Present.";

        attendanceStatus.className =
            status === "late"
                ? "attendance-status status-late"
                : "attendance-status status-present";

    }


    if (checkOutButton) {

        checkOutButton.disabled =
            true;

        checkOutButton.textContent =
            "Attendance Complete";

        checkOutButton.style.display =
            "block";

    }


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
        currentLeaveState ===
        "approved"
    ) {

        showMessage(
            "You are currently on approved leave. Attendance checkout is not required.",
            "warning"
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
            "You must check out using the same phone/device used to check in.",
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

        await updateDoc(

            doc(
                db,
                "attendance",
                currentAttendance.id
            ),

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
   HIDE CHECK-IN
========================================================= */

function hideCheckInButton() {

    if (checkInButton) {

        checkInButton.style.display =
            "none";

    }

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatLeaveDate(
    dateString
) {

    if (!dateString) {

        return "—";

    }


    const parts =
        String(
            dateString
        ).split("-");


    if (
        parts.length !== 3
    ) {

        return dateString;

    }


    const year =
        Number(parts[0]);


    const month =
        Number(parts[1]) - 1;


    const day =
        Number(parts[2]);


    const date =
        new Date(
            year,
            month,
            day
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;

    }


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* =========================================================
   DEVICE OWNERSHIP
========================================================= */

function attendanceBelongsToCurrentDevice(
    attendance
) {

    if (!attendance) {

        return true;

    }


    if (!attendance.deviceId) {

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
   TIMESTAMP
========================================================= */

function getTimestampMillis(
    value
) {

    if (!value) {

        return 0;

    }


    if (
        typeof value.toMillis ===
        "function"
    ) {

        return value.toMillis();

    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate().getTime();

    }


    if (
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {

        return value.seconds * 1000;

    }


    if (
        value instanceof Date
    ) {

        return value.getTime();

    }


    if (
        typeof value === "string"
    ) {

        const parsed =
            new Date(value);


        return Number.isNaN(
            parsed.getTime()
        )
            ? 0
            : parsed.getTime();

    }


    return 0;

}


/* =========================================================
   FINAL LOG
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
    "📋 Leave system active."
);

console.log(
    "✅ Approved current leave blocks attendance."
);

console.log(
    "📅 Future approved leave supported."
);

console.log(
    "🔄 Staff switching supported."
);
