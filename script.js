document.addEventListener('DOMContentLoaded', () => {
    const diaryForm = document.getElementById('diaryForm');
    const clearFormButton = document.getElementById('clearForm');
    const importJsonButton = document.getElementById('importJsonButton');
    const jsonFileInput = document.getElementById('jsonFile');
    const saveFormButton = document.getElementById('saveFormButton');
    const toastContainer = document.getElementById('toast-container');

    // Date control elements
    const dateInput = document.getElementById('date');
    const dateIncrementButton = document.getElementById('dateIncrement');
    const dateDecrementButton = document.getElementById('dateDecrement');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    const energyLevelSlider = document.getElementById('energyLevel');
    const energyLevelValueDisplay = document.getElementById('energyLevelValue');
    const stressLevelSlider = document.getElementById('stressLevel');
    const stressLevelValueDisplay = document.getElementById('stressLevelValue');

    const dailyActivitySummaryTextarea = document.getElementById('dailyActivitySummary');
    const summaryCountsDisplay = document.getElementById('summaryCounts');


    const BIRTH_DATE = new Date(2003, 6, 4); // Month is 0-indexed, so 6 is July
    const LOCAL_STORAGE_KEY = 'myPersonalDiaryFormData';
    const MAX_SUGGESTIONS_PER_FIELD = 7;

    // Suggestion fields configuration
    const suggestionConfigs = [
        {
            key: 'myPersonalDiaryPersonalCareSuggestions',
            fieldIds: ['faceProductName', 'faceProductBrand', 'hairProductName', 'hairProductBrand', 'hairOil', 'skincareRoutine']
        },
        {
            key: 'myPersonalDiaryDietSuggestions',
            fieldIds: ['breakfast', 'lunch', 'dinner']
        }
    ];

    // --- Toast Notification System ---
    function showToast(message, type = 'info') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.classList.add('toast', type);
        let iconClass = 'fas fa-info-circle';
        if (type === 'success') iconClass = 'fas fa-check-circle';
        else if (type === 'error') iconClass = 'fas fa-times-circle';
        toast.innerHTML = `<i class="${iconClass}"></i> <p>${message}</p>`;
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 4000);
    }

    // --- Date Control Logic ---
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function changeDate(days) {
        if (dateInput.value) {
            const currentDate = new Date(dateInput.value);
            if (!isNaN(currentDate.getTime())) {
                 currentDate.setDate(currentDate.getDate() + days);
                 dateInput.value = formatDate(currentDate);
            } else {
                dateInput.value = formatDate(new Date());
            }
        } else {
            dateInput.value = formatDate(new Date());
        }
    }

    if (dateIncrementButton) dateIncrementButton.addEventListener('click', () => changeDate(1));
    if (dateDecrementButton) dateDecrementButton.addEventListener('click', () => changeDate(-1));

    // --- Slider Value Display ---
    function updateSliderDisplay(slider, displayElement) {
        if (slider && displayElement) displayElement.textContent = slider.value;
    }
    if (energyLevelSlider) energyLevelSlider.addEventListener('input', () => updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay));
    if (stressLevelSlider) stressLevelSlider.addEventListener('input', () => updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay));

    // --- Summary Word/Character Count ---
    function updateSummaryCounts() {
        if (dailyActivitySummaryTextarea && summaryCountsDisplay) {
            const text = dailyActivitySummaryTextarea.value;
            const charCount = text.length;
            const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
            summaryCountsDisplay.textContent = `Words: ${wordCount}, Characters: ${charCount}`;
        }
    }
    if (dailyActivitySummaryTextarea) {
        dailyActivitySummaryTextarea.addEventListener('input', updateSummaryCounts);
    }


    // --- Generic Suggestions Logic ---
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
        if (overallUpdated) {
            loadAllSuggestions(); 
        }
    }


    // --- Initialize Form ---
    function initializeForm() {
        if (!dateInput.value) {
            dateInput.value = formatDate(new Date());
        }

        document.getElementById('weightKg').value = "72";
        document.getElementById('heightCm').value = "178";
        document.getElementById('chest').value = "82";
        document.getElementById('belly').value = "91";
        document.getElementById('meditationStatus').value = "Na"; 
        document.getElementById('meditationDurationMin').value = "0"; 

        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        
        loadAllSuggestions(); 
        loadFormFromLocalStorage(); 
        updateSummaryCounts(); // Initial count update
    }


    // --- Tab functionality ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            tabPanels.forEach(panel => panel.classList.remove('active'));
            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');
            const targetTabId = button.getAttribute('data-tab');
            document.getElementById(targetTabId).classList.add('active');
        });
    });

    // --- Get/Set Form Values ---
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

    // --- Calculate Age ---
    function calculateAge(entryDateStr) {
        if (!entryDateStr) return null;
        const entryDate = new Date(entryDateStr);
        if (isNaN(entryDate.getTime())) return null;
        let age = entryDate.getFullYear() - BIRTH_DATE.getFullYear();
        const monthDiff = entryDate.getMonth() - BIRTH_DATE.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && entryDate.getDate() < BIRTH_DATE.getDate())) age--;
        return age >= 0 ? age : null;
    }

    // --- Form Submission (Generate JSON) ---
    diaryForm.addEventListener('submit', function(event) {
        event.preventDefault();
        saveAllSuggestions(); 

        const data = {};
        const selectedDateStr = getValue('date');
        let dayId = null;
        if (selectedDateStr) {
            const selectedDate = new Date(selectedDateStr);
            if(!isNaN(selectedDate.getTime())) {
                const startOfYear = new Date(selectedDate.getFullYear(), 0, 1);
                const diffInMilliseconds = selectedDate - startOfYear;
                dayId = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24)) + 1;
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
    });

    // --- Clear Form ---
    clearFormButton.addEventListener('click', function() {
        const confirmClear = confirm("Are you sure you want to clear the form and any unsaved changes? This will also remove locally saved data (but not persistent suggestions).");
        if (confirmClear) {
            diaryForm.reset(); 
            localStorage.removeItem(LOCAL_STORAGE_KEY); 
            initializeForm(); 
            showToast("Form cleared and local save removed.", "info");
            tabButtons.forEach((btn, index) => {
                btn.classList.toggle('active', index === 0);
                btn.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            });
            tabPanels.forEach((panel, index) => panel.classList.toggle('active', index === 0));
        }
    });

    // --- Import JSON ---
    importJsonButton.addEventListener('click', () => jsonFileInput.click());
    jsonFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    populateFormWithJson(importedData);
                    showToast('Diary entry imported successfully!', 'success');
                } catch (error) {
                    console.error("Error parsing JSON file:", error);
                    showToast('Failed to import diary entry. Invalid JSON file.', 'error');
                } finally {
                    jsonFileInput.value = '';
                }
            };
            reader.readAsText(file);
        }
    });

    function populateFormWithJson(jsonData) {
        setValue('date', jsonData.date);
        if (jsonData.environment) {
            Object.keys(jsonData.environment).forEach(key => {
                const elementId = { temperature_c: 'temperatureC', air_quality_index: 'airQualityIndex', humidity_percent: 'humidityPercent', uv_index: 'uvIndex', weather_condition: 'weatherCondition' }[key];
                if (elementId) setValue(elementId, jsonData.environment[key]);
            });
        }
        if (jsonData.body_measurements) {
             Object.keys(jsonData.body_measurements).forEach(key => {
                const elementId = { weight_kg: 'weightKg', height_cm: 'heightCm', chest: 'chest', belly: 'belly' }[key];
                if (elementId) setValue(elementId, jsonData.body_measurements[key]);
            });
        }
        if (jsonData.health_and_fitness) {
            Object.keys(jsonData.health_and_fitness).forEach(key => {
                const elementId = { sleep_hours: 'sleepHours', steps_count: 'stepsCount', steps_distance_km: 'stepsDistanceKm', kilocalorie: 'kilocalorie', water_intake_liters: 'waterIntakeLiters', medications_taken: 'medicationsTaken', physical_symptoms: 'physicalSymptoms', energy_level: 'energyLevel', stress_level: 'stressLevel' }[key];
                if (elementId) setValue(elementId, jsonData.health_and_fitness[key]);
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
        if (jsonData.additional_notes) {
            setValue('keyEvents', jsonData.additional_notes.key_events);
        }
        setValue('dailyActivitySummary', jsonData.daily_activity_summary);

        if (energyLevelSlider) updateSliderDisplay(energyLevelSlider, energyLevelValueDisplay);
        if (stressLevelSlider) updateSliderDisplay(stressLevelSlider, stressLevelValueDisplay);
        updateSummaryCounts(); // Update counts after populating from JSON
    }

    // --- Download JSON ---
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

    // --- Local Storage Save/Load ---
    saveFormButton.addEventListener('click', () => {
        saveAllSuggestions(); 

        const formDataToSave = {};
        const elementsToSave = diaryForm.querySelectorAll('input[id]:not([type="file"]), textarea[id], select[id]');
        elementsToSave.forEach(element => {
            if (element.id) {
                 if (element.type === 'checkbox' || element.type === 'radio') {
                    formDataToSave[element.id] = element.checked;
                } else {
                    formDataToSave[element.id] = element.value;
                }
            }
        });
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formDataToSave));
            showToast('Form data saved locally!', 'success');
        } catch (e) {
            console.error("Error saving to localStorage:", e);
            showToast('Failed to save form data. Storage might be full.', 'error');
        }
    });

    function loadFormFromLocalStorage() {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            try {
                const formData = JSON.parse(savedData);
                Object.keys(formData).forEach(elementId => {
                    setValue(elementId, formData[elementId]);
                });
                if (Object.keys(formData).length > 0) {
                    showToast('Previously saved data loaded.', 'info');
                }
            } catch (e) {
                console.error("Error loading from localStorage:", e);
                showToast('Could not load saved data. It might be corrupted.', 'error');
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
        }
    }

    initializeForm();
});
