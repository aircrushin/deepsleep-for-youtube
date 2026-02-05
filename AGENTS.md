# DeepSleep Tube - Agent Guide

This document provides essential context for AI agents working on the DeepSleep Tube Chrome extension project.

## Project Overview

DeepSleep Tube is a Chrome extension that provides AI-enhanced audio filtering for YouTube videos, designed for comfortable sleep listening. It uses the Web Audio API to process audio in real-time with features like dynamic range compression, warmth filtering, playback speed control, and ad muting.

## Architecture

### Extension Structure

```
deepsleep-chrome/
├── manifest.json          # Chrome extension manifest (v3)
├── background/
│   └── background.js      # Service worker (minimal usage)
├── content/
│   ├── content.js         # Main audio processing logic
│   ├── content.css        # Injected styles (moon button, tooltip)
│   └── pink-noise-processor.js  # AudioWorklet for pink noise generation
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Popup logic & settings management
│   └── popup.css          # Popup styling
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Component Responsibilities

| File | Responsibility |
|------|---------------|
| [manifest.json](manifest.json) | Extension configuration, permissions, content script registration |
| [content/content.js](content/content.js) | DeepSleepAudio class - Web Audio API processing chain |
| [popup/popup.js](popup/popup.js) | Settings UI, storage sync, message passing to content script |

### Audio Processing Chain

```
MediaElementAudioSourceNode (video.html5-main-video)
  ↓
DynamicsCompressorNode (spike suppression)
  ↓
BiquadFilterNode (low-pass warmth filter)
  ↓
GainNode (fade, ad mute, volume control)
  ↓
AudioDestinationNode (speakers)
```

**Parallel Pink Noise:**
```
AudioWorklet (Voss-McCartney pink noise)
  ↓
GainNode (comfort noise level)
  ↓
AudioDestinationNode
```

## Key Technical Concepts

### Web Audio API
- **AudioContext**: Must be resumed from suspended state (autoplay policy)
- **DynamicsCompressorNode**: Suppresses sudden loud sounds (laughter, applause)
- **BiquadFilterNode**: Low-pass filter for warmth (attenuates harsh highs)
- **GainNode**: Volume control, fade effects, ad muting
- **AudioWorklet**: Pink noise generation using Voss-McCartney algorithm

### Message Passing
- `chrome.storage.local`: Persistent settings storage
- `chrome.tabs.sendMessage()`: Popup → Content script communication
- `chrome.runtime.onMessage`: Content script message listener

### Settings Schema

```javascript
{
  enabled: boolean,        // Master toggle
  preset: 'deep' | 'zen' | 'relax' | string | null,  // Built-in or custom preset
  safety: 0-100,          // Compression aggressiveness
  warmth: 0-100,          // Low-pass filter frequency
  speed: 70-100,          // Playback rate (0.7x - 1.0x)
  volumeDb: -20 to +20,   // Volume adjustment in dB
  adMute: boolean,        // Mute during ads
  comfortNoise: boolean,  // Pink noise during silence
  timerMinutes: number    // Sleep timer (0 = off)
}

// Custom presets stored separately:
{
  deepsleepCustomPresets: {
    [name]: { safety, warmth, speed }
  }
}
```

### Ad Detection
Uses DOM observation for YouTube's ad indicators:
- `.ad-showing` class on player
- `.ytp-ad-player-overlay` element presence

## Development Guidelines

### Chrome Extension Constraints
- **Manifest V3**: Uses service worker instead of background page
- **CSP**: Content Security Policy restricts inline scripts
- **Permissions**: `storage` for settings, `activeTab` for current tab access
- **Host permissions**: `*://youtube.com/*` only

### Audio Processing Best Practices
1. **Attach only once**: Check `isProcessing` before attaching
2. **Handle context state**: Always resume AudioContext if suspended
3. **Smooth transitions**: Use `setValueAtTime()` and `setTargetAtTime()` for parameter changes
4. **Resource cleanup**: Disconnect nodes when detaching processing

### State Management
- Settings stored in `chrome.storage.local` with key `deepsleepSettings`
- Content script observes settings via message listener
- Popup sends `SETTINGS_UPDATE` message on any change

### YouTube Integration
- Target video: `video.html5-main-video`
- Controls container: `.ytp-right-controls`
- Handle SPA navigation: Periodic re-checks every 2s

## Common Tasks

### Adding a New Audio Effect

1. Create new node in `attachAudioProcessing()` ([content.js:104](content/content.js#L104))
2. Connect to chain: `prevNode.connect(newNode)`
3. Add parameter mapping in `applyAudioParams()` ([content.js:245](content/content.js#L245))
4. Add UI control in [popup.html](popup/popup.html)
5. Wire up event listener in [popup.js](popup/popup.js)

### Modifying Presets

Edit `PRESETS` object in [popup.js:13](popup/popup.js#L13):
```javascript
const PRESETS = {
  deep: { safety: 90, warmth: 85, speed: 90 },
  zen: { safety: 80, warmth: 72, speed: 95 },
  relax: { safety: 70, warmth: 60, speed: 100 }
  // Add new preset here
};
```

Users can also create custom presets via the popup UI, which are stored in `chrome.storage.local` under `deepsleepCustomPresets`.

### Debugging Audio Issues

1. Check browser console for "DeepSleep:" prefixed messages
2. Verify AudioContext state: `audioContext.state`
3. Check node connections in DevTools → Media panel
4. Monitor `compressorNode.reduction` for spike detection

### Testing on YouTube

1. Load extension in Chrome: `chrome://extensions/` → "Load unpacked"
2. Navigate to any YouTube video
3. Open DevTools Console to see DeepSleep logs
4. Click extension icon to open popup
5. Toggle "Sleep Mode" to enable processing

## File Reference Links

- [manifest.json](manifest.json) - Extension configuration
- [content/content.js](content/content.js) - Audio processing logic (DeepSleepAudio class)
- [popup/popup.js](popup/popup.js) - Settings UI and state management
- [README.md](README.md) - User-facing documentation

## Quick Reference: Key Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `attachAudioProcessing()` | [content.js:104](content/content.js#L104) | Initialize audio graph |
| `applyAudioParams()` | [content.js:245](content/content.js#L245) | Apply settings to nodes |
| `saveSettings()` | [popup.js:49](popup/popup.js#L49) | Persist to chrome.storage |
| `sendSettingsToContent()` | [popup.js:55](popup/popup.js#L55) | Message content script |
| `observeAds()` | [content.js:87](content/content.js#L87) | Detect and mute ads |

## Known Limitations

- ScriptProcessor is deprecated (should migrate to AudioWorklet)
- Content script re-injection on page navigation
- AudioContext autoplay policy requires user gesture
- Only works on youtube.com (not YouTube embeds)
