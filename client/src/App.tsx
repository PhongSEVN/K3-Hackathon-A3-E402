import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import AgronomistPage from './pages/AgronomistPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SideNavRail from './components/layout/SideNavRail';
import TopAppBar from './components/layout/TopAppBar';
import RequireAuth from './components/auth/RequireAuth';
import RequireRole from './components/auth/RequireRole';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ChatHistoryProvider } from './context/ChatHistoryContext';
import './index.css';
import './App.css';

const AUTH_ROUTES = ['/login', '/register'];

function AppShell() {
  const location = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  return (
    <div className="app-container">
      {!isAuthPage && <SideNavRail />}
      {!isAuthPage && <TopAppBar />}
      <main className={`main-content ${isAuthPage ? 'full-bleed' : ''}`}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:chatId" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route element={<RequireRole allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route element={<RequireRole allowedRoles={['admin', 'agronomist']} />}>
              <Route path="/agronomist" element={<AgronomistPage />} />
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
