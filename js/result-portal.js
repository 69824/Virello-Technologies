/*
=========================================================
MULTI-SCHOOL PUBLIC RESULT PORTAL
VIRELLO TECHNOLOGIES

Purpose:
Parents enter Student ID / Result Access Code
and view ONLY published results.

Firebase:
Firestore
Firebase JS SDK 12.1.0
=========================================================
*/


import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
} from "./firebase-config.js";



/*
=========================================================
DOM ELEMENTS
=========================================================
*/

const resultSearchForm =
    document.getElementById("resultSearchForm");

const resultCodeInput =
    document.getElementById("resultCode");

const searchButton =
    document.getElementById("searchButton");

const loading =
    document.getElementById("loading");

const alertBox =
    document.getElementById("alertBox");

const resultsContainer =
    document.getElementById("resultsContainer");

const studentNameElement =
    document.getElementById("studentName");

const studentIdElement =
    document.getElementById("studentId");

const studentClassElement =
    document.getElementById("studentClass");

const academicYearElement =
    document.getElementById("academicYear");

const schoolNameElement =
    document.getElementById("schoolName");

const portalSchoolNameElement =
    document.getElementById("portalSchoolName");

const schoolLogoElement =
    document.getElementById("schoolLogo");

/* Optional school-specific portal scope.
   Example: result-portal.html?organizationId=YOUR_ORGANIZATION_ID */
const portalOrganizationId =
    new URLSearchParams(window.location.search).get("organizationId");

const termButtons =
    document.getElementById("termButtons");

const resultDisplay =
    document.getElementById("resultDisplay");

const printButton =
    document.getElementById("printButton");

const newSearchButton =
    document.getElementById("newSearchButton");



/*
=========================================================
STATE
=========================================================
*/

let foundResults = [];

let selectedResult = null;

let currentSchoolBranding = {
    name: "Star Preparatory School",
    logoUrl: "./assets/star-preparatory-school-logo.png"
};

/*
=========================================================
LOCAL SCHOOL LOGO FALLBACKS
=========================================================
These are used when an older result does not yet contain
organizationLogo and the organization document has no logo URL.
New schools should preferably store logoUrl on their
organizations document; the portal will use it automatically.
*/
const SCHOOL_BRANDING_FALLBACKS = {
    "star preparatory school": {
        name: "Star Preparatory School",
        logoUrl: "./assets/star-preparatory-school-logo.png"
    },
    "wam collegiate school": {
        name: "WAM Collegiate School",
        logoUrl: "./assets/wam-collegiate-school-logo.png"
    },
    "wam collegiate": {
        name: "WAM Collegiate School",
        logoUrl: "./assets/wam-collegiate-school-logo.png"
    }
};



/*
=========================================================
INITIALIZATION
=========================================================
*/

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (resultSearchForm) {

            resultSearchForm.addEventListener(
                "submit",
                handleSearch
            );

        }


        if (printButton) {

            printButton.addEventListener(
                "click",
                () => {
                    window.print();
                }
            );

        }


        if (newSearchButton) {

            newSearchButton.addEventListener(
                "click",
                resetPortal
            );

        }

    }
);



/*
=========================================================
SEARCH RESULT
=========================================================
*/

async function handleSearch(event) {

    event.preventDefault();


    const code =
        String(
            resultCodeInput.value || ""
        )
        .trim();


    if (!code) {

        showAlert(
            "Please enter the Student ID or Result Access Code.",
            "error"
        );

        return;
    }


    clearAlert();

    hideResults();

    setLoading(true);


    try {

        /*
        -------------------------------------------------
        FIRST SEARCH:
        Student ID
        -------------------------------------------------
        */

        let results =
            await searchByField(
                "studentId",
                code
            );


        /*
        -------------------------------------------------
        SECOND SEARCH:
        Result Access Code

        This allows you to add an access-code system
        later without changing the portal.
        -------------------------------------------------
        */

        if (results.length === 0) {

            results =
                await searchByField(
                    "resultAccessCode",
                    code
                );

        }


        /*
        -------------------------------------------------
        NO RESULT
        -------------------------------------------------
        */

        if (results.length === 0) {

            showAlert(
                "No published result was found for this Student ID or Result Code. Please check the code and try again.",
                "warning"
            );

            return;
        }


        /*
        -------------------------------------------------
        STORE RESULTS
        -------------------------------------------------
        */

        foundResults =
            sortResults(results);


        /*
        -------------------------------------------------
        BUILD TERM BUTTONS
        -------------------------------------------------
        */

        buildTermButtons(
            foundResults
        );


        /*
        -------------------------------------------------
        SHOW FIRST RESULT
        -------------------------------------------------
        */

        await selectResult(
            foundResults[0]
        );


        showResults();

    } catch (error) {

        console.error(
            "Result portal search error:",
            error
        );


        showAlert(
            "The result portal is temporarily unavailable. Please try again later or contact the school.",
            "error"
        );

    } finally {

        setLoading(false);

    }

}



