/* =========================================================
   VIRELLO TECHNOLOGIES
   SUPER ADMIN SYSTEM

   FILE:
   js/super-admin.js

   SUPER ADMIN:
   abdulrahmanjuniorsesay4@gmail.com
========================================================= */


/* =========================================================
   FIREBASE IMPORTS
========================================================= */

import {
    auth,
    db
} from "./firebase-config.js";


import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


import {
    collection,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   SUPER ADMIN EMAIL
========================================================= */

const SUPER_ADMIN_EMAIL =
    "abdulrahmanjuniorsesay4@gmail.com";


/* =========================================================
   ELEMENTS
========================================================= */

const adminEmail =
    document.getElementById("adminEmail");


const logoutButton =
    document.getElementById("logoutButton");


const adminMessage =
    document.getElementById("adminMessage");


const organizationsTable =
    document.getElementById("organizationsTable");


const organizationCount =
    document.getElementById("organizationCount");


const searchInput =
    document.getElementById("searchInput");


const statusFilter =
    document.getElementById("statusFilter");


const organizationModal =
    document.getElementById("organizationModal");


const organizationDetails =
    document.getElementById("organizationDetails");


const closeModal =
    document.getElementById("closeModal");


const cancelButton =
    document.getElementById("cancelButton");


const saveButton =
    document.getElementById("saveButton");


const editPlan =
    document.getElementById("editPlan");


const editStatus =
    document.getElementById("editStatus");


const editExpiry =
    document.getElementById("editExpiry");


const editPaymentMethod =
    document.getElementById("editPaymentMethod");


const editPaymentReference =
    document.getElementById("editPaymentReference");


/* =========================================================
   STATISTICS
========================================================= */

const totalOrganizations =
    document.getElementById("totalOrganizations");


const activeOrganizations =
    document.getElementById("activeOrganizations");


const pendingOrganizations =
    document.getElementById("pendingOrganizations");


const expiredOrganizations =
    document.getElementById("expiredOrganizations");


const suspendedOrganizations =
    document.getElementById("suspendedOrganizations");


/* =========================================================
   DATA
========================================================= */

let organizations = [];

let selectedOrganization = null;


/* =========================================================
   AUTHENTICATION
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        const email =
            (user.email || "")
                .toLowerCase()
                .trim();


        if (
            email !==
            SUPER_ADMIN_EMAIL.toLowerCase()
        ) {

            showMessage(
                "You are not authorized to access the Virello Technologies Super Admin Panel.",
                "error"
            );


            setTimeout(() => {

                window.location.href =
                    "index.html";

            }, 2500);

            return;

        }


        adminEmail.textContent =
            user.email;


        await loadOrganizations();

    }
);


/* =========================================================
   LOAD ORGANIZATIONS
========================================================= */

async function loadOrganizations() {

    organizationsTable.innerHTML = `

        <tr>

            <td
                colspan="7"
                class="loading"
            >
                Loading organizations...
            </td>

        </tr>

    `;


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "organizations"
                )
            );


        organizations = [];


        snapshot.forEach(
            (organizationDocument) => {

                organizations.push({

                    id:
                        organizationDocument.id,

                    ...organizationDocument.data()

                });

            }
        );


        /*
         =====================================================
         AUTOMATIC EXPIRY DETECTION
         =====================================================
        */

        await updateExpiredOrganizations();


        calculateStatistics();

        renderOrganizations();

    }

    catch (error) {

        console.error(
            "SUPER ADMIN LOAD ERROR:",
            error
        );


        showMessage(
            "Unable to load organizations. " +
            "Please check your Firestore security rules.",
            "error"
        );


        organizationsTable.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="empty"
                >
                    Unable to load organizations.
                </td>

            </tr>

        `;

    }

}


/* =========================================================
   AUTOMATIC EXPIRY
========================================================= */

async function updateExpiredOrganizations() {

    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    for (
        const organization
        of organizations
    ) {

        if (
            organization.status ===
            "active"
            &&
            organization.subscriptionExpiresAt
        ) {

            const expiryDate =
                convertFirestoreDate(
                    organization.subscriptionExpiresAt
                );


            if (
                expiryDate
                &&
                expiryDate < today
            ) {

                try {

                    await updateDoc(

                        doc(
                            db,
                            "organizations",
                            organization.id
                        ),

                        {

                            status:
                                "expired",

                            updatedAt:
                                serverTimestamp()

                        }

                    );


                    organization.status =
                        "expired";

                }

                catch (error) {

                    console.error(
                        "EXPIRY UPDATE ERROR:",
                        error
                    );

                }

            }

        }

    }

}


/* =========================================================
   STATISTICS
========================================================= */

function calculateStatistics() {

    let active = 0;

    let pending = 0;

    let expired = 0;

    let suspended = 0;


    organizations.forEach(
        organization => {

            switch (
                normalizeStatus(
                    organization.status
                )
            ) {

                case "active":
                    active++;
                    break;

                case "pending":
                    pending++;
                    break;

                case "expired":
                    expired++;
                    break;

                case "suspended":
                    suspended++;
                    break;

            }

        }
    );


    totalOrganizations.textContent =
        organizations.length;


    activeOrganizations.textContent =
        active;


    pendingOrganizations.textContent =
        pending;


    expiredOrganizations.textContent =
        expired;


    suspendedOrganizations.textContent =
        suspended;

}


/* =========================================================
   RENDER ORGANIZATIONS
========================================================= */

function renderOrganizations() {

    const search =
        searchInput.value
            .toLowerCase()
            .trim();


    const filter =
        statusFilter.value;


    const filtered =
        organizations.filter(
            organization => {

                const name =
                    String(
                        organization.organizationName || ""
                    ).toLowerCase();


                const admin =
                    String(
                        organization.adminName || ""
                    ).toLowerCase();


                const email =
                    String(
                        organization.adminEmail || ""
                    ).toLowerCase();


                const country =
                    String(
                        organization.country || ""
                    ).toLowerCase();


                const matchesSearch =
                    !search
                    ||
                    name.includes(search)
                    ||
                    admin.includes(search)
                    ||
                    email.includes(search)
                    ||
                    country.includes(search);


                const organizationStatus =
                    normalizeStatus(
                        organization.status
                    );


                const matchesFilter =
                    filter === "all"
                    ||
                    organizationStatus === filter;


                return (
                    matchesSearch
                    &&
                    matchesFilter
                );

            }
        );


    organizationCount.textContent =
        `${filtered.length} organization(s)`;


    if (!filtered.length) {

        organizationsTable.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="empty"
                >
                    No organizations found.
                </td>

            </tr>

        `;

        return;

    }


    organizationsTable.innerHTML =
        filtered.map(
            organization =>
                createOrganizationRow(
                    organization
                )
        ).join("");


    /*
     =====================================================
     ATTACH BUTTON EVENTS
     =====================================================
    */

    document
        .querySelectorAll(
            "[data-view-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openOrganization(
                        button.dataset.viewId
                    );

                }
            );

        });


    document
        .querySelectorAll(
            "[data-approve-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    approveOrganization(
                        button.dataset.approveId
                    );

                }
            );

        });


    document
        .querySelectorAll(
            "[data-suspend-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    suspendOrganization(
                        button.dataset.suspendId
                    );

                }
            );

        });


    document
        .querySelectorAll(
            "[data-activate-id]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    activateOrganization(
                        button.dataset.activateId
                    );

                }
            );

        });

}


