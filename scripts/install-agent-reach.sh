#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${ROOT_DIR}/.agent-reach-venv"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if [[ "${AGENT_REACH_INSTALL:-1}" == "0" ]]; then
  echo "[agent-reach] install disabled by AGENT_REACH_INSTALL=0"
  exit 0
fi

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  echo "[agent-reach] python3 is unavailable; continuing without local Agent-Reach CLI"
  exit 0
fi

if [[ ! -x "${VENV_DIR}/bin/agent-reach" ]]; then
  echo "[agent-reach] creating isolated virtualenv"
  "${PYTHON_BIN}" -m venv "${VENV_DIR}" || {
    echo "[agent-reach] could not create virtualenv; continuing without local CLI"
    exit 0
  }

  "${VENV_DIR}/bin/python" -m pip install --disable-pip-version-check --upgrade pip >/dev/null 2>&1 || true
  "${VENV_DIR}/bin/python" -m pip install --disable-pip-version-check \
    "https://github.com/Panniantong/agent-reach/archive/main.zip" || {
      echo "[agent-reach] package install failed; continuing so the web deployment is not blocked"
      exit 0
    }
fi

echo "[agent-reach] validating production-safe installation"
"${VENV_DIR}/bin/agent-reach" install --env=server --safe || true
"${VENV_DIR}/bin/agent-reach" doctor || true

echo "[agent-reach] local capability layer ready at ${VENV_DIR}/bin/agent-reach"
