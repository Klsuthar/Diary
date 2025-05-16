document.addEventListener('DOMContentLoaded', () => {
    const diaryForm = document.getElementById('diaryForm');
    // const clearFormButtonOriginal = document.getElementById('clearForm'); // This button is removed from HTML
    const importJsonButton = document.getElementById('importJsonButton'); // Now in top bar
    const jsonFileInput = document.getElementById('jsonFile');
    const saveFormButton = document.getElementById('saveFormButton'); // Now in top bar
    const toastContainer = document.getElementById('toast-container');
    const downloadButton = document.getElementById('downloadButton'); // Now in top bar with this ID

    // Top Bar Elements
    const dateInput = document.getElementById('date');
    const dateIncrementButton = document.getElementById('dateIncrement');
    const dateDecrementButton = document.getElementById('dateDecrement');
    const currentDateDisplay = document.getElementById('currentDateDisplay');
    const topBarClearButton = document.getElementById('topBarClearButton'); // Already in top bar

    // Tab Navigation (Bottom Bar)
    const bottomNavButtons = document.querySelectorAll('.bottom-nav-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const tabViewPort = document.getElementById('tabViewPort');
    const tabPanelsSlider = document.getElementById('tabPanelsSlider');

    const energyLevelSlider = document.getElementById('energyLevel');
    const energyLevelValueDisplay = document.getElementById('energyLevelValue');
    const stressLevelSlider = document.getElementById('stressLevel');
    const stressLevelValueDisplay = document.getElementById('stressLevelValue');

    const dailyActivitySummaryTextarea = document.getElementById('dailyActivitySummary');
    const summaryCountsDisplay = document.getElementById('summaryCounts');

    const BIRTH_DATE = new Date(2003, 6, 4);
    const LOCAL_STORAGE_KEY = 'myPersonalDiaryFormData';
    const MAX_SUGGESTIONS_PER_FIELD = 7;

    let currentTabIndex = 0;
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50;

    const suggestionConfigs = [
        { key: 'myPersonalDiaryPersonalCareSuggestions', fieldIds: ['faceProductName', 'faceProductBrand', 'hairProductName', 'hairProductBrand', 'hairOil', 'skincareRoutine'] },
        { key: 'myPersonalDiaryDietSuggestions', fieldIds: ['breakfast', 'lunch', 'dinner'] }
    ];

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
                iconElement.className = tempDiv.firstChild.className; // Restore original classes
                // delete button.dataset.originalIcon; // Clean up
            } else if (iconElement && originalIconHTML) { // Fallback if dataset.originalIcon wasn't set
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
            dateInput.value = formatDate(currentDateValue);
        }

        if (!isNaN(currentDateValue.getTime())) {
            currentDateValue.setDate(currentDateValue.getDate() + days);
            dateInput.value = formatDate(currentDateValue);
            updateCurrentDateDisplay(dateInput.value);
            loadFormFromLocalStorage(); // Reload data for the new date
        } else {
            const today = new Date();
            dateInput.value = formatDate(today);
            updateCurrentDateDisplay(dateInput.value);
            loadFormFromLocalStorage(); // Reload data for today
        }
    }

    if (dateInput) {
        dateInput.addEventListener('change', () => {
            updateCurrentDateDisplay(dateInput.value);
            loadFormFromLocalStorage(); // Reload data when date is manually picked
        });
    }
    if (dateIncrementButton) dateIncrementButton.addEventListener('click', () => changeDate(1));
    if (dateDecrementButton) dateDecrementButton.addEventListener('click', () => changeDate(-1));

    function updateSliderDisplay(slider, displayElement) {
        if (slider && displayElement) displayElement.textContent = slider.value;
    }
    if (energyLevelSlider) energyLevelSlider.addEventListener('input', () => updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay));
    if (stressLevelSlider) stressLevelSlider.addEventListener('input', () => updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay));

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
                    suggestionsData[fieldId] = suggestionsData[fieldId].filter(s => s !== newValue);
                    suggestionsData[fieldId].unshift(newValue);
                    if (suggestionsData[fieldId].length > MAX_SUGGESTIONS_PER_FIELD) suggestionsData[fieldId] = suggestionsData[fieldId].slice(0, MAX_SUGGESTIONS_PER_FIELD);
                    configUpdated = true;
                }
            });
            if (configUpdated) {
                localStorage.setItem(config.key, JSON.stringify(suggestionsData));
                overallUpdated = true;
            }
        });
        if (overallUpdated) loadAllSuggestions();
    }

    function clearDiaryForm() {
        if (confirm("Are you sure you want to clear the form and any unsaved changes? This will also remove locally saved data for the current date (but not persistent suggestions).")) {
            diaryForm.reset();
            // Remove only data associated with the current date from LOCAL_STORAGE_KEY
            const currentFormDate = dateInput.value;
            const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            if (allSavedData[currentFormDate]) {
                delete allSavedData[currentFormDate];
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
            }
            
            initializeForm(true); // Re-initialize to set defaults, pass true to indicate it's a clear operation
            showToast("Form cleared for current date and local save removed.", "info");
            slideToPanel(0); // Go back to the first tab
        }
    }

    if (topBarClearButton) {
        topBarClearButton.addEventListener('click', clearDiaryForm);
    }

    function initializeForm(isClearing = false) {
        if (!dateInput.value || isClearing) { // Set to today if no date or if clearing
            const today = new Date();
            dateInput.value = formatDate(today);
        }
        updateCurrentDateDisplay(dateInput.value);

        // Reset specific fields to default only if clearing, otherwise they might be loaded from LS
        if(isClearing){
            ['weightKg', 'heightCm', 'chest', 'belly', 'meditationStatus', 'meditationDurationMin'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (id === 'weightKg') el.value = "72";
                    else if (id === 'heightCm') el.value = "178";
                    else if (id === 'chest') el.value = "82";
                    else if (id === 'belly') el.value = "91";
                    else if (id === 'meditationStatus') el.value = "Na";
                    else if (id === 'meditationDurationMin') el.value = "0";
                }
            });
            if(energyLevelSlider) energyLevelSlider.value = 5;
            if(stressLevelSlider) stressLevelSlider.value = 5;
        }
        
        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        
        loadAllSuggestions();
        if (!isClearing) { // Don't load from LS if we just cleared, it's already handled
            loadFormFromLocalStorage();
        }
        updateSummaryCounts();
        slideToPanel(currentTabIndex, false);
    }


    function getValue(elementId, type = 'text') {
        const element = document.getElementById(elementId);
        if (!element) return type === 'number' || type === 'range' ? null : '';
        const value = element.value.trim();
        if (type === 'number' || type === 'range') return value === '' ? null : parseFloat(value);
        return value;
    }

    function setValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = (value === null || value === undefined) ? '' : value;
            if (element.type === 'range') {
                if (element.id === 'energyLevel') updateSliderDisplay(element, energyLevelValueDisplay);
                if (element.id === 'stressLevel') updateSliderDisplay(element, stressLevelValueDisplay);
            }
        }
    }

    function calculateAge(entryDateStr) {
        if (!entryDateStr) return null;
        const entryDate = new Date(entryDateStr);
        if (isNaN(entryDate.getTime())) return null;
        let age = entryDate.getFullYear() - BIRTH_DATE.getFullYear();
        const monthDiff = entryDate.getMonth() - BIRTH_DATE.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && entryDate.getDate() < BIRTH_DATE.getDate())) age--;
        return age >= 0 ? age : null;
    }

    function slideToPanel(index, animate = true) {
        if (!tabPanelsSlider || index < 0 || index >= tabPanels.length) return;

        currentTabIndex = index;
        const offset = -index * 100;

        if (animate) {
            tabPanelsSlider.style.transition = 'transform 0.35s ease-in-out';
        } else {
            tabPanelsSlider.style.transition = 'none';
        }
        tabPanelsSlider.style.transform = `translateX(${offset}%)`;

        bottomNavButtons.forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
        tabPanels.forEach((panel, i) => {
            panel.classList.toggle('active', i === index);
        });
    }

    bottomNavButtons.forEach((button, index) => {
        button.addEventListener('click', () => slideToPanel(index));
    });

    if (tabViewPort) {
        let swipeInProgress = false; 

        tabViewPort.addEventListener('touchstart', (e) => {
            if (e.target.closest('.slider-container') || e.target.closest('input[type="range"]')) {
                swipeInProgress = false; 
                return;
            }
            swipeInProgress = true; 
            touchStartX = e.touches[0].clientX;
            touchEndX = touchStartX; 
            tabPanelsSlider.style.transition = 'none'; 
        }, { passive: true }); 

        tabViewPort.addEventListener('touchmove', (e) => {
            if (!swipeInProgress) return; 
            touchEndX = e.touches[0].clientX;
        }, { passive: true });

        tabViewPort.addEventListener('touchend', () => {
            if (!swipeInProgress) return; 

            const deltaX = touchEndX - touchStartX;
            let newIndex = currentTabIndex;

            if (Math.abs(deltaX) > swipeThreshold) {
                if (deltaX < 0) { 
                    newIndex = Math.min(currentTabIndex + 1, tabPanels.length - 1);
                } else { 
                    newIndex = Math.max(currentTabIndex - 1, 0);
                }
            }
            slideToPanel(newIndex, true); 
            
            swipeInProgress = false; 
            touchStartX = 0; 
            touchEndX = 0;
        });
    }

    diaryForm.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!downloadButton) return;
        
        const originalDownloadIconHTML = downloadButton.querySelector('i')?.outerHTML;
        setButtonLoadingState(downloadButton, true, originalDownloadIconHTML);
        
        setTimeout(() => {
            try {
                // Suggestions are saved on local save, not necessarily on download
                // saveAllSuggestions(); // Optional: save suggestions on download too
                const data = {};
                const selectedDateStr = getValue('date');
                let dayId = null;
                if (selectedDateStr) {
                    const selectedDate = new Date(selectedDateStr.replace(/-/g, '/')); // More robust date parsing
                    if (!isNaN(selectedDate.getTime())) {
                        const startOfYear = new Date(selectedDate.getFullYear(), 0, 1);
                        dayId = Math.floor((selectedDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    }
                }
                data.date = selectedDateStr;
                data.day_id = dayId;
                data.age = calculateAge(selectedDateStr);
                data.environment = {
                    temperature_c: getValue('temperatureC'),
                    air_quality_index: getValue('airQualityIndex', 'number'),
                    humidity_percent: getValue('humidityPercent', 'number'),
                    uv_index: getValue('uvIndex', 'number'),
                    weather_condition: getValue('weatherCondition')
                };
                data.body_measurements = {
                    weight_kg: getValue('weightKg', 'number'),
                    height_cm: getValue('heightCm', 'number'),
                    chest: getValue('chest', 'number'),
                    belly: getValue('belly', 'number')
                };
                data.health_and_fitness = {
                    sleep_hours: getValue('sleepHours', 'number'),
                    steps_count: getValue('stepsCount', 'number'),
                    steps_distance_km: getValue('stepsDistanceKm', 'number'),
                    kilocalorie: getValue('kilocalorie', 'number'),
                    water_intake_liters: getValue('waterIntakeLiters', 'number'),
                    medications_taken: getValue('medicationsTaken'),
                    physical_symptoms: getValue('physicalSymptoms'),
                    energy_level: getValue('energyLevel', 'range'),
                    stress_level: getValue('stressLevel', 'range')
                };
                data.mental_and_emotional_health = {
                    mental_state: getValue('mentalState'),
                    meditation_status: getValue('meditationStatus'),
                    meditation_duration_min: getValue('meditationDurationMin', 'number'),
                    other_thoughts_detailed_entry: getValue('otherThoughtsDetailedEntry')
                };
                data.personal_care = {
                    face_product_name: getValue('faceProductName'),
                    face_product_brand: getValue('faceProductBrand'),
                    hair_product_name: getValue('hairProductName'),
                    hair_product_brand: getValue('hairProductBrand'),
                    hair_oil: getValue('hairOil'),
                    skincare_routine: getValue('skincareRoutine')
                };
                data.diet_and_nutrition = {
                    breakfast: getValue('breakfast'),
                    lunch: getValue('lunch'),
                    dinner: getValue('dinner')
                };
                data.activities_and_productivity = {
                    tasks_today_english: getValue('tasksTodayEnglish'),
                    travel_destination: getValue('travelDestination'),
                    phone_screen_on_hr: getValue('phoneScreenOnHr', 'number')
                };
                data.additional_notes = {
                    key_events: getValue('keyEvents')
                };
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
                    // Save imported data to local storage for the imported date
                    if (importedData.date) {
                        const formDataToSave = {};
                        diaryForm.querySelectorAll('input[id]:not([type="file"]), textarea[id], select[id]').forEach(element => {
                            if (element.id) formDataToSave[element.id] = (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value;
                        });
                        
                        let allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
                        allSavedData[importedData.date] = formDataToSave;
                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
                    }

                    showToast('Diary entry imported successfully!', 'success');
                    let firstPopulatedIndex = 0;
                    for (let i = 0; i < tabPanels.length; i++) {
                        const panelInputs = tabPanels[i].querySelectorAll('input:not([type="range"]):not([type="date"]), textarea');
                        let hasData = false;
                        for (const input of panelInputs) {
                            if (input.value && input.value.trim() !== '' && input.value !== 'Na' && input.value !== '0') {
                                hasData = true;
                                break;
                            }
                        }
                        if (hasData) {
                            firstPopulatedIndex = i;
                            break;
                        }
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
        // Clear form before populating to avoid merging with existing data
        diaryForm.reset(); 
        initializeForm(true); // Reset to defaults, important for sliders and specific fields

        setValue('date', jsonData.date);
        updateCurrentDateDisplay(jsonData.date);
        if (jsonData.environment) {
            Object.keys(jsonData.environment).forEach(key => {
                const elId = {
                    temperature_c: 'temperatureC',
                    air_quality_index: 'airQualityIndex',
                    humidity_percent: 'humidityPercent',
                    uv_index: 'uvIndex',
                    weather_condition: 'weatherCondition'
                }[key];
                if (elId) setValue(elId, jsonData.environment[key]);
            });
        }
        if (jsonData.body_measurements) {
            Object.keys(jsonData.body_measurements).forEach(key => {
                const elId = {
                    weight_kg: 'weightKg',
                    height_cm: 'heightCm',
                    chest: 'chest',
                    belly: 'belly'
                }[key];
                if (elId) setValue(elId, jsonData.body_measurements[key]);
            });
        }
        if (jsonData.health_and_fitness) {
            Object.keys(jsonData.health_and_fitness).forEach(key => {
                const elId = {
                    sleep_hours: 'sleepHours',
                    steps_count: 'stepsCount',
                    steps_distance_km: 'stepsDistanceKm',
                    kilocalorie: 'kilocalorie',
                    water_intake_liters: 'waterIntakeLiters',
                    medications_taken: 'medicationsTaken',
                    physical_symptoms: 'physicalSymptoms',
                    energy_level: 'energyLevel',
                    stress_level: 'stressLevel'
                }[key];
                if (elId) setValue(elId, jsonData.health_and_fitness[key]);
            });
        }
        if (jsonData.mental_and_emotional_health) {
            setValue('mentalState', jsonData.mental_and_emotional_health.mental_state);
            setValue('meditationStatus', jsonData.mental_and_emotional_health.meditation_status);
            setValue('meditationDurationMin', jsonData.mental_and_emotional_health.meditation_duration_min);
            setValue('otherThoughtsDetailedEntry', jsonData.mental_and_emotional_health.other_thoughts_detailed_entry);
        }
        if (jsonData.personal_care) {
            setValue('faceProductName', jsonData.personal_care.face_product_name);
            setValue('faceProductBrand', jsonData.personal_care.face_product_brand);
            setValue('hairProductName', jsonData.personal_care.hair_product_name);
            setValue('hairProductBrand', jsonData.personal_care.hair_product_brand);
            setValue('hairOil', jsonData.personal_care.hair_oil);
            setValue('skincareRoutine', jsonData.personal_care.skincare_routine);
        }
        if (jsonData.diet_and_nutrition) {
            setValue('breakfast', jsonData.diet_and_nutrition.breakfast);
            setValue('lunch', jsonData.diet_and_nutrition.lunch);
            setValue('dinner', jsonData.diet_and_nutrition.dinner);
        }
        if (jsonData.activities_and_productivity) {
            setValue('tasksTodayEnglish', jsonData.activities_and_productivity.tasks_today_english);
            setValue('travelDestination', jsonData.activities_and_productivity.travel_destination);
            setValue('phoneScreenOnHr', jsonData.activities_and_productivity.phone_screen_on_hr);
        }
        if (jsonData.additional_notes) setValue('keyEvents', jsonData.additional_notes.key_events);
        setValue('dailyActivitySummary', jsonData.daily_activity_summary);
        
        // Ensure sliders and counts are updated after populating
        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
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

    if (saveFormButton) {
        saveFormButton.addEventListener('click', () => {
            const originalSaveIconHTML = saveFormButton.querySelector('i')?.outerHTML;
            setButtonLoadingState(saveFormButton, true, originalSaveIconHTML);
            setTimeout(() => {
                try {
                    saveAllSuggestions(); // Save suggestions for input fields
                    const currentFormDate = dateInput.value;
                    if (!currentFormDate) {
                        showToast('Please select a date first.', 'error');
                        setButtonLoadingState(saveFormButton, false, originalSaveIconHTML);
                        return;
                    }

                    const formDataToSave = {};
                    diaryForm.querySelectorAll('input[id]:not([type="file"]), textarea[id], select[id]').forEach(element => {
                        if (element.id) { // Ensure element has an ID
                           formDataToSave[element.id] = (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value;
                        }
                    });
                    
                    let allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
                    allSavedData[currentFormDate] = formDataToSave; // Store data under the specific date

                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
                    showToast('Form data saved locally for this date!', 'success');
                } catch (e) {
                    console.error("Error saving to localStorage:", e);
                    showToast('Failed to save form data. Storage might be full.', 'error');
                } finally {
                    setButtonLoadingState(saveFormButton, false, originalSaveIconHTML);
                }
            }, 50);
        });
    }

    function loadFormFromLocalStorage() {
        const currentFormDate = dateInput.value;
        if (!currentFormDate) return; // Don't load if no date is selected

        const allSavedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        const formDataForDate = allSavedData[currentFormDate];

        // Clear the form before loading data for a new date or if no data exists for this date
        diaryForm.reset();
        initializeForm(true); // Reset to defaults, but date is already set

        if (formDataForDate) {
            try {
                Object.keys(formDataForDate).forEach(elementId => setValue(elementId, formDataForDate[elementId]));
                // Date is already set and handled by updateCurrentDateDisplay
                // No need to set dateInput.value again here if it's part of formDataForDate
                // but ensure display is correct for the loaded data's date context
                if (formDataForDate['date']) {
                     updateCurrentDateDisplay(formDataForDate['date']);
                }
                
                showToast('Previously saved data for this date loaded.', 'info');
            } catch (e) {
                console.error("Error loading from localStorage for date:", e);
                showToast('Could not load saved data for this date. It might be corrupted.', 'error');
                // Optionally remove corrupted data for this specific date
                // delete allSavedData[currentFormDate];
                // localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSavedData));
            }
        } else {
            // No data for this date, form is already reset by initializeForm(true)
            // showToast('No saved data for this date.', 'info'); // Optional: notify user
        }
        // Ensure sliders and counts are updated after potential load
        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        updateSummaryCounts();
    }
    
    initializeForm();
});