/* =========================================================
   CREATE TABLE ROW
========================================================= */

function createOrganizationRow(
    organization
) {

    const status =
        normalizeStatus(
            organization.status
        );


    const statusClass =
        `status-${status || "none"}`;


    const statusText =
        capitalize(
            status || "none"
        );


    const plan =
        organization.subscriptionPlan
        ||
        "None";


    const expiry =
        formatDate(
            organization.subscriptionExpiresAt
        );


    let actionButtons = `

        <button
            class="action-button view-button"
            data-view-id="${organization.id}"
        >
            Manage
        </button>

    `;


    if (
        status === "pending"
        ||
        status === "expired"
    ) {

        actionButtons += `

            <button
                class="action-button approve-button"
                data-approve-id="${organization.id}"
            >
                Verify
            </button>

        `;

    }


    if (
        status === "active"
    ) {

        actionButtons += `

            <button
                class="action-button suspend-button"
                data-suspend-id="${organization.id}"
            >
                Suspend
            </button>

        `;

    }


    if (
        status === "suspended"
    ) {

        actionButtons += `

            <button
                class="action-button activate-button"
                data-activate-id="${organization.id}"
            >
                Reactivate
            </button>

        `;

    }


    return `

        <tr>

            <td>

                <div class="organization-name">

                    ${escapeHtml(
                        organization.organizationName
                        ||
                        "Unnamed Organization"
                    )}

                </div>

                <div class="organization-type">

                    ${escapeHtml(
                        organization.organizationType
                        ||
                        "Organization"
                    )}

                </div>

            </td>


            <td>

                <strong>

                    ${escapeHtml(
                        organization.adminName
                        ||
                        "Not provided"
                    )}

                </strong>

                <div class="organization-type">

                    ${escapeHtml(
                        organization.adminEmail
                        ||
                        ""
                    )}

                </div>

            </td>


            <td>

                ${escapeHtml(
                    organization.country
                    ||
                    "Not provided"
                )}

            </td>


            <td>

                <span class="plan-badge">

                    ${escapeHtml(
                        plan
                    )}

                </span>

            </td>


            <td>

                <span
                    class="status ${statusClass}"
                >

                    ${statusText}

                </span>

            </td>


            <td>

                ${expiry}

            </td>


            <td>

                <div class="action-buttons">

                    ${actionButtons}

                </div>

            </td>

        </tr>

    `;

}


