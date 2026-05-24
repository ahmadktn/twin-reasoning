#!/bin/bash
set -e

# Create data directory if it doesn't exist
mkdir -p /app/data

echo "Checking datasets in /app/data..."

# Handle .gz files if the user manually provides them or if they want to explicitly rely on .gz
if [ -f "/app/data/All_beauty.jsonl.gz" ]; then
    echo "Found All_beauty.jsonl.gz, unzipping..."
    gunzip -f /app/data/All_beauty.jsonl.gz
fi
if [ -f "/app/data/All_Beauty.jsonl.gz" ]; then
    echo "Found All_Beauty.jsonl.gz, unzipping..."
    gunzip -f /app/data/All_Beauty.jsonl.gz
fi
if [ -f "/app/data/meta_All_Beauty.jsonl.gz" ]; then
    echo "Found meta_All_Beauty.jsonl.gz, unzipping..."
    gunzip -f /app/data/meta_All_Beauty.jsonl.gz
fi

# Download missing JSONL files directly from HuggingFace using Python (avoids missing curl/wget in slim image)
python -c "
import urllib.request
import os

files = {
    '/app/data/All_Beauty.jsonl': 'https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/resolve/main/raw/review_categories/All_Beauty.jsonl',
    '/app/data/meta_All_Beauty.jsonl': 'https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/resolve/main/raw/meta_categories/meta_All_Beauty.jsonl'
}

for path, url in files.items():
    if not os.path.exists(path):
        print(f'Downloading {path} from HuggingFace...')
        try:
            urllib.request.urlretrieve(url, path)
            print(f'Successfully downloaded {path}')
        except Exception as e:
            print(f'Failed to download {path}: {e}')
"

# Build FAISS index if missing
if [ ! -f "/app/data/items.faiss" ] && [ -f "/app/data/meta_All_Beauty.jsonl" ]; then
    echo "Building FAISS index..."
    python scripts/build_faiss_index.py || echo "FAISS index build failed."
fi

echo "Starting application..."
exec "$@"
