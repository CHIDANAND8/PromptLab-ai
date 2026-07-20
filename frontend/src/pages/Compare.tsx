import { useState, useEffect } from 'react';
import { Play, SplitSquareHorizontal, RotateCcw, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { motion } from 'framer-motion';

export default function Compare() {
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [outputA, setOutputA] = useState('');
  const [outputB, setOutputB] = useState('');
  const [analysisA, setAnalysisA] = useState('');
  const [analysisB, setAnalysisB] = useState('');
  const [model, setModel] = useState('llama3.2');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/prompt/history');
        if (res.data && Array.isArray(res.data)) {
          setHistory(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    fetchHistory();
  }, []);

  const handleClear = () => {
    setPromptA('');
    setPromptB('');
    setOutputA('');
    setOutputB('');
    setAnalysisA('');
    setAnalysisB('');
    setHistoryIndex(-1);
  };

  const handlePreviousPrompt = () => {
    if (history.length === 0) return;
    const nextIndex = (historyIndex + 1) % history.length;
    const nextIndexB = (nextIndex + 1) % history.length;
    
    setPromptA(history[nextIndex].prompt_text);
    if (history[nextIndexB]) {
      setPromptB(history[nextIndexB].prompt_text);
    } else {
      setPromptB('');
    }
    
    if (history[nextIndex].model_used) {
      setModel(history[nextIndex].model_used);
    }
    setHistoryIndex(nextIndex);
  };

  const handleCompare = async () => {
    if (!promptA || !promptB) return;
    setLoading(true);
    setOutputA('');
    setOutputB('');
    setAnalysisA('');
    setAnalysisB('');

    const token = localStorage.getItem('token');
    
    const streamPrompt = async (promptText: string, setOutputCb: React.Dispatch<React.SetStateAction<string>>) => {
      let fullOutput = '';
      try {
        const API_URL = (import.meta as any).env.VITE_API_URL || 'https://promptlab-ai.onrender.com';
        const response = await fetch(`${API_URL}/prompt/test-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            prompt: promptText,
            model,
            temperature: 0.7,
            max_tokens: 256
          })
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullOutput += chunk;
            setOutputCb((prev) => prev + chunk);
          }
        }
      } catch (err) {
        setOutputCb("Error generating response.");
        fullOutput = "Error generating response.";
      }
      return fullOutput;
    };

    try {
      const [finalOutA, finalOutB] = await Promise.all([
        streamPrompt(promptA, setOutputA),
        streamPrompt(promptB, setOutputB)
      ]);

      if (finalOutA && finalOutB && !finalOutA.startsWith('Error') && !finalOutB.startsWith('Error')) {
        const evalRes = await api.post('/prompt/evaluate', {
          prompt_a: promptA,
          prompt_b: promptB,
          output_a: finalOutA,
          output_b: finalOutB
        });
        
        if (evalRes.data.analysis) {
          setAnalysisA(evalRes.data.analysis[0]);
          setAnalysisB(evalRes.data.analysis[1]);
        }
        
        setHistory((prev) => [
          {
            prompt_text: promptB,
            model_used: model
          },
          {
            prompt_text: promptA,
            model_used: model
          },
          ...prev
        ]);
        setHistoryIndex(-1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SplitSquareHorizontal className="w-6 h-6 text-primary" />
          A/B Testing
        </h1>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handlePreviousPrompt}
            disabled={history.length === 0}
            title="Load previous prompts"
            className="p-2.5 bg-surface hover:bg-surfaceHighlight border border-border text-textMuted hover:text-white rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!promptA && !promptB && !outputA && !outputB}
            title="Clear prompts & outputs"
            className="p-2.5 bg-surface hover:bg-red-500/10 border border-border hover:border-red-500/20 text-textMuted hover:text-red-400 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <select
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            className="w-48 bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-white appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '28px' }}
          >
            <optgroup label="Groq Cloud" className="bg-surface text-white">
              <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Groq)</option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Groq)</option>
              <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Groq)</option>
              <option value="gemma2-9b-it">gemma2-9b-it (Groq)</option>
            </optgroup>
            <optgroup label="OpenAI Cloud" className="bg-surface text-white">
              <option value="gpt-4o">gpt-4o (OpenAI)</option>
              <option value="gpt-4o-mini">gpt-4o-mini (OpenAI)</option>
              <option value="gpt-4">gpt-4 (OpenAI)</option>
              <option value="gpt-3.5-turbo">gpt-3.5-turbo (OpenAI)</option>
            </optgroup>
            <optgroup label="Local (Ollama)" className="bg-surface text-white">
              <option value="llama3.2">llama3.2 (Ollama)</option>
              <option value="qwen2.5:1.5b">qwen2.5:1.5b (Ollama)</option>
              <option value="llava">llava (Ollama)</option>
              <option value="nomic-embed-text">nomic-embed-text (Ollama)</option>
            </optgroup>
          </select>
          <button
            onClick={handleCompare}
            disabled={loading || !promptA || !promptB}
            className="flex items-center space-x-2 px-6 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Play className="w-4 h-4" />}
            <span>Run Comparison</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        {/* Version A */}
        <div className="flex flex-col space-y-4">
          <div className="glass rounded-xl border border-border p-4 flex flex-col h-1/2">
            <h3 className="font-medium text-blue-400 mb-2">Prompt A</h3>
            <textarea
              value={promptA}
              onChange={(e) => setPromptA(e.target.value)}
              placeholder="Enter first prompt variation..."
              className="flex-1 bg-transparent resize-none focus:outline-none text-white text-sm"
            />
          </div>
          <div className="glass rounded-xl border border-border p-4 flex flex-col h-1/2 overflow-hidden">
            <h3 className="font-medium text-gray-400 mb-2">Output A</h3>
            <div className="flex-1 overflow-auto text-sm text-gray-300 whitespace-pre-wrap">
              {(loading && !outputA) ? (
                <div className="animate-pulse space-y-2"><div className="h-4 bg-surfaceHighlight rounded w-3/4"></div></div>
              ) : outputA ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="mb-4">{outputA}</div>
                  {analysisA && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg whitespace-pre-wrap">{analysisA}</div>}
                </motion.div>
              ) : (
                <span className="text-textMuted">Output will appear here...</span>
              )}
            </div>
          </div>
        </div>

        {/* Version B */}
        <div className="flex flex-col space-y-4">
          <div className="glass rounded-xl border border-border p-4 flex flex-col h-1/2">
            <h3 className="font-medium text-purple-400 mb-2">Prompt B</h3>
            <textarea
              value={promptB}
              onChange={(e) => setPromptB(e.target.value)}
              placeholder="Enter second prompt variation..."
              className="flex-1 bg-transparent resize-none focus:outline-none text-white text-sm"
            />
          </div>
          <div className="glass rounded-xl border border-border p-4 flex flex-col h-1/2 overflow-hidden">
            <h3 className="font-medium text-gray-400 mb-2">Output B</h3>
            <div className="flex-1 overflow-auto text-sm text-gray-300 whitespace-pre-wrap">
              {(loading && !outputB) ? (
                <div className="animate-pulse space-y-2"><div className="h-4 bg-surfaceHighlight rounded w-3/4"></div></div>
              ) : outputB ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="mb-4">{outputB}</div>
                  {analysisB && <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-200 rounded-lg whitespace-pre-wrap">{analysisB}</div>}
                </motion.div>
              ) : (
                <span className="text-textMuted">Output will appear here...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
