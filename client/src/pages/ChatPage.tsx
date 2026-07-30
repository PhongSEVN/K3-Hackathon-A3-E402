import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ChatBubble from '../components/chat/ChatBubble';
import PromptBar from '../components/shared/PromptBar';
import { useLanguage } from '../context/LanguageContext';
import { useChatHistory } from '../context/ChatHistoryContext';
import './ChatPage.css';

const ChatPage: React.FC = () => {
  const { t } = useLanguage();
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { conversations, getConversation, deleteConversation, clearConversations } = useChatHistory();
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
  }, [conversation?.messages.length]);

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`Xóa cuộc trò chuyện “${title}”?`)) return;
    deleteConversation(id);
    if (chatId === id) navigate('/chat');
  };

  const handleClearAll = () => {
    if (!window.confirm('Xóa toàn bộ lịch sử trò chuyện? Hành động này không thể hoàn tác.')) return;
    clearConversations();
  };

  return (
    <div className="chat-page-container">
      <div className="chat-header">
        <div className="chat-title">
          <span className="font-headline-md font-medium text-on-surface">{t.chat.title}</span>
          <span className="material-symbols-outlined text-outline-variant cursor-pointer">expand_more</span>
        </div>
        {conversation && (
          <button
            className="chat-delete-button"
            type="button"
            onClick={() => handleDelete(conversation.id, conversation.title)}
            aria-label="Xóa cuộc trò chuyện"
          >
            <span className="material-symbols-outlined">delete</span>
            Xóa
          </button>
        )}
      </div>
      
      <div className="chat-scroll-area custom-scrollbar" ref={containerRef}>
        <div className="chat-content">
          {!chatId && conversations.length > 0 && (
            <section className="chat-history-view" aria-label="Lịch sử trò chuyện">
              <div className="chat-history-heading">
                <h2 className="font-headline-sm">Lịch sử trò chuyện</h2>
                <button className="chat-delete-button" type="button" onClick={handleClearAll}>
                  <span className="material-symbols-outlined">delete_sweep</span>
                  Xóa tất cả
                </button>
              </div>
              <div className="chat-history-grid">
                {conversations.map((item) => (
                  <div className="chat-history-card" key={item.id}>
                    <Link className="chat-history-card-link" to={`/chat/${item.id}`}>
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt="Chat avatar" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />
                      )}
                      <span className="font-title-md">{item.title}</span>
                      {item.isSample && <span className="font-label-sm">HỘI THOẠI MẪU</span>}
                      <span className="font-body-sm chat-history-preview">
                        {item.messages.at(-1)?.content ?? 'Chưa có tin nhắn'}
                      </span>
                      <span className="font-label-sm chat-history-time">{item.updatedAt}</span>
                    </Link>
                    <button
                      className="chat-card-delete"
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      aria-label={`Xóa ${item.title}`}
                      title="Xóa cuộc trò chuyện"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
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
