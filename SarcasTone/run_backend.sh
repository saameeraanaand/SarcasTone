#!/usr/bin/env bash
cd "$(dirname "$0")/backend" && python -m uvicorn app.main:app --port 8000 --reload
