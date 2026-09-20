# Smoke test HTTP Fase 4 - Categories (run against http://localhost:3000)
$ErrorActionPreference = 'Stop'
$base = "http://localhost:3000/api"

# ---- login (parent) ----
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"maria@familia.dev","password":"password123"}'
$H = @{ Authorization = "Bearer $($login.accessToken)" }
Write-Output "LOGIN parent OK"

# ---- 1. create ----
$created = Invoke-RestMethod -Method Post -Uri "$base/categories" -Headers $H -ContentType "application/json" -Body '{"title":"Ciencia ficcion","colorHex":"#1E88E5","description":"SF"}'
$cid = $created.id
Write-Output "OK  create -> id=$cid ($($created.title), $($created.colorHex))"

# ---- 2. create invalid colorHex -> 400 ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/categories" -Headers $H -ContentType "application/json" -Body '{"title":"X","colorHex":"#XYZ"}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] create invalid colorHex (expected 400)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 400) { Write-Output "OK  [400] create invalid colorHex" } else { Write-Output "FAIL [$st] create invalid colorHex (expected 400)"; throw 1 }
}

# ---- 3. get by id ----
$got = Invoke-RestMethod -Uri "$base/categories/$cid" -Headers $H
if ($got.id -eq $cid -and $got.title -eq "Ciencia ficcion") { Write-Output "OK  get by id" } else { throw "get returned: $($got | ConvertTo-Json -Compress)" }

# ---- 4. put (rename) ----
$upd = Invoke-RestMethod -Method Put -Uri "$base/categories/$cid" -Headers $H -ContentType "application/json" -Body '{"title":"Ciencia ficcion y fantasia"}'
if ($upd.title -eq "Ciencia ficcion y fantasia" -and $upd.colorHex -eq "#1E88E5") { Write-Output "OK  put rename (color kept: $($upd.colorHex))" } else { throw "put returned: $($upd | ConvertTo-Json -Compress)" }

# ---- 5. put invalid colorHex -> 400 ----
try {
  Invoke-WebRequest -Method Put -Uri "$base/categories/$cid" -Headers $H -ContentType "application/json" -Body '{"colorHex":"nope"}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] put invalid colorHex (expected 400)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 400) { Write-Output "OK  [400] put invalid colorHex" } else { Write-Output "FAIL [$st] put invalid colorHex (expected 400)"; throw 1 }
}

# ---- 6. list includes the created one ----
$list = Invoke-RestMethod -Uri "$base/categories" -Headers $H
if (($list | Where-Object { $_.id -eq $cid }) -and $list.Count -ge 1) { Write-Output "OK  list includes created (count=$($list.Count))" } else { throw "list missing $cid" }

# ---- 7. delete -> 204 ----
try {
  $r204 = Invoke-WebRequest -Method Delete -Uri "$base/categories/$cid" -Headers $H -UseBasicParsing
  if ([int]$r204.StatusCode -eq 204) { Write-Output "OK  [204] delete" } else { throw "delete returned $($r204.StatusCode)" }
} catch { throw "delete failed: $_" }

# ---- 8. get deleted -> 404 ----
try {
  Invoke-WebRequest -Uri "$base/categories/$cid" -Headers $H -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] get deleted (expected 404)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 404) { Write-Output "OK  [404] get deleted" } else { Write-Output "FAIL [$st] get deleted (expected 404)"; throw 1 }
}

# ---- 9. no token -> 401 ----
try {
  Invoke-WebRequest -Uri "$base/categories" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] list without token (expected 401)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 401) { Write-Output "OK  [401] list without token" } else { Write-Output "FAIL [$st] list without token (expected 401)"; throw 1 }
}

# ---- 10. child login: sees own + parent's ----
$login2 = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"lucas@familia.dev","password":"password123"}'
$HC = @{ Authorization = "Bearer $($login2.accessToken)" }
$hlist = Invoke-RestMethod -Uri "$base/categories" -Headers $HC
Write-Output "OK  child list no errors (count=$($hlist.Count))"

# ---- 11. child cannot edit parent's category ----
$createdP = Invoke-RestMethod -Method Post -Uri "$base/categories" -Headers $H -ContentType "application/json" -Body '{"title":"From parent","colorHex":"#B71C1C"}'
$cidP = $createdP.id
try {
  Invoke-WebRequest -Method Put -Uri "$base/categories/$cidP" -Headers $HC -ContentType "application/json" -Body '{"title":"hacked"}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] child edits parent category (expected 404/403)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  # 404: el repo acota por owner (no revela existencia). 403: defense-in-depth
  # del dominio. Ambos son respuesta correcta: la clave es que NO sea 2xx.
  if ($st -eq 404 -or $st -eq 403) { Write-Output "OK  [$st] child cannot edit parent category" } else { Write-Output "FAIL [$st] child edits parent cat (expected 404/403)"; throw 1 }
}

# ---- 12. child CAN read parent's category (GET) ----
$g = Invoke-RestMethod -Uri "$base/categories/$cidP" -Headers $HC
if ($g.id -eq $cidP) { Write-Output "OK  child sees parent category (GET)" } else { throw "child cannot see parent category" }

# ---- cleanup ----
$null = Invoke-RestMethod -Method Delete -Uri "$base/categories/$cidP" -Headers $H
Write-Output ""
Write-Output "SMOKE TEST: ALL OK"