# Production execution model (Windows + Docker Compose)

## Goal

Provide a CI-safe, non-interactive, Windows-reliable way to run operational commands against PROD containers.

Key fact: Windows CMD quoting is unreliable for embedded code strings (e.g., `python -c "..."`), so we standardize on stdin-based execution for arbitrary snippets.

## Supported verbs

### 1) exec (simple argv only)

**Use when:**
- The command is a normal CLI invocation with ordinary arguments
- No embedded code strings, no nested quotes, no JSON payloads in arguments

**Rule:**
- If you need quotes-inside-quotes or long inline scripts, do **not** use `exec`.

### 2) pyc (official for arbitrary Python snippets)

Runs Python via `python -` and pipes code through stdin, which avoids CMD quoting loss.

**Use when:**
- Any inline Python snippet is needed
- You want to pass script-like logic (payload) rather than argv
- You need predictable behavior in CI (`docker compose exec -T`)

## Command matrix (authoritative)

| Task | Wrapper command form | Allowed verb | Why | CI-safe |
|---|---|---|---|---|
| Verify container Python | `prod-up.bat exec api python -V` | exec | simple argv | Yes |
| Verify app can import | `prod-up.bat exec api python -c "import app"` | **NOT SUPPORTED (use pyc)** | CMD drops code string | Yes via pyc |
| Arbitrary Python snippet | `prod-up.bat pyc api "<python code>" [args...]` | pyc | stdin avoids CMD quoting loss | Yes |
| Alembic current revision | `prod-up.bat exec api alembic current` | exec | simple argv | Yes |
| Alembic upgrade head | `prod-up.bat exec api alembic upgrade head` | exec | simple argv | Yes |
| Alembic downgrade (if needed) | `prod-up.bat exec api alembic downgrade -1` | exec | simple argv | Yes |
| DB quick inspection (SQLite) | `prod-up.bat pyc api "<python code that opens sqlite and prints>"` | pyc | payload/script | Yes |
| One-off data fix (Python) | `prod-up.bat pyc api "<python code>"` | pyc | payload/script | Yes |

## Policy

1. `exec` remains supported for operational CLI commands that do not require complex quoting.
2. `pyc` is the officially supported way to run arbitrary Python snippets in PROD.
3. If a task *looks like a payload* (script, SQL, JSON, multi-line logic), add a dedicated stdin-based verb rather than forcing it through `exec`.

## Non-goals (for now)

- Replacing `exec` with a PowerShell array-safe implementation.
- Supporting `python -c "..."` through `exec` on Windows CMD.

## DO / DON'T

**DO**
- Use `exec` for normal CLI commands (no embedded scripts)
- Use `pyc` for any inline Python, multi-step logic, or anything that would require nested quoting
- Prefer `python -m <tool>` inside `pyc` for tool invocations when quoting gets tricky

**DON'T**
- Don't use `exec` with `python -c ...` (blocked by design)
- Don't rely on interactive shells/TTY in production (we default to `-T`)
