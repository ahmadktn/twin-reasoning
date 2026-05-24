from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_recommend():
    print("Sending POST request to /chat/recommend...")
    response = client.post("/chat/recommend", json={
        "persona_id": "test", 
        "messages": [{"role": "user", "content": "Hi"}],
        "top_k": 5
    })
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    test_recommend()
