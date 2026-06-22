// Data ingestion: read CSVs, clean, and cache in memory.
// Pure JS equivalent of Python data_service.py (replaces pandas).

import { createReadStream } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse';
import { Readable } from 'stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../../data/raw');

const _cache = {};

// ── helpers ──────────────────────────────────────────────────────
function parseNum(v) {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
}

function median(arr) {
    const sorted = arr.filter(v => v != null && isFinite(v)).sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function loadCsv(filepath) {
    return new Promise((ok, fail) => {
        const rows = [];
        createReadStream(filepath)
            .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, bom: true }))
            .on('data', row => rows.push(row))
            .on('end', () => ok(rows))
            .on('error', fail);
    });
}

// Convert all string fields to numbers where possible
function coerceToNumber(rows, col) {
    for (const row of rows) {
        row[col] = parseNum(row[col]);
    }
}

// Fill null/NaN values in a numeric column with the column median
function fillWithMedian(rows, col) {
    const vals = rows.map(r => r[col]).filter(v => v != null && isFinite(v));
    const med = median(vals);
    for (const row of rows) {
        if (row[col] == null || !isFinite(row[col])) row[col] = med;
    }
}

// ── Main dataset ─────────────────────────────────────────────────
async function loadMain() {
    if (_cache.main) return _cache.main;

    // Try reading from MongoDB first
    try {
        const { getDb } = await import('../db.js');
        const db = getDb();
        const dbRows = await db.collection('employees').find({}).project({_id: 0}).toArray();
        if (dbRows && dbRows.length > 0) {
            _cache.main = dbRows;
            return dbRows;
        }
    } catch (err) {
        console.error('[WARN] Failed to read employees from MongoDB, falling back to CSV:', err.message);
    }

    const rows = await loadCsv(resolve(DATA_DIR, 'employee_ml_dataset_v3.csv'));

    // Coerce all numeric-looking columns
    const sample = rows[0] || {};
    const numericCols = Object.keys(sample).filter(k => !isNaN(parseFloat(sample[k])));
    for (const col of numericCols) {
        coerceToNumber(rows, col);
    }

    // Specific cleaning — mirrors notebook pre-processing
    for (const col of ['EngagementScore', 'BurnoutRiskScore']) {
        if (col in (rows[0] || {})) {
            for (const row of rows) {
                if (row[col] != null && row[col] < 0) row[col] = null;
            }
        }
    }
    for (const col of ['DaysSinceLastTraining', 'YearsSinceLastRaise']) {
        if (col in (rows[0] || {})) {
            for (const row of rows) {
                if (row[col] === 9999) row[col] = null;
            }
        }
    }

    // Fill numeric nulls with column medians
    for (const col of numericCols) {
        fillWithMedian(rows, col);
    }

    // Fill any remaining nulls with 0
    for (const row of rows) {
        for (const k of Object.keys(row)) {
            if (row[k] == null) row[k] = 0;
        }
    }

    _cache.main = rows;
    return rows;
}

// ── IBM Attrition dataset ─────────────────────────────────────────
async function loadIbm() {
    if (_cache.ibm) return _cache.ibm;

    // Try reading from MongoDB first
    try {
        const { getDb } = await import('../db.js');
        const db = getDb();
        const dbRows = await db.collection('ibm_attrition').find({}).project({_id: 0}).toArray();
        if (dbRows && dbRows.length > 0) {
            _cache.ibm = dbRows;
            return dbRows;
        }
    } catch (err) {
        console.error('[WARN] Failed to read ibm_attrition from MongoDB, falling back to CSV:', err.message);
    }

    const rows = await loadCsv(resolve(DATA_DIR, 'HR-Employee-Attrition.csv'));

    const sample = rows[0] || {};
    const numericCols = Object.keys(sample).filter(k => !isNaN(parseFloat(sample[k])));
    for (const col of numericCols) {
        coerceToNumber(rows, col);
    }

    for (const row of rows) {
        for (const k of Object.keys(row)) {
            if (row[k] == null) row[k] = 0;
        }
    }

    _cache.ibm = rows;
    return rows;
}

// ── Public API ────────────────────────────────────────────────────
export async function getMainDf(department = null) {
    let rows = await loadMain();
    if (department) {
        rows = rows.filter(r => r['Department'] === department);
    }
    return [...rows];
}

export async function getIbmDf(department = null) {
    let rows = await loadIbm();
    if (department) {
        // Fallback in case IBM dataset doesn't have exact same 'Department' casing
        rows = rows.filter(r => r['Department'] === department);
    }
    return [...rows];
}

function sanitizeRecords(records) {
    return records.map(rec => {
        const row = {};
        for (const [k, v] of Object.entries(rec)) {
            if (typeof v === 'number' && (!isFinite(v) || isNaN(v))) row[k] = null;
            else row[k] = v;
        }
        return row;
    });
}

export async function getEmployeeList({ department, search } = {}) {
    let rows = await getMainDf();
    if (department) rows = rows.filter(r => r['Department'] === department);
    if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(r =>
            String(r['EmployeeID']).toLowerCase().includes(q) ||
            String(r['JobTitle']).toLowerCase().includes(q) ||
            String(r['Department']).toLowerCase().includes(q)
        );
    }
    return sanitizeRecords(rows.slice(0, 200));
}

export async function getEmployeeById(empId) {
    const rows = await getMainDf();
    const row = rows.find(r => String(r['EmployeeID']) === String(empId));
    if (!row) return null;
    return sanitizeRecords([row])[0];
}

export async function getDepartments() {
    const rows = await getMainDf();
    const depts = [...new Set(rows.map(r => r['Department']))].sort();
    return depts;
}

