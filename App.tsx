import React, { useState, useEffect, useRef } from 'react';
import { getStreamingResponse } from './services/geminiService';
import { Message, Sender } from './types';
import ChatBubble from './components/ChatBubble';
import ChatInput from './components/ChatInput';
import { BotIcon, PlusIcon, SunIcon, MoonIcon } from './constants';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const initializeChat = () => {
    setIsLoading(false);
    setError(null);
    setMessages([
      {
        id: `model-${Date.now()}`,
        sender: Sender.Model,
        text: "Hello! I'm NP Chatbot. How can I assist you today?",
      },
    ]);
  };
  
  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (userInput: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: Sender.User,
      text: userInput,
    };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const stream = getStreamingResponse(newMessages, abortControllerRef.current.signal);
      let fullResponse = '';
      const modelMessageId = `model-${Date.now()}`;
      let firstChunk = true;

      for await (const chunk of stream) {
        fullResponse += chunk;
        if (firstChunk) {
          setMessages(prev => [
            ...prev,
            { id: modelMessageId, sender: Sender.Model, text: fullResponse },
          ]);
          firstChunk = false;
        } else {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === modelMessageId ? { ...msg, text: fullResponse } : msg
            )
          );
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Request aborted by user.');
      } else {
        const errorMessage = e.message || 'An error occurred while fetching the response. Please try again.';
        setError(errorMessage);
        console.error(e);
        // Revert adding the user message if the API call fails
        setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleFeedback = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, feedback: msg.feedback === 'liked' ? undefined : 'liked' };
        }
        return msg;
      })
    );
  };
  
  const handleNewChat = () => {
    abortControllerRef.current?.abort();
    initializeChat();
  };
  
  const handleStop = () => {
    abortControllerRef.current?.abort();
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-sans transition-colors duration-300">
      <header className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10">
        <div className="w-10"></div> {/* Spacer */}
        <h1 className="text-xl font-bold text-center text-sky-500 dark:text-sky-400">NP Chatbot</h1>
        <div className="flex items-center gap-2">
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-sky-500 dark:hover:text-sky-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-800 focus:ring-sky-500"
                aria-label="Toggle theme"
            >
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <button
              onClick={handleNewChat}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-sky-500 dark:hover:text-sky-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-800 focus:ring-sky-500"
              aria-label="New Chat"
            >
              <PlusIcon />
            </button>
        </div>
      </header>
      <main className="flex-grow p-4 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map(msg => (
            <ChatBubble 
              key={msg.id} 
              message={msg}
              onFeedback={handleFeedback}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.sender === Sender.User && (
             <div className="flex items-start gap-3 w-full my-2 justify-start">
                 <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                     <BotIcon />
                 </div>
                 <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 self-start rounded-r-xl rounded-t-xl px-4 py-3">
                     <span className="h-2 w-2 bg-sky-500 dark:bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                     <span className="h-2 w-2 bg-sky-500 dark:bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                     <span className="h-2 w-2 bg-sky-500 dark:bg-sky-400 rounded-full animate-bounce"></span>
                 </div>
             </div>
          )}
          <div ref={messagesEndRef} />
          {error && (
            <div className="text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg text-center my-4">
              {error}
            </div>
          )}
        </div>
      </main>
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} onStop={handleStop} />
    </div>
  );
};

export default App;