/* =========================================================
   VIRELLO TECHNOLOGIES
   PARENT DASHBOARD ATTENDANCE ALERT BADGE

   Shows unread attendance alerts for the
   authenticated parent.
========================================================= */

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


/* =========================================================
   LOAD UNREAD ALERT COUNT
========================================================= */

async function loadParentUnreadAlerts() {

    try {

        const user =
            auth.currentUser;


        if (!user) {
            return;
        }


        const alertsRef =
            collection(
                db,
                "attendanceAlerts"
            );


        const alertsQuery =
            query(

                alertsRef,

                where(
                    "parentUid",
                    "==",
                    user.uid
                ),

                where(
                    "read",
                    "==",
                    false
                )

            );


        const snapshot =
            await getDocs(
                alertsQuery
            );


        const badge =
            document.getElementById(
                "parentUnreadAlertBadge"
            );


        if (!badge) {
            return;
        }


        const count =
            snapshot.size;


        if (count > 0) {

            badge.textContent =
                count > 99
                    ? "99+"
                    : count;


            badge.style.display =
                "inline-block";

        }

        else {

            badge.style.display =
                "none";

        }


        console.log(
            "🔔 Unread parent attendance alerts:",
            count
        );

    }

    catch (error) {

        console.error(
            "❌ Unable to load unread attendance alerts:",
            error
        );

    }

}


/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(
    auth,
    user => {

        if (!user) {
            return;
        }


        loadParentUnreadAlerts();

    }
);


/* =========================================================
   REFRESH WHEN PAGE RETURNS
========================================================= */

window.addEventListener(
    "focus",
    () => {

        if (auth.currentUser) {

            loadParentUnreadAlerts();

        }

    }
);


console.log(
    "✅ Virello parent dashboard alert badge loaded."
);
