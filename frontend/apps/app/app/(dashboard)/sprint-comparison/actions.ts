'use server';

import fs from 'fs/promises';
import path from 'path';

// The path to the shared company-baseline.json
// process.cwd() in app is frontend/apps/app
const BASELINE_PATH = path.join(process.cwd(), 'constants/company-baseline.json');

export async function getCompanyBaseline() {
    try {
        const data = await fs.readFile(BASELINE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Failed to read company baseline:', e);
        return {
            name: "Company Baseline",
            kpis: {}
        };
    }
}
