import React, { useEffect, useState } from 'react';
import BentoCard from '../components/shared/BentoCard';
import UserManagementPanel from '../components/admin/UserManagementPanel';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ApiError, getAdminStats, triggerRetrain, type AdminStatsResponse } from '../lib/api';
import './DashboardPage.css';

const AdminPage: React.FC = () => {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [isRetraining, setIsRetraining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = () => {
    if (!token) return;
    getAdminStats(token)
      .then(setStats)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t.admin.loadError);
      });
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleRetrain = async () => {
    if (!token) return;
    setError(null);
    setMessage(null);
    setIsRetraining(true);
    try {
      const result = await triggerRetrain(token);
      setMessage(t.admin.retrainQueued.replace('{count}', String(result.dataset_size)));
      loadStats();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.admin.retrainError);
    } finally {
      setIsRetraining(false);
    }
  };

  const byClassEntries = Object.entries(stats?.by_class ?? {}).sort((a, b) => b[1] - a[1]);
  const lastRetrainText = stats?.last_retrain_at
    ? `${new Date(stats.last_retrain_at).toLocaleString('vi-VN')} bởi ${stats.last_retrain_by}`
    : 'chưa từng retrain';

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

          <p className="dataset-size font-display-lg-mobile">
            {stats === null ? '—' : stats.dataset_size}
          </p>
          <p className="font-label-sm text-on-surface-variant">{t.admin.datasetDesc}</p>
          <p className="font-label-sm text-on-surface-variant">
            {stats === null ? '—' : stats.new_since_last_retrain} ảnh mới kể từ lần retrain gần nhất
            ({lastRetrainText})
          </p>
          <p className="font-label-sm text-on-surface-variant">
            {stats === null ? '—' : stats.pending_review} ca đang chờ chuyên gia duyệt trước khi vào tập vàng
          </p>

          {byClassEntries.length > 0 && (
            <ul style={{ margin: '12px 0', padding: 0, listStyle: 'none', display: 'grid', gap: '4px' }}>
              {byClassEntries.map(([className, count]) => (
                <li
                  key={className}
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}
                  className="text-on-surface-variant"
                >
                  <span>{className.replaceAll('_', ' ')}</span>
                  <span>{count}</span>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="dashboard-feedback dashboard-feedback-error font-label-md">{error}</p>}
          {message && <p className="dashboard-feedback dashboard-feedback-success font-label-md">{message}</p>}

          <button type="button" className="retrain-btn font-label-md" onClick={handleRetrain} disabled={isRetraining}>
            <span className="material-symbols-outlined">model_training</span>
            {isRetraining ? t.admin.retraining : t.admin.retrainButton}
          </button>
          <p className="font-label-sm text-on-surface-variant" style={{ marginTop: '8px' }}>
            Nút này chỉ đánh dấu đã xem báo cáo và quyết định retrain — huấn luyện thật vẫn chạy tay
            (thuê GPU vast.ai, chạy <code>cv/resnet/train.py</code>, xem <code>cv/resnet/README.md</code>).
          </p>
        </BentoCard>

        <UserManagementPanel />
      </div>
    </div>
  );
};

export default AdminPage;
