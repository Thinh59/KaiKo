import re
import math
from collections import Counter

_cache = {}

def _tfidf_vector(text: str) -> dict:
    """Tạo vector TF-IDF đơn giản cho 1 đoạn text"""
    words = re.findall(r'\w+', text.lower())
    freq = Counter(words)
    total = sum(freq.values())
    return {w: c / total for w, c in freq.items()}

def _cosine_similarity(v1: dict, v2: dict) -> float:
    """Tính cosine similarity giữa 2 vector TF-IDF"""
    common = set(v1) & set(v2)
    if not common:
        return 0.0
    dot   = sum(v1[w] * v2[w] for w in common)
    norm1 = math.sqrt(sum(x**2 for x in v1.values()))
    norm2 = math.sqrt(sum(x**2 for x in v2.values()))
    return dot / (norm1 * norm2 + 1e-9)

def get_cached_score(topic: str, transcript_a: str, transcript_b: str,
                     threshold: float = 0.90):
    """Tra cache: nếu similarity > 90% → trả kết quả cũ"""
    query_text = f"{topic} {transcript_a} {transcript_b}"
    query_vec  = _tfidf_vector(query_text)

    for cached_key, cached_data in _cache.items():
        sim = _cosine_similarity(query_vec, cached_data["vector"])
        if sim >= threshold:
            print(f"[Cache HIT] similarity={sim:.3f}")
            return cached_data["result"]
    return None

def save_to_cache(topic: str, transcript_a: str, transcript_b: str, result: dict):
    """Lưu kết quả vào cache sau Cache Miss"""
    key_text = f"{topic} {transcript_a} {transcript_b}"
    import hashlib
    cache_key = hashlib.md5(key_text.encode()).hexdigest()
    _cache[cache_key] = {
        "vector": _tfidf_vector(key_text),
        "result": result
    }
    if len(_cache) > 500:
        oldest = next(iter(_cache))
        del _cache[oldest]
