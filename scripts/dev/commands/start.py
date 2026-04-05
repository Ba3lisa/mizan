"""Dev server commands."""

from __future__ import annotations

import typer

app = typer.Typer(help="Dev server commands.")


@app.callback(invoke_without_command=True)
def start_callback(ctx: typer.Context) -> None:
    """Start the development servers (Convex + app)."""
    if ctx.invoked_subcommand is not None:
        return
    typer.echo("Starting dev servers...")
    typer.echo("TODO: Start Convex + app dev servers")


@app.command("stop")
def stop() -> None:
    """Stop all dev servers."""
    typer.echo("Stopping dev servers...")
    typer.echo("TODO: Stop dev servers")
