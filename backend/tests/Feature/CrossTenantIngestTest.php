<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\ApiKey;

/**
 * T25 — Cross-Tenant Ingest API Isolation Tests
 *
 * What these tests prove:
 *   The public ingest endpoint (POST /api/v1/ingest/lead) uses API key auth,
 *   not Sanctum tokens. The API key is tied to a specific business.
 *   A lead submitted via Business A's API key must always land under
 *   Business A — never under Business B.
 *
 * Also proves:
 *   - Invalid/missing API key is rejected with 401
 *   - Correct key creates lead under correct business
 */
class CrossTenantIngestTest extends TestCase
{
    // ── Test 1: Valid API key creates lead under correct business ─────────────
    public function test_ingest_lead_lands_under_correct_business(): void
    {
        // ARRANGE
        $businessA = $this->createBusiness('Business A');
        $businessB = $this->createBusiness('Business B');

        $keyA = $this->createApiKey($businessA);

        // ACT — submit lead using Business A's API key
        $response = $this->postJson('/api/v1/ingest/lead', [
            'name'   => 'Ingest Test Lead',
            'mobile' => '+919876543210',
            'source' => 'website',
        ], [
            'X-API-Key' => $keyA['plain'],
        ]);

        // ASSERT
        $response->assertStatus(201);

        // Lead must exist under Business A
        $this->assertDatabaseHas('leads', [
            'name'        => 'Ingest Test Lead',
            'mobile'      => '+919876543210',
            'business_id' => $businessA->id,
        ]);

        // Lead must NOT exist under Business B
        $this->assertDatabaseMissing('leads', [
            'name'        => 'Ingest Test Lead',
            'business_id' => $businessB->id,
        ]);
    }

    // ── Test 2: Missing API key is rejected ───────────────────────────────────
    public function test_ingest_without_api_key_is_rejected(): void
    {
        // ARRANGE
        $this->createBusiness('Business A');

        // ACT — no X-API-Key header
        $response = $this->postJson('/api/v1/ingest/lead', [
            'name'   => 'Hacker Lead',
            'mobile' => '+919000000000',
        ]);

        // ASSERT
        $response->assertUnauthorized(); // 401

        $this->assertDatabaseMissing('leads', [
            'name' => 'Hacker Lead',
        ]);
    }

    // ── Test 3: Invalid API key is rejected ───────────────────────────────────
    public function test_ingest_with_invalid_api_key_is_rejected(): void
    {
        // ARRANGE
        $this->createBusiness('Business A');

        // ACT — garbage API key
        $response = $this->postJson('/api/v1/ingest/lead', [
            'name'   => 'Hacker Lead',
            'mobile' => '+919000000001',
        ], [
            'X-API-Key' => 'invalid_key_that_does_not_exist',
        ]);

        // ASSERT
        $response->assertUnauthorized(); // 401

        $this->assertDatabaseMissing('leads', [
            'name' => 'Hacker Lead',
        ]);
    }
}