/*
=========================================================
SEARCH FIRESTORE
=========================================================
*/

async function searchByField(
    fieldName,
    value
) {

    const resultsRef =
        collection(
            db,
            "results"
        );


    /*
    IMPORTANT:

    We search ONLY published results.

    This prevents unpublished results
    from appearing in the public portal.
    */

    const queryConstraints = [

        where(
            fieldName,
            "==",
            value
        ),

        where(
            "status",
            "==",
            "published"
        )

    ];

    /*
       If this portal is assigned to one school, scope the
       public search to that school's organization ID.
       This prevents a Student ID shared by two schools from
       returning another school's published result.
    */
    if (portalOrganizationId) {

        queryConstraints.push(
            where(
                "organizationId",
                "==",
                portalOrganizationId
            )
        );

    }

    const resultQuery =
        query(
            resultsRef,
            ...queryConstraints
        );


    const snapshot =
        await getDocs(
            resultQuery
        );


    const results = [];


    snapshot.forEach(
        (documentSnapshot) => {

            results.push({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
            });

        }
    );


    return results;

}



/*
=========================================================
SORT RESULTS
=========================================================
*/

function sortResults(results) {

    return [...results].sort(
        (a, b) => {

            const yearA =
                String(
                    a.academicYear || ""
                );

            const yearB =
                String(
                    b.academicYear || ""
                );


            if (yearA !== yearB) {

                return yearB.localeCompare(
                    yearA
                );

            }


            const termA =
                termOrder(
                    a.term
                );

            const termB =
                termOrder(
                    b.term
                );


            return termA - termB;

        }
    );

}



/*
=========================================================
TERM ORDER
=========================================================
*/

function termOrder(term) {

    const value =
        String(
            term || ""
        )
        .toLowerCase()
        .trim();


    if (
        value.includes("first") ||
        value === "1" ||
        value.includes("term 1")
    ) {
        return 1;
    }


    if (
        value.includes("second") ||
        value === "2" ||
        value.includes("term 2")
    ) {
        return 2;
    }


    if (
        value.includes("third") ||
        value === "3" ||
        value.includes("term 3")
    ) {
        return 3;
    }


    return 99;

}



/*
=========================================================
DISPLAY STUDENT INFORMATION
=========================================================
*/

async function resolveSchoolBranding(result) {

    let organizationName =
        result?.organizationName ||
        result?.schoolName ||
        "";

    let logoUrl =
        result?.organizationLogo ||
        result?.logoUrl ||
        result?.schoolLogoUrl ||
        result?.organizationLogoUrl ||
        "";

    /* Load the publishing school's branding from Firestore. */
    if (result?.organizationId) {

        try {

            const organizationSnapshot =
                await getDoc(
                    doc(
                        db,
                        "organizations",
                        result.organizationId
                    )
                );

            if (organizationSnapshot.exists()) {

                const organization =
                    organizationSnapshot.data();

                organizationName =
                    organizationName ||
                    organization.organizationName ||
                    organization.name ||
                    "";

                logoUrl =
                    logoUrl ||
                    organization.logoUrl ||
                    organization.organizationLogo ||
                    organization.schoolLogoUrl ||
                    organization.logo ||
                    "";
            }

        } catch (error) {

            console.warn(
                "Unable to load publishing school branding:",
                error
            );
        }
    }

    /* Use a bundled logo when no logo URL is stored yet. */
    const normalizedName =
        String(organizationName || "")
            .trim()
            .toLowerCase()
            .replace(/\\s+/g, " ");

    const fallback =
        SCHOOL_BRANDING_FALLBACKS[normalizedName];

    if (!logoUrl && fallback) {
        logoUrl = fallback.logoUrl;
    }

    if (!organizationName && fallback) {
        organizationName = fallback.name;
    }

    return {
        name: organizationName || "School",
        logoUrl: logoUrl || ""
    };
}


