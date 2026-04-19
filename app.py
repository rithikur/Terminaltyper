import os
import random
from flask import Flask, jsonify, render_template, request, session
from models import db, TypingResult, UserPreference
from sqlalchemy import func

# ─────────────────────────────────────────────
#  Content Banks
# ─────────────────────────────────────────────

STANDARD_PARAGRAPHS = [
    "The quick brown fox jumps over the lazy dog while the sun sets behind the mountains casting long shadows across the valley floor.",
    "Technology has transformed the way we communicate collaborate and create turning distant dreams into everyday realities for billions of people.",
    "In the quiet library surrounded by towering shelves of ancient books the scholar carefully turned each fragile page seeking hidden knowledge.",
    "Precision engineering requires patience attention to detail and a deep understanding of how materials behave under extreme conditions.",
    "The coastal city awakened slowly as fishermen returned with their morning catch and the smell of salt air mixed with fresh coffee.",
    "Deep within the data center rows of servers hummed in unison processing millions of requests each second without pause or interruption.",
    "Mountains do not rise without earthquakes and neither do great achievements come without struggle sacrifice and unwavering determination.",
    "The programmer stared at the terminal screen her fingers dancing over the keyboard as she debugged the final critical section of code.",
    "Artificial intelligence continues to evolve rapidly blurring the line between machine behavior and human cognition in fascinating ways.",
    "Through the fog of uncertainty the expedition team pressed forward guided only by compass stars and the unwavering belief in their mission.",
]

GAME_WORDS = [
    "circuit", "kernel", "voltage", "packet", "buffer", "socket", "thread",
    "malloc", "pointer", "binary", "hexadecimal", "compiler", "debugger",
    "syntax", "runtime", "memory", "cache", "stack", "queue", "signal",
    "daemon", "process", "mutex", "semaphore", "interrupt", "register",
    "opcode", "pipeline", "latency", "bandwidth", "protocol", "firewall",
    "cipher", "hash", "token", "payload", "gateway", "proxy", "cluster",
    "instance", "container", "deploy", "rollback", "namespace", "endpoint",
]

CODE_SNIPPETS = [
    {
        "language": "python",
        "label": "Fibonacci Generator",
        "code": (
            "def fibonacci(n):\n"
            "    a, b = 0, 1\n"
            "    for _ in range(n):\n"
            "        yield a\n"
            "        a, b = b, a + b\n"
            "\n"
            "for num in fibonacci(10):\n"
            "    print(num)"
        ),
    },
    {
        "language": "python",
        "label": "Binary Search",
        "code": (
            "def binary_search(arr, target):\n"
            "    low, high = 0, len(arr) - 1\n"
            "    while low <= high:\n"
            "        mid = (low + high) // 2\n"
            "        if arr[mid] == target:\n"
            "            return mid\n"
            "        elif arr[mid] < target:\n"
            "            low = mid + 1\n"
            "        else:\n"
            "            high = mid - 1\n"
            "    return -1"
        ),
    },
    {
        "language": "python",
        "label": "Merge Sort",
        "code": (
            "def merge_sort(arr):\n"
            "    if len(arr) <= 1:\n"
            "        return arr\n"
            "    mid = len(arr) // 2\n"
            "    left = merge_sort(arr[:mid])\n"
            "    right = merge_sort(arr[mid:])\n"
            "    return merge(left, right)\n"
            "\n"
            "def merge(left, right):\n"
            "    result = []\n"
            "    i = j = 0\n"
            "    while i < len(left) and j < len(right):\n"
            "        if left[i] <= right[j]:\n"
            "            result.append(left[i])\n"
            "            i += 1\n"
            "        else:\n"
            "            result.append(right[j])\n"
            "            j += 1\n"
            "    result.extend(left[i:])\n"
            "    result.extend(right[j:])\n"
            "    return result"
        ),
    },
    {
        "language": "python",
        "label": "Flask REST Endpoint",
        "code": (
            "from flask import Flask, jsonify, request\n"
            "\n"
            "app = Flask(__name__)\n"
            "\n"
            "@app.route('/api/items', methods=['GET'])\n"
            "def get_items():\n"
            "    items = [\n"
            "        {'id': 1, 'name': 'Widget'},\n"
            "        {'id': 2, 'name': 'Gadget'},\n"
            "    ]\n"
            "    return jsonify(items)\n"
            "\n"
            "if __name__ == '__main__':\n"
            "    app.run(debug=True)"
        ),
    },
    {
        "language": "python",
        "label": "Context Manager",
        "code": (
            "class ManagedResource:\n"
            "    def __init__(self, name):\n"
            "        self.name = name\n"
            "\n"
            "    def __enter__(self):\n"
            "        print(f'Acquiring {self.name}')\n"
            "        return self\n"
            "\n"
            "    def __exit__(self, exc_type, exc_val, tb):\n"
            "        print(f'Releasing {self.name}')\n"
            "        return False\n"
            "\n"
            "with ManagedResource('database') as res:\n"
            "    print(f'Using {res.name}')"
        ),
    },
]

