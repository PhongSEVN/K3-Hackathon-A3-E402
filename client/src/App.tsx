import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SideNavRail from './components/layout/SideNavRail';
import TopAppBar from './components/layout/TopAppBar';
import AdminLayout from './components/layout/AdminLayout';
import ExpertLayout from './components/layout/ExpertLayout';
import RequireAuth from './components/auth/RequireAuth';
import RequireRole from './components/auth/RequireRole';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ChatHistoryProvider } from './context/ChatHistoryContext';
import './index.css';
import './App.css';

const AUTH_ROUTES = ['/login', '/register'];
const ExpertDashboard = lazy(() => import('./ExpertApp').then(module => ({ default: module.ExpertDashboard })));
const ExpertQueue = lazy(() => import('./ExpertApp').then(module => ({ default: module.ExpertQueue })));

function AppShell() {
  const location = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);
  const isSectionRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/agronomist');
  const hideChrome = isAuthPage || isSectionRoute;

  return (
    <div className="app-container">
      {!hideChrome && <SideNavRail />}
      {!hideChrome && <TopAppBar />}
      <main className={`main-content ${hideChrome ? 'full-bleed' : ''}`}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:chatId" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route element={<RequireRole allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminPage />} />
              </Route>
            </Route>

            <Route element={<RequireRole allowedRoles={['admin', 'agronomist']} />}>
              <Route path="/agronomist" element={<ExpertLayout />}>
                <Route
                  index
                  element={
                    <Suspense fallback={<div className="route-loading" aria-label="Đang tải" />}>
                      <ExpertDashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="queue"
                  element={
                    <Suspense fallback={<div className="route-loading" aria-label="Đang tải" />}>
                      <ExpertQueue />
                    </Suspense>
                  }
                />
              </Route>
            </Route>
          </Route>
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <ChatHistoryProvider>
              <AppShell />
            </ChatHistoryProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
