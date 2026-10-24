import { useEffect, useReducer, useRef, useState, type PointerEvent } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { characterSets } from './data/sets';
import { createGame, defaults, gameReducer, readPreferences, savePreferences, swipeDirection, type Preferences } from './game';

function initialGame() {
  try { return createGame(readPreferences(window.localStorage)); }
  catch { return createGame({ ...defaults }); }
}

export default function App() {
  const [game, dispatch] = useReducer(gameReducer, undefined, initialGame);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [updateError, setUpdateError] = useState(false);
  const [cacheError, setCacheError] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const flashcard = useRef<HTMLButtonElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; distance: number } | null>(null);
  const suppressClick = useRef(false);
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) { registration.current = reg; },
    onOfflineReady() { setOfflineReady(true); },
    onRegisterError() { setCacheError(true); },
  });
  const { preferences } = game;
  const character = game.deck.history[game.deck.index];

  useEffect(() => {
    try { setStorageAvailable(savePreferences(window.localStorage, preferences)); }
    catch { setStorageAvailable(false); }
  }, [preferences]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#191a18' : '#f7f6f2');
    };
    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [preferences.theme]);

  useEffect(() => {
    if (settingsOpen) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [settingsOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (settingsOpen || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const target = event.target as HTMLElement;
      if (target.closest('button, input, select, textarea, a, [contenteditable]') && target !== flashcard.current) return;
      if (['ArrowRight', 'ArrowLeft', ' ', 'Enter'].includes(event.key)) {
        event.preventDefault();
        dispatch({ type: event.key === 'ArrowLeft' ? 'previous' : 'next' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL).then(reg => {
        if (reg?.active && !reg.installing) setOfflineReady(true);
      }).catch(() => {});
    }
    const checkUpdate = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        registration.current?.update().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', checkUpdate);
    return () => document.removeEventListener('visibilitychange', checkUpdate);
  }, []);

  function closeSettings() {
    setSettingsOpen(false);
    settingsButton.current?.focus();
  }
  function changePreferences(next: Partial<Preferences>) {
    dispatch({ type: 'preferences', preferences: { ...preferences, ...next } });
  }
  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    suppressClick.current = false;
    if (!event.isPrimary || event.button !== 0) return;
    // Leave the screen edges to Safari's system back/forward gestures.
    if (event.pointerType === 'touch' && (event.clientX < 24 || event.clientX > window.innerWidth - 24)) {
      suppressClick.current = true;
      return;
    }
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    start.distance = Math.max(start.distance, Math.hypot(event.clientX - start.x, event.clientY - start.y));
  }
  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    gesture.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    suppressClick.current = Math.max(start.distance, Math.hypot(dx, dy)) > 12;
    const direction = swipeDirection(dx, dy);
    if (direction) dispatch({ type: direction });
  }

  return (
    <div className="app">
      <header className="toolbar">
        <button ref={settingsButton} className="icon-button" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
          <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="m9.5 3-.6 2.1-1.7 1-2.1-.5-2.5 4.3 1.5 1.6v2L2.6 15l2.5 4.3 2.1-.5 1.7 1 .6 2.2h5l.6-2.2 1.7-1 2.1.5 2.5-4.3-1.5-1.5v-2l1.5-1.6L18.9 5.6l-2.1.5-1.7-1L14.5 3z" />
            <circle cx="12" cy="12.5" r="3.2" />
          </svg>
        </button>
      </header>
      <main className="stage">
        <button ref={flashcard} className="flashcard" aria-label="Next character"
          onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
          onPointerCancel={() => { gesture.current = null; suppressClick.current = true; }}
          onClick={event => {
            if (event.detail === 0 || !suppressClick.current) dispatch({ type: 'next' });
            suppressClick.current = false;
          }}>
          <span className="hanzi" lang="zh-Hans" aria-live="polite" aria-atomic="true">{character}</span>
        </button>
      </main>
      <footer className="hint" aria-hidden={game.interacted}>
        {!game.interacted && 'Tap or swipe for another character'}
      </footer>

      <dialog ref={dialog} className="settings" aria-labelledby="settings-title"
        onCancel={closeSettings} onClose={closeSettings}
        onClick={event => { if (event.target === event.currentTarget) closeSettings(); }}>
        <div className="settings-content">
          <div className="settings-heading">
            <div><p className="eyebrow">HANZI CARDS</p><h1 id="settings-title">Make it yours.</h1></div>
            <button className="icon-button close" aria-label="Close settings" onClick={closeSettings}>×</button>
          </div>
          <fieldset>
            <legend>Character set</legend>
            <div className="sets">
              {characterSets.map(set => (
                <label className="set-choice" key={set.id}>
                  <input type="radio" name="set" value={set.id} checked={preferences.setId === set.id}
                    onChange={() => changePreferences({ setId: set.id })} />
                  <span><strong>{set.name}</strong><small>{set.description} · {set.characters.length} characters</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="shuffle-row">
            <span>Shuffle<small>A surprise every time</small></span>
            <input type="checkbox" role="switch" checked={preferences.shuffle}
              onChange={event => changePreferences({ shuffle: event.target.checked })} />
          </label>
          <fieldset>
            <legend>Appearance</legend>
            <div className="theme-options">
              {(['system', 'light', 'dark'] as const).map(theme => (
                <label key={theme}>
                  <input type="radio" name="theme" value={theme} checked={preferences.theme === theme}
                    onChange={() => changePreferences({ theme })} />
                  <span>{theme[0].toUpperCase() + theme.slice(1)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button className="primary-button" onClick={closeSettings}>Let’s play</button>
          <p className="settings-note">Tap or → for next · Swipe right or ← to go back.<br />No scores. No progress. Just characters.</p>
          <p className="cache-status" role="status">{cacheError ? 'Offline setup failed. Reopen online to try again.' : offlineReady ? 'Ready to play offline' : 'Offline play is ready once the app finishes caching.'}</p>
          {!storageAvailable && <p className="cache-status" role="status">Preferences cannot be saved in this browser.</p>}
          {needRefresh && <div className="update-notice" role="status">
            <span>A new version is ready.</span>
            <button onClick={() => { setUpdateError(false); void updateServiceWorker(true).catch(() => setUpdateError(true)); }}>Update</button>
            {updateError && <p>Couldn’t update. Try again when online.</p>}
          </div>}
        </div>
      </dialog>
    </div>
  );
}