async function displayStudentInformation(result) {

    studentNameElement.textContent =
        result.studentName ||
        "Student";

    studentIdElement.textContent =
        result.studentId ||
        result.resultAccessCode ||
        "-";

    studentClassElement.textContent =
        result.className ||
        "-";

    academicYearElement.textContent =
        result.academicYear ||
        "-";

    currentSchoolBranding =
        await resolveSchoolBranding(result);

    schoolNameElement.textContent =
        currentSchoolBranding.name;

    updatePortalHeader(
        currentSchoolBranding.name,
        currentSchoolBranding.logoUrl
    );

}


function updatePortalHeader(
    schoolName,
    logoUrl
) {

    if (portalSchoolNameElement) {
        portalSchoolNameElement.textContent =
            schoolName;
    }

    if (schoolLogoElement) {

        schoolLogoElement.innerHTML = "";

        const image =
            document.createElement("img");

        image.src =
            logoUrl ||
            "./assets/star-preparatory-school-logo.png";

        image.alt =
            `${schoolName} logo`;

        image.style.width = "100%";
        image.style.height = "100%";
        image.style.objectFit = "contain";

        image.onerror = () => {

            schoolLogoElement.textContent =
                getSchoolInitials(schoolName);
        };

        schoolLogoElement.appendChild(image);
    }

}


