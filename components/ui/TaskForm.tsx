'use client'

import { useState } from 'react'

interface TaskFormProps {
  onSubmit: (task: string) => Promise<void>
  isLoading?: boolean
}

export default function TaskForm({ onSubmit, isLoading }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Task cannot be empty')
      return
    }

    try {
      setError('')
      await onSubmit(title)
      setTitle('')
    } catch (err) {
      setError('Failed to add task')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Adding...' : 'Add'}
        </button>
      </div>
      {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
    </form>
  )
}
