/* =========================================================
   VIRELLO ADMISSIONS DASHBOARD INTEGRATION
   Add this file to js/ and load it from dashboard.html.
   It injects Admissions into the existing Quick Actions area
   without changing the existing dashboard.js logic.
========================================================= */

(() => {
    const injectAdmissions = () => {
        const grid = document.querySelector('.actions-grid');
        if (!grid || document.getElementById('virelloAdmissionsCard')) return;

        const card = document.createElement('a');
        card.id = 'virelloAdmissionsCard';
        card.href = 'admissions-admin.html';
        card.className = 'action-card';
        card.innerHTML = `
            <div class="action-icon">📝</div>
            <h3>Admissions</h3>
            <p>Receive online applications, review documents, approve applicants and enrol new students.</p>
        `;

        const resultsCard = [...grid.querySelectorAll('a.action-card')]
            .find(a => (a.getAttribute('href') || '') === 'results.html');

        if (resultsCard) {
            resultsCard.insertAdjacentElement('beforebegin', card);
        } else {
            grid.prepend(card);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectAdmissions);
    } else {
        injectAdmissions();
    }

    // dashboard.html renders its cards statically, but this observer makes
    // the integration resilient if the dashboard markup is rendered later.
    const observer = new MutationObserver(injectAdmissions);
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
