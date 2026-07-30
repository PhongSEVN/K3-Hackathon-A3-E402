import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import BentoCard from '../components/shared/BentoCard';
import ChangePasswordModal from '../components/settings/ChangePasswordModal';
import { useAuth } from '../context/AuthContext';
import { ApiError, getMe, updateProfile, uploadAvatar, type UserRole } from '../lib/api';
import './SettingsPage.css';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  farmer: 'Nông dân',
  agronomist: 'Chuyên gia nông nghiệp',
};

const SettingsPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { user, token, updateUser } = useAuth();

  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');
  const [saveHistory, setSaveHistory] = useState(true);

  const [name, setName] = useState(user?.name ?? '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll('.settings-card-anim');
      gsap.fromTo(cards,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out', delay: 0.1 }
      );
    }
  }, []);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user?.name]);

  useEffect(() => {
    if (!token) return;
    getMe(token)
      .then(updateUser)
      .catch((err) => {
        setProfileError(err instanceof ApiError ? err.message : 'Không thể tải thông tin tài khoản.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSaveName = async () => {
    if (!token) return;
    setProfileError(null);
    setProfileSuccess(null);
    setIsSavingName(true);
    try {
      const updated = await updateProfile(token, { name: name.trim() });
      updateUser(updated);
      setProfileSuccess('Đã lưu thay đổi.');
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Không thể lưu, thử lại sau.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !token) return;

    setProfileError(null);
    setIsUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(token, file);
      updateUser(updated);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Tải ảnh đại diện thất bại.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  <div className="profile-image-placeholder">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="edit-btn"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label="Đổi ảnh đại diện"
              >
                <span className="material-symbols-outlined text-sm">
                  {isUploadingAvatar ? 'hourglass_empty' : 'edit'}
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden-file-input"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="profile-info">
              <label className="font-label-sm profile-name-label" htmlFor="profile-name-input">
                Họ và tên
              </label>
              <input
                id="profile-name-input"
                type="text"
                className="profile-name-input font-headline-md"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="font-body-md text-on-surface-variant email">{user?.email}</p>
              <div className="badges">
                <span className="badge-pro font-label-md">{user ? ROLE_LABELS[user.role] : ''}</span>
              </div>
              {profileError && <p className="profile-feedback profile-feedback-error font-label-sm">{profileError}</p>}
              {profileSuccess && (
                <p className="profile-feedback profile-feedback-success font-label-sm">{profileSuccess}</p>
              )}
            </div>

            <div className="profile-actions">
              <button
                type="button"
                className="manage-account-btn font-label-md"
                onClick={handleSaveName}
                disabled={isSavingName || name.trim() === user?.name}
              >
                {isSavingName ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                type="button"
                className="change-password-btn font-label-md"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                Đổi mật khẩu
              </button>
            </div>
          </BentoCard>

          {isPasswordModalOpen && <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />}

          {/* Appearance */}
          <BentoCard className="settings-card-anim col-span-7 setting-card">
            <div className="card-header-small">
              <span className="material-symbols-outlined text-primary">palette</span>
              <h3 className="font-label-md uppercase tracking-wider text-on-surface-variant">Appearance</h3>
            </div>
            
            <div className="setting-row">
              <div className="setting-info">
                <p className="font-label-md font-semibold text-on-surface">Theme</p>
                <p className="font-label-sm text-on-surface-variant">Choose how Chat bot hỗ trợ các bác nông dân looks on your device.</p>
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
          </BentoCard>

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

          </BentoCard>

        </div>
        
        <footer className="settings-footer">
          <p className="font-label-sm text-on-surface-variant mb-4">
              AI and can make mistakes.
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
