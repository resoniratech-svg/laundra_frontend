import React from 'react';
import { useLanguage } from '../LanguageContext';

export const LanguageSwitcher: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '3px 6px', borderRadius: '8px', border: '1px solid #cbd5e1', ...style }}>
      <span style={{ fontSize: '0.9rem', marginRight: '2px' }}>🌐</span>
      <button
        onClick={() => setLanguage('en')}
        style={{
          background: language === 'en' ? '#2563eb' : 'transparent',
          color: language === 'en' ? 'white' : '#475569',
          border: 'none',
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '0.78rem',
          fontWeight: '800',
          cursor: 'pointer',
          transition: 'all 0.15s'
        }}
      >
        English
      </button>
      <button
        onClick={() => setLanguage('ar')}
        style={{
          background: language === 'ar' ? '#2563eb' : 'transparent',
          color: language === 'ar' ? 'white' : '#475569',
          border: 'none',
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '0.78rem',
          fontWeight: '800',
          cursor: 'pointer',
          transition: 'all 0.15s'
        }}
      >
        العربية
      </button>
    </div>
  );
};
