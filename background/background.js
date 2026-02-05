// DeepSleep Tube - Background Service Worker

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.local.set({
      deepsleepSettings: {
        enabled: false,
        preset: 'relax',
        safety: 70,
        warmth: 60,
        speed: 100,
        adMute: true,
        comfortNoise: false,
        timerMinutes: 0
      }
    });
    console.log('DeepSleep Tube installed');
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get('deepsleepSettings', (result) => {
      sendResponse(result.deepsleepSettings || {});
    });
    return true;
  }
});

// Badge update when enabled
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.deepsleepSettings) {
    const settings = changes.deepsleepSettings.newValue;
    if (settings?.enabled) {
      chrome.action.setBadgeText({ text: '🌙' });
      chrome.action.setBadgeBackgroundColor({ color: '#4a3f6b' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
});
