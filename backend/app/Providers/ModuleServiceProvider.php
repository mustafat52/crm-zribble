<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

abstract class ModuleServiceProvider extends ServiceProvider
{
    protected string $module = '';

    public function boot(): void
    {
        $this->loadRoutesForModule();
    }

    protected function loadRoutesForModule(): void
    {
        $routePath = app_path("Modules/{$this->module}/Routes/api.php");

        if (file_exists($routePath)) {
            Route::middleware('api')
                ->prefix('api/v1')
                ->group($routePath);
        }
    }
}