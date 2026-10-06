import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { renderStatementCsv, renderStatementPdf } from './statement-render';
import { Statement, StatementsService } from './statements.service';

export class StatementQueryDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsIn(['json', 'csv', 'pdf']) format?: 'json' | 'csv' | 'pdf';
}

@Controller('statements')
export class StatementsController {
  constructor(private readonly statements: StatementsService) {}

  @Get('investor')
  async investor(@CurrentUser() actor: AuthenticatedUser, @Query() query: StatementQueryDto, @Res() response: Response) {
    return this.send(response, await this.statements.investorStatement(actor, query), query.format);
  }

  @Get('projects/:projectId')
  async project(@CurrentUser() actor: AuthenticatedUser, @Param('projectId') projectId: string, @Query() query: StatementQueryDto, @Res() response: Response) {
    return this.send(response, await this.statements.projectStatement(actor, projectId, query), query.format);
  }

  private async send(response: Response, statement: Statement, format: StatementQueryDto['format'] = 'json') {
    if (format === 'json') return response.json(statement);
    const fileName = `${statement.reference}.${format}`;
    response.set({ 'Content-Disposition': `attachment; filename="${fileName}"`, 'Cache-Control': 'no-store' });
    if (format === 'csv') return response.type('text/csv; charset=utf-8').send(renderStatementCsv(statement));
    return response.type('application/pdf').send(await renderStatementPdf(statement));
  }
}
