document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
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
    const historyTabPanel = document.getElementById('tab-history'); 

    const topBar = document.querySelector('.top-bar');
    const multiSelectCountSpan = document.getElementById('multiSelectCount');
    const exportSelectedButton = document.getElementById('exportSelectedButton');
    const deleteSelectedButton = document.getElementById('deleteSelectedButton');
    const cancelMultiSelectButton = document.getElementById('cancelMultiSelectButton');

    // --- Constants and State Variables ---
    const REFERENCE_START_DATE = new Date(2003, 6, 4); // July 4, 2003
    const LOCAL_STORAGE_KEY = 'myPersonalDiaryFormData';
    const MAX_SUGGESTIONS_PER_FIELD = 7;

    let currentTabIndex = 0;
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

    // --- Utility Functions ---

    function isPotentiallyFocusableForKeyboard(element) {
        if (!element) return false;
        const tagName = element.tagName;
        const type = element.type;
        if (tagName === 'TEXTAREA') return true;
        if (tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'date', 'color'].includes(type)) {
            return true;
        }
        if (tagName === 'SELECT') return true;
        return false;
    }

    function updateKeyboardStatus() {
        const currentWindowHeight = window.innerHeight;
        const activeElement = document.activeElement;
        const isTextInputActive = isPotentiallyFocusableForKeyboard(activeElement);

        if (isTextInputActive) {
            if (viewportHeightBeforeKeyboard - currentWindowHeight > MIN_KEYBOARD_HEIGHT_PX) {
                isKeyboardOpen = true;
            }
            else if (currentWindowHeight > (viewportHeightBeforeKeyboard - MIN_KEYBOARD_HEIGHT_PX + (MIN_KEYBOARD_HEIGHT_PX / 3))) {
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
                // Fallback if originalIcon dataset was not set (e.g. initial call)
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = originalIconHTML;
                if (tempDiv.firstChild) iconElement.className = tempDiv.firstChild.className;
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
                    const dateObj = new Date(dateStr + 'T00:00:00'); // Ensure consistent time for local display
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
            currentDateValue = new Date(); // Use local today
        }

        if (!isNaN(currentDateValue.getTime())) {
            currentDateValue.setDate(currentDateValue.getDate() + days);
            dateInput.value = formatDate(currentDateValue);
            updateCurrentDateDisplay(dateInput.value);
            loadFormFromLocalStorage();
        } else { // Fallback if date was invalid
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

    // --- Empty Field Indicator Logic ---
    function checkTabForEmptyValues(tabPanelElement) {
        if (!tabPanelElement || tabPanelElement.id === 'tab-history') {
            return false;
        }
        const inputsToCheck = tabPanelElement.querySelectorAll(
            'input[type="text"], input[type="number"], input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input[type="url"], textarea, select'
        );
        for (const input of inputsToCheck) {
            if (input.closest('.slider-container')) continue;
            if (input.id === 'date') continue; // Date is handled by top bar
            if (input.type === 'select-one' || input.type === 'select-multiple') {
                if (input.value === '') return true;
            } else {
                if (input.value.trim() === '') return true;
            }
        }
        return false;
    }

    function updateTabIconWithIndicator(tabId, hasEmptyValues) {
        const navButton = document.querySelector(`.bottom-nav-button[data-tab-target="${tabId}"]`);
        if (navButton) {
            if (hasEmptyValues) {
                navButton.classList.add('has-empty-indicator');
            } else {
                navButton.classList.remove('has-empty-indicator');
            }
        }
    }

    function checkAndUpdateAllTabIcons() {
        if (typeof tabPanels !== 'undefined') {
            tabPanels.forEach(panel => {
                // Ensure panel has inputs and is not history tab
                if (panel.id && panel.id !== 'tab-history' && panel.querySelector('input, textarea, select')) {
                    const hasEmpty = checkTabForEmptyValues(panel);
                    updateTabIconWithIndicator(panel.id, hasEmpty);
                }
            });
        }
    }


    // --- Form Management ---
    function clearDiaryForm() {
        if (confirm("Are you sure you want to clear the form? This will remove unsaved changes and locally saved data for the current date (suggestions will remain).")) {
            diaryForm.reset(); // Resets form fields to their HTML default values
            const currentFormDate = dateInput.value; // Get date *before* initializing
            if (currentFormDate) {
                const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
                if (allSavedData[currentFormDate]) {
                    delete allSavedData[currentFormDate];
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
                    if (tabPanels[currentTabIndex]?.id === 'tab-history') {
                        renderHistoryList(); // Update history if it's visible
                    }
                }
            }
            initializeForm(true); // Now initialize with defaults, setting today's date if needed
            showToast("Form cleared for current date.", "info");
            slideToPanel(0);
        }
    }

    function initializeForm(isClearing = false) {
        // Set date if not already set or if clearing
        if (!dateInput.value || isClearing) {
            const today = new Date();
            dateInput.value = formatDate(today);
        }
        updateCurrentDateDisplay(dateInput.value);

        // Set default values if clearing or form is truly new
        if (isClearing) {
            // Specific defaults (these will be set by diaryForm.reset() if they are HTML defaults,
            // but can be explicitly set here if different from HTML defaults or for non-input elements)
            ['weightKg', 'heightCm', 'chest', 'belly', 'meditationStatus',
             'meditationDurationMin', 'sleepHours', 'medicationsTaken', 'skincareRoutine'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    // Set to specific values or rely on diaryForm.reset() and HTML attributes
                    if (id === 'weightKg') el.value = "72";
                    else if (id === 'heightCm') el.value = "178";
                    else if (id === 'chest') el.value = "90";
                    else if (id === 'belly') el.value = "89";
                    else if (id === 'meditationStatus') el.value = "Na";
                    else if (id === 'meditationDurationMin') el.value = "0";
                    else if (id === 'sleepHours') el.value = "8:00";
                    else if (id === 'medicationsTaken') el.value = "Na";
                    else if (id === 'skincareRoutine') el.value = "Na";
                    else el.value = ''; // Default for others
                }
            });
            setValue('otherNoteStatus', 'No'); // Explicitly set if it's a common default

            // Reset sliders to their default values
            if (energyLevelSlider) energyLevelSlider.value = 5;
            if (stressLevelSlider) stressLevelSlider.value = 5;
            if (humidityPercentSlider) humidityPercentSlider.value = 10;
            if (uvIndexSlider) uvIndexSlider.value = 9;
        }

        // Update slider display values
        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
        if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);

        loadAllSuggestions(); // Load suggestions for datalists

        // If not clearing, attempt to load data for the current date
        if (!isClearing) {
            loadFormFromLocalStorage();
        } else {
             // Ensure 'otherNoteStatus' has a value even after clearing if it was not reset by diaryForm.reset()
             setValue('otherNoteStatus', getValue('otherNoteStatus') || 'No');
        }
        updateSummaryCounts(); // Update word/char counts
        updateKeyboardStatus(); // Check keyboard state
        checkAndUpdateAllTabIcons(); // Update tab indicators for empty fields
    }

    function populateFormWithJson(jsonData) {
        // Does NOT reset the form internally. Caller should handle reset if needed.
        // This function is purely for populating based on jsonData.

        setValue('date', jsonData.date);
        updateCurrentDateDisplay(jsonData.date);

        // Environment
        if (jsonData.environment) {
            const envMap = {temperature_c:'temperatureC', air_quality_index:'airQualityIndex', humidity_percent:'humidityPercent', uv_index:'uvIndex', weather_condition:'weatherCondition'};
            Object.keys(envMap).forEach(key => setValue(envMap[key], jsonData.environment[key]));
        }
        // Body Measurements
        if (jsonData.body_measurements) {
            const bodyMap = {weight_kg:'weightKg', height_cm:'heightCm', chest:'chest', belly:'belly'};
            Object.keys(bodyMap).forEach(key => setValue(bodyMap[key], jsonData.body_measurements[key]));
        }
        // Health & Fitness
        if (jsonData.health_and_fitness) {
            const healthMap = {sleep_hours:'sleepHours', steps_count:'stepsCount', steps_distance_km:'stepsDistanceKm', kilocalorie:'kilocalorie', water_intake_liters:'waterIntakeLiters', medications_taken:'medicationsTaken', physical_symptoms:'physicalSymptoms', energy_level:'energyLevel', stress_level:'stressLevel'};
            Object.keys(healthMap).forEach(key => setValue(healthMap[key], jsonData.health_and_fitness[key]));
        }
        // Mental & Emotional Health
        if (jsonData.mental_and_emotional_health) {
            setValue('mentalState', jsonData.mental_and_emotional_health.mental_state);
            setValue('meditationStatus', jsonData.mental_and_emotional_health.meditation_status);
            setValue('meditationDurationMin', jsonData.mental_and_emotional_health.meditation_duration_min);
        }
        // Personal Care
        if (jsonData.personal_care) {
            setValue('faceProductName', jsonData.personal_care.face_product_name);
            setValue('faceProductBrand', jsonData.personal_care.face_product_brand);
            setValue('hairProductName', jsonData.personal_care.hair_product_name);
            setValue('hairProductBrand', jsonData.personal_care.hair_product_brand);
            setValue('hairOil', jsonData.personal_care.hair_oil);
            setValue('skincareRoutine', jsonData.personal_care.skincare_routine);
        }
        // Diet & Nutrition
        if (jsonData.diet_and_nutrition) {
            setValue('breakfast', jsonData.diet_and_nutrition.breakfast);
            setValue('lunch', jsonData.diet_and_nutrition.lunch);
            setValue('dinner', jsonData.diet_and_nutrition.dinner);
            setValue('additionalItems', jsonData.diet_and_nutrition.additional_items);
        }
        // Activities & Productivity
        if (jsonData.activities_and_productivity) {
            setValue('tasksTodayEnglish', jsonData.activities_and_productivity.tasks_today_english);
            setValue('travelDestination', jsonData.activities_and_productivity.travel_destination);
            setValue('phoneScreenOnHr', jsonData.activities_and_productivity.phone_screen_on_hr);
        }
        // Additional Notes
        if (jsonData.additional_notes) {
            setValue('keyEvents', jsonData.additional_notes.key_events);
            setValue('otherNoteStatus', jsonData.additional_notes.other_note_status || 'No');
        } else {
             setValue('otherNoteStatus', 'No'); // Default if section is missing
        }
        // Daily Summary
        setValue('dailyActivitySummary', jsonData.daily_activity_summary);

        // Update UI elements based on new values
        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
        if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
        updateSummaryCounts();
        checkAndUpdateAllTabIcons();
    }

    function performSaveOperation(isSilent = false) {
        try {
            saveAllSuggestions(); // Save any new input values to datalist suggestions
            const currentFormDate = dateInput.value;
            if (!currentFormDate) {
                if (!isSilent) showToast('Please select a date first to save.', 'error');
                return false;
            }

            // Create an object to hold all form data
            const formDataToSave = {};
            diaryForm.querySelectorAll('input[id]:not([type="file"]), textarea[id], select[id]').forEach(element => {
                if (element.id) { // Ensure element has an ID
                   formDataToSave[element.id] = (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value;
                }
            });
            formDataToSave.date = currentFormDate; // Explicitly ensure date is part of the saved object matching the key

            // Retrieve all currently saved data, or initialize if none exists
            let allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            allSavedData[currentFormDate] = formDataToSave; // Add or update the entry for the current date

            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
            if (!isSilent) showToast('Form data saved locally for this date!', 'success');

            // If history tab is active, refresh its content
            if (tabPanels[currentTabIndex]?.id === 'tab-history') {
                renderHistoryList();
            }
            return true;
        } catch (e) {
            console.error("Error saving to localStorage:", e);
            if (!isSilent) showToast('Failed to save form data. Storage might be full.', 'error');
            return false;
        }
    }

    function loadFormFromLocalStorage() {
        const currentFormDate = dateInput.value;
        if (!currentFormDate) {
            diaryForm.reset(); 
            initializeForm(true); // Initialize with defaults for today
            return;
        }
        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const formDataForDate = allSavedData[currentFormDate];
        
        diaryForm.reset(); // Reset form to HTML defaults
        initializeForm(true); // Apply application-specific defaults and set date to currentFormDate

        setValue('date', currentFormDate); // Ensure date input shows the correct date
        updateCurrentDateDisplay(currentFormDate);

        if (formDataForDate) {
            try {
                // Populate form with saved data
                Object.keys(formDataForDate).forEach(elementId => {
                    const element = document.getElementById(elementId);
                    if (element) { // Check if element exists
                        if (elementId !== 'date') { // Date is already handled
                           setValue(elementId, formDataForDate[elementId]);
                        }
                    }
                });
                // Ensure 'otherNoteStatus' is explicitly handled if it might be missing
                setValue('otherNoteStatus', formDataForDate.otherNoteStatus || 'No');

                // Optionally, show a toast that data was loaded, but not if page is hidden or in multi-select
                if (!document.hidden && !isMultiSelectModeActive) {
                    showToast('Previously saved data for this date loaded.', 'info');
                }
            } catch (e) {
                console.error("Error loading from localStorage for date:", currentFormDate, e);
                showToast('Could not load saved data. It might be corrupted.', 'error');
            }
        } else {
            // If no data for this date, ensure 'otherNoteStatus' is set to default
            setValue('otherNoteStatus', 'No');
        }

        // Update UI elements based on loaded/default values
        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
        if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
        updateSummaryCounts();
        checkAndUpdateAllTabIcons();
    }

    function autoSaveOnPageHide() {
        if (isMultiSelectModeActive || (tabPanels[currentTabIndex]?.id === 'tab-history')) return; // Don't autosave if in multi-select or on history tab
        const success = performSaveOperation(true); // Silent save
        if (success) {
            console.log('Auto-save successful on page hide.');
        }
    }

    // --- Tab Navigation ---
    function slideToPanel(index, animate = true) {
        if (!tabPanelsSlider || index < 0 || index >= tabPanels.length) return;

        if (isMultiSelectModeActive && tabPanels[currentTabIndex]?.id === 'tab-history' && tabPanels[index]?.id !== 'tab-history') {
            disableMultiSelectMode(); // Exit multi-select if navigating away from history tab
        }

        currentTabIndex = index;
        const offset = -index * 100;
        tabPanelsSlider.style.transition = animate ? 'transform 0.35s ease-in-out' : 'none';
        tabPanelsSlider.style.transform = `translateX(${offset}%)`;

        bottomNavButtons.forEach((btn, i) => btn.classList.toggle('active', i === index));

        // If navigating to history tab, render its content
        if (tabPanels[index] && tabPanels[index].id === 'tab-history') {
            renderHistoryList();
        }
    }

    // --- History Tab & Multi-Select Functionality ---
    function renderHistoryList() {
        if (!historyListContainer || !historyTabPanel) return;

        let currentScrollTop = historyTabPanel.scrollTop; // Preserve scroll position

        // Preserve expanded JSON views
        const expandedItemDates = new Set();
        historyListContainer.querySelectorAll('.history-item.expanded-json').forEach(item => {
            if (item.dataset.date) expandedItemDates.add(item.dataset.date);
        });

        const noHistoryMsgElement = historyListContainer.querySelector('.no-history-message');
        // Clear existing items except the "no history" message
        const existingItems = historyListContainer.querySelectorAll('.history-item');
        existingItems.forEach(item => item.remove());


        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const dates = Object.keys(allSavedData).sort((a, b) => new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')); // Sort newest first

        if (dates.length === 0) {
            if (noHistoryMsgElement) noHistoryMsgElement.style.display = 'block';
        } else {
            if (noHistoryMsgElement) noHistoryMsgElement.style.display = 'none';
            dates.forEach(dateStr => {
                const entryData = allSavedData[dateStr];
                if (!entryData) return; // Should not happen if key exists

                const listItem = document.createElement('div');
                listItem.classList.add('history-item');
                listItem.dataset.date = dateStr;

                const mainContent = document.createElement('div');
                mainContent.classList.add('history-item-main-content');

                if (isMultiSelectModeActive) {
                    listItem.classList.add('multi-select-active');
                    if (selectedEntriesForMultiAction.includes(dateStr)) {
                        listItem.classList.add('selected');
                    }
                }

                // Expand JSON Button
                const expandJsonBtn = document.createElement('button');
                expandJsonBtn.type = 'button';
                expandJsonBtn.classList.add('history-item-expand-json');
                expandJsonBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                expandJsonBtn.title = 'Show/Hide JSON Data';
                expandJsonBtn.setAttribute('aria-expanded', 'false');
                mainContent.appendChild(expandJsonBtn);

                // Checkbox for Multi-select
                const checkboxContainer = document.createElement('div');
                checkboxContainer.classList.add('history-item-checkbox-container');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('history-item-checkbox');
                checkbox.dataset.date = dateStr;
                checkbox.checked = isMultiSelectModeActive && selectedEntriesForMultiAction.includes(dateStr);
                checkboxContainer.appendChild(checkbox);
                mainContent.appendChild(checkboxContainer);

                // Details (Date, Preview)
                const details = document.createElement('div');
                details.classList.add('history-item-details');
                const itemDate = document.createElement('div');
                itemDate.classList.add('history-item-date');
                try {
                    itemDate.textContent = new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
                } catch (e) { itemDate.textContent = dateStr; } // Fallback
                const preview = document.createElement('div');
                preview.classList.add('history-item-preview');
                const summary = entryData.dailyActivitySummary || entryData.keyEvents || 'No summary/events';
                preview.textContent = summary.substring(0, 50) + (summary.length > 50 ? '...' : '');
                details.appendChild(itemDate);
                details.appendChild(preview);
                mainContent.appendChild(details);

                // Action Buttons (Export, Delete for single item)
                const actions = document.createElement('div');
                actions.classList.add('history-item-actions');
                
                const exportBtn = document.createElement('button');
                exportBtn.type = 'button';
                exportBtn.innerHTML = '<i class="fas fa-file-export"></i>'; exportBtn.title = 'Export Entry'; exportBtn.classList.add('action-export');
                actions.appendChild(exportBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; deleteBtn.title = 'Delete Entry'; deleteBtn.classList.add('action-delete');
                actions.appendChild(deleteBtn);
                
                mainContent.appendChild(actions);
                listItem.appendChild(mainContent);

                // JSON View Area (hidden by default)
                const jsonView = document.createElement('pre');
                jsonView.classList.add('history-item-json-view');
                listItem.appendChild(jsonView);

                if (expandedItemDates.has(dateStr)) {
                    const fullEntryData = getFullEntryDataForExport(entryData, dateStr); // entryData is already localStorage format
                    jsonView.textContent = JSON.stringify(fullEntryData, null, 2);
                    jsonView.style.display = 'block';
                    expandJsonBtn.setAttribute('aria-expanded', 'true');
                    expandJsonBtn.classList.add('expanded');
                    listItem.classList.add('expanded-json');
                }

                // Event Listeners for item interactions
                expandJsonBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isCurrentlyExpanded = expandJsonBtn.getAttribute('aria-expanded') === 'true';
                    if (isCurrentlyExpanded) {
                        jsonView.style.display = 'none';
                        jsonView.textContent = ''; 
                        expandJsonBtn.setAttribute('aria-expanded', 'false');
                        expandJsonBtn.classList.remove('expanded');
                        listItem.classList.remove('expanded-json');
                    } else {
                        const currentEntryDataFromStorage = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}')[dateStr];
                        if(currentEntryDataFromStorage) {
                            const fullEntryData = getFullEntryDataForExport(currentEntryDataFromStorage, dateStr);
                            jsonView.textContent = JSON.stringify(fullEntryData, null, 2);
                            jsonView.style.display = 'block';
                            expandJsonBtn.setAttribute('aria-expanded', 'true');
                            expandJsonBtn.classList.add('expanded');
                            listItem.classList.add('expanded-json');
                        }
                    }
                });

                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent item click
                    toggleMultiSelectEntry(dateStr, listItem, checkbox);
                });

                exportBtn.addEventListener('click', (e) => { e.stopPropagation(); handleExportEntry(dateStr); });
                deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); handleDeleteEntry(dateStr); });

                // Main content click (for edit or multi-select toggle)
                mainContent.addEventListener('click', (event) => {
                    handleHistoryItemClick(event, dateStr, listItem);
                });
                
                // Touch events for long press
                listItem.addEventListener('touchstart', (e) => handleHistoryItemTouchStart(e, dateStr, listItem), { passive: false });
                listItem.addEventListener('touchmove', handleHistoryItemTouchMove);
                listItem.addEventListener('touchend', () => handleHistoryItemTouchEnd(dateStr, listItem)); 
                
                // Context menu for long press alternative on desktop
                listItem.addEventListener('contextmenu', (e) => { 
                    e.preventDefault();
                    // Ignore if context menu is on interactive elements
                    if (e.target.closest('.history-item-expand-json') || 
                        e.target.closest('.history-item-actions button') || 
                        e.target.closest('.history-item-checkbox-container')) {
                        return;
                    }
                    
                    if (!isMultiSelectModeActive) enableMultiSelectMode();
                    const currentCheckbox = listItem.querySelector('.history-item-checkbox');
                    toggleMultiSelectEntry(dateStr, listItem, currentCheckbox); // Toggle selection
                });

                if (noHistoryMsgElement) { // Insert before the "no history" message if it exists
                    historyListContainer.insertBefore(listItem, noHistoryMsgElement);
                } else {
                    historyListContainer.appendChild(listItem);
                }
            });
        }
        historyTabPanel.scrollTop = currentScrollTop; // Restore scroll position
    }


    function handleHistoryItemTouchStart(event, dateStr, listItem) {
        // Ignore if touch starts on interactive elements within the item
        if (event.target.closest('.history-item-expand-json') || event.target.closest('.history-item-actions button') || event.target.closest('.history-item-checkbox-container')) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            return;
        }
        itemTouchStartX = event.touches[0].clientX;
        itemTouchStartY = event.touches[0].clientY;
        clearTimeout(longPressTimer); // Clear any existing timer
        longPressTimer = setTimeout(() => {
            longPressTimer = null; // Timer has fired
            if (!isMultiSelectModeActive) {
                enableMultiSelectMode(); // Enable mode first
                // Re-find the listItem in case the DOM was re-rendered by enableMultiSelectMode
                const freshListItem = historyListContainer.querySelector(`.history-item[data-date="${dateStr}"]`);
                if (freshListItem) {
                    const checkbox = freshListItem.querySelector('.history-item-checkbox');
                    toggleMultiSelectEntry(dateStr, freshListItem, checkbox); // Then toggle
                }
            } else {
                // If already in multi-select, just toggle this item
                const checkbox = listItem.querySelector('.history-item-checkbox');
                toggleMultiSelectEntry(dateStr, listItem, checkbox);
            }
            if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
        }, LONG_PRESS_DURATION);
    }

    function handleHistoryItemTouchMove(event) {
        if (longPressTimer) { // Only if a long press is pending
            const deltaX = Math.abs(event.touches[0].clientX - itemTouchStartX);
            const deltaY = Math.abs(event.touches[0].clientY - itemTouchStartY);
            // If significant movement, cancel long press (it's a scroll)
            if (deltaX > 10 || deltaY > 10) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }
    }

    function handleHistoryItemTouchEnd(dateStr, listItem) {
        if (longPressTimer) { // If timer still active (short tap, not a long press or scroll)
            clearTimeout(longPressTimer);
            longPressTimer = null;
            handleHistoryItemClick(null, dateStr, listItem); // Treat as a regular click
        }
        // If longPressTimer is null, it means it either fired (long press) or was cancelled (scroll)
    }

    function handleHistoryItemClick(event, dateStr, listItem) {
        // If event exists, check if click was on specific interactive parts
        if (event && event.target) {
            if (event.target.closest('.history-item-expand-json') ||
                event.target.closest('.history-item-checkbox-container input[type="checkbox"]') || 
                event.target.closest('.history-item-actions button')) {
                return; // Action already handled by specific listeners
            }
        }

        if (isMultiSelectModeActive) {
            const checkbox = listItem.querySelector('.history-item-checkbox');
            toggleMultiSelectEntry(dateStr, listItem, checkbox);
        } else {
            handleEditEntry(dateStr); // Default action: edit entry
        }
    }


    function handleEditEntry(dateStr) {
        if (isMultiSelectModeActive) disableMultiSelectMode(); // Exit multi-select if editing

        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const entryFormData = allSavedData[dateStr]; // This is already in localStorage format
        if (entryFormData) {
            diaryForm.reset(); 
            initializeForm(true); // Reset to defaults, set current date, etc.

            setValue('date', dateStr); // Set the date input to the entry's date
            updateCurrentDateDisplay(dateStr);

            // Populate form with the entry's data
            Object.keys(entryFormData).forEach(elementId => {
                if (elementId !== 'date') { // Date is already handled
                    setValue(elementId, entryFormData[elementId]);
                }
            });
            setValue('otherNoteStatus', entryFormData.otherNoteStatus || 'No'); // Ensure this default

            // Update UI elements
            if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
            if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
            if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
            if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
            updateSummaryCounts();
            checkAndUpdateAllTabIcons(); 

            showToast(`Editing entry for ${new Date(dateStr + 'T00:00:00').toLocaleDateString()}.`, 'info');
            slideToPanel(0); // Navigate to the first tab (basic info)
        } else {
            showToast('Could not find entry data to edit.', 'error');
        }
    }

    function getFullEntryDataForExport(entryFormData, dateKey) {
        // entryFormData is the object directly from localStorage (form field IDs as keys)
        const exportData = {};
        exportData.date = entryFormData.date || dateKey; // Use date from object or key
        exportData.day_id = calculateDaysSince(REFERENCE_START_DATE, exportData.date);

        const pFloat = val => (val !== null && val !== undefined && String(val).trim() !== "" && !isNaN(parseFloat(String(val)))) ? parseFloat(String(val)) : null;
        const pInt = val => (val !== null && val !== undefined && String(val).trim() !== "" && !isNaN(parseInt(String(val)))) ? parseInt(String(val)) : null;

        exportData.environment = { 
            temperature_c: entryFormData.temperatureC || '', 
            air_quality_index: pInt(entryFormData.airQualityIndex), 
            humidity_percent: pInt(entryFormData.humidityPercent), // Already number from range
            uv_index: pInt(entryFormData.uvIndex), // Already number from range
            weather_condition: entryFormData.weatherCondition || '' 
        };
        exportData.body_measurements = { 
            weight_kg: pFloat(entryFormData.weightKg), 
            height_cm: pInt(entryFormData.heightCm), 
            chest: pInt(entryFormData.chest), 
            belly: pInt(entryFormData.belly) 
        };
        exportData.health_and_fitness = { 
            sleep_hours: entryFormData.sleepHours || '', 
            steps_count: pInt(entryFormData.stepsCount), 
            steps_distance_km: pFloat(entryFormData.stepsDistanceKm), 
            kilocalorie: pInt(entryFormData.kilocalorie), 
            water_intake_liters: pFloat(entryFormData.waterIntakeLiters), 
            medications_taken: entryFormData.medicationsTaken || '', 
            physical_symptoms: entryFormData.physicalSymptoms || '', 
            energy_level: pInt(entryFormData.energyLevel), // Already number from range
            stress_level: pInt(entryFormData.stressLevel)  // Already number from range
        };
        exportData.mental_and_emotional_health = { 
            mental_state: entryFormData.mentalState || '', 
            meditation_status: entryFormData.meditationStatus || '', 
            meditation_duration_min: pInt(entryFormData.meditationDurationMin) 
        };
        exportData.personal_care = { 
            face_product_name: entryFormData.faceProductName || '', 
            face_product_brand: entryFormData.faceProductBrand || '', 
            hair_product_name: entryFormData.hairProductName || '', 
            hair_product_brand: entryFormData.hairProductBrand || '', 
            hair_oil: entryFormData.hairOil || '', 
            skincare_routine: entryFormData.skincareRoutine || '' 
        };
        exportData.diet_and_nutrition = { 
            breakfast: entryFormData.breakfast || '', 
            lunch: entryFormData.lunch || '', 
            dinner: entryFormData.dinner || '', 
            additional_items: entryFormData.additionalItems || '' 
        };
        exportData.activities_and_productivity = { 
            tasks_today_english: entryFormData.tasksTodayEnglish || '', 
            travel_destination: entryFormData.travelDestination || '', 
            phone_screen_on_hr: entryFormData.phoneScreenOnHr || '' 
        };
        exportData.additional_notes = { 
            key_events: entryFormData.keyEvents || '',
            other_note_status: entryFormData.otherNoteStatus || 'No' 
        };
        exportData.daily_activity_summary = entryFormData.dailyActivitySummary || '';
        return exportData;
    }

    function handleExportEntry(dateStr) {
        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const entryFormData = allSavedData[dateStr]; // This is localStorage format
        if (entryFormData) {
            const exportData = getFullEntryDataForExport(entryFormData, dateStr);
            const jsonString = JSON.stringify(exportData, null, 2);
            downloadJSON(jsonString, `${dateStr}.json`);
            showToast('Entry exported.', 'success');
        } else {
            showToast('Could not find entry data to export.', 'error');
        }
    }

    function handleDeleteEntry(dateStr, isPartOfMulti = false) {
        const confirmed = isPartOfMulti ? true : confirm(`Are you sure you want to delete the entry for ${new Date(dateStr+'T00:00:00').toLocaleDateString()}? This action cannot be undone.`);
        if (confirmed) {
            const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            if (allSavedData[dateStr]) {
                delete allSavedData[dateStr];
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
                if (!isPartOfMulti) {
                    showToast('Entry deleted.', 'success');
                    renderHistoryList(); // Refresh list if not part of multi-delete (multi-delete refreshes at end)
                }
                return true; // Indicate success
            } else {
                if (!isPartOfMulti) showToast('Entry not found for deletion.', 'error');
                return false; // Indicate failure
            }
        }
        return false; // Not confirmed
    }

    function enableMultiSelectMode() {
        if (isMultiSelectModeActive) return;
        isMultiSelectModeActive = true;
        selectedEntriesForMultiAction = []; // Clear previous selections
        updateTopBarForMultiSelectView(true);
        renderHistoryList(); // Re-render to show checkboxes
        showToast('Multi-select enabled. Tap items to select.', 'info');
    }

    function disableMultiSelectMode() {
        if (!isMultiSelectModeActive) return;
        isMultiSelectModeActive = false;
        selectedEntriesForMultiAction = [];
        updateTopBarForMultiSelectView(false);
        renderHistoryList(); // Re-render to hide checkboxes and clear selections
    }

    function toggleMultiSelectEntry(dateStr, listItemElement, checkboxElement = null) {
        const index = selectedEntriesForMultiAction.indexOf(dateStr);
        const actualCheckbox = checkboxElement || listItemElement.querySelector('.history-item-checkbox');

        if (index > -1) { // Item is currently selected, so deselect it
            selectedEntriesForMultiAction.splice(index, 1);
            listItemElement.classList.remove('selected');
            if (actualCheckbox) actualCheckbox.checked = false;
        } else { // Item is not selected, so select it
            selectedEntriesForMultiAction.push(dateStr);
            listItemElement.classList.add('selected');
            if (actualCheckbox) actualCheckbox.checked = true;
        }
        updateMultiSelectCount();
    }

    function updateMultiSelectCount() {
        if (multiSelectCountSpan) multiSelectCountSpan.textContent = `${selectedEntriesForMultiAction.length} selected`;
        const hasSelection = selectedEntriesForMultiAction.length > 0;
        // Enable/disable action buttons based on selection
        if (deleteSelectedButton) deleteSelectedButton.disabled = !hasSelection;
        if (exportSelectedButton) exportSelectedButton.disabled = !hasSelection;
    }

    function updateTopBarForMultiSelectView(isActive) {
        if (!topBar) return;
        if (isActive) {
            topBar.classList.add('multi-select-mode');
            updateMultiSelectCount(); // Initialize count and button states
        } else {
            topBar.classList.remove('multi-select-mode');
        }
    }

    function handleDeleteSelectedEntries() {
        if (selectedEntriesForMultiAction.length === 0) {
            showToast('No entries selected for deletion.', 'info');
            return;
        }
        const confirmed = confirm(`Are you sure you want to delete ${selectedEntriesForMultiAction.length} selected entries? This action cannot be undone.`);
        if (confirmed) {
            let deleteCount = 0;
            selectedEntriesForMultiAction.forEach(dateStr => {
                if (handleDeleteEntry(dateStr, true)) deleteCount++; // true for isPartOfMulti
            });
            showToast(`${deleteCount} of ${selectedEntriesForMultiAction.length} entries deleted.`, 'success');
            disableMultiSelectMode(); // Exits multi-select mode and refreshes list
        }
    }

    function handleExportSelectedEntries() {
        if (selectedEntriesForMultiAction.length === 0) {
            showToast('No entries selected for export.', 'info');
            return;
        }
        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const entriesToExport = [];
        selectedEntriesForMultiAction.forEach(dateStr => {
            const entryFormData = allSavedData[dateStr]; // localStorage format
            if (entryFormData) {
                entriesToExport.push(getFullEntryDataForExport(entryFormData, dateStr));
            }
        });

        if (entriesToExport.length > 0) {
            const jsonString = JSON.stringify(entriesToExport, null, 2);
            const timestamp = new Date().toISOString().slice(0,10).replace(/-/g,'');
            downloadJSON(jsonString, `diary_export_multiple_${timestamp}.json`);
            showToast(`${entriesToExport.length} entries exported.`, 'success');
            disableMultiSelectMode(); // Exit multi-select and refresh list
        } else {
            showToast('No valid data found for selected entries.', 'error');
            disableMultiSelectMode(); // Still exit mode
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
    if (currentDateDisplay) currentDateDisplay.addEventListener('click', () => {
        if (dateInput) dateInput.showPicker ? dateInput.showPicker() : dateInput.click();
    });


    if (energyLevelSlider) energyLevelSlider.addEventListener('input', () => updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay));
    if (stressLevelSlider) stressLevelSlider.addEventListener('input', () => updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay));
    if (humidityPercentSlider) humidityPercentSlider.addEventListener('input', () => updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay));
    if (uvIndexSlider) uvIndexSlider.addEventListener('input', () => updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay));

    if (dailyActivitySummaryTextarea) dailyActivitySummaryTextarea.addEventListener('input', updateSummaryCounts);

    if (topBarClearButton) topBarClearButton.addEventListener('click', clearDiaryForm);

    diaryForm.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!downloadButton) return;
        const originalDownloadIconHTML = downloadButton.querySelector('i')?.outerHTML;
        setButtonLoadingState(downloadButton, true, originalDownloadIconHTML);
        
        // Use current form values to build the export object
        // This reuses getFullEntryDataForExport by creating a temporary "localStorage-like" object from the form
        const currentFormValuesForExport = {};
        diaryForm.querySelectorAll('input[id]:not([type="file"]), textarea[id], select[id]').forEach(element => {
            if (element.id) {
                currentFormValuesForExport[element.id] = (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value;
            }
        });
        const selectedDateStr = currentFormValuesForExport.date || getValue('date'); // Ensure date is present

        setTimeout(() => { // Brief timeout to allow UI to update (spinner)
            try {
                 if (!selectedDateStr) {
                     showToast('Please select a date for the entry.', 'error');
                     setButtonLoadingState(downloadButton, false, originalDownloadIconHTML);
                     return;
                }
                // Pass the currentFormValuesForExport which matches localStorage structure
                const data = getFullEntryDataForExport(currentFormValuesForExport, selectedDateStr);

                const jsonString = JSON.stringify(data, null, 2);
                downloadJSON(jsonString, `${selectedDateStr}.json`);
                showToast('JSON file downloaded.', 'success');
            } catch (error) {
                console.error("Error during JSON generation/download:", error);
                showToast('Error generating/downloading JSON.', 'error');
            } finally {
                setButtonLoadingState(downloadButton, false, originalDownloadIconHTML);
            }
        }, 50); // 50ms should be enough for UI update
    });

    if (importJsonButton) importJsonButton.addEventListener('click', () => jsonFileInput.click());
    
    // MODIFIED: jsonFileInput event listener to handle multiple files
    jsonFileInput.addEventListener('change', async function(event) {
        const files = event.target.files;
        if (!files || files.length === 0 || !importJsonButton) {
            jsonFileInput.value = ''; // Clear selection if no files
            return;
        }

        const originalImportIconHTML = importJsonButton.querySelector('i')?.outerHTML;
        setButtonLoadingState(importJsonButton, true, originalImportIconHTML);

        const allEntriesFromFiles = [];
        const fileReadPromises = [];

        for (const file of files) {
            fileReadPromises.push(
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            const fileContent = JSON.parse(e.target.result);
                            let entriesInThisFile = [];
                            if (Array.isArray(fileContent)) { // File contains an array of entries
                                entriesInThisFile = fileContent.filter(item => item && typeof item === 'object' && item.date);
                            } else if (typeof fileContent === 'object' && fileContent !== null && fileContent.date) { // File contains a single entry
                                entriesInThisFile = [fileContent];
                            }
                            resolve(entriesInThisFile);
                        } catch (err) {
                            console.error('Error parsing JSON from file:', file.name, err);
                            showToast(`Error parsing ${file.name}. Invalid JSON.`, 'error');
                            resolve([]); // Resolve with empty for this file to not break Promise.all
                        }
                    };
                    reader.onerror = function() {
                        console.error('Error reading file:', file.name);
                        showToast(`Error reading ${file.name}.`, 'error');
                        resolve([]); // Resolve with empty on read error
                    };
                    reader.readAsText(file);
                })
            );
        }

        try {
            const results = await Promise.all(fileReadPromises);
            results.forEach(entries => allEntriesFromFiles.push(...entries)); // Flatten the array of arrays

            if (allEntriesFromFiles.length > 0) {
                let allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
                let importedCount = 0;
                let successfullyProcessedEntries = []; // To store actual entry objects that were good

                allEntriesFromFiles.forEach(entry => { // entry is in export format
                    if (entry && entry.date) { // Basic validation
                        diaryForm.reset();      // Reset to HTML defaults
                        initializeForm(true); // Apply app defaults for the current date (which will be overwritten by entry.date)
                        
                        // Populate form with this entry's data. This sets all fields including dateInput.
                        populateFormWithJson(entry); 

                        // Now extract the complete form data (which is now in localStorage format)
                        const currentFormObject = {};
                        diaryForm.querySelectorAll('input[id]:not([type="file"]), textarea[id], select[id]').forEach(element => {
                            if (element.id) {
                                currentFormObject[element.id] = (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value;
                            }
                        });
                        // The date from populateFormWithJson (entry.date) is now in currentFormObject.date
                        
                        allSavedData[entry.date] = currentFormObject; // Save to master object
                        importedCount++;
                        successfullyProcessedEntries.push(entry); // Store the original imported entry
                    }
                });

                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));

                if (importedCount > 0) {
                    showToast(`${importedCount} entries imported successfully!`, 'success');
                    const lastEntryToDisplay = successfullyProcessedEntries.pop(); // Get the last valid one
                    if (lastEntryToDisplay) {
                        diaryForm.reset();
                        initializeForm(true); // Reset again for clean slate
                        populateFormWithJson(lastEntryToDisplay); // Populate form with the last imported entry
                        slideToPanel(0); // Show first tab
                    }
                } else {
                    showToast('No valid diary entries found in the selected file(s).', 'info');
                    // Optionally, reset form to current date if no entries were valid
                    // initializeForm(); 
                }
            } else {
                showToast('No processable entries found in selected files.', 'info');
            }
        } catch (error) {
            console.error("Error processing imported files:", error);
            showToast('An error occurred during import.', 'error');
        } finally {
            jsonFileInput.value = ''; // Clear file input selection
            setButtonLoadingState(importJsonButton, false, originalImportIconHTML);
            renderHistoryList(); // Always refresh history
            checkAndUpdateAllTabIcons(); // And tab icons
        }
    });


    if (saveFormButton) saveFormButton.addEventListener('click', () => {
        const originalSaveIconHTML = saveFormButton.querySelector('i')?.outerHTML;
        setButtonLoadingState(saveFormButton, true, originalSaveIconHTML);
        setTimeout(() => { // Brief delay to allow UI update
            performSaveOperation(false); // isSilent = false for user-initiated save
            setButtonLoadingState(saveFormButton, false, originalSaveIconHTML);
        }, 10);
    });

    bottomNavButtons.forEach((button, index) => button.addEventListener('click', () => slideToPanel(index)));


    if (typeof tabPanels !== 'undefined') {
        tabPanels.forEach(panel => {
            // Add listeners to inputs within each panel to check for empty values
            if (panel.id && panel.id !== 'tab-history' && panel.querySelector('input, textarea, select')) {
                panel.addEventListener('input', (event) => {
                    // Check for common text-like inputs
                    if (event.target.matches('input[type="text"], input[type="number"], textarea, input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input[type="url"]')) {
                        const hasEmpty = checkTabForEmptyValues(panel);
                        updateTabIconWithIndicator(panel.id, hasEmpty);
                    }
                });
                panel.addEventListener('change', (event) => { // For selects, range, date, etc.
                     if (event.target.matches('select')) { // Specifically for select elements on change
                        const hasEmpty = checkTabForEmptyValues(panel);
                        updateTabIconWithIndicator(panel.id, hasEmpty);
                    }
                    // Could add more specific checks here if needed for other input types on 'change'
                });
            }
        });
    }

    window.addEventListener('pagehide', autoSaveOnPageHide); // For backgrounding/closing tab

    // Multi-select action buttons
    if (cancelMultiSelectButton) cancelMultiSelectButton.addEventListener('click', disableMultiSelectMode);
    if (deleteSelectedButton) deleteSelectedButton.addEventListener('click', handleDeleteSelectedEntries);
    if (exportSelectedButton) exportSelectedButton.addEventListener('click', handleExportSelectedEntries);

    // --- Initial Application Setup ---
    updateTopBarForMultiSelectView(false); // Ensure multi-select UI is off initially
    initializeForm(); // Initialize form (sets date, loads data if any, loads suggestions)
    slideToPanel(0, false); // Go to the first tab without animation

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
                .catch(error => console.log('ServiceWorker registration failed: ', error));
        });
    }
});