# ─────────────────────────────────────────────
#  App Factory
# ─────────────────────────────────────────────

def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get("SECRET_KEY", "terminal-typer-secret-2024")
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///terminaltyper.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    with app.app_context():
        db.create_all()

    # ── Main SPA ──────────────────────────────
    @app.route("/")
    def index():
        theme = UserPreference.get("theme", "dark")
        return render_template("index.html", theme=theme)

    # ── Content Endpoints ─────────────────────
    @app.route("/api/content/standard")
    def get_standard_content():
        return jsonify({"text": random.choice(STANDARD_PARAGRAPHS)})

    @app.route("/api/content/game-words")
    def get_game_words():
        count = request.args.get("count", 20, type=int)
        words = random.choices(GAME_WORDS, k=count)
        return jsonify({"words": words})

    @app.route("/api/content/code")
    def get_code_content():
        snippet = random.choice(CODE_SNIPPETS)
        return jsonify(snippet)

    # ── Results Endpoint ──────────────────────
    @app.route("/api/results", methods=["POST"])
    def submit_results():
        data = request.get_json(force=True)
        try:
            result = TypingResult(
                wpm         = float(data["wpm"]),
                raw_wpm     = float(data.get("raw_wpm", 0)),
                accuracy    = float(data["accuracy"]),
                consistency = float(data.get("consistency", 100)),
                mode        = str(data["mode"]),
                duration    = int(data["duration"]),
            )
            db.session.add(result)
            db.session.commit()
            return jsonify({"status": "ok", "id": result.id}), 201
        except (KeyError, ValueError) as e:
            return jsonify({"error": str(e)}), 400

    # ── Analytics Endpoints ───────────────────
    @app.route("/api/stats")
    def get_stats():
        mode_filter = request.args.get("mode")
        query = TypingResult.query
        if mode_filter and mode_filter != "all":
            query = query.filter_by(mode=mode_filter)

        all_results = query.order_by(TypingResult.timestamp.desc()).all()

        if not all_results:
            return jsonify({
                "personal_best_wpm": 0,
                "average_wpm": 0,
                "average_accuracy": 0,
                "total_sessions": 0,
                "recent": [],
            })

        wpms = [r.wpm for r in all_results]
        accs = [r.accuracy for r in all_results]
        recent = [r.to_dict() for r in all_results[:10]]

        return jsonify({
            "personal_best_wpm": round(max(wpms), 1),
            "average_wpm":       round(sum(wpms) / len(wpms), 1),
            "average_accuracy":  round(sum(accs) / len(accs), 1),
            "total_sessions":    len(all_results),
            "recent":            recent,
        })

    @app.route("/api/stats/all")
    def get_all_results():
        results = TypingResult.query.order_by(TypingResult.timestamp.desc()).limit(50).all()
        return jsonify([r.to_dict() for r in results])

    # ── Theme Endpoint ────────────────────────
    @app.route("/api/theme", methods=["POST"])
    def set_theme():
        data = request.get_json(force=True)
        theme = data.get("theme", "dark")
        if theme not in ("dark", "light"):
            return jsonify({"error": "invalid theme"}), 400
        UserPreference.set("theme", theme)
        return jsonify({"theme": theme})

    @app.route("/api/theme")
    def get_theme():
        return jsonify({"theme": UserPreference.get("theme", "dark")})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