function getSchoolInitials(name) {

    const words =
        String(name || "School")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (words.length === 1) {
        return words[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        words[0][0] +
        words[1][0]
    ).toUpperCase();
}


/*
=========================================================
BUILD TERM BUTTONS
=========================================================
*/

function buildTermButtons(
    results
) {

    termButtons.innerHTML = "";


    /*
    Remove duplicates.

    Example:

    First Term
    First Term
    Second Term

    becomes:

    First Term
    Second Term
    */

    const uniqueKeys =
        new Set();


    results.forEach(
        (result, index) => {

            const key =
                `${result.academicYear || ""}__${result.term || ""}`;


            if (
                uniqueKeys.has(key)
            ) {
                return;
            }


            uniqueKeys.add(key);


            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "term-button";


            button.textContent =
                `${result.term || "Term"} — ${result.academicYear || ""}`;


            button.addEventListener(
                "click",
                async () => {

                    /*
                    Find the first result
                    matching this term/year.
                    */

                    const selected =
                        results.find(
                            item =>
                                String(
                                    item.term || ""
                                ) ===
                                String(
                                    result.term || ""
                                ) &&
                                String(
                                    item.academicYear || ""
                                ) ===
                                String(
                                    result.academicYear || ""
                                )
                        );


                    if (selected) {

                        await selectResult(
                            selected
                        );

                    }

                }
            );


            termButtons.appendChild(
                button
            );

        }
    );

}



/*
=========================================================
SELECT RESULT
=========================================================
*/

async function selectResult(
    result
) {

    selectedResult =
        result;
    
    /*
    Update active button
    */

    const buttons =
        termButtons.querySelectorAll(
            ".term-button"
        );


    buttons.forEach(
        button => {

            const text =
                button.textContent
                    .toLowerCase();


            const term =
                String(
                    result.term || ""
                )
                .toLowerCase();


            const year =
                String(
                    result.academicYear || ""
                )
                .toLowerCase();


            if (
                text.includes(term) &&
                text.includes(year)
            ) {

                button.classList.add(
                    "active"
                );

            } else {

                button.classList.remove(
                    "active"
                );

            }

        }
    );


    await displayStudentInformation(
        result
    );

    renderResult(
        result
    );

}




/*
=========================================================
RENDER RESULT
=========================================================
*/

function renderResult(
    result
) {

    const subjects =
        Array.isArray(
            result.subjects
        )
            ? result.subjects
            : [];


    /*
    -------------------------------------------------
    SUBJECT TABLE
    -------------------------------------------------
    */

    let subjectRows = "";


    subjects.forEach(
        subject => {

            const subjectName =
                escapeHTML(
                    subject.subject ||
                    subject.name ||
                    "-"
                );


            const ca =
                numberValue(
                    subject.ca ??
                    subject.test ??
                    subject.continuousAssessment
                );


            const exam =
                numberValue(
                    subject.exam
                );


            const total =
                numberValue(
                    subject.total
                );


            const grade =
                escapeHTML(
                    subject.grade ??
                    ""
                );


            const remark =
                escapeHTML(
                    subject.remark ||
                    ""
                );


            subjectRows += `
                <tr>

                    <td>
                        <strong>
                            ${subjectName}
                        </strong>
                    </td>

                    <td>
                        ${formatNumber(ca)}
                    </td>

                    <td>
                        ${formatNumber(exam)}
                    </td>

                    <td>
                        <strong>
                            ${formatNumber(total)}
                        </strong>
                    </td>

                    <td>
                        <span class="grade-number">
                            ${grade || "-"}
                        </span>
                    </td>

                    <td>
                        <span class="remark">
                            ${remark || "-"}
                        </span>
                    </td>

                </tr>
            `;

        }
    );


    /*
    -------------------------------------------------
    FINAL CALCULATION
    -------------------------------------------------
    */

    const finalCalculation =
        result.finalCalculation ||
        {};


    const finalTotalMarks =
        numberValue(
            finalCalculation.totalMarks ??
            result.totalMarks
        );


    const finalAverage =
        numberValue(
            finalCalculation.average ??
            result.average
        );


    const aggregate =
        finalCalculation.aggregate ??
        result.aggregate ??
        result.overallGrade ??
        "-";


    const position =
        result.position ||
        "-";


    const overallRemark =
        result.overallRemark ||
        finalCalculation.remark ||
        "-";


    const teacherComment =
        result.teacherComment ||
        "No teacher comment provided.";


    const principalComment =
        result.principalComment ||
        "No principal comment provided.";


    /*
    -------------------------------------------------
    COMPULSORY SUBJECTS
    -------------------------------------------------
    */

    const compulsorySubjects =
        Array.isArray(
            finalCalculation.compulsorySubjects
        )
            ? finalCalculation.compulsorySubjects
            : [];


    const bestAdditionalSubjects =
        Array.isArray(
            finalCalculation.bestAdditionalSubjects
        )
            ? finalCalculation.bestAdditionalSubjects
            : [];


    const countedSubjects =
        Array.isArray(
            finalCalculation.subjectsCounted
        )
            ? finalCalculation.subjectsCounted
            : [];


    /*
    -------------------------------------------------
    CALCULATION DESCRIPTION
    -------------------------------------------------
    */

    let calculationHTML = "";


    if (
        compulsorySubjects.length > 0 ||
        bestAdditionalSubjects.length > 0
    ) {

        calculationHTML = `
            <div
                style="
                    margin-top:25px;
                    padding:18px;
                    border:1px solid #e4e7ec;
                    border-radius:10px;
                    background:#f8fafc;
                "
            >

                <strong
                    style="
                        color:#0b3d91;
                        display:block;
                        margin-bottom:10px;
                    "
                >
                    Final Grade Calculation
                </strong>

                <div
                    style="
                        line-height:1.7;
                        color:#475467;
                    "
                >

                    4 Compulsory Subjects:
                    <strong>
                        ${compulsorySubjects.length}
                    </strong>

                    <br>

                    Best Additional Subjects:
                    <strong>
                        ${bestAdditionalSubjects.length}
                    </strong>

                    <br>

                    Subjects Counted:
                    <strong>
                        ${countedSubjects.length || 6}
                    </strong>

                    <br>

                    Final Aggregate:
                    <strong
                        style="
                            color:#0b3d91;
                            font-size:20px;
                        "
                    >
                        ${escapeHTML(String(aggregate))}
                    </strong>

                </div>

            </div>
        `;

    }


    /*
    -------------------------------------------------
    COMPLETE RESULT HTML
    -------------------------------------------------
    */

    const resultLogo =
        currentSchoolBranding.logoUrl ||
        result.organizationLogo ||
        result.logoUrl ||
        result.schoolLogoUrl ||
        "./assets/star-preparatory-school-logo.png";

    const resultSchoolName =
        currentSchoolBranding.name ||
        result.organizationName ||
        result.schoolName ||
        "School";

    resultDisplay.innerHTML = `

        <div style="text-align:center; margin-bottom:20px;">
            <img
                class="result-portal-logo"
                src="${escapeHTML(resultLogo)}"
                alt="${escapeHTML(resultSchoolName)} logo"
                onerror="this.style.display='none'"
            >
            <div style="font-size:22px; font-weight:800; color:var(--primary);">
                ${escapeHTML(resultSchoolName)}
            </div>
        </div>

        <div class="result-card-header">

            <div>

                <div class="result-card-title">
                    ${escapeHTML(
                        result.term ||
                        "Student Result"
                    )}
                </div>

                <div class="result-card-subtitle">
                    Academic Year:
                    ${escapeHTML(
                        result.academicYear ||
                        "-"
                    )}
                </div>

            </div>

            <div class="published-badge">
                ✓ OFFICIALLY PUBLISHED
            </div>

        </div>


        <div class="table-wrapper">

            <table class="result-table">

                <thead>

                    <tr>

                        <th>
                            Subject
                        </th>

                        <th>
                            Test
                        </th>

                        <th>
                            Exam
                        </th>

                        <th>
                            Total
                        </th>

                        <th>
                            Grade
                        </th>

                        <th>
                            Remark
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${
                        subjectRows ||
                        `
                            <tr>
                                <td
                                    colspan="6"
                                    style="
                                        text-align:center;
                                        padding:25px;
                                    "
                                >
                                    No subject records available.
                                </td>
                            </tr>
                        `
                    }

                </tbody>

            </table>

        </div>


        <div class="summary-grid">

            <div class="summary-box">

                <div class="summary-label">
                    Final Marks
                </div>

                <div class="summary-value">
                    ${formatNumber(finalTotalMarks)}
                </div>

            </div>


            <div class="summary-box">

                <div class="summary-label">
                    Final Average
                </div>

                <div class="summary-value">
                    ${formatNumber(finalAverage)}%
                </div>

            </div>


            <div class="summary-box">

                <div class="summary-label">
                    Final Aggregate
                </div>

                <div class="summary-value">
                    ${escapeHTML(
                        String(aggregate)
                    )}
                </div>

            </div>


            <div class="summary-box">

                <div class="summary-label">
                    Position
                </div>

                <div class="summary-value">
                    ${escapeHTML(
                        String(position)
                    )}
                </div>

            </div>

        </div>


        ${calculationHTML}


        <div
            style="
                margin-top:20px;
                padding:15px;
                border-radius:10px;
                background:#f8fafc;
                border:1px solid #e4e7ec;
            "
        >

            <strong
                style="
                    color:#0b3d91;
                "
            >
                Overall Remark
            </strong>

            <div
                style="
                    margin-top:7px;
                    color:#475467;
                "
            >
                ${escapeHTML(
                    String(overallRemark)
                )}
            </div>

        </div>


        <div class="comments-section">

            <div class="comment-box">

                <div class="comment-title">
                    Teacher's Comment
                </div>

                <div class="comment-text">
                    ${escapeHTML(
                        String(teacherComment)
                    )}
                </div>

            </div>


            <div class="comment-box">

                <div class="comment-title">
                    Principal's Comment
                </div>

                <div class="comment-text">
                    ${escapeHTML(
                        String(principalComment)
                    )}
                </div>

            </div>

        </div>

    `;

}



/*
=========================================================
NUMBER VALUE
=========================================================
*/

function numberValue(value) {

    const number =
        Number(value);


    if (
        Number.isFinite(number)
    ) {

        return number;

    }


    return 0;

}



/*
=========================================================
FORMAT NUMBER
=========================================================
*/

function formatNumber(value) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "0";

    }


    return number
        .toFixed(2)
        .replace(
            /\.00$/,
            ""
        );

}



