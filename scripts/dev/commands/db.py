"""Database commands."""

from __future__ import annotations

import subprocess
from pathlib import Path

import typer

app = typer.Typer(help="Database commands.")

ROOT = Path(__file__).resolve().parents[3]
APP_DIR = ROOT / "app"


@app.command("seed")
def seed() -> None:
    """Seed the database with demo data."""
    typer.echo("🌱 Seeding database with Egyptian government data...")
    result = subprocess.run(
        ["npx", "convex", "run", "seedData:seed"],
        cwd=str(APP_DIR),
    )
    if result.returncode == 0:
        typer.echo("✅ Database seeded successfully!")
    else:
        typer.echo("❌ Seed failed. Is Convex dev running?", err=True)
        raise typer.Exit(code=1)


@app.command("reset")
def reset() -> None:
    """Reset the database (clear all data)."""
    answer = typer.prompt("⚠️  This will DELETE all data. Type 'yes' to confirm")
    if answer != "yes":
        typer.echo("Cancelled.")
        raise typer.Exit(0)
    typer.echo("Resetting database...")
    result = subprocess.run(
        ["npx", "convex", "import", "--replace", "--yes", "/dev/null"],
        cwd=str(APP_DIR),
        capture_output=True,
    )
    if result.returncode == 0:
        typer.echo("✅ Database reset.")
    else:
        typer.echo("❌ Reset failed.")
        raise typer.Exit(code=1)


@app.command("clear")
def clear(
    table: str = typer.Argument(help="Table name to clear"),
) -> None:
    """Clear a specific table."""
    typer.echo(f"Clearing table: {table}...")
    typer.echo("TODO: Implement per-table clear via Convex mutation")
