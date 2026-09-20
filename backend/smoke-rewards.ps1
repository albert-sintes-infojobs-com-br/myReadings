# Smoke test HTTP Fase 7 - Rewards (run against http://localhost:3000)
$ErrorActionPreference = 'Stop'
$base = "http://localhost:3000/api"

# ---- login (parent + children) ----
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"maria@familia.dev","password":"password123"}'
$H = @{ Authorization = "Bearer $($login.accessToken)" }
$loginLucas = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"lucas@familia.dev","password":"password123"}'
$HLucas = @{ Authorization = "Bearer $($loginLucas.accessToken)" }
$loginAnais = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"anais@familia.dev","password":"password123"}'
$HAnais = @{ Authorization = "Bearer $($loginAnais.accessToken)" }
$lucasId = $loginLucas.user.id
Write-Output "LOGIN OK (parent + 2 children)"

# ---- setup: book NOT_STARTED (owned by lucas) + goal for lucas ----
$book = Invoke-RestMethod -Method Post -Uri "$base/books" -Headers $HLucas -ContentType "application/json" -Body '{"title":"Dune","author":"Frank Herbert"}'
$bookId = $book.id
$goal = Invoke-RestMethod -Method Post -Uri "$base/children/$lucasId/goals" -Headers $H -ContentType "application/json" -Body '{"name":"Bici","targetPoints":300}'
$goalId = $goal.id
$future = (Get-Date).AddDays(30).ToString('yyyy-MM-dd')
$past = '2020-01-01'
Write-Output "SETUP OK (book id=$bookId, goal id=$goalId)"

# ---- 1. create POINTS reward with goalId ----
$created = Invoke-RestMethod -Method Post -Uri "$base/books/$bookId/rewards" -Headers $H -ContentType "application/json" -Body "{`"type`":`"POINTS`",`"value`":200,`"deadline`":`"$future`",`"goalId`":$goalId}"
$rid = $created.id
if ($created.status -eq 'PENDING' -and $created.goalId -eq $goalId) { Write-Output "OK  create POINTS -> id=$rid status=PENDING" } else { throw "create: $($created | ConvertTo-Json -Compress)" }

# ---- 2. POINTS sin goalId -> 400 ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/books/$bookId/rewards" -Headers $H -ContentType "application/json" -Body "{`"type`":`"POINTS`",`"value`":100,`"deadline`":`"$future`"}" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] POINTS sin goalId (expected 400)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 400) { Write-Output "OK  [400] POINTS sin goalId" } else { Write-Output "FAIL [$st] POINTS sin goalId (expected 400)"; throw 1 }
}

# ---- 3. deadline pasada -> 400 ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/books/$bookId/rewards" -Headers $H -ContentType "application/json" -Body "{`"type`":`"MONEY`",`"value`":10,`"deadline`":`"$past`"}" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] deadline pasada (expected 400)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 400) { Write-Output "OK  [400] deadline pasada" } else { Write-Output "FAIL [$st] deadline pasada (expected 400)"; throw 1 }
}

# ---- 4. get by id (parent) ----
$got = Invoke-RestMethod -Uri "$base/rewards/$rid" -Headers $H
if ($got.id -eq $rid) { Write-Output "OK  get by id (parent)" } else { throw "get: $($got | ConvertTo-Json -Compress)" }

# ---- 5. get by id (child owner) ----
$gotChild = Invoke-RestMethod -Uri "$base/rewards/$rid" -Headers $HLucas
if ($gotChild.id -eq $rid) { Write-Output "OK  get by id (hijo propietario)" } else { throw "get hijo: $($gotChild | ConvertTo-Json -Compress)" }

# ---- 6. get by id (other child) -> 404 ----
try {
  Invoke-WebRequest -Uri "$base/rewards/$rid" -Headers $HAnais -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] otro hijo ve recompensa ajena (expected 404)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 404) { Write-Output "OK  [404] otro hijo no ve recompensa ajena" } else { Write-Output "FAIL [$st] otro hijo (expected 404)"; throw 1 }
}

# ---- 7. list (parent incluye la creada) ----
$list = Invoke-RestMethod -Uri "$base/rewards" -Headers $H
if ($list | Where-Object { $_.id -eq $rid }) { Write-Output "OK  list (parent) incluye la creada" } else { throw "list parent no incluye $rid" }

# ---- 8. list (hijo propietario incluye la suya) ----
$listChild = Invoke-RestMethod -Uri "$base/rewards" -Headers $HLucas
if ($listChild | Where-Object { $_.id -eq $rid }) { Write-Output "OK  list (hijo) incluye la suya" } else { throw "list hijo no incluye $rid" }

# ---- 9. update value ----
$upd = Invoke-RestMethod -Method Patch -Uri "$base/rewards/$rid" -Headers $H -ContentType "application/json" -Body '{"value":250}'
if ($upd.value -eq 250) { Write-Output "OK  update value" } else { throw "update: $($upd | ConvertTo-Json -Compress)" }

# ---- 10. hijo no puede crear recompensas -> 403 ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/books/$bookId/rewards" -Headers $HLucas -ContentType "application/json" -Body "{`"type`":`"MONEY`",`"value`":10,`"deadline`":`"$future`"}" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] hijo crea recompensa (expected 403)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 403) { Write-Output "OK  [403] hijo no puede crear recompensas" } else { Write-Output "FAIL [$st] hijo crea recompensa (expected 403)"; throw 1 }
}

# ---- 11. mover libro a READING y verificar que ya no se puede editar/crear ----
$null = Invoke-RestMethod -Method Patch -Uri "$base/books/$bookId" -Headers $HLucas -ContentType "application/json" -Body '{"status":"READING"}'
try {
  Invoke-WebRequest -Method Patch -Uri "$base/rewards/$rid" -Headers $H -ContentType "application/json" -Body '{"value":400}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] editar reward con libro READING (expected 409)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 409) { Write-Output "OK  [409] no se edita reward si el libro ya no es NOT_STARTED" } else { Write-Output "FAIL [$st] editar reward (expected 409)"; throw 1 }
}
try {
  Invoke-WebRequest -Method Delete -Uri "$base/rewards/$rid" -Headers $H -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] delete reward con libro READING (expected 409)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 409) { Write-Output "OK  [409] no se elimina reward si el libro ya no es NOT_STARTED" } else { Write-Output "FAIL [$st] delete reward (expected 409)"; throw 1 }
}

# ---- 12. crear recompensa sobre libro que ya no es NOT_STARTED -> 409 ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/books/$bookId/rewards" -Headers $H -ContentType "application/json" -Body "{`"type`":`"MONEY`",`"value`":10,`"deadline`":`"$future`"}" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] create reward libro READING (expected 409)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 409) { Write-Output "OK  [409] no se crea reward si el libro no es NOT_STARTED" } else { Write-Output "FAIL [$st] create reward (expected 409)"; throw 1 }
}

# ---- 13. sin token -> 401 ----
try {
  Invoke-WebRequest -Uri "$base/rewards" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] list sin token (expected 401)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 401) { Write-Output "OK  [401] list sin token" } else { Write-Output "FAIL [$st] list sin token (expected 401)"; throw 1 }
}

# ---- cleanup ----
$null = Invoke-RestMethod -Method Delete -Uri "$base/books/$bookId" -Headers $HLucas
$null = Invoke-RestMethod -Method Delete -Uri "$base/goals/$goalId" -Headers $H

Write-Output ""
Write-Output "SMOKE TEST: ALL OK"
