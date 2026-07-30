import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './PromptBar.css';

interface PromptBarProps {
  variant?: 'premium' | 'default';
  onSubmit?: (question: string) => void;
  disabled?: boolean;
}

const PromptBar: React.FC<PromptBarProps> = ({ variant = 'default', onSubmit, disabled = false }) => {
  const { t } = useLanguage();
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const isPremium = variant === 'premium';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || disabled || !onSubmit) return;
    onSubmit(trimmed);
    setInputValue('');
  };

  return (
    <div className={`prompt-bar-wrapper ${isFocused ? 'focused' : ''} ${isPremium ? 'premium-variant' : 'default-variant'}`}>
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
        <form className={`prompt-bar-inner ${!isPremium ? 'default-style' : ''}`} onSubmit={handleSubmit}>


          <input
            type="text"
            className="prompt-input"
            placeholder={t.home.askPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
          />

          <div className="prompt-actions">

            <button type="submit" className={`prompt-btn send-btn ${inputValue.trim() ? 'active-text' : ''}`} disabled={disabled || !inputValue.trim()}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromptBar;
