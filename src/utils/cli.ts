import * as cp from 'child_process'
import * as vscode from 'vscode'

export interface CliResult {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Obtiene la ruta al binario osdo desde la configuración o el PATH
 */
export function getOsdoPath(): string {
  const config = vscode.workspace.getConfiguration('osdo')
  return config.get<string>('cli.path') || 'osdo'
}

/**
 * Ejecuta el OSDO CLI con los argumentos dados
 */
export function spawnOsdoCli(args: string[], cwd: string): Promise<CliResult> {
  const cliPath = getOsdoPath()

  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''

    const proc = cp.spawn(cliPath, args, {
      cwd,
      env: { ...process.env },
      shell: false,
    })

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('error', (err) => {
      // CLI no encontrado o error de permisos
      resolve({
        stdout: '',
        stderr: `Error al ejecutar OSDO CLI: ${err.message}\nVerifica que @osdo/cli esté instalado: npm install -g @osdo/cli`,
        exitCode: 127,
      })
    })

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 })
    })
  })
}

/**
 * Verifica si el OSDO CLI está disponible y retorna su versión
 */
export async function checkCliAvailable(cwd: string): Promise<{ available: boolean; version?: string }> {
  const result = await spawnOsdoCli(['--version'], cwd)
  if (result.exitCode === 127) {
    return { available: false }
  }
  return { available: true, version: result.stdout.trim() }
}

/**
 * Obtiene el directorio de trabajo del workspace
 */
export function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
}
