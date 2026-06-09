import { Injectable } from '@nestjs/common';
import { PrismaService, ResponseService } from '@libs/shared';

@Injectable()
export class LearnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly response: ResponseService
  ) { }
  //读取单词列表
  async getWordList(id: string, userId: string) {
    //1.如果他没有购买过课程进入这个页面 非法请求
    const courseRecord = await this.prisma.courseRecord.findFirst({
      where: {
        userId: userId,
        courseId: id,
        isPurchased: true
      },
      include: {
        course: true
      }
    })
    if (!courseRecord) {
      return this.response.error(null, '非法请求');
    }
    const courseType = courseRecord.course.value; //gk zk
    //A B
    //点击完保存之后A->wordBookRecord 说明A学习过了
    const words = await this.prisma.wordBook.findMany({
      where: {
        [courseType]: true, //gk:true
        //掌握的单词不能被查出来
        wordBookRecords: {
          none: {
            userId: userId
          }
        }
      },
      skip: 0, //跳过0条 从第一条开始
      take: 10, //取10条
      orderBy: {
        frq: 'desc' //排序频率越高越靠前
      },
    })
    return this.response.success(words);
  }

  //保存单词到wordBookRecord
  async saveWordMaster(wordIds: string[], userId: string) {
    //1.保存单词到wordBookRecord A->wordBookRecord
    const wordBookRecords = wordIds.map(wordId => ({
      wordId: wordId, //单词id
      userId: userId, //用户id
      isMaster: true //是否掌握
    }))
    await this.prisma.wordBookRecord.createMany({
      data: wordBookRecords
    })
    //2.更新用户学习单词的数量
    const user = await this.prisma.user.update({
      where:{
         id:userId
      },
      data:{
        wordNumber: {
          increment: wordIds.length //10
        }
      }
    })
    return this.response.success({
      wordNumber: user.wordNumber //学习完单词的数量
    });
  }
}
