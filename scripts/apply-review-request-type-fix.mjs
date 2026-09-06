import fs from 'node:fs';

const path = 'app/api/admin/review/route.ts';
const source = fs.readFileSync(path, 'utf8');
const from = 'resolutionNote?: string; technicalReference?: string; overrideReason?: string;';
const to = 'resolutionNote?: string; technicalReference?: string; technicalTaskId?: string | null; overrideReason?: string;';
if (!source.includes(from)) throw new Error('review request type marker not found');
fs.writeFileSync(path, source.replace(from, to));
console.log('review request type updated');
