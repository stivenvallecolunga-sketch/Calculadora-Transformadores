import os
from flask import Flask, jsonify, request, send_from_directory
from calc import solve

app = Flask(__name__, static_folder="static", static_url_path="")


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/calcular", methods=["POST"])
def calcular():
    try:
        data = request.get_json(force=True)
        return jsonify(solve(data))
    except (ValueError, KeyError, TypeError, ZeroDivisionError) as e:
        return jsonify({"error": str(e) or "Datos inválidos"}), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)