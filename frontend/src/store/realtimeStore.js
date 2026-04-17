import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const API = 'https://matchday-5-1.onrender.com/api';

const useRealtimeStore = create((set, get) => ({
  subscriptions: [],
  isConnected: false,
  unreadCount: 0,
  notifications: [],

  // Initialize real-time subscriptions
  initializeSubscriptions: (userId) => {
    if (!userId) return;

    console.log('Initializing real-time subscriptions for user:', userId);

    // Subscribe to match player changes
    const matchPlayersSubscription = supabase
      .channel('match_players')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'MatchPlayers' },
        (payload) => {
          console.log('Match players change:', payload);
          get().handleMatchPlayerChange(payload);
        }
      );

    // Subscribe to payment changes
    const paymentsSubscription = supabase
      .channel('player_payments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'PlayerPayments' },
        (payload) => {
          console.log('Payment change:', payload);
          get().handlePaymentChange(payload);
        }
      );

    // Subscribe to booking confirmations
    const bookingsSubscription = supabase
      .channel('bookings')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'Bookings', filter: 'status=eq.confirmed' },
        (payload) => {
          console.log('Booking confirmed:', payload);
          get().handleBookingConfirmation(payload);
        }
      );

    // Subscribe to notifications for this user
    const notificationsSubscription = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'Notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('New notification:', payload);
          get().handleNewNotification(payload);
        }
      );

    const subscriptions = [
      { name: 'match_players', subscription: matchPlayersSubscription },
      { name: 'player_payments', subscription: paymentsSubscription },
      { name: 'bookings', subscription: bookingsSubscription },
      { name: 'notifications', subscription: notificationsSubscription }
    ];

    set({ 
      subscriptions, 
      isConnected: true 
    });

    return subscriptions;
  },

  // Handle match player changes
  handleMatchPlayerChange: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        // New player invited
        if (newRecord.user_id === getCurrentUserId()) {
          set(state => ({
            notifications: [
              {
                type: 'invitation',
                subject: 'Ftesë e re!',
                body: 'Jeni ftuar në një ndeshje. Kontrolloni ftesat tuaja.',
                created_at: new Date().toISOString()
              },
              ...state.notifications
            ],
            unreadCount: state.unreadCount + 1
          }));
        }
        break;

      case 'UPDATE':
        // Player responded to invitation
        if (oldRecord.invitation_status !== newRecord.invitation_status) {
          if (newRecord.invitation_status === 'accepted') {
            // Player accepted - check if match should be confirmed
            get().checkMatchConfirmation(newRecord.booking_id);
          } else if (newRecord.invitation_status === 'declined') {
            // Player declined
            set(state => ({
              notifications: [
                {
                  type: 'cancellation',
                  subject: 'Lojtar refuzoi ftesën!',
                  body: `${newRecord.username || 'Një lojtar'} refuzoi ftesën. Slot është i lirë.`,
                  created_at: new Date().toISOString()
                },
                ...state.notifications
              ],
              unreadCount: state.unreadCount + 1
            }));
          }
        }

        // Check-in status change
        if (oldRecord.check_in_status !== newRecord.check_in_status) {
          if (newRecord.check_in_status === 'checked_in') {
            set(state => ({
              notifications: [
                {
                  type: 'confirmation',
                  subject: 'Check-in i plotësuar!',
                  body: 'Ju keni bërë check-in për ndeshjen.',
                  created_at: new Date().toISOString()
                },
                ...state.notifications
              ],
              unreadCount: state.unreadCount + 1
            }));
          }
        }
        break;
    }
  },

  // Handle payment changes
  handlePaymentChange: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'UPDATE' && oldRecord.status !== newRecord.status) {
      if (newRecord.status === 'paid' && newRecord.user_id === getCurrentUserId()) {
        set(state => ({
          notifications: [
            {
              type: 'confirmation',
              subject: 'Pagesa e plotësuar!',
              body: `Pagesa €${newRecord.total_amount} për ndeshjen është konfirmuar.`,
              created_at: new Date().toISOString()
            },
            ...state.notifications
          ],
          unreadCount: state.unreadCount + 1
        }));
      } else if (newRecord.status === 'refunded' && newRecord.user_id === getCurrentUserId()) {
        set(state => ({
          notifications: [
            {
              type: 'refund',
              subject: 'Rimbursim i procesuar!',
              body: `Rimbursimi €${newRecord.total_amount} është procesuar.`,
              created_at: new Date().toISOString()
            },
            ...state.notifications
          ],
          unreadCount: state.unreadCount + 1
        }));
      }
    }
  },

  // Handle booking confirmation (when 12th player accepts)
  handleBookingConfirmation: (payload) => {
    const { new: booking } = payload;

    set(state => ({
      notifications: [
        {
          type: 'confirmation',
          subject: '✅ Ndeshja u konfirmua!',
          body: `Ndeshja në ${booking.field_name} është konfirmuar! Orari është bllokuar.`,
          created_at: new Date().toISOString()
        },
        ...state.notifications
      ],
      unreadCount: state.unreadCount + 1
    }));
  },

  // Handle new notification
  handleNewNotification: (payload) => {
    const { new: notification } = payload;

    set(state => ({
      notifications: [
        {
          type: notification.type,
          subject: notification.subject,
          body: notification.body,
          created_at: notification.created_at
        },
        ...state.notifications
      ],
      unreadCount: state.unreadCount + 1
    }));
  },

  // Check if match should be confirmed
  checkMatchConfirmation: async (bookingId) => {
    try {
      // Get match details to check player count
      const response = await fetch(`${API}/matches/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('matchday_token')}`
        }
      });

      if (response.ok) {
        const match = await response.json();
        
        // If 12 players have accepted, show confirmation
        if (match.accepted_players >= 12) {
          set(state => ({
            notifications: [
              {
                type: 'confirmation',
                subject: '✅ Ndeshja u konfirmua!',
                body: `Ndeshja në ${match.field_name} është konfirmuar!`,
                created_at: new Date().toISOString()
              },
              ...state.notifications
            ],
            unreadCount: state.unreadCount + 1
          }));
        }
      }
    } catch (error) {
      console.error('Error checking match confirmation:', error);
    }
  },

  // Clear notifications
  clearNotifications: () => {
    set({ 
      notifications: [], 
      unreadCount: 0 
    });
  },

  // Mark notifications as read
  markAsRead: async () => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('matchday_token')}`,
          'Content-Type': 'application/json'
        }
      });

      set({ 
        unreadCount: 0 
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  },

  // Cleanup subscriptions
  cleanup: () => {
    const { subscriptions } = get();
    
    subscriptions.forEach(({ subscription }) => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    });

    set({ 
      subscriptions: [], 
      isConnected: false 
    });
  }
}));

// Helper function to get current user ID
const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('matchday_user') || '{}');
    return user.id;
  } catch (error) {
    return null;
  }
};

export default useRealtimeStore;
