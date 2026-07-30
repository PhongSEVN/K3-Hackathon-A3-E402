import React from 'react';
import BentoCard from '../components/shared/BentoCard';
import { useLanguage } from '../context/LanguageContext';
import './DashboardPage.css';

const AgronomistPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="font-display-lg text-on-surface">{t.agronomist.title}</h1>
          <p className="font-body-md text-on-surface-variant">{t.agronomist.subtitle}</p>
        </div>

        <BentoCard className="dashboard-card" hoverEffect={false}>
          <p className="font-body-md text-on-surface-variant">{t.agronomist.placeholder}</p>
        </BentoCard>
      </div>
    </div>
  );
};

export default AgronomistPage;
