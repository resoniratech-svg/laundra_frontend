import React, { useState, useEffect } from 'react';

interface InstallAppButtonProps {
  style?: React.CSSProperties;
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({
  style,
  label = '💻 Install Desktop POS',
  variant = 'primary'
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone window
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('[Laundra PWA] App successfully installed on desktop!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[Laundra PWA] User install choice: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      alert(
        '💡 To install Laundra POS:\n\n1. In Chrome / Edge, click the 3-dots menu (⋮) in the top right.\n2. Click "Save and share" -> "Install this site as an app" (or click the ⬇️ Install icon in your address bar).\n\nA standalone icon will be placed directly on your Windows Desktop!'
      );
    }
  };

  if (isInstalled) {
    return null; // Already running inside installed app window
  }

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    ...style
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
      color: '#ffffff',
      border: 'none'
    },
    secondary: {
      background: '#f1f5f9',
      color: '#1e293b',
      border: '1px solid #cbd5e1'
    },
    outline: {
      background: 'transparent',
      color: '#2563eb',
      border: '1.5px solid #2563eb'
    }
  };

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      style={{ ...baseStyles, ...variantStyles[variant] }}
      title="Install Laundra POS on your Windows Desktop for 100% Offline Access"
    >
      <span>{label}</span>
    </button>
  );
};
