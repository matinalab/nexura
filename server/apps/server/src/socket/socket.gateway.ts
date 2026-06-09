import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {origin: '*'},
})
export class SocketGateway {

  @WebSocketServer()
  server: Server;

  //连接成功之后会自动进入这个钩子会传入当前链接的clinet
  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId //读了一下userId 就是前端一会儿连接的时候会通过query去传入的
    if(userId){//加判断为什么 因为热更新的时候有时候没有id
      client.join(`user_${userId}`); //加入到这个房间
    }
  }

  //方法名字随便起 支付成功之后通过前端关闭那个弹框的
  emitPaymentSuccess(userId: string) {
    //这是通知房间内的用户触发这个事件
    this.server.to(`user_${userId}`).emit('paymentSuccess', userId);
  }

}
