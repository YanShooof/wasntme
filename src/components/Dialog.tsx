import { useEffect, useRef, useState } from 'react';
import './Dialog.css';

interface DialogProps {
  title: string;
  message?: string;
  inputValue?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isInput?: boolean;
  hideCancel?: boolean;
  formatPrefixBold?: boolean;
}

export default function Dialog({ 
  title, 
  message, 
  inputValue = '', 
  onConfirm, 
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  isInput = false,
  hideCancel = false,
  formatPrefixBold = false
}: DialogProps) {
  const [value, setValue] = useState(inputValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasHebrew = /[\u0590-\u05FF]/.test(`${title} ${message ?? ''}`);

  const vibrateTap = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  useEffect(() => {
    if (!isInput) return;

    const focusInput = () => {
      const element = inputRef.current;
      if (!element) return;
      element.focus({ preventScroll: true });
    };

    focusInput();
    const rafId = window.requestAnimationFrame(focusInput);
    const timeoutId = window.setTimeout(focusInput, 50);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [isInput]);

  const renderMessage = (text: string) => {
    if (!formatPrefixBold) {
      return text;
    }

    return text.split('\n').map((line, index) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const prefix = line.slice(0, colonIndex + 1);
        const suffix = line.slice(colonIndex + 1);
        return (
          <div key={index}>
            <strong>{prefix}</strong>
            {suffix}
          </div>
        );
      }

      return <div key={index}>{line}</div>;
    });
  };

  const handleConfirm = () => {
    vibrateTap([12, 18, 12]);
    onConfirm(isInput ? value : undefined);
  };

  const handleCancel = () => {
    vibrateTap(12);
    onCancel();
  };

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        {title && <div className={`dialog-title ${hasHebrew ? 'rtl' : ''}`} dir={hasHebrew ? 'rtl' : 'ltr'}>{title}</div>}
        {message && <div className={`dialog-message ${hasHebrew ? 'rtl' : ''}`} dir={hasHebrew ? 'rtl' : 'ltr'}>{renderMessage(message)}</div>}
        {isInput && (
          <input
            ref={inputRef}
            type="text"
            className="dialog-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={15}
            autoFocus
            inputMode="text"
            enterKeyHint="done"
            dir={/[\u0590-\u05FF]/.test(value) ? 'rtl' : 'ltr'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirm();
              }
            }}
          />
        )}
        <div className="dialog-actions">
          {!hideCancel && (
            <button className="dialog-button" onClick={handleCancel}>
              {cancelText}
            </button>
          )}
          <button className="dialog-button dialog-button-primary" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
