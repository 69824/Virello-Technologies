/* =========================================================
   VIRELLO TECHNOLOGIES
   ACADEMIC RESULT VERIFICATION
   ========================================================= */

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
} from "./firebase-config.js";


/* =========================================================
   DOM
   ========================================================= */

const loadingState =
    document.getElementById(
        "loadingState"
    );

const invalidState =
    document.getElementById(
        "invalidState"
    );

const validState =
    document.getElementById(
        "validState"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );

const studentName =
    document.getElementById(
        "studentName"
    );

const studentId =
    document.getElementById(
        "studentId"
    );

const studentClass =
    document.getElementById(
        "studentClass"
    );

const academicYear =
    document.getElementById(
        "academicYear"
    );

const term =
    document.getElementById(
        "term"
    );

const schoolName =
    document.getElementById(
        "schoolName"
    );

const average =
    document.getElementById(
        "average"
    );

const aggregate =
    document.getElementById(
        "aggregate"
    );

const position =
    document.getElementById(
        "position"
    );

const resultAccessCode =
    document.getElementById(
        "resultAccessCode"
    );


/* =========================================================
   GET URL PARAMETERS
   ========================================================= */

const params =
    new URLSearchParams(
        window.location.search
    );

const resultId =
    String(
        params.get("id") ||
        ""
    ).trim();

const accessCode =
    String(
        params.get("code") ||
        ""
    )
    .trim()
    .toUpperCase();


/* =========================================================
   START
   ========================================================= */

verifyResult();


/* =========================================================
   VERIFY RESULT
   ========================================================= */

async function verifyResult() {

    try {

        let result = null;


        /*
         * =================================================
         * METHOD 1
         * DIRECT FIRESTORE DOCUMENT ID
         * =================================================
         */

        if (resultId) {

            const resultRef =
                doc(
                    db,
                    "results",
                    resultId
                );

            const snapshot =
                await getDoc(
                    resultRef
                );


            if (
                snapshot.exists()
            ) {

                result = {

                    id:
                        snapshot.id,

                    ...snapshot.data()

                };

            }

        }


        /*
         * =================================================
         * METHOD 2
         * RESULT ACCESS CODE
         * =================================================
         */

        if (
            !result &&
            accessCode
        ) {

            const resultsRef =
                collection(
                    db,
                    "results"
                );


            /*
             * IMPORTANT:
             *
             * The public Firestore rule allows
             * published results to be read.
             *
             * Therefore the query includes
             * status == published.
             */

            const resultQuery =
                query(

                    resultsRef,

                    where(
                        "resultAccessCode",
                        "==",
                        accessCode
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


            if (
                !snapshot.empty
            ) {

                const resultDocument =
                    snapshot.docs[0];


                result = {

                    id:
                        resultDocument.id,

                    ...resultDocument.data()

                };

            }

        }


        /*
         * =================================================
         * NO RESULT
         * =================================================
         */

        if (!result) {

            showInvalid(
                "The result could not be found, or it has not been published by the school."
            );

            return;

        }


        /*
         * =================================================
         * SECURITY CHECK
         * =================================================
         *
         * Never show drafts through the
         * verification page.
         */

        if (
            result.status !==
            "published"
        ) {

            showInvalid(
                "This result has not been officially published and cannot be verified."
            );

            return;

        }


        /*
         * =================================================
         * DISPLAY VERIFIED RESULT
         * =================================================
         */

        displayResult(
            result
        );

    }

    catch (error) {

        console.error(
            "Result verification error:",
            error
        );


        showInvalid(
            error.message ||
            "Unable to verify this result. Please try again."
        );

    }

}


/* =========================================================
   DISPLAY RESULT
   ========================================================= */

function displayResult(
    result
) {

    loadingState.classList.add(
        "hidden"
    );

    invalidState.classList.add(
        "hidden"
    );

    validState.classList.remove(
        "hidden"
    );


    studentName.textContent =
        result.studentName ||
        "—";


    studentId.textContent =
        result.studentId ||
        "—";


    studentClass.textContent =
        result.className ||
        "—";


    academicYear.textContent =
        result.academicYear ||
        "—";


    term.textContent =
        result.term ||
        "—";


    schoolName.textContent =
        result.schoolName ||
        "Star Preparatory School";


    const averageValue =
        Number(
            result.average ??
            result.finalCalculation?.average ??
            0
        );


    average.textContent =
        `${averageValue.toFixed(2)}%`;


    const aggregateValue =
        result.aggregate ??
        result.finalCalculation?.aggregate ??
        result.overallGrade ??
        "—";


    aggregate.textContent =
        aggregateValue;


    position.textContent =
        result.position ||
        "—";


    const code =
        result.resultAccessCode ||
        result.resultCode ||
        accessCode ||
        "—";


    resultAccessCode.textContent =
        code;

}


/* =========================================================
   INVALID RESULT
   ========================================================= */

function showInvalid(
    message
) {

    loadingState.classList.add(
        "hidden"
    );

    validState.classList.add(
        "hidden"
    );

    invalidState.classList.remove(
        "hidden"
    );


    errorMessage.textContent =
        message;

}


/* =========================================================
   READY
   ========================================================= */

console.log(
    "Virello Result Verification loaded successfully."
);
