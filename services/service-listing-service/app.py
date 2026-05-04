from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import os
import psycopg2
import psycopg2.extras
from functools import wraps
from prometheus_flask_exporter import PrometheusMetrics

app = Flask(__name__)
CORS(app)

# Initialize metrics (tracks all endpoints automatically)
metrics = PrometheusMetrics(app)

SECRET_KEY = os.environ.get("JWT_SECRET", "supersecretkey_change_in_production")
DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@service-db:5432/servicedb")

def get_db():
    return psycopg2.connect(DB_URL)

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS services (
            id SERIAL PRIMARY KEY,
            freelancer_id INTEGER NOT NULL,
            freelancer_email VARCHAR(255) NOT NULL,
            freelancer_name VARCHAR(255),
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            domain VARCHAR(100) NOT NULL,
            cost NUMERIC(12,2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'USD',
            delivery_days INTEGER DEFAULT 7,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    cur.close()
    conn.close()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Token required"}), 401
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user = data
        except Exception:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "service-listing-service"})

@app.route("/services", methods=["POST"])
@token_required
def create_service():
    if request.user["role"] != "freelancer":
        return jsonify({"error": "Only freelancers can post services"}), 403
    data = request.get_json()
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    domain = data.get("domain", "").strip()
    cost = data.get("cost")
    currency = data.get("currency", "USD")
    delivery_days = data.get("delivery_days", 7)
    freelancer_name = data.get("freelancer_name", "")

    if not title or not description or not domain or cost is None:
        return jsonify({"error": "title, description, domain, and cost are required"}), 400
    try:
        cost = float(cost)
        if cost < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid cost value"}), 400

    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            INSERT INTO services (freelancer_id, freelancer_email, freelancer_name, title, description, domain, cost, currency, delivery_days)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (request.user["user_id"], request.user["email"], freelancer_name,
              title, description, domain, cost, currency, delivery_days))
        service = cur.fetchone()
        conn.commit(); cur.close(); conn.close()
        return jsonify(dict(service)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/services", methods=["GET"])
def list_services():
    domain = request.args.get("domain", "")
    search = request.args.get("search", "")
    page = max(int(request.args.get("page", 1)), 1)
    per_page = 12
    offset = (page - 1) * per_page
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        filters = ["is_active = TRUE"]
        params = []
        if domain:
            filters.append("domain = %s")
            params.append(domain)
        if search:
            filters.append("(title ILIKE %s OR description ILIKE %s)")
            params.extend([f"%{search}%", f"%{search}%"])
        where = "WHERE " + " AND ".join(filters)
        cur.execute(f"SELECT COUNT(*) FROM services {where}", params)
        total = cur.fetchone()["count"]
        cur.execute(f"SELECT * FROM services {where} ORDER BY created_at DESC LIMIT %s OFFSET %s",
                    params + [per_page, offset])
        services = [dict(s) for s in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"services": services, "total": total, "page": page, "per_page": per_page})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/services/<int:service_id>", methods=["GET"])
def get_service(service_id):
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM services WHERE id = %s", (service_id,))
        service = cur.fetchone()
        cur.close(); conn.close()
        if not service:
            return jsonify({"error": "Service not found"}), 404
        return jsonify(dict(service))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/services/<int:service_id>", methods=["DELETE"])
@token_required
def delete_service(service_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("UPDATE services SET is_active=FALSE WHERE id=%s AND freelancer_id=%s",
                    (service_id, request.user["user_id"]))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"message": "Service removed"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/services/my", methods=["GET"])
@token_required
def my_services():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM services WHERE freelancer_id=%s ORDER BY created_at DESC",
                    (request.user["user_id"],))
        services = [dict(s) for s in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"services": services})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5004, debug=False)