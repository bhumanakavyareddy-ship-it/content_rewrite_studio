import os
import time
import json
import random
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask
app = Flask(__name__)

# Load Gemini API key and model
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

if not GEMINI_API_KEY:
    raise RuntimeError("❌ Gemini API key not found. Please add it in .env as GEMINI_API_KEY")

print(f"🚀 Using Gemini model: {GEMINI_MODEL}")

# Gemini REST endpoint
GEMINI_REST_URL = "https://generativelanguage.googleapis.com/v1/models"

def generate_text(prompt, temperature=0.6, max_output_tokens=900, retries=3):
    """Generate text using Gemini API with retry support."""
    url = f"{GEMINI_REST_URL}/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens
        }
    }

    for attempt in range(retries):
        try:
            resp = requests.post(url, json=payload, timeout=30)
        except requests.RequestException as e:
            if attempt == retries - 1:
                raise RuntimeError(f"Gemini request failed after retries: {e}")
            time.sleep(random.uniform(1, 3))
            continue

        if resp.status_code == 503:
            print("⚠️ Gemini overloaded. Retrying in 3s...")
            time.sleep(3)
            continue

        if resp.status_code != 200:
            try:
                body = resp.json()
            except Exception:
                body = resp.text
            raise RuntimeError(f"Gemini API error: {body}")

        try:
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    return parts[0]["text"].strip()

            print("⚠️ No valid text returned. Retrying...")
            time.sleep(random.uniform(1, 3))
            continue

        except Exception as e:
            print(f"❌ Failed to parse Gemini response: {e}")
            print(f"Raw response: {resp.text}")
            if attempt < retries - 1:
                time.sleep(random.uniform(1, 3))
                continue
            raise

    return "⚠️ No text returned from Gemini. Try again later."

# --- PROMPT HELPERS ---

def rewrite_text(text, mode, language):
    prompt = f"""
You are an expert content rewriter.

Rewrite the text below in {language} using a **{mode}** tone.
Maintain the original meaning, make it engaging, and improve flow.

Rules:
- Keep meaning & context same.
- Maintain natural tone in {language}.
- Don’t shorten too much unless it improves readability.
- Avoid repetition or unnecessary words.
- Output only the rewritten text.

Text:
{text}

Rewritten version:
"""
    return generate_text(prompt)


def summarize_text(text):
    prompt = f"""
Summarize this text in 3–4 clear sentences, keeping key ideas only.

Text:
{text}

Summary:
"""
    return generate_text(prompt)


def expand_text(text):
    prompt = f"""
Expand the following text by adding examples, clarity, and smooth transitions.

Text:
{text}

Expanded version:
"""
    return generate_text(prompt)


def simulate_plagiarism_check():
    return round(random.uniform(0, 15), 2)

# --- FLASK ROUTES ---

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


@app.route('/rewrite', methods=['POST'])
def rewrite():
    data = request.get_json() or {}
    text = data.get('text', '').strip()
    mode = data.get('mode', 'Polished')
    language = data.get('language', 'English')
    summarize_option = data.get('summarize_option', False)
    expand_option = data.get('expand_option', False)
    plagiarism_check = data.get('plagiarism_check', False)

    if not text:
        return jsonify({'error': 'No text provided.'}), 400

    try:
        rewritten = rewrite_text(text, mode, language)
        result = {'rewritten': rewritten}

        if summarize_option:
            result['summary'] = summarize_text(rewritten)
        if expand_option:
            result['expansion'] = expand_text(rewritten)
        if plagiarism_check:
            result['plagiarism'] = simulate_plagiarism_check()

        return jsonify(result)

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'error': f'Error processing text: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True)
