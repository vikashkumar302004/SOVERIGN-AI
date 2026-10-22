FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN python -m pip install --upgrade pip \
    && python -m pip install -r requirements.txt

COPY . .
RUN addgroup --system sovereign \
    && adduser --system --ingroup sovereign sovereign \
    && mkdir -p uploaded_documents deliverables sandbox_temp temp_audio \
    && chown -R sovereign:sovereign /app \
    && chmod +x /app/docker-entrypoint.sh

USER sovereign
EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
