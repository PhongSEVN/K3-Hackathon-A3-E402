import React, { useEffect, useState } from 'react';
import BentoCard from '../shared/BentoCard';
import { useAuth } from '../../context/AuthContext';
import {
  ApiError,
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
  type UserResponse,
  type UserRole,
} from '../../lib/api';
import './UserManagementPanel.css';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  agronomist: 'Chuyên gia',
  farmer: 'Nông dân',
};

interface NewUserForm {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

const emptyForm: NewUserForm = { email: '', password: '', name: '', role: 'farmer' };

interface EditState {
  name: string;
  role: UserRole;
  password: string;
}

const UserManagementPanel: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>(emptyForm);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', role: 'farmer', password: '' });
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = () => {
    if (!token) return;
    setLoading(true);
    getAdminUsers(token)
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Không thể tải danh sách người dùng.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, [token]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setIsCreating(true);
    setError(null);
    try {
      await createAdminUser(token, newUser);
      setNewUser(emptyForm);
      setShowAddForm(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo người dùng.');
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (user: UserResponse) => {
    setEditingId(user.id);
    setEditState({ name: user.name, role: user.role, password: '' });
  };

  const handleSaveEdit = async (userId: string) => {
    if (!token) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateAdminUser(token, userId, {
        name: editState.name,
        role: editState.role,
        password: editState.password || undefined,
      });
      setEditingId(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật người dùng.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: UserResponse) => {
    if (!token) return;
    if (!window.confirm(`Xóa tài khoản "${user.name}" (${user.email})?`)) return;
    setError(null);
    try {
      await deleteAdminUser(token, user.id);
      loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xóa người dùng.');
    }
  };

  return (
    <BentoCard className="dashboard-card user-mgmt-card" hoverEffect={false}>
      <div className="card-header-small">
        <span className="material-symbols-outlined text-primary">group</span>
        <h3 className="font-label-md uppercase tracking-wider text-on-surface-variant">Quản lý người dùng</h3>
      </div>

      {error && <p className="dashboard-feedback dashboard-feedback-error font-label-md">{error}</p>}

      <div className="user-mgmt-table-wrap">
        <table className="user-mgmt-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isEditing = editingId === user.id;
              const isSelf = user.id === currentUser?.id;
              return (
                <tr key={user.id}>
                  <td>
                    {isEditing ? (
                      <input
                        value={editState.name}
                        onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                      />
                    ) : (
                      user.name
                    )}
                  </td>
                  <td className="text-on-surface-variant">{user.email}</td>
                  <td>
                    {isEditing ? (
                      <select
                        value={editState.role}
                        disabled={isSelf}
                        onChange={(e) => setEditState({ ...editState, role: e.target.value as UserRole })}
                      >
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      ROLE_LABELS[user.role]
                    )}
                  </td>
                  <td className="user-mgmt-actions">
                    {isEditing ? (
                      <>
                        <input
                          className="user-mgmt-password-input"
                          type="password"
                          placeholder="Mật khẩu mới (để trống nếu giữ nguyên)"
                          value={editState.password}
                          onChange={(e) => setEditState({ ...editState, password: e.target.value })}
                        />
                        <button type="button" onClick={() => handleSaveEdit(user.id)} disabled={isSaving}>
                          Lưu
                        </button>
                        <button type="button" onClick={() => setEditingId(null)}>
                          Hủy
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEdit(user)} aria-label="Sửa">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          disabled={isSelf}
                          title={isSelf ? 'Không thể tự xóa tài khoản của mình' : 'Xóa'}
                          aria-label="Xóa"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={4} className="text-on-surface-variant">
                  Chưa có người dùng nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddForm ? (
        <form className="user-mgmt-add-form" onSubmit={handleCreate}>
          <input
            type="email"
            required
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          />
          <input
            required
            placeholder="Họ tên"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          />
          <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <div className="user-mgmt-add-form-actions">
            <button type="submit" className="retrain-btn font-label-md" disabled={isCreating}>
              {isCreating ? 'Đang tạo...' : 'Tạo người dùng'}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)}>
              Hủy
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="retrain-btn font-label-md" onClick={() => setShowAddForm(true)}>
          <span className="material-symbols-outlined">person_add</span>
          Thêm người dùng
        </button>
      )}
    </BentoCard>
  );
};

export default UserManagementPanel;
