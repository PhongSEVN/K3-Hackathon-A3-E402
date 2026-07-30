import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import BentoCard from '../components/shared/BentoCard';
import ToggleSwitch from '../components/shared/ToggleSwitch';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');
  const [saveHistory, setSaveHistory] = useState(true);

  useEffect(() => {
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll('.settings-card-anim');
      gsap.fromTo(cards, 
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out', delay: 0.1 }
      );
    }
  }, []);

  return (
    <div className="settings-page" ref={containerRef}>
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="font-display-lg text-on-surface">Settings & Account</h1>
          <p className="font-body-md text-on-surface-variant">Manage your AI experience, data privacy, and subscription details.</p>
        </div>

        <div className="settings-grid">
          {/* Profile Section */}
          <BentoCard className="settings-card-anim col-span-12 profile-card">
            <div className="profile-image-container">
              <div className="profile-image">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUb0C94Kt6JpvhBkk0ecTHOVT34jPW5A-6jdZgEKFwSvgoHgzMY9zwj5ADj1F9dqjB4iCjds-zY-AhEP4hzPJj4dJ-Uf2CCGfXGADZTlcACoE7OxfSAvGhoB-eF3Vxh4XAi4EdMcuKB_H5cOskT5LX_FSfZ1umc_U6JP6Xi42-zDuMvxGb1WVLe6aqvAJBcRoSEcZaBP8Dk2J8DlahgSiqphN43Xr4pxleFP7XHCPbkGa608pX7dTR" alt="Alex Thompson" />
              </div>
              <button className="edit-btn">
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>
            
            <div className="profile-info">
              <h2 className="font-headline-md text-on-surface">Alex Thompson</h2>
              <p className="font-body-md text-on-surface-variant email">alex.t@example.com</p>
              <div className="badges">
                <span className="badge-pro font-label-md">Pro Member</span>
                <span className="badge-lang font-label-md">English (US)</span>
              </div>
            </div>
            
            <button className="manage-account-btn font-label-md">Manage Account</button>
          </BentoCard>

          {/* Appearance */}
          <BentoCard className="settings-card-anim col-span-7 setting-card">
            <div className="card-header-small">
              <span className="material-symbols-outlined text-primary">palette</span>
              <h3 className="font-label-md uppercase tracking-wider text-on-surface-variant">Appearance</h3>
            </div>
            
            <div className="setting-row">
              <div className="setting-info">
                <p className="font-label-md font-semibold text-on-surface">Theme</p>
                <p className="font-label-sm text-on-surface-variant">Choose how Gemini looks on your device.</p>
              </div>
              
              <div className="theme-toggle">
                <button 
                  className={`theme-btn font-label-sm ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  Light
                </button>
                <button 
                  className={`theme-btn font-label-sm ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  Dark
                </button>
                <button 
                  className={`theme-btn font-label-sm ${theme === 'auto' ? 'active' : ''}`}
                  onClick={() => setTheme('auto')}
                >
                  Auto
                </button>
              </div>
            </div>
            
            <div className="divider"></div>
            
            <div className="setting-row">
              <div className="setting-info">
                <p className="font-label-md font-semibold text-on-surface">Font Size</p>
                <p className="font-label-sm text-on-surface-variant">Adjust text size for comfort.</p>
              </div>
              
              <select className="font-label-md text-primary font-select">
                <option>Small</option>
                <option selected>Default</option>
                <option>Large</option>
                <option>Extra Large</option>
              </select>
            </div>
          </BentoCard>

          {/* Data & Privacy */}
          <BentoCard className="settings-card-anim col-span-5 setting-card">
            <div className="card-header-small">
              <span className="material-symbols-outlined text-primary">security</span>
              <h3 className="font-label-md uppercase tracking-wider text-on-surface-variant">Data & Privacy</h3>
            </div>
            
            <div className="setting-row align-start">
              <div className="setting-info">
                <p className="font-label-md font-semibold text-on-surface">Gemini Apps Activity</p>
                <p className="font-label-sm text-on-surface-variant">Store your chat history to improve responses.</p>
              </div>
              <ToggleSwitch checked={saveHistory} onChange={setSaveHistory} />
            </div>
            
            <button className="delete-activity-btn group">
              <span className="font-label-md text-on-surface">Delete all activity</span>
              <span className="material-symbols-outlined text-on-surface-variant icon">chevron_right</span>
            </button>
          </BentoCard>

          {/* Subscription */}
          <div className="settings-card-anim col-span-12 subscription-card">
            <div className="sub-content">
              <div>
                <div className="sub-badge">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label-sm uppercase tracking-widest">Premium Plan</span>
                </div>
                <h3 className="font-headline-md font-bold mb-2 text-white">Gemini Advanced</h3>
                <p className="font-body-md text-white-80">Next-generation features, 2TB of cloud storage, and priority access to new AI models.</p>
              </div>
              
              <div className="pricing">
                <p className="font-display-lg text-white">$19.99<span className="font-body-md text-white-60">/mo</span></p>
                <button className="renew-btn font-label-md">Renew Early</button>
              </div>
            </div>
          </div>

          {/* Language & Region */}
          <BentoCard className="settings-card-anim col-span-6 setting-card">
            <div className="card-header-small">
              <span className="material-symbols-outlined text-primary">language</span>
              <h3 className="font-label-md uppercase tracking-wider text-on-surface-variant">Language</h3>
            </div>
            
            <div className="info-box">
              <div className="info-left">
                <span className="material-symbols-outlined text-on-surface-variant">translate</span>
                <span className="font-label-md text-on-surface">Primary Language</span>
              </div>
              <span className="font-label-md text-primary font-semibold">English (US)</span>
            </div>
            
            <div className="info-box mt-4">
              <div className="info-left">
                <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
                <span className="font-label-md text-on-surface">Search Region</span>
              </div>
              <span className="font-label-md text-on-surface-variant">United States</span>
            </div>
          </BentoCard>

          {/* Developer Tools */}
          <BentoCard className="settings-card-anim col-span-6 setting-card">
            <div className="card-header-small">
              <span className="material-symbols-outlined text-primary">auto_fix_high</span>
              <h3 className="font-label-md uppercase tracking-wider text-on-surface-variant">Developer Tools</h3>
            </div>
            
            <div className="dev-tools-grid">
              <button className="dev-tool-btn group">
                <span className="material-symbols-outlined icon group-hover-primary">code</span>
                <p className="font-label-md font-semibold text-on-surface">API Keys</p>
              </button>
              <button className="dev-tool-btn group">
                <span className="material-symbols-outlined icon group-hover-primary">terminal</span>
                <p className="font-label-md font-semibold text-on-surface">Sandbox</p>
              </button>
              <button className="dev-tool-btn group">
                <span className="material-symbols-outlined icon group-hover-primary">monitoring</span>
                <p className="font-label-md font-semibold text-on-surface">Usage Labs</p>
              </button>
              <button className="dev-tool-btn group">
                <span className="material-symbols-outlined icon group-hover-primary">extension</span>
                <p className="font-label-md font-semibold text-on-surface">Extensions</p>
              </button>
            </div>
          </BentoCard>
        </div>
        
        <footer className="settings-footer">
          <p className="font-label-sm text-on-surface-variant mb-4">
            <a href="#">Google Terms</a> and the <a href="#">Google Privacy Policy</a> apply. Gemini is AI and can make mistakes.
          </p>
          <div className="footer-icons">
            <span className="material-symbols-outlined text-lg">policy</span>
            <span className="material-symbols-outlined text-lg">gavel</span>
            <span className="material-symbols-outlined text-lg">public</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SettingsPage;
