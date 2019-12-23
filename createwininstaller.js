const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })

function getInstallerConfig () {
  console.log('creating windows installer')
  const rootPath = path.join('./')
  const outPath = path.join(rootPath, 'propman-win32-x64')

  return Promise.resolve({
    appDirectory: path.join(outPath, ''),
    authors: 'HK-Development',
    noMsi: true,
    outputDirectory: path.join(outPath, 'windows-installer'),
    exe: 'propman.exe',
    setupExe: 'WindowsSetup_x64.exe',
    setupIcon: path.join(rootPath, 'icon.ico')
  })
}
