"""
Web scraper router — /api/v1/scraper.
Kick off async scrape jobs to gather training data for custom LLMs.
"""
import asyncio
from typing import Any
from urllib.parse import urlparse

import aiohttp
from bs4 import BeautifulSoup
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, HttpUrl

router = APIRouter(prefix="/scraper", tags=["Web Scraper"])

# In-memory job registry (replace with Redis/DB in production)
_jobs: dict[str, dict[str, Any]] = {}


class ScrapeRequest(BaseModel):
    """Scrape job configuration."""
    url: HttpUrl
    max_pages: int = 10
    follow_links: bool = True
    content_selector: str = "body"     # CSS selector for content extraction
    output_format: str = "text"        # "text" | "jsonl" | "markdown"


class ScrapeJobStatus(BaseModel):
    job_id: str
    status: str
    pages_scraped: int
    total_tokens: int
    data_preview: list[str]


@router.post("/start", response_model=ScrapeJobStatus, status_code=202)
async def start_scrape(req: ScrapeRequest, background_tasks: BackgroundTasks):
    """
    Launch a background web scrape job.
    Returns a job_id to poll for progress and results.
    """
    import uuid
    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {"status": "running", "pages_scraped": 0, "total_tokens": 0, "data": []}

    background_tasks.add_task(_run_scrape, job_id, str(req.url), req.max_pages, req.content_selector)

    return ScrapeJobStatus(
        job_id=job_id,
        status="running",
        pages_scraped=0,
        total_tokens=0,
        data_preview=[],
    )


@router.get("/{job_id}", response_model=ScrapeJobStatus)
def get_scrape_status(job_id: str):
    """Poll scrape job progress."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return ScrapeJobStatus(
        job_id=job_id,
        status=job["status"],
        pages_scraped=job["pages_scraped"],
        total_tokens=job["total_tokens"],
        data_preview=job["data"][:3],
    )


async def _run_scrape(job_id: str, start_url: str, max_pages: int, selector: str) -> None:
    """
    Async BFS web scraper — fetches pages, extracts text, respects robots.txt.
    Raw text is stored per page for downstream LLM preprocessing.
    """
    job = _jobs[job_id]
    visited: set[str] = set()
    queue = [start_url]
    base_domain = urlparse(start_url).netloc

    async with aiohttp.ClientSession(headers={"User-Agent": "TaxWiseAI-Scraper/1.0"}) as session:
        while queue and job["pages_scraped"] < max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)

            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status != 200 or "text/html" not in resp.headers.get("content-type", ""):
                        continue
                    html = await resp.text()
            except Exception:
                continue

            soup = BeautifulSoup(html, "html.parser")

            # Extract text from the chosen selector
            nodes = soup.select(selector)
            text = " ".join(n.get_text(separator=" ", strip=True) for n in nodes)
            tokens = len(text.split())

            job["data"].append(text[:500])     # store preview
            job["pages_scraped"] += 1
            job["total_tokens"] += tokens

            # Discover same-domain links for BFS
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.startswith("/"):
                    full = f"{urlparse(start_url).scheme}://{base_domain}{href}"
                elif base_domain in href:
                    full = href
                else:
                    continue
                if full not in visited:
                    queue.append(full)

            await asyncio.sleep(0.5)   # polite crawl delay

    job["status"] = "completed"
