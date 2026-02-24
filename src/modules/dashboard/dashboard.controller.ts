import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getSummary(user.id);
  }

  @Get('timeline')
  getTimeline(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getTimeline(user.id);
  }
}
