import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatBubbleProps {
  isUser: boolean;
  children: React.ReactNode;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ isUser, children }) => {
  return (
    <div 
      className={`animate-fade-in-up flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{ marginBottom: '32px' }}
    >
      {!isUser && (
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginRight: '16px',
          marginTop: '4px',
          backgroundColor: 'var(--surface-container-highest)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--primary)' }}>psychology</span>
        </div>
      )}
      
      <div 
        className={isUser ? 'font-body-md' : 'font-body-md markdown-body'}
        style={{
          maxWidth: '85%',
          backgroundColor: isUser ? 'var(--surface-container-high)' : 'transparent',
          borderRadius: isUser ? '28px' : '0',
          padding: isUser ? '16px 24px' : '0',
          color: 'var(--on-surface)'
        }}
      >
        {typeof children === 'string' && !isUser ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
        ) : (
          <div style={{ whiteSpace: 'pre-line' }}>{children}</div>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
