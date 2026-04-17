const RealtimeService = require('./RealtimeService');

class RealtimeInitializer {
    constructor() {
        this.realtimeService = new RealtimeService();
        this.isInitialized = false;
    }

    // Initialize real-time services
    async initialize() {
        if (this.isInitialized) {
            console.log('Real-time service already initialized');
            return;
        }

        try {
            console.log('Initializing real-time services...');
            
            // Initialize Supabase real-time subscriptions
            this.realtimeService.initializeRealtime();
            
            // Start auto-cancel cron job (every 5 minutes)
            this.startAutoCancelJob();
            
            this.isInitialized = true;
            console.log('Real-time services initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize real-time services:', error);
            throw error;
        }
    }

    // Start auto-cancel job
    startAutoCancelJob() {
        // Run every 5 minutes
        setInterval(async () => {
            try {
                console.log('Running auto-cancel job...');
                const cancelledCount = await this.realtimeService.matchService.autoCancelMatches();
                if (cancelledCount > 0) {
                    console.log(`Auto-cancelled ${cancelledCount} matches`);
                }
            } catch (error) {
                console.error('Auto-cancel job failed:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Cleanup on shutdown
    cleanup() {
        if (this.isInitialized) {
            console.log('Cleaning up real-time services...');
            this.realtimeService.cleanup();
            this.isInitialized = false;
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    const initializer = new RealtimeInitializer();
    initializer.cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    const initializer = new RealtimeInitializer();
    initializer.cleanup();
    process.exit(0);
});

module.exports = RealtimeInitializer;
