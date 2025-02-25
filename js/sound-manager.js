/**
 * Game Boy Sound Manager
 * Creates authentic 8-bit Game Boy sound effects using Tone.js
 */
class GameBoySound {
    constructor() {
        // Sound state
        this.enabled = true;
        this.initialized = false;
        
        // Try to initialize
        this.init();
        
        // Make available globally
        window.gbSound = this;
    }
    
    /**
     * Initialize sound synths
     */
    init() {
        try {
            // Game Boy has 4 sound channels:
            // 1. Square wave with sweep (Pulse 1)
            // 2. Square wave (Pulse 2)
            // 3. 4-bit PCM wave (Wave)
            // 4. Noise

            // Create Square Wave synths (for melody/effects)
            this.pulse1 = new Tone.Synth({
                oscillator: {
                    type: "square"
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.1,
                    sustain: 0.3,
                    release: 0.1
                }
            }).toDestination();
            this.pulse1.volume.value = -10;
            
            this.pulse2 = new Tone.Synth({
                oscillator: {
                    type: "square"
                },
                envelope: {
                    attack: 0.01,
                    decay: 0.1,
                    sustain: 0.3,
                    release: 0.1
                }
            }).toDestination();
            this.pulse2.volume.value = -12;
            
            // Create noise generator (for percussive effects)
            this.noise = new Tone.NoiseSynth({
                noise: {
                    type: "white"
                },
                envelope: {
                    attack: 0.005,
                    decay: 0.1,
                    sustain: 0,
                    release: 0.1
                }
            }).toDestination();
            this.noise.volume.value = -15;
            
            // Low pass filter to make noise more "8-bit" like
            this.filter = new Tone.Filter({
                type: "lowpass",
                frequency: 1000
            }).toDestination();
            this.noise.connect(this.filter);
            
            // We're good to go!
            this.initialized = true;
            console.log("🎮 Game Boy sound initialized");
            
        } catch (error) {
            console.error("⚠️ Could not initialize Game Boy sound:", error);
            this.initialized = false;
        }
    }
    
    /**
     * Ensure audio context is running
     * Must be called from a user interaction
     */
    ensureAudioContext() {
        if (Tone.context.state !== "running") {
            Tone.context.resume();
        }
    }
    
    /**
     * Play a Game Boy sound effect
     * @param {string} soundName - Name of the sound to play
     */
    play(soundName) {
        // No sound if disabled or not initialized
        if (!this.enabled || !this.initialized) return;
        
        // Ensure audio context is running
        this.ensureAudioContext();
        
        // Play the requested sound
        switch(soundName) {
            case "startup":
                this.playStartupSound();
                break;
            case "move":
                this.playMoveSound();
                break;
            case "eat":
                this.playEatSound();
                break;
            case "levelUp":
                this.playLevelUpSound();
                break;
            case "gameOver":
                this.playGameOverSound();
                break;
            case "pause":
                this.playPauseSound();
                break;
            case "resume":
                this.playResumeSound();
                break;
            case "button":
                this.playButtonSound();
                break;
            case "select":
                this.playSelectSound();
                break;
            case "menu":
                this.playMenuSound();
                break;
            case "powerup":
                this.playPowerupSound();
                break;
            case "secret":
                this.playSecretSound();
                break;
            case "hit":
                this.playHitSound();
                break;
            default:
                console.warn(`Unknown sound: ${soundName}`);
        }
    }
    
    /**
     * Toggle sound on/off
     * @returns {boolean} New sound state
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    /**
     * Classic Game Boy startup sound
     */
    playStartupSound() {
        // Game Boy startup "ding" sound
        this.pulse1.triggerAttackRelease("G4", "16n", Tone.now());
        this.pulse1.triggerAttackRelease("C5", "16n", Tone.now() + 0.1);
        this.pulse1.triggerAttackRelease("E5", "16n", Tone.now() + 0.2);
        this.pulse1.triggerAttackRelease("G5", "8n", Tone.now() + 0.3);
        this.pulse1.triggerAttackRelease("C6", "4n", Tone.now() + 0.5);
    }
    
    /**
     * Snake movement sound
     */
    playMoveSound() {
        // Short tick sound
        this.pulse2.triggerAttackRelease("C7", "32n", undefined, 0.1);
    }
    
