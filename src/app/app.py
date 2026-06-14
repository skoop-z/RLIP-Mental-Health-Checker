"""Flask server for Joy — UI and classifier API."""
def predict_pipeline(text):
    print("🔥 PIPELINE CALLED 🔥")
    
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory

APP_DIR = Path(__file__).resolve().parent

app = Flask(
    __name__,
    static_folder=str(APP_DIR),
    static_url_path=""
)

# --------------------------
# UI ROUTES
# --------------------------

@app.route("/")
def index():
    return send_from_directory(APP_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(APP_DIR, filename)


# --------------------------
# HEALTH CHECK
# --------------------------

@app.route("/api/health", methods=["GET"])
def health():
    try:
        from classifier_service import model_available
        return jsonify({
            "status": "ok",
            "model_loaded": model_available()
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "detail": str(e)
        }), 500


# --------------------------
# CLASSIFICATION ENDPOINT
# --------------------------

@app.route("/api/classify", methods=["POST"])
def classify():
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()

    if not text:
        return jsonify({
            "error": "Text input is required."
        }), 400

    try:
        # IMPORT YOUR PIPELINE HERE
        from classifier_service import predict_pipeline

        result = predict_pipeline(text)

        return jsonify(result)

    except FileNotFoundError as e:
        return jsonify({
            "error": str(e),
            "code": "model_missing"
        }), 503

    except Exception as e:
        return jsonify({
            "error": "Classification failed.",
            "detail": str(e)
        }), 500


# --------------------------
# MAIN
# --------------------------

if __name__ == "__main__":
    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )