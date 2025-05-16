// Constants and Variables
const BIRTH_DATE = new Date('2003-07-04'); // Fixed birth date for age calculation
const AUTOSUGGESTION_LIMIT = 7; // Store up to 7 recent entries per field

// DOM Elements
const panels = document.querySelectorAll('.panel');
const navItems = document.querySelectorAll('.nav-item');
const swipeContainer = document.getElementById('swipe-container');
const toast = document.getElementById('toast');
const wordCountElement = document.getElementById('word-count');
const summaryTextarea = document.getElementById('summary');
const currentDateDisplay = document.getElementById('current-date');
const datePicker = document.getElementById('date-picker');
const datePickerModal = document.getElementById('date-picker-modal');
const confirmModal = document.getElementById('confirm-modal');
const rangeInputs = document.querySelectorAll('input[type="range"]');

// Current State
let currentDate = new Date();
let currentPanel = 0;
let startX = null;
let endX = null;
let activeAction = null;

// Auto-suggestion Field Configurations
const autoSuggestionFields = [
    { inputId: 'face-product-name', datalistId: 'face-products', storageKey: 'faceProducts' },
    { inputId: 'face-product-brand', datalistId: 'face-brands', storageKey: 'faceBrands' },
    { inputId: 'hair-product-name', datalistId: 'hair-products', storageKey: 'hairProducts' },
    { inputId: 'hair-product-brand', datalistId: 'hair-brands', storageKey: 'hairBrands' },
    { inputId: 'hair-oil', datalistId: 'hair-oils', storageKey: 'hairOils' },
    { inputId: 'skincare-routine', datalistId: 'skincare-routines', storageKey: 'skincareRoutines' },
    { inputId: 'breakfast', datalistId: 'breakfast-items', storageKey: 'breakfastItems' },
    { inputId: 'lunch', datalistId: 'lunch-items', storageKey: 'lunchItems' },
    { inputId: 'dinner', datalistId: 'dinner-items', storageKey: 'dinnerItems' }
];

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set up initial date and display
    updateDateDisplay();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize auto-suggestion datalists
    initializeAutoSuggestions();
    
    // Load data from localStorage if available
    loadFormData();
    
    // Update range sliders display values
    updateRangeDisplayValues();
    
    // Initialize word counter
    updateWordCount();
});

// Event Listeners Setup
function setupEventListeners() {
    // Navigation
    navItems.forEach((item, index) => {
        item.addEventListener('click', () => switchPanel(index));
    });
    
    // Date navigation
    document.getElementById('prev-day').addEventListener('click', () => changeDate(-1));
    document.getElementById('next-day').addEventListener('click', () => changeDate(1));
    currentDateDisplay.addEventListener('click', openDatePickerModal);
    document.getElementById('close-modal').addEventListener('click', closeDatePickerModal);
    document.getElementById('set-date').addEventListener('click', setSelectedDate);
    
    // Swiping functionality
    swipeContainer.addEventListener('touchstart', handleTouchStart);
    swipeContainer.addEventListener('touchmove', handleTouchMove);
    swipeContainer.addEventListener('touchend', handleTouchEnd);
    
    // Form actions
    document.getElementById('save-btn').addEventListener('click', saveFormData);
    document.getElementById('download-btn').addEventListener('click', downloadJSON);
    document.getElementById('import-json').addEventListener('change', importJSON);
    document.getElementById('clear-form').addEventListener('click', confirmClearForm);
    
    // Range slider value display
    rangeInputs.forEach(input => {
        const valueDisplay = document.getElementById(`${input.id}-value`);
        if (valueDisplay) {
            input.addEventListener('input', () => {
                valueDisplay.textContent = input.value;
            });
        }
    });
    
    // Word count
    summaryTextarea.addEventListener('input', updateWordCount);
    
    // Modal events
    document.getElementById('confirm-yes').addEventListener('click', () => {
        if (activeAction === 'clearForm') {
            clearForm();
        }
        closeConfirmModal();
    });
    document.getElementById('confirm-no').addEventListener('click', closeConfirmModal);
}

// Date Functions
function updateDateDisplay() {
    // Format the current date
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    currentDateDisplay.textContent = currentDate.toLocaleDateString('en-US', options);
    
    // Update date picker value
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    datePicker.value = `${year}-${month}-${day}`;
    
    // Calculate and update age and day of year
    updateAgeAndDayId();
    
    // Load data for the current date
    loadFormData();
}

function changeDate(days) {
    // Save current data before changing date
    saveFormData();
    
    // Calculate new date
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + days);
    currentDate = newDate;
    
    // Update display and load new data
    updateDateDisplay();
}

function openDatePickerModal() {
    datePickerModal.style.display = 'block';
}

