/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/leave-management.js

   PURPOSE:
   Complete Leave Management

   FEATURES:
   - Administrator authentication
   - Load organization
   - Load active staff
   - Create leave requests
   - View leave requests
   - Approve leave
   - Reject leave
   - Leave statistics
   - Organization-based Firestore queries
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
    addDoc,
    updateDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


import {
    auth,
    db
} from "./firebase-config.js";


/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let currentOrganization = null;

let staffMembers = [];

let leaveRequests = [];


/* =========================================================
   DOM
========================================================= */

const loadingScreen =
    document.getElementById("loadingScreen");


const errorMessage =
    document.getElementById("errorMessage");


const adminName =
    document.getElementById("adminName");


const logoutButton =
    document.getElementById("logoutButton");


const leaveForm =
    document.getElementById("leaveForm");


const staffSelect =
    document.getElementById("staffSelect");


const leaveType =
    document.getElementById("leaveType");


const startDate =
    document.getElementById("startDate");


const endDate =
    document.getElementById("endDate");


const reason =
    document.getElementById("reason");


const submitLeaveButton =
    document.getElementById("submitLeaveButton");


const leaveTableBody =
    document.getElementById("leaveTableBody");


const emptyState =
    document.getElementById("emptyState");


const totalRequests =
    document.getElementById("totalRequests");


const pendingRequests =
    document.getElementById("pendingRequests");


const approvedRequests =
    document.getElementById("approvedRequests");


const rejectedRequests =
    document.getElementById("rejectedRequests");


/* =========================================================
   START
========================================================= */

console.log(
    "🔥 Virello Leave Management loaded."
);


document.addEventListener(
    "DOMContentLoaded",
    () => {

        startLeaveManagement();

    }
);


/* =========================================================
   START SYSTEM
========================================================= */

function startLeaveManagement() {

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


                await loadOrganization();


                if (!currentOrganization) {

                    return;

                }


                displayAdmin();


                await loadStaff();


                await loadLeaveRequests();


                populateStaffSelect();


                renderLeaveRequests();


                updateStatistics();


                hideLoading();


                console.log(
                    "✅ Leave Management ready."
                );

            }

            catch (error) {

                console.error(
                    "❌ Leave Management initialization error:",
                    error
                );


                showError(
                    error.message ||
                    "Unable to load Leave Management."
                );

            }

        }
    );

}


/* =========================================================
   LOAD ORGANIZATION
========================================================= */

async function loadOrganization() {

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
        "✅ Organization:",
        currentOrganization
    );

}


/* =========================================================
   DISPLAY ADMIN
========================================================= */

function displayAdmin() {

    if (!adminName) {

        return;

    }


    adminName.textContent =

        currentOrganization.adminName ||

        currentOrganization.ownerName ||

        currentUser.displayName ||

        currentUser.email ||

        "Administrator";

}


/* =========================================================
   LOAD STAFF
========================================================= */

async function loadStaff() {

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


            const status =
                String(
                    data.status ||
                    "active"
                ).toLowerCase();


            if (
                status !== "inactive"
            ) {

                staffMembers.push({

                    id:
                        staffDocument.id,

                    ...data

                });

            }

        }
    );


    console.log(
        "👥 Staff loaded:",
        staffMembers.length
    );

}


/* =========================================================
   POPULATE STAFF
========================================================= */

