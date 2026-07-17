import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Settings2, Sparkles, Wand2, RotateCcw, Trash2 } from 'lucide-react';
import api from '../lib/api';

export default function Playground() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('llama3.2:latest');
  const [customModel, setCustomModel] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(256);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const getActiveModel = () => {
    return isCustomModel ? customModel : model;
  };

  useEffect(() => {
    const localHist = localStorage.getItem('playground_history');
    if (localHist) {
      try {
        setHistory(JSON.parse(localHist));
      } catch (err) {
        console.error("Failed to parse local playground history:", err);
      }
    }
  }, []);

  const handleClear = () => {
    setPrompt('');
    setOutput('');
    setHistoryIndex(-1);
  };

  const handlePreviousPrompt = () => {
    if (history.length === 0) return;
    const nextIndex = (historyIndex + 1) % history.length;
    setPrompt(history[nextIndex].prompt_text);

    const historicalModel = history[nextIndex].model_used || 'llama3.2:latest';
    const presets = [
      'llama3.2:latest', 'qwen2.5:1.5b', 'llava:latest', 'nomic-embed-text:latest',
      'llama-3.3-70b-versatile', 'llama-3.1-8b-instant',
      'gpt-3.5-turbo', 'gpt-4o', 'gpt-4-turbo'
    ];
    if (presets.includes(historicalModel)) {
      setIsCustomModel(false);
      setModel(historicalModel);
    } else {
      setIsCustomModel(true);
      setCustomModel(historicalModel);
    }

    if (history[nextIndex].temperature) setTemperature(history[nextIndex].temperature);
    if (history[nextIndex].max_tokens) setMaxTokens(history[nextIndex].max_tokens);
    setHistoryIndex(nextIndex);
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setOutput('');
    try {
      const API_URL = (import.meta as any).env.VITE_API_URL || 'https://promptlab-ai.onrender.com';
      const response = await fetch(`${API_URL}/prompt/test-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          prompt,
          model: getActiveModel(),
          temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        setLoading(false); // Hide loading pulse, start showing streamed text
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          setOutput((prev) => prev + decoder.decode(value, { stream: true }));
        }
        setHistory((prev) => {
          const updated = [
            {
              prompt_text: prompt,
              model_used: getActiveModel(),
              temperature,
              max_tokens: maxTokens
            },
            ...prev
          ];
          localStorage.setItem('playground_history', JSON.stringify(updated))
          return updated;
        });
        setHistoryIndex(-1);
      }
    } catch (err) {
      setOutput("Error generating response. Please make sure backend is connected.");
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    if (!prompt) return;
    setImproving(true);
    try {
      const res = await api.post('/prompt/suggest', { prompt });
      setPrompt(res.data.suggestion);
    } catch (err) {
      // Mock if backend not ready
      setTimeout(() => {
        setPrompt("You are an expert assistant. " + prompt);
        setImproving(false);
      }, 1000);
    } finally {
      setImproving(false);
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Input Section */}
      <div className="flex-1 flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Playground</h1>
          <button 
            onClick={handleImprove}
            disabled={improving || !prompt}
            className="flex items-center space-x-2 px-3 py-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors border border-purple-500/20"
          >
            {improving ? <span className="animate-spin w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full" /> : <Wand2 className="w-4 h-4" />}
            <span className="text-sm font-medium">Auto Improve</span>
          </button>
        </div>
        
        <div className="flex-1 glass rounded-xl border border-border flex flex-col overflow-hidden">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            className="flex-1 bg-transparent p-4 resize-none focus:outline-none text-white"
          />
          <div className="p-4 border-t border-border bg-surface flex justify-between items-center">
            <span className="text-sm text-textMuted">{prompt.length} characters</span>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className="flex items-center space-x-2 px-6 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Play className="w-4 h-4" />}
              <span>Generate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Output & Settings Section */}
      <div className="w-80 flex flex-col space-y-6">
        <div className="glass p-4 rounded-xl border border-border">
          <div className="flex items-center space-x-2 mb-4">
            <Settings2 className="w-5 h-5 text-textMuted" />
            <h3 className="font-medium">Parameters</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-textMuted block mb-2">Model</label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePreviousPrompt}
                  disabled={history.length === 0}
                  title="Load previous prompt"
                  className="p-2 bg-surface hover:bg-surfaceHighlight border border-border text-textMuted hover:text-white rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                >
                  <RotateCcw className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={!prompt && !output}
                  title="Clear playground"
                  className="p-2 bg-surface hover:bg-red-500/10 border border-border hover:border-red-500/20 text-textMuted hover:text-red-400 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
                {!isCustomModel ? (
                  <select
                    value={model}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomModel(true);
                      } else {
                        setModel(e.target.value);
                      }
                    }}
                    className="flex-1 min-w-0 bg-surface border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-primary text-white cursor-pointer"
                  >
                    <optgroup label="Local Ollama Models">
                      <option value="llama3.2:latest">Llama 3.2 (Local)</option>
                      <option value="qwen2.5:1.5b">Qwen 2.5 1.5B (Local)</option>
                      <option value="llava:latest">LLaVA Vision (Local)</option>
                      <option value="nomic-embed-text:latest">Nomic Embed (Local)</option>
                    </optgroup>
                    <optgroup label="Groq Cloud Models">
                      <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Groq)</option>
                      <option value="llama-3.1-8b-instant">Llama 3.1 8B (Groq)</option>
                    </optgroup>
                    <optgroup label="OpenAI Cloud Models">
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    </optgroup>
                    <option value="custom">✍️ Custom Model...</option>
                  </select>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="Custom model ID..."
                      className="flex-1 min-w-0 bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomModel(false);
                        setModel('llama3.2:latest');
                      }}
                      className="text-xs bg-surface border border-border hover:bg-surfaceHighlight text-textMuted hover:text-white px-2 rounded-lg transition-colors shrink-0"
                    >
                      Presets
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-textMuted">Temperature</label>
                <span className="text-sm">{temperature}</span>
              </div>
              <input 
                type="range" min="0" max="2" step="0.1" 
                value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-primary" 
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-textMuted">Max Tokens</label>
                <span className="text-sm">{maxTokens}</span>
              </div>
              <input 
                type="range" min="1" max="4096" step="1" 
                value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-primary" 
              />
            </div>
          </div>
        </div>

        <div className="flex-1 glass rounded-xl border border-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex items-center space-x-2 bg-surface">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h3 className="font-medium">Output</h3>
          </div>
          <div className="flex-1 p-4 overflow-auto whitespace-pre-wrap text-sm text-gray-300">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-surfaceHighlight rounded w-3/4"></div>
                <div className="h-4 bg-surfaceHighlight rounded w-full"></div>
                <div className="h-4 bg-surfaceHighlight rounded w-5/6"></div>
              </div>
            ) : output ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {output}
              </motion.div>
            ) : (
              <span className="text-textMuted">Generated output will appear here...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
