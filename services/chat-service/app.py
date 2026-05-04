from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import jwt
import os
import psycopg2
import psycopg2.extras
from functools import wraps
from datetime import datetime
from prometheus_flask_exporter import PrometheusMetrics

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize metrics (tracks all endpoints automatically)
metrics = PrometheusMetrics(app)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

SECRET_KEY = os.environ.get("JWT_SECRET", "supersecretkey_change_in_production")
DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@chat-db:5432/chatdb")

def get_db():
    return psycopg2.connect(DB_URL)

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chat_requests (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER NOT NULL,
            sender_email VARCHAR(255) NOT NULL,
            sender_name VARCHAR(255),
            sender_role VARCHAR(20) NOT NULL,
            receiver_id INTEGER NOT NULL,
            receiver_email VARCHAR(255) NOT NULL,
            receiver_name VARCHAR(255),
            context_type VARCHAR(20) NOT NULL CHECK (context_type IN ('job', 'service')),
            context_id INTEGER NOT NULL,
            context_title VARCHAR(255),
            message TEXT,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            room_id VARCHAR(100) NOT NULL,
            sender_id INTEGER NOT NULL,
            sender_email VARCHAR(255) NOT NULL,
            sender_name VARCHAR(255),
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
        CREATE INDEX IF NOT EXISTS idx_requests_receiver ON chat_requests(receiver_id);
        CREATE INDEX IF NOT EXISTS idx_requests_sender ON chat_requests(sender_id);
    """)
    conn.commit()
    cur.close()
    conn.close()

def get_room_id(user1_id, user2_id):
    ids = sorted([user1_id, user2_id])
    return f"room_{ids[0]}_{ids[1]}"

def decode_token(token):
    try:
        return jwt.decode(token.replace("Bearer ", ""), SECRET_KEY, algorithms=["HS256"])
    except Exception:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Token required"}), 401
        user = decode_token(token)
        if not user:
            return jsonify({"error": "Invalid token"}), 401
        request.user = user
        return f(*args, **kwargs)
    return decorated

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "chat-service"})

# ── Chat Requests ─────────────────────────────────────────────────────────────

@app.route("/requests", methods=["POST"])
@token_required
def send_request():
    data = request.get_json()
    receiver_id = data.get("receiver_id")
    receiver_email = data.get("receiver_email", "")
    receiver_name = data.get("receiver_name", "")
    context_type = data.get("context_type")
    context_id = data.get("context_id")
    context_title = data.get("context_title", "")
    message = data.get("message", "")
    sender_name = data.get("sender_name", "")

    if not all([receiver_id, context_type, context_id]):
        return jsonify({"error": "receiver_id, context_type, context_id required"}), 400
    if context_type not in ("job", "service"):
        return jsonify({"error": "context_type must be job or service"}), 400
    if request.user["user_id"] == receiver_id:
        return jsonify({"error": "Cannot send request to yourself"}), 400

    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        # Check duplicate
        cur.execute("""
            SELECT id FROM chat_requests
            WHERE sender_id=%s AND receiver_id=%s AND context_id=%s AND context_type=%s AND status='pending'
        """, (request.user["user_id"], receiver_id, context_id, context_type))
        if cur.fetchone():
            cur.close(); conn.close()
            return jsonify({"error": "Request already sent"}), 409
        cur.execute("""
            INSERT INTO chat_requests
            (sender_id, sender_email, sender_name, sender_role, receiver_id, receiver_email, receiver_name, context_type, context_id, context_title, message)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
        """, (request.user["user_id"], request.user["email"], sender_name, request.user["role"],
              receiver_id, receiver_email, receiver_name, context_type, context_id, context_title, message))
        req = cur.fetchone()
        conn.commit(); cur.close(); conn.close()
        return jsonify(dict(req)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/requests/incoming", methods=["GET"])
@token_required
def incoming_requests():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM chat_requests WHERE receiver_id=%s ORDER BY created_at DESC",
                    (request.user["user_id"],))
        reqs = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"requests": reqs})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/requests/outgoing", methods=["GET"])
@token_required
def outgoing_requests():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM chat_requests WHERE sender_id=%s ORDER BY created_at DESC",
                    (request.user["user_id"],))
        reqs = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"requests": reqs})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/requests/<int:req_id>/respond", methods=["POST"])
@token_required
def respond_request(req_id):
    data = request.get_json()
    action = data.get("action")
    if action not in ("accept", "reject"):
        return jsonify({"error": "action must be accept or reject"}), 400
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM chat_requests WHERE id=%s AND receiver_id=%s",
                    (req_id, request.user["user_id"]))
        req = cur.fetchone()
        if not req:
            cur.close(); conn.close()
            return jsonify({"error": "Request not found"}), 404
        status = "accepted" if action == "accept" else "rejected"
        cur.execute("UPDATE chat_requests SET status=%s WHERE id=%s RETURNING *",
                    (status, req_id))
        updated = cur.fetchone()
        conn.commit(); cur.close(); conn.close()
        return jsonify(dict(updated))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Messages ─────────────────────────────────────────────────────────────────

@app.route("/messages/<int:other_user_id>", methods=["GET"])
@token_required
def get_messages(other_user_id):
    room_id = get_room_id(request.user["user_id"], other_user_id)
    # Verify they have an accepted chat request
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        uid = request.user["user_id"]
        cur.execute("""
            SELECT id FROM chat_requests
            WHERE status='accepted'
            AND ((sender_id=%s AND receiver_id=%s) OR (sender_id=%s AND receiver_id=%s))
            LIMIT 1
        """, (uid, other_user_id, other_user_id, uid))
        if not cur.fetchone():
            cur.close(); conn.close()
            return jsonify({"error": "No accepted chat connection"}), 403
        cur.execute("SELECT * FROM messages WHERE room_id=%s ORDER BY created_at ASC LIMIT 200",
                    (room_id,))
        msgs = [dict(m) for m in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"messages": msgs, "room_id": room_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/connections", methods=["GET"])
@token_required
def get_connections():
    uid = request.user["user_id"]
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT * FROM chat_requests
            WHERE status='accepted' AND (sender_id=%s OR receiver_id=%s)
            ORDER BY created_at DESC
        """, (uid, uid))
        reqs = [dict(r) for r in cur.fetchall()]
        cur.close(); conn.close()
        return jsonify({"connections": reqs})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── WebSocket ─────────────────────────────────────────────────────────────────

