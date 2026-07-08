<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // No named login route — this is a pure API app
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->redirectGuestsTo(fn () => null);
        $middleware->alias([
            'auth'          => \App\Http\Middleware\Authenticate::class,
            'auth.sanctum'  => \Laravel\Sanctum\Http\Middleware\CheckAbilities::class,
            'api_key'       => \App\Http\Middleware\ApiKeyMiddleware::class,
            'agency_admin'  => \App\Http\Middleware\EnsureAgencyAdmin::class,
            'agency_access' => \App\Http\Middleware\EnsureAgencyAccess::class,
            // T61 FIX: Register Spatie role/permission middleware aliases.
            // Without these, Route::middleware('role:owner|manager|executive')
            // throws BindingResolutionException — Laravel tries to resolve
            // 'role' as a class and fails. Spatie v6 uses singular 'Middleware'.
            'role'              => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission'        => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission'=> \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated. Please provide a valid Bearer token.',
                ], 401);
            }
        });
    })->create();
