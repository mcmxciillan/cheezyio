export class AudioManager {
    private ctx: AudioContext;
    private masterGain: GainNode;
    private bgmGain: GainNode;
    private sfxGain: GainNode;
    
    private static instance: AudioManager;
    
    private boostOsc: OscillatorNode | null = null;
    private boostGain: GainNode | null = null;
    
    private bgmSource: AudioBufferSourceNode | null = null;
    private bgmBuffer: AudioBuffer | null = null;
    
    public isMusicMuted: boolean = false;
    public isSFXMuted: boolean = false;

    private constructor() {
        // Initialize AudioContext
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        this.ctx = new AudioContextClass();
        
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
        
        // Create Channels
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.3; // Default Music Volume
        this.bgmGain.connect(this.masterGain);
        
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.6; // Default SFX Volume
        this.sfxGain.connect(this.masterGain);
    }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    public resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    // --- Music System ---
    
    public async loadAndPlayMusic(url: string) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`Failed to fetch music: ${response.status} ${response.statusText}`);
                return;
            }
            const arrayBuffer = await response.arrayBuffer();
            this.bgmBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.playMusic();
        } catch {
        console.warn('Audio playback failed (interaction needed)');
      }  }
    
    public playMusic() {
        if (!this.bgmBuffer) return;
        this.resume();
        
        // Stop existing if any (to prevent overlap usually, though we want loop)
        if (this.bgmSource) {
            try { this.bgmSource.stop(); } catch {}
        }
        
        this.bgmSource = this.ctx.createBufferSource();
        this.bgmSource.buffer = this.bgmBuffer;
        this.bgmSource.loop = true;
        this.bgmSource.connect(this.bgmGain);
        this.bgmSource.start(0);
    }
    
    public toggleMusic(): boolean {
        this.isMusicMuted = !this.isMusicMuted;
        const target = this.isMusicMuted ? 0 : 0.3;
        this.bgmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
        return this.isMusicMuted;
    }

    public toggleSFX(): boolean {
        this.isSFXMuted = !this.isSFXMuted;
        const target = this.isSFXMuted ? 0 : 0.6;
        this.sfxGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
        return this.isSFXMuted;
    }

    // --- SFX System ---

    // 1. Pop Sound (Eating Cheese)
    public playPop() {
        if (this.isSFXMuted) return; // Optimization
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const freq = 600 + Math.random() * 200; 
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain); // Connect to SFX channel

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    // 2. Kill Sound (Eating Player)
    public playKill() {
        if (this.isSFXMuted) return;
        this.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    // 3. Death Sound (Explosion)
    public playDie() {
        if (this.isSFXMuted) return;
        this.resume();
        const bufferSize = this.ctx.sampleRate * 1.0; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start();
        noise.stop(this.ctx.currentTime + 1.0);
    }

    // 4. Boost Loop
    public startBoost() {
        if (this.isSFXMuted && this.boostOsc) {
            // keep silent
        }
        this.resume();
        if (this.boostOsc) return; 

        this.boostOsc = this.ctx.createOscillator();
        this.boostGain = this.ctx.createGain();

        this.boostOsc.type = 'square';
        this.boostOsc.frequency.setValueAtTime(80, this.ctx.currentTime);

        this.boostGain.gain.setValueAtTime(0.05, this.ctx.currentTime); 
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        this.boostOsc.connect(filter);
        filter.connect(this.boostGain);
        this.boostGain.connect(this.sfxGain); // Connect to SFX

        this.boostOsc.start();
    }

    public stopBoost() {
        if (this.boostOsc) {
            this.boostGain?.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
            this.boostOsc.stop(this.ctx.currentTime + 0.1);
            this.boostOsc = null;
            this.boostGain = null;
        }
    }
}
