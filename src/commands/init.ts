import * as vscode from 'vscode'
import { getWorkspaceRoot, checkCliAvailable } from '../utils/cli'

/**
 * Ejecuta osdo init para inicializar el Golden Path en el proyecto
 */
export async function runInit(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot()
  if (!workspaceRoot) {
    void vscode.window.showErrorMessage('OSDO: Abre una carpeta de proyecto para inicializar')
    return
  }

  const { available } = await checkCliAvailable(workspaceRoot)
  if (!available) {
    void vscode.window.showErrorMessage(
      'OSDO CLI no encontrado. Instala @osdo/cli con: npm install -g @osdo/cli',
    )
    return
  }

  const confirm = await vscode.window.showWarningMessage(
    '¿Inicializar OSDO en este proyecto? Esto creará el directorio .osdo/ y configurará los workflows de seguridad.',
    { modal: true },
    'Inicializar',
  )
  if (confirm !== 'Inicializar') return

  const terminal = vscode.window.createTerminal({
    name: 'OSDO Init',
    cwd: workspaceRoot,
  })
  terminal.show()
  terminal.sendText('osdo init')
}
