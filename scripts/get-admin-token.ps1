param(
    [string]$BackendUrl = "http://localhost:3001",
    [string]$Username = "admin",
    [string]$Password = "admin123"
)

$body = @{ username = $Username; password = $Password } | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BackendUrl/admin/login" -Method POST -Body $body -ContentType 'application/json'
    if ($null -ne $response.token) {
        Write-Host "Admin token:" ($response.token) -ForegroundColor Green
    } else {
        Write-Warning "No token received. Full response:`n$(ConvertTo-Json $response -Depth 3)"
    }
}
catch {
    Write-Error "Failed to retrieve token: $($_.Exception.Message)"
    if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Server response:`n$($reader.ReadToEnd())"
    }
}
