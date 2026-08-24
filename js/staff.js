/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/staff.js

   STEP:
   1I-9

   PURPOSE:
   COMPLETE STAFF MANAGEMENT SYSTEM

   IMPORTANT:
   This version keeps your existing Firebase structure.
   It does NOT require changes to staff.html.
========================================================= */


/* =========================================================
   FIREBASE AUTH
========================================================= */

import {
    getAuth,
    onAuthStateChanged,
    signOut
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
    deleteDoc,
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

let currentUser = null;
let currentOrganization = null;
let staffMembers = [];
let currentManagingStaff = null;


/* =========================================================
   DOM
========================================================= */

const loadingScreen =
    document.getElementById("loadingScreen");

const errorScreen =
    document.getElementById("errorScreen");

const errorMessage =
    document.getElementById("errorMessage");

const addStaffModal =
    document.getElementById("addStaffModal");

const addStaffButton =
    document.getElementById("addStaffButton");

const emptyAddButton =
    document.getElementById("emptyAddButton");

const closeModalButton =
    document.getElementById("closeModalButton");

const cancelStaffButton =
    document.getElementById("cancelStaffButton");

const addStaffForm =
    document.getElementById("addStaffForm");

const staffFormMessage =
    document.getElementById("staffFormMessage");

const saveStaffButton =
    document.getElementById("saveStaffButton");

const logoutButton =
    document.getElementById("logoutButton");


/* =========================================================
   START
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    console.log(
        "🔥 Virello Staff Management starting..."
    );

    createManageStaffModal();

    initializeStaffPage();

});


/* =========================================================
   AUTHENTICATION
========================================================= */

function initializeStaffPage() {

    console.log(
        "🔐 Checking authentication..."
    );

    onAuthStateChanged(auth, async (user) => {

        try {

            if (!user) {

                console.log(
                    "⚠️ No authenticated user."
                );

                window.location.href =
                    "login.html";

                return;
            }


            currentUser = user;


            console.log(
                "✅ Staff manager authenticated:",
                user.email
            );


            await loadOrganization();


            if (!currentOrganization) {
                return;
            }


            await loadStaff();


            hideLoading();


        } catch (error) {

            console.error(
                "❌ Staff page initialization error:",
                error
            );

            showError(
                error.message ||
                "Unable to load staff management."
            );

        }

    });

}


/* =========================================================
   LOAD ORGANIZATION
========================================================= */

async function loadOrganization() {

    console.log(
        "🏢 Loading organization..."
    );


    const organizationsRef =
        collection(db, "organizations");


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

        console.log(
            "⚠️ Organization not found."
        );

        showError(
            "Your organization account could not be found. Please complete registration first."
        );

        return;
    }


    const organizationDoc =
        snapshot.docs[0];


    currentOrganization = {

        id: organizationDoc.id,

        ...organizationDoc.data()

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


    const organizationName =
        currentOrganization.organizationName ||
        currentOrganization.name ||
        "Organization";


    const organizationType =
        currentOrganization.organizationType ||
        currentOrganization.type ||
        "Organization";


    const administrator =
        currentOrganization.adminName ||
        currentOrganization.ownerName ||
        currentOrganization.fullName ||
        currentUser.displayName ||
        currentUser.email ||
        "Administrator";


    document
        .querySelectorAll("#organizationName")
        .forEach(element => {

            element.textContent =
                organizationName;

        });


    document
        .querySelectorAll("#organizationNameCard")
        .forEach(element => {

            element.textContent =
                organizationName;

        });


    document
        .querySelectorAll("#organizationType")
        .forEach(element => {

            element.textContent =
                organizationType;

        });


    document
        .querySelectorAll("#organizationTypeCard")
        .forEach(element => {

            element.textContent =
                organizationType;

        });


    const adminName =
        document.getElementById("adminName");


    if (adminName) {

        adminName.textContent =
            administrator;

    }

}


/* =========================================================
   LOAD STAFF
========================================================= */

async function loadStaff() {

    console.log(
        "👥 Loading staff members..."
    );


    if (!currentOrganization) {

        console.log(
            "⚠️ No organization available."
        );

        return;
    }


    const staffRef =
        collection(db, "staff");


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
        await getDocs(staffQuery);


    staffMembers = [];


    snapshot.forEach(documentSnapshot => {

        staffMembers.push({

            id:
                documentSnapshot.id,

            ...documentSnapshot.data()

        });

    });


    console.log(
        "✅ Staff loaded:",
        staffMembers
    );


    updateStatistics();

    displayStaff();

}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {

    const totalStaff =
        document.getElementById("totalStaff");

    const activeStaff =
        document.getElementById("activeStaff");

    const inactiveStaff =
        document.getElementById("inactiveStaff");


    const total =
        staffMembers.length;


    const active =
        staffMembers.filter(
            staff =>
                staff.status === "active"
        ).length;


    const inactive =
        staffMembers.filter(
            staff =>
                staff.status !== "active"
        ).length;


    if (totalStaff) {
        totalStaff.textContent = total;
    }


    if (activeStaff) {
        activeStaff.textContent = active;
    }


    if (inactiveStaff) {
        inactiveStaff.textContent = inactive;
    }

}


/* =========================================================
   DISPLAY STAFF TABLE
========================================================= */

function displayStaff() {

    const emptyState =
        document.getElementById("emptyState");

    const tableContainer =
        document.getElementById("staffTableContainer");

    const tableBody =
        document.getElementById("staffTableBody");


    if (
        !emptyState ||
        !tableContainer ||
        !tableBody
    ) {

        console.error(
            "❌ Staff table elements not found."
        );

        return;
    }


    tableBody.innerHTML = "";


    if (staffMembers.length === 0) {

        emptyState.style.display = "block";

        tableContainer.style.display = "none";

        return;
    }


    emptyState.style.display = "none";

    tableContainer.style.display = "block";


    staffMembers.forEach(staff => {

        const row =
            document.createElement("tr");


        const fullName =
            staff.fullName ||
            staff.name ||
            "Unknown Staff";


        const initials =
            getInitials(fullName);


        const staffId =
            staff.staffId || "—";


        const position =
            staff.position || "—";


        const department =
            staff.department || "—";


        const status =
            staff.status || "active";


        const email =
            staff.email || "";


        row.innerHTML = `

            <td>

                <div class="staff-person">

                    <div class="staff-avatar">
                        ${escapeHtml(initials)}
                    </div>

                    <div>

                        <div class="staff-person-name">
                            ${escapeHtml(fullName)}
                        </div>

                        <div class="staff-person-email">
                            ${escapeHtml(email)}
                        </div>

                    </div>

                </div>

            </td>


            <td>
                ${escapeHtml(staffId)}
            </td>


            <td>
                ${escapeHtml(position)}
            </td>


            <td>
                ${escapeHtml(department)}
            </td>


            <td>

                <span
                    class="status-badge ${
                        status === "active"
                            ? "status-active"
                            : "status-inactive"
                    }"
                >

                    ${
                        status === "active"
                            ? "Active"
                            : "Inactive"
                    }

                </span>

            </td>


            <td>

                <div class="action-buttons">

                    <button
                        type="button"
                        class="action-button edit-button"
                        data-manage-id="${escapeHtml(staff.id)}"
                    >
                        Manage
                    </button>

                </div>

            </td>

        `;


        tableBody.appendChild(row);

    });


    tableBody
        .querySelectorAll("[data-manage-id]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const staffDocumentId =
                        button.dataset.manageId;

                    openManageStaffModal(
                        staffDocumentId
                    );

                }
            );

        });

}


