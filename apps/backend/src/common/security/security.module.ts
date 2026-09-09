import { Global, Module } from '@nestjs/common';
import { ConsentService } from './consent.service';
import { ChildAccessService } from './child-access.service';

@Global()
@Module({
  providers: [ConsentService, ChildAccessService],
  exports: [ConsentService, ChildAccessService],
})
export class SecurityModule {}
