import { useEffect, useState } from 'react';
import { Search, Calendar, Star } from 'lucide-react';
import api from '../lib/api';
import { motion } from 'framer-motion';

export default function History() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/prompt/history');
        setHistory(res.data);
      } catch (err) {
        // Mock data
        setHistory([
          { id: 1, prompt_text: "Write a React component for a button.", output: "```jsx\nconst Button = () => <button>Click me</button>;\n```", model_used: "gpt-3.5-turbo", created_at: new Date().toISOString() },
          { id: 2, prompt_text: "Explain quantum computing in simple terms.", output: "Quantum computing uses qubits...", model_used: "gpt-4", created_at: new Date(Date.now() - 86400000).toISOString() }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filtered = history.filter(h => h.prompt_text.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Prompt History</h1>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary w-64"
          />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-10"><span className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-textMuted glass rounded-xl border border-border">No prompts found.</div>
        ) : (
          filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl border border-border p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3 text-sm text-textMuted">
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {new Date(item.created_at).toLocaleDateString()}</span>
                  <span className="px-2 py-0.5 bg-surfaceHighlight rounded text-xs">{item.model_used}</span>
                </div>
                <button className="text-textMuted hover:text-yellow-500 transition-colors">
                  <Star className="w-5 h-5" />
                </button>
              </div>
              <p className="font-medium mb-3 text-white line-clamp-2">{item.prompt_text}</p>
              <div className="bg-surface p-3 rounded-lg text-sm text-gray-400 line-clamp-3 font-mono">
                {item.output}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
