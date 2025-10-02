import os
import traceback

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename

from contract_extractor import ContractExtractor

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf"}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# --- CORRECT ---
# Create a single, globally accessible instance of the ContractExtractor
# This loads the models only ONCE when the app starts.
try:
    print("Initializing ContractExtractor...")
    extractor = ContractExtractor()
    print("ContractExtractor initialized successfully.")
except Exception as e:
    print(f"FATAL: Could not initialize ContractExtractor. {e}")
    extractor = None


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Contract Analysis API is running"})


@app.route("/api/analyze-contract", methods=["POST"])
def analyze_contract():
    """Main endpoint for contract analysis"""
    # Check if the global extractor was initialized successfully on startup
    if not extractor:
        print("Error: ContractExtractor not initialized.")
        return jsonify(
            {
                "error": (
                    "ContractExtractor is not available due to an "
                    "initialization error."
                )
            }
        ), 503

    print("Received new request for contract analysis.")
    try:
        # Check if file is present in request
        if "file" not in request.files:
            print("Validation Error: No file part in request.")
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        filename = secure_filename(file.filename)
        print(f"Received file: {filename}")

        # Check if file is selected
        if filename == "":
            print("Validation Error: No file selected.")
            return jsonify({"error": "No file selected"}), 400

        # Check if file type is allowed
        if not allowed_file(filename):
            print(f"Validation Error: File type not allowed for {filename}.")
            return jsonify({"error": "Only PDF files are allowed"}), 400

        # Read file content
        print(f"Reading content of {filename}...")
        file_content = file.read()
        file_size = len(file_content)
        print(f"Read {file_size} bytes from {filename}.")

        # Validate file size
        if file_size == 0:
            print(f"Validation Error: Empty file uploaded for {filename}.")
            return jsonify({"error": "Empty file provided"}), 400

        print(f"Processing file: {filename} ({file_size} bytes)")

        # Use the GLOBAL extractor instance.
        results = extractor.extract_from_pdf(file_content)
        print(results)

        # Check if extraction was successful
        if "error" in results:
            print(f"Extraction failed for {filename}: {results['error']}")
            return jsonify({"error": results["error"]}), 500

        # Add filename to results for reference
        results["filename"] = filename
        results["file_size"] = file_size

        print(f"Analysis completed successfully for {filename}")

        return jsonify(results)

    except Exception as e:
        print(f"Error processing contract: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


@app.route("/api/test", methods=["GET"])
def test_endpoint():
    """Test endpoint to verify API is working"""
    # --- CORRECT ---
    # Check the global extractor instance directly.
    return jsonify(
        {
            "message": "Contract Analysis API is working!",
            "extractor_loaded": extractor is not None,
            "patterns_loaded": len(extractor.patterns) if extractor else 0,
            "nlp_ok": bool(getattr(extractor, "nlp", None)) if extractor else False,
        }
    )


if __name__ == "__main__":
    print("Starting Contract Analysis API...")
    print("Available endpoints:")
    print("  GET  /api/health - Health check")
    print("  GET  /api/test - Test endpoint")
    print("  POST /api/analyze-contract - Analyze PDF contract")

 
    # "Initializing ContractExtractor..." message twice. This is normal.
    app.run(debug=True, host="0.0.0.0", port=5000)