@socketio.on("join")
def on_join(data):
    token = data.get("token", "")
    user = decode_token(token)
    if not user:
        emit("error", {"message": "Invalid token"})
        return
    room = data.get("room")
    if not room:
        emit("error", {"message": "Room required"})
        return
    join_room(room)
    emit("joined", {"room": room}, room=room)

@socketio.on("send_message")
def on_message(data):
    token = data.get("token", "")
    user = decode_token(token)
    if not user:
        emit("error", {"message": "Invalid token"})
        return
    room = data.get("room")
    content = data.get("content", "").strip()
    sender_name = data.get("sender_name", user["email"])
    if not content or not room:
        return
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            INSERT INTO messages (room_id, sender_id, sender_email, sender_name, content)
            VALUES (%s,%s,%s,%s,%s) RETURNING *
        """, (room, user["user_id"], user["email"], sender_name, content))
        msg = dict(cur.fetchone())
        conn.commit(); cur.close(); conn.close()
        msg["created_at"] = str(msg["created_at"])
        emit("new_message", msg, room=room)
    except Exception as e:
        emit("error", {"message": str(e)})

@socketio.on("leave")
def on_leave(data):
    room = data.get("room")
    if room:
        leave_room(room)

if __name__ == "__main__":
    init_db()
    socketio.run(app, host="0.0.0.0", port=5005, debug=False)