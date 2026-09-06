import { readFileSync, writeFileSync } from "node:fs";
const path = "app/ui/admin/PendingAssetReviewConsole.tsx";
let s = readFileSync(path, "utf8");
for (const [before, after, label] of [
  ['  const [role, setRole] = useState("");\n', '', 'unused role state'],
  ['      setRole(result.role || "");\n', '', 'unused role hydrate'],
  ['{!canReview && <p className="mt-3 text-sm text-amber-800">', '{!capabilities.canDecide && <p className="mt-3 text-sm text-amber-800">', 'capability message gate'],
]) {
  if (!s.includes(before)) throw new Error(`missing marker: ${label}`);
  s = s.replace(before, after);
}
writeFileSync(path, s);
console.log("Pending asset review now consumes capability contract end-to-end");
