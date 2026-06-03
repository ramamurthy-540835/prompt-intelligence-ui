# PRISM Coder Agent - Prompt-ID Runner

A reusable VM coding agent that accepts any Google Agent Platform / Vertex AI Studio saved prompt ID, extracts the prompt from GCP, prepares a local prompt package, and launches Aider automatically using `start_aider.sh`.

## Features

- **Deterministic Extraction**: Extracts prompt content, system instructions, and text/plain attachments without altering the source content.
- **Binary Stripping**: Safely strips binary/image/pdf payloads into descriptive placeholders.
- **Automatic Aider Execution**: Automatically triggers `./start_aider.sh` with the generated master prompt package.
- **Robust Authentication**: Automatically attempts multiple GCP authentication methods with clear fallback instructions.

## Directory Structure

When a prompt is fetched, the following package is generated:
saved_prompts/<prompt_id>/
├── raw.json               # Raw API response from Vertex AI
├── system.md              # Extracted system instructions
├── extracted_content.txt  # Extracted user prompt content
├── master.md              # Master prompt file for Aider
├── chunk_001.md           # Main content chunk
├── final_assembled.md     # Assembled prompt package
└── index.json             # Metadata index of the package

## Usage

### CLI Execution

Run the wrapper script directly with any prompt ID:

./scripts/run_prompt_id.sh <prompt_id>

Example:
./scripts/run_prompt_id.sh 2114685765899255808

### Python CLI Execution

For more configuration options, run the Python script directly:

python3 agents/prompt_id_coder_agent.py --prompt-id <prompt_id> --run-aider

Options:
- `--prompt-id`: (Required) Vertex AI Dataset / Prompt ID.
- `--project-id`: GCP Project ID (defaults to active gcloud project or `ctoteam`).
- `--location`: GCP Region/Location (defaults to `us-central1`).
- `--run-aider`: Automatically run Aider after extraction.