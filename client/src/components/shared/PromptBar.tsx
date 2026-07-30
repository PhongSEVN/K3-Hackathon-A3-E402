import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useChatHistory } from '../../context/ChatHistoryContext';
import './PromptBar.css';

interface PromptBarProps {
  variant?: 'premium' | 'default';
}

const PromptBar: React.FC<PromptBarProps> = ({ variant = 'default' }) => {
  const { t } = useLanguage();
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { sendMessage } = useChatHistory();

  const isPremium = variant === 'premium';
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim() || isSending) return;
    const message = inputValue;
    setInputValue('');
    setIsSending(true);
    const targetId = chatId ?? crypto.randomUUID();
    if (!chatId) navigate(`/chat/${targetId}`);
    await sendMessage(targetId, message);
    setIsSending(false);
  };

  return (
    <form onSubmit={handleSubmit} className={`prompt-bar-wrapper ${isFocused ? 'focused' : ''} ${isPremium ? 'premium-variant' : 'default-variant'}`}>
      <div className="prompt-bar-container">
        
        {/* Render premium layers only if variant is premium */}
        {isPremium && (
          <>
            {/* Layer 2: Blurred rainbow glow following the border */}
            <div className="prompt-bar-glow-container">
              <div className="prompt-bar-glow"></div>
            </div>

            {/* Layer 1: Animated conic rainbow border */}
            <div className="prompt-bar-border-container">
              <div className="prompt-bar-border"></div>
            </div>
          </>
        )}

        {/* Content (Layer 3 & 4 styling depends on variant class) */}
        <div className={`prompt-bar-inner ${!isPremium ? 'default-style' : ''}`}>
       
          
          <input 
            type="text" 
            className="prompt-input" 
            placeholder={t.home.askPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isSending}
          />
          
          <div className="prompt-actions">
            
            <button type="submit" disabled={!inputValue.trim() || isSending} className={`prompt-btn send-btn ${inputValue.trim() ? 'active-text' : ''}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isSending ? 'hourglass_top' : 'send'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default PromptBar;
