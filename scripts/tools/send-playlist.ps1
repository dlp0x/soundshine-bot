param(
    [string]$playlist = "éééé Something's wrong - <@1269663215873163397>",  # Nom de la playlist
    [string]$topic = "éééé Something's wrong - Ask an admin" # Sujet de la playlist
)

# Configuration de l'encodage UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# Ton API
$uri = "http://10.0.0.153:3894/v1/send-playlist"

# Ton token d'authentification
$token = "rBbIHFW8XFcAcDLWulPGcaeXM38ffMcjvrsFaHy0xFR1JCvmlt5wRVH5SVIjZTOR"

# Corps de la demande
$body = @{
    playlist = $playlist
    topic    = $topic
}

# Headers avec le token et encodage UTF-8
$headers = @{
    "x-api-key"    = $token
    "Content-Type" = "application/json; charset=utf-8"
}

# Convertir en JSON avec encodage UTF-8 explicite
$jsonBody = $body | ConvertTo-Json -Depth 3 -Compress
$jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

# Debug: afficher le JSON avant envoi
Write-Output "JSON à envoyer: $jsonBody"
Write-Output "Bytes UTF-8: $([System.BitConverter]::ToString($jsonBytes))"

# Envoie la requête avec headers et encodage UTF-8
try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $jsonBody -Headers $headers -ContentType "application/json; charset=utf-8"
    Write-Output "API response: $($response | ConvertTo-Json)"
}
catch {
    Write-Output "Erreur lors de l'envoi: $($_.Exception.Message)"
    
    # Méthode alternative avec WebClient pour un meilleur contrôle de l'encodage
    Write-Output "Tentative avec méthode alternative..."
    $webClient = New-Object System.Net.WebClient
    $webClient.Headers.Add("x-api-key", $token)
    $webClient.Headers.Add("Content-Type", "application/json; charset=utf-8")
    $webClient.Encoding = [System.Text.Encoding]::UTF8
    
    $response = $webClient.UploadString($uri, "POST", $jsonBody)
    Write-Output "API response (méthode alternative): $response"
    $webClient.Dispose()
}

# Sortir avec le code 0
exit 0
