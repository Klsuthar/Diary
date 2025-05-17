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

    const historyListContainer = document.getElementById('historyListContainer');

    const topBar = document.querySelector('.top-bar');
    const multiSelectCountSpan = document.getElementById('multiSelectCount');
    const exportSelectedButton = document.getElementById('exportSelectedButton');
    const deleteSelectedButton = document.getElementById('deleteSelectedButton');
    const cancelMultiSelectButton = document.getElementById('cancelMultiSelectButton');

    const REFERENCE_START_DATE = new Date(2003, 6, 4);
    const LOCAL_STORAGE_KEY = 'myPersonalDiaryFormData';
    const MAX_SUGGESTIONS_PER_FIELD = 7;

    let currentTabIndex = 0;
    let touchStartX = 0, touchEndX = 0;
    const swipeThreshold = 50;
    let isKeyboardOpen = false;
    let viewportHeightBeforeKeyboard = window.innerHeight;
    const MIN_KEYBOARD_HEIGHT_PX = 150;

    let isMultiSelectModeActive = false;
    let selectedEntriesForMultiAction = [];
    let longPressTimer;
    const LONG_PRESS_DURATION = 600;
    let itemTouchStartX, itemTouchStartY;

    const suggestionConfigs = [
        { key: 'myPersonalDiaryPersonalCareSuggestions', fieldIds: ['faceProductName', 'faceProductBrand', 'hairProductName', 'hairProductBrand', 'hairOil', 'skincareRoutine'] },
        { key: 'myPersonalDiaryDietSuggestions', fieldIds: ['breakfast', 'lunch', 'dinner', 'additionalItems'] }
    ];

    const tabInputMap = {
        'tab-basic': ['temperatureC', 'airQualityIndex', 'weatherCondition'],
        'tab-body': ['weightKg', 'heightCm', 'chest', 'belly', 'sleepHours', 'stepsCount', 'stepsDistanceKm', 'kilocalorie', 'waterIntakeLiters', 'medicationsTaken', 'physicalSymptoms'],
        'tab-mental': ['mentalState', 'meditationStatus', 'meditationDurationMin', 'faceProductName', 'faceProductBrand', 'hairProductName', 'hairProductBrand', 'hairOil', 'skincareRoutine'],
        'tab-diet': ['breakfast', 'lunch', 'dinner', 'additionalItems', 'tasksTodayEnglish', 'travelDestination', 'phoneScreenOnHr'],
        'tab-summary': ['keyEvents', 'dailyActivitySummary']
    };

    // --- Utility Functions ---
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
                delete button.dataset.originalIcon;
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
                    const dateObj = new Date(dateStr + 'T00:00:00');
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
    function updateSliderDisplay(slider, displayElement) {
        if (slider && displayElement) displayElement.textContent = slider.value;
    }
    function updateSummaryCounts() {
        if (dailyActivitySummaryTextarea && summaryCountsDisplay) {
            const text = dailyActivitySummaryTextarea.value;
            const charCount = text.length;
            const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
            summaryCountsDisplay.textContent = `Words: ${wordCount}, Chars: ${charCount}`;
        }
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
        const [year, month, day] = endDateStr.split('-').map(Number);
        const endDate = new Date(Date.UTC(year, month - 1, day));
        if (isNaN(endDate.getTime())) return null;
        const start = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
        const diffTime = endDate.getTime() - start.getTime();
        if (diffTime < 0) return null;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1;
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

    // --- Tab Indicators ---
    function updateTabIndicators() {
        // console.log("--- Updating Tab Indicators ---"); // Uncomment for debugging
        bottomNavButtons.forEach(button => {
            const targetPanelId = button.dataset.tabTarget;
            // console.log(`Checking tab: ${targetPanelId}`); // Uncomment for debugging
            if (targetPanelId === 'tab-history') {
                button.classList.remove('has-empty-fields');
                return; 
            }

            const inputIds = tabInputMap[targetPanelId];
            if (!inputIds) {
                // console.log(`No input IDs for ${targetPanelId}`); // Uncomment for debugging
                button.classList.remove('has-empty-fields');
                return; 
            }

            let hasEmptyField = false;
            // console.log(`Inputs for ${targetPanelId}:`, inputIds); // Uncomment for debugging
            for (const inputId of inputIds) {
                const element = document.getElementById(inputId);
                if (element) {
                    const value = element.value;
                    const trimmedValue = value.trim();
                    // console.log(`  ${inputId}: value='${value}', trimmed='${trimmedValue}', isEmpty=${trimmedValue === ''}`); // Uncomment for debugging
                    if (trimmedValue === '') {
                        hasEmptyField = true;
                        // console.log(`  Found empty field in ${targetPanelId}: ${inputId}`); // Uncomment for debugging
                        break; 
                    }
                } else {
                     console.warn(`Element with ID ${inputId} not found for tab ${targetPanelId} during indicator check.`);
                }
            }
            
            // console.log(`Tab ${targetPanelId} - hasEmptyField: ${hasEmptyField}`); // Uncomment for debugging
            if (hasEmptyField) {
                button.classList.add('has-empty-fields');
                // console.log(`Added .has-empty-fields to ${targetPanelId}`); // Uncomment for debugging
            } else {
                button.classList.remove('has-empty-fields');
                // console.log(`Removed .has-empty-fields from ${targetPanelId}`); // Uncomment for debugging
            }
        });
    }


    // --- Suggestion Logic ---
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
        suggestionConfigs.forEach(config => {
            let suggestionsData = JSON.parse(localStorage.getItem(config.key)) || {};
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
                }
            });
            localStorage.setItem(config.key, JSON.stringify(suggestionsData));
        });
    }

    // --- Form Management ---
    function clearDiaryForm() {
        if (confirm("Are you sure you want to clear the form? This will remove unsaved changes and locally saved data for the current date (suggestions will remain).")) {
            const currentFormDate = dateInput.value; // Get date before reset
            
            diaryForm.reset(); // Reset first to clear all fields to HTML defaults

            if (currentFormDate) { // Remove saved data for this date
                const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
                if (allSavedData[currentFormDate]) {
                    delete allSavedData[currentFormDate];
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
                    if (tabPanels[currentTabIndex]?.id === 'tab-history') {
                        renderHistoryList();
                    }
                }
            }
            initializeForm(true); // Now apply app-specific defaults and update UI
            showToast("Form cleared for current date.", "info");
            slideToPanel(0);
        }
    }

    function initializeForm(isClearingOrInitialDefaults = false) {
        if (!dateInput.value || isClearingOrInitialDefaults) {
            const today = new Date();
            dateInput.value = formatDate(today);
        }
        updateCurrentDateDisplay(dateInput.value);

        if (isClearingOrInitialDefaults) {
            // diaryForm.reset() should ideally be called by the function that *needs* a full clear,
            // like clearDiaryForm() or at the beginning of loadFormFromLocalStorage().
            // This initializeForm then just applies specific defaults ON TOP of a reset state.
            // If called from clearDiaryForm, reset was already done.
            // If called from loadFormFromLocalStorage, reset was done there too.
            // If called initially (isClearingOrInitialDefaults=true), we need a reset here.
            if(isClearingOrInitialDefaults && !document.getElementById('weightKg').value) { // Heuristic: if weight is empty, assume a full reset is needed
                diaryForm.reset(); // Ensure clean slate if this is a true "init with defaults"
            }

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
                    // Fields not in this list would be "" if diaryForm.reset() was called prior
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
        
        // If not clearing (i.e., initial page load), loadFormFromLocalStorage will be called by the main setup.
        // If clearing, or called from loadFormFromLocalStorage after its own reset, then update indicators.
        if (isClearingOrInitialDefaults) {
            updateTabIndicators(); 
        }
        updateSummaryCounts();
        updateKeyboardStatus();
    }

    function populateFormWithJson(jsonData) {
        diaryForm.reset(); // Start fresh
        initializeForm(true); // Apply defaults and initial indicator state
        
        setValue('date', jsonData.date);
        updateCurrentDateDisplay(jsonData.date);

        // Populate all fields from JSON
        if (jsonData.environment) Object.keys(jsonData.environment).forEach(k => setValue({temperature_c:'temperatureC', air_quality_index:'airQualityIndex', humidity_percent:'humidityPercent', uv_index:'uvIndex', weather_condition:'weatherCondition'}[k], jsonData.environment[k]));
        if (jsonData.body_measurements) Object.keys(jsonData.body_measurements).forEach(k => setValue({weight_kg:'weightKg', height_cm:'heightCm', chest:'chest', belly:'belly'}[k], jsonData.body_measurements[k]));
        if (jsonData.health_and_fitness) Object.keys(jsonData.health_and_fitness).forEach(k => setValue({sleep_hours:'sleepHours', steps_count:'stepsCount', steps_distance_km:'stepsDistanceKm', kilocalorie:'kilocalorie', water_intake_liters:'waterIntakeLiters', medications_taken:'medicationsTaken', physical_symptoms:'physicalSymptoms', energy_level:'energyLevel', stress_level:'stressLevel'}[k], jsonData.health_and_fitness[k]));
        if (jsonData.mental_and_emotional_health) { setValue('mentalState', jsonData.mental_and_emotional_health.mental_state); setValue('meditationStatus', jsonData.mental_and_emotional_health.meditation_status); setValue('meditationDurationMin', jsonData.mental_and_emotional_health.meditation_duration_min); }
        if (jsonData.personal_care) { setValue('faceProductName', jsonData.personal_care.face_product_name); setValue('faceProductBrand', jsonData.personal_care.face_product_brand); setValue('hairProductName', jsonData.personal_care.hair_product_name); setValue('hairProductBrand', jsonData.personal_care.hair_product_brand); setValue('hairOil', jsonData.personal_care.hair_oil); setValue('skincareRoutine', jsonData.personal_care.skincare_routine); }
        if (jsonData.diet_and_nutrition) { setValue('breakfast', jsonData.diet_and_nutrition.breakfast); setValue('lunch', jsonData.diet_and_nutrition.lunch); setValue('dinner', jsonData.diet_and_nutrition.dinner); setValue('additionalItems', jsonData.diet_and_nutrition.additional_items); }
        if (jsonData.activities_and_productivity) { setValue('tasksTodayEnglish', jsonData.activities_and_productivity.tasks_today_english); setValue('travelDestination', jsonData.activities_and_productivity.travel_destination); setValue('phoneScreenOnHr', jsonData.activities_and_productivity.phone_screen_on_hr); }
        if (jsonData.additional_notes) setValue('keyEvents', jsonData.additional_notes.key_events);
        setValue('dailyActivitySummary', jsonData.daily_activity_summary);

        // Update UI elements after populating
        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
        if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
        updateSummaryCounts();
        updateTabIndicators(); // Final indicator update after JSON data is applied
    }

    function performSaveOperation(isSilent = false) {
        try {
            saveAllSuggestions();
            const currentFormDate = dateInput.value;
            if (!currentFormDate) {
                if (!isSilent) showToast('Please select a date first to save.', 'error');
                return false;
            }

            const formDataToSave = {};
            diaryForm.querySelectorAll('input[id]:not([type="file"]), textarea[id], select[id]').forEach(element => {
                if (element.id) {
                   formDataToSave[element.id] = (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value;
                }
            });
            formDataToSave.date = currentFormDate;

            let allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            allSavedData[currentFormDate] = formDataToSave;

            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
            if (!isSilent) showToast('Form data saved locally for this date!', 'success');

            if (tabPanels[currentTabIndex]?.id === 'tab-history') {
                renderHistoryList();
            }
            updateTabIndicators(); 
            return true;
        } catch (e) {
            console.error("Error saving to localStorage:", e);
            if (!isSilent) showToast('Failed to save form data. Storage might be full.', 'error');
            return false;
        }
    }

    function loadFormFromLocalStorage() {
        const currentFormDate = dateInput.value;
        if (!currentFormDate) { // Should not happen if date is always set
            diaryForm.reset();
            initializeForm(true); // Set to today's date and defaults
            return;
        }
        
        diaryForm.reset(); // 1. Clear all fields to HTML defaults (empty strings)
        initializeForm(true); // 2. Apply app-specific defaults (like "72", "Na") and update tab indicators for this default state. Date is also set here.

        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const formDataForDate = allSavedData[currentFormDate];

        if (formDataForDate) { // 3. If data exists for this date, load it, overwriting defaults
            try {
                Object.keys(formDataForDate).forEach(elementId => {
                    // Date is already set by initializeForm, so skip re-setting it from formDataForDate
                    // unless you want to be absolutely sure it matches (it should).
                    if (elementId !== 'date') { 
                        setValue(elementId, formDataForDate[elementId]);
                    }
                });
                if (!document.hidden && !isMultiSelectModeActive) {
                    showToast('Previously saved data for this date loaded.', 'info');
                }
            } catch (e) {
                console.error("Error loading from localStorage for date:", e);
                showToast('Could not load saved data. It might be corrupted.', 'error');
            }
        }
        // Else: No data for this date, form remains with defaults set by initializeForm(true)

        // 4. Final UI updates after potential data load
        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
        if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
        updateSummaryCounts();
        updateTabIndicators(); // Crucial: update indicators AFTER populating with specific date's data (or defaults if no data)
    }

    function autoSaveOnPageHide() {
        if (isMultiSelectModeActive || (tabPanels[currentTabIndex]?.id === 'tab-history')) return;
        const success = performSaveOperation(true);
        if (success) {
            console.log('Auto-save successful on page hide.');
        }
    }

    // --- Tab Navigation ---
    function slideToPanel(index, animate = true) {
        if (!tabPanelsSlider || index < 0 || index >= tabPanels.length) return;

        if (isMultiSelectModeActive && tabPanels[currentTabIndex]?.id === 'tab-history' && tabPanels[index]?.id !== 'tab-history') {
            disableMultiSelectMode();
        }

        currentTabIndex = index;
        const offset = -index * 100;
        tabPanelsSlider.style.transition = animate ? 'transform 0.35s ease-in-out' : 'none';
        tabPanelsSlider.style.transform = `translateX(${offset}%)`;
        bottomNavButtons.forEach((btn, i) => btn.classList.toggle('active', i === index));

        if (tabPanels[index] && tabPanels[index].id === 'tab-history') {
            renderHistoryList();
        }
    }

    // --- History Tab & Multi-Select Functionality (omitted for brevity, same as previous correct version) ---
    function renderHistoryList() {
        if (!historyListContainer) return;
        const noHistoryMsgElement = historyListContainer.querySelector('.no-history-message');

        const existingItems = historyListContainer.querySelectorAll('.history-item');
        existingItems.forEach(item => item.remove());

        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const dates = Object.keys(allSavedData).sort((a, b) => new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00'));

        if (dates.length === 0) {
            if (noHistoryMsgElement) noHistoryMsgElement.style.display = 'block';
        } else {
            if (noHistoryMsgElement) noHistoryMsgElement.style.display = 'none';
            dates.forEach(dateStr => {
                const entryData = allSavedData[dateStr];
                if (!entryData) return;

                const listItem = document.createElement('div');
                listItem.classList.add('history-item');
                listItem.dataset.date = dateStr;

                if (isMultiSelectModeActive) {
                    listItem.classList.add('multi-select-active');
                }
                if (isMultiSelectModeActive && selectedEntriesForMultiAction.includes(dateStr)) {
                    listItem.classList.add('selected');
                }

                const checkboxContainer = document.createElement('div');
                checkboxContainer.classList.add('history-item-checkbox-container');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('history-item-checkbox');
                checkbox.dataset.date = dateStr;
                checkbox.checked = isMultiSelectModeActive && selectedEntriesForMultiAction.includes(dateStr);
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleMultiSelectEntry(dateStr, listItem, checkbox);
                });
                checkboxContainer.appendChild(checkbox);
                listItem.appendChild(checkboxContainer);

                const details = document.createElement('div');
                details.classList.add('history-item-details');
                const itemDate = document.createElement('div');
                itemDate.classList.add('history-item-date');
                try {
                    itemDate.textContent = new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
                } catch (e) { itemDate.textContent = dateStr; }
                const preview = document.createElement('div');
                preview.classList.add('history-item-preview');
                const summary = entryData.dailyActivitySummary || entryData.keyEvents || 'No summary/events';
                preview.textContent = summary.substring(0, 50) + (summary.length > 50 ? '...' : '');
                details.appendChild(itemDate);
                details.appendChild(preview);
                listItem.appendChild(details);

                const actions = document.createElement('div');
                actions.classList.add('history-item-actions');
                
                const exportBtn = document.createElement('button');
                exportBtn.innerHTML = '<i class="fas fa-file-export"></i>'; exportBtn.title = 'Export Entry'; exportBtn.classList.add('action-export');
                exportBtn.addEventListener('click', (e) => { e.stopPropagation(); handleExportEntry(dateStr); });

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; deleteBtn.title = 'Delete Entry'; deleteBtn.classList.add('action-delete');
                deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); handleDeleteEntry(dateStr); });

                actions.appendChild(exportBtn);
                actions.appendChild(deleteBtn);
                listItem.appendChild(actions);

                listItem.addEventListener('click', (event) => handleHistoryItemClick(event, dateStr, listItem)); 
                listItem.addEventListener('touchstart', (e) => handleHistoryItemTouchStart(e, dateStr, listItem), { passive: false });
                listItem.addEventListener('touchmove', handleHistoryItemTouchMove);
                listItem.addEventListener('touchend', () => handleHistoryItemTouchEnd(dateStr, listItem));
                listItem.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (!isMultiSelectModeActive) enableMultiSelectMode();
                    const currentCheckbox = listItem.querySelector('.history-item-checkbox');
                    toggleMultiSelectEntry(dateStr, listItem, currentCheckbox);
                });

                if (noHistoryMsgElement) {
                    historyListContainer.insertBefore(listItem, noHistoryMsgElement);
                } else {
                    historyListContainer.appendChild(listItem);
                }
            });
        }
    }
    function handleHistoryItemTouchStart(event, dateStr, listItem) {
        if (event.target.closest('.history-item-actions button') || event.target.closest('.history-item-checkbox')) return;
        itemTouchStartX = event.touches[0].clientX;
        itemTouchStartY = event.touches[0].clientY;
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
            longPressTimer = null;
            if (!isMultiSelectModeActive) {
                enableMultiSelectMode();
                const freshListItem = historyListContainer.querySelector(`.history-item[data-date="${dateStr}"]`);
                if (freshListItem) {
                    const checkbox = freshListItem.querySelector('.history-item-checkbox');
                    toggleMultiSelectEntry(dateStr, freshListItem, checkbox);
                }
            } else {
                const checkbox = listItem.querySelector('.history-item-checkbox');
                toggleMultiSelectEntry(dateStr, listItem, checkbox);
            }
            if (navigator.vibrate) navigator.vibrate(50);
        }, LONG_PRESS_DURATION);
    }
    function handleHistoryItemTouchMove(event) {
        if (longPressTimer) {
            const deltaX = Math.abs(event.touches[0].clientX - itemTouchStartX);
            const deltaY = Math.abs(event.touches[0].clientY - itemTouchStartY);
            if (deltaX > 10 || deltaY > 10) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }
    }
    function handleHistoryItemTouchEnd(dateStr, listItem) {
        if (longPressTimer) { 
            clearTimeout(longPressTimer);
            longPressTimer = null;
            handleHistoryItemClick(null, dateStr, listItem); 
        }
    }
    function handleHistoryItemClick(event, dateStr, listItem) {
        if (event && event.target && (event.target.matches('.history-item-checkbox') || event.target.closest('.history-item-actions button'))) {
            return;
        }
        if (isMultiSelectModeActive) {
            const checkbox = listItem.querySelector('.history-item-checkbox');
            toggleMultiSelectEntry(dateStr, listItem, checkbox);
        } else {
            handleEditEntry(dateStr);
        }
    }
    function handleEditEntry(dateStr) {
        if (isMultiSelectModeActive) disableMultiSelectMode();
        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const entryFormData = allSavedData[dateStr];

        if (entryFormData) {
            diaryForm.reset(); // Clear to HTML defaults
            initializeForm(true); // Apply app defaults, set date, update indicators based on defaults

            setValue('date', dateStr); // Ensure correct date is displayed
            updateCurrentDateDisplay(dateStr);

            Object.keys(entryFormData).forEach(elementId => {
                if (elementId !== 'date') {
                    setValue(elementId, entryFormData[elementId]);
                }
            });

            if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
            if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
            if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
            if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
            updateSummaryCounts();
            updateTabIndicators(); // Final update after populating for edit

            showToast(`Editing entry for ${new Date(dateStr + 'T00:00:00').toLocaleDateString()}.`, 'info');
            slideToPanel(0);
        } else {
            showToast('Could not find entry data to edit.', 'error');
        }
    }
    function getFullEntryDataForExport(entryFormData, dateKey) {
        const exportData = {};
        exportData.date = entryFormData.date || dateKey;
        exportData.day_id = calculateDaysSince(REFERENCE_START_DATE, exportData.date);
        const pFloat = val => (val !== null && val !== undefined && val !== "") ? parseFloat(val) : null;
        const pInt = val => (val !== null && val !== undefined && val !== "") ? parseInt(val) : null;
        exportData.environment = { temperature_c: entryFormData.temperatureC || '', air_quality_index: pInt(entryFormData.airQualityIndex), humidity_percent: pInt(entryFormData.humidityPercent), uv_index: pInt(entryFormData.uvIndex), weather_condition: entryFormData.weatherCondition || '' };
        exportData.body_measurements = { weight_kg: pFloat(entryFormData.weightKg), height_cm: pInt(entryFormData.heightCm), chest: pInt(entryFormData.chest), belly: pInt(entryFormData.belly) };
        exportData.health_and_fitness = { sleep_hours: entryFormData.sleepHours || '', steps_count: pInt(entryFormData.stepsCount), steps_distance_km: entryFormData.stepsDistanceKm || '', kilocalorie: pInt(entryFormData.kilocalorie), water_intake_liters: pFloat(entryFormData.waterIntakeLiters), medications_taken: entryFormData.medicationsTaken || '', physical_symptoms: entryFormData.physicalSymptoms || '', energy_level: pInt(entryFormData.energyLevel), stress_level: pInt(entryFormData.stressLevel) };
        exportData.mental_and_emotional_health = { mental_state: entryFormData.mentalState || '', meditation_status: entryFormData.meditationStatus || '', meditation_duration_min: pInt(entryFormData.meditationDurationMin) };
        exportData.personal_care = { face_product_name: entryFormData.faceProductName || '', face_product_brand: entryFormData.faceProductBrand || '', hair_product_name: entryFormData.hairProductName || '', hair_product_brand: entryFormData.hairProductBrand || '', hair_oil: entryFormData.hairOil || '', skincare_routine: entryFormData.skincareRoutine || '' };
        exportData.diet_and_nutrition = { breakfast: entryFormData.breakfast || '', lunch: entryFormData.lunch || '', dinner: entryFormData.dinner || '', additional_items: entryFormData.additionalItems || '' };
        exportData.activities_and_productivity = { tasks_today_english: entryFormData.tasksTodayEnglish || '', travel_destination: entryFormData.travelDestination || '', phone_screen_on_hr: entryFormData.phoneScreenOnHr || '' };
        exportData.additional_notes = { key_events: entryFormData.keyEvents || '' };
        exportData.daily_activity_summary = entryFormData.dailyActivitySummary || '';
        return exportData;
    }
    function handleExportEntry(dateStr) { /* Same as previous */ 
        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const entryFormData = allSavedData[dateStr];
        if (entryFormData) {
            const exportData = getFullEntryDataForExport(entryFormData, dateStr);
            const jsonString = JSON.stringify(exportData, null, 2);
            downloadJSON(jsonString, `${exportData.date || 'diary-entry'}.json`);
            showToast('Entry exported.', 'success');
        } else {
            showToast('Could not find entry data to export.', 'error');
        }
    }
    function handleDeleteEntry(dateStr, isPartOfMulti = false) { /* Same as previous, but ensure initializeForm or updateTabIndicators is called appropriately */
        const confirmed = isPartOfMulti ? true : confirm(`Are you sure you want to delete the entry for ${new Date(dateStr+'T00:00:00').toLocaleDateString()}? This action cannot be undone.`);
        if (confirmed) {
            const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            if (allSavedData[dateStr]) {
                delete allSavedData[dateStr];
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
                if (!isPartOfMulti) {
                    showToast('Entry deleted.', 'success');
                    renderHistoryList(); // Re-render history view
                }
                // If the currently displayed form date was the one deleted
                if (dateInput.value === dateStr && !isPartOfMulti) {
                     diaryForm.reset(); // Clear the form
                     initializeForm(true); // Re-initialize with defaults for today (or new selected date)
                } else if (!isPartOfMulti) {
                     updateTabIndicators(); // Update indicators for the currently visible date
                }
                return true;
            } else {
                if (!isPartOfMulti) showToast('Entry not found for deletion.', 'error');
                return false;
            }
        }
        return false;
    }
    function enableMultiSelectMode() { /* Same as previous */ 
        if (isMultiSelectModeActive) return;
        isMultiSelectModeActive = true;
        selectedEntriesForMultiAction = [];
        updateTopBarForMultiSelectView(true);
        renderHistoryList();
        showToast('Multi-select enabled. Tap items to select.', 'info');
    }
    function disableMultiSelectMode() { /* Same as previous */ 
        if (!isMultiSelectModeActive) return;
        isMultiSelectModeActive = false;
        selectedEntriesForMultiAction = [];
        updateTopBarForMultiSelectView(false);
        renderHistoryList();
    }
    function toggleMultiSelectEntry(dateStr, listItemElement, checkboxElement = null) { /* Same as previous */ 
        const index = selectedEntriesForMultiAction.indexOf(dateStr);
        const actualCheckbox = checkboxElement || listItemElement.querySelector('.history-item-checkbox');

        if (index > -1) {
            selectedEntriesForMultiAction.splice(index, 1);
            listItemElement.classList.remove('selected');
            if (actualCheckbox) actualCheckbox.checked = false;
        } else {
            selectedEntriesForMultiAction.push(dateStr);
            listItemElement.classList.add('selected');
            if (actualCheckbox) actualCheckbox.checked = true;
        }
        updateMultiSelectCount();
    }
    function updateMultiSelectCount() { /* Same as previous */ 
        if (multiSelectCountSpan) multiSelectCountSpan.textContent = `${selectedEntriesForMultiAction.length} selected`;
        const hasSelection = selectedEntriesForMultiAction.length > 0;
        if (deleteSelectedButton) deleteSelectedButton.disabled = !hasSelection;
        if (exportSelectedButton) exportSelectedButton.disabled = !hasSelection;
    }
    function updateTopBarForMultiSelectView(isActive) { /* Same as previous */
        if (!topBar) return;
        if (isActive) {
            topBar.classList.add('multi-select-mode');
            updateMultiSelectCount();
        } else {
            topBar.classList.remove('multi-select-mode');
        }
    }
    function handleDeleteSelectedEntries() { /* Same as previous, but ensure initializeForm or updateTabIndicators is called */
        if (selectedEntriesForMultiAction.length === 0) {
            showToast('No entries selected for deletion.', 'info');
            return;
        }
        const confirmed = confirm(`Are you sure you want to delete ${selectedEntriesForMultiAction.length} selected entries? This action cannot be undone.`);
        if (confirmed) {
            let deleteCount = 0;
            const currentFormDateWasDeleted = selectedEntriesForMultiAction.includes(dateInput.value);
            selectedEntriesForMultiAction.forEach(dateStr => {
                if (handleDeleteEntry(dateStr, true)) deleteCount++;
            });
            showToast(`${deleteCount} of ${selectedEntriesForMultiAction.length} entries deleted.`, 'success');
            
            if (currentFormDateWasDeleted) {
                diaryForm.reset();
                initializeForm(true); // Re-initialize form if current date was deleted
            }
            // disableMultiSelectMode calls renderHistoryList, which is good.
            // If current form wasn't deleted, its indicators might still need an update if other tabs were affected,
            // but the main `input` listener or subsequent actions usually handle this.
            // A specific call to updateTabIndicators() here might be redundant but harmless.
            updateTabIndicators(); 
            disableMultiSelectMode(); 
        }
    }
    function handleExportSelectedEntries() { /* Same as previous */ 
        if (selectedEntriesForMultiAction.length === 0) {
            showToast('No entries selected for export.', 'info');
            return;
        }
        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const entriesToExport = [];
        selectedEntriesForMultiAction.forEach(dateStr => {
            const entryFormData = allSavedData[dateStr];
            if (entryFormData) {
                entriesToExport.push(getFullEntryDataForExport(entryFormData, dateStr));
            }
        });

        if (entriesToExport.length > 0) {
            const jsonString = JSON.stringify(entriesToExport, null, 2);
            const timestamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
            downloadJSON(jsonString, `diary_export_multiple_${timestamp}.json`);
            showToast(`${entriesToExport.length} entries exported.`, 'success');
            disableMultiSelectMode();
        } else {
            showToast('No valid data found for selected entries.', 'error');
        }
    }


    // --- Event Listeners & Initialization ---
    window.addEventListener('resize', updateKeyboardStatus);
    diaryForm.addEventListener('focusin', (event) => {
        if (isPotentiallyFocusableForKeyboard(event.target)) viewportHeightBeforeKeyboard = window.innerHeight;
    });
    diaryForm.addEventListener('focusout', (event) => {
        if (isPotentiallyFocusableForKeyboard(event.target)) setTimeout(() => { isKeyboardOpen = false; viewportHeightBeforeKeyboard = window.innerHeight; updateKeyboardStatus(); }, 100);
    });
    if (dateInput) dateInput.addEventListener('change', () => { updateCurrentDateDisplay(dateInput.value); loadFormFromLocalStorage(); });
    if (dateIncrementButton) dateIncrementButton.addEventListener('click', () => changeDate(1));
    if (dateDecrementButton) dateDecrementButton.addEventListener('click', () => changeDate(-1));
    if (energyLevelSlider) energyLevelSlider.addEventListener('input', () => updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay));
    if (stressLevelSlider) stressLevelSlider.addEventListener('input', () => updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay));
    if (humidityPercentSlider) humidityPercentSlider.addEventListener('input', () => updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay));
    if (uvIndexSlider) uvIndexSlider.addEventListener('input', () => updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay));
    if (dailyActivitySummaryTextarea) dailyActivitySummaryTextarea.addEventListener('input', updateSummaryCounts);
    if (topBarClearButton) topBarClearButton.addEventListener('click', clearDiaryForm); 

    diaryForm.addEventListener('input', () => {
        updateTabIndicators();
    });
    
    diaryForm.addEventListener('submit', function(event) { /* Same as previous */ 
        event.preventDefault();
        if (!downloadButton) return;
        const originalDownloadIconHTML = downloadButton.querySelector('i')?.outerHTML;
        setButtonLoadingState(downloadButton, true, originalDownloadIconHTML);
        setTimeout(() => {
            try {
                const data = {};
                const selectedDateStr = getValue('date');
                 if (!selectedDateStr) {
                     showToast('Please select a date for the entry.', 'error');
                     setButtonLoadingState(downloadButton, false, originalDownloadIconHTML);
                     return;
                }
                data.date = selectedDateStr;
                data.day_id = calculateDaysSince(REFERENCE_START_DATE, selectedDateStr);
                data.environment = { temperature_c: getValue('temperatureC'), air_quality_index: getValue('airQualityIndex', 'number'), humidity_percent: getValue('humidityPercent', 'range'), uv_index: getValue('uvIndex', 'range'), weather_condition: getValue('weatherCondition') };
                data.body_measurements = { weight_kg: getValue('weightKg', 'number'), height_cm: getValue('heightCm', 'number'), chest: getValue('chest', 'number'), belly: getValue('belly', 'number') };
                data.health_and_fitness = { sleep_hours: getValue('sleepHours'), steps_count: getValue('stepsCount', 'number'), steps_distance_km: getValue('stepsDistanceKm'), kilocalorie: getValue('kilocalorie', 'number'), water_intake_liters: getValue('waterIntakeLiters', 'number'), medications_taken: getValue('medicationsTaken'), physical_symptoms: getValue('physicalSymptoms'), energy_level: getValue('energyLevel', 'range'), stress_level: getValue('stressLevel', 'range') };
                data.mental_and_emotional_health = { mental_state: getValue('mentalState'), meditation_status: getValue('meditationStatus'), meditation_duration_min: getValue('meditationDurationMin', 'number') };
                data.personal_care = { face_product_name: getValue('faceProductName'), face_product_brand: getValue('faceProductBrand'), hair_product_name: getValue('hairProductName'), hair_product_brand: getValue('hairProductBrand'), hair_oil: getValue('hairOil'), skincare_routine: getValue('skincareRoutine') };
                data.diet_and_nutrition = { breakfast: getValue('breakfast'), lunch: getValue('lunch'), dinner: getValue('dinner'), additional_items: getValue('additionalItems') };
                data.activities_and_productivity = { tasks_today_english: getValue('tasksTodayEnglish'), travel_destination: getValue('travelDestination'), phone_screen_on_hr: getValue('phoneScreenOnHr') };
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
    if (importJsonButton) importJsonButton.addEventListener('click', () => jsonFileInput.click());
    jsonFileInput.addEventListener('change', function(event) { /* Same as previous, ensure populateFormWithJson is used */ 
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
                    for (let i = 0; i < tabPanels.length - 1; i++) { 
                        const panelId = tabPanels[i].id;
                        const inputIdsForPanel = tabInputMap[panelId] || [];
                        let hasData = false;
                        for (const inputId of inputIdsForPanel) {
                            const inputElement = document.getElementById(inputId);
                            if (inputElement && inputElement.value.trim() !== '' && inputElement.value.trim() !== 'Na' && inputElement.value.trim() !== '0') {
                                hasData = true;
                                break;
                            }
                        }
                        if (panelId === 'tab-summary' && document.getElementById('dailyActivitySummary').value.trim() !== '') {
                            hasData = true;
                        }
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
    if (saveFormButton) saveFormButton.addEventListener('click', () => { /* Same as previous, ensure performSaveOperation is used */ 
        const originalSaveIconHTML = saveFormButton.querySelector('i')?.outerHTML;
        setButtonLoadingState(saveFormButton, true, originalSaveIconHTML);
        setTimeout(() => {
            performSaveOperation(false); 
            setButtonLoadingState(saveFormButton, false, originalSaveIconHTML);
        }, 10);
    });
    bottomNavButtons.forEach((button, index) => button.addEventListener('click', () => slideToPanel(index)));
    if (tabViewPort) { /* Same swipe logic as previous */ 
        let swipeInProgress = false;
        tabViewPort.addEventListener('touchstart', (e) => {
            if (isKeyboardOpen || e.target.closest('.slider-container') || e.target.closest('input[type="range"]') || (isMultiSelectModeActive && tabPanels[currentTabIndex]?.id === 'tab-history')) {
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
    window.addEventListener('pagehide', autoSaveOnPageHide);
    if (cancelMultiSelectButton) cancelMultiSelectButton.addEventListener('click', disableMultiSelectMode);
    if (deleteSelectedButton) deleteSelectedButton.addEventListener('click', handleDeleteSelectedEntries);
    if (exportSelectedButton) exportSelectedButton.addEventListener('click', handleExportSelectedEntries);

    // Initial Setup
    updateTopBarForMultiSelectView(false);
    // Call loadFormFromLocalStorage directly. It will handle setting the date,
    // applying defaults (via initializeForm(true)), loading stored data, and updating indicators.
    loadFormFromLocalStorage(); 
    slideToPanel(0, false);


    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
                .catch(error => console.log('ServiceWorker registration failed: ', error));
        });
    }
});