function closeDatePickerModal() {
    datePickerModal.style.display = 'none';
}

function setSelectedDate() {
    // Save current data before changing date
    saveFormData();
    
    // Set new date from picker
    const selectedDate = new Date(datePicker.value);
    currentDate = selectedDate;
    
    // Update display and load new data
    updateDateDisplay();
    closeDatePickerModal();
}

function updateAgeAndDayId() {
    // Calculate age
    let age = currentDate.getFullYear() - BIRTH_DATE.getFullYear();
    const m = currentDate.getMonth() - BIRTH_DATE.getMonth();
    if (m < 0 || (m === 0 && currentDate.getDate() < BIRTH_DATE.getDate())) {
        age--;
    }
    document.getElementById('age').value = age;
    
    // Calculate day of year (day_id)
    const start = new Date(currentDate.getFullYear(), 0, 0);
    const diff = currentDate - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    document.getElementById('day-id').value = dayOfYear;
}

// Panel Navigation
function switchPanel(index) {
    // Update current panel index
    currentPanel = index;
    
    // Update display
    swipeContainer.style.transform = `translateX(-${index * 100}%)`;
    
    // Update active nav item
    navItems.forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Touch/Swipe Handlers
function handleTouchStart(e) {
    startX = e.touches[0].clientX;
}

function handleTouchMove(e) {
    if (!startX) return;
    
    endX = e.touches[0].clientX;
    const diffX = startX - endX;
    
    // Prevent page scroll while swiping horizontally
    if (Math.abs(diffX) > 10) {
        e.preventDefault();
    }
}

function handleTouchEnd() {
    if (!startX || !endX) return;
    
    const diffX = startX - endX;
    const threshold = window.innerWidth * 0.2; // 20% of screen width
    
    if (Math.abs(diffX) > threshold) {
        if (diffX > 0 && currentPanel < panels.length - 1) {
            // Swipe left -> next panel
            switchPanel(currentPanel + 1);
        } else if (diffX < 0 && currentPanel > 0) {
            // Swipe right -> previous panel
            switchPanel(currentPanel - 1);
        }
    }
    
    // Reset values
    startX = null;
    endX = null;
}

// Form Data Functions
function collectFormData() {
    // Get formatted date string
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Get age and day_id from fields
    const age = parseInt(document.getElementById('age').value) || null;
    const day_id = parseInt(document.getElementById('day-id').value) || null;
    
    // Collect all form data
    return {
        date: dateString,
        day_id: day_id,
        age: age,
        environment: {
            temperature_c: document.getElementById('temperature').value || "",
            air_quality_index: parseIntOrNull('air-quality'),
            humidity_percent: parseIntOrNull('humidity'),
            uv_index: parseIntOrNull('uv-index'),
            weather_condition: document.getElementById('weather-condition').value || ""
        },
        body_measurements: {
            weight_kg: parseIntOrNull('weight'),
            height_cm: parseIntOrNull('height'),
            chest: parseIntOrNull('chest'),
            belly: parseIntOrNull('belly')
        },
        health_and_fitness: {
            sleep_hours: parseFloatOrNull('sleep'),
            steps_count: parseIntOrNull('steps-count'),
            steps_distance_km: parseFloatOrNull('steps-distance'),
            kilocalorie: parseIntOrNull('kilocalories'),
            water_intake_liters: parseFloatOrNull('water-intake'),
            medications_taken: document.getElementById('medications').value || "",
            physical_symptoms: document.getElementById('physical-symptoms').value || "",
            energy_level: parseInt(document.getElementById('energy-level').value) || 5,
            stress_level: parseInt(document.getElementById('stress-level').value) || 5
        },
        mental_and_emotional_health: {
            mental_state: document.getElementById('mental-state').value || "",
            meditation_status: document.getElementById('meditation-status').value || "Na",
            meditation_duration_min: parseInt(document.getElementById('meditation-duration').value) || 0,
            other_thoughts_detailed_entry: document.getElementById('thoughts').value || ""
        },
        personal_care: {
            face_product_name: document.getElementById('face-product-name').value || "",
            face_product_brand: document.getElementById('face-product-brand').value || "",
            hair_product_name: document.getElementById('hair-product-name').value || "",
            hair_product_brand: document.getElementById('hair-product-brand').value || "",
            hair_oil: document.getElementById('hair-oil').value || "",
            skincare_routine: document.getElementById('skincare-routine').value || ""
        },
        diet_and_nutrition: {
            breakfast: document.getElementById('breakfast').value || "",
            lunch: document.getElementById('lunch').value || "",
            dinner: document.getElementById('dinner').value || ""
        },
        activities_and_productivity: {
            tasks_today_english: document.getElementById('tasks').value || "",
            travel_destination: document.getElementById('travel').value || "",
            phone_screen_on_hr: parseFloatOrNull('screen-time')
        },
        additional_notes: {
            key_events: document.getElementById('key-events').value || ""
        },
        daily_activity_summary: document.getElementById('summary').value || ""
    };
}

function parseIntOrNull(elementId) {
    const value = document.getElementById(elementId).value;
    return value ? parseInt(value) : null;
}

function parseFloatOrNull(elementId) {
    const value = document.getElementById(elementId).value;
    return value ? parseFloat(value) : null;
}

function populateForm(data) {
    // Reset form first
    resetForm();
    
    if (!data) return;
    
    // Populate Basic & Environment
    document.getElementById('age').value = data.age || "";
    document.getElementById('day-id').value = data.day_id || "";
    document.getElementById('temperature').value = data.environment.temperature_c || "";
    document.getElementById('air-quality').value = data.environment.air_quality_index || "";
    document.getElementById('humidity').value = data.environment.humidity_percent || "";
    document.getElementById('uv-index').value = data.environment.uv_index || "";
    document.getElementById('weather-condition').value = data.environment.weather_condition || "";
    
    // Populate Body & Health
    document.getElementById('weight').value = data.body_measurements.weight_kg || "";
    document.getElementById('height').value = data.body_measurements.height_cm || "";
    document.getElementById('chest').value = data.body_measurements.chest || "";
    document.getElementById('belly').value = data.body_measurements.belly || "";
    document.getElementById('sleep').value = data.health_and_fitness.sleep_hours || "";
    document.getElementById('steps-count').value = data.health_and_fitness.steps_count || "";
    document.getElementById('steps-distance').value = data.health_and_fitness.steps_distance_km || "";
    document.getElementById('kilocalories').value = data.health_and_fitness.kilocalorie || "";
    document.getElementById('water-intake').value = data.health_and_fitness.water_intake_liters || "";
    document.getElementById('medications').value = data.health_and_fitness.medications_taken || "";
    document.getElementById('physical-symptoms').value = data.health_and_fitness.physical_symptoms || "";
    
    const energyLevel = data.health_and_fitness.energy_level || 5;
    document.getElementById('energy-level').value = energyLevel;
    document.getElementById('energy-value').textContent = energyLevel;
    
    const stressLevel = data.health_and_fitness.stress_level || 5;
    document.getElementById('stress-level').value = stressLevel;
    document.getElementById('stress-value').textContent = stressLevel;
    
    // Populate Mental & Personal Care
    document.getElementById('mental-state').value = data.mental_and_emotional_health.mental_state || "";
    document.getElementById('meditation-status').value = data.mental_and_emotional_health.meditation_status || "Na";
    document.getElementById('meditation-duration').value = data.mental_and_emotional_health.meditation_duration_min || 0;
    document.getElementById('thoughts').value = data.mental_and_emotional_health.other_thoughts_detailed_entry || "";
    document.getElementById('face-product-name').value = data.personal_care.face_product_name || "";
    document.getElementById('face-product-brand').value = data.personal_care.face_product_brand || "";
    document.getElementById('hair-product-name').value = data.personal_care.hair_product_name || "";
    document.getElementById('hair-product-brand').value = data.personal_care.hair_product_brand || "";
    document.getElementById('hair-oil').value = data.personal_care.hair_oil || "";
    document.getElementById('skincare-routine').value = data.personal_care.skincare_routine || "";
    
    // Populate Diet & Activities
    document.getElementById('breakfast').value = data.diet_and_nutrition.breakfast || "";
    document.getElementById('lunch').value = data.diet_and_nutrition.lunch || "";
    document.getElementById('dinner').value = data.diet_and_nutrition.dinner || "";
    document.getElementById('tasks').value = data.activities_and_productivity.tasks_today_english || "";
    document.getElementById('travel').value = data.activities_and_productivity.travel_destination || "";
    document.getElementById('screen-time').value = data.activities_and_productivity.phone_screen_on_hr || "";
    
    // Populate Notes & Summary
    document.getElementById('key-events').value = data.additional_notes.key_events || "";
    document.getElementById('summary').value = data.daily_activity_summary || "";
    
    // Update word count
    updateWordCount();
}

function resetForm() {
    // Reset all form fields to default values
    const form = document.querySelector('body');
    const inputs = form.querySelectorAll('input:not([readonly]), textarea');
    
    inputs.forEach(input => {
        if (input.type === 'range') {
            input.value = 5;
            const valueDisplay = document.getElementById(`${input.id}-value`);
            if (valueDisplay) valueDisplay.textContent = 5;
        } else if (input.name === 'meditation_status') {
            input.value = 'Na';
        } else if (input.name === 'meditation_duration_min') {
            input.value = 0;
        } else {
            input.value = '';
        }
    });
    
    // Update calculated fields
    updateAgeAndDayId();
    
    // Update word count
    updateWordCount();
}

function saveFormData() {
    // Add loading spinner
    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Saving...';
    
    // Collect data
    const data = collectFormData();
    
    // Store in localStorage
    const storageKey = `diary_${data.date}`;
    localStorage.setItem(storageKey, JSON.stringify(data));
    
    // Update autosuggestions
    updateAutoSuggestions();
    
    // Show toast notification
    setTimeout(() => {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Locally';
        showToast('Data saved successfully!');
    }, 300);
}

function loadFormData() {
    // Format date for storage key
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Try to load data from localStorage
    const storageKey = `diary_${dateString}`;
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            populateForm(data);
        } catch (error) {
            console.error('Error loading saved data:', error);
            showToast('Error loading saved data');
        }
    } else {
        // Reset form for a new entry
        resetForm();
    }
}

