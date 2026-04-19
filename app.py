import os
import random
from flask import Flask, jsonify, render_template, request, session
from models import db, TypingResult, UserPreference
from sqlalchemy import func

# ─────────────────────────────────────────────
#  Content Banks
# ─────────────────────────────────────────────

STANDARD_PARAGRAPHS = [
    # Original 10
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
    # New 20
    "Every line of code tells a story of the problem it was written to solve and the mind that spent hours crafting the perfect solution.",
    "The universe is vast and indifferent yet within it consciousness arose and began asking questions about its own origin and purpose.",
    "Software architecture is the invisible skeleton of every application shaping its behavior long after the original developers have moved on.",
    "She typed commands into the terminal with practiced efficiency each keystroke a small act of communication between human and machine.",
    "Version control systems like git allow teams of engineers to collaborate on massive codebases without stepping on each other's work.",
    "The rain fell steadily on the city streets washing away the dust of the day and reflecting the amber glow of the streetlights above.",
    "A database without indexes is like a library without a catalog you can find what you need but it will take far longer than necessary.",
    "Design patterns are reusable solutions to commonly occurring problems in software design refined through decades of collective experience.",
    "The compiler translated human readable instructions into machine code bridging the gap between what people think and what computers do.",
    "Recursion is a technique where a function calls itself to solve progressively smaller versions of the original problem until a base case is reached.",
    "Network latency the time a packet takes to travel from source to destination determines much of the performance ceiling of distributed systems.",
    "The open source movement has fundamentally changed how software is built shared and improved creating a global community of contributors.",
    "Clean code reads like well written prose each function doing exactly one thing its name promising precisely what the body delivers.",
    "The history of computing is a story of abstraction layers each generation building higher level tools on top of the previous generation's foundations.",
    "Space exploration demands extraordinary precision a calculation error of one degree compounded over millions of kilometers becomes an insurmountable distance.",
    "Machine learning models learn patterns from data rather than following explicit instructions allowing computers to recognize images translate languages and predict outcomes.",
    "The keyboard is the writer's paintbrush and the blank document is the canvas where ideas take shape one deliberate character at a time.",
    "Cryptography protects the privacy of billions of people every day through elegant mathematics that would take the lifetime of the universe to brute force.",
    "Debugging is twice as hard as writing the code in the first place so if you write the code as cleverly as you can you are by definition not smart enough to debug it.",
    "The best software teams are not those with the most talented individuals but those where communication trust and shared purpose create something greater than the sum of their parts.",
]

