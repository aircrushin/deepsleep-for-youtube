# DeepSleep Tube 🌙

An AI-enhanced auditory filter Chrome extension for YouTube, ensuring warm, interruption-free listening for sleep.

## Features

- **Smart Dynamic Range Compression (DRC)** - Suppresses sudden audio spikes (laughter, applause, loud transitions) within 5ms
- **Warmth Filter** - Low-pass filter attenuates harsh high frequencies, making voices sound "velvety"
- **Loudness Normalization** - Consistent volume across all videos
- **Pitch-Constant Speed Control** - Slow down speech (0.7x-1.0x) without audio distortion
- **Smart Fade-out** - 2-minute gradual volume decrease when sleep timer expires
- **Ad Muting** - Automatically reduces volume during YouTube ads
- **Comfort Noise** - Optional pink noise during silent gaps

## Installation

1. Clone/download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the `deepsleep-chrome` folder
6. **Add icons**: Replace placeholder icons in the `/icons` folder with 16x16, 48x48, and 128x128 PNG icons

## Usage

1. Navigate to any YouTube video
2. Click the DeepSleep Tube extension icon
3. Toggle "Sleep Mode" on
4. Choose a preset or customize:
   - **Safety**: How aggressively to suppress loud noises
   - **Warmth**: How much to soften high frequencies
   - **Speed**: Playback rate (0.7x - 1.0x)
5. Set a sleep timer if desired

## Presets

### Built-in Presets

| Preset | Safety | Warmth | Speed |
|--------|--------|--------|-------|
| Deep Sleep | 90% | 85% | 0.90x |
| Zen | 80% | 72% | 0.95x |
| Relax | 70% | 60% | 1.00x |

### Custom Presets

You can save your own presets:
1. Adjust the sliders to your preferred settings
2. Click **"+ Save Current"** in the Custom Presets section
3. Enter a name for your preset
4. Your preset will be saved and available across sessions

To delete a custom preset, click the **×** button next to it.

## Technical Details

### Audio Processing Chain

```
MediaElementAudioSourceNode (Video)
  → DynamicsCompressorNode (Spike limiting)
  → BiquadFilterNode (Low-pass warmth)
  → GainNode (Volume/Fade)
  → AudioDestinationNode (Speakers)
```

### Performance

- Processing latency: <20ms
- Minimal CPU overhead
- OLED-friendly dark UI

## Icons Required

Create PNG icons and place in `/icons`:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

## License

MIT
