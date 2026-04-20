(() => {
    localStorage.setItem("searchEngineEngagementStudyProlificId", "TEST_PROLIFIC_ID");
    localStorage.setItem("searchEngineEngagementStudyTreatmentCondition", "1");

    const prolificId = localStorage.getItem("searchEngineEngagementStudyProlificId");
    const treatmentCondition = localStorage.getItem("searchEngineEngagementStudyTreatmentCondition");

    const isValid = prolificId && prolificId.trim() !== "" &&
                    treatmentCondition && !isNaN(parseInt(treatmentCondition, 10));

    if (isValid) {
        window.location.href = `https://placeholder-feedback-form.example.com?PROLIFIC_PID=${prolificId}&TC=${treatmentCondition}`;
    }
})();
