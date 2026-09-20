# Smoke test HTTP Fase 9 - RewardRequests + Notifications (http://localhost:3000)
$ErrorActionPreference = 'Stop'
$base = "http://localhost:3000/api"

# ---- login ----
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"maria@familia.dev","password":"password123"}'
$H = @{ Authorization = "Bearer $($login.accessToken)" }
$loginLucas = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"lucas@familia.dev","password":"password123"}'
$HLucas = @{ Authorization = "Bearer $($loginLucas.accessToken)" }
$loginAnais = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body '{"email":"anais@familia.dev","password":"password123"}'
$HAnais = @{ Authorization = "Bearer $($loginAnais.accessToken)" }
Write-Output "LOGIN OK"

# ---- setup: libro NOT_STARTED propio de lucas ----
$book = Invoke-RestMethod -Method Post -Uri "$base/books" -Headers $HLucas -ContentType "application/json" -Body '{"title":"Libro Smoke RR","author":"Autor Test"}'
$bookId = $book.id
Write-Output "SETUP OK (book=$bookId)"

# ---- 1. hijo solicita recompensa ----
$request = Invoke-RestMethod -Method Post -Uri "$base/books/$bookId/request-reward" -Headers $HLucas
$requestId = $request.id
if ($request.status -eq 'PENDING' -and $request.bookId -eq $bookId) { Write-Output "OK  request-reward -> PENDING (id=$requestId)" } else { throw "request: $($request | ConvertTo-Json -Compress)" }

# ---- 2. padre recibe notificacion REWARD_REQUEST ----
$parentNotifs = Invoke-RestMethod -Uri "$base/notifications" -Headers $H
$notif = $parentNotifs | Where-Object { $_.type -eq 'REWARD_REQUEST' -and $_.refBookId -eq $bookId }
if ($notif) { Write-Output "OK  padre recibe Notification REWARD_REQUEST" } else { throw "no se genero la notificacion" }

# ---- 3. solicitar de nuevo sobre el mismo libro NOT_STARTED (permitido, no hay restriccion de unicidad) pero probamos libro ya READING ----
$null = Invoke-RestMethod -Method Patch -Uri "$base/books/$bookId" -Headers $HLucas -ContentType "application/json" -Body '{"status":"READING"}'
try {
  Invoke-WebRequest -Method Post -Uri "$base/books/$bookId/request-reward" -Headers $HLucas -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] request-reward libro READING (expected 409)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 409) { Write-Output "OK  [409] request-reward rechazado si el libro no es NOT_STARTED" } else { Write-Output "FAIL [$st] request-reward (expected 409)"; throw 1 }
}

# ---- 4. padre no puede solicitar (solo hijo) -> 403 ----
try {
  Invoke-WebRequest -Method Post -Uri "$base/books/$bookId/request-reward" -Headers $H -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] padre solicita recompensa (expected 403)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 403) { Write-Output "OK  [403] padre no puede solicitar recompensa" } else { Write-Output "FAIL [$st] padre solicita (expected 403)"; throw 1 }
}

# ---- 5. padre lista solicitudes pendientes ----
$pending = Invoke-RestMethod -Uri "$base/reward-requests" -Headers $H
if ($pending | Where-Object { $_.id -eq $requestId }) { Write-Output "OK  padre lista solicitudes pendientes (incluye la creada)" } else { throw "no aparece en pending" }

# ---- 6. hijo no puede listar reward-requests (solo padre) -> 403 ----
try {
  Invoke-WebRequest -Uri "$base/reward-requests" -Headers $HLucas -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] hijo lista reward-requests (expected 403)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 403) { Write-Output "OK  [403] hijo no puede listar reward-requests" } else { Write-Output "FAIL [$st] hijo reward-requests (expected 403)"; throw 1 }
}

# ---- 7. padre resuelve (RESOLVED) ----
$resolved = Invoke-RestMethod -Method Patch -Uri "$base/reward-requests/$requestId" -Headers $H -ContentType "application/json" -Body '{"status":"RESOLVED"}'
if ($resolved.status -eq 'RESOLVED') { Write-Output "OK  reward-request RESOLVED" } else { throw "resolved: $($resolved | ConvertTo-Json -Compress)" }

# ---- 8. resolver de nuevo -> 409 (ya no PENDING) ----
try {
  Invoke-WebRequest -Method Patch -Uri "$base/reward-requests/$requestId" -Headers $H -ContentType "application/json" -Body '{"status":"DISMISSED"}' -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] resolver dos veces (expected 409)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 409) { Write-Output "OK  [409] no se puede resolver dos veces" } else { Write-Output "FAIL [$st] resolver dos veces (expected 409)"; throw 1 }
}

# ---- 9. marcar notificacion como leida ----
$before = Invoke-RestMethod -Uri "$base/notifications/unread-count" -Headers $H
$read = Invoke-RestMethod -Method Patch -Uri "$base/notifications/$($notif.id)/read" -Headers $H
if ($read.read -eq $true) { Write-Output "OK  notificacion marcada como leida" } else { throw "read: $($read | ConvertTo-Json -Compress)" }
$after = Invoke-RestMethod -Uri "$base/notifications/unread-count" -Headers $H
if ($after.count -eq ($before.count - 1)) { Write-Output "OK  unread-count decrementa en 1" } else { throw "unread-count antes=$($before.count) despues=$($after.count)" }

# ---- 10. anais no puede marcar como leida la notificacion de otro (404, privacidad) ----
try {
  Invoke-WebRequest -Method Patch -Uri "$base/notifications/$($notif.id)/read" -Headers $HAnais -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] anais marca notif ajena (expected 404)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 404) { Write-Output "OK  [404] no se puede marcar una notificacion ajena" } else { Write-Output "FAIL [$st] notif ajena (expected 404)"; throw 1 }
}

# ---- 11. mark-all-read ----
$allRead = Invoke-RestMethod -Method Patch -Uri "$base/notifications/read-all" -Headers $H
if ($allRead.updated -ge 0) { Write-Output "OK  read-all -> updated=$($allRead.updated)" } else { throw "read-all: $($allRead | ConvertTo-Json -Compress)" }
$finalCount = Invoke-RestMethod -Uri "$base/notifications/unread-count" -Headers $H
if ($finalCount.count -eq 0) { Write-Output "OK  unread-count=0 tras read-all" } else { throw "unread-count tras read-all: $($finalCount.count)" }

# ---- 12. filtro unread=true en list ----
$onlyUnread = Invoke-RestMethod -Uri "$base/notifications?unread=true" -Headers $H
if ($onlyUnread.Count -eq 0) { Write-Output "OK  list ?unread=true vacio tras marcar todo leido" } else { throw "unread filter: $($onlyUnread.Count) restantes" }

# ---- 13. sin token -> 401 ----
try {
  Invoke-WebRequest -Uri "$base/notifications" -UseBasicParsing | Out-Null
  Write-Output "FAIL [200] notifications sin token (expected 401)"; throw 1
} catch {
  $st = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { throw }
  if ($st -eq 401) { Write-Output "OK  [401] notifications sin token" } else { Write-Output "FAIL [$st] notifications sin token (expected 401)"; throw 1 }
}

# ---- cleanup ----
$null = Invoke-RestMethod -Method Delete -Uri "$base/books/$bookId" -Headers $HLucas

Write-Output ""
Write-Output "SMOKE TEST: ALL OK"
