import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Settings2, Sparkles, Wand2 } from 'lucide-react';
import api from '../lib/api';

export default function Playground() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('llama3.2');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(256);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setOutput('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_URL}/prompt/test-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          prompt,
          model,
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
              <label className="text-sm text-textMuted block mb-2">Model (e.g. gpt-3.5-turbo, llama3)</label>
              <input 
                type="text"
                value={model} 
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-white"
              />
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
