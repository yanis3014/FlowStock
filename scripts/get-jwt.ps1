# Register + Verify email + Login puis affiche le JWT (access_token)
# Usage: .\scripts\get-jwt.ps1 [BASE_URL]
# Exemple: .\scripts\get-jwt.ps1 http://localhost:3000

param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

# 1) Récupérer le token CSRF + cookie (Invoke-WebRequest pour garder les cookies)
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrfWeb = Invoke-WebRequest -Uri "$BaseUrl/csrf-token" -WebSession $session -Method Get -UseBasicParsing
$csrfToken = ($csrfWeb.Content | ConvertFrom-Json).csrfToken

# 2) Register
$email = "jwt-user-" + [int][double]::Parse((Get-Date -UFormat %s)) + "@example.com"
$body = @{
  email = $email
  password = "SecurePass123!"
  first_name = "JWT"
  last_name = "User"
  company_name = "JWT Test Company"
} | ConvertTo-Json

$registerResp = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -WebSession $session -Method Post `
  -ContentType "application/json" -Headers @{ "X-CSRF-Token" = $csrfToken } -Body $body

$verifyToken = $registerResp.data.email_verification_token
if (-not $verifyToken) {
  Write-Error "Register did not return email_verification_token (API may need NODE_ENV=development or test)"
  exit 1
}

# 3) Verify email
Invoke-WebRequest -Uri "$BaseUrl/auth/verify-email?token=$verifyToken" -WebSession $session -Method Get -UseBasicParsing | Out-Null

# 4) Login (réutiliser la même session = mêmes cookies)
$loginBody = @{ email = $email; password = "SecurePass123!" } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -WebSession $session -Method Post `
  -ContentType "application/json" -Headers @{ "X-CSRF-Token" = $csrfToken } -Body $loginBody

$accessToken = $loginResp.data.access_token
Write-Host "Email: $email"
Write-Host "JWT (access_token):"
Write-Host $accessToken
# Optionnel: écrire dans un fichier
$accessToken | Set-Content -Path "token.txt" -NoNewline
Write-Host ""
Write-Host "Token also saved to token.txt"
