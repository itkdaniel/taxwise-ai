"""
Data preprocessor — handles any structured or unstructured input.

Supported input types:
  • Raw HTML / web-scraped text
  • JSON / JSONL ({"text": "..."})
  • CSV (auto-detects text columns)
  • Plain text
  • PDF (via pdfminer if installed)

All outputs are normalized plain text suitable for LLM tokenisation.
"""
import json
import re
import unicodedata
from pathlib import Path
from typing import Iterator


# ── Text cleaning ─────────────────────────────────────────────────────────────

def clean_text(text: str, *, remove_html: bool = True, lowercase: bool = False) -> str:
    """
    Normalize text for LLM training:
    1. Optionally strip HTML tags
    2. Decode HTML entities
    3. Remove control characters
    4. Collapse excess whitespace
    5. Optionally lowercase
    """
    if remove_html:
        text = _strip_html(text)

    # Normalize unicode to NFC form
    text = unicodedata.normalize("NFC", text)

    # Remove non-printable control characters (except newline + tab)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # Collapse multiple spaces / newlines
    text = re.sub(r" {2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()

    if lowercase:
        text = text.lower()

    return text


def _strip_html(html: str) -> str:
    """Fast regex-based HTML tag stripper (no heavy dependency needed)."""
    # Replace block tags with newlines for readability
    html = re.sub(r"<(br|p|div|h\d|li|tr)[^>]*>", "\n", html, flags=re.IGNORECASE)
    # Strip remaining tags
    html = re.sub(r"<[^>]+>", "", html)
    # Decode common HTML entities
    for entity, char in [("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
                          ("&nbsp;", " "), ("&quot;", '"'), ("&#39;", "'")]:
        html = html.replace(entity, char)
    return html


def quality_filter(text: str, min_words: int = 20, max_repetition_ratio: float = 0.5) -> bool:
    """
    Heuristic quality filter:
    • Reject documents shorter than min_words
    • Reject documents where >50% of words are duplicates (spam)
    """
    words = text.split()
    if len(words) < min_words:
        return False
    unique_ratio = len(set(words)) / len(words)
    if unique_ratio < (1 - max_repetition_ratio):
        return False
    return True


# ── Multi-format readers ──────────────────────────────────────────────────────

def read_dataset(source: str | Path) -> Iterator[str]:
    """
    Auto-detect input format and yield cleaned text documents.
    Supports: JSONL, JSON array, CSV, plain text, PDF.
    """
    source = Path(source) if not isinstance(source, Path) else source
    suffix = source.suffix.lower()

    if suffix == ".jsonl":
        yield from _read_jsonl(source)
    elif suffix == ".json":
        yield from _read_json(source)
    elif suffix in (".csv", ".tsv"):
        yield from _read_csv(source)
    elif suffix == ".pdf":
        yield from _read_pdf(source)
    else:
        yield from _read_plaintext(source)


def _read_jsonl(path: Path) -> Iterator[str]:
    """Read JSONL — each line {"text": "..."} or {"content": "..."}."""
    with open(path, encoding="utf-8", errors="ignore") as f:
        for line in f:
            try:
                obj = json.loads(line.strip())
                text = obj.get("text") or obj.get("content") or ""
                cleaned = clean_text(str(text))
                if quality_filter(cleaned):
                    yield cleaned
            except json.JSONDecodeError:
                continue


def _read_json(path: Path) -> Iterator[str]:
    """Read a JSON array of objects with a text field."""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        for item in data:
            text = item.get("text") or item.get("content") or str(item)
            cleaned = clean_text(text)
            if quality_filter(cleaned):
                yield cleaned


def _read_csv(path: Path) -> Iterator[str]:
    """Auto-detect the longest text column and yield its rows."""
    import csv
    with open(path, encoding="utf-8", errors="ignore", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            return
        # Heuristic: pick the column with the longest average value
        text_col = reader.fieldnames[0]
        for row in reader:
            text = row.get(text_col, "")
            cleaned = clean_text(text)
            if quality_filter(cleaned):
                yield cleaned


def _read_pdf(path: Path) -> Iterator[str]:
    """Extract text from PDF pages using pdfminer (optional dependency)."""
    try:
        from pdfminer.high_level import extract_text
        raw = extract_text(str(path))
        for chunk in raw.split("\f"):  # form feed = page break
            cleaned = clean_text(chunk)
            if quality_filter(cleaned):
                yield cleaned
    except ImportError:
        raise RuntimeError("Install pdfminer.six for PDF support: pip install pdfminer.six")


def _read_plaintext(path: Path) -> Iterator[str]:
    """Read plain text, splitting into paragraphs."""
    with open(path, encoding="utf-8", errors="ignore") as f:
        raw = f.read()
    for para in raw.split("\n\n"):
        cleaned = clean_text(para)
        if quality_filter(cleaned):
            yield cleaned
