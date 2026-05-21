# OSDO Security — Extensión para VS Code

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-OSDO%20Security-blue)](https://marketplace.visualstudio.com/items?itemName=opensecdevops.osdo-security)
[![Open VSX](https://img.shields.io/badge/Open%20VSX-OSDO%20Security-purple)](https://open-vsx.org/extension/opensecdevops/osdo-security)

DevSecOps integrado en tu editor: scans de seguridad inline, auditoría de pipelines CI/CD y reportes SARIF directamente en VS Code.

## Funcionalidades

- **Scan inline**: Detecta vulnerabilidades (SAST, secretos, SCA) y las muestra subrayadas en el código
- **Barra de estado**: Muestra la puntuación de seguridad del proyecto en tiempo real
- **Auditoría CI/CD**: Analiza tus workflows de GitHub Actions o GitLab CI
- **Scan al guardar**: Opción para escanear automáticamente al guardar archivos
- **Menú contextual**: Click derecho en cualquier archivo para escanear

## Requisitos

1. [OSDO CLI](https://github.com/opensecdevops/osdo-cli) instalado globalmente:
   ```bash
   npm install -g @osdo/cli
   ```

2. Al menos una herramienta de escaneo instalada (semgrep, gitleaks, trivy, etc.)
   O usa la imagen Docker oficial: `ghcr.io/opensecdevops/osdo-scanner`

## Configuración

| Setting | Default | Descripción |
|---------|---------|-------------|
| `osdo.cli.path` | `osdo` | Ruta al binario OSDO CLI |
| `osdo.scan.onSave` | `false` | Escanear al guardar |
| `osdo.scan.severity` | `high` | Severidad mínima a reportar |
| `osdo.scan.scanType` | `[sast, secrets]` | Tipos de escaneo por defecto |
| `osdo.statusBar.show` | `true` | Mostrar score en barra de estado |

## Comandos

| Comando | Atajo | Descripción |
|---------|-------|-------------|
| OSDO: Escanear Seguridad del Proyecto | — | Escanea todo el proyecto |
| OSDO: Escanear Archivo Actual | — | Escanea solo el archivo abierto |
| OSDO: Auditar Pipeline CI/CD | — | Audita los workflows de CI/CD |
| OSDO: Inicializar Proyecto | — | Crea la configuración OSDO |
| OSDO: Limpiar Diagnósticos | — | Borra los hallazgos mostrados |

## Licencia

Apache 2.0 — ver [LICENSE](./LICENSE)
