import { Controller, Request, Post, UseGuards, Get } from '@nestjs/common';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

import { ETwitterStreamEvent, TwitterApi } from 'twitter-api-v2';

@Controller()
export class AppController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Get('search')
  async search(@Request() req) {
    const queryParams = req.query;
    console.log(queryParams, 'queryParams');
    // Instantiate with desired auth type (here's Bearer v2 auth)
    const twitterClient = new TwitterApi({
      appKey: 'appkey',
      appSecret: 'appsecret',
    });

    const client = await twitterClient.appLogin();

    // Tell typescript it's a readonly app
    const readOnlyClient = client.readOnly;
    console.log(readOnlyClient);
    const rules = await readOnlyClient.v2.streamRules();
    if (rules.data?.length) {
      await readOnlyClient.v2.updateStreamRules({
        delete: { ids: rules.data.map((rule) => rule.id) },
      });
    }

    // Add our rules
    await readOnlyClient.v2.updateStreamRules({
      add: [{ value: queryParams.query }],
    });

    const stream = await readOnlyClient.v2.searchStream({
      'tweet.fields': ['referenced_tweets', 'author_id'],
      expansions: ['referenced_tweets.id'],
    });
    // Enable auto reconnect
    stream.autoReconnect = true;

    stream.on(ETwitterStreamEvent.Data, async (tweet) => {
      // Reply to tweet
      console.log(tweet);
    });
  }
}
