export interface NoteEvent {
  midiNote: number;
  startTimeSec: number;
  durationSec: number;
  measureIndex: number;
  isRest: boolean;
  part: number; // 0 = treble/right hand, 1 = bass/left hand
  dotted?: boolean;
  tieStart?: boolean;
}

const STEP_SEMITONES: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

export function stepToMidi(step: string, alter: number, octave: number): number {
  return (octave + 1) * 12 + (STEP_SEMITONES[step] ?? 0) + alter;
}

export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats / bpm) * 60;
}

function getTextContent(el: Element | null, tag: string): string {
  return el?.querySelector(tag)?.textContent?.trim() ?? "";
}

// Extract key signature from MusicXML: positive = sharps, negative = flats
export function parseKeySignature(xmlText: string): number {
  const match = xmlText.match(/<fifths>\s*(-?\d+)\s*<\/fifths>/);
  return match ? parseInt(match[1], 10) : 0;
}

function parsePartMeasures(
  measures: Element[],
  bpm: number,
  startMeasure: number,
  endMeasure: number,
  partIdx: number
): NoteEvent[] {
  let divisions = 4;
  let currentTimeSec = 0;
  let rangeStartTimeSec = 0;
  const events: NoteEvent[] = [];

  for (let mi = 0; mi < measures.length; mi++) {
    const measure = measures[mi];

    if (mi === startMeasure) {
      rangeStartTimeSec = currentTimeSec;
    }

    const divisionsEl = measure.querySelector("divisions");
    if (divisionsEl?.textContent) {
      divisions = parseInt(divisionsEl.textContent, 10) || divisions;
    }

    const notes = Array.from(measure.querySelectorAll("note"));

    for (const noteEl of notes) {
      const isChord = noteEl.querySelector("chord") !== null;
      if (isChord) continue;

      const isRest = noteEl.querySelector("rest") !== null;
      const durationEl = noteEl.querySelector("duration");
      const rawDuration = durationEl ? parseInt(durationEl.textContent ?? "4", 10) : divisions;
      const beatDuration = rawDuration / divisions;
      const durationSec = beatsToSeconds(beatDuration, bpm);
      const dotted   = noteEl.querySelector("dot") !== null;
      const tieStart = Array.from(noteEl.querySelectorAll("tie"))
        .some(t => t.getAttribute("type") === "start");

      if (mi >= startMeasure && mi < endMeasure) {
        if (isRest) {
          events.push({
            midiNote: -1,
            startTimeSec: currentTimeSec - rangeStartTimeSec,
            durationSec,
            measureIndex: mi,
            isRest: true,
            part: partIdx,
            dotted,
          });
        } else {
          const pitchEl = noteEl.querySelector("pitch");
          if (pitchEl) {
            const step = getTextContent(pitchEl, "step") || "C";
            const alter = parseFloat(getTextContent(pitchEl, "alter") || "0");
            const octave = parseInt(getTextContent(pitchEl, "octave") || "4", 10);
            const midiNote = stepToMidi(step, alter, octave);
            events.push({
              midiNote,
              startTimeSec: currentTimeSec - rangeStartTimeSec,
              durationSec,
              measureIndex: mi,
              isRest: false,
              part: partIdx,
              dotted,
              tieStart,
            });
          }
        }
      }

      currentTimeSec += durationSec;
    }
  }

  return events;
}

// Parse MusicXML string and extract note events for the given measure range
export function parseNotesFromXML(
  xmlText: string,
  bpm: number,
  startMeasure: number,
  endMeasure: number
): NoteEvent[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  // Get top-level <part> elements (children of root, not nested)
  const parts = Array.from(doc.documentElement.querySelectorAll(":scope > part"));

  const allEvents: NoteEvent[] = [];

  if (parts.length === 0) {
    // Fallback: no explicit parts, treat all measures as part 0
    const measures = Array.from(doc.querySelectorAll("measure"));
    return parsePartMeasures(measures, bpm, startMeasure, endMeasure, 0);
  }

  for (let i = 0; i < Math.min(parts.length, 2); i++) {
    const measures = Array.from(parts[i].querySelectorAll("measure"));
    const events = parsePartMeasures(measures, bpm, startMeasure, endMeasure, i);
    allEvents.push(...events);
  }

  // Sort by start time, then by part (treble before bass at same time)
  allEvents.sort((a, b) => a.startTimeSec - b.startTimeSec || a.part - b.part);
  return allEvents;
}
