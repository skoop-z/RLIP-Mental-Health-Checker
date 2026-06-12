"""Flask server for Joy — UI and classifier API."""

from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

APP_DIR = Path(__file__).resolve().parent

app = Flask(__name__, static_folder=str(APP_DIR), static_url_path="")


@app.route("/")
def index():
    return send_from_directory(APP_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(APP_DIR, filename)


@app.route("/api/health")
def health():
    from classifier_service import model_available

    return jsonify({"status": "ok", "model_loaded": model_available()})


@app.route("/api/classify", methods=["POST"])
def classify():
    payload = request.get_json(silent=True) or {}
    text = payload.get("text", "")

    if not str(text).strip():
        return jsonify({"error": "Text input is required."}), 400

    try:
        from classifier_service import classify_text

        result = classify_text(text)
        return jsonify(result)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc), "code": "model_missing"}), 503
    except Exception as exc:
        return jsonify({"error": "Classification failed.", "detail": str(exc)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
