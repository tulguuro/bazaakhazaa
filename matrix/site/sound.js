// The song of the site and the button that opens and closes it.
//
// The opening film is cut to this song and carries no sound of its own, so
// the two are never heard on top of each other. The song is placed once at the
// film's own second (`position`) when it opens and is never moved after that:
// every jump of a playing song is heard, a phone falls silent for almost half a
// second on each (an earlier version pulled it back to the film every second).
// A visitor who first opens the song after the film hears it from where the film
// ended (`after`).
//
// The song is open by default (owner, 2026-11-20). Browsers do not let a page
// start sound before the visitor has touched it: the opening has a start screen
// whose one tap starts film and song together (main.js calls `open`). Without the
// opening, the song begins on the first touch or key anywhere on the page; until
// then the button invites a press. Only a visitor who closed the song is left in
// quiet, and that choice is remembered.
const LEVEL = 0.8;      // how loud the song plays
const FADE = 600;       // ms, the song comes and goes softly
const KEY = 'matrix-sound';

const remembered = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const remember = (value) => { try { localStorage.setItem(KEY, value); } catch { /* private window */ } };

export function createSound(button, src, { position = () => null, after = 0, waitForStart = false } = {}) {
  const label = button.querySelector('.sound__label');
  const audio = new Audio();
  audio.preload = 'none';   // nothing is downloaded until the visitor asks for the song
  audio.loop = true;
  audio.src = src;
  audio.volume = 0;

  let state = 'off';        // off, loading, on
  let fading = 0;
  let begun = false;        // has the song been placed once already

  // a jump takes the player about a twentieth of a second, so it aims that much ahead
  const LEAD = 0.05;
  const seek = (t) => { try { audio.currentTime = t; } catch { /* not loaded yet */ } };
  // where the song should be: with the film while it runs, after it the first time, else where it was left
  function place() {
    const p = position();
    if (p != null) seek(p); else if (!begun) seek(after);
    begun = true;
  }
  // a song loaded ahead (a whole file in memory) plays without waiting on the network
  function useSource(url) { if (state === 'off' && !begun) audio.src = url; }

  function paint() {
    button.dataset.state = state;
    button.setAttribute('aria-pressed', String(state !== 'off'));
    label.textContent = state === 'on' ? 'Дуу хаах' : state === 'loading' ? 'Дуу нээж байна' : 'Дуу нээх';
  }

  function fadeTo(level, then) {
    cancelAnimationFrame(fading);
    const from = audio.volume;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / FADE);
      // phones ignore this and keep their own volume; the clamp guards the last rounding step
      audio.volume = Math.min(1, Math.max(0, from + (level - from) * k));
      if (k < 1) fading = requestAnimationFrame(step); else then?.();
    };
    fading = requestAnimationFrame(step);
  }

  async function open() {
    state = 'loading';
    paint();
    place();
    try {
      await audio.play();
    } catch {
      state = 'off';
      paint();
      return false;
    }
    if (state !== 'loading') return false;   // closed again while the song was loading
    state = 'on';
    paint();
    const p = position();   // the film went on while the song was loading
    if (p != null && Math.abs(audio.currentTime - p) > 0.06) seek(p + LEAD);
    fadeTo(LEVEL);
    return true;
  }

  function close() {
    state = 'off';
    paint();
    fadeTo(0, () => audio.pause());
  }

  // the first touch or key anywhere on the page starts the song
  function firstTouch(e) {
    stopWaiting();
    if (button.contains(e.target)) return;   // the button's own press opens it
    button.classList.remove('sound--invite');
    open();
  }
  function stopWaiting() {
    window.removeEventListener('pointerdown', firstTouch, true);
    window.removeEventListener('keydown', firstTouch, true);
  }

  button.addEventListener('click', () => {
    stopWaiting();
    button.classList.remove('sound--invite');
    if (state === 'off') { remember('on'); open(); } else { remember('off'); close(); }
  });

  // the song rests while the page is out of sight
  document.addEventListener('visibilitychange', () => {
    if (state !== 'on') return;
    if (document.hidden) audio.pause(); else audio.play().catch(() => {});
  });

  // no song on the server: a button that does nothing would only mislead
  audio.addEventListener('error', () => { stopWaiting(); button.hidden = true; });

  // open by default: at once where the browser allows, else on the first touch
  function invite() {
    if (remembered() === 'off') return;
    open().then((ok) => {
      if (ok) return;
      button.classList.add('sound--invite');
      window.addEventListener('pointerdown', firstTouch, true);
      window.addEventListener('keydown', firstTouch, true);
    });
  }
  paint();
  if (!waitForStart) invite();
  const wanted = () => remembered() !== 'off';
  return { open, close, useSource, invite, wanted, get state() { return state; }, audio };
}
