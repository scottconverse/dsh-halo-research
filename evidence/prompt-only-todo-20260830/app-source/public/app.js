class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.loadTodos();
        this.bindEvents();
        this.render();
    }

    async loadTodos() {
        try {
            const response = await fetch('/api/todos');
            if (response.ok) {
                this.todos = await response.json();
                this.render();
            }
        } catch (error) {
            console.error('Failed to load todos:', error);
        }
    }

    bindEvents() {
        // Add todo
        document.getElementById('add-btn').addEventListener('click', () => this.addTodo());
        
        // Enter key on input
        document.getElementById('todo-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTodo();
            }
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                this.updateActiveFilter();
                this.render();
            });
        });

        // Clear completed
        document.getElementById('clear-completed').addEventListener('click', () => this.clearCompleted());
    }

    updateActiveFilter() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === this.currentFilter) {
                btn.classList.add('active');
            }
        });
    }

    async addTodo() {
        const input = document.getElementById('todo-input');
        const text = input.value.trim();
        
        if (!text) return;

        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (response.ok) {
                const newTodo = await response.json();
                this.todos.push(newTodo);
                this.render();
                input.value = '';
                input.focus();
            } else {
                const error = await response.json();
                alert('Error adding todo: ' + error.error);
            }
        } catch (error) {
            console.error('Failed to add todo:', error);
            alert('Failed to add todo');
        }
    }

    async updateTodo(id, updates) {
        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                const updatedTodo = await response.json();
                const index = this.todos.findIndex(todo => todo.id === id);
                if (index !== -1) {
                    this.todos[index] = updatedTodo;
                    this.render();
                }
            } else {
                const error = await response.json();
                alert('Error updating todo: ' + error.error);
            }
        } catch (error) {
            console.error('Failed to update todo:', error);
            alert('Failed to update todo');
        }
    }

    async deleteTodo(id) {
        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.todos = this.todos.filter(todo => todo.id !== id);
                this.render();
            } else {
                const error = await response.json();
                alert('Error deleting todo: ' + error.error);
            }
        } catch (error) {
            console.error('Failed to delete todo:', error);
            alert('Failed to delete todo');
        }
    }

    async clearCompleted() {
        try {
            const response = await fetch('/api/todos/completed', {
                method: 'DELETE'
            });

            if (response.ok) {
                this.todos = this.todos.filter(todo => !todo.completed);
                this.render();
            } else {
                const error = await response.json();
                alert('Error clearing completed todos: ' + error.error);
            }
        } catch (error) {
            console.error('Failed to clear completed todos:', error);
            alert('Failed to clear completed todos');
        }
    }

    render() {
        this.renderTodos();
        this.updateActiveFilter();
    }

    renderTodos() {
        const todoList = document.getElementById('todo-list');
        
        // Filter todos based on current filter
        let filteredTodos = [];
        switch (this.currentFilter) {
            case 'active':
                filteredTodos = this.todos.filter(todo => !todo.completed);
                break;
            case 'completed':
                filteredTodos = this.todos.filter(todo => todo.completed);
                break;
            default:
                filteredTodos = this.todos;
        }

        if (filteredTodos.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = this.currentFilter === 'all' 
                ? 'No todos yet. Add one above!' 
                : `No ${this.currentFilter} todos.`;
            
            // Clear existing content and add empty state
            todoList.innerHTML = '';
            todoList.appendChild(emptyState);
            return;
        }

        // Render filtered todos
        todoList.innerHTML = '';
        
        filteredTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = 'todo-item';
            
            li.innerHTML = `
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} data-id="${todo.id}">
                <span class="todo-text ${todo.completed ? 'completed' : ''}">${this.escapeHtml(todo.text)}</span>
                <button class="delete-btn" data-id="${todo.id}">Delete</button>
            `;
            
            todoList.appendChild(li);
        });

        // Add event listeners to checkboxes and delete buttons
        document.querySelectorAll('.todo-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.updateTodo(id, { completed: e.target.checked });
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.deleteTodo(id);
            });
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});