import { useEffect, useState } from 'react';
import { useStore } from './context';

/**
 * Displays the branded launch animation until initial account restoration finishes.
 * No artificial minimum wait: as soon as the app is ready it fades away.
 * A timeout avoids trapping customers behind a spinner if a request stalls.
 */
export function AppPreloader() {
  const { ready } = useStore();
  const [phase, setPhase] = useState('loading');

  useEffect(() => {
    if (ready) setPhase(current => current === 'loading' ? 'leaving' : current);
  }, [ready]);

  useEffect(() => {
    const fallback = window.setTimeout(() => {
      setPhase(current => current === 'loading' ? 'leaving' : current);
    }, 9000);
    return () => window.clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const timer = window.setTimeout(() => setPhase('gone'), 440);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === 'gone') return null;

  return <div className={'market-loader' + (phase === 'leaving' ? ' market-loader--leaving' : '')}
    role="status" aria-label="Loading SL Options Market" aria-live="polite"
    aria-hidden={phase === 'leaving' ? 'true' : undefined}>
    <div className="market-loader__content">
      <div className="market-loader__emblem" aria-hidden="true">
        <span className="market-loader__orbit"/>
        <span className="market-loader__orbit market-loader__orbit--inner"/>
        <span className="market-loader__symbol"><b>s</b><i>✳</i></span>
      </div>
      <p className="market-loader__name">SL OPTIONS <span>MARKET</span></p>
      <p className="market-loader__caption">Thoughtful finds, just for you.</p>
      <div className="market-loader__track" aria-hidden="true"><span className="market-loader__bar"/></div>
    </div>
    <span className="market-loader__foot">MADE FOR SRI LANKA · AN SL OPTIONS STORE</span>
  </div>;
}
