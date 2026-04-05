"""Infrastructure management commands."""

from __future__ import annotations

import subprocess
from pathlib import Path

import typer

app = typer.Typer(help="Infrastructure management commands.")

ROOT = Path(__file__).resolve().parents[3]
INFRA_DIR = ROOT / "infra"


@app.command("init")
def init() -> None:
    """Initialize Terraform."""
    typer.echo("Initializing Terraform...")
    subprocess.run(["terraform", "init"], cwd=str(INFRA_DIR))


@app.command("plan")
def plan() -> None:
    """Preview infrastructure changes."""
    typer.echo("Planning infrastructure changes...")
    subprocess.run(["terraform", "plan"], cwd=str(INFRA_DIR))


@app.command("apply")
def apply() -> None:
    """Apply infrastructure changes."""
    answer = typer.prompt("This will modify production infrastructure. Type 'yes' to confirm")
    if answer != "yes":
        typer.echo("Cancelled.")
        raise typer.Exit(0)
    subprocess.run(["terraform", "apply", "-auto-approve"], cwd=str(INFRA_DIR))


@app.command("status")
def status() -> None:
    """Show current infrastructure state."""
    subprocess.run(["terraform", "show"], cwd=str(INFRA_DIR))


@app.command("destroy")
def destroy() -> None:
    """Destroy all infrastructure."""
    answer = typer.prompt("This will DESTROY all production infrastructure. Type 'destroy' to confirm")
    if answer != "destroy":
        typer.echo("Cancelled.")
        raise typer.Exit(0)
    subprocess.run(["terraform", "destroy"], cwd=str(INFRA_DIR))
