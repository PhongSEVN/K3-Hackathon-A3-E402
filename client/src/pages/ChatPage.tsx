import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Link, useParams } from 'react-router-dom';
import ChatBubble from '../components/chat/ChatBubble';
import PromptBar from '../components/shared/PromptBar';
import { useLanguage } from '../context/LanguageContext';
import { useChatHistory } from '../context/ChatHistoryContext';
import './ChatPage.css';

const ChatPage: React.FC = () => {
  const { t } = useLanguage();
  const { chatId } = useParams();
  const { conversations, getConversation } = useChatHistory();
  const conversation = getConversation(chatId);
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
          {!chatId && conversations.length > 0 && (
            <section className="chat-history-view" aria-label="Lịch sử trò chuyện">
              <h2 className="font-headline-sm">Lịch sử trò chuyện</h2>
              <div className="chat-history-grid">
                {conversations.map((item) => (
                  <Link className="chat-history-card" to={`/chat/${item.id}`} key={item.id}>
                    <span className="font-title-md">{item.title}</span>
                    <span className="font-body-sm chat-history-preview">
                      {item.messages.at(-1)?.content ?? 'Chưa có tin nhắn'}
                    </span>
                    <span className="font-label-sm chat-history-time">{item.updatedAt}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {!chatId && conversations.length === 0 && (
            <div className="chat-history-empty">
              <span className="material-symbols-outlined">forum</span>
              <p>Chưa có cuộc trò chuyện nào. Hãy nhập câu hỏi bên dưới để bắt đầu.</p>
            </div>
          )}
          {conversation?.messages.map((message) => (
            <div className="message-enter" key={message.id}>
              <ChatBubble isUser={message.role === 'user'}>
                {message.role === 'assistant' ? `${message.content}\n\n**Nguồn tham khảo:** Hệ chuyên gia AI` : message.content}
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
