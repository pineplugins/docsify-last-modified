const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_FOLDER = path.resolve(__dirname, '..');
const META_FOLDER = path.join(ROOT_FOLDER, 'plugin', 'meta');

if (!fs.existsSync(META_FOLDER)) {
    fs.mkdirSync(META_FOLDER, { recursive: true });
}

function getMarkdownFiles(dir) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !file.startsWith('.')) {
            results = results.concat(getMarkdownFiles(filePath));
        } else if (file.endsWith('.md')) {
            results.push(filePath);
        }
    }
    return results;
}

function slugify(filePath) {
    return path.basename(filePath, '.md').toUpperCase();
}

function getGitMeta(file) {
    try {
        const cmdMain = `git log -1 --pretty=format:'{"author":"%an","email":"%ae","date":"%aI","authorDate":"%aD","committer":"%cn","committerEmail":"%ce","message":"%s","sha":"%H"}' -- "${file}"`;
        const mainResult = execSync(cmdMain, { encoding: 'utf8' }).trim();
        const meta = JSON.parse(mainResult);

        const commitCountCmd = `git rev-list --count HEAD -- "${file}"`;
        meta.commitCount = parseInt(execSync(commitCountCmd, { encoding: 'utf8' }).trim(), 10);

        const statsCmd = `git show --stat --oneline --pretty="" ${meta.sha} -- "${file}"`;
        const statsOutput = execSync(statsCmd, { encoding: 'utf8' }).trim();
        const statsLine = statsOutput.split('\n').pop();

        const match = statsLine.match(/(\d+) file[s]? changed(?:, (\d+) insertion[s]?\(\+\))?(?:, (\d+) deletion[s]?\(-\))?/);
        if (match) {
            meta.filesChanged = parseInt(match[1]) || 0;
            meta.insertions = parseInt(match[2]) || 0;
            meta.deletions = parseInt(match[3]) || 0;
        } else {
            meta.filesChanged = 0;
            meta.insertions = 0;
            meta.deletions = 0;
        }

        try {
            const branchCmd = `git branch --contains ${meta.sha} --format="%(refname:short)"`;
            const branches = execSync(branchCmd, { encoding: 'utf8' }).trim().split('\n');
            meta.branch = branches[0] || 'unknown';
        } catch {
            meta.branch = 'unknown';
        }

        try {
            const tagCmd = `git tag --points-at ${meta.sha}`;
            const tagsRaw = execSync(tagCmd, { encoding: 'utf8' }).trim();
            meta.tags = tagsRaw ? tagsRaw.split('\n') : [];
        } catch {
            meta.tags = [];
        }

        return meta;
    } catch (e) {
        console.warn(`No git history for ${file}: ${e.message}`);
        return null;
    }
}

function isJsonContentSame(filePath, newContent) {
    if (!fs.existsSync(filePath)) return false;
    try {
        const existingContent = fs.readFileSync(filePath, 'utf8');
        // Bandingkan string JSON yang sudah diformat rapi
        return existingContent.trim() === JSON.stringify(newContent, null, 2).trim();
    } catch {
        return false;
    }
}

function main() {
    const markdownFiles = getMarkdownFiles(ROOT_FOLDER);
    console.log(`Found ${markdownFiles.length} markdown files`);

    for (const file of markdownFiles) {
        const meta = getGitMeta(file);
        if (!meta) continue;

        const filename = slugify(file) + '.json';
        const jsonPath = path.join(META_FOLDER, filename);

        if (isJsonContentSame(jsonPath, meta)) {
            console.log(`No changes in metadata for ${filename}, skipping write.`);
            continue;
        }

        if (fs.existsSync(jsonPath)) {
            console.log(`Updating metadata file: ${jsonPath}`);
        } else {
            console.log(`Creating new metadata file: ${jsonPath}`);
        }

        fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 2));
    }

    console.log('Metadata generation complete.');
}

main();
