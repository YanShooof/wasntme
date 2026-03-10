import { useState } from 'react';
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
}

export default function Dialog({ 
  title, 
  message, 
  inputValue = '', 
  onConfirm, 
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  isInput = false
}: DialogProps) {
  const [value, setValue] = useState(inputValue);

  const handleConfirm = () => {
    onConfirm(isInput ? value : undefined);
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        {title && <div className="dialog-title">{title}</div>}
        {message && <div className="dialog-message">{message}</div>}
        {isInput && (
          <input
            type="text"
            className="dialog-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={15}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirm();
              }
            }}
          />
        )}
        <div className="dialog-actions">
          <button className="dialog-button" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="dialog-button dialog-button-primary" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
