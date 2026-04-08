"""
Tests for the LLM data preprocessor.
Imports the preprocessor directly via importlib to avoid sys.path conflicts.
"""
import importlib.util
import sys
import os
from pathlib import Path

import pytest

# Load the preprocessor module directly without adding llm-service to sys.path
_preproc_path = Path(__file__).parent.parent.parent.parent / "services" / "llm-service" / "app" / "preprocessor.py"
_spec = importlib.util.spec_from_file_location("llm_preprocessor", str(_preproc_path))
_preproc_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_preproc_module)

clean_text = _preproc_module.clean_text
quality_filter = _preproc_module.quality_filter


class TestCleanText:
    def test_strips_html_tags(self):
        html = "<p>Hello <b>World</b></p>"
        result = clean_text(html, remove_html=True)
        assert "<" not in result
        assert "Hello" in result
        assert "World" in result

    def test_decodes_html_entities(self):
        result = clean_text("&amp; &lt; &gt; &nbsp;", remove_html=True)
        assert "&amp;" not in result
        assert "&" in result

    def test_collapses_whitespace(self):
        result = clean_text("hello   world\n\n\n\nend")
        assert "   " not in result

    def test_lowercase_option(self):
        result = clean_text("HELLO World", remove_html=False, lowercase=True)
        assert result == "hello world"

    def test_no_lowercase_by_default(self):
        result = clean_text("HELLO World")
        assert "HELLO" in result


class TestQualityFilter:
    def test_rejects_short_text(self):
        short = "hello world"
        assert quality_filter(short, min_words=20) is False

    def test_accepts_good_text(self):
        good = " ".join([f"word{i}" for i in range(50)])
        assert quality_filter(good, min_words=20) is True

    def test_rejects_repetitive_text(self):
        repetitive = "spam " * 100
        assert quality_filter(repetitive, max_repetition_ratio=0.5) is False
