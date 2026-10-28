import asyncio
import json
import httpx
import websockets

async def run_live_test():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # 1. Health check
        h = await client.get("/api/health")
        print("Health check status:", h.status_code, h.json())

        # 2. Start simulation
        start_resp = await client.post("/api/simulation/start", json={"total_bandwidth": 60.0, "random_seed": 42})
        print("Start status:", start_resp.status_code)
        session_id = start_resp.headers.get("x-session-id")
        print("Session ID:", session_id)

        # 3. Connect to WebSocket
        ws_url = f"ws://localhost:8000/ws/{session_id}"
        print("Connecting to WebSocket:", ws_url)
        async with websockets.connect(ws_url) as ws:
            for i in range(10):
                msg = await ws.recv()
                state = json.loads(msg)
                bl = state["baseline_result"]
                ai = state["ai_result"]
                rl = state["rl_result"]
                tick = state["tick"]
                print(f"Tick {tick}: Baseline Util={bl.get('utilization'):.1f}%, AI Util={ai.get('utilization'):.1f}%, RL Util={rl.get('utilization'):.1f}%")
                assert "utilization" in bl, "Missing utilization in baseline_result"
                assert "utilization" in ai, "Missing utilization in ai_result"
                assert "utilization" in rl, "Missing utilization in rl_result"

        # 4. Stop simulation
        stop_resp = await client.post("/api/simulation/stop", headers={"x-session-id": session_id})
        print("Stop status:", stop_resp.status_code)
        print("FULL-STACK WEBSOCKET INTEGRATION TEST PASSED!")

if __name__ == "__main__":
    asyncio.run(run_live_test())
