// Generate combined fix commands for all critical/high vulnerabilities

export const generateFixAllScript = (fixes, ecosystem) => {
  if (!fixes || fixes.length === 0) return null
  
  const commands = []
  const packages = fixes
    .filter(f => f.fix_version)
    .map(f => {
      const pkg = f.package_name || f.package
      const ver = f.fix_version
      
      if (ecosystem === 'pypi') {
        return `${pkg}==${ver}`
      } else if (ecosystem === 'maven') {
        return `${pkg} -> ${ver}`
      } else {
        return `${pkg}@${ver}`
      }
    })
  
  if (packages.length === 0) return null
  
  if (ecosystem === 'pypi') {
    return `pip install ${packages.join(' ')}`
  } else if (ecosystem === 'maven') {
    return `Update pom.xml with:\n${packages.join('\n')}`
  } else {
    return `npm install ${packages.join(' ')}`
  }
}

export const downloadFixScript = (script, projectName) => {
  const blob = new Blob([script], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectName}-fixes.sh`
  a.click()
  URL.revokeObjectURL(url)
}
