# Script ULTRA-SIMPLES - Cria checkout SEM login
# Cria direto no Mercado Pago usando as credenciais do .env

Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "    💳 MERCADO PAGO - TESTE SUPER SIMPLES" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Blue

# Suas credenciais do Mercado Pago
$accessToken = "APP_USR-2338238223033189-010610-462c2b897f2773c29120f1256a603571-3113708825"

Write-Host "📋 Planos disponíveis:" -ForegroundColor Yellow
Write-Host "  1. Teste Básico (R$ 10,00)" -ForegroundColor Cyan
Write-Host "  2. Profissional (R$ 49,90)" -ForegroundColor Cyan
Write-Host "  3. Premium (R$ 99,00)`n" -ForegroundColor Cyan

$planChoice = Read-Host "Escolha (1-3)"

$planData = @{
    '1' = @{ title = "VoxelPromo - Teste Básico"; price = 10.00 }
    '2' = @{ title = "VoxelPromo - Profissional"; price = 49.90 }
    '3' = @{ title = "VoxelPromo - Premium"; price = 99.00 }
}

$plan = $planData[$planChoice]
if (-not $plan) {
    Write-Host "❌ Opção inválida!" -ForegroundColor Red
    exit 1
}

Write-Host "`n💎 Criando checkout: $($plan.title)..." -ForegroundColor Yellow

# Criar preferência direto no Mercado Pago
$preference = @{
    items                = @(
        @{
            title       = $plan.title
            quantity    = 1
            unit_price  = $plan.price
            currency_id = "BRL"
        }
    )
    statement_descriptor = "VOXELPROMO"
} | ConvertTo-Json -Depth 10


try {
    $headers = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type"  = "application/json"
    }
    
    $response = Invoke-RestMethod `
        -Uri "https://api.mercadopago.com/checkout/preferences" `
        -Method POST `
        -Headers $headers `
        -Body $preference
    
    Write-Host "✅ Checkout criado com sucesso!`n" -ForegroundColor Green
    
    Write-Host "📊 Detalhes:" -ForegroundColor Yellow
    Write-Host "   Plano: $($plan.title)" -ForegroundColor Cyan
    Write-Host "   Valor: R$ $($plan.price)" -ForegroundColor Cyan
    Write-Host "   ID: $($response.id)`n" -ForegroundColor Cyan
    
    Write-Host "🔗 URL de Pagamento (SANDBOX):" -ForegroundColor Yellow
    Write-Host "   $($response.sandbox_init_point)`n" -ForegroundColor Green
    
    Write-Host "💳 DADOS DE TESTE:" -ForegroundColor Yellow
    Write-Host "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "   Cartão: 5031 4332 1540 6351" -ForegroundColor Green
    Write-Host "   Nome: APRO" -ForegroundColor Green
    Write-Host "   CPF: 12345678909" -ForegroundColor Green
    Write-Host "   Vencimento: 11/25" -ForegroundColor Green
    Write-Host "   CVV: 123" -ForegroundColor Green
    Write-Host "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
    
    Write-Host "📌 INSTRUÇÕES:" -ForegroundColor Yellow
    Write-Host "   1. NÃO faça login no Mercado Pago" -ForegroundColor Cyan
    Write-Host "   2. Use os dados de teste acima" -ForegroundColor Cyan
    Write-Host "   3. Clique em 'Pagar'" -ForegroundColor Cyan
    Write-Host "   4. Pronto!`n" -ForegroundColor Cyan
    
    Write-Host "🌐 Abrindo navegador..." -ForegroundColor Cyan
    Start-Process $response.sandbox_init_point
    
    Write-Host "`n✅ Navegador aberto! Complete o pagamento.`n" -ForegroundColor Green
    
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host "           ✨ PRONTO PARA PAGAR!" -ForegroundColor Blue
    Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Blue
    
}
catch {
    Write-Host "`n❌ Erro ao criar checkout!" -ForegroundColor Red
    Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Detalhes: $($errorObj.message)" -ForegroundColor Red
    }
    exit 1
}
