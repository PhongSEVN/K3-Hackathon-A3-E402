import React, { useState } from 'react';
import './PromptBar.css';

interface PromptBarProps {
  variant?: 'premium' | 'default';
}

const PromptBar: React.FC<PromptBarProps> = ({ variant = 'default' }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  const isPremium = variant === 'premium';

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
        <div className={`prompt-bar-inner ${!isPremium ? 'default-style' : ''}`}>
          <button className="prompt-btn add-btn">
            <span className="material-symbols-outlined">add</span>
          </button>
          
          <input 
            type="text" 
            className="prompt-input" 
            placeholder="Ask Chat bot hỗ trợ các bác nông dân" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          
          <div className="prompt-actions">
            
            <button className={`prompt-btn send-btn ${inputValue.trim() ? 'active-text' : ''}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptBar;
