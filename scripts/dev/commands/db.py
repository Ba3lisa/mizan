"""Database commands."""

from __future__ import annotations

import typer

app = typer.Typer(help="Database commands.")


@app.command("seed")
def seed() -> None:
    """Seed the database with demo data."""
    typer.echo("Seeding database...")
    typer.echo("TODO: Run convex seed function")


@app.command("reset")
def reset() -> None:
    """Reset the database (clear all data)."""
    answer = typer.prompt("This will DELETE all data. Type 'yes' to confirm")
    if answer != "yes":
        typer.echo("Cancelled")
        raise typer.Exit(0)
    typer.echo("Resetting database...")
    typer.echo("TODO: Clear convex tables")


@app.command("clear")
def clear() -> None:
    """Clear specific tables."""
    typer.echo("TODO: Clear specific tables")
