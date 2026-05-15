const Audio = {
    ctx: null,
    bgmPlaying: false,
    bgmOsc: null,
    bgmGain: null,
    muted: false,

    init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },

    ensure() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    },

    playTone(freq, duration, type, volume) {
        if (this.muted) return;
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

    playCollect() {
        this.playTone(880, 0.12, 'sine', 0.07);
        setTimeout(() => this.playTone(1100, 0.15, 'sine', 0.06), 60);
    },

    playTeleport() {
        this.playTone(200, 0.2, 'sawtooth', 0.04);
        setTimeout(() => this.playTone(600, 0.15, 'sine', 0.05), 100);
    },

    playBreak() {
        this.playTone(150, 0.2, 'square', 0.06);
        setTimeout(() => this.playTone(100, 0.15, 'square', 0.04), 80);
    },

    startBGM() {
        if (this.bgmPlaying) return;
        this.ensure();
        this.bgmPlaying = true;
        this._playBGMLoop();
    },

    _getChapterMusic(chapter) {
        const configs = [
            { notes: [262, 330, 392, 440, 392, 330, 349, 294], type: 'sine', vol: 0.025, tempo: 1800 },
            { notes: [294, 349, 440, 494, 440, 349, 392, 330], type: 'sine', vol: 0.022, tempo: 2000 },
            { notes: [330, 392, 494, 523, 494, 440, 392, 349], type: 'triangle', vol: 0.02, tempo: 2200 },
            { notes: [247, 294, 349, 392, 349, 330, 294, 262], type: 'sine', vol: 0.02, tempo: 2400 },
            { notes: [220, 262, 330, 349, 330, 294, 262, 247], type: 'triangle', vol: 0.018, tempo: 2600 },
            { notes: [262, 330, 392, 523, 494, 440, 392, 330], type: 'sine', vol: 0.022, tempo: 2200 }
        ];
        return configs[chapter] || configs[0];
    },

    _playBGMLoop() {
        if (!this.bgmPlaying) return;
        const chapter = typeof Levels !== 'undefined' ? Levels.currentChapter : 0;
        const config = this._getChapterMusic(chapter);
        let i = 0;
        const playNext = () => {
            if (!this.bgmPlaying) return;
            const note = config.notes[i % config.notes.length];
            this.playTone(note, 1.5, config.type, config.vol);
            i++;
            if (i < 32) {
                setTimeout(playNext, config.tempo);
            } else {
                setTimeout(() => this._playBGMLoop(), config.tempo);
            }
        };
        playNext();
    },

    stopBGM() {
        this.bgmPlaying = false;
    }
};
