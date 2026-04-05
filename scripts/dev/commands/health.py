"""Health check commands for the dev CLI."""

from __future__ import annotations

import typer
from rich.console import Console

app = typer.Typer(help="Health check commands.")
console = Console()


@app.callback(invoke_without_command=True)
def health(ctx: typer.Context) -> None:
    """Check project health."""
    if ctx.invoked_subcommand is None:
        console.print(
            "Health check via fop: [bold cyan]fop health check <project>[/bold cyan]"
        )
