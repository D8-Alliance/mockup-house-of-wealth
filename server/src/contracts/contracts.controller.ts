import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { CreateApprovalDto, CreateContractDto, CreatePartyDto, CreateVersionDto, DecideApprovalDto, TransitionContractDto } from './contracts.dto';
import { ContractsService } from './contracts.service';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Get() list(@CurrentUser() actor: AuthenticatedUser) { return this.contracts.list(actor); }
  @Get(':id') get(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) { return this.contracts.get(id, actor); }
  @Post() create(@Body() input: CreateContractDto, @CurrentUser() actor: AuthenticatedUser) { return this.contracts.create(input, actor); }
  @Post(':id/versions') addVersion(@Param('id') id: string, @Body() input: CreateVersionDto, @CurrentUser() actor: AuthenticatedUser) { return this.contracts.addVersion(id, input, actor); }
  @Post(':id/parties') addParty(@Param('id') id: string, @Body() input: CreatePartyDto, @CurrentUser() actor: AuthenticatedUser) { return this.contracts.addParty(id, input, actor); }
  @Post(':id/approvals/:approvalId') decideApproval(@Param('id') id: string, @Param('approvalId') approvalId: string, @Body() input: DecideApprovalDto, @CurrentUser() actor: AuthenticatedUser) { return this.contracts.decideApproval(id, approvalId, input, actor); }
  @Post(':id/approvals') createApproval(@Param('id') id: string, @Body() input: CreateApprovalDto, @CurrentUser() actor: AuthenticatedUser) { return this.contracts.createApproval(id, input, actor); }
  @Post(':id/transition') transition(@Param('id') id: string, @Body() input: TransitionContractDto, @CurrentUser() actor: AuthenticatedUser) { return this.contracts.transition(id, input, actor); }
}