function populateStaffSelect() {

    if (!staffSelect) {

        return;

    }


    staffSelect.innerHTML = `

        <option value="">
            Select staff member
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
                getStaffName(staff);


            staffSelect.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   LOAD LEAVE REQUESTS
========================================================= */

async function loadLeaveRequests() {

    const leaveRef =
        collection(
            db,
            "leaveRequests"
        );


    const leaveQuery =
        query(

            leaveRef,

            where(
                "organizationId",
                "==",
                currentOrganization.id
            )

        );


    const snapshot =
        await getDocs(
            leaveQuery
        );


    leaveRequests = [];


    snapshot.forEach(
        leaveDocument => {

            leaveRequests.push({

                id:
                    leaveDocument.id,

                ...leaveDocument.data()

            });

        }
    );


    leaveRequests.sort(
        (a, b) => {

            const aTime =
                getTimestampMillis(
                    a.createdAt
                );


            const bTime =
                getTimestampMillis(
                    b.createdAt
                );


            return bTime - aTime;

        }
    );


    console.log(
        "📋 Leave requests:",
        leaveRequests
    );

}


/* =========================================================
   SUBMIT LEAVE REQUEST
========================================================= */

if (leaveForm) {

    leaveForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                if (!currentOrganization) {

                    throw new Error(
                        "Organization information is unavailable."
                    );

                }


                const staffId =
                    staffSelect.value;


                const selectedLeaveType =
                    leaveType.value;


                const selectedStartDate =
                    startDate.value;


                const selectedEndDate =
                    endDate.value;


                const selectedReason =
                    reason.value.trim();


                if (!staffId) {

                    throw new Error(
                        "Please select a staff member."
                    );

                }


                if (!selectedLeaveType) {

                    throw new Error(
                        "Please select a leave type."
                    );

                }


                if (!selectedStartDate) {

                    throw new Error(
                        "Please select the start date."
                    );

                }


                if (!selectedEndDate) {

                    throw new Error(
                        "Please select the end date."
                    );

                }


                if (
                    selectedEndDate <
                    selectedStartDate
                ) {

                    throw new Error(
                        "End date cannot be before start date."
                    );

                }


                if (!selectedReason) {

                    throw new Error(
                        "Please enter a reason."
                    );

                }


                const staff =
                    staffMembers.find(
                        item =>
                            item.id ===
                            staffId
                    );


                if (!staff) {

                    throw new Error(
                        "Selected staff member could not be found."
                    );

                }


                submitLeaveButton.disabled =
                    true;


                submitLeaveButton.textContent =
                    "Submitting...";


                const leaveData = {

                    organizationId:
                        currentOrganization.id,

                    staffDocumentId:
                        staffId,

                    staffId:
                        staff.staffId ||
                        staff.employeeId ||
                        staffId,

                    staffName:
                        getStaffName(staff),

                    staffEmail:
                        staff.email ||
                        staff.emailAddress ||
                        "",

                    leaveType:
                        selectedLeaveType,

                    startDate:
                        selectedStartDate,

                    endDate:
                        selectedEndDate,

                    reason:
                        selectedReason,

                    status:
                        "pending",

                    requestedBy:
                        currentUser.uid,

                    requestedByEmail:
                        currentUser.email ||
                        "",

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                };


                await addDoc(

                    collection(
                        db,
                        "leaveRequests"
                    ),

                    leaveData

                );


                alert(
                    "Leave request submitted successfully."
                );


                leaveForm.reset();


                await loadLeaveRequests();


                renderLeaveRequests();


                updateStatistics();

            }

            catch (error) {

                console.error(
                    "❌ Leave submission failed:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to submit leave request."
                );

            }

            finally {

                submitLeaveButton.disabled =
                    false;


                submitLeaveButton.textContent =
                    "Submit Leave Request";

            }

        }
    );

}


/* =========================================================
   RENDER REQUESTS
========================================================= */

function renderLeaveRequests() {

    if (!leaveTableBody) {

        return;

    }


    leaveTableBody.innerHTML =
        "";


    if (!leaveRequests.length) {

        if (emptyState) {

            emptyState.style.display =
                "block";

        }

        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    leaveRequests.forEach(
        request => {

            const row =
                document.createElement(
                    "tr"
                );


            const status =
                String(
                    request.status ||
                    "pending"
                ).toLowerCase();


            row.innerHTML = `

                <td>

                    <div class="employee-name">
                        ${escapeHtml(
                            request.staffName ||
                            "Unknown Staff"
                        )}
                    </div>

                    <div class="employee-email">
                        ${escapeHtml(
                            request.staffEmail ||
                            ""
                        )}
                    </div>

                </td>


                <td>
                    ${escapeHtml(
                        request.leaveType ||
                        "Leave"
                    )}
                </td>


                <td>

                    ${escapeHtml(
                        request.startDate ||
                        "—"
                    )}

                    <br>

                    to

                    <br>

                    ${escapeHtml(
                        request.endDate ||
                        "—"
                    )}

                </td>


                <td>

                    ${escapeHtml(
                        request.reason ||
                        "—"
                    )}

                </td>


                <td>

                    ${getStatusBadge(
                        status
                    )}

                </td>


                <td>

                    ${getRequestActions(
                        request,
                        status
                    )}

                </td>

            `;


            leaveTableBody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   STATUS BADGE
========================================================= */

function getStatusBadge(
    status
) {

    if (
        status === "approved"
    ) {

        return `

            <span class="status status-approved">
                Approved
            </span>

        `;

    }


    if (
        status === "rejected"
    ) {

        return `

            <span class="status status-rejected">
                Rejected
            </span>

        `;

    }


    return `

        <span class="status status-pending">
            Pending
        </span>

    `;

}


/* =========================================================
   REQUEST ACTIONS
========================================================= */

function getRequestActions(
    request,
    status
) {

    if (
        status !== "pending"
    ) {

        return `
            <span style="color:#94a3b8;">
                —
            </span>
        `;

    }


    return `

        <div class="action-buttons">

            <button
                type="button"
                class="approve-button"
                data-action="approve"
                data-id="${escapeHtml(
                    request.id
                )}"
            >
                Approve
            </button>


            <button
                type="button"
                class="reject-button"
                data-action="reject"
                data-id="${escapeHtml(
                    request.id
                )}"
            >
                Reject
            </button>

        </div>

    `;

}


/* =========================================================
   APPROVE / REJECT EVENTS
========================================================= */

if (leaveTableBody) {

    leaveTableBody.addEventListener(
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


            const requestId =
                button.dataset.id;


            if (!requestId) {

                return;

            }


            const request =
                leaveRequests.find(
                    item =>
                        item.id ===
                        requestId
                );


            if (!request) {

                alert(
                    "Leave request could not be found."
                );

                return;

            }


            let newStatus = "";


            if (
                action === "approve"
            ) {

                const confirmed =
                    confirm(
                        `Approve leave for ${request.staffName || "this staff member"}?`
                    );


                if (!confirmed) {

                    return;

                }


                newStatus =
                    "approved";

            }


            if (
                action === "reject"
            ) {

                const confirmed =
                    confirm(
                        `Reject leave for ${request.staffName || "this staff member"}?`
                    );


                if (!confirmed) {

                    return;

                }


                newStatus =
                    "rejected";

            }


            if (!newStatus) {

                return;

            }


            try {

                button.disabled =
                    true;


                const requestRef =
                    doc(
                        db,
                        "leaveRequests",
                        requestId
                    );


                await updateDoc(
                    requestRef,
                    {

                        status:
                            newStatus,

                        reviewedBy:
                            currentUser.uid,

                        reviewedByEmail:
                            currentUser.email ||
                            "",

                        reviewedAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()

                    }
                );


                await loadLeaveRequests();


                renderLeaveRequests();


                updateStatistics();


                alert(
                    newStatus === "approved"
                        ? "Leave request approved."
                        : "Leave request rejected."
                );

            }

            catch (error) {

                console.error(
                    "❌ Leave review failed:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to update leave request."
                );


                button.disabled =
                    false;

            }

        }
    );

}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {

    const total =
        leaveRequests.length;


    let pending =
        0;


    let approved =
        0;


    let rejected =
        0;


    leaveRequests.forEach(
        request => {

            const status =
                String(
                    request.status ||
                    "pending"
                ).toLowerCase();


            if (
                status === "pending"
            ) {

                pending++;

            }


            if (
                status === "approved"
            ) {

                approved++;

            }


            if (
                status === "rejected"
            ) {

                rejected++;

            }

        }
    );


    if (totalRequests) {

        totalRequests.textContent =
            total;

    }


    if (pendingRequests) {

        pendingRequests.textContent =
            pending;

    }


    if (approvedRequests) {

        approvedRequests.textContent =
            approved;

    }


    if (rejectedRequests) {

        rejectedRequests.textContent =
            rejected;

    }

}


/* =========================================================
   STAFF NAME
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

        return (
            value.seconds *
            1000
        );

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

            }

        }
    );

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


    if (errorMessage) {

        errorMessage.style.display =
            "block";


        errorMessage.textContent =
            message;

    }

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
   FINAL
========================================================= */

console.log(
    "✅ Virello Leave Management complete."
);
