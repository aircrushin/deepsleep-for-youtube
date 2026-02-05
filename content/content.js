// DeepSleep Tube - Content Script
// Real-time audio processing for YouTube

class DeepSleepAudio {
  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.compressorNode = null;
    this.lowpassFilter = null;
    this.gainNode = null;
    this.volumeGainNode = null;
    this.pinkNoiseNode = null;
    this.pinkNoiseGain = null;
    this.videoElement = null;
    this.isProcessing = false;
    this.spikesSuppressed = 0;
    this.lastPeakTime = 0;
    
    this.settings = {
      enabled: false,
      safety: 70,
      warmth: 60,
      speed: 100,
      volumeDb: 0,
      adMute: true,
      comfortNoise: false,
      timerMinutes: 0
    };
    
    this.timerEndTime = null;
    this.fadeInterval = null;
    
    this.init();
  }
  
  async init() {
    await this.loadSettings();
    this.observeVideo();
    this.observeAds();
    this.listenForMessages();
  }
  
  async loadSettings() {
    try {
      const stored = await chrome.storage.local.get('deepsleepSettings');
      if (stored.deepsleepSettings) {
        this.settings = { ...this.settings, ...stored.deepsleepSettings };
      }
    } catch (e) {
      console.log('DeepSleep: Could not load settings');
    }
  }
  
  listenForMessages() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATE') {
        this.settings = message.settings;
        this.applySettings();
        this.updateTimer();
      } else if (message.type === 'GET_STATS') {
        sendResponse({ spikesSuppressed: this.spikesSuppressed });
      }
      return true;
    });
  }
  
  observeVideo() {
    const findAndAttach = () => {
      const video = document.querySelector('video.html5-main-video');
      if (video && video !== this.videoElement) {
        this.videoElement = video;
        if (this.settings.enabled) {
          this.attachAudioProcessing();
        }
      }
    };
    
    findAndAttach();
    
    const observer = new MutationObserver(findAndAttach);
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also check periodically for SPA navigation
    setInterval(findAndAttach, 2000);
  }
  
  observeAds() {
    const checkForAds = () => {
      const isAdPlaying = document.querySelector('.ad-showing') !== null ||
                          document.querySelector('.ytp-ad-player-overlay') !== null;
      
      if (isAdPlaying && this.settings.adMute && this.gainNode) {
        this.gainNode.gain.setTargetAtTime(0.1, this.audioContext.currentTime, 0.1);
      } else if (!isAdPlaying && this.gainNode && this.settings.enabled) {
        this.gainNode.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.1);
      }
    };
    
    const observer = new MutationObserver(checkForAds);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
    setInterval(checkForAds, 500);
  }
  
  attachAudioProcessing() {
    if (this.isProcessing || !this.videoElement) return;
    
    try {
      // Create AudioContext
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create source from video element
      this.sourceNode = this.audioContext.createMediaElementSource(this.videoElement);
      
      // Create DynamicsCompressor for spike suppression
      this.compressorNode = this.audioContext.createDynamicsCompressor();
      
      // Create LowPass Filter for warmth
      this.lowpassFilter = this.audioContext.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      
      // Create Gain node for fade/ad mute control
      this.gainNode = this.audioContext.createGain();
      
      // Create Volume Gain node for dB volume control
      this.volumeGainNode = this.audioContext.createGain();
      
      // Create pink noise for comfort noise
      this.createPinkNoise();
      
      // Connect the audio graph
      this.sourceNode.connect(this.compressorNode);
      this.compressorNode.connect(this.lowpassFilter);
      this.lowpassFilter.connect(this.gainNode);
      this.gainNode.connect(this.volumeGainNode);
      this.volumeGainNode.connect(this.audioContext.destination);
      
      // Apply current settings
      this.applySettings();
      
      // Monitor for spikes
      this.monitorSpikes();
      
      this.isProcessing = true;
      console.log('DeepSleep: Audio processing attached');
      
      this.injectMoonIcon();
      
    } catch (e) {
      console.error('DeepSleep: Error attaching audio processing', e);
    }
  }
  
  detachAudioProcessing() {
    if (!this.isProcessing) return;
    
    try {
      // Bypass: connect source directly to destination
      if (this.sourceNode && this.audioContext) {
        this.sourceNode.disconnect();
        this.sourceNode.connect(this.audioContext.destination);
      }
      
      // Mute pink noise
      if (this.pinkNoiseGain) {
        this.pinkNoiseGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      }
      
      // Reset video playback rate
      if (this.videoElement) {
        this.videoElement.playbackRate = 1.0;
      }
      
      // Remove moon icon
      const moonBtn = document.getElementById('deepsleep-moon');
      if (moonBtn) {
        moonBtn.remove();
      }
      
      this.isProcessing = false;
      console.log('DeepSleep: Audio processing detached');
    } catch (e) {
      console.error('DeepSleep: Error detaching', e);
    }
  }
  
  reattachAudioProcessing() {
    if (this.isProcessing || !this.sourceNode || !this.audioContext) return;
    
    try {
      // Reconnect through processing chain
      this.sourceNode.disconnect();
      this.sourceNode.connect(this.compressorNode);
      
      this.isProcessing = true;
      this.applySettings();
      this.injectMoonIcon();
      
      console.log('DeepSleep: Audio processing reattached');
    } catch (e) {
      console.error('DeepSleep: Error reattaching', e);
    }
  }
  
  createPinkNoise() {
    const bufferSize = 4096;
    this.pinkNoiseGain = this.audioContext.createGain();
    this.pinkNoiseGain.gain.value = 0;
    
    // Pink noise using Voss-McCartney algorithm
    const scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    scriptProcessor.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
        b6 = white * 0.115926;
      }
    };
    
    scriptProcessor.connect(this.pinkNoiseGain);
    this.pinkNoiseGain.connect(this.audioContext.destination);
    this.pinkNoiseNode = scriptProcessor;
  }
  
  applySettings() {
    if (!this.audioContext) return;
    
    const currentTime = this.audioContext.currentTime;
    
    // Safety/Compression settings (0-100 -> threshold -50 to -10 dB)
    const threshold = -50 + (this.settings.safety * 0.4); // -50 to -10
    const ratio = 4 + (this.settings.safety * 0.16); // 4:1 to 20:1
    const attack = 0.001 + (0.004 * (100 - this.settings.safety) / 100); // 1ms to 5ms
    const release = 0.05 + (0.2 * (100 - this.settings.safety) / 100); // 50ms to 250ms
    
    this.compressorNode.threshold.setValueAtTime(threshold, currentTime);
    this.compressorNode.ratio.setValueAtTime(ratio, currentTime);
    this.compressorNode.attack.setValueAtTime(attack, currentTime);
    this.compressorNode.release.setValueAtTime(release, currentTime);
    this.compressorNode.knee.setValueAtTime(10, currentTime);
    
    // Warmth/LowPass settings (0-100 -> 8000Hz to 2000Hz)
    const frequency = 8000 - (this.settings.warmth * 60); // 8000Hz to 2000Hz
    this.lowpassFilter.frequency.setValueAtTime(frequency, currentTime);
    this.lowpassFilter.Q.setValueAtTime(0.7, currentTime);
    
    // Speed/Playback rate
    if (this.videoElement) {
      this.videoElement.playbackRate = this.settings.speed / 100;
    }
    
    // Comfort noise
    if (this.pinkNoiseGain) {
      const noiseGain = this.settings.comfortNoise ? 0.02 : 0;
      this.pinkNoiseGain.gain.setValueAtTime(noiseGain, currentTime);
    }
    
    // Volume control (dB to linear gain)
    if (this.volumeGainNode) {
      const linearGain = Math.pow(10, this.settings.volumeDb / 20);
      this.volumeGainNode.gain.setValueAtTime(linearGain, currentTime);
    }
    
    // Handle enable/disable
    if (this.settings.enabled && !this.isProcessing) {
      // Try reattach first (if nodes exist), otherwise full attach
      if (this.sourceNode && this.compressorNode) {
        this.reattachAudioProcessing();
      } else {
        this.attachAudioProcessing();
      }
    } else if (!this.settings.enabled && this.isProcessing) {
      this.detachAudioProcessing();
    }
  }
  
  updateTimer() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    
    if (this.settings.timerMinutes > 0) {
      this.timerEndTime = Date.now() + (this.settings.timerMinutes * 60 * 1000);
      this.startTimerCheck();
    } else {
      this.timerEndTime = null;
      if (this.gainNode && this.settings.enabled) {
        this.gainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
      }
    }
  }
  
  startTimerCheck() {
    const checkTimer = () => {
      if (!this.timerEndTime) return;
      
      const remaining = this.timerEndTime - Date.now();
      
      // Start 2-minute fade when 2 minutes remain
      if (remaining <= 120000 && remaining > 0 && !this.fadeInterval) {
        this.startFadeOut(remaining);
      }
      
      if (remaining <= 0) {
        // Timer ended - pause video
        if (this.videoElement) {
          this.videoElement.pause();
        }
        this.timerEndTime = null;
      }
    };
    
    setInterval(checkTimer, 1000);
    checkTimer();
  }
  
  startFadeOut(duration) {
    if (!this.gainNode) return;
    
    const startGain = this.gainNode.gain.value;
    const fadeSteps = 60; // Smooth fade over many steps
    const stepDuration = duration / fadeSteps;
    let step = 0;
    
    this.fadeInterval = setInterval(() => {
      step++;
      const progress = step / fadeSteps;
      const newGain = startGain * (1 - progress);
      
      if (this.gainNode && this.audioContext) {
        this.gainNode.gain.setValueAtTime(Math.max(0, newGain), this.audioContext.currentTime);
      }
      
      if (step >= fadeSteps) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
      }
    }, stepDuration);
  }
  
  monitorSpikes() {
    if (!this.compressorNode) return;
    
    const checkCompression = () => {
      if (!this.compressorNode || !this.isProcessing) return;
      
      const reduction = this.compressorNode.reduction;
      const now = Date.now();
      
      // If compression exceeds -6dB and it's been at least 500ms since last spike
      if (reduction < -6 && now - this.lastPeakTime > 500) {
        this.spikesSuppressed++;
        this.lastPeakTime = now;
        this.updateMoonIcon();
      }
      
      requestAnimationFrame(checkCompression);
    };
    
    checkCompression();
  }
  
  injectMoonIcon() {
    if (document.getElementById('deepsleep-moon')) return;
    
    const playerControls = document.querySelector('.ytp-right-controls');
    if (!playerControls) return;
    
    const moonButton = document.createElement('button');
    moonButton.id = 'deepsleep-moon';
    moonButton.className = 'ytp-button deepsleep-moon-btn';
    moonButton.innerHTML = '🌙';
    moonButton.title = 'DeepSleep Active';
    
    const tooltip = document.createElement('div');
    tooltip.className = 'deepsleep-tooltip';
    tooltip.id = 'deepsleep-tooltip';
    tooltip.textContent = '0 spikes suppressed';
    moonButton.appendChild(tooltip);
    
    playerControls.insertBefore(moonButton, playerControls.firstChild);
    
    moonButton.addEventListener('mouseenter', () => {
      tooltip.style.opacity = '1';
    });
    
    moonButton.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
    });
  }
  
  updateMoonIcon() {
    const tooltip = document.getElementById('deepsleep-tooltip');
    if (tooltip) {
      tooltip.textContent = `${this.spikesSuppressed} spikes suppressed`;
    }
  }
}

// Initialize
const deepSleep = new DeepSleepAudio();
