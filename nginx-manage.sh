#!/bin/bash
# =============================================================================
# NGINX MANAGEMENT SCRIPT FOR FREELANCO
# =============================================================================

# Detect WSL vs systemd
if grep -qi microsoft /proc/version; then
    NGINX_CMD="service nginx"
else
    NGINX_CMD="systemctl"
fi

case "$1" in
    start)
        echo "Starting Nginx..."
        sudo $NGINX_CMD start nginx
        echo "✅ Nginx started"
        ;;
    stop)
        echo "Stopping Nginx..."
        sudo $NGINX_CMD stop nginx
        echo "✅ Nginx stopped"
        ;;
    restart)
        echo "Testing config before restart..."
        sudo nginx -t || exit 1
        echo "Restarting Nginx..."
        sudo $NGINX_CMD restart nginx
        echo "✅ Nginx restarted"
        ;;
    reload)
        echo "Testing config before reload..."
        sudo nginx -t || exit 1
        echo "Reloading Nginx configuration..."
        sudo $NGINX_CMD reload nginx
        echo "✅ Nginx configuration reloaded"
        ;;
    test)
        echo "Testing Nginx configuration..."
        sudo nginx -t
        ;;
    status)
        echo "Nginx status:"
        sudo $NGINX_CMD status nginx
        ;;
    logs)
        echo "Showing Nginx error logs (last 50 lines)..."
        echo "Access logs: /var/log/nginx/freelanco-access.log"
        echo "Error logs: /var/log/nginx/freelanco-error.log"
        echo ""
        sudo tail -n 50 /var/log/nginx/freelanco-error.log
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|reload|test|status|logs}"
        exit 1
        ;;
esac
