#!/bin/bash
# =============================================================================
# MONITORING MANAGEMENT SCRIPT FOR FREELANCO
# =============================================================================

# Auto-detect project path (better than hardcoding)
COMPOSE_FILE="$(pwd)/docker-compose.yml"

case "$1" in
    start)
        echo "🚀 Starting monitoring stack..."
        docker compose -f $COMPOSE_FILE up -d prometheus grafana node-exporter cadvisor
        echo "✅ Monitoring started"
        echo "📊 Prometheus: http://localhost:9090"
        echo "📈 Grafana: http://localhost:3001 (admin/admin)"
        echo "🐳 cAdvisor: http://localhost:8080"
        ;;
    stop)
        echo "⏹️  Stopping monitoring stack..."
        docker compose -f $COMPOSE_FILE stop prometheus grafana node-exporter cadvisor
        echo "✅ Monitoring stopped"
        ;;
    restart)
        echo "🔄 Restarting monitoring stack..."
        docker compose -f $COMPOSE_FILE restart prometheus grafana node-exporter cadvisor
        echo "✅ Monitoring restarted"
        ;;
    logs)
        echo "📋 Showing monitoring logs..."
        docker compose -f $COMPOSE_FILE logs -f prometheus grafana
        ;;
    status)
        echo "📊 Monitoring services status:"
        docker compose -f $COMPOSE_FILE ps prometheus grafana node-exporter cadvisor
        ;;
    metrics)
        echo "🔍 Checking if metrics are being collected..."
        echo ""
        echo "Prometheus targets:"
        curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|status|metrics}"
        exit 1
        ;;
esac
