// "Recording" effect for the voice narrator: makes the browser voice sound
// like an old tape or radio transmission. Browsers do not let pages process
// speechSynthesis audio (it never goes through WebAudio), so instead of
// filtering the voice we play, under it, what a recording adds: tape hiss,
// dust crackle, mains hum, and a radio click at the start of every line.
// Everything is synthesized; nothing is downloaded.
import { audio } from './sfx';

export interface Recording {
  /** Radio "push-to-talk" click, played when a new line starts. */
  cue(): void;
  stop(): void;
}

/**
 * Sparse random impulses, like dust on a record: on average `perSecond`
 * clicks, each a 1–3 sample spike of random sign and size. `random` is
 * injectable for tests.
 */
export function crackle(length: number, sampleRate: number, perSecond = 9, random: () => number = Math.random): Float32Array {
  const out = new Float32Array(length);
  const chance = perSecond / sampleRate;
  for (let i = 0; i < length; i++) {
    if (random() >= chance) continue;
    const amp = (0.25 + random() * 0.75) * (random() < 0.5 ? -1 : 1);
    const width = 1 + Math.floor(random() * 3);
    for (let k = 0; k < width && i + k < length; k++) out[i + k] = amp * (1 - k / width);
  }
  return out;
}

function noiseBuffer(ac: AudioContext, seconds: number, fill: (len: number) => Float32Array): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  buffer.getChannelData(0).set(fill(len));
  return buffer;
}

const white = (len: number) => Float32Array.from({ length: len }, () => Math.random() * 2 - 1);

export function startRecording(volume = 1): Recording | null {
  const ac = audio();
  if (!ac) return null;
  const t0 = ac.currentTime;
  const master = ac.createGain();
  master.gain.setValueAtTime(0, t0);
  master.gain.linearRampToValueAtTime(volume, t0 + 0.4);
  master.connect(ac.destination);
  const sources: AudioScheduledSourceNode[] = [];

  const loop = (buffer: AudioBuffer, ...chain: AudioNode[]) => {
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    chain.reduce<AudioNode>((from, to) => from.connect(to), src).connect(master);
    src.start();
    sources.push(src);
  };
  const filter = (type: BiquadFilterType, frequency: number, Q = 0.7) => {
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = Q;
    return f;
  };
  const gain = (value: number) => {
    const g = ac.createGain();
    g.gain.value = value;
    return g;
  };

  // Tape hiss: white noise kept in the upper mids, very quiet.
  loop(noiseBuffer(ac, 2, white), filter('highpass', 2500), filter('lowpass', 7000), gain(0.012));
  // Dust crackle: a 3 s loop of random clicks, softened.
  loop(noiseBuffer(ac, 3, (len) => crackle(len, ac.sampleRate)), filter('bandpass', 2200, 0.8), gain(0.12));
  // Mains hum: 50 Hz with its first harmonic, barely audible.
  for (const [freq, level] of [
    [50, 0.006],
    [100, 0.003],
  ]) {
    const osc = ac.createOscillator();
    osc.frequency.value = freq;
    osc.connect(gain(level)).connect(master);
    osc.start();
    sources.push(osc);
  }

  const click = noiseBuffer(ac, 0.05, white);
  let stopped = false;

  return {
    cue() {
      if (stopped) return;
      // A short band-limited noise burst with a fast decay, like keying a radio.
      const t = ac.currentTime;
      const src = ac.createBufferSource();
      src.buffer = click;
      const env = ac.createGain();
      env.gain.setValueAtTime(0.09, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      src.connect(filter('bandpass', 1800, 1.2)).connect(env).connect(master);
      src.start(t);
      src.stop(t + 0.05);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.3);
      setTimeout(() => {
        for (const s of sources) {
          try {
            s.stop();
          } catch {
            /* already stopped */
          }
        }
        master.disconnect();
      }, 350);
    },
  };
}
