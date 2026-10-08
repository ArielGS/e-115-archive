// Short recorded sounds (public/sounds), played through the shared WebAudio
// context so their volume can be set on every browser (iOS ignores the
// volume of <audio> elements). Like the blips, they only play with sound on.
import { audio, soundEnabled } from './sfx';
import { url } from '../lib/site';

/** High-voltage spark: plays when the visitor enters with sound. */
export const SPARK = '/sounds/faespencer-high-voltage-spark-486895.mp3';

/** Fired on document each time a sample starts (detail: { src, volume, from }). */
export const SAMPLE_EVENT = 'archivo115:sample';

const files = new Map<string, Promise<ArrayBuffer | null>>();
const decoded = new Map<string, Promise<AudioBuffer | null>>();

/** Downloads a sample ahead of time, so it plays without a delay later. */
export function preloadSample(path: string): Promise<ArrayBuffer | null> {
  let file = files.get(path);
  if (!file) {
    file = fetch(url(path))
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
    files.set(path, file);
  }
  return file;
}

function load(ac: AudioContext, path: string): Promise<AudioBuffer | null> {
  let buffer = decoded.get(path);
  if (!buffer) {
    // decodeAudioData detaches the bytes it gets, so it decodes a copy.
    buffer = preloadSample(path)
      .then((bytes) => (bytes ? ac.decodeAudioData(bytes.slice(0)) : null))
      .catch(() => null);
    decoded.set(path, buffer);
  }
  return buffer;
}

export interface SampleOptions {
  /** 0–1, relative to the file's own level. */
  volume?: number;
  /** Fade the sample out and stop it after this many seconds. */
  maxDuration?: number;
  /** Start at this fraction of the volume and swell to full in `attack` seconds. */
  from?: number;
  attack?: number;
}

/** Entering with sound: the spark starts at 60% and swells to full almost at once. */
export const ENTER_SPARK: SampleOptions = { from: 0.6, attack: 0.12 };

export async function playSample(path: string, { volume = 1, maxDuration, from = 1, attack = 0 }: SampleOptions = {}): Promise<void> {
  if (!soundEnabled()) return;
  const ac = audio();
  if (!ac) return;
  const buffer = await load(ac, path);
  if (!buffer || !soundEnabled()) return;
  const t = ac.currentTime;
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume * from, t);
  if (attack > 0 && from !== 1) gain.gain.linearRampToValueAtTime(volume, t + attack);
  source.connect(gain).connect(ac.destination);
  source.start(t);
  if (maxDuration && maxDuration < buffer.duration) {
    gain.gain.setValueAtTime(volume, t + maxDuration * 0.7);
    gain.gain.linearRampToValueAtTime(0, t + maxDuration);
    source.stop(t + maxDuration + 0.05);
  }
  document.dispatchEvent(new CustomEvent(SAMPLE_EVENT, { detail: { src: path, volume, from } }));
}
