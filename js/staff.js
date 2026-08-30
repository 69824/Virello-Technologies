/* =========================================================
   VIRELLO TECHNOLOGIES
   STAFF MANAGEMENT

   FILE:
   js/staff.js

   PURPOSE:
   - Administrator authentication
   - Load organization
   - Load staff
   - Create staff
   - Create Firebase Authentication account
   - Create Form Master
   - Assign Form Master to class
   - Update class assignment
   - Edit staff
   - Activate / deactivate staff
   - Delete staff profile
   - Keep administrator logged in

   SCHOOL CLASS STRUCTURE:
   Nursery 1
   Nursery 2
   Nursery 3
   Grade 1
   Grade 2
   Grade 3
   Grade 4
   Grade 5
   Grade 6
   Grade 7
   Grade 8
   Grade 9
========================================================= */


/* =========================================================
   FIREBASE IMPORTS
========================================================= */

import {
    initializeApp,
    deleteApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    deleteUser,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
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

let organization = null;

let staffMembers = [];

let classes = [];

let editingStaff = null;

let selectedFormMasterClass = null;


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

const organizationNameCard =
    document.getElementById("organizationNameCard");

const organizationTypeCard =
    document.getElementById("organizationTypeCard");

const adminName =
    document.getElementById("adminName");

const logoutButton =
    document.getElementById("logoutButton");

const addStaffButton =
    document.getElementById("addStaffButton");

const emptyAddButton =
    document.getElementById("emptyAddButton");

const addStaffModal =
    document.getElementById("addStaffModal");

const closeModalButton =
    document.getElementById("closeModalButton");

const cancelStaffButton =
    document.getElementById("cancelStaffButton");

const addStaffForm =
    document.getElementById("addStaffForm");

const modalTitle =
    document.getElementById("modalTitle");

const modalDescription =
    document.getElementById("modalDescription");

const saveStaffButton =
    document.getElementById("saveStaffButton");

const staffFormMessage =
    document.getElementById("staffFormMessage");

const staffTableContainer =
    document.getElementById("staffTableContainer");

const staffTableBody =
    document.getElementById("staffTableBody");

const emptyState =
    document.getElementById("emptyState");

const totalStaff =
    document.getElementById("totalStaff");

const activeStaff =
    document.getElementById("activeStaff");

const inactiveStaff =
    document.getElementById("inactiveStaff");


/* =========================================================
   FORM ELEMENTS
========================================================= */

const staffFullName =
    document.getElementById("staffFullName");

const staffId =
    document.getElementById("staffId");

const staffPosition =
    document.getElementById("staffPosition");

const staffDepartment =
    document.getElementById("staffDepartment");

const staffEmail =
    document.getElementById("staffEmail");

const staffPhone =
    document.getElementById("staffPhone");

const employmentType =
    document.getElementById("employmentType");

const staffStatus =
    document.getElementById("staffStatus");


/* =========================================================
   EXTRA FORM CONTROLS
========================================================= */

let roleSelect = null;

let formMasterClassGroup = null;

let formMasterClassSelect = null;

let passwordGroup = null;

let passwordInput = null;


/* =========================================================
   CREATE EXTRA FORM FIELDS
========================================================= */

function createExtraFormFields() {

    /*
     * -------------------------------------------------------
     * ROLE
     * -------------------------------------------------------
     */

    const positionGroup =
        staffPosition?.closest(".form-group");


    if (
        positionGroup &&
        !document.getElementById("staffRole")
    ) {

        const group =
            document.createElement("div");

        group.className =
            "form-group";

        group.innerHTML = `

            <label for="staffRole">
                Virello Role
            </label>

            <select
                id="staffRole"
                required
            >

                <option value="">
                    Select role
                </option>

                <option value="staff">
                    Staff Member
                </option>

                <option value="teacher">
                    Teacher
                </option>

                <option value="form_master">
                    Form Master
                </option>

                <option value="administrator">
                    Administrator
                </option>

            </select>

            <small>
                Form Master accounts can manage attendance
                for their assigned class.
            </small>

        `;

        positionGroup.after(group);

        roleSelect =
            document.getElementById("staffRole");

    }


    /*
     * -------------------------------------------------------
     * PASSWORD
     * -------------------------------------------------------
     */

    const emailGroup =
        staffEmail?.closest(".form-group");


    if (
        emailGroup &&
        !document.getElementById("staffPassword")
    ) {

        passwordGroup =
            document.createElement("div");

        passwordGroup.className =
            "form-group";

        passwordGroup.innerHTML = `

            <label for="staffPassword">
                Login Password
            </label>

            <input
                type="password"
                id="staffPassword"
                placeholder="Create login password"
                minlength="6"
                autocomplete="new-password"
            >

            <small>
                Required when creating a new login account.
                Minimum 6 characters.
            </small>

        `;

        emailGroup.after(passwordGroup);

        passwordInput =
            document.getElementById("staffPassword");

    }


    /*
     * -------------------------------------------------------
     * FORM MASTER CLASS
     * -------------------------------------------------------
     */

    if (
        emailGroup &&
        !document.getElementById(
            "formMasterClassGroup"
        )
    ) {

        formMasterClassGroup =
            document.createElement("div");

        formMasterClassGroup.id =
            "formMasterClassGroup";

        formMasterClassGroup.className =
            "form-group";

        formMasterClassGroup.style.display =
            "none";

        formMasterClassGroup.innerHTML = `

            <label for="formMasterClass">
                Assign Form Master Class
            </label>

            <select
                id="formMasterClass"
            >

                <option value="">
                    Select class
                </option>

            </select>

            <small>
                This Form Master will manage attendance
                for this class.
            </small>

        `;

        passwordGroup.after(
            formMasterClassGroup
        );

        formMasterClassSelect =
            document.getElementById(
                "formMasterClass"
            );

    }


    /*
     * -------------------------------------------------------
     * ROLE CHANGE
     * -------------------------------------------------------
     */

    if (roleSelect) {

        roleSelect.addEventListener(
            "change",
            handleRoleChange
        );

    }

}


/* =========================================================
   ROLE CHANGE HANDLER
========================================================= */

function handleRoleChange() {

    const role =
        roleSelect?.value || "";


    if (formMasterClassGroup) {

        formMasterClassGroup.style.display =
            role === "form_master"
                ? "block"
                : "none";

    }


    if (formMasterClassSelect) {

        formMasterClassSelect.required =
            role === "form_master";

    }

}


/* =========================================================
   START APPLICATION
========================================================= */

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


            console.log(
                "🔐 Administrator authenticated:",
                user.uid,
                user.email
            );


            /*
             * Create dynamic fields first.
             */

            createExtraFormFields();


            /*
             * Load organization.
             */

            await loadOrganization();


            /*
             * Load complete class structure.
             */

            await loadClasses();


            /*
             * Load staff.
             */

            await loadStaff();


            /*
             * Update interface.
             */

            updateOrganizationUI();

            updateStatistics();

            renderStaff();


            hideLoading();


            console.log(
                "✅ Virello Staff Management ready."
            );

        }

        catch (error) {

            console.error(
                "❌ Staff Management startup error:",
                error
            );


            showError(
                getFriendlyError(error)
            );

        }

    }
);


/* =========================================================
   LOAD ORGANIZATION
========================================================= */

