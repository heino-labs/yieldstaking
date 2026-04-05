import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType, TransactionStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsOptional, IsEnum, IsInt, Min } from "class-validator";

export class GetTransactionsDto {
    @ApiPropertyOptional({ description: "Page number", default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: "Items per page", default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({
        enum: TransactionType,
        description: "Filter by transaction type",
    })
    @IsOptional()
    @IsEnum(TransactionType)
    type?: TransactionType;

    @ApiPropertyOptional({
        enum: TransactionStatus,
        description: "Filter by transaction status",
    })
    @IsOptional()
    @IsEnum(TransactionStatus)
    status?: TransactionStatus;

    @ApiPropertyOptional({ description: "Filter by wallet address" })
    @IsOptional()
    walletAddress?: string;
}

export class TransactionResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    walletId: number;

    @ApiProperty()
    walletAddress: string;

    @ApiProperty()
    chainId: number;

    @ApiProperty()
    chainName: string;

    @ApiProperty()
    chainSlug: string;

    @ApiPropertyOptional()
    stakePositionId?: number;

    @ApiProperty({ enum: TransactionType })
    type: TransactionType;

    @ApiProperty({ enum: TransactionStatus })
    status: TransactionStatus;

    @ApiProperty()
    amount: string;

    @ApiPropertyOptional()
    txHash?: string;

    @ApiPropertyOptional()
    explorerUrl?: string;

    @ApiPropertyOptional()
    blockNumber?: bigint;

    @ApiPropertyOptional()
    gasUsed?: string;

    @ApiPropertyOptional()
    gasPrice?: string;

    @ApiPropertyOptional()
    errorMessage?: string;

    @ApiPropertyOptional()
    metadata?: Record<string, unknown>;

    @ApiProperty()
    createdAt: Date;

    @ApiPropertyOptional()
    confirmedAt?: Date;
}

export class TransactionSummaryDto {
    @ApiProperty()
    totalStaked: string;

    @ApiProperty()
    totalClaimed: string;

    @ApiProperty()
    totalWithdrawn: string;

    @ApiProperty()
    transactionCount: number;

    @ApiProperty()
    pendingTransactions: number;

    @ApiProperty({ type: [TransactionResponseDto] })
    recentTransactions: TransactionResponseDto[];
}
