const Audio = {
    ctx: null,
    bgmPlaying: false,
    bgmOsc: null,
    bgmGain: null,

    init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },

    ensure() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    playTone(freq, duration, type, volume) {
        this.ensure();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume || 0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playFold() {
        this.playTone(440, 0.15, 'triangle', 0.08);
        setTimeout(() => this.playTone(554, 0.1, 'triangle', 0.06), 80);
    },

    playMove() {
        this.playTone(330, 0.08, 'sine', 0.04);
    },

    playComplete() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((n, i) => {
            setTimeout(() => this.playTone(n, 0.3, 'sine', 0.08), i * 120);
        });
    },

    playClick() {
        this.playTone(800, 0.05, 'square', 0.03);
    },

    startBGM() {
        if (this.bgmPlaying) return;
        this.ensure();
        this.bgmPlaying = true;
        this._playBGMLoop();
    },

    _playBGMLoop() {
        if (!this.bgmPlaying) return;
        const notes = [262, 294, 330, 349, 392, 440, 494, 523];
        const melody = [0, 2, 4, 5, 4, 2, 3, 1];
        let i = 0;
        const playNext = () => {
            if (!this.bgmPlaying) return;
            const note = notes[melody[i % melody.length]];
            this.playTone(note, 1.5, 'sine', 0.02);
            i++;
            if (i < 32) {
                setTimeout(playNext, 2000);
            } else {
                setTimeout(() => this._playBGMLoop(), 2000);
            }
        };
        playNext();
    },

    stopBGM() {
        this.bgmPlaying = false;
    }
};