    /**
     * Food collection sound
     */
    playEatSound() {
        // Coin-like sound
        this.pulse1.triggerAttackRelease("G5", "16n", Tone.now());
        this.pulse1.triggerAttackRelease("C6", "8n", Tone.now() + 0.08);
    }
    
    /**
     * Level up sound
     */
    playLevelUpSound() {
        // Ascending melody
        this.pulse1.triggerAttackRelease("C5", "16n", Tone.now());
        this.pulse1.triggerAttackRelease("E5", "16n", Tone.now() + 0.1);
        this.pulse1.triggerAttackRelease("G5", "16n", Tone.now() + 0.2);
        this.pulse1.triggerAttackRelease("C6", "8n", Tone.now() + 0.3);
    }
    
    /**
     * Game over sound
     */
    playGameOverSound() {
        // Descending melody
        this.pulse1.triggerAttackRelease("G4", "8n", Tone.now());
        this.pulse1.triggerAttackRelease("E4", "8n", Tone.now() + 0.2);
        this.pulse1.triggerAttackRelease("C4", "4n", Tone.now() + 0.4);
        
        // Add noise burst
        this.noise.triggerAttackRelease("8n", Tone.now() + 0.6);
    }
    
    /**
     * Pause sound
     */
    playPauseSound() {
        // Two tones going up
        this.pulse2.triggerAttackRelease("C5", "16n", Tone.now());
        this.pulse2.triggerAttackRelease("G5", "16n", Tone.now() + 0.1);
    }
    
    /**
     * Resume sound
     */
    playResumeSound() {
        // Two tones going down
        this.pulse2.triggerAttackRelease("G5", "16n", Tone.now());
        this.pulse2.triggerAttackRelease("C5", "16n", Tone.now() + 0.1);
    }
    
    /**
     * Button press sound
     */
    playButtonSound() {
        // Basic click
        this.pulse2.triggerAttackRelease("C6", "32n", undefined, 0.2);
    }
    
    /**
     * Menu selection sound
     */
    playSelectSound() {
        // Navigation sound
        this.pulse1.triggerAttackRelease("G5", "32n", Tone.now());
        this.pulse1.triggerAttackRelease("C6", "16n", Tone.now() + 0.05);
    }
    
    /**
     * Menu confirmation sound
     */
    playMenuSound() {
        // Confirmation sound
        this.pulse1.triggerAttackRelease("C6", "32n", Tone.now());
        this.pulse1.triggerAttackRelease("E6", "32n", Tone.now() + 0.05);
        this.pulse1.triggerAttackRelease("G6", "16n", Tone.now() + 0.1);
    }
    
    /**
     * Power-up collection sound
     */
    playPowerupSound() {
        // Cool power-up sound
        this.pulse1.triggerAttackRelease("G5", "32n", Tone.now());
        this.pulse1.triggerAttackRelease("C6", "32n", Tone.now() + 0.06);
        this.pulse1.triggerAttackRelease("E6", "32n", Tone.now() + 0.12);
        this.pulse1.triggerAttackRelease("G6", "8n", Tone.now() + 0.18);
    }
    
    /**
     * Secret discovery sound
     */
    playSecretSound() {
        // Special effect for secrets
        this.pulse1.triggerAttackRelease("C6", "16n", Tone.now());
        this.pulse1.triggerAttackRelease("E6", "16n", Tone.now() + 0.1);
        this.pulse1.triggerAttackRelease("G6", "16n", Tone.now() + 0.2);
        this.pulse1.triggerAttackRelease("C7", "16n", Tone.now() + 0.3);
        this.pulse1.triggerAttackRelease("G6", "16n", Tone.now() + 0.4);
        this.pulse1.triggerAttackRelease("C7", "4n", Tone.now() + 0.5);
    }
    
    /**
     * Collision or damage sound
     */
    playHitSound() {
        // Noise burst
        this.noise.triggerAttackRelease("16n");
    }
}

// Initialize the Game Boy sound system
document.addEventListener('DOMContentLoaded', () => {
    const gbSound = new GameBoySound();
    
    // Ensure sound is enabled on first user interaction
    document.body.addEventListener('click', () => {
        if (gbSound.initialized) {
            gbSound.ensureAudioContext();
        } else {
            gbSound.init();
        }
    }, { once: true });
});