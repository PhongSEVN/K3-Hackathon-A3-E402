import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Link, useParams } from 'react-router-dom';
import ChatBubble from '../components/chat/ChatBubble';
import PromptBar from '../components/shared/PromptBar';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useChatHistory, type ChatMessage } from '../context/ChatHistoryContext';
import { formatAssistantContent } from '../lib/chatFormat';
import { ApiError, sendChatMessage } from '../lib/api';
import './ChatPage.css';

const ChatPage: React.FC = () => {
  const { t } = useLanguage();
  const { chatId } = useParams();
  const { token } = useAuth();
  const { conversations, getConversation, addConversation, deleteConversation } = useChatHistory();
  const conversation = getConversation(chatId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (question: string) => {
    if (!token || !chatId) return;

    setError(null);
    setIsSending(true);
    const baseMessages = conversation?.messages ?? [];
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: question };
    addConversation({
      id: chatId,
      title: conversation?.title ?? question,
      updatedAt: 'Vừa xong',
      imageUrl: conversation?.imageUrl,
      messages: [...baseMessages, userMessage],
    });

    try {
      const response = await sendChatMessage(token, { session_id: chatId, question });
      const assistantMessage: ChatMessage = {
        id: response.id,
        role: 'assistant',
        content: response.answer ?? '',
        citations: response.citations,
        confidence: response.confidence,
        needsHumanReview: response.needs_human_review,
      };
      addConversation({
        id: chatId,
        title: conversation?.title ?? question,
        updatedAt: 'Vừa xong',
        imageUrl: conversation?.imageUrl,
        messages: [...baseMessages, userMessage, assistantMessage],
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.home.chatError);
    } finally {
      setIsSending(false);
    }
  };

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
        <div className={`chat-content ${chatId && conversation?.imageUrl ? 'is-split' : ''}`}>
          {!chatId && conversations.length > 0 && (
            <section className="chat-history-view" aria-label="Lịch sử trò chuyện">
              <h2 className="font-headline-sm">Lịch sử trò chuyện</h2>
              <div className="chat-history-grid">
                {conversations.map((item) => (
                  <Link className="chat-history-card" to={`/chat/${item.id}`} key={item.id}>
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="Chat avatar" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />
                    )}
                    <div className="chat-history-card-header">
                      <span className="font-title-md">{item.title}</span>
                      <button 
                        className="chat-history-delete-btn"
                        title="Xóa đoạn chat"
                        onClick={(e) => {
                          e.preventDefault();
                          deleteConversation(item.id);
                        }}
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
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
          {chatId && conversation?.imageUrl ? (
            <div className="chat-split-layout">
              <div className="chat-image-panel">
                <img src={conversation.imageUrl} alt="Uploaded" className="chat-uploaded-image" />
              </div>
              <div className="chat-messages-panel">
                {conversation.messages.map((message) => (
                  <div className="message-enter" key={message.id}>
                    <ChatBubble isUser={message.role === 'user'}>
                      {message.role === 'assistant'
                        ? formatAssistantContent(message.content, message.citations)
                        : message.content}
                    </ChatBubble>
                  </div>
                ))}
                {isSending && <p className="font-label-sm text-on-surface-variant">{t.home.chatThinking}</p>}
                {error && <p className="chat-error font-label-sm">{error}</p>}
              </div>
            </div>
          ) : (
            <>
              {conversation?.messages.map((message) => (
                <div className="message-enter" key={message.id}>
                  <ChatBubble isUser={message.role === 'user'}>
                    {message.role === 'assistant'
                      ? formatAssistantContent(message.content, message.citations)
                      : message.content}
                  </ChatBubble>
                </div>
              ))}
              {isSending && <p className="font-label-sm text-on-surface-variant">{t.home.chatThinking}</p>}
              {error && <p className="chat-error font-label-sm">{error}</p>}
            </>
          )}
        </div>
      </div>

      <div className="chat-prompt-area">
        <PromptBar onSubmit={sendMessage} disabled={!chatId || isSending} />
      </div>
    </div>
  );
};

export default ChatPage;
