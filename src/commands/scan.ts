import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawnOsdoCli, getWorkspaceRoot, checkCliAvailable } from '../utils/cli'
import { parseSarifToDiagnostics, applyDiagnostics } from '../providers/diagnosticsProvider'
import { OsdoStatusBar } from '../providers/statusBarProvider'

/**
 * Ejecuta osdo scan en el proyecto o archivo indicado
 */
export async function runScan(
  collection: vscode.DiagnosticCollection,
  statusBar: OsdoStatusBar,
  targetPath?: string,
): Promise<void> {
  const workspaceRoot = getWorkspaceRoot()
  if (!workspaceRoot) {
    void vscode.window.showErrorMessage('OSDO: Abre una carpeta de proyecto para escanear')
    return
  }

  // Verificar CLI disponible
  const { available, version } = await checkCliAvailable(workspaceRoot)
  if (!available) {
    const action = await vscode.window.showErrorMessage(
      'OSDO CLI no encontrado. Instala @osdo/cli con: npm install -g @osdo/cli',
      'Ver documentación',
    )
    if (action === 'Ver documentación') {
      void vscode.env.openExternal(vscode.Uri.parse('https://github.com/opensecdevops/osdo-cli'))
    }
    return
  }

  statusBar.showScanning()

  const config = vscode.workspace.getConfiguration('osdo')
  const scanTypes = config.get<string[]>('scan.scanType') ?? ['sast', 'secrets']
  const severity = config.get<string>('scan.severity') ?? 'high'

  // Crear archivo temporal para el output SARIF
  const sarifOutputPath = path.join(os.tmpdir(), `osdo-scan-${Date.now()}.sarif`)

  const scanTarget = targetPath ?? workspaceRoot
  const args = [
    'scan',
    '--path', scanTarget,
    '--output', 'json',
    '--fail-on', severity,
    '--report',
    ...scanTypes.flatMap(t => ['--type', t]),
  ]

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `OSDO: Escaneando ${path.basename(scanTarget)}...`,
      cancellable: false,
    },
    async () => {
      const result = await spawnOsdoCli(args, workspaceRoot)

      // Leer SARIF desde el archivo de reporte generado
      // osdo scan --report guarda en .osdo/reports/scan-report.json
      const reportPath = path.join(workspaceRoot, '.osdo', 'reports', 'scan-report.json')

      let diagnosticMap = new Map<string, vscode.Diagnostic[]>()

      if (fs.existsSync(reportPath)) {
        try {
          const reportContent = fs.readFileSync(reportPath, 'utf-8')
          // El reporte JSON puede contener resultados SARIF embebidos
          // o podemos parsear el formato nativo de OSDO
          diagnosticMap = parseOsdoReport(reportContent, workspaceRoot)
        } catch {
          console.error('[OSDO] Error leyendo reporte:', reportPath)
        }
      } else if (result.stdout) {
        // Intentar parsear stdout como SARIF
        try {
          diagnosticMap = parseSarifToDiagnostics(result.stdout, workspaceRoot)
        } catch {
          console.error('[OSDO] Output no es SARIF válido')
        }
      }

      applyDiagnostics(collection, diagnosticMap)

      // Calcular score desde los hallazgos (simplificado)
      const totalFindings = [...diagnosticMap.values()].flat()
      const criticalOrHigh = totalFindings.filter(
        d => d.severity === vscode.DiagnosticSeverity.Error,
      ).length
      const score = Math.max(0, 100 - criticalOrHigh * 10)
      statusBar.showScore(score)

      const findingsCount = totalFindings.length
      if (findingsCount === 0) {
        void vscode.window.showInformationMessage(
          `OSDO: Sin hallazgos de seguridad en ${path.basename(scanTarget)} (CLI ${version})`,
        )
      } else {
        void vscode.window.showWarningMessage(
          `OSDO: ${findingsCount} hallazgos encontrados en ${path.basename(scanTarget)}`,
          'Ver problemas',
        ).then(action => {
          if (action === 'Ver problemas') {
            void vscode.commands.executeCommand('workbench.panel.markers.view.focus')
          }
        })
      }
    },
  )

  // Limpiar archivo temporal
  if (fs.existsSync(sarifOutputPath)) {
    fs.unlinkSync(sarifOutputPath)
  }
}

/**
 * Parsea el formato de reporte JSON nativo de OSDO
 * El reporte tiene: { scanners: [{name, findings: [{file, line, message, severity}]}] }
 */
function parseOsdoReport(
  reportJson: string,
  workspaceRoot: string,
): Map<string, vscode.Diagnostic[]> {
  const diagnosticMap = new Map<string, vscode.Diagnostic[]>()

  try {
    const report = JSON.parse(reportJson) as {
      scanners?: Array<{
        name?: string
        findings?: Array<{
          file?: string
          line?: number
          column?: number
          message?: string
          severity?: string
          ruleId?: string
        }>
      }>
    }

    for (const scanner of report.scanners ?? []) {
      const toolName = scanner.name ?? 'OSDO'
      for (const finding of scanner.findings ?? []) {
        const filePath = finding.file
          ? path.isAbsolute(finding.file)
            ? finding.file
            : path.join(workspaceRoot, finding.file)
          : workspaceRoot

        const line = Math.max((finding.line ?? 1) - 1, 0)
        const col  = Math.max((finding.column ?? 1) - 1, 0)
        const range = new vscode.Range(line, col, line, col + 80)

        const severityMap: Record<string, vscode.DiagnosticSeverity> = {
          critical: vscode.DiagnosticSeverity.Error,
          high:     vscode.DiagnosticSeverity.Error,
          medium:   vscode.DiagnosticSeverity.Warning,
          low:      vscode.DiagnosticSeverity.Information,
          info:     vscode.DiagnosticSeverity.Hint,
        }

        const severity = severityMap[finding.severity?.toLowerCase() ?? 'medium']
          ?? vscode.DiagnosticSeverity.Warning

        const diagnostic = new vscode.Diagnostic(
          range,
          `[${toolName}] ${finding.message ?? 'Hallazgo de seguridad'}`,
          severity,
        )
        diagnostic.source = `OSDO (${toolName})`
        diagnostic.code = finding.ruleId

        if (!diagnosticMap.has(filePath)) {
          diagnosticMap.set(filePath, [])
        }
        diagnosticMap.get(filePath)!.push(diagnostic)
      }
    }
  } catch (e) {
    console.error('[OSDO] Error parseando reporte:', e)
  }

  return diagnosticMap
}
