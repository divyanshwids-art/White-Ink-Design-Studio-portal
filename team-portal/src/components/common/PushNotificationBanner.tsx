import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import { subscribeToWebPush } from '../../utils/pushNotifications';

export const PushNotificationBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const dismissed = sessionStorage.getItem('pms_push_banner_dismissed');
    if (dismissed) return;

    if (Notification.permission === 'default') {
      setShow(true);
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const success = await subscribeToWebPush();
      if (success) {
        setEnabled(true);
        setTimeout(() => setShow(false), 2500);
      } else {
        setShow(false);
      }
    } catch {
      setShow(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('pms_push_banner_dismissed', 'true');
  };

  if (!show) return null;

  return (
    <div className="bg-[#FAF4EC] border-b border-[#EDE3D4] px-4 py-2.5 sm:px-6 flex items-center justify-between text-xs text-[#1C1917] animate-gold-fade-in transition-all">
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded-lg bg-[#BA954F]/15 text-[#BA954F] shrink-0">
          <Bell className="h-4 w-4" />
        </div>
        <p className="font-medium">
          {enabled ? (
            <span className="text-emerald-700 flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Notifications enabled! You will now receive team alerts even when the portal is closed.
            </span>
          ) : (
            <>
              <strong>Enable Chrome Desktop Alerts:</strong> Receive notifications for team messages, mentions, and tasks even when the portal tab is closed.
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-4">
        {!enabled && (
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="px-3 py-1 bg-[#1C1917] hover:bg-[#3D3A37] text-white font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            {loading ? 'Enabling...' : 'Enable Alerts'}
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-[#78716C] hover:text-[#1C1917] rounded-md transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

