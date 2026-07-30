import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError, changePassword } from '../../lib/api';
import './ChangePasswordModal.css';

interface ChangePasswordModalProps {
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const { token } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp.');
      return;
    }
    if (!token) return;

    setIsSubmitting(true);
    try {
      await changePassword(token, { old_password: oldPassword, new_password: newPassword });
      setSuccessMessage('Đổi mật khẩu thành công.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra, thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 className="font-headline-md">Đổi mật khẩu</h2>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && <div className="modal-error font-label-md">{error}</div>}
        {successMessage && <div className="modal-success font-label-md">{successMessage}</div>}

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="modal-field">
            <span className="font-label-md field-label">Mật khẩu cũ</span>
            <input
              type="password"
              className="modal-input"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </label>

          <label className="modal-field">
            <span className="font-label-md field-label">Mật khẩu mới</span>
            <input
              type="password"
              className="modal-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>

          <label className="modal-field">
            <span className="font-label-md field-label">Xác nhận mật khẩu mới</span>
            <input
              type="password"
              className="modal-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>

          <button type="submit" className="modal-submit-btn font-label-md" disabled={isSubmitting}>
            {isSubmitting ? 'Đang đổi...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ChangePasswordModal;