async function loadOrganization() {

    let organizationId = "";


    /*
     * -------------------------------------------------------
     * 1. CHECK ADMIN USER DOCUMENT
     * -------------------------------------------------------
     */

    try {

        const userRef =
            doc(
                db,
                "users",
                currentUser.uid
            );


        const userSnapshot =
            await getDoc(
                userRef
            );


        if (
            userSnapshot.exists()
        ) {

            const data =
                userSnapshot.data();


            organizationId =
                data.organizationId ||
                data.orgId ||
                data.organizationID ||
                "";


            if (
                data.fullName ||
                data.name
            ) {

                if (adminName) {

                    adminName.textContent =
                        data.fullName ||
                        data.name;

                }

            }

        }

    }

    catch (error) {

        console.warn(
            "User profile lookup failed:",
            error
        );

    }


    /*
     * -------------------------------------------------------
     * 2. CHECK STAFF / ADMIN PROFILE
     * -------------------------------------------------------
     */

    if (!organizationId) {

        try {

            const staffRef =
                collection(
                    db,
                    "staff"
                );


            const q =
                query(
                    staffRef,
                    where(
                        "uid",
                        "==",
                        currentUser.uid
                    )
                );


            const snapshot =
                await getDocs(q);


            if (
                !snapshot.empty
            ) {

                const data =
                    snapshot.docs[0].data();


                organizationId =
                    data.organizationId ||
                    data.orgId ||
                    "";

            }

        }

        catch (error) {

            console.warn(
                "Staff organization lookup failed:",
                error
            );

        }

    }


    /*
     * -------------------------------------------------------
     * 3. LOCAL STORAGE FALLBACK
     * -------------------------------------------------------
     */

    if (!organizationId) {

        const possibleKeys = [

            "virelloOrganization",

            "organization",

            "virelloAdmin",

            "virelloUser",

            "virelloOrganizationData"

        ];


        for (
            const key of possibleKeys
        ) {

            try {

                const stored =
                    localStorage.getItem(
                        key
                    );


                if (!stored) {
                    continue;
                }


                const data =
                    JSON.parse(
                        stored
                    );


                if (
                    data.organizationId
                ) {

                    organizationId =
                        data.organizationId;

                    break;

                }


                if (
                    data.organization?.id
                ) {

                    organizationId =
                        data.organization.id;

                    break;

                }

            }

            catch {

                // Ignore invalid local storage.

            }

        }

    }


    /*
     * -------------------------------------------------------
     * 4. SEARCH ORGANIZATION BY ADMIN UID
     * -------------------------------------------------------
     */

    if (!organizationId) {

        try {

            const organizationsRef =
                collection(
                    db,
                    "organizations"
                );


            const q =
                query(
                    organizationsRef,
                    where(
                        "adminUid",
                        "==",
                        currentUser.uid
                    )
                );


            const snapshot =
                await getDocs(q);


            if (
                !snapshot.empty
            ) {

                organizationId =
                    snapshot.docs[0].id;

            }

        }

        catch (error) {

            console.warn(
                "Organization adminUid lookup failed:",
                error
            );

        }

    }


    /*
     * -------------------------------------------------------
     * 5. SEARCH BY ADMIN EMAIL
     * -------------------------------------------------------
     */

    if (
        !organizationId &&
        currentUser.email
    ) {

        try {

            const organizationsRef =
                collection(
                    db,
                    "organizations"
                );


            const q =
                query(
                    organizationsRef,
                    where(
                        "adminEmail",
                        "==",
                        currentUser.email
                    )
                );


            const snapshot =
                await getDocs(q);


            if (
                !snapshot.empty
            ) {

                organizationId =
                    snapshot.docs[0].id;

            }

        }

        catch (error) {

            console.warn(
                "Organization adminEmail lookup failed:",
                error
            );

        }

    }


    /*
     * -------------------------------------------------------
     * ORGANIZATION NOT FOUND
     * -------------------------------------------------------
     */

    if (!organizationId) {

        throw new Error(
            "Your administrator account is not linked to a Virello organization. Please complete organization registration first."
        );

    }


    /*
     * -------------------------------------------------------
     * LOAD ORGANIZATION DOCUMENT
     * -------------------------------------------------------
     */

    const organizationRef =
        doc(
            db,
            "organizations",
            organizationId
        );


    const snapshot =
        await getDoc(
            organizationRef
        );


    if (
        !snapshot.exists()
    ) {

        throw new Error(
            "The Virello organization linked to this administrator account could not be found."
        );

    }


    organization = {

        id:
            snapshot.id,

        ...snapshot.data()

    };


    console.log(
        "🏢 Organization loaded:",
        organization
    );

}


/* =========================================================
   ORGANIZATION UI
========================================================= */

function updateOrganizationUI() {

    if (!organization) {
        return;
    }


    const name =
        organization.organizationName ||
        organization.name ||
        "Organization";


    const type =
        organization.organizationType ||
        organization.type ||
        "Organization";


    if (organizationName) {

        organizationName.textContent =
            name;

    }


    if (organizationType) {

        organizationType.textContent =
            type;

    }


    if (organizationNameCard) {

        organizationNameCard.textContent =
            name;

    }


    if (organizationTypeCard) {

        organizationTypeCard.textContent =
            type;

    }


    if (adminName) {

        adminName.textContent =
            organization.adminName ||
            organization.ownerName ||
            currentUser.displayName ||
            currentUser.email ||
            "Administrator";

    }

}


/* =========================================================
   LOAD CLASSES
========================================================= */

async function loadClasses() {

    classes = [];

    if (!organization?.id) {
        return;
    }

    const classesRef = collection(db, "classes");

    try {

        const q = query(
            classesRef,
            where("organizationId", "==", organization.id)
        );

        const snapshot = await getDocs(q);

        snapshot.forEach(item => {
            classes.push({
                id: item.id,
                ...item.data()
            });
        });

        const standardClasses = [
            { id: "nursery-1", name: "Nursery 1", className: "Nursery 1", level: 1 },
            { id: "nursery-2", name: "Nursery 2", className: "Nursery 2", level: 2 },
            { id: "nursery-3", name: "Nursery 3", className: "Nursery 3", level: 3 },
            { id: "grade-1", name: "Grade 1", className: "Grade 1", level: 4 },
            { id: "grade-2", name: "Grade 2", className: "Grade 2", level: 5 },
            { id: "grade-3", name: "Grade 3", className: "Grade 3", level: 6 },
            { id: "grade-4", name: "Grade 4", className: "Grade 4", level: 7 },
            { id: "grade-5", name: "Grade 5", className: "Grade 5", level: 8 },
            { id: "grade-6", name: "Grade 6", className: "Grade 6", level: 9 },
            { id: "grade-7", name: "Grade 7", className: "Grade 7", level: 10 },
            { id: "grade-8", name: "Grade 8", className: "Grade 8", level: 11 },
            { id: "grade-9", name: "Grade 9", className: "Grade 9", level: 12 }
        ];

        standardClasses.forEach(standardClass => {

            const existing = classes.find(item => {
                const existingName = String(
                    item.className || item.name || ""
                ).trim().toLowerCase();

                return existingName === standardClass.name.toLowerCase();
            });

            if (existing) {
                if (!existing.level) {
                    existing.level = standardClass.level;
                }
                return;
            }

            /*
             * IMPORTANT: virtual classes MUST be organization-specific.
             * Never use a global ID such as "grade-7" for a virtual class.
             */
            const organizationClassId =
                `${organization.id}__${standardClass.id}`;

            classes.push({
                id: organizationClassId,
                standardClassId: standardClass.id,
                name: standardClass.name,
                className: standardClass.className,
                level: standardClass.level,
                organizationId: organization.id,
                virtualClass: true
            });
        });

        classes.sort((a, b) =>
            Number(a.level || 999) - Number(b.level || 999)
        );

        console.log(
            "🏫 Organization-specific Virello class list:",
            organization.id,
            classes
        );

        populateClassSelect();

    } catch (error) {

        console.error("❌ Could not load classes:", error);
        throw error;
    }

}

