#!/usr/bin/env python3
import argparse
import os
import sys
import uuid
import requests
from dotenv import load_dotenv

# Ensure the project root directory is in the python path
# so that imports like 'from backend.graph import graph' work when run directly.
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Avoid Unicode Rupee sign (₹) console encoding crashes on Windows cp1252 terminal
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

load_dotenv()

try:
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel
    from rich.table import Table
    from rich.rule import Rule
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich import box as rich_box
    from rich.live import Live
    HAS_RICH = True
except ImportError:
    HAS_RICH = False

console = Console() if HAS_RICH else None
API_BASE = os.environ.get("API_BASE_URL", "http://localhost:8010")
PURPLE = "#6C4DFF"


def _banner():
    if HAS_RICH:
        console.print(
            Panel.fit(
                "[bold #6C4DFF]LaunchLens[/bold #6C4DFF]\n"
                "[dim]AI Market-Intelligence Agent - LangGraph[/dim]\n"
                "[dim]Fusing Google Demand & Amazon Supply Data[/dim]",
                border_style=PURPLE,
                padding=(1, 4),
            )
        )
    else:
        print("=" * 60)
        print("  LaunchLens  -  AI Market-Intelligence Agent")
        print("=" * 60)


def _print_response(text, title="LaunchLens Analyst"):
    if HAS_RICH:
        console.print(Rule(f"[bold {PURPLE}]{title}[/bold {PURPLE}]"))
        console.print(Markdown(text))
        console.print(Rule(style="dim"))
    else:
        d = "-" * 60
        print(f"\n{d}\n  {title}\n{d}")
        print(text)
        print(d)


def _print_error(msg):
    if HAS_RICH:
        console.print(f"[bold red]Error:[/bold red] {msg}")
    else:
        print(f"ERROR: {msg}", file=sys.stderr)


def _spinner(label):
    if HAS_RICH:
        return Progress(
            SpinnerColumn(spinner_name="dots", style=PURPLE),
            TextColumn(f"[dim]{label}[/dim]"),
            transient=True,
        )

    class _NoOp:
        def __enter__(self):
            print(label + "...")
            return self

        def __exit__(self, *_):
            pass

        def add_task(self, *a, **kw):
            return None

    return _NoOp()


def _invoke_graph(message, thread_id, stream=True):
    from backend.graph import graph

    config = {"configurable": {"thread_id": thread_id}}
    inputs = {"messages": [("user", message)]}

    if not stream:
        state = graph.invoke(inputs, config=config)
        msgs = state.get("messages", [])
        return msgs[-1].content if msgs else "No response received."

    full_content = []
    header_printed = False
    live = None

    try:
        # Stream message chunks in real-time
        for msg, metadata in graph.stream(inputs, config=config, stream_mode="messages"):
            node = metadata.get("langgraph_node", "")
            # Only stream text output from the core agent/analyst node
            if node == "agent" and msg.content:
                if not header_printed:
                    if HAS_RICH:
                        console.print(Rule(f"[bold {PURPLE}]LaunchLens Analyst[/bold {PURPLE}]"))
                        live = Live(Markdown(""), auto_refresh=True)
                        live.start()
                    else:
                        d = "-" * 60
                        print(f"\n{d}\n  LaunchLens Analyst\n{d}")
                    header_printed = True
                
                full_content.append(msg.content)
                current_text = "".join(full_content)
                
                if live:
                    live.update(Markdown(current_text))
                else:
                    print(msg.content, end="", flush=True)

        if live:
            live.stop()

    except Exception as e:
        # If connection/stream fails, clean up and raise
        if live:
            live.stop()
        if not header_printed:
            raise e

    if header_printed:
        if not HAS_RICH:
            print()  # Final newline for plain text
            print("-" * 60)
        else:
            # Print a closing dim rule (Live is stopped now)
            console.print(Rule(style="dim"))
    else:
        # Fallback to standard invoke if no streaming tokens were yielded
        state = graph.invoke(inputs, config=config)
        msgs = state.get("messages", [])
        content = msgs[-1].content if msgs else "No response received."
        _print_response(content)
        return content

    return "".join(full_content)


def _render_history(thread_id, messages, api_format=False):
    if HAS_RICH:
        console.print(Rule(f"[bold {PURPLE}]Session History - {thread_id}[/bold {PURPLE}]"))
    else:
        print(f"\n{'-'*60}\nSession: {thread_id}\n{'-'*60}")

    if not messages:
        if HAS_RICH:
            console.print("[dim]No messages found.[/dim]")
        else:
            print("No messages found.")
        return

    for msg in messages:
        if api_format:
            role = msg.get("role", "")
            content = msg.get("content", "")
        else:
            cls = msg.__class__.__name__
            role = {"HumanMessage": "user", "AIMessage": "assistant"}.get(cls, cls)
            content = getattr(msg, "content", str(msg))

        if not content:
            continue

        if role == "user":
            if HAS_RICH:
                console.print(f"\n[bold green]You[/bold green]: {content}")
            else:
                print(f"\nYou: {content}")
        elif role in ("assistant", "ai"):
            if HAS_RICH:
                console.print(f"\n[bold {PURPLE}]LaunchLens[/bold {PURPLE}]:")
                console.print(Markdown(content))
            else:
                print(f"\nLaunchLens:\n{content}")

    if HAS_RICH:
        console.print(Rule(style="dim"))
    else:
        print("-" * 60)


