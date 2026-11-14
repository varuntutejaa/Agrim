"""Pluggable alert sender. Safe by default.

ALERT_CHANNEL (in .env):
  console  (default)  writes the alert to the server log; nothing leaves the server
  twilio              Twilio SMS, sandbox use only (see below)

Safety rules:
  - Recipients come only from the server's environment (ALERT_TEST_NUMBERS),
    never from a request, so the API can't be used to text arbitrary people.
  - With no test numbers set, Twilio refuses to send.
  - Numbers are masked in logs and responses (•••• 1234).
  - A timeout or server error counts as "unknown" (the SMS may have gone out)
    and is never retried automatically.
Never put real citizens' numbers in ALERT_TEST_NUMBERS for the demo.
"""
import base64
import logging
import os

import requests

log = logging.getLogger("agrim.alerts")


def mask(number: str) -> str:
    digits = "".join(ch for ch in number if ch.isdigit())
    return f"•••• {digits[-4:]}" if digits else "••••"


def channel() -> str:
    return os.getenv("ALERT_CHANNEL", "console").strip().lower() or "console"


def test_numbers() -> list[str]:
    return [n.strip() for n in os.getenv("ALERT_TEST_NUMBERS", "").split(",") if n.strip()]


def send(text: str) -> list[dict]:
    """Send one message to the configured audience. Returns one result per recipient."""
    if channel() == "twilio":
        return _twilio(text)
    log.warning("[ALERT console] %s", text)
    return [{"channel": "console", "to": "server log", "status": "logged", "detail": None}]


def _twilio(text: str) -> list[dict]:
    sid, token, sender = (os.getenv(k, "") for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"))
    numbers = test_numbers()
    if not (sid and token and sender):
        return [{"channel": "twilio", "to": "-", "status": "not_configured", "detail": "Twilio keys missing"}]
    if not numbers:
        return [{"channel": "twilio", "to": "-", "status": "refused", "detail": "ALERT_TEST_NUMBERS is empty"}]
    auth = base64.b64encode(f"{sid}:{token}".encode()).decode()
    out = []
    for to in numbers:
        try:
            r = requests.post(f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                              data={"To": to, "From": sender, "Body": text},
                              headers={"Authorization": f"Basic {auth}"}, timeout=15)
            if r.ok:
                status, detail = "sent", r.json().get("sid")
            elif r.status_code >= 500:
                status, detail = "unknown", f"Twilio {r.status_code}"
            else:
                status, detail = "failed", r.json().get("message", f"Twilio {r.status_code}")
        except requests.RequestException as err:
            status, detail = "unknown", type(err).__name__
        out.append({"channel": "twilio", "to": mask(to), "status": status, "detail": detail})
        log.warning("[ALERT twilio] %s -> %s", mask(to), status)
    return out
