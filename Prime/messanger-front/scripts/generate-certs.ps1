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
& $mkcert.Source -key-file (Join-Path $certDir "dev-key.pem") -cert-file (Join-Path $certDir "dev-cert.pem") @Hosts

Write-Host "Done: certs/dev-key.pem and certs/dev-cert.pem" -ForegroundColor Green

# Конвертация в .pfx для ASP.NET
Write-Host "Converting to .pfx for ASP.NET..." -ForegroundColor Yellow
$certPem = Join-Path $certDir "dev-cert.pem"
$keyPem = Join-Path $certDir "dev-key.pem"
$pfxPath = Join-Path $certDir "prime-dev.pfx"
$pfxPassword = "changeit"

try {
    # Используем OpenSSL для конвертации
    $openssl = Get-Command openssl -ErrorAction SilentlyContinue
    if ($openssl) {
        & openssl pkcs12 -export -out $pfxPath -inkey $keyPem -in $certPem -passout pass:$pfxPassword
        Write-Host "Done: certs/prime-dev.pfx (password: changeit)" -ForegroundColor Green
    } else {
        Write-Host "OpenSSL not found. Install: choco install openssl" -ForegroundColor Yellow
        Write-Host "Skipping .pfx conversion. Backend will use HTTP." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Failed to convert to .pfx: $_" -ForegroundColor Red
    Write-Host "Backend will use HTTP." -ForegroundColor Yellow
}
