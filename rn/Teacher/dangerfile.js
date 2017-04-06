// @flow

import { danger, warn, markdown } from 'danger'
import fs from 'fs'
import path from 'path'
import _ from 'lodash'

// Takes a list of file paths, and converts it into clickable links
function linkableFiles (paths: Array<string>): string {
  const repoURL = danger.github.pr.head.repo.html_url
  const ref = danger.github.pr.head.ref
  const links = paths.map((path: string) => {
    const href = `${repoURL}/blob/${ref}${path}`
    return createLink(href, path)
  })
  return toSentence(links)
}

// ["1", "2", "3"] to "1, 2 and 3"
function toSentence (array: Array<string>): string {
  if (array.length === 1) { return array[0] }
  return array.slice(0, array.length - 1).join(', ') + ' and ' + array.pop()
}

// ("/href/thing", "name") to "<a href="/href/thing">name</a>"
function createLink (href: string, text: string): string {
  return `<a href='${href}'>${text}</a>`
}

// New js files should have `@flow` at the top
export function annotations (): void {
  const newJSFiles = danger.git.created_files.filter((path: string) => path.endsWith('js'))
  const unFlowedFiles = newJSFiles.filter((filepath: string) => {
    // Navigating up two directories cuz this dangerfile isn't at the project root
    const content = fs.readFileSync(path.join('../../', filepath))
    return !content.includes('@flow')
  })

  if (unFlowedFiles.length > 0) {
    warn(`These new JS files do not have Flow enabled: ${linkableFiles(unFlowedFiles)}`)
  }
}

// Warns if there is not reference to a jira ticket starting with MBL- in the PR title or body
export function jira (): void {
  if (!danger.github.pr.title.match(/mbl-/i) && !danger.github.pr.body.match(/mbl-/i)) {
    warn('Neither the title nor body of the pull request reference a JIRA ticket.')
  }
}

// Checks for corresponding tests to js files in the commit's modified files
export function untestedFiles (): void {
  const testFiles = danger.git.created_files.filter((path: string) => {
    return path.includes('__tests__/') && !path.includes('__snapshots__/')
  })

  const logicalTestPaths = testFiles.map((path: string) => {
    return path.replace(/__tests__\//, '').replace(/.test.js/, '.js')
  })

  const sourcePaths = danger.git.created_files.filter((path: string) => {
    const exclude = ['__tests__/', '__snapshots__/', '__mocks__/', 'src/api/', '__templates__/', 'flow/']
    return path.includes('src/') &&
      path.includes('js') &&
      exclude.reduce((accl, e) => accl && !path.includes(e), true)
  })

  const untestedFiles = _.difference(sourcePaths, logicalTestPaths)
  if (untestedFiles.length > 0) {
    warn('The following files were added without tests: ' + linkableFiles(untestedFiles))
  }
}

// Reports the coverage numbers
export function coverageReport (): void {
  const coverageContent = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'))
  const developCoverageContent = JSON.parse(fs.readFileSync('coverage-summary-develop.json', 'utf8'))
  const statementsCoverageDiff = coverageContent.total.statements.pct - developCoverageContent.total.statements.pct
  const branchesCoverageDiff = coverageContent.total.branches.pct - developCoverageContent.total.branches.pct
  const functionsCoverageDiff = coverageContent.total.functions.pct - developCoverageContent.total.functions.pct
  const linesCoverageDiff = coverageContent.total.lines.pct - developCoverageContent.total.lines.pct
  var coverageMarkdown = 'Coverage | New % | Delta\n' +
                         '---------- | ---------- | ----------\n' +
                         'Statements |' + coverageContent.total.statements.pct + '% | ' + statementsCoverageDiff.toFixed(2) + '%\n' +
                         'Branches |' + coverageContent.total.branches.pct + '% | ' + branchesCoverageDiff.toFixed(2) + '%\n' +
                         'Functions |' + coverageContent.total.functions.pct + '% | ' + functionsCoverageDiff.toFixed(2) + '%\n' +
                         'Lines |' + coverageContent.total.lines.pct + '% | ' + linesCoverageDiff.toFixed(2) + '%\n'
  markdown(coverageMarkdown)

  const coverageDropWarnThreshold = -5
  if (statementsCoverageDiff < coverageDropWarnThreshold || branchesCoverageDiff < coverageDropWarnThreshold || functionsCoverageDiff < coverageDropWarnThreshold || linesCoverageDiff < coverageDropWarnThreshold) {
    warn('One or more of your coverage numbers have dropped more than 5% because of this PR. Get with the program, dude.')
  }
}

// Warns if there are changes to package.json without changes to yarn.lock.
export function packages (): void {
  const packageChanged = _.includes(danger.git.modified_files, 'package.json')
  const lockfileChanged = _.includes(danger.git.modified_files, 'yarn.lock')
  if (packageChanged && !lockfileChanged) {
    const message = 'Changes were made to package.json, but not to yarn.lock'
    const idea = 'Perhaps you need to run `yarn install`?'
    warn(`${message} - <i>${idea}</i>`)
  }
}

if (!danger.__TEST__) {
  annotations()
  jira()
  untestedFiles()
  coverageReport()
}
