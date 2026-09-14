FROM python:3.12-slim

RUN useradd --create-home --shell /usr/sbin/nologin sandbox
WORKDIR /srv

COPY sandbox/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY sandbox/app ./app

USER sandbox
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
