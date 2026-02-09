'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Todo {
  id: number
  task: string
  status: 'pending' | 'in-progress' | 'completed'
  user_id: string
  inserted_at: string
}

type FilterStatus = 'all' | 'pending' | 'in-progress' | 'completed'

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTask, setNewTask] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const router = useRouter()

  // Fetch todos on component mount
  useEffect(() => {
    fetchTodos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTodos = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/todos', {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error(`Failed to fetch todos: ${response.status}`)
      }

      const data = await response.json()
      setTodos(data)
    } catch (err) {
      console.error('Error fetching todos:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch todos')
    } finally {
      setLoading(false)
    }
  }

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.trim()) return

    try {
      setAddingTask(true)
      setError('')

      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ task: newTask.trim() })
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error(`Failed to add todo: ${response.status}`)
      }

      const newTodo = await response.json()
      setTodos(prev => [newTodo, ...prev])
      setNewTask('')
    } catch (err) {
      console.error('Error adding todo:', err)
      setError(err instanceof Error ? err.message : 'Failed to add todo')
    } finally {
      setAddingTask(false)
    }
  }

  const updateTodoStatus = async (id: number, newStatus: Todo['status']) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error(`Failed to update todo: ${response.status}`)
      }

      const updatedTodo = await response.json()
      setTodos(prev => prev.map(todo =>
        todo.id === id ? updatedTodo : todo
      ))
    } catch (err) {
      console.error('Error updating todo:', err)
      setError(err instanceof Error ? err.message : 'Failed to update todo')
    }
  }

  const deleteTodo = async (id: number) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error(`Failed to delete todo: ${response.status}`)
      }

      setTodos(prev => prev.filter(todo => todo.id !== id))
    } catch (err) {
      console.error('Error deleting todo:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete todo')
    }
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'all') return true
    return todo.status === filter
  })

  const getStatusBadge = (status: Todo['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-900/30 text-yellow-400'
      case 'in-progress': return 'bg-blue-900/30 text-blue-400'
      case 'completed': return 'bg-green-900/30 text-green-400'
      default: return 'bg-gray-900/30 text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="bg-card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-[rgb(var(--input))] rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-[rgb(var(--input))] rounded"></div>
            <div className="h-16 bg-[rgb(var(--input))] rounded"></div>
            <div className="h-16 bg-[rgb(var(--input))] rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-app">Todo List</h2>
        <div className="flex gap-2">
          {(['all', 'pending', 'in-progress', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-[rgb(var(--input))] text-app hover:bg-[rgb(var(--border))]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={addTodo} className="mb-6">
        <div className="flex gap-2">
          <input
            id="task"
            name="task"
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 input-field"
            disabled={addingTask}
          />
          <button
            type="submit"
            disabled={addingTask || !newTask.trim()}
            className="btn-primary"
          >
            {addingTask ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-8 text-muted">
            {filter === 'all'
              ? 'No tasks yet. Add one above!'
              : `No ${filter} tasks found.`
            }
          </div>
        ) : (
          filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className="bg-secondary rounded-lg p-4 border border-[rgb(var(--border))]"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-app font-medium mb-2">{todo.task}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(todo.status)}`}>
                      {todo.status.charAt(0).toUpperCase() + todo.status.slice(1)}
                    </span>
                    <span className="text-muted">
                      {new Date(todo.inserted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4 items-center">
                  <select
                    value={todo.status}
                    onChange={(e) => updateTodoStatus(todo.id, e.target.value as Todo['status'])}
                    className="px-3 py-1 bg-[rgb(var(--input))] border border-[rgb(var(--border))] rounded text-app text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
