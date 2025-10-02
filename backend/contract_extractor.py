import atexit
import gc
import io
import logging
import os
import re
import time
import tracemalloc
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from functools import wraps
from typing import Any, Dict, List, Optional, Tuple, Union

from dotenv import load_dotenv
import fitz  # PyMuPDF – a faster alternative to PyPDF2
import msgspec
import msgspec.yaml
import spacy
from mistralai import Mistral, SDKError


load_dotenv()

SUPPORTED_KEYS = {
    "start_date",
    "end_date",
    "renewal_terms",
    "termination_notice_period",
}

# -------------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------
logging.getLogger().handlers.clear()  # clear any handlers set before
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Decorators
# ------------------------------------------------------------------
def performance_profiler(func):
    """
    Decorator to measure execution time and peak memory usage.
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        tracemalloc.start()
        start_time = time.perf_counter()
        try:
            result = func(*args, **kwargs)
        finally:
            end_time = time.perf_counter()
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            if isinstance(result, dict):
                result.setdefault("performance_metrics", {})
                result["performance_metrics"].update(
                    {
                        "execution_time_seconds": f"{end_time - start_time:.4f}",
                        "peak_memory_usage_mb": f"{peak / 10**6:.2f}",
                    }
                )
        return result

    return wrapper


# ------------------------------------------------------------------
# Data Models
# ------------------------------------------------------------------
class ExtractionSource(Enum):
    REGEX = "Regex"
    SYSTEM_FALLBACK = "System Fallback"
    INFERENCE = "Inference"
    NONE = "None"


@dataclass
class ExtractionResult:
    value: str
    source: ExtractionSource

    def to_dict(self) -> Dict[str, Any]:
        return {"value": self.value, "source": self.source.value}


@dataclass
class PatternConfig:
    patterns: List[str]
    formatter: Optional[str] = None
    fallback_text: Optional[str] = "Not Found"
    find_all: bool = False


@dataclass
class WindowConfig:
    min_sentences: int = 2
    max_sentences: int = 5
    max_chars_dense: int = 1_000
    max_chars_sparse: int = 6_000  # ~1 page


# ------------------------------------------------------------------
# Main Extractor
# ------------------------------------------------------------------
class ContractExtractor:
    """
    Contract information extractor using dynamic context windows
    and regex-first heuristics.
    """

    def __init__(self):
        self.patterns: Dict[str, PatternConfig] = {}
        atexit.register(self.cleanup)

        # lightweight spaCy pipeline for sentence splitting
        self.nlp = spacy.blank("en")
        self.nlp.add_pipe("sentencizer")

        try:
            self.patterns = self._build_comprehensive_patterns()
        except Exception as e:
            logger.error(f"Failed to initialize ContractExtractor: {e}")
            raise

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    def cleanup(self):
        logger.info("Performing cleanup...")
        gc.collect()

    # ------------------------------------------------------------------
    # Pattern Loading
    # ------------------------------------------------------------------
    def _build_comprehensive_patterns(self) -> Dict[str, PatternConfig]:
        patterns = {}
        patterns_dir = os.path.join(os.path.dirname(__file__), "patterns")

        if not os.path.isdir(patterns_dir):
            logger.warning(
                "Patterns directory not found: %s. No patterns loaded.", patterns_dir
            )
            return {}

        for filename in os.listdir(patterns_dir):
            if not filename.endswith(".yaml"):
                continue

            key = filename.replace(".yaml", "")
            if key not in SUPPORTED_KEYS:
                continue

            try:
                with open(os.path.join(patterns_dir, filename), "rb") as f:
                    config_data = msgspec.yaml.decode(f.read(), type=PatternConfig)
                    patterns[key] = config_data
                    logger.info("Loaded pattern for '%s' from %s", key, filename)
            except Exception as e:
                logger.error("Failed to load pattern file %s: %s", filename, e)
        return patterns

    # ------------------------------------------------------------------
    # Windowing Helpers
    # ------------------------------------------------------------------
    def _estimate_density(self, text: str) -> float:
        """Return 0-1 score: higher = denser legal prose."""
        alpha = sum(c.isalnum() for c in text)
        return alpha / max(len(text), 1)

    def _generate_context_windows(self, text: str, cfg: WindowConfig) -> List[str]:
        """
        Section-aware windowing:
        1. Detect headings (e.g. "5. Limitation of Liability").
        2. Attach every paragraph to the last seen heading.
        3. Build windows while keeping (Heading + Paragraph) intact.
        4. Fallback to sentence-split if a single paragraph exceeds budget.
        """

        HEADING_RE = re.compile(
            r"^\s*(?:\d+(?:\.\d+)*|Article|Section|Clause)\s+[A-Z][^\n]*$",
            re.IGNORECASE | re.MULTILINE,
        )

        # --- 1. Build (heading, paragraph) pairs -----------------------------
        lines = text.splitlines(keepends=True)
        segments = []  # (heading_text, paragraph_text)
        current_heading = ""
        buffer = []

        def flush_para():
            nonlocal buffer, segments
            para = "".join(buffer).strip()
            if para:
                segments.append((current_heading, para))
            buffer.clear()

        for line in lines:
            if HEADING_RE.match(line):
                flush_para()
                current_heading = line.strip()
            else:
                buffer.append(line)
        flush_para()

        # --- 2. Build windows ------------------------------------------------
        windows = []

        for heading, para in segments:
            chunk = f"{heading}\n\n{para}" if heading else para

            # Paragraph fits
            if len(chunk) <= cfg.max_chars_sparse:
                windows.append(chunk)
                continue

            # Heading alone + paragraph too big → sentence split paragraph
            if heading:
                windows.append(heading)  # keep heading as own window if small
                chunk = para

            # Sentence split paragraph
            doc = self.nlp(chunk)
            sentences = [s.text.strip() for s in doc.sents if s.text.strip()]
            idx = 0
            while idx < len(sentences):
                sub = ""
                while idx < len(sentences):
                    cand = sub + " " + sentences[idx] if sub else sentences[idx]
                    if len(cand) <= cfg.max_chars_dense:
                        sub = cand
                        idx += 1
                    else:
                        break
                if sub:
                    windows.append(sub)
                else:
                    # Emergency hard slice
                    windows.append(sentences[idx][: cfg.max_chars_dense])
                    idx += 1

        return windows

    # ------------------------------------------------------------------
    # Entry Point
    # ------------------------------------------------------------------
    @performance_profiler
    def extract_from_pdf(self, pdf_file: Union[bytes, io.BytesIO]) -> Dict[str, Any]:
        doc = None
        try:
            pdf_stream = (
                io.BytesIO(pdf_file) if isinstance(pdf_file, bytes) else pdf_file
            )
            doc = fitz.open(stream=pdf_stream, filetype="pdf")

            if doc.is_encrypted:
                logger.error("PDF is encrypted and cannot be processed.")
                return {"error": "PDF is encrypted and cannot be processed."}

            contract_text = self._extract_text_from_pdf(doc)
            page_count = doc.page_count

            if not contract_text.strip():
                return {"error": "No readable text found in the PDF."}

            results = self._extract_contract_basics(contract_text)
            results["pages_analysed"] = page_count
            return results

        except Exception as e:
            logger.error("Unexpected error processing PDF: %s", e, exc_info=True)
            return {
                "error": (
                    "Failed to read PDF. The file may be corrupted or in an "
                    f"unsupported format: {e}"
                )
            }
        finally:
            if doc:
                doc.close()

    # ------------------------------------------------------------------
    # Text Extraction
    # ------------------------------------------------------------------
    def _extract_text_from_pdf(self, doc: fitz.Document) -> str:
        text_parts = []
        logger.info("Processing %d pages from PDF.", doc.page_count)
        for page_num, page in enumerate(doc):
            try:
                text_parts.append(page.get_text("text"))
            except Exception as e:
                logger.warning(
                    "Could not extract text from page %d: %s", page_num + 1, e
                )
        return "\n".join(text_parts)

    # ------------------------------------------------------------------
    # Pre-processing
    # ------------------------------------------------------------------
    def _preprocess_contract(self, text: str) -> str:
        text = re.sub(r"\s*\n\s*", "\n", text)
        return text.strip()

  
    # ------------------------------------------------------------------
    # LLM Extraction for 4 specific fields only
    # ------------------------------------------------------------------
    def _get_start_date_with_llm(self, text: str) -> Optional[str]:
        try:
            api_key = os.environ.get("MISTRAL_API_KEY")
            if not api_key:
                logger.warning("MISTRAL_API_KEY not set, skipping LLM fallback.")
                return None

            client = Mistral(api_key=api_key)
            model = "mistral-small-latest"

            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are an expert contract analyst. Read the following contract text and find the start date or term.\n"
                                "- If a specific start date is mentioned (e.g., 'October 31, 2010'), respond with ONLY that date in 'Month Day, Year' format.\n"
                                "- If the start date is described as a term (e.g., 'one year from the effective date'), respond with that exact term.\n"
                                "- If no start date or term is mentioned, respond with 'Not Found'."
                            ),
                        },
                        {"type": "text", "text": f"Contract Text:\n{text[:12000]}"},
                    ],
                }
            ]

            chat_response = client.chat.complete(
                model=model,
                messages=messages,
                max_tokens=50,
            )

            if chat_response.choices:
                raw_output = chat_response.choices[0].message.content.strip()
                logger.info(f"LLM start date raw output: {raw_output}")
                return raw_output

        except SDKError as e:
            logger.error(f"LLM fallback for start_date with Mistral failed: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred during LLM fallback for start_date: {e}")

        return None

    def _get_end_date_with_llm(self, text: str) -> Optional[str]:
        try:
            api_key = os.environ.get("MISTRAL_API_KEY")
            if not api_key:
                logger.warning("MISTRAL_API_KEY not set, skipping LLM fallback.")
                return None

            client = Mistral(api_key=api_key)
            model = "mistral-small-latest"
            
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are an expert contract analyst. Read the following contract text and find the end date or term.\n"
                                "- If a specific end date is mentioned (e.g., 'October 31, 2010'), respond with ONLY that date in 'Month Day, Year' format.\n"
                                "- If the end date is described as a term (e.g., 'one year from the effective date'), respond with that exact term.\n"
                                "- If no end date or term is mentioned, respond with 'Not Found'."
                            ),
                        },
                        {
                            "type": "text",
                            "text": f"Contract Text:\n{text[:12000]}"
                        }
                    ]
                }
            ]

            chat_response = client.chat.complete(
                model=model,
                messages=messages,
                max_tokens=150,
            )
            
            if chat_response.choices:
                return chat_response.choices[0].message.content.strip()
        except SDKError as e:
            logger.error(f"LLM fallback for end_date with Mistral failed: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred during LLM fallback: {e}")
        return None

    def _get_renewal_terms_with_llm(self, text: str) -> Optional[str]:
        try:
            api_key = os.environ.get("MISTRAL_API_KEY")
            if not api_key:
                logger.warning("MISTRAL_API_KEY not set, skipping LLM fallback.")
                return None

            client = Mistral(api_key=api_key)
            model = "mistral-small-latest"
            
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are an expert contract analyst. Read the following contract text and analyze the renewal terms. Provide a very concise, one-sentence summary of the renewal terms.\n"
                                "- If the contract specifies how it renews (e.g., automatically, by mutual agreement), summarize that. For example: 'Renews upon mutual written agreement.' or 'Automatically renews for 1-year periods unless 90 days notice is given.'\n"
                                "- If the contract is silent on renewal, respond with 'No renewal terms specified'."
                            ),
                        },
                        {
                            "type": "text",
                            "text": f"Contract Text:\n{text[:12000]}"
                        }
                    ]
                }
            ]

            chat_response = client.chat.complete(
                model=model,
                messages=messages,
                max_tokens=150,
            )
            
            if chat_response.choices:
                return chat_response.choices[0].message.content.strip()
        except SDKError as e:
            logger.error(f"LLM fallback for renewal_terms with Mistral failed: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred during LLM fallback for renewal_terms: {e}")
        return None

    def _get_termination_notice_period_with_llm(self, text: str) -> Optional[str]:
        try:
            api_key = os.environ.get("MISTRAL_API_KEY")
            if not api_key:
                logger.warning("MISTRAL_API_KEY not set, skipping LLM fallback.")
                return None

            client = Mistral(api_key=api_key)
            model = "mistral-small-latest"
            
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are an expert contract analyst. Read the following contract text and analyze the termination notice period. Provide a concise, business-friendly summary of the termination notice period.\n"
                                "- If a specific notice period is mentioned, state it clearly (e.g., '30 days written notice').\n"
                                "- If no general notice period is specified, but there are conditions for immediate termination, summarize that (e.g., 'Not specified for general termination, but allows for immediate termination in cases of bankruptcy').\n"
                                "- If no termination notice period is mentioned at all, respond with 'Not specified'."
                            ),
                        },
                        {
                            "type": "text",
                            "text": f"Contract Text:\n{text[:12000]}"
                        }
                    ]
                }
            ]

            chat_response = client.chat.complete(
                model=model,
                messages=messages,
                max_tokens=50,
            )
            
            if chat_response.choices:
                return chat_response.choices[0].message.content.strip()
        except SDKError as e:
            logger.error(f"LLM fallback for termination_notice_period with Mistral failed: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred during LLM fallback for termination_notice_period: {e}")
        return None

    # ------------------------------------------------------------------
    # Main Extraction Flow
    # ------------------------------------------------------------------
    def _extract_contract_basics(self, contract_text: str) -> Dict[str, Any]:
        if not contract_text.strip():
            return {"error": "Empty contract text provided."}

        try:
            raw_text = self._preprocess_contract(contract_text)

            # LLM Extraction for 4 fields only
            logger.info("Running LLM extraction for 4 fields...")
            llm_start_date = self._get_start_date_with_llm(raw_text)
            llm_end_date = self._get_end_date_with_llm(raw_text)
            llm_renewal_terms = self._get_renewal_terms_with_llm(raw_text)
            llm_termination_notice_period = self._get_termination_notice_period_with_llm(raw_text)

            # Regex Extraction for all fields
            windows = self._generate_context_windows(raw_text, WindowConfig())
            all_hits: List[Tuple[str, str, str]] = []
            for w in windows:
                hits = self._extract_with_patterns(w)
                for k, v in hits.items():
                    all_hits.append((k, v, w))

            final_data = self._merge_window_results(all_hits)

            # Prioritize LLM results for the 4 specific fields
            if llm_start_date and llm_start_date != "Not Found":
                final_data["start_date"] = ExtractionResult(llm_start_date, ExtractionSource.INFERENCE)

            if llm_end_date and llm_end_date != "Not Found":
                final_data["end_date"] = ExtractionResult(llm_end_date, ExtractionSource.INFERENCE)

            if llm_renewal_terms and llm_renewal_terms != "Not Found":
                final_data["renewal_terms"] = ExtractionResult(llm_renewal_terms, ExtractionSource.INFERENCE)

            if llm_termination_notice_period and llm_termination_notice_period != "Not specified":
                final_data["termination_notice_period"] = ExtractionResult(llm_termination_notice_period, ExtractionSource.INFERENCE)

            analysis: Dict[str, Dict[str, Any]] = {}
            for key in SUPPORTED_KEYS:
                result = final_data.get(key)
                if result is None:
                    result = ExtractionResult("Not Found", ExtractionSource.SYSTEM_FALLBACK)
                analysis[key] = result.to_dict()

            results = {
                "extraction_timestamp": datetime.now().isoformat(),
                "contract_type": self._identify_contract_type(raw_text),
                "contract_length": len(raw_text),
                "analysis": analysis,
            }
            return results

        except Exception as e:
            logger.error("Error during contract extraction: %s", e, exc_info=True)
            return {"error": f"Failed to extract contract information: {e}"}

    # ------------------------------------------------------------------
    # Result Merging
    # ------------------------------------------------------------------
    def _merge_window_results(
        self, hits: List[Tuple[str, str, str]]
    ) -> Dict[str, ExtractionResult]:
        grouped = defaultdict(list)
        for key, val, _ in hits:
            grouped[key].append(val)

        merged = {}
        for key, vals in grouped.items():
            top = max(set(vals), key=len)
            merged[key] = ExtractionResult(top, ExtractionSource.REGEX)

        # Fallback for any key never matched
        for key in SUPPORTED_KEYS:
            if key not in merged:
                cfg = self.patterns.get(key)
                fallback_text = cfg.fallback_text if cfg else "Not Found"
                merged[key] = ExtractionResult(
                    fallback_text,
                    ExtractionSource.SYSTEM_FALLBACK,
                )
        return merged

    def _identify_contract_type(self, text: str) -> str:
        """Return a simple default contract type label."""
        return "General Agreement"

    # ------------------------------------------------------------------
    # Regex Application
    # ------------------------------------------------------------------
    def _extract_with_patterns(self, text: str) -> Dict[str, str]:
        extractions = {}
        for key in SUPPORTED_KEYS:
            cfg = self.patterns.get(key)
            if not cfg:
                continue
            val = self._apply_pattern_config(text, cfg)
            if val:
                extractions[key] = val
        return extractions

    def _apply_pattern_config(self, text: str, config: PatternConfig) -> Optional[str]:
        matches_found: List[str] = []
        for pattern in config.patterns:
            try:
                if config.find_all:
                    for match in re.findall(pattern, text, re.IGNORECASE | re.DOTALL):
                        match_text = match if isinstance(match, str) else "".join(
                            filter(None, match)
                        )
                        match_text = match_text.strip()
                        if match_text:
                            matches_found.append(match_text)
                else:
                    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
                    if match:
                        value = (
                            "".join(filter(None, match.groups())).strip()
                            if match.groups()
                            else match.group(0).strip()
                        )
                        return value.replace("\n", " ").strip()
            except re.error as exc:
                logger.error("Regex error in pattern '%s': %s", pattern, exc)

        if matches_found:
            return " | ".join(sorted(set(matches_found)))
        return None
