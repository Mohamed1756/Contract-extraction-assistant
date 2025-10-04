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
    page_number: Optional[int] = None
    reference_snippet: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "value": self.value,
            "source": self.source.value,
            "page_number": self.page_number,
            "reference_snippet": self.reference_snippet,
        }


@dataclass
class PatternConfig:
    patterns: List[str]
    formatter: Optional[str] = None
    fallback_text: Optional[str] = "Not Found"
    find_all: bool = False


@dataclass
class PageText:
    page_number: int
    text: str


@dataclass
class ContextWindow:
    page_number: int
    text: str


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

    def _generate_context_windows_for_text(
        self, text: str, cfg: WindowConfig
    ) -> List[str]:
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

    def _generate_context_windows(
        self, pages: List[PageText], cfg: WindowConfig
    ) -> List[ContextWindow]:
        windows: List[ContextWindow] = []
        for page in pages:
            page_windows = self._generate_context_windows_for_text(page.text, cfg)
            for window_text in page_windows:
                if not window_text.strip():
                    continue
                windows.append(
                    ContextWindow(page_number=page.page_number, text=window_text)
                )
        return windows

    def _format_pages_for_llm(self, pages: List[PageText]) -> str:
        parts = []
        for page in pages:
            parts.append(f"Page {page.page_number}:\n{page.text}")
        return "\n\n".join(parts)

    def _normalize_for_matching(self, text: str) -> str:
        cleaned = re.sub(r"[^\w\s]", " ", text)
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned.strip().lower()

    def _find_page_number_for_value(
        self, pages: List[PageText], value: Optional[str]
    ) -> Optional[int]:
        if not value:
            return None

        normalized_value = self._normalize_for_matching(value)
        if not normalized_value:
            return None

        normalized_pages = [
            (page.page_number, self._normalize_for_matching(page.text))
            for page in pages
        ]

        for page_number, normalized_page_text in normalized_pages:
            if normalized_value and normalized_value in normalized_page_text:
                return page_number

        tokens = normalized_value.split()
        for length in range(min(len(tokens), 6), 2, -1):
            snippet = " ".join(tokens[:length])
            if len(snippet) < 4:
                continue
            for page_number, normalized_page_text in normalized_pages:
                if snippet in normalized_page_text:
                    return page_number

        return None

    def _extract_page_number_from_text(self, text: str) -> Optional[int]:
        if not text:
            return None
        match = re.search(r"page\s*=*\s*(\d+)", text, re.IGNORECASE)
        if match:
            return int(match.group(1))
        match = re.search(r"page\s+(\d+)", text, re.IGNORECASE)
        if match:
            return int(match.group(1))
        match = re.search(r"\bPAGE=(\d+)\b", text, re.IGNORECASE)
        if match:
            return int(match.group(1))
        return None

    def _process_llm_output(
        self, pages: List[PageText], raw_output: str, field: str
    ) -> Tuple[Optional[str], Optional[int]]:
        if not raw_output:
            return None, None

        output = raw_output.strip()
        output = re.sub(r"^```(?:\w+)?\s*|\s*```$", "", output)

        answer_part = output
        page_part = ""
        if "|||" in output:
            answer_part, page_part = [segment.strip() for segment in output.split("|||", 1)]

        answer_value = self._sanitize_llm_answer(answer_part, field)
        if not answer_value:
            return None, None

        page_number = self._extract_page_number_from_text(page_part)
        if page_number is None:
            page_number = self._extract_page_number_from_text(output)
        if page_number is None:
            page_number = self._find_page_number_for_value(pages, answer_value)

        return answer_value, page_number

    def _slice_snippet_around_match(
        self, text: str, value: str, *, radius: int = 180
    ) -> Optional[str]:
        if not text or not value:
            return None

        pattern = re.escape(value[:500])
        match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
        if not match:
            normalized_text = self._normalize_for_matching(text)
            normalized_value = self._normalize_for_matching(value)
            if not normalized_value:
                return None
            idx = normalized_text.find(normalized_value)
            if idx == -1:
                tokens = normalized_value.split()
                for length in range(min(len(tokens), 6), 1, -1):
                    snippet = " ".join(tokens[:length])
                    if len(snippet) < 4:
                        continue
                    idx = normalized_text.find(snippet)
                    if idx != -1:
                        break
                if idx == -1:
                    return None
            start = max(0, idx - radius)
            end = min(len(normalized_text), idx + len(normalized_value) + radius)
            # Approximate mapping back to original text by character offsets
            # Since normalization removes punctuation, the mapping is fuzzy but provides context.
            return text[start:end].strip()

        start = max(0, match.start() - radius)
        end = min(len(text), match.end() + radius)
        return text[start:end].strip()

    def _build_reference_snippet(
        self,
        pages: List[PageText],
        value: Optional[str],
        page_number: Optional[int],
        fallback_text: Optional[str] = None,
    ) -> Optional[str]:
        if not value:
            return None

        if page_number is not None:
            page = next((p for p in pages if p.page_number == page_number), None)
            if page:
                snippet = self._slice_snippet_around_match(page.text, value)
                if snippet:
                    return snippet

        if fallback_text:
            snippet = self._slice_snippet_around_match(fallback_text, value)
            if snippet:
                return snippet

        return None

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

            page_texts = self._extract_text_from_pdf(doc)
            page_count = len(page_texts)

            if not any(page.text.strip() for page in page_texts):
                return {"error": "No readable text found in the PDF."}

            results = self._extract_contract_basics(page_texts)
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
    def _extract_text_from_pdf(self, doc: fitz.Document) -> List[PageText]:
        pages: List[PageText] = []
        logger.info("Processing %d pages from PDF.", doc.page_count)
        for page_index, page in enumerate(doc, start=1):
            text_content = ""
            try:
                text_content = page.get_text("text")
            except Exception as e:
                logger.warning(
                    "Could not extract text from page %d: %s", page_index, e
                )
            pages.append(PageText(page_number=page_index, text=text_content))
        return pages

    # ------------------------------------------------------------------
    # Pre-processing
    # ------------------------------------------------------------------
    def _preprocess_contract(self, text: str) -> str:
        text = re.sub(r"\s*\n\s*", "\n", text)
        return text.strip()

    def _sanitize_llm_answer(self, answer: Optional[str], field: str) -> Optional[str]:
        """Normalize LLM output to a single, plain-text line without labels.
        - Strips markdown, bullets, and common labels like 'Summary:'
        - Collapses whitespace
        - Keeps only the first sentence/line to avoid explanations
        """
        if not answer:
            return None
        t = answer.strip()
        # Strip codeFences if any
        t = re.sub(r"^```(?:\w+)?\s*|\s*```$", "", t)
        # Remove markdown emphasis/backticks
        t = re.sub(r"[*_`]+", "", t)
        # Remove leading bullets and generic labels
        t = re.sub(r"^\s*(?:[-*•]+\s*)?", "", t)
        t = re.sub(
            r"^\s*(?:[A-Za-z ]{3,40})\s*(?:summary|overview|answer|result|extraction|notice period|termination notice period|renewal terms)\s*:?-?\s*",
            "",
            t,
            flags=re.IGNORECASE,
        )
        # Collapse whitespace
        t = re.sub(r"\s+", " ", t).strip()
        # Keep only the first line
        if "\n" in t:
            t = t.split("\n", 1)[0].strip()
        # Keep only the first sentence if multiple
        m = re.match(r"(.+?[.!?])(?:\s|$)", t)
        if m:
            t = m.group(1).strip()
        # Field-specific light normalizations
        if field in ("start_date", "end_date"):
            t = re.sub(r"^(?:effective|start|end|termination)\s+date\s*[:\-]\s*", "", t, flags=re.IGNORECASE)
        return t or None
    
    def _is_uninformative_llm_answer(self, text: str, field: str) -> bool:
        """Heuristics to catch vacuous answers like 'Contract renewal conditions specified.'"""
        if not text:
            return True
        t = text.strip().lower().rstrip('.')
        allowed_exact = {"not specified", "no renewal terms specified", "not found"}
        if t in allowed_exact:
            return False
        generic_patterns = [
            r"^(contract )?(renewal|termination notice period|notice period|end date|start date)s? (conditions|terms|details|information) (are )?(provided|specified|mentioned)$",
            r"^(as per (the )?contract|per (the )?agreement)$",
            r"^(refer to (the )?(contract|agreement))$",
        ]
        for pat in generic_patterns:
            if re.match(pat, t, re.IGNORECASE):
                return True
        if field == "termination_notice_period":
            if not re.search(r"(day|days|week|weeks|month|months|year|years|immediate|upon|prior|written|notice|business day)", t, re.IGNORECASE):
                return True
        if field == "renewal_terms":
            if not re.search(r"(renew|renewal|extend|auto|automatic|mutual|unless|notice|period|term|year|month|days)", t, re.IGNORECASE):
                return True
        return False
 
    # ------------------------------------------------------------------
    # LLM Extraction for 4 specific fields only
    # ------------------------------------------------------------------
    def _get_start_date_with_llm(
        self, pages: List[PageText]
    ) -> Tuple[Optional[str], Optional[int]]:
        try:
            api_key = os.environ.get("MISTRAL_API_KEY")
            if not api_key:
                logger.warning("MISTRAL_API_KEY not set, skipping LLM fallback.")
                return None, None

            client = Mistral(api_key=api_key)
            model = "mistral-small-latest"

            context_excerpt = self._format_pages_for_llm(pages)[:12000]

            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are an expert contract analyst. Read the following contract text and find the start date or term.\n"
                                "Output rules: Return ONLY the answer as plain text on a single line. No labels, no bullets, no markdown, no explanations.\n"
                                "If a specific start date is mentioned (e.g., 'October 31, 2010'), respond with ONLY that date in 'Month Day, Year' format.\n"
                                "If the start date is described as a term (e.g., 'one year from the effective date'), respond with that exact term.\n"
                                "If no start date or term is mentioned, respond with 'Not Found'.\n"
                                "Each excerpt is prefixed with its source page (e.g., 'Page 3:'). Include the page number of the best supporting evidence in the format 'ANSWER ||| PAGE=<number or UNKNOWN>'."
                            ),
                        },
                        {"type": "text", "text": f"Contract Text:\n{context_excerpt}"},
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
                return self._process_llm_output(pages, raw_output, "start_date")

        except SDKError as e:
            logger.error(f"LLM fallback for start_date with Mistral failed: {e}")
        except Exception as e:
            logger.error(
                f"An unexpected error occurred during LLM fallback for start_date: {e}"
            )

        return None, None

    def _get_end_date_with_llm(
        self, pages: List[PageText]
    ) -> Tuple[Optional[str], Optional[int]]:
        try:
            api_key = os.environ.get("MISTRAL_API_KEY")
            if not api_key:
                logger.warning("MISTRAL_API_KEY not set, skipping LLM fallback.")
                return None, None

            client = Mistral(api_key=api_key)
            model = "mistral-small-latest"

            context_excerpt = self._format_pages_for_llm(pages)[:120000]

            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are an expert contract analyst. Read the following contract text and find the end date or term.\n"
                                "Output rules: Return ONLY the answer as plain text on a single line. No labels, no bullets, no markdown, no explanations.\n"
                                "If a specific end date is mentioned (e.g., 'October 31, 2010'), respond with ONLY that date in 'Month Day, Year' format.\n"
                                "If the end date is described as a term (e.g., 'one year from the effective date'), respond with that exact term.\n"
                                "If no end date or term is mentioned, respond with 'Not Found'.\n"
                                "Each excerpt is prefixed with its source page (e.g., 'Page 4:'). Include the supporting page number in the format 'ANSWER ||| PAGE=<number or UNKNOWN>'."
                            ),
                        },
                        {
                            "type": "text",
                            "text": f"Contract Text:\n{context_excerpt}"
                        }
                    ]
                }
            ]

            chat_response = client.chat.complete(
                model=model,
                messages=messages,
                max_tokens=120,
            )

            if chat_response.choices:
                raw_output = chat_response.choices[0].message.content.strip()
                return self._process_llm_output(pages, raw_output, "end_date")
        except SDKError as e:
            logger.error(f"LLM fallback for end_date with Mistral failed: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred during LLM fallback: {e}")
        return None, None

    def _get_renewal_terms_with_llm(
        self, pages: List[PageText]
    ) -> Tuple[Optional[str], Optional[int]]:
        try:
            api_key = os.environ.get("MISTRAL_API_KEY")
            if not api_key:
                logger.warning("MISTRAL_API_KEY not set, skipping LLM fallback.")
                return None, None

            client = Mistral(api_key=api_key)
            model = "mistral-small-latest"

            context_excerpt = self._format_pages_for_llm(pages)[:120000]

            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are an expert contract analyst. Read the following contract text and analyze the renewal terms.\n"
                                "Output rules: Return EXACTLY one concise sentence as plain text on a single line. No labels, no bullets, no markdown, no explanations.\n"
                                "If the contract specifies how it renews (e.g., automatically, by mutual agreement), summarize that in one short sentence.\n"
                                "If the contract is silent on renewal, respond with 'No renewal terms specified'.\n"
                                "Each excerpt is prefixed with its source page (e.g., 'Page 2:'). Add the supporting page number using 'ANSWER ||| PAGE=<number or UNKNOWN>'."
                            ),
                        },
                        {
                            "type": "text",
                            "text": f"Contract Text:\n{context_excerpt}"
                        }
                    ]
                }
            ]

            chat_response = client.chat.complete(
                model=model,
                messages=messages,
                max_tokens=120,
            )

            if chat_response.choices:
                raw_output = chat_response.choices[0].message.content.strip()
                value, page = self._process_llm_output(pages, raw_output, "renewal_terms")
                if value and self._is_uninformative_llm_answer(value, "renewal_terms"):
                    return "No renewal terms specified", None
                return value, page
        except SDKError as e:
            logger.error(f"LLM fallback for renewal_terms with Mistral failed: {e}")
        except Exception as e:
            logger.error(
                f"An unexpected error occurred during LLM fallback for renewal_terms: {e}"
            )
        return None, None

    def _get_termination_notice_period_with_llm(
        self, pages: List[PageText]
    ) -> Tuple[Optional[str], Optional[int]]:
        try:
            api_key = os.environ.get("MISTRAL_API_KEY")
            if not api_key:
                logger.warning("MISTRAL_API_KEY not set, skipping LLM fallback.")
                return None, None

            client = Mistral(api_key=api_key)
            model = "mistral-small-latest"

            context_excerpt = self._format_pages_for_llm(pages)[:120000]

            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are an expert contract analyst. Read the following contract text and analyze the termination notice period.\n"
                                "Output rules: Return EXACTLY one concise sentence as plain text on a single line. No labels, no bullets, no markdown, no explanations.\n"
                                "If a specific notice period is mentioned, state it clearly (e.g., '30 days written notice').\n"
                                
                                "If no general notice period is specified, but there are conditions for immediate termination, summarize that in one short sentence.\n"
                                "If no termination notice period is mentioned at all, respond with 'Not specified'.\n"
                                "Each excerpt is prefixed with its source page (e.g., 'Page 5:'). Provide the supporting page number using 'ANSWER ||| PAGE=<number or UNKNOWN>'."
                            ),
                        },
                        {
                            "type": "text",
                            "text": f"Contract Text:\n{context_excerpt}"
                        }
                    ]
                }
            ]

            chat_response = client.chat.complete(
                model=model,
                messages=messages,
                max_tokens=80,
            )

            if chat_response.choices:
                raw_output = chat_response.choices[0].message.content.strip()
                value, page = self._process_llm_output(
                    pages, raw_output, "termination_notice_period"
                )
                if value and self._is_uninformative_llm_answer(
                    value, "termination_notice_period"
                ):
                    return "Not specified", None
                return value, page
        except SDKError as e:
            logger.error(
                f"LLM fallback for termination_notice_period with Mistral failed: {e}"
            )
        except Exception as e:
            logger.error(
                f"An unexpected error occurred during LLM fallback for termination_notice_period: {e}"
            )
        return None, None

    # ------------------------------------------------------------------
    # Main Extraction Flow
    # ------------------------------------------------------------------
    def _extract_contract_basics(self, pages: List[PageText]) -> Dict[str, Any]:
        if not any(page.text.strip() for page in pages):
            return {"error": "Empty contract text provided."}

        try:
            preprocessed_pages = [
                PageText(
                    page_number=page.page_number,
                    text=self._preprocess_contract(page.text),
                )
                for page in pages
            ]
            raw_text = "\n".join(page.text for page in preprocessed_pages)

            # LLM Extraction for 4 fields only
            logger.info("Running LLM extraction for 4 fields...")
            llm_start_date, llm_start_page = self._get_start_date_with_llm(preprocessed_pages)
            llm_end_date, llm_end_page = self._get_end_date_with_llm(preprocessed_pages)
            llm_renewal_terms, llm_renewal_page = self._get_renewal_terms_with_llm(preprocessed_pages)
            (
                llm_termination_notice_period,
                llm_termination_page,
            ) = self._get_termination_notice_period_with_llm(preprocessed_pages)

            # Regex Extraction for all fields
            windows = self._generate_context_windows(preprocessed_pages, WindowConfig())
            all_hits: List[Tuple[str, str, Optional[int], str]] = []
            for w in windows:
                hits = self._extract_with_patterns(w.text)
                for k, v in hits.items():
                    all_hits.append((k, v, w.page_number, w.text))

            final_data = self._merge_window_results(all_hits, pages)

            # Prioritize LLM results for the 4 specific fields
            if llm_start_date and llm_start_date != "Not Found":
                final_data["start_date"] = ExtractionResult(
                    llm_start_date,
                    ExtractionSource.INFERENCE,
                    llm_start_page,
                    self._build_reference_snippet(pages, llm_start_date, llm_start_page),
                )

            if llm_end_date and llm_end_date != "Not Found":
                final_data["end_date"] = ExtractionResult(
                    llm_end_date,
                    ExtractionSource.INFERENCE,
                    llm_end_page,
                    self._build_reference_snippet(pages, llm_end_date, llm_end_page),
                )

            if llm_renewal_terms and llm_renewal_terms != "Not Found":
                final_data["renewal_terms"] = ExtractionResult(
                    llm_renewal_terms,
                    ExtractionSource.INFERENCE,
                    llm_renewal_page,
                    self._build_reference_snippet(
                        pages, llm_renewal_terms, llm_renewal_page
                    ),
                )

            if llm_termination_notice_period:
                final_data["termination_notice_period"] = ExtractionResult(
                    llm_termination_notice_period,
                    ExtractionSource.INFERENCE,
                    llm_termination_page,
                    self._build_reference_snippet(
                        pages,
                        llm_termination_notice_period,
                        llm_termination_page,
                    ),
                )

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
        self,
        hits: List[Tuple[str, str, Optional[int], str]],
        pages: List[PageText],
    ) -> Dict[str, ExtractionResult]:
        grouped: Dict[str, List[Tuple[str, Optional[int], str]]] = defaultdict(list)
        for key, val, page_num, context_text in hits:
            grouped[key].append((val, page_num, context_text))

        merged: Dict[str, ExtractionResult] = {}
        for key, entries in grouped.items():
            best_val, best_page, context_text = max(
                entries, key=lambda item: len(item[0])
            )
            merged[key] = ExtractionResult(
                best_val,
                ExtractionSource.REGEX,
                best_page,
                self._build_reference_snippet(
                    pages, best_val, best_page, fallback_text=context_text
                ),
            )

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
