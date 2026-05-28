<?php

namespace App\Modules\Reports\Exports;

use App\Modules\Leads\Models\Lead;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LeadsExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    public function __construct(
        private string $businessId,
        private ?string $branchId = null,
        private ?string $statusId = null,
        private ?string $source = null,
        private ?string $dateFrom = null,
        private ?string $dateTo = null,
    ) {}

    public function collection()
    {
        $query = Lead::withoutGlobalScopes()
            ->with(['status', 'assignedTo'])
            ->select([
                'id','name','mobile','email','source','lead_status_id',
                'assigned_to','branch_id','interested_in','lead_value',
                'next_followup_at','created_at','business_id'
            ])
            ->where('business_id', $this->businessId);

        if ($this->branchId) {
            $query->where('branch_id', $this->branchId);
        }
        if ($this->statusId) {
            $query->where('lead_status_id', $this->statusId);
        }
        if ($this->source) {
            $query->where('source', $this->source);
        }
        if ($this->dateFrom) {
            $query->whereDate('created_at', '>=', $this->dateFrom);
        }
        if ($this->dateTo) {
            $query->whereDate('created_at', '<=', $this->dateTo);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function headings(): array
    {
        return [
            'Name',
            'Mobile',
            'Email',
            'Source',
            'Status',
            'Assigned To',
            'Branch',
            'Interested In',
            'Lead Value',
            'Next Follow-up',
            'Created At',
        ];
    }

    public function map($lead): array
    {
        return [
            $lead->name,
            $lead->mobile,
            $lead->email ?? '-',
            $lead->source ?? '-',
            $lead->status?->name ?? '-',
            $lead->assignedTo?->name ?? 'Unassigned',
            $lead->branch_id ? 'Branch' : 'No Branch',
            $lead->interested_in ?? '-',
            $lead->lead_value ? 'Rs.' . number_format($lead->lead_value, 2) : '-',
            $lead->next_followup_at ? $lead->next_followup_at->format('d M Y H:i') : '-',
            $lead->created_at->format('d M Y H:i'),
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '7C3AED']],
            ],
        ];
    }
}