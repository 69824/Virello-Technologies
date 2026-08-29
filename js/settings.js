/* =========================================================
VIRELLO TECHNOLOGIES
DIGITAL ATTENDANCE PLATFORM

FILE:
js/settings.js

PURPOSE:
ORGANIZATION SETTINGS

FEATURES:

* Administrator authentication
* Load administrator organization
* Display organization information
* Edit organization information
* Save changes to Firestore
* Display subscription information
* Firebase security compatible
  ========================================================= */

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
collection,
query,
where,
getDocs,
updateDoc,
doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
auth,
db
} from "./firebase-config.js";

/* =========================================================
GLOBAL STATE
========================================================= */

let currentUser = null;

let currentOrganization = null;

/* =========================================================
DOM ELEMENTS
========================================================= */

const loadingScreen =
document.getElementById(
"loadingScreen"
);

const settingsContent =
document.getElementById(
"settingsContent"
);

const statusBox =
document.getElementById(
"statusBox"
);

const organizationForm =
document.getElementById(
"organizationForm"
);

const organizationNameInput =
document.getElementById(
"organizationName"
);

const organizationTypeInput =
document.getElementById(
"organizationType"
);

const countryInput =
document.getElementById(
"country"
);

const phoneInput =
document.getElementById(
"phone"
);

const emailInput =
document.getElementById(
"email"
);

const adminNameInput =
document.getElementById(
"adminName"
);

const addressInput =
document.getElementById(
"address"
);

const saveButton =
document.getElementById(
"saveButton"
);

const cancelButton =
document.getElementById(
"cancelButton"
);

const subscriptionPlan =
document.getElementById(
"subscriptionPlan"
);

const subscriptionStatus =
document.getElementById(
"subscriptionStatus"
);

const organizationId =
document.getElementById(
"organizationId"
);

/* =========================================================
START
========================================================= */

console.log(
"⚙️ Virello Organization Settings loaded."
);

onAuthStateChanged(
auth,
async user => {


    try {

        if (!user) {

            console.log(
                "⚠️ No authenticated administrator."
            );


            window.location.href =
                "login.html";


            return;

        }


        currentUser =
            user;


        console.log(
            "✅ Settings authenticated:",
            user.email
        );


        await loadOrganization();


        if (!currentOrganization) {

            return;

        }


        populateForm();


        displaySubscription();


        hideLoading();


    }

    catch (error) {

        console.error(
            "❌ Settings initialization error:",
            error
        );


        showError(
            error.message ||
            "Unable to load organization settings."
        );

    }

}


);

/* =========================================================
LOAD ORGANIZATION
========================================================= */

async function loadOrganization() {


console.log(
    "🏢 Loading administrator organization..."
);


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


console.log(
    "🏢 Organizations found:",
    snapshot.size
);


if (snapshot.empty) {

    throw new Error(
        "No organization was found for this administrator account."
    );

}


const organizationDocument =
    snapshot.docs[0];


currentOrganization = {

    id:
        organizationDocument.id,

    ...organizationDocument.data()

};


console.log(
    "✅ Organization loaded:",
    currentOrganization
);

}

/* =========================================================
POPULATE FORM
========================================================= */

function populateForm() {


if (!currentOrganization) {

    return;

}


const organization =
    currentOrganization;


organizationNameInput.value =
    organization.organizationName ||
    organization.name ||
    "";


organizationTypeInput.value =
    organization.organizationType ||
    organization.type ||
    "";


countryInput.value =
    organization.country ||
    "";


phoneInput.value =
    organization.phone ||
    organization.phoneNumber ||
    "";


emailInput.value =
    organization.email ||
    organization.organizationEmail ||
    "";


adminNameInput.value =
    organization.adminName ||
    organization.ownerName ||
    currentUser.displayName ||
    "";


addressInput.value =
    organization.address ||
    organization.organizationAddress ||
    "";

}

