import React from 'react';

/**
 * Safe React conversion shell.
 *
 * The original HoneyChain app is kept isolated inside a same-origin iframe.
 * Query parameters are forwarded so the customer-login link generated after
 * a batch is registered can open the customer sign-in flow directly.
 */
export default function App() {
  const query = typeof window !== 'undefined' ? window.location.search : '';
  return (
    <main className="honeychain-react-shell">
      <iframe
        className="honeychain-frame"
        src={`/legacy-honeychain.html?v=20260911-qrfinal1${query}`}
        title="HoneyChain"
        allow="camera; microphone; geolocation"
      />
    </main>
  );
}