def _local_history(thread_id):
    try:
        from backend.graph import graph

        state = graph.get_state({"configurable": {"thread_id": thread_id}})
        msgs = state.values.get("messages", []) if state.values else []
        _render_history(thread_id, msgs)
    except Exception as e:
        _print_error(f"Could not load history: {e}")


def cmd_chat(args):
    _banner()
    thread_id = args.thread_id or str(uuid.uuid4())

    if HAS_RICH:
        console.print(f"\n[dim]Session ID: [bold]{thread_id}[/bold][/dim]")
        console.print(
            "[dim]Enter your product idea "
            "(e.g. 'smart yoga mat in India').\n"
            "Commands: [bold]exit[/bold] | [bold]quit[/bold] | [bold]history[/bold][/dim]\n"
        )
    else:
        print(f"\nSession ID: {thread_id}")
        print("Type your idea. Commands: exit, quit, history\n")

    while True:
        try:
            if HAS_RICH:
                user_input = console.input(
                    f"[bold {PURPLE}]Founder >[/bold {PURPLE}] "
                ).strip()
            else:
                user_input = input("Founder > ").strip()

            if not user_input:
                continue

            cmd = user_input.lower()

            if cmd in ("exit", "quit"):
                if HAS_RICH:
                    console.print("\n[yellow]Session saved. Good luck![/yellow]")
                    console.print(
                        f"[dim]Replay:[/dim] "
                        f"[bold]python backend/cli.py history {thread_id}[/bold]\n"
                    )
                else:
                    print(f"\nReplay: python backend/cli.py history {thread_id}")
                break

            if cmd == "history":
                _local_history(thread_id)
                continue

            with _spinner("Researching (Google Trends + Amazon)...") as prog:
                prog.add_task("", total=None) if HAS_RICH else None
                try:
                    response = _invoke_graph(user_input, thread_id, stream=True)
                except Exception as e:
                    _print_error(str(e))
                    continue

        except KeyboardInterrupt:
            if HAS_RICH:
                console.print(
                    f"\n\n[yellow]Interrupted.[/yellow] "
                    f"Resume: [bold]python backend/cli.py chat --thread-id {thread_id}[/bold]\n"
                )
            else:
                print(f"\nResume: python backend/cli.py chat --thread-id {thread_id}")
            break
        except Exception as e:
            _print_error(str(e))


def cmd_scan(args):
    idea = args.idea
    thread_id = str(uuid.uuid4())

    if HAS_RICH:
        console.print(
            Panel.fit(
                f"[bold]Scanning:[/bold] [{PURPLE}]{idea}[/{PURPLE}]\n"
                f"[dim]Session: {thread_id}[/dim]",
                border_style=PURPLE,
                padding=(0, 2),
            )
        )
    else:
        print(f"\nScanning: {idea}\nSession: {thread_id}")

    with _spinner("Analyzing...") as prog:
        prog.add_task("", total=None) if HAS_RICH else None
        try:
            response = _invoke_graph(idea, thread_id, stream=True)
        except Exception as e:
            _print_error(str(e))
            sys.exit(1)

    if args.output:
        try:
            with open(args.output, "w", encoding="utf-8") as fh:
                fh.write(response)
            if HAS_RICH:
                console.print(f"\n[green]Report saved to:[/green] {args.output}")
            else:
                print(f"\nSaved: {args.output}")
        except OSError as e:
            _print_error(f"Save failed: {e}")


def cmd_history(args):
    thread_id = args.thread_id

    try:
        from backend.graph import graph

        state = graph.get_state({"configurable": {"thread_id": thread_id}})
        msgs = state.values.get("messages", []) if state.values else []
        if msgs:
            _render_history(thread_id, msgs)
            return
    except Exception:
        pass

    try:
        resp = requests.get(f"{API_BASE}/api/history/{thread_id}", timeout=10)
        resp.raise_for_status()
        _render_history(thread_id, resp.json().get("history", []), api_format=True)
    except requests.exceptions.ConnectionError:
        _print_error(
            f"Cannot reach {API_BASE}.\n"
            "  Start the server: python backend/cli.py serve"
        )
        sys.exit(1)
    except Exception as e:
        _print_error(str(e))
        sys.exit(1)


