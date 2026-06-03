#!/usr/bin/env python3
"""
Lambda Handler Flow Diagram Generator
Supports both SVG (real XML vector) and PNG (raster) image generation

Usage:
  python generate_diagram.py --format svg
  python generate_diagram.py --format png
  python generate_diagram.py --format both
"""

import os
import sys
import argparse
import requests
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.resolve()
PROMPTS_DIR = BASE_DIR / "prompts"
OUTPUTS_DIR = BASE_DIR / "outputs"

# Create directories if they don't exist
PROMPTS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)

# Load environment variables
env_path = BASE_DIR / ".env.local"
if env_path.exists():
    load_dotenv(env_path)
else:
    # Try to load from parent directory
    env_path = BASE_DIR.parent / ".env.local"
    if env_path.exists():
        load_dotenv(env_path)

XAI_API_KEY = os.getenv("XAI_API_KEY")
IMAGE_MODEL = os.getenv("XAI_IMAGE_MODEL", "grok-imagine-image")
TEXT_MODEL = os.getenv("XAI_TEXT_MODEL", "grok-4-fast")

# ─────────────────────────────────────────────────────────────────────────
# Argument Parsing
# ─────────────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate Lambda Handler Flow Diagram (SVG or PNG)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
 python generate_diagram.py --format svg
 python generate_diagram.py --format png
 python generate_diagram.py --format both
 python generate_diagram.py -f svg -p custom_prompt.txt -o diagram.svg
        """
    )
    parser.add_argument(
        "--format", "-f",
        choices=["svg", "png", "both"],
        default="both",
        help="Output format: svg (vector), png (raster), or both (default: both)"
    )
    parser.add_argument(
        "--prompt", "-p",
        default="lambda_handler_flow_prompt.txt",
        help="Prompt filename (default: lambda_handler_flow_prompt.txt)"
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output filename without extension (auto-generated if not specified)"
    )
    parser.add_argument(
        "--model", "-m",
        default=IMAGE_MODEL,
        help="xAI image model for PNG generation (default: %s)" % IMAGE_MODEL
    )
    return parser.parse_args()

# ─────────────────────────────────────────────────────────────────────────
# Functions
# ─────────────────────────────────────────────────────────────────────────

def validate_api_key():
    """Validate that XAI_API_KEY is properly set"""
    if not XAI_API_KEY:
        print("\n❌ ERROR: XAI_API_KEY environment variable is not set")
        print("  Please set it in your .env.local file or environment")
        return False
    if "your_actual_xai_api_key" in XAI_API_KEY or len(XAI_API_KEY) < 20:
        print("\n❌ ERROR: XAI_API_KEY appears to be invalid or placeholder")
        print("  Please check your .env.local configuration")
        return False
    print("✓ API key validated (length: %d)" % len(XAI_API_KEY))
    return True

def load_prompt(prompt_file: str) -> str:
    """Load prompt content from file"""
    # Try multiple locations
    possible_paths = [
        PROMPTS_DIR / prompt_file,
        BASE_DIR / prompt_file,
        Path(prompt_file),
    ]
    
    for prompt_path in possible_paths:
        if prompt_path.exists():
            with open(prompt_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
            print("✓ Loaded prompt: %s (%d chars)" % (prompt_path.name, len(content)))
            return content
    
    search_paths_str = "\n".join(["  - " + str(p) for p in possible_paths])
    raise FileNotFoundError(
        "Prompt file not found. Searched:\n" + search_paths_str
    )

def generate_png_image(prompt: str, output_filename: str, model: str = IMAGE_MODEL) -> str:
    """Call xAI API to generate PNG image from prompt"""
    
    api_url = "https://api.x.ai/v1/images/generations"
    headers = {
        "Authorization": "Bearer %s" % XAI_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "prompt": prompt,
        "n": 1
    }
    
    print("\n📡 Calling xAI API for PNG (%s)..." % model)
    print("  URL: %s" % api_url)
    
    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=300)
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        print("\n❌ API Error: HTTP %s" % response.status_code)
        print("  Response: %s" % response.text[:500])
        raise
    except requests.exceptions.Timeout:
        print("\n❌ Request timed out (300s)")
        raise
    except Exception as e:
        print("\n❌ Request failed: %s" % e)
        raise
    
    result = response.json()
    image_url = result["data"][0]["url"]
    print("✓ Image generated successfully")
    print("  URL: %s..." % image_url[:80])
    
    # Download image
    print("\n⬇️ Downloading PNG image...")
    try:
        img_response = requests.get(image_url, timeout=300)
        img_response.raise_for_status()
    except Exception as e:
        print("❌ Failed to download image: %s" % e)
        raise
    
    # Save to file
    output_path = OUTPUTS_DIR / output_filename
    with open(output_path, "wb") as f:
        f.write(img_response.content)
    
    file_size_mb = len(img_response.content) / (1024 * 1024)
    print("✓ PNG saved successfully")
    print("  Path: %s" % output_path)
    print("  Size: %.2f MB" % file_size_mb)
    
    return str(output_path)

def generate_svg_image(prompt: str, output_filename: str, model: str = TEXT_MODEL) -> str:
    """Generate actual SVG XML using xAI Chat Completion API."""

    print("\n📐 Generating REAL SVG XML via xAI Chat API...")
    print("  Model: %s" % model)

    if not validate_api_key():
        return None

    api_url = "https://api.x.ai/v1/chat/completions"

    headers = {
        "Authorization": "Bearer %s" % XAI_API_KEY,
        "Content-Type": "application/json"
    }

    system_instruction = """
