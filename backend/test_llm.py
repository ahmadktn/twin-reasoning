import asyncio
from app.llm_provider import get_llm_provider
from app.config import settings

async def test():
    print(f"Provider: {settings.LLM_PROVIDER}, Local: {settings.USE_LOCAL_LLM}")
    llm = get_llm_provider()
    print("Sending prompt...")
    try:
        reply = await llm.generate("Say hello in 2 words.", max_tokens=10)
        print(f"Reply: {reply}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
