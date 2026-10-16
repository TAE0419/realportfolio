export function filterProjects(projects, category) {
  if (category === 'all') return projects
  if (category === 'team') return projects.filter(project => project.teamProject === true)
  if (category === 'personal') return projects.filter(project => project.teamProject === false)
  return projects.filter(project => project.category === category || project.category2 === category || project.category3 === category)
}
