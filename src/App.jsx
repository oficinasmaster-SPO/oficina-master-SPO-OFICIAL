import React, { useState, useEffect, Suspense } from 'react';
import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ToastProvider } from '@/components/aceleracao/ToastContainer';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { TenantProvider } from '@/components/contexts/TenantContext';
import { AttendanceTypeProvider } from '@/components/contexts/AttendanceTypeContext';
import { TemplateLibraryProvider } from '@/components/aceleracao/contexts/TemplateLibraryContext';
import { DraftPersistenceProvider } from '@/components/contexts/DraftPersistenceContext';
import RouteGuard from '@/components/auth/RouteGuard';
import { pagePermissions } from '@/components/lib/pagePermissions';
import { PermissionsProvider } from '@/components/contexts/PermissionsContext';
import { lazy } from 'react';
import QADashboard from '@/components/monitoring/QADashboard';
import WheelLoader from '@/components/ui/WheelLoader';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import ImpersonationCacheInvalidator from '@/components/shared/ImpersonationCacheInvalidator';

const Home = lazy(() => import('@/pages/Home'));
const GestaoTenants = lazy(() => import('@/pages/GestaoTenants'));
const CompletarPerfil = lazy(() => import('@/pages/CompletarPerfil'));
const MeuAgendamento = lazy(() => import('@/pages/MeuAgendamento'));
const DescricaoCargos = lazy(() => import('@/pages/DescricaoCargos'));
const CentralAvaliacoes = lazy(() => import('@/pages/CentralAvaliacoes'));
const MatrizDesempenho = lazy(() => import('@/pages/MatrizDesempenho'));
const PublicNPS = lazy(() => import('@/pages/PublicNPS'));
const PublicDISC = lazy(() => import('@/pages/PublicDISC'));
const BemVindoPlanos = lazy(() => import('@/pages/BemVindoPlanos'));
const ControleAceleracao = lazy(() => import('@/pages/ControleAceleracao'));
const ConsultoriaGlobal = lazy(() => import('@/pages/ConsultoriaGlobal'));
const CentralFollowUp = lazy(() => import('@/pages/CentralFollowUp'));
const ListagemClientesSprints = lazy(() => import('@/pages/ListagemClientesSprints'));
const CentralProximosPassos = lazy(() => import('@/pages/CentralProximosPassos'));
const ProximosPassosConsultoria = lazy(() => import('@/pages/ProximosPassosConsultoria'));
const AdminTemplatesBacklog = lazy(() => import('@/pages/AdminTemplatesBacklog'));
const DiagnosticoRiscos = lazy(() => import('@/pages/DiagnosticoRiscos'));
const DashboardTempoAtencao = lazy(() => import('@/pages/DashboardTempoAtencao'));
const HistoricoDiagnosticos = lazy(() => import('@/pages/HistoricoDiagnosticos'));
const DreMockup = lazy(() => import('@/pages/DreMockup'));
const GerenciarSubcategorias = lazy(() => import('@/pages/GerenciarSubcategorias'));
const RelatoriosAnuais = lazy(() => import('@/pages/RelatoriosAnuais'));
const ContasReceber = lazy(() => import('@/pages/ContasReceber'));
const ContasPagar = lazy(() => import('@/pages/ContasPagar'));
const ConciliacaoBancaria = lazy(() => import('@/pages/ConciliacaoBancaria'));
const DashboardFinanceiro = lazy(() => import('@/pages/DashboardFinanceiro'));
const CorrigirParcelasDuplicadas = lazy(() => import('@/pages/CorrigirParcelasDuplicadas'));
const BackfillSaldosHistoricos = lazy(() => import('@/pages/BackfillSaldosHistoricos'));
const UsuariosAdmin = lazy(() => import('@/pages/UsuariosAdmin'));
const RepairOrphanEmployees = lazy(() => import('@/pages/RepairOrphanEmployees'));
const DashboardTelemetriaPerfis = lazy(() => import('@/pages/DashboardTelemetriaPerfis'));