/* =========================================================
   POPULATE FORM MASTER CLASS SELECT
========================================================= */

function populateClassSelect() {

    if (!formMasterClassSelect) {
        return;
    }


    /*
     * Clear dropdown.
     */

    formMasterClassSelect.innerHTML =
        "";


    /*
     * Default option.
     */

    const defaultOption =
        document.createElement(
            "option"
        );


    defaultOption.value =
        "";


    defaultOption.textContent =
        "Select class";


    formMasterClassSelect.appendChild(
        defaultOption
    );


    /*
     * No classes.
     */

    if (!classes.length) {

        const emptyOption =
            document.createElement(
                "option"
            );


        emptyOption.value =
            "";


        emptyOption.textContent =
            "No classes available";


        emptyOption.disabled =
            true;


        formMasterClassSelect.appendChild(
            emptyOption
        );


        return;

    }


    /*
     * ---------------------------------------------------
     * ADD EVERY CLASS
     * ---------------------------------------------------
     */

    classes.forEach(
        classItem => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                classItem.id;


            option.textContent =
                classItem.className ||
                classItem.name ||
                "Unnamed Class";


            formMasterClassSelect.appendChild(
                option
            );

        }
    );


    console.log(
        "✅ Form Master dropdown populated:",
        classes.map(
            item =>
                item.className ||
                item.name
        )
    );

}


/* =========================================================
   LOAD STAFF
========================================================= */

async function loadStaff() {

    staffMembers = [];


    if (!organization?.id) {
        return;
    }


    const staffRef =
        collection(
            db,
            "staff"
        );


    try {

        const q =
            query(
                staffRef,
                where(
                    "organizationId",
                    "==",
                    organization.id
                )
            );


        const snapshot =
            await getDocs(q);


        snapshot.forEach(
            item => {

                staffMembers.push({

                    id:
                        item.id,

                    ...item.data()

                });

            }
        );


        staffMembers.sort(
            (a, b) =>
                String(
                    a.fullName ||
                    a.name ||
                    ""
                ).localeCompare(
                    String(
                        b.fullName ||
                        b.name ||
                        ""
                    )
                )
        );


        console.log(
            "👥 Staff loaded:",
            staffMembers
        );

    }

    catch (error) {

        console.error(
            "❌ Staff loading error:",
            error
        );


        throw error;

    }

}


/* =========================================================
   RENDER STAFF
========================================================= */

