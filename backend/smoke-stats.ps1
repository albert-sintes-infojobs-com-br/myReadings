# Smoke test HTTP Fase 10 - Stats/Dashboards (http://localhost:3000)
$ErrorActionPreference = 'Stop'
$base = "http://localhost:3000/api"

# ---- login ----
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"maria@familia.dev","password":"password123"}'
$H = @{ Authorization = "Bearer $($login.accessToken)" }
$loginLucas = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"lucas@familia.dev","password":"password123"}'
$HLucas = @{ Authorization = "Bearer $($loginLucas.accessToken)" }
$loginAnais = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"anais@familia.dev","password":"password123"}'
$HAnais = @{ Authorization = "Bearer $($loginAnais.accessToken)" }
$lucasId = $loginLucas.user.id
$anaisId = $loginAnais.user.id
Write-Output "LOGIN OK"

# ---- 1. GET /stats/me (lucas) ----
$myStats = Invoke-RestMethod -Uri "$base/stats/me" -Headers $HLucas
if ($myStats.booksByStatus.FINISHED -ge 1) { Write-Output "OK  /stats/me booksByStatus.FINISHED=$($myStats.booksByStatus.FINISHED)" } else { throw "booksByStatus: $($myStats.booksByStatus | ConvertTo-Json -Compress)" }
if ($myStats.balance.points -ge 300) { Write-Output "OK  /stats/me balance.points=$($myStats.balance.points)" } else { throw "balance: $($myStats.balance | ConvertTo-Json -Compress)" }
if ($myStats.goalsProgress.Count -ge 1) { Write-Output "OK  /stats/me goalsProgress incluye la meta Videoconsola (progressPct=$($myStats.goalsProgress[0].progressPct))" } else { throw "goalsProgress vacio" }
if ($myStats.rewardsByStatus.FULFILLED -ge 1) { Write-Output "OK  /stats/me rewardsByStatus.FULFILLED=$($myStats.rewardsByStatus.FULFILLED)" } else { throw "rewardsByStatus: $($myStats.rewardsByStatus | ConvertTo-Json -Compress)" }
if ($myStats.avgReadingDays -ne $null) { Write-Output "OK  /stats/me avgReadingDays=$($myStats.avgReadingDays)" } else { throw "avgReadingDays es null" }

# ---- 2. padre no puede usar /stats/me (solo hijo) -> 403 ----
try {
  Invoke-WebRequest -Uri "$base/stats/me" -Headers $H -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] padre usa /stats/me (expected 403)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 403) { Write-Output "OK  [403] padre no puede usar /stats/me" } else { Write-Output "FAIL [$st] padre /stats/me (expected 403)"; throw 1 }
}

# ---- 3. GET /stats/overview sin childId (padre, agrega todos + ranking) ----
$overview = Invoke-RestMethod -Uri "$base/stats/overview" -Headers $H
if ($overview.perChild.Count -eq 2) { Write-Output "OK  overview sin childId -> perChild.Count=2" } else { throw "perChild: $($overview.perChild.Count)" }
if ($overview.ranking.Count -eq 2) { Write-Output "OK  overview incluye ranking (Count=2)" } else { throw "ranking ausente o incompleto" }
$top = $overview.ranking[0]
Write-Output ("INFO ranking[0] = childId={0} finishedBooks={1}" -f $top.childId, $top.finishedBooks)

# ---- 4. GET /stats/overview?childId=lucas (padre, filtra a un hijo, sin ranking) ----
$overviewLucas = Invoke-RestMethod -Uri "$base/stats/overview?childId=$lucasId" -Headers $H
if ($overviewLucas.perChild.Count -eq 1 -and $overviewLucas.perChild[0].childId -eq $lucasId) { Write-Output "OK  overview?childId=$lucasId -> 1 solo hijo" } else { throw "overview childId: $($overviewLucas | ConvertTo-Json -Compress)" }
if (-not $overviewLucas.ranking) { Write-Output "OK  overview con childId NO incluye ranking" } else { throw "ranking presente cuando no deberia" }

# ---- 5. hijo no puede usar /stats/overview (solo padre) -> 403 ----
try {
  Invoke-WebRequest -Uri "$base/stats/overview" -Headers $HLucas -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] hijo usa /stats/overview (expected 403)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 403) { Write-Output "OK  [403] hijo no puede usar /stats/overview" } else { Write-Output "FAIL [$st] hijo /stats/overview (expected 403)"; throw 1 }
}

# ---- 6. padre no puede pedir overview de un hijo ajeno (id inventado) -> 404 ----
try {
  Invoke-WebRequest -Uri "$base/stats/overview?childId=999999" -Headers $H -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] overview childId inexistente (expected 404)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 404) { Write-Output "OK  [404] overview childId inexistente" } else { Write-Output "FAIL [$st] overview childId inexistente (expected 404)"; throw 1 }
}

# ---- 7. anais tambien puede ver sus propias stats (aisladas) ----
$anaisStats = Invoke-RestMethod -Uri "$base/stats/me" -Headers $HAnais
if ($anaisStats.balance.points -eq 0) { Write-Output "OK  /stats/me de anais aislado (points=0, sin ledger propio)" } else { Write-Output "INFO anais balance.points=$($anaisStats.balance.points)" }

# ---- 8. sin token -> 401 ----
try {
  Invoke-WebRequest -Uri "$base/stats/me" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] stats/me sin token (expected 401)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 401) { Write-Output "OK  [401] stats/me sin token" } else { Write-Output "FAIL [$st] stats/me sin token (expected 401)"; throw 1 }
}

Write-Output ""
Write-Output "SMOKE TEST: ALL OK"
