from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import bcrypt
import datetime
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
DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@auth-db:5432/authdb")

def get_db():
    return psycopg2.connect(DB_URL)

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(20) NOT NULL CHECK (role IN ('freelancer', 'client')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    cur.close()
    conn.close()

def generate_token(user_id, email, role):
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7),
        "iat": datetime.datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Token required"}), 401
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user = data
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "auth-service"})

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "")

    if not email or not password or role not in ("freelancer", "client"):
        return jsonify({"error": "Invalid input"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s) RETURNING id, email, role",
            (email, password_hash, role)
        )
        user = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        token = generate_token(user["id"], user["email"], user["role"])
        return jsonify({"token": token, "user": {"id": user["id"], "email": user["email"], "role": user["role"]}}), 201
    except psycopg2.IntegrityError:
        return jsonify({"error": "Email already registered"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()
        if not user or not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
            return jsonify({"error": "Invalid credentials"}), 401
        token = generate_token(user["id"], user["email"], user["role"])
        return jsonify({"token": token, "user": {"id": user["id"], "email": user["email"], "role": user["role"]}})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/verify", methods=["GET"])
@token_required
def verify():
    return jsonify({"valid": True, "user": request.user})

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5001, debug=False)