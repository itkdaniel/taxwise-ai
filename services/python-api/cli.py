"""
TaxWise AI CLI — Typer-based command-line interface.

Usage:
  python cli.py --help
  python cli.py serve
  python cli.py db migrate
  python cli.py scrape https://example.com --max-pages 20
  python cli.py train --model-id 1 --dataset https://example.com/data.jsonl

Run inside Docker:
  docker exec -it taxwise-python-api python cli.py <command>
"""
import typer
from rich.console import Console
from rich.table import Table

app_cli = typer.Typer(name="taxwise", add_completion=False, help="TaxWise AI CLI")
console = Console()


# ── Serve ──────────────────────────────────────────────────────────────────────
@app_cli.command()
def serve(
    host: str = typer.Option("0.0.0.0", help="Bind host"),
    port: int = typer.Option(8000, help="Bind port"),
    reload: bool = typer.Option(False, help="Enable hot-reload (dev only)"),
    workers: int = typer.Option(1, help="Number of worker processes"),
):
    """Start the FastAPI server via uvicorn."""
    import uvicorn
    console.print(f"[bold green]Starting TaxWise AI API on {host}:{port}[/]")
    uvicorn.run("main:app", host=host, port=port, reload=reload, workers=workers)


# ── DB management ──────────────────────────────────────────────────────────────
db_cli = typer.Typer(help="Database management commands")
app_cli.add_typer(db_cli, name="db")


@db_cli.command("migrate")
def db_migrate():
    """Run Alembic migrations (upgrade head)."""
    import subprocess
    console.print("[cyan]Running Alembic migrations…[/]")
    result = subprocess.run(["alembic", "upgrade", "head"], capture_output=True, text=True)
    console.print(result.stdout)
    if result.returncode != 0:
        console.print(f"[red]{result.stderr}[/]")
        raise typer.Exit(1)
    console.print("[green]Migrations complete.[/]")


@db_cli.command("seed")
def db_seed():
    """Insert sample data into the database."""
    from app.core.database import get_db
    from app.models.tax_return import TaxReturn
    console.print("[cyan]Seeding database…[/]")
    with get_db() as db:
        if db.query(TaxReturn).count() == 0:
            db.add(TaxReturn(user_id="cli-seed-user", tax_year=2024, filing_status="single"))
            console.print("[green]Seed data inserted.[/]")
        else:
            console.print("[yellow]Database already has data — skipping.[/]")


# ── Scraper ────────────────────────────────────────────────────────────────────
@app_cli.command()
def scrape(
    url: str = typer.Argument(..., help="Starting URL to scrape"),
    max_pages: int = typer.Option(10, help="Maximum pages to crawl"),
    output: str = typer.Option("output.jsonl", help="Output file path"),
):
    """
    Scrape a website and save extracted text as JSONL for LLM training.
    Respects a polite crawl delay between requests.
    """
    import asyncio, json
    from app.api.v1.scraper import _run_scrape
    job_id = "cli-scrape"
    import sys; sys.modules["__main__"].__dict__.setdefault("_jobs", {}); 
    from app.api.v1 import scraper as sc
    sc._jobs[job_id] = {"status": "running", "pages_scraped": 0, "total_tokens": 0, "data": []}

    console.print(f"[cyan]Scraping {url} (max {max_pages} pages)…[/]")
    asyncio.run(_run_scrape(job_id, url, max_pages, "body"))

    job = sc._jobs[job_id]
    console.print(f"[green]Done: {job['pages_scraped']} pages, {job['total_tokens']:,} tokens[/]")

    with open(output, "w") as f:
        for chunk in job["data"]:
            f.write(json.dumps({"text": chunk}) + "\n")
    console.print(f"[green]Saved to {output}[/]")


# ── LLM training ───────────────────────────────────────────────────────────────
@app_cli.command()
def train(
    model_id: int = typer.Option(..., help="LLM model registry ID"),
    dataset: str = typer.Option(..., help="Dataset URL or local path"),
    epochs: int = typer.Option(3, help="Training epochs"),
):
    """Trigger a fine-tuning job for the specified model."""
    import httpx
    from app.core.config import get_settings
    settings = get_settings()
    console.print(f"[cyan]Triggering training for model {model_id}…[/]")
    try:
        r = httpx.post(
            f"http://{settings.host}:{settings.port}/api/v1/llm-models/{model_id}/train",
            json={"dataset_source": dataset, "epochs": epochs},
        )
        console.print(r.json())
    except Exception as exc:
        console.print(f"[red]Error: {exc}[/]")
        raise typer.Exit(1)


# ── Status ────────────────────────────────────────────────────────────────────
@app_cli.command()
def status():
    """Show service health and configuration summary."""
    from app.core.config import get_settings
    s = get_settings()
    table = Table(title="TaxWise AI Service Status")
    table.add_column("Setting", style="cyan")
    table.add_column("Value")
    table.add_row("Environment", s.app_env)
    table.add_row("Debug", str(s.debug))
    table.add_row("DB URL", s.database_url[:40] + "…")
    table.add_row("Redis", s.redis_url)
    table.add_row("LLM Service", s.llm_service_url)
    console.print(table)


if __name__ == "__main__":
    app_cli()
