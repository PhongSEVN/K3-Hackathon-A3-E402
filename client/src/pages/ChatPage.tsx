import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useParams } from 'react-router-dom';
import ChatBubble from '../components/chat/ChatBubble';
import PromptBar from '../components/shared/PromptBar';
import { useLanguage } from '../context/LanguageContext';
import './ChatPage.css';

const ChatPage: React.FC = () => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const messages = containerRef.current.querySelectorAll('.message-enter');
      gsap.fromTo(messages, 
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.2, ease: 'power2.out', delay: 0.1 }
      );
      
      // Auto-scroll to bottom on mount
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, []);

  return (
    <div className="chat-page-container">
      <div className="chat-header">
        <div className="chat-title">
          <span className="font-headline-md font-medium text-on-surface">{t.chat.title}</span>
          <span className="material-symbols-outlined text-outline-variant cursor-pointer">expand_more</span>
        </div>
      </div>
      
      <div className="chat-scroll-area custom-scrollbar" ref={containerRef}>
        <div className="chat-content">
          {conversation?.messages.map((message) => (
            <div className="message-enter" key={message.id}>
              <ChatBubble isUser={message.role === 'user'}>
                <p>{message.content}</p>
              </ChatBubble>
            </div>
          ))}
        </div>
      </div>
      
      <div className="chat-prompt-area">
        <PromptBar />
      </div>
    </div>
  );
};

export default ChatPage;
