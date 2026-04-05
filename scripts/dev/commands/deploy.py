"""Deploy commands for the dev CLI."""

from __future__ import annotations

import typer
from rich.console import Console

app = typer.Typer(help="Deployment commands.")
console = Console()


@app.callback(invoke_without_command=True)
def deploy(ctx: typer.Context) -> None:
    """Deploy this project."""
    if ctx.invoked_subcommand is None:
        console.print(
            "Deploy via fop: [bold cyan]fop deploy <project>[/bold cyan]"
        )
