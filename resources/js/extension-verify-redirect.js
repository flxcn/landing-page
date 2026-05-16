(() => {
    // This script only owns the manual-entry form. The extension's onboard.ts content
    // script owns the auto-detect path (read localStorage → save assignment → run gate →
    // redirect to feedback.org). On form submit we write localStorage and reload so
    // onboard.ts picks up the values on the next page load.
    const API_BASE = 'https://oge9hzemfc.execute-api.us-east-2.amazonaws.com/default/';
    const PROLIFIC_ID_KEY = 'searchEngineEngagementStudyProlificId';
    const TREATMENT_CONDITION_KEY = 'searchEngineEngagementStudyTreatmentCondition';

    function isValid(prolificId, treatmentCondition) {
        return prolificId && prolificId.trim() !== '' &&
               treatmentCondition && !isNaN(parseInt(treatmentCondition, 10));
    }

    function renderForm() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.05); z-index: 999998;
            font-family: Arial, sans-serif;
        `;

        const card = document.createElement('div');
        card.style.cssText = `
            background: #fff; border-radius: 12px; padding: 32px 40px;
            max-width: 420px; width: 90%;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15); text-align: center;
        `;

        const title = document.createElement('h2');
        title.style.cssText = 'margin: 0 0 8px; font-size: 20px; color: #1a1a1a;';
        title.textContent = 'Enter your Prolific Participant ID';

        const subtitle = document.createElement('p');
        subtitle.style.cssText = 'margin: 0 0 24px; font-size: 14px; color: #555;';
        subtitle.textContent = 'We could not detect your study credentials automatically. Please enter your Prolific Participant ID to continue.';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Prolific Participant ID';
        input.style.cssText = `
            width: 100%; box-sizing: border-box; padding: 10px 14px;
            font-size: 15px; border: 1px solid #ccc; border-radius: 6px;
            margin-bottom: 16px; outline: none;
        `;

        const button = document.createElement('button');
        button.textContent = 'Continue';
        button.style.cssText = `
            width: 100%; padding: 11px; font-size: 15px; font-weight: bold;
            background: #1a73e8; color: #fff; border: none; border-radius: 6px;
            cursor: pointer;
        `;

        const status = document.createElement('p');
        status.style.cssText = 'margin: 12px 0 0; font-size: 13px; color: #555; min-height: 18px;';

        async function submit() {
            const prolificId = input.value.trim();
            if (!prolificId) {
                status.style.color = '#b71c1c';
                status.textContent = 'Please enter a Participant ID.';
                return;
            }

            button.disabled = true;
            input.disabled = true;
            status.style.color = '#555';
            status.textContent = 'Looking up your assignment…';

            let treatmentCondition = null;
            try {
                const response = await fetch(API_BASE + '?prolificId=' + encodeURIComponent(prolificId));
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.treatmentCondition !== undefined && data.treatmentCondition !== null) {
                        treatmentCondition = String(data.treatmentCondition);
                    }
                }
            } catch (error) {
                // Network/parse error — fall through to the same not-found path.
            }

            if (!isValid(prolificId, treatmentCondition)) {
                button.disabled = false;
                input.disabled = false;
                status.style.color = '#b71c1c';
                status.textContent = 'Prolific ID not found. Please check and try again.';
                return;
            }

            localStorage.setItem(PROLIFIC_ID_KEY, prolificId);
            localStorage.setItem(TREATMENT_CONDITION_KEY, treatmentCondition);
            // Reload so onboard.ts (content script) picks up the values, saves the
            // assignment, runs the Google-app gate, and redirects to feedback.org.
            window.location.reload();
        }

        button.addEventListener('click', submit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
        });

        card.appendChild(title);
        card.appendChild(subtitle);
        card.appendChild(input);
        card.appendChild(button);
        card.appendChild(status);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        input.focus();
    }

    function init() {
        const prolificId = localStorage.getItem(PROLIFIC_ID_KEY);
        const treatmentCondition = localStorage.getItem(TREATMENT_CONDITION_KEY);

        // If localStorage is already populated, do nothing — the extension's onboard.ts
        // will read the same values, save the assignment, and drive the rest of the flow.
        if (isValid(prolificId, treatmentCondition)) return;

        renderForm();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
