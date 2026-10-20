export function settleWithin(promise, duration = 2500) {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, duration)
    Promise.resolve(promise).catch(() => {}).finally(() => { clearTimeout(timer); resolve() })
  })
}

export async function prepareTasks(tasks, report, { duration = 8000, concurrency = 4 } = {}) {
  const controller = new AbortController()
  let completed = 0
  let next = 0
  let timer
  const deadline = new Promise(resolve => {
    timer = setTimeout(() => { controller.abort(); resolve() }, duration)
  })
  const worker = async () => {
    while (next < tasks.length && !controller.signal.aborted) {
      const task = tasks[next++]
      try { await task(controller.signal) } catch { /* Failed media must not block the site. */ }
      if (controller.signal.aborted) return
      completed += 1
      report(completed / tasks.length)
    }
  }
  await Promise.race([Promise.all(Array.from({ length: concurrency }, worker)), deadline])
  clearTimeout(timer)
  report(1)
  return { completed, total: tasks.length, timedOut: controller.signal.aborted }
}
