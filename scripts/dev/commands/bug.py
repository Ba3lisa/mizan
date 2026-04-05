"""Bug tracking commands for the dev CLI."""

from __future__ import annotations

import json
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer(help="Bug tracking commands.")
console = Console()

BUGS_DIR = Path(".bugs")


@app.command("list")
def list_bugs() -> None:
    """List all tracked bugs."""
    if not BUGS_DIR.exists():
        console.print("[dim]No .bugs/ directory found. No bugs tracked yet.[/dim]")
        raise typer.Exit()

    bug_files = sorted(BUGS_DIR.glob("*.json"))
    if not bug_files:
        console.print("[dim]No bugs found.[/dim]")
        raise typer.Exit()

    table = Table(title="Bugs")
    table.add_column("ID", style="cyan")
    table.add_column("Title", style="white")
    table.add_column("Status", style="yellow")
    table.add_column("Severity", style="red")
    table.add_column("Created", style="dim")

    for bug_file in bug_files:
        try:
            data = json.loads(bug_file.read_text())
            table.add_row(
                data.get("id", bug_file.stem),
                data.get("title", "—"),
                data.get("status", "open"),
                data.get("severity", "—"),
                data.get("created", "—"),
            )
        except (json.JSONDecodeError, OSError):
            table.add_row(bug_file.stem, "[red]corrupt file[/red]", "—", "—", "—")

    console.print(table)


@app.command("fix")
def fix_bug(bug_id: str = typer.Argument(..., help="Bug ID to fix")) -> None:
    """Start fixing a bug (opens a Claude session via fop)."""
    console.print(
        f"Open a Claude session: [bold cyan]fop session start <project>[/bold cyan]"
    )
