import { useState, useEffect, useRef } from 'react';
import { defaultRoles, roleIcons, roleExplanations, killers } from '../data/roles';
import Toast from './Toast';
import Dialog from './Dialog';
import './RoleSelector.css';

interface RoleSelectorProps {
  onStart: (roles: string[]) => void;
}

const useLongPress = (callback: () => void, ms = 500) => {
  const timerRef = useRef<number | undefined>(undefined);
  const callbackRef = useRef(callback);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const SCROLL_THRESHOLD = 10;

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const clearPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    pointerStartRef.current = null;
  };

  const startPress = (e: React.PointerEvent) => {
    clearPress();
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    timerRef.current = window.setTimeout(() => {
      callbackRef.current();
      timerRef.current = undefined;
    }, ms);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    
    if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) {
      clearPress();
    }
  };

  useEffect(() => {
    return () => clearPress();
  }, []);

  return {
    onMouseDown: (e: React.MouseEvent) => startPress(e as unknown as React.PointerEvent),
    onMouseUp: clearPress,
    onMouseLeave: clearPress,
    onMouseMove: (e: React.MouseEvent) => onPointerMove(e as unknown as React.PointerEvent),
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      startPress({ clientX: touch.clientX, clientY: touch.clientY } as unknown as React.PointerEvent);
    },
    onTouchEnd: clearPress,
    onTouchCancel: clearPress,
    onTouchMove: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      onPointerMove({ clientX: touch.clientX, clientY: touch.clientY } as unknown as React.PointerEvent);
    },
  };
};

