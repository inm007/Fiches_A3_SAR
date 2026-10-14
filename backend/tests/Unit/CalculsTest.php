<?php

namespace Tests\Unit;

use App\Services\Calculs;
use PHPUnit\Framework\TestCase;

class CalculsTest extends TestCase
{
    private Calculs $calculs;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculs = new Calculs;
    }

    public function test_ecart_is_measured_minus_reference(): void
    {
        $this->assertSame(-20.0, $this->calculs->ecart(80.0, 100.0));
        $this->assertNull($this->calculs->ecart(null, 100.0));
    }

    public function test_improvement_follows_the_wanted_direction(): void
    {
        $this->assertSame(25.0, $this->calculs->ameliorationPourcent(100.0, 75.0, 'baisse'));
        $this->assertSame(-25.0, $this->calculs->ameliorationPourcent(100.0, 75.0, 'hausse'));
    }

    public function test_improvement_is_not_computable_when_before_is_zero(): void
    {
        $this->assertNull($this->calculs->ameliorationPourcent(0.0, 10.0, 'hausse'));
    }

    public function test_gains_are_integer_fcfa(): void
    {
        $this->assertSame(10_500_000, $this->calculs->gainAnnuel(4200, 2500));
        $this->assertSame(3, $this->calculs->gainAnnuel(1.4, 2));
        $this->assertSame(12_400_000, $this->calculs->totalA([10_500_000, 1_900_000]));
        $this->assertSame(9_200_000, $this->calculs->gainNet(12_400_000, 3_200_000));
    }

    public function test_payback_requires_positive_total(): void
    {
        $this->assertSame(0.26, $this->calculs->paybackAnnees(12_400_000, 3_200_000));
        $this->assertNull($this->calculs->paybackAnnees(0, 3_200_000));
    }
}
