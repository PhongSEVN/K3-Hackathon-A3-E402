import React, { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import './SideNavRail.css';

const SideNavRail: React.FC = () => {
  const navRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMouseEnter = () => {
    setIsExpanded(true);
    if (navRef.current) {
      gsap.to(navRef.current, { width: 256, duration: 0.3, ease: 'power2.out' });
      gsap.to('.nav-label', { opacity: 1, duration: 0.2, delay: 0.1 });
    }
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
    if (navRef.current) {
      gsap.to(navRef.current, { width: 64, duration: 0.3, ease: 'power2.inOut' });
      gsap.to('.nav-label', { opacity: 0, duration: 0.1 });
    }
  };

  return (
    <aside 
      ref={navRef}
      className="side-nav-rail"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="nav-top">
        <div className="nav-brand">
          <span className="material-symbols-outlined logo-icon">eco</span>
        </div>

        <nav className="nav-links">
          <NavLink to="/" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} end>
            <span className="material-symbols-outlined icon">add</span>
            <span className="font-label-md nav-label">{t.nav.newChat}</span>
          </NavLink>

          <NavLink to="/chat" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-outlined icon">history</span>
            <span className="font-label-md nav-label">{t.nav.history}</span>
          </NavLink>

          <div className={`history-list ${isExpanded ? 'visible' : ''}`} aria-label="Lịch sử trò chuyện">
            <p className="history-heading font-label-sm">Gần đây</p>
            {conversations.map((conversation) => (
              <NavLink
                key={conversation.id}
                to={`/chat/${conversation.id}`}
                className={({ isActive }) => `history-item font-label-md ${isActive ? 'active' : ''}`}
                title={conversation.title}
              >
                <span className="history-title">{conversation.title}</span>
                <span className="history-time font-label-sm">{conversation.updatedAt}</span>
              </NavLink>
            ))}
          </div>

          <NavLink to="/explore" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-outlined icon">explore</span>
            <span className="font-label-md nav-label">{t.nav.explore}</span>
          </NavLink>
        </nav>
      </div>

      <div className="nav-bottom">
        <NavLink to="/settings" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="material-symbols-outlined icon">settings</span>
          <span className="font-label-md nav-label">{t.nav.settings}</span>
        </NavLink>

        <button className="nav-item" onClick={handleLogout}>
          <span className="material-symbols-outlined icon">logout</span>
          <span className="font-label-md nav-label">{t.nav.logout}</span>
        </button>
      </div>
    </aside>
  );
};

export default SideNavRail;
