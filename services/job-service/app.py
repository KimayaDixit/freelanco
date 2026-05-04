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
DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@job-db:5432/jobdb")

DOMAINS = [
    "Web Development", "Mobile Development", "UI/UX Design", "Data Science",
    "Machine Learning", "DevOps", "Cloud Engineering", "Cybersecurity",
    "Blockchain", "Game Development", "Content Writing", "Digital Marketing",
    "Video Editing", "Graphic Design", "SEO", "Other"
]

def get_db():
    return psycopg2.connect(DB_URL)

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL,
            client_email VARCHAR(255) NOT NULL,
            company_name VARCHAR(255),
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            domain VARCHAR(100) NOT NULL,
            requirements TEXT,
            salary NUMERIC(12,2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'USD',
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
    return jsonify({"status": "healthy", "service": "job-service"})

@app.route("/domains", methods=["GET"])
def get_domains():
    return jsonify({"domains": DOMAINS})

@app.route("/jobs", methods=["POST"])
@token_required
def create_job():
    if request.user["role"] != "client":
        return jsonify({"error": "Only clients can post jobs"}), 403
    data = request.get_json()
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    domain = data.get("domain", "").strip()
    requirements = data.get("requirements", "").strip()
    salary = data.get("salary")
    currency = data.get("currency", "USD")
    company_name = data.get("company_name", "")

    if not title or not description or not domain or salary is None:
        return jsonify({"error": "title, description, domain, and salary are required"}), 400
    try:
        salary = float(salary)
        if salary < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid salary value"}), 400

    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            INSERT INTO jobs (client_id, client_email, company_name, title, description, domain, requirements, salary, currency)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
        """, (request.user["user_id"], request.user["email"], company_name, title, description, domain, requirements, salary, currency))
        job = cur.fetchone()
        conn.commit(); cur.close(); conn.close()
        return jsonify(dict(job)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/jobs", methods=["GET"])
def list_jobs():
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
        cur.execute(f"SELECT COUNT(*) FROM jobs {where}", params)
        total = cur.fetchone()["count"]
        cur.execute(f"SELECT * FROM jobs {where} ORDER BY created_at DESC LIMIT %s OFFSET %s",
                    params + [per_page, offset])
        jobs = [dict(j) for j in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"jobs": jobs, "total": total, "page": page, "per_page": per_page})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/jobs/<int:job_id>", methods=["GET"])
def get_job(job_id):
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM jobs WHERE id = %s", (job_id,))
        job = cur.fetchone()
        cur.close(); conn.close()
        if not job:
            return jsonify({"error": "Job not found"}), 404
        return jsonify(dict(job))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/jobs/<int:job_id>", methods=["DELETE"])
@token_required
def delete_job(job_id):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("UPDATE jobs SET is_active=FALSE WHERE id=%s AND client_id=%s",
                    (job_id, request.user["user_id"]))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"message": "Job removed"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/jobs/my", methods=["GET"])
@token_required
def my_jobs():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM jobs WHERE client_id=%s ORDER BY created_at DESC",
                    (request.user["user_id"],))
        jobs = [dict(j) for j in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"jobs": jobs})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5003, debug=False)