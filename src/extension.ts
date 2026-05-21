import * as vscode from 'vscode'
import { runScan } from './commands/scan'
import { runAudit } from './commands/audit'
import { runInit } from './commands/init'
import { OsdoStatusBar } from './providers/statusBarProvider'

let diagnosticCollection: vscode.DiagnosticCollection
let statusBar: OsdoStatusBar
let saveListener: vscode.Disposable | undefined

export function activate(context: vscode.ExtensionContext): void {
  console.log('[OSDO] Extensión activada')

  // Crear colección de diagnósticos (mostrará hallazgos inline en el editor)
  diagnosticCollection = vscode.languages.createDiagnosticCollection('osdo')
  context.subscriptions.push(diagnosticCollection)

  // Status bar
  statusBar = new OsdoStatusBar()
  context.subscriptions.push({ dispose: () => statusBar.dispose() })

  // Registrar comandos
  context.subscriptions.push(
    vscode.commands.registerCommand('osdo.scan', () =>
      runScan(diagnosticCollection, statusBar),
    ),

    vscode.commands.registerCommand('osdo.scanFile', () => {
      const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath
      return runScan(diagnosticCollection, statusBar, activeFile)
    }),

    vscode.commands.registerCommand('osdo.audit', () =>
      runAudit(),
    ),

    vscode.commands.registerCommand('osdo.init', () =>
      runInit(),
    ),

    vscode.commands.registerCommand('osdo.clearDiagnostics', () => {
      diagnosticCollection.clear()
      statusBar.showReady()
      void vscode.window.showInformationMessage('OSDO: Diagnósticos limpiados')
    }),
  )

  // Listener de onSave (si está habilitado en configuración)
  registerSaveListener(context)

  // Actualizar listener cuando cambia la configuración
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('osdo.scan.onSave')) {
        saveListener?.dispose()
        registerSaveListener(context)
      }
    }),
  )

  console.log('[OSDO] Extensión lista. Comandos registrados: osdo.scan, osdo.audit, osdo.init')
}

function registerSaveListener(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration('osdo')
  if (config.get<boolean>('scan.onSave', false)) {
    saveListener = vscode.workspace.onDidSaveTextDocument(doc => {
      void runScan(diagnosticCollection, statusBar, doc.uri.fsPath)
    })
    context.subscriptions.push(saveListener)
  }
}

export function deactivate(): void {
  diagnosticCollection?.dispose()
  statusBar?.dispose()
  saveListener?.dispose()
  console.log('[OSDO] Extensión desactivada')
}
