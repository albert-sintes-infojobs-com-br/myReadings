# Smoke test HTTP - Auth + Users refactor a 3 capas (Fase 5)
$ErrorActionPreference = 'Stop'
$base = "http://localhost:3000/api"
$rand = Get-Random
$email = "smoke$rand@test.dev"

# ---- 1. register ----
$reg = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body "{`"name`":`"Smoke Parent`",`"email`":`"$email`",`"password`":`"password123`"}"
if ($reg.role -eq 'PARENT' -and -not $reg.passwordHash) { Write-Output "OK  register -> PARENT sin passwordHash" } else { throw "register: $($reg | ConvertTo-Json -Compress)" }

# ---- 2. register duplicado -> 409 ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body "{`"name`":`"X`",`"email`":`"$email`",`"password`":`"password123`"}" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] register duplicado (expected 409)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 409) { Write-Output "OK  [409] register email duplicado" } else { Write-Output "FAIL [$st] register duplicado (expected 409)"; throw 1 }
}

# ---- 3. register password corta -> 400 (antes 401; cambio intencional del refactor) ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body '{"name":"X","email":"shortpw@test.dev","password":"cort"}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] register password corta (expected 400)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 400) { Write-Output "OK  [400] register password corta (antes era 401; ver notas del refactor)" } else { Write-Output "FAIL [$st] register password corta (expected 400)"; throw 1 }
}

# ---- 4. login ----
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body "{`"email`":`"$email`",`"password`":`"password123`"}"
$H = @{ Authorization = "Bearer $($login.accessToken)" }
if ($login.accessToken -and $login.user.email -eq $email) { Write-Output "OK  login -> accessToken + user" } else { throw "login: $($login | ConvertTo-Json -Compress)" }

# ---- 5. login credenciales invalidas -> 401 ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body "{`"email`":`"$email`",`"password`":`"malapass`"}" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] login mal (expected 401)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 401) { Write-Output "OK  [401] login credenciales invalidas" } else { Write-Output "FAIL [$st] login mal (expected 401)"; throw 1 }
}

# ---- 6. auth/me y users/me ----
$meAuth = Invoke-RestMethod -Uri "$base/auth/me" -Headers $H
$meUsers = Invoke-RestMethod -Uri "$base/users/me" -Headers $H
if ($meAuth.email -eq $email -and $meUsers.email -eq $email) { Write-Output "OK  /auth/me y /users/me devuelven el mismo usuario" } else { throw "me mismatch" }

# ---- 7. crear hijo ----
$childEmail = "hijosmoke$rand@test.dev"
$child = Invoke-RestMethod -Method Post -Uri "$base/users/children" -Headers $H -ContentType "application/json" -Body "{`"name`":`"Hijo Smoke`",`"email`":`"$childEmail`",`"password`":`"clave1234`"}"
if ($child.role -eq 'CHILD') { Write-Output "OK  crear hijo -> CHILD" } else { throw "child: $($child | ConvertTo-Json -Compress)" }

# ---- 8. listar hijos ----
$children = Invoke-RestMethod -Uri "$base/users/children" -Headers $H
if (($children | Where-Object { $_.id -eq $child.id })) { Write-Output "OK  listar hijos incluye el creado" } else { throw "hijo no aparece en la lista" }

# ---- 9. hijo no puede crear hijos -> 403 ----
$loginChild = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body "{`"email`":`"$($child.email)`",`"password`":`"clave1234`"}"
$HC = @{ Authorization = "Bearer $($loginChild.accessToken)" }
try {
  Invoke-WebRequest -Method Post -Uri "$base/users/children" -Headers $HC -ContentType "application/json" -Body '{"name":"X","email":"x@test.dev","password":"clave1234"}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] hijo crea hijo (expected 403)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 403) { Write-Output "OK  [403] hijo no puede crear hijos" } else { Write-Output "FAIL [$st] hijo crea hijo (expected 403)"; throw 1 }
}

Write-Output ""
Write-Output "SMOKE TEST: ALL OK"
