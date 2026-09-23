import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  UserRole,
  Asset,
  Corridor,
  BlockRequest,
  Defect,
  OptimizedBlock,
  Conflict,
  Train,
  MaintenanceTask,
  ValidationResult,
  PublicationWorkflowState,
  AuditLogEntry,
  SystemStatus,
} from './types';
import {
  mockStore,
  getAssets,
  getCorridors,
  getBlockRequests,
  getDefects,
  getOptimizedBlocks,
  getConflicts,
  getTrains,
  getMaintenanceTasks,
  getValidationResult,
  getPublicationState,
  getAuditLogs,
  getSystemStatus,
  publishSchedule,
} from './services/api';
import { MOCK_USERS } from './data/mockData';

// Layout Components
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';

// Common Modals
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { SihDemoModal } from './components/common/SihDemoModal';
import { BackendSettingsModal } from './components/common/BackendSettingsModal';
import { BlockBurstingWatchdog } from './components/common/BlockBurstingWatchdog';
import { RailwayFormsModal } from './components/modals/RailwayFormsModal';
import { ControllerHotkeysModal } from './components/modals/ControllerHotkeysModal';
import { i18n, Language } from './services/i18n';
import { railwayAudio } from './services/railwayAudio';
import { printOfficialBulletin } from './services/exportBulletinService';

// Screen Components
import { AuthScreen } from './components/screens/AuthScreen';
import { CommandCenterScreen } from './components/screens/CommandCenterScreen';
import { SubmitRequestScreen } from './components/screens/SubmitRequestScreen';
import { DefectReportingScreen } from './components/screens/DefectReportingScreen';
import { AiPlanningScreen } from './components/screens/AiPlanningScreen';
import { BlockTimelineScreen } from './components/screens/BlockTimelineScreen';
import { ConflictManagementScreen } from './components/screens/ConflictManagementScreen';
import { CorridorOperationsScreen } from './components/screens/CorridorOperationsScreen';
import { MaintenanceAssetsScreen } from './components/screens/MaintenanceAssetsScreen';
import { ResourceAllocationScreen } from './components/screens/ResourceAllocationScreen';
import { TrainOperationsScreen } from './components/screens/TrainOperationsScreen';
import { FinalValidationScreen } from './components/screens/FinalValidationScreen';
import { SystemAuditScreen } from './components/screens/SystemAuditScreen';
import { ShadowBlockScreen } from './components/screens/ShadowBlockScreen';

