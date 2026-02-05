const DEFAULT_SETTINGS = {
  enabled: false,
  preset: 'relax',
  safety: 70,
  warmth: 60,
  speed: 100,
  volumeDb: 0,
  adMute: true,
  comfortNoise: false,
  timerMinutes: 0
};

const PRESETS = {
  deep: { safety: 90, warmth: 85, speed: 90 },
  zen: { safety: 80, warmth: 72, speed: 95 },
  relax: { safety: 70, warmth: 60, speed: 100 }
};

let settings = { ...DEFAULT_SETTINGS };
let customPresets = {};

// DOM Elements
const masterToggle = document.getElementById('masterToggle');
const container = document.querySelector('.container');
const safetySlider = document.getElementById('safetySlider');
const warmthSlider = document.getElementById('warmthSlider');
const speedSlider = document.getElementById('speedSlider');
const safetyValue = document.getElementById('safetyValue');
const warmthValue = document.getElementById('warmthValue');
const speedValue = document.getElementById('speedValue');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const adMuteCheckbox = document.getElementById('adMute');
const comfortNoiseCheckbox = document.getElementById('comfortNoise');
const timerButtons = document.querySelectorAll('.timer-btn');
const timerDisplay = document.getElementById('timerDisplay');
const presetDeep = document.getElementById('presetDeep');
const presetZen = document.getElementById('presetZen');
const presetRelax = document.getElementById('presetRelax');
const statsDisplay = document.getElementById('statsDisplay');
const savePresetBtn = document.getElementById('savePresetBtn');
const customPresetsList = document.getElementById('customPresetsList');

// Load settings from storage
async function loadSettings() {
  const stored = await chrome.storage.local.get(['deepsleepSettings', 'deepsleepCustomPresets']);
  if (stored.deepsleepSettings) {
    settings = { ...DEFAULT_SETTINGS, ...stored.deepsleepSettings };
  }
  if (stored.deepsleepCustomPresets) {
    customPresets = stored.deepsleepCustomPresets;
  }
  updateUI();
  renderCustomPresets();
}

// Save settings to storage
async function saveSettings() {
  await chrome.storage.local.set({ deepsleepSettings: settings });
  sendSettingsToContent();
}

// Send settings to content script
async function sendSettingsToContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url?.includes('youtube.com')) {
      chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATE', settings }, () => {
        if (chrome.runtime.lastError) {
          // Content script not ready, ignore
        }
      });
    }
  } catch (e) {
    // Ignore errors
  }
}

// Update UI from settings
function updateUI() {
  masterToggle.checked = settings.enabled;
  container.classList.toggle('disabled', !settings.enabled);
  
  safetySlider.value = settings.safety;
  warmthSlider.value = settings.warmth;
  speedSlider.value = settings.speed;
  
  safetyValue.textContent = `${settings.safety}%`;
  warmthValue.textContent = `${settings.warmth}%`;
  speedValue.textContent = `${(settings.speed / 100).toFixed(2)}x`;
  
  volumeSlider.value = settings.volumeDb;
  volumeValue.textContent = `${settings.volumeDb > 0 ? '+' : ''}${settings.volumeDb} dB`;
  
  adMuteCheckbox.checked = settings.adMute;
  comfortNoiseCheckbox.checked = settings.comfortNoise;
  
  // Presets
  presetDeep.classList.toggle('active', settings.preset === 'deep');
  presetZen.classList.toggle('active', settings.preset === 'zen');
  presetRelax.classList.toggle('active', settings.preset === 'relax');
  
  // Timer
  timerButtons.forEach(btn => {
    const mins = parseInt(btn.dataset.minutes);
    btn.classList.toggle('active', mins === settings.timerMinutes);
  });
  
  if (settings.timerMinutes === 0) {
    timerDisplay.textContent = 'Off';
  } else if (settings.timerMinutes >= 60) {
    timerDisplay.textContent = `${settings.timerMinutes / 60}h`;
  } else {
    timerDisplay.textContent = `${settings.timerMinutes}m`;
  }
  
  statsDisplay.textContent = settings.enabled ? 'Sleep mode active' : 'Ready';
}

