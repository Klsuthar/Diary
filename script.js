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
    let touchStartX = 0, touchEndX = 0;
    const swipeThreshold = 50; // Min distance for a swipe
    let isKeyboardOpen = false;
    let viewportHeightBeforeKeyboard = window.innerHeight;
    const MIN_KEYBOARD_HEIGHT_PX = 150; // Heuristic for keyboard height

    let isMultiSelectModeActive = false;
    let selectedEntriesForMultiAction = [];
    let longPressTimer;
    const LONG_PRESS_DURATION = 600; // milliseconds for long press
    let itemTouchStartX, itemTouchStartY;


    const suggestionConfigs = [
        { key: 'myPersonalDiaryPersonalCareSuggestions', fieldIds: ['faceProductName', 'faceProductBrand', 'hairProductName', 'hairProductBrand', 'hairOil', 'skincareRoutine'] },
        { key: 'myPersonalDiaryDietSuggestions', fieldIds: ['breakfast', 'lunch', 'dinner', 'additionalItems'] }
    ];

    // --- Utility Functions ---

    /**
     * Checks if an element is potentially focusable and could open a virtual keyboard.
     * @param {HTMLElement} element - The element to check.
     * @returns {boolean} True if the element might trigger a keyboard.
     */
    function isPotentiallyFocusableForKeyboard(element) {
        if (!element) return false;
        const tagName = element.tagName;
        const type = element.type;
        if (tagName === 'TEXTAREA') return true;
        if (tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'date', 'color'].includes(type)) {
            return true;
        }
        if (tagName === 'SELECT') return true; // Select can also bring up a picker/keyboard
        return false;
    }

    /**
     * Updates the status of whether the virtual keyboard is likely open.
     * This is a heuristic based on viewport height changes.
     */
    function updateKeyboardStatus() {
        const currentWindowHeight = window.innerHeight;
        const activeElement = document.activeElement;
        const isTextInputActive = isPotentiallyFocusableForKeyboard(activeElement);

        if (isTextInputActive) {
            // If viewport height significantly decreased, assume keyboard opened
            if (viewportHeightBeforeKeyboard - currentWindowHeight > MIN_KEYBOARD_HEIGHT_PX) {
                isKeyboardOpen = true;
            }
            // If viewport height increased back significantly, assume keyboard closed
            // Added a buffer to prevent flapping if resize is minor
            else if (currentWindowHeight > (viewportHeightBeforeKeyboard - MIN_KEYBOARD_HEIGHT_PX + (MIN_KEYBOARD_HEIGHT_PX / 3))) {
                 isKeyboardOpen = false;
                 viewportHeightBeforeKeyboard = currentWindowHeight; // Reset baseline
            }
        } else {
            isKeyboardOpen = false;
            viewportHeightBeforeKeyboard = currentWindowHeight; // Reset baseline if not a text input
        }
    }

    /**
     * Sets the loading state for a button, disabling it and showing a spinner.
     * @param {HTMLButtonElement} button - The button element.
     * @param {boolean} isLoading - True to set loading state, false to revert.
     * @param {string|null} originalIconHTML - Optional HTML string of the original icon.
     */
    function setButtonLoadingState(button, isLoading, originalIconHTML = null) {
        if (!button) return;
        const iconElement = button.querySelector('i');
        if (isLoading) {
            button.disabled = true;
            if (iconElement) {
                if (!button.dataset.originalIcon) button.dataset.originalIcon = iconElement.outerHTML; // Store original icon
                iconElement.className = 'fas fa-spinner fa-spin'; // Spinner icon
            }
        } else {
            button.disabled = false;
            if (iconElement && button.dataset.originalIcon) {
                // Restore original icon from dataset
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = button.dataset.originalIcon;
                iconElement.className = tempDiv.firstChild.className;
                delete button.dataset.originalIcon;
            } else if (iconElement && originalIconHTML) {
                // Restore from passed HTML (fallback)
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = originalIconHTML;
                iconElement.className = tempDiv.firstChild.className;
            }
        }
    }

    /**
     * Displays a toast notification.
     * @param {string} message - The message to display.
     * @param {'info'|'success'|'error'} type - The type of toast.
     */
    function showToast(message, type = 'info') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.classList.add('toast', type);
        let iconClass = 'fas fa-info-circle'; // Default icon
        if (type === 'success') iconClass = 'fas fa-check-circle';
        else if (type === 'error') iconClass = 'fas fa-times-circle';
        toast.innerHTML = `<i class="${iconClass}"></i> <p>${message}</p>`;

        if (toastContainer.firstChild) {
            toastContainer.insertBefore(toast, toastContainer.firstChild);
        } else {
            toastContainer.appendChild(toast);
        }
        setTimeout(() => { toast.remove(); }, 3000); // Auto-remove after 3 seconds
    }

    /**
     * Formats a Date object into YYYY-MM-DD string.
     * @param {Date} date - The date to format.
     * @returns {string} The formatted date string.
     */
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Updates the current date display in the top bar.
     * @param {string} dateStr - The date string (YYYY-MM-DD).
     */
    function updateCurrentDateDisplay(dateStr) {
        if (currentDateDisplay) {
            if (dateStr) {
                try {
                    // Ensure correct parsing by specifying time for local interpretation
                    const dateObj = new Date(dateStr + 'T00:00:00');
                    if (isNaN(dateObj.getTime())) { // Check for invalid date
                        currentDateDisplay.innerHTML = `Invalid Date <i class="fas fa-calendar-alt date-display-icon"></i>`;
                    } else {
                        currentDateDisplay.innerHTML = `${dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} <i class="fas fa-calendar-alt date-display-icon"></i>`;
                    }
                } catch (e) {
                    currentDateDisplay.innerHTML = `Select Date <i class="fas fa-calendar-alt date-display-icon"></i>`; // Fallback
                }
            } else {
                currentDateDisplay.innerHTML = `Select Date <i class="fas fa-calendar-alt date-display-icon"></i>`;
            }
        }
    }

    /**
     * Changes the current date by a number of days and updates the UI.
     * @param {number} days - The number of days to add (can be negative).
     */
    function changeDate(days) {
        let currentDateValue;
        if (dateInput.value) {
            // Parse date string correctly, assuming local timezone
            const [year, month, day] = dateInput.value.split('-').map(Number);
            currentDateValue = new Date(year, month - 1, day);
        } else {
            currentDateValue = new Date(); // Default to today if no date is set
        }

        if (!isNaN(currentDateValue.getTime())) { // Check if it's a valid date
            currentDateValue.setDate(currentDateValue.getDate() + days);
            dateInput.value = formatDate(currentDateValue);
            updateCurrentDateDisplay(dateInput.value);
            loadFormFromLocalStorage(); // Load data for the new date
        } else {
            // If current date was invalid, reset to today
            const today = new Date();
            dateInput.value = formatDate(today);
            updateCurrentDateDisplay(dateInput.value);
            loadFormFromLocalStorage();
        }
    }

    /**
     * Updates the display value for a range slider.
     * @param {HTMLInputElement} slider - The slider element.
     * @param {HTMLElement} displayElement - The element to display the value.
     */
    function updateSliderDisplay(slider, displayElement) {
        if (slider && displayElement) displayElement.textContent = slider.value;
    }

    /**
     * Updates word and character counts for the daily summary textarea.
     */
    function updateSummaryCounts() {
        if (dailyActivitySummaryTextarea && summaryCountsDisplay) {
            const text = dailyActivitySummaryTextarea.value;
            const charCount = text.length;
            const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
            summaryCountsDisplay.textContent = `Words: ${wordCount}, Chars: ${charCount}`;
        }
    }

    /**
     * Gets the value from a form element by its ID.
     * @param {string} elementId - The ID of the element.
     * @param {'text'|'number'|'range'} type - The expected type of value.
     * @returns {string|number|null} The element's value, or null/empty string.
     */
    function getValue(elementId, type = 'text') {
        const element = document.getElementById(elementId);
        if (!element) return type === 'number' || type === 'range' ? null : '';

        const value = element.value.trim();
        if (type === 'range') return element.value === '' ? null : parseFloat(element.value); // Range values are numbers
        if (type === 'number') return value === '' ? null : parseFloat(value);
        return value;
    }

    /**
     * Sets the value of a form element by its ID.
     * @param {string} elementId - The ID of the element.
     * @param {string|number|null} value - The value to set.
     */
    function setValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = (value === null || value === undefined) ? '' : value;
            // Update slider displays if the element is a range input
            if (element.type === 'range') {
                if (element.id === 'energyLevel') updateSliderDisplay(element, energyLevelValueDisplay);
                if (element.id === 'stressLevel') updateSliderDisplay(element, stressLevelValueDisplay);
                if (element.id === 'humidityPercent') updateSliderDisplay(element, humidityPercentValueDisplay);
                if (element.id === 'uvIndex') updateSliderDisplay(element, uvIndexValueDisplay);
            }
        }
    }
    /**
     * Calculates the number of days since a reference start date.
     * @param {Date} startDate - The reference start date.
     * @param {string} endDateStr - The end date string (YYYY-MM-DD).
     * @returns {number|null} The number of days, or null if invalid.
     */
    function calculateDaysSince(startDate, endDateStr) {
        if (!endDateStr) return null;
        const [year, month, day] = endDateStr.split('-').map(Number);
        const endDate = new Date(Date.UTC(year, month - 1, day)); // Use UTC for consistent calculation
        if (isNaN(endDate.getTime())) return null; // Invalid end date

        const start = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
        const diffTime = endDate.getTime() - start.getTime();
        if (diffTime < 0) return null; // End date is before start date

        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1; // Inclusive of the start day
    }

    /**
     * Triggers a file download with the given JSON content.
     * @param {string} content - The JSON string content.
     * @param {string} fileName - The desired file name.
     */
    function downloadJSON(content, fileName) {
        const a = document.createElement('a');
        const file = new Blob([content], { type: 'application/json' });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href); // Clean up
    }

    // --- Suggestion Logic ---

    /**
     * Loads all suggestions from localStorage into their respective datalists.
     */
    function loadAllSuggestions() {
        suggestionConfigs.forEach(config => {
            const suggestionsData = JSON.parse(localStorage.getItem(config.key)) || {};
            config.fieldIds.forEach(fieldId => {
                const datalistElement = document.getElementById(`${fieldId}Suggestions`);
                if (datalistElement && suggestionsData[fieldId] && Array.isArray(suggestionsData[fieldId])) {
                    datalistElement.innerHTML = ''; // Clear existing options
                    suggestionsData[fieldId].forEach(suggestionText => {
                        const option = document.createElement('option');
                        option.value = suggestionText;
                        datalistElement.appendChild(option);
                    });
                }
            });
        });
    }

    /**
     * Saves current input values to suggestion lists in localStorage.
     * Keeps suggestions unique and limited to MAX_SUGGESTIONS_PER_FIELD.
     */
    function saveAllSuggestions() {
        suggestionConfigs.forEach(config => {
            let suggestionsData = JSON.parse(localStorage.getItem(config.key)) || {};
            config.fieldIds.forEach(fieldId => {
                const inputElement = document.getElementById(fieldId);
                if (inputElement && inputElement.value.trim() !== '') {
                    const newValue = inputElement.value.trim();
                    suggestionsData[fieldId] = suggestionsData[fieldId] || [];
                    // Remove existing (case-insensitive) to move to top, then add new
                    suggestionsData[fieldId] = suggestionsData[fieldId].filter(s => s.toLowerCase() !== newValue.toLowerCase());
                    suggestionsData[fieldId].unshift(newValue);
                    // Limit number of suggestions
                    if (suggestionsData[fieldId].length > MAX_SUGGESTIONS_PER_FIELD) {
                        suggestionsData[fieldId] = suggestionsData[fieldId].slice(0, MAX_SUGGESTIONS_PER_FIELD);
                    }
                }
            });
            localStorage.setItem(config.key, JSON.stringify(suggestionsData));
        });
    }

    // --- Form Management ---

    /**
     * Clears the diary form and associated localStorage data for the current date.
     */
    function clearDiaryForm() {
        if (confirm("Are you sure you want to clear the form? This will remove unsaved changes and locally saved data for the current date (suggestions will remain).")) {
            diaryForm.reset(); // Reset form fields
            const currentFormDate = dateInput.value;
            if (currentFormDate) {
                const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
                if (allSavedData[currentFormDate]) {
                    delete allSavedData[currentFormDate]; // Delete data for this date
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
                    // If history tab is active, re-render it
                    if (tabPanels[currentTabIndex]?.id === 'tab-history') {
                        renderHistoryList();
                    }
                }
            }
            initializeForm(true); // Re-initialize form with defaults
            showToast("Form cleared for current date.", "info");
            slideToPanel(0); // Go back to the first tab
        }
    }

    /**
     * Initializes the form: sets date, default values, loads suggestions and saved data.
     * @param {boolean} isClearing - If true, sets specific default values.
     */
    function initializeForm(isClearing = false) {
        // Set date to today if not set or if clearing
        if (!dateInput.value || isClearing) {
            const today = new Date();
            dateInput.value = formatDate(today);
        }
        updateCurrentDateDisplay(dateInput.value);

        // Set default values if clearing the form
        if (isClearing) {
            ['weightKg', 'heightCm', 'chest', 'belly', 'meditationStatus',
             'meditationDurationMin', 'sleepHours', 'medicationsTaken', 'skincareRoutine'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    // Pre-fill some common fields or set to 'Na'
                    if (id === 'weightKg') el.value = "72";
                    else if (id === 'heightCm') el.value = "178";
                    else if (id === 'chest') el.value = "90";
                    else if (id === 'belly') el.value = "89";
                    else if (id === 'meditationStatus') el.value = "Na";
                    else if (id === 'meditationDurationMin') el.value = "0";
                    else if (id === 'sleepHours') el.value = "8";
                    else if (id === 'medicationsTaken') el.value = "Na";
                    else if (id === 'skincareRoutine') el.value = "Na";
                    else el.value = '';
                }
            });
            setValue('otherNoteStatus', 'No'); // Default for 'otherNoteStatus'
            // Reset sliders to default values
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

        loadAllSuggestions(); // Load autocomplete suggestions

        if (!isClearing) {
            loadFormFromLocalStorage(); // Load saved data for the current date
        }
        updateSummaryCounts(); // Update word/char counts
        updateKeyboardStatus(); // Check keyboard status
    }

    /**
     * Populates the form with data from a JSON object (e.g., from an imported file).
     * @param {object} jsonData - The JSON data to populate the form with.
     */
    function populateFormWithJson(jsonData) {
        diaryForm.reset(); // Reset form first
        initializeForm(true); // Initialize with defaults before populating

        setValue('date', jsonData.date); // Set date from JSON
        updateCurrentDateDisplay(jsonData.date);

        // Map JSON keys to form field IDs and set values
        // Uses helper objects for concise mapping
        if (jsonData.environment) Object.keys(jsonData.environment).forEach(k => setValue({temperature_c:'temperatureC', air_quality_index:'airQualityIndex', humidity_percent:'humidityPercent', uv_index:'uvIndex', weather_condition:'weatherCondition'}[k], jsonData.environment[k]));
        if (jsonData.body_measurements) Object.keys(jsonData.body_measurements).forEach(k => setValue({weight_kg:'weightKg', height_cm:'heightCm', chest:'chest', belly:'belly'}[k], jsonData.body_measurements[k]));
        if (jsonData.health_and_fitness) Object.keys(jsonData.health_and_fitness).forEach(k => setValue({sleep_hours:'sleepHours', steps_count:'stepsCount', steps_distance_km:'stepsDistanceKm', kilocalorie:'kilocalorie', water_intake_liters:'waterIntakeLiters', medications_taken:'medicationsTaken', physical_symptoms:'physicalSymptoms', energy_level:'energyLevel', stress_level:'stressLevel'}[k], jsonData.health_and_fitness[k]));
        if (jsonData.mental_and_emotional_health) { setValue('mentalState', jsonData.mental_and_emotional_health.mental_state); setValue('meditationStatus', jsonData.mental_and_emotional_health.meditation_status); setValue('meditationDurationMin', jsonData.mental_and_emotional_health.meditation_duration_min); }
        if (jsonData.personal_care) { setValue('faceProductName', jsonData.personal_care.face_product_name); setValue('faceProductBrand', jsonData.personal_care.face_product_brand); setValue('hairProductName', jsonData.personal_care.hair_product_name); setValue('hairProductBrand', jsonData.personal_care.hair_product_brand); setValue('hairOil', jsonData.personal_care.hair_oil); setValue('skincareRoutine', jsonData.personal_care.skincare_routine); }
        if (jsonData.diet_and_nutrition) { setValue('breakfast', jsonData.diet_and_nutrition.breakfast); setValue('lunch', jsonData.diet_and_nutrition.lunch); setValue('dinner', jsonData.diet_and_nutrition.dinner); setValue('additionalItems', jsonData.diet_and_nutrition.additional_items); }
        if (jsonData.activities_and_productivity) { setValue('tasksTodayEnglish', jsonData.activities_and_productivity.tasks_today_english); setValue('travelDestination', jsonData.activities_and_productivity.travel_destination); setValue('phoneScreenOnHr', jsonData.activities_and_productivity.phone_screen_on_hr); }
        
        if (jsonData.additional_notes) {
            setValue('keyEvents', jsonData.additional_notes.key_events);
            setValue('otherNoteStatus', jsonData.additional_notes.other_note_status || 'No'); // Default to 'No' if not present
        } else {
            setValue('otherNoteStatus', 'No');
        }
        setValue('dailyActivitySummary', jsonData.daily_activity_summary);

        // Update UI elements after populating
        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
        if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
        updateSummaryCounts();
    }

    /**
     * Saves the current form data to localStorage for the selected date.
     * @param {boolean} isSilent - If true, suppresses toast notifications.
     * @returns {boolean} True if save was successful, false otherwise.
     */
    function performSaveOperation(isSilent = false) {
        try {
            saveAllSuggestions(); // Save any new suggestions first
            const currentFormDate = dateInput.value;
            if (!currentFormDate) {
                if (!isSilent) showToast('Please select a date first to save.', 'error');
                return false;
            }

            // Collect form data into an object
            const formDataToSave = {};
            diaryForm.querySelectorAll('input[id]:not([type="file"]), textarea[id], select[id]').forEach(element => {
                if (element.id) { // Ensure element has an ID
                   formDataToSave[element.id] = (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value;
                }
            });
            formDataToSave.date = currentFormDate; // Explicitly save the date


            let allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            allSavedData[currentFormDate] = formDataToSave; // Store data under the current date key

            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
            if (!isSilent) showToast('Form data saved locally for this date!', 'success');

            // If history tab is active, re-render to reflect changes (e.g., new entry)
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

    /**
     * Loads form data from localStorage for the currently selected date.
     */
    function loadFormFromLocalStorage() {
        const currentFormDate = dateInput.value;
        if (!currentFormDate) { // If no date selected, reset and initialize
            diaryForm.reset(); 
            initializeForm(true); 
            return;
        }
        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const formDataForDate = allSavedData[currentFormDate]; // Get data for the specific date
        
        diaryForm.reset(); // Reset form fields
        initializeForm(true); // Initialize with defaults (important to reset sliders etc.)

        setValue('date', currentFormDate); // Set the date input correctly
        updateCurrentDateDisplay(currentFormDate);

        if (formDataForDate) {
            try {
                // Populate form fields from saved data
                Object.keys(formDataForDate).forEach(elementId => {
                    const element = document.getElementById(elementId);
                    if (element) { // Check if element exists
                        if (elementId !== 'date') { // Date is already set
                           setValue(elementId, formDataForDate[elementId]);
                        }
                    }
                });
                // Ensure 'otherNoteStatus' has a value, defaulting to 'No'
                setValue('otherNoteStatus', formDataForDate.otherNoteStatus || 'No');


                // Show toast only if page is visible and not in multi-select mode (to avoid spam on auto-load)
                if (!document.hidden && !isMultiSelectModeActive) {
                    showToast('Previously saved data for this date loaded.', 'info');
                }
            } catch (e) {
                console.error("Error loading from localStorage for date:", e);
                showToast('Could not load saved data. It might be corrupted.', 'error');
            }
        } else {
             // If no data for this date, ensure 'otherNoteStatus' is default
            setValue('otherNoteStatus', 'No');
        }

        // Update UI elements after loading
        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
        if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
        updateSummaryCounts();
    }

    /**
     * Automatically saves form data when the page is hidden (e.g., tab switched).
     */
    function autoSaveOnPageHide() {
        // Don't auto-save if in multi-select mode or if on history tab (no form data to save from there)
        if (isMultiSelectModeActive || (tabPanels[currentTabIndex]?.id === 'tab-history')) return;
        const success = performSaveOperation(true); // Silent save
        if (success) {
            console.log('Auto-save successful on page hide.');
        }
    }

    // --- Tab Navigation ---

    /**
     * Slides to the specified tab panel.
     * @param {number} index - The index of the tab panel to slide to.
     * @param {boolean} animate - Whether to animate the transition.
     */
    function slideToPanel(index, animate = true) {
        if (!tabPanelsSlider || index < 0 || index >= tabPanels.length) return;

        // If leaving history tab while in multi-select mode, disable it
        if (isMultiSelectModeActive && tabPanels[currentTabIndex]?.id === 'tab-history' && tabPanels[index]?.id !== 'tab-history') {
            disableMultiSelectMode();
        }

        currentTabIndex = index;
        const offset = -index * 100; // Calculate translateX percentage
        tabPanelsSlider.style.transition = animate ? 'transform 0.35s ease-in-out' : 'none';
        tabPanelsSlider.style.transform = `translateX(${offset}%)`;

        // Update active state of bottom navigation buttons
        bottomNavButtons.forEach((btn, i) => btn.classList.toggle('active', i === index));

        // If navigating to history tab, render its content
        if (tabPanels[index] && tabPanels[index].id === 'tab-history') {
            renderHistoryList();
        }
    }

    // --- History Tab & Multi-Select Functionality ---

    /**
     * Renders the list of diary entries in the history tab.
     */
    function renderHistoryList() {
        if (!historyListContainer) return;
        const noHistoryMsgElement = historyListContainer.querySelector('.no-history-message');

        // Clear existing items before re-rendering
        const existingItems = historyListContainer.querySelectorAll('.history-item');
        existingItems.forEach(item => item.remove());

        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        // Get dates and sort them in descending order (most recent first)
        const dates = Object.keys(allSavedData).sort((a, b) => new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00'));

        if (dates.length === 0) {
            if (noHistoryMsgElement) noHistoryMsgElement.style.display = 'block'; // Show "no entries" message
        } else {
            if (noHistoryMsgElement) noHistoryMsgElement.style.display = 'none'; // Hide message
            dates.forEach(dateStr => {
                const entryData = allSavedData[dateStr];
                if (!entryData) return; // Skip if data is somehow missing

                // Create list item elements
                const listItem = document.createElement('div');
                listItem.classList.add('history-item');
                listItem.dataset.date = dateStr; // Store date for easy access

                const mainContent = document.createElement('div');
                mainContent.classList.add('history-item-main-content');

                // Apply multi-select styling if active
                if (isMultiSelectModeActive) {
                    listItem.classList.add('multi-select-active');
                    mainContent.classList.add('multi-select-active'); // For styling child elements if needed
                }
                if (isMultiSelectModeActive && selectedEntriesForMultiAction.includes(dateStr)) {
                    listItem.classList.add('selected'); // Mark as selected
                }

                // Expand/Collapse JSON button
                const expandJsonBtn = document.createElement('button');
                expandJsonBtn.type = 'button'; // ******** FIX: Set button type ********
                expandJsonBtn.classList.add('history-item-expand-json');
                expandJsonBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                expandJsonBtn.title = 'Show/Hide JSON Data';
                expandJsonBtn.setAttribute('aria-expanded', 'false');
                mainContent.appendChild(expandJsonBtn);

                // Checkbox for multi-select
                const checkboxContainer = document.createElement('div');
                checkboxContainer.classList.add('history-item-checkbox-container');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('history-item-checkbox');
                checkbox.dataset.date = dateStr;
                checkbox.checked = isMultiSelectModeActive && selectedEntriesForMultiAction.includes(dateStr);
                checkboxContainer.appendChild(checkbox);
                mainContent.appendChild(checkboxContainer);

                // Entry details (date, preview)
                const details = document.createElement('div');
                details.classList.add('history-item-details');
                const itemDate = document.createElement('div');
                itemDate.classList.add('history-item-date');
                try { // Format date nicely
                    itemDate.textContent = new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
                } catch (e) { itemDate.textContent = dateStr; } // Fallback to raw date string
                const preview = document.createElement('div');
                preview.classList.add('history-item-preview');
                const summary = entryData.dailyActivitySummary || entryData.keyEvents || 'No summary/events';
                preview.textContent = summary.substring(0, 50) + (summary.length > 50 ? '...' : ''); // Show preview
                details.appendChild(itemDate);
                details.appendChild(preview);
                mainContent.appendChild(details);

                // Action buttons (export, delete) for individual items
                const actions = document.createElement('div');
                actions.classList.add('history-item-actions');
                
                const exportBtn = document.createElement('button');
                exportBtn.type = 'button'; // ******** FIX: Set button type ********
                exportBtn.innerHTML = '<i class="fas fa-file-export"></i>'; exportBtn.title = 'Export Entry'; exportBtn.classList.add('action-export');
                actions.appendChild(exportBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button'; // ******** FIX: Set button type ********
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; deleteBtn.title = 'Delete Entry'; deleteBtn.classList.add('action-delete');
                actions.appendChild(deleteBtn);
                
                mainContent.appendChild(actions);
                listItem.appendChild(mainContent);

                // <pre> tag for displaying JSON (initially hidden)
                const jsonView = document.createElement('pre');
                jsonView.classList.add('history-item-json-view');
                listItem.appendChild(jsonView);

                // --- Event Listener for Expand/Collapse JSON Button ---
                expandJsonBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent click from bubbling to parent elements
                    const isExpanded = expandJsonBtn.getAttribute('aria-expanded') === 'true';
                    if (isExpanded) {
                        // Collapse: Hide JSON view and clear its content
                        jsonView.style.display = 'none';
                        jsonView.textContent = ''; 
                        expandJsonBtn.setAttribute('aria-expanded', 'false');
                        expandJsonBtn.classList.remove('expanded'); // Update icon/style
                    } else {
                        // Expand: Prepare and display JSON data
                        const fullEntryData = getFullEntryDataForExport(entryData, dateStr);
                        jsonView.textContent = JSON.stringify(fullEntryData, null, 2);
                        jsonView.style.display = 'block';
                        expandJsonBtn.setAttribute('aria-expanded', 'true');
                        expandJsonBtn.classList.add('expanded'); // Update icon/style
                    }
                });

                // Event listener for multi-select checkbox
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent interference with item click
                    toggleMultiSelectEntry(dateStr, listItem, checkbox);
                });

                // Event listener for individual export button
                exportBtn.addEventListener('click', (e) => { 
                    e.stopPropagation(); 
                    handleExportEntry(dateStr); 
                });

                // Event listener for individual delete button
                deleteBtn.addEventListener('click', (e) => { 
                    e.stopPropagation(); 
                    handleDeleteEntry(dateStr); 
                });

                // General click listener for the main content area of the history item
                mainContent.addEventListener('click', (event) => {
                    handleHistoryItemClick(event, dateStr, listItem);
                });
                
                // Touch event listeners for long-press to enable multi-select
                listItem.addEventListener('touchstart', (e) => handleHistoryItemTouchStart(e, dateStr, listItem), { passive: false });
                listItem.addEventListener('touchmove', handleHistoryItemTouchMove);
                listItem.addEventListener('touchend', () => handleHistoryItemTouchEnd(dateStr, listItem)); 
                
                // Context menu (right-click) listener for desktop to enable multi-select
                listItem.addEventListener('contextmenu', (e) => { 
                    e.preventDefault(); // Prevent default context menu
                    // Ignore if context menu is on interactive elements within the item
                    if (e.target.closest('.history-item-expand-json') || 
                        e.target.closest('.history-item-actions button') || 
                        e.target.closest('.history-item-checkbox-container')) {
                        return;
                    }
                    
                    if (!isMultiSelectModeActive) enableMultiSelectMode();
                    const currentCheckbox = listItem.querySelector('.history-item-checkbox');
                    toggleMultiSelectEntry(dateStr, listItem, currentCheckbox); // Select the item
                });

                // Add the new list item to the container
                if (noHistoryMsgElement) { // Insert before "no history" message if it exists
                    historyListContainer.insertBefore(listItem, noHistoryMsgElement);
                } else {
                    historyListContainer.appendChild(listItem);
                }
            });
        }
    }

    /**
     * Handles touch start on a history item for long-press detection.
     */
    function handleHistoryItemTouchStart(event, dateStr, listItem) {
        // If touch starts on an interactive element, don't initiate long press
        if (event.target.closest('.history-item-expand-json') || event.target.closest('.history-item-actions button') || event.target.closest('.history-item-checkbox-container')) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            return;
        }
        itemTouchStartX = event.touches[0].clientX;
        itemTouchStartY = event.touches[0].clientY;
        clearTimeout(longPressTimer); // Clear any existing timer
        longPressTimer = setTimeout(() => { // Start new timer for long press
            longPressTimer = null; // Timer has fired
            if (!isMultiSelectModeActive) {
                enableMultiSelectMode();
                // Re-query listItem and checkbox as DOM might have re-rendered
                const freshListItem = historyListContainer.querySelector(`.history-item[data-date="${dateStr}"]`);
                if (freshListItem) {
                    const checkbox = freshListItem.querySelector('.history-item-checkbox');
                    toggleMultiSelectEntry(dateStr, freshListItem, checkbox);
                }
            } else {
                // If multi-select is already active, just toggle the item
                const checkbox = listItem.querySelector('.history-item-checkbox');
                toggleMultiSelectEntry(dateStr, listItem, checkbox);
            }
            if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
        }, LONG_PRESS_DURATION);
    }

    /**
     * Handles touch move on a history item to cancel long-press if significant movement.
     */
    function handleHistoryItemTouchMove(event) {
        if (longPressTimer) { // Only if long press timer is active
            const deltaX = Math.abs(event.touches[0].clientX - itemTouchStartX);
            const deltaY = Math.abs(event.touches[0].clientY - itemTouchStartY);
            if (deltaX > 10 || deltaY > 10) { // If finger moved too much
                clearTimeout(longPressTimer); // Cancel long press
                longPressTimer = null;
            }
        }
    }

    /**
     * Handles touch end on a history item. If long press didn't fire, treat as a click.
     */
    function handleHistoryItemTouchEnd(dateStr, listItem) {
        if (longPressTimer) { // If timer was set but didn't fire (i.e., not a long press)
            clearTimeout(longPressTimer);
            longPressTimer = null;
            handleHistoryItemClick(null, dateStr, listItem); // Treat as a regular click
        }
    }

    /**
     * Handles a click on a history item.
     * If multi-select is active, toggles selection. Otherwise, loads entry for editing.
     */
    function handleHistoryItemClick(event, dateStr, listItem) {
        // If the click originated from specific interactive elements within the item, do nothing here.
        // Their own event listeners (with stopPropagation) should handle their actions.
        if (event && event.target) {
            if (event.target.closest('.history-item-expand-json') ||
                event.target.closest('.history-item-checkbox-container input[type="checkbox"]') || 
                event.target.closest('.history-item-actions button')) {
                return; // Let specific handlers do their job
            }
        }

        if (isMultiSelectModeActive) {
            const checkbox = listItem.querySelector('.history-item-checkbox');
            toggleMultiSelectEntry(dateStr, listItem, checkbox);
        } else {
            // If not in multi-select mode, a click on the item loads it for editing
            handleEditEntry(dateStr);
        }
    }


    /**
     * Loads a history entry into the main form for editing.
     * @param {string} dateStr - The date of the entry to edit.
     */
    function handleEditEntry(dateStr) {
        if (isMultiSelectModeActive) disableMultiSelectMode(); // Exit multi-select if active

        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const entryFormData = allSavedData[dateStr];
        if (entryFormData) {
            diaryForm.reset(); 
            initializeForm(true); // Reset and initialize form

            setValue('date', dateStr); // Set the date
            updateCurrentDateDisplay(dateStr);

            // Populate form fields
            Object.keys(entryFormData).forEach(elementId => {
                if (elementId !== 'date') { // Date is already handled
                    setValue(elementId, entryFormData[elementId]);
                }
            });
            setValue('otherNoteStatus', entryFormData.otherNoteStatus || 'No'); // Ensure default

            // Update UI elements
            if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
            if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
            if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
            if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
            updateSummaryCounts();

            showToast(`Editing entry for ${new Date(dateStr + 'T00:00:00').toLocaleDateString()}.`, 'info');
            slideToPanel(0); // Switch to the first tab (basic info)
        } else {
            showToast('Could not find entry data to edit.', 'error');
        }
    }

    /**
     * Prepares the full entry data in the format required for export.
     * @param {object} entryFormData - The raw form data from localStorage.
     * @param {string} dateKey - The date of the entry.
     * @returns {object} The formatted data for export.
     */
    function getFullEntryDataForExport(entryFormData, dateKey) {
        const exportData = {};
        exportData.date = entryFormData.date || dateKey; // Use entry's date or the key
        exportData.day_id = calculateDaysSince(REFERENCE_START_DATE, exportData.date);

        // Helper functions for parsing numbers, returning null if invalid
        const pFloat = val => (val !== null && val !== undefined && val !== "" && !isNaN(parseFloat(val))) ? parseFloat(val) : null;
        const pInt = val => (val !== null && val !== undefined && val !== "" && !isNaN(parseInt(val))) ? parseInt(val) : null;

        // Map form fields to structured export object
        exportData.environment = { temperature_c: entryFormData.temperatureC || '', air_quality_index: pInt(entryFormData.airQualityIndex), humidity_percent: pInt(entryFormData.humidityPercent), uv_index: pInt(entryFormData.uvIndex), weather_condition: entryFormData.weatherCondition || '' };
        exportData.body_measurements = { weight_kg: pFloat(entryFormData.weightKg), height_cm: pInt(entryFormData.heightCm), chest: pInt(entryFormData.chest), belly: pInt(entryFormData.belly) };
        exportData.health_and_fitness = { sleep_hours: pFloat(entryFormData.sleepHours), steps_count: pInt(entryFormData.stepsCount), steps_distance_km: pFloat(entryFormData.stepsDistanceKm), kilocalorie: pInt(entryFormData.kilocalorie), water_intake_liters: pFloat(entryFormData.waterIntakeLiters), medications_taken: entryFormData.medicationsTaken || '', physical_symptoms: entryFormData.physicalSymptoms || '', energy_level: pInt(entryFormData.energyLevel), stress_level: pInt(entryFormData.stressLevel) };
        exportData.mental_and_emotional_health = { mental_state: entryFormData.mentalState || '', meditation_status: entryFormData.meditationStatus || '', meditation_duration_min: pInt(entryFormData.meditationDurationMin) };
        exportData.personal_care = { face_product_name: entryFormData.faceProductName || '', face_product_brand: entryFormData.faceProductBrand || '', hair_product_name: entryFormData.hairProductName || '', hair_product_brand: entryFormData.hairProductBrand || '', hair_oil: entryFormData.hairOil || '', skincare_routine: entryFormData.skincareRoutine || '' };
        exportData.diet_and_nutrition = { breakfast: entryFormData.breakfast || '', lunch: entryFormData.lunch || '', dinner: entryFormData.dinner || '', additional_items: entryFormData.additionalItems || '' };
        exportData.activities_and_productivity = { tasks_today_english: entryFormData.tasksTodayEnglish || '', travel_destination: entryFormData.travelDestination || '', phone_screen_on_hr: pFloat(entryFormData.phoneScreenOnHr) };
        exportData.additional_notes = { 
            key_events: entryFormData.keyEvents || '',
            other_note_status: entryFormData.otherNoteStatus || 'No' 
        };
        exportData.daily_activity_summary = entryFormData.dailyActivitySummary || '';
        return exportData;
    }

    /**
     * Handles exporting a single diary entry as a JSON file.
     * @param {string} dateStr - The date of the entry to export.
     */
    function handleExportEntry(dateStr) {
        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const entryFormData = allSavedData[dateStr];
        if (entryFormData) {
            const exportData = getFullEntryDataForExport(entryFormData, dateStr);
            const jsonString = JSON.stringify(exportData, null, 2); // Pretty print JSON
            downloadJSON(jsonString, `${dateStr}.json`); // Trigger download
            showToast('Entry exported.', 'success');
        } else {
            showToast('Could not find entry data to export.', 'error');
        }
    }

    /**
     * Handles deleting a single diary entry.
     * @param {string} dateStr - The date of the entry to delete.
     * @param {boolean} isPartOfMulti - True if called as part of a multi-delete operation (suppresses confirmation).
     * @returns {boolean} True if deletion was successful.
     */
    function handleDeleteEntry(dateStr, isPartOfMulti = false) {
        const confirmed = isPartOfMulti ? true : confirm(`Are you sure you want to delete the entry for ${new Date(dateStr+'T00:00:00').toLocaleDateString()}? This action cannot be undone.`);
        if (confirmed) {
            const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            if (allSavedData[dateStr]) {
                delete allSavedData[dateStr]; // Remove from data object
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData)); // Update localStorage
                if (!isPartOfMulti) { // If not part of multi-delete, show toast and re-render
                    showToast('Entry deleted.', 'success');
                    renderHistoryList();
                }
                return true;
            } else {
                if (!isPartOfMulti) showToast('Entry not found for deletion.', 'error');
                return false;
            }
        }
        return false;
    }

    /**
     * Enables multi-select mode for history items.
     */
    function enableMultiSelectMode() {
        if (isMultiSelectModeActive) return;
        isMultiSelectModeActive = true;
        selectedEntriesForMultiAction = []; // Clear previous selections
        updateTopBarForMultiSelectView(true); // Change top bar UI
        renderHistoryList(); // Re-render history list to show checkboxes
        showToast('Multi-select enabled. Tap items to select.', 'info');
    }

    /**
     * Disables multi-select mode.
     */
    function disableMultiSelectMode() {
        if (!isMultiSelectModeActive) return;
        isMultiSelectModeActive = false;
        selectedEntriesForMultiAction = [];
        updateTopBarForMultiSelectView(false); // Revert top bar UI
        renderHistoryList(); // Re-render history list to hide checkboxes
    }

    /**
     * Toggles the selection state of a history item in multi-select mode.
     * @param {string} dateStr - The date of the entry.
     * @param {HTMLElement} listItemElement - The list item's DOM element.
     * @param {HTMLInputElement|null} checkboxElement - The checkbox element (optional).
     */
    function toggleMultiSelectEntry(dateStr, listItemElement, checkboxElement = null) {
        const index = selectedEntriesForMultiAction.indexOf(dateStr);
        const actualCheckbox = checkboxElement || listItemElement.querySelector('.history-item-checkbox');

        if (index > -1) { // If already selected, deselect
            selectedEntriesForMultiAction.splice(index, 1);
            listItemElement.classList.remove('selected');
            if (actualCheckbox) actualCheckbox.checked = false;
        } else { // If not selected, select
            selectedEntriesForMultiAction.push(dateStr);
            listItemElement.classList.add('selected');
            if (actualCheckbox) actualCheckbox.checked = true;
        }
        updateMultiSelectCount(); // Update count display and button states
    }

    /**
     * Updates the display of how many items are selected in multi-select mode.
     */
    function updateMultiSelectCount() {
        if (multiSelectCountSpan) multiSelectCountSpan.textContent = `${selectedEntriesForMultiAction.length} selected`;
        const hasSelection = selectedEntriesForMultiAction.length > 0;
        // Enable/disable action buttons based on selection
        if (deleteSelectedButton) deleteSelectedButton.disabled = !hasSelection;
        if (exportSelectedButton) exportSelectedButton.disabled = !hasSelection;
    }

    /**
     * Updates the top bar UI to reflect multi-select mode (shows/hides buttons).
     * @param {boolean} isActive - True if multi-select mode is active.
     */
    function updateTopBarForMultiSelectView(isActive) {
        if (!topBar) return;
        if (isActive) {
            topBar.classList.add('multi-select-mode');
            updateMultiSelectCount(); // Initial count update
        } else {
            topBar.classList.remove('multi-select-mode');
        }
        // CSS handles showing/hiding of specific buttons via the .multi-select-mode class on .top-bar
    }

    /**
     * Handles deleting all currently selected entries in multi-select mode.
     */
    function handleDeleteSelectedEntries() {
        if (selectedEntriesForMultiAction.length === 0) {
            showToast('No entries selected for deletion.', 'info');
            return;
        }
        const confirmed = confirm(`Are you sure you want to delete ${selectedEntriesForMultiAction.length} selected entries? This action cannot be undone.`);
        if (confirmed) {
            let deleteCount = 0;
            selectedEntriesForMultiAction.forEach(dateStr => {
                if (handleDeleteEntry(dateStr, true)) deleteCount++; // Delete silently
            });
            showToast(`${deleteCount} of ${selectedEntriesForMultiAction.length} entries deleted.`, 'success');
            disableMultiSelectMode(); // Exit multi-select mode after action
        }
    }

    /**
     * Handles exporting all currently selected entries as a single JSON file.
     */
    function handleExportSelectedEntries() {
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
            const jsonString = JSON.stringify(entriesToExport, null, 2); // Array of entries
            const timestamp = new Date().toISOString().slice(0,10).replace(/-/g,''); // YYYYMMDD timestamp
            downloadJSON(jsonString, `diary_export_multiple_${timestamp}.json`);
            showToast(`${entriesToExport.length} entries exported.`, 'success');
            disableMultiSelectMode(); // Exit multi-select mode
        } else {
            showToast('No valid data found for selected entries.', 'error');
        }
    }

    // --- Event Listeners & Initialization ---

    // Listen for window resize to update keyboard status (e.g., orientation change)
    window.addEventListener('resize', updateKeyboardStatus);

    // Track focus on input fields to help determine keyboard state
    diaryForm.addEventListener('focusin', (event) => {
        if (isPotentiallyFocusableForKeyboard(event.target)) viewportHeightBeforeKeyboard = window.innerHeight;
    });
    diaryForm.addEventListener('focusout', (event) => {
        // Delay keyboard status update slightly on focusout as keyboard might still be closing
        if (isPotentiallyFocusableForKeyboard(event.target)) setTimeout(() => { isKeyboardOpen = false; viewportHeightBeforeKeyboard = window.innerHeight; updateKeyboardStatus(); }, 100);
    });

    // Date input change listener
    if (dateInput) dateInput.addEventListener('change', () => { updateCurrentDateDisplay(dateInput.value); loadFormFromLocalStorage(); });
    // Date increment/decrement button listeners
    if (dateIncrementButton) dateIncrementButton.addEventListener('click', () => changeDate(1));
    if (dateDecrementButton) dateDecrementButton.addEventListener('click', () => changeDate(-1));

    // Slider input listeners
    if (energyLevelSlider) energyLevelSlider.addEventListener('input', () => updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay));
    if (stressLevelSlider) stressLevelSlider.addEventListener('input', () => updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay));
    if (humidityPercentSlider) humidityPercentSlider.addEventListener('input', () => updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay));
    if (uvIndexSlider) uvIndexSlider.addEventListener('input', () => updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay));

    // Daily summary textarea input listener for word/char count
    if (dailyActivitySummaryTextarea) dailyActivitySummaryTextarea.addEventListener('input', updateSummaryCounts);

    // Top bar clear button listener
    if (topBarClearButton) topBarClearButton.addEventListener('click', clearDiaryForm);

    // Diary form submit listener (for downloading current entry JSON)
    diaryForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent actual form submission
        if (!downloadButton) return;
        const originalDownloadIconHTML = downloadButton.querySelector('i')?.outerHTML;
        setButtonLoadingState(downloadButton, true, originalDownloadIconHTML); // Set loading state
        
        // Local parsers to ensure null for empty/invalid numbers in export
        const pFloatLocal = valStr => {
            if (valStr === null || valStr === undefined || valStr.trim() === "") return null;
            const num = parseFloat(valStr);
            return isNaN(num) ? null : num;
        };
        const pIntLocal = valStr => {
            if (valStr === null || valStr === undefined || valStr.trim() === "") return null;
            const num = parseInt(valStr, 10);
            return isNaN(num) ? null : num;
        };

        // Use setTimeout to allow UI to update (show spinner) before processing
        setTimeout(() => {
            try {
                const data = {}; // Object to hold data for JSON export
                const selectedDateStr = getValue('date');
                 if (!selectedDateStr) { // Date is mandatory for an entry
                     showToast('Please select a date for the entry.', 'error');
                     setButtonLoadingState(downloadButton, false, originalDownloadIconHTML);
                     return;
                }
                data.date = selectedDateStr;
                data.day_id = calculateDaysSince(REFERENCE_START_DATE, selectedDateStr);

                // Populate data object from form fields using getValue and local parsers
                data.environment = { temperature_c: getValue('temperatureC'), air_quality_index: pIntLocal(getValue('airQualityIndex')), humidity_percent: getValue('humidityPercent', 'range'), uv_index: getValue('uvIndex', 'range'), weather_condition: getValue('weatherCondition') };
                data.body_measurements = { weight_kg: pFloatLocal(getValue('weightKg')), height_cm: pIntLocal(getValue('heightCm')), chest: pIntLocal(getValue('chest')), belly: pIntLocal(getValue('belly')) };
                data.health_and_fitness = { sleep_hours: pFloatLocal(getValue('sleepHours')), steps_count: pIntLocal(getValue('stepsCount')), steps_distance_km: pFloatLocal(getValue('stepsDistanceKm')), kilocalorie: pIntLocal(getValue('kilocalorie')), water_intake_liters: pFloatLocal(getValue('waterIntakeLiters')), medications_taken: getValue('medicationsTaken'), physical_symptoms: getValue('physicalSymptoms'), energy_level: getValue('energyLevel', 'range'), stress_level: getValue('stressLevel', 'range') };
                data.mental_and_emotional_health = { mental_state: getValue('mentalState'), meditation_status: getValue('meditationStatus'), meditation_duration_min: pIntLocal(getValue('meditationDurationMin')) };
                data.personal_care = { face_product_name: getValue('faceProductName'), face_product_brand: getValue('faceProductBrand'), hair_product_name: getValue('hairProductName'), hair_product_brand: getValue('hairProductBrand'), hair_oil: getValue('hairOil'), skincare_routine: getValue('skincareRoutine') };
                data.diet_and_nutrition = { breakfast: getValue('breakfast'), lunch: getValue('lunch'), dinner: getValue('dinner'), additional_items: getValue('additionalItems') };
                data.activities_and_productivity = { tasks_today_english: getValue('tasksTodayEnglish'), travel_destination: getValue('travelDestination'), phone_screen_on_hr: pFloatLocal(getValue('phoneScreenOnHr')) };
                data.additional_notes = { 
                    key_events: getValue('keyEvents'),
                    other_note_status: getValue('otherNoteStatus') // Already defaults to 'No' if empty
                };
                data.daily_activity_summary = getValue('dailyActivitySummary');

                const jsonString = JSON.stringify(data, null, 2); // Pretty print
                downloadJSON(jsonString, `${selectedDateStr}.json`); // Trigger download
                showToast('JSON file downloaded.', 'success');
            } catch (error) {
                console.error("Error during JSON generation/download:", error);
                showToast('Error generating/downloading JSON.', 'error');
            } finally {
                setButtonLoadingState(downloadButton, false, originalDownloadIconHTML); // Revert loading state
            }
        }, 50); // Small delay for UI update
    });

    // Import JSON button listener
    if (importJsonButton) importJsonButton.addEventListener('click', () => jsonFileInput.click()); // Trigger file input
    // File input change listener (for JSON import)
    jsonFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file && importJsonButton) {
            const originalImportIconHTML = importJsonButton.querySelector('i')?.outerHTML;
            setButtonLoadingState(importJsonButton, true, originalImportIconHTML);
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    populateFormWithJson(importedData); // Populate form with imported data
                    if (importedData.date) { // If imported data has a date, save it silently
                        performSaveOperation(true);
                    }
                    showToast('Diary entry imported successfully!', 'success');
                    // Attempt to navigate to the first tab that has data
                    let firstPopulatedIndex = 0;
                    for (let i = 0; i < tabPanels.length - 1; i++) { // Exclude history tab
                        const panelInputs = tabPanels[i].querySelectorAll('input:not([type="range"]):not([type="date"]):not([type="checkbox"]):not([type="radio"]), textarea, select');
                        let hasData = false;
                        for (const input of panelInputs) { 
                            // Check if input has a meaningful value
                            if (input.value && input.value.trim() !== '' && input.value.trim() !== 'Na' && input.value.trim() !== '0') {
                                if (input.id === 'otherNoteStatus' && input.value.trim().toLowerCase() === 'no') continue; // Ignore default 'No'
                                hasData = true; 
                                break; 
                            } 
                        }
                        if (hasData) { firstPopulatedIndex = i; break; }
                    }
                    slideToPanel(firstPopulatedIndex);
                } catch (error) {
                    console.error("Error parsing JSON file:", error);
                    showToast('Failed to import diary entry. Invalid JSON file.', 'error');
                } finally {
                    jsonFileInput.value = ''; // Reset file input
                    setButtonLoadingState(importJsonButton, false, originalImportIconHTML);
                }
            };
            reader.readAsText(file); // Read file as text
        }
    });

    // Save form button listener
    if (saveFormButton) saveFormButton.addEventListener('click', () => {
        const originalSaveIconHTML = saveFormButton.querySelector('i')?.outerHTML;
        setButtonLoadingState(saveFormButton, true, originalSaveIconHTML);
        setTimeout(() => { // Allow UI to update
            performSaveOperation(false); // Perform save with toast
            setButtonLoadingState(saveFormButton, false, originalSaveIconHTML);
        }, 10);
    });

    // Bottom navigation button listeners
    bottomNavButtons.forEach((button, index) => button.addEventListener('click', () => slideToPanel(index)));

    // Swipe navigation for tab panels
    if (tabViewPort) {
        let swipeInProgress = false;
        tabViewPort.addEventListener('touchstart', (e) => {
            // Disable swipe if keyboard is open, or if touching a slider, or if in multi-select on history tab
            if (isKeyboardOpen || e.target.closest('.slider-container') || e.target.closest('input[type="range"]') || (isMultiSelectModeActive && tabPanels[currentTabIndex]?.id === 'tab-history')) {
                swipeInProgress = false; return;
            }
            swipeInProgress = true;
            touchStartX = e.touches[0].clientX;
            touchEndX = touchStartX; // Initialize touchEndX
            tabPanelsSlider.style.transition = 'none'; // Disable transition during swipe
        }, { passive: true }); // Passive for better scroll performance if swipe isn't handled

        tabViewPort.addEventListener('touchmove', (e) => {
            if (!swipeInProgress || isKeyboardOpen) return;
            touchEndX = e.touches[0].clientX;
            // Optionally, could add visual feedback of panel moving with finger here
        }, { passive: true });

        tabViewPort.addEventListener('touchend', () => {
            if (!swipeInProgress || isKeyboardOpen) { swipeInProgress = false; return; }
            const deltaX = touchEndX - touchStartX;
            let newIndex = currentTabIndex;
            if (Math.abs(deltaX) > swipeThreshold) { // If swipe distance is enough
                newIndex = (deltaX < 0) ? Math.min(currentTabIndex + 1, tabPanels.length - 1) : Math.max(currentTabIndex - 1, 0);
            }
            slideToPanel(newIndex, true); // Animate to new panel
            swipeInProgress = false; touchStartX = 0; touchEndX = 0; // Reset swipe state
        });
    }

    // Auto-save on page hide
    window.addEventListener('pagehide', autoSaveOnPageHide);

    // Multi-select action button listeners
    if (cancelMultiSelectButton) cancelMultiSelectButton.addEventListener('click', disableMultiSelectMode);
    if (deleteSelectedButton) deleteSelectedButton.addEventListener('click', handleDeleteSelectedEntries);
    if (exportSelectedButton) exportSelectedButton.addEventListener('click', handleExportSelectedEntries);

    // --- Initial Application Setup ---
    updateTopBarForMultiSelectView(false); // Ensure multi-select UI is initially off
    initializeForm(); // Initialize the form (sets date, loads data, etc.)
    slideToPanel(0, false); // Go to the first tab without animation on load

    // Service Worker registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js') // Assuming sw.js is in the root or correct scope
                .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
                .catch(error => console.log('ServiceWorker registration failed: ', error));
        });
    }
});
