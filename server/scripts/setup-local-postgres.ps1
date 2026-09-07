[CmdletBinding()]
param(
  [string]$HostName = 'localhost',
  [int]$Port = 5432,
  [string]$Database = 'house_of_wealth',
  [string]$Username = '',
  [switch]$SkipDatabaseCreation
)

$ErrorActionPreference = 'Stop'

function Get-PlainTextSecret([securestring]$Secret) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function Invoke-CheckedCommand([string]$Command, [string[]]$Arguments) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $Command $($Arguments -join ' ')"
  }
}

Write-Host 'House of Wealth local PostgreSQL setup' -ForegroundColor Cyan
Write-Host ''

$psqlCommand = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psqlCommand) {
  $psqlCommand = Get-ChildItem -Path 'C:\Program Files\PostgreSQL' -Filter psql.exe -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Directory.Name -eq 'bin' } |
    Sort-Object FullName -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $psqlCommand) {
  throw 'psql.exe was not found. Install PostgreSQL command-line tools or add its bin folder to PATH.'
}
Write-Host "Using PostgreSQL client: $psqlCommand"

if (-not $Username) {
  $Username = Read-Host 'PostgreSQL username'
}
$Username = $Username.Trim()
if ($Database -notmatch '^[A-Za-z0-9_]+$') {
  throw 'Database name may contain only letters, numbers, and underscores.'
}
$password = Get-PlainTextSecret (Read-Host 'PostgreSQL password' -AsSecureString)
$env:PGPASSWORD = $password

try {
  if (-not $SkipDatabaseCreation) {
    Write-Host "Checking database '$Database'..."
    $queryOutput = @(& $psqlCommand -h $HostName -p $Port -U $Username -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$Database'" 2>&1)
    $psqlExitCode = $LASTEXITCODE
    if ($psqlExitCode -ne 0) {
      $details = ($queryOutput -join "`n").Trim()
      if (-not $details) {
        $details = 'No error text was returned by psql.'
      }
      throw "Could not connect to PostgreSQL. $details Check host, port, username, password, and that PostgreSQL is running."
    }
    $exists = ($queryOutput -join '').Trim()

    if ($exists -ne '1') {
      Write-Host "Creating database '$Database'..."
      Invoke-CheckedCommand $psqlCommand @('-h', $HostName, '-p', $Port, '-U', $Username, '-d', 'postgres', '-c', ('CREATE DATABASE "' + $Database + '";'))
    }
    else {
      Write-Host "Database '$Database' already exists."
    }
  }

  $encodedUsername = [Uri]::EscapeDataString($Username)
  $encodedPassword = [Uri]::EscapeDataString($password)
  $connectionString = "postgresql://${encodedUsername}:${encodedPassword}@${HostName}:${Port}/${Database}"
  $envPath = Join-Path $PSScriptRoot '..\.env'
  @(
    ('DATABASE_URL="' + $connectionString + '"')
    'AUTH_MODE=mock'
    'DEFAULT_COUNTRY_NODE=CN-MYS'
    'DEFAULT_ORGANISATION=ORG-PUBLIC'
    'PORT=3001'
    'NODE_ENV=development'
  ) | Set-Content -Path $envPath -Encoding utf8
  Write-Host "Wrote $envPath"

  Push-Location (Join-Path $PSScriptRoot '..')
  try {
    Write-Host 'Generating Prisma client...'
    Invoke-CheckedCommand 'npm' @('run', 'prisma:generate')

    $migrationDirectory = Join-Path (Get-Location) 'prisma\migrations'
    if (Test-Path $migrationDirectory) {
      Write-Host 'Applying existing Prisma migrations...'
      Invoke-CheckedCommand 'npx' @('prisma', 'migrate', 'dev')
    }
    else {
      Write-Host 'Creating and applying the initial Prisma migration...'
      Invoke-CheckedCommand 'npx' @('prisma', 'migrate', 'dev', '--name', 'initial_schema')
    }
  }
  finally {
    Pop-Location
  }

  Write-Host ''
  Write-Host 'Database setup complete.' -ForegroundColor Green
  Write-Host 'Start the API with: cd server; npm run start:dev'
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