/* =========================================================
DISPLAY SUBSCRIPTION
========================================================= */

function displaySubscription() {


if (!currentOrganization) {

    return;

}


const organization =
    currentOrganization;


if (subscriptionPlan) {

    subscriptionPlan.textContent =
        organization.plan ||
        organization.subscriptionPlan ||
        organization.package ||
        "Not specified";

}


if (subscriptionStatus) {

    subscriptionStatus.textContent =
        formatStatus(
            organization.status ||
            organization.subscriptionStatus ||
            "Active"
        );

}


if (organizationId) {

    organizationId.textContent =
        organization.id;

}

}

/* =========================================================
SAVE FORM
========================================================= */

if (organizationForm) {


organizationForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        try {

            if (!currentOrganization) {

                throw new Error(
                    "Organization information is not available."
                );

            }


            const name =
                organizationNameInput.value.trim();


            if (!name) {

                throw new Error(
                    "Organization name is required."
                );

            }


            saveButton.disabled =
                true;


            saveButton.textContent =
                "Saving...";


            clearStatus();


            const organizationReference =
                doc(
                    db,
                    "organizations",
                    currentOrganization.id
                );


            const updatedData = {

                organizationName:
                    name,

                organizationType:
                    organizationTypeInput.value.trim(),

                country:
                    countryInput.value.trim(),

                phone:
                    phoneInput.value.trim(),

                email:
                    emailInput.value.trim(),

                adminName:
                    adminNameInput.value.trim(),

                address:
                    addressInput.value.trim(),

                updatedAt:
                    new Date().toISOString()

            };


            await updateDoc(
                organizationReference,
                updatedData
            );


            /*
               Update local state.
            */

            currentOrganization = {

                ...currentOrganization,

                ...updatedData

            };


            displaySubscription();


            showSuccess(
                "Organization settings saved successfully."
            );


            console.log(
                "✅ Organization settings updated:",
                currentOrganization
            );


        }

        catch (error) {

            console.error(
                "❌ Unable to save settings:",
                error
            );


            showError(
                error.message ||
                "Unable to save organization settings."
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

}

/* =========================================================
CANCEL
========================================================= */

if (cancelButton) {


cancelButton.addEventListener(
    "click",
    () => {

        if (!currentOrganization) {

            return;

        }


        populateForm();


        clearStatus();

    }
);

}

/* =========================================================
SUCCESS MESSAGE
========================================================= */

function showSuccess(
message
) {


if (!statusBox) {

    return;

}


statusBox.className =
    "status-box status-success";


statusBox.textContent =
    "✓ " + message;

}

/* =========================================================
ERROR MESSAGE
========================================================= */

function showError(
message
) {

console.error(
    "❌ Virello Settings Error:",
    message
);


if (loadingScreen) {

    loadingScreen.style.display =
        "none";

}


if (settingsContent) {

    settingsContent.style.display =
        "none";

}


if (statusBox) {

    statusBox.className =
        "status-box status-error";


    statusBox.textContent =
        "Error: " + message;

}


}

/* =========================================================
CLEAR STATUS
========================================================= */

function clearStatus() {

if (!statusBox) {

    return;

}


statusBox.className =
    "status-box";


statusBox.textContent =
    "";

}

/* =========================================================
HIDE LOADING
========================================================= */

function hideLoading() {


if (loadingScreen) {

    loadingScreen.style.display =
        "none";

}


if (settingsContent) {

    settingsContent.style.display =
        "block";

}

}

/* =========================================================
FORMAT STATUS
========================================================= */

function formatStatus(
status
) {


const value =
    String(
        status || ""
    ).toLowerCase();


if (value === "active") {

    return "Active";

}


if (value === "inactive") {

    return "Inactive";

}


if (value === "expired") {

    return "Expired";

}


if (!status) {

    return "Active";

}


return status;

}

/* =========================================================
FINAL
========================================================= */

console.log(
"✅ Virello Organization Settings ready."
);
