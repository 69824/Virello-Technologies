/*
=========================================================
STAR PREPARATORY SCHOOL
VIRELLO TECHNOLOGIES
PUBLIC RESULT PORTAL

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
    getDocs
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
        SHOW STUDENT INFORMATION
        -------------------------------------------------
        */

        displayStudentInformation(
            foundResults[0]
        );


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

        selectResult(
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

    const resultQuery =
        query(
            resultsRef,

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

function displayStudentInformation(
    result
) {

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


    schoolNameElement.textContent =
        "Star Preparatory School";

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
                () => {

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

                        selectResult(
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

function selectResult(
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

    resultDisplay.innerHTML = `

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