/* =========================================================
   INITIALS
========================================================= */

function getInitials(name) {

    if (!name) {
        return "ST";
    }


    const parts =
        String(name)
            .trim()
            .split(/\s+/);


    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();

}


/* =========================================================
   ADD STAFF MODAL
========================================================= */

function openAddStaffModal() {

    if (!addStaffModal) {

        console.error(
            "❌ Add Staff modal not found."
        );

        return;
    }


    addStaffModal.classList.add("show");

    clearFormMessage();


    setTimeout(() => {

        const input =
            document.getElementById(
                "staffFullName"
            );


        if (input) {
            input.focus();
        }

    }, 100);

}


function closeAddStaffModal() {

    if (!addStaffModal) {
        return;
    }


    addStaffModal.classList.remove("show");

    clearFormMessage();


    if (addStaffForm) {
        addStaffForm.reset();
    }

}


/* =========================================================
   FORM MESSAGES
========================================================= */

function clearFormMessage() {

    if (!staffFormMessage) {
        return;
    }


    staffFormMessage.textContent = "";

    staffFormMessage.className =
        "form-message";

}


function showFormMessage(message, type) {

    if (!staffFormMessage) {
        return;
    }


    staffFormMessage.textContent =
        message;


    staffFormMessage.className =
        "form-message show " + type;

}


/* =========================================================
   SAVE NEW STAFF
========================================================= */

async function saveStaffToFirestore(staffData) {

    if (!currentUser) {

        throw new Error(
            "You are not authenticated."
        );

    }


    if (!currentOrganization) {

        throw new Error(
            "Organization information is not available."
        );

    }


    const finalStaffData = {

        fullName:
            staffData.fullName,

        staffId:
            staffData.staffId,

        position:
            staffData.position,

        department:
            staffData.department,

        email:
            staffData.email,

        phone:
            staffData.phone,

        employmentType:
            staffData.employmentType,

        status:
            staffData.status || "active",

        organizationId:
            currentOrganization.id,

        createdBy:
            currentUser.uid,

        createdAt:
            serverTimestamp()

    };


    const staffRef =
        collection(db, "staff");


    const newStaff =
        await addDoc(
            staffRef,
            finalStaffData
        );


    console.log(
        "✅ Staff successfully saved:",
        newStaff.id
    );


    return newStaff.id;

}


