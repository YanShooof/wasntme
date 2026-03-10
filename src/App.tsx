import { useState } from 'react';
import RoleSelector from './components/RoleSelector';
import RoleReveal from './components/RoleReveal';
import './App.css';

function App() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showReveal, setShowReveal] = useState(false);

  const handleStartGame = (roles: string[]) => {
    setSelectedRoles(roles);
    setShowReveal(true);
  };

  const handleBack = () => {
    setShowReveal(false);
  };

  return (
    <div className="app">
      <div style={{ display: !showReveal ? 'block' : 'none' }}>
        <RoleSelector onStart={handleStartGame} />
      </div>
      <div style={{ display: showReveal ? 'block' : 'none' }}>
        <RoleReveal roles={selectedRoles} onBack={handleBack} />
      </div>
    </div>
  );
}

export default App;
