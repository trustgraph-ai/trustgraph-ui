#!/usr/bin/env python3
"""
Quick websocket test client.

Usage:
    python ws-test.py '<request-json>' [output-file]

Connects to ws://localhost:8088/api/v1/socket, sends the request,
collects responses until one has "complete": true, and writes the
request + all responses to a JSON file for inspection.
"""

import asyncio
import json
import sys
from datetime import datetime, timezone

import websockets

WS_URL = "ws://localhost:8088/api/v1/socket"


async def run(request_json: str, output_path: str) -> None:
    request = json.loads(request_json)
    responses: list[dict] = []

    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps(request))

        while True:
            raw = await ws.recv()
            msg = json.loads(raw)
            responses.append(msg)
            if msg.get("complete") is True:
                break

    output = {
        "url": WS_URL,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request": request,
        "responses": responses,
        "response_count": len(responses),
    }

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {len(responses)} responses to {output_path}")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python ws-test.py '<request-json>' [output-file]", file=sys.stderr)
        sys.exit(1)

    request_json = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "ws-trace.json"

    asyncio.run(run(request_json, output_path))


if __name__ == "__main__":
    main()
