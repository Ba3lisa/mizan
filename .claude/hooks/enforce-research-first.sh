#!/bin/bash
# Block Edit/Write unless WebSearch/WebFetch was called first in this session
PPID_FILE="/tmp/claude-research-${PPID}.flag"
if [ ! -f "$PPID_FILE" ]; then
  echo "BLOCKED: Search the web or fetch docs first before writing code." >&2
  echo "Use WebSearch or WebFetch, then try again." >&2
  exit 2
fi
exit 0
