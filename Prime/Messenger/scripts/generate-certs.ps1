param(
  [string[]]$Hosts
)

$root = Split-Path -Parent $PSScriptRoot
$certDir = Join-Path $root "certs"

New-Item -ItemType Directory -Path $certDir -Force | Out-Null

$mkcert = Get-Command mkcert -ErrorAction SilentlyContinue
if (-not $mkcert) {
  Write-Host "mkcert not found. Install: choco install mkcert" -ForegroundColor Yellow
  exit 1
}

if (-not $Hosts -or $Hosts.Count -eq 0) {
  $autoIps = @()
  try {
    $autoIps = Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object {
        $_.IPAddress -notlike "169.254.*" -and
        $_.IPAddress -ne "127.0.0.1" -and
        $_.IPAddress -ne "0.0.0.0"
      } |
      Select-Object -ExpandProperty IPAddress
  } catch {
    $autoIps = @()
  }
  $Hosts = @("localhost", "127.0.0.1") + $autoIps
}

$Hosts = $Hosts | Sort-Object -Unique

Write-Host ("Hosts: " + ($Hosts -join ", "))

& $mkcert.Source -install
& $mkcert.Source -pkcs12 -p12-file (Join-Path $certDir "prime-dev.pfx") @Hosts

Write-Host "Done: certs/prime-dev.pfx (password: changeit)" -ForegroundColor Green
