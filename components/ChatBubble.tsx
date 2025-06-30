import React, { useState, useEffect } from 'react';
import { Message, Sender } from '../types';
import { 
  UserIcon, 
  BotIcon,
  ThumbUpIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ShareIcon
} from '../constants';

interface ChatBubbleProps {
  message: Message;
  onFeedback: (messageId: string) => void;
}

const ActionButton: React.FC<React.PropsWithChildren<{ onClick: () => void; 'aria-label': string; tooltip: string; active?: boolean }>> = ({ children, active, tooltip, ...props }) => (
    <div className="relative group flex items-center">
        <button 
            {...props}
            className={`p-1.5 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-sky-500 ${active ? 'text-sky-500 bg-sky-100 dark:text-sky-400 dark:bg-slate-700' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
            {children}
        </button>
        <div className="absolute bottom-full mb-2 w-max bg-slate-800 dark:bg-slate-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-lg z-20">
            {tooltip}
        </div>
    </div>
);


const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onFeedback }) => {
  const isUser = message.sender === Sender.User;
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Clean the text by removing markdown bold asterisks.
  const cleanText = message.text.replace(/\*\*/g, '');

  useEffect(() => {
    // Check for Web Share API support on mount
    if (navigator.share) {
      setCanShare(true);
    }

    // Cleanup speech synthesis on component unmount
    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false); // Handle potential errors
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'NP Chatbot Response',
          text: cleanText,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const bubbleClasses = isUser
    ? 'bg-sky-500 text-white self-end rounded-l-xl rounded-t-xl'
    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 self-start rounded-r-xl rounded-t-xl';

  const containerClasses = isUser ? 'justify-end' : 'justify-start';

  const Icon = isUser ? UserIcon : BotIcon;
  const iconContainerClasses = isUser
    ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-white'
    : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-white';

  return (
    <div className={`flex items-start gap-3 w-full ${containerClasses}`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconContainerClasses}`}>
          <Icon />
        </div>
      )}
      <div className="flex flex-col w-full max-w-[85%] md:max-w-[75%]">
        <div
          className={`px-4 py-3 ${bubbleClasses} text-base whitespace-pre-wrap leading-relaxed shadow-sm`}
        >
          {cleanText}
        </div>
        {!isUser && message.text && (
            <div className="mt-2 flex items-center gap-1.5">
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-sky-500"
                    aria-label={isCopied ? "Copied" : "Copy text"}
                >
                    {isCopied ? (
                        <svg className="w-5 h-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                    )}
                    <span className="text-sm font-medium">{isCopied ? "Copied!" : "Copy"}</span>
                </button>
                <ActionButton onClick={() => onFeedback(message.id)} aria-label="Like response" active={message.feedback === 'liked'} tooltip={message.feedback === 'liked' ? "Unlike" : "Like"}>
                    <ThumbUpIcon />
                </ActionButton>
                <ActionButton onClick={handleSpeak} aria-label={isSpeaking ? "Stop speaking" : "Read text aloud"} tooltip={isSpeaking ? "Stop" : "Speak"}>
                    {isSpeaking ? <SpeakerXMarkIcon /> : <SpeakerWaveIcon />}
                </ActionButton>
                {canShare && (
                  <ActionButton onClick={handleShare} aria-label="Share response" tooltip="Share">
                      <ShareIcon />
                  </ActionButton>
                )}
            </div>
        )}
      </div>
      {isUser && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconContainerClasses}`}>
          <Icon />
        </div>
      )}
    </div>
  );
};

export default ChatBubble;