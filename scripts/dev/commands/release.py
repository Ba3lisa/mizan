"""Release commands — create GitHub releases that trigger prod deploys."""

from __future__ import annotations

import subprocess
import sys
from datetime import datetime
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm

app = typer.Typer(help="Release management — create releases that deploy to prod.")
console = Console()

ROOT = Path(__file__).resolve().parents[3]


def _run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True, cwd=str(ROOT), **kwargs)


def _get_latest_tag() -> str | None:
    """Get the latest semver tag across ALL branches, not just reachable from HEAD."""
    # Fetch remote tags first to avoid stale local state
    _run(["git", "fetch", "--tags", "--quiet"])
    result = _run(["git", "tag", "--sort=-v:refname", "--list", "v*"])
    if result.returncode != 0 or not result.stdout.strip():
        return None
    return result.stdout.strip().split("\n")[0]


def _get_commits_since(tag: str | None) -> list[str]:
    if tag:
        result = _run(["git", "log", f"{tag}..HEAD", "--oneline", "--no-decorate"])
    else:
        result = _run(["git", "log", "--oneline", "--no-decorate", "-20"])
    return [line for line in result.stdout.strip().split("\n") if line]


@app.callback(invoke_without_command=True)
def release_callback(ctx: typer.Context) -> None:
    """Create a new release. Defaults to `./dev release create`."""
    if ctx.invoked_subcommand is None:
        create()


@app.command()
def create(
    bump: str = typer.Option(
        "patch",
        help="Version bump type: major, minor, or patch",
    ),
    dry_run: bool = typer.Option(False, "--dry-run", help="Show what would happen without creating the release"),
) -> None:
    """Create a new GitHub release that triggers a prod deploy."""

    # Check we're on main and clean
    branch = _run(["git", "branch", "--show-current"]).stdout.strip()
    if branch != "main":
        console.print(f"[red]Must be on main branch (currently on {branch})[/red]")
        raise typer.Exit(1)

    status = _run(["git", "status", "--porcelain"]).stdout.strip()
    if status:
        console.print("[red]Working directory not clean. Commit or stash changes first.[/red]")
        console.print(status)
        raise typer.Exit(1)

    # Ensure we're up to date
    _run(["git", "pull", "origin", "main"])

    # Calculate version
    latest = _get_latest_tag()
    if latest and latest.startswith("v"):
        parts = latest[1:].split(".")
        major, minor, patch = int(parts[0]), int(parts[1] if len(parts) > 1 else 0), int(parts[2] if len(parts) > 2 else 0)
    else:
        major, minor, patch = 0, 0, 0

    if bump == "major":
        major += 1; minor = 0; patch = 0
    elif bump == "minor":
        minor += 1; patch = 0
    else:
        patch += 1

    version = f"v{major}.{minor}.{patch}"

    # Get changelog
    commits = _get_commits_since(latest)
    if not commits:
        console.print("[yellow]No new commits since last release.[/yellow]")
        raise typer.Exit(0)

    changelog = "\n".join(f"- {c[8:]}" for c in commits)  # strip short hash
    date = datetime.now().strftime("%Y-%m-%d")

    console.print(Panel(
        f"[bold]{version}[/bold] ({date})\n\n{changelog}",
        title="Release Notes",
        border_style="cyan",
    ))

    if dry_run:
        console.print("[yellow]Dry run — no release created.[/yellow]")
        raise typer.Exit(0)

    if not Confirm.ask(f"Create release [bold cyan]{version}[/bold cyan] and deploy to prod?"):
        raise typer.Exit(0)

    # Bump package.json version
    import json
    pkg_path = APP_DIR / "package.json"
    pkg = json.loads(pkg_path.read_text())
    pkg["version"] = f"{major}.{minor}.{patch}"
    pkg_path.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + "\n")

    # Commit version bump
    _run(["git", "add", str(pkg_path)])
    _run(["git", "commit", "-m", f"chore: bump version to {version}"])
    _run(["git", "push", "origin", "main"])

    # Create the release via gh CLI
    result = subprocess.run(
        [
            "gh", "release", "create", version,
            "--title", f"Release {version}",
            "--notes", f"## {version} ({date})\n\n{changelog}",
            "--target", "main",
        ],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        console.print(f"[red]Failed to create release:[/red]\n{result.stderr}")
        raise typer.Exit(1)

    console.print(f"[green]Release {version} created![/green]")
    console.print("[dim]Deploy workflow will start automatically.[/dim]")
    console.print(f"\n[cyan]https://github.com/Ba3lisa/mizan/releases/tag/{version}[/cyan]")


@app.command()
def list() -> None:
    """List recent releases."""
    result = subprocess.run(
        ["gh", "release", "list", "--limit", "10", "--repo", "Ba3lisa/mizan"],
        cwd=str(ROOT),
    )
    if result.returncode != 0:
        console.print("[red]Failed to list releases.[/red]")


@app.command()
def status() -> None:
    """Show the deploy status of the latest release."""
    result = subprocess.run(
        ["gh", "run", "list", "--workflow", "deploy.yml", "--limit", "3", "--repo", "Ba3lisa/mizan"],
        cwd=str(ROOT),
    )
    if result.returncode != 0:
        console.print("[red]Failed to get deploy status.[/red]")