export default function RoleSelector({ onStart }: RoleSelectorProps) {
  const [customRoles, setCustomRoles] = useState<string[]>([...defaultRoles]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [isWideMode, setIsWideMode] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    title: string;
    message?: string;
    inputValue?: string;
    isInput?: boolean;
    onConfirm: (value?: string) => void;
  } | null>(null);
  
  const pointerStateRef = useRef<Map<number, { x: number; y: number; index: number; scrolling: boolean }>>(new Map());
  const SCROLL_THRESHOLD = 10;

  const vibrateTap = (ms = 20) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('customRoles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomRoles(parsed);
      } catch (e) {
        console.error('Failed to load roles:', e);
      }
    }
  }, []);

  const toggleRole = (index: number) => {
    vibrateTap();
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleRolePointerDown = (index: number, e: React.PointerEvent) => {
    pointerStateRef.current.set(e.pointerId, { 
      x: e.clientX, 
      y: e.clientY, 
      index,
      scrolling: false 
    });
  };

  const handleGridPointerMove = (e: React.PointerEvent) => {
    const state = pointerStateRef.current.get(e.pointerId);
    if (!state || state.scrolling) return;

    const dx = Math.abs(e.clientX - state.x);
    const dy = Math.abs(e.clientY - state.y);

    if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) {
      state.scrolling = true;
    }
  };

  const handleGridPointerCancel = (e: React.PointerEvent) => {
    pointerStateRef.current.delete(e.pointerId);
  };

  const handleRolePointerUp = (index: number, e: React.PointerEvent) => {
    const state = pointerStateRef.current.get(e.pointerId);
    pointerStateRef.current.delete(e.pointerId);
    
    if (state && !state.scrolling && state.index === index) {
      toggleRole(index);
    }
  };

  const handleRoleEdit = (index: number, newName: string) => {
    const updated = [...customRoles];
    updated[index] = newName;
    setCustomRoles(updated);
    localStorage.setItem('customRoles', JSON.stringify(updated));
  };

  const handleReset = () => {
    vibrateTap();
    setCustomRoles([...defaultRoles]);
    setSelectedIndices(new Set());
    localStorage.setItem('customRoles', JSON.stringify(defaultRoles));
    setToast('Reset');
  };

  const handleStart = () => {
    vibrateTap();
    if (selectedIndices.size < 3 || selectedIndices.size > 15) {
      return;
    }

    let finalRoles = Array.from(selectedIndices).map(i => customRoles[i]);
    
    for (let i = finalRoles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalRoles[i], finalRoles[j]] = [finalRoles[j], finalRoles[i]];
    }

    if (isWideMode && playerCount > 0) {
      const killersInGame: string[] = [];
      const othersInGame: string[] = [];

      finalRoles.forEach(role => {
        if (killers.includes(role)) {
          killersInGame.push(role);
        } else {
          othersInGame.push(role);
        }
      });

      const needed = playerCount - killersInGame.length;
      const finalList = [...killersInGame, ...othersInGame.slice(0, needed)];
      
      for (let i = finalList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalList[i], finalList[j]] = [finalList[j], finalList[i]];
      }
      
      onStart(finalList);
    } else {
      onStart(finalRoles);
    }
  };

  const handleLongPressNext = () => {
    vibrateTap(35);
    if (!isWideMode) {
      setIsWideMode(true);
      setPlayerCount(selectedIndices.size);
    } else {
      setIsWideMode(false);
      setPlayerCount(0);
    }
  };

  const showRuleExplanation = (role: string) => {
    const explanation = roleExplanations[role] || '<b>• יכולת:</b> אין לי מושג.<br> <b>• שייכות:</b> אין לי מושג.';
    const cleanText = explanation.replace(/<b>/g, '').replace(/<\/b>/g, '').replace(/<br>/g, '\n');
    setDialog({
      title: role,
      message: cleanText,
      isInput: false,
      onConfirm: () => setDialog(null),
    });
  };

  const handleRoleLongPress = (role: string, index: number) => {
    if (isEditMode) {
      promptForRoleName(index, role);
    } else {
      showRuleExplanation(role);
    }
  };

  const promptForRoleName = (index: number, currentName: string) => {
    setDialog({
      title: `Change ${currentName} to:`,

      inputValue: currentName,
      isInput: true,
      onConfirm: (newName) => {
        setDialog(null);
        if (newName && newName.trim()) {
          const trimmed = newName.trim().slice(0, 15);
          handleRoleEdit(index, trimmed === 'usb tertele' ? 'USB tertele' : trimmed);
        }
      },
    });
  };

  const isNextEnabled = selectedIndices.size >= 3 && selectedIndices.size <= 15;

  return (
    <div className='role-selector'>
      <div className='top-controls'>
        {isEditMode && (
          <>
            <button className='text-button' onClick={handleReset}>Reset</button>
          </>
        )}

        <button
          className='icon-button'
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            vibrateTap();
            setIsEditMode(!isEditMode);
          }}
        >
          <img
            src={isEditMode ? '/settings.svg' : '/library-books.svg'}
            alt={isEditMode ? 'Settings' : 'Rules'}
            className='header-icon'
          />
        </button>
      </div>

      <div className='spacer' />
      <div className='title'>Select:</div>
      <div className='spacer' />

      <div 
        className='role-grid'
        onPointerMove={handleGridPointerMove}
        onPointerCancel={handleGridPointerCancel}
      >
        {customRoles.map((role, index) => {
          const isSelected = selectedIndices.has(index);
          const iconPath = roleIcons[role.toLowerCase()];
          const longPressHandlers = useLongPress(() => handleRoleLongPress(role, index));
          
          return (
            <div
              key={index}
              className={`role-card ${isSelected ? 'selected' : ''}`}
              onPointerDown={(e) => handleRolePointerDown(index, e)}
              onPointerUp={(e) => handleRolePointerUp(index, e)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (isEditMode) {
                  promptForRoleName(index, role);
                } else {
                  showRuleExplanation(role);
                }
              }}
              {...longPressHandlers}
            >
              {iconPath && (
                <img 
                  src={`/icons/${iconPath}`} 
                  alt={role}
                  className='role-icon'
                  draggable={false}
                />
              )}
              <div className='role-name'>{role}</div>
            </div>
          );
        })}
      </div>

      <div className='spacer' />
      <button
        className='next-button'
        style={isNextEnabled || isWideMode ? { backgroundColor: '#fff', color: '#000' } : undefined}
        disabled={!isNextEnabled && !isWideMode}
        onClick={handleStart}
        onContextMenu={(e) => {
          e.preventDefault();
          handleLongPressNext();
        }}
        {...useLongPress(handleLongPressNext)}
      >
        {isWideMode ? `Wide ${playerCount}` : selectedIndices.size > 0 ? `Next ${selectedIndices.size}` : 'Next'}
      </button>
      <div className='spacer' />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {dialog && (
        <Dialog
          title={dialog.title}
          message={dialog.message}
          inputValue={dialog.inputValue}
          isInput={dialog.isInput}
          onConfirm={dialog.onConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