function renderStaff() {

    if (!staffTableBody) {
        return;
    }


    if (
        !staffMembers.length
    ) {

        if (emptyState) {

            emptyState.style.display =
                "block";

        }


        if (staffTableContainer) {

            staffTableContainer.style.display =
                "none";

        }


        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    if (staffTableContainer) {

        staffTableContainer.style.display =
            "block";

    }


    staffTableBody.innerHTML =
        "";


    staffMembers.forEach(
        staff => {

            const row =
                document.createElement(
                    "tr"
                );


            const fullName =
                staff.fullName ||
                staff.name ||
                "Unnamed Staff";


            const email =
                staff.email ||
                "";


            const id =
                staff.staffId ||
                staff.id ||
                "";


            const position =
                staff.position ||
                "Staff";


            const department =
                staff.department ||
                "—";


            const status =
                staff.status ||
                "active";


            const roleLabel =
                getRoleLabel(
                    staff.role
                );


            const initials =
                getInitials(
                    fullName
                );


            const className =
                staff.formMasterClassName ||
                staff.className ||
                "";


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
                    ${escapeHtml(id)}
                </td>


                <td>

                    ${escapeHtml(position)}

                    <br>

                    <small
                        style="
                            color:#2563eb;
                            font-size:9px;
                            font-weight:bold;
                        "
                    >
                        ${escapeHtml(roleLabel)}
                    </small>

                    ${
                        className
                            ? `
                                <br>
                                <small
                                    style="
                                        color:#64748b;
                                        font-size:9px;
                                    "
                                >
                                    Class:
                                    ${escapeHtml(className)}
                                </small>
                              `
                            : ""
                    }

                </td>


                <td>
                    ${escapeHtml(department)}
                </td>


                <td>

                    <span
                        class="
                            status-badge
                            ${
                                status === "active"
                                    ? "status-active"
                                    : "status-inactive"
                            }
                        "
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
                            data-action="edit"
                            data-id="${staff.id}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="action-button toggle-button"
                            data-action="toggle"
                            data-id="${staff.id}"
                        >
                            ${
                                status === "active"
                                    ? "Deactivate"
                                    : "Activate"
                            }
                        </button>

                        <button
                            type="button"
                            class="action-button delete-button"
                            data-action="delete"
                            data-id="${staff.id}"
                        >
                            Delete
                        </button>

                        <button
                            type="button"
                            class="action-button"
                            data-action="id-card"
                            data-id="${staff.id}"
                            style="background:#1e3a8a;color:white;"
                        >
                            🪪 ID Card
                        </button>

                    </div>

                </td>

            `;


            staffTableBody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   TABLE ACTIONS
========================================================= */

if (staffTableBody) {

    staffTableBody.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    "[data-action]"
                );


            if (!button) {
                return;
            }


            const action =
                button.dataset.action;


            const id =
                button.dataset.id;


            const staff =
                staffMembers.find(
                    item =>
                        item.id === id
                );


            if (!staff) {
                return;
            }


            if (
                action === "edit"
            ) {

                openEditStaff(
                    staff
                );

                return;

            }


            if (
                action === "id-card"
            ) {

                openDigitalStaffIDCard(
                    staff
                );

                return;

            }


            if (
                action === "toggle"
            ) {

                await toggleStaff(
                    staff
                );

                return;

            }


            if (
                action === "delete"
            ) {

                await deleteStaff(
                    staff
                );

            }

        }
    );

}


/* =========================================================
   OPEN ADD STAFF
========================================================= */

function openAddStaff() {

    editingStaff =
        null;


    selectedFormMasterClass =
        null;


    if (modalTitle) {

        modalTitle.textContent =
            "Add Staff Member";

    }


    if (modalDescription) {

        modalDescription.textContent =
            "Create a staff member and, if required, a Virello login account.";

    }


    if (saveStaffButton) {

        saveStaffButton.textContent =
            "Add Staff";

    }


    clearForm();


    if (staffStatus) {

        staffStatus.value =
            "active";

    }


    if (roleSelect) {

        roleSelect.value =
            "staff";

    }


    handleRoleChange();


    hideFormMessage();


    addStaffModal?.classList.add(
        "show"
    );

}


/* =========================================================
   OPEN EDIT STAFF
========================================================= */

function openEditStaff(
    staff
) {

    editingStaff =
        staff;


    if (modalTitle) {

        modalTitle.textContent =
            "Edit Staff Member";

    }


    if (modalDescription) {

        modalDescription.textContent =
            "Update this staff member's Virello profile.";

    }


    if (saveStaffButton) {

        saveStaffButton.textContent =
            "Save Changes";

    }


    clearForm();


    staffFullName.value =
        staff.fullName ||
        staff.name ||
        "";


    staffId.value =
        staff.staffId ||
        staff.id ||
        "";


    staffPosition.value =
        staff.position ||
        "";


    staffDepartment.value =
        staff.department ||
        "";


    staffEmail.value =
        staff.email ||
        "";


    staffPhone.value =
        staff.phone ||
        "";


    employmentType.value =
        staff.employmentType ||
        "";


    staffStatus.value =
        staff.status ||
        "active";


    if (roleSelect) {

        roleSelect.value =
            staff.role ||
            "staff";

    }


    handleRoleChange();


    if (
        formMasterClassSelect
    ) {

        formMasterClassSelect.value =
            staff.formMasterClassId ||
            "";

    }


    /*
     * Password cannot be changed here.
     */

    if (passwordInput) {

        passwordInput.value =
            "";

        passwordInput.placeholder =
            "Password cannot be changed here";

        passwordInput.disabled =
            true;

    }


    hideFormMessage();


    addStaffModal?.classList.add(
        "show"
    );

}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    addStaffModal?.classList.remove(
        "show"
    );


    editingStaff =
        null;


    selectedFormMasterClass =
        null;


    if (passwordInput) {

        passwordInput.disabled =
            false;

        passwordInput.placeholder =
            "Create login password";

    }

}


/* =========================================================
   CLEAR FORM
========================================================= */

function clearForm() {

    if (addStaffForm) {

        addStaffForm.reset();

    }


    if (staffStatus) {

        staffStatus.value =
            "active";

    }


    if (roleSelect) {

        roleSelect.value =
            "staff";

    }


    if (passwordInput) {

        passwordInput.disabled =
            false;

        passwordInput.placeholder =
            "Create login password";

    }


    if (formMasterClassSelect) {

        formMasterClassSelect.value =
            "";

    }


    handleRoleChange();

}


/* =========================================================
   FORM MASTER CLASS VALIDATION
========================================================= */

async function validateFormMasterClassAvailability(classItem) {

    if (!classItem || !organization?.id) {
        throw new Error("Please select a valid class for this Form Master.");
    }

    if (classItem.organizationId &&
        classItem.organizationId !== organization.id) {
        throw new Error("This class belongs to another organization and cannot be assigned here.");
    }

    const classRef = doc(db, "classes", classItem.id);
    const existing = await getDoc(classRef);

    if (!existing.exists()) {
        if (!classItem.virtualClass) {
            throw new Error("The selected class could not be found.");
        }
        return;
    }

    const data = existing.data();

    if (data.organizationId !== organization.id) {
        throw new Error("This class belongs to another organization and cannot be assigned here.");
    }

    const existingUid =
        data.formMasterUid ||
        data.formMasterId ||
        data.formMaster ||
        "";

    if (existingUid) {
        const existingName =
            data.formMasterName ||
            "another Form Master";

        throw new Error(
            `This class is already assigned to ${existingName}. Please remove the existing Form Master before assigning another one.`
        );
    }
}


/* =========================================================
   SAVE STAFF
========================================================= */

if (addStaffForm) {

    addStaffForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            hideFormMessage();


            if (!organization?.id) {

                showFormMessage(
                    "Your organization could not be identified.",
                    "error"
                );

                return;

            }


            const fullName =
                staffFullName.value.trim();


            const enteredStaffId =
                staffId.value.trim();


            const position =
                staffPosition.value.trim();


            const department =
                staffDepartment.value.trim();


            const email =
                staffEmail.value
                    .trim()
                    .toLowerCase();


            const phone =
                staffPhone.value.trim();


            const employment =
                employmentType.value;


            const status =
                staffStatus.value;


            const role =
                roleSelect?.value ||
                "staff";


            const password =
                passwordInput?.value ||
                "";


            const classId =
                formMasterClassSelect?.value ||
                "";


            if (!fullName) {

                showFormMessage(
                    "Please enter the staff member's full name.",
                    "error"
                );

                return;

            }


            if (!enteredStaffId) {

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


            if (!employment) {

                showFormMessage(
                    "Please select the employment type.",
                    "error"
                );

                return;

            }


            /*
             * Form Master requires a class.
             */

            if (
                role === "form_master" &&
                !classId
            ) {

                showFormMessage(
                    "Please select the class this Form Master will manage.",
                    "error"
                );

                return;

            }


            /*
             * New account requires email.
             */

            if (
                !editingStaff &&
                !email
            ) {

                showFormMessage(
                    "A valid email address is required because this staff member needs a Virello login account.",
                    "error"
                );

                return;

            }


            /*
             * New account requires password.
             */

            if (
                !editingStaff &&
                password.length < 6
            ) {

                showFormMessage(
                    "Please create a password with at least 6 characters.",
                    "error"
                );

                return;

            }


            /*
             * Duplicate Staff ID.
             */

            const duplicateId =
                staffMembers.find(
                    staff =>

                        String(
                            staff.staffId ||
                            ""
                        )
                            .toLowerCase() ===
                        enteredStaffId
                            .toLowerCase()

                        &&

                        staff.id !==
                        editingStaff?.id
                );


            if (duplicateId) {

                showFormMessage(
                    "That Staff ID is already being used.",
                    "error"
                );

                return;

            }


            saveStaffButton.disabled =
                true;


            saveStaffButton.textContent =
                editingStaff
                    ? "Saving..."
                    : "Creating Account...";


            try {

                /*
                 * -------------------------------------------------
                 * EDIT EXISTING STAFF
                 * -------------------------------------------------
                 */

                if (editingStaff) {

                    await updateExistingStaff({

                        fullName,

                        enteredStaffId,

                        position,

                        department,

                        email,

                        phone,

                        employment,

                        status,

                        role,

                        classId

                    });


                    showFormMessage(
                        "Staff member updated successfully.",
                        "success"
                    );


                    await reloadStaff();


                    setTimeout(
                        () => {

                            closeModal();

                        },
                        800
                    );


                    return;

                }


                /*
                 * -------------------------------------------------
                 * VALIDATE FORM MASTER CLASS BEFORE CREATING ACCOUNT
                 * -------------------------------------------------
                 * This prevents the old problem where Firebase creates
                 * the staff account first and the class assignment fails
                 * afterwards, leaving a staff record behind.
                 */

                const selectedClass =
                    classes.find(item => item.id === classId);

                if (role === "form_master") {
                    if (!selectedClass) {
                        throw new Error("The selected Form Master class could not be found.");
                    }

                    await validateFormMasterClassAvailability(selectedClass);
                }


                /*
                 * -------------------------------------------------
                 * CREATE SECONDARY FIREBASE APP
                 * -------------------------------------------------
                 */

                const firebaseConfig =
                    getFirebaseConfig();

                const secondaryApp =
                    initializeApp(
                        firebaseConfig,
                        "virelloStaffCreator_" + Date.now()
                    );

                const secondaryAuth = getAuth(secondaryApp);
                let createdUser = null;
                let firestoreCommitted = false;

                try {

                    const credential =
                        await createUserWithEmailAndPassword(
                            secondaryAuth,
                            email,
                            password
                        );

                    createdUser = credential.user;
                    const newUid = createdUser.uid;

                    console.log("✅ Firebase account created:", newUid);

                    const staffData = {
                        uid: newUid,
                        organizationId: organization.id,
                        fullName,
                        name: fullName,
                        staffId: enteredStaffId,
                        position,
                        department,
                        email,
                        phone,
                        employmentType: employment,
                        status,
                        role,
                        isFormMaster: role === "form_master",
                        formMasterClassId: role === "form_master" ? classId : "",
                        formMasterClassName: role === "form_master"
                            ? (selectedClass?.className || selectedClass?.name || "")
                            : "",
                        createdByUid: currentUser.uid,
                        createdByEmail: currentUser.email || "",
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    };

                    const teacherData = {
                        uid: newUid,
                        organizationId: organization.id,
                        fullName,
                        name: fullName,
                        email,
                        phone,
                        role,
                        position,
                        department,
                        status,
                        formMasterId: role === "form_master" ? newUid : "",
                        formMasterUid: role === "form_master" ? newUid : "",
                        formMasterClassId: role === "form_master" ? classId : "",
                        formMasterClassName: role === "form_master"
                            ? (selectedClass?.className || selectedClass?.name || "")
                            : "",
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    };

                    /*
                     * All Firestore writes are committed together.
                     * Therefore Staff + Teacher + Class succeed together
                     * or none of them are written.
                     */
                    const batch = writeBatch(db);

                    batch.set(
                        doc(db, "staff", newUid),
                        staffData
                    );

                    if (role === "teacher" || role === "form_master") {
                        batch.set(
                            doc(db, "teachers", newUid),
                            teacherData,
                            { merge: true }
                        );
                    }

                    if (role === "form_master" && selectedClass) {

                        const classRef =
                            doc(db, "classes", selectedClass.id);

                        const classSnapshot =
                            await getDoc(classRef);

                        if (classSnapshot.exists()) {

                            const classData = classSnapshot.data();

                            if (classData.organizationId !== organization.id) {
                                throw new Error(
                                    "This class belongs to another organization and cannot be assigned here."
                                );
                            }

                            const occupiedBy =
                                classData.formMasterUid ||
                                classData.formMasterId ||
                                classData.formMaster ||
                                "";

                            if (occupiedBy) {
                                const existingName =
                                    classData.formMasterName ||
                                    "another Form Master";

                                throw new Error(
                                    `This class is already assigned to ${existingName}. Please remove the existing Form Master before assigning another one.`
                                );
                            }

                            batch.update(classRef, {
                                formMasterId: newUid,
                                formMasterUid: newUid,
                                formMasterName: fullName,
                                formMasterEmail: email,
                                formMasterRole: "form_master",
                                updatedAt: serverTimestamp()
                            });

                        } else {

                            if (!selectedClass.virtualClass) {
                                throw new Error("The selected class could not be found.");
                            }

                            batch.set(classRef, {
                                organizationId: organization.id,
                                standardClassId: selectedClass.standardClassId || "",
                                name: selectedClass.name,
                                className: selectedClass.className,
                                level: selectedClass.level,
                                formMasterId: newUid,
                                formMasterUid: newUid,
                                formMasterName: fullName,
                                formMasterEmail: email,
                                formMasterRole: "form_master",
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            });
                        }
                    }

                    await batch.commit();
                    firestoreCommitted = true;

                    console.log(
                        "✅ Staff, teacher and class assignment committed successfully.",
                        organization.id
                    );

                } catch (error) {

                    /*
                     * If Firebase Authentication was created but Firestore
                     * failed, remove the new Auth account so the operation
                     * does not leave an orphaned login account.
                     */
                    if (createdUser && !firestoreCommitted) {
                        try {
                            await deleteUser(createdUser);
                            console.log("🧹 Rolled back Firebase Authentication account.");
                        } catch (rollbackError) {
                            console.warn(
                                "Could not roll back Firebase account:",
                                rollbackError
                            );
                        }
                    }

                    throw error;

                } finally {

                    try {
                        await signOut(secondaryAuth);
                    } catch {
                        // Ignore secondary logout.
                    }

                    try {
                        await deleteApp(secondaryApp);
                    } catch {
                        // Ignore secondary app cleanup.
                    }
                }

                /*
                 * -------------------------------------------------
                 * SUCCESS
                 * -------------------------------------------------
                 */

                await reloadStaff();


                showFormMessage(
                    `Form Master account created successfully for ${fullName}.`,
                    "success"
                );


                if (saveStaffButton) {

                    saveStaffButton.textContent =
                        "Created Successfully";

                }


                setTimeout(
                    () => {

                        closeModal();

                    },
                    1200
                );

            }

            catch (error) {

                console.error(
                    "❌ Create/update staff error:",
                    error
                );


                showFormMessage(
                    getFriendlyError(
                        error
                    ),
                    "error"
                );

            }

            finally {

                if (
                    !staffFormMessage?.classList.contains(
                        "success"
                    )
                ) {

                    saveStaffButton.disabled =
                        false;


                    saveStaffButton.textContent =
                        editingStaff
                            ? "Save Changes"
                            : "Add Staff";

                }

            }

        }
    );

}


/* =========================================================
   ASSIGN FORM MASTER TO CLASS
========================================================= */

async function assignFormMasterToClass(
    classItem,
    formMasterData
) {

    if (!organization?.id) {
        throw new Error("Organization could not be identified.");
    }

    if (!classItem) {
        throw new Error("Please select a class.");
    }

    if (classItem.organizationId &&
        classItem.organizationId !== organization.id) {
        throw new Error("This class belongs to another organization and cannot be assigned here.");
    }

    const classRef = doc(db, "classes", classItem.id);
    const existing = await getDoc(classRef);

    if (!existing.exists()) {

        if (!classItem.virtualClass) {
            throw new Error("The selected class could not be found.");
        }

        await setDoc(classRef, {
            organizationId: organization.id,
            standardClassId: classItem.standardClassId || "",
            name: classItem.name,
            className: classItem.className,
            level: classItem.level,
            formMasterId: formMasterData.uid,
            formMasterUid: formMasterData.uid,
            formMasterName: formMasterData.fullName,
            formMasterEmail: formMasterData.email,
            formMasterRole: "form_master",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        classItem.virtualClass = false;

        console.log(
            "✅ New organization-specific class created and Form Master assigned:",
            classItem.className,
            organization.id
        );

        return;
    }

    const existingData = existing.data();

    if (existingData.organizationId !== organization.id) {
        throw new Error("This class belongs to another organization and cannot be assigned here.");
    }

    const existingFormMasterUid =
        existingData.formMasterUid ||
        existingData.formMasterId ||
        existingData.formMaster ||
        "";

    if (
        existingFormMasterUid &&
        existingFormMasterUid !== formMasterData.uid
    ) {
        const existingName =
            existingData.formMasterName ||
            "another Form Master";

        throw new Error(
            `This class is already assigned to ${existingName}. Please remove the existing Form Master before assigning another one.`
        );
    }

    await updateDoc(classRef, {
        organizationId: organization.id,
        formMasterId: formMasterData.uid,
        formMasterUid: formMasterData.uid,
        formMasterName: formMasterData.fullName,
        formMasterEmail: formMasterData.email,
        formMasterRole: "form_master",
        updatedAt: serverTimestamp()
    });

    console.log(
        "✅ Form Master assigned to organization class:",
        organization.id,
        classItem.id
    );

}

/* =========================================================
   UPDATE EXISTING STAFF
========================================================= */

async function updateExistingStaff(
    data
) {

    if (!editingStaff) {
        return;
    }


    const staffRef =
        doc(
            db,
            "staff",
            editingStaff.id
        );


    const selectedClass =
        classes.find(
            item =>
                item.id ===
                data.classId
        );


    const updates = {

        fullName:
            data.fullName,

        name:
            data.fullName,

        staffId:
            data.enteredStaffId,

        position:
            data.position,

        department:
            data.department,

        email:
            data.email,

        phone:
            data.phone,

        employmentType:
            data.employment,

        status:
            data.status,

        role:
            data.role,

        isFormMaster:
            data.role ===
            "form_master",

        formMasterClassId:
            data.role ===
            "form_master"
                ? data.classId
                : "",

        formMasterClassName:
            data.role ===
            "form_master"
                ? (
                    selectedClass?.className ||
                    selectedClass?.name ||
                    ""
                  )
                : "",

        updatedAt:
            serverTimestamp()

    };


    await updateDoc(
        staffRef,
        updates
    );


    /*
     * -------------------------------------------------------
     * UPDATE TEACHER RECORD
     * -------------------------------------------------------
     */

    if (
        editingStaff.uid &&
        (
            editingStaff.role ===
            "teacher" ||

            editingStaff.role ===
            "form_master" ||

            data.role ===
            "teacher" ||

            data.role ===
            "form_master"
        )
    ) {

        await setDoc(
            doc(
                db,
                "teachers",
                editingStaff.uid
            ),
            {

                uid:
                    editingStaff.uid,

                organizationId:
                    organization.id,

                fullName:
                    data.fullName,

                name:
                    data.fullName,

                email:
                    data.email,

                phone:
                    data.phone,

                role:
                    data.role,

                position:
                    data.position,

                department:
                    data.department,

                status:
                    data.status,

                formMasterId:
                    data.role ===
                    "form_master"
                        ? editingStaff.uid
                        : "",

                formMasterUid:
                    data.role ===
                    "form_master"
                        ? editingStaff.uid
                        : "",

                formMasterClassId:
                    data.role ===
                    "form_master"
                        ? data.classId
                        : "",

                formMasterClassName:
                    data.role ===
                    "form_master"
                        ? (
                            selectedClass?.className ||
                            selectedClass?.name ||
                            ""
                          )
                        : "",

                updatedAt:
                    serverTimestamp()

            },
            {
                merge:
                    true
            }
        );

    }


    /*
     * -------------------------------------------------------
     * ASSIGN FORM MASTER
     * -------------------------------------------------------
     */

    if (
        data.role ===
        "form_master" &&
        selectedClass &&
        editingStaff.uid
    ) {

        await assignFormMasterToClass(
            selectedClass,
            {

                uid:
                    editingStaff.uid,

                staffId:
                    editingStaff.uid,

                fullName:
                    data.fullName,

                email:
                    data.email,

                role:
                    "form_master"

            }
        );

    }

}


/* =========================================================
   TOGGLE STAFF
========================================================= */

async function toggleStaff(
    staff
) {

    const currentStatus =
        staff.status ||
        "active";


    const newStatus =
        currentStatus ===
        "active"
            ? "inactive"
            : "active";


    const confirmMessage =
        newStatus === "inactive"

            ? `Deactivate ${staff.fullName || staff.name}?`

            : `Activate ${staff.fullName || staff.name}?`;


    if (
        !confirm(
            confirmMessage
        )
    ) {

        return;

    }


    try {

        await updateDoc(
            doc(
                db,
                "staff",
                staff.id
            ),
            {

                status:
                    newStatus,

                updatedAt:
                    serverTimestamp()

            }
        );


        await reloadStaff();

    }

    catch (error) {

        console.error(
            "❌ Staff status update error:",
            error
        );


        alert(
            getFriendlyError(
                error
            )
        );

    }

}


/* =========================================================
   DELETE STAFF
========================================================= */

async function deleteStaff(
    staff
) {

    const name =
        staff.fullName ||
        staff.name ||
        "this staff member";


    const confirmed =
        confirm(
            `Delete ${name} from your Virello staff records?\n\nThis removes the staff profile from Firestore.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteDoc(
            doc(
                db,
                "staff",
                staff.id
            )
        );


        /*
         * Firebase Authentication account is intentionally
         * not deleted because another user's Auth account
         * requires Admin SDK/server privileges.
         */

        await reloadStaff();


        alert(
            "Staff profile deleted successfully."
        );

    }

    catch (error) {

        console.error(
            "❌ Delete staff error:",
            error
        );


        alert(
            getFriendlyError(
                error
            )
        );

    }

}


/* =========================================================
   RELOAD STAFF
========================================================= */

async function reloadStaff() {

    await loadStaff();

    updateStatistics();

    renderStaff();

}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {

    const total =
        staffMembers.length;


    const active =
        staffMembers.filter(
            staff =>
                (
                    staff.status ||
                    "active"
                ) ===
                "active"
        ).length;


    const inactive =
        total -
        active;


    if (totalStaff) {

        totalStaff.textContent =
            total;

    }


    if (activeStaff) {

        activeStaff.textContent =
            active;

    }


    if (inactiveStaff) {

        inactiveStaff.textContent =
            inactive;

    }

}


/* =========================================================
   BUTTONS
========================================================= */

if (addStaffButton) {

    addStaffButton.addEventListener(
        "click",
        openAddStaff
    );

}


if (emptyAddButton) {

    emptyAddButton.addEventListener(
        "click",
        openAddStaff
    );

}


if (closeModalButton) {

    closeModalButton.addEventListener(
        "click",
        closeModal
    );

}


if (cancelStaffButton) {

    cancelStaffButton.addEventListener(
        "click",
        closeModal
    );

}


/* =========================================================
   CLOSE MODAL WHEN CLICKING OUTSIDE
========================================================= */

if (addStaffModal) {

    addStaffModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                addStaffModal
            ) {

                closeModal();

            }

        }
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

                await signOut(
                    auth
                );


                window.location.href =
                    "login.html";

            }

            catch (error) {

                console.error(
                    "❌ Logout error:",
                    error
                );

            }

        }
    );

}


