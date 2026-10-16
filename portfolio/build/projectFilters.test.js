import test from 'node:test'
import assert from 'node:assert/strict'
import { filterProjects } from '../src/data/projectFilters.js'

const projects = [
  { id: 'first', category: 'javascript', category2: 'canvas', category3: 'video', teamProject: true },
  { id: 'second', category: 'react', teamProject: false },
  { id: 'third', category: 'canvas', category2: 'canvas', category3: 'canvas', teamProject: false },
]

test('matches any of three categories without duplicating projects', () => {
  assert.deepEqual(filterProjects(projects, 'canvas'), [projects[0], projects[2]])
  assert.deepEqual(filterProjects(projects, 'javascript'), [projects[0]])
  assert.deepEqual(filterProjects(projects, 'react'), [projects[1]])
  assert.deepEqual(filterProjects(projects, 'video'), [projects[0]])
  assert.deepEqual(filterProjects(projects, 'branding'), [])
})

test('preserves all, team, and personal classification', () => {
  assert.equal(filterProjects(projects, 'all'), projects)
  assert.deepEqual(filterProjects(projects, 'team'), [projects[0]])
  assert.deepEqual(filterProjects(projects, 'personal'), [projects[1], projects[2]])
})
