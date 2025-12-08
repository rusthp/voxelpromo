module.exports = {
    apps: [
        {
            name: "voxel-api",
            script: "./dist/server.js",
            env: {
                NODE_ENV: "production",
                // Force Baileys (lightweight, no Chrome)
                WHATSAPP_LIBRARY: "baileys",
                PORT: 3000
            },
            // Retry delays to prevent CPU spiking in loop
            exp_backoff_restart_delay: 100,
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            error_file: "./logs/pm2-api-error.log",
            out_file: "./logs/pm2-api-out.log"
        },
        {
            name: "voxel-web",
            script: "serve",
            env: {
                PM2_SERVE_PATH: "./frontend/dist",
                PM2_SERVE_PORT: 3001,
                PM2_SERVE_SPA: "true",
                PM2_SERVE_HOMEPAGE: "/index.html"
            },
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            error_file: "./logs/pm2-web-error.log",
            out_file: "./logs/pm2-web-out.log"
        }
    ]
};
