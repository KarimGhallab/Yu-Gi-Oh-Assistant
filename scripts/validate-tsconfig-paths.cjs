#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates that all packages in the workspace are listed in tsconfig.depcruise.json
 * This ensures depcruiser can properly resolve all package paths.
 */

const rootDir = path.resolve(__dirname, '..');
const tsConfigFilePath = path.join(rootDir, 'tsconfig.depcruise.json');
const packagePatterns = ['apps/*', 'scripts/*', 'packages/**'];

/**
 * Recursively find all package.json files matching the patterns
 */
function findPackages(baseDir, patterns) {
  const packages = [];

  for (const pattern of patterns) {
    const parts = pattern.split('/');
    const basePath = parts[0];
    const isRecursive = pattern.includes('**');

    const searchDir = path.join(baseDir, basePath);
    if (!fs.existsSync(searchDir)) {
      continue;
    }

    if (isRecursive) {
      // For packages/**, search recursively
      findPackagesRecursive(searchDir, packages);
    } else {
      // For apps/* and scripts/*, search one level deep
      const entries = fs.readdirSync(searchDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pkgPath = path.join(searchDir, entry.name, 'package.json');
          if (fs.existsSync(pkgPath)) {
            packages.push(pkgPath);
          }
        }
      }
    }
  }

  return packages;
}

/**
 * Recursively search for package.json files
 */
function findPackagesRecursive(dir, packages) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.name === 'node_modules') {
      continue; // Skip node_modules
    }

    if (entry.isDirectory()) {
      findPackagesRecursive(fullPath, packages);
    } else if (entry.name === 'package.json') {
      packages.push(fullPath);
    }
  }
}

/**
 * Read package name from package.json
 */
function getPackageName(pkgPath) {
  try {
    const content = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(content);
    return pkg.name;
  } catch (error) {
    console.error(`Error reading ${pkgPath}:`, error.message);
    return null;
  }
}

/**
 * Read tsconfig paths
 */
function getTsconfigPaths() {
  try {
    const content = fs.readFileSync(tsConfigFilePath, 'utf8');
    // Remove comments before parsing
    const cleanContent = content
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const tsconfig = JSON.parse(cleanContent);
    return Object.keys(tsconfig.compilerOptions?.paths || {});
  } catch (error) {
    console.error(`Error reading ${tsConfigFilePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Main validation logic
 */
function validateTsconfigPaths() {
  // Find all packages
  const packageFiles = findPackages(rootDir, packagePatterns);

  // Get package names
  const packageNames = packageFiles
    .map(pkgPath => ({
      name: getPackageName(pkgPath),
      path: path.relative(rootDir, pkgPath)
    }))
    .filter(pkg => pkg.name); // Filter out invalid packages

  // Get tsconfig paths
  const tsconfigPaths = getTsconfigPaths();

  // Validate
  const missing = [];

  for (const pkg of packageNames) {
    if (!tsconfigPaths.includes(pkg.name)) {
      missing.push(pkg);
    }
  }

  if (missing.length > 0) {
    console.error(
      `❌ ${missing.length} package(s) missing from tsconfig.depcruise.json:`
    );
    for (const pkg of missing) {
      console.error(`   - ${pkg.name}`);
    }
    process.exit(1);
  }

  console.log('✔ tsconfig.depcruise.json paths are valid');
}

// Run validation
validateTsconfigPaths();
