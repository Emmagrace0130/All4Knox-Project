# Rules of Engagement — shared infrastructure

**Audience:** anyone (human or AI agent) working on All4Knox on the `viridian`
server.
**Read this before running any `docker` command.**

`viridian` is a **shared research server**. At the time of writing it runs
**100 containers across roughly 40 unrelated projects** belonging to other
students and researchers. Several are long-running experiments that have been
up for weeks. A careless command here does not break your work — it breaks
someone else's, silently, and they may not notice for days.

---

## 1. The one rule

> **Touch only what is named `all4knox-*` or defined in this repo's
> `docker-compose.yml`.**

Everything else on this box belongs to someone else.

---

## 2. Commands that are never acceptable

These are not "be careful" commands. They are **never** to be run on this host.

| Command | Why |
| --- | --- |
| `docker system prune` (any flags) | Deletes other projects' stopped containers, images, networks and build cache. There are ~98 non-running containers here that other people may still need. |
| `docker volume prune` | Destroys other projects' databases. |
| `docker network prune` | Removes `viridian_network`, taking every public site on this box offline. |
| `docker stop $(docker ps -q)` | Stops all 100 containers. |
| `docker kill`/`restart`/`rm` on a container you did not create | Someone else's running experiment. |
| Editing `nginx-proxy`'s generated config by hand | It is regenerated from container labels; your edit is lost and may break other vhosts in the meantime. |
| `systemctl restart docker` | Restarts every container on the box. |
| Restarting or stopping `ollama` (host service, PID from `pgrep ollama`) | Shared by several projects. Unloading a model mid-inference breaks their runs. |

**Safe equivalents, scoped to this project only:**

```bash
cd /home/gerald/GITS_REPOS/GIT_PLAY_GROUNDs/All4Knox-Project

docker compose ps                 # our two containers
docker compose logs -f api        # our logs
docker compose up -d --build      # rebuild + restart ours
docker compose restart api        # restart ours
docker compose down               # stop ours (keeps the vector-store volume)
```

Never add `-v` to `docker compose down` unless you intend to delete the vector
index. It is rebuildable, but rebuilding costs an Ollama round-trip on next
boot.

---

## 3. Ports

Host ports are a shared, exhaustible resource. **~70 are already in use.**

| Service | Host port | Binding | Notes |
| --- | --- | --- | --- |
| `all4knox-api` | `8410` | `127.0.0.1` only | Debugging door. Not public. |
| `all4knox-web` | `8411` | `127.0.0.1` only | Public traffic arrives via `nginx-proxy`, not this port. |

Both are deliberately bound to `127.0.0.1` rather than `0.0.0.0`. On a shared
machine, publishing on all interfaces exposes an unauthenticated internal API
to anyone who can reach the host.

**Before claiming a new port**, check it is free — including ports reserved by
*stopped* containers, which will collide when their owner restarts them:

```bash
{ ss -tln | grep -oP ':\K[0-9]+(?=\s)'
  docker ps -a --format '{{.Ports}}' | grep -oP ':\K[0-9]+(?=->)'
} | sort -un | grep -x <PORT> && echo "IN USE" || echo "free"
```

Ports confirmed free for All4Knox expansion on 2026-08-30: `8412`, `8420`,
`8421`, `8422`.

---

## 4. Networks

```yaml
networks:
  all4knox-net:            # private to this stack — create/destroy freely
  viridian_network:        # SHARED — external: true, NEVER redefine or prune
    external: true
```

`viridian_network` (`10.10.0.0/24`) is the bridge `nginx-proxy` uses to reach
every public site on this box. This repo joins it; it does not own it.

Only `all4knox-web` joins `viridian_network`. `all4knox-api` stays on the
private network, so the clinical API is reachable only through the paths nginx
explicitly proxies — it is not exposed to the internet.

---

## 5. Public hostnames and TLS

The edge is `nginx-proxy` (`nginxproxy/nginx-proxy`) on `:80`/`:443`, paired
with `nginx-proxy-acme` (`nginxproxy/acme-companion`) for Let's Encrypt. You
never configure them directly. You declare intent with environment variables on
your own container and they do the rest:

```yaml
environment:
  VIRTUAL_HOST: all4knox.axiomsystemslab.com
  VIRTUAL_PORT: "80"
  LETSENCRYPT_HOST: all4knox.axiomsystemslab.com
  LETSENCRYPT_EMAIL: <an address that should receive expiry warnings>
```

### The DNS precondition

**Every name in `LETSENCRYPT_HOST` must already resolve to `160.36.100.65`
before the container starts.** Let's Encrypt validates over HTTP-01 by
fetching a token from the name. If the name does not point here, issuance
fails.

```bash
getent hosts <hostname>          # must show 160.36.100.65
```

This is not a formality — it is why the original documented hostname does not
work yet. `rubyrecon.com` has a **wildcard** `*.rubyrecon.com` record pointing
at a parking host (`207.207.210.36/.23/.50`). Sibling projects work because each
has an **explicit** A record overriding the wildcard. `all4knox.rubyrecon.com`
has no such record, so it resolves off-server.

### Let's Encrypt rate limits

**5 duplicate certificates per week, per exact set of names.** Do not
repeatedly recreate the container to "retry" a cert. Diagnose first:

```bash
docker logs nginx-proxy-acme --tail 50
```

Failed validations also count toward a separate failure limit. If DNS is wrong,
fix DNS — do not retry.

---

## 6. The GPU and Ollama

Two NVIDIA L40S (46 GB each), shared. Ollama runs as a **host service** on
`:11434`, not a container, and several projects use it.

- **Do not stop, restart or reconfigure Ollama.**
- **Do not `ollama rm` a model.** You did not pull all of them and you cannot
  tell whose run depends on one.
- Pulling a *new* model is acceptable but consumes shared disk — prefer the 60+
  already present (`curl -s localhost:11434/api/tags`).
- Check GPU headroom before a large job: `nvidia-smi`.
- `gpt-oss:20b` (~13.8 GB) is loaded on demand and evicted by Ollama on its own
  schedule. A cold load takes several seconds — warm it before a demo (§7).

---

## 7. Before a live demo

```bash
# 1. containers healthy
docker compose ps

# 2. public URL + valid TLS
curl -sS -o /dev/null -w '%{http_code} tls=%{ssl_verify_result}\n' \
  https://all4knox.axiomsystemslab.com/

# 3. API through the proxy
curl -sS https://all4knox.axiomsystemslab.com/api/health

# 4. assistant ready (index built, Ollama reachable)
curl -sS https://all4knox.axiomsystemslab.com/api/assistant/status

# 5. WARM THE MODEL — first call after eviction is slow and looks broken
curl -sS -X POST https://all4knox.axiomsystemslab.com/api/assistant/ask \
  -H 'Content-Type: application/json' \
  -d '{"question":"How should I interpret BUP positive with fentanyl?"}' >/dev/null
```

Run step 5 within ten minutes of presenting.

---

## 8. Secrets

- `.env` is **gitignored** and mode `600`. It never enters git.
- `.env.example` is committed and must contain **no real values**.
- If a credential is ever committed, rotating it is mandatory — removing the
  commit is not sufficient, the value is in the reflog and on any clone.
- Do not paste credentials into logs, issues, or agent transcripts.

---

## 9. Courtesy

- The API runs 2 uvicorn workers, not 8. Deterministic endpoints are trivial;
  more workers would take memory from neighbours for no gain.
- Keep long GPU jobs off the box during others' working hours where possible.
- If you must touch shared infrastructure, tell the other developer first.
  Currently: **Gerald Jones** and **Emma** (repo owner).
