// Gloam Archive — audio: every sound is a WebAudio oscillator.
// No audio files, no network. Footsteps are soft ticks whose volume and
// stereo position follow the walker; the alarm is a two-tone sting; the
// ledger, the seals and the win/lose stingers are short chimes.

const GloamAudio = (function () {
  var ctx = null;
  var master = null;
  var muted = false;
  var lastStepAt = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return true;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch (e) {
      return false;
    }
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = muted ? 0 : 0.5;
  }

  function isMuted() {
    return muted;
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (!ctx || muted) return;
    var t0 = ctx.currentTime + (when || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol || 0.12, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function pannedTone(freq, dur, type, vol, pan, when) {
    if (!ctx || muted) return;
    var t0 = ctx.currentTime + (when || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    var panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol || 0.1, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan || 0));
      gain.connect(panner);
      panner.connect(master);
    } else {
      gain.connect(master);
    }
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A footstep: a short low tick. `pan` is -1..1, `vol` 0..1.
  function footstep(sneaking, pan, vol) {
    if (!ctx || muted) return;
    var now = ctx.currentTime;
    if (now - lastStepAt < 0.09) return;
    lastStepAt = now;
    pannedTone(sneaking ? 150 : 110, 0.07, "triangle", (sneaking ? 0.05 : 0.11) * vol, pan);
  }

  // A warden's boot: heavier, lower, and it tells you where they are.
  // A little detune each step keeps the boots from sounding mechanical.
  function guardStep(pan, vol) {
    if (!ctx || muted) return;
    var detune = 78 + Math.random() * 8;
    pannedTone(detune, 0.1, "sine", 0.16 * vol, pan);
    pannedTone(55, 0.12, "triangle", 0.08 * vol, pan, 0.02);
  }

  function suspiciousBlip() {
    tone(660, 0.12, "sine", 0.1);
    tone(660, 0.12, "sine", 0.08, 0.14);
  }

  function alarmSting() {
    tone(392, 0.22, "square", 0.09);
    tone(311, 0.3, "square", 0.09, 0.2);
    tone(392, 0.22, "square", 0.07, 0.44);
  }

  function calmDown() {
    tone(523, 0.25, "sine", 0.07, 0, 392);
  }

  function pickupChime() {
    tone(880, 0.12, "sine", 0.12);
    tone(1318, 0.2, "sine", 0.1, 0.09);
  }

  function sealChime() {
    tone(1046, 0.1, "sine", 0.09);
    tone(1568, 0.16, "sine", 0.08, 0.07);
  }

  function winJingle() {
    var notes = [523, 659, 784, 1046, 1318];
    for (var i = 0; i < notes.length; i++) {
      tone(notes[i], 0.28, "sine", 0.11, i * 0.13);
    }
  }

  function loseJingle() {
    tone(220, 0.3, "sawtooth", 0.08, 0, 165);
    tone(165, 0.45, "sawtooth", 0.08, 0.28, 110);
  }

  return {
    ensure: ensure,
    setMuted: setMuted,
    isMuted: isMuted,
    footstep: footstep,
    guardStep: guardStep,
    suspiciousBlip: suspiciousBlip,
    alarmSting: alarmSting,
    calmDown: calmDown,
    pickupChime: pickupChime,
    sealChime: sealChime,
    winJingle: winJingle,
    loseJingle: loseJingle
  };
})();
