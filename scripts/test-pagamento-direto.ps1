# Script de teste DIRETO do Mercado Pago
# Cria checkout e abre URL para pagamento com cartão de teste

Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Blue
Write-Host "       💳 MERCADO PAGO - TESTE DIRETO" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Blue

# Seu email de usuário existente
$email = "allyfreitas11@gmail.com"
$password = Read-Host "Digite sua senha" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

Write-Host "`n📧 Fazendo login..." -ForegroundColor Cyan

try {
    # Login
    $loginBody = @{
        email = $email
        password = $passwordPlain
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod `
        -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    if (-not $loginResponse.success) {
        Write-Host "❌ Erro no login: $($loginResponse.error)" -ForegroundColor Red
        exit 1
    }

    $token = $loginResponse.accessToken
    Write-Host "✅ Login realizado com sucesso!`n" -ForegroundColor Green

    # Selecionar plano
    Write-Host "📋 Planos disponíveis:" -ForegroundColor Yellow
    Write-Host "  1. trial (Grátis - 7 dias)" -ForegroundColor Cyan
    Write-Host "  2. basic-monthly (R$ 29,90/mês)" -ForegroundColor Cyan
    Write-Host "  3. pro (R$ 49,90/mês)" -ForegroundColor Cyan
    Write-Host "  4. premium-annual (R$ 999,00/ano)" -ForegroundColor Cyan
    Write-Host "  5. agency (R$ 199,90/mês)`n" -ForegroundColor Cyan

    $planChoice = Read-Host "Escolha o plano (1-5)"

    $planIds = @{
        '1' = 'trial'
        '2' = 'basic-monthly'
        '3' = 'pro'
        '4' = 'premium-annual'
        '5' = 'agency'
    }

    $planId = $planIds[$planChoice]
    if (-not $planId) {
        Write-Host "❌ Plano inválido!" -ForegroundColor Red
        exit 1
    }

    Write-Host "`n💎 Criando checkout para plano: $planId..." -ForegroundColor Yellow

    # Criar checkout
    $checkoutBody = @{
        planId = $planId
    } | ConvertTo-Json

    $checkoutResponse = Invoke-RestMethod `
        -Uri "http://localhost:3000/api/payments/create-checkout" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{
            "Authorization" = "Bearer $token"
        } `
        -Body $checkoutBody

    if (-not $checkoutResponse.success) {
        Write-Host "❌ Erro ao criar checkout: $($checkoutResponse.error)" -ForegroundColor Red
        exit 1
    }

    $checkout = $checkoutResponse.data

    # Plano trial
    if ($checkout.isTrial) {
        Write-Host "`n✅ Plano trial ativado! Sem pagamento necessário." -ForegroundColor Green
        Write-Host "   Duração: 7 dias" -ForegroundColor Cyan
        exit 0
    }

    # Mostrar detalhes
    Write-Host "`n✅ Checkout criado com sucesso!" -ForegroundColor Green
    Write-Host "`n📊 Detalhes do Checkout:" -ForegroundColor Yellow
    Write-Host "   Plano: $($checkout.planName)" -ForegroundColor Cyan
    Write-Host "   Valor: R$ $([math]::Round($checkout.price / 100, 2))" -ForegroundColor Cyan
    Write-Host "   Preference ID: $($checkout.preferenceId)" -ForegroundColor Cyan

    Write-Host "`n🔗 URL de Pagamento (SANDBOX):" -ForegroundColor Yellow
    Write-Host "   $($checkout.sandboxInitPoint)" -ForegroundColor Green

    Write-Host "`n💳 DADOS DE TESTE PARA O PAGAMENTO:" -ForegroundColor Yellow
    Write-Host "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "   Cartão: 5031 4332 1540 6351" -ForegroundColor Green
    Write-Host "   Nome: APRO" -ForegroundColor Green
    Write-Host "   CPF: 12345678909" -ForegroundColor Green
    Write-Host "   Vencimento: 11/25" -ForegroundColor Green
    Write-Host "   CVV: 123" -ForegroundColor Green
    Write-Host "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

    Write-Host "📌 INSTRUÇÕES:" -ForegroundColor Yellow
    Write-Host "   1. O navegador abrirá automaticamente" -ForegroundColor Cyan
    Write-Host "   2. NÃO faça login - use cartão direto" -ForegroundColor Cyan
    Write-Host "   3. Preencha os dados de teste acima" -ForegroundColor Cyan
    Write-Host "   4. Clique em 'Pagar'" -ForegroundColor Cyan
    Write-Host "   5. Aguarde redirecionamento`n" -ForegroundColor Cyan

    $openBrowser = Read-Host "Abrir no navegador agora? (S/N)"

    if ($openBrowser -eq 'S' -or $openBrowser -eq 's') {
        Write-Host "`n🌐 Abrindo navegador..." -ForegroundColor Cyan
        Start-Process $checkout.sandboxInitPoint
        Write-Host "✅ Navegador aberto! Prossiga com o pagamento." -ForegroundColor Green
    } else {
        Write-Host "`n📋 Copie a URL acima e abra manualmente no navegador." -ForegroundColor Yellow
    }

    Write-Host "`n═══════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host "           ✨ PRONTO PARA TESTE!" -ForegroundColor Blue
    Write-Host "═══════════════════════════════════════════════════`n" -ForegroundColor Blue

} catch {
    Write-Host "`n❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta: $responseBody" -ForegroundColor Red
    }
    exit 1
}
