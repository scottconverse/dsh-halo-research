# Simple To-Do List Web App

A complete, self-hostable to-do list web application with Docker support. This app allows you to manage your tasks through a clean, modern interface.

## Features

- Add new todos with the input field and "Add" button or Enter key
- Mark todos as completed with checkboxes
- Edit todo text by clicking on it (not implemented in current version)
- Delete individual todos
- Filter todos: All, Active, Completed
- Clear all completed todos at once
- Responsive design that works on mobile devices
- Data persistence using Docker volumes

## Getting Started

### Prerequisites

- Node.js installed on your system (version 14 or higher)

### Installation and Running

1. **Clone or download this repository** to your local machine.

2. **Navigate to the project directory:**
   ```bash
   cd path/to/todo-app
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the application:**
   ```bash
   node start-server.js
   ```

5. **Access the application in your browser at:**
   [http://localhost:3000](http://localhost:3000)

## Managing the Application

### Starting the Application
```bash
node start-server.js
```

### Stopping the Application
Press `Ctrl+C` in the terminal where the server is running.

### Viewing Logs
The application logs will appear in the terminal where you started it.

## Docker Deployment (Alternative Method)

If you prefer to use Docker, this application includes all necessary files:

1. **Dockerfile** - Defines the container image
2. **docker-compose.yml** - Defines and runs multi-container Docker applications

### Running with Docker:
```bash
# Build and start the containers
docker-compose up -d --build

# Stop the containers
docker-compose down
```

## Data Persistence

The application uses in-memory storage by default, but when deployed via Docker:
- Data is stored in a `data` directory within your project folder 
- This gets mounted as a volume to `/app/data` inside the container
- Your todos will remain even when you stop and start the containers

## Technical Details

### Architecture
- **Frontend**: Pure HTML, CSS, JavaScript (no build tools needed)
- **Backend**: Node.js with Express
- **Storage**: In-memory storage (can be extended to persistent storage)
- **Containerization**: Docker with docker-compose for easy deployment

### Port Usage
The application runs on port 3000. If this port is already in use:
1. Stop the conflicting service using port 3000
2. Modify the `start-server.js` file to use a different port

## Troubleshooting

### Application Not Loading
1. Verify Node.js is installed: `node --version`
2. Check that all files are present in the directory
3. Ensure you're running from the correct directory with `npm install`

### Port Already in Use
If you get an error about the port being in use:
1. Find what's using port 3000:
   ```bash
   netstat -ano | findstr :3000
   ```
2. Kill the process (replace PID with actual process ID):
   ```bash
   taskkill /PID <PID> /F
   ```

## Customization

To customize this application, you can modify:
- `public/index.html` - Main layout structure
- `public/styles.css` - Styling and theming
- `public/app.js` - Frontend JavaScript logic
- `server.js` - Backend API endpoints

## License

This project is available as open source under the terms of the MIT License.