function downloadJSON() {
    // Add loading spinner
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Downloading...';
    
    // Collect data
    const data = collectFormData();
    const jsonString = JSON.stringify(data, null, 2);
    
    // Create file for download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and trigger it
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Restore button text and show toast
    setTimeout(() => {
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download JSON';
        showToast('JSON downloaded successfully!');
    }, 300);
}

function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Show toast for starting import
    showToast('Importing file...');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Set current date to the imported date
            if (data.date) {
                currentDate = new Date(data.date);
                updateDateDisplay();
            }
            
            // Populate form with imported data
            populateForm(data);
            
            // Show success toast
            showToast('Import successful!');
        } catch (error) {
            console.error('Error importing JSON:', error);
            showToast('Error importing JSON file');
        }
        
        // Reset file input
        document.getElementById('import-json').value = '';
    };
    
    reader.onerror = function() {
        showToast('Error reading file');
        // Reset file input
        document.getElementById('import-json').value = '';
    };
    
    reader.readAsText(file);
}

function confirmClearForm() {
    // Set active action and show confirmation modal
    activeAction = 'clearForm';
    document.getElementById('confirm-message').textContent = 'Are you sure you want to clear the form?';
    confirmModal.style.display = 'block';
}

function closeConfirmModal() {
    confirmModal.style.display = 'none';
    activeAction = null;
}

