#!/usr/bin/env node

/**
 * Security Check Script for Opti Runner
 * This script checks for exposed API keys and security issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Security Check for Opti Runner\n');

// Check for exposed API keys
const apiKeyPattern = /AIza[0-9A-Za-z-_]{35}/;
const filesToCheck = [
    'index.html',
    'game.js',
    'style.css',
    'README.md'
];

let securityIssues = 0;

console.log('📁 Checking files for exposed API keys...\n');

filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(apiKeyPattern);
        
        if (matches) {
            console.log(`❌ SECURITY ISSUE: ${file} contains exposed API key!`);
            console.log(`   Found: ${matches[0]}`);
            securityIssues++;
        } else {
            console.log(`✅ ${file} - No API keys found`);
        }
    }
});

// Check if config.js is gitignored
const gitignoreContent = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf8') : '';
if (gitignoreContent.includes('config.js')) {
    console.log('\n✅ config.js is properly gitignored');
} else {
    console.log('\n❌ SECURITY ISSUE: config.js is not in .gitignore!');
    securityIssues++;
}

// Check if config.js exists
if (fs.existsSync('config.js')) {
    console.log('✅ config.js exists');
} else {
    console.log('❌ config.js is missing - create it with your Firebase config');
    securityIssues++;
}

console.log('\n' + '='.repeat(50));
if (securityIssues === 0) {
    console.log('🎉 All security checks passed! Your game is secure.');
} else {
    console.log(`⚠️  ${securityIssues} security issue(s) found. Please fix them before deploying.`);
}
console.log('='.repeat(50));

// Usage instructions
console.log('\n📋 Next Steps:');
console.log('1. Go to Google Cloud Console and revoke the old API key');
console.log('2. Create a new API key');
console.log('3. Update config.js with the new key');
console.log('4. Update Firebase project settings');
console.log('5. Close GitHub security alert');
console.log('6. Run this script again to verify security');
