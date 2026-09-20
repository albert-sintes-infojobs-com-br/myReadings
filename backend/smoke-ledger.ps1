# Smoke test HTTP Fase 8 - Ledger + resolution engine (run against http://localhost:3000)
$ErrorActionPreference = 'Stop'
$base = "http://localhost:3000/api"

# ---- login ----
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"maria@familia.dev","password":"password123"}'
$H = @{ Authorization = "Bearer $($login.accessToken)" }
$loginLucas = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"lucas@familia.dev","password":"password123"}'
$HLucas = @{ Authorization = "Bearer $($loginLucas.accessToken)" }
$lucasId = $loginLucas.user.id
Write-Output "LOGIN OK"

# ---- baseline balance (lucas ya tiene 300 puntos del seed) ----
$baseline = Invoke-RestMethod -Uri "$base/ledger/balance" -Headers $HLucas
Write-Output "Baseline: points=$($baseline.points) money=$($baseline.money)"

# ---- setup: goal (targetPoints=50) + book (owned by lucas) + POINTS reward ----
$goal = Invoke-RestMethod -Method Post -Uri "$base/children/$lucasId/goals" -Headers $H -ContentType "application/json" -Body '{"name":"Test Ledger Goal","targetPoints":50}'
$goalId = $goal.id
$book = Invoke-RestMethod -Method Post -Uri "$base/books" -Headers $HLucas -ContentType "application/json" -Body '{"title":"Ledger Test Book","author":"Autor Test"}'
$bookId = $book.id
$future = (Get-Date).AddDays(30).ToString('yyyy-MM-dd')
$reward = Invoke-RestMethod -Method Post -Uri "$base/books/$bookId/rewards" -Headers $H -ContentType "application/json" -Body "{`"type`":`"POINTS`",`"value`":50,`"deadline`":`"$future`",`"goalId`":$goalId}"
$rewardId = $reward.id
Write-Output "SETUP OK (goal=$goalId, book=$bookId, reward=$rewardId)"

# ---- 1. mover libro a FINISHED -> resolucion inmediata ----
$null = Invoke-RestMethod -Method Patch -Uri "$base/books/$bookId" -Headers $HLucas -ContentType "application/json" -Body '{"status":"FINISHED"}'
$rewardAfter = Invoke-RestMethod -Uri "$base/rewards/$rewardId" -Headers $H
if ($rewardAfter.status -eq 'FULFILLED' -and $rewardAfter.resolvedAt) { Write-Output "OK  reward FULFILLED tras terminar el libro a tiempo" } else { throw "reward: $($rewardAfter | ConvertTo-Json -Compress)" }

# ---- 2. la meta pasa a ACHIEVED (targetPoints=50 alcanzado exactamente) ----
$goalsList = Invoke-RestMethod -Uri "$base/children/$lucasId/goals" -Headers $H
$goalAfter = $goalsList | Where-Object { $_.id -eq $goalId }
if ($goalAfter.status -eq 'ACHIEVED') { Write-Output "OK  meta ACHIEVED tras alcanzar targetPoints" } else { throw "goal: $($goalAfter | ConvertTo-Json -Compress)" }

# ---- 3. balance de lucas subio en +50 puntos ----
$afterFulfill = Invoke-RestMethod -Uri "$base/ledger/balance" -Headers $HLucas
if ($afterFulfill.points -eq ($baseline.points + 50)) { Write-Output "OK  balance +50 puntos tras FULFILLED" } else { throw "balance: esperado $($baseline.points + 50), obtenido $($afterFulfill.points)" }

# ---- 4. redeem de la meta ACHIEVED ----
$redeemed = Invoke-RestMethod -Method Post -Uri "$base/goals/$goalId/redeem" -Headers $H
if ($redeemed.status -eq 'REDEEMED') { Write-Output "OK  redeem -> REDEEMED" } else { throw "redeem: $($redeemed | ConvertTo-Json -Compress)" }

# ---- 5. balance vuelve al baseline (canje resta los mismos puntos) ----
$afterRedeem = Invoke-RestMethod -Uri "$base/ledger/balance" -Headers $HLucas
if ($afterRedeem.points -eq $baseline.points) { Write-Output "OK  balance vuelve al baseline tras el canje" } else { throw "balance post-redeem: esperado $($baseline.points), obtenido $($afterRedeem.points)" }

# ---- 6. redeem de nuevo -> 409 (ya REDEEMED, no ACHIEVED) ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/goals/$goalId/redeem" -Headers $H -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] redeem duplicado (expected 409)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 409) { Write-Output "OK  [409] no se puede canjear dos veces" } else { Write-Output "FAIL [$st] redeem duplicado (expected 409)"; throw 1 }
}

# ---- 7. ledger de un hijo (padre) incluye los movimientos nuevos ----
$childLedger = Invoke-RestMethod -Uri "$base/children/$lucasId/ledger" -Headers $H
$hasFulfilled = $childLedger.entries | Where-Object { $_.rewardId -eq $rewardId -and $_.reason -eq 'FULFILLED' }
$hasRedemption = $childLedger.entries | Where-Object { $_.goalId -eq $goalId -and $_.reason -eq 'REDEMPTION' }
if ($hasFulfilled -and $hasRedemption) { Write-Output "OK  children/:id/ledger incluye FULFILLED y REDEMPTION" } else { throw "ledger entries incompletas" }
if ($childLedger.balance.points -eq $baseline.points) { Write-Output "OK  balance en children/:id/ledger coincide" } else { throw "balance ledger mismatch" }

# ---- 8. hijo no puede acceder al ledger de otro (ruta de padre) -> 403 ----
try {
  Invoke-WebRequest -Uri "$base/children/$lucasId/ledger" -Headers $HLucas -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] hijo accede a children/:id/ledger (expected 403)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 403) { Write-Output "OK  [403] hijo no accede a la ruta de ledger del padre" } else { Write-Output "FAIL [$st] hijo children/ledger (expected 403)"; throw 1 }
}

# ---- 9. padre no puede usar /ledger/balance (solo hijo) -> 403 ----
try {
  Invoke-WebRequest -Uri "$base/ledger/balance" -Headers $H -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] padre usa /ledger/balance (expected 403)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 403) { Write-Output "OK  [403] padre no puede usar /ledger/balance" } else { Write-Output "FAIL [$st] padre /ledger/balance (expected 403)"; throw 1 }
}

# ---- 10. hijo no puede canjear metas -> 403 ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/goals/$goalId/redeem" -Headers $HLucas -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] hijo canjea meta (expected 403)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 403) { Write-Output "OK  [403] hijo no puede canjear metas" } else { Write-Output "FAIL [$st] hijo redeem (expected 403)"; throw 1 }
}

# ---- 11. sin token -> 401 ----
try {
  Invoke-WebRequest -Uri "$base/ledger/balance" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] balance sin token (expected 401)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 401) { Write-Output "OK  [401] balance sin token" } else { Write-Output "FAIL [$st] balance sin token (expected 401)"; throw 1 }
}

# ---- cleanup: borrar el libro de prueba (cascada al reward); goal REDEEMED no se puede borrar via API ----
$null = Invoke-RestMethod -Method Delete -Uri "$base/books/$bookId" -Headers $HLucas
Write-Output ""
Write-Output "NOTA: goal id=$goalId quedo REDEEMED (no se puede borrar via API); limpiar por SQL si hace falta."
Write-Output "SMOKE TEST: ALL OK"
