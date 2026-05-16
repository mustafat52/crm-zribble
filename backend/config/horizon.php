<?php

use Illuminate\Support\Str;

return [

    'name' => env('HORIZON_NAME', 'CRM Horizon'),

    'domain' => env('HORIZON_DOMAIN'),

    'path' => env('HORIZON_PATH', 'horizon'),

    'use' => 'default',

    'prefix' => env(
        'HORIZON_PREFIX',
        Str::slug(env('APP_NAME', 'laravel'), '_').'_horizon:'
    ),

    'middleware' => ['web'],

    'waits' => [
        'redis:notifications' => 30,
        'redis:reminders'     => 60,
        'redis:reports'       => 120,
        'redis:ai'            => 120,
    ],

    'trim' => [
        'recent'        => 60,
        'pending'       => 60,
        'completed'     => 60,
        'recent_failed' => 10080,
        'failed'        => 10080,
        'monitored'     => 10080,
    ],

    'silenced' => [],

    'silenced_tags' => [],

    'metrics' => [
        'trim_snapshots' => [
            'job'   => 24,
            'queue' => 24,
        ],
    ],

    'fast_termination' => false,

    'memory_limit' => 64,

    'defaults' => [

        // HIGH PRIORITY — WhatsApp sends, emails, in-app alerts. Retries 3x.
        'supervisor-notifications' => [
            'connection'          => 'redis',
            'queue'               => ['notifications'],
            'balance'             => 'auto',
            'autoScalingStrategy' => 'time',
            'maxProcesses'        => 2,
            'maxTime'             => 0,
            'maxJobs'             => 0,
            'memory'              => 128,
            'tries'               => 3,
            'timeout'             => 60,
            'nice'                => 0,
        ],

        // REMINDERS — polls next_followup_at every 15 min via Scheduler
        'supervisor-reminders' => [
            'connection'          => 'redis',
            'queue'               => ['reminders'],
            'balance'             => 'auto',
            'autoScalingStrategy' => 'time',
            'maxProcesses'        => 1,
            'maxTime'             => 0,
            'maxJobs'             => 0,
            'memory'              => 128,
            'tries'               => 3,
            'timeout'             => 90,
            'nice'                => 5,
        ],

        // REPORTS — daily digest at 8AM, Excel exports. Long-running, low priority.
        'supervisor-reports' => [
            'connection'          => 'redis',
            'queue'               => ['reports'],
            'balance'             => 'auto',
            'autoScalingStrategy' => 'time',
            'maxProcesses'        => 1,
            'maxTime'             => 0,
            'maxJobs'             => 0,
            'memory'              => 256,
            'tries'               => 2,
            'timeout'             => 300,
            'nice'                => 10,
        ],

        // AI — empty in Phase 1. Worker registered and monitored. Phase 3 drops jobs here.
        'supervisor-ai' => [
            'connection'          => 'redis',
            'queue'               => ['ai'],
            'balance'             => 'auto',
            'autoScalingStrategy' => 'time',
            'maxProcesses'        => 1,
            'maxTime'             => 0,
            'maxJobs'             => 0,
            'memory'              => 128,
            'tries'               => 1,
            'timeout'             => 120,
            'nice'                => 10,
        ],

    ],

    'environments' => [

        'production' => [
            'supervisor-notifications' => [
                'maxProcesses'    => 5,
                'balanceMaxShift' => 2,
                'balanceCooldown' => 3,
            ],
            'supervisor-reminders' => [
                'maxProcesses'    => 2,
                'balanceMaxShift' => 1,
                'balanceCooldown' => 3,
            ],
            'supervisor-reports' => [
                'maxProcesses'    => 2,
                'balanceMaxShift' => 1,
                'balanceCooldown' => 5,
            ],
            'supervisor-ai' => [
                'maxProcesses'    => 3,
                'balanceMaxShift' => 1,
                'balanceCooldown' => 3,
            ],
        ],

        'local' => [
            'supervisor-notifications' => [
                'maxProcesses' => 2,
            ],
            'supervisor-reminders' => [
                'maxProcesses' => 1,
            ],
            'supervisor-reports' => [
                'maxProcesses' => 1,
            ],
            'supervisor-ai' => [
                'maxProcesses' => 1,
            ],
        ],

    ],

    'watch' => [
        'app',
        'bootstrap',
        'config/**/*.php',
        'database/**/*.php',
        'public/**/*.php',
        'resources/**/*.php',
        'routes',
        'composer.lock',
        'composer.json',
        '.env',
    ],

];