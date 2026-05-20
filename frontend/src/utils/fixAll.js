// Generate combined fix commands for all critical/high vulnerabilities

export const generateFixAllScript = (fixes, ecosystem) => {
  if (!fixes || fixes.length === 0) return null
  
  const packages = fixes
    .filter(f => f.fix_version)
    .map(f => {
      const pkg = f.package_name || f.package
      const ver = f.fix_version
      
      if (ecosystem === 'pypi') {
        return `${pkg}==${ver}`
      } else if (ecosystem === 'maven') {
        // Extract groupId and artifactId from full coordinate
        const parts = pkg.split(':')
        const groupId = parts[0] || 'UNKNOWN'
        const artifactId = parts.length > 1 ? parts[1] : pkg
        
        return `<dependency>
    <groupId>${groupId}</groupId>
    <artifactId>${artifactId}</artifactId>
    <version>${ver}</version>
</dependency>`
      } else {
        return `${pkg}@${ver}`
      }
    })
  
  if (packages.length === 0) return null
  
  if (ecosystem === 'pypi') {
    return `# ⚠️ Security fixes - test before production deployment
pip install ${packages.join(' ')}`
  } else if (ecosystem === 'maven') {
    return `<!-- ⚠️ Security fixes - test before production deployment -->
<!-- Update these dependencies in your pom.xml -->

${packages.join('\n\n')}`
  } else {
    return `# ⚠️ Security fixes - test before production deployment
npm install ${packages.join(' ')}`
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
