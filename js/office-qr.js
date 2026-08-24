/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/office-qr.js

   STEP:
   5C

   PURPOSE:
   OFFICIAL OFFICE QR GENERATOR

   HOSTING VERSION:
   No local IPv4 address.
   No localhost.
   No 127.0.0.1.

   IMPORTANT:
   The QR automatically uses the same
   hosted website where this page is running.

   Example after hosting:

   https://yourdomain.com/worker.html

   The QR will automatically point to:

   https://yourdomain.com/worker.html

   This version does NOT use qrcodejs/cdnjs.
   It uses QRServer to generate the QR image.
========================================================= */


/* =========================================================
   SETTINGS
========================================================= */

const QR_LIFETIME_SECONDS = 30;


/*
   Worker page.

   IMPORTANT:

   We do NOT hard-code an IP address.

   The browser automatically uses the
   current hosted website's domain.
*/

const WORKER_PAGE =
    "worker.html";


/* =========================================================
   GLOBAL STATE
========================================================= */

let countdownTimer = null;

let countdownSeconds =
    QR_LIFETIME_SECONDS;

let currentQRUrl = "";


/* =========================================================
   DOM
========================================================= */

const officeQR =
    document.getElementById(
        "officeQR"
    );


const qrStatus =
    document.getElementById(
        "qrStatus"
    );


const countdown =
    document.getElementById(
        "countdown"
    );


const generateButton =
    document.getElementById(
        "generateButton"
    );


const qrUrl =
    document.getElementById(
        "qrUrl"
    );


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🔥 Virello Office QR Generator starting..."
        );


        console.log(
            "🌐 Current hosted website:",
            window.location.origin
        );


        console.log(
            "🌐 Worker page:",
            getWorkerPageURL().toString()
        );


        if (generateButton) {

            generateButton.addEventListener(
                "click",
                generateOfficeQR
            );

        }


        generateOfficeQR();

    }
);


/* =========================================================
   GENERATE RANDOM TOKEN
========================================================= */

function generateToken() {

    const array =
        new Uint8Array(24);


    crypto.getRandomValues(
        array
    );


    return Array
        .from(array)
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    )
        )
        .join("");

}


/* =========================================================
   GET WORKER PAGE URL
========================================================= */

function getWorkerPageURL() {

    const workerURL =
        new URL(
            "worker.html",
            "https://69824.github.io/Virello-Technologies/"
        );

    console.log(
        "🌐 Worker URL created:",
        workerURL.toString()
    );

    return workerURL;
}

/* =========================================================
   BUILD ATTENDANCE URL
========================================================= */

function buildAttendanceURL() {

    const timestamp =
        Date.now();


    const token =
        generateToken();


    const workerURL =
        getWorkerPageURL();


    /* =====================================================
       OFFICE QR IDENTIFIER
    ===================================================== */

    workerURL.searchParams.set(
        "officeQR",
        "1"
    );


    /* =====================================================
       QR CREATION TIME
    ===================================================== */

    workerURL.searchParams.set(
        "timestamp",
        timestamp
    );


    /* =====================================================
       RANDOM QR TOKEN
    ===================================================== */

    workerURL.searchParams.set(
        "token",
        token
    );


    const finalURL =
        workerURL.toString();


    console.log(
        "🔗 Final Office QR URL:",
        finalURL
    );


    return {

        url:
            finalURL,

        timestamp:
            timestamp,

        token:
            token

    };

}


/* =========================================================
   CREATE QR IMAGE URL
========================================================= */

function buildQRImageURL(
    data
) {

    /*
       QRServer creates the QR image.

       No qrcodejs.
       No cdnjs.
       No browser QR library.
    */


    const encodedData =
        encodeURIComponent(
            data
        );


    const imageURL =
        "https://api.qrserver.com/v1/create-qr-code/" +
        "?size=500x500" +
        "&margin=10" +
        "&data=" +
        encodedData;


    console.log(
        "🖼 QR image URL created."
    );


    return imageURL;

}


/* =========================================================
   GENERATE OFFICE QR
========================================================= */

