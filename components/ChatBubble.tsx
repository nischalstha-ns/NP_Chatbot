import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Sender } from '../types';
import { 
  UserIcon, 
  BotIcon,
  ThumbUpIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ShareIcon,
  ClipboardIcon,
  CheckIcon
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

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(code).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div className="bg-slate-800 dark:bg-black/70 rounded-lg font-mono text-sm shadow-inner overflow-hidden my-4">
            <div className="flex justify-between items-center px-4 py-2 bg-slate-700/50 dark:bg-black/50 text-xs text-slate-300 dark:text-slate-400 border-b border-slate-600/50 dark:border-slate-800/60">
                <span className="font-sans font-medium capitalize">{language || 'code'}</span>
                <button 
                    onClick={handleCopyCode} 
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-slate-300 dark:text-slate-400 hover:bg-slate-600/50 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 dark:focus:ring-offset-black/70 focus:ring-sky-500"
                    aria-label="Copy code"
                >
                    {isCopied ? <CheckIcon /> : <ClipboardIcon />}
                    <span className="text-xs font-sans font-medium">{isCopied ? 'Copied!' : 'Copy'}</span>
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-slate-50">
                <code>{code}</code>
            </pre>
        </div>
    );
};


const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onFeedback }) => {
  const isUser = message.sender === Sender.User;
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [hasCode, setHasCode] = useState(false);

  useEffect(() => {
    if (navigator.share) {
      setCanShare(true);
    }
    const codeBlockRegex = /```/g;
    setHasCode(codeBlockRegex.test(message.text));

    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [message.text]);
  
  const stripMarkdown = (markdownText: string): string => {
    let text = markdownText;
    text = text.replace(/```[\s\S]*?```/g, ' (Code block). ');
    text = text.replace(/`([^`]+)`/g, '$1');
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');
    text = text.replace(/!\[(.*?)\]\(.*?\)/g, '$1');
    text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    text = text.replace(/^#+\s/gm, '');
    text = text.replace(/(\n\s*){2,}/g, '\n');
    return text.trim();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textForSpeech = stripMarkdown(message.text);
      if (textForSpeech) {
        const utterance = new SpeechSynthesisUtterance(textForSpeech);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'NP Chatbot Response',
          text: message.text,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const markdownComponents = {
      code({node, inline, className, children, ...props}: any) {
          const match = /language-(\w+)/.exec(className || '');
          if (!inline && match) {
              return <CodeBlock language={match[1]} code={String(children).trim()} />;
          }
          return (
              <code 
                className="bg-slate-200 dark:bg-slate-600/50 rounded-md px-1.5 py-1 font-mono text-sm" 
                {...props}
              >
                  {children}
              </code>
          );
      },
      a: ({node, ...props}: any) => <a className="text-sky-500 dark:text-sky-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc list-outside ml-5 my-2 space-y-1" {...props} />,
      ol: ({node, ...props}: any) => <ol className="list-decimal list-outside ml-5 my-2 space-y-1" {...props} />,
      p: ({ node, children }: any) => {
        if (node.children[0]?.tagName === 'code' && /language-/.test(node.children[0].properties?.className?.join(' '))) {
          return <>{children}</>;
        }
        return <p className="mb-2 last:mb-0">{children}</p>;
      },
  };
  
  const bubbleClasses = isUser
    ? 'bg-sky-500 text-white self-end rounded-l-xl rounded-t-xl px-4 py-3'
    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 self-start rounded-r-xl rounded-t-xl px-4 py-3';

  const containerClasses = isUser ? 'justify-end' : 'justify-start';

  const Icon = isUser ? UserIcon : BotIcon;
  const iconContainerClasses = 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-white';

  return (
    <div className={`flex items-start gap-3 w-full ${containerClasses}`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconContainerClasses}`}>
          <Icon />
        </div>
      )}
      <div className="flex flex-col w-full max-w-[85%] md:max-w-[75%]">
        <div
          className={`text-base leading-relaxed shadow-sm ${bubbleClasses}`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.text}</div>
          ) : (
            <ReactMarkdown
                components={markdownComponents}
                remarkPlugins={[remarkGfm]}
                urlTransform={(uri) => uri}
            >
                {message.text}
            </ReactMarkdown>
          )}
        </div>
        {!isUser && message.text && (
            <div className="mt-2 flex items-center gap-1.5">
                {!hasCode && (
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-sky-500"
                        aria-label={isCopied ? "Copied" : "Copy text"}
                    >
                        {isCopied ? <CheckIcon /> : <ClipboardIcon />}
                        <span className="text-sm font-medium">{isCopied ? "Copied!" : "Copy"}</span>
                    </button>
                )}
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