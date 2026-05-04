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
DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@user-db:5432/userdb")

def get_db():
    return psycopg2.connect(DB_URL)

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS freelancer_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL,
            email VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            skills TEXT[] NOT NULL DEFAULT '{}',
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS client_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL,
            email VARCHAR(255) NOT NULL,
            company_name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            website TEXT,
            avatar_url TEXT,
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
    return jsonify({"status": "healthy", "service": "user-service"})

# ── Freelancer Profile ────────────────────────────────────────────────────────

@app.route("/freelancer/profile", methods=["POST"])
@token_required
def create_freelancer_profile():
    if request.user["role"] != "freelancer":
        return jsonify({"error": "Only freelancers can create freelancer profiles"}), 403
    data = request.get_json()
    full_name = data.get("full_name", "").strip()
    description = data.get("description", "").strip()
    skills = data.get("skills", [])
    if not full_name or not description or not skills:
        return jsonify({"error": "full_name, description, and skills are required"}), 400
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            INSERT INTO freelancer_profiles (user_id, email, full_name, description, skills)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE
            SET full_name=%s, description=%s, skills=%s, updated_at=CURRENT_TIMESTAMP
            RETURNING *
        """, (request.user["user_id"], request.user["email"], full_name, description, skills,
              full_name, description, skills))
        profile = cur.fetchone()
        conn.commit(); cur.close(); conn.close()
        return jsonify(dict(profile)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/freelancer/profile", methods=["GET"])
@token_required
def get_own_freelancer_profile():
    return get_freelancer_profile_by_uid(request.user["user_id"])

@app.route("/freelancer/profile/<int:user_id>", methods=["GET"])
def get_freelancer_profile(user_id):
    return get_freelancer_profile_by_uid(user_id)

def get_freelancer_profile_by_uid(user_id):
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM freelancer_profiles WHERE user_id = %s", (user_id,))
        profile = cur.fetchone()
        cur.close(); conn.close()
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        return jsonify(dict(profile))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Client Profile ────────────────────────────────────────────────────────────

@app.route("/client/profile", methods=["POST"])
@token_required
def create_client_profile():
    if request.user["role"] != "client":
        return jsonify({"error": "Only clients can create client profiles"}), 403
    data = request.get_json()
    company_name = data.get("company_name", "").strip()
    description = data.get("description", "").strip()
    website = data.get("website", "").strip()
    if not company_name or not description:
        return jsonify({"error": "company_name and description are required"}), 400
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            INSERT INTO client_profiles (user_id, email, company_name, description, website)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE
            SET company_name=%s, description=%s, website=%s, updated_at=CURRENT_TIMESTAMP
            RETURNING *
        """, (request.user["user_id"], request.user["email"], company_name, description, website,
              company_name, description, website))
        profile = cur.fetchone()
        conn.commit(); cur.close(); conn.close()
        return jsonify(dict(profile)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/client/profile", methods=["GET"])
@token_required
def get_own_client_profile():
    return get_client_profile_by_uid(request.user["user_id"])

@app.route("/client/profile/<int:user_id>", methods=["GET"])
def get_client_profile(user_id):
    return get_client_profile_by_uid(user_id)

def get_client_profile_by_uid(user_id):
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM client_profiles WHERE user_id = %s", (user_id,))
        profile = cur.fetchone()
        cur.close(); conn.close()
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        return jsonify(dict(profile))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5002, debug=False)