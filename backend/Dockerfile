# --- Base image with Node and Python ---
FROM python:3.11-slim-bullseye

# --- Install ffmpeg and build tools ---
RUN apt-get update && apt-get install -y \
    ffmpeg \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# --- Set working directory ---
WORKDIR /app

# --- Copy Node files ---
COPY package*.json ./
RUN npm install

COPY . .

# --- Install Python dependencies ---
RUN pip install --no-cache-dir openai-whisper

# --- Expose the port ---
EXPOSE 5000

# --- Start Node server ---
CMD ["node", "index.js"]