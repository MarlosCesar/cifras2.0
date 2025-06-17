const NOTES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
];
const REGEX_NOTA = /\b([A-G](#|b)?(m|maj|min|sus|dim|aug|add)?[0-9]?(\/[A-G](#|b)?)?)\b/g;

function normalizeNote(note) {
  let m = note.match(/^([A-G](#|b)?)/);
  return m ? m[1] : note;
}
function transposeNote(note, steps) {
  let base = normalizeNote(note);
  let idx = NOTES.findIndex(n => n === base);
  if (idx < 0) return note;
  let sufixo = note.slice(base.length);
  let newIdx = (idx + steps + 12) % 12;
  let newBase = NOTES[newIdx];
  return newBase + sufixo;
}
export function cifraTransposerRender(text, steps) {
  return text.replace(REGEX_NOTA, (match) => {
    let trans = steps !== 0 ? transposeNote(match, steps) : match;
    if (steps === 0 || trans === match) return `<span class="nota-cifra">${match}</span>`;
    return `<span class="nota-cifra overlay">
      <span class="nota-transposta">${trans}</span>
      <span class="nota-original">${match}</span>
    </span>`;
  });
}
window.cifraTransposerRender = cifraTransposerRender;