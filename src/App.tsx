import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import Home from '@/pages/Home';
import Editor from '@/pages/Editor';
import ConfigEditor from '@/pages/ConfigEditor';
import { Lobby } from '@/pages/Lobby';
import CreativeCenter from '@/pages/CreativeCenter';
import { safeStorage } from '@/lib/storage';
import { applyTheme } from '@/lib/themes';

function App() {
  useEffect(() => {
    // Apply theme on app mount to ensure persistence across refreshes
    const savedTheme = safeStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/creative-center" element={<CreativeCenter />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:roomId" element={<Editor />} />
          <Route path="/editor/invite-ed/:inviteId" element={<Editor isInvite={true} />} />
          <Route path="/config" element={<ConfigEditor />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
