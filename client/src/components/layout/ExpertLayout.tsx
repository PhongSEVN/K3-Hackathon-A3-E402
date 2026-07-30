import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import './SectionLayout.css';

const ExpertLayout: React.FC = () => {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="section-shell">
      <aside className="section-nav">
        <div className="section-brand">
          <span className="material-symbols-outlined">medical_services</span>
          <span>{t.nav.agronomist}</span>
        </div>

        <nav className="section-links">
          <NavLink to="/agronomist" end className={({ isActive }) => `section-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-outlined">dashboard</span>
            <span>Tổng quan</span>
          </NavLink>
          <NavLink to="/agronomist/queue" className={({ isActive }) => `section-link ${isActive ? 'active' : ''}`}>
            <span className="material-symbols-outlined">inbox</span>
            <span>Hàng đợi</span>
          </NavLink>
        </nav>

        <div className="section-footer">
          <NavLink to="/" className="section-link">
            <span className="material-symbols-outlined">arrow_back</span>
            <span>{t.nav.newChat}</span>
          </NavLink>
          <button type="button" className="section-link" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span>
            <span>{t.nav.logout}</span>
          </button>
        </div>
      </aside>

      <main className="section-content">
        <Outlet />
      </main>
    </div>
  );
};

export default ExpertLayout;
