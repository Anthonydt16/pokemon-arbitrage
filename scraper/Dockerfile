FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Lance le scraper en continu (toutes les 15 min via schedule)
CMD ["python", "main.py"]