/*
=========================================================
ESCAPE HTML
=========================================================
*/

function escapeHTML(value) {

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



/*
=========================================================
LOADING
=========================================================
*/

function setLoading(
    state
) {

    if (loading) {

        loading.style.display =
            state
                ? "block"
                : "none";

    }


    if (searchButton) {

        searchButton.disabled =
            state;


        searchButton.textContent =
            state
                ? "SEARCHING..."
                : "CHECK RESULT";

    }

}



/*
=========================================================
ALERT
=========================================================
*/

function showAlert(
    message,
    type = "error"
) {

    if (!alertBox) {
        return;
    }


    alertBox.textContent =
        message;


    alertBox.className =
        `alert ${type}`;


    alertBox.style.display =
        "block";

}



function clearAlert() {

    if (!alertBox) {
        return;
    }


    alertBox.textContent =
        "";


    alertBox.style.display =
        "none";

}



/*
=========================================================
SHOW RESULTS
=========================================================
*/

function showResults() {

    if (resultsContainer) {

        resultsContainer.style.display =
            "block";

    }

}



/*
=========================================================
HIDE RESULTS
=========================================================
*/

function hideResults() {

    if (resultsContainer) {

        resultsContainer.style.display =
            "none";

    }

}



/*
=========================================================
RESET PORTAL
=========================================================
*/

function resetPortal() {

    foundResults = [];

    selectedResult = null;


    if (resultCodeInput) {

        resultCodeInput.value =
            "";

        resultCodeInput.focus();

    }


    if (termButtons) {

        termButtons.innerHTML =
            "";

    }


    if (resultDisplay) {

        resultDisplay.innerHTML =
            "";

    }


    hideResults();

    clearAlert();

}



/*
=========================================================
END
=========================================================
*/

console.log(
    "Virello Technologies Result Portal loaded successfully."
);
