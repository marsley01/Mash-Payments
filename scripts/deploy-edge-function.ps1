# Deploy the keep-alive Edge Function to Supabase
# Requires Supabase CLI: npm install -g supabase

$projectRef = "mlaeitratphwzvuainqu"

Write-Host "Deploying keep-alive edge function..." -ForegroundColor Cyan
supabase functions deploy keep-alive --project-ref $projectRef

Write-Host "Done!" -ForegroundColor Green
Write-Host "Next, run the migration to schedule the cron jobs:" -ForegroundColor Yellow
Write-Host "  supabase db push --project-ref $projectRef" -ForegroundColor Yellow
