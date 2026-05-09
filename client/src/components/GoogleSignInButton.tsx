import { useEffect, useRef } from 'react';

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
}

export function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  useEffect(() => {
    if (!clientId || !divRef.current) return;

    const render = () => {
      if (!window.google?.accounts?.id || !divRef.current) return;
      try {
        window.google.accounts.id.cancel();
      } catch {
        /* ignore if nothing to cancel */
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => {
          if (resp?.credential) onCredential(resp.credential);
        },
        ux_mode: 'popup',
      });
      divRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(divRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
        locale: 'en',
      });
    };

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing && window.google?.accounts?.id) {
      render();
      return () => {
        try {
          window.google?.accounts?.id.cancel();
        } catch {
          /* ignore */
        }
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);

    return () => {
      try {
        window.google?.accounts?.id.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
        Set <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
      </p>
    );
  }

  return <div ref={divRef} className="flex justify-center w-full min-h-[40px]" />;
}