/* =========================================================
   OPEN ORGANIZATION
========================================================= */

function openOrganization(
    organizationId
) {

    const organization =
        organizations.find(
            item =>
                item.id === organizationId
        );


    if (!organization) {

        return;

    }


    selectedOrganization =
        organization;


    const status =
        normalizeStatus(
            organization.status
        );


    organizationDetails.innerHTML = `

        <div class="detail-grid">


            <div class="detail full">

                <div class="detail-label">
                    Organization
                </div>

                <div class="detail-value">
                    ${escapeHtml(
                        organization.organizationName
                        ||
                        "Not provided"
                    )}
                </div>

            </div>


            <div class="detail">

                <div class="detail-label">
                    Organization Type
                </div>

                <div class="detail-value">
                    ${escapeHtml(
                        organization.organizationType
                        ||
                        "Not provided"
                    )}
                </div>

            </div>


            <div class="detail">

                <div class="detail-label">
                    Country
                </div>

                <div class="detail-value">
                    ${escapeHtml(
                        organization.country
                        ||
                        "Not provided"
                    )}
                </div>

            </div>


            <div class="detail">

                <div class="detail-label">
                    Administrator
                </div>

                <div class="detail-value">
                    ${escapeHtml(
                        organization.adminName
                        ||
                        "Not provided"
                    )}
                </div>

            </div>


            <div class="detail">

                <div class="detail-label">
                    Administrator Email
                </div>

                <div class="detail-value">
                    ${escapeHtml(
                        organization.adminEmail
                        ||
                        "Not provided"
                    )}
                </div>

            </div>


            <div class="detail">

                <div class="detail-label">
                    Current Plan
                </div>

                <div class="detail-value">
                    ${escapeHtml(
                        organization.subscriptionPlan
                        ||
                        "None"
                    )}
                </div>

            </div>


            <div class="detail">

                <div class="detail-label">
                    Current Status
                </div>

                <div class="detail-value">
                    ${capitalize(
                        status || "none"
                    )}
                </div>

            </div>


            <div class="detail">

                <div class="detail-label">
                    Payment Method
                </div>

                <div class="detail-value">
                    ${escapeHtml(
                        organization.paymentMethod
                        ||
                        "Not recorded"
                    )}
                </div>

            </div>


            <div class="detail full">

                <div class="detail-label">
                    Payment Reference
                </div>

                <div class="detail-value">
                    ${escapeHtml(
                        organization.paymentReference
                        ||
                        "Not recorded"
                    )}
                </div>

            </div>


            <div class="detail">

                <div class="detail-label">
                    Subscription Expiry
                </div>

                <div class="detail-value">
                    ${formatDate(
                        organization.subscriptionExpiresAt
                    )}
                </div>

            </div>


            <div class="detail">

                <div class="detail-label">
                    Organization ID
                </div>

                <div class="detail-value">
                    ${escapeHtml(
                        organization.id
                    )}
                </div>

            </div>


        </div>

    `;


    editPlan.value =
        organization.subscriptionPlan
        ||
        "none";


    editStatus.value =
        status
        ||
        "pending";


    editExpiry.value =
        getDateInputValue(
            organization.subscriptionExpiresAt
        );


    editPaymentMethod.value =
        organization.paymentMethod
        ||
        "";


    editPaymentReference.value =
        organization.paymentReference
        ||
        "";


    organizationModal.classList.add(
        "show"
    );

}


