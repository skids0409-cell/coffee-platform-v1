# Taxonomy Reconciliation Log — Supabase Staging

Audit date: 2026-08-26 UTC  
Project: `xusglaiwrpfcqhoerzyn`  
Mode: read-only SQL (`SELECT`/`WITH`, transaction read only)  
Deployment inspected: Version 52  
Gate result: **FAIL — reconciliation is required; no data mutation was performed.**

## Preservation result

| Assertion | Result |
|---|---:|
| Current `public.categories` rows | 59 |
| Pre-031 backup rows | 57 |
| Historical codes missing from current | 0 |
| Codes added since backup | 2 |
| Canonical parent orphans | 0 |
| Cyclic/unreachable rows | 0 |
| Duplicate codes | 0 |
| Duplicate slugs | 0 |

Added records are `EQP-WCS-ORG` and `EQP-WCS-PRT`. No historical category code is absent.

The live schema contains `public.categories`; it does not contain separate live tables named `taxonomy` or `subcategories`. Those terms are logical levels of the self-referencing category tree. The immutable comparison source is `step1_backup_20260825_pre031.categories`.

## Canonical depth profile

| Canonical level | Meaning | Count |
|---|---|---:|
| 1 | Root (`COF`, `EQP`) | 2 |
| 2 | Canonical parent family | 12 |
| 3 | Granular category | 44 |
| 4 | Nested granular category | 1 |

`EQP-ESP-WDT` is the only Level 4 row: `المعدات ← أدوات الإسبريسو ← أدوات توزيع البن ← أدوات WDT`. It is valid and reachable, but it does not conform to the requested strict three-level presentation. Its navigation projection is currently null, so the UI cannot present it as a Level 3 option without a future non-destructive mapping decision.

## Reconciliation blockers

### A. Granular records hidden from current Operations selectors (32)

The selectors in Add Record, Record Editor and Media Workspace filter source rows with `is_navigation_visible = true`. The following existing granular rows are therefore retained in the database but omitted from those selectors:

`EQP-BRW-CLD`, `EQP-BRW-FRP`, `EQP-BRW-IBR`, `EQP-BRW-INT`, `EQP-BRW-MOK`, `EQP-BRW-PHN`, `EQP-BRW-PRS`, `EQP-BRW-SIF`, `EQP-BRW-SYP`, `EQP-ESP-DSG`, `EQP-ESP-DST`, `EQP-ESP-KBX`, `EQP-ESP-MAT`, `EQP-ESP-MIL`, `EQP-ESP-MIR`, `EQP-ESP-PCK`, `EQP-ESP-PRT`, `EQP-ESP-TMP`, `EQP-ESP-WDT`, `EQP-FIL-CAP`, `EQP-FIL-CLT`, `EQP-FIL-MET`, `EQP-FIL-PAP`, `EQP-KET-ELE`, `EQP-KET-STV`, `EQP-MCH-TRK`, `EQP-MSR-REF`, `EQP-MSR-SCL`, `EQP-MSR-THM`, `EQP-SRV-SRV`, `EQP-SRV-THM`, `EQP-WCS-STR`.

Named historical examples confirmed intact but UI-hidden include:

- Turkish Ibrik/Jezve: `EQP-BRW-IBR` (`ركوة وجزوة`)
- WDT: `EQP-ESP-WDT` (`أدوات WDT`)
- Milk pitchers: `EQP-ESP-MIL` (`أباريق الحليب`)
- Turkish machines: `EQP-MCH-TRK` (`آلات القهوة التركية`)
- Manual/electric specialty grinders remain intact and visible: `EQP-GRD-MAN`, `EQP-GRD-ELE`

### B. Granular records missing a Level 2 catalog filter (14)

`EQP-ESP-DSG`, `EQP-ESP-DST`, `EQP-ESP-KBX`, `EQP-ESP-MAT`, `EQP-ESP-MIL`, `EQP-ESP-MIR`, `EQP-ESP-PCK`, `EQP-ESP-PRT`, `EQP-ESP-TMP`, `EQP-ESP-WDT`, `EQP-MCH-TRK`, `EQP-MSR-REF`, `EQP-MSR-THM`, `EQP-WCS-STR`.

These records have a family projection but no `catalog_filter_id`. Products assigned to them can appear in the family-wide catalog, but cannot be reached through any Level 2 sidebar filter.

### C. Published product omitted from every Level 2 filter (1)

| Product | Slug | Canonical category | Family | Filter |
|---|---|---|---|---|
| ماكينة قهوة تركية أوكا OK001 | `arzum-okka-ok001` | `EQP-MCH-TRK` | `EQP-MCH` | null |

### D. Semantically over-broad mapping requiring owner review (6)

The following non-dripper preparation methods are mapped to `EQP-BRW-DRP` (`أدوات التقطير`) in the current catalog projection:

- `EQP-BRW-CLD` — أدوات كولد برو
- `EQP-BRW-FRP` — فرنش بريس
- `EQP-BRW-IBR` — ركوة وجزوة
- `EQP-BRW-MOK` — موكا بوت
- `EQP-BRW-PRS` — مكابس يدوية
- `EQP-BRW-SYP` — سايفون

No automatic correction was made because the directive prohibits overwriting mappings and requires preservation of authoritative historical taxonomy.

## Test execution

| Check | Result |
|---|---|
| Production build | PASS |
| ESLint | PASS |
| Existing repository tests | PASS — 69/69 |
| Read-only database preservation assertions | PASS |
| Playwright browser installation | BLOCKED — browser CDN timed out in the restricted runner |
| Staging hostname from shell | BLOCKED — `EAI_AGAIN` DNS failure |
| Authenticated `/operations` Playwright checks | BLOCKED — `OPERATIONS_ADMIN_EMAIL` / `OPERATIONS_ADMIN_PASSWORD` unavailable |
| Zero omitted published equipment products | FAIL — `arzum-okka-ok001` has no Level 2 filter |

The Playwright suite is implemented and executable with:

```bash
SITES_BYPASS_TOKEN='***' \
OPERATIONS_ADMIN_EMAIL='staff@example.com' \
OPERATIONS_ADMIN_PASSWORD='***' \
npm run test:e2e:taxonomy
```

The suite deliberately fails when credentials are absent and when any published product has no Level 2 filter. It does not create, update, delete or archive data.

## Gate conclusion

Historical taxonomy preservation is verified. Full UI visibility, strict three-level presentation and public filter parity are not verified and are currently contradicted by the database projection. The requested “100% accurate and fully accessible” gate must remain closed until the 32 hidden entries, 14 missing filter mappings, the Level 4 WDT projection, and the one published Turkish-machine product omission are reconciled through an explicitly approved non-destructive mapping change.