/* =========================================================
   ADD STAFF FORM
========================================================= */

if (addStaffForm) {

    addStaffForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!currentUser) {

                showFormMessage(
                    "You are not authenticated.",
                    "error"
                );

                return;
            }


            if (!currentOrganization) {

                showFormMessage(
                    "Organization information is not available.",
                    "error"
                );

                return;
            }


            const fullName =
                getElementValue("staffFullName");


            const staffId =
                getElementValue("staffId");


            const position =
                getElementValue("staffPosition");


            const department =
                getElementValue("staffDepartment");


            const email =
                getElementValue("staffEmail");


            const phone =
                getElementValue("staffPhone");


            const employmentType =
                getElementValue("employmentType");


            const status =
                getElementValue("staffStatus") ||
                "active";


            if (!fullName) {

                showFormMessage(
                    "Please enter the staff member's full name.",
                    "error"
                );

                return;
            }


            if (!staffId) {

                showFormMessage(
                    "Please enter a Staff ID.",
                    "error"
                );

                return;
            }


            if (!position) {

                showFormMessage(
                    "Please enter the staff member's position.",
                    "error"
                );

                return;
            }


            if (!employmentType) {

                showFormMessage(
                    "Please select the employment type.",
                    "error"
                );

                return;
            }


            const duplicate =
                staffMembers.find(
                    staff =>
                        String(
                            staff.staffId || ""
                        ).toLowerCase() ===
                        staffId.toLowerCase()
                );


            if (duplicate) {

                showFormMessage(
                    "A staff member with this Staff ID already exists.",
                    "error"
                );

                return;
            }


            if (saveStaffButton) {

                saveStaffButton.disabled = true;

                saveStaffButton.textContent =
                    "Saving...";

            }


            clearFormMessage();


            try {

                await saveStaffToFirestore({

                    fullName,
                    staffId,
                    position,
                    department,
                    email,
                    phone,
                    employmentType,
                    status

                });


                showFormMessage(
                    "Staff member added successfully!",
                    "success"
                );


                await loadStaff();


                setTimeout(() => {

                    closeAddStaffModal();

                }, 800);


            } catch (error) {

                console.error(
                    "❌ Error saving staff:",
                    error
                );


                showFormMessage(
                    error.message ||
                    "Unable to save staff member.",
                    "error"
                );


            } finally {

                if (saveStaffButton) {

                    saveStaffButton.disabled =
                        false;

                    saveStaffButton.textContent =
                        "Add Staff";

                }

            }

        }
    );

}


/* =========================================================
   GET ELEMENT VALUE
========================================================= */

function getElementValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return "";
    }


    return String(
        element.value || ""
    ).trim();

}


/* =========================================================
   CREATE MANAGE MODAL
========================================================= */

