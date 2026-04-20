(() => {
    const prolificId = localStorage.getItem("searchEngineUseStudyProlificId");
    const treatmentCondition = localStorage.getItem("searchEngineUseStudyTreatmentCondition");

    const isValid = prolificId && prolificId.trim() !== "" &&
                    treatmentCondition && !isNaN(parseInt(treatmentCondition, 10));

    if (isValid) {
        window.location.href = `https://placeholder-feedback-form.example.com?PROLIFIC_PID=${prolificId}&TC=${treatmentCondition}`;
    }
})();
