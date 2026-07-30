import React from 'react';
import './TopAppBar.css';

const TopAppBar: React.FC = () => {
  return (
    <header className="top-app-bar">
      <nav className="top-nav-links">
        <a href="#" className="font-label-md">About Gemini</a>
        <a href="#" className="font-label-md">Get Gemini App</a>
        <a href="#" className="font-label-md">Subscriptions</a>
        <a href="#" className="font-label-md">For Business</a>
      </nav>
      <div className="top-nav-actions">
        <button className="btn-upgrade font-label-md">
          <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          Upgrade
        </button>
        <button className="apps-grid-btn">
          <span className="material-symbols-outlined">apps</span>
        </button>
        <div className="user-avatar">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuANGKelEBFGgcfQr_CofwJrRXLoC5auLBxrO5haJNOayqtOlmTJh2_rUMJVHPIMl94zUJUIoH6pHcisoogKStaK3zUbriIGUOWOPNBOzHtfhqTS__g0Fp5qymIvi7ysz8Y1klv-qORfcANbDv8FcvssIM6s9hiypgKU3UgF9AUoO1vYFWVRD5cv4wObEQd8WH8MvMa5GtOR-I6O5lojXFH5iiWNNSUk1o8FvjiwsweYph2EcfoAcIsl" alt="User profile" />
        </div>
      </div>
    </header>
  );
};

export default TopAppBar;
