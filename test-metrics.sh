#!/bin/bash
echo "Testing all metrics endpoints..."
echo ""

services=(
  "Prometheus:9090"
  "API-Gateway:8000"
  "Auth-Service:5001"
  "User-Service:5002"
  "Job-Service:5003"
  "Service-Listing:5004"
  "Chat-Service:5005"
  "Node-Exporter:9100"
  "cAdvisor:8080"
)

for service in "${services[@]}"; do
  name="${service%%:*}"
  port="${service##*:}"
  
  if [ "$port" = "8080" ]; then
    url="http://localhost:$port/metrics"
  else
    url="http://localhost:$port/metrics"
  fi
  
  echo -n "Testing $name... "
  
  if curl -s -f "$url" > /dev/null; then
    echo "✅ OK"
  else
    echo "❌ FAILED"
  fi
done
