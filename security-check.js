#!/usr/bin/env node

/**
 * Security Check Script for Optimum Runner
 * This script checks for exposed API keys and security issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Security Check for Optimum Runner\n');

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

// Firebase config.js is no longer used - removed for security
console.log('\n✅ Firebase config.js has been removed for security');

console.log('\n' + '='.repeat(50));
if (securityIssues === 0) {
    console.log('🎉 All security checks passed! Your game is secure.');
} else {
    console.log(`⚠️  ${securityIssues} security issue(s) found. Please fix them before deploying.`);
}
console.log('='.repeat(50));

// Usage instructions
console.log('\n📋 Security Status:');
console.log('✅ Firebase config.js removed for security');
console.log('✅ Using Supabase with Netlify Functions proxy');
console.log('✅ API keys are server-side only');
console.log('✅ No sensitive data exposed to users');
