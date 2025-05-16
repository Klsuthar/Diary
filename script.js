document.addEventListener('DOMContentLoaded', () => {
    const diaryForm = document.getElementById('diaryForm');
    const importJsonButton = document.getElementById('importJsonButton');
    const jsonFileInput = document.getElementById('jsonFile');
    const saveFormButton = document.getElementById('saveFormButton');
    const toastContainer = document.getElementById('toast-container');
    const downloadButton = document.getElementById('downloadButton');

    const dateInput = document.getElementById('date');
    const dateIncrementButton = document.getElementById('dateIncrement');
    const dateDecrementButton = document.getElementById('dateDecrement');
    const currentDateDisplay = document.getElementById('currentDateDisplay');
    const topBarClearButton = document.getElementById('topBarClearButton');

    const bottomNavButtons = document.querySelectorAll('.bottom-nav-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const tabViewPort = document.getElementById('tabViewPort');
    const tabPanelsSlider = document.getElementById('tabPanelsSlider');

    const energyLevelSlider = document.getElementById('energyLevel');
    const energyLevelValueDisplay = document.getElementById('energyLevelValue');
    const stressLevelSlider = document.getElementById('stressLevel');
    const stressLevelValueDisplay = document.getElementById('stressLevelValue');
    const humidityPercentSlider = document.getElementById('humidityPercent');
    const humidityPercentValueDisplay = document.getElementById('humidityPercentValue');
    const uvIndexSlider = document.getElementById('uvIndex');
    const uvIndexValueDisplay = document.getElementById('uvIndexValue');


    const dailyActivitySummaryTextarea = document.getElementById('dailyActivitySummary');
    const summaryCountsDisplay = document.getElementById('summaryCounts');

    const REFERENCE_START_DATE = new Date(2003, 6, 4); // July is month 6 (0-indexed)
    const LOCAL_STORAGE_KEY = 'myPersonalDiaryFormData';
    const MAX_SUGGESTIONS_PER_FIELD = 7;

    let currentTabIndex = 0;
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50;

    let isKeyboardOpen = false;
    let viewportHeightBeforeKeyboard = window.innerHeight;
    const MIN_KEYBOARD_HEIGHT_PX = 150;

    const suggestionConfigs = [
        { key: 'myPersonalDiaryPersonalCareSuggestions', fieldIds: ['faceProductName', 'faceProductBrand', 'hairProductName', 'hairProductBrand', 'hairOil', 'skincareRoutine'] },
        { key: 'myPersonalDiaryDietSuggestions', fieldIds: ['breakfast', 'lunch', 'dinner', 'additionalItems'] } 
    ];

    function isPotentiallyFocusableForKeyboard(element) {
        if (!element) return false;
        const tagName = element.tagName;
        const type = element.type;
        if (tagName === 'TEXTAREA') return true;
        if (tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'date', 'color'].includes(type)) {
            return true;
        }
        return false;
    }

    function updateKeyboardStatus() {
        const currentWindowHeight = window.innerHeight;
        const activeElement = document.activeElement;
        const isTextInputActive = isPotentiallyFocusableForKeyboard(activeElement);

        if (isTextInputActive) {
            if (viewportHeightBeforeKeyboard - currentWindowHeight > MIN_KEYBOARD_HEIGHT_PX) {
                isKeyboardOpen = true;
            } else if (currentWindowHeight > (viewportHeightBeforeKeyboard - MIN_KEYBOARD_HEIGHT_PX + (MIN_KEYBOARD_HEIGHT_PX / 3))) {
                 isKeyboardOpen = false;
                 viewportHeightBeforeKeyboard = currentWindowHeight;
            }
        } else {
            isKeyboardOpen = false;
            viewportHeightBeforeKeyboard = currentWindowHeight;
        }
    }

    window.addEventListener('resize', updateKeyboardStatus);

    diaryForm.addEventListener('focusin', (event) => {
        if (isPotentiallyFocusableForKeyboard(event.target)) {
            viewportHeightBeforeKeyboard = window.innerHeight;
        }
    });

    diaryForm.addEventListener('focusout', (event) => {
         if (isPotentiallyFocusableForKeyboard(event.target)) {
            setTimeout(() => {
                isKeyboardOpen = false;
                viewportHeightBeforeKeyboard = window.innerHeight;
                updateKeyboardStatus();
            }, 100);
        }
    });

    function setButtonLoadingState(button, isLoading, originalIconHTML = null) {
        if (!button) return;
        const iconElement = button.querySelector('i');
        if (isLoading) {
            button.disabled = true;
            if (iconElement) {
                if (!button.dataset.originalIcon) button.dataset.originalIcon = iconElement.outerHTML;
                iconElement.className = 'fas fa-spinner fa-spin';
            }
        } else {
            button.disabled = false;
            if (iconElement && button.dataset.originalIcon) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = button.dataset.originalIcon;
                iconElement.className = tempDiv.firstChild.className;
            } else if (iconElement && originalIconHTML) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = originalIconHTML;
                iconElement.className = tempDiv.firstChild.className;
            }
        }
    }

    function showToast(message, type = 'info') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.classList.add('toast', type);
        let iconClass = 'fas fa-info-circle';
        if (type === 'success') iconClass = 'fas fa-check-circle';
        else if (type === 'error') iconClass = 'fas fa-times-circle';
        toast.innerHTML = `<i class="${iconClass}"></i> <p>${message}</p>`;
        
        if (toastContainer.firstChild) {
            toastContainer.insertBefore(toast, toastContainer.firstChild);
        } else {
            toastContainer.appendChild(toast);
        }
        setTimeout(() => { toast.remove(); }, 3000);
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function updateCurrentDateDisplay(dateStr) {
        if (currentDateDisplay) {
            if (dateStr) {
                try {
                    const [year, month, day] = dateStr.split('-').map(Number);
                    const dateObj = new Date(year, month - 1, day);
                    if (isNaN(dateObj.getTime())) {
                        currentDateDisplay.innerHTML = `Invalid Date <i class="fas fa-calendar-alt date-display-icon"></i>`;
                    } else {
                        currentDateDisplay.innerHTML = `${dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} <i class="fas fa-calendar-alt date-display-icon"></i>`;
                    }
                } catch (e) {
                    currentDateDisplay.innerHTML = `Select Date <i class="fas fa-calendar-alt date-display-icon"></i>`;
                }
            } else {
                currentDateDisplay.innerHTML = `Select Date <i class="fas fa-calendar-alt date-display-icon"></i>`;
            }
        }
    }

    function changeDate(days) {
        let currentDateValue;
        if (dateInput.value) {
            const [year, month, day] = dateInput.value.split('-').map(Number);
            currentDateValue = new Date(year, month - 1, day);
        } else {
            currentDateValue = new Date();
        }

        if (!isNaN(currentDateValue.getTime())) {
            currentDateValue.setDate(currentDateValue.getDate() + days);
            dateInput.value = formatDate(currentDateValue);
            updateCurrentDateDisplay(dateInput.value);
            loadFormFromLocalStorage();
        } else {
            const today = new Date();
            dateInput.value = formatDate(today);
            updateCurrentDateDisplay(dateInput.value);
            loadFormFromLocalStorage();
        }
    }

    if (dateInput) {
        dateInput.addEventListener('change', () => {
            updateCurrentDateDisplay(dateInput.value);
            loadFormFromLocalStorage();
        });
    }
    if (dateIncrementButton) dateIncrementButton.addEventListener('click', () => changeDate(1));
    if (dateDecrementButton) dateDecrementButton.addEventListener('click', () => changeDate(-1));

    function updateSliderDisplay(slider, displayElement) {
        if (slider && displayElement) displayElement.textContent = slider.value;
    }
    if (energyLevelSlider) energyLevelSlider.addEventListener('input', () => updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay));
    if (stressLevelSlider) stressLevelSlider.addEventListener('input', () => updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay));
    if (humidityPercentSlider) humidityPercentSlider.addEventListener('input', () => updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay));
    if (uvIndexSlider) uvIndexSlider.addEventListener('input', () => updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay));


    function updateSummaryCounts() {
        if (dailyActivitySummaryTextarea && summaryCountsDisplay) {
            const text = dailyActivitySummaryTextarea.value;
            const charCount = text.length;
            const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
            summaryCountsDisplay.textContent = `Words: ${wordCount}, Chars: ${charCount}`;
        }
    }
    if (dailyActivitySummaryTextarea) dailyActivitySummaryTextarea.addEventListener('input', updateSummaryCounts);

    function loadAllSuggestions() {
        suggestionConfigs.forEach(config => {
            const suggestionsData = JSON.parse(localStorage.getItem(config.key)) || {};
            config.fieldIds.forEach(fieldId => {
                const datalistElement = document.getElementById(`${fieldId}Suggestions`);
                if (datalistElement && suggestionsData[fieldId] && Array.isArray(suggestionsData[fieldId])) {
                    datalistElement.innerHTML = '';
                    suggestionsData[fieldId].forEach(suggestionText => {
                        const option = document.createElement('option');
                        option.value = suggestionText;
                        datalistElement.appendChild(option);
                    });
                }
            });
        });
    }

    function saveAllSuggestions() {
        let overallUpdated = false;
        suggestionConfigs.forEach(config => {
            let suggestionsData = JSON.parse(localStorage.getItem(config.key)) || {};
            let configUpdated = false;
            config.fieldIds.forEach(fieldId => {
                const inputElement = document.getElementById(fieldId);
                if (inputElement && inputElement.value.trim() !== '') {
                    const newValue = inputElement.value.trim();
                    suggestionsData[fieldId] = suggestionsData[fieldId] || [];
                    suggestionsData[fieldId] = suggestionsData[fieldId].filter(s => s.toLowerCase() !== newValue.toLowerCase());
                    suggestionsData[fieldId].unshift(newValue);
                    if (suggestionsData[fieldId].length > MAX_SUGGESTIONS_PER_FIELD) {
                        suggestionsData[fieldId] = suggestionsData[fieldId].slice(0, MAX_SUGGESTIONS_PER_FIELD);
                    }
                    configUpdated = true;
                }
            });
            if (configUpdated) {
                localStorage.setItem(config.key, JSON.stringify(suggestionsData));
                overallUpdated = true;
            }
        });
    }

    function clearDiaryForm() {
        if (confirm("Are you sure you want to clear the form? This will remove unsaved changes and locally saved data for the current date (suggestions will remain).")) {
            diaryForm.reset(); 
            const currentFormDate = dateInput.value;
            if (currentFormDate) {
                const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
                if (allSavedData[currentFormDate]) {
                    delete allSavedData[currentFormDate];
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
                }
            }
            initializeForm(true); 
            showToast("Form cleared for current date.", "info");
            slideToPanel(0);
        }
    }

    if (topBarClearButton) {
        topBarClearButton.addEventListener('click', clearDiaryForm);
    }

    function initializeForm(isClearing = false) {
        if (!dateInput.value || isClearing) {
            const today = new Date();
            dateInput.value = formatDate(today);
        }
        updateCurrentDateDisplay(dateInput.value);

        if (isClearing) {
            ['weightKg', 'heightCm', 'chest', 'belly', 'meditationStatus', 
             'meditationDurationMin', 'sleepHours', 'medicationsTaken', 'skincareRoutine'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (id === 'weightKg') el.value = "72";
                    else if (id === 'heightCm') el.value = "178";
                    else if (id === 'chest') el.value = "90"; 
                    else if (id === 'belly') el.value = "89"; 
                    else if (id === 'meditationStatus') el.value = "Na";
                    else if (id === 'meditationDurationMin') el.value = "0";
                    else if (id === 'sleepHours') el.value = "8";
                    else if (id === 'medicationsTaken') el.value = "Na";
                    else if (id === 'skincareRoutine') el.value = "Na";
                }
            });
            if (energyLevelSlider) energyLevelSlider.value = 5;
            if (stressLevelSlider) stressLevelSlider.value = 5;
            if (humidityPercentSlider) humidityPercentSlider.value = 10;
            if (uvIndexSlider) uvIndexSlider.value = 9;
        }
        
        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
        if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
        
        loadAllSuggestions();
        if (!isClearing) {
            loadFormFromLocalStorage();
        }
        updateSummaryCounts();
        slideToPanel(currentTabIndex, false);
        updateKeyboardStatus();
    }


    function getValue(elementId, type = 'text') {
        const element = document.getElementById(elementId);
        if (!element) return type === 'number' || type === 'range' ? null : '';
        const value = element.value.trim(); 
        if (type === 'range') return element.value === '' ? null : parseFloat(element.value); 
        if (type === 'number') return value === '' ? null : parseFloat(value);
        return value;
    }

    function setValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = (value === null || value === undefined) ? '' : value;
            if (element.type === 'range') {
                if (element.id === 'energyLevel') updateSliderDisplay(element, energyLevelValueDisplay);
                if (element.id === 'stressLevel') updateSliderDisplay(element, stressLevelValueDisplay);
                if (element.id === 'humidityPercent') updateSliderDisplay(element, humidityPercentValueDisplay);
                if (element.id === 'uvIndex') updateSliderDisplay(element, uvIndexValueDisplay);
            }
        }
    }

    function calculateDaysSince(startDate, endDateStr) {
        if (!endDateStr) return null;
        // Ensure dates are treated as UTC to avoid timezone issues in calculation
        // by parsing the date string and then creating a new Date object for UTC midnight.
        const [year, month, day] = endDateStr.split('-').map(Number);
        const endDate = new Date(Date.UTC(year, month - 1, day));

        if (isNaN(endDate.getTime())) return null;
        
        // Ensure startDate is also treated as UTC midnight for consistent calculation
        const start = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));

        const diffTime = endDate.getTime() - start.getTime();
        if (diffTime < 0) return null; // endDate is before startDate

        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1; // +1 to make the start date day 1
    }


    function slideToPanel(index, animate = true) {
        if (!tabPanelsSlider || index < 0 || index >= tabPanels.length) return;
        currentTabIndex = index;
        const offset = -index * 100;
        tabPanelsSlider.style.transition = animate ? 'transform 0.35s ease-in-out' : 'none';
        tabPanelsSlider.style.transform = `translateX(${offset}%)`;
        bottomNavButtons.forEach((btn, i) => btn.classList.toggle('active', i === index));
    }

    bottomNavButtons.forEach((button, index) => {
        button.addEventListener('click', () => slideToPanel(index));
    });

    if (tabViewPort) {
        let swipeInProgress = false; 
        tabViewPort.addEventListener('touchstart', (e) => {
            if (isKeyboardOpen || e.target.closest('.slider-container') || e.target.closest('input[type="range"]')) {
                swipeInProgress = false; return;
            }
            swipeInProgress = true; 
            touchStartX = e.touches[0].clientX;
            touchEndX = touchStartX; 
            tabPanelsSlider.style.transition = 'none'; 
        }, { passive: true }); 

        tabViewPort.addEventListener('touchmove', (e) => {
            if (!swipeInProgress || isKeyboardOpen) return;
            touchEndX = e.touches[0].clientX;
        }, { passive: true });

        tabViewPort.addEventListener('touchend', () => {
            if (!swipeInProgress || isKeyboardOpen) { swipeInProgress = false; return; }
            const deltaX = touchEndX - touchStartX;
            let newIndex = currentTabIndex;
            if (Math.abs(deltaX) > swipeThreshold) {
                newIndex = (deltaX < 0) ? Math.min(currentTabIndex + 1, tabPanels.length - 1) : Math.max(currentTabIndex - 1, 0);
            }
            slideToPanel(newIndex, true); 
            swipeInProgress = false; touchStartX = 0; touchEndX = 0;
        });
    }

    diaryForm.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!downloadButton) return;
        const originalDownloadIconHTML = downloadButton.querySelector('i')?.outerHTML;
        setButtonLoadingState(downloadButton, true, originalDownloadIconHTML);
        setTimeout(() => { 
            try {
                const data = {};
                const selectedDateStr = getValue('date');
                
                data.date = selectedDateStr; 
                data.day_id = calculateDaysSince(REFERENCE_START_DATE, selectedDateStr); // Calculate day_id
                // Age property is removed

                data.environment = { temperature_c: getValue('temperatureC'), air_quality_index: getValue('airQualityIndex', 'number'), humidity_percent: getValue('humidityPercent', 'range'), uv_index: getValue('uvIndex', 'range'), weather_condition: getValue('weatherCondition') };
                data.body_measurements = { weight_kg: getValue('weightKg', 'number'), height_cm: getValue('heightCm', 'number'), chest: getValue('chest', 'number'), belly: getValue('belly', 'number') };
                data.health_and_fitness = { sleep_hours: getValue('sleepHours', 'number'), steps_count: getValue('stepsCount', 'number'), steps_distance_km: getValue('stepsDistanceKm', 'number'), kilocalorie: getValue('kilocalorie', 'number'), water_intake_liters: getValue('waterIntakeLiters', 'number'), medications_taken: getValue('medicationsTaken'), physical_symptoms: getValue('physicalSymptoms'), energy_level: getValue('energyLevel', 'range'), stress_level: getValue('stressLevel', 'range') };
                data.mental_and_emotional_health = { mental_state: getValue('mentalState'), meditation_status: getValue('meditationStatus'), meditation_duration_min: getValue('meditationDurationMin', 'number') };
                data.personal_care = { face_product_name: getValue('faceProductName'), face_product_brand: getValue('faceProductBrand'), hair_product_name: getValue('hairProductName'), hair_product_brand: getValue('hairProductBrand'), hair_oil: getValue('hairOil'), skincare_routine: getValue('skincareRoutine') };
                data.diet_and_nutrition = { breakfast: getValue('breakfast'), lunch: getValue('lunch'), dinner: getValue('dinner'), additional_items: getValue('additionalItems') };
                data.activities_and_productivity = { tasks_today_english: getValue('tasksTodayEnglish'), travel_destination: getValue('travelDestination'), phone_screen_on_hr: getValue('phoneScreenOnHr', 'number') };
                data.additional_notes = { key_events: getValue('keyEvents') };
                data.daily_activity_summary = getValue('dailyActivitySummary');
                const jsonString = JSON.stringify(data, null, 2);
                downloadJSON(jsonString, `${data.date || 'nodate'}.json`);
                showToast('JSON file downloaded.', 'success');
            } catch (error) {
                console.error("Error during JSON generation/download:", error);
                showToast('Error generating/downloading JSON.', 'error');
            } finally {
                setButtonLoadingState(downloadButton, false, originalDownloadIconHTML);
            }
        }, 50);
    });

    if (importJsonButton) {
        importJsonButton.addEventListener('click', () => jsonFileInput.click());
    }
    jsonFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file && importJsonButton) {
            const originalImportIconHTML = importJsonButton.querySelector('i')?.outerHTML;
            setButtonLoadingState(importJsonButton, true, originalImportIconHTML);
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    populateFormWithJson(importedData);
                    if (importedData.date) { 
                        performSaveOperation(true); 
                    }
                    showToast('Diary entry imported successfully!', 'success');
                    let firstPopulatedIndex = 0;
                    for (let i = 0; i < tabPanels.length; i++) {
                        const panelInputs = tabPanels[i].querySelectorAll('input:not([type="range"]):not([type="date"]):not([type="checkbox"]):not([type="radio"]), textarea');
                        let hasData = false;
                        for (const input of panelInputs) { if (input.value && input.value.trim() !== '' && input.value.trim() !== 'Na' && input.value.trim() !== '0') { hasData = true; break; } }
                        if (hasData) { firstPopulatedIndex = i; break; }
                    }
                    slideToPanel(firstPopulatedIndex);
                } catch (error) {
                    console.error("Error parsing JSON file:", error);
                    showToast('Failed to import diary entry. Invalid JSON file.', 'error');
                } finally {
                    jsonFileInput.value = '';
                    setButtonLoadingState(importJsonButton, false, originalImportIconHTML);
                }
            };
            reader.readAsText(file);
        }
    });

    function populateFormWithJson(jsonData) {
        diaryForm.reset(); 
        initializeForm(true); 
        setValue('date', jsonData.date);
        updateCurrentDateDisplay(jsonData.date);
        // Note: day_id and age from imported JSON are not directly used to populate form fields.
        // day_id is calculated on export. age is removed.
        if (jsonData.environment) Object.keys(jsonData.environment).forEach(k => setValue({temperature_c:'temperatureC', air_quality_index:'airQualityIndex', humidity_percent:'humidityPercent', uv_index:'uvIndex', weather_condition:'weatherCondition'}[k], jsonData.environment[k]));
        if (jsonData.body_measurements) Object.keys(jsonData.body_measurements).forEach(k => setValue({weight_kg:'weightKg', height_cm:'heightCm', chest:'chest', belly:'belly'}[k], jsonData.body_measurements[k]));
        if (jsonData.health_and_fitness) Object.keys(jsonData.health_and_fitness).forEach(k => setValue({sleep_hours:'sleepHours', steps_count:'stepsCount', steps_distance_km:'stepsDistanceKm', kilocalorie:'kilocalorie', water_intake_liters:'waterIntakeLiters', medications_taken:'medicationsTaken', physical_symptoms:'physicalSymptoms', energy_level:'energyLevel', stress_level:'stressLevel'}[k], jsonData.health_and_fitness[k]));
        if (jsonData.mental_and_emotional_health) { 
            setValue('mentalState', jsonData.mental_and_emotional_health.mental_state); 
            setValue('meditationStatus', jsonData.mental_and_emotional_health.meditation_status); 
            setValue('meditationDurationMin', jsonData.mental_and_emotional_health.meditation_duration_min); 
        }
        if (jsonData.personal_care) { setValue('faceProductName', jsonData.personal_care.face_product_name); setValue('faceProductBrand', jsonData.personal_care.face_product_brand); setValue('hairProductName', jsonData.personal_care.hair_product_name); setValue('hairProductBrand', jsonData.personal_care.hair_product_brand); setValue('hairOil', jsonData.personal_care.hair_oil); setValue('skincareRoutine', jsonData.personal_care.skincare_routine); }
        if (jsonData.diet_and_nutrition) { 
            setValue('breakfast', jsonData.diet_and_nutrition.breakfast); 
            setValue('lunch', jsonData.diet_and_nutrition.lunch); 
            setValue('dinner', jsonData.diet_and_nutrition.dinner); 
            setValue('additionalItems', jsonData.diet_and_nutrition.additional_items);
        }
        if (jsonData.activities_and_productivity) { setValue('tasksTodayEnglish', jsonData.activities_and_productivity.tasks_today_english); setValue('travelDestination', jsonData.activities_and_productivity.travel_destination); setValue('phoneScreenOnHr', jsonData.activities_and_productivity.phone_screen_on_hr); }
        if (jsonData.additional_notes) setValue('keyEvents', jsonData.additional_notes.key_events);
        setValue('dailyActivitySummary', jsonData.daily_activity_summary);

        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
        if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
        updateSummaryCounts();
    }

    function downloadJSON(content, fileName) {
        const a = document.createElement('a');
        const file = new Blob([content], { type: 'application/json' });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    function performSaveOperation(isSilent = false) {
        try {
            saveAllSuggestions(); 
            const currentFormDate = dateInput.value;
            if (!currentFormDate) {
                if (!isSilent) {
                    showToast('Please select a date first to save.', 'error');
                }
                return false; 
            }

            const formDataToSave = {};
            diaryForm.querySelectorAll('input[id]:not([type="file"]), textarea[id], select[id]').forEach(element => {
                if (element.id) { 
                   formDataToSave[element.id] = (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value;
                }
            });
            
            let allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            allSavedData[currentFormDate] = formDataToSave; 

            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
            if (!isSilent) {
                showToast('Form data saved locally for this date!', 'success');
            }
            return true; 
        } catch (e) {
            console.error("Error saving to localStorage:", e);
            if (!isSilent) {
                showToast('Failed to save form data. Storage might be full.', 'error');
            }
            return false; 
        }
    }

    if (saveFormButton) {
        saveFormButton.addEventListener('click', () => {
            const originalSaveIconHTML = saveFormButton.querySelector('i')?.outerHTML;
            setButtonLoadingState(saveFormButton, true, originalSaveIconHTML);
            setTimeout(() => {
                performSaveOperation(false); 
                setButtonLoadingState(saveFormButton, false, originalSaveIconHTML);
            }, 10); 
        });
    }

    function loadFormFromLocalStorage() {
        const currentFormDate = dateInput.value;
        if (!currentFormDate) {
            diaryForm.reset();
            initializeForm(true); 
            return;
        }
        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const formDataForDate = allSavedData[currentFormDate];
        diaryForm.reset(); 
        initializeForm(true); 

        if (formDataForDate) {
            try {
                Object.keys(formDataForDate).forEach(elementId => {
                    if (document.getElementById(elementId)) { 
                        if (elementId === 'date' && formDataForDate[elementId] === currentFormDate) { /* Date already set */ } 
                        else { setValue(elementId, formDataForDate[elementId]); }
                    }
                });
                updateCurrentDateDisplay(currentFormDate);
                if (!document.hidden) { 
                    showToast('Previously saved data for this date loaded.', 'info');
                }
            } catch (e) {
                console.error("Error loading from localStorage for date:", e);
                showToast('Could not load saved data. It might be corrupted.', 'error');
            }
        } else {
             updateCurrentDateDisplay(currentFormDate);
        }
        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
        if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
        updateSummaryCounts();
    }
    
    function autoSaveOnPageHide() {
        console.log('Page is being hidden, attempting auto-save...');
        const success = performSaveOperation(true); 
        if (success) {
            console.log('Auto-save successful on page hide.');
        } else {
            console.warn('Auto-save failed or no date selected on page hide.');
        }
    }
    window.addEventListener('pagehide', autoSaveOnPageHide);

    initializeForm();

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js') 
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }
});