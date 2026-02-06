# DeepSleep Tube 🌙

An AI-enhanced audio filtering Chrome extension designed specifically for YouTube, letting you fall asleep to warm, undisturbed sound.

## ✨ Features

- **Smart Dynamic Compression** - Suppresses sudden audio peaks (laughter, applause, loud transitions) within 5ms
- **Warmth Filter** - Low-pass filter attenuates harsh highs, making sound softer
- **Volume Normalization** - Consistent volume across all videos
- **Speed Control Without Pitch Change** - Slow down speech rate (0.7x-1.0x) without audio distortion
- **Smart Fade Out** - When sleep timer expires, volume gradually decreases over 2 minutes
- **Ad Mute** - Automatically lowers volume for YouTube ads
- **Comfort Noise** - Optional pink noise fills silent gaps

## 📥 Installation Guide

### Step 1: Download the Extension

**Method 1: Direct ZIP Download**

1. Visit the [GitHub Repository](https://github.com/aircrushin/deepsleep-for-youtube)
2. Click the green **"Code"** button
3. Select **"Download ZIP"**
4. Extract the downloaded ZIP file to any folder

**Method 2: Clone with Git**

```bash
git clone https://github.com/aircrushin/deepsleep-for-youtube.git
```

### Step 2: Install to Chrome

1. Open Chrome browser
2. Type `chrome://extensions/` in the address bar and press Enter
3. Toggle the **"Developer mode"** switch in the top right
4. Click the **"Load unpacked"** button in the top left
5. Select the folder you just extracted (the one containing `manifest.json`)
6. Done! You'll see the 🌙 icon in your Chrome toolbar

## 🎮 How to Use

1. Open any YouTube video
2. Click the **DeepSleep Tube** icon 🌙 in your Chrome toolbar
3. Toggle the **"Sleep Mode"** switch
4. Choose a preset, or manually adjust:
   - **Safety**: Noise suppression intensity
   - **Warmth**: Degree of high-frequency softening
   - **Speed**: Playback rate (0.7x - 1.0x)
   - **Volume**: Output volume (-30dB to +6dB)
5. Optional: Set a sleep timer

## 🎛️ Preset Guide

### Built-in Presets

| Preset       | Safety | Warmth | Speed | Use Case                            |
| ------------ | ------ | ------ | ----- | ----------------------------------- |
| 😴 Deep Sleep| 90%    | 85%    | 0.90x | Deep sleep, maximum noise filtering |
| 🍃 Zen       | 80%    | 72%    | 0.95x | Meditation/relaxation, balanced     |
| 🧘 Relax     | 70%    | 60%    | 1.00x | Light relaxation, close to original |

### Custom Presets

You can save your own settings:

1. Adjust sliders to your preferred settings
2. Click the **"+ Save Current"** button
3. Enter a preset name
4. Presets are automatically saved and available next time

To delete a custom preset, click the **×** button next to it.

## ⏰ Sleep Timer

- **Off** - Timer disabled
- **15m / 30m / 1h / 2h** - Automatically fade out and pause video after set time

## 🔧 Other Features

- **Mute Ads**: Automatically detects and mutes YouTube ads
- **Comfort Noise**: Plays gentle pink noise during silence

## ❓ FAQ

**Q: Why doesn't clicking the icon do anything?**
A: Make sure you're on the YouTube website. This extension only works on youtube.com.

**Q: Why isn't the sound changing?**
A: Ensure the "Sleep Mode" toggle is turned on (shows as purple).

**Q: How do I update the extension?**
A: Download the latest version, then click the refresh button for the extension on the `chrome://extensions/` page.
