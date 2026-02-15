class EightBitEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        this.master = this.ctx.createGain();
        this.master.gain.value = 0.2;
        this.master.connect(this.ctx.destination);

        this.channels = {
            pulse1: this.createPulseChannel(),
            pulse2: this.createPulseChannel(),
            triangle: this.createTriangleChannel(),
            noise: this.createNoiseChannel()
        };
    }

    createBaseChannel(type) {
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        gain.connect(this.master);

        return {
            type,
            gain,
            osc: null,
            duty: 0.5,
            stopTime: 0
        };
    }

    createPulseChannel() {
        return this.createBaseChannel("pulse");
    }

    createTriangleChannel() {
        return this.createBaseChannel("triangle");
    }

    createNoiseChannel() {
        return this.createBaseChannel("noise");
    }

    setDuty(channel, duty) {
        channel.duty = duty;
    }

    stopChannel(channel) {
        if (channel.osc) {
            try { channel.osc.stop(); } catch {}
            channel.osc.disconnect();
            channel.osc = null;
        }
    }

    play(channelName, freq, duration = 0.2) {
        const channel = this.channels[channelName];
        const now = this.ctx.currentTime;

        // corta som anterior
        this.stopChannel(channel);

        let osc;

        if (channel.type === "pulse") {
            osc = this.ctx.createOscillator();
            osc.setPeriodicWave(this.createPulseWave(channel.duty));
            osc.frequency.setValueAtTime(freq, now);
        }

        else if (channel.type === "triangle") {
            osc = this.ctx.createOscillator();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now);
        }

        else if (channel.type === "noise") {
            const buffer = this.createNoiseBuffer(duration);
            osc = this.ctx.createBufferSource();
            osc.buffer = buffer;
        }

        osc.connect(channel.gain);

        // envelope mais estável
        channel.gain.gain.cancelScheduledValues(now);
        channel.gain.gain.setValueAtTime(0, now);
        channel.gain.gain.linearRampToValueAtTime(1, now + 0.005);
        channel.gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.start(now);
        osc.stop(now + duration);

        channel.osc = osc;
        channel.stopTime = now + duration;
    }

    createPulseWave(duty) {
        const harmonics = 32;
        const real = new Float32Array(harmonics);
        const imag = new Float32Array(harmonics);

        for (let i = 1; i < harmonics; i++) {
            imag[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
        }

        return this.ctx.createPeriodicWave(real, imag);
    }

    createNoiseBuffer(duration) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }
}
