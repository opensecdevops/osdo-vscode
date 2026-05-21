import * as vscode from 'vscode'
import * as path from 'path'

interface SarifLocation {
  physicalLocation?: {
    artifactLocation?: {
      uri?: string
    }
    region?: {
      startLine?: number
      startColumn?: number
      endLine?: number
      endColumn?: number
    }
  }
}

interface SarifResult {
  ruleId?: string
  message?: { text?: string }
  level?: 'error' | 'warning' | 'note' | 'none'
  locations?: SarifLocation[]
}

interface SarifRun {
  results?: SarifResult[]
  tool?: {
    driver?: {
      name?: string
    }
  }
}

interface SarifLog {
  runs?: SarifRun[]
}

/**
 * Convierte el nivel SARIF a severidad de VS Code
 */
function sarifLevelToSeverity(level?: string): vscode.DiagnosticSeverity {
  switch (level) {
    case 'error':   return vscode.DiagnosticSeverity.Error
    case 'warning': return vscode.DiagnosticSeverity.Warning
    case 'note':    return vscode.DiagnosticSeverity.Information
    default:        return vscode.DiagnosticSeverity.Warning
  }
}

/**
 * Parsea el output SARIF de osdo scan y genera un mapa de DiagnosticCollections
 */
export function parseSarifToDiagnostics(
  sarifContent: string,
  workspaceRoot: string,
): Map<string, vscode.Diagnostic[]> {
  const diagnosticMap = new Map<string, vscode.Diagnostic[]>()

  let sarif: SarifLog
  try {
    sarif = JSON.parse(sarifContent) as SarifLog
  } catch {
    console.error('[OSDO] Error parseando SARIF:', sarifContent.substring(0, 200))
    return diagnosticMap
  }

  for (const run of sarif.runs ?? []) {
    const toolName = run.tool?.driver?.name ?? 'OSDO'

    for (const result of run.results ?? []) {
      const location = result.locations?.[0]
      if (!location?.physicalLocation) continue

      const uri = location.physicalLocation.artifactLocation?.uri
      if (!uri) continue

      // Construir URI absoluta
      const absolutePath = uri.startsWith('file://')
        ? vscode.Uri.parse(uri).fsPath
        : path.join(workspaceRoot, uri.replace(/^\.\//, ''))

      const region = location.physicalLocation.region
      const startLine = Math.max((region?.startLine ?? 1) - 1, 0)
      const startCol  = Math.max((region?.startColumn ?? 1) - 1, 0)
      const endLine   = Math.max((region?.endLine ?? region?.startLine ?? 1) - 1, 0)
      const endCol    = Math.max((region?.endColumn ?? 80) - 1, 0)

      const range = new vscode.Range(startLine, startCol, endLine, endCol)
      const message = `[${toolName}] ${result.message?.text ?? 'Hallazgo de seguridad'}`
      const severity = sarifLevelToSeverity(result.level)

      const diagnostic = new vscode.Diagnostic(range, message, severity)
      diagnostic.source = `OSDO (${toolName})`
      diagnostic.code = result.ruleId

      const fileKey = absolutePath
      if (!diagnosticMap.has(fileKey)) {
        diagnosticMap.set(fileKey, [])
      }
      diagnosticMap.get(fileKey)!.push(diagnostic)
    }
  }

  return diagnosticMap
}

/**
 * Aplica los diagnósticos a la colección de VS Code
 */
export function applyDiagnostics(
  collection: vscode.DiagnosticCollection,
  diagnosticMap: Map<string, vscode.Diagnostic[]>,
): void {
  // Limpiar anteriores
  collection.clear()

  for (const [filePath, diagnostics] of diagnosticMap) {
    const uri = vscode.Uri.file(filePath)
    collection.set(uri, diagnostics)
  }
}
