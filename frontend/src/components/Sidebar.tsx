import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Beaker, GitCompare, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Playground', path: '/playground', icon: Beaker },
  { name: 'Compare', path: '/compare', icon: GitCompare },
  { name: 'History', path: '/history', icon: History },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 glass border-r border-border h-full flex flex-col z-10">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
          PromptLab AI
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors relative overflow-hidden",
                isActive ? "text-white" : "text-textMuted hover:text-white hover:bg-surfaceHighlight"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary/20 rounded-lg"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5 relative z-10" />
              <span className="font-medium relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
