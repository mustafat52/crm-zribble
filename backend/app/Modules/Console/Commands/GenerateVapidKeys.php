<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

class GenerateVapidKeys extends Command
{
    protected $signature   = 'webpush:vapid';
    protected $description = 'Generate VAPID public/private key pair for Web Push notifications';

    public function handle(): int
    {
        $this->info('Generating VAPID key pair...');

        $keys = VAPID::createVapidKeys();

        $this->newLine();
        $this->line('<fg=green>Add these to your .env file:</fg=green>');
        $this->newLine();
        $this->line('VAPID_PUBLIC_KEY=' . $keys['publicKey']);
        $this->line('VAPID_PRIVATE_KEY=' . $keys['privateKey']);
        $this->newLine();
        $this->warn('Keep VAPID_PRIVATE_KEY secret. Never commit it to git.');
        $this->info('Copy VAPID_PUBLIC_KEY — the frontend needs it to subscribe.');

        return Command::SUCCESS;
    }
}