GAME_WORDS = [
    # Original
    "circuit", "kernel", "voltage", "packet", "buffer", "socket", "thread",
    "malloc", "pointer", "binary", "hexadecimal", "compiler", "debugger",
    "syntax", "runtime", "memory", "cache", "stack", "queue", "signal",
    "daemon", "process", "mutex", "semaphore", "interrupt", "register",
    "opcode", "pipeline", "latency", "bandwidth", "protocol", "firewall",
    "cipher", "hash", "token", "payload", "gateway", "proxy", "cluster",
    "instance", "container", "deploy", "rollback", "namespace", "endpoint",
    # New additions
    "variable", "function", "iterator", "decorator", "generator", "exception",
    "typescript", "interface", "abstract", "inherit", "override", "polymorphism",
    "algorithm", "recursion", "fibonacci", "quicksort", "mergesort", "heapify",
    "database", "migration", "indexing", "transaction", "rollback", "checkpoint",
    "webhook", "graphql", "restful", "swagger", "openapi", "middleware",
    "docker", "kubernetes", "terraform", "ansible", "jenkins", "pipeline",
    "lambda", "closure", "callback", "promise", "async", "await",
    "regex", "pattern", "parser", "lexer", "token", "abstract",
    "refactor", "linting", "testing", "coverage", "benchmark", "profiler",
    "monolith", "microservice", "serverless", "headless", "stateless", "idempotent",
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
    # New snippets
    {
        "language": "python",
        "label": "Bubble Sort",
        "code": (
            "def bubble_sort(arr):\n"
            "    n = len(arr)\n"
            "    for i in range(n):\n"
            "        swapped = False\n"
            "        for j in range(0, n - i - 1):\n"
            "            if arr[j] > arr[j + 1]:\n"
            "                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n"
            "                swapped = True\n"
            "        if not swapped:\n"
            "            break\n"
            "    return arr\n"
            "\n"
            "numbers = [64, 34, 25, 12, 22, 11, 90]\n"
            "print(bubble_sort(numbers))"
        ),
    },
    {
        "language": "python",
        "label": "Decorator Pattern",
        "code": (
            "import time\n"
            "\n"
            "def timer(func):\n"
            "    def wrapper(*args, **kwargs):\n"
            "        start = time.time()\n"
            "        result = func(*args, **kwargs)\n"
            "        end = time.time()\n"
            "        print(f'{func.__name__} took {end - start:.4f}s')\n"
            "        return result\n"
            "    return wrapper\n"
            "\n"
            "@timer\n"
            "def slow_function(n):\n"
            "    return sum(range(n))\n"
            "\n"
            "slow_function(1000000)"
        ),
    },
    {
        "language": "python",
        "label": "Async HTTP Requests",
        "code": (
            "import asyncio\n"
            "import aiohttp\n"
            "\n"
            "async def fetch(session, url):\n"
            "    async with session.get(url) as response:\n"
            "        return await response.json()\n"
            "\n"
            "async def main():\n"
            "    urls = [\n"
            "        'https://api.example.com/users',\n"
            "        'https://api.example.com/posts',\n"
            "    ]\n"
            "    async with aiohttp.ClientSession() as session:\n"
            "        tasks = [fetch(session, url) for url in urls]\n"
            "        results = await asyncio.gather(*tasks)\n"
            "    return results\n"
            "\n"
            "asyncio.run(main())"
        ),
    },
    {
        "language": "python",
        "label": "Linked List",
        "code": (
            "class Node:\n"
            "    def __init__(self, data):\n"
            "        self.data = data\n"
            "        self.next = None\n"
            "\n"
            "class LinkedList:\n"
            "    def __init__(self):\n"
            "        self.head = None\n"
            "\n"
            "    def append(self, data):\n"
            "        new_node = Node(data)\n"
            "        if not self.head:\n"
            "            self.head = new_node\n"
            "            return\n"
            "        current = self.head\n"
            "        while current.next:\n"
            "            current = current.next\n"
            "        current.next = new_node\n"
            "\n"
            "    def display(self):\n"
            "        elements = []\n"
            "        current = self.head\n"
            "        while current:\n"
            "            elements.append(current.data)\n"
            "            current = current.next\n"
            "        print(' -> '.join(map(str, elements)))"
        ),
    },
    {
        "language": "python",
        "label": "Dataclass Example",
        "code": (
            "from dataclasses import dataclass, field\n"
            "from typing import List\n"
            "\n"
            "@dataclass\n"
            "class Student:\n"
            "    name: str\n"
            "    age: int\n"
            "    grades: List[float] = field(default_factory=list)\n"
            "\n"
            "    def average(self) -> float:\n"
            "        if not self.grades:\n"
            "            return 0.0\n"
            "        return sum(self.grades) / len(self.grades)\n"
            "\n"
            "    def __str__(self) -> str:\n"
            "        return f'{self.name} (avg: {self.average():.1f})'\n"
            "\n"
            "s = Student('Alice', 20, [88.5, 92.0, 79.5])\n"
            "print(s)"
        ),
    },
    {
        "language": "python",
        "label": "Stack Implementation",
        "code": (
            "class Stack:\n"
            "    def __init__(self):\n"
            "        self._items = []\n"
            "\n"
            "    def push(self, item):\n"
            "        self._items.append(item)\n"
            "\n"
            "    def pop(self):\n"
            "        if self.is_empty():\n"
            "            raise IndexError('pop from empty stack')\n"
            "        return self._items.pop()\n"
            "\n"
            "    def peek(self):\n"
            "        if self.is_empty():\n"
            "            raise IndexError('peek at empty stack')\n"
            "        return self._items[-1]\n"
            "\n"
            "    def is_empty(self):\n"
            "        return len(self._items) == 0\n"
            "\n"
            "    def __len__(self):\n"
            "        return len(self._items)"
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