function clearForm() {
    // Reset the form
    resetForm();
    
    // Clear localStorage for current date
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const storageKey = `diary_${dateString}`;
    
    localStorage.removeItem(storageKey);
    
    // Show toast notification
    showToast('Form cleared');
}

// Auto-suggestions Functions
function initializeAutoSuggestions() {
    autoSuggestionFields.forEach(field => {
        const datalist = document.getElementById(field.datalistId);
        const suggestions = getAutoSuggestionFromStorage(field.storageKey);
        
        // Populate datalist with stored suggestions
        populateDatalist(datalist, suggestions);
    });
}

function updateAutoSuggestions() {
    autoSuggestionFields.forEach(field => {
        const input = document.getElementById(field.inputId);
        const value = input.value.trim();
        
        if (value) {
            // Get existing suggestions
            const suggestions = getAutoSuggestionFromStorage(field.storageKey);
            
            // Add new value if not already in the list
            if (!suggestions.includes(value)) {
                suggestions.unshift(value);
                
                // Limit the number of suggestions
                if (suggestions.length > AUTOSUGGESTION_LIMIT) {
                    suggestions.pop();
                }
                
                // Save back to storage
                localStorage.setItem(field.storageKey, JSON.stringify(suggestions));
                
                // Update datalist
                const datalist = document.getElementById(field.datalistId);
                populateDatalist(datalist, suggestions);
            }
        }
    });
}

function getAutoSuggestionFromStorage(key) {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
}

function populateDatalist(datalist, options) {
    // Clear existing options
    datalist.innerHTML = '';
    
    // Add new options
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        datalist.appendChild(optionElement);
    });
}

// Utility Functions
function updateRangeDisplayValues() {
    rangeInputs.forEach(input => {
        const valueDisplay = document.getElementById(`${input.id}-value`);
        if (valueDisplay) {
            valueDisplay.textContent = input.value;
        }
    });
}

function updateWordCount() {
    const text = summaryTextarea.value;
    const wordCount = text ? text.trim().split(/\s+/).length : 0;
    const charCount = text ? text.length : 0;
    
    wordCountElement.textContent = `${wordCount} words, ${charCount} characters`;
}

function showToast(message) {
    // Set message and show toast
    toast.textContent = message;
    toast.classList.add('show');
    
    // Hide toast after delay
    setTimeout(() => {
        toast.classList.remove('show');
    }, 1500);
}