/* =========================================================
   APPROVE PAYMENT
========================================================= */

async function approveOrganization(
    organizationId
) {

    const organization =
        organizations.find(
            item =>
                item.id === organizationId
        );


    if (!organization) {

        return;

    }


    const plan =
        organization.subscriptionPlan
        &&
        organization.subscriptionPlan !== "none"
            ? organization.subscriptionPlan
            : "Professional";


    const confirmed =
        confirm(
            `Approve/activate ${organization.organizationName}?\n\n` +
            `Plan: ${plan}\n\n` +
            `This will change the organization status to ACTIVE.`
        );


    if (!confirmed) {

        return;

    }


    try {

        await updateDoc(

            doc(
                db,
                "organizations",
                organizationId
            ),

            {

                status:
                    "active",

                subscriptionPlan:
                    plan,

                paymentStatus:
                    "verified",

                paymentVerified:
                    true,

                paymentVerifiedBy:
                    SUPER_ADMIN_EMAIL,

                paymentVerifiedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }

        );


        organization.status =
            "active";


        organization.subscriptionPlan =
            plan;


        organization.paymentStatus =
            "verified";


        organization.paymentVerified =
            true;


        calculateStatistics();

        renderOrganizations();


        showMessage(
            "Payment verified and organization activated successfully.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "APPROVAL ERROR:",
            error
        );


        showMessage(
            "Unable to activate organization. Please check your Firestore rules.",
            "error"
        );

    }

}


/* =========================================================
   SUSPEND
========================================================= */

async function suspendOrganization(
    organizationId
) {

    const organization =
        organizations.find(
            item =>
                item.id === organizationId
        );


    if (!organization) {

        return;

    }


    const confirmed =
        confirm(
            `Suspend ${organization.organizationName}?\n\n` +
            `The organization will no longer have active subscription status.`
        );


    if (!confirmed) {

        return;

    }


    try {

        await updateDoc(

            doc(
                db,
                "organizations",
                organizationId
            ),

            {

                status:
                    "suspended",

                suspendedBy:
                    SUPER_ADMIN_EMAIL,

                suspendedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }

        );


        organization.status =
            "suspended";


        calculateStatistics();

        renderOrganizations();


        showMessage(
            "Organization suspended successfully.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "SUSPEND ERROR:",
            error
        );


        showMessage(
            "Unable to suspend organization.",
            "error"
        );

    }

}


/* =========================================================
   REACTIVATE
========================================================= */

async function activateOrganization(
    organizationId
) {

    const organization =
        organizations.find(
            item =>
                item.id === organizationId
        );


    if (!organization) {

        return;

    }


    const confirmed =
        confirm(
            `Reactivate ${organization.organizationName}?`
        );


    if (!confirmed) {

        return;

    }


    try {

        await updateDoc(

            doc(
                db,
                "organizations",
                organizationId
            ),

            {

                status:
                    "active",

                paymentStatus:
                    "verified",

                paymentVerified:
                    true,

                paymentVerifiedBy:
                    SUPER_ADMIN_EMAIL,

                paymentVerifiedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }

        );


        organization.status =
            "active";


        organization.paymentStatus =
            "verified";


        calculateStatistics();

        renderOrganizations();


        showMessage(
            "Organization reactivated successfully.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "REACTIVATE ERROR:",
            error
        );


        showMessage(
            "Unable to reactivate organization.",
            "error"
        );

    }

}


/* =========================================================
   SAVE ORGANIZATION
========================================================= */

saveButton.addEventListener(
    "click",
    async () => {

        if (
            !selectedOrganization
        ) {

            return;

        }


        saveButton.disabled =
            true;


        saveButton.textContent =
            "Saving...";


        try {

            const expiryValue =
                editExpiry.value;


            let expiryTimestamp =
                null;


            if (expiryValue) {

                const expiryDate =
                    new Date(
                        expiryValue +
                        "T23:59:59"
                    );


                expiryTimestamp =
                    expiryDate;

            }


            const changes = {

                subscriptionPlan:
                    editPlan.value,

                status:
                    editStatus.value,

                paymentMethod:
                    editPaymentMethod.value
                    ||
                    null,

                paymentReference:
                    editPaymentReference.value
                        .trim()
                    ||
                    null,

                subscriptionExpiresAt:
                    expiryTimestamp,

                updatedAt:
                    serverTimestamp()

            };


            /*
             =================================================
             IF ADMIN SELECTS ACTIVE
             =================================================
            */

            if (
                editStatus.value ===
                "active"
            ) {

                changes.paymentStatus =
                    "verified";

                changes.paymentVerified =
                    true;

                changes.paymentVerifiedBy =
                    SUPER_ADMIN_EMAIL;

                changes.paymentVerifiedAt =
                    serverTimestamp();

            }


            await updateDoc(

                doc(
                    db,
                    "organizations",
                    selectedOrganization.id
                ),

                changes

            );


            /*
             =================================================
             UPDATE LOCAL DATA
             =================================================
            */

            selectedOrganization.subscriptionPlan =
                editPlan.value;


            selectedOrganization.status =
                editStatus.value;


            selectedOrganization.paymentMethod =
                editPaymentMethod.value;


            selectedOrganization.paymentReference =
                editPaymentReference.value;


            selectedOrganization.subscriptionExpiresAt =
                expiryTimestamp;


            calculateStatistics();

            renderOrganizations();


            closeOrganizationModal();


            showMessage(
                "Organization subscription and access settings updated successfully.",
                "success"
            );

        }

        catch (error) {

            console.error(
                "SAVE ERROR:",
                error
            );


            showMessage(
                "Unable to save changes. Please check your Firestore rules.",
                "error"
            );

        }


        finally {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save Changes";

        }

    }
);


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeOrganizationModal() {

    organizationModal.classList.remove(
        "show"
    );

    selectedOrganization =
        null;

}


closeModal.addEventListener(
    "click",
    closeOrganizationModal
);


cancelButton.addEventListener(
    "click",
    closeOrganizationModal
);


organizationModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            organizationModal
        ) {

            closeOrganizationModal();

        }

    }
);


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
    "input",
    renderOrganizations
);


statusFilter.addEventListener(
    "change",
    renderOrganizations
);


/* =========================================================
   LOGOUT
========================================================= */

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(auth);

            window.location.href =
                "login.html";

        }

        catch (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );

        }

    }
);


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    text,
    type
) {

    adminMessage.textContent =
        text;

    adminMessage.className =
        type;


    setTimeout(
        () => {

            adminMessage.style.display =
                "none";

        },
        5000
    );

}


/* =========================================================
   STATUS NORMALIZER
========================================================= */

function normalizeStatus(
    status
) {

    return String(
        status || ""
    )
        .toLowerCase()
        .trim();

}


/* =========================================================
   CAPITALIZE
========================================================= */

function capitalize(
    text
) {

    if (!text) {

        return "";

    }


    return text
        .charAt(0)
        .toUpperCase()
        +
        text.slice(1);

}


/* =========================================================
   FIRESTORE DATE CONVERSION
========================================================= */

function convertFirestoreDate(
    value
) {

    if (!value) {

        return null;

    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        return value.toDate();

    }


    if (
        value instanceof Date
    ) {

        return value;

    }


    if (
        typeof value === "string"
    ) {

        const date =
            new Date(value);


        if (
            !isNaN(
                date.getTime()
            )
        ) {

            return date;

        }

    }


    return null;

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    value
) {

    const date =
        convertFirestoreDate(
            value
        );


    if (!date) {

        return "Not set";

    }


    return date.toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


/* =========================================================
   DATE INPUT
========================================================= */

function getDateInputValue(
    value
) {

    const date =
        convertFirestoreDate(
            value
        );


    if (!date) {

        return "";

    }


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


    return `${year}-${month}-${day}`;

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(
    value
) {

    return String(
        value || ""
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
   CONSOLE
========================================================= */

console.log(
    "🔥 Virello Super Admin initialized."
);