function createManageStaffModal() {

    if (
        document.getElementById(
            "manageStaffModal"
        )
    ) {
        return;
    }


    const modal =
        document.createElement("div");


    modal.id =
        "manageStaffModal";


    modal.innerHTML = `

        <div class="virello-manage-backdrop">

            <div
                class="virello-manage-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="manageStaffName"
            >

                <!-- HEADER -->

                <div class="virello-manage-header">

                    <div class="virello-profile">

                        <div
                            id="manageStaffAvatar"
                            class="virello-profile-avatar"
                        >
                            ST
                        </div>

                        <div class="virello-profile-info">

                            <div
                                id="manageStaffName"
                                class="virello-profile-name"
                            >
                                Staff Member
                            </div>

                            <div
                                id="manageStaffSubtitle"
                                class="virello-profile-role"
                            >
                                Staff information
                            </div>

                        </div>

                    </div>


                    <button
                        type="button"
                        id="closeManageStaffModal"
                        class="virello-modal-close"
                        aria-label="Close"
                    >
                        ×
                    </button>

                </div>


                <!-- MESSAGE -->

                <div
                    id="manageStaffMessage"
                    class="virello-manage-message"
                ></div>


                <!-- FORM -->

                <form
                    id="manageStaffForm"
                    class="virello-manage-form"
                >

                    <div class="virello-section-title">
                        Personal Information
                    </div>


                    <div class="virello-form-grid">

                        <div class="virello-field">

                            <label>
                                Full Name
                            </label>

                            <input
                                type="text"
                                id="manageFullName"
                                required
                            >

                        </div>


                        <div class="virello-field">

                            <label>
                                Staff ID
                            </label>

                            <input
                                type="text"
                                id="manageStaffId"
                                required
                            >

                        </div>


                        <div class="virello-field">

                            <label>
                                Position
                            </label>

                            <input
                                type="text"
                                id="managePosition"
                                required
                            >

                        </div>


                        <div class="virello-field">

                            <label>
                                Department
                            </label>

                            <input
                                type="text"
                                id="manageDepartment"
                            >

                        </div>


                        <div class="virello-field">

                            <label>
                                Email Address
                            </label>

                            <input
                                type="email"
                                id="manageEmail"
                            >

                        </div>


                        <div class="virello-field">

                            <label>
                                Phone Number
                            </label>

                            <input
                                type="tel"
                                id="managePhone"
                            >

                        </div>


                        <div class="virello-field">

                            <label>
                                Employment Type
                            </label>

                            <select
                                id="manageEmploymentType"
                                required
                            >

                                <option value="">
                                    Select employment type
                                </option>

                                <option value="Full Time">
                                    Full Time
                                </option>

                                <option value="Part Time">
                                    Part Time
                                </option>

                                <option value="Contract">
                                    Contract
                                </option>

                                <option value="Temporary">
                                    Temporary
                                </option>

                            </select>

                        </div>


                        <div class="virello-field">

                            <label>
                                Status
                            </label>

                            <select
                                id="manageStatus"
                                required
                            >

                                <option value="active">
                                    Active
                                </option>

                                <option value="inactive">
                                    Inactive
                                </option>

                            </select>

                        </div>

                    </div>


                    <!-- ACCOUNT STATUS -->

                    <div class="virello-status-box">

                        <div class="virello-status-info">

                            <div class="virello-status-title">
                                Staff Account Status
                            </div>

                            <div
                                id="manageStatusDescription"
                                class="virello-status-description"
                            >
                                This staff member is currently active.
                            </div>

                        </div>


                        <button
                            type="button"
                            id="manageToggleButton"
                            class="virello-status-button"
                        >
                            Deactivate
                        </button>

                    </div>


                    <!-- DANGER -->

                    <div class="virello-delete-box">

                        <div>

                            <div class="virello-delete-title">
                                Delete Staff Member
                            </div>

                            <div class="virello-delete-description">
                                Permanently remove this staff member from your organization.
                            </div>

                        </div>


                        <button
                            type="button"
                            id="manageDeleteButton"
                            class="virello-delete-button"
                        >
                            Delete
                        </button>

                    </div>


                    <!-- ACTIONS -->

                    <div class="virello-manage-actions">

                        <button
                            type="button"
                            id="manageCancelButton"
                            class="virello-cancel-button"
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            id="manageSaveButton"
                            class="virello-save-button"
                        >
                            Save Changes
                        </button>

                    </div>

                </form>

            </div>

        </div>

    `;


    document.body.appendChild(modal);


    injectManageModalStyles();


    const backdrop =
        modal.querySelector(
            ".virello-manage-backdrop"
        );


    const closeButton =
        document.getElementById(
            "closeManageStaffModal"
        );


    const cancelButton =
        document.getElementById(
            "manageCancelButton"
        );


    const form =
        document.getElementById(
            "manageStaffForm"
        );


    const toggleButton =
        document.getElementById(
            "manageToggleButton"
        );


    const deleteButton =
        document.getElementById(
            "manageDeleteButton"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeManageStaffModal
        );

    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeManageStaffModal
        );

    }


    if (backdrop) {

        backdrop.addEventListener(
            "click",
            event => {

                if (
                    event.target === backdrop
                ) {

                    closeManageStaffModal();

                }

            }
        );

    }


    if (form) {

        form.addEventListener(
            "submit",
            saveManageStaff
        );

    }


    if (toggleButton) {

        toggleButton.addEventListener(
            "click",
            toggleCurrentStaff
        );

    }


    if (deleteButton) {

        deleteButton.addEventListener(
            "click",
            deleteCurrentStaff
        );

    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                const currentModal =
                    document.getElementById(
                        "manageStaffModal"
                    );


                if (
                    currentModal &&
                    currentModal.classList.contains(
                        "show"
                    )
                ) {

                    closeManageStaffModal();

                }

            }

        }
    );

}


/* =========================================================
   OPEN MANAGE STAFF
========================================================= */

