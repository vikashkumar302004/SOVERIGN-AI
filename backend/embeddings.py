import os
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

import ipaddress
import json
import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"
_embedding_model = None


def get_model():
    global _embedding_model
    if _embedding_model is None:
        print(f"Initializing SentenceTransformer model '{MODEL_NAME}' in 100% OFFLINE mode...")
        _embedding_model = SentenceTransformer(MODEL_NAME, local_files_only=True)
        print(f"SentenceTransformer model '{MODEL_NAME}' loaded successfully.")
    return _embedding_model


def get_embedding(text: str) -> list[float]:
    if not text or not text.strip():
        text = "empty"
    model = get_model()
    vector = model.encode(text, convert_to_numpy=True)
    return vector.tolist()


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))
