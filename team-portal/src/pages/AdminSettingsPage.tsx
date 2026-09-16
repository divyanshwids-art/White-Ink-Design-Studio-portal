import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SystemSettings, EmployeeScheduleOverride, User } from '../types';
import {
  checkPushSupport,
  requestPushPermission,
  triggerLocalNotification,
  PushStatus,
} from '../utils/pushNotifications';
import { initAndRegisterFcmToken } from '../utils/fcm';
import {
  Settings,
  Clock,
  Bell,
  Users,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  Sparkles,
  Calendar,
  Key,
  FileText,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lock,
  ShieldCheck,
  Globe,
  Folder,
  ExternalLink,
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>({
    id: 'default',
    officeStartTime: '09:00',
    officeEndTime: '18:00',
    lateGraceMinutes: 15,
    lateThresholdMinutes: 15,
    maxBreakMinutes: 60,
    defaultLeaveAllowance: 18,
    meetingLink: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [overrides, setOverrides] = useState<EmployeeScheduleOverride[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Push Notifications State
  const [pushStatus, setPushStatus] = useState<PushStatus>({
    supported: true,
    permission: 'default',
    isSubscribed: false,
  });
  const [testingPush, setTestingPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState('');

  // Override Modal
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    userId: '',
    officeStartTime: '10:00',
    officeEndTime: '19:00',
    lateGraceMinutes: 20,
    notes: 'Flexible working hours agreement',
  });
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState('');

  // Voluntary Password Change State (Part D)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setPasswordSuccess(res.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Google Integration State (Super Admin Only)
  const [googleStatus, setGoogleStatus] = useState<any>(null);
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState('');
  const [sheetNameInput, setSheetNameInput] = useState('');
  const [savingGoogleSettings, setSavingGoogleSettings] = useState(false);
  const [syncingAttendance, setSyncingAttendance] = useState(false);
  const [googleFeedback, setGoogleFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadGoogleStatus = async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    try {
      const status = await api.getGoogleStatus();
      setGoogleStatus(status);
      setSpreadsheetIdInput(status.sheetsAttendanceSpreadsheetId || '');
      setSheetNameInput(status.sheetsAttendanceSheetName || 'Attendance_Log');
    } catch (err: any) {
      console.warn('Failed to load Google status:', err?.message);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await api.getGoogleConnectUrl();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      setGoogleFeedback({ type: 'error', message: err.message || 'Failed to start Google connection' });
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm('Disconnect the portal Google account? Google services (Drive, Calendar, Sheets, Gmail) will fall back to local offline modes.')) return;
    try {
      await api.disconnectGoogle();
      setGoogleFeedback({ type: 'success', message: 'Google account disconnected. Fallbacks active.' });
      loadGoogleStatus();
    } catch (err: any) {
      setGoogleFeedback({ type: 'error', message: err.message || 'Failed to disconnect Google' });
    }
  };

  const handleSaveGoogleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingGoogleSettings(true);
      const res = await api.updateGoogleSettings({
        sheetsAttendanceSpreadsheetId: spreadsheetIdInput.trim() || undefined,
        sheetsAttendanceSheetName: sheetNameInput.trim() || undefined,
      });
      setGoogleFeedback({ type: 'success', message: 'Google integration settings saved.' });
      setGoogleStatus(res.settings);
    } catch (err: any) {
      setGoogleFeedback({ type: 'error', message: err.message || 'Failed to save settings' });
    } finally {
      setSavingGoogleSettings(false);
    }
  };

  const handleSyncAttendanceNow = async () => {
    try {
      setSyncingAttendance(true);
      const res = await api.syncGoogleAttendance();
      if (res.success) {
        setGoogleFeedback({
          type: 'success',
          message: `Attendance synchronized: ${res.syncedCount} record(s) synced to Google Sheets.`,
        });
        loadGoogleStatus();
      } else {
        setGoogleFeedback({
          type: 'error',
          message: res.error || 'Attendance sync encountered an issue.',
        });
      }
    } catch (err: any) {
      setGoogleFeedback({ type: 'error', message: err.message || 'Failed to sync attendance to Google Sheets' });
    } finally {
      setSyncingAttendance(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, overridesRes, usersRes] = await Promise.all([
        api.getSettings().catch(() => null),
        api.getScheduleOverrides().catch(() => []),
        api.getUsers().catch(() => []),
      ]);

      if (settingsRes?.settings) {
        setSettings(settingsRes.settings);
      }
      setOverrides(overridesRes);
      setUsers(usersRes.filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN'));

      const pStatus = await checkPushSupport();
      setPushStatus(pStatus);

      if (user?.role === 'SUPER_ADMIN') {
        loadGoogleStatus();
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      setGoogleFeedback({ type: 'success', message: 'Google account connected successfully! Portal services are now authorized.' });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('google_error')) {
      setGoogleFeedback({ type: 'error', message: `Google authorization failed: ${params.get('google_error')}` });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSaveSuccess(false);

      const res = await api.updateSettings({
        officeStartTime: settings.officeStartTime,
        officeEndTime: settings.officeEndTime,
        lateGraceMinutes: Number(settings.lateGraceMinutes || settings.lateThresholdMinutes || 15),
        lateThresholdMinutes: Number(settings.lateGraceMinutes || settings.lateThresholdMinutes || 15),
        maxBreakMinutes: Number(settings.maxBreakMinutes),
        defaultLeaveAllowance: Number(settings.defaultLeaveAllowance),
        meetingLink: settings.meetingLink || null,
      });

      setSettings(res.settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update system settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenAddOverride = () => {
    setOverrideForm({
      userId: users[0]?.id || '',
      officeStartTime: '10:00',
      officeEndTime: '19:00',
      lateGraceMinutes: 20,
      notes: 'Flexi-time schedule agreement',
    });
    setOverrideError('');
    setIsOverrideModalOpen(true);
  };

  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideForm.userId) {
      setOverrideError('Please choose an employee');
      return;
    }

    try {
      setOverrideLoading(true);
      setOverrideError('');

      await api.setScheduleOverride({
        userId: overrideForm.userId,
        customStartTime: overrideForm.officeStartTime,
        customEndTime: overrideForm.officeEndTime,
        notes: overrideForm.notes.trim() || undefined,
      });

      setIsOverrideModalOpen(false);
      loadData();
    } catch (err: any) {
      setOverrideError(err.message || 'Failed to set schedule override');
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleDeleteOverride = async (userId: string, userName?: string) => {
    if (!window.confirm(`Reset custom schedule for ${userName || 'this employee'} back to office default?`)) return;
    try {
      await api.deleteScheduleOverride(userId);
      setOverrides((prev) => prev.filter((o) => o.userId !== userId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete schedule override');
    }
  };

  const handleEnablePush = async () => {
    setPushFeedback('');
    const fcmRes = await initAndRegisterFcmToken();
    const updated = await checkPushSupport();
    setPushStatus(updated);

    if (fcmRes.success) {
      setPushFeedback('Firebase Cloud Messaging connected and device token registered!');
      triggerLocalNotification('FCM Push Connected', {
        body: 'Real-time background & desktop push notifications are active.',
      });
      return;
    }

    if (fcmRes.reason === 'unconfigured') {
      const granted = await requestPushPermission();
      const st = await checkPushSupport();
      setPushStatus(st);
      if (granted) {
        setPushFeedback('Browser notifications enabled. Add Firebase credentials in Settings to enable closed-tab FCM push.');
      }
      return;
    }

    if (fcmRes.reason === 'permission_denied') {
      setPushFeedback('Notification permission was denied in your browser settings.');
    }
  };

  const handleTestFcmPush = async () => {
    setTestingPush(true);
    setPushFeedback('');
    try {
      const res = await api.testFcmPush({
        title: 'FCM Push Alert',
        message: 'Firebase Cloud Messaging push notification received successfully!',
      });
      setPushFeedback(res.message || 'Push alert sent to your device via FCM!');
    } catch (err: any) {
      triggerLocalNotification('Desktop Notification Test', {
        body: 'Desktop alert received. (FCM background push requires Firebase Admin credentials).',
      });
      setPushFeedback(err.message || 'Desktop notification triggered.');
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-black flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-gold-600 stroke-[2.5]" />
          System Settings & Operational Policies
        </h1>
        <p className="text-sm text-black/70 font-medium mt-1">
          Configure standard working hours, attendance late-arrival thresholds, custom employee shift overrides, and push notifications.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Standard Working Hours & Policies Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-xl border border-gold-300 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <h2 className="text-base font-extrabold text-black flex items-center gap-2">
                <Clock className="h-5 w-5 text-gold-600 stroke-[2.5]" />
                Default Working Hours & Attendance Rules
              </h2>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-gold-50 border border-gold-300 text-black font-bold text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gold-700 shrink-0" />
                <span>System policies and working schedule updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    Standard Office Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={settings.officeStartTime}
                    onChange={(e) => setSettings({ ...settings, officeStartTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                  />
                  <span className="text-[11px] text-black/60 font-semibold">Check-in after this is flagged as Late</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    Standard Office End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={settings.officeEndTime}
                    onChange={(e) => setSettings({ ...settings, officeEndTime: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                  />
                  <span className="text-[11px] text-black/60 font-semibold">Official close of business</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    Late Grace Window (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    required
                    value={settings.lateGraceMinutes}
                    onChange={(e) =>
                      setSettings({ ...settings, lateGraceMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                  />
                  <span className="text-[11px] text-black/60 font-semibold">e.g. 15 mins allows up to 09:15 AM</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    Max Daily Break (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    required
                    value={settings.maxBreakMinutes}
                    onChange={(e) =>
                      setSettings({ ...settings, maxBreakMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                  />
                  <span className="text-[11px] text-black/60 font-semibold">Lunch + coffee allowance</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Default Annual Leave Days Allowance *
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  required
                  value={settings.defaultLeaveAllowance}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultLeaveAllowance: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Client Meeting Link
                  <span className="ml-2 text-[10px] font-bold text-black/50 normal-case tracking-normal">Optional — shown to clients on project confirmation</span>
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={settings.meetingLink || ''}
                  onChange={(e) => setSettings({ ...settings, meetingLink: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                />
              </div>

              <div className="pt-3 border-t border-gold-200 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black text-xs font-bold rounded-lg border border-gold-600 shadow-xs transition-colors disabled:opacity-50 cursor-pointer btn-hover-lift"
                >
                  <Save className="h-4 w-4" />
                  {savingSettings ? 'Saving Policies...' : 'Save Global Policies'}
                </button>
              </div>
            </form>
          </div>

          {/* Push Notifications Configuration Card */}
          <div className="bg-white rounded-xl border border-gold-300 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <h2 className="text-base font-extrabold text-black flex items-center gap-2">
                <Bell className="h-5 w-5 text-gold-600 stroke-[2.5]" />
                Firebase Cloud Messaging & Push Alerts
              </h2>
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  pushStatus.isSubscribed
                    ? 'bg-gold-200 text-black border border-gold-400'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {pushStatus.isSubscribed ? 'Subscribed' : 'Action Required'}
              </span>
            </div>

            <p className="text-xs text-black/70 font-medium leading-relaxed">
              Firebase Cloud Messaging (FCM) enables background push alerts even when the browser tab is closed. Notifications are automatically triggered on task assignments, leave reviews, and chat mentions.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleEnablePush}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black text-xs font-bold rounded-lg border border-gold-600 shadow-xs transition-colors cursor-pointer btn-hover-lift"
              >
                <Bell className="h-4 w-4" />
                {pushStatus.isSubscribed ? 'Refresh FCM Token' : 'Enable FCM Notifications'}
              </button>

              {pushStatus.isSubscribed && (
                <button
                  type="button"
                  disabled={testingPush}
                  onClick={handleTestFcmPush}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-gold-100 hover:bg-gold-200 text-black text-xs font-bold rounded-lg border border-gold-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5 text-gold-700" />
                  {testingPush ? 'Sending Test...' : 'Send Test Push Alert'}
                </button>
              )}
            </div>

            {pushFeedback && (
              <p className="text-xs text-black font-semibold bg-gold-50 border border-gold-300 p-2.5 rounded-lg">
                {pushFeedback}
              </p>
            )}
          </div>

          {/* Super Admin Google Cloud & Workspace Foundation */}
          {user?.role === 'SUPER_ADMIN' && (
            <div className="bg-white rounded-xl border border-gold-300 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gold-200 pb-3">
                <h2 className="text-base font-extrabold text-black flex items-center gap-2">
                  <Globe className="h-5 w-5 text-gold-600 stroke-[2.5]" />
                  Google Cloud & Workspace Services
                </h2>
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    googleStatus?.isConnected
                      ? 'bg-gold-200 text-black border border-gold-400'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {googleStatus?.isConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>

              <p className="text-xs text-black/70 font-medium leading-relaxed">
                Connect the company owner/super admin Google account to automate Drive project folders, dynamic Google Meet links, Sheets attendance mirroring, and transactional Gmail notifications. Team members and clients use the portal without needing individual Google accounts.
              </p>

              {googleFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-bold border flex items-center gap-2 ${
                    googleFeedback.type === 'success'
                      ? 'bg-gold-50 border-gold-300 text-black'
                      : 'bg-rose-50 border-rose-300 text-rose-800'
                  }`}
                >
                  {googleFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-gold-700 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span>{googleFeedback.message}</span>
                </div>
              )}

              {!googleStatus?.isConnected ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black text-xs font-bold rounded-lg border border-gold-600 shadow-xs transition-colors cursor-pointer btn-hover-lift"
                  >
                    <Globe className="h-4 w-4" />
                    Connect Google Account
                  </button>
                  <p className="text-[11px] text-black/50 font-semibold mt-1.5">
                    Requires Google Cloud OAuth credentials configured in .env.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gold-50/60 rounded-lg border border-gold-200">
                    <div>
                      <div className="text-xs font-bold text-black flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-gold-600" />
                        Connected Account: <span className="font-extrabold">{googleStatus.email}</span>
                      </div>
                      <div className="text-[11px] text-black/60 font-semibold mt-0.5">
                        Active Services: Drive, Calendar, Meet, Gmail, Sheets
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDisconnectGoogle}
                      className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>

                  {/* Drive Root Status */}
                  <div className="text-xs border border-gold-200 rounded-lg p-3 bg-white">
                    <div className="font-bold text-black flex items-center gap-1.5">
                      <Folder className="h-4 w-4 text-gold-600" />
                      Google Drive Root Folder
                    </div>
                    <p className="text-[11px] text-black/60 font-semibold mt-0.5">
                      {googleStatus.driveRootFolderId
                        ? `Configured Folder ID: ${googleStatus.driveRootFolderId}`
                        : 'Auto-creates "White Ink Portal" root folder on next project/file action.'}
                    </p>
                  </div>

                  {/* Sheets Attendance Sync Settings */}
                  <form onSubmit={handleSaveGoogleSettings} className="space-y-3 pt-1 border-t border-gold-200">
                    <div className="text-xs font-extrabold text-black">
                      Google Sheets Attendance Mirroring
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-black mb-1">
                          Spreadsheet ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                          value={spreadsheetIdInput}
                          onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-gold-300 rounded-lg bg-white text-black font-medium focus:ring-1 focus:ring-gold-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-black mb-1">
                          Sheet Tab Name
                        </label>
                        <input
                          type="text"
                          placeholder="Attendance_Log"
                          value={sheetNameInput}
                          onChange={(e) => setSheetNameInput(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-gold-300 rounded-lg bg-white text-black font-medium focus:ring-1 focus:ring-gold-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={savingGoogleSettings}
                        className="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-black text-xs font-bold rounded-lg border border-gold-600 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {savingGoogleSettings ? 'Saving...' : 'Save Sheets Config'}
                      </button>

                      <button
                        type="button"
                        disabled={syncingAttendance}
                        onClick={handleSyncAttendanceNow}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold-100 hover:bg-gold-200 text-black text-xs font-bold rounded-lg border border-gold-300 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-gold-700 ${syncingAttendance ? 'animate-spin' : ''}`} />
                        {syncingAttendance ? 'Syncing...' : 'Sync Attendance Now'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Employee Schedule Overrides Table */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-xl border border-gold-300 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-black flex items-center gap-2">
                  <Users className="h-5 w-5 text-gold-600 stroke-[2.5]" />
                  Custom Shift & Schedule Overrides
                </h2>
                <p className="text-xs text-black/60 font-medium mt-0.5">
                  Individual schedules for remote workers, night shifts, or flexi-time
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddOverride}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gold-500 hover:bg-gold-600 text-black text-xs font-bold rounded-lg border border-gold-600 shadow-xs transition-colors cursor-pointer btn-hover-lift"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                Add Override
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-black/60">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-3 border-gold-600 border-t-transparent mb-2" />
                <p className="text-xs font-bold">Loading overrides...</p>
              </div>
            ) : overrides.length === 0 ? (
              <div className="p-8 text-center text-black/50 border border-dashed border-gold-300 rounded-xl bg-gold-50/20">
                <Clock className="h-8 w-8 text-gold-400 mx-auto mb-2" />
                <h3 className="text-sm font-extrabold text-black">No custom shift overrides</h3>
                <p className="text-xs mt-1 font-medium">
                  All team members currently follow standard office hours ({settings.officeStartTime} -{' '}
                  {settings.officeEndTime}).
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {overrides.map((ovr) => {
                  const emp = ovr.user || users.find((u) => u.id === ovr.userId);

                  return (
                    <div
                      key={ovr.id}
                      className="p-4 rounded-xl border border-gold-300 bg-gold-50/40 hover:bg-gold-50 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-black">
                            {emp?.name || 'Employee'}
                          </span>
                          <span className="text-[11px] font-extrabold px-2 py-0.5 bg-gold-200 text-black rounded border border-gold-400">
                            {ovr.customStartTime || (ovr as any).officeStartTime} –{' '}
                            {ovr.customEndTime || (ovr as any).officeEndTime}
                          </span>
                        </div>
                        <div className="text-[11px] text-black/70 font-medium">
                          {ovr.notes ? <span className="italic">"{ovr.notes}"</span> : 'Custom shift agreement'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteOverride(ovr.userId, emp?.name)}
                        className="p-1.5 text-black/40 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Override"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Card (Part D voluntary password management) */}
      <div className="bg-white rounded-xl border border-gold-300 shadow-xs">
        <div className="px-6 py-4 border-b border-gold-200">
          <h2 className="text-sm font-bold text-black flex items-center gap-2">
            <Key className="h-4 w-4 text-gold-600 stroke-[2.5]" />
            Change Password
          </h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            Confirm your current password before setting a new one
          </p>
        </div>

        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-3.5 pr-10 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-0.5 cursor-pointer"
                title={showCurrentPassword ? 'Hide password' : 'Show password'}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className="w-full pl-3.5 pr-10 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-0.5 cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  className="w-full pl-3.5 pr-10 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-0.5 cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {passwordSuccess && (
            <div className="flex items-center gap-2 p-3 text-sm text-black bg-gold-50 border border-gold-300 font-medium rounded-lg">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-gold-700" />
              {passwordSuccess}
            </div>
          )}
          {passwordError && (
            <div className="flex items-center gap-2 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {passwordError}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={passwordLoading}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 shadow-xs cursor-pointer btn-hover-lift"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Add Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gold-300 space-y-4">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <h2 className="text-lg font-extrabold text-black flex items-center gap-2">
                <Clock className="h-5 w-5 text-gold-600 stroke-[2.5]" />
                Set Employee Shift Override
              </h2>
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="p-1 text-black/50 hover:text-black rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {overrideError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg">
                {overrideError}
              </div>
            )}

            <form onSubmit={handleSubmitOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Select Employee *
                </label>
                <select
                  required
                  value={overrideForm.userId}
                  onChange={(e) => setOverrideForm({ ...overrideForm, userId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                >
                  <option value="" disabled>
                    Select Employee
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={overrideForm.officeStartTime}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, officeStartTime: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={overrideForm.officeEndTime}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, officeEndTime: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Custom Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={overrideForm.lateGraceMinutes}
                  onChange={(e) =>
                    setOverrideForm({ ...overrideForm, lateGraceMinutes: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved night shift / timezone coordination"
                  value={overrideForm.notes}
                  onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gold-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-hidden bg-white text-black font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-black bg-gold-100 hover:bg-gold-200 border border-gold-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideLoading}
                  className="px-4 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs btn-hover-lift"
                >
                  {overrideLoading ? 'Applying...' : 'Save Shift Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