function openManageStaffModal(
    staffDocumentId
) {

    console.log(
        "🔧 Opening Manage Staff:",
        staffDocumentId
    );


    const staff =
        staffMembers.find(
            member =>
                member.id === staffDocumentId
        );


    if (!staff) {

        console.error(
            "❌ Staff member not found:",
            staffDocumentId
        );

        alert(
            "Staff member could not be found."
        );

        return;
    }


    currentManagingStaff =
        staff;


    const modal =
        document.getElementById(
            "manageStaffModal"
        );


    if (!modal) {

        console.error(
            "❌ Manage modal does not exist."
        );

        return;
    }


    const fullName =
        staff.fullName ||
        staff.name ||
        "Staff Member";


    const avatar =
        document.getElementById(
            "manageStaffAvatar"
        );


    const name =
        document.getElementById(
            "manageStaffName"
        );


    const subtitle =
        document.getElementById(
            "manageStaffSubtitle"
        );


    if (avatar) {

        avatar.textContent =
            getInitials(fullName);

    }


    if (name) {

        name.textContent =
            fullName;

    }


    if (subtitle) {

        subtitle.textContent =
            staff.position ||
            "Staff information";

    }


    setManageValue(
        "manageFullName",
        fullName
    );


    setManageValue(
        "manageStaffId",
        staff.staffId || ""
    );


    setManageValue(
        "managePosition",
        staff.position || ""
    );


    setManageValue(
        "manageDepartment",
        staff.department || ""
    );


    setManageValue(
        "manageEmail",
        staff.email || ""
    );


    setManageValue(
        "managePhone",
        staff.phone || ""
    );


    setManageValue(
        "manageEmploymentType",
        staff.employmentType || ""
    );


    setManageValue(
        "manageStatus",
        staff.status || "active"
    );


    updateManageStatusUI(
        staff.status || "active"
    );


    clearManageMessage();


    modal.classList.add("show");


    setTimeout(() => {

        const input =
            document.getElementById(
                "manageFullName"
            );


        if (input) {
            input.focus();
        }

    }, 100);

}


/* =========================================================
   SET MANAGE VALUE
========================================================= */

function setManageValue(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        console.warn(
            "⚠️ Manage element missing:",
            elementId
        );

        return;
    }


    element.value =
        value;

}


/* =========================================================
   CLOSE MANAGE
========================================================= */

function closeManageStaffModal() {

    const modal =
        document.getElementById(
            "manageStaffModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove("show");


    currentManagingStaff =
        null;


    clearManageMessage();

}


/* =========================================================
   MANAGE MESSAGES
========================================================= */

function clearManageMessage() {

    const message =
        document.getElementById(
            "manageStaffMessage"
        );


    if (!message) {
        return;
    }


    message.textContent = "";

    message.className =
        "virello-manage-message";

}


function showManageMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "manageStaffMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        "virello-manage-message show " +
        type;

}


/* =========================================================
   SAVE MANAGED STAFF
========================================================= */

async function saveManageStaff(event) {

    event.preventDefault();


    if (!currentManagingStaff) {

        showManageMessage(
            "No staff member is selected.",
            "error"
        );

        return;
    }


    const fullName =
        getElementValue(
            "manageFullName"
        );


    const staffId =
        getElementValue(
            "manageStaffId"
        );


    const position =
        getElementValue(
            "managePosition"
        );


    const department =
        getElementValue(
            "manageDepartment"
        );


    const email =
        getElementValue(
            "manageEmail"
        );


    const phone =
        getElementValue(
            "managePhone"
        );


    const employmentType =
        getElementValue(
            "manageEmploymentType"
        );


    const status =
        getElementValue(
            "manageStatus"
        ) || "active";


    if (!fullName) {

        showManageMessage(
            "Please enter the staff member's full name.",
            "error"
        );

        return;
    }


    if (!staffId) {

        showManageMessage(
            "Please enter a Staff ID.",
            "error"
        );

        return;
    }


    if (!position) {

        showManageMessage(
            "Please enter the staff member's position.",
            "error"
        );

        return;
    }


    if (!employmentType) {

        showManageMessage(
            "Please select the employment type.",
            "error"
        );

        return;
    }


    const duplicate =
        staffMembers.find(
            staff =>

                staff.id !==
                currentManagingStaff.id &&

                String(
                    staff.staffId || ""
                ).toLowerCase() ===
                staffId.toLowerCase()
        );


    if (duplicate) {

        showManageMessage(
            "Another staff member already uses this Staff ID.",
            "error"
        );

        return;
    }


    const saveButton =
        document.getElementById(
            "manageSaveButton"
        );


    if (saveButton) {

        saveButton.disabled = true;

        saveButton.textContent =
            "Saving...";

    }


    clearManageMessage();


    try {

        const staffDocument =
            doc(
                db,
                "staff",
                currentManagingStaff.id
            );


        await updateDoc(
            staffDocument,
            {

                fullName,

                staffId,

                position,

                department,

                email,

                phone,

                employmentType,

                status,

                updatedBy:
                    currentUser.uid,

                updatedAt:
                    serverTimestamp()

            }
        );


        console.log(
            "✅ Staff updated successfully."
        );


        showManageMessage(
            "Staff information saved successfully.",
            "success"
        );


        await loadStaff();


        const updatedStaff =
            staffMembers.find(
                staff =>
                    staff.id ===
                    currentManagingStaff.id
            );


        if (updatedStaff) {

            currentManagingStaff =
                updatedStaff;

        }


        updateManageStatusUI(status);


        setTimeout(() => {

            closeManageStaffModal();

        }, 800);


    } catch (error) {

        console.error(
            "❌ Save Changes error:",
            error
        );


        showManageMessage(
            error.message ||
            "Unable to save changes.",
            "error"
        );


    } finally {

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.textContent =
                "Save Changes";

        }

    }

}


