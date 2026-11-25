import time
import logging
from typing import Dict, List, Optional
from fastapi import Request, HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader, APIKeyQuery
from starlette.middleware.base import BaseHTTPMiddleware
from nepse_alert import config

logger = logging.getLogger("nepseradar.security")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
api_key_query = APIKeyQuery(name="api_key", auto_error=False)

# Track request timestamps per IP: {ip: [timestamp, ...]}
_ip_request_history: Dict[str, List[float]] = {}
_last_refresh_timestamp: float = 0.0


def verify_api_key(
    key_from_header: Optional[str] = Security(api_key_header),
    key_from_query: Optional[str] = Security(api_key_query)
) -> bool:
    """
    Validates API key if configured.
    If API_KEY is not set in environment, authentication is bypassed (dev mode).
    """
    configured_key = config.API_KEY
    if not configured_key:
        return True  # Open dev mode

    provided_key = key_from_header or key_from_query
    if not provided_key or provided_key != configured_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid or missing API Key. Set X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return True


def check_refresh_cooldown():
    """
    Enforces a cooldown on heavy scraper runs to prevent DDoS against external market portals.
    """
    global _last_refresh_timestamp
    now = time.time()
    elapsed = now - _last_refresh_timestamp
    cooldown = config.REFRESH_COOLDOWN_SECONDS
    if elapsed < cooldown:
        remaining = int(cooldown - elapsed)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Refresh cooldown active. Please wait {remaining} seconds before scraping again."
        )
    _last_refresh_timestamp = now


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Appends standard OWASP security headers to all responses.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-memory rate limiter per client IP.
    """
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Clean old records > 60s
        history = _ip_request_history.setdefault(client_ip, [])
        _ip_request_history[client_ip] = [t for t in history if now - t < 60.0]

        if len(_ip_request_history[client_ip]) >= config.RATE_LIMIT_PER_MINUTE:
            return HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {config.RATE_LIMIT_PER_MINUTE} requests per minute."
            )

        _ip_request_history[client_ip].append(now)
        return await call_next(request)
