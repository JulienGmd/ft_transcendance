import asyncio
import requests
import websocket
import json
import ssl

import ssl
API_URL = "https://localhost:8080/api/user"
WS_URL = "wss://localhost:8080/api/game/ws"
NUM_CLIENTS = 51

def register_user(email, password, username):
    resp = requests.post(f"{API_URL}/register", json={
        "email": email,
        "password": password,
        "username": username
    }, verify=False)
    try:
        resp.raise_for_status()
        return resp.cookies
    except requests.HTTPError:
        print(f"[register_user] {resp.status_code} {resp.text}")
        raise

def login_user(email, password):
    resp = requests.post(f"{API_URL}/login", json={
        "email": email,
        "password": password
    }, verify=False)
    try:
        resp.raise_for_status()
        return resp.cookies
    except requests.HTTPError:
        print(f"[login_user] {resp.status_code} {resp.text}")
        raise

def play_game(user_id, cookies):
    cookie_header = "; ".join([f"{k}={v}" for k, v in cookies.items()])
    ws = None
    try:
        ws = websocket.create_connection(
            WS_URL,
            sslopt={"cert_reqs": ssl.CERT_NONE},
            header=[f"Cookie: {cookie_header}"]
        )
        ws.send(json.dumps({"type": "join_normal"}))
        while True:
            msg = ws.recv()
            data = json.loads(msg)
            if data.get("type") == "game_state":
                ws.send(json.dumps({"type": "input", "key": "up", "action": "press"}))
            if data.get("type") == "game_over":
                break
    except Exception as e:
        print(f"[User {user_id}] WebSocket error: {e}")
    finally:
        if ws:
            ws.close()
def main():
    import threading
    threads = []
    for i in range(NUM_CLIENTS):
        email = f"user{i}@test.com"
        password = "Testpass123"
        username = f"user{i}"
        cookies = login_user(email, password)
        t = threading.Thread(target=play_game, args=(i, cookies))
        t.start()
        threads.append(t)
    for t in threads:
        t.join()
if __name__ == "__main__":
    main()