export default function App() {
  // Authentication State (default logged in as Railway Planner for instant SIH review)
  const [currentUser, setCurrentUser] = useState<User | null>(MOCK_USERS[1]); // Smt. Ananya Sen
  const [currentScreen, setCurrentScreen] = useState<string>('command_center');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [presentationMode, setPresentationMode] = useState<boolean>(false);

  // Modals
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [demoModalOpen, setDemoModalOpen] = useState<boolean>(false);
  const [backendModalOpen, setBackendModalOpen] = useState<boolean>(false);
  const [formsModalOpen, setFormsModalOpen] = useState<boolean>(false);
  const [initialFormType, setInitialFormType] = useState<'T409' | 'T351'>('T409');
  const [hotkeysModalOpen, setHotkeysModalOpen] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>(i18n.getLanguage());

  // Target Block or item for drilldowns (e.g. from Timeline or Search to Conflict)
  const [targetConflictBlockId, setTargetConflictBlockId] = useState<string | undefined>(undefined);
  const [targetDefectId, setTargetDefectId] = useState<string | undefined>(undefined);
  const [targetResourceParams, setTargetResourceParams] = useState<{
    resourceType?: string;
    corridorId?: string;
    tab?: 'MACHINERY' | 'MANPOWER' | 'FATIGUE' | 'FORECAST';
    shift?: 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK';
  }>({});

  // Deep linking for field staff QR scanning (?defectId=... or #defect=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryDefect = params.get('defectId');
      const hashMatch = window.location.hash.match(/defect=([^&]+)/);
      const detectedDefect = queryDefect || (hashMatch ? decodeURIComponent(hashMatch[1]) : undefined);
      if (detectedDefect) {
        setCurrentScreen('defects');
        setTargetDefectId(detectedDefect);
      }
    }
  }, []);

  // Domain Datasets State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [requests, setRequests] = useState<BlockRequest[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [blocks, setBlocks] = useState<OptimizedBlock[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [validation, setValidation] = useState<ValidationResult>({
    status: 'REQUIRES_REVIEW',
    decisionText: 'NOT SAFE TO PUBLISH',
    totalBlocks: 42,
    validBlocks: 37,
    invalidBlocks: 5,
    criticalIssuesCount: 5,
    checklist: [],
    criticalIssues: [],
  });
  const [publicationState, setPublicationState] = useState<PublicationWorkflowState>({
    currentState: 'VALIDATION',
    publishedScheduleId: undefined,
    approvedBy: undefined,
    publishedAt: undefined,
    auditLogId: undefined,
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    pythonBackend: false,
    googleAppsScript: true,
    googleSheets: true,
    optimizationEngine: true,
    conflictEngine: true,
    validationEngine: true,
    isMockMode: true,
    apiBaseUrl: 'http://localhost:8000',
    lastSyncTime: '10:35:22',
  });

  // Fetch all domain states
  const refreshAllData = useCallback(async () => {
    const [
      assetsData,
      corridorsData,
      requestsData,
      defectsData,
      blocksData,
      conflictsData,
      trainsData,
      tasksData,
      valData,
      pubData,
      auditData,
      statusData,
    ] = await Promise.all([
      getAssets(),
      getCorridors(),
      getBlockRequests(),
      getDefects(),
      getOptimizedBlocks(),
      getConflicts(),
      getTrains(),
      getMaintenanceTasks(),
      getValidationResult(),
      getPublicationState(),
      getAuditLogs(),
      getSystemStatus(),
    ]);

    setAssets(assetsData);
    setCorridors(corridorsData);
    setRequests(requestsData);
    setDefects(defectsData);
    setBlocks(blocksData);
    setConflicts(conflictsData);
    setTrains(trainsData);
    setTasks(tasksData);
    setValidation(valData);
    setPublicationState(pubData);
    setAuditLogs(auditData);
    setSystemStatus(statusData);
  }, []);

  // Initial load
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Subscribe to i18n language changes
  useEffect(() => {
    return i18n.subscribe((newLang) => {
      setLanguage(newLang);
    });
  }, []);

  // Global Section Controller Keyboard Shortcuts (1-9, L, T/F, M, P, ?, Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true';

      // Cmd/Ctrl+K Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
        return;
      }

      // Escape closes modals
      if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setDemoModalOpen(false);
        setBackendModalOpen(false);
        setFormsModalOpen(false);
        setHotkeysModalOpen(false);
        return;
      }

      // If user is typing in an input field, do not trigger single-key controller hotkeys
      if (isInput) return;

      // Screen navigation numbers 1-9
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        railwayAudio.playBeep(660, 0.05);
        switch (e.key) {
          case '1':
            setCurrentScreen('command_center');
            break;
          case '2':
            setCurrentScreen('conflicts');
            break;
          case '3':
            setCurrentScreen('timeline');
            break;
          case '4':
            setCurrentScreen('trains');
            break;
          case '5':
            setCurrentScreen('validation');
            break;
          case '6':
            setCurrentScreen('command_center');
            setTimeout(() => {
              const el = document.getElementById('corridor-digital-twin-module');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            break;
          case '7':
            setCurrentScreen('command_center');
            setTimeout(() => {
              const el = document.getElementById('department-operations-hub');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            break;
          case '8':
            setCurrentScreen('maintenance_assets');
            break;
          case '9':
            setCurrentScreen('shadow_block');
            break;
        }
        return;
      }

      // 'L' or 'l' toggles Hindi / English
      if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        railwayAudio.playBeep(880, 0.08);
        i18n.toggleLanguage();
        return;
      }

      // 'T' or 'F' opens Railway Forms (T/409 Caution Order, T/351 Disconnection Memo)
      if (e.key.toLowerCase() === 't' || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setInitialFormType(e.key.toLowerCase() === 'f' ? 'T351' : 'T409');
        setFormsModalOpen((prev) => !prev);
        return;
      }

      // 'M' or 'm' toggles Audio Siren / Hooter Mute
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        railwayAudio.toggleMute();
        return;
      }

      // 'P' or 'p' prints Official Railway Bulletin
      if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        printOfficialBulletin({ corridors });
        return;
      }

      // '?' opens Controller Hotkeys Guide
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setHotkeysModalOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [corridors]);

  // Role switch handler
  const handleSelectRole = (role: UserRole) => {
    const matched = MOCK_USERS.find((u) => u.role === role);
    if (matched) {
      setCurrentUser(matched);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Navigation router handler with optional item payload
  const handleNavigate = (screen: string, itemData?: any) => {
    if (screen === 'digital_twin') {
      setCurrentScreen('command_center');
      setTimeout(() => {
        const el = document.getElementById('corridor-digital-twin-module');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    if (screen === 'sustainability') {
      setCurrentScreen('command_center');
      setTimeout(() => {
        const el = document.getElementById('sustainability-dashboard-module');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    setCurrentScreen(screen);
    if (screen === 'conflicts' && itemData?.blockId) {
      setTargetConflictBlockId(itemData.blockId);
    } else {
      setTargetConflictBlockId(undefined);
    }

    if (screen === 'resource_allocation' && itemData) {
      setTargetResourceParams({
        resourceType: itemData.resourceType,
        corridorId: itemData.corridorId,
        tab: itemData.tab,
        shift: itemData.shift,
      });
    } else if (screen !== 'resource_allocation') {
      setTargetResourceParams({});
    }
  };

  // Open target conflict from another screen
  const handleNavigateToConflict = (blockId?: string) => {
    setTargetConflictBlockId(blockId);
    setCurrentScreen('conflicts');
  };

  // Count open conflicts and pending requests
  const openConflictsCount = conflicts.filter((c) => c.status === 'OPEN').length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'PENDING').length;

  // Dedicated publish schedule handler for demo / quick action
  const handlePublishSchedule = useCallback(async (autoResolveIfBlocked = true) => {
    try {
      const result = await publishSchedule(
        currentUser?.name || 'Chief Block Coordinator',
        currentUser?.role || 'RAILWAY_PLANNER',
        autoResolveIfBlocked
      );
      await refreshAllData();
      return result;
    } catch (err) {
      console.error('Error publishing schedule:', err);
      return { success: false, message: String(err) };
    }
  }, [currentUser, refreshAllData]);

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-[#080d19] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Persistent Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onSelectRole={handleSelectRole}
        onLogout={handleLogout}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenDemoWalkthrough={() => setDemoModalOpen(true)}
        onOpenBackendSettings={() => setBackendModalOpen(true)}
        presentationMode={presentationMode}
        onTogglePresentationMode={() => setPresentationMode(!presentationMode)}
        onNavigate={handleNavigate}
        validationStatus={validation.status}
        conflictsCount={openConflictsCount}
        publicationState={publicationState}
        language={language}
        onToggleLanguage={() => setLanguage(i18n.toggleLanguage())}
        onOpenFormsModal={(formType) => {
          setInitialFormType(formType || 'T409');
          setFormsModalOpen(true);
        }}
        onOpenHotkeysModal={() => setHotkeysModalOpen(true)}
      />

      {/* Main Workspace with Persistent Left Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          userRole={currentUser.role}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          presentationMode={presentationMode}
          conflictsCount={openConflictsCount}
          pendingRequestsCount={pendingRequestsCount}
        />

        {/* Dynamic Screen Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#080d19] via-[#090f22] to-[#080d1a] relative pb-12">
          {currentScreen === 'command_center' && (
            <CommandCenterScreen
              onNavigate={handleNavigate}
              validation={validation}
              corridors={corridors}
              openConflictsCount={openConflictsCount}
              totalBlocksCount={blocks.length}
              totalRequestsCount={requests.length}
              totalDefectsCount={defects.length}
              onOpenDemoWalkthrough={() => setDemoModalOpen(true)}
              blocks={blocks}
              requests={requests}
              defects={defects}
              assets={assets}
              onRefreshData={refreshAllData}
            />
          )}

          {currentScreen === 'requests' && (
            <SubmitRequestScreen
              currentUser={currentUser}
              assets={assets}
              corridors={corridors}
              requests={requests}
              onRefreshRequests={refreshAllData}
              onNavigate={handleNavigate}
            />
          )}

          {currentScreen === 'defects' && (
            <DefectReportingScreen
              currentUser={currentUser}
              assets={assets}
              corridors={corridors}
              defects={defects}
              onRefreshDefects={refreshAllData}
              initialSelectedDefectId={targetDefectId}
            />
          )}

          {currentScreen === 'planning' && (
            <AiPlanningScreen
              blocks={blocks}
              onRefreshBlocks={refreshAllData}
              onNavigate={handleNavigate}
            />
          )}

          {currentScreen === 'shadow_block' && (
            <ShadowBlockScreen
              onRefreshData={refreshAllData}
              onNavigate={handleNavigate}
            />
          )}

          {currentScreen === 'timeline' && (
            <BlockTimelineScreen
              blocks={blocks}
              trains={trains}
              corridors={corridors}
              onNavigateToConflict={handleNavigateToConflict}
            />
          )}

          {currentScreen === 'conflicts' && (
            <ConflictManagementScreen
              conflicts={conflicts}
              onRefreshConflicts={refreshAllData}
              onNavigate={handleNavigate}
              targetConflictBlockId={targetConflictBlockId}
            />
          )}

          {currentScreen === 'corridors' && (
            <CorridorOperationsScreen
              corridors={corridors}
              blocks={blocks}
              trains={trains}
              conflicts={conflicts}
              onNavigateToBlockTimeline={() => setCurrentScreen('timeline')}
              onNavigateToConflict={handleNavigateToConflict}
            />
          )}

          {currentScreen === 'maintenance_assets' && (
            <MaintenanceAssetsScreen
              assets={assets}
              tasks={tasks}
              onNavigateToBlockTimeline={() => setCurrentScreen('timeline')}
            />
          )}

          {currentScreen === 'resource_allocation' && (
            <ResourceAllocationScreen
              corridors={corridors}
              onNavigateToTimeline={() => setCurrentScreen('timeline')}
              onNavigateToConflicts={() => setCurrentScreen('conflicts')}
              initialResourceType={targetResourceParams.resourceType}
              initialCorridorId={targetResourceParams.corridorId}
              initialTab={targetResourceParams.tab}
              initialShift={targetResourceParams.shift}
            />
          )}

          {currentScreen === 'trains' && (
            <TrainOperationsScreen
              trains={trains}
              onNavigateToConflict={handleNavigateToConflict}
              onNavigateToBlockTimeline={() => setCurrentScreen('timeline')}
            />
          )}

          {currentScreen === 'validation' && (
            <FinalValidationScreen
              currentUser={currentUser}
              validation={validation}
              publicationState={publicationState}
              corridors={corridors}
              blocks={blocks}
              onRefreshValidation={refreshAllData}
              onNavigateToConflict={handleNavigateToConflict}
              onNavigateToAudit={() => setCurrentScreen('system')}
            />
          )}

          {currentScreen === 'system' && (
            <SystemAuditScreen
              auditLogs={auditLogs}
              systemStatus={systemStatus}
              onOpenBackendSettings={() => setBackendModalOpen(true)}
              onRefreshData={refreshAllData}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onNavigate={handleNavigate}
      />

      <SihDemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onNavigate={handleNavigate}
        onSelectRole={handleSelectRole}
        onTriggerGeneratePlan={refreshAllData}
        onAutoResolveConflicts={refreshAllData}
        onPublishSchedule={handlePublishSchedule}
      />

      <BackendSettingsModal
        isOpen={backendModalOpen}
        onClose={() => setBackendModalOpen(false)}
        onStateReset={refreshAllData}
      />

      {/* Indian Railways Official Caution Order (T/409) & Disconnection (T/351) Forms */}
      <RailwayFormsModal
        isOpen={formsModalOpen}
        onClose={() => setFormsModalOpen(false)}
        language={language}
        initialFormType={initialFormType}
      />

      {/* Section Controller Hotkeys Cheat Sheet */}
      <ControllerHotkeysModal
        isOpen={hotkeysModalOpen}
        onClose={() => setHotkeysModalOpen(false)}
        language={language}
      />

      {/* Real-time Block Bursting Countdown & Safety Siren Watchdog */}
      <BlockBurstingWatchdog
        language={language}
        onToggleLanguage={() => setLanguage(i18n.toggleLanguage())}
        onOpenFormsModal={(formType) => {
          setInitialFormType(formType || 'T409');
          setFormsModalOpen(true);
        }}
        onOpenHotkeysModal={() => setHotkeysModalOpen(true)}
      />
    </div>
  );
}
