import time
from typing import Any, Optional, Dict, Tuple
from backend.app.core.config import settings


class TTLCache:
    """Thread-safe, simple in-memory TTL cache."""

    def __init__(self, default_ttl: int = 1800, max_size: int = 1000):
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self.default_ttl = default_ttl
        self.max_size = max_size

    def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            return None
        val, expiry = self._cache[key]
        if time.time() > expiry:
            del self._cache[key]
            return None
        return val

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        if len(self._cache) >= self.max_size:
            # Evict expired or oldest
            now = time.time()
            expired_keys = [k for k, (_, exp) in self._cache.items() if now > exp]
            if expired_keys:
                for k in expired_keys:
                    del self._cache[k]
            else:
                # Remove 20% oldest entries
                keys_to_remove = list(self._cache.keys())[: max(1, self.max_size // 5)]
                for k in keys_to_remove:
                    del self._cache[k]

        expiration = time.time() + (ttl if ttl is not None else self.default_ttl)
        self._cache[key] = (value, expiration)

    def delete(self, key: str) -> bool:
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    def clear(self) -> None:
        self._cache.clear()


cache_service = TTLCache(default_ttl=settings.CACHE_TTL_SECONDS)
