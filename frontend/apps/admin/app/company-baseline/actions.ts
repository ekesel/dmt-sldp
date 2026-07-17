'use server';

import fs from 'fs/promises';
import path from 'path';

// The path to the shared company-baseline.json in the main app
// Using process.cwd() which in admin app should be frontend/apps/admin
const BASELINE_PATH = path.join(process.cwd(), '../app/constants/company-baseline.json');

export async function getBaseline() {
    try {
        const data = await fs.readFile(BASELINE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Failed to read company baseline:', e);
        // Fallback to absolute path just in case
        try {
            const fallbackPath = 'c:\\Users\\Divya Sharma\\Documents\\DMT\\dmt-sldp\\frontend\\apps\\app\\constants\\company-baseline.json';
            const data = await fs.readFile(fallbackPath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error('Fallback read also failed:', err);
            return null;
        }
    }
}

export async function updateBaseline(data: any) {
    try {
        data.last_updated = new Date().toISOString().split('T')[0];
        await fs.writeFile(BASELINE_PATH, JSON.stringify(data, null, 2), 'utf8');
        return { success: true };
    } catch (e) {
        console.error('Failed to update company baseline:', e);
         try {
            const fallbackPath = 'c:\\Users\\Divya Sharma\\Documents\\DMT\\dmt-sldp\\frontend\\apps\\app\\constants\\company-baseline.json';
            await fs.writeFile(fallbackPath, JSON.stringify(data, null, 2), 'utf8');
            return { success: true };
        } catch (err) {
            console.error('Fallback write also failed:', err);
            return { success: false, error: 'Failed to save baseline' };
        }
    }
}
