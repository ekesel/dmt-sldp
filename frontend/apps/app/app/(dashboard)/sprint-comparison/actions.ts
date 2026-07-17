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
        try {
            const fallbackPath = 'c:\\Users\\Divya Sharma\\Documents\\DMT\\dmt-sldp\\frontend\\apps\\app\\constants\\company-baseline.json';
            const data = await fs.readFile(fallbackPath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error('Fallback read also failed:', err);
            // Return a default object so the page doesn't crash
            return {
                name: "Company Baseline",
                kpis: {}
            };
        }
    }
}
