import React, { useEffect, useRef, useState } from 'react';
import ChatBubble from './ChatBubble';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useChatHistory } from '../../context/ChatHistoryContext';
import { ApiError, sendChatMessage } from '../../lib/api';
import './DiagnosisChatPanel.css';

export interface DiagnosisInfo {
  feedbackId: string;
  sessionId: string;
  label: string;
  confidence: number;
  imageUrl: string;
}

interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface DiagnosisChatPanelProps {
  diagnosis: DiagnosisInfo | null;
}

const DiagnosisChatPanel: React.FC<DiagnosisChatPanelProps> = ({ diagnosis }) => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const { addConversation } = useChatHistory();
  const handledImageRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (question: string) => {
    if (!token || !diagnosis) return;
    const activeDiagnosis = diagnosis;

    setError(null);
    setIsSending(true);
    const userMessage: ChatEntry = { id: crypto.randomUUID(), role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    try {
      const response = await sendChatMessage(token, {
        session_id: activeDiagnosis.sessionId,
        question,
        diease: activeDiagnosis.label,
        image: activeDiagnosis.imageUrl,
      });
      const assistantMessage: ChatEntry = { id: response.id, role: 'assistant', content: response.answer ?? '' };
      setMessages((prev) => {
        const nextMessages = [...prev, assistantMessage];
        addConversation({
          id: activeDiagnosis.sessionId,
          title: `Tư vấn ${activeDiagnosis.label.replaceAll('_', ' ')}`,
          updatedAt: 'Vừa xong',
          imageUrl: activeDiagnosis.imageUrl,
          messages: nextMessages as any, // Cast if types don't exactly match
        });
        return nextMessages;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.home.chatError);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!diagnosis || handledImageRef.current === diagnosis.imageUrl) return;
    handledImageRef.current = diagnosis.imageUrl;
    setMessages([]);
    setError(null);
    // User will now manually type and send their question
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagnosis?.imageUrl]);

  const canSend = inputValue.trim().length > 0 && !!diagnosis?.imageUrl;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!canSend || isSending) return;
    setInputValue('');
    void sendMessage(trimmed);
  };

  return (
    <div className={`diagnosis-chat-panel ${messages.length === 0 ? 'is-empty' : ''}`}>
      {messages.length > 0 && (
        <div className="diagnosis-chat-messages custom-scrollbar">
          {messages.map((message) => (
            <ChatBubble key={message.id} isUser={message.role === 'user'}>
              {message.role === 'assistant' ? `${message.content}\n\n**Nguồn tham khảo:** Hệ chuyên gia AI` : message.content}
            </ChatBubble>
          ))}
          {isSending && <p className="font-label-sm text-on-surface-variant diagnosis-chat-thinking">{t.home.chatThinking}</p>}
          {error && <p className="diagnosis-chat-error font-label-sm">{error}</p>}
        </div>
      )}

      <form className="diagnosis-chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          className="diagnosis-chat-input font-body-md"
          placeholder={t.home.askPlaceholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isSending}
        />
        <button
          type="submit"
          className="diagnosis-chat-send-btn"
          disabled={isSending || !canSend}
          aria-label="Send"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            send
          </span>
        </button>
      </form>
    </div>
  );
};

export default DiagnosisChatPanel;
