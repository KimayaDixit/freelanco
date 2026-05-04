from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests as http_requests
import os
import jwt
from functools import wraps
from prometheus_flask_exporter import PrometheusMetrics

app = Flask(__name__)
CORS(app)

# Initialize metrics (tracks all endpoints automatically)
metrics = PrometheusMetrics(app)

SECRET_KEY = os.environ.get("JWT_SECRET", "supersecretkey_change_in_production")

SERVICES = {
    "auth":    os.environ.get("AUTH_SERVICE_URL",    "http://auth-service:5001"),
    "user":    os.environ.get("USER_SERVICE_URL",    "http://user-service:5002"),
    "jobs":    os.environ.get("JOB_SERVICE_URL",     "http://job-service:5003"),
    "service": os.environ.get("SERVICE_LISTING_URL", "http://service-listing-service:5004"),
    "chat":    os.environ.get("CHAT_SERVICE_URL",    "http://chat-service:5005"),
}

def proxy(service_name, path, method=None, **kwargs):
    base = SERVICES.get(service_name)
    if not base:
        return jsonify({"error": "Service not found"}), 503
    url = f"{base}{path}"
    m = method or request.method
    headers = {k: v for k, v in request.headers if k != "Host"}
    try:
        resp = http_requests.request(
            m, url,
            headers=headers,
            json=request.get_json(silent=True),
            params=request.args,
            timeout=15,
            **kwargs
        )
        return Response(resp.content, status=resp.status_code,
                        content_type=resp.headers.get("Content-Type", "application/json"))
    except http_requests.exceptions.ConnectionError:
        return jsonify({"error": f"Service {service_name} unavailable"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    results = {}
    for name, base in SERVICES.items():
        try:
            r = http_requests.get(f"{base}/health", timeout=3)
            results[name] = r.json()
        except Exception:
            results[name] = {"status": "unreachable"}
    return jsonify({"gateway": "healthy", "services": results})

# ── Auth Routes ───────────────────────────────────────────────────────────────
@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    return proxy("auth", "/register")

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    return proxy("auth", "/login")

@app.route("/api/auth/verify", methods=["GET"])
def auth_verify():
    return proxy("auth", "/verify")

# ── User Routes ───────────────────────────────────────────────────────────────
@app.route("/api/users/freelancer/profile", methods=["GET", "POST"])
def freelancer_profile():
    return proxy("user", "/freelancer/profile")

@app.route("/api/users/freelancer/profile/<int:user_id>", methods=["GET"])
def freelancer_profile_by_id(user_id):
    return proxy("user", f"/freelancer/profile/{user_id}")

@app.route("/api/users/client/profile", methods=["GET", "POST"])
def client_profile():
    return proxy("user", "/client/profile")

@app.route("/api/users/client/profile/<int:user_id>", methods=["GET"])
def client_profile_by_id(user_id):
    return proxy("user", f"/client/profile/{user_id}")

# ── Job Routes ────────────────────────────────────────────────────────────────
@app.route("/api/jobs", methods=["GET", "POST"])
def jobs():
    return proxy("jobs", "/jobs")

@app.route("/api/jobs/my", methods=["GET"])
def my_jobs():
    return proxy("jobs", "/jobs/my")

@app.route("/api/jobs/domains", methods=["GET"])
def job_domains():
    return proxy("jobs", "/domains")

@app.route("/api/jobs/<int:job_id>", methods=["GET", "DELETE"])
def job_detail(job_id):
    return proxy("jobs", f"/jobs/{job_id}")

# ── Service Listing Routes ────────────────────────────────────────────────────
@app.route("/api/services", methods=["GET", "POST"])
def services():
    return proxy("service", "/services")

@app.route("/api/services/my", methods=["GET"])
def my_services():
    return proxy("service", "/services/my")

@app.route("/api/services/<int:service_id>", methods=["GET", "DELETE"])
def service_detail(service_id):
    return proxy("service", f"/services/{service_id}")

# ── Chat Routes ───────────────────────────────────────────────────────────────
@app.route("/api/chat/requests", methods=["POST"])
def send_chat_request():
    return proxy("chat", "/requests")

@app.route("/api/chat/requests/incoming", methods=["GET"])
def incoming_requests():
    return proxy("chat", "/requests/incoming")

@app.route("/api/chat/requests/outgoing", methods=["GET"])
def outgoing_requests():
    return proxy("chat", "/requests/outgoing")

@app.route("/api/chat/requests/<int:req_id>/respond", methods=["POST"])
def respond_request(req_id):
    return proxy("chat", f"/requests/{req_id}/respond")

@app.route("/api/chat/messages/<int:other_user_id>", methods=["GET"])
def get_messages(other_user_id):
    return proxy("chat", f"/messages/{other_user_id}")

@app.route("/api/chat/connections", methods=["GET"])
def get_connections():
    return proxy("chat", "/connections")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)