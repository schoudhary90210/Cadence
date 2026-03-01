FROM python:3.11-slim

# System dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download NLTK data
RUN python -m nltk.downloader -d /usr/share/nltk_data cmudict

# Pre-download ML models during build (cached in image)
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('base.en', compute_type='int8')"
RUN python -c "from transformers import Wav2Vec2Model, Wav2Vec2FeatureExtractor; Wav2Vec2Model.from_pretrained('facebook/wav2vec2-base'); Wav2Vec2FeatureExtractor.from_pretrained('facebook/wav2vec2-base')"
RUN python -c "from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor; Wav2Vec2ForCTC.from_pretrained('facebook/wav2vec2-base-960h'); Wav2Vec2Processor.from_pretrained('facebook/wav2vec2-base-960h')"

# Copy application code
COPY . .

# Ensure ml_cache directory and classifier exist
RUN mkdir -p ml_cache audio_uploads

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