// Preload both datasets at startup so first API calls don't block
export async function preload() {
    await loadMain();
    await loadIbm();
    console.log('[OK] Datasets loaded into memory');
}

// ── Upload support ────────────────────────────────────────────────

const REQUIRED_MAIN_COLS = [
    'EmployeeID', 'Department', 'JobTitle', 'Gender', 'Salary',
    'TenureYears', 'PerformanceRating', 'AbsenceDays_Last6M',
    'EngagementScore', 'AttritionFlag',
];

const OPTIONAL_MAIN_COLS = [
    'HighPerformerFlag', 'EarlyTenureFlag', 'AbsenceFrequency_Last6M',
    'LongLeaveFlag', 'HighAbsenceFlag', 'AvgOverallScore', 'LastOverallScore',
    'AvgCommunication', 'AvgTeamwork', 'AvgProblemSolving',
    'PerformanceDropFlag', 'TrainingCount', 'DaysSinceLastTraining',
    'NoTrainingFlag', 'YearsSinceLastRaise', 'SalaryChangeCount',
    'PayStagnationFlag', 'CareerStagnationFlag', 'BurnoutRiskScore',
];

/** Parse a CSV buffer into rows */
export function parseCsvBuffer(buffer) {
    return new Promise((ok, fail) => {
        const rows = [];
        const stream = Readable.from(buffer);
        stream
            .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, bom: true }))
            .on('data', row => rows.push(row))
            .on('end', () => ok(rows))
            .on('error', fail);
    });
}

/** Validate headers against required/optional columns */
export function validateMainColumns(headers) {
    const headerSet = new Set(headers);
    const found = REQUIRED_MAIN_COLS.filter(c => headerSet.has(c));
    const missing = REQUIRED_MAIN_COLS.filter(c => !headerSet.has(c));
    const optionalFound = OPTIONAL_MAIN_COLS.filter(c => headerSet.has(c));
    const optionalMissing = OPTIONAL_MAIN_COLS.filter(c => !headerSet.has(c));
    const extra = headers.filter(c => !REQUIRED_MAIN_COLS.includes(c) && !OPTIONAL_MAIN_COLS.includes(c));
    return { found, missing, optionalFound, optionalMissing, extra, valid: missing.length === 0 };
}

/** Preprocess raw rows — same pipeline as loadMain but also fills missing optional columns */
export function preprocessRaw(rows) {
    // Add default values for missing optional columns
    const sample = rows[0] || {};
    for (const col of OPTIONAL_MAIN_COLS) {
        if (!(col in sample)) {
            // Derive smart defaults where possible
            for (const row of rows) {
                if (col === 'HighPerformerFlag') {
                    row[col] = (parseNum(row['PerformanceRating']) >= 4) ? 1 : 0;
                } else if (col === 'EarlyTenureFlag') {
                    row[col] = (parseNum(row['TenureYears']) <= 1) ? 1 : 0;
                } else if (col === 'HighAbsenceFlag') {
                    row[col] = (parseNum(row['AbsenceDays_Last6M']) > 10) ? 1 : 0;
                } else if (col === 'NoTrainingFlag') {
                    row[col] = (parseNum(row['TrainingCount']) === 0) ? 1 : 0;
                } else if (col === 'AvgOverallScore') {
                    row[col] = row['PerformanceRating'];
                } else if (col === 'LastOverallScore') {
                    row[col] = row['PerformanceRating'];
                } else if (col === 'PayStagnationFlag') {
                    row[col] = (parseNum(row['YearsSinceLastRaise']) >= 3) ? 1 : 0;
                } else if (col === 'CareerStagnationFlag') {
                    row[col] = (parseNum(row['TenureYears']) >= 4 && parseNum(row['PerformanceRating']) <= 3) ? 1 : 0;
                } else {
                    row[col] = 0;
                }
            }
        }
    }

    // Coerce numeric columns
    const sampleAfter = rows[0] || {};
    const numericCols = Object.keys(sampleAfter).filter(k => !isNaN(parseFloat(sampleAfter[k])));
    for (const col of numericCols) {
        coerceToNumber(rows, col);
    }

    // Specific cleaning — mirrors notebook pre-processing
    for (const col of ['EngagementScore', 'BurnoutRiskScore']) {
        if (col in (rows[0] || {})) {
            for (const row of rows) {
                if (row[col] != null && row[col] < 0) row[col] = null;
            }
        }
    }
    for (const col of ['DaysSinceLastTraining', 'YearsSinceLastRaise']) {
        if (col in (rows[0] || {})) {
            for (const row of rows) {
                if (row[col] === 9999) row[col] = null;
            }
        }
    }

    // Fill numeric nulls with column medians
    for (const col of numericCols) {
        fillWithMedian(rows, col);
    }

    // Fill any remaining nulls with 0
    for (const row of rows) {
        for (const k of Object.keys(row)) {
            if (row[k] == null) row[k] = 0;
        }
    }

    return rows;
}

/** Replace the main dataset cache with new preprocessed data */
export async function replaceMainDataset(rows) {
    const processed = preprocessRaw(rows);
    _cache.main = processed;

    // Also update MongoDB
    try {
        const { getDb } = await import('../db.js');
        const db = getDb();
        await db.collection('employees').deleteMany({});
        if (processed.length > 0) {
            await db.collection('employees').insertMany(processed);
        }
        console.log(`[OK] Replaced main dataset: ${processed.length} rows`);
    } catch (err) {
        console.error('[WARN] MongoDB sync failed (in-memory cache still updated):', err.message);
    }

    return processed.length;
}
