import sys
import uuid
import argparse
from typing import Optional
from cli.db import insert_query

# Exact model identifiers required by the architecture
MODEL_GEMINI = "gemini-3.5-flash-lite"
MODEL_GPT_OSS = "openai/gpt-oss-20b"
DEFAULT_MODEL = MODEL_GEMINI

MODEL_MAPPING = {
    "gemini": MODEL_GEMINI,
    "gemini-3.5-flash-lite": MODEL_GEMINI,
    "1": MODEL_GEMINI,
    "openai": MODEL_GPT_OSS,
    "gpt-oss": MODEL_GPT_OSS,
    "gpt-oss-20b": MODEL_GPT_OSS,
    "openai/gpt-oss-20b": MODEL_GPT_OSS,
    "groq": MODEL_GPT_OSS,
    "llama": MODEL_GPT_OSS,
    "llama-3.3-70b-versatile": MODEL_GPT_OSS,
    "2": MODEL_GPT_OSS,
}

def resolve_model(model_input: Optional[str]) -> str:
    """Normalize and map model inputs to exact model identifiers."""
    if not model_input:
        return DEFAULT_MODEL
    cleaned = model_input.strip().lower()
    return MODEL_MAPPING.get(cleaned, DEFAULT_MODEL)

def prompt_model_selection() -> str:
    """Interactive prompt for model selection before session starts."""
    print("=" * 60)
    print("        PROCARE CONSOLE CLI - AI MODEL SELECTOR")
    print("=" * 60)
    print("Please choose an AI model for this session:")
    print(f"  [1] Gemini 3.5 Flash Lite (Default)  -> {MODEL_GEMINI}")
    print(f"  [2] OpenAI GPT-OSS 20B               -> {MODEL_GPT_OSS}")
    print("-" * 60)
    
    try:
        raw_choice = input(f"Enter choice [1/2] (Default: {MODEL_GEMINI}): ").strip()
    except (KeyboardInterrupt, EOFError):
        print("\nSession aborted.")
        sys.exit(0)
        
    selected = resolve_model(raw_choice) if raw_choice else DEFAULT_MODEL
    print(f"\n[Active Model]: {selected}\n")
    return selected

def run_chat_session(selected_model: str, session_id: Optional[str] = None):
    """Interactive chat session writing queries directly to Supabase."""
    current_session = session_id or str(uuid.uuid4())
    print("=" * 60)
    print(f"Session ID: {current_session}")
    print(f"AI Model:   {selected_model}")
    print("Type your message and press Enter (or type 'exit' / 'quit' to end):")
    print("=" * 60)

    while True:
        try:
            user_input = input("\nProCare Console > ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting session. Goodbye!")
            break

        if not user_input:
            continue

        if user_input.lower() in ("exit", "quit", "q"):
            print("Session ended.")
            break

        print(f"-> Submitting query to Supabase (Model: {selected_model})...")
        try:
            result = insert_query(
                prompt=user_input,
                selected_model=selected_model,
                session_id=current_session
            )
            print("[SUCCESS] Query successfully logged to database!")
            print(f"  - Session:         {result.get('session_id')}")
            print(f"  - User Input:      {user_input}")
            print(f"  - Requested Model: {result.get('payload', {}).get('requested_model')}")
            if result.get("status") == "warning":
                print(f"  [Note]: {result.get('message')}")
        except Exception as e:
            print(f"[ERROR] Failed to submit query: {e}", file=sys.stderr)

def main():
    parser = argparse.ArgumentParser(
        description="Procare Console CLI: Direct Supabase Database Query Interface",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "--model", "-m",
        type=str,
        default=None,
        help=(
            "Model selection before session starts.\n"
            "Options:\n"
            f"  - gemini / gemini-3.5-flash-lite (Default: {MODEL_GEMINI})\n"
            f"  - openai / openai/gpt-oss-20b ({MODEL_GPT_OSS})"
        )
    )
    parser.add_argument(
        "--query", "-q",
        type=str,
        default=None,
        help="Single query mode. Sends query directly to database and exits."
    )
    parser.add_argument(
        "--session-id", "-s",
        type=str,
        default=None,
        help="Custom session UUID string."
    )

    args = parser.parse_args()

    # 1. Resolve or interactively prompt for model
    if args.model:
        selected_model = resolve_model(args.model)
        print(f"[Model Selected via flag]: {selected_model}")
    else:
        selected_model = prompt_model_selection()

    # 2. Execute query (single query mode or interactive session)
    if args.query:
        print(f"Submitting query to Supabase with model: {selected_model}")
        try:
            result = insert_query(
                prompt=args.query,
                selected_model=selected_model,
                session_id=args.session_id
            )
            print("[SUCCESS] Query logged to database.")
            print(f"Payload: {result.get('payload')}")
        except Exception as e:
            print(f"[ERROR] Error: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        run_chat_session(selected_model, args.session_id)

if __name__ == "__main__":
    main()
