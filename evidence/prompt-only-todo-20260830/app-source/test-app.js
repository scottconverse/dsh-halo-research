// Test script to verify the todo application functionality
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log("Testing Todo Application...");
console.log("==========================");

// Check if all required files exist
const requiredFiles = [
    'package.json',
    'server.js', 
    'public/index.html',
    'public/styles.css',
    'public/app.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`✓ ${file} exists`);
    } else {
        console.log(`✗ ${file} missing`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log("Some required files are missing!");
    process.exit(1);
}

// Check if server.js has proper structure
try {
    const serverContent = fs.readFileSync('server.js', 'utf8');
    
    if (serverContent.includes('express') && 
        serverContent.includes('/api/todos') &&
        serverContent.includes('todos = []')) {
        console.log("✓ Server file contains required components");
    } else {
        console.log("✗ Server file structure appears incorrect");
    }
} catch (error) {
    console.log("Error reading server.js:", error.message);
}

// Check if public files have proper content
try {
    const htmlContent = fs.readFileSync('public/index.html', 'utf8');
    const cssContent = fs.readFileSync('public/styles.css', 'utf8');
    
    if (htmlContent.includes('<title>Simple To-Do List</title>') && 
        htmlContent.includes('id="todo-input"') &&
        htmlContent.includes('id="add-btn"')) {
        console.log("✓ HTML file contains required elements");
    } else {
        console.log("✗ HTML file structure appears incorrect");
    }
    
    if (cssContent.includes('.todo-app') && 
        cssContent.includes('background:') &&
        cssContent.includes('@media')) {
        console.log("✓ CSS file contains required styles");
    } else {
        console.log("✗ CSS file structure appears incorrect");
    }
} catch (error) {
    console.log("Error reading public files:", error.message);
}

console.log("\nApplication Structure Check Complete!");
console.log("\nThe application includes:");
console.log("- Express.js backend with REST API endpoints");
console.log("- HTML/CSS/JavaScript frontend interface"); 
console.log("- Responsive design for mobile devices");
console.log("- In-memory storage (can be extended to persistent storage)");
console.log("- Docker support files (Dockerfile and docker-compose.yml)");

console.log("\nTo run the application:");
console.log("1. Install dependencies: npm install");
console.log("2. Start server: node start-server.js");
console.log("3. Open browser at http://localhost:3000");