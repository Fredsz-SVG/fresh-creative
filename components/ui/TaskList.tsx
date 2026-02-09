'use client'

interface Task {
  id: number
  task: string
  status: string
  created_at?: string
}

interface TaskListProps {
  tasks: Task[]
  onDelete: (id: number) => Promise<void>
  onUpdate: (id: number, status: string) => Promise<void>
  isLoading?: boolean
}

export default function TaskList({
  tasks,
  onDelete,
  onUpdate,
  isLoading,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No tasks yet. Add one to get started!
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center"
        >
          <div className="flex-1">
            <p className="text-white font-medium">{task.task}</p>
            <p className="text-xs text-gray-400 mt-1">
              Status: <span className="text-green-400">{task.status}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate(task.id, 'Completed')}
              disabled={isLoading}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
            >
              Complete
            </button>
            <button
              onClick={() => onDelete(task.id)}
              disabled={isLoading}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
