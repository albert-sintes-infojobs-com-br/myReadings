# Smoke test HTTP Fase 5 - Books (run against http://localhost:3000)
$ErrorActionPreference = 'Stop'
$base = "http://localhost:3000/api"

# ---- login (parent) ----
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"maria@familia.dev","password":"password123"}'
$H = @{ Authorization = "Bearer $($login.accessToken)" }
Write-Output "LOGIN parent OK"

# ---- child login ----
$loginC = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"lucas@familia.dev","password":"password123"}'
$HC = @{ Authorization = "Bearer $($loginC.accessToken)" }
Write-Output "LOGIN child OK"

# ---- 1. create book (parent) ----
$created = Invoke-RestMethod -Method Post -Uri "$base/books" -Headers $H -ContentType "application/json" -Body '{"title":"Dune","author":"Frank Herbert"}'
$bid = $created.id
if ($created.status -eq 'NOT_STARTED') { Write-Output "OK  create -> id=$bid (status default NOT_STARTED)" } else { throw "status inesperado: $($created.status)" }

# ---- 2. create invalid rating -> 400 ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/books" -Headers $H -ContentType "application/json" -Body '{"title":"X","author":"Y","rating":9}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] create rating invalido (expected 400)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 400) { Write-Output "OK  [400] create rating invalido" } else { Write-Output "FAIL [$st] create rating invalido (expected 400)"; throw 1 }
}

# ---- 3. create endDate < startDate -> 400 ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/books" -Headers $H -ContentType "application/json" -Body '{"title":"X","author":"Y","startDate":"2026-02-01","endDate":"2026-01-01"}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] create endDate<startDate (expected 400)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 400) { Write-Output "OK  [400] create endDate<startDate" } else { Write-Output "FAIL [$st] create endDate<startDate (expected 400)"; throw 1 }
}

# ---- 4. get by id ----
$got = Invoke-RestMethod -Uri "$base/books/$bid" -Headers $H
if ($got.id -eq $bid -and $got.title -eq "Dune") { Write-Output "OK  get by id" } else { throw "get devolvio: $($got | ConvertTo-Json -Compress)" }

# ---- 5. valid transition NOT_STARTED -> READING ----
$upd = Invoke-RestMethod -Method Patch -Uri "$base/books/$bid" -Headers $H -ContentType "application/json" -Body '{"status":"READING","startDate":"2026-01-10"}'
if ($upd.status -eq 'READING') { Write-Output "OK  transicion NOT_STARTED -> READING" } else { throw "status: $($upd.status)" }

# ---- 6. invalid transition READING -> NOT_STARTED -> 400 ----
try {
  Invoke-WebRequest -Method Patch -Uri "$base/books/$bid" -Headers $H -ContentType "application/json" -Body '{"status":"NOT_STARTED"}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] transicion invalida (expected 400)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 400) { Write-Output "OK  [400] transicion invalida READING->NOT_STARTED" } else { Write-Output "FAIL [$st] transicion invalida (expected 400)"; throw 1 }
}

# ---- 7. valid transition READING -> FINISHED ----
$fin = Invoke-RestMethod -Method Patch -Uri "$base/books/$bid" -Headers $H -ContentType "application/json" -Body '{"status":"FINISHED","endDate":"2026-01-20"}'
if ($fin.status -eq 'FINISHED') { Write-Output "OK  transicion READING -> FINISHED" } else { throw "status: $($fin.status)" }

# ---- 8. cannot leave FINISHED -> 400 ----
try {
  Invoke-WebRequest -Method Patch -Uri "$base/books/$bid" -Headers $H -ContentType "application/json" -Body '{"status":"READING"}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] salir de FINISHED (expected 400)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 400) { Write-Output "OK  [400] no se puede salir de FINISHED" } else { Write-Output "FAIL [$st] salir de FINISHED (expected 400)"; throw 1 }
}

# ---- 9. list with filter status=FINISHED includes it ----
$list = Invoke-RestMethod -Uri "$base/books?status=FINISHED" -Headers $H
if ($list | Where-Object { $_.id -eq $bid }) { Write-Output "OK  list filtro status=FINISHED incluye el libro" } else { throw "filtro no incluyo el libro" }

# ---- 10. categoryId ajeno -> 400 ----
$catChild = Invoke-RestMethod -Method Post -Uri "$base/categories" -Headers $HC -ContentType "application/json" -Body '{"title":"Cat de hijo","colorHex":"#00FF00"}'
try {
  Invoke-WebRequest -Method Post -Uri "$base/books" -Headers $H -ContentType "application/json" -Body ('{"title":"X","author":"Y","categoryId":' + $catChild.id + '}') -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] categoryId ajeno (expected 400)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 400) { Write-Output "OK  [400] categoryId ajeno rechazado" } else { Write-Output "FAIL [$st] categoryId ajeno (expected 400)"; throw 1 }
}
$null = Invoke-RestMethod -Method Delete -Uri "$base/categories/$($catChild.id)" -Headers $HC

# ---- 11. child cannot see/edit parent's book (owner-only, no shared view) ----
try {
  Invoke-WebRequest -Uri "$base/books/$bid" -Headers $HC -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] child ve libro del padre (expected 404)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 404) { Write-Output "OK  [404] child no ve el libro del padre (privado)" } else { Write-Output "FAIL [$st] child ve libro padre (expected 404)"; throw 1 }
}

# ---- 12. delete -> 204 ----
$r204 = Invoke-WebRequest -Method Delete -Uri "$base/books/$bid" -Headers $H -UseBasicParsing
if ([int]$r204.StatusCode -eq 204) { Write-Output "OK  [204] delete" } else { throw "delete devolvio $($r204.StatusCode)" }

# ---- 13. get deleted -> 404 ----
try {
  Invoke-WebRequest -Uri "$base/books/$bid" -Headers $H -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] get borrado (expected 404)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 404) { Write-Output "OK  [404] get borrado" } else { Write-Output "FAIL [$st] get borrado (expected 404)"; throw 1 }
}

# ---- 14. no token -> 401 ----
try {
  Invoke-WebRequest -Uri "$base/books" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] list sin token (expected 401)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 401) { Write-Output "OK  [401] list sin token" } else { Write-Output "FAIL [$st] list sin token (expected 401)"; throw 1 }
}

Write-Output ""
Write-Output "SMOKE TEST: ALL OK"
