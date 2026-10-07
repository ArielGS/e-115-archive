// Low ambient soundscape that plays under the voice narrator. Everything is
// synthesized (drones + filtered noise), with a mood per map:
//   noir    → Shadows of Evil: deep detuned drone, slow pulse, crackle
//   factory → The Giant: machinery thump, metallic hum
//   castle  → Der Eisendrache: cold wind, distant low choir-like pad
import { audio } from './sfx';

export type Mood = 'noir' | 'factory' | 'castle' | 'default';

interface Voice {
  stop(): void;
}

const MOODS: Record<Mood, { drone: number[]; filter: number; lfo: number; noise: number; pulse: number }> = {
  noir: { drone: [55, 55.4, 82.4], filter: 260, lfo: 0.07, noise: 0.012, pulse: 0 },
  factory: { drone: [49, 98.3, 147], filter: 420, lfo: 0.2, noise: 0.008, pulse: 1.1 },
  castle: { drone: [65.4, 98, 130.8], filter: 340, lfo: 0.05, noise: 0.03, pulse: 0 },
  default: { drone: [55, 82.4], filter: 300, lfo: 0.1, noise: 0.01, pulse: 0 },
};

export function startAmbient(mood: Mood, volume = 0.5): Voice | null {
  const ac = audio();
  if (!ac) return null;
  const m = MOODS[mood] ?? MOODS.default;
  const master = ac.createGain();
  master.gain.setValueAtTime(0, ac.currentTime);
  master.gain.linearRampToValueAtTime(0.06 * volume, ac.currentTime + 2.5);
  master.connect(ac.destination);

  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = m.filter;
  filter.Q.value = 6;
  filter.connect(master);

  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.value = m.lfo;
  lfoGain.gain.value = m.filter * 0.5;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  const nodes: AudioScheduledSourceNode[] = [lfo];
  for (const [i, f] of m.drone.entries()) {
    const osc = ac.createOscillator();
    osc.type = i === 0 ? 'sawtooth' : 'triangle';
    osc.frequency.value = f;
    osc.detune.value = (i - 1) * 7;
    const g = ac.createGain();
    g.gain.value = i === 0 ? 0.6 : 0.35;
    osc.connect(g).connect(filter);
    osc.start();
    nodes.push(osc);
  }

  // Wind / room tone: looping white noise through a band-pass.
  const buffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = mood === 'castle' ? 700 : 1800;
  band.Q.value = 0.7;
  const ng = ac.createGain();
  ng.gain.value = m.noise * 20;
  noise.connect(band).connect(ng).connect(master);
  noise.start();
  nodes.push(noise);

  // Machinery pulse (factory): a soft kick every m.pulse seconds.
  let timer: ReturnType<typeof setInterval> | undefined;
  if (m.pulse) {
    timer = setInterval(() => {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.32);
    }, m.pulse * 1000);
  }

  return {
    stop() {
      if (timer) clearInterval(timer);
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(() => {
        nodes.forEach((n) => {
          try {
            n.stop();
          } catch {
            /* already stopped */
          }
        });
        master.disconnect();
      }, 1300);
    },
  };
}
