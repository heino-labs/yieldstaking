import { Module } from "@nestjs/common";

import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { StakingModule } from "../staking/staking.module";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
    imports: [PrismaModule, StakingModule],
    controllers: [TransactionController],
    providers: [TransactionService],
    exports: [TransactionService],
})
export class TransactionModule {}