/* =========================================================
   UPDATE STATUS UI
========================================================= */

function updateManageStatusUI(status) {

    const toggleButton =
        document.getElementById(
            "manageToggleButton"
        );


    const description =
        document.getElementById(
            "manageStatusDescription"
        );


    if (!toggleButton) {
        return;
    }


    if (status === "active") {

        toggleButton.textContent =
            "Deactivate";

        toggleButton.className =
            "virello-status-button deactivate";


        if (description) {

            description.textContent =
                "This staff member is currently active.";

        }

    } else {

        toggleButton.textContent =
            "Activate";

        toggleButton.className =
            "virello-status-button activate";


        if (description) {

            description.textContent =
                "This staff member is currently inactive.";

        }

    }

}


/* =========================================================
   TOGGLE STAFF STATUS
========================================================= */

async function toggleCurrentStaff() {

    if (!currentManagingStaff) {

        showManageMessage(
            "No staff member is selected.",
            "error"
        );

        return;
    }


    const currentStatus =
        currentManagingStaff.status ||
        "active";


    const newStatus =
        currentStatus === "active"
            ? "inactive"
            : "active";


    const action =
        newStatus === "active"
            ? "activate"
            : "deactivate";


    const fullName =
        currentManagingStaff.fullName ||
        "this staff member";


    const confirmed =
        confirm(
            `Are you sure you want to ${action} ${fullName}?`
        );


    if (!confirmed) {
        return;
    }


    const button =
        document.getElementById(
            "manageToggleButton"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            newStatus === "active"
                ? "Activating..."
                : "Deactivating...";

    }


    try {

        const staffDocument =
            doc(
                db,
                "staff",
                currentManagingStaff.id
            );


        await updateDoc(
            staffDocument,
            {

                status:
                    newStatus,

                updatedBy:
                    currentUser.uid,

                updatedAt:
                    serverTimestamp()

            }
        );


        await loadStaff();


        const updatedStaff =
            staffMembers.find(
                staff =>
                    staff.id ===
                    currentManagingStaff.id
            );


        if (updatedStaff) {

            currentManagingStaff =
                updatedStaff;

        }


        setManageValue(
            "manageStatus",
            newStatus
        );


        updateManageStatusUI(
            newStatus
        );


        showManageMessage(
            `Staff member ${action}d successfully.`,
            "success"
        );


    } catch (error) {

        console.error(
            "❌ Status update error:",
            error
        );


        showManageMessage(
            error.message ||
            "Unable to change staff status.",
            "error"
        );


    } finally {

        if (button) {

            button.disabled = false;

            updateManageStatusUI(
                currentManagingStaff?.status ||
                newStatus
            );

        }

    }

}


/* =========================================================
   DELETE STAFF
========================================================= */