/* =========================================================
   FORM MESSAGE
========================================================= */

function showFormMessage(
    message,
    type
) {

    if (!staffFormMessage) {
        return;
    }


    staffFormMessage.textContent =
        message;


    staffFormMessage.className =
        `form-message show ${type}`;

}


function hideFormMessage() {

    if (!staffFormMessage) {
        return;
    }


    staffFormMessage.textContent =
        "";


    staffFormMessage.className =
        "form-message";

}


/* =========================================================
   FIREBASE CONFIG
========================================================= */

function getFirebaseConfig() {

    const firebaseApp =
        auth.app;


    if (!firebaseApp) {

        throw new Error(
            "Firebase application is not available."
        );

    }


    return {

        apiKey:
            firebaseApp.options.apiKey,

        authDomain:
            firebaseApp.options.authDomain,

        projectId:
            firebaseApp.options.projectId,

        storageBucket:
            firebaseApp.options.storageBucket,

        messagingSenderId:
            firebaseApp.options.messagingSenderId,

        appId:
            firebaseApp.options.appId

    };

}


/* =========================================================
   ROLE LABEL
========================================================= */

function getRoleLabel(
    role
) {

    const labels = {

        administrator:
            "Administrator",

        form_master:
            "Form Master",

        teacher:
            "Teacher",

        staff:
            "Staff Member"

    };


    return (
        labels[role] ||
        "Staff Member"
    );

}