async function generateOfficeQR() {

    console.log(
        "🔄 Generating new Office QR..."
    );


    if (generateButton) {

        generateButton.disabled =
            true;


        generateButton.textContent =
            "Generating...";

    }


    setStatus(
        "loading",
        "Generating new Office QR..."
    );


    clearQR();


    try {

        /* =================================================
           BUILD ATTENDANCE URL
        ================================================= */

        const access =
            buildAttendanceURL();


        currentQRUrl =
            access.url;


        console.log(
            "🔗 Office QR URL:",
            currentQRUrl
        );


        /* =================================================
           DISPLAY URL
        ================================================= */

        if (qrUrl) {

            qrUrl.textContent =
                currentQRUrl;

        }


        /* =================================================
           CREATE QR IMAGE URL
        ================================================= */

        const imageURL =
            buildQRImageURL(
                currentQRUrl
            );


        /* =================================================
           CREATE IMAGE
        ================================================= */

        const image =
            document.createElement(
                "img"
            );


        image.alt =
            "Virello Official Office QR Code";


        image.width =
            250;


        image.height =
            250;


        image.loading =
            "eager";


        image.decoding =
            "async";


        image.referrerPolicy =
            "no-referrer";


        image.style.display =
            "block";


        image.style.width =
            "250px";


        image.style.height =
            "250px";


        image.style.margin =
            "0 auto";


        /* =================================================
           IMAGE LOAD SUCCESS
        ================================================= */

        image.onload =
            () => {

                console.log(
                    "✅ Office QR generated successfully."
                );


                if (officeQR) {

                    officeQR.innerHTML =
                        "";


                    officeQR.appendChild(
                        image
                    );

                }


                setStatus(
                    "success",
                    "✓ Official Office QR is active"
                );


                startCountdown();

            };


        /* =================================================
           IMAGE LOAD ERROR
        ================================================= */

        image.onerror =
            () => {

                console.error(
                    "❌ Unable to load QR image."
                );


                setStatus(
                    "error",
                    "QR Generation Failed"
                );


                if (officeQR) {

                    officeQR.innerHTML =
                        `
                        <div
                            style="
                                color:#b91c1c;
                                font-size:13px;
                                font-weight:700;
                                text-align:center;
                                padding:20px;
                            "
                        >
                            Unable to generate QR code.
                            Please check your internet connection.
                        </div>
                        `;

                }

            };


        /* =================================================
           START IMAGE REQUEST
        ================================================= */

        image.src =
            imageURL;


    } catch (error) {

        console.error(
            "❌ QR generation error:",
            error
        );


        setStatus(
            "error",
            "QR Generation Failed"
        );


        if (officeQR) {

            officeQR.innerHTML =
                `
                <div
                    style="
                        color:#b91c1c;
                        font-size:13px;
                        font-weight:700;
                        text-align:center;
                        padding:20px;
                    "
                >
                    Unable to generate the Office QR code.
                </div>
                `;

        }

    } finally {

        if (generateButton) {

            generateButton.disabled =
                false;


            generateButton.textContent =
                "Generate New QR Code";

        }

    }

}


/* =========================================================
   CLEAR QR
========================================================= */

function clearQR() {

    if (!officeQR) {
        return;
    }


    officeQR.innerHTML =
        `
        <div
            style="
                color:#64748b;
                font-size:12px;
                font-weight:700;
                text-align:center;
            "
        >
            Generating...
        </div>
        `;

}


/* =========================================================
   STATUS
========================================================= */

function setStatus(
    type,
    message
) {

    if (!qrStatus) {
        return;
    }


    qrStatus.className =
        "status " +
        type;


    qrStatus.textContent =
        message;

}


/* =========================================================
   COUNTDOWN
========================================================= */

function startCountdown() {

    stopCountdown();


    countdownSeconds =
        QR_LIFETIME_SECONDS;


    updateCountdown();


    countdownTimer =
        setInterval(
            () => {

                countdownSeconds--;


                updateCountdown();


                if (
                    countdownSeconds <= 0
                ) {

                    stopCountdown();


                    console.log(
                        "⏱ Office QR expired. Generating new QR..."
                    );


                    generateOfficeQR();

                }

            },
            1000
        );

}


/* =========================================================
   UPDATE COUNTDOWN
========================================================= */

function updateCountdown() {

    if (!countdown) {
        return;
    }


    countdown.textContent =
        String(
            Math.max(
                0,
                countdownSeconds
            )
        );


    if (
        countdownSeconds <= 5
    ) {

        countdown.style.color =
            "#dc2626";

    } else {

        countdown.style.color =
            "#2563eb";

    }

}


/* =========================================================
   STOP COUNTDOWN
========================================================= */

function stopCountdown() {

    if (
        countdownTimer
    ) {

        clearInterval(
            countdownTimer
        );


        countdownTimer =
            null;

    }

}


/* =========================================================
   FINAL LOG
========================================================= */

console.log(
    "✅ Virello Office QR Generator loaded."
);


console.log(
    "🌐 Hosting-safe QR system enabled."
);


console.log(
    "🌐 Worker page:",
    getWorkerPageURL().toString()
);
