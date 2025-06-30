import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, StopIcon } from '../constants';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onStop: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, onStop }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height to recalculate
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent adding a new line
        handleSubmit(e);
    }
  }
  
  const hasInput = input.trim().length > 0;

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <div className="max-w-3xl mx-auto">
            {isLoading && (
                 <button 
                    onClick={onStop}
                    className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <StopIcon/>
                    Stop Generating
                </button>
            )}
            <form onSubmit={handleSubmit} className="relative flex items-end gap-3">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask NP Chatbot anything..."
                    disabled={isLoading}
                    className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 rounded-lg pr-14 pl-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all disabled:opacity-50 max-h-48 overflow-y-auto no-scrollbar"
                    rows={1}
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={isLoading || !hasInput}
                    className={`
                        absolute right-2 bottom-2 p-2 rounded-full
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-700 focus:ring-sky-500
                        transition-all duration-200 ease-in-out transform
                        disabled:scale-100 disabled:cursor-not-allowed
                        ${hasInput && !isLoading
                        ? 'bg-sky-500 dark:bg-sky-600 text-white shadow-md hover:bg-sky-600 dark:hover:bg-sky-500 hover:scale-110 active:scale-95'
                        : 'bg-slate-200 dark:bg-slate-600 text-slate-400 dark:text-slate-400 scale-0'
                        }
                    `}
                    aria-label="Send message"
                >
                    <SendIcon />
                </button>
            </form>
        </div>
    </div>
  );
};

export default ChatInput;