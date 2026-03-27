module.exports = {
    apps: [
        {
            name: "voxel-api",
            script: "./dist/server.js",
            instances: 1, // Must stay 1 — stateful: WhatsApp sockets, cron jobs, in-memory sessions
            exec_mode: "fork",
            env: {
                NODE_ENV: "production",
                WHATSAPP_LIBRARY: "baileys",
                PORT: 3000,
                // Allow Node.js to use up to 6GB of the available 12GB RAM
                NODE_OPTIONS: "--max-old-space-size=6144"
            },
            // Restart if process exceeds 5GB — safety net for memory leaks
            max_memory_restart: "5G",
            // Retry delays to prevent CPU spiking in loop
            exp_backoff_restart_delay: 100,
            max_restarts: 10,
            min_uptime: "30s",
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            error_file: "./logs/pm2-api-error.log",
            out_file: "./logs/pm2-api-out.log",
            merge_logs: true
        },
        {
            name: "voxel-web",
            script: "serve",
            instances: 1, // Static file server — single instance is enough
            exec_mode: "fork",
            env: {
                PM2_SERVE_PATH: "./frontend/dist",
                PM2_SERVE_PORT: 3001,
                PM2_SERVE_SPA: "true",
                PM2_SERVE_HOMEPAGE: "/index.html"
            },
            max_memory_restart: "512M",
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            error_file: "./logs/pm2-web-error.log",
            out_file: "./logs/pm2-web-out.log",
            merge_logs: true
        }
    ]
};
