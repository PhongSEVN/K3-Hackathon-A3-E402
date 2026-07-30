import React, { useEffect, useState } from 'react';
import BentoCard from '../components/shared/BentoCard';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ApiError, getAdminStats, triggerRetrain } from '../lib/api';
import './DashboardPage.css';

const AdminPage: React.FC = () => {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [datasetSize, setDatasetSize] = useState<number | null>(null);
  const [isRetraining, setIsRetraining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getAdminStats(token)
      .then((stats) => setDatasetSize(stats.dataset_size))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t.admin.loadError);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleRetrain = async () => {
    if (!token) return;
    setError(null);
    setMessage(null);
    setIsRetraining(true);
    try {
      const result = await triggerRetrain(token);
      setDatasetSize(result.dataset_size);
      setMessage(t.admin.retrainQueued.replace('{count}', String(result.dataset_size)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.admin.retrainError);
    } finally {
      setIsRetraining(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="font-display-lg text-on-surface">{t.admin.title}</h1>
          <p className="font-body-md text-on-surface-variant">{t.admin.subtitle}</p>
        </div>

        <BentoCard className="dashboard-card" hoverEffect={false}>
          <div className="card-header-small">
            <span className="material-symbols-outlined text-primary">dataset</span>
            <h3 className="font-label-md uppercase tracking-wider text-on-surface-variant">
              {t.admin.datasetTitle}
            </h3>
          </div>

          <p className="dataset-size font-display-lg-mobile">{datasetSize === null ? '—' : datasetSize}</p>
          <p className="font-label-sm text-on-surface-variant">{t.admin.datasetDesc}</p>

          {error && <p className="dashboard-feedback dashboard-feedback-error font-label-md">{error}</p>}
          {message && <p className="dashboard-feedback dashboard-feedback-success font-label-md">{message}</p>}

          <button type="button" className="retrain-btn font-label-md" onClick={handleRetrain} disabled={isRetraining}>
            <span className="material-symbols-outlined">model_training</span>
            {isRetraining ? t.admin.retraining : t.admin.retrainButton}
          </button>
        </BentoCard>
      </div>
    </div>
  );
};

export default AdminPage;
