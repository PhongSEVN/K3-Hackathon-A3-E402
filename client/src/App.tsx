import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import ExplorePage from './pages/ExplorePage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SideNavRail from './components/layout/SideNavRail';
import TopAppBar from './components/layout/TopAppBar';
import RequireAuth from './components/auth/RequireAuth';
import { AuthProvider } from './context/AuthContext';
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
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatHistoryProvider>
          <AppShell />
        </ChatHistoryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