// Apply preset
function applyPreset(presetName) {
  const preset = PRESETS[presetName] || customPresets[presetName];
  if (preset) {
    settings.preset = presetName;
    settings.safety = preset.safety;
    settings.warmth = preset.warmth;
    settings.speed = preset.speed;
    saveSettings();
    updateUI();
    renderCustomPresets();
  }
}

// Save custom preset
async function saveCustomPreset(name) {
  customPresets[name] = {
    safety: settings.safety,
    warmth: settings.warmth,
    speed: settings.speed
  };
  await chrome.storage.local.set({ deepsleepCustomPresets: customPresets });
  settings.preset = name;
  saveSettings();
  renderCustomPresets();
  updateUI();
}

// Delete custom preset
async function deleteCustomPreset(name) {
  delete customPresets[name];
  await chrome.storage.local.set({ deepsleepCustomPresets: customPresets });
  if (settings.preset === name) {
    settings.preset = null;
    saveSettings();
    updateUI();
  }
  renderCustomPresets();
}

// Render custom presets list
function renderCustomPresets() {
  customPresetsList.innerHTML = '';
  for (const [name, preset] of Object.entries(customPresets)) {
    const item = document.createElement('div');
    item.className = `custom-preset-item${settings.preset === name ? ' active' : ''}`;
    item.innerHTML = `
      <span class="preset-name">${name}</span>
      <button class="delete-btn" title="Delete">×</button>
    `;
    item.querySelector('.preset-name').addEventListener('click', () => applyPreset(name));
    item.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCustomPreset(name);
    });
    customPresetsList.appendChild(item);
  }
}

// Event Listeners
masterToggle.addEventListener('change', () => {
  settings.enabled = masterToggle.checked;
  saveSettings();
  updateUI();
});

safetySlider.addEventListener('input', () => {
  settings.safety = parseInt(safetySlider.value);
  settings.preset = null;
  safetyValue.textContent = `${settings.safety}%`;
  presetDeep.classList.remove('active');
  presetZen.classList.remove('active');
  presetRelax.classList.remove('active');
  renderCustomPresets();
});

safetySlider.addEventListener('change', saveSettings);

warmthSlider.addEventListener('input', () => {
  settings.warmth = parseInt(warmthSlider.value);
  settings.preset = null;
  warmthValue.textContent = `${settings.warmth}%`;
  presetDeep.classList.remove('active');
  presetZen.classList.remove('active');
  presetRelax.classList.remove('active');
  renderCustomPresets();
});

warmthSlider.addEventListener('change', saveSettings);

speedSlider.addEventListener('input', () => {
  settings.speed = parseInt(speedSlider.value);
  settings.preset = null;
  speedValue.textContent = `${(settings.speed / 100).toFixed(2)}x`;
  presetDeep.classList.remove('active');
  presetZen.classList.remove('active');
  presetRelax.classList.remove('active');
  renderCustomPresets();
});

speedSlider.addEventListener('change', saveSettings);

volumeSlider.addEventListener('input', () => {
  settings.volumeDb = parseInt(volumeSlider.value);
  volumeValue.textContent = `${settings.volumeDb > 0 ? '+' : ''}${settings.volumeDb} dB`;
});

volumeSlider.addEventListener('change', saveSettings);

adMuteCheckbox.addEventListener('change', () => {
  settings.adMute = adMuteCheckbox.checked;
  saveSettings();
});

comfortNoiseCheckbox.addEventListener('change', () => {
  settings.comfortNoise = comfortNoiseCheckbox.checked;
  saveSettings();
});

presetDeep.addEventListener('click', () => applyPreset('deep'));
presetZen.addEventListener('click', () => applyPreset('zen'));
presetRelax.addEventListener('click', () => applyPreset('relax'));

savePresetBtn.addEventListener('click', () => {
  const name = prompt('Enter preset name:');
  if (name && name.trim()) {
    saveCustomPreset(name.trim());
  }
});

timerButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    settings.timerMinutes = parseInt(btn.dataset.minutes);
    saveSettings();
    updateUI();
  });
});

// Request stats from content script
async function requestStats() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab.url?.includes('youtube.com')) {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_STATS' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not ready yet, ignore
          return;
        }
        if (response?.spikesSuppressed !== undefined) {
          statsDisplay.textContent = `${response.spikesSuppressed} spikes suppressed`;
        }
      });
    }
  } catch (e) {
    // Ignore errors
  }
}

// Initialize
loadSettings();
requestStats();
