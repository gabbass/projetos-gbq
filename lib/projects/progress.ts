import type { ProjectTask } from "@/lib/projects/database"

export function getTaskProgress(task: ProjectTask, subtasks: ProjectTask[]) {
  if (subtasks.length === 0) return task.status === "done" ? 100 : 0
  return Math.round(100 * subtasks.filter((subtask) => subtask.status === "done").length / subtasks.length)
}

export function getTasksProgressSummary(tasks: ProjectTask[]) {
  const mainTasks = tasks.filter((task) => !task.parent_task_id)
  const progressByTask = mainTasks.map((task) => getTaskProgress(
    task,
    tasks.filter((candidate) => candidate.parent_task_id === task.id),
  ))

  return {
    taskCount: mainTasks.length,
    completedCount: progressByTask.filter((progress) => progress === 100).length,
    waitingCount: mainTasks.filter((task) => task.status === "waiting").length,
    progress: progressByTask.length
      ? Math.round(progressByTask.reduce((total, progress) => total + progress, 0) / progressByTask.length)
      : 0,
  }
}
