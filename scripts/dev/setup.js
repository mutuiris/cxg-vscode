#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up ContextExtendedGuard development environment...\n');

// Check if required tools are installed
function checkTool(command, name) {
  try {
    execSync(command, { stdio: 'ignore' });
    console.log(`✅ ${name} is installed`);
    return true;
  } catch (error) {
    console.log(`❌ ${name} is not installed`);
    return false;
  }
}

// Execute command with retry logic for Windows
function executeWithRetry(command, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxRetries}: ${command}`);
      execSync(command, { stdio: 'inherit' });
      return true;
    } catch (error) {
      console.log(`❌ Attempt ${i + 1} failed:`, error.message);
      if (i < maxRetries - 1) {
        console.log(`⏳ Waiting 3 seconds before retry...`);
        // Simple sleep function
        execSync('timeout /t 3 >nul', { stdio: 'ignore' });
      }
    }
  }
  return false;
}

// Check prerequisites
console.log('Checking prerequisites...');
const hasNode = checkTool('node --version', 'Node.js');
const hasGo = checkTool('go version', 'Go');
const hasPnpm = checkTool('pnpm --version', 'PNPM');

if (!hasNode || !hasGo) {
  console.log('\n❌ Missing required tools. Please install Node.js and Go.');
  process.exit(1);
}

if (!hasPnpm) {
  console.log('📦 Installing PNPM...');
  if (!executeWithRetry('npm install -g pnpm')) {
    console.log('❌ Failed to install PNPM after multiple attempts');
    process.exit(1);
  }
}

// Clean any existing node_modules
console.log('\n🧹 Cleaning existing dependencies...');
try {
  if (fs.existsSync('node_modules')) {
    execSync('rmdir /s /q node_modules', { stdio: 'inherit' });
  }
  if (fs.existsSync('pnpm-lock.yaml')) {
    fs.unlinkSync('pnpm-lock.yaml');
  }
} catch (error) {
  console.log('⚠️ Warning: Could not clean all files, continuing...');
}

// Install dependencies with retry
console.log('\n📦 Installing dependencies...');
if (!executeWithRetry('pnpm install --no-frozen-lockfile')) {
  console.log('\n❌ Failed to install dependencies after multiple attempts.');
  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Ensure OneDrive sync is paused');
  console.log('2. Close VS Code and any other editors');
  console.log('3. Disable antivirus temporarily');
  console.log('4. Run as Administrator');
  console.log('5. Try: pnpm install --shamefully-hoist');
  process.exit(1);
}

// Set up git hooks (optional, skip if fails)
console.log('\n🔧 Setting up git hooks...');
try {
  execSync('pnpm exec husky install', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️ Warning: Could not set up git hooks, skipping...');
}

// Copy example files
console.log('\n📝 Setting up configuration files...');
const exampleFiles = [
  '.vscode/settings.json.example',
  '.env.example'
];

exampleFiles.forEach(file => {
  const examplePath = file;
  const targetPath = file.replace('.example', '');
  
  try {
    if (fs.existsSync(examplePath) && !fs.existsSync(targetPath)) {
      fs.copyFileSync(examplePath, targetPath);
      console.log(`✅ Created ${targetPath}`);
    }
  } catch (error) {
    console.log(`⚠️ Warning: Could not copy ${file}`);
  }
});

console.log('\n🎉 ContextExtendedGuard development environment setup completed!');
console.log('\nNext steps:');
console.log('1. Resume OneDrive sync if you paused it');
console.log('2. Review and update .env file with your configuration');
console.log('3. Run "pnpm dev" to start development servers');
console.log('4. Open VS Code and install recommended extensions');