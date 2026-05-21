import * as vscode from 'vscode'

/**
 * Gestiona el ítem de la barra de estado que muestra la puntuación OSDO
 */
export class OsdoStatusBar {
  private readonly item: vscode.StatusBarItem

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    )
    this.item.command = 'osdo.scan'
    this.item.tooltip = 'OSDO Security — Click para escanear'
    this.showReady()
  }

  showReady(): void {
    const config = vscode.workspace.getConfiguration('osdo')
    if (!config.get<boolean>('statusBar.show', true)) {
      this.item.hide()
      return
    }
    this.item.text = '$(shield) OSDO'
    this.item.backgroundColor = undefined
    this.item.show()
  }

  showScanning(): void {
    this.item.text = '$(sync~spin) OSDO: Escaneando...'
    this.item.show()
  }

  showScore(score: number): void {
    const config = vscode.workspace.getConfiguration('osdo')
    if (!config.get<boolean>('statusBar.show', true)) return

    const icon = score >= 80 ? '$(pass)' : score >= 50 ? '$(warning)' : '$(error)'
    const color = score >= 80
      ? undefined
      : score >= 50
        ? new vscode.ThemeColor('statusBarItem.warningBackground')
        : new vscode.ThemeColor('statusBarItem.errorBackground')

    this.item.text = `${icon} OSDO: ${score}/100`
    this.item.backgroundColor = color
    this.item.tooltip = `OSDO Security Score: ${score}/100 — Click para re-escanear`
    this.item.show()
  }

  showError(message: string): void {
    this.item.text = '$(error) OSDO: Error'
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground')
    this.item.tooltip = `OSDO Error: ${message}`
    this.item.show()
  }

  dispose(): void {
    this.item.dispose()
  }
}