const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : null;

const LayoutWrapper = ({ children, currentPageName, adminOnly = false }) => {
  const content = (
    <RouteGuard pageName={currentPageName} adminOnly={adminOnly}>
      {children}
    </RouteGuard>
  );
  return Layout
    ? <Layout currentPageName={currentPageName}>{content}</Layout>
    : <>{content}</>;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin, logout } = useAuth();
  const [showLoading, setShowLoading] = useState(false);
  const location = useLocation();

  const publicPaths = ['/PublicNPS', '/PublicDISC', '/PrimeiroAcesso', '/ClientRegistration', '/CadastroSucesso', '/Planos', '/Cadastro', '/BemVindoPlanos'];
  const isPublicPath = publicPaths.some(path => {
    const loc = location.pathname.toLowerCase();
    const p = path.toLowerCase();
    return loc === p || loc.startsWith(p + '/');
  });

  useEffect(() => {
    let timeout;
    if (isLoadingPublicSettings || isLoadingAuth) {
      timeout = setTimeout(() => setShowLoading(true), 400); // 400ms delay to prevent flashes on fast loads
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoadingPublicSettings, isLoadingAuth]);

  // Show loading spinner while checking app public settings or auth, with delay
  if (isLoadingPublicSettings || isLoadingAuth) {
    if (!showLoading) return <div className="fixed inset-0 bg-gray-50" />; // Empty state during delay
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <WheelLoader size="xl" />
      </div>
    );
  }

  // Handle authentication errors
  if (authError && !isPublicPath) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'account_inactive') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Bloqueado</h2>
            <p className="text-gray-600 mb-6">{authError.message}</p>
            <button 
              onClick={() => logout(true)}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors w-full font-medium"
            >
              Sair e Voltar ao Login
            </button>
          </div>
        </div>
      );
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><WheelLoader size="xl" /></div>}>
      <Routes>
        {/* Auth routes — always public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Truly public pages — no login required */}
        <Route path="/" element={<LayoutWrapper currentPageName="Home"><Home /></LayoutWrapper>} />
        <Route path="/PublicNPS" element={<PublicNPS />} />
        <Route path="/PublicDISC" element={<PublicDISC />} />
        <Route path="/BemVindoPlanos" element={<BemVindoPlanos />} />

        {/* All other pages require authentication */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/CompletarPerfil" element={<LayoutWrapper currentPageName="CompletarPerfil"><CompletarPerfil /></LayoutWrapper>} />
          <Route path="/DescricaoCargos" element={<LayoutWrapper currentPageName="DescricaoCargos"><DescricaoCargos /></LayoutWrapper>} />
          <Route path="/CentralAvaliacoes" element={<LayoutWrapper currentPageName="CentralAvaliacoes"><CentralAvaliacoes /></LayoutWrapper>} />
          <Route path="/MatrizDesempenho" element={<LayoutWrapper currentPageName="MatrizDesempenho"><MatrizDesempenho /></LayoutWrapper>} />
          <Route path="/ControleAceleracao" element={<LayoutWrapper currentPageName="ControleAceleracao"><ControleAceleracao /></LayoutWrapper>} />
          <Route path="/ConsultoriaGlobal" element={<LayoutWrapper currentPageName="ConsultoriaGlobal"><ConsultoriaGlobal /></LayoutWrapper>} />
          <Route path="/CentralFollowUp" element={<LayoutWrapper currentPageName="CentralFollowUp"><CentralFollowUp /></LayoutWrapper>} />
          <Route path="/ListagemClientesSprints" element={<LayoutWrapper currentPageName="ListagemClientesSprints"><ListagemClientesSprints /></LayoutWrapper>} />
          <Route path="/CentralProximosPassos" element={<LayoutWrapper currentPageName="CentralProximosPassos"><CentralProximosPassos /></LayoutWrapper>} />
          <Route path="/AdminQADashboard" element={<LayoutWrapper currentPageName="AdminQADashboard" adminOnly={true}><QADashboard /></LayoutWrapper>} />
          <Route path="/AdminTemplatesBacklog" element={<LayoutWrapper currentPageName="AdminTemplatesBacklog" adminOnly={true}><AdminTemplatesBacklog /></LayoutWrapper>} />
          <Route path="/DiagnosticoRiscos" element={<LayoutWrapper currentPageName="DiagnosticoRiscos"><DiagnosticoRiscos /></LayoutWrapper>} />
          <Route path="/DashboardTempoAtencao" element={<LayoutWrapper currentPageName="DashboardTempoAtencao"><DashboardTempoAtencao /></LayoutWrapper>} />
          <Route path="/HistoricoDiagnosticos" element={<LayoutWrapper currentPageName="HistoricoDiagnosticos"><HistoricoDiagnosticos /></LayoutWrapper>} />
          <Route path="/MeuAgendamento" element={<LayoutWrapper currentPageName="MeuAgendamento"><MeuAgendamento /></LayoutWrapper>} />
          <Route path="/GerenciarSubcategorias" element={<LayoutWrapper currentPageName="GerenciarSubcategorias" adminOnly={true}><GerenciarSubcategorias /></LayoutWrapper>} />
          <Route path="/RelatoriosAnuais" element={<LayoutWrapper currentPageName="RelatoriosAnuais"><RelatoriosAnuais /></LayoutWrapper>} />
          <Route path="/ContasReceber" element={<LayoutWrapper currentPageName="ContasReceber"><ContasReceber /></LayoutWrapper>} />
          <Route path="/ContasPagar" element={<LayoutWrapper currentPageName="ContasPagar"><ContasPagar /></LayoutWrapper>} />
          <Route path="/ConciliacaoBancaria" element={<LayoutWrapper currentPageName="ConciliacaoBancaria"><ConciliacaoBancaria /></LayoutWrapper>} />
          <Route path="/DashboardFinanceiro" element={<LayoutWrapper currentPageName="DashboardFinanceiro"><DashboardFinanceiro /></LayoutWrapper>} />
          <Route path="/CorrigirParcelasDuplicadas" element={<LayoutWrapper currentPageName="CorrigirParcelasDuplicadas" adminOnly={true}><CorrigirParcelasDuplicadas /></LayoutWrapper>} />
          <Route path="/BackfillSaldosHistoricos" element={<LayoutWrapper currentPageName="BackfillSaldosHistoricos" adminOnly={true}><BackfillSaldosHistoricos /></LayoutWrapper>} />
          <Route path="/UsuariosAdmin" element={<LayoutWrapper currentPageName="UsuariosAdmin" adminOnly={true}><UsuariosAdmin /></LayoutWrapper>} />
          <Route path="/RepairOrphanEmployees" element={<LayoutWrapper currentPageName="RepairOrphanEmployees" adminOnly={true}><RepairOrphanEmployees /></LayoutWrapper>} />
          <Route path="/DashboardTelemetriaPerfis" element={<LayoutWrapper currentPageName="DashboardTelemetriaPerfis" adminOnly={true}><DashboardTelemetriaPerfis /></LayoutWrapper>} />
          {Object.entries(Pages).map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={<LayoutWrapper currentPageName={path}><Page /></LayoutWrapper>}
            />
          ))}
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <TenantProvider>
            <AttendanceTypeProvider>
              <TemplateLibraryProvider>
                <DraftPersistenceProvider>
                  <ToastProvider>
                    <Router>
                      <ImpersonationCacheInvalidator />
                      <PermissionsProvider>
                        <NavigationTracker />
                        <AuthenticatedApp />
                      </PermissionsProvider>
                    </Router>
                  </ToastProvider>
                </DraftPersistenceProvider>
              </TemplateLibraryProvider>
              <Toaster />
              <SonnerToaster />
              <VisualEditAgent />
            </AttendanceTypeProvider>
          </TenantProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App