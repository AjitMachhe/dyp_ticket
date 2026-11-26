
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CreateTicketPage } from './pages/tickets/CreateTicketPage';
import { TicketsListPage } from './pages/tickets/TicketsListPage';
import { TicketDetailPage } from './pages/tickets/TicketDetailPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AdminConfigPage } from './pages/admin/AdminConfigPage';
import { KnowledgeBasePage } from './pages/kb/KnowledgeBasePage';
import { QrHubPage } from './pages/kb/QrHubPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tickets" element={<TicketsListPage />} />
            <Route path="/tickets/new" element={<CreateTicketPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/admin" element={<AdminConfigPage />} />
            <Route path="/kb" element={<KnowledgeBasePage />} />
            <Route path="/qr-hub" element={<QrHubPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;