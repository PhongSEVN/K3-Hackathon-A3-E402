import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './TopAppBar.css';

const TopAppBar: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="top-app-bar">
      {/*<nav className="top-nav-links">*/}
      {/*  <a href="#" className="font-label-md">About Chat bot hỗ trợ các bác nông dân</a>*/}
      {/*  <a href="#" className="font-label-md">Get Chat bot hỗ trợ các bác nông dân App</a>*/}
      {/*  <a href="#" className="font-label-md">Subscriptions</a>*/}
      {/*  <a href="#" className="font-label-md">For Business</a>*/}
      {/*</nav>*/}
      <div className="top-nav-actions">
        <div className="user-avatar">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} />
          ) : (
            <div className="user-avatar-placeholder">
              <span className="material-symbols-outlined">person</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopAppBar;
