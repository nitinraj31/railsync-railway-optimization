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
} from './services/api';
import { MOCK_USERS } from './data/mockData';

// Layout Components
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';

// Common Modals
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { SihDemoModal } from './components/common/SihDemoModal';
import { BackendSettingsModal } from './components/common/BackendSettingsModal';

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

  // Target Block or item for drilldowns (e.g. from Timeline or Search to Conflict)
  const [targetConflictBlockId, setTargetConflictBlockId] = useState<string | undefined>(undefined);
  const [targetResourceParams, setTargetResourceParams] = useState<{
    resourceType?: string;
    corridorId?: string;
    tab?: 'MACHINERY' | 'MANPOWER';
    shift?: 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK';
  }>({});

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

  // Global keyboard shortcut for Cmd+K search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
            />
          )}

          {currentScreen === 'planning' && (
            <AiPlanningScreen
              blocks={blocks}
              onRefreshBlocks={refreshAllData}
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
      />

      <BackendSettingsModal
        isOpen={backendModalOpen}
        onClose={() => setBackendModalOpen(false)}
        onStateReset={refreshAllData}
      />
    </div>
  );
}
