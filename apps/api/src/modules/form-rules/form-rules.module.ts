import { Module } from '@nestjs/common';
import { FormRulesService } from './form-rules.service';

@Module({
  providers: [FormRulesService],
  exports: [FormRulesService],
})
export class FormRulesModule {}
