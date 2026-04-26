import re
from collections import Counter
import math

FILLER_WORDS = {
    'à', 'ừm', 'ờ', 'ơ', 'thì', 'là', 'mà', 'cũng', 'thôi',
    'kiểu như là', 'bạn biết đấy', 'thực ra thì', 'ý mình là',
    'nói chung là', 'tức là', 'như thế này', 'bạn hiểu không',
}

def remove_filler_words(text: str) -> str:
    """Xóa từ đệm không mang nghĩa trong transcript"""
    for phrase in sorted(FILLER_WORDS, key=len, reverse=True):
        text = re.sub(rf'\b{re.escape(phrase)}\b', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extractive_summarize(text: str, max_sentences: int = 10) -> str:
    """Tóm tắt trích xuất bằng TF-IDF đơn giản"""
    sentences = [s.strip() for s in re.split(r'[.!?]', text) if len(s.strip()) > 10]
    if len(sentences) <= max_sentences:
        return text

    word_freq = Counter()
    for sent in sentences:
        words = re.findall(r'\w+', sent.lower())
        word_freq.update(words)

    N = len(sentences)
    idf = {}
    for word in word_freq:
        doc_count = sum(1 for s in sentences if word in s.lower())
        idf[word] = math.log(N / (1 + doc_count))

    def score_sentence(sent):
        words = re.findall(r'\w+', sent.lower())
        if not words:
            return 0
        return sum(word_freq[w] * idf.get(w, 0) for w in words) / len(words)

    scored = sorted(enumerate(sentences), key=lambda x: score_sentence(x[1]), reverse=True)
    top_indices = sorted([i for i, _ in scored[:max_sentences]])
    return '. '.join(sentences[i] for i in top_indices)

def compress_transcript(text: str, max_words: int = 500) -> str:
    """Pipeline đầy đủ: xóa filler → tóm tắt nếu cần"""
    text = remove_filler_words(text)
    word_count = len(text.split())
    if word_count > max_words:
        text = extractive_summarize(text, max_sentences=10)
    return text
