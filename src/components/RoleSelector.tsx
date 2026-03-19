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
  const isPressingRef = useRef(false);
  const hasFiredRef = useRef(false);
  const ignoreMouseRef = useRef(false);
  const ignoreMouseTimeoutRef = useRef<number | undefined>(undefined);
  const SCROLL_THRESHOLD = 10;

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  const finishPress = () => {
    clearTimer();
    pointerStartRef.current = null;
    isPressingRef.current = false;
    hasFiredRef.current = false;
  };

  const markTouchInteraction = () => {
    ignoreMouseRef.current = true;
    if (ignoreMouseTimeoutRef.current) {
      clearTimeout(ignoreMouseTimeoutRef.current);
    }
    ignoreMouseTimeoutRef.current = window.setTimeout(() => {
      ignoreMouseRef.current = false;
      ignoreMouseTimeoutRef.current = undefined;
    }, 800);
  };

  const startPress = (e: React.PointerEvent) => {
    if (isPressingRef.current) return;

    clearTimer();
    isPressingRef.current = true;
    hasFiredRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };

    timerRef.current = window.setTimeout(() => {
      if (!isPressingRef.current || hasFiredRef.current) return;
      hasFiredRef.current = true;
      callbackRef.current();
      timerRef.current = undefined;
    }, ms);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    
    if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) {
      finishPress();
    }
  };

  useEffect(() => {
    return () => {
      finishPress();
      if (ignoreMouseTimeoutRef.current) {
        clearTimeout(ignoreMouseTimeoutRef.current);
      }
    };
  }, []);

  return {
    onMouseDown: (e: React.MouseEvent) => {
      if (ignoreMouseRef.current) return;
      startPress(e as unknown as React.PointerEvent);
    },
    onMouseUp: () => {
      if (ignoreMouseRef.current) return;
      finishPress();
    },
    onMouseLeave: () => {
      if (ignoreMouseRef.current) return;
      finishPress();
    },
    onMouseMove: (e: React.MouseEvent) => {
      if (ignoreMouseRef.current) return;
      onPointerMove(e as unknown as React.PointerEvent);
    },
    onTouchStart: (e: React.TouchEvent) => {
      markTouchInteraction();
      const touch = e.touches[0];
      startPress({ clientX: touch.clientX, clientY: touch.clientY } as unknown as React.PointerEvent);
    },
    onTouchEnd: () => {
      markTouchInteraction();
      finishPress();
    },
    onTouchCancel: () => {
      markTouchInteraction();
      finishPress();
    },
    onTouchMove: (e: React.TouchEvent) => {
      markTouchInteraction();
      const touch = e.touches[0];
      onPointerMove({ clientX: touch.clientX, clientY: touch.clientY } as unknown as React.PointerEvent);
    },
  };
};

