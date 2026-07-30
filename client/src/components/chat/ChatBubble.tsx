import React from 'react';

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
          marginTop: '4px'
        }}>
          <img 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5h8IM0SYywZlDgvvvYc_AnKEBdwSi9NXDhxmx4GO44eD766tqicF4Qt8j724g1fgddYBgUJxXx1Ptc5SQHijkFQFtRFgs4N7xC--I0IWB9aQNkqa6AindDn-APFHaBszGqEoz5DLOC6kDJKWaeGwbfWKa1h-1-uHaY6U32TYZAhFIOZUXNJbHLV78tXN5Ml3UukuZPmeLwZnHk-CkugKLduEJhccmaamfEI-8xBPP0RCQDe7Ei0rp" 
            alt="AI Avatar" 
            style={{ width: '24px', height: '24px' }}
          />
        </div>
      )}
      
      <div 
        className={isUser ? 'font-body-md' : 'font-body-md'}
        style={{
          maxWidth: '85%',
          backgroundColor: isUser ? 'var(--surface-container-high)' : 'transparent',
          borderRadius: isUser ? '28px' : '0',
          padding: isUser ? '16px 24px' : '0',
          color: 'var(--on-surface)'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ChatBubble;