/* =========================================================
   INITIALS
========================================================= */

function getInitials(
    name
) {

    const parts =
        String(
            name || ""
        )
            .trim()
            .split(
                /\s+/
            )
            .filter(Boolean);


    if (!parts.length) {
        return "S";
    }


    if (
        parts.length === 1
    ) {

        return parts[0]
            .substring(
                0,
                2
            )
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();

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
   FRIENDLY ERROR
========================================================= */

function getFriendlyError(
    error
) {

    console.error(
        "Virello error:",
        error
    );


    if (!error) {

        return "Something went wrong.";

    }


    const code =
        error.code ||
        "";


    switch (code) {

        case "auth/email-already-in-use":

            return (
                "This email address already has a Virello Firebase account. Use another email address or use the existing account."
            );


        case "auth/invalid-email":

            return (
                "The email address is not valid."
            );


        case "auth/weak-password":

            return (
                "The password is too weak. Please use at least 6 characters."
            );


        case "auth/network-request-failed":

            return (
                "Firebase could not connect to the internet. Please check your connection."
            );


        case "permission-denied":

        case "firestore/permission-denied":

            return (
                "Virello was blocked by Firestore security rules. The administrator account does not currently have permission to create or update this record."
            );


        case "failed-precondition":

            return (
                "Firebase requires an index or configuration change for this request."
            );


        case "auth/operation-not-allowed":

            return (
                "Email/password authentication is not enabled in Firebase Authentication."
            );


        case "auth/invalid-api-key":

            return (
                "The Firebase API key is invalid. Check firebase-config.js."
            );


        case "auth/configuration-not-found":

            return (
                "Firebase Authentication configuration could not be found."
            );


        default:

            if (
                error.message
            ) {

                return error.message;

            }


            return (
                "Unable to complete the staff operation."
            );

    }

}


/* =========================================================
   LOADING
========================================================= */

function hideLoading() {

    if (loadingScreen) {

        loadingScreen.style.display =
            "none";

    }

}


/* =========================================================
   ERROR SCREEN
========================================================= */

function showError(
    message
) {

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
   DIGITAL STAFF ID CARD

   QR CHANGE:
   - No third-party QR image API is used.
   - The QR is generated in the browser from a compact Virello
     verification URL.
   - The QR carries organization + staff identity information.
   - The ID card remains printable and Save-as-PDF friendly.
========================================================= */

let idCardStaff = null;


function loadQRCodeLibrary() {

    return new Promise((resolve, reject) => {

        if (window.QRCode) {
            resolve(window.QRCode);
            return;
        }

        const existing = document.getElementById("virelloQRCodeLibrary");

        if (existing) {
            existing.addEventListener("load", () => resolve(window.QRCode), { once:true });
            existing.addEventListener("error", reject, { once:true });
            return;
        }

        const script = document.createElement("script");

        script.id = "virelloQRCodeLibrary";
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        script.async = true;

        script.onload = () => {
            if (window.QRCode) {
                resolve(window.QRCode);
            } else {
                reject(new Error("QR code library loaded but QRCode is unavailable."));
            }
        };

        script.onerror = () => {
            reject(new Error("Unable to load the QR code generator."));
        };

        document.head.appendChild(script);

    });

}


function buildStaffVerificationUrl(staff) {

    const organizationId = String(
        organization?.id ||
        staff.organizationId ||
        ""
    ).trim();

    const staffId = String(
        staff.staffId ||
        staff.id ||
        ""
    ).trim();

    const uid = String(
        staff.uid ||
        staff.id ||
        ""
    ).trim();

    const name = String(
        staff.fullName ||
        staff.name ||
        "Staff Member"
    ).trim();

    /*
     * Keep the payload compact so phone cameras can scan it quickly.
     * The URL opens the current Virello site with verification data.
     */
    const baseUrl = window.location.origin +
        window.location.pathname;

    const params = new URLSearchParams();

    params.set("virelloVerify", "staff");
    params.set("organizationId", organizationId);
    params.set("staffId", staffId);
    params.set("uid", uid);
    params.set("name", name);

    return baseUrl + "?" + params.toString();

}


async function openDigitalStaffIDCard(staff) {

    if (!staff) {
        return;
    }

    idCardStaff = staff;

    const existing = document.getElementById(
        "virelloDigitalIDModal"
    );

    if (existing) {
        existing.remove();
    }

    const fullName =
        staff.fullName ||
        staff.name ||
        "Staff Member";

    const staffNumber =
        staff.staffId ||
        staff.id ||
        "N/A";

    const position =
        staff.position ||
        "Staff";

    const department =
        staff.department ||
        "—";

    const role =
        getRoleLabel(staff.role);

    const status =
        String(staff.status || "active").toLowerCase();

    const schoolName =
        organization?.organizationName ||
        organization?.name ||
        "Virello Organization";

    const schoolType =
        organization?.organizationType ||
        organization?.type ||
        "Educational Institution";

    const photo =
        staff.photoData ||
        staff.photoURL ||
        "";

    const initials =
        getInitials(fullName);

    const verificationUrl =
        buildStaffVerificationUrl(staff);

    const photoHTML = photo
        ? `
            <img
                src="${escapeHtml(photo)}"
                alt="${escapeHtml(fullName)}"
                style="width:100%;height:100%;object-fit:cover;"
            >
          `
        : `
            <div
                style="
                    width:100%;height:100%;display:flex;
                    align-items:center;justify-content:center;
                    font-size:42px;font-weight:800;
                    color:#0f172a;background:#e2e8f0;
                "
            >
                ${escapeHtml(initials)}
            </div>
          `;

    const modal = document.createElement("div");

    modal.id = "virelloDigitalIDModal";

    modal.innerHTML = `

        <div
            id="virelloIDOverlay"
            style="
                position:fixed;inset:0;z-index:99999;
                background:rgba(15,23,42,.78);
                backdrop-filter:blur(6px);
                display:flex;align-items:center;
                justify-content:center;padding:20px;
                overflow:auto;
            "
        >

            <div
                style="
                    width:min(1050px,100%);max-height:95vh;
                    overflow:auto;background:#f8fafc;
                    border-radius:20px;padding:24px;
                    box-shadow:0 30px 80px rgba(0,0,0,.35);
                "
            >

                <div
                    style="
                        display:flex;justify-content:space-between;
                        align-items:center;gap:15px;margin-bottom:20px;
                    "
                >
                    <div>
                        <div style="font-size:22px;font-weight:800;color:#0f172a;">
                            Digital Staff ID Card
                        </div>
                        <div style="color:#64748b;font-size:13px;margin-top:4px;">
                            Virello Technologies Staff Identification
                        </div>
                    </div>

                    <button
                        id="closeVirelloID"
                        type="button"
                        style="border:none;background:#e2e8f0;color:#0f172a;
                               width:40px;height:40px;border-radius:50%;
                               font-size:22px;cursor:pointer;"
                    >×</button>
                </div>

                <div
                    id="virelloIDPrintArea"
                    style="display:flex;flex-wrap:wrap;justify-content:center;gap:30px;"
                >

                    <div
                        class="virello-id-card"
                        style="width:350px;min-height:500px;background:white;
                               border-radius:18px;overflow:hidden;position:relative;
                               box-shadow:0 12px 35px rgba(15,23,42,.18);
                               border:1px solid #dbe4ef;font-family:Arial,Helvetica,sans-serif;"
                    >
                        <div
                            style="height:92px;background:linear-gradient(135deg,#0f172a,#1e3a8a);
                                   color:white;padding:18px;position:relative;"
                        >
                            <div style="font-size:13px;font-weight:700;letter-spacing:1.5px;">
                                VIRELLO TECHNOLOGIES
                            </div>
                            <div style="font-size:19px;font-weight:800;margin-top:7px;">
                                STAFF ID CARD
                            </div>
                        </div>

                        <div style="display:flex;justify-content:center;margin-top:-35px;position:relative;">
                            <div
                                style="width:125px;height:145px;border-radius:12px;overflow:hidden;
                                       background:#e2e8f0;border:6px solid white;
                                       box-shadow:0 8px 20px rgba(0,0,0,.18);"
                            >${photoHTML}</div>
                        </div>

                        <div style="text-align:center;padding:12px 20px 5px;">
                            <div style="font-size:22px;font-weight:900;color:#0f172a;">
                                ${escapeHtml(fullName)}
                            </div>
                            <div style="color:#2563eb;font-size:14px;font-weight:700;margin-top:4px;">
                                ${escapeHtml(position)}
                            </div>
                        </div>

                        <div style="padding:15px 28px;">
                            <div style="display:grid;grid-template-columns:105px 1fr;gap:9px;font-size:12px;">
                                <strong>Staff ID</strong><span>${escapeHtml(staffNumber)}</span>
                                <strong>Department</strong><span>${escapeHtml(department)}</span>
                                <strong>Role</strong><span>${escapeHtml(role)}</span>
                                <strong>Status</strong>
                                <span style="color:${status === "active" ? "#15803d" : "#dc2626"};font-weight:800;">
                                    ${status === "active" ? "ACTIVE" : "INACTIVE"}
                                </span>
                            </div>
                        </div>

                        <div style="position:absolute;bottom:0;left:0;right:0;background:#f1f5f9;
                                    padding:11px 15px;text-align:center;font-size:9px;color:#64748b;">
                            Official Virello Digital Staff Identification
                        </div>
                    </div>

                    <div
                        class="virello-id-card"
                        style="width:350px;min-height:500px;background:white;
                               border-radius:18px;overflow:hidden;position:relative;
                               box-shadow:0 12px 35px rgba(15,23,42,.18);
                               border:1px solid #dbe4ef;font-family:Arial,Helvetica,sans-serif;"
                    >
                        <div
                            style="height:92px;background:linear-gradient(135deg,#1e3a8a,#0f172a);
                                   color:white;padding:20px;text-align:center;"
                        >
                            <div style="font-size:18px;font-weight:900;">
                                ${escapeHtml(schoolName)}
                            </div>
                            <div style="font-size:11px;opacity:.8;margin-top:5px;">
                                ${escapeHtml(schoolType)}
                            </div>
                        </div>

                        <div style="padding:30px 30px 20px;text-align:center;">
                            <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:15px;">
                                STAFF VERIFICATION QR
                            </div>

                            <div
                                id="virelloStaffQR"
                                style="width:190px;height:190px;margin:0 auto;padding:10px;
                                       background:white;border:1px solid #e2e8f0;border-radius:12px;
                                       display:flex;align-items:center;justify-content:center;"
                            ></div>

                            <div style="font-size:11px;color:#64748b;margin-top:12px;line-height:1.5;">
                                Scan this QR code to open the Virello staff verification record.
                            </div>

                            <div style="font-size:9px;color:#94a3b8;margin-top:8px;word-break:break-all;">
                                ${escapeHtml(verificationUrl)}
                            </div>
                        </div>

                        <div style="margin:0 25px;border-top:1px solid #e2e8f0;padding-top:18px;text-align:center;">
                            <div style="font-size:10px;color:#64748b;">Staff ID</div>
                            <div style="font-size:19px;font-weight:900;color:#0f172a;letter-spacing:1px;">
                                ${escapeHtml(staffNumber)}
                            </div>
                        </div>

                        <div style="position:absolute;bottom:0;left:0;right:0;background:#f1f5f9;
                                    padding:13px;text-align:center;font-size:9px;color:#64748b;">
                            Property of ${escapeHtml(schoolName)}
                        </div>
                    </div>

                </div>

                <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:25px;">
                    <button
                        id="printVirelloID"
                        type="button"
                        style="border:none;background:#0f172a;color:white;padding:13px 22px;
                               border-radius:10px;font-weight:800;cursor:pointer;"
                    >🖨️ Print ID Card</button>

                    <button
                        id="closeVirelloIDBottom"
                        type="button"
                        style="border:none;background:#e2e8f0;color:#0f172a;padding:13px 22px;
                               border-radius:10px;font-weight:800;cursor:pointer;"
                    >Close</button>
                </div>

                <div style="text-align:center;margin-top:14px;font-size:11px;color:#64748b;">
                    To save as PDF, choose <strong>Save as PDF</strong> in the browser print window.
                </div>

            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("closeVirelloID")?.addEventListener(
        "click",
        closeDigitalStaffIDCard
    );

    document.getElementById("closeVirelloIDBottom")?.addEventListener(
        "click",
        closeDigitalStaffIDCard
    );

    document.getElementById("printVirelloID")?.addEventListener(
        "click",
        printDigitalStaffIDCard
    );

    document.getElementById("virelloIDOverlay")?.addEventListener(
        "click",
        event => {
            if (event.target.id === "virelloIDOverlay") {
                closeDigitalStaffIDCard();
            }
        }
    );

    try {

        const QRCode = await loadQRCodeLibrary();

        const target = document.getElementById("virelloStaffQR");

        if (!target) {
            return;
        }

        target.innerHTML = "";

        new QRCode(target, {
            text: verificationUrl,
            width: 168,
            height: 168,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

    } catch (error) {

        console.error("❌ Virello staff QR generation error:", error);

        const target = document.getElementById("virelloStaffQR");

        if (target) {
            target.innerHTML = `
                <div style="text-align:center;padding:10px;color:#dc2626;font-size:11px;font-weight:700;">
                    QR generation unavailable.<br>
                    Please check the internet connection and reopen the ID card.
                </div>
            `;
        }

    }

}


function closeDigitalStaffIDCard() {

    const modal = document.getElementById(
        "virelloDigitalIDModal"
    );

    if (modal) {
        modal.remove();
    }

    idCardStaff = null;

}


function printDigitalStaffIDCard() {

    const printArea = document.getElementById(
        "virelloIDPrintArea"
    );

    if (!printArea) {
        return;
    }

    const printWindow = window.open(
        "",
        "_blank",
        "width=1100,height=850"
    );

    if (!printWindow) {
        alert(
            "Your browser blocked the print window. Please allow pop-ups for this site."
        );
        return;
    }

    printWindow.document.open();

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Virello Staff ID Card</title>
            <meta charset="UTF-8">
            <style>
                * { box-sizing:border-box; }
                html,body {
                    margin:0;
                    padding:0;
                    background:white;
                    font-family:Arial,Helvetica,sans-serif;
                }
                body { padding:20px; }
                #printCards {
                    display:flex;
                    justify-content:center;
                    align-items:flex-start;
                    gap:25px;
                    flex-wrap:wrap;
                }
                .virello-id-card {
                    flex:0 0 350px;
                    width:350px;
                    height:500px;
                    min-height:500px;
                    page-break-inside:avoid;
                    break-inside:avoid;
                    box-shadow:none !important;
                }
                img,canvas {
                    print-color-adjust:exact;
                    -webkit-print-color-adjust:exact;
                }
                @media print {
                    @page { size:A4 portrait; margin:10mm; }
                    body { padding:0; }
                    #printCards { gap:15mm; }
                }
            </style>
        </head>
        <body>
            <div id="printCards">
                ${printArea.innerHTML}
            </div>
            <script>
                window.onload = function() {
                    setTimeout(function() { window.print(); }, 700);
                };
            <\/script>
        </body>
        </html>
    `);

    printWindow.document.close();

}


/* =========================================================
   GLOBAL DEBUG
========================================================= */

window.virelloStaffDebug = {

    getCurrentUser:
        () => currentUser,

    getOrganization:
        () => organization,

    getStaff:
        () => staffMembers,

    getClasses:
        () => classes,

    openStaffID:
        staff => openDigitalStaffIDCard(staff)

};


/* =========================================================
   FINAL LOG
========================================================= */

console.log(
    "✅ Virello Staff Management JavaScript loaded."
);

console.log(
    "🏫 Standard classes:",
    [
        "Nursery 1",
        "Nursery 2",
        "Nursery 3",
        "Grade 1",
        "Grade 2",
        "Grade 3",
        "Grade 4",
        "Grade 5",
        "Grade 6",
        "Grade 7",
        "Grade 8",
        "Grade 9"
    ]
);
