import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const write = args.includes('--write');
const targetArg = args.find((arg) => !arg.startsWith('--'));

if (!targetArg) {
    printUsage();
    process.exit(1);
}

const vaultPath = path.resolve(targetArg);
const stats = {
    typesRemoved: 0,
    markdownScanned: 0,
    markdownChanged: 0,
    propertiesRemoved: 0,
};

if (!fs.existsSync(vaultPath) || !fs.statSync(vaultPath).isDirectory()) {
    console.error(`Vault path does not exist or is not a directory: ${vaultPath}`);
    process.exit(1);
}

cleanupTypesJson(vaultPath, write, stats);
walkMarkdownFiles(vaultPath, write, stats);

console.log('');
console.log(write ? 'Cleanup complete.' : 'Dry run complete. No files were changed.');
console.log(`TQ_* type entries removed from types.json: ${stats.typesRemoved}`);
console.log(`Markdown files scanned: ${stats.markdownScanned}`);
console.log(`Markdown files containing TQ_* frontmatter: ${stats.markdownChanged}`);
console.log(`TQ_* frontmatter properties removed: ${stats.propertiesRemoved}`);

if (!write) {
    console.log('');
    console.log('Run again with --write to apply the cleanup.');
}

function printUsage() {
    console.log('Usage: node scripts/cleanup-tq-once.mjs <vault-path> [--write]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/cleanup-tq-once.mjs "D:/Obsidian/MyVault"');
    console.log('  node scripts/cleanup-tq-once.mjs "D:/Obsidian/MyVault" --write');
}

function cleanupTypesJson(vaultRoot, shouldWrite, currentStats) {
    const typesPath = path.join(vaultRoot, '.obsidian', 'types.json');
    if (!fs.existsSync(typesPath)) {
        console.log(`Skip types.json: not found at ${typesPath}`);
        return;
    }

    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(typesPath, 'utf8'));
    } catch (error) {
        console.error(`Failed to parse ${typesPath}:`, error.message);
        return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.error(`Skip types.json: unexpected JSON shape in ${typesPath}`);
        return;
    }

    const removedKeys = Object.keys(parsed).filter((key) => key.startsWith('TQ_'));
    currentStats.typesRemoved += removedKeys.length;

    if (removedKeys.length === 0) {
        console.log(`No TQ_* entries found in ${typesPath}`);
        return;
    }

    console.log(`${shouldWrite ? 'Clean' : 'Would clean'} ${typesPath}`);
    for (const key of removedKeys) {
        console.log(`  ${shouldWrite ? 'Removed' : 'Would remove'} type: ${key}`);
        if (shouldWrite) {
            delete parsed[key];
        }
    }

    if (shouldWrite) {
        fs.writeFileSync(typesPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
    }
}

function walkMarkdownFiles(rootDir, shouldWrite, currentStats) {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            if (shouldSkipDirectory(entry.name)) {
                continue;
            }
            walkMarkdownFiles(fullPath, shouldWrite, currentStats);
            continue;
        }

        if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) {
            continue;
        }

        currentStats.markdownScanned += 1;
        processMarkdownFile(fullPath, shouldWrite, currentStats);
    }
}

function shouldSkipDirectory(name) {
    return name === '.git' || name === '.obsidian' || name === 'node_modules';
}

function processMarkdownFile(filePath, shouldWrite, currentStats) {
    const original = fs.readFileSync(filePath, 'utf8');
    const cleaned = removeTqFrontmatter(original);

    if (!cleaned.changed) {
        return;
    }

    currentStats.markdownChanged += 1;
    currentStats.propertiesRemoved += cleaned.removedKeys.length;

    console.log(`${shouldWrite ? 'Clean' : 'Would clean'} ${filePath}`);
    for (const key of cleaned.removedKeys) {
        console.log(`  ${shouldWrite ? 'Removed' : 'Would remove'} property: ${key}`);
    }

    if (shouldWrite) {
        fs.writeFileSync(filePath, cleaned.content, 'utf8');
    }
}

function removeTqFrontmatter(content) {
    const match = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)/);
    if (!match) {
        return { changed: false, content, removedKeys: [] };
    }

    const opening = match[1];
    const body = match[2];
    const closing = match[3];
    const remainder = content.slice(match[0].length);
    const lineEnding = opening.includes('\r\n') ? '\r\n' : '\n';
    const lines = body.split(/\r?\n/);

    const entries = [];
    let currentEntry = [];
    let currentKey = null;

    for (const line of lines) {
        const topLevelKey = line.match(/^([A-Za-z0-9_-]+):(?:\s|$)/);
        if (topLevelKey) {
            if (currentEntry.length > 0) {
                entries.push({ key: currentKey, lines: currentEntry });
            }
            currentKey = topLevelKey[1];
            currentEntry = [line];
        } else if (currentEntry.length > 0) {
            currentEntry.push(line);
        } else {
            entries.push({ key: null, lines: [line] });
        }
    }

    if (currentEntry.length > 0) {
        entries.push({ key: currentKey, lines: currentEntry });
    }

    const keptEntries = [];
    const removedKeys = [];
    for (const entry of entries) {
        if (entry.key && entry.key.startsWith('TQ_')) {
            removedKeys.push(entry.key);
            continue;
        }
        keptEntries.push(...entry.lines);
    }

    if (removedKeys.length === 0) {
        return { changed: false, content, removedKeys: [] };
    }

    const compacted = trimFrontmatterBlankLines(keptEntries);
    if (compacted.length === 0) {
        return {
            changed: true,
            content: remainder.replace(/^\r?\n/, ''),
            removedKeys,
        };
    }

    const newFrontmatter = opening + compacted.join(lineEnding) + closing;
    return {
        changed: true,
        content: newFrontmatter + remainder,
        removedKeys,
    };
}

function trimFrontmatterBlankLines(lines) {
    const result = [...lines];
    while (result.length > 0 && result[0].trim() === '') {
        result.shift();
    }
    while (result.length > 0 && result[result.length - 1].trim() === '') {
        result.pop();
    }
    return result;
}