import { useState } from 'react';
import { Play, SplitSquareHorizontal } from 'lucide-react';
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
        const API_URL = import.meta.env.VITE_API_URL || '/api';
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
        <div className="flex items-center space-x-4">
          <input 
            type="text"
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            placeholder="Model (e.g. gpt-3.5-turbo, llama3)"
            className="w-48 bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-white"
          />
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
