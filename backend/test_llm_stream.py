import asyncio
from app.llm_provider import get_llm_provider
from app.config import settings

async def test():
    print(f"Provider: {settings.LLM_PROVIDER}, Local: {settings.USE_LOCAL_LLM}")
    llm = get_llm_provider()
    print("Testing stream...")
    try:
        async for chunk in llm.stream("Say hello in 2 words.", max_tokens=10):
            print(f"Chunk: '{chunk}'")
        print("Done streaming.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
