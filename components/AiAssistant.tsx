
import React, { useState } from 'react';
import { askGemini } from '../services/geminiService';

const AiAssistant: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse(''); 
    try {
      const text = await askGemini(prompt);
      setResponse(text);
    } catch (error) {
      setResponse("Error generating response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
            <span className="text-2xl">✨</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">AI Assistant</h2>
            <p className="text-gray-500 text-sm">Generate text, draft emails, or ask questions about warehouse operations.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What would you like to generate?</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Write a safety memo for the forklift team, or summarize standard procedure for receiving goods..."
              className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className={`px-6 py-2 rounded-lg font-medium text-white shadow-sm transition-all flex items-center space-x-2 ${
                loading || !prompt.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>🪄</span>
                  <span>Generate Text</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {response && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in-up">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="text-indigo-600 mr-2">🤖</span> Generated Response
          </h3>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 prose max-w-none">
             <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-sans">
               {response}
             </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => {navigator.clipboard.writeText(response); alert('Copied to clipboard!');}}
              className="text-indigo-600 text-sm font-medium hover:text-indigo-800 flex items-center space-x-1"
            >
               <span>📋</span> <span>Copy to Clipboard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAssistant;