def cmd_health(args):
    if HAS_RICH:
        console.print(
            Panel.fit("[bold]LaunchLens - Health Check[/bold]", border_style=PURPLE)
        )
    else:
        print("\n-- LaunchLens Health Check --")

    env_keys = {
        "OPENAI_API_KEY": os.environ.get("OPENAI_API_KEY"),
        "SERP_API_KEY": os.environ.get("SERP_API_KEY"),
        "OXYLABS_USERNAME": os.environ.get("OXYLABS_USERNAME"),
        "OXYLABS_PASSWORD": os.environ.get("OXYLABS_PASSWORD"),
    }

    if HAS_RICH:
        tbl = Table(box=rich_box.ROUNDED, border_style="dim", header_style="bold dim")
        tbl.add_column("Environment Variable", style="dim")
        tbl.add_column("Status", justify="center")
        for key, val in env_keys.items():
            tbl.add_row(key, "[green]Set[/green]" if val else "[red]Missing[/red]")
        console.print(tbl)
    else:
        for key, val in env_keys.items():
            print(f"  {key:30s}  {'OK' if val else 'MISSING'}")

    if HAS_RICH:
        console.print("\n[dim]Pinging API server...[/dim]")
    else:
        print("\nPinging API server...")

    try:
        r = requests.get(f"{API_BASE}/api/health", timeout=5)
        r.raise_for_status()
        data = r.json()
        if HAS_RICH:
            console.print(f"[green]CONNECTED[/green]  {API_BASE}")
            for k, v in data.items():
                icon = "[green]OK[/green]" if v else "[red]NO[/red]"
                console.print(f"  {icon}  {k}: {v}")
        else:
            print(f"  CONNECTED  {API_BASE}")
            for k, v in data.items():
                print(f"  {k}: {v}")
    except requests.exceptions.ConnectionError:
        msg = f"{API_BASE} is OFFLINE  (run: python backend/cli.py serve)"
        if HAS_RICH:
            console.print(f"[yellow]WARNING[/yellow]  {msg}")
        else:
            print(f"  OFFLINE  {msg}")
    except Exception as e:
        _print_error(str(e))


def cmd_serve(args):
    try:
        import uvicorn
    except ImportError:
        _print_error("uvicorn not installed. Run: pip install uvicorn")
        sys.exit(1)

    if HAS_RICH:
        console.print(
            Panel.fit(
                f"[bold {PURPLE}]LaunchLens API Server[/bold {PURPLE}]\n"
                f"[dim]http://{args.host}:{args.port}[/dim]\n"
                f"[dim]Docs: http://{args.host}:{args.port}/docs[/dim]",
                border_style=PURPLE,
            )
        )
    else:
        print(f"Starting: http://{args.host}:{args.port}")

    uvicorn.run(
        "backend.api:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )


def _build_parser():
    parser = argparse.ArgumentParser(
        prog="launchlens",
        description="LaunchLens - AI Market-Intelligence CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python backend/cli.py chat                              Interactive session
  python backend/cli.py chat --thread-id <uuid>           Resume previous session
  python backend/cli.py scan "smart yoga mat in India"    One-shot market scan
  python backend/cli.py scan "EV kit" -o report.md        Save scan to file
  python backend/cli.py history <thread-id>              View session history
  python backend/cli.py health                           Check keys + server
  python backend/cli.py serve                            Start API server
  python backend/cli.py serve --port 9000 --reload       Dev mode
""",
    )

    sub = parser.add_subparsers(dest="command", metavar="<command>")
    sub.required = True

    p = sub.add_parser("chat", help="Interactive market-intelligence REPL.")
    p.add_argument(
        "--thread-id",
        metavar="UUID",
        default=None,
        help="Resume a previous session by its thread ID.",
    )
    p.set_defaults(func=cmd_chat)

    p = sub.add_parser("scan", help="One-shot market scan.")
    p.add_argument("idea", metavar="IDEA", help="Product idea to analyse.")
    p.add_argument(
        "-o", "--output",
        metavar="FILE",
        default=None,
        help="Write report to a markdown file.",
    )
    p.set_defaults(func=cmd_scan)

    p = sub.add_parser("history", help="View session conversation history.")
    p.add_argument("thread_id", metavar="THREAD_ID", help="Session UUID.")
    p.set_defaults(func=cmd_history)

    p = sub.add_parser("health", help="Check API keys and server status.")
    p.set_defaults(func=cmd_health)

    p = sub.add_parser("serve", help="Start the FastAPI backend server.")
    p.add_argument("--host", default="0.0.0.0", help="Bind host (default: 0.0.0.0).")
    p.add_argument("--port", type=int, default=8010, help="Port (default: 8010).")
    p.add_argument(
        "--reload",
        action="store_true",
        help="Enable hot-reload on file changes (development mode).",
    )
    p.set_defaults(func=cmd_serve)

    return parser


def main():
    parser = _build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
