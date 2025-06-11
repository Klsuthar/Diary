document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const diaryForm = document.getElementById('diaryForm');
    const jsonFileInput = document.getElementById('jsonFile');
    const saveFormButton = document.getElementById('saveFormButton');
    const toastContainer = document.getElementById('toast-container');
    const downloadButton = document.getElementById('downloadButton');

    const dateInput = document.getElementById('date');
    const dateIncrementButton = document.getElementById('dateIncrement');
    const dateDecrementButton = document.getElementById('dateDecrement');
    const currentDateDisplay = document.getElementById('currentDateDisplay');

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

    // Menu Elements
    const menuButton = document.getElementById('menuButton');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const shareEntryButton = document.getElementById('shareEntryButton');
    const menuImportButton = document.getElementById('menuImportButton');
    const menuClearFormButton = document.getElementById('menuClearFormButton');


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
    let isDropdownMenuOpen = false;


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
                if (!button.dataset.originalIcon && originalIconHTML) { // Store if not already stored and provided
                     button.dataset.originalIcon = originalIconHTML;
                } else if (!button.dataset.originalIcon && iconElement.outerHTML) { // Fallback to current icon if none provided
                    button.dataset.originalIcon = iconElement.outerHTML;
                }
                iconElement.className = 'fas fa-spinner fa-spin';
            }
        } else {
            button.disabled = false;
            if (iconElement && button.dataset.originalIcon) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = button.dataset.originalIcon;
                iconElement.className = tempDiv.firstChild.className;
                delete button.dataset.originalIcon; // Clean up
            } else if (iconElement && originalIconHTML) { // Fallback if dataset somehow missed
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
            if (input.id === 'date') continue;
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
            diaryForm.reset();
            const currentFormDate = dateInput.value;
            if (currentFormDate) {
                const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
                if (allSavedData[currentFormDate]) {
                    delete allSavedData[currentFormDate];
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
                    if (tabPanels[currentTabIndex]?.id === 'tab-history') {
                        renderHistoryList();
                    }
                }
            }
            initializeForm(true);
            showToast("Form cleared for current date.", "info");
            slideToPanel(0);
        }
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
                    else if (id === 'sleepHours') el.value = "8:00";
                    else if (id === 'medicationsTaken') el.value = "Na";
                    else if (id === 'skincareRoutine') el.value = "Na";
                    else el.value = '';
                }
            });
            setValue('otherNoteStatus', 'No');
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
        } else {
             setValue('otherNoteStatus', getValue('otherNoteStatus') || 'No');
        }
        updateSummaryCounts();
        updateKeyboardStatus();
        checkAndUpdateAllTabIcons();
    }

    function populateFormWithJson(jsonData) {
        setValue('date', jsonData.date);
        updateCurrentDateDisplay(jsonData.date);

        if (jsonData.environment) { const envMap = {temperature_c:'temperatureC', air_quality_index:'airQualityIndex', humidity_percent:'humidityPercent', uv_index:'uvIndex', weather_condition:'weatherCondition'}; Object.keys(envMap).forEach(key => setValue(envMap[key], jsonData.environment[key]));}
        if (jsonData.body_measurements) { const bodyMap = {weight_kg:'weightKg', height_cm:'heightCm', chest:'chest', belly:'belly'}; Object.keys(bodyMap).forEach(key => setValue(bodyMap[key], jsonData.body_measurements[key]));}
        if (jsonData.health_and_fitness) { const healthMap = {sleep_hours:'sleepHours', steps_count:'stepsCount', steps_distance_km:'stepsDistanceKm', kilocalorie:'kilocalorie', water_intake_liters:'waterIntakeLiters', medications_taken:'medicationsTaken', physical_symptoms:'physicalSymptoms', energy_level:'energyLevel', stress_level:'stressLevel'}; Object.keys(healthMap).forEach(key => setValue(healthMap[key], jsonData.health_and_fitness[key]));}
        if (jsonData.mental_and_emotional_health) { setValue('mentalState', jsonData.mental_and_emotional_health.mental_state); setValue('meditationStatus', jsonData.mental_and_emotional_health.meditation_status); setValue('meditationDurationMin', jsonData.mental_and_emotional_health.meditation_duration_min); }
        if (jsonData.personal_care) { setValue('faceProductName', jsonData.personal_care.face_product_name); setValue('faceProductBrand', jsonData.personal_care.face_product_brand); setValue('hairProductName', jsonData.personal_care.hair_product_name); setValue('hairProductBrand', jsonData.personal_care.hair_product_brand); setValue('hairOil', jsonData.personal_care.hair_oil); setValue('skincareRoutine', jsonData.personal_care.skincare_routine); }
        if (jsonData.diet_and_nutrition) { setValue('breakfast', jsonData.diet_and_nutrition.breakfast); setValue('lunch', jsonData.diet_and_nutrition.lunch); setValue('dinner', jsonData.diet_and_nutrition.dinner); setValue('additionalItems', jsonData.diet_and_nutrition.additional_items); }
        if (jsonData.activities_and_productivity) { setValue('tasksTodayEnglish', jsonData.activities_and_productivity.tasks_today_english); setValue('travelDestination', jsonData.activities_and_productivity.travel_destination); setValue('phoneScreenOnHr', jsonData.activities_and_productivity.phone_screen_on_hr); }
        if (jsonData.additional_notes) { setValue('keyEvents', jsonData.additional_notes.key_events); setValue('otherNoteStatus', jsonData.additional_notes.other_note_status || 'No'); } else { setValue('otherNoteStatus', 'No'); }
        setValue('dailyActivitySummary', jsonData.daily_activity_summary);

        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
        if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
        updateSummaryCounts();
        checkAndUpdateAllTabIcons();
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
            if (!isSilent) {
                if (document.visibilityState === 'visible') {
                    showToast('Form data saved locally for this date!', 'success');
                } else {
                    console.log('Form data auto-saved silently.');
                }
            }


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
            initializeForm(true);
            return;
        }
        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const formDataForDate = allSavedData[currentFormDate];

        diaryForm.reset();
        initializeForm(true);

        setValue('date', currentFormDate);
        updateCurrentDateDisplay(currentFormDate);

        if (formDataForDate) {
            try {
                Object.keys(formDataForDate).forEach(elementId => {
                    const element = document.getElementById(elementId);
                    if (element) {
                        if (elementId !== 'date') {
                           setValue(elementId, formDataForDate[elementId]);
                        }
                    }
                });
                setValue('otherNoteStatus', formDataForDate.otherNoteStatus || 'No');

                if (!document.hidden && !isMultiSelectModeActive) {
                    showToast('Previously saved data for this date loaded.', 'info');
                }
            } catch (e) {
                console.error("Error loading from localStorage for date:", currentFormDate, e);
                showToast('Could not load saved data. It might be corrupted.', 'error');
            }
        } else {
            setValue('otherNoteStatus', 'No');
        }

        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
        if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
        updateSummaryCounts();
        checkAndUpdateAllTabIcons();
    }

    function autoSaveOnVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            if (isMultiSelectModeActive || (tabPanels[currentTabIndex]?.id === 'tab-history')) return;
            const success = performSaveOperation(true);
            if (success) {
                console.log('Auto-save successful on visibility change to hidden.');
            }
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

    // --- History Tab & Multi-Select Functionality ---
    function renderHistoryList() {
        if (!historyListContainer || !historyTabPanel) return;

        let currentScrollTop = historyTabPanel.scrollTop;

        const expandedItemDates = new Set();
        historyListContainer.querySelectorAll('.history-item.expanded-json').forEach(item => {
            if (item.dataset.date) expandedItemDates.add(item.dataset.date);
        });

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

                const mainContent = document.createElement('div');
                mainContent.classList.add('history-item-main-content');

                if (isMultiSelectModeActive) {
                    listItem.classList.add('multi-select-active');
                    if (selectedEntriesForMultiAction.includes(dateStr)) {
                        listItem.classList.add('selected');
                    }
                }

                const expandJsonBtn = document.createElement('button');
                expandJsonBtn.type = 'button';
                expandJsonBtn.classList.add('history-item-expand-json');
                expandJsonBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                expandJsonBtn.title = 'Show/Hide JSON Data';
                expandJsonBtn.setAttribute('aria-expanded', 'false');
                mainContent.appendChild(expandJsonBtn);

                const checkboxContainer = document.createElement('div');
                checkboxContainer.classList.add('history-item-checkbox-container');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('history-item-checkbox');
                checkbox.dataset.date = dateStr;
                checkbox.checked = isMultiSelectModeActive && selectedEntriesForMultiAction.includes(dateStr);
                checkboxContainer.appendChild(checkbox);
                mainContent.appendChild(checkboxContainer);

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
                mainContent.appendChild(details);

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

                const jsonView = document.createElement('pre');
                jsonView.classList.add('history-item-json-view');
                listItem.appendChild(jsonView);

                if (expandedItemDates.has(dateStr)) {
                    const fullEntryData = getFullEntryDataForExport(entryData, dateStr);
                    jsonView.textContent = JSON.stringify(fullEntryData, null, 2);
                    jsonView.style.display = 'block';
                    expandJsonBtn.setAttribute('aria-expanded', 'true');
                    expandJsonBtn.classList.add('expanded');
                    listItem.classList.add('expanded-json');
                }

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
                    e.stopPropagation();
                    toggleMultiSelectEntry(dateStr, listItem, checkbox);
                });

                exportBtn.addEventListener('click', (e) => { e.stopPropagation(); handleExportEntry(dateStr); });
                deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); handleDeleteEntry(dateStr); });

                mainContent.addEventListener('click', (event) => {
                    handleHistoryItemClick(event, dateStr, listItem);
                });

                listItem.addEventListener('touchstart', (e) => handleHistoryItemTouchStart(e, dateStr, listItem), { passive: false });
                listItem.addEventListener('touchmove', handleHistoryItemTouchMove);
                listItem.addEventListener('touchend', () => handleHistoryItemTouchEnd(dateStr, listItem));

                listItem.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (e.target.closest('.history-item-expand-json') ||
                        e.target.closest('.history-item-actions button') ||
                        e.target.closest('.history-item-checkbox-container')) {
                        return;
                    }

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
        historyTabPanel.scrollTop = currentScrollTop;
    }


    function handleHistoryItemTouchStart(event, dateStr, listItem) {
        if (event.target.closest('.history-item-expand-json') || event.target.closest('.history-item-actions button') || event.target.closest('.history-item-checkbox-container')) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
            return;
        }
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
        if (event && event.target) {
            if (event.target.closest('.history-item-expand-json') ||
                event.target.closest('.history-item-checkbox-container input[type="checkbox"]') ||
                event.target.closest('.history-item-actions button')) {
                return;
            }
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
            diaryForm.reset();
            initializeForm(true);

            setValue('date', dateStr);
            updateCurrentDateDisplay(dateStr);

            Object.keys(entryFormData).forEach(elementId => {
                if (elementId !== 'date') {
                    setValue(elementId, entryFormData[elementId]);
                }
            });
            setValue('otherNoteStatus', entryFormData.otherNoteStatus || 'No');

            if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
            if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
            if (humidityPercentSlider) updateSliderDisplay(humidityPercentSlider, humidityPercentValueDisplay);
            if (uvIndexSlider) updateSliderDisplay(uvIndexSlider, uvIndexValueDisplay);
            updateSummaryCounts();
            checkAndUpdateAllTabIcons();

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

        const pFloat = val => (val !== null && val !== undefined && String(val).trim() !== "" && !isNaN(parseFloat(String(val)))) ? parseFloat(String(val)) : null;
        const pInt = val => (val !== null && val !== undefined && String(val).trim() !== "" && !isNaN(parseInt(String(val)))) ? parseInt(String(val)) : null;

        exportData.environment = { temperature_c: entryFormData.temperatureC || '', air_quality_index: pInt(entryFormData.airQualityIndex), humidity_percent: pInt(entryFormData.humidityPercent), uv_index: pInt(entryFormData.uvIndex), weather_condition: entryFormData.weatherCondition || '' };
        exportData.body_measurements = { weight_kg: pFloat(entryFormData.weightKg), height_cm: pInt(entryFormData.heightCm), chest: pInt(entryFormData.chest), belly: pInt(entryFormData.belly) };
        exportData.health_and_fitness = { sleep_hours: entryFormData.sleepHours || '', steps_count: pInt(entryFormData.stepsCount), steps_distance_km: pFloat(entryFormData.stepsDistanceKm), kilocalorie: pInt(entryFormData.kilocalorie), water_intake_liters: pFloat(entryFormData.waterIntakeLiters), medications_taken: entryFormData.medicationsTaken || '', physical_symptoms: entryFormData.physicalSymptoms || '', energy_level: pInt(entryFormData.energyLevel), stress_level: pInt(entryFormData.stressLevel) };
        exportData.mental_and_emotional_health = { mental_state: entryFormData.mentalState || '', meditation_status: entryFormData.meditationStatus || '', meditation_duration_min: pInt(entryFormData.meditationDurationMin) };
        exportData.personal_care = { face_product_name: entryFormData.faceProductName || '', face_product_brand: entryFormData.faceProductBrand || '', hair_product_name: entryFormData.hairProductName || '', hair_product_brand: entryFormData.hairProductBrand || '', hair_oil: entryFormData.hairOil || '', skincare_routine: entryFormData.skincareRoutine || '' };
        exportData.diet_and_nutrition = { breakfast: entryFormData.breakfast || '', lunch: entryFormData.lunch || '', dinner: entryFormData.dinner || '', additional_items: entryFormData.additionalItems || '' };
        exportData.activities_and_productivity = { tasks_today_english: entryFormData.tasksTodayEnglish || '', travel_destination: entryFormData.travelDestination || '', phone_screen_on_hr: entryFormData.phoneScreenOnHr || '' };
        exportData.additional_notes = { key_events: entryFormData.keyEvents || '', other_note_status: entryFormData.otherNoteStatus || 'No' };
        exportData.daily_activity_summary = entryFormData.dailyActivitySummary || '';
        return exportData;
    }

    function handleExportEntry(dateStr) {
        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const entryFormData = allSavedData[dateStr];
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

    function enableMultiSelectMode() {
        if (isMultiSelectModeActive) return;
        isMultiSelectModeActive = true;
        selectedEntriesForMultiAction = [];
        updateTopBarForMultiSelectView(true);
        renderHistoryList();
        showToast('Multi-select enabled. Tap items to select.', 'info');
        if (isDropdownMenuOpen) toggleDropdownMenu(false);
    }

    function disableMultiSelectMode() {
        if (!isMultiSelectModeActive) return;
        isMultiSelectModeActive = false;
        selectedEntriesForMultiAction = [];
        updateTopBarForMultiSelectView(false);
        renderHistoryList();
    }

    function toggleMultiSelectEntry(dateStr, listItemElement, checkboxElement = null) {
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

    function updateMultiSelectCount() {
        if (multiSelectCountSpan) multiSelectCountSpan.textContent = `${selectedEntriesForMultiAction.length} selected`;
        const hasSelection = selectedEntriesForMultiAction.length > 0;
        if (deleteSelectedButton) deleteSelectedButton.disabled = !hasSelection;
        if (exportSelectedButton) exportSelectedButton.disabled = !hasSelection;
    }

    function updateTopBarForMultiSelectView(isActive) {
        if (!topBar) return;
        if (isActive) {
            topBar.classList.add('multi-select-mode');
            updateMultiSelectCount();
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
                if (handleDeleteEntry(dateStr, true)) deleteCount++;
            });
            showToast(`${deleteCount} of ${selectedEntriesForMultiAction.length} entries deleted.`, 'success');
            disableMultiSelectMode();
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
            disableMultiSelectMode();
        }
    }

    // --- Dropdown Menu Logic ---
    function toggleDropdownMenu(forceState) {
        if (dropdownMenu) {
            isDropdownMenuOpen = typeof forceState === 'boolean' ? forceState : !isDropdownMenuOpen;
            dropdownMenu.style.display = isDropdownMenuOpen ? 'block' : 'none';
        }
    }

    async function handleShareCurrentEntry() {
        if (!navigator.share) {
            showToast('Web Share API is not available on this browser/device.', 'error');
            toggleDropdownMenu(false);
            return;
        }
        if (isMultiSelectModeActive) {
            showToast('Sharing is disabled in multi-select mode.', 'info');
            toggleDropdownMenu(false);
            return;
        }

        const currentFormValuesForExport = {};
        diaryForm.querySelectorAll('input[id]:not([type="file"]), textarea[id], select[id]').forEach(element => {
            if (element.id) {
                currentFormValuesForExport[element.id] = (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value;
            }
        });
        const selectedDateStr = currentFormValuesForExport.date || getValue('date');

        if (!selectedDateStr) {
            showToast('Please select a date or ensure the form has data to share.', 'error');
            toggleDropdownMenu(false);
            return;
        }

        const shareButtonOriginalIconHTML = shareEntryButton.querySelector('i')?.outerHTML;
        setButtonLoadingState(shareEntryButton, true, shareButtonOriginalIconHTML);

        try {
            const entryData = getFullEntryDataForExport(currentFormValuesForExport, selectedDateStr);
            const jsonString = JSON.stringify(entryData, null, 2);
            const fileName = `${selectedDateStr}_diary_entry.json`;
            const fileToShare = new File([jsonString], fileName, { type: 'application/json' });

            const shareData = {
                title: `Diary Entry: ${selectedDateStr}`,
                text: `Here is my diary entry for ${new Date(selectedDateStr+'T00:00:00').toLocaleDateString()}.`,
            };

            if (navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
                shareData.files = [fileToShare];
                await navigator.share(shareData);
                showToast('Entry shared successfully!', 'success');
            } else if (navigator.canShare && navigator.canShare({ text: shareData.text, title: shareData.title })) {
                await navigator.share({ title: shareData.title, text: shareData.text + "\n\n" + jsonString });
                showToast('Entry content shared as text (file sharing not supported/allowed).', 'info');
            } else {
                showToast('Sharing (files or text) is not supported or allowed by the browser in this context.', 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Sharing was aborted by the user.');
            } else {
                console.error('Error sharing entry:', error.name, error.message, error);
                showToast(`Error sharing entry: ${error.message}`, 'error');
            }
        } finally {
            setButtonLoadingState(shareEntryButton, false, shareButtonOriginalIconHTML);
            toggleDropdownMenu(false);
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

    diaryForm.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!downloadButton) return;
        const originalDownloadIconHTML = downloadButton.querySelector('i')?.outerHTML;
        setButtonLoadingState(downloadButton, true, originalDownloadIconHTML);

        const currentFormValuesForExport = {};
        diaryForm.querySelectorAll('input[id]:not([type="file"]), textarea[id], select[id]').forEach(element => {
            if (element.id) {
                currentFormValuesForExport[element.id] = (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value;
            }
        });
        const selectedDateStr = currentFormValuesForExport.date || getValue('date');

        setTimeout(() => {
            try {
                 if (!selectedDateStr) {
                     showToast('Please select a date for the entry.', 'error');
                     setButtonLoadingState(downloadButton, false, originalDownloadIconHTML);
                     return;
                }
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
        }, 50);
    });

    jsonFileInput.addEventListener('change', async function(event) {
        const files = event.target.files;
        if (!files || files.length === 0) {
            jsonFileInput.value = '';
            return;
        }
        const buttonForLoading = menuImportButton || document.getElementById('importJsonButton');
        const originalImportIconHTML = buttonForLoading ? buttonForLoading.querySelector('i')?.outerHTML : null;
        if (buttonForLoading) setButtonLoadingState(buttonForLoading, true, originalImportIconHTML);


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
                            if (Array.isArray(fileContent)) {
                                entriesInThisFile = fileContent.filter(item => item && typeof item === 'object' && item.date);
                            } else if (typeof fileContent === 'object' && fileContent !== null && fileContent.date) {
                                entriesInThisFile = [fileContent];
                            }
                            resolve(entriesInThisFile);
                        } catch (err) {
                            console.error('Error parsing JSON from file:', file.name, err);
                            showToast(`Error parsing ${file.name}. Invalid JSON.`, 'error');
                            resolve([]);
                        }
                    };
                    reader.onerror = function() {
                        console.error('Error reading file:', file.name);
                        showToast(`Error reading ${file.name}.`, 'error');
                        resolve([]);
                    };
                    reader.readAsText(file);
                })
            );
        }

        try {
            const results = await Promise.all(fileReadPromises);
            results.forEach(entries => allEntriesFromFiles.push(...entries));

            if (allEntriesFromFiles.length > 0) {
                let allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
                let importedCount = 0;
                let successfullyProcessedEntries = [];

                allEntriesFromFiles.forEach(entry => {
                    if (entry && entry.date) {
                        diaryForm.reset();
                        initializeForm(true);
                        populateFormWithJson(entry);

                        const currentFormObject = {};
                        diaryForm.querySelectorAll('input[id]:not([type="file"]), textarea[id], select[id]').forEach(element => {
                            if (element.id) {
                                currentFormObject[element.id] = (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value;
                            }
                        });
                        allSavedData[entry.date] = currentFormObject;
                        importedCount++;
                        successfullyProcessedEntries.push(entry);
                    }
                });

                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));

                if (importedCount > 0) {
                    showToast(`${importedCount} entries imported successfully!`, 'success');
                    const lastEntryToDisplay = successfullyProcessedEntries.pop();
                    if (lastEntryToDisplay) {
                        diaryForm.reset();
                        initializeForm(true);
                        populateFormWithJson(lastEntryToDisplay);
                        slideToPanel(0);
                    }
                } else {
                    showToast('No valid diary entries found in the selected file(s).', 'info');
                }
            } else {
                showToast('No processable entries found in selected files.', 'info');
            }
        } catch (error) {
            console.error("Error processing imported files:", error);
            showToast('An error occurred during import.', 'error');
        } finally {
            jsonFileInput.value = '';
            if (buttonForLoading) setButtonLoadingState(buttonForLoading, false, originalImportIconHTML);
            renderHistoryList();
            checkAndUpdateAllTabIcons();
        }
    });

    if (saveFormButton) saveFormButton.addEventListener('click', () => {
        const originalSaveIconHTML = saveFormButton.querySelector('i')?.outerHTML;
        setButtonLoadingState(saveFormButton, true, originalSaveIconHTML);
        setTimeout(() => {
            performSaveOperation(false);
            setButtonLoadingState(saveFormButton, false, originalSaveIconHTML);
        }, 10);
    });

    bottomNavButtons.forEach((button, index) => button.addEventListener('click', () => slideToPanel(index)));


    if (typeof tabPanels !== 'undefined') {
        tabPanels.forEach(panel => {
            if (panel.id && panel.id !== 'tab-history' && panel.querySelector('input, textarea, select')) {
                panel.addEventListener('input', (event) => {
                    if (event.target.matches('input[type="text"], input[type="number"], textarea, input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input[type="url"]')) {
                        const hasEmpty = checkTabForEmptyValues(panel);
                        updateTabIconWithIndicator(panel.id, hasEmpty);
                    }
                });
                panel.addEventListener('change', (event) => {
                     if (event.target.matches('select')) {
                        const hasEmpty = checkTabForEmptyValues(panel);
                        updateTabIconWithIndicator(panel.id, hasEmpty);
                    }
                });
            }
        });
    }

    window.addEventListener('pagehide', () => autoSaveOnVisibilityChange());
    document.addEventListener('visibilitychange', autoSaveOnVisibilityChange);

    if (cancelMultiSelectButton) cancelMultiSelectButton.addEventListener('click', disableMultiSelectMode);
    if (deleteSelectedButton) deleteSelectedButton.addEventListener('click', handleDeleteSelectedEntries);
    if (exportSelectedButton) exportSelectedButton.addEventListener('click', handleExportSelectedEntries);

    if (menuButton) {
        menuButton.addEventListener('click', (event) => {
            event.stopPropagation();
            if (isMultiSelectModeActive) return;
            toggleDropdownMenu();
        });
    }
    if (shareEntryButton) {
        shareEntryButton.addEventListener('click', () => {
            handleShareCurrentEntry();
        });
    }
    if (menuImportButton) {
        menuImportButton.addEventListener('click', () => {
            jsonFileInput.click();
            toggleDropdownMenu(false);
        });
    }
    if (menuClearFormButton) {
        menuClearFormButton.addEventListener('click', () => {
            clearDiaryForm();
            toggleDropdownMenu(false);
        });
    }

    document.addEventListener('click', (event) => {
        if (isDropdownMenuOpen && dropdownMenu && !dropdownMenu.contains(event.target) && event.target !== menuButton && !menuButton.contains(event.target)) {
            toggleDropdownMenu(false);
        }
    });


    // --- Initial Application Setup ---
    updateTopBarForMultiSelectView(false);
    initializeForm();
    slideToPanel(0, false);

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Ensure you are not on file:/// protocol for SW registration
            if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
                navigator.serviceWorker.register('sw.js')
                    .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
                    .catch(error => console.log('ServiceWorker registration failed: ', error));
            } else {
                console.warn('Service Worker not registered. App must be served over HTTP/HTTPS or localhost for Service Workers to work.');
            }
        });
    }
});