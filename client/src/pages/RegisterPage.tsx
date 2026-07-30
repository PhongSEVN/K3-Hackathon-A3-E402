import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import ShaderCanvas from '../components/shared/ShaderCanvas';
import './AuthPage.css';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shader-bg">
        <ShaderCanvas />
      </div>

      <div className="auth-card glass-card subtle-shadow">
        <div className="auth-brand">
          <span className="material-symbols-outlined logo-icon">eco</span>
          <span className="font-headline-md">Chat bot hỗ trợ các bác nông dân</span>
        </div>

        <h1 className="font-display-lg-mobile auth-title">Create your account</h1>
        <p className="font-body-md auth-subtitle">Start your journey with us</p>

        {error && <div className="auth-error font-label-md">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="font-label-md field-label">Full name</span>
            <input
              type="text"
              className="auth-input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            <span className="font-label-md field-label">Email</span>
            <input
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            <span className="font-label-md field-label">Password</span>
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                className="auth-input-icon-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </label>

          <label className="auth-field">
            <span className="font-label-md field-label">Confirm password</span>
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>

          <button type="submit" className="auth-submit-btn font-label-md" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="font-label-md auth-footer-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
