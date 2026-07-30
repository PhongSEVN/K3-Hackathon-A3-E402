import React, { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useChatHistory } from '../../context/ChatHistoryContext';
import './SideNavRail.css';

const SideNavRail: React.FC = () => {
  const navRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const { conversations } = useChatHistory();
  const [isExpanded, setIsExpanded] = useState(false);

  const canViewAgronomist = user?.role === 'admin' || user?.role === 'agronomist';
  const canViewAdmin = user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsExpanded((prev) => {
      const nextState = !prev;
      if (navRef.current) {
        if (nextState) {
          gsap.to(navRef.current, { width: 256, duration: 0.3, ease: 'power2.out' });
          gsap.to('.main-content', { marginLeft: 256, duration: 0.3, ease: 'power2.out' });
          gsap.to('.nav-label', { opacity: 1, duration: 0.2, delay: 0.1 });
        } else {
          gsap.to(navRef.current, { width: 64, duration: 0.3, ease: 'power2.inOut' });
          gsap.to('.main-content', { marginLeft: 64, duration: 0.3, ease: 'power2.inOut' });
          gsap.to('.nav-label', { opacity: 0, duration: 0.1 });
        }
      }
      return nextState;
    });
  };

  return (
    <aside 
      ref={navRef}
      className="side-nav-rail"
    >
      <div className="nav-top">
        <div 
          className="nav-brand" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: isExpanded ? '0 12px' : '0', 
            justifyContent: isExpanded ? 'space-between' : 'center',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <img 
            src="/logo.jpg" 
            alt="Logo" 
            className="logo-icon-img" 
            style={{ 
              display: isExpanded ? 'block' : 'none',
              marginRight: 0 
            }} 
          />
          <button 
            onClick={toggleSidebar} 
            title="Đóng/Mở menu"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '50%',
              color: 'var(--on-surface-variant)',
              transition: 'background-color 0.2s',
              width: '40px',
              height: '40px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-container-high)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
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

          {canViewAgronomist && (
            <NavLink to="/agronomist" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="material-symbols-outlined icon">medical_services</span>
              <span className="font-label-md nav-label">{t.nav.agronomist}</span>
            </NavLink>
          )}

          {canViewAdmin && (
            <NavLink to="/admin" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="material-symbols-outlined icon">admin_panel_settings</span>
              <span className="font-label-md nav-label">{t.nav.admin}</span>
            </NavLink>
          )}
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
