import { useStore } from '../store/useStore';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 glass border-b border-border flex items-center justify-between px-6 z-10">
      <div className="text-sm text-textMuted">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
        System Online
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-textMuted">
          <User className="w-4 h-4" />
          <span>{user?.username || 'Guest'}</span>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 hover:bg-surfaceHighlight rounded-lg text-textMuted hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
