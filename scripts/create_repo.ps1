$token = "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"
$headers = @{
    Authorization = "token $token"
    Accept = "application/vnd.github.v3+json"
}
$body = @{
    name = "voxelpromo"
    private = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "Repo created: $($response.html_url)"
} catch {
    Write-Host "Error creating repo: $_"
    # If error is 422, it might already exist
    if ($_.Exception.Response.StatusCode.value__ -eq 422) {
        Write-Host "Repo likely already exists."
    }
}
