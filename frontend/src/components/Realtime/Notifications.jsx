import React, { useState, useEffect } from 'react';
import { Bell, X, Check, AlertTriangle, Info } from 'lucide-react';
import useRealtimeStore from '../../store/realtimeStore';

const Notifications = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    clearNotifications, 
    markAsRead 
  } = useRealtimeStore();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'confirmation':
        return <Check className="h-4 w-4 text-green-400" />;
      case 'cancellation':
        return <X className="h-4 w-4 text-red-400" />;
      case 'refund':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Tani';
    if (diffMins < 60) return `${diffMins} min më parë`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} orë më parë`;
    return `${Math.floor(diffMins / 1440)} ditë më parë`;
  };

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    markAsRead();
  };

  return (
    <div className="relative">
      {/* Bell button with badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-text/70 hover:text-text transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-accent text-text text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-panel border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-heading font-bold text-text">Njoftimet</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <span className="text-sm text-accent font-medium">
                  {unreadCount} të palexuara
                </span>
              )}
              <button
                onClick={clearNotifications}
                className="text-sm text-text/70 hover:text-text transition-colors"
              >
                Pastro të gjitha
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-text/30 mx-auto mb-3" />
                <p className="text-text/70">Nuk keni njoftime</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.slice(0, 20).map((notification, index) => (
                  <div
                    key={index}
                    onClick={() => handleNotificationClick(notification)}
                    className="p-4 hover:bg-primary/50 transition-colors cursor-pointer border-b border-border last:border-b-0"
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-text truncate">
                            {notification.subject}
                          </h4>
                          <span className="text-xs text-text/50">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-text/70 line-clamp-2">
                          {notification.body}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 20 && (
            <div className="p-3 border-t border-border text-center">
              <button className="text-sm text-accent hover:text-accent/80 transition-colors">
                Shiko të gjitha njoftimet
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default Notifications;
