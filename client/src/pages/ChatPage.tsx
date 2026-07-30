import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ChatBubble from '../components/chat/ChatBubble';
import CodeBlock from '../components/chat/CodeBlock';
import SuggestionChip from '../components/shared/SuggestionChip';
import PromptBar from '../components/shared/PromptBar';
import './ChatPage.css';

const ChatPage: React.FC = () => {
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

  const sampleCode = `query GetUserData {
  user(id: "123") {
    name
    email
    orders {
      id
      total
    }
  }
}`;

  return (
    <div className="chat-page-container">
      <div className="chat-header">
        <div className="chat-title">
          <span className="font-headline-md font-medium text-on-surface">Gemini</span>
          <span className="material-symbols-outlined text-outline-variant cursor-pointer">expand_more</span>
        </div>
      </div>
      
      <div className="chat-scroll-area custom-scrollbar" ref={containerRef}>
        <div className="chat-content">
          <div className="message-enter">
            <ChatBubble isUser={true}>
              <p>Can you explain the difference between a REST API and GraphQL? Provide some code examples and pros/cons.</p>
            </ChatBubble>
          </div>
          
          <div className="message-enter">
            <ChatBubble isUser={false}>
              <div className="space-y-4">
                <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>Sure! Both <strong>REST</strong> and <strong>GraphQL</strong> are popular architectures for building APIs, but they handle data fetching in very different ways. Here is a breakdown of their differences:</p>
                
                <CodeBlock language="JavaScript / GraphQL" code={sampleCode} />
                
                <h4 className="font-headline-md" style={{ marginTop: '24px', marginBottom: '16px' }}>Key Differences</h4>
                
                <ul className="custom-list">
                  <li>
                    <div className="bullet"></div>
                    <p><strong>REST:</strong> Uses standard HTTP methods (GET, POST, etc.) and exposes multiple endpoints for different resources.</p>
                  </li>
                  <li>
                    <div className="bullet"></div>
                    <p><strong>GraphQL:</strong> Uses a single endpoint and a query language to request exactly the data you need.</p>
                  </li>
                  <li>
                    <div className="bullet"></div>
                    <p><strong>Overfetching:</strong> Common in REST (getting more data than you need). Virtually non-existent in GraphQL.</p>
                  </li>
                </ul>
                
                <div className="chip-row">
                  <SuggestionChip label="Which is better for mobile?" />
                  <SuggestionChip label="Show a REST endpoint example" />
                  <SuggestionChip label="How to migrate to GraphQL?" />
                </div>
              </div>
            </ChatBubble>
          </div>
        </div>
      </div>
      
      <div className="chat-prompt-area">
        <PromptBar />
      </div>
    </div>
  );
};

export default ChatPage;
