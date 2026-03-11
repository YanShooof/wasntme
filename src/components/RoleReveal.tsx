import { useState, useEffect, useRef } from 'react';
import { roleIcons } from '../data/roles';
import Toast from './Toast';
import Dialog from './Dialog';
import './RoleReveal.css';

interface RoleRevealProps {
  roles: string[];
  onBack: () => void;
}

export default function RoleReveal({ roles, onBack }: RoleRevealProps) {
  const [players, setPlayers] = useState<string[]>([]);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [currentlyPressedIndices, setCurrentlyPressedIndices] = useState<Set<number>>(new Set());
  const [showPlayerEdit, setShowPlayerEdit] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [passwordDialog, setPasswordDialog] = useState(false);

  // Pointer → card index mapping (pointerId is unique per finger/mouse)
  const pointerToCardRef = useRef<Map<number, number>>(new Map());
  const revealedIndicesRef = useRef<Set<number>>(new Set());
  const finalizePointerRef = useRef<(pointerId: number) => void>(() => {});

  // Keep ref in sync with state
  useEffect(() => {
    revealedIndicesRef.current = revealedIndices;
  }, [revealedIndices]);

  // Load player names
  useEffect(() => {
    const saved = localStorage.getItem('playerNames');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPlayers(parsed.slice(0, roles.length));
        return;
      } catch (e) {
        console.error('Failed to load players:', e);
      }
    }
    const defaultNames = Array.from({ length: roles.length }, (_, i) => `Player ${i + 1}`);
    setPlayers(defaultNames);
  }, [roles.length]);

  // Reset on new game
  useEffect(() => {
    setRevealedIndices(new Set());
    setCurrentlyPressedIndices(new Set());
    pointerToCardRef.current.clear();
  }, [roles]);

  const vibrateTap = (ms = 20) => { navigator.vibrate?.(ms); };

  const finalizePointer = (pointerId: number) => {
    const index = pointerToCardRef.current.get(pointerId);
    if (index === undefined) return;
    pointerToCardRef.current.delete(pointerId);
    if (revealedIndicesRef.current.has(index)) return;
    const stillPressed = Array.from(pointerToCardRef.current.values()).includes(index);
    if (!stillPressed) {
      setCurrentlyPressedIndices(prev => { const s = new Set(prev); s.delete(index); return s; });
      setRevealedIndices(prev => { const s = new Set(prev); s.add(index); return s; });
    }
  };

  finalizePointerRef.current = finalizePointer;

  useEffect(() => {
    const handleWindowPointerUp = (e: PointerEvent) => {
      finalizePointerRef.current(e.pointerId);
    };

    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, []);

  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    if (revealedIndicesRef.current.has(index)) return;
    // Capture pointer so pointerup ALWAYS fires on this element
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerToCardRef.current.set(e.pointerId, index);
    setCurrentlyPressedIndices(prev => { const s = new Set(prev); s.add(index); return s; });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    finalizePointer(e.pointerId);
  };

  const handlePasswordConfirm = (password?: string) => {
    setPasswordDialog(false);
    if (password === '89') {
      setRevealedIndices(new Set());
      setCurrentlyPressedIndices(new Set());
      pointerToCardRef.current.clear();
      setToast('Correct');
    } else if (password) {
      setToast('Wrong');
    }
  };

  const handleSavePlayers = (newNames: string[]) => {
    setPlayers(newNames);
    localStorage.setItem('playerNames', JSON.stringify(newNames));
    setShowPlayerEdit(false);
  };

  const handleResetPlayers = () => {
    const defaultNames = Array.from({ length: roles.length }, (_, i) => `Player ${i + 1}`);
    setPlayers(defaultNames);
    localStorage.setItem('playerNames', JSON.stringify(defaultNames));
  };

  const handlePlayerEdit = () => {
    vibrateTap();
    setShowPlayerEdit(true);
  };

  const primaryRoles = roles.slice(0, 12);
  const extraRoles = roles.slice(12, 15);

  return (
    <div className="role-reveal">
      <div className="reveal-header">
        <button
          className="back-button"
          onClick={() => { vibrateTap(); onBack(); }}
        >
          Back
        </button>
        <div className="spacer" />
        <button className="icon-button" onClick={handlePlayerEdit}>
          <img src={`${import.meta.env.BASE_URL}settings.svg`} alt="Settings" className="header-icon" />
        </button>
      </div>

      <div className="spacer" />
      <div className="retry-anchor">
        <button
          className="retry-button retry-floating"
          disabled={revealedIndices.size === 0}
          onClick={() => { vibrateTap(); setPasswordDialog(true); }}
        >
          Retry
        </button>
      </div>
      <div className="spacer" />

      <div className="reveal-grid-stack">
        <div className="reveal-grid">
          {primaryRoles.map((role, index) => {
            const actualIndex = index;
            const isRevealed = revealedIndices.has(actualIndex);
            const isCurrentlyPressed = currentlyPressedIndices.has(actualIndex);
            const iconPath = roleIcons[role.toLowerCase()];
            const playerName = players[actualIndex] || `Player ${actualIndex + 1}`;

            return (
              <div
                key={actualIndex}
                className={`reveal-card ${isRevealed ? 'disabled' : 'active'}`}
                onPointerDown={(e) => handlePointerDown(actualIndex, e)}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onLostPointerCapture={handlePointerUp}
                onContextMenu={(e) => e.preventDefault()}
              >
                {isCurrentlyPressed ? (
                  <>
                    {iconPath && (
                      <img
                        src={`${import.meta.env.BASE_URL}icons/${iconPath}`}
                        alt={role}
                        className="reveal-icon"
                      />
                    )}
                    <div className="reveal-name">{role}</div>
                  </>
                ) : (
                  <div className={`player-name ${isRevealed ? 'grayed' : ''}`}>{playerName}</div>
                )}
              </div>
            );
          })}
        </div>

        {extraRoles.length > 0 && (
          <div className="reveal-extra-row reveal-extra-row-overlay">
            {extraRoles.map((role, index) => {
              const actualIndex = index + 12;
              const isRevealed = revealedIndices.has(actualIndex);
              const isCurrentlyPressed = currentlyPressedIndices.has(actualIndex);
              const iconPath = roleIcons[role.toLowerCase()];
              const playerName = players[actualIndex] || `Player ${actualIndex + 1}`;

              return (
                <div
                  key={actualIndex}
                  className={`reveal-card ${isRevealed ? 'disabled' : 'active'}`}
                  onPointerDown={(e) => handlePointerDown(actualIndex, e)}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onLostPointerCapture={handlePointerUp}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {isCurrentlyPressed ? (
                    <>
                      {iconPath && (
                        <img
                          src={`${import.meta.env.BASE_URL}icons/${iconPath}`}
                          alt={role}
                          className="reveal-icon"
                        />
                      )}
                      <div className="reveal-name">{role}</div>
                    </>
                  ) : (
                    <div className={`player-name ${isRevealed ? 'grayed' : ''}`}>{playerName}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="spacer" />
      <button className="retry-button retry-placeholder" tabIndex={-1} aria-hidden="true">
        Retry
      </button>
      <div className="spacer" />

      {showPlayerEdit && (
        <PlayerEditModal
          players={players}
          onSave={handleSavePlayers}
          onReset={handleResetPlayers}
          onClose={() => setShowPlayerEdit(false)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {passwordDialog && (
        <Dialog
          title="Enter Password"
          isInput={true}
          inputValue=""
          onConfirm={handlePasswordConfirm}
          onCancel={() => setPasswordDialog(false)}
        />
      )}
    </div>
  );
}

interface PlayerEditModalProps {
  players: string[];
  onSave: (players: string[]) => void;
  onReset: () => void;
  onClose: () => void;
}

function PlayerEditModal({ players, onSave, onReset, onClose }: PlayerEditModalProps) {
  const [editedPlayers, setEditedPlayers] = useState([...players]);

  const vibrateTap = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const handleResetClick = () => {
    vibrateTap(12);
    const defaultNames = Array.from({ length: editedPlayers.length }, (_, i) => `Player ${i + 1}`);
    setEditedPlayers(defaultNames);
    onReset();
  };

  const handleCancel = () => {
    vibrateTap(12);
    onClose();
  };

  const handleAdd = () => {
    vibrateTap([12, 18, 12]);
    onSave(editedPlayers);
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content player-edit" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, flex: 1 }}>Add players</h2>
          <button className="icon-button" onClick={handleResetClick}>
            <img src={`${import.meta.env.BASE_URL}reset.svg`} alt="Reset" className="header-icon" />
          </button>
        </div>
        <div className="player-inputs">
          {editedPlayers.map((name, index) => (
            <input
              key={index}
              type="text"
              value={name}
              onChange={(e) => {
                const newPlayers = [...editedPlayers];
                newPlayers[index] = e.target.value;
                setEditedPlayers(newPlayers);
              }}
              placeholder={`Player ${index + 1}`}
              maxLength={15}
            />
          ))}
        </div>
        <div className="modal-buttons">
          <button type="button" onClick={handleCancel}>Cancel</button>
          <button onClick={handleAdd}>Add</button>
        </div>
      </div>
    </div>
  );
}
