import { Injectable } from '@nestjs/common';
import { PrismaService, ResponseService } from '@libs/shared';
import type { UvDto, PerformanceDto, PvDto, EventDto, ErrorDto, UpdateUvDto } from '@nexura/common/tracker';
@Injectable()
export class TrackerService {
  constructor(private readonly prismaService: PrismaService, private readonly responseService: ResponseService) { }

  //上报独立访客
  //upsert 如果没有值就创建，如果有它就更新
  async uv(body: UvDto) {
    const visitor = await this.prismaService.visitor.upsert({
      where: { anonymousId: body.anonymousId },
      create: {
        anonymousId: body.anonymousId, //匿名ID
        userId: body.userId, //用户ID
        browser: body.browser, //浏览器
        os: body.os, //操作系统
        device: body.device //设备
      },
      update: {
        userId: body.userId, //用户ID
        browser: body.browser, //浏览器
        os: body.os, //操作系统
        device: body.device //设备
      },
      select: {
        id: true
      }
    })
    return this.responseService.success(visitor.id) //前端就会读到这个访客ID 并不是匿名ID
  }
  //更新独立访客
  async updateUv(body: UpdateUvDto) {
    await this.prismaService.visitor.update({
      where: { id: body.visitorId }, //通过访客ID更新Userid
      data: { userId: body.userId }
    })
    return this.responseService.success(true)
  }
  //上报性能指标
  async performance(body: PerformanceDto) {
    await this.prismaService.performanceEntry.create({
      data: {
        visitorId: body.visitorId, //访客ID
        fp: body.fp, //FP
        fcp: body.fcp, //FCP
        lcp: body.lcp, //LCP
        inp: body.inp, //INP
        cls: body.cls //CLS
      }
    })
    return this.responseService.success(true)
  }
  //上报页面访问
  async pv(body: PvDto) {
    await this.prismaService.pageView.create({
      data: {
        visitorId: body.visitorId,//访客ID
        url: body.url, //页面URL
        referrer: body.referrer, //来源URL
        path: body.path //页面路径
      }
    })
    return this.responseService.success(true)
  }
  //上报用户行为
  async event(body: EventDto) {
    await this.prismaService.trackEvent.create({
      data: {
        visitorId: body.visitorId,//访客ID
        event: body.event, //事件类型
        payload: body.payload, //事件数据
        url: body.url //页面URL
      }
    })
    return this.responseService.success(true)
  }
  //上报错误
  async error(body: ErrorDto) {
    await this.prismaService.errorEntry.create({
      data: {
        visitorId: body.visitorId, //访客ID
        error: body.error, //错误类型
        message: body.message, //错误信息
        stack: body.stack, //错误堆栈
        url: body.url //页面URL
      }
    })
    return this.responseService.success(true)
  }
}
