import logging
import re
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class DateType(Enum):
    BINDING = "Binding"
    EXAMPLE = "Example"
    HISTORICAL = "Historical"
    CONDITIONAL = "Conditional"
    UNKNOWN = "Unknown"


@dataclass
class DateContext:
    date_type: DateType
    confidence: float
    supporting_text: str


class DateSemanticValidator:
    def __init__(self):
        # Binding date indicators
        self.binding_patterns = [
            r"\b(?:effective|commence|start|begin|binding|entered\s+into)\s+(?:as\s+of|on|from)\b",
            r"\b(?:term|agreement)\s+(?:shall\s+)?(?:commence|begin|start)\b",
            r"\beffective\s+date\b",
            r"\b(?:signed|executed)\s+on\b",
        ]

        # Example/hypothetical indicators
        self.example_patterns = [
            r"\b(?:for\s+(?:instance|example)|such\s+as|e\.?g\.?)\b",
            r"\b(?:assume|suppose|hypothetical)\b",
            r"\bif\s+(?:the\s+)?(?:date|agreement)\b",
        ]

        # Historical reference indicators
        self.historical_patterns = [
            r"\b(?:previously|formerly|prior)\s+(?:dated|effective)\b",
            r"\bwas\s+(?:effective|signed|dated)\b",
            r"\bold\s+(?:agreement|contract|date)\b",
        ]

        # Conditional indicators
        self.conditional_patterns = [
            r"\bif\s+(?:extended|renewed|terminated)\b",
            r"\bshould\s+the\s+date\b",
            r"\bunless\s+(?:extended|terminated)\b",
            r"\bprovided\s+that\b",
        ]

    def validate_date(self, date_match: str, context: str) -> DateContext:
        """Main validation method"""
        context_lower = context.lower()

        # Check each type with confidence scoring
        binding_score = self._check_binding(context_lower)
        example_score = self._check_example(context_lower)
        historical_score = self._check_historical(context_lower)
        conditional_score = self._check_conditional(context_lower)

        # Determine highest confidence type
        scores = [
            (DateType.BINDING, binding_score),
            (DateType.EXAMPLE, example_score),
            (DateType.HISTORICAL, historical_score),
            (DateType.CONDITIONAL, conditional_score),
        ]

        best_type, best_score = max(scores, key=lambda x: x[1])

        if best_score < 0.3:
            best_type = DateType.UNKNOWN
            best_score = 0.1

        return DateContext(
            date_type=best_type,
            confidence=best_score,
            supporting_text=context[:200] + "..." if len(context) > 200 else context,
        )

    def _check_binding(self, context: str) -> float:
        """Check for binding date indicators"""
        if re.search(
            r"is\s+made\s+and\s+entered\s+into\s+as\s+of\b", context, re.IGNORECASE
        ):
            return 1.0

        score = 0.0
        for pattern in self.binding_patterns:
            if re.search(pattern, context, re.IGNORECASE):
                score += 0.3

        # Boost for definitive language
        if re.search(r"\b(?:shall|will|must)\b", context):
            score += 0.2

        # Boost for dates with "day of"
        if re.search(r"\bday\s+of\b", context, re.IGNORECASE):
            score += 0.4

        return min(score, 1.0)

    def _check_example(self, context: str) -> float:
        """Check for example/hypothetical indicators"""
        score = 0.0
        for pattern in self.example_patterns:
            if re.search(pattern, context, re.IGNORECASE):
                score += 0.4
        return min(score, 1.0)

    def _check_historical(self, context: str) -> float:
        """Check for historical reference indicators"""
        score = 0.0
        for pattern in self.historical_patterns:
            if re.search(pattern, context, re.IGNORECASE):
                score += 0.4

        # Past tense boost
        if re.search(r"\b(?:was|were|had)\b", context):
            score += 0.2

        return min(score, 1.0)

    def _check_conditional(self, context: str) -> float:
        """Check for conditional indicators"""
        score = 0.0
        for pattern in self.conditional_patterns:
            if re.search(pattern, context, re.IGNORECASE):
                score += 0.3

        return min(score, 1.0)
