/**
 * Wesak Kalapaya - Spatial Audio Synthesizer
 * Procedurally generates realistic, meditative ambient soundscapes using the Web Audio API.
 * No external file downloads required, completely offline-capable.
 */

import { gsap } from 'gsap';

export class WesakAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.initialized = false;
    this.volumeSetting = 0.5;

    // Synthesizer nodes
    this.windNode = null;
    this.windGain = null;
    this.chantNode = null;
    this.chantGain = null;
    this.cricketGain = null;
    this.waterGain = null;
    
    // HTML5 Temple Audio (Real Chant Stream)
    this.templeAudio = null;
    this.viriduAudio = null; // Viridu audio track for the Thoranas
    
    // Track intervals for scheduler
    this.bellInterval = null;
    
    // Active scene mixing configuration
    this.currentScene = -1;
  }

  // MUST be called on user click/interaction due to browser autoplay policies
  async init() {
    if (this.initialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Master volume node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volumeSetting, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Create real temple chanting audio track (using the new local audio)
      this.templeAudio = new Audio('/Sakala_Sathama_Bodu_Bathiyen_Mohideen_Beg_Sarigama_lk.mp3');
      this.templeAudio.crossOrigin = "anonymous";
      this.templeAudio.loop = true;
      this.templeAudio.volume = 0; // starts silent, fades in smoothly

      // Play the temple chanting audio (safely within user-interaction thread)
      this.templeAudio.play().catch(err => {
        console.warn("Autoplay block or loading delay for temple audio:", err);
      });

      // Create Viridu audio track (pre-loaded in click thread to prevent autoplay blocks)
      this.viriduAudio = new Audio('/Seewali Maha Rahathan Wahansege Jeewitha Kathawa Viridu Bana - M V Gunadasa.mp3');
      this.viriduAudio.crossOrigin = "anonymous";
      this.viriduAudio.loop = true;
      this.viriduAudio.volume = 0;

      // Play and immediately pause viriduAudio to unlock it on all modern browsers
      this.viriduAudio.play().then(() => {
        this.viriduAudio.pause();
      }).catch(err => {
        console.warn("Autoplay unlock for viridu failed:", err);
      });

      // Initialize sound layers (disabled procedural synthesizers to keep only Karaniya Metta MP3)
      // this.setupWindGenerator();
      // this.setupChantHumGenerator();
      // this.setupCricketGenerator();
      // this.setupWaterGenerator();
      // this.startBellScheduler();

      this.initialized = true;
      this.updateScene(0); // Start with scene 1 mix

      // Resume context if suspended
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
    } catch (e) {
      console.error("Web Audio API failed to initialize", e);
    }
  }

  // Master mute toggle
  toggleMute() {
    if (!this.initialized) return false;
    this.isMuted = !this.isMuted;
    
    const targetGain = this.isMuted ? 0 : this.volumeSetting;
    this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.2);
    
    if (this.isMuted) {
      if (this.templeAudio) {
        gsap.to(this.templeAudio, {
          volume: 0,
          duration: 0.3,
          onComplete: () => {
            if (this.templeAudio) this.templeAudio.pause();
          }
        });
      }
      if (this.viriduAudio) {
        gsap.to(this.viriduAudio, {
          volume: 0,
          duration: 0.3,
          onComplete: () => {
            if (this.viriduAudio) this.viriduAudio.pause();
          }
        });
      }
    } else {
      // Resume whatever track should be playing based on current scene
      const isThoranaActive = (this.currentScene === 2 || this.currentScene === 3);
      if (isThoranaActive) {
        if (this.viriduAudio) {
          this.viriduAudio.play().catch(() => {});
          this.updateAudioVolume();
        }
      } else {
        if (this.templeAudio) {
          this.templeAudio.play().catch(() => {});
          this.updateAudioVolume();
        }
      }
    }
    return this.isMuted;
  }

  // Master volume control
  setVolume(volume) {
    this.volumeSetting = Math.max(0, Math.min(1, volume));
    if (!this.initialized) return;
    this.masterGain.gain.setTargetAtTime(this.volumeSetting * (this.isMuted ? 0 : 1), this.ctx.currentTime, 0.1);
    this.updateAudioVolume(true); // instant update when dragging volume slider
  }

  // Updates audio track volumes with GSAP transitions based on active scene factors
  updateAudioVolume(instant = false) {
    if (this.isMuted) {
      if (this.templeAudio) {
        gsap.killTweensOf(this.templeAudio);
        this.templeAudio.volume = 0;
      }
      if (this.viriduAudio) {
        gsap.killTweensOf(this.viriduAudio);
        this.viriduAudio.volume = 0;
      }
      return;
    }

    // Determine target volumes
    let bgSceneFactor = 0.25; // default bg factor
    let viriduSceneFactor = 0.0;

    const isThoranaActive = (this.currentScene === 2 || this.currentScene === 3);

    if (isThoranaActive) {
      bgSceneFactor = 0.0; // bg song is stopped/paused (we will pause it after volume fades)
      viriduSceneFactor = 0.90; // viridu is active
    } else {
      viriduSceneFactor = 0.0; // viridu is stopped/paused
      switch (this.currentScene) {
        case 0: bgSceneFactor = 0.25; break; // Home (distant song)
        case 1: bgSceneFactor = 0.50; break; // Lanterns (moderate)
        case 4: bgSceneFactor = 0.85; break; // Thuparamaya (clearer)
        case 5: bgSceneFactor = 0.85; break; // Sri Maha Bodhi (clearer)
      }
    }

    const targetBgVol = this.volumeSetting * bgSceneFactor;
    const targetViriduVol = this.volumeSetting * viriduSceneFactor;

    // Fade and handle play/pause transitions for Temple Audio
    if (this.templeAudio) {
      if (bgSceneFactor > 0) {
        this.templeAudio.play().catch(() => {});
        if (instant) {
          gsap.killTweensOf(this.templeAudio);
          this.templeAudio.volume = targetBgVol;
        } else {
          gsap.to(this.templeAudio, {
            volume: targetBgVol,
            duration: 1.2,
            overwrite: "auto"
          });
        }
      } else {
        if (instant) {
          gsap.killTweensOf(this.templeAudio);
          this.templeAudio.volume = 0;
          if (isThoranaActive) this.templeAudio.pause();
        } else {
          gsap.to(this.templeAudio, {
            volume: 0,
            duration: 1.0,
            overwrite: "auto",
            onComplete: () => {
              if (this.currentScene === 2 || this.currentScene === 3) {
                if (this.templeAudio) this.templeAudio.pause();
              }
            }
          });
        }
      }
    }

    // Fade and handle play/pause transitions for Viridu Audio
    if (this.viriduAudio) {
      if (viriduSceneFactor > 0) {
        this.viriduAudio.play().catch(() => {});
        if (instant) {
          gsap.killTweensOf(this.viriduAudio);
          this.viriduAudio.volume = targetViriduVol;
        } else {
          gsap.to(this.viriduAudio, {
            volume: targetViriduVol,
            duration: 1.2,
            overwrite: "auto"
          });
        }
      } else {
        if (instant) {
          gsap.killTweensOf(this.viriduAudio);
          this.viriduAudio.volume = 0;
          if (!isThoranaActive) this.viriduAudio.pause();
        } else {
          gsap.to(this.viriduAudio, {
            volume: 0,
            duration: 1.0,
            overwrite: "auto",
            onComplete: () => {
              if (this.currentScene !== 2 && this.currentScene !== 3) {
                if (this.viriduAudio) this.viriduAudio.pause();
              }
            }
          });
        }
      }
    }
  }

  // Procedural Wind Generator (Filtered White Noise)
  setupWindGenerator() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Populate white noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to make it sound like wind
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    // Wind volume
    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    
    whiteNoise.start();

    // LFO to slowly modulate wind frequency and gain (creating gusts)
    const lfo1 = this.ctx.createOscillator();
    lfo1.frequency.setValueAtTime(0.08, this.ctx.currentTime); // very slow
    const lfoGain1 = this.ctx.createGain();
    lfoGain1.gain.setValueAtTime(250, this.ctx.currentTime); // frequency variation range

    const lfo2 = this.ctx.createOscillator();
    lfo2.frequency.setValueAtTime(0.05, this.ctx.currentTime);
    const lfoGain2 = this.ctx.createGain();
    lfoGain2.gain.setValueAtTime(0.06, this.ctx.currentTime); // gain variation range

    lfo1.connect(lfoGain1);
    lfoGain1.connect(filter.frequency); // sweeps filter frequency

    lfo2.connect(lfoGain2);
    lfoGain2.connect(this.windGain.gain); // sweeps volume

    lfo1.start();
    lfo2.start();
  }

  // Procedural Chanting Hum Generator
  // Synthesizes a deep Buddhist monk drone/hum (approx 98Hz pitch with vocal format filters)
  setupChantHumGenerator() {
    this.chantGain = this.ctx.createGain();
    this.chantGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // starts quiet
    this.chantGain.connect(this.masterGain);

    // Low octave pitch oscillators (sawtooth & triangle for rich harmonics)
    const pitches = [98, 147, 196]; // G2, D3, G3
    pitches.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.detune.setValueAtTime(Math.sin(idx) * 8, this.ctx.currentTime); // detune for chorus thickness

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.08 / pitches.length, this.ctx.currentTime);

      // Resonant vocal formant filter to create "Oooommm" vocal sound
      const formantFilter = this.ctx.createBiquadFilter();
      formantFilter.type = 'bandpass';
      formantFilter.frequency.setValueAtTime(150, this.ctx.currentTime); // vocal formant vowel F1
      formantFilter.Q.setValueAtTime(8, this.ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(formantFilter);
      formantFilter.connect(this.chantGain);
      osc.start();

      // Formant LFO sweep to simulate breathing/chanting wave
      const formantLfo = this.ctx.createOscillator();
      formantLfo.frequency.setValueAtTime(0.1 + idx * 0.05, this.ctx.currentTime);
      const formantLfoGain = this.ctx.createGain();
      formantLfoGain.gain.setValueAtTime(40, this.ctx.currentTime);

      formantLfo.connect(formantLfoGain);
      formantLfoGain.connect(formantFilter.frequency);
      formantLfo.start();
    });
  }

  // Procedural Temple Bell Synthesizer (Metallic Harmonic Spectrum)
  triggerBell(freq = 180, volume = 0.5) {
    if (!this.initialized || this.isMuted) return;

    const t = this.ctx.currentTime;
    const bellGain = this.ctx.createGain();
    bellGain.gain.setValueAtTime(0, t);
    bellGain.gain.linearRampToValueAtTime(volume * 0.45, t + 0.02); // rapid attack
    bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 8.0); // long decay
    bellGain.connect(this.masterGain);

    // Harmonic ratios for metallic bell sound (based on bell physics)
    const partials = [
      { ratio: 1.0, gain: 1.0, detune: 0 },
      { ratio: 1.5, gain: 0.65, detune: 5 },
      { ratio: 2.0, gain: 0.4, detune: -5 },
      { ratio: 2.4, gain: 0.35, detune: 10 },
      { ratio: 3.1, gain: 0.2, detune: -15 },
      { ratio: 4.2, gain: 0.15, detune: 20 },
      { ratio: 5.4, gain: 0.08, detune: -30 }
    ];

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * p.ratio, t);
      osc.detune.setValueAtTime(p.detune, t);

      const pGain = this.ctx.createGain();
      // higher partials decay faster
      pGain.gain.setValueAtTime(p.gain, t);
      pGain.gain.exponentialRampToValueAtTime(0.0001, t + (8.0 / p.ratio));

      osc.connect(pGain);
      pGain.connect(bellGain);
      osc.start(t);
      osc.stop(t + 9.0);
    });

    // Sub-bass hum for bell body resonance (deep temple bell feel)
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 0.5, t);
    
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + 6.0);

    subOsc.connect(subGain);
    subGain.connect(bellGain);
    subOsc.start(t);
    subOsc.stop(t + 7.0);
  }

  // Procedural Cricket hum for Bodhiya Courtyard scene
  setupCricketGenerator() {
    this.cricketGain = this.ctx.createGain();
    this.cricketGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // starts quiet
    this.cricketGain.connect(this.masterGain);

    // Chirping synthesis (High pitch bandpassed pulses)
    const cricketOsc = this.ctx.createOscillator();
    cricketOsc.type = 'sine';
    cricketOsc.frequency.setValueAtTime(4500, this.ctx.currentTime);

    // Chirp amplitude modulator (pulse)
    const chirpMod = this.ctx.createOscillator();
    chirpMod.frequency.setValueAtTime(25, this.ctx.currentTime); // 25Hz vibration
    chirpMod.type = 'sawtooth';

    const chirpModGain = this.ctx.createGain();
    chirpModGain.gain.setValueAtTime(0.05, this.ctx.currentTime);

    // Filter to limit high frequencies
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4500, this.ctx.currentTime);
    filter.Q.setValueAtTime(5, this.ctx.currentTime);

    cricketOsc.connect(filter);
    filter.connect(this.cricketGain);

    // Slowly turn chirp volume up/down to represent pulsing nature
    const chirpGate = this.ctx.createOscillator();
    chirpGate.frequency.setValueAtTime(0.4, this.ctx.currentTime); // pulses every 2.5 seconds
    const gateGain = this.ctx.createGain();
    gateGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

    chirpGate.connect(gateGain);
    gateGain.connect(this.cricketGain.gain);

    cricketOsc.start();
    chirpMod.start();
    chirpGate.start();
  }

  // Procedural Water Ripple/Lapping Generator
  setupWaterGenerator() {
    const bufferSize = 4 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Pink noise approximation for soft water sounds
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      let white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // normalization
      b6 = white * 0.115926;
    }

    const waterNoise = this.ctx.createBufferSource();
    waterNoise.buffer = noiseBuffer;
    waterNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, this.ctx.currentTime); // muffled bassy lapping

    this.waterGain = this.ctx.createGain();
    this.waterGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // starts silent

    waterNoise.connect(filter);
    filter.connect(this.waterGain);
    this.waterGain.connect(this.masterGain);

    waterNoise.start();

    // Slow wave modulator
    const waveLfo = this.ctx.createOscillator();
    waveLfo.frequency.setValueAtTime(0.15, this.ctx.currentTime); // 6 second wave cycle
    const waveGain = this.ctx.createGain();
    waveGain.gain.setValueAtTime(80, this.ctx.currentTime); // sweeps lowpass frequency
    
    const waveVolGain = this.ctx.createGain();
    waveVolGain.gain.setValueAtTime(0.04, this.ctx.currentTime); // sweeps volume

    waveLfo.connect(waveGain);
    waveGain.connect(filter.frequency);

    waveLfo.connect(waveVolGain);
    waveVolGain.connect(this.waterGain.gain);

    waveLfo.start();
  }

  // Periodic slow temple bell scheduler
  startBellScheduler() {
    // Schedule a random temple bell every 12 to 18 seconds
    const scheduleNextBell = () => {
      const delay = (12 + Math.random() * 8) * 1000;
      this.bellInterval = setTimeout(() => {
        // Alternating pitch (120Hz deep, 170Hz medium, 230Hz light)
        const pitches = [110, 160, 220];
        const randomPitch = pitches[Math.floor(Math.random() * pitches.length)];
        this.triggerBell(randomPitch, 0.45);
        scheduleNextBell();
      }, delay);
    };

    scheduleNextBell();
  }

  // Updates mixing parameters based on scroll scene progress
  updateScene(sceneIndex) {
    if (!this.initialized) return;
    if (this.currentScene === sceneIndex) return;

    this.currentScene = sceneIndex;

    // Cross-fade the real chanting and viridu audio volumes
    this.updateAudioVolume();
  }

  // Cleanup on destroy
  destroy() {
    if (this.bellInterval) clearTimeout(this.bellInterval);
    if (this.templeAudio) {
      this.templeAudio.pause();
      this.templeAudio = null;
    }
    if (this.viriduAudio) {
      this.viriduAudio.pause();
      this.viriduAudio = null;
    }
    if (this.ctx) this.ctx.close();
  }
}
