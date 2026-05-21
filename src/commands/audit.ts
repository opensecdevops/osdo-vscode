import * as vscode from 'vscode'
import { spawnOsdoCli, getWorkspaceRoot, checkCliAvailable } from '../utils/cli'

/**
 * Ejecuta osdo audit para analizar los pipelines CI/CD del proyecto
 */
export async function runAudit(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot()
  if (!workspaceRoot) {
    void vscode.window.showErrorMessage('OSDO: Abre una carpeta de proyecto para auditar')
    return
  }

  const { available } = await checkCliAvailable(workspaceRoot)
  if (!available) {
    void vscode.window.showErrorMessage(
      'OSDO CLI no encontrado. Instala @osdo/cli con: npm install -g @osdo/cli',
    )
    return
  }

  const platform = await vscode.window.showQuickPick(
    [
      { label: '$(github) GitHub Actions', value: 'github' },
      { label: '$(git-branch) GitLab CI', value: 'gitlab' },
    ],
    { placeHolder: 'Selecciona la plataforma CI/CD a auditar' },
  )
  if (!platform) return

  const outputChannel = vscode.window.createOutputChannel('OSDO Audit')
  outputChannel.show(true)
  outputChannel.appendLine(`\nIniciando auditoría de pipelines ${platform.value.toUpperCase()}...\n`)

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'OSDO: Auditando pipelines CI/CD...',
      cancellable: false,
    },
    async () => {
      const args = ['audit', '--platform', platform.value, '--format', 'table']
      const result = await spawnOsdoCli(args, workspaceRoot)

      outputChannel.appendLine(result.stdout || result.stderr)

      if (result.exitCode === 0 || result.exitCode === 1) {
        void vscode.window.showInformationMessage(
          'OSDO: Auditoría completada — ver panel "OSDO Audit"',
          'Ver resultados',
        ).then(action => {
          if (action === 'Ver resultados') outputChannel.show(true)
        })
      } else {
        void vscode.window.showErrorMessage('OSDO: Error ejecutando auditoría — ver panel OSDO Audit')
      }
    },
  )
}
