# Smoke test HTTP Fase 6 - Goals (run against http://localhost:3000)
$ErrorActionPreference = 'Stop'
$base = "http://localhost:3000/api"

# ---- login (parent + child) ----
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"maria@familia.dev","password":"password123"}'
$H = @{ Authorization = "Bearer $($login.accessToken)" }
$loginC = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"lucas@familia.dev","password":"password123"}'
$HC = @{ Authorization = "Bearer $($loginC.accessToken)" }
$loginC2 = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"anais@familia.dev","password":"password123"}'
$HC2 = @{ Authorization = "Bearer $($loginC2.accessToken)" }
$lucasId = $loginC.user.id
Write-Output "LOGIN OK (parent + 2 children)"

# ---- 1. create goal for own child ----
$created = Invoke-RestMethod -Method Post -Uri "$base/children/$lucasId/goals" -Headers $H -ContentType "application/json" -Body '{"name":"Bicicleta","targetPoints":500}'
$gid = $created.id
if ($created.status -eq 'ACTIVE' -and $created.childId -eq $lucasId) { Write-Output "OK  create -> id=$gid status=ACTIVE" } else { throw "create: $($created | ConvertTo-Json -Compress)" }

# ---- 2. targetPoints invalido -> 400 ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/children/$lucasId/goals" -Headers $H -ContentType "application/json" -Body '{"name":"X","targetPoints":0}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] targetPoints invalido (expected 400)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 400) { Write-Output "OK  [400] targetPoints invalido" } else { Write-Output "FAIL [$st] targetPoints invalido (expected 400)"; throw 1 }
}

# ---- 3. child (anais) no es hijo del padre que intenta crear meta para otro padre -> N/A; probar hijo ajeno con id inventado ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/children/999999/goals" -Headers $H -ContentType "application/json" -Body '{"name":"X","targetPoints":100}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] childId inexistente (expected 404)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 404) { Write-Output "OK  [404] childId inexistente" } else { Write-Output "FAIL [$st] childId inexistente (expected 404)"; throw 1 }
}

# ---- 4. list by child (parent) incluye la creada ----
$list = Invoke-RestMethod -Uri "$base/children/$lucasId/goals" -Headers $H
if ($list | Where-Object { $_.id -eq $gid }) { Write-Output "OK  list por hijo incluye la creada" } else { throw "list no incluye $gid" }

# ---- 5. child (lucas) ve /goals/mine ----
$mine = Invoke-RestMethod -Uri "$base/goals/mine" -Headers $HC
if ($mine | Where-Object { $_.id -eq $gid }) { Write-Output "OK  /goals/mine incluye la meta del hijo" } else { throw "mine no incluye $gid" }

# ---- 6. otro hijo (anais) NO ve la meta de lucas en /goals/mine ----
$mine2 = Invoke-RestMethod -Uri "$base/goals/mine" -Headers $HC2
if (-not ($mine2 | Where-Object { $_.id -eq $gid })) { Write-Output "OK  otro hijo no ve la meta ajena" } else { throw "anais vio la meta de lucas" }

# ---- 7. hijo no puede crear metas (403) ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/children/$lucasId/goals" -Headers $HC -ContentType "application/json" -Body '{"name":"X","targetPoints":100}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] hijo crea meta (expected 403)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 403) { Write-Output "OK  [403] hijo no puede crear metas" } else { Write-Output "FAIL [$st] hijo crea meta (expected 403)"; throw 1 }
}

# ---- 8. update targetPoints ----
$upd = Invoke-RestMethod -Method Patch -Uri "$base/goals/$gid" -Headers $H -ContentType "application/json" -Body '{"targetPoints":750}'
if ($upd.targetPoints -eq 750) { Write-Output "OK  update targetPoints" } else { throw "update: $($upd | ConvertTo-Json -Compress)" }

# ---- 9. delete (ACTIVE) -> 204 ----
$r204 = Invoke-WebRequest -Method Delete -Uri "$base/goals/$gid" -Headers $H -UseBasicParsing
if ([int]$r204.StatusCode -eq 204) { Write-Output "OK  [204] delete meta ACTIVE" } else { throw "delete devolvio $($r204.StatusCode)" }

# ---- 10. delete de una meta ACHIEVED (usar la meta seed 'Videoconsola', status ACTIVE en seed asi que probamos conflicto simulando 2a vez sobre la ya borrada -> 404) ----
try {
  Invoke-WebRequest -Method Delete -Uri "$base/goals/$gid" -Headers $H -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] delete ya borrada (expected 404)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 404) { Write-Output "OK  [404] delete ya borrada" } else { Write-Output "FAIL [$st] delete ya borrada (expected 404)"; throw 1 }
}

# ---- 11. sin token -> 401 ----
try {
  Invoke-WebRequest -Uri "$base/goals/mine" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] mine sin token (expected 401)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 401) { Write-Output "OK  [401] mine sin token" } else { Write-Output "FAIL [$st] mine sin token (expected 401)"; throw 1 }
}

Write-Output ""
Write-Output "SMOKE TEST: ALL OK"
