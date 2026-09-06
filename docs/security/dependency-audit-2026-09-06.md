# Dependency Security Audit — 2026-09-06

Ticket: #22 — Hardening: Dependency Security Audit before production
Base commit: `d14a953e3891b8cf9679bf85c374fe672c168b68`
Runtime: Node.js `24.19.0`, npm `11.17.0`

## Baseline

Exact `npm audit --json` against the committed `main` lockfile reported:

- total: 8
- low: 1
- high: 7
- critical: 0

Affected packages were:

- `next` — direct dependency, high; patched line available in `16.3.4` without a semver-major jump.
- `sharp` — transitive through Next, high.
- `postcss` — transitive, high.
- `browserslist` — transitive, high.
- `js-yaml` — transitive, high.
- `nanoid` — transitive, high.
- `brace-expansion` — transitive, high.
- `@babel/core` — transitive, low.

Representative advisories captured by the baseline audit included:

- Next.js middleware/proxy bypass, Server Action DoS/SSRF/cache confusion, SVG image-optimization DoS, and Server Function endpoint disclosure affecting the installed 16.2.6 line.
- `sharp`/libvips inherited vulnerabilities.
- PostCSS source-map/path traversal and file-disclosure advisories.
- Browserslist memory-growth/prototype-write advisories.
- js-yaml quadratic CPU advisories.
- nanoid infinite-loop edge cases.
- brace-expansion exponential/unbounded expansion DoS advisories.
- Babel sourceMappingURL arbitrary file-read advisory.

## Remediation

No `npm audit fix --force` was used.

Applied remediation:

1. Upgrade `next` from `16.2.6` to `16.3.4` using an exact version.
2. Upgrade `eslint-config-next` from `16.2.6` to `16.3.4` to keep the framework/tooling pair aligned.
3. Run standard `npm audit fix` to refresh remediable transitive dependencies within allowed dependency constraints.
4. Commit the resulting `package.json` and `package-lock.json` only.

Result after remediation:

```text
found 0 vulnerabilities
audit_total=0
```

The dependency set reduced from 361 installed packages in the old lockfile run to 357/358 audited packages in the remediated run while preserving the declared React, TypeScript, ESLint and Tailwind versions.

## Permanent prevention gate

The permanent Coffee Platform CI Quality Gate now runs:

```sh
npm audit --audit-level=low
```

immediately after `npm ci --include=dev`.

Any future low, moderate, high, or critical npm advisory in the committed dependency tree will therefore fail CI before lint/build/test/artifact completion.

## Acceptance status

- Baseline advisory set captured: PASS
- High-severity remediable advisories resolved: PASS
- Force/major upgrade avoided: PASS
- Lockfile reproducibility preserved: pending Clean-HEAD CI
- Dependency audit total: 0
- Lint/build/tests/platform conformance: pending Clean-HEAD CI and post-merge `main` CI

## Install-script note

The previous audit run also emitted npm `allow-scripts` warnings for dependency install scripts. Those warnings are not vulnerability findings. After the Next.js upgrade, the `sharp` warning disappeared from the remediation run; `unrs-resolver` remained as an install-script approval warning. This is tracked as package-install policy/hygiene rather than a security advisory and does not alter the `npm audit` result.
