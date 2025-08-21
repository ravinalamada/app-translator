# Base image: Node with Debian (includes npm & node)
FROM node:18-bullseye

# Install Python and ffmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and install Node deps
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Install Python Whisper
RUN pip3 install --no-cache-dir openai-whisper

# Expose port (Render uses $PORT)
EXPOSE 5000

# Start server
CMD ["npm", "start"]