async function deleteCurrentStaff() {

    if (!currentManagingStaff) {

        showManageMessage(
            "No staff member is selected.",
            "error"
        );

        return;
    }


    const fullName =
        currentManagingStaff.fullName ||
        "this staff member";


    const confirmed =
        confirm(
            `DELETE STAFF\n\nAre you sure you want to permanently delete ${fullName}?\n\nThis action cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    const button =
        document.getElementById(
            "manageDeleteButton"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "Deleting...";

    }


    try {

        const staffDocument =
            doc(
                db,
                "staff",
                currentManagingStaff.id
            );


        await deleteDoc(
            staffDocument
        );


        console.log(
            "🗑️ Staff permanently deleted:",
            currentManagingStaff.id
        );


        await loadStaff();


        closeManageStaffModal();


        alert(
            `${fullName} has been deleted successfully.`
        );


    } catch (error) {

        console.error(
            "❌ Delete staff error:",
            error
        );


        showManageMessage(
            error.message ||
            "Unable to delete staff member.",
            "error"
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "Delete";

        }

    }

}


/* =========================================================
   ADD BUTTON EVENTS
========================================================= */

if (addStaffButton) {

    addStaffButton.addEventListener(
        "click",
        openAddStaffModal
    );

}


if (emptyAddButton) {

    emptyAddButton.addEventListener(
        "click",
        openAddStaffModal
    );

}


if (closeModalButton) {

    closeModalButton.addEventListener(
        "click",
        closeAddStaffModal
    );

}


if (cancelStaffButton) {

    cancelStaffButton.addEventListener(
        "click",
        closeAddStaffModal
    );

}


/* =========================================================
   ADD MODAL OUTSIDE CLICK
========================================================= */

if (addStaffModal) {

    addStaffModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                addStaffModal
            ) {

                closeAddStaffModal();

            }

        }
    );

}


/* =========================================================
   ESCAPE ADD MODAL
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            addStaffModal &&
            addStaffModal.classList.contains("show")
        ) {

            closeAddStaffModal();

        }

    }
);


/* =========================================================
   LOGOUT
========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                console.log(
                    "🚪 Logging out..."
                );


                await signOut(auth);


                window.location.href =
                    "login.html";


            } catch (error) {

                console.error(
                    "❌ Logout error:",
                    error
                );


                alert(
                    "Unable to logout. Please try again."
                );

            }

        }
    );

}


/* =========================================================
   MANAGE MODAL CSS
========================================================= */

function injectManageModalStyles() {

    if (
        document.getElementById(
            "virelloManageStyles"
        )
    ) {

        return;
    }


    const style =
        document.createElement("style");


    style.id =
        "virelloManageStyles";


    style.textContent = `

        /* =================================================
           VIRELLO MANAGE STAFF
        ================================================= */

        #manageStaffModal {
            display: none;
        }


        #manageStaffModal.show {
            display: block;
        }


        .virello-manage-backdrop {
            position: fixed;
            inset: 0;
            z-index: 99999;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 20px;

            background:
                rgba(15, 23, 42, 0.65);

            backdrop-filter:
                blur(4px);

            overflow-y: auto;
        }


        .virello-manage-card {
            width: 100%;
            max-width: 760px;

            max-height: 94vh;

            overflow-y: auto;

            background: #ffffff;

            border-radius: 20px;

            box-shadow:
                0 25px 80px
                rgba(0,0,0,0.25);

            animation:
                virelloModalIn
                0.18s
                ease-out;
        }


        @keyframes virelloModalIn {

            from {
                opacity: 0;
                transform: translateY(12px) scale(0.98);
            }

            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }

        }


        /* HEADER */

        .virello-manage-header {
            display: flex;

            align-items: center;
            justify-content: space-between;

            padding: 24px;

            border-bottom:
                1px solid #e5e7eb;
        }


        .virello-profile {
            display: flex;

            align-items: center;

            gap: 14px;
        }


        .virello-profile-avatar {
            width: 54px;
            height: 54px;

            flex-shrink: 0;

            display: flex;

            align-items: center;
            justify-content: center;

            border-radius: 50%;

            background:
                linear-gradient(
                    135deg,
                    #2563eb,
                    #1d4ed8
                );

            color: #ffffff;

            font-size: 15px;
            font-weight: 800;
        }


        .virello-profile-name {
            color: #111827;

            font-size: 20px;

            font-weight: 800;
        }


        .virello-profile-role {
            margin-top: 4px;

            color: #64748b;

            font-size: 12px;
        }


        .virello-modal-close {
            width: 38px;
            height: 38px;

            border: none;

            border-radius: 10px;

            background: #f1f5f9;

            color: #475569;

            font-size: 25px;

            cursor: pointer;

            line-height: 1;
        }


        .virello-modal-close:hover {
            background: #e2e8f0;
        }


        /* MESSAGE */

        .virello-manage-message {
            display: none;

            margin:
                18px 24px 0;

            padding: 12px 14px;

            border-radius: 10px;

            font-size: 12px;

            font-weight: 600;
        }


        .virello-manage-message.show {
            display: block;
        }


        .virello-manage-message.success {
            background: #f0fdf4;

            border:
                1px solid #bbf7d0;

            color: #15803d;
        }


        .virello-manage-message.error {
            background: #fef2f2;

            border:
                1px solid #fecaca;

            color: #b91c1c;
        }


        /* FORM */

        .virello-manage-form {
            padding: 24px;
        }


        .virello-section-title {
            margin-bottom: 16px;

            color: #0f172a;

            font-size: 14px;

            font-weight: 800;
        }


        .virello-form-grid {
            display: grid;

            grid-template-columns:
                repeat(2, minmax(0, 1fr));

            gap: 16px;
        }


        .virello-field {
            display: flex;

            flex-direction: column;
        }


        .virello-field label {
            margin-bottom: 7px;

            color: #334155;

            font-size: 12px;

            font-weight: 700;
        }


        .virello-field input,
        .virello-field select {

            width: 100%;

            min-height: 44px;

            box-sizing: border-box;

            padding:
                10px 12px;

            border:
                1px solid #cbd5e1;

            border-radius: 9px;

            background: #ffffff;

            color: #172033;

            font-size: 13px;

            outline: none;

            transition:
                border-color .15s,
                box-shadow .15s;
        }


        .virello-field input:focus,
        .virello-field select:focus {

            border-color: #2563eb;

            box-shadow:
                0 0 0 3px
                rgba(37,99,235,.10);
        }


        /* STATUS */

        .virello-status-box {

            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 16px;

            margin-top: 24px;

            padding: 17px;

            border:
                1px solid #dbeafe;

            border-radius: 12px;

            background: #f8fbff;
        }


        .virello-status-title {

            color: #1e293b;

            font-size: 12px;

            font-weight: 800;
        }


        .virello-status-description {

            margin-top: 4px;

            color: #64748b;

            font-size: 11px;
        }


        .virello-status-button {

            flex-shrink: 0;

            min-width: 105px;

            padding:
                10px 14px;

            border-radius: 8px;

            font-size: 11px;

            font-weight: 800;

            cursor: pointer;
        }


        .virello-status-button.deactivate {

            border:
                1px solid #fcd34d;

            background: #fffbeb;

            color: #b45309;
        }


        .virello-status-button.activate {

            border:
                1px solid #86efac;

            background: #f0fdf4;

            color: #15803d;
        }


        .virello-status-button:disabled {

            opacity: .5;

            cursor: not-allowed;
        }


        /* DELETE */

        .virello-delete-box {

            display: flex;

            align-items: center;

            justify-content: space-between;

            gap: 16px;

            margin-top: 14px;

            padding: 17px;

            border:
                1px solid #fee2e2;

            border-radius: 12px;

            background: #fffafa;
        }


        .virello-delete-title {

            color: #991b1b;

            font-size: 12px;

            font-weight: 800;
        }


        .virello-delete-description {

            margin-top: 4px;

            color: #7f1d1d;

            font-size: 10px;
        }


        .virello-delete-button {

            flex-shrink: 0;

            padding:
                10px 15px;

            border:
                1px solid #fecaca;

            border-radius: 8px;

            background: #ffffff;

            color: #dc2626;

            font-size: 11px;

            font-weight: 800;

            cursor: pointer;
        }


        .virello-delete-button:hover {

            background: #fef2f2;
        }


        .virello-delete-button:disabled {

            opacity: .5;

            cursor: not-allowed;
        }


        /* ACTIONS */

        .virello-manage-actions {

            display: flex;

            justify-content: flex-end;

            gap: 10px;

            margin-top: 24px;

            padding-top: 20px;

            border-top:
                1px solid #e5e7eb;
        }


        .virello-cancel-button,
        .virello-save-button {

            min-height: 42px;

            padding:
                10px 20px;

            border-radius: 8px;

            font-size: 12px;

            font-weight: 800;

            cursor: pointer;
        }


        .virello-cancel-button {

            border:
                1px solid #cbd5e1;

            background: #ffffff;

            color: #475569;
        }


        .virello-cancel-button:hover {

            background: #f8fafc;
        }


        .virello-save-button {

            border: none;

            background: #2563eb;

            color: #ffffff;
        }


        .virello-save-button:hover {

            background: #1d4ed8;
        }


        .virello-save-button:disabled {

            background: #93c5fd;

            cursor: not-allowed;
        }


        /* MOBILE */

        @media (max-width: 650px) {

            .virello-manage-backdrop {

                align-items: flex-start;

                padding: 10px;
            }


            .virello-manage-card {

                max-height: 96vh;

                border-radius: 15px;
            }


            .virello-manage-header {

                padding: 18px;
            }


            .virello-manage-form {

                padding: 18px;
            }


            .virello-form-grid {

                grid-template-columns: 1fr;
            }


            .virello-profile-name {

                font-size: 17px;
            }


            .virello-status-box,
            .virello-delete-box {

                flex-direction: column;

                align-items: flex-start;
            }


            .virello-status-button,
            .virello-delete-button {

                width: 100%;
            }


            .virello-manage-actions {

                flex-direction: column-reverse;
            }


            .virello-cancel-button,
            .virello-save-button {

                width: 100%;
            }

        }

    `;


    document.head.appendChild(style);

}


/* =========================================================
   LOADING
========================================================= */

function hideLoading() {

    if (!loadingScreen) {
        return;
    }


    loadingScreen.style.display =
        "none";

}


/* =========================================================
   ERROR
========================================================= */

function showError(message) {

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
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


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
   FINAL LOG
========================================================= */

console.log(
    "✅ Virello complete staff.js loaded."
);