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
            'auth'         => \App\Http\Middleware\Authenticate::class,
            'auth.sanctum' => \Laravel\Sanctum\Http\Middleware\CheckAbilities::class,
            'api_key'      => \App\Http\Middleware\ApiKeyMiddleware::class,
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