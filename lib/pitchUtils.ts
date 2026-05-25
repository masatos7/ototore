// Convert frequency (Hz) to MIDI note number (A4 = 69 = 440Hz)
export function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

// Convert MIDI note number to note name (e.g. 69 -> "A4")
export function midiToNoteName(midi: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const note = noteNames[midi % 12];
  return `${note}${octave}`;
}

// Check if two MIDI notes match (ignoring octave)
export function notesMatchPitchClass(midiA: number, midiB: number): boolean {
  return (midiA % 12) === (midiB % 12);
}

// Check if two MIDI notes are the same (exact octave)
export function notesMatch(midiA: number, midiB: number): boolean {
  return midiA === midiB;
}

// Cents deviation between two frequencies
export function centDeviation(detected: number, expected: number): number {
  return 1200 * Math.log2(detected / expected);
}

// MIDI note to frequency
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
