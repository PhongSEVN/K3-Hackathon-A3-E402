import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import BentoCard from '../components/shared/BentoCard';
import ChangePasswordModal from '../components/settings/ChangePasswordModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../i18n/translations';
import { ApiError, getMe, updateProfile, uploadAvatar } from '../lib/api';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { user, token, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

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
        setProfileError(err instanceof ApiError ? err.message : t.settings.profileLoadError);
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
      setProfileSuccess(t.settings.profileSaved);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : t.settings.profileSaveError);
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
      setProfileError(err instanceof ApiError ? err.message : t.settings.avatarUploadError);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="settings-page" ref={containerRef}>
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="font-display-lg text-on-surface">{t.settings.title}</h1>
          <p className="font-body-md text-on-surface-variant">{t.settings.subtitle}</p>
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
                aria-label={t.settings.changeAvatar}
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
                {t.settings.fullNameLabel}
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
                <span className="badge-pro font-label-md">{user ? t.settings.roleLabels[user.role] : ''}</span>
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
                {isSavingName ? t.settings.saving : t.settings.saveChanges}
              </button>
              <button
                type="button"
                className="change-password-btn font-label-md"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                {t.settings.changePassword}
              </button>
            </div>
          </BentoCard>

          {isPasswordModalOpen && <ChangePasswordModal onClose={() => setIsPasswordModalOpen(false)} />}

          {/* Appearance */}
          <BentoCard className="settings-card-anim col-span-7 setting-card">
            <div className="card-header-small">
              <span className="material-symbols-outlined text-primary">palette</span>
              <h3 className="font-label-md uppercase tracking-wider text-on-surface-variant">
                {t.settings.appearance.title}
              </h3>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <p className="font-label-md font-semibold text-on-surface">{t.settings.appearance.themeLabel}</p>
                <p className="font-label-sm text-on-surface-variant">{t.settings.appearance.themeDesc}</p>
              </div>

              <div className="theme-toggle">
                <button
                  type="button"
                  className={`theme-btn font-label-sm ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  {t.settings.appearance.light}
                </button>
                <button
                  type="button"
                  className={`theme-btn font-label-sm ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  {t.settings.appearance.dark}
                </button>
              </div>
            </div>

            <div className="divider"></div>
          </BentoCard>

          {/* Language & Region */}
          <BentoCard className="settings-card-anim col-span-6 setting-card">
            <div className="card-header-small">
              <span className="material-symbols-outlined text-primary">language</span>
              <h3 className="font-label-md uppercase tracking-wider text-on-surface-variant">
                {t.settings.language.title}
              </h3>
            </div>

            <div className="info-box">
              <div className="info-left">
                <span className="material-symbols-outlined text-on-surface-variant">translate</span>
                <span className="font-label-md text-on-surface">{t.settings.language.primaryLanguage}</span>
              </div>

              <div className="theme-toggle">
                <button
                  type="button"
                  className={`theme-btn font-label-sm ${language === 'vi' ? 'active' : ''}`}
                  onClick={() => setLanguage('vi' as Language)}
                >
                  {t.settings.language.vietnamese}
                </button>
                <button
                  type="button"
                  className={`theme-btn font-label-sm ${language === 'en' ? 'active' : ''}`}
                  onClick={() => setLanguage('en' as Language)}
                >
                  {t.settings.language.english}
                </button>
              </div>
            </div>
          </BentoCard>
        </div>

        <footer className="settings-footer">
          <p className="font-label-sm text-on-surface-variant mb-4">
            {t.common.disclaimer}
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