You are an expert enterprise architecture SVG designer.

Return ONLY valid raw SVG XML.

Rules:
1. Start directly with <svg.
2. End directly with </svg>.
3. Do NOT use markdown fences.
4. Do NOT explain anything.
5. Do NOT return PNG, JPEG, base64, or image URL.
6. Use clean enterprise architecture styling.
7. Use readable text.
8. Use viewBox="0 0 1792 1024".
9. Use inline SVG elements only: rect, text, line, path, circle, g, defs, marker, style.
10. Ensure XML is valid and browser-renderable.
"""

    svg_prompt = """
Create a real SVG vector diagram from the following architecture prompt.

The SVG must be clean, readable, professional, and boardroom-ready.

Use:
- white background
- Google Cloud blue
- navy hero EKF layer
- gray governance layer
- clean rounded rectangles
- simple vector icons or icon placeholders
- arrows between layers
- continuous learning loop at bottom

Prompt:
%s
""" % prompt

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": svg_prompt}
        ],
        "temperature": 0.1
    }

    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=300)
        response.raise_for_status()
    except requests.exceptions.HTTPError:
        print("\n❌ API Error: HTTP %s" % response.status_code)
        print("  Response: %s" % response.text[:1000])
        raise
    except Exception as e:
        print("❌ SVG generation failed: %s" % e)
        return None

    result = response.json()
    svg_content = result["choices"][0]["message"]["content"].strip()

    # Remove markdown fences if model adds them
    if svg_content.startswith("```"):
        lines = svg_content.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        svg_content = "\n".join(lines).strip()

    # Extract only SVG block
    if "<svg" in svg_content:
        svg_content = svg_content[svg_content.find("<svg"):]
    if "</svg>" in svg_content:
        svg_content = svg_content[:svg_content.rfind("</svg>") + len("</svg>")]

    # Validate basic SVG shape
    if not svg_content.startswith("<svg") or not svg_content.endswith("</svg>"):
        raise ValueError("Generated content is not valid SVG XML")

    output_path = OUTPUTS_DIR / output_filename

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg_content)

    file_size_kb = len(svg_content.encode("utf-8")) / 1024

    print("✓ REAL SVG XML saved successfully")
    print("  Path: %s" % output_path)
    print("  Size: %.2f KB" % file_size_kb)

    return str(output_path)

# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()
    
    print("\n" + "="*70)
    print(" Lambda Handler Flow Diagram Generator")
    print("="*70)
    
    # Generate default output filename if not specified
    if args.output is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = "lambda_handler_flow_diagram_%s" % timestamp
    else:
        base_name = args.output.replace(".svg", "").replace(".png", "")
    
    try:
        # Load prompt
        prompt_text = load_prompt(args.prompt)
        
        generated_files = []
        
        # Generate SVG
        if args.format in ("svg", "both"):
            try:
                svg_file = generate_svg_image(prompt_text, "%s.svg" % base_name, TEXT_MODEL)
                if svg_file:
                    generated_files.append(svg_file)
            except Exception as e:
                print("⚠️ SVG generation skipped: %s" % e)
        
        # Generate PNG
        if args.format in ("png", "both"):
            if not validate_api_key():
                print("⚠️ Skipping PNG generation (API key issue)")
            else:
                try:
                    png_file = generate_png_image(prompt_text, "%s.png" % base_name, args.model)
                    if png_file:
                        generated_files.append(png_file)
                except Exception as e:
                    print("❌ PNG generation failed: %s" % e)
        
        # Summary
        print("\n" + "="*70)
        if generated_files:
            print("✓ SUCCESS: %d diagram(s) generated!" % len(generated_files))
            for f in generated_files:
                print(" ✓ %s" % Path(f).name)
        else:
            print("❌ FAILED: No diagrams were generated")
            sys.exit(1)
        print("="*70 + "\n")
        
    except FileNotFoundError as e:
        print("\n❌ ERROR: %s" % e)
        sys.exit(1)
    except Exception as e:
        print("\n❌ ERROR: %s" % e)
        sys.exit(1)

if __name__ == "__main__":
    main()