export default function RoleSelector({ onStart }: RoleSelectorProps) {
  const HAPTIC_CONTEXT_CLICK = 10;
  const HAPTIC_LONG_PRESS = 14;
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
    hideCancel?: boolean;
    formatPrefixBold?: boolean;
    hideActions?: boolean;
    largeMessage?: boolean;
    onConfirm: (value?: string) => void;
  } | null>(null);
  
  const pointerStateRef = useRef<Map<number, { x: number; y: number; index: number; scrolling: boolean }>>(new Map());
  const longPressConsumedRef = useRef<Set<number>>(new Set());
  const pendingEditLongPressRef = useRef<{ index: number; role: string } | null>(null);
  const nextLongPressConsumedRef = useRef(false);
  const lastNextLongPressAtRef = useRef(0);
  const SCROLL_THRESHOLD = 10;

  const vibrateTap = (pattern: number | number[] = HAPTIC_CONTEXT_CLICK) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
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

    if (isWideMode && playerCount > newSelected.size) {
      setIsWideMode(false);
      setPlayerCount(0);
    }

    setSelectedIndices(newSelected);
  };

  const handleRolePointerDown = (index: number, e: React.PointerEvent) => {
    longPressConsumedRef.current.delete(index);
    pendingEditLongPressRef.current = null;
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

    if (longPressConsumedRef.current.has(index)) {
      longPressConsumedRef.current.delete(index);

      const pendingEdit = pendingEditLongPressRef.current;
      if (pendingEdit && pendingEdit.index === index) {
        pendingEditLongPressRef.current = null;
        promptForRoleName(pendingEdit.index, pendingEdit.role);
      }

      return;
    }
    
    if (state && !state.scrolling && state.index === index) {
      toggleRole(index);
    }
  };

  const handleRoleEdit = (index: number, newName: string) => {
    const updated = [...customRoles];
    updated[index] = newName;
    setCustomRoles(updated);
    localStorage.setItem('customRoles', JSON.stringify(updated));
    setSelectedIndices(prev => {
      const newSelected = new Set(prev);
      newSelected.add(index);
      return newSelected;
    });
  };

  const handleReset = () => {
    vibrateTap();
    setCustomRoles([...defaultRoles]);
    setSelectedIndices(new Set());
    setIsWideMode(false);
    setPlayerCount(0);
    localStorage.setItem('customRoles', JSON.stringify(defaultRoles));
    setToast('Reset');
  };

  const handleStart = () => {
    if (nextLongPressConsumedRef.current) {
      nextLongPressConsumedRef.current = false;
      return;
    }

    vibrateTap();
    if (!isWideMode) {
      if (selectedIndices.size < 3 || selectedIndices.size > 15) {
        return;
      }
    } else {
      if (playerCount < 3 || playerCount > selectedIndices.size) {
        return;
      }
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
    const now = Date.now();
    if (now - lastNextLongPressAtRef.current < 700) {
      return;
    }
    lastNextLongPressAtRef.current = now;

    if (!isWideMode && selectedIndices.size > 15) {
      return;
    }

    nextLongPressConsumedRef.current = true;
    vibrateTap(HAPTIC_LONG_PRESS);
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
      hideCancel: true,
      formatPrefixBold: true,
      hideActions: true,
      largeMessage: true,
      onConfirm: () => setDialog(null),
    });
  };

  const handleRoleLongPress = (role: string, index: number) => {
    vibrateTap(HAPTIC_LONG_PRESS);
    longPressConsumedRef.current.add(index);
    if (isEditMode) {
      pendingEditLongPressRef.current = { index, role };
    } else {
      showRuleExplanation(role);
    }
  };

  const promptForRoleName = (index: number, currentName: string) => {
    setDialog({
      title: `Change ${currentName} to:`,
      inputValue: currentName,
      isInput: true,
      confirmText: 'Set',
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
  const nextButtonStyle = isWideMode
    ? { backgroundColor: '#fff', color: '#000' }
    : isNextEnabled
      ? { backgroundColor: '#888', color: '#000' }
      : { backgroundColor: '#888', color: '#444' };

  return (
    <div className='role-selector'>
      <div className='top-controls'>
        {isEditMode && (
          <>
            <button className='text-button' onClick={handleReset}>Reset</button>
          </>
        )}

        <div className='spacer' />

        <button
          className='icon-button'
          onClick={() => {
            vibrateTap(HAPTIC_CONTEXT_CLICK);
            setIsEditMode(!isEditMode);
          }}
        >
          <img
            src={isEditMode ? `${import.meta.env.BASE_URL}settings.svg` : `${import.meta.env.BASE_URL}library-books.svg`}
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
              onSelectStart={(e) => e.preventDefault()}
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
                  src={`${import.meta.env.BASE_URL}icons/${iconPath}`} 
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
        style={nextButtonStyle}
        disabled={!isNextEnabled && !isWideMode}
        onPointerDown={() => {
          nextLongPressConsumedRef.current = false;
        }}
        onClick={handleStart}
        onSelectStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        {...useLongPress(handleLongPressNext)}
      >
        {isWideMode ? `Next ${playerCount}` : selectedIndices.size > 0 ? `Next ${selectedIndices.size}` : 'Next'}
      </button>
      <div className='spacer' />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {dialog && (
        <Dialog
          title={dialog.title}
          message={dialog.message}
          inputValue={dialog.inputValue}
          isInput={dialog.isInput}
          hideCancel={dialog.hideCancel}
          formatPrefixBold={dialog.formatPrefixBold}
          hideActions={dialog.hideActions}
          largeMessage={dialog.largeMessage}
          onConfirm={